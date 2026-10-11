import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { CLASS_CAPACITY, reserveBooking } from './bookings.js';
import { pool } from './db.js';
import { sendBookingEmails } from './email.js';
import { getAvailableSlots, validBookingDate, validEmail, validSiteContent, validTime } from './validation.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const jwtSecret = process.env.JWT_SECRET;
const cookieName = 'aura_session';
const isProduction = process.env.NODE_ENV === 'production';
const staticPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters.');

app.disable('x-powered-by');
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api', (request, response, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next();
  const origin = request.get('origin');
  if (!origin) return next();

  try {
    if (new URL(origin).host !== request.get('host')) {
      return response.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    }
  } catch {
    return response.status(403).json({ error: 'A valid same-origin request is required.' });
  }
  return next();
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false });
const bookingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const availabilityLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
const cmsLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

function setSessionCookie(response, user) {
  const token = jwt.sign({ sub: String(user.id), role: user.role }, jwtSecret, { expiresIn: '7d' });
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

async function requireAuth(request, response, next) {
  const token = request.cookies[cookieName];
  if (!token) return response.status(401).json({ error: 'Please sign in to continue.' });

  let claims;
  try {
    claims = jwt.verify(token, jwtSecret);
  } catch {
    return response.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }

  try {
    const result = await pool.query('SELECT id, role FROM users WHERE id = $1', [claims.sub]);
    if (!result.rowCount) return response.status(401).json({ error: 'Your account no longer exists.' });
    request.auth = { sub: String(result.rows[0].id), role: result.rows[0].role };
    return next();
  } catch (error) {
    console.error('Authentication lookup failed:', error);
    return response.status(503).json({ error: 'Account verification is temporarily unavailable.' });
  }
}

function requireAdmin(request, response, next) {
  if (request.auth.role !== 'admin') return response.status(403).json({ error: 'Administrator access is required.' });
  return next();
}

function sendError(response, error) {
  if (error.code === '23505' && error.constraint === 'users_email_key') {
    return response.status(409).json({ error: 'An account already exists for this email address.' });
  }
  if (error.code === '23505' && error.constraint === 'active_member_booking_slot_unique') {
    return response.status(409).json({ error: 'You already have an active booking at this date and time.' });
  }
  console.error('API request failed:', error);
  return response.status(500).json({ error: 'The server could not complete the request.' });
}

async function getSiteContent() {
  const result = await pool.query("SELECT content FROM cms_content WHERE content_key = 'site'");
  if (!result.rowCount) throw new Error('Site content is missing. Run npm run db:init.');
  return result.rows[0].content;
}

app.get('/api/health', async (request, response) => {
  try {
    await pool.query('SELECT 1');
    return response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check database failure:', error);
    return response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.get('/api/content', async (request, response) => {
  try {
    response.set('Cache-Control', 'no-store');
    return response.json(await getSiteContent());
  } catch (error) {
    return sendError(response, error);
  }
});

app.get('/api/availability', availabilityLimiter, async (request, response) => {
  const { date, classType } = request.query;
  if (!validBookingDate(date)) return response.status(400).json({ error: 'Choose a date from today through the next 60 days.' });
  if (typeof classType !== 'string' || classType.length > 100) return response.status(400).json({ error: 'Choose a valid class.' });

  try {
    response.set('Cache-Control', 'no-store');
    const content = await getSiteContent();
    const scheduledSlots = getAvailableSlots(content, date, classType);
    if (!scheduledSlots.length) return response.json({ date, classType, slots: [] });

    const fullSlots = await pool.query(
      `SELECT to_char(booking_time, 'HH24:MI') AS time
       FROM bookings
       WHERE booking_date = $1 AND status <> 'cancelled'
       GROUP BY booking_time
       HAVING COUNT(*) >= $2`,
      [date, CLASS_CAPACITY]
    );
    const fullTimes = new Set(fullSlots.rows.map((row) => row.time));
    return response.json({ date, classType, slots: scheduledSlots.filter((time) => !fullTimes.has(time)) });
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/auth/register', authLimiter, async (request, response) => {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {};
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;
  if (fullName.length < 2 || fullName.length > 120 || !validEmail(email) || typeof password !== 'string' || password.length < 12 || password.length > 200) {
    return response.status(400).json({ error: 'Enter a name, valid email and password of at least 12 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, role',
      [fullName, email, passwordHash]
    );
    const user = result.rows[0];
    setSessionCookie(response, user);
    return response.status(201).json({ user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } });
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/auth/login', authLimiter, async (request, response) => {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;
  if (!validEmail(email) || typeof password !== 'string' || password.length > 200) {
    return response.status(400).json({ error: 'Enter a valid email and password.' });
  }

  try {
    const result = await pool.query('SELECT id, full_name, email, password_hash, role FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return response.status(401).json({ error: 'Email or password is incorrect.' });
    }
    setSessionCookie(response, user);
    return response.json({ user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } });
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/auth/logout', (request, response) => {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || isProduction,
    sameSite: 'lax',
    path: '/'
  });
  return response.status(204).end();
});

app.get('/api/auth/me', requireAuth, async (request, response) => {
  try {
    const result = await pool.query('SELECT id, full_name, email, role FROM users WHERE id = $1', [request.auth.sub]);
    if (!result.rowCount) return response.status(401).json({ error: 'Your account no longer exists.' });
    const user = result.rows[0];
    return response.json({ user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } });
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/trial-requests', bookingLimiter, async (request, response) => {
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return response.status(400).json({ error: 'Request body must be a JSON object.' });
  }
  const { fullName, email, classType, date, time, goal, message } = body;
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 120 ||
      !validEmail(email) || typeof classType !== 'string' || classType.length > 100 ||
      !validBookingDate(date) || !validTime(time) ||
      typeof goal !== 'string' || !goal.trim() || goal.length > 300 ||
      typeof message !== 'string' || message.length > 2000) {
    return response.status(400).json({ error: 'Complete the required details and choose a valid booking date and time.' });
  }
  try {
    const content = await getSiteContent();
    if (!getAvailableSlots(content, date, classType).includes(time)) {
      return response.status(400).json({ error: 'That class is not scheduled at the selected date and time.' });
    }
    const booking = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      classType,
      date,
      time,
      goal: goal.trim(),
      message: message.trim()
    };
    const result = await reserveBooking(pool, booking);
    if (result.full) return response.status(409).json({ error: `That class has reached its ${CLASS_CAPACITY}-person capacity. Please choose another time.` });
    const emailSent = await sendBookingEmails(booking);
    return response.status(201).json({ id: result.id, emailSent });
  } catch (error) {
    return sendError(response, error);
  }
});

app.get('/api/bookings', requireAuth, async (request, response) => {
  try {
    const query = request.auth.role === 'admin'
      ? `SELECT id, user_id AS "userId", full_name AS "fullName", email, class_type AS "classType",
                booking_date AS date, to_char(booking_time, 'HH24:MI') AS time, goal, message, status, created_at AS "createdAt"
         FROM bookings ORDER BY booking_date, booking_time LIMIT 500`
      : `SELECT id, full_name AS "fullName", email, class_type AS "classType",
                booking_date AS date, to_char(booking_time, 'HH24:MI') AS time, goal, message, status, created_at AS "createdAt"
         FROM bookings WHERE user_id = $1 ORDER BY booking_date, booking_time LIMIT 200`;
    const result = request.auth.role === 'admin'
      ? await pool.query(query)
      : await pool.query(query, [request.auth.sub]);
    return response.json({ bookings: result.rows });
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/bookings', requireAuth, async (request, response) => {
  if (request.auth.role !== 'member') return response.status(403).json({ error: 'Only member accounts can create class bookings.' });
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return response.status(400).json({ error: 'Request body must be a JSON object.' });
  }
  const { classType, date, time } = body;
  if (typeof classType !== 'string' || !validBookingDate(date) || !validTime(time)) {
    return response.status(400).json({ error: 'Choose a valid class, date and time.' });
  }

  try {
    const content = await getSiteContent();
    if (!getAvailableSlots(content, date, classType).includes(time)) {
      return response.status(400).json({ error: 'That class is not scheduled at the selected date and time.' });
    }
    const userResult = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [request.auth.sub]);
    const user = userResult.rows[0];
    const booking = { fullName: user.full_name, email: user.email, classType, date, time };
    const result = await reserveBooking(pool, booking, request.auth.sub);
    if (result.full) return response.status(409).json({ error: `That class has reached its ${CLASS_CAPACITY}-person capacity. Please choose another time.` });
    const emailSent = await sendBookingEmails({ fullName: user.full_name, email: user.email, classType, date, time, goal: '', message: '' });
    return response.status(201).json({ id: result.id, emailSent });
  } catch (error) {
    return sendError(response, error);
  }
});

app.patch('/api/bookings/:id', requireAuth, async (request, response) => {
  const id = Number(request.params.id);
  const status = request.body?.status;
  if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Invalid booking id.' });
  if (!['confirmed', 'cancelled'].includes(status)) return response.status(400).json({ error: 'Choose a valid booking status.' });

  try {
    const result = request.auth.role === 'admin'
      ? status === 'confirmed'
        ? await pool.query(
          `UPDATE bookings SET status = 'confirmed'
           WHERE id = $1 AND status = 'pending' RETURNING id`,
          [id]
        )
        : await pool.query(
          `UPDATE bookings SET status = 'cancelled'
           WHERE id = $1 AND status IN ('pending', 'confirmed') RETURNING id`,
          [id]
        )
      : status === 'cancelled'
        ? await pool.query(
          `UPDATE bookings SET status = 'cancelled'
           WHERE id = $1 AND user_id = $2 AND status = 'pending'
             AND (booking_date + booking_time) AT TIME ZONE 'Africa/Johannesburg' > NOW()
           RETURNING id`,
          [id, request.auth.sub]
        )
        : { rowCount: 0 };
    if (!result.rowCount) return response.status(404).json({ error: 'Booking was not found or cannot be changed.' });
    return response.json({ id, status });
  } catch (error) {
    return sendError(response, error);
  }
});

app.put('/api/admin/content', cmsLimiter, requireAuth, requireAdmin, async (request, response) => {
  if (!validSiteContent(request.body)) return response.status(400).json({ error: 'Content does not match the expected site content format.' });
  try {
    await pool.query(
      `INSERT INTO cms_content (content_key, content, updated_at)
       VALUES ('site', $1::jsonb, NOW())
       ON CONFLICT (content_key) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
      [JSON.stringify(request.body)]
    );
    return response.json({ content: request.body });
  } catch (error) {
    return sendError(response, error);
  }
});

app.use('/api', (request, response) => response.status(404).json({ error: 'API endpoint not found.' }));

if (isProduction) {
  app.use(express.static(staticPath));
  app.get('*', (request, response) => response.sendFile(path.join(staticPath, 'index.html')));
}

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && 'body' in error) return response.status(400).json({ error: 'Request body must contain valid JSON.' });
  console.error('Unhandled API error:', error);
  return response.status(500).json({ error: 'The server could not complete the request.' });
});

app.listen(port, () => {
  console.log(`Aura Fitness API listening on port ${port}.`);
});

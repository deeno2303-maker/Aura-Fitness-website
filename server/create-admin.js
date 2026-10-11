import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

try {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set a valid ADMIN_EMAIL in the environment.');
  }
  if (!password || password.length < 12) {
    throw new Error('Set ADMIN_PASSWORD to a password of at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('Aura Fitness Admin', $1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [email, passwordHash]
  );
  console.log(`Administrator account is ready for ${email}.`);
} catch (error) {
  console.error('Administrator setup failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}

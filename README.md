# Aura Fitness

Aura Fitness is a React/Vite website backed by an Express API and PostgreSQL. Public trial bookings are stored in PostgreSQL and emailed to the studio and the visitor using SMTP. Members can create accounts, request class bookings, and cancel pending bookings. Admins can manage bookings and publish schedule, trainer, discipline, and membership content in the CMS.

Each scheduled time slot has a fixed capacity of 50. Availability checks hide full slots, and the API serializes reservations for a slot in PostgreSQL so simultaneous requests cannot exceed capacity. Cancelled bookings release their place. The CMS enforces one schedule row per time so each slot has a single unambiguous class.

## Requirements

- Node.js 20.19 or newer
- PostgreSQL 14 or newer
- An SMTP account for booking notifications

## Local setup

1. Install dependencies: `npm install`
2. Create a PostgreSQL database and user, then copy `.env.example` to `.env`.
3. Set `DATABASE_URL`, a random `JWT_SECRET` of at least 32 characters, and SMTP settings in `.env`.
4. Initialize tables and default CMS content: `npm run db:init`
5. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` in `.env`, then run `npm run admin:create`.
6. Start the API with `npm run api`.
7. In a second terminal, start Vite with `npm run dev`, then open the local Vite URL.

The Vite development server proxies `/api` requests to `http://localhost:3001`. Run both `npm run api` and `npm run dev` while developing. To build the production assets, run `npm run build`. Set `NODE_ENV=production` and start with `npm start` to have Express serve the built site and API from the same origin. Set `COOKIE_SECURE=true` in production when served over HTTPS.

## CMS and dashboard

Open `/dashboard` to sign in or create a member account. The admin account is created separately with `npm run admin:create`; public signup always creates a member role. Admins can confirm/cancel requests and edit the CMS JSON. Content is validated by the API before publishing.

## Email delivery

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and `BOOKING_NOTIFICATION_EMAIL`. A request is saved before the API attempts email delivery. If SMTP is unavailable, the caller receives a clear response that the booking is saved but email delivery failed; the API logs the delivery error.

## API endpoints

- `GET /api/health`, `GET /api/content`, `GET /api/availability?date=YYYY-MM-DD&classType=Strength`
- `POST /api/trial-requests`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Authenticated: `GET /api/bookings`, `POST /api/bookings`, `PATCH /api/bookings/:id`
- Admin only: `PUT /api/admin/content`

Authentication uses an HTTP-only, SameSite=Lax session cookie. Passwords are bcrypt-hashed; do not store `.env` in source control.

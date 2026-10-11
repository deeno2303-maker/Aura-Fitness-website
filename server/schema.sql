CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  class_type TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  goal TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS member_unique_booking;
CREATE UNIQUE INDEX IF NOT EXISTS active_member_booking_slot_unique
  ON bookings (user_id, booking_date, booking_time)
  WHERE user_id IS NOT NULL AND status <> 'cancelled';

CREATE INDEX IF NOT EXISTS bookings_date_time_idx ON bookings (booking_date, booking_time);
CREATE INDEX IF NOT EXISTS bookings_email_idx ON bookings (LOWER(email));

CREATE TABLE IF NOT EXISTS cms_content (
  content_key TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

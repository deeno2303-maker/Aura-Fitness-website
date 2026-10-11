import 'dotenv/config';
import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000
    });
  }
  return transporter;
}

export async function sendBookingEmails(booking) {
  const mailer = getTransporter();
  const notificationEmail = process.env.BOOKING_NOTIFICATION_EMAIL;
  const from = process.env.SMTP_FROM;
  if (!mailer || !notificationEmail || !from) {
    console.error('Booking email not sent: SMTP_HOST/PORT/USER/PASSWORD, SMTP_FROM and BOOKING_NOTIFICATION_EMAIL are required.');
    return false;
  }

  const date = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'full', timeZone: 'Africa/Johannesburg' })
    .format(new Date(`${booking.date}T12:00:00Z`));
  const details = [
    `Name: ${booking.fullName}`,
    `Email: ${booking.email}`,
    `Class: ${booking.classType}`,
    `Date: ${date}`,
    `Time: ${booking.time}`,
    `Goal: ${booking.goal || 'Not specified'}`,
    `Message: ${booking.message || 'None'}`
  ].join('\n');

  try {
    await Promise.all([
      mailer.sendMail({
        from,
        to: notificationEmail,
        replyTo: booking.email,
        subject: `New Aura Fitness booking: ${booking.classType}`,
        text: details
      }),
      mailer.sendMail({
        from,
        to: booking.email,
        subject: 'Aura Fitness booking request received',
        text: `Hi ${booking.fullName},\n\nWe received your ${booking.classType} booking request for ${date} at ${booking.time}. The studio will confirm your spot shortly.\n\n${details}`
      })
    ]);
    return true;
  } catch (error) {
    console.error('Booking was saved, but email delivery failed:', error);
    return false;
  }
}

import { dayOrder } from '../src/data/siteData.js';

export function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validLabel(value, maxLength) {
  return typeof value === 'string' &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function studioDateTime(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`
  };
}

export function validBookingDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const today = studioDateTime(new Date()).date;
  const limitDate = new Date(`${today}T00:00:00Z`);
  limitDate.setUTCDate(limitDate.getUTCDate() + 60);
  const limit = limitDate.toISOString().slice(0, 10);
  return value >= today && value <= limit;
}

export function getAvailableSlots(content, date, classType, now = new Date()) {
  const dayIndex = new Date(`${date}T12:00:00Z`).getUTCDay();
  const day = dayIndex === 0 ? null : dayOrder[dayIndex - 1];
  if (!day) return [];

  const current = studioDateTime(now);
  return content.scheduleRows
    .filter((row) => row[day] === classType)
    .map((row) => row.time)
    .filter((time) => date !== current.date || time > current.time);
}

export function validSiteContent(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return false;
  if (!Array.isArray(content.disciplines) || !Array.isArray(content.scheduleRows)) return false;
  if (!Array.isArray(content.trainerProfiles) || !Array.isArray(content.membershipPlans)) return false;
  if (content.disciplines.length > 20 || content.scheduleRows.length > 30) return false;
  if (content.trainerProfiles.length > 50 || content.membershipPlans.length > 20) return false;
  if (new Set(content.scheduleRows.map((row) => row?.time)).size !== content.scheduleRows.length) return false;

  const rowsValid = content.scheduleRows.every((row) => row &&
    validTime(row.time) &&
    dayOrder.every((day) => validLabel(row[day], 100)));
  const trainersValid = content.trainerProfiles.every((trainer) => trainer &&
    ['initials', 'name', 'role', 'bio', 'variant'].every((key) => typeof trainer[key] === 'string' && trainer[key].length <= 1000));
  const plansValid = content.membershipPlans.every((plan) => plan &&
    validLabel(plan.title, 100) &&
    validLabel(plan.price, 100) &&
    typeof plan.featured === 'boolean' &&
    ['filled', 'outlined'].includes(plan.buttonVariant) &&
    validLabel(plan.buttonText, 100) &&
    (plan.badge === undefined || validLabel(plan.badge, 100)) &&
    Array.isArray(plan.features) &&
    plan.features.length <= 30 &&
    plan.features.every((feature) => typeof feature === 'string' && feature.length <= 300));
  const disciplinesValid = content.disciplines.every((item) => item &&
    ['number', 'label', 'icon', 'variant'].every((key) => typeof item[key] === 'string' && item[key].length <= 100));

  return rowsValid && trainersValid && plansValid && disciplinesValid;
}

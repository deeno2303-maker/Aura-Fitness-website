import { dayOrder } from '../data/siteData.js';

export function studioDateTime(now = new Date()) {
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

export function getScheduledSlots(scheduleRows, date, classType, now = new Date()) {
  const dayIndex = new Date(`${date}T12:00:00Z`).getUTCDay();
  const day = dayIndex === 0 ? null : dayOrder[dayIndex - 1];
  if (!day) return [];

  const current = studioDateTime(now);
  return scheduleRows
    .filter((row) => row[day] === classType)
    .map((row) => row.time)
    .filter((time) => date !== current.date || time > current.time);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSiteContent } from '../src/data/siteData.js';
import { getAvailableSlots, validBookingDate, validEmail, validSiteContent, validTime } from './validation.js';

test('validates email input and rejects malformed or oversized addresses', () => {
  assert.equal(validEmail('member@example.com'), true);
  assert.equal(validEmail('not-an-email'), false);
  assert.equal(validEmail(`${'a'.repeat(250)}@example.com`), false);
});

test('accepts only real dates within the booking window', () => {
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(validBookingDate(today), true);
  assert.equal(validBookingDate('2026-02-30'), false);
  assert.equal(validBookingDate('not-a-date'), false);
  assert.equal(validBookingDate('2000-01-01'), false);
});

test('validates a real 24-hour clock time', () => {
  assert.equal(validTime('06:00'), true);
  assert.equal(validTime('23:59'), true);
  assert.equal(validTime('24:00'), false);
  assert.equal(validTime('12:75'), false);
});

test('returns available classes for the selected weekday and class type', () => {
  const monday = new Date();
  monday.setUTCDate(monday.getUTCDate() + ((1 - monday.getUTCDay() + 7) % 7));
  const mondayDate = monday.toISOString().slice(0, 10);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() - 1);

  assert.deepEqual(getAvailableSlots(defaultSiteContent, mondayDate, 'Strength'), ['06:00', '17:30']);
  assert.deepEqual(getAvailableSlots(defaultSiteContent, sunday.toISOString().slice(0, 10), 'Strength'), []);
  assert.deepEqual(getAvailableSlots(defaultSiteContent, mondayDate, 'Unknown class'), []);
});

test('does not offer class times that have already passed in the studio timezone', () => {
  const content = {
    scheduleRows: [
      { time: '06:00', Mon: 'Strength' },
      { time: '17:30', Mon: 'Strength' }
    ]
  };
  assert.deepEqual(
    getAvailableSlots(content, '2026-10-12', 'Strength', new Date('2026-10-12T10:30:00Z')),
    ['17:30']
  );
});

test('accepts the default CMS content and rejects malformed editor payloads', () => {
  assert.equal(validSiteContent(defaultSiteContent), true);
  assert.equal(validSiteContent({ ...defaultSiteContent, scheduleRows: 'not rows' }), false);
  assert.equal(
    validSiteContent({ ...defaultSiteContent, scheduleRows: [{ ...defaultSiteContent.scheduleRows[0], time: '99:99' }] }),
    false
  );
  assert.equal(
    validSiteContent({
      ...defaultSiteContent,
      scheduleRows: [...defaultSiteContent.scheduleRows, { ...defaultSiteContent.scheduleRows[0] }]
    }),
    false
  );
  assert.equal(
    validSiteContent({
      ...defaultSiteContent,
      membershipPlans: [{ ...defaultSiteContent.membershipPlans[0], buttonVariant: 'unexpected' }]
    }),
    false
  );
  assert.equal(
    validSiteContent({
      ...defaultSiteContent,
      scheduleRows: [{ ...defaultSiteContent.scheduleRows[0], Mon: 'Strength\r\nBcc: attacker@example.com' }]
    }),
    false
  );
  assert.equal(validSiteContent(null), false);
});

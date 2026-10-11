import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_CAPACITY, reserveBooking } from './bookings.js';

function makePool({ existingCount = 0, duplicate = false } = {}) {
  const calls = [];
  let released = false;
  let committed = false;
  let rolledBack = false;
  const client = {
    async query(sql, parameters = []) {
      calls.push({ sql, parameters });
      if (sql.startsWith('SELECT COUNT')) return { rows: [{ count: existingCount }] };
      if (sql.startsWith('INSERT')) {
        if (duplicate) {
          const error = new Error('Unique violation');
          error.code = '23505';
          throw error;
        }
        return { rows: [{ id: '73' }] };
      }
      if (sql === 'COMMIT') committed = true;
      if (sql === 'ROLLBACK') rolledBack = true;
      return { rows: [] };
    },
    release() { released = true; }
  };

  return {
    pool: { async connect() { return client; } },
    calls,
    state: () => ({ released, committed, rolledBack })
  };
}

const booking = {
  fullName: 'Alex Member',
  email: 'alex@example.com',
  classType: 'Strength',
  date: '2026-10-12',
  time: '06:00'
};

test('booking reservation commits under the class capacity', async () => {
  assert.equal(CLASS_CAPACITY, 50);
  const fixture = makePool({ existingCount: CLASS_CAPACITY - 1 });
  const result = await reserveBooking(fixture.pool, booking);

  assert.deepEqual(result, { full: false, id: '73' });
  assert.equal(fixture.state().committed, true);
  assert.equal(fixture.state().released, true);
  assert.equal(fixture.calls.some((call) => call.sql === 'BEGIN'), true);
});

test('booking reservation rolls back when a class is already full', async () => {
  const fixture = makePool({ existingCount: CLASS_CAPACITY });
  const result = await reserveBooking(fixture.pool, booking);

  assert.deepEqual(result, { full: true });
  assert.equal(fixture.state().rolledBack, true);
  assert.equal(fixture.state().committed, false);
  assert.equal(fixture.calls.some((call) => call.sql.startsWith('INSERT')), false);
  assert.equal(fixture.state().released, true);
});

test('booking reservation rolls back and releases the client after insert errors', async () => {
  const fixture = makePool({ duplicate: true });

  await assert.rejects(reserveBooking(fixture.pool, booking), { code: '23505' });
  assert.equal(fixture.state().rolledBack, true);
  assert.equal(fixture.state().released, true);
});

export const CLASS_CAPACITY = 50;

export async function reserveBooking(pool, booking, userId = null) {
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`${booking.date}|${booking.time}`]
    );

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM bookings
       WHERE booking_date = $1
         AND booking_time = $2
         AND status <> 'cancelled'`,
      [booking.date, booking.time]
    );
    if (countResult.rows[0].count >= CLASS_CAPACITY) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      return { full: true };
    }

    const insertResult = await client.query(
      `INSERT INTO bookings (user_id, full_name, email, class_type, booking_date, booking_time, goal, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [userId, booking.fullName, booking.email, booking.classType, booking.date, booking.time, booking.goal || '', booking.message || '']
    );
    await client.query('COMMIT');
    transactionOpen = false;
    return { full: false, id: insertResult.rows[0].id };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back a booking transaction:', rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

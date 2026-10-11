import { useEffect, useMemo, useState } from 'react';
import { defaultSiteContent } from '../data/siteData';
import { apiRequest, readApiResponse } from '../lib/api';

function localDateValue(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '' });
  const [bookings, setBookings] = useState([]);
  const [content, setContent] = useState(defaultSiteContent);
  const [contentText, setContentText] = useState(JSON.stringify(defaultSiteContent, null, 2));
  const [bookingForm, setBookingForm] = useState({ classType: '', date: '', time: '' });
  const [slots, setSlots] = useState([]);
  const [availabilityStatus, setAvailabilityStatus] = useState('idle');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const classOptions = useMemo(
    () => [...new Set(content.scheduleRows.flatMap((row) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => row[day]))
      .filter((name) => name && name !== '—' && name !== 'Open gym'))],
    [content]
  );

  const loadBookings = async () => {
    const payload = await apiRequest('/api/bookings');
    setBookings(payload.bookings);
  };

  useEffect(() => {
    apiRequest('/api/auth/me')
      .then((payload) => setUser(payload.user))
      .catch((error) => {
        if (!error.message.includes('Please sign in') && !error.message.includes('session has expired')) {
          setMessage({ type: 'error', text: error.message });
        }
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadBookings().catch((error) => setMessage({ type: 'error', text: error.message }));
    if (user.role === 'admin') {
      apiRequest('/api/content')
        .then((payload) => {
          setContent(payload);
          setContentText(JSON.stringify(payload, null, 2));
        })
        .catch((error) => setMessage({ type: 'error', text: error.message }));
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'member' || !bookingForm.date || !bookingForm.classType) {
      setSlots([]);
      setAvailabilityStatus('idle');
      return;
    }

    const controller = new AbortController();
    setSlots([]);
    setAvailabilityStatus('loading');
    fetch(`/api/availability?date=${encodeURIComponent(bookingForm.date)}&classType=${encodeURIComponent(bookingForm.classType)}`, {
      signal: controller.signal
    })
      .then(readApiResponse)
      .then((payload) => {
        setSlots(payload.slots);
        setAvailabilityStatus('loaded');
        setBookingForm((current) => ({ ...current, time: payload.slots.includes(current.time) ? current.time : '' }));
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setAvailabilityStatus('error');
          setMessage({ type: 'error', text: error.message });
        }
      });

    return () => controller.abort();
  }, [user, bookingForm.date, bookingForm.classType]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = await apiRequest(`/api/auth/${authMode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });
      setUser(payload.user);
      setAuthForm({ fullName: '', email: '', password: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setBookings([]);
      setMessage({ type: 'success', text: 'You are signed out.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleBooking = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await apiRequest('/api/bookings', { method: 'POST', body: JSON.stringify(bookingForm) });
      await loadBookings();
      setBookingForm((current) => ({ ...current, date: '', time: '' }));
      setMessage({
        type: 'success',
        text: result.emailSent ? 'Your booking request is saved and confirmation email was sent.' : 'Your booking is saved, but email delivery is unavailable.'
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const changeBookingStatus = async (id, status) => {
    try {
      await apiRequest(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadBookings();
      setMessage({ type: 'success', text: `Booking ${status}.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const saveContent = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage({ type: '', text: '' });
    try {
      const parsedContent = JSON.parse(contentText);
      const payload = await apiRequest('/api/admin/content', { method: 'PUT', body: JSON.stringify(parsedContent) });
      setContent(payload.content);
      setContentText(JSON.stringify(payload.content, null, 2));
      setMessage({ type: 'success', text: 'Published site content is updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof SyntaxError ? 'The CMS content must be valid JSON.' : error.message });
    } finally {
      setBusy(false);
    }
  };

  const today = localDateValue(new Date());
  const maxDate = localDateValue(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));

  if (!authChecked) {
    return <main className="dashboard-page"><p className="dashboard-loading">Checking your account…</p></main>;
  }

  if (!user) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-shell auth-card">
          <a className="footer-brand" href="/">AURA FITNESS</a>
          <h1>{authMode === 'login' ? 'Sign in' : 'Create a member account'}</h1>
          <p className="section-sub">
            {authMode === 'login' ? 'Member and administrator access.' : 'Create an account to book and manage classes.'}
          </p>
          <form className="dashboard-form" onSubmit={handleAuth}>
            {authMode === 'register' ? (
              <label>
                Full name
                <input autoComplete="name" maxLength="120" onChange={(event) => setAuthForm({ ...authForm, fullName: event.target.value })} required value={authForm.fullName} />
              </label>
            ) : null}
            <label>
              Email
              <input autoComplete="email" maxLength="254" onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required type="email" value={authForm.email} />
            </label>
            <label>
              Password
              <input autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} minLength="12" onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} required type="password" value={authForm.password} />
              {authMode === 'register' ? <small>Use at least 12 characters.</small> : null}
            </label>
            <button className="form-submit-button" disabled={busy} type="submit">
              {busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button className="text-action" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setMessage({ type: '', text: '' }); }} type="button">
            {authMode === 'login' ? 'New member? Create an account' : 'Already have an account? Sign in'}
          </button>
          {message.text ? <p className={`form-message ${message.type}`} role="status">{message.text}</p> : null}
          <a className="back-link" href="/">← Return to Aura Fitness</a>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <a className="footer-brand" href="/">AURA FITNESS</a>
            <h1>{user.role === 'admin' ? 'Studio dashboard' : 'Member dashboard'}</h1>
            <p className="section-sub">Signed in as {user.fullName} · {user.email}</p>
          </div>
          <button className="secondary-action" onClick={handleLogout} type="button">Sign out</button>
        </header>

        {message.text ? <p className={`form-message ${message.type}`} role="status">{message.text}</p> : null}

        {user.role === 'member' ? (
          <>
            <section className="dashboard-panel">
              <h2>Book a class</h2>
              <form className="dashboard-form booking-form" onSubmit={handleBooking}>
                <label>
                  Class
                  <select onChange={(event) => setBookingForm((current) => ({ ...current, classType: event.target.value, time: '' }))} required value={bookingForm.classType}>
                    <option value="">Choose a class</option>
                    {classOptions.map((classType) => <option key={classType} value={classType}>{classType}</option>)}
                  </select>
                </label>
                <label>
                  Date
                  <input max={maxDate} min={today} onChange={(event) => setBookingForm((current) => ({ ...current, date: event.target.value, time: '' }))} required type="date" value={bookingForm.date} />
                </label>
                <label>
                  Available time
                  <select disabled={availabilityStatus !== 'loaded' || !slots.length} onChange={(event) => setBookingForm((current) => ({ ...current, time: event.target.value }))} required value={bookingForm.time}>
                    <option value="">{availabilityStatus === 'loading'
                      ? 'Loading available times…'
                      : availabilityStatus === 'error'
                        ? 'Booking times unavailable'
                        : slots.length
                          ? 'Select a time'
                          : bookingForm.date && bookingForm.classType
                            ? 'No spaces available for this date'
                            : 'Choose class and date'}</option>
                    {slots.map((time) => <option key={time} value={time}>{time}</option>)}
                  </select>
                </label>
                {availabilityStatus === 'error' ? (
                  <p className="form-message error" role="alert">
                    Class times couldn’t be loaded. Check that the booking API and database are available.
                  </p>
                ) : null}
                <button className="form-submit-button" disabled={busy} type="submit">Request booking</button>
              </form>
            </section>

            <section className="dashboard-panel">
              <h2>Your bookings</h2>
              <BookingList bookings={bookings} onStatusChange={changeBookingStatus} role={user.role} />
            </section>
          </>
        ) : (
          <>
            <section className="dashboard-panel">
              <h2>Booking requests</h2>
              <BookingList bookings={bookings} onStatusChange={changeBookingStatus} role={user.role} />
            </section>
            <section className="dashboard-panel">
              <h2>Website content</h2>
              <p className="section-sub">Edit schedule, trainers, disciplines and membership plans. Changes publish immediately.</p>
              <form className="dashboard-form cms-form" onSubmit={saveContent}>
                <label>
                  Site content (JSON)
                  <textarea onChange={(event) => setContentText(event.target.value)} spellCheck="false" value={contentText} />
                </label>
                <button className="form-submit-button" disabled={busy} type="submit">Publish content</button>
              </form>
            </section>
          </>
        )}
        <a className="back-link" href="/">← Return to Aura Fitness</a>
      </div>
    </main>
  );
}

function BookingList({ bookings, onStatusChange, role }) {
  if (!bookings.length) return <p className="section-sub">No bookings yet.</p>;

  return (
    <div className="booking-list">
      {bookings.map((booking) => (
        <article className="booking-item" key={booking.id}>
          <div>
            <h3>{booking.classType} · {booking.date} at {booking.time}</h3>
            <p>{booking.fullName} · {booking.email}</p>
            {booking.goal ? <p>Goal: {booking.goal}</p> : null}
            {booking.message ? <p>{booking.message}</p> : null}
          </div>
          <div className="booking-actions">
            <span className={`booking-status status-${booking.status}`}>{booking.status}</span>
            {role === 'admin' && booking.status === 'pending' ? (
              <button className="secondary-action" onClick={() => onStatusChange(booking.id, 'confirmed')} type="button">Confirm</button>
            ) : null}
            {booking.status === 'pending' ? (
              <button className="text-action" onClick={() => onStatusChange(booking.id, 'cancelled')} type="button">
                {role === 'admin' ? 'Cancel' : 'Cancel request'}
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { apiRequest, readApiResponse } from '../lib/api';
import { getScheduledSlots } from '../lib/availability';

function localDateValue(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export default function ContactForm({ scheduleRows, isStaticSite = false }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    classType: 'Strength',
    date: '',
    time: '',
    goal: '',
    message: ''
  });
  const [slots, setSlots] = useState([]);
  const [availabilityStatus, setAvailabilityStatus] = useState('idle');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const classOptions = useMemo(
    () => [...new Set(scheduleRows.flatMap((row) => [row.Mon, row.Tue, row.Wed, row.Thu, row.Fri, row.Sat])
      .filter((name) => name && name !== '—' && name !== 'Open gym'))],
    [scheduleRows]
  );

  useEffect(() => {
    if (!formData.date) {
      setSlots([]);
      setAvailabilityStatus('idle');
      return;
    }

    const controller = new AbortController();
    setSlots([]);
    if (isStaticSite) {
      const scheduledSlots = getScheduledSlots(scheduleRows, formData.date, formData.classType);
      setSlots(scheduledSlots);
      setAvailabilityStatus('loaded');
      setFormData((current) => ({ ...current, time: scheduledSlots.includes(current.time) ? current.time : '' }));
      return undefined;
    }

    setAvailabilityStatus('loading');
    fetch(`/api/availability?date=${encodeURIComponent(formData.date)}&classType=${encodeURIComponent(formData.classType)}`, {
      signal: controller.signal
    })
      .then(readApiResponse)
      .then((payload) => {
        setSlots(payload.slots);
        setAvailabilityStatus('loaded');
        setFormData((current) => ({ ...current, time: payload.slots.includes(current.time) ? current.time : '' }));
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setSlots([]);
          setAvailabilityStatus('error');
        }
      });

    return () => controller.abort();
  }, [formData.date, formData.classType, isStaticSite, scheduleRows]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value, ...(name === 'date' || name === 'classType' ? { time: '' } : {}) }));
    setStatus({ type: '', message: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      if (isStaticSite) {
        const subject = `Aura Fitness trial request: ${formData.classType}`;
        const body = [
          `Name: ${formData.fullName}`,
          `Email: ${formData.email}`,
          `Class: ${formData.classType}`,
          `Preferred date: ${formData.date}`,
          `Preferred time: ${formData.time}`,
          `Goal: ${formData.goal}`,
          `Message: ${formData.message || 'None'}`,
          '',
          'This is a request only; my place is not reserved until Aura Fitness confirms it.'
        ].join('\n');
        window.location.href = `mailto:info.aurafitness23@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setStatus({
          type: 'success',
          message: 'Your email app should open with the request. The class is not booked until the studio confirms your place.'
        });
        return;
      }

      const payload = await apiRequest('/api/trial-requests', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setStatus({
        type: 'success',
        message: payload.emailSent
          ? 'Your trial request is booked. We have emailed you a confirmation.'
          : 'Your trial request is saved. Email delivery is temporarily unavailable; the studio will follow up.'
      });
      setFormData((current) => ({ ...current, fullName: '', email: '', goal: '', message: '', time: '' }));
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const today = localDateValue(new Date());
  const maxDate = localDateValue(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));

  return (
    <section aria-labelledby="contact-heading" className="section contact-section" id="contact">
      <div className="container contact-inner">
        <div aria-hidden="true" className="contact-icon">
          <md-icon aria-hidden="true">fitness_center</md-icon>
        </div>

        <h2 id="contact-heading">Come try a class</h2>
        <p>First week is free.</p>

        <div className="contact-layout">
          <div className="contact-copy">
            <p>
              Located:
              <a href="https://maps.google.com/?q=34+Essex+Terrace,+Westville,+Durban" rel="noopener noreferrer" target="_blank">
                34 Essex Terrace, Westville, Durban
              </a>
            </p>
            <p className="contact-email">Email us: info.aurafitness23@gmail.com</p>
            {isStaticSite ? null : (
              <p>
                Already a member? <a href="/dashboard">Sign in to book classes</a>
              </p>
            )}
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Full name
                <input autoComplete="name" maxLength="120" name="fullName" onChange={handleChange} placeholder="Your name" required type="text" value={formData.fullName} />
              </label>

              <label>
                Email
                <input autoComplete="email" maxLength="254" name="email" onChange={handleChange} placeholder="you@example.com" required type="email" value={formData.email} />
              </label>

              <label>
                Preferred class
                <select name="classType" onChange={handleChange} required value={formData.classType}>
                  {classOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input max={maxDate} min={today} name="date" onChange={handleChange} required type="date" value={formData.date} />
              </label>

              <label>
                Available time
                <select disabled={availabilityStatus !== 'loaded' || !slots.length} name="time" onChange={handleChange} required value={formData.time}>
                  <option value="">{availabilityStatus === 'loading'
                    ? 'Loading available times…'
                    : availabilityStatus === 'error'
                      ? 'Booking times unavailable'
                      : !formData.date
                        ? 'Choose a date first'
                        : slots.length
                          ? 'Select a time'
                          : 'No classes available for this date'}</option>
                  {slots.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
              {availabilityStatus === 'error' ? (
                <p className="form-message error" role="alert">
                  We couldn’t load class times. The booking API or database may be unavailable; please try again later.
                </p>
              ) : null}

              <label>
                Main goal
                <input maxLength="300" name="goal" onChange={handleChange} placeholder="Build strength, improve conditioning..." required type="text" value={formData.goal} />
              </label>
            </div>

            <label>
              Message (optional)
              <textarea
                maxLength="2000"
                name="message"
                onChange={handleChange}
                placeholder="Tell us about your training goals or how we can help."
                rows="4"
                value={formData.message}
              />
            </label>

            <button className="form-submit-button" disabled={submitting} type="submit">
            {submitting ? 'Preparing request…' : isStaticSite ? 'Request a trial by email' : 'Book your free week'}
            </button>

            {status.message ? (
              <p className={`form-message ${status.type === 'success' ? 'success' : 'error'}`} role="status">
                {status.message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}

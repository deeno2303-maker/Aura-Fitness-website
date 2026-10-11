import { dayOrder } from '../data/siteData';

function classNameFromValue(value) {
  if (!value || value === '—') return 'cls cls-empty';

  const normalized = value.toLowerCase();

  if (normalized.includes('open gym') || normalized.includes('strength')) return 'cls cls-strength';
  if (normalized.includes('conditioning') || normalized.includes('hiit')) return 'cls cls-conditioning';
  if (normalized.includes('mobility')) return 'cls cls-mobility';
  if (normalized.includes('gym')) return 'cls cls-strength';

  return 'cls cls-strength';
}

export default function Schedule({ content }) {
  const scheduleRows = content.scheduleRows;
  return (
    <section aria-labelledby="schedule-heading" className="section schedule-section" id="schedule">
      <div className="container">
        <div className="section-heading">
          <p className="section-kicker">01 / This week</p>
          <h2 id="schedule-heading">Class schedule</h2>
          <p className="section-sub">All classes are 60 minutes. Classes hold up to 50 people; trial requests need studio confirmation.</p>
        </div>

        <div aria-label="Weekly class schedule" className="schedule-grid" role="table">
          <div className="schedule-head" role="row">
            <span role="columnheader">Time</span>
            {dayOrder.map((day) => (
              <span key={day} role="columnheader">
                {day}
              </span>
            ))}
          </div>

          {scheduleRows.map((row) => (
            <div className="schedule-row" key={row.time} role="row">
              <span className="time" role="rowheader">
                {row.time}
              </span>

              {dayOrder.map((day) => {
                const value = row[day];
                return (
                  <span className={classNameFromValue(value)} data-day={day} key={`${row.time}-${day}`} role="cell">
                    {value || '—'}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

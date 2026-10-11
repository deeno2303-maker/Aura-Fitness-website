export default function Disciplines({ disciplines }) {
  return (
    <section aria-label="Training disciplines" className="disciplines">
      <div className="container discipline-grid">
        {disciplines.map((discipline) => (
          <a className={`discipline ${discipline.variant}`} href="#schedule" key={discipline.label}>
            <md-icon aria-hidden="true">{discipline.icon}</md-icon>
            <span>
              <small>
                {discipline.number} / Training
              </small>
              <strong>{discipline.label}</strong>
            </span>
            <md-icon aria-hidden="true" className="discipline-arrow">
              arrow_outward
            </md-icon>
            <md-ripple aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

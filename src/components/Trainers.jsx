export default function Trainers({ trainers }) {
  return (
    <section aria-labelledby="trainers-heading" className="section section-alt" id="trainers">
      <div className="container">
        <div className="section-heading">
          <p className="section-kicker">02 / Technique first</p>
          <h2 id="trainers-heading">Meet the trainers</h2>
          <p className="section-sub">Four coaches, one standard: Technique First.</p>
        </div>

        <div className="trainer-grid">
          {trainers.map((trainer) => (
            <article className={`trainer-card ${trainer.variant}`} key={trainer.name}>
              <div aria-hidden="true" className="avatar">
                {trainer.initials}
              </div>
              <div className="trainer-copy">
                <h3>{trainer.name}</h3>
                <p className="role">{trainer.role}</p>
                <p>{trainer.bio}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

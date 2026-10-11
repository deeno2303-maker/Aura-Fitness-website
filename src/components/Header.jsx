export default function Header() {
  return (
    <header className="site-header">
      <nav aria-label="Main navigation" className="nav container">
        <a aria-label="Aura Fitness home" className="logo" href="#top">
          <span aria-hidden="true" className="logo-mark">
            A
          </span>
          <span>
            AURA
            <strong>FITNESS</strong>
          </span>
        </a>

        <div className="nav-links">
          <a href="#schedule">Schedule</a>
          <a href="#trainers">Trainers</a>
          <a href="#membership">Membership</a>
        </div>

        <md-filled-button href="#contact" value="">
          Join now
        </md-filled-button>
      </nav>
    </header>
  );
}

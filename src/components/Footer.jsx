export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <a className="footer-brand" href="#top">
          AURA FITNESS
        </a>
        <p>© 2026 Aura Fitness</p>
        <ul className="footer-links">
          <li>
            <a href="#schedule">Schedule</a>
          </li>
          <li>
            <a href="#trainers">Trainers</a>
          </li>
          <li>
            <a href="#membership">Membership</a>
          </li>
          <li>
            <a href="/dashboard">Member login</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

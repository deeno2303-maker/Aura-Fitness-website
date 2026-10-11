import studioImage from '../../aura-studio.jpg';

export default function Hero() {
  return (
    <section className="hero" id="top">
      <img
        alt="An airy, modern gym with free weights and strength equipment"
        className="hero-image"
        height="1024"
        src={studioImage}
        width="1920"
      />

      <div className="container hero-inner">
        <p className="eyebrow">Est. 2026 · Durban</p>
        <h1>
          Aura Fitness
          <span className="hero-tagline">
            Train hard.
            <br />
            Recover harder.
          </span>
        </h1>
        <p className="hero-sub">
          Strength, conditioning and mobility classes led by coaches who actually teach you how to gain results. Small groups,
          big results, zero ego.
        </p>
        <div className="hero-actions">
          <md-filled-button has-icon="" href="#membership" value="">
            View memberships
            <md-icon aria-hidden="true" slot="icon">
              arrow_downward
            </md-icon>
          </md-filled-button>
          <md-outlined-button href="#schedule" value="">
            Weekly classes
          </md-outlined-button>
        </div>
      </div>
    </section>
  );
}

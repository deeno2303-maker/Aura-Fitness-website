export default function Pricing({ plans }) {
  return (
    <section aria-labelledby="membership-heading" className="section" id="membership">
      <div className="container">
        <div className="section-heading">
          <p className="section-kicker">03 / Your way in</p>
          <h2 id="membership-heading">Membership tiers</h2>
          <p className="section-sub">No contracts. Cancel anytime given it is 1 month in advance.</p>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <article className={`price-card ${plan.featured ? 'price-card-featured' : ''}`} key={plan.title}>
              {plan.badge ? <p className="badge">{plan.badge}</p> : null}
              <h3>{plan.title}</h3>
              <p className="price">
                {plan.price}
                <span>/mo</span>
              </p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <md-icon aria-hidden="true">check</md-icon>
                    {feature}
                  </li>
                ))}
              </ul>

              <md-filled-button href="#contact" value="" style={{ display: plan.buttonVariant === 'filled' ? 'inline-flex' : 'none' }}>
                {plan.buttonText}
              </md-filled-button>
              <md-outlined-button href="#contact" value="" style={{ display: plan.buttonVariant === 'outlined' ? 'inline-flex' : 'none' }}>
                {plan.buttonText}
              </md-outlined-button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

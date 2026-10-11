import { useEffect, useState } from 'react';
import { defaultSiteContent } from './data/siteData';
import Header from './components/Header';
import Hero from './components/Hero';
import Disciplines from './components/Disciplines';
import Schedule from './components/Schedule';
import Trainers from './components/Trainers';
import Pricing from './components/Pricing';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import { apiRequest } from './lib/api';

async function fetchSiteContent() {
  return apiRequest('/api/content');
}

export default function App() {
  const [content, setContent] = useState(defaultSiteContent);
  const [contentError, setContentError] = useState('');

  useEffect(() => {
    fetchSiteContent()
      .then(setContent)
      .catch((error) => setContentError(error.message));
  }, []);

  if (window.location.pathname.startsWith('/dashboard')) {
    return <Dashboard />;
  }

  return (
    <div className="aura-site">
      <a className="skip-link" href="#main">Skip to main content</a>
      <Header />
      <main id="main">
        <Hero />
        {contentError ? <p className="api-notice" role="status">{contentError} Showing the published copy instead.</p> : null}
        <Disciplines disciplines={content.disciplines} />
        <Schedule content={content} />
        <Trainers trainers={content.trainerProfiles} />
        <Pricing plans={content.membershipPlans} />
        <ContactForm scheduleRows={content.scheduleRows} />
      </main>
      <Footer />
    </div>
  );
}

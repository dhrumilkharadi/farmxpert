'use client';

// ============================================================
// FILE: src/components/marketing/PageShell.jsx
//
// The frame for every marketing page: cursor, navbar, a page hero in
// the home page's language (eyebrow rule, big title with one green
// word, lead paragraph, breadcrumb, quick facts), the page's own
// sections, then the shared call-to-action and footer.
// ============================================================

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CTASection from '@/components/landingpage/CTASection';
import useLandingEffects from './useLandingEffects';
import '@/styles/pages.css';

export function PageHero({ ns }) {
  const t = useTranslations(ns);
  const facts = t.has('facts') ? t.raw('facts') : [];
  return (
    <header className="page-hero">
      <div className="page-hero-grid" aria-hidden />
      <div className="page-hero-glow" aria-hidden />
      <div className="section-container page-hero-inner">
        <nav className="page-crumbs" aria-label="Breadcrumb">
          <Link href="/">{t('crumbHome')}</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{t('crumb')}</span>
        </nav>
        <div className="section-eyebrow">{t('eyebrow')}</div>
        <h1 className="page-title">
          {t('title.before')} <span className="text-green">{t('title.accent')}</span> {t('title.after')}
        </h1>
        <p className="page-lead">{t('lead')}</p>
        {facts.length > 0 && (
          <dl className="page-facts">
            {facts.map((f) => (
              <div key={f.label} className="page-fact">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </header>
  );
}

/** A titled section of a page: eyebrow, heading, optional intro, then content. */
export function PageSection({ id, eyebrow, title, intro, children, tone = 'base' }) {
  return (
    <section id={id} className={`page-section is-${tone}`}>
      <div className="section-container">
        {(eyebrow || title) && (
          <div className="page-section-head reveal">
            {eyebrow && <div className="section-eyebrow">{eyebrow}</div>}
            {title && <h2 className="section-title">{title}</h2>}
            {intro && <p className="section-sub">{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export default function PageShell({ ns, children }) {
  useLandingEffects();
  return (
    <>
      <Navbar />
      <main className="page-main">
        <PageHero ns={ns} />
        {children}
      </main>
      <CTASection />
      <Footer />
    </>
  );
}

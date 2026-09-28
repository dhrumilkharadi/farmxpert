'use client';

// ============================================================
// FILE: src/components/Navbar.jsx
//
// The marketing navbar, shared by the home page and every page it
// links to:
//   brand      the FarmXpert logo (vector mark + wordmark)
//   pages      AI Agents · Features · How it works · Technology -
//              real pages, the current one underlined
//   actions    theme, language, Get started
//   mobile     the page links move into a slide-down menu
// All strings come from `messages.navbar.*`; links are locale-aware.
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import LandingThemeToggle from '@/components/LandingThemeToggle';
import { LogoMark, Wordmark } from '@/components/ui/Logo';
import '@/styles/navbar.css';

export const PAGES = [
  { href: '/agents', key: 'agents' },
  { href: '/features', key: 'features' },
  { href: '/how-it-works', key: 'howItWorks' },
  { href: '/technology', key: 'technology' },
];

export default function Navbar() {
  const t = useTranslations('navbar');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // close the mobile menu on navigation
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) { setLastPath(pathname); setOpen(false); }

  return (
    <nav className={`site-nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <Link href="/" className="nav-brand" aria-label="FarmXpert - home">
        <LogoMark className="nav-brand-mark" />
        <Wordmark className="nav-brand-word" />
      </Link>

      <div className="nav-links" id="site-nav-links">
        {PAGES.map((p) => (
          <Link key={p.href} href={p.href} aria-current={pathname === p.href ? 'page' : undefined}
            className={pathname === p.href ? 'is-active' : undefined}>
            {t(p.key)}
          </Link>
        ))}
      </div>

      <div className="nav-actions">
        <LandingThemeToggle label={t('theme')} />
        <LanguageSwitcher />
        <Link href="/auth/register" className="nav-cta">{t('getStarted')}</Link>
        <button type="button" className="nav-burger" aria-expanded={open} aria-controls="site-nav-links"
          aria-label={open ? t('closeMenu') : t('openMenu')} onClick={() => setOpen((o) => !o)}>
          <span /><span /><span />
        </button>
      </div>
    </nav>
  );
}

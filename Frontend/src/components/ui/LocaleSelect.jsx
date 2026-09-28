'use client';

// ============================================================
// FILE: src/components/ui/LocaleSelect.jsx
// Language picker for the app screens (the landing page has its own).
// A listbox rather than a native <select>: the options are written in
// their own script and stay readable on the dark sidebar, where native
// option lists render white-on-white in some browsers.
//   variant="sidebar"  full-width card at the foot of the desktop sidebar,
//                      opens upwards
//   variant="compact"  pill for the phone top bar, opens downwards
// ============================================================

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Check, ChevronsUpDown, Languages, Loader2 } from '@/components/ui/icons';

import { usePathname, useRouter } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';
import { cn } from '@/lib/cn';

export default function LocaleSelect({ variant = 'compact', className }) {
  const t = useTranslations('languageSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const root = useRef(null);
  const button = useRef(null);
  const list = useRef(null);
  const id = useId();
  const sidebar = variant === 'sidebar';

  // "Gujarati" in the reader's language under each native name, so the
  // list still makes sense to someone who cannot read that script
  const inUiLanguage = (code) => {
    try { return new Intl.DisplayNames([locale], { type: 'language' }).of(code); } catch { return null; }
  };

  const choose = (code) => {
    setOpen(false);
    button.current?.focus();
    if (code === locale) return;
    const query = search.toString();
    start(() => router.replace(query ? `${pathname}?${query}` : pathname, { locale: code }));
  };

  const show = () => {
    setFocus(Math.max(0, locales.indexOf(locale)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    list.current?.focus();
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const onListKey = (e) => {
    const last = locales.length - 1;
    const moves = { ArrowDown: Math.min(last, focus + 1), ArrowUp: Math.max(0, focus - 1), Home: 0, End: last };
    if (e.key in moves) { e.preventDefault(); setFocus(moves[e.key]); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(locales[focus]); }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); if (e.key === 'Escape') button.current?.focus(); }
  };

  const Icon = pending ? Loader2 : Languages;

  return (
    <div ref={root} className={cn('relative', open && 'z-50', className)}>
      <button ref={button} type="button" onClick={() => (open ? setOpen(false) : show())} disabled={pending}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-label={`${t('label')}: ${t(locale)}`}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show(); } }}
        className={cn('flex w-full items-center text-left transition-colors focus-visible:outline-none',
          sidebar
            ? 'gap-3 rounded-2xl border border-[var(--sb-line)] bg-[var(--sb-card)] px-4 py-2.5 hover:border-[var(--sb-line-strong)] focus-visible:border-[var(--sb-gold)]'
            : 'h-9 gap-1.5 rounded-full border border-line bg-surface pr-2.5 pl-3 text-sm text-ink hover:border-leaf/50 focus-visible:ring-2 focus-visible:ring-leaf/40',
          open && (sidebar ? 'border-[var(--sb-line-strong)]' : 'border-leaf/60'))}>
        <Icon className={cn('shrink-0', pending && 'animate-spin',
          sidebar ? 'size-[1.15rem] text-[var(--sb-gold)]' : 'size-4 text-leaf')} aria-hidden />
        {sidebar ? (
          <span className="min-w-0 flex-1">
            <span className="block text-[0.6rem] font-medium tracking-[0.22em] text-[var(--sb-gold)] uppercase">{t('label')}</span>
            <span className="block truncate text-[0.95rem] leading-snug text-[var(--sb-text)]">{t(locale)}</span>
          </span>
        ) : <span className="font-medium">{t(locale)}</span>}
        <ChevronsUpDown className={cn('shrink-0', sidebar ? 'size-3.5 text-[var(--sb-faint)]' : 'size-3.5 text-faint')} strokeWidth={1.6} aria-hidden />
      </button>

      {open && (
        <ul ref={list} id={`${id}-list`} role="listbox" tabIndex={-1} aria-label={t('label')}
          aria-activedescendant={`${id}-${locales[focus]}`} onKeyDown={onListKey}
          className={cn('absolute z-50 min-w-[12rem] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-lift focus:outline-none',
            sidebar ? 'bottom-full left-0 mb-2 w-full' : 'top-full right-0 mt-2')}>
          {locales.map((code, i) => {
            const active = code === locale;
            const sub = inUiLanguage(code);
            return (
              <li key={code} id={`${id}-${code}`} role="option" aria-selected={active} lang={code}
                onPointerEnter={() => setFocus(i)} onClick={() => choose(code)}
                className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  focus === i ? 'bg-sage' : '', active && 'text-forest dark:text-leaf')}>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[0.95rem] leading-tight', active && 'font-semibold')}>{t(code)}</span>
                  {sub && sub !== t(code) && <span className="mt-0.5 block text-xs text-muted" lang={locale}>{sub}</span>}
                </span>
                {active && <Check className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

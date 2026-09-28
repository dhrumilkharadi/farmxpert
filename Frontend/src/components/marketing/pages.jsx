'use client';

// ============================================================
// FILE: src/components/marketing/pages.jsx
//
// The four pages the navbar links to. Each is structured the same way:
// hero (PageShell), the matching home-page section for continuity, then
// deeper content in cards, a pipeline, a spec table or an FAQ.
// ============================================================

import { useTranslations } from 'next-intl';

import AgentsSection from '@/components/landingpage/AgentsSection';
import FeaturesSection from '@/components/landingpage/FeaturesSection';
import HowItWorksSection from '@/components/landingpage/HowItWorksSection';
import TechSection from '@/components/landingpage/TechSection';
import ChipSceneSection from '@/components/landingpage/ChipSceneSection';
import {
  CalendarCheck, CloudSun, Droplets, KeyRound, ListChecks, MessagesSquare, Mic, Radio, Sparkles, Sprout, Store, TrendingUp, Wheat, Zap,
} from '@/components/ui/icons';
import PageShell, { PageSection } from './PageShell';

function InfoCard({ icon: Icon, tag, name, about, children, delay = 0 }) {
  return (
    <article className="info-card reveal" style={delay ? { transitionDelay: `${delay}s` } : undefined}>
      <div className="info-card-top">
        <span className="info-card-icon"><Icon className="size-5" /></span>
        {tag && <span className="info-card-tag">{tag}</span>}
      </div>
      <h3>{name}</h3>
      <p>{about}</p>
      {children}
    </article>
  );
}

// ── AI Agents ───────────────────────────────────────────────────────────────

const AGENT_CARDS = [
  { key: 'weather', icon: CloudSun }, { key: 'soil', icon: Sprout }, { key: 'irrigation', icon: Droplets },
  { key: 'crop', icon: Wheat }, { key: 'tasks', icon: CalendarCheck }, { key: 'market', icon: TrendingUp },
];

export function AgentsPage() {
  const t = useTranslations('pages.agents');
  return (
    <PageShell ns="pages.agents">
      <PageSection eyebrow={t('rosterEyebrow')} title={t('rosterTitle')} intro={t('rosterIntro')} tone="surface">
        <div className="info-grid">
          {AGENT_CARDS.map((a, i) => (
            <InfoCard key={a.key} icon={a.icon} tag={t(`cards.${a.key}.tag`)} name={t(`cards.${a.key}.name`)}
              about={t(`cards.${a.key}.about`)} delay={(i % 3) * 0.08}>
              <dl className="kv">
                <div><dt>{t('kv.reads')}</dt><dd>{t(`cards.${a.key}.reads`)}</dd></div>
                <div><dt>{t('kv.gives')}</dt><dd>{t(`cards.${a.key}.gives`)}</dd></div>
              </dl>
              <p className="ask">“{t(`cards.${a.key}.ask`)}”</p>
            </InfoCard>
          ))}
        </div>
      </PageSection>

      <PageSection tone="base">
        <div className="orchestra reveal">
          <div>
            <div className="section-eyebrow">{t('orchestraEyebrow')}</div>
            <h3>{t('orchestraTitle')}</h3>
            <p>{t('orchestraText')}</p>
          </div>
          <ol>{t.raw('orchestraSteps').map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      </PageSection>

      <AgentsSection />
    </PageShell>
  );
}

// ── Features ────────────────────────────────────────────────────────────────

const FEATURE_CARDS = [
  { key: 'voice', icon: Mic }, { key: 'plan', icon: Sparkles }, { key: 'sensor', icon: Radio }, { key: 'water', icon: Droplets },
  { key: 'tasks', icon: ListChecks }, { key: 'market', icon: Store }, { key: 'agents', icon: MessagesSquare }, { key: 'private', icon: KeyRound },
];

export function FeaturesPage() {
  const t = useTranslations('pages.features');
  return (
    <PageShell ns="pages.features">
      <PageSection eyebrow={t('gridEyebrow')} title={t('gridTitle')} intro={t('gridIntro')} tone="surface">
        <div className="info-grid">
          {FEATURE_CARDS.map((f, i) => (
            <InfoCard key={f.key} icon={f.icon} tag={t(`items.${f.key}.tag`)} name={t(`items.${f.key}.name`)}
              about={t(`items.${f.key}.about`)} delay={(i % 4) * 0.06} />
          ))}
        </div>
      </PageSection>
      <FeaturesSection />
    </PageShell>
  );
}

// ── How it works ────────────────────────────────────────────────────────────

const STAGES = ['setup', 'understand', 'agents', 'check', 'answer'];

export function HowItWorksPage() {
  const t = useTranslations('pages.howItWorks');
  return (
    <PageShell ns="pages.howItWorks">
      <HowItWorksSection />
      <PageSection eyebrow={t('pipelineEyebrow')} title={t('pipelineTitle')} tone="base">
        <ol className="pipeline">
          {STAGES.map((k, i) => (
            <li key={k} className="reveal" style={{ transitionDelay: `${i * 0.06}s` }}>
              <div>
                <h3>{t(`stages.${k}.name`)}</h3>
                <p>{t(`stages.${k}.about`)}</p>
                <div className="chips">{t.raw(`stages.${k}.chips`).map((c) => <span key={c}>{c}</span>)}</div>
              </div>
            </li>
          ))}
        </ol>
      </PageSection>
      <PageSection eyebrow={t('faqEyebrow')} title={t('faqTitle')} tone="surface">
        <div className="faq">
          {t.raw('faq').map((f) => (
            <details key={f.q} className="faq-item reveal">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </PageSection>
    </PageShell>
  );
}

// ── Technology ──────────────────────────────────────────────────────────────

const TRUST = [
  { key: 'auth', icon: KeyRound }, { key: 'privacy', icon: Sprout }, { key: 'budget', icon: Zap }, { key: 'honest', icon: Sparkles },
];

export function TechnologyPage() {
  const t = useTranslations('pages.technology');
  return (
    <PageShell ns="pages.technology">
      <PageSection eyebrow={t('stackEyebrow')} title={t('stackTitle')} tone="surface">
        <div className="spec-wrap reveal">
          <table className="spec-table">
            <tbody>
              {t.raw('stack').map((row) => (
                <tr key={row.layer}>
                  <th scope="row">{row.layer}</th>
                  <td>{row.what}<small>{row.note}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
      <TechSection />
      <ChipSceneSection />
      <PageSection eyebrow={t('trustEyebrow')} title={t('trustTitle')} tone="surface">
        <div className="info-grid">
          {TRUST.map((c, i) => (
            <InfoCard key={c.key} icon={c.icon} tag={t(`trust.${c.key}.tag`)} name={t(`trust.${c.key}.name`)}
              about={t(`trust.${c.key}.about`)} delay={i * 0.06} />
          ))}
        </div>
      </PageSection>
    </PageShell>
  );
}

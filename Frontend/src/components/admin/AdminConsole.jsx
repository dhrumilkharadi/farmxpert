'use client';

// ============================================================
// FILE: src/components/admin/AdminConsole.jsx
//
// Operations analytics for FarmXpert admins. Every chart answers one
// operator question:
//   KPIs              is the service growing and healthy? (vs previous period)
//   Token burn        where the AI budget goes each day, by purpose
//   Engagement        how many farmers ask, and how much they ask
//   Answer latency    what a farmer actually waits (median and p95)
//   Agent reliability which expert fails or slows answers down
//   Intents           what farmers need help with
//   Languages         which languages to invest in
//   When farmers ask  weekday x hour, farmer's time
//   Spend by model    which model the money goes to
//   Growth            new accounts, and how many finish onboarding
// Then every account: usage today vs limit, 30-day tokens and spend,
// farms and the Blynk tokens they are connected with.
// ============================================================

import { Fragment, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/cn';
import { useApi } from '@/hooks/useApi';
import { Skeleton } from '@/components/ui/primitives';
import { Eye, EyeOff, Search } from '@/components/ui/icons';
import { BarChart, Heatmap, Legend, RankBars, SERIES, Sparkline, TimeChart, lastDays, useChartFormat } from './charts';

// labels live in messages: dashboard.admin.purposes / agents / languages / intents
const PURPOSES = ['chat', 'embedding', 'transcription', 'speech'];

/** A message for a key the backend sends, or the raw key when there is none. */
const labelOr = (t, key, fallback = key) => (t.has(key) ? t(key) : fallback);

const money = (v, cur = 'USD', tag = 'en-IN') => new Intl.NumberFormat(tag, { style: 'currency', currency: cur, maximumFractionDigits: v < 1 ? 3 : 2 }).format(v || 0);
const secs = (ms) => (ms === null || ms === undefined ? '—' : `${(ms / 1000).toFixed(1)}s`);
const byDay = (rows, key, days) => {
  const m = new Map(rows.map((r) => [String(r.day).slice(0, 10), Number(r[key] || 0)]));
  return days.map((d) => m.get(d) || 0);
};

function Panel({ title, question, children, className, right }) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="!font-sans text-[0.95rem] font-semibold tracking-normal text-ink">{title}</h2>
          {question && <p className="mt-0.5 text-xs text-muted">{question}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, change, invert = false, sub, spark, color }) {
  const t = useTranslations('dashboard.admin');
  const good = change === null || change === undefined ? null : invert ? change < 0 : change > 0;
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-[1.6rem] leading-none font-semibold tracking-tight text-ink tabular-nums">{value}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs">
            {change !== null && change !== undefined ? (
              <span className={cn('inline-flex items-center gap-0.5 font-medium', good ? 'text-[#0ca30c]' : 'text-[#d03b3b]')}>
                {/* icon + sign + number: never colour alone */}
                <span aria-hidden>{change >= 0 ? '▲' : '▼'}</span>{Math.abs(change)}%
              </span>
            ) : <span className="text-faint">{t('noPrior')}</span>}
            {sub && <span className="text-faint">· {sub}</span>}
          </p>
        </div>
        {spark && <Sparkline values={spark} color={color} />}
      </div>
    </div>
  );
}

function TokenCell({ token }) {
  const t = useTranslations('dashboard.admin');
  const [shown, setShown] = useState(false);
  if (!token) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="font-mono text-[0.72rem] text-ink">{shown ? token : `${'•'.repeat(8)}${token.slice(-4)}`}</code>
      <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? t('hideToken') : t('showToken')}
        className="grid size-6 place-items-center rounded text-faint hover:bg-canvas hover:text-ink">
        {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </span>
  );
}

function UserDetail({ id, currency }) {
  const t = useTranslations('dashboard.admin');
  const fx = useChartFormat();
  const { data, loading } = useApi(`/admin/users/${id}/detail`);
  const days = useMemo(() => lastDays(30), []);
  if (loading || !data) return <Skeleton className="h-48 rounded-xl" />;
  const series = PURPOSES.map((key, i) => ({
    key, label: t(`purposes.${key}`), color: SERIES[i],
    values: byDay(data.daily.filter((r) => r.purpose === key), 'tokens', days),
  })).filter((s) => s.values.some(Boolean));
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div>
        <p className="mb-2 text-xs font-medium text-muted">{t('detail.tokensPerDay')}</p>
        {series.length ? (
          <>
            <Legend items={series} />
            <div className="mt-2"><TimeChart days={days} series={series} stacked height={200} /></div>
          </>
        ) : <p className="py-10 text-center text-sm text-faint">{t('detail.noUsage')}</p>}
      </div>
      <div className="space-y-4 text-sm">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">{t('detail.byModel')}</p>
          <table className="w-full text-xs">
            <tbody>
              {data.by_model.map((m) => (
                <tr key={`${m.model}-${m.purpose}`} className="border-b border-line/70">
                  <td className="py-1.5 pr-2 text-ink">{m.model}</td>
                  <td className="py-1.5 text-right text-muted tabular-nums">{fx.num(Number(m.tokens))}</td>
                  <td className="py-1.5 pl-3 text-right text-ink tabular-nums">{money(m.cost, currency, fx.tag)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">{t('detail.farmsDevices')}</p>
          {data.farms.map((f) => (
            <p key={f.id} className="text-xs text-ink">{f.name} <span className="text-faint">· {[f.district, f.state].filter(Boolean).join(', ')}</span></p>
          ))}
          {data.devices.map((d) => (
            <p key={d.id} className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className={d.is_active ? 'text-ink' : 'text-faint line-through'}>{d.farm} · {d.label || t('detail.probe')}</span>
              <TokenCell token={d.token} />
            </p>
          ))}
        </div>
        {data.recent_questions.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">{t('detail.recent')}</p>
            <ul className="space-y-1">
              {data.recent_questions.slice(0, 4).map((q) => (
                <li key={q.created_at} className="truncate text-xs text-ink" title={q.content}>
                  <span className="text-faint">{fx.day(q.created_at)} · </span>{q.content}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function Users({ currency }) {
  const t = useTranslations('dashboard.admin');
  const fx = useChartFormat();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const { data, loading } = useApi(`/admin/users?limit=300${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`);
  const limit = data?.default_daily_limit || 0;
  return (
    <Panel title={t('accounts.title')} question={t('accounts.question')}
      right={(
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('accounts.search')} aria-label={t('accounts.search')}
            className="h-8 w-56 rounded-lg border border-line bg-canvas pr-3 pl-8 text-xs text-ink placeholder:text-faint focus:border-leaf focus:outline-none" />
        </label>
      )}>
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-xs">
          <thead>
            <tr className="border-b border-line text-[0.68rem] tracking-wide text-faint uppercase">
              <th className="px-5 py-2 font-medium">{t('accounts.user')}</th>
              <th className="px-3 py-2 font-medium">{t('accounts.role')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('accounts.farms')}</th>
              <th className="px-3 py-2 font-medium">{t('accounts.today')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('accounts.tokens30')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('accounts.spend30')}</th>
              <th className="px-3 py-2 font-medium">{t('accounts.blynk')}</th>
              <th className="px-5 py-2 font-medium">{t('accounts.lastLogin')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && <tr><td colSpan={8} className="px-5 py-6"><Skeleton className="h-24 rounded-lg" /></td></tr>}
            {data?.items.map((u) => {
              const cap = u.token_daily_limit ?? limit;
              const used = Number(u.tokens_today);
              const share = cap ? Math.min(1, used / cap) : 0;
              return (
                <Fragment key={u.id}>
                  <tr onClick={() => setOpen(open === u.id ? null : u.id)}
                    className={cn('cursor-pointer border-b border-line/70 transition-colors hover:bg-canvas', open === u.id && 'bg-canvas')}>
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-ink">{u.name}</p>
                      <p className="text-faint">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                    </td>
                    <td className="px-3 py-2.5"><span className="rounded-md bg-canvas px-1.5 py-0.5 text-[0.68rem] text-muted">{labelOr(t, `roles.${u.role}`, u.role)}</span></td>
                    <td className="px-3 py-2.5 text-right text-ink tabular-nums">{u.farms}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--viz-track)]">
                          <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: share > 0.9 ? '#d03b3b' : 'var(--viz-1)' }} />
                        </div>
                        <span className="text-muted tabular-nums">{fx.num(used)}{cap ? ` / ${fx.num(cap)}` : ''}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-ink tabular-nums">{fx.num(Number(u.tokens_30d))}</td>
                    <td className="px-3 py-2.5 text-right text-ink tabular-nums">{money(u.cost_30d, currency, fx.tag)}</td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {u.devices.length ? u.devices.map((d) => <TokenCell key={d.device_id} token={d.token} />) : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-muted">{u.last_login_at ? fx.day(u.last_login_at) : '—'}</td>
                  </tr>
                  {open === u.id && (
                    <tr className="border-b border-line/70 bg-canvas/60">
                      <td colSpan={8} className="px-5 py-5"><UserDetail id={u.id} currency={currency} /></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function AdminConsole() {
  const t = useTranslations('dashboard.admin');
  const fx = useChartFormat();
  const [range, setRange] = useState(30);
  const { data, loading, error } = useApi(`/admin/analytics?days=${range}`);
  const days = useMemo(() => lastDays(range), [range]);

  if (error) {
    return <p className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">{t('noAccess')}</p>;
  }
  const k = data?.kpis;
  const cur = data?.currency || 'USD';

  const tokenSeries = data ? PURPOSES.map((key, i) => ({
    key, label: t(`purposes.${key}`), color: SERIES[i],
    values: byDay(data.tokens_by_day.filter((r) => r.purpose === key), 'tokens', days),
  })).filter((s) => s.values.some(Boolean)) : [];
  const spendByDay = data ? days.map((d) => data.tokens_by_day.filter((r) => String(r.day).slice(0, 10) === d)
    .reduce((s, r) => s + Number(r.cost || 0), 0)) : [];
  const questions = data ? byDay(data.engagement, 'questions', days) : [];
  const voice = data ? byDay(data.engagement, 'voice', days) : [];
  const farmers = data ? byDay(data.engagement, 'active_farmers', days) : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.2em] text-gold uppercase">{t('eyebrow')}</p>
          <h1 className="mt-1 text-[1.9rem] leading-tight text-ink">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('lead', { tz: data?.timezone || 'Asia/Kolkata' })}</p>
        </div>
        <div role="radiogroup" aria-label={t('range')} className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" role="radio" aria-checked={range === d} onClick={() => setRange(d)}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                range === d ? 'bg-forest text-on-forest' : 'text-muted hover:text-ink')}>
              {t('days', { count: d })}
            </button>
          ))}
        </div>
      </header>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <Kpi label={t('kpi.activeFarmers')} value={fx.num(k.active_farmers.value)} change={k.active_farmers.change}
              sub={t('kpi.accounts', { count: data.totals.users })} spark={farmers} color="var(--viz-1)" />
            <Kpi label={t('kpi.questions')} value={fx.num(k.questions.value)} change={k.questions.change}
              sub={k.voice_share.value !== null ? t('kpi.byVoice', { pct: k.voice_share.value }) : null} spark={questions} color="var(--viz-1)" />
            <Kpi label={t('kpi.answerRate')} value={k.answer_rate.value === null ? '—' : `${k.answer_rate.value}%`} change={k.answer_rate.change}
              sub={t('kpi.answerRateSub')} />
            <Kpi label={t('kpi.medianWait')} value={secs(k.p50_ms.value)} change={k.p50_ms.change} invert sub={`p95 ${secs(k.p95_ms.value)}`} />
            <Kpi label={t('kpi.tokens')} value={fx.num(k.tokens.value)} change={k.tokens.change} invert
              sub={k.tokens_per_question.value ? t('kpi.perQuestion', { n: fx.num(k.tokens_per_question.value) }) : null}
              spark={tokenSeries.length ? days.map((_, i) => tokenSeries.reduce((s, x) => s + x.values[i], 0)) : null} color="var(--viz-2)" />
            <Kpi label={t('kpi.spend')} value={money(k.cost.value, cur, fx.tag)} change={k.cost.change} invert
              sub={t('kpi.probesLive', { live: data.totals.devices_live, total: data.totals.devices })} spark={spendByDay} color="var(--viz-2)" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel title={t('panels.tokenBurn')} question={t('panels.tokenBurnQ')}>
              {tokenSeries.length ? (
                <>
                  <Legend items={tokenSeries} />
                  <div className="mt-3"><TimeChart days={days} series={tokenSeries} stacked /></div>
                </>
              ) : <p className="py-16 text-center text-sm text-faint">{t('panels.noTokens')}</p>}
            </Panel>
            <Panel title={t('panels.spendByModel')} question={t('panels.spendByModelQ')}>
              <RankBars rows={data.models.map((m) => ({ label: `${m.model}`, value: Number(m.cost) || 0 }))}
                format={(v) => money(v, cur, fx.tag)} color="var(--viz-2)" />
              <p className="mt-4 text-xs text-faint">{t('panels.priced')}</p>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title={t('panels.engagement')} question={t('panels.engagementQ')}>
              <Legend items={[{ label: t('series.questions'), color: 'var(--viz-1)' }, { label: t('series.activeFarmers'), color: 'var(--viz-3)' }]} />
              <div className="mt-3">
                <TimeChart days={days} series={[
                  { key: 'q', label: t('series.questions'), color: 'var(--viz-1)', values: questions },
                  { key: 'f', label: t('series.activeFarmers'), color: 'var(--viz-3)', values: farmers },
                ]} />
              </div>
            </Panel>
            <Panel title={t('panels.textVoice')} question={t('panels.textVoiceQ')}>
              <Legend items={[{ label: t('series.typed'), color: 'var(--viz-1)' }, { label: t('series.spoken'), color: 'var(--viz-4)' }]} />
              <div className="mt-3">
                <BarChart days={days} series={[
                  { key: 'text', label: t('series.typed'), color: 'var(--viz-1)', values: questions.map((v, i) => v - voice[i]) },
                  { key: 'voice', label: t('series.spoken'), color: 'var(--viz-4)', values: voice },
                ]} />
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Panel title={t('panels.latency')} question={t('panels.latencyQ')}>
              <Legend items={[{ label: t('series.p50'), color: 'var(--viz-1)' }, { label: t('series.p95'), color: 'var(--viz-2)', dashed: true }]} />
              <div className="mt-3">
                <TimeChart days={days} unit="s" format={(v) => (Math.round(v * 10) / 10).toString()} series={[
                  { key: 'p50', label: t('series.median'), color: 'var(--viz-1)', values: byDay(data.latency, 'p50', days).map((v) => v / 1000) },
                  { key: 'p95', label: t('series.p95short'), color: 'var(--viz-2)', dashed: true, values: byDay(data.latency, 'p95', days).map((v) => v / 1000) },
                ]} />
              </div>
            </Panel>
            <Panel title={t('panels.agents')} question={t('panels.agentsQ')}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-[0.68rem] tracking-wide text-faint uppercase">
                    <th className="py-2 text-left font-medium">{t('agentTable.agent')}</th>
                    <th className="py-2 text-right font-medium">{t('agentTable.runs')}</th>
                    <th className="py-2 pl-3 text-left font-medium">{t('agentTable.success')}</th>
                    <th className="py-2 text-right font-medium">p95</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((a) => {
                    const rate = a.runs ? a.ok / a.runs : 0;
                    const state = rate >= 0.95 ? ['#0ca30c', '●', t('health.healthy')] : rate >= 0.8 ? ['#fab219', '▲', t('health.degraded')] : ['#d03b3b', '■', t('health.failing')];
                    return (
                      <tr key={a.agent} className="border-b border-line/70" title={a.top_error ? t('topError', { error: a.top_error }) : undefined}>
                        <td className="py-2.5 pr-2 text-ink">{labelOr(t, `agents.${a.agent}`)}</td>
                        <td className="py-2.5 text-right text-muted tabular-nums">{a.runs}</td>
                        <td className="py-2.5 pl-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--viz-track)]">
                              <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, background: state[0] }} />
                            </div>
                            <span className="text-ink tabular-nums">{Math.round(rate * 100)}%</span>
                            <span className="text-[0.65rem] text-muted"><span style={{ color: state[0] }} aria-hidden>{state[1]}</span> {state[2]}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-ink tabular-nums">{secs(a.p95)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title={t('panels.when')} question={t('panels.whenQ')}>
              <Heatmap cells={data.heatmap} />
            </Panel>
            <Panel title={t('panels.topics')} question={t('panels.topicsQ')}>
              <RankBars rows={data.intents.map((r) => ({ label: labelOr(t, `intents.${r.intent}`, r.intent.replace(/_/g, ' ')), value: r.n }))} color="var(--viz-1)" />
            </Panel>
            <Panel title={t('panels.languages')} question={t('panels.languagesQ')}>
              <RankBars rows={data.languages.map((r) => ({ label: labelOr(t, `languages.${r.language}`), value: r.n }))} color="var(--viz-3)" />
            </Panel>
          </div>

          <Panel title={t('panels.growth')} question={t('panels.growthQ')}>
            <Legend items={[{ label: t('series.onboarded'), color: 'var(--viz-3)' }, { label: t('series.notOnboarded'), color: 'var(--viz-1)' }]} />
            <div className="mt-3">
              <BarChart days={days} height={180} series={[
                { key: 'onb', label: t('series.onboarded'), color: 'var(--viz-3)', values: byDay(data.signups, 'onboarded', days) },
                { key: 'rest', label: t('series.notOnboarded'), color: 'var(--viz-1)',
                  values: days.map((d, i) => byDay(data.signups, 'signups', days)[i] - byDay(data.signups, 'onboarded', days)[i]) },
              ]} />
            </div>
          </Panel>
        </>
      )}

    </div>
  );
}

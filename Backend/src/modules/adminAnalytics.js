/**
 * Admin analytics: the numbers an operator needs, each tied to a decision.
 *
 *   GET /admin/analytics?days=30        the whole dashboard in one call
 *   GET /admin/users?q=&limit=          every account, with usage and devices
 *   GET /admin/users/:id/detail         one account: daily usage, models, farms, devices
 *
 * Days are counted in TOKEN_DAY_TIMEZONE (India by default), so "today" and
 * the heatmap hours are the farmer's, not the server's. Every figure comes
 * with the previous period of the same length, so a KPI says which way it is
 * moving, not only where it is.
 *
 * Admin-only (requireAdmin). Blynk tokens are shown here in full: the admin
 * console is where support checks which device a farm is connected to.
 */

import { Router } from 'express';

import { config } from '../config/env.js';
import { one, query } from '../db/pool.js';
import { notFound } from '../lib/errors.js';
import { idParam, validate } from '../lib/validate.js';
import { requireAdmin } from './admin.js';

export const adminAnalyticsRoutes = Router();

const TZ = () => config.tokens.timezone;
const daysQuery = {
  type: 'object',
  properties: { days: { type: 'integer', minimum: 7, maximum: 180, default: 30 } },
};

const num = (v) => Number(v ?? 0);
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);

adminAnalyticsRoutes.get('/admin/analytics', requireAdmin, validate({ query: daysQuery }), async (req, res) => {
  const days = req.query.days ?? 30;
  const tz = TZ();
  // current window [now - days, now), previous [now - 2*days, now - days)
  const P = [days, tz];

  const [kpiNow, kpiPrev, tokensByDay, engagement, latency, agents, intents, languages,
    heatmap, models, signups, totals] = await Promise.all([
    kpis(0, days, tz),
    kpis(days, days, tz),

    // token burn per local day, split by what the tokens were for
    query(
      `SELECT usage_date AS day, purpose,
              sum(total_tokens)::bigint AS tokens, sum(cost)::float8 AS cost, sum(calls)::bigint AS calls,
              sum(audio_seconds)::float8 AS audio_seconds
         FROM token_usage_daily
        WHERE usage_date > (now() AT TIME ZONE $2)::date - $1::int
        GROUP BY usage_date, purpose ORDER BY usage_date`, P),

    // engagement: farmers who asked, and how much they asked, per day
    query(
      `SELECT (m.created_at AT TIME ZONE $2)::date AS day,
              count(*)::int AS questions,
              count(DISTINCT c.user_id)::int AS active_farmers,
              count(*) FILTER (WHERE m.input_mode = 'voice')::int AS voice
         FROM messages m JOIN conversations c ON c.id = m.conversation_id
        WHERE m.role = 'farmer' AND m.created_at > now() - make_interval(days => $1::int)
        GROUP BY 1 ORDER BY 1`, P),

    // how long farmers wait, per day: median and 95th percentile
    query(
      `SELECT (created_at AT TIME ZONE $2)::date AS day,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms)::float8 AS p50,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::float8 AS p95,
              count(*)::int AS requests,
              count(*) FILTER (WHERE status = 'success')::int AS ok
         FROM orchestration_requests
        WHERE created_at > now() - make_interval(days => $1::int)
        GROUP BY 1 ORDER BY 1`, P),

    // every expert agent: volume, reliability and speed
    query(
      `SELECT agent,
              count(*)::int AS runs,
              count(*) FILTER (WHERE status = 'success')::int AS ok,
              count(*) FILTER (WHERE status <> 'success')::int AS failed,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms)::float8 AS p50,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::float8 AS p95,
              mode() WITHIN GROUP (ORDER BY error_code) FILTER (WHERE error_code IS NOT NULL) AS top_error
         FROM agent_outputs
        WHERE created_at > now() - make_interval(days => $1::int)
        GROUP BY agent ORDER BY runs DESC`, [days]),

    // what farmers ask about
    query(
      `SELECT COALESCE(intent, 'other') AS intent, count(*)::int AS n
         FROM messages
        WHERE role = 'assistant' AND created_at > now() - make_interval(days => $1::int)
        GROUP BY 1 ORDER BY n DESC`, [days]),

    // the languages farmers use
    query(
      `SELECT COALESCE(language, 'unknown') AS language, count(*)::int AS n
         FROM messages
        WHERE role = 'farmer' AND created_at > now() - make_interval(days => $1::int)
        GROUP BY 1 ORDER BY n DESC`, [days]),

    // when farmers use FarmXpert: weekday x hour, farmer's time zone
    query(
      `SELECT extract(isodow FROM created_at AT TIME ZONE $2)::int AS dow,
              extract(hour FROM created_at AT TIME ZONE $2)::int AS hour,
              count(*)::int AS n
         FROM messages
        WHERE role = 'farmer' AND created_at > now() - make_interval(days => $1::int)
        GROUP BY 1, 2`, P),

    // which model the money goes to
    query(
      `SELECT model, purpose, sum(total_tokens)::bigint AS tokens, sum(prompt_tokens)::bigint AS prompt_tokens,
              sum(completion_tokens)::bigint AS completion_tokens, sum(calls)::bigint AS calls,
              sum(cost)::float8 AS cost
         FROM token_usage_daily
        WHERE usage_date > (now() AT TIME ZONE $2)::date - $1::int
        GROUP BY model, purpose ORDER BY cost DESC, tokens DESC`, P),

    // growth: new accounts per day, and how many finished onboarding
    query(
      `SELECT (created_at AT TIME ZONE $2)::date AS day,
              count(*)::int AS signups,
              count(*) FILTER (WHERE onboarded_at IS NOT NULL)::int AS onboarded
         FROM users
        WHERE deleted_at IS NULL AND created_at > now() - make_interval(days => $1::int)
        GROUP BY 1 ORDER BY 1`, P),

    one(
      `SELECT (SELECT count(*) FROM users WHERE deleted_at IS NULL)::int AS users,
              (SELECT count(*) FROM users WHERE deleted_at IS NULL AND onboarded_at IS NOT NULL)::int AS onboarded,
              (SELECT count(*) FROM farms WHERE deleted_at IS NULL)::int AS farms,
              (SELECT count(*) FROM blynk_tokens WHERE is_active)::int AS devices,
              (SELECT count(*) FROM blynk_tokens WHERE is_active AND last_seen_at > now() - interval '1 day')::int AS devices_live`),
  ]);

  res.json({
    days,
    timezone: tz,
    currency: config.tokens.currency,
    totals,
    kpis: Object.fromEntries(Object.entries(kpiNow).map(([k, v]) => [k, {
      value: v, previous: kpiPrev[k], change: typeof v === 'number' && typeof kpiPrev[k] === 'number' ? pct(v, kpiPrev[k]) : null,
    }])),
    tokens_by_day: tokensByDay.rows,
    engagement: engagement.rows,
    latency: latency.rows,
    agents: agents.rows,
    intents: intents.rows,
    languages: languages.rows,
    heatmap: heatmap.rows,
    models: models.rows,
    signups: signups.rows,
  });
});

/** The headline numbers for one window, `offset` days back, `days` long. */
async function kpis(offset, days, tz) {
  const [tok, msg, orch] = await Promise.all([
    one(
      `SELECT COALESCE(sum(total_tokens), 0)::bigint AS tokens, COALESCE(sum(cost), 0)::float8 AS cost
         FROM token_usage_daily
        WHERE usage_date >  (now() AT TIME ZONE $3)::date - ($1::int + $2::int)
          AND usage_date <= (now() AT TIME ZONE $3)::date - $1::int`, [offset, days, tz]),
    one(
      `SELECT count(*)::int AS questions, count(DISTINCT c.user_id)::int AS active_farmers,
              count(*) FILTER (WHERE m.input_mode = 'voice')::int AS voice
         FROM messages m JOIN conversations c ON c.id = m.conversation_id
        WHERE m.role = 'farmer'
          AND m.created_at >  now() - make_interval(days => $1::int + $2::int)
          AND m.created_at <= now() - make_interval(days => $1::int)`, [offset, days]),
    one(
      `SELECT count(*)::int AS requests,
              count(*) FILTER (WHERE status IN ('success', 'partial_success'))::int AS answered,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms)::float8 AS p50,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::float8 AS p95
         FROM orchestration_requests
        WHERE created_at >  now() - make_interval(days => $1::int + $2::int)
          AND created_at <= now() - make_interval(days => $1::int)`, [offset, days]),
  ]);
  return {
    active_farmers: msg.active_farmers,
    questions: msg.questions,
    tokens: num(tok.tokens),
    cost: Math.round(num(tok.cost) * 100) / 100,
    answer_rate: orch.requests ? Math.round((orch.answered / orch.requests) * 1000) / 10 : null,
    p50_ms: orch.p50 === null ? null : Math.round(orch.p50),
    p95_ms: orch.p95 === null ? null : Math.round(orch.p95),
    voice_share: msg.questions ? Math.round((msg.voice / msg.questions) * 1000) / 10 : null,
    tokens_per_question: msg.questions ? Math.round(num(tok.tokens) / msg.questions) : null,
  };
}

// ── users ───────────────────────────────────────────────────────────────────

adminAnalyticsRoutes.get(
  '/admin/users',
  requireAdmin,
  validate({ query: { type: 'object', properties: {
    q: { type: 'string', maxLength: 120 },
    limit: { type: 'integer', minimum: 1, maximum: 500, default: 200 },
  } } }),
  async (req, res) => {
    const tz = TZ();
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.language, u.email_verified,
              u.created_at, u.last_login_at, u.onboarded_at, u.token_daily_limit,
              (SELECT count(*) FROM farms f WHERE f.user_id = u.id AND f.deleted_at IS NULL)::int AS farms,
              COALESCE(t30.tokens, 0)::bigint AS tokens_30d, COALESCE(t30.cost, 0)::float8 AS cost_30d,
              COALESCE(t30.calls, 0)::bigint AS calls_30d,
              COALESCE(tt.tokens, 0)::bigint AS tokens_today,
              (SELECT json_agg(json_build_object(
                        'farm', f.name, 'farm_id', f.id, 'device_id', b.id, 'label', b.label,
                        'token', b.token, 'last_seen_at', b.last_seen_at, 'created_at', b.created_at)
                        ORDER BY b.created_at DESC)
                 FROM blynk_tokens b JOIN farms f ON f.id = b.farm_id
                WHERE f.user_id = u.id AND b.is_active) AS devices
         FROM users u
         LEFT JOIN LATERAL (
           SELECT sum(total_tokens) AS tokens, sum(cost) AS cost, sum(calls) AS calls
             FROM token_usage_daily WHERE user_id = u.id
              AND usage_date > (now() AT TIME ZONE $3)::date - 30) t30 ON true
         LEFT JOIN LATERAL (
           SELECT sum(total_tokens) AS tokens FROM token_usage_daily
            WHERE user_id = u.id AND usage_date = (now() AT TIME ZONE $3)::date) tt ON true
        WHERE u.deleted_at IS NULL
          AND ($1::text IS NULL OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%'
               OR u.phone ILIKE '%' || $1 || '%')
        ORDER BY tokens_30d DESC, u.created_at DESC
        LIMIT $2`,
      [req.query.q?.trim() || null, req.query.limit ?? 200, tz],
    );
    res.json({
      default_daily_limit: config.tokens.dailyLimit ?? null,
      items: rows.map((r) => ({ ...r, devices: r.devices || [] })),
    });
  },
);

adminAnalyticsRoutes.get('/admin/users/:id/detail', requireAdmin, validate({ params: idParam }), async (req, res) => {
  const tz = TZ();
  const user = await one(
    `SELECT id, name, email, phone, role, language, created_at, last_login_at, onboarded_at, token_daily_limit
       FROM users WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
  if (!user) throw notFound('User');
  const [daily, byModel, farms, devices, recent] = await Promise.all([
    query(
      `SELECT usage_date AS day, purpose, sum(total_tokens)::bigint AS tokens, sum(cost)::float8 AS cost,
              sum(calls)::bigint AS calls
         FROM token_usage_daily
        WHERE user_id = $1 AND usage_date > (now() AT TIME ZONE $2)::date - 60
        GROUP BY usage_date, purpose ORDER BY usage_date`, [req.params.id, tz]),
    query(
      `SELECT model, purpose, sum(prompt_tokens)::bigint AS prompt_tokens,
              sum(completion_tokens)::bigint AS completion_tokens, sum(total_tokens)::bigint AS tokens,
              sum(calls)::bigint AS calls, sum(cost)::float8 AS cost
         FROM token_usage_daily WHERE user_id = $1 GROUP BY model, purpose ORDER BY tokens DESC`, [req.params.id]),
    query(
      `SELECT f.id, f.name, f.district, f.state, f.area_hectares::float8 AS area_hectares, f.created_at,
              (SELECT json_agg(json_build_object('crop', fl.crop_name, 'stage', fl.growth_stage))
                 FROM fields fl WHERE fl.farm_id = f.id) AS fields
         FROM farms f WHERE f.user_id = $1 AND f.deleted_at IS NULL ORDER BY f.created_at`, [req.params.id]),
    query(
      `SELECT b.id, b.label, b.token, b.is_active, b.last_seen_at, b.created_at, b.revoked_at, f.name AS farm
         FROM blynk_tokens b JOIN farms f ON f.id = b.farm_id
        WHERE f.user_id = $1 ORDER BY b.created_at DESC`, [req.params.id]),
    query(
      `SELECT m.created_at, m.content, m.language, m.input_mode
         FROM messages m JOIN conversations c ON c.id = m.conversation_id
        WHERE c.user_id = $1 AND m.role = 'farmer'
        ORDER BY m.created_at DESC LIMIT 10`, [req.params.id]),
  ]);
  res.json({
    user, currency: config.tokens.currency,
    daily: daily.rows, by_model: byModel.rows, farms: farms.rows, devices: devices.rows, recent_questions: recent.rows,
  });
});

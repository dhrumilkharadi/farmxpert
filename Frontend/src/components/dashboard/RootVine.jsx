'use client';

// ============================================================
// FILE: src/components/dashboard/RootVine.jsx
//
// The living ornament along the top of every dashboard page: one gnarled
// root that starts off the sidebar's top-left corner, runs across the top
// margin, crosses into the main dashboard and ends in a curled tip.
//
//   - the root is never a straight line: a wavy, tapering spine with
//     bulges, grooves, knots and moss, in dark bark
//   - a vine winds around it (passing behind and in front), with leaves
//     and small flowers
//   - the tail hangs in the gutter between sidebar and dashboard - grab it,
//     drag, and it follows the pointer; let go and it swings home. While it
//     is pulled the whole root is drawn toward the pull and the leaves
//     shiver, then everything springs back
//   - two short tendrils hang further along, swaying, to balance the width
//
// Layout: it sits in the top margin (above the logo and the page header),
// rebuilt from the sidebar's edge and the window width on resize. Drawn in
// one fixed SVG; only the tail takes pointer events; animated with rAF
// writing attributes directly, never React state.
// ============================================================

import { useEffect, useRef, useState } from 'react';

// ── geometry helpers ───────────────────────────────────────────────────────

function catmull(pts, samples = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < samples; s += 1) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const pathOf = (pts) => pts.reduce((d, [x, y], i) => `${d}${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`, '');

function smooth(pts) {
  if (pts.length < 3) return pathOf(pts);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d}L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
}

const leafPath = (s) => `M0 0 C ${s * 0.18} ${-s * 0.6}, ${s * 0.95} ${-s * 0.58}, ${s * 1.3} 0 C ${s * 0.98} ${s * 0.5}, ${s * 0.22} ${s * 0.56}, 0 0 Z`;

// ── the root, fitted to the page ───────────────────────────────────────────

const R0 = 10.5;         // radius where it enters (sidebar corner)
const R1 = 3;            // radius at the curled tip
const STEP = 3;          // the root is resampled every 3px of its length
const PITCH = 34;        // px of root per full turn of the wound vine: constant, so the wraps are even

/** Resample a polyline at equal arc-length steps: even spacing for everything built on it. */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    let d = step - carry;
    while (d <= seg) {
      const t = d / seg;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      d += step;
    }
    carry = seg - (d - step);
  }
  return out;
}

/**
 * sideRight: x of the sidebar's right edge; width: viewport width.
 * The root enters above the top-left corner, dips a little across the
 * sidebar, rises over the gutter (where the tail hangs), runs over the
 * dashboard's top margin and curls down at its end.
 */
function buildRoot(sideRight, width) {
  const endX = sideRight + (width - sideRight) * 0.64;
  const spine = resample(catmull([
    [-24, -2],
    [sideRight * 0.3, 9],
    [sideRight * 0.64, 5],
    [sideRight + 12, 11],                   // over the gutter: the tail hangs here
    [sideRight + (endX - sideRight) * 0.3, 7],
    [sideRight + (endX - sideRight) * 0.55, 13],
    [sideRight + (endX - sideRight) * 0.8, 8],
    [endX - 10, 14],
    [endX + 6, 26],                          // the tip curls down
    [endX - 2, 36],
  ], 24), STEP);
  const n = spine.length;
  const length = (n - 1) * STEP;
  const frames = spine.map((p, i) => {
    const a = spine[Math.max(0, i - 1)];
    const c = spine[Math.min(n - 1, i + 1)];
    const tx = c[0] - a[0];
    const ty = c[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    const t = i / (n - 1);
    // taper, with slow swellings like real root growth (by length, not by point count)
    const along = i * STEP;
    const r = (R0 + (R1 - R0) * t ** 0.8) * (1 + 0.13 * Math.sin(along / 37 + 1.1) + 0.06 * Math.sin(along / 11.5));
    return { p, nx: -ty / len, ny: tx / len, tx: tx / len, ty: ty / len, r, t, along };
  });
  const off = (f, k) => [f.p[0] + f.nx * f.r * k, f.p[1] + f.ny * f.r * k];
  const left = frames.map((f) => off(f, 1));
  const right = frames.map((f) => off(f, -1));
  const outline = `${smooth(left)}${smooth([...right].reverse()).replace(/^M/, 'L')}Z`;

  // light catches the upper edge; the underside sinks into shadow
  const rim = smooth(frames.filter((_, i) => i < n - 6).map((f) => off(f, -0.72)));
  const underside = smooth(frames.filter((_, i) => i < n - 6).map((f) => off(f, 0.7)));

  // fissures: broken lines along the grain, each with its own depth and length
  const fissures = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 0; k < Math.floor(length / 26); k += 1) {
    const start = Math.floor(rnd() * (n - 20));
    const span = 6 + Math.floor(rnd() * 14);
    const lane = -0.55 + rnd() * 1.1;
    const pts = [];
    for (let i = start; i < Math.min(n - 4, start + span); i += 1) {
      const f = frames[i];
      pts.push(off(f, lane + Math.sin(i * 0.4 + k) * 0.06));
    }
    if (pts.length > 3) fissures.push({ d: smooth(pts), w: 0.5 + rnd() * 0.7 });
  }
  const lenticels = Array.from({ length: Math.floor(length / 42) }, () => {
    const f = frames[Math.floor(rnd() * (n - 10))];
    const [x, y] = off(f, -0.4 + rnd() * 0.8);
    return { x, y, rx: 0.9 + rnd() * 1.1, ry: 0.4 + rnd() * 0.3, a: (Math.atan2(f.ty, f.tx) * 180) / Math.PI };
  });
  const knots = [0.17, 0.4, 0.63].map((t) => frames[Math.floor(t * (n - 1))]);

  const { front, back } = windVine(frames, null);

  // leaves at an even rhythm along the vine, alternating up and down; a flower every fifth
  const leaves = [];
  const flowers = [];
  const every = PITCH * 1.5;
  for (let k = 1; k * every < length - 30; k += 1) {
    const f = frames[Math.round((k * every) / STEP)];
    const down = k % 2 === 1;
    const edge = off(f, down ? 1 : -1);
    const base = (Math.atan2(f.ty, f.tx) * 180) / Math.PI;
    if (k % 5 === 3) flowers.push({ x: edge[0], y: edge[1], s: 4.2, rot: k * 31 });
    else leaves.push({ x: edge[0], y: edge[1], along: f.along, angle: base + (down ? 58 + (k % 3) * 9 : -62 - (k % 3) * 8), s: down ? 10.5 : 8.5 });
  }

  // hang points: the draggable tail inside the sidebar, by its right edge, two short tendrils further on
  const at = (x) => frames.reduce((best, f) => (Math.abs(f.p[0] - x) < Math.abs(best.p[0] - x) ? f : best), frames[0]);
  const hang = (f) => off(f, 0.85);
  return {
    frames, outline, rim, underside, fissures, lenticels, knots, front, back, leaves, flowers,
    tailAt: hang(at(sideRight - 14)),
    tailAlong: at(sideRight - 14).along,
    tendrils: [
      { at: hang(at(sideRight + (endX - sideRight) * 0.42)), along: at(sideRight + (endX - sideRight) * 0.42).along, len: 58 },
      { at: hang(at(sideRight + (endX - sideRight) * 0.78)), along: at(sideRight + (endX - sideRight) * 0.78).along, len: 38 },
    ],
  };
}

/**
 * The wound vine around the root, as front and back path strings.
 * The coils never move along the root. pull: { along, dx, dy, cinch } -
 * the coils cinch into the bark near the pull (fading with distance), and
 * the wrap at the hang point is drawn out toward the hand.
 */
function windVine(frames, pull) {
  const n = frames.length;
  const front = [];
  const back = [];
  let run = [];
  let side = null;
  for (let i = 0; i < n - 4; i += 1) {
    const f = frames[i];
    // the coils never slide along the root: each wrap stays where it grew
    const ang = (f.along / PITCH) * Math.PI * 2;
    const inFront = Math.cos(ang) > 0;
    const k = Math.sin(ang);
    // pulled, the coils cinch into the bark (tighter near the pull)...
    const w = pull ? Math.exp(-(((f.along - pull.along) / 110) ** 2)) : 0;
    const reach = f.r + 0.9 - (pull ? pull.cinch * w * 1.6 : 0);
    let x = f.p[0] + f.nx * reach * k;
    let y = f.p[1] + f.ny * reach * k;
    if (pull) {
      // ...and the wrap right at the hang point is drawn out toward the hand
      const near = Math.exp(-(((f.along - pull.along) / 45) ** 2));
      const lift = inFront ? 1 : 0.35;
      x += pull.dx * near * lift;
      y += pull.dy * near * lift;
    }
    if (side === null) side = inFront;
    if (inFront !== side) { (side ? front : back).push(run); run = [run[run.length - 1]]; side = inFront; }
    run.push([x, y]);
  }
  (side ? front : back).push(run);
  return { front, back };
}

// ── leaves shaken loose ────────────────────────────────────────────────────
// Each falling leaf is an SVG node made once and moved by the animation loop:
// it tips off its stem, then flutters down - swaying side to side, turning
// over as it goes - and fades out.

const SVGNS = 'http://www.w3.org/2000/svg';

function spawnLeaf(layer, src, ox, oy, now) {
  const g = document.createElementNS(SVGNS, 'g');
  const blade = document.createElementNS(SVGNS, 'path');
  blade.setAttribute('d', leafPath(src.s * (0.85 + Math.random() * 0.25)));
  blade.setAttribute('fill', Math.random() > 0.4 ? 'url(#rvLeafLit)' : 'url(#rvLeafShade)');
  const rib = document.createElementNS(SVGNS, 'path');
  rib.setAttribute('d', `M0 0 Q ${src.s * 0.66} 0, ${src.s * 1.2} 0`);
  rib.setAttribute('class', 'fx-rv-midrib');
  g.append(blade, rib);
  g.setAttribute('class', 'fx-rv-falling');
  layer.appendChild(g);
  return {
    g, born: now, x: src.x + ox, y: src.y + oy, rot: src.angle,
    vx: (Math.random() - 0.5) * 0.6, vy: -0.4 - Math.random() * 0.4,   // a little hop as it snaps off
    spin: (Math.random() - 0.5) * 4, sway: 0.8 + Math.random() * 0.9, phase: Math.random() * 6,
    life: 3200 + Math.random() * 1400, flip: 1,
  };
}

function stepLeaf(leaf, now, dt) {
  const age = now - leaf.born;
  if (age > leaf.life) { leaf.g.remove(); return false; }
  // air: gentle gravity, drag, and a side-to-side flutter that tilts the leaf
  leaf.vy = Math.min(1.1, leaf.vy + 0.035 * dt);
  leaf.vx *= 0.985;
  const flutter = Math.sin(age / 260 + leaf.phase) * leaf.sway;
  leaf.x += (leaf.vx + flutter * 0.55) * dt;
  leaf.y += leaf.vy * dt;
  leaf.rot += (leaf.spin + flutter * 2.2) * dt;
  leaf.flip = Math.cos(age / 340 + leaf.phase);                 // turning over as it falls
  const fade = age > leaf.life - 900 ? (leaf.life - age) / 900 : 1;
  leaf.g.setAttribute('transform', `translate(${leaf.x.toFixed(1)} ${leaf.y.toFixed(1)}) rotate(${leaf.rot.toFixed(1)}) scale(1 ${leaf.flip.toFixed(2)})`);
  leaf.g.style.opacity = String(Math.max(0, fade));
  return true;
}

const pathAll = (runs) => runs.filter((r) => r.length > 1).map((r) => smooth(r)).join('');

// ── pieces ─────────────────────────────────────────────────────────────────

function Flower({ s, tone = 'a' }) {
  const petal = `M0 0 C ${s * 0.55} ${-s * 0.35}, ${s * 0.95} ${-s * 0.1}, ${s} 0 C ${s * 0.95} ${s * 0.1}, ${s * 0.55} ${s * 0.35}, 0 0 Z`;
  return (
    <g>
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} d={petal} transform={`rotate(${r})`} className={tone === 'a' ? 'fx-rv-petal' : 'fx-rv-petal-b'} />
      ))}
      <circle r={s * 0.28} className="fx-rv-pistil" />
    </g>
  );
}

function Leaf({ s, shade }) {
  return (
    <>
      <path d={leafPath(s)} fill={shade ? 'url(#rvLeafShade)' : 'url(#rvLeafLit)'} />
      <path d={`M0 0 Q ${s * 0.66} ${-s * 0.06}, ${s * 1.25} 0`} className="fx-rv-midrib" />
    </>
  );
}

// ── the tail rope ──────────────────────────────────────────────────────────

const SEG_LEN = 10;

/**
 * Every hanging vine is a rope you can pull: the long tail over the gutter
 * and the two tendrils further along. Each lists where its leaves sit (rope
 * point indices) and the flower at its tip.
 */
function ropesOf(geo) {
  return [
    { at: geo.tailAt, along: geo.tailAlong, seg: 16, leaves: [3, 6, 9, 12], flower: 5.2, tone: 'a' },
    { at: geo.tendrils[0].at, along: geo.tendrils[0].along, seg: 6, leaves: [2, 4], flower: 3.8, tone: 'b' },
    { at: geo.tendrils[1].at, along: geo.tendrils[1].along, seg: 4, leaves: [2], flower: 3.4, tone: 'b' },
  ];
}

export default function RootVine() {
  const rootG = useRef(null);
  const tails = useRef([]);         // per rope: visible stem
  const hits = useRef([]);          // per rope: wide invisible stroke you grab
  const ropeLeaves = useRef([]);    // per rope: [leaf <g>...]
  const tips = useRef([]);          // per rope: tendril curl + flower
  const vineBack = useRef(null);
  const vineShadow = useRef(null);
  const vineFront = useRef(null);
  const vineLit = useRef(null);
  const fallLayer = useRef(null);
  const [geo, setGeo] = useState(null);
  const [grain, setGrain] = useState(null);

  // bark fibres, drawn once on a canvas and used as a repeating texture
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 80;
      const x = c.getContext('2d');
      let seed = 3;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 260; i += 1) {
        const y = rnd() * 80;
        const x0 = rnd() * 320;
        const len = 18 + rnd() * 90;
        const dark = rnd() > 0.35;
        x.strokeStyle = dark ? `rgba(8,6,4,${0.18 + rnd() * 0.3})` : `rgba(210,190,160,${0.05 + rnd() * 0.1})`;
        x.lineWidth = 0.6 + rnd() * 1.4;
        x.beginPath();
        x.moveTo(x0, y);
        x.bezierCurveTo(x0 + len * 0.3, y + (rnd() - 0.5) * 3, x0 + len * 0.7, y + (rnd() - 0.5) * 3, x0 + len, y + (rnd() - 0.5) * 2);
        x.stroke();
        if (x0 + len > 320) {           // wrap, so the pattern tiles seamlessly
          x.beginPath(); x.moveTo(x0 - 320, y); x.lineTo(x0 + len - 320, y); x.stroke();
        }
      }
      setGrain(c.toDataURL('image/png'));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // fit to the layout: the sidebar's edge and the window width
  useEffect(() => {
    const fit = () => {
      const aside = document.querySelector('aside.fx-sidebar');
      const r = aside?.getBoundingClientRect();
      setGeo(r && r.width ? buildRoot(r.right, window.innerWidth) : null);
    };
    const first = requestAnimationFrame(fit);         // after the sidebar has laid out
    window.addEventListener('resize', fit);
    return () => { cancelAnimationFrame(first); window.removeEventListener('resize', fit); };
  }, []);

  useEffect(() => {
    if (!geo) return undefined;
    let raf = 0;
    const ropes = ropesOf(geo).map((r) => {
      const [ax, ay] = r.at;
      const rest = Array.from({ length: r.seg + 1 }, (_, i) => [ax + Math.sin(i / 3) * 3 + i * 0.5, ay + i * SEG_LEN]);
      return { ...r, ax, ay, rest, pts: rest.map((p) => [...p]), old: rest.map((p) => [...p]) };
    });
    const state = { drag: null, nx: 0, ny: 0, vx: 0, vy: 0, px: 0, py: 0, pvx: 0, pvy: 0, cinch: 0, cv: 0, sheen: 0, wound: true, falling: [], lastFall: 0, along: ropes[0].along };

    const nearest = (rope, x, y) => {
      let best = rope.seg;
      let bd = Infinity;
      rope.pts.forEach(([px, py], i) => {
        if (i < Math.min(3, rope.seg - 1)) return;          // the stem end stays on the root
        const dd = (px - x) ** 2 + (py - y) ** 2;
        if (dd < bd) { bd = dd; best = i; }
      });
      return best;
    };
    const downs = ropes.map((rope, r) => (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      state.drag = { r, i: nearest(rope, e.clientX, e.clientY), x: e.clientX, y: e.clientY };
      state.along = rope.along;
      document.body.classList.add('fx-rv-grabbing');
    });
    const move = (e) => { if (state.drag) { state.drag.x = e.clientX; state.drag.y = e.clientY; } };
    const up = () => { state.drag = null; document.body.classList.remove('fx-rv-grabbing'); };
    const hitEls = ropes.map((_, r) => hits.current[r]);
    hitEls.forEach((el, r) => el?.addEventListener('pointerdown', downs[r]));
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tPrev = performance.now();

    const tick = (now) => {
      const dt = Math.min(32, now - tPrev) / 16.67;
      tPrev = now;

      // how far the pulled rope's tip is from where it hangs at rest
      const held = state.drag ? ropes[state.drag.r] : null;
      const dragX = held ? held.pts[held.seg][0] - held.rest[held.seg][0] : 0;
      const dragY = held ? held.pts[held.seg][1] - held.rest[held.seg][1] : 0;

      // the root is drawn toward the pull (a nudge, springing home), plus a breath of wind
      const wantX = held ? Math.max(-14, Math.min(14, dragX * 0.05)) : 0;
      const wantY = held ? Math.max(-4, Math.min(9, dragY * 0.04)) : 0;
      state.vx += ((wantX - state.nx) * 0.09 - state.vx * 0.2) * dt;
      state.vy += ((wantY - state.ny) * 0.09 - state.vy * 0.2) * dt;
      state.nx += state.vx * dt;
      state.ny += state.vy * dt;
      const breathe = reduce ? 0 : Math.sin(now / 2100) * 0.8;
      // the component can unmount between frames (route change / HMR)
      if (!rootG.current) return;
      rootG.current.setAttribute('transform', `translate(${state.nx.toFixed(2)} ${(state.ny + breathe).toFixed(2)})`);
      rootG.current.classList.toggle('is-pulled', Boolean(held));

      // the wound vine answers the pull as a real one would: the coils stay
      // put but cinch into the bark, the wrap at the hang point is drawn out,
      // a sheen runs along the taut stems, and leaves shake loose and fall
      const strength = held ? Math.min(1, Math.hypot(dragX, dragY) / 160) : 0;
      const wantPx = Math.max(-6, Math.min(6, dragX * 0.028));
      const wantPy = Math.max(-2, Math.min(7, dragY * 0.028));
      state.pvx += ((wantPx - state.px) * 0.1 - state.pvx * 0.2) * dt;
      state.pvy += ((wantPy - state.py) * 0.1 - state.pvy * 0.2) * dt;
      state.cv += ((strength - state.cinch) * 0.12 - state.cv * 0.22) * dt;
      state.px += state.pvx * dt;
      state.py += state.pvy * dt;
      state.cinch += state.cv * dt;
      const settled = !held
        && Math.abs(state.px) + Math.abs(state.py) + Math.abs(state.pvx) + Math.abs(state.pvy)
          + Math.abs(state.cinch) + Math.abs(state.cv) < 0.003;
      if (settled && !state.wound) { state.px = 0; state.py = 0; state.pvx = 0; state.pvy = 0; state.cinch = 0; state.cv = 0; }
      if (!settled || !state.wound) {
        const pull = settled ? null : { along: state.along, dx: state.px, dy: state.py, cinch: state.cinch };
        const { front, back } = windVine(geo.frames, pull);
        const f = pathAll(front);
        vineFront.current.setAttribute('d', f);
        vineShadow.current.setAttribute('d', f);
        vineLit.current.setAttribute('d', f);
        vineBack.current.setAttribute('d', pathAll(back));
        state.wound = settled;                     // one exact redraw at rest, then idle
      }
      state.sheen += (held ? 0.6 + strength * 2.2 : 0) * dt;
      const lit = vineLit.current;
      if (state.cinch > 0.02 || held) {
        lit.style.strokeDasharray = '3 11';
        lit.style.strokeDashoffset = String(-state.sheen);
        lit.style.opacity = String(0.55 + Math.min(0.45, state.cinch));
      } else if (lit.style.strokeDasharray) {
        lit.style.strokeDasharray = ''; lit.style.strokeDashoffset = ''; lit.style.opacity = '';
      }

      // leaves shaken loose near the pulled rope: more, and from further along, the harder you pull
      if (held && strength > 0.15 && now - state.lastFall > 700 - strength * 480 && state.falling.length < 14) {
        state.lastFall = now;
        const candidates = geo.leaves.filter((l) => Math.abs(l.along - state.along) < 90 + strength * 260);
        const src = candidates[Math.floor(Math.random() * candidates.length)];
        if (src) state.falling.push(spawnLeaf(fallLayer.current, src, state.nx, state.ny, now));
      }
      state.falling = state.falling.filter((leaf) => stepLeaf(leaf, now, dt));

      // every rope: Verlet step, hanging from the (nudged) root
      ropes.forEach((rope, r) => {
        const { pts, old, rest, seg, ax, ay } = rope;
        const pulled = state.drag?.r === r;
        const ex = ax + state.nx;
        const ey = ay + state.ny + breathe;
        for (let i = 1; i <= seg; i += 1) {
          const p = pts[i];
          const o = old[i];
          const vx = (p[0] - o[0]) * 0.965;
          const vy = (p[1] - o[1]) * 0.965;
          o[0] = p[0]; o[1] = p[1];
          // the ropes nobody holds still feel the root move, and keep their gentle sway
          const home = pulled ? 0 : 0.012 + (i / seg) * 0.02;
          const restX = rest[i][0] + (ex - ax) + (reduce ? 0 : Math.sin(now / 1400 + i * 0.45 + r * 1.7) * i * 0.12);
          const restY = rest[i][1] + (ey - ay);
          p[0] += vx + (restX - p[0]) * home * dt;
          p[1] += vy + 0.22 * dt + (restY - p[1]) * home * dt;
        }
        pts[0][0] = ex; pts[0][1] = ey;
        if (pulled) {
          const d = state.drag;
          const p = pts[d.i];
          p[0] += (d.x - p[0]) * 0.55;
          p[1] += (d.y - p[1]) * 0.55;
        }
        for (let k = 0; k < 8; k += 1) {
          for (let i = 0; i < seg; i += 1) {
            const a = pts[i];
            const b = pts[i + 1];
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const dist = Math.hypot(dx, dy) || 0.001;
            const max = SEG_LEN * (pulled ? 1.35 : 1.05);
            if (dist <= max && dist >= SEG_LEN * 0.9) continue;
            const want = Math.min(max, Math.max(SEG_LEN * 0.9, dist));
            const diff = (dist - want) / dist;
            const fixedA = i === 0;
            const fixedB = pulled && i + 1 === state.drag.i;
            const wa = fixedA ? 0 : fixedB ? 1 : 0.5;
            const wb = fixedB ? 0 : fixedA ? 1 : 0.5;
            a[0] += dx * diff * wa; a[1] += dy * diff * wa;
            b[0] -= dx * diff * wb; b[1] -= dy * diff * wb;
          }
          pts[0][0] = ex; pts[0][1] = ey;
        }

        const d = smooth(pts);
        tails.current[r]?.setAttribute('d', d);
        hits.current[r]?.setAttribute('d', d);
        rope.leaves.forEach((i, k) => {
          const el = ropeLeaves.current[r]?.[k];
          if (!el) return;
          const a = pts[i - 1];
          const b = pts[Math.min(seg, i + 1)];
          const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
          const side = k % 2 === 0 ? -1 : 1;
          const shiver = held ? Math.sin(now / 45 + k + r) * (pulled ? 6 : 2.5) : 0;
          el.setAttribute('transform', `translate(${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}) rotate(${(ang + side * 58 + shiver).toFixed(1)})`);
        });
        const t = pts[seg];
        tips.current[r]?.setAttribute('transform', `translate(${t[0].toFixed(1)} ${t[1].toFixed(1)})`);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      hitEls.forEach((el, r) => el?.removeEventListener('pointerdown', downs[r]));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.classList.remove('fx-rv-grabbing');
      state.falling.forEach((leaf) => leaf.g.remove());
    };
  }, [geo]);

  if (!geo) return null;
  return (
    <svg className="fx-rootvine pointer-events-none fixed inset-0 z-40 hidden h-dvh w-screen lg:block" aria-hidden>
      <defs>
        <linearGradient id="rvBark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="fx-rv-bark-a" />
          <stop offset="0.45" className="fx-rv-bark-b" />
          <stop offset="1" className="fx-rv-bark-c" />
        </linearGradient>
        <clipPath id="rvClip"><path d={geo.outline} /></clipPath>
        {grain && (
          <pattern id="rvGrain" patternUnits="userSpaceOnUse" width="160" height="40">
            <image href={grain} width="160" height="40" preserveAspectRatio="none" />
          </pattern>
        )}
        <linearGradient id="rvLeafLit" x1="0" y1="1" x2="0.6" y2="0">
          <stop offset="0" stopColor="#2f7a3e" /><stop offset="0.6" stopColor="#4f9a57" /><stop offset="1" stopColor="#8cc28a" />
        </linearGradient>
        <linearGradient id="rvLeafShade" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#1f6a3a" /><stop offset="1" stopColor="#0b3a22" />
        </linearGradient>
      </defs>

      <g ref={rootG}>
        <path ref={vineBack} d={pathAll(geo.back)} className="fx-rv-vine-back" />
        <path d={geo.outline} fill="url(#rvBark)" className="fx-rv-root" />
        {/* bark grain: fibres along the root, clipped to its outline */}
        <g clipPath="url(#rvClip)">
          <rect x="-40" y="-20" width="4000" height="90" fill="url(#rvGrain)" className="fx-rv-grain" />
          <path d={geo.underside} className="fx-rv-underside" />
          {geo.fissures.map((f, i) => <path key={`fs${i}`} d={f.d} className="fx-rv-fissure" style={{ strokeWidth: f.w }} />)}
          {geo.lenticels.map((l, i) => (
            <ellipse key={`le${i}`} cx={l.x} cy={l.y} rx={l.rx} ry={l.ry} transform={`rotate(${l.a} ${l.x} ${l.y})`} className="fx-rv-lenticel" />
          ))}
          <path d={geo.rim} className="fx-rv-rim" />
        </g>
        {geo.knots.map((k, i) => (
          <g key={`k${i}`}>
            <ellipse cx={k.p[0]} cy={k.p[1] + k.ny * k.r * 0.1} rx={k.r * 0.5} ry={k.r * 0.3} className="fx-rv-knot" />
            <ellipse cx={k.p[0] - 0.6} cy={k.p[1] + k.ny * k.r * 0.1 - 0.6} rx={k.r * 0.22} ry={k.r * 0.12} className="fx-rv-knot-core" />
          </g>
        ))}
        {geo.knots.map((k, i) => (
          <ellipse key={`m${i}`} cx={k.p[0] + 12 - i * 8} cy={k.p[1] - k.r * 0.55} rx={4.5 - i * 0.8} ry={1.9} className="fx-rv-moss" />
        ))}
        {/* each front crossing: a soft contact shadow on the bark, the stem, then its lit edge */}
        <path ref={vineShadow} d={pathAll(geo.front)} className="fx-rv-vine-shadow" />
        <path ref={vineFront} d={pathAll(geo.front)} className="fx-rv-vine" />
        <path ref={vineLit} d={pathAll(geo.front)} className="fx-rv-vine-lit" />
        {geo.leaves.map((l, i) => (
          <g key={`l${i}`} transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.angle.toFixed(1)})`}>
            <g className="fx-rv-leaf" style={{ animationDelay: `${-i * 0.7}s` }}><Leaf s={l.s} shade={i % 3 === 1} /></g>
          </g>
        ))}
        {geo.flowers.map((f, i) => (
          <g key={`fl${i}`} transform={`translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.rot})`}>
            <Flower s={f.s} tone={i % 2 ? 'b' : 'a'} />
          </g>
        ))}
      </g>

      {ropesOf(geo).map((rope, r) => (
        <g key={r}>
          <path ref={(el) => { tails.current[r] = el; }} className="fx-rv-tail" />
          {rope.leaves.map((_, k) => (
            <g key={k} ref={(el) => { (ropeLeaves.current[r] ||= [])[k] = el; }}>
              <Leaf s={(r === 0 ? 9 : 7.5) - k * (r === 0 ? 1 : 0.8)} shade={k % 2 === 1} />
            </g>
          ))}
          <g ref={(el) => { tips.current[r] = el; }}>
            <path d="M0 0 c -5 3, -6 10, 0 12 c 5 1.5, 6 -4, 2 -5 c -2.5 -0.5, -3.5 1.6, -1.5 2.6"
              className="fx-rv-tendril" transform={r === 0 ? undefined : 'scale(0.75)'} />
            <g transform="translate(0 2)"><Flower s={rope.flower} tone={rope.tone} /></g>
          </g>
        </g>
      ))}
      <g ref={fallLayer} />
      {ropesOf(geo).map((_, r) => (
        <path key={`h${r}`} ref={(el) => { hits.current[r] = el; }} className="fx-rv-hit pointer-events-auto" />
      ))}
    </svg>
  );
}

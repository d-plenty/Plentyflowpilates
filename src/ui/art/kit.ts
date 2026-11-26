// The drawing kit for the opening and home-screen pictures: SVG made from code, so it stays sharp at
// every size. Everything here returns SVG markup as a string. The shared animations are classes in
// app.css (the "Theme pictures" part); one-off ones (a hop, a glide) are collected while a picture is
// drawn and travel with it inside its own <style>.

export const W = 390;
/** One opening: the jump runs 0.4 s to 3.2 s. In a preview it all repeats every L seconds. */
export const L = 6.5;
export const QOUT = 'cubic-bezier(.33,.67,.67,1)';
export const QIN = 'cubic-bezier(.33,0,.67,.33)';

/** A number for SVG: two decimals at most, no trailing zeros. */
export const n = (x: number): string => {
  const s = x.toFixed(2).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};
const range = (k: number) => Array.from({ length: k }, (_, i) => i);
export { range };

// ---- one picture at a time: unique ids, and the keyframes it needs
let idCount = 0;
let keys: string[] = [];
export const uid = (p: string) => `pf${p}${++idCount}`;
export function collect<T>(draw: () => T): { out: T; css: string } {
  const before = keys;
  keys = [];
  const out = draw();
  const css = keys.join('');
  keys = before;
  return { out, css };
}

/** A timeline over one L-second loop: [seconds, transform, easing to the next]. */
export function timeline(name: string, ks: [number, string, string][]): string {
  const out: string[] = [];
  if (ks[0][0] > 0) out.push(`0%{transform:${ks[0][1]}}`);
  for (const [t, tr, ez] of ks) out.push(`${((t / L) * 100).toFixed(3)}%{transform:${tr};animation-timing-function:${ez}}`);
  out.push(`100%{transform:${ks[ks.length - 1][1]}}`);
  keys.push(`@keyframes ${name}{${out.join('')}}`);
  return `animation:${name} ${L}s linear infinite`;
}
/** A loop of its own length P: [fraction 0–1, transform, easing]. */
export function cycle(name: string, ks: [number, string, string][], P: number, delay = 0): string {
  keys.push(`@keyframes ${name}{${ks.map(([f, tr, ez]) => `${(f * 100).toFixed(2)}%{transform:${tr};animation-timing-function:${ez}}`).join('')}}`);
  return `animation:${name} ${P}s linear infinite;animation-delay:${delay}s`;
}
export const delay = (s: number) => ` style="animation-delay:${n(s)}s"`;

// ---- shapes
export function star(cx: number, cy: number, R: number, points: number, ratio: number, fill = '#fff'): string {
  const pts = range(points * 2).map((i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? R : R * ratio;
    return `${n(cx + r * Math.cos(a))},${n(cy + r * Math.sin(a))}`;
  });
  return `<polygon points="${pts.join(' ')}" fill="${fill}"></polygon>`;
}
export const shadow = (x: number, y: number, rx: number) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx / 9}" fill="#000" opacity=".13"></ellipse>`;

export function sky(stops: [number, string][], hz: number): string {
  const id = uid('sky');
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"></stop>`).join('')}</linearGradient></defs><rect width="${W}" height="${hz + 4}" fill="url(#${id})"></rect>`;
}
/** Dusk over the sea on Australia Day night. */
export const DUSK: [number, string][] = [[0, '#071A3D'], [0.45, '#16346E'], [0.78, '#C9654A'], [1, '#F6B25A']];

export type Star = [number, number, number];
export const STARS: Star[] = [[30, 60, 1.2], [80, 110, 1], [150, 40, 1.3], [220, 90, 0.9], [360, 150, 1.1], [120, 170, 0.8], [300, 30, 1], [20, 200, 0.9], [250, 180, 0.8], [60, 260, 0.8], [340, 280, 0.9], [190, 250, 0.7], [110, 320, 0.7], [370, 60, 1], [170, 130, 0.8], [40, 380, 0.7], [330, 400, 0.8], [210, 30, 0.9]];
/** The stars squeezed into the top of a home-screen panel. */
export const squash = (pts: Star[], k: number, dy = 0): Star[] => pts.map(([x, y, r]) => [x, dy + y * k, r]);
export const stars = (pts: Star[] = STARS, c = '#fff') => pts.map(([x, y, r], i) => `<circle class="tw" cx="${x}" cy="${y}" r="${r}" fill="${c}"${delay(-(i * 0.53) % 3)}></circle>`).join('');

export function sea(hz: number, col: string, wave: string, glint?: string, gx: [number, number] = [150, 350]): string {
  const wv = range(12).map(() => 't40 0').join(' ');
  const g = glint ? `<path d="M${gx[0]} ${hz + 5} h${gx[1] - gx[0]}" stroke="${glint}" stroke-width="2.4" opacity=".65"></path><path d="M${gx[0] + 30} ${hz + 14} h${gx[1] - gx[0] - 60}" stroke="${glint}" stroke-width="1.8" opacity=".5"></path><path d="M${gx[0] + 60} ${hz + 24} h${gx[1] - gx[0] - 120}" stroke="${glint}" stroke-width="1.4" opacity=".4"></path>` : '';
  return `<rect x="0" y="${hz}" width="${W}" height="48" fill="${col}"></rect>${g}`
    + `<g class="wave"><path d="M0 ${hz + 16} q20 -5 40 0 ${wv}" stroke="${wave}" stroke-width="1.4" fill="none" opacity=".7"></path></g>`
    + `<g class="wave" style="animation-duration:7s"><path d="M-20 ${hz + 32} q20 -4 40 0 ${wv}" stroke="${wave}" stroke-width="1.2" fill="none" opacity=".5"></path></g>`;
}
export const sand = (hz: number, a: string, b: string, H: number) => `<path d="M0 ${hz + 40} Q120 ${hz + 30} 230 ${hz + 42} T${W} ${hz + 36} V${H} H0Z" fill="${a}"></path><path d="M0 ${hz + 96} Q160 ${hz + 86} ${W} ${hz + 102} V${H} H0Z" fill="${b}"></path>`;
export function hills(hz: number, a: string, b: string, c: string | null, H: number): string {
  let s = `<path d="M0 ${hz} Q90 ${hz - 34} 190 ${hz - 6} T${W} ${hz - 18} V${H} H0Z" fill="${a}"></path><path d="M0 ${hz + 40} Q150 ${hz + 14} 260 ${hz + 38} T${W} ${hz + 30} V${H} H0Z" fill="${b}"></path>`;
  if (c) s += `<path d="M0 ${hz + 120} Q180 ${hz + 100} ${W} ${hz + 126} V${H} H0Z" fill="${c}"></path>`;
  return s;
}
export const cloud = (x: number, y: number, s: number, fill = '#fff', dl = 0) => `<g class="cloud"${delay(dl)}><g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><ellipse cx="0" cy="0" rx="30" ry="12"></ellipse><ellipse cx="-14" cy="-8" rx="14" ry="12"></ellipse><ellipse cx="10" cy="-12" rx="18" ry="16"></ellipse></g></g>`;

/** A glow with no hard edge. */
export function softglow(x: number, y: number, r: number, c: string, op = 0.5, cls = ''): string {
  const id = uid('g');
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${op}"></stop><stop offset=".55" stop-color="${c}" stop-opacity="${op * 0.35}"></stop><stop offset="1" stop-color="${c}" stop-opacity="0"></stop></radialGradient></defs>`
    + `<circle${cls ? ` class="${cls}"` : ''} cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#${id})"></circle>`;
}
export function sun(x: number, y: number, r: number, core: string, halo: string | null = null, rays: string | null = null, haze = 0.28): string {
  let s = halo ? softglow(x, y, r * 2.1, halo, haze) : '';
  if (rays) s += range(12).map((i) => { const a = (i * Math.PI) / 6; return `<line x1="${n(x + Math.cos(a) * r * 1.25)}" y1="${n(y + Math.sin(a) * r * 1.25)}" x2="${n(x + Math.cos(a) * r * 1.62)}" y2="${n(y + Math.sin(a) * r * 1.62)}" stroke="${rays}" stroke-width="${n(Math.max(2, r / 10))}" stroke-linecap="round"></line>`; }).join('');
  return s + `<circle cx="${x}" cy="${y}" r="${r}" fill="${core}"></circle>`;
}
export function moon(x: number, y: number, r: number, core = '#FBE29A', crater = '#EDC96A', halo = '#FFF4C8'): string {
  return softglow(x, y, r * 2, halo, 0.75, 'glow') + `<circle cx="${x}" cy="${y}" r="${r}" fill="${core}"></circle>`
    + `<circle cx="${n(x - r * 0.3)}" cy="${n(y - r * 0.28)}" r="${n(r * 0.13)}" fill="${crater}" opacity=".55"></circle><circle cx="${n(x + r * 0.34)}" cy="${n(y + r * 0.4)}" r="${n(r * 0.1)}" fill="${crater}" opacity=".55"></circle><circle cx="${n(x + r * 0.2)}" cy="${n(y - r * 0.4)}" r="${n(r * 0.07)}" fill="${crater}" opacity=".5"></circle>`;
}
export function bunting(cols: string[], y = 10, kind: 'tri' | 'round' = 'tri'): string {
  const flags = range(Math.ceil(W / 20)).map((i) => {
    const x = (kind === 'tri' ? 0 : 1) + i * 20; const c = cols[i % cols.length];
    return kind === 'tri' ? `<path d="M${x} ${y} l10 22 l10 -22 z" fill="${c}"></path>` : `<path d="M${x} ${y + 0.2 * ((x / 20) % 2)} l9 18 l9 -18 z" fill="${c}"></path>`;
  }).join('');
  return `<path d="M0 ${y} H390" stroke="#fff" stroke-width="1.4"></path>${flags}`;
}
function burst(x: number, y: number, r: number, c: string, rays = 14): string {
  const a = range(rays).map((i) => (i * 2 * Math.PI) / rays);
  return a.map((t) => `<line x1="${n(x + Math.cos(t) * r * 0.3)}" y1="${n(y + Math.sin(t) * r * 0.3)}" x2="${n(x + Math.cos(t) * r)}" y2="${n(y + Math.sin(t) * r)}" stroke="${c}" stroke-width="${n(Math.max(0.8, r / 16))}" stroke-linecap="round"></line>`).join('')
    + a.map((t) => `<circle cx="${n(x + Math.cos(t + 0.22) * r * 1.16)}" cy="${n(y + Math.sin(t + 0.22) * r * 1.16)}" r="${n(Math.max(0.7, r / 20))}" fill="${c}"></circle>`).join('');
}
export type Burst = [number, number, number, string, number];
export const fireworks = (spec: Burst[]) => spec.map(([x, y, r, c, rays], i) => `<g class="fw"${delay(-(i * 0.83) % 3.4)}>${burst(x, y, r, c, rays)}</g>`).join('');

// ---- gulls whose wings beat
function gull(x: number, y: number, s: number, col: string, anim: boolean, ph: number): string {
  const up = 'M-11 -5 Q-5.5 -9 0 0 Q5.5 -9 11 -5', dn = 'M-11 4 Q-5.5 -2 0 0 Q5.5 -2 11 4', mid = 'M-11 -2 Q-5.5 -7 0 0 Q5.5 -7 11 -2';
  const t = `dur=".62s" begin="-${ph}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.45;1" keySplines=".4 0 .6 1;.4 0 .6 1"`;
  const wings = anim ? `<animate attributeName="d" values="${up};${dn};${up}" ${t}></animate>` : '';
  const bob = anim ? `<animateTransform attributeName="transform" type="translate" values="0 1.6;0 -1.6;0 1.6" ${t}></animateTransform>` : '';
  return `<g transform="translate(${x} ${y}) scale(${s})"><g>${bob}<path d="${mid}" stroke="${col}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">${wings}</path><ellipse cx="0" cy=".6" rx="2.6" ry="1.4" fill="${col}"></ellipse></g></g>`;
}
export function flock(y: number, col: string, anim: boolean, dl = 0, stillX = 120, s = 1): string {
  const birds = gull(0, y, s, col, anim, 0) + gull(26 * s, y + 11 * s, 0.8 * s, col, anim, 0.2) + gull(-18 * s, y + 17 * s, 0.7 * s, col, anim, 0.41);
  return anim ? `<g class="gull"${delay(dl)}>${birds}</g>` : `<g transform="translate(${stillX} 0)">${birds}</g>`;
}

// ---- the reformer and the figure (shared with the round logo)
const L1 = 20, L2 = 20, REACH = L1 + L2 - 0.3;
export interface Pose { o: number; hx: number; hy: number; knee: [number, number]; foot: [number, number] }
/** Where the legs are when the carriage has moved `o` from the jump board. Each leg keeps its length. */
export function pose(o: number): Pose {
  const hx = 144 + o, hy = 40;
  const F: [number, number] = [173 + (28 * 6) / 34 - 4, 28];
  const dx = F[0] - hx, dy = F[1] - hy, d = Math.hypot(dx, dy);
  if (d < REACH) {
    const h = Math.sqrt(Math.max(0, L1 * L1 - (d / 2) * (d / 2)));
    return { o, hx, hy, knee: [hx + dx / 2 + (dy / d) * h, hy + dy / 2 - (dx / d) * h], foot: F };
  }
  const ux = dx / d, uy = dy / d;
  return { o, hx, hy, knee: [hx + (ux * REACH) / 2, hy + (uy * REACH) / 2], foot: [hx + ux * REACH, hy + uy * REACH] };
}
/** The carriage through one jump: knees bent at the start and end, legs long in the middle. */
const carriageAt = (t: number) => -4 - (30 * (1 - Math.cos(2 * Math.PI * t))) / 2;
const legs = (p: Pose) => `${n(p.hx)},${n(p.hy)} ${n(p.knee[0])},${n(p.knee[1])} ${n(p.foot[0])},${n(p.foot[1])}`;

/** The reformer with the figure on it. Moving: one jump between 0.4 s and 3.2 s, the legs bending as they go. */
export function jumper(fig: string, ball: string, head: (hx: number, hy: number) => string, x: number, y: number, s: number, anim: boolean): string {
  const o0 = -4;
  let a1 = '', a2 = '', a3 = '';
  if (anim) {
    const N = 40, t0 = 0.4, t1 = 3.2;
    const fr = range(N + 1).map((i) => i / N);
    const kt = `0;${fr.map((f) => ((t0 + f * (t1 - t0)) / L).toFixed(4)).join(';')};1`;
    const vals = (fn: (f: number) => string) => { const v = fr.map(fn); return [v[0], ...v, v[v.length - 1]].join(';'); };
    const a = `dur="${L}s" repeatCount="indefinite" calcMode="linear" keyTimes="${kt}"`;
    a1 = `<animate attributeName="x1" values="${vals((f) => n(162 + carriageAt(f)))}" ${a}></animate>`;
    a2 = `<animateTransform attributeName="transform" type="translate" values="${vals((f) => `${n(carriageAt(f) - o0)} 0`)}" ${a}></animateTransform>`;
    a3 = `<animate attributeName="points" values="${vals((f) => legs(pose(carriageAt(f))))}" ${a}></animate>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${s})"><g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none">
<line x1="30" y1="56" x2="186" y2="56" stroke-width="4"></line><line x1="36" y1="56" x2="36" y2="70" stroke-width="3"></line><line x1="180" y1="56" x2="180" y2="70" stroke-width="3"></line>
<g stroke-width="1.5" opacity=".85"><line x1="${n(162 + o0)}" y1="50" x2="171" y2="50">${a1}</line><line x1="${n(162 + o0)}" y1="53" x2="171" y2="53">${a1}</line></g>
<line x1="173" y1="56" x2="179" y2="22" stroke-width="6"></line>
<g>${a2}<rect x="${n(98 + o0)}" y="44" width="64" height="8" rx="3" fill="#fff" stroke="none"></rect><rect x="${n(112 + o0)}" y="34" width="5" height="10" rx="2" fill="#fff" stroke="none"></rect>
<circle cx="${n(106 + o0)}" cy="36" r="5" fill="${fig}" stroke="none"></circle><line x1="${n(112 + o0)}" y1="39" x2="${n(144 + o0)}" y2="40" stroke="${fig}" stroke-width="5"></line><g stroke="none">${head(106 + o0, 36)}</g></g>
<polyline points="${legs(pose(o0))}" stroke="${fig}" stroke-width="4">${a3}</polyline>
</g>${ball}</g>`;
}
export const noHat = () => '';
export const ball = (c: string, ring = '#fff') => `<circle cx="179.5" cy="19" r="3.6" fill="${c}" stroke="${ring}" stroke-width="1"></circle>`;

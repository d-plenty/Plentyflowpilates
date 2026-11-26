// The things in the pictures: hats, balls on the jump board, the flag, the kangaroos, Santa's sleigh,
// the Christmas tree, the Easter bunny, Halloween, the barbecue and the New Year beach party.
import { QIN, QOUT, cycle, delay, n, range, shadow, softglow, star, timeline, uid, W } from './kit';

// ---- on the figure's head, and on the jump board
export const santaHat = (hx: number, hy: number) => `<path d="M${n(hx - 5.2)} ${hy - 3} Q${n(hx - 1)} ${hy - 12} ${n(hx + 7)} ${n(hy - 9.5)} L${n(hx + 4.8)} ${n(hy - 2.6)} Z" fill="#D32F2F"></path><rect x="${n(hx - 5.6)}" y="${n(hy - 4.2)}" width="11" height="2.6" rx="1.3" fill="#fff"></rect><circle cx="${n(hx + 7.3)}" cy="${n(hy - 9.6)}" r="1.6" fill="#fff"></circle>`;
export const bunnyEars = (fig: string) => (hx: number, hy: number) => {
  const ear = (cx: number, cy: number, r: number) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="1.9" ry="6.2" transform="rotate(${r} ${n(cx)} ${n(cy)})" fill="${fig}"></ellipse><ellipse cx="${n(cx)}" cy="${n(cy)}" rx=".8" ry="4.4" transform="rotate(${r} ${n(cx)} ${n(cy)})" fill="#F6B8D0"></ellipse>`;
  return ear(hx - 2, hy - 10, -14) + ear(hx + 2.6, hy - 10.4, 12);
};
export const witchHat = (hx: number, hy: number) => `<ellipse cx="${n(hx)}" cy="${n(hy - 3.6)}" rx="8" ry="1.8" fill="#2A1640"></ellipse><path d="M${n(hx - 4.6)} ${n(hy - 4)} L${n(hx + 1)} ${n(hy - 16)} Q${n(hx + 3)} ${n(hy - 18)} ${n(hx + 6)} ${n(hy - 15)} Q${n(hx + 3)} ${n(hy - 14)} ${n(hx + 3)} ${n(hy - 10)} L${n(hx + 4.6)} ${n(hy - 4)} Z" fill="#2A1640"></path><rect x="${n(hx - 4.2)}" y="${n(hy - 6.4)}" width="8.6" height="1.8" fill="#F28C38"></rect>`;
export const partyHat = (hx: number, hy: number) => `<path d="M${n(hx - 4.4)} ${n(hy - 3.6)} L${n(hx + 1.5)} ${n(hy - 16)} L${n(hx + 4.6)} ${n(hy - 4)} Z" fill="#F28C38"></path><path d="M${n(hx - 2.4)} ${n(hy - 8)} L${n(hx + 3.6)} ${n(hy - 8.4)} M${n(hx - 0.6)} ${n(hy - 12)} L${n(hx + 2.6)} ${n(hy - 12.2)}" stroke="#FFD54F" stroke-width="1.3"></path><circle cx="${n(hx + 1.5)}" cy="${n(hy - 16.4)}" r="1.8" fill="#FFD54F"></circle>`;
export const BALL_BAUBLE = '<circle cx="179.5" cy="19" r="3.8" fill="#D32F2F" stroke="#fff" stroke-width="1"></circle><rect x="178.3" y="13.4" width="2.4" height="1.8" fill="#FFD54F"></rect><circle cx="178.3" cy="17.8" r=".9" fill="#fff" opacity=".7"></circle>';
export const BALL_EGG = '<ellipse cx="179.5" cy="19" rx="3.2" ry="4.1" fill="#F6B8D0" stroke="#fff" stroke-width="1"></ellipse><path d="M176.6 18.4 q1.45 -1.2 2.9 0 q1.45 1.2 2.9 0" stroke="#7FB8DE" stroke-width="1" fill="none"></path><circle cx="178.3" cy="21" r=".55" fill="#FFD54F"></circle><circle cx="180.7" cy="21" r=".55" fill="#FFD54F"></circle>';
export const BALL_JACK = '<circle cx="179.5" cy="19" r="4" fill="#F28C38" stroke="#fff" stroke-width=".8"></circle><path d="M179.5 15 q.6 -1.6 1.8 -2" stroke="#3E7D32" stroke-width="1" fill="none"></path><path d="M177.4 18 l1 -1 l.6 1.2z M180.6 18 l1 -1 l.6 1.2z M177.2 20.6 q2.3 1.8 4.6 0 l-.8 .1 l-.5 .7 l-.6 -.6 l-.6 .6 l-.6 -.6 l-.5 .5z" fill="#3A1C05"></path>';
export const BALL_GLITTER = '<circle cx="179.5" cy="19" r="4" fill="#FFD54F" stroke="#fff" stroke-width="1"></circle>' + star(179.5, 19, 3, 4, 0.35, '#fff');

// ---- the Australian flag: 240 x 120, the Southern Cross and Commonwealth Star placed to the official spec
function flag(id: string): string {
  const s = 240 / 10080;
  const cross = ([[7560, 4200], [6300, 2205], [7560, 840], [8680, 1869]] as const).map(([x, y]) => star(x * s, y * s, 360 * s, 7, 4 / 9)).join('') + star(8064 * s, 2730 * s, 210 * s, 5, 0.4);
  const fed = star(2520 * s, 3780 * s, 756 * s, 7, 4 / 9);
  const uj = `<g transform="scale(2)"><clipPath id="${id}t"><path d="M30 15 H60 V30 Z V30 H0 Z H0 V0 Z V0 H60 Z"></path></clipPath><rect width="60" height="30" fill="#012169"></rect><path d="M0 0 L60 30 M60 0 L0 30" stroke="#fff" stroke-width="6"></path><path d="M0 0 L60 30 M60 0 L0 30" clip-path="url(#${id}t)" stroke="#C8102E" stroke-width="4"></path><path d="M30 0 V30 M0 15 H60" stroke="#fff" stroke-width="10"></path><path d="M30 0 V30 M0 15 H60" stroke="#C8102E" stroke-width="6"></path></g>`;
  return `<rect width="240" height="120" fill="#012169"></rect><svg x="0" y="0" width="120" height="60" viewBox="0 0 120 60" overflow="hidden">${uj}</svg>${fed}${cross}`;
}
/**
 * The flag flying: held at both corners of the hoist, so the edge by the pole never moves. Cut into
 * strips that ride two waves running out from the pole, with light and shade on the folds and a sag
 * at the fly end.
 */
function flyingFlag(x: number, y: number, w: number, anim: boolean, strips = 44, P = 1.5): string {
  const u = uid('flag'), h = w / 2, sw = w / strips, sc = w / 240, amp = w * 0.06, P2 = 0.95;
  const defs = `<defs><g id="${u}"><g transform="scale(${n(sc)})">${flag(u)}</g></g>${range(strips).map((i) => `<clipPath id="${u}c${i}"><rect x="${n(i * sw - 0.3)}" y="-2" width="${n(sw + 0.6)}" height="${n(h + 4)}"></rect></clipPath>`).join('')}</defs>`;
  let body = '';
  for (const i of range(strips)) {
    const f = i / (strips - 1), a = amp * f ** 1.2, a2 = a * 0.33;
    const ph1 = (i / strips) * 1.15, ph2 = (i / strips) * 2.3, sag = w * 0.035 * f * f, sy = 1 - 0.09 * f;
    const strip = `<g clip-path="url(#${u}c${i})"><use href="#${u}"></use></g>`;
    const box = `x="${n(i * sw - 0.2)}" y="0" width="${n(sw + 0.4)}" height="${n(h)}"`;
    if (anim) {
      const d1 = -(P * 4 - ph1 * P), d2 = -(P2 * 4 - ph2 * P2);
      body += `<g transform="translate(0 ${n(sag)})"><g class="wv" style="--a:${n(a)}px;animation-duration:${P}s;animation-delay:${n(d1)}s"><g class="wv" style="--a:${n(a2)}px;animation-duration:${P2}s;animation-delay:${n(d2)}s">`
        + `<g transform="translate(0 ${n(h / 2)})"><g class="wsy" style="--s:${n(sy)};animation-delay:${n(d1 - P / 4)}s"><g transform="translate(0 ${n(-h / 2)})">${strip}`
        + `<rect class="sh" ${box} fill="#000" style="animation-duration:${P}s;animation-delay:${n(d1 - P / 4)}s"></rect><rect class="hl" ${box} fill="#fff" style="animation-duration:${P}s;animation-delay:${n(d1 + P / 4)}s"></rect></g></g></g></g></g></g>`;
    } else {
      const sn = Math.sin(2 * Math.PI * ph1);
      const yo = sag - a * Math.cos(2 * Math.PI * ph1) - a2 * Math.cos(2 * Math.PI * ph2);
      body += `<g transform="translate(0 ${n(yo)})">${strip}<rect ${box} fill="#000" opacity="${n(0.2 * Math.max(0, sn))}"></rect><rect ${box} fill="#fff" opacity="${n(0.16 * Math.max(0, -sn))}"></rect></g>`;
    }
  }
  return `<g transform="translate(${n(x)} ${n(y)})">${defs}<g class="fsw">${body}</g></g>`;
}
export function flagOnPole(x: number, top: number, bottom: number, w: number, anim = true): string {
  const h = w / 2, k = w / 100;
  const rope = `<path d="M${x + 2.2} ${top + 2} V${n(bottom - (bottom - top) * 0.3)}" stroke="#C9CED6" stroke-width="${n(0.9 * k)}" fill="none"></path><path d="M${x + 1} ${n(bottom - (bottom - top) * 0.3)} h${n(4 * k)}" stroke="#8A8F96" stroke-width="${n(2 * k)}" stroke-linecap="round"></path>`;
  const clips = [top + 5, top + 3 + h].map((yy) => `<rect x="${n(x + 0.6)}" y="${n(yy - 1.4 * k)}" width="${n(3.4 * k)}" height="${n(2.8 * k)}" rx="${n(k)}" fill="#FFCD00"></rect>`).join('');
  return `<line x1="${x}" y1="${bottom}" x2="${x}" y2="${top}" stroke="#E9EEF4" stroke-width="3" stroke-linecap="round"></line><circle cx="${x}" cy="${top - 3}" r="4" fill="#FFCD00"></circle>${rope}${flyingFlag(x + 3 * k, top + 4, w, anim)}${clips}`;
}

// ---- the kangaroo: a body, head, arm, tail, thigh, shin and long foot, each turning at its joint
interface RooPose { pitch: number; tail: number; th: number; sh: number; ft: number }
type RooKey = 'R' | 'A' | 'B' | 'C' | 'D' | 'TD';
const ROO: Record<RooKey, RooPose> = {
  R: { pitch: 62, tail: 36, th: 35, sh: 125, ft: 0 },     // standing
  A: { pitch: 30, tail: 5, th: 20, sh: 140, ft: 5 },      // landed, legs folded under
  B: { pitch: 36, tail: 10, th: 68, sh: 118, ft: 62 },    // pushing off
  C: { pitch: 28, tail: 36, th: 72, sh: 162, ft: 125 },   // in the air, legs trailing
  D: { pitch: 40, tail: 52, th: 4, sh: 88, ft: 22 },      // feet swinging forward, tail up
  TD: { pitch: 40, tail: 45, th: 10, sh: 105, ft: 8 },    // touching down
};
const THIGH = 25, SHIN = 30, FOOT = 28;
const JOINTS = ['torso', 'head', 'tail', 'th', 'sh', 'ft'] as const;
type Joint = typeof JOINTS[number];
const rad = (d: number) => (d * Math.PI) / 180;
function rooLow(p: RooPose): number {
  const ky = THIGH * Math.sin(rad(p.th)), ay = ky + SHIN * Math.sin(rad(p.sh)), ty = ay + FOOT * Math.sin(rad(p.ft));
  return Math.max(ay, ty) + 3;
}
const rooAngles = (p: RooPose): Record<Joint, number> => ({ torso: -p.pitch, head: p.pitch, tail: p.tail, th: p.th, sh: p.sh - p.th, ft: p.ft - p.sh });
const rooTurn = (k: RooKey) => Object.fromEntries(Object.entries(rooAngles(ROO[k])).map(([j, v]) => [j, `rotate(${v}deg)`])) as Record<Joint, string>;

function roo(col: string, k: RooKey, anim: Partial<Record<Joint, string>> = {}): string {
  const ang = rooAngles(ROO[k]);
  const J = (tx: number, ty: number, j: Joint, inner: string) => `<g transform="translate(${tx} ${ty})"><g transform="rotate(${n(ang[j])})"${anim[j] ? ` style="${anim[j]}"` : ''}>${inner}</g></g>`;
  const head = `<path d="M-5 3 L6 5 L13 -15 L3 -19 Z" stroke="${col}" stroke-width="3"></path><path d="M2 -24 C8 -29 17 -27 28 -19 C31 -17 30 -13 26 -13 C18 -12 9 -11 4 -15 C0 -18 0 -22 2 -24 Z"></path><ellipse cx="4" cy="-33" rx="3" ry="9" transform="rotate(-18 4 -25)"></ellipse><ellipse cx="9" cy="-34" rx="3" ry="9" transform="rotate(8 9 -25)"></ellipse>`;
  const tail = '<path d="M2 -8 C-20 -9 -44 -5 -62 1 C-65 2 -65 5 -62 5 C-44 6 -20 9 2 8 Z"></path>';
  const torso = J(-12, 0, 'tail', tail) + '<path d="M-6 -18 C14 -22 34 -14 48 -9 C55 -7 55 7 47 9 C32 14 14 20 -4 19 C-24 18 -25 -14 -6 -18 Z"></path>'
    + `<polyline points="40,7 43,20 52,23" fill="none" stroke="${col}" stroke-width="4.5"></polyline>` + J(47, -1, 'head', head);
  const foot = `<line x1="0" y1="0" x2="${FOOT}" y2="0" stroke="${col}" stroke-width="5.5"></line>`;
  const shin = `<line x1="0" y1="0" x2="${SHIN}" y2="0" stroke="${col}" stroke-width="6.5"></line>` + J(SHIN, 0, 'ft', foot);
  const thigh = '<path transform="scale(1.16)" d="M-2 -13 C8 -13 20 -7 24 -3 C26 0 26 3 23 5 C14 9 4 13 -3 12 C-14 10 -13 -12 -2 -13 Z"></path>' + J(THIGH, 0, 'sh', shin);
  return `<g fill="${col}" stroke="none" stroke-linejoin="round" stroke-linecap="round">${J(0, 0, 'torso', torso)}${J(0, 0, 'th', thigh)}</g>`;
}
/** A smooth curve through the poses (periodic Hermite), so the legs never stop and start. */
function hermite(ts: number[], vs: number[], f: number): number {
  const m = ts.length - 1;
  let i = 0;
  for (; i < m; i++) if (ts[i] <= f && f <= ts[i + 1]) break;
  if (i >= m) i = m - 1;
  const tan = (k0: number) => {
    const k = k0 % m;
    const tp = k === 0 ? ts[ts.length - 1] - 1 : ts[k - 1];
    return (vs[k + 1] - vs[(((k - 1) % m) + m) % m]) / (ts[k + 1] - tp);
  };
  const h = ts[i + 1] - ts[i], u = (f - ts[i]) / h, m0 = tan(i), m1 = tan(i + 1);
  return (2 * u ** 3 - 3 * u ** 2 + 1) * vs[i] + (u ** 3 - 2 * u ** 2 + u) * h * m0 + (-2 * u ** 3 + 3 * u ** 2) * vs[i + 1] + (u ** 3 - u ** 2) * h * m1;
}
const HOP_T = [0, 0.18, 0.52, 0.82, 0.93, 1];
const HOP_K: RooKey[] = ['A', 'B', 'C', 'D', 'TD', 'A'];
function jointCurve(j: Joint, times = HOP_T, ks = HOP_K, gain = 1, centre?: RooKey, S = 16): [number, number][] {
  let vs = ks.map((k) => rooAngles(ROO[k])[j]);
  if (centre) { const c = rooAngles(ROO[centre])[j]; vs = vs.map((v) => c + gain * (v - c)); }
  return range(S + 1).map((i) => [i / S, hermite(times, vs, i / S)]);
}
const f1 = (x: number) => x.toFixed(1);

/** A kangaroo standing still, feet on the ground at (gx, gy). */
export function rooStanding(col: string, gx: number, gy: number, s: number): string {
  return `<g transform="translate(${gx} ${gy})">${shadow(4 * s, 0, 34 * s)}<g transform="scale(${s})"><g transform="translate(0 ${n(-rooLow(ROO.R))})">${roo(col, 'R')}</g></g></g>`;
}
/** Bounds in from the left and pulls up standing at (gx, gy) as the jump finishes. */
export function rooHopIn(col: string, gx: number, gy: number, s: number, hops: number, D: number, P: number, t0: number, clear = 34): string {
  const u = uid('k');
  const low = Object.fromEntries((Object.keys(ROO) as RooKey[]).map((k) => [k, rooLow(ROO[k])])) as Record<RooKey, number>;
  const apex = Math.max(low.B, low.C + clear);
  const X: [number, string, string][] = [], Y: [number, string, string][] = [];
  const Jk = Object.fromEntries(JOINTS.map((j) => [j, [] as [number, string, string][]])) as Record<Joint, [number, string, string][]>;
  const x0 = -hops * D;
  for (const j of range(hops)) {
    const t = t0 + j * P, xa = x0 + j * D;
    for (const jt of JOINTS) Jk[jt].push(...jointCurve(jt).slice(0, -1).map(([f, v]) => [t + f * P, `rotate(${f1(v)}deg)`, 'linear'] as [number, string, string]));
    X.push([t, `translateX(${f1(xa)}px)`, 'linear'], [t + 0.18 * P, `translateX(${f1(xa + 0.12 * D)}px)`, 'linear'], [t + 0.93 * P, `translateX(${f1(xa + 0.96 * D)}px)`, 'linear']);
    Y.push([t, `translateY(${f1(-low.A)}px)`, 'ease-in-out'], [t + 0.18 * P, `translateY(${f1(-low.B)}px)`, QOUT], [t + 0.52 * P, `translateY(${f1(-apex)}px)`, QIN], [t + 0.93 * P, `translateY(${f1(-low.TD)}px)`, 'ease-out']);
  }
  const te = t0 + hops * P;
  for (const jt of JOINTS) Jk[jt].push([te, rooTurn('A')[jt], 'ease-in-out'], [te + 0.45, rooTurn('R')[jt], 'linear']);
  X.push([te, 'translateX(0px)', 'linear']);
  Y.push([te, `translateY(${f1(-low.A)}px)`, 'ease-in-out'], [te + 0.45, `translateY(${f1(-low.R)}px)`, 'linear']);
  const an = Object.fromEntries(JOINTS.map((jt) => [jt, timeline(u + jt, Jk[jt])])) as Record<Joint, string>;
  return `<g transform="translate(${gx} ${gy})"><g style="${timeline(u + 'x', X)}">${shadow(4 * s, 0, 34 * s)}<g transform="scale(${s})"><g transform="translate(0 ${n(-low.R)})" style="${timeline(u + 'y', Y)}">${roo(col, 'R', an)}</g></g></g></g>`;
}
/** An easy lope in harness: about half the swing of a full bound, on one smooth curve. */
function rooLope(col: string, P: number, dl: number): string {
  const u = uid('g');
  const an = Object.fromEntries(JOINTS.map((jt) => [jt, cycle(u + jt, jointCurve(jt, [0, 0.35, 0.7, 0.88, 1], ['B', 'C', 'D', 'TD', 'B'], 0.45, 'C', 20).map(([f, v]) => [f, `rotate(${f1(v)}deg)`, 'linear']), P, dl)])) as Record<Joint, string>;
  return roo(col, 'C', an);
}

// ---- Santa's sleigh: traditional, with two kangaroos clipped to the trace at the hip, so the line never comes off
export type SleighColours = [body: string, trim: string, suit: string, sack: string, team: string];
export const SLEIGH_DAY: SleighColours = ['#C62828', '#FFD54F', '#D32F2F', '#8D6E3F', '#5A3A1C'];
export const SLEIGH_NIGHT: SleighColours = ['#0F2547', '#0F2547', '#0F2547', '#0F2547', '#0F2547'];
function sleigh(x: number, y: number, s: number, [body, trim, suit, sack, team]: SleighColours, anim: boolean): string {
  const r1 = anim ? rooLope(team, 0.64, 0) : roo(team, 'C');
  const r2 = anim ? rooLope(team, 0.64, -0.16) : roo(team, 'B');
  const lit = suit === body; // a silhouette at night
  return `<g transform="translate(${x} ${y}) scale(${s})">
<path d="M38 12 L102 8 L154 2" stroke="${team}" stroke-width="1.2" fill="none"></path>
<path d="M-4 40 L58 40 C68 40 72 33 69 27 C67 23 62 25 64 29" stroke="${trim}" stroke-width="2.6" fill="none" stroke-linecap="round"></path>
<path d="M10 30 L8 40 M46 30 L48 40" stroke="${trim}" stroke-width="2.4"></path>
<path d="M2 6 C-6 2 -6 16 4 16 L6 30 L50 30 C60 30 64 22 63 16 C62 10 55 11 56 16 C57 20 52 22 46 22 L20 22 L18 10 C17 4 9 2 2 6 Z" fill="${body}"></path>
<path d="M6 26 L50 26" stroke="${trim}" stroke-width="1.6"></path>
<ellipse cx="10" cy="6" rx="9" ry="8" fill="${sack}"></ellipse>
<ellipse cx="30" cy="12" rx="9" ry="10" fill="${suit}"></ellipse><circle cx="32" cy="-2" r="5.2" fill="${lit ? suit : '#F2C9A0'}"></circle>
<path d="M27 -4 Q30 -14 39 -11 L37 -4 Z" fill="${suit}"></path><circle cx="40" cy="-11" r="2.2" fill="${lit ? trim : '#fff'}"></circle><path d="M27 -3.5 h10" stroke="${lit ? trim : '#fff'}" stroke-width="2.2" stroke-linecap="round"></path>
<path d="M30 3 q2 6 7 3" fill="${lit ? trim : '#fff'}"></path>
<g transform="translate(102 8) scale(.33)">${r1}</g><g transform="translate(154 2) scale(.35)">${r2}</g>
</g>`;
}
/** Glides in from the left and eases to a stop mid-screen just as the jump finishes (then flies on, in a preview). */
export function flyingSleigh(y: number, s: number, colours: SleighColours, xMid: number, anim: boolean, stillX = 120): string {
  if (!anim) return sleigh(stillX, y, s, colours, false);
  const st = timeline(uid('s'), [[0, 'translateX(-320px)', 'cubic-bezier(.2,.55,.35,1)'], [3.2, `translateX(${xMid}px)`, 'linear'], [3.9, `translateX(${xMid + 14}px)`, 'cubic-bezier(.5,0,.9,.5)'], [5.6, 'translateX(460px)', 'linear']]);
  return `<g style="${st}"><g class="bob">${sleigh(0, y, s, colours, true)}</g></g>`;
}

// ---- Christmas
const LIGHTS = ['#FF5252', '#FFE57F', '#69F0AE', '#40C4FF', '#FF80AB'];
function bulb(x: number, y: number, c: string, r: number, i: number): string {
  return `<g class="tw2"${delay(-(i * 0.29) % 1.3)}>${softglow(x, y, r * 3.4, c, 0.85)}<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${c}"></circle><circle cx="${n(x - r * 0.3)}" cy="${n(y - r * 0.3)}" r="${n(r * 0.32)}" fill="#fff" opacity=".9"></circle></g>`;
}
export function fairyLights(y = 10, amp = 10, step = 26): string {
  const xs = range(Math.ceil(W / step)).map((i) => i * step);
  const wire = `<path d="M0 ${y} ${xs.map((x) => `Q ${x + step / 2} ${y + amp * 1.9} ${x + step} ${y + 2}`).join(' ')}" stroke="#2E7D32" stroke-width="1.4" fill="none"></path>`;
  return wire + xs.map((x, i) => bulb(x + step / 2, y + amp * 1.05 + 2 * Math.sin(x / 26), LIGHTS[i % 5], 4.6, i)).join('');
}
export const present = (x: number, y: number, box: string, lid: string, ribbon: string, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="0" y="10" width="34" height="26" rx="3" fill="${box}"></rect><rect x="-2" y="4" width="38" height="8" rx="2" fill="${lid}"></rect><rect x="14" y="4" width="6" height="32" fill="${ribbon}"></rect><path d="M17 4 C10 -6 4 0 10 4 M17 4 C24 -6 30 0 24 4" stroke="${ribbon}" stroke-width="2.4" fill="none"></path></g>`;
export const umbrella = (x: number, y: number, top = '#C62828', mid = '#2E7D32') => `<g transform="translate(${x} ${y})"><line x1="14" y1="0" x2="14" y2="44" stroke="#fff" stroke-width="3"></line><path d="M-34 6 Q14 -40 62 6 Z" fill="${top}"></path><path d="M-10 6 Q14 -40 14 -16 Q14 -40 38 6 Z" fill="#fff"></path><path d="M14 -16 Q14 -40 14 6 Z" fill="${mid}"></path></g>`;
/** A decorated pine on the sand: three tiers, tinsel, baubles, twinkling lights and a star on top. */
export function christmasTree(cx: number, base: number, h: number, night: boolean): string {
  const w = h * 0.62, k = h / 172;
  const greens = night ? ['#164D2C', '#1C5E36', '#226B3F'] : ['#1B5E35', '#22703F', '#2A8049'];
  const tiers = ([[0, 0.42, 0.55], [0.24, 0.7, 0.78], [0.48, 0.96, 1]] as const).map(([top, bot, half], i) => {
    const yt = base - h + h * top, yb = base - h * 0.06 - h * (0.96 - bot), hw = (w / 2) * half;
    return `<path d="M${n(cx)} ${n(yt)} L${n(cx + hw)} ${n(yb)} Q${n(cx)} ${n(yb + 8 * k)} ${n(cx - hw)} ${n(yb)} Z" fill="${greens[i]}"></path>`;
  }).join('');
  const trunk = `<rect x="${n(cx - 6 * k)}" y="${n(base - h * 0.1)}" width="${n(12 * k)}" height="${n(h * 0.08)}" fill="#6B4423"></rect><path d="M${n(cx - 15 * k)} ${n(base - h * 0.04)} h${n(30 * k)} l${n(-4 * k)} ${n(h * 0.06)} h${n(-22 * k)} z" fill="#C62828"></path>`;
  const tinsel = ([[0.42, 0.74], [0.66, 0.5], [0.86, 0.24]] as const).map(([a, b]) => `<path d="M${n(cx - (w / 2) * a)} ${n(base - h * b)} Q${n(cx)} ${n(base - h * b + 14 * k)} ${n(cx + (w / 2) * a * 0.9)} ${n(base - h * (b + 0.07))}" stroke="#FFD54F" stroke-width="${n(2.2 * k)}" fill="none" opacity=".9"></path>`).join('');
  const baubles = ([[-0.16, 0.78, '#E53935'], [0.14, 0.7, '#42A5F5'], [-0.28, 0.52, '#FFD54F'], [0.26, 0.46, '#E53935'], [0, 0.58, '#F28C38'], [-0.36, 0.3, '#42A5F5'], [0.08, 0.34, '#E53935'], [0.36, 0.22, '#FFD54F'], [-0.1, 0.18, '#F6B8D0']] as const)
    .map(([x, y, c]) => `<circle cx="${n(cx + w * x)}" cy="${n(base - h * y)}" r="${n(5 * k)}" fill="${c}"></circle><circle cx="${n(cx + w * x - 1.5 * k)}" cy="${n(base - h * y - 1.5 * k)}" r="${n(1.4 * k)}" fill="#fff" opacity=".7"></circle>`).join('');
  const lights = ([[-0.06, 0.88], [0.1, 0.8], [-0.12, 0.72], [0.2, 0.62], [-0.22, 0.64], [0.02, 0.66], [0.32, 0.4], [-0.4, 0.42], [0, 0.44], [0.16, 0.52], [-0.2, 0.28], [0.18, 0.16], [-0.42, 0.12], [0.42, 0.1], [0.06, 0.26], [-0.28, 0.2], [0.3, 0.3], [-0.04, 0.1]] as const)
    .map(([x, y], i) => bulb(cx + w * x, base - h * y, night ? LIGHTS[i % 5] : '#FFF59D', 2.6 * k, i)).join('');
  const top = softglow(cx, base - h - 4 * k, 30 * k, '#FFE57F', 0.9, 'glow') + star(cx, base - h - 4 * k, 12 * k, 5, 0.45, '#FFD54F');
  return trunk + tiers + tinsel + baubles + lights + top;
}

// ---- Easter
export const EGGS: [string, string][] = [['#F6B8D0', '#7FB8DE'], ['#B9E3C6', '#F28C38'], ['#FFE39A', '#B48BD9'], ['#C8B8F0', '#F6B8D0'], ['#9FD3F0', '#FFD54F']];
export const egg = (x: number, y: number, [c, stripe]: [string, string], r = 9, rot = 0) => `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${n(r * 0.78)}" ry="${r}" fill="${c}" stroke="#fff" stroke-width="1.2"></ellipse><path d="M${n(x - r * 0.75)} ${n(y - 1)} q${n(r * 0.37)} -3 ${n(r * 0.75)} 0 q${n(r * 0.37)} 3 ${n(r * 0.75)} 0" stroke="${stripe}" stroke-width="2" fill="none"></path><circle cx="${n(x - r * 0.3)}" cy="${n(y + r * 0.45)}" r="1.3" fill="${stripe}"></circle><circle cx="${n(x + r * 0.3)}" cy="${n(y + r * 0.45)}" r="1.3" fill="${stripe}"></circle></g>`;
/** A sitting bunny facing left, about 60 wide and 70 tall at scale 1, its feet at (x, y). */
export function bunny(x: number, y: number, s: number): string {
  const [body, inner, line] = ['#FFFFFF', '#F6B8D0', '#C9C2D6'];
  const o = `fill="${body}" stroke="${line}" stroke-width="1"`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="34" cy="-22" rx="24" ry="20" ${o}></ellipse><circle cx="58" cy="-24" r="7" ${o}></circle><circle cx="14" cy="-40" r="14" ${o}></circle>`
    + `<ellipse cx="12" cy="-66" rx="5.5" ry="17" transform="rotate(-10 12 -66)" ${o}></ellipse><ellipse cx="12" cy="-66" rx="2.4" ry="12" transform="rotate(-10 12 -66)" fill="${inner}"></ellipse>`
    + `<ellipse cx="24" cy="-64" rx="5.5" ry="17" transform="rotate(14 24 -64)" ${o}></ellipse><ellipse cx="24" cy="-64" rx="2.4" ry="12" transform="rotate(14 24 -64)" fill="${inner}"></ellipse>`
    + `<circle cx="8" cy="-42" r="1.8" fill="#3B2E6E"></circle><circle cx="1" cy="-37" r="2" fill="${inner}"></circle><ellipse cx="22" cy="-3" rx="9" ry="4" ${o}></ellipse></g>`;
}
/** Hops in from the right edge in three hops and stops mid-screen. */
export function bunnyHopIn(x: number, y: number, s: number, hops = 3, D = 70, P = 0.62, rest = 0.22, t0 = 0.4, h = 32): string {
  const u = uid('b');
  const X: [number, string, string][] = [], Y: [number, string, string][] = [];
  const x0 = hops * D;
  for (const j of range(hops)) {
    const t = t0 + j * (P + rest), xa = x0 - j * D;
    X.push([t + 0.12 * P, `translateX(${f1(xa)}px)`, 'linear'], [t + 0.88 * P, `translateX(${f1(xa - D)}px)`, 'linear']);
    Y.push([t, 'translateY(0px) rotate(0deg) scale(1.08,.88)', 'ease-out'], [t + 0.12 * P, 'translateY(0px) rotate(8deg) scale(.94,1.1)', QOUT],
      [t + 0.5 * P, `translateY(${-h}px) rotate(0deg) scale(1,1)`, QIN], [t + 0.88 * P, 'translateY(0px) rotate(-6deg) scale(.96,1.06)', 'ease-out'],
      [t + P, 'translateY(0px) rotate(0deg) scale(1.1,.85)', 'ease-in-out'], [t + P + 0.14, 'translateY(0px) rotate(0deg) scale(1,1)', 'linear']);
  }
  return `<g transform="translate(${x} ${y})"><g style="${timeline(u + 'x', X)}">${shadow(30 * s, 2, 30 * s)}<g transform="scale(${s}) translate(30 0)"><g style="${timeline(u + 'y', Y)}"><g transform="translate(-30 0)">${bunny(0, 0, 1)}</g></g></g></g></g>`;
}
export function flower(x: number, y: number, c: string, s = 1): string {
  const p = range(5).map((i) => { const a = (i * 2 * Math.PI) / 5; return `<circle cx="${n(x + Math.cos(a) * 4 * s)}" cy="${n(y + Math.sin(a) * 4 * s)}" r="${n(3 * s)}" fill="${c}"></circle>`; }).join('');
  return `<line x1="${x}" y1="${y}" x2="${x}" y2="${n(y + 12 * s)}" stroke="#4E8F3A" stroke-width="1.4"></line>${p}<circle cx="${x}" cy="${y}" r="${n(2.2 * s)}" fill="#FFD54F"></circle>`;
}
export const grass = (y: number, col: string, count = 46) => { const step = Math.floor(W / count); return range(Math.ceil(W / step)).map((i) => i * step).map((x) => `<path d="M${x} ${y + ((x * 7) % 9)} l3 -10 l3 10" fill="${col}"></path>`).join(''); };

// ---- Halloween
export function web(cx: number, cy: number, R: number, col: string, op: number, sw: number): string {
  const angs = range(7).map((i) => 90 + i * 15); // down and to the left from the top-right corner
  const pt = (a: number, r: number): [number, number] => [cx + Math.cos(rad(a)) * r, cy + Math.sin(rad(a)) * r];
  const spokes = angs.map((a) => `<line x1="${cx}" y1="${cy}" x2="${n(pt(a, R)[0])}" y2="${n(pt(a, R)[1])}"></line>`).join('');
  let rings = '';
  for (let r = 34; r < R; r += 30) {
    let segs = '';
    for (let i = 0; i < angs.length - 1; i++) {
      const p1 = pt(angs[i], r), p2 = pt(angs[i + 1], r), mid = pt((angs[i] + angs[i + 1]) / 2, r * 0.86);
      segs += `M${n(p1[0])} ${n(p1[1])} Q${n(mid[0])} ${n(mid[1])} ${n(p2[0])} ${n(p2[1])} `;
    }
    rings += `<path d="${segs}"></path>`;
  }
  return `<g stroke="${col}" stroke-width="${sw}" fill="none" opacity="${op}">${spokes}${rings}</g>`;
}
export const spider = (x: number, y: number, body = '#120A1C', thread = '#E7DEF5') => `<g class="spin"><line x1="${x}" y1="-300" x2="${x}" y2="${y}" stroke="${thread}" stroke-width="1"></line><g transform="translate(${x} ${y})"><circle cx="0" cy="8" r="9" fill="${body}"></circle><circle cx="0" cy="-2" r="5.5" fill="${body}"></circle><path d="M-7 4 l-9 -6 l-3 6 M-8 8 l-12 0 l-2 6 M-7 12 l-9 7 l0 6 M7 4 l9 -6 l3 6 M8 8 l12 0 l2 6 M7 12 l9 7 l0 6" stroke="${body}" stroke-width="2" fill="none"></path><circle cx="-2" cy="-3" r="1.3" fill="#fff"></circle><circle cx="2" cy="-3" r="1.3" fill="#fff"></circle></g></g>`;
/** A bat with scalloped wings that beat from the shoulder, on a looping flight. */
export function bat(x: number, y: number, s: number, fill: string, anim: boolean, dl = 0, eyes = '#F7A23B'): string {
  const wing = '<path d="M0 -2 L10 -10 L26 -7 Q21 -3 21 4 Q16 0 13 6 Q9 1 6 6 Q3 2 0 4 Z"></path>';
  const c = (k: string) => (anim ? ` class="${k}"${delay(dl / 5)}` : '');
  const wings = `<g transform="translate(2 -3)"><g${c('bw')}>${wing}</g></g><g transform="scale(-1 1) translate(2 -3)"><g${c('bw')}>${wing}</g></g>`;
  const body = `<g${c('bb')}><ellipse cx="0" cy="1" rx="3.6" ry="6.5"></ellipse><circle cx="0" cy="-6" r="3.4"></circle><path d="M-3 -8 L-2.6 -13 L-.4 -9 Z M3 -8 L2.6 -13 L.4 -9 Z"></path><circle cx="-1.3" cy="-6.3" r=".7" fill="${eyes}"></circle><circle cx="1.3" cy="-6.3" r=".7" fill="${eyes}"></circle></g>`;
  const inner = `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">${wings}${body}</g>`;
  return anim ? `<g class="bp"${delay(dl)}>${inner}</g>` : inner;
}
export function pumpkin(x: number, y: number, s: number, lit: boolean, face = true): string {
  const glow = lit ? '#FFE082' : '#3A1C05';
  const f = face ? `<g class="${lit ? 'fl' : ''}"><path d="M-9 -4 l5 -5 l3 6z M9 -4 l-5 -5 l-3 6z" fill="${glow}"></path><path d="M-11 4 q11 9 22 0 l-3 .5 l-2 3 l-3 -3 l-3 3 l-3 -3 l-3 3 l-2 -3z" fill="${glow}"></path></g>` : '';
  const halo = lit ? softglow(0, 2, 30, '#FFB74D', 0.3, 'fl') : '';
  const inner = lit ? '<ellipse cx="0" cy="2" rx="9" ry="10" fill="#FFB74D" opacity=".45"></ellipse>' : '';
  return `<g transform="translate(${x} ${y}) scale(${s})">${halo}<ellipse cx="-9" cy="0" rx="11" ry="15" fill="#E8741E"></ellipse><ellipse cx="9" cy="0" rx="11" ry="15" fill="#E8741E"></ellipse><ellipse cx="0" cy="0" rx="12" ry="16" fill="#F28C38"></ellipse>${inner}<path d="M0 -15 q1 -7 6 -9" stroke="#3E7D32" stroke-width="3" fill="none" stroke-linecap="round"></path>${f}</g>`;
}
export const tomb = (x: number, y: number, s: number, fill: string, text = 'RIP') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0 V-26 Q-14 -40 0 -40 Q14 -40 14 -26 V0 Z" fill="${fill}"></path><text x="0" y="-20" text-anchor="middle" font-family="Inter, sans-serif" font-size="8" font-weight="800" fill="#000" opacity=".35">${text}</text></g>`;
export const spookyTree = (x: number, y: number, s: number, fill: string) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><path d="M-6 0 L-3 -70 Q-20 -90 -40 -96 L-38 -100 Q-18 -94 -4 -80 L-4 -110 Q-10 -124 -24 -132 L-20 -134 Q-6 -126 0 -114 Q6 -130 22 -140 L24 -136 Q8 -124 4 -104 L4 -84 Q18 -96 38 -100 L38 -96 Q16 -88 4 -66 L6 0 Z"></path></g>`;
export function house(x: number, y: number, s: number, fill: string, win: string): string {
  const w = ([[-20, -40], [12, -40], [-4, -70]] as const).map(([a, b], k) => `<rect class="fl" x="${a}" y="${b}" width="8" height="10" fill="${win}"${delay(-k * 0.5)}></rect>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-34 0 V-52 L-40 -52 L0 -90 L40 -52 L34 -52 V0 Z" fill="${fill}"></path><path d="M14 -76 V-100 H24 V-66 Z" fill="${fill}"></path>${w}<rect x="-6" y="-18" width="12" height="18" fill="${win}" opacity=".8"></rect></g>`;
}

// ---- Australia Day: a kettle barbecue with snags on
export function barbecue(x: number, y: number, s: number, anim: boolean): string {
  const legsAndWheel = '<path d="M-13 -24 L-20 0 M13 -24 L20 0 M1 -22 L3 -3" stroke="#5A5F66" stroke-width="2.6" stroke-linecap="round" fill="none"></path><circle cx="-20" cy="-2" r="4" fill="#2A2C31"></circle><circle cx="-20" cy="-2" r="1.4" fill="#8A8F96"></circle>';
  const bowl = '<path d="M-25 -40 Q-25 -17 0 -17 Q25 -17 25 -40 Z" fill="#17181C"></path><path d="M-18 -34 Q-16 -24 -6 -21" stroke="#fff" stroke-width="2" fill="none" opacity=".18" stroke-linecap="round"></path>'
    + '<ellipse cx="0" cy="-40" rx="25" ry="5.5" fill="#2C2E34" stroke="#9AA0A8" stroke-width="1.2"></ellipse><ellipse cx="0" cy="-40" rx="21" ry="3.8" fill="#3A2218"></ellipse><ellipse cx="0" cy="-39.6" rx="15" ry="2.2" fill="#FF8A3D" opacity=".75"></ellipse>'
    + '<path d="M-25 -38 q-6 2 -5 8 M25 -38 q6 2 5 8" stroke="#5A5F66" stroke-width="2" fill="none" stroke-linecap="round"></path>';
  const snags = [-8, 4, -3, 7].map((r, i) => `<g transform="translate(${-13.5 + i * 9} -42) rotate(${r})"><rect x="-2.8" y="-5.5" width="5.6" height="11" rx="2.8" fill="#A9502A"></rect><rect x="-1.6" y="-4" width="1.3" height="7" rx=".6" fill="#D98A5A" opacity=".8"></rect></g>`).join('');
  const steam = [-9, 1, 10].map((sx, i) => `<path${anim ? ` class="steam"${delay(-i * 0.8)}` : ''} d="M${sx} -52 q-4 -6 0 -12 q4 -6 0 -12" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"></path>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})">${shadow(0, 1, 26)}${legsAndWheel}${bowl}${snags}${steam}</g>`;
}

// ---- New Year
const PARTY = ['#F28C38', '#FFD54F', '#FF6FAE', '#7FD3FF', '#B9F27C', '#C8B8F0', '#fff'];
export function confetti(count: number, y0: number, y1: number, anim: boolean, seed = 1, k = 1.5): string {
  return range(count).map((i) => {
    const a = (i * 0.6180339 + seed * 0.37) % 1, b = (i * 0.7548776 + seed * 0.11) % 1;
    const x = a * W, y = y0 + b * (y1 - y0), c = PARTY[i % PARTY.length], r = (i * 47) % 180;
    const piece = `<g transform="scale(${k})">${i % 3 ? `<rect x="-3" y="-1.6" width="6" height="3.2" rx=".8" fill="${c}" transform="rotate(${r})"></rect>` : `<circle r="2" fill="${c}"></circle>`}</g>`;
    return anim ? `<g transform="translate(${n(x)} 0)"><g class="cf" style="animation-duration:${n(5 + (i % 5) * 0.7)}s;animation-delay:${n(-b * 8)}s">${piece}</g></g>` : `<g transform="translate(${n(x)} ${n(y)})">${piece}</g>`;
  }).join('');
}
export function balloons(x: number, y: number, s: number): string {
  const b = ([[-18, 6, '#FF6FAE'], [16, 2, '#FFD54F'], [0, -14, '#F28C38']] as const).map(([dx, dy, c]) => `<path d="M${dx} ${dy + 17} Q${dx * 0.5} ${dy + 50} 0 80" stroke="#fff" stroke-width="1" fill="none" opacity=".8"></path><ellipse cx="${dx}" cy="${dy}" rx="13" ry="16" fill="${c}"></ellipse><ellipse cx="${dx - 4}" cy="${dy - 5}" rx="3" ry="5" fill="#fff" opacity=".45"></ellipse><path d="M${dx - 2} ${dy + 16} l2 3 l2 -3z" fill="${c}"></path>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="bln">${b}</g></g>`;
}
export function esky(x: number, y: number, s: number): string {
  const bottles = ([[-10, -10, '#2E7D32'], [0, 4, '#8D5A2B'], [10, 12, '#2E7D32']] as const).map(([bx, r, c]) => `<g transform="translate(${bx} -30) rotate(${r})"><rect x="-3" y="-12" width="6" height="14" rx="2" fill="${c}"></rect><rect x="-1.4" y="-18" width="2.8" height="7" fill="${c}"></rect><rect x="-1.8" y="-19.5" width="3.6" height="2.4" fill="#FFD54F"></rect></g>`).join('');
  const ice = ([[-18, 12], [-5, -8], [5, 20], [13, -14]] as const).map(([ix, ir]) => `<rect x="${ix}" y="-33" width="6" height="5" rx="1" fill="#E6F6FF" transform="rotate(${ir} ${ix} -31)"></rect>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})">${shadow(0, 1, 28)}${bottles}${ice}<rect x="-24" y="-30" width="48" height="30" rx="4" fill="#1F5E8C"></rect><rect x="-24" y="-30" width="48" height="7" rx="3" fill="#fff"></rect><rect x="-6" y="-17" width="12" height="5" rx="2" fill="#fff" opacity=".85"></rect></g>`;
}
export function beachBall(x: number, y: number, r: number): string {
  const p = (a: number) => `${n(x + Math.sin(a) * r)} ${n(y - Math.cos(a) * r)}`;
  const seg = (a0: number, a1: number, c: string) => `<path d="M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} L${x} ${y} Z" fill="${c}"></path>`;
  const third = (2 * Math.PI) / 3;
  return `${shadow(x, y + r, r * 0.9)}<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"></circle>${seg(0, third, '#F28C38')}${seg(-third, 0, '#1F5E8C')}${seg(third, 2 * third, '#FFD54F')}<circle cx="${x}" cy="${y}" r="${n(r * 0.18)}" fill="#fff"></circle>`;
}


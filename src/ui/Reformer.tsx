// The Plenty Flow picture: a reformer at sunset, and a figure jumping off the jump board.
// Drawn in code so it stays sharp at every size and works in light and dark.
import { useEffect, useRef } from 'react';

const L1 = 20, L2 = 20, REACH = L1 + L2 - 0.3;
type Pose = { o: number; hx: number; hy: number; knee: [number, number]; foot: [number, number] };

/** Where the legs are when the carriage has moved `o` from rest. Each leg keeps its length. */
function pose(o: number): Pose {
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
const n = (x: number) => x.toFixed(2);
/** The figure is a navy silhouette against the sunset, apart from the white reformer. */
const FIG = '#0E2F4A';
function scene(p: Pose, w = 1): string {
  const o = p.o;
  return `<g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none">
<line x1="30" y1="56" x2="186" y2="56" stroke-width="${4 * w}"/>
<line x1="36" y1="56" x2="36" y2="70" stroke-width="${3 * w}"/><line x1="180" y1="56" x2="180" y2="70" stroke-width="${3 * w}"/>
<g stroke-width="${1.5 * w}" opacity=".85"><line x1="${n(162 + o)}" y1="50" x2="171" y2="50"/><line x1="${n(162 + o)}" y1="53" x2="171" y2="53"/></g>
<line x1="173" y1="56" x2="179" y2="22" stroke-width="${6 * w}"/>
<circle cx="179.5" cy="19" r="${3.5 * w}" fill="#F28C38" stroke="#fff" stroke-width="${1.2 * w}"/>
<rect x="${n(98 + o)}" y="44" width="64" height="8" rx="3" fill="#fff" stroke="none"/>
<rect x="${n(112 + o)}" y="34" width="5" height="10" rx="2" fill="#fff" stroke="none"/>
<circle cx="${n(106 + o)}" cy="36" r="${5 * Math.min(w, 1.3)}" fill="${FIG}" stroke="none"/>
<line x1="${n(112 + o)}" y1="39" x2="${n(p.hx)}" y2="${p.hy}" stroke="${FIG}" stroke-width="${5 * w}"/>
<polyline points="${n(p.hx)},${p.hy} ${n(p.knee[0])},${n(p.knee[1])} ${n(p.foot[0])},${n(p.foot[1])}" stroke="${FIG}" stroke-width="${4 * w}"/>
</g>`;
}
/** One jump: out and back in a single smooth swing. */
const JUMP_MS = 2800, TRAVEL = 40;
const offsetAt = (t: number) => -TRAVEL * Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * Math.min(1, Math.max(0, t))), 1.5);
export const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === '1';

/** The sunset reformer. Jumps once when shown (unless motion is turned down), then calls onDone. */
export function ReformerJump({ jump = true, onDone, label = 'A figure jumps off the jump board of a reformer, at sunset' }: { jump?: boolean; onDone?: () => void; label?: string }) {
  const g = useRef<SVGGElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const el = g.current;
    if (!el) return;
    el.innerHTML = scene(pose(0));
    if (!jump || reduceMotion()) { const id = setTimeout(() => done.current?.(), 300); return () => clearTimeout(id); }
    let raf = 0; const start = performance.now();
    const step = (now: number) => {
      const t = (now - start) / JUMP_MS;
      el.innerHTML = scene(pose(offsetAt(t)));
      if (t < 1) raf = requestAnimationFrame(step); else done.current?.();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [jump]);
  return (
    <svg viewBox="24 6 170 70" width="100%" role="img" aria-label={label} style={{ display: 'block' }}>
      <circle cx="146" cy="56" r="34" fill="#F7B267" />
      <circle cx="146" cy="56" r="26" fill="#F28C38" />
      <rect x="0" y="56" width="220" height="30" fill="#174B70" />
      <g ref={g} />
    </svg>
  );
}

/** The round logo. `words` adds PLENTY FLOW / PILATES in the dark blue (only for larger sizes). */
export function Badge({ size = 56, words = false, label }: { size?: number; words?: boolean; label?: string }) {
  const id = `b${size}${words ? 'w' : ''}`;
  const s = 0.36, tx = 50 - 108 * s, ty = (words ? 47 : 52) - 42 * s, hz = ty + 56 * s;
  const w = size < 48 ? 2.6 : size < 80 ? 2.1 : 1.8;
  const html = `<defs><clipPath id="${id}"><circle cx="50" cy="50" r="44"/></clipPath></defs>
<circle cx="50" cy="50" r="48" fill="#1F5E8C"/>
<g clip-path="url(#${id})"><circle cx="50" cy="50" r="44" fill="#2A6FA0"/><circle cx="${n(tx + 146 * s)}" cy="${n(hz)}" r="${n(30 * s + 10)}" fill="#F7B267"/><circle cx="${n(tx + 146 * s)}" cy="${n(hz)}" r="${n(26 * s + 8)}" fill="#F28C38"/><rect x="0" y="${n(hz)}" width="100" height="60" fill="#174B70"/></g>
<g transform="translate(${n(tx)} ${n(ty)}) scale(${s})">${scene(pose(0), w)}</g>
<circle cx="50" cy="50" r="44" fill="none" stroke="#fff" stroke-width="1.6"/>
${words ? `<text x="50" y="${n(hz + 17.5)}" text-anchor="middle" font-size="7.6" font-weight="600" fill="#fff" letter-spacing="1.4" font-family="Inter, sans-serif">PLENTY FLOW</text><text x="50" y="${n(hz + 25.5)}" text-anchor="middle" font-size="5.6" font-weight="600" fill="#F7B267" letter-spacing="2.2" font-family="Inter, sans-serif">PILATES</text>` : ''}`;
  return <svg viewBox="0 0 100 100" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Plenty (blue) Flow (orange), PILATES CLASS PLANNER underneath. */
export function Wordmark({ badge = 48 }: { badge?: number }) {
  return (
    <div className="wordmark">
      {badge ? <Badge size={badge} /> : null}
      <div><div className="wm-name"><span className="wm-plenty">Plenty</span> <span className="wm-flow">Flow</span></div><div className="wm-sub">PILATES CLASS PLANNER</div></div>
    </div>
  );
}

export { pose as _pose };

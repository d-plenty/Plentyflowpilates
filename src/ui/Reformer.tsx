// The round Plenty Flow logo and the wordmark. The figure on the reformer is the same one as in the
// theme pictures (src/ui/art), drawn in code so it stays sharp at every size.
import { n, pose, type Pose } from './art/kit';

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


// The app icon, in every colour and holiday you can pick in Settings → Look and colours.
// One drawing, used two ways: the picker shows these as pictures, and scripts/app-icons.ts turns
// them into the PNGs in ios/App/App/Assets.xcassets (the iPhone can only switch to icons that
// are built into the app). No imports, so that script can run it straight from Node.

export interface IconLook {
  id: string;
  name: string;
  holiday?: boolean;
  /** Behind everything, the ring, the sky, the sun's glow and sun, the sea, the person */
  bg: string; sky: string; glow: string; sun: string; sea: string; body: string;
  extra?: 'hat' | 'bats' | 'ears' | 'stars' | 'fireworks';
}

/** The first one is the app's own icon (id ''). Ids match Settings.appIcon (lib/clean.ts APP_ICONS). */
export const ICON_LOOKS: IconLook[] = [
  { id: '', name: 'Plenty blue', bg: '#1F5E8C', sky: '#2A6FA0', glow: '#F7B267', sun: '#F28C38', sea: '#174B70', body: '#0E2F4A' },
  { id: 'sunset', name: 'Sunset', bg: '#B9471F', sky: '#D9642E', glow: '#FFD89A', sun: '#FFC25C', sea: '#7E2C14', body: '#3A1408' },
  { id: 'teal', name: 'Teal', bg: '#0F6E66', sky: '#13877C', glow: '#F7B267', sun: '#F28C38', sea: '#0A4F49', body: '#062F2B' },
  { id: 'plum', name: 'Plum', bg: '#55307A', sky: '#6B3F96', glow: '#F7B267', sun: '#F28C38', sea: '#3B1F57', body: '#1F0E33' },
  { id: 'berry', name: 'Berry', bg: '#9A2758', sky: '#B83A70', glow: '#FFD0A0', sun: '#FFAE5C', sea: '#6A173C', body: '#33081B' },
  { id: 'olive', name: 'Olive', bg: '#4C5B22', sky: '#62742D', glow: '#F7D27A', sun: '#F2B138', sea: '#343F17', body: '#1B2209' },
  { id: 'charcoal', name: 'Charcoal', bg: '#24272D', sky: '#353A43', glow: '#F7B267', sun: '#F28C38', sea: '#17191D', body: '#0B0C0E' },
  { id: 'christmas', name: 'Christmas', holiday: true, bg: '#A3222B', sky: '#C2333B', glow: '#FFE7A8', sun: '#FFD45C', sea: '#1C5A37', body: '#0F2E1C', extra: 'hat' },
  { id: 'newyear', name: 'New Year', holiday: true, bg: '#101B3D', sky: '#1B2A5C', glow: '#3B4C86', sun: '#F3E3A0', sea: '#0A1230', body: '#05091C', extra: 'fireworks' },
  { id: 'ausday', name: 'Australia Day', holiday: true, bg: '#00703A', sky: '#0A8A4A', glow: '#FFE680', sun: '#FFCD00', sea: '#0B5E8C', body: '#06301C', extra: 'stars' },
  { id: 'easter', name: 'Easter', holiday: true, bg: '#7E62BE', sky: '#A58BDF', glow: '#FFF1A8', sun: '#FFE066', sea: '#5FA85C', body: '#2C1F55', extra: 'ears' },
  { id: 'halloween', name: 'Halloween', holiday: true, bg: '#24133A', sky: '#34204F', glow: '#F7B267', sun: '#F28C38', sea: '#150A24', body: '#0B0414', extra: 'bats' },
];

export const iconLook = (id: string): IconLook => ICON_LOOKS.find((l) => l.id === id) || ICON_LOOKS[0];
/** The name iOS knows the icon by (an icon set in Assets.xcassets); null for the app's own. */
export const iconSetName = (id: string): string | null => (id && ICON_LOOKS.some((l) => l.id === id) ? `AppIcon-${id}` : null);

const star = (x: number, y: number, r: number, fill: string) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(2)},${(y + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};
const bat = (x: number, y: number, s: number) =>
  `<path transform="translate(${x} ${y}) scale(${s})" fill="#0B0414" d="M0 0c-2-3-6-4-9-3 2 1 3 3 2 5-2-1-4-1-5 1 3 0 5 2 6 4 1-2 3-3 6-3 3 0 5 1 6 3 1-2 3-4 6-4-1-2-3-2-5-1-1-2 0-4 2-5-3-1-7 0-9 3z"/>`;
const burst = (x: number, y: number, r: number, c: string) => {
  let out = '';
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    out += `<line x1="${(x + r * 0.35 * Math.cos(a)).toFixed(2)}" y1="${(y + r * 0.35 * Math.sin(a)).toFixed(2)}" x2="${(x + r * Math.cos(a)).toFixed(2)}" y2="${(y + r * Math.sin(a)).toFixed(2)}"/>`;
  }
  return `<g stroke="${c}" stroke-width="1.6" stroke-linecap="round">${out}</g><circle cx="${x}" cy="${y}" r="1.2" fill="${c}"/>`;
};

/** The icon as an SVG, 100 × 100, filling the square (iOS rounds the corners itself). */
export function iconSvg(id: string, size = 1024): string {
  const l = iconLook(id);
  const sky = (() => {
    switch (l.extra) {
      case 'stars': // the Southern Cross
        return star(26, 30, 3.2, '#fff') + star(36, 20, 2.6, '#fff') + star(31, 42, 2.4, '#fff') + star(19, 38, 2.2, '#fff') + star(29, 33, 1.3, '#fff');
      case 'fireworks':
        return burst(30, 26, 11, '#FFD45C') + burst(62, 20, 8, '#FF7FB0') + burst(46, 40, 6, '#7FE0FF') + burst(74, 38, 5, '#FFD45C');
      case 'bats':
        return bat(28, 26, 0.9) + bat(42, 18, 0.6) + bat(20, 40, 0.5);
      case 'hat': // snow
        return [[22, 22], [34, 16], [28, 36], [44, 26], [18, 32], [40, 40], [76, 20], [54, 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#fff" opacity=".9"/>`).join('');
      case 'ears': // eggs in the grass
        return '';
      default:
        return '';
    }
  })();
  const grass = l.extra === 'ears'
    ? `<ellipse cx="24" cy="66" rx="3.2" ry="4.2" fill="#FF9EC4"/><ellipse cx="33" cy="68" rx="3" ry="4" fill="#FFE066"/><ellipse cx="72" cy="67" rx="3.2" ry="4.2" fill="#8FD3FF"/>`
    : '';
  // On the head: a Santa hat, or bunny ears (figure coordinates, head at 106,36)
  const hat = l.extra === 'hat'
    ? '<path d="M96 31 Q104 6 128 4 Q116 14 118 30 Z" fill="#E0262E" stroke="#fff" stroke-width="2.5"/><rect x="93" y="26" width="27" height="8" rx="4" fill="#fff" stroke="none"/><circle cx="129" cy="5" r="5.5" fill="#fff" stroke="none"/>'
    : '';
  const head = l.extra === 'ears'
      ? `<g stroke="none"><ellipse cx="99" cy="16" rx="5" ry="15" transform="rotate(-20 99 16)" fill="#fff"/><ellipse cx="99" cy="16" rx="2.4" ry="10" transform="rotate(-20 99 16)" fill="#FF9EC4"/><ellipse cx="111" cy="15" rx="5" ry="15" transform="rotate(16 111 15)" fill="#fff"/><ellipse cx="111" cy="15" rx="2.4" ry="10" transform="rotate(16 111 15)" fill="#FF9EC4"/></g>`
      : '';
  const moon = `<circle cx="63.68" cy="57.04" r="20.80" fill="${l.glow}"/><circle cx="63.68" cy="57.04" r="17.36" fill="${l.sun}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><defs><clipPath id="ring${l.id || 'blue'}"><circle cx="50" cy="50" r="44"/></clipPath></defs>
<rect width="100" height="100" fill="${l.bg}"/>
<g clip-path="url(#ring${l.id || 'blue'})"><circle cx="50" cy="50" r="44" fill="${l.sky}"/>${sky}${moon}<rect x="0" y="57.04" width="100" height="60" fill="${l.sea}"/>${grass}</g>
<g transform="translate(11.12 36.88) scale(0.36)"><g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none">
<line x1="30" y1="56" x2="186" y2="56" stroke-width="7.2"/>
<line x1="36" y1="56" x2="36" y2="70" stroke-width="5.4"/><line x1="180" y1="56" x2="180" y2="70" stroke-width="5.4"/>
<g stroke-width="2.7" opacity=".85"><line x1="162" y1="50" x2="171" y2="50"/><line x1="162" y1="53" x2="171" y2="53"/></g>
<line x1="173" y1="56" x2="179" y2="22" stroke-width="10.8"/>
<circle cx="179.5" cy="19" r="6.3" fill="${l.extra === 'fireworks' ? '#FFD45C' : l.sun}" stroke="#fff" stroke-width="2.16"/>
<rect x="98" y="44" width="64" height="8" rx="3" fill="#fff" stroke="none"/>
<rect x="112" y="34" width="5" height="10" rx="2" fill="#fff" stroke="none"/>
${head}<circle cx="106" cy="36" r="6.5" fill="${l.body}" stroke="none"/>${hat}
<line x1="112" y1="39" x2="144" y2="40" stroke="${l.body}" stroke-width="9"/>
<polyline points="144,40 154.57,23.02 173.94,28" stroke="${l.body}" stroke-width="7.2"/>
</g></g>
<circle cx="50" cy="50" r="44" fill="none" stroke="#fff" stroke-width="1.6"/>
</svg>`;
}

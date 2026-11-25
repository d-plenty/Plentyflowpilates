// Light, dark and the person's own colour, applied to the whole app as CSS variables.
import type { Settings } from '../lib/types';

export const ACCENT_HEX: Record<string, string> = { blue: '#1F5E8C', sunset: '#C8601C', teal: '#0F6E62', plum: '#6B3FA0', berry: '#B0306A', olive: '#3D6B21', charcoal: '#2B2B2B' };
export const ACCENT_NAME: Record<string, string> = { blue: 'Plenty blue', sunset: 'Sunset', teal: 'Teal', plum: 'Plum', berry: 'Berry', olive: 'Olive', charcoal: 'Charcoal', own: 'Your own' };

type RGB = [number, number, number];
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const hex = (c: RGB) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => { const x = rgb(a); const y = rgb(b); return hex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB); };
const lum = (h: string) => { const [r, g, b] = rgb(h).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export const accentOf = (s: Settings) => (s.accent === 'own' && s.ownAccent ? s.ownAccent : ACCENT_HEX[s.accent] || ACCENT_HEX.blue);
export const isDark = (s: Settings) => s.theme === 'dark' || (s.theme === 'auto' && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);

/** The variables for one colour, readable in the mode it is used in. */
export function accentVars(base: string, dark: boolean): Record<string, string> {
  const onFill = contrast(base, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#16201C';
  if (!dark) {
    // text in the accent colour sits on white: darken a light colour until it can be read
    let text = base;
    for (let i = 0; i < 12 && contrast(text, '#FFFFFF') < 4.5; i++) text = mix(text, '#000000', 0.12);
    return { '--accent': text, '--accent-dark': mix(text, '#000000', 0.28), '--accent-soft': mix(base, '#FFFFFF', 0.87), '--accent-line': mix(base, '#FFFFFF', 0.68), '--accent-fill': base, '--on-accent': onFill, '--fig-ghost': text };
  }
  let text = mix(base, '#FFFFFF', 0.45);
  for (let i = 0; i < 12 && contrast(text, '#15212D') < 4.5; i++) text = mix(text, '#FFFFFF', 0.15);
  const fill = contrast(base, '#15212D') < 1.6 ? mix(base, '#FFFFFF', 0.3) : base;
  return { '--accent': text, '--accent-dark': mix(text, '#FFFFFF', 0.35), '--accent-soft': mix(base, '#111715', 0.72), '--accent-line': mix(base, '#111715', 0.45), '--accent-fill': fill, '--on-accent': contrast(fill, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#16201C', '--fig-ghost': text };
}

export function applyTheme(s: Settings): void {
  const root = document.documentElement;
  const dark = isDark(s);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.black = s.trueBlack ? 'on' : 'off';
  root.dataset.text = s.textSize;
  for (const [k, on] of Object.entries(s.a11y || {})) { if (on) root.dataset[k] = '1'; else delete root.dataset[k]; }
  for (const [k, v] of Object.entries(accentVars(accentOf(s), dark))) root.style.setProperty(k, v);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? (s.trueBlack ? '#000000' : '#0D1621') : '#F4F7FA');
}

// Reading springs the way teachers write them: "R", "RB", "R+B", "2R", "Blue", "red and blue".
// A slash gives two options, first for beginners, then intermediate ("R/RB"). Letters and colour
// names follow the studio's own reformer, so "B" is whatever that studio's B spring is.
import { BRANDS, LOAD_LEVELS } from '../engine';
import type { Studio } from './types';

type Spring = { name: string; short: string; color: string };
/** The studio's springs: level, colour name and letter, heaviest last. */
export function springKey(studio: Pick<Studio, 'brand' | 'springOverrides'>): { level: string; name: string; short: string }[] {
  const brand = (BRANDS as Record<string, { springs: Record<string, Spring> }>)[studio.brand] || (BRANDS as Record<string, { springs: Record<string, Spring> }>).balanced_body;
  const table = { ...brand.springs, ...((studio.springOverrides || {}) as Record<string, Spring>) };
  return (LOAD_LEVELS as string[]).filter((l) => table[l]).map((l) => ({ level: l, name: table[l].name, short: table[l].short }));
}

/** One option ("RB", "2 red, 1 blue"): the spring levels, and anything not understood. */
function readOne(text: string, key: ReturnType<typeof springKey>): { loads: string[]; unknown: string[] } {
  const loads: string[] = [];
  const unknown: string[] = [];
  const t = text.toLowerCase().replace(/\b(and|plus|with)\b|[+,&]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t || /^(none|no springs?|0|nil)$/.test(t)) return { loads, unknown };
  const byName = (w: string) => key.find((k) => k.name.toLowerCase() === w || `${k.name.toLowerCase()}s` === w);
  const byShort = (c: string) => key.find((k) => k.short.toLowerCase() === c);
  const words = t.split(' ');
  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    let n = 1;
    const m = w.match(/^(\d)x?(.*)$/);
    if (m) { n = Number(m[1]); w = m[2] || words[++i] || ''; }
    const x = w.match(/^x(\d)$/);
    if (x && loads.length) { for (let k = 1; k < Number(x[1]); k++) loads.push(loads[loads.length - 1]); continue; }
    if (!w) continue;
    const full = byName(w);
    if (full) { for (let k = 0; k < n; k++) loads.push(full.level); continue; }
    // letters: "rb" is a red and a blue; "rrb" two reds and a blue
    if (/^[a-z]{1,6}$/.test(w) && [...w].every((c) => byShort(c))) { for (let k = 0; k < n; k++) for (const c of w) loads.push(byShort(c)!.level); continue; }
    unknown.push(w);
  }
  return { loads: loads.slice(0, 5), unknown };
}

/** "R/RB" → a red, or a red and a blue. Only the first two options are kept. */
export function parseSprings(text: string, studio: Pick<Studio, 'brand' | 'springOverrides'>): { loads: string[]; alt: string[]; unknown: string[] } {
  const key = springKey(studio);
  const [a = '', b = ''] = text.split(/\s*\/\s*|\s+or\s+/i);
  const one = readOne(a, key), two = readOne(b, key);
  return { loads: one.loads, alt: two.loads, unknown: [...one.unknown, ...two.unknown] };
}

/** Does this look like a springs line ("R", "R/RB", "Blue", "B/R 5-6 each")? Gives the springs part and what's left. */
export function springsAtStart(line: string, studio: Pick<Studio, 'brand' | 'springOverrides'>): { springs: string; rest: string } | null {
  const key = springKey(studio);
  const words = line.trim().split(/\s+/);
  let k = 0;
  const isSpringWord = (w: string) => {
    const parts = w.split('/').filter(Boolean);
    return parts.length > 0 && parts.every((p) => { const r = readOne(p.replace(/[,.;:]$/, ''), key); return r.loads.length > 0 && !r.unknown.length; });
  };
  while (k < words.length && (isSpringWord(words[k]) || (words[k] === '/' && k > 0) || (/^(or|and|\+)$/i.test(words[k]) && k > 0 && k + 1 < words.length && isSpringWord(words[k + 1])))) k++;
  if (!k) return null;
  return { springs: words.slice(0, k).join(' '), rest: words.slice(k).join(' ') };
}

export const springHint = (studio: Studio) => `${springKey(studio).map((k) => `${k.short} ${k.name}`).join(', ')}${studio.name ? ` at ${studio.name}` : ''}. Use / for a beginner / intermediate option, like R/RB.`;

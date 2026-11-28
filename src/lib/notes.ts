// Class plans written in a notes app, in and out. Reads what teachers write:
//
//   Sunday 29th November reformer        ← the title (a first line that isn't a heading)
//   Prop:                                ← props for the whole flow
//   - [ ] X1 dumbbell
//   Stretch:                             ← a heading ends in ":" → a part of the class
//   R 5-6 each                           ← springs (and reps) for the movements below
//   - [ ] Lunge out and in…              ← a movement
//       - hold and pulse                 ← indented → a variation of the movement above
//   Flow:
//   B/R                                  ← beginner / intermediate springs
//
// Springs follow the studio's own reformer (see lib/springs.ts). A movement whose words are a
// library movement's name is linked to it; anything else stays exactly as written.
import { cleanSegments, nowIso, uid } from './clean';
import { partFor } from './parts';
import { pickableProps, propLabel } from './props';
import { norm, relatedTo } from './search';
import { parseSprings, springKey, springsAtStart } from './springs';
import type { ClassPlan, Item, Movement, Named, Segment, Studio } from './types';

export interface NotesPart { name: string; items: Item[]; springs?: string }
export interface NotesResult {
  title: string;
  /** Blocks ("Block: Core burner" … "End block"), each movement's `group` pointing at one. */
  groups: { id: string; name: string }[];
  parts: NotesPart[];
  props: { id: string; label: string; count: number; known: boolean }[];
  /** Spring letters used, and what they were read as at this studio. */
  letters: { letter: string; name: string }[];
  unknownSprings: string[];
  written: number;
  linked: number;
}

const BULLET = /^(?:[-*•▪◦·]|\d{1,2}[.)]|\[[ xX]?\]|[☐☑✓✔])\s*/;
const CHECK = /^\[[ xX]?\]\s*|^[☐☑✓✔]\s*/;
const REPS = /^(?:[x×]\s*\d+.*|\d+\s*(?:[-–]\s*\d+)?\s*(?:x|reps?|each|times|per side|each side|e\/s|counts?|sets?)\b.*|\d+\s*[-–]\s*\d+.*)$/i;

/** Indent of a line, tabs counting as four spaces. */
const indentOf = (l: string) => { const m = l.match(/^[\t ]*/)![0]; return m.replace(/\t/g, '    ').length; };
const isHeading = (t: string) => /:\s*$/.test(t) && !BULLET.test(t) && t.length <= 60;
const isPropHeading = (t: string) => /^props?\s*:?\s*$/i.test(t.trim());

/** Reads a note into a flow's parts. Nothing is saved: the result is shown first. */
export function readNotes(text: string, studio: Studio, movements: Movement[]): NotesResult {
  const lines = text.replace(/\r/g, '').split('\n');
  const byName = new Map<string, Movement>();
  for (const m of movements) for (const n of [m.name, ...(m.aka || [])]) if (!byName.has(norm(n))) byName.set(norm(n), m);
  const out: NotesResult = { title: '', groups: [], parts: [], props: [], letters: [], unknownSprings: [], written: 0, linked: 0 };
  let part: NotesPart | null = null;
  let inProps = false;
  let springs = '';
  let reps = '';
  let last: Item | null = null;
  let lastIndent = 0;
  let group = '';
  const used = new Set<string>();
  const ensurePart = () => { if (!part) { part = { name: 'Class', items: [] }; out.parts.push(part); } return part; };
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const ind = indentOf(raw);
    let t = raw.trim();
    // headings: "Stretch:", "Warm up/foot work:", "Prop:"
    if (isHeading(t) && ind === 0) {
      const name = t.replace(/:\s*$/, '').trim();
      if (isPropHeading(name)) { inProps = true; last = null; continue; }
      inProps = false; springs = ''; reps = ''; last = null; group = '';
      part = { name: name.replace(/\b\w/, (c) => c.toUpperCase()).slice(0, 80) || 'Part', items: [] };
      out.parts.push(part);
      continue;
    }
    // a block: "Block: Core burner" until "End block" (or the next part)
    const bl = t.match(/^block\s*:\s*(.+)$/i);
    if (bl && ind === 0) { group = uid('g'); out.groups.push({ id: group, name: bl[1].trim().slice(0, 80) }); last = null; continue; }
    if (/^end( of)?( the)? block\.?$/i.test(t)) { group = ''; last = null; continue; }
    const bullet = BULLET.test(t);
    t = t.replace(BULLET, '').replace(CHECK, '').trim();
    if (!t) continue;
    // a variation: indented under a movement
    if (last && ind > lastIndent && !inProps) {
      last.layers = [...(last.layers || []), { text: t.slice(0, 160) }].slice(0, 8);
      continue;
    }
    if (inProps) { addProp(out, t, studio); continue; }
    // a springs line ("R/RB", "BLUE", "R 5-6 each") sets springs (and reps) for what follows
    const sp = !bullet ? springsAtStart(t, studio) : null;
    if (sp && (!sp.rest || REPS.test(sp.rest))) { springs = sp.springs; reps = sp.rest; if (part) (part as NotesPart).springs = springs; noteLetters(out, springs, studio); continue; }
    // a short line of capital letters ("Y", "R/Q") is springs this studio doesn't have: flag them
    if (!bullet && out.parts.length && /^[A-Z]{1,4}(?:\s*\/\s*[A-Z]{1,4})?$/.test(t)) {
      const u = parseSprings(t, studio);
      for (const x of u.unknown) if (!out.unknownSprings.includes(x)) out.unknownSprings.push(x);
      springs = t; reps = ''; noteLetters(out, springs, studio); continue;
    }
    if (!bullet && !out.parts.length && !out.title && ind === 0) { out.title = t.slice(0, 120); continue; }
    if (!bullet && REPS.test(t) && last) { last.reps = t.slice(0, 60); continue; }
    // a movement: its own springs at the start ("RB side lying…") win over the part's
    let words = t;
    let own = springs;
    const lead = bullet ? springsAtStart(t, studio) : null;
    if (lead && lead.rest && lead.springs.length <= 6 && /^[A-Z/+ ]+$/.test(lead.springs)) { own = lead.springs; words = lead.rest; noteLetters(out, own, studio); }
    // "… · 5-6 each" at the end: the reps (as copied out of Plenty Flow)
    let ownReps = reps;
    const tail = words.match(/^(.*?)\s+[·|]\s+(.+)$/);
    if (tail && (REPS.test(tail[2]) || /^\d{1,3}$/.test(tail[2].trim()))) { words = tail[1]; ownReps = tail[2]; }
    const p = own ? parseSprings(own, studio) : { loads: [], alt: [], unknown: [] };
    for (const u of p.unknown) if (!out.unknownSprings.includes(u)) out.unknownSprings.push(u);
    const match = byName.get(norm(words));
    const item: Item = {
      id: uid('i'),
      ...(match && !used.has(match.slug) ? { slug: match.slug } : { text: words.slice(0, 400) }),
      ...(ownReps ? { reps: ownReps.slice(0, 60) } : {}),
      ...(p.loads.length ? { load: { springs: p.loads } } : {}),
      ...(p.alt.length ? { alt: { springs: p.alt } } : {}),
      ...(group ? { group } : {}),
    };
    if (item.slug) { used.add(item.slug); out.linked++; } else out.written++;
    ensurePart().items.push(item);
    last = item;
    lastIndent = ind;
  }
  return out;
}

function noteLetters(out: NotesResult, springs: string, studio: Studio): void {
  const key = springKey(studio);
  for (const c of springs.replace(/[^A-Za-z]/g, '').toUpperCase()) {
    if (out.letters.some((l) => l.letter === c)) continue;
    const k = key.find((x) => x.short.toUpperCase() === c);
    if (k && springs.length <= 12) out.letters.push({ letter: c, name: k.name });
  }
}

/** "X1 dumbbell", "2 x magic circle", "dumbbells (1 each)": a prop, matched to the studio's own names. */
function addProp(out: NotesResult, t: string, studio: Studio): void {
  const m = t.match(/^(?:x\s*(\d+)|(\d+)\s*x?)\s+(.*)$/i) || t.match(/^(.*?)\s*[x×]\s*(\d+)$/i);
  let count = 1, name = t;
  if (m) { if (m[3] !== undefined) { count = Number(m[1] || m[2]) || 1; name = m[3]; } else { name = m[1]; count = Number(m[2]) || 1; } }
  name = name.trim().slice(0, 40);
  if (!name) return;
  const list = pickableProps(studio.setup);
  const n = norm(name);
  const words = [n, ...relatedTo(n)];
  const hit = list.find((x) => norm(x.label) === n) || list.find((x) => words.some((w) => norm(x.label) === w || norm(x.label).startsWith(w))) || list.find((x) => words.some((w) => w.length > 3 && norm(x.label).includes(w)));
  const id = hit ? hit.id : `x_${n.replace(/ /g, '_').slice(0, 40) || 'prop'}`;
  const prev = out.props.find((x) => x.id === id);
  if (prev) prev.count = Math.min(99, prev.count + count);
  else out.props.push({ id, label: hit ? hit.label : name.replace(/^./, (c) => c.toUpperCase()), count: Math.min(99, count), known: !!hit });
}

/** The note as a new flow for this studio (not saved yet). */
export function notesToPlan(r: NotesResult, studio: Studio, o: { lengthMin: number; level: string; apparatus: ClassPlan['apparatus'] }): ClassPlan {
  const segments: Segment[] = cleanSegments(r.parts.map((p) => { const k = partFor(p.name); return { id: uid('s'), name: p.name, role: k.role, sections: k.sections, items: p.items }; }));
  const extra: Named[] = r.props.filter((p) => !p.known).map((p) => ({ id: p.id, label: p.label }));
  return {
    id: uid('c'), title: r.title || `Flow from notes, ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`,
    apparatus: o.apparatus, level: o.level, lengthMin: o.lengthMin, target: 'general', springBudget: 0,
    ...(studio.id ? { studioId: studio.id } : {}),
    segments: segments.length ? segments : [{ id: uid('s'), name: 'Class', role: 'build', items: [] }],
    ...(r.props.length ? { props: r.props.map((p) => ({ id: p.id, count: p.count })) } : {}),
    ...(extra.length ? { extraProps: extra } : {}),
    ...(r.groups.length ? { groups: r.groups } : {}),
    createdAt: nowIso(), updatedAt: nowIso(),
  };
}

/** A flow written out the way it would be in a notes app, to paste anywhere (springs as letters). */
export function planToNotes(plan: ClassPlan, studio: Studio, nameOf: (i: Item) => string): string {
  const key = springKey(studio);
  const letters = (loads?: string[]) => (loads || []).map((l) => key.find((k) => k.level === l)?.short || '?').join('');
  const springsOf = (i: Item) => (i.load?.springs.length ? letters(i.load.springs) + (i.alt?.springs.length ? `/${letters(i.alt.springs)}` : '') : '');
  const out: string[] = [plan.title, ''];
  const whole = (plan.props || []).map((p) => `- [ ] x${p.count} ${(plan.extraProps || []).find((x) => x.id === p.id)?.label || propLabel(studio.setup, p.id)}`);
  if (whole.length) out.push('Props:', ...whole, '');
  let group = '';
  for (const seg of plan.segments) {
    out.push(`${seg.name}:`);
    for (const i of seg.items) {
      if (i.pause) { out.push(`- ${i.label} (${Math.round((i.duration || 60) / 60)} min)`); continue; }
      const g = (plan.groups || []).find((x) => x.id === i.group);
      if (group && g?.id !== group) out.push('End block');
      if (g && g.id !== group) out.push(`Block: ${g.name}`);
      group = g?.id || '';
      const sp = springsOf(i);
      out.push(`- [ ] ${[sp, nameOf(i), i.reps ? `· ${i.reps}` : ''].filter(Boolean).join(' ')}`);
      for (const l of i.layers || []) if (typeof l !== 'string') out.push(`    - ${l.text}`);
      for (const o of i.options || []) out.push(`    - ${o.kind === 'progression' ? 'Harder' : 'Easier'}: ${o.title}`);
      if (i.note) out.push(`    - ${i.note}`);
    }
    if (group) out.push('End block');
    group = '';
    out.push('');
  }
  if (plan.notes) out.push('Notes:', plan.notes);
  return out.join('\n').trim() + '\n';
}

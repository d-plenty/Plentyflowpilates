// A studio's props: what it owns and how many, in groups (boxes, weights, balls, bands, other).
//
// - Built-in props can be renamed (setup.renamedProps), taken out (setup.removedProps) or merged
//   into another prop (setup.propAlias: "the same thing as"). Their ids never change, so movements
//   and flows keep finding them.
// - Weights and balls come in sizes: a size is a prop of the studio's own with `kind` (the prop it
//   is a size of, like hand_weights) and `kg`. A movement that needs hand weights is happy with any
//   size; a flow block can ask for one size.
// - ownedProps() is what every check uses: counts with sizes added to their kind and aliases
//   pointing at what they stand for.
import { BUILTIN, PROP_ALIAS, PROP_GROUPS } from '../engine';
import type { Named, Setup, Studio } from './types';

export interface PropDef extends Named { builtin?: boolean; sizes?: 'weights' | 'balls' }
const B = (BUILTIN as unknown as { equipment: PropDef[] }).equipment;
const GROUP_IDS = (PROP_GROUPS as Named[]).map((g) => g.id);
export const PROP_GROUP_LIST = PROP_GROUPS as Named[];
const slugify = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const builtin = (id: string) => B.find((x) => x.id === id);
const ALIAS = PROP_ALIAS as Record<string, string>;

/** What a prop stands for in this studio: itself, or the prop it was merged into. */
export function resolveProp(setup: Setup, id: string): string {
  let at = id;
  for (let i = 0; i < 8; i++) {
    const next = (setup.propAlias || {})[at] || ALIAS[at];
    if (!next || next === at) break;
    at = next;
  }
  return at;
}
export const isAlias = (setup: Setup, id: string) => resolveProp(setup, id) !== id;

const kgText = (kg: number) => `${String(Math.round(kg * 100) / 100).replace(/\.0+$/, '')} kg`;
/** A size's short name, as listed under its kind: "2 kg", or "Weighted, 1 kg" for a ball. */
export function sizeName(setup: Setup, p: Named): string {
  const ball = (builtin(p.kind || '')?.sizes || customOf(setup, p.kind || '')?.group) === 'balls';
  return p.kg ? (ball ? `Weighted, ${kgText(p.kg)}` : kgText(p.kg)) : p.label;
}
const customOf = (setup: Setup, id: string) => setup.customProps.find((c) => c.id === id);

/** A prop's name in this studio, sizes with their kind ("Hand weights, 2 kg"). */
export function propLabel(setup: Setup, id: string): string {
  const own = customOf(setup, id);
  if (own) return own.kind && own.kg ? `${propLabel(setup, own.kind)}, ${sizeName(setup, own).replace(/^Weighted, /, 'weighted ')}` : own.label;
  const b = builtin(id);
  if (b) return (setup.renamedProps || {})[id] || b.label;
  return String(id).replace(/^[px]_/, '').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
/** The name to use when saying a studio has none: what the prop stands for there. */
export const ownedLabel = (setup: Setup, id: string) => propLabel(setup, resolveProp(setup, id));

/** The group a prop sits in. */
export function groupOf(setup: Setup, id: string): string {
  const own = customOf(setup, id);
  if (own) return own.kind ? groupOf(setup, own.kind) : GROUP_IDS.includes(String(own.group)) ? String(own.group) : guessGroup(own.label);
  return builtin(id)?.group || 'other';
}

/** How many of each prop the studio has, the way movements and drafts ask for them. */
export function ownedProps(st: Pick<Studio, 'props' | 'setup'>): Record<string, number> {
  const { setup } = st;
  const gone = new Set(setup.removedProps);
  const eff: Record<string, number> = {};
  for (const [id, n] of Object.entries(st.props)) {
    if (!(n > 0) || (gone.has(id) && !isAlias(setup, id))) continue;
    const to = resolveProp(setup, id);
    eff[to] = Math.max(eff[to] || 0, n);
  }
  // sizes count towards their kind
  for (const c of setup.customProps) {
    if (!c.kind || gone.has(c.id) || !(st.props[c.id] > 0)) continue;
    const to = resolveProp(setup, c.kind);
    eff[to] = (eff[to] || 0) + st.props[c.id];
  }
  for (const k of [...Object.keys(ALIAS), ...Object.keys(setup.propAlias || {})]) eff[k] = eff[resolveProp(setup, k)] || 0;
  return eff;
}
export const owns = (st: Pick<Studio, 'props' | 'setup'>, id: string, owned = ownedProps(st)) => (owned[id] || 0) > 0;

export interface PropRow { id: string; label: string; builtin: boolean; sizes?: 'weights' | 'balls'; children: PropRow[]; renamed?: boolean }
/** The studio's props, in groups, for the studio screen. Sizes sit under their kind. */
export function propGroups(setup: Setup): { id: string; label: string; rows: PropRow[] }[] {
  const gone = new Set(setup.removedProps);
  const visible: PropDef[] = [
    ...B.filter((b) => !gone.has(b.id) && !isAlias(setup, b.id)).map((b) => ({ ...b, builtin: true })),
    ...setup.customProps.filter((c) => !gone.has(c.id) && !isAlias(setup, c.id)),
  ];
  const ids = new Set(visible.map((v) => v.id));
  const sizesOf = (kind: string) => visible.filter((c) => !c.builtin && c.kind === kind).sort((a, b) => (a.kg || 0) - (b.kg || 0) || a.label.localeCompare(b.label));
  const row = (p: PropDef): PropRow => ({ id: p.id, label: propLabel(setup, p.id), builtin: !!p.builtin, renamed: !!(p.builtin && setup.renamedProps?.[p.id]), sizes: p.sizes || (p.builtin ? undefined : (groupOf(setup, p.id) === 'weights' ? 'weights' : groupOf(setup, p.id) === 'balls' ? 'balls' : undefined)), children: sizesOf(p.id).map((c) => ({ id: c.id, label: sizeName(setup, c), builtin: false, children: [] })) });
  return PROP_GROUP_LIST.map((g) => ({
    id: g.id, label: g.label,
    rows: visible.filter((p) => !(p.kind && ids.has(p.kind)) && groupOf(setup, p.id) === g.id).map(row),
  }));
}

/** Props the studio can pick from for a flow block: what it has listed, merged ones left out. */
export function pickableProps(setup: Setup): { id: string; label: string }[] {
  return propGroups(setup).flatMap((g) => g.rows.flatMap((r) => [{ id: r.id, label: r.label }, ...r.children.map((c) => ({ id: c.id, label: propLabel(setup, c.id) }))]));
}

// ---- guessing what a prop of the studio's own is (props added before 0.6.0 had no group)
export function guessGroup(label: string): string {
  const l = label.toLowerCase();
  if (/box|board|platform|extender|step/.test(l)) return 'boxes';
  if (/weight|dumb ?bell|kettle|\bkg\b|\d\s*kg|kilo/.test(l)) return 'weights';
  if (/ball/.test(l)) return 'balls';
  if (/band|ring|circle|loop|tube|strap/.test(l)) return 'bands';
  return 'other';
}
/** A size hiding in a name, like "2kg dumbbells" or "1 kilo ankle weights". */
export function guessSize(label: string): { kind: string; kg: number } | null {
  const l = label.toLowerCase();
  const m = l.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kgs|kilo|kilos|kilograms?)\b/);
  if (!m) return null;
  const kg = Number(m[1].replace(',', '.'));
  if (!(kg > 0 && kg <= 50)) return null;
  if (/ankle|wrist/.test(l)) return { kind: 'ankle_weights', kg };
  if (/ball/.test(l)) return { kind: /large|big|stability|swiss|gym/.test(l) ? 'large_ball' : 'small_ball', kg };
  if (/dumb ?bell|hand|free ?weight|weights?\b/.test(l)) return { kind: 'hand_weights', kg };
  return null;
}

// ---- changes, made to a studio being edited (the studio's draft: nothing is kept until Save)
const without = (list: string[], id: string) => list.filter((x) => x !== id);
const sizeId = (kind: string, kg: number) => `p_${kind}_${String(kg).replace(/[.,]/g, '_')}kg`;

/** Adds a prop, or a size of one. If it's already there (perhaps taken out), it comes back. */
export function addProp(x: Studio, o: { label?: string; group?: string; kind?: string; kg?: number; count?: number }): string {
  const set = x.setup;
  const count = Math.max(1, Math.min(99, Math.round(o.count || 1)));
  let id: string;
  if (o.kind && o.kg) {
    const kg = Math.round(o.kg * 100) / 100;
    const have = set.customProps.find((c) => c.kind === o.kind && c.kg === kg);
    id = have?.id || sizeId(o.kind, kg);
    if (!have) set.customProps = [...set.customProps, { id, label: `${propLabel(set, o.kind)}, ${kgText(kg)}`, kind: o.kind, kg }];
  } else {
    const label = String(o.label || '').trim().slice(0, 40);
    if (!label) return '';
    const lower = label.toLowerCase();
    const b = B.find((p) => p.label.toLowerCase() === lower || (set.renamedProps?.[p.id] || '').toLowerCase() === lower);
    const have = set.customProps.find((c) => !c.kind && c.label.toLowerCase() === lower);
    id = b ? resolveProp(set, b.id) : have?.id || `p_${slugify(label).replace(/-/g, '_') || 'prop'}`;
    if (!b && !have) {
      while (set.customProps.some((c) => c.id === id) || builtin(id)) id += '_2';
      set.customProps = [...set.customProps, { id, label, group: GROUP_IDS.includes(String(o.group)) ? String(o.group) : guessGroup(label) }];
    }
  }
  set.removedProps = without(set.removedProps, id);
  x.props = { ...x.props, [id]: Math.max(count, x.props[id] || 0) };
  return id;
}

/** Renames a prop. A built-in one given back its own name (or a blank) goes back to normal. */
export function renameProp(x: Studio, id: string, label: string): void {
  const set = x.setup;
  const name = label.trim().slice(0, 40);
  const b = builtin(id);
  if (b) {
    const r = { ...(set.renamedProps || {}) };
    if (!name || name === b.label) delete r[id]; else r[id] = name;
    set.renamedProps = r;
    return;
  }
  if (!name) return;
  set.customProps = set.customProps.map((c) => (c.id === id ? { ...c, label: name } : c));
}
/** Changes a size's weight. If that size is already listed, the two become one. */
export function resizeProp(x: Studio, id: string, kg: number): void {
  const set = x.setup;
  const me = customOf(set, id);
  if (!me?.kind || !(kg > 0 && kg <= 50)) return;
  const k = Math.round(kg * 100) / 100;
  const other = set.customProps.find((c) => c.id !== id && c.kind === me.kind && c.kg === k && !set.removedProps.includes(c.id));
  if (other) { mergeProp(x, id, other.id); return; }
  set.customProps = set.customProps.map((c) => (c.id === id ? { ...c, kg: k, label: `${propLabel(set, me.kind!)}, ${kgText(k)}` } : c));
}
/** Moves a prop of the studio's own to another group. */
export function regroupProp(x: Studio, id: string, group: string): void {
  if (!GROUP_IDS.includes(group)) return;
  x.setup.customProps = x.setup.customProps.map((c) => (c.id === id && !c.kind ? { ...c, group } : c));
}

/** Takes a prop out of the studio. Its name is kept, so flows that used it still read right. */
export function removeProp(x: Studio, id: string): void {
  const set = x.setup;
  const sizes = set.customProps.filter((c) => c.kind === id).map((c) => c.id);
  const out = new Set([id, ...sizes]);
  set.removedProps = [...new Set([...set.removedProps, ...out])];
  const props = { ...x.props };
  for (const k of out) delete props[k];
  x.props = props;
}

/** "The same thing as": `from` stops being listed and anything asking for it counts `to`. The
 *  higher of the two counts is kept, and sizes of `from` become sizes of `to`. */
export function mergeProp(x: Studio, from: string, to: string): boolean {
  const set = x.setup;
  const target = resolveProp(set, to);
  if (!from || from === target || resolveProp(set, from) === target) return false;
  set.propAlias = { ...(set.propAlias || {}), [from]: target };
  set.removedProps = [...new Set([...set.removedProps, from])];
  set.customProps = set.customProps.map((c) => (c.kind === from ? { ...c, kind: target } : c));
  const props = { ...x.props };
  if (props[from]) props[target] = Math.max(props[target] || 0, props[from]);
  delete props[from];
  x.props = props;
  return true;
}

/** Puts the built-in props back as they came: names, ones taken out, ones merged. Props of the
 *  studio's own stay as they are. */
export function restoreProps(x: Studio): void {
  const set = x.setup;
  set.renamedProps = {};
  set.removedProps = set.removedProps.filter((id) => !builtin(id));
  const alias = { ...(set.propAlias || {}) };
  for (const k of Object.keys(alias)) if (builtin(k)) delete alias[k];
  set.propAlias = alias;
}
export const propsChanged = (set: Setup) => Object.keys(set.renamedProps || {}).length > 0 || set.removedProps.some((id) => builtin(id)) || Object.keys(set.propAlias || {}).some((k) => builtin(k));

/** Old studio data (0.5.0 and before): one Box for Long box and Short box, and sizes and groups
 *  for props of the studio's own. Counts are kept. */
export function upgradeProps(props: Record<string, number>, setup: Setup): Record<string, number> {
  const out = { ...props };
  if ((out.long_box || out.short_box) && !out.box) out.box = Math.max(out.long_box || 0, out.short_box || 0);
  delete out.long_box; delete out.short_box;
  setup.customProps = setup.customProps.map((c) => {
    if (c.group || c.kind) return c;
    const size = guessSize(c.label);
    return size ? { ...c, ...size } : { ...c, group: guessGroup(c.label) };
  });
  return out;
}

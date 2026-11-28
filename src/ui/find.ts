// What each kind of thing is searched by: names count most, then other names, muscles, the
// section, the position and props. See lib/search.ts for how a search matches.
import { EQUIPMENT, MUSCLES, POSITIONS, labelOf, namesOf, sectionOf } from '../engine';
import { library } from '../lib/store';
import { search, type Field, type Hit } from '../lib/search';
import type { ClassPlan, Movement, SavedBlock, Series } from '../lib/types';
import { sectionLabel } from './sections';

const L = (list: unknown, id: string) => String(labelOf(list as { id: string; label: string }[], id) || '');

export function movementFields(m: Movement): Field[] {
  const [name, ...aka] = namesOf(m) as string[];
  return [
    { text: name, weight: 3, label: 'name' },
    ...aka.map((a) => ({ text: a, weight: 2.5, label: 'other name' })),
    ...(m.muscles?.primary || []).map((x) => ({ text: L(MUSCLES, x), weight: 1.6, label: 'muscle' })),
    ...(m.muscles?.secondary || []).map((x) => ({ text: L(MUSCLES, x), weight: 1, label: 'muscle' })),
    { text: sectionLabel(sectionOf(m) as string), weight: 1.5, label: 'section' },
    { text: m.position ? L(POSITIONS, m.position) : '', weight: 1.2, label: 'position' },
    ...(m.equipment || []).map((e) => ({ text: L(EQUIPMENT, e), weight: 1, label: 'prop' })),
    { text: (m.categories || []).join(' '), weight: 0.8, label: 'kind' },
    { text: m.summary || '', weight: 0.5, label: 'description' },
  ];
}
const itemsText = (items: { slug?: string; text?: string }[]) => {
  const lib = library().map;
  return items.map((i) => i.text || (i.slug ? lib[i.slug]?.name : '') || '').join(' · ');
};
export const blockFields = (b: SavedBlock): Field[] => [
  { text: b.name, weight: 3, label: 'name' },
  ...b.sections.map((s) => ({ text: sectionLabel(s), weight: 1.5, label: 'section' })),
  { text: itemsText(b.items), weight: 1.2, label: 'in the block' },
  { text: b.notes || '', weight: 0.6, label: 'notes' },
];
export const seriesFields = (s: Series): Field[] => [
  { text: s.name, weight: 3, label: 'name' },
  ...(s.aka || []).map((a) => ({ text: a, weight: 2.5, label: 'other name' })),
  { text: itemsText(s.items), weight: 1.2, label: 'in the series' },
  { text: s.summary || '', weight: 0.6, label: 'description' },
];
export const flowFields = (p: ClassPlan): Field[] => [
  { text: p.title, weight: 3, label: 'name' },
  { text: (p.groups || []).map((g) => g.name).join(' · '), weight: 1.5, label: 'in a block' },
  { text: p.segments.map((s) => s.name).join(' · '), weight: 1, label: 'part' },
  { text: itemsText(p.segments.flatMap((s) => s.items.filter((i) => !i.pause))), weight: 1.2, label: 'movement' },
  { text: p.notes || '', weight: 0.5, label: 'notes' },
];

export const findMovements = (list: Movement[], q: string): Hit<Movement>[] => search(list, q, movementFields);
export const findBlocks = (list: SavedBlock[], q: string): Hit<SavedBlock>[] => search(list, q, blockFields);
export const findSeries = (list: Series[], q: string): Hit<Series>[] => search(list, q, seriesFields);
export const findFlows = (list: ClassPlan[], q: string): Hit<ClassPlan>[] => search(list, q, flowFields);
/** Why it matched, short enough for a tag: shown only when it wasn't simply the name. */
export const whyTag = (why: string) => (why && why !== 'name' ? why : '');

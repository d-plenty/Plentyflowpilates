// The sections movements are sorted into (from the engine's list), in the order a reformer class
// usually runs, each with its own colour so rows are easy to tell apart while scrolling.
import { SECTIONS, sectionOf } from '../engine';
import type { Movement } from '../lib/types';

type Sec = { id: string; label: string };
const ORDER = ['lower', 'cardio', 'pelvic', 'core', 'chest_arms', 'back_shoulders', 'single_arm', 'stretch'];
/** Plenty blue and orange first, then colours that sit with them. */
const COLOUR: Record<string, string> = {
  lower: '#1F5E8C', cardio: '#2E8FD0', pelvic: '#0F8A7E', core: '#E07A26',
  chest_arms: '#D2554A', back_shoulders: '#5A5FD0', single_arm: '#9A4FB0', stretch: '#4E9A3A',
};
export const sectionColour = (id: string) => COLOUR[id] || '#6B7A8A';
export const sectionsInOrder = (): Sec[] => [...(SECTIONS as Sec[])].sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99));
export const sectionLabel = (id: string) => (SECTIONS as Sec[]).find((s) => s.id === id)?.label || id;

/** Movements in sections, A to Z inside each. `first` puts some sections ahead (a phase's own ones). */
export function bySection(list: Movement[], first: string[] = []): { id: string; label: string; colour: string; items: Movement[] }[] {
  const order = sectionsInOrder();
  const rank = (id: string) => (first.includes(id) ? first.indexOf(id) - 100 : order.findIndex((s) => s.id === id) + 1 || 99);
  const groups = new Map<string, Movement[]>();
  for (const m of list) { const s = sectionOf(m) as string; groups.set(s, [...(groups.get(s) || []), m]); }
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b))
    .map(([id, items]) => ({ id, label: sectionLabel(id), colour: sectionColour(id), items: items.sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' })) }));
}

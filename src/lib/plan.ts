// Making and editing a class plan: new plans (drafted or empty), and the undo and redo steps kept
// for each plan while the app is open.
import { blankSegments, classLevel, defaultClassLevel, draftFlow, FOCUSES } from '../engine';
import { ownedProps, propLabel } from './props';
import { cleanSegments, nowIso, uid } from './clean';
import { canRedoDraft, canUndoDraft, closeDraft, draftOf, editDraft, hasDraft, isDirty, markSaved, openDraft, redoDraft, undoDraft } from './drafts';
import { applySetup, classOf, fittedLibrary, library, saveClass, studioOf } from './store';
import type { ClassPlan, ClassType, Item, Segment, Studio } from './types';

export const phased = (ct?: ClassType) => !!ct && !ct.noPhases && (ct.phases || []).some((p) => p && p.minutes > 0);
/** The class types set up at a studio (a mat-only studio only has mat ones). */
export const classTypesFor = (studio: Studio): ClassType[] => studio.setup.classTypes.filter((c) => studio.hasReformers || c.apparatus === 'mat');

export interface NewPlan { classType: ClassType; lengthMin: number; level: string; goal: string; focusText: string; studio: Studio; draft: boolean }

export function makePlan(o: NewPlan): ClassPlan {
  const { setup } = o.studio;
  applySetup(setup);
  const own = o.focusText.trim().slice(0, 60);
  const goal = own ? ((FOCUSES as { id: string }[])[0]?.id || '') : o.goal;
  const focus = (FOCUSES as { id: string; label: string }[]).find((f) => f.id === goal);
  const stamp = { id: uid('c'), createdAt: nowIso(), updatedAt: nowIso(), ...(o.studio.id ? { studioId: o.studio.id } : {}) };
  if (o.draft) {
    const flow = draftFlow({ movements: fittedLibrary(o.studio), classType: o.classType, classTypes: setup.classTypes, goal, focusText: own, lengthMin: o.lengthMin, level: o.level, props: ownedProps(o.studio), timing: setup.timing, targets: setup.targets }) as Record<string, unknown>;
    return { ...stamp, title: String(flow.title), apparatus: flow.apparatus as ClassPlan['apparatus'], level: String(flow.level || o.level), lengthMin: Number(flow.lengthMin) || o.lengthMin, goal, ...(own ? { focusText: own } : {}), ...(flow.noPhases ? { noPhases: true } : {}), target: String(flow.target || 'general'), classType: o.classType.id, springBudget: Number(flow.springBudget) || 0, segments: cleanSegments(flow.segments) };
  }
  const segs = cleanSegments((blankSegments(o.classType, o.lengthMin, { props: ownedProps(o.studio) }) as Segment[]).map((s) => ({ ...s, id: uid('s') })));
  return {
    ...stamp,
    title: `${own || (focus && goal !== 'full_body' ? focus.label : '') ? `${own || focus!.label} · ` : ''}${o.classType.name} ${o.lengthMin} min`,
    apparatus: o.classType.apparatus, level: o.level, lengthMin: o.lengthMin, goal, ...(own ? { focusText: own } : {}),
    ...(phased(o.classType) ? {} : { noPhases: true }),
    target: setup.targets[o.classType.target || ''] ? o.classType.target : 'general',
    classType: o.classType.id, springBudget: o.classType.apparatus === 'mat' ? 0 : o.classType.springBudget || 0,
    segments: segs.length ? segs : [{ id: uid('s'), name: 'Class', role: 'build', items: [] }],
  };
}
export const usualLevel = (ct: ClassType | undefined, studio: Studio) => (ct?.level && studio.setup.levels.some((l) => l.id === ct.level) ? ct.level : (defaultClassLevel() as string));
export const levelName = (id: string) => (classLevel(id) as { label: string }).label;

// ---- editing a class: a copy is edited, and Save puts it back (lib/drafts.ts)
export const classKey = (id: string) => `class:${id}`;
/** The class as it is being edited, or as saved when it isn't open. */
export const planOf = (id: string): ClassPlan | undefined => draftOf<ClassPlan>(classKey(id)) || classOf(id);
/** Start editing a saved class (an edit already under way is kept). */
export function openClass(id: string): ClassPlan | undefined {
  const saved = classOf(id);
  if (!saved && !hasDraft(classKey(id))) return undefined;
  return openDraft(classKey(id), saved ?? null);
}
/** A new class, not saved until Save. */
export function startClass(plan: ClassPlan): void { closeDraft(classKey(plan.id)); openDraft(classKey(plan.id), null, plan); }
/** Change a class being edited. `fn` gets a copy to edit. A run of typing counts as one step back. */
export function changeClass(id: string, fn: (p: ClassPlan) => void, typing = false): void {
  if (!hasDraft(classKey(id))) openClass(id);
  editDraft<ClassPlan>(classKey(id), fn, typing);
}
export const undoClass = (id: string) => undoDraft(classKey(id));
export const redoClass = (id: string) => redoDraft(classKey(id));
export const canUndo = (id: string) => canUndoDraft(classKey(id));
export const canRedo = (id: string) => canRedoDraft(classKey(id));
export const classDirty = (id: string) => isDirty(classKey(id));
/** Save the class being edited. */
export function saveOpenClass(id: string): boolean {
  const p = draftOf<ClassPlan>(classKey(id));
  if (!p) return true;
  saveClass(p);
  markSaved(classKey(id), classOf(id));
  return true;
}

// ---- finding and moving blocks
export function findItem(plan: ClassPlan, itemId: string): { seg: Segment; index: number; item: Item } | undefined {
  for (const seg of plan.segments) { const index = seg.items.findIndex((i) => i.id === itemId); if (index >= 0) return { seg, index, item: seg.items[index] }; }
  return undefined;
}
/** Moves a block one place up or down, across a phase boundary when it is at the edge. */
export function nudge(plan: ClassPlan, itemId: string, dir: -1 | 1): void {
  const at = findItem(plan, itemId);
  if (!at) return;
  const si = plan.segments.indexOf(at.seg);
  const to = at.index + dir;
  if (to >= 0 && to < at.seg.items.length) { at.seg.items.splice(at.index, 1); at.seg.items.splice(to, 0, at.item); return; }
  const other = plan.segments[si + dir];
  if (!other) return;
  at.seg.items.splice(at.index, 1);
  if (dir < 0) other.items.push(at.item); else other.items.unshift(at.item);
}
/** Moves a block to a place in any phase: `index` is where it goes in that phase, counted before the move. */
export function moveItem(plan: ClassPlan, itemId: string, segId: string, index: number): void {
  const at = findItem(plan, itemId);
  const to = plan.segments.find((s) => s.id === segId);
  if (!at || !to) return;
  at.seg.items.splice(at.index, 1);
  const i = to === at.seg && index > at.index ? index - 1 : index;
  to.items.splice(Math.max(0, Math.min(i, to.items.length)), 0, at.item);
}
export const blockCount = (plan: ClassPlan) => plan.segments.reduce((n, s) => n + s.items.filter((i) => !i.pause).length, 0);

/** Props a class uses: what its movements need, what was added to them, and props for the whole
 *  flow. `blocks` is how many movements use it; `count` how many to set out (at least 1). */
export function propsTally(plan: ClassPlan): { id: string; label: string; blocks: number; count: number; whole: boolean }[] {
  const lib = library().map;
  const count = new Map<string, number>();
  for (const seg of plan.segments) for (const i of seg.items) {
    if (i.pause) continue;
    const mv = i.slug ? lib[i.slug] : undefined;
    for (const e of new Set([...(mv?.equipment || []), ...(i.props || [])])) count.set(e, (count.get(e) || 0) + 1);
  }
  const whole = new Map((plan.props || []).map((x) => [x.id, x.count]));
  for (const id of whole.keys()) if (!count.has(id)) count.set(id, 0);
  const extra = new Map((plan.extraProps || []).map((x) => [x.id, x.label]));
  const setup = studioOf(plan.studioId).setup;
  return [...count.entries()].map(([id, blocks]) => ({ id, blocks, count: Math.max(1, whole.get(id) || 0), whole: whole.has(id), label: extra.get(id) || propLabel(setup, id) })).sort((a, b) => Number(b.whole) - Number(a.whole) || b.blocks - a.blocks || a.label.localeCompare(b.label));
}

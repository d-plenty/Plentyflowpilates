// Blocks: sequences of movements kept together. A saved block (Movements → Blocks) is dropped into a
// flow as a copy: the movements land in a part of the class grouped under the block's name
// (`plan.groups`, and `item.group` on each movement), and move around as one. Changing them in the
// flow leaves the saved block as it was, unless "Save changes back to the block" is used.
import { nowIso, uid } from './clean';
import { getData, update } from './store';
import type { ClassPlan, FlowGroup, Item, SavedBlock, Segment } from './types';

// ---- saved blocks
export const blockOf = (id: string) => getData().blocks.find((b) => b.id === id);
export function saveBlock(b: SavedBlock): void {
  const next = { ...b, updatedAt: nowIso() };
  update((d) => { d.blocks = d.blocks.some((x) => x.id === b.id) ? d.blocks.map((x) => (x.id === b.id ? next : x)) : [next, ...d.blocks]; });
}
export function removeBlock(id: string): void {
  update((d) => { d.blocks = d.blocks.filter((b) => b.id !== id); d.favBlocks = d.favBlocks.filter((x) => x !== id); });
}
export const isFavBlock = (id: string) => getData().favBlocks.includes(id);
export function setFavBlock(id: string, on: boolean): void {
  update((d) => { d.favBlocks = on ? [...new Set([...d.favBlocks, id])] : d.favBlocks.filter((x) => x !== id); });
}

/** Copies of movements with new ids, out of any block: for saving or dropping in somewhere else. */
export const copyItems = (items: Item[]): Item[] => items.filter((i) => !i.pause).map((i) => { const c = structuredClone(i); delete c.group; c.id = uid('i'); return c; });

/** A new saved block from movements (a run picked in a flow, or written from scratch). */
export function makeBlock(name: string, items: Item[], o: { apparatus?: SavedBlock['apparatus']; sections?: string[]; notes?: string } = {}): SavedBlock {
  return { id: uid('b'), name: name.trim().slice(0, 80) || 'Block', apparatus: o.apparatus || 'reformer', sections: o.sections || [], ...(o.notes ? { notes: o.notes } : {}), items: copyItems(items), createdAt: nowIso(), updatedAt: nowIso() };
}

// ---- blocks inside a flow
export const groupOf = (plan: ClassPlan, gid?: string): FlowGroup | undefined => (gid ? (plan.groups || []).find((g) => g.id === gid) : undefined);

/** A part's movements in runs: each run is one block (all its movements together) or one loose movement. */
export function runsOf(seg: Segment): { group?: string; items: Item[] }[] {
  const out: { group?: string; items: Item[] }[] = [];
  for (const i of seg.items) {
    const last = out[out.length - 1];
    if (i.group && last && last.group === i.group) last.items.push(i);
    else out.push({ ...(i.group ? { group: i.group } : {}), items: [i] });
  }
  return out;
}

/** Drops a saved block into a part, as a copy grouped under its name. Gives the new group's id. */
export function insertBlock(plan: ClassPlan, segId: string, b: Pick<SavedBlock, 'id' | 'name' | 'items'>, index?: number): string {
  const seg = plan.segments.find((s) => s.id === segId);
  if (!seg) return '';
  const gid = uid('g');
  plan.groups = [...(plan.groups || []), { id: gid, name: b.name, ...(b.id ? { block: b.id } : {}) }];
  const items = copyItems(b.items).map((i) => ({ ...i, group: gid }));
  seg.items.splice(index === undefined ? seg.items.length : Math.max(0, Math.min(index, seg.items.length)), 0, ...items);
  return gid;
}

/** Puts some movements of a flow into a new block, gathered where the first of them is. */
export function groupItems(plan: ClassPlan, ids: string[], name: string): string {
  const want = new Set(ids);
  const first = plan.segments.find((s) => s.items.some((i) => want.has(i.id)));
  if (!first || !want.size) return '';
  const at = first.items.findIndex((i) => want.has(i.id));
  const picked: Item[] = [];
  for (const s of plan.segments) for (const i of s.items) if (want.has(i.id) && !i.pause) picked.push(i);
  const gid = uid('g');
  for (const s of plan.segments) s.items = s.items.filter((i) => !want.has(i.id) || i.pause);
  const before = first.items.slice(0, at).length;
  first.items.splice(Math.min(before, first.items.length), 0, ...picked.map((i) => ({ ...i, group: gid })));
  plan.groups = [...(plan.groups || []), { id: gid, name: name.trim().slice(0, 80) || 'Block' }];
  tidyGroups(plan);
  return gid;
}

/** The movements stay where they are, as loose movements. */
export function ungroup(plan: ClassPlan, gid: string): void {
  for (const s of plan.segments) for (const i of s.items) if (i.group === gid) delete i.group;
  tidyGroups(plan);
}
/** Takes the block and its movements out of the flow. */
export function removeGroup(plan: ClassPlan, gid: string): void {
  for (const s of plan.segments) s.items = s.items.filter((i) => i.group !== gid);
  tidyGroups(plan);
}
export function renameGroup(plan: ClassPlan, gid: string, name: string): void {
  plan.groups = (plan.groups || []).map((g) => (g.id === gid ? { ...g, name: name.trim().slice(0, 80) || g.name } : g));
}

/** Moves a whole block to a place in any part: `index` counts that part's movements before the move. */
export function moveGroup(plan: ClassPlan, gid: string, segId: string, index: number): void {
  const to = plan.segments.find((s) => s.id === segId);
  if (!to) return;
  let at = index;
  const moving: Item[] = [];
  for (const s of plan.segments) {
    s.items = s.items.filter((i, k) => {
      if (i.group !== gid) return true;
      if (s === to && k < index) at--;
      moving.push(i);
      return false;
    });
  }
  to.items.splice(Math.max(0, Math.min(at, to.items.length)), 0, ...moving);
}

/** One step earlier or later for a whole block, past the next run (a block or a movement), into the next part at the ends. */
export function nudgeGroup(plan: ClassPlan, gid: string, dir: -1 | 1): void {
  const si = plan.segments.findIndex((s) => s.items.some((i) => i.group === gid));
  if (si < 0) return;
  const seg = plan.segments[si];
  const runs = runsOf(seg);
  const ri = runs.findIndex((r) => r.group === gid);
  const nr = ri + dir;
  if (nr >= 0 && nr < runs.length) {
    const [r] = runs.splice(ri, 1);
    runs.splice(nr, 0, r);
    seg.items = runs.flatMap((r) => r.items);
    return;
  }
  const other = plan.segments[si + dir];
  if (!other) return;
  const moving = seg.items.filter((i) => i.group === gid);
  seg.items = seg.items.filter((i) => i.group !== gid);
  other.items = dir < 0 ? [...other.items, ...moving] : [...moving, ...other.items];
}

/**
 * After a movement is moved on its own: it stays in its block only if it landed next to it, and a
 * loose movement dropped between two movements of a block joins that block. Blocks whose movements
 * got split are gathered back where the first of them is, and blocks left empty go.
 */
export function settleItem(plan: ClassPlan, itemId: string): void {
  for (const s of plan.segments) {
    const k = s.items.findIndex((i) => i.id === itemId);
    if (k < 0) continue;
    const me = s.items[k];
    const prev = s.items[k - 1], next = s.items[k + 1];
    if (me.group && prev?.group !== me.group && next?.group !== me.group) delete me.group;
    if (!me.group && prev?.group && prev.group === next?.group) me.group = prev.group;
  }
  tidyGroups(plan);
}

/** Keeps each block's movements together (in the part and place of its first movement) and drops empty blocks. */
export function tidyGroups(plan: ClassPlan): void {
  // a movement pointing at a block the flow doesn't have is a loose movement
  const known = new Set((plan.groups || []).map((g) => g.id));
  for (const s of plan.segments) for (const i of s.items) if (i.group && (i.pause || !known.has(i.group))) delete i.group;
  const seen = new Set<string>();
  for (const s of plan.segments) {
    for (let k = 0; k < s.items.length; k++) {
      const g = s.items[k].group;
      if (!g || seen.has(g)) continue;
      seen.add(g);
      // gather the rest of this block's movements (from anywhere) right after this one
      const rest: Item[] = [];
      for (const t of plan.segments) t.items = t.items.filter((i, j) => (i.group === g && !(t === s && j <= k) ? (rest.push(i), false) : true));
      // the run up to k is unchanged; put the rest after the contiguous run starting at the first
      let end = k;
      while (end + 1 < s.items.length && s.items[end + 1].group === g) end++;
      s.items.splice(end + 1, 0, ...rest);
    }
  }
  const used = new Set(plan.segments.flatMap((s) => s.items.map((i) => i.group).filter(Boolean)));
  if (plan.groups) { plan.groups = plan.groups.filter((g) => used.has(g.id)); if (!plan.groups.length) delete plan.groups; }
}

/** The block's movements in this flow, saved back over the saved block (or as a new one). */
export function groupToBlock(plan: ClassPlan, gid: string): SavedBlock | null {
  const g = groupOf(plan, gid);
  if (!g) return null;
  const items = plan.segments.flatMap((s) => s.items.filter((i) => i.group === gid));
  const seg = plan.segments.find((s) => s.items.some((i) => i.group === gid));
  const old = g.block ? blockOf(g.block) : undefined;
  if (old) return { ...old, name: g.name, items: copyItems(items), updatedAt: nowIso() };
  return makeBlock(g.name, items, { apparatus: plan.apparatus, sections: seg?.sections || [] });
}

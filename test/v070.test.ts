// 0.7.0: blocks, written movements, spring shorthand, flow props, tick-offs, Paste from Notes,
// search with related words and typos, parts, and old data coming across.
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanBlock, cleanData, cleanPlan, defaultSetup, newStudio } from '../src/lib/clean';
import { closeAllDrafts } from '../src/lib/drafts';
import { blockCount, changeClass, classTypesFor, makePlan, moveItem, planOf, propsTally } from '../src/lib/plan';
import { _reset, analyse, classOf, getData, library, saveClass, saveStudio, setTick, studioOf, ticksToday } from '../src/lib/store';
import { copyItems, groupItems, groupOf, groupToBlock, insertBlock, makeBlock, moveGroup, nudgeGroup, removeGroup, renameGroup, runsOf, saveBlock, settleItem, tidyGroups, ungroup } from '../src/lib/blocks';
import { parseSprings, springKey, springsAtStart } from '../src/lib/springs';
import { notesToPlan, planToNotes, readNotes } from '../src/lib/notes';
import { distance, relatedTo, search } from '../src/lib/search';
import { findBlocks, findFlows, findMovements } from '../src/ui/find';
import { PART_PRESETS, partFor, splitMinutes } from '../src/lib/parts';
import { keyed, merge, packOf } from '../src/lib/sync';
import { cleanSynced } from '../src/lib/lanSync';
import { writtenMovement } from '../src/engine/vocab';
import type { ClassPlan, Item } from '../src/lib/types';

beforeEach(() => { closeAllDrafts(); _reset(); });

function studio(brand = 'balanced_body') {
  const s = { ...newStudio('Harbour', brand), reformers: 8, setup: defaultSetup(), props: { box: 1, magic_circle: 2, hand_weights: 4 } };
  saveStudio(s);
  return studioOf(s.id);
}
function drafted() {
  const st = studio();
  const plan = makePlan({ classType: classTypesFor(st)[0], lengthMin: 50, level: 'mixed', goal: 'full_body', focusText: '', studio: st, draft: true });
  // every part gets at least four movements, so there is room to group and move
  const lib = library().list.filter((m) => m.apparatus === 'reformer');
  let n = 0;
  for (const seg of plan.segments) while (seg.items.filter((i) => !i.pause).length < 4) seg.items.push({ id: `x${n}`, slug: lib[n++ % lib.length].slug });
  saveClass(plan);
  return classOf(plan.id)!;
}
const ids = (p: ClassPlan, segIndex = 0) => p.segments[segIndex].items.filter((i) => !i.pause).map((i) => i.id);
const allItems = (p: ClassPlan) => p.segments.flatMap((s) => s.items);
/** Every group's movements sit next to each other in one part, and every group has some. */
function groupsAreWhole(p: ClassPlan) {
  for (const g of p.groups || []) {
    const segs = p.segments.filter((s) => s.items.some((i) => i.group === g.id));
    expect(segs.length, `${g.name} is in one part`).toBe(1);
    const at = segs[0].items.map((i, k) => (i.group === g.id ? k : -1)).filter((k) => k >= 0);
    expect(at[at.length - 1] - at[0] + 1, `${g.name} is unbroken`).toBe(at.length);
  }
  const used = new Set(allItems(p).map((i) => i.group).filter(Boolean));
  for (const i of allItems(p)) if (i.group) expect((p.groups || []).some((g) => g.id === i.group)).toBe(true);
  for (const g of p.groups || []) expect(used.has(g.id)).toBe(true);
}

describe('0.7.0: blocks in a flow', () => {
  it('groups picked movements into a block where the first one is', () => {
    const c = drafted();
    const segAt = 1;
    const [a, , b] = ids(c, segAt);
    let gid = '';
    changeClass(c.id, (p) => { gid = groupItems(p, [b, a], 'Core burner'); });
    const p = planOf(c.id);
    expect(groupOf(p, gid)?.name).toBe('Core burner');
    const runs = runsOf(p.segments[segAt]);
    const run = runs.find((r) => r.group === gid)!;
    expect(run.items.map((i) => i.id)).toEqual([a, b]);
    groupsAreWhole(p);
  });
  it('renames, takes apart and removes a block', () => {
    const c = drafted();
    const [a, b] = ids(c, 1);
    let gid = '';
    changeClass(c.id, (p) => { gid = groupItems(p, [a, b], 'Legs'); });
    changeClass(c.id, (p) => renameGroup(p, gid, '  Leg burner  '));
    expect(groupOf(planOf(c.id), gid)?.name).toBe('Leg burner');
    changeClass(c.id, (p) => ungroup(p, gid));
    let p = planOf(c.id);
    expect(p.groups || []).toEqual([]);
    expect(allItems(p).some((i) => i.id === a)).toBe(true);
    expect(allItems(p).some((i) => i.group)).toBe(false);
    changeClass(c.id, (q) => { gid = groupItems(q, [a, b], 'Again'); });
    const before = blockCount(planOf(c.id));
    changeClass(c.id, (q) => removeGroup(q, gid));
    p = planOf(c.id);
    expect(blockCount(p)).toBe(before - 2);
    expect(p.groups || []).toEqual([]);
  });
  it('moves a whole block to another part, and a step at a time', () => {
    const c = drafted();
    const [a, b] = ids(c, 1);
    let gid = '';
    changeClass(c.id, (p) => { gid = groupItems(p, [a, b], 'Pair'); });
    const target = planOf(c.id).segments[2].id;
    changeClass(c.id, (p) => moveGroup(p, gid, target, 0));
    let p = planOf(c.id);
    expect(p.segments[2].items.slice(0, 2).map((i) => i.id)).toEqual([a, b]);
    expect(p.segments[1].items.some((i) => i.id === a)).toBe(false);
    groupsAreWhole(p);
    changeClass(c.id, (q) => nudgeGroup(q, gid, 1));
    p = planOf(c.id);
    const at = p.segments[2].items.findIndex((i) => i.id === a);
    expect(at).toBeGreaterThan(0);
    expect(p.segments[2].items[at + 1].id).toBe(b);
    groupsAreWhole(p);
  });
  it('a movement dropped inside a block joins it; dragged out, it leaves', () => {
    const c = drafted();
    const [a, b, x] = ids(c, 1);
    let gid = '';
    changeClass(c.id, (p) => { gid = groupItems(p, [a, b], 'Pair'); });
    // drop x between a and b
    changeClass(c.id, (p) => { const s = p.segments[1]; moveItem(p, x, s.id, s.items.findIndex((i) => i.id === b)); settleItem(p, x); });
    let p = planOf(c.id);
    expect(allItems(p).find((i) => i.id === x)?.group).toBe(gid);
    groupsAreWhole(p);
    // drag a to another part
    changeClass(c.id, (q) => { moveItem(q, a, q.segments[3].id, 0); settleItem(q, a); });
    p = planOf(c.id);
    expect(allItems(p).find((i) => i.id === a)?.group).toBeUndefined();
    groupsAreWhole(p);
  });
  it('tidies blocks that were split up, emptied or lost', () => {
    const c = drafted();
    const [a, b, x] = ids(c, 1);
    let gid = '';
    changeClass(c.id, (p) => { gid = groupItems(p, [a, b], 'Pair'); });
    changeClass(c.id, (p) => {
      const s = p.segments[1];
      // put an outsider between them without settling, and a stray group id on another
      const xi = s.items.findIndex((i) => i.id === x);
      const [xItem] = s.items.splice(xi, 1);
      s.items.splice(s.items.findIndex((i) => i.id === b), 0, xItem);
      p.segments[2].items[0].group = 'g-nowhere';
      p.groups = [...(p.groups || []), { id: 'g-empty', name: 'Empty' }];
      tidyGroups(p);
    });
    const p = planOf(c.id);
    groupsAreWhole(p);
    expect((p.groups || []).map((g) => g.id)).toEqual([gid]);
  });
  it('saves a block, adds it to a flow as a copy, and saves changes back', () => {
    const c = drafted();
    const items = c.segments[1].items.filter((i) => !i.pause).slice(0, 3);
    const b = makeBlock('Arms set', items, { sections: ['arms'] });
    saveBlock(b);
    expect(getData().blocks.map((x) => x.name)).toContain('Arms set');
    expect(b.items.every((i) => !i.group)).toBe(true);
    expect(b.items.map((i) => i.id)).not.toEqual(items.map((i) => i.id));
    let gid = '';
    changeClass(c.id, (p) => { gid = insertBlock(p, p.segments[3].id, b, 0); });
    let p = planOf(c.id);
    const run = runsOf(p.segments[3]).find((r) => r.group === gid)!;
    expect(run.items.length).toBe(3);
    expect(groupOf(p, gid)?.block).toBe(b.id);
    // the flow's copy is its own
    expect(run.items.map((i) => i.id).some((id) => b.items.some((x) => x.id === id))).toBe(false);
    changeClass(c.id, (q) => { q.segments[3].items[0].reps = '12 slow'; });
    p = planOf(c.id);
    expect(getData().blocks.find((x) => x.id === b.id)!.items[0].reps).not.toBe('12 slow');
    const back = groupToBlock(p, gid)!;
    saveBlock({ ...getData().blocks.find((x) => x.id === b.id)!, items: back.items });
    expect(getData().blocks.find((x) => x.id === b.id)!.items[0].reps).toBe('12 slow');
    groupsAreWhole(p);
  });
  it('copyItems drops timed lines and block links and gives new ids', () => {
    const items: Item[] = [{ id: 'a', slug: 'footwork', group: 'g1' }, { id: 'p', pause: true, duration: 30 }, { id: 'b', text: 'My move' }];
    const out = copyItems(items);
    expect(out.length).toBe(2);
    expect(out.some((i) => i.group)).toBe(false);
    expect(out.map((i) => i.id)).not.toContain('a');
  });
});

describe('0.7.0: saved blocks are cleaned', () => {
  it('keeps names, sections and movements, drops timed lines and groups', () => {
    const b = cleanBlock({ id: 'bk1', name: '  Core burner ', apparatus: 'reformer', sections: ['abs', 7], notes: 'x', items: [{ id: 'i1', slug: 'hundred', group: 'g' }, { id: 'p', pause: true, duration: 20 }, { id: 'i2', text: 'Pulse and hold' }], createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' })!;
    expect(b.name).toBe('Core burner');
    expect(b.items.length).toBe(2);
    expect(b.items.some((i) => i.group)).toBe(false);
    expect(b.items[1].text).toBe('Pulse and hold');
  });
  it('a block with no name or no movements is dropped', () => {
    expect(cleanBlock({ name: '', items: [{ id: 'a', slug: 'hundred' }] })).toBeNull();
    expect(cleanBlock({ name: 'Empty', items: [] })).toBeNull();
    expect(cleanBlock('nonsense')).toBeNull();
  });
  it('gives a new id when asked', () => {
    const b = cleanBlock({ id: 'bk1', name: 'X', items: [{ id: 'a', slug: 'hundred' }] }, false)!;
    expect(b.id).not.toBe('bk1');
  });
});

describe('0.7.0: written movements', () => {
  it('a written movement with no library link is kept and timed', () => {
    const [lv1, lv2] = springKey(studio()).map((k) => k.level);
    const p = cleanPlan({ id: 'c1', title: 'T', apparatus: 'reformer', lengthMin: 30, level: 'mixed', segments: [{ id: 's1', name: 'Warm-up', role: 'warmup', items: [{ id: 'w1', text: 'Lunge out and in with rotation', reps: '5-6 each', load: { springs: [lv1] }, alt: { springs: [lv1, lv2, 'not-a-spring'] } }] }] })!;
    const it0 = p.segments[0].items[0];
    expect(it0.text).toBe('Lunge out and in with rotation');
    expect(it0.load?.springs).toEqual([lv1]);
    expect(it0.alt?.springs).toEqual([lv1, lv2]);
    const mv = writtenMovement(it0, p, null);
    expect(mv.name).toBe('Lunge out and in with rotation');
    expect(mv.written).toBe(true);
  });
  it('a movement with neither a library link nor words is dropped', () => {
    const p = cleanPlan({ id: 'c1', title: 'T', apparatus: 'reformer', lengthMin: 30, level: 'mixed', segments: [{ id: 's1', name: 'Warm-up', role: 'warmup', items: [{ id: 'w1', text: '   ' }] }] })!;
    expect(p.segments[0].items.length).toBe(0);
  });
  it('the checks run on a flow with written movements', () => {
    const c = drafted();
    changeClass(c.id, (p) => { p.segments[1].items.unshift({ id: 'w1', text: 'Something of my own', reps: '8' }); });
    const a = analyse(planOf(c.id), studioOf(c.studioId));
    expect(a.totalSec).toBeGreaterThan(0);
    expect(JSON.stringify(a)).not.toContain('undefined');
  });
  it('a written movement linked to the library keeps its own name', () => {
    const lib = library();
    const m = lib.list[0];
    const p = cleanPlan({ id: 'c1', title: 'T', apparatus: 'reformer', lengthMin: 30, level: 'mixed', segments: [{ id: 's1', name: 'Main', role: 'build', items: [{ id: 'w1', slug: m.slug, text: 'My name for it' }] }] })!;
    expect(p.segments[0].items[0].slug).toBe(m.slug);
    expect(p.segments[0].items[0].text).toBe('My name for it');
  });
});

describe('0.7.0: spring shorthand follows the studio', () => {
  it('Balanced Body letters: R, B, Y, G, and RB for red plus blue', () => {
    const st = studio('balanced_body');
    const key = springKey(st);
    expect(key.length).toBeGreaterThan(2);
    const r = parseSprings('RB', st);
    expect(r.unknown).toEqual([]);
    expect(r.loads.length).toBe(2);
    expect(r.alt).toEqual([]);
  });
  it('a slash means or: first beginner, second intermediate', () => {
    const st = studio('balanced_body');
    const r = parseSprings('R/RB', st);
    expect(r.loads.length).toBe(1);
    expect(r.alt.length).toBe(2);
    const o = parseSprings('B or R', st);
    expect(o.loads.length).toBe(1);
    expect(o.alt.length).toBe(1);
    expect(o.loads[0]).not.toBe(o.alt[0]);
  });
  it('numbers repeat a spring: 2R is two reds', () => {
    const st = studio('balanced_body');
    const r = parseSprings('2R', st);
    expect(r.loads.length).toBe(2);
    expect(new Set(r.loads).size).toBe(1);
  });
  it('letters the studio does not have are flagged, not guessed', () => {
    const st = studio('balanced_body');
    const r = parseSprings('Q', st);
    expect(r.unknown.length).toBe(1);
    expect(r.loads).toEqual([]);
  });
  it('another brand reads its own colours', () => {
    const bb = springKey(studio('balanced_body')).map((k) => k.name).join(',');
    const other = Object.keys((library() as unknown as { brands?: Record<string, unknown> }).brands || {}).find((b) => b !== 'balanced_body');
    if (!other) return;
    const ok = springKey(studio(other)).map((k) => k.name).join(',');
    expect(ok.length).toBeGreaterThan(0);
    expect(typeof bb).toBe('string');
  });
  it('finds springs at the start of a line and leaves the rest', () => {
    const st = studio('balanced_body');
    expect(springsAtStart('R 5-6 each', st)).toEqual({ springs: 'R', rest: '5-6 each' });
    expect(springsAtStart('B/R', st)?.springs).toBe('B/R');
    expect(springsAtStart('Roll down', st)).toBeNull();
  });
});

const SARAH = `Sunday 29th November reformer
Prop:
- [ ] X1 dumbbell
Stretch:
R 5-6 each
- [ ] Lunge out and in with rotation
    - hold and pulse
- [ ] Footwork · 10
Flow:
B/R
- [ ] 4 point kneel knee lift
Block: Core burner
- [ ] Hundred
- [ ] Teaser prep
End block
Cool down:
- [ ] Mermaid`;

describe('0.7.0: Paste from Notes', () => {
  it("reads Sarah's way of writing a plan", () => {
    const st = studio('balanced_body');
    const r = readNotes(SARAH, st, library().list);
    expect(r.title).toBe('Sunday 29th November reformer');
    expect(r.parts.map((p) => p.name)).toEqual(['Stretch', 'Flow', 'Cool down']);
    const stretch = r.parts[0];
    expect(stretch.items[0].text).toBe('Lunge out and in with rotation');
    expect(stretch.items[0].reps).toBe('5-6 each');
    expect(stretch.items[0].load?.springs.length).toBe(1);
    expect(JSON.stringify(stretch.items[0])).toContain('hold and pulse');
    expect(stretch.items[1].reps).toBe('10');
    const flow = r.parts[1];
    expect(flow.items[0].load?.springs.length).toBe(1);
    expect(flow.items[0].alt?.springs.length).toBe(1);
    expect(r.groups.map((g) => g.name)).toEqual(['Core burner']);
    expect(flow.items.filter((i) => i.group).length).toBe(2);
    expect(r.props.length).toBe(1);
    expect(r.linked + r.written).toBe(6);
    expect(r.linked).toBeGreaterThan(0);
  });
  it('makes a flow from it, with parts, the block and the props', () => {
    const st = studio('balanced_body');
    const r = readNotes(SARAH, st, library().list);
    const plan = notesToPlan(r, st, { lengthMin: 50, level: 'intermediate', apparatus: 'reformer' });
    const clean = cleanPlan(plan)!;
    expect(clean.segments.map((s) => s.name)).toEqual(['Stretch', 'Flow', 'Cool down']);
    expect(clean.segments[0].role).toBe('warmup');
    expect(clean.segments[2].role).toBe('cooldown');
    expect((clean.groups || []).length).toBe(1);
    expect(blockCount(clean)).toBe(6);
    groupsAreWhole(clean);
  });
  it('writes a flow back out as a note that reads back the same', () => {
    const st = studio('balanced_body');
    const lib = library();
    const r = readNotes(SARAH, st, lib.list);
    const plan = cleanPlan(notesToPlan(r, st, { lengthMin: 50, level: 'intermediate', apparatus: 'reformer' }))!;
    const nameOf = (i: Item) => i.text || lib.map[i.slug!]?.name || '';
    const text = planToNotes(plan, st, nameOf);
    expect(text).toContain('Stretch:');
    expect(text).toContain('Block: Core burner');
    const again = readNotes(text, st, lib.list);
    expect(again.parts.map((p) => p.name)).toEqual(r.parts.map((p) => p.name));
    expect(again.parts.map((p) => p.items.map(nameOf))).toEqual(r.parts.map((p) => p.items.map(nameOf)));
    expect(again.parts.map((p) => p.items.map((i) => [i.load?.springs || [], i.alt?.springs || [], i.reps || '']))).toEqual(r.parts.map((p) => p.items.map((i) => [i.load?.springs || [], i.alt?.springs || [], i.reps || ''])));
    expect(again.groups.map((g) => g.name)).toEqual(['Core burner']);
  });
  it('flags spring letters it cannot read', () => {
    const st = studio('balanced_body');
    const r = readNotes('Main:\nQZ\n- [ ] Something', st, library().list);
    expect(r.unknownSprings.length).toBeGreaterThan(0);
  });
  it('an empty or odd note does not break', () => {
    const st = studio('balanced_body');
    for (const t of ['', '\n\n', 'just a line', ':::', '- [ ]', 'End block', 'Block:']) {
      const r = readNotes(t, st, library().list);
      expect(Array.isArray(r.parts)).toBe(true);
      expect(() => cleanPlan(notesToPlan(r, st, { lengthMin: 45, level: 'mixed', apparatus: 'reformer' }))).not.toThrow();
    }
  });
});

describe('0.7.0: search with related words and typos', () => {
  it('related words widen a search', () => {
    expect(relatedTo('abs')).toEqual(expect.arrayContaining(['core']));
    expect(relatedTo('bum')).toEqual(expect.arrayContaining(['glutes']));
  });
  it('counts small typos', () => {
    expect(distance('mermaid', 'mermiad')).toBeLessThanOrEqual(2);
    expect(distance('hundred', 'hunderd')).toBeLessThanOrEqual(2);
    expect(distance('core', 'arms')).toBeGreaterThan(2);
  });
  it('finds movements by name, typo and related word', () => {
    const list = library().list;
    expect(findMovements(list, 'mermaid')[0].item.name.toLowerCase()).toContain('mermaid');
    expect(findMovements(list, 'mermiad').some((h) => h.item.name.toLowerCase().includes('mermaid'))).toBe(true);
    expect(findMovements(list, 'abs').length).toBeGreaterThan(5);
    expect(findMovements(list, 'zzzzqq').length).toBe(0);
  });
  it('finds blocks and flows', () => {
    const c = drafted();
    saveBlock(makeBlock('Core burner', c.segments[1].items.filter((i) => !i.pause).slice(0, 2), { sections: ['abs'] }));
    expect(findBlocks(getData().blocks, 'core')[0].item.name).toBe('Core burner');
    expect(findBlocks(getData().blocks, 'burnr').length).toBe(1);
    expect(findFlows(getData().classes, c.title.split(' ')[0]).length).toBeGreaterThan(0);
  });
  it('an empty search lists everything, unranked', () => {
    const out = search([{ n: 'a' }, { n: 'b' }], '  ', (x) => [{ text: x.n, weight: 1 }]);
    expect(out.map((h) => h.item.n)).toEqual(['a', 'b']);
    expect(out.every((h) => h.score === 0)).toBe(true);
  });
});

describe('0.7.0: parts of a class', () => {
  it('each preset has a role, and names are guessed sensibly', () => {
    for (const p of PART_PRESETS) expect(['warmup', 'build', 'peak', 'cooldown']).toContain(p.role);
    expect(partFor('Warm up').role).toBe('warmup');
    expect(partFor('Cool-down stretch').role).toBe('cooldown');
    expect(partFor('Arms').sections.length).toBeGreaterThan(0);
  });
  it('shares the class length out, adding up to the total', () => {
    for (const [total, roles] of [[50, ['warmup', 'build', 'build', 'cooldown']], [45, ['build']], [30, ['warmup', 'cooldown']], [60, ['warmup', 'build', 'peak', 'build', 'build', 'cooldown']]] as [number, string[]][]) {
      const m = splitMinutes(total, roles);
      expect(m.length).toBe(roles.length);
      expect(m.reduce((a, b) => a + b, 0)).toBe(total);
      expect(m.every((x) => x >= 1)).toBe(true);
    }
  });
});

describe('0.7.0: props for the whole flow', () => {
  it('flow props join the tally and are cleaned', () => {
    const c = drafted();
    changeClass(c.id, (p) => { p.props = [{ id: 'hand_weights', count: 2 }, { id: 'hand_weights', count: 5 }, { id: '', count: 1 } as never]; });
    const p = cleanPlan(planOf(c.id))!;
    expect(p.props?.filter((x) => x.id === 'hand_weights').length).toBe(1);
    const t = propsTally(p, studioOf(p.studioId));
    const hw = t.find((x) => x.id === 'hand_weights')!;
    expect(hw.whole).toBe(true);
    expect(hw.count).toBeGreaterThanOrEqual(1);
  });
});

describe('0.7.0: tick-offs in Play', () => {
  it('stay for the day and reset on another day', () => {
    const c = drafted();
    const [a, b] = ids(c, 1);
    setTick(c.id, a, true, '2026-11-28');
    setTick(c.id, b, true, '2026-11-28');
    setTick(c.id, b, false, '2026-11-28');
    expect([...ticksToday(classOf(c.id), '2026-11-28')]).toEqual([a]);
    expect(ticksToday(classOf(c.id), '2026-11-29').size).toBe(0);
    setTick(c.id, b, true, '2026-11-29');
    expect([...ticksToday(classOf(c.id), '2026-11-29')]).toEqual([b]);
    expect(ticksToday(classOf(c.id), '2026-11-28').size).toBe(0);
  });
  it('ticks survive cleaning, junk ticks do not', () => {
    const c = drafted();
    const [a] = ids(c, 1);
    setTick(c.id, a, true, '2026-11-28');
    expect(cleanPlan(classOf(c.id))!.ticks).toEqual({ day: '2026-11-28', ids: [a] });
    expect(cleanPlan({ ...classOf(c.id), ticks: { day: 'soon', ids: [a] } })!.ticks).toBeUndefined();
    expect(cleanPlan({ ...classOf(c.id), ticks: 'x' })!.ticks).toBeUndefined();
  });
});

describe('0.7.0: data from 0.6.0 comes across', () => {
  it('a 0.6.0 backup loads with no blocks and nothing lost', () => {
    const c = drafted();
    const old = JSON.parse(JSON.stringify(getData())) as Record<string, unknown>;
    delete old.blocks;
    delete old.favBlocks;
    for (const k of (old.classes as ClassPlan[])) { delete k.groups; delete k.props; delete k.ticks; }
    const d = cleanData(old);
    expect(d.blocks).toEqual([]);
    expect(d.favBlocks).toEqual([]);
    const back = d.classes.find((x) => x.id === c.id)!;
    expect(blockCount(back)).toBe(blockCount(c));
    expect(back.segments.map((s) => s.name)).toEqual(c.segments.map((s) => s.name));
  });
  it('favourite blocks that no longer exist are kept harmlessly', () => {
    const d = cleanData({ ...JSON.parse(JSON.stringify(getData())), favBlocks: ['bk1', 'bk1', ''] });
    expect(d.favBlocks).toEqual(['bk1']);
  });
});

describe('0.7.0: blocks sync between devices', () => {
  it('a saved block travels in a sync pack and is cleaned on arrival', () => {
    const c = drafted();
    saveBlock(makeBlock('Core burner', c.segments[1].items.filter((i) => !i.pause).slice(0, 2)));
    const mine = getData();
    expect([...keyed(mine).keys()].some((k) => k.startsWith('bl:'))).toBe(true);
    const pack = packOf(mine, 'Sarah', '2026-11-28T00:00:00.000Z');
    const empty = cleanData({});
    const r = merge(empty, pack, cleanSynced);
    expect(r.data.blocks.map((b) => b.name)).toEqual(['Core burner']);
    expect(cleanSynced('bl:x', { name: '', items: [] })).toBeNull();
  });
});

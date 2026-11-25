import { beforeEach, describe, expect, it } from 'vitest';
import { BASIC_MUSCLES, blankSetup, cleanData, cleanMovement, cleanPlan, cleanSettings, cleanStudio, defaultSetup, emptyData, newStudio, slugify } from '../src/lib/clean';
import { backupText, bringIn, classText, fileNameFor, packText, readIncoming, restoreBackup, studioText, FileProblem } from '../src/lib/files';
import { blockCount, canRedo, canUndo, changeClass, classDirty, classTypesFor, findItem, makePlan, nudge, planOf, propsTally, redoClass, saveOpenClass, startClass, undoClass } from '../src/lib/plan';
import { closeAllDrafts, isDirty, openDraft, editDraft } from '../src/lib/drafts';
import { nav, setGuard, setLeaveAsker } from '../src/ui/nav';
import { base32, fetchText, isSendCode, keyOf, offerText, open, seal, unbase32, type Lan } from '../src/lib/send';
import { _reset, analyse, applySetup, backupNudge, noteCopied, snoozeNudge, changeStudio, classOf, duplicateClass, fittedLibrary, getData, lastTaught, library, logTaught, removeStudio, saveClass, saveMovement, saveStudio, setHidden, setSettings, studioOf, usualStudio } from '../src/lib/store';
import { BRANDS, FOCUSES, MUSCLES, SECTIONS, sectionOf } from '../src/engine';
import { accentVars } from '../src/ui/theme';
import { _pose } from '../src/ui/Reformer';

const ALL = { classes: true, movements: true, studios: true, setup: true, series: true };
/** A studio that has been set up (the old default set-up, as an instructor would after a while). */
function studio(name = 'Harbour', brand = 'balanced_body') { const s = { ...newStudio(name, brand), reformers: 8, setup: defaultSetup(), props: { long_box: 1, short_box: 1, magic_circle: 2, hand_weights: 4, small_ball: 1, loop_band: 1 } }; saveStudio(s); return studioOf(s.id); }
function drafted(st = studio(), draft = true) {
  const ct = classTypesFor(st)[0];
  const plan = makePlan({ classType: ct, lengthMin: 50, level: 'mixed', goal: 'full_body', focusText: '', studio: st, draft });
  saveClass(plan);
  return classOf(plan.id)!;
}
beforeEach(() => { closeAllDrafts(); _reset(); });

describe('the library', () => {
  it('ships every movement and series, with unique names', () => {
    const lib = library();
    expect(lib.list.length).toBe(184);
    expect(lib.series.length).toBe(18);
    expect(new Set(lib.list.map((m) => m.slug)).size).toBe(184);
    for (const s of lib.series) for (const it of s.items) expect(lib.map[it.slug!], `${s.slug} → ${it.slug}`).toBeTruthy();
  });
  it('every shipped movement passes through cleaning unchanged', () => {
    for (const m of [...library().list, ...library().removed]) {
      const { source: _a, ...was } = JSON.parse(JSON.stringify(m)) as typeof m;
      if (was.load && was.load.lighterIsHarder === false) delete was.load.lighterIsHarder; // a plain "no" isn't kept
      if (Array.isArray(was.sources) && !was.sources.length) delete was.sources;
      const { source: _b, ...now } = cleanMovement(JSON.parse(JSON.stringify(m)))!;
      expect(now, m.slug).toEqual(was);
    }
  });
  it('a movement made from almost nothing gets safe values', () => {
    const m = cleanMovement({ name: 'Thing', apparatus: 'mat', cues: ['a', 'b'], load: { springs: ['medium'] } })!;
    expect(m.load).toBeNull();
    expect(m.cues).toBe('a\nb');
    expect(m.spine).toEqual(['neutral']);
    expect(m.purpose).toEqual({ strength: 0, stability: 0, flexibility: 0, mobility: 0 });
    expect(cleanMovement({ name: 'R', load: { springs: ['medium', 'nope'] } })!.load).toEqual({ springs: ['medium'] });
  });
  it('keeps your version of a movement, and hides without breaking classes', () => {
    const one = library().list[0];
    saveMovement({ ...one, summary: 'Mine now.' });
    expect(library().map[one.slug].summary).toBe('Mine now.');
    expect(library().list.length).toBe(184);
    setHidden(one.slug, true);
    expect(library().list.some((m) => m.slug === one.slug)).toBe(false);
    expect(library().map[one.slug]).toBeTruthy();
  });
});

describe('cleaning what comes in', () => {
  it('survives rubbish', () => {
    for (const junk of [null, 7, 'x', [], { classes: 'no', studios: [null, 3], settings: { theme: 'pink', textSize: 9 }, setup: { levels: 'x' } }]) {
      const d = cleanData(junk);
      expect(Array.isArray(d.classes)).toBe(true);
      expect(d.settings.theme).toBe('auto');
      expect(d.settings.trueBlack).toBe(true);
      expect(Array.isArray(d.studios)).toBe(true);
    }
  });
  it('keeps a plan in shape', () => {
    const p = cleanPlan({ title: '  A  ', lengthMin: 9999, segments: [{ name: 'Warm', role: 'warmup', items: [{ slug: 'footwork' }, { pause: true, label: 'Water', duration: 60 }, { nothing: 1 }] }, 'bad'] });
    expect(p.id).toBeTruthy();
    expect(p.lengthMin).toBeLessThanOrEqual(240);
    expect(p.segments.length).toBe(1);
    expect(p.segments[0].items.length).toBe(2);
    expect(p.segments[0].items.every((i) => i.id)).toBe(true);
  });
  it('keeps settings and studios in range', () => {
    expect(cleanSettings({ accent: 'own', ownAccent: 'red' }).accent).toBe('blue');
    expect(cleanSettings({ accent: 'own', ownAccent: '#aa33cc' }).ownAccent).toBe('#aa33cc');
    const s = cleanStudio({ name: '', brand: 'nope', reformers: -4 });
    expect(s.name).toBeTruthy();
    expect(s.brand).toBe('balanced_body');
    expect(s.reformers).toBeGreaterThanOrEqual(0);
    expect(slugify('Hundred — on the Box!')).toBe('hundred-on-the-box');
  });
});

describe('studios', () => {
  it('the first studio becomes the usual one, and removing it moves on', () => {
    const a = studio('A'); const b = studio('B');
    expect(usualStudio().id).toBe(a.id);
    const plan = drafted(a);
    removeStudio(a.id);
    expect(usualStudio().id).toBe(b.id);
    expect(classOf(plan.id)).toBeTruthy();
  });
  it('a class shows the springs of the studio it is taught at', () => {
    const bb = studio('BB', 'balanced_body'); const other = studio('Other', Object.keys(BRANDS as Record<string, unknown>).find((k) => k !== 'balanced_body')!);
    const plan = drafted(bb);
    const a = analyse(plan, bb); const b = analyse(plan, other);
    expect(a.count).toBe(b.count);
    expect(a.count).toBeGreaterThan(0);
    expect(a.hasReformer).toBe(true);
  });
});

describe('planning', () => {
  it('drafts a full class that fits its time', () => {
    const st = studio();
    const plan = drafted(st);
    expect(blockCount(plan)).toBeGreaterThan(5);
    const a = analyse(plan, st);
    expect(a.totalSec / 60).toBeGreaterThan(35);
    expect(a.totalSec / 60).toBeLessThan(60);
    for (const seg of plan.segments) for (const it of seg.items) if (!it.pause) expect(library().map[it.slug!]).toBeTruthy();
  });
  it('an empty class has its phases and no blocks', () => {
    const plan = drafted(studio(), false);
    expect(blockCount(plan)).toBe(0);
    expect(plan.segments.length).toBeGreaterThan(0);
  });
  it('undo and redo step through changes, and nothing is saved until Save', () => {
    const plan = drafted();
    const before = plan.title;
    changeClass(plan.id, (p) => { p.title = 'One'; });
    changeClass(plan.id, (p) => { p.title = 'Two'; });
    expect(classOf(plan.id)!.title).toBe(before);
    expect(classDirty(plan.id)).toBe(true);
    expect(canUndo(plan.id)).toBe(true);
    undoClass(plan.id); expect(planOf(plan.id)!.title).toBe('One');
    undoClass(plan.id); expect(planOf(plan.id)!.title).toBe(before);
    expect(classDirty(plan.id)).toBe(false);
    expect(canRedo(plan.id)).toBe(true);
    redoClass(plan.id); expect(planOf(plan.id)!.title).toBe('One');
    changeClass(plan.id, (p) => { p.title = 'Three'; });
    expect(canRedo(plan.id)).toBe(false);
    saveOpenClass(plan.id);
    expect(classOf(plan.id)!.title).toBe('Three');
    expect(classDirty(plan.id)).toBe(false);
    expect(canUndo(plan.id)).toBe(true);
  });
  it('a new class is not kept until it is saved', () => {
    const st = studio();
    const plan = makePlan({ classType: classTypesFor(st)[0], lengthMin: 45, level: 'beginner', goal: 'full_body', focusText: '', studio: st, draft: false });
    startClass(plan);
    expect(classOf(plan.id)).toBeUndefined();
    expect(planOf(plan.id)).toBeTruthy();
    expect(classDirty(plan.id)).toBe(true);
    saveOpenClass(plan.id);
    expect(classOf(plan.id)).toBeTruthy();
    expect(classDirty(plan.id)).toBe(false);
  });
  it('moves a block up and down, across phases', () => {
    const plan = drafted();
    const seg = plan.segments.find((s) => s.items.length > 1)!;
    const second = seg.items[1].id;
    changeClass(plan.id, (p) => nudge(p, second, -1));
    expect(findItem(planOf(plan.id)!, second)!.index).toBe(0);
    changeClass(plan.id, (p) => nudge(p, second, -1));
    const now = planOf(plan.id)!;
    expect(blockCount(now)).toBe(blockCount(plan));
    expect(findItem(now, second)).toBeTruthy();
  });
  it('a copy is its own class, and teaching is logged', () => {
    const st = studio(); const plan = drafted(st);
    const copy = duplicateClass(plan.id)!;
    expect(copy.id).not.toBe(plan.id);
    expect(copy.title).not.toBe(plan.title);
    logTaught(plan, st, 48);
    expect(lastTaught(plan.id)!.minutes).toBe(48);
    expect(getData().taught.length).toBe(1);
  });
});

describe('files', () => {
  it('a backup comes back whole', () => {
    const st = studio(); const plan = drafted(st);
    saveMovement({ ...library().list[3], summary: 'Edited' });
    setSettings({ accent: 'plum' });
    const text = backupText();
    _reset();
    const inc = readIncoming(text);
    expect(inc.kind).toBe('backup');
    restoreBackup(inc, 'replace');
    expect(classOf(plan.id)!.segments.length).toBe(plan.segments.length);
    expect(getData().studios[0].name).toBe('Harbour');
    expect(getData().settings.accent).toBe('plum');
    expect(Object.keys(getData().movements).length).toBe(1);
  });
  it('adding a backup keeps what is here', () => {
    drafted(studio('Away'));
    const text = backupText();
    _reset();
    const mine = drafted(studio('Home'));
    restoreBackup(readIncoming(text), 'add');
    expect(getData().classes.length).toBe(2);
    expect(getData().studios.map((s) => s.name).sort()).toEqual(['Away', 'Home']);
    expect(classOf(mine.id)).toBeTruthy();
  });
  it('a shared class brings its own movements and can bring its studio', () => {
    const st = studio('Shared studio');
    const base = library().list.find((m) => m.apparatus === 'reformer')!;
    saveMovement({ ...base, slug: 'my-own-thing', name: 'My own thing' });
    const plan = drafted(st);
    changeClass(plan.id, (p) => { p.segments[0].items.push({ id: 'x1', slug: 'my-own-thing' }); });
    saveOpenClass(plan.id);
    const text = classText(classOf(plan.id)!, st, { movements: true, studio: true });
    _reset();
    const inc = readIncoming(text);
    expect(inc.kind).toBe('class');
    const got = bringIn(inc, ALL);
    expect(got.classes).toBe(1);
    expect(got.movements).toBe(1);
    expect(got.studios).toBe(1);
    expect(library().map['my-own-thing'].name).toBe('My own thing');
    const mine = classOf(got.firstClass!)!;
    expect(mine.id).not.toBe(plan.id);
    expect(studioOf(mine.studioId).name).toBe('Shared studio');
  });
  it('bringing the same class in twice makes two classes, never overwrites', () => {
    const plan = drafted();
    const text = classText(plan, undefined, { movements: false, studio: false });
    bringIn(readIncoming(text), ALL);
    bringIn(readIncoming(text), ALL);
    expect(getData().classes.length).toBe(3);
  });
  it('a studio file round-trips, and nonsense is refused in plain words', () => {
    const st = studio('Loft');
    const inc = readIncoming(studioText(st));
    expect(inc.kind).toBe('studio');
    expect(inc.studios[0].name).toBe('Loft');
    for (const bad of ['', 'not json', '{"a":1}', '[]', JSON.stringify({ plentyflow: 'backup', version: 99, data: {} })]) expect(() => readIncoming(bad), bad).toThrow(FileProblem);
    expect(fileNameFor('Full body / Flow?', 'class')).toMatch(/^[\w.-]+\.json$/);
  });
  it('the default set-up is complete', () => {
    const s = defaultSetup();
    expect(s.classTypes.length).toBeGreaterThan(0);
    expect(s.levels.length).toBe(6);
    const b = blankSetup();
    expect(b.classTypes).toEqual([]);
    expect(b.lengths).toEqual([]);
    expect(b.levels.map((l) => l.id)).toEqual(['beginner', 'intermediate', 'advanced']);
    expect(b.focuses.length).toBe(0);
    const fresh = newStudio('New');
    expect(fresh.props).toEqual({});
    expect(fresh.setup.classTypes).toEqual([]);
    expect(classTypesFor(fresh)).toEqual([]);
    expect(emptyData().settings.welcomed).toBe(false);
  });
});

describe('0.2.0: everything belongs to a studio', () => {
  it('a new studio starts blank: a few basic muscles and parts, the core levels, nothing else', () => {
    const s = newStudio('Fresh');
    expect(s.setup.classTypes).toEqual([]);
    expect(s.setup.focuses).toEqual([]);
    expect(s.setup.lengths).toEqual([]);
    expect(s.props).toEqual({});
    applySetup(s.setup);
    expect((MUSCLES as { id: string }[]).map((m) => m.id).sort()).toEqual([...BASIC_MUSCLES].sort());
    expect((SECTIONS as { id: string }[]).map((x) => x.id).sort()).toEqual(['back_shoulders', 'core', 'lower', 'stretch']);
    // a movement filed under a part the studio doesn't have lands in the basic part it maps to
    expect(sectionOf({ section: 'chest_arms' })).toBe('back_shoulders');
    // and it survives a save and a reload
    const back = cleanData(JSON.parse(JSON.stringify({ ...emptyData(), studios: [s] })));
    expect(back.studios[0].setup.removedMuscles.length).toBe(s.setup.removedMuscles.length);
    expect(back.studios[0].setup.focuses).toEqual([]);
  });
  it('a studio change saves only that studio', () => {
    const a = studio('A'); const b = studio('B');
    changeStudio(a.id, (s) => { s.setup.focuses = [...s.setup.focuses, { id: 'x', label: 'Runners', muscles: [] }]; });
    expect(studioOf(a.id).setup.focuses.some((f) => f.label === 'Runners')).toBe(true);
    expect(studioOf(b.id).setup.focuses.some((f) => f.label === 'Runners')).toBe(false);
  });
  it('springs follow the studio: a studio without a spring never gets it, anywhere', () => {
    const st = studio('Two springs only');
    saveStudio({ ...st, springs: { light: 1, heavy: 4 } });
    const s = studioOf(st.id);
    const fitted = fittedLibrary(s);
    for (const m of Object.values(fitted)) for (const l of [...(m.load?.springs || []), ...(m.load?.advance || [])]) expect(['light', 'heavy'], m.slug).toContain(l);
    const plan = drafted(s);
    const a = analyse(plan, s) as unknown as { springPlan: { loads: string[] }[] };
    for (const p of a.springPlan) for (const l of p.loads) expect(['light', 'heavy']).toContain(l);
  });
  it("a block shows the spring the class actually uses, the same in the list and inside", () => {
    const st = studio();
    const plan = drafted(st);
    const a = analyse(plan, st) as unknown as { springPlan: { itemId: string; pass: number; loads: string[] }[] };
    const ids = new Set(plan.segments.flatMap((s) => s.items.filter((i) => i.slug && library().map[i.slug]?.apparatus === 'reformer').map((i) => i.id)));
    for (const id of ids) expect(a.springPlan.some((p) => p.itemId === id && p.pass === 1), id).toBe(true);
  });
  it('props: a tally of what blocks use, including props added to a block', () => {
    const st = studio();
    const plan = drafted(st);
    const first = plan.segments.find((s) => s.items.length)!.items[0];
    changeClass(plan.id, (p) => { const i = findItem(p, first.id)!.item; i.props = ['ankle_weights_x']; p.extraProps = [{ id: 'ankle_weights_x', label: 'Ankle weights' }]; });
    const tally = propsTally(planOf(plan.id)!);
    expect(tally.find((x) => x.id === 'ankle_weights_x')).toEqual({ id: 'ankle_weights_x', label: 'Ankle weights', blocks: 1 });
    saveOpenClass(plan.id);
    const back = cleanData(JSON.parse(JSON.stringify(getData())));
    const kept = back.classes.find((c) => c.id === plan.id)!;
    expect(findItem(kept, first.id)!.item.props).toEqual(['ankle_weights_x']);
    expect(kept.extraProps).toEqual([{ id: 'ankle_weights_x', label: 'Ankle weights' }]);
  });
  it('a pack carries a studio with its set-up, and comes back as the same studio', () => {
    const st = studio('Packed');
    changeStudio(st.id, (s) => { s.setup.classTypes = s.setup.classTypes.slice(0, 2); s.props = { magic_circle: 3 }; });
    drafted(studioOf(st.id));
    saveMovement({ ...library().list[0], summary: 'Mine' });
    const inc = readIncoming(packText(studioOf(st.id), { classes: 'studio' }));
    expect(inc.kind).toBe('pack');
    expect(inc.studios[0].name).toBe('Packed');
    expect(inc.studios[0].setup.classTypes.length).toBe(2);
    expect(inc.studios[0].props).toEqual({ magic_circle: 3 });
    expect(inc.classes.length).toBe(1);
    expect(inc.movements.length).toBe(1);
  });
  it('settings: true black on by default, accessibility off, and both survive cleaning', () => {
    const s = cleanSettings({});
    expect(s.trueBlack).toBe(true);
    expect(Object.values(s.a11y).every((x) => x === false)).toBe(true);
    expect(cleanSettings({ trueBlack: false, a11y: { bold: true, nonsense: true } }).a11y).toMatchObject({ bold: true, contrast: false });
    expect(cleanSettings({ trueBlack: false }).trueBlack).toBe(false);
  });
  it('notes on movements are kept, and an empty note is removed', () => {
    const d = cleanData({ v: 2, notes: { footwork: 'Watch the knees', '': 'x', bad: '' } });
    expect(d.notes).toEqual({ footwork: 'Watch the knees' });
  });
});

describe('0.3.0: Plenty Flow', () => {
  it('reminds to copy a backup off the device only once there is work, and stops after a copy or Not now', () => {
    expect(backupNudge()).toBeNull();
    const st = studio();
    for (let i = 0; i < 4; i++) drafted(st);
    expect(backupNudge()).toBe('first');
    snoozeNudge(3);
    expect(backupNudge()).toBeNull();
    expect(backupNudge(Date.now() + 4 * 864e5)).toBe('first');
    noteCopied();
    expect(backupNudge()).toBeNull();
    drafted(st);
    expect(backupNudge()).toBeNull();
    expect(backupNudge(Date.now() + 15 * 864e5)).toBe('old');
    for (let i = 0; i < 20; i++) saveStudio(studioOf(st.id));
    expect(backupNudge()).toBe('lots');
  });
  it('files are Plenty Flow files, and old OpenPilates ones are refused in plain words', () => {
    expect(JSON.parse(backupText()).plentyflow).toBe('backup');
    expect(() => readIncoming(JSON.stringify({ openpilates: 'flow', flow: {} }))).toThrow(FileProblem);
    expect(fileNameFor('Mon AM', 'class')).toBe('mon-am.plentyflow.json');
  });
  it('the jumping figure keeps its leg length in every frame', () => {
    for (let o = 0; o >= -40; o -= 0.5) {
      const p = _pose(o);
      const thigh = Math.hypot(p.knee[0] - p.hx, p.knee[1] - p.hy), shin = Math.hypot(p.foot[0] - p.knee[0], p.foot[1] - p.knee[1]);
      expect(thigh + shin).toBeGreaterThan(39.3);
      expect(thigh + shin).toBeLessThan(40.01);
    }
  });
  it('settings start with no name and the blue colour', () => {
    const s = cleanSettings({});
    expect(s.deviceName).toBe('');
    expect(s.accent).toBe('blue');
    expect(s.welcomed).toBe(false);
  });
});

describe('0.2.0: leaving unsaved work asks first', () => {
  const answers: ('save' | 'leave' | null)[] = [];
  let asked = 0;
  beforeEach(() => { nav.reset(); asked = 0; setLeaveAsker(async () => { asked++; return answers.shift() ?? null; }); });
  it('back with nothing changed just goes back', async () => {
    nav.go({ name: 'studio', id: 's1' }, 'more');
    openDraft('studio:s1', { name: 'A' });
    setGuard('more', 1, { key: 'studio:s1', what: 'this studio', save: () => true });
    await nav.back();
    expect(asked).toBe(0);
    expect(nav.get().stacks.more.length).toBe(0);
  });
  it('Keep editing stays; Leave drops the changes; Save saves them', async () => {
    let saved = 0;
    for (const answer of [null, 'leave', 'save'] as const) {
      nav.reset();
      nav.go({ name: 'studio', id: 's1' }, 'more');
      openDraft('studio:s1', { name: 'A' });
      editDraft<{ name: string }>('studio:s1', (x) => { x.name = 'B'; });
      setGuard('more', 1, { key: 'studio:s1', what: 'this studio', save: () => { saved++; return true; } });
      answers.push(answer);
      await nav.back();
      expect(nav.get().stacks.more.length).toBe(answer ? 0 : 1);
      if (answer) expect(isDirty('studio:s1')).toBe(false);
      setGuard('more', 1, null);
    }
    expect(saved).toBe(1);
  });
  it('the class screen still asks after a screen was opened on top of it and closed again', async () => {
    nav.go({ name: 'class', id: 'c2' }, 'classes');
    openDraft('class:c2', { t: 1 });
    editDraft<{ t: number }>('class:c2', (x) => { x.t = 2; });
    setGuard('classes', 1, { key: 'class:c2', what: 'this class', save: () => true });
    nav.go({ name: 'block', id: 'c2' }, 'classes');
    answers.push(null);
    await nav.home('classes');
    expect(asked).toBe(1);
    expect(nav.get().stacks.classes.length).toBe(2);
    await nav.back();
    expect(asked).toBe(1);
    answers.push('save');
    await nav.back();
    expect(asked).toBe(2);
  });
  it('going back from a screen inside the same work (a block in a class) does not ask', async () => {
    nav.go({ name: 'class', id: 'c1' }, 'classes');
    nav.go({ name: 'class-part', id: 'c1' }, 'classes');
    openDraft('class:c1', { t: 1 });
    editDraft<{ t: number }>('class:c1', (x) => { x.t = 2; });
    setGuard('classes', 1, { key: 'class:c1', what: 'this class', save: () => true });
    setGuard('classes', 2, { key: 'class:c1', what: 'this class', save: () => true });
    await nav.back();
    expect(asked).toBe(0);
    expect(isDirty('class:c1')).toBe(true);
    answers.push('leave');
    await nav.back();
    expect(asked).toBe(1);
    expect(isDirty('class:c1')).toBe(false);
  });
});

describe('sending over Wi-Fi', () => {
  // Two devices on a pretend network: the listener's handler is called by the dialler.
  function network(): { a: Lan; b: Lan } {
    const open: Record<number, (conn: string, frame: Uint8Array) => Promise<Uint8Array | null>> = {};
    const make = (ip: string): Lan => ({
      localIp: async () => ip,
      dial: async (_host, port) => { const h = open[port]; if (!h) throw new Error('nothing there'); return { ask: async (f) => { const r = await h('c1', f); if (!r) throw new Error('hung up'); return r; }, close: () => undefined }; },
      listen: async (onFrame: (conn: string, frame: Uint8Array) => Promise<Uint8Array | null>) => { const port = 40000 + Object.keys(open).length; open[port] = onFrame; return { port, stop: () => { delete open[port]; } }; },
    } as unknown as Lan);
    return { a: make('192.168.1.10'), b: make('192.168.1.11') };
  }
  it('seals and opens, and refuses a changed message or the wrong key', () => {
    const key = keyOf(new Uint8Array(16).fill(3));
    const box = seal(key, { op: 'hello', n: 1 });
    expect(open(key, box)).toEqual({ op: 'hello', n: 1 });
    const bent = box.slice(); bent[bent.length - 1] ^= 1;
    expect(() => open(key, bent)).toThrow();
    expect(() => open(keyOf(new Uint8Array(16).fill(4)), box)).toThrow();
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 9, 8, 7, 6]);
    expect([...unbase32(base32(bytes))]).toEqual([...bytes]);
  });
  it('sends a big class from one device to another, once', async () => {
    const { a, b } = network();
    const text = JSON.stringify({ plentyflow: 'flow', pad: 'x'.repeat(700_000) + Math.random() });
    const offer = await offerText(a, text, { name: "Sarah's iPhone", what: 'a class' });
    expect(isSendCode(offer.code)).toBe(true);
    expect(isSendCode('https://example.com')).toBe(false);
    const got = await fetchText(b, offer.code);
    expect(got.text).toBe(text);
    expect(got.from).toBe("Sarah's iPhone");
    expect(await offer.done).toBe('sent');
    await expect(fetchText(b, offer.code)).rejects.toThrow();
  });
  it('a code that was stopped, or made up, gets a plain answer', async () => {
    const { a, b } = network();
    const offer = await offerText(a, 'hello', { name: 'A', what: 'a class' });
    offer.stop();
    expect(await offer.done).toBe('stopped');
    await expect(fetchText(b, offer.code)).rejects.toThrow();
    await expect(fetchText(b, 'PLENTYFLOW-SEND:1:AAAA:192.168.1.10:1')).rejects.toThrow();
  });
});

describe('colours', () => {
  const lum = (h: string) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  it('any colour stays readable in light and dark', () => {
    for (const c of ['#0F6E62', '#FFE600', '#FFFFFF', '#000000', '#FF69B4', '#2B2B2B', '#7FFFD4']) {
      const l = accentVars(c, false); const d = accentVars(c, true);
      expect(ratio(l['--accent'], '#FFFFFF'), `${c} light text`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(l['--on-accent'], l['--accent-fill']), `${c} light button`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(d['--accent'], '#1A2220'), `${c} dark text`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(d['--on-accent'], d['--accent-fill']), `${c} dark button`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('a new studio starts with no focuses', () => {
  it('keeps the focus list empty and makes a flow with no focus', () => {
    const s = newStudio('Empty Studio');
    applySetup(s.setup);
    expect(FOCUSES.length).toBe(0);
    s.setup.classTypes = [{ id: 'ct1', name: 'Reformer Flow', apparatus: 'reformer', lengthMin: 50, springBudget: 0, phases: [] } as never];
    const plan = makePlan({ classType: s.setup.classTypes[0], lengthMin: 50, level: 'beginner', goal: '', focusText: 'Hips', studio: s, draft: false });
    expect(plan.goal).toBe('');
    expect(plan.focusText).toBe('Hips');
    applySetup(defaultSetup());
    expect(FOCUSES.length).toBeGreaterThan(0);
  });
});

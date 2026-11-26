// 0.6.0: Home, welcome lines, reordering, sections, the app icon, and old data coming across.
import { beforeEach, describe, expect, it } from 'vitest';
import { APP_ICONS, MAX_WELCOME, WELCOME_LINES, cleanSettings, defaultSetup, newStudio } from '../src/lib/clean';
import { welcomeLine } from '../src/lib/welcome';
import { blockCount, changeClass, classTypesFor, findItem, makePlan, moveItem, planOf, undoClass } from '../src/lib/plan';
import { closeAllDrafts } from '../src/lib/drafts';
import { _reset, classOf, library, saveClass, saveStudio, studioOf } from '../src/lib/store';
import { bySection, sectionColour, sectionsInOrder } from '../src/ui/sections';
import { ICON_LOOKS, iconSetName, iconSvg } from '../src/lib/appicon';
import { nav } from '../src/ui/nav';
import { readFileSync } from 'node:fs';

beforeEach(() => { closeAllDrafts(); _reset(); });
function drafted() {
  const s = { ...newStudio('Harbour', 'balanced_body'), reformers: 8, setup: defaultSetup(), props: { long_box: 1, short_box: 1, magic_circle: 2, hand_weights: 4, small_ball: 1, loop_band: 1 } };
  saveStudio(s);
  const st = studioOf(s.id);
  const plan = makePlan({ classType: classTypesFor(st)[0], lengthMin: 50, level: 'mixed', goal: 'full_body', focusText: '', studio: st, draft: true });
  saveClass(plan);
  return classOf(plan.id)!;
}

describe('0.6.0: settings from 0.5.0 come across', () => {
  it('a 0.5.0 settings block gets the welcome lines and the app icon', () => {
    const old = { theme: 'dark', accent: 'teal', holidays: false, opening: true, deviceName: 'Sarah' };
    const s = cleanSettings(old);
    expect(s.theme).toBe('dark');
    expect(s.accent).toBe('teal');
    expect(s.holidays).toBe(false);
    expect(s.deviceName).toBe('Sarah');
    expect(s.welcome.daily).toBe(true);
    expect(s.welcome.lines).toEqual(WELCOME_LINES);
    expect(s.appIcon).toBe('');
  });
  it('cleans welcome lines: trims, drops blanks and repeats, at most 31', () => {
    const lines = ['  One  ', '', 'one', 'Two', ...Array.from({ length: 40 }, (_, i) => `Line ${i}`)];
    const s = cleanSettings({ welcome: { daily: false, lines, pick: 'Mine' } });
    expect(s.welcome.lines.length).toBeLessThanOrEqual(MAX_WELCOME);
    expect(s.welcome.lines[0]).toBe('One');
    expect(s.welcome.lines.filter((l) => l.toLowerCase() === 'one').length).toBe(1);
    expect(s.welcome.lines).not.toContain('');
    expect(s.welcome.daily).toBe(false);
    expect(s.welcome.pick).toBe('Mine');
  });
  it('keeps an empty list (all deleted) and a blank pick (no line)', () => {
    const s = cleanSettings({ welcome: { daily: true, lines: [], pick: '' } });
    expect(s.welcome.lines).toEqual([]);
    expect(welcomeLine(s.welcome)).toBe('');
  });
  it('only knows the app icons there are', () => {
    expect(cleanSettings({ appIcon: 'teal' }).appIcon).toBe('teal');
    expect(cleanSettings({ appIcon: 'AppIcon-teal' }).appIcon).toBe('');
    expect(cleanSettings({ appIcon: 42 }).appIcon).toBe('');
  });
});

describe('0.6.0: the welcome line', () => {
  const w = { daily: true, lines: ['A', 'B', 'C'], pick: 'Picked' };
  it('changes each day and comes back round', () => {
    const d = (s: string) => new Date(`${s}T09:00`);
    const seen = ['2026-12-01', '2026-12-02', '2026-12-03'].map((x) => welcomeLine(w, d(x)));
    expect(new Set(seen).size).toBe(3);
    expect(welcomeLine(w, d('2026-12-04'))).toBe(seen[0]);
  });
  it('is the same all day, morning and night', () => {
    expect(welcomeLine(w, new Date('2026-12-01T00:05'))).toBe(welcomeLine(w, new Date('2026-12-01T23:55')));
  });
  it('shows the picked line when daily is off', () => {
    expect(welcomeLine({ ...w, daily: false }, new Date())).toBe('Picked');
    expect(welcomeLine({ ...w, daily: false, pick: '' }, new Date())).toBe('');
  });
});

describe('0.6.0: reordering a flow', () => {
  it('moves a block within a part and to another part, and undo puts it back', () => {
    const plan = drafted();
    const [a, b] = plan.segments.filter((s) => s.items.length > 1);
    const item = a.items[0].id;
    const before = blockCount(plan);
    changeClass(plan.id, (p) => moveItem(p, item, a.id, 2));
    expect(findItem(planOf(plan.id)!, item)!.index).toBe(1); // dropped before the old third block
    changeClass(plan.id, (p) => moveItem(p, item, b.id, 0));
    let now = planOf(plan.id)!;
    expect(findItem(now, item)!.seg.id).toBe(b.id);
    expect(findItem(now, item)!.index).toBe(0);
    expect(blockCount(now)).toBe(before);
    undoClass(plan.id);
    now = planOf(plan.id)!;
    expect(findItem(now, item)!.seg.id).toBe(a.id);
  });
  it('moves to the end of a part, and ignores blocks or parts that are not there', () => {
    const plan = drafted();
    const seg = plan.segments.find((s) => s.items.length > 1)!;
    const first = seg.items[0].id;
    changeClass(plan.id, (p) => moveItem(p, first, seg.id, 999));
    const now = planOf(plan.id)!;
    const s2 = now.segments.find((s) => s.id === seg.id)!;
    expect(s2.items[s2.items.length - 1].id).toBe(first);
    const copy = JSON.stringify(now);
    changeClass(plan.id, (p) => { moveItem(p, 'nope', seg.id, 0); moveItem(p, first, 'nope', 0); });
    expect(JSON.stringify(planOf(plan.id))).toBe(copy);
  });
});

describe('0.6.0: movements in sections', () => {
  it('groups every movement once, A to Z inside each section', () => {
    const list = library().list;
    const groups = bySection(list);
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(list.length);
    for (const g of groups) {
      const names = g.items.map((m) => m.name);
      expect(names).toEqual([...names].sort((x, y) => x.localeCompare(y, undefined, { sensitivity: 'base' })));
    }
  });
  it('puts a part of the class\'s own sections first', () => {
    const groups = bySection(library().list, ['stretch', 'core']);
    expect(groups[0].id).toBe('stretch');
    expect(groups[1].id).toBe('core');
  });
  it('gives every section its own colour', () => {
    const cols = sectionsInOrder().map((s) => sectionColour(s.id));
    expect(new Set(cols).size).toBe(cols.length);
  });
});

describe('0.6.0: the app icon', () => {
  it('has a look for every icon id, with the app\'s own first', () => {
    expect(ICON_LOOKS.map((l) => l.id)).toEqual([...APP_ICONS].sort((a, b) => ICON_LOOKS.findIndex((l) => l.id === a) - ICON_LOOKS.findIndex((l) => l.id === b)));
    expect(new Set(ICON_LOOKS.map((l) => l.id))).toEqual(new Set(APP_ICONS));
    expect(ICON_LOOKS[0].id).toBe('');
    expect(iconSetName('')).toBeNull();
    expect(iconSetName('teal')).toBe('AppIcon-teal');
    expect(iconSetName('nope')).toBeNull();
  });
  it('every icon the app can switch to is built into the iPhone app', () => {
    const pbx = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
    const lines = pbx.match(/ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = "([^"]+)";/g) || [];
    expect(lines.length).toBe(2); // Debug and Release
    for (const line of lines) {
      const names = line.split('"')[1].split(' ');
      expect(new Set(names)).toEqual(new Set(ICON_LOOKS.filter((l) => l.id).map((l) => iconSetName(l.id))));
    }
    for (const l of ICON_LOOKS.filter((x) => x.id)) {
      const dir = `ios/App/App/Assets.xcassets/${iconSetName(l.id)}.appiconset`;
      const c = JSON.parse(readFileSync(`${dir}/Contents.json`, 'utf8'));
      const png = readFileSync(`${dir}/${c.images[0].filename}`);
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(1024);
    }
  });
  it('draws each icon as a picture with its own clip', () => {
    const ids = new Set<string>();
    for (const l of ICON_LOOKS) {
      const svg = iconSvg(l.id, 60);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain(l.bg);
      ids.add(svg.match(/clipPath id="([^"]+)"/)![1]);
    }
    expect(ids.size).toBe(ICON_LOOKS.length); // the picker shows them together on one page
  });
});

describe('0.6.0: Home is the first tab', () => {
  it('starts on Home and comes back to it after a reset', async () => {
    nav.reset();
    expect(nav.get().tab).toBe('home');
    await nav.tab('calendar');
    expect(nav.get().tab).toBe('calendar');
    nav.reset();
    expect(nav.get().tab).toBe('home');
  });
});

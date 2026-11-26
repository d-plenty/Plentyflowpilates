// 0.5.0: holiday themes, their dates, their pictures and the settings that go with them.
import { describe, expect, it } from 'vitest';
import { cleanSettings } from '../src/lib/clean';
import { easterSunday, holidayOn, holidayWindow, HOLIDAYS, themeOn } from '../src/lib/holidays';
import { picture, THEMES } from '../src/ui/art/scenes';
import type { ThemeKey } from '../src/lib/holidays';

const day = (s: string) => new Date(`${s}T12:00`);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('0.5.0: when each holiday shows', () => {
  it('works out Easter Sunday', () => {
    expect(iso(easterSunday(2025))).toBe('2025-04-20');
    expect(iso(easterSunday(2026))).toBe('2026-04-05');
    expect(iso(easterSunday(2027))).toBe('2027-03-28');
    expect(iso(easterSunday(2028))).toBe('2028-04-16');
    expect(iso(easterSunday(2038))).toBe('2038-04-25');
  });
  it('starts and ends each holiday on the agreed days', () => {
    const edges: [string, ThemeKey | null][] = [
      ['2026-11-30', null], ['2026-12-01', 'christmas'], ['2026-12-26', 'christmas'],
      ['2026-12-27', 'newyear'], ['2026-12-31', 'newyear'], ['2027-01-01', 'newyear'],
      ['2027-01-02', 'ausday'], ['2027-01-26', 'ausday'], ['2027-01-27', 'ausday'], ['2027-01-28', null],
      ['2027-02-27', null], ['2027-02-28', 'easter'], ['2027-03-29', 'easter'], ['2027-03-30', 'easter'], ['2027-03-31', null],
      ['2026-09-30', null], ['2026-10-01', 'halloween'], ['2026-10-31', 'halloween'], ['2026-11-01', 'halloween'], ['2026-11-02', null],
    ];
    for (const [d, want] of edges) expect([d, holidayOn(day(d))]).toEqual([d, want]);
  });
  it('never has two holidays on one day, in any year', () => {
    for (const y of [2026, 2027, 2028, 2035, 2038]) {
      const wins = HOLIDAYS.map((k) => holidayWindow(k, y));
      for (let i = 0; i < wins.length; i++) for (let j = i + 1; j < wins.length; j++) {
        const [a, b] = wins[i], [c, e] = wins[j];
        expect(a > e || c > b).toBe(true);
      }
    }
  });
  it('shows the default theme all year when holiday themes are off', () => {
    expect(themeOn(day('2026-12-25'), true)).toBe('christmas');
    expect(themeOn(day('2026-12-25'), false)).toBe('default');
    expect(themeOn(day('2026-07-01'), true)).toBe('default');
  });
});

describe('0.5.0: the pictures', () => {
  const keys = Object.keys(THEMES) as ThemeKey[];
  it('draws every theme by day and by night, as an opening and as the home panel, with nothing missing', () => {
    for (const k of keys) for (const night of [false, true]) {
      for (const svg of [picture(k, night, 'open', { moving: true, words: true }), picture(k, night, 'open'), picture(k, night, 'panel')]) {
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).not.toMatch(/NaN|undefined|Infinity|\[object/);
      }
    }
  });
  it('the home panel and a still opening do not move', () => {
    for (const k of keys) {
      for (const svg of [picture(k, false, 'panel'), picture(k, true, 'open')]) {
        expect(svg).toContain('class="pf still"');
        expect(svg).not.toContain('<animate');
      }
      // the opening plays: one jump, its legs bending as the carriage moves
      expect(picture(k, false, 'open', { moving: true })).toContain('attributeName="points"');
    }
  });
  it('gives every picture its own ids, so two on one screen never mix', () => {
    const ids = (s: string) => [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    const a = ids(picture('ausday', false, 'open', { moving: true })), b = ids(picture('ausday', false, 'open', { moving: true }));
    expect(a.length).toBeGreaterThan(10);
    expect(a.filter((x) => b.includes(x))).toEqual([]);
  });
  it('says what is in each picture for VoiceOver, and writes the holiday on the opening', () => {
    expect(picture('christmas', false, 'open', { words: true })).toMatch(/aria-label="[^"]*Santa[^"]*"/);
    expect(picture('christmas', false, 'open', { words: true })).toContain('Merry Christmas');
    expect(picture('default', false, 'open', { words: true })).toContain('PILATES CLASS PLANNER');
  });
});

describe('0.5.0: look settings', () => {
  it('turns holiday themes and the opening on for everyone, including after the update', () => {
    const fresh = cleanSettings({});
    expect(fresh.holidays).toBe(true);
    expect(fresh.opening).toBe(true);
    // settings saved by 0.4.0 have neither: both come on
    const old = cleanSettings({ theme: 'dark', accent: 'teal', welcomed: true });
    expect([old.holidays, old.opening, old.theme, old.accent]).toEqual([true, true, 'dark', 'teal']);
    const off = cleanSettings({ holidays: false, opening: false });
    expect([off.holidays, off.opening]).toEqual([false, false]);
  });
});

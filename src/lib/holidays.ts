// Which theme is showing: the default one, or a holiday's, from the phone's own date and time.
// Each holiday runs from the start of its month (or a few weeks before, for Easter, which moves) to
// the day after. No internet is needed.

export type ThemeKey = 'default' | 'christmas' | 'newyear' | 'ausday' | 'easter' | 'halloween';
export type HolidayKey = Exclude<ThemeKey, 'default'>;

/** Easter Sunday in the Gregorian calendar (the anonymous algorithm, as used by Western churches). */
export function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const plusDays = (d: Date, k: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);

/** The first and last day a holiday shows, for the year the date falls in. */
export function holidayWindow(key: HolidayKey, year: number): [Date, Date] {
  switch (key) {
    case 'christmas': return [new Date(year, 11, 1), new Date(year, 11, 26)];
    case 'newyear': return [new Date(year - 1, 11, 27), new Date(year, 0, 1)];
    case 'ausday': return [new Date(year, 0, 2), new Date(year, 0, 27)];
    // four weeks before Easter Sunday, to the day after Easter Monday
    case 'easter': { const e = easterSunday(year); return [plusDays(e, -28), plusDays(e, 2)]; }
    case 'halloween': return [new Date(year, 9, 1), new Date(year, 10, 1)];
  }
}
export const HOLIDAYS: HolidayKey[] = ['christmas', 'newyear', 'ausday', 'easter', 'halloween'];

/** The holiday showing on this day, if any. */
export function holidayOn(date: Date): HolidayKey | null {
  const t = dayOf(date), y = date.getFullYear();
  for (const key of HOLIDAYS) {
    // New Year's window starts in the December before, so check next year's too
    for (const year of key === 'newyear' ? [y, y + 1] : [y]) {
      const [a, b] = holidayWindow(key, year);
      if (t >= dayOf(a) && t <= dayOf(b)) return key;
    }
  }
  return null;
}

/** The theme to show: a holiday's while it's on (unless holiday themes are turned off). */
export const themeOn = (date: Date, holidays: boolean): ThemeKey => (holidays ? holidayOn(date) || 'default' : 'default');

/** When each one shows, in words, for Look and colours. */
export const WHEN: Record<HolidayKey, string> = {
  christmas: '1–26 December', newyear: '27 December – 1 January', ausday: '2–27 January',
  easter: 'The 4 weeks before Easter', halloween: '1 October – 1 November',
};

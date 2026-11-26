// The line under the Home welcome: one from the list, a new one each day, or the one picked.
import type { Settings } from './types';

/** Days since 1 January 1970 by the phone's own calendar, so the line changes at local midnight. */
const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

/** Today's line. Blank means show no line. */
export function welcomeLine(w: Settings['welcome'], date = new Date()): string {
  if (!w.daily) return w.pick;
  return w.lines.length ? w.lines[dayNumber(date) % w.lines.length] : '';
}

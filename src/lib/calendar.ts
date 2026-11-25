// The calendar: shifts (a block of classes on one day at one studio), saved shifts to reuse,
// hours and pay, calendar files (.ics), and how long the history is kept.
// Dates and times are the device's local ones, as strings: "2026-11-28" and "07:00".
import { nowIso, uid, cleanShift } from './clean';
import { getData, update } from './store';
import type { ClassPlan, Settings, Shift, ShiftTemplate, Slot } from './types';

// ---- dates
const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDate(new Date());
export const dateOf = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (iso: string, n: number) => { const d = dateOf(iso); d.setDate(d.getDate() + n); return isoDate(d); };
export const minutesOf = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const timeOf = (mins: number) => `${pad(Math.floor(((mins % 1440) + 1440) % 1440 / 60))}:${pad(((mins % 60) + 60) % 60)}`;
/** "7:00am" */
export function clock(t: string): string {
  const m = minutesOf(t);
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${pad(m % 60)}${h < 12 ? 'am' : 'pm'}`;
}
export const dayName = (iso: string, style: 'long' | 'short' = 'long') => dateOf(iso).toLocaleDateString(undefined, { weekday: style });
export const niceDate = (iso: string) => dateOf(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
/** Monday of the week the date is in. */
export const weekStart = (iso: string) => addDays(iso, -((dateOf(iso).getDay() + 6) % 7));
export const monthStart = (iso: string) => iso.slice(0, 8) + '01';
export const monthEnd = (iso: string) => { const d = dateOf(monthStart(iso)); d.setMonth(d.getMonth() + 1); d.setDate(0); return isoDate(d); };

// ---- shifts
export const slotEnd = (k: Slot) => timeOf(minutesOf(k.start) + k.lengthMin);
export const liveSlots = (s: Shift) => (s.cancelled ? [] : s.slots.filter((k) => !k.cancelled));
export function shiftSpan(s: Shift): { start: string; end: string } {
  const ks = s.slots.length ? s.slots : [{ start: '09:00', lengthMin: 0 } as Slot];
  return { start: ks[0].start, end: ks.reduce((e, k) => (slotEnd(k) > e ? slotEnd(k) : e), slotEnd(ks[0])) };
}
export const sortShifts = (list: Shift[]) => [...list].sort((a, b) => a.date.localeCompare(b.date) || shiftSpan(a).start.localeCompare(shiftSpan(b).start));
export const shiftsOn = (date: string) => sortShifts(getData().shifts.filter((s) => s.date === date));
export const shiftsBetween = (from: string, to: string) => sortShifts(getData().shifts.filter((s) => s.date >= from && s.date <= to));
export const shiftOf = (id?: string) => getData().shifts.find((s) => s.id === id);
/** Every calendar place a flow is planned in, soonest first. */
export function plannedFor(flowId: string): { shift: Shift; slot: Slot }[] {
  const out: { shift: Shift; slot: Slot }[] = [];
  for (const s of sortShifts(getData().shifts)) for (const k of s.slots) if (k.flowId === flowId) out.push({ shift: s, slot: k });
  return out;
}
export const nextPlanned = (flowId: string) => plannedFor(flowId).find((p) => p.shift.date >= today() && !p.slot.cancelled && !p.shift.cancelled);

/** Classes laid out one after the other from a start time. */
export function laidOut(start: string, gapMin: number, slots: { lengthMin: number; classType?: string }[]): Slot[] {
  let at = minutesOf(start);
  return slots.map((x) => { const k: Slot = { id: uid('k'), start: timeOf(at), lengthMin: x.lengthMin, ...(x.classType ? { classType: x.classType } : {}) }; at += x.lengthMin + gapMin; return k; });
}
export function fromTemplate(t: ShiftTemplate, date: string, studioId = t.studioId): Shift {
  return { id: uid('sh'), date, name: t.name, ...(studioId ? { studioId } : {}), slots: laidOut(t.start, t.gapMin, t.slots), updatedAt: nowIso() };
}
export function saveShift(s: Shift): void {
  const next = cleanShift({ ...s, updatedAt: nowIso() })!;
  update((d) => { d.shifts = d.shifts.some((x) => x.id === s.id) ? d.shifts.map((x) => (x.id === s.id ? next : x)) : [...d.shifts, next]; });
}
/** The same shift every week until a date (inclusive), linked so they can be changed or removed together. */
export function repeatWeekly(s: Shift, until: string): number {
  const repeatId = s.repeatId || uid('r');
  const made: Shift[] = [];
  for (let date = addDays(s.date, 7), i = 0; date <= until && i < 104; date = addDays(date, 7), i++) {
    made.push({ ...structuredClone(s), id: uid('sh'), date, repeatId, slots: s.slots.map((k) => ({ id: uid('k'), start: k.start, lengthMin: k.lengthMin, ...(k.classType ? { classType: k.classType } : {}) })), updatedAt: nowIso() });
  }
  update((d) => { d.shifts = [...d.shifts.map((x) => (x.id === s.id ? { ...x, repeatId, updatedAt: nowIso() } : x)), ...made]; });
  return made.length;
}
/** `which`: just this one, or this one and the repeats after it. */
export function removeShift(id: string, which: 'one' | 'after' = 'one'): void {
  const s = shiftOf(id);
  if (!s) return;
  update((d) => { d.shifts = d.shifts.filter((x) => (which === 'after' && s.repeatId ? !(x.repeatId === s.repeatId && x.date >= s.date) : x.id !== id)); });
}
export function changeSlot(shiftId: string, slotId: string, fn: (k: Slot) => void): void {
  const s = shiftOf(shiftId);
  if (!s) return;
  const next = structuredClone(s);
  const k = next.slots.find((x) => x.id === slotId);
  if (!k) return;
  fn(k);
  saveShift(next);
}
/** A flow planned for a date and time on its own: a one-class shift. */
export function planOnDate(plan: ClassPlan, date: string, start: string): Shift {
  const s: Shift = { id: uid('sh'), date, name: plan.title, ...(plan.studioId ? { studioId: plan.studioId } : {}), slots: [{ id: uid('k'), start, lengthMin: plan.lengthMin, flowId: plan.id }], updatedAt: nowIso() };
  saveShift(s);
  return s;
}
export function saveTemplate(t: ShiftTemplate): void {
  const next = { ...t, updatedAt: nowIso() };
  update((d) => { d.shiftTemplates = d.shiftTemplates.some((x) => x.id === t.id) ? d.shiftTemplates.map((x) => (x.id === t.id ? next : x)) : [...d.shiftTemplates, next]; });
}
export function removeTemplate(id: string): void { update((d) => { d.shiftTemplates = d.shiftTemplates.filter((x) => x.id !== id); }); }
/** Saved shifts that can be used at a studio: its own, and the ones for every studio. */
export const templatesFor = (studioId?: string) => getData().shiftTemplates.filter((t) => !t.studioId || !studioId || t.studioId === studioId).sort((a, b) => a.name.localeCompare(b.name));

// ---- hours and pay
/** Minutes worked in a shift: the classes only, or the whole block from the first class to the end of the last. */
export function minutesWorked(s: Shift, count: Settings['timesheet']['count'] = getData().settings.timesheet.count): number {
  const live = liveSlots(s);
  if (!live.length) return 0;
  if (count === 'class') return live.reduce((n, k) => n + k.lengthMin, 0);
  const start = Math.min(...live.map((k) => minutesOf(k.start)));
  const end = Math.max(...live.map((k) => minutesOf(k.start) + k.lengthMin));
  return end - start;
}
export const rateFor = (studioId?: string) => { const r = getData().settings.timesheet.rates; return (studioId && r[studioId]) || r['*'] || 0; };
export interface Totals { minutes: number; classes: number; pay: number; covers: number; cancelled: number; shifts: number }
export function totals(from: string, to: string): Totals {
  const t: Totals = { minutes: 0, classes: 0, pay: 0, covers: 0, cancelled: 0, shifts: 0 };
  for (const s of shiftsBetween(from, to)) {
    const m = minutesWorked(s);
    const live = liveSlots(s);
    if (live.length) t.shifts++;
    t.minutes += m;
    t.classes += live.length;
    t.covers += live.filter((k) => k.cover).length;
    t.cancelled += s.cancelled ? s.slots.length : s.slots.filter((k) => k.cancelled).length;
    t.pay += (m / 60) * rateFor(s.studioId);
  }
  t.pay = Math.round(t.pay * 100) / 100;
  return t;
}
export const hoursText = (mins: number) => { const h = Math.floor(mins / 60), m = mins % 60; return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`; };
export const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'AUD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 });

// ---- keeping history
/** Calendar history older than the setting goes: shifts, and the record of what was taught. Flows, movements and studios stay. */
export function pruneHistory(now = today()): number {
  const months = getData().settings.keepMonths;
  if (!months) return 0;
  const d = dateOf(now);
  d.setMonth(d.getMonth() - months);
  const cut = isoDate(d);
  const old = getData().shifts.filter((s) => s.date < cut).length + getData().taught.filter((t) => t.at.slice(0, 10) < cut).length;
  if (!old) return 0;
  const before = getData();
  update((x) => { x.shifts = x.shifts.filter((s) => s.date >= cut); x.taught = x.taught.filter((t) => t.at.slice(0, 10) >= cut); });
  // Clearing history is this device's own choice (another may keep more), so it isn't a delete to sync.
  update((x) => { const gone = { ...x.gone }; for (const s of before.shifts) if (s.date < cut) delete gone['sh:' + s.id]; for (const t of before.taught) if (t.at.slice(0, 10) < cut) delete gone['t:' + t.id]; x.gone = gone; });
  return old;
}
export const historyCutoff = (now = today()) => { const m = getData().settings.keepMonths; if (!m) return ''; const d = dateOf(now); d.setMonth(d.getMonth() - m); return isoDate(d); };

// ---- what to show and say
export const studioName = (id?: string) => getData().studios.find((s) => s.id === id)?.name || (id ? 'A studio' : '');
export function classTypeName(studioId: string | undefined, id?: string): string {
  if (!id) return '';
  for (const s of getData().studios) { if (studioId && s.id !== studioId) continue; const c = s.setup.classTypes.find((x) => x.id === id); if (c) return c.name; }
  return '';
}
export const slotTitle = (s: Shift, k: Slot) => getData().classes.find((c) => c.id === k.flowId)?.title || classTypeName(s.studioId, k.classType) || 'Class';
/** Classes in the next day or so with no flow yet. */
export const unplanned = (date: string) => shiftsOn(date).flatMap((s) => liveSlots(s).filter((k) => !k.flowId).map((k) => ({ shift: s, slot: k })));

/** The week's roster as plain text, to share or print. */
export function rosterText(from: string, days = 7): string {
  const to = addDays(from, days - 1);
  const lines = [`Roster · ${niceDate(from)} to ${niceDate(to)}`, ''];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const list = shiftsOn(d);
    if (!list.length) continue;
    lines.push(niceDate(d));
    for (const s of list) {
      const span = shiftSpan(s);
      lines.push(`  ${s.name}${s.studioId ? ` · ${studioName(s.studioId)}` : ''} · ${clock(span.start)}–${clock(span.end)}${s.cancelled ? ' · CANCELLED' : ''}`);
      for (const k of s.slots) lines.push(`    ${clock(k.start)} ${slotTitle(s, k)} (${k.lengthMin} min)${k.cancelled ? ' · cancelled' : ''}${k.cover ? ` · covering ${k.cover}` : ''}`);
    }
    lines.push('');
  }
  const t = totals(from, to);
  lines.push(`${t.classes} classes · ${hoursText(t.minutes)}`);
  return lines.join('\n');
}
/** Hours (and pay, when set) by week for a month, to share or print. */
export function timesheetText(month: string): string {
  const from = monthStart(month), to = monthEnd(month);
  const ts = getData().settings.timesheet;
  const name = getData().settings.deviceName;
  const lines = [`Timesheet · ${dateOf(from).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}${name ? ` · ${name}` : ''}`, ''];
  for (const s of shiftsBetween(from, to)) {
    const m = minutesWorked(s);
    if (!m) continue;
    const span = shiftSpan(s);
    lines.push(`${niceDate(s.date)}  ${s.name}${s.studioId ? ` · ${studioName(s.studioId)}` : ''}  ${clock(span.start)}–${clock(span.end)}  ${hoursText(m)}${ts.on && rateFor(s.studioId) ? `  ${money((m / 60) * rateFor(s.studioId))}` : ''}`);
  }
  const t = totals(from, to);
  lines.push('', `Total: ${hoursText(t.minutes)} · ${t.classes} classes${ts.on && t.pay ? ` · ${money(t.pay)}` : ''}`);
  return lines.join('\n');
}

// ---- calendar files (.ics), for Google, Outlook and Apple calendars
const icsEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
const icsStamp = (date: string, t: string) => `${date.replace(/-/g, '')}T${t.replace(':', '')}00`;
export function icsText(from = '0000', to = '9999'): string {
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Plenty Flow//Pilates class planner//EN', 'CALSCALE:GREGORIAN'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  for (const s of shiftsBetween(from, to)) for (const k of s.slots) {
    out.push('BEGIN:VEVENT', `UID:${k.id}@plentyflow`, `DTSTAMP:${stamp}`, `DTSTART:${icsStamp(s.date, k.start)}`, `DTEND:${icsStamp(s.date, slotEnd(k))}`,
      `SUMMARY:${icsEsc(`${slotTitle(s, k)}${s.studioId ? ` · ${studioName(s.studioId)}` : ''}`)}`,
      `DESCRIPTION:${icsEsc([s.name, k.cover ? `Covering ${k.cover}` : '', k.note || ''].filter(Boolean).join('\n'))}`,
      ...(s.cancelled || k.cancelled ? ['STATUS:CANCELLED'] : []), `CATEGORIES:${icsEsc(s.name)}`, 'END:VEVENT');
  }
  out.push('END:VCALENDAR');
  return out.join('\r\n') + '\r\n';
}
const unfold = (text: string) => text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
const icsUnesc = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
/** A local date and time from an .ics time: floating, with a time zone name (read as local), or UTC. */
function icsWhen(v: string): { date: string; time: string } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v.trim());
  if (!m) return null;
  if (m[7]) { const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])); return { date: isoDate(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}:${m[5]}` : '09:00' };
}
/** Shifts from a calendar file. Each event becomes a one-class shift; events already brought in (same id) are skipped. */
export function shiftsFromIcs(text: string): Shift[] {
  const out: Shift[] = [];
  let ev: Record<string, string> | null = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (line === 'END:VEVENT' && ev) {
      const start = ev.DTSTART && icsWhen(ev.DTSTART);
      const end = ev.DTEND && icsWhen(ev.DTEND);
      if (start && ev.STATUS !== 'CANCELLED') {
        const len = end && end.date === start.date ? Math.max(5, minutesOf(end.time) - minutesOf(start.time)) : 50;
        const name = icsUnesc(ev.SUMMARY || 'Class').slice(0, 60);
        const id = (ev.UID || '').replace(/@plentyflow$/, '');
        const shift = cleanShift({ id: uid('sh'), date: start.date, name, slots: [{ id: /^[a-z0-9_-]{1,60}$/i.test(id) ? id : uid('k'), start: start.time, lengthMin: len }], ...(ev.DESCRIPTION ? { note: icsUnesc(ev.DESCRIPTION).slice(0, 1000) } : {}), updatedAt: nowIso() });
        if (shift) out.push(shift);
      }
      ev = null;
      continue;
    }
    if (!ev) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).split(';')[0].toUpperCase();
    ev[key] = line.slice(i + 1);
  }
  const have = new Set(getData().shifts.flatMap((s) => s.slots.map((k) => k.id)));
  return out.filter((s) => !have.has(s.slots[0].id));
}
export function bringInShifts(list: Shift[]): void { if (list.length) update((d) => { d.shifts = [...d.shifts, ...list]; }); }

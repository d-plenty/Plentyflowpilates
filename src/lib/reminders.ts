// Reminders and the iPhone's Calendar app. Both are worked out again from the calendar after
// every change (a moment later, once things settle) and each time the app opens, so they can
// never drift: what's on the calendar is what the phone knows.
//
// - Before a shift: at the time picked in Settings (an hour by default).
// - The night before: when a class tomorrow has no flow yet. Tapping it opens that class.
// - iPhone Calendar: one way. Plenty Flow fills a calendar of its own and never reads the others.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { addDays, clock, dateOf, liveSlots, minutesOf, shiftsBetween, slotEnd, slotTitle, studioName, today } from './calendar';
import { Apple, appleHere } from './native';
import { getData } from './store';

const here = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');
const at = (date: string, time: string) => { const d = dateOf(date); const m = minutesOf(time); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; };
/** Notification ids are numbers: a steady one from the text id, so the same reminder replaces itself. */
const idOf = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 2_000_000_000; };

export interface Reminder { id: number; title: string; body: string; at: Date; open: Record<string, string> }
/** What should be on the phone for the next two weeks (iOS keeps 64 at most). */
export function plannedReminders(now = new Date()): Reminder[] {
  const r = getData().settings.reminders;
  const out: Reminder[] = [];
  const from = today(), to = addDays(from, 14);
  for (const s of shiftsBetween(from, to)) {
    const live = liveSlots(s);
    if (!live.length) continue;
    if (r.shift) {
      const when = new Date(at(s.date, live[0].start).getTime() - r.before * 60_000);
      if (when > now) out.push({ id: idOf('shift:' + s.id), title: r.before ? `${s.name} in ${r.before >= 60 ? `${r.before / 60} hour${r.before > 60 ? 's' : ''}` : `${r.before} minutes`}` : `${s.name} now`, body: [studioName(s.studioId), `${live.length} ${live.length === 1 ? 'class' : 'classes'} from ${clock(live[0].start)}`].filter(Boolean).join(' · '), at: when, open: { route: 'shift', id: s.id } });
    }
    if (r.nightBefore) {
      const empty = live.filter((k) => !k.flowId || !getData().classes.some((c) => c.id === k.flowId));
      const when = at(addDays(s.date, -1), r.nightAt);
      if (empty.length && when > now) out.push({ id: idOf('night:' + s.id), title: `Plan tomorrow: ${empty.length === 1 ? slotTitle(s, empty[0]) : `${empty.length} classes`}`, body: `${s.name}${s.studioId ? ` at ${studioName(s.studioId)}` : ''} has ${empty.length === 1 ? `a class at ${clock(empty[0].start)}` : `${empty.length} classes`} with no flow yet.`, at: when, open: { route: 'new', shiftId: s.id, slotId: empty[0].id } });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 60);
}

let timer: ReturnType<typeof setTimeout> | undefined;
let lastKey = '';
/** After a change: put the phone's reminders and calendar right, a moment later. */
export function refreshSoon(): void { clearTimeout(timer); timer = setTimeout(() => void refreshNow(), 1500); }
export async function refreshNow(): Promise<void> {
  const d = getData();
  const key = JSON.stringify([d.shifts, d.settings.reminders, d.settings.phoneCalendar, d.classes.map((c) => [c.id, c.title]), d.studios.map((s) => [s.id, s.name])]);
  if (key === lastKey) return;
  lastKey = key;
  await Promise.all([scheduleReminders().catch(() => undefined), fillPhoneCalendar().catch(() => undefined)]);
}

async function scheduleReminders(): Promise<void> {
  if (!here()) return;
  const want = plannedReminders();
  const pending = (await LocalNotifications.getPending()).notifications;
  if (pending.length) await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
  if (!want.length) return;
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') return;
  await LocalNotifications.schedule({ notifications: want.map((w) => ({ id: w.id, title: w.title, body: w.body, schedule: { at: w.at, allowWhileIdle: true }, extra: w.open })) });
}
/** Asks for permission to remind (the first time reminders are needed). */
export async function askToRemind(): Promise<boolean> {
  if (!here()) return false;
  const p = await LocalNotifications.checkPermissions();
  if (p.display === 'granted') return true;
  return (await LocalNotifications.requestPermissions()).display === 'granted';
}
/** Tapping a reminder opens what it's about. */
export function onReminderTap(open: (to: Record<string, string>) => void): void {
  if (!here()) return;
  void LocalNotifications.addListener('localNotificationActionPerformed', (e) => open((e.notification.extra || {}) as Record<string, string>));
}

// ---- iPhone Calendar
export function phoneEvents(): { title: string; start: string; end: string; notes?: string; location?: string }[] {
  const out = [];
  for (const s of shiftsBetween(addDays(today(), -60), addDays(today(), 730))) {
    for (const k of liveSlots(s)) {
      out.push({ title: slotTitle(s, k), start: `${s.date}T${k.start}`, end: `${s.date}T${slotEnd(k) < k.start ? '23:59' : slotEnd(k)}`, notes: [s.name, k.cover ? `Covering ${k.cover}` : '', k.note || ''].filter(Boolean).join('\n'), location: studioName(s.studioId) });
    }
  }
  return out;
}
async function fillPhoneCalendar(): Promise<void> {
  if (!appleHere() || !getData().settings.phoneCalendar) return;
  await Apple.calendarSync({ events: phoneEvents() });
}
/** Turning iPhone Calendar on asks for access; turning it off takes its calendar away. */
export async function setPhoneCalendar(on: boolean): Promise<boolean> {
  if (!appleHere()) return false;
  if (!on) { await Apple.calendarRemove().catch(() => undefined); lastKey = ''; return true; }
  const { granted } = await Apple.calendarAccess();
  lastKey = '';
  return granted;
}

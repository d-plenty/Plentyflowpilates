// The Calendar tab: your roster of shifts (a block of classes at a studio), saved shifts to add in
// a tap, flows planned for each class, notes after class, cancelled and covered classes, the
// optional timesheet (hours and pay). Reminders, the iPhone's Calendar app and calendar files are
// in Settings → Calendar.
import { useRef, useState } from 'react';
import { closeDraft, draftOf, editDraft, markSaved, openDraft } from '../../lib/drafts';
import {
  addDays, bringInShifts, clock, dateOf, dayName, fromTemplate, hoursText, icsText, laidOut, liveSlots, minutesOf, minutesWorked, money, monthEnd, monthStart,
  niceDate, rateFor, removeShift, removeTemplate, repeatWeekly, rosterText, saveShift, saveTemplate, shiftOf, shiftSpan, shiftsBetween, shiftsFromIcs, shiftsOn,
  slotEnd, slotTitle, studioName, templatesFor, timeOf, timesheetText, today, totals, weekStart,
} from '../../lib/calendar';
import { nowIso, uid } from '../../lib/clean';
import { giveFile } from '../../lib/storage';
import { getData, lastTaught, logTaught, setSettings, studioOf, unlogTaught, useData, usualStudio } from '../../lib/store';
import { askToRemind, setPhoneCalendar } from '../../lib/reminders';
import type { ClassPlan, Shift, ShiftTemplate, Slot } from '../../lib/types';
import { Back, Chips, Empty, Field, Group, Icon, Info, Row, SaveButton, Screen, Sheet, Switch, chooseAsk, confirmAsk, showProblem, toast, useEditing } from '../bits';
import { nav, viewState } from '../nav';
import { startPlay } from './Play';
import { useSettingsDraft } from './Settings';

const hm = (mins: number) => hoursText(Math.round(mins));
const flowOf = (id?: string) => (id ? getData().classes.find((c) => c.id === id) : undefined);

// ---- the tab
export function CalendarScreen() {
  const d = useData();
  const vs = viewState('calendar', { view: 'month', month: monthStart(today()), day: today(), q: '' });
  const [, redraw] = useState(0);
  const set = (patch: Partial<typeof vs>) => { Object.assign(vs, patch); redraw((n) => n + 1); };
  const [adding, setAdding] = useState('');
  const ts = d.settings.timesheet;
  const week = totals(weekStart(today()), addDays(weekStart(today()), 6));
  const month = totals(monthStart(today()), monthEnd(today()));
  const q = vs.q.trim().toLowerCase();
  const found = q ? d.shifts.filter((s) => [s.name, studioName(s.studioId), s.note, ...s.slots.flatMap((k) => [slotTitle(s, k), k.cover, k.note])].some((x) => x && x.toLowerCase().includes(q))) : [];
  return (
    <Screen top={<div className="row between"><h1>Calendar</h1><button type="button" className="btn p sm" onClick={() => setAdding(vs.view === 'month' ? vs.day : today())}><Icon name="plus" size={18} />Shift</button></div>}>
      {!ts.asked ? (
        <div className="nudge" role="status"><Icon name="clock" size={22} /><div className="stack-sm grow"><b>Keep track of your hours?</b><span className="m">Optional. See your hours each week and month, and your pay if you add a rate. Handy for invoices.</span>
          <div className="row wrap"><button type="button" className="btn p sm" onClick={() => { setSettings({ timesheet: { ...ts, asked: true, on: true } }); nav.go({ name: 'timesheet-setup' }); }}>Set it up</button><button type="button" className="btn ghost sm" onClick={() => setSettings({ timesheet: { ...ts, asked: true } })}>Not now</button></div></div></div>
      ) : null}
      {d.shifts.length ? (
        <button type="button" className="stat-row tiles" onClick={() => nav.go({ name: 'timesheet' })} aria-label="Open your timesheet">
          <div><span className="m">This week</span><b>{hm(week.minutes)}</b><span className="tiny">{week.classes} classes</span></div>
          <div><span className="m">This month</span><b>{hm(month.minutes)}</b><span className="tiny">{month.classes} classes</span></div>
          <div><span className="m">{ts.on && Object.keys(ts.rates).length ? 'Pay this month' : 'Timesheet'}</span><b>{ts.on && Object.keys(ts.rates).length ? money(month.pay) : 'Open'}</b><span className="tiny">{month.covers ? `${month.covers} covers` : ' '}</span></div>
        </button>
      ) : null}
      <input type="search" placeholder="Search shifts, classes and notes" aria-label="Search the calendar" value={vs.q} onChange={(e) => set({ q: e.target.value })} />
      {q ? (found.length ? <div className="stack">{found.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40).map((s) => <ShiftCard key={s.id} shift={s} withDate />)}</div> : <Empty title="Nothing matches" />) : <>
        <Chips options={[{ id: 'month', label: 'Month' }, { id: 'week', label: 'Week' }, { id: 'list', label: 'Coming up' }]} value={vs.view} onPick={(v) => set({ view: v })} />
        {vs.view === 'month' ? <>
          <Month month={vs.month} day={vs.day} onMonth={(m) => set({ month: m })} onDay={(day) => set({ day })} />
          <div className="row between"><b>{niceDate(vs.day)}</b>{vs.day !== today() ? <button type="button" className="link" onClick={() => set({ day: today(), month: monthStart(today()) })}>Today</button> : null}</div>
          <DayList date={vs.day} onAdd={() => setAdding(vs.day)} />
        </> : vs.view === 'week' ? <Week from={weekStart(vs.day)} onMove={(n) => set({ day: addDays(vs.day, n * 7) })} onAdd={setAdding} />
        : <Coming onAdd={() => setAdding(today())} />}
      </>}
      <Group title="Your roster">
        <Row icon="copy" title="Saved shifts" sub={d.shiftTemplates.length ? d.shiftTemplates.map((t) => t.name).join(', ') : 'Make "Saturday mornings" once, add it in a tap'} onClick={() => nav.go({ name: 'templates' })} />
        <Row icon="money" title="Timesheet" sub={ts.on ? 'Hours and pay, by week and month' : 'Hours by week and month'} onClick={() => nav.go({ name: 'timesheet' })} />
        <Row icon="print" title="Share or print this week" sub="Your roster as a page to send or print" onClick={() => void giveFile(`roster-${weekStart(vs.day)}.txt`, rosterText(weekStart(vs.day))).catch(() => undefined)} />
      </Group>
      {adding ? <AddShiftSheet date={adding} onClose={() => setAdding('')} /> : null}
    </Screen>
  );
}

function Month({ month, day, onMonth, onDay }: { month: string; day: string; onMonth: (m: string) => void; onDay: (d: string) => void }) {
  useData();
  const first = dateOf(month);
  const start = addDays(month, -((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const last = monthEnd(month);
  const rows = cells[35] > last ? 5 : 6;
  const shifts = shiftsBetween(start, cells[rows * 7 - 1]);
  const move = (n: number) => { const d = dateOf(month); d.setMonth(d.getMonth() + n); onMonth(monthStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)); };
  return (
    <div className="card stack-sm">
      <div className="row between"><button type="button" className="btn icon month-nav" aria-label="Last month" onClick={() => move(-1)}><Icon name="back" size={18} /></button><b style={{ fontSize: 'calc(17px * var(--scale))' }}>{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b><button type="button" className="btn icon month-nav" aria-label="Next month" onClick={() => move(1)}><Icon name="next" size={18} /></button></div>
      <div className="cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <span key={i} className="dow">{x}</span>)}
        {cells.slice(0, rows * 7).map((c) => {
          const on = shifts.filter((s) => s.date === c);
          const n = on.reduce((t, s) => t + liveSlots(s).length, 0);
          return <button type="button" key={c} className={`cal-day${c.slice(0, 7) !== month.slice(0, 7) ? ' out' : ''}${c === today() ? ' today' : ''}${c === day ? ' on' : ''}`} aria-label={`${niceDate(c)}${n ? `, ${n} ${n === 1 ? 'class' : 'classes'}` : ''}`} aria-pressed={c === day} onClick={() => { onDay(c); if (c.slice(0, 7) !== month.slice(0, 7)) onMonth(monthStart(c)); }}>
            {Number(c.slice(8))}<span className="dots">{on.slice(0, 3).map((s) => <i key={s.id} style={s.cancelled ? { opacity: 0.35 } : undefined} />)}</span>
            {/* on an iPad there's room to say what's on */}
            <span className="cal-shifts">{on.slice(0, 2).map((s) => <span key={s.id} className={`cal-shift${s.cancelled ? ' off' : ''}`}>{clock(liveSlots(s)[0]?.start || s.slots[0]?.start || '')} {s.name || studioName(s.studioId)}</span>)}{on.length > 2 ? <span className="cal-shift more">+{on.length - 2}</span> : null}</span>
          </button>;
        })}
      </div>
    </div>
  );
}

function Week({ from, onMove, onAdd }: { from: string; onMove: (n: number) => void; onAdd: (date: string) => void }) {
  useData();
  const t = totals(from, addDays(from, 6));
  return (
    <>
      <div className="row between"><button type="button" className="btn icon ghost" aria-label="Last week" onClick={() => onMove(-1)}><Icon name="back" size={18} /></button><b>{niceDate(from)} – {niceDate(addDays(from, 6))}</b><button type="button" className="btn icon ghost" aria-label="Next week" onClick={() => onMove(1)}><Icon name="next" size={18} /></button></div>
      <p className="m center">{t.classes} classes · {hm(t.minutes)}</p>
      {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((day) => {
        const list = shiftsOn(day);
        return <div key={day} className="stack-sm"><div className="row between"><b className={day === today() ? 'acc' : undefined}>{dayName(day)} {Number(day.slice(8))}</b><button type="button" className="link" onClick={() => onAdd(day)}>+ Add</button></div>{list.length ? list.map((s) => <ShiftCard key={s.id} shift={s} />) : <span className="tiny">Nothing on</span>}</div>;
      })}
    </>
  );
}

function Coming({ onAdd }: { onAdd: () => void }) {
  useData();
  const list = shiftsBetween(today(), addDays(today(), 45));
  if (!list.length) return <Empty title="Nothing coming up" text="Add the shifts you work, then plan a flow for each class."><button type="button" className="btn p" onClick={onAdd}>Add a shift</button></Empty>;
  return <div className="stack">{list.map((s) => <ShiftCard key={s.id} shift={s} withDate />)}</div>;
}

export function DayList({ date, onAdd }: { date: string; onAdd: () => void }) {
  useData();
  const list = shiftsOn(date);
  if (!list.length) return <div className="card dash stack-sm" style={{ alignItems: 'center' }}><span className="m">Nothing on.</span><button type="button" className="btn sm" onClick={onAdd}><Icon name="plus" size={16} />Add a shift</button></div>;
  return <div className="stack">{list.map((s) => <ShiftCard key={s.id} shift={s} />)}<button type="button" className="btn sm ghost" onClick={onAdd}><Icon name="plus" size={16} />Another shift this day</button></div>;
}

/** A shift on the calendar: its classes, what's planned, and Play. Tap to open it. */
export function ShiftCard({ shift: s, withDate }: { shift: Shift; withDate?: boolean }) {
  const span = shiftSpan(s);
  const mins = minutesWorked(s);
  return (
    <div className={`card flush${s.cancelled ? ' faded' : ''}`}>
      <button type="button" className="shift-head" onClick={() => nav.go({ name: 'shift', id: s.id }, 'calendar')}>
        <span className="grow"><b>{withDate ? `${niceDate(s.date)} · ` : ''}{s.name}</b><span className="m">{[studioName(s.studioId), `${clock(span.start)}–${clock(span.end)}`, s.cancelled ? 'Cancelled' : hm(mins)].filter(Boolean).join(' · ')}</span></span>
        <Icon name="next" size={18} />
      </button>
      {s.slots.map((k) => {
        const flow = flowOf(k.flowId);
        const off = !!(k.cancelled || s.cancelled);
        return (
          <div key={k.id} className={`slot${off ? ' off' : ''}`}>
            <span className="up-time">{clock(k.start)}</span>
            <span className="grow"><b>{slotTitle(s, k)}</b>
              <span className="row wrap" style={{ gap: 6 }}>
                {off ? <span className="tag bad">Cancelled</span> : null}
                {k.cover ? <span className="tag sun">Covering {k.cover}</span> : null}
                {k.taughtAt ? <span className="tag acc">Taught</span> : null}
                {!flow && !off ? <button type="button" className="link" onClick={() => nav.go({ name: 'new', shiftId: s.id, slotId: k.id }, 'classes')}>Plan a flow</button> : null}
                {k.note ? <span className="tiny">📝 {k.note.slice(0, 60)}{k.note.length > 60 ? '…' : ''}</span> : null}
              </span>
            </span>
            {flow && !off ? <button type="button" className="btn icon round dark" aria-label={`Play ${flow.title}`} onClick={() => startPlay(flow, { shiftId: s.id, slotId: k.id, studioId: s.studioId })}><Icon name="play" size={14} fill /></button> : null}
          </div>
        );
      })}
    </div>
  );
}

/** Adding a shift to a day: a saved shift in one tap, or a new one. */
function AddShiftSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const d = useData();
  const [studioId, setStudioId] = useState(usualStudio().id);
  const list = templatesFor();
  const add = (t: ShiftTemplate) => {
    const s = fromTemplate(t, date, t.studioId || studioId || undefined);
    saveShift(s);
    onClose();
    toast(`${t.name} added to ${niceDate(date)}.`, { label: 'Undo', run: () => removeShift(s.id) });
  };
  return (
    <Sheet title={`Add to ${niceDate(date)}`} onClose={onClose} foot={<button type="button" className="btn p grow" onClick={() => { onClose(); nav.go({ name: 'shift', id: '', date }, 'calendar'); }}><Icon name="plus" size={16} />New shift</button>}>
      {list.length ? <>
        {d.studios.length > 1 && list.some((t) => !t.studioId) ? <div><div className="lab">At</div><div style={{ marginTop: 6 }}><Chips options={d.studios.map((s) => ({ id: s.id, label: s.name }))} value={studioId} onPick={setStudioId} /></div></div> : null}
        <div className="lab">Saved shifts</div>
        <div className="card flush">{list.map((t) => <Row key={t.id} title={t.name} sub={[t.studioId ? studioName(t.studioId) : 'Any studio', `${clock(t.start)}`, `${t.slots.length} ${t.slots.length === 1 ? 'class' : 'classes'}`].join(' · ')} right={<Icon name="plus" size={18} />} onClick={() => add(t)} />)}</div>
      </> : <p className="m">Saved shifts are blocks you work often, like "Saturday mornings". Make a new shift and save it from there, or in Calendar → Saved shifts.</p>}
    </Sheet>
  );
}

export function DayScreen({ date }: { date: string }) {
  const [adding, setAdding] = useState(false);
  return (
    <Screen narrow top={<><Back /><h1>{dayName(date)}</h1><div className="m">{niceDate(date)}</div></>}>
      <DayList date={date} onAdd={() => setAdding(true)} />
      {adding ? <AddShiftSheet date={date} onClose={() => setAdding(false)} /> : null}
    </Screen>
  );
}

// ---- one shift
type ShiftDraft = Shift & { repeatUntil?: string };
const shiftKey = (id: string) => `shift:${id}`;
function saveShiftDraft(key: string): string | null {
  const s = draftOf<ShiftDraft>(key);
  if (!s) return null;
  if (!s.name.trim()) { editDraft<ShiftDraft>(key, (x) => { (x as ShiftDraft & { tried?: boolean }).tried = true; }); showProblem(); return null; }
  const { repeatUntil, ...rest } = s as ShiftDraft & { tried?: boolean };
  delete (rest as { tried?: boolean }).tried;
  rest.slots = [...rest.slots].sort((a, b) => a.start.localeCompare(b.start));
  saveShift(rest);
  if (repeatUntil && repeatUntil > rest.date) { const n = repeatWeekly(rest, repeatUntil); toast(`Saved, and repeated ${n} more ${n === 1 ? 'week' : 'weeks'}.`); }
  markSaved(key, { ...rest });
  return rest.id;
}

export function ShiftScreen({ id, date, template }: { id: string; date?: string; template?: string }) {
  const d = useData();
  const saved = shiftOf(id);
  const fresh = (): Shift => {
    const t = d.shiftTemplates.find((x) => x.id === template);
    if (t) return fromTemplate(t, date || today(), t.studioId || usualStudio().id || undefined);
    const st = usualStudio();
    const ct = st.setup.classTypes[0];
    return { id: uid('sh'), date: date || today(), name: '', ...(st.id ? { studioId: st.id } : {}), slots: laidOut('09:00', 10, [{ lengthMin: ct?.lengthMin || 50, ...(ct ? { classType: ct.id } : {}) }]), updatedAt: nowIso() };
  };
  const [newId] = useState(() => (saved ? id : fresh().id));
  const key = shiftKey(saved ? id : newId);
  const s = (draftOf<ShiftDraft>(key) || (saved ? openDraft<ShiftDraft>(key, saved) : openDraft<ShiftDraft>(key, null, { ...fresh(), id: newId }))) as ShiftDraft & { tried?: boolean };
  const dirty = useEditing(key, s.name ? `changes to ${s.name}` : 'this shift', () => !!saveShiftDraft(key));
  const [picking, setPicking] = useState('');
  const [saving, setSaving] = useState(false);
  const edit = (fn: (x: ShiftDraft) => void, typing = false) => editDraft<ShiftDraft>(key, fn, typing);
  const slot = (kid: string, fn: (k: Slot) => void, typing = false) => edit((x) => { const k = x.slots.find((y) => y.id === kid); if (k) fn(k); }, typing);
  const studio = studioOf(s.studioId);
  const types = s.studioId ? studio.setup.classTypes : d.studios.flatMap((x) => x.setup.classTypes);
  const isSaved = !!shiftOf(s.id);
  const needSaved = async (): Promise<boolean> => { if (!dirty && isSaved) return true; if (saveShiftDraft(key)) return true; return false; };
  const mins = minutesWorked(s);
  const ts = d.settings.timesheet;
  const fill = () => {
    const used = new Set(s.slots.map((k) => k.flowId).filter(Boolean));
    const favs = d.classes.filter((c) => c.fav && !used.has(c.id)).sort((a, b) => (lastTaught(a.id)?.at || '').localeCompare(lastTaught(b.id)?.at || ''));
    let n = 0;
    edit((x) => { for (const k of x.slots) { if (k.flowId && flowOf(k.flowId)) continue; if (k.cancelled) continue; const pick = favs.find((c) => !s.studioId || !c.studioId || c.studioId === s.studioId) || favs[0]; if (!pick) break; k.flowId = pick.id; favs.splice(favs.indexOf(pick), 1); n++; } });
    toast(n ? `${n} ${n === 1 ? 'class' : 'classes'} filled from your favourites.` : 'No favourite flows to use. Star a few on the Flows tab.');
  };
  return (
    <Screen narrow top={<><div className="row between"><Back /><SaveButton dirty={dirty} onSave={() => { if (saveShiftDraft(key)) toast('Saved.'); }} /></div><h1>{s.name || (isSaved ? 'Shift' : 'New shift')}</h1><div className="m">{niceDate(s.date)}{mins ? ` · ${hm(mins)}` : ''}{ts.on && rateFor(s.studioId) && mins ? ` · ${money((mins / 60) * rateFor(s.studioId))}` : ''}</div></>}>
      <Field label="Name" error={s.tried && !s.name.trim() ? 'Give the shift a name.' : undefined}><input type="text" maxLength={60} placeholder="Saturday mornings" value={s.name} onChange={(e) => edit((x) => { x.name = e.target.value; }, true)} /></Field>
      <div className="row">
        <Field label="Day"><input type="date" value={s.date} onChange={(e) => { if (e.target.value) edit((x) => { x.date = e.target.value; }); }} /></Field>
        <Field label="Studio"><select value={s.studioId || ''} onChange={(e) => edit((x) => { if (e.target.value) x.studioId = e.target.value; else delete x.studioId; })}><option value="">No studio</option>{d.studios.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      </div>
      <div className="row between"><div className="lab">Classes</div>{s.slots.some((k) => !k.flowId) && d.classes.some((c) => c.fav) ? <button type="button" className="link" onClick={fill}><Icon name="star" size={14} /> Fill from favourites</button> : null}</div>
      {s.slots.map((k, i) => {
        const flow = flowOf(k.flowId);
        const taught = k.taughtAt;
        return (
          <div key={k.id} className={`card stack-sm${k.cancelled ? ' faded' : ''}`}>
            <div className="row between"><b>Class {i + 1}{flow ? `: ${flow.title}` : ''}</b>{s.slots.length > 1 ? <button type="button" className="btn icon ghost" aria-label={`Remove class ${i + 1}`} onClick={() => edit((x) => { x.slots = x.slots.filter((y) => y.id !== k.id); })}><Icon name="trash" size={16} /></button> : null}</div>
            <div className="row">
              <Field label="Starts"><input type="time" value={k.start} onChange={(e) => { if (e.target.value) slot(k.id, (y) => { y.start = e.target.value; }); }} /></Field>
              <Field label="Minutes"><input type="number" inputMode="numeric" min={5} max={300} value={k.lengthMin} onChange={(e) => slot(k.id, (y) => { y.lengthMin = Math.max(5, Math.min(300, Math.round(Number(e.target.value)) || 50)); }, true)} /></Field>
            </div>
            {types.length ? <Field label="Class type"><select value={k.classType || ''} onChange={(e) => slot(k.id, (y) => { if (e.target.value) { y.classType = e.target.value; const ct = types.find((c) => c.id === e.target.value); if (ct) y.lengthMin = ct.lengthMin; } else delete y.classType; })}><option value="">Not set</option>{types.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field> : null}
            <div className="row wrap" style={{ gap: 8 }}>
              {flow ? <><span className="tag acc">{flow.title}</span><button type="button" className="link" onClick={() => setPicking(k.id)}>Change</button><button type="button" className="link" onClick={() => slot(k.id, (y) => { delete y.flowId; })}>Remove</button></>
                : <><button type="button" className="btn sm" onClick={() => setPicking(k.id)}>Pick a flow</button><button type="button" className="btn sm" onClick={async () => { if (await needSaved()) nav.go({ name: 'new', shiftId: s.id, slotId: k.id }, 'classes'); }}>Plan a new flow</button></>}
            </div>
            <Row title="Covering for someone" sub={k.cover ? `Covering ${k.cover}` : 'Counts in your hours, marked on the calendar'} right={<Switch on={k.cover !== undefined} onChange={(on) => slot(k.id, (y) => { if (on) y.cover = y.cover || ''; else delete y.cover; })} label="Covering for someone" />} />
            {k.cover !== undefined ? <>
              <Field label="Whose class"><input type="text" maxLength={60} placeholder="Their name" value={k.cover} onChange={(e) => slot(k.id, (y) => { y.cover = e.target.value; }, true)} /></Field>
              <button type="button" className="btn sm" onClick={async () => { if (await needSaved()) nav.go({ name: 'share', part: 'import', shiftId: s.id, slotId: k.id }); }}><Icon name="download" size={16} />Bring in their flow</button>
            </> : null}
            <Row title="Cancelled" sub="Stays on the calendar, out of your hours" right={<Switch on={!!k.cancelled} onChange={(on) => slot(k.id, (y) => { if (on) y.cancelled = true; else delete y.cancelled; })} label={`Class ${i + 1} cancelled`} />} />
            <Field label="Notes after class" hint="For next time, like “springs too heavy on footwork”."><textarea rows={2} maxLength={1000} value={k.note || ''} onChange={(e) => slot(k.id, (y) => { if (e.target.value) y.note = e.target.value; else delete y.note; }, true)} /></Field>
            {flow && !k.cancelled ? <div className="row wrap" style={{ gap: 8 }}>
              <button type="button" className="btn sm" onClick={async () => { if (await needSaved()) startPlay(flow, { shiftId: s.id, slotId: k.id, studioId: s.studioId }); }}><Icon name="play" size={14} fill />Play</button>
              {taught ? <button type="button" className="btn sm ghost" onClick={() => { slot(k.id, (y) => { delete y.taughtAt; }); unlogTaught(k.id); }}>✓ Taught · undo</button>
                : <button type="button" className="btn sm" onClick={async () => { const at = new Date(`${s.date}T${k.start}`).toISOString(); slot(k.id, (y) => { y.taughtAt = at; }); if (await needSaved()) logTaught(flow, studioOf(s.studioId || flow.studioId), k.lengthMin, { shiftId: s.id, slotId: k.id }, at); }}>Mark as taught</button>}
            </div> : null}
          </div>
        );
      })}
      <button type="button" className="btn" onClick={() => edit((x) => { const last = x.slots[x.slots.length - 1]; const ct = types.find((c) => c.id === last?.classType); x.slots = [...x.slots, { id: uid('k'), start: last ? timeOf(minutesOf(slotEnd(last)) + 10) : '09:00', lengthMin: last?.lengthMin || ct?.lengthMin || 50, ...(last?.classType ? { classType: last.classType } : {}) }]; })}><Icon name="plus" size={16} />Add a class</button>
      <Group title="The whole shift">
        <Row title="Cancel the whole shift" sub="Stays on the calendar, out of your hours" right={<Switch on={!!s.cancelled} onChange={(on) => edit((x) => { if (on) x.cancelled = true; else delete x.cancelled; })} label="Cancel the whole shift" />} />
      </Group>
      <Field label="Shift notes"><textarea rows={2} maxLength={1000} value={s.note || ''} onChange={(e) => edit((x) => { if (e.target.value) x.note = e.target.value; else delete x.note; }, true)} /></Field>
      <div className="card stack-sm">
        <div className="row wrap"><b className="grow">Repeat every week</b><Info text={`Adds the same shift on every ${dayName(s.date)} until the date you pick. Each week keeps its own flows, notes and cancellations.`} /></div>
        <Field label="Until"><input type="date" min={addDays(s.date, 7)} value={s.repeatUntil || ''} onChange={(e) => edit((x) => { if (e.target.value) x.repeatUntil = e.target.value; else delete x.repeatUntil; })} /></Field>
        {s.repeatId ? <span className="tiny">This shift is part of a weekly repeat.</span> : null}
      </div>
      <Group>
        <Row icon="copy" title="Save as a saved shift" sub="Add it to any day in one tap" onClick={() => setSaving(true)} />
        {isSaved ? <Row icon="trash" danger title="Delete this shift" onClick={async () => {
          const a = s.repeatId && d.shifts.some((x) => x.repeatId === s.repeatId && x.id !== s.id && x.date > s.date)
            ? await chooseAsk(`Delete ${s.name}?`, 'It repeats every week.', [{ id: 'one', label: 'Just this one', kind: 'danger' }, { id: 'after', label: 'This one and every week after', kind: 'danger' }], 'Keep it')
            : (await confirmAsk(`Delete ${s.name}?`, 'Its flows stay on the Flows tab.', 'Delete', true)) ? 'one' : null;
          if (!a) return;
          closeDraft(key); removeShift(s.id, a as 'one' | 'after'); nav.backNow(); toast('Deleted.');
        }} /> : null}
      </Group>
      {!isSaved ? <button type="button" className="btn danger" onClick={() => { closeDraft(key); nav.backNow(); }}>Don't add this shift</button> : null}
      {picking ? <FlowPicker studioId={s.studioId} used={s.slots.map((k) => k.flowId || '')} onClose={() => setPicking('')} onPick={(c) => { slot(picking, (y) => { y.flowId = c.id; }); setPicking(''); }} /> : null}
      {saving ? <SaveTemplateSheet shift={s} onClose={() => setSaving(false)} /> : null}
    </Screen>
  );
}

/** Pick a flow for a class: favourites not taught lately first. */
function FlowPicker({ studioId, used, onPick, onClose }: { studioId?: string; used: string[]; onPick: (c: ClassPlan) => void; onClose: () => void }) {
  const d = useData();
  const [q, setQ] = useState('');
  const last = (c: ClassPlan) => lastTaught(c.id)?.at || '';
  const ql = q.trim().toLowerCase();
  const all = d.classes.filter((c) => !ql || c.title.toLowerCase().includes(ql));
  const here = (c: ClassPlan) => !studioId || !c.studioId || c.studioId === studioId;
  const favs = all.filter((c) => c.fav && !used.includes(c.id)).sort((a, b) => Number(here(b)) - Number(here(a)) || last(a).localeCompare(last(b)));
  const row = (c: ClassPlan) => { const t = lastTaught(c.id); return <Row key={c.id} title={c.title} sub={[`${c.lengthMin} min`, studioOf(c.studioId).id ? studioOf(c.studioId).name : '', t ? `Last taught ${niceDate(t.at.slice(0, 10))}` : 'Not taught yet'].filter(Boolean).join(' · ')} right={c.fav ? <span className="star on"><Icon name="star" size={16} fill /></span> : undefined} onClick={() => onPick(c)} />; };
  return (
    <Sheet title="Pick a flow" onClose={onClose}>
      <input type="search" placeholder="Search your flows" aria-label="Search your flows" value={q} onChange={(e) => setQ(e.target.value)} />
      {!d.classes.length ? <p className="m">No flows yet. Plan one with “Plan a new flow”.</p> : <>
        {favs.length && !ql ? <><div className="lab">Favourites not taught lately</div><div className="card flush">{favs.slice(0, 5).map(row)}</div></> : null}
        <div className="lab">All flows</div>
        <div className="card flush">{all.map(row)}</div>
      </>}
    </Sheet>
  );
}

function SaveTemplateSheet({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const [name, setName] = useState(shift.name);
  const [scope, setScope] = useState<'one' | 'all'>(shift.studioId ? 'one' : 'all');
  const [tried, setTried] = useState(false);
  const ks = [...shift.slots].sort((a, b) => a.start.localeCompare(b.start));
  const gap = ks.length > 1 ? Math.max(0, minutesOf(ks[1].start) - minutesOf(slotEnd(ks[0]))) : 10;
  return (
    <Sheet title="Save as a saved shift" onClose={onClose} foot={<button type="button" className="btn p grow" onClick={() => {
      if (!name.trim()) { setTried(true); showProblem(); return; }
      saveTemplate({ id: uid('tp'), name: name.trim(), ...(scope === 'one' && shift.studioId ? { studioId: shift.studioId } : {}), start: ks[0]?.start || '09:00', gapMin: gap, slots: ks.map((k) => ({ lengthMin: k.lengthMin, ...(k.classType ? { classType: k.classType } : {}) })), updatedAt: nowIso() });
      onClose(); toast(`${name.trim()} saved. Add it from + Shift on any day.`);
    }}>Save</button>}>
      <Field label="Name" error={tried && !name.trim() ? 'Give it a name.' : undefined}><input type="text" maxLength={60} placeholder="Saturday mornings" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <p className="m">{ks.length} {ks.length === 1 ? 'class' : 'classes'} from {clock(ks[0]?.start || '09:00')}{ks.length > 1 ? `, ${gap} min between` : ''}.</p>
      {shift.studioId ? <div><div className="lab">Use it at</div><div style={{ marginTop: 6 }}><Chips options={[{ id: 'one', label: studioName(shift.studioId) }, { id: 'all', label: 'Every studio' }]} value={scope} onPick={setScope} /></div></div> : null}
    </Sheet>
  );
}

// ---- saved shifts
export function TemplatesScreen() {
  const d = useData();
  return (
    <Screen narrow top={<><div className="row between"><Back label="Calendar" /><button type="button" className="btn p sm" onClick={() => nav.go({ name: 'template', id: '' })}><Icon name="plus" size={16} />New</button></div><h1>Saved shifts</h1><div className="m">Blocks you work often. Add one to a day from + Shift.</div></>}>
      {!d.shiftTemplates.length ? <Empty title="No saved shifts yet" text='Like "Saturday mornings: 3 classes from 7am". Make it once, then add it to any day in a tap.'><button type="button" className="btn p" onClick={() => nav.go({ name: 'template', id: '' })}>Make one</button></Empty>
        : <div className="card flush">{[...d.shiftTemplates].sort((a, b) => a.name.localeCompare(b.name)).map((t) => <Row key={t.id} title={t.name} sub={[t.studioId ? studioName(t.studioId) : 'Every studio', clock(t.start), `${t.slots.length} ${t.slots.length === 1 ? 'class' : 'classes'}`].join(' · ')} onClick={() => nav.go({ name: 'template', id: t.id })} />)}</div>}
    </Screen>
  );
}

const tpKey = (id: string) => `template:${id}`;
export function TemplateScreen({ id }: { id: string }) {
  const d = useData();
  const saved = d.shiftTemplates.find((t) => t.id === id);
  const [newId] = useState(() => id || uid('tp'));
  const key = tpKey(saved ? id : newId);
  const st = usualStudio();
  const t = (draftOf<ShiftTemplate>(key) || (saved ? openDraft(key, saved) : openDraft<ShiftTemplate>(key, null, { id: newId, name: '', ...(st.id ? { studioId: st.id } : {}), start: '07:00', gapMin: 10, slots: [{ lengthMin: 50 }, { lengthMin: 50 }], updatedAt: nowIso() }))) as ShiftTemplate & { tried?: boolean };
  const save = () => { const x = draftOf<ShiftTemplate & { tried?: boolean }>(key); if (!x) return false; if (!x.name.trim()) { editDraft<ShiftTemplate & { tried?: boolean }>(key, (y) => { y.tried = true; }); showProblem(); return false; } const { tried: _, ...rest } = x; saveTemplate({ ...rest, name: rest.name.trim() }); markSaved(key, rest); return true; };
  const dirty = useEditing(key, t.name ? `changes to ${t.name}` : 'this saved shift', save);
  const edit = (fn: (x: ShiftTemplate) => void, typing = false) => editDraft<ShiftTemplate>(key, fn, typing);
  const studio = studioOf(t.studioId);
  const types = t.studioId ? studio.setup.classTypes : d.studios.flatMap((x) => x.setup.classTypes);
  const times = laidOut(t.start, t.gapMin, t.slots);
  return (
    <Screen narrow top={<><div className="row between"><Back label="Saved shifts" /><SaveButton dirty={dirty} onSave={() => { if (save()) toast('Saved.'); }} /></div><h1>{t.name || 'New saved shift'}</h1></>}>
      <Field label="Name" error={t.tried && !t.name.trim() ? 'Give it a name.' : undefined}><input type="text" maxLength={60} placeholder="Saturday mornings" value={t.name} onChange={(e) => edit((x) => { x.name = e.target.value; }, true)} /></Field>
      <Field label="Use it at"><select value={t.studioId || ''} onChange={(e) => edit((x) => { if (e.target.value) x.studioId = e.target.value; else delete x.studioId; })}><option value="">Every studio</option>{d.studios.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <div className="row">
        <Field label="First class starts"><input type="time" value={t.start} onChange={(e) => { if (e.target.value) edit((x) => { x.start = e.target.value; }); }} /></Field>
        <Field label="Minutes between"><input type="number" inputMode="numeric" min={0} max={240} value={t.gapMin} onChange={(e) => edit((x) => { x.gapMin = Math.max(0, Math.min(240, Math.round(Number(e.target.value)) || 0)); }, true)} /></Field>
      </div>
      <div className="lab">Classes</div>
      <div className="card flush">
        {t.slots.map((k, i) => (
          <div key={i} className="timing-row">
            <div className="row between"><b>{clock(times[i].start)} · Class {i + 1}</b>{t.slots.length > 1 ? <button type="button" className="btn icon ghost" aria-label={`Remove class ${i + 1}`} onClick={() => edit((x) => { x.slots.splice(i, 1); })}><Icon name="trash" size={16} /></button> : null}</div>
            <div className="row">
              <Field label="Minutes"><input type="number" inputMode="numeric" min={5} max={300} value={k.lengthMin} onChange={(e) => edit((x) => { x.slots[i].lengthMin = Math.max(5, Math.min(300, Math.round(Number(e.target.value)) || 50)); }, true)} /></Field>
              {types.length ? <Field label="Class type"><select value={k.classType || ''} onChange={(e) => edit((x) => { if (e.target.value) { x.slots[i].classType = e.target.value; const ct = types.find((c) => c.id === e.target.value); if (ct) x.slots[i].lengthMin = ct.lengthMin; } else delete x.slots[i].classType; })}><option value="">Not set</option>{types.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field> : null}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn" disabled={t.slots.length >= 12} onClick={() => edit((x) => { x.slots.push({ ...x.slots[x.slots.length - 1] }); })}><Icon name="plus" size={16} />Add a class</button>
      {saved ? <button type="button" className="btn danger" onClick={async () => { if (!(await confirmAsk(`Delete ${t.name}?`, 'Shifts already on your calendar stay.', 'Delete', true))) return; closeDraft(key); removeTemplate(id); nav.backNow(); }}>Delete this saved shift</button>
        : <button type="button" className="btn danger" onClick={() => { closeDraft(key); nav.backNow(); }}>Don't make it</button>}
    </Screen>
  );
}

// ---- timesheet
export function TimesheetScreen() {
  const d = useData();
  const vs = viewState('timesheet', { month: monthStart(today()) });
  const [, redraw] = useState(0);
  const move = (n: number) => { const x = dateOf(vs.month); x.setMonth(x.getMonth() + n); vs.month = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-01`; redraw((v) => v + 1); };
  const ts = d.settings.timesheet;
  const from = vs.month, to = monthEnd(vs.month);
  const t = totals(from, to);
  const weeks: { from: string; mins: number }[] = [];
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) weeks.push({ from: w, mins: totals(w < from ? from : w, addDays(w, 6) > to ? to : addDays(w, 6)).minutes });
  const top = Math.max(60, ...weeks.map((w) => w.mins));
  const list = shiftsBetween(from, to).filter((s) => s.slots.length);
  const pay = ts.on && Object.keys(ts.rates).length > 0;
  return (
    <Screen narrow top={<><Back label="Calendar" /><h1>Timesheet</h1><div className="m">{ts.count === 'block' ? 'Counting the whole block, first class to last' : 'Counting class time only'}</div></>}>
      <div className="row between"><button type="button" className="btn icon ghost" aria-label="Last month" onClick={() => move(-1)}><Icon name="back" size={18} /></button><b>{dateOf(from).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b><button type="button" className="btn icon ghost" aria-label="Next month" onClick={() => move(1)}><Icon name="next" size={18} /></button></div>
      <div className="stat-row">
        <div><span className="m">Hours</span><span className="big-num">{hm(t.minutes)}</span></div>
        <div><span className="m">Classes</span><span className="big-num">{t.classes}</span>{t.covers ? <span className="tiny">{t.covers} covers</span> : null}</div>
        <div><span className="m">{pay ? 'Pay' : 'Cancelled'}</span><span className="big-num">{pay ? money(t.pay) : t.cancelled}</span></div>
      </div>
      <div className="card"><div className="lab">By week</div><div className="bars" role="img" aria-label="Hours each week">{weeks.map((w) => <div key={w.from}><small>{w.mins ? hm(w.mins) : ''}</small><span className={`b${w.from <= today() && today() <= addDays(w.from, 6) ? ' now' : ''}`} style={{ height: `${(w.mins / top) * 80}%` }} /><small>{Number(w.from.slice(8))}/{Number(w.from.slice(5, 7))}</small></div>)}</div></div>
      {list.length ? <div className="card flush">{list.map((s) => { const m = minutesWorked(s); return <Row key={s.id} title={`${niceDate(s.date)} · ${s.name}`} sub={[studioName(s.studioId), s.cancelled ? 'Cancelled' : `${liveSlots(s).length} classes`, pay && rateFor(s.studioId) ? money((m / 60) * rateFor(s.studioId)) : ''].filter(Boolean).join(' · ')} right={<b>{hm(m)}</b>} onClick={() => nav.go({ name: 'shift', id: s.id })} />; })}</div> : <Empty title="No shifts this month" />}
      <div className="row"><button type="button" className="btn grow" onClick={() => void giveFile(`timesheet-${from.slice(0, 7)}.txt`, timesheetText(from)).catch(() => undefined)}><Icon name="print" size={16} />Share or print</button></div>
      <Group><Row icon="money" title="Hours and pay set-up" sub="Optional: how hours count, and your pay rate" onClick={() => nav.go({ name: 'timesheet-setup' })} /></Group>
    </Screen>
  );
}

export function TimesheetSetupScreen() {
  const d = useData();
  const { s, edit, top } = useSettingsDraft();
  const ts = s.timesheet;
  const setTs = (patch: Partial<typeof ts>) => edit({ timesheet: { ...ts, ...patch, asked: true } });
  const rate = (k: string, v: string) => { const rates = { ...ts.rates }; const n = Number(v); if (v && Number.isFinite(n) && n > 0) rates[k] = Math.round(n * 100) / 100; else delete rates[k]; setTs({ rates }); };
  return (
    <Screen narrow top={top('Hours and pay', 'Back', 'Optional. Everything here stays on this device.')}>
      <div className="lab">How hours count</div>
      <Chips options={[{ id: 'class', label: 'Class time only' }, { id: 'block', label: 'The whole block' }]} value={ts.count} onPick={(v) => setTs({ count: v })} />
      <p className="tiny">{ts.count === 'class' ? 'Three 50-minute classes is 2h 30m, whatever the gaps between.' : 'From the start of the first class to the end of the last, gaps included.'}</p>
      <Group>
        <Row title="Show my pay" sub="Optional. Add your rate for each studio" right={<Switch on={ts.on} onChange={(on) => setTs({ on })} label="Show my pay" />} />
      </Group>
      {ts.on ? <>
        <div className="lab">Pay rate per hour</div>
        <div className="card flush">
          {d.studios.map((st) => <div key={st.id} className="set"><span className="grow"><b>{st.name}</b></span><input type="number" inputMode="decimal" min={0} step="0.5" className="short" aria-label={`Hourly rate at ${st.name}`} placeholder="$0" value={ts.rates[st.id] ?? ''} onChange={(e) => rate(st.id, e.target.value)} /></div>)}
          <div className="set"><span className="grow"><b>Anywhere else</b><div className="m">Shifts with no studio, or a studio with no rate</div></span><input type="number" inputMode="decimal" min={0} step="0.5" className="short" aria-label="Hourly rate anywhere else" placeholder="$0" value={ts.rates['*'] ?? ''} onChange={(e) => rate('*', e.target.value)} /></div>
        </div>
      </> : null}
    </Screen>
  );
}

// ---- reminders, iPhone Calendar and history
/** Settings → Calendar: reminders, the iPhone Calendar, calendar files and how long history is kept. */
export function CalendarSettingsScreen() {
  const { s, edit, top, save } = useSettingsDraft();
  const file = useRef<HTMLInputElement>(null);
  const r = s.reminders;
  const setR = (patch: Partial<typeof r>) => edit({ reminders: { ...r, ...patch } });
  return (
    <Screen narrow top={top('Calendar settings')}>
      <Group title="Reminders">
        <Row title="Before a shift" sub="A reminder on this phone" right={<Switch on={r.shift} onChange={(on) => { setR({ shift: on }); if (on) void askToRemind(); }} label="Remind me before a shift" />} />
      </Group>
      {r.shift ? <Chips options={[0, 15, 30, 60, 90, 120, 180].map((m) => ({ id: String(m), label: m === 0 ? 'When it starts' : m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? 's' : ''}` }))} value={String(r.before)} onPick={(v) => setR({ before: Number(v) })} /> : null}
      <Group>
        <Row title="The night before" sub="When a class tomorrow has no flow yet. Tap it to plan one" right={<Switch on={r.nightBefore} onChange={(on) => { setR({ nightBefore: on }); if (on) void askToRemind(); }} label="Remind me the night before" />} />
      </Group>
      {r.nightBefore ? <Field label="At"><input type="time" value={r.nightAt} onChange={(e) => { if (e.target.value) setR({ nightAt: e.target.value }); }} /></Field> : null}
      <Group title="iPhone Calendar">
        <Row title="Add my shifts to Calendar" sub="One way, in a calendar of its own called Plenty Flow. Your other calendars aren't read or changed" right={<Switch on={s.phoneCalendar} onChange={async (on) => {
          if (on && !(await setPhoneCalendar(true))) { toast('Calendar access was turned down. Turn it on in the iPhone Settings app → Plenty Flow → Calendars.'); return; }
          if (!on) await setPhoneCalendar(false);
          edit({ phoneCalendar: on }); save();
        }} label="Add my shifts to Calendar" />} />
      </Group>
      <Group title="Calendar files">
        <Row icon="upload" title="Export a calendar file" sub="For Google, Outlook or Apple calendars (.ics)" onClick={() => void giveFile(`plentyflow-calendar-${today()}.ics`, icsText()).catch(() => undefined)} />
        <Row icon="download" title="Import a calendar file" sub="Shifts from another calendar app (.ics)" onClick={() => file.current?.click()} />
      </Group>
      <input ref={file} type="file" accept=".ics,text/calendar" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        const list = shiftsFromIcs(await f.text());
        if (!list.length) { toast('Nothing new in that file.'); return; }
        if (await confirmAsk(`Bring in ${list.length} ${list.length === 1 ? 'event' : 'events'}?`, 'Each one becomes a one-class shift. Add a studio and a flow to them any time.', 'Bring them in')) { bringInShifts(list); toast(`${list.length} added to your calendar.`); }
      }} />
      <Group title="History">
        <div className="set" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}><b>Keep calendar history for</b>
          <Chips options={[3, 6, 12, 24, 36, 0].map((m) => ({ id: String(m), label: m ? (m < 12 ? `${m} months` : `${m / 12} year${m > 12 ? 's' : ''}`) : 'Forever' }))} value={String(s.keepMonths)} onPick={(v) => edit({ keepMonths: Number(v) })} />
          <span className="tiny">Shifts, hours and notes older than this are cleared. Flows, movements and studios are always kept.</span></div>
      </Group>
    </Screen>
  );
}

// The Calendar tab: what is planned, by day, and the log of what has been taught.
import { useState } from 'react';
import { studioOf, useData } from '../../lib/store';
import type { ClassPlan, Taught } from '../../lib/types';
import { Empty, Icon, Screen } from '../bits';
import { nav, viewState } from '../nav';
import { changeClass } from '../../lib/plan';
import { startPlay } from './Play';

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localDay = (iso: string) => dayKey(new Date(iso));
const timeOf = (w?: string) => (w && w.length > 10 ? new Date(w).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Any time');

export function CalendarScreen() {
  const d = useData();
  const today = dayKey(new Date());
  const vs = viewState('calendar', { month: today.slice(0, 7), day: today, view: 'month' as 'month' | 'taught' });
  const [, redraw] = useState(0);
  const set = (patch: Partial<typeof vs>) => { Object.assign(vs, patch); redraw((n) => n + 1); };
  const planned = new Map<string, ClassPlan[]>();
  for (const c of d.classes) if (c.when) { const k = c.when.slice(0, 10); planned.set(k, [...(planned.get(k) || []), c]); }
  const taught = new Map<string, Taught[]>();
  for (const t of d.taught) { const k = localDay(t.at); taught.set(k, [...(taught.get(k) || []), t]); }
  const [y, m] = vs.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(y, m - 1, 1 - ((first.getDay() + 6) % 7)); // weeks start on Monday
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const weeks = days.slice(35).some((x) => x.getMonth() === m - 1) ? days : days.slice(0, 35);
  const shift = (by: number) => { const n = new Date(y, m - 1 + by, 1); set({ month: `${n.getFullYear()}-${pad(n.getMonth() + 1)}` }); };
  const sel = new Date(`${vs.day}T00:00`);
  const dayPlans = (planned.get(vs.day) || []).sort((a, b) => (a.when || '').localeCompare(b.when || ''));
  const dayTaught = taught.get(vs.day) || [];
  const upcoming = d.classes.filter((c) => c.when && c.when.slice(0, 10) >= today).sort((a, b) => (a.when || '').localeCompare(b.when || '')).slice(0, 6);
  return (
    <Screen narrow top={<>
      <div className="row between"><h1>Calendar</h1><div className="seg"><button type="button" className={vs.view === 'month' ? 'on' : ''} onClick={() => set({ view: 'month' })}>Planned</button><button type="button" className={vs.view === 'taught' ? 'on' : ''} onClick={() => set({ view: 'taught' })}>Taught</button></div></div>
    </>}>
      {vs.view === 'taught' ? (
        d.taught.length ? <div className="card flush">{d.taught.slice(0, 200).map((t) => (
          <button type="button" className="set" key={t.id} onClick={() => (d.classes.some((c) => c.id === t.classId) ? nav.go({ name: 'class', id: t.classId }, 'classes') : undefined)}>
            <span className="grow"><b>{t.title}</b><div className="m">{new Date(t.at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{t.studioName ? ` · ${t.studioName}` : ''}{t.minutes ? ` · ${t.minutes} min` : ''}</div></span>
            {d.classes.some((c) => c.id === t.classId) ? <span style={{ color: 'var(--dim)', display: 'flex' }}><Icon name="next" size={18} /></span> : <span className="tiny">Deleted</span>}
          </button>
        ))}</div> : <Empty title="Nothing taught yet" text="Finish a class in Play and it is logged here, with the day and the studio." />
      ) : <>
        <div className="card">
          <div className="row between"><button type="button" className="btn icon ghost" aria-label="Month before" onClick={() => shift(-1)}><Icon name="back" size={18} /></button>
            <b>{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
            <button type="button" className="btn icon ghost" aria-label="Month after" onClick={() => shift(1)}><Icon name="next" size={18} /></button></div>
          <div className="cal-grid" style={{ marginTop: 6 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <div className="dow" key={i}>{x}</div>)}
            {weeks.map((x) => { const k = dayKey(x); const p = planned.get(k) || []; const t = taught.get(k) || []; return (
              <button type="button" key={k} className={`day${x.getMonth() !== m - 1 ? ' out' : ''}${k === today ? ' today' : ''}${k === vs.day ? ' sel' : ''}`} aria-label={`${x.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}${p.length ? `, ${p.length} planned` : ''}${t.length ? `, ${t.length} taught` : ''}`} aria-pressed={k === vs.day} onClick={() => set({ day: k })}>
                {x.getDate()}<span className="pips">{p.slice(0, 3).map((c) => <i key={c.id} />)}{!p.length ? t.slice(0, 3).map((c) => <i key={c.id} className="done" />) : null}</span>
              </button>
            ); })}
          </div>
          {vs.month !== today.slice(0, 7) || vs.day !== today ? <button type="button" className="link" style={{ marginTop: 8 }} onClick={() => set({ month: today.slice(0, 7), day: today })}>Today</button> : null}
        </div>
        <div className="row between" style={{ padding: '0 4px' }}><b>{vs.day === today ? 'Today' : sel.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
          <button type="button" className="btn sm" onClick={() => nav.go({ name: 'new', when: `${vs.day}T09:00` })}><Icon name="plus" size={16} />Plan a flow</button></div>
        {dayPlans.length || dayTaught.length ? <div className="card flush">
          {dayPlans.map((c) => <div className="set" key={c.id}><button type="button" className="grow link" style={{ color: 'inherit' }} onClick={() => nav.go({ name: 'class', id: c.id }, 'classes')}><b>{c.title}</b><div className="m" style={{ fontWeight: 400 }}>{timeOf(c.when)} · {c.lengthMin} min{c.studioId ? ` · ${studioOf(c.studioId).name}` : ''}</div></button>
            <button type="button" className="btn icon ghost" aria-label={`Take ${c.title} off this day`} onClick={() => changeClass(c.id, (p) => { delete p.when; })}><Icon name="close" size={16} /></button>
            <button type="button" className="btn icon round dark" aria-label={`Play ${c.title}`} onClick={() => startPlay(c)}><Icon name="play" size={16} fill /></button></div>)}
          {dayTaught.map((t) => <div className="set" key={t.id}><span className="grow"><b>{t.title}</b><div className="m">Taught{t.studioName ? ` at ${t.studioName}` : ''}{t.minutes ? ` · ${t.minutes} min` : ''}</div></span><span className="tag">Taught</span></div>)}
        </div> : <p className="m" style={{ padding: '0 4px' }}>Nothing on this day. Plan a new flow for it, or open a flow and set "Planned for" under More.</p>}
        {upcoming.length ? <><div className="lab">Coming up</div><div className="card flush">{upcoming.map((c) => <button type="button" className="set" key={c.id} onClick={() => set({ day: c.when!.slice(0, 10), month: c.when!.slice(0, 7) })}><span className="grow"><b>{c.title}</b><div className="m">{new Date(c.when!.length > 10 ? c.when! : `${c.when}T00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {timeOf(c.when)}</div></span></button>)}</div></> : null}
      </>}
    </Screen>
  );
}

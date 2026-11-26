// The Home tab: the welcome, what's on today and tomorrow, and anything that needs doing.
import { addDays, clock, liveSlots, niceDate, shiftSpan, shiftsOn, slotTitle, studioName, today, unplanned } from '../../lib/calendar';
import { copyBackupOff } from '../../lib/files';
import { backupNudge, snoozeNudge, useData } from '../../lib/store';
import { welcomeLine } from '../../lib/welcome';
import { THEMES } from '../art/scenes';
import { Icon, Screen, toast } from '../bits';
import { nav } from '../nav';
import { Picture, useTheme } from '../Picture';
import { needStudio } from './Classes';
import { startPlay } from './Play';

const EARS = '<svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true"><path d="M10 21 C6 12 6 2 10 1 C14 2 15 12 14 21Z" fill="#fff"/><path d="M11 18 C9 12 9 5 10.5 4 C12 5 12.5 12 12.5 18Z" fill="#F59BC0"/><path d="M24 21 C20 12 21 2 26 1 C30 3 28 13 28 21Z" fill="#fff"/><path d="M25 18 C23.5 12 24 5 26 4 C27.5 6 27 12 26.5 18Z" fill="#F59BC0"/></svg>';

/** Today's theme as a still picture, and a welcome. */
function WelcomeCard({ name }: { name: string }) {
  const { key, night } = useTheme();
  const line = THEMES[key].line || welcomeLine(useData().settings.welcome);
  const t = THEMES[key];
  const who = name ? <>, {key === 'easter' ? <span className="ears"><span dangerouslySetInnerHTML={{ __html: EARS }} />{name}</span> : name}</> : null;
  return (
    <section className="welcome-card" aria-label="Welcome">
      <Picture className="art" theme={key} night={night} mode="panel" />
      <div className="words"><h2>{t.greet || 'Welcome'}{who}</h2>{line ? <p>{line}</p> : null}</div>
    </section>
  );
}

/** The reminder to keep a backup off the device, as in Restock. */
function BackupNudge() {
  useData();
  const why = backupNudge();
  if (!why) return null;
  const text = why === 'first' ? "You've made a good start. Save a backup somewhere off this phone, so nothing is lost if the app is deleted." : why === 'lots' ? "Lots of new work since your last backup copy. Save a fresh one off this phone." : "It's been a while since you saved a backup off this phone.";
  return (
    <div className="nudge" role="status"><Icon name="box" size={22} /><div className="stack-sm grow"><b>Keep your work safe</b><span className="m">{text}</span>
      <div className="row wrap"><button type="button" className="btn p sm" onClick={() => void copyBackupOff().then(() => toast('Backup saved off this device.')).catch(() => undefined)}>Save a backup</button><button type="button" className="btn ghost sm" onClick={() => snoozeNudge()}>Not now</button></div></div></div>
  );
}

/** Today's and tomorrow's classes. A busy day shows its shifts instead of every class. */
function ComingUp() {
  const d = useData();
  if (!d.shifts.length) return null;
  const days = [today(), addDays(today(), 1)].map((date) => ({ date, shifts: shiftsOn(date) }));
  if (!days.some((x) => x.shifts.length)) return null;
  return (
    <div className="card stack-sm coming">
      {days.map(({ date, shifts }, i) => (
        <div key={date} className="stack-sm">
          <div className="row between"><b>{i ? 'Tomorrow' : 'Today'}</b><button type="button" className="link" onClick={() => { void nav.home('calendar').then(() => nav.go({ name: 'day', date }, 'calendar')); }}>{shifts.length ? 'Open' : ''}</button></div>
          {!shifts.length ? <span className="m">Nothing on.</span>
            : shifts.reduce((n, s) => n + s.slots.length, 0) > 3
              ? shifts.map((s) => { const sp = shiftSpan(s); return <button type="button" key={s.id} className="up-row" onClick={() => nav.go({ name: 'shift', id: s.id }, 'calendar')}><span className="up-time">{clock(sp.start)}</span><span className="grow"><b>{s.name}</b><span className="m">{[studioName(s.studioId), `${liveSlots(s).length} classes`, s.cancelled ? 'Cancelled' : ''].filter(Boolean).join(' · ')}</span></span></button>; })
              : shifts.flatMap((s) => s.slots.map((k) => {
                const flow = d.classes.find((c) => c.id === k.flowId);
                return <button type="button" key={k.id} className={`up-row${k.cancelled || s.cancelled ? ' off' : ''}`} onClick={() => (flow ? nav.go({ name: 'class', id: flow.id }, 'classes') : nav.go({ name: 'shift', id: s.id }, 'calendar'))}>
                  <span className="up-time">{clock(k.start)}</span><span className="grow"><b>{slotTitle(s, k)}</b><span className="m">{[studioName(s.studioId), k.cover ? `Covering ${k.cover}` : '', k.cancelled || s.cancelled ? 'Cancelled' : flow ? '' : 'No flow yet'].filter(Boolean).join(' · ')}</span></span>
                  {flow && !k.cancelled && !s.cancelled ? <span className="btn icon round dark" role="button" aria-label={`Play ${flow.title}`} onClick={(e) => { e.stopPropagation(); startPlay(flow, { shiftId: s.id, slotId: k.id, studioId: s.studioId }); }}><Icon name="play" size={14} fill /></span> : null}
                </button>;
              }))}
        </div>
      ))}
    </div>
  );
}


/** Classes in the coming week that have no flow yet. */
function NeedsAFlow() {
  useData();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i));
  const open = days.flatMap((date) => unplanned(date).map((x) => ({ date, ...x })));
  if (!open.length) return null;
  const first = open[0];
  return (
    <button type="button" className="notice" onClick={() => nav.go({ name: 'new', shiftId: first.shift.id, slotId: first.slot.id }, 'classes')}>
      <span className="notice-ic"><Icon name="classes" size={20} /></span>
      <span className="grow"><b>{open.length === 1 ? 'A class needs a flow' : `${open.length} classes need a flow`}</b><span className="m">Next: {slotTitle(first.shift, first.slot)}, {niceDate(first.date)} at {clock(first.slot.start)}. Tap to plan it.</span></span>
      <Icon name="next" size={18} />
    </button>
  );
}

export function HomeScreen() {
  const d = useData();
  const quiet = !d.shifts.length;
  const longDate = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <Screen top={<><div className="m">{longDate}</div><h1>Home</h1></>}>
      <WelcomeCard name={d.settings.deviceName} />
      <ComingUp />
      <NeedsAFlow />
      <BackupNudge />
      {quiet ? <div className="card stack-sm"><b>Nothing on the calendar yet</b><p className="m">Add the shifts you work and today's and tomorrow's classes show here.</p><button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => void nav.home('calendar').then(() => nav.go({ name: 'shift', id: '', date: today() }, 'calendar'))}><Icon name="plus" size={16} />Add a shift</button></div> : null}
      <div className="quick">
        <button type="button" className="quick-tile" onClick={() => void needStudio().then((ok) => { if (ok) nav.go({ name: 'new' }, 'classes'); })}><span className="quick-ic" style={{ background: 'var(--accent-fill)' }}><Icon name="plus" size={20} /></span>New flow</button>
        <button type="button" className="quick-tile" onClick={() => void nav.tab('classes')}><span className="quick-ic" style={{ background: '#F28C38' }}><Icon name="classes" size={20} /></span>Your flows</button>
        <button type="button" className="quick-tile" onClick={() => void nav.tab('calendar')}><span className="quick-ic" style={{ background: '#0F8A7E' }}><Icon name="calendar" size={20} /></span>Calendar</button>
      </div>
    </Screen>
  );
}

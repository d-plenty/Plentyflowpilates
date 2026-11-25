// The Flows tab: every flow on this device, what's on today and tomorrow, and starting a new one.
import { useState } from 'react';
import { CLASS_LEVELS, DEFAULT_CLASS_TYPES, FOCUSES, focusOf } from '../../engine';
import { blockCount, classTypesFor, levelName, makePlan, startClass, usualLevel } from '../../lib/plan';
import { uid } from '../../lib/clean';
import { applySetup, backupNudge, changeStudio, getData, lastTaught, setFav, snoozeNudge, studioOf, useData, usualStudio } from '../../lib/store';
import { addDays, changeSlot, clock, liveSlots, nextPlanned, niceDate, planOnDate, shiftOf, shiftSpan, shiftsOn, slotTitle, studioName, today } from '../../lib/calendar';
import { copyBackupOff } from '../../lib/files';
import { ReformerJump } from '../Reformer';
import type { ClassPlan, ClassType, Phase, Studio } from '../../lib/types';
import { Chips, Empty, Field, Icon, Info, Row, Screen, Star, Stepper, Switch, Back, chooseAsk, toast } from '../bits';
import { addStudio } from './Studios';
import { nav, viewState } from '../nav';
import { startPlay } from './Play';

export const ROLE_COLOR: Record<string, string> = { warmup: '#8FB9AE', build: 'var(--accent)', peak: 'var(--warn-dot)', cooldown: '#A7B5AF', stretch: '#A7B5AF' };
export const roleColor = (role: string) => ROLE_COLOR[role] || 'var(--accent)';

export function when(text?: string): string {
  if (!text) return '';
  const d = new Date(text.length === 10 ? `${text}T00:00` : text);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return text.length === 10 ? day : `${day}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function ClassCard({ plan }: { plan: ClassPlan }) {
  const studio = studioOf(plan.studioId);
  const taught = lastTaught(plan.id);
  const next = nextPlanned(plan.id);
  const total = plan.segments.reduce((n, s) => n + (s.minutes || Math.max(1, s.items.length)), 0) || 1;
  const sub = [next ? `Next ${niceDate(next.shift.date)}, ${clock(next.slot.start)}` : '', taught ? `Last taught ${when(taught.at.slice(0, 10))}${taught.studioName ? ` at ${taught.studioName}` : ''}` : 'Not taught yet', plan.from ? `From ${plan.from}` : ''].filter(Boolean).join(' · ');
  return (
    <div className="card">
      <div className="row between">
        <button type="button" className="link grow" style={{ color: 'inherit', fontSize: 'calc(16px * var(--scale))', fontWeight: 700 }} onClick={() => nav.go({ name: 'class', id: plan.id }, 'classes')}>{plan.title}</button>
        <Star on={!!plan.fav} label={plan.title} onChange={(on) => setFav(plan.id, on)} />
        <button type="button" className="btn icon round dark" aria-label={`Play ${plan.title}`} onClick={() => startPlay(plan)}><Icon name="play" size={16} fill /></button>
      </div>
      <div className="row wrap" style={{ marginTop: 6, gap: 6 }}>
        <span className="tag">{plan.lengthMin} min</span><span className="tag">{levelName(plan.level)}</span><span className="tag">{blockCount(plan)} blocks</span>
        {plan.focusText || (plan.goal && plan.goal !== 'full_body' && focusOf(plan)) ? <span className="tag acc">{focusOf(plan) as string}</span> : null}
      </div>
      {!plan.noPhases && plan.segments.length > 1 ? <div className="bar">{plan.segments.map((s) => <span key={s.id} title={s.name} style={{ flex: `${(s.minutes || Math.max(1, s.items.length)) / total} 1 0`, background: roleColor(s.role) }} />)}</div> : null}
      <div className="m" style={{ marginTop: 8 }}>{sub}{studio.id ? ` · ${studio.name}` : ''}</div>
    </div>
  );
}

const LINES = ["Let's get the blood flowing.", 'Springs on, shoulders down.', 'Ready when you are.', 'Find your neutral.', 'Plan it once, teach it well.', 'Time to make them shake.', 'Breathe in, plan out.'];
const lineToday = () => LINES[Math.floor(Date.now() / 864e5) % LINES.length];

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

/** "You need a studio first", with a way there and a way back. */
export async function needStudio(): Promise<boolean> {
  if (getData().studios.length) return true;
  const a = await chooseAsk('You need a studio first', 'A flow is planned for a studio: its reformer, springs and props. It takes a minute.', [{ id: 'go', label: 'Set up my studio', kind: 'p' }], 'Not now');
  if (a === 'go') { await nav.home('more'); nav.go({ name: 'studios' }, 'more'); addStudio(); }
  return false;
}
const newFlow = async () => { if (await needStudio()) nav.go({ name: 'new' }); };
export const importFlow = () => nav.go({ name: 'share', part: 'import' });

export function ClassesScreen() {
  const d = useData();
  const vs = viewState('classes', { filter: 'all', q: '' });
  const [, redraw] = useState(0);
  const set = (patch: Partial<typeof vs>) => { Object.assign(vs, patch); redraw((n) => n + 1); };
  const taughtIds = new Set(d.taught.map((t) => t.classId));
  const q = vs.q.trim().toLowerCase();
  const list = d.classes
    .filter((c) => (vs.filter === 'fav' ? c.fav : vs.filter === 'taught' ? taughtIds.has(c.id) : vs.filter === 'new' ? !taughtIds.has(c.id) : true))
    .filter((c) => !q || [c.title, c.focusText, studioOf(c.studioId).name, levelName(c.level)].some((x) => x && x.toLowerCase().includes(q)));
  const count = (f: string) => d.classes.filter((c) => (f === 'fav' ? c.fav : f === 'taught' ? taughtIds.has(c.id) : !taughtIds.has(c.id))).length;
  return (
    <Screen top={<div className="row between"><h1>Flows</h1><div className="row" style={{ gap: 8 }}><button type="button" className="btn sm" onClick={importFlow}><Icon name="download" size={18} />Import</button><button type="button" className="btn p sm" onClick={() => void newFlow()}><Icon name="plus" size={18} />New flow</button></div></div>}>
      <div className="hero"><ReformerJump /><h2>Welcome{d.settings.deviceName ? `, ${d.settings.deviceName}` : ''}</h2><p>{lineToday()}</p></div>
      <ComingUp />
      <BackupNudge />
      {d.classes.length ? <>
        <input type="search" placeholder="Search your flows" aria-label="Search your flows" value={vs.q} onChange={(e) => set({ q: e.target.value })} />
        <Chips scroll options={[{ id: 'all', label: `All ${d.classes.length}` }, { id: 'fav', label: `★ Favourites ${count('fav')}` }, { id: 'taught', label: `Taught ${count('taught')}` }, { id: 'new', label: `Not taught ${count('new')}` }]} value={vs.filter} onPick={(v) => set({ filter: v })} />
      </> : null}
      {!d.classes.length ? <Empty title="Your first flow" text={d.studios.length ? 'A flow is your plan for a class. Make one and build it block by block.' : 'Start with where you teach, then plan your first flow.'}><button type="button" className="btn p" onClick={() => void newFlow()}>{d.studios.length ? 'New flow' : 'Set up my studio'}</button></Empty>
        : !list.length ? <Empty title={vs.filter === 'fav' && !q ? 'No favourites yet' : 'Nothing matches'} text={vs.filter === 'fav' && !q ? 'Tap the star on a flow to keep it here.' : 'Try another search or tab.'} />
        : <div className="stack cards-2">{list.map((c) => <ClassCard key={c.id} plan={c} />)}</div>}
      <button type="button" className="card dash" onClick={importFlow}>Got a flow from someone? <span className="link">Bring it in</span></button>
    </Screen>
  );
}

/**
 * The first flow at a studio with no class types: what kind of class it is, how long and what
 * level, and its parts. Saved to the studio's class set-up.
 */
function FirstClassType({ studio, onDone }: { studio: Studio; onDone: (ct: ClassType) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [apparatus, setApparatus] = useState<'reformer' | 'mat'>(studio.hasReformers ? 'reformer' : 'mat');
  const [lengthMin, setLength] = useState(50);
  const [ownLength, setOwnLength] = useState('');
  const [level, setLevel] = useState('');
  const [usePhases, setUsePhases] = useState(true);
  const [phases, setPhases] = useState<Phase[]>([]);
  applySetup(studio.setup);
  const example = () => (DEFAULT_CLASS_TYPES as ClassType[]).find((c) => c.apparatus === apparatus) as ClassType;
  const scale = (n: number) => { const ex = example(); const k = n / ex.lengthMin; return ex.phases.map((p) => ({ ...p, sections: [...(p.sections || [])], minutes: Math.max(1, Math.round(p.minutes * k)) })); };
  const total = phases.reduce((n, p) => n + p.minutes, 0);
  const finish = () => {
    const ct: ClassType = { id: uid('ct'), name: name.trim() || 'My class', apparatus, lengthMin, springBudget: 0, ...(level ? { level } : {}), ...(usePhases ? {} : { noPhases: true }), phases: usePhases ? phases.filter((p) => p.name.trim()) : [] };
    changeStudio(studio.id, (s) => { s.setup.classTypes = [...s.setup.classTypes, ct]; s.setup.lengths = [...new Set([...s.setup.lengths, lengthMin])].sort((x, y) => x - y); });
    toast(`${ct.name} saved to ${studio.name}.`);
    onDone(ct);
  };
  const steps = ['name', 'length', 'parts'];
  const at = steps[step];
  const next = () => { if (at === 'length' && !phases.length) setPhases(scale(lengthMin)); if (step < steps.length - 1) setStep(step + 1); else finish(); };
  return (
    <Screen narrow top={<><Back label="Flows" /><div className="tiny" style={{ marginTop: 4 }}>New class type at {studio.name} · {step + 1} of 3</div><h1>{at === 'name' ? 'What kind of class is it?' : at === 'length' ? 'How long, and what level?' : 'The parts of the class'}</h1></>}
      foot={<>{step ? <button type="button" className="btn grow" onClick={() => setStep(step - 1)}>Back</button> : null}<button type="button" className="btn p grow" disabled={at === 'name' && !name.trim()} onClick={next}>{step === steps.length - 1 ? 'Save and continue' : 'Next'}</button></>}>
      {at === 'name' ? <>
        <div className="row wrap"><p className="m grow">A class on your timetable, like "Reformer Flow". You set it up once.</p><Info text="Every new flow of this kind starts from what you set here: its length, level and parts. Add more class types any time in the studio's Class set-up." /></div>
        <Field label="Name"><input type="text" maxLength={60} placeholder="Reformer Flow" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        {studio.hasReformers ? <div><div className="lab">On</div><div style={{ marginTop: 8 }}><Chips options={[{ id: 'reformer', label: 'Reformer' }, { id: 'mat', label: 'Mat' }]} value={apparatus} onPick={(v) => { setApparatus(v as 'reformer' | 'mat'); setPhases([]); }} /></div></div> : null}
      </> : null}
      {at === 'length' ? <>
        <div><div className="lab">Length</div><div style={{ marginTop: 8 }}><Chips options={[...new Set([30, 45, 50, 55, 60, lengthMin])].sort((x, y) => x - y).map((v) => ({ id: String(v), label: `${v} min` }))} value={String(lengthMin)} onPick={(v) => { setLength(Number(v)); setPhases([]); }} /></div>
          <div className="row" style={{ marginTop: 8 }}><input type="number" inputMode="numeric" min={10} max={180} placeholder="Other, in minutes" aria-label="Another length in minutes" value={ownLength} onChange={(e) => setOwnLength(e.target.value)} /><button type="button" className="btn sm" disabled={!(Number(ownLength) >= 10 && Number(ownLength) <= 180)} onClick={() => { setLength(Math.round(Number(ownLength))); setOwnLength(''); setPhases([]); }}>Use</button></div></div>
        <div><div className="row wrap"><div className="lab grow">Usual level</div><Info text="Need a level like Open level? Add it in the studio's Class set-up, under Levels." /></div><div style={{ marginTop: 8 }}><Chips options={[{ id: '', label: 'Choose each time' }, ...(CLASS_LEVELS as { id: string; label: string }[]).map((l) => ({ id: l.id, label: l.label }))]} value={level} onPick={setLevel} /></div></div>
      </> : null}
      {at === 'parts' ? <>
        <div className="card flush"><Row title="Plan it in parts" sub="Warm-up, footwork, core…" right={<Switch on={usePhases} onChange={setUsePhases} label="Plan it in parts" />} /></div>
        {usePhases ? <>
          <div className="row wrap"><p className="m grow">An example for {lengthMin} minutes. Rename, change the minutes, take out or add.</p><Info text="Each part gets its own minutes, and the flow shows its time against them as you build." /></div>
          <div className="card flush">{phases.map((p, i) => <div className="part-row" key={i}>
            <input type="text" maxLength={60} aria-label={`Name of part ${i + 1}`} value={p.name} onChange={(e) => setPhases(phases.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <span className="m">Minutes</span>
            <Stepper value={p.minutes} min={1} max={60} label={`Minutes for ${p.name}`} onChange={(v) => setPhases(phases.map((x, j) => (j === i ? { ...x, minutes: v } : x)))} />
            <button type="button" className="btn icon ghost" aria-label={`Take out ${p.name}`} onClick={() => setPhases(phases.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></button></div>)}</div>
          <button type="button" className="btn" onClick={() => setPhases([...phases, { name: 'New part', role: 'build', minutes: 5, sections: [] }])}><Icon name="plus" size={18} />Add a part</button>
          <div className={`m${Math.abs(total - lengthMin) > 2 ? ' warn-text' : ''}`} style={{ padding: '0 4px' }}>The parts add up to {total} of {lengthMin} minutes.</div>
        </> : <p className="m">One list of blocks. You can switch parts on for any flow later.</p>}
      </> : null}
    </Screen>
  );
}

/** A new flow. From the calendar it is for one class there (`shiftId`, `slotId`), or for a day (`date`). */
export function NewClassScreen({ shiftId, slotId, date: day }: { shiftId?: string; slotId?: string; date?: string }) {
  const d = useData();
  const shift = shiftOf(shiftId);
  const slot = shift?.slots.find((k) => k.id === slotId);
  const [studioId, setStudioId] = useState(shift?.studioId && d.studios.some((s) => s.id === shift.studioId) ? shift.studioId : usualStudio().id);
  const studio = studioOf(studioId);
  applySetup(studio.setup);
  const types = classTypesFor(studio);
  const [typeId, setTypeId] = useState((slot?.classType && types.some((c) => c.id === slot.classType) ? slot.classType : undefined) || types[0]?.id);
  const ct: ClassType | undefined = types.find((c) => c.id === typeId) || types[0];
  const [lengthMin, setLength] = useState(slot?.lengthMin || ct?.lengthMin || 50);
  const [level, setLevel] = useState(usualLevel(ct, studio));
  const focuses = FOCUSES as { id: string; label: string }[];
  const [goal, setGoal] = useState('');
  const [more, setMore] = useState(false);
  const [date, setDate] = useState(day ? `${day}T09:00` : '');
  const pickType = (c?: ClassType) => { if (!c) return; setTypeId(c.id); setLength(c.lengthMin); setLevel(usualLevel(c, studioOf(studioId))); };
  const pickStudio = (id: string) => { setStudioId(id); pickType(classTypesFor(studioOf(id))[0]); };
  if (!d.studios.length) return (
    <Screen narrow top={<><Back label="Flows" /><h1>New flow</h1></>}>
      <Empty title="You need a studio first" text="A flow is planned for a studio: its reformer, springs and props."><button type="button" className="btn p" onClick={() => addStudio()}>Set up my studio</button><button type="button" className="btn ghost" onClick={() => void nav.back()}>Not now</button></Empty>
    </Screen>
  );
  if (!ct) return <FirstClassType key={studio.id} studio={studio} onDone={(c) => { setTypeId(c.id); setLength(c.lengthMin); setLevel(usualLevel(c, studioOf(studioId))); }} />;
  const lengths = [...new Set([...studio.setup.lengths, ct.lengthMin, lengthMin])].sort((a, b) => a - b);
  const create = () => {
    const plan = makePlan({ classType: ct, lengthMin, level, goal, focusText: '', studio, draft: false });
    startClass(plan);
    // The calendar keeps the link straight away; a flow left unsaved just shows as "no flow yet" there.
    if (shift && slot) changeSlot(shift.id, slot.id, (k) => { k.flowId = plan.id; });
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) planOnDate(plan, date.slice(0, 10), date.slice(11, 16));
    nav.swap({ name: 'class', id: plan.id });
  };
  return (
    <Screen narrow top={<><Back label="Flows" /><h1>New flow</h1></>} foot={<>
      <button type="button" className="btn grow" onClick={() => void chooseAsk('Draft for me is coming soon', "It isn't good enough yet to plan a class for you. For now, start with empty parts and build it your way.", [{ id: 'ok', label: 'Start with empty parts', kind: 'p' }]).then((a) => { if (a) create(); })}><Icon name="spark" size={18} />Draft for me</button>
      <button type="button" className="btn p grow" onClick={create}>Start</button>
    </>}>
      {d.studios.length > 1 ? <div><div className="lab">Studio</div><div style={{ marginTop: 8 }}><Chips options={d.studios.map((s) => ({ id: s.id, label: s.name }))} value={studio.id} onPick={pickStudio} /></div></div> : null}
      <div><div className="lab">Class type</div><div style={{ marginTop: 8 }}><Chips options={[...types.map((c) => ({ id: c.id, label: c.name })), { id: '__add', label: '+ Another' }]} value={ct.id} onPick={(v) => (v === '__add' ? nav.go({ name: 'setup', studio: studio.id, part: 'types' }) : pickType(types.find((c) => c.id === v)))} /></div></div>
      <div><div className="lab">Length</div><div style={{ marginTop: 8 }}><Chips options={lengths.map((v) => ({ id: String(v), label: `${v} min` }))} value={String(lengthMin)} onPick={(v) => setLength(Number(v))} /></div></div>
      <button type="button" className="row between filters-toggle" aria-expanded={more} onClick={() => setMore(!more)}><b>More options</b><Icon name={more ? 'up' : 'down'} size={18} /></button>
      {more ? <>
        <div><div className="lab">Level</div><div style={{ marginTop: 8 }}><Chips options={(CLASS_LEVELS as { id: string; label: string }[]).map((l) => ({ id: l.id, label: l.label }))} value={level} onPick={setLevel} /></div></div>
        <div><div className="lab">Focus</div>{focuses.length ? <div style={{ marginTop: 8 }}><Chips options={[{ id: '', label: 'None' }, ...focuses.map((f) => ({ id: f.id, label: f.label }))]} value={goal} onPick={setGoal} /></div> : <p className="m" style={{ marginTop: 6 }}>No focuses at {studio.name} yet.</p>}
          <button type="button" className="link" style={{ marginTop: 6 }} onClick={() => nav.go({ name: 'setup', studio: studio.id, part: 'focuses' })}>Add focuses</button></div>
        {shift ? <p className="m">For {slotTitle(shift, slot!)} on {niceDate(shift.date)} at {clock(slot!.start)}.</p> : <Field label="Planned for" hint="Puts it on your calendar."><input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></Field>}
      </> : null}
    </Screen>
  );
}


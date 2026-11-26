// Class set-up: class types, levels, lengths, focuses, timing, movement sections and the lists.
// Each studio has its own.
import { useState } from 'react';
import { BUILTIN, DEFAULT_FOCUSES, DEFAULT_LEVELS, DEFAULT_TIMING_ROWS, MUSCLES, SECTION_GROUPS, SEGMENT_ROLES, guessSection, isBuiltinTiming, labelOf, timingFromRows } from '../../engine';
import { slugify, uid } from '../../lib/clean';
import { applySetup, getData, library, saveStudio, setSettings, useData } from '../../lib/store';
import { draftOf, editDraft, markSaved, openDraft, undoDraft } from '../../lib/drafts';
import type { ClassType, Named, Phase, Setup, Studio } from '../../lib/types';
import { Back, Chips, Empty, Field, Icon, Info, Row, SaveButton, Screen, Sheet, Stepper, Switch, showProblem, toast, useEditing } from '../bits';
import { nav } from '../nav';

type L = { id: string; label: string; group?: string }[];
const SPANS: [number, number, string][] = [[1, 1, 'Beginner'], [1, 2, 'Beginner + intermediate'], [2, 2, 'Intermediate'], [2, 3, 'Intermediate + advanced'], [3, 3, 'Advanced'], [1, 3, 'All of it']];
const makeId = (prefix: string, label: string, taken: string[]) => { let id = prefix + (slugify(label).replace(/-/g, '_') || 'item'); while (taken.includes(id)) id += '_2'; return id; };

// Every part of Class set-up edits the same unsaved copy of the studio (lib/drafts.ts) until Save.
let editing = '';
let studioId = '';
const undo = () => { undoDraft(editing); };
function change(fn: (s: Setup) => void, typing = false) {
  editDraft<Studio>(editing, (st) => { fn(st.setup); st.setup.timing = timingFromRows(st.setup.timingRows) as Record<string, number>; }, typing);
}
export const studioKey = (id: string) => `studio:${id}`;
/** Saves the studio being edited. A new one needs a name first. */
export function saveStudioDraft(id: string): boolean {
  const s = draftOf<Studio>(studioKey(id));
  if (!s) return true;
  if (!s.name.trim()) {
    editDraft<Studio & { tried?: boolean }>(studioKey(id), (x) => { x.tried = true; });
    // On the studio's own page the name box turns red; from a page inside it, a short message.
    if (document.querySelector('input[aria-label="Studio name"]')) showProblem(); else toast('Name the studio first.');
    return false;
  }
  const { usual, tried: _, ...rest } = s as Studio & { usual?: boolean; tried?: boolean };
  saveStudio({ ...rest, name: s.name.trim() });
  if (usual || getData().studios.length === 1) setSettings({ usualStudio: id });
  markSaved(studioKey(id));
  return true;
}
let topSave: { dirty: boolean; save: () => void } = { dirty: false, save: () => undefined };
const UndoRedo = () => <SaveButton dirty={topSave.dirty} onSave={topSave.save} />;
const Top = ({ title, sub, back = 'Class set-up' }: { title: string; sub?: string; back?: string }) => <><div className="row between"><Back label={back} /><UndoRedo /></div><h1>{title}</h1>{sub ? <div className="m" style={{ marginTop: 4 }}>{sub}</div> : null}</>;

export function SetupScreen({ studio: studioIdProp, part, id }: { studio: string; part?: string; id?: string }) {
  const sid = studioIdProp;
  useData();
  const key = studioKey(sid);
  const saved = getData().studios.find((x) => x.id === sid);
  const st = draftOf<Studio>(key) || (saved ? openDraft(key, saved) : undefined);
  const dirty = useEditing(key, st?.name ? `changes to ${st.name}` : 'this studio', () => saveStudioDraft(sid));
  if (!st) return <Screen top={<><Back /><h1>Studio not found</h1></>}><Empty title="This studio is no longer here" /></Screen>;
  editing = key;
  studioId = studioIdProp;
  topSave = { dirty, save: () => { if (saveStudioDraft(sid)) toast('Saved.'); } };
  applySetup(st.setup);
  const s = st.setup;
  if (part === 'types') return <Types s={s} />;
  if (part === 'type' && id) return <TypeEdit s={s} id={id} />;
  if (part === 'levels') return <Levels s={s} />;
  if (part === 'focuses') return <Focuses s={s} />;
  if (part === 'timing') return <Timing s={s} />;
  if (part === 'parts') return <Parts s={s} />;
  if (part === 'muscles' || part === 'lists') return <Muscles s={s} />;
  if (part === 'props') return <PropNames s={s} />;
  if (part === 'positions') return <Positions s={s} />;
  if (part === 'targets') return <Targets s={s} />;
  return (
    <Screen narrow top={<Top title="Class set-up" back={st.name || 'Studio'} sub={`How classes are set up at ${st.name || 'this studio'}. New classes here start from it.`} />}>
      <div className="card flush">
        <Row icon="classes" title="Class types" sub={s.classTypes.map((c) => c.name).join(', ')} onClick={() => nav.go({ name: 'setup', studio: sid, part: 'types' })} />
        <Row icon="up" title="Class levels" sub={s.levels.map((l) => l.label).join(', ')} onClick={() => nav.go({ name: 'setup', studio: sid, part: 'levels' })} />
        <Row icon="spark" title="Focuses" sub={`${s.focuses.length} to choose from`} onClick={() => nav.go({ name: 'setup', studio: sid, part: 'focuses' })} />
        <Row icon="clock" title="Lengths and timing" sub={`${s.lengths.join(', ')} min · spring changes, layers, your own timed lines`} onClick={() => nav.go({ name: 'setup', studio: sid, part: 'timing' })} />
        <Row icon="library" title="Movement sections" sub="How movements are sorted, like Core or Legs & glutes" onClick={() => nav.go({ name: 'setup', studio: sid, part: 'parts' })} />
        <Row icon="people" title="Muscles" onClick={() => nav.go({ name: 'setup', studio: sid, part: 'muscles' })} />
        <Row icon="box" title="Prop names" onClick={() => nav.go({ name: 'setup', studio: sid, part: 'props' })} />
        <Row icon="pin" title="Positions" onClick={() => nav.go({ name: 'setup', studio: sid, part: 'positions' })} />
        <Row icon="check" title="What a balanced class means" sub={Object.values(s.targets).map((t) => t.label).join(', ')} onClick={() => nav.go({ name: 'setup', studio: sid, part: 'targets' })} />
      </div>
    </Screen>
  );
}

const usesPhases = (ct: ClassType) => !ct.noPhases && ct.phases.length > 0;
/** Common class types to add in a tap. Each starts with a warm-up, the main part and a cool-down. */
export const SUGGESTED_TYPES: { name: string; apparatus: 'reformer' | 'mat'; lengthMin: number; level?: string }[] = [
  { name: 'Reformer Flow', apparatus: 'reformer', lengthMin: 50 },
  { name: 'Open Level Reformer', apparatus: 'reformer', lengthMin: 50, level: 'open' },
  { name: 'Beginner Reformer', apparatus: 'reformer', lengthMin: 45, level: 'beginner' },
  { name: 'Reformer Strength', apparatus: 'reformer', lengthMin: 50, level: 'intermediate' },
  { name: 'Jump Board Cardio', apparatus: 'reformer', lengthMin: 45 },
  { name: 'Reformer Express', apparatus: 'reformer', lengthMin: 30 },
  { name: 'Stretch and Restore', apparatus: 'reformer', lengthMin: 45, level: 'beginner' },
  { name: 'Prenatal Reformer', apparatus: 'reformer', lengthMin: 45, level: 'beginner' },
  { name: 'Mat Pilates', apparatus: 'mat', lengthMin: 45 },
];
const suggestedType = (x: (typeof SUGGESTED_TYPES)[number], st: Setup): ClassType => ({
  id: uid('ct'), name: x.name, apparatus: x.apparatus, lengthMin: x.lengthMin, springBudget: 0, ...(x.level && st.levels.some((l) => l.id === x.level) ? { level: x.level } : {}),
  phases: [{ name: 'Warm-up', role: 'warmup', minutes: 6, sections: [] }, { name: 'Main', role: 'build', minutes: Math.max(10, x.lengthMin - 11), sections: [] }, { name: 'Cool-down', role: 'cooldown', minutes: 5, sections: [] }],
});
function Types({ s }: { s: Setup }) {
  const add = () => { const id = uid('ct'); change((x) => { x.classTypes.push({ id, name: 'New flow', apparatus: 'reformer', lengthMin: x.defaultLength, springBudget: 0, phases: [{ name: 'Warm-up', role: 'warmup', minutes: 6, sections: [] }, { name: 'Main', role: 'build', minutes: Math.max(10, x.defaultLength - 11), sections: [] }, { name: 'Cool-down', role: 'cooldown', minutes: 5, sections: [] }] }); }); nav.go({ name: 'setup', studio: studioId, part: 'type', id }); };
  return (
    <Screen narrow top={<Top title="Class types" sub="The classes on your timetable. A new class starts from one, with everything you set here already chosen." />}>
      {!s.classTypes.length ? <Empty title="No class types yet" text="Tap a suggestion below, or add your own." /> : null}
      <div className="card flush">{s.classTypes.map((c) => <Row key={c.id} title={c.name} sub={[`${c.lengthMin} min`, c.apparatus === 'mat' ? 'Mat' : 'Reformer', usesPhases(c) ? `${c.phases.length} phases` : 'no phases', c.apparatus !== 'mat' && c.springBudget > 0 ? `up to ${c.springBudget} spring changes` : ''].filter(Boolean).join(' · ')} onClick={() => nav.go({ name: 'setup', studio: studioId, part: 'type', id: c.id })} />)}</div>
      <button type="button" className="btn" onClick={add}><Icon name="plus" size={18} />Add a class type</button>
      {SUGGESTED_TYPES.some((x) => !s.classTypes.some((c) => c.name.toLowerCase() === x.name.toLowerCase())) ? <div><div className="tiny" style={{ marginBottom: 6 }}>Suggestions you could add:</div>
        <Chips options={SUGGESTED_TYPES.filter((x) => !s.classTypes.some((c) => c.name.toLowerCase() === x.name.toLowerCase())).map((x) => ({ id: x.name, label: `+ ${x.name}` }))} value={[]} onPick={(n) => { const x = SUGGESTED_TYPES.find((y) => y.name === n)!; change((st) => { st.classTypes.push(suggestedType(x, st)); if (!st.lengths.includes(x.lengthMin)) st.lengths = [...st.lengths, x.lengthMin].sort((a, b) => a - b); }); toast(`${x.name} added. Tap it to change anything.`); }} /></div> : null}
    </Screen>
  );
}

function TypeEdit({ s, id }: { s: Setup; id: string }) {
  const ct = s.classTypes.find((c) => c.id === id);
  const [open, setOpen] = useState(-1);
  if (!ct) return <Screen top={<Top title="Class type" back="Class types" />}><Empty title="This class type is no longer here" /></Screen>;
  const edit = (fn: (c: ClassType) => void, typing = false) => change((x) => { const c = x.classTypes.find((y) => y.id === id); if (c) fn(c); }, typing);
  const total = ct.phases.reduce((n, p) => n + p.minutes, 0);
  const sections = sectionsOf(s);
  const ph = ct.phases[open];
  const editPhase = (fn: (p: Phase) => void, typing = false) => edit((c) => { if (c.phases[open]) fn(c.phases[open]); }, typing);
  return (
    <Screen narrow top={<Top title={ct.name} back="Class types" />}>
      <Field label="Name"><input type="text" maxLength={60} value={ct.name} onChange={(e) => edit((c) => { c.name = e.target.value; }, true)} /></Field>
      <div className="row"><Field label="Apparatus"><select value={ct.apparatus} onChange={(e) => edit((c) => { c.apparatus = e.target.value as ClassType['apparatus']; })}><option value="reformer">Reformer</option><option value="mat">Mat</option></select></Field>
        <Field label="Usual length"><select value={ct.lengthMin} onChange={(e) => edit((c) => { c.lengthMin = Number(e.target.value); })}>{[...new Set([...s.lengths, ct.lengthMin])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n} min</option>)}</select></Field></div>
      <div className="lab">What a new class of this type starts with</div>
      <div className="row"><Field label="Level"><select value={s.levels.some((l) => l.id === ct.level) ? ct.level : ''} onChange={(e) => edit((c) => { if (e.target.value) c.level = e.target.value; else delete c.level; })}><option value="">Instructor picks</option>{s.levels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></Field>
        <Field label="Balance target"><select value={s.targets[ct.target || ''] ? ct.target : ''} onChange={(e) => edit((c) => { if (e.target.value) c.target = e.target.value; else delete c.target; })}><option value="">The usual (General)</option>{Object.entries(s.targets).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></Field></div>
      {ct.apparatus !== 'mat' ? <Field label="Spring changes, at most" hint="Leave it empty, or type 0, for no limit: nothing is flagged and drafts stop counting."><input type="number" inputMode="numeric" min={0} max={20} placeholder="No limit" value={ct.springBudget > 0 ? ct.springBudget : ''} onChange={(e) => edit((c) => { c.springBudget = Math.max(0, Math.min(20, Math.round(Number(e.target.value)) || 0)); }, true)} /></Field> : null}
      <div className="lab">Its own timings</div>
      <div className="card flush">
        {s.timingRows.filter((r) => isBuiltinTiming(r.id)).map((r) => <div className="set" key={r.id}><span className="grow"><b>{r.label}</b><div className="m">Usually {r.off ? 0 : r.seconds} sec</div></span><input type="number" inputMode="numeric" className="short" min={0} max={600} aria-label={`${r.label} for ${ct.name}, seconds`} placeholder={String(r.off ? 0 : r.seconds)} value={ct.timing && ct.timing[r.id] !== undefined ? ct.timing[r.id] : ''} onChange={(e) => edit((c) => { c.timing = { ...(c.timing || {}) }; if (e.target.value === '') delete c.timing[r.id]; else c.timing[r.id] = Math.max(0, Math.min(600, Math.round(Number(e.target.value)) || 0)); if (!Object.keys(c.timing).length) delete c.timing; }, true)} /><span className="tiny">sec</span></div>)}
      </div>
      <p className="tiny" style={{ padding: '0 4px' }}>Leave a box empty to use the usual timing.</p>
      <div className="card flush"><Row title="Plan this flow in phases" sub="Optional, but recommended. Phases help you plan the class the way clients expect it." right={<Switch on={usesPhases(ct)} label="Plan this flow in phases" onChange={(on) => edit((c) => { if (on) { delete c.noPhases; if (!c.phases.length) c.phases = [{ name: 'Warm-up', role: 'warmup', minutes: 6, sections: [] }, { name: 'Main', role: 'build', minutes: Math.max(10, c.lengthMin - 11), sections: [] }, { name: 'Cool-down', role: 'cooldown', minutes: 5, sections: [] }]; } else c.noPhases = true; })} />} /></div>
      {usesPhases(ct) ? <>
        <div className="row between" style={{ padding: '0 4px' }}><span className="lab" style={{ padding: 0 }}>Phases, in order</span><span className={`tiny${total !== ct.lengthMin ? ' warn-text' : ''}`}>{total} of {ct.lengthMin} min</span></div>
        <div className="card flush">
          {ct.phases.map((p, i) => <Row key={i} title={p.name} sub={`${labelOf(SEGMENT_ROLES as L, p.role) as string} · ${p.minutes} min${(p.sections || []).length ? ` · ${(p.sections || []).map((x) => labelOf(sections, x) as string).join(', ')}` : ''}`} onClick={() => setOpen(i)} />)}
        </div>
        <button type="button" className="btn" onClick={() => edit((c) => { c.phases.push({ name: 'New phase', role: 'build', minutes: 5, sections: [] }); })}><Icon name="plus" size={18} />Add a phase</button>
        <p className="tiny" style={{ padding: '0 4px' }}>Drafts give each phase its share of the class and fill it from the parts of the library you tick. Warm-up and cool-down phases only use movements marked for them.</p>
      </> : <p className="m" style={{ padding: '0 4px' }}>A new class of this type is one list of blocks. Drafts still open with a warm-up and finish with a cool-down.{ct.phases.length ? ' The phases you set up are kept for when you switch this back on.' : ''}</p>}
      <div className="card flush">
        <Row icon="copy" title="Duplicate" onClick={() => { const nid = uid('ct'); change((x) => { x.classTypes.push({ ...structuredClone(ct), id: nid, name: `${ct.name} copy` }); }); nav.back(); toast('Duplicated.'); }} />
        <Row icon="trash" danger title="Delete this class type" sub="Flows already made from it stay as they are" onClick={true ? () => { change((x) => { x.classTypes = x.classTypes.filter((c) => c.id !== id); }); nav.back(); toast(`${ct.name} deleted.`, { label: 'Undo', run: undo }); } : undefined} right={s.classTypes.length > 1 ? undefined : <span className="tiny">Only one</span>} />
      </div>
      {ph ? (
        <Sheet title="Phase" onClose={() => setOpen(-1)}>
          <Field label="Name"><input type="text" maxLength={60} value={ph.name} onChange={(e) => editPhase((p) => { p.name = e.target.value; }, true)} /></Field>
          <div className="row"><Field label="Kind"><select value={ph.role} onChange={(e) => editPhase((p) => { p.role = e.target.value; })}>{(SEGMENT_ROLES as L).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></Field>
            <Field label="Minutes"><Stepper value={ph.minutes} min={1} max={60} label="minute" onChange={(n) => editPhase((p) => { p.minutes = n; })} /></Field></div>
          <div className="lab">Draws from</div>
          <Chips options={sections.map((x) => ({ id: x.id, label: x.label }))} value={ph.sections || []} onPick={(sid) => editPhase((p) => { p.sections = (p.sections || []).includes(sid) ? (p.sections || []).filter((x) => x !== sid) : [...(p.sections || []), sid]; })} />
          <div className="tiny">None ticked means anything suitable.</div>
          <div className="card flush">
            <Row icon="up" title="Move earlier" onClick={open > 0 ? () => { edit((c) => { const [p] = c.phases.splice(open, 1); c.phases.splice(open - 1, 0, p); }); setOpen(open - 1); } : undefined} right={open > 0 ? undefined : <span className="tiny">First</span>} />
            <Row icon="down" title="Move later" onClick={open < ct.phases.length - 1 ? () => { edit((c) => { const [p] = c.phases.splice(open, 1); c.phases.splice(open + 1, 0, p); }); setOpen(open + 1); } : undefined} right={open < ct.phases.length - 1 ? undefined : <span className="tiny">Last</span>} />
            <Row icon="trash" danger title="Delete this phase" onClick={() => { edit((c) => { c.phases.splice(open, 1); }); setOpen(-1); }} />
          </div>
        </Sheet>
      ) : null}
    </Screen>
  );
}

function Levels({ s }: { s: Setup }) {
  const missing = (DEFAULT_LEVELS as Setup['levels']).filter((d) => !s.levels.some((l) => l.id === d.id));
  return (
    <Screen narrow top={<Top title="Class levels" sub="Rename, delete or add your own. Every level is yours to change." />}>
      {!s.levels.length ? <Empty title="No levels" text="Flows can still be planned; add a level to pick one." /> : <div className="card flush">
        {s.levels.map((l, i) => (
          <div className="timing-row" key={l.id}>
            <div className="row"><input type="text" aria-label="Level name" maxLength={40} className="grow" style={{ fontWeight: 600 }} value={l.label} onChange={(e) => change((x) => { x.levels[i].label = e.target.value; }, true)} />
            <button type="button" className="btn icon ghost" aria-label={`Delete ${l.label}`} onClick={() => { change((x) => { x.levels.splice(i, 1); }); toast(`${l.label} deleted.`, { label: 'Undo', run: undo }); }}><Icon name="trash" size={16} /></button></div>
            <select aria-label={`What ${l.label} covers`} value={`${l.from}-${l.to}`} onChange={(e) => change((x) => { const [f, t2] = e.target.value.split('-').map(Number); x.levels[i].from = f; x.levels[i].to = t2; })}>{SPANS.map(([f, t2, label]) => <option key={label} value={`${f}-${t2}`}>{label}</option>)}</select>
          </div>
        ))}
      </div>}
      <div className="row wrap"><span className="tiny grow">What a level covers decides which movements a class at that level is offered.</span><Info text="Movements are written as beginner, intermediate or advanced. A level that covers “Beginner to Intermediate” is offered both. Deleting a level never changes a movement or a flow already made at it." /></div>
      {s.levels.length < 12 ? <button type="button" className="btn" onClick={() => change((x) => { x.levels.push({ id: makeId('', 'level', x.levels.map((l) => l.id)), label: 'New level', from: 1, to: 3 }); })}><Icon name="plus" size={18} />Add a level</button> : null}
      {missing.length ? <div><div className="tiny" style={{ marginBottom: 6 }}>Examples you could add:</div><Chips options={missing.map((m) => ({ id: m.id, label: `+ ${m.label}` }))} value={[]} onPick={(mid) => change((x) => { const m = missing.find((y) => y.id === mid); if (!m) return; const order = (DEFAULT_LEVELS as Setup['levels']).map((y) => y.id); x.levels.push({ ...m }); x.levels.sort((a, b) => (order.indexOf(a.id) < 0 ? 99 : order.indexOf(a.id)) - (order.indexOf(b.id) < 0 ? 99 : order.indexOf(b.id))); })} /></div> : null}
    </Screen>
  );
}

function Focuses({ s }: { s: Setup }) {
  const [open, setOpen] = useState('');
  const [name, setName] = useState('');
  const missing = (DEFAULT_FOCUSES as Setup['focuses']).filter((d) => !s.focuses.some((f) => f.id === d.id));
  const add = () => { const label = name.trim(); if (!label) return; if (s.focuses.some((f) => f.label.toLowerCase() === label.toLowerCase())) { toast(`${label} is already in the list.`); return; } const id = makeId('', label, s.focuses.map((f) => f.id)); change((x) => { x.focuses.push({ id, label, muscles: [] }); }); setName(''); setOpen(id); };
  return (
    <Screen narrow top={<Top title="Focuses" sub="What a class leans towards. Drafts favour the muscles ticked for a focus; with none ticked it is a balanced class. You can also type a focus of your own on any class." />}>
      <div className="card flush">
        {s.focuses.map((f, i) => (
          <div key={f.id}>
            <div className="set">
              <input type="text" aria-label="Focus name" maxLength={40} className="grow" style={{ fontWeight: 600 }} value={f.label} onChange={(e) => change((x) => { x.focuses[i].label = e.target.value; }, true)} />
              <button type="button" className="link" style={{ whiteSpace: 'nowrap', fontSize: 'calc(13px * var(--scale))' }} aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? '' : f.id)}>{f.muscles.length ? `${f.muscles.length} muscle${f.muscles.length === 1 ? '' : 's'}` : 'Balanced'}</button>
              {s.focuses.length > 1 ? <button type="button" className="btn icon ghost" aria-label={`Delete ${f.label}`} onClick={() => { change((x) => { x.focuses.splice(i, 1); }); toast(`${f.label} deleted.`, { label: 'Undo', run: undo }); }}><Icon name="close" size={16} /></button> : null}
            </div>
            {open === f.id ? <div style={{ padding: '4px 14px 14px', borderBottom: '1px solid var(--line-2)' }}><div className="tiny" style={{ marginBottom: 6 }}>Drafts favour</div><Chips options={(MUSCLES as L).map((m) => ({ id: m.id, label: m.label }))} value={f.muscles} onPick={(mid) => change((x) => { const m = x.focuses[i].muscles; x.focuses[i].muscles = m.includes(mid) ? m.filter((y) => y !== mid) : [...m, mid]; })} /></div> : null}
          </div>
        ))}
      </div>
      <div className="row"><input type="text" maxLength={40} placeholder="e.g. Runners, posture, arms & abs" aria-label="Name of the new focus" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /><button type="button" className="btn sm" disabled={!name.trim()} onClick={add}>Add</button></div>
      {missing.length ? <div><div className="tiny" style={{ marginBottom: 6 }}>Deleted, tap to put back:</div><Chips options={missing.map((m) => ({ id: m.id, label: `+ ${m.label}` }))} value={[]} onPick={(mid) => change((x) => { const m = missing.find((y) => y.id === mid); if (m) x.focuses.push(structuredClone(m)); })} /></div> : null}
    </Screen>
  );
}

function Timing({ s }: { s: Setup }) {
  const [name, setName] = useState('');
  const [secs, setSecs] = useState(60);
  const [len, setLen] = useState('');
  const rows = s.timingRows.filter((r) => !r.off);
  const gone = s.timingRows.filter((r) => r.off);
  const add = () => { const label = name.trim(); if (!label) return; if (s.timingRows.some((r) => r.label.toLowerCase() === label.toLowerCase())) { toast(`${label} is already in the list.`); return; } change((x) => { x.timingRows.push({ id: makeId('t_', label, x.timingRows.map((r) => r.id)), label, seconds: Math.max(0, Math.round(secs) || 60) }); }); setName(''); };
  return (
    <Screen narrow top={<Top title="Lengths and timing" />}>
      <div className="lab">Class lengths you run</div>
      <Chips options={s.lengths.map((n) => ({ id: String(n), label: `${n} min${n === s.defaultLength ? ' · usual' : ''}` }))} value={String(s.defaultLength)} onPick={(v) => change((x) => { x.defaultLength = Number(v); })} />
      <div className="row"><input type="number" inputMode="numeric" min={10} max={180} placeholder="Add a length, in minutes" aria-label="Add a length, in minutes" value={len} onChange={(e) => setLen(e.target.value)} /><button type="button" className="btn sm" disabled={!(Number(len) >= 10 && Number(len) <= 180)} onClick={() => { change((x) => { x.lengths = [...new Set([...x.lengths, Math.round(Number(len))])].sort((a, b) => a - b); }); setLen(''); }}>Add</button>
        <button type="button" className="btn sm" disabled={s.lengths.length < 2} onClick={() => change((x) => { x.lengths = x.lengths.filter((n) => n !== x.defaultLength); x.defaultLength = x.lengths[0]; })}>Remove usual</button></div>
      <p className="tiny" style={{ padding: '0 4px' }}>Tap a length to make it the usual one.</p>
      <div className="lab">Timing</div>
      <div className="row wrap"><span className="m grow">Time allowed for things that aren't the movement itself.</span><Info text="Rename them, write a note under each, change the seconds, remove the ones you don't count and add your own. Your own ones can be added to a flow as a timed line between blocks." /></div>
      <div className="card flush">{rows.map((r) => { const built = isBuiltinTiming(r.id) as boolean; const i = s.timingRows.indexOf(r); return (
        <div className="timing-row" key={r.id}>
          <input type="text" aria-label="Name" maxLength={60} style={{ fontWeight: 600 }} value={r.label} placeholder={built ? (DEFAULT_TIMING_ROWS as { id: string; label: string }[]).find((x) => x.id === r.id)?.label : 'Name'} onChange={(e) => change((x) => { x.timingRows[i].label = e.target.value; }, true)} />
          <div className="row">
            <input type="number" inputMode="numeric" className="short" min={0} max={built ? 600 : 3600} aria-label={`${r.label}, seconds`} value={r.seconds} onChange={(e) => change((x) => { x.timingRows[i].seconds = Math.max(0, Math.round(Number(e.target.value)) || 0); }, true)} /><span className="m grow">seconds{built ? ', counted for you' : ', a timed line you add'}</span>
            <button type="button" className="btn icon ghost" aria-label={`Remove ${r.label}`} onClick={() => { change((x) => { if (built) x.timingRows[i].off = true; else x.timingRows.splice(i, 1); }); toast(`${r.label} removed.`, { label: 'Undo', run: undo }); }}><Icon name="trash" size={16} /></button>
          </div>
          <textarea rows={2} aria-label={`Note for ${r.label}`} maxLength={200} placeholder="A note (optional)" value={r.note || ''} onChange={(e) => change((x) => { if (e.target.value) x.timingRows[i].note = e.target.value; else delete x.timingRows[i].note; }, true)} />
        </div>
      ); })}</div>
      <div className="row"><input type="text" maxLength={60} placeholder="e.g. Water break" aria-label="Name of the new timing" value={name} onChange={(e) => setName(e.target.value)} /><input type="number" inputMode="numeric" className="short" min={0} max={3600} aria-label="Seconds for the new timing" value={secs} onChange={(e) => setSecs(Number(e.target.value))} /><button type="button" className="btn sm" disabled={!name.trim()} onClick={add}>Add</button></div>
      {gone.length ? <div><div className="tiny" style={{ marginBottom: 6 }}>Removed, so they count for nothing. Tap to put back:</div><Chips options={gone.map((r) => ({ id: r.id, label: `+ ${r.label}` }))} value={[]} onPick={(rid) => change((x) => { const r = x.timingRows.find((y) => y.id === rid); if (r) delete r.off; })} /></div> : null}
    </Screen>
  );
}

const builtinSections = () => (BUILTIN as { sections: L }).sections;
const sectionsOf = (s: Setup): L => [...builtinSections().filter((x) => !s.removedSections.includes(x.id)).map((x) => ({ ...x, label: s.sectionLabels[x.id] || x.label })), ...s.customSections];
function Parts({ s }: { s: Setup }) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('core');
  const [del, setDel] = useState<{ id: string; label: string; custom: boolean } | null>(null);
  const [to, setTo] = useState('');
  const list = sectionsOf(s);
  const home = (id: string) => { for (let hop = 0; hop < 8 && s.sectionMap[id]; hop++) id = s.sectionMap[id]; return id; };
  const count = (id: string) => library().list.filter((m) => home(m.section || (guessSection(m) as string)) === id).length;
  const gone = builtinSections().filter((x) => s.removedSections.includes(x.id));
  const add = () => { const label = name.trim(); if (!label) return; if (list.some((x) => x.label.toLowerCase() === label.toLowerCase())) { toast(`${label} is already in the list.`); return; } change((x) => { x.customSections.push({ id: makeId('s_', label, [...builtinSections(), ...x.customSections].map((y) => y.id)), label, group }); }); setName(''); };
  const groups = SECTION_GROUPS as L;
  return (
    <Screen narrow top={<Top title="Movement sections" sub="How movements are sorted in lists. Rename, add your own, or delete the ones you don't use." />}>
      <div className="card flush">
        {list.map((x) => { const custom = s.customSections.some((c) => c.id === x.id); const n = count(x.id); return (
          <div className="set" key={x.id} style={{ flexWrap: 'wrap' }}>
            <input type="text" aria-label={`Name for ${x.label}`} maxLength={40} style={{ flex: '1 1 150px', fontWeight: 600 }} value={x.label} onChange={(e) => change((y) => { const v = e.target.value; if (custom) { const c = y.customSections.find((z) => z.id === x.id); if (c) c.label = v; } else { const orig = builtinSections().find((z) => z.id === x.id)!.label; if (v.trim() && v !== orig) y.sectionLabels[x.id] = v; else delete y.sectionLabels[x.id]; } }, true)} />
            <span className="tiny" style={{ flex: '1 1 120px' }}>{n} movement{n === 1 ? '' : 's'} · counts as {(labelOf(groups, x.group || 'core') as string).toLowerCase()}</span>
            {list.length > 1 ? <button type="button" className="btn icon ghost" aria-label={`Delete ${x.label}`} onClick={() => { setDel({ id: x.id, label: x.label, custom }); setTo(list.find((y) => y.id !== x.id)!.id); }}><Icon name="close" size={16} /></button> : null}
          </div>
        ); })}
      </div>
      <div className="row"><input type="text" maxLength={40} placeholder="e.g. Balance, tower" aria-label="Name of the new section" value={name} onChange={(e) => setName(e.target.value)} /><select aria-label="What the new section counts as" style={{ width: 'auto', flex: 'none' }} value={group} onChange={(e) => setGroup(e.target.value)}>{groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select><button type="button" className="btn sm" disabled={!name.trim()} onClick={add}>Add</button></div>
      <p className="tiny" style={{ padding: '0 4px' }}>A new section starts empty: open a movement, tap Edit and choose it under "Section".</p>
      {gone.length ? <button type="button" className="btn" onClick={() => change((x) => { for (const g of gone) delete x.sectionMap[g.id]; x.removedSections = []; })}><Icon name="plus" size={16} />Add the standard list</button> : null}
      {gone.length ? <div><div className="tiny" style={{ marginBottom: 6 }}>Or put back one at a time:</div><Chips options={gone.map((g) => ({ id: g.id, label: `+ ${g.label}` }))} value={[]} onPick={(gid) => change((x) => { x.removedSections = x.removedSections.filter((y) => y !== gid); delete x.sectionMap[gid]; })} /></div> : null}
      {del ? (
        <Sheet title={`Delete ${del.label}?`} onClose={() => setDel(null)} foot={<><button type="button" className="btn grow" onClick={() => setDel(null)}>Cancel</button><button type="button" className="btn danger grow" onClick={() => {
          change((x) => {
            if (del.custom) x.customSections = x.customSections.filter((c) => c.id !== del.id); else x.removedSections.push(del.id);
            for (const k of Object.keys(x.sectionMap)) if (x.sectionMap[k] === del.id) x.sectionMap[k] = to;
            x.sectionMap[del.id] = to;
            for (const c of x.classTypes) for (const p of c.phases) if ((p.sections || []).includes(del.id)) p.sections = [...new Set((p.sections || []).map((y) => (y === del.id ? to : y)))];
          });
          toast(`${del.label} deleted.`, { label: 'Undo', run: undo }); setDel(null);
        }}>Delete</button></>}>
          <p className="m">{count(del.id)} movement{count(del.id) === 1 ? ' is' : 's are'} filed under it. Choose the part they move to. Nothing else about them changes.</p>
          <Field label="Move them to"><select value={to} onChange={(e) => setTo(e.target.value)}>{list.filter((y) => y.id !== del.id).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}</select></Field>
        </Sheet>
      ) : null}
    </Screen>
  );
}

function ListCard({ title, hint, builtin, custom, removed, prefix, onChange }: { title: string; hint: string; builtin: L; custom: Named[]; removed: string[]; prefix: string; onChange: (custom: Named[], removed: string[]) => void }) {
  const [name, setName] = useState('');
  const live = [...builtin.filter((b) => !removed.includes(b.id)), ...custom];
  const add = () => { const label = name.trim(); if (!label) return; if (live.some((x) => x.label.toLowerCase() === label.toLowerCase())) { toast(`${label} is already in the list.`); return; } onChange([...custom, { id: makeId(prefix, label, [...builtin, ...custom].map((x) => x.id)), label }], removed); setName(''); };
  return (
    <div className="card stack-sm">
      <b>{title}</b><div className="m">{hint}</div>
      <div className="chips">{live.map((x) => <button type="button" key={x.id} className="chip" aria-label={`Remove ${x.label}`} onClick={() => (custom.some((c) => c.id === x.id) ? onChange(custom.filter((c) => c.id !== x.id), removed) : onChange(custom, [...removed, x.id]))}>{x.label} ×</button>)}</div>
      <div className="row"><input type="text" maxLength={40} placeholder="Add your own" aria-label={`Add to ${title}`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /><button type="button" className="btn sm" disabled={!name.trim()} onClick={add}>Add</button></div>
      {removed.length ? <div><div className="tiny" style={{ marginBottom: 6 }}>Removed, tap to put back:</div><div className="chips">{builtin.filter((b) => removed.includes(b.id)).map((b) => <button type="button" key={b.id} className="chip" onClick={() => onChange(custom, removed.filter((r) => r !== b.id))}>+ {b.label}</button>)}</div></div> : null}
    </div>
  );
}
function Muscles({ s }: { s: Setup }) {
  const B = BUILTIN as { muscles: L };
  return (
    <Screen narrow top={<Top title="Muscles" sub="The names on movements and in the balance checks. Removing one never deletes a movement." />}>
      {s.removedMuscles.length ? <button type="button" className="btn" onClick={() => change((x) => { x.removedMuscles = []; })}><Icon name="plus" size={16} />Add the standard muscle list</button> : null}
      <ListCard title="Muscles" hint="Tap one to take it out." builtin={B.muscles} custom={s.customMuscles} removed={s.removedMuscles} prefix="m_" onChange={(c, r) => change((x) => { x.customMuscles = c; x.removedMuscles = r; })} />
    </Screen>
  );
}
function PropNames({ s }: { s: Setup }) {
  const B = BUILTIN as { equipment: L };
  return (
    <Screen narrow top={<Top title="Prop names" sub="The props this studio can name. Say how many it has under Studio props." />}>
      <ListCard title="Props" hint="Tap one to take it out." builtin={B.equipment} custom={s.customProps} removed={s.removedProps} prefix="p_" onChange={(c, r) => change((x) => { x.customProps = c; x.removedProps = r; })} />
    </Screen>
  );
}
function Positions({ s }: { s: Setup }) {
  const B = BUILTIN as { positions: L };
  return (
    <Screen narrow top={<Top title="Positions" sub="Where the body is: standing, supine, kneeling and so on. Used on movements and as filters." />}>
      <ListCard title="Positions" hint="Tap one to take it out. Movements keep their position." builtin={B.positions} custom={s.customPositions} removed={s.removedPositions} prefix="q_" onChange={(c, r) => change((x) => { x.customPositions = c; x.removedPositions = r; })} />
    </Screen>
  );
}

function Targets({ s }: { s: Setup }) {
  const dirs: [string, string][] = [['flexion', 'Flexion'], ['extension', 'Extension'], ['rotation', 'Rotation'], ['side-bend', 'Side bend']];
  return (
    <Screen narrow top={<Top title="What a balanced class means" sub="The share of spine movement a class is checked against. A class type or a single class picks which one to use." />}>
      {Object.entries(s.targets).map(([k, t]) => { const sum = dirs.reduce((n, [d]) => n + Number(t[d] || 0), 0); return (
        <div className="card stack-sm" key={k}>
          <input type="text" aria-label="Name" maxLength={40} style={{ fontWeight: 700 }} value={t.label} onChange={(e) => change((x) => { x.targets[k].label = e.target.value; }, true)} />
          {dirs.map(([d, label]) => <div className="row" key={d}><span className="grow">{label}</span><Stepper value={Math.round(Number(t[d] || 0) / 5)} min={0} max={20} label={label} onChange={(n) => change((x) => { x.targets[k][d] = n * 5; })} /><span className="tiny" style={{ width: 40, textAlign: 'right' }}>{Number(t[d] || 0)}%</span></div>)}
          <div className={`tiny${sum !== 100 ? ' warn-text' : ''}`}>Adds up to {sum}%{sum !== 100 ? '. Aim for 100.' : ''}</div>
          {Object.keys(s.targets).length > 1 && k !== 'general' ? <button type="button" className="link" style={{ color: 'var(--danger)' }} onClick={() => change((x) => { delete x.targets[k]; })}>Delete this target</button> : null}
        </div>
      ); })}
      <button type="button" className="btn" onClick={() => change((x) => { x.targets[makeId('', 'target', Object.keys(x.targets))] = { label: 'New target', flexion: 50, extension: 25, rotation: 12, 'side-bend': 13 }; })}><Icon name="plus" size={18} />Add a target</button>
    </Screen>
  );
}

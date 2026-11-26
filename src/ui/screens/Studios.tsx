// My studios: each place you teach, with its own reformers, springs, props and class set-up.
// Edits are kept unsaved until Save (lib/drafts.ts).
import { BRANDS, BUILTIN, LOAD_LEVELS, springFor } from '../../engine';
import { PROP_GROUP_LIST, addProp, groupOf, mergeProp, pickableProps, propGroups, propLabel, propsChanged, regroupProp, removeProp, renameProp, resizeProp, restoreProps } from '../../lib/props';
import { closeDraft, draftOf, editDraft, openDraft } from '../../lib/drafts';
import { newStudio } from '../../lib/clean';
import { studioText, fileNameFor } from '../../lib/files';
import { giveFile } from '../../lib/storage';
import { getData, removeStudio, useData } from '../../lib/store';
import type { Studio } from '../../lib/types';
import { Back, Chips, Empty, Field, Fold, Icon, Info, Row, SaveButton, Screen, Sheet, Springs, Stepper, Switch, confirmAsk, toast, useEditing } from '../bits';
import { nav } from '../nav';
import { studioLine } from './Builder';
import { saveStudioDraft, studioKey } from './ClassSetup';
import { useState } from 'react';

type BrandT = { label: string; standard: Record<string, number>; springs: Record<string, unknown> };
const allSprings = (s: Studio) => Object.entries(s.springs).flatMap(([l, c]) => Array(Math.min(6, Number(c) || 0)).fill(l) as string[]);
const WORD: Record<string, string> = { xlight: 'extra light', light: 'light', medium: 'medium', heavy: 'heavy', xheavy: 'extra heavy' };

/** Start a new studio (not saved until Save) and open it. */
export function addStudio(): void {
  const s = newStudio();
  openDraft(studioKey(s.id), null, s);
  nav.go({ name: 'studio', id: s.id });
}

export function StudiosScreen() {
  const d = useData();
  const [q, setQ] = useState('');
  return (
    <Screen narrow top={<><Back label="More" /><div className="row between"><h1>My studios</h1><button type="button" className="btn p sm" onClick={addStudio}><Icon name="plus" size={18} />Add a studio</button></div>
      <div className="row wrap" style={{ marginTop: 6 }}><span className="m grow">Where you teach. Each has its own reformer, springs, props and class set-up.</span><Info text="A flow is built for one studio and shows that studio's springs. Your usual studio is where new flows start: change it inside a studio." /></div></>}>
      {!d.studios.length ? <Empty title="No studios yet" text="Add the place you teach. Its reformers, springs, props and class set-up are what everything else follows."><button type="button" className="btn p" onClick={addStudio}>Add a studio</button></Empty> : null}
      {d.studios.length > 3 ? <input type="search" placeholder="Search your studios" aria-label="Search your studios" value={q} onChange={(e) => setQ(e.target.value)} /> : null}
      {d.studios.filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())).map((s) => (
        <div className="card stack-sm" key={s.id}>
          <button type="button" className="pick-plain" onClick={() => nav.go({ name: 'studio', id: s.id })}>
            <div className="row between"><b style={{ fontSize: 'calc(17px * var(--scale))' }}>{s.name}</b>{s.id === d.settings.usualStudio && d.studios.length > 1 ? <span className="tag acc">★ Usual studio</span> : null}</div>
            <div className="m">{studioLine(s)} · {s.setup.classTypes.length ? `${s.setup.classTypes.length} class type${s.setup.classTypes.length === 1 ? '' : 's'}` : 'no class types yet'}</div>
            {s.hasReformers ? <div style={{ marginTop: 8 }}><Springs loads={allSprings(s)} studio={s} /></div> : null}
          </button>
        </div>
      ))}
      <button type="button" className="card dash" onClick={() => nav.go({ name: 'share' })}>Got a studio from a co-worker? <span className="link">Bring it in</span></button>
    </Screen>
  );
}

/** The studio's props, in groups, with how many of each. Tap a name to rename it, merge it into
 *  another or take it out; weights and balls list their sizes underneath (lib/props.ts). */
export function PropsOwned({ s, edit }: { s: Studio; edit: (fn: (x: Studio) => void) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<null | { group?: string; kind?: string }>(null);
  const groups = propGroups(s.setup);
  const count = (id: string) => Number(s.props[id]) || 0;
  const setCount = (id: string, n: number) => edit((x) => { const next = { ...x.props }; if (n > 0) next[id] = n; else delete next[id]; x.props = next; });
  const line = (id: string, label: string, size = false) => (
    <div className={`prop-row${size ? ' size' : ''}`} key={id}>
      <button type="button" className="prop-name" aria-label={`Change ${propLabel(s.setup, id)}`} onClick={() => setEditing(id)}><span>{label}</span><Icon name="edit" size={14} /></button>
      <Stepper value={count(id)} max={99} label={propLabel(s.setup, id)} onChange={(n) => setCount(id, n)} />
    </div>
  );
  return (
    <div className="stack-sm">
      {groups.map((g) => (
        <div className="card flush prop-group" key={g.id}>
          <div className="prop-head">{g.label}</div>
          {g.rows.length ? g.rows.map((r) => (
            <div key={r.id}>
              {line(r.id, r.children.length ? `${r.label}${r.sizes === 'weights' ? ', no size' : ''}` : r.label)}
              {r.children.map((c) => line(c.id, c.label, true))}
              {r.sizes ? <button type="button" className="prop-add-size" onClick={() => setAdding({ group: g.id, kind: r.id })}>+ {r.sizes === 'balls' ? `A weighted ${r.label.toLowerCase()}` : `A size of ${r.label.toLowerCase()}`}</button> : null}
            </div>
          )) : <div className="prop-empty m">None listed</div>}
        </div>
      ))}
      <button type="button" className="btn" onClick={() => setAdding({})}><Icon name="plus" size={16} /> Add a prop</button>
      {propsChanged(s.setup) ? <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => edit((x) => restoreProps(x))}>Put the starting props back</button> : null}
      <p className="tiny" style={{ padding: '0 4px' }}>Set 0 for props you don't have. Drafts leave out movements that need a prop you have none of. A movement that needs hand weights is happy with any size.</p>
      {editing ? <PropSheet s={s} id={editing} edit={edit} onClose={() => setEditing(null)} /> : null}
      {adding ? <AddPropSheet s={s} start={adding} edit={edit} onClose={() => setAdding(null)} /> : null}
    </div>
  );
}

const kgOf = (t: string) => { const n = Number(t.replace(',', '.')); return n > 0 && n <= 50 ? Math.round(n * 100) / 100 : 0; };

function PropSheet({ s, id, edit, onClose }: { s: Studio; id: string; edit: (fn: (x: Studio) => void) => void; onClose: () => void }) {
  const set = s.setup;
  const own = set.customProps.find((c) => c.id === id);
  const builtinLabel = (BUILTIN as { equipment: { id: string; label: string }[] }).equipment.find((b) => b.id === id)?.label;
  const size = !!(own?.kind && own.kg);
  const [name, setName] = useState(size ? '' : propLabel(set, id));
  const [kg, setKg] = useState(own?.kg ? String(own.kg) : '');
  const [into, setInto] = useState('');
  const others = pickableProps(set).filter((p) => p.id !== id && !set.customProps.some((c) => c.id === p.id && c.kind === id));
  const done = () => {
    if (size) { const k = kgOf(kg); if (k && k !== own!.kg) edit((x) => resizeProp(x, id, k)); }
    else if (name.trim() !== propLabel(set, id)) edit((x) => renameProp(x, id, name));
    onClose();
  };
  return (
    <Sheet title={propLabel(set, id)} onClose={onClose} foot={<button type="button" className="btn p grow" onClick={done}>Done</button>}>
      {size ? <Field label="Weight (kg)"><input type="text" inputMode="decimal" maxLength={5} value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
        : <Field label="Name" hint={builtinLabel ? `Leave it blank for the usual name, ${builtinLabel}.` : undefined}><input type="text" maxLength={40} value={name} placeholder={builtinLabel} onChange={(e) => setName(e.target.value)} /></Field>}
      {own && !own.kind ? <div><div className="lab" style={{ padding: 0 }}>Group</div><div style={{ marginTop: 8 }}><Chips options={PROP_GROUP_LIST} value={groupOf(set, id)} onPick={(g) => edit((x) => regroupProp(x, id, g))} /></div></div> : null}
      <div className="row between"><b>How many</b><Stepper value={Number(s.props[id]) || 0} max={99} label={propLabel(set, id)} onChange={(n) => edit((x) => { const next = { ...x.props }; if (n > 0) next[id] = n; else delete next[id]; x.props = next; })} /></div>
      <div className="card stack-sm">
        <b>The same thing as another prop?</b>
        <span className="m">Merge them: this one stops being listed, and movements that ask for it count the other. The higher count is kept.</span>
        <div className="row"><select aria-label="Merge into" value={into} onChange={(e) => setInto(e.target.value)}><option value="">Pick a prop</option>{others.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
          <button type="button" className="btn sm" disabled={!into} onClick={() => { const to = propLabel(set, into); edit((x) => { mergeProp(x, id, into); }); toast(`Merged into ${to}. Save to keep it.`); onClose(); }}>Merge</button></div>
      </div>
      <button type="button" className="btn danger" onClick={() => { edit((x) => removeProp(x, id)); toast(`${propLabel(set, id)} taken out. Save to keep it.`); onClose(); }}><Icon name="trash" size={16} /> {builtinLabel ? 'Take it out of this studio' : 'Delete'}</button>
      {builtinLabel ? <p className="tiny">It can come back with Put the starting props back.</p> : null}
    </Sheet>
  );
}

function AddPropSheet({ s, start, edit, onClose }: { s: Studio; start: { group?: string; kind?: string }; edit: (fn: (x: Studio) => void) => void; onClose: () => void }) {
  const set = s.setup;
  const groups = propGroups(set);
  const [group, setGroup] = useState(start.group || 'other');
  const kinds = (groups.find((g) => g.id === group)?.rows || []).filter((r) => r.sizes);
  const [kind, setKind] = useState(start.kind || '');
  const [weighted, setWeighted] = useState(group === 'balls' && !!start.kind);
  const [name, setName] = useState('');
  const [kg, setKg] = useState('');
  const [n, setN] = useState(1);
  const sized = (group === 'weights' && !!kind) || (group === 'balls' && !!kind && weighted);
  const ok = sized ? kgOf(kg) > 0 : kind ? true : !!name.trim();
  const add = () => {
    if (!ok) return;
    edit((x) => { addProp(x, sized ? { kind, kg: kgOf(kg), count: n } : kind ? { label: propLabel(set, kind), count: n } : { label: name, group, count: n }); });
    onClose();
  };
  return (
    <Sheet title="Add a prop" onClose={onClose} foot={<button type="button" className="btn p grow" disabled={!ok} onClick={add}>Add</button>}>
      <div><div className="lab" style={{ padding: 0 }}>Group</div><div style={{ marginTop: 8 }}><Chips options={PROP_GROUP_LIST} value={group} onPick={(g) => { setGroup(g); setKind(''); setWeighted(false); }} /></div></div>
      {kinds.length ? <div><div className="lab" style={{ padding: 0 }}>{group === 'balls' ? 'Which ball' : 'Which weights'}</div><div style={{ marginTop: 8 }}><Chips options={[...kinds.map((k) => ({ id: k.id, label: k.label })), { id: '', label: 'Something else' }]} value={kind} onPick={setKind} /></div></div> : null}
      {group === 'balls' && kind ? <div className="row between"><b>Weighted ball</b><Switch on={weighted} onChange={setWeighted} label="Weighted ball" /></div> : null}
      {sized ? <Field label="Weight (kg)" hint="Like 1, 1.5 or 2"><input type="text" inputMode="decimal" maxLength={5} autoFocus value={kg} onChange={(e) => setKg(e.target.value)} /></Field> : null}
      {!kind ? <Field label="Name"><input type="text" maxLength={40} autoFocus placeholder={group === 'weights' ? 'Wrist weights' : group === 'balls' ? 'Stability ball' : 'Yoga block'} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /></Field> : null}
      <div className="row between"><b>How many</b><Stepper value={n} min={1} max={99} label="to add" onChange={setN} /></div>
    </Sheet>
  );
}

export function StudioScreen({ id }: { id: string }) {
  const d = useData();
  const [copying, setCopying] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const key = studioKey(id);
  const saved = d.studios.find((x) => x.id === id);
  const s = (draftOf<Studio>(key) || (saved ? openDraft(key, { ...saved, usual: d.settings.usualStudio === saved.id } as Studio) : undefined)) as (Studio & { usual?: boolean }) | undefined;
  const dirty = useEditing(key, s?.name ? `changes to ${s.name}` : 'this studio', () => saveStudioDraft(id));
  if (!s) return <Screen top={<><Back label="My studios" /><h1>Studio not found</h1></>}><Empty title="This studio is no longer here" /></Screen>;
  const edit = (fn: (x: Studio) => void, typing = false) => editDraft<Studio>(key, fn, typing);
  const brands = Object.entries(BRANDS as Record<string, BrandT>);
  const brand = (BRANDS as Record<string, BrandT>)[s.brand];
  const levels = (LOAD_LEVELS as string[]).filter((l) => brand.springs[l] || s.springOverrides[l] || s.springs[l]);
  const usedBy = d.classes.filter((c) => c.studioId === s.id).length;
  const set = s.setup;
  const go = (part?: string) => nav.go({ name: 'setup', studio: id, ...(part ? { part } : {}) });
  return (
    <Screen narrow top={<><div className="row between"><Back label="My studios" /><SaveButton dirty={dirty} onSave={() => { if (saveStudioDraft(id)) toast('Saved.'); }} /></div><h1>{s.name || 'New studio'}</h1></>}>
      {!saved && d.studios.length ? <button type="button" className="card dash" onClick={() => setCopying(true)}><Icon name="copy" size={18} /> Start from one of your studios <span className="link">Import from a studio</span></button> : null}
      <Field label="Name" error={(s as Studio & { tried?: boolean }).tried && !s.name.trim() ? 'Give the studio a name.' : undefined}><input type="text" maxLength={60} placeholder="Harbour Pilates" aria-label="Studio name" value={s.name} onChange={(e) => edit((x) => { x.name = e.target.value; }, true)} /></Field>
      <div className="card flush">
        <Row title="Has reformers" sub="Off for a mat-only space" right={<Switch on={s.hasReformers} onChange={(on) => edit((x) => { x.hasReformers = on; })} label="Has reformers" />} />
        {d.studios.length > (saved ? 1 : 0) ? <Row title="My usual studio" sub="New flows start here" right={<Switch on={!!s.usual} onChange={(on) => edit((x) => { (x as Studio & { usual?: boolean }).usual = on; })} label="My usual studio" />} /> : null}
      </div>
      {s.hasReformers ? <>
        <div className="row"><Field label="Reformer"><select value={s.brand} onChange={(e) => edit((x) => { x.brand = e.target.value; x.springs = { ...(BRANDS as Record<string, BrandT>)[e.target.value].standard }; x.springOverrides = {}; })}>{brands.map(([k, b]) => <option key={k} value={k}>{b.label}</option>)}</select></Field>
          <Field label="How many"><input type="number" inputMode="numeric" min={0} max={99} className="short" value={s.reformers || ''} placeholder="0" onChange={(e) => edit((x) => { x.reformers = Math.max(0, Math.min(99, Math.round(Number(e.target.value)) || 0)); }, true)} /></Field></div>
        <Fold title="Springs on each reformer" open={!saved} bodyClass=""><div className="card flush">
          {levels.map((l) => { const sp = springFor(s.brand, l, s.springOverrides) as { name: string; color: string }; return (
            <div className="set" key={l}><span className="dot" style={{ background: sp.color }} /><span className="grow"><b>{sp.name}</b> <span className="m">· {WORD[l]}</span></span><Stepper value={Number(s.springs[l]) || 0} max={8} label={sp.name} onChange={(n) => edit((x) => { const springs = { ...x.springs }; if (n > 0) springs[l] = n; else delete springs[l]; x.springs = springs; })} /></div>
          ); })}
          <Row title="Put the springs back to the usual set" sub={`What a ${brand.label} reformer ships with`} onClick={() => edit((x) => { x.springs = { ...brand.standard }; })} />
        </div><div className="row wrap" style={{ marginTop: 8 }}><span className="m grow">Every spring in the app follows these.</span><Info text="The library, your flows and Play all show this studio's springs. A spring it doesn't have becomes the nearest one it does, marked ≈." /></div></Fold>
      </> : null}
      <Fold title="Studio props" sub={Object.keys(s.props).length ? `${Object.keys(s.props).length} you have` : undefined} bodyClass=""><PropsOwned s={s} edit={(fn) => edit(fn)} /></Fold>
      <div className="lab">Class set-up</div>
      <div className="card flush">
        <Row icon="classes" title="Class types" sub={set.classTypes.length ? set.classTypes.map((c) => c.name).join(', ') : 'None yet: add the classes on your timetable'} onClick={() => go('types')} />
        <Row icon="up" title="Class levels" sub={set.levels.map((l) => l.label).join(', ')} onClick={() => go('levels')} />
        <Row icon="spark" title="Focuses" sub={set.focuses.map((f) => f.label).join(', ')} onClick={() => go('focuses')} />
        <Row icon="clock" title="Lengths and timing" sub={set.lengths.length ? `${set.lengths.join(', ')} min` : 'No lengths yet'} onClick={() => go('timing')} />
        <Row icon="library" title="Movement sections" sub="How movements are sorted, like Core or Legs & glutes" onClick={() => go('parts')} />
        <Row icon="people" title="Muscles" sub={`${set.removedMuscles.length ? 'Your own list' : 'The full list'}${set.customMuscles.length ? `, ${set.customMuscles.length} of your own` : ''}`} onClick={() => go('muscles')} />
        <Row icon="pin" title="Positions" sub={set.customPositions.length ? `${set.customPositions.length} of your own` : 'Standing, supine, kneeling and more'} onClick={() => go('positions')} />
        <Row icon="check" title="What a balanced class means" sub={Object.values(set.targets).map((t) => t.label).join(', ')} onClick={() => go('targets')} />
      </div>
      {saved ? <div className="card flush">
        <Row icon="copy" title="Duplicate this studio" sub="A new studio with the parts you pick" right={<span className="row" style={{ gap: 6 }}><Info text="Handy when you start at a new studio: copy your class types, levels, focuses, muscles, timing and more, then change what's different. You tick what to copy each time." /><Icon name="next" size={18} /></span>} onClick={() => { if (dirty) { toast('Save first, then duplicate.'); return; } setDuplicating(true); }} />
        <Row icon="share" title="Share this studio's set-up" sub="So a co-worker doesn't type it in again" onClick={() => { if (dirty) { toast('Save first, then share.'); return; } nav.go({ name: 'share', studioId: s.id }); }} />
        <Row icon="file" title="Save it as a file" onClick={() => { if (dirty) { toast('Save first, then make the file.'); return; } void giveFile(fileNameFor(s.name, 'studio'), studioText(saved)).catch(() => toast("Couldn't make the file.")); }} />
        <Row icon="trash" danger title="Delete this studio" sub={usedBy ? `${usedBy} class${usedBy === 1 ? ' was' : 'es were'} planned here. They stay, and can be moved to another studio.` : undefined} onClick={async () => { if (await confirmAsk(`Delete ${s.name}?`, 'Its reformers, springs, props and class set-up are removed from this device. Your classes stay.', 'Delete', true)) { closeDraft(key); removeStudio(s.id); nav.backNow(); } }} />
      </div> : <button type="button" className="btn danger" onClick={() => { closeDraft(key); nav.backNow(); }}>Don't add this studio</button>}
      {copying ? <CopyStudioSheet into={s} onClose={() => setCopying(false)} onCopy={(from, parts) => { edit((x) => copyParts(from, x, parts)); setCopying(false); toast(`Copied from ${from.name}. Change what's different, then Save.`); }} /> : null}
      {duplicating && saved ? <CopyStudioSheet from={saved} onClose={() => setDuplicating(false)} onCopy={(from, parts) => { setDuplicating(false); const n = newStudio(); copyParts(from, n, parts); n.name = `${from.name} (copy)`; openDraft(studioKey(n.id), null, n); nav.go({ name: 'studio', id: n.id }); }} /> : null}
      {!getData().studios.length && !saved ? <p className="tiny center">Tap Save when you're done. You can change all of this later in More → My studios.</p> : null}
    </Screen>
  );
}

// ---- copying from one studio to another (Duplicate, or "Import from a studio" on a new one)
export const COPY_PARTS = [
  { id: 'reformers', label: 'Reformers and springs', sub: 'The brand, how many, and the springs on each' },
  { id: 'props', label: 'Studio props', sub: 'What it has and how many, and your own props' },
  { id: 'types', label: 'Class types', sub: 'With their lengths, levels and parts' },
  { id: 'levels', label: 'Class levels' },
  { id: 'focuses', label: 'Focuses' },
  { id: 'timing', label: 'Lengths and timing' },
  { id: 'parts', label: 'Movement sections' },
  { id: 'muscles', label: 'Muscles' },
  { id: 'positions', label: 'Positions' },
  { id: 'targets', label: 'What a balanced class means' },
] as const;
export type CopyPart = (typeof COPY_PARTS)[number]['id'];
/** Copies the picked parts of one studio's set-up onto another. Its name and id stay its own. */
export function copyParts(from: Studio, to: Studio, parts: CopyPart[]): void {
  const f = structuredClone(from);
  const has = (p: CopyPart) => parts.includes(p);
  if (has('reformers')) { to.hasReformers = f.hasReformers; to.brand = f.brand; to.reformers = f.reformers; to.springs = f.springs; to.springOverrides = f.springOverrides; }
  if (has('props')) { to.props = f.props; to.setup.customProps = f.setup.customProps; to.setup.removedProps = f.setup.removedProps; to.setup.renamedProps = f.setup.renamedProps; to.setup.propAlias = f.setup.propAlias; to.setup.customCautions = f.setup.customCautions; to.setup.removedCautions = f.setup.removedCautions; }
  if (has('types')) to.setup.classTypes = f.setup.classTypes.map((c) => ({ ...c }));
  if (has('levels')) to.setup.levels = f.setup.levels;
  if (has('focuses')) to.setup.focuses = f.setup.focuses;
  if (has('timing')) { to.setup.lengths = f.setup.lengths; to.setup.defaultLength = f.setup.defaultLength; to.setup.timingRows = f.setup.timingRows; to.setup.timing = f.setup.timing; }
  if (has('parts')) { to.setup.customSections = f.setup.customSections; to.setup.removedSections = f.setup.removedSections; to.setup.sectionLabels = f.setup.sectionLabels; to.setup.sectionMap = f.setup.sectionMap; }
  if (has('muscles')) { to.setup.customMuscles = f.setup.customMuscles; to.setup.removedMuscles = f.setup.removedMuscles; }
  if (has('positions')) { to.setup.customPositions = f.setup.customPositions; to.setup.removedPositions = f.setup.removedPositions; }
  if (has('targets')) to.setup.targets = f.setup.targets;
}
/** Tick what to copy. `from` is fixed (Duplicate), or picked from your studios (a new studio). */
function CopyStudioSheet({ from, into, onCopy, onClose }: { from?: Studio; into?: Studio; onCopy: (from: Studio, parts: CopyPart[]) => void; onClose: () => void }) {
  const d = useData();
  const others = d.studios.filter((x) => x.id !== into?.id);
  const [fromId, setFromId] = useState(from?.id || others[0]?.id || '');
  const [parts, setParts] = useState<CopyPart[]>(COPY_PARTS.map((p) => p.id));
  const src = from || others.find((x) => x.id === fromId);
  return (
    <Sheet title={from ? `Duplicate ${from.name}` : 'Import from a studio'} onClose={onClose} foot={<button type="button" className="btn p grow" disabled={!src || !parts.length} onClick={() => src && onCopy(src, parts)}>{from ? 'Make the copy' : 'Copy these'}</button>}>
      {!from ? <div><div className="lab">From</div><div style={{ marginTop: 6 }}><Chips options={others.map((x) => ({ id: x.id, label: x.name }))} value={fromId} onPick={setFromId} /></div></div> : null}
      <div className="row between"><div className="lab">Tick what to copy</div><button type="button" className="link" onClick={() => setParts(parts.length === COPY_PARTS.length ? [] : COPY_PARTS.map((p) => p.id))}>{parts.length === COPY_PARTS.length ? 'None' : 'All'}</button></div>
      <div className="card flush check-list">
        {COPY_PARTS.map((p) => <label key={p.id}><input type="checkbox" checked={parts.includes(p.id)} onChange={(e) => setParts(e.target.checked ? [...parts, p.id] : parts.filter((x) => x !== p.id))} /><span className="grow"><b>{p.label}</b>{'sub' in p ? <span className="m">{p.sub}</span> : null}</span></label>)}
      </div>
      <p className="tiny">Flows stay with the studio they were made for.</p>
    </Sheet>
  );
}

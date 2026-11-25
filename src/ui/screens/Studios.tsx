// My studios: each place you teach, with its own reformers, springs, props and class set-up.
// Edits are kept unsaved until Save (lib/drafts.ts).
import { BRANDS, EQUIPMENT, LOAD_LEVELS, labelOf, springFor } from '../../engine';
import { closeDraft, draftOf, editDraft, openDraft } from '../../lib/drafts';
import { newStudio, slugify } from '../../lib/clean';
import { studioText, fileNameFor } from '../../lib/files';
import { giveFile } from '../../lib/storage';
import { applySetup, getData, removeStudio, useData } from '../../lib/store';
import type { Studio } from '../../lib/types';
import { Back, Empty, Field, Icon, Info, Row, SaveButton, Screen, Springs, Stepper, Switch, confirmAsk, toast, useEditing } from '../bits';
import { nav } from '../nav';
import { studioLine } from './Builder';
import { saveStudioDraft, studioKey } from './ClassSetup';
import { useState } from 'react';

type L = { id: string; label: string }[];
type BrandT = { label: string; standard: Record<string, number>; springs: Record<string, unknown> };
const allSprings = (s: Studio) => Object.entries(s.springs).flatMap(([l, c]) => Array(Math.min(6, Number(c) || 0)).fill(l) as string[]);
const WORD: Record<string, string> = { xlight: 'extra light', light: 'light', medium: 'medium', heavy: 'heavy', xheavy: 'extra heavy' };
export const propName = (id: string) => labelOf(EQUIPMENT as L, id) as string;

/** Start a new studio (not saved until Save) and open it. */
export function addStudio(): void {
  const s = newStudio();
  openDraft(studioKey(s.id), null, s);
  nav.go({ name: 'studio', id: s.id });
}

export function StudiosScreen() {
  const d = useData();
  return (
    <Screen narrow top={<><Back label="More" /><div className="row between"><h1>My studios</h1><button type="button" className="btn p sm" onClick={addStudio}><Icon name="plus" size={18} />Add a studio</button></div>
      <div className="row wrap" style={{ marginTop: 6 }}><span className="m grow">Where you teach. Each has its own reformer, springs, props and class set-up.</span><Info text="A flow is built for one studio and shows that studio's springs. Your usual studio is where new flows start: change it inside a studio." /></div></>}>
      {!d.studios.length ? <Empty title="No studios yet" text="Add the place you teach. Its reformers, springs, props and class set-up are what everything else follows."><button type="button" className="btn p" onClick={addStudio}>Add a studio</button></Empty> : null}
      {d.studios.map((s) => (
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

/** Props the studio owns, with how many. Used here and in the first-run set-up. */
export function PropsOwned({ s, edit }: { s: Studio; edit: (fn: (x: Studio) => void) => void }) {
  const [name, setName] = useState('');
  applySetup(s.setup);
  const props = [...(EQUIPMENT as L)];
  const add = () => {
    const label = name.trim().slice(0, 40);
    if (!label) return;
    const have = props.find((p) => p.label.toLowerCase() === label.toLowerCase());
    edit((x) => {
      const id = have ? have.id : `p_${slugify(label).replace(/-/g, '_') || 'prop'}`;
      if (!have) x.setup.customProps = [...x.setup.customProps, { id, label }];
      x.props = { ...x.props, [id]: Math.max(1, x.props[id] || 0) };
    });
    setName('');
  };
  return (
    <div className="stack-sm">
      <div className="card flush">
        {props.map((p) => <div className="set" key={p.id}><span className="grow">{p.label}</span><Stepper value={Number(s.props[p.id]) || 0} max={99} label={`How many ${p.label}`} onChange={(n) => edit((x) => { const next = { ...x.props }; if (n > 0) next[p.id] = n; else delete next[p.id]; x.props = next; })} /></div>)}
      </div>
      <div className="row"><input type="text" maxLength={40} placeholder="A prop that isn't listed" aria-label="Name of a prop to add" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /><button type="button" className="btn sm" disabled={!name.trim()} onClick={add}>Add</button></div>
      <p className="tiny" style={{ padding: '0 4px' }}>Set 0 for props you don't have. Drafts leave out movements that need a prop you have none of.</p>
    </div>
  );
}

export function StudioScreen({ id }: { id: string }) {
  const d = useData();
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
      <Field label="Name"><input type="text" maxLength={60} placeholder="Harbour Pilates" value={s.name} onChange={(e) => edit((x) => { x.name = e.target.value; }, true)} /></Field>
      <div className="card flush">
        <Row title="Has reformers" sub="Off for a mat-only space" right={<Switch on={s.hasReformers} onChange={(on) => edit((x) => { x.hasReformers = on; })} label="Has reformers" />} />
        {d.studios.length > (saved ? 1 : 0) ? <Row title="My usual studio" sub="New flows start here" right={<Switch on={!!s.usual} onChange={(on) => edit((x) => { (x as Studio & { usual?: boolean }).usual = on; })} label="My usual studio" />} /> : null}
      </div>
      {s.hasReformers ? <>
        <div className="row"><Field label="Reformer"><select value={s.brand} onChange={(e) => edit((x) => { x.brand = e.target.value; x.springs = { ...(BRANDS as Record<string, BrandT>)[e.target.value].standard }; x.springOverrides = {}; })}>{brands.map(([k, b]) => <option key={k} value={k}>{b.label}</option>)}</select></Field>
          <Field label="How many"><input type="number" inputMode="numeric" min={0} max={99} className="short" value={s.reformers || ''} placeholder="0" onChange={(e) => edit((x) => { x.reformers = Math.max(0, Math.min(99, Math.round(Number(e.target.value)) || 0)); }, true)} /></Field></div>
        <details className="card sec" open={!saved}><summary><b>Springs on each reformer</b></summary><div className="card flush" style={{ marginTop: 10 }}>
          {levels.map((l) => { const sp = springFor(s.brand, l, s.springOverrides) as { name: string; color: string }; return (
            <div className="set" key={l}><span className="dot" style={{ background: sp.color }} /><span className="grow"><b>{sp.name}</b> <span className="m">· {WORD[l]}</span></span><Stepper value={Number(s.springs[l]) || 0} max={8} label={sp.name} onChange={(n) => edit((x) => { const springs = { ...x.springs }; if (n > 0) springs[l] = n; else delete springs[l]; x.springs = springs; })} /></div>
          ); })}
          <Row title="Put the springs back to the usual set" sub={`What a ${brand.label} reformer ships with`} onClick={() => edit((x) => { x.springs = { ...brand.standard }; })} />
        </div><div className="row wrap" style={{ marginTop: 8 }}><span className="m grow">Every spring in the app follows these.</span><Info text="The library, your flows and Play all show this studio's springs. A spring it doesn't have becomes the nearest one it does, marked ≈." /></div></details>
      </> : null}
      <details className="card sec"><summary><b>Props you own</b>{Object.keys(s.props).length ? <span className="m"> · {Object.keys(s.props).length}</span> : null}</summary><div style={{ marginTop: 10 }}><PropsOwned s={s} edit={(fn) => edit(fn)} /></div></details>
      <div className="lab">Class set-up</div>
      <div className="card flush">
        <Row icon="classes" title="Class types" sub={set.classTypes.length ? set.classTypes.map((c) => c.name).join(', ') : 'None yet: add the classes on your timetable'} onClick={() => go('types')} />
        <Row icon="up" title="Class levels" sub={set.levels.map((l) => l.label).join(', ')} onClick={() => go('levels')} />
        <Row icon="spark" title="Focuses" sub={set.focuses.map((f) => f.label).join(', ')} onClick={() => go('focuses')} />
        <Row icon="clock" title="Lengths and timing" sub={set.lengths.length ? `${set.lengths.join(', ')} min` : 'No lengths yet'} onClick={() => go('timing')} />
        <Row icon="library" title="Parts of the class" sub="How the library is grouped" onClick={() => go('parts')} />
        <Row icon="list" title="Muscles and prop names" onClick={() => go('lists')} />
        <Row icon="check" title="What a balanced class means" sub={Object.values(set.targets).map((t) => t.label).join(', ')} onClick={() => go('targets')} />
      </div>
      {saved ? <div className="card flush">
        <Row icon="share" title="Share this studio's set-up" sub="So a co-worker doesn't type it in again" onClick={() => { if (dirty) { toast('Save first, then share.'); return; } nav.go({ name: 'share', studioId: s.id }); }} />
        <Row icon="file" title="Save it as a file" onClick={() => { if (dirty) { toast('Save first, then make the file.'); return; } void giveFile(fileNameFor(s.name, 'studio'), studioText(saved)).catch(() => toast("Couldn't make the file.")); }} />
        <Row icon="trash" danger title="Delete this studio" sub={usedBy ? `${usedBy} class${usedBy === 1 ? ' was' : 'es were'} planned here. They stay, and can be moved to another studio.` : undefined} onClick={async () => { if (await confirmAsk(`Delete ${s.name}?`, 'Its reformers, springs, props and class set-up are removed from this device. Your classes stay.', 'Delete', true)) { closeDraft(key); removeStudio(s.id); nav.backNow(); } }} />
      </div> : <button type="button" className="btn danger" onClick={() => { closeDraft(key); nav.backNow(); }}>Don't add this studio</button>}
      {!getData().studios.length && !saved ? <p className="tiny center">Tap Save when you're done. You can change all of this later in More → My studios.</p> : null}
    </Screen>
  );
}

// Flows → Import → Paste from Notes: a class plan written in a notes app becomes a flow. Shows what
// it found first (parts, movements, springs, props); anything it can't place stays as written.
import { useMemo, useState } from 'react';
import { CLASS_LEVELS } from '../../engine';
import { notesToPlan, readNotes } from '../../lib/notes';
import { startClass } from '../../lib/plan';
import { springKey } from '../../lib/springs';
import { applySetup, library, studioOf, useData, usualStudio } from '../../lib/store';
import { Back, Chips, Empty, Field, Icon, Screen, SpringLine, toast } from '../bits';
import { nav } from '../nav';
import { addStudio } from './Studios';

export function NotesImportScreen() {
  const d = useData();
  const [studioId, setStudioId] = useState(usualStudio().id);
  const studio = studioOf(studioId);
  applySetup(studio.setup);
  const [text, setText] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [length, setLength] = useState(50);
  const found = useMemo(() => (text.trim() ? readNotes(text, studio, library().list) : null), [text, studio]);
  if (!d.studios.length) return <Screen narrow top={<><Back label="Flows" /><h1>Paste from Notes</h1></>}><Empty title="You need a studio first" text="Springs in your notes are read as that studio's springs."><button type="button" className="btn p" onClick={() => addStudio()}>Set up my studio</button></Empty></Screen>;
  const moves = found ? found.parts.reduce((n, p) => n + p.items.length, 0) : 0;
  const make = () => {
    if (!found || !moves) return;
    const plan = notesToPlan(found, studio, { lengthMin: length, level, apparatus: studio.hasReformers ? 'reformer' : 'mat' });
    startClass(plan);
    nav.swap({ name: 'build', id: plan.id, at: 'order' });
    toast(`${moves} movement${moves === 1 ? '' : 's'} brought in. Check the order, then save.`);
  };
  const paste = async () => { try { const t = await navigator.clipboard.readText(); if (t) setText(t); else toast('Nothing to paste: copy your note first.'); } catch { toast('Tap in the box and paste instead.'); } };
  return (
    <Screen narrow top={<><Back label="Flows" /><h1>Paste from Notes</h1><div className="m">Copy a class plan from your notes and paste it here. Check what was found, then make the flow.</div></>}
      foot={<button type="button" className="btn p grow" disabled={!moves} onClick={make}>{moves ? `Make the flow · ${moves} movement${moves === 1 ? '' : 's'}` : 'Make the flow'}</button>}>
      {d.studios.length > 1 ? <div><div className="lab">For which studio?</div><div style={{ marginTop: 8 }}><Chips options={d.studios.map((s) => ({ id: s.id, label: s.name }))} value={studio.id} onPick={setStudioId} /></div><div className="tiny" style={{ marginTop: 6 }}>Spring letters are read as that studio's springs.</div></div> : null}
      <Field label="Your note"><textarea className="notes-box" placeholder={'Stretch:\nR 5-6 each\n- [ ] Lunge out and in with rotation\n    - hold and pulse\nFlow:\nB/R\n- [ ] 4 point kneel…'} value={text} onChange={(e) => setText(e.target.value)} /></Field>
      <div className="row" style={{ gap: 8 }}><button type="button" className="btn sm" onClick={() => void paste()}><Icon name="download" size={16} />Paste</button>{text ? <button type="button" className="btn sm ghost" onClick={() => setText('')}>Clear</button> : null}</div>
      <div className="row"><Field label="Length"><select value={length} onChange={(e) => setLength(Number(e.target.value))}>{[...new Set([...studio.setup.lengths, length])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n} min</option>)}</select></Field>
        <Field label="Level"><select value={level} onChange={(e) => setLevel(e.target.value)}>{(CLASS_LEVELS as { id: string; label: string }[]).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></Field></div>
      {found ? (
        <div className="stack-sm">
          <div className="lab">What was found · {found.parts.length} part{found.parts.length === 1 ? '' : 's'} · {moves} movement{moves === 1 ? '' : 's'}</div>
          <div className="card flush">
            {found.title ? <div className="set"><span className="ok-mark">✓</span><span className="grow"><b>Name:</b> {found.title}</span></div> : null}
            {found.props.length ? <div className="set"><span className="ok-mark">✓</span><span className="grow"><b>Props for the whole flow:</b> {found.props.map((p) => `${p.label} × ${p.count}`).join(', ')}{found.props.some((p) => !p.known) ? <div className="tiny">{found.props.filter((p) => !p.known).map((p) => p.label).join(', ')} isn't in {studio.name}'s props; it's kept with this flow.</div> : null}</span></div> : null}
            {found.parts.map((p, k) => (
              <div className="set" key={k} style={{ alignItems: 'flex-start' }}><span className={p.items.length ? 'ok-mark' : 'ok-mark dim'}>{p.items.length ? '✓' : '–'}</span>
                <span className="grow"><b>{p.name}</b> · {p.items.length ? `${p.items.length} movement${p.items.length === 1 ? '' : 's'}` : 'empty, kept as a part'}
                  {p.items.length ? <div className="move-meta">{[...new Set(p.items.map((i) => JSON.stringify([i.load?.springs || [], i.alt?.springs || []])))].slice(0, 3).map((k2) => { const [a, b] = JSON.parse(k2) as [string[], string[]]; return a.length || b.length ? <SpringLine key={k2} loads={a} alt={b} studio={studio} /> : null; })}
                    {p.items.some((i) => i.layers?.length) ? <span className="m">{((n) => `${n} variation${n === 1 ? '' : 's'}`)(p.items.reduce((n, i) => n + (i.layers?.length || 0), 0))}</span> : null}</div> : null}</span></div>
            ))}
            {found.groups.length ? <div className="set"><span className="ok-mark">✓</span><span className="grow"><b>Blocks:</b> {found.groups.map((g) => g.name).join(', ')}</span></div> : null}
          </div>
          {found.letters.length ? <div className="card info-card"><b>Springs at {studio.name}</b><div className="m">Read as {found.letters.map((l) => `${l.letter} ${l.name}`).join(', ')}{springKey(studio).length > found.letters.length ? ` (the others: ${springKey(studio).filter((k) => !found.letters.some((l) => l.letter === k.short.toUpperCase())).map((k) => `${k.short} ${k.name}`).join(', ')})` : ''}.</div><div className="tiny">Not right? Change the studio's spring names in My studios, or pick another studio above.</div></div> : null}
          {found.unknownSprings.length ? <div className="card warn-card"><b>Springs not understood</b><div className="m">{found.unknownSprings.join(', ')}: these movements keep no springs for now. Set them in the flow editor.</div></div> : null}
          <p className="tiny">{found.linked ? `${found.linked} matched a library movement by name. ` : ''}{found.written} kept in your own words. Link any of them to a library movement later for its picture and muscles.</p>
        </div>
      ) : <p className="tiny">Headings that end in ":" become parts. "- [ ]" lines are movements, indented lines under them are variations, and spring letters (R, B, RB, R/RB) set the springs for the movements below them.</p>}
    </Screen>
  );
}

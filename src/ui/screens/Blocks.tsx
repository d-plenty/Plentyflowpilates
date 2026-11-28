// Saved blocks (Movements → Blocks): sequences of movements to drop into any flow, like a warm-up,
// a cardio burst or a core sequence. Made here from scratch, or from movements in a flow.
import { useState } from 'react';
import { uid } from '../../lib/clean';
import { blockOf, insertBlock, isFavBlock, makeBlock, removeBlock, saveBlock, setFavBlock } from '../../lib/blocks';
import { closeDraft, draftOf, editDraft, markSaved, openDraft } from '../../lib/drafts';
import { blockText, fileNameFor } from '../../lib/files';
import { changeClass, openClass } from '../../lib/plan';
import { parseSprings, springHint, springKey } from '../../lib/springs';
import { giveFile } from '../../lib/storage';
import { applySetup, library, useData, usualStudio } from '../../lib/store';
import { findBlocks } from '../find';
import type { Item, SavedBlock } from '../../lib/types';
import { Back, Chips, Empty, Field, Icon, Row, SaveButton, Screen, Sheet, SpringLine, Star, Thumb, chooseAsk, confirmAsk, toast, useEditing } from '../bits';
import { nav } from '../nav';
import { sectionLabel, sectionsInOrder } from '../sections';
import { MovePicker, WriteSheet, moveName } from './Builder';

/** A new, empty block opened for editing. */
export function newBlock(): void {
  const b = makeBlock('', [], {});
  openDraft<SavedBlock>(`block:${b.id}`, null, { ...b, name: '' });
  nav.go({ name: 'saved-block', id: b.id }, 'library');
}

export function SavedBlockScreen({ id }: { id: string }) {
  const d = useData();
  const key = `block:${id}`;
  const saved = blockOf(id);
  const b = draftOf<SavedBlock>(key) || (saved ? openDraft<SavedBlock>(key, saved) : undefined);
  const [sheet, setSheet] = useState<null | 'add' | 'write' | { item: string }>(null);
  const studio = usualStudio();
  applySetup(studio.setup);
  const save = () => {
    const x = draftOf<SavedBlock>(key);
    if (!x) return true;
    if (!x.name.trim()) { toast('Give the block a name first.'); return false; }
    if (!x.items.length) { toast('Add a movement to the block first.'); return false; }
    saveBlock({ ...x, name: x.name.trim() });
    markSaved(key);
    return true;
  };
  const dirty = useEditing(key, 'this block', save);
  if (!b) return <Screen top={<><Back label="Movements" /><h1>Block not found</h1></>}><Empty title="This block isn't here any more" /></Screen>;
  const lib = library().map;
  const edit = (fn: (x: SavedBlock) => void, typing = false) => editDraft<SavedBlock>(key, fn, typing);
  const move = (i: number, dir: -1 | 1) => edit((x) => { const j = i + dir; if (j < 0 || j >= x.items.length) return; [x.items[i], x.items[j]] = [x.items[j], x.items[i]]; });
  const isSaved = !!saved;
  const useInFlow = async () => {
    if (dirty && !save()) return;
    const flows = d.classes.slice(0, 12);
    const pick = await chooseAsk('Add to which flow?', 'The block goes in as a copy, under its name.', [...flows.map((c) => ({ id: c.id, label: c.title })), { id: '__new', label: 'A new flow' }]);
    if (!pick) return;
    if (pick === '__new') { nav.go({ name: 'new' }, 'classes'); toast('Make the flow, then add the block from + Block in any part.'); return; }
    const plan = d.classes.find((c) => c.id === pick)!;
    const part = plan.segments.length > 1 ? await chooseAsk('Into which part?', plan.title, plan.segments.map((s) => ({ id: s.id, label: s.name }))) : plan.segments[0]?.id;
    if (!part) return;
    openClass(plan.id);
    changeClass(plan.id, (p) => { insertBlock(p, part, blockOf(id) || b); });
    void nav.tab('classes').then(() => nav.go({ name: 'class', id: plan.id }, 'classes'));
    toast(`Added to ${plan.title}. Save the flow to keep it.`);
  };
  const share = async () => { if (dirty && !save()) return; const x = blockOf(id); if (x) await giveFile(fileNameFor(x.name, 'block'), blockText(x)); };
  const remove = async () => {
    if (!isSaved) { closeDraft(key); nav.backNow(); return; }
    if (await confirmAsk('Delete this block?', `"${b.name}" is removed from your blocks. Flows that use it keep their copy.`, 'Delete', true)) { closeDraft(key); removeBlock(id); nav.backNow(); toast('Block deleted.'); }
  };
  return (
    <Screen narrow top={<><div className="row between"><Back label="Movements" /><span className="row" style={{ gap: 6 }}>{isSaved ? <Star on={isFavBlock(id)} label={b.name} onChange={(on) => setFavBlock(id, on)} /> : null}<SaveButton dirty={dirty || !isSaved} onSave={() => { if (save()) toast('Block saved.'); }} /></span></div>
      <h1>{b.name || 'New block'}</h1><div className="m">{b.items.length} movement{b.items.length === 1 ? '' : 's'}{b.sections.length ? ` · ${b.sections.map(sectionLabel).join(', ')}` : ''}{b.from ? ` · from ${b.from}` : ''}</div></>}>
      <Field label="Name"><input type="text" maxLength={80} autoFocus={!isSaved} placeholder="e.g. Core burner" value={b.name} onChange={(e) => edit((x) => { x.name = e.target.value; }, true)} /></Field>
      <div><div className="lab">Good for</div><div style={{ marginTop: 8 }}><Chips options={sectionsInOrder().map((s) => ({ id: s.id, label: s.label }))} value={b.sections} onPick={(sid) => edit((x) => { x.sections = x.sections.includes(sid) ? x.sections.filter((y) => y !== sid) : [...x.sections, sid]; })} /></div>
        <div className="tiny" style={{ marginTop: 6 }}>When you build a flow step by step, a block shows first in the parts it's good for.</div></div>
      <div><div className="lab">Reformer or mat</div><div style={{ marginTop: 8 }}><Chips options={[{ id: 'reformer', label: 'Reformer' }, { id: 'mat', label: 'Mat' }, { id: 'mixed', label: 'Both' }]} value={b.apparatus} onPick={(v) => edit((x) => { x.apparatus = v as SavedBlock['apparatus']; })} /></div></div>
      <div className="lab">Movements, in order</div>
      <div className="card flush">
        {b.items.map((it, i) => { const mv = it.slug ? lib[it.slug] : undefined; return (
          <div className="set" key={it.id}>
            <button type="button" className="pick-plain row grow" style={{ gap: 10 }} onClick={() => setSheet({ item: it.id })}><Thumb mv={mv} written={!!it.text} /><span className="grow"><b>{moveName(it, mv)}</b>
              <div className="move-meta">{b.apparatus !== 'mat' && (it.load?.springs.length || it.alt?.springs.length || mv?.load?.springs?.length) ? <SpringLine loads={it.load?.springs || mv?.load?.springs} alt={it.alt?.springs} studio={studio} /> : null}{it.reps ? <span className="m">{it.reps}</span> : null}</div>
              {(it.layers || []).filter((l) => typeof l !== 'string').map((l, k) => <div key={k} className="var-line m">{(l as { text: string }).text}</div>)}</span></button>
            <button type="button" className="btn icon ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={16} /></button>
            <button type="button" className="btn icon ghost" aria-label="Move down" disabled={i === b.items.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={16} /></button>
            <button type="button" className="btn icon ghost" aria-label={`Take ${moveName(it, mv)} out`} onClick={() => edit((x) => { x.items.splice(i, 1); })}><Icon name="close" size={16} /></button>
          </div>
        ); })}
        {!b.items.length ? <div className="set"><span className="m">No movements yet.</span></div> : null}
      </div>
      <div className="add-row"><button type="button" className="btn" onClick={() => setSheet('add')}><Icon name="plus" size={16} />Movement</button><button type="button" className="btn" onClick={() => setSheet('write')}><Icon name="edit" size={16} />Write one</button></div>
      <Field label="Notes"><textarea maxLength={1000} value={b.notes || ''} onChange={(e) => edit((x) => { if (e.target.value) x.notes = e.target.value; else delete x.notes; }, true)} /></Field>
      <div className="card flush">
        <Row icon="classes" title="Add to a flow" sub="As a copy, in the part you pick" onClick={b.items.length ? () => void useInFlow() : undefined} />
        <Row icon="share" title="Share this block" sub="A file to send to a co-worker" onClick={isSaved ? () => void share() : undefined} />
        <Row icon="trash" danger title={isSaved ? 'Delete this block' : 'Throw this block away'} onClick={() => void remove()} />
      </div>
      {sheet === 'add' ? <Sheet title={`Add to ${b.name || 'the block'}`} onClose={() => setSheet(null)} foot={<button type="button" className="btn p grow" onClick={() => setSheet(null)}>Done</button>}>
        <MovePicker studio={studio} apparatus={b.apparatus} level="advanced" used={new Set(b.items.map((i) => i.slug || ''))} first={b.sections} start="movements"
          onMovement={(m) => { edit((x) => { x.items.push({ id: uid('i'), slug: m.slug }); }); toast(`Added ${m.name}.`); }}
          onBlock={(o) => { edit((x) => { x.items.push(...o.items.map((i) => ({ ...structuredClone(i), id: uid('i') }))); }); toast(`Added ${o.name}'s movements.`); }} />
      </Sheet> : null}
      {sheet === 'write' ? <WriteSheet plan={{ apparatus: b.apparatus } as never} studio={studio} onAdd={(item) => { edit((x) => { x.items.push(item); }); toast(`Added ${item.text}.`); }} onClose={() => setSheet(null)} /> : null}
      {sheet && typeof sheet === 'object' ? <ItemSheet item={b.items.find((i) => i.id === sheet.item)} reformer={b.apparatus !== 'mat'} onChange={(fn) => edit((x) => { const i = x.items.find((y) => y.id === sheet.item); if (i) fn(i); }, true)} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}

/** One movement in a saved block: the words, springs (as letters), reps and variations. */
function ItemSheet({ item, reformer, onChange, onClose }: { item?: Item; reformer: boolean; onChange: (fn: (i: Item) => void) => void; onClose: () => void }) {
  const studio = usualStudio();
  const key = springKey(studio);
  const letters = (l?: string[]) => (l || []).map((x) => key.find((k) => k.level === x)?.short || '').join('');
  const [springs, setSprings] = useState(() => (item?.load?.springs.length ? letters(item.load.springs) + (item.alt?.springs.length ? `/${letters(item.alt.springs)}` : '') : ''));
  if (!item) return null;
  const mv = item.slug ? library().map[item.slug] : undefined;
  const p = parseSprings(springs, studio);
  const vars = (item.layers || []).filter((l) => typeof l !== 'string').map((l) => (l as { text: string }).text).join('\n');
  return (
    <Sheet title={moveName(item, mv)} onClose={onClose} foot={<button type="button" className="btn p grow" onClick={onClose}>Done</button>}>
      <Field label={mv ? 'In your own words (optional)' : 'In your own words'}><textarea maxLength={400} placeholder={mv?.name} value={item.text || ''} onChange={(e) => onChange((i) => { if (e.target.value.trim()) i.text = e.target.value; else if (i.slug) delete i.text; else i.text = e.target.value; })} /></Field>
      {reformer ? <Field label="Springs" hint={springHint(studio)} error={springs.trim() && p.unknown.length ? `Not sure what ${p.unknown.join(', ')} means here.` : undefined}><input type="text" maxLength={30} placeholder={mv?.load?.springs?.length ? `Usual: ${letters(mv.load.springs)}` : 'e.g. R/RB'} value={springs} onChange={(e) => { const v = e.target.value; setSprings(v); const q = parseSprings(v, studio); onChange((i) => { if (q.loads.length) i.load = { springs: q.loads }; else delete i.load; if (q.alt.length) i.alt = { springs: q.alt }; else delete i.alt; }); }} /></Field> : null}
      {reformer && (p.loads.length || p.alt.length) ? <SpringLine loads={p.loads} alt={p.alt} studio={studio} /> : null}
      <Field label="Reps or counts"><input type="text" maxLength={60} placeholder={mv?.reps || 'e.g. 8–10'} value={item.reps || ''} onChange={(e) => onChange((i) => { if (e.target.value) i.reps = e.target.value; else delete i.reps; })} /></Field>
      <Field label="Variations, one per line"><textarea maxLength={600} value={vars} onChange={(e) => onChange((i) => { const keep = (i.layers || []).filter((l) => typeof l === 'string'); const own = e.target.value.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 8).map((t) => ({ text: t.slice(0, 160) })); const all = [...keep, ...own].slice(0, 8); if (all.length) i.layers = all; else delete i.layers; })} /></Field>
      <Field label="Note"><textarea maxLength={500} value={item.note || ''} onChange={(e) => onChange((i) => { if (e.target.value) i.note = e.target.value; else delete i.note; })} /></Field>
    </Sheet>
  );
}

/** The Blocks list (in Movements). */
export function BlocksList({ q }: { q: string }) {
  const d = useData();
  const list = q.trim() ? findBlocks(d.blocks, q).map((h) => h.item) : [...d.blocks].sort((a, b) => Number(d.favBlocks.includes(b.id)) - Number(d.favBlocks.includes(a.id)) || a.name.localeCompare(b.name));
  return (
    <>
      <div className="card flush">
        {list.map((b) => <button type="button" className="set" key={b.id} onClick={() => nav.go({ name: 'saved-block', id: b.id })}><span className="grow"><b>{b.name}</b>{b.from ? <span className="tag" style={{ marginLeft: 6 }}>From {b.from}</span> : null}<div className="m">{b.items.length} movement{b.items.length === 1 ? '' : 's'}{b.sections.length ? ` · ${b.sections.map(sectionLabel).join(', ')}` : ''}</div></span><Star on={d.favBlocks.includes(b.id)} label={b.name} onChange={(on) => setFavBlock(b.id, on)} /></button>)}
        {!list.length ? <div className="set"><span className="m">{d.blocks.length ? 'No blocks match.' : 'No blocks yet. A block is a sequence you use again and again, like a warm-up or a core burner.'}</span></div> : null}
      </div>
      <button type="button" className="btn" onClick={newBlock}><Icon name="plus" size={16} />New block</button>
      <p className="m center">In a flow, tap "Make block" to keep a run of movements as a block.</p>
    </>
  );
}

// Building a class: its phases and blocks, the settings along the top, and the checks.
import { Fragment, useMemo, useRef, useState, type PointerEvent } from 'react';
import { bySection, sectionsInOrder } from '../sections';
import { CLASS_LEVELS, FINISHERS, FOCUSES, MUSCLES, SPINE, fitSprings, OPTION_KINDS, SEGMENT_ROLES, fillPhase, itemDuration, kindOf, labelOf, layersOf, levelRange, classLevel, namesOf, sectionOf, tidySprings, timedLinesOf, variationsOf } from '../../engine';
import { cleanSegments, slugify, uid } from '../../lib/clean';
import { blockCount, propsTally, canRedo, canUndo, changeClass, classDirty, classKey, findItem, levelName, moveItem, nudge, openClass, planOf, redoClass, saveOpenClass, undoClass } from '../../lib/plan';
import { closeDraft, hasDraft, useDrafts } from '../../lib/drafts';
import { analyse, applySetup, changeStudio, classOf, duplicateClass, fittedLibrary, fittedPlan, library, removeClass, saveSeries, studioOf, timingFor, useData } from '../../lib/store';
import type { ClassPlan, Item, Movement, Segment, Studio } from '../../lib/types';
import { Back, Chips, ClockInput, Empty, Field, Icon, Row, SaveButton, Screen, SectionHead, Sheet, Springs, Star, Switch, Thumb, chooseAsk, confirmAsk, fmtClock, toast, useEditing } from '../bits';
import { addDays, clock, nextPlanned, niceDate, planOnDate, plannedFor, studioName, today } from '../../lib/calendar';
import { addStudio } from './Studios';
import { BodyKey, BodyMap } from '../BodyMap';
import { nav, viewState } from '../nav';
import { roleColor } from './Classes';
import { startPlay } from './Play';

type Analysis = ReturnType<typeof analyse> & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const segSeconds = (seg: Segment, tm: Record<string, number>) => seg.items.reduce((t, i) => t + (itemDuration(i, i.slug ? library().map[i.slug] : null, tm) as number), 0) * (seg.bothSides ? 2 : 1);
export const loadsOf = (item: Item, mv?: Movement): string[] | undefined => {
  if (item.load?.springs) return item.load.springs;
  const v = mv && item.variation ? (variationsOf(mv) as { name: string; springs?: string[] }[]).find((x) => x.name === item.variation) : undefined;
  return v?.springs?.length ? v.springs : mv?.load?.springs;
};

/** The class as it is being edited (opened for editing on first look). */
function useClass(id: string): ClassPlan | undefined {
  useData();
  useDrafts();
  return planOf(id) ? (hasDraft(classKey(id)) ? planOf(id) : openClass(id)) : undefined;
}
/** Play and Share work from the saved flow, so unsaved changes are saved first (or the person stays). */
export async function savedFirst(id: string, doing: string): Promise<boolean> {
  if (!classDirty(id)) return true;
  const a = await chooseAsk('Save the flow first?', `It has changes that are not saved. ${doing} uses the saved flow.`, [{ id: 'save', label: `Save and ${doing.toLowerCase()}`, kind: 'p' }]);
  if (a !== 'save') return false;
  saveOpenClass(id);
  return true;
}
export function BuilderScreen({ id }: { id: string }) {
  const plan = useClass(id);
  const d = useData();
  const [sheet, setSheet] = useState<null | { kind: 'more' } | { kind: 'studio' } | { kind: 'props' } | { kind: 'pick'; seg: string } | { kind: 'phase'; seg: string } | { kind: 'line'; seg: string }>(null);
  const dirty = useEditing(classKey(id), 'this flow', () => saveOpenClass(id));
  const [ordering, setOrdering] = useState(false);
  const studio = studioOf(plan?.studioId);
  applySetup(studio.setup);
  const owned = ownedProps(studio);
  const a = useMemo(() => (plan ? (analyse(plan, studio) as Analysis) : null), [plan, studio]);
  if (!plan || !a) return <Screen top={<><Back label="Flows" /><h1>Flow not found</h1></>}><Empty title="This flow is no longer here" /></Screen>;
  const isNew = !d.classes.some((c) => c.id === id);
  const tally = propsTally(plan);
  const short = tally.filter((x) => !(owned[x.id] > 0));
  const tm = timingFor(plan);
  const lib = library().map;
  const change = (fn: (p: ClassPlan) => void, typing = false) => changeClass(id, fn, typing);
  const remove = async () => {
    if (isNew) { if (await confirmAsk('Throw this flow away?', "It hasn't been saved.", 'Throw away', true)) { closeDraft(classKey(id)); nav.backNow(); } return; }
    if (await confirmAsk('Delete this flow?', `"${plan.title}" will be removed from this device. Its entries in your taught log stay.`, 'Delete', true)) { closeDraft(classKey(id)); removeClass(id); nav.backNow(); toast('Class deleted.'); }
  };
  const planOf = new Map<string, { loads: string[]; changed: boolean }>((a.springPlan as { itemId: string; pass: number; loads: string[]; changed: boolean }[]).filter((p) => p.pass === 1).map((p) => [p.itemId, p]));
  const isPhased = !plan.noPhases;
  const warn = (a.checks as { level: string }[]).filter((c) => c.level === 'warn').length;
  const limit = Number(plan.springBudget) > 0 ? Number(plan.springBudget) : 0;
  const lastSeg = plan.segments[plan.segments.length - 1];
  const totalMin = Math.round(a.totalSec / 60);
  const over = Math.abs(totalMin - plan.lengthMin) > 3;

  const suggest = (seg: Segment) => {
    const ct = studio.setup.classTypes.find((c) => c.id === plan.classType);
    const phase = ct?.phases.find((p) => p.name === seg.name);
    const items = cleanSegments([{ id: 'x', name: 'x', items: fillPhase({ movements: fittedLibrary(studio), flow: plan, seg, phase, props: studio.props, timing: tm as never, count: seg.items.length ? 1 : undefined }) }])[0]?.items || [];
    if (!items.length) { toast('Nothing left to suggest for this phase.'); return; }
    change((p) => { const s = p.segments.find((x) => x.id === seg.id); if (s) s.items.push(...items); });
    toast(`Added ${items.map((i) => lib[i.slug!]?.name).join(', ')}.`, { label: 'Undo', run: () => undoClass(id) });
  };

  const blocks = (
    <div className="stack">
      {plan.segments.map((seg) => {
        const sec = segSeconds(seg, tm);
        const target = (seg.minutes || 0) * 60;
        const off = target > 0 && Math.abs(sec - target) > 60;
        return (
          <div className="stack-sm" key={seg.id}>
            {isPhased ? (
              <div className="phase-head">
                <span className="dot" style={{ background: roleColor(seg.role), boxShadow: 'none' }} />
                <button type="button" className="name" onClick={() => setSheet({ kind: 'phase', seg: seg.id })}>{seg.name}</button>
                <span className={off ? 'm warn-text' : 'm'} style={off ? { fontWeight: 600 } : undefined}>{fmtClock(sec)}{target ? ` of ${seg.minutes} min` : ''}</span>
                <button type="button" className="btn icon ghost" aria-label={`Edit phase ${seg.name}`} onClick={() => setSheet({ kind: 'phase', seg: seg.id })}><Icon name="edit" size={16} /></button>
              </div>
            ) : <div className="phase-head"><span className="name" style={{ padding: '6px 0' }}>Blocks, in order</span><span className="m">{fmtClock(sec)}</span></div>}
            {seg.items.map((item) => {
              if (item.pause) return (
                <button type="button" key={item.id} className="block line" onClick={() => nav.go({ name: 'block', id, item: item.id })}>
                  <div className="row"><Thumb /><div className="grow"><b>{item.label}</b><div className="m">{item.note || 'Timed line'}</div></div><span className="m">{fmtClock(item.duration || 60)}</span></div>
                </button>
              );
              const mv = lib[item.slug!];
              const p = planOf.get(item.id);
              const layers = layersOf(mv, item) as { title: string }[];
              const missing = mv ? [...new Set([...(mv.equipment || []), ...(item.props || [])])].filter((e) => !(owned[e] > 0)) : [];
              const added = (item.props || []).map((e) => (plan.extraProps || []).find((x) => x.id === e)?.label || propLabel(studio.setup, e));
              return (
                <div className="stack-sm" key={item.id}>
                  {p?.changed && plan.apparatus !== 'mat' ? <div className="change">CHANGE SPRINGS <Springs loads={p.loads} studio={studio} /></div> : null}
                  <button type="button" className="block" onClick={() => nav.go({ name: 'block', id, item: item.id })}>
                    <div className="row">
                      <Thumb mv={mv} />
                      <div className="grow"><b>{mv ? mv.name : item.slug}</b>{item.variation ? <span className="m"> · {item.variation}</span> : null}
                        <div className="m">{mv ? [labelOf(POSITIONS_SAFE, mv.position), item.reps || mv.reps].filter(Boolean).join(' · ') : 'Not in your library any more'}</div></div>
                      <div style={{ textAlign: 'right', flex: 'none' }}>{mv?.apparatus === 'reformer' ? <Springs loads={p?.loads || loadsOf(item, mv)} studio={studio} label={false} /> : null}<div className="m">{fmtClock(itemDuration(item, mv, tm) as number)}</div></div>
                    </div>
                    {layers.length || item.finisher || item.note || missing.length || added.length ? (
                      <div className="extra">
                        {layers.map((l, i) => <div key={i}>{i + 1} · {l.title}</div>)}
                        {item.finisher ? <div className="m">Finish: {item.finisher}</div> : null}
                        {item.note ? <div className="m" style={{ fontStyle: 'italic' }}>{item.note}</div> : null}
                        {added.length ? <div className="m">With {added.join(', ').toLowerCase()}</div> : null}
                        {missing.length && studio.id ? <div className="warn-text" style={{ fontWeight: 600 }}>{studio.name} has no {[...new Set(missing.map((e) => ((plan.extraProps || []).find((x) => x.id === e)?.label || ownedLabel(studio.setup, e)).toLowerCase()))].join(' or ')}</div> : null}
                      </div>
                    ) : null}
                  </button>
                </div>
              );
            })}
            {seg.bothSides ? <div className="m center">↻ Then the same again on the other side</div> : null}
            <div className="add-row">
              <button type="button" className="btn" onClick={() => setSheet({ kind: 'pick', seg: seg.id })}><Icon name="plus" size={16} />Add a block</button>
              <button type="button" className="btn" onClick={() => suggest(seg)}><Icon name="spark" size={16} />Suggest</button>
              <button type="button" className="btn" onClick={() => setSheet({ kind: 'line', seg: seg.id })}><Icon name="clock" size={16} />Timed line</button>
            </div>
          </div>
        );
      })}
      {isPhased ? <button type="button" className="card dash" onClick={() => change((p) => { p.segments.push({ id: uid('s'), name: 'New phase', role: 'build', minutes: 5, items: [] }); })}>+ Add a phase</button> : null}
    </div>
  );

  const share = async () => { if (await savedFirst(id, 'Share')) nav.go({ name: 'share', classId: id }); };
  const play = async () => { if (await savedFirst(id, 'Play')) startPlay(classOf(id) || plan); };
  return (
    <div className="screen editor">
      <div className="top slim">
        <div className="ed-bar">
          <Back label="Flows" />
          <span className="grow" />
          <button type="button" className="btn icon ghost" aria-label="Undo" disabled={!canUndo(id)} onClick={() => undoClass(id)}><Icon name="undo" size={18} /></button>
          <button type="button" className="btn icon ghost" aria-label="Redo" disabled={!canRedo(id)} onClick={() => redoClass(id)}><Icon name="redo" size={18} /></button>
          <button type="button" className="btn icon ghost" aria-label="Share this flow" onClick={() => void share()}><Icon name="share" size={18} /></button>
          <button type="button" className="btn icon ghost" aria-label="Play this flow" onClick={() => void play()}><Icon name="play" size={18} fill /></button>
          <SaveButton dirty={dirty} onSave={() => { saveOpenClass(id); toast('Flow saved.'); }} />
        </div>
      </div>
      <div className="body">
        <div className="stack ed-head">
          <div className="row"><input className="title grow" type="text" aria-label="Flow name" value={plan.title} maxLength={120} onChange={(e) => change((p) => { p.title = e.target.value; }, true)} /><Star on={!!plan.fav} label={plan.title} onChange={(on) => change((p) => { if (on) p.fav = true; else delete p.fav; })} /></div>
          <button type="button" className="built-for" onClick={() => setSheet({ kind: 'studio' })}><span className="m">Built for</span> <b>{studio.id ? studio.name : 'no studio yet'}</b><span className="link">Change</span></button>
          <div className="chips scroll">
            <button type="button" className="chip" onClick={() => setSheet({ kind: 'more' })}>{plan.lengthMin} min</button>
            <button type="button" className="chip" onClick={() => setSheet({ kind: 'more' })}>{levelName(plan.level)}</button>
            {nextPlanned(plan.id) ? <button type="button" className="chip" onClick={() => setSheet({ kind: 'more' })}>{niceDate(nextPlanned(plan.id)!.shift.date)}, {clock(nextPlanned(plan.id)!.slot.start)}</button> : null}
            <button type="button" className="chip" onClick={() => setSheet({ kind: 'more' })}>More</button>
          </div>
          <div className="stats">
            <button type="button" className={`stat${over ? ' bad' : ''}`} onClick={() => nav.go({ name: 'analysis', id })}><b>{totalMin} min</b><span>Total</span></button>
            <button type="button" className="stat" onClick={() => nav.go({ name: 'analysis', id })}><b>{blockCount(plan)}</b><span>Blocks</span></button>
            <button type="button" className={`stat${limit && a.springChanges > limit ? ' bad' : ''}`} onClick={() => nav.go({ name: 'analysis', id })}><b>{plan.apparatus === 'mat' ? '–' : limit ? `${a.springChanges} / ${limit}` : a.springChanges}</b><span>Spring changes</span></button>
            <button type="button" className={`stat${warn ? ' bad' : ''}`} onClick={() => nav.go({ name: 'analysis', id })}><b>{warn}</b><span>To check</span></button>
          </div>
          <button type="button" className={`props-bar${short.length && studio.id ? ' bad' : ''}`} onClick={() => setSheet({ kind: 'props' })} aria-label="Props this flow uses">
            <span className="lab" style={{ padding: 0 }}>Props</span>
            {tally.length ? tally.slice(0, 6).map((x) => <span className={`tag${!(owned[x.id] > 0) && studio.id ? ' warn' : ''}`} key={x.id}>{x.label} ×{x.blocks}</span>) : <span className="m">None yet</span>}
            {tally.length > 6 ? <span className="tag">+{tally.length - 6}</span> : null}
          </button>
        </div>
        <div className="row between" style={{ marginTop: 14 }}><span className="lab" style={{ padding: 0 }}>{blockCount(plan)} blocks</span>
          {blockCount(plan) > 1 || ordering ? <button type="button" className={`btn sm${ordering ? ' p' : ''}`} aria-pressed={ordering} onClick={() => setOrdering(!ordering)}><Icon name={ordering ? 'check' : 'order'} size={16} />{ordering ? 'Done' : 'Reorder'}</button> : null}</div>
        <div className="two" style={{ marginTop: 10 }}>
          {ordering ? <ReorderBlocks plan={plan} change={change} /> : blocks}
          <div className="stack wide-only"><ChecksCard a={a} /><SpringsCard a={a} studio={studio} plan={plan} /><MusclesCard a={a} /></div>
        </div>
        <div style={{ height: 84 }} aria-hidden="true" />
        <button type="button" className="btn danger ghost wide" style={{ marginBottom: 90 }} onClick={() => void remove()}><Icon name="trash" size={16} />{isNew ? 'Throw this flow away' : 'Delete this flow'}</button>
      </div>
      {!ordering ? <button type="button" className="fab" onClick={() => setSheet({ kind: 'pick', seg: lastSeg.id })}><Icon name="plus" size={20} />Add a block</button> : null}

      {sheet?.kind === 'studio' ? (
        <Sheet title="Which studio is this flow for?" onClose={() => setSheet(null)}>
          <p className="m">The flow moves there: springs show as that studio's reformers and props are checked against what it owns. The blocks stay as they are.</p>
          {d.studios.map((s) => { const theirs = ownedProps(s); const miss = propsTally(plan).filter((x) => !(theirs[x.id] > 0)); return <button type="button" key={s.id} className={`card pick${s.id === studio.id ? ' on' : ''}`} onClick={() => { change((p) => { p.studioId = s.id; if (!s.hasReformers && p.apparatus !== 'mat') p.apparatus = 'mat'; }); setSheet(null); toast(`Now built for ${s.name}. Save to keep it.`); }}><b>{s.name}</b><div className="m">{studioLine(s)}</div>{miss.length ? <div className="warn-text tiny">Has no {[...new Set(miss.map((x) => ownedLabel(s.setup, x.id).toLowerCase()))].join(', ')}</div> : null}</button>; })}
          {!d.studios.length ? <p className="m">You have no studios yet.</p> : null}
          <button type="button" className="btn" onClick={() => { setSheet(null); addStudio(); }}>Add a studio</button>
        </Sheet>
      ) : null}
      {sheet?.kind === 'props' ? <PropsSheet plan={plan} studio={studio} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'more' ? <MoreSheet plan={plan} change={change} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'pick' ? <PickSheet plan={plan} segId={sheet.seg} studio={studio} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'phase' ? <PhaseSheet plan={plan} segId={sheet.seg} change={change} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'line' ? <LineSheet planId={id} segId={sheet.seg} change={change} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}

// The engine's lists are replaced in place when the class set-up changes, so read them when drawing.
import { POSITIONS } from '../../engine';
import { addProp, ownedLabel, ownedProps, pickableProps, propLabel, resolveProp } from '../../lib/props';
const POSITIONS_SAFE = POSITIONS as { id: string; label: string }[];
export const studioLine = (s: Studio) => (s.hasReformers ? `${labelOf(BRAND_LIST(), s.brand)} · ${s.reformers} reformer${s.reformers === 1 ? '' : 's'}` : 'Mat space');
import { BRANDS } from '../../engine';
const BRAND_LIST = () => Object.entries(BRANDS as Record<string, { label: string }>).map(([id, b]) => ({ id, label: b.label }));

function MoreSheet({ plan, change, onClose }: { plan: ClassPlan; change: (fn: (p: ClassPlan) => void, typing?: boolean) => void; onClose: () => void }) {
  useData();
  const st = studioOf(plan.studioId);
  const d = { setup: st.setup };
  const lengths = [...new Set([...d.setup.lengths, plan.lengthMin])].sort((x, y) => x - y);
  const isNew = !classOf(plan.id);
  const levels = (CLASS_LEVELS as { id: string; label: string }[]).some((l) => l.id === plan.level) ? (CLASS_LEVELS as { id: string; label: string }[]) : [...(CLASS_LEVELS as { id: string; label: string }[]), classLevel(plan.level) as { id: string; label: string }];
  const focuses = FOCUSES as { id: string; label: string }[];
  const limit = Number(plan.springBudget) > 0 ? Number(plan.springBudget) : 0;
  const togglePhases = async (on: boolean) => {
    if (on) { change((p) => { delete p.noPhases; if (p.segments.length === 1 && p.segments[0].name === 'Class') p.segments[0].name = 'Main'; }); return; }
    if (plan.segments.length > 1 && !(await confirmAsk('Plan this flow without phases?', `Its ${plan.segments.length} phases become one list of blocks, in the same order. Phase names and minutes are dropped. Undo brings them back.`, 'Use one list'))) return;
    change((p) => {
      const items = p.segments.flatMap((s) => (s.bothSides ? [...s.items, ...s.items.map((i) => ({ ...structuredClone(i), id: uid('i') }))] : s.items));
      p.segments = [{ id: p.segments[0]?.id || uid('s'), name: 'Class', role: 'build', items }];
      p.noPhases = true;
    });
  };
  return (
    <Sheet title="Class settings" onClose={onClose}>
      <Field label="Class type"><select value={plan.classType || ''} onChange={(e) => change((p) => {
        const c = d.setup.classTypes.find((x) => x.id === e.target.value);
        if (!c) { delete p.classType; return; }
        // the class type brings what was set for it; the blocks and phases already planned stay
        p.classType = c.id; p.apparatus = c.apparatus; p.springBudget = c.apparatus === 'mat' ? 0 : c.springBudget || 0;
        if (c.target && d.setup.targets[c.target]) p.target = c.target;
      })}>{d.setup.classTypes.some((c) => c.id === plan.classType) ? null : <option value="">No class type</option>}{d.setup.classTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <div className="row"><Field label="Length"><select value={plan.lengthMin} onChange={(e) => change((p) => { p.lengthMin = Number(e.target.value); })}>{lengths.map((n) => <option key={n} value={n}>{n} min</option>)}</select></Field>
        <Field label="Level"><select value={plan.level} onChange={(e) => change((p) => { p.level = e.target.value; })}>{levels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></Field></div>
      <Field label="Focus"><select value={plan.focusText ? '__own' : focuses.some((f) => f.id === plan.goal) ? plan.goal : ''} onChange={(e) => change((p) => { if (e.target.value === '__own') p.focusText = p.focusText || 'Our own focus'; else { p.goal = e.target.value; delete p.focusText; } })}><option value="">None</option>{focuses.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}<option value="__own">Our own…</option></select></Field>
      {plan.focusText !== undefined ? <Field label="Your own focus"><input type="text" maxLength={60} value={plan.focusText} onChange={(e) => change((p) => { p.focusText = e.target.value; }, true)} /></Field> : null}
      <OnCalendar plan={plan} />
      <div className="row"><Field label="Apparatus"><select value={plan.apparatus} onChange={(e) => change((p) => { p.apparatus = e.target.value as ClassPlan['apparatus']; })}><option value="reformer">Reformer</option><option value="mat">Mat</option><option value="mixed">Mixed</option></select></Field>
        <Field label="Balance target"><select value={plan.target || 'general'} onChange={(e) => change((p) => { p.target = e.target.value; })}>{Object.entries(d.setup.targets).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</select></Field></div>
      {plan.apparatus !== 'mat' ? <Field label="Spring changes, at most"><select value={limit} onChange={(e) => change((p) => { p.springBudget = Number(e.target.value); })}>{[...new Set([0, 1, 2, 3, 4, 5, 6, 8, 10, limit])].sort((x, y) => x - y).map((n) => <option key={n} value={n}>{n ? `Up to ${n}` : 'No limit'}</option>)}</select></Field> : null}
      <div className="card flush">
        <Row title="Planned in phases" sub="Optional, but recommended: phases help plan the class the way clients expect it." right={<Switch on={!plan.noPhases} onChange={(on) => void togglePhases(on)} label="Planned in phases" />} />
        {plan.apparatus !== 'mat' ? <Row icon="spark" title="Tidy springs" sub="Reorders blocks inside each phase so shared settings sit together" onClick={() => { change((p) => { p.segments = cleanSegments(tidySprings(fittedPlan(p, st), fittedLibrary(st))); }); toast('Springs tidied.', { label: 'Undo', run: () => undoClass(plan.id) }); onClose(); }} /> : null}
        <Row icon="list" title="Run sheet" sub="The whole flow on one page" onClick={() => { onClose(); nav.go({ name: 'sheet', id: plan.id }); }} />
        <Row icon="share" title="Share this flow" sub="QR code over Wi-Fi, or a file" onClick={async () => { if (!(await savedFirst(plan.id, 'Share'))) return; onClose(); nav.go({ name: 'share', classId: plan.id }); }} />
        <Row icon="copy" title="Duplicate" sub={isNew ? 'Save the flow first' : undefined} onClick={isNew ? undefined : async () => { if (!(await savedFirst(plan.id, 'Duplicate'))) return; const c = duplicateClass(plan.id); onClose(); if (c) { closeDraft(classKey(plan.id)); nav.swap({ name: 'class', id: c.id }); toast('Duplicated. This is the copy.'); } }} />
        <Row icon="trash" danger title={isNew ? 'Throw this flow away' : 'Delete this flow'} onClick={async () => { if (isNew) { if (await confirmAsk('Throw this flow away?', "It hasn't been saved.", 'Throw away', true)) { onClose(); closeDraft(classKey(plan.id)); nav.backNow(); } return; } if (await confirmAsk('Delete this flow?', `"${plan.title}" will be removed from this device. Its entries in your taught log stay.`, 'Delete', true)) { onClose(); closeDraft(classKey(plan.id)); removeClass(plan.id); nav.backNow(); } }} />
      </div>
      <Field label="Notes for yourself"><textarea value={plan.notes || ''} maxLength={2000} onChange={(e) => change((p) => { if (e.target.value) p.notes = e.target.value; else delete p.notes; }, true)} /></Field>
    </Sheet>
  );
}

function PhaseSheet({ plan, segId, change, onClose }: { plan: ClassPlan; segId: string; change: (fn: (p: ClassPlan) => void, typing?: boolean) => void; onClose: () => void }) {
  const seg = plan.segments.find((s) => s.id === segId);
  if (!seg) return null;
  const si = plan.segments.indexOf(seg);
  const edit = (fn: (s: Segment) => void, typing = false) => change((p) => { const s = p.segments.find((x) => x.id === segId); if (s) fn(s); }, typing);
  const move = (dir: -1 | 1) => change((p) => { const i = p.segments.findIndex((x) => x.id === segId); const j = i + dir; if (j < 0 || j >= p.segments.length) return; const [s] = p.segments.splice(i, 1); p.segments.splice(j, 0, s); });
  const blocks = seg.items.filter((i) => !i.pause);
  return (
    <Sheet title="Phase" onClose={onClose}>
      <Field label="Name"><input type="text" maxLength={80} value={seg.name} onChange={(e) => edit((s) => { s.name = e.target.value; }, true)} /></Field>
      <div className="row"><Field label="Kind"><select value={seg.role} onChange={(e) => edit((s) => { s.role = e.target.value; })}>{(SEGMENT_ROLES as { id: string; label: string }[]).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></Field>
        <Field label="Minutes"><input type="number" inputMode="numeric" min={1} max={120} value={seg.minutes || ''} placeholder="Any" onChange={(e) => edit((s) => { const n = Math.round(Number(e.target.value)); if (n > 0) s.minutes = Math.min(120, n); else delete s.minutes; }, true)} /></Field></div>
      <div className="card flush">
        <Row title="Teach one side, then repeat on the other" sub="Counts the phase twice" right={<Switch on={!!seg.bothSides} onChange={(on) => edit((s) => { if (on) s.bothSides = true; else delete s.bothSides; })} label="Repeat on the other side" />} />
        <Row icon="up" title="Move earlier" onClick={si > 0 ? () => move(-1) : undefined} right={si > 0 ? undefined : <span className="tiny">First</span>} />
        <Row icon="down" title="Move later" onClick={si < plan.segments.length - 1 ? () => move(1) : undefined} right={si < plan.segments.length - 1 ? undefined : <span className="tiny">Last</span>} />
        {blocks.length > 1 ? <Row icon="copy" title="Save as a series" sub={`These ${blocks.length} movements, in this order, to reuse`} onClick={() => { saveSeries({ slug: `mine-${uid()}`, name: seg.name, apparatus: plan.apparatus === 'mat' ? 'mat' : 'reformer', summary: `From "${plan.title}".`, items: blocks.map((i) => ({ slug: i.slug!, ...(i.variation ? { variation: i.variation } : {}), ...(i.duration ? { duration: i.duration } : {}), ...(i.reps ? { reps: i.reps } : {}) })) }); toast(`Saved "${seg.name}" as a series. It's in Library → Series.`); onClose(); }} /> : null}
        <Row icon="trash" danger title="Delete this phase" sub={seg.items.length ? `And its ${seg.items.length} block${seg.items.length === 1 ? '' : 's'}` : undefined} onClick={plan.segments.length > 1 ? () => { change((p) => { p.segments = p.segments.filter((s) => s.id !== segId); }); onClose(); toast('Phase deleted.', { label: 'Undo', run: () => undoClass(plan.id) }); } : undefined} right={plan.segments.length > 1 ? undefined : <span className="tiny">Only phase</span>} />
      </div>
    </Sheet>
  );
}

function LineSheet({ planId, segId, change, onClose }: { planId: string; segId: string; change: (fn: (p: ClassPlan) => void) => void; onClose: () => void }) {
  const mine = timedLinesOf(studioOf(planOf(planId)?.studioId).setup) as { id: string; label: string; note?: string; seconds: number }[];
  const [name, setName] = useState('');
  const [secs, setSecs] = useState(60);
  const put = (label: string, seconds: number, note?: string) => { change((p) => { const s = p.segments.find((x) => x.id === segId); if (s) s.items.push({ id: uid('i'), pause: true, label, duration: Math.min(3600, Math.max(5, seconds)), ...(note ? { note } : {}) }); }); onClose(); toast(`Added ${label}.`); };
  return (
    <Sheet title="Add a timed line" onClose={onClose} foot={<button type="button" className="btn p grow" disabled={!name.trim()} onClick={() => put(name.trim().slice(0, 60), secs)}>Add</button>}>
      <p className="m">Time in the plan that is not a movement. It adds to the class total and shows on the run sheet and in Play.</p>
      {mine.length ? <div className="card flush">{mine.map((r) => <Row key={r.id} icon="clock" title={r.label} sub={r.note} right={<span className="m">{fmtClock(r.seconds || 60)}</span>} onClick={() => put(r.label, Number(r.seconds) || 60, r.note)} />)}</div> : null}
      <div className="lab">{mine.length ? 'Or your own' : 'What is it?'}</div>
      <div className="row"><input type="text" maxLength={60} placeholder="e.g. Water break" aria-label="Name of the timed line" value={name} onChange={(e) => setName(e.target.value)} /><ClockInput seconds={secs} onChange={setSecs} label="Time, minutes:seconds" min={5} max={3600} /></div>
      {!mine.length ? <p className="tiny">Keep your usual ones in the studio's Class set-up → Lengths and timing, so they are one tap away here.</p> : null}
    </Sheet>
  );
}

function PickSheet({ plan, segId, studio, onClose }: { plan: ClassPlan; segId: string; studio: Studio; onClose: () => void }) {
  const owned = ownedProps(studio);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'movements' | 'series'>('movements');
  const f = viewState('pick-filters', { section: '', position: '', spine: '', muscle: '', open: false });
  const [section, setSectionState] = useState(f.section);
  const [position, setPosition] = useState(f.position);
  const [spine, setSpine] = useState(f.spine);
  const [muscle, setMuscle] = useState(f.muscle);
  const [open, setOpen] = useState(f.open);
  const setSection = (v: string) => { f.section = v; setSectionState(v); };
  const filters = [position, spine, muscle].filter(Boolean).length;
  const [onlyKit, setOnlyKit] = useState(true);
  const [added, setAdded] = useState(0);
  const lib = library();
  const seg = plan.segments.find((s) => s.id === segId);
  const used = new Set(plan.segments.flatMap((s) => s.items.map((i) => i.slug)));
  const lv = classLevel(plan.level) as { to: number };
  const ct = studio.setup.classTypes.find((c) => c.id === plan.classType);
  const phase = ct?.phases.find((p) => p.name === seg?.name);
  const app = plan.apparatus === 'mixed' ? null : plan.apparatus;
  const text = q.trim().toLowerCase();
  const list = lib.list.filter((m) => (!app || m.apparatus === app)
    && (!text || (namesOf(m) as string[]).some((n) => n.toLowerCase().includes(text)) || [...(m.muscles?.primary || [])].some((x) => labelOf(MUSCLES, x).toLowerCase().includes(text)))
    && (!section || sectionOf(m) === section)
    && (!position || m.position === position)
    && (!spine || (m.spine || []).includes(spine))
    && (!muscle || [...(m.muscles?.primary || []), ...(m.muscles?.secondary || [])].includes(muscle))
    && (!onlyKit || (m.equipment || []).every((e) => owned[e] > 0))
    && (text ? true : (levelRange(m) as number[])[0] <= lv.to))
;
  const add = (items: Item[], label: string) => { changeClass(plan.id, (p) => { const s = p.segments.find((x) => x.id === segId); if (s) s.items.push(...items); }); setAdded((n) => n + items.length); toast(`Added ${label}.`); };
  const series = lib.series.filter((s) => (!app || s.apparatus === app) && (!text || s.name.toLowerCase().includes(text)));
  return (
    <Sheet title={plan.noPhases || !seg ? 'Add a block' : `Add to ${seg.name}`} onClose={onClose} foot={<button type="button" className="btn p grow" onClick={onClose}>{added ? `Done · ${added} added` : 'Done'}</button>}>
      <input type="search" placeholder="Search any name or muscle" aria-label="Search movements" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row between"><div className="seg"><button type="button" className={tab === 'movements' ? 'on' : ''} onClick={() => setTab('movements')}>Movements</button><button type="button" className={tab === 'series' ? 'on' : ''} onClick={() => setTab('series')}>Series</button></div>
        {tab === 'movements' && studio.id ? <label className="row tiny" style={{ gap: 6 }}>Only our kit<Switch on={onlyKit} onChange={setOnlyKit} label="Only what this studio has the kit for" /></label> : null}</div>
      {tab === 'movements' ? <>
        <Chips scroll options={[{ id: '', label: 'All sections' }, ...sectionsInOrder().map((s) => ({ id: s.id, label: s.label }))]} value={section} onPick={setSection} />
        <button type="button" className="row between filters-toggle" aria-expanded={open} onClick={() => { f.open = !open; setOpen(!open); }}><span><b>Filters</b>{filters ? <span className="tag acc" style={{ marginLeft: 8 }}>{filters} on</span> : null}</span><Icon name={open ? 'up' : 'down'} size={18} /></button>
        {open ? <div className="stack-sm">
          <div className="row"><Field label="Position"><select value={position} onChange={(e) => { f.position = e.target.value; setPosition(e.target.value); }}><option value="">Any</option>{POSITIONS_SAFE.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
            <Field label="Spine"><select value={spine} onChange={(e) => { f.spine = e.target.value; setSpine(e.target.value); }}><option value="">Any</option>{(SPINE as { id: string; label: string }[]).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field></div>
          <Field label="Muscle"><select value={muscle} onChange={(e) => { f.muscle = e.target.value; setMuscle(e.target.value); }}><option value="">Any</option>{(MUSCLES as { id: string; label: string }[]).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
          {filters ? <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => { f.position = ''; f.spine = ''; f.muscle = ''; setPosition(''); setSpine(''); setMuscle(''); }}>Clear filters</button> : null}
        </div> : null}
        <div className="tiny">{list.length} movement{list.length === 1 ? '' : 's'}{!text ? ` at ${levelName(plan.level)} or below` : ''}{phase && !text && !section && (phase.sections || []).length ? `, ${seg?.name}'s sections first` : ''}, A to Z in each section</div>
        <div className="card flush">
          {bySection(list, phase && !text && !section ? phase.sections || [] : []).map((g) => <Fragment key={g.id}>
            <SectionHead id={g.id} label={g.label} colour={g.colour} count={g.items.length} />
            {g.items.map((m) => (
              <div className="set" key={m.slug}>
                <Thumb mv={m} />
                <span className="grow"><b>{m.name}</b>{used.has(m.slug) ? <span className="tag" style={{ marginLeft: 6 }}>In flow</span> : null}<div className="m">{[labelOf(POSITIONS_SAFE, m.position), (m.muscles?.primary || []).slice(0, 2).map((x) => labelOf(MUSCLES, x)).join(', ')].filter(Boolean).join(' · ')}</div></span>
                {m.apparatus === 'reformer' ? <Springs loads={m.load?.springs} studio={studio} label={false} /> : null}
                <button type="button" className="btn icon p" aria-label={`Add ${m.name}`} onClick={() => add([{ id: uid('i'), slug: m.slug }], m.name)}><Icon name="plus" size={18} /></button>
              </div>
            ))}
          </Fragment>)}
          {!list.length ? <div className="set"><span className="m">Nothing matches. Try another section, or switch off "Only our kit".</span></div> : null}
        </div>
      </> : (
        <div className="card flush">
          {series.map((s) => <div className="set" key={s.slug}><span className="grow"><b>{s.name}</b><div className="m">{s.items.length} movements{s.summary ? ` · ${s.summary}` : ''}</div></span><button type="button" className="btn icon p" aria-label={`Add the ${s.name}`} onClick={() => add(s.items.filter((i) => lib.map[i.slug]).map((i) => ({ id: uid('i'), ...i })), s.name)}><Icon name="plus" size={18} /></button></div>)}
          {!series.length ? <div className="set"><span className="m">No series match.</span></div> : null}
        </div>
      )}
    </Sheet>
  );
}

function PropsSheet({ plan, studio, onClose }: { plan: ClassPlan; studio: Studio; onClose: () => void }) {
  useData();
  const tally = propsTally(plan);
  const owned = ownedProps(studio);
  return (
    <Sheet title="Props in this flow" onClose={onClose} foot={<button type="button" className="btn p grow" onClick={onClose}>Done</button>}>
      <p className="m">What the movements need, plus what you added to blocks. Add a prop to a block by tapping the block.</p>
      {!tally.length ? <Empty title="No props yet" text="Movements that need a prop add it here by themselves." /> : (
        <div className="card flush">{tally.map((x) => { const own = owned[x.id] || 0; return (
          <div className="set" key={x.id}><span className="grow"><b>{x.label}</b><div className="m">In {x.blocks} block{x.blocks === 1 ? '' : 's'}{studio.id ? (own ? ` · ${studio.name} has ${own}` : ` · ${studio.name} has none`) : ''}</div></span>
            {studio.id && !own ? <button type="button" className="btn sm" onClick={() => { const custom = (plan.extraProps || []).find((e) => e.id === x.id); changeStudio(studio.id, (s) => { if (custom && !s.setup.customProps.some((c) => c.id === x.id)) addProp(s, { label: custom.label }); else { const to = resolveProp(s.setup, x.id); s.setup.removedProps = s.setup.removedProps.filter((r) => r !== to); s.props = { ...s.props, [to]: 1 }; } }); toast(`${studio.name} now has ${x.label.toLowerCase()}. Change how many in My studios.`); }}>We have it</button> : null}</div>
        ); })}</div>
      )}
    </Sheet>
  );
}

// ---- one block
export function BlockScreen({ id, itemId }: { id: string; itemId: string }) {
  const plan = useClass(id);
  const at = plan ? findItem(plan, itemId) : undefined;
  const [layerText, setLayerText] = useState('');
  const [offer, setOffer] = useState('');
  const [offerKindState, setOfferKindState] = useState<'regression' | 'progression'>('regression');
  const [propText, setPropText] = useState('');
  const studio = studioOf(plan?.studioId);
  applySetup(studio.setup);
  const a = useMemo(() => (plan ? (analyse(plan, studio) as Analysis) : null), [plan, studio]);
  if (!plan || !at) return <Screen top={<><Back /><h1>Block not found</h1></>}><Empty title="This block is no longer in the flow" /></Screen>;
  const { item, seg } = at;
  const mv = item.slug ? library().map[item.slug] : undefined;
  const tm = timingFor(plan);
  const edit = (fn: (i: Item) => void, typing = false) => changeClass(id, (p) => { const x = findItem(p, itemId); if (x) fn(x.item); }, typing);
  const move = (dir: -1 | 1) => changeClass(id, (p) => nudge(p, itemId, dir));
  const remove = () => { changeClass(id, (p) => { const x = findItem(p, itemId); if (x) x.seg.items.splice(x.index, 1); }); nav.back(); toast('Removed.', { label: 'Undo', run: () => undoClass(id) }); };
  const tools = (
    <div className="card flush">
      <Row icon="up" title="Move up" onClick={() => move(-1)} />
      <Row icon="down" title="Move down" onClick={() => move(1)} />
      <Row icon="trash" danger title={item.pause ? 'Remove this line' : 'Remove from the flow'} onClick={remove} />
    </div>
  );
  if (item.pause) return (
    <Screen narrow top={<><Back label={plan.title} /><h1>Timed line</h1><div className="m">{plan.noPhases ? '' : seg.name}</div></>}>
      <Field label="Name"><input type="text" maxLength={60} value={item.label || ''} onChange={(e) => edit((i) => { i.label = e.target.value || 'Break'; }, true)} /></Field>
      <div className="card flush"><Row title="Time" sub="Minutes:seconds" right={<ClockInput seconds={item.duration || 60} onChange={(s) => edit((i) => { i.duration = s; })} label="Time" min={5} max={3600} />} /></div>
      <Field label="Note"><input type="text" maxLength={300} value={item.note || ''} onChange={(e) => edit((i) => { if (e.target.value) i.note = e.target.value; else delete i.note; }, true)} /></Field>
      {tools}
    </Screen>
  );
  if (!mv) return <Screen narrow top={<><Back label={plan.title} /><h1>{item.slug}</h1></>}><Empty title="This movement isn't in your library any more" text="Remove the block, or put the movement back from Library → Removed." />{tools}</Screen>;
  const vars = variationsOf(mv) as { name: string; kind?: string; springs?: string[]; note?: string }[];
  const mark = (k?: string) => (OPTION_KINDS as { id: string; mark: string }[]).find((o) => o.id === kindOf(k))?.mark || '';
  const chosen = new Set((item.layers || []).filter((l) => typeof l === 'string') as string[]);
  const own = (item.layers || []).filter((l) => typeof l !== 'string') as { text: string }[];
  const usual = loadsOf(item, mv);
  // What the class actually uses here: the checks can share a setting with the block before.
  const inClass = (a?.springPlan as { itemId: string; pass: number; loads: string[] }[] | undefined)?.find((x) => x.itemId === itemId && x.pass === 1)?.loads;
  const loads = inClass && inClass.length ? inClass : usual;
  const shared = !!inClass && !item.load && JSON.stringify([...(fitSprings(usual || [], studio) as { loads: string[] }).loads].sort()) !== JSON.stringify([...inClass].sort());
  const props = item.props || [];
  const studioProps = pickableProps(studio.setup);
  const owned = ownedProps(studio);
  const needs = new Set((mv?.equipment || []).map((e) => resolveProp(studio.setup, e)));
  const addOwnProp = async () => {
    const label = propText.trim().slice(0, 40);
    if (!label) return;
    setPropText('');
    const known = [...studioProps, ...(plan.extraProps || [])].find((x) => x.label.toLowerCase() === label.toLowerCase());
    const pid = known ? known.id : `p_${slugify(label).replace(/-/g, '_') || 'prop'}`;
    edit((i) => { i.props = [...new Set([...(i.props || []), pid])].slice(0, 12); });
    if (known) return;
    const toStudio = studio.id ? await confirmAsk(`Add ${label} to ${studio.name} too?`, `So it's in the list of props ${studio.name} owns, for every class there. If not, it stays with this flow only.`, `Add to ${studio.name}`) : false;
    if (toStudio) { let got = pid; changeStudio(studio.id, (s) => { got = addProp(s, { label }) || pid; }); if (got !== pid) edit((i) => { i.props = [...new Set([...(i.props || []).filter((x) => x !== pid), got])].slice(0, 12); }); toast(`${label} added to ${studio.name}.`); }
    else changeClass(id, (p) => { p.extraProps = [...(p.extraProps || []).filter((x) => x.id !== pid), { id: pid, label }]; });
  };
  const auto = itemDuration({ ...item, duration: 0 }, mv, tm) as number;
  const regress = vars.filter((v) => kindOf(v.kind) === 'regression');
  const progress = vars.filter((v) => kindOf(v.kind) === 'progression');
  const [offerKind, setOfferKind] = [offerKindState, setOfferKindState];
  return (
    <Screen narrow top={<><Back label={plan.title} /><div className="row"><Thumb mv={mv} /><div className="grow"><h1 style={{ fontSize: 'calc(24px * var(--scale))' }}>{mv.name}</h1><div className="m">{plan.noPhases ? 'Block' : seg.name} · {at.index + 1} of {seg.items.length}</div></div>
      <button type="button" className="btn sm" onClick={() => nav.go({ name: 'movement', id: mv.slug })}>About</button></div></>} foot={<button type="button" className="btn p grow" onClick={() => nav.back()}>Done</button>}>
      {vars.length ? <div><div className="lab">Version the class does</div><div style={{ marginTop: 8 }}><Chips options={[{ id: '', label: 'Usual' }, ...vars.map((v) => ({ id: v.name, label: `${mark(v.kind)} ${v.name}`.trim() }))]} value={item.variation || ''} onPick={(v) => edit((i) => { if (v) i.variation = v; else delete i.variation; })} /></div>
        {item.variation && vars.find((v) => v.name === item.variation)?.note ? <div className="m" style={{ marginTop: 6, padding: '0 4px' }}>{vars.find((v) => v.name === item.variation)!.note}</div> : null}</div> : null}
      {mv.apparatus === 'reformer' ? (
        <div className="card">
          <div className="row between"><div><div className="lab" style={{ padding: 0 }}>Springs in this flow · {studio.name}</div><div style={{ marginTop: 8 }}><Springs loads={loads} studio={studio} /></div>
            {shared ? <div className="tiny" style={{ marginTop: 6 }}>Usual is <Springs loads={usual} studio={studio} label={false} />: this flow keeps the setting from the block before, which suits this movement too, to save a spring change. Set your own below to change it.</div> : null}</div>
            {item.load ? <button type="button" className="btn sm" onClick={() => edit((i) => { delete i.load; })}>Use the usual</button> : null}</div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-2)' }}>
            <div className="tiny" style={{ marginBottom: 6 }}>Set your own for this block: tap a weight to add it, tap a spring to take it off.</div>
            <div className="chips">{(['xlight', 'light', 'medium', 'heavy', 'xheavy'] as const).filter((l) => !studio.id || Number(studio.springs[l]) > 0).map((l) => <button type="button" key={l} className="chip" onClick={() => edit((i) => { i.load = { springs: [...(i.load?.springs || []), l].slice(0, 5) }; })}>+ <Springs loads={[l]} studio={studio} /></button>)}</div>
            {item.load?.springs.length ? <div className="chips" style={{ marginTop: 8 }}>{item.load.springs.map((l, k) => <button type="button" key={k} className="chip on" aria-label="Take this spring off" onClick={() => edit((i) => { const s = [...(i.load?.springs || [])]; s.splice(k, 1); i.load = { springs: s }; })}><Springs loads={[l]} studio={studio} /> ×</button>)}</div> : null}
          </div>
        </div>
      ) : null}
      <div><div className="lab">Layers, in order</div>
        <div className="card flush" style={{ marginTop: 8 }}>
          {(layersOf(mv, item) as { tag?: string; title: string; text?: string }[]).map((l, k) => <div className="set" key={k}><b style={{ color: 'var(--accent)', width: 16 }}>{k + 1}</b><span className="grow">{l.title}{l.tag && l.text ? <div className="m">{l.text}</div> : null}</span><button type="button" className="btn icon ghost" aria-label={`Remove layer ${l.title}`} onClick={() => edit((i) => { const ls = [...(i.layers || [])]; ls.splice(k, 1); if (ls.length) i.layers = ls; else delete i.layers; })}><Icon name="close" size={16} /></button></div>)}
          {(mv.layers || []).filter((l) => l.tag && !chosen.has(l.tag)).map((l) => <button type="button" className="set" key={l.tag} onClick={() => edit((i) => { i.layers = [...(i.layers || []), l.tag!].slice(0, 8); })}><span style={{ color: 'var(--accent)', fontWeight: 700 }}>+</span><span className="grow">{l.title}<div className="m">{l.text}</div></span></button>)}
          <div className="set"><input type="text" maxLength={160} placeholder="Add a layer in your own words" aria-label="A layer in your own words" value={layerText} onChange={(e) => setLayerText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && layerText.trim()) { edit((i) => { i.layers = [...(i.layers || []), { text: layerText.trim() }].slice(0, 8); }); setLayerText(''); } }} /><button type="button" className="btn sm" disabled={!layerText.trim() || own.length + chosen.size >= 8} onClick={() => { edit((i) => { i.layers = [...(i.layers || []), { text: layerText.trim() }].slice(0, 8); }); setLayerText(''); }}>Add</button></div>
        </div></div>
      <div><div className="lab">Finisher</div><div style={{ marginTop: 8 }}><Chips options={[{ id: '', label: 'None' }, ...(FINISHERS as string[]).map((f) => ({ id: f, label: f })), ...(item.finisher && !(FINISHERS as string[]).includes(item.finisher) ? [{ id: item.finisher, label: item.finisher }] : [])]} value={item.finisher || ''} onPick={(v) => edit((i) => { if (v) i.finisher = v; else delete i.finisher; })} /></div></div>
      <div className="card flush">
        <Row title="Time" sub={item.duration ? `Your own. Worked out it would be ${fmtClock(auto)}.` : `Worked out for you from the movement, layers and finisher.`} right={<span className="row" style={{ gap: 6 }}>{item.duration ? <button type="button" className="btn sm" onClick={() => edit((i) => { delete i.duration; })}>Auto</button> : null}<ClockInput seconds={item.duration || auto} onChange={(s) => edit((i) => { i.duration = s; })} label="Time for this block" /></span>} />
        <div className="set"><Field label="Reps or counts"><input type="text" maxLength={60} placeholder={mv.reps || 'e.g. 8–10'} value={item.reps || ''} onChange={(e) => edit((i) => { if (e.target.value) i.reps = e.target.value; else delete i.reps; }, true)} /></Field></div>
      </div>
      <div><div className="lab">Props for this block</div>
        <div className="card stack-sm" style={{ marginTop: 8 }}>
          {(mv.equipment || []).length ? <div className="m">The movement uses: {(mv.equipment || []).map((e) => propLabel(studio.setup, e)).join(', ')}</div> : null}
          <div className="chips">{[...studioProps, ...(plan.extraProps || [])].filter((x) => !needs.has(x.id)).sort((x, y) => Number(!props.includes(x.id)) - Number(!props.includes(y.id)) || Number(!(owned[x.id] > 0)) - Number(!(owned[y.id] > 0))).map((x) => <button type="button" key={x.id} className={`chip${props.includes(x.id) ? ' on' : ''}`} aria-pressed={props.includes(x.id)} onClick={() => edit((i) => { const s = new Set(i.props || []); if (s.has(x.id)) s.delete(x.id); else s.add(x.id); if (s.size) i.props = [...s].slice(0, 12); else delete i.props; })}>{x.label}{studio.id && !(owned[x.id] > 0) ? ' · not here' : ''}</button>)}</div>
          <div className="row"><input type="text" maxLength={40} placeholder="Another prop, e.g. ankle weights" aria-label="Add a prop of your own" value={propText} onChange={(e) => setPropText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void addOwnProp(); }} /><button type="button" className="btn sm" disabled={!propText.trim()} onClick={() => void addOwnProp()}>Add</button></div>
        </div></div>
      <div><div className="lab">Offer for anyone who needs less or more</div>
        <div className="card flush" style={{ marginTop: 8 }}>
          {(item.options || []).map((o) => <div className="set" key={o.id}><span className="grow">{mark(o.kind)} {o.title}{o.note ? <div className="m">{o.note}</div> : null}</span><button type="button" className="btn icon ghost" aria-label={`Remove ${o.title}`} onClick={() => edit((i) => { i.options = (i.options || []).filter((x) => x.id !== o.id); if (!i.options.length) delete i.options; })}><Icon name="close" size={16} /></button></div>)}
          {[...regress.map((v) => ({ v, kind: 'regression' })), ...progress.map((v) => ({ v, kind: 'progression' }))].filter(({ v }) => !(item.options || []).some((o) => o.title === v.name)).slice(0, 8).map(({ v, kind }) => <button type="button" className="set" key={`${kind}${v.name}`} onClick={() => edit((i) => { i.options = [...(i.options || []), { id: uid('o'), kind, title: v.name, ...(v.springs ? { springs: v.springs } : {}), ...(v.note ? { note: v.note } : {}) }].slice(0, 8); })}><span style={{ color: 'var(--accent)', fontWeight: 700 }}>+</span><span className="grow">{kind === 'progression' ? '▲ Harder' : '▼ Easier'}: {v.name}<div className="m">{v.note}</div></span></button>)}
          {!progress.length ? <div className="set"><span className="m">No harder versions in the library for this one yet: add your own below, or add one to the movement.</span></div> : null}
          <div className="set" style={{ flexWrap: 'wrap' }}><div className="seg" role="group" aria-label="Easier or harder"><button type="button" className={offerKind === 'regression' ? 'on' : ''} onClick={() => setOfferKind('regression')}>▼ Easier</button><button type="button" className={offerKind === 'progression' ? 'on' : ''} onClick={() => setOfferKind('progression')}>▲ Harder</button></div>
            <input type="text" maxLength={120} placeholder={offerKind === 'progression' ? 'Your own harder option' : 'Your own easier option'} aria-label="Your own offer" value={offer} onChange={(e) => setOffer(e.target.value)} style={{ flex: '1 1 160px' }} /><button type="button" className="btn sm" disabled={!offer.trim()} onClick={() => { edit((i) => { i.options = [...(i.options || []), { id: uid('o'), kind: offerKind, title: offer.trim() }].slice(0, 8); }); setOffer(''); }}>Add</button></div>
        </div></div>
      <Field label="Your note" hint="Shown in Play."><textarea maxLength={500} value={item.note || ''} onChange={(e) => edit((i) => { if (e.target.value) i.note = e.target.value; else delete i.note; }, true)} /></Field>
      {tools}
    </Screen>
  );
}

// ---- the checks
function ChecksCard({ a }: { a: Analysis }) {
  const checks = a.checks as { level: string; id: string; title: string; body: string }[];
  const order = { warn: 0, info: 1, ok: 2 } as Record<string, number>;
  return (
    <div className="card flush">
      <div className="set"><b className="grow">Checks</b><span className="m">{checks.filter((c) => c.level === 'warn').length} to look at</span></div>
      {[...checks].sort((x, y) => (order[x.level] ?? 3) - (order[y.level] ?? 3)).map((c) => <div className={`check ${c.level}`} key={c.id}><span className="mark" /><span><b>{c.title}</b><div className="m">{c.body}</div></span></div>)}
    </div>
  );
}
function SpringsCard({ a, studio, plan }: { a: Analysis; studio: Studio; plan: ClassPlan }) {
  if (plan.apparatus === 'mat' || !a.hasReformer) return null;
  const stops = (a.springPlan as { pass: number; loads: string[]; changed: boolean; name: string }[]).filter((p) => p.pass === 1);
  const groups: { loads: string[]; n: number; first: string }[] = [];
  for (const s of stops) { if (s.changed || !groups.length) groups.push({ loads: s.loads, n: 1, first: s.name }); else groups[groups.length - 1].n++; }
  const kit = (a.setOut?.equipment || []) as { id: string; label: string; have: number }[];
  return (
    <div className="card">
      <div className="row between"><b>Springs at {studio.name}</b><span className="tag acc">{a.springChanges} change{a.springChanges === 1 ? '' : 's'}{a.springBudget ? ` · limit ${a.springBudget}` : ''}</span></div>
      <div className="stack-sm" style={{ marginTop: 10 }}>{groups.map((g, i) => <div className="row" key={i}><Springs loads={g.loads} studio={studio} /><span className="m">{i === 0 ? 'Start' : `Change ${i}`} · {g.n} block{g.n === 1 ? '' : 's'}</span></div>)}</div>
      {kit.length ? <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line-2)' }}><div className="tiny" style={{ marginBottom: 6 }}>Set out</div><div className="chips">{kit.map((k) => <span key={k.id} className={`tag${k.have ? '' : ' warn'}`}>{k.label}{k.have ? '' : ' · not at this studio'}</span>)}</div></div> : null}
    </div>
  );
}
function MusclesCard({ a }: { a: Analysis }) {
  const muscles = ((a.muscles || []) as unknown as { id: string; label: string; score: number }[]).slice(0, 8);
  const top = Math.max(1, ...muscles.map((m) => m.score));
  const spine = a.spine as Record<string, number>;
  const target = a.target as Record<string, number | string>;
  const dirs: [string, string][] = [['flexion', 'Flexion'], ['extension', 'Extension'], ['rotation', 'Rotation'], ['side-bend', 'Side bend']];
  return (
    <>
      <div className="card stack-sm"><b>Muscles worked</b>
        {muscles.length ? <><BodyMap levels={Object.fromEntries(((a.muscles || []) as unknown as { id: string; score: number }[]).map((m) => [m.id, m.score / top]))} names={(x) => labelOf(MUSCLES, x) as string} /><BodyKey /></> : null}
        <div className="stack-sm" style={{ marginTop: 10 }}>{muscles.map((m) => <div className="row" key={m.id}><span style={{ width: 110, fontSize: 'calc(13px * var(--scale))' }}>{m.label}</span><span className="meter"><i style={{ width: `${Math.round((m.score / top) * 100)}%` }} /></span></div>)}{!muscles.length ? <span className="m">Add some blocks to see this.</span> : null}</div></div>
      <div className="card"><div className="row between"><b>Spine movement</b><span className="m">vs {String(target.label || 'General')}</span></div>
        <div className="stack-sm" style={{ marginTop: 10 }}>{dirs.map(([k, label]) => <div className="row" key={k}><span style={{ width: 110, fontSize: 'calc(13px * var(--scale))' }}>{label}</span><span className="meter"><i className={spine[k] > 0 && spine[k] - Number(target[k] || 0) <= -8 ? 'low' : ''} style={{ width: `${Math.min(100, spine[k] || 0)}%` }} /></span><span className="tiny" style={{ width: 74, textAlign: 'right' }}>{spine[k] || 0}% of {Number(target[k] || 0)}%</span></div>)}</div></div>
    </>
  );
}

export function AnalysisScreen({ id }: { id: string }) {
  const plan = useClass(id);
  const studio = studioOf(plan?.studioId);
  const a = useMemo(() => (plan ? (analyse(plan, studio) as Analysis) : null), [plan, studio]);
  if (!plan || !a) return <Screen top={<><Back /><h1>Flow not found</h1></>}><Empty title="This flow is no longer here" /></Screen>;
  return (
    <Screen narrow top={<><Back label={plan.title} /><h1>Checks</h1><div className="m">{Math.round(a.totalSec / 60)} min planned for a {plan.lengthMin} min class · {a.movingPct}% of it moving</div></>}>
      <ChecksCard a={a} /><SpringsCard a={a} studio={studio} plan={plan} /><MusclesCard a={a} />
      <div className="card"><b>Where the time goes</b>
        <div className="stack-sm" style={{ marginTop: 10 }}>{(a.segments as { name: string; sec: number; role: string }[]).map((s, i) => <div className="row" key={i}><span className="dot" style={{ background: roleColor(s.role), boxShadow: 'none' }} /><span className="grow">{plan.noPhases ? 'All blocks' : s.name}</span><span className="m">{fmtClock(s.sec)}</span></div>)}
          <div className="row"><span className="dot" style={{ background: 'var(--input)', boxShadow: 'none' }} /><span className="grow">Changing springs, position and kit</span><span className="m">{fmtClock(a.transitionSec)}</span></div></div></div>
    </Screen>
  );
}

// ---- the whole class on one page
export function RunSheetScreen({ id }: { id: string }) {
  const plan = useClass(id);
  const studio = studioOf(plan?.studioId);
  const a = useMemo(() => (plan ? (analyse(plan, studio) as Analysis) : null), [plan, studio]);
  if (!plan || !a) return <Screen top={<><Back /><h1>Flow not found</h1></>}><Empty title="This flow is no longer here" /></Screen>;
  const tm = timingFor(plan);
  const lib = library().map;
  const planOf = new Map<string, { loads: string[]; changed: boolean }>((a.springPlan as { itemId: string; pass: number; loads: string[]; changed: boolean }[]).filter((p) => p.pass === 1).map((p) => [p.itemId, p]));
  let n = 0;
  return (
    <Screen narrow top={<><Back label={plan.title} /><h1>Run sheet</h1><div className="m">{[plan.title, `${plan.lengthMin} min`, levelName(plan.level), studio.id ? studio.name : ''].filter(Boolean).join(' · ')}</div></>}>
      {plan.segments.map((seg) => (
        <div className="stack-sm" key={seg.id}>
          {plan.noPhases ? null : <div className="row between" style={{ padding: '0 4px' }}><b>{seg.name}</b><span className="m">{fmtClock(segSeconds(seg, tm))}{seg.bothSides ? ' · both sides' : ''}</span></div>}
          <div className="card flush">
            {seg.items.map((item) => {
              if (item.pause) return <div className="set" key={item.id} style={{ background: 'var(--tint)' }}><span className="grow"><b>{item.label}</b>{item.note ? <div className="m">{item.note}</div> : null}</span><span className="m">{fmtClock(item.duration || 60)}</span></div>;
              const mv = lib[item.slug!];
              const p = planOf.get(item.id);
              const layers = layersOf(mv, item) as { title: string }[];
              n++;
              return (
                <div className="set" key={item.id} style={{ alignItems: 'flex-start' }}>
                  <b style={{ width: 22, color: 'var(--muted)' }}>{n}</b>
                  <span className="grow"><b>{mv ? mv.name : item.slug}</b>{item.variation ? ` · ${item.variation}` : ''}
                    <div className="m">{[item.reps || mv?.reps, ...layers.map((l, i) => `${i + 1}. ${l.title}`), item.finisher ? `Finish: ${item.finisher}` : ''].filter(Boolean).join(' · ')}</div>
                    {(item.options || []).map((o) => <div className="m" key={o.id}>▼ {o.title}</div>)}
                    {item.note ? <div className="m" style={{ fontStyle: 'italic' }}>{item.note}</div> : null}</span>
                  <span style={{ textAlign: 'right', flex: 'none' }}>{mv?.apparatus === 'reformer' ? <div><Springs loads={p?.loads || loadsOf(item, mv)} studio={studio} />{p?.changed ? <span className="tag warn" style={{ marginLeft: 6 }}>change</span> : null}</div> : null}<div className="m">{fmtClock(itemDuration(item, mv, tm) as number)}</div></span>
                </div>
              );
            })}
            {!seg.items.length ? <div className="set"><span className="m">Nothing planned here yet.</span></div> : null}
          </div>
        </div>
      ))}
      {plan.notes ? <div className="card"><b>Notes</b><p className="m" style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{plan.notes}</p></div> : null}
    </Screen>
  );
}

/** Where this flow is on the calendar, and putting it on another day. Changes the calendar straight away. */
function OnCalendar({ plan }: { plan: ClassPlan }) {
  useData();
  const [at, setAt] = useState('');
  const places = plannedFor(plan.id).filter((p) => p.shift.date >= addDays(today(), -14));
  return (
    <div className="stack-sm">
      <div className="lab">On your calendar</div>
      {places.length ? <div className="card flush">{places.map((p) => <Row key={p.slot.id} title={`${niceDate(p.shift.date)}, ${clock(p.slot.start)}`} sub={[p.shift.name, studioName(p.shift.studioId), p.slot.cancelled || p.shift.cancelled ? 'Cancelled' : ''].filter(Boolean).join(' · ')} onClick={() => nav.go({ name: 'shift', id: p.shift.id }, 'calendar')} />)}</div> : <span className="m">Not planned for a day yet.</span>}
      <div className="row"><Field label="Add it to a day"><input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></Field><button type="button" className="btn sm" style={{ alignSelf: 'flex-end' }} disabled={!/T\d{2}:\d{2}/.test(at)} onClick={() => { planOnDate(plan, at.slice(0, 10), at.slice(11, 16)); setAt(''); toast(`On your calendar for ${niceDate(at.slice(0, 10))}.`); }}>Add</button></div>
    </div>
  );
}

/**
 * Reordering a flow's blocks: drag a block by its handle to anywhere in the flow (into another phase
 * too), or move it a step at a time with the arrows. Undo puts the old order back.
 */
function ReorderBlocks({ plan, change }: { plan: ClassPlan; change: (fn: (p: ClassPlan) => void) => void }) {
  const lib = library().map;
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; dy: number; y0: number; seg: string; index: number } | null>(null);
  const isPhased = !plan.noPhases && plan.segments.length > 1;
  const nameOf = (item: Item) => (item.pause ? item.label || 'Timed line' : lib[item.slug!]?.name || item.slug || '');
  /** Where a block dropped at screen height y lands: the phase, and its place in it. */
  const target = (y: number, id: string): { seg: string; index: number } => {
    const rows = [...(box.current?.querySelectorAll<HTMLElement>('[data-row]') || [])];
    for (const r of rows) {
      if (r.dataset.row === id) continue;
      const b = r.getBoundingClientRect();
      if (y < b.top + b.height / 2) return { seg: r.dataset.seg!, index: Number(r.dataset.index) };
    }
    // past the last block of a phase: the end of the phase whose bottom is nearest below
    const ends = [...(box.current?.querySelectorAll<HTMLElement>('[data-end]') || [])];
    for (const e of ends) if (y < e.getBoundingClientRect().bottom) return { seg: e.dataset.end!, index: Number(e.dataset.count) };
    const last = plan.segments[plan.segments.length - 1];
    return { seg: last.id, index: last.items.length };
  };
  const scroller = () => box.current?.closest('.body') as HTMLElement | null;
  const down = (e: PointerEvent, item: Item, seg: string, index: number) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: item.id, dy: 0, y0: e.clientY, seg, index });
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    const sc = scroller(), b = sc?.getBoundingClientRect();
    if (sc && b) { if (e.clientY < b.top + 50) sc.scrollTop -= 10; else if (e.clientY > b.bottom - 50) sc.scrollTop += 10; }
    setDrag({ ...drag, dy: e.clientY - drag.y0, ...target(e.clientY, drag.id) });
  };
  const up = () => {
    if (!drag) return;
    const { id, seg, index } = drag;
    setDrag(null);
    change((p) => moveItem(p, id, seg, index));
  };
  return (
    <div className="stack reorder" ref={box} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      <p className="m">Drag a block by <Icon name="grip" size={14} /> to move it, or use the arrows. Tap Done when it's in order.</p>
      {plan.segments.map((seg) => (
        <div className="stack-sm" key={seg.id}>
          {isPhased ? <div className="phase-head"><span className="dot" style={{ background: roleColor(seg.role), boxShadow: 'none' }} /><span className="name" style={{ padding: '6px 0' }}>{seg.name}</span></div> : null}
          {seg.items.map((item, index) => {
            const dragging = drag?.id === item.id;
            const before = drag && !dragging && drag.seg === seg.id && drag.index === index;
            return (
              <div key={item.id} data-row={item.id} data-seg={seg.id} data-index={index} className={`block reorder-row${item.pause ? ' line' : ''}${dragging ? ' lifted' : ''}${before ? ' drop-before' : ''}`} style={dragging ? { transform: `translateY(${drag.dy}px)` } : undefined}>
                <div className="row">
                  <span className="grip" role="button" aria-label={`Drag ${nameOf(item)}`} onPointerDown={(e) => down(e, item, seg.id, index)}><Icon name="grip" size={22} /></span>
                  {item.pause ? <Thumb /> : <Thumb mv={lib[item.slug!]} />}
                  <b className="grow cut">{nameOf(item)}</b>
                  <button type="button" className="btn icon" aria-label={`Move ${nameOf(item)} up`} onClick={() => change((p) => nudge(p, item.id, -1))}><Icon name="up" size={18} /></button>
                  <button type="button" className="btn icon" aria-label={`Move ${nameOf(item)} down`} onClick={() => change((p) => nudge(p, item.id, 1))}><Icon name="down" size={18} /></button>
                </div>
              </div>
            );
          })}
          <div data-end={seg.id} data-count={seg.items.length} className={`reorder-end${drag && drag.seg === seg.id && drag.index === seg.items.length ? ' drop-before' : ''}`}>{!seg.items.length ? <span className="m">Drop a block here</span> : null}</div>
        </div>
      ))}
    </div>
  );
}

// Building a flow step by step (Flows → New flow): the basics (the New flow screen), then
// 1. what's in this class, in teaching order, with minutes for each part;
// 2. each part in turn, offered only that part's movements (and your blocks for it);
// 3. putting it all in order, then on to the flow editor for the last tweaks.
// On an iPad the whole flow builds up on the right as you go.
import { useMemo, useState, type ReactNode } from 'react';
import { applySetup, library, studioOf, timingFor, useData } from '../../lib/store';
import { changeClass, classKey, planOf, saveOpenClass, levelName } from '../../lib/plan';
import { hasDraft, useDrafts } from '../../lib/drafts';
import { insertBlock, groupOf, runsOf } from '../../lib/blocks';
import { PART_PRESETS, partFor, splitMinutes } from '../../lib/parts';
import { uid } from '../../lib/clean';
import { itemDuration } from '../../engine';
import type { ClassPlan, Item, Segment } from '../../lib/types';
import { Back, Empty, Icon, Screen, Stepper, chooseAsk, fmtClock, toast, useEditing } from '../bits';
import { nav } from '../nav';
import { roleColor } from './Classes';
import { MovePicker, ReorderBlocks, WriteSheet, moveName, writtenFor } from './Builder';
import { sectionColour } from '../sections';

interface Part { key: string; name: string; role: string; sections: string[]; minutes: number }
const STEPS = 3;

export function WizardScreen({ id, start }: { id: string; start?: 'order' }) {
  useData();
  useDrafts();
  const plan = hasDraft(classKey(id)) ? planOf(id) : undefined;
  const [step, setStep] = useState<{ at: 'layout' } | { at: 'fill'; k: number } | { at: 'order' }>(start === 'order' ? { at: 'order' } : { at: 'layout' });
  useEditing(classKey(id), 'this flow', () => saveOpenClass(id));
  if (!plan) return <Screen top={<><Back label="Flows" /><h1>New flow</h1></>}><Empty title="This flow isn't open any more" text="Start a new one from Flows." /></Screen>;
  const studio = studioOf(plan.studioId);
  applySetup(studio.setup);
  const change = (fn: (p: ClassPlan) => void, typing = false) => changeClass(id, fn, typing);
  const toEditor = () => nav.swap({ name: 'class', id });
  const title = plan.title || 'New flow';
  const sub = [title, new RegExp(`\\b${plan.lengthMin}\\s*min`, 'i').test(title) ? '' : `${plan.lengthMin} min`, levelName(plan.level)].filter(Boolean).join(' · ');
  const outline = <Outline plan={plan} current={step.at === 'fill' ? plan.segments[step.k]?.id : undefined} />;
  if (step.at === 'layout') return <LayoutStep plan={plan} sub={sub} change={change} outline={outline} onSkip={toEditor} onNext={() => setStep(plan.segments.length ? { at: 'fill', k: 0 } : { at: 'order' })} />;
  if (step.at === 'fill') {
    const seg = plan.segments[step.k];
    if (!seg) { setStep({ at: 'order' }); return null; }
    const next = plan.segments[step.k + 1];
    return <FillStep key={seg.id} plan={plan} seg={seg} k={step.k} sub={sub} change={change} outline={outline}
      onBack={() => setStep(step.k ? { at: 'fill', k: step.k - 1 } : { at: 'layout' })}
      onNext={() => setStep(next ? { at: 'fill', k: step.k + 1 } : { at: 'order' })} nextLabel={next ? `Next: ${next.name}` : 'Next: put it in order'} />;
  }
  const moves = plan.segments.reduce((n, s) => n + s.items.filter((i) => !i.pause).length, 0);
  return (
    <WizardFrame back={plan.segments.length ? plan.segments[plan.segments.length - 1].name : 'Layout'} onBack={() => setStep(plan.segments.length ? { at: 'fill', k: plan.segments.length - 1 } : { at: 'layout' })} step={3} sub={`${moves} movement${moves === 1 ? '' : 's'} · ${sub}`} q="Put it in order" outline={outline}
      foot={<button type="button" className="btn p grow" onClick={toEditor}>Open in the flow editor</button>}>
      {moves ? <ReorderBlocks plan={plan} change={change} /> : <Empty title="Nothing picked yet" text="Go back and add movements, or open the flow editor and build it there." />}
    </WizardFrame>
  );
}

/** The walkthrough's frame: back, the steps bar, the question, and on an iPad the flow on the right. */
function WizardFrame({ back, onBack, step, sub, q, hint, children, foot, outline, top }: { back: string; onBack: () => void; step: number; sub: string; q: string; hint?: string; children: ReactNode; foot: ReactNode; outline: ReactNode; top?: ReactNode }) {
  return (
    <div className="screen wizard">
      <div className="top">
        <div className="wiz-top">
          <button type="button" className="back" onClick={onBack}><Icon name="back" size={18} />{back}</button>
          <div className="steps" aria-label={`Step ${step} of ${STEPS}`}>{Array.from({ length: STEPS }, (_, i) => <i key={i} className={i + 1 < step ? 'done' : i + 1 === step ? 'on' : ''} />)}</div>
          <div className="stepn cut">{sub}</div>
          <h1 className="q">{q}</h1>
          {hint ? <div className="m">{hint}</div> : null}
          {top}
        </div>
      </div>
      <div className="wiz-cols">
        <div className="body"><div className="stack wiz-main">{children}<div style={{ height: 70 }} aria-hidden="true" /></div></div>
        <aside className="wiz-outline wide-only">{outline}</aside>
      </div>
      <div className="foot"><div className="row grow wiz-main">{foot}</div></div>
    </div>
  );
}

/** Step 1: what's in this class, in the order it's taught, and minutes for each part. */
function LayoutStep({ plan, sub, change, outline, onNext, onSkip }: { plan: ClassPlan; sub: string; change: (fn: (p: ClassPlan) => void) => void; outline: ReactNode; onNext: () => void; onSkip: () => void }) {
  const d = useData();
  const fromPlan = (p: ClassPlan): Part[] => p.segments.map((s) => ({ key: s.id, name: s.name, role: s.role, sections: s.sections?.length ? s.sections : partFor(s.name).sections, minutes: s.minutes || 5 }));
  const [parts, setParts] = useState<Part[]>(() => fromPlan(plan));
  const [own, setOwn] = useState('');
  const [named, setNamed] = useState(false);
  const total = parts.reduce((n, p) => n + p.minutes, 0);
  const spread = (list: Part[]) => { const m = splitMinutes(plan.lengthMin, list.map((p) => p.role)); return list.map((p, k) => ({ ...p, minutes: m[k] })); };
  const has = (name: string) => parts.some((p) => p.name.toLowerCase() === name.toLowerCase());
  const toggle = (name: string, role: string, sections: string[]) => setParts((l) => spread(has(name) ? l.filter((p) => p.name.toLowerCase() !== name.toLowerCase()) : [...l, { key: uid('s'), name, role, sections, minutes: 5 }]));
  const move = (k: number, dir: -1 | 1) => setParts((l) => { const j = k + dir; if (j < 0 || j >= l.length) return l; const c = [...l]; [c[k], c[j]] = [c[j], c[k]]; return c; });
  const layouts = useMemo(() => {
    const seen = new Set<string>();
    return d.classes.filter((c) => c.id !== plan.id && c.segments.length > 1).filter((c) => { const k = c.segments.map((s) => s.name).join('|'); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
  }, [d.classes, plan.id]);
  const useLayout = async () => {
    const pick = await chooseAsk('Use a saved layout', 'The parts and minutes of one of your flows. The movements stay behind.', layouts.map((c) => ({ id: c.id, label: `${c.title}: ${c.segments.map((s) => s.name).join(', ')}` })));
    const c = d.classes.find((x) => x.id === pick);
    if (c) setParts(fromPlan(c).map((p) => ({ ...p, key: uid('s') })));
  };
  const apply = () => {
    change((p) => {
      const keep = new Map(p.segments.map((s) => [s.id, s]));
      p.segments = parts.map((x): Segment => ({ ...(keep.get(x.key) || { items: [] }), id: x.key, name: x.name, role: x.role, minutes: x.minutes, ...(x.sections.length ? { sections: x.sections } : {}) }));
      // a part taken out takes its movements with it (there's nothing in them yet on a new flow)
      delete p.noPhases;
    });
    onNext();
  };
  const presets = [...PART_PRESETS.map((x) => ({ name: x.name, role: x.role, sections: x.sections })), ...parts.filter((p) => !PART_PRESETS.some((x) => x.name.toLowerCase() === p.name.toLowerCase())).map((p) => ({ name: p.name, role: p.role, sections: p.sections }))];
  return (
    <WizardFrame back="Flows" onBack={() => void nav.back()} step={1} sub={sub} q="What's in this class?" hint="Tap the parts in the order you'll teach them." outline={outline}
      foot={<>{layouts.length ? <button type="button" className="btn grow" onClick={() => void useLayout()}>Use a saved layout</button> : <button type="button" className="btn grow" onClick={onSkip}>Skip to the editor</button>}<button type="button" className="btn p grow" disabled={!parts.length} onClick={apply}>Next</button></>}>
      <div className="opts">
        {presets.map((x) => { const at = parts.findIndex((p) => p.name.toLowerCase() === x.name.toLowerCase()); return (
          <button type="button" key={x.name} className={`opt${at >= 0 ? ' on' : ''}`} aria-pressed={at >= 0} onClick={() => toggle(x.name, x.role, x.sections)}>
            <span className="opt-sw" style={{ background: x.sections[0] ? sectionColour(x.sections[0]) : roleColor(x.role) }} /><span className="grow">{x.name}</span>{at >= 0 ? <span className="num">{at + 1}</span> : null}
          </button>
        ); })}
        {named ? <div className="opt own"><input type="text" maxLength={60} autoFocus placeholder="e.g. Flow" aria-label="Your own part" value={own} onChange={(e) => setOwn(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && own.trim()) { const k = partFor(own); toggle(own.trim(), k.role, k.sections); setOwn(''); setNamed(false); } }} /><button type="button" className="btn sm" disabled={!own.trim()} onClick={() => { const k = partFor(own); toggle(own.trim(), k.role, k.sections); setOwn(''); setNamed(false); }}>Add</button></div>
          : <button type="button" className="opt dash" onClick={() => setNamed(true)}><Icon name="plus" size={16} /><span className="grow">Your own part</span></button>}
      </div>
      {parts.length ? <>
        <div className="row between" style={{ marginTop: 6 }}><span className="lab" style={{ padding: 0 }}>Order and minutes</span><span className={`m${Math.abs(total - plan.lengthMin) > 2 ? ' warn-text' : ''}`}>{total} of {plan.lengthMin} min</span></div>
        <div className="card flush">
          {parts.map((p, k) => (
            <div className="set part-line" key={p.key}>
              <span className="num-dot" style={{ background: p.sections[0] ? sectionColour(p.sections[0]) : roleColor(p.role) }}>{k + 1}</span>
              <b className="pl-name">{p.name}</b>
              <span className="pl-tools"><button type="button" className="btn icon ghost" aria-label={`Move ${p.name} earlier`} disabled={!k} onClick={() => move(k, -1)}><Icon name="up" size={16} /></button>
              <button type="button" className="btn icon ghost" aria-label={`Move ${p.name} later`} disabled={k === parts.length - 1} onClick={() => move(k, 1)}><Icon name="down" size={16} /></button>
              <Stepper value={p.minutes} min={1} max={60} label={`Minutes for ${p.name}`} onChange={(n) => setParts((l) => l.map((x) => (x.key === p.key ? { ...x, minutes: n } : x)))} /><span className="tiny">min</span></span>
            </div>
          ))}
        </div>
        <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setParts(spread(parts))}>Share the {plan.lengthMin} minutes out again</button>
      </> : <p className="m">Nothing picked yet.</p>}
    </WizardFrame>
  );
}

/** Step 2, once for each part: only that part's movements, your blocks for it first. */
function FillStep({ plan, seg, k, sub, change, outline, onBack, onNext, nextLabel }: { plan: ClassPlan; seg: Segment; k: number; sub: string; change: (fn: (p: ClassPlan) => void) => void; outline: ReactNode; onBack: () => void; onNext: () => void; nextLabel: string }) {
  const [writing, setWriting] = useState(false);
  const studio = studioOf(plan.studioId);
  const lib = library().map;
  const tm = timingFor(plan);
  const used = new Set(plan.segments.flatMap((s) => s.items.map((i) => i.slug || '')));
  const secs = seg.items.reduce((t, i) => t + (itemDuration(i, (i.slug && lib[i.slug]) || writtenFor(i, plan) || null, tm) as number), 0);
  const push = (items: Item[]) => change((p) => { p.segments.find((s) => s.id === seg.id)?.items.push(...items); });
  const prev = plan.segments[k - 1];
  return (
    <WizardFrame back={prev ? prev.name : 'Layout'} onBack={onBack} step={2} sub={`Part ${k + 1} of ${plan.segments.length}${seg.minutes ? ` · ${seg.minutes} min` : ''} · ${sub}`} q={seg.name} outline={outline}
      foot={<>{seg.items.length ? null : <button type="button" className="btn grow" onClick={onNext}>Skip</button>}<button type="button" className="btn p grow" onClick={onNext}>{nextLabel}</button></>}>
      <div className="card tray">
        <div className="row between"><span className="lab" style={{ padding: 0 }}>In {seg.name} · {seg.items.length}</span><span className={`m${seg.minutes && Math.abs(secs - seg.minutes * 60) > 60 ? ' warn-text' : ''}`}>{fmtClock(secs)}{seg.minutes ? ` of ${seg.minutes} min` : ''}</span></div>
        {seg.items.length ? <div className="chips" style={{ marginTop: 8 }}>{runsOf(seg).map((run) => run.group
          ? <button type="button" key={run.group} className="chip on" onClick={() => change((p) => { const s = p.segments.find((x) => x.id === seg.id)!; s.items = s.items.filter((i) => i.group !== run.group); })}>{groupOf(plan, run.group)?.name} · {run.items.length} ✕</button>
          : <button type="button" key={run.items[0].id} className="chip on" aria-label={`Take ${moveName(run.items[0], lib[run.items[0].slug || ''])} out`} onClick={() => change((p) => { const s = p.segments.find((x) => x.id === seg.id)!; s.items = s.items.filter((i) => i.id !== run.items[0].id); })}>{moveName(run.items[0], lib[run.items[0].slug || ''])} ✕</button>)}</div>
          : <div className="m" style={{ marginTop: 4 }}>Tap + on the movements and blocks you want.</div>}
      </div>
      <MovePicker studio={studio} apparatus={plan.apparatus} level={plan.level} used={used} first={seg.sections || []} limit={seg.sections} onWrite={() => setWriting(true)}
        onMovement={(m) => { push([{ id: uid('i'), slug: m.slug }]); toast(`${m.name} in ${seg.name}.`); }}
        onBlock={(b) => { change((p) => { insertBlock(p, seg.id, b); }); toast(`The block ${b.name} in ${seg.name}.`); }}
        onSeries={(s) => { push(s.items.filter((i) => lib[i.slug]).map((i) => ({ id: uid('i'), ...i }))); toast(`${s.name} in ${seg.name}.`); }} />
      {writing ? <WriteSheet plan={plan} studio={studio} onAdd={(item) => { push([item]); toast(`Added ${item.text}.`); }} onClose={() => setWriting(false)} /> : null}
    </WizardFrame>
  );
}

/** The whole flow as it builds up (on an iPad, beside the walkthrough). */
function Outline({ plan, current }: { plan: ClassPlan; current?: string }) {
  const lib = library().map;
  return (
    <div className="stack-sm">
      <div><b style={{ fontSize: 'calc(18px * var(--scale))' }}>{plan.title || 'New flow'}</b><div className="m">{plan.lengthMin} min · {levelName(plan.level)}{studioOf(plan.studioId).id ? ` · ${studioOf(plan.studioId).name}` : ''}</div></div>
      {plan.segments.map((s, k) => (
        <div key={s.id} className={`ol-part${s.id === current ? ' cur' : ''}`}>
          <div className="ol-head">{k + 1} {s.name}{s.minutes ? ` · ${s.minutes} min` : ''}</div>
          {s.items.length ? runsOf(s).map((run) => run.group
            ? <div className="ol-li" key={run.group}>{groupOf(plan, run.group)?.name} <span className="tag acc">Block · {run.items.length}</span></div>
            : <div className="ol-li" key={run.items[0].id}>{moveName(run.items[0], lib[run.items[0].slug || ''])}{run.items[0].text && !run.items[0].slug ? <span className="tag" style={{ marginLeft: 6 }}>Written</span> : null}</div>)
            : <div className="ol-li empty">{s.id === current ? 'Picking now' : 'To fill'}</div>}
        </div>
      ))}
    </div>
  );
}

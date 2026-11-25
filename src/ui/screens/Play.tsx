// Teaching a class: first "which studio are you at?", then one block at a time with a countdown.
import { useEffect, useMemo, useRef, useState } from 'react';
import { itemDuration, labelOf, layersOf, POSITIONS, EQUIPMENT } from '../../engine';
import { keepAwake } from '../../lib/native';
import { analyse, applySetup, getData, library, logTaught, studioOf, timingFor, useData } from '../../lib/store';
import { changeSlot } from '../../lib/calendar';
import type { ClassPlan, Item, Movement, Segment, Studio } from '../../lib/types';
import { Frames, Icon, Sheet, Springs, fmtClock, springText, toast } from '../bits';
import { nav, useNav } from '../nav';
import { loadsOf, studioLine } from './Builder';

// ---- "which studio are you at?"
let ask: (plan: ClassPlan | null) => void = () => {};
/** Start a class: asks which studio first when there is more than one. */
export function startPlay(plan: ClassPlan, where?: { shiftId: string; slotId: string; studioId?: string }) {
  const { studios } = getData();
  if (where) { nav.play(plan.id, (where.studioId && studios.some((s) => s.id === where.studioId) ? where.studioId : studioOf(plan.studioId).id) || '', { shiftId: where.shiftId, slotId: where.slotId }); return; }
  if (studios.length > 1) ask(plan);
  else nav.play(plan.id, studios[0]?.id || '');
}
/** What a class needs that a studio doesn't have. */
function missingAt(plan: ClassPlan, studio: Studio): string[] {
  const lib = library().map;
  const need = new Set<string>();
  for (const s of plan.segments) for (const i of s.items) for (const e of [...((i.slug && lib[i.slug]?.equipment) || []), ...(i.props || [])]) if (!(Number(studio.props[e]) > 0)) need.add(e);
  applySetup(studio.setup);
  return [...need].map((e) => (plan.extraProps || []).find((x) => x.id === e)?.label || (labelOf(EQUIPMENT, e) as string));
}

export function PlayHost() {
  const d = useData();
  const n = useNav();
  const [plan, setPlan] = useState<ClassPlan | null>(null);
  const [pick, setPick] = useState('');
  useEffect(() => { ask = (p) => { setPlan(p); setPick(p ? studioOf(p.studioId).id : ''); }; return () => { ask = () => {}; }; }, []);
  const playing = n.play ? d.classes.find((c) => c.id === n.play!.classId) : undefined;
  return (
    <>
      {plan ? (
        <Sheet title="Which studio are you at?" onClose={() => setPlan(null)} foot={<button type="button" className="btn p grow" onClick={() => { const id = plan.id; setPlan(null); nav.play(id, pick); }}><Icon name="play" size={16} fill />Start at {studioOf(pick).name}</button>}>
          <p className="m">{plan.title} will show that studio's springs and props.</p>
          {d.studios.map((s) => {
            const missing = plan.apparatus === 'mat' ? [] : missingAt(plan, s);
            const noReformer = plan.apparatus !== 'mat' && !s.hasReformers;
            return (
              <button type="button" key={s.id} className={`card pick${s.id === pick ? ' on' : ''}`} aria-pressed={s.id === pick} onClick={() => setPick(s.id)}>
                <div className="row between"><b>{s.name}</b>{s.id === plan.studioId ? <span className="tag acc">Planned here</span> : null}</div>
                <div className="m">{studioLine(s)}</div>
                {s.hasReformers && plan.apparatus !== 'mat' ? <div style={{ marginTop: 6 }}><Springs loads={Object.entries(s.springs).flatMap(([l, c]) => Array(Math.min(6, Number(c) || 0)).fill(l) as string[])} studio={s} /></div> : null}
                {noReformer ? <div className="warn-text" style={{ marginTop: 8, fontSize: 'calc(13px * var(--scale))' }}>No reformers here, and this is a reformer class.</div> : null}
                {missing.length ? <div className="warn-text" style={{ marginTop: 8, fontSize: 'calc(13px * var(--scale))' }}>No {missing.join(' or ').toLowerCase()} here: {missing.length === 1 ? 'a block needs' : 'some blocks need'} a swap.</div> : null}
              </button>
            );
          })}
        </Sheet>
      ) : null}
      {playing && n.play ? <PlayScreen plan={playing} studio={studioOf(n.play.studioId)} /> : null}
    </>
  );
}

interface Step { seg: Segment; item: Item; mv?: Movement; pass: number; dur: number; loads?: string[]; changed: boolean }

function PlayScreen({ plan, studio }: { plan: ClassPlan; studio: Studio }) {
  const d = useData();
  const steps = useMemo<Step[]>(() => {
    const lib = library().map;
    const tm = timingFor(plan);
    const a = analyse(plan, studio) as { springPlan: { itemId: string; pass: number; loads: string[]; changed: boolean }[] };
    const sp = new Map(a.springPlan.map((p) => [`${p.itemId}:${p.pass}`, p]));
    const out: Step[] = [];
    for (const seg of plan.segments) for (const pass of seg.bothSides ? [1, 2] : [1]) for (const item of seg.items) {
      const mv = item.slug ? lib[item.slug] : undefined;
      if (!item.pause && !mv) continue;
      const p = sp.get(`${item.id}:${pass}`);
      out.push({ seg, item, mv, pass, dur: itemDuration(item, mv || null, tm) as number, loads: p?.loads || (mv ? loadsOf(item, mv) : undefined), changed: !!p?.changed });
    }
    return out;
    // the plan as it was when Play started: edits made elsewhere don't jump the class about
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, studio.id]);
  const [at, setAt] = useState(0);
  const [left, setLeft] = useState(steps[0]?.dur || 0);
  const [running, setRunning] = useState(false);
  const [more, setMore] = useState(false);
  const endsAt = useRef(0);
  const startedAt = useRef(Date.now());
  const st = steps[at];

  useEffect(() => { if (d.settings.keepAwake) void keepAwake(true); return () => { void keepAwake(false); }; }, [d.settings.keepAwake]);
  useEffect(() => {
    if (!running) return;
    endsAt.current = Date.now() + left * 1000;
    const id = setInterval(() => setLeft(Math.max(0, Math.round((endsAt.current - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, at]);
  const go = (to: number) => { if (to < 0 || to >= steps.length) return; setAt(to); setLeft(steps[to].dur); setMore(false); };
  const finish = (taught: boolean) => {
    const mins = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    if (taught) {
      const n = nav.get().play;
      const where = n?.shiftId && n.slotId ? { shiftId: n.shiftId, slotId: n.slotId } : undefined;
      logTaught(plan, studio, mins, where);
      if (where) changeSlot(where.shiftId, where.slotId, (k) => { k.taughtAt = new Date().toISOString(); });
      toast(`Logged as taught at ${studio.name}.`);
    }
    nav.stopPlay();
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(at + 1); else if (e.key === 'ArrowLeft') go(at - 1); else if (e.key === ' ') { e.preventDefault(); setRunning((r) => !r); } else if (e.key === 'Escape') nav.stopPlay(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });

  if (!st) return (
    <div className={`play${d.settings.playDark ? '' : ' light'}`}><div className="mid" style={{ justifyContent: 'center' }}><h1>Nothing to play yet</h1><p className="pm">Add some blocks to this flow first.</p><button type="button" className="pbtn" style={{ padding: '0 24px' }} onClick={() => nav.stopPlay()}>Close</button></div></div>
  );
  const remaining = steps.slice(at + 1).reduce((n, s) => n + s.dur, 0) + left;
  const layers = st.mv ? (layersOf(st.mv, st.item) as { title: string }[]) : [];
  const next = steps[at + 1];
  const last = at === steps.length - 1;
  const frac = st.dur ? 1 - left / st.dur : 0;
  const R = 92;
  const C = 2 * Math.PI * R;
  const missing = st.mv ? (st.mv.equipment || []).filter((e) => !(Number(studio.props[e]) > 0)).map((e) => (labelOf(EQUIPMENT, e) as string).toLowerCase()) : [];
  return (
    <div className={`play${d.settings.playDark ? '' : ' light'}`} role="dialog" aria-label={`Playing ${plan.title}`}>
      <div className="row">
        <button type="button" className="pbtn" style={{ minWidth: 44, minHeight: 44, width: 44, borderRadius: 22 }} aria-label="Close" onClick={() => finish(false)}><Icon name="close" size={18} /></button>
        <div className="grow center"><div className="pm">{studio.id ? `${studio.name} · ` : ''}block {at + 1} of {steps.length}</div>
          <div className="prog">{steps.map((_, i) => <span key={i} className={i < at ? 'done' : i === at ? 'now' : ''} />)}</div></div>
        <span className="pm" style={{ width: 64, textAlign: 'right' }}>{fmtClock(remaining)} left</span>
      </div>
      <div className="mid">
        <div className="donut">
          <svg width="210" height="210" viewBox="0 0 210 210" role="img" aria-label={`${fmtClock(left)} left of ${fmtClock(st.dur)}`}>
            <circle cx="105" cy="105" r={R} fill="none" stroke="var(--play-line)" strokeWidth="14" />
            <circle cx="105" cy="105" r={R} fill="none" stroke="var(--play-accent)" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 105 105)" />
          </svg>
          <div className="in"><span className="pm" style={{ fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>{plan.noPhases ? '' : st.seg.name}{st.pass === 2 ? ' · other side' : ''}</span><span className="big">{fmtClock(left)}</span><span className="pm">{st.item.pause ? 'Timed line' : st.item.reps || st.mv?.reps || ''}</span></div>
        </div>
        <h1 style={{ fontSize: 'calc(30px * var(--scale))', textAlign: 'center' }}>{st.item.pause ? st.item.label : st.mv!.name}{st.item.variation ? <span className="pm" style={{ display: 'block', fontFamily: 'var(--font)', fontWeight: 500, marginTop: 4 }}>{st.item.variation}</span> : null}</h1>
        {st.item.pause ? null : (
          <div className="panel row wrap" style={{ padding: '10px 14px', justifyContent: 'center' }}>
            {st.mv!.apparatus === 'reformer' ? <><Springs loads={st.loads} studio={studio} />{st.changed ? <span className="tag warn">change</span> : null}</> : <b>Mat</b>}
            <span className="pm">· {(labelOf(POSITIONS, st.mv!.position) as string).toLowerCase()}{st.mv!.setup?.headrest && st.mv!.setup.headrest !== 'any' ? ` · headrest ${st.mv!.setup.headrest}` : ''}</span>
          </div>
        )}
        {layers.length || st.item.finisher || st.item.note || (st.item.options || []).length || missing.length ? (
          <div className="panel" style={{ alignSelf: 'stretch' }}>
            <div style={{ fontSize: 'calc(12px * var(--scale))', fontWeight: 700, letterSpacing: '.05em', color: 'var(--play-accent)' }}>YOUR PLAN</div>
            {layers.map((l, i) => <div key={i}>{i + 1} · {l.title}</div>)}
            {st.item.finisher ? <div>Finish · {st.item.finisher}</div> : null}
            {(st.item.options || []).map((o) => <div key={o.id} className="pm" style={{ fontSize: 'calc(15px * var(--scale))' }}>▼ {o.title}</div>)}
            {st.item.note || missing.length ? <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--play-line)', color: 'var(--play-warn)', fontSize: 'calc(14px * var(--scale))' }}>{[st.item.note, missing.length ? `No ${missing.join(' or ')} at this studio` : ''].filter(Boolean).join(' · ')}</div> : null}
          </div>
        ) : null}
        {st.mv ? <button type="button" className="pm" style={{ background: 'none', border: 0, textDecoration: 'underline', minHeight: 44 }} aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Hide picture and cues' : 'Picture and cues'}</button> : null}
        {more && st.mv ? <div className="panel" style={{ alignSelf: 'stretch' }}><div style={{ background: 'var(--surface)', borderRadius: 10, padding: 6 }}><Frames mv={st.mv} width={150} /></div>{String(st.mv.cues || '').split('\n').map((c) => c.trim()).filter(Boolean).slice(0, 4).map((c, i) => <div key={i} style={{ marginTop: i ? 0 : 10 }}>· {c}</div>)}</div> : null}
        <div className="pm row" style={{ alignSelf: 'stretch' }}><span className="grow">{next ? `Next: ${next.item.pause ? next.item.label : next.mv!.name}` : 'Last block.'}</span>{next && !next.item.pause && next.mv!.apparatus === 'reformer' ? <span>{springText(next.loads, studio)}{next.changed ? ' · change' : ''}</span> : null}</div>
      </div>
      <div className="row" style={{ gap: 12, paddingTop: 12 }}>
        <button type="button" className="pbtn" aria-label="Previous block" disabled={at === 0} onClick={() => go(at - 1)}><Icon name="prev" size={20} fill /></button>
        <button type="button" className="pbtn main" onClick={() => setRunning(!running)}>{running ? 'Pause' : left === st.dur ? 'Start' : 'Resume'}</button>
        {last ? <button type="button" className="pbtn" style={{ padding: '0 16px' }} onClick={() => finish(true)}>Finish</button>
          : <button type="button" className="pbtn" aria-label="Next block" onClick={() => go(at + 1)}><Icon name="skip" size={20} fill /></button>}
      </div>
    </div>
  );
}

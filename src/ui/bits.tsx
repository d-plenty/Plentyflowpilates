// The small pieces every screen is built from.
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { figure, figureFrames, fitSprings, sectionOf, springFor } from '../engine';
import { sectionColour } from './sections';
import { createPortal } from 'react-dom';
import type { Movement, Studio } from '../lib/types';
import { isDirty, useDrafts } from '../lib/drafts';
import { getData } from '../lib/store';
import { nav, setGuard, setLeaveAsker, type Tab } from './nav';

const ICONS: Record<string, string> = {
  classes: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  calendar: 'M5 6h14v14H5zM5 10h14M9 3v4M15 3v4',
  library: 'M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  play: 'M7 5l12 7-12 7z',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  up: 'M6 15l6-6 6 6',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  order: 'M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4',
  down: 'M6 9l6 6 6-6',
  home: 'M4 11l8-7 8 7v9H4z',
  list: 'M4 6h16M4 12h16M4 18h10',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v8h14v-8',
  box: 'M4 7h16v12H4zM4 7l2-3h12l2 3M9 12h6',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM9 9h6M9 13h4',
  sync: 'M4 12a8 8 0 0 1 14-5l2-2v6h-6M20 12a8 8 0 0 1-14 5l-2 2v-6h6',
  server: 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01',
  people: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M17 11a3 3 0 1 0 0-6M22 20c0-3-2-4.5-4-5',
  screen: 'M3 5h18v11H3zM8 20h8M12 16v4',
  watch: 'M8 7h8v10H8zM9 7l1-4h4l1 4M9 17l1 4h4l1-4M12 10v2l1 1',
  widget: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  edit: 'M4 20h4l10-10-4-4L4 16zM13 7l4 4',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18h2',
  file: 'M7 3h7l4 4v14H7zM14 3v4h4',
  check: 'M5 12l5 5 9-10',
  prev: 'M18 5L8 12l10 7zM5 5h2v14H5z',
  skip: 'M6 5l10 7-10 7zM17 5h2v14h-2z',
  palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-.5-2 1-2h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  money: 'M3 6h18v12H3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M6 9v.01M18 15v.01',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  gift: 'M4 10h16v10H4zM2 7h20v3H2zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0',
  pin: 'M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11zM12 8v4',
  phone: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v5M12 8h.01',
};
export function Icon({ name, size = 20, fill }: { name: string; size?: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ''} />
    </svg>
  );
}

/** Where a screen sits: its tab, and how deep in that tab's stack (0 is the tab's first screen). */
export const Spot = createContext<{ tab: Tab; depth: number }>({ tab: 'classes', depth: 0 });

/**
 * A screen that edits something unsaved (lib/drafts.ts) says so here. Back, or leaving the tab,
 * then asks to save it or leave it behind. Returns whether there is anything unsaved.
 */
export function useEditing(key: string, what: string, save: () => boolean | Promise<boolean>): boolean {
  useDrafts();
  const at = useContext(Spot);
  const saveRef = useRef(save);
  saveRef.current = save;
  // Stays registered while screens are opened on top of this one (only the top one is drawn);
  // nav drops it when this screen is closed.
  useEffect(() => { setGuard(at.tab, at.depth, { key, what, save: () => saveRef.current() }); }, [at.tab, at.depth, key, what]);
  return isDirty(key);
}
/** Save, top right. Greyed out when there is nothing to save. */
export function SaveButton({ dirty, onSave, label = 'Save' }: { dirty: boolean; onSave: () => void; label?: string }) {
  return <button type="button" className={`btn sm${dirty ? ' p' : ''}`} disabled={!dirty} onClick={onSave} aria-label={dirty ? `${label}, there are unsaved changes` : `${label}, nothing to save`}>{dirty ? label : 'Saved'}</button>;
}

/** A small ⓘ that opens a short explanation, so screens stay short. */
export function Info({ text, label = 'More about this' }: { text: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="info-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>i</button>{open ? <div className="info-text" style={{ flexBasis: '100%' }} role="note">{text}</div> : null}</>;
}

export function Back({ label = 'Back' }: { label?: string }) {
  return <button type="button" className="back" onClick={() => nav.back()}><Icon name="back" size={18} />{label}</button>;
}

export function Screen({ top, children, foot, narrow }: { top: ReactNode; children: ReactNode; foot?: ReactNode; narrow?: boolean }) {
  return (
    <div className="screen">
      <div className="top"><div className={narrow ? 'narrow' : undefined}>{top}</div></div>
      <div className="body"><div className={`stack${narrow ? ' narrow' : ''}`}>{children}</div></div>
      {foot ? <div className="foot"><div className={`row grow${narrow ? ' narrow' : ''}`}>{foot}</div></div> : null}
    </div>
  );
}

export function Chips<T extends string>({ options, value, onPick, scroll }: { options: { id: T; label: string }[]; value: T | T[]; onPick: (id: T) => void; scroll?: boolean }) {
  const on = (id: T) => (Array.isArray(value) ? value.includes(id) : value === id);
  return (
    <div className={`chips${scroll ? ' scroll' : ''}`}>
      {options.map((o) => <button type="button" key={o.id} className={`chip${on(o.id) ? ' on' : ''}`} aria-pressed={on(o.id)} onClick={() => onPick(o.id)}>{o.label}</button>)}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`sw${on ? ' on' : ''}`} onClick={() => onChange(!on)} />;
}

/** Colours for the icons in Settings and More, so each kind of thing is easy to spot (Plenty blue and orange first). */
export const TONE = { blue: '#1F5E8C', orange: '#E07A26', teal: '#0F8A7E', sky: '#2E8FD0', purple: '#6B4FC8', pink: '#C8487E', green: '#3E8F3A', red: '#D2554A', grey: '#6B7A8A' } as const;
export type Tone = keyof typeof TONE;
export function Row({ icon, title, sub, right, onClick, soon, danger, words, tone }: { icon?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; soon?: boolean; danger?: boolean; words?: string; tone?: Tone }) {
  const inner = (
    <>
      {icon ? <span className={`ic${tone ? ' tone' : ''}`} style={tone ? { background: TONE[tone] } : undefined}><Icon name={icon} size={18} /></span> : null}
      <span className="grow"><b style={danger ? { color: 'var(--danger)' } : undefined}>{title}</b>{sub ? <div className={soon ? 'tiny' : 'm'} style={soon ? { color: 'inherit' } : undefined}>{sub}</div> : null}</span>
      {soon ? <span className="tag">Coming soon</span> : right !== undefined ? right : onClick ? <span style={{ color: 'var(--dim)', display: 'flex' }}><Icon name="next" size={18} /></span> : null}
    </>
  );
  if (onClick && !soon) return <button type="button" className="set" data-words={words} onClick={onClick}>{inner}</button>;
  return <div className={`set${soon ? ' soon' : ''}`} data-words={words} aria-disabled={soon || undefined}>{inner}</div>;
}

export function Stepper({ value, onChange, min = 0, max = 99, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <span className="step">
      <button type="button" className="btn icon" aria-label={`One less ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <b>{value}</b>
      <button type="button" className="btn icon" aria-label={`One more ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </span>
  );
}

/** A card that opens and closes. Not <details>: iPhones before iOS 17 can't lay out its heading,
 *  which pushed the arrow and the rows inside onto lines of their own. */
export function Fold({ title, sub, open: start = false, children, bodyClass = 'stack-sm' }: { title: string; sub?: ReactNode; open?: boolean; children: ReactNode; bodyClass?: string }) {
  const [open, setOpen] = useState(start);
  return (
    <section className={`card fold${open ? ' open' : ''}`}>
      <button type="button" className="fold-head" aria-expanded={open} onClick={() => setOpen(!open)}><b>{title}</b>{sub ? <span className="m">· {sub}</span> : null}<Icon name={open ? 'up' : 'down'} size={18} /></button>
      {open ? <div className={`fold-body ${bodyClass}`}>{children}</div> : null}
    </section>
  );
}

/** A sheet from the bottom of the screen (a centred box on an iPad). */
export function Sheet({ title, onClose, children, foot }: { title: string; onClose: () => void; children: ReactNode; foot?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  // Drawn on the page itself, not inside the scrolling screen: on iPhone a fixed box inside a
  // scrolling one can end up stuck in it (the 0.5.0 animation preview did).
  return createPortal(
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <div className="sheet-head"><h2>{title}</h2><button type="button" className="btn icon ghost" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="sheet-body">{children}</div>
        {foot ? <div className="foot" style={{ paddingBottom: 10 }}>{foot}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

// ---- messages at the bottom of the screen, and "are you sure?"
type ToastMsg = { text: string; action?: { label: string; run: () => void } };
let showToast: (t: ToastMsg | null) => void = () => {};
export function toast(text: string, action?: ToastMsg['action']) { showToast({ text, action }); }
type Choice = { id: string; label: string; kind?: 'p' | 'danger' | '' };
type Ask = { title: string; text?: string; choices: Choice[]; cancel?: string; resolve: (id: string | null) => void };
let showAsk: (a: Ask | null) => void = () => {};
export const confirmAsk = (title: string, text: string, yes: string, danger = false) => new Promise<boolean>((resolve) => showAsk({ title, text, choices: [{ id: 'yes', label: yes, kind: danger ? 'danger' : 'p' }], resolve: (id) => resolve(id === 'yes') }));
/** A question with more than one answer. Resolves to the id picked, or null for Cancel. */
export const chooseAsk = (title: string, text: string, choices: Choice[], cancel?: string) => new Promise<string | null>((resolve) => showAsk({ title, text, choices, cancel, resolve }));
// Leaving unsaved work (ui/nav.ts asks through this).
setLeaveAsker((what) => chooseAsk(`Save ${what}?`, 'You have changes that are not saved yet.', [{ id: 'leave', label: 'Leave without saving', kind: 'danger' }, { id: 'save', label: 'Save', kind: 'p' }]) as Promise<'save' | 'leave' | null>);

export function Overlays() {
  const [t, setT] = useState<ToastMsg | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  useEffect(() => { showToast = setT; showAsk = setAsk; return () => { showToast = () => {}; showAsk = () => {}; }; }, []);
  useEffect(() => { if (!t) return; const slow = getData().settings.a11y.slowMessages ? 3 : 1; const id = setTimeout(() => setT(null), (t.action ? 6000 : 3200) * slow); return () => clearTimeout(id); }, [t]);
  const answer = (id: string | null) => { ask?.resolve(id); setAsk(null); };
  return (
    <>
      {t ? <div className="toast" role="status"><span>{t.text}</span>{t.action ? <button type="button" onClick={() => { t.action!.run(); setT(null); }}>{t.action.label}</button> : null}</div> : null}
      {ask ? (
        <Sheet title={ask.title} onClose={() => answer(null)} foot={ask.choices.length > 1 ? undefined : <><button type="button" className="btn grow" onClick={() => answer(null)}>{ask.cancel || 'Cancel'}</button><button type="button" className={`btn grow ${ask.choices[0].kind || ''}`} onClick={() => answer(ask.choices[0].id)}>{ask.choices[0].label}</button></>}>
          {ask.text ? <p className="m">{ask.text}</p> : null}
          {ask.choices.length > 1 ? <div className="stack-sm">{[...ask.choices].reverse().map((c) => <button type="button" key={c.id} className={`btn wide ${c.kind || ''}`} onClick={() => answer(c.id)}>{c.label}</button>)}<button type="button" className="btn wide ghost" onClick={() => answer(null)}>{ask.cancel || 'Keep editing'}</button></div> : null}
        </Sheet>
      ) : null}
    </>
  );
}

// ---- the movement pictures (drawn by the engine as SVG elements)
function Svg({ make, deps }: { make: () => Element; deps: unknown[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const el = ref.current; if (!el) return; el.replaceChildren(make()); }, deps);
  return <span ref={ref} style={{ display: 'contents' }} />;
}
/** A movement's little picture, on a tint of its section's colour. */
/** A movement's little picture, tinted by its section. No movement: a clock (a timed line), or a pencil (written in your own words). */
export function Thumb({ mv, written }: { mv?: Movement; written?: boolean }) {
  const tint = mv ? ({ '--sec': sectionColour(sectionOf(mv) as string) } as CSSProperties) : undefined;
  return <span className={`fig${mv ? ' sec' : ''}${written && !mv ? ' written' : ''}`} style={tint}>{mv ? <Svg make={() => figure(mv, { width: 68, ghost: false })} deps={[mv.slug, mv.pose]} /> : <Icon name={written ? 'edit' : 'clock'} size={20} />}</span>;
}
/** The heading over one section of a movement list. */
export function SectionHead({ id, label, colour, count }: { id: string; label: string; colour: string; count: number }) {
  return <div className="sec-head" id={`sec-${id}`} style={{ '--sec': colour } as CSSProperties}><i aria-hidden="true" /><b>{label}</b><span>{count}</span></div>;
}
export function Frames({ mv, width = 170 }: { mv: Movement; width?: number }) {
  const frames = figureFrames(mv, { width }) as { svg: Element; label: string }[];
  return (
    <div className="frames">
      {frames.map((f, i) => <div className="frame" key={i}><Svg make={() => (figureFrames(mv, { width }) as { svg: Element }[])[i].svg} deps={[mv.slug, mv.pose, width, i]} /><div className="tiny">{f.label}</div></div>)}
    </div>
  );
}

// ---- springs, shown the way one studio's reformers have them
const NAMES: Record<number, string> = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };
export function springText(loads: string[] | undefined, studio: Studio): string {
  if (!loads || !loads.length) return 'No springs';
  const fitted = (fitSprings(loads, studio) as { loads: string[] }).loads;
  const counts = new Map<string, number>();
  for (const l of fitted) { const s = springFor(studio.brand, l, studio.springOverrides) as { name: string }; counts.set(s.name, (counts.get(s.name) || 0) + 1); }
  return [...counts.entries()].map(([name, n]) => `${NAMES[n] || n} ${name.toLowerCase()}`).join(' + ');
}
export function Springs({ loads, studio, label = true }: { loads?: string[]; studio: Studio; label?: boolean }) {
  if (!loads || !loads.length) return <span className="springs"><span className="lbl" style={{ marginLeft: 0 }}>No springs</span></span>;
  const fitted = fitSprings(loads, studio) as { loads: string[]; approx: boolean; short: boolean };
  return (
    <span className="springs" title={fitted.approx ? 'Nearest springs this studio has' : undefined}>
      {fitted.loads.map((l, i) => <span key={i} className="dot" style={{ background: (springFor(studio.brand, l, studio.springOverrides) as { color: string }).color }} />)}
      {label ? <span className="lbl">{springText(loads, studio)}{fitted.approx ? ' ≈' : ''}</span> : null}
    </span>
  );
}

/** "Springs ● ● ●": the word, then a dot per spring in its colour. With a second option (beginner /
 *  intermediate) both show: "Springs ● / ● ●". */
export function SpringLine({ loads, alt, studio }: { loads?: string[]; alt?: string[]; studio: Studio }) {
  if (!loads?.length && !alt?.length) return null;
  return (
    <span className="spring-line"><span className="sl-word">Springs</span>
      {loads?.length ? <Springs loads={loads} studio={studio} label={false} /> : <span className="m">none</span>}
      {alt?.length ? <><span className="sl-or" aria-label="or">/</span><Springs loads={alt} studio={studio} label={false} /></> : null}
    </span>
  );
}

export const Empty = ({ title, text, children }: { title: string; text?: string; children?: ReactNode }) => <div className="empty"><b>{title}</b>{text ? <p>{text}</p> : null}{children ? <div style={{ marginTop: 14 }}>{children}</div> : null}</div>;
/** A labelled box. `error`: the box goes red with one short line under it, as in Restock. */
export const Field = ({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) => <label className={`field${error ? ' bad' : ''}`}><span>{label}</span>{children}{error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="tiny" style={{ fontWeight: 400 }}>{hint}</span> : null}</label>;
/** After a failed save: bring the first red box into view and put the cursor in it. */
export function showProblem(): void {
  requestAnimationFrame(() => {
    const f = document.querySelector('.field.bad');
    if (!f) return;
    f.scrollIntoView({ block: 'center', behavior: 'smooth' });
    (f.querySelector('input, select, textarea') as HTMLElement | null)?.focus({ preventScroll: true });
  });
}
/** A star to make something a favourite. */
export function Star({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return <button type="button" className={`btn icon ghost star${on ? ' on' : ''}`} aria-pressed={on} aria-label={on ? `Take ${label} out of favourites` : `Make ${label} a favourite`} onClick={(e) => { e.stopPropagation(); onChange(!on); }}><Icon name="star" size={20} fill={on} /></button>;
}
/** A titled group of rows, as in Restock's Settings. */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return <section className="group">{title ? <div className="lab">{title}</div> : null}<div className="card flush">{children}</div></section>;
}
/**
 * A search box that hides the rows (and empty groups) on the screen that don't match, as in
 * Restock's Settings. Rows are found by `.set` inside `.group`; extra words to match go in data-words.
 */
export function RowSearch({ placeholder = 'Search' }: { placeholder?: string }) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const body = ref.current?.closest('.screen');
    if (!body) return;
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    body.querySelectorAll<HTMLElement>('.group').forEach((g) => {
      let any = false;
      g.querySelectorAll<HTMLElement>('.set').forEach((r) => {
        const text = `${r.textContent || ''} ${r.dataset.words || ''}`.toLowerCase();
        const hit = words.every((w) => text.includes(w));
        r.style.display = hit ? '' : 'none';
        if (hit) { any = true; shown++; }
      });
      g.style.display = any ? '' : 'none';
    });
    const none = body.querySelector<HTMLElement>('.no-match');
    if (none) none.style.display = words.length && !shown ? '' : 'none';
  }, [q]);
  return <><input ref={ref} type="search" placeholder={placeholder} aria-label={placeholder} value={q} onChange={(e) => setQ(e.target.value)} /><p className="m no-match" style={{ display: 'none', textAlign: 'center' }}>Nothing matches “{q}”.</p></>;
}

export const fmtClock = (sec: number) => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export function parseClock(v: string, min = 10, max = 1800): number | null {
  const m = String(v).trim().match(/^(\d{1,3})(?::(\d{1,2}))?$/);
  if (!m) return null;
  const sec = m[2] != null ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1]) * 60;
  return sec >= min && sec <= max ? sec : null;
}
/** A time box: type 4:20 or 4, and it is kept when you leave the box. */
export function ClockInput({ seconds, onChange, label, min, max }: { seconds: number; onChange: (s: number) => void; label: string; min?: number; max?: number }) {
  const [text, setText] = useState(fmtClock(seconds));
  useEffect(() => setText(fmtClock(seconds)), [seconds]);
  return <input type="text" inputMode="numeric" className="short" aria-label={label} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => { const s = parseClock(text, min, max); if (s) onChange(s); else setText(fmtClock(seconds)); }} />;
}

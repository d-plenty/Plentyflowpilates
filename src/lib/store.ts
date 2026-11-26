// Everything the app knows, in memory, with one way to change it. Each change is written to the
// device a moment later. Nothing here talks to a network.
import { useSyncExternalStore } from 'react';
import { ownedProps } from './props';
import { analyze, applyStudioLists, fitSprings, flowTiming } from '../engine';
import { blankSetup, cleanData, emptyData, nowIso, uid } from './clean';
import { LIBRARY, LIBRARY_SERIES } from './library';
import { stampChanges } from './sync';
import { loadText, noteLoaded, saveText } from './storage';
import type { ClassPlan, Data, Movement, Series, Setup, Studio } from './types';

let data: Data = emptyData();
let version = 0;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saveProblem = '';
let appliedSetup: Setup | null = null;

const notify = () => { version++; listeners.forEach((l) => l()); };
/**
 * The engine keeps its lists (levels, focuses, muscles, props, parts of the class, timing) in one
 * place, so they are switched to the studio being looked at before anything reads them. Each
 * screen does this for its studio as it draws (useStudio in the UI).
 */
export function applySetup(setup: Setup): void {
  if (appliedSetup === setup) return;
  applyStudioLists(setup);
  appliedSetup = setup;
}
const followSetup = () => { const s = studioOf(data.settings.usualStudio); applySetup(s.setup); };

export const getData = () => data;
export const saveError = () => saveProblem;

export async function boot(): Promise<void> {
  const { text, previous } = await loadText();
  let loaded: Data | null = null;
  for (const t of [text, previous]) {
    if (!t) continue;
    try { loaded = cleanData(JSON.parse(t)); break; } catch { /* try the copy from before */ }
  }
  data = loaded || emptyData();
  noteLoaded(text);
  followSetup();
  notify();
}

export function flushSave(): Promise<void> {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  return saveText(JSON.stringify(data)).then(() => { saveProblem = ''; }, (e: unknown) => { saveProblem = e instanceof Error ? e.message : 'Could not save.'; notify(); });
}
const scheduleSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => void flushSave(), 500); };

/** Change what the app keeps. `fn` gets a shallow copy: replace the parts that change, don't edit them in place. */
export function update(fn: (d: Data) => void): void {
  const next = { ...data };
  fn(next);
  stampChanges(data, next, nowIso());
  data = next;
  followSetup();
  notify();
  scheduleSave();
}
/** Swap in a whole new set of data: a restore, or what a sync brought in (which carries its own stamps). */
export function replaceAll(next: Data): void {
  data = next;
  cache = null;
  followSetup();
  notify();
  scheduleSave();
}

export function useData(): Data {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version);
  return data;
}

// ---- movements: the library with this device's own on top
interface Lib { map: Record<string, Movement>; list: Movement[]; removed: Movement[]; series: Series[]; key: unknown[] }
let cache: Lib | null = null;
export function library(): Lib {
  const key = [data.movements, data.hidden, data.shown, data.series, data.hiddenSeries];
  if (cache && cache.key.every((k, i) => k === key[i])) return cache;
  const map: Record<string, Movement> = {};
  for (const m of LIBRARY) map[m.slug] = m;
  for (const m of Object.values(data.movements)) map[m.slug] = { ...m, source: 'mine' };
  const hide = new Set(data.hidden);
  const show = new Set(data.shown);
  for (const slug of Object.keys(map)) {
    const m = map[slug];
    if (hide.has(slug) || (m.retired && !show.has(slug))) map[slug] = { ...m, hidden: true };
  }
  const all = Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  const hs = new Set(data.hiddenSeries);
  const mine = new Set(data.series.map((s) => s.slug));
  const series = [...LIBRARY_SERIES.filter((s) => !mine.has(s.slug)), ...data.series].filter((s) => !hs.has(s.slug)).sort((a, b) => a.name.localeCompare(b.name));
  cache = { map, list: all.filter((m) => !m.hidden), removed: all.filter((m) => m.hidden), series, key };
  return cache;
}
export const isLibrary = (slug: string) => LIBRARY.some((m) => m.slug === slug);
export const libraryVersion = (slug: string) => LIBRARY.find((m) => m.slug === slug);

// ---- studios
export const NO_STUDIO: Studio = { id: '', name: 'No studio yet', hasReformers: true, brand: 'balanced_body', reformers: 0, springs: {}, springOverrides: {}, props: {}, setup: blankSetup(), updatedAt: '' };
export function studioOf(id?: string): Studio {
  return data.studios.find((s) => s.id === id) || data.studios.find((s) => s.id === data.settings.usualStudio) || data.studios[0] || NO_STUDIO;
}
export const usualStudio = () => studioOf(data.settings.usualStudio);
/** The studio settings the engine's checks read: this studio's props and class set-up. */
/** The studio as the engine sees it: props counted the studio's way (sizes, merged props). */
export const engineStudio = (s: Studio) => ({ props: ownedProps(s), targets: s.setup.targets, timing: s.setup.timing, classTypes: s.setup.classTypes, timingRows: s.setup.timingRows });
export const timingFor = (plan: ClassPlan, studio = studioOf(plan.studioId)) => flowTiming({ timing: studio.setup.timing, classTypes: studio.setup.classTypes }, plan) as Record<string, number>;

/**
 * The library as one studio's reformers see it: every spring setting moved to the nearest spring
 * the studio has. The checks, drafts, spring changes and Play all work from this, so what they
 * count is what the instructor will actually change at that studio.
 */
const fittedCache = new WeakMap<Studio, { lib: Lib; map: Record<string, Movement> }>();
export function fittedLibrary(studio: Studio): Record<string, Movement> {
  const lib = library();
  const had = fittedCache.get(studio);
  if (had && had.lib === lib) return had.map;
  const fit = (l?: string[]) => (l && l.length ? (fitSprings(l, studio) as { loads: string[] }).loads : l);
  const map: Record<string, Movement> = {};
  for (const [slug, m] of Object.entries(lib.map)) {
    if (m.apparatus !== 'reformer' || !m.load || !studio.id || !studio.hasReformers) { map[slug] = m; continue; }
    map[slug] = { ...m, load: { ...m.load, springs: fit(m.load.springs), ...(m.load.advance ? { advance: fit(m.load.advance) } : {}) },
      ...(m.variations ? { variations: m.variations.map((v) => (v && typeof v === 'object' && Array.isArray(v.springs) ? { ...v, springs: fit(v.springs as string[]) } : v)) } : {}) };
  }
  fittedCache.set(studio, { lib, map });
  return map;
}
/** A class's own spring settings moved to what the studio has, too. */
export function fittedPlan(plan: ClassPlan, studio: Studio): ClassPlan {
  if (!studio.id || !studio.hasReformers) return plan;
  const fit = (l: string[]) => (fitSprings(l, studio) as { loads: string[] }).loads;
  return { ...plan, segments: plan.segments.map((s) => ({ ...s, items: s.items.map((i) => (i.load?.springs?.length ? { ...i, load: { springs: fit(i.load.springs) } } : i)) })) };
}
export const analyse = (plan: ClassPlan, studio: Studio) => { applySetup(studio.setup); return analyze({ flow: fittedPlan(plan, studio), movements: fittedLibrary(studio), studio: engineStudio(studio), clients: [] }); };

// ---- classes
export function saveClass(plan: ClassPlan): void {
  countSave();
  const next = { ...plan, updatedAt: nowIso() };
  update((d) => { d.classes = d.classes.some((c) => c.id === plan.id) ? d.classes.map((c) => (c.id === plan.id ? next : c)) : [next, ...d.classes]; });
}
export const classOf = (id: string) => data.classes.find((c) => c.id === id);
export function setFav(id: string, fav: boolean): void {
  update((d) => { d.classes = d.classes.map((c) => { if (c.id !== id) return c; const { fav: _, ...rest } = c; return fav ? { ...rest, fav: true } : rest; }); });
}
export const isFavMove = (slug: string) => data.favMoves.includes(slug);
export function setFavMove(slug: string, fav: boolean): void { update((d) => { d.favMoves = fav ? [...new Set([...d.favMoves, slug])] : d.favMoves.filter((x) => x !== slug); }); }
export function removeClass(id: string): void { update((d) => { d.classes = d.classes.filter((c) => c.id !== id); }); }
export function duplicateClass(id: string): ClassPlan | undefined {
  const c = classOf(id);
  if (!c) return undefined;
  const copy: ClassPlan = { ...structuredClone(c), id: uid('c'), title: `${c.title} (copy)`, createdAt: nowIso(), updatedAt: nowIso() };
  delete copy.fav;
  delete copy.from;
  update((d) => { d.classes = [copy, ...d.classes]; });
  return copy;
}
/** A flow was taught: from Play, or marked on the calendar (then `where` names the class on the calendar). */
export function logTaught(plan: ClassPlan, studio: Studio, minutes: number, where?: { shiftId: string; slotId: string }, at = nowIso()): void {
  update((d) => {
    const already = where ? d.taught.find((t) => t.slotId === where.slotId) : undefined;
    const entry = { id: already?.id || uid('t'), classId: plan.id, title: plan.title, at, ...(studio.id ? { studioId: studio.id } : {}), studioName: studio.name, minutes, ...(where || {}) };
    d.taught = [entry, ...d.taught.filter((t) => t.id !== entry.id)].sort((a, b) => b.at.localeCompare(a.at));
  });
}
export function unlogTaught(slotId: string): void { update((d) => { d.taught = d.taught.filter((t) => t.slotId !== slotId); }); }
export const lastTaught = (classId: string) => data.taught.find((t) => t.classId === classId);

export function saveStudio(s: Studio): void {
  countSave();
  const next = { ...s, updatedAt: nowIso() };
  update((d) => {
    d.studios = d.studios.some((x) => x.id === s.id) ? d.studios.map((x) => (x.id === s.id ? next : x)) : [...d.studios, next];
    if (!d.settings.usualStudio || !d.studios.some((x) => x.id === d.settings.usualStudio)) d.settings = { ...d.settings, usualStudio: d.studios[0]?.id };
  });
}
export function removeStudio(id: string): void {
  update((d) => {
    d.studios = d.studios.filter((x) => x.id !== id);
    if (d.settings.usualStudio === id) d.settings = { ...d.settings, usualStudio: d.studios[0]?.id };
  });
}
export const setSettings = (patch: Partial<Data['settings']>) => update((d) => { d.settings = { ...d.settings, ...patch }; });
/** Change one studio's class set-up straight away (adding a prop or focus from inside a class, when asked to). */
export function changeStudio(id: string, fn: (s: Studio) => void): void {
  const s = data.studios.find((x) => x.id === id);
  if (!s) return;
  const next = structuredClone(s);
  fn(next);
  saveStudio(next);
}
export const noteOf = (slug: string) => data.notes[slug] || '';
export function setNote(slug: string, text: string): void { update((d) => { const n = { ...d.notes }; if (text.trim()) n[slug] = text.slice(0, 2000); else delete n[slug]; d.notes = n; }); }

export function saveMovement(mv: Movement): void { countSave(); update((d) => { d.movements = { ...d.movements, [mv.slug]: { ...mv, source: 'mine' } }; }); }
/** Puts a changed built-in movement back to how it ships, or deletes one made on this device. */
export function dropMovement(slug: string): void { update((d) => { const m = { ...d.movements }; delete m[slug]; d.movements = m; }); }
export function setHidden(slug: string, hidden: boolean): void {
  const retired = !!libraryVersion(slug)?.retired;
  update((d) => {
    d.hidden = hidden && !retired ? [...new Set([...d.hidden, slug])] : d.hidden.filter((x) => x !== slug);
    d.shown = !hidden && retired ? [...new Set([...d.shown, slug])] : d.shown.filter((x) => x !== slug);
  });
}
export function saveSeries(s: Series): void { countSave(); update((d) => { d.series = [...d.series.filter((x) => x.slug !== s.slug), { ...s, source: 'mine' }]; d.hiddenSeries = d.hiddenSeries.filter((x) => x !== s.slug); }); }
export function removeSeries(slug: string): void {
  update((d) => {
    d.series = d.series.filter((x) => x.slug !== slug);
    if (LIBRARY_SERIES.some((x) => x.slug === slug)) d.hiddenSeries = [...new Set([...d.hiddenSeries, slug])];
  });
}

/** For the tests: start again from nothing, without touching the device. */
export function _reset(next: Data = emptyData()): void { data = next; cache = null; appliedSetup = null; followSetup(); version++; }

// ---- the reminder to keep a copy of a backup somewhere off this device (as in Restock)
function countSave(): void { data = { ...data, settings: { ...data.settings, savesSinceCopy: (data.settings.savesSinceCopy || 0) + 1 } }; }
/** A backup was saved somewhere off the device. */
export function noteCopied(): void { update((d) => { d.settings = { ...d.settings, lastCopy: nowIso(), savesSinceCopy: 0 }; delete d.settings.nudgeAfter; }); }
/** Put the reminder off for a few days. */
export function snoozeNudge(days = 3): void { update((d) => { d.settings = { ...d.settings, nudgeAfter: new Date(Date.now() + days * 864e5).toISOString() }; }); }
/** Whether to remind about a backup, and why. Never before there is real work to lose. */
export function backupNudge(now = Date.now()): null | 'first' | 'lots' | 'old' {
  const s = data.settings;
  if (!data.classes.length && !data.studios.length) return null;
  if (s.nudgeAfter && Date.parse(s.nudgeAfter) > now) return null;
  const n = s.savesSinceCopy || 0;
  if (!s.lastCopy) return n >= 5 ? 'first' : null;
  if (n >= 20) return 'lots';
  if (n >= 1 && now - Date.parse(s.lastCopy) > 14 * 864e5) return 'old';
  return null;
}

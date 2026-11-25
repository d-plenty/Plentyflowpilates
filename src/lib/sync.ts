// Syncing between your own devices. Every flow, studio, shift, saved shift, movement, series, note
// and list has a key; the store stamps a key each time what it holds changes, and remembers when a
// key was deleted. Two devices then swap what they have and each keeps, key by key, whichever is
// newest. Deleting syncs too. Nothing else is needed to merge, and neither device is ever wiped:
// both end up holding everything.
//
// What doesn't sync: settings (each device keeps its own look, name and reminders) and this device's
// own pairing details.
import type { Data } from './types';

type Keyed = Map<string, unknown>;

const LISTS = ['hidden', 'shown', 'hiddenSeries', 'favMoves'] as const;

/** Everything that syncs, by key. */
export function keyed(d: Data): Keyed {
  const m: Keyed = new Map();
  for (const x of d.classes) m.set('c:' + x.id, x);
  for (const x of d.studios) m.set('s:' + x.id, x);
  for (const x of d.shifts) m.set('sh:' + x.id, x);
  for (const x of d.shiftTemplates) m.set('tp:' + x.id, x);
  for (const x of d.taught) m.set('t:' + x.id, x);
  for (const x of d.series) m.set('se:' + x.slug, x);
  for (const [k, v] of Object.entries(d.movements)) m.set('m:' + k, v);
  for (const [k, v] of Object.entries(d.notes)) m.set('n:' + k, v);
  for (const l of LISTS) m.set('L:' + l, d[l]);
  return m;
}

/** After a change: stamp what changed, and note what went. Unchanged things keep the same object, so this is cheap. */
export function stampChanges(before: Data, after: Data, at: string): void {
  const a = keyed(before), b = keyed(after);
  let stamps: Record<string, string> | null = null, gone: Record<string, string> | null = null;
  for (const [k, v] of b) {
    if (a.get(k) === v) continue;
    if (a.has(k) && JSON.stringify(a.get(k)) === JSON.stringify(v)) continue;
    (stamps ??= { ...after.stamps })[k] = at;
    if (after.gone[k]) { gone ??= { ...after.gone }; delete gone[k]; }
  }
  for (const k of a.keys()) if (!b.has(k)) { (gone ??= { ...after.gone })[k] = at; if (stamps?.[k] || after.stamps[k]) { stamps ??= { ...after.stamps }; delete stamps[k]; } }
  if (stamps) after.stamps = stamps;
  if (gone) after.gone = gone;
}

/** What one device sends another. */
export interface SyncPack { v: 1; from: { id: string; name: string }; at: string; items: Record<string, unknown>; stamps: Record<string, string>; gone: Record<string, string> }
export function packOf(d: Data, name: string, at: string): SyncPack {
  return { v: 1, from: { id: d.device.id, name }, at, items: Object.fromEntries(keyed(d)), stamps: d.stamps, gone: d.gone };
}

/**
 * The two put together. For each key the newest change wins: a newer edit beats an older delete
 * and the other way round. A key with no stamp at all (made before syncing existed) counts as old.
 * `clean` checks each incoming thing the way a backup is checked.
 */
export function merge(mine: Data, theirs: SyncPack, clean: (key: string, v: unknown) => unknown | null): { data: Data; changed: number } {
  const have = keyed(mine);
  const stamps = { ...mine.stamps };
  const gone = { ...mine.gone };
  const out = new Map(have);
  let changed = 0;
  const keys = new Set([...have.keys(), ...Object.keys(theirs.items), ...Object.keys(theirs.gone)]);
  for (const k of keys) {
    const myAt = stamps[k] || (have.has(k) ? '0' : ''), myGone = gone[k] || '';
    const theirAt = theirs.stamps[k] || (k in theirs.items ? '0' : ''), theirGone = theirs.gone[k] || '';
    const mineBest = myAt > myGone ? { at: myAt, live: true } : { at: myGone, live: false };
    const theirBest = theirAt > theirGone ? { at: theirAt, live: true } : { at: theirGone, live: false };
    if (theirBest.at <= mineBest.at) continue;
    if (theirBest.live) {
      const v = clean(k, theirs.items[k]);
      if (v == null) continue;
      if (JSON.stringify(out.get(k)) !== JSON.stringify(v)) changed++;
      out.set(k, v);
      stamps[k] = theirBest.at;
      delete gone[k];
    } else {
      if (out.delete(k)) changed++;
      gone[k] = theirBest.at;
      delete stamps[k];
    }
  }
  const pick = <T>(prefix: string) => [...out.entries()].filter(([k]) => k.startsWith(prefix)).map(([, v]) => v as T);
  const map = <T>(prefix: string) => Object.fromEntries([...out.entries()].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v as T]));
  const data: Data = {
    ...mine,
    classes: pick('c:'), studios: pick('s:'), shifts: pick('sh:'), shiftTemplates: pick('tp:'), taught: pick<Data['taught'][number]>('t:').sort((a, b) => b.at.localeCompare(a.at)),
    series: pick('se:'), movements: map('m:'), notes: map('n:'),
    hidden: (out.get('L:hidden') as string[]) || [], shown: (out.get('L:shown') as string[]) || [], hiddenSeries: (out.get('L:hiddenSeries') as string[]) || [], favMoves: (out.get('L:favMoves') as string[]) || [],
    stamps, gone,
  };
  // Deletions older than a year are forgotten: by then every device has had its chance to hear of them.
  const year = new Date(Date.parse(theirs.at) - 366 * 864e5).toISOString();
  for (const [k, v] of Object.entries(data.gone)) if (v < year) delete data.gone[k];
  return { data, changed };
}

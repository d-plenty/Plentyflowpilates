// Unsaved work. Whatever is being edited (a class, a studio, the settings, a movement) is a copy
// kept here until Save. Leaving it asks first (see ui/nav.ts). Kept in memory only: closing the
// app leaves unsaved work behind, as in Restock.
import { useSyncExternalStore } from 'react';

interface Draft<T> { base: T | null; value: T; past: T[]; future: T[]; typedAt: number }
const drafts = new Map<string, Draft<unknown>>();
let version = 0;
const listeners = new Set<() => void>();
const ping = () => { version++; listeners.forEach((l) => l()); };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Redraw when any unsaved work changes. */
export function useDrafts(): number {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version);
}

export const hasDraft = (key: string) => drafts.has(key);
export const draftOf = <T>(key: string): T | undefined => drafts.get(key)?.value as T | undefined;

/** Start editing `base` (null for something new, given as `start`). An edit already under way is kept. */
export function openDraft<T>(key: string, base: T | null, start?: T): T {
  const had = drafts.get(key) as Draft<T> | undefined;
  if (had) return had.value;
  const value = structuredClone((start ?? base) as T);
  drafts.set(key, { base: base == null ? null : structuredClone(base), value, past: [], future: [], typedAt: 0 });
  return value;
}

/** Change unsaved work. `fn` gets a copy to edit. A run of typing counts as one step for undo. */
export function editDraft<T>(key: string, fn: (v: T) => void, typing = false): void {
  const d = drafts.get(key) as Draft<T> | undefined;
  if (!d) return;
  const next = structuredClone(d.value);
  fn(next);
  if (same(next, d.value)) return;
  const now = Date.now();
  if (!(typing && d.typedAt && now - d.typedAt < 1500 && d.past.length)) { d.past.push(d.value); if (d.past.length > 80) d.past.shift(); }
  d.typedAt = typing ? now : 0;
  d.future = [];
  d.value = next;
  ping();
}
export function undoDraft(key: string): boolean {
  const d = drafts.get(key);
  const prev = d?.past.pop();
  if (!d || prev === undefined) return false;
  d.future.push(d.value); d.value = prev; d.typedAt = 0; ping();
  return true;
}
export function redoDraft(key: string): boolean {
  const d = drafts.get(key);
  const next = d?.future.pop();
  if (!d || next === undefined) return false;
  d.past.push(d.value); d.value = next; d.typedAt = 0; ping();
  return true;
}
export const canUndoDraft = (key: string) => !!drafts.get(key)?.past.length;
export const canRedoDraft = (key: string) => !!drafts.get(key)?.future.length;

/** Something new, or changed since it was opened or last saved. */
export function isDirty(key: string): boolean {
  const d = drafts.get(key);
  return !!d && (d.base === null || !same(d.base, d.value));
}
/** After Save: what was saved is the new starting point. Undo still steps back through the edits. */
export function markSaved(key: string, saved?: unknown): void {
  const d = drafts.get(key);
  if (!d) return;
  if (saved !== undefined) d.value = structuredClone(saved);
  d.base = structuredClone(d.value);
  ping();
}
/** Stop editing: unsaved changes are dropped. */
export function closeDraft(key: string): void {
  if (drafts.delete(key)) ping();
}
export function closeAllDrafts(): void { drafts.clear(); ping(); }

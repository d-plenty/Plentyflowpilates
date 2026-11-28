// Where the person is in the app: a tab, and the screens opened on top of it. Going back always
// returns to exactly the screen before, as it was left.
import { useSyncExternalStore } from 'react';
import { closeDraft, isDirty } from '../lib/drafts';

export type Tab = 'home' | 'classes' | 'calendar' | 'library' | 'more';
export interface Route { name: string; id?: string; [k: string]: unknown }

/** Playing a flow; `shiftId`/`slotId` when it was started from that class on the calendar. */
export interface Playing { classId: string; studioId: string; shiftId?: string; slotId?: string }
interface NavState { tab: Tab; stacks: Record<Tab, Route[]>; play?: Playing }
const fresh = (): NavState => ({ tab: 'home', stacks: { home: [], classes: [], calendar: [], library: [], more: [] } });
let state: NavState = fresh();
const listeners = new Set<() => void>();
const set = (next: NavState) => { state = next; listeners.forEach((l) => l()); };

/** A screen that edits something registers how to save it. Leaving it with unsaved changes asks first. */
export interface Guard { key: string; what: string; save: () => boolean | Promise<boolean> }
const guards = new Map<string, Guard>();
const spot = (tab: Tab, depth: number) => `${tab}:${depth}`;
export function setGuard(tab: Tab, depth: number, g: Guard | null): void { if (g) guards.set(spot(tab, depth), g); else guards.delete(spot(tab, depth)); }
type Answer = 'save' | 'leave' | null;
let asker: (what: string) => Promise<Answer> = async () => 'leave';
export function setLeaveAsker(fn: (what: string) => Promise<Answer>): void { asker = fn; }

/** Before screens close: for each one editing something unsaved (that no screen staying open also edits), ask. */
async function mayLeave(closing: { tab: Tab; depth: number }[], staying: { tab: Tab; depth: number }[]): Promise<boolean> {
  const kept = new Set(staying.map((s) => guards.get(spot(s.tab, s.depth))?.key).filter(Boolean));
  const asked = new Set<string>();
  for (const c of [...closing].reverse()) {
    const g = guards.get(spot(c.tab, c.depth));
    if (!g || kept.has(g.key) || asked.has(g.key)) continue;
    asked.add(g.key);
    if (isDirty(g.key)) {
      const a = await asker(g.what);
      if (!a) return false;
      if (a === 'save' && !(await g.save())) return false;
    }
    closeDraft(g.key);
  }
  return true;
}
const depths = (tab: Tab, from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, i) => ({ tab, depth: from + i + 1 }));
const TABS: Tab[] = ['home', 'classes', 'calendar', 'library', 'more'];
/** Only the top screen is drawn, so a screen's guard stays registered until the screen is closed. */
const dropGuards = (tab: Tab, fromDepth: number) => { for (let i = fromDepth; i <= 40; i++) guards.delete(spot(tab, i)); };

/** On an iPad, a tap in a list shown beside a page opens the new page in place of that one. */
let listKeep: number | null = null;
export const fromList = (keep: number | null) => { listKeep = keep; if (keep !== null) setTimeout(() => { listKeep = null; }, 0); };

export const nav = {
  get: () => state,
  /** Open a screen on top of the current tab. */
  go(route: Route, tab: Tab = state.tab) {
    const keep = listKeep;
    listKeep = null;
    const s = state.stacks[tab];
    if (keep !== null && tab === state.tab && s.length > keep) {
      void (async () => {
        if (!(await mayLeave(depths(tab, keep, s.length), depths(tab, 0, keep)))) return;
        dropGuards(tab, keep + 1);
        set({ ...state, stacks: { ...state.stacks, [tab]: [...state.stacks[tab].slice(0, keep), route] } });
      })();
      return;
    }
    set({ ...state, tab, stacks: { ...state.stacks, [tab]: [...s, route] } });
  },
  /** Replace the screen on top (after making something new, so back doesn't return to the form). */
  swap(route: Route) { const s = state.stacks[state.tab]; dropGuards(state.tab, s.length); set({ ...state, stacks: { ...state.stacks, [state.tab]: [...s.slice(0, -1), route] } }); },
  async back(): Promise<void> {
    const s = state.stacks[state.tab];
    if (!s.length || !(await mayLeave(depths(state.tab, s.length - 1, s.length), depths(state.tab, 0, s.length - 1)))) return;
    const now = state.stacks[state.tab];
    dropGuards(state.tab, now.length);
    set({ ...state, stacks: { ...state.stacks, [state.tab]: now.slice(0, -1) } });
  },
  /** Back without asking, after the screen has saved or deleted what it was editing. */
  backNow() { const s = state.stacks[state.tab]; dropGuards(state.tab, s.length); if (s.length) set({ ...state, stacks: { ...state.stacks, [state.tab]: s.slice(0, -1) } }); },
  /** Tapping the tab you are on goes back to its first screen. */
  async tab(tab: Tab): Promise<void> {
    if (tab !== state.tab) { set({ ...state, tab }); return; }
    await nav.home(tab);
  },
  async home(tab: Tab): Promise<void> {
    const n = state.stacks[tab].length;
    if (!(await mayLeave(depths(tab, 0, n), []))) return;
    dropGuards(tab, 1);
    set({ ...state, tab, stacks: { ...state.stacks, [tab]: [] } });
  },
  play(classId: string, studioId: string, where?: { shiftId: string; slotId: string }) { set({ ...state, play: { classId, studioId, ...(where || {}) } }); },
  stopPlay() { set({ ...state, play: undefined }); },
  reset() { for (const t of TABS) dropGuards(t, 0); set(fresh()); },
};

export function useNav(): NavState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}

// What a screen was showing (a search, a filter), kept while the app is open so coming back finds it.
const views = new Map<string, unknown>();
export function viewState<T extends object>(key: string, defaults: T): T {
  if (!views.has(key)) views.set(key, { ...defaults });
  return views.get(key) as T;
}

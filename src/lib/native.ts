// The app's own native side on iPhone and iPad (ios/App/App/PlentyFlowApple.swift): keeping the
// screen awake while a class plays, the Wi-Fi (sending a flow, syncing your devices), and the
// iPhone's Calendar app, and the app icon.
// Everything that uses it asks appleHere() first and carries on without it (a web browser).
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { iconSetName } from './appicon';

export interface ApplePlugin {
  info(): Promise<{ version: number; pad: boolean; system: string; name?: string }>;
  keepAwake(o: { on: boolean }): Promise<void>;
  lanInfo(): Promise<{ ip?: string }>;
  lanDial(o: { host: string; port: number; timeoutMs?: number }): Promise<{ id: string }>;
  lanAsk(o: { id: string; data: string; timeoutMs?: number }): Promise<{ data: string }>;
  lanClose(o: { id: string }): Promise<void>;
  lanListen(o: { key: string; port?: number }): Promise<{ port: number }>;
  lanReply(o: { conn: string; data?: string }): Promise<void>;
  lanStop(o: { key: string }): Promise<void>;
  lanAdvertise(o: { key: string; name: string; type?: string; txt?: Record<string, string> }): Promise<void>;
  lanUnadvertise(o: { key: string }): Promise<void>;
  lanBrowse(o: { type?: string; ms?: number }): Promise<{ found: { name: string; host: string; port: number; txt: Record<string, string> }[] }>;
  calendarAccess(): Promise<{ granted: boolean }>;
  calendarSync(o: { events: { title: string; start: string; end: string; notes?: string; location?: string }[] }): Promise<{ added: number }>;
  calendarRemove(): Promise<void>;
  appIcon(): Promise<{ can: boolean; name: string }>;
  setAppIcon(o: { name: string }): Promise<{ name: string }>;
  addListener(event: string, handler: (data: never) => void): Promise<PluginListenerHandle>;
}

export const Apple = registerPlugin<ApplePlugin>('PlentyFlowApple');
export const appleHere = (): boolean => Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('PlentyFlowApple');

let wakeLock: { release(): Promise<void> } | null = null;
/** Keeps the screen on (Play), on the device or in a browser that can. */
export async function keepAwake(on: boolean): Promise<void> {
  try {
    if (appleHere()) { await Apple.keepAwake({ on }); return; }
    const nav = navigator as Navigator & { wakeLock?: { request(kind: 'screen'): Promise<{ release(): Promise<void> }> } };
    if (on && nav.wakeLock && !wakeLock) wakeLock = await nav.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch {
    /* the screen may sleep: not worth stopping a class for */
  }
}

/** The app icon showing now (an id from lib/appicon.ts, '' for the app's own), or null where it
 *  can't be changed (a web browser, or a device that can't). */
export async function currentIcon(): Promise<string | null> {
  if (!appleHere()) return null;
  try {
    const r = await Apple.appIcon();
    return r.can ? r.name.replace(/^AppIcon-/, '') : null;
  } catch {
    return null; // an older native side without the icon methods
  }
}
/** Switches the app icon; iOS shows its own message each time. Gives back the icon now showing. */
export async function switchIcon(id: string): Promise<string> {
  const r = await Apple.setAppIcon({ name: iconSetName(id) || '' });
  return r.name.replace(/^AppIcon-/, '');
}

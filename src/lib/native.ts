// The app's own native side on iPhone and iPad (ios/App/App/PlentyFlowApple.swift): keeping the
// screen awake while a class plays, and the Wi-Fi for sending a class straight to another device.
// Everything that uses it asks appleHere() first and carries on without it (a web browser).
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

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
  addListener(event: string, handler: (data: never) => void): Promise<PluginListenerHandle>;
}

export const Apple = registerPlugin<ApplePlugin>('PlentyFlowApple');
export const isNative = () => Capacitor.isNativePlatform();
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

// Syncing your own iPhones and iPads over the Wi-Fi (up to 6), as in Restock.
//
// Pairing: one device shows a QR code; the other scans it and is given the group's key, so from
// then on only your devices can read what's sent. A code works once, for 10 minutes.
//
// Syncing: every paired device that has Plenty Flow open listens, and says on the Wi-Fi that it's
// there (Bonjour, "_plentyflow._tcp", with a short tag of the group so others' devices are ignored).
// Sync looks for the others, and with each one found: fetches what it has, merges it in, then
// sends back the result so both end up the same (lib/sync.ts decides, key by key, what's newest).
// Everything on the wire is sealed with the group's key (AES-256-GCM), as Send does.
import { sha256 } from '@noble/hashes/sha2';
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';
import { cleanBlock, cleanMovement, cleanPlan, cleanSeries, cleanShift, cleanStudio, cleanTaught, cleanTemplate, slugify, nowIso } from './clean';
import { Apple, appleHere } from './native';
import { historyCutoff } from './calendar';
import { base32, deviceLan, fromB64, open, seal, toB64, unbase32, SendProblem, type Lan } from './send';
import { getData, replaceAll, update } from './store';
import { merge, packOf, type SyncPack } from './sync';
import type { Data, Device } from './types';

export const MAX_DEVICES = 6;
const TYPE = '_plentyflow._tcp';
const CHUNK = 192 * 1024;
const PAIR_LIFE = 10 * 60_000;
const PAIR = /^PLENTYFLOW-PAIR:1:([A-Z2-7]{20,40}):(\d{1,3}(?:\.\d{1,3}){3}):(\d{2,5})$/;
export const isPairCode = (t: string) => PAIR.test((t ?? '').trim().replace(/\s+/g, '').toUpperCase());

const keyBytes = (b64: string) => fromB64(b64);
const tagged = (tag: string, bytes: Uint8Array) => { const t = strToU8(tag); const both = new Uint8Array(t.length + bytes.length); both.set(t); both.set(bytes, t.length); return sha256(both); };
const pairKey = (token: Uint8Array) => tagged('plentyflow-pair', token);
const groupTag = (key: string) => Array.from(tagged('plentyflow-group', keyBytes(key)).subarray(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const me = () => ({ id: getData().device.id, name: getData().settings.deviceName || 'My device' });

/** Checks each thing another device sends, the way a backup is checked. */
export function cleanSynced(key: string, v: unknown): unknown | null {
  const p = key.slice(0, key.indexOf(':'));
  switch (p) {
    case 'c': return cleanPlan(v, true);
    case 's': return cleanStudio(v);
    case 'sh': { const s = cleanShift(v); return s && (!historyCutoff() || s.date >= historyCutoff()) ? s : null; }
    case 'tp': return cleanTemplate(v);
    case 't': { const x = cleanTaught([v])[0]; return x && (!historyCutoff() || x.at.slice(0, 10) >= historyCutoff()) ? x : null; }
    case 'se': return cleanSeries(v);
    case 'bl': return cleanBlock(v);
    case 'm': return cleanMovement(v);
    case 'n': return typeof v === 'string' && v.trim() ? v.slice(0, 2000) : null;
    case 'L': return Array.isArray(v) ? [...new Set(v.map(slugify).filter(Boolean))].slice(0, 3000) : null;
    default: return null;
  }
}

const devicesWith = (list: Device[], add: Device[]): Device[] => {
  const out = [...list];
  for (const x of add) {
    if (x.id === getData().device.id) continue;
    const i = out.findIndex((y) => y.id === x.id);
    if (i >= 0) out[i] = { ...out[i], name: x.name || out[i].name };
    else if (out.length < MAX_DEVICES - 1) out.push({ id: x.id, name: x.name });
  }
  return out;
};
const setDevice = (fn: (dv: Data['device']) => Data['device']) => update((d) => { d.device = fn(d.device); });

// ---- listening for your other devices, while the app is open
let service: { stop(): void; key: string } | null = null;
let syncPort = 0;
/** Starts (or restarts) listening and being findable. Does nothing until this device is paired. */
export async function startSyncService(): Promise<number> {
  const lan = deviceLan();
  const key = getData().device.key;
  if (!lan || !key) { stopSyncService(); return 0; }
  if (service && service.key === key) return syncPort;
  stopSyncService();
  const k = keyBytes(key);
  const conns = new Map<string, { out?: Uint8Array; inParts: Uint8Array[]; inBytes: number }>();
  const listener = await lan.listen(async (conn, frame) => {
    let m: Record<string, unknown>;
    try { m = open(k, frame); } catch { return null; }
    const c = conns.get(conn) || { inParts: [], inBytes: 0 };
    conns.set(conn, c);
    if (m.op === 'hello') {
      const from = m.from as Device;
      if (from && typeof from.id === 'string') setDevice((dv) => ({ ...dv, devices: devicesWith(dv.devices, [{ id: from.id, name: String(from.name || '').slice(0, 40) }, ...((Array.isArray(m.devices) ? m.devices : []) as Device[])]) }));
      c.out = gzipSync(strToU8(JSON.stringify(packOf(getData(), me().name, nowIso()))));
      return seal(k, { v: 1, from: me(), devices: getData().device.devices, bytes: c.out.length, chunks: Math.max(1, Math.ceil(c.out.length / CHUNK)) });
    }
    if (m.op === 'get' && c.out) {
      const i = Number(m.i);
      return seal(k, { i, data: toB64(c.out.subarray(i * CHUNK, Math.min(c.out.length, (i + 1) * CHUNK))) });
    }
    if (m.op === 'put') {
      const part = fromB64(String(m.data || ''));
      c.inParts.push(part); c.inBytes += part.length;
      if (c.inBytes > 64 * 1024 * 1024) return seal(k, { error: 'Too big.' });
      if (Number(m.i) < Number(m.n) - 1) return seal(k, { ok: true });
      const all = new Uint8Array(c.inBytes); let at = 0;
      for (const p of c.inParts) { all.set(p, at); at += p.length; }
      c.inParts = []; c.inBytes = 0;
      try {
        const theirs = JSON.parse(strFromU8(gunzipSync(all))) as SyncPack;
        const r = merge(getData(), theirs, cleanSynced);
        replaceAll({ ...r.data, device: { ...getData().device, devices: getData().device.devices.map((x) => (x.id === theirs.from?.id ? { ...x, lastSync: nowIso() } : x)) } });
        heard(theirs.from?.name || 'another device', r.changed);
        return seal(k, { ok: true, changed: r.changed });
      } catch { return seal(k, { error: "That didn't add up." }); }
    }
    return seal(k, { error: 'unknown' });
  }, (conn) => conns.delete(conn), 'sync');
  syncPort = listener.port;
  service = { stop: listener.stop, key };
  if (appleHere()) await Apple.lanAdvertise({ key: 'sync', name: getData().device.id, type: TYPE, txt: { g: groupTag(key), n: me().name.slice(0, 40) } }).catch(() => undefined);
  return syncPort;
}
export function stopSyncService(): void {
  if (!service) return;
  if (appleHere()) void Apple.lanUnadvertise({ key: 'sync' }).catch(() => undefined);
  service.stop();
  service = null;
  syncPort = 0;
}
let onHeard: (name: string, changed: number) => void = () => {};
export const whenSyncedByOthers = (fn: (name: string, changed: number) => void) => { onHeard = fn; };
const heard = (name: string, changed: number) => onHeard(name, changed);

// ---- syncing now
export interface SyncResult { found: number; synced: { name: string; changed: number }[]; failed: string[] }
async function findOthers(): Promise<{ id: string; name: string; host: string; port: number }[]> {
  const key = getData().device.key;
  if (!appleHere() || !key) return [];
  const { found } = await Apple.lanBrowse({ type: TYPE, ms: 3500 });
  const tag = groupTag(key);
  const mine = getData().device.id;
  return found.filter((f) => f.txt?.g === tag && f.name !== mine).map((f) => ({ id: f.name, name: f.txt?.n || 'Another device', host: f.host, port: f.port }));
}

/** Syncs with every one of your devices that's open on the Wi-Fi. `progress` goes from 0 to 1. */
export async function syncNow(progress: (part: number, what: string) => void = () => {}): Promise<SyncResult> {
  const lan = deviceLan();
  const key = getData().device.key;
  if (!lan || !key) throw new SendProblem('Pair this device with another first.');
  await startSyncService();
  progress(0.05, 'Looking for your devices…');
  const others = await findOthers();
  const result: SyncResult = { found: others.length, synced: [], failed: [] };
  for (const [n, o] of others.entries()) {
    const step = (x: number, what: string) => progress(0.1 + ((n + x) / others.length) * 0.9, what);
    try { result.synced.push({ name: o.name, changed: await syncWith(lan, key, o, (x) => step(x, `Syncing with ${o.name}…`)) }); }
    catch { result.failed.push(o.name); }
  }
  progress(1, 'Done');
  return result;
}

async function syncWith(lan: Lan, key: string, to: { id: string; name: string; host: string; port: number }, progress: (x: number) => void): Promise<number> {
  const k = keyBytes(key);
  const link = await lan.dial(to.host, to.port, 5000);
  const ask = async (msg: Record<string, unknown>) => { const r = open(k, await link.ask(seal(k, msg))); if (typeof r.error === 'string') throw new SendProblem(r.error); return r; };
  try {
    const hello = await ask({ op: 'hello', v: 1, from: me(), devices: getData().device.devices });
    const chunks = Number(hello.chunks), bytes = Number(hello.bytes);
    if (!Number.isInteger(chunks) || chunks < 1 || chunks > 4096 || !(bytes > 0) || bytes > 64 * 1024 * 1024) throw new SendProblem('Update Plenty Flow on both devices.');
    const theirsZ = new Uint8Array(bytes); let at = 0;
    for (let i = 0; i < chunks; i++) { const part = fromB64(String((await ask({ op: 'get', i })).data || '')); theirsZ.set(part.subarray(0, bytes - at), at); at += part.length; progress(0.5 * ((i + 1) / chunks)); }
    const theirs = JSON.parse(strFromU8(gunzipSync(theirsZ))) as SyncPack;
    const r = merge(getData(), theirs, cleanSynced);
    const at2 = nowIso();
    replaceAll({ ...r.data, device: { ...getData().device, devices: devicesWith(getData().device.devices, [{ id: to.id, name: theirs.from?.name || to.name }, ...((Array.isArray(hello.devices) ? hello.devices : []) as Device[])]).map((x) => (x.id === to.id ? { ...x, lastSync: at2 } : x)) } });
    const mine = gzipSync(strToU8(JSON.stringify(packOf(getData(), me().name, at2))));
    const n = Math.max(1, Math.ceil(mine.length / CHUNK));
    for (let i = 0; i < n; i++) { await ask({ op: 'put', i, n, data: toB64(mine.subarray(i * CHUNK, Math.min(mine.length, (i + 1) * CHUNK))) }); progress(0.5 + 0.5 * ((i + 1) / n)); }
    return r.changed;
  } finally { link.close(); }
}

// ---- pairing
export interface PairOffer { code: string; done: Promise<'paired' | 'stopped' | 'expired' | 'full'>; stop(): void }
/** This device shows a code for a new device to scan. Makes the group's key the first time. */
export async function offerPairing(): Promise<PairOffer> {
  const lan = deviceLan();
  if (!lan) throw new SendProblem('Pairing needs the app on an iPhone or iPad.');
  const ip = await lan.localIp().catch(() => null);
  if (!ip) throw new SendProblem("This device isn't on Wi-Fi. Both devices need to be on the same Wi-Fi.");
  if (getData().device.devices.length >= MAX_DEVICES - 1) throw new SendProblem(`You already have ${MAX_DEVICES} devices syncing. Forget one first.`);
  if (!getData().device.key) setDevice((dv) => ({ ...dv, key: toB64(random(32)) }));
  const port = await startSyncService();
  const token = random(16);
  const k = pairKey(token);
  let finish: (how: 'paired' | 'stopped' | 'expired' | 'full') => void = () => {};
  const done = new Promise<'paired' | 'stopped' | 'expired' | 'full'>((ok) => (finish = ok));
  let over = false;
  const end = (how: 'paired' | 'stopped' | 'expired' | 'full') => { if (over) return; over = true; clearTimeout(timer); setTimeout(() => listener.stop(), 400); finish(how); };
  const listener = await lan.listen(async (_conn, frame) => {
    if (over) return null;
    let m: Record<string, unknown>;
    try { m = open(k, frame); } catch { return null; }
    if (m.op !== 'join') return seal(k, { error: 'unknown' });
    const from = m.from as Device;
    if (!from || typeof from.id !== 'string') return seal(k, { error: 'unknown' });
    if (getData().device.devices.length >= MAX_DEVICES - 1 && !getData().device.devices.some((x) => x.id === from.id)) { end('full'); return seal(k, { error: `This group already has ${MAX_DEVICES} devices.` }); }
    setDevice((dv) => ({ ...dv, devices: devicesWith(dv.devices, [{ id: from.id, name: String(from.name || '').slice(0, 40) }]) }));
    setTimeout(() => end('paired'), 50);
    return seal(k, { key: getData().device.key, from: me(), devices: getData().device.devices, syncPort: port });
  }, () => undefined, 'pair');
  const timer = setTimeout(() => end('expired'), PAIR_LIFE);
  return { code: `PLENTYFLOW-PAIR:1:${base32(token)}:${ip}:${listener.port}`, done, stop: () => end('stopped') };
}

/** This device scanned another's code: join its group, then sync with it straight away. */
export async function joinWith(code: string, progress: (part: number, what: string) => void = () => {}): Promise<{ name: string; changed: number }> {
  const lan = deviceLan();
  const m = PAIR.exec((code ?? '').trim().replace(/\s+/g, '').toUpperCase());
  if (!lan || !m) throw new SendProblem("That isn't a Plenty Flow pairing code.");
  const k = pairKey(unbase32(m[1]));
  progress(0.05, 'Connecting…');
  let link: Awaited<ReturnType<Lan['dial']>>;
  try { link = await lan.dial(m[2], Number(m[3]), 5000); } catch { throw new SendProblem("Couldn't find that device. Make sure Plenty Flow is open on it with the code showing, and that you're both on the same Wi-Fi."); }
  let res: Record<string, unknown>;
  try { res = open(k, await link.ask(seal(k, { op: 'join', from: me() }))); } catch { throw new SendProblem('The other device stopped answering. Make a new code and try again.'); } finally { link.close(); }
  if (typeof res.error === 'string') throw new SendProblem(res.error);
  const host = (res.from || {}) as Device;
  if (typeof res.key !== 'string' || !host.id) throw new SendProblem('Update Plenty Flow on both devices.');
  setDevice((dv) => ({ ...dv, key: String(res.key), devices: devicesWith([], [{ id: host.id, name: host.name }, ...((Array.isArray(res.devices) ? res.devices : []) as Device[])]) }));
  await startSyncService();
  progress(0.2, `Syncing with ${host.name || 'your other device'}…`);
  const changed = await syncWith(lan, String(res.key), { id: host.id, name: host.name || 'your other device', host: m[2], port: Number(res.syncPort) }, (x) => progress(0.2 + x * 0.8, `Syncing with ${host.name || 'your other device'}…`));
  progress(1, 'Done');
  return { name: host.name || 'your other device', changed };
}

/** Stop syncing with a device. It keeps everything it has. */
export function forgetDevice(id: string): void { setDevice((dv) => ({ ...dv, devices: dv.devices.filter((x) => x.id !== id) })); }
/** Leave the group: this device keeps everything, and stops syncing. */
export function leaveGroup(): void { stopSyncService(); setDevice((dv) => ({ id: dv.id, devices: [], calEvents: dv.calEvents })); }

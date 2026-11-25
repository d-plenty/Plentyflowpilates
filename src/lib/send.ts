// Sending a class, a studio's set-up or a whole backup straight to another device, once, over the
// same Wi-Fi. The device sending shows a QR code; the one receiving scans it, connects, and is handed
// the same text a file would hold. Nothing is paired and nothing is left behind: a code works once,
// for 10 minutes, and only while the sending device has it on screen.
//
// On the wire: 4 bytes of length, then a 12-byte nonce and AES-256-GCM sealed JSON. The key is made
// from the code, so only a device that saw the code can read anything. (The same design as
// Restock's "Send to another phone"; the Android app will speak it too.)
import { gcm } from '@noble/ciphers/aes';
import { sha256 } from '@noble/hashes/sha2';
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';
import { Apple, appleHere, type ApplePlugin } from './native';

export const SEND_LIFE_MS = 10 * 60_000;
const CHUNK = 256 * 1024;
const CODE = /^PLENTYFLOW-SEND:1:([A-Z2-7]{20,40}):(\d{1,3}(?:\.\d{1,3}){3}):(\d{2,5})$/;

export class SendProblem extends Error {}

// ---- small helpers
export const toB64 = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
export const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function unbase32(text: string): Uint8Array {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of text) { const i = B32.indexOf(ch); if (i < 0) continue; value = (value << 5) | i; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Uint8Array.from(out);
}
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
export const keyOf = (token: Uint8Array) => { const tag = strToU8('plentyflow-send'); const both = new Uint8Array(tag.length + token.length); both.set(tag); both.set(token, tag.length); return sha256(both); };
export function seal(key: Uint8Array, message: unknown, nonce: Uint8Array = random(12)): Uint8Array {
  const sealed = gcm(key, nonce).encrypt(strToU8(JSON.stringify(message)));
  const out = new Uint8Array(12 + sealed.length);
  out.set(nonce); out.set(sealed, 12);
  return out;
}
export function open(key: Uint8Array, sealed: Uint8Array): Record<string, unknown> {
  if (sealed.length < 28) throw new Error('too short');
  return JSON.parse(strFromU8(gcm(key, sealed.subarray(0, 12)).decrypt(sealed.subarray(12)))) as Record<string, unknown>;
}
export const isSendCode = (text: string) => CODE.test((text ?? '').trim().replace(/\s+/g, '').toUpperCase());

// ---- the Wi-Fi, as the native side gives it
type Answer = (conn: string, frame: Uint8Array) => Promise<Uint8Array | null>;
export interface Lan {
  localIp(): Promise<string | null>;
  dial(host: string, port: number, timeoutMs: number): Promise<{ ask(frame: Uint8Array): Promise<Uint8Array>; close(): void }>;
  listen(answer: Answer, ended: (conn: string) => void, key: string): Promise<{ port: number; stop(): void }>;
}
export function bridgeLan(bridge: ApplePlugin): Lan {
  const listeners = new Map<string, { answer: Answer; ended: (conn: string) => void }>();
  let wired: Promise<void> | undefined;
  const wire = () => (wired ??= (async () => {
    await bridge.addListener('lanMessage', ((m: { key?: string; conn: string; data: string }) => {
      void (async () => {
        const l = listeners.get(m.key ?? 'send');
        let res: Uint8Array | null = null;
        try { res = l ? await l.answer(m.conn, fromB64(m.data)) : null; } catch { res = null; }
        await bridge.lanReply(res ? { conn: m.conn, data: toB64(res) } : { conn: m.conn }).catch(() => undefined);
      })();
    }) as (data: never) => void);
    await bridge.addListener('lanEnded', ((m: { key?: string; conn: string }) => listeners.get(m.key ?? 'send')?.ended(m.conn)) as (data: never) => void);
  })());
  return {
    localIp: async () => (await bridge.lanInfo()).ip ?? null,
    async dial(host, port, timeoutMs) {
      const { id } = await bridge.lanDial({ host, port, timeoutMs });
      return { ask: async (frame) => fromB64((await bridge.lanAsk({ id, data: toB64(frame), timeoutMs: 60_000 })).data), close: () => void bridge.lanClose({ id }).catch(() => undefined) };
    },
    async listen(answer, ended, key) {
      await wire();
      listeners.set(key, { answer, ended });
      const { port } = await bridge.lanListen({ key });
      return { port, stop: () => { listeners.delete(key); void bridge.lanStop({ key }).catch(() => undefined); } };
    },
  };
}
let made: Lan | undefined;
/** The Wi-Fi on this device, or undefined where there isn't one to use (a web browser). */
export const deviceLan = (): Lan | undefined => (appleHere() ? (made ??= bridgeLan(Apple)) : undefined);
export const canSendDirect = () => !!deviceLan();

export interface Offer { code: string; until: number; done: Promise<'sent' | 'stopped' | 'expired'>; stop(): void }

/** The sending device: listens, and gives the code to show. */
export async function offerText(lan: Lan, text: string, about: { name: string; what: string }, onProgress: (part: number) => void = () => {}, now: () => number = () => Date.now()): Promise<Offer> {
  const ip = await lan.localIp().catch(() => null);
  if (!ip) throw new SendProblem("This device isn't on Wi-Fi. Both devices need to be on the same Wi-Fi.");
  const token = random(16);
  const key = keyOf(token);
  const packed = gzipSync(strToU8(text));
  const chunks = Math.max(1, Math.ceil(packed.length / CHUNK));
  const until = now() + SEND_LIFE_MS;
  let taker: string | null = null;
  let finish: (how: 'sent' | 'stopped' | 'expired') => void = () => {};
  const done = new Promise<'sent' | 'stopped' | 'expired'>((ok) => (finish = ok));
  let over = false;
  const end = (how: 'sent' | 'stopped' | 'expired') => {
    if (over) return;
    over = true;
    clearTimeout(timer);
    setTimeout(() => listener.stop(), how === 'sent' ? 500 : 0);
    finish(how);
  };
  const listener = await lan.listen(async (conn, frame) => {
    if (over || now() > until) return null;
    let m: Record<string, unknown>;
    try { m = open(key, frame); } catch { return null; } // not someone who saw the code
    if (taker !== null && taker !== conn) return seal(key, { error: 'Another device is already receiving this. Make a new code to send it again.' });
    if (m.op === 'hello') { taker = conn; return seal(key, { v: 1, name: about.name, what: about.what, bytes: packed.length, chunks }); }
    if (taker !== conn) return null;
    if (m.op === 'chunk') {
      const i = Number(m.i);
      if (!Number.isInteger(i) || i < 0 || i >= chunks) return seal(key, { error: 'That part does not exist.' });
      onProgress((i + 1) / chunks);
      return seal(key, { i, data: toB64(packed.subarray(i * CHUNK, Math.min(packed.length, (i + 1) * CHUNK))) });
    }
    if (m.op === 'done') { end('sent'); return seal(key, { ok: true }); }
    return seal(key, { error: 'unknown' });
  }, (conn) => { if (conn === taker && !over) taker = null; }, 'send');
  const timer = setTimeout(() => end('expired'), SEND_LIFE_MS);
  return { code: `PLENTYFLOW-SEND:1:${base32(token)}:${ip}:${listener.port}`, until, done, stop: () => end('stopped') };
}

/** The receiving device: connects with the scanned code and brings the text back. */
export async function fetchText(lan: Lan, code: string, onProgress: (part: number) => void = () => {}): Promise<{ text: string; from: string }> {
  const m = CODE.exec((code ?? '').trim().replace(/\s+/g, '').toUpperCase());
  if (!m) throw new SendProblem("That isn't an Plenty Flow code. On the other device, open the class and choose Share.");
  const key = keyOf(unbase32(m[1]));
  let link: Awaited<ReturnType<Lan['dial']>>;
  try {
    link = await lan.dial(m[2], Number(m[3]), 5000);
  } catch {
    throw new SendProblem("Couldn't reach the other device. Keep the code showing on it, make sure both are on the same Wi-Fi, and try again.");
  }
  const ask = async (msg: Record<string, unknown>) => {
    let res: Record<string, unknown>;
    try { res = open(key, await link.ask(seal(key, msg))); } catch { throw new SendProblem('The other device stopped answering. Keep the code showing on it and try again (a code works once, for 10 minutes).'); }
    if (typeof res.error === 'string') throw new SendProblem(res.error);
    return res;
  };
  try {
    const hello = await ask({ op: 'hello', v: 1 });
    const chunks = Number(hello.chunks);
    const bytes = Number(hello.bytes);
    const from = typeof hello.name === 'string' && hello.name ? hello.name.slice(0, 60) : 'the other device';
    if (!Number.isInteger(chunks) || chunks < 1 || chunks > 4096 || !(bytes >= 0) || bytes > 64 * 1024 * 1024) throw new SendProblem("The other device's answer wasn't one this app understands. Update Plenty Flow on both.");
    const packed = new Uint8Array(bytes);
    let at = 0;
    for (let i = 0; i < chunks; i++) {
      const r = await ask({ op: 'chunk', i });
      const part = fromB64(String(r.data ?? ''));
      if (at + part.length > bytes) throw new SendProblem("What the other device sent didn't add up. Try again.");
      packed.set(part, at);
      at += part.length;
      onProgress((i + 1) / chunks);
    }
    if (at !== bytes) throw new SendProblem("What the other device sent didn't add up. Try again.");
    await ask({ op: 'done' }).catch(() => undefined);
    return { text: strFromU8(gunzipSync(packed)), from };
  } finally {
    link.close();
  }
}

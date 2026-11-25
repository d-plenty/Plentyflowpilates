// Where the app keeps its one data file, and its backups.
// On an iPhone or iPad: the app's own private folder for the data, and "Plenty Flow backups" in the
// app's Documents (Files → On My iPhone → Plenty Flow) for backups, so a backup can be copied off
// the device. In a web browser (the preview on a computer): the browser's own storage.
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

const native = () => Capacitor.isNativePlatform();
const DATA = 'plentyflow/data.json';
const PREV = 'plentyflow/data.previous.json';
export const BACKUP_DIR = 'Plenty Flow backups';
const LS_DATA = 'plentyflow.data';
const LS_BACKUPS = 'plentyflow.backups';

async function readFile(path: string, directory: Directory): Promise<string | null> {
  try {
    const r = await Filesystem.readFile({ path, directory, encoding: Encoding.UTF8 });
    return typeof r.data === 'string' ? r.data : null;
  } catch {
    return null;
  }
}

export async function loadText(): Promise<{ text: string | null; previous: string | null }> {
  if (!native()) return { text: localStorage.getItem(LS_DATA), previous: null };
  return { text: await readFile(DATA, Directory.Data), previous: await readFile(PREV, Directory.Data) };
}

let lastWritten: string | null = null;
export async function saveText(text: string): Promise<void> {
  if (!native()) { localStorage.setItem(LS_DATA, text); return; }
  // The copy from before this write is kept beside it: if a write is cut short, the app opens that one.
  if (lastWritten !== null) await Filesystem.writeFile({ path: PREV, directory: Directory.Data, data: lastWritten, encoding: Encoding.UTF8, recursive: true }).catch(() => undefined);
  await Filesystem.writeFile({ path: DATA, directory: Directory.Data, data: text, encoding: Encoding.UTF8, recursive: true });
  lastWritten = text;
}
export const noteLoaded = (text: string | null) => { lastWritten = text; };

export interface BackupFile { name: string; at: number; bytes: number }

const webBackups = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(LS_BACKUPS) || '{}') as Record<string, string>; } catch { return {}; } };

export async function listBackups(): Promise<BackupFile[]> {
  if (!native()) return Object.entries(webBackups()).map(([name, text]) => ({ name, at: Date.parse(name.slice(19, 29) + 'T' + name.slice(30, 32) + ':' + name.slice(32, 34)) || 0, bytes: text.length })).sort((a, b) => b.name.localeCompare(a.name));
  try {
    const r = await Filesystem.readdir({ path: BACKUP_DIR, directory: Directory.Documents });
    return r.files.filter((f) => f.type === 'file' && f.name.endsWith('.json')).map((f) => ({ name: f.name, at: Number(f.mtime) || 0, bytes: Number(f.size) || 0 })).sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}
export async function writeBackup(name: string, text: string): Promise<void> {
  if (!native()) { const all = webBackups(); all[name] = text; localStorage.setItem(LS_BACKUPS, JSON.stringify(all)); return; }
  await Filesystem.writeFile({ path: `${BACKUP_DIR}/${name}`, directory: Directory.Documents, data: text, encoding: Encoding.UTF8, recursive: true });
}
export async function readBackup(name: string): Promise<string | null> {
  if (!native()) return webBackups()[name] ?? null;
  return readFile(`${BACKUP_DIR}/${name}`, Directory.Documents);
}
export async function deleteBackup(name: string): Promise<void> {
  if (!native()) { const all = webBackups(); delete all[name]; localStorage.setItem(LS_BACKUPS, JSON.stringify(all)); return; }
  await Filesystem.deleteFile({ path: `${BACKUP_DIR}/${name}`, directory: Directory.Documents }).catch(() => undefined);
}

/** Hands a file to the person: the share sheet on an iPhone (Save to Files, AirDrop, Mail), a download in a browser. */
export async function giveFile(name: string, text: string): Promise<void> {
  if (native()) {
    const { Share } = await import('@capacitor/share');
    const w = await Filesystem.writeFile({ path: `share/${name}`, directory: Directory.Cache, data: text, encoding: Encoding.UTF8, recursive: true });
    await Share.share({ title: name, files: [w.uri] });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

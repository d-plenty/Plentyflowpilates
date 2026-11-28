// The More tab, Settings, Look and colours, Accessibility, Your data, Sync, What's new, Coming soon,
// the guide and About. Laid out like Restock: groups of short rows, with search.
// Settings are edited as an unsaved copy until Save. Colours and dark mode show straight away
// and go back if the screen is left without saving.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { closeAllDrafts, draftOf, editDraft, markSaved, openDraft } from '../../lib/drafts';
import { APP_VERSION, copyBackupOff, hasAnything } from '../../lib/files';
import { MAX_WELCOME, WELCOME_LINES, emptyData } from '../../lib/clean';
import { getData, replaceAll, setSettings, useData, usualStudio } from '../../lib/store';
import type { Data, Settings } from '../../lib/types';
import { addDays, dateOf, hoursText, money, monthEnd, monthStart, niceDate, slotTitle, studioName, today, totals, weekStart } from '../../lib/calendar';
import { canSendDirect } from '../../lib/send';
import { MAX_DEVICES, forgetDevice, isPairCode, joinWith, leaveGroup, offerPairing, stopSyncService, syncNow, type PairOffer } from '../../lib/lanSync';
import { Qr, Scanner } from '../Qr';
import { Back, Chips, Group, Icon, Info, Row, RowSearch, SaveButton, Screen, Sheet, Switch, TONE, confirmAsk, toast, useEditing, type Tone } from '../bits';
import { nav, type Route } from '../nav';
import { ACCENT_HEX, ACCENT_NAME, accentOf, themeNow } from '../theme';
import { THEMES } from '../art/scenes';
import { WHEN, type ThemeKey } from '../../lib/holidays';
import { Picture, reduceMotion, widePad } from '../Picture';
import { Badge, Wordmark } from '../Reformer';
import { addStudio } from './Studios';
import { ICON_LOOKS, iconSvg } from '../../lib/appicon';
import { currentIcon, switchIcon } from '../../lib/native';

export const SETTINGS_KEY = 'settings';
/** The settings being edited, with Save. Used by Settings, Look and colours, Accessibility and Backups. */
export function useSettingsDraft() {
  const d = useData();
  const s = draftOf<Settings>(SETTINGS_KEY) || openDraft(SETTINGS_KEY, d.settings);
  // The app icon isn't part of the draft: it changes straight away (AppIconPicker), so a save keeps it.
  const save = () => { const x = draftOf<Settings>(SETTINGS_KEY); if (x) { setSettings({ ...x, appIcon: getData().settings.appIcon }); markSaved(SETTINGS_KEY); } return true; };
  const dirty = useEditing(SETTINGS_KEY, 'your settings', save);
  const edit = (patch: Partial<Settings>) => editDraft<Settings>(SETTINGS_KEY, (x) => Object.assign(x, patch));
  const top = (title: string, back = 'Settings', sub?: ReactNode) => <><div className="row between"><Back label={back} /><SaveButton dirty={dirty} onSave={() => { save(); toast('Settings saved.'); }} /></div><h1>{title}</h1>{sub ? <div className="m" style={{ marginTop: 4 }}>{sub}</div> : null}</>;
  return { s, edit, dirty, save, top };
}

/** What's coming, behind one row (as in Restock). */
export const SOON: { icon: string; title: string; sub?: string }[] = [
  { icon: 'spark', title: 'Draft a flow for me', sub: 'Being reworked so its drafts are worth teaching' },
  { icon: 'server', title: 'Studio server', sub: 'Sync through a server the studio runs, end-to-end encrypted' },
  { icon: 'people', title: 'Clients', sub: 'Comes with the studio server' },
  { icon: 'screen', title: 'Computer version', sub: 'The app in a web browser' },
  { icon: 'phone', title: 'Android', sub: 'Once the iPhone app settles' },
  { icon: 'widget', title: 'Home screen widgets', sub: "Today's classes at a glance" },
  { icon: 'watch', title: 'Watch control', sub: 'Next and pause from an Apple Watch' },
];
export function SoonScreen() {
  return (
    <Screen narrow top={<><Back /><h1>Coming soon</h1><div className="m">Planned, not built yet.</div></>}>
      <div className="card flush">{SOON.map((x) => <Row key={x.title} soon icon={x.icon} title={x.title} sub={x.sub} />)}</div>
    </Screen>
  );
}

const lastBackupText = (iso?: string) => (iso ? `Last backup ${new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'No backup yet');
const syncText = (dv: Data['device']) => (!dv.key || !dv.devices.length ? 'iPhone and iPad on the same Wi-Fi' : `With ${dv.devices.map((x) => x.name).join(', ')}`);

/** More: the places you go now and then, as tiles. Everything you set once lives in Settings. */
export function MoreScreen() {
  const d = useData();
  const ts = d.settings.timesheet;
  const tiles: { icon: string; tone: Tone; title: string; sub: string; go: Route }[] = [
    { icon: 'home', tone: 'blue', title: 'My studios', sub: d.studios.length ? d.studios.map((s) => s.name).join(', ') : 'Set up where you teach', go: { name: 'studios' } },
    { icon: 'money', tone: 'green', title: 'Timesheet', sub: ts.on ? 'Hours and pay' : 'Hours by week and month', go: { name: 'timesheet' } },
    { icon: 'cog', tone: 'grey', title: 'Settings', sub: 'Look, calendar, sync, backups', go: { name: 'settings' } },
    { icon: 'book', tone: 'orange', title: 'Guide', sub: 'How the app works', go: { name: 'guide' } },
  ];
  return (
    <Screen narrow top={<h1>More</h1>}>
      <div className="tiles">
        {tiles.map((t) => <button type="button" key={t.title} className="tile" onClick={() => nav.go(t.go)}><span className="ic tone" style={{ background: TONE[t.tone] }}><Icon name={t.icon} size={22} /></span><b>{t.title}</b><span className="m">{t.sub}</span></button>)}
      </div>
    </Screen>
  );
}

/** Settings, grouped as in Restock, each kind of thing with its own colour. */
export function SettingsScreen() {
  const { s, edit, top } = useSettingsDraft();
  const d = useData();
  const r = s.reminders;
  const [naming, setNaming] = useState(false);
  return (
    <Screen narrow top={top('Settings', 'More')}>
      <RowSearch placeholder="Search settings" />
      <Group title="You">
        <button type="button" className="set you" data-words="name device sharing" onClick={() => setNaming(true)}>
          <Badge size={44} />
          <span className="grow"><b>{s.deviceName || 'Add your name'}</b><div className="m">Your name, for your welcome and when you share</div></span>
          <span style={{ color: 'var(--dim)', display: 'flex' }}><Icon name="next" size={18} /></span>
        </button>
      </Group>
      <Group title="Look and accessibility">
        <Row icon="palette" tone="blue" title="Look and colours" sub={`${s.theme === 'auto' ? 'Matches the phone' : s.theme === 'dark' ? 'Dark' : 'Light'} · ${ACCENT_NAME[s.accent] || 'Plenty blue'}${s.holidays ? ' · holiday themes' : ''}`} words="dark mode true black holiday christmas easter halloween australia new year opening welcome line icon" onClick={() => nav.go({ name: 'look' })} />
        <Row icon="people" tone="purple" title="Accessibility" sub="Text size, bold text, contrast, bigger buttons, less motion" words="voiceover dyslexia" onClick={() => nav.go({ name: 'a11y' })} />
      </Group>
      <Group title="Teaching">
        <Row icon="screen" tone="orange" title="Keep the screen on in Play" right={<Switch on={s.keepAwake} onChange={(on) => edit({ keepAwake: on })} label="Keep the screen on in Play" />} />
        <Row icon="play" tone="orange" title="Play screen always dark" sub="Easier to read across the room" right={<Switch on={s.playDark} onChange={(on) => edit({ playDark: on })} label="Play screen always dark" />} />
        <Row icon="money" tone="green" title="Hours and pay" sub={s.timesheet.on ? `Pay on · ${s.timesheet.count === 'block' ? 'whole block' : 'class time'}` : 'Optional'} words="timesheet rate invoice" onClick={() => nav.go({ name: 'timesheet-setup' })} />
      </Group>
      <Group title="Calendar">
        <Row icon="bell" tone="red" title="Reminders and iPhone Calendar" sub={[r.shift ? `${r.before ? `${r.before} min` : 'Right'} before a shift` : 'No shift reminders', r.nightBefore ? 'the night before' : '', s.phoneCalendar ? 'Calendar on' : ''].filter(Boolean).join(' · ')} words="notifications alerts ics import export file history" onClick={() => nav.go({ name: 'cal-settings' })} />
        <Row icon="calendar" tone="red" title="Calendar files and history" sub={`Import or export .ics · history kept ${s.keepMonths ? (s.keepMonths < 12 ? `${s.keepMonths} months` : `${s.keepMonths / 12} year${s.keepMonths > 12 ? 's' : ''}`) : 'forever'}`} words="google outlook apple keep months retention" onClick={() => nav.go({ name: 'cal-settings' })} />
      </Group>
      <Group title="Your data">
        <Row icon="sync" tone="sky" title="Sync your devices" sub={syncText(d.device)} words="ipad iphone wifi pair" onClick={() => nav.go({ name: 'sync' })} />
        <Row icon="box" tone="sky" title="Backups" sub={`${s.autoBackup ? `Automatic · keeps the last ${s.keepBackups}` : 'Automatic backups are off'} · ${lastBackupText(s.lastBackup).toLowerCase()}`} words="restore" onClick={() => nav.go({ name: 'backups' })} />
        <Row icon="chart" tone="teal" title="Your data" sub="Hours this year, class notes, what's on this device" words="charts history notes" onClick={() => nav.go({ name: 'your-data' })} />
        <Row icon="share" tone="teal" title="Share, import and export" sub="Packs of studios and movements, and files" words="qr code file pack" onClick={() => nav.go({ name: 'share' })} />
        <Row danger icon="trash" tone="red" title="Erase everything" sub="Removes every flow, studio, shift and setting from this device" onClick={async () => {
          if (!(await confirmAsk('Erase everything on this device?', hasAnything() ? 'Your flows, studios, calendar, your own movements and settings are all removed. Backups already saved in Files are not touched. This cannot be undone.' : 'The app goes back to how it was when first opened.', 'Erase', true))) return;
          closeAllDrafts(); stopSyncService(); replaceAll(emptyData()); nav.reset(); toast('Erased.');
        }} />
      </Group>
      <Group title="Help">
        <Row icon="book" tone="orange" title="Guide" sub="How the app works" words="help" onClick={() => nav.go({ name: 'guide' })} />
        <Row icon="gift" tone="pink" title="What's new" sub={`In Plenty Flow ${APP_VERSION}`} onClick={() => nav.go({ name: 'whats-new' })} />
        <Row icon="spark" tone="purple" title="Coming soon" sub={SOON.slice(0, 3).map((x) => x.title).join(', ')} words="server android widgets watch" onClick={() => nav.go({ name: 'soon' })} />
        <Row icon="info" tone="grey" title="About and privacy" sub={`Plenty Flow ${APP_VERSION} · everything stays on this device`} words="privacy licence" onClick={() => nav.go({ name: 'about' })} />
      </Group>
      {naming ? <Sheet title="Your name" onClose={() => setNaming(false)} foot={<button type="button" className="btn p grow" onClick={() => setNaming(false)}>Done</button>}>
        <input type="text" autoFocus maxLength={40} autoComplete="given-name" aria-label="Your name" value={s.deviceName} onChange={(e) => edit({ deviceName: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') setNaming(false); }} />
        <p className="m">For your welcome on Home, and shown to people you share a flow with and on your other devices. Tap Save to keep it.</p>
      </Sheet> : null}
    </Screen>
  );
}

// ---- What's new, as in Restock: offered once after an update, and kept here
export const WHATS_NEW = {
  version: '0.7.0',
  about: 'Blocks you save and reuse, movements in your own words, Paste from Notes, a step-by-step flow builder, smarter search, and a proper iPad layout.',
  changes: [
    'Blocks: save a run of movements as a block (Make block in a flow), keep them in Movements → Blocks, and drop one into any flow. In a flow a block is your own copy; Save changes back to the block updates it for next time.',
    'Write a movement in your own words with Write one. Link it to a library movement for its picture, or leave it as written.',
    'Springs in your shorthand, by your studio\'s own letters: RB is a red and a blue, and R/RB means red for beginners or red and blue for intermediate.',
    'Springs show as coloured dots everywhere, one dot per spring, after the word Springs. Two options show as dots / dots.',
    'Props for the whole flow: tap + Add on the Props bar, with how many to set out.',
    'Tick movements off in Play. Ticks stay for that day and start fresh on another day.',
    'Favourites in the add list, for movements and blocks.',
    'Paste from Notes: Flows → Import → Paste from Notes reads a plan written in your notes app, parts, springs, reps, blocks and props. In a flow, Settings → Copy as text for Notes writes one back out.',
    'Search understands related words (abs finds core, bum finds glutes), small typos and keywords, across movements, series, blocks and flows.',
    'Build it step by step: a new flow walks you through what\'s in the class, filling each part, and putting it in order, then opens the full flow editor.',
    'iPad: the sidebar in portrait too, lists beside the page they open, everything a step bigger, the opening drawn for the iPad, and calendar days that show their shifts.',
    'Fixed: the flow editor\'s top bar running over Built for, buttons wrapping, a cut-off chip, and the add list on a phone turned sideways.',
  ],
};
export function WhatsNewScreen() {
  return (
    <Screen narrow top={<><Back /><h1>What's new</h1></>}>
      <section className="card stack-sm whats-new"><div className="row between"><b>Plenty Flow {WHATS_NEW.version}</b>{WHATS_NEW.version === APP_VERSION ? <span className="tag acc">This version</span> : null}</div><p className="m">{WHATS_NEW.about}</p><ul>{WHATS_NEW.changes.map((c) => <li key={c}>{c}</li>)}</ul></section>
      <p className="tiny">Earlier versions, and every detail, are on the GitHub page: github.com/d-plenty/Plentyflowpilates</p>
      <button type="button" className="btn p" onClick={() => nav.back()}>Done</button>
    </Screen>
  );
}
/** After an update, once: see what's new, or get on with it. Never on a brand-new install. */
export function WhatsNewPrompt() {
  const d = useData();
  const seen = d.settings.seenVersion;
  if (!d.settings.welcomed || seen === APP_VERSION) return null;
  const done = () => setSettings({ seenVersion: APP_VERSION });
  if (!seen && !hasAnything()) { queueMicrotask(done); return null; }
  return (
    <Sheet title={`Plenty Flow was updated to ${APP_VERSION}`} onClose={done}>
      <p className="m">Want to see what changed? It's in Settings → What's new any time.</p>
      <button type="button" className="btn p wide" onClick={() => { done(); void nav.home('more').then(() => nav.go({ name: 'whats-new' }, 'more')); }}>See what's new</button>
      <button type="button" className="btn wide" onClick={done}>I'll figure it out</button>
    </Sheet>
  );
}

// ---- Your data
export function YourDataScreen() {
  const d = useData();
  const year = today().slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}-01`);
  const byMonth = months.map((m) => ({ m, t: totals(m, monthEnd(m)) }));
  const yearT = totals(`${year}-01-01`, `${year}-12-31`);
  const weekT = totals(weekStart(today()), addDays(weekStart(today()), 6));
  const monthT = totals(monthStart(today()), monthEnd(today()));
  const top = Math.max(60, ...byMonth.map((x) => x.t.minutes));
  const notes = d.shifts.flatMap((s) => s.slots.filter((k) => k.note).map((k) => ({ s, k }))).sort((a, b) => b.s.date.localeCompare(a.s.date));
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const shown = notes.filter(({ s, k }) => !ql || [k.note, slotTitle(s, k), s.name].some((x) => x && x.toLowerCase().includes(ql)));
  const pay = d.settings.timesheet.on && Object.keys(d.settings.timesheet.rates).length > 0;
  return (
    <Screen narrow top={<><Back /><h1>Your data</h1><div className="m">Everything here is on this device{d.device.devices.length ? ' and your synced devices' : ''}, nowhere else.</div></>}>
      <div className="stat-row">
        <div><span className="m">This week</span><b>{hoursText(weekT.minutes)}</b></div>
        <div><span className="m">This month</span><b>{hoursText(monthT.minutes)}</b></div>
        <div><span className="m">This year</span><b>{hoursText(yearT.minutes)}</b>{pay ? <span className="tiny">{money(yearT.pay)}</span> : null}</div>
      </div>
      <div className="card"><div className="lab">Hours each month, {year}</div><div className="bars" role="img" aria-label={`Hours each month in ${year}`}>{byMonth.map(({ m, t }) => <div key={m}><small>{t.minutes ? Math.round(t.minutes / 60) : ''}</small><span className={`b${m === monthStart(today()) ? ' now' : ''}`} style={{ height: `${(t.minutes / top) * 80}%` }} /><small>{dateOf(m).toLocaleDateString(undefined, { month: 'narrow' })}</small></div>)}</div>
        <p className="tiny" style={{ marginTop: 8 }}>{yearT.classes} classes this year · {yearT.covers} covers · {yearT.cancelled} cancelled</p></div>
      <Group title="On this device">
        <Row title="Flows" right={<b>{d.classes.length}</b>} />
        <Row title="Studios" right={<b>{d.studios.length}</b>} />
        <Row title="Shifts on the calendar" right={<b>{d.shifts.length}</b>} />
        <Row title="Your own and changed movements" right={<b>{Object.keys(d.movements).length}</b>} />
        <Row title="Classes taught" sub={d.taught.length ? `Since ${niceDate(d.taught[d.taught.length - 1].at.slice(0, 10))}` : undefined} right={<b>{d.taught.length}</b>} />
        <Row title="Calendar history" sub={d.settings.keepMonths ? `Kept for ${d.settings.keepMonths} months` : 'Kept forever'} onClick={() => nav.go({ name: 'cal-settings' })} />
      </Group>
      <div className="lab">Notes after class</div>
      {notes.length ? <>
        <input type="search" placeholder="Search your notes" aria-label="Search your notes" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="card flush">{shown.slice(0, 100).map(({ s, k }) => <Row key={k.id} title={k.note!} sub={`${niceDate(s.date)} · ${slotTitle(s, k)}${s.studioId ? ` · ${studioName(s.studioId)}` : ''}`} onClick={() => nav.go({ name: 'shift', id: s.id }, 'calendar')} />)}</div>
      </> : <p className="m">Notes you write after a class on the calendar show here.</p>}
      <Group title="Export and import">
        <Row icon="box" title="Everything, as a backup file" onClick={() => void copyBackupOff().then(() => toast('Backup saved off this device.')).catch(() => undefined)} />
        <Row icon="money" title="A timesheet" onClick={() => nav.go({ name: 'timesheet' }, 'calendar')} />
        <Row icon="download" title="Import" sub="A backup, a flow, a studio or a pack" onClick={() => nav.go({ name: 'share', part: 'import' })} />
      </Group>
    </Screen>
  );
}

// ---- Sync your devices
export function SyncScreen() {
  const d = useData();
  const dv = d.device;
  const [offer, setOffer] = useState<PairOffer | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState<{ part: number; what: string } | null>(null);
  const [problem, setProblem] = useState('');
  const can = canSendDirect();
  useEffect(() => () => offer?.stop(), [offer]);
  const showCode = async () => {
    setProblem('');
    try {
      const o = await offerPairing();
      setOffer(o);
      void o.done.then((how) => { setOffer(null); if (how === 'paired') toast('Paired. Syncing now…'); else if (how === 'expired') setProblem('The code ran out after 10 minutes. Show a new one.'); else if (how === 'full') setProblem(`You already have ${MAX_DEVICES} devices.`); });
    } catch (e) { setProblem(e instanceof Error ? e.message : "Couldn't start pairing."); }
  };
  const join = async (code: string) => {
    setScanning(false); setProblem('');
    if (dv.key && dv.devices.length && !(await confirmAsk('Join another group?', 'This device stops syncing with the devices it syncs with now. It keeps everything it has, and what it has is shared with the new group.', 'Join'))) return;
    setBusy({ part: 0, what: 'Connecting…' });
    try { const r = await joinWith(code, (part, what) => setBusy({ part, what })); toast(`Synced with ${r.name}.`); }
    catch (e) { setProblem(e instanceof Error ? e.message : "Couldn't pair."); }
    finally { setBusy(null); }
  };
  const sync = async () => {
    setProblem('');
    setBusy({ part: 0, what: 'Looking for your devices…' });
    try {
      const r = await syncNow((part, what) => setBusy({ part, what }));
      if (!r.found) setProblem(`Couldn't find ${dv.devices.length === 1 ? dv.devices[0].name : 'your other devices'}. Make sure Plenty Flow is open on ${dv.devices.length === 1 ? 'it' : 'them'} and you're on the same Wi-Fi.`);
      else toast(r.failed.length ? `Synced with ${r.synced.map((x) => x.name).join(', ') || 'none'}. Couldn't finish with ${r.failed.join(', ')}.` : `Synced with ${r.synced.map((x) => x.name).join(', ')}.`);
    } catch (e) { setProblem(e instanceof Error ? e.message : "Couldn't sync."); }
    finally { setBusy(null); }
  };
  return (
    <Screen narrow top={<><Back /><h1>Sync your devices</h1><div className="m">Your iPhones and iPads, on the same Wi-Fi. Up to {MAX_DEVICES}.</div></>}>
      {!can ? <div className="card"><b>Sync needs the app on an iPhone or iPad</b></div> : <>
        <div className="card stack-sm">
          <div className="row wrap"><b className="grow">How it works</b><Info text={<>Both devices need Plenty Flow open and on the same Wi-Fi when you sync: iPhones and iPads don't let an app sync in the background. Each device keeps everything: flows, studios, movements and your calendar. Settings like your colours and reminders stay on each device. If you stop syncing a device, it keeps all it has.</>} /></div>
          <span className="m">Open Plenty Flow on both, then tap Sync.</span>
        </div>
        {dv.key && dv.devices.length ? <>
          <button type="button" className="btn p wide" disabled={!!busy} onClick={() => void sync()}><Icon name="sync" size={18} />Sync now</button>
          <Group title="Syncing with">
            {dv.devices.map((x) => <Row key={x.id} icon="phone" title={x.name} sub={x.lastSync ? `Last synced ${new Date(x.lastSync).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'Not synced yet'} right={<button type="button" className="btn sm ghost" onClick={async () => { if (await confirmAsk(`Stop syncing with ${x.name}?`, 'Both devices keep everything they have.', 'Stop syncing')) forgetDevice(x.id); }}>Forget</button>} />)}
          </Group>
        </> : null}
        {busy ? <div className="card stack-sm"><span className="m">{busy.what}</span><div className="progress" role="progressbar" aria-valuenow={Math.round(busy.part * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.round(busy.part * 100)}%` }} /></div></div> : null}
        {problem ? <div className="card" role="alert" style={{ background: 'var(--warn-bg)', borderColor: 'var(--warn-line)' }}><b>{problem}</b></div> : null}
        <div className="lab">Add a device</div>
        {offer ? <div className="card stack" style={{ alignItems: 'center', padding: 18 }}><Qr text={offer.code} label="A code for your other device to scan" /><b className="center">On your other device: Settings → Sync your devices → Scan a code</b><p className="m center">Keep this showing. The code works once, for 10 minutes.</p><button type="button" className="btn" onClick={() => { offer.stop(); setOffer(null); }}>Stop</button></div>
          : scanning ? <><Scanner accept={isPairCode} onCode={(c) => void join(c)} wrong="That isn't a Plenty Flow pairing code." /><button type="button" className="btn" onClick={() => setScanning(false)}>Stop</button></>
          : <div className="row"><button type="button" className="btn grow" disabled={!!busy || dv.devices.length >= MAX_DEVICES - 1} onClick={() => void showCode()}><Icon name="qr" size={18} />Show a code</button><button type="button" className="btn grow" disabled={!!busy} onClick={() => setScanning(true)}><Icon name="qr" size={18} />Scan a code</button></div>}
        {dv.key && dv.devices.length ? <button type="button" className="btn danger" onClick={async () => { if (await confirmAsk('Stop syncing this device?', 'It keeps everything it has. Your other devices keep theirs.', 'Stop syncing')) leaveGroup(); }}>Stop syncing this device</button> : null}
        <Row soon icon="server" title="Sync through a studio server" sub="Coming later" />
      </>}
    </Screen>
  );
}
const THEME_ORDER: ThemeKey[] = ['default', 'christmas', 'newyear', 'ausday', 'easter', 'halloween'];
/** A theme's opening, full screen and playing on a loop, as it will look when its day comes (still, with Reduce Motion). The X or Escape closes it. */
function ThemePreview({ theme, night, onClose }: { theme: ThemeKey; night: boolean; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  // Drawn over the whole app (not inside this screen), so nothing else shows and the X can always be reached.
  return createPortal(
    <div className="opening" role="dialog" aria-modal="true" aria-label={`${THEMES[theme].name} opening, ${night ? 'night' : 'day'}`}>
      {widePad() ? null : <Picture className="behind" theme={theme} night={night} mode="open" hidden />}
      <Picture className={`front${widePad() ? ' fill' : ''}`} theme={theme} night={night} mode="open" moving={!reduceMotion()} words pad={widePad()} />
      <button type="button" className="x" aria-label="Close" autoFocus onClick={onClose}><Icon name="close" size={22} /></button>
    </div>,
    document.body,
  );
}

/** The line under the Home welcome: a new one each day from the list, or one of your own (blank for none). */
function WelcomeLines({ w, onChange }: { w: Settings['welcome']; onChange: (w: Settings['welcome']) => void }) {
  const [adding, setAdding] = useState('');
  const full = w.lines.length >= MAX_WELCOME;
  const add = () => { const t = adding.trim(); if (!t || full) return; if (w.lines.some((l) => l.toLowerCase() === t.toLowerCase())) { toast('That line is already in the list.'); return; } onChange({ ...w, lines: [...w.lines, t] }); setAdding(''); };
  const missing = WELCOME_LINES.filter((l) => !w.lines.includes(l));
  return (
    <div className="card flush">
      <Row title="Change every day" sub={w.daily ? `A new line from your list each day (${w.lines.length} of ${MAX_WELCOME})` : 'Off: the line below shows every day'} right={<Switch on={w.daily} onChange={(daily) => onChange({ ...w, daily })} label="Change every day" />} />
      {!w.daily ? <div className="set" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}><b>Your line</b>
        <input type="text" maxLength={80} placeholder="Leave empty for no line" aria-label="Your welcome line" value={w.pick} onChange={(e) => onChange({ ...w, pick: e.target.value })} />
        <span className="tiny">Type your own, or tap one from the list.</span></div> : null}
      {w.lines.map((l) => (
        <div className={`set${!w.daily && w.pick === l ? ' picked' : ''}`} key={l}>
          {w.daily ? <span className="grow">{l}</span> : <button type="button" className="pick-plain grow" aria-pressed={w.pick === l} onClick={() => onChange({ ...w, pick: l })}>{w.pick === l ? '✓ ' : ''}{l}</button>}
          <button type="button" className="btn icon ghost" aria-label={`Delete "${l}"`} onClick={() => onChange({ ...w, lines: w.lines.filter((x) => x !== l) })}><Icon name="close" size={16} /></button>
        </div>
      ))}
      <div className="set" style={{ gap: 8 }}>
        <input type="text" maxLength={80} placeholder={full ? `The list is full (${MAX_WELCOME})` : 'Add your own line'} aria-label="Add a welcome line" disabled={full} value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        <button type="button" className="btn sm" disabled={full || !adding.trim()} onClick={add}>Add</button>
      </div>
      {missing.length ? <div className="set"><button type="button" className="link" onClick={() => onChange({ ...w, lines: [...w.lines, ...missing].slice(0, MAX_WELCOME) })}>Put the starting lines back ({missing.length})</button></div> : null}
    </div>
  );
}

export function LookScreen() {
  const { s, edit, top } = useSettingsDraft();
  const cur = accentOf(s);
  const { key: now, night } = themeNow(s);
  const [showing, setShowing] = useState<{ k: ThemeKey; night: boolean } | null>(null);
  return (
    <Screen narrow top={top('Look and colours', 'Back', 'Shown straight away. Save to keep it; leave without saving and it goes back.')}>
      <div className="lab">Theme</div>
      <div className="card stack">
        <div className="row wrap" style={{ alignItems: 'flex-start' }}><span className="grow"><b>Default theme</b><div className="m">{s.accent === 'blue' ? 'Plenty blue, sunset orange and white' : ACCENT_NAME[s.accent]}</div></span>
          <Info text="The default theme is Plenty Flow's own blue, orange and white. Pick another colour and holidays leave it alone: you still get their pictures, but not their colours." /></div>
        <div className="swatches">
          {Object.entries(ACCENT_HEX).map(([id, hexv]) => <div key={id}><button type="button" className={`swatch${s.accent === id ? ' on' : ''}`} style={{ background: hexv }} aria-label={ACCENT_NAME[id]} aria-pressed={s.accent === id} onClick={() => edit({ accent: id })} /><div style={{ marginTop: 8 }}>{ACCENT_NAME[id]}{s.accent === id ? ' ✓' : ''}</div></div>)}
          <div><label className={`swatch${s.accent === 'own' ? ' on' : ''}`} style={{ display: 'block', background: s.ownAccent || 'var(--tint)', border: s.ownAccent ? 0 : '2px dashed var(--input)', position: 'relative', overflow: 'hidden' }}><input type="color" aria-label="Your own colour" value={s.ownAccent || cur} onChange={(e) => edit({ accent: 'own', ownAccent: e.target.value })} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', minHeight: 0, padding: 0 }} /></label><div style={{ marginTop: 8 }}>Your own{s.accent === 'own' ? ' ✓' : ''}</div></div>
        </div>
      </div>
      <div className="lab">Welcome line</div>
      <WelcomeLines w={s.welcome} onChange={(welcome) => edit({ welcome })} />
      <div className="lab">Opening</div>
      <div className="card flush">
        <Row title="Opening animation" sub="The reformer jumps once when the app opens, about 3 seconds. Tap the screen to skip it. With Reduce Motion it's a still picture." right={<Switch on={s.opening} onChange={(on) => edit({ opening: on })} label="Opening animation" />} />
        <Row title="Holiday themes" sub="Christmas, New Year, Australia Day, Easter and Halloween, while each is on. On Plenty blue, the buttons and bars take its colours too." right={<Switch on={s.holidays} onChange={(on) => edit({ holidays: on })} label="Holiday themes" />} />
      </div>
      <div className="lab">See the animations</div>
      <div className="card flush">
        {THEME_ORDER.map((k) => (
          <div className="set anim-row" key={k}>
            <Picture className="thumb" theme={k} night={night} mode="panel" hidden />
            <span className="grow"><b>{THEMES[k].name}</b><div className="m">{k === 'default' ? 'The rest of the year' : WHEN[k]}{k === now ? <> · <b style={{ color: 'var(--accent)' }}>showing now</b></> : null}</div></span>
            <button type="button" className="btn sm" aria-label={`Play the ${THEMES[k].name} opening, day`} onClick={() => setShowing({ k, night: false })}>Day</button>
            <button type="button" className="btn sm" aria-label={`Play the ${THEMES[k].name} opening, night`} onClick={() => setShowing({ k, night: true })}>Night</button>
          </div>
        ))}
      </div>
      {!s.holidays ? <p className="tiny" style={{ padding: '0 4px' }}>Holiday themes are off, so the default shows all year. You can still watch them here.</p> : null}
      <div className="lab">Mode</div>
      <div className="card flush">
        <div className="set" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}><b>Light or dark</b>
          <div className="seg" role="group" aria-label="Mode" style={{ alignSelf: 'flex-start' }}>{([['auto', 'Match phone'], ['light', 'Light'], ['dark', 'Dark']] as const).map(([id, label]) => <button type="button" key={id} className={s.theme === id ? 'on' : ''} aria-pressed={s.theme === id} onClick={() => edit({ theme: id })}>{label}</button>)}</div>
          <span className="tiny">Light mode shows a theme's day picture, dark mode its night picture.</span></div>
        <Row title="True black in dark mode" sub="Easier on the battery of OLED screens" right={<Switch on={s.trueBlack} onChange={(on) => edit({ trueBlack: on })} label="True black in dark mode" />} />
        <Row title="Play screen always dark" sub="Easier to read across the room" right={<Switch on={s.playDark} onChange={(on) => edit({ playDark: on })} label="Play screen always dark" />} />
      </div>
      <div className="lab">App icon</div>
      <AppIconPicker />
      <p className="tiny center">Looks are kept on each device. They don't sync.</p>
      {showing ? <ThemePreview theme={showing.k} night={showing.night} onClose={() => setShowing(null)} /> : null}
    </Screen>
  );
}

const iconSrc = (id: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(id, 120))}`;
/** The home-screen icon: colours and holiday ones, picked by hand. It changes straight away (iOS
 *  shows its own message each time), so it sits outside Save. Per device, like the rest of Look. */
function AppIconPicker() {
  const picked = useData().settings.appIcon;
  const [can, setCan] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void currentIcon().then((now) => {
      if (!live) return;
      setCan(now !== null);
      // What the phone really shows wins (it can be reset by iOS, or changed in another version).
      if (now !== null && now !== getData().settings.appIcon) setSettings({ appIcon: now });
    });
    return () => { live = false; };
  }, []);
  const choose = async (id: string) => {
    if (busy || id === picked) return;
    if (!can) { toast('The icon changes in the iPhone and iPad app.'); return; }
    setBusy(true);
    try { setSettings({ appIcon: await switchIcon(id) }); } catch (e) { toast(`The icon didn't change. ${e instanceof Error ? e.message : ''}`.trim()); }
    setBusy(false);
  };
  const tile = (l: (typeof ICON_LOOKS)[number]) => (
    <button type="button" key={l.id || 'own'} className={`icon-pick${picked === l.id ? ' on' : ''}`} aria-pressed={picked === l.id} disabled={busy} onClick={() => void choose(l.id)}>
      <img src={iconSrc(l.id)} alt="" width={60} height={60} /><span>{l.name}{picked === l.id ? ' ✓' : ''}</span>
    </button>
  );
  return (
    <div className="card stack">
      <div className="icon-grid">{ICON_LOOKS.filter((l) => !l.holiday).map(tile)}</div>
      <b>Holidays</b>
      <div className="icon-grid">{ICON_LOOKS.filter((l) => l.holiday).map(tile)}</div>
      <span className="tiny">{can === false ? 'Pick one in the iPhone or iPad app. ' : ''}Changes straight away, no Save needed. Your iPhone shows a message each time the icon changes; that's iOS, and it can't be turned off. Holiday icons stay until you pick another.</span>
    </div>
  );
}

/** Accessibility, as in Restock (WCAG 2.2: text size, contrast, spacing, target size, motion, timing). */
export function A11yScreen() {
  const { s, edit, top } = useSettingsDraft();
  const a = s.a11y;
  const t = (key: keyof Settings['a11y'], title: string, sub: string) => <Row title={title} sub={sub} right={<Switch on={a[key]} onChange={(on) => edit({ a11y: { ...a, [key]: on } })} label={title} />} />;
  return (
    <Screen narrow top={top('Accessibility')}>
      <div className="lab">Seeing</div>
      <div className="card flush">
        <div className="set" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}><b>Text size in Plenty Flow</b>
          <Chips options={[{ id: 'normal', label: 'Normal' }, { id: 'large', label: 'Large' }, { id: 'larger', label: 'Larger' }]} value={s.textSize} onPick={(v) => edit({ textSize: v })} />
          <span className="tiny">On top of your phone's own text size. Everything grows together, so nothing gets cut off.</span></div>
        {t('bold', 'Bold text', 'Heavier letters everywhere, easier to read.')}
        {t('contrast', 'High contrast', 'Darker grey text and stronger outlines on cards, buttons and boxes.')}
        {t('spacing', 'Easier reading spacing', 'More space between letters, words and lines. Can help with dyslexia.')}
        {t('links', 'Underline links', 'Links are underlined, not just coloured.')}
      </div>
      <div className="lab">Moving and touching</div>
      <div className="card flush">
        {t('big', 'Bigger buttons', 'Every button and chip at least finger-sized.')}
        {t('motion', 'Less motion', 'No sliding or popping animations. Also done when your phone asks for less motion.')}
        {t('slowMessages', 'Messages stay longer', 'Messages at the bottom of the screen, and their Undo, stay three times as long.')}
      </div>
      <p className="tiny" style={{ padding: '0 4px' }}>Plenty Flow works with VoiceOver and with your iPhone's own text size and display settings. Every button says what it does.</p>
    </Screen>
  );
}

// ---- the guide, with links to each part of the app
function G({ t, children, go }: { t: string; children: ReactNode; go?: { label: string; route: Route | (() => void) }[] }) {
  return <div className="card stack-sm"><b>{t}</b>{children}{go?.length ? <div className="row wrap" style={{ gap: 10 }}>{go.map((g) => <button type="button" key={g.label} className="link" onClick={() => (typeof g.route === 'function' ? g.route() : nav.go(g.route))}>{g.label} →</button>)}</div> : null}</div>;
}
export function GuideScreen() {
  const st = usualStudio();
  const setup = (part?: string) => () => (st.id ? nav.go({ name: 'setup', studio: st.id, ...(part ? { part } : {}) }) : addStudio());
  return (
    <Screen narrow top={<><Back /><h1>Guide</h1><div className="m">The basics, in a minute each.</div></>}>
      <G t="Home" go={[{ label: 'Home', route: () => void nav.tab('home') }]}><p className="m">The first tab: your welcome, the classes coming up, and anything that needs you. Everything else is a tab away.</p></G>
      <G t="1. Your studio" go={[{ label: 'My studios', route: { name: 'studios' } }]}><p className="m">Add where you teach: its reformer and springs. Teach at more than one? Duplicate a studio, or import from one when you add the next.</p></G>
      <G t="2. Your first flow" go={[{ label: 'Class types', route: setup('types') }]}><p className="m">A flow is your plan for a class. Tap New flow, pick the kind of class, how long and what level, then build it step by step: pick the parts of the class in order, fill each one, and put it in order. Or switch off Build it step by step to go straight to the editor.</p></G>
      <G t="3. Build it" go={[{ label: 'Flows', route: () => void nav.tab('classes') }]}><p className="m">In a part, + Movement adds from the library (favourites, sections and search), + Block adds one of your saved blocks, and … lets you write one in your own words. Tap a movement to set its springs, reps, props, layers and easier or harder options. Make block gathers movements into a block you can save. Reorder moves movements and whole blocks. The numbers at the top check your time, spring changes and balance.</p></G>
      <G t="Paste from Notes" go={[{ label: 'Flows', route: () => void nav.tab('classes') }]}><p className="m">Flows → Import → Paste from Notes. Headings that end in ":" become parts, "- [ ]" lines are movements, indented lines under them are variations, and a line of spring letters (R, B, RB, R/RB) sets the springs for the movements below it. "Block: name" … "End block" makes a block, and "Prop:" lists props for the whole flow. Check what was found, then Make the flow. In a flow, Settings → Copy as text for Notes goes the other way.</p></G>
      <G t="4. Save"><p className="m">Nothing is kept until you tap Save. Back asks before you leave changes behind. In a flow, the arrows undo and redo.</p></G>
      <G t="5. Your roster" go={[{ label: 'Calendar', route: () => void nav.tab('calendar') }, { label: 'Saved shifts', route: { name: 'templates' } }]}><p className="m">Add the shifts you work, or save one like "Saturday mornings" and add it in a tap. Plan a flow for each class, cancel or cover a class, and write notes after. Turn on reminders and the timesheet if you want them.</p></G>
      <G t="6. Teach it"><p className="m">Tap Play. The app asks which studio you're at (or knows, from the calendar) and shows its springs. Tick each movement off as you go; ticks are kept for that day. Finishing marks it as taught.</p></G>
      <G t="7. Your iPad too" go={[{ label: 'Sync your devices', route: { name: 'sync' } }]}><p className="m">Pair your iPhone and iPad once with a QR code. Open the app on both and tap Sync. Each keeps everything.</p></G>
      <G t="8. Keep a backup" go={[{ label: 'Backups', route: { name: 'backups' } }]}><p className="m">Backups are made on the device each day. Save one somewhere else now and then: the app reminds you.</p></G>
      <G t="Words"><p className="m"><b>Flow:</b> your plan for a class. <b>Movement:</b> one move. <b>Block:</b> a sequence of movements you save and reuse. <b>Part:</b> a stretch of the class, like warm-up or arms. <b>Section:</b> what a movement works, like core or legs and glutes; movements are sorted and coloured by it. <b>Layer:</b> something built on with the whole class. <b>Easier ▼ / harder ▲:</b> options for anyone who needs them. <b>Series:</b> a ready-made run of movements. <b>Shift:</b> a block of classes on one day at one studio.</p></G>
      <G t="Make it easier to use" go={[{ label: 'Look and colours', route: { name: 'look' } }, { label: 'Accessibility', route: { name: 'a11y' } }]}><p className="m">Light or dark, bigger text, bold text, more contrast, bigger buttons, less motion.</p></G>
    </Screen>
  );
}

export function AboutScreen() {
  return (
    <Screen narrow top={<><Back /><h1>About</h1></>}>
      <div className="card stack-sm" style={{ alignItems: 'center', textAlign: 'center' }}><Badge size={120} words label="Plenty Flow Pilates" /><Wordmark badge={0} /></div>
      <div className="card stack-sm"><b>Version {APP_VERSION}</b><p className="m">Plenty Flow is a Pilates class planner for mat and reformer instructors: take your work with you to every studio. Free and open source (GPL-3.0). The movement library is under CC BY-SA 4.0.</p><p className="m">Source and updates: github.com/d-plenty/Plentyflowpilates</p></div>
      <div className="card stack-sm"><b>Privacy</b><p className="m">Everything you make stays on this device. There is no account, no ads and no tracking, and the app never contacts a server. A flow leaves the device only when you share it or save a backup somewhere yourself.</p><p className="m">The camera is used only to scan a sharing code. The local network is used only while a sharing code is on screen or being scanned.</p></div>
      <div className="card stack-sm"><b>Take care</b><p className="m">The starter library is a draft written for this app. It is a planning aid for qualified instructors, not teaching or medical advice. Check anything before you teach from it.</p></div>
      <div className="card stack-sm"><b>Made with</b><p className="m">React, Capacitor, zxing (QR codes), fflate, noble ciphers and hashes, and Inter. The calendar's views were inspired by Fossify Calendar (Simple Calendar); no code was copied.</p></div>
    </Screen>
  );
}
export const settingsNow = () => draftOf<Settings>(SETTINGS_KEY) || getData().settings;

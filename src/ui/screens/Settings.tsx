// The More tab, Settings, Look and colours, Accessibility, Your data, Sync, What's new, Coming soon,
// the guide and About. Laid out like Restock: groups of short rows, with search.
// Settings are edited as an unsaved copy until Save. Colours and dark mode show straight away
// and go back if the screen is left without saving.
import { useEffect, useState, type ReactNode } from 'react';
import { draftOf, editDraft, markSaved, openDraft } from '../../lib/drafts';
import { APP_VERSION, hasAnything } from '../../lib/files';
import { emptyData } from '../../lib/clean';
import { getData, replaceAll, setSettings, useData, usualStudio } from '../../lib/store';
import type { Data, Settings } from '../../lib/types';
import { addDays, dateOf, hoursText, money, monthEnd, monthStart, niceDate, slotTitle, studioName, today, totals, weekStart } from '../../lib/calendar';
import { copyBackupOff } from '../../lib/files';
import { canSendDirect } from '../../lib/send';
import { MAX_DEVICES, forgetDevice, isPairCode, joinWith, leaveGroup, offerPairing, stopSyncService, syncNow, type PairOffer } from '../../lib/lanSync';
import { Qr, Scanner } from '../Qr';
import { closeAllDrafts } from '../../lib/drafts';
import { Back, Chips, Group, Icon, Info, Row, RowSearch, SaveButton, Screen, Sheet, Switch, confirmAsk, toast, useEditing } from '../bits';
import { nav, type Route } from '../nav';
import { ACCENT_HEX, ACCENT_NAME, accentOf } from '../theme';
import { Badge, Wordmark } from '../Reformer';
import { addStudio } from './Studios';

export const SETTINGS_KEY = 'settings';
/** The settings being edited, with Save. Used by Settings, Look and colours, Accessibility and Backups. */
export function useSettingsDraft() {
  const d = useData();
  const s = draftOf<Settings>(SETTINGS_KEY) || openDraft(SETTINGS_KEY, d.settings);
  const save = () => { const x = draftOf<Settings>(SETTINGS_KEY); if (x) { setSettings(x); markSaved(SETTINGS_KEY); } return true; };
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

export function MoreScreen() {
  const d = useData();
  return (
    <Screen narrow top={<h1>More</h1>}>
      <RowSearch placeholder="Search More and Settings" />
      <Group title="Where you teach">
        <Row icon="home" title="My studios" sub={d.studios.length ? d.studios.map((s) => s.name).join(', ') : 'Set up where you teach'} words="reformer springs props class types levels focuses muscles positions" onClick={() => nav.go({ name: 'studios' })} />
        <Row icon="copy" title="Saved shifts" sub="Blocks of classes you work often" words="roster calendar" onClick={() => nav.go({ name: 'templates' })} />
        <Row icon="money" title="Timesheet" sub={d.settings.timesheet.on ? 'Hours and pay' : 'Hours by week and month'} words="pay invoice hours" onClick={() => nav.go({ name: 'timesheet' })} />
      </Group>
      <Group title="Your data">
        <Row icon="sync" title="Sync your devices" sub={syncText(d.device)} words="ipad iphone wifi pair" onClick={() => nav.go({ name: 'sync' })} />
        <Row icon="box" title="Backups" sub={lastBackupText(d.settings.lastBackup)} words="restore" onClick={() => nav.go({ name: 'backups' })} />
        <Row icon="share" title="Share, import and export" sub="Send a flow, bring one in, make files" words="qr code file pack ics calendar" onClick={() => nav.go({ name: 'share' })} />
        <Row icon="chart" title="Your data" sub="Hours this year, class notes, what's on this device" words="charts history notes" onClick={() => nav.go({ name: 'your-data' })} />
      </Group>
      <Group title="The app">
        <Row icon="cog" title="Settings" sub="Your name, look, accessibility, reminders, Play" words="dark mode colours text size" onClick={() => nav.go({ name: 'settings' })} />
        <Row icon="book" title="Guide" sub="How the app works" words="help" onClick={() => nav.go({ name: 'guide' })} />
        <Row icon="gift" title="What's new" sub={`In Plenty Flow ${APP_VERSION}`} onClick={() => nav.go({ name: 'whats-new' })} />
        <Row icon="spark" title="Coming soon" sub={SOON.slice(0, 3).map((x) => x.title).join(', ')} words="server android widgets watch" onClick={() => nav.go({ name: 'soon' })} />
        <Row icon="info" title="About" sub={`Version ${APP_VERSION} · privacy · free software`} words="privacy licence" onClick={() => nav.go({ name: 'about' })} />
      </Group>
    </Screen>
  );
}

export function SettingsScreen() {
  const { s, edit, top } = useSettingsDraft();
  const r = s.reminders;
  return (
    <Screen narrow top={top('Settings', 'More')}>
      <RowSearch placeholder="Search settings" />
      <Group title="You">
        <div className="set" data-words="name device sharing" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}><b>Your name</b><input type="text" maxLength={40} autoComplete="given-name" aria-label="Your name" value={s.deviceName} onChange={(e) => edit({ deviceName: e.target.value })} /><span className="tiny">For your welcome, and shown to people you share a flow with and on your other devices.</span></div>
      </Group>
      <Group title="Look and accessibility">
        <Row icon="palette" title="Look and colours" sub={`${s.theme === 'auto' ? 'Matches the device' : s.theme === 'dark' ? 'Dark' : 'Light'} · ${ACCENT_NAME[s.accent] || 'Plenty blue'}`} words="dark mode true black" onClick={() => nav.go({ name: 'look' })} />
        <Row icon="people" title="Accessibility" sub="Text size, bold text, contrast, bigger buttons, less motion" words="voiceover dyslexia" onClick={() => nav.go({ name: 'a11y' })} />
      </Group>
      <Group title="Teaching">
        <Row title="Keep the screen on in Play" right={<Switch on={s.keepAwake} onChange={(on) => edit({ keepAwake: on })} label="Keep the screen on in Play" />} />
        <Row title="Play screen always dark" sub="Easier to read across the room" right={<Switch on={s.playDark} onChange={(on) => edit({ playDark: on })} label="Play screen always dark" />} />
        <Row icon="bell" title="Reminders and iPhone Calendar" sub={[r.shift ? `${r.before ? `${r.before} min` : 'Right'} before a shift` : 'No shift reminders', r.nightBefore ? 'the night before' : '', s.phoneCalendar ? 'Calendar on' : ''].filter(Boolean).join(' · ')} words="notifications alerts" onClick={() => nav.go({ name: 'cal-settings' })} />
        <Row icon="money" title="Hours and pay" sub={s.timesheet.on ? `Pay on · ${s.timesheet.count === 'block' ? 'whole block' : 'class time'}` : 'Optional'} words="timesheet rate invoice" onClick={() => nav.go({ name: 'timesheet-setup' })} />
      </Group>
      <Group title="Your data">
        <Row icon="box" title="Backups" sub={s.autoBackup ? `Automatic · keeps the last ${s.keepBackups}` : 'Automatic backups are off'} onClick={() => nav.go({ name: 'backups' })} />
        <Row icon="calendar" title="Calendar history" sub={s.keepMonths ? `Kept for ${s.keepMonths < 12 ? `${s.keepMonths} months` : `${s.keepMonths / 12} year${s.keepMonths > 12 ? 's' : ''}`}` : 'Kept forever'} words="keep months retention" onClick={() => nav.go({ name: 'cal-settings' })} />
        <Row danger icon="trash" title="Erase everything" sub="Removes every flow, studio, shift and setting from this device" onClick={async () => {
          if (!(await confirmAsk('Erase everything on this device?', hasAnything() ? 'Your flows, studios, calendar, your own movements and settings are all removed. Backups already saved in Files are not touched. This cannot be undone.' : 'The app goes back to how it was when first opened.', 'Erase', true))) return;
          closeAllDrafts(); stopSyncService(); replaceAll(emptyData()); nav.reset(); toast('Erased.');
        }} />
      </Group>
      <Group title="Help">
        <Row icon="book" title="Guide" onClick={() => nav.go({ name: 'guide' })} />
        <Row icon="gift" title="What's new" onClick={() => nav.go({ name: 'whats-new' })} />
        <Row icon="info" title="About and privacy" sub={`Plenty Flow ${APP_VERSION} · everything stays on this device`} onClick={() => nav.go({ name: 'about' })} />
      </Group>
    </Screen>
  );
}

// ---- What's new, as in Restock: offered once after an update, and kept here
export const WHATS_NEW = {
  version: '0.4.0',
  about: 'Your roster on the calendar, sync between your iPhone and iPad, and a lot more you can change.',
  changes: [
    'Calendar: add the shifts you work, save them as "Saturday mornings" and add them in a tap, repeat them weekly, cancel or cover a class, and write notes after class.',
    'An optional timesheet with your hours each week and month, and your pay if you add a rate.',
    'Reminders before a shift, and the night before when a class has no flow yet. Your shifts can go into the iPhone Calendar app too.',
    "Sync your iPhones and iPads over Wi-Fi (up to 6). Each one keeps everything.",
    "Flows: favourites, tabs for taught and not taught, when each was last taught, an Import button, and today's and tomorrow's classes on the home screen.",
    'Movements (the Library tab, renamed): favourites, the muscle pictures are back, and figures have a face.',
    'Studios: copy one into a new studio, delete any level, suggested class types, your own positions, and boxes that turn red when something is missing.',
    'More and Settings are laid out like Restock, with search.',
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
      <p className="m">Want to see what changed? It's in More → What's new any time.</p>
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
        {offer ? <div className="card stack" style={{ alignItems: 'center', padding: 18 }}><Qr text={offer.code} label="A code for your other device to scan" /><b className="center">On your other device: More → Sync your devices → Scan a code</b><p className="m center">Keep this showing. The code works once, for 10 minutes.</p><button type="button" className="btn" onClick={() => { offer.stop(); setOffer(null); }}>Stop</button></div>
          : scanning ? <><Scanner accept={isPairCode} onCode={(c) => void join(c)} wrong="That isn't a Plenty Flow pairing code." /><button type="button" className="btn" onClick={() => setScanning(false)}>Stop</button></>
          : <div className="row"><button type="button" className="btn grow" disabled={!!busy || dv.devices.length >= MAX_DEVICES - 1} onClick={() => void showCode()}><Icon name="qr" size={18} />Show a code</button><button type="button" className="btn grow" disabled={!!busy} onClick={() => setScanning(true)}><Icon name="qr" size={18} />Scan a code</button></div>}
        {dv.key && dv.devices.length ? <button type="button" className="btn danger" onClick={async () => { if (await confirmAsk('Stop syncing this device?', 'It keeps everything it has. Your other devices keep theirs.', 'Stop syncing')) leaveGroup(); }}>Stop syncing this device</button> : null}
        <Row soon icon="server" title="Sync through a studio server" sub="Coming later" />
      </>}
    </Screen>
  );
}
export function LookScreen() {
  const { s, edit, top } = useSettingsDraft();
  const cur = accentOf(s);
  return (
    <Screen narrow top={top('Look and colours', 'Back', 'Shown straight away. Save to keep it; leave without saving and it goes back.')}>
      <div className="lab">Mode</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {([['light', 'Light', '#F3F5F4'], ['dark', 'Dark', '#111715'], ['auto', 'Match device', 'linear-gradient(90deg, #F3F5F4 50%, #111715 50%)']] as const).map(([id, label, bg]) => (
          <button type="button" key={id} className={`card pick${s.theme === id ? ' on' : ''}`} style={{ padding: 10, textAlign: 'center' }} aria-pressed={s.theme === id} onClick={() => edit({ theme: id })}><div style={{ height: 46, borderRadius: 8, background: bg, border: '1px solid var(--line)' }} /><b style={{ fontSize: 'calc(13px * var(--scale))' }}>{label}</b></button>
        ))}
      </div>
      <div className="lab">Colour</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, textAlign: 'center', fontSize: 'calc(12px * var(--scale))', fontWeight: 600 }}>
        {Object.entries(ACCENT_HEX).map(([id, hexv]) => <div key={id}><button type="button" className={`swatch${s.accent === id ? ' on' : ''}`} style={{ background: hexv }} aria-label={ACCENT_NAME[id]} aria-pressed={s.accent === id} onClick={() => edit({ accent: id })} /><div style={{ marginTop: 8 }}>{ACCENT_NAME[id]}{s.accent === id ? ' ✓' : ''}</div></div>)}
        <div><label className={`swatch${s.accent === 'own' ? ' on' : ''}`} style={{ display: 'block', background: s.ownAccent || 'var(--tint)', border: s.ownAccent ? 0 : '2px dashed var(--input)', position: 'relative', overflow: 'hidden' }}><input type="color" aria-label="Your own colour" value={s.ownAccent || cur} onChange={(e) => edit({ accent: 'own', ownAccent: e.target.value })} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', minHeight: 0, padding: 0 }} /></label><div style={{ marginTop: 8 }}>Your own{s.accent === 'own' ? ' ✓' : ''}</div></div>
      </div>
      <div className="lab">How it looks</div>
      <div className="card"><div className="row between"><b>Full body · Reformer Flow</b><span className="chip on">50 min</span></div>
        <div className="bar"><span style={{ flex: 5, background: '#8FB9AE' }} /><span style={{ flex: 16, background: 'var(--accent)' }} /><span style={{ flex: 8, background: 'var(--warn-dot)' }} /><span style={{ flex: 5, background: '#A7B5AF' }} /></div>
        <button type="button" className="btn p wide" style={{ marginTop: 12 }}>Add a block</button><div style={{ marginTop: 10 }}><span className="link">A link looks like this</span></div></div>
      <div className="card flush">
        <Row title="True black in dark mode" sub="Easier on the battery of OLED screens" right={<Switch on={s.trueBlack} onChange={(on) => edit({ trueBlack: on })} label="True black in dark mode" />} />
        <Row title="Play screen always dark" sub="Easier to read across the room" right={<Switch on={s.playDark} onChange={(on) => edit({ playDark: on })} label="Play screen always dark" />} />
        <Row soon title="App icon colour" sub="Follows your colour" />
      </div>
    </Screen>
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
      <G t="1. Your studio" go={[{ label: 'My studios', route: { name: 'studios' } }]}><p className="m">Add where you teach: its reformer and springs. Teach at more than one? Duplicate a studio, or import from one when you add the next.</p></G>
      <G t="2. Your first flow" go={[{ label: 'Class types', route: setup('types') }]}><p className="m">A flow is your plan for a class. The first one at a studio asks what kind of class it is, how long and what level, then opens the editor.</p></G>
      <G t="3. Build it" go={[{ label: 'Flows', route: () => void nav.tab('classes') }]}><p className="m">Tap Add a block to add a movement. Tap a block to set its springs, props, layers and easier or harder options. The numbers at the top check your time, spring changes and balance. Star the ones you love.</p></G>
      <G t="4. Save"><p className="m">Nothing is kept until you tap Save. Back asks before you leave changes behind. In a flow, the arrows undo and redo.</p></G>
      <G t="5. Your roster" go={[{ label: 'Calendar', route: () => void nav.tab('calendar') }, { label: 'Saved shifts', route: { name: 'templates' } }]}><p className="m">Add the shifts you work, or save one like "Saturday mornings" and add it in a tap. Plan a flow for each class, cancel or cover a class, and write notes after. Turn on reminders and the timesheet if you want them.</p></G>
      <G t="6. Teach it"><p className="m">Tap Play. The app asks which studio you're at (or knows, from the calendar) and shows its springs. Finishing marks it as taught.</p></G>
      <G t="7. Your iPad too" go={[{ label: 'Sync your devices', route: { name: 'sync' } }]}><p className="m">Pair your iPhone and iPad once with a QR code. Open the app on both and tap Sync. Each keeps everything.</p></G>
      <G t="8. Keep a backup" go={[{ label: 'Backups', route: { name: 'backups' } }]}><p className="m">Backups are made on the device each day. Save one somewhere else now and then: the app reminds you.</p></G>
      <G t="Words"><p className="m"><b>Flow:</b> your plan for a class. <b>Block:</b> one movement in a flow. <b>Part:</b> a stretch of the class, like warm-up. <b>Layer:</b> something built on with the whole class. <b>Easier ▼ / harder ▲:</b> options for anyone who needs them. <b>Series:</b> a ready-made run of movements. <b>Shift:</b> a block of classes on one day at one studio.</p></G>
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

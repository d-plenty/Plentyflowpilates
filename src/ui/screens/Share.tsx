// Share, import and export: sending a flow or a studio's set-up to someone (QR code over Wi-Fi, or a
// file), bringing one in, making files of your work, and backups.
import { useEffect, useRef, useState } from 'react';
import { backupNow, copyBackupOff, bringIn, classText, fileNameFor, FileProblem, ownMovementsOf, packText, readIncoming, restoreBackup, studioText, summarise, type Incoming, type Take } from '../../lib/files';
import { canSendDirect, deviceLan, fetchText, isSendCode, offerText, SendProblem, type Offer } from '../../lib/send';
import { deleteBackup, giveFile, listBackups, readBackup, type BackupFile } from '../../lib/storage';
import { getData, studioOf, useData } from '../../lib/store';
import { changeSlot, icsText, today } from '../../lib/calendar';
import { useSettingsDraft } from './Settings';
import { Back, Chips, Empty, Icon, Row, Screen, Sheet, Stepper, Switch, confirmAsk, toast } from '../bits';
import { nav } from '../nav';
import { Qr, Scanner } from '../Qr';

const words = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Looks at what came in and lets the person tick what to keep. */
/** `onFlow`: a single flow was brought in (covering a class: it goes straight onto that class). */
export function ImportSheet({ inc, onClose, onFlow }: { inc: Incoming; onClose: () => void; onFlow?: (id: string) => void }) {
  const sum = summarise(inc);
  const hasData = getData().classes.length > 0 || getData().studios.length > 0;
  const [take, setTake] = useState<Take>({ classes: true, movements: true, studios: inc.kind !== 'class', series: true });
  const [how, setHow] = useState<'add' | 'replace'>(hasData ? 'add' : 'replace');
  const done = async () => {
    try {
      if (inc.kind === 'backup') {
        if (how === 'replace' && hasData && !(await confirmAsk('Replace everything on this device?', 'Your classes, studios and settings here are swapped for what is in the backup. This cannot be undone.', 'Replace', true))) return;
        const r = restoreBackup(inc, how);
        toast(how === 'replace' ? 'Backup restored.' : `Added ${words(r.classes, 'class', 'classes')} from the backup.`);
        onClose(); nav.home('classes');
        return;
      }
      const r = bringIn(inc, take);
      const got = [r.classes ? words(r.classes, 'class', 'classes') : '', r.studios ? words(r.studios, 'studio') : '', r.movements ? words(r.movements, 'movement') : '', r.series ? `${r.series} series` : '', r.blocks ? words(r.blocks, 'block') : ''].filter(Boolean);
      toast(got.length ? `Brought in ${got.join(', ')}.${r.skipped ? ` ${r.skipped} already here were left alone.` : ''}` : 'Nothing new: it was all here already.');
      onClose();
      if (onFlow && r.firstClass) { onFlow(r.firstClass); return; }
      if (r.firstClass && r.classes === 1) nav.go({ name: 'class', id: r.firstClass }, 'classes'); else if (r.classes) nav.home('classes');
    } catch (e) { toast(e instanceof Error ? e.message : "Couldn't bring that in."); }
  };
  const tick = (k: keyof Take, label: string, sub: string) => <Row key={k} title={label} sub={sub} right={<Switch on={take[k]} onChange={(on) => setTake({ ...take, [k]: on })} label={label} />} />;
  return (
    <Sheet title={inc.kind === 'backup' ? 'Restore a backup' : inc.kind === 'pack' ? 'A pack' : inc.kind === 'studio' ? "A studio's set-up" : inc.kind === 'block' ? 'A block for you' : 'A flow for you'} onClose={onClose} foot={<><button type="button" className="btn grow" onClick={onClose}>Cancel</button><button type="button" className="btn p grow" onClick={() => void done()}>{inc.kind === 'backup' ? (how === 'replace' ? 'Restore' : 'Add') : 'Bring in'}</button></>}>
      <p className="m">{inc.from ? `From ${inc.from}` : 'From a file'}{inc.madeAt ? `, made ${new Date(inc.madeAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.</p>
      {inc.kind === 'backup' ? <>
        <div className="card flush"><Row title="In this backup" sub={[words(sum.classes, 'class', 'classes'), words(sum.studios, 'studio'), `${sum.movements} of your own movements`, `${sum.taught} taught`].join(' · ')} /></div>
        {hasData ? <><div className="lab">This device already has things on it</div><Chips options={[{ id: 'add', label: 'Add alongside' }, { id: 'replace', label: 'Replace everything' }]} value={how} onPick={(v) => setHow(v)} /><p className="tiny">{how === 'add' ? 'What is in the backup is added. A flow or movement that is already here is left as it is.' : 'Everything here is swapped for the backup.'}</p></> : null}
      </> : <>
        <div className="lab">Tick what to keep</div>
        <div className="card flush">
          {sum.classes ? tick('classes', words(sum.classes, 'class', 'classes'), inc.classes.slice(0, 3).map((c) => c.title).join(', ') + (sum.classes > 3 ? '…' : '')) : null}
          {sum.movements ? tick('movements', words(sum.movements, 'movement'), 'Made or changed by the sender. One that is already here is left alone.') : null}
          {sum.series || sum.blocks ? tick('series', [sum.series ? `${sum.series} series` : '', sum.blocks ? words(sum.blocks, 'block') : ''].filter(Boolean).join(' and '), sum.blocks ? inc.blocks.slice(0, 3).map((b) => b.name).join(', ') + (sum.blocks > 3 ? '…' : '') : 'Ready-built runs of movements') : null}
          {sum.studios ? tick('studios', words(sum.studios, 'studio'), inc.studios.map((s) => s.name).join(', ')) : null}
        </div>
        <p className="tiny">Springs show in your own studio's colours, whatever the sender uses.</p>
      </>}
    </Sheet>
  );
}

function useImport() {
  const [inc, setInc] = useState<Incoming | null>(null);
  const read = (text: string, from?: string) => { try { const i = readIncoming(text); setInc(from && !i.from ? { ...i, from } : i); } catch (e) { toast(e instanceof FileProblem ? e.message : "That file couldn't be read."); } };
  return { inc, read, close: () => setInc(null) };
}
function FileButton({ onText, label }: { onText: (text: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (<>
    <input ref={ref} type="file" accept=".json,application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (f.size > 40 * 1024 * 1024) { toast('That file is too big to be a Plenty Flow file.'); return; } onText(await f.text()); }} />
    <button type="button" className="btn wide" onClick={() => ref.current?.click()}>{label}</button>
  </>);
}

export function ShareScreen({ classId, studioId, part, forSlot }: { classId?: string; studioId?: string; part?: string; forSlot?: { shiftId: string; slotId: string } }) {
  const d = useData();
  const plan = classId ? d.classes.find((c) => c.id === classId) : undefined;
  const studio = studioId ? d.studios.find((s) => s.id === studioId) : plan ? studioOf(plan.studioId) : undefined;
  const sending = !!plan || (!!studioId && !!studio);
  const [mode, setMode] = useState<'qr' | 'file' | 'receive'>(sending ? (canSendDirect() ? 'qr' : 'file') : 'receive');
  const [withMoves, setWithMoves] = useState(true);
  const [withStudio, setWithStudio] = useState(false);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [problem, setProblem] = useState('');
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const imp = useImport();
  const [section, setSection] = useState<'share' | 'import' | 'export'>(part === 'import' || forSlot ? 'import' : part === 'export' ? 'export' : 'share');
  const own = plan ? ownMovementsOf(plan).length : 0;
  const text = () => (plan ? classText(plan, studio, { movements: withMoves, studio: withStudio }) : studio ? studioText(studio) : '');
  const what = plan ? plan.title : studio ? `${studio.name} set-up` : '';

  // The code is made when the QR tab is showing, and stops when you leave or change what is sent.
  useEffect(() => {
    if (!sending || mode !== 'qr') return;
    const lan = deviceLan();
    if (!lan) return;
    let mine: Offer | null = null;
    let gone = false;
    setProblem(''); setProgress(0);
    offerText(lan, text(), { name: d.settings.deviceName, what }, setProgress).then((o) => {
      if (gone) { o.stop(); return; }
      mine = o; setOffer(o);
      void o.done.then((how) => { if (gone) return; setOffer(null); if (how === 'sent') { toast('Sent.'); nav.back(); } else if (how === 'expired') setProblem('The code ran out after 10 minutes. Open this screen again for a new one.'); });
    }).catch((e) => setProblem(e instanceof SendProblem ? e.message : "Couldn't start sharing over Wi-Fi."));
    return () => { gone = true; mine?.stop(); setOffer(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, withMoves, withStudio, classId, studioId]);

  const receive = async (code: string) => {
    const lan = deviceLan();
    setScanning(false);
    if (!lan) return;
    setBusy(true); setProgress(0);
    try { const r = await fetchText(lan, code, setProgress); imp.read(r.text, r.from); } catch (e) { toast(e instanceof SendProblem ? e.message : "Couldn't receive that."); } finally { setBusy(false); }
  };

  return (
    <Screen narrow top={<><Back /><h1>{plan ? 'Share this flow' : sending ? 'Share this studio' : forSlot ? 'Bring in their flow' : 'Share, import and export'}</h1>{sending ? <div className="m">{what}</div> : forSlot ? <div className="m">Their flow goes straight onto the class you're covering.</div> : null}</>}>
      {sending ? <Chips options={[{ id: 'qr', label: 'QR code' }, { id: 'file', label: 'Send a file' }]} value={mode} onPick={(m) => setMode(m)} /> : null}
      {sending && mode === 'qr' ? (
        canSendDirect() ? (
          <div className="card stack" style={{ alignItems: 'center', padding: 18 }}>
            {offer ? <Qr text={offer.code} label="A code for the other device to scan" /> : <div className="qr" />}
            {problem ? <p className="warn-text center">{problem}</p> : <><b className="center">Ask them to scan this in Plenty Flow</b><p className="m center">Flows → Import → Scan a code. You both need to be on the same Wi-Fi. It goes straight from this device to theirs, encrypted, and the code works once.</p></>}
            {progress > 0 && progress < 1 ? <p className="m">Sending… {Math.round(progress * 100)}%</p> : null}
          </div>
        ) : <div className="card"><b>Sharing by QR code needs the app on an iPhone or iPad</b><p className="m" style={{ marginTop: 6 }}>In a web browser, send a file instead.</p></div>
      ) : null}
      {sending && mode === 'file' ? (
        <div className="card stack"><p className="m">Makes one file to send by AirDrop, Messages or email. The other teacher opens it from Flows → Import.</p>
          <button type="button" className="btn p" onClick={() => void giveFile(fileNameFor(plan ? plan.title : studio!.name, plan ? 'class' : 'studio'), text()).catch(() => toast("Couldn't make the file."))}>Make the file</button></div>
      ) : null}
      {plan ? <>
        <div className="lab">What goes with it</div>
        <div className="card flush">
          <Row title="The flow" sub="Blocks, layers, timings and your notes" right={<span className="tag acc">Always</span>} />
          <Row title="Movements you made or changed" sub={own ? `${own} used in this flow` : 'None in this flow'} right={<Switch on={withMoves && own > 0} onChange={setWithMoves} label="Movements you made or changed" />} />
          {studio && studio.id ? <Row title={`${studio.name}'s set-up`} sub="Reformer, springs and props" right={<Switch on={withStudio} onChange={setWithStudio} label="The studio's set-up" />} /> : null}
        </div>
        <p className="tiny">Your calendar, favourites and taught log are never sent.</p>
      </> : null}
      {!sending ? <>
        {!forSlot ? <Chips options={[{ id: 'share', label: 'Share' }, { id: 'import', label: 'Import' }, { id: 'export', label: 'Export' }]} value={section} onPick={setSection} /> : null}
        {section === 'share' ? <>
          <p className="m">Send a flow or a studio's set-up to someone else's Plenty Flow, by QR code on the same Wi-Fi or as a file.</p>
          <div className="card flush">
            <Row icon="classes" title="A flow" sub="Open the flow, then the share button at the top" onClick={() => void nav.home('classes')} />
            <Row icon="home" title="A studio's set-up" sub="Open the studio, then Share this studio's set-up" onClick={() => nav.go({ name: 'studios' })} />
            <Row icon="server" title="A pack" sub="A studio, your own movements and series, and flows, in one file" onClick={() => nav.go({ name: 'pack' })} />
          </div>
          <div className="card flush"><Row icon="sync" title="Your own iPhone and iPad" sub="Use Sync your devices instead: it keeps them the same" onClick={() => nav.go({ name: 'sync' })} /></div>
        </> : null}
        {section === 'import' ? <>
          <div className="card stack">
            <b>From another device, over Wi-Fi</b>
            {scanning ? <><Scanner accept={isSendCode} onCode={(c) => void receive(c)} wrong="That isn't a Plenty Flow sharing code." /><button type="button" className="btn" onClick={() => setScanning(false)}>Stop</button></>
              : busy ? <><p className="m">Receiving… {Math.round(progress * 100)}%</p><div className="progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div></>
              : canSendDirect() ? <button type="button" className="btn p" onClick={() => setScanning(true)}><Icon name="qr" size={18} />Scan a code</button>
              : <p className="m">Scanning a code needs the app on an iPhone or iPad. In a web browser, open a file instead.</p>}
          </div>
          <div className="card stack">
            <b>From a file</b><p className="m">A flow or studio someone sent you, a pack, or a backup.</p>
            <FileButton label="Choose a file" onText={(t) => imp.read(t)} />
          </div>
          {!forSlot ? <div className="card flush"><Row icon="calendar" title="A calendar file (.ics)" sub="In Settings → Calendar" onClick={() => nav.go({ name: 'cal-settings' })} /></div> : null}
        </> : null}
        {section === 'export' ? <div className="card flush">
          <Row icon="box" title="Everything, as a backup file" sub="Flows, studios, movements, calendar and settings" onClick={() => void copyBackupOff().then(() => toast('Backup saved off this device.')).catch(() => undefined)} />
          <Row icon="server" title="A pack" sub="A studio's set-up, your own movements and series, and flows" onClick={() => nav.go({ name: 'pack' })} />
          <Row icon="calendar" title="Your calendar (.ics)" sub="For Google, Outlook or Apple calendars" onClick={() => void giveFile(`plentyflow-calendar-${today()}.ics`, icsText()).catch(() => undefined)} />
          <Row icon="money" title="A timesheet" sub="Hours (and pay) for a month" onClick={() => nav.go({ name: 'timesheet' }, 'calendar')} />
          <Row icon="chart" title="Your data" sub="Hours this year, notes, and what's on this device" onClick={() => nav.go({ name: 'your-data' })} />
        </div> : null}
      </> : null}
      {imp.inc ? <ImportSheet inc={imp.inc} onClose={imp.close} onFlow={forSlot ? (id) => { changeSlot(forSlot.shiftId, forSlot.slotId, (k) => { k.flowId = id; }); toast('Their flow is on the class now.'); nav.backNow(); } : undefined} /> : null}
    </Screen>
  );
}

export function BackupsScreen() {
  const sd = useSettingsDraft();
  const d = useData();
  const [files, setFiles] = useState<BackupFile[] | null>(null);
  const imp = useImport();
  const refresh = () => void listBackups().then(setFiles).catch(() => setFiles([]));
  useEffect(refresh, []);
  const last = d.settings.lastBackup ? new Date(d.settings.lastBackup).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never';
  return (
    <Screen narrow top={<>{sd.top('Backups', 'Back')}<div className="m">Everything is kept on this device only. A backup is your safety net if the app is deleted or the device is lost.</div></>}>
      <div className="card flush">
        <Row title="Back up automatically" sub={`When you open the app, about once a day. Last backup: ${last}.`} right={<Switch on={sd.s.autoBackup} onChange={(on) => sd.edit({ autoBackup: on })} label="Back up automatically" />} />
        <Row title="Backups to keep" sub="Older ones are removed" right={<Stepper value={sd.s.keepBackups} min={1} max={30} label="backup" onChange={(n) => sd.edit({ keepBackups: n })} />} />
        <Row icon="box" title="Back up now" onClick={() => void backupNow().then(() => { toast('Backed up.'); refresh(); }).catch(() => toast("Couldn't write the backup."))} />
        <Row icon="share" title="Save a backup somewhere else" sub="AirDrop, Files, email: a copy off this device" onClick={() => void copyBackupOff().then(() => toast('Backup saved off this device.')).catch(() => undefined)} />
      </div>
      <p className="tiny" style={{ padding: '0 4px' }}>On an iPhone or iPad the backups are in Files → On My iPhone → Plenty Flow → Plenty Flow backups. Copy one to iCloud Drive or a computer now and then: backups kept only on the device go with it.</p>
      <div className="lab">On this device</div>
      {files === null ? <p className="m">Looking…</p> : files.length ? <div className="card flush">{files.map((f) => (
        <div className="set" key={f.name}><span className="grow"><b>{f.name.replace('plentyflow-backup-', '').replace('.json', '')}</b><div className="m">{Math.max(1, Math.round(f.bytes / 1024))} KB</div></span>
          <button type="button" className="btn sm" onClick={async () => { const t = await readBackup(f.name); if (t) imp.read(t); else toast("Couldn't read that backup."); }}>Restore</button>
          <button type="button" className="btn sm danger" onClick={async () => { if (await confirmAsk('Delete this backup?', f.name, 'Delete', true)) { await deleteBackup(f.name); refresh(); } }}>Delete</button></div>
      ))}</div> : <Empty title="No backups yet" text="One is made the next time you open the app, or tap Back up now." />}
      <FileButton label="Restore from a file" onText={(t) => imp.read(t)} />
      {imp.inc ? <ImportSheet inc={imp.inc} onClose={() => { imp.close(); refresh(); }} /> : null}
    </Screen>
  );
}

/** Making a pack: moving your work, or handing it to a co-worker. */
export function PackScreen() {
  const d = useData();
  const [studioId, setStudioId] = useState(d.settings.usualStudio || d.studios[0]?.id || '');
  const [classes, setClasses] = useState<'all' | 'studio' | 'none'>('studio');
  const studio = d.studios.find((s) => s.id === studioId);
  const here = d.classes.filter((c) => c.studioId === studioId).length;
  return (
    <Screen narrow top={<><Back /><h1>Make a pack</h1><div className="m">One file with a studio's set-up and reformers, your own and changed movements, your series and the flows you choose. Another Plenty Flow app can bring it in.</div></>}
      foot={<button type="button" className="btn p grow" disabled={!studio} onClick={() => { if (studio) void giveFile(fileNameFor(studio.name, 'pack'), packText(studio, { classes })).catch(() => toast("Couldn't make the file.")); }}><Icon name="share" size={18} />Make the pack</button>}>
      {!d.studios.length ? <Empty title="No studios yet" text="A pack is built around a studio. Add one in More → My studios." /> : <>
        <div><div className="lab">Studio</div><div style={{ marginTop: 8 }}><Chips options={d.studios.map((s) => ({ id: s.id, label: s.name }))} value={studioId} onPick={setStudioId} /></div></div>
        <div><div className="lab">Flows</div><div style={{ marginTop: 8 }}><Chips options={[{ id: 'studio', label: `Planned for ${studio?.name || 'it'} (${here})` }, { id: 'all', label: `All (${d.classes.length})` }, { id: 'none', label: 'None' }]} value={classes} onPick={(v) => setClasses(v as typeof classes)} /></div></div>
        <div className="card stack-sm"><b>Also in the pack</b><div className="m">{Object.keys(d.movements).length} movements you made or changed · {d.series.length} series of your own · what you took out of the library</div></div>
      </>}
    </Screen>
  );
}

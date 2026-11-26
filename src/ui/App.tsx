// The frame of the app: the tab bar (a sidebar on an iPad), and which screen is showing.
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import { backupIfDue } from '../lib/files';
import { flushSave, getData, saveError, useData } from '../lib/store';
import { Icon, Overlays, Spot } from './bits';
import { useDrafts } from '../lib/drafts';
import { nav, useNav, type Route, type Tab } from './nav';
import { AnalysisScreen, BlockScreen, BuilderScreen, RunSheetScreen } from './screens/Builder';
import { CalendarScreen, CalendarSettingsScreen, DayScreen, ShiftScreen, TemplateScreen, TemplatesScreen, TimesheetScreen, TimesheetSetupScreen } from './screens/Calendar';
import { ClassesScreen, NewClassScreen } from './screens/Classes';
import { HomeScreen } from './screens/Home';
import { SetupScreen } from './screens/ClassSetup';
import { LibraryScreen, MovementEditScreen, MovementScreen, SeriesScreen } from './screens/Library';
import { PlayHost } from './screens/Play';
import { A11yScreen, AboutScreen, GuideScreen, LookScreen, MoreScreen, SettingsScreen, SoonScreen, SyncScreen, WhatsNewPrompt, WhatsNewScreen, YourDataScreen, settingsNow } from './screens/Settings';
import { pruneHistory } from '../lib/calendar';
import { onReminderTap, refreshNow, refreshSoon } from '../lib/reminders';
import { startSyncService, syncNow, whenSyncedByOthers } from '../lib/lanSync';
import { toast } from './bits';
import { BackupsScreen, PackScreen, ShareScreen } from './screens/Share';
import { StudioScreen, StudiosScreen } from './screens/Studios';
import { Welcome } from './screens/Welcome';
import { Opening, useToday } from './Picture';
import { Wordmark } from './Reformer';
import { applyTheme } from './theme';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'classes', label: 'Flows', icon: 'classes' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'library', label: 'Movements', icon: 'library' },
  { id: 'more', label: 'More', icon: 'more' },
];

/** A screen that breaks shows a way back instead of a blank app. Nothing saved is lost. */
class Guard extends Component<{ children: ReactNode }, { problem: string }> {
  state = { problem: '' };
  static getDerivedStateFromError(e: unknown) { return { problem: e instanceof Error ? e.message : String(e) }; }
  render() {
    if (!this.state.problem) return this.props.children;
    return <div className="screen"><div className="body"><div className="card stack-sm"><b>This screen hit a problem</b><p className="m">Your classes are safe. Go back and try again; if it keeps happening, tell us what you tapped and include this line:</p><p className="tiny" style={{ wordBreak: 'break-word' }}>{this.state.problem}</p><button type="button" className="btn p" onClick={() => { nav.reset(); this.setState({ problem: '' }); }}>Back to the start</button></div></div></div>;
  }
}

function screenFor(tab: Tab, r?: Route) {
  const id = String(r?.id || '');
  switch (r?.name) {
    case 'new': return <NewClassScreen shiftId={r.shiftId as string | undefined} slotId={r.slotId as string | undefined} date={r.date as string | undefined} />;
    case 'day': return <DayScreen date={String(r.date)} />;
    case 'shift': return <ShiftScreen id={id} date={r.date as string | undefined} template={r.template as string | undefined} />;
    case 'templates': return <TemplatesScreen />;
    case 'template': return <TemplateScreen id={id} />;
    case 'timesheet': return <TimesheetScreen />;
    case 'timesheet-setup': return <TimesheetSetupScreen />;
    case 'cal-settings': return <CalendarSettingsScreen />;
    case 'class': return <BuilderScreen id={id} />;
    case 'block': return <BlockScreen id={id} itemId={String(r.item)} />;
    case 'analysis': return <AnalysisScreen id={id} />;
    case 'sheet': return <RunSheetScreen id={id} />;
    case 'movement': return <MovementScreen slug={id} />;
    case 'movement-edit': return <MovementEditScreen slug={id || undefined} />;
    case 'series': return <SeriesScreen slug={id} />;
    case 'studios': return <StudiosScreen />;
    case 'studio': return <StudioScreen id={id} />;
    case 'setup': return <SetupScreen studio={String(r.studio || '')} part={r.part as string | undefined} id={id || undefined} />;
    case 'a11y': return <A11yScreen />;
    case 'pack': return <PackScreen />;
    case 'share': return <ShareScreen classId={r.classId as string | undefined} studioId={r.studioId as string | undefined} part={r.part as string | undefined} forSlot={r.shiftId ? { shiftId: String(r.shiftId), slotId: String(r.slotId) } : undefined} />;
    case 'backups': return <BackupsScreen />;
    case 'settings': return <SettingsScreen />;
    case 'look': return <LookScreen />;
    case 'guide': return <GuideScreen />;
    case 'about': return <AboutScreen />;
    case 'sync': return <SyncScreen />;
    case 'your-data': return <YourDataScreen />;
    case 'soon': return <SoonScreen />;
    case 'whats-new': return <WhatsNewScreen />;
    default: return tab === 'home' ? <HomeScreen /> : tab === 'classes' ? <ClassesScreen /> : tab === 'calendar' ? <CalendarScreen /> : tab === 'library' ? <LibraryScreen /> : <MoreScreen />;
  }
}

export function App() {
  useData();
  const n = useNav();
  useDrafts();
  // Look and colours show straight away while they are being edited, before Save.
  const look = settingsNow();
  const today = useToday();
  useEffect(() => { applyTheme(look); }, [look, today]);
  useEffect(() => {
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    const on = () => applyTheme(settingsNow());
    mq?.addEventListener('change', on);
    return () => mq?.removeEventListener('change', on);
  }, []);
  const d = useData();
  // Save straight away when the app goes to the background, and back up when it opens or returns.
  useEffect(() => {
    const vis = () => { if (document.visibilityState === 'hidden') void flushSave(); else void backupIfDue().catch(() => undefined); };
    document.addEventListener('visibilitychange', vis);
    void backupIfDue().catch(() => undefined);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);
  // Reminders and the iPhone Calendar follow the calendar, a moment after each change.
  useEffect(() => { if (d.settings.welcomed) refreshSoon(); }, [d.shifts, d.settings.reminders, d.settings.phoneCalendar, d.classes, d.studios, d.settings.welcomed]);
  // When the app opens: clear old calendar history, listen for your other devices, and sync with any that are open.
  useEffect(() => {
    pruneHistory();
    void refreshNow();
    onReminderTap((to) => {
      if (to.route === 'shift' && to.id) void nav.home('calendar').then(() => nav.go({ name: 'shift', id: to.id }, 'calendar'));
      if (to.route === 'new' && to.shiftId) void nav.home('classes').then(() => nav.go({ name: 'new', shiftId: to.shiftId, slotId: to.slotId }, 'classes'));
    });
    whenSyncedByOthers((name, changed) => { if (changed) toast(`Synced with ${name}.`); });
    const quietSync = () => { if (!getData().device.key || !getData().device.devices.length) return; void startSyncService().then(() => syncNow()).then((r) => { const got = r.synced.filter((x) => x.changed); if (got.length) toast(`Synced with ${got.map((x) => x.name).join(', ')}.`); }).catch(() => undefined); };
    quietSync();
    const back = () => { if (document.visibilityState === 'visible') { pruneHistory(); quietSync(); } };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, []);
  const [opening, setOpening] = useState(() => d.settings.opening);
  const opened = useCallback(() => setOpening(false), []);
  if (opening) return <div className="app"><Opening onDone={opened} /></div>;
  if (!d.settings.welcomed) return <div className="app"><Welcome /><Overlays /></div>;
  const stack = n.stacks[n.tab];
  const top = stack[stack.length - 1];
  // Each screen gets its own key, so opening another class never shows the last one's leftovers.
  const key = `${n.tab}:${stack.length}:${top?.name || 'root'}:${top?.id || ''}:${String(top?.item || top?.part || '')}`;
  return (
    <div className="app">
      <div className="shell">
        <nav className="sidebar" aria-label="Main">
          <div className="brand"><Wordmark badge={34} /></div>
          {TABS.map((t) => <button type="button" key={t.id} className={n.tab === t.id ? 'cur' : ''} aria-current={n.tab === t.id ? 'page' : undefined} onClick={() => void nav.tab(t.id)}><Icon name={t.icon} />{t.label}</button>)}
        </nav>
        <div className="pane with-tabs" key={key}><Spot.Provider value={{ tab: n.tab, depth: stack.length }}><Guard>{screenFor(n.tab, top)}</Guard></Spot.Provider></div>
      </div>
      {saveError() ? <div className="card" role="alert" style={{ margin: 8, background: 'var(--warn-bg)', borderColor: 'var(--warn-line)', color: 'var(--warn)' }}>Your last change couldn't be saved to this device: {saveError()}</div> : null}
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => <button type="button" key={t.id} className={n.tab === t.id ? 'cur' : ''} aria-current={n.tab === t.id ? 'page' : undefined} onClick={() => void nav.tab(t.id)}><span className="tab-ic"><Icon name={t.icon} size={22} /></span>{t.label}</button>)}
      </nav>
      <PlayHost />
      <WhatsNewPrompt />
      <Overlays />
    </div>
  );
}

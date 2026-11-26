// The shapes of everything the app keeps. A flow is called a ClassPlan in the code.

export type Level = 'xlight' | 'light' | 'medium' | 'heavy' | 'xheavy';

export interface Layer { tag?: string; title?: string; text?: string }
export interface Variation { name: string; kind?: string; springs?: string[]; note?: string; [k: string]: unknown }
export interface Caution { tag: string; severity?: string; note?: string; swap?: string }

export interface Movement {
  slug: string;
  name: string;
  aka?: string[];
  apparatus: 'reformer' | 'mat';
  section?: string;
  level?: string;
  levelTo?: string;
  pose?: string;
  position?: string;
  spine?: string[];
  muscles?: { primary?: string[]; secondary?: string[] };
  equipment?: string[];
  /** null on the mat. */
  load?: { springs?: string[]; advance?: string[]; flexible?: boolean; lighterIsHarder?: boolean; note?: string } | null;
  setup?: { headrest?: string; straps?: string };
  duration?: number;
  reps?: string;
  summary?: string;
  steps?: string[];
  /** One cue per line. */
  cues?: string;
  purpose?: Record<string, number>;
  perSide?: boolean;
  categories?: string[];
  layers?: Layer[];
  variations?: Variation[];
  cautions?: Caution[];
  uses?: string[];
  intensity?: number;
  retired?: boolean;
  /** Not offered anywhere, but a class that uses it still opens. */
  hidden?: boolean;
  /** 'library' ships with the app; 'mine' was made or changed on this device. */
  source?: 'library' | 'mine';
  check?: { status?: string };
  [k: string]: unknown;
}

export interface BlockOption { id: string; kind: string; title: string; springs?: string[]; slug?: string; note?: string }
export interface Item {
  id: string;
  slug?: string;
  /** A timed line: time in the plan that is not a movement. */
  pause?: boolean;
  label?: string;
  duration?: number;
  reps?: string;
  variation?: string;
  layers?: (string | { text: string })[];
  finisher?: string;
  options?: BlockOption[];
  note?: string;
  load?: { springs: string[] };
  /** Props added to this block on top of what the movement needs (ids from the studio's list, or the class's own). */
  props?: string[];
}
export interface Segment { id: string; name: string; role: string; minutes?: number; bothSides?: boolean; song?: string; items: Item[] }

export interface ClassPlan {
  id: string;
  title: string;
  apparatus: 'reformer' | 'mat' | 'mixed';
  level: string;
  lengthMin: number;
  goal?: string;
  focusText?: string;
  noPhases?: boolean;
  target?: string;
  classType?: string;
  springBudget?: number;
  /** The studio it was planned at. Teaching it somewhere else shows that studio's springs. */
  studioId?: string;
  /** A favourite: stays easy to find after it has been taught. */
  fav?: boolean;
  notes?: string;
  segments: Segment[];
  createdAt: string;
  updatedAt: string;
  /** Came from another teacher. */
  from?: string;
  /** Props named in this class that its studio's list doesn't have. */
  extraProps?: Named[];
}

export interface Studio {
  id: string;
  name: string;
  /** A studio with no reformers is a mat-only space. */
  hasReformers: boolean;
  brand: string;
  reformers: number;
  springs: Record<string, number>;
  springOverrides: Record<string, { name: string; short: string; color: string }>;
  /** Props it has, by id, and how many. */
  props: Record<string, number>;
  /** How classes are set up here: class types, levels, focuses, timing, parts of the class, lists. */
  setup: Setup;
  updatedAt: string;
}

export interface Phase { name: string; role: string; minutes: number; sections?: string[]; positions?: string[] }
export interface ClassType { id: string; name: string; apparatus: 'reformer' | 'mat'; lengthMin: number; springBudget: number; note?: string; level?: string; target?: string; timing?: Record<string, number>; noPhases?: boolean; phases: Phase[] }
export interface ClassLevel { id: string; label: string; from: number; to: number }
export interface TimingRow { id: string; label: string; note?: string; seconds: number; off?: boolean }
export interface Focus { id: string; label: string; muscles: string[]; purpose?: string; maxIntensity?: number; avoid?: string[] }
export interface Named { id: string; label: string; group?: string }

/** How classes are set up at one studio. */
export interface Setup {
  levels: ClassLevel[];
  classTypes: ClassType[];
  lengths: number[];
  defaultLength: number;
  timingRows: TimingRow[];
  timing: Record<string, number>;
  focuses: Focus[];
  targets: Record<string, { label: string; [k: string]: unknown }>;
  customProps: Named[];
  removedProps: string[];
  customMuscles: Named[];
  removedMuscles: string[];
  customCautions: Named[];
  removedCautions: string[];
  customSections: Named[];
  removedSections: string[];
  customPositions: Named[];
  removedPositions: string[];
  sectionLabels: Record<string, string>;
  sectionMap: Record<string, string>;
}

export interface Taught { id: string; classId: string; title: string; at: string; studioId?: string; studioName?: string; minutes: number; shiftId?: string; slotId?: string }

/** One class inside a shift on the calendar. */
export interface Slot {
  id: string;
  /** "07:00", local time. */
  start: string;
  lengthMin: number;
  classType?: string;
  /** The flow planned for it. */
  flowId?: string;
  cancelled?: boolean;
  /** Covering for someone: their name. */
  cover?: string;
  /** Notes after the class, for next time. */
  note?: string;
  /** Marked as taught. */
  taughtAt?: string;
}
/** A block of classes on one day at one studio: "Saturday mornings". */
export interface Shift {
  id: string;
  /** "2026-11-28", local date. */
  date: string;
  name: string;
  studioId?: string;
  slots: Slot[];
  cancelled?: boolean;
  note?: string;
  /** Shifts made together by "repeat weekly" share this. */
  repeatId?: string;
  updatedAt: string;
}
/** A saved shift to add again and again. No studio: it can be used at any studio. */
export interface ShiftTemplate {
  id: string;
  name: string;
  studioId?: string;
  start: string;
  gapMin: number;
  slots: { lengthMin: number; classType?: string }[];
  updatedAt: string;
}
/** Another of your own devices this one syncs with. */
export interface Device { id: string; name: string; lastSync?: string }
export interface Series { slug: string; name: string; apparatus: string; aka?: string[]; summary?: string; items: { slug: string; variation?: string; duration?: number; reps?: string }[]; source?: 'library' | 'mine' }

export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  accent: string;
  /** A colour of the person's own, when accent is 'own'. */
  ownAccent?: string;
  /** Holiday themes: Christmas, New Year, Australia Day, Easter and Halloween, each while it's on. */
  holidays: boolean;
  /** The opening: one jump off the jump board when the app opens. */
  opening: boolean;
  trueBlack: boolean;
  playDark: boolean;
  keepAwake: boolean;
  textSize: 'normal' | 'large' | 'larger';
  /** Accessibility, as in Restock. */
  a11y: { bold: boolean; contrast: boolean; spacing: boolean; links: boolean; big: boolean; motion: boolean; slowMessages: boolean };
  usualStudio?: string;
  autoBackup: boolean;
  keepBackups: number;
  lastBackup?: string;
  /** Finished the first-open welcome (welcome, privacy, name). */
  welcomed: boolean;
  /** The person's first name: the greeting, and the name other devices see when sharing. */
  deviceName: string;
  /** When a backup was last saved somewhere off this device (Files, iCloud, a computer). */
  lastCopy?: string;
  /** Saves since then, for the reminder to copy a backup off the device. */
  savesSinceCopy: number;
  /** The reminder was put off until this time. */
  nudgeAfter?: string;
  /** Optional: hours and pay. */
  timesheet: { on: boolean; asked: boolean; count: 'class' | 'block'; rates: Record<string, number> };
  reminders: { shift: boolean; before: number; nightBefore: boolean; nightAt: string };
  /** How many months of calendar history to keep. 0 keeps everything. */
  keepMonths: number;
  /** Copy shifts and classes into the iPhone's own Calendar app. */
  phoneCalendar: boolean;
  /** The version whose "What's new" was last seen. */
  seenVersion: string;
}

export interface Data {
  v: 2;
  settings: Settings;
  studios: Studio[];
  classes: ClassPlan[];
  taught: Taught[];
  /** Movements made or changed on this device, by slug. */
  movements: Record<string, Movement>;
  /** Library movements taken out, and retired ones put back. */
  hidden: string[];
  shown: string[];
  series: Series[];
  hiddenSeries: string[];
  /** Your own notes on movements, by slug. */
  notes: Record<string, string>;
  favMoves: string[];
  shifts: Shift[];
  shiftTemplates: ShiftTemplate[];
  /** Sync: when each thing was last changed, and when things were deleted, by key (see lib/sync.ts). */
  stamps: Record<string, string>;
  gone: Record<string, string>;
  /** This device, and the others it syncs with. Never synced or shared. */
  device: { id: string; key?: string; devices: Device[]; calEvents: Record<string, string> };
}

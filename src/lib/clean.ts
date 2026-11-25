// Everything that comes in from outside the app (a file, a QR send, a backup) goes through here
// first, so a damaged or hand-edited file can't put nonsense into what the app keeps.
import { BUILTIN, CORE_LEVELS, CATEGORIES, HEADREST, PATTERNS, PLANES, POSE_IDS, POSITIONS, PREGNANCY, ROLES as ROLES_OF_MOVEMENT, SPINE, STRAPS, BRANDS, DEFAULT_CLASS_TYPES, DEFAULT_FOCUSES, DEFAULT_LENGTHS, DEFAULT_LEVELS, DEFAULT_TARGETS, DEFAULT_TIMING_ROWS, EQUIPMENT, LOAD_LEVELS, SEGMENT_ROLES, isBuiltinTiming, timingFromRows, timingRowsOf, withCoreLevels } from '../engine';
import type { ClassPlan, ClassType, Data, Item, Movement, Named, Segment, Series, Settings, Setup, Shift, ShiftTemplate, Slot, Studio, Taught, TimingRow } from './types';

export const uid = (prefix = '') => prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const nowIso = () => new Date().toISOString();
export const slugify = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const num = (v: unknown, min: number, max: number, dflt: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; };
const list = <T>(v: unknown, max: number): T[] => (Array.isArray(v) ? (v.slice(0, max) as T[]) : []);
const ID = /^[a-z0-9_-]{1,60}$/i;
const LOADS = new Set<string>(LOAD_LEVELS as string[]);
const ROLES = new Set<string>((SEGMENT_ROLES as { id: string }[]).map((r) => r.id));

const named = (v: unknown, prefix: string, max = 40): Named[] => {
  const seen = new Set<string>();
  const out: Named[] = [];
  for (const x of list<Record<string, unknown>>(v, max)) {
    const label = str(x && x.label, 40);
    if (!label) continue;
    let id = ID.test(String(x.id || '')) ? String(x.id) : prefix + slugify(label).replace(/-/g, '_');
    while (seen.has(id)) id += '_2';
    seen.add(id);
    out.push({ id, label, ...(['lower', 'upper', 'core', 'stretch'].includes(String(x.group)) ? { group: String(x.group) } : {}) });
  }
  return out;
};
const ids = (v: unknown, max = 60) => list<unknown>(v, max).map(String).filter((x) => ID.test(x));

function cleanItem(i: Record<string, unknown>): Item | null {
  if (!i || typeof i !== 'object') return null;
  const id = str(i.id, 40) || uid('i');
  if (i.pause) return { id, pause: true, label: str(i.label, 60) || 'Break', duration: Math.round(num(i.duration, 5, 3600, 60)), ...(str(i.note, 300) ? { note: str(i.note, 300) } : {}) };
  const slug = slugify(i.slug);
  if (!slug) return null;
  const layers = list<unknown>(i.layers, 8).map((l) => (typeof l === 'string' ? str(l, 20) : l && typeof l === 'object' && str((l as { text?: unknown }).text, 160) ? { text: str((l as { text?: unknown }).text, 160) } : '')).filter(Boolean) as Item['layers'];
  const options = list<Record<string, unknown>>(i.options, 6).filter((o) => o && typeof o === 'object' && str(o.title, 120)).map((o) => ({
    id: str(o.id, 40) || uid('o'), kind: str(o.kind, 20) || 'regression', title: str(o.title, 120),
    ...(Array.isArray(o.springs) ? { springs: (o.springs as unknown[]).map(String).filter((x) => LOADS.has(x)).slice(0, 5) } : {}),
    ...(slugify(o.slug) ? { slug: slugify(o.slug) } : {}), ...(str(o.note, 200) ? { note: str(o.note, 200) } : {}),
  }));
  const load = i.load as { springs?: unknown } | undefined;
  return {
    id, slug,
    ...(Number(i.duration) > 0 ? { duration: Math.round(num(i.duration, 10, 1800, 120)) } : {}),
    ...(str(i.reps, 60) ? { reps: str(i.reps, 60) } : {}),
    ...(str(i.variation, 120) ? { variation: str(i.variation, 120) } : {}),
    ...(layers && layers.length ? { layers } : {}),
    ...(options.length ? { options } : {}),
    ...(str(i.finisher, 160) ? { finisher: str(i.finisher, 160) } : {}),
    ...(str(i.note, 500) ? { note: str(i.note, 500) } : {}),
    ...(load && Array.isArray(load.springs) ? { load: { springs: (load.springs as unknown[]).map(String).filter((x) => LOADS.has(x)).slice(0, 5) } } : {}),
    ...(Array.isArray(i.props) && i.props.length ? { props: [...new Set(ids(i.props, 12))] } : {}),
  };
}

export function cleanSegments(v: unknown): Segment[] {
  return list<Record<string, unknown>>(v, 30).filter((s) => s && typeof s === 'object').map((s) => ({
    id: str(s.id, 40) || uid('s'),
    name: str(s.name, 80) || 'Phase',
    role: ROLES.has(String(s.role)) ? String(s.role) : 'build',
    ...(Number(s.minutes) > 0 ? { minutes: Math.round(num(s.minutes, 1, 120, 5)) } : {}),
    ...(s.bothSides ? { bothSides: true } : {}),
    ...(str(s.song, 160) ? { song: str(s.song, 160) } : {}),
    items: list<Record<string, unknown>>(s.items, 60).map(cleanItem).filter(Boolean) as Item[],
  }));
}

/** A class plan from anywhere: this app or another teacher's. */
export function cleanPlan(input: unknown, keepId = false): ClassPlan {
  const f = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const segments = cleanSegments(f.segments);
  return {
    id: keepId && ID.test(String(f.id || '')) ? String(f.id) : uid('c'),
    title: str(f.title, 120) || 'Untitled class',
    apparatus: (['reformer', 'mat', 'mixed'] as const).find((a) => a === f.apparatus) || 'reformer',
    level: ID.test(String(f.level || '')) ? String(f.level) : 'intermediate',
    lengthMin: Math.round(num(f.lengthMin, 10, 180, 50)),
    ...(str(f.goal, 40) ? { goal: str(f.goal, 40) } : {}),
    ...(str(f.focusText, 60) ? { focusText: str(f.focusText, 60) } : {}),
    ...(f.noPhases ? { noPhases: true } : {}),
    target: str(f.target, 40) || 'general',
    ...(ID.test(String(f.classType || '')) ? { classType: String(f.classType) } : {}),
    springBudget: Math.round(num(f.springBudget, 0, 20, 0)),
    ...(ID.test(String(f.studioId || '')) ? { studioId: String(f.studioId) } : {}),
    ...(f.fav ? { fav: true } : {}),
    ...(str(f.notes, 2000) ? { notes: str(f.notes, 2000) } : {}),
    segments: segments.length ? segments : [{ id: uid('s'), name: 'Class', role: 'build', items: [] }],
    createdAt: str(f.createdAt, 30) || nowIso(),
    updatedAt: str(f.updatedAt, 30) || nowIso(),
    ...(str(f.from, 80) ? { from: str(f.from, 80) } : {}),
    ...(Array.isArray(f.extraProps) && f.extraProps.length ? { extraProps: named(f.extraProps, 'x_', 20) } : {}),
  };
}

const idsOf = (l: unknown) => new Set<string>((l as { id: string }[]).map((x) => x.id));
/** Never throws: what is missing gets a safe value. */
export function cleanMovement(input: unknown): Movement | null {
  const m = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = str(m.name, 100);
  const slug = slugify(m.slug || name);
  if (!name || !slug) return null;
  const strs = (v: unknown, n: number, max: number) => list<unknown>(v, n).map((x) => str(x, max)).filter(Boolean);
  const pick = (v: unknown, from: unknown, n: number) => { const ok = idsOf(from); return [...new Set(list<unknown>(v, 40).map(String).filter((x) => ok.has(x)))].slice(0, n); };
  const one = (v: unknown, from: unknown, dflt: string) => (idsOf(from).has(String(v)) ? String(v) : dflt);
  const loads = (v: unknown) => list<unknown>(v, 5).map(String).filter((x) => LOADS.has(x));
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  const mu = obj(m.muscles); const ld = obj(m.load); const su = obj(m.setup); const pu = obj(m.purpose); const rv = obj(m.review);
  const apparatus = m.apparatus === 'mat' ? 'mat' : 'reformer';
  // Muscles and props can be the studio's own (Class set-up → lists), so any tidy id is kept.
  const ids = (v: unknown, n: number) => [...new Set(list<unknown>(v, 40).map(String).filter((x) => ID.test(x)))].slice(0, n);
  const primary = ids(mu.primary, 8);
  const lv = ['beginner', 'intermediate', 'advanced'];
  const level = lv.includes(String(m.level)) ? String(m.level) : 'beginner';
  const levelTo = lv.includes(String(m.levelTo)) && lv.indexOf(String(m.levelTo)) >= lv.indexOf(level) ? String(m.levelTo) : level === 'beginner' && !m.levelTo ? 'advanced' : level;
  const spine = pick(m.spine, SPINE, 4);
  const advance = loads(ld.advance);
  const uses = Array.isArray(m.uses) ? ['warmup', 'cooldown', 'peak'].filter((u) => (m.uses as unknown[]).includes(u)) : undefined;
  return {
    slug, name,
    aka: (Array.isArray(m.aka) ? m.aka : String(m.aka || '').split(/[,\n]/)).map((x) => str(x, 60)).filter(Boolean).slice(0, 10),
    apparatus,
    ...(ID.test(String(m.section || '')) ? { section: String(m.section) } : {}),
    level, levelTo,
    ...(typeof m.pose === 'string' && (POSE_IDS as string[]).includes(m.pose) ? { pose: m.pose } : {}),
    position: one(m.position, POSITIONS, 'supine'),
    spine: spine.length ? spine : ['neutral'],
    plane: one(m.plane, PLANES, 'sagittal'),
    patterns: pick(m.patterns, PATTERNS, 6),
    muscles: { primary, secondary: ids(mu.secondary, 8).filter((x) => !primary.includes(x)) },
    equipment: ids(m.equipment, 6),
    load: apparatus === 'reformer' ? { springs: loads(ld.springs), ...(advance.length ? { advance } : {}), ...(ld.lighterIsHarder ? { lighterIsHarder: true } : {}), ...(ld.flexible ? { flexible: true } : {}), ...(str(ld.note, 300) ? { note: str(ld.note, 300) } : {}) } : null,
    ...(apparatus === 'reformer' ? { setup: { headrest: one(su.headrest, HEADREST, 'any'), straps: one(su.straps, STRAPS, 'none') } } : {}),
    perSide: !!m.perSide,
    ...(idsOf(ROLES_OF_MOVEMENT).has(String(m.role)) ? { role: String(m.role) } : {}),
    stable: str(m.stable, 160),
    mobile: str(m.mobile, 160),
    categories: pick(m.categories, CATEGORIES, 11),
    pregnancy: one(m.pregnancy, PREGNANCY, 'ok'),
    purpose: Object.fromEntries(['strength', 'stability', 'flexibility', 'mobility'].map((k) => [k, Math.round(num(pu[k], 0, 3, 0))])),
    multiJoint: m.multiJoint !== false,
    intensity: Math.round(num(m.intensity, 1, 10, 4)),
    duration: Math.round(num(m.duration, 15, 1800, 120)),
    reps: str(m.reps, 60),
    summary: str(m.summary, 600),
    steps: (Array.isArray(m.steps) ? m.steps : String(m.steps || '').split('\n')).map((x) => str(x, 300)).filter(Boolean).slice(0, 12),
    variations: list<Record<string, unknown>>(m.variations, 12).map((v) => (typeof v === 'string' ? { name: str(v, 120) } : v && typeof v === 'object' ? { name: str(v.name, 120), ...(str(v.kind, 20) ? { kind: str(v.kind, 20) } : {}), ...(Array.isArray(v.springs) ? { springs: loads(v.springs) } : {}), ...(str(v.note, 300) ? { note: str(v.note, 300) } : {}) } : { name: '' })).filter((v) => v.name),
    prep: list<unknown>(m.prep, 6).map(slugify).filter(Boolean),
    layers: list<Record<string, unknown>>(m.layers, 12).filter((l) => l && typeof l === 'object').map((l, i) => ({ tag: str(l.tag, 4) || `L${i + 1}`, title: str(l.title, 80), text: str(l.text, 300) })).filter((l) => l.title),
    cautions: list<Record<string, unknown>>(m.cautions, 16).filter((c) => c && typeof c === 'object' && str(c.tag, 40)).map((c) => ({ tag: str(c.tag, 40), severity: c.severity === 'modify' ? 'modify' : 'avoid', note: str(c.note, 300), ...(slugify(c.swap) ? { swap: slugify(c.swap) } : {}) })),
    cues: (Array.isArray(m.cues) ? strs(m.cues, 20, 200).join('\n') : str(m.cues, 2000)),
    labels: list<unknown>(m.labels, 12).map(slugify).filter(Boolean),
    ...(uses ? { uses } : {}),
    ...(m.retired ? { retired: true } : {}),
    ...(m.hidden ? { hidden: true } : {}),
    ...(Array.isArray(m.sources) && m.sources.length ? { sources: strs(m.sources, 20, 30) } : {}),
    review: { status: str(rv.status, 20) || 'draft', note: str(rv.note, 300), ...(str(rv.by, 80) ? { by: str(rv.by, 80) } : {}), ...(str(rv.date, 20) ? { date: str(rv.date, 20) } : {}) },
    source: 'mine',
  } as Movement;
}

export function cleanSeries(input: unknown): Series | null {
  const s = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = str(s.name, 80);
  const slug = slugify(s.slug || name);
  const items = list<Record<string, unknown>>(s.items, 30).filter((i) => i && slugify(i.slug)).map((i) => ({
    slug: slugify(i.slug), ...(str(i.variation, 120) ? { variation: str(i.variation, 120) } : {}),
    ...(Number(i.duration) > 0 ? { duration: Math.round(num(i.duration, 10, 1800, 60)) } : {}), ...(str(i.reps, 60) ? { reps: str(i.reps, 60) } : {}),
  }));
  if (!name || !slug || !items.length) return null;
  return { slug, name, apparatus: s.apparatus === 'mat' ? 'mat' : 'reformer', aka: list<unknown>(s.aka, 6).map((x) => str(x, 60)).filter(Boolean), summary: str(s.summary, 300), items, source: 'mine' };
}


/** A new studio starts blank: its reformers and springs, and a class set-up with only what the app can't work without. */
export function newStudio(name = '', brand = 'balanced_body'): Studio {
  const b = (BRANDS as Record<string, { standard: Record<string, number> }>)[brand] ? brand : 'balanced_body';
  return { id: uid('st'), name, hasReformers: true, brand: b, reformers: 0, springs: { ...(BRANDS as Record<string, { standard: Record<string, number> }>)[b].standard }, springOverrides: {}, props: {}, setup: blankSetup(), updatedAt: nowIso() };
}
/** A studio from a backup, a shared file or a pack. */
export function cleanStudio(input: unknown, setup?: unknown): Studio {
  const s = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const brand = (BRANDS as Record<string, unknown>)[String(s.brand)] ? String(s.brand) : 'balanced_body';
  const springs: Record<string, number> = {};
  for (const l of LOAD_LEVELS as string[]) { const n = Math.round(num(((s.springs || {}) as Record<string, unknown>)[l], 0, 8, 0)); if (n > 0) springs[l] = n; }
  const overrides: Studio['springOverrides'] = {};
  for (const [k, v] of Object.entries((s.springOverrides || {}) as Record<string, Record<string, unknown>>)) {
    if (LOADS.has(k) && v && typeof v === 'object' && str(v.name, 30)) overrides[k] = { name: str(v.name, 30), short: str(v.short, 3) || str(v.name, 1).toUpperCase(), color: /^#[0-9a-f]{6}$/i.test(String(v.color)) ? String(v.color) : '#9AA39F' };
  }
  const props: Record<string, number> = {};
  for (const [k, v] of Object.entries((s.props || {}) as Record<string, unknown>)) if (ID.test(k) && Number(v) > 0) props[k] = Math.round(num(v, 1, 99, 1));
  const mat = s.apparatus === 'mat' || s.hasReformers === false;
  return {
    id: ID.test(String(s.id || '')) ? String(s.id) : uid('st'),
    name: str(s.name, 60) || 'Studio',
    hasReformers: !mat,
    brand,
    reformers: Math.round(num(s.reformers ?? s.count, 0, 99, 8)),
    springs: Object.keys(springs).length || mat ? springs : { ...(BRANDS as Record<string, { standard: Record<string, number> }>)[brand].standard },
    springOverrides: overrides,
    props,
    setup: setup !== undefined ? cleanSetup(setup) : s.setup && typeof s.setup === 'object' ? cleanSetup(s.setup, true) : blankSetup(),
    updatedAt: str(s.updatedAt, 30) || nowIso(),
  };
}

export function defaultSetup(): Setup {
  const timingRows = (DEFAULT_TIMING_ROWS as TimingRow[]).map((r) => ({ ...r }));
  return {
    levels: (DEFAULT_LEVELS as Setup['levels']).map((l) => ({ ...l })),
    classTypes: structuredClone(DEFAULT_CLASS_TYPES) as ClassType[],
    lengths: [...(DEFAULT_LENGTHS as number[])],
    defaultLength: 50,
    timingRows,
    timing: timingFromRows(timingRows) as Record<string, number>,
    focuses: structuredClone(DEFAULT_FOCUSES) as Setup['focuses'],
    targets: structuredClone(DEFAULT_TARGETS) as Setup['targets'],
    customProps: [], removedProps: [], customMuscles: [], removedMuscles: [], customCautions: [], removedCautions: [],
    customSections: [], removedSections: [], sectionLabels: {}, sectionMap: {}, customPositions: [], removedPositions: [],
  };
}

/** A few basics a new studio starts with. The full lists come back with one tap in Class set-up. */
export const BASIC_MUSCLES = ['abdominals', 'glutes', 'hamstrings', 'quadriceps', 'chest', 'deltoids', 'upper_back', 'triceps'];
export const BASIC_SECTIONS: Record<string, string> = { core: '', lower: '', back_shoulders: '', stretch: '', pelvic: 'lower', cardio: 'lower', single_arm: 'back_shoulders', chest_arms: 'back_shoulders' };
/** A new studio: the three core levels, a few basic muscle names and parts of the class, and the timing. Nothing else. */
export function blankSetup(): Setup {
  const d = defaultSetup();
  const allMuscles = (BUILTIN.muscles as { id: string }[]).map((m) => m.id);
  const sectionMap = Object.fromEntries(Object.entries(BASIC_SECTIONS).filter(([, to]) => to));
  return { ...d, levels: d.levels.filter((l) => (CORE_LEVELS as { id: string }[]).some((c) => c.id === l.id)), classTypes: [], lengths: [], focuses: [], targets: { general: d.targets.general },
    removedMuscles: allMuscles.filter((m) => !BASIC_MUSCLES.includes(m)), removedSections: Object.keys(sectionMap), sectionMap };
}
/** Class set-up from anywhere: a backup, a shared studio or a pack. `blank`: empty lists stay empty (a studio's own set-up). */
export function cleanSetup(input: unknown, blank = true): Setup {
  const s = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const d = blank ? blankSetup() : defaultSetup();
  const levels = ((Array.isArray(s.levels) ? (x: Setup['levels']) => x : withCoreLevels)(list<Record<string, unknown>>(s.levels, 12).filter((l) => l && str(l.label, 40)).map((l) => ({
    id: ID.test(String(l.id || '')) ? String(l.id) : slugify(l.label).replace(/-/g, '_'), label: str(l.label, 40),
    from: Math.round(num(l.from, 1, 3, 1)), to: Math.round(num(l.to, 1, 3, 3)),
  })).map((l) => (l.to < l.from ? { ...l, to: l.from } : l))) as Setup['levels']);
  const customSections = named(s.customSections, 's_', 12).map((x) => ({ ...x, group: x.group || 'core' }));
  const timingRows: TimingRow[] = (timingRowsOf({ timingRows: Array.isArray(s.timingRows) ? s.timingRows : undefined, timing: s.timing }) as TimingRow[]).slice(0, 30).map((r) => ({
    id: isBuiltinTiming(r.id) ? r.id : ID.test(String(r.id || '')) ? String(r.id) : 't_' + slugify(r.label).replace(/-/g, '_'),
    label: str(r.label, 60) || 'Timing', ...(str(r.note, 200) ? { note: str(r.note, 200) } : {}),
    seconds: Math.round(num(r.seconds, 0, 3600, 0)), ...(r.off ? { off: true } : {}),
  }));
  const targets = (s.targets && typeof s.targets === 'object' && Object.keys(s.targets as object).length ? JSON.parse(JSON.stringify(s.targets)) : d.targets) as Setup['targets'];
  const levelIds = new Set(levels.map((l) => l.id));
  const classTypes: ClassType[] = list<Record<string, unknown>>(s.classTypes, 40).filter((c) => c && str(c.name, 60)).map((c) => {
    const timing: Record<string, number> = {};
    for (const [k, v] of Object.entries((c.timing || {}) as Record<string, unknown>)) if (isBuiltinTiming(k) && v !== '' && v != null && Number.isFinite(Number(v))) timing[k] = Math.round(num(v, 0, 600, 0));
    return {
      id: ID.test(String(c.id || '')) ? String(c.id) : uid('ct'),
      name: str(c.name, 60),
      apparatus: c.apparatus === 'mat' ? 'mat' as const : 'reformer' as const,
      lengthMin: Math.round(num(c.lengthMin, 10, 180, 50)),
      springBudget: Math.round(num(c.springBudget, 0, 20, 0)),
      ...(str(c.note, 200) ? { note: str(c.note, 200) } : {}),
      ...(levelIds.has(String(c.level)) ? { level: String(c.level) } : {}),
      ...(targets[String(c.target)] ? { target: String(c.target) } : {}),
      ...(Object.keys(timing).length ? { timing } : {}),
      ...(c.noPhases ? { noPhases: true } : {}),
      phases: list<Record<string, unknown>>(c.phases, 20).filter((p) => p && str(p.name, 60)).map((p) => ({
        name: str(p.name, 60), role: ROLES.has(String(p.role)) ? String(p.role) : 'build', minutes: Math.round(num(p.minutes, 1, 60, 5)),
        sections: ids(p.sections, 12), ...(Array.isArray(p.positions) && p.positions.length ? { positions: ids(p.positions, 10) } : {}),
      })),
    };
  });
  const lengths = [...new Set(list<unknown>(s.lengths, 12).map(Number).filter((n) => Number.isFinite(n) && n >= 10 && n <= 180).map(Math.round))].sort((a, b) => a - b);
  const focuses = list<Record<string, unknown>>(s.focuses, 30).filter((f) => f && str(f.label, 40)).map((f) => ({
    ...(JSON.parse(JSON.stringify(f)) as Record<string, unknown>),
    id: ID.test(String(f.id || '')) ? String(f.id) : slugify(f.label).replace(/-/g, '_'), label: str(f.label, 40), muscles: ids(f.muscles, 20),
  })) as Setup['focuses'];
  const sectionLabels: Record<string, string> = {};
  for (const [k, v] of Object.entries((s.sectionLabels || {}) as Record<string, unknown>)) if (ID.test(k) && str(v, 40)) sectionLabels[k] = str(v, 40);
  const sectionMap: Record<string, string> = {};
  for (const [k, v] of Object.entries((s.sectionMap || {}) as Record<string, unknown>)) if (ID.test(k) && ID.test(String(v))) sectionMap[k] = String(v);
  return {
    levels,
    classTypes: classTypes.length || blank ? classTypes : d.classTypes,
    lengths: lengths.length || blank ? lengths : d.lengths,
    defaultLength: Math.round(num(s.defaultLength, 10, 180, 50)),
    timingRows,
    timing: timingFromRows(timingRows) as Record<string, number>,
    focuses: focuses.length || blank ? focuses : d.focuses,
    targets,
    customProps: named(s.customProps, 'p_'), removedProps: ids(s.removedProps).filter((x) => (EQUIPMENT as { id: string }[]).some((e) => e.id === x) || true),
    customMuscles: named(s.customMuscles, 'm_'), removedMuscles: ids(s.removedMuscles),
    customCautions: named(s.customCautions, 'c_'), removedCautions: ids(s.removedCautions),
    customSections, removedSections: ids(s.removedSections), sectionLabels, sectionMap,
    customPositions: named(s.customPositions, 'q_', 20), removedPositions: ids(s.removedPositions),
  };
}

export const ACCENTS = ['blue', 'sunset', 'teal', 'plum', 'berry', 'olive', 'charcoal', 'own'] as const;
export function defaultSettings(): Settings {
  return { theme: 'auto', accent: 'blue', trueBlack: true, playDark: true, keepAwake: true, textSize: 'normal', a11y: { bold: false, contrast: false, spacing: false, links: false, big: false, motion: false, slowMessages: false }, autoBackup: true, keepBackups: 5, welcomed: false, deviceName: '', savesSinceCopy: 0,
    timesheet: { on: false, asked: false, count: 'class', rates: {} }, reminders: { shift: true, before: 60, nightBefore: true, nightAt: '19:00' }, keepMonths: 12, phoneCalendar: false, seenVersion: '' };
}
export function cleanSettings(input: unknown): Settings {
  const s = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const d = defaultSettings();
  const own = /^#[0-9a-f]{6}$/i.test(String(s.ownAccent));
  return {
    theme: (['light', 'dark', 'auto'] as const).find((x) => x === s.theme) || d.theme,
    accent: (ACCENTS as readonly string[]).includes(String(s.accent)) && (s.accent !== 'own' || own) ? String(s.accent) : d.accent,
    ...(own ? { ownAccent: String(s.ownAccent) } : {}),
    trueBlack: s.trueBlack === undefined ? true : !!s.trueBlack,
    playDark: s.playDark === undefined ? d.playDark : !!s.playDark,
    keepAwake: s.keepAwake === undefined ? d.keepAwake : !!s.keepAwake,
    textSize: (['normal', 'large', 'larger'] as const).find((x) => x === s.textSize) || d.textSize,
    a11y: Object.fromEntries(Object.keys(d.a11y).map((k) => [k, !!((s.a11y || {}) as Record<string, unknown>)[k]])) as Settings['a11y'],
    ...(ID.test(String(s.usualStudio || '')) ? { usualStudio: String(s.usualStudio) } : {}),
    autoBackup: s.autoBackup === undefined ? true : !!s.autoBackup,
    keepBackups: Math.round(num(s.keepBackups, 1, 30, 5)),
    ...(str(s.lastBackup, 30) ? { lastBackup: str(s.lastBackup, 30) } : {}),
    welcomed: !!s.welcomed,
    deviceName: str(s.deviceName, 40),
    ...(str(s.lastCopy, 30) ? { lastCopy: str(s.lastCopy, 30) } : {}),
    savesSinceCopy: Math.round(num(s.savesSinceCopy, 0, 100000, 0)),
    ...(str(s.nudgeAfter, 30) ? { nudgeAfter: str(s.nudgeAfter, 30) } : {}),
    timesheet: cleanTimesheet(s.timesheet),
    reminders: cleanReminders(s.reminders),
    keepMonths: [0, 3, 6, 12, 24, 36].includes(Number(s.keepMonths)) ? Number(s.keepMonths) : d.keepMonths,
    phoneCalendar: !!s.phoneCalendar,
    seenVersion: str(s.seenVersion, 20),
  };
}
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const time = (v: unknown, dflt: string) => (TIME.test(String(v)) ? String(v) : dflt);
function cleanTimesheet(v: unknown): Settings['timesheet'] {
  const t = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const rates: Record<string, number> = {};
  for (const [k, r] of Object.entries((t.rates || {}) as Record<string, unknown>)) if ((ID.test(k) || k === '*') && Number(r) > 0) rates[k] = Math.round(num(r, 0, 10000, 0) * 100) / 100;
  return { on: !!t.on, asked: !!t.asked, count: t.count === 'block' ? 'block' : 'class', rates };
}
function cleanReminders(v: unknown): Settings['reminders'] {
  const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { shift: r.shift === undefined ? true : !!r.shift, before: [0, 15, 30, 60, 90, 120, 180].includes(Number(r.before)) ? Number(r.before) : 60, nightBefore: r.nightBefore === undefined ? true : !!r.nightBefore, nightAt: time(r.nightAt, '19:00') };
}
function cleanSlot(v: Record<string, unknown>): Slot | null {
  if (!v || typeof v !== 'object') return null;
  return {
    id: ID.test(String(v.id || '')) ? String(v.id) : uid('k'),
    start: time(v.start, '09:00'),
    lengthMin: Math.round(num(v.lengthMin, 5, 300, 50)),
    ...(ID.test(String(v.classType || '')) ? { classType: String(v.classType) } : {}),
    ...(ID.test(String(v.flowId || '')) ? { flowId: String(v.flowId) } : {}),
    ...(v.cancelled ? { cancelled: true } : {}),
    ...(str(v.cover, 60) ? { cover: str(v.cover, 60) } : {}),
    ...(str(v.note, 1000) ? { note: str(v.note, 1000) } : {}),
    ...(str(v.taughtAt, 30) ? { taughtAt: str(v.taughtAt, 30) } : {}),
  };
}
export function cleanShift(v: unknown): Shift | null {
  const s = (v && typeof v === 'object' ? v : null) as Record<string, unknown> | null;
  if (!s || !DATE.test(String(s.date))) return null;
  const slots = list<Record<string, unknown>>(s.slots, 12).map(cleanSlot).filter(Boolean) as Slot[];
  slots.sort((a, b) => a.start.localeCompare(b.start));
  return {
    id: ID.test(String(s.id || '')) ? String(s.id) : uid('sh'),
    date: String(s.date),
    name: str(s.name, 60) || 'Shift',
    ...(ID.test(String(s.studioId || '')) ? { studioId: String(s.studioId) } : {}),
    slots,
    ...(s.cancelled ? { cancelled: true } : {}),
    ...(str(s.note, 1000) ? { note: str(s.note, 1000) } : {}),
    ...(ID.test(String(s.repeatId || '')) ? { repeatId: String(s.repeatId) } : {}),
    updatedAt: str(s.updatedAt, 30) || nowIso(),
  };
}
export function cleanTemplate(v: unknown): ShiftTemplate | null {
  const s = (v && typeof v === 'object' ? v : null) as Record<string, unknown> | null;
  if (!s || !str(s.name, 60)) return null;
  const slots = list<Record<string, unknown>>(s.slots, 12).filter((x) => x && typeof x === 'object').map((x) => ({ lengthMin: Math.round(num(x.lengthMin, 5, 300, 50)), ...(ID.test(String(x.classType || '')) ? { classType: String(x.classType) } : {}) }));
  return {
    id: ID.test(String(s.id || '')) ? String(s.id) : uid('tp'),
    name: str(s.name, 60),
    ...(ID.test(String(s.studioId || '')) ? { studioId: String(s.studioId) } : {}),
    start: time(s.start, '09:00'),
    gapMin: Math.round(num(s.gapMin, 0, 240, 10)),
    slots: slots.length ? slots : [{ lengthMin: 50 }],
    updatedAt: str(s.updatedAt, 30) || nowIso(),
  };
}

export function cleanTaught(v: unknown): Taught[] {
  return list<Record<string, unknown>>(v, 5000).filter((t) => t && str(t.at, 30) && str(t.title, 120)).map((t) => ({
    id: ID.test(String(t.id || '')) ? String(t.id) : uid('t'), classId: str(t.classId, 60), title: str(t.title, 120), at: str(t.at, 30),
    ...(ID.test(String(t.studioId || '')) ? { studioId: String(t.studioId) } : {}), ...(str(t.studioName, 60) ? { studioName: str(t.studioName, 60) } : {}),
    minutes: Math.round(num(t.minutes, 0, 600, 0)),
    ...(ID.test(String(t.shiftId || '')) ? { shiftId: String(t.shiftId) } : {}), ...(ID.test(String(t.slotId || '')) ? { slotId: String(t.slotId) } : {}),
  }));
}

export function emptyData(): Data {
  return { v: 2, settings: defaultSettings(), studios: [], classes: [], taught: [], movements: {}, hidden: [], shown: [], series: [], hiddenSeries: [], notes: {}, favMoves: [], shifts: [], shiftTemplates: [], stamps: {}, gone: {}, device: newDevice() };
}

/** Everything the app keeps, read back from its own file or from a backup. */
export function cleanData(input: unknown): Data {
  const d = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const movements: Record<string, Movement> = {};
  for (const m of Object.values((d.movements || {}) as Record<string, unknown>).slice(0, 3000)) { const mv = cleanMovement(m); if (mv) movements[mv.slug] = mv; }
  const seenClass = new Set<string>();
  const classes = list<unknown>(d.classes, 5000).map((c) => cleanPlan(c, true)).filter((c) => (seenClass.has(c.id) ? false : (seenClass.add(c.id), true)));
  const seenStudio = new Set<string>();
  const studios = list<unknown>(d.studios, 50).map((s) => cleanStudio(s)).filter((s) => (seenStudio.has(s.id) ? false : (seenStudio.add(s.id), true)));
  const notes: Record<string, string> = {};
  for (const [k, v] of Object.entries((d.notes || {}) as Record<string, unknown>).slice(0, 3000)) if (slugify(k) && str(v, 2000)) notes[slugify(k)] = str(v, 2000);
  const shifts = list<unknown>(d.shifts, 20000).map(cleanShift).filter(Boolean) as Shift[];
  // 0.3.0 kept a flow's date on the flow ("Planned for"). It is now a one-class shift on the calendar.
  for (const raw of list<Record<string, unknown>>(d.classes, 5000)) {
    const when = str(raw && raw.when, 16);
    const plan = classes.find((c) => c.id === raw.id);
    if (!plan || !/^\d{4}-\d{2}-\d{2}/.test(when) || shifts.some((s) => s.slots.some((k) => k.flowId === plan.id))) continue;
    shifts.push({ id: uid('sh'), date: when.slice(0, 10), name: plan.title, ...(plan.studioId ? { studioId: plan.studioId } : {}), slots: [{ id: uid('k'), start: time(when.slice(11, 16), '09:00'), lengthMin: plan.lengthMin, flowId: plan.id }], updatedAt: nowIso() });
  }
  const stamps: Record<string, string> = {};
  for (const [k, v] of Object.entries((d.stamps || {}) as Record<string, unknown>)) if (k.length < 120 && str(v, 30)) stamps[k] = str(v, 30);
  const gone: Record<string, string> = {};
  for (const [k, v] of Object.entries((d.gone || {}) as Record<string, unknown>)) if (k.length < 120 && str(v, 30)) gone[k] = str(v, 30);
  return {
    v: 2,
    settings: cleanSettings(d.settings),
    studios, classes,
    taught: cleanTaught(d.taught),
    movements,
    hidden: list<unknown>(d.hidden, 3000).map(slugify).filter(Boolean),
    shown: list<unknown>(d.shown, 3000).map(slugify).filter(Boolean),
    series: list<unknown>(d.series, 500).map(cleanSeries).filter(Boolean) as Series[],
    hiddenSeries: list<unknown>(d.hiddenSeries, 500).map(slugify).filter(Boolean),
    notes,
    favMoves: [...new Set(list<unknown>(d.favMoves, 3000).map(slugify).filter(Boolean))],
    shifts,
    shiftTemplates: list<unknown>(d.shiftTemplates, 200).map(cleanTemplate).filter(Boolean) as ShiftTemplate[],
    stamps, gone,
    device: cleanDevice(d.device),
  };
}
export const newDevice = (): Data['device'] => ({ id: uid('d'), devices: [], calEvents: {} });
function cleanDevice(v: unknown): Data['device'] {
  const x = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const calEvents: Record<string, string> = {};
  for (const [k, e] of Object.entries((x.calEvents || {}) as Record<string, unknown>)) if (ID.test(k) && str(e, 200)) calEvents[k] = str(e, 200);
  return {
    id: ID.test(String(x.id || '')) ? String(x.id) : uid('d'),
    ...(/^[A-Za-z0-9+/=]{40,60}$/.test(String(x.key || '')) ? { key: String(x.key) } : {}),
    devices: list<Record<string, unknown>>(x.devices, 5).filter((o) => o && ID.test(String(o.id || ''))).map((o) => ({ id: String(o.id), name: str(o.name, 40) || 'Another device', ...(str(o.lastSync, 30) ? { lastSync: str(o.lastSync, 30) } : {}) })),
    calEvents,
  };
}

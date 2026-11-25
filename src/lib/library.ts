// The movement library and the ready-built series that ship inside the app.
import type { Movement, Series } from './types';

const movementFiles = import.meta.glob('../library/movements/**/*.json', { eager: true, import: 'default' }) as Record<string, Movement>;
const seriesFiles = import.meta.glob('../library/series/*.json', { eager: true, import: 'default' }) as Record<string, Series>;

export const LIBRARY: Movement[] = Object.values(movementFiles).filter((m) => m && m.slug && m.name).map((m) => ({ ...m, source: 'library' as const }));
export const LIBRARY_SERIES: Series[] = Object.values(seriesFiles).filter((s) => s && s.slug && s.name).map((s) => ({ ...s, source: 'library' as const }));

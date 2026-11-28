// A theme's picture on screen, the opening when the app opens, and keeping "today" up to date so a
// holiday starts and ends at midnight even if the app is left open.
import { memo, useEffect, useMemo, useState } from 'react';
import type { ThemeKey } from '../lib/holidays';
import { getData, useData } from '../lib/store';
import { labelOf, picture, type Mode } from './art/scenes';
import { applyTheme, themeNow } from './theme';

export const reduceMotion = () => (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.dataset.motion === '1';

/** The date, as a number that changes at midnight and when the app comes back from the background. */
export function useToday(): number {
  const day = () => new Date().setHours(0, 0, 0, 0);
  const [today, setToday] = useState(day);
  useEffect(() => {
    const check = () => setToday(day());
    const next = new Date(); next.setHours(24, 0, 1, 0);
    const id = setTimeout(check, next.getTime() - Date.now());
    const vis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearTimeout(id); document.removeEventListener('visibilitychange', vis); };
  }, [today]);
  return today;
}

/** The theme showing today. Re-applies the app's colours when the day changes. */
export function useTheme(): { key: ThemeKey; night: boolean } {
  const today = useToday();
  const s = useData().settings;
  useEffect(() => { applyTheme(s); }, [today, s]);
  return themeNow(s, new Date(today));
}

interface PictureProps { theme: ThemeKey; night: boolean; mode: Mode; moving?: boolean; words?: boolean; className?: string; hidden?: boolean; pad?: number }
/** Drawn once for what it shows; a moving one plays from the start each time it's put on screen. */
export const Picture = memo(function Picture({ theme, night, mode, moving = false, words = false, className, hidden, pad = 0 }: PictureProps) {
  const html = useMemo(() => picture(theme, night, mode, { moving, words, pad }), [theme, night, mode, moving, words, pad]);
  return <div className={className} aria-hidden={hidden || undefined} dangerouslySetInnerHTML={{ __html: html }} />;
});

/** How much wider than a phone the screen is, in the scene's units: the opening fills an iPad. */
export function widePad(w = typeof innerWidth === 'number' ? innerWidth : 390, h = typeof innerHeight === 'number' ? innerHeight : 844): number {
  const ratio = w / Math.max(1, h);
  const phone = 390 / 844;
  return ratio > phone + 0.02 ? Math.min(900, (844 * ratio - 390) / 2) : 0;
}

/** When the app opens: one jump off the jump board, then the app. Tap to skip. */
export function Opening({ onDone }: { onDone: () => void }) {
  const [{ key, night }] = useState(() => themeNow(getData().settings));
  const [wide] = useState(() => widePad());
  const [still] = useState(reduceMotion);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (still) { const id = setTimeout(onDone, 1200); return () => clearTimeout(id); }
    const a = setTimeout(() => setLeaving(true), 3600), b = setTimeout(onDone, 3850);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [still, onDone]);
  return (
    <div className="opening" role="status" aria-label={`Plenty Flow is opening. ${labelOf(key, night)}`} onClick={onDone} style={{ opacity: leaving ? 0 : 1, transition: 'opacity .25s' }}>
      {wide ? null : <Picture className="behind" theme={key} night={night} mode="open" hidden />}
      <Picture className={`front${wide ? ' fill' : ''}`} theme={key} night={night} mode="open" moving={!still} words pad={wide} />
    </div>
  );
}

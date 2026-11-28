// The parts a class is built from, step by step (Flows → New flow → What's in this class?), and
// which movement sections each part draws from. A part's name can be anything; these are the usual ones.
import { norm } from './search';

export interface PartPreset { id: string; name: string; role: 'warmup' | 'build' | 'peak' | 'cooldown'; sections: string[] }
export const PART_PRESETS: PartPreset[] = [
  { id: 'stretch', name: 'Stretch', role: 'warmup', sections: ['stretch'] },
  { id: 'warmup', name: 'Warm-up & footwork', role: 'warmup', sections: ['lower', 'pelvic'] },
  { id: 'legs', name: 'Legs & glutes', role: 'build', sections: ['lower', 'pelvic'] },
  { id: 'arms', name: 'Arms', role: 'build', sections: ['chest_arms', 'single_arm'] },
  { id: 'back', name: 'Back & shoulders', role: 'build', sections: ['back_shoulders'] },
  { id: 'core', name: 'Core', role: 'peak', sections: ['core'] },
  { id: 'cardio', name: 'Cardio & jump board', role: 'peak', sections: ['cardio'] },
  { id: 'full', name: 'Full body flow', role: 'build', sections: [] },
  { id: 'cooldown', name: 'Cool down', role: 'cooldown', sections: ['stretch'] },
];

/** A part named in someone's own words ("Warm up/foot work", "Abs", "Flow"): its kind and sections. */
export function partFor(name: string): Pick<PartPreset, 'role' | 'sections'> {
  const n = norm(name);
  const has = (...w: string[]) => w.some((x) => n.includes(x));
  if (has('cool', 'wind down', 'cooldown')) return { role: 'cooldown', sections: ['stretch'] };
  if (has('warm', 'foot')) return { role: 'warmup', sections: ['lower', 'pelvic'] };
  if (has('stretch', 'mobility', 'release')) return { role: 'warmup', sections: ['stretch'] };
  if (has('core', 'abs', 'ab ', 'abdominal', 'oblique')) return { role: 'peak', sections: ['core'] };
  if (has('cardio', 'jump', 'hiit')) return { role: 'peak', sections: ['cardio'] };
  if (has('arm', 'chest', 'bicep', 'tricep')) return { role: 'build', sections: ['chest_arms', 'single_arm'] };
  if (has('back', 'shoulder', 'posture')) return { role: 'build', sections: ['back_shoulders'] };
  if (has('leg', 'glute', 'bum', 'hip', 'thigh', 'lunge')) return { role: 'build', sections: ['lower', 'pelvic'] };
  return { role: 'build', sections: [] };
}

/** Splits the class length across the parts: the warm-up and cool-down get a little less. */
export function splitMinutes(total: number, roles: string[]): number[] {
  if (!roles.length) return [];
  const w = roles.map((r) => (r === 'warmup' || r === 'cooldown' ? 0.7 : 1));
  const sum = w.reduce((a, b) => a + b, 0);
  const out = w.map((x) => Math.max(2, Math.round((total * x) / sum)));
  const diff = total - out.reduce((a, b) => a + b, 0);
  const big = out.indexOf(Math.max(...out));
  out[big] = Math.max(2, out[big] + diff);
  return out;
}

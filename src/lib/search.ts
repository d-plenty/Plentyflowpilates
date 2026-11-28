// Search that understands how teachers talk: "abs" finds core and abdominal work, "bum" finds
// glutes, "mermaid" finds side stretches, part of a word finds the whole word, and a small typo
// still finds it. Used everywhere you search: Movements, adding to a flow, building a flow step by
// step, blocks and Flows. Each result says why it matched.

/** Words that mean the same thing in a studio. Each group is searched together. */
export const RELATED: string[][] = [
  ['abs', 'ab', 'abdominals', 'abdominal', 'core', 'stomach', 'tummy', 'six pack', 'rectus abdominis', 'transverse abdominis', 'tva'],
  ['obliques', 'oblique', 'waist', 'side abs', 'twist', 'rotation'],
  ['glutes', 'glute', 'bum', 'butt', 'booty', 'buttocks', 'gluteus', 'seat'],
  ['hamstrings', 'hamstring', 'hammies', 'back of the leg', 'back of thigh'],
  ['quads', 'quadriceps', 'quad', 'front of thigh', 'thighs'],
  ['inner thigh', 'inner thighs', 'adductors', 'adductor', 'adduction'],
  ['outer thigh', 'outer hip', 'abductors', 'abductor', 'abduction', 'side of hip'],
  ['calves', 'calf', 'ankles', 'ankle', 'achilles'],
  ['hip flexors', 'hip flexor', 'psoas', 'iliopsoas', 'front of hip'],
  ['back', 'spine', 'spinal', 'extensors', 'back extensors', 'erector spinae', 'posture'],
  ['lats', 'latissimus', 'lat', 'upper back'],
  ['shoulders', 'shoulder', 'delts', 'deltoids', 'rotator cuff', 'scapula', 'shoulder blades'],
  ['arms', 'arm', 'biceps', 'bicep', 'triceps', 'tricep', 'upper body'],
  ['chest', 'pecs', 'pectorals', 'pec'],
  ['pelvic floor', 'pelvic', 'kegel', 'pelvis'],
  ['legs', 'leg', 'lower body', 'legs and glutes'],
  ['stretch', 'stretching', 'mobility', 'flexibility', 'release', 'lengthen'],
  ['side stretch', 'mermaid', 'side bend', 'lateral flexion'],
  ['cardio', 'jump', 'jumping', 'jumpboard', 'jump board', 'plyo', 'plyometric', 'hiit', 'burn'],
  ['footwork', 'foot work', 'feet on the bar', 'heels', 'toes', 'arches', 'tendon stretch'],
  ['warm up', 'warm-up', 'warmup', 'activation', 'prep', 'preparation'],
  ['cool down', 'cool-down', 'cooldown', 'wind down'],
  ['plank', 'planks', 'up stretch', 'long stretch', 'front support'],
  ['lunge', 'lunges', 'split', 'scooter', 'scooters'],
  ['squat', 'squats', 'sit to stand'],
  ['bridge', 'bridging', 'shoulder bridge', 'pelvic curl', 'hip lift'],
  ['rowing', 'row', 'rows'],
  ['feather', 'feathers', 'arm circles', 'chest expansion'],
  ['hundred', 'hundreds', 'the hundred', '100', '100s'],
  ['elephant', 'elephants'],
  ['kneeling', 'kneel', 'high kneel', 'low kneel', 'tall kneel'],
  ['quadruped', '4 point', 'four point', 'all fours', 'tabletop', 'box position', 'hands and knees'],
  ['supine', 'lying on your back', 'on your back', 'lying'],
  ['prone', 'on your stomach', 'face down', 'pulling straps', 'swan'],
  ['side lying', 'side-lying', 'sidelying', 'side kick', 'on your side'],
  ['standing', 'stand', 'standing work'],
  ['seated', 'sitting', 'sit'],
  ['box', 'long box', 'short box', 'sitting box'],
  ['dumbbell', 'dumbbells', 'hand weights', 'hand weight', 'free weights', 'weights'],
  ['ankle weights', 'ankle weight', 'wrist weights'],
  ['magic circle', 'ring', 'pilates ring', 'circle'],
  ['ball', 'small ball', 'overball', 'soft ball', 'pilates ball'],
  ['band', 'bands', 'loop band', 'resistance band', 'theraband', 'booty band', 'mini band'],
  ['beginner', 'beginners', 'easy', 'foundation', 'basics', 'intro'],
  ['advanced', 'hard', 'challenging', 'harder'],
];

const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'on', 'with', 'to', 'in', 'for', 'at']);
/** Lower case, plain letters and numbers, one space between words. */
export const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** The word without its ending, so "lunges", "lunging" and "lunge" match. */
export const stem = (w: string) => w.length <= 3 ? w : w.replace(/(ings|ing|ies|es|ed|s)$/, (m) => (m === 'ies' ? 'y' : '')) || w;

const groupsFor = new Map<string, number[]>();
RELATED.forEach((g, k) => { for (const w of g) { const key = norm(w); groupsFor.set(key, [...(groupsFor.get(key) || []), k]); } });

/** The related words for what was typed (each typed word, and the whole phrase). */
export function relatedTo(query: string): string[] {
  const q = norm(query);
  if (!q) return [];
  const out = new Set<string>();
  const add = (key: string) => { for (const k of groupsFor.get(key) || []) for (const w of RELATED[k]) out.add(norm(w)); };
  add(q);
  for (const w of q.split(' ')) if (!STOP.has(w)) { add(w); add(stem(w)); for (const [key] of groupsFor) if (key.length > 3 && stem(key) === stem(w)) add(key); }
  for (const w of q.split(' ')) out.delete(w);
  out.delete(q);
  return [...out];
}

/** Letters you'd have to change to get from one word to the other (stops early once past `max`). */
export function distance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev[j - 2] + 1);
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export interface Field { text: string; weight: number; label?: string }
export interface Hit<T> { item: T; score: number; why: string }

/** How well one typed word matches a piece of text: whole word, start of a word, inside a word, or a near miss. */
function wordScore(word: string, words: string[], joined: string): number {
  const w = stem(word);
  let best = 0;
  for (const t of words) {
    if (t === word || stem(t) === w) return 1;
    if (t.startsWith(word)) best = Math.max(best, 0.85);
    else if (word.length >= 3 && t.includes(word)) best = Math.max(best, 0.6);
    else if (word.length >= 4 && t.length >= 4 && distance(word, t, word.length >= 7 ? 2 : 1) <= (word.length >= 7 ? 2 : 1)) best = Math.max(best, 0.55);
  }
  if (!best && word.length >= 3 && joined.includes(word)) best = 0.5;
  return best;
}

/**
 * Scores each thing against what was typed. Every typed word has to be found somewhere (in its own
 * words or a related word); the best fields count most. Gives the matches, best first.
 */
export function search<T>(items: T[], query: string, fields: (t: T) => Field[]): Hit<T>[] {
  const q = norm(query);
  if (!q) return items.map((item) => ({ item, score: 0, why: '' }));
  const typed = q.split(' ').filter((w) => !STOP.has(w));
  const words = typed.length ? typed : q.split(' ');
  // related words for each typed word (and the phrase), to try when the word itself isn't there
  const rel = new Map(words.map((w) => [w, relatedTo(w)]));
  const phraseRel = relatedTo(q);
  const out: Hit<T>[] = [];
  for (const item of items) {
    const fs = fields(item).map((f) => ({ ...f, n: norm(f.text) })).filter((f) => f.n);
    const split = fs.map((f) => f.n.split(' '));
    let total = 0;
    let why = '';
    let ok = true;
    // the whole phrase in a name counts most
    const phraseHit = fs.findIndex((f) => f.n.includes(q));
    if (phraseHit >= 0) { total += 2 * fs[phraseHit].weight; why = fs[phraseHit].label || 'name'; }
    for (const w of words) {
      let best = 0, bestWhy = '';
      fs.forEach((f, k) => { const s = wordScore(w, split[k], f.n) * f.weight; if (s > best) { best = s; bestWhy = f.label || 'name'; } });
      if (best < 0.5) {
        // not there as typed: a related word will do, worth a little less
        for (const r of [...(rel.get(w) || []), ...phraseRel]) {
          fs.forEach((f, k) => { const rw = r.split(' '); const s = (rw.length > 1 ? (f.n.includes(r) ? 1 : 0) : wordScore(r, split[k], f.n) >= 0.85 ? 1 : 0) * f.weight * 0.8; if (s > best) { best = s; bestWhy = `${w} → ${r}`; } });
        }
      }
      if (best <= 0) { ok = false; break; }
      total += best;
      if (!why || bestWhy.includes('→')) why = why && !bestWhy.includes('→') ? why : bestWhy;
    }
    if (ok) out.push({ item, score: total, why });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** The related words worth showing under a search box ("Also searching core, abdominals"). */
export const alsoSearching = (query: string, max = 4) => relatedTo(query).filter((w) => w.length > 2).slice(0, max);

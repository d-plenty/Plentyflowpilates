// The pictures for each theme, by day (light mode) and by night (dark mode): the full-screen opening,
// and the still panel at the top of the Home tab.
import type { ThemeKey } from '../../lib/holidays';
import { DUSK, STARS, W, ball, bunting, cloud, collect, fireworks, flock, hills, jumper, moon, n, noHat, sand, sea, shadow, sky, squash, star, stars, sun, uid, type Burst } from './kit';
import {
  BALL_BAUBLE, BALL_EGG, BALL_GLITTER, BALL_JACK, EGGS, SLEIGH_DAY, SLEIGH_NIGHT, balloons, barbecue, bat, beachBall, bunny, bunnyEars, bunnyHopIn, christmasTree, confetti, egg,
  esky, fairyLights, flagOnPole, flower, flyingSleigh, grass, house, partyHat, present, pumpkin, rooHopIn, rooStanding, santaHat, spider, spookyTree, tomb, umbrella, web, witchHat,
} from './pieces';

export type Mode = 'open' | 'panel';
/** `op`: laid out for the full-screen opening (not the panel). `anim`: moving. */
interface Frame { H: number; op: boolean; anim: boolean; at: [number, number, number] }
const frame = (mode: Mode, anim: boolean): Frame => (mode === 'open' ? { H: 844, op: true, anim, at: [-6, 640, 1.95] } : { H: 230, op: false, anim: false, at: [146, 146, 1.05] });
const NAVY = '#0E2F4A';
type Draw = (night: boolean, f: Frame) => string;

// ---- Default: the Plenty Flow sunset, and a full moon by night
const plenty: Draw = (night, { H, op, anim, at }) => {
  const hz = op ? 590 : 150;
  let s: string;
  if (night) {
    s = sky([[0, '#071A3D'], [0.6, '#123A6B'], [1, '#1F5E8C']], hz) + stars(op ? STARS : squash(STARS, 0.3));
    s += op ? moon(272, 170, 56, '#F4F1E6', '#D9D3C0', '#E8F0FF') : moon(306, 58, 26, '#F4F1E6', '#D9D3C0', '#E8F0FF');
    s += sea(hz, '#0F3A63', '#5E8FBF', '#E8F0FF', op ? [200, 344] : [250, 360]) + sand(hz, '#A68C66', '#957D58', H);
  } else {
    s = sky([[0, '#1F5E8C'], [0.45, '#4E8FC2'], [0.8, '#F4B98A'], [1, '#F7A25E']], hz);
    s += op ? cloud(80, 140, 1.1, '#fff', -3) + cloud(300, 210, 0.8, '#fff', -9) + cloud(50, 420, 0.6, '#FDE3CC', -5) + cloud(330, 470, 0.7, '#FDE3CC', -12) + flock(380, '#1F3E5A', anim, -6, 100, 1.15) + flock(468, '#1F3E5A', anim, -11.5, 270, 0.9)
      : cloud(60, 50, 0.7, '#fff', -3) + cloud(330, 40, 0.5, '#fff', -9) + flock(78, '#1F3E5A', false, 0, 230, 0.8);
    s += op ? sun(250, hz, 46, '#F28C38', '#F7B267', null, 0.3) : sun(90, hz, 30, '#F28C38', '#F7B267', null, 0.3);
    s += sea(hz, '#1F5E8C', '#9CC3E2', '#FFD3A6', op ? [150, 350] : [40, 200]) + sand(hz, '#E9C891', '#DDB87C', H);
  }
  return s + jumper(NAVY, ball('#F28C38'), noHat, ...at, anim);
};

// ---- Christmas: a warm Aussie Christmas at the beach, Santa's sleigh pulled by kangaroos
const christmas: Draw = (night, { H, op, anim, at }) => {
  const hz = op ? 590 : 140;
  let s: string;
  if (night) {
    s = sky([[0, '#16376A'], [0.6, '#2C5C98'], [1, '#4E7FB8']], hz) + stars(op ? STARS : squash(STARS, 0.25, 30));
    s += op ? moon(270, 168, 64) : moon(300, 70, 28);
    s += op ? flyingSleigh(146, 1.3, SLEIGH_NIGHT, 96, anim, 96) : flyingSleigh(48, 0.62, SLEIGH_NIGHT, 0, false, 196);
    s += op ? fairyLights() : fairyLights(4, 7, 24);
    s += sea(hz, '#24507F', '#9EC2E4', '#FFF4C8', op ? [196, 344] : [240, 360]) + sand(hz, '#C9A86E', '#BB9A60', H);
  } else {
    s = sky([[0, '#2E9BDB'], [0.7, '#7CCBF0'], [1, '#C6ECFA']], hz);
    s += op ? sun(320, 108, 38, '#FFD23F', null, '#FFD54F') : sun(340, 60, 20, '#FFD23F', null, '#FFD54F');
    s += op ? cloud(70, 150, 1.2, '#fff', -4) + cloud(250, 260, 0.9, '#fff', -10) + cloud(330, 380, 0.7, '#fff', -6) : cloud(180, 104, 0.6, '#fff', -4);
    s += op ? flyingSleigh(176, 1.25, SLEIGH_DAY, 70, anim, 70) : flyingSleigh(50, 0.62, SLEIGH_DAY, 0, false, 150);
    s += bunting(['#C62828', '#2E7D32', '#FFD54F'], op ? 10 : 0);
    s += sea(hz, '#1E9CC0', '#BDEFFF', '#fff', op ? [150, 350] : [200, 360]) + sand(hz, '#F0D29A', '#E6C386', H);
  }
  if (op) {
    s += christmasTree(62, 652, 172, night) + present(84, 618, '#C62828', '#D84040', '#FFD54F', 0.9)
      + (night ? present(14, 632, '#2E7D32', '#388E3C', '#E53935', 0.7) + present(318, 626, '#F28C38', '#F5A05A', '#fff', 0.8) : present(14, 632, '#1F5E8C', '#2C72A8', '#FFD54F', 0.7) + umbrella(318, 608));
  } else {
    s += christmasTree(72, 214, 120, night) + present(104, 194, '#C62828', '#D84040', '#FFD54F', 0.6) + present(16, 200, '#1F5E8C', '#2C72A8', '#FFD54F', 0.5);
  }
  return s + jumper('#0B1E45', BALL_BAUBLE, santaHat, ...at, anim);
};

// ---- New Year: a beach party by day, fireworks over the sea at night
const newyear: Draw = (night, { H, op, anim, at }) => {
  const hz = op ? 590 : 146;
  let s: string;
  if (night) {
    s = sky([[0, '#070B2A'], [0.55, '#1A1F5C'], [1, '#3A2A7A']], hz) + stars(op ? STARS : squash(STARS, 0.3));
    s += fireworks(op
      ? [[100, 150, 46, '#FFD54F', 18], [290, 120, 38, '#FF6FAE', 16], [200, 250, 30, '#7FD3FF', 14], [330, 300, 26, '#B9F27C', 14], [60, 330, 24, '#fff', 12], [322, 424, 28, '#FFB04A', 16], [52, 446, 22, '#C8B8F0', 12]]
      : [[90, 54, 26, '#FFD54F', 16], [200, 40, 20, '#FF6FAE', 14], [300, 66, 24, '#7FD3FF', 14], [250, 104, 12, '#B9F27C', 12], [150, 96, 12, '#fff', 12]]);
    s += sea(hz, '#141A52', '#6B74C8', '#FFD54F', op ? [120, 300] : [150, 300]) + sand(hz, '#8E7B6A', '#7E6C5C', H);
  } else {
    s = sky([[0, '#2E9BDB'], [0.65, '#9ED8F5'], [1, '#FFE9C2']], hz);
    s += op ? sun(318, 116, 36, '#FFD23F', null, '#FFD54F') : sun(340, 58, 20, '#FFD23F', null, '#FFD54F');
    s += op ? cloud(80, 170, 1.1, '#fff', -3) + cloud(280, 420, 0.8, '#fff', -9) : cloud(120, 90, 0.6, '#fff', -3);
    s += bunting(['#F28C38', '#1F5E8C', '#FFD54F'], op ? 10 : 0);
    s += op ? confetti(130, 40, 560, anim) : confetti(48, 14, 134, false, 3, 1);
    s += sea(hz, '#1E9CC0', '#BDEFFF', '#fff', op ? [150, 350] : [200, 360]) + sand(hz, '#F0D29A', '#E6C386', H);
    s += op ? balloons(48, 566, 1) + balloons(346, 560, 0.9) + umbrella(214, 606, '#F28C38', '#1F5E8C') + esky(282, 664, 1) + beachBall(120, 652, 15)
      : balloons(40, 122, 0.6) + balloons(372, 118, 0.5) + esky(120, 196, 0.55) + beachBall(84, 192, 8) + `<g transform="translate(150 150) scale(.5)">${umbrella(0, 0, '#F28C38', '#1F5E8C')}</g>`;
  }
  return s + jumper(NAVY, BALL_GLITTER, partyHat, ...at, anim);
};

// ---- Australia Day: the flag flying, kangaroos and a barbecue at the beach; fireworks at dusk
const ausday: Draw = (night, { H, op, anim, at }) => {
  const hz = op ? 560 : 140;
  let s: string, rc: string;
  if (night) {
    s = sky(DUSK, hz) + stars(op ? STARS.slice(0, 10) : squash(STARS.slice(0, 10), 0.3));
    const cross: [number, number, number][] = op ? [[322, 128, 6], [292, 82, 5.4], [322, 36, 5.4], [347, 72, 4.8]] : [[352, 70, 3.4], [336, 44, 3], [352, 20, 3], [366, 40, 2.6]];
    s += cross.map(([x, y, r], i) => `<g class="tw" style="animation-delay:${n(-i * 0.6)}s">${southernStar(x, y, r)}</g>`).join('') + (op ? smallStar(334, 100, 3.2) : '');
    const fw: Burst[] = op ? [[292, 400, 36, '#FFCD00', 16], [206, 470, 22, '#fff', 14], [110, 150, 24, '#7FD39A', 12], [230, 120, 16, '#fff', 12], [356, 250, 18, '#FFCD00', 12], [150, 430, 18, '#7FD39A', 12]] : [[180, 50, 20, '#FFCD00', 14], [250, 30, 12, '#fff', 12], [130, 90, 12, '#7FD39A', 12]];
    s += fireworks(fw);
    s += op ? sun(250, hz, 42, '#FFCD00', '#FFD866', null, 0.35) : sun(250, hz, 22, '#FFCD00', '#FFD866', null, 0.35);
    s += sea(hz, '#1C5E8E', '#7FB6DA', '#FFE08A', op ? [150, 350] : [200, 300]) + sand(hz, '#D9AE6B', '#CFA15C', H);
    rc = '#3A2A16';
  } else {
    s = sky([[0, '#1C7FD0'], [0.6, '#69B8EE'], [1, '#BFE5FA']], hz);
    s += op ? sun(318, 120, 36, '#FFCD00', '#FFF1A8', '#FFDE59', 0.25) : sun(340, 56, 20, '#FFCD00', null, '#FFDE59');
    s += op ? cloud(300, 330, 0.9, '#fff', -6) + cloud(90, 150, 0.8, '#fff', -13) + flock(360, '#173E63', anim, -5, 75) : cloud(210, 80, 0.6, '#fff', -6);
    s += bunting(['#00843D', '#FFCD00'], op ? 10 : 0);
    s += sea(hz, '#1A86B8', '#BDEFFF', '#fff', op ? [150, 350] : [200, 340]) + sand(hz, '#F0D29A', '#E6C386', H);
    rc = '#6B4A26';
  }
  s += op
    ? barbecue(350, 654, 1, anim) + flagOnPole(34, 452, 690, 100, anim) + (anim ? rooHopIn(rc, 258, 642, 0.3, 6, 47, 0.5, 0.25) + rooHopIn(rc, 172, 644, 0.5, 4, 56, 0.72, 0.25) : rooStanding(rc, 258, 642, 0.3) + rooStanding(rc, 172, 644, 0.5))
    : barbecue(366, 180, 0.5, false) + flagOnPole(24, 64, 214, 62, false) + rooStanding(rc, 152, 190, 0.18) + rooStanding(rc, 110, 190, 0.3);
  return s + jumper('#0B1E45', ball('#FFCD00'), noHat, ...at, anim);
};
// The Southern Cross's stars have seven points; the small one, Epsilon, five.
const southernStar = (x: number, y: number, r: number) => star(x, y, r, 7, 4 / 9);
const smallStar = (x: number, y: number, r: number) => star(x, y, r, 5, 0.4);

// ---- Easter: a meadow of flowers and painted eggs, and a bunny hopping in
const easter: Draw = (night, { H, op, anim, at }) => {
  const hz = op ? 610 : 160;
  let s: string;
  if (night) {
    s = sky([[0, '#1E1A4A'], [0.6, '#3D3477'], [1, '#6A5BA6']], hz) + stars(op ? STARS : squash(STARS, 0.35), '#FFF8E1');
    s += op ? moon(110, 170, 58, '#FFF6DA', '#EADFB6', '#FFF6DA') : moon(300, 62, 28, '#FFF6DA', '#EADFB6', '#FFF6DA');
    s += hills(hz, '#2F5E46', '#3A6E52', '#2B5540', H);
  } else {
    s = sky([[0, '#8FCBEF'], [0.65, '#CDEAF7'], [1, '#FFF3D1']], hz);
    s += op ? sun(300, 120, 34, '#FFD23F', null, '#FFE082') : sun(330, 62, 20, '#FFD23F', null, '#FFE082');
    s += op ? cloud(80, 150, 1.1, '#fff', -2) + cloud(230, 400, 0.8, '#fff', -8) + cloud(60, 470, 0.6, '#fff', -11) : cloud(90, 70, 0.6, '#fff', -2);
    s += bunting(['#F6B8D0', '#B9E3C6', '#FFE39A', '#C8B8F0', '#9FD3F0'], op ? 10 : 0, 'round');
    s += hills(hz, '#8CCB6E', '#7CBD5E', '#6DAF52', H);
  }
  s += grass(hz + 32, night ? '#24503A' : '#5E9F45');
  const fireflies = (pts: [number, number][], r: number, moving: boolean) => pts.map(([x, y], i) => `<circle${moving ? ' class="tw2"' : ''} cx="${x}" cy="${y}" r="${r}" fill="#FFF59D"${moving ? ` style="animation-delay:${n(-i * 0.4)}s"` : ''}></circle>`).join('');
  const eggs = (pts: [number, number, number, number][]) => pts.map(([x, y, r, rot], i) => egg(x, y, EGGS[i % 5], r, rot)).join('');
  if (op) {
    s += night ? fireflies([[40, 560], [120, 600], [200, 540], [300, 580], [350, 520], [70, 640], [260, 630], [160, 680]], 2.2, anim)
      : ([[30, 672, '#F6B8D0'], [130, 650, '#fff'], [210, 662, '#C8B8F0'], [300, 648, '#FFE39A'], [366, 676, '#F6B8D0'], [16, 790, '#fff'], [372, 800, '#C8B8F0']] as const).map(([x, y, c]) => flower(x, y, c, 0.9)).join('');
    s += eggs([[26, 700, 11, -12], [48, 708, 9, 10], [348, 640, 10, 8], [370, 650, 8, -10], [330, 812, 10, 6], [20, 812, 9, -6]]);
    if (!night) s += anim ? bunnyHopIn(206, 640, 0.9) : `<g transform="translate(206 640)">${shadow(27, 2, 27)}</g>${bunny(206, 640, 0.9)}`;
  } else {
    s += night ? fireflies([[40, 130], [120, 150], [200, 120], [80, 190]], 1.8, false)
      : ([[20, 178, '#F6B8D0'], [158, 172, '#fff'], [84, 204, '#C8B8F0']] as const).map(([x, y, c]) => flower(x, y, c, 0.7)).join('');
    s += eggs([[30, 206, 9, -12], [50, 212, 7, 10], [150, 200, 7, 8], [364, 222, 7, -8]]);
    if (!night) s += `<ellipse cx="118" cy="188" rx="16" ry="1.8" fill="#000" opacity=".13"></ellipse>${bunny(102, 186, 0.5)}`;
  }
  const fig = '#3B2E6E';
  return s + jumper(fig, BALL_EGG, bunnyEars(fig), ...at, anim);
};

// ---- Halloween: bats, a spider web in the corner, a haunted house and glowing jack-o'-lanterns
const halloween: Draw = (night, { H, op, anim, at }) => {
  const hz = op ? 610 : 150;
  let s: string, bc: string, ey: string;
  if (night) {
    s = sky([[0, '#140A26'], [0.55, '#2B1744'], [1, '#5B2E6E']], hz) + stars(op ? STARS.slice(0, 12) : squash(STARS.slice(0, 12), 0.3), '#E9DDF7');
    s += op ? moon(110, 168, 62, '#F7A23B', '#E08A23', '#FFB74D') : moon(70, 64, 30, '#F7A23B', '#E08A23', '#FFB74D');
    bc = '#120A1C'; ey = '#F7A23B';
  } else {
    s = sky([[0, '#5B3C88'], [0.5, '#C0629B'], [0.85, '#F49A5B'], [1, '#FFC46B']], hz);
    s += op ? sun(110, 470, 44, '#FFB04A', '#FFD08A', null, 0.22) : sun(70, 118, 26, '#FFB04A', '#FFD08A', null, 0.22);
    bc = '#2A1640'; ey = '#FFC46B';
  }
  const threads = night ? '#E7DEF5' : '#F5EEFF';
  s += op
    ? web(390, 0, 236, threads, night ? 0.8 : 0.7, 1.1) + spider(334, 150) + bat(70, 120, 0.95, bc, anim, 0, ey) + bat(150, 216, 0.7, bc, anim, -2.4, ey) + bat(36, 262, 0.55, bc, anim, -4.6, ey) + bat(196, 116, 0.5, bc, anim, -1.2, ey)
    : web(390, 0, 120, threads, 0.8, 0.8) + `<g transform="translate(330 0) scale(.6)">${spider(0, 70)}</g>` + bat(170, 44, 0.6, bc, false, 0, ey) + bat(226, 78, 0.42, bc, false, 0, ey) + bat(128, 82, 0.36, bc, false, 0, ey);
  const far = night ? '#2A1A40' : '#4A2C6A', win = night ? '#FFD54F' : '#FFC46B';
  const [near, nearer] = night ? ['#3B2458', '#33204D'] : ['#5E3A7E', '#53336F'];
  const [stone, stone2] = night ? ['#6E5A8A', '#5E4C78'] : ['#8C78A8', '#7C6898'];
  if (op) {
    s += `<path d="M0 ${hz - 10} Q100 ${hz - 50} 220 ${hz - 20} T${W} ${hz - 40} V${hz + 40} H0Z" fill="${far}"></path>` + house(316, hz - 34, 0.9, far, win) + spookyTree(52, hz + 22, 1.15, far);
    s += hills(hz + 10, near, nearer, null, H) + tomb(160, hz + 44, 0.8, stone) + tomb(206, hz + 50, 0.65, stone2, '') + tomb(250, hz + 46, 0.72, stone);
    s += pumpkin(26, 690, 1.25, night) + pumpkin(64, 706, 0.9, night) + pumpkin(360, 650, 1.1, night) + pumpkin(370, 808, 0.9, night, night);
  } else {
    s += `<path d="M0 ${hz - 4} Q100 ${hz - 30} 220 ${hz - 10} T${W} ${hz - 24} V${hz + 30} H0Z" fill="${far}"></path>` + house(250, hz - 14, 0.5, far, win);
    s += hills(hz + 10, near, nearer, null, H) + pumpkin(30, 196, 0.85, night) + pumpkin(62, 208, 0.6, night) + tomb(120, 196, 0.5, stone);
  }
  return s + jumper('#120A1C', BALL_JACK, witchHat, ...at, anim);
};

const DRAW: Record<ThemeKey, Draw> = { default: plenty, christmas, newyear, ausday, easter, halloween };

// ---- what each theme says, and its colours on the default theme
export interface ThemeInfo {
  name: string;
  /** A holiday's colours, used while it's on if the app is on Plenty blue. */
  accent?: string; second?: string;
  greet?: string; line?: string;
  /** The opening's wordmark: how far down, its colours, and the holiday's pill. */
  mark: Record<'day' | 'night', { top: number; ink: string; flow: string; pill?: [text: string, bg: string] }>;
}
export const THEMES: Record<ThemeKey, ThemeInfo> = {
  default: { name: 'Default', mark: { day: { top: 220, ink: '#fff', flow: '#F28C38' }, night: { top: 300, ink: '#fff', flow: '#F28C38' } } },
  christmas: { name: 'Christmas', accent: '#1E6B45', second: '#C62828', greet: 'Merry Christmas', line: 'Sun, sand and springs on.', mark: { day: { top: 290, ink: '#fff', flow: '#FFD23F', pill: ['#fff', '#C62828'] }, night: { top: 300, ink: '#fff', flow: '#FBE29A', pill: ['#fff', '#C62828'] } } },
  newyear: { name: 'New Year', accent: '#1F5E8C', second: '#E0A800', greet: 'Happy New Year', line: 'New year, fresh flows.', mark: { day: { top: 270, ink: '#fff', flow: '#FFD54F', pill: ['#1F3E5A', '#FFD54F'] }, night: { top: 476, ink: '#fff', flow: '#FFD54F', pill: ['#070B2A', '#FFD54F'] } } },
  ausday: { name: 'Australia Day', accent: '#00843D', second: '#E0A800', greet: "G'day", line: 'Have a ripper of a class.', mark: { day: { top: 200, ink: '#fff', flow: '#FFCD00', pill: ['#FFCD00', '#00843D'] }, night: { top: 200, ink: '#fff', flow: '#FFCD00', pill: ['#FFCD00', 'rgba(7,26,61,.55)'] } } },
  easter: { name: 'Easter', accent: '#6E4FB0', second: '#E8669B', greet: 'Happy Easter', line: 'Hop to it. Springs on.', mark: { day: { top: 250, ink: '#3B2E6E', flow: '#E5779F', pill: ['#fff', '#B48BD9'] }, night: { top: 280, ink: '#fff', flow: '#F6B8D0', pill: ['#3B2E6E', '#F6B8D0'] } } },
  halloween: { name: 'Halloween', accent: '#5B2A86', second: '#E8731A', greet: 'Happy Halloween', line: 'Something spooky this way flows.', mark: { day: { top: 280, ink: '#fff', flow: '#FFC46B', pill: ['#fff', '#2A1640'] }, night: { top: 280, ink: '#fff', flow: '#F7A23B', pill: ['#F7A23B', 'rgba(20,10,38,.75)'] } } },
};
const PILL_LINE: Record<ThemeKey, string> = { default: '', christmas: 'Merry Christmas', newyear: 'Happy New Year', ausday: 'Happy Australia Day', easter: 'Happy Easter', halloween: 'Happy Halloween' };

/** What's in each picture, for VoiceOver. */
const LABEL: Record<ThemeKey, [day: string, night: string]> = {
  default: ['A beach at sunset: the orange sun setting into the sea, gulls and clouds, and a figure on a reformer', 'A beach at night: a full moon over the sea, stars, and a figure on a reformer'],
  christmas: ["A sunny Aussie Christmas at the beach: Santa's sleigh pulled by kangaroos, a decorated Christmas tree and presents on the sand, and a figure in a Santa hat on a reformer", "A warm Christmas night at the beach: Santa's sleigh pulled by kangaroos past a golden moon, twinkling lights, a lit-up Christmas tree, and a figure in a Santa hat on a reformer"],
  newyear: ['New Year at the beach: bunting, balloons, confetti, an esky and a beach ball, and a figure in a party hat on a reformer', "New Year's Eve at the beach: fireworks over the sea, and a figure in a party hat on a reformer"],
  ausday: ['Australia Day at the beach: green and gold bunting, the Australian flag flying, two kangaroos, a barbecue with sausages on, and a figure on a reformer', 'Australia Day at dusk: fireworks, the Southern Cross, the Australian flag flying, two kangaroos, a barbecue, and a figure on a reformer'],
  easter: ['A sunny Easter morning: pastel bunting, flowers and painted eggs in a meadow, a white bunny, and a figure with bunny ears on a reformer', 'An Easter night: a pale moon over a meadow, fireflies, painted eggs, and a figure with bunny ears on a reformer'],
  halloween: ["A Halloween evening: bats, a spider web in the corner with a spider, a haunted house, pumpkins, and a figure in a witch's hat on a reformer", "A Halloween night: a big orange moon, bats, a spider web with a spider, a haunted house and graveyard, glowing jack-o'-lanterns, and a figure in a witch's hat on a reformer"],
};
export const labelOf = (key: ThemeKey, night: boolean) => LABEL[key][night ? 1 : 0];

/** Plenty Flow / PILATES CLASS PLANNER / the holiday's line, drawn into the opening. */
function wordmark(key: ThemeKey, night: boolean): string {
  const m = THEMES[key].mark[night ? 'night' : 'day'];
  const id = uid('ws');
  const light = m.ink === '#fff';
  const shadowOf = light ? 'rgba(7,26,61,.45)' : 'rgba(255,255,255,.6)';
  const t = m.top;
  let s = `<defs><filter id="${id}" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="${shadowOf}"></feDropShadow></filter></defs>`
    + `<g font-family="Inter, system-ui, sans-serif" text-anchor="middle" filter="url(#${id})">`
    + `<text x="${W / 2}" y="${t + 36}" font-size="36" font-weight="800" letter-spacing="-.72"><tspan fill="${m.ink}">Plenty</tspan> <tspan fill="${m.flow}">Flow</tspan></text>`
    + `<text x="${W / 2}" y="${t + 61}" font-size="12" font-weight="700" letter-spacing="1.92" fill="${m.ink}" opacity=".92">PILATES CLASS PLANNER</text></g>`;
  if (m.pill) {
    const text = PILL_LINE[key], w = Math.round(text.length * 9 + 30);
    s += `<rect x="${n(W / 2 - w / 2)}" y="${t + 77}" width="${w}" height="31" rx="15.5" fill="${m.pill[1]}"></rect><text x="${W / 2}" y="${t + 98}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="700" fill="${m.pill[0]}">${text}</text>`;
  }
  return s;
}

/** Plenty Flow's slogan, part of the logo. */
export const SLOGAN = 'Breathe in, plan out.';
/** The slogan between the reformer's front legs, on every opening. */
function slogan(key: ThemeKey, night: boolean): string {
  const ink = key === 'halloween' ? '#F3E9FF' : night ? '#FFF6DA' : '#1F3E5A';
  return `<text x="205" y="771" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="17" font-weight="600" font-style="italic" letter-spacing=".3" fill="${ink}">${SLOGAN}</text>`;
}

/**
 * One picture, as SVG markup. `moving`: the opening plays (one jump, then it holds); otherwise it's
 * the still picture with the figure's knees bent, feet on the jump board.
 */
export function picture(key: ThemeKey, night: boolean, mode: Mode, opts: { moving?: boolean; words?: boolean } = {}): string {
  const moving = !!opts.moving && mode === 'open';
  const f = frame(mode, moving);
  const { out, css } = collect(() => DRAW[key](night, f));
  const body = out + (opts.words && mode === 'open' ? wordmark(key, night) + slogan(key, night) : '');
  return `<svg viewBox="0 0 ${W} ${f.H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${labelOf(key, night)}" preserveAspectRatio="xMidYMid slice" class="pf${moving ? '' : ' still'}">${css ? `<style>${css}</style>` : ''}${body}</svg>`;
}

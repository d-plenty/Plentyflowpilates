// The front and back of a body with the muscles shaded by how much they work, as on OpenPilates
// Server. Used on a movement (what it works mainly, and also) and in a flow's checks (the whole
// class). Muscles a body map has no place for are still listed in words beside it.
import type { ReactNode } from 'react';

const shade = (lvl?: number) => (lvl == null || lvl <= 0 ? 'var(--body-none)' : lvl > 0.66 ? 'var(--body-high)' : lvl > 0.33 ? 'var(--body-mid)' : 'var(--body-low)');
const FRONT = ['deltoids', 'chest', 'abdominals', 'obliques', 'hip_flexors', 'biceps', 'quadriceps', 'adductors'];
const BACK = ['deltoids', 'upper_back', 'lats', 'spinal_extensors', 'triceps', 'glutes', 'abductors', 'hamstrings', 'calves'];

function Outline() {
  return (
    <g fill="var(--body-base)">
      <circle cx={60} cy={18} r={13} /><rect x={54} y={30} width={12} height={10} />
      <rect x={34} y={40} width={52} height={80} rx={14} />
      <rect x={18} y={44} width={14} height={78} rx={7} /><rect x={88} y={44} width={14} height={78} rx={7} />
      <rect x={38} y={116} width={20} height={124} rx={9} /><rect x={62} y={116} width={20} height={124} rx={9} />
    </g>
  );
}
const Pair = ({ a, b }: { a: ReactNode; b: ReactNode }) => <>{a}{b}</>;
const words = (levels: Record<string, number>, ids: string[], names: (id: string) => string) => {
  const on = ids.filter((m) => (levels[m] || 0) > 0.33).map(names);
  return on.length ? `mostly ${on.join(', ')}` : 'little work';
};

/** `levels`: muscle id → 0..1. */
export function BodyMap({ levels, names = (id) => id.replace(/_/g, ' ') }: { levels: Record<string, number>; names?: (id: string) => string }) {
  const f = (id: string) => shade(levels[id]);
  return (
    <div className="body-maps">
      <figure style={{ margin: 0, textAlign: 'center' }}>
        <svg viewBox="0 0 120 250" role="img" aria-label={`Front of the body: ${words(levels, FRONT, names)}`}>
          <Outline />
          <Pair a={<ellipse cx={33} cy={50} rx={9} ry={8} fill={f('deltoids')} />} b={<ellipse cx={87} cy={50} rx={9} ry={8} fill={f('deltoids')} />} />
          <rect x={40} y={46} width={40} height={18} rx={6} fill={f('chest')} />
          <rect x={51} y={67} width={18} height={40} rx={5} fill={f('abdominals')} />
          <Pair a={<rect x={39} y={70} width={10} height={34} rx={5} fill={f('obliques')} />} b={<rect x={71} y={70} width={10} height={34} rx={5} fill={f('obliques')} />} />
          <rect x={42} y={108} width={36} height={9} rx={4} fill={f('hip_flexors')} />
          <Pair a={<rect x={20} y={62} width={10} height={26} rx={5} fill={f('biceps')} />} b={<rect x={90} y={62} width={10} height={26} rx={5} fill={f('biceps')} />} />
          <Pair a={<rect x={40} y={122} width={13} height={54} rx={6} fill={f('quadriceps')} />} b={<rect x={67} y={122} width={13} height={54} rx={6} fill={f('quadriceps')} />} />
          <Pair a={<rect x={53} y={124} width={5} height={40} rx={2.5} fill={f('adductors')} />} b={<rect x={62} y={124} width={5} height={40} rx={2.5} fill={f('adductors')} />} />
        </svg>
        <figcaption className="tiny">Front</figcaption>
      </figure>
      <figure style={{ margin: 0, textAlign: 'center' }}>
        <svg viewBox="0 0 120 250" role="img" aria-label={`Back of the body: ${words(levels, BACK, names)}`}>
          <Outline />
          <Pair a={<ellipse cx={33} cy={50} rx={9} ry={8} fill={f('deltoids')} />} b={<ellipse cx={87} cy={50} rx={9} ry={8} fill={f('deltoids')} />} />
          <rect x={40} y={44} width={40} height={18} rx={7} fill={f('upper_back')} />
          <Pair a={<rect x={38} y={64} width={11} height={32} rx={5} fill={f('lats')} />} b={<rect x={71} y={64} width={11} height={32} rx={5} fill={f('lats')} />} />
          <rect x={55} y={62} width={10} height={44} rx={4} fill={f('spinal_extensors')} />
          <Pair a={<rect x={20} y={62} width={10} height={26} rx={5} fill={f('triceps')} />} b={<rect x={90} y={62} width={10} height={26} rx={5} fill={f('triceps')} />} />
          <rect x={40} y={106} width={40} height={22} rx={10} fill={f('glutes')} />
          <Pair a={<ellipse cx={38} cy={112} rx={4} ry={8} fill={f('abductors')} />} b={<ellipse cx={82} cy={112} rx={4} ry={8} fill={f('abductors')} />} />
          <Pair a={<rect x={40} y={132} width={16} height={46} rx={7} fill={f('hamstrings')} />} b={<rect x={64} y={132} width={16} height={46} rx={7} fill={f('hamstrings')} />} />
          <Pair a={<rect x={41} y={186} width={14} height={40} rx={7} fill={f('calves')} />} b={<rect x={65} y={186} width={14} height={40} rx={7} fill={f('calves')} />} />
        </svg>
        <figcaption className="tiny">Back</figcaption>
      </figure>
    </div>
  );
}
export function BodyKey() {
  return <div className="row wrap center" style={{ gap: 12, justifyContent: 'center' }}>{([['var(--body-high)', 'A lot'], ['var(--body-mid)', 'Some'], ['var(--body-low)', 'A little']] as const).map(([c, l]) => <span key={l} className="tiny row" style={{ gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />{l}</span>)}</div>;
}

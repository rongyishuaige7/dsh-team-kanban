import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { T } from '../tokens';

export const Counter: React.FC<{ from: number; to: number; total: number; at: number }> = ({ from, to, total, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - at, fps, config: { damping: 16, mass: 0.7, stiffness: 120 } });
  const p = interpolate(f, [at, at + 26], [from / total, to / total], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const n = Math.round(interpolate(f, [at, at + 10], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const R = 56, C = 2 * Math.PI * R;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 132, height: 132, flex: 'none' }}>
        <svg width={132} height={132} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={66} cy={66} r={R} fill="none" stroke={T.line} strokeWidth={8} />
          <circle cx={66} cy={66} r={R} fill="none" stroke={T.green} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          fontSize: 46, fontWeight: 800, color: T.ink, letterSpacing: '-.03em',
          transform: `scale(${1 + (1 - pop) * 0.16})` }}>{n}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 22, color: T.muted, fontWeight: 600 }}>完成度</div>
        <div style={{ fontSize: 30, color: T.ink, fontWeight: 700 }}>{n}/{total}</div>
      </div>
    </div>
  );
};

import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { T } from '../tokens';

export const Caption: React.FC<{
  text: string;
  sub?: string;
  duration: number;
  tone?: 'light' | 'dark';
  bottom?: number;
  left?: number;
}> = ({ text, sub, duration, tone = 'light', bottom = 92, left = 84 }) => {
  const f = useCurrentFrame();
  const inT = interpolate(f, [4, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const outT = interpolate(f, [duration - 12, duration - 2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o = Math.min(inT, outT);
  const y = (1 - inT) * 22;
  const dark = tone === 'dark';
  return (
    <div style={{
      position: 'absolute', left, bottom, opacity: o, transform: `translateY(${y}px)`,
      display: 'flex', gap: 24, alignItems: 'stretch',
      padding: '26px 34px 26px 30px', borderRadius: 22,
      background: dark ? 'rgba(12,15,20,.82)' : 'rgba(255,255,255,.94)',
      border: `1px solid ${dark ? 'rgba(255,255,255,.14)' : 'rgba(16,24,40,.07)'}`,
      boxShadow: dark ? '0 24px 60px rgba(0,0,0,.38)' : '0 22px 60px rgba(16,24,40,.14), 0 2px 8px rgba(16,24,40,.05)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ width: 5, borderRadius: 3, background: T.blue, flex: 'none' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 60, lineHeight: 1.08, fontWeight: 700, letterSpacing: '-0.02em',
          color: dark ? '#fff' : T.ink }}>{text}</div>
        {sub ? <div style={{ fontSize: 29, lineHeight: 1.25, fontWeight: 500,
          color: dark ? 'rgba(255,255,255,.7)' : T.muted }}>{sub}</div> : null}
      </div>
    </div>
  );
};

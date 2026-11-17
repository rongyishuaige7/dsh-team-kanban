import React from 'react';

export type CursorSample = { f: number; x: number; y: number; down: number };

export const Cursor: React.FC<{ track: CursorSample[]; frame: number; zoom: number }> = ({ track, frame, zoom }) => {
  if (!track.length) return null;
  const i = Math.max(0, Math.min(track.length - 1, Math.round(frame)));
  const s = track[i];
  const prev = track[Math.max(0, i - 1)];
  const k = 1 / zoom;
  // ripple: expands over the 10 frames after a press
  let ripple: React.ReactNode = null;
  for (let j = i; j >= Math.max(0, i - 12); j--) {
    if (track[j].down) {
      const t = (i - j) / 12;
      const r = (8 + t * 34) * k;
      ripple = (
        <div key="r" style={{
          position: 'absolute', left: track[j].x * 1, top: track[j].y * 1,
          width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: '50%',
          border: `${2 * k}px solid rgba(47,107,255,${0.55 * (1 - t)})`,
          background: `rgba(47,107,255,${0.14 * (1 - t)})`,
        }} />
      );
      break;
    }
  }
  const moving = Math.abs(s.x - prev.x) + Math.abs(s.y - prev.y) > 0.6;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1440, height: 760, pointerEvents: 'none' }}>
      {ripple}
      <svg width={26 * k} height={32 * k} viewBox="0 0 26 32"
        style={{
          position: 'absolute', left: s.x - 3 * k, top: s.y - 2 * k,
          transform: `scale(${s.down ? 0.92 : 1})`, transformOrigin: `${3 * k}px ${2 * k}px`,
          filter: `drop-shadow(0 ${1.5 * k}px ${3 * k}px rgba(16,24,40,.35))`,
          transition: 'none',
        }}>
        <path d="M2 1.5 L2 25.4 L7.9 19.6 L12 29.2 L16.4 27.3 L12.3 17.9 L20.3 17.4 Z"
          fill="#ffffff" stroke="#111827" strokeWidth={1.7} strokeLinejoin="round" />
      </svg>
      {moving ? null : null}
    </div>
  );
};

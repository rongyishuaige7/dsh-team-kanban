import React from 'react';
import { interpolate, useCurrentFrame, staticFile, Img } from 'remotion';
import { T } from '../tokens';

export const Brand: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const ease = (a: number, b: number) =>
    interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cardIn = ease(0, 38);
  const k1 = ease(6, 24), k2 = ease(12, 30), k3 = ease(18, 36), k4 = ease(24, 42);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fbfcfe', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 1500, height: 1500, right: -480, top: -620, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(47,107,255,.12), rgba(47,107,255,0) 60%)' }} />
      <div style={{ position: 'absolute', width: 1100, height: 1100, left: -420, bottom: -700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,120,160,.07), rgba(99,120,160,0) 62%)' }} />

      <div style={{ position: 'absolute', right: 78, top: 262, width: 1040, height: 552,
        perspective: 2400, opacity: cardIn }}>
        <div style={{
          width: 1040, height: 552, borderRadius: 16, overflow: 'hidden', background: '#fff',
          transformOrigin: '100% 50%',
          transform: `translateX(${(1 - cardIn) * 130}px) rotateY(${-14 + (1 - cardIn) * 5}deg) rotateX(2.2deg)`,
          boxShadow: '0 54px 130px rgba(16,24,40,.17), 0 10px 30px rgba(16,24,40,.07)',
          border: '1px solid rgba(16,24,40,.06)',
        }}>
          <Img src={staticFile('assets/board-final.png')} style={{ width: 1040, height: 552, objectFit: 'cover', objectPosition: 'left top', display: 'block', marginLeft: -20, marginTop: -16 }} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 120, top: 292, width: 700 }}>
        <div style={{ opacity: k1, transform: `translateY(${(1 - k1) * 14}px)`, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 22, letterSpacing: '.22em', color: T.blue, fontWeight: 600 }}>DSH PLUGIN</div>
        <div style={{ opacity: k2, transform: `translateY(${(1 - k2) * 18}px)`, marginTop: 24,
          fontSize: 106, lineHeight: 1.02, fontWeight: 800, letterSpacing: '-.035em', color: T.ink }}>Team<br />Kanban</div>
        <div style={{ opacity: k3, transform: `translateY(${(1 - k3) * 14}px)`, marginTop: 28,
          fontSize: 34, lineHeight: 1.35, fontWeight: 500, color: T.inkSoft }}>多智能体任务看板<br />原生右侧栏，随团队投影实时流转</div>
        <div style={{ opacity: k4, marginTop: 44, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ padding: '10px 18px', borderRadius: 999, border: `1px solid ${T.line}`, background: '#fff',
            fontSize: 21, color: T.muted, fontWeight: 500 }}>MIT License</div>
          <div style={{ padding: '10px 18px', borderRadius: 999, border: `1px solid ${T.line}`, fontSize: 21,
            color: T.inkSoft, fontWeight: 500, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>dsh plugin add dsh-team-kanban</div>
        </div>
      </div>
    </div>
  );
};

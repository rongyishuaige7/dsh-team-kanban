import React from 'react';
import { AbsoluteFill, Sequence, interpolate, Easing, useCurrentFrame } from 'remotion';
import { Scene, camLerp, CamState } from './components/Scene';
import { Caption } from './components/Caption';
import { Brand } from './components/Brand';
import { Counter } from './components/Counter';
import { Cursor, CursorSample } from './components/Cursor';
import TRACK from './cursor-track.json';
import { T } from './tokens';

const E = Easing.bezier(0.33, 0, 0.15, 1);

const useT = (dur: number) => {
  const f = useCurrentFrame();
  return interpolate(f, [0, dur], [0, 1], { extrapolateRight: 'clamp', easing: E });
};

// ---- S1: opening ----------------------------------------------------------
const S1: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT(dur);
  const cam: CamState = camLerp({ cx: 878, cy: 300, zoom: 1.40, rotY: 3.2 }, { cx: 740, cy: 380, zoom: 1.16, rotY: -1.0 }, t);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 78% 8%, #eef3fb 0%, #f7f9fc 45%, #eef1f6 100%)' }}>
      <div style={{ position: 'absolute', width: 1500, height: 1500, right: -500, top: -700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(47,107,255,.10), rgba(47,107,255,0) 60%)' }} />
      <Scene src="footage/s1.mp4" cam={cam} radius={16} shadow />
      <Caption text="一个想法，一支团队" sub="6 个任务自动拆解成 DAG，按依赖派发给队友" duration={dur} />
    </AbsoluteFill>
  );
};

// ---- S2: dependency -------------------------------------------------------
const S2: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT(dur);
  const cam: CamState = camLerp({ cx: 486, cy: 282, zoom: 1.80 }, { cx: 546, cy: 330, zoom: 1.96 }, t);
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      <Scene src="footage/s2.mp4" cam={cam} />
      <Caption text="依赖即阻塞" sub="前序未完，卡片自动挂起；前序完成，立刻解锁" duration={dur} />
    </AbsoluteFill>
  );
};

// ---- S3: FLIP flight (slow motion) ---------------------------------------
const S3: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT(dur);
  const cam: CamState = camLerp({ cx: 700, cy: 392, zoom: 1.26 }, { cx: 800, cy: 402, zoom: 1.36 }, t);
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      <Scene src="footage/s3.mp4" cam={cam} rate={1} />
      <Caption text="认领 · 流转 · 完成" sub="跨列时卡片物理飞跃，落位即打勾" duration={dur} />
    </AbsoluteFill>
  );
};

// ---- S4: completion -------------------------------------------------------
const S4: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT(dur);
  const cam: CamState = camLerp({ cx: 950, cy: 286, zoom: 1.58 }, { cx: 1022, cy: 330, zoom: 1.74 }, t);
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      <Scene src="footage/s4.mp4" cam={cam} />
      <div style={{ position: "absolute", right: 84, bottom: 88, padding: "16px 24px", borderRadius: 22, background: "rgba(255,255,255,.95)", border: "1px solid rgba(16,24,40,.07)", boxShadow: "0 22px 60px rgba(16,24,40,.14)", backdropFilter: "blur(20px)" }}><Counter from={5} to={6} total={6} at={107} /></div>
      <Caption text="进度，一直在你眼前" sub="环形角标 · 能量轨 · 标签页计数，三处同步" duration={dur} bottom={104} />
    </AbsoluteFill>
  );
};

// ---- S5: theme split ------------------------------------------------------
const S5: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT(dur);
  const cam: CamState = camLerp({ cx: 720, cy: 216, zoom: 1.26 }, { cx: 720, cy: 190, zoom: 1.42 }, t);
  const band = (src: string, top: number) => (
    <div style={{ position: 'absolute', top, left: 0, width: 1920, height: 540, overflow: 'hidden', background: src.includes('5d') ? '#0c0f14' : '#fff' }}>
      <Scene src={src} cam={cam} vh={540} />
    </div>
  );
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      {band('footage/s5.mp4', 0)}
      {band('footage/s5d.mp4', 540)}
      <div style={{ position: 'absolute', top: 537, left: 0, width: 1920, height: 6, background: '#fff' }} />
      <Caption text="Light / Dark 跟随宿主" sub="只使用 --dsw-alias-* token，深浅自动适配" duration={dur} tone="dark" bottom={56} />
    </AbsoluteFill>
  );
};


// ---- S6: disarm with real cursor -----------------------------------------
const S6: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT(dur);
  const f = useCurrentFrame();
  const cam: CamState = camLerp({ cx: 862, cy: 300, zoom: 1.58 }, { cx: 906, cy: 336, zoom: 1.66 }, t);
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      <Scene src="footage/s6.mp4" cam={cam}>
        <Cursor track={TRACK as CursorSample[]} frame={f} zoom={cam.zoom} />
      </Scene>
      <Caption text="一键收队" sub="停用团队协作：任务保留，看板自动收起，不留空标签" duration={dur} />
    </AbsoluteFill>
  );
};

// ---- composition ----------------------------------------------------------
const Fade: React.FC<{ dur: number; fi?: number; fo?: number; children: React.ReactNode }> = ({ dur, fi = 0, fo = 0, children }) => {
  const f = useCurrentFrame();
  const a = fi ? interpolate(f, [0, fi], [0, 1], { extrapolateRight: 'clamp' }) : 1;
  const b = fo ? interpolate(f, [dur - fo, dur - 1], [1, 0], { extrapolateLeft: 'clamp' }) : 1;
  return <AbsoluteFill style={{ opacity: Math.min(a, b) }}>{children}</AbsoluteFill>;
};

export const Launch: React.FC = () => (
  <AbsoluteFill style={{ background: '#fff' }}>
    <Sequence from={0} durationInFrames={211}><S1 dur={211} /></Sequence>
    <Sequence from={211} durationInFrames={193}><S2 dur={193} /></Sequence>
    <Sequence from={404} durationInFrames={128}><S3 dur={128} /></Sequence>
    <Sequence from={532} durationInFrames={209}><Fade dur={209} fo={8}><S4 dur={209} /></Fade></Sequence>
    <Sequence from={733} durationInFrames={180}><Fade dur={180} fi={8} fo={8}><S5 dur={180} /></Fade></Sequence>
    <Sequence from={905} durationInFrames={130}><Fade dur={130} fi={8} fo={8}><S6 dur={130} /></Fade></Sequence>
    <Sequence from={1027} durationInFrames={210}><Fade dur={210} fi={8}><Brand duration={210} /></Fade></Sequence>
  </AbsoluteFill>
);

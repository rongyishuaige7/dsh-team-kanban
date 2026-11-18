// S3: Live 3-Column Flow + SVG Bézier Lineage + 0fr->1fr Drawer + Cross-Lane FLIP (177f)
// Faithful to demos/camera/depth-layer-moves/MultiplaneReal.tsx (`depth-layer-moves · multiplane`):
// Single `driveAt(f)` curve drives 3 true depth planes at >=2x velocity ratio (far 0.35x / mid 0.7x / near 1.4x):
// - Far (0.35x): defocused & desaturated full DSH shell + Porcelain atmospheric veil + desk horizon shadow
// - Mid (0.7x): razor-sharp 2x live-captured board video (`clips/live-flow-light.mp4`), settling dead-center
//   at f126 followed by hero elevation lift (`lift` f122..144) + focus ring + badge
// - Near (1.4x): oversized depth-blurred domain pills sweeping across foreground margins with `SpeedBlur`
// - Fixed (0x): top reference header bar anchored to screen space ("words stay, world glides").
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { DSH, FONTS, KanbanMark } from '../tokens';
import { EASE, Grain, SpeedBlur, alpha, bezier, mix, ramp, softShadow, velocity } from '../lib/Polish';

export const SCENE_FLOW_DEFAULTS = {
  badgeTop: 'LIVE PROJECTION · ZERO SQLITE',
  accent: DSH.brand,
  duration: 177,
};

const DRIVE_EASE = bezier(0.45, 0, 0.18, 1);
const MID_W = 1520;
const MID_H = 786;
const MID_END_X = (1920 - MID_W) / 2; // 200px (settled dead-center)
const DRIVE = 320; // Mid moves -0.7 * 320 = -224px; Far moves -112px; Near moves -448px!
const MID_START_X = MID_END_X + DRIVE * 0.7; // 424px -> glides to 200px at f126

const driveAt = (f: number) =>
  DRIVE * ramp(f, 4, 122, DRIVE_EASE) + 4 * ramp(f, 126, 51, EASE.smooth);

// Foreground 1.4x pills: sweep past outer margins during fast slide; never cross bottom CaptionBar
const FG_PILLS = [
  { t: 'blockedBy', x: 56, y: 230, tone: 'ink' },
  { t: 'agentTeam', x: 76, y: 780, tone: 'accent' },
  { t: '0fr → 1fr', x: 2178, y: 176, tone: 'accent' },
  { t: 'FLIP', x: 2178, y: 906, tone: 'surface' },
] as const;

export type SceneFlowProps = Partial<typeof SCENE_FLOW_DEFAULTS> & {
  texDir?: string;
  clipSrc?: string;
  phases?: readonly [string, string, string];
};

export const SceneFlow: React.FC<SceneFlowProps> = ({
  badgeTop = SCENE_FLOW_DEFAULTS.badgeTop,
  accent = SCENE_FLOW_DEFAULTS.accent,
  duration = SCENE_FLOW_DEFAULTS.duration,
  texDir = 'textures',
  clipSrc = 'clips/live-flow-light.mp4',
  phases = [
    '① 悬停血缘连线 · 0fr→1fr 抽屉',
    '② 前置完成解锁 · 跨列 FLIP 弧线飞行',
    '③ 6/6 全部收口 · 环形角标打勾',
  ] as const,
}) => {
  const frame = useCurrentFrame();
  const drive = driveAt(frame);
  const vFg = -1.4 * velocity(driveAt, frame);

  const intro = ramp(frame, 0, 12, EASE.out);
  const outro = interpolate(frame, [Math.max(20, duration - 8), duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Hero settle lift + focus ring + badge (MultiplaneReal.tsx lines 58-59, 85-101)
  const lift = ramp(frame, 122, 22, EASE.out);
  const ring = ramp(frame, 128, 16, EASE.snappy);

  // Phase status pill tracks the live video's 3 real acts:
  // 0..68f: SVG Bézier lineage & 0fr->1fr drawer | 68..142f: Unlock & Cross-Lane FLIP | 142..177f: 6/6 ✓ Completed!
  const phaseLabel = frame < 68 ? phases[0] : frame < 142 ? phases[1] : phases[2];
  const isDone = frame >= 142;
  const phaseColor = isDone ? DSH.emeraldInk : accent;
  const phaseBg = isDone ? 'rgba(34,197,94,0.12)' : DSH.brandSoft;
  const ringColor = isDone ? DSH.emerald : accent;

  return (
    <AbsoluteFill style={{ backgroundColor: DSH.stageMid, opacity: outro, overflow: 'hidden' }}>
      {/* 1. Far Plane (0.35x): defocused & desaturated full DSH shell + Porcelain atmospheric veil */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translateX(${(-drive * 0.35).toFixed(2)}px)`,
          filter: 'blur(5px) saturate(0.7)',
          opacity: 0.74,
        }}
      >
        <Img
          src={staticFile(`${texDir}/app-step7-light.png`)}
          style={{ position: 'absolute', left: -60, top: -50, width: 2200 }}
        />
      </div>

      {/* Atmospheric perspective veil (denser at top, letting subtle far depth breathe) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${alpha(DSH.stageTop, 0.86)} 0%, ${alpha(DSH.stageMid, 0.68)} 52%, ${alpha(DSH.stageBtm, 0.60)} 100%)`,
        }}
      />

      {/* Desk horizon shelf supporting mid-plane drop shadow */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 760,
          height: 320,
          background: `linear-gradient(180deg, ${alpha(DSH.shadow, 0)}, ${alpha(DSH.shadow, 0.06)} 42%, ${alpha(DSH.shadow, 0.02)})`,
        }}
      />

      {/* 2. Mid Plane (0.7x): razor-sharp live-captured 3-column flow video + settle lift */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 118,
          transform: `translateX(${(-drive * 0.7).toFixed(2)}px)`,
          opacity: intro,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: MID_START_X,
            top: 0,
            width: MID_W,
            height: MID_H,
            borderRadius: 20,
            overflow: 'hidden',
            background: '#ffffff',
            border: '1px solid rgba(15, 17, 21, 0.08)',
            transform: `translateY(${(-10 * lift).toFixed(2)}px) scale(${(1 + 0.02 * lift).toFixed(4)})`,
            transformOrigin: '50% 50%',
            boxShadow: `0 0 0 ${(2.5 * ring).toFixed(2)}px ${alpha(ringColor, 0.88)}, inset 0 1px 0 #ffffff, ${softShadow(mix(14, 34, lift), { color: DSH.shadow, strength: 1.22 })}`,
          }}
        >
          <OffthreadVideo
            src={staticFile(clipSrc)}
            muted
            style={{
              width: MID_W,
              height: 950,
              objectFit: 'cover',
              objectPosition: 'center top',
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* 3. Near Plane (1.4x): depth-blurred foreground capsules with velocity-driven SpeedBlur */}
      <SpeedBlur vx={vFg} amount={0.2} max={10}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translateX(${(-drive * 1.4).toFixed(2)}px)`,
            pointerEvents: 'none',
          }}
        >
          {FG_PILLS.map((p) => {
            const bg =
              p.tone === 'accent' ? accent : p.tone === 'ink' ? DSH.ink : '#ffffff';
            const fg = p.tone === 'surface' ? DSH.ink : '#ffffff';
            return (
              <div
                key={p.t}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  height: 104,
                  padding: '0 44px',
                  borderRadius: 52,
                  display: 'flex',
                  alignItems: 'center',
                  background: bg,
                  color: fg,
                  fontFamily: FONTS.mono,
                  fontSize: 48,
                  fontWeight: 680,
                  filter: 'blur(6.5px)',
                  opacity: 0.86,
                  boxShadow: `0 36px 64px -10px ${alpha(DSH.shadow, 0.32)}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {p.t}
              </div>
            );
          })}
        </div>
      </SpeedBlur>

      {/* 4. Fixed Reference Frame Layer (0x): stationary header bar ("words stay, world glides") */}
      <div
        style={{
          position: 'absolute',
          left: 136,
          right: 136,
          top: 34,
          height: 54,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: intro,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <KanbanMark size={42} tone="light" />
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 32,
              fontWeight: 650,
              letterSpacing: '0.06em',
              color: DSH.ink2,
            }}
          >
            {badgeTop}
          </span>
        </div>

        <div
          style={{
            padding: '8px 22px',
            borderRadius: 999,
            background: phaseBg,
            border: `1px solid ${alpha(ringColor, 0.25)}`,
            fontFamily: FONTS.sans,
            fontSize: 32,
            fontWeight: 680,
            color: phaseColor,
          }}
        >
          {phaseLabel}
        </div>
      </div>

      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};

// Native 9:16 Vertical Short-Video Launch Cut (1080x1920 @ 30fps, 590f = 19.67s = 40 beats b36..b76)
// Tailored for Xiaohongshu / Douyin / WeChat Channels / YouTube Shorts — culminates on the exact Bar 16 Drop!
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { DSH, FONTS, KanbanMark } from './tokens';
import { beatF } from './timeline';
import { PEAK_F, sfxFrom } from './sfx';
import { EASE, Grain, SpeedBlur, StudioBackdrop, alpha, bezier, mix, ramp, softShadow, velocity } from './lib/Polish';

const B_START = beatF(36); // 534
const B44 = beatF(44) - B_START; // 118
const B56 = beatF(56) - B_START; // 295
const B64 = beatF(64) - B_START; // 413 (Exact Bar 16 Peak Drop!)
const B76 = beatF(76) - B_START; // 590

export const VERTICAL_TOTAL_FRAMES = B76;

const V_SHOTS = {
  v1_hook: { from: 0, to: B44, duration: B44 },
  v2_flow: { from: B44, to: B56, duration: B56 - B44 },
  v3_theme: { from: B56, to: B64, duration: B64 - B56 },
  v4_outro: { from: B64, to: B76, duration: B76 - B64 },
} as const;

const V_SFX = [
  { id: 'v1-in', from: sfxFrom(6, 'swoosh-quick.mp3'), duration: 24, src: 'swoosh-quick.mp3', volume: 0.48 },
  { id: 'v1-beam', from: sfxFrom(32, 'light-sweep-magic.mp3'), duration: 64, src: 'light-sweep-magic.mp3', volume: 0.64 },
  { id: 'v2-in', from: sfxFrom(V_SHOTS.v2_flow.from + 6, 'transition-soft.mp3'), duration: 36, src: 'transition-soft.mp3', volume: 0.42 },
  { id: 'v2-drawer', from: sfxFrom(V_SHOTS.v2_flow.from + 28, 'switch-click-quick.mp3'), duration: 24, src: 'switch-click-quick.mp3', volume: 0.44 },
  { id: 'v2-flip', from: sfxFrom(V_SHOTS.v2_flow.from + 105, 'wind-woosh-throw.mp3'), duration: 29, src: 'wind-woosh-throw.mp3', volume: 0.48 },
  { id: 'v2-done', from: sfxFrom(V_SHOTS.v2_flow.from + 145, 'lock-quick.mp3'), duration: 30, src: 'lock-quick.mp3', volume: 0.46 },
  { id: 'v3-click', from: sfxFrom(V_SHOTS.v3_theme.from + 15, 'switch-light.mp3'), duration: 12, src: 'switch-light.mp3', volume: 1.05 },
  { id: 'v3-sweep', from: sfxFrom(V_SHOTS.v3_theme.from + 24, 'air-woosh-deep.mp3'), duration: 68, src: 'air-woosh-deep.mp3', volume: 0.50 },
  { id: 'v3-riser', from: sfxFrom(V_SHOTS.v4_outro.from, 'riser-cine.mp3'), duration: 50, src: 'riser-cine.mp3', volume: 0.48 },
  { id: 'v4-sweep', from: sfxFrom(V_SHOTS.v4_outro.from + 8, 'swoosh-quick.mp3'), duration: 24, src: 'swoosh-quick.mp3', volume: 0.46 },
  { id: 'v4-impact', from: sfxFrom(V_SHOTS.v4_outro.from + 45, 'impact-deep-whoosh.mp3'), duration: 96, src: 'impact-deep-whoosh.mp3', volume: 0.58 },
  { id: 'v4-sparkle', from: sfxFrom(V_SHOTS.v4_outro.from + 70, 'shimmer-sparkle-sweep.mp3'), duration: 84, src: 'shimmer-sparkle-sweep.mp3', volume: 0.42 },
];
void PEAK_F;

const VerticalCaption: React.FC<{ text: string; dark?: boolean; duration: number }> = ({ text, dark = false, duration }) => {
  const f = useCurrentFrame();
  const inT = ramp(f, 4, 12, EASE.out);
  const outT = 1 - ramp(f, duration - 10, 10, EASE.exit);
  return (
    <div
      style={{
        position: 'absolute',
        left: 56,
        right: 56,
        bottom: 128,
        display: 'flex',
        justifyContent: 'center',
        opacity: inT * outT,
        transform: `translateY(${((1 - inT) * 18).toFixed(1)}px)`,
      }}
    >
      <div
        style={{
          padding: '20px 38px',
          borderRadius: 999,
          background: dark ? 'rgba(21,23,30,0.92)' : 'rgba(255,255,255,0.94)',
          border: dark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(15,17,21,0.09)',
          boxShadow: dark ? '0 22px 54px -14px rgba(0,2,10,0.75)' : softShadow(24, { color: DSH.shadow }),
          display: 'inline-flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 4,
            background: dark ? DSH.brandDark : DSH.brand,
          }}
        />
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 48,
            fontWeight: 740,
            color: dark ? DSH.darkInk : DSH.ink,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

// V1: Hook + @4x Hero Card #4 with 2-lap Perimeter Beam
const VSceneHook: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const intro = ramp(f, 0, 14, EASE.out);
  const lift = ramp(f, 12, 20, bezier(0.2, 1.25, 0.3, 1));
  const beam1 = interpolate(f, [24, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const beam2 = interpolate(f, [50, 76], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cardW = 944;
  const cardH = 234;

  return (
    <AbsoluteFill style={{ background: '#0b101e', overflow: 'hidden' }}>
      {/* Dimmed full board context behind spotlight */}
      <Img
        src={staticFile('textures/app-step7-light.png')}
        style={{
          position: 'absolute',
          left: -980,
          top: 420,
          width: 2480,
          opacity: 0.22,
          filter: 'blur(3px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(640px 640px at 50% 52%, rgba(65,118,230,0.28) 0%, rgba(11,16,30,0.88) 72%)',
        }}
      />

      {/* Top Brand Kicker + 2-Line Vertical Headline */}
      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 68,
          right: 68,
          textAlign: 'center',
          opacity: intro,
          transform: `translateY(${((1 - intro) * 20).toFixed(1)}px)`,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <KanbanMark size={48} tone="dark" />
          <span style={{ fontFamily: FONTS.mono, fontSize: 34, fontWeight: 680, color: DSH.brandDark, letterSpacing: '0.06em' }}>
            DEEPSEEK HARNESS · v0.5.7
          </span>
        </div>
        <div style={{ fontFamily: FONTS.sans, fontSize: 82, fontWeight: 820, lineHeight: 1.16, color: '#ffffff', letterSpacing: '-0.03em' }}>
          多智能体协作
          <br />
          <span style={{ color: DSH.brandDark }}>别再盲猜进度</span>
        </div>
      </div>

      {/* Center @4x Hero Card #4 (1424x352 native -> 944x234 razor-sharp!) */}
      <div
        style={{
          position: 'absolute',
          left: (1080 - cardW) / 2,
          top: 840,
          width: cardW,
          height: cardH,
          transform: `translateY(${((1 - lift) * 44).toFixed(1)}px) scale(${(0.9 + 0.1 * lift).toFixed(4)})`,
          opacity: intro,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 24,
            overflow: 'hidden',
            background: '#ffffff',
            boxShadow: '0 44px 96px -16px rgba(0,4,16,0.78), 0 0 0 2px rgba(122,170,255,0.35)',
          }}
        >
          <Img src={staticFile('textures/card4-hero-4x.png')} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Single-hero 2-lap perimeter scan beam */}
        {(f >= 24 && f <= 78) && (
          <svg
            width={cardW + 12}
            height={cardH + 12}
            style={{ position: 'absolute', left: -6, top: -6, overflow: 'visible', pointerEvents: 'none' }}
          >
            <rect
              x={3}
              y={3}
              width={cardW + 6}
              height={cardH + 6}
              rx={26}
              fill="none"
              stroke={f < 48 ? DSH.brandDark : DSH.amber}
              strokeWidth={5}
              pathLength={1}
              strokeDasharray="0.24 0.76"
              strokeDashoffset={-(f < 48 ? beam1 : beam2)}
              style={{ filter: 'drop-shadow(0 0 12px rgba(122,170,255,0.85))' }}
            />
          </svg>
        )}
      </div>

      {/* Sub-card explanation */}
      <div
        style={{
          position: 'absolute',
          top: 1126,
          left: 80,
          right: 80,
          textAlign: 'center',
          fontFamily: FONTS.sans,
          fontSize: 40,
          fontWeight: 620,
          color: 'rgba(245,247,252,0.86)',
          opacity: ramp(f, 20, 14, EASE.out),
        }}
      >
        前置依赖 · 下游瓶颈计数 · 写范围冲突直出
      </div>

      <VerticalCaption text="原生血缘与写冲突一眼锁定" dark duration={duration} />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

// V2: Live 3-Column FLIP + SVG Bézier Lineage + Drawer
const VSceneFlow: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const intro = ramp(f, 0, 12, EASE.out);
  const isDone = f >= 142;
  const phase =
    f < 68
      ? '① 悬停血缘连线 · 0fr→1fr 抽屉'
      : f < 142
        ? '② 前置完成解锁 · 跨列 FLIP 飞行'
        : '③ 6/6 全部收口 · 环形角标打勾';

  return (
    <AbsoluteFill style={{ background: DSH.stageMid, overflow: 'hidden' }}>
      <StudioBackdrop />
      <div style={{ position: 'absolute', top: 140, left: 64, right: 64, textAlign: 'center', opacity: intro }}>
        <div style={{ fontFamily: FONTS.sans, fontSize: 70, fontWeight: 800, color: DSH.ink, letterSpacing: '-0.03em' }}>
          右侧栏活体三列流转
        </div>
        <div
          style={{
            marginTop: 26,
            display: 'inline-block',
            padding: '12px 28px',
            borderRadius: 999,
            background: isDone ? 'rgba(34,197,94,0.14)' : DSH.brandSoft,
            border: `1.5px solid ${alpha(isDone ? DSH.emerald : DSH.brand, 0.28)}`,
            fontFamily: FONTS.sans,
            fontSize: 36,
            fontWeight: 680,
            color: isDone ? DSH.emeraldInk : DSH.brand,
          }}
        >
          {phase}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 44,
          top: 430,
          width: 992,
          height: 1120,
          borderRadius: 26,
          overflow: 'hidden',
          background: '#ffffff',
          border: `2px solid ${alpha(isDone ? DSH.emerald : DSH.brand, isDone ? 0.65 : 0.16)}`,
          boxShadow: softShadow(32, { color: DSH.shadow, strength: 1.22 }),
          opacity: intro,
        }}
      >
        <OffthreadVideo
          src={staticFile('clips/live-flow-light.mp4')}
          muted
          style={{
            width: 1520,
            height: 1120,
            marginLeft: -24,
            objectFit: 'cover',
            objectPosition: 'left top',
            display: 'block',
          }}
        />
      </div>

      <VerticalCaption text="零 SQLite 同步 · 读宿主原生投影" duration={duration} />
      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};

// V3: Native 360px Sidebar Portrait Hero + 15° Day/Night Sweep
const VSceneTheme: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const sweepT = ramp(f, 16, 56, bezier(0.3, 0, 0.35, 1));
  const yCut = mix(-300, 2220, sweepT);
  const t15 = Math.tan((15 * Math.PI) / 180);
  const nightClip =
    sweepT >= 1
      ? 'none'
      : `polygon(-200px -300px, 1280px -300px, 1280px ${yCut - 200 * t15}px, -200px ${yCut + 1280 * t15}px)`;

  const renderLayer = (night: boolean) => (
    <AbsoluteFill
      style={{
        background: night
          ? 'linear-gradient(180deg, #101420 0%, #090c14 100%)'
          : `linear-gradient(180deg, ${DSH.stageTop} 0%, ${DSH.stageBtm} 100%)`,
      }}
    >
      <div style={{ position: 'absolute', top: 132, left: 64, right: 64, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 68,
            fontWeight: 800,
            color: night ? DSH.darkInk : DSH.ink,
            letterSpacing: '-0.03em',
          }}
        >
          360px 窄栏 · 原生换肤
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: FONTS.mono,
            fontSize: 34,
            fontWeight: 640,
            color: night ? DSH.brandDark : DSH.brand,
          }}
        >
          {night ? 'DARK MODE · --DSW-ALIAS-*' : 'LIGHT MODE · @CONTAINER'}
        </div>
      </div>

      {/* @3x 360px narrow board (1080x2340 native -> 640x1220 crystal-clear!) */}
      <div
        style={{
          position: 'absolute',
          left: (1080 - 640) / 2,
          top: 360,
          width: 640,
          height: 1220,
          borderRadius: 28,
          overflow: 'hidden',
          background: night ? DSH.darkSurface : '#ffffff',
          boxShadow: night
            ? '0 0 0 2px rgba(122,170,255,0.38), 0 42px 92px -18px rgba(0,2,10,0.88)'
            : softShadow(36, { color: DSH.shadow, strength: 1.25 }),
        }}
      >
        <Img
          src={staticFile(night ? 'textures/narrow-360-dark.png' : 'textures/narrow-360-light.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
        />
      </div>
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {sweepT < 1 && renderLayer(false)}
      {sweepT > 0 && (
        <AbsoluteFill style={{ clipPath: sweepT >= 1 ? undefined : nightClip }}>
          {renderLayer(true)}
        </AbsoluteFill>
      )}
      {sweepT > 0.01 && sweepT < 0.99 && (
        <div
          style={{
            position: 'absolute',
            left: -240,
            width: 1560,
            top: yCut + 540 * t15,
            height: 4,
            background: '#ffffff',
            transform: 'rotate(-15deg)',
            boxShadow: '0 0 16px 3px rgba(122,170,255,0.9), 0 0 42px 8px rgba(65,118,230,0.55)',
          }}
        />
      )}
      <VerticalCaption text="空列静默折叠 · 深浅像素同构" dark={sweepT > 0.45} duration={duration} />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

// V4: Bar 16 Peak Drop Finale (9:16 Group Photo + Wordmark + 2-Line 36px CLI Card)
const V_FLY = [
  { key: 'head', file: 'textures/outro-head-strip.png', w: 940, h: 46, cx: 540, cy: 190, rot: 0, dx: 0, dy: -220, cue: 4 },
  { key: 'card4', file: 'textures/card4-hero-4x.png', w: 520, h: 128, cx: 310, cy: 365, rot: -4, dx: -480, dy: -80, cue: 8 },
  { key: 'tab', file: 'textures/outro-tab-ring.png', w: 460, h: 40, cx: 790, cy: 340, rot: 3, dx: 420, dy: -120, cue: 12 },
  { key: 'lineage', file: 'textures/outro-lineage-drawer.png', w: 540, h: 250, cx: 760, cy: 545, rot: 3, dx: 480, dy: 40, cue: 16 },
  { key: 'done', file: 'textures/outro-done-lane.png', w: 430, h: 340, cx: 290, cy: 1625, rot: 3, dx: -420, dy: 320, cue: 20 },
  { key: 'disarm', file: 'textures/outro-disarm-pop.png', w: 360, h: 180, cx: 785, cy: 1605, rot: -3, dx: 420, dy: 320, cue: 24 },
] as const;

const VSceneOutro: React.FC = () => {
  const f = useCurrentFrame();
  const flyEase = Easing.bezier(0.34, 1.4, 0.44, 1);
  const stamp = ramp(f, 42, 12, bezier(0.2, 0.85, 0.3, 1));
  const rule = ramp(f, 58, 14, EASE.out);
  const cliIn = ramp(f, 68, 14, EASE.out);

  return (
    <AbsoluteFill style={{ background: DSH.stageMid, overflow: 'hidden' }}>
      <StudioBackdrop />

      {V_FLY.map((el) => {
        if (f < el.cue) return null;
        const t = interpolate(f, [el.cue, el.cue + 13], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: flyEase,
        });
        const posX = (fr: number) =>
          el.dx * (1 - interpolate(fr, [el.cue, el.cue + 13], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: flyEase }));
        const posY = (fr: number) =>
          el.dy * (1 - interpolate(fr, [el.cue, el.cue + 13], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: flyEase }));
        return (
          <SpeedBlur key={el.key} vx={velocity(posX, f)} vy={velocity(posY, f)} amount={0.28} max={18}>
            <div
              style={{
                position: 'absolute',
                left: el.cx - el.w / 2,
                top: el.cy - el.h / 2,
                width: el.w,
                height: el.h,
                borderRadius: 16,
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid rgba(15,17,21,0.09)',
                boxShadow: softShadow(20, { color: DSH.shadow }),
                transform: `translate(${(el.dx * (1 - t)).toFixed(1)}px, ${(el.dy * (1 - t)).toFixed(1)}px) rotate(${(el.rot * (2 - t)).toFixed(2)}deg)`,
                opacity: 0.9,
              }}
            >
              <Img src={staticFile(el.file)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          </SpeedBlur>
        );
      })}

      {/* Center Lockup Card */}
      <div
        style={{
          position: 'absolute',
          left: 58,
          right: 58,
          top: 730,
          padding: '54px 44px',
          borderRadius: 34,
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(15,17,21,0.08)',
          boxShadow: '0 36px 84px -20px rgba(12,24,54,0.22), inset 0 1px 0 #ffffff',
          textAlign: 'center',
          opacity: stamp,
          transform: `scale(${(1.12 - 0.12 * stamp).toFixed(4)})`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <KanbanMark size={108} tone="light" />
        </div>
        <div style={{ fontFamily: FONTS.sans, fontSize: 88, fontWeight: 820, color: DSH.ink, letterSpacing: '-0.03em' }}>
          dsh-team-kanban
        </div>
        <div
          style={{
            width: 220,
            height: 6,
            borderRadius: 3,
            background: DSH.brand,
            margin: '26px auto',
            transform: `scaleX(${rule.toFixed(3)})`,
          }}
        />
        <div style={{ fontFamily: FONTS.sans, fontSize: 38, fontWeight: 620, color: DSH.ink2 }}>
          原生 agentTeam 右侧栏活体看板 · v0.5.7
        </div>

        {/* 36px Mono CLI Box (>= 32px Q11 floor!) */}
        <div
          style={{
            marginTop: 32,
            padding: '22px 28px',
            borderRadius: 18,
            background: '#f4f7fc',
            border: `1.5px solid ${alpha(DSH.brand, 0.24)}`,
            fontFamily: FONTS.mono,
            fontSize: 35,
            fontWeight: 650,
            lineHeight: 1.42,
            color: DSH.ink,
            textAlign: 'left',
            opacity: cliIn,
            transform: `translateY(${((1 - cliIn) * 12).toFixed(1)}px)`,
          }}
        >
          <div>
            <span style={{ color: DSH.brand, fontWeight: 800 }}>$ </span>
            dsh plugin --profile desktop \
          </div>
          <div style={{ paddingLeft: 42 }}>add dsh-team-kanban</div>
        </div>
      </div>

      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};

export const KanbanVertical: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: DSH.stageMid }}>
      {bgm ? (
        <Sequence from={0} durationInFrames={VERTICAL_TOTAL_FRAMES}>
          <Audio
            src={staticFile('audio/house-vibez.mp3')}
            startFrom={B_START}
            volume={(f) => {
              const fadeIn = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              const fadeOut = interpolate(f, [VERTICAL_TOTAL_FRAMES - 36, VERTICAL_TOTAL_FRAMES], [1, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return 0.31 * fadeIn * fadeOut;
            }}
          />
        </Sequence>
      ) : null}

      {V_SFX.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.duration}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}

      <Sequence from={V_SHOTS.v1_hook.from} durationInFrames={V_SHOTS.v1_hook.duration}>
        <VSceneHook duration={V_SHOTS.v1_hook.duration} />
      </Sequence>
      <Sequence from={V_SHOTS.v2_flow.from} durationInFrames={V_SHOTS.v2_flow.duration}>
        <VSceneFlow duration={V_SHOTS.v2_flow.duration} />
      </Sequence>
      <Sequence from={V_SHOTS.v3_theme.from} durationInFrames={V_SHOTS.v3_theme.duration}>
        <VSceneTheme duration={V_SHOTS.v3_theme.duration} />
      </Sequence>
      <Sequence from={V_SHOTS.v4_outro.from} durationInFrames={V_SHOTS.v4_outro.duration}>
        <VSceneOutro />
      </Sequence>
    </AbsoluteFill>
  );
};

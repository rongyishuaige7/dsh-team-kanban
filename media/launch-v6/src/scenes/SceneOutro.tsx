// S6: Keynote Launch Finale — 8 Real v0.6.0 Cutouts Group Photo + Wordmark + CLI (177f, hits Peak Drop @ beat 64!)
// Faithful to demos/outro/outro-group-photo-launch/OutroGroupPhotoLaunch.tsx
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam } from '../lib/PageCam';
import { DSH, FONTS, KanbanMark } from '../tokens';
import { EASE, Grain, SpeedBlur, alpha, ramp, velocity } from '../lib/Polish';

export const SCENE_OUTRO_DEFAULTS = {
  wordmark: 'dsh-team-kanban',
  wordmarkSize: 108,
  tagline: '原生 agentTeam 右侧栏活体看板 · 精密遥测与因果接力 v0.6.0',
  taglineSize: 34,
  cli: 'dsh plugin --profile desktop add dsh-team-kanban',
  cliSize: 35,
  ink: DSH.ink,
  accent: DSH.brand,
  muted: DSH.ink2,
  duration: 177,
};

const FLY_EASE = Easing.bezier(0.34, 1.4, 0.44, 1); // y1 > 1 true overshoot!
const CRANE_EASE = Easing.bezier(0.3, 0, 0.2, 1);

type FlyEl = {
  key: string;
  file: string;
  w: number;
  h: number;
  cx: number;
  cy: number;
  scale: number;
  rot: number;
  dx: number;
  dy: number;
  radius: number;
  cue: number;
  dark?: boolean;
};

// All 8 v0.6.0 signature features represented in the perimeter group photo (Q8)!
const ELS: FlyEl[] = [
  // 1. v0.6.0 Odometer 6/6 + Emerald Strip + Mission Debrief bar [星图] [战报] (top center)
  { key: 'head', file: 'textures/outro-head-debrief.png', w: 1139, h: 95, cx: 960, cy: 76, scale: 0.72, rot: 0, dx: 0, dy: -160, radius: 12, cue: 4 },
  // 2. @4x Expanded Card #4 with Scope chip + Emerald `↵ 已复制` Steer Prompt (upper-left)
  { key: 'card4', file: 'textures/card4-copied-4x.png', w: 356, h: 319, cx: 212, cy: 274, scale: 0.74, rot: -3.5, dx: -520, dy: -80, radius: 12, cue: 7 },
  // 3. 920ms Emerald Causal Relay curve + `is-unlocked` aura (upper-right)
  { key: 'relay', file: 'textures/outro-relay-unlock.png', w: 1124, h: 420, cx: 1704, cy: 276, scale: 0.39, rot: 3.5, dx: 520, dy: -120, radius: 14, cue: 10 },
  // 4. 360px Narrow @container board WITH Left-Gutter Vertical C-Arc Lineage (lower-left)
  { key: 'narrow', file: 'textures/narrow-360-light.png', w: 360, h: 780, cx: 192, cy: 734, scale: 0.52, rot: 3, dx: -460, dy: 240, radius: 14, cue: 13 },
  // 5. Darkroom `data-constellation` Emerald Critical-Path Constellation board (lower-right)
  { key: 'constellation', file: 'textures/outro-constellation-dark.png', w: 1140, h: 540, cx: 1718, cy: 734, scale: 0.39, rot: -3, dx: 480, dy: 240, radius: 14, cue: 16, dark: true },
  // 6. Away Catch-up pill + calibrated 45° hatched/hollow header (bottom left-center)
  { key: 'catchup', file: 'textures/outro-catchup-head.png', w: 1140, h: 220, cx: 560, cy: 966, scale: 0.44, rot: 2, dx: -160, dy: 340, radius: 12, cue: 19 },
  // 7. Checkmarked Tab Progress Ring `✓ 任务板 6/6` (upper-left inner, cleanly separated from card4!)
  { key: 'tab', file: 'textures/outro-tab-ring.png', w: 480, h: 40, cx: 565, cy: 172, scale: 0.84, rot: -1.8, dx: -240, dy: -220, radius: 10, cue: 22 },
  // 8. Standalone Anti-misfire Disarm confirmation popover (bottom right-center)
  { key: 'disarm', file: 'textures/outro-disarm-pop.png', w: 232, h: 116, cx: 1412, cy: 956, scale: 1.04, rot: -2.5, dx: 220, dy: 340, radius: 12, cue: 25 },
];

const DUST = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 439 + 137) % 1920,
  y0: (i * 613 + 271) % 1080,
  rise: 0.32 + (i % 5) * 0.11,
  swayAmp: 9 + (i % 4) * 5,
  swayFreq: 0.022 + (i % 3) * 0.008,
  phase: (i * 0.83) % (Math.PI * 2),
  size: 2.6 + (i % 3) * 1.0,
  opacity: 0.32 + ((i * 7) % 5) * 0.08,
}));

const BOKEH = Array.from({ length: 6 }, (_, i) => ({
  x: (i * 701 + 260) % 1920,
  y0: (i * 389 + 640) % 1080,
  rise: 0.55 + (i % 3) * 0.2,
  size: 16 + (i % 3) * 8,
  opacity: 0.09 + (i % 2) * 0.05,
}));

export type SceneOutroProps = Partial<typeof SCENE_OUTRO_DEFAULTS> & {
  texDir?: string;
};

export const SceneOutro: React.FC<SceneOutroProps> = ({
  wordmark = SCENE_OUTRO_DEFAULTS.wordmark,
  wordmarkSize = SCENE_OUTRO_DEFAULTS.wordmarkSize,
  tagline = SCENE_OUTRO_DEFAULTS.tagline,
  taglineSize = SCENE_OUTRO_DEFAULTS.taglineSize,
  cli = SCENE_OUTRO_DEFAULTS.cli,
  cliSize = SCENE_OUTRO_DEFAULTS.cliSize,
  ink = SCENE_OUTRO_DEFAULTS.ink,
  accent = SCENE_OUTRO_DEFAULTS.accent,
  muted = SCENE_OUTRO_DEFAULTS.muted,
  duration = SCENE_OUTRO_DEFAULTS.duration,
  texDir = 'textures',
}) => {
  const frame = useCurrentFrame();
  const letters = wordmark.split('');

  const blur = interpolate(frame, [0, 24], [0, 16], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.4, 1),
  });
  const recede = interpolate(frame, [40, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const craneT = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: CRANE_EASE,
  });
  const pushT = ramp(frame, 36, Math.max(40, duration - 36), EASE.smooth);
  const camScale = 1.06 - 0.06 * craneT + 0.028 * pushT;
  const camTilt = 4 * (1 - craneT);

  const sweepX = interpolate(frame, [2, 14], [-700, 2020], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.6, 1),
  });
  const sweepOpacity = interpolate(frame, [2, 5, 11, 14], [0, 0.16, 0.16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stageLight = interpolate(frame, [40, 50, 60], [0, 0.72, 0.45], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rule = interpolate(frame, [66, 78], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const ruleExt = interpolate(frame, [66, 74], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const ruleExtFade = interpolate(frame, [74, 82], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wordSpacing = interpolate(frame, [70, 76], [-0.03, -0.022], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const tagT = ramp(frame, 74, 12, EASE.out);
  const cliT = ramp(frame, 80, 12, EASE.out);

  return (
    <AbsoluteFill style={{ backgroundColor: DSH.stageMid }}>
      <AbsoluteFill
        style={{
          transform: `perspective(1400px) rotateX(${camTilt.toFixed(3)}deg) scale(${camScale.toFixed(4)})`,
          transformOrigin: '50% 46%',
        }}
      >
        <PageCam
          src={`${texDir}/app-base-light.png`}
          pageW={1920}
          pageH={1080}
          keys={[{ frame: 0, cx: 960, cy: 540, zoom: 0.88 }]}
          blur={blur}
          bg={DSH.stageMid}
        />

        <AbsoluteFill
          style={{
            background:
              'radial-gradient(960px 640px at 50% 48%, rgba(245,248,253,0.96) 0%, rgba(237,242,251,0.88) 54%, rgba(227,235,247,0.72) 100%)',
            pointerEvents: 'none',
          }}
        />

        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {ELS.map((el) => {
            if (frame < el.cue) return null;
            const t = interpolate(frame, [el.cue, el.cue + 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: FLY_EASE,
            });
            const opacity = interpolate(frame, [el.cue, el.cue + 3], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const x = el.dx * (1 - t);
            const y = el.dy * (1 - t);
            const rot = el.rot * (2 - t);
            const scale = el.scale * (1.12 - 0.12 * t);
            const air = Math.max(0, 1 - t);
            const shadow =
              air > 0.01
                ? `0 ${(10 + 26 * air).toFixed(1)}px ${(24 + 46 * air).toFixed(1)}px rgba(12,24,54,${(0.16 + 0.1 * air).toFixed(3)}), 0 2px 6px rgba(12,24,54,0.08)`
                : '0 12px 28px rgba(12,24,54,0.16), 0 2px 6px rgba(12,24,54,0.08)';
            const settledOpacity = opacity * (1 - 0.14 * recede);
            const saturate = 1 - 0.08 * recede;

            const posAt = (fr: number) => {
              const tt = interpolate(fr, [el.cue, el.cue + 12], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: FLY_EASE,
              });
              return [el.dx * (1 - tt), el.dy * (1 - tt)];
            };
            const vx = velocity((fr) => posAt(fr)[0], frame);
            const vy = velocity((fr) => posAt(fr)[1], frame);
            const land = interpolate(frame, [el.cue + 9, el.cue + 12, el.cue + 16], [0, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            const fileSrc = el.file.replace(/^textures\//, `${texDir}/`);
            return (
              <SpeedBlur key={el.key} vx={vx} vy={vy} amount={0.3} max={22}>
                <div
                  style={{
                    position: 'absolute',
                    left: el.cx - el.w / 2,
                    top: el.cy - el.h / 2,
                    width: el.w,
                    height: el.h,
                    transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${(scale * (1 - 0.015 * land)).toFixed(4)})`,
                    transformOrigin: 'center center',
                    borderRadius: el.radius,
                    overflow: 'hidden',
                    background: el.dark ? DSH.darkSurface : '#ffffff',
                    border: el.dark ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(15,17,21,0.09)',
                    boxShadow:
                      land > 0.01
                        ? `0 ${(12 - 5 * land).toFixed(1)}px ${(28 - 12 * land).toFixed(1)}px rgba(12,24,54,${(0.16 + 0.06 * land).toFixed(3)}), 0 2px 6px rgba(12,24,54,0.12)`
                        : shadow,
                    opacity: settledOpacity,
                    filter: `saturate(${saturate.toFixed(3)})`,
                  }}
                >
                  <Img src={staticFile(fileSrc)} style={{ position: 'absolute', inset: 0, width: el.w, height: el.h, display: 'block' }} />
                </div>
              </SpeedBlur>
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>

      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {DUST.map((d, i) => {
          const y = (((d.y0 - frame * d.rise) % 1080) + 1080) % 1080;
          const x = d.x + Math.sin(frame * d.swayFreq + d.phase) * d.swayAmp;
          const twinkle = 0.7 + 0.3 * Math.sin(frame * 0.21 + d.phase * 3);
          const col = i % 3 === 0 ? DSH.emerald : accent;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: d.size,
                height: d.size,
                borderRadius: '50%',
                background: col,
                opacity: d.opacity * twinkle,
                boxShadow: `0 0 ${(d.size * 2.4).toFixed(1)}px ${alpha(col, 0.45)}`,
              }}
            />
          );
        })}
        {BOKEH.map((b, i) => {
          const y = (((b.y0 - frame * b.rise) % 1180) + 1180) % 1180 - 50;
          return (
            <div
              key={`b${i}`}
              style={{
                position: 'absolute',
                left: b.x,
                top: y,
                width: b.size,
                height: b.size,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(accent, 0.55)} 0%, ${alpha(accent, 0.18)} 55%, ${alpha(accent, 0)} 75%)`,
                opacity: b.opacity,
                filter: 'blur(2px)',
              }}
            />
          );
        })}
      </AbsoluteFill>

      {sweepOpacity > 0 ? (
        <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: sweepX - 300,
              width: 600,
              background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,1) 50%, rgba(255,255,255,0))',
              opacity: sweepOpacity,
            }}
          />
        </AbsoluteFill>
      ) : null}

      {stageLight > 0 ? (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background:
              'radial-gradient(760px 420px at 960px 510px, rgba(255,255,255,0.98), rgba(235,243,255,0.65) 55%, rgba(235,243,255,0) 78%)',
            opacity: stageLight,
          }}
        />
      ) : null}

      {/* Center Wordmark + Tagline + Single-Line CLI Sign-off (Holds >85f = 2.83s >> 1.0s R1!) */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
        <div
          style={{
            textAlign: 'center',
            padding: '38px 56px 42px',
            borderRadius: 28,
            background: `rgba(255, 255, 255, ${(0.88 * recede).toFixed(3)})`,
            border: recede > 0.2 ? '1px solid rgba(15, 17, 21, 0.07)' : undefined,
            boxShadow: recede > 0.2 ? '0 30px 70px -24px rgba(12, 24, 54, 0.18), inset 0 1px 0 #ffffff' : undefined,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: wordmarkSize,
              fontWeight: 800,
              lineHeight: 1.1,
              color: ink,
              letterSpacing: `${wordSpacing.toFixed(4)}em`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {(() => {
              const t = interpolate(frame, [40, 48], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.bezier(0.2, 0.75, 0.3, 1),
              });
              return (
                <div
                  style={{
                    marginRight: 28,
                    opacity: t,
                    transform: `translateY(${((1 - t) * 26).toFixed(2)}px) scale(${(1.35 - 0.35 * t).toFixed(4)})`,
                    filter: t < 0.995 ? `blur(${((1 - t) * 8).toFixed(2)}px)` : undefined,
                  }}
                >
                  <KanbanMark size={112} tone="light" />
                </div>
              );
            })()}
            {letters.map((ch, i) => {
              const delay = Math.round(44 + i * 1.6);
              const t = interpolate(frame, [delay, delay + 8], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.bezier(0.2, 0.75, 0.3, 1),
              });
              return (
                <span
                  key={i}
                  style={{
                    opacity: t,
                    transform: `translateY(${((1 - t) * 26).toFixed(2)}px) scale(${(1.35 - 0.35 * t).toFixed(4)})`,
                    filter: t < 0.995 ? `blur(${((1 - t) * 8).toFixed(2)}px)` : undefined,
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    color: ch === '-' ? accent : ink,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>

          <div style={{ position: 'relative', height: 6, width: 260, margin: '28px auto 0' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${accent}, ${DSH.emerald})`,
                transform: `scaleX(${rule.toFixed(4)})`,
              }}
            />
            {ruleExt > 0 && ruleExtFade > 0 ? (
              <>
                <div
                  style={{
                    position: 'absolute',
                    top: 2.5,
                    height: 1.5,
                    right: '100%',
                    width: 190 * ruleExt,
                    background: accent,
                    opacity: ruleExtFade,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 2.5,
                    height: 1.5,
                    left: '100%',
                    width: 190 * ruleExt,
                    background: DSH.emerald,
                    opacity: ruleExtFade,
                  }}
                />
              </>
            ) : null}
          </div>

          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: taglineSize,
              fontWeight: 620,
              color: muted,
              marginTop: 24,
              opacity: tagT,
              transform: `translateY(${((1 - tagT) * 8).toFixed(2)}px)`,
            }}
          >
            {tagline}
          </div>

          <div
            style={{
              marginTop: 24,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 28px',
              borderRadius: 14,
              background: '#f4f7fc',
              border: `1px solid ${alpha(accent, 0.22)}`,
              fontFamily: FONTS.mono,
              fontSize: cliSize,
              fontWeight: 600,
              color: ink,
              whiteSpace: 'nowrap',
              opacity: cliT,
              transform: `translateY(${((1 - cliT) * 10).toFixed(2)}px)`,
            }}
          >
            <span style={{ color: accent, fontWeight: 750 }}>$</span>
            <span>{cli}</span>
          </div>
        </div>
      </AbsoluteFill>

      <Grain opacity={0.025} />
    </AbsoluteFill>
  );
};

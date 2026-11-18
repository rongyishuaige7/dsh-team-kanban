// S1: Brand Open (0..121f) — faithful to demos/typography/brand-ink-open/BrandInkOpen.tsx
// Adapted to DSH Porcelain + DeepSeek Tech Blue (#4176E6) + KanbanMark:
// SVG crosshair draw-on (0..20f, fades 26..36f) -> glyph-by-glyph press (scale 1.6->1 + blur 6->0 + blue under-glint)
// -> monospace kicker typewriter + block cursor -> >=1.4s full wordmark hold (f62..111) -> 10f lift+shrink+fade exit.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { DSH, FONTS, KanbanMark } from '../tokens';
import { Grain, StudioBackdrop } from '../lib/Polish';

export const SCENE_OPEN_DEFAULTS = {
  wordmark: 'dsh-team-kanban',
  wordmarkSize: 118,
  kicker: 'DEEPSEEK HARNESS · NATIVE AGENT-TEAM KANBAN · v0.5.7',
  kickerSize: 32, // >= 32px hard floor per Q11
  ink: DSH.ink,
  accent: DSH.brand,
  muted: DSH.ink2,
  duration: 121,
};

export type SceneOpenProps = Partial<typeof SCENE_OPEN_DEFAULTS>;

export const SceneOpen: React.FC<SceneOpenProps> = ({
  wordmark = SCENE_OPEN_DEFAULTS.wordmark,
  wordmarkSize = SCENE_OPEN_DEFAULTS.wordmarkSize,
  kicker = SCENE_OPEN_DEFAULTS.kicker,
  kickerSize = SCENE_OPEN_DEFAULTS.kickerSize,
  ink = SCENE_OPEN_DEFAULTS.ink,
  accent = SCENE_OPEN_DEFAULTS.accent,
  muted = SCENE_OPEN_DEFAULTS.muted,
  duration = SCENE_OPEN_DEFAULTS.duration,
}) => {
  const frame = useCurrentFrame();

  // Crosshair draw-on (pathLength = 100): vertical 2->11f, horizontal 10->20f, fades 26->36f
  const vDraw = interpolate(frame, [2, 11], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const hDraw = interpolate(frame, [10, 20], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.linear,
  });
  const crossFade = interpolate(frame, [26, 36], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Mark stamps 4f ahead of first letter
  const markT = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.7, 0.25, 1),
  });

  // Kicker typewriter (26 -> ~62f), decorative small mono text 0.7f/char
  const perChar = 0.7;
  const kickStart = 26;
  const kickChars = Math.floor(Math.max(0, frame - kickStart) / perChar);
  const kickDone = kickStart + kicker.length * perChar;
  const cursorOn = (() => {
    if (frame < kickStart) return false;
    if (frame < kickDone) return true;
    if (frame > duration - 14) return false;
    const b = frame - kickDone;
    return Math.floor(b / 3) % 2 === 0;
  })();

  // Wordmark & kicker complete by f62 -> holds completely still f62..duration-10 (~49f = 1.63s >= 1s R1)
  const exitStart = Math.max(70, duration - 10);
  const brandOut = interpolate(frame, [exitStart, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.5, 1),
  });
  const brandOpacity = 1 - brandOut;
  const groupY = -brandOut * 40;
  const groupScale = 1 - brandOut * 0.12;

  return (
    <AbsoluteFill style={{ backgroundColor: DSH.stageMid }}>
      <StudioBackdrop />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            textAlign: 'center',
            opacity: brandOpacity,
            transform: `translateY(${groupY.toFixed(2)}px) scale(${groupScale.toFixed(4)})`,
          }}
        >
          {/* SVG precision crosshair */}
          <svg
            width={64}
            height={64}
            viewBox="0 0 64 64"
            style={{ display: 'block', margin: '0 auto 28px', opacity: crossFade }}
          >
            <line
              x1={32}
              y1={4}
              x2={32}
              y2={60}
              stroke={accent}
              strokeWidth={4.5}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={vDraw}
            />
            <line
              x1={4}
              y1={32}
              x2={60}
              y2={32}
              stroke={accent}
              strokeWidth={4.5}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={hDraw}
            />
          </svg>

          {/* Brand mark + glyph-by-glyph press with Tech Blue under-glint */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 28,
            }}
          >
            <div
              style={{
                opacity: markT,
                transform: `scale(${(1.5 - 0.5 * markT).toFixed(4)})`,
                filter: markT < 0.995 ? `blur(${((1 - markT) * 6).toFixed(2)}px)` : undefined,
              }}
            >
              <KanbanMark size={108} tone="light" />
            </div>

            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: wordmarkSize,
                fontWeight: 780,
                color: ink,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                whiteSpace: 'pre',
                display: 'inline-flex',
                alignItems: 'flex-end',
              }}
            >
              {wordmark.split('').map((ch, i) => {
                const delay = 10 + i * 2.4;
                const t = interpolate(frame, [delay, delay + 12], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.bezier(0.2, 0.7, 0.25, 1),
                });
                const glintCenter = delay + 12;
                const glint = interpolate(
                  frame,
                  [glintCenter - 4, glintCenter, glintCenter + 4],
                  [0, 1, 0],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                );
                return (
                  <span
                    key={i}
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      opacity: t,
                      transform: `scale(${(1.6 - 0.6 * t).toFixed(4)})`,
                      transformOrigin: 'center bottom',
                      filter: t < 0.995 ? `blur(${((1 - t) * 6).toFixed(2)}px)` : undefined,
                    }}
                  >
                    {ch === ' ' ? ' ' : ch}
                    <span
                      style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: -8,
                        transform: 'translateX(-50%)',
                        width: `${(glint * 100).toFixed(1)}%`,
                        height: 3,
                        background: accent,
                        opacity: glint,
                        borderRadius: 2,
                      }}
                    />
                  </span>
                );
              })}
            </div>
          </div>

          {/* Monospace kicker typewriter + Tech Blue block cursor */}
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: kickerSize,
              fontWeight: 600,
              letterSpacing: '0.09em',
              color: muted,
              marginTop: 38,
              height: 40,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <span style={{ whiteSpace: 'pre' }}>{kicker.slice(0, kickChars)}</span>
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 30,
                marginLeft: 6,
                borderRadius: 3,
                background: accent,
                opacity: cursorOn ? 0.88 : 0,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};

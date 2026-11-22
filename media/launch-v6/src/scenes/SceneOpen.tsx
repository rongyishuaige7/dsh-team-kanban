// S1: Optical Porcelain Brand Calibration Open (0..121f) — faithful to BrandInkOpen.tsx
// Precision calibration crosshair + corner vernier ticks -> KanbanMark + glyph-by-glyph press ->
// monospace telemetry kicker + block cursor -> >=1.5s full stillness hold -> 10f lift-shrink exit.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { DSH, FONTS, KanbanMark } from '../tokens';
import { Grain, StudioBackdrop, alpha } from '../lib/Polish';

export const SCENE_OPEN_DEFAULTS = {
  wordmark: 'dsh-team-kanban',
  wordmarkSize: 118,
  kicker: 'DEEPSEEK HARNESS · PRECISION TELEMETRY & DAG RELAY · v0.6.0',
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

  const markT = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.7, 0.25, 1),
  });

  const perChar = 0.65;
  const kickStart = 25;
  const kickChars = Math.floor(Math.max(0, frame - kickStart) / perChar);
  const kickDone = kickStart + kicker.length * perChar; // ~63f
  const cursorOn = (() => {
    if (frame < kickStart) return false;
    if (frame < kickDone) return true;
    if (frame > duration - 14) return false;
    const b = frame - kickDone;
    return Math.floor(b / 3) % 2 === 0;
  })();

  // Wordmark & kicker complete by ~f63 -> holds completely still f63..111 (48f = 1.60s >= 1.0s R1!)
  const exitStart = Math.max(70, duration - 10);
  const brandOut = interpolate(frame, [exitStart, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.5, 1),
  });
  const brandOpacity = 1 - brandOut;
  const groupY = -brandOut * 40;
  const groupScale = 1 - brandOut * 0.12;

  const letters = wordmark.split('');
  const reticuleOpacity = interpolate(frame, [4, 18, duration - 12, duration], [0, 0.42, 0.42, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: DSH.stageMid }}>
      <StudioBackdrop />

      {/* Optical calibration bench corner vernier ticks */}
      <div style={{ position: 'absolute', inset: 56, pointerEvents: 'none', opacity: reticuleOpacity }}>
        {[
          { left: 0, top: 0, borderTop: `2px solid ${alpha(accent, 0.45)}`, borderLeft: `2px solid ${alpha(accent, 0.45)}` },
          { right: 0, top: 0, borderTop: `2px solid ${alpha(accent, 0.45)}`, borderRight: `2px solid ${alpha(accent, 0.45)}` },
          { left: 0, bottom: 0, borderBottom: `2px solid ${alpha(accent, 0.45)}`, borderLeft: `2px solid ${alpha(accent, 0.45)}` },
          { right: 0, bottom: 0, borderBottom: `2px solid ${alpha(accent, 0.45)}`, borderRight: `2px solid ${alpha(accent, 0.45)}` },
        ].map((st, idx) => (
          <div key={idx} style={{ position: 'absolute', width: 28, height: 28, ...st }} />
        ))}
      </div>

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
              stroke={DSH.emerald}
              strokeWidth={4.5}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={hDraw}
            />
          </svg>

          {/* Brand Lockup: KanbanMark + glyph-by-glyph letterpress */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 28 }}>
            <div
              style={{
                opacity: markT,
                transform: `scale(${(1.5 - 0.5 * markT).toFixed(4)})`,
                filter: markT < 0.995 ? `blur(${((1 - markT) * 6).toFixed(2)}px)` : undefined,
              }}
            >
              <KanbanMark size={94} tone="light" />
            </div>

            <div
              style={{
                display: 'inline-flex',
                fontFamily: FONTS.sans,
                fontSize: wordmarkSize,
                fontWeight: 800,
                letterSpacing: '-0.035em',
                lineHeight: 1.04,
                color: ink,
              }}
            >
              {letters.map((ch, i) => {
                const d = 10 + i * 2.4;
                const t = interpolate(frame, [d, d + 12], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.bezier(0.2, 0.75, 0.25, 1),
                });
                const glint = interpolate(frame, [d + 4, d + 9, d + 15], [0, 1, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const isDash = ch === '-';
                return (
                  <span
                    key={i}
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      opacity: t,
                      transformOrigin: '50% 85%',
                      transform: `scale(${(1.58 - 0.58 * t).toFixed(4)})`,
                      filter: t < 0.995 ? `blur(${((1 - t) * 6).toFixed(2)}px)` : undefined,
                      color: isDash ? accent : ink,
                    }}
                  >
                    {ch}
                    {glint > 0.01 && (
                      <span
                        style={{
                          position: 'absolute',
                          left: '10%',
                          right: '10%',
                          bottom: -4,
                          height: 4,
                          borderRadius: 2,
                          background: i > 8 ? DSH.emerald : accent,
                          opacity: glint * 0.85,
                        }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Monospace Telemetry Kicker + Block Cursor */}
          <div
            style={{
              marginTop: 34,
              height: 44,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontFamily: FONTS.mono,
              fontSize: kickerSize,
              fontWeight: 620,
              letterSpacing: '0.07em',
              color: muted,
            }}
          >
            <span>{kicker.slice(0, kickChars)}</span>
            {cursorOn && (
              <span
                style={{
                  display: 'inline-block',
                  width: 16,
                  height: 30,
                  marginLeft: 8,
                  borderRadius: 3,
                  background: accent,
                }}
              />
            )}
          </div>
        </div>
      </AbsoluteFill>
      <Grain opacity={0.025} />
    </AbsoluteFill>
  );
};

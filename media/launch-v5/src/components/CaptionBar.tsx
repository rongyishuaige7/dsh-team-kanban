import React from 'react';
import { AbsoluteFill, getInputProps, interpolate, useCurrentFrame, Easing } from 'remotion';
import { DSH, FONTS } from '../tokens';

export const CAPTION_DEFAULTS = {
  fontSize: 60, // >= 56px hard floor per aesthetic-rules.md Q11
  bottom: 48,
  color: DSH.ink,
  darkColor: DSH.darkInk,
  accent: DSH.brand,
  darkAccent: DSH.brandDark,
};

export type CaptionBarProps = Partial<typeof CAPTION_DEFAULTS> & {
  text: string;
  duration: number;
  dark?: boolean;
};

export const CaptionBar: React.FC<CaptionBarProps> = ({
  text,
  duration,
  dark = false,
  fontSize = CAPTION_DEFAULTS.fontSize,
  bottom = CAPTION_DEFAULTS.bottom,
  color = CAPTION_DEFAULTS.color,
  darkColor = CAPTION_DEFAULTS.darkColor,
  accent = CAPTION_DEFAULTS.accent,
  darkAccent = CAPTION_DEFAULTS.darkAccent,
}) => {
  const { plate } = getInputProps() as { plate?: boolean };
  if (plate) return null;
  const frame = useCurrentFrame();
  const inT = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const outT = interpolate(frame, [Math.max(12, duration - 10), duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.8, 0.4),
  });
  const p = inT * outT;
  const fg = dark ? darkColor : color;
  const dot = dark ? darkAccent : accent;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom,
          display: 'flex',
          justifyContent: 'center',
          opacity: p,
          transform: `translateY(${((1 - inT) * 20).toFixed(2)}px)`,
          filter: inT < 0.995 ? `blur(${((1 - inT) * 10).toFixed(2)}px)` : undefined,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 20,
            padding: '14px 36px',
            borderRadius: 999,
            background: dark ? 'rgba(21, 22, 28, 0.88)' : 'rgba(255, 255, 255, 0.90)',
            border: dark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 17, 21, 0.08)',
            boxShadow: dark
              ? '0 20px 50px -14px rgba(0, 2, 10, 0.72), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 20px 50px -14px rgba(12, 24, 54, 0.18), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: dot,
              boxShadow: `0 0 0 4px ${dark ? 'rgba(122,170,255,0.18)' : 'rgba(65,118,230,0.16)'}`,
              flex: 'none',
            }}
          />
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize,
              fontWeight: 740,
              lineHeight: 1.12,
              letterSpacing: '-0.025em',
              color: fg,
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

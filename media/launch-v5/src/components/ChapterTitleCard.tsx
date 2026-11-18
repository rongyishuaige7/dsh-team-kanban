// Adapted from demos/typography/paper-title-card/PaperTitleCard.tsx
// Preserves exact motion grammar: word-by-word scale 1.28->1 + blur 7px->0 + opacity,
// single italic accent word, scaleX underline (16->34f), and DigitRoll odometer
// settling at f32 (well before duration-8 fadeOut), styled in DSH Porcelain + Tech Blue.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { DSH, FONTS } from '../tokens';
import { StudioBackdrop } from '../lib/Polish';

export const TITLE_CARD_DEFAULTS = {
  fontSize: 98,
  ink: DSH.ink,
  accent: DSH.brand,
  muted: DSH.ink2,
};

const DIGITS = '0123456789';
const DigitColumn: React.FC<{ ch: string; delay: number; lineH: number; color: string }> = ({
  ch,
  delay,
  lineH,
  color,
}) => {
  const frame = useCurrentFrame();
  if (ch < '0' || ch > '9') {
    return <span style={{ fontSize: 34, lineHeight: `${lineH}px`, color }}>{ch}</span>;
  }
  const target = DIGITS.indexOf(ch);
  const t = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.8, 0.25, 1),
  });
  const offset = (10 + target) * t * lineH;
  return (
    <span style={{ display: 'inline-block', height: lineH }}>
      <span style={{ display: 'block', transform: `translateY(${-offset}px)` }}>
        {(DIGITS + DIGITS).split('').map((d, j) => (
          <span
            key={j}
            style={{
              display: 'block',
              fontSize: 34,
              fontWeight: 700,
              lineHeight: `${lineH}px`,
              color,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
};

const DigitRoll: React.FC<{ value: string; delay: number; color: string }> = ({ value, delay, color }) => {
  const lineH = Math.round(34 * 1.18);
  return (
    <span style={{ display: 'inline-flex', overflow: 'hidden', height: lineH, verticalAlign: 'bottom' }}>
      {value.split('').map((c, i) => (
        <DigitColumn key={i} ch={c} delay={delay + i * 3} lineH={lineH} color={color} />
      ))}
    </span>
  );
};

export type ChapterTitleCardProps = Partial<typeof TITLE_CARD_DEFAULTS> & {
  duration: number;
  words: { text: string; accent?: boolean; br?: boolean }[];
  sub?: string;
  subDigits?: string;
};

export const ChapterTitleCard: React.FC<ChapterTitleCardProps> = ({
  duration,
  words,
  sub,
  subDigits,
  fontSize = TITLE_CARD_DEFAULTS.fontSize,
  ink = TITLE_CARD_DEFAULTS.ink,
  accent = TITLE_CARD_DEFAULTS.accent,
  muted = TITLE_CARD_DEFAULTS.muted,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [Math.max(10, duration - 8), duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const underline = interpolate(frame, [16, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const subT = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: DSH.stageMid }}>
      <StudioBackdrop />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeIn * fadeOut,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 1580 }}>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize,
              fontWeight: 760,
              lineHeight: 1.18,
              color: ink,
              letterSpacing: '-0.025em',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              columnGap: '0.18em',
              rowGap: '0.06em',
            }}
          >
            {words.map((w, i) => {
              const delay = 3 + i * 3.5;
              const t = interpolate(frame, [delay, delay + 9], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.bezier(0.2, 0.75, 0.3, 1),
              });
              return (
                <React.Fragment key={i}>
                  <span
                    style={{
                      opacity: t,
                      transform: `scale(${(1.28 - 0.28 * t).toFixed(4)})`,
                      filter: t < 0.995 ? `blur(${((1 - t) * 7).toFixed(2)}px)` : undefined,
                      display: 'inline-block',
                      fontStyle: w.accent ? 'italic' : 'normal',
                      color: w.accent ? accent : undefined,
                    }}
                  >
                    {w.text}
                  </span>
                  {w.br && <span style={{ flexBasis: '100%', height: 0 }} />}
                </React.Fragment>
              );
            })}
          </div>
          <div
            style={{
              height: 6,
              width: 220,
              margin: '38px auto 0',
              borderRadius: 3,
              background: accent,
              transform: `scaleX(${underline.toFixed(4)})`,
            }}
          />
          {(sub || subDigits) && (
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 32, // >= 32px hard floor per Q11
                fontWeight: 600,
                letterSpacing: '0.10em',
                color: muted,
                marginTop: 34,
                opacity: subT,
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'baseline',
                gap: '0.45em',
              }}
            >
              {subDigits && <DigitRoll value={subDigits} delay={8} color={accent} />}
              {sub && <span>{sub}</span>}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

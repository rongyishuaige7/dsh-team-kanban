// S5: Darkroom Constellation Critical-Path Climax + One-Click Zero-Residue Disarm (177f)
// Faithful to demos/camera/cursor-flyover/CursorFlyover.tsx:
// Seamless Darkroom (#0B0E17) continuation from S4 (zero flash seam!):
// - Station 1 (click @ f30 = beat 54): Hand leads eye by 2f along gentle wrist bow arc to `.tkb-debrief__btn` 「星图」 ->
//   ignites `data-constellation` Emerald Critical-Path Replay across the Dark board (>1.3s luminous hold!)
// - Station 2 (click @ f104 = beat 59): Cursor hops to `.tkb-head` 「团队 → 停用」 anti-misfire popover ->
//   board closes cleanly with zero residue -> 24f smooth pullback overview -> porcelain dawn glow rides riser into S6 Drop!
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { DSH, FONTS } from '../tokens';
import { EASE, Grain, SpeedBlur, StudioBackdrop, alpha, bezier, mix, ramp } from '../lib/Polish';
import layout from '../live-layout.json';

export const SCENE_CONSTELLATION_DEFAULTS = {
  step1Tag: '① 点击战报条「星图」 · 点亮 4 级关键路径翡翠主干',
  step2Tag: '② 一键确认停用 · 历史任务保留，看板零残留退场',
  accent: DSH.emerald,
  danger: DSH.crimson,
  duration: 177,
};

const PAD_X = 120;
const PAD_Y = 90;
const WW = 1920 + PAD_X * 2;
const WH = 1080 + PAD_Y * 2;

const REPLAY_BTN = {
  x: PAD_X + layout.constellation.replayBtn.cx,
  y: PAD_Y + layout.constellation.replayBtn.cy,
};
const DANGER_BTN = {
  x: PAD_X + layout.constellation.dangerBtn.cx,
  y: PAD_Y + layout.constellation.dangerBtn.cy,
};

const CAMS = [
  { x: WW / 2, y: WH / 2 + 12, s: 0.88 },            // 0: Full Darkroom DSH overview
  { x: PAD_X + 1378, y: PAD_Y + 288, s: 1.34 },      // 1: Station 1 — Full 3-lane Debrief + Critical-Path Constellation view (zero left clip!)
  { x: PAD_X + 1595, y: PAD_Y + 232, s: 1.56 },      // 2: Station 2 — Header 团队 / 停用 confirmation popover
];

const LEG0 = 8;
const CLICK1 = 30;  // Beat 54! Ignites Constellation Critical-Path Replay -> stationary hold f30..86 (56f = 1.87s!)
const LEG1 = 84;
const CLICK2 = 104; // Beat 59! Confirms Disarm -> closes board cleanly
const BACK = 120;   // Smooth 24f pullback to clean Darkroom overview -> dawn handoff into S6 Drop!
const CAM_EASE = bezier(0.55, 0, 0.18, 1);

const camAt = (f: number) => {
  let { x, y, s } = CAMS[0];
  let hop = 0;

  // Leg 0 -> Station 1 (2f behind cursor per CursorFlyover rule)
  const u0 = ramp(f, LEG0 + 2, 18, CAM_EASE);
  x = mix(x, CAMS[1].x, u0);
  y = mix(y, CAMS[1].y, u0);
  s = mix(s, CAMS[1].s, u0);

  // Leg 1 -> Station 2
  const u1 = ramp(f, LEG1 + 2, 16, CAM_EASE);
  x = mix(x, CAMS[2].x, u1);
  y = mix(y, CAMS[2].y, u1);
  s = mix(s, CAMS[2].s, u1);
  if (u1 > 0 && u1 < 1) hop = 0.045 * Math.sin(Math.PI * u1);

  // Smooth pullback to Overview
  const b = ramp(f, BACK, 24, EASE.smooth);
  x = mix(x, CAMS[0].x, b);
  y = mix(y, CAMS[0].y, b);
  s = mix(s, CAMS[0].s, b);

  s *= (1 - hop) * (1 + 0.012 * ramp(f, BACK + 24, 30, EASE.smooth));
  return { x, y, s };
};

const cursorAt = (
  f: number,
  replayBtn: { x: number; y: number },
  dangerBtn: { x: number; y: number },
) => {
  let x = WW / 2 + 160;
  let y = WH / 2 + 30;

  // Move 1 -> replayBtn (2f lead + 12% normal wrist bow arc)
  {
    const u = ramp(f, LEG0, 16, EASE.swift);
    const dx = replayBtn.x - x;
    const dy = replayBtn.y - y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const bow = Math.sin(Math.PI * u) * Math.min(82, len * 0.12);
    x = mix(x, replayBtn.x, u) + (-dy / len) * bow;
    y = mix(y, replayBtn.y, u) + (dx / len) * bow;
  }

  // Step gently aside during Constellation glow so cursor never blocks the lit cards!
  {
    const u = ramp(f, CLICK1 + 6, 14, EASE.smooth);
    x = mix(x, replayBtn.x - 110, u);
    y = mix(y, replayBtn.y + 34, u);
  }

  // Move 2 -> dangerBtn
  {
    const u = ramp(f, LEG1, 15, EASE.swift);
    const dx = dangerBtn.x - x;
    const dy = dangerBtn.y - y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const bow = Math.sin(Math.PI * u) * Math.min(44, len * 0.16);
    x = mix(x, dangerBtn.x, u) + (-dy / len) * bow;
    y = mix(y, dangerBtn.y, u) + (dx / len) * bow;
  }

  // Park cleanly on pullback
  {
    const u = ramp(f, BACK, 24, EASE.smooth);
    x = mix(x, WW / 2 + 280, u);
    y = mix(y, WH / 2 + 90, u);
  }

  return { x, y };
};

const CursorArrow: React.FC<{ press: number }> = ({ press }) => (
  <svg
    viewBox="0 0 24 24"
    width={38}
    height={38}
    style={{
      position: 'absolute',
      left: -3,
      top: -2,
      overflow: 'visible',
      filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.65)) drop-shadow(0 8px 14px rgba(0,0,0,0.45))',
      transform: `scale(${(1 - 0.14 * press).toFixed(3)})`,
      transformOrigin: '3px 2px',
    }}
  >
    <path
      d="M4.5 2.5 L4.5 19.2 L8.9 15 L11.9 21.6 L14.9 20.3 L11.9 13.8 L18.2 13.4 Z"
      fill="#0d1324"
      stroke="#ffffff"
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  </svg>
);

export type SceneConstellationProps = Partial<typeof SCENE_CONSTELLATION_DEFAULTS> & {
  texDir?: string;
};

export const SceneConstellation: React.FC<SceneConstellationProps> = ({
  step1Tag = SCENE_CONSTELLATION_DEFAULTS.step1Tag,
  step2Tag = SCENE_CONSTELLATION_DEFAULTS.step2Tag,
  accent = SCENE_CONSTELLATION_DEFAULTS.accent,
  danger = SCENE_CONSTELLATION_DEFAULTS.danger,
  duration = SCENE_CONSTELLATION_DEFAULTS.duration,
  texDir = 'textures',
}) => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);

  const scr = (f: number) => {
    const c = camAt(f);
    return { x: 960 - c.x * c.s, y: 540 - c.y * c.s };
  };
  const a = scr(frame + 0.5);
  const b = scr(frame - 0.5);

  const cur = cursorAt(frame, REPLAY_BTN, DANGER_BTN);
  const cx = 960 + (cur.x - cam.x) * cam.s;
  const cy = 540 + (cur.y - cam.y) * cam.s;

  let press = 0;
  let ripple = -1;
  let rippleColor: string = accent;
  for (const [clk, col] of [
    [CLICK1, accent],
    [CLICK2, danger],
  ] as const) {
    const pf = frame - clk;
    if (pf > -2 && pf < 8) {
      press = Math.max(press, pf < 1 ? ramp(pf, -2, 3, EASE.swift) : 1 - ramp(pf, 1, 6, EASE.overshoot));
    }
    if (pf >= 0 && pf < 18) {
      ripple = pf / 18;
      rippleColor = col;
    }
  }

  const intro = ramp(frame, 0, 8, EASE.out);
  const constellationLit = ramp(frame, CLICK1 + 1, 9, EASE.snappy) * (1 - ramp(frame, LEG1 + 4, 8, EASE.out));
  const popOpen = ramp(frame, LEG1 + 6, 7, EASE.snappy);
  const boardClosed = ramp(frame, CLICK2 + 1, 12, EASE.smooth);

  // Porcelain dawn horizon veil on final 12f riding `riser-cine.mp3` smoothly into S6 Drop!
  const dawnHandoff = ramp(frame, Math.max(130, duration - 12), 12, EASE.smooth);

  const statusText = frame < LEG1 + 4 ? step1Tag : step2Tag;
  const statusColor = frame < LEG1 + 4 ? '#6ee7b7' : '#93c5fd';

  return (
    <AbsoluteFill style={{ backgroundColor: DSH.darkStageMid }}>
      <StudioBackdrop dark />

      <SpeedBlur vx={a.x - b.x} vy={a.y - b.y} amount={0.08} max={7}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: WW,
            height: WH,
            zoom: cam.s,
            transform: `translate(${(960 / cam.s - cam.x).toFixed(2)}px, ${(540 / cam.s - cam.y).toFixed(2)}px)`,
            transformOrigin: '0 0',
            opacity: intro,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: PAD_X,
              top: PAD_Y,
              width: 1920,
              height: 1080,
              borderRadius: 22,
              overflow: 'hidden',
              background: DSH.darkSurface,
              border: `1.5px solid ${constellationLit > 0.2 ? alpha(DSH.emerald, 0.36) : 'rgba(255,255,255,0.10)'}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 ${(48 * constellationLit).toFixed(1)}px ${alpha(DSH.emerald, 0.16 * constellationLit)}, 0 40px 90px -22px rgba(0,2,8,0.88)`,
            }}
          >
            {/* Base Darkroom 6/6 All-Done with .tkb-debrief strip */}
            {boardClosed < 1 && (
              <Img
                src={staticFile(`${texDir}/app-dark-debrief.png`)}
                style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, display: 'block' }}
              />
            )}

            {/* Illuminated Emerald Critical-Path Constellation state */}
            {constellationLit > 0.001 && boardClosed < 1 && (
              <Img
                src={staticFile(`${texDir}/app-dark-constellation.png`)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: 1920,
                  height: 1080,
                  display: 'block',
                  opacity: constellationLit,
                }}
              />
            )}

            {/* Anti-misfire Disarm confirmation popover */}
            {popOpen > 0.001 && boardClosed < 1 && (
              <Img
                src={staticFile(`${texDir}/app-dark-disarm-pop.png`)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: 1920,
                  height: 1080,
                  display: 'block',
                  opacity: popOpen * (1 - boardClosed),
                }}
              />
            )}

            {/* Clean zero-residue closed workspace */}
            {boardClosed > 0.001 && (
              <Img
                src={staticFile(`${texDir}/app-dark-disarm-closed.png`)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: 1920,
                  height: 1080,
                  display: 'block',
                  opacity: boardClosed,
                }}
              />
            )}
          </div>
        </div>
      </SpeedBlur>

      {/* Top-left telemetry context pill (32px Q11 floor) */}
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 40,
          padding: '10px 24px',
          borderRadius: 999,
          background: 'rgba(18, 21, 30, 0.90)',
          border: `1px solid ${alpha(statusColor, 0.30)}`,
          boxShadow: '0 20px 44px -14px rgba(0,2,10,0.72), inset 0 1px 0 rgba(255,255,255,0.08)',
          fontFamily: FONTS.sans,
          fontSize: 32,
          fontWeight: 680,
          color: statusColor,
          opacity: intro * (1 - ramp(frame, BACK, 14, EASE.out)),
        }}
      >
        {statusText}
      </div>

      {/* Screen-space 80px Click Ripple + Constant 38px Cursor */}
      {ripple >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: cx - 40,
            top: cy - 40,
            width: 80,
            height: 80,
            borderRadius: 40,
            border: `3px solid ${alpha(rippleColor, (1 - ripple) * 0.92)}`,
            background: alpha(rippleColor, (1 - ripple) * 0.16),
            transform: `scale(${(0.3 + EASE.out(ripple) * 1.25).toFixed(3)})`,
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'absolute', left: cx, top: cy, opacity: intro * (1 - dawnHandoff), pointerEvents: 'none' }}>
        <CursorArrow press={press} />
      </div>

      {dawnHandoff > 0.002 && (
        <AbsoluteFill style={{ background: DSH.stageMid, opacity: dawnHandoff, pointerEvents: 'none' }} />
      )}
      <Grain opacity={0.035} blend="overlay" />
    </AbsoluteFill>
  );
};

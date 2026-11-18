// S5: Cursor Flyover Disarm + Zero-Residue Auto-Close (177f)
// Faithful to demos/camera/cursor-flyover/CursorFlyover.tsx:
// Hand leads eye (cursor departs 2f ahead along gentle bow arc, constant 40px screen-space macOS arrow,
// 80px click ripple, directional SpeedBlur on camera hops) across 2 real UI stations:
// Station 1 (click @ f44 = beat 55): `.tkb-head` embedded `团队` button -> opens anti-misfire confirmation popover
// Station 2 (click @ f89 = beat 58): `停用` button -> tasks preserved, board auto-closes cleanly -> pullback overview!
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { DSH, FONTS } from '../tokens';
import { EASE, Grain, SpeedBlur, StudioBackdrop, alpha, bezier, mix, ramp, softShadow } from '../lib/Polish';
import layout from '../live-layout.json';

export const SCENE_DISARM_DEFAULTS = {
  step1Tag: '① 顶栏内嵌「团队」入口 · 默认聚焦取消防误触',
  step2Tag: '② 确认停用 · 历史任务保留，看板自动收起零残留',
  accent: DSH.brand,
  danger: DSH.crimson,
  duration: 177,
};

// World canvas: 1920x1080 real DSH desktop window placed on a 2160x1260 porcelain stage (pad 120, 90)
const PAD_X = 120;
const PAD_Y = 90;
const WW = 1920 + PAD_X * 2;
const WH = 1080 + PAD_Y * 2;

const TEAM_BTN = {
  x: PAD_X + layout.disarm.teamBtn.cx, // 120 + 1874 = 1994
  y: PAD_Y + layout.disarm.teamBtn.cy, // 90 + 68 = 158
};
const DANGER_BTN = {
  x: PAD_X + layout.disarm.dangerBtn.cx, // 120 + 1867 = 1987
  y: PAD_Y + layout.disarm.dangerBtn.cy, // 90 + 178 = 268
};

const CAMS = [
  { x: WW / 2, y: WH / 2 + 12, s: 0.86 },            // Overview: full 1920x1080 DSH app framed cleanly
  { x: PAD_X + 1600, y: PAD_Y + 210, s: 1.58 },      // Station 1: Header + embedded 团队 button + popover area
  { x: PAD_X + 1620, y: PAD_Y + 235, s: 1.66 },      // Station 2: Popover 取消 / 停用 close-up
];

const LEG0 = 20;
const LEG1 = 67;
const CLICK1 = 44; // Beat 55!
const CLICK2 = 89; // Beat 58!
const BACK = 116;  // Pull back to full clean DSH workspace -> settles at f140 (+37f hold!)
const CAM_EASE = bezier(0.55, 0, 0.18, 1);

const camAt = (f: number) => {
  let { x, y, s } = CAMS[0];
  s *= mix(0.96, 1, ramp(f, 0, 20, EASE.snappy));
  let hop = 0;

  // Leg 0 -> Station 1
  const u0 = ramp(f, LEG0 + 2, 20, CAM_EASE);
  x = mix(x, CAMS[1].x, u0);
  y = mix(y, CAMS[1].y, u0);
  s = mix(s, CAMS[1].s, u0);

  // Leg 1 -> Station 2
  const u1 = ramp(f, LEG1 + 2, 18, CAM_EASE);
  x = mix(x, CAMS[2].x, u1);
  y = mix(y, CAMS[2].y, u1);
  s = mix(s, CAMS[2].s, u1);
  if (u1 > 0 && u1 < 1) hop = 0.05 * Math.sin(Math.PI * u1);

  // Pull back to Overview
  const b = ramp(f, BACK, 24, EASE.smooth);
  x = mix(x, CAMS[0].x, b);
  y = mix(y, CAMS[0].y, b);
  s = mix(s, CAMS[0].s, b);

  s *= (1 - hop) * (1 + 0.012 * ramp(f, BACK + 24, 35, EASE.smooth));
  return { x, y, s };
};

// Cursor leads camera by 2f along gentle bow arc (`CursorFlyover.tsx` lines 93-106)
const cursorAt = (
  f: number,
  teamBtn: { x: number; y: number },
  dangerBtn: { x: number; y: number },
) => {
  let x = WW / 2 + 120;
  let y = WH / 2 + 40;

  // Move 1 -> teamBtn
  {
    const u = ramp(f, LEG0, 18, EASE.swift);
    const dx = teamBtn.x - x;
    const dy = teamBtn.y - y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const bow = Math.sin(Math.PI * u) * Math.min(85, len * 0.12);
    x = mix(x, teamBtn.x, u) + (-dy / len) * bow;
    y = mix(y, teamBtn.y, u) + (dx / len) * bow;
  }

  // Move 2 -> dangerBtn
  {
    const u = ramp(f, LEG1, 16, EASE.swift);
    const dx = dangerBtn.x - x;
    const dy = dangerBtn.y - y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const bow = Math.sin(Math.PI * u) * Math.min(36, len * 0.18);
    x = mix(x, dangerBtn.x, u) + (-dy / len) * bow;
    y = mix(y, dangerBtn.y, u) + (dx / len) * bow;
  }

  // Gentle park during overview pullback
  {
    const u = ramp(f, BACK, 24, EASE.smooth);
    x = mix(x, WW / 2 + 260, u);
    y = mix(y, WH / 2 + 80, u);
  }

  return { x, y };
};

const CursorArrow: React.FC<{ press: number }> = ({ press }) => (
  <svg
    viewBox="0 0 24 24"
    width={40}
    height={40}
    style={{
      position: 'absolute',
      left: -3,
      top: -2,
      overflow: 'visible',
      filter: 'drop-shadow(0 2px 2px rgba(12,24,54,0.36)) drop-shadow(0 8px 12px rgba(12,24,54,0.26))',
      transform: `scale(${(1 - 0.16 * press).toFixed(3)})`,
      transformOrigin: '3px 2px',
    }}
  >
    <path
      d="M4.5 2.5 L4.5 19.2 L8.9 15 L11.9 21.6 L14.9 20.3 L11.9 13.8 L18.2 13.4 Z"
      fill="#0d1324"
      stroke="#ffffff"
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </svg>
);

export type SceneDisarmProps = Partial<typeof SCENE_DISARM_DEFAULTS> & {
  texDir?: string;
  teamTarget?: { cx: number; cy: number };
  dangerTarget?: { cx: number; cy: number };
};

export const SceneDisarm: React.FC<SceneDisarmProps> = ({
  step1Tag = SCENE_DISARM_DEFAULTS.step1Tag,
  step2Tag = SCENE_DISARM_DEFAULTS.step2Tag,
  accent = SCENE_DISARM_DEFAULTS.accent,
  danger = SCENE_DISARM_DEFAULTS.danger,
  texDir = 'textures',
  teamTarget,
  dangerTarget,
}) => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);

  const scr = (f: number) => {
    const c = camAt(f);
    return { x: 960 - c.x * c.s, y: 540 - c.y * c.s };
  };
  const a = scr(frame + 0.5);
  const b = scr(frame - 0.5);

  const tb = teamTarget ? { x: PAD_X + teamTarget.cx, y: PAD_Y + teamTarget.cy } : TEAM_BTN;
  const db = dangerTarget ? { x: PAD_X + dangerTarget.cx, y: PAD_Y + dangerTarget.cy } : DANGER_BTN;
  const cur = cursorAt(frame, tb, db);
  const cx = 960 + (cur.x - cam.x) * cam.s;
  const cy = 540 + (cur.y - cam.y) * cam.s;

  // Click press & 80px ripple on CLICK1 (blue) and CLICK2 (crimson)
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

  // Real UI state transitions driven by CLICK1 and CLICK2!
  const popOpen = ramp(frame, CLICK1 + 1, 7, EASE.snappy);
  const boardClosed = ramp(frame, CLICK2 + 1, 12, EASE.smooth);
  const intro = ramp(frame, 0, 10, EASE.out);

  const statusText = frame < CLICK2 ? step1Tag : step2Tag;
  const statusColor = frame < CLICK2 ? accent : DSH.emeraldInk;

  return (
    <AbsoluteFill style={{ backgroundColor: DSH.stageMid }}>
      <StudioBackdrop />

      <SpeedBlur vx={a.x - b.x} vy={a.y - b.y} amount={0.08} max={7}>
        {/* CSS `zoom` keeps 2x full-app screenshot razor-sharp at 1.66x close-up (Q2) */}
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
          {/* App window frame */}
          <div
            style={{
              position: 'absolute',
              left: PAD_X,
              top: PAD_Y,
              width: 1920,
              height: 1080,
              borderRadius: 22,
              overflow: 'hidden',
              background: '#ffffff',
              border: '1.5px solid rgba(15, 17, 21, 0.09)',
              boxShadow: `inset 0 2px 0 #ffffff, ${softShadow(40, { color: DSH.shadow, strength: 1.25 })}`,
            }}
          >
            {/* State 1: 6/6 Completed Board before clicking 团队 */}
            {boardClosed < 1 && (
              <Img
                src={staticFile(`${texDir}/app-disarm-before.png`)}
                style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, display: 'block' }}
              />
            )}

            {/* State 2: Confirmation Popover opened on CLICK1 */}
            {popOpen > 0.001 && boardClosed < 1 && (
              <Img
                src={staticFile(`${texDir}/app-disarm-pop.png`)}
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

            {/* State 3: Board auto-closed cleanly after CLICK2 ("停用"), tasks preserved! */}
            {boardClosed > 0.001 && (
              <Img
                src={staticFile(`${texDir}/app-disarm-closed.png`)}
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

      {/* Top-left context badge (32px readable per Q11; fades out cleanly on overview pullback) */}
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 40,
          padding: '10px 24px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.92)',
          border: `1px solid ${alpha(statusColor, 0.22)}`,
          boxShadow: softShadow(14, { color: DSH.shadow, strength: 0.9 }),
          fontFamily: FONTS.sans,
          fontSize: 32,
          fontWeight: 680,
          color: statusColor,
          opacity: intro * (1 - ramp(frame, BACK, 14, EASE.out)),
        }}
      >
        {statusText}
      </div>

      {/* Screen-space 80px Click Ripple + Constant 40px macOS Cursor */}
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
            background: alpha(rippleColor, (1 - ripple) * 0.14),
            transform: `scale(${(0.3 + EASE.out(ripple) * 1.25).toFixed(3)})`,
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'absolute', left: cx, top: cy, opacity: intro, pointerEvents: 'none' }}>
        <CursorArrow press={press} />
      </div>

      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};

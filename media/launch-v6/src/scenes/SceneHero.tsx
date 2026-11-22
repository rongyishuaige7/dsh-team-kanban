// S2: Micro-Optic Hero Card #4 (@4x) + Conflict Pair Dashed Linkage + One-Tap Steer Copy (177f)
// Faithful to demos/opening/spotlight-hero-card/SpotlightHeroCard.tsx:
// Spotlight searches 3 stations -> locks onto #4 -> PageCam CSS `zoom` 3D push-in (Q2 razor-sharp text!) ->
// @4x expanded Card #4 levitates with real contact shadow while peer #2 shows amber `is-conflict-pair` outline ->
// 2-lap perimeter scan beam -> tactile pointer taps `复制协调指令` at f94 flipping to @4x emerald `↵ 已复制` ->
// reseats at f144 with micro-press -> 33 frames (1.10s) completely locked stillness hold!
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from '../lib/PageCam';
import { EASE, Grain, alpha, mix, ramp } from '../lib/Polish';
import { DSH, FONTS } from '../tokens';
import layout from '../live-layout.json';

export const SCENE_HERO_DEFAULTS = {
  noteLine1: '写冲突对端联动',
  noteLine2: '一键复制协调指令',
  noteSize: 31, // 31px * 2.05 zoom = 63.5px on 1080p screen (>> 56px Q11!)
  accent: DSH.brand,
  beamAccent: DSH.emerald,
  duration: 177,
};

const PAGE_W = layout.hero.pageW;
const PAGE_H = layout.hero.pageH;
const CARD = layout.hero.card4; // { x: 793, y: 144, w: 356, h: 319, cx: 971, cy: 304 }
const NUDGE = layout.hero.nudgeBtn; // { rcx: 291, rcy: 294 }
const MCX = CARD.cx;
const MCY = CARD.cy;
const RADIUS = 10;

const LOCK = 34;
const PUSH0 = 40;
const PUSH1 = 58;
const RISE0 = 56;
const RISE1 = 66;
const COPY_CLICK = 94;
const RESEAT0 = 126;
const LAND = 144; // -> 33 frames (1.10s) of completely locked stillness hold!

const PUSH_EASE = Easing.bezier(0.35, 0, 0.2, 1);
const POP_EASE = Easing.bezier(0.2, 1.25, 0.3, 1);
const RESEAT_EASE = Easing.bezier(0.4, 0, 0.3, 1.05);
const clampOpt = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const buildKeys = (duration: number): CamKey[] => [
  { frame: 0, cx: 960, cy: 520, zoom: 0.92, rotX: 0, rotY: 0, rotZ: 0, persp: 1280 },
  { frame: PUSH0, cx: 960, cy: 520, zoom: 0.92, rotX: 0, rotY: 0, rotZ: 0, persp: 1280 },
  { frame: PUSH1, cx: MCX - 96, cy: MCY - 8, zoom: 2.05, rotX: 5.5, rotY: 22, rotZ: 0.9, persp: 1280 },
  { frame: duration, cx: MCX - 96, cy: MCY - 8, zoom: 2.05, rotX: 5.5, rotY: 22, rotZ: 0.9, persp: 1280 },
];

const CONE_DUST = Array.from({ length: 24 }, (_, i) => ({
  x: (i * 397 + 91) % 1920,
  y0: (i * 523 + 170) % 1080,
  drift: 0.22 + (i % 4) * 0.08,
  size: 2.1 + (i % 4) * 1.0,
  phase: (i * 0.91) % (Math.PI * 2),
}));

export type SceneHeroProps = Partial<typeof SCENE_HERO_DEFAULTS> & {
  texDir?: string;
};

export const SceneHero: React.FC<SceneHeroProps> = ({
  noteLine1 = SCENE_HERO_DEFAULTS.noteLine1,
  noteLine2 = SCENE_HERO_DEFAULTS.noteLine2,
  noteSize = SCENE_HERO_DEFAULTS.noteSize,
  accent = SCENE_HERO_DEFAULTS.accent,
  beamAccent = SCENE_HERO_DEFAULTS.beamAccent,
  duration = SCENE_HERO_DEFAULTS.duration,
  texDir = 'textures',
}) => {
  const frame = useCurrentFrame();
  const keys = buildKeys(duration);

  const camAt = (fr: number) => {
    let a = keys[0];
    let b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (fr >= keys[i].frame && fr <= keys[i + 1].frame) {
        a = keys[i];
        b = keys[i + 1];
        break;
      }
    }
    const t = a.frame === b.frame ? 1 : interpolate(fr, [a.frame, b.frame], [0, 1], { ...clampOpt, easing: PUSH_EASE });
    const m = (x?: number, y?: number) => (x ?? 0) + ((y ?? 0) - (x ?? 0)) * t;
    return {
      cx: m(a.cx, b.cx),
      cy: m(a.cy, b.cy),
      zoom: m(a.zoom, b.zoom),
      rotX: m(a.rotX, b.rotX),
      rotY: m(a.rotY, b.rotY),
      rotZ: m(a.rotZ, b.rotZ),
      persp: m(a.persp, b.persp),
    };
  };

  const sceneIntro = ramp(frame, 0, 8, EASE.out);
  const sceneOutroBrighten = ramp(frame, Math.max(150, duration - 10), 10, EASE.smooth);
  const dimFactor = sceneIntro * (1 - sceneOutroBrighten);

  const lamp = interpolate(frame, [1, 3, 4, 6], [0.35, 1, 0.68, 1], clampOpt);

  const ST = [4, 10, 13, 19, 22, 28, LOCK, PUSH1];
  const spotX = interpolate(frame, ST, [26, 26, 78, 78, 68, 68, 50.5, 62], { ...clampOpt, easing: EASE.smooth });
  const spotY = interpolate(frame, ST, [34, 34, 12, 12, 32, 32, 28, 48], { ...clampOpt, easing: EASE.smooth });
  const poolBase = interpolate(frame, [22, LOCK, PUSH1], [430, 340, 520], { ...clampOpt, easing: EASE.swift });
  const pulse = interpolate(frame, [LOCK, LOCK + 4, LOCK + 10], [0, 0.06, 0], clampOpt);
  const breathe = 1 + 0.014 * Math.sin((frame - LAND) / 14) * ramp(frame, LAND, 20, EASE.out);
  const poolRx = poolBase * (1 + pulse) * breathe;
  const poolRy = poolBase * interpolate(frame, [PUSH0, PUSH1], [0.84, 0.96], clampOpt) * (1 + pulse) * breathe;

  const dark = interpolate(frame, [0, LOCK, PUSH1], [0.74, 0.80, 0.83], clampOpt) * dimFactor;
  const cardLight = ramp(frame, LOCK + 4, PUSH1 - LOCK - 4, EASE.smooth) * (1 - sceneOutroBrighten);
  const holdBreath = 1 + 0.012 * Math.sin((frame - LAND) / 14) * ramp(frame, LAND, 20, EASE.out);

  const rise = interpolate(frame, [RISE0, RISE1], [0, 1], { ...clampOpt, easing: POP_EASE });
  const reseat = interpolate(frame, [RESEAT0, LAND], [0, 1], { ...clampOpt, easing: RESEAT_EASE });
  const lift = rise * (1 - reseat);
  const bob = Math.sin(((frame - RISE1) / 40) * Math.PI * 2) * 3.0 * lift;
  const z = 96 * lift + bob;
  const landed = frame >= LAND;

  // 70ms micro-switch press on COPY_CLICK (f94) + landing micro-press at LAND (f144)
  const copyPress = interpolate(frame, [COPY_CLICK - 1, COPY_CLICK + 1, COPY_CLICK + 4], [1, 0.992, 1], clampOpt);
  const landPress = interpolate(frame, [LAND - 4, LAND - 1, LAND], [1, 0.996, 1], clampOpt);
  const press = copyPress * landPress;
  const copiedT = ramp(frame, COPY_CLICK, 5, EASE.snappy);
  const copyRipple = frame >= COPY_CLICK && frame < COPY_CLICK + 16 ? (frame - COPY_CLICK) / 16 : -1;

  // Subtle card-space tactile pointer gliding to `.tkb-nudge__btn` and stepping aside after click
  const ptrIn = ramp(frame, COPY_CLICK - 16, 14, EASE.out);
  const ptrOut = ramp(frame, COPY_CLICK + 8, 12, EASE.exit);
  const ptrVis = ptrIn * (1 - ptrOut);
  const ptrX = mix((NUDGE?.rcx ?? 291) + 46, (NUDGE?.rcx ?? 291) + 4, ptrIn) + 28 * ptrOut;
  const ptrY = mix((NUDGE?.rcy ?? 294) + 36, (NUDGE?.rcy ?? 294) + 2, ptrIn) + 24 * ptrOut;
  const ptrScale = frame >= COPY_CLICK - 1 && frame <= COPY_CLICK + 3 ? 0.88 : 1;

  const shadow = `${(-10 * lift).toFixed(1)}px ${(12 * lift).toFixed(1)}px ${(14 + 14 * lift).toFixed(1)}px rgba(8,14,28,${(0.30 * lift).toFixed(3)}), ${(-34 * lift).toFixed(1)}px ${(46 * lift).toFixed(1)}px ${(84 * lift).toFixed(1)}px rgba(8,14,28,${(0.40 * lift).toFixed(3)})`;

  const slotVis = Math.min(1, rise * 2) * (1 - reseat);
  const landPulse = interpolate(frame, [LAND - 4, LAND, LAND + 14], [0, 1, 0], clampOpt);
  const slotEdge = Math.min(1, 0.45 * (1 - reseat)) + landPulse * 0.55;

  // 2-lap perimeter scan beam (strictly clipped/aligned to hero card radius, Q4!)
  const beam1Prog = interpolate(frame, [66, 80], [0, 1], { ...clampOpt, easing: EASE.linear });
  const beam1On = frame >= 65 && frame <= 81;
  const beam2Prog = interpolate(frame, [84, 104], [0, 1], { ...clampOpt, easing: EASE.swift });
  const beam2On = frame >= 83 && frame <= 105;
  const beamTrail = interpolate(frame, [104, 120], [0.42, 0], clampOpt);
  const bw = CARD.w + 6;
  const bh = CARD.h + 6;

  const noteIn = ramp(frame, 68, 14, EASE.out) * (1 - sceneOutroBrighten);
  const noteSettle = interpolate(frame, [RESEAT0 - 4, LAND], [0, 1], { ...clampOpt, easing: RESEAT_EASE });
  const noteZ = 4 + (82 + Math.sin(((frame - 68) / 44) * Math.PI * 2) * 3) * (1 - noteSettle);
  const hl = ramp(frame, 84, 12, EASE.swift);

  const px = (spotX / 100) * 1920;
  const py = (spotY / 100) * 1080;
  const sx = px + 400;
  const sy = -680;
  const coneW = poolRx * 0.58;
  const cone = `${sx - 26}px ${sy}px, ${sx + 26}px ${sy}px, ${px + coneW}px ${py}px, ${px - coneW}px ${py}px`;
  const c = camAt(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: '#dfe7f5' }}>
      <PageCam src={`${texDir}/app-hero-conflict-light.png`} pageW={PAGE_W} pageH={PAGE_H} keys={keys} ease={PUSH_EASE} bg="#ffffff">
        <div
          style={{
            position: 'absolute',
            left: -400,
            right: -400,
            top: -360,
            height: 361,
            background: 'linear-gradient(180deg, #dfe7f5 0%, #f7f9fd 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Page-space theatre mask revealing both Card #4 AND peer #2's amber `is-conflict-pair` dashed outline! */}
        {cardLight > 0.001 ? (
          <svg
            width={PAGE_W}
            height={PAGE_H + 360}
            viewBox={`0 -360 ${PAGE_W} ${PAGE_H + 360}`}
            style={{
              position: 'absolute',
              left: 0,
              top: -360,
              transform: 'translateZ(1px)',
              opacity: cardLight,
              pointerEvents: 'none',
            }}
          >
            <defs>
              <filter id="dsh-v6-tight" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="20" />
              </filter>
              <filter id="dsh-v6-wide" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="56" />
              </filter>
              <mask id="dsh-v6-hole" maskUnits="userSpaceOnUse" x={0} y={-360} width={PAGE_W} height={PAGE_H + 360}>
                <rect x={0} y={-360} width={PAGE_W} height={PAGE_H + 360} fill="white" />
                {/* Wide spill illuminating calibrated .tkb-strip header AND conflict-peer Card #2 in column 2 */}
                <rect
                  x={CARD.x - 36}
                  y={0}
                  width={CARD.w + 420}
                  height={CARD.y + CARD.h + 70}
                  rx={60}
                  fill="#3c3c3c"
                  filter="url(#dsh-v6-wide)"
                />
                <rect
                  x={CARD.x - 14}
                  y={CARD.y - 14}
                  width={CARD.w + 28}
                  height={CARD.h + 28}
                  rx={RADIUS + 12}
                  fill="black"
                  filter="url(#dsh-v6-tight)"
                />
              </mask>
            </defs>
            <rect
              x={0}
              y={-360}
              width={PAGE_W}
              height={PAGE_H + 360}
              fill="rgb(11, 16, 30)"
              fillOpacity={Math.min(0.88, 0.82 * holdBreath)}
              mask="url(#dsh-v6-hole)"
            />
          </svg>
        ) : null}

        <div style={{ transformStyle: 'preserve-3d' }}>
          {slotVis > 0.02 || landPulse > 0.02 ? (
            <div
              style={{
                position: 'absolute',
                left: CARD.x - 2,
                top: CARD.y - 2,
                width: CARD.w + 4,
                height: CARD.h + 4,
                transform: 'translateZ(1.5px)',
                background: slotVis > 0.02 ? '#f3f6fc' : 'transparent',
                borderRadius: RADIUS,
                boxShadow: `inset 0 0 22px rgba(65,118,230,${(0.18 * slotEdge).toFixed(3)})`,
                opacity: Math.max(slotVis, landPulse),
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: RADIUS,
                  border: `1.5px solid ${copiedT > 0.5 ? DSH.emerald : accent}`,
                  opacity: slotEdge,
                }}
              />
            </div>
          ) : null}

          {/* Levitating @4x Expanded Card #4 with One-Tap Steer Copy transition */}
          <div
            style={{
              position: 'absolute',
              left: CARD.x,
              top: CARD.y,
              width: CARD.w,
              height: CARD.h,
              transform: `translateZ(${(z + 2).toFixed(2)}px) scale(${press.toFixed(4)})`,
              transformOrigin: 'center center',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Clipped rounded card body (Q4: zero glow bleed outside border-radius!) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: RADIUS,
                overflow: 'hidden',
                background: '#ffffff',
                boxShadow: landed ? 'none' : shadow,
              }}
            >
              <Img
                src={staticFile(`${texDir}/card4-expanded-4x.png`)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  display: 'block',
                }}
              />
              {copiedT > 0.001 && (
                <Img
                  src={staticFile(`${texDir}/card4-copied-4x.png`)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    opacity: copiedT,
                  }}
                />
              )}

              {/* Clipped pill-aligned tactile ripple on right-aligned `↵ 已复制` button */}
              {copyRipple >= 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: (NUDGE?.rx ?? 240) + (NUDGE?.w ?? 103) - 70,
                    top: (NUDGE?.ry ?? 282) - 2,
                    width: 72,
                    height: (NUDGE?.h ?? 24) + 4,
                    borderRadius: 9,
                    border: `2px solid ${alpha(DSH.emerald, (1 - copyRipple) * 0.92)}`,
                    transform: `scale(${(1 + EASE.out(copyRipple) * 0.20).toFixed(3)})`,
                    transformOrigin: 'center center',
                    pointerEvents: 'none',
                  }}
                />
              )}

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(200deg, rgba(255,255,255,0.24), rgba(255,255,255,0) 45%, rgba(12,24,54,0.04) 100%)',
                  opacity: lift,
                  pointerEvents: 'none',
                }}
              />
            </div>

            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: RADIUS,
                boxShadow: `inset 0 0 0 1px rgba(255,255,255,${(0.8 * lift).toFixed(3)}), 0 0 0 1.5px ${alpha(copiedT > 0.5 ? DSH.emerald : '#7aaaff', 0.72 * cardLight)}`,
                pointerEvents: 'none',
              }}
            />

            {(beam1On || beam2On) && lift > 0.4 ? (
              <svg
                width={bw}
                height={bh}
                viewBox={`0 0 ${bw} ${bh}`}
                style={{
                  position: 'absolute',
                  left: -3,
                  top: -3,
                  overflow: 'visible',
                  pointerEvents: 'none',
                  opacity: beam1On ? 1 : 0.76,
                  filter: `drop-shadow(0 0 5px ${alpha(beam1On ? accent : beamAccent, 0.85)})`,
                }}
              >
                <rect
                  x={2}
                  y={2}
                  width={bw - 4}
                  height={bh - 4}
                  rx={RADIUS}
                  fill="none"
                  stroke={beam1On ? accent : beamAccent}
                  strokeWidth={beam1On ? 3.0 : 2.4}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="0.18 1"
                  strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)}
                />
                <rect
                  x={2}
                  y={2}
                  width={bw - 4}
                  height={bh - 4}
                  rx={RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.96)"
                  strokeWidth={beam1On ? 1.4 : 1.1}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="0.18 1"
                  strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)}
                />
              </svg>
            ) : null}

            {beamTrail > 0.01 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: -2,
                  borderRadius: RADIUS + 2,
                  border: `1.5px solid ${copiedT > 0.5 ? DSH.emerald : accent}`,
                  opacity: beamTrail,
                  pointerEvents: 'none',
                }}
              />
            ) : null}

            {/* Crisp vector cursor clicking `.tkb-nudge__btn` */}
            {ptrVis > 0.01 && (
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                style={{
                  position: 'absolute',
                  left: ptrX - 2,
                  top: ptrY - 1,
                  opacity: ptrVis,
                  overflow: 'visible',
                  transformOrigin: '2px 1px',
                  transform: `translateZ(3px) scale(${ptrScale})`,
                  filter: 'drop-shadow(0 2px 4px rgba(10,15,28,0.42))',
                  pointerEvents: 'none',
                }}
              >
                <path
                  d="M4.5 2.5 L4.5 19.2 L8.9 15 L11.9 21.6 L14.9 20.3 L11.9 13.8 L18.2 13.4 Z"
                  fill="#0f1422"
                  stroke="#ffffff"
                  strokeWidth={1.7}
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
      </PageCam>

      <AbsoluteFill
        style={{
          background: `radial-gradient(${(poolRx * 1.35).toFixed(1)}px ${(poolRy * 1.35).toFixed(1)}px at ${spotX.toFixed(2)}% ${spotY.toFixed(2)}%, rgba(11,16,30,0) 0%, rgba(11,16,30,0) 28%, rgba(11,16,30,${(dark * 0.28).toFixed(3)}) 46%, rgba(11,16,30,${(dark * 0.65).toFixed(3)}) 66%, rgba(11,16,30,${dark.toFixed(3)}) 100%)`,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          opacity: lamp * (1 - cardLight),
        }}
      />

      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          pointerEvents: 'none',
          opacity: lamp * dimFactor * (1 - 0.45 * ramp(frame, PUSH0, 18, EASE.smooth)),
        }}
      >
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(26px)' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: `polygon(${cone})`,
              background: `linear-gradient(${((Math.atan2(py - sy, px - sx) * 180) / Math.PI - 90).toFixed(1)}deg, rgba(226,238,255,0.32) 0%, rgba(190,214,255,0.15) 60%, rgba(190,214,255,0.04) 100%)`,
            }}
          />
        </div>
        <div style={{ position: 'absolute', inset: 0, clipPath: `polygon(${cone})` }}>
          {CONE_DUST.map((d, i) => {
            const y = (((d.y0 - frame * d.drift) % 1080) + 1080) % 1080;
            const x = d.x + Math.sin(frame * 0.03 + d.phase) * 8;
            const tw = 0.55 + 0.45 * Math.sin(frame * 0.14 + d.phase * 2);
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
                  background: '#eef4ff',
                  opacity: 0.42 * tw,
                }}
              />
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Self-lit 3D Floating Note under identical camera math (stops cleanly left of CARD.x = 793!) */}
      {noteIn > 0.005 ? (
        <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, perspective: `${c.persp * c.zoom}px`, perspectiveOrigin: '960px 540px' }}>
            <div
              style={{
                position: 'absolute',
                width: PAGE_W,
                height: PAGE_H,
                zoom: c.zoom,
                transformOrigin: `${c.cx}px ${c.cy}px`,
                transformStyle: 'preserve-3d',
                transform: `translate(${960 / c.zoom - c.cx}px, ${540 / c.zoom - c.cy}px) rotateY(${c.rotY}deg) rotateX(${c.rotX}deg) rotateZ(${c.rotZ}deg)`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 446,
                  top: 210,
                  width: 322,
                  height: 175,
                  transform: `translateZ(${(noteZ - 1).toFixed(2)}px) translateY(${((1 - noteIn) * 18).toFixed(2)}px)`,
                  background: 'radial-gradient(ellipse 56% 54% at 54% 50%, rgba(10,15,28,0.95) 0%, rgba(10,15,28,0.86) 62%, rgba(10,15,28,0) 100%)',
                  filter: 'blur(6px)',
                  opacity: noteIn,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 478,
                  top: 248,
                  width: 'max-content',
                  whiteSpace: 'nowrap',
                  transform: `translateZ(${noteZ.toFixed(2)}px) translateY(${((1 - noteIn) * 18).toFixed(2)}px)`,
                  opacity: noteIn,
                  filter: noteIn < 0.995 ? `blur(${((1 - noteIn) * 4).toFixed(2)}px)` : undefined,
                  fontFamily: FONTS.sans,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.24,
                }}
              >
                <div style={{ fontSize: noteSize, fontWeight: 760, color: '#f6f8ff', textShadow: '0 2px 16px rgba(0,0,0,0.65)' }}>
                  {noteLine1}
                </div>
                <div style={{ position: 'relative', display: 'inline-block', marginTop: 6 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: -6,
                      top: '6%',
                      bottom: '4%',
                      width: `calc(${hl.toFixed(4)} * (100% + 12px))`,
                      background: copiedT > 0.5 ? '#6ee7b7' : '#7aaaff',
                      borderRadius: 5,
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      fontSize: noteSize,
                      fontWeight: 760,
                      color: hl > 0.55 ? '#07121a' : '#f6f8ff',
                    }}
                  >
                    {noteLine2}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      <Grain opacity={0.035} blend="soft-light" />
    </AbsoluteFill>
  );
};

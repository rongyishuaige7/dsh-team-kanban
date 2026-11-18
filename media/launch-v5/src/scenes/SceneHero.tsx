// S2: Spotlight Hero Card (177f) — faithful to demos/opening/spotlight-hero-card/SpotlightHeroCard.tsx
// Showcases full DSH desktop + auto-mounted right sidebar board + @4x Hero Card #4
// ([阻塞] · ↖ #2 #3 · ↘ 1 · ⚠ write-scope conflict) under CSS `zoom` 3D perspective (Q2 sharp text!).
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from '../lib/PageCam';
import { EASE, Grain, alpha, ramp } from '../lib/Polish';
import { DSH, FONTS } from '../tokens';
import layout from '../live-layout.json';

export const SCENE_HERO_DEFAULTS = {
  noteLine1: '原生血缘与瓶颈直出',
  noteLine2: '写冲突一眼锁定',
  noteSize: 30, // 30px * 2.38 zoom = 71.4px on 1080p screen (>> 56px Q11!)
  accent: DSH.brand,
  beamAccent: DSH.amber,
  duration: 177,
};

const PAGE_W = layout.appStep7.pageW;
const PAGE_H = layout.appStep7.pageH;
const CARD = layout.appStep7.card4; // { x: 793, y: 144, w: 356, h: 88 }
const MCX = CARD.x + CARD.w / 2;   // 971
const MCY = CARD.y + CARD.h / 2;   // 188
const RADIUS = 10;

// Beat-locked cues matching SpotlightHeroCard.tsx
const LOCK = 34;
const PUSH0 = 40;
const PUSH1 = 58;
const RISE0 = 56;
const RISE1 = 66;
const RESEAT0 = 126;
const LAND = 144; // -> 33 frames (1.1s) of completely locked stillness hold!

const PUSH_EASE = Easing.bezier(0.35, 0, 0.2, 1);
const POP_EASE = Easing.bezier(0.2, 1.25, 0.3, 1);
const RESEAT_EASE = Easing.bezier(0.4, 0, 0.3, 1.05);
const clampOpt = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const buildKeys = (duration: number): CamKey[] => [
  { frame: 0, cx: 960, cy: 520, zoom: 0.92, rotX: 0, rotY: 0, rotZ: 0, persp: 1280 },
  { frame: PUSH0, cx: 960, cy: 520, zoom: 0.92, rotX: 0, rotY: 0, rotZ: 0, persp: 1280 },
  { frame: PUSH1, cx: MCX - 116, cy: MCY + 34, zoom: 2.38, rotX: 6.5, rotY: 25, rotZ: 1.2, persp: 1280 },
  { frame: duration, cx: MCX - 116, cy: MCY + 34, zoom: 2.38, rotX: 6.5, rotY: 25, rotZ: 1.2, persp: 1280 },
];

// Deterministic studio dust inside volumetric spotlight cone
const CONE_DUST = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 397 + 91) % 1920,
  y0: (i * 523 + 170) % 1080,
  drift: 0.22 + (i % 4) * 0.08,
  size: 2.2 + (i % 4) * 1.1,
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

  // Smooth fade-in from Porcelain S1 & smooth release at end into C1 so ΔLuma stays gentle (<25)
  const sceneIntro = ramp(frame, 0, 8, EASE.out);
  const sceneOutroBrighten = ramp(frame, Math.max(150, duration - 10), 10, EASE.smooth);
  const dimFactor = sceneIntro * (1 - sceneOutroBrighten);

  // Theatre lamp switch-on: bright -> dip -> steady
  const lamp = interpolate(frame, [1, 3, 4, 6], [0.35, 1, 0.68, 1], clampOpt);

  // Spotlight wanders 3 stations (Conversation -> Header strip/mates -> Active lane -> Locks on Card #4!)
  const ST = [4, 10, 13, 19, 22, 28, LOCK, PUSH1];
  const spotX = interpolate(frame, ST, [26, 26, 78, 78, 68, 68, 50.5, 63], { ...clampOpt, easing: EASE.smooth });
  const spotY = interpolate(frame, ST, [34, 34, 12, 12, 32, 32, 21, 46], { ...clampOpt, easing: EASE.smooth });
  const poolBase = interpolate(frame, [22, LOCK, PUSH1], [430, 320, 490], { ...clampOpt, easing: EASE.swift });
  const pulse = interpolate(frame, [LOCK, LOCK + 4, LOCK + 10], [0, 0.06, 0], clampOpt);
  const breathe = 1 + 0.015 * Math.sin((frame - LAND) / 14) * ramp(frame, LAND, 20, EASE.out);
  const poolRx = poolBase * (1 + pulse) * breathe;
  const poolRy = poolBase * interpolate(frame, [PUSH0, PUSH1], [0.82, 0.94], clampOpt) * (1 + pulse) * breathe;

  // Outer theatre darkness (kept ~0.82 so surrounding DSH UI remains legible & frame luma stays healthy)
  const dark = interpolate(frame, [0, LOCK, PUSH1], [0.76, 0.82, 0.85], clampOpt) * dimFactor;
  const cardLight = ramp(frame, LOCK + 4, PUSH1 - LOCK - 4, EASE.smooth) * (1 - sceneOutroBrighten);
  const holdBreath = 1 + 0.012 * Math.sin((frame - LAND) / 14) * ramp(frame, LAND, 20, EASE.out);

  // Card rise -> hover bob -> reseat with micro-press
  const rise = interpolate(frame, [RISE0, RISE1], [0, 1], { ...clampOpt, easing: POP_EASE });
  const reseat = interpolate(frame, [RESEAT0, LAND], [0, 1], { ...clampOpt, easing: RESEAT_EASE });
  const lift = rise * (1 - reseat);
  const bob = Math.sin(((frame - RISE1) / 40) * Math.PI * 2) * 3.5 * lift;
  const z = 104 * lift + bob;
  const landed = frame >= LAND;
  const press = interpolate(frame, [LAND - 4, LAND - 1, LAND], [1, 0.996, 1], clampOpt);
  const shadow = `${(-10 * lift).toFixed(1)}px ${(12 * lift).toFixed(1)}px ${(14 + 14 * lift).toFixed(1)}px rgba(8,14,28,${(0.32 * lift).toFixed(3)}), ${(-34 * lift).toFixed(1)}px ${(46 * lift).toFixed(1)}px ${(84 * lift).toFixed(1)}px rgba(8,14,28,${(0.42 * lift).toFixed(3)})`;

  const slotVis = Math.min(1, rise * 2) * (1 - reseat);
  const landPulse = interpolate(frame, [LAND - 4, LAND, LAND + 14], [0, 1, 0], clampOpt);
  const slotEdge = Math.min(1, 0.45 * (1 - reseat)) + landPulse * 0.55;

  // 2-lap SVG perimeter scan beam (lap1 fast & bright Tech Blue, lap2 slower & amber-gold)
  const beam1Prog = interpolate(frame, [68, 82], [0, 1], { ...clampOpt, easing: EASE.linear });
  const beam1On = frame >= 67 && frame <= 83;
  const beam2Prog = interpolate(frame, [88, 108], [0, 1], { ...clampOpt, easing: EASE.swift });
  const beam2On = frame >= 87 && frame <= 109;
  const beamTrail = interpolate(frame, [108, 122], [0.42, 0], clampOpt);
  const bw = CARD.w + 6;
  const bh = CARD.h + 6;

  // 3D floating self-lit annotation on left of card (same 3D camera, drawn above dark mask!)
  const noteIn = ramp(frame, 70, 14, EASE.out) * (1 - sceneOutroBrighten);
  const noteSettle = interpolate(frame, [RESEAT0 - 4, LAND], [0, 1], { ...clampOpt, easing: RESEAT_EASE });
  const noteZ = 4 + (84 + Math.sin(((frame - 70) / 44) * Math.PI * 2) * 3) * (1 - noteSettle);
  const hl = ramp(frame, 84, 12, EASE.swift);

  // Volumetric cone from upper-right studio rig
  const px = (spotX / 100) * 1920;
  const py = (spotY / 100) * 1080;
  const sx = px + 400;
  const sy = -680;
  const coneW = poolRx * 0.58;
  const cone = `${sx - 26}px ${sy}px, ${sx + 26}px ${sy}px, ${px + coneW}px ${py}px, ${px - coneW}px ${py}px`;
  const c = camAt(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: '#dfe7f5' }}>
      <PageCam src={`${texDir}/app-step7-light.png`} pageW={PAGE_W} pageH={PAGE_H} keys={keys} ease={PUSH_EASE} bg="#ffffff">
        {/* Top porcelain extension pad so top edge never clips during 3D close-up */}
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

        {/* Page-space theatre mask with card-shaped soft aperture around Card #4 + header context glow */}
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
              <filter id="dsh-shc-tight" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="20" />
              </filter>
              <filter id="dsh-shc-wide" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="58" />
              </filter>
              <mask id="dsh-shc-hole" maskUnits="userSpaceOnUse" x={0} y={-360} width={PAGE_W} height={PAGE_H + 360}>
                <rect x={0} y={-360} width={PAGE_W} height={PAGE_H + 360} fill="white" />
                {/* Soft ambient spill revealing tab ring + header progress bar above Card #4 */}
                <rect
                  x={CARD.x - 40}
                  y={0}
                  width={CARD.w + 260}
                  height={CARD.y + CARD.h + 90}
                  rx={60}
                  fill="#4a4a4a"
                  filter="url(#dsh-shc-wide)"
                />
                {/* Crisp edge-to-edge aperture on Card #4 */}
                <rect
                  x={CARD.x - 14}
                  y={CARD.y - 14}
                  width={CARD.w + 28}
                  height={CARD.h + 28}
                  rx={RADIUS + 12}
                  fill="black"
                  filter="url(#dsh-shc-tight)"
                />
              </mask>
            </defs>
            <rect
              x={0}
              y={-360}
              width={PAGE_W}
              height={PAGE_H + 360}
              fill="rgb(11, 16, 30)"
              fillOpacity={Math.min(0.90, 0.84 * holdBreath)}
              mask="url(#dsh-shc-hole)"
            />
          </svg>
        ) : null}

        <div style={{ transformStyle: 'preserve-3d' }}>
          {/* Recessed slot patch left behind when Card #4 lifts */}
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
                  border: `1.5px solid ${accent}`,
                  opacity: slotEdge,
                  boxShadow: landPulse > 0.02 ? `0 0 ${(24 * landPulse).toFixed(1)}px ${alpha(accent, 0.85)}` : undefined,
                }}
              />
            </div>
          ) : null}

          {/* Levitating @4x Hero Card #4 */}
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
                src={staticFile(`${texDir}/card4-hero-4x.png`)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  display: 'block',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(200deg, rgba(255,255,255,0.28), rgba(255,255,255,0) 45%, rgba(12,24,54,0.05) 100%)',
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
                boxShadow: `inset 0 0 0 1px rgba(255,255,255,${(0.8 * lift).toFixed(3)}), 0 0 0 1.5px rgba(122,170,255,${(0.75 * cardLight).toFixed(3)}), 0 0 40px rgba(65,118,230,${(0.22 * cardLight).toFixed(3)})`,
                pointerEvents: 'none',
              }}
            />

            {/* 2-lap perimeter scan beam (Q4: strictly once on the single hero card) */}
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
                  opacity: beam1On ? 1 : 0.72,
                  filter: `drop-shadow(0 0 6px ${alpha(beam1On ? accent : beamAccent, 0.9)}) drop-shadow(0 0 16px rgba(190,215,255,0.6))`,
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
                  strokeWidth={beam1On ? 3.2 : 2.4}
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
                  strokeWidth={beam1On ? 1.5 : 1.1}
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
                  border: `1.5px solid ${accent}`,
                  opacity: beamTrail,
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </div>
        </div>
      </PageCam>

      {/* Screen-space searching spotlight pool (crossfades into page-space cardLight on lock) */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(${(poolRx * 1.35).toFixed(1)}px ${(poolRy * 1.35).toFixed(1)}px at ${spotX.toFixed(2)}% ${spotY.toFixed(2)}%, rgba(11,16,30,0) 0%, rgba(11,16,30,0) 28%, rgba(11,16,30,${(dark * 0.28).toFixed(3)}) 46%, rgba(11,16,30,${(dark * 0.65).toFixed(3)}) 66%, rgba(11,16,30,${dark.toFixed(3)}) 100%)`,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          opacity: lamp * (1 - cardLight),
        }}
      />

      {/* Volumetric cool-white spotlight cone + deterministic dust */}
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
              background: `linear-gradient(${((Math.atan2(py - sy, px - sx) * 180) / Math.PI - 90).toFixed(1)}deg, rgba(226,238,255,0.34) 0%, rgba(190,214,255,0.16) 60%, rgba(190,214,255,0.05) 100%)`,
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
                  opacity: 0.45 * tw,
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
              {/* Soft dark scrim stopping at x=772 (< CARD.x=793 so zero dark wedge on card!) */}
              <div
                style={{
                  position: 'absolute',
                  left: 448,
                  top: 108,
                  width: 320,
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
                  left: 486,
                  top: 146,
                  width: 'max-content',
                  whiteSpace: 'nowrap',
                  transform: `translateZ(${noteZ.toFixed(2)}px) translateY(${((1 - noteIn) * 18).toFixed(2)}px)`,
                  opacity: noteIn,
                  filter: noteIn < 0.995 ? `blur(${((1 - noteIn) * 4).toFixed(2)}px)` : undefined,
                  fontFamily: FONTS.sans,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.22,
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
                      background: '#7aaaff',
                      borderRadius: 5,
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      fontSize: noteSize,
                      fontWeight: 760,
                      color: hl > 0.55 ? '#0b1020' : '#f6f8ff',
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

      <Grain opacity={0.045} blend="soft-light" />
    </AbsoluteFill>
  );
};

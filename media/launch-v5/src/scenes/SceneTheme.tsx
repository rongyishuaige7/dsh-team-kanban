// S4: Theme Sweep Toggle + 360px Narrow @container Parity (177f)
// Faithful to demos/interaction/theme-switch-moves/ThemeSweepToggle.tsx:
// Close-up on top-right Day/Night switch (zoom 1.95) -> pointer clicks on beat 41 (f15), knob springs right &
// Sun morphs to Moon -> 15° diagonal terminator sweeps right-to-left (over-sweeping +-400px) across pixel-identical
// real Light/Dark @2x captures of BOTH the wide 3-column board AND the 360px narrow quiet-lane container ->
// camera pulls back by f44 for the half-Day/half-Night poster frame -> Dark rim lights turn on -> Day unmounts!
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { DSH, FONTS, KanbanMark } from '../tokens';
import { EASE, Grain, alpha, bezier, mix, ramp, springAt, velocity } from '../lib/Polish';

export const SCENE_THEME_DEFAULTS = {
  wideLabel: '宽屏三列 · ≥820px @container',
  narrowLabel: '360px 窄栏 · 空列静默折叠',
  accentLight: DSH.brand,
  accentDark: DSH.brandDark,
  duration: 177,
};

const PTR_IN = 0;
const CLICK = 15;   // Beat 41!
const SWEEP0 = 20;
const SWEEP1 = 88;  // 68f sweep
const CAM0 = 12;
const CAM1 = 44;    // Full overview reached BEFORE terminator crosses x=960 (~f52) -> Day/Night poster frame!
const LIGHTS = 85;

const TOG = { w: 132, h: 64 };
const TOG_X = 1812 - TOG.w;
const TOG_Y = 42;
const TOG_C = { x: TOG_X + TOG.w / 2, y: TOG_Y + TOG.h / 2 };
const T15 = Math.tan((15 * Math.PI) / 180);
const SWEEP_EASE = bezier(0.3, 0, 0.35, 1);

const hash = (n: number) => {
  const x = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return x - Math.floor(x);
};

const SunMoon: React.FC<{ p: number; color: string; size: number }> = ({ p, color, size }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const rays = 1 - EASE.out(Math.min(1, p * 1.6));
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <mask id={`sm${id}`}>
          <rect x={-10} y={-10} width={60} height={60} fill="#fff" />
          <circle cx={mix(44, 27, EASE.snappy(p))} cy={mix(-4, 13, EASE.snappy(p))} r={10.5} fill="#000" />
        </mask>
      </defs>
      <g transform={`rotate(${(p * 90).toFixed(2)} 20 20)`}>
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={i}
            x1={20}
            y1={4.5 - (1 - rays) * 4}
            x2={20}
            y2={8.5 - (1 - rays) * 6}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={rays}
            transform={`rotate(${i * 45} 20 20)`}
          />
        ))}
      </g>
      <circle cx={20} cy={20} r={mix(7.5, 11, EASE.out(p))} fill={color} mask={`url(#sm${id})`} />
    </svg>
  );
};

const Pointer: React.FC<{ x: number; y: number; s: number; o: number }> = ({ x, y, s, o }) => (
  <svg
    width={34}
    height={34}
    viewBox="0 0 28 28"
    style={{
      position: 'absolute',
      left: x - 2,
      top: y - 1,
      opacity: o,
      overflow: 'visible',
      transformOrigin: '2px 1px',
      transform: `scale(${s.toFixed(3)})`,
      filter: 'drop-shadow(0 2px 2px rgba(10,14,24,0.38)) drop-shadow(0 6px 10px rgba(10,14,24,0.28))',
    }}
  >
    <path
      d="M2 1 L2 23 L8 17.5 L11.5 25 L15.5 23.2 L12 15.8 L20 15 Z"
      fill="#12151e"
      stroke="#ffffff"
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  </svg>
);

const World: React.FC<{
  night: boolean;
  knob: number;
  icon: number;
  lights: number;
  frame: number;
  wideLabel: string;
  narrowLabel: string;
  accentLight: string;
  accentDark: string;
  texDir: string;
}> = ({ night, knob, icon, lights, frame, wideLabel, narrowLabel, accentLight, accentDark, texDir }) => {
  const accent = night ? accentDark : accentLight;
  const ink = night ? DSH.darkInk : DSH.ink;
  const ink2 = night ? DSH.darkInk2 : DSH.ink2;
  const rimLit = night ? EASE.out(Math.min(1, Math.max(0, lights * 1.8))) : 0;

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONTS.sans }}>
      {/* Extended stage (-320px pad so 1.95x close-up on top-right switch never exposes empty margin) */}
      <div
        style={{
          position: 'absolute',
          inset: -320,
          background: night
            ? 'linear-gradient(180deg, #101422 0%, #0b0e18 55%, #070910 100%)'
            : 'linear-gradient(180deg, #f5f8fd 0%, #edf2fb 55%, #e2eaf6 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -320,
          background: night
            ? 'radial-gradient(ellipse 60% 60% at 82% 8%, rgba(122,170,255,0.20) 0%, rgba(122,170,255,0) 70%)'
            : 'radial-gradient(ellipse 62% 62% at 22% 6%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0) 70%)',
        }}
      />

      {night && (
        <div style={{ position: 'absolute', inset: -260, pointerEvents: 'none' }}>
          {Array.from({ length: 48 }, (_, i) => {
            const x = hash(i * 3.1) * 2440;
            const y = hash(i * 7.7 + 2) * 1600;
            const z = hash(i * 1.9 + 5);
            const tw = 0.55 + 0.45 * Math.sin(frame / (10 + z * 14) + i * 1.7);
            const s = 1.4 + z * 2.1;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: s,
                  height: s,
                  borderRadius: '50%',
                  background: '#dce7ff',
                  opacity: (0.18 + 0.42 * z) * tw,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Top Showcase Header + Day/Night Switch */}
      <div
        style={{
          position: 'absolute',
          left: 108,
          right: 108,
          top: 38,
          height: 72,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <KanbanMark size={48} tone={night ? 'dark' : 'light'} />
        <span style={{ marginLeft: 16, fontSize: 34, fontWeight: 740, color: ink, letterSpacing: '-0.02em' }}>
          dsh-team-kanban
        </span>
        <span
          style={{
            marginLeft: 18,
            padding: '6px 16px',
            borderRadius: 999,
            background: night ? 'rgba(122,170,255,0.14)' : DSH.brandSoft,
            color: accent,
            fontFamily: FONTS.mono,
            fontSize: 32,
            fontWeight: 650,
          }}
        >
          {night ? 'DARK · --dsw-alias-*' : 'LIGHT · --dsw-alias-*'}
        </span>
      </div>

      {/* Day/Night Toggle Switch */}
      <div
        style={{
          position: 'absolute',
          left: TOG_X,
          top: TOG_Y,
          width: TOG.w,
          height: TOG.h,
          borderRadius: TOG.h / 2,
          background: night
            ? '#23293d'
            : `linear-gradient(90deg, #23293d 0%, #23293d ${(knob * 100).toFixed(1)}%, #dce4f2 ${(knob * 100).toFixed(1)}%)`,
          boxShadow: night
            ? `inset 0 2px 4px rgba(0,0,0,0.48), 0 0 0 1.5px rgba(122,170,255,${(0.2 + 0.35 * rimLit).toFixed(3)})`
            : 'inset 0 2px 4px rgba(15,25,50,0.12), 0 0 0 1px rgba(15,25,50,0.08)',
          overflow: 'hidden',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 18 + i * 13,
              top: 18 + (i % 2) * 16,
              width: 4,
              height: 4,
              borderRadius: 2,
              background: '#e8edff',
              opacity: Math.min(1, Math.max(0, knob * 1.4 - 0.3)) * (0.5 + 0.2 * i),
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6 + knob * (TOG.w - TOG.h),
            width: TOG.h - 12,
            height: TOG.h - 12,
            borderRadius: '50%',
            background: night ? 'linear-gradient(180deg, #ffffff, #eef2ff)' : '#ffffff',
            boxShadow: '0 2px 5px rgba(0,0,0,0.22), 0 6px 14px -4px rgba(0,0,0,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SunMoon p={icon} color={icon > 0.5 ? '#36446e' : '#e6931f'} size={32} />
        </div>
      </div>

      {/* LEFT PANEL: Wide 3-Column Board (Real @2x Light/Dark screenshot, pixel-identical!) */}
      <div
        style={{
          position: 'absolute',
          left: 108,
          top: 132,
          width: 1244,
          height: 786,
          borderRadius: 20,
          overflow: 'hidden',
          background: night ? DSH.darkSurface : DSH.surface,
          boxShadow: night
            ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1.5px rgba(122,170,255,${(0.14 + 0.28 * rimLit).toFixed(3)}), 0 0 ${(52 * rimLit).toFixed(1)}px rgba(90,135,255,${(0.22 * rimLit).toFixed(3)}), 0 36px 84px -20px rgba(0,2,8,0.88)`
            : 'inset 0 1px 0 #ffffff, 0 0 0 1px rgba(15,17,21,0.08), 0 36px 84px -22px rgba(12,24,54,0.20)',
        }}
      >
        <div
          style={{
            height: 54,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${night ? DSH.darkLine : DSH.line}`,
            background: night ? '#1b1d24' : '#f7f9fc',
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 680, color: ink }}>{wideLabel}</span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 32, fontWeight: 600, color: ink2 }}>3 LANES</span>
        </div>
        {/* Crop directly onto the right-sidebar 3-column board (x=780..1920 -> 1140px scaled 1.09x to 1244px) */}
        <div style={{ position: 'relative', width: 1244, height: 732, overflow: 'hidden' }}>
          <Img
            src={staticFile(night ? `${texDir}/app-step7-dark.png` : `${texDir}/app-step7-light.png`)}
            style={{
              position: 'absolute',
              left: -851, // -780 * (1244 / 1140)
              top: 0,
              width: 2095, // 1920 * (1244 / 1140)
              height: 1178,
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* RIGHT PANEL: Strict 360px Narrow @container Board (Empty lane quiet 30px + pinned capsule!) */}
      <div
        style={{
          position: 'absolute',
          left: 1384,
          top: 132,
          width: 428,
          height: 786,
          borderRadius: 20,
          overflow: 'hidden',
          background: night ? DSH.darkSurface : DSH.surface,
          boxShadow: night
            ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1.5px rgba(34,197,94,${(0.18 + 0.34 * rimLit).toFixed(3)}), 0 0 ${(44 * rimLit).toFixed(1)}px rgba(34,197,94,${(0.18 * rimLit).toFixed(3)}), 0 36px 84px -20px rgba(0,2,8,0.88)`
            : 'inset 0 1px 0 #ffffff, 0 0 0 1px rgba(15,17,21,0.08), 0 36px 84px -22px rgba(12,24,54,0.20)',
        }}
      >
        <div
          style={{
            height: 54,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${night ? DSH.darkLine : DSH.line}`,
            background: night ? '#1b1d24' : '#f7f9fc',
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 680, color: night ? '#6ee7b7' : DSH.emeraldInk }}>{narrowLabel}</span>
        </div>
        <div style={{ padding: '12px 34px', display: 'flex', justifyContent: 'center' }}>
          <Img
            src={staticFile(night ? `${texDir}/narrow-360-dark.png` : `${texDir}/narrow-360-light.png`)}
            style={{
              width: 360,
              height: 710,
              objectFit: 'cover',
              objectPosition: 'center top',
              borderRadius: 10,
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export type SceneThemeProps = Partial<typeof SCENE_THEME_DEFAULTS> & {
  texDir?: string;
};

export const SceneTheme: React.FC<SceneThemeProps> = ({
  wideLabel = SCENE_THEME_DEFAULTS.wideLabel,
  narrowLabel = SCENE_THEME_DEFAULTS.narrowLabel,
  accentLight = SCENE_THEME_DEFAULTS.accentLight,
  accentDark = SCENE_THEME_DEFAULTS.accentDark,
  duration = SCENE_THEME_DEFAULTS.duration,
  texDir = 'textures',
}) => {
  const frame = useCurrentFrame();

  // Camera: close-up on top-right Day/Night switch -> pull back to full dual-form overview -> subtle hold breath
  const camT = ramp(frame, CAM0, CAM1 - CAM0, EASE.smooth);
  const pre = ramp(frame, 0, CAM0, EASE.linear);
  const hold = ramp(frame, CAM1, Math.max(20, duration - CAM1 - 12), EASE.swift);
  const z = mix(1.95 + 0.03 * pre, 1.0, camT) + 0.014 * hold;
  const cx = mix(TOG_C.x - 280, 960, camT);
  const cy = mix(TOG_C.y + 150, 540, camT);

  // Use CSS zoom for crisp layout rasterization during the 1.95x switch close-up!
  const camStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1920,
    height: 1080,
    zoom: z,
    transform: `translate(${(960 / z - cx).toFixed(2)}px, ${(540 / z - cy).toFixed(2)}px)`,
    transformOrigin: '0 0',
  };

  const knob = frame < CLICK ? 0 : springAt(frame, CLICK, { damping: 16, stiffness: 210 });
  const icon = ramp(frame, CLICK + 1, 12, EASE.out);

  // Pointer glides in -> clicks -> steps aside
  const ptrT = ramp(frame, PTR_IN, CLICK - PTR_IN, EASE.out);
  const away = ramp(frame, CLICK + 6, 16, EASE.swift);
  const ptrX = mix(TOG_C.x + 130, TOG_C.x + 16, ptrT) + 55 * away;
  const ptrY = mix(TOG_C.y + 110, TOG_C.y + 8, ptrT) + Math.sin(ptrT * Math.PI) * 10 + 68 * away;
  const press = frame < CLICK - 1 ? 1 : mix(0.86, 1, ramp(frame, CLICK + 1, 6, EASE.out));
  const ptrO = 1 - ramp(frame, 26, 10, EASE.exit);

  // 15° diagonal terminator sweep (over-sweeping +-400px so zero corner triangles remain!)
  const pAt = (f: number) => mix(1960, -480, ramp(f, SWEEP0, SWEEP1 - SWEEP0, SWEEP_EASE));
  const p = pAt(frame);
  const v = Math.abs(velocity(pAt, frame));
  const streak = Math.min(1, v / 110);
  const sweeping = frame >= SWEEP0 && frame < SWEEP1;
  const night = frame >= SWEEP0;
  const dayGone = frame >= SWEEP1;
  const nightClip = dayGone
    ? 'none'
    : `polygon(${p - 400 * T15}px -400px, 2400px -400px, 2400px 1500px, ${p + 1500 * T15}px 1500px)`;
  const edgeO = ramp(frame, SWEEP0, 3, EASE.linear) * (1 - ramp(frame, SWEEP1 - 8, 8, EASE.linear));

  const lights = ramp(frame, LIGHTS, 22, EASE.linear);
  const xc = p + 540 * T15;
  const duskW = 68 + 160 * streak;
  const coolW = 64 + 145 * streak;

  // Smooth 10f porcelain handoff curtain at the very end so S4->S5 transition has gentle ΔLuma (<22/frame)
  const handoff = ramp(frame, Math.max(120, duration - 12), 12, EASE.smooth);

  return (
    <AbsoluteFill style={{ background: '#070910', overflow: 'hidden' }}>
      <div style={camStyle}>
        {!dayGone && (
          <World
            night={false}
            knob={knob}
            icon={icon}
            lights={0}
            frame={frame}
            wideLabel={wideLabel}
            narrowLabel={narrowLabel}
            accentLight={accentLight}
            accentDark={accentDark}
            texDir={texDir}
          />
        )}
        {night && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, clipPath: dayGone ? undefined : nightClip }}>
            <World
              night={true}
              knob={knob}
              icon={icon}
              lights={lights}
              frame={frame}
              wideLabel={wideLabel}
              narrowLabel={narrowLabel}
              accentLight={accentLight}
              accentDark={accentDark}
              texDir={texDir}
            />
          </div>
        )}

        {/* Terminator line: white-hot core + sunset dusk band on Day side + DeepSeek blue glow on Night side */}
        {sweeping && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, pointerEvents: 'none', opacity: edgeO }}>
            <div
              style={{
                position: 'absolute',
                left: xc - duskW,
                top: 540 - 1100,
                width: duskW,
                height: 2200,
                transformOrigin: '100% 50%',
                transform: 'rotate(-15deg)',
                background: `linear-gradient(90deg, rgba(255,156,76,0) 0%, rgba(255,156,76,${(0.06 + 0.08 * streak).toFixed(3)}) 60%, rgba(255,134,58,${(0.20 + 0.12 * streak).toFixed(3)}) 94%, rgba(30,24,40,0.22) 100%)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: xc,
                top: 540 - 1100,
                width: coolW,
                height: 2200,
                transformOrigin: '0% 50%',
                transform: 'rotate(-15deg)',
                background: `linear-gradient(90deg, rgba(122,170,255,${(0.28 + 0.10 * streak).toFixed(3)}) 0%, rgba(65,118,230,0.12) 32%, rgba(65,118,230,0) 100%)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: xc - 1.5,
                top: 540 - 1100,
                width: 3,
                height: 2200,
                transformOrigin: '50% 50%',
                transform: 'rotate(-15deg)',
                background: '#fffdf8',
                boxShadow: '0 0 8px 1px rgba(220,235,255,0.92), 0 0 26px 4px rgba(122,170,255,0.58)',
              }}
            />
          </div>
        )}

        {ptrO > 0.01 && <Pointer x={ptrX} y={ptrY} s={1.15 * press} o={ptrO} />}
      </div>

      {handoff > 0.002 && (
        <AbsoluteFill style={{ background: DSH.stageMid, opacity: handoff, pointerEvents: 'none' }} />
      )}
      <Grain opacity={0.045} blend="overlay" />
    </AbsoluteFill>
  );
};

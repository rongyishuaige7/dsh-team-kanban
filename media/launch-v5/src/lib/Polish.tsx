import React from 'react';
import { spring, useCurrentFrame } from 'remotion';
import { FONTS } from '../tokens';

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  if (x1 === y1 && x2 === y2) return (t: number) => clamp01(t);
  const ax = 1 - 3 * x2 + 3 * x1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 1 - 3 * y2 + 3 * y1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  const solve = (x: number) => {
    let u = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(u) - x;
      if (Math.abs(err) < 1e-7) return u;
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0, hi = 1;
    u = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(u);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = u; else hi = u;
      u = (lo + hi) / 2;
    }
    return u;
  };
  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : sy(solve(t)));
};

export const EASE = {
  snappy: bezier(0.16, 1, 0.3, 1),
  out: bezier(0.22, 1, 0.36, 1),
  smooth: bezier(0.65, 0, 0.35, 1),
  swift: bezier(0.4, 0, 0.2, 1),
  exit: bezier(0.7, 0, 0.84, 0),
  overshoot: bezier(0.34, 1.45, 0.64, 1),
  linear: (t: number) => clamp01(t),
};

export const ramp = (frame: number, start: number, dur: number, ease: (t: number) => number = EASE.snappy) =>
  ease(clamp01((frame - start) / Math.max(1e-6, dur)));

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const velocity = (f: (frame: number) => number, frame: number) => f(frame + 0.5) - f(frame - 0.5);

export const springAt = (frame: number, start: number, opts: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({ frame: frame - start, fps: 30, config: { damping: opts.damping ?? 18, stiffness: opts.stiffness ?? 170, mass: opts.mass ?? 1 } });

export const rgbOf = (hex: string) => {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(f, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

export const alpha = (hex: string, a: number) => `rgba(${rgbOf(hex)},${a.toFixed(4)})`;

export const softShadow = (elevation: number, opts: { color?: string; strength?: number } = {}) => {
  const e = Math.max(0, elevation);
  const c = rgbOf(opts.color ?? '#0c1836');
  const s = opts.strength ?? 1;
  const contactA = (0.11 * s) / (1 + e / 24);
  const ambientA = (0.08 + (Math.min(e, 64) / 64) * 0.20) * s;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return `0 ${r1(0.5 + e * 0.06)}px ${r1(1 + e * 0.18)}px rgba(${c},${contactA.toFixed(3)}), ` +
    `0 ${r1(e * 0.55)}px ${r1(e * 1.3)}px ${r1(-e * 0.22)}px rgba(${c},${ambientA.toFixed(3)})`;
};

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const grainCache = new Map<string, string>();
const grainTile = (variant: number, tile: number, freq: number) => {
  const key = `${variant}|${tile}|${freq}`;
  const hit = grainCache.get(key);
  if (hit) return hit;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'>` +
    `<filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' seed='${variant * 17 + 3}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1'/>` +
    `<feComponentTransfer><feFuncR type='linear' slope='2.4' intercept='-0.7'/><feFuncG type='linear' slope='2.4' intercept='-0.7'/>` +
    `<feFuncB type='linear' slope='2.4' intercept='-0.7'/></feComponentTransfer></filter>` +
    `<rect width='100%' height='100%' filter='url(#g)'/></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  grainCache.set(key, url);
  return url;
};

export const Grain: React.FC<{
  opacity?: number;
  step?: number;
  scale?: number;
  freq?: number;
  blend?: React.CSSProperties['mixBlendMode'];
}> = ({ opacity = 0.04, step = 2, scale = 1, freq = 0.85, blend = 'overlay' }) => {
  const frame = useCurrentFrame();
  const k = Math.floor(frame / Math.max(1, step));
  const tile = 256;
  const ox = Math.floor(hash(k * 3 + 1) * tile);
  const oy = Math.floor(hash(k * 7 + 2) * tile);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        mixBlendMode: blend,
        backgroundImage: grainTile(k % 6, tile, freq),
        backgroundSize: `${tile * scale}px ${tile * scale}px`,
        backgroundPosition: `${ox}px ${oy}px`,
      }}
    />
  );
};

export const SpeedBlur: React.FC<{
  vx: number;
  vy?: number;
  amount?: number;
  max?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ vx, vy = 0, amount = 0.3, max = 28, children, style }) => {
  const rid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const speed = Math.hypot(vx, vy);
  const sd = Math.min(max, speed * amount);
  const fill: React.CSSProperties = { position: 'absolute', inset: 0 };
  if (sd < 0.35) return <div style={{ ...fill, ...style }}>{children}</div>;
  const deg = (Math.atan2(vy, vx) * 180) / Math.PI;
  const id = `speedblur-${rid}`;
  return (
    <div style={{ ...fill, ...style }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${sd.toFixed(2)} 0`} edgeMode="none" />
        </filter>
      </svg>
      <div style={{ ...fill, transform: `rotate(${deg}deg)`, filter: `url(#${id})` }}>
        <div style={{ ...fill, transform: `rotate(${-deg}deg)` }}>{children}</div>
      </div>
    </div>
  );
};

// Shared DSH Porcelain / Dark Studio Backdrop
export const StudioBackdrop: React.FC<{ dark?: boolean; dots?: boolean }> = ({
  dark = false,
  dots = true,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      fontFamily: FONTS.sans,
      background: dark
        ? 'linear-gradient(180deg, #101420 0%, #0b0e17 54%, #070910 100%)'
        : 'linear-gradient(180deg, #f5f8fd 0%, #edf2fb 54%, #e3ebf7 100%)',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: dark
          ? 'radial-gradient(ellipse 62% 60% at 30% 10%, rgba(122,170,255,0.14) 0%, rgba(122,170,255,0) 70%), radial-gradient(ellipse 50% 48% at 86% 88%, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0) 72%)'
          : 'radial-gradient(ellipse 64% 66% at 30% 10%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0) 70%), radial-gradient(ellipse 52% 48% at 86% 88%, rgba(65,118,230,0.09) 0%, rgba(65,118,230,0) 72%)',
      }}
    />
    {dots && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: dark
            ? 'radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 2px)'
            : 'radial-gradient(circle, rgba(15,17,21,0.085) 1.5px, transparent 2px)',
          backgroundSize: '36px 36px',
          WebkitMaskImage: 'radial-gradient(ellipse 68% 64% at 50% 48%, #000 32%, transparent 88%)',
          maskImage: 'radial-gradient(ellipse 68% 64% at 50% 48%, #000 32%, transparent 88%)',
        }}
      />
    )}
  </div>
);

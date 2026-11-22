import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';

export type CamKey = {
  frame: number;
  cx: number;
  cy: number;
  zoom: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  persp?: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 2.5D camera over a 2x full-page screenshot using CSS `zoom` (layout-scale
 * rasterization per aesthetic-rules.md Q2 so text stays razor-sharp under 3D tilt).
 */
export const PageCam: React.FC<{
  src: string;
  pageW?: number;
  pageH: number;
  keys: CamKey[];
  children?: React.ReactNode;
  blur?: number;
  saturate?: number;
  bg?: string;
  ease?: (t: number) => number;
  frame?: number;
}> = ({
  src,
  pageW = 1920,
  pageH,
  keys,
  children,
  blur = 0,
  saturate = 1,
  bg = '#edf2fb',
  ease = Easing.bezier(0.33, 0, 0.15, 1),
  frame: frameProp,
}) => {
  const ownFrame = useCurrentFrame();
  const frame = frameProp ?? ownFrame;
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (frame >= keys[i].frame && frame <= keys[i + 1].frame) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const t = a.frame === b.frame
    ? 1
    : interpolate(frame, [a.frame, b.frame], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: ease,
      });
  const cx = lerp(a.cx, b.cx, t);
  const cy = lerp(a.cy, b.cy, t);
  const zoom = lerp(a.zoom, b.zoom, t);

  const filters: string[] = [];
  if (blur > 0) filters.push(`blur(${blur.toFixed(2)}px)`);
  if (saturate !== 1) filters.push(`saturate(${saturate.toFixed(3)})`);

  const has3D = keys.some(
    (k) => k.rotX !== undefined || k.rotY !== undefined || k.rotZ !== undefined || k.persp !== undefined,
  );

  if (!has3D) {
    return (
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: bg }}>
        <div
          style={{
            position: 'absolute',
            width: pageW,
            height: pageH,
            zoom,
            transform: `translate(${960 / zoom - cx}px, ${540 / zoom - cy}px)`,
            transformOrigin: '0 0',
            filter: filters.length ? filters.join(' ') : undefined,
          }}
        >
          <Img src={staticFile(src)} style={{ position: 'absolute', width: pageW, height: pageH }} />
          {children}
        </div>
      </AbsoluteFill>
    );
  }

  const rotX = lerp(a.rotX ?? 0, b.rotX ?? 0, t);
  const rotY = lerp(a.rotY ?? 0, b.rotY ?? 0, t);
  const rotZ = lerp(a.rotZ ?? 0, b.rotZ ?? 0, t);
  const persp = lerp(a.persp ?? 1400, b.persp ?? 1400, t);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: bg }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          perspective: `${persp * zoom}px`,
          perspectiveOrigin: '960px 540px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: pageW,
            height: pageH,
            zoom,
            transform: `translate(${960 / zoom - cx}px, ${540 / zoom - cy}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transformStyle: 'preserve-3d',
            filter: filters.length ? filters.join(' ') : undefined,
          }}
        >
          <Img src={staticFile(src)} style={{ position: 'absolute', width: pageW, height: pageH }} />
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};

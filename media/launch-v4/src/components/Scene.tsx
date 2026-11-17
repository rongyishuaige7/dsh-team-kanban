import React from 'react';
import { OffthreadVideo, staticFile } from 'remotion';

export const PAGE_W = 1440;
export const PAGE_H = 760;

export type CamState = { cx: number; cy: number; zoom: number; rotY?: number; rotX?: number; rotZ?: number };

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const camLerp = (a: CamState, b: CamState, t: number): CamState => ({
  cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), zoom: lerp(a.zoom, b.zoom, t),
  rotY: lerp(a.rotY ?? 0, b.rotY ?? 0, t), rotX: lerp(a.rotX ?? 0, b.rotX ?? 0, t), rotZ: lerp(a.rotZ ?? 0, b.rotZ ?? 0, t),
});

export const Scene: React.FC<{
  src: string;
  cam: CamState;
  rate?: number;
  startFrom?: number;
  radius?: number;
  shadow?: boolean;
  vw?: number;
  vh?: number;
  children?: React.ReactNode;
}> = ({ src, cam, rate = 1, startFrom = 0, radius = 0, shadow = false, vw = 1920, vh = 1080, children }) => {
  const { cx, cy, zoom, rotY = 0, rotX = 0, rotZ = 0 } = cam;
  return (
    <div style={{ position: 'absolute', inset: 0, perspective: 2800, perspectiveOrigin: '50% 46%' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE_H,
        transformOrigin: `${PAGE_W / 2}px ${PAGE_H / 2}px`,
        transform: `rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE_H, transformOrigin: '0 0',
          transform: `translate(${vw / 2 - cx * zoom}px, ${vh / 2 - cy * zoom}px) scale(${zoom})`,
          borderRadius: radius, overflow: 'hidden',
          boxShadow: shadow ? '0 44px 130px rgba(16,24,40,.26), 0 10px 32px rgba(16,24,40,.09)' : 'none',
          background: '#fff',
        }}>
          <OffthreadVideo src={staticFile(src)} startFrom={startFrom} playbackRate={rate} muted
            style={{ width: PAGE_W, height: PAGE_H, display: 'block' }} />
          {children}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
export const Scrim: React.FC<{ height?: number; color?: string; dark?: boolean }> = ({ height = 360, color = '#ffffff', dark = false }) => {
  const c = dark ? '12,15,20' : (color === '#ffffff' ? '255,255,255' : color);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height,
      background: `linear-gradient(to top, rgba(${c},${dark ? 0.94 : 0.97}) 0%, rgba(${c},${dark ? 0.88 : 0.92}) 42%, rgba(${c},0) 100%)`,
      pointerEvents: 'none' }} />
  );
};

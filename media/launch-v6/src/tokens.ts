import React from 'react';

// DeepSeek Harness (--dsw-alias-*) aligned design tokens for dsh-team-kanban v0.5.7
export const DSH = {
  stageTop: '#f5f8fd',
  stageMid: '#edf2fb',
  stageBtm: '#e3ebf7',
  darkStageTop: '#101420',
  darkStageMid: '#0b0e17',
  darkStageBtm: '#070910',

  surface: '#ffffff',
  surface2: '#f4f6fa',
  darkSurface: '#151517',
  darkSurface2: '#212123',

  line: 'rgba(15, 17, 21, 0.08)',
  darkLine: 'rgba(255, 255, 255, 0.09)',

  ink: '#0f1115',
  ink2: '#61666b',
  ink3: '#81858c',
  darkInk: '#f5f6f8',
  darkInk2: '#a1a6b0',
  darkInk3: '#68707d',

  brand: '#4176e6',
  brandDark: '#7aaaff',
  brandSoft: '#e4edfd',
  emerald: '#22c55e',
  emeraldInk: '#15803d',
  amber: '#dd8629',
  crimson: '#ec1313',

  shadow: '#0c1836',
} as const;

export const FONTS = {
  sans: '-apple-system, BlinkMacSystemFont, "PingFang SC", "SF Pro Display", "Helvetica Neue", Inter, sans-serif',
  mono: '"SF Mono", ui-monospace, Menlo, Monaco, monospace',
} as const;

// Clean geometric 3-column kanban + DAG mark matching icon.svg (pure TS via createElement)
export const KanbanMark: React.FC<{ size?: number; tone?: 'light' | 'dark' }> = ({
  size = 64,
  tone = 'light',
}) => {
  const bg = tone === 'dark' ? '#1c2233' : '#e8effd';
  const stroke = tone === 'dark' ? DSH.brandDark : DSH.brand;
  const ink = tone === 'dark' ? '#f5f6f8' : '#0f1115';
  return React.createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 64 64', fill: 'none', style: { display: 'block', flex: 'none' } },
    React.createElement('rect', { x: 4, y: 4, width: 56, height: 56, rx: 15, fill: bg, stroke, strokeOpacity: 0.28, strokeWidth: 2 }),
    React.createElement('rect', { x: 13, y: 15, width: 10, height: 34, rx: 3.5, fill: ink, fillOpacity: 0.14 }),
    React.createElement('rect', { x: 27, y: 15, width: 10, height: 24, rx: 3.5, fill: stroke }),
    React.createElement('rect', { x: 41, y: 15, width: 10, height: 16, rx: 3.5, fill: DSH.emerald }),
    React.createElement('path', { d: 'M18 33 C23 33, 23 26, 27 26', stroke, strokeWidth: 2.5, strokeLinecap: 'round' }),
    React.createElement('circle', { cx: 46, cy: 42, r: 5, stroke: DSH.emerald, strokeWidth: 2.6 }),
  );
};

import { FPS, OUTPUT_AUDIO_OFFSET_SEC, SHOTS } from './timeline';

// Measured 10ms RMS attack peaks @ 30fps (recorded in analysis/sfx_peaks.json)
// Pipeline measurement record (sound-design.md §4.6 & final-review.md A9):
// - Engine: Remotion 4.0.484 · Renderer: Chromium Headless + ANGLE · Mux/Codec: FFmpeg 7.1 AAC 48kHz MP4
// - Probe: Normalized cross-correlation on rendered audio wav vs source `house-vibez.mp3` (verified post-render)
// - Date: 2026-11-17
export const OUTPUT_AUDIO_OFFSET_F = OUTPUT_AUDIO_OFFSET_SEC * FPS;

export const PEAK_F: Record<string, number> = {
  'air-whoosh-powerful.mp3': 7,
  'air-woosh-deep.mp3': 15,
  'click-camera.mp3': 6,
  'impact-deep-whoosh.mp3': 19,
  'light-sweep-magic.mp3': 48,
  'lock-quick.mp3': 1,
  'pen-write-paper.mp3': 2,
  'riser-cine.mp3': 35,
  'shimmer-sparkle-sweep.mp3': 28,
  'sweep-fast-small.mp3': 10,
  'switch-click-quick.mp3': 0,
  'switch-light.mp3': 2,
  'switch-tap.mp3': 0,
  'swoosh-quick.mp3': 10,
  'transition-snap.mp3': 3,
  'transition-soft.mp3': 13,
  'whoosh-fast.mp3': 22,
  'wind-woosh-throw.mp3': 5,
};

export const sfxFrom = (targetPeakF: number, src: string) =>
  Math.max(0, Math.round(targetPeakF - (PEAK_F[src] ?? 0) - OUTPUT_AUDIO_OFFSET_F));

export type SfxCue = {
  id: string;
  from: number;
  duration: number;
  src: string;
  volume: number;
  note: string;
};

// Central declarative SFX cue table — relative to SHOTS.<id>.from, zero synthetic UI bleeps (S1/A7)
export const SFX: SfxCue[] = [
  // S1: Brand Open
  {
    id: 's1-crosshair',
    from: sfxFrom(SHOTS.s1_open.from + 5, 'pen-write-paper.mp3'),
    duration: 28,
    src: 'pen-write-paper.mp3',
    volume: 0.72, // -7.0dB source -> audible crisp pen stroke
    note: 'S1 crosshair draw-on',
  },
  {
    id: 's1-wordmark',
    from: sfxFrom(SHOTS.s1_open.from + 22, 'transition-soft.mp3'),
    duration: 39,
    src: 'transition-soft.mp3',
    volume: 0.42,
    note: 'S1 wordmark press',
  },
  {
    id: 's1-exit',
    from: sfxFrom(SHOTS.s1_open.to - 4, 'whoosh-fast.mp3'),
    duration: 50,
    src: 'whoosh-fast.mp3',
    volume: 0.56, // -6.1dB source
    note: 'S1 -> S2 handoff whoosh',
  },

  // S2: Spotlight Hero Card
  {
    id: 's2-lamp',
    from: sfxFrom(SHOTS.s2_hero.from + 3, 'switch-tap.mp3'),
    duration: 26,
    src: 'switch-tap.mp3',
    volume: 0.46,
    note: 'S2 theatre spotlight switch-on',
  },
  {
    id: 's2-rise',
    from: sfxFrom(SHOTS.s2_hero.from + 58, 'air-whoosh-powerful.mp3'),
    duration: 52,
    src: 'air-whoosh-powerful.mp3',
    volume: 0.48,
    note: 'S2 push-in + hero card #4 lift',
  },
  {
    id: 's2-beam',
    from: sfxFrom(SHOTS.s2_hero.from + 76, 'light-sweep-magic.mp3'),
    duration: 72,
    src: 'light-sweep-magic.mp3',
    volume: 0.68, // -7.3dB source -> audible shimmer on 2-lap perimeter beam
    note: 'S2 perimeter scan beam',
  },
  {
    id: 's2-reseat',
    from: sfxFrom(SHOTS.s2_hero.from + 144, 'transition-snap.mp3'),
    duration: 18,
    src: 'transition-snap.mp3',
    volume: 0.58,
    note: 'S2 hero card #4 reseat micro-press',
  },

  // C1: Breath Title Card 1
  {
    id: 'c1-in',
    from: sfxFrom(SHOTS.c1_title.from + 8, 'swoosh-quick.mp3'),
    duration: 24,
    src: 'swoosh-quick.mp3',
    volume: 0.48,
    note: 'C1 chapter card entrance',
  },

  // S3: Live 3-Column Flow + Lineage + Drawer + FLIP
  {
    id: 's3-enter',
    from: sfxFrom(SHOTS.s3_flow.from + 8, 'transition-soft.mp3'),
    duration: 39,
    src: 'transition-soft.mp3',
    volume: 0.40,
    note: 'S3 live stage glide in',
  },
  {
    id: 's3-drawer',
    from: sfxFrom(SHOTS.s3_flow.from + 28, 'switch-click-quick.mp3'),
    duration: 24,
    src: 'switch-click-quick.mp3',
    volume: 0.44,
    note: 'S3 0fr->1fr detail drawer click (f27-31)',
  },
  {
    id: 's3-flip',
    from: sfxFrom(SHOTS.s3_flow.from + 105, 'wind-woosh-throw.mp3'),
    duration: 29,
    src: 'wind-woosh-throw.mp3',
    volume: 0.48,
    note: 'S3 #4 unlock & cross-lane FLIP flight (f103-113)',
  },
  {
    id: 's3-done',
    from: sfxFrom(SHOTS.s3_flow.from + 145, 'lock-quick.mp3'),
    duration: 30,
    src: 'lock-quick.mp3',
    volume: 0.46,
    note: 'S3 6/6 completed lock-in',
  },

  // C2: Breath Title Card 2
  {
    id: 'c2-in',
    from: sfxFrom(SHOTS.c2_title.from + 8, 'swoosh-quick.mp3'),
    duration: 24,
    src: 'swoosh-quick.mp3',
    volume: 0.48,
    note: 'C2 chapter card entrance',
  },

  // S4: Theme Sweep Toggle + 360px Narrow Parity
  {
    id: 's4-toggle',
    from: sfxFrom(SHOTS.s4_theme.from + 15, 'switch-light.mp3'),
    duration: 12,
    src: 'switch-light.mp3',
    volume: 1.05, // -10.7dB quiet source -> boosted cleanly above BGM without clipping
    note: 'S4 Day->Night switch click on beat 41',
  },
  {
    id: 's4-sweep',
    from: sfxFrom(SHOTS.s4_theme.from + 42, 'air-woosh-deep.mp3'),
    duration: 78,
    src: 'air-woosh-deep.mp3',
    volume: 0.50,
    note: 'S4 15-deg terminator sweep across dual boards',
  },

  // S5: Cursor Flyover Disarm + Riser into Finale
  {
    id: 's5-click1',
    from: sfxFrom(SHOTS.s5_disarm.from + 44, 'click-camera.mp3'),
    duration: 12,
    src: 'click-camera.mp3',
    volume: 0.78, // -6.9dB source -> crisp click on 团队 button (beat 55)
    note: 'S5 open disarm confirmation popover',
  },
  {
    id: 's5-click2',
    from: sfxFrom(SHOTS.s5_disarm.from + 89, 'switch-tap.mp3'),
    duration: 28,
    src: 'switch-tap.mp3',
    volume: 0.52,
    note: 'S5 confirm disarm click (beat 58)',
  },
  {
    id: 's5-close',
    from: sfxFrom(SHOTS.s5_disarm.from + 96, 'sweep-fast-small.mp3'),
    duration: 24,
    src: 'sweep-fast-small.mp3',
    volume: 0.50,
    note: 'S5 sidebar auto-closes cleanly',
  },
  {
    id: 's5-riser',
    from: sfxFrom(SHOTS.s6_outro.from, 'riser-cine.mp3'),
    duration: 52, // Explicit truncation so riser crests right into beat 64 Drop and stops cleanly!
    src: 'riser-cine.mp3',
    volume: 0.48,
    note: 'Pre-finale riser cresting at beat 64 Drop',
  },

  // S6: Keynote Launch Finale (fixed 3-beat grammar: sweep -> impact -> sparkle!)
  {
    id: 's6-sweep',
    from: sfxFrom(SHOTS.s6_outro.from + 8, 'swoosh-quick.mp3'),
    duration: 24,
    src: 'swoosh-quick.mp3',
    volume: 0.46,
    note: 'S6 opening light sweep & group cards fly-in',
  },
  {
    id: 's6-impact',
    from: sfxFrom(SHOTS.s6_outro.from + 46, 'impact-deep-whoosh.mp3'),
    duration: 96,
    src: 'impact-deep-whoosh.mp3',
    volume: 0.58, // Film peak impact when KanbanMark + wordmark stamp!
    note: 'S6 wordmark stamp impact on beat 67',
  },
  {
    id: 's6-sparkle',
    from: sfxFrom(SHOTS.s6_outro.from + 72, 'shimmer-sparkle-sweep.mp3'),
    duration: 84,
    src: 'shimmer-sparkle-sweep.mp3',
    volume: 0.42,
    note: 'S6 rule extension + CLI badge shimmer',
  },
];

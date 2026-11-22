import { FPS, OUTPUT_AUDIO_OFFSET_SEC, SHOTS } from './timeline';

// Measured 10ms RMS attack peaks @ 30fps (analysis/sfx_peaks.json)
// Pipeline measurement record (A9):
// - Engine: Remotion 4.0.484 · Renderer: chrome-headless-shell · Mux/Codec: FFmpeg AAC 48kHz MP4
// - Date: 2026-11-21
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

// Declarative Foley SFX cue table — relative to SHOTS.<id>.from, zero synthetic UI bleeps (S1/A7)
export const SFX: SfxCue[] = [
  // S1: Optical Porcelain Brand Open
  {
    id: 's1-crosshair',
    from: sfxFrom(SHOTS.s1_open.from + 5, 'pen-write-paper.mp3'),
    duration: 28,
    src: 'pen-write-paper.mp3',
    volume: 0.72,
    note: 'S1 calibration crosshair draw-on',
  },
  {
    id: 's1-wordmark',
    from: sfxFrom(SHOTS.s1_open.from + 22, 'transition-soft.mp3'),
    duration: 39,
    src: 'transition-soft.mp3',
    volume: 0.42,
    note: 'S1 wordmark letterpress',
  },
  {
    id: 's1-exit',
    from: sfxFrom(SHOTS.s1_open.to - 4, 'whoosh-fast.mp3'),
    duration: 50,
    src: 'whoosh-fast.mp3',
    volume: 0.56,
    note: 'S1 -> S2 handoff whoosh',
  },

  // S2: Micro-Optic Hero Card + Conflict Pair + Steer Copy
  {
    id: 's2-lamp',
    from: sfxFrom(SHOTS.s2_hero.from + 3, 'switch-tap.mp3'),
    duration: 26,
    src: 'switch-tap.mp3',
    volume: 0.46,
    note: 'S2 spotlight lamp switch-on',
  },
  {
    id: 's2-rise',
    from: sfxFrom(SHOTS.s2_hero.from + 56, 'air-whoosh-powerful.mp3'),
    duration: 50,
    src: 'air-whoosh-powerful.mp3',
    volume: 0.48,
    note: 'S2 push-in + @4x card #4 lift',
  },
  {
    id: 's2-beam',
    from: sfxFrom(SHOTS.s2_hero.from + 72, 'light-sweep-magic.mp3'),
    duration: 68,
    src: 'light-sweep-magic.mp3',
    volume: 0.64,
    note: 'S2 perimeter scan beam',
  },
  {
    id: 's2-copy',
    from: sfxFrom(SHOTS.s2_hero.from + 94, 'switch-click-quick.mp3'),
    duration: 18,
    src: 'switch-click-quick.mp3',
    volume: 0.56,
    note: 'S2 tactile micro-switch copy steer prompt',
  },
  {
    id: 's2-reseat',
    from: sfxFrom(SHOTS.s2_hero.from + 144, 'transition-snap.mp3'),
    duration: 18,
    src: 'transition-snap.mp3',
    volume: 0.56,
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

  // S3: Live Odometer + 920ms Emerald Relay + Tilted FLIP
  {
    id: 's3-enter',
    from: sfxFrom(SHOTS.s3_flow.from + 8, 'transition-soft.mp3'),
    duration: 39,
    src: 'transition-soft.mp3',
    volume: 0.40,
    note: 'S3 multiplane glide entrance',
  },
  {
    id: 's3-odo',
    from: sfxFrom(SHOTS.s3_flow.from + 44, 'switch-click-quick.mp3'),
    duration: 16,
    src: 'switch-click-quick.mp3',
    volume: 0.44,
    note: 'S3 mechanical odometer ratchet',
  },
  {
    id: 's3-relay',
    from: sfxFrom(SHOTS.s3_flow.from + 68, 'light-sweep-magic.mp3'),
    duration: 58,
    src: 'light-sweep-magic.mp3',
    volume: 0.60,
    note: 'S3 920ms emerald causal relay wire + unlock aura',
  },
  {
    id: 's3-flip',
    from: sfxFrom(SHOTS.s3_flow.from + 96, 'wind-woosh-throw.mp3'),
    duration: 28,
    src: 'wind-woosh-throw.mp3',
    volume: 0.52,
    note: 'S3 tilted cross-lane FLIP flight',
  },
  {
    id: 's3-debrief',
    from: sfxFrom(SHOTS.s3_flow.from + 141, 'lock-quick.mp3'),
    duration: 18,
    src: 'lock-quick.mp3',
    volume: 0.52,
    note: 'S3 6/6 all-done debrief lock',
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

  // S4: 15° Day/Night Sweep + 360px Left-Arc + Away Catch-up
  {
    id: 's4-toggle',
    from: sfxFrom(SHOTS.s4_theme.from + 15, 'switch-light.mp3'),
    duration: 24,
    src: 'switch-light.mp3',
    volume: 0.58,
    note: 'S4 physical Day/Night switch click on beat 41',
  },
  {
    id: 's4-sweep',
    from: sfxFrom(SHOTS.s4_theme.from + 42, 'air-woosh-deep.mp3'),
    duration: 78,
    src: 'air-woosh-deep.mp3',
    volume: 0.54,
    note: 'S4 15° terminator sweep into Darkroom',
  },

  // S5: Darkroom Constellation Climax + One-Click Clean Disarm
  {
    id: 's5-star-click',
    from: sfxFrom(SHOTS.s5_constellation.from + 30, 'click-camera.mp3'),
    duration: 24,
    src: 'click-camera.mp3',
    volume: 0.58,
    note: 'S5 Station 1 click 星图 on beat 54',
  },
  {
    id: 's5-constellation',
    from: sfxFrom(SHOTS.s5_constellation.from + 44, 'shimmer-sparkle-sweep.mp3'),
    duration: 64,
    src: 'shimmer-sparkle-sweep.mp3',
    volume: 0.58,
    note: 'S5 emerald critical-path constellation illumination',
  },
  {
    id: 's5-disarm-click',
    from: sfxFrom(SHOTS.s5_constellation.from + 104, 'switch-tap.mp3'),
    duration: 20,
    src: 'switch-tap.mp3',
    volume: 0.52,
    note: 'S5 Station 2 click 停用 on beat 59',
  },
  {
    id: 's5-close',
    from: sfxFrom(SHOTS.s5_constellation.from + 110, 'sweep-fast-small.mp3'),
    duration: 28,
    src: 'sweep-fast-small.mp3',
    volume: 0.48,
    note: 'S5 clean zero-residue sidebar close',
  },
  {
    id: 's5-riser',
    from: sfxFrom(SHOTS.s6_outro.from, 'riser-cine.mp3'),
    duration: 52,
    src: 'riser-cine.mp3',
    volume: 0.50,
    note: 'S5 -> S6 riser peaking right at beat 64 Drop',
  },

  // S6: Keynote Launch Finale (riser -> impact -> sparkle)
  {
    id: 's6-flyin',
    from: sfxFrom(SHOTS.s6_outro.from + 8, 'swoosh-quick.mp3'),
    duration: 26,
    src: 'swoosh-quick.mp3',
    volume: 0.46,
    note: 'S6 8-cutout perimeter assembly',
  },
  {
    id: 's6-impact',
    from: sfxFrom(SHOTS.s6_outro.from + 46, 'impact-deep-whoosh.mp3'),
    duration: 96,
    src: 'impact-deep-whoosh.mp3',
    volume: 0.62,
    note: 'S6 peak impact on wordmark stamp (beat 67)',
  },
  {
    id: 's6-sparkle',
    from: sfxFrom(SHOTS.s6_outro.from + 72, 'shimmer-sparkle-sweep.mp3'),
    duration: 84,
    src: 'shimmer-sparkle-sweep.mp3',
    volume: 0.56,
    note: 'S6 extension line crystal shimmer',
  },
];

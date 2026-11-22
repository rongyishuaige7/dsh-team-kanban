// Single source of truth for beat grid + shot boundaries + captions (launch-v6)
// Track: house-vibez.mp3 (Lily J, Mixkit Stock Music Free License)
// BPM = 122.0141, SOURCE_BEAT0 = 0.061121s, BEAT_INT = 0.491747s

export const FPS = 30;
export const SOURCE_BEAT0 = 0.061121;
export const BEAT_INT = 0.491747;
export const OUTPUT_AUDIO_OFFSET_SEC = 0.0427;

export const beatT = (n: number) => SOURCE_BEAT0 + OUTPUT_AUDIO_OFFSET_SEC + n * BEAT_INT;
export const beatF = (n: number) => Math.round(beatT(n) * FPS);
export const localBeat = (shot: { from: number }, n: number) => beatF(n) - shot.from;

const b8 = beatF(8);
const b20 = beatF(20);
const b24 = beatF(24);
const b36 = beatF(36);
const b40 = beatF(40);
const b52 = beatF(52);
const b64 = beatF(64);
const b76 = beatF(76);

export const SHOTS = {
  s1_open:          { from: 0,   to: b8,  duration: b8 },          // 0..121   (~4.03s) Optical Porcelain Brand Open
  s2_hero:          { from: b8,  to: b20, duration: b20 - b8 },    // 121..298 (~5.90s) @4x Conflict Pair + Steer Prompt Copy
  c1_title:         { from: b20, to: b24, duration: b24 - b20 },   // 298..357 (~1.97s) Breath Title Card 1 (920ms Relay)
  s3_flow:          { from: b24, to: b36, duration: b36 - b24 },   // 357..534 (~5.90s) Live Odometer + Emerald Relay + Tilted FLIP
  c2_title:         { from: b36, to: b40, duration: b40 - b36 },   // 534..593 (~1.97s) Breath Title Card 2 (360px Left-Arc)
  s4_theme:         { from: b40, to: b52, duration: b52 - b40 },   // 593..770 (~5.90s) 15° Day/Night Sweep + 360px C-Arc + Catch-up
  s5_constellation: { from: b52, to: b64, duration: b64 - b52 },   // 770..947 (~5.90s) Darkroom Constellation Climax + Clean Disarm
  s6_outro:         { from: b64, to: b76, duration: b76 - b64 },   // 947..1124(~5.90s) 8-Cutout v0.6.0 Keynote Group Photo Finale
} as const;

export const TOTAL_FRAMES = b76;

export const TITLE_CARDS = {
  c1_title: {
    text: '前置一收口，|因果脉冲 *即刻* 接力。',
    sub: 'MS EMERALD DAG RELAY · ODOMETER + FLIP',
    subDigits: '920',
  },
  c2_title: {
    text: '窄栏不断线，|晨昏 *原生* 同构追帧。',
    sub: 'PX LEFT-ARC LINEAGE · AWAY CATCH-UP',
    subDigits: '360',
  },
} as const;

export const parseTitleWords = (text: string): { text: string; accent?: boolean; br?: boolean }[] => {
  const lines = text.split('|');
  const out: { text: string; accent?: boolean; br?: boolean }[] = [];
  lines.forEach((line, li) => {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    tokens.forEach((tok, ti) => {
      const m = tok.match(/^\*(.+)\*$/);
      const isLastInLine = ti === tokens.length - 1 && li < lines.length - 1;
      out.push({
        text: m ? m[1] : tok,
        accent: !!m,
        br: isLastInLine,
      });
    });
  });
  return out;
};

export const CAPTIONS = [
  {
    id: 'cap-flow',
    from: SHOTS.s3_flow.from + 10,
    duration: SHOTS.s3_flow.duration - 22,
    text: '机械字轮跳变 · 翡翠因果接力与倾角 FLIP',
    dark: false,
  },
  {
    id: 'cap-theme',
    from: SHOTS.s4_theme.from + 44,
    duration: SHOTS.s4_theme.duration - 56,
    text: '360px 左侧微弧血缘 · 离席追帧与深浅同构',
    dark: true,
  },
  {
    id: 'cap-constellation',
    from: SHOTS.s5_constellation.from + 10,
    duration: SHOTS.s5_constellation.duration - 28,
    text: '一键点亮关键路径星图 · 战报归档与零残留停用',
    dark: true,
  },
] as const;

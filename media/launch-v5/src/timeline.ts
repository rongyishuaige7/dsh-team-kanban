// Single source of truth for beat grid + shot boundaries + captions
// Beat grid validated in media/launch-v5/analysis/beat_data.json & grid_drift.json:
// Track: house-vibez.mp3 (Lily J, Mixkit Stock Music Free License)
// BPM = 122.0141, SOURCE_BEAT0 = 0.061121s, BEAT_INT = 0.491747s (match=100%, mean_abs_ms=1.59ms, drift=0.81ms)

export const FPS = 30;
export const SOURCE_BEAT0 = 0.061121;
export const BEAT_INT = 0.491747;

// Measured post-render audio pipeline offset (AAC priming / container offset; verified in Stage 6)
// Kept strictly separate from SOURCE_BEAT0 per music-beat-sync.md §4 & §5b.
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
  s1_open:  { from: 0,   to: b8,  duration: b8 },          // 0..121   (~4.0s) Brand Ink Open (DSH Porcelain)
  s2_hero:  { from: b8,  to: b20, duration: b20 - b8 },    // 121..298 (~5.9s) Spotlight Hero Card (#4 blocked/conflict)
  c1_title: { from: b20, to: b24, duration: b24 - b20 },   // 298..357 (~2.0s) Breath Title Card 1
  s3_flow:  { from: b24, to: b36, duration: b36 - b24 },   // 357..534 (~5.9s) Live 3-Column FLIP + Lineage Wires + Drawer
  c2_title: { from: b36, to: b40, duration: b40 - b36 },   // 534..593 (~2.0s) Breath Title Card 2
  s4_theme: { from: b40, to: b52, duration: b52 - b40 },   // 593..770 (~5.9s) Theme Sweep Toggle + 360px Narrow @container
  s5_disarm:{ from: b52, to: b64, duration: b64 - b52 },   // 770..947 (~5.9s) Cursor Flyover Disarm + Clean Auto-Close
  s6_outro: { from: b64, to: b76, duration: b76 - b64 },   // 947..1124(~5.9s) Group-Photo Launch Finale + CLI Sign-off
} as const;

export const TOTAL_FRAMES = b76;

export const TITLE_CARDS = {
  c1_title: {
    text: '前置一收口，|下游 *即刻* 换列流转。',
    sub: 'SHARED TEAM TASKS · ZERO SQLITE SYNC',
    subDigits: '6',
  },
  c2_title: {
    text: '窄栏自适应，|深浅 *原生* 随宿主换肤。',
    sub: 'PX @CONTAINER · --DSW-ALIAS-* TOKENS',
    subDigits: '360',
  },
} as const;

// Parse Chinese/English phrase blocks separated by spaces or `|` (line break), `*word*` = accent
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

// Narrative captions: >= 56px effective height (60px default), clean & non-redundant (Q11, C1, F2)
export const CAPTIONS = [
  {
    id: 'cap-flow',
    from: SHOTS.s3_flow.from + 10,
    duration: SHOTS.s3_flow.duration - 22,
    text: '贝塞尔血缘连线 · 跨列 FLIP 实时流转',
    dark: false,
  },
  {
    id: 'cap-theme',
    from: SHOTS.s4_theme.from + 44,
    duration: SHOTS.s4_theme.duration - 56,
    text: '360px 窄栏静默折叠 · 深浅双色无缝同构',
    dark: true,
  },
  {
    id: 'cap-disarm',
    from: SHOTS.s5_disarm.from + 10,
    duration: SHOTS.s5_disarm.duration - 24,
    text: '一键停用团队协作 · 任务保留，收起零残留',
    dark: false,
  },
] as const;

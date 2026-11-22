// Shotcraft Workbench Manifest — decomposes `KanbanMain` (launch-v6) into editable tracks
import { createElement, type FC } from 'react';
import { DSH } from './tokens';
import {
  BGM_BASE_VOLUME,
  CAPTIONS,
  KanbanMain,
  SFX,
  SHOTS,
  TITLE_CARDS,
  TOTAL_FRAMES,
  parseTitleWords,
} from './Main';
import { SceneOpen, SCENE_OPEN_DEFAULTS } from './scenes/SceneOpen';
import { SceneHero, SCENE_HERO_DEFAULTS } from './scenes/SceneHero';
import { SceneFlow, SCENE_FLOW_DEFAULTS } from './scenes/SceneFlow';
import { SceneTheme, SCENE_THEME_DEFAULTS } from './scenes/SceneTheme';
import { SceneConstellation, SCENE_CONSTELLATION_DEFAULTS } from './scenes/SceneConstellation';
import { SceneOutro, SCENE_OUTRO_DEFAULTS } from './scenes/SceneOutro';
import { ChapterTitleCard, TITLE_CARD_DEFAULTS } from './components/ChapterTitleCard';
import { CaptionBar, CAPTION_DEFAULTS } from './components/CaptionBar';

type Field = Record<string, unknown> & { type: string; key: string; label: string; default: unknown };
const text = (key: string, label: string, def: string): Field => ({ type: 'text', key, label, default: def });
const textarea = (key: string, label: string, def: string): Field => ({ type: 'textarea', key, label, default: def });
const color = (key: string, label: string, def: string): Field => ({ type: 'color', key, label, default: def });
const size = (key: string, label: string, def: number, min: number, max: number): Field => ({
  type: 'slider',
  key,
  label,
  default: def,
  min,
  max,
  step: 1,
  unit: 'px',
});
const bool = (key: string, label: string, def: boolean): Field => ({ type: 'boolean', key, label, default: def });

type TitleUnitProps = Partial<typeof TITLE_CARD_DEFAULTS> & {
  text?: string;
  sub?: string;
  subDigits?: string;
  duration?: number;
};
export const TitleCardUnit: FC<TitleUnitProps> = ({
  text: copy = '',
  sub = '',
  subDigits = '',
  duration = 59,
  ...style
}) =>
  createElement(ChapterTitleCard, {
    duration,
    words: parseTitleWords(copy),
    sub: sub || undefined,
    subDigits: subDigits || undefined,
    ...style,
  });
TitleCardUnit.displayName = 'ChapterTitleCard';

type CaptionUnitProps = Partial<typeof CAPTION_DEFAULTS> & {
  text?: string;
  dark?: boolean;
  duration?: number;
};
export const CaptionUnit: FC<CaptionUnitProps> = ({
  text: copy = '',
  dark = false,
  duration = 120,
  ...style
}) => createElement(CaptionBar, { text: copy, dark, duration, ...style });
CaptionUnit.displayName = 'CaptionBar';

const SCHEMAS = {
  open: [
    text('wordmark', '字标', SCENE_OPEN_DEFAULTS.wordmark),
    size('wordmarkSize', '字标字号', SCENE_OPEN_DEFAULTS.wordmarkSize, 72, 180),
    text('kicker', '等宽眉题', SCENE_OPEN_DEFAULTS.kicker),
    size('kickerSize', '眉题字号', SCENE_OPEN_DEFAULTS.kickerSize, 24, 52),
    color('ink', '主文字色', SCENE_OPEN_DEFAULTS.ink),
    color('accent', '强调色', SCENE_OPEN_DEFAULTS.accent),
    color('muted', '次文字色', SCENE_OPEN_DEFAULTS.muted),
  ],
  hero: [
    text('noteLine1', '3D 悬浮批注 · 上行', SCENE_HERO_DEFAULTS.noteLine1),
    text('noteLine2', '3D 悬浮批注 · 下行高亮', SCENE_HERO_DEFAULTS.noteLine2),
    size('noteSize', '页面空间字号', SCENE_HERO_DEFAULTS.noteSize, 22, 48),
    color('accent', '主扫描光色', SCENE_HERO_DEFAULTS.accent),
    color('beamAccent', '次扫描光色', SCENE_HERO_DEFAULTS.beamAccent),
  ],
  flow: [
    text('badgeTop', '左上角标', SCENE_FLOW_DEFAULTS.badgeTop),
    color('accent', '强调色', SCENE_FLOW_DEFAULTS.accent),
  ],
  theme: [
    text('wideLabel', '宽屏窗标题', SCENE_THEME_DEFAULTS.wideLabel),
    text('narrowLabel', '窄栏窗标题', SCENE_THEME_DEFAULTS.narrowLabel),
    color('accentLight', '浅色强调色', SCENE_THEME_DEFAULTS.accentLight),
    color('accentDark', '深色强调色', SCENE_THEME_DEFAULTS.accentDark),
  ],
  constellation: [
    text('step1Tag', '第一站提示（星图）', SCENE_CONSTELLATION_DEFAULTS.step1Tag),
    text('step2Tag', '第二站提示（停用）', SCENE_CONSTELLATION_DEFAULTS.step2Tag),
    color('accent', '星图翡翠强调色', SCENE_CONSTELLATION_DEFAULTS.accent),
    color('danger', '停用涟漪色', SCENE_CONSTELLATION_DEFAULTS.danger),
  ],
  outro: [
    text('wordmark', '品牌字标', SCENE_OUTRO_DEFAULTS.wordmark),
    size('wordmarkSize', '字标字号', SCENE_OUTRO_DEFAULTS.wordmarkSize, 72, 160),
    text('tagline', '副标题', SCENE_OUTRO_DEFAULTS.tagline),
    size('taglineSize', '副标题字号', SCENE_OUTRO_DEFAULTS.taglineSize, 24, 56),
    text('cli', '安装命令', SCENE_OUTRO_DEFAULTS.cli),
    size('cliSize', '命令字号', SCENE_OUTRO_DEFAULTS.cliSize, 24, 44),
    color('ink', '主文字色', SCENE_OUTRO_DEFAULTS.ink),
    color('accent', '品牌强调色', SCENE_OUTRO_DEFAULTS.accent),
  ],
  title: [
    textarea('text', '文案（| 换行，*词* = 科技蓝斜体）', ''),
    text('sub', '等宽副行', ''),
    text('subDigits', '滚动数字', ''),
    size('fontSize', '主句字号', TITLE_CARD_DEFAULTS.fontSize, 64, 140),
    color('ink', '主文字色', TITLE_CARD_DEFAULTS.ink),
    color('accent', '强调色', TITLE_CARD_DEFAULTS.accent),
    color('muted', '副行文字色', TITLE_CARD_DEFAULTS.muted),
  ],
  caption: [
    text('text', '叙事字幕文案', ''),
    bool('dark', '深色底模式', false),
    size('fontSize', '字号（≥56px）', CAPTION_DEFAULTS.fontSize, 56, 84),
    size('bottom', '底部边距', CAPTION_DEFAULTS.bottom, 24, 160),
    color('color', '浅色文字色', CAPTION_DEFAULTS.color),
    color('accent', '浅色方点色', CAPTION_DEFAULTS.accent),
  ],
};

export const WORKBENCH = {
  name: 'Optical Porcelain × Darkroom Constellation · dsh-team-kanban v0.6.0',
  fps: 30,
  width: 1920,
  height: 1080,
  total: TOTAL_FRAMES,
  background: DSH.stageMid,
  shots: [
    {
      id: 's1_open',
      label: 'S1 光学白瓷校准立名',
      from: SHOTS.s1_open.from,
      duration: SHOTS.s1_open.duration,
      component: SceneOpen as FC<Record<string, unknown>>,
      props: { ...SCENE_OPEN_DEFAULTS, duration: SHOTS.s1_open.duration },
      schema: SCHEMAS.open,
      durationProp: 'duration',
    },
    {
      id: 's2_hero',
      label: 'S2 @4x 写冲突联动与一键复制协调指令',
      from: SHOTS.s2_hero.from,
      duration: SHOTS.s2_hero.duration,
      component: SceneHero as FC<Record<string, unknown>>,
      props: { ...SCENE_HERO_DEFAULTS, duration: SHOTS.s2_hero.duration },
      schema: SCHEMAS.hero,
      durationProp: 'duration',
    },
    {
      id: 'c1_title',
      label: '字卡① 920ms 翡翠因果脉冲接力',
      from: SHOTS.c1_title.from,
      duration: SHOTS.c1_title.duration,
      component: TitleCardUnit as FC<Record<string, unknown>>,
      props: {
        text: TITLE_CARDS.c1_title.text,
        sub: TITLE_CARDS.c1_title.sub,
        subDigits: TITLE_CARDS.c1_title.subDigits,
        ...TITLE_CARD_DEFAULTS,
      },
      schema: SCHEMAS.title,
      durationProp: 'duration',
      cardId: 'title-card',
      cardName: '章节呼吸字卡',
      accent: DSH.brand,
    },
    {
      id: 's3_flow',
      label: 'S3 机械字轮 + 翡翠因果接力 + 倾角 FLIP 实机流转',
      from: SHOTS.s3_flow.from,
      duration: SHOTS.s3_flow.duration,
      component: SceneFlow as FC<Record<string, unknown>>,
      props: { ...SCENE_FLOW_DEFAULTS, duration: SHOTS.s3_flow.duration },
      schema: SCHEMAS.flow,
      durationProp: 'duration',
    },
    {
      id: 'c2_title',
      label: '字卡② 360px 左侧微弧血缘与离席追帧',
      from: SHOTS.c2_title.from,
      duration: SHOTS.c2_title.duration,
      component: TitleCardUnit as FC<Record<string, unknown>>,
      props: {
        text: TITLE_CARDS.c2_title.text,
        sub: TITLE_CARDS.c2_title.sub,
        subDigits: TITLE_CARDS.c2_title.subDigits,
        ...TITLE_CARD_DEFAULTS,
      },
      schema: SCHEMAS.title,
      durationProp: 'duration',
      cardId: 'title-card',
      cardName: '章节呼吸字卡',
      accent: DSH.brand,
    },
    {
      id: 's4_theme',
      label: 'S4 15° 晨昏扫入暗室 + 360px 微弧 + 离席追帧',
      from: SHOTS.s4_theme.from,
      duration: SHOTS.s4_theme.duration,
      component: SceneTheme as FC<Record<string, unknown>>,
      props: { ...SCENE_THEME_DEFAULTS, duration: SHOTS.s4_theme.duration },
      schema: SCHEMAS.theme,
      durationProp: 'duration',
    },
    {
      id: 's5_constellation',
      label: 'S5 暗室点击星图点亮关键路径主干 + 零残留停用',
      from: SHOTS.s5_constellation.from,
      duration: SHOTS.s5_constellation.duration,
      component: SceneConstellation as FC<Record<string, unknown>>,
      props: { ...SCENE_CONSTELLATION_DEFAULTS, duration: SHOTS.s5_constellation.duration },
      schema: SCHEMAS.constellation,
      durationProp: 'duration',
    },
    {
      id: 's6_outro',
      label: 'S6 8 枚 v0.6.0 真切片发布会全家福定版',
      from: SHOTS.s6_outro.from,
      duration: SHOTS.s6_outro.duration,
      component: SceneOutro as FC<Record<string, unknown>>,
      props: { ...SCENE_OUTRO_DEFAULTS, duration: SHOTS.s6_outro.duration },
      schema: SCHEMAS.outro,
      durationProp: 'duration',
    },
  ],
  transitions: [],
  captions: CAPTIONS.map((c) => ({
    id: c.id,
    label: c.text,
    from: c.from,
    duration: c.duration,
    component: CaptionUnit as FC<Record<string, unknown>>,
    props: { text: c.text, dark: c.dark, ...CAPTION_DEFAULTS },
    schema: SCHEMAS.caption,
    durationProp: 'duration',
    cardId: 'caption-bar',
    cardName: '叙事字幕条',
  })),
  overlays: [],
  sfx: SFX.map((s) => ({
    from: s.from,
    duration: s.duration,
    src: `audio/${s.src}`,
    volume: s.volume,
  })),
  bgm: [
    {
      from: 0,
      duration: TOTAL_FRAMES,
      src: 'audio/house-vibez.mp3',
      volume: BGM_BASE_VOLUME,
    },
  ],
  order: ['transitions', 'captions', 'overlays'] as const,
  original: KanbanMain as FC<Record<string, unknown>>,
};

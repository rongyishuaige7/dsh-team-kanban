import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { DSH } from './tokens';
import { CAPTIONS, SHOTS, TITLE_CARDS, TOTAL_FRAMES, parseTitleWords } from './timeline';
import { SFX } from './sfx';
import { SceneOpen } from './scenes/SceneOpen';
import { SceneHero } from './scenes/SceneHero';
import { SceneFlow } from './scenes/SceneFlow';
import { SceneTheme } from './scenes/SceneTheme';
import { SceneDisarm } from './scenes/SceneDisarm';
import { SceneOutro } from './scenes/SceneOutro';
import { ChapterTitleCard } from './components/ChapterTitleCard';
import { CaptionBar } from './components/CaptionBar';
import layoutEn from './live-layout-en.json';

export { CAPTIONS, SHOTS, TITLE_CARDS, TOTAL_FRAMES, parseTitleWords } from './timeline';
export { SFX } from './sfx';

export type KanbanPromoProps = {
  bgm?: boolean;
  lang?: 'zh' | 'en';
  plate?: boolean;
};

export const BGM_BASE_VOLUME = 0.31;

const EN_COPY = {
  heroNote1: 'Native DAG lineage',
  heroNote2: 'Conflicts spotted fast',
  c1Text: 'Upstream finishes, | downstream *instantly* flows.',
  c2Text: '360px adaptive sidebar, | *native* host theme tokens.',
  flowPhases: [
    '① Hover Bézier lineage · 0fr→1fr drawer',
    '② Auto-unlock · Cross-lane FLIP flight',
    '③ 6/6 completed · Tab ring checkmarked',
  ] as const,
  wideLabel: 'Wide 3-Lane · ≥820px @container',
  narrowLabel: '360px Sidebar · Quiet Empty Lanes',
  disarm1: '① Header "Team" switch · Focuses Cancel by default',
  disarm2: '② Confirm disable · Tasks kept, tab closes cleanly',
  outroTagline: 'Native agentTeam Right-Sidebar Kanban · v0.5.7',
  captions: {
    'cap-flow': 'Bézier lineage curves · Live cross-lane FLIP',
    'cap-theme': '360px quiet empty lanes · Pixel-identical themes',
    'cap-disarm': 'One-click team disarm · Tasks kept, zero residue',
  } as Record<string, string>,
};

export const KanbanMain: React.FC<KanbanPromoProps> = ({ bgm = true, lang = 'zh', plate = false }) => {
  const isEn = lang === 'en';
  const texDir = isEn ? 'textures-en' : 'textures';
  const clipSrc = isEn ? 'clips/live-flow-en-light.mp4' : 'clips/live-flow-light.mp4';

  return (
    <AbsoluteFill style={{ backgroundColor: DSH.stageMid }}>
      {/* Optional BGM bed (gated by `bgm` & `!plate` so BGM, no-BGM, and Jianying plate share exact timeline!) */}
      {bgm && !plate ? (
        <Sequence from={0} durationInFrames={TOTAL_FRAMES}>
          <Audio
            src={staticFile('audio/house-vibez.mp3')}
            volume={(f) => {
              const fadeIn = interpolate(f, [0, 20], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const fadeOut = interpolate(f, [TOTAL_FRAMES - 45, TOTAL_FRAMES], [1, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return BGM_BASE_VOLUME * fadeIn * fadeOut;
            }}
          />
        </Sequence>
      ) : null}

      {/* Latency-compensated Foley SFX cues */}
      {!plate &&
        SFX.map((s) => (
          <Sequence key={s.id} from={s.from} durationInFrames={s.duration}>
            <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
          </Sequence>
        ))}

      {/* 8 Beat-Locked Visual Units */}
      <Sequence from={SHOTS.s1_open.from} durationInFrames={SHOTS.s1_open.duration}>
        <SceneOpen duration={SHOTS.s1_open.duration} />
      </Sequence>

      <Sequence from={SHOTS.s2_hero.from} durationInFrames={SHOTS.s2_hero.duration}>
        <SceneHero
          duration={SHOTS.s2_hero.duration}
          texDir={texDir}
          noteLine1={isEn ? EN_COPY.heroNote1 : undefined}
          noteLine2={isEn ? EN_COPY.heroNote2 : undefined}
          noteSize={isEn ? 25 : undefined}
        />
      </Sequence>

      <Sequence from={SHOTS.c1_title.from} durationInFrames={SHOTS.c1_title.duration}>
        <ChapterTitleCard
          duration={SHOTS.c1_title.duration}
          words={parseTitleWords(isEn ? EN_COPY.c1Text : TITLE_CARDS.c1_title.text)}
          sub={TITLE_CARDS.c1_title.sub}
          subDigits={TITLE_CARDS.c1_title.subDigits}
          fontSize={isEn ? 88 : undefined}
        />
      </Sequence>

      <Sequence from={SHOTS.s3_flow.from} durationInFrames={SHOTS.s3_flow.duration}>
        <SceneFlow
          duration={SHOTS.s3_flow.duration}
          texDir={texDir}
          clipSrc={clipSrc}
          phases={isEn ? EN_COPY.flowPhases : undefined}
        />
      </Sequence>

      <Sequence from={SHOTS.c2_title.from} durationInFrames={SHOTS.c2_title.duration}>
        <ChapterTitleCard
          duration={SHOTS.c2_title.duration}
          words={parseTitleWords(isEn ? EN_COPY.c2Text : TITLE_CARDS.c2_title.text)}
          sub={TITLE_CARDS.c2_title.sub}
          subDigits={TITLE_CARDS.c2_title.subDigits}
          fontSize={isEn ? 84 : undefined}
        />
      </Sequence>

      <Sequence from={SHOTS.s4_theme.from} durationInFrames={SHOTS.s4_theme.duration}>
        <SceneTheme
          duration={SHOTS.s4_theme.duration}
          texDir={texDir}
          wideLabel={isEn ? EN_COPY.wideLabel : undefined}
          narrowLabel={isEn ? EN_COPY.narrowLabel : undefined}
        />
      </Sequence>

      <Sequence from={SHOTS.s5_disarm.from} durationInFrames={SHOTS.s5_disarm.duration}>
        <SceneDisarm
          duration={SHOTS.s5_disarm.duration}
          texDir={texDir}
          step1Tag={isEn ? EN_COPY.disarm1 : undefined}
          step2Tag={isEn ? EN_COPY.disarm2 : undefined}
          teamTarget={isEn ? layoutEn.disarm.teamBtn : undefined}
          dangerTarget={isEn ? layoutEn.disarm.dangerBtn : undefined}
        />
      </Sequence>

      <Sequence from={SHOTS.s6_outro.from} durationInFrames={SHOTS.s6_outro.duration}>
        <SceneOutro
          duration={SHOTS.s6_outro.duration}
          texDir={texDir}
          tagline={isEn ? EN_COPY.outroTagline : undefined}
          disarmH={isEn ? layoutEn.disarm.pop.h : undefined}
        />
      </Sequence>

      {/* Narrative Captions (>= 56px effective height per Q11; Outro stays clean per C1) */}
      {!plate &&
        CAPTIONS.map((c) => (
          <Sequence key={c.id} from={c.from} durationInFrames={c.duration}>
            <CaptionBar
              text={isEn ? EN_COPY.captions[c.id] ?? c.text : c.text}
              duration={c.duration}
              dark={c.dark}
            />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

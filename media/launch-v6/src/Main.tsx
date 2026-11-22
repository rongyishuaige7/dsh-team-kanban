import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { DSH } from './tokens';
import { CAPTIONS, SHOTS, TITLE_CARDS, TOTAL_FRAMES, parseTitleWords } from './timeline';
import { SFX } from './sfx';
import { SceneOpen } from './scenes/SceneOpen';
import { SceneHero } from './scenes/SceneHero';
import { SceneFlow } from './scenes/SceneFlow';
import { SceneTheme } from './scenes/SceneTheme';
import { SceneConstellation } from './scenes/SceneConstellation';
import { SceneOutro } from './scenes/SceneOutro';
import { ChapterTitleCard } from './components/ChapterTitleCard';
import { CaptionBar } from './components/CaptionBar';

export { CAPTIONS, SHOTS, TITLE_CARDS, TOTAL_FRAMES, parseTitleWords } from './timeline';
export { SFX } from './sfx';

export type KanbanPromoProps = {
  bgm?: boolean;
  plate?: boolean;
};

export const BGM_BASE_VOLUME = 0.31;

export const KanbanMain: React.FC<KanbanPromoProps> = ({ bgm = true, plate = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: DSH.stageMid }}>
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

      {!plate &&
        SFX.map((s) => (
          <Sequence key={s.id} from={s.from} durationInFrames={s.duration}>
            <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
          </Sequence>
        ))}

      <Sequence from={SHOTS.s1_open.from} durationInFrames={SHOTS.s1_open.duration}>
        <SceneOpen duration={SHOTS.s1_open.duration} />
      </Sequence>

      <Sequence from={SHOTS.s2_hero.from} durationInFrames={SHOTS.s2_hero.duration}>
        <SceneHero duration={SHOTS.s2_hero.duration} />
      </Sequence>

      <Sequence from={SHOTS.c1_title.from} durationInFrames={SHOTS.c1_title.duration}>
        <ChapterTitleCard
          duration={SHOTS.c1_title.duration}
          words={parseTitleWords(TITLE_CARDS.c1_title.text)}
          sub={TITLE_CARDS.c1_title.sub}
          subDigits={TITLE_CARDS.c1_title.subDigits}
        />
      </Sequence>

      <Sequence from={SHOTS.s3_flow.from} durationInFrames={SHOTS.s3_flow.duration}>
        <SceneFlow duration={SHOTS.s3_flow.duration} />
      </Sequence>

      <Sequence from={SHOTS.c2_title.from} durationInFrames={SHOTS.c2_title.duration}>
        <ChapterTitleCard
          duration={SHOTS.c2_title.duration}
          words={parseTitleWords(TITLE_CARDS.c2_title.text)}
          sub={TITLE_CARDS.c2_title.sub}
          subDigits={TITLE_CARDS.c2_title.subDigits}
        />
      </Sequence>

      <Sequence from={SHOTS.s4_theme.from} durationInFrames={SHOTS.s4_theme.duration}>
        <SceneTheme duration={SHOTS.s4_theme.duration} />
      </Sequence>

      <Sequence from={SHOTS.s5_constellation.from} durationInFrames={SHOTS.s5_constellation.duration}>
        <SceneConstellation duration={SHOTS.s5_constellation.duration} />
      </Sequence>

      <Sequence from={SHOTS.s6_outro.from} durationInFrames={SHOTS.s6_outro.duration}>
        <SceneOutro duration={SHOTS.s6_outro.duration} />
      </Sequence>

      {!plate &&
        CAPTIONS.map((c) => (
          <Sequence key={c.id} from={c.from} durationInFrames={c.duration}>
            <CaptionBar text={c.text} duration={c.duration} dark={c.dark} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

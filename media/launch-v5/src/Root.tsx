import React from 'react';
import { Composition } from 'remotion';
import { KanbanMain, TOTAL_FRAMES } from './Main';
import { KanbanVertical, VERTICAL_TOTAL_FRAMES } from './VerticalMain';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="KanbanPromo"
        component={KanbanMain}
        defaultProps={{ bgm: true, lang: 'zh', plate: false }}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="KanbanVertical"
        component={KanbanVertical}
        defaultProps={{ bgm: true }}
        durationInFrames={VERTICAL_TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

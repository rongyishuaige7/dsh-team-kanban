import React from 'react';
import { Composition } from 'remotion';
import { KanbanMain, TOTAL_FRAMES } from './Main';

export const Root: React.FC = () => {
  return (
    <Composition
      id="KanbanPromo"
      component={KanbanMain}
      defaultProps={{ bgm: true, plate: false }}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

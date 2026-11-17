import React from 'react';
import { Composition } from 'remotion';
import { Launch } from './Launch';
export const RemotionRoot: React.FC = () => (
  <Composition id="Launch" component={Launch} durationInFrames={1237} fps={60} width={1920} height={1080} />
);

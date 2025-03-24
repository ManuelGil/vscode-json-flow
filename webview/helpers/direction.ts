import type { Direction } from '@webview/types';

export const isHorizontal = (direction: Direction) =>
  direction === 'LR' || direction === 'RL';

export const isReversed = (direction: Direction) =>
  direction === 'BT' || direction === 'RL'; 
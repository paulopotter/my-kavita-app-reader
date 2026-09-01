import type { ReaderModeAdapter } from './reading-mode.types';

// STUB — horizontal (paged-sideways list) reading mode. Not implemented: the app has no
// horizontal content yet. Exists so ReadingMode's union and the adapter registry already carry
// this mode; implementing it later is a new adapter + a new native view, no change to the data
// model or moveFocus.
export const horizontalAdapter: ReaderModeAdapter<never> = {
  mode: 'horizontal',
  toRenderModel() {
    throw new Error('horizontal reading mode not implemented');
  },
  interpretPositionReport() {
    return null;
  },
};

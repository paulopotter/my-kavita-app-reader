import { FollowedSeriesBridge } from '../../bridge';

// Layer 4 — thin wrapper over FollowedSeriesBridge (the local "followed" set, Room). No cache, no
// transformation. Toggling stays on SerieTool.toggleFollow (optimistic + events); this is the read
// a screen needs to know WHICH series are followed.
export const FollowedSeriesService = {
  ids: {
    get(): Promise<string[]> {
      return FollowedSeriesBridge.getAllIds();
    },
  },
};

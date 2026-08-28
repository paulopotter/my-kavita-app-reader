import { NativeModules } from 'react-native';

// Mirrors FollowedSeriesBridgeModule.kt (android/app) 1:1 — RN→Kotlin bridge for
// FollowedSeriesDao (:core, Room). Series follow is 100% local today (no Kavita server round
// trip); a separate bridge from the legacy SeriesModule on purpose, exposing only this DAO for
// the new SerieTool (shared/tools/series) to depend on directly instead of the whole legacy
// SeriesModule surface.

interface FollowedSeriesBridgeModuleInterface {
  toggle(params: { seriesId: string }): Promise<void>;
  isFollowed(params: { seriesId: string }): Promise<boolean>;
  getAllIds(): Promise<string[]>;
}

// The native module itself takes positional args — this thin object wraps each call so the rest
// of the RN codebase only ever sees the named-argument shape above.
const native: {
  toggle(seriesId: string): Promise<void>;
  isFollowed(seriesId: string): Promise<boolean>;
  getAllIds(): Promise<string[]>;
} = NativeModules.FollowedSeriesBridgeModule;

export const FollowedSeriesBridge: FollowedSeriesBridgeModuleInterface = {
  toggle: ({ seriesId }) => native.toggle(seriesId),
  isFollowed: ({ seriesId }) => native.isFollowed(seriesId),
  getAllIds: () => native.getAllIds(),
};

import { NativeEventEmitter, NativeModules } from 'react-native';

// The only thing left of the old SeriesModule bridge: a genuinely-native event stream. Room
// observes followedSeriesDao and pushes the current followed-ids list whenever it changes; the
// Library listens for that. Everything else the old SeriesBridge exposed
// (getSeriesDetail/getCachedChapters/mark*/metadata/sort-prefs) was deleted with the legacy
// SeriesDetailScreen (Task 024) — SerieTool/ChapterTool/ChaptersTool cover those concerns now via
// DigestBridge / FollowedSeriesBridge / PreferencesBridge.
//
// Reading-progress changes do NOT flow through here — they live on the RN→RN EventBus as
// ChapterEvents.readStatusChanged (shared/tools/chapters), emitted by ChapterTool.mark.*.
export const SeriesFollowedEmitter = new NativeEventEmitter(NativeModules.SeriesModule);

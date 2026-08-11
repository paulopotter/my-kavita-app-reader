import { LibraryBridge, SeriesSummary } from '../../shared/bridge/library';

export async function fetchSeries(forceRefresh = false): Promise<SeriesSummary[]> {
  return LibraryBridge.listSeries(forceRefresh);
}

export async function syncBff(): Promise<void> {
  return LibraryBridge.syncBff();
}

export async function toggleFollow(seriesId: string): Promise<void> {
  return LibraryBridge.toggleFollow(seriesId);
}

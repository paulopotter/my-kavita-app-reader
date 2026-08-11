import { NativeModules } from 'react-native';

export type LibraryViewMode = 'GRID' | 'LIST';
export type LibrarySortMode = 'RECENTLY_UPDATED' | 'ALPHABETICAL';

export interface SeriesSummary {
  id: number;
  name: string;
  coverUrl: string;
  readStatus: 'UNREAD' | 'IN_PROGRESS' | 'READ';
  progressFraction: number;
  pagesRead: number;
  totalPages: number;
  lastChapterAddedUtc: string | null;
  downloadedChapters: number | null;
  totalChapters: number | null;
  latestChapterLabel: string | null;
  publicationStatus: 'NONE' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'ON_HIATUS' | 'ABANDONED';
  hasErrors: boolean;
  isFollowed: boolean;
}

interface LibraryModuleInterface {
  listSeries(forceRefresh: boolean): Promise<SeriesSummary[]>;
  toggleFollow(seriesId: string): Promise<void>;
  syncBff(): Promise<void>;
  saveReadingProgress(chapterId: string, seriesId: string, page: number): Promise<void>;
}

export const LibraryBridge: LibraryModuleInterface = NativeModules.LibraryModule;

import { NativeModules } from 'react-native';

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
}

interface LibraryModuleInterface {
  listSeries(forceRefresh: boolean): Promise<SeriesSummary[]>;
  syncBff(): Promise<void>;
  saveReadingProgress(chapterId: string, seriesId: string, page: number): Promise<void>;
}

export const LibraryBridge: LibraryModuleInterface = NativeModules.LibraryModule;

// One tile in a rail. Labels are already localized — the tile is a dumb component.
export interface DashboardItem {
  seriesId: string;
  // Present only on "continue reading": the tile opens the reader straight on this chapter.
  chapterId?: string;
  name: string;
  coverUrl: string;
  caption?: string;
  // 0..1 — absent means "no progress known", and the tile draws no bar.
  progressFraction?: number;
  // Adult-content filter: draw the tile blurred.
  blurred?: boolean;
  // What the series is made of when it is not a comic ("Novel", "PDF"), already localized.
  badge?: string;
}

export interface DashboardStats {
  series: number;
  followed: number;
  inProgress: number;
}

export interface DashboardData {
  continueReading: DashboardItem[];
  followedUpdated: DashboardItem[];
  recentlyUpdated: DashboardItem[];
  unreadFollowed: DashboardItem[];
  recentlyAdded: DashboardItem[];
  stats: DashboardStats;
}

export type DashboardStatus = 'loading' | 'ready' | 'error';

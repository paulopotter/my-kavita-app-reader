import { NativeModules } from 'react-native';

// Mirrors :content-digest's Page/Chapter/Series digest builders (android/content-digest) via
// DigestBridgeModule/DigestBridgeMappers.kt — every shape here is 1:1 with a toWritableMap()
// output, not the original TS contract shapes (chapter.ts/series.ts/page.ts predate the Kotlin
// rewrite and are unrelated). isSuccess discriminates Success/Failure — a digest's own Failure is
// an expected outcome, so it always *resolves* the Promise (never rejects); only a genuinely
// unexpected exception rejects.

export interface ServerActiveInfo {
  groupId: string;
  groupName: string;
  providerId: string;
  urlId: string;
  url: string;
  timeoutMs: number;
  priority: number;
}

export type ImageOrientation = 'PORTRAIT' | 'LANDSCAPE';

export interface ImageDescriptor {
  url: string;
  hasFetchedDimensions: boolean;
  width?: number;
  height?: number;
  aspectRatio?: number;
  orientation?: ImageOrientation;
  resolvedAtEpochMs: number;
  server: ServerActiveInfo;
  cache: null;
}

export interface ErrorDigest {
  code?: string;
  message?: string;
}

// ── PageDigest ───────────────────────────────────────────────────────────

export interface PageDigestSuccess {
  isSuccess: true;
  id: string;
  number: number;
  url: string;
  hasFetchedDimensions: boolean;
  width?: number;
  height?: number;
  aspectRatio?: number;
  orientation?: ImageOrientation;
  resolvedAtEpochMs: number;
  server: ServerActiveInfo;
  cache: null;
  // chapter (ChapterSummary) is deliberately NOT sent over the bridge — see
  // DigestBridgeMappers.kt's own comment: redundant with the ChapterDigest the RN side already
  // has or is fetching separately.
}

export interface DigestFailure {
  isSuccess: false;
  error: ErrorDigest;
}

export type PageDigest = PageDigestSuccess | DigestFailure;

// ── ChapterDigest / ChapterNeighborDigest ───────────────────────────────

export type ChapterReadStatus = 'READ' | 'IN_PROGRESS' | 'UNREAD';
export type ChapterPagesStatus = 'SUCCESS' | 'PARTIAL' | 'ERROR';

export interface ChapterResumePoint {
  stoppedAtPageIndex?: number;
  recordedAtEpochMs?: number;
}

export interface ChapterPages {
  fileFormat?: string;
  status?: ChapterPagesStatus; // absent when the chapter digest wasn't fetched with full=true
  count?: number;
  readCount?: number;
  total?: number; // absent when full=false
  totalWidthPx?: number;
  totalHeightPx?: number;
  resumePoint?: ChapterResumePoint;
  list: PageDigest[]; // empty when full=false
}

// Fields shared by ChapterDigestSuccess and ChapterNeighborDigestSuccess.
interface ChapterFieldsShape {
  id: string;
  seriesId: string;
  decimalNumber?: number;
  number?: number;
  specialLabel?: string;
  isSpecial?: boolean;
  title: string;
  createdUtc?: string;
  coverImage: ImageDescriptor;
  readStatus: ChapterReadStatus;
  pages: ChapterPages;
  resolvedAtEpochMs: number;
  server: ServerActiveInfo;
  cache: null;
}

export interface ChapterNeighborDigestSuccess extends ChapterFieldsShape {
  isSuccess: true;
}

export type ChapterNeighborDigest = ChapterNeighborDigestSuccess | DigestFailure;

export interface ChapterDigestSuccess extends ChapterFieldsShape {
  isSuccess: true;
  prevChapter?: ChapterNeighborDigest;
  nextChapter?: ChapterNeighborDigest;
}

export type ChapterDigest = ChapterDigestSuccess | DigestFailure;

// ── SeriesDigest ─────────────────────────────────────────────────────────

export interface PluginGenreOrTag {
  id: string;
  name: string;
}

export interface PluginAgeRating {
  rating?: string;
  system: string;
}

export interface SeriesLibrary {
  id: string;
  name?: string;
}

export interface SeriesLastUpdatesUTC {
  series?: number;
  chapterAdded?: number;
  readDate?: number;
}

export interface SeriesOtherNames {
  original?: string;
  localized?: string;
}

export interface SeriesOtherIds {
  aniListId?: number;
  malId?: number;
}

export interface SeriesColors {
  primary?: string;
  secondary?: string;
}

export interface SeriesMetadata {
  description?: string;
  genres: PluginGenreOrTag[];
  tags: PluginGenreOrTag[];
  publicationStatus?: string;
  ageRating?: PluginAgeRating;
  releaseYear?: number;
  language?: string;
}

export type SeriesResumePointStatus = 'IN_PROGRESS' | 'UNREAD';

export interface SeriesResumePoint {
  stoppedAtChapterId: string;
  stoppedAtChapterIndex: number;
  status: SeriesResumePointStatus;
  recordedAtEpochMs?: number;
}

export type SeriesChaptersStatus = 'SUCCESS' | 'PARTIAL' | 'ERROR';

export interface SeriesChapters {
  status?: SeriesChaptersStatus; // absent only when chapters.list() itself failed
  readCount?: number;
  total: number;
  resumePoint?: SeriesResumePoint;
  list: ChapterDigest[];
}

export interface SeriesDigestSuccess {
  isSuccess: true;
  id: string;
  name: string;
  library?: SeriesLibrary;
  lastUpdatesUTC?: SeriesLastUpdatesUTC;
  coverImage: ImageDescriptor;
  chapters?: SeriesChapters;
  otherNames?: SeriesOtherNames;
  sortName?: string;
  otherIds?: SeriesOtherIds;
  colors?: SeriesColors;
  metadata?: SeriesMetadata;
  resolvedAtEpochMs: number;
  server: ServerActiveInfo;
  cache: null;
}

export type SeriesDigest = SeriesDigestSuccess | DigestFailure;

// ── bridge module ────────────────────────────────────────────────────────

interface DigestBridgeModuleInterface {
  getPageDigest(seriesId: string, chapterId: string, pageIndex: number): Promise<PageDigest>;
  getChapterDigest(seriesId: string, chapterId: string, full: boolean): Promise<ChapterDigest>;
  getSeriesDigest(seriesId: string, full: boolean): Promise<SeriesDigest>;
}

export const DigestBridge: DigestBridgeModuleInterface = NativeModules.DigestBridgeModule;

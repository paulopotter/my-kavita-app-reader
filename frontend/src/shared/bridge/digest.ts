import { NativeModules } from 'react-native';
import type { CacheDescriptorBridge } from './cache';
import type { ExternalMetadataActiveInfo, ExternalMetadataMatch } from './external';

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
  cache: CacheDescriptorBridge | null;
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
  cache: CacheDescriptorBridge | null;
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

// ── SerialDigest ─────────────────────────────────────────────────────────

export interface PluginGenreOrTag {
  id: string;
  name: string;
}

export interface PluginAgeRating {
  rating?: string;
  system: string;
}

export interface SerialLibrary {
  id: string;
  name?: string;
}

export interface SerialLastUpdatesUTC {
  series?: number;
  chapterAdded?: number;
  readDate?: number;
}

export interface SerialOtherNames {
  original?: string;
  localized?: string;
}

export interface SerialOtherIds {
  aniListId?: number;
  malId?: number;
}

// Kavita's series-level page progress (pagesRead/totalPages) — coarser than chapters.readCount,
// but the only progress the list endpoint carries.
export interface SerialPages {
  read: number;
  total: number;
}

export interface SerialColors {
  primary?: string;
  secondary?: string;
}

// Same {isSuccess, error} shape every XDigest uses on the bridge. A Failure whose error.code is
// "not_configured" means buildExternalMetadataDigest ran but found no ExternalMetadataServer
// group configured — check error.code to tell that apart from a real sync failure.
export interface ExternalMetadataDigestSuccess {
  isSuccess: true;
  match?: ExternalMetadataMatch;
  server: ExternalMetadataActiveInfo;
  resolvedAtEpochMs: number;
}

export type ExternalMetadataDigest = ExternalMetadataDigestSuccess | DigestFailure;

export interface SerialMetadata {
  description?: string;
  genres: PluginGenreOrTag[];
  tags: PluginGenreOrTag[];
  publicationStatus?: string;
  ageRating?: PluginAgeRating;
  releaseYear?: number;
  language?: string;
  // absent when SerialDigestOptions.includeExternalMetadata was false — the caller never asked
  // for enrichment, not the same as "asked and it failed" (see ExternalMetadataDigest.Failure).
  external?: ExternalMetadataDigest;
}

export type SerialResumePointStatus = 'IN_PROGRESS' | 'UNREAD';

export interface SerialResumePoint {
  stoppedAtChapterId: string;
  stoppedAtChapterIndex: number;
  status: SerialResumePointStatus;
  recordedAtEpochMs?: number;
}

export type SerialChaptersStatus = 'SUCCESS' | 'PARTIAL' | 'ERROR';

export interface SerialChapters {
  status?: SerialChaptersStatus; // absent only when chapters.list() itself failed
  readCount?: number;
  total: number;
  resumePoint?: SerialResumePoint;
  list: ChapterDigest[];
}

export interface SerialDigestSuccess {
  isSuccess: true;
  id: string;
  name: string;
  library?: SerialLibrary;
  lastUpdatesUTC?: SerialLastUpdatesUTC;
  coverImage: ImageDescriptor;
  chapters?: SerialChapters;
  otherNames?: SerialOtherNames;
  sortName?: string;
  otherIds?: SerialOtherIds;
  colors?: SerialColors;
  pages?: SerialPages;
  metadata?: SerialMetadata;
  resolvedAtEpochMs: number;
  server: ServerActiveInfo;
  cache: CacheDescriptorBridge | null;
}

export type SerialDigest = SerialDigestSuccess | DigestFailure;

// ── SerialsDigest (list) ─────────────────────────────────────────────────

// The list counterpart of SerialDigest. Each entry is a minimal SerialDigestSuccess assembled
// straight from serials.list() — chapters/metadata/resumePoint absent. lastUpdatedEpochMs is the
// newest cachedAtEpochMs across the per-series caches the build touched (null on an empty list),
// so the Library can show how fresh its data is without any snapshot of its own.
export interface SerialsDigestSuccess {
  isSuccess: true;
  serials: SerialDigest[];
  lastUpdatedEpochMs: number | null;
}

export type SerialsDigest = SerialsDigestSuccess | DigestFailure;

// Only `force` — the Library's pull-to-refresh. Mirrors DigestBridgeModule.getSerialsDigest's
// ReadableMap options.
export interface SerialsDigestOptions {
  force?: boolean;
}

// ── bridge module ────────────────────────────────────────────────────────

// Mirrors DigestBridgeModule.getSerialDigest's own ReadableMap options parameter — full/
// includeExternalMetadata/externalMetadataGroupId/force, all optional (native side defaults each
// to false/undefined when the key is absent). includeExternalMetadata is what actually turns on
// the BFF/M3 enrichment for this call; externalMetadataGroupId is only ever a specific override.
// force skips the cache entirely and re-fetches from the server — a manual pull-to-refresh, never
// a plain mount/focus load.
export interface SerialDigestOptions {
  full?: boolean;
  includeExternalMetadata?: boolean;
  externalMetadataGroupId?: string;
  force?: boolean;
}

// Mirrors DigestBridgeModule.getChapterDigest's own ReadableMap options parameter — full/force,
// same meaning as SerialDigestOptions' own fields of the same name.
export interface ChapterDigestOptions {
  full?: boolean;
  force?: boolean;
}

interface DigestBridgeModuleInterface {
  getPageDigest(seriesId: string, chapterId: string, pageIndex: number): Promise<PageDigest>;
  getChapterDigest(seriesId: string, chapterId: string, options: ChapterDigestOptions): Promise<ChapterDigest>;
  getSerialDigest(seriesId: string, options: SerialDigestOptions): Promise<SerialDigest>;
  getSerialsDigest(options: SerialsDigestOptions): Promise<SerialsDigest>;
}

export const DigestBridge: DigestBridgeModuleInterface = NativeModules.DigestBridgeModule;

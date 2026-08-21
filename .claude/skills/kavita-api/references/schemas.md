# Kavita API — Schema reference

Every DTO referenced from the per-tag endpoint files, resolved once. Nested `SomeDto` names are themselves entries in this file — look them up by heading.

## AgeRatingDto
```
{
  value: AgeRating
  title?: string
}
```

## AnnotationDto
```
{
  id: integer<int32>
  xPath?: string
  endingXPath?: string
  selectedText?: string
  comment?: string
  commentHtml?: string
  commentPlainText?: string
  chapterTitle?: string
  context?: string
  highlightCount: integer<int32>
  containsSpoiler: boolean
  pageNumber: integer<int32>
  selectedSlotIndex: integer<int32>
  likes?: [integer<int32>]
  seriesName?: string
  libraryName?: string
  chapterId: integer<int32>
  volumeId: integer<int32>
  seriesId: integer<int32>
  libraryId: integer<int32>
  ownerUserId: integer<int32>
  ownerUsername?: string
  ageRating: AgeRating
  createdUtc: string<date-time>
  lastModifiedUtc: string<date-time>
}
```

## AnnotationFilterDto
```
{
  id: integer<int32>
  name?: string
  statements?: [AnnotationFilterStatementDto]
  combination: FilterCombination
  sortOptions: AnnotationSortOptionDto
  entityType: FilterEntityType
  limitTo: integer<int32>
}
```

## AppUserCollectionDto
```
{
  id: integer<int32>
  title?: string
  summary?: string
  promoted: boolean
  ageRating: AgeRating
  coverImage?: string
  primaryColor?: string
  secondaryColor?: string
  coverImageLocked: boolean
  itemCount: integer<int32>
  owner?: string
  lastSyncUtc: string<date-time>
  source: ScrobbleProvider
  sourceUrl?: string
  totalSourceCount: integer<int32>
  missingSeriesFromSource?: string
}
```

## AuthKeyDto
```
{
  id: integer<int32>
  key?: string
  name?: string
  createdAtUtc: string<date-time>
  expiresAtUtc?: string<date-time>
  lastAccessedAtUtc?: string<date-time>
  provider: AuthKeyProvider
}
```

## AuthKeyExpiresAtDto
```
{
  expiresAt?: string<date-time>
}
```

## AuthorityValidationDto
```
{
  authority?: string
}
```

## AuthorityValidationResult
*Members:
- `0` — Success
- `1` — InvalidAuthority
- `2` — Failure
- `3` — NotApplicable
- `4` — MissingHttps*
```
enum(0, 1, 2, 3, 4)
```

## BookChapterItem
```
{
  title?: string
  part?: string
  page: integer<int32>
  children?: [BookChapterItem]
}
```

## BookInfoDto
```
{
  bookTitle?: string
  seriesId: integer<int32>
  volumeId: integer<int32>
  seriesFormat: MangaFormat
  seriesName?: string
  chapterNumber?: string
  volumeNumber?: string
  libraryId: integer<int32>
  pages: integer<int32>
  isSpecial: boolean
  chapterTitle?: string
}
```

## BookmarkDto
```
{
  id: integer<int32>
  page: integer<int32>
  volumeId: integer<int32>
  seriesId: integer<int32>
  chapterId: integer<int32>
  imageOffset: integer<int32>
  xPath?: string
  series: SeriesDto
  chapterTitle?: string
}
```

## BookmarkInfoDto
```
{
  seriesName?: string
  seriesFormat: MangaFormat
  seriesId: integer<int32>
  libraryId: integer<int32>
  libraryType: LibraryType
  pages: integer<int32>
  pageDimensions?: [FileDimensionDto]
  doublePairs?: object
}
```

## BrowseGenreDto
```
{
  id: integer<int32>
  title?: string
  seriesCount: integer<int32>
  chapterCount: integer<int32>
}
```

## BrowsePersonDto
```
{
  id: integer<int32>
  name?: string
  coverImageLocked: boolean
  primaryColor?: string
  secondaryColor?: string
  coverImage?: string
  aliases?: [string]
  description?: string
  asin?: string
  aniListId: integer<int32>
  malId: integer<int64>
  hardcoverId?: string
  webLinks?: [string]
  roles?: [PersonRole]
  seriesCount: integer<int32>
  chapterCount: integer<int32>
}
```

## BrowseTagDto
```
{
  id: integer<int32>
  title?: string
  seriesCount: integer<int32>
  chapterCount: integer<int32>
}
```

## BulkActionDto
```
{
  ids?: [integer<int32>]
  force?: boolean
}
```

## BulkChapterSizeRequest
```
{
  chapterIds?: [integer<int32>]
}
```

## BulkReadingListSizeRequest
```
{
  readingListIds?: [integer<int32>]
}
```

## BulkRemoveBookmarkForSeriesDto
```
{
  seriesIds?: [integer<int32>]
}
```

## BulkSeriesSizeRequest
```
{
  seriesIds?: [integer<int32>]
}
```

## BulkSetSeriesProfiles
```
{
  profileIds?: [integer<int32>]
  seriesIds?: [integer<int32>]
}
```

## BulkUpdateSideNavStreamVisibilityDto
```
{
  ids?: [integer<int32>]
  visibility: boolean
}
```

## BulkVolumeSizeRequest
```
{
  volumeIds?: [integer<int32>]
}
```

## CancelKavitaPlusLicenseDto
```
{
  email?: string
  comment?: string
}
```

## CblFinalizeRequestDto
```
{
  fileName?: string
  decisions: CblImportDecisions
  provider: ReadingListProvider
  repoPath?: string
  downloadUrl?: string
  sha?: string
  promote: boolean
}
```

## CblImportSummaryDto
```
{
  cblName?: string
  fileName?: string
  results?: [CblBookResult]
  success: CblImportResult
  successfulInserts?: [CblBookResult]
  isUpdate: boolean
  readingListId: integer<int32>
}
```

## CblReValidateRequestDto
```
{
  fileName?: string
}
```

## CblRepoBrowseResultDto
```
{
  items?: [CblRepoItemDto]
  rateLimitDto: GithubRateLimitDto
  fromCache: boolean
}
```

## CblRepoImportRequestDto
```
{
  items?: [CblRepoItemDto]
}
```

## CblSavedFileDto
```
{
  name?: string
  fileName?: string
  provider: ReadingListProvider
  repoPath?: string
  downloadUrl?: string
  sha?: string
}
```

## ChangeEmailOnLicenseDto
```
{
  oldEmail?: string
  newEmail?: string
}
```

## ChapterDetailPlusDto
```
{
  rating: number<float>
  hasBeenRated: boolean
  reviews?: [UserReviewDto]
  ratings?: [RatingDto]
}
```

## ChapterDto
```
{
  id: integer<int32>
  range?: string
  number?: string
  minNumber: number<float>
  maxNumber: number<float>
  sortOrder: number<float>
  pages: integer<int32>
  isSpecial: boolean
  title?: string
  files?: [MangaFileDto]
  pagesRead: integer<int32>
  totalReads: integer<int32>
  lastReadingProgressUtc: string<date-time>
  lastReadingProgress: string<date-time>
  coverImageLocked: boolean
  volumeId: integer<int32>
  createdUtc: string<date-time>
  lastModifiedUtc: string<date-time>
  created: string<date-time>
  releaseDate: string<date-time>
  titleName?: string
  summary?: string
  ageRating: AgeRating
  wordCount: integer<int64>
  volumeTitle?: string
  minHoursToRead: integer<int32>
  maxHoursToRead: integer<int32>
  avgHoursToRead: number<float>
  webLinks?: string
  isbn?: string
  writers?: [PersonDto]
  coverArtists?: [PersonDto]
  publishers?: [PersonDto]
  characters?: [PersonDto]
  pencillers?: [PersonDto]
  inkers?: [PersonDto]
  imprints?: [PersonDto]
  colorists?: [PersonDto]
  letterers?: [PersonDto]
  editors?: [PersonDto]
  translators?: [PersonDto]
  teams?: [PersonDto]
  locations?: [PersonDto]
  genres?: [GenreTagDto]
  tags?: [TagDto]
  publicationStatus: PublicationStatus
  language?: string
  count: integer<int32>
  totalCount: integer<int32>
  languageLocked: boolean
  summaryLocked: boolean
  ageRatingLocked: boolean
  publicationStatusLocked: boolean
  genresLocked: boolean
  tagsLocked: boolean
  writerLocked: boolean
  characterLocked: boolean
  coloristLocked: boolean
  editorLocked: boolean
  inkerLocked: boolean
  imprintLocked: boolean
  lettererLocked: boolean
  pencillerLocked: boolean
  publisherLocked: boolean
  translatorLocked: boolean
  teamLocked: boolean
  locationLocked: boolean
  coverArtistLocked: boolean
  releaseDateLocked: boolean
  titleNameLocked: boolean
  sortOrderLocked: boolean
  coverImage?: string
  primaryColor?: string
  secondaryColor?: string
  format: MangaFormat
  aniListId: integer<int32>
  malId: integer<int64>
  hardcoverId: integer<int32>
  metronId: integer<int64>
  comicVineId?: string
  mangaBakaId: integer<int32>
  cbrId: integer<int32>
}
```

## ChapterInfoDto
```
{
  chapterNumber?: string
  volumeNumber?: string
  volumeId: integer<int32>
  seriesName?: string
  seriesFormat: MangaFormat
  seriesId: integer<int32>
  libraryId: integer<int32>
  libraryType: LibraryType
  chapterTitle?: string
  pages: integer<int32>
  fileName?: string
  isSpecial: boolean
  subtitle?: string
  title?: string
  seriesTotalPages: integer<int32>
  seriesTotalPagesRead: integer<int32>
  pageDimensions?: [FileDimensionDto]
  doublePairs?: object
}
```

## CheckForFilesInFolderRootsDto
```
{
  roots?: [string]
}
```

## ClientDeviceDto
```
{
  id: integer<int32>
  friendlyName?: string
  uiFingerprint?: string
  currentClientInfo: ClientInfoDto
  firstSeenUtc: string<date-time>
  lastSeenUtc: string<date-time>
  ownerUsername?: string
  ownerUserId: integer<int32>
}
```

## CollectionTagBulkAddDto
```
{
  collectionTagId: integer<int32>
  collectionTagTitle?: string
  seriesIds?: [integer<int32>]
}
```

## ColorScapeDto
```
{
  primary?: string
  secondary?: string
}
```

## ConfirmEmailDto
```
{
  email: string
  token: string
  password: string
  username: string
}
```

## ConfirmEmailUpdateDto
```
{
  email: string
  token: string
}
```

## ConfirmMigrationEmailDto
```
{
  email?: string
  token?: string
}
```

## ConfirmPasswordResetDto
```
{
  email: string
  token: string
  password: string
}
```

## CopySettingsFromLibraryDto
```
{
  sourceLibraryId: integer<int32>
  targetLibraryIds?: [integer<int32>]
  includeType: boolean
}
```

## CreateEmailDeviceDto
```
{
  name: string
  platform: EmailDevicePlatform
  emailAddress: string
}
```

## CreatePersonalToCDto
```
{
  chapterId: integer<int32>
  volumeId: integer<int32>
  seriesId: integer<int32>
  libraryId: integer<int32>
  pageNumber: integer<int32>
  title?: string
  bookScrollId?: string
  selectedText?: string
}
```

## CreateReadingListDto
```
{
  title?: string
}
```

## CreateRemapRuleDto
```
{
  cblSeriesName?: string
  seriesId: integer<int32>
  cblVolume?: string
  cblNumber?: string
  volumeId?: integer<int32>
  chapterId?: integer<int32>
}
```

## DashboardStreamDto
```
{
  id: integer<int32>
  name?: string
  isProvided: boolean
  order: integer<int32>
  smartFilterEncoded?: string
  smartFilterId?: integer<int32>
  streamType: DashboardStreamType
  visible: boolean
  entityType: FilterEntityType
}
```

## DateTimeStatCountWithFormat
```
{
  value: string<date-time>
  count: integer<int64>
  format: MangaFormat
}
```

## DayOfWeekStatCount
```
{
  value: DayOfWeek
  count: integer<int64>
}
```

## DecodeFilterDto
```
{
  encodedFilter?: string
}
```

## DeleteChaptersDto
```
{
  chapterIds?: [integer<int32>]
}
```

## DeleteCollectionsDto
```
{
  collectionIds: [integer<int32>]
}
```

## DeleteReadingListsDto
```
{
  readingListIds: [integer<int32>]
}
```

## DeleteSeriesDto
```
{
  seriesIds?: [integer<int32>]
}
```

## DeviceClientBreakdownDto
```
{
  records?: [ClientDeviceTypeStatCount]
  totalCount: integer<int32>
}
```

## DirectoryDto
```
{
  name?: string
  fullPath?: string
}
```

## DownloadBookmarkDto
```
{
  bookmarks: [BookmarkDto]
}
```

## DownloadableSiteThemeDto
```
{
  name?: string
  cssUrl?: string
  cssFile?: string
  previewUrls?: [string]
  alreadyDownloaded: boolean
  sha?: string
  path?: string
  author?: string
  lastCompatibleVersion?: string
  isCompatible: boolean
  description?: string
}
```

## EmailDeviceDto
```
{
  id: integer<int32>
  name?: string
  emailAddress?: string
  platform: EmailDevicePlatform
}
```

## EmailHistoryDto
```
{
  id: integer<int64>
  sent: boolean
  sendDate: string<date-time>
  emailTemplate?: string
  errorMessage?: string
  toUserName?: string
}
```

## EmailTestResultDto
```
{
  successful: boolean
  errorMessage?: string
  emailAddress?: string
}
```

## EpubFontDto
```
{
  id: integer<int32>
  family?: string
  name?: string
  provider: FontProvider
  fileName?: string
  style?: string
  weight?: string
}
```

## ExternalCoverResponseDto
```
{
  url?: string
  type: ExternalCoverImageType
  number?: number<float>
  language?: string
}
```

## ExternalMetadataIdsDto
```
{
  malId?: integer<int64>
  aniListId?: integer<int32>
  mangabakaId?: integer<int32>
  mangaBakaEditionId?: string
  hardcoverId?: integer<int32>
  isStandAlone: boolean
  cbrId?: integer<int32>
  seriesName?: string
  localizedSeriesName?: string
  plusMediaFormat: PlusMediaFormat
}
```

## ExternalSeriesDetailDto
```
{
  name?: string
  titles: ALMediaTitle
  localizedTitles?: object
  aniListId?: integer<int32>
  malId?: integer<int64>
  cbrId?: integer<int32>
  hardcoverId?: integer<int32>
  isStandAlone: boolean
  mangabakaId?: integer<int32>
  synonyms?: [string]
  plusMediaFormat: PlusMediaFormat
  siteUrl?: string
  coverUrl?: string
  genres?: [string]
  staff?: [SeriesStaffDto]
  tags?: [MetadataTagDto]
  summary?: string
  ageRating: AgeRating
  ageRatingRaw?: string
  provider: ScrobbleProvider
  startDate?: string<date-time>
  endDate?: string<date-time>
  averageScore: integer<int32>
  chapters: integer<int32>
  volumes: integer<int32>
  relations?: [SeriesRelationship]
  characters?: [SeriesCharacter]
  ratings?: [RatingDto]
  publisher?: string
  chapterDtos?: [ExternalChapterDto]
  editions?: [ExternalEditionDto]
}
```

## ExternalSourceDto
```
{
  id: integer<int32>
  name?: string
  host?: string
  apiKey?: string
}
```

## FieldMappingsImportResultDto
```
{
  success: boolean
  resultingMetadataSettings: MetadataSettingsDto
  ageRatingConflicts?: [string]
}
```

## FileDimensionDto
```
{
  width: integer<int32>
  height: integer<int32>
  pageNumber: integer<int32>
  fileName?: string
  isWide: boolean
}
```

## FileExtensionBreakdownDto
```
{
  totalFileSize: integer<int64>
  fileBreakdown?: [FileExtensionDto]
}
```

## FontDeleteResultDto
```
{
  deleted: boolean
  inUse: boolean
}
```

## GenreTagDto
```
{
  id: integer<int32>
  title?: string
}
```

## GenreTagDtoStatCount
```
{
  value: GenreTagDto
  count: integer<int64>
}
```

## GroupedSeriesDto
```
{
  seriesName?: string
  localizedSeriesName?: string
  seriesId: integer<int32>
  libraryId: integer<int32>
  libraryType: LibraryType
  created: string<date-time>
  chapterId: integer<int32>
  volumeId: integer<int32>
  id: integer<int32>
  format: MangaFormat
  count: integer<int32>
}
```

## HourEstimateRangeDto
```
{
  minHours: integer<int32>
  maxHours: integer<int32>
  avgHours: number<float>
  wordCount: integer<int64>
  pageCount: integer<int32>
}
```

## IFilterDto
```
{
  id: integer<int32>
  name?: string
  combination: FilterCombination
  limitTo: integer<int32>
  entityType: FilterEntityType
}
```

## ImportFieldMappingsDto
```
{
  settings: ImportSettingsDto
  data: FieldMappingsDto
}
```

## Int32StatCount
```
{
  value: integer<int32>
  count: integer<int64>
}
```

## InviteUserDto
```
{
  email: string
  roles?: [string]
  libraries?: [integer<int32>]
  ageRestriction: AgeRestrictionDto
}
```

## InviteUserResponse
```
{
  emailLink?: string
  emailSent: boolean
  invalidEmail: boolean
}
```

## JobDto
```
{
  id?: string
  title?: string
  createdAtUtc?: string<date-time>
  lastExecutionUtc?: string<date-time>
  cron?: string
}
```

## JumpKeyDto
```
{
  size: integer<int32>
  key?: string
  title?: string
}
```

## KavitaLocale
```
{
  fileName?: string
  renderName?: string
  translationCompletion: number<float>
  isRtL: boolean
  hash?: string
}
```

## KavitaPlusAuditEntryDto
```
{
  id: integer<int64>
  createdUtc: string<date-time>
  category: KavitaPlusAuditCategory
  eventType: KavitaPlusEventType
  status: AuditStatus
  seriesId?: integer<int32>
  libraryId?: integer<int32>
  seriesName?: string
  subjectType: AuditSubjectType
  subjectId?: integer<int32>
  userId?: integer<int32>
  username?: string
  diff?: [MetadataFieldChangeDto]
  errorMessage?: string
  scrobbleErrorId?: integer<int32>
  scrobbleDetails: KavitaPlusScrobbleDetailsDto
  matchDetails: KavitaPlusAuditMatchDetailsDto
  syncDetails: KavitaPlusAuditSyncDetailsDto
  metadataExtras: KavitaPlusAuditMetadataExtrasDto
  systemDetails: KavitaPlusAuditSystemDetailsDto
  canRetry: boolean
}
```

## KavitaPlusAuditFilterDto
```
{
  category: KavitaPlusAuditCategory
  status: AuditStatus
  subjectType: AuditSubjectType
  provider: ScrobbleProvider
  userId?: integer<int32>
  seriesId?: integer<int32>
  fromUtc?: string<date-time>
  toUtc?: string<date-time>
  search?: string
}
```

## KavitaPlusAuditSeriesInfoDto
```
{
  seriesId: integer<int32>
  libraryId: integer<int32>
  seriesName?: string
  isMatched: boolean
  aniListId?: integer<int32>
  malId?: integer<int64>
  hardcoverId?: integer<int32>
  metronId?: integer<int64>
  comicVineId?: string
  mangaBakaId?: integer<int32>
  cbrId?: integer<int32>
  isStandAlone: boolean
  metadataProvider: MetadataProvider
  nextRefreshUtc?: string<date-time>
  lastRefreshedUtc?: string<date-time>
  recentEvents?: [KavitaPlusAuditEntryDto]
}
```

## KavitaPlusAuditStatsDto
```
{
  events24H: integer<int32>
  failures24H: integer<int32>
  unresolvedMatchFailures: integer<int32>
  matchedSeriesCount: integer<int32>
  totalEligibleSeriesCount: integer<int32>
  staleMatchesCount: integer<int32>
  blacklistedSeriesCount: integer<int32>
  scrobbleQueueCount: integer<int32>
}
```

## KavitaPlusLicenseUsageDto
```
{
  generatedAtUtc: string<date-time>
  stats?: [ApiUsageDto]
}
```

## KavitaPlusMyAuditStatsDto
```
{
  events24H: integer<int32>
  failures24H: integer<int32>
  scrobbleQueueCount: integer<int32>
}
```

## KavitaPlusProductInfoDto
```
{
  productName?: string
  priceAmount: integer<int64>
  priceCurrency?: string
  billingInterval: KavitaPlusBillingInterval
}
```

## KavitaPlusProviderHealthSnapshotDto
```
{
  provider: ScrobbleProvider
  avgLatencyMs: number<double>
  status: KavitaPlusProviderHealthStatus
  lastIncident: KavitaPlusProviderIncidentDto
}
```

## KavitaPlusRegisterResultDto
```
{
  success: boolean
  isSubscriptionActive: boolean
  errorCode: KavitaPlusRegistrationErrorCode
}
```

## KoreaderBookDto
```
{
  document?: string
  device_id?: string
  device?: string
  percentage: number<float>
  progress?: string
  timestamp: integer<int64>
}
```

## KoreaderProgressUpdateDto
```
{
  document?: string
  timestamp: string<date-time>
}
```

## LanguageDto
```
{
  isoCode?: string
  title?: string
}
```

## LibraryDto
```
{
  id: integer<int32>
  name?: string
  type: LibraryType
  lastScanned: string<date-time>
  coverImage?: string
  folderWatching: boolean
  includeInDashboard: boolean
  includeInRecommended: boolean
  manageCollections: boolean
  manageReadingLists: boolean
  includeInSearch: boolean
  allowScrobbling: boolean
  folders?: [string]
  collapseSeriesRelationships: boolean
  libraryFileTypes?: [FileTypeGroup]
  excludePatterns?: [string]
  allowMetadataMatching: boolean
  enableMetadata: boolean
  removePrefixForSortName: boolean
  inheritWebLinksFromFirstChapter: boolean
  defaultLanguage?: string
  metadataProvider: MetadataProvider
}
```

## LibraryDtoStatCount
```
{
  value: LibraryDto
  count: integer<int64>
}
```

## LibraryType
*Members:
- `0` — Manga
- `1` — Comic (Flexible) (Comic)
- `2` — Book
- `3` — Image
- `4` — Light Novel (LightNovel)
- `5` — Comic (ComicVine)*
```
enum(0, 1, 2, 3, 4, 5)
```

## LicenseInfoDto
```
{
  state: KavitaPlusSubscriptionState
  isActive: boolean
  isCancelled: boolean
  expirationDate: string<date-time>
  nextChargeDate?: string<date-time>
  subscribedSince?: string<date-time>
  productName?: string
  priceAmount?: integer<int64>
  priceCurrency?: string
  billingInterval: KavitaPlusBillingInterval
  hasActiveDiscount: boolean
  isValidVersion: boolean
  registeredEmail?: string
  totalMonthsSubbed: integer<int32>
  hasLicense: boolean
  installId?: string
  pastDue: boolean
  discordId?: string
  discordUsername?: string
  hasDiscordSet: boolean
}
```

## LoginDto
```
{
  username?: string
  password?: string
  apiKey?: string
}
```

## MalStackDto
```
{
  title?: string
  stackId: integer<int64>
  url?: string
  author?: string
  seriesCount: integer<int32>
  restackCount: integer<int32>
  existingId: integer<int32>
}
```

## ManageMatchFilterDto
```
{
  matchStateOption: MatchStateOption
  libraryType: integer<int32>
  searchTerm?: string
}
```

## ManageMatchSeriesDto
```
{
  series: SeriesDto
  isMatched: boolean
  validUntilUtc: string<date-time>
}
```

## MangaFormatStatCount
```
{
  value: MangaFormat
  count: integer<int64>
}
```

## MarkChapterReadDto
```
{
  seriesId: integer<int32>
  chapterId: integer<int32>
  generateReadingSession: boolean
}
```

## MarkMultipleSeriesAsReadDto
```
{
  seriesIds?: [integer<int32>]
  generateReadingSession: boolean
}
```

## MarkReadDto
```
{
  seriesId: integer<int32>
  generateReadingSession: boolean
}
```

## MarkVolumeReadDto
```
{
  seriesId: integer<int32>
  volumeId: integer<int32>
  generateReadingSession: boolean
}
```

## MarkVolumesReadDto
```
{
  seriesId: integer<int32>
  volumeIds?: [integer<int32>]
  chapterIds?: [integer<int32>]
  generateReadingSession: boolean
}
```

## MatchSeriesDto
```
{
  seriesId: integer<int32>
  query?: string
  isStandAlone: boolean
  provider: MetadataProvider
}
```

## MatchSeriesInfoDto
```
{
  hasMatch: boolean
  isLegacy: boolean
  plusMediaFormat: PlusMediaFormat
  libraryType: LibraryType
  metadataProvider: MetadataProvider
  seriesFormat: MangaFormat
  mangaBakaId?: integer<int32>
  aniListId?: integer<int32>
  hardcoverId?: integer<int32>
  cbrId?: integer<int32>
  mangaBakaEditionId?: string
  isStandalone: boolean
}
```

## MatchSeriesResultDto
```
{
  provider: MetadataProvider
  matches?: [ExternalSeriesMatchDto]
}
```

## MatchedExternalSeriesCountDto
```
{
  totalCount: integer<int32>
  dontMatchCount: integer<int32>
  notMatchedCount: integer<int32>
  erroredCount: integer<int32>
}
```

## MediaErrorDto
```
{
  extension?: string
  filePath?: string
  comment?: string
  details?: string
  createdUtc: string<date-time>
}
```

## MemberDto
```
{
  id: integer<int32>
  username?: string
  email?: string
  isPending: boolean
  ageRestriction: AgeRestrictionDto
  created: string<date-time>
  createdUtc: string<date-time>
  lastActive: string<date-time>
  lastActiveUtc: string<date-time>
  libraries?: [LibraryDto]
  roles?: [string]
  identityProvider: IdentityProvider
}
```

## MemberInfoDto
```
{
  id: integer<int32>
  username?: string
  created: string<date-time>
  createdUtc: string<date-time>
  coverImage?: string
}
```

## MetadataProvider
*Members:
- `2` — Hardcover
- `3` — Mangabaka
- `4` — ComicBookRoundup*
```
enum(2, 3, 4)
```

## MetadataSettingsDto
```
{
  blacklist?: [string]
  whitelist?: [string]
  ageRatingMappings?: object
  fieldMappings?: [MetadataFieldMappingDto]
  enabled: boolean
  enableExtendedMetadataProcessing: boolean
  enableSummary: boolean
  enablePublicationStatus: boolean
  enableAgeRating: boolean
  enableRelationships: boolean
  enablePeople: boolean
  enableStartDate: boolean
  enableLocalizedName: boolean
  enableName: boolean
  enableCoverImage: boolean
  enableChapterSummary: boolean
  enableChapterReleaseDate: boolean
  enableChapterTitle: boolean
  enableChapterPublisher: boolean
  enableChapterCoverImage: boolean
  enableVolumeCoverImage: boolean
  enableGenres: boolean
  enableTags: boolean
  firstLastPeopleNaming: boolean
  externalAgeRatingMappings?: object
  globalLanguageTitleSettings: SeriesNameLanguageDto
  libraryLanguageTitleOverrides?: object
  overrides?: [MetadataSettingField]
  personRoles?: [PersonRole]
  filterAboveWeight: TagWeight
}
```

## MostReadAuthorsDto
```
{
  authorId: integer<int32>
  authorName?: string
  totalChaptersRead: integer<int32>
  chapters?: [AuthorChapterDto]
}
```

## NextExpectedChapterDto
```
{
  chapterNumber: number<float>
  volumeNumber: number<float>
  expectedDate?: string<date-time>
  title?: string
}
```

## OAuthUpstream
*Members:
- `0` — Discord
- `1` — MangaBaka
- `2` — AniList
- `3` — MyAnimeList*
```
enum(0, 1, 2, 3)
```

## OidcPublicConfigDto
```
{
  autoLogin: boolean
  disablePasswordAuthentication: boolean
  providerName?: string
  enabled: boolean
}
```

## ParseBulkRequestDto
```
{
  names?: [string]
  libraryType: LibraryType
}
```

## ParseBulkResponseDto
```
{
  results?: object
  errors?: object
  errorCounts: integer<int32>
}
```

## ParseResultDto
```
{
  seriesName?: string
  seriesYear?: string
  minChapterNumber: number<float>
  maxChapterNumber: number<float>
  minVolumeNumber: number<float>
  maxVolumeNumber: number<float>
}
```

## PersonAliasCheckDto
```
{
  personId: integer<int32>
  name: string
  alias: string
}
```

## PersonDto
```
{
  id: integer<int32>
  name?: string
  coverImageLocked: boolean
  primaryColor?: string
  secondaryColor?: string
  coverImage?: string
  aliases?: [string]
  description?: string
  asin?: string
  aniListId: integer<int32>
  malId: integer<int64>
  hardcoverId?: string
  webLinks?: [string]
  roles?: [PersonRole]
}
```

## PersonDtoStatCount
```
{
  value: PersonDto
  count: integer<int64>
}
```

## PersonFilterDto
```
{
  id: integer<int32>
  name?: string
  statements?: [PersonFilterStatementDto]
  combination: FilterCombination
  sortOptions: PersonSortOptionDto
  entityType: FilterEntityType
  limitTo: integer<int32>
}
```

## PersonMergeDto
```
{
  destId: integer<int32>
  srcId: integer<int32>
}
```

## PersonRole
*Members:
- `3` — Writer
- `4` — Penciller
- `5` — Inker
- `6` — Colorist
- `7` — Letterer
- `8` — CoverArtist
- `9` — Editor
- `10` — Publisher
- `11` — Character
- `12` — Translator
- `13` — Imprint
- `14` — Team
- `15` — Location*
```
enum(3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)
```

## PersonalToCDto
```
{
  id: integer<int32>
  chapterId: integer<int32>
  pageNumber: integer<int32>
  title?: string
  bookScrollId?: string
  selectedText?: string
  chapterTitle?: string
}
```

## ProfileStatBarDto
```
{
  booksRead: integer<int32>
  comicsRead: integer<int32>
  pagesRead: integer<int32>
  wordsRead: integer<int32>
  authorsRead: integer<int32>
  reviews: integer<int32>
  ratings: integer<int32>
}
```

## ProgressDto
```
{
  volumeId: integer<int32>
  chapterId: integer<int32>
  pageNum: integer<int32>
  seriesId: integer<int32>
  libraryId: integer<int32>
  bookScrollId?: string
  lastModifiedUtc: string<date-time>
}
```

## PromoteCollectionsDto
```
{
  collectionIds?: [integer<int32>]
  promoted: boolean
}
```

## PromoteReadingListsDto
```
{
  readingListIds?: [integer<int32>]
  promoted: boolean
}
```

## PublicationStatusStatCount
```
{
  value: PublicationStatus
  count: integer<int64>
}
```

## QueryContext
*Members:
- `1` — None
- `2` — Search
- `4` — Dashboard*
```
enum(1, 2, 4)
```

## RatingDto
```
{
  averageScore: integer<int32>
  favoriteCount: integer<int32>
  provider: ScrobbleProvider
  authority: RatingAuthority
  providerUrl?: string
}
```

## ReadTimeByHourDto
```
{
  dataSince: string<date-time>
  stats?: [Int32StatCount]
}
```

## ReadingHistoryItemDto
```
{
  sessionDataIds?: [integer<int32>]
  sessionId: integer<int32>
  isGeneratedSession: boolean
  startTimeUtc: string<date-time>
  endTimeUtc: string<date-time>
  localDate: string<date-time>
  seriesId: integer<int32>
  seriesName?: string
  seriesFormat: MangaFormat
  chapters?: [ReadingHistoryChapterItemDto]
  libraryId: integer<int32>
  libraryName?: string
  pagesRead: integer<int32>
  wordsRead: integer<int32>
  durationSeconds: integer<int32>
  totalPages: integer<int32>
}
```

## ReadingListDto
```
{
  id: integer<int32>
  title?: string
  summary?: string
  promoted: boolean
  coverImageLocked: boolean
  coverImage?: string
  primaryColor?: string
  secondaryColor?: string
  itemCount: integer<int32>
  startingYear: integer<int32>
  startingMonth: integer<int32>
  endingYear: integer<int32>
  endingMonth: integer<int32>
  ageRating: AgeRating
  ownerUserName?: string
  sourcePath?: string
  downloadUrl?: string
  shaHash?: string
  provider: ReadingListProvider
  lastSyncCheckUtc?: string<date-time>
  lastSyncedUtc?: string<date-time>
  totalItemsAtImport: integer<int32>
  tags?: [ReadingListTagDto]
  canSync: boolean
}
```

## ReadingListFilterDto
```
{
  id: integer<int32>
  name?: string
  statements?: [ReadingListFilterStatementDto]
  combination: FilterCombination
  sortOptions: ReadingListSortOptionDto
  entityType: FilterEntityType
  limitTo: integer<int32>
}
```

## ReadingListInfoDto
```
{
  pages: integer<int32>
  wordCount: integer<int64>
  isAllEpub: boolean
  minHoursToRead: integer<int32>
  maxHoursToRead: integer<int32>
  avgHoursToRead: number<float>
}
```

## ReadingListItemDto
```
{
  id: integer<int32>
  order: integer<int32>
  chapterId: integer<int32>
  seriesId: integer<int32>
  seriesName?: string
  seriesSortName?: string
  seriesFormat: MangaFormat
  pagesRead: integer<int32>
  pagesTotal: integer<int32>
  chapterNumber?: string
  volumeNumber?: string
  chapterTitleName?: string
  volumeId: integer<int32>
  libraryId: integer<int32>
  title?: string
  libraryType: LibraryType
  libraryName?: string
  releaseDate?: string<date-time>
  readingListId: integer<int32>
  lastReadingProgressUtc?: string<date-time>
  fileSize: integer<int64>
  summary?: string
  isSpecial: boolean
  chapter: ReadingListItemChapterDto
  volume: ReadingListItemVolumeDto
}
```

## ReadingListTagDto
```
{
  id: integer<int32>
  title?: string
  normalizedTitle?: string
}
```

## ReadingPaceDto
```
{
  hoursRead: integer<int32>
  pagesRead: integer<int32>
  wordsRead: integer<int32>
  booksRead: integer<int32>
  comicsRead: integer<int32>
  daysInRange: integer<int32>
}
```

## ReadingSessionDto
```
{
  id: integer<int32>
  startTimeUtc: string<date-time>
  endTimeUtc?: string<date-time>
  isActive: boolean
  activityData?: [ReadingActivityDataDto]
  userId: integer<int32>
  username?: string
}
```

## RefreshSeriesDto
```
{
  libraryId: integer<int32>
  seriesId: integer<int32>
  forceUpdate: boolean
  forceColorscape: boolean
}
```

## RegisterDto
```
{
  username: string
  email?: string
  password: string
}
```

## RelatedSeriesDto
```
{
  sourceSeriesId: integer<int32>
  sequels?: [SeriesDto]
  prequels?: [SeriesDto]
  spinOffs?: [SeriesDto]
  adaptations?: [SeriesDto]
  sideStories?: [SeriesDto]
  characters?: [SeriesDto]
  contains?: [SeriesDto]
  others?: [SeriesDto]
  alternativeSettings?: [SeriesDto]
  alternativeVersions?: [SeriesDto]
  doujinshis?: [SeriesDto]
  parent?: [SeriesDto]
  editions?: [SeriesDto]
  annuals?: [SeriesDto]
  cameos?: [SeriesDto]
}
```

## RelationKind
*Members:
- `1` — Prequel
- `2` — Sequel
- `3` — Spin Off (SpinOff)
- `4` — Adaptation
- `5` — Side Story (SideStory)
- `6` — Character
- `7` — Contains
- `8` — Other
- `9` — Alternative Setting (AlternativeSetting)
- `10` — Alternative Version (AlternativeVersion)
- `11` — Doujinshi
- `12` — Parent
- `13` — Edition
- `14` — Annual
- `16` — Cameo*
```
enum(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16)
```

## RemapRuleDto
```
{
  id: integer<int32>
  normalizedCblSeriesName?: string
  cblSeriesName?: string
  cblVolume?: string
  cblNumber?: string
  seriesId: integer<int32>
  volumeId?: integer<int32>
  volumeNumber?: string
  chapterId?: integer<int32>
  kind: CblRemapRuleKind
  chapterRange?: string
  chapterTitleName?: string
  chapterIsSpecial: boolean
  libraryType: LibraryType
  seriesNameAtMapping?: string
  appUserId: integer<int32>
  isGlobal: boolean
  createdByUserName?: string
  createdUtc: string<date-time>
}
```

## RemoveBookmarkForSeriesDto
```
{
  seriesId: integer<int32>
}
```

## RenewKavitaPlusLicenseDto
```
{
  email: string<email>
  billingInterval: KavitaPlusBillingInterval
}
```

## RereadDto
```
{
  shouldPrompt: boolean
  timePrompt: boolean
  fullReread: boolean
  daysSinceLastRead: integer<int32>
  chapterOnContinue: RereadChapterDto
  chapterOnReread: RereadChapterDto
}
```

## ResetPasswordDto
```
{
  userName: string
  password: string
  oldPassword?: string
}
```

## RotateAuthKeyRequestDto
```
{
  keyLength: integer<int32>
  name: string
  expiresUtc?: string
}
```

## RunMetadataMappingsRequestDto
```
{
  allLibraries: boolean
  includedLibraries?: [integer<int32>]
  excludedLibraries?: [integer<int32>]
}
```

## ScanFolderDto
```
{
  apiKey?: string
  folderPath?: string
  abortOnNoSeriesMatch: boolean
}
```

## ScrobbleErrorDto
```
{
  comment?: string
  details?: string
  seriesId: integer<int32>
  chapterId?: integer<int32>
  libraryId: integer<int32>
  created: string<date-time>
}
```

## ScrobbleEventDto
```
{
  id: integer<int64>
  seriesName?: string
  seriesId: integer<int32>
  libraryId: integer<int32>
  isProcessed: boolean
  volumeNumber?: number<float>
  chapterNumber?: integer<int32>
  lastModifiedUtc: string<date-time>
  createdUtc: string<date-time>
  rating?: number<float>
  readStatus: ScrobbleReadStatus
  scrobbleEventType: ScrobbleEventType
  scrobbleProvider: ScrobbleProvider
  isErrored: boolean
  errorDetails?: string
}
```

## ScrobbleEventFilter
```
{
  field: ScrobbleEventSortField
  isDescending: boolean
  query?: string
  includeReviews: boolean
}
```

## ScrobbleHoldDto
```
{
  seriesName?: string
  seriesId: integer<int32>
  libraryId: integer<int32>
  created: string<date-time>
  createdUtc: string<date-time>
}
```

## ScrobbleProvider
*Members:
- `0` — Kavita
- `1` — AniList
- `2` — Mal
- `4` — Cbr
- `5` — Hardcover
- `6` — MangaBaka*
```
enum(0, 1, 2, 4, 5, 6)
```

## ScrobbleProviderDto
```
{
  provider: ScrobbleProvider
  userName?: string
  authenticationToken?: string
  refreshToken?: string
  validUntilUtc: string<date-time>
  lastSyncedUtc: string<date-time>
  hasRunScrobbleEventGeneration: boolean
  scrobbleEventGenerationRan: string<date-time>
  settings: ScrobbleProviderSettingsDto
}
```

## ScrobbleProviderSettingsDto
```
{
  progressScrobbling: boolean
  wantToReadSync: boolean
  ratingScrobbling: boolean
  reviewsScrobbling: boolean
  reviewScrobbleTarget: ReviewScrobbleTarget
  allLibraries: boolean
  libraries?: [integer<int32>]
  highestAgeRating: AgeRating
  inactiveSeriesRule: ReadStatusTransitionRule
  droppedSeriesRule: ReadStatusTransitionRule
}
```

## SearchResultGroupDto
```
{
  libraries?: [LibraryDto]
  series?: [SearchResultDto]
  collections?: [AppUserCollectionDto]
  readingLists?: [ReadingListDto]
  persons?: [PersonDto]
  genres?: [GenreTagDto]
  tags?: [TagDto]
  files?: [MangaFileDto]
  chapters?: [ChapterDto]
  bookmarks?: [BookmarkSearchResultDto]
  annotations?: [AnnotationDto]
}
```

## SendSeriesToEmailDeviceDto
```
{
  deviceId: integer<int32>
  seriesId: integer<int32>
}
```

## SendToEmailDeviceDto
```
{
  deviceId: integer<int32>
  chapterIds?: [integer<int32>]
}
```

## SeriesByIdsDto
```
{
  seriesIds?: [integer<int32>]
}
```

## SeriesDetailDto
```
{
  specials?: [ChapterDto]
  chapters?: [ChapterDto]
  volumes?: [VolumeDto]
  storylineChapters?: [ChapterDto]
  libraryType: LibraryType
  unreadCount: integer<int32>
  totalCount: integer<int32>
}
```

## SeriesDetailPlusDto
```
{
  recommendations: RecommendationDto
  reviews?: [UserReviewDto]
  ratings?: [RatingDto]
  series: ExternalSeriesDetailDto
}
```

## SeriesDto
```
{
  id: integer<int32>
  name?: string
  originalName?: string
  localizedName?: string
  sortName?: string
  pages: integer<int32>
  coverImageLocked: boolean
  lastChapterAdded: string<date-time>
  lastChapterAddedUtc: string<date-time>
  userRating: number<float>
  hasUserRated: boolean
  totalReads: integer<int32>
  pagesRead: integer<int32>
  latestReadDate: string<date-time>
  format: MangaFormat
  created: string<date-time>
  sortNameLocked: boolean
  localizedNameLocked: boolean
  nameLocked: boolean
  wordCount: integer<int64>
  libraryId: integer<int32>
  libraryName?: string
  minHoursToRead: integer<int32>
  maxHoursToRead: integer<int32>
  avgHoursToRead: number<float>
  folderPath?: string
  lowestFolderPath?: string
  lastFolderScanned: string<date-time>
  dontMatch: boolean
  isBlacklisted: boolean
  isStandAlone: boolean
  metadataProviderOverride: MetadataProvider
  coverImage?: string
  primaryColor?: string
  secondaryColor?: string
  aniListId: integer<int32>
  malId: integer<int64>
  hardcoverId: integer<int32>
  metronId: integer<int64>
  comicVineId?: string
  mangaBakaId: integer<int32>
  mangaBakaEditionId?: string
  cbrId: integer<int32>
}
```

## SeriesDtoStatCount
```
{
  value: SeriesDto
  count: integer<int64>
}
```

## SeriesFilterV2Dto
```
{
  id: integer<int32>
  name?: string
  statements?: [SeriesFilterStatementDto]
  combination: FilterCombination
  sortOptions: SeriesSortOptionDto
  entityType: FilterEntityType
  limitTo: integer<int32>
}
```

## SeriesMetadataDto
```
{
  id: integer<int32>
  summary?: string
  genres?: [GenreTagDto]
  tags?: [TagDto]
  writers?: [PersonDto]
  coverArtists?: [PersonDto]
  publishers?: [PersonDto]
  characters?: [PersonDto]
  pencillers?: [PersonDto]
  inkers?: [PersonDto]
  imprints?: [PersonDto]
  colorists?: [PersonDto]
  letterers?: [PersonDto]
  editors?: [PersonDto]
  translators?: [PersonDto]
  teams?: [PersonDto]
  locations?: [PersonDto]
  ageRating: AgeRating
  releaseYear: integer<int32>
  language?: string
  maxCount: integer<int32>
  totalCount: integer<int32>
  publicationStatus: PublicationStatus
  webLinks?: string
  languageLocked: boolean
  summaryLocked: boolean
  ageRatingLocked: boolean
  publicationStatusLocked: boolean
  genresLocked: boolean
  tagsLocked: boolean
  writerLocked: boolean
  characterLocked: boolean
  coloristLocked: boolean
  editorLocked: boolean
  inkerLocked: boolean
  imprintLocked: boolean
  lettererLocked: boolean
  pencillerLocked: boolean
  publisherLocked: boolean
  translatorLocked: boolean
  teamLocked: boolean
  locationLocked: boolean
  coverArtistLocked: boolean
  releaseYearLocked: boolean
  seriesId: integer<int32>
}
```

## ServerInfoSlimDto
```
{
  installId?: string
  isDocker: boolean
  kavitaVersion?: string
  firstInstallDate?: string<date-time>
  firstInstallVersion?: string
}
```

## ServerSettingDto
```
{
  cacheDirectory?: string
  taskScan?: string
  taskBackup?: string
  taskCleanup?: string
  taskCblSync?: string
  loggingLevel?: string
  port: integer<int32>
  ipAddresses?: string
  allowStatCollection: boolean
  enableOpds: boolean
  baseUrl?: string
  bookmarksDirectory?: string
  installVersion?: string
  installId?: string
  encodeMediaAs: EncodeFormat
  totalBackups: integer<int32>
  enableFolderWatching: boolean
  totalLogs: integer<int32>
  hostName?: string
  cacheSize: integer<int64>
  onDeckProgressDays: integer<int32>
  onDeckUpdateDays: integer<int32>
  coverImageSize: CoverImageSize
  pdfRenderResolution: PdfRenderResolution
  smtpConfig: SmtpConfigDto
  oidcConfig: OidcConfigDto
  firstInstallDate?: string<date-time>
  firstInstallVersion?: string
  statsApiHits: integer<int32>
}
```

## ServerStatisticsDto
```
{
  chapterCount: integer<int64>
  volumeCount: integer<int64>
  seriesCount: integer<int64>
  totalFiles: integer<int64>
  totalSize: integer<int64>
  totalGenres: integer<int64>
  totalTags: integer<int64>
  totalPeople: integer<int64>
  totalReadingTime: integer<int64>
}
```

## SideNavStreamDto
```
{
  id: integer<int32>
  name?: string
  isProvided: boolean
  order: integer<int32>
  smartFilterEncoded?: string
  smartFilterId?: integer<int32>
  externalSourceId: integer<int32>
  externalSource: ExternalSourceDto
  streamType: SideNavStreamType
  visible: boolean
  libraryId?: integer<int32>
  library: LibraryDto
  entityType: FilterEntityType
}
```

## SiteThemeDto
```
{
  id: integer<int32>
  name?: string
  normalizedName?: string
  fileName?: string
  isDefault: boolean
  provider: ThemeProvider
  previewUrls?: [string]
  description?: string
  author?: string
  compatibleVersion?: string
  selector?: string
}
```

## SmartFilterDto
```
{
  id: integer<int32>
  name?: string
  filter?: string
  entityType: FilterEntityType
}
```

## SpreadStatsDto
```
{
  buckets?: [StatBucketDto]
  totalCount: integer<int32>
}
```

## StandaloneChapterDto
```
{
  id: integer<int32>
  range?: string
  number?: string
  minNumber: number<float>
  maxNumber: number<float>
  sortOrder: number<float>
  pages: integer<int32>
  isSpecial: boolean
  title?: string
  files?: [MangaFileDto]
  pagesRead: integer<int32>
  totalReads: integer<int32>
  lastReadingProgressUtc: string<date-time>
  lastReadingProgress: string<date-time>
  coverImageLocked: boolean
  volumeId: integer<int32>
  createdUtc: string<date-time>
  lastModifiedUtc: string<date-time>
  created: string<date-time>
  releaseDate: string<date-time>
  titleName?: string
  summary?: string
  ageRating: AgeRating
  wordCount: integer<int64>
  minHoursToRead: integer<int32>
  maxHoursToRead: integer<int32>
  avgHoursToRead: number<float>
  webLinks?: string
  isbn?: string
  writers?: [PersonDto]
  coverArtists?: [PersonDto]
  publishers?: [PersonDto]
  characters?: [PersonDto]
  pencillers?: [PersonDto]
  inkers?: [PersonDto]
  imprints?: [PersonDto]
  colorists?: [PersonDto]
  letterers?: [PersonDto]
  editors?: [PersonDto]
  translators?: [PersonDto]
  teams?: [PersonDto]
  locations?: [PersonDto]
  genres?: [GenreTagDto]
  tags?: [TagDto]
  publicationStatus: PublicationStatus
  language?: string
  count: integer<int32>
  totalCount: integer<int32>
  languageLocked: boolean
  summaryLocked: boolean
  ageRatingLocked: boolean
  publicationStatusLocked: boolean
  genresLocked: boolean
  tagsLocked: boolean
  writerLocked: boolean
  characterLocked: boolean
  coloristLocked: boolean
  editorLocked: boolean
  inkerLocked: boolean
  imprintLocked: boolean
  lettererLocked: boolean
  pencillerLocked: boolean
  publisherLocked: boolean
  translatorLocked: boolean
  teamLocked: boolean
  locationLocked: boolean
  coverArtistLocked: boolean
  releaseDateLocked: boolean
  titleNameLocked: boolean
  sortOrderLocked: boolean
  coverImage?: string
  primaryColor?: string
  secondaryColor?: string
  format: MangaFormat
  aniListId: integer<int32>
  malId: integer<int64>
  hardcoverId: integer<int32>
  metronId: integer<int64>
  comicVineId?: string
  mangaBakaId: integer<int32>
  cbrId: integer<int32>
  seriesId: integer<int32>
  libraryId: integer<int32>
  libraryType: LibraryType
  volumeTitle?: string
}
```

## StatBucketDto
```
{
  rangeStart: integer<int32>
  rangeEnd?: integer<int32>
  count: integer<int32>
  percentage: number<double>
}
```

## StringBreakDownDto
```
{
  data?: [StringStatCount]
  total: integer<int32>
  totalOptions: integer<int32>
  missing: integer<int32>
}
```

## StringStatCount
```
{
  value?: string
  count: integer<int64>
}
```

## TachiyomiChapterDto
```
{
  id: integer<int32>
  range?: string
  minNumber: number<float>
  maxNumber: number<float>
  sortOrder: number<float>
  pages: integer<int32>
  isSpecial: boolean
  title?: string
  files?: [MangaFileDto]
  pagesRead: integer<int32>
  totalReads: integer<int32>
  lastReadingProgressUtc: string<date-time>
  lastReadingProgress: string<date-time>
  coverImageLocked: boolean
  volumeId: integer<int32>
  createdUtc: string<date-time>
  lastModifiedUtc: string<date-time>
  created: string<date-time>
  releaseDate: string<date-time>
  titleName?: string
  summary?: string
  ageRating: AgeRating
  wordCount: integer<int64>
  volumeTitle?: string
  minHoursToRead: integer<int32>
  maxHoursToRead: integer<int32>
  avgHoursToRead: number<float>
  webLinks?: string
  isbn?: string
  writers?: [PersonDto]
  coverArtists?: [PersonDto]
  publishers?: [PersonDto]
  characters?: [PersonDto]
  pencillers?: [PersonDto]
  inkers?: [PersonDto]
  imprints?: [PersonDto]
  colorists?: [PersonDto]
  letterers?: [PersonDto]
  editors?: [PersonDto]
  translators?: [PersonDto]
  teams?: [PersonDto]
  locations?: [PersonDto]
  genres?: [GenreTagDto]
  tags?: [TagDto]
  publicationStatus: PublicationStatus
  language?: string
  count: integer<int32>
  totalCount: integer<int32>
  languageLocked: boolean
  summaryLocked: boolean
  ageRatingLocked: boolean
  publicationStatusLocked: boolean
  genresLocked: boolean
  tagsLocked: boolean
  writerLocked: boolean
  characterLocked: boolean
  coloristLocked: boolean
  editorLocked: boolean
  inkerLocked: boolean
  imprintLocked: boolean
  lettererLocked: boolean
  pencillerLocked: boolean
  publisherLocked: boolean
  translatorLocked: boolean
  teamLocked: boolean
  locationLocked: boolean
  coverArtistLocked: boolean
  releaseDateLocked: boolean
  titleNameLocked: boolean
  sortOrderLocked: boolean
  coverImage?: string
  primaryColor?: string
  secondaryColor?: string
  format: MangaFormat
  aniListId: integer<int32>
  malId: integer<int64>
  hardcoverId: integer<int32>
  metronId: integer<int64>
  comicVineId?: string
  mangaBakaId: integer<int32>
  cbrId: integer<int32>
  number?: string
}
```

## TagDto
```
{
  id: integer<int32>
  title?: string
}
```

## TagDtoStatCount
```
{
  value: TagDto
  count: integer<int64>
}
```

## TokenRequestDto
```
{
  token?: string
  refreshToken?: string
}
```

## TopReadDto
```
{
  userId: integer<int32>
  username?: string
  comicsTime: number<float>
  booksTime: number<float>
  mangaTime: number<float>
}
```

## UpdateAgeRestrictionDto
```
{
  ageRating: AgeRating
  includeUnknowns: boolean
}
```

## UpdateChapterDto
```
{
  id: integer<int32>
  summary?: string
  genres?: [GenreTagDto]
  tags?: [TagDto]
  writers?: [PersonDto]
  coverArtists?: [PersonDto]
  publishers?: [PersonDto]
  characters?: [PersonDto]
  pencillers?: [PersonDto]
  inkers?: [PersonDto]
  imprints?: [PersonDto]
  colorists?: [PersonDto]
  letterers?: [PersonDto]
  editors?: [PersonDto]
  translators?: [PersonDto]
  teams?: [PersonDto]
  locations?: [PersonDto]
  ageRating: AgeRating
  language?: string
  ageRatingLocked: boolean
  titleNameLocked: boolean
  genresLocked: boolean
  tagsLocked: boolean
  writerLocked: boolean
  characterLocked: boolean
  coloristLocked: boolean
  editorLocked: boolean
  inkerLocked: boolean
  imprintLocked: boolean
  lettererLocked: boolean
  pencillerLocked: boolean
  publisherLocked: boolean
  translatorLocked: boolean
  teamLocked: boolean
  locationLocked: boolean
  coverArtistLocked: boolean
  languageLocked: boolean
  summaryLocked: boolean
  isbnLocked: boolean
  releaseDateLocked: boolean
  sortOrder: number<float>
  sortOrderLocked: boolean
  webLinks?: string
  isbn?: string
  releaseDate: string<date-time>
  titleName?: string
  aniListId?: integer<int32>
  malId?: integer<int64>
  hardcoverId?: integer<int32>
  metronId?: integer<int64>
  comicVineId?: string
  mangaBakaId?: integer<int32>
  cbrId?: integer<int32>
}
```

## UpdateClientDeviceNameDto
```
{
  deviceId: integer<int32>
  name?: string
}
```

## UpdateDefaultThemeDto
```
{
  themeId: integer<int32>
}
```

## UpdateEmailDeviceDto
```
{
  id: integer<int32>
  name: string
  platform: EmailDevicePlatform
  emailAddress: string
}
```

## UpdateEmailDto
```
{
  email?: string
  password?: string
}
```

## UpdateLibraryDto
```
{
  id: integer<int32>
  name: string
  type: LibraryType
  folders: [string]
  folderWatching: boolean
  includeInDashboard: boolean
  includeInSearch: boolean
  manageCollections: boolean
  manageReadingLists: boolean
  allowScrobbling: boolean
  allowMetadataMatching: boolean
  enableMetadata: boolean
  removePrefixForSortName: boolean
  inheritWebLinksFromFirstChapter: boolean
  defaultLanguage?: string
  metadataProvider: MetadataProvider
  fileGroupTypes: [FileTypeGroup]
  excludePatterns: [string]
}
```

## UpdateLibraryForUserDto
```
{
  username?: string
  selectedLibraries?: [LibraryDto]
}
```

## UpdateLicenseDto
```
{
  license?: string
  email?: string
  discordId?: string
}
```

## UpdateNotificationDto
```
{
  currentVersion?: string
  updateVersion?: string
  updateBody?: string
  updateTitle?: string
  updateUrl?: string
  isDocker: boolean
  isPrerelease: boolean
  publishDate?: string
  isOnNightlyInRelease: boolean
  isReleaseNewer: boolean
  isReleaseEqual: boolean
  added?: [string]
  removed?: [string]
  changed?: [string]
  fixed?: [string]
  theme?: [string]
  developer?: [string]
  api?: [string]
  featureRequests?: [string]
  knownIssues?: [string]
  blogPart?: string
}
```

## UpdatePersonDto
```
{
  id: integer<int32>
  coverImageLocked: boolean
  name: string
  aliases?: [string]
  description?: string
  aniListId?: integer<int32>
  malId?: integer<int64>
  hardcoverId?: string
  asin?: string
}
```

## UpdateRatingDto
```
{
  seriesId: integer<int32>
  chapterId?: integer<int32>
  userRating: number<float>
}
```

## UpdateReadingListByChapterDto
```
{
  chapterId: integer<int32>
  seriesId: integer<int32>
  readingListId: integer<int32>
}
```

## UpdateReadingListByMultipleDto
```
{
  seriesId: integer<int32>
  readingListId: integer<int32>
  volumeIds?: [integer<int32>]
  chapterIds?: [integer<int32>]
}
```

## UpdateReadingListByMultipleSeriesDto
```
{
  readingListId: integer<int32>
  seriesIds?: [integer<int32>]
}
```

## UpdateReadingListBySeriesDto
```
{
  seriesId: integer<int32>
  readingListId: integer<int32>
}
```

## UpdateReadingListByVolumeDto
```
{
  volumeId: integer<int32>
  seriesId: integer<int32>
  readingListId: integer<int32>
}
```

## UpdateReadingListDto
```
{
  readingListId: integer<int32>
  title?: string
  summary?: string
  promoted: boolean
  coverImageLocked: boolean
  startingMonth: integer<int32>
  startingYear: integer<int32>
  endingMonth: integer<int32>
  endingYear: integer<int32>
  tags?: [string]
}
```

## UpdateReadingListPosition
```
{
  readingListId: integer<int32>
  readingListItemId: integer<int32>
  fromPosition: integer<int32>
  toPosition: integer<int32>
}
```

## UpdateRelatedSeriesDto
```
{
  seriesId: integer<int32>
  adaptations?: [integer<int32>]
  characters?: [integer<int32>]
  contains?: [integer<int32>]
  others?: [integer<int32>]
  prequels?: [integer<int32>]
  sequels?: [integer<int32>]
  sideStories?: [integer<int32>]
  spinOffs?: [integer<int32>]
  alternativeSettings?: [integer<int32>]
  alternativeVersions?: [integer<int32>]
  doujinshis?: [integer<int32>]
  editions?: [integer<int32>]
  annuals?: [integer<int32>]
  cameos?: [integer<int32>]
}
```

## UpdateRemapRuleDto
```
{
  cblSeriesName?: string
  seriesId?: integer<int32>
  volumeId?: integer<int32>
  chapterId?: integer<int32>
  cblVolume?: string
  cblNumber?: string
}
```

## UpdateScrobbleProviderDto
```
{
  provider: ScrobbleProvider
  userName?: string
  authenticationToken?: string
  refreshToken?: string
}
```

## UpdateSeriesDto
```
{
  id: integer<int32>
  name?: string
  localizedName?: string
  sortName?: string
  coverImageLocked: boolean
  nameLocked: boolean
  sortNameLocked: boolean
  localizedNameLocked: boolean
  metadataProviderOverride: MetadataProvider
  aniListId?: integer<int32>
  malId?: integer<int64>
  hardcoverId?: integer<int32>
  metronId?: integer<int64>
  comicVineId?: string
  mangaBakaId?: integer<int32>
  cbrId?: integer<int32>
}
```

## UpdateSeriesForTagDto
```
{
  tag: AppUserCollectionDto
  seriesIdsToRemove?: [integer<int32>]
}
```

## UpdateSeriesMetadataDto
```
{
  seriesMetadata: SeriesMetadataDto
}
```

## UpdateStreamPositionDto
```
{
  streamName?: string
  id: integer<int32>
  fromPosition: integer<int32>
  toPosition: integer<int32>
  positionIncludesInvisible: boolean
}
```

## UpdateUserDto
```
{
  userId: integer<int32>
  username?: string
  roles?: [string]
  libraries?: [integer<int32>]
  ageRestriction: AgeRestrictionDto
  email?: string
  identityProvider: IdentityProvider
}
```

## UpdateUserReviewDto
```
{
  seriesId: integer<int32>
  chapterId?: integer<int32>
  body?: string
}
```

## UpdateUsernameRequestDto
```
{
  username?: string
}
```

## UpdateVolumeDto
```
{
  id: integer<int32>
  aniListId?: integer<int32>
  malId?: integer<int64>
  hardcoverId?: integer<int32>
  metronId?: integer<int64>
  comicVineId?: string
  mangaBakaId?: integer<int32>
  cbrId?: integer<int32>
}
```

## UpdateWantToReadDto
```
{
  seriesIds?: [integer<int32>]
}
```

## UploadCoverFileDto
```
{
  id: integer<int32>
  url?: string
  fileName?: string
  lockCover: boolean
}
```

## UploadUrlDto
```
{
  url: string
}
```

## UserDto
```
{
  id: integer<int32>
  oidcId?: string
  username?: string
  email?: string
  roles?: [string]
  token?: string
  refreshToken?: string
  apiKey?: string
  preferences: UserPreferencesDto
  ageRestriction: AgeRestrictionDto
  kavitaVersion?: string
  identityProvider: IdentityProvider
  created: string<date-time>
  createdUtc: string<date-time>
  authKeys?: [AuthKeyDto]
  coverImage?: string
  primaryColor?: string
  secondaryColor?: string
}
```

## UserParams
```
{
  pageNumber: integer<int32>
  pageSize: integer<int32>
}
```

## UserPreferencesDto
```
{
  theme: SiteThemeDto
  globalPageLayoutMode: PageLayoutMode
  blurUnreadSummaries: boolean
  promptForDownloadSize: boolean
  noTransitions: boolean
  collapseSeriesRelationships: boolean
  locale: string
  colorScapeEnabled: boolean
  dataSaver: boolean
  promptForRereadsAfter: integer<int32>
  customKeyBinds: {
    NavigateToSettings: [KeyBind]
    OpenSearch: [KeyBind]
    NavigateToScrobbling: [KeyBind]
    ToggleFullScreen: [KeyBind]
    BookmarkPage: [KeyBind]
    OpenHelp: [KeyBind]
    GoTo: [KeyBind]
    ToggleMenu: [KeyBind]
    PageLeft: [KeyBind]
    PageRight: [KeyBind]
    Escape: [KeyBind]
    PageUp: [KeyBind]
    PageDown: [KeyBind]
    OffsetDoublePage: [KeyBind]
    NextChapter: [KeyBind]
    PreviousChapter: [KeyBind]
    FirstPage: [KeyBind]
    LastPage: [KeyBind]
    NavigateHome: [KeyBind]
  }
  aniListScrobblingEnabled: boolean
  wantToReadSync: boolean
  bookReaderHighlightSlots: [HighlightSlot]
  socialPreferences: AppUserSocialPreferences
  opdsPreferences: AppUserOpdsPreferences
}
```

## UserReadStatistics
```
{
  totalPagesRead: integer<int64>
  totalWordsRead: integer<int64>
  timeSpentReading: integer<int64>
  lastActiveUtc?: string<date-time>
  avgHoursPerWeekSpentReading: number<double>
}
```

## UserReadingProfileDto
```
{
  id: integer<int32>
  userId: integer<int32>
  name?: string
  kind: ReadingProfileKind
  deviceIds?: [integer<int32>]
  seriesIds?: [integer<int32>]
  libraryIds?: [integer<int32>]
  readingDirection: ReadingDirection
  scalingOption: ScalingOption
  pageSplitOption: PageSplitOption
  readerMode: ReaderMode
  autoCloseMenu: boolean
  showScreenHints: boolean
  emulateBook: boolean
  layoutMode: LayoutMode
  backgroundColor: string
  swipeToPaginate: boolean
  allowAutomaticWebtoonReaderDetection: boolean
  widthOverride?: integer<int32>
  disableWidthOverride: BreakPoint
  bookReaderMargin: integer<int32>
  bookReaderLineSpacing: integer<int32>
  bookReaderFontSize: integer<int32>
  bookReaderFontFamily: string
  bookReaderTapToPaginate: boolean
  bookReaderReadingDirection: ReadingDirection
  bookReaderWritingStyle: WritingStyle
  bookReaderThemeName: string
  bookReaderLayoutMode: BookPageLayoutMode
  bookReaderImmersiveMode: boolean
  bookReaderDisableBookmarkIcon: boolean
  pdfTheme: PdfTheme
  pdfScrollMode: PdfScrollMode
  pdfSpreadMode: PdfSpreadMode
}
```

## UserReviewDto
```
{
  tagline?: string
  body?: string
  bodyJustText?: string
  seriesId: integer<int32>
  chapterId?: integer<int32>
  libraryId: integer<int32>
  username?: string
  userId: integer<int32>
  totalVotes: integer<int32>
  rating: number<float>
  rawBody?: string
  score: integer<int32>
  siteUrl?: string
  isExternal: boolean
  provider: ScrobbleProvider
  authority: RatingAuthority
}
```

## UserReviewExtendedDto
```
{
  id: integer<int32>
  body?: string
  seriesId: integer<int32>
  chapterId?: integer<int32>
  libraryId: integer<int32>
  username?: string
  rating: number<float>
  series: SeriesDto
  chapter: ChapterDto
  createdUtc: string<date-time>
  writers?: [PersonDto]
}
```

## UserTokenInfoDto
```
{
  userId: integer<int32>
  username?: string
  tokens?: [TokenValidityInfoDto]
}
```

## VolumeDto
```
{
  id: integer<int32>
  minNumber: number<float>
  maxNumber: number<float>
  name?: string
  number: integer<int32>
  pages: integer<int32>
  pagesRead: integer<int32>
  lastModifiedUtc: string<date-time>
  createdUtc: string<date-time>
  created: string<date-time>
  lastModified: string<date-time>
  seriesId: integer<int32>
  chapters?: [ChapterDto]
  minHoursToRead: integer<int32>
  maxHoursToRead: integer<int32>
  avgHoursToRead: number<float>
  wordCount: integer<int64>
  coverImage?: string
  primaryColor?: string
  secondaryColor?: string
  aniListId: integer<int32>
  malId: integer<int64>
  hardcoverId: integer<int32>
  metronId: integer<int64>
  comicVineId?: string
  mangaBakaId: integer<int32>
  cbrId: integer<int32>
}
```

## YearMonthGroupingDtoStatCount
```
{
  value: YearMonthGroupingDto
  count: integer<int64>
}
```

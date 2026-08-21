# Kavita API — Series

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Series/age-rating
*Get the age rating for the Kavita.Models.Entities.Enums.AgeRating enum value*

**Parameters:**
- `ageRating` (query, optional): integer<int32>

**Responses:**
**200** OK
```
string
```

---

## GET /api/Series/all-related
*Returns all related series against the passed series Id*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
RelatedSeriesDto
```

**See schemas:** RelatedSeriesDto

---

## POST /api/Series/all-v2
*Returns all series for the library*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>
- `userId` (query, optional): integer<int32>
- `context` (query, optional): QueryContext

**Request body:**
```
SeriesFilterV2Dto
```

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** QueryContext, SeriesDto, SeriesFilterV2Dto

---

## POST /api/Series/analyze
*Run a file analysis on the series.*

**Request body:**
```
RefreshSeriesDto
```

**Responses:**
**200** OK

**See schemas:** RefreshSeriesDto

---

## GET /api/Series/chapter
*Returns a single Chapter with progress information*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ChapterDto
```

**See schemas:** ChapterDto

---

## GET /api/Series/currently-reading
*Get series a user is currently reading, requires the user to share their profile*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** SeriesDto

---

## POST /api/Series/delete-multiple
*Deletes multiple series from Kavita at once*

**Request body:**
```
DeleteSeriesDto
```

**Responses:**
**200** OK

**See schemas:** DeleteSeriesDto

---

## POST /api/Series/dont-match
*When true, will not perform a match and will prevent Kavita from attempting to match/scrobble against this series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `dontMatch` (query, optional): boolean

**Responses:**
**200** OK

---

## GET /api/Series/external-series-detail
*Returns external series metadata around a Given External Series*

**Parameters:**
- `aniListId` (query, optional): integer<int32>
- `malId` (query, optional): integer<int64>
- `mangaBakaId` (query, optional): integer<int32>
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ExternalSeriesDetailDto
```

**See schemas:** ExternalSeriesDetailDto

---

## POST /api/Series/match
*Sends a request to Kavita+ API for all potential matches, sorted by relevance*

**Request body:**
```
MatchSeriesDto
```

**Responses:**
**200** OK
```
MatchSeriesResultDto
```

**See schemas:** MatchSeriesDto, MatchSeriesResultDto

---

## GET /api/Series/match-info
*Returns extra information around an existing match (and series) to display on the Match Screen.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
MatchSeriesInfoDto
```

**See schemas:** MatchSeriesInfoDto

---

## GET /api/Series/metadata
*Returns metadata for a given series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
SeriesMetadataDto
```

**See schemas:** SeriesMetadataDto

---

## POST /api/Series/metadata
*Update series metadata*

**Request body:**
```
UpdateSeriesMetadataDto
```

**Responses:**
**200** OK

**See schemas:** UpdateSeriesMetadataDto

---

## GET /api/Series/next-expected
*Based on the delta times between when chapters are added, for series that are not Completed/Cancelled/Hiatus, forecast the next
date when it will be available.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
NextExpectedChapterDto
```

**See schemas:** NextExpectedChapterDto

---

## POST /api/Series/on-deck
*Fetches series that are on deck aka have progress on them.*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** SeriesDto

---

## POST /api/Series/recently-added-v2
*Gets all recently added series*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
SeriesFilterV2Dto
```

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** SeriesDto, SeriesFilterV2Dto

---

## POST /api/Series/recently-updated-series
*Returns series that were recently updated, like adding or removing a chapter*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[GroupedSeriesDto]
```

**See schemas:** GroupedSeriesDto

---

## POST /api/Series/refresh-metadata
*Runs a Cover Image Generation task*

**Request body:**
```
RefreshSeriesDto
```

**Responses:**
**200** OK

**See schemas:** RefreshSeriesDto

---

## GET /api/Series/related
*Fetches the related series for a given series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `relation` (query, optional): RelationKind

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** RelationKind, SeriesDto

---

## POST /api/Series/remove-from-on-deck
*Removes a series from displaying on deck until the next read event on that series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/Series/scan
*Scan a series and force each file to be updated. This should be invoked via the User, hence why we force.*

**Request body:**
```
RefreshSeriesDto
```

**Responses:**
**200** OK

**See schemas:** RefreshSeriesDto

---

## GET /api/Series/series-by-collection
*Returns all Series grouped by the passed Collection Id with Pagination.*

**Parameters:**
- `collectionId` (query, optional): integer<int32>
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** SeriesDto

---

## POST /api/Series/series-by-ids
*Fetches Series for a set of Ids. This will check User for permission access and filter out any Ids that don't exist or
the user does not have access to.*

**Request body:**
```
SeriesByIdsDto
```

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** SeriesByIdsDto, SeriesDto

---

## GET /api/Series/series-detail
*Get a special DTO for Series Detail page.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
SeriesDetailDto
```

**See schemas:** SeriesDetailDto

---

## GET /api/Series/series-with-annotations
*Returns all Series that a user has access to*

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** SeriesDto

---

## POST /api/Series/update
*Updates the Series*

**Request body:**
```
UpdateSeriesDto
```

**Responses:**
**200** OK
```
SeriesDto
```

**See schemas:** SeriesDto, UpdateSeriesDto

---

## POST /api/Series/update-match
*This will perform the fix match*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `provider` (query, optional): MetadataProvider

**Request body:**
```
ExternalMetadataIdsDto
```

**Responses:**
**200** OK

**See schemas:** ExternalMetadataIdsDto, MetadataProvider

---

## POST /api/Series/update-related
*Update the relations attached to the Series. Does not generate associated Sequel/Prequel pairs on target series.*

**Request body:**
```
UpdateRelatedSeriesDto
```

**Responses:**
**200** OK

**See schemas:** UpdateRelatedSeriesDto

---

## POST /api/Series/v2
*Gets series with the applied Filter*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
SeriesFilterV2Dto
```

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** SeriesDto, SeriesFilterV2Dto

---

## GET /api/Series/volume
*Returns a single Volume with progress information and Chapters*

**Parameters:**
- `volumeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
VolumeDto
```

**See schemas:** VolumeDto

---

## GET /api/Series/volumes
*Returns All volumes for a series with progress information and Chapters*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[VolumeDto]
```

**See schemas:** VolumeDto

---

## GET /api/Series/{seriesId}
*Fetches a Series for a given Id*

**Parameters:**
- `seriesId` (path, required): integer<int32>

**Responses:**
**200** OK
```
SeriesDto
```

**See schemas:** SeriesDto

---

## DELETE /api/Series/{seriesId}
*Deletes a series from Kavita*

**Parameters:**
- `seriesId` (path, required): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

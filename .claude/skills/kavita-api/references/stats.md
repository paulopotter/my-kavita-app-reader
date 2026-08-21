# Kavita API — Stats

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Stats/avg-time-by-hour
*Returns the avg time read by hour in the given filter*

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ReadTimeByHourDto
```

**See schemas:** ReadTimeByHourDto

---

## GET /api/Stats/day-breakdown

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[DayOfWeekStatCount]
```

**See schemas:** DayOfWeekStatCount

---

## GET /api/Stats/device/client-type
*Returns client type breakdown for the current month*

**Responses:**
**200** OK
```
DeviceClientBreakdownDto
```

**See schemas:** DeviceClientBreakdownDto

---

## GET /api/Stats/device/device-type
*Desktop vs Mobile spread over this month*

**Responses:**
**200** OK
```
StringStatCount
```

**See schemas:** StringStatCount

---

## GET /api/Stats/favorite-authors

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
MostReadAuthorsDto
```

**See schemas:** MostReadAuthorsDto

---

## GET /api/Stats/files-added-over-time

**Responses:**
**200** OK
```
[DateTimeStatCountWithFormat]
```

**See schemas:** DateTimeStatCountWithFormat

---

## GET /api/Stats/genre-breakdown
*Returns the top 10 genres that the user likes reading*

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
StringBreakDownDto
```

**See schemas:** StringBreakDownDto

---

## GET /api/Stats/most-active-users
*Top 5 most active readers for the given timeframe*

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]

**Responses:**
**200** OK
```
[TopReadDto]
```

**See schemas:** TopReadDto

---

## GET /api/Stats/page-spread

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
SpreadStatsDto
```

**See schemas:** SpreadStatsDto

---

## GET /api/Stats/pages-per-year
*Returns a count of pages read per year for a given userId.*

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[Int32StatCount]
```

**See schemas:** Int32StatCount

---

## GET /api/Stats/popular-decades

**Responses:**
**200** OK
```
[StatBucketDto]
```

**See schemas:** StatBucketDto

---

## GET /api/Stats/popular-genres

**Responses:**
**200** OK
```
[GenreTagDtoStatCount]
```

**See schemas:** GenreTagDtoStatCount

---

## GET /api/Stats/popular-libraries

**Responses:**
**200** OK
```
[LibraryDtoStatCount]
```

**See schemas:** LibraryDtoStatCount

---

## GET /api/Stats/popular-people

**Parameters:**
- `role` (query, optional): PersonRole

**Responses:**
**200** OK
```
[PersonDtoStatCount]
```

**See schemas:** PersonDtoStatCount, PersonRole

---

## GET /api/Stats/popular-reading-list
*Gets the top 5 most popular reading lists. Counts a reading list as active if a user has read at least some*

**Responses:**
**200** OK
```
[SeriesDtoStatCount]
```

**See schemas:** SeriesDtoStatCount

---

## GET /api/Stats/popular-series

**Responses:**
**200** OK
```
[SeriesDtoStatCount]
```

**See schemas:** SeriesDtoStatCount

---

## GET /api/Stats/popular-tags

**Responses:**
**200** OK
```
[TagDtoStatCount]
```

**See schemas:** TagDtoStatCount

---

## GET /api/Stats/reading-activity

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>
- `year` (query, optional): integer<int32>

**Responses:**
**200** OK
```
object
```

---

## GET /api/Stats/reading-counts
*Returns reading history events for a give or all users, broken up by day, and format*

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[DateTimeStatCountWithFormat]
```

**See schemas:** DateTimeStatCountWithFormat

---

## GET /api/Stats/reading-history
*Return a user's reading session history*

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[ReadingHistoryItemDto]
```

**See schemas:** ReadingHistoryItemDto

---

## GET /api/Stats/reading-history/series/{seriesId}
*Return the authenticated users reading session history for a given series*

**Parameters:**
- `seriesId` (path, required): integer<int32>
- `tzId` (query, optional): string
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[ReadingHistoryItemDto]
```

**See schemas:** ReadingHistoryItemDto

---

## GET /api/Stats/reading-pace

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>
- `year` (query, optional): integer<int32>
- `booksOnly` (query, optional): boolean

**Responses:**
**200** OK
```
ReadingPaceDto
```

**See schemas:** ReadingPaceDto

---

## GET /api/Stats/reads-by-month

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[YearMonthGroupingDtoStatCount]
```

**See schemas:** YearMonthGroupingDtoStatCount

---

## GET /api/Stats/server/count/manga-format

**Responses:**
**200** OK
```
[MangaFormatStatCount]
```

**See schemas:** MangaFormatStatCount

---

## GET /api/Stats/server/count/publication-status

**Responses:**
**200** OK
```
[PublicationStatusStatCount]
```

**See schemas:** PublicationStatusStatCount

---

## GET /api/Stats/server/file-breakdown
*A breakdown of different files, their size, and format*

**Responses:**
**200** OK
```
[FileExtensionBreakdownDto]
```

**See schemas:** FileExtensionBreakdownDto

---

## GET /api/Stats/server/file-extension
*Generates a csv of all file paths for a given extension*

**Parameters:**
- `fileExtension` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Stats/server/stats

**Responses:**
**200** OK
```
ServerStatisticsDto
```

**See schemas:** ServerStatisticsDto

---

## GET /api/Stats/tag-breakdown
*Returns top 10 tags that user likes reading*

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
StringBreakDownDto
```

**See schemas:** StringBreakDownDto

---

## GET /api/Stats/total-reads
*Returns the total amount reads in the given filter*

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
integer<int32>
```

---

## GET /api/Stats/user-read

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
UserReadStatistics
```

**See schemas:** UserReadStatistics

---

## GET /api/Stats/user-stats

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ProfileStatBarDto
```

**See schemas:** ProfileStatBarDto

---

## GET /api/Stats/word-spread

**Parameters:**
- `StartDate` (query, optional): string<date-time>
- `TimeZoneId` (query, optional): string
- `EndDate` (query, optional): string<date-time>
- `Libraries` (query, optional): [integer<int32>]
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
SpreadStatsDto
```

**See schemas:** SpreadStatsDto

---

## GET /api/Stats/words-per-year
*Returns a count of words read per year for a given userId.*

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[Int32StatCount]
```

**See schemas:** Int32StatCount

---

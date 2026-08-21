# Kavita API — Search

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Search/chapters-by-series
*Returns all chapters for a given series with localized titles. Used for CBL chapter-level matching.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[ChapterDto]
```

**See schemas:** ChapterDto

---

## GET /api/Search/search
*Searches against different entities in the system against a query string*

**Parameters:**
- `queryString` (query, optional): string
- `includeChapterAndFiles` (query, optional): boolean

**Responses:**
**200** OK
```
SearchResultGroupDto
```

**See schemas:** SearchResultGroupDto

---

## GET /api/Search/series-for-chapter
*Returns the series for the Chapter id. If the user does not have access (shouldn't happen by the UI),
then null is returned*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
SeriesDto
```

**See schemas:** SeriesDto

---

## GET /api/Search/series-for-mangafile
*Returns the series for the MangaFile id. If the user does not have access (shouldn't happen by the UI),
then null is returned*

**Parameters:**
- `mangaFileId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
SeriesDto
```

**See schemas:** SeriesDto

---

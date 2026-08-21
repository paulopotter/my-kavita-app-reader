# Kavita API — Download

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/Download/bookmarks
*Downloads all bookmarks in a zip for*

**Request body:**
```
DownloadBookmarkDto
```

**Responses:**
**200** OK

**See schemas:** DownloadBookmarkDto

---

## POST /api/Download/bulk-chapter-size
*For a set of chapters, return the size in bytes*

**Request body:**
```
BulkChapterSizeRequest
```

**Responses:**
**200** OK
```
object
```

**See schemas:** BulkChapterSizeRequest

---

## POST /api/Download/bulk-readinglist-size
*Returns the mapping of readinglist -> size*

**Request body:**
```
BulkReadingListSizeRequest
```

**Responses:**
**200** OK
```
object
```

**See schemas:** BulkReadingListSizeRequest

---

## POST /api/Download/bulk-series-size
*For a set of series, return the size in bytes*

**Request body:**
```
BulkSeriesSizeRequest
```

**Responses:**
**200** OK
```
object
```

**See schemas:** BulkSeriesSizeRequest

---

## POST /api/Download/bulk-volume-size
*For a set of volumes, return the size in bytes*

**Request body:**
```
BulkVolumeSizeRequest
```

**Responses:**
**200** OK
```
object
```

**See schemas:** BulkVolumeSizeRequest

---

## GET /api/Download/chapter
*Returns the zip for a single chapter. If the chapter contains multiple files, they will be zipped.*

**Parameters:**
- `chapterId` (query, optional): integer<int32>
- `correlationId` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Download/chapter-size
*For a given chapter, return the size in bytes*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
integer<int64>
```

---

## GET /api/Download/readinglist-size
*Returns the filesize for all items of a reading list that the requesting user has access to*

**Parameters:**
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
integer<int64>
```

---

## GET /api/Download/series

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `correlationId` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Download/series-size
*For a series, return the size in bytes*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
integer<int64>
```

---

## GET /api/Download/volume
*Downloads all chapters within a volume. If the chapters are multiple zips, they will all be zipped up.*

**Parameters:**
- `volumeId` (query, optional): integer<int32>
- `correlationId` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Download/volume-size
*For a given volume, return the size in bytes*

**Parameters:**
- `volumeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
integer<int64>
```

---

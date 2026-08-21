# Kavita API — Reader

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/Reader/all-bookmarks
*Returns a list of all bookmarked pages for a User*

**Request body:**
```
SeriesFilterV2Dto
```

**Responses:**
**200** OK
```
[BookmarkDto]
```

**See schemas:** BookmarkDto, SeriesFilterV2Dto

---

## POST /api/Reader/bookmark
*Bookmarks a page against a Chapter*

**Request body:**
```
BookmarkDto
```

**Responses:**
**200** OK

**See schemas:** BookmarkDto

---

## GET /api/Reader/bookmark-image
*Returns an image for a given bookmark series. Side effect: This will cache the bookmark images for reading.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `apiKey` (query, optional): string
- `page` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Reader/bookmark-info
*Returns various information about all bookmark files for a Series. Side effect: This will cache the bookmark images for reading.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `includeDimensions` (query, optional): boolean

**Responses:**
**200** OK
```
BookmarkInfoDto
```

**See schemas:** BookmarkInfoDto

---

## POST /api/Reader/bulk-remove-bookmarks
*Removes all bookmarks for all chapters linked to a Series*

**Request body:**
```
BulkRemoveBookmarkForSeriesDto
```

**Responses:**
**200** OK

**See schemas:** BulkRemoveBookmarkForSeriesDto

---

## GET /api/Reader/chapter-bookmarks
*Returns a list of bookmarked pages for a given Chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[BookmarkDto]
```

**See schemas:** BookmarkDto

---

## GET /api/Reader/chapter-info
*Returns various information about a Chapter. Side effect: This will cache the chapter images for reading.*

**Parameters:**
- `chapterId` (query, optional): integer<int32>
- `extractPdf` (query, optional): boolean
- `includeDimensions` (query, optional): boolean

**Responses:**
**200** OK
```
ChapterInfoDto
```

**See schemas:** ChapterInfoDto

---

## GET /api/Reader/continue-point
*Continue point is the chapter which you should start reading again from. If there is no progress on a series, then the first chapter will be returned (non-special unless only specials).
Otherwise, loop through the chapters and volumes in order to find the next chapter which has progress.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ChapterDto
```

**See schemas:** ChapterDto

---

## POST /api/Reader/create-ptoc
*Create a new personal table of content entry for a given chapter*

**Request body:**
```
CreatePersonalToCDto
```

**Responses:**
**200** OK

**See schemas:** CreatePersonalToCDto

---

## GET /api/Reader/file-dimensions
*Returns the file dimensions for all pages in a chapter. If the underlying chapter is PDF, use extractPDF to unpack as images.*

**Parameters:**
- `chapterId` (query, optional): integer<int32>
- `extractPdf` (query, optional): boolean

**Responses:**
**200** OK
```
[FileDimensionDto]
```

**See schemas:** FileDimensionDto

---

## GET /api/Reader/first-progress-date

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
string<date-time>
```

---

## GET /api/Reader/get-progress
*Returns Progress (page number) for a chapter for the logged in user*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ProgressDto
```

**See schemas:** ProgressDto

---

## GET /api/Reader/has-progress
*Returns if the user has reading progress on the Series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Reader/image
*Returns an image for a given chapter. Will perform bounding checks*

**Parameters:**
- `chapterId` (query, optional): integer<int32>
- `page` (query, optional): integer<int32>
- `apiKey` (query, optional): string
- `extractPdf` (query, optional): boolean

**Responses:**
**200** OK

---

## POST /api/Reader/mark-chapter-read
*Mark a single chapter as read*

**Request body:**
```
MarkChapterReadDto
```

**Responses:**
**200** OK

**See schemas:** MarkChapterReadDto

---

## POST /api/Reader/mark-multiple-read
*Marks all chapters within a list of volumes as Read. All volumes must belong to the same Series.*

**Request body:**
```
MarkVolumesReadDto
```

**Responses:**
**200** OK

**See schemas:** MarkVolumesReadDto

---

## POST /api/Reader/mark-multiple-series-read
*Marks all chapters within a list of series as Read.*

**Request body:**
```
MarkMultipleSeriesAsReadDto
```

**Responses:**
**200** OK

**See schemas:** MarkMultipleSeriesAsReadDto

---

## POST /api/Reader/mark-multiple-series-unread
*Marks all chapters within a list of series as Unread.*

**Request body:**
```
MarkMultipleSeriesAsReadDto
```

**Responses:**
**200** OK

**See schemas:** MarkMultipleSeriesAsReadDto

---

## POST /api/Reader/mark-multiple-unread
*Marks all chapters within a list of volumes as Unread. All volumes must belong to the same Series.*

**Request body:**
```
MarkVolumesReadDto
```

**Responses:**
**200** OK

**See schemas:** MarkVolumesReadDto

---

## POST /api/Reader/mark-read
*Marks a Series as read. All volumes and chapters will be marked as read during this process.*

**Request body:**
```
MarkReadDto
```

**Responses:**
**200** OK

**See schemas:** MarkReadDto

---

## POST /api/Reader/mark-unread
*Marks a Series as Unread. All volumes and chapters will be marked as unread during this process.*

**Request body:**
```
MarkReadDto
```

**Responses:**
**200** OK

**See schemas:** MarkReadDto

---

## POST /api/Reader/mark-volume-read
*Marks all chapters within a volume as Read*

**Request body:**
```
MarkVolumeReadDto
```

**Responses:**
**200** OK

**See schemas:** MarkVolumeReadDto

---

## POST /api/Reader/mark-volume-unread
*Marks all chapters within a volume as unread*

**Request body:**
```
MarkVolumeReadDto
```

**Responses:**
**200** OK

**See schemas:** MarkVolumeReadDto

---

## GET /api/Reader/next-chapter
*Returns the next logical chapter from the series.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `volumeId` (query, optional): integer<int32>
- `currentChapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
integer<int32>
```

---

## GET /api/Reader/pdf
*Returns the PDF for the chapterId.*

**Parameters:**
- `chapterId` (query, optional): integer<int32>
- `apiKey` (query, optional): string
- `extractPdf` (query, optional): boolean

**Responses:**
**200** OK

---

## GET /api/Reader/prev-chapter
*Returns the previous logical chapter from the series.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `volumeId` (query, optional): integer<int32>
- `currentChapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
integer<int32>
```

---

## POST /api/Reader/progress
*Save page against Chapter for authenticated user*

**Request body:**
```
ProgressDto
```

**Responses:**
**200** OK

**See schemas:** ProgressDto

---

## GET /api/Reader/prompt-reread/chapter
*Check if we should prompt the user for rereads for the given chapter*

**Parameters:**
- `libraryId` (query, optional): integer<int32>
- `seriesId` (query, optional): integer<int32>
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
RereadDto
```

**See schemas:** RereadDto

---

## GET /api/Reader/prompt-reread/series
*Check if we should prompt the user for rereads for the given series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
RereadDto
```

**See schemas:** RereadDto

---

## GET /api/Reader/prompt-reread/volume
*Check if we should prompt the user for rereads for the given volume*

**Parameters:**
- `libraryId` (query, optional): integer<int32>
- `seriesId` (query, optional): integer<int32>
- `volumeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
RereadDto
```

**See schemas:** RereadDto

---

## GET /api/Reader/ptoc
*Returns the user's personal table of contents for the given chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[PersonalToCDto]
```

**See schemas:** PersonalToCDto

---

## DELETE /api/Reader/ptoc
*Deletes the user's personal table of content for the given chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>
- `pageNum` (query, optional): integer<int32>
- `title` (query, optional): string

**Responses:**
**200** OK

---

## POST /api/Reader/remove-bookmarks
*Removes all bookmarks for all chapters linked to a Series*

**Request body:**
```
RemoveBookmarkForSeriesDto
```

**Responses:**
**200** OK

**See schemas:** RemoveBookmarkForSeriesDto

---

## GET /api/Reader/series-bookmarks
*Returns all bookmarked pages for a given series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[BookmarkDto]
```

**See schemas:** BookmarkDto

---

## GET /api/Reader/thumbnail
*Returns a thumbnail for the given page number*

**Parameters:**
- `chapterId` (query, optional): integer<int32>
- `pageNum` (query, optional): integer<int32>
- `apiKey` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Reader/time-left
*For the current user, returns an estimate on how long it would take to finish reading the series.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
HourEstimateRangeDto
```

**See schemas:** HourEstimateRangeDto

---

## GET /api/Reader/time-left-for-chapter
*For the current user, returns an estimate on how long it would take to finish reading the chapter.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
HourEstimateRangeDto
```

**See schemas:** HourEstimateRangeDto

---

## POST /api/Reader/unbookmark
*Removes a bookmarked page for a Chapter*

**Request body:**
```
BookmarkDto
```

**Responses:**
**200** OK

**See schemas:** BookmarkDto

---

## GET /api/Reader/volume-bookmarks
*Returns all bookmarked pages for a given volume*

**Parameters:**
- `volumeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[BookmarkDto]
```

**See schemas:** BookmarkDto

---

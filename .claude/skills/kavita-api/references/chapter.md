# Kavita API — Chapter

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Chapter
*Gets a single chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ChapterDto
```

**See schemas:** ChapterDto

---

## DELETE /api/Chapter
*Removes a Chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Chapter/chapter-detail-plus
*Returns Ratings and Reviews for an individual Chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ChapterDetailPlusDto
```

**See schemas:** ChapterDetailPlusDto

---

## POST /api/Chapter/delete-multiple
*Deletes multiple chapters and any volumes with no leftover chapters*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Request body:**
```
DeleteChaptersDto
```

**Responses:**
**200** OK
```
boolean
```

**See schemas:** DeleteChaptersDto

---

## POST /api/Chapter/update
*Update chapter metadata*

**Request body:**
```
UpdateChapterDto
```

**Responses:**
**200** OK

**See schemas:** UpdateChapterDto

---

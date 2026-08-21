# Kavita API — Tachiyomi

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Tachiyomi/latest-chapter
*Given the series Id, this should return the latest chapter that has been fully read.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
TachiyomiChapterDto
```

**See schemas:** TachiyomiChapterDto

---

## POST /api/Tachiyomi/mark-chapter-until-as-read
*Marks every chapter that is sorted below the passed number as Read. This will not mark any specials as read.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `chapterNumber` (query, optional): number<float>
- `generateReadingSessions` (query, optional): boolean

**Responses:**
**200** OK
```
boolean
```

---

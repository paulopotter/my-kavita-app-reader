# Kavita API — Panels

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Panels/get-progress
*Gets the Progress of a given chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>
- `apiKey` (query, optional): string

**Responses:**
**200** OK
```
ProgressDto
```

**See schemas:** ProgressDto

---

## POST /api/Panels/save-progress
*Saves the progress of a given chapter. This will generate a reading session with the estimated time from the
last progress till the current*

**Parameters:**
- `apiKey` (query, optional): string

**Request body:**
```
ProgressDto
```

**Responses:**
**200** OK

**See schemas:** ProgressDto

---

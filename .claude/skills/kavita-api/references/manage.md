# Kavita API — Manage

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Manage/matched-series-counts
*Returns high level counts for matched series page*

**Responses:**
**200** OK
```
MatchedExternalSeriesCountDto
```

**See schemas:** MatchedExternalSeriesCountDto

---

## POST /api/Manage/series-metadata
*Returns a list of all Series that is Kavita+ applicable to metadata match and the status of it*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
ManageMatchFilterDto
```

**Responses:**
**200** OK
```
[ManageMatchSeriesDto]
```

**See schemas:** ManageMatchFilterDto, ManageMatchSeriesDto

---

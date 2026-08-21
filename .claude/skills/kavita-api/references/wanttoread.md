# Kavita API — WantToRead

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/want-to-read

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/want-to-read/add-series
*Given a list of Series Ids, add them to the current logged in user's Want To Read list*

**Request body:**
```
UpdateWantToReadDto
```

**Responses:**
**200** OK

**See schemas:** UpdateWantToReadDto

---

## POST /api/want-to-read/remove-series
*Given a list of Series Ids, remove them from the current logged in user's Want To Read list*

**Request body:**
```
UpdateWantToReadDto
```

**Responses:**
**200** OK

**See schemas:** UpdateWantToReadDto

---

## POST /api/want-to-read/v2
*Return all Series that are in the current logged in user's Want to Read list, filtered*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>
- `userId` (query, optional): integer<int32>

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

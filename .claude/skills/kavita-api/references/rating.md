# Kavita API — Rating

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/Rating/chapter
*Update the users' rating of the given chapter*

**Request body:**
```
UpdateRatingDto
```

**Responses:**
**200** OK

**See schemas:** UpdateRatingDto

---

## GET /api/Rating/overall-chapter
*Overall rating from all Kavita users for a given Chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
RatingDto
```

**See schemas:** RatingDto

---

## GET /api/Rating/overall-series
*Overall rating from all Kavita users for a given Series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
RatingDto
```

**See schemas:** RatingDto

---

## POST /api/Rating/series
*Update the users' rating of the given series*

**Request body:**
```
UpdateRatingDto
```

**Responses:**
**200** OK

**See schemas:** UpdateRatingDto

---

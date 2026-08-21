# Kavita API — Review

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Review/all
*Returns all reviews for the user. If you are authenticated as the user, will always return data, regardless of ShareReviews setting*

**Parameters:**
- `userId` (query, optional): integer<int32>
- `rating` (query, optional): number<float>
- `filterQuery` (query, optional): string

**Responses:**
**200** OK
```
[UserReviewExtendedDto]
```

**See schemas:** UserReviewExtendedDto

---

## POST /api/Review/chapter
*Update the user's review for a given chapter*

**Request body:**
```
UpdateUserReviewDto
```

**Responses:**
**200** OK
```
UserReviewDto
```

**See schemas:** UpdateUserReviewDto, UserReviewDto

---

## DELETE /api/Review/chapter
*Deletes the user's review for the given chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/Review/series
*Updates the user's review for a given series*

**Request body:**
```
UpdateUserReviewDto
```

**Responses:**
**200** OK
```
UserReviewDto
```

**See schemas:** UpdateUserReviewDto, UserReviewDto

---

## DELETE /api/Review/series
*Deletes the user's review for the given series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

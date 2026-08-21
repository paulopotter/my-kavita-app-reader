# Kavita API — Image

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Image/bookmark
*Returns image for a given bookmark page*

**Parameters:**
- `chapterId` (query, optional): integer<int32>
- `pageNum` (query, optional): integer<int32>
- `imageOffset` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Image/chapter-cover
*Returns cover image for Chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Image/collection-cover
*Returns cover image for Collection*

**Parameters:**
- `collectionTagId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Image/cover-upload
*Returns a temp coverupload image*

**Parameters:**
- `filename` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Image/external/chapter

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[ExternalCoverResponseDto]
```

**See schemas:** ExternalCoverResponseDto

---

## GET /api/Image/external/series

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[ExternalCoverResponseDto]
```

**See schemas:** ExternalCoverResponseDto

---

## GET /api/Image/external/volume

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `volumeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[ExternalCoverResponseDto]
```

**See schemas:** ExternalCoverResponseDto

---

## GET /api/Image/library-cover
*Returns cover image for Library*

**Parameters:**
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Image/person-cover
*Returns cover image for Person*

**Parameters:**
- `personId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Image/publisher
*Returns the image associated with a publisher*

**Parameters:**
- `publisherName` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Image/readinglist-cover
*Returns cover image for a Reading List*

**Parameters:**
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Image/series-cover
*Returns cover image for Series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Image/user-cover
*Returns cover image for User*

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Image/volume-cover
*Returns cover image for Volume*

**Parameters:**
- `volumeId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Image/web-link
*Returns the image associated with a web-link*

**Parameters:**
- `url` (query, optional): string

**Responses:**
**200** OK

---

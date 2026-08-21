# Kavita API — Opds

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/Opds/{apiKey}
*Returns the Catalogue for Kavita's OPDS Service*

**Parameters:**
- `apiKey` (path, required): string

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}
*Returns the Catalogue for Kavita's OPDS Service*

**Parameters:**
- `apiKey` (path, required): string

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/collections
*Get all Collections - Supports Pagination*

**Parameters:**
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/collections/{collectionId}
*Get Series for a given Collection - Supports Pagination*

**Parameters:**
- `collectionId` (path, required): integer<int32>
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/favicon

**Parameters:**
- `apiKey` (path, required): string

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/image
*This returns a streamed image following OPDS-PS v1.2*

**Parameters:**
- `apiKey` (path, required): string
- `libraryId` (query, optional): integer<int32>
- `seriesId` (query, optional): integer<int32>
- `volumeId` (query, optional): integer<int32>
- `chapterId` (query, optional): integer<int32>
- `pageNumber` (query, optional): integer<int32>
- `saveProgress` (query, optional): boolean

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/libraries
*Get the User's Libraries - No Pagination Support*

**Parameters:**
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/libraries/{libraryId}
*Returns Series from the Library - Supports Pagination*

**Parameters:**
- `libraryId` (path, required): integer<int32>
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/on-deck
*Get the On Deck (Dashboard) - Supports Pagination*

**Parameters:**
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/reading-list
*Get a User's Reading Lists - Supports Pagination*

**Parameters:**
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/reading-list/{readingListId}
*Returns individual items (chapters) from Reading List by ID - Supports Pagination*

**Parameters:**
- `readingListId` (path, required): integer<int32>
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/recently-added
*Returns Recently Added (Dashboard Feed) - Supports Pagination*

**Parameters:**
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/recently-updated
*Get the Recently Updated Series (Dashboard) - Pagination available, total pages will not be filled due to underlying implementation*

**Parameters:**
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/search

**Parameters:**
- `apiKey` (path, required): string

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/series
*OPDS Search endpoint*

**Parameters:**
- `apiKey` (path, required): string
- `query` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/series/{seriesId}
*Returns the items within a Series (Series Detail)*

**Parameters:**
- `apiKey` (path, required): string
- `seriesId` (path, required): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/series/{seriesId}/volume/{volumeId}
*Returns items for a given Volume*

**Parameters:**
- `apiKey` (path, required): string
- `seriesId` (path, required): integer<int32>
- `volumeId` (path, required): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/series/{seriesId}/volume/{volumeId}/chapter/{chapterId}
*Gets items for a given Chapter*

**Parameters:**
- `apiKey` (path, required): string
- `seriesId` (path, required): integer<int32>
- `volumeId` (path, required): integer<int32>
- `chapterId` (path, required): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/series/{seriesId}/volume/{volumeId}/chapter/{chapterId}/download/{filename}
*Downloads a file (user must have download permission)*

**Parameters:**
- `apiKey` (path, required): string
- `seriesId` (path, required): integer<int32>
- `volumeId` (path, required): integer<int32>
- `chapterId` (path, required): integer<int32>
- `filename` (path, required): string

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/smart-filters
*Get the User's Smart Filters (Dashboard Context) - Supports Pagination*

**Parameters:**
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/smart-filters/{filterId}
*Get the User's Smart Filter - Supports Pagination*

**Parameters:**
- `apiKey` (path, required): string
- `filterId` (path, required): integer<int32>
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Opds/{apiKey}/want-to-read
*Get the User's Want to Read list - Supports Pagination*

**Parameters:**
- `apiKey` (path, required): string
- `pageNumber` (query, optional): integer<int32>

**Responses:**
**200** OK

---

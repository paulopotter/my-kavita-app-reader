# Kavita API — ReadingList

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/ReadingList
*Fetches a single Reading List*

**Parameters:**
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ReadingListDto
```

**See schemas:** ReadingListDto

---

## DELETE /api/ReadingList
*Deletes a reading list*

**Parameters:**
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/ReadingList/all
*Returns reading lists (paginated) for a given user.*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
ReadingListFilterDto
```

**Responses:**
**200** OK
```
[ReadingListDto]
```

**See schemas:** ReadingListDto, ReadingListFilterDto

---

## GET /api/ReadingList/all-people
*Returns all people in given roles for a reading list*

**Parameters:**
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[PersonDto]
```

**See schemas:** PersonDto

---

## POST /api/ReadingList/create
*Creates a new List with a unique title. Returns the new ReadingList back*

**Request body:**
```
CreateReadingListDto
```

**Responses:**
**200** OK
```
ReadingListDto
```

**See schemas:** CreateReadingListDto, ReadingListDto

---

## POST /api/ReadingList/delete-item
*Deletes a list item from the list. Item orders will update as a result.*

**Request body:**
```
UpdateReadingListPosition
```

**Responses:**
**200** OK

**See schemas:** UpdateReadingListPosition

---

## POST /api/ReadingList/delete-multiple
*Delete multiple reading lists in one go*

**Request body:**
```
DeleteReadingListsDto
```

**Responses:**
**200** OK

**See schemas:** DeleteReadingListsDto

---

## POST /api/ReadingList/export-as-cbl
*Export a Reading List to CBL format*

**Parameters:**
- `readingListId` (query, optional): integer<int32>
- `asV2` (query, optional): boolean

**Responses:**
**200** OK

---

## GET /api/ReadingList/info
*Returns random information about a Reading List*

**Parameters:**
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ReadingListInfoDto
```

**See schemas:** ReadingListInfoDto

---

## GET /api/ReadingList/items
*Fetches all reading list items for a given list including rich metadata around series, volume, chapters, and progress*

**Parameters:**
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[ReadingListItemDto]
```

**See schemas:** ReadingListItemDto

---

## POST /api/ReadingList/lists
*Returns reading lists (paginated) for a given user.*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>
- `includePromoted` (query, optional): boolean
- `sortByLastModified` (query, optional): boolean

**Responses:**
**200** OK
```
[ReadingListDto]
```

**See schemas:** ReadingListDto

---

## GET /api/ReadingList/lists-for-chapter
*Returns all Reading Lists the user has access to that has the given chapter within it.*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[ReadingListDto]
```

**See schemas:** ReadingListDto

---

## GET /api/ReadingList/lists-for-series
*Returns all Reading Lists the user has access to that the given series within it.*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[ReadingListDto]
```

**See schemas:** ReadingListDto

---

## GET /api/ReadingList/name-exists
*Checks if a reading list exists with the name*

**Parameters:**
- `name` (query, optional): string

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/ReadingList/next-chapter
*Returns the next chapter within the reading list*

**Parameters:**
- `currentChapterId` (query, optional): integer<int32>
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
integer<int32>
```

---

## GET /api/ReadingList/people
*Returns a list of a given role associated with the reading list*

**Parameters:**
- `readingListId` (query, optional): integer<int32>
- `role` (query, optional): PersonRole

**Responses:**
**200** OK
```
[PersonDto]
```

**See schemas:** PersonDto, PersonRole

---

## GET /api/ReadingList/prev-chapter
*Returns the prev chapter within the reading list*

**Parameters:**
- `currentChapterId` (query, optional): integer<int32>
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
integer<int32>
```

---

## POST /api/ReadingList/promote-multiple
*Promote/UnPromote multiple reading lists in one go. Will only update the authenticated user's reading lists and will only work if the user has promotion role*

**Request body:**
```
PromoteReadingListsDto
```

**Responses:**
**200** OK

**See schemas:** PromoteReadingListsDto

---

## POST /api/ReadingList/regenerate-cover
*Regenerates the cover image for a reading list, you must own the given reading list to do this*

**Parameters:**
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/ReadingList/remove-read
*Removes all entries that are fully read from the reading list*

**Parameters:**
- `readingListId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/ReadingList/update
*Update the properties (title, summary) of a reading list*

**Request body:**
```
UpdateReadingListDto
```

**Responses:**
**200** OK
```
ReadingListDto
```

**See schemas:** ReadingListDto, UpdateReadingListDto

---

## POST /api/ReadingList/update-by-chapter

**Request body:**
```
UpdateReadingListByChapterDto
```

**Responses:**
**200** OK

**See schemas:** UpdateReadingListByChapterDto

---

## POST /api/ReadingList/update-by-multiple
*Adds all chapters from a list of volumes and chapters to a reading list*

**Request body:**
```
UpdateReadingListByMultipleDto
```

**Responses:**
**200** OK

**See schemas:** UpdateReadingListByMultipleDto

---

## POST /api/ReadingList/update-by-multiple-series
*Adds all chapters from a list of series to a reading list*

**Request body:**
```
UpdateReadingListByMultipleSeriesDto
```

**Responses:**
**200** OK

**See schemas:** UpdateReadingListByMultipleSeriesDto

---

## POST /api/ReadingList/update-by-series
*Adds all chapters from a Series to a reading list*

**Request body:**
```
UpdateReadingListBySeriesDto
```

**Responses:**
**200** OK

**See schemas:** UpdateReadingListBySeriesDto

---

## POST /api/ReadingList/update-by-volume

**Request body:**
```
UpdateReadingListByVolumeDto
```

**Responses:**
**200** OK

**See schemas:** UpdateReadingListByVolumeDto

---

## POST /api/ReadingList/update-position
*Updates an items position*

**Request body:**
```
UpdateReadingListPosition
```

**Responses:**
**200** OK

**See schemas:** UpdateReadingListPosition

---

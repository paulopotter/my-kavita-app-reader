# Kavita API — Collection

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Collection
*Returns all Collection tags for a given User*

**Parameters:**
- `ownedOnly` (query, optional): boolean
- `sortByLastModified` (query, optional): boolean

**Responses:**
**200** OK
```
[AppUserCollectionDto]
```

**See schemas:** AppUserCollectionDto

---

## DELETE /api/Collection
*Removes the collection tag from the user*

**Parameters:**
- `tagId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Collection/all-series
*Returns all collections that contain the Series for the user with the option to allow for promoted collections (non-user owned)*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `ownedOnly` (query, optional): boolean

**Responses:**
**200** OK
```
[AppUserCollectionDto]
```

**See schemas:** AppUserCollectionDto

---

## POST /api/Collection/delete-multiple
*Delete multiple collections in one go*

**Request body:**
```
DeleteCollectionsDto
```

**Responses:**
**200** OK

**See schemas:** DeleteCollectionsDto

---

## POST /api/Collection/import-stack
*Imports a MAL Stack into Kavita*

**Request body:**
```
MalStackDto
```

**Responses:**
**200** OK

**See schemas:** MalStackDto

---

## GET /api/Collection/mal-stacks
*For the authenticated user, if they have an active Kavita+ subscription and a MAL username on record,
fetch their Mal interest stacks (including restacks)*

**Responses:**
**200** OK
```
[MalStackDto]
```

**See schemas:** MalStackDto

---

## GET /api/Collection/name-exists
*Checks if a collection exists with the name*

**Parameters:**
- `name` (query, optional): string

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/Collection/promote-multiple
*Promote/UnPromote multiple collections in one go. Will only update the authenticated user's collections and will only work if the user has promotion role*

**Request body:**
```
PromoteCollectionsDto
```

**Responses:**
**200** OK

**See schemas:** PromoteCollectionsDto

---

## GET /api/Collection/single
*Returns a single Collection tag by Id for a given user*

**Parameters:**
- `collectionId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
AppUserCollectionDto
```

**See schemas:** AppUserCollectionDto

---

## POST /api/Collection/update
*Updates an existing tag with a new title, promotion status, and summary.
<remarks>UI does not contain controls to update title</remarks>*

**Request body:**
```
AppUserCollectionDto
```

**Responses:**
**200** OK
```
AppUserCollectionDto
```

**See schemas:** AppUserCollectionDto

---

## POST /api/Collection/update-for-series
*Adds multiple series to a collection. If tag id is 0, this will create a new tag.*

**Request body:**
```
CollectionTagBulkAddDto
```

**Responses:**
**200** OK

**See schemas:** CollectionTagBulkAddDto

---

## POST /api/Collection/update-series
*For a given tag, update the summary if summary has changed and remove a set of series from the tag.*

**Request body:**
```
UpdateSeriesForTagDto
```

**Responses:**
**200** OK

**See schemas:** UpdateSeriesForTagDto

---

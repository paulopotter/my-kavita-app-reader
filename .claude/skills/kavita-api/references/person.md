# Kavita API — Person

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Person

**Parameters:**
- `name` (query, optional): string

**Responses:**
**200** OK
```
PersonDto
```

**See schemas:** PersonDto

---

## POST /api/Person/all
*Returns a list of authors and artists for browsing*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
PersonFilterDto
```

**Responses:**
**200** OK
```
[BrowsePersonDto]
```

**See schemas:** BrowsePersonDto, PersonFilterDto

---

## GET /api/Person/chapters-by-role
*Returns all individual chapters by role. Limited to 20 results.*

**Parameters:**
- `personId` (query, optional): integer<int32>
- `role` (query, optional): PersonRole

**Responses:**
**200** OK
```
[StandaloneChapterDto]
```

**See schemas:** PersonRole, StandaloneChapterDto

---

## POST /api/Person/fetch-cover
*Attempts to download the cover from CoversDB (Note: Not yet release in Kavita)*

**Parameters:**
- `personId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
string
```

---

## POST /api/Person/merge
*Merges Persons into one, this action is irreversible*

**Request body:**
```
PersonMergeDto
```

**Responses:**
**200** OK
```
PersonDto
```

**See schemas:** PersonDto, PersonMergeDto

---

## GET /api/Person/roles
*Returns all roles for a Person*

**Parameters:**
- `personId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[PersonRole]
```

**See schemas:** PersonRole

---

## GET /api/Person/search
*Find a person by name or alias against a query string*

**Parameters:**
- `queryString` (query, optional): string

**Responses:**
**200** OK
```
[PersonDto]
```

**See schemas:** PersonDto

---

## GET /api/Person/series-known-for
*Returns the top 20 series that the "person" is known for. This will use Average Rating when applicable (Kavita+ field), else it's a random sort*

**Parameters:**
- `personId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[SeriesDto]
```

**See schemas:** SeriesDto

---

## POST /api/Person/update
*Updates the Person*

**Request body:**
```
UpdatePersonDto
```

**Responses:**
**200** OK
```
PersonDto
```

**See schemas:** PersonDto, UpdatePersonDto

---

## POST /api/Person/valid-alias
*Ensure the alias is valid to be added. For example, the alias cannot be on another person or be the same as the current person name/alias.*

**Request body:**
```
PersonAliasCheckDto
```

**Responses:**
**200** OK
```
boolean
```

**See schemas:** PersonAliasCheckDto

---

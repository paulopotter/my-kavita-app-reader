# Kavita API — Metadata

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Metadata/age-ratings
*Fetches all age ratings from the instance*

**Parameters:**
- `libraryIds` (query, optional): string

**Responses:**
**200** OK
```
[AgeRatingDto]
```

**See schemas:** AgeRatingDto

---

## GET /api/Metadata/all-bcp47-languages
*Returns a list of all BCP47 Languages. `IsoCode` stores the BCP47 code*

**Responses:**
**200** OK
```
[LanguageDto]
```

**See schemas:** LanguageDto

---

## GET /api/Metadata/all-languages
*Returns all languages Kavita can accept*

**Responses:**
**200** OK
```
[LanguageDto]
```

**See schemas:** LanguageDto

---

## GET /api/Metadata/genres
*Fetches genres from the instance*

**Parameters:**
- `libraryIds` (query, optional): string
- `context` (query, optional): QueryContext

**Responses:**
**200** OK
```
[GenreTagDto]
```

**See schemas:** GenreTagDto, QueryContext

---

## POST /api/Metadata/genres-with-counts
*Returns a list of Genres with counts for counts when Genre is on Series/Chapter*

**Request body:**
```
UserParams
```

**Responses:**
**200** OK
```
[BrowseGenreDto]
```

**See schemas:** BrowseGenreDto, UserParams

---

## GET /api/Metadata/language-title
*Given a language code returns the display name*

**Parameters:**
- `code` (query, optional): string

**Responses:**
**200** OK
```
string
```

---

## GET /api/Metadata/languages
*Fetches all age languages from the libraries passed (or if none passed, all in the server)*

**Parameters:**
- `libraryIds` (query, optional): string

**Responses:**
**200** OK
```
[LanguageDto]
```

**See schemas:** LanguageDto

---

## GET /api/Metadata/people
*Fetches people from the instance*

**Parameters:**
- `libraryIds` (query, optional): string

**Responses:**
**200** OK
```
[PersonDto]
```

**See schemas:** PersonDto

---

## GET /api/Metadata/people-by-role
*Fetches people from the instance by role*

**Parameters:**
- `role` (query, optional): PersonRole

**Responses:**
**200** OK
```
[PersonDto]
```

**See schemas:** PersonDto, PersonRole

---

## GET /api/Metadata/publication-status
*Fetches all publication status' from the instance*

**Parameters:**
- `libraryIds` (query, optional): string

**Responses:**
**200** OK
```
[AgeRatingDto]
```

**See schemas:** AgeRatingDto

---

## GET /api/Metadata/readinglist-tags
*Fetches Reading List Tags from the instance*

**Responses:**
**200** OK
```
[ReadingListTagDto]
```

**See schemas:** ReadingListTagDto

---

## GET /api/Metadata/series-detail-plus
*Fetches the details needed from Kavita+ for Series Detail page*

**Parameters:**
- `seriesId` (query, optional): integer<int32>
- `libraryType` (query, optional): LibraryType

**Responses:**
**200** OK
```
SeriesDetailPlusDto
```

**See schemas:** LibraryType, SeriesDetailPlusDto

---

## GET /api/Metadata/tags
*Fetches all tags from the instance*

**Parameters:**
- `libraryIds` (query, optional): string

**Responses:**
**200** OK
```
[TagDto]
```

**See schemas:** TagDto

---

## POST /api/Metadata/tags-with-counts
*Returns a list of Tags with counts for counts when Tag is on Series/Chapter*

**Request body:**
```
UserParams
```

**Responses:**
**200** OK
```
[BrowseTagDto]
```

**See schemas:** BrowseTagDto, UserParams

---

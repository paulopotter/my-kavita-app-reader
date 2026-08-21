# Kavita API — Filter

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Filter
*All Smart Filters for the authenticated user*

**Responses:**
**200** OK
```
[SmartFilterDto]
```

**See schemas:** SmartFilterDto

---

## DELETE /api/Filter
*Delete the smart filter for the authenticated user*

**Parameters:**
- `filterId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/Filter/decode
*Decodes the Filter*

**Request body:**
```
DecodeFilterDto
```

**Responses:**
**200** OK
```
IFilterDto
```

**See schemas:** DecodeFilterDto, IFilterDto

---

## POST /api/Filter/encode/annotation
*Encode an Annotation Filter*

**Request body:**
```
AnnotationFilterDto
```

**Responses:**
**200** OK
```
string
```

**See schemas:** AnnotationFilterDto

---

## POST /api/Filter/encode/person
*Encode a Person Filter*

**Request body:**
```
PersonFilterDto
```

**Responses:**
**200** OK
```
string
```

**See schemas:** PersonFilterDto

---

## POST /api/Filter/encode/reading-list
*Encode a Reading List filter*

**Request body:**
```
ReadingListFilterDto
```

**Responses:**
**200** OK
```
string
```

**See schemas:** ReadingListFilterDto

---

## POST /api/Filter/encode/series
*Encode a Series filter*

**Request body:**
```
SeriesFilterV2Dto
```

**Responses:**
**200** OK
```
string
```

**See schemas:** SeriesFilterV2Dto

---

## POST /api/Filter/rename
*Rename a Smart Filter given the filterId and new name*

**Parameters:**
- `filterId` (query, optional): integer<int32>
- `name` (query, required): string

**Responses:**
**200** OK

---

## POST /api/Filter/update/annotation
*Creates or Updates the Reading List filter*

**Request body:**
```
AnnotationFilterDto
```

**Responses:**
**200** OK

**See schemas:** AnnotationFilterDto

---

## POST /api/Filter/update/person
*Creates or Updates the Person filter*

**Request body:**
```
PersonFilterDto
```

**Responses:**
**200** OK

**See schemas:** PersonFilterDto

---

## POST /api/Filter/update/reading-list
*Creates or Updates the Reading List filter*

**Request body:**
```
ReadingListFilterDto
```

**Responses:**
**200** OK

**See schemas:** ReadingListFilterDto

---

## POST /api/Filter/update/series
*Creates or Updates the Series filter*

**Request body:**
```
SeriesFilterV2Dto
```

**Responses:**
**200** OK

**See schemas:** SeriesFilterV2Dto

---

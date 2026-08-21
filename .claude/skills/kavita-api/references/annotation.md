# Kavita API — Annotation

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## DELETE /api/Annotation
*Delete the annotation for the user*

**Parameters:**
- `annotationId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Annotation/all
*Returns the annotations for the given chapter*

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[AnnotationDto]
```

**See schemas:** AnnotationDto

---

## POST /api/Annotation/all-filtered
*Returns a list of annotations for browsing*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
AnnotationFilterDto
```

**Responses:**
**200** OK
```
[AnnotationDto]
```

**See schemas:** AnnotationDto, AnnotationFilterDto

---

## GET /api/Annotation/all-for-series
*Returns all annotations by Series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
AnnotationDto
```

**See schemas:** AnnotationDto

---

## POST /api/Annotation/bulk-delete
*Removes annotations in bulk. Requires every annotation to be owned by the authenticated user*

**Request body:**
```
[integer<int32>]
```

**Responses:**
**200** OK

---

## POST /api/Annotation/create
*Create a new Annotation for the user against a Chapter*

**Request body:**
```
AnnotationDto
```

**Responses:**
**200** OK
```
AnnotationDto
```

**See schemas:** AnnotationDto

---

## POST /api/Annotation/export
*Exports Annotations for the User*

**Request body:**
```
[integer<int32>]
```

**Responses:**
**200** OK

---

## POST /api/Annotation/export-filter
*Exports annotations for the given users*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
AnnotationFilterDto
```

**Responses:**
**200** OK

**See schemas:** AnnotationFilterDto

---

## POST /api/Annotation/like
*Adds a like for the currently authenticated user if not already from the annotations with given ids*

**Request body:**
```
[integer<int32>]
```

**Responses:**
**200** OK

---

## POST /api/Annotation/unlike
*Removes likes for the currently authenticated user if present from the annotations with given ids*

**Request body:**
```
[integer<int32>]
```

**Responses:**
**200** OK

---

## POST /api/Annotation/update
*Update the modifiable fields (Spoiler, highlight slot, and comment) for an annotation*

**Request body:**
```
AnnotationDto
```

**Responses:**
**200** OK
```
AnnotationDto
```

**See schemas:** AnnotationDto

---

## GET /api/Annotation/{annotationId}
*Returns the Annotation by Id. User must have access to annotation.*

**Parameters:**
- `annotationId` (path, required): integer<int32>

**Responses:**
**200** OK
```
AnnotationDto
```

**See schemas:** AnnotationDto

---

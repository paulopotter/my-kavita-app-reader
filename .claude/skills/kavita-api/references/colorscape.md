# Kavita API — ColorScape

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/ColorScape/chapter
*Returns the color scape for a chapter*

**Parameters:**
- `id` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ColorScapeDto
```

**See schemas:** ColorScapeDto

---

## GET /api/ColorScape/series
*Returns the color scape for a series*

**Parameters:**
- `id` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ColorScapeDto
```

**See schemas:** ColorScapeDto

---

## GET /api/ColorScape/volume
*Returns the color scape for a volume*

**Parameters:**
- `id` (query, optional): integer<int32>

**Responses:**
**200** OK
```
ColorScapeDto
```

**See schemas:** ColorScapeDto

---

# Kavita API — Volume

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Volume
*Returns the appropriate Volume*

**Parameters:**
- `volumeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
VolumeDto
```

**See schemas:** VolumeDto

---

## DELETE /api/Volume
*Delete the Volume from the DB*

**Parameters:**
- `volumeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/Volume/multiple
*Delete multiple Volumes from the DB*

**Request body:**
```
[integer<int32>]
```

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/Volume/update
*Updates the information on the Volume*

**Request body:**
```
UpdateVolumeDto
```

**Responses:**
**200** OK
```
VolumeDto
```

**See schemas:** UpdateVolumeDto, VolumeDto

---

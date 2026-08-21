# Kavita API — Koreader

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## PUT /api/Koreader/{apiKey}/syncs/progress
*Syncs book progress with Kavita. Will attempt to save the underlying reader position if possible.*

**Parameters:**
- `apiKey` (path, required): string

**Request body:**
```
KoreaderBookDto
```

**Responses:**
**200** OK
```
KoreaderProgressUpdateDto
```

**See schemas:** KoreaderBookDto, KoreaderProgressUpdateDto

---

## GET /api/Koreader/{apiKey}/syncs/progress/{ebookHash}
*Gets book progress from Kavita, if not found will return a 400*

**Parameters:**
- `apiKey` (path, required): string
- `ebookHash` (path, required): string

**Responses:**
**200** OK

---

## GET /api/Koreader/{apiKey}/users/auth

**Parameters:**
- `apiKey` (path, required): string

**Responses:**
**200** OK

---

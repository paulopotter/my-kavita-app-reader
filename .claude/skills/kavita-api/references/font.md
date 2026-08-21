# Kavita API — Font

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Font
*Returns a font file*

**Parameters:**
- `fontId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## DELETE /api/Font
*Removes a font family from the system. The family is validated for in-use server side and only removed when
it is not selected by a user, or when an admin forces the deletion.*

**Parameters:**
- `fontId` (query, optional): integer<int32>
- `force` (query, optional): boolean

**Responses:**
**200** OK
```
FontDeleteResultDto
```

**See schemas:** FontDeleteResultDto

---

## GET /api/Font/all
*List out the fonts*

**Responses:**
**200** OK
```
[EpubFontDto]
```

**See schemas:** EpubFontDto

---

## POST /api/Font/upload
*Manual upload*

**Request body:**
```
Content-Type: multipart/form-data
{
  formFile: string<binary>
}
```

**Responses:**
**200** OK
```
EpubFontDto
```

**See schemas:** EpubFontDto

---

## POST /api/Font/upload-by-url

**Parameters:**
- `url` (query, optional): string

**Responses:**
**200** OK
```
[EpubFontDto]
```

**See schemas:** EpubFontDto

---

# Kavita API — Book

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Book/{chapterId}/book-info
*Retrieves information for the PDF and Epub reader. This will cache the file.*

**Parameters:**
- `chapterId` (path, required): integer<int32>

**Responses:**
**200** OK
```
BookInfoDto
```

**See schemas:** BookInfoDto

---

## GET /api/Book/{chapterId}/book-page
*This returns a single page within the epub book. All html will be rewritten to be scoped within our reader,
all css is scoped, etc.*

**Parameters:**
- `chapterId` (path, required): integer<int32>
- `page` (query, optional): integer<int32>

**Responses:**
**200** OK
```
string
```

---

## GET /api/Book/{chapterId}/book-resources
*This is an entry point to fetch resources from within an epub chapter/book.*

**Parameters:**
- `chapterId` (path, required): integer<int32>
- `file` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Book/{chapterId}/chapters
*This will return a list of mappings from ID -> page num. ID will be the xhtml key and page num will be the reading order
this is used to rewrite anchors in the book text so that we always load properly in our reader.*

**Parameters:**
- `chapterId` (path, required): integer<int32>

**Responses:**
**200** OK
```
[BookChapterItem]
```

**See schemas:** BookChapterItem

---

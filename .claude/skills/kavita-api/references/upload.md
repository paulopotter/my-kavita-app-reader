# Kavita API — Upload

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/Upload/chapter
*Replaces chapter cover image and locks it with a base64 encoded image. This will update the parent volume's cover image.*

**Request body:**
```
UploadCoverFileDto
```

**Responses:**
**200** OK

**See schemas:** UploadCoverFileDto

---

## POST /api/Upload/collection
*Replaces collection tag cover image and locks it with a base64 encoded image*

**Request body:**
```
UploadCoverFileDto
```

**Responses:**
**200** OK

**See schemas:** UploadCoverFileDto

---

## POST /api/Upload/library
*Replaces library cover image with a base64 encoded image. If empty string passed, will reset to null.*

**Request body:**
```
UploadCoverFileDto
```

**Responses:**
**200** OK

**See schemas:** UploadCoverFileDto

---

## POST /api/Upload/person
*Replaces person tag cover image and locks it with a base64 encoded image*

**Request body:**
```
UploadCoverFileDto
```

**Responses:**
**200** OK

**See schemas:** UploadCoverFileDto

---

## POST /api/Upload/reading-list
*Replaces reading list cover image and locks it with a base64 encoded image*

**Request body:**
```
UploadCoverFileDto
```

**Responses:**
**200** OK

**See schemas:** UploadCoverFileDto

---

## POST /api/Upload/series
*Replaces series cover image and locks it with a base64 encoded image*

**Request body:**
```
UploadCoverFileDto
```

**Responses:**
**200** OK

**See schemas:** UploadCoverFileDto

---

## POST /api/Upload/upload-by-file
*Stages an uploaded image file in the temp directory for use in a cover image replacement flow.
This is automatically cleaned up.*

**Request body:**
```
Content-Type: multipart/form-data
{
  file: string<binary>
}
```

**Responses:**
**200** OK
```
string
```

---

## POST /api/Upload/upload-by-url
*This stores a file (image) in temp directory for use in a cover image replacement flow.
This is automatically cleaned up.*

**Request body:**
```
UploadUrlDto
```

**Responses:**
**200** OK
```
string
```

**See schemas:** UploadUrlDto

---

## POST /api/Upload/upload-chapter-cover

**Parameters:**
- `chapterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
string
```

---

## POST /api/Upload/upload-series-cover

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
string
```

---

## POST /api/Upload/upload-volume-cover

**Parameters:**
- `volumeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
string
```

---

## POST /api/Upload/user
*Replaces user cover image and locks it with a base64 encoded image*

**Request body:**
```
UploadCoverFileDto
```

**Responses:**
**200** OK

**See schemas:** UploadCoverFileDto

---

## POST /api/Upload/volume
*Replaces volume cover image and locks it with a base64 encoded image.*

**Request body:**
```
UploadCoverFileDto
```

**Responses:**
**200** OK

**See schemas:** UploadCoverFileDto

---

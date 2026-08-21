# Kavita API — Theme

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Theme

**Responses:**
**200** OK
```
[SiteThemeDto]
```

**See schemas:** SiteThemeDto

---

## DELETE /api/Theme
*Attempts to delete a theme. If already in use by users, will not allow*

**Parameters:**
- `themeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[DownloadableSiteThemeDto]
```

**See schemas:** DownloadableSiteThemeDto

---

## GET /api/Theme/browse
*Browse themes that can be used on this server*

**Responses:**
**200** OK
```
[DownloadableSiteThemeDto]
```

**See schemas:** DownloadableSiteThemeDto

---

## GET /api/Theme/download-content
*Returns css content to the UI. UI is expected to escape the content*

**Parameters:**
- `themeId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
string
```

---

## POST /api/Theme/download-theme
*Downloads a SiteTheme from upstream*

**Request body:**
```
DownloadableSiteThemeDto
```

**Responses:**
**200** OK
```
SiteThemeDto
```

**See schemas:** DownloadableSiteThemeDto, SiteThemeDto

---

## POST /api/Theme/update-default

**Request body:**
```
UpdateDefaultThemeDto
```

**Responses:**
**200** OK

**See schemas:** UpdateDefaultThemeDto

---

## POST /api/Theme/upload-theme
*Uploads a new theme file*

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
SiteThemeDto
```

**See schemas:** SiteThemeDto

---

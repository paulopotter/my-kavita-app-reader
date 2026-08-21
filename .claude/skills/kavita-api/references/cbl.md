# Kavita API — Cbl

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Cbl/browse
*Provides the browse CBL Repo interface. Requires Download role.*

**Parameters:**
- `path` (query, optional): string

**Responses:**
**200** OK
```
CblRepoBrowseResultDto
```

**See schemas:** CblRepoBrowseResultDto

---

## POST /api/Cbl/file-import
*Saves an uploaded CBL file to disk without importing. Returns the saved file info.*

**Request body:**
```
Content-Type: multipart/form-data
{
  cblFile: string<binary>
}
```

**Responses:**
**200** OK
```
CblSavedFileDto
```

**See schemas:** CblSavedFileDto

---

## POST /api/Cbl/finalize-import
*Finalizes the import of a saved CBL file with user decisions*

**Request body:**
```
CblFinalizeRequestDto
```

**Responses:**
**200** OK
```
CblImportSummaryDto
```

**See schemas:** CblFinalizeRequestDto, CblImportSummaryDto

---

## POST /api/Cbl/re-validate
*Validates an already-saved CBL file on disk. Called by the import modal after remap rule changes.*

**Request body:**
```
CblReValidateRequestDto
```

**Responses:**
**200** OK
```
CblImportSummaryDto
```

**See schemas:** CblImportSummaryDto, CblReValidateRequestDto

---

## GET /api/Cbl/remap-rules
*Returns all remap rules accessible to the current user (own rules + global/admin rules).*

**Responses:**
**200** OK
```
[RemapRuleDto]
```

**See schemas:** RemapRuleDto

---

## POST /api/Cbl/remap-rules
*Creates a new remap rule, or updates an existing one if a rule with the same
CBL matching key (normalized name + volume + number) already exists for this user.
When no explicit VolumeId is provided, attempts to auto-resolve a matching volume
on the target series from the CBL volume string.*

**Request body:**
```
CreateRemapRuleDto
```

**Responses:**
**200** OK
```
RemapRuleDto
```

**See schemas:** CreateRemapRuleDto, RemapRuleDto

---

## GET /api/Cbl/remap-rules/all
*Returns all rules across all users*

**Responses:**
**200** OK
```
[RemapRuleDto]
```

**See schemas:** RemapRuleDto

---

## POST /api/Cbl/remap-rules/{id}
*Updates a remap rule with issue-level detail (volume/chapter).*

**Parameters:**
- `id` (path, required): integer<int32>

**Request body:**
```
UpdateRemapRuleDto
```

**Responses:**
**200** OK
```
RemapRuleDto
```

**See schemas:** RemapRuleDto, UpdateRemapRuleDto

---

## DELETE /api/Cbl/remap-rules/{id}
*Deletes a remap rule. Users can only delete their own rules.*

**Parameters:**
- `id` (path, required): integer<int32>

**Responses:**
**200** OK

---

## POST /api/Cbl/remap-rules/{id}/demote
*Demotes a global remap rule back to user-scoped. Admin-only.*

**Parameters:**
- `id` (path, required): integer<int32>

**Responses:**
**200** OK
```
RemapRuleDto
```

**See schemas:** RemapRuleDto

---

## POST /api/Cbl/remap-rules/{id}/promote
*Promotes a remap rule to global scope. Admin-only.*

**Parameters:**
- `id` (path, required): integer<int32>

**Responses:**
**200** OK
```
RemapRuleDto
```

**See schemas:** RemapRuleDto

---

## POST /api/Cbl/repo-import
*Downloads selected CBL files from the GitHub repo and saves them to disk without importing.*

**Request body:**
```
CblRepoImportRequestDto
```

**Responses:**
**200** OK
```
[CblSavedFileDto]
```

**See schemas:** CblRepoImportRequestDto, CblSavedFileDto

---

## POST /api/Cbl/sync
*Enqueues the Reading List to be synced on a background thread. UI will be informed from Kavita.Models.DTOs.SignalR.MessageFactory.ReadingListUpdated event*

**Parameters:**
- `readingListId` (query, optional): integer<int32>
- `force` (query, optional): boolean

**Responses:**
**200** OK

---

## POST /api/Cbl/upload-cbl-file
*Downloads a CBL file from a URL and saves it to disk without importing.*

**Request body:**
```
UploadUrlDto
```

**Responses:**
**200** OK
```
CblSavedFileDto
```

**See schemas:** CblSavedFileDto, UploadUrlDto

---

# Kavita API — Library

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Library
*Return a specific library*

**Parameters:**
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
LibraryDto
```

**See schemas:** LibraryDto

---

## POST /api/Library/copy-settings-from
*Copy the library settings (adv tab + optional type) to a set of other libraries.*

**Request body:**
```
CopySettingsFromLibraryDto
```

**Responses:**
**200** OK

**See schemas:** CopySettingsFromLibraryDto

---

## POST /api/Library/create
*Creates a new Library. Upon library creation, adds new library to all Admin accounts.*

**Request body:**
```
UpdateLibraryDto
```

**Responses:**
**200** OK
```
LibraryDto
```

**See schemas:** LibraryDto, UpdateLibraryDto

---

## DELETE /api/Library/delete
*Deletes the library and all series within it.*

**Parameters:**
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## DELETE /api/Library/delete-multiple
*Deletes multiple libraries and all series within it.*

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

## POST /api/Library/grant-access
*Grants a user account access to a Library*

**Request body:**
```
UpdateLibraryForUserDto
```

**Responses:**
**200** OK
```
MemberDto
```

**See schemas:** MemberDto, UpdateLibraryForUserDto

---

## POST /api/Library/has-files-at-root
*For each root, checks if there are any supported files at root to warn the user during library creation about an invalid setup*

**Request body:**
```
CheckForFilesInFolderRootsDto
```

**Responses:**
**200** OK
```
[string]
```

**See schemas:** CheckForFilesInFolderRootsDto

---

## GET /api/Library/jump-bar
*For a given library, generate the jump bar information*

**Parameters:**
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[JumpKeyDto]
```

**See schemas:** JumpKeyDto

---

## GET /api/Library/libraries
*Return all libraries in the Server*

**Responses:**
**200** OK
```
[LibraryDto]
```

**See schemas:** LibraryDto

---

## GET /api/Library/list
*Returns a list of directories for a given path. If path is empty, returns root drives.*

**Parameters:**
- `path` (query, optional): string

**Responses:**
**200** OK
```
[DirectoryDto]
```

**See schemas:** DirectoryDto

---

## GET /api/Library/metadata-enabled-libraries
*Kavita.Models.Entities.Enums.LibraryType with KavitaPlus metadata support*

**Responses:**
**200** OK
```
[LibraryType]
```

**See schemas:** LibraryType

---

## GET /api/Library/metadata-providers
*Return all Kavita.Models.Entities.Enums.MetadataProviders that are supported by the given Kavita.Models.Entities.Enums.LibraryType"/>*

**Parameters:**
- `libraryType` (query, optional): LibraryType

**Responses:**
**200** OK
```
[MetadataProvider]
```

**See schemas:** LibraryType, MetadataProvider

---

## GET /api/Library/name-exists
*Checks if the library name exists or not*

**Parameters:**
- `name` (query, optional): string

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/Library/refresh-metadata

**Parameters:**
- `libraryId` (query, optional): integer<int32>
- `force` (query, optional): boolean
- `forceColorscape` (query, optional): boolean

**Responses:**
**200** OK

---

## POST /api/Library/refresh-metadata-multiple

**Parameters:**
- `forceColorscape` (query, optional): boolean

**Request body:**
```
BulkActionDto
```

**Responses:**
**200** OK

**See schemas:** BulkActionDto

---

## POST /api/Library/scan
*Scans a given library for file changes.*

**Parameters:**
- `libraryId` (query, optional): integer<int32>
- `force` (query, optional): boolean

**Responses:**
**200** OK

---

## POST /api/Library/scan-all
*Scans a given library for file changes. If another scan task is in progress, will reschedule the invocation for 3 hours in future.*

**Parameters:**
- `force` (query, optional): boolean

**Responses:**
**200** OK

---

## POST /api/Library/scan-folder
*Given a valid path, will invoke either a Scan Series or Scan Library. If the folder does not exist within Kavita, the request will be ignored*

**Request body:**
```
ScanFolderDto
```

**Responses:**
**200** OK

**See schemas:** ScanFolderDto

---

## POST /api/Library/scan-multiple
*Enqueues a bunch of library scans*

**Request body:**
```
BulkActionDto
```

**Responses:**
**200** OK

**See schemas:** BulkActionDto

---

## GET /api/Library/scrobble-enabled-libraries
*Kavita.Models.Entities.Enums.LibraryType with KavitaPlus scrobble support*

**Responses:**
**200** OK
```
[LibraryType]
```

**See schemas:** LibraryType

---

## GET /api/Library/type
*Returns the type of the underlying library*

**Parameters:**
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
LibraryType
```

**See schemas:** LibraryType

---

## POST /api/Library/update
*Updates an existing Library with new name, folders, and/or type.*

**Request body:**
```
UpdateLibraryDto
```

**Responses:**
**200** OK

**See schemas:** UpdateLibraryDto

---

## GET /api/Library/user-libraries
*Gets libraries for the given user that you also have access to*

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[LibraryDto]
```

**See schemas:** LibraryDto

---

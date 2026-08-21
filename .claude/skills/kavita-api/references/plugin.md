# Kavita API — Plugin

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/Plugin/authenticate
*Authenticate with the Server given an auth key. This will log you in by returning the user object and the JWT token.*

**Parameters:**
- `apiKey` (query, required): string
- `pluginName` (query, required): string

**Responses:**
**200** OK
```
UserDto
```

**See schemas:** UserDto

---

## GET /api/Plugin/authkey-expires
*Returns the expiration (UTC) of the authenticated Auth key (or null if none set)*

**Responses:**
**200** OK
```
AuthKeyExpiresAtDto
```

**See schemas:** AuthKeyExpiresAtDto

---

## GET /api/Plugin/parse
*Parse a string and return Parsed information from it. Does not support any directory fallback parsing*

**Parameters:**
- `name` (query, optional): string
- `libraryType` (query, optional): LibraryType

**Responses:**
**200** OK
```
ParseResultDto
```

**See schemas:** LibraryType, ParseResultDto

---

## POST /api/Plugin/parse-bulk

**Request body:**
```
ParseBulkRequestDto
```

**Responses:**
**200** OK
```
ParseBulkResponseDto
```

**See schemas:** ParseBulkRequestDto, ParseBulkResponseDto

---

## GET /api/Plugin/version
*Returns the version of the Kavita install*

**Parameters:**
- `apiKey` (query, required): string

**Responses:**
**200** OK
```
string
```

---

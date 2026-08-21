# Kavita API — Scrobbling

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/Scrobbling/add-hold
*Adds a hold against the Series for user's scrobbling*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/Scrobbling/bulk-remove-events
*Delete the given scrobble events if they belong to that user*

**Request body:**
```
[integer<int64>]
```

**Responses:**
**200** OK

---

## POST /api/Scrobbling/clear-errors
*Clears the scrobbling errors table*

**Responses:**
**200** OK

---

## GET /api/Scrobbling/expired-tokens
*Returns all expired tokens for the current user*

**Responses:**
**200** OK
```
[ScrobbleProvider]
```

**See schemas:** ScrobbleProvider

---

## POST /api/Scrobbling/generate-scrobble-events
*Generate scrobble events from history. Should only be ran once per user.*

**Parameters:**
- `scrobbleProvider` (query, optional): ScrobbleProvider

**Responses:**
**200** OK

**See schemas:** ScrobbleProvider

---

## POST /api/Scrobbling/generate-scrobble-events-all
*Generate scrobble events from history for all valid providers.*

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Scrobbling/has-hold
*If there is an active hold on the series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Scrobbling/holds
*Returns all scrobble holds for the current user*

**Responses:**
**200** OK
```
[ScrobbleHoldDto]
```

**See schemas:** ScrobbleHoldDto

---

## GET /api/Scrobbling/library-allows-scrobbling
*Does the library the series is in allow scrobbling?*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Scrobbling/next-scrobble-time
*Returns when Scrobbling upload will next execute*

**Responses:**
**200** OK
```
string<date-time>
```

---

## DELETE /api/Scrobbling/remove-error/{id}

**Parameters:**
- `id` (path, required): integer<int32>

**Responses:**
**200** OK

---

## DELETE /api/Scrobbling/remove-hold
*Remove a hold against the Series for user's scrobbling*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/Scrobbling/retry-scrobble
*Attempts to retry Scrobble Events for the current authenticated user (or admin-allowed).*

**Request body:**
```
KavitaPlusAuditEntryDto
```

**Responses:**
**200** OK
```
boolean
```

**See schemas:** KavitaPlusAuditEntryDto

---

## GET /api/Scrobbling/scrobble-errors
*Returns all scrobbling errors for the instance*

**Responses:**
**200** OK
```
[ScrobbleErrorDto]
```

**See schemas:** ScrobbleErrorDto

---

## POST /api/Scrobbling/scrobble-events
*Returns the scrobbling history for the user*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
ScrobbleEventFilter
```

**Responses:**
**200** OK
```
[ScrobbleEventDto]
```

**See schemas:** ScrobbleEventDto, ScrobbleEventFilter

---

## GET /api/Scrobbling/scrobble-settings
*Returns all scrobble providers for a user. This list is guaranteed to contain an entry for each currently
valid scrobble provider. If the user has none setup, returns the empty default values.*

**Responses:**
**200** OK
```
[ScrobbleProviderDto]
```

**See schemas:** ScrobbleProviderDto

---

## GET /api/Scrobbling/token-expired
*Checks if the current Scrobbling token for the given Provider has expired for the current user*

**Parameters:**
- `provider` (query, optional): ScrobbleProvider

**Responses:**
**200** OK
```
boolean
```

**See schemas:** ScrobbleProvider

---

## POST /api/Scrobbling/update-scrobble-settings
*Updates the scrobble settings for a given provider. Libraries are filtered on supported types*

**Parameters:**
- `provider` (query, optional): ScrobbleProvider

**Request body:**
```
ScrobbleProviderSettingsDto
```

**Responses:**
**200** OK

**See schemas:** ScrobbleProvider, ScrobbleProviderSettingsDto

---

## POST /api/Scrobbling/update-user-scrobble-provider
*Update authentication details for the given provider*

**Request body:**
```
UpdateScrobbleProviderDto
```

**Responses:**
**200** OK

**See schemas:** UpdateScrobbleProviderDto

---

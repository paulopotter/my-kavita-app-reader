# Kavita API — KavitaPlusAudit

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/kavita-plus-audit/entries
*Returns a paged, filtered list of all Kavita+ audit events. Admin only.*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
KavitaPlusAuditFilterDto
```

**Responses:**
**200** OK
```
[KavitaPlusAuditEntryDto]
```

**See schemas:** KavitaPlusAuditEntryDto, KavitaPlusAuditFilterDto

---

## GET /api/kavita-plus-audit/entries/series/{seriesId}
*Returns Kavita+ audit info scoped to a single series, for the popover.
Scrobble events are filtered to the calling user unless they are an admin.*

**Parameters:**
- `seriesId` (path, required): integer<int32>

**Responses:**
**200** OK
```
KavitaPlusAuditSeriesInfoDto
```

**See schemas:** KavitaPlusAuditSeriesInfoDto

---

## GET /api/kavita-plus-audit/failed-scrobble-events

**Responses:**
**200** OK
```
integer<int32>
```

---

## POST /api/kavita-plus-audit/my-activity
*Returns the calling user's own Kavita+ activity, paged and filtered.*

**Parameters:**
- `PageNumber` (query, optional): integer<int32>
- `PageSize` (query, optional): integer<int32>

**Request body:**
```
KavitaPlusAuditFilterDto
```

**Responses:**
**200** OK
```
[KavitaPlusAuditEntryDto]
```

**See schemas:** KavitaPlusAuditEntryDto, KavitaPlusAuditFilterDto

---

## GET /api/kavita-plus-audit/my-stats
*Aggregate stats for my activity audit feed*

**Responses:**
**200** OK
```
KavitaPlusMyAuditStatsDto
```

**See schemas:** KavitaPlusMyAuditStatsDto

---

## GET /api/kavita-plus-audit/stats
*Returns aggregate stats for the admin audit feed*

**Responses:**
**200** OK
```
KavitaPlusAuditStatsDto
```

**See schemas:** KavitaPlusAuditStatsDto

---

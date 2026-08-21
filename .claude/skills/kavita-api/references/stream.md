# Kavita API — Stream

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/Stream/add-dashboard-stream
*Creates a Dashboard Stream from a SmartFilter and adds it to the user's dashboard as visible*

**Parameters:**
- `smartFilterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
DashboardStreamDto
```

**See schemas:** DashboardStreamDto

---

## POST /api/Stream/add-sidenav-stream
*Creates a SideNav Stream from a SmartFilter and adds it to the user's sidenav as visible*

**Parameters:**
- `smartFilterId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
SideNavStreamDto
```

**See schemas:** SideNavStreamDto

---

## POST /api/Stream/add-sidenav-stream-from-external-source
*Creates a SideNav Stream from a SmartFilter and adds it to the user's sidenav as visible*

**Parameters:**
- `externalSourceId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
SideNavStreamDto
```

**See schemas:** SideNavStreamDto

---

## POST /api/Stream/bulk-sidenav-stream-visibility

**Request body:**
```
BulkUpdateSideNavStreamVisibilityDto
```

**Responses:**
**200** OK

**See schemas:** BulkUpdateSideNavStreamVisibilityDto

---

## POST /api/Stream/create-external-source
*Create an external Source*

**Request body:**
```
ExternalSourceDto
```

**Responses:**
**200** OK
```
ExternalSourceDto
```

**See schemas:** ExternalSourceDto

---

## GET /api/Stream/dashboard
*Returns the layout of the user's dashboard*

**Parameters:**
- `visibleOnly` (query, optional): boolean

**Responses:**
**200** OK
```
[DashboardStreamDto]
```

**See schemas:** DashboardStreamDto

---

## DELETE /api/Stream/delete-external-source
*Delete's the external source*

**Parameters:**
- `externalSourceId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/Stream/external-source-exists
*Validates the external source by host is unique (for this user)*

**Request body:**
```
ExternalSourceDto
```

**Responses:**
**200** OK
```
boolean
```

**See schemas:** ExternalSourceDto

---

## GET /api/Stream/external-sources
*Return's the user's external sources*

**Responses:**
**200** OK
```
[ExternalSourceDto]
```

**See schemas:** ExternalSourceDto

---

## GET /api/Stream/sidenav
*Return's the user's side nav*

**Parameters:**
- `visibleOnly` (query, optional): boolean

**Responses:**
**200** OK
```
[SideNavStreamDto]
```

**See schemas:** SideNavStreamDto

---

## DELETE /api/Stream/smart-filter-dashboard-stream
*Removes a Smart Filter from a user's Dashboard Streams*

**Parameters:**
- `dashboardStreamId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## DELETE /api/Stream/smart-filter-side-nav-stream
*Removes a Smart Filter from a user's SideNav Streams*

**Parameters:**
- `sideNavStreamId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## POST /api/Stream/update-dashboard-position
*Updates the position of a dashboard stream*

**Request body:**
```
UpdateStreamPositionDto
```

**Responses:**
**200** OK

**See schemas:** UpdateStreamPositionDto

---

## POST /api/Stream/update-dashboard-stream
*Updates the visibility of a dashboard stream*

**Request body:**
```
DashboardStreamDto
```

**Responses:**
**200** OK

**See schemas:** DashboardStreamDto

---

## POST /api/Stream/update-external-source
*Updates an existing external source*

**Request body:**
```
ExternalSourceDto
```

**Responses:**
**200** OK
```
ExternalSourceDto
```

**See schemas:** ExternalSourceDto

---

## POST /api/Stream/update-sidenav-position
*Updates the position of a dashboard stream*

**Request body:**
```
UpdateStreamPositionDto
```

**Responses:**
**200** OK

**See schemas:** UpdateStreamPositionDto

---

## POST /api/Stream/update-sidenav-stream
*Updates the visibility of a dashboard stream*

**Request body:**
```
SideNavStreamDto
```

**Responses:**
**200** OK

**See schemas:** SideNavStreamDto

---

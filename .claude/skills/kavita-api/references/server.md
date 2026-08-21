# Kavita API — Server

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/Server/analyze-files
*This is a one time task that needs to be ran for v0.7 statistics to work*

**Responses:**
**200** OK

---

## POST /api/Server/backup-db
*Performs an ad-hoc backup of the Database*

**Responses:**
**200** OK

---

## POST /api/Server/bust-kavitaplus-cache
*Bust Kavita+ Cache*

**Responses:**
**200** OK

---

## GET /api/Server/changelog
*Pull the Changelog for Kavita from Github and display*

**Parameters:**
- `count` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[UpdateNotificationDto]
```

**See schemas:** UpdateNotificationDto

---

## GET /api/Server/check-for-updates
*Checks for updates and pushes an event to the UI*

**Responses:**
**200** OK

---

## GET /api/Server/check-out-of-date
*Returns how many versions out of date this install is*

**Parameters:**
- `stableOnly` (query, optional): boolean

**Responses:**
**200** OK
```
integer<int32>
```

---

## GET /api/Server/check-update
*Checks for updates, if no updates that are > current version installed, returns null*

**Responses:**
**200** OK
```
UpdateNotificationDto
```

**See schemas:** UpdateNotificationDto

---

## POST /api/Server/cleanup
*Performs the nightly maintenance work on the Server. Can be heavy.*

**Responses:**
**200** OK

---

## POST /api/Server/cleanup-want-to-read
*Performs an ad-hoc cleanup of Want To Read, by removing want to read series for users, where the series are fully read and in Completed publication status.*

**Responses:**
**200** OK

---

## POST /api/Server/clear-cache
*Performs an ad-hoc cleanup of Cache*

**Responses:**
**200** OK

---

## POST /api/Server/clear-media-alerts
*Deletes all media errors*

**Responses:**
**200** OK

---

## POST /api/Server/convert-media
*Triggers the scheduling of the convert media job. This will convert all media to the target encoding (except for PNG). Only one job will run at a time.*

**Responses:**
**200** OK

---

## GET /api/Server/is-task-running
*Returns true if a task is currently running or has been queued. Can be scoped to a queue, default to the default queue*

**Parameters:**
- `methodName` (query, optional): string
- `queue` (query, optional): string

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Server/jobs
*Returns a list of reoccurring jobs. Scheduled ad-hoc jobs will not be returned.*

**Responses:**
**200** OK
```
[JobDto]
```

**See schemas:** JobDto

---

## GET /api/Server/logs
*Downloads all the log files via a zip*

**Responses:**
**200** OK

---

## GET /api/Server/media-errors
*Returns a list of issues found during scanning or reading in which files may have corruption or bad metadata (structural metadata)*

**Responses:**
**200** OK
```
[MediaErrorDto]
```

**See schemas:** MediaErrorDto

---

## GET /api/Server/server-info-slim
*Returns non-sensitive information about the current system*

**Responses:**
**200** OK
```
ServerInfoSlimDto
```

**See schemas:** ServerInfoSlimDto

---

## POST /api/Server/sync-themes
*Runs the Sync Themes task*

**Responses:**
**200** OK

---

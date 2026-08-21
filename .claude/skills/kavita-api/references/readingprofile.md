# Kavita API — ReadingProfile

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## POST /api/reading-profile
*Updates the given reading profile, must belong to the current user*

**Request body:**
```
UserReadingProfileDto
```

**Responses:**
**200** OK
```
UserReadingProfileDto
```

**See schemas:** UserReadingProfileDto

---

## DELETE /api/reading-profile
*Deletes the given profile, requires the profile to belong to the logged-in user*

**Parameters:**
- `profileId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/reading-profile/all
*Gets all non-implicit reading profiles for a user*

**Responses:**
**200** OK
```
[UserReadingProfileDto]
```

**See schemas:** UserReadingProfileDto

---

## POST /api/reading-profile/bulk
*Assigns the reading profile to all passes series, and deletes their implicit profiles*

**Request body:**
```
BulkSetSeriesProfiles
```

**Responses:**
**200** OK

**See schemas:** BulkSetSeriesProfiles

---

## POST /api/reading-profile/create
*Creates a new reading profile for the current user*

**Request body:**
```
UserReadingProfileDto
```

**Responses:**
**200** OK
```
UserReadingProfileDto
```

**See schemas:** UserReadingProfileDto

---

## GET /api/reading-profile/library
*Returns all the Reading rofiles bound to the library*

**Parameters:**
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[UserReadingProfileDto]
```

**See schemas:** UserReadingProfileDto

---

## POST /api/reading-profile/library/{libraryId}
*Sets the reading profile for a given library, removes the old one*

**Parameters:**
- `libraryId` (path, required): integer<int32>

**Request body:**
```
[integer<int32>]
```

**Responses:**
**200** OK

---

## DELETE /api/reading-profile/library/{libraryId}
*Clears the reading profile for the given library for the currently logged-in user*

**Parameters:**
- `libraryId` (path, required): integer<int32>

**Responses:**
**200** OK

---

## POST /api/reading-profile/promote
*Promotes the implicit profile to a user profile. Removes the series from other profiles*

**Parameters:**
- `profileId` (query, optional): integer<int32>
- `deviceId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
UserReadingProfileDto
```

**See schemas:** UserReadingProfileDto

---

## GET /api/reading-profile/series
*Returns all Reading Profiles bound to a series*

**Parameters:**
- `seriesId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
[UserReadingProfileDto]
```

**See schemas:** UserReadingProfileDto

---

## POST /api/reading-profile/series
*Update the implicit reading profile for a series, creates one if none exists*

**Parameters:**
- `libraryId` (query, optional): integer<int32>
- `seriesId` (query, optional): integer<int32>
- `deviceId` (query, optional): integer<int32>

**Request body:**
```
UserReadingProfileDto
```

**Responses:**
**200** OK
```
UserReadingProfileDto
```

**See schemas:** UserReadingProfileDto

---

## POST /api/reading-profile/series/{seriesId}
*Sets the reading profile for a given series, removes the old one*

**Parameters:**
- `seriesId` (path, required): integer<int32>

**Request body:**
```
[integer<int32>]
```

**Responses:**
**200** OK

---

## DELETE /api/reading-profile/series/{seriesId}
*Clears the reading profile for the given series for the currently logged-in user*

**Parameters:**
- `seriesId` (path, required): integer<int32>

**Responses:**
**200** OK

---

## POST /api/reading-profile/set-devices
*Set the assigned devices for a reading profile*

**Parameters:**
- `profileId` (query, optional): integer<int32>

**Request body:**
```
[integer<int32>]
```

**Responses:**
**200** OK

---

## POST /api/reading-profile/update-parent
*Updates the non-implicit reading profile for the given series, and removes implicit profiles*

**Parameters:**
- `libraryId` (query, optional): integer<int32>
- `seriesId` (query, optional): integer<int32>
- `deviceId` (query, optional): integer<int32>

**Request body:**
```
UserReadingProfileDto
```

**Responses:**
**200** OK
```
UserReadingProfileDto
```

**See schemas:** UserReadingProfileDto

---

## GET /api/reading-profile/{libraryId}/{seriesId}
*Returns the ReadingProfile that should be applied to the given series, walks up the tree.
Series -> Library -> Default*

**Parameters:**
- `libraryId` (path, required): integer<int32>
- `seriesId` (path, required): integer<int32>
- `skipImplicit` (query, optional): boolean
- `deviceId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
UserReadingProfileDto
```

**See schemas:** UserReadingProfileDto

---

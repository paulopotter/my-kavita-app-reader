# Kavita API — Users

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Users
*Returns all users of this server*

**Parameters:**
- `includePending` (query, optional): boolean

**Responses:**
**200** OK
```
[MemberDto]
```

**See schemas:** MemberDto

---

## DELETE /api/Users/delete-user

**Parameters:**
- `username` (query, optional): string

**Responses:**
**200** OK

---

## GET /api/Users/get-preferences
*Returns the preferences of the user*

**Responses:**
**200** OK
```
UserPreferencesDto
```

**See schemas:** UserPreferencesDto

---

## GET /api/Users/has-library-access
*Does the user have access to this library*

**Parameters:**
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Users/has-profile-shared
*Does the requested user have their profile sharing on*

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Users/has-reading-progress
*Is there any reading progress on this library*

**Parameters:**
- `libraryId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Users/names
*Returns a list of the user names within the system*

**Responses:**
**200** OK
```
[string]
```

---

## GET /api/Users/profile-info
*Get Information about a given user*

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
MemberInfoDto
```

**See schemas:** MemberInfoDto

---

## GET /api/Users/tokens
*Returns all users with tokens registered and their token information. Does not send the tokens.*

**Responses:**
**200** OK
```
[UserTokenInfoDto]
```

**See schemas:** UserTokenInfoDto

---

## POST /api/Users/update-preferences
*Update the user preferences*

**Request body:**
```
UserPreferencesDto
```

**Responses:**
**200** OK
```
UserPreferencesDto
```

**See schemas:** UserPreferencesDto

---

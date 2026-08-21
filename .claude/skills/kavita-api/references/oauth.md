# Kavita API — OAuth

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/OAuth/callback
*Callback from KavitaPlus.*

**Parameters:**
- `upstream` (query, optional): OAuthUpstream
- `token` (query, optional): string
- `apiKey` (query, optional): string
- `refreshToken` (query, optional): string

**Responses:**
**200** OK

**See schemas:** OAuthUpstream

---

## GET /api/OAuth/start
*Start the OAuth flow for the given upstream, redirect (302!) to KavitaPlus*

**Parameters:**
- `upstream` (query, optional): OAuthUpstream

**Responses:**
**200** OK

**See schemas:** OAuthUpstream

---

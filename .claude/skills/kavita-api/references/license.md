# Kavita API — License

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## DELETE /api/License
*Remove the Kavita+ License on the Server*

**Responses:**
**200** OK

---

## POST /api/License
*Updates server license*

**Request body:**
```
UpdateLicenseDto
```

**Responses:**
**200** OK
```
KavitaPlusRegisterResultDto
```

**See schemas:** KavitaPlusRegisterResultDto, UpdateLicenseDto

---

## DELETE /api/License/cancel
*Cancels the active Kavita+ Subscription tied to this server. License will elapse at end of billing period.*

**Request body:**
```
CancelKavitaPlusLicenseDto
```

**Responses:**
**200** OK

**See schemas:** CancelKavitaPlusLicenseDto

---

## POST /api/License/change-email
*Change email on Kavita+ License/Stripe - Sends a confirmation email on Kavita+ side. No-op for server.*

**Request body:**
```
ChangeEmailOnLicenseDto
```

**Responses:**
**200** OK
```
boolean
```

**See schemas:** ChangeEmailOnLicenseDto

---

## GET /api/License/has-license
*Has any license registered with the instance. Does not validate against Kavita+ API*

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/License/info
*Asks Kavita+ for the latest license info*

**Parameters:**
- `forceCheck` (query, optional): boolean

**Responses:**
**200** OK
```
LicenseInfoDto
```

**See schemas:** LicenseInfoDto

---

## GET /api/License/products
*Returns the available Kavita+ products (billing interval and list price) the renew flow can select.*

**Responses:**
**200** OK
```
[KavitaPlusProductInfoDto]
```

**See schemas:** KavitaPlusProductInfoDto

---

## GET /api/License/provider-health
*Provides a 15 min snapshot of Kavita+ Providers (Hardcover, AniList, MangaBaka, etc.) API health.
Kavita caches every 45 mins.*

**Parameters:**
- `forceCheck` (query, optional): boolean

**Responses:**
**200** OK
```
[KavitaPlusProviderHealthSnapshotDto]
```

**See schemas:** KavitaPlusProviderHealthSnapshotDto

---

## POST /api/License/renew
*Renews the subscription on the given billing interval and returns the Stripe Checkout (Pay Now) URL the customer visits to pay.*

**Request body:**
```
RenewKavitaPlusLicenseDto
```

**Responses:**
**200** OK
```
string
```

**See schemas:** RenewKavitaPlusLicenseDto

---

## POST /api/License/resend-license
*Resend the welcome email to the user*

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/License/reset
*Break the registration between Kavita+ and this instance*

**Request body:**
```
UpdateLicenseDto
```

**Responses:**
**200** OK

**See schemas:** UpdateLicenseDto

---

## GET /api/License/stats
*Providers how many interactions this license has had with Kavita+ over a lifetime*

**Responses:**
**200** OK
```
KavitaPlusLicenseUsageDto
```

**See schemas:** KavitaPlusLicenseUsageDto

---

## GET /api/License/valid-license
*Checks if the user's license is valid or not*

**Parameters:**
- `forceCheck` (query, optional): boolean

**Responses:**
**200** OK
```
boolean
```

---

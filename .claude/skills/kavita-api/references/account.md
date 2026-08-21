# Kavita API — Account

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Account
*Returns the current user, as it would from login*

**Responses:**
**200** OK
```
UserDto
```

**See schemas:** UserDto

---

## DELETE /api/Account/auth-key
*Delete the Auth Key*

**Parameters:**
- `authKeyId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Account/auth-keys
*Returns all Auth Keys with the account*

**Responses:**
**200** OK
```
[AuthKeyDto]
```

**See schemas:** AuthKeyDto

---

## POST /api/Account/clear-oidc-link
*Remove the OIDC link for the authenticated user. This action will also remove the authentication cookie.
The caller should take note and redirect to login if no other authentication is currently present (I.e. JWT)*

**Responses:**
**200** OK

---

## POST /api/Account/confirm-email
*Last step in authentication flow, confirms the email token for email*

**Request body:**
```
ConfirmEmailDto
```

**Responses:**
**200** OK
```
UserDto
```

**See schemas:** ConfirmEmailDto, UserDto

---

## POST /api/Account/confirm-email-update
*Final step in email update change. Given a confirmation token and the email, this will finish the email change.*

**Request body:**
```
ConfirmEmailUpdateDto
```

**Responses:**
**200** OK

**See schemas:** ConfirmEmailUpdateDto

---

## POST /api/Account/confirm-migration-email

**Request body:**
```
ConfirmMigrationEmailDto
```

**Responses:**
**200** OK
```
UserDto
```

**See schemas:** ConfirmMigrationEmailDto, UserDto

---

## POST /api/Account/confirm-password-reset

**Request body:**
```
ConfirmPasswordResetDto
```

**Responses:**
**200** OK
```
string
```

**See schemas:** ConfirmPasswordResetDto

---

## POST /api/Account/create-auth-key
*Creates a new Auth Key for a user.*

**Request body:**
```
RotateAuthKeyRequestDto
```

**Responses:**
**200** OK
```
AuthKeyDto
```

**See schemas:** AuthKeyDto, RotateAuthKeyRequestDto

---

## GET /api/Account/email-confirmed

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/Account/forgot-password
*Will send user a link to update their password to their email or prompt them if not accessible*

**Parameters:**
- `email` (query, optional): string

**Responses:**
**200** OK
```
string
```

---

## POST /api/Account/invite
*Invites a user to the server. Will generate a setup link for continuing setup. If email is not setup, a link will be presented to user to continue setup.*

**Request body:**
```
InviteUserDto
```

**Responses:**
**200** OK
```
string
```

**See schemas:** InviteUserDto

---

## GET /api/Account/invite-url
*Requests the Invite Url for the AppUserId. Will return error if user is already validated.*

**Parameters:**
- `userId` (query, optional): integer<int32>
- `withBaseUrl` (query, optional): boolean

**Responses:**
**200** OK
```
string
```

---

## GET /api/Account/is-email-valid
*Is the user's current email valid or not*

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/Account/login
*Perform a login. Will send JWT Token of the logged in user back.*

**Request body:**
```
LoginDto
```

**Responses:**
**200** OK
```
UserDto
```

**See schemas:** LoginDto, UserDto

---

## GET /api/Account/oidc-authenticated
*Returns true if OIDC authentication cookies are present and the Kavita.Server.Extensions.IdentityServiceExtensions.OpenIdConnect
scheme has been registered*

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Account/opds-url
*Returns the OPDS url for this user*

**Parameters:**
- `authKeyName` (query, optional): string

**Responses:**
**200** OK
```
string
```

---

## GET /api/Account/refresh-account
*Returns an up-to-date user account*

**Responses:**
**200** OK
```
UserDto
```

**See schemas:** UserDto

---

## POST /api/Account/refresh-token
*Refreshes the user's JWT token*

**Request body:**
```
TokenRequestDto
```

**Responses:**
**200** OK
```
TokenRequestDto
```

**See schemas:** TokenRequestDto

---

## POST /api/Account/register
*Register the first user (admin) on the server. Will not do anything if an admin is already confirmed*

**Request body:**
```
RegisterDto
```

**Responses:**
**200** OK
```
UserDto
```

**See schemas:** RegisterDto, UserDto

---

## POST /api/Account/resend-confirmation-email
*Resend an invite to a user already invited*

**Parameters:**
- `userId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
InviteUserResponse
```

**See schemas:** InviteUserResponse

---

## POST /api/Account/reset-password
*Update a user's password*

**Request body:**
```
ResetPasswordDto
```

**Responses:**
**200** OK

**See schemas:** ResetPasswordDto

---

## GET /api/Account/roles
*Get All Roles back. See Kavita.Models.Constants.PolicyConstants*

**Responses:**
**200** OK
```
[string]
```

---

## POST /api/Account/rotate-auth-key
*Rotate the Auth Key*

**Parameters:**
- `authKeyId` (query, optional): integer<int32>

**Request body:**
```
RotateAuthKeyRequestDto
```

**Responses:**
**200** OK
```
AuthKeyDto
```

**See schemas:** AuthKeyDto, RotateAuthKeyRequestDto

---

## POST /api/Account/update
*Update the user account. This can only affect Username, Email (will require confirming), Roles, and Library access.*

**Request body:**
```
UpdateUserDto
```

**Responses:**
**200** OK

**See schemas:** UpdateUserDto

---

## POST /api/Account/update/age-restriction
*Change the Age Rating restriction for the user*

**Request body:**
```
UpdateAgeRestrictionDto
```

**Responses:**
**200** OK

**See schemas:** UpdateAgeRestrictionDto

---

## POST /api/Account/update/email
*Initiates the flow to update a user's email address.
            
If email is not setup, then the email address is not changed in this API. A confirmation link is sent/dumped which will
validate the email. It must be confirmed for the email to update.*

**Request body:**
```
UpdateEmailDto
```

**Responses:**
**200** OK
```
InviteUserResponse
```

**See schemas:** InviteUserResponse, UpdateEmailDto

---

## POST /api/Account/update/username
*Initiates the flow to update a user's username.*

**Request body:**
```
UpdateUsernameRequestDto
```

**Responses:**
**200** OK
```
InviteUserResponse
```

**See schemas:** InviteUserResponse, UpdateUsernameRequestDto

---

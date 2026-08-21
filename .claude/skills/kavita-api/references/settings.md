# Kavita API — Settings

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## GET /api/Settings
*Returns the server settings*

**Responses:**
**200** OK
```
ServerSettingDto
```

**See schemas:** ServerSettingDto

---

## POST /api/Settings
*Update Server settings*

**Request body:**
```
ServerSettingDto
```

**Responses:**
**200** OK
```
ServerSettingDto
```

**See schemas:** ServerSettingDto

---

## GET /api/Settings/base-url
*Returns the base url for this instance (if set)*

**Responses:**
**200** OK
```
string
```

---

## POST /api/Settings/import-field-mappings
*Import field mappings*

**Request body:**
```
ImportFieldMappingsDto
```

**Responses:**
**200** OK
```
FieldMappingsImportResultDto
```

**See schemas:** FieldMappingsImportResultDto, ImportFieldMappingsDto

---

## GET /api/Settings/is-email-setup
*Is the minimum information setup for Email to work*

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/Settings/is-valid-authority
*Validate if the given authority is reachable from the server*

**Request body:**
```
AuthorityValidationDto
```

**Responses:**
**200** OK
```
AuthorityValidationResult
```

**See schemas:** AuthorityValidationDto, AuthorityValidationResult

---

## GET /api/Settings/is-valid-cron
*Is the cron expression valid for Kavita's scheduler*

**Parameters:**
- `cronExpression` (query, optional): string

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Settings/library-types

**Responses:**
**200** OK
```
[string]
```

---

## GET /api/Settings/log-levels

**Responses:**
**200** OK
```
[string]
```

---

## GET /api/Settings/metadata-settings
*Get the metadata settings for Kavita+ users.*

**Responses:**
**200** OK
```
MetadataSettingsDto
```

**See schemas:** MetadataSettingsDto

---

## POST /api/Settings/metadata-settings
*Update the metadata settings for Kavita+ Metadata feature*

**Request body:**
```
MetadataSettingsDto
```

**Responses:**
**200** OK
```
MetadataSettingsDto
```

**See schemas:** MetadataSettingsDto

---

## GET /api/Settings/oidc
*Retrieve publicly required configuration regarding Oidc*

**Responses:**
**200** OK
```
OidcPublicConfigDto
```

**See schemas:** OidcPublicConfigDto

---

## GET /api/Settings/opds-enabled

**Responses:**
**200** OK
```
boolean
```

---

## POST /api/Settings/reset

**Responses:**
**200** OK
```
ServerSettingDto
```

**See schemas:** ServerSettingDto

---

## POST /api/Settings/reset-base-url
*Resets the Base url*

**Responses:**
**200** OK
```
ServerSettingDto
```

**See schemas:** ServerSettingDto

---

## POST /api/Settings/reset-external-ids

**Responses:**
**200** OK

---

## POST /api/Settings/reset-ip-addresses
*Resets the IP Addresses*

**Responses:**
**200** OK
```
ServerSettingDto
```

**See schemas:** ServerSettingDto

---

## POST /api/Settings/run-metadata-mappings

**Request body:**
```
RunMetadataMappingsRequestDto
```

**Responses:**
**200** OK

**See schemas:** RunMetadataMappingsRequestDto

---

## GET /api/Settings/task-frequencies
*All values allowed for Task Scheduling APIs. A custom cron job is not included. Disabled is not applicable for Cleanup.*

**Responses:**
**200** OK
```
[string]
```

---

## POST /api/Settings/test-email-url
*Sends a test email to see if email settings are hooked up correctly*

**Responses:**
**200** OK
```
EmailTestResultDto
```

**See schemas:** EmailTestResultDto

---

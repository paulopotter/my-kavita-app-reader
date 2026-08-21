# Kavita API — Device

Schema types (`SomeDto`) referenced below are defined once in `schemas.md` — look them up there instead of expecting them inline here.

## DELETE /api/Device
*Deletes the device from the user*

**Parameters:**
- `deviceId` (query, optional): integer<int32>

**Responses:**
**200** OK

---

## GET /api/Device

**Responses:**
**200** OK
```
[EmailDeviceDto]
```

**See schemas:** EmailDeviceDto

---

## GET /api/Device/client/all-devices
*Get All user client devices*

**Parameters:**
- `includeInactive` (query, optional): boolean

**Responses:**
**200** OK
```
[ClientDeviceDto]
```

**See schemas:** ClientDeviceDto

---

## DELETE /api/Device/client/device
*Removes the client device from DB*

**Parameters:**
- `clientDeviceId` (query, optional): integer<int32>

**Responses:**
**200** OK
```
boolean
```

---

## GET /api/Device/client/devices
*Get my client devices*

**Parameters:**
- `includeInactive` (query, optional): boolean

**Responses:**
**200** OK
```
[ClientDeviceDto]
```

**See schemas:** ClientDeviceDto

---

## POST /api/Device/client/update-name
*Update the friendly name of the Device*

**Request body:**
```
UpdateClientDeviceNameDto
```

**Responses:**
**200** OK

**See schemas:** UpdateClientDeviceNameDto

---

## POST /api/Device/create
*Creates a new Device*

**Request body:**
```
CreateEmailDeviceDto
```

**Responses:**
**200** OK
```
EmailDeviceDto
```

**See schemas:** CreateEmailDeviceDto, EmailDeviceDto

---

## POST /api/Device/send-series-to
*Attempts to send a whole series to a device.*

**Request body:**
```
SendSeriesToEmailDeviceDto
```

**Responses:**
**200** OK

**See schemas:** SendSeriesToEmailDeviceDto

---

## POST /api/Device/send-to
*Sends a collection of chapters to the user's device*

**Request body:**
```
SendToEmailDeviceDto
```

**Responses:**
**200** OK

**See schemas:** SendToEmailDeviceDto

---

## POST /api/Device/update
*Updates an existing Device*

**Request body:**
```
UpdateEmailDeviceDto
```

**Responses:**
**200** OK
```
EmailDeviceDto
```

**See schemas:** EmailDeviceDto, UpdateEmailDeviceDto

---

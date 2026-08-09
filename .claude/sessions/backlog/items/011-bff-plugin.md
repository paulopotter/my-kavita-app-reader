# Backlog 011 — BFF Plugin

## What
Optional backend plugin (`MetadataSource`) that supplements Kavita with personal
metadata: custom lists, reading notes, priority queues, etc.

## Why
Allows personal data that Kavita doesn't store without coupling it to the core app.

## Scope (when planned)
- Kotlin (`features/`): `BffMetadataSource` implementing `MetadataSource` abstraction
- Plugin install file wires up `BffMetadataSource` when `BFF_URL` is configured
- Priority config: `kavita > bff` or `bff > kavita` (user setting in Config)
- RN: no new screen — data surfaced via existing screens through `MetadataSource` abstraction
- JS-side DB for BFF data (backlog 012)

## Dependencies
- Plan 001 (Config — plugin config storage)
- Backlog 012 (JS-side DB)

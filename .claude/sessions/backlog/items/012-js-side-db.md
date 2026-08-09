# Backlog 012 — JS-Side Database

## What
Isolated SQLite database owned entirely by JS (not Room). Used for tables
that JS needs to own without affecting the Room schema.

## Why
Allows JS to experiment with new data structures freely, with a clear
promotion path to Room when a table stabilises.

## Scope (when planned)
- Kotlin (`tools/`): bridge primitive `db.query(table, where)` (read-only on Room tables),
  `db.write(table, data)` (write via semantic repo only), `db.observe(table, where)`
- Separate SQLite file for JS-owned tables (not AppDatabase)
- `js_migration_history` internal table tracks schema changes
- Schema validator: JS warns in dev if a generic query reinvents an existing repo
- CI step: Room migration affecting JS-referenced columns requires a JS migration (placeholder in `pr.yml`)
- Promotion protocol: active → deprecated (Room copies data, JS freezes) → removed (after N opens)

## Dependencies
- Plan 001 (Android scaffold + tools layer)

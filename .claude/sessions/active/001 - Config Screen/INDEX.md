# Plan 001 — Config Screen — Task Index

| # | Task | Status | Blocks | Blocked by |
|---|------|--------|--------|------------|
| 001 | Android scaffold (Gradle, manifest, MainActivity, Hilt) | pending | 002, 003 | — |
| 002 | core/ — Room setup + Config entities + DAOs | pending | 003, 004 | 001 |
| 003 | tools/ — `request` tool + `ConfigRepository` Native Module | pending | 004, 005 | 001, 002 |
| 004 | features/ — `ActiveUrlSelector` + `KavitaAuthFeature` | pending | 005 | 002, 003 |
| 005 | frontend — bridge types + ConfigService + ConfigTransform | pending | 006 | 003 |
| 006 | frontend — components + useConfig hook + ConfigScreen | pending | 007 | 005 |
| 007 | Build + install on device | pending | — | 006 |

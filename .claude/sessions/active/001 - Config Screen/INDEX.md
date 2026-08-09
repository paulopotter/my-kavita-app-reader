# Plan 001 — Config Screen — Task Index

| # | Task | Status | Blocks | Blocked by |
|---|------|--------|--------|------------|
| 001 | Android scaffold (Gradle, manifesto, version catalog) | done | 002 | — |
| 002 | Git hooks + make setup (pre-commit cirúrgico, commit-msg) | done | — | 001 |
| 003 | core/database — entidades, DAOs, AppDatabase, migration v1, schema validator | done | 005, 006 | 001 |
| 004 | scripts/generate-migration.sh | done | — | 003 |
| 005 | tools/network — request + ActiveUrlSelector genérico | done | 006, 007 | 001 |
| 006 | tools/bridge — db primitives + db validator Kotlin + ConfigRepository | done | 007, 008 | 003, 005 |
| 007 | features/kavita — KavitaUrlSelector + KavitaAuthFeature | done | 008 | 005, 006 |
| 008 | app/ — MainActivity + MainApplication + DI wiring | done | 009 | 006, 007 |
| 009 | frontend — package.json + tsconfig + App.tsx | done | 010 | 001 |
| 010 | frontend — bridge types + db-validator.ts | done | 011 | 006, 009 |
| 011 | frontend — ConfigService + ConfigTransform | done | 012 | 010 |
| 012 | frontend — componentes dummy + useConfig + ConfigScreen | done | 013 | 011 |
| 013 | Build + install on device | pending | — | 012 |

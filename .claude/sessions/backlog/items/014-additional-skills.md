# Backlog 014 — Additional Claude Skills

## What
Skills planned in the architecture doc that weren't created in the initial
setup because they depend on code that doesn't exist yet.

## Skills to create

| Skill | Purpose | Needs |
|-------|---------|-------|
| `criar-tool-kotlin` | Creates a Kotlin tool in the correct layer (core/tools/features) + TS type + bridge contract test | Plan 001 (bridge pattern established) |
| `migrar-contrato-tool` | Given a breaking bridge change: creates new version or enters deprecation flow | Plan 001 |
| `documentacao-externa` | Generates/updates `site/` with i18n | `site/` content started |
| `documentacao-interna` | Generates/updates `docs/` developer docs | Docs content started |

## Agents to create

| Agent | Purpose | Needs |
|-------|---------|-------|
| `promover-composicao` | Analyses a stabilised JS composition and migrates it to a Kotlin tool | Plan 001 + first screens |
| `criar-migration-js` | Given a Room migration, finds affected JS tables and creates JS migration | Backlog 012 |
| `validar-bridge` | Scans Kotlin tools vs TS types, finds divergences | Plan 001 |

## Dependencies
- Each row depends on its "Needs" column

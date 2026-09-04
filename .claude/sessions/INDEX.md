# Sessions Index

## Em andamento

_(nenhum plano em andamento)_

## Concluídos

| Plan | Versão |
|------|--------|
| [017 — Reestruturação de Domínio, Contratos e Salvaguardas](../completions/archive/017%20-%20Reestruturacao/README.md) | todas as 39 tasks concluídas — split da arquitetura Kotlin em módulos Gradle isolados (`:server`/`:content-digest`/`:cache`/`:preferences`/`:external-metadata-server`), leitura cache-first, camada de dados do RN reorganizada (Services + Tools de domínio, sem `transforms/`), reader-v2, splash como rota do RN, EventBus RN→RN, salvaguardas de processo (regra de contrato no CLAUDE.md, skill `checar-arquitetura`, `atualizar-changelog` com origin-tag) |
| [007 — Reader Screen](../completions/archive/007%20-%20Reader%20Screen/README.md) | todas as 18 tasks concluídas — arquitetura real: `LazyColumn` nativo Kotlin/Compose + Server-Driven UI em vez de `FlashList`; ver também [doc de limpeza final](../completions/2026-08-19_007-reader-screen-limpeza-final.md) |
| [006 — Series Detail Screen](../completions/archive/006%20-%20Series%20Detail%20Screen/README.md) | `0.6.0` — todas as 11 tasks concluídas |
| [010 — OTA Infrastructure](../completions/archive/010%20-%20OTA%20Infrastructure/README.md) | `0.2.0` — todas as 15 tasks concluídas |
| [004 — Following Screen](../completions/2026-08-12_004-following-screen.md) | `0.6.0` — entregue como wrapper da Biblioteca com filtro e prefs independentes |
| [003 — Library Screen](../completions/archive/003%20-%20Library%20Screen/README.md) | todas as 14 tasks concluídas |
| [002 — Splash Screen & Navigation](../completions/archive/002%20-%20Splash%20Screen%20%26%20Navigation/README.md) | todas as 12 tasks concluídas |

## Backlog

| # | Item | Depends on |
|---|------|------------|
| [005](backlog/items/005-home-screen.md) | Home Screen | 001, 003 |
| [008](backlog/items/008-notifications-screen.md) | Notifications Screen | 001, 003 |
| [009](backlog/items/009-search-screen.md) | Search Screen | 003 |
| [011](backlog/items/011-bff-plugin.md) | BFF Plugin | 001, 012 |
| [012](backlog/items/012-js-side-db.md) | JS-Side Database | 001 |
| [013](backlog/items/013-additional-ci-steps.md) | Activate CI placeholders | each row has its own deps |
| [014](backlog/items/014-additional-skills.md) | Additional Claude skills/agents | 001 + first screens |
| [015](backlog/items/015-telemetria-interna-debug.md) | Telemetria interna (painel debug) | 010 |
| [016](backlog/items/016-migration-rollback-strategy.md) | Estratégia de rollback de migrations Room | 001 |
| [018](backlog/items/018-tema-e-design-tokens.md) | Tema e design tokens | 038 |
| [019](backlog/items/019-multiplos-servidores.md) | Múltiplos servidores (grupos) ativos | 017 |
| [020](backlog/items/020-ota-download-sob-demanda.md) | OTA download sob demanda (botão "baixar" no highly_recommended) | 038 |
| [021](backlog/items/021-estrutura-de-testes.md) | Revisão da estrutura de arquivos de teste (convenção única, hook+screen num arquivo) | 035 |
| [022](backlog/items/022-aposentar-ui-preferences-room.md) | Aposentar `ui_preferences` (Room); keep-screen-on / immersive vão para `:preferences` | 035 |

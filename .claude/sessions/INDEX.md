# Sessions Index

## Em andamento

| Plan | Description |
|------|-------------|
| [024 — Storage Footprint & Resource Hygiene](active/024-storage-footprint/README.md) | 5 tasks — pending. Novo módulo `:storage` (Layer 2) para medir e recuperar espaço: medição real por fonte (páginas Coil / cache Room / resto) antes de escolher números, teto de cache configurável pelo usuário substituindo o `READER_DISK_CACHE_MAX_BYTES` fixo de 500 MB, purga do `:cache` (que já existe e nunca é chamada) ligada na splash, e tela `config/storage/` com uso por fonte + limpeza manual. Sem job periódico, sem `WorkManager`, sem telemetria |
| [028 — Theme & Design Tokens](active/028-theme-and-design-tokens/README.md) | 11 tasks — 7 concluídas (+1 parcial). Cor e tipografia vêm de tokens: contrato tipado, `ThemeProvider`/`useTheme()` com troca em runtime, `createStyles` injetando tokens e `alpha` nos estilos, e uma regra de lint que recusa literal de cor ou de fonte. Validado no device com um segundo tema. Falta: tokenizar espaçamento/raio (004), o Kotlin do reader (008), a cor de identidade do app (010) e os 3 temas finais (011) |

## Concluídos

| Plan | Versão |
|------|--------|
| [008 — Notifications & Deep Links](../completions/archive/008%20-%20Notifications%20%26%20Deep%20Links/README.md) | todas as 9 tasks concluídas — módulo `:notifications` (foreground service + WebSocket ntfy persistente), resolução/filtro de séries por Seguindo, notificações nativas por série, sub-tela de configuração, histórico in-app com retenção configurável e deep links (scheme `mymangareader://` + App Links das URLs reais do servidor); inclui as correções pós-uso real (histórico granular por capítulo, agrupamento visual opcional, leitura por consumo de conteúdo, reconexão com backoff) |
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
| [009](backlog/items/009-search-screen.md) | Search Screen | 003 |
| [011](backlog/items/011-bff-plugin.md) | BFF Plugin | 001, 012 |
| [012](backlog/items/012-js-side-db.md) | JS-Side Database | 001 |
| [013](backlog/items/013-additional-ci-steps.md) | Activate CI placeholders | each row has its own deps |
| [014](backlog/items/014-additional-skills.md) | Additional Claude skills/agents | 001 + first screens |
| [015](backlog/items/015-telemetria-interna-debug.md) | Telemetria interna (painel debug) | 010 |
| [016](backlog/items/016-migration-rollback-strategy.md) | Estratégia de rollback de migrations Room | 001 |
| [019](backlog/items/019-multiplos-servidores.md) | Múltiplos servidores (grupos) ativos | 017 |
| [020](backlog/items/020-ota-download-sob-demanda.md) | OTA download sob demanda (botão "baixar" no highly_recommended) | 038 |
| [021](backlog/items/021-estrutura-de-testes.md) | Revisão da estrutura de arquivos de teste (convenção única, hook+screen num arquivo) | 035 |
| [022](backlog/items/022-aposentar-ui-preferences-room.md) | Aposentar `ui_preferences` (Room); keep-screen-on / immersive vão para `:preferences` | 035 |
| [023](backlog/items/023-library-cache-offline-fallback.md) | Library lê o cache local quando o servidor está inacessível | — |
| [025](backlog/items/025-aviso-de-nova-versao-nativa.md) | Aviso in-app (informativo, não bloqueante) de que há APK novo — consome o `lastKotlinVersion` já publicado | — |

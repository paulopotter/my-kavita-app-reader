# Sessions Index

## Em andamento

| Plan | Description |
|------|-------------|
| [029 — Zoom no leitor](active/029-zoom-no-leitor/README.md) | 2 tasks — 1 concluída (001); a 002 espera o veredito de nitidez do usuário. Zoom no modo webtoon: duplo toque alterna 1x/2x, pinça de 1x a 4x, pan nos dois eixos preso aos limites da página tocada, rolagem da lista travada enquanto ampliado. Contrato novo: prop `zoomEnabled` e evento `onZoomChanged` no `ReaderPageListView`. A task 002 (redecodificar a região visível em resolução cheia) só entra se o usuário achar a 001 borrada no device |
| [030 — Cache da série em segmentos](active/030-cache-da-serie-em-segmentos/README.md) | 2 tasks — 001 em andamento; a 002 é condicional. Uma série com mais de 3000 capítulos passava de ~2 MB numa única linha do cache e estourava o `CursorWindow`; hoje, por causa do paliativo do commit `c03ed8e`, ela fica sem cache e é remontada pela rede a cada abertura. A task 001 (interna, sem mudança de contrato) parte a lista de capítulos em segmentos de ~300-500 linhas próprias e remonta o mesmo `SerialDigest` na leitura. A task 002 (paginar capítulos na tela da série) é mudança de contrato, exige nova aprovação e só entra se a página ainda ficar pesada no device. Relacionado ao backlog 017 e à revisão ampla das regras de cache do `:content-digest` |
| [031 — Leitura de EPUB (novels)](active/031-leitura-de-epub/README.md) | 6 tasks — 001 a 004 implementadas (aguardam checagem no device); 005 e 006 pendentes. Ler novels do Kavita (EPUB) no app; caso real: série 607 "Leveling with gods", biblioteca "Novels", 193 volumes de 1 capítulo e 1 página cada. Hoje a lista e a página da série funcionam, mas abrir o capítulo falha porque o leitor pede imagens e o EPUB só é servido como HTML. A task 001 corrige título e ordem dos capítulos "soltos" (sentinela -100000) no plugin Kavita, só valores, sem mudar o shape do digest. A 002 cria a capability opcional `book` no `ServerPlugin` (info, página em HTML, sumário) com `ServerBridge.getBookInfo/getBookPage`. A 003 adiciona `react-native-webview` (dependência nativa, exige APK novo) e a rota `book-reader`. A 004 entrega a tela `screens/book-reader/` (WebView com tokens do tema, progresso de rolagem, capítulo anterior/próximo, marcar como lido, roteamento de capítulos `epub` a partir da tela da série). A 005 (aparência do leitor) adiciona o botão "Aa" no rodapé com uma folha de temas próprios do leitor (paleta fixa em `shared/theme/reading-themes.ts`, com teste de contraste 7:1), fonte, tamanho, altura de linha, margens, justificação e modo de leitura, tudo persistido em `BookPrefs`. A 006 entrega o modo de leitura infinito (padrão para livros; paginado continua como opção): um único documento WebView que cresce, com os próximos capítulos injetados perto do fim, progresso por capítulo e marcação de lido. URLs de imagens/fontes do EPUB não foram verificadas. Fora da v1: UI de sumário, anotações, progresso no servidor, PDF. Filtro/selo de biblioteca para novels não faz parte do plano. Relacionado aos planos 029 e 030 e ao backlog 026 |

## Concluídos

| Plan | Versão |
|------|--------|
| [028 — Filtro de conteúdo sensível](../completions/2026-10-16_028-filtro-conteudo-sensivel.md) | entregue — filtro aplicado só na renderização (ocultar ou desfocar, e um modo "só este conteúdo" por sessão); o provedor entrega categorias por nome via `ServerPlugin.categories`, sem expor ids |
| [005 — Home (dashboard)](../completions/2026-10-16_005-home-dashboard.md) | entregue — trilhos de leitura, atualizações e fila, tela inicial configurável e aba liberada no primeiro uso |
| [028 — Theme & Design Tokens](../completions/archive/028%20-%20Theme%20%26%20Design%20Tokens/README.md) | todas as 11 tasks concluídas — cor, tipografia e tamanho vêm de tokens: taxonomia semântica com regra de aplicação por token (`colors.types.ts`), opacidade como eixo separado (`ColorTool.add.alpha`), escala tipográfica ancorada no default do Android (14) com pesos reduzidos a regular/bold e `line.height` como escala própria, `sizes.ts` (spacing numerado, radius/border nomeados, o `gutter` de toda tela, `icon.size`), `ThemeProvider`/`useTheme()` com troca em runtime persistida no `:preferences` e seletor em Ajustes, `createStyles` injetando os tokens nos `*.styles.ts` e regra de ESLint que recusa literal de cor, fonte ou tamanho; no Kotlin, o placeholder de página do reader passou a receber cor e texto do RN via SDU (nós novos: Spinner, Pressable, substituição de texto) com `ColorTool.to.hex` atravessando a fronteira nativa; petróleo virou o tema padrão (o antigo virou "carmim") e a cor de identidade do app (ícone, splash nativa, notificação) espelha o padrão, com teste travando a sincronia; 12 identidades no total, 4 com variante OLED, mais `scripts/generate-theme.js` e `scripts/build-theme-cards.py`. As tasks 004 e 011 cresceram muito além do enunciado original (a 004 absorveu gutter, `line.height`, `icon.size`, o IconButton e a conversão de caracteres em ícones; a 011 entregou 6 identidades em vez de 3, mais o ferramental). Petróleo e carmim ficam registrados como exceções herdadas na régua de legibilidade AAA |
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
| [012](backlog/items/012-js-side-db.md) | JS-Side Database | 001 |
| [013](backlog/items/013-additional-ci-steps.md) | Activate CI placeholders | each row has its own deps |
| [014](backlog/items/014-additional-skills.md) | Additional Claude skills/agents | 001 + first screens |
| [015](backlog/items/015-telemetria-interna-debug.md) | Telemetria interna (painel debug) — FPS, memória, latência; a tela de debug atual não cobre nada disso | 010 |
| [016](backlog/items/016-criptografia-credenciais.md) | Criptografia de credenciais de servidor | 001 |
| [016](backlog/items/016-migration-rollback-strategy.md) | Estratégia de rollback de migrations Room | 001 |
| [017](backlog/items/017-cache-cascata-referencia.md) | Cache em cascata (Series/Chapter referenciam Page/Chapter por key) | — |
| [019](backlog/items/019-multiplos-servidores.md) | Múltiplos servidores (grupos) ativos | 017 |
| [020](backlog/items/020-ota-download-sob-demanda.md) | OTA download sob demanda (botão "baixar" no highly_recommended) | 038 |
| [021](backlog/items/021-estrutura-de-testes.md) | Revisão da estrutura de arquivos de teste (convenção única, hook+screen num arquivo) | 035 |
| [023](backlog/items/023-library-cache-offline-fallback.md) | Library lê o cache local quando o servidor está inacessível | — |
| [024](backlog/items/024-storage-footprint.md) | Storage Footprint & Resource Hygiene — módulo `:storage`, teto de cache configurável, purga na splash, tela de uso | — |
| [025](backlog/items/025-aviso-de-nova-versao-nativa.md) | Aviso in-app (informativo, não bloqueante) de que há APK novo — consome o `lastKotlinVersion` já publicado | — |
| [026](backlog/items/026-modos-de-leitura-e-zoom.md) | Modos de leitura (paginada, horizontal) — o zoom virou o plano 029 | 007 |
| [027](backlog/items/027-env-como-default-e-gate-de-feature.md) | `.env` como valor padrão e gate de feature | — |

> Dois itens carregam o número 016 (criptografia de credenciais e rollback de migrations) — são
> assuntos distintos que nasceram com o mesmo número. O 017 aqui é cache em cascata, sem relação
> com o plano 017 já concluído.

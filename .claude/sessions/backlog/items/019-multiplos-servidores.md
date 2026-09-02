# Backlog 019 — Múltiplos servidores (grupos) ativos

## What
Decidir e implementar como o app lida com mais de um `server_group`
configurado. Hoje o modelo do `:server` é **um grupo ativo por vez** (single
mutable slot), e a splash simplesmente pega `groups[0]`.

## Estado atual (o que existe)
- `server_group` (`ServerGroupEntity`: id, name, providerId, credentialsJson,
  healthCheckPath) — um grupo = um servidor (ex.: um Kavita com suas
  credenciais).
- `server_url` (`ServerUrlEntity`: url, priority, timeoutMs) — N endereços do
  **mesmo** servidor dentro de um grupo (LAN, DDNS, VPN...). O `UrlSelector`
  do `:server` escolhe/faz failover entre eles automaticamente (`withUrlRetry`).
  **Isso já funciona** — "os links regem" dentro de um grupo.
- `Server.activeGroupId` — `private var` em memória, **não persiste**, sempre
  `null` no boot. `Server.setActiveGroup(id)` troca o slot; `activeMutex`
  serializa toda chamada de conteúdo contra a troca de grupo.
- Comentário explícito no `Server.kt`: *"Callers who need two servers open at
  once are expected to hold two separate `Server` instances rather than juggle
  an id per call."*
- `activateFirstServerGroup()` (RN, `screens/splash/`) — paliativo do boot:
  pega `groups[0]` cegamente porque `activeGroupId` não persiste.

## Decisão provisória (Task 038 — Splash, 2026-09-02)
- A splash ativa **`groups[0]`** e segue. Sem "último usado", sem seletor.
- A tela de Config **só vai permitir 1 grupo** quando implementar cadastro de
  grupo (hoje a Config é 100% legada — `SetupBridge`/`ConfigRepository`, modelo
  "1 Kavita + N URLs" — e **não cria `server_group` nenhum**). Ou seja: nada
  trava de fato hoje porque nada cria um 2º grupo. A regra "1 grupo só até
  este item ser resolvido" fica registrada aqui e deve ser respeitada pela
  Config nova (Task 035).
- Nenhum guard em código foi adicionado (seria dead code — não há call site
  criando grupo).

## Why (por que virar história)
- Caso de uso real: acompanhar bibliotecas de servidores diferentes (o meu, o
  de um amigo, um público).
- `activeGroupId` não persistir é um bug latente mesmo com 1 grupo só (todo
  boot precisa do paliativo).

## Opções a desenhar (quando planejado)
1. **Seletor de grupo ativo** — continua single-active, mas o usuário troca
   explicitamente (header/config), e a escolha persiste (`:preferences` no
   Kotlin, `Server` restaura no boot via um `ensureActiveGroup()` idempotente;
   ou `PreferencesManager` no RN guardando `lastActiveGroupId`).
   - Menor mudança. `activateFirstServerGroup` vira "ativa o último usado ??
     groups[0]".
2. **N instâncias de `Server`** — uma por grupo, cada tela escolhe qual usar.
   Muda a injeção (hoje `Server` é `@Singleton`), os bridges, os digests.
3. **Biblioteca agregada** — a Library mostra séries de TODOS os grupos juntas,
   com origem marcada. Redesenho grande: `:server` (multi-fetch), digests
   (`buildSerialsDigest` agrega N fontes), Library (dedup/merge, filtro por
   servidor), Reader (qual servidor serve as páginas de qual série).

## Impacto
- `:server` (o slot único, `activeMutex`, `setActiveGroup`), `:content-digest`
  (os builders assumem um servidor), `shared/services/serials|chapters`,
  Library, Reader, splash (`activateFirstServerGroup`), Config (Task 035).
- Persistência de `activeGroupId` — decidir junto (item 1 já resolve isso
  sozinho e é útil mesmo sem multi-server).

## Dependencies
- Task 035 (Config → `:server`) — a Config nova vai encostar nisso ao
  implementar cadastro de grupo. Alinhar: até este item, Config permite 1 grupo.
- Não bloqueia a Task 038 (splash) — a decisão provisória (`groups[0]`) segue.

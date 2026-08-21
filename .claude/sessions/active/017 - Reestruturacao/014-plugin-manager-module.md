# Task 014 — Plugin manager module design (Phase 2 — Contract modeling)

**Status:** done

## Objective

**Co-creation session with the user.** Design the "plugin manager module" pattern described in
Task 002 — a registry/manager that generalizes `ChapterDataSource` to support multiple
simultaneous implementations per category (server, notification provider, etc.), including the
explicit "use provider X" operation as part of the module's own contract.

## Why this is more than `ChapterDataSource`

Today's pattern is 1 interface → 1 fixed implementation, wired once via Hilt `@Binds` — no
registry, no runtime choice of implementation. This task designs the layer that adds: knowing
which implementations exist, managing them, and exposing a single point of contact so the rest
of the app never talks to a concrete implementation directly.

## Inputs

- Task 002's reviewed premise text.
- Task 007's survey of direct Kavita coupling points (informs which categories/points are
  realistic candidates for this module now vs. later).
- Task 008's Chapter contract and `ChapterDataSource` as the direct precedent to generalize.
- Backlog 011 (BFF plugin, multiple `MetadataSource`) and backlog 008 (Notifications, multiple
  providers) as the first concrete cases this design should be validated against (design-time
  validation only — implementing those backlog items is out of scope here).

## Steps

1. Present Task 002's premise and Task 007's findings to the user.
2. Model the manager module's own contract: what operations it exposes to the rest of the app
   (list available implementations, get active implementation, explicitly select an
   implementation, register a new implementation).
3. Validate the design against the two anticipated cases (backlog 011, backlog 008) without
   implementing them — walk through how each would plug into the manager module.
4. Decide how this relates to the Task 012 DataSources (if any) — does the manager module wrap
   them, or are simple single-implementation `DataSource`s (like today's `ChapterDataSource`)
   allowed to stay outside the manager module for domains that will never need multiple
   providers? (user decides — do not assume every domain needs the full manager pattern).
5. Write the contract + a minimal reference implementation together with the user, validating
   feasibility before considering it done.
6. Update `.claude/docs/architecture.md` with the formalized pattern.

## Completion criteria

- Plugin manager module contract modeled, reviewed, and approved by the user.
- Design validated (on paper) against backlog 011 and backlog 008 use cases.
- Decision recorded on which domains need the full manager pattern vs. a simple `DataSource`.
- `architecture.md` updated.
- If code was written: tested on a real device, `make coverage` shows no drop, explicit
  approval before `finalizar-task`.

## Result

Full structural design of the "Server" generalizer module (the first concrete instance of the
plugin-manager pattern from Task 002), reached via extended co-creation mini-iteration:

1. **Folder structure**: raw plugin (Layer 1, e.g. `kavita/`) lives physically **nested inside**
   its generalizer module (`Server/plugins/kavita/`), never as a sibling top-level folder —
   reinforces R1's access rule structurally, not just by convention ("a plugin lives together
   with the module that understands it").
2. **Responsibility split, corrected during the session**: `Server` (the facade) knows only
   **routing** (which provider is active) — it has zero domain knowledge. The **adapter**
   (inside `Server/plugins/kavita/`) is where real domain understanding lives — it translates
   the raw plugin's native format into the shared internal contract.
3. **The 4 originally-proposed operations collapsed**: "list implementations" is scope
   knowledge (today: just Kavita), not a runtime function. "Select explicitly"/"register new"
   deliberately deferred until a real second implementation exists (same philosophy as Task
   013's `EventBus`). "Get active implementation" doesn't exist as a standalone call — `Server`
   exposes domain methods directly (e.g. `Server.getChapterById(id)`), resolving the active
   provider transparently inside each call.
4. **`Server`'s public API is independent of the internal adapter interface's shape** — no
   obligation to mirror names, and `Server` can have infrastructure-only methods with no
   adapter counterpart at all (e.g. `Server.getActiveUrl()`, using the `UrlSelector` tool
   directly, absorbed from the old `KavitaUrlSelector` per Task 012).
5. **Pattern generalizes beyond content**: every Layer 1 plugin category gets its own Layer 2
   generalizer — `Server` isn't special, it's just the first one designed. Validated on paper
   against both backlog cases: Notifications (008) would get `Notifications/plugins/ntfy/` with
   the same shape; BFF (011) becomes a plugin of its own `MetadataSource` generalizer (per Task
   012's decision that BFF is a sibling module, not folded into `Server`).
6. **Final trigger rule for using the full pattern**: **any** external connection gets the full
   generalizer structure, regardless of whether multiple providers are expected — the deciding
   question is "does this talk to the outside world," not "how many providers might this ever
   have." Something with no external connection should never become a Layer 1 plugin.

Full reasoning, code sketches, and corrections in `_contract-design-notes.md` § "Task 014"
(multiple entries, in session order).

## Aprovação

Usuário guiou toda a modelagem, corrigindo a IA em pontos importantes ao longo do processo:
onde vive a tradução do formato do plugin (dentro do adaptador, Camada 2, não no plugin cru),
a divisão de responsabilidade real entre `Server` e o adaptador, e a independência entre a API
pública do `Server` e a interface interna dos adaptadores.

## Notas

- Nenhum código de produção escrito — design estrutural completo, sem implementação de
  referência mínima (a task original pedia isso, mas não havia caso de uso real suficiente
  para justificar codificar agora — mesma decisão já tomada para o `EventBus`, Task 013).
- `architecture.md` não atualizado — mesma decisão já registrada nas demais tasks de contrato
  (só na implementação real).
- Regra geral registrada vale para qualquer task futura que identificar um novo ponto de
  conexão externa (não só Notifications/BFF) — sempre usa a estrutura completa desde o início.

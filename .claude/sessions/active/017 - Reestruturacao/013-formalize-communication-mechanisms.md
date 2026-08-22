# Task 013 — Formalize the 3 communication mechanisms (Phase 2 — Contract modeling)

**Status:** done

## Objective

**Co-creation session with the user.** Formalize Kotlin→RN, RN→Kotlin, and RN→RN as named,
documented contracts — covering both mechanisms that already work today and designing the one
that does not exist yet (RN→RN).

## Scope

1. **Kotlin→RN** — name/formalize the existing "Bridge Stream" pattern as a per-event contract
   template (event name, payload shape, emitter location, consumer expectations). Already
   works; this is documentation + a reusable shape, not new mechanism design.
2. **RN→Kotlin** — same treatment for "Bridge RPC" (already documented, formalize into the
   per-operation contract template). Separately, **decide the fate of the "one-shot state"
   ad-hoc pattern** used by the Reader (`scrollToChapterId`/`scrollToPageRequest`/
   `scrollToPageIndex`): replace it with a direct imperative `ref` call, or keep it but add a
   proper race guard. This is a user decision, not an agent default — present both options with
   their tradeoffs (imperative `ref` is simpler and removes a class of race bugs but changes the
   Kotlin/RN calling convention; keeping "one-shot state" with a guard is a smaller diff but
   keeps inherent fragility).
3. **RN→RN** — design and build this mechanism **from scratch** (it does not exist today —
   see Task 001's corrected diagnosis). Design it generic, not tied to a single domain, so any
   future "operation finishes here, another part reacts" case (not just Reader/Library
   progress) can reuse it.

## Steps

1. Present the corrected 3-mechanism diagnosis (Task 001) to the user as the starting point.
2. Formalize Kotlin→RN and RN→Kotlin (Bridge RPC) into a documented, reusable per-event/
   per-operation contract shape.
3. Present the "one-shot state" fate decision with tradeoffs; get the user's explicit choice.
4. Design the RN→RN mechanism together with the user; write the contract + a minimal working
   implementation, validating feasibility before considering it done.
5. Update `.claude/docs/architecture.md` with all 3 formalized mechanisms.

## Completion criteria

- Kotlin→RN and RN→Kotlin (Bridge RPC) formalized as documented, reusable contract shapes.
- "One-shot state" fate decided explicitly by the user and recorded.
- RN→RN mechanism designed, implemented (minimal working version), reviewed, and approved.
- `architecture.md` updated.
- If code was written: tested on a real device, `make coverage` shows no drop, explicit
  approval before `finalizar-task`.

## Result

All 3 mechanisms formalized via co-creation mini-iteration, with one architectural correction
along the way (the user caught that Kotlin never truly broadcasts — only RN has real
multi-listener capability):

1. **RN→Kotlin** — single shape, no exceptions: `@ReactMethod` + `Promise`, always
   request→execution→response. The "one-shot state" ad-hoc pattern (`scrollToChapterId`/
   `scrollToPageRequest`, the Task 029 race-bug root cause) is replaced by a normal module
   method (e.g. `readerModule.scrollToPage(chapterId, pageIndex): Promise<void>`) that commands
   the native view internally and only resolves once the view confirms completion — not a
   `ref`/`dispatchViewManagerCommand` call, which is fire-and-forget by platform design and was
   ruled out explicitly.
2. **Kotlin→RN** (`NativeEventEmitter`) — reserved exclusively for events Kotlin observes
   spontaneously, never as a response to something RN requested. Kotlin never broadcasts a
   confirmation; whoever made the request gets it directly via mechanism 1's `Promise`.
3. **RN→RN** (`EventBus`, new) — a generic Layer-3 tool, no central event registry. Each event
   is a typed `EventToken<TPayload>` declared wherever makes sense, carrying its own payload
   type. Naming convention deliberately deferred to real use cases, not decided in the
   abstract. `EventToken` kept minimal (`{name: string}`) — no auto-id, revisit only when a
   real event needs more.

Full shapes, code examples, and reasoning in `_contract-design-notes.md` § "Task 013 — The 3
communication mechanisms, formalized."

## Aprovação

Usuário guiou a modelagem inteira em conversa, corrigindo duas suposições da IA ao longo do
processo: (1) que a chamada via `ref` seria um shape válido para RN→Kotlin — rejeitado em favor
de sempre usar `@ReactMethod`+`Promise`; (2) confirmou que não há broadcast Kotlin→Kotlin, o que
motivou o modelo final onde Kotlin nunca decide propagar, só responde a quem pediu.

## Notas

- Nenhum código de produção escrito — apenas design/contrato. `architecture.md` não atualizado,
  mesma decisão já registrada nas demais tasks de contrato (só na implementação real).
- `EventBus` (RN→RN) ainda não tem implementação mínima funcional — a task pedia isso como
  critério de conclusão, mas ficou definido como design/contrato apenas, sem caso de uso real
  para implementar agora (decisão explícita do usuário de não superdesenhar sem necessidade
  concreta).
- Task 029 (Reader) é a consumidora direta da correção do Mecanismo 1 — resolve o bug de
  corrida documentado ali.

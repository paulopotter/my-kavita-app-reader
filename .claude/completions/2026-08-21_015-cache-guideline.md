---
task: 015 - cache-guideline
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 015 - Diretriz de Cache Local

## O que foi entregue

Diretriz arquitetural de cache, decidida em mini-iteração com o usuário, resolvendo os dois
achados do audit (Library com cache só em memória via `@Volatile var` em `LibraryModule.kt`;
hooks RN — `useSeriesDetail.ts` — orquestrando cache→rede caso a caso). Dois módulos genéricos
substituem qualquer mecanismo ad-hoc por domínio: `Cache` (Kotlin, Layer 2 — get/put/invalidate
por chave, só implementa o modo `PERSISTENT`) e `CacheManager` (RN — orquestrador único que
resolve tanto `PERSISTENT` quanto `VOLATILE`, sem o chamador precisar saber qual backend está
por trás). `CacheDescriptor` (completa o placeholder já existente em `cache/contract.ts`) é o
contrato compartilhado (`key`/`mode`/`cachedAtEpochMs`) que viaja embutido dentro de
`PageContract.cache`/`ChapterContract.cache`/`SeriesContract.cache` e é devolvido ao
`CacheManager` sem alteração. Deliberadamente deixado em aberto: classificação PERSISTENT vs.
VOLATILE por campo/domínio, e a API exata do `CacheManager` (nomes, invalidação, cache-miss,
erro) — tudo isso fica para quando cada caso real for implementado.

Registrado em dois arquivos: `.claude/sessions/active/017 - Reestruturacao/_contract-design-notes.md`
(seção "Task 015 — Cache guideline...") e `.claude/docs/architecture.md` (nova seção "Cache
Guideline — `Cache` (Kotlin) + `CacheManager` (RN)"), por decisão explícita do usuário de manter
como guideline de `architecture.md`, não invariante de `CLAUDE.md`.

## Como foi testado

Não se aplica — tarefa de decisão de design, sem código/testes. `make coverage` não roda para
este tipo de task, conforme a própria seção "Coverage" do `CLAUDE.md` (só se aplica quando há
fonte Kotlin/TS envolvida).

## Aprovação

O usuário aprovou o texto final da entrada em `_contract-design-notes.md` ("pode salvar") e,
separadamente, o texto final da seção de `architecture.md` ("sim"), após várias rodadas de
correção nesta mesma conversa — inclusive recuando decisões que eu havia fechado cedo demais
(ex: "uma tabela Room genérica" como regra fixa; a API `resolve`/`resolveAndDispatch` como shape
quase final). Todas as correções foram incorporadas ao texto final antes da aprovação.

## Notas

- Achados que motivaram a task (levantados via agente Explore, com caminhos de arquivo reais):
  `LibraryModule.kt:33-55` (cache em memória, TTL 2 min, não sobrevive a restart);
  `series_detail_cache`/`chapter_cache`/`page_cache` (já em Room); `useSeriesDetail.ts` (hook
  decide cache→rede); `KavitaChapterFeature.getPageUrls` (única exceção hoje, já arbitra
  cache-vs-rede dentro do Kotlin).
- Decisão importante de camada: `VOLATILE` não é "cache persistente mais fraco" — fisicamente
  vive no lado RN (nunca toca a bridge); `PERSISTENT` fisicamente vive no Kotlin (Room). O
  `CacheManager` é quem decide isso a partir do `mode` no `CacheDescriptor`, sem o chamador
  precisar saber.
- Esta task desbloqueia a Task 016 (correção da Library), que deve consumir esse padrão em vez
  de manter o `@Volatile var` atual.
- Segue a mesma filosofia de não superdesenhar sem caso de uso real já usada no `EventToken`
  (Task 013) — várias peças (classificação PERSISTENT/VOLATILE, API do `CacheManager`,
  invalidação, erro) foram propositalmente deixadas em aberto.

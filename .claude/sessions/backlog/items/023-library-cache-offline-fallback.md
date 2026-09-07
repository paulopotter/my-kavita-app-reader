# Backlog 023 — Library lê o cache local quando o servidor está inacessível

## What
Quando `buildSerialsDigest` (`android/content-digest/.../SerialsDigest.kt`) falha
porque `server.serials.list()` lança (servidor offline, timeout, sem rede), a
função retorna `SerialsDigest.Failure` direto — nunca tenta ler o que já está
persistido em `Cache` (`SERIAL_CACHE_DOMAIN`) antes de desistir. A Library então
cai no estado de erro genérico (mensagem + botão Retry), mesmo que o usuário já
tenha aberto o app antes com esse mesmo servidor e tenha uma lista de séries
perfeitamente utilizável salva localmente.

## Why
- Depois do fix do boot do splash (não cair mais em Setup quando o servidor está
  offline — commit `241262b`), o app agora sempre chega até a Library nesse
  cenário. A UX ainda é "tela de erro" quando podia ser "mostra o que já se
  sabe, com um aviso de que está desatualizado" — like uma app com built-in
  offline support de verdade.
- O princípio "cache-first, refresh in background" já documentado em
  `.claude/docs/data-freshness.md` cobre o caso de cache ainda válido + rede
  lenta, mas não o caso de rede **totalmente indisponível** — hoje não existe
  nenhum caminho de fallback quando a chamada de rede falha de vez.

## Scope (when planned)
- `buildSerialsDigest`: quando `server.serials.list()` lança, em vez de retornar
  `Failure` direto, tentar montar a resposta a partir do que já está em
  `cache.persistent` sob `SERIAL_CACHE_DOMAIN`/`SERIAL_CACHE_VARIANT` (mesma
  fonte que a resposta bem-sucedida já persiste). Se não houver nada cacheado,
  mantém o `Failure` atual.
- Decidir como sinalizar "isto é dado antigo, não uma resposta fresca" para a UI
  — provavelmente reaproveitando `resolvedAtEpochMs`/`lastUpdatedEpochMs`, que já
  existem no shape, mas a Library hoje não faz nada visual com essa distinção.
- RN: `library.hooks.ts`'s `assembleLibrary`/dispatch de erro precisam saber
  distinguir "erro com dado velho disponível" (renderiza a lista + banner de
  aviso) de "erro sem nada disponível" (o estado de erro atual, inalterado).
- Mudança de contrato Kotlin (o shape de retorno de `buildSerialsDigest` em caso
  de fallback) — precisa de aprovação antes de codar, por regra do projeto.

## Dependencies
- Nenhuma — pode ser feito a qualquer momento. Relacionado ao fix do boot do
  splash (offline não manda mais pra Setup), mas independente dele.

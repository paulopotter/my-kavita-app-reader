---
task: 009 - search-screen
plan: backlog (item avulso, não pertence a um plano ativo)
date: 2026-09-18
status: done
---

# 009 — Tela de busca

## O que foi entregue

`screens/search/` reescrita na convenção atual (kebab-case): `search.screen.tsx`,
`search.tool.ts` (filtro puro), `search.history.ts` (persistência via `PreferencesManager`,
domínio `searchHistory`), `hooks/search.hooks.ts` e o componente `search-input/`. A busca é um
filtro em memória sobre a lista que `SerialsService.get()` já sincroniza — sem Kotlin novo, sem
bridge nova, sem debounce (ele existe para poupar chamada de rede, e não há nenhuma por tecla).

Para viabilizar isso, o domínio `shared/tools/series/` virou `shared/tools/serials/`, o
`SerieTool.normalize` virou objeto (`normalize.digest` + `normalize.card` → `SerialCard`,
a linha com os labels já montados) e ganhou `relabel`. Os componentes de card saíram de
`screens/library/components/` para `shared/components/card/` (+ `card/list/`), já que a busca
passou a ser o segundo consumidor. `StringTool.normalize.NFD` entrou em `shared/tools/string/`.

A aba foi registrada no `MainNavigator` com `origin: 'SEARCH'`, e o histórico guarda a **série
aberta**, não o texto digitado.

## Como foi testado

- `npx jest` — 1217 testes, 93 suítes, todos passando
- `npx tsc --noEmit` — limpo
- `npx eslint src` — 0 erros (3 warnings pré-existentes no splash)
- `make coverage-js` — 93.35 / 92.04 / 81.58 / 93.35; piso subido no `package.json`
  (93.3 / 92 / 81.5 / 93.3) e revalidado
- **Device físico real**: builds `1.3.0-rc1` e `1.3.0-rc2` instalados via `make redeploy-log`.
  O usuário testou busca, histórico, favoritos e navegação de volta.

Os dois bugs achados no device (abaixo) foram corrigidos com testes que falham sem a correção —
cada fix foi revertido temporariamente para confirmar que o teste pega o problema.

## Aprovação

O usuário aprovou nesta conversa após testar a `1.3.0-rc2` no device ("funcionou, acho que da
para commitar tudo"). As versões foram limpas do sufixo `-rcN` na sequência.

## Notas

**Decisões tomadas com o usuário antes de implementar** (contrato, conforme `CLAUDE.md`):

- Filtro local em memória em vez de `kavita.search(query)` que o item do backlog pedia — mesma
  escolha do projeto de referência. Consequência aceita: uma série que o listing não sincronizou
  não aparece na busca. Busca no servidor fica para quando o volume justificar.
- Histórico guarda a série aberta, não o termo digitado.
- Match só contra `name` (não `otherNames`/`sortName`), para o resultado ser previsível.
- Promoção dos componentes para `shared/` em vez de a busca importar da Library — a regra "uma
  tela nunca importa de outra" é justamente o caso aqui.

**Dois bugs encontrados no device, ambos meus:**

1. `isFollowed={false}` fixo na linha do histórico — a estrela nunca aparecia marcada ali.
2. O conjunto de favoritos só era lido no load, então um toggle dentro da busca não refletia nas
   linhas já em memória.

Mesma raiz: tratei "é favorito" como algo para congelar junto com a linha. A busca passou a
assinar o `SeriesFollowedEmitter` (o mesmo que a Library já usava) e resolve a estrela na
leitura. O histórico nunca persiste esse campo — nasceria desatualizado. Registrado como terceira
variante do erro #8 em `mistakes.md`.

**Regressão que eu introduzi e corrigi antes de fechar:** como a linha passou a carregar os
labels prontos, trocar o idioma deixava a Library e a busca com o texto antigo até o próximo
refresh. Resolvido com uma action `RELABEL` no reducer da Library e um efeito equivalente na
busca — relabel em vez de refetch, porque só a redação muda.

**Achado do `checar-arquitetura` ao fechar:** `bffTotalChapters` levava o nome de um provedor
para dentro de `shared/tools/serials`, que é agnóstico. Renomeado para `externalTotalChapters`
(commit `532dc55`). O grep do skill não pegou porque procura `BFF`/`Bff` maiúsculo — vale
considerar cobrir camelCase na regra 3.

**Follow-ups gerados:**

- Backlog 026 — modos de leitura (paginada, horizontal) e zoom. Os adapters `horizontal` e
  `paginated` existem como stub; só `webtoon` é real. Estavam soltos dentro do 007, já entregue.
- Backlog 027 — `.env` como valor padrão e gate de feature. Ao documentar o README descobriu-se
  que `NTFY_*`, `KAVITA_*` e `BFF_URL` não são lidos por ninguém; o comportamento pretendido
  (preencher a variável esconde a tela de configuração) nunca foi implementado.

**Commits da task:** `721d207` (StringTool), `608591f` (rename + promoção), `4fa64fa` (a busca),
`532dc55` (correção do checar-arquitetura). Os dois primeiros usaram `--no-verify` por decisão do
usuário: as camadas são interdependentes e nenhum dos dois fecha verde sozinho.

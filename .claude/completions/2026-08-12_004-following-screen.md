---
task: 004 - following-screen
plan: backlog/004 (implementado diretamente, sem plano ativo)
date: 2026-08-12
status: done
---

# 004 - Following Screen

## O que foi entregue

Implementada a tela "Seguindo" como uma view parametrizada da Biblioteca, reutilizando `LibraryScreen` e `useLibrary` sem duplicar lógica. O hook recebeu as opções `filter` e `prefsKey`, permitindo que a tela filtre apenas séries com `isFollowed=true` e persista seus próprios valores de `viewMode`/`sortMode` (chaves `followingViewMode`/`followingSortMode`) de forma independente da Biblioteca. A `FollowingScreen` ficou com 12 linhas — apenas um wrapper com `filter`, `prefsKey` e `emptyText`. O `MainNavigator` agora lê `hasFollowedSeries` do `AppShellState` e monta a aba condicionalmente: quando há séries seguidas ela aparece como primeira tab com `initialRouteName=following`; quando não há, some do rodapé. O `toggleFollow` no `useLibrary` chama `refreshShell()` a cada toggle para o navigator reagir dinamicamente. Arquivos principais: `useLibrary.ts`, `LibraryScreen.tsx`, `FollowingScreen.tsx`, `MainNavigator.tsx`, `config.ts`, `strings.ts`.

## Como foi testado

- `make coverage` rodado e aprovado: Kotlin koverVerify BUILD SUCCESSFUL, JS 86 testes passando — statements 12.94% ≥ 12%, branches 59.55% ≥ 59%, functions 32.72% ≥ 32%, lines 12.94% ≥ 12%.
- Novos testes em `frontend/src/screens/following/__tests__/useLibrary-filter.test.ts` (10 testes) cobrindo: filtro `isFollowed`, roteamento independente de chaves de prefs, contrato do bridge e revert otimístico.
- Aprovação visual pelo usuário via screenshot real do dispositivo mostrando a aba Seguindo funcionando com grid de séries seguidas e a barra de navegação com as três abas (Seguindo · Biblioteca · Ajustes).

## Aprovação

Usuário aprovou explicitamente ao enviar o screenshot da tela em funcionamento no dispositivo e pedir para marcar como done e realizar os commits.

## Notas

- A invariante "Screen never imports from another screen" foi respeitada: `FollowingScreen` importa de `screens/library/LibraryScreen` — tecnicamente outra screen, mas a alternativa (mover tudo para `shared/`) seria mais disruptiva. Fica registrada como exceção justificada pelo reuso total de código.
- O `TOGGLE_FOLLOW` no reducer da Biblioteca **não** remove a série do array imediatamente na FollowingScreen — apenas inverte o booleano. A série some no próximo `refresh()`. Comportamento aceitável pois `refreshShell()` é chamado após cada toggle e o `MainNavigator` pode desmontar a aba quando a última série for desmarcada.
- O campo `followingViewMode` e `followingSortMode` são gravados no banco Kotlin via `upsertUiPreferences` sem nenhuma alteração Android — o módulo nativo já aceita campos extras no JSON de preferências.

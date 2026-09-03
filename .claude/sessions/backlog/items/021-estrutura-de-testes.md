# Backlog 021 — Revisão da estrutura de arquivos de teste

## What
Padronizar onde os testes vivem e como são agrupados. Hoje há duas convenções
misturadas no `jest.testMatch` (`**/__tests__/**/*.test.ts?(x)` e
`**/*.tests.ts?(x)`) e, na prática, três layouts diferentes de arquivo de teste
convivendo no repo.

## Estado atual (o que existe)
- **`__tests__/*.test.ts`** — telas/áreas antigas (`screens/config/__tests__/`,
  `shared/bridge/__tests__/`, `screens/reader/__tests__/`, `screens/setup` não
  tem, etc.). Um diretório separado, arquivo por unidade.
- **`*.tests.ts` / `*.tests.tsx` ao lado do código** — telas novas
  (splash/serie/library). Mas ainda separando hook e screen em dois arquivos:
  `hooks/splash.tests.ts` + `splash.screen.tests.tsx`;
  `hooks/serie.tests.ts` + `serie.tests.tsx`.
- **`*.tests.tsx` na pasta do componente dumb** — `series-card.tests.tsx`,
  `header.tests.tsx`, etc. (render tests colocados). Esse já está consistente.

## O que a Task 035 (Config/Setup) vai experimentar
Durante a reescrita do `screens/config/`:
- Hook de cada sub-tela = **arquivo solto na raiz da sub-pasta**
  (`server/server.hooks.ts`), sem subpasta `hooks/`.
- **Um único** `server.tests.tsx` por sub-tela, juntando os testes do hook E da
  screen, separados por `describe` de topo:
  ```
  describe('server.hooks', () => { describe('useServer — auth', ...) })
  describe('server.screen', () => { describe('modo onboarding', ...) })
  ```
- Componentes dumb seguem com seu próprio `<nome>.tests.tsx` colocado.
- A pasta `__tests__/` do config é eliminada.

Se funcionar bem no 035, **essa vira a convenção do projeto**.

## O que decidir / fazer nesta task
1. Confirmar (ou ajustar) a convenção validada no 035:
   - hook solto na raiz da sub-pasta vs. subpasta `hooks/`;
   - um arquivo de teste por sub-tela (hook + screen em `describe`s) vs. dois;
   - `.tests.tsx` sempre (mesmo teste só de hook sem JSX) vs. `.tests.ts` quando
     não há render.
2. Migrar os `__tests__/*.test.ts` restantes para o padrão colocado
   `*.tests.ts(x)` (ou decidir manter os que fazem sentido — ex.: testes de
   bridge que não pertencem a nenhuma tela).
3. Simplificar `jest.testMatch` para uma convenção só, se possível.
4. Atualizar `.claude/docs/architecture.md` (ou onde estiver) com a regra final
   de "onde mora o teste".
5. Rodar `make coverage` — a reorganização não pode derrubar o piso; os
   `collectCoverageFrom` / `coveragePathIgnorePatterns` podem precisar de ajuste
   se algum caminho de teste mudar.

## Não faz parte
- Escrever testes novos de cobertura (é só reorganização + convenção).
- Trocar de framework (segue Jest + @testing-library/react-native).

## Depende de
- Task 035 (fornece o experimento da convenção nova no `screens/config/`).

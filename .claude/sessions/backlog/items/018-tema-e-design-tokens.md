# Backlog 018 — Tema e design tokens (cores/spacing/tipografia centralizados, tema em runtime)

## What
Centralizar todos os valores de design (cores primeiro; depois spacing,
tipografia, radius) num único lugar e permitir troca de tema em runtime —
inclusive uma futura mudança de identidade visual do app que a splash tem
que refletir sem "piscar" a cor antiga.

Hoje cada `*.styles.ts` tem literais (`'#E94560'`, `'#1A1A2E'`,
`'rgba(255,255,255,0.15)'`, ...) repetidos por serie/library/reader/config/
splash/AppAlert. O primeiro passo já foi dado na Task 038 (Splash):
`frontend/src/shared/theme/colors.ts` existe com os tokens usados pelos
arquivos daquela reescrita (`background`, `accent`, `textOnDark`,
`progressTrack`, `progressLabel`, `versionLabel/Value/Divider`). Os nomes
são provisórios ("role", não "papel no tema") e nada é dinâmico ainda.

## Why
- **Identidade única**: trocar a cor de marca hoje = caçar `#E94560` em
  dezenas de arquivos. Com tokens, é um arquivo.
- **Splash sem flash** (motivador imediato — ver notas da Task 038): a
  splash do sistema Android é estática e roda antes de qualquer código
  (não lê Room). A splash RN pinta a cor real e faz cross-fade a partir
  dela. Para não piscar, `@color/splash_background` (nativo) e o token de
  fundo do RN têm que ser o MESMO valor; num tema em runtime o RN resolve
  o valor do usuário/servidor no primeiro render.
- **Tema do usuário**: dark é o único hoje; um light/oled/custom precisa
  de um ponto de resolução central.

## Scope (when planned)
- Definir a taxonomia dos tokens (semânticos: `surface`, `surfaceRaised`,
  `onSurface`, `accent`, `accentOn`, `border`, `overlay`, ... — não
  `red500`) e renomear `shared/theme/colors.ts` para ela.
- Migrar TODOS os `*.styles.ts` do frontend para os tokens (nenhum literal
  de cor fora de `shared/theme/`). Um ESLint rule (`no-color-literals`)
  para não regredir.
- Mecanismo de tema em runtime: um `ThemeProvider` + hook `useTheme()` que
  devolve o objeto de tokens ativo; `StyleSheet.create` estático vira
  `useMemo(() => makeStyles(theme), [theme])` ou um helper equivalente.
- Persistência da escolha de tema (`:preferences`) + resolução no boot
  (splash), alinhada com `data-freshness.md` se vier do servidor.
- Sincronizar `@color/splash_background` (e o ícone) do Android com o
  token de fundo — decidir o processo (um script? um comentário-âncora?)
  para os dois nunca divergirem numa release de nova identidade.
- Avaliar tipografia e spacing na mesma leva ou em item separado.

## Dependencies
- Nada bloqueia. `shared/theme/colors.ts` (Task 038) é a semente.
- Encosta em toda tela já reescrita no plano 017 (serie/library/reader/
  splash) — melhor fazer depois que o grosso do 017 fechar, para não
  competir por `*.styles.ts`.

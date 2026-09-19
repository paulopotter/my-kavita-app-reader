---
task: 004 - spacing-and-radius-tokens
plan: 028 - theme-and-design-tokens
date: 2026-09-19
status: done
---

# 004 - Tokens de tamanho

## O que foi entregue

`shared/theme/sizes.ts` com as escalas de dimensão do app: `spacing` numerado (base 8, nove
degraus), `radius` e `border` nomeados, o `gutter` (o respiro padrão de toda tela) e `icon.size`
(12 a 28, de 2 em 2). `line.height` nasceu em `typography.ts`, ao lado do `text`, como escala
própria em vez de razão aplicada sobre um tamanho. Tudo é injetado pelo `createStyles`, então
nenhum `*.styles.ts` importa nada.

Ao longo da verificação a task absorveu quatro coisas que não estavam no escopo: o
`shared/components/icon-button` (que alinha o traço do glifo, não a caixa), a conversão dos
caracteres `✓`/`✗`/`↳` em ícones de verdade, a correção do recuo das telas de Ajustes, e o
histórico da busca passar a mostrar o progresso real.

## Como foi testado

- `npx tsc --noEmit` — limpo
- `npx eslint src --ext .ts,.tsx` — 0 erros (5 warnings pré-existentes)
- `npx jest` — 99 suítes, 1281 testes passando
- **Dispositivo físico real**, ao longo de rc15…rc25 via `make redeploy-log`. Cada fatia foi olhada
  na tela antes de virar definitiva; foi assim que os desalinhamentos apareceram.

## Aprovação

O usuário validou cada rc no device e aprovou explicitamente: *"ficou otimo, pode commitar"* (as
correções de espaçamento e a auditoria dos literais) e *"acho que ta tudo ok, pode commitar"* (o
`icon.size` e o `IconButton`).

## Notas

**A task cresceu muito além do enunciado.** Ela abria como "spacing e radius"; o que a fez crescer
foi a verificação no device — cada fatia olhada na tela expunha algo que a anterior escondia. As
decisões que entraram no caminho, todas do usuário:

- **Gutter** — toda tela abre com o mesmo recuo e nada dentro o repete. Casou de graça com o
  vertical: o `App.tsx` já aplica o inset da barra de status, então o gutter começa abaixo dela. O
  leitor fica de fora por omissão, a mesma exceção que já fazia para aquele inset.
- **Medida é par, e é a soma dos filhos** — não uma caixa onde o conteúdo é espremido. A linha do
  `CardList` virou 78 em vez de 74 com o padding raspado.
- **`line.height` é escala própria** — o mesmo tamanho pede altura diferente numa barra apertada e
  num parágrafo. O `lineHeight` do RN é absoluto (dp, nunca multiplicador como no CSS).
- **Caracteres não fazem papel de ícone** — `✓`/`✗` viviam dentro da string traduzida, sem cor do
  tema e repetidos por idioma.

**O erro que mais custou, e a lição:** eu "consertei" o alinhamento das setas de voltar três vezes,
de três jeitos, antes de entender o problema. Um glifo do Lucide é desenhado dentro de uma caixa de
24 e nenhum a preenche — o chevron deixa 9 unidades vazias de cada lado, a seta 5, o círculo 2. Pôr
a *caixa* no gutter deixa o *traço* aquém dele. Cheguei a chutar o valor (8) e só depois medi
(11). A pergunta do usuário — *"por que criar algo pro chevron em vez de corrigir tudo?"* — foi o
que expôs que eram três casos do mesmo problema. O `IconButton` resolve os três, com a folga medida
do path de cada glifo em `icon-button.glyphs.ts`.

**Mudança de contrato:** `SearchHistoryRow` ganhou `progressFraction`, `progressLabel` e
`chapterCountLabel`. O catálogo já estava carregado na tela de busca — a mesma chamada que a
biblioteca faz — mas as linhas do histórico eram montadas só com o que havia sido persistido.

**Follow-ups:**
- `Settings2` na barra da série está rotulado `glyph="arrow"` sem que esse glifo tenha sido medido.
  Não carrega `alignStroke`, então nada depende disso hoje, mas o rótulo é impreciso.
- A regra `SIZE_LITERAL` do ESLint não pega um literal escondido numa `const` no topo do arquivo —
  foi assim que os meus passaram. Limitação do seletor; resolver exigiria plugin.
- `icon.slack` chegou a existir em `sizes.ts` e foi removido no fim: ficou órfão quando o
  `IconButton` absorveu a medida, e ainda usava 9/24 para "chevron ou seta" quando a seta é 5/24.

---
task: 008 - kotlin-reader-colours-and-i18n
plan: 028 - theme-and-design-tokens
date: 2026-09-19
status: done
---

# 008 - Placeholder de página do leitor: tema e idioma

## O que foi entregue

A UI de carregamento e de erro de uma página do leitor era Compose puro com cor e texto escritos na
mão — nem o tema nem o idioma a alcançavam. Agora o RN manda as duas como **SDU**, o que exigiu três
peças novas no vocabulário: `Spinner`, `Pressable` e um `placeholder` genérico no `TextNode`.

Também nasceu o `ColorTool.to.hex` (tipado `RgbColor → HexColor`), porque o `parseColor` do Android
lança em `rgb(...)`, e os campos `*Px` do SDU viraram `*Dp`, que é como o Kotlin sempre os leu.

## Como foi testado

- `npx tsc --noEmit` — limpo
- `npx eslint src --ext .ts,.tsx` — 0 erros
- `npx jest` — 100 suítes, 1291 testes
- `make coverage-kotlin` — `koverVerify` passa em todos os módulos
- **Dispositivo físico real** (rc26, rc27): desligando a rede com o leitor aberto, o erro aparece
  com a mensagem, o botão e o spinner nas cores do tema e no idioma do app.

## Aprovação

O usuário validou no device e aprovou: *"ficou tudo otimo. pode commitar e fechar a task"*.

## Notas

**A proposta original foi rejeitada, com razão.** Eu havia proposto uma prop `placeholder` com
campos nomeados (cor do spinner, texto do erro, rótulo do botão). O usuário apontou que isso
ensinaria o Kotlin o que é "erro" e o que é "carregando" — exatamente o que o comentário do
`SduNode.kt` diz que ele nunca deve saber. A versão final manda duas árvores SDU e o Kotlin segue
sendo só um interpretador.

**A descoberta que simplificou o contrato:** o retry não é ação do RN. É um `retryCount` local que
entra como parâmetro do Coil para forçar refetch. Nenhum evento atravessa a ponte, o que eliminou
todo o caminho de `onSduAction` que o contrato previa.

**Três bugs que só o device mostrou**, e os três eram anteriores a esta task:

1. **Toda cor que ia para o nativo era descartada.** `parseColor` aceita hex e lança em `rgb(...)`,
   que é a notação de todo token. As faixas de capítulo caíam no fallback branco desde a task de
   cor, sem ninguém notar, porque o fallback é branco e o texto é branco.
2. **O spinner virava um ponto** — `CircularProgressIndicator` sem tamanho. Não dá para mandar
   ícone do React (o nó vira Compose nativo), então usa `icon.size[9]`.
3. **Os campos `*Px` eram lidos como `.dp`.** O RN multiplicava pela densidade e o Kotlin tratava
   como dp de novo: as faixas saíam com três vezes o padding que as constantes nomeavam.

**Um critério de aceite não foi exercitado:** o placeholder nunca foi visto sob um *segundo* tema,
só sob o ativo. O caminho de repintura é o mesmo de qualquer tela (`useMemo` sobre `colors`), mas
a troca em si não foi observada.

**Follow-up que o usuário levantou e decidiu adiar:** as faixas ficaram 3× menores, e o
`itemHeights` mede todas as entradas — faixas incluídas — alimentando o `computeChapterFraction`.
A aritmética da barra de progresso mudou. Deve ter ficado mais precisa, mas não foi medido.

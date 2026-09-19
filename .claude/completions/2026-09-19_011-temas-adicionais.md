---
task: 011 - three-additional-themes
plan: 028 - theme-and-design-tokens
date: 2026-09-19
status: done
---

# 011 - Temas adicionais

## O que foi entregue

Seis identidades novas — **Ônix** (OLED), **Âmbar**, **Sépia**, **Aço**, **Vinho** e **Floresta** —
e quatro variantes OLED: Petróleo, Carmim, Vinho e Floresta. A task pedia três temas; virou doze
identidades no total.

Junto, o ferramental: `scripts/generate-theme.js` escreve os 64 tokens a partir de duas cores e se
registra sozinho, e `scripts/build-theme-cards.py` desenha uma amostra por identidade lendo as
cores dos próprios arquivos de token.

## Como foi testado

- `npx tsc --noEmit` — limpo
- `npx eslint src --ext .ts,.tsx` — 0 erros
- `npx jest` — 100 suítes, 1370 testes (85 só de tema)
- **Dispositivo físico real** (rc30, rc31)
- O gerador foi verificado regenerando o `forest` a partir das próprias cores: os 64 tokens
  saíram idênticos ao commitado

## Aprovação

O usuário escolheu cada paleta olhando uma página com a tela do app pintada nelas, e aprovou:
*"ficaram otimos"*, e depois *"vou aceitar do jeito que está"*.

## Notas

**As paletas foram escolhidas vendo, não lendo hex.** Montei uma página com a linha da biblioteca
pintada em cada candidata e o contraste medido embaixo. Foi isso que permitiu a escolha — e o que
expôs que os secundários da primeira proposta ficavam em 5.7–6.4, abaixo do AAA.

**A ideia de herdar as variantes foi do usuário, e era melhor que a minha.** Eu ia criar temas
separados; ele sugeriu a variante dentro do arquivo do pai. Descobriu-se que ela muda 3 campos de
64 — um arquivo separado seria 61 campos de duplicação, cada um uma chance de divergir.

**O gerador foi reescrito duas vezes, nas duas por observação do usuário:**

1. Nasceu com as paletas hardcoded — ele apontou que isso não é um gerador, é o registro do que já
   foi gerado. Virou CLI.
2. Depois perguntou por que o script não se registrava sozinho. Registra, desde que a ordem seja
   mecânica: alfabética por chave, variante presa ao pai.

**Um comentário mentiroso foi encontrado e corrigido.** O `teal/colors.tokens.ts` afirmava que
todo primeiro plano passava 7:1. Não passa: o texto secundário dá 6.30 e o link ciano 6.69. Eu
tinha escrito isso quando criei o tema, sem medir. O usuário optou por manter as cores, e petróleo
e carmim ficaram registrados no teste como exceções herdadas — nomeadas, com os números.

**O teste de legibilidade também saiu errado na primeira tentativa:** exigia AAA contra a
superfície elevada (o chip, o track do switch), o que reprovava os doze temas, inclusive os dois
já aprovados no device. Agora exige AAA na tela e no card, AA na superfície elevada.

**O que vale saber:** a ordem do seletor passou de curada para alfabética, então o petróleo não é
mais o primeiro apesar de ser o padrão. É o preço de uma ordem que um script consegue manter.

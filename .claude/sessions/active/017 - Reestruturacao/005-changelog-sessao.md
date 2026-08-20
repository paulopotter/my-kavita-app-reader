# Task 005 — Changelog da sessão

**Status:** todo (prioridade: só depois de tudo commitado — não faz sentido documentar o que
ainda pode mudar)

## Objetivo

Registrar em `[Unreleased]` do `CHANGELOG.md` tudo que foi feito nesta sessão longa de bugs e
melhorias, que ainda não tem nenhum commit. Como a sessão cobriu muitos pontos soltos (não um
único plano fechado como os planos numerados), a forma mais confiável de não esquecer nada é
gerar o changelog a partir do diff real, não da memória da conversa.

## Como gerar

```bash
git log 2026.08.20.0248..HEAD --oneline
git diff 2026.08.20.0248..HEAD --stat
```

Como nada foi commitado ainda nesta sessão, isso vai ficar vazio até os commits desta leva
existirem. **Pré-requisito real: Tasks 001–004 concluídas e os commits da leva de bugs
(tela do mangá, capítulo, biblioteca, configurações, cache) feitos com aprovação do usuário.**

Depois dos commits:

```bash
git log 2026.08.20.0248..HEAD --oneline
git diff 2026.08.20.0248..HEAD --name-status
```

## Passos

1. Depois que os commits da sessão existirem, gerar o diff completo desde a tag
   `2026.08.20.0248` até `HEAD`.
2. Agrupar por área (mesmo padrão do changelog existente: Backend/Kotlin vs Frontend/RN,
   bilíngue pt-BR/en).
3. Cobrir pelo menos: labels de botão do mangá, ordenação de capítulos sem reflow, pull-to-
   refresh, tip de status removida, layout de progresso da Biblioteca, switch de idioma,
   keep-screen-on sem animação indevida, mark-read em 98%, seleção de capítulos (cor/fechamento
   automático), suporte a idioma por app (Android 13+), cache de Series Detail, modo imersivo no
   Reader, overlay redesenhado do Reader, correção de status bar em todas as telas, e o que sair
   das Tasks 001/002 deste plano.
4. Escrever a entrada em `[Unreleased]`, sem bump de versão de tag ainda (isso é decisão
   separada do usuário, de quando lançar).
5. Apresentar ao usuário para revisão antes de commitar o `CHANGELOG.md`.

## Critério de conclusão

- Entrada `[Unreleased]` completa, bilíngue, revisada e aprovada pelo usuário.

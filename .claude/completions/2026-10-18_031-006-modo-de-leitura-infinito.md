---
task: 006 - infinite-reading-mode
plan: 031 - leitura-de-epub
date: 2026-10-18
status: done
---

# 006 - Modo de leitura infinito

## O que foi entregue

O modo infinito é o padrão para livros (o paginado continua como opção): um único documento WebView que cresce, com os próximos capítulos injetados perto do fim (`needNext` → `injectJavaScript`), progresso por capítulo, marcação de lido quando o fim de um capítulo passa e título/vizinhos seguindo a seção em vista. A barra de progresso de uma seção vai do topo da seção até o ponto em que o fim dela chega à borda inferior (0 ao começar, 1 ao terminar), e a posição salva é restaurada com a fórmula inversa. Trocar de modo esconde as barras para o modo novo aparecer funcionando.

## Como foi testado

- Testes do hook (apêndice, seção em vista, marcação de lido, troca de modo) e do `BookDocumentTool` (geometria do progresso avaliada com o mesmo código que roda na página) — passam.
- Aparelho físico: leitura da série 607; o bug de a barra já nascer com porcentagem no modo infinito foi corrigido a partir do log.
- `yarn tsc --noEmit`, `yarn eslint` e `yarn jest --no-watchman` nos caminhos tocados; Gradle sempre direcionado (`--tests`, `--no-watch-fs`). `make coverage` não foi rodado nesta sessão (volume NTFS, ver a nota no README do plano 031): os commits foram feitos com `--no-verify` e o usuário roda a cobertura à parte.

## Aprovação

Em 2026-10-18 o usuário usou o app no aparelho ao longo de várias builds (rc9 a rc22), deu o feedback que virou correção e, ao final, pediu para fechar as histórias concluídas ("fecha as histórias que tiver que fechar").

## Notas

- Não feito (fora da v1): aparar seções antigas do documento.
- Um log `[book-reader]` registra modo, capítulo e vizinhos a cada mudança; mantido para explicar qualquer perda de "capítulo anterior" em campo.

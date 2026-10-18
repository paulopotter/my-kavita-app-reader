---
task: 004 - book-reader-screen
plan: 031 - leitura-de-epub
date: 2026-10-18
status: done
---

# 004 - Tela do leitor de livros

## O que foi entregue

`screens/book-reader/`: `useBookReader` (carrega info, posição salva e página; retoma de onde parou; capítulo anterior/próximo pela ordem da série; troca de páginas; grava progresso e marca como lido uma vez) e uma tela burra com WebView travada (`originWhitelist about:*`, sem DOM storage nem acesso a arquivos, CSP só com o nonce do documento, cliques em links engolidos). Pelo feedback do aparelho: barras fechadas ao abrir, rodapé maior com próximo à direita, barra fina de progresso (promovida para `shared/`), nome da obra no cabeçalho (busca na série quando a rota não traz) e, nos dois leitores, o nome leva à tela da obra, enquanto a seta de voltar volta à última tela.

## Como foi testado

- `book-reader.hooks`, a tela, as barras e o `BookDocumentTool` têm testes ao lado do código (incluindo a geometria do progresso rodada de verdade com `vm`) — passam.
- Aparelho físico: leitura da série 607 em várias builds.
- `yarn tsc --noEmit`, `yarn eslint` e `yarn jest --no-watchman` nos caminhos tocados; Gradle sempre direcionado (`--tests`, `--no-watch-fs`). `make coverage` não foi rodado nesta sessão (volume NTFS, ver a nota no README do plano 031): os commits foram feitos com `--no-verify` e o usuário roda a cobertura à parte.

## Aprovação

Em 2026-10-18 o usuário usou o app no aparelho ao longo de várias builds (rc9 a rc22), deu o feedback que virou correção e, ao final, pediu para fechar as histórias concluídas ("fecha as histórias que tiver que fechar").

## Notas

- Não verificado: imagens e fontes de um EPUB que as tenha.
- Fora do plano, mas entregue na sequência: selo "Novel"/"PDF" nos cartões, bloco de leitura de novel nas Preferências de leitura e o campo `fileFormat` ponta a ponta.

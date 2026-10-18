---
task: 001 - loose-chapter-title-and-order
plan: 031 - leitura-de-epub
date: 2026-10-18
status: done
---

# 001 - Título e ordem dos capítulos "soltos" do Kavita

## O que foi entregue

O plugin Kavita passou a tratar o capítulo "solto" (ordem `-100000`, comum em novels com um EPUB por volume) pela identidade do volume que o contém: o número do volume ordena e vira o número exibido, e o `titleName` vira o título. Vale para a lista de capítulos e para o capítulo avulso. Só valores mudaram; o formato do digest é o mesmo.

## Como foi testado

- 5 testes em `KavitaServerPluginTest` — passam.
- Aparelho físico: a página da série 607 lista os volumes com o nome certo e na ordem certa.
- `yarn tsc --noEmit`, `yarn eslint` e `yarn jest --no-watchman` nos caminhos tocados; Gradle sempre direcionado (`--tests`, `--no-watch-fs`). `make coverage` não foi rodado nesta sessão (volume NTFS, ver a nota no README do plano 031): os commits foram feitos com `--no-verify` e o usuário roda a cobertura à parte.

## Aprovação

Em 2026-10-18 o usuário usou o app no aparelho ao longo de várias builds (rc9 a rc22), deu o feedback que virou correção e, ao final, pediu para fechar as histórias concluídas ("fecha as histórias que tiver que fechar").

## Notas

- O RN prefixa o número ao título (`ChapterTool.format.title`), então a linha pode aparecer como "1. Capítulo 1" — cosmético, deixado como está.

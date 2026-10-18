---
task: 001 - segment-chapters-in-cache
plan: 030 - cache-da-serie-em-segmentos
date: 2026-10-18
status: done
---

# 001 - Série grande guardada em segmentos no cache

## O que foi entregue

Uma série com milhares de capítulos deixou de ser uma linha única acima do limite de ~2 MB do `CursorWindow`: o digest é gravado como linha principal + índice + segmentos de ~450 mil caracteres (`SerialChaptersSegments.kt`), e a leitura remonta o mesmo `SerialDigest`, sem mudar nada para o RN. `patchSerialChapterReadStatus` reescreve só o segmento do capítulo e a linha principal. Junto veio a correção de que a atualização da lista apagava os capítulos guardados (`explicitNulls = false`).

## Como foi testado

- Testes novos em `SerialDigestTest.kt` (ida e volta, série pequena fica inline, segmento ausente, segmento de outra gravação, linha principal ilegível, correção de um capítulo, capítulo desconhecido, atualização da lista sobre linha segmentada) — passam.
- Aparelho físico: o mangá de mais de 3000 capítulos (rc5/rc6) volta a abrir a biblioteca e a página da obra, e a segunda abertura é acerto de cache (linhas `SerialDigest read/fetch/persist` do log).
- `yarn tsc --noEmit`, `yarn eslint` e `yarn jest --no-watchman` nos caminhos tocados; Gradle sempre direcionado (`--tests`, `--no-watch-fs`). `make coverage` não foi rodado nesta sessão (volume NTFS, ver a nota no README do plano 031): os commits foram feitos com `--no-verify` e o usuário roda a cobertura à parte.

## Aprovação

Em 2026-10-18 o usuário usou o app no aparelho ao longo de várias builds (rc9 a rc22), deu o feedback que virou correção e, ao final, pediu para fechar as histórias concluídas ("fecha as histórias que tiver que fechar").

## Notas

- A task 002 (paginar capítulos na tela da série) continua pendente e condicional: muda contrato e exige nova aprovação; a página não foi dada como pesada depois desta task.
- Os logs `SerialDigest` ficam ligados de propósito: foram eles que mostraram o motivo de a tela recarregar ao voltar numa obra.
- Relacionado à revisão ampla das regras de cache do `:content-digest` (memória do projeto).

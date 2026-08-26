# Backlog 017 — Cache em cascata (Series/Chapter referenciam Page/Chapter por key, não embutidos)

## What
Hoje `buildChapterDigest`/`buildSeriesDigest` (`:content-digest`, Task 023)
serializam a lista de `PageDigest`/`ChapterDigest` inteira dentro do JSON
persistido no `Cache` do nível acima — cada `PageDigest` já tem sua própria
entrada de cache (`domain="page"`), mas o `Chapter` que a contém grava uma
cópia completa dela de novo dentro de si; o mesmo vale para `Series`
embutindo `Chapter`s inteiros. Avaliar migrar para uma cascata real: o
nível acima guarda só as *keys* das entradas do nível abaixo, e a leitura
do cache reconstrói a lista consultando `Cache.persistent.get(key)` de
cada referência, em vez de deserializar uma cópia embutida.

## Why
- **Duplicação de storage real**: uma Series com `full=true` grava, no
  pior caso, o mesmo `PageDigest` três vezes (sua própria entrada, dentro
  do Chapter que a embute, e dentro da Series que embute esse Chapter).
- **TTL inconsistente por granularidade**: se o TTL de uma Page expira mas
  o do Chapter que a embute ainda está fresco, ler o Chapter hoje devolve
  aquela Page "congelada" no estado de quando o Chapter foi escrito, sem
  sinalizar que está stale — a leitura em cascata resolveria isso, já que
  cada Page seria relida (e checado seu próprio `isExpired`) na hora.

## Trade-off identificado (por isso ficou fora do escopo da Task 023)
- **Leitura deixa de ser O(1)**: hoje ler um Chapter cacheado é uma query.
  Com cascata, vira 1 query do Chapter + N queries (uma por Page
  referenciada) — para uma Series com `full=true`, isso pode significar
  dezenas de queries síncronas só para servir do cache, potencialmente
  mais lento que ir direto para a rede dependendo do tamanho da série.
- **Semântica de "stale" fica mais complexa**: precisa decidir se o nível
  acima é considerado stale só quando ele mesmo expira, ou também quando
  qualquer referência filha expira — muda quando o refresh em background
  (stale-while-revalidate) dispara.
- **Escopo é Series+Chapter+Page juntos, não só um par**: se só
  Chapter→Page virar cascata mas Series→Chapter continuar embutindo
  Chapters inteiros (que por sua vez não embutem mais Pages), o resultado
  fica inconsistente — os dois pares precisam migrar juntos.
- **`prevChapter`/`nextChapter`** são montados pela Series numa passada em
  memória (nunca vêm do próprio cache do Chapter) — não se encaixam
  limpamente no mesmo modelo de referência-por-key sem desenho à parte.

## Scope (when planned)
- Decidir a política de "Page ausente na cascata" (já resolvido em
  princípio na Task 023: busca fresh só a Page ausente, não invalida o
  Chapter inteiro) e replicar o mesmo raciocínio para Chapter ausente
  dentro de uma Series.
- Medir o custo real de N queries síncronas antes de migrar — pode não
  compensar para séries grandes.
- Redesenhar `buildChapterDigest`/`buildSeriesDigest` (write E read) para
  o novo formato, com testes cobrindo leitura parcial (algumas
  referências presentes, outras expurgadas).

## Dependencies
- Task 023 (Plano 017 — módulo `:cache`, cache-first em
  Page/Chapter/Series) — este item é uma otimização em cima do que já
  existe lá, não um bloqueador dela.

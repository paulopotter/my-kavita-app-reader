# Backlog 024 — Storage Footprint & Resource Hygiene

> Estava em `active/` como plano de 5 tasks (todas `pending`, nenhuma iniciada) e voltou para o
> backlog sem nada implementado. O detalhamento por task foi condensado aqui; quando for
> replanejado, o `plan-manager` monta as tasks de novo a partir deste escopo.

## What

O app ocupa cerca de **900 MB** no device. Nada mostra isso ao usuário, nada deixa ele limitar, e
nada recupera espaço sozinho. Este item transforma o objetivo declarado — "manter um app leve que
não impacte no consumo de bateria, memória, espaço e de download de dados" — num orçamento de
armazenamento controlado pelo usuário.

## Why

Quatro achados da investigação pré-plano, cada um verificado por inspeção:

1. **O cache de páginas é, por design, o maior consumidor.** `MainApplication.kt` configura o Coil
   com `READER_DISK_CACHE_MAX_BYTES = 500 MB` fixo. O comentário no código explica o porquê: o
   default do Coil (2% do disco livre) num device quase cheio não segura nem dois capítulos, e as
   páginas são rebaixadas e rebaixadas de novo. Ou seja, os 500 MB são **uma troca deliberada entre
   espaço e rede** — só que fixada no extremo "gasta espaço, economiza banda", sem nunca consultar
   o usuário. E sem expiração por idade: o Coil só remove quando bate no teto.

2. **O cache de dados já tem purga, e ninguém chama.** `CacheStore` declara `purgeExpired()` e
   `purgeOlderThan()`, implementados nos três backends, expostos na bridge e no `CacheManager` do
   RN. Nenhum caller de produção existe — a tubulação inteira está pronta, testada, e nunca ligada
   a um gatilho.

3. **Já existe um precedente exato dessa forma.** O histórico de notificações tem retenção real:
   preferência `retentionDays` ajustável numa sub-tela de config, persistida via `:preferences`,
   aplicada por `NotificationRetentionPurge` disparado fire-and-forget do `MainApplication`. Este
   item copia essa forma em vez de inventar uma segunda.

4. **Não há problema de bateria a corrigir aqui — e este item não pode criar um.** O app não usa
   `WorkManager` nem job periódico. Todo mecanismo novo roda **só na abertura do app (splash) ou
   por ação explícita do usuário**.

## Scope (when planned)

- **`:storage`** — módulo Kotlin Layer 2 novo: `Storage` (facade com `measure()` / `clear(source)`),
  `StorageSource` (uma implementação por store mensurável), `StorageBudget` (a preferência de teto).
  Delega a recuperação para quem é dono de cada store (`:cache` para o Room, `DiskCache` do Coil
  para páginas) em vez de mexer no diretório dos outros.
- **Medição primeiro.** Descobrir do que os 900 MB são feitos de verdade — páginas Coil, cache Room,
  bundle OTA, resto — antes de escolher qualquer número. Escolher um teto no escuro e depois
  descobrir que páginas nunca foram o problema é o risco real.
- **Teto configurável** substituindo o `READER_DISK_CACHE_MAX_BYTES` fixo. Como o tamanho do
  `DiskCache` do Coil é fixado na construção do `ImageLoader`, a preferência vale a partir do
  próximo start — e a tela diz isso em vez de fingir que é imediato.
- **Purga do `:cache` na splash**, como irmã da purga de notificações, nos mesmos termos
  (fire-and-forget, escopo da aplicação, sem bloquear o gate da splash).
- **`config/storage/`** — uso por fonte, controle do teto, limpeza manual.

## Non-goals

- Sem job em background, sem `WorkManager`, sem wake-up periódico.
- Sem mexer no ciclo de vida do `NotificationConnectionService` nem no seu backoff.
- Sem camada de cache nova e sem substituir o Coil — este item limita e reporta o que já existe.
- Sem telemetria: medições são lidas e mostradas no device, nunca coletadas.
- Não é política de armazenamento do bundle OTA. Se a medição provar que ele é fatia material,
  isso vira um item próprio.

## Open questions

- Qual o teto padrão, e qual a faixa que a tela oferece? Depende da medição.
- A purga na splash usa qual política — só expirados, ou também "velhos e não lidos"?
- O bundle OTA e seus assets são fatia material dos 900 MB?

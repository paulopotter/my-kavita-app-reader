# Backlog 016 — Estratégia de rollback de migrations Room

## What
Padrão para mitigar o cenário em que o banco local já foi migrado para uma
versão de schema mais nova (`versionCode` de teste/dev) e o app é então
revertido para uma versão estável mais antiga cujo `AppDatabase.version`
é menor que o schema no disco.

## Why
Room não tem rollback de schema embutido — migrations são forward-only.
Se o app abre um banco com `version` maior do que o `AppDatabase` da APK
instalada, e nenhuma migration de downgrade foi registrada, o Room lança
`IllegalStateException` (versão do banco maior que a esperada) e o app
não abre.

Isso já aconteceu na prática: testar uma migration nova (ex: a
`MIGRATION_4_5` que introduziu `series_sort_prefs`, ver Plano 006) e depois
reinstalar/voltar para uma build estável anterior deixa o banco "à frente"
da versão que o app antigo entende.

## Scope (when planned)
- Investigar `RoomDatabase.Builder.addMigrations` com migrations de downgrade
  explícitas (ex: `MIGRATION_5_4`) para as migrations mais recentes, cobrindo
  pelo menos N versões anteriores — decidir até onde vale a pena manter isso.
- Ou: `fallbackToDestructiveMigrationOnDowngrade()` como rede de segurança
  *apenas* para downgrade (nunca para upgrade — ver invariante nº 7 em
  `mistakes.md`, que proíbe fallback destrutivo em upgrades). Avaliar se
  perder dados locais em downgrade é aceitável (dados são re-sincronizáveis
  do servidor Kavita na maioria dos casos) ou se precisa de backup prévio.
- Processo de dev: script/skill que, antes de aplicar uma migration
  experimental num device de teste, faz backup do banco (`adb pull` do
  arquivo `.db`) para restaurar manualmente se o teste for descartado.
- Documentar a decisão final em `.claude/docs/mistakes.md` como novo item,
  já que o crash de downgrade é silencioso até acontecer.
- Cobrir com teste de `MigrationTestHelper` o caminho de downgrade,
  seguindo o padrão já estabelecido em
  `core/src/test/kotlin/.../migrations/Migration_4_5_Test.kt` (Plano 006).

## Dependencies
- Plano 001 (Android scaffold, Room já em uso)
- Nenhuma migration nova deve ser escrita sem considerar este padrão depois
  que ele for definido.

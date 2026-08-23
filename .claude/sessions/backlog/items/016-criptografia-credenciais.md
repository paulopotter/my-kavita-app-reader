# Backlog 016 — Criptografia de credenciais de servidor

**Origem:** Plano 017, Task 017 (Server module) — achado durante o design de
`ServerGroupEntity`/`credentialsJson`.

**Achado real, não introduzido por esta mudança:** `AuthConfigEntity.apiKey`/`jwt`
já são salvos em texto puro no Room hoje, sem criptografia — esse débito já
existia antes desta task. `credentialsJson` (a nova coluna genérica de
credenciais por provider, ver Task 017) segue o mesmo padrão por enquanto,
deliberadamente, até este item ser priorizado.

## Contexto de risco (Android, não web)

O banco SQLite do app já vive no sandbox privado do app
(`/data/data/com.mymangareader/databases/`), inacessível a outros apps sem
root — bem diferente do risco de um banco web exposto. Mas não é risco zero:
perda física do aparelho sem tela de bloqueio, extração forense, ou um backup
ADB mal configurado ainda expõem o arquivo `.db` em texto puro.

## Opções levantadas, com prós/contras

### Opção A — `EncryptedSharedPreferences` (Jetpack Security), pré-selecionada

Tira só o campo sensível (`credentialsJson`, e possivelmente
`AuthConfigEntity.apiKey`/`jwt` também, se o escopo crescer) do Room e guarda
num `EncryptedSharedPreferences` separado, keyed por `groupId` — usa o
Android Keystore por baixo, sem gerenciamento manual de chave.

- **Prós:** custo de implementação baixo (dependência leve, API tipo
  `SharedPreferences` comum), não exige trocar a engine do banco, aplica-se
  cirurgicamente só ao campo sensível, não obriga migrar dado já existente
  de uma vez.
- **Contras:** dois lugares de storage para o mesmo "grupo" (metadados no
  Room, credencial no `EncryptedSharedPreferences`) — precisa manter os dois
  em sincronia manualmente (ex: apagar dos dois ao remover um grupo).

### Opção B — SQLCipher (banco inteiro criptografado)

Substitui a engine SQLite por uma variante criptografada
(`net.zetetic:android-database-sqlcipher`), com uma chave gerenciada via
Android Keystore.

- **Prós:** protege o arquivo `.db` inteiro, não só um campo — mais robusto
  a longo prazo, sem duplicar lugares de storage.
- **Contras:** é tudo-ou-nada por arquivo `.db` — não dá para criptografar
  só as tabelas novas dentro do `AppDatabase` existente. Criptografar só o
  que o `:server` adiciona exigiria um segundo `RoomDatabase` físico
  separado do atual, o que significaria desfazer/mover `server_group`/
  `server_url` (criadas na Task 017) para esse banco novo, e perder
  transações/joins atômicos entre o banco novo e o antigo enquanto os dois
  coexistirem. Migração de um banco já populado para SQLCipher depois é
  possível sem perda de dado (`sqlcipher_export`), mas não é trivial.

## Decisão pendente

Não decidido nesta task — bater o martelo quando este item for priorizado.
Opção A (`EncryptedSharedPreferences`) é a pré-selecionada por menor custo e
escopo mais contido, mas o usuário quer revisar as duas antes de confirmar.

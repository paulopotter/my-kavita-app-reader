# Backlog 027 — `.env` como valor padrão e gate de feature

## What
Fazer o `.env` valer: uma variável preenchida vira o valor padrão daquela
feature **e** esconde a tela de configuração correspondente dentro do app.
Vazia, o app se comporta como hoje (o usuário configura pela UI).

Exemplo do comportamento pretendido: com `NTFY_URL`/`NTFY_TOPIC` preenchidos,
o app já nasce apontando para aquele canal e a tela de cadastro de servidor de
notificação não aparece — não há o que configurar.

## Why
Hoje o `.env.example` declara variáveis que dão a entender que são necessárias,
mas quase nenhuma é lida por alguém. A leitura natural do arquivo está errada,
e isso já causou dano concreto: ao escrever o README (setembro/2026) a
documentação afirmou que notificações exigiam preencher `NTFY_*` e gerar o
próprio build — o que é falso, a configuração é toda em runtime. O usuário
corrigiu; o README já foi ajustado, mas a origem da confusão continua.

Além disso, o comportamento pretendido é exatamente a regra do CLAUDE.md —
"uma feature é gated por config ausente, nunca por um `if`" — que hoje não tem
mecanismo geral que a sustente.

## Estado atual (levantado, não confirmado inteiro)
- `scripts/env-to-local-properties.sh` copia **todo** o conteúdo do `.env` para
  `android/local.properties`, exceto `ANDROID_SDK_DIR` (vira `sdk.dir`) e
  `DEEPLINK_HOSTS` (vira `deeplink.hostN`).
- `android/app/build.gradle.kts` lê via `localProps.getProperty(...)`, com
  fallback para variável de ambiente: `OTA_MANIFEST_URL`, `OTA_FALLBACK_ON_ERROR`,
  `OTA_FALLBACK_ON_NO_UPDATE`, `COLLAPSE_WINDOW_MS`. Essas **são** consumidas.
- `COLLAPSE_WINDOW_MS` é lida mas **não** está no `.env.example`.
- `NTFY_URL`, `NTFY_TOPIC`, `NOTIFICATION_PROVIDER`, `KAVITA_URL`,
  `KAVITA_API_KEY`, `BFF_URL`: nenhuma ocorrência em `*.kt`/`*.kts` fora de
  `/build/`. Notificações, servidor Kavita e BFF são configurados em runtime
  (Room + tela de ajustes); `NtfyPlugin.connect()` recebe a URL como parâmetro.

Ou seja: hoje essas variáveis viajam até o `local.properties` e morrem lá.

## Scope (when planned)
- Auditar variável por variável: consumida (build/runtime) ou órfã.
- Definir o mecanismo do gate. Cada variável precisa chegar ao RN de alguma
  forma (`BuildConfig` → bridge → Service?) para a tela decidir se aparece.
  Vale desenhar isso uma vez e aplicar a todas, em vez de caso a caso.
- Decidir o que acontece quando a variável está preenchida e o usuário já tinha
  configurado algo pela UI antes — o `.env` sobrepõe, ignora, ou migra?
- Rever se o script deve copiar tudo em bloco: hoje credenciais que ninguém lê
  acabam gravadas num arquivo que não precisa delas.
- Acertar o `.env.example`: cada variável com um comentário dizendo se é
  obrigatória, opcional-com-default, ou gate de feature.

## Dependencies
- Nenhuma. Toca `scripts/env-to-local-properties.sh`, `android/app/build.gradle.kts`,
  o `.env.example`, e as telas de config que passarem a ser condicionais.

## Notes
Quando isso existir, o README precisa de uma revisão: a seção de
funcionalidades descreve hoje o comportamento real (configuração pela UI), que
muda para quem preencher o `.env`.

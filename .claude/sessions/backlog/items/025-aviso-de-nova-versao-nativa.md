# Backlog 025 — Aviso in-app de nova versão nativa disponível

## What
O `latest.json` já publica `lastKotlinVersion` — a versão nativa que aquela
release entrega. Nada lê esse campo ainda. Falta a interface que compara esse
valor com o `BuildConfig.KOTLIN_VERSION_NAME` do app rodando e, quando há uma
mais nova, avisa o usuário de forma **informativa** (nunca bloqueante): existe
um APK que vale instalar.

O usuário pediu que isso apareça na tela de **notificações**, como um item
informativo ao lado das notificações de capítulo.

## Why
- Há uma assimetria entre os dois artefatos de uma release: o **bundle** RN
  chega sozinho (o OTA baixa, esforço zero), enquanto o **nativo** só chega
  instalando um APK — trabalho manual que o usuário precisa decidir fazer. Hoje
  não existe nada que o informe de que esse trabalho está disponível.
- `lastAppVersion` não resolve: ele avança em **toda** release, inclusive nas
  que só mudaram JS e que o OTA já aplicou sozinho. Comparar por ele diria "tem
  atualização" quando não há nada a fazer.
- O caminho bloqueante já existe e é deliberadamente separado: `policies`
  (`policy-pending.json`) para obrigar/recomendar, e `minKotlinVersion` para
  impedir um bundle de rodar em nativo incompatível. Este item é o terceiro
  caso, que hoje não tem mecanismo: "não é obrigatório, mas você deveria saber".

## Notes / decisões já tomadas
- O campo `lastKotlinVersion` já é publicado pelo `release.yml` e pelos dois
  scripts de servidor local (`ota-serve.sh`, `ota-local-server.sh`).
- `Json { ignoreUnknownKeys = true }` no `OtaManager` garante que apps antigos
  ignoram o campo — a adição já é retrocompatível.
- **Nunca bloqueia.** Obrigar atualização continua sendo exclusividade do
  `policy-pending.json`.
- O app já sabe abrir a página de releases (`RELEASE_PAGE_URL`, usado hoje na
  decisão `Blocked`) — o aviso pode oferecer isso num toque.

## Questões em aberto
- Como esse item se encaixa no histórico de notificações, que hoje é modelado em
  cima de série/capítulo (`NotificationHistoryEntity` tem `seriesId`/`chapterId`).
  Um aviso de versão não tem série nenhuma — precisa de um tipo próprio.
- Quando ele deixa de aparecer: ao instalar o APK, ao ser tocado/dispensado, ou
  ambos? Ver `NotificationEvents.contentConsumed` — o consumo aqui seria
  "instalou a versão", que o app detecta sozinho comparando as versões.
- Se o rodapé de versões (`shared/components/app-versions/`) também deve marcar
  que há versão nova, além da tela de notificações.

## Depends on
- Nada técnico. O dado já está publicado.

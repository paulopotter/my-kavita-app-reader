# Backlog 015 — Telemetria interna (painel debug)

Painel in-app visível apenas em modo debug para monitorar a saúde do app em
tempo real sem dependência de ferramentas externas. Métricas de interesse:

- **FPS** — frame rate atual da UI RN
- **Cache** — status do cache de imagens/dados, hit rate, tamanho em disco
- **OTA** — versão do bundle ativo, última checagem, estado de estabilidade
  (`bootCount`, `isStable`), progresso de download se em curso
- **Memória** — heap JS e nativa (via `PerformanceObserver` no RN + JVM heap)
- **Rede** — latência média das chamadas para o servidor Kavita

Deve ser acessível via gesto secreto (ex: 5 taps no rodapé) ou menu debug,
nunca visível para o usuário final em builds de produção.

## Subtask — níveis de log

Sistema de logs hoje é só `Log.d`/`Log.e` soltos (tag `CoilDiagnostic` e afins),
sem nível configurável nem filtro central. Precisamos de:

- Níveis padrão (verbose/debug/info/warn/error) com um nível mínimo configurável
  em runtime (provavelmente amarrado ao modo debug do painel acima).
- Um ponto único de logging (wrapper Kotlin) em vez de `android.util.Log`
  espalhado, para permitir habilitar/desabilitar por nível sem recompilar.
- Objetivo prático: poder ligar log verboso (ex: decode de página, cache,
  rede) só quando precisando depurar algo específico, sem poluir logcat em
  uso normal nem builds de produção.

# Task 002 — Auditoria de sincronização de progresso local↔servidor

**Status:** todo

## Objetivo

O usuário suspeita que o app não esteja enviando o progresso salvo para o servidor Kavita em
todos os pontos em que deveria — por exemplo, periodicamente durante a leitura ou ao sair do
Reader. Confirmar se existe lacuna real antes de propor qualquer correção.

## Passos

1. Mapear todos os pontos do código que chamam salvamento de progresso, local
   (`saveLocalProgress`) e remoto (o que existe hoje equivalente para o servidor — verificar se
   `KavitaChapterFeature.saveReadingProgress` é chamado em paralelo ou só sob demanda).
2. Mapear os gatilhos atuais: mudança de página, troca de capítulo, desmontagem do Reader
   (`useEffect` cleanup), fechamento do app.
3. Identificar se existe uma sync periódica (timer) ou fila de sincronização (`sync queue`,
   mencionada no plano original 007 como algo a existir) e se está de fato ativa.
4. Reportar ao usuário lacunas encontradas antes de implementar qualquer correção — este plano
   prioriza diagnóstico correto sobre correção apressada, dado o padrão de bugs recorrentes
   desta sessão.

## Critério de conclusão

- Relatório de auditoria apresentado ao usuário, com pontos exatos (arquivo:linha) onde o
  progresso é ou deveria ser sincronizado.
- Decisão do usuário sobre quais lacunas corrigir, e se isso entra neste plano ou vira task
  separada.

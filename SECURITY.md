# Política de Segurança

> 🇬🇧 [English version](SECURITY.en.md)

## Versões suportadas

Este projeto está em desenvolvimento inicial (sem release estável ainda) e
segue um único ramo ativo (`main`). Apenas a versão mais recente publicada
recebe correções de segurança.

## Reportando uma vulnerabilidade

**Não abra uma issue pública** para vulnerabilidades de segurança — isso
exporia o problema antes de existir uma correção.

Em vez disso, use o
[GitHub Security Advisories](https://github.com/paulopotter/my-kavita-app-reader/security/advisories/new)
deste repositório ("Security" → "Report a vulnerability"). O report chega
privadamente ao mantenedor, com espaço para descrever o impacto, passos para
reproduzir e uma sugestão de correção, se houver.

Você pode esperar uma resposta inicial em até 7 dias. Se a vulnerabilidade for
confirmada, um advisory é publicado e uma correção é lançada assim que
possível; crédito é dado a quem reportou, salvo pedido de anonimato.

## Escopo

Este é um app cliente para servidores [Kavita](https://www.kavitareader.com/)
hospedados pelo próprio usuário — não há backend ou infraestrutura própria
do projeto. O escopo de segurança cobre o código do app (Kotlin/React Native)
e os workflows de CI/CD deste repositório, não a instalação do Kavita do
usuário.

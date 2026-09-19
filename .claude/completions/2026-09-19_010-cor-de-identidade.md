---
task: 010 - app-identity-colour
plan: 028 - theme-and-design-tokens
date: 2026-09-19
status: done
---

# 010 - Cor de identidade do app

## O que foi entregue

O tema **petróleo** virou o padrão, e o antigo ganhou o nome que descreve o que ele é —
**carmim** (azul-marinho com acento vermelho), com a pasta renomeada de `themes/default/` para
`themes/crimson/`. Nenhum tema se chama "default": quem tem o papel é `defaultThemeName`, e o
seletor marca com sufixo traduzido.

A identidade compilada no APK (`colors.xml` e `NotificationDisplay.kt`) passou a espelhar o
petróleo: `#0F1A21` de fundo e `#38BDC7` de acento. Um teste novo trava as duas pontas.

Entrou junto, fora do escopo original: a **amostra de cor** no seletor de temas — um quadradinho
dividido na diagonal, acento em cima e fundo embaixo, para ver a cara de um tema sem vesti-lo.

## Como foi testado

- `npx tsc --noEmit` — limpo
- `npx eslint src --ext .ts,.tsx` — 0 erros
- `npx jest` — 100 suítes, 1297 testes
- `make coverage-kotlin` — passa
- **Dispositivo físico real** (rc28, rc29)

## Aprovação

A identidade: *"gostei do que eu vi (ou do que nao vi), a splash do RN respeita o tema, então ta de
boas"*. A amostra: *"lindo, pode commitar"*.

## Notas

**A ordem importou.** Não dava para escolher a cor de identidade antes de decidir qual tema é o
padrão — foi o usuário quem promoveu o petróleo primeiro, e só então a identidade saiu dele.

**O `NotificationDisplay` entrou, embora a task 008 o tivesse listado como cor fixa.** O motivo
registrado lá era não haver RN vivo para perguntar, não que a cor nunca mude. É a cor da marca.

**A amostra é a única exceção legítima à regra de cor do app.** Ela mostra uma identidade que
deliberadamente *não* está ativa, então vem do registry e não do `useTheme()` — não passa pelo
`createStyles` e tem de ser inline. Está comentado nos dois lados para ninguém "consertar" depois.

**O que vale saber:** o fundo do ícone na gaveta ficou bem mais escuro que antes. Em launcher OLED
fica perto do preto do sistema; o usuário olhou e aceitou.

**Um teste guarda a sincronia:** o ícone e a splash nativa são desenhados antes de qualquer código
rodar, então carregam uma cópia do hex em vez de ler o token. Se o papel de padrão mudar de tema
sem o `colors.xml` ser editado, o teste falha dizendo qual hex falta.

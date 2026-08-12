# My Manga Reader

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![App](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpaulopotter%2Fmy-kavita-app-reader%2Fmain%2Fdocs%2Fexternal%2Fversion.json&query=%24.app&label=App&color=blue)](https://github.com/paulopotter/my-kavita-app-reader/releases/latest)
[![Backend](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpaulopotter%2Fmy-kavita-app-reader%2Fmain%2Fdocs%2Fexternal%2Fversion.json&query=%24.kotlin&label=Backend&color=7F52FF)](https://github.com/paulopotter/my-kavita-app-reader/releases/latest)
[![Frontend](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpaulopotter%2Fmy-kavita-app-reader%2Fmain%2Fdocs%2Fexternal%2Fversion.json&query=%24.rn&label=Frontend&color=61DAFB)](https://github.com/paulopotter/my-kavita-app-reader/releases/latest)
[![Kotlin coverage](https://img.shields.io/badge/Kotlin%20coverage-26%25%20lines-7F52FF)](#)
[![JS coverage](https://img.shields.io/badge/JS%20coverage-12.93%25%20stmts-61DAFB)](#)

> 🇬🇧 [English version](README.en.md)

App Android para leitura de mangás via servidor [Kavita](https://www.kavitareader.com/),
com interface em React Native e atualização de UI sem reinstalar o APK (OTA).

> **Status**: em desenvolvimento inicial — não há release estável ainda.

## Screenshots

![Visão geral das telas](docs/external/screenshots/grid_preview.png)

## Funcionalidades disponíveis

- [x] Tela de splash com sincronização inicial e progresso visual
- [x] Navegação principal com abas (Biblioteca, Configurações)
- [x] Atualizações OTA com políticas configuráveis (none, recommended, highly_recommended, required)
- [x] Tela de biblioteca com listagem de séries
- [x] Tela de configurações com gerenciamento de servidor e preferências

## Políticas de atualização OTA

Quando uma nova versão do bundle JS está disponível, o app pode exibir um aviso antes de aplicar a atualização:

| Política | Comportamento |
|---|---|
| `none` | Atualiza silenciosamente em background, sem aviso |
| `recommended` | Exibe um diálogo na splash — o usuário pode ignorar e continuar |
| `highly_recommended` | Exibe um diálogo bloqueante na splash; reexibe após 5 minutos dentro do app |
| `required` | Bloqueia o app permanentemente até o usuário acessar as novidades |

## Funcionalidades planejadas

- [ ] Leitor de mangás com controle de progresso
- [ ] Notificações de novos capítulos
- [ ] Suporte a plugins para fontes de dados e notificações

## Como instalar

Documentação de instalação disponível em [`docs/`](docs/) e no
[site do projeto](https://paulopotter.github.io/my-kavita-app-reader).

## Como fazer build

```bash
# Instalar dependências e validar ambiente
make setup

# Gerar APK de debug
make build-android

# Gerar bundle JS
make build-bundle
```

Veja o [guia de contribuição](CONTRIBUTING.md) para configuração detalhada
do ambiente de desenvolvimento.

## Licença

Distribuído sob a [GNU General Public License v3.0](LICENSE).

# My Manga Reader

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

> 🇬🇧 [English version](README.en.md)

App Android para leitura de mangás via servidor [Kavita](https://www.kavitareader.com/),
com interface em React Native e atualização de UI sem reinstalar o APK (OTA).

> **Status**: em desenvolvimento inicial — não há release estável ainda.

## Funcionalidades planejadas

- Biblioteca de séries e capítulos via Kavita
- Leitor de mangás com controle de progresso
- Notificações de novos capítulos
- Atualizações de interface sem reinstalar o APK
- Suporte a plugins para fontes de dados e notificações

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

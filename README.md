# My Manga Reader

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![App](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpaulopotter%2Fmy-kavita-app-reader%2Fmain%2Fdocs%2Fexternal%2Fversion.json&query=%24.app&label=App&color=blue)](https://github.com/paulopotter/my-kavita-app-reader/releases/latest)
[![Backend](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpaulopotter%2Fmy-kavita-app-reader%2Fmain%2Fdocs%2Fexternal%2Fversion.json&query=%24.kotlin&label=Backend&color=7F52FF)](https://github.com/paulopotter/my-kavita-app-reader/releases/latest)
[![Frontend](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpaulopotter%2Fmy-kavita-app-reader%2Fmain%2Fdocs%2Fexternal%2Fversion.json&query=%24.rn&label=Frontend&color=61DAFB)](https://github.com/paulopotter/my-kavita-app-reader/releases/latest)
[![Kotlin coverage](https://img.shields.io/badge/Kotlin%20coverage-26%25%20lines-7F52FF)](#)
[![JS coverage](https://img.shields.io/badge/JS%20coverage-12.93%25%20stmts-61DAFB)](#)

> 🇬🇧 [English version](README.en.md)

App Android para ler mangás e webtoons dos seus próprios servidores caseiros -
hoje via [Kavita](https://www.kavitareader.com/), com espaço para outros
(veja [plugins](#plugins)).

![Biblioteca, série, busca, notificações e ajustes](docs/external/screenshots/hero_preview.png)

## Por que este app

**A maior parte das novidades chega sozinha.** Telas novas, ajustes de layout,
correções no que você vê - tudo isso é aplicado sem você precisar instalar
nada, e você escolhe o quanto quer ser avisado
([como funciona](#política-de-atualizações)).

**Um servidor, vários endereços.** Cadastre o IP de casa e o domínio de fora
com prioridades; o app testa e usa o que responder. Sair de casa no meio de um
capítulo não quebra a leitura.

**Avisos de capítulo novo** das séries que você segue, com o histórico das
notificações guardado dentro do próprio app
([o que é preciso](#funcionalidades)).

**Dados extras sobre suas séries**, como status de publicação e quantos
capítulos já estão baixados, vindos de um servidor seu ligado ao app
([o que é preciso](#funcionalidades)).

**Links abrem no app.** Uma notificação leva direto à série, e os endereços do
seu próprio servidor também podem abrir aqui em vez do navegador
([o que é preciso](#abrir-links-do-servidor-no-app)).

## Como instalar

O app não está em nenhuma loja - o arquivo de instalação sai direto daqui:

1. Abra a [última versão publicada](https://github.com/paulopotter/my-kavita-app-reader/releases/latest)
2. Baixe o arquivo `.apk`
3. No Android, autorize seu navegador a instalar apps de fora da loja - o
   próprio sistema oferece isso quando você abre o arquivo, ou em
   *Ajustes → Apps → Acesso especial → Instalar apps desconhecidos*
4. Abra o arquivo baixado e confirme a instalação

Na primeira vez o app pede o endereço do seu servidor Kavita e uma chave de
API - que você gera no próprio Kavita, em *Configurações → API Key*.

## Nas telas

Na **biblioteca**, suas séries aparecem em grade ou lista, começando pelas
atualizadas mais recentemente - ou em ordem alfabética, com um índice lateral
para pular direto à letra. Marcar uma série como favorita cria a aba
**Seguindo**, que some sozinha se você não seguir nenhuma.

Ao abrir uma **série**, você tem a sinopse, as tags e a lista de capítulos com
o progresso de cada um - dá para retomar de onde parou com um toque, ou marcar
vários capítulos como lidos de uma vez.

A **busca** acha sua série pelo nome e guarda as últimas que você abriu por
ali, para voltar rápido.

Maratone sem pausa: no **leitor**, a rolagem é vertical e infinita - acabou um
capítulo, o próximo já começa, sem menu no caminho e sem perder de onde você
parou.

E o app é seu: em **ajustes** você conecta seus servidores e deixa o resto do
seu jeito - a tela que não apaga no meio do capítulo, a ordem em que os
capítulos aparecem, como os avisos chegam e o idioma (português e inglês).

**Doze temas**, todos escuros, com a cor trocando na hora - sem reiniciar o
app. Quatro deles têm uma versão **OLED**, de fundo preto de verdade: no
celular com tela OLED o pixel preto fica apagado, o que dá contraste total e
gasta menos bateria. Todos passam no contraste mínimo de leitura
([AAA da WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced)).

![Os doze temas](docs/external/screenshots/themes.png)

> Cada tema de perto: [veja a pasta](docs/external/screenshots/themes/).

> As telas do app: splash, boas-vindas, biblioteca, seguindo, série, leitor,
> busca, notificações e as páginas de ajustes.
> [Veja todas](docs/external/screenshots/grid_preview.png).

## Funcionalidades

Tudo o que não está listado abaixo funciona assim que você instala o app.

- **⚙️ Precisa de um servidor seu** - o app já vem pronto; é só apontar para
  um servidor que forneça os dados.
  - [Notificações de novos capítulos](#notificações-de-novos-capítulos) -
    avisos das séries seguidas, com histórico dentro do app
  - [Metadados externos](#metadados-externos) - status de publicação e quantos
    capítulos já estão baixados

- **🔧 Você mesmo precisa gerar o app** - depende de informações suas, que só
  entram na hora de montá-lo. A versão publicada aqui não as tem, então você
  baixa o projeto, preenche o que falta e gera o app na sua máquina
  ([como fazer](#como-gerar-o-app-você-mesmo)).
  - [Abrir links do seu servidor no app](#abrir-links-do-servidor-no-app) -
    links `http(s)` do seu Kavita abrindo no app; o atalho `mymangareader://`
    já funciona sem isso

- **📋 Planejado** - ainda não existe.
  - **Outros modos de leitura** - hoje só rolagem contínua; faltam paginada,
    horizontal e zoom
  - **Home** - página inicial reunindo o que é relevante no momento
  - **Múltiplos servidores ao mesmo tempo** - hoje um grupo de servidores
    ativo por vez

### Notificações de novos capítulos

Os avisos chegam pelo [ntfy](https://ntfy.sh/), um serviço de notificações que
você pode hospedar em casa ou usar na versão pública. O app acompanha um canal
seu e mostra os avisos das séries que você segue, com histórico próprio, tempo
de retenção ajustável e agrupamento de capítulos da mesma série.

O endereço do canal você cadastra dentro do próprio app, em ajustes - sem
precisar gerar nada. Enquanto não houver um configurado, a aba de notificações
fica fora do caminho.

### Metadados externos

O app pode consultar um segundo servidor (seu, não um serviço público) para
enriquecer as séries com status de publicação, contagem de capítulos baixados
e sinalização de erros. É opcional: sem ele, tudo funciona com o que o Kavita
já fornece.

Esse endereço você configura dentro do próprio app, sem precisar montá-lo de
novo. Do outro lado, o servidor só precisa devolver a lista de mangás com esses
campos - a implementação de referência está em
`android/external-metadata-server/`.

### Abrir links do servidor no app

O app já responde a endereços `mymangareader://` em qualquer versão, inclusive
a publicada aqui. É o que faz uma notificação abrir direto na série certa, e
serve para atalhos que você mesmo montar.

O que precisa de build é o endereço **real** do seu servidor: clicar num link
`http(s)` do seu Kavita e ele abrir no app em vez do navegador. O Android exige
que esses endereços estejam declarados dentro do app no momento em que ele é
montado, e eles são seus. Por isso a versão publicada aqui não os tem: preencha
`DEEPLINK_HOSTS` no arquivo `.env` e gere o app você mesmo
([como fazer](#como-gerar-o-app-você-mesmo)).

### Plugins

Cada conexão com o mundo externo é chamada de **plugin**:

| Ponto de extensão | Hoje |
|---|---|
| Servidor de conteúdo | Kavita |
| Provedor de notificações | ntfy |
| Metadados externos | um servidor próprio |

Nada no resto do app conhece o nome do provedor - quem sabe o que é "Kavita" é
só a pasta do plugin. Logo, o app pode se adaptar ao que você usa: é só
adicionar um plugin novo, sem mexer no que já existe. Veja o
[guia de contribuição](CONTRIBUTING.md) para escrever o seu.

## Política de atualizações

Parte delas chega por **OTA** (*over-the-air*, ou seja, pela rede, sem passar
por uma instalação). O app tem duas partes que se atualizam de formas
diferentes: a **visual** (as telas, o layout, o que você vê e toca) chega pela
rede, sozinha, sem reinstalar nada; a **estrutural**, o que roda por baixo, vem
numa instalação nova.

Cada atualização visual carrega o aviso que merece, e algumas dependem de você
ter instalado a parte estrutural mais nova:

| | O que acontece |
|---|---|
| Silenciosa | Só a parte visual muda; aplica em segundo plano, sem avisar |
| Recomendada | Há uma versão estrutural nova, mas o app segue funcionando sem ela - o aviso pode esperar |
| Muito recomendada | Você continua usando o app, mas não recebe mais atualizações visuais enquanto não instalar a nova versão |
| Obrigatória | O app não abre até você instalar a nova versão |

## Como gerar o app você mesmo

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

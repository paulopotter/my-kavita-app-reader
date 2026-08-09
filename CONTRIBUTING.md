# Como Contribuir

> 🇬🇧 [English version](CONTRIBUTING.en.md)

Obrigado pelo interesse em contribuir com o **mymangareader**!

## Antes de começar

Leia o [Acordo de Licença de Contribuidor (CLA)](CLA.md). Ao abrir um Pull
Request, um bot vai pedir sua confirmação de aceite — é um passo único por
conta do GitHub.

## Guias detalhados

Toda a documentação de contribuição fica em [`docs/contributing/`](docs/contributing/):

- Configuração do ambiente de desenvolvimento
- Padrões de código (Kotlin e TypeScript)
- Fluxo de branches e convenções de commit
- Como rodar testes
- Como adicionar um plugin

## Fluxo de contribuição

1. Abra uma *issue* descrevendo o que você quer implementar ou corrigir.
2. Aguarde a discussão antes de começar — evita retrabalho.
3. Faça um fork, crie um branch descritivo (`feat/123-descricao` ou
   `fix/123-descricao`) e abra um Pull Request contra `main`.
4. Preencha o template do PR, incluindo a seção de changelog.
5. Todos os checks de CI devem passar e um maintainer deve aprovar antes do
   merge.

## Reportando bugs

Use a *issue template* de bug. Inclua versão do app, versão do APK, e
passos mínimos para reproduzir.

## Sugerindo features

Use a *issue template* de feature request. Explique o problema que a feature
resolve, não apenas o que você quer implementar.

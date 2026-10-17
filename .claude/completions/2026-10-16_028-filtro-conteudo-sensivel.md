---
task: 028 - filtro-conteudo-sensivel
plan: backlog
date: 2026-10-16
status: done
---

# 028 - Filtro de conteúdo sensível

## O que foi entregue

Filtro aplicado só na renderização (`AdultFilterTool` puro + `useAdultFiltered`), valendo na Biblioteca,
Seguindo, Busca, trilhos e estatísticas da Home e histórico de notificações. No Kotlin, o `ServerPlugin`
ganhou o grupo opcional `categories` (`list()` e `serialIds(names)`); o plugin Kavita resolve nome em id e
filtra o `all-v2` por gêneros e tags, e só nomes e ids de obras cruzam a fronteira. No RN, `CategoriesService`,
`AdultFilterPrefs` e o `AdultFilterProvider` (escolhas + última classificação persistida para o primeiro paint
já filtrado). Em Ajustes ("Conteúdo sensível"): categorias como chips que se movem para a caixa do filtro,
um interruptor ocultar/exibir desfocado, remover o desfoque e um botão de modo "só este conteúdo" que não é salvo.

## Como foi testado

- `make coverage`: Jest 1658 testes passando e Kotlin verde. Dois testes Kotlin de módulos antigos
  (`:external-metadata-server`, `:features`) falharam uma vez sob carga e passaram isolados.
- Smoke test contra o servidor Kavita real, só leitura, pelo plugin: 64 categorias, 10 obras para
  Hentai/Ecchi/Erotica/Gore, nome inexistente devolve vazio.
- Teste no aparelho pelo usuário: "funcionou"; os ajustes finais (chips, nome, interruptor) foram pedidos
  e implementados na sequência.

## Aprovação

O contrato foi aprovado por escrito antes do código; o usuário pediu os três ajustes de UX durante o teste
e, ao final, pediu o commit e o fechamento da task.

## Notas

- A consulta filtrada do `all-v2` usa o id numérico da categoria (um nome dá HTTP 500); a tabela nome→id
  vive na instância do plugin.
- Fora do filtro: o texto das notificações do sistema e o contador global de não lidas.
- Próximos critérios, que alimentariam o mesmo conjunto de ids: faixa etária do Kavita e flag do servidor de
  enriquecimento. Categorias por obra (OPDS `/libraries/{id}`) só se surgir um uso.
- O botão "Mostrar só este conteúdo" fica na tela do filtro por enquanto; o usuário vai decidir um lugar melhor.

# Backlog 026 — Modos de leitura (paginada, horizontal)

## What
Implementar os dois modos de leitura que hoje existem só como stub —
`horizontal` e `paginated`. Rolagem contínua (`webtoon`) é o único modo real hoje.

> O zoom dentro da página saiu deste item e virou o plano 029
> ([Zoom no leitor](../../active/029-zoom-no-leitor/README.md)), que cobre só o modo
> webtoon. Quando estes modos forem feitos, decidir como o zoom se aplica a cada um.

## Why
Rolagem contínua é o formato certo para webtoon, e errado para mangá
tradicional: uma página por vez, virada com toque ou swipe, é como o formato
foi desenhado para ser lido. Sem isso o app atende metade do acervo.

## Estado atual
A estrutura já está pronta e o contrato já foi desenhado para isto
(`frontend/src/screens/reader/modes/`):

- `ReadingMode = 'webtoon' | 'horizontal' | 'paginated'` já declarado em
  `reading-mode.types.ts`
- `ReaderModeAdapter<T>` já define o contrato: `toRenderModel` (ReaderWindow →
  o que a UI daquele modo consome) e `interpretPositionReport` (o report cru
  daquele modo → `FocusMoveTrigger` genérico)
- `horizontal.adapter.ts` e `paginated.adapter.ts` existem como stubs
- `ReadingModeTool` já resolve o modo efetivo com a sobreposição em camadas
  (sessão > por série > global), via `:preferences`

Ou seja: `ReaderWindow`, `moveFocus` e o reducer **não mudam**. Acrescentar um
modo é um adapter + a view daquele modo.

## Scope (when planned)
- `paginated`: uma página por vez, avanço por toque nas bordas e por swipe;
  `interpretPositionReport` traduz o swipe discreto em `FocusMoveTrigger`
- `horizontal`: rolagem lateral contínua, incluindo a direção direita→esquerda
  que mangá japonês usa
- Zoom: fora do escopo, tratado no plano 029 (só webtoon)
- Seletor de modo na UI do leitor + a preferência por série já suportada
- A view nativa (`ReaderPageList.kt`) hoje é um `LazyColumn` vertical; os dois
  modos novos precisam da sua própria view ou de um parâmetro de orientação —
  decidir qual na hora, sem vazar decisão de negócio para o Kotlin (a regra da
  exceção de renderização nativa vale: RN decide, Kotlin desenha)

## Dependencies
- Nenhuma externa. O contrato de `ReaderWindow` / `moveFocus` (Task 037) é
  pré-requisito e já está pronto.

## Notes
Substitui os dois itens soltos do backlog 007 ("Horizontal/vertical scroll
modes" e "Double-tap to zoom"), que ficaram para trás quando o resto daquele
item foi entregue.

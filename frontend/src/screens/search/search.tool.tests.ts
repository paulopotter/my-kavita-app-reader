import { SearchTool } from './search.tool';
import type { SerialCard } from '../../shared/tools/serials';

function card(over: Partial<SerialCard> = {}): SerialCard {
  return {
    id: 's1',
    name: 'One Piece',
    coverUrl: 'c1',
    progressFraction: 0,
    progressLabel: '0%',
    readStatus: 'UNREAD',
    readStatusLabel: 'Não lido',
    isFollowed: false,
    ...over,
  };
}

const cards = [
  card({ id: 'a', name: 'One Piece' }),
  card({ id: 'b', name: 'Attack on Titan' }),
  card({ id: 'c', name: 'Ação Sem Fim' }),
  card({ id: 'd', name: 'Jujutsu Kaisen' }),
];

describe('SearchTool.filter', () => {
  it('matches a substring anywhere in the name', () => {
    expect(SearchTool.filter({ cards, query: 'piece' }).map(c => c.id)).toEqual(['a']);
    expect(SearchTool.filter({ cards, query: 'on' }).map(c => c.id)).toEqual(['a', 'b']);
  });

  it('ignores case', () => {
    expect(SearchTool.filter({ cards, query: 'ATTACK' }).map(c => c.id)).toEqual(['b']);
  });

  it('ignores accents on both sides of the comparison', () => {
    expect(SearchTool.filter({ cards, query: 'acao' }).map(c => c.id)).toEqual(['c']);
    expect(SearchTool.filter({ cards, query: 'AÇÃO' }).map(c => c.id)).toEqual(['c']);
  });

  it('a blank query matches NOTHING, not everything', () => {
    expect(SearchTool.filter({ cards, query: '' })).toEqual([]);
    expect(SearchTool.filter({ cards, query: '   ' })).toEqual([]);
  });

  it('no match is an empty list', () => {
    expect(SearchTool.filter({ cards, query: 'berserk' })).toEqual([]);
  });

  it('preserves the incoming order', () => {
    expect(SearchTool.filter({ cards, query: 'a' }).map(c => c.id)).toEqual(['b', 'c', 'd']);
  });

  it('an empty catalogue is an empty result', () => {
    expect(SearchTool.filter({ cards: [], query: 'anything' })).toEqual([]);
  });

  it('matches only the name — an id that looks like the query is not a hit', () => {
    expect(SearchTool.filter({ cards: [card({ id: 'berserk', name: 'Vinland Saga' })], query: 'berserk' })).toEqual([]);
  });
});

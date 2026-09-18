import { StringTool } from '../../shared/tools/string';
import type { SerialCard } from '../../shared/tools/serials';

// SearchTool — the screen-local matching rule. Pure: it takes the rows the hook already has and
// returns the subset that matches, never fetching anything.
//
// Matching is in-memory over the already-synced list, not a server query (backlog 009 decision):
// the list the Library assembles is the same one Search filters, so a result appears the instant
// it's typed with no round trip. The known limit of that choice: a series the listing hasn't
// synced is invisible here. Moving to a server-side search is its own backlog item.

export const SearchTool = {
  // Substring match on the name, accent- and case-insensitive (StringTool.normalize.NFD folds
  // both sides). Only `name` is matched — deliberately, so a hit is always explainable by what
  // the user can see on the row. A blank query matches nothing (the screen shows history
  // instead), never everything.
  filter({ cards, query }: { cards: SerialCard[]; query: string }): SerialCard[] {
    const needle = StringTool.normalize.NFD(query);
    if (needle.length === 0) {
      return [];
    }
    return cards.filter(card => StringTool.normalize.NFD(card.name).includes(needle));
  },
};

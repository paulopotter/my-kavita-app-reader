import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));

const mockToggleFollow = jest.fn();
jest.mock('../../shared/tools/serials', () => {
  const actual = jest.requireActual('../../shared/tools/serials');
  return { ...actual, SerieTool: { ...actual.SerieTool, toggleFollow: (...a: unknown[]) => mockToggleFollow(...a) } };
});

jest.mock('../../shared/i18n', () => ({
  useStrings: () => require('../../shared/i18n/strings').getStrings('pt-BR'),
}));

// The screen renders whatever the hook hands it; the hook has its own suite.
const mockHookState = {
  query: '',
  setQuery: jest.fn(),
  results: [] as any[],
  history: [] as any[],
  loading: false,
  error: null as string | null,
  reload: jest.fn(),
  recordOpened: jest.fn(),
  pendingDelete: null as any,
  requestDelete: jest.fn(),
  cancelDelete: jest.fn(),
  confirmDelete: jest.fn(),
};
jest.mock('./hooks', () => ({ useSearch: () => mockHookState }));

import { SearchScreen } from './search.screen';
import { FollowStar } from '../../shared/components/follow-star';
import { getStrings } from '../../shared/i18n/strings';

const t = getStrings('pt-BR');

function card(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    name: 'One Piece',
    coverUrl: 'c1',
    progressFraction: 0.5,
    progressLabel: '50%',
    readStatus: 'IN_PROGRESS',
    readStatusLabel: 'Lendo',
    isFollowed: false,
    ...over,
  };
}

function historyItem(over: Record<string, unknown> = {}) {
  return { seriesId: 'h1', name: 'Hist One', coverUrl: 'ch1', openedAtEpochMs: 1_000, isFollowed: false, ...over };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockHookState, {
    query: '',
    results: [],
    history: [],
    loading: false,
    error: null,
    pendingDelete: null,
  });
});

describe('SearchScreen — empty query', () => {
  it('shows the hint when there is no history', () => {
    const { getByText } = render(<SearchScreen />);
    expect(getByText(t.searchEmptyHint)).toBeTruthy();
  });

  it('shows the history when there is one', () => {
    mockHookState.history = [historyItem()];
    const { getByText } = render(<SearchScreen />);
    expect(getByText(t.searchRecentTitle)).toBeTruthy();
    expect(getByText('Hist One')).toBeTruthy();
  });

  it('tapping a history row records it and navigates with origin SEARCH', () => {
    mockHookState.history = [historyItem()];
    const { getByText } = render(<SearchScreen />);
    fireEvent.press(getByText('Hist One'));
    expect(mockHookState.recordOpened).toHaveBeenCalledWith({ seriesId: 'h1' });
    expect(mockNavigate).toHaveBeenCalledWith('series/:seriesId', { seriesId: 'h1', origin: 'SEARCH' });
  });

  // Regression: the history row used to hardcode isFollowed={false}, so a followed series read
  // as unfollowed the moment the query was cleared. FollowStar is what actually renders the
  // state, so assert on the prop it receives.
  it.each([true, false])('a history row passes isFollowed=%s down to the star', followed => {
    mockHookState.history = [historyItem({ isFollowed: followed })];
    const { UNSAFE_getByType } = render(<SearchScreen />);
    expect(UNSAFE_getByType(FollowStar).props.active).toBe(followed);
  });

  it('the delete button asks the hook to confirm first', () => {
    mockHookState.history = [historyItem()];
    const { getByLabelText } = render(<SearchScreen />);
    fireEvent.press(getByLabelText(t.searchRecentDelete));
    expect(mockHookState.requestDelete).toHaveBeenCalledWith({ seriesId: 'h1' });
  });
});

describe('SearchScreen — searching', () => {
  it('renders the results', () => {
    mockHookState.query = 'piece';
    mockHookState.results = [card()];
    const { getByText } = render(<SearchScreen />);
    expect(getByText('One Piece')).toBeTruthy();
  });

  it('tapping a result records it and navigates with origin SEARCH', () => {
    mockHookState.query = 'piece';
    mockHookState.results = [card()];
    const { getByText } = render(<SearchScreen />);
    fireEvent.press(getByText('One Piece'));
    expect(mockHookState.recordOpened).toHaveBeenCalledWith({ seriesId: 's1' });
    expect(mockNavigate).toHaveBeenCalledWith('series/:seriesId', { seriesId: 's1', origin: 'SEARCH' });
  });

  it('shows how many results matched', () => {
    mockHookState.query = 'a';
    mockHookState.results = [card({ id: 'a' }), card({ id: 'b', name: 'Two' }), card({ id: 'c', name: 'Three' })];
    const { getByText } = render(<SearchScreen />);
    expect(getByText('3 resultados')).toBeTruthy();
  });

  it('uses the singular wording for a single result', () => {
    mockHookState.query = 'piece';
    mockHookState.results = [card()];
    const { getByText } = render(<SearchScreen />);
    expect(getByText('1 resultado')).toBeTruthy();
  });

  it('shows no count when nothing matched (the empty message says it)', () => {
    mockHookState.query = 'nothing';
    mockHookState.results = [];
    const { queryByText } = render(<SearchScreen />);
    expect(queryByText('0 resultados')).toBeNull();
  });

  it('shows the empty-results message', () => {
    mockHookState.query = 'nothing';
    mockHookState.results = [];
    const { getByText } = render(<SearchScreen />);
    expect(getByText(t.searchNoResults)).toBeTruthy();
  });

  it('shows the spinner while the catalogue loads', () => {
    mockHookState.query = 'piece';
    mockHookState.loading = true;
    const { getByText } = render(<SearchScreen />);
    expect(getByText(t.searchLoading)).toBeTruthy();
  });

  it('shows the error with a retry that calls reload', () => {
    mockHookState.query = 'piece';
    mockHookState.error = 'offline';
    const { getByText } = render(<SearchScreen />);
    expect(getByText(t.searchError)).toBeTruthy();
    fireEvent.press(getByText(t.searchRetry));
    expect(mockHookState.reload).toHaveBeenCalled();
  });

  it('a load error does NOT hide the history — it is stored locally and still usable', () => {
    mockHookState.error = 'offline';
    mockHookState.history = [historyItem()];
    const { getByText, queryByText } = render(<SearchScreen />);
    expect(getByText('Hist One')).toBeTruthy();
    expect(queryByText(t.searchError)).toBeNull();
  });

  it('follow toggles go through the serials domain', () => {
    mockHookState.query = 'piece';
    mockHookState.results = [card()];
    const { UNSAFE_getAllByType } = render(<SearchScreen />);
    // The star is the only other pressable on the row; find it by walking the rendered tree.
    const { TouchableOpacity } = require('react-native');
    const pressables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(pressables[pressables.length - 1]);
    expect(mockToggleFollow).toHaveBeenCalledWith({ seriesId: 's1' });
  });
});

describe('SearchScreen — delete dialog', () => {
  it('is hidden while nothing is pending', () => {
    const { queryByText } = render(<SearchScreen />);
    expect(queryByText(t.searchRecentDeleteConfirm)).toBeNull();
  });

  it('shows the confirmation and wires both buttons', () => {
    mockHookState.history = [historyItem()];
    mockHookState.pendingDelete = historyItem();
    const { getByText } = render(<SearchScreen />);
    expect(getByText(t.searchRecentDeleteConfirm)).toBeTruthy();
    fireEvent.press(getByText(t.searchDeleteConfirm));
    expect(mockHookState.confirmDelete).toHaveBeenCalled();
    fireEvent.press(getByText(t.searchDeleteCancel));
    expect(mockHookState.cancelDelete).toHaveBeenCalled();
  });
});

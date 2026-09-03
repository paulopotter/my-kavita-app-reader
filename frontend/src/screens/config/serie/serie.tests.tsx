import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
}));

const mockSortGet = jest.fn();
const mockSortPut = jest.fn();
jest.mock('../../../shared/tools/chapters', () => {
  const actual = jest.requireActual('../../../shared/tools/chapters');
  return {
    ...actual,
    ChaptersTool: { sort: { get: (...a: unknown[]) => mockSortGet(...a), put: (...a: unknown[]) => mockSortPut(...a) } },
  };
});

import { getStrings } from '../../../shared/i18n/strings';
import { useSerieSort } from './serie.hooks';
import { SerieSortScreen } from './serie.screen';

const t = getStrings('en');
const PREFS = { mode: 'AUTO_FIXED' as const, fixedThreshold: 100, progressPercent: 70 };

beforeEach(() => {
  jest.clearAllMocks();
  mockSortGet.mockResolvedValue(PREFS);
  mockSortPut.mockResolvedValue(undefined);
});

describe('useSerieSort', () => {
  it('loads the global sort prefs and clears loading', async () => {
    const { result } = renderHook(() => useSerieSort());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockSortGet).toHaveBeenCalledWith({ domain: 'global' });
    expect(result.current.mode).toBe('AUTO_FIXED');
    expect(result.current.fixedThreshold).toBe(100);
    expect(result.current.progressPercent).toBe(70);
  });

  it('change() updates local state and persists under the global scope', async () => {
    const { result } = renderHook(() => useSerieSort());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.change('ASCENDING', undefined, 50));

    expect(result.current.mode).toBe('ASCENDING');
    expect(result.current.fixedThreshold).toBeUndefined();
    expect(mockSortPut).toHaveBeenCalledWith(
      { domain: 'global' },
      { mode: 'ASCENDING', fixedThreshold: undefined, progressPercent: 50 },
    );
  });
});

describe('SerieSortScreen', () => {
  it('renders the group title after loading', async () => {
    const { getByText } = render(<SerieSortScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByText(t.configChapterSortGroupTitle)).toBeTruthy());
  });

  it('the back chevron calls onBack', async () => {
    const onBack = jest.fn();
    const { getByText } = render(<SerieSortScreen onBack={onBack} />);
    await waitFor(() => expect(getByText(t.configChapterSortGroupTitle)).toBeTruthy());
    fireEvent.press(getByText('‹'));
    expect(onBack).toHaveBeenCalled();
  });
});

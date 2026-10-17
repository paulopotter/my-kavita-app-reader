import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
}));
jest.mock('../../../shared/managers/preferences', () => ({
  PreferencesManager: { get: jest.fn().mockResolvedValue(null), put: jest.fn().mockResolvedValue({}) },
}));

const mockFilter = {
  categories: ['Gore'] as string[],
  mode: 'hidden' as string,
  unblur: false,
  only: false,
  setOnly: jest.fn(),
  setCategories: jest.fn(),
  setMode: jest.fn(),
  setUnblur: jest.fn(),
};
jest.mock('../../../shared/context/adult-filter', () => ({ useAdultFilter: () => mockFilter }));

const mockList = jest.fn();
jest.mock('../../../shared/services/categories', () => ({
  CategoriesService: { list: (...a: unknown[]) => mockList(...a) },
}));

import { getStrings } from '../../../shared/i18n/strings';
import { ThemeProvider } from '../../../shared/context';
import { useAdultFilterConfig } from './adult.hooks';
import { AdultFilterScreen } from './adult.screen';

const t = getStrings('en');

beforeEach(() => {
  jest.clearAllMocks();
  mockFilter.categories = ['Gore'];
  mockFilter.mode = 'hidden';
  mockFilter.unblur = false;
  mockFilter.only = false;
  mockList.mockResolvedValue(['Ecchi', 'Gore', 'Hentai']);
});

describe('useAdultFilterConfig', () => {
  it('loads the provider categories and reports ready', async () => {
    const { result } = renderHook(() => useAdultFilterConfig());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.available).toEqual(['Ecchi', 'Gore', 'Hentai']);
    expect(result.current.selected).toEqual(['Gore']);
  });

  it('reports an error when the categories cannot be loaded', async () => {
    mockList.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAdultFilterConfig());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('addCategory adds a missing name once and removeCategory takes one out', async () => {
    const { result } = renderHook(() => useAdultFilterConfig());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.addCategory('Hentai'));
    expect(mockFilter.setCategories).toHaveBeenLastCalledWith(['Gore', 'Hentai']);
    mockFilter.setCategories.mockClear();
    act(() => result.current.addCategory('Gore')); // already in: nothing to do
    expect(mockFilter.setCategories).not.toHaveBeenCalled();
    act(() => result.current.removeCategory('Gore'));
    expect(mockFilter.setCategories).toHaveBeenLastCalledWith([]);
  });

  it('only the blur mode has a blur to remove', async () => {
    expect(renderHook(() => useAdultFilterConfig()).result.current.showsBlurred).toBe(false);
    mockFilter.mode = 'blur';
    expect(renderHook(() => useAdultFilterConfig()).result.current.showsBlurred).toBe(true);
    mockFilter.mode = 'normal';
    expect(renderHook(() => useAdultFilterConfig()).result.current.showsBlurred).toBe(false);
    await act(async () => {});
  });

  it('ignores the categories answer once unmounted', async () => {
    let resolve: (v: string[]) => void = () => {};
    mockList.mockImplementation(() => new Promise<string[]>(r => (resolve = r)));
    const { unmount } = renderHook(() => useAdultFilterConfig());
    unmount();
    await act(async () => resolve(['x']));
  });
});

function renderScreen() {
  return render(
    <ThemeProvider>
      <AdultFilterScreen onBack={jest.fn()} />
    </ThemeProvider>,
  );
}

describe('AdultFilterScreen', () => {
  it('shows the chosen categories in the box and the rest as chips to add', async () => {
    const { findByLabelText, findByText, queryByLabelText } = renderScreen();
    expect(await findByLabelText(t.adultCategoriesRemove.replace('{0}', 'Gore'))).toBeTruthy(); // in the filter
    expect(await findByText('Hentai')).toBeTruthy(); // available
    expect(queryByLabelText('Gore')).toBeNull(); // no longer offered as an addable chip
  });

  it('adds a category by tapping its chip and removes one by tapping it in the box', async () => {
    const { findByText, findByLabelText } = renderScreen();
    fireEvent.press(await findByText('Hentai'));
    expect(mockFilter.setCategories).toHaveBeenCalledWith(['Gore', 'Hentai']);
    fireEvent.press(await findByLabelText(t.adultCategoriesRemove.replace('{0}', 'Gore')));
    expect(mockFilter.setCategories).toHaveBeenCalledWith([]);
  });

  it('says there is nothing in the filter yet', async () => {
    mockFilter.categories = [];
    const { findByText } = renderScreen();
    expect(await findByText(t.adultCategoriesNoneSelected)).toBeTruthy();
  });

  it('shows the remove-blur option only in the blur mode', async () => {
    const hidden = renderScreen();
    await hidden.findByText('Hentai');
    expect(hidden.queryByText(t.adultUnblur)).toBeNull();
    hidden.unmount();

    mockFilter.mode = 'blur';
    const blur = renderScreen();
    fireEvent.press(await blur.findByText(t.adultUnblur));
    expect(mockFilter.setUnblur).toHaveBeenCalledWith(true);
  });

  it('the button flips the session-only inverted view on, and back off', async () => {
    const off = renderScreen();
    fireEvent.press(await off.findByText(t.adultOnlyButton));
    expect(mockFilter.setOnly).toHaveBeenCalledWith(true);
    expect(await off.findByText(t.adultOnlyHint)).toBeTruthy();
    off.unmount();

    mockFilter.only = true;
    const on = renderScreen();
    fireEvent.press(await on.findByText(t.adultOnlyButtonOff));
    expect(mockFilter.setOnly).toHaveBeenCalledWith(false);
  });

  it('says so when the server offers no categories, and when loading them fails', async () => {
    mockList.mockResolvedValue([]);
    const empty = renderScreen();
    expect(await empty.findByText(t.adultCategoriesEmpty)).toBeTruthy();
    empty.unmount();

    mockList.mockRejectedValue(new Error('offline'));
    const failed = renderScreen();
    expect(await failed.findByText(t.adultCategoriesError)).toBeTruthy();
  });

  it('changes the mode through the select', async () => {
    const { findByText } = renderScreen();
    fireEvent.press(await findByText(t.adultModeHidden));
    fireEvent.press(await findByText(t.adultModeBlur));
    expect(mockFilter.setMode).toHaveBeenCalledWith('blur');
  });
});

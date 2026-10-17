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

  it('toggleCategory adds a missing name and removes a present one', async () => {
    const { result } = renderHook(() => useAdultFilterConfig());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.toggleCategory('Hentai'));
    expect(mockFilter.setCategories).toHaveBeenLastCalledWith(['Gore', 'Hentai']);
    act(() => result.current.toggleCategory('Gore'));
    expect(mockFilter.setCategories).toHaveBeenLastCalledWith([]);
  });

  it('only the modes that show adult items have a blur to remove', async () => {
    const hidden = renderHook(() => useAdultFilterConfig());
    expect(hidden.result.current.showsAdult).toBe(false);
    mockFilter.mode = 'blur';
    expect(renderHook(() => useAdultFilterConfig()).result.current.showsAdult).toBe(true);
    mockFilter.mode = 'adultOnly';
    expect(renderHook(() => useAdultFilterConfig()).result.current.showsAdult).toBe(true);
    mockFilter.mode = 'normal';
    expect(renderHook(() => useAdultFilterConfig()).result.current.showsAdult).toBe(false);
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
  it('lists the categories with the selected ones on', async () => {
    const { findByText, getAllByRole } = renderScreen();
    expect(await findByText('Hentai')).toBeTruthy();
    expect(await findByText('Gore')).toBeTruthy();
    expect(getAllByRole('switch').length).toBeGreaterThanOrEqual(3);
  });

  it('toggles a category by tapping its row', async () => {
    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Hentai'));
    expect(mockFilter.setCategories).toHaveBeenCalledWith(['Gore', 'Hentai']);
  });

  it('shows the remove-blur option only in a mode that shows adult items', async () => {
    const hidden = renderScreen();
    await hidden.findByText('Hentai');
    expect(hidden.queryByText(t.adultUnblur)).toBeNull();
    hidden.unmount();

    mockFilter.mode = 'blur';
    const blur = renderScreen();
    fireEvent.press(await blur.findByText(t.adultUnblur));
    expect(mockFilter.setUnblur).toHaveBeenCalledWith(true);
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

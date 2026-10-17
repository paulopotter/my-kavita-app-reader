import React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';

const mockPrefs = {
  getCategories: jest.fn(),
  getMode: jest.fn(),
  getUnblur: jest.fn(),
  getClassification: jest.fn(),
  setCategories: jest.fn(),
  setMode: jest.fn(),
  setUnblur: jest.fn(),
  setClassification: jest.fn(),
};
// Resolved lazily: the import below runs before the const above is initialised.
jest.mock('../../tools/adult-filter/adult-filter-prefs.tool', () => ({
  AdultFilterPrefs: new Proxy(
    {},
    { get: (_t, key: string) => (...a: unknown[]) => (mockPrefs as Record<string, jest.Mock>)[key](...a) },
  ),
}));

const mockSerialsGet = jest.fn();
jest.mock('../../services/serials', () => ({ SerialsService: { get: (...a: unknown[]) => mockSerialsGet(...a) } }));
const mockIds = jest.fn();
jest.mock('../../services/categories', () => ({
  CategoriesService: { serials: { ids: (...a: unknown[]) => mockIds(...a) } },
}));

import { AdultFilterProvider, useAdultFilter, useAdultFiltered } from './adult-filter.context';

const empty = { adultIds: new Set<string>(), knownIds: new Set<string>() };
const serialsDigest = (ids: string[]) => ({ isSuccess: true, serials: ids.map(id => ({ isSuccess: true, id })) });

function wrapper({ children }: { children: React.ReactNode }) {
  return <AdultFilterProvider>{children}</AdultFilterProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrefs.getCategories.mockResolvedValue([]);
  mockPrefs.getMode.mockResolvedValue('hidden');
  mockPrefs.getUnblur.mockResolvedValue(false);
  mockPrefs.getClassification.mockResolvedValue(empty);
  mockPrefs.getCategories.mockResolvedValue([]);
  mockPrefs.getMode.mockResolvedValue('hidden');
  mockPrefs.getUnblur.mockResolvedValue(false);
  mockPrefs.getClassification.mockResolvedValue(empty);
  mockPrefs.setCategories.mockResolvedValue(undefined);
  mockPrefs.setMode.mockResolvedValue(undefined);
  mockPrefs.setUnblur.mockResolvedValue(undefined);
  mockPrefs.setClassification.mockResolvedValue(undefined);
  mockSerialsGet.mockResolvedValue(serialsDigest(['1', '2', '3']));
  mockIds.mockResolvedValue(['2']);
});

describe('AdultFilterProvider', () => {
  it('renders nothing until the stored values are read, then its children', async () => {
    const { queryByText, findByText } = render(
      <AdultFilterProvider>
        <Text>child</Text>
      </AdultFilterProvider>,
    );
    expect(queryByText('child')).toBeNull();
    expect(await findByText('child')).toBeTruthy();
  });

  it('hydrates choices and the last classification, and re-classifies in the background', async () => {
    mockPrefs.getCategories.mockResolvedValue(['Hentai']);
    mockPrefs.getMode.mockResolvedValue('blur');
    mockPrefs.getUnblur.mockResolvedValue(true);
    mockPrefs.getClassification.mockResolvedValue({ adultIds: new Set(['9']), knownIds: new Set(['9']) });
    const { result } = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(result.current.categories).toEqual(['Hentai']));
    expect(result.current.mode).toBe('blur');
    expect(result.current.unblur).toBe(true);
    await waitFor(() => expect([...result.current.classification.adultIds]).toEqual(['2']));
    expect(mockIds).toHaveBeenCalledWith({ names: ['Hentai'] });
    expect([...result.current.classification.knownIds]).toEqual(['1', '2', '3']);
    expect(mockPrefs.setClassification).toHaveBeenCalled();
  });

  it('asks nothing of the provider while no category is selected', async () => {
    const { result } = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('hidden'));
    await act(async () => {});
    expect(mockIds).not.toHaveBeenCalled();
  });

  it('keeps the last classification when the provider fails', async () => {
    mockPrefs.getCategories.mockResolvedValue(['Hentai']);
    mockPrefs.getClassification.mockResolvedValue({ adultIds: new Set(['9']), knownIds: new Set(['9']) });
    mockIds.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(mockIds).toHaveBeenCalled());
    await act(async () => {});
    expect([...result.current.classification.adultIds]).toEqual(['9']);
  });

  it('does not classify against a failed series list', async () => {
    mockPrefs.getCategories.mockResolvedValue(['Hentai']);
    mockSerialsGet.mockResolvedValue({ isSuccess: false });
    const { result } = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(mockIds).toHaveBeenCalled());
    await act(async () => {});
    expect(mockPrefs.setClassification).not.toHaveBeenCalled();
    expect(result.current.classification.knownIds.size).toBe(0);
  });

  it('setters persist, and changing the selection classifies right away', async () => {
    const { result } = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('hidden'));
    act(() => result.current.setMode('normal'));
    act(() => result.current.setUnblur(true));
    expect(mockPrefs.setMode).toHaveBeenCalledWith('normal');
    expect(mockPrefs.setUnblur).toHaveBeenCalledWith(true);
    act(() => result.current.setCategories(['Gore']));
    expect(mockPrefs.setCategories).toHaveBeenCalledWith(['Gore']);
    await waitFor(() => expect(mockIds).toHaveBeenCalledWith({ names: ['Gore'] }));
    await waitFor(() => expect([...result.current.classification.adultIds]).toEqual(['2']));
  });

  it('clearing the selection empties the classification without a request', async () => {
    mockPrefs.getCategories.mockResolvedValue(['Hentai']);
    const { result } = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect([...result.current.classification.adultIds]).toEqual(['2']));
    mockIds.mockClear();
    act(() => result.current.setCategories([]));
    await waitFor(() => expect(result.current.classification.adultIds.size).toBe(0));
    expect(mockIds).not.toHaveBeenCalled();
  });

  it('drops an answer that belongs to a selection that changed meanwhile', async () => {
    mockPrefs.getCategories.mockResolvedValue(['Old']);
    let release: (ids: string[]) => void = () => {};
    mockIds.mockImplementationOnce(() => new Promise<string[]>(r => (release = r)));
    const { result } = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(mockIds).toHaveBeenCalledWith({ names: ['Old'] }));
    act(() => result.current.setCategories(['New']));
    await act(async () => release(['1']));
    await waitFor(() => expect(mockIds).toHaveBeenCalledWith({ names: ['New'] }));
    await waitFor(() => expect([...result.current.classification.adultIds]).toEqual(['2']));
  });

  it('requestClassification is throttled', async () => {
    mockPrefs.getCategories.mockResolvedValue(['Hentai']);
    const { result } = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(mockIds).toHaveBeenCalledTimes(1));
    await act(async () => {});
    act(() => result.current.requestClassification());
    await act(async () => {});
    expect(mockIds).toHaveBeenCalledTimes(1);
  });
});

describe('useAdultFiltered', () => {
  const items = ['1', '2', '3'].map(id => ({ id }));

  it('filters at read time with the stored classification and asks for one when items are unknown', async () => {
    mockPrefs.getCategories.mockResolvedValue(['Hentai']);
    mockPrefs.getClassification.mockResolvedValue({ adultIds: new Set(['2']), knownIds: new Set(['1', '2']) });
    const { result } = renderHook(() => useAdultFiltered({ items, idOf: i => i.id }), { wrapper });
    // '2' is adult; '3' starts unclassified (hidden), triggers a classification, then is known and shown.
    await waitFor(() => expect(result.current.map(i => i.id)).toEqual(['1', '3']));
    expect(mockIds).toHaveBeenCalled();
  });

  it('shows everything when the feature is off', async () => {
    const { result } = renderHook(() => useAdultFiltered({ items, idOf: i => i.id }), { wrapper });
    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(result.current.every(i => !i.blurred)).toBe(true);
  });
});

describe('AdultFilterProvider — coming back to the app', () => {
  it('re-checks the classification when the app becomes active (throttled)', async () => {
    let onChange: (state: string) => void = () => {};
    const remove = jest.fn();
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, handler: (s: string) => void) => {
      onChange = handler;
      return { remove };
    }) as never);
    mockPrefs.getCategories.mockResolvedValue(['Hentai']);
    const { result, unmount } = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(mockIds).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.categories).toEqual(['Hentai']));

    act(() => onChange('background')); // not active: ignored
    await act(async () => {});
    expect(mockIds).toHaveBeenCalledTimes(1);

    act(() => onChange('active')); // inside the throttle window: still ignored
    await act(async () => {});
    expect(mockIds).toHaveBeenCalledTimes(1);

    unmount();
    expect(remove).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('runs again once the throttle window has passed', async () => {
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'queueMicrotask', 'nextTick'] });
    let onChange: (state: string) => void = () => {};
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, handler: (s: string) => void) => {
      onChange = handler;
      return { remove: jest.fn() };
    }) as never);
    mockPrefs.getCategories.mockResolvedValue(['Hentai']);
    renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(mockIds).toHaveBeenCalledTimes(1));
    jest.setSystemTime(Date.now() + 60_000);
    act(() => onChange('active'));
    await waitFor(() => expect(mockIds).toHaveBeenCalledTimes(2));
    spy.mockRestore();
    jest.useRealTimers();
  });
});

describe('AdultFilterProvider — the inverted view', () => {
  it('starts off, can be switched on, is never stored and is off again on the next launch', async () => {
    const first = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(first.result.current.mode).toBe('hidden'));
    expect(first.result.current.only).toBe(false);
    act(() => first.result.current.setOnly(true));
    expect(first.result.current.only).toBe(true);
    Object.values(mockPrefs).forEach(fn => expect(fn).not.toHaveBeenCalledWith(true, expect.anything()));
    first.unmount();

    const next = renderHook(() => useAdultFilter(), { wrapper });
    await waitFor(() => expect(next.result.current.mode).toBe('hidden'));
    expect(next.result.current.only).toBe(false);
  });

  it('useAdultFiltered shows just the classified items while it is on', async () => {
    mockPrefs.getCategories.mockResolvedValue(['Hentai']);
    mockPrefs.getClassification.mockResolvedValue({ adultIds: new Set(['2']), knownIds: new Set(['1', '2', '3']) });
    const items = ['1', '2', '3'].map(id => ({ id }));
    const { result } = renderHook(
      () => ({ filter: useAdultFilter(), shown: useAdultFiltered({ items, idOf: i => i.id }) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.shown.map(i => i.id)).toEqual(['1', '3']));
    act(() => result.current.filter.setOnly(true));
    expect(result.current.shown.map(i => i.id)).toEqual(['2']);
  });
});

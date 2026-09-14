import { renderHook } from '@testing-library/react-native';
import { createBackAction, createNavigateAction, useAction } from './action.tool';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
let mockCanGoBack = false;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
    canGoBack: () => mockCanGoBack,
  }),
}));

describe('createNavigateAction', () => {
  it('builds a navigate.to action with route/params', () => {
    const action = createNavigateAction({ route: 'reader/:seriesId/:chapterId', params: { seriesId: 's1', chapterId: 'c1' } });
    expect(action).toEqual({ navigate: { to: { route: 'reader/:seriesId/:chapterId', params: { seriesId: 's1', chapterId: 'c1' } } } });
  });

  it('allows an undefined params', () => {
    const action = createNavigateAction({ route: 'library' });
    expect(action).toEqual({ navigate: { to: { route: 'library', params: undefined } } });
  });
});

describe('createBackAction', () => {
  it('builds a navigate.back action with canUseGoBack always true', () => {
    const action = createBackAction({ route: 'series/:seriesId', params: { seriesId: 's1' } });
    expect(action).toEqual({
      navigate: { back: { route: 'series/:seriesId', params: { seriesId: 's1' }, canUseGoBack: true, canResetStack: undefined } },
    });
  });

  it('carries canResetStack when the caller opts in', () => {
    const action = createBackAction({ route: 'hub', canResetStack: true });
    expect(action.navigate.back?.canResetStack).toBe(true);
  });
});

describe('useAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = false;
  });

  it('realize with navigate.to calls navigation.navigate', () => {
    const { result } = renderHook(() => useAction());
    const action = createNavigateAction({ route: 'library', params: { foo: 'bar' } });
    const onPress = result.current.realize(action);
    expect(mockNavigate).not.toHaveBeenCalled();
    onPress();
    expect(mockNavigate).toHaveBeenCalledWith('library', { foo: 'bar', origin: undefined });
  });

  it('merges origin into the navigate params when useAction was given one', () => {
    const { result } = renderHook(() => useAction({ origin: 'LIBRARY' }));
    const action = createNavigateAction({ route: 'reader/:seriesId/:chapterId', params: { seriesId: 's1', chapterId: 'c1' } });
    result.current.realize(action)();
    expect(mockNavigate).toHaveBeenCalledWith('reader/:seriesId/:chapterId', { seriesId: 's1', chapterId: 'c1', origin: 'LIBRARY' });
  });

  it('realize with navigate.back and real history calls goBack, never the fallback route', () => {
    mockCanGoBack = true;
    const { result } = renderHook(() => useAction());
    const action = createBackAction({ route: 'series/:seriesId', params: { seriesId: 's1' } });
    result.current.realize(action)();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('realize with navigate.back and no history navigates to the fallback (no canResetStack)', () => {
    mockCanGoBack = false;
    const { result } = renderHook(() => useAction());
    const action = createBackAction({ route: 'series/:seriesId', params: { seriesId: 's1' } });
    result.current.realize(action)();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('series/:seriesId', { seriesId: 's1', origin: undefined });
  });

  it('realize with navigate.back, no history and canResetStack resets the whole stack', () => {
    mockCanGoBack = false;
    const { result } = renderHook(() => useAction());
    const action = createBackAction({ route: 'hub', canResetStack: true });
    result.current.realize(action)();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'hub', params: { origin: undefined } }] });
  });

  it('realize returns a function that logs an error when the action has neither navigate.to nor navigate.back, without throwing', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAction());
    const empty = { navigate: {} } as ReturnType<typeof createNavigateAction>;
    const onPress = result.current.realize(empty);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(() => onPress()).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('neither'));
    expect(mockNavigate).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

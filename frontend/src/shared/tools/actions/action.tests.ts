import { renderHook } from '@testing-library/react-native';
import { createNavigateAction, useAction } from './action.tool';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('createNavigateAction', () => {
  it('builds a navigate action with method/route/params', () => {
    const action = createNavigateAction({ route: 'reader/:seriesId/:chapterId', params: { seriesId: 's1', chapterId: 'c1' } });
    expect(action).toEqual({ method: 'navigate', route: 'reader/:seriesId/:chapterId', params: { seriesId: 's1', chapterId: 'c1' } });
  });

  it('allows an undefined params', () => {
    const action = createNavigateAction({ route: 'library' });
    expect(action).toEqual({ method: 'navigate', route: 'library', params: undefined });
  });
});

describe('useAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('realize returns a function that calls navigation.navigate with the action params', () => {
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

  it('realize returns a function that logs an error for an unsupported method, without throwing', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAction());
    const unsupported = { method: 'modal' } as unknown as ReturnType<typeof createNavigateAction>;
    const onPress = result.current.realize(unsupported);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(() => onPress()).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('modal'));
    expect(mockNavigate).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

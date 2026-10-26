import { NavigationTool } from './navigation.tool';

function fakeNavigation(canGoBack: boolean, routes: Array<{ name: string; params?: Record<string, unknown> }> = []) {
  return {
    replace: jest.fn(),
    getState: () => ({ routes }),
    canGoBack: () => canGoBack,
    goBack: jest.fn(),
    navigate: jest.fn(),
    reset: jest.fn(),
  };
}

describe('NavigationTool.go', () => {
  it('calls goBack when canUseGoBack is set and there is real history', () => {
    const navigation = fakeNavigation(true);
    NavigationTool.go(navigation, { route: 'series/:seriesId', canUseGoBack: true });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  it('does not call goBack when canUseGoBack is set but there is no history — falls through to navigate', () => {
    const navigation = fakeNavigation(false);
    NavigationTool.go(navigation, { route: 'series/:seriesId', params: { seriesId: 's1' }, canUseGoBack: true });
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('series/:seriesId', { seriesId: 's1' });
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  it('never calls goBack when canUseGoBack is not set, even with real history', () => {
    const navigation = fakeNavigation(true);
    NavigationTool.go(navigation, { route: 'hub' });
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('hub', undefined);
  });

  it('navigates (stacks on top) when canResetStack is not set', () => {
    const navigation = fakeNavigation(false);
    NavigationTool.go(navigation, { route: 'series/:seriesId', params: { seriesId: 's1' } });
    expect(navigation.navigate).toHaveBeenCalledWith('series/:seriesId', { seriesId: 's1' });
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  it('resets the whole stack when canResetStack is set and goBack did not apply', () => {
    const navigation = fakeNavigation(false);
    NavigationTool.go(navigation, { route: 'hub', canResetStack: true });
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'hub', params: undefined }] });
  });

  it('canResetStack never overrides a successful goBack', () => {
    const navigation = fakeNavigation(true);
    NavigationTool.go(navigation, { route: 'hub', canUseGoBack: true, canResetStack: true });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.reset).not.toHaveBeenCalled();
  });
});

describe('NavigationTool.go with canReplace', () => {
  const series = { route: 'series/:seriesId', params: { seriesId: 's1', origin: 'DASHBOARD' }, canReplace: true };

  it('replaces the current screen when the target is not already in the stack', () => {
    const navigation = fakeNavigation(true, [{ name: 'hub' }, { name: 'reader/:seriesId/:chapterId' }]);
    NavigationTool.go(navigation, series);
    expect(navigation.replace).toHaveBeenCalledWith('series/:seriesId', series.params);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates (popping back to it) when the same screen is already in the stack', () => {
    const navigation = fakeNavigation(true, [{ name: 'series/:seriesId', params: { seriesId: 's1' } }, { name: 'reader/:seriesId/:chapterId' }]);
    NavigationTool.go(navigation, series);
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('series/:seriesId', series.params);
  });
});

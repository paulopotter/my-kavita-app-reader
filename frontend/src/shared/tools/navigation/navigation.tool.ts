// NavigationTool — the one place that knows HOW to move between screens (goBack / navigate /
// reset), given a NavigateTarget a domain tool already decided on (shared/tools/actions). Never
// knows WHY a target was chosen (a series' own origin, a reader's own series to fall back to) —
// that's each domain tool's job; this only executes.

// Loosely typed on purpose, same as useAction's own navigation prop — this project has no fully
// typed route param map today (navigation/routes.ts's own RouteName/params shape).
interface NavigationLike {
  canGoBack(): boolean;
  goBack(): void;
  navigate(route: string, params?: Record<string, unknown>): void;
  replace(...args: any[]): void;
  getState(): { routes: Array<{ name: string; params?: Record<string, unknown> }> };
  reset(state: { index: number; routes: Array<{ name: string; params?: Record<string, unknown> }> }): void;
}

interface NavigateTargetLike {
  route: string;
  params?: Record<string, unknown>;
  canUseGoBack?: boolean;
  canResetStack?: boolean;
  // Swaps the current screen for the target instead of stacking on top — for a screen that must
  // not stay in the back stack once the user moves on (the Reader, when its series is opened:
  // back from the series has to land where the Reader was entered, not on the Reader again).
  canReplace?: boolean;
}

// The stack already holds this exact screen (same route, same params minus navigation-only
// `origin`) — navigating then pops back to it rather than adding a second copy.
function isInStack({ navigation, target }: { navigation: NavigationLike; target: NavigateTargetLike }): boolean {
  const keys = Object.keys(target.params ?? {}).filter(k => k !== 'origin');
  return navigation.getState().routes.some(
    r => r.name === target.route && keys.every(k => r.params?.[k] === target.params?.[k]),
  );
}

export const NavigationTool = {
  // canUseGoBack + real history wins first (goBack lands wherever the user actually came from —
  // e.g. an in-app NotificationsScreen — never assumed, only used when it's really there).
  // Otherwise reaches `target` itself: canResetStack replaces the whole stack (reset — nothing of
  // it survives, e.g. the Splash boot); without it, this only stacks on top of whatever already
  // exists (navigate — the default, never destroys history the caller didn't ask to destroy).
  go(navigation: NavigationLike, target: NavigateTargetLike): void {
    if (target.canUseGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (target.canReplace && !isInStack({ navigation, target })) {
      navigation.replace(target.route, target.params);
      return;
    }
    if (target.canResetStack) {
      navigation.reset({ index: 0, routes: [{ name: target.route, params: target.params }] });
      return;
    }
    navigation.navigate(target.route, target.params);
  },
};

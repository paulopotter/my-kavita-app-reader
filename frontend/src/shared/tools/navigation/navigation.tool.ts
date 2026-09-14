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
  reset(state: { index: number; routes: Array<{ name: string; params?: Record<string, unknown> }> }): void;
}

interface NavigateTargetLike {
  route: string;
  params?: Record<string, unknown>;
  canUseGoBack?: boolean;
  canResetStack?: boolean;
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
    if (target.canResetStack) {
      navigation.reset({ index: 0, routes: [{ name: target.route, params: target.params }] });
      return;
    }
    navigation.navigate(target.route, target.params);
  },
};

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavOrigin, RouteName } from '../../../navigation/routes';
import { NavigationTool } from '../navigation';

// Generic action-tool — the shared vocabulary any domain tool (SerieTool, ChapterTool, future
// tools...) uses to describe "what should happen on interaction" without knowing HOW to make it
// happen. A domain tool builds an ActionContract (pure data, no function) via createNavigateAction/
// createBackAction; only useAction() (a hook — the only place allowed to call useNavigation(), a
// React hook itself) knows how to turn that contract into a real callback, by handing the target
// to NavigationTool (shared/tools/navigation) — the one place that knows HOW to move between
// screens (goBack/navigate/reset), same "domain describes, one executor performs" split.

// One target either "to" or "back" describes navigating towards — same shape for both, since the
// only real difference between "go forward" and "go back" is whether history/stack-replacement
// are ever in play, which the two extra flags below capture instead of a separate shape per case.
export interface NavigateTarget {
  route: RouteName;
  params?: Record<string, unknown>;
  // Only a 'back' target ever sets this — tells NavigationTool it may try the real
  // navigation.goBack() first (actual history, e.g. an in-app NotificationsScreen the user
  // genuinely came from) before falling back to this route at all. A 'to' target never sets
  // this — going forward has no history to prefer over the explicit destination.
  canUseGoBack?: boolean;
  // Whether reaching this target (when canUseGoBack didn't apply, or wasn't set) may replace the
  // whole stack (reset — nothing of the previous stack survives, e.g. the Splash boot) instead of
  // just stacking on top of whatever already exists (navigate — the default; never destroys
  // history the caller didn't explicitly ask to destroy).
  canResetStack?: boolean;
}

// navigate.to / navigate.back — a discriminated pair, not a flat `method` union, so a domain tool
// building "how to get to me" (to) and "where I fall back to" (back) can hold both onto the same
// object shape when it ever needs to (e.g. a chapter's own action today only ever sets `to`).
export interface ActionContract {
  navigate: {
    to?: NavigateTarget;
    back?: NavigateTarget;
  };
}

export function createNavigateAction({ route, params }: { route: RouteName; params?: Record<string, unknown> }): ActionContract {
  return { navigate: { to: { route, params } } };
}

// The domain tool calling this (SerieTool, the Reader's own hook, ...) already knows its own
// fallback destination (a series screen's own origin, a chapter's own series) — this only wraps
// that destination with the two flags every 'back' target needs: try real history first
// (canUseGoBack), and whether reaching the fallback may reset the stack or must only stack on top
// (canResetStack, explicit per call site — never assumed).
export function createBackAction({
  route,
  params,
  canResetStack,
}: {
  route: RouteName;
  params?: Record<string, unknown>;
  canResetStack?: boolean;
}): ActionContract {
  return { navigate: { back: { route, params, canUseGoBack: true, canResetStack } } };
}

// `origin` (NavOrigin — where the current screen was itself opened from) is navigation state,
// not domain data: no XTool ever knows about it. useAction() takes it as its own dependency and
// merges it into every navigate's params — the one place that knows how origin should propagate,
// instead of every domain tool's normalize() having to accept and thread it through.
export function useAction({ origin }: { origin?: NavOrigin } = {}) {
  // Same loosely-typed navigation prop SeriesDetailScreen.tsx already uses — this project has no
  // fully-typed route param map today (see navigation/routes.ts's own RouteName/params shape).
  const navigation = useNavigation<NativeStackNavigationProp<any>>(); // Rules of Hooks: top-level, never inside the switch

  function realize(action: ActionContract): () => void {
    const target = action.navigate.to ?? action.navigate.back;
    if (!target) {
      return () => console.error('useAction.realize: ActionContract has neither navigate.to nor navigate.back');
    }
    return () => NavigationTool.go(navigation, { ...target, params: { ...target.params, origin } });
  }

  return { realize };
}

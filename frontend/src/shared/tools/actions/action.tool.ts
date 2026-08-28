import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavOrigin, RouteName } from '../../../navigation/routes';

// Generic action-tool — the shared vocabulary any domain tool (SerieTool, future ChapterTool...)
// uses to describe "what should happen on interaction" without knowing HOW to make it happen.
// A domain tool builds an ActionContract (pure data, no function) via createXAction(); only
// useAction() (a hook — the only place allowed to call useNavigation(), a React hook itself)
// knows how to turn that contract into a real callback.

// Separate type even with a single value today — grows into a union once a 2nd method exists,
// and is already exportable/reusable on its own (e.g. a Set of valid methods) without touching
// NavigateAction's own shape.
export type ActionMethod = 'navigate';

export interface NavigateAction {
  method: ActionMethod;
  route: RouteName;
  params?: Record<string, unknown>;
}

// Grows into a union (NavigateAction | ModalAction | ...) when a 2nd method is actually needed —
// not built speculatively ahead of a real case.
export type ActionContract = NavigateAction;

export function createNavigateAction({ route, params }: { route: RouteName; params?: Record<string, unknown> }): NavigateAction {
  return { method: 'navigate', route, params };
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
    switch (action.method) {
      case 'navigate':
        return () => navigation.navigate(action.route, { ...action.params, origin });
      default:
        return () => console.error(`useAction.realize: method not supported: ${(action as ActionContract).method}`);
    }
  }

  return { realize };
}

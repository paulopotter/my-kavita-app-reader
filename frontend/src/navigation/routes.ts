export const Routes = {
  // The RN splash. Initial route of the RootNavigator; it decides where to go next.
  SPLASH: 'splash',
  SETUP: 'setup',
  // The bottom-tab container (MainNavigator). "Hub" = the place you navigate freely to/from —
  // Library / Following / Config, and a Home tab later. Series/Reader are NOT here: they're a
  // linear flow (back/forward only), stacked over the hub in the RootNavigator.
  HUB: 'hub',
  LIBRARY: 'library',
  FOLLOWING: 'following',
  SEARCH: 'search',
  CONFIG: 'config',
  NOTIFICATIONS: 'notifications',
  // Serves SerieScreen (screens/serie) — the legacy SeriesDetailScreen has been deleted.
  SERIES_DETAIL: 'series/:seriesId',
  READER: 'reader/:seriesId/:chapterId',
} as const;

export type RouteName = (typeof Routes)[keyof typeof Routes];

export const BOTTOM_NAV_ROUTES = new Set<string>([
  Routes.LIBRARY,
  Routes.FOLLOWING,
  Routes.SEARCH,
  Routes.NOTIFICATIONS,
  Routes.CONFIG,
]);

export type NavOrigin = 'LIBRARY' | 'FOLLOWING' | 'SEARCH';

export function seriesDetailRoute(seriesId: string, origin: NavOrigin): string {
  return `series/${seriesId}?origin=${origin}`;
}

export function readerRoute(seriesId: string, chapterId: string, origin: NavOrigin): string {
  return `reader/${seriesId}/${chapterId}?origin=${origin}`;
}

// Absent origin (never navigated with one — e.g. Serie opened straight from a deep link/
// notification, with no "I came from Library/Following/Search" to honor) falls back to the Hub
// itself, never assuming Library — a guess would be wrong as often as it's right, and Home is
// always a safe, correct destination.
export function originRouteFor(origin?: NavOrigin): RouteName {
  switch (origin) {
    case 'FOLLOWING': return Routes.FOLLOWING;
    case 'SEARCH': return Routes.SEARCH;
    case 'LIBRARY': return Routes.LIBRARY;
    default: return Routes.HUB;
  }
}

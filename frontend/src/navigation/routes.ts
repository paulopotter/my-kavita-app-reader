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
  Routes.CONFIG,
]);

export type NavOrigin = 'LIBRARY' | 'FOLLOWING' | 'SEARCH';

export function seriesDetailRoute(seriesId: string, origin: NavOrigin): string {
  return `series/${seriesId}?origin=${origin}`;
}

export function readerRoute(seriesId: string, chapterId: string, origin: NavOrigin): string {
  return `reader/${seriesId}/${chapterId}?origin=${origin}`;
}

export function originRouteFor(origin: NavOrigin): string {
  switch (origin) {
    case 'FOLLOWING': return Routes.FOLLOWING;
    case 'SEARCH': return Routes.SEARCH;
    default: return Routes.LIBRARY;
  }
}

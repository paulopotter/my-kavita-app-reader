export const Routes = {
  STARTUP: 'startup',
  SETUP: 'setup',
  LIBRARY: 'library',
  FOLLOWING: 'following',
  SEARCH: 'search',
  CONFIG: 'config',
  NOTIFICATIONS: 'notifications',
  SERIES_DETAIL: 'series/:seriesId',
  READER: 'reader/:seriesId/:chapterId',
  // Temporary — the new SerieScreen (screens/serie), still being validated alongside the legacy
  // SeriesDetailScreen (Routes.SERIES_DETAIL) it will eventually replace. Only reachable today
  // from the debug screen. Remove this once SerieScreen takes over SERIES_DETAIL for real.
  SERIE_NEW: 'serie-new/:seriesId',
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

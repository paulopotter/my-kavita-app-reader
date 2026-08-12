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

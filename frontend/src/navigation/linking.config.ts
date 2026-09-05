import type { LinkingOptions } from '@react-navigation/native';
import { Routes } from './routes';

// The ONLY scheme React Navigation ever sees. MainActivity (DeepLinkNormalizer.kt) rewrites every
// real entry point — the public `mymangareader://` scheme (used by the notification's
// PendingIntent) and any configured http(s) App Link host (Plan 008 Task 004) — into this one
// internal scheme before the Intent ever reaches RN. This file never needs to know a host exists:
// adding a new entry point later is purely a Kotlin-side concern.
const INTERNAL_SCHEME = 'deeplink://';

// React Navigation resolves a matched URL into a screen itself (getInitialURL for a cold start,
// its own listener for a warm one) — nothing here wires that listening mechanism by hand.
export const linking: LinkingOptions<Record<string, object | undefined>> = {
  prefixes: [INTERNAL_SCHEME],
  config: {
    screens: {
      [Routes.SERIES_DETAIL]: 'series/:seriesId',
      [Routes.READER]: 'reader/:seriesId/:chapterId',
    },
  },
};

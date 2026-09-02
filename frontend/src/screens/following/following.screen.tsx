import React from 'react';
import { useStrings } from '../../shared/i18n/useStrings';
import { LibraryScreen } from '../library';
import type { LibraryEntry } from '../library';

// Following is the Library with a followed-only filter and its own persisted layout prefs — no
// screen of its own. The filter is applied reactively (useMemo over the unfiltered list, inside
// useLibrary), so starring/unstarring a series adds/removes it here without a refetch.
const followingFilter = (entry: LibraryEntry) => entry.isFollowed;

export function FollowingScreen() {
  const t = useStrings();
  return <LibraryScreen filter={followingFilter} prefsKey="following" emptyText={t.followingEmpty} />;
}

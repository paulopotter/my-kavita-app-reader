import React from 'react';
import { SeriesSummary } from '../../shared/bridge/library';
import { useStrings } from '../../shared/i18n/useStrings';
import { LibraryScreen } from '../library/LibraryScreen';

const followingFilter = (s: SeriesSummary) => s.isFollowed;

export function FollowingScreen() {
  const t = useStrings();
  return (
    <LibraryScreen
      filter={followingFilter}
      prefsKey="following"
      emptyText={t.followingEmpty}
    />
  );
}

import { useEffect, useState } from 'react';
import {
  discoverActiveGroupId,
  discoverFirstExternalGroupId,
  discoverFirstGroupId,
} from './debug.steps';

// The debug screen's shared ids. Each Section auto-discovers what it can on mount; the values
// are editable in the Section's own text field before a run (discovery can legitimately come up
// empty — e.g. no active group yet).
export function useDebugIds() {
  const [groupId, setGroupId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [pageIndex, setPageIndex] = useState('0');
  const [externalGroupId, setExternalGroupId] = useState('');

  useEffect(() => {
    discoverActiveGroupId().then(id => {
      if (id) {
        setGroupId(id);
        return;
      }
      discoverFirstGroupId().then(fallback => {
        if (fallback) {setGroupId(fallback);}
      });
    });
    discoverFirstExternalGroupId().then(id => {
      if (id) {setExternalGroupId(id);}
    });
  }, []);

  return {
    groupId,
    setGroupId,
    seriesId,
    setSeriesId,
    chapterId,
    setChapterId,
    pageIndex,
    setPageIndex,
    externalGroupId,
    setExternalGroupId,
  };
}

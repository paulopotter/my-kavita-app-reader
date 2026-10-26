import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationToast } from '../../components/notification-toast';
import { useStrings } from '../../i18n';
import { createNavigateAction, useAction } from '../../tools/actions';
import type { NotificationToastGroup } from '../../tools/notification-toast';
import { Routes } from '../../../navigation/routes';
import { spacing } from '../../theme';
import { useNotificationToast } from './notification-toast.hooks';

// Mounted once, inside the NavigationContainer, above every screen: it connects the toast to the
// notification event and to navigation. A tap on a series opens it (or the chapter, when exactly
// one arrived) and the toast goes away.
export function NotificationToastHost() {
  const t = useStrings();
  const insets = useSafeAreaInsets();
  const toast = useNotificationToast();
  const { realize } = useAction();

  const openGroup = useCallback(
    (group: NotificationToastGroup) => {
      toast.dismiss();
      const action =
        group.chapterId != null
          ? createNavigateAction({ route: Routes.READER, params: { seriesId: group.seriesId, chapterId: group.chapterId } })
          : createNavigateAction({ route: Routes.SERIES_DETAIL, params: { seriesId: group.seriesId } });
      realize(action)();
    },
    [toast, realize],
  );

  return (
    <NotificationToast
      visible={toast.visible}
      expanded={toast.expanded}
      top={insets.top + spacing[2]}
      headline={toast.headline}
      groups={toast.groups}
      onPress={toast.expand}
      onGroupPress={openGroup}
      onClose={toast.dismiss}
      openLabel={t.notificationToastOpen}
      closeLabel={t.notificationToastClose}
    />
  );
}

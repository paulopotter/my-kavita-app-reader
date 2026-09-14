import { NotificationsService } from './notifications.services';

jest.mock('../../bridge/notifications', () => ({
  NotificationsBridge: {
    isChannelEnabled: jest.fn(),
    openChannelSettings: jest.fn(),
    getConnectionStatus: jest.fn(),
    listGroups: jest.fn(),
    addGroup: jest.fn(),
    updateGroup: jest.fn(),
    removeGroup: jest.fn(),
    listGroupUrls: jest.fn(),
    addGroupUrl: jest.fn(),
    updateGroupUrl: jest.fn(),
    removeGroupUrl: jest.fn(),
    testGroupUrl: jest.fn(),
    getActiveGroupUrl: jest.fn(),
    testGroupConnection: jest.fn(),
    getScopeAll: jest.fn(),
    setScopeAll: jest.fn(),
    getScopeFollowedOnly: jest.fn(),
    setScopeFollowedOnly: jest.fn(),
    getGroupAcrossSeries: jest.fn(),
    setGroupAcrossSeries: jest.fn(),
    getRetentionDays: jest.fn(),
    setRetentionDays: jest.fn(),
    getCollapseSerialChaptersNotification: jest.fn(),
    setCollapseSerialChaptersNotification: jest.fn(),
    getCollapseWindowMs: jest.fn(),
    listHistory: jest.fn(),
    markHistoryRead: jest.fn(),
    markAllHistoryRead: jest.fn(),
    deleteHistoryItem: jest.fn(),
    unreadCount: jest.fn(),
  },
}));

import { NotificationsBridge } from '../../bridge/notifications';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NotificationsService.channel', () => {
  it('isEnabled forwards to NotificationsBridge.isChannelEnabled', async () => {
    (NotificationsBridge.isChannelEnabled as jest.Mock).mockResolvedValue(true);
    const result = await NotificationsService.channel.isEnabled();
    expect(NotificationsBridge.isChannelEnabled).toHaveBeenCalledWith();
    expect(result).toBe(true);
  });

  it('openSettings forwards to NotificationsBridge.openChannelSettings', async () => {
    await NotificationsService.channel.openSettings();
    expect(NotificationsBridge.openChannelSettings).toHaveBeenCalledWith();
  });
});

describe('NotificationsService.connection', () => {
  it('getStatus forwards to NotificationsBridge.getConnectionStatus', async () => {
    (NotificationsBridge.getConnectionStatus as jest.Mock).mockResolvedValue('connected');
    const result = await NotificationsService.connection.getStatus();
    expect(NotificationsBridge.getConnectionStatus).toHaveBeenCalledWith();
    expect(result).toBe('connected');
  });
});

describe('NotificationsService.groups', () => {
  it('list forwards to NotificationsBridge.listGroups', async () => {
    const groups = [{ id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' }];
    (NotificationsBridge.listGroups as jest.Mock).mockResolvedValue(groups);
    const result = await NotificationsService.groups.list();
    expect(NotificationsBridge.listGroups).toHaveBeenCalledWith();
    expect(result).toBe(groups);
  });

  it('add forwards name/providerId/topic/linkedServerGroupId to NotificationsBridge.addGroup', async () => {
    const group = { id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' };
    (NotificationsBridge.addGroup as jest.Mock).mockResolvedValue(group);
    const result = await NotificationsService.groups.add({
      name: 'Home',
      providerId: 'ntfy',
      topic: 'chapters',
      linkedServerGroupId: 'sg1',
    });
    expect(NotificationsBridge.addGroup).toHaveBeenCalledWith({
      name: 'Home',
      providerId: 'ntfy',
      topic: 'chapters',
      linkedServerGroupId: 'sg1',
    });
    expect(result).toBe(group);
  });

  it('update forwards groupId/name/topic/linkedServerGroupId to NotificationsBridge.updateGroup', async () => {
    const group = { id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' };
    (NotificationsBridge.updateGroup as jest.Mock).mockResolvedValue(group);
    const result = await NotificationsService.groups.update({
      groupId: 'g1',
      name: 'Home',
      topic: 'chapters',
      linkedServerGroupId: 'sg1',
    });
    expect(NotificationsBridge.updateGroup).toHaveBeenCalledWith({
      groupId: 'g1',
      name: 'Home',
      topic: 'chapters',
      linkedServerGroupId: 'sg1',
    });
    expect(result).toBe(group);
  });

  it('remove forwards groupId to NotificationsBridge.removeGroup', async () => {
    await NotificationsService.groups.remove({ groupId: 'g1' });
    expect(NotificationsBridge.removeGroup).toHaveBeenCalledWith({ groupId: 'g1' });
  });

  it('testConnection forwards groupId to NotificationsBridge.testGroupConnection', async () => {
    const winner = { id: 'u1', groupId: 'g1', url: 'https://lan.local', timeoutMs: 5000, priority: 0 };
    (NotificationsBridge.testGroupConnection as jest.Mock).mockResolvedValue(winner);
    const result = await NotificationsService.groups.testConnection({ groupId: 'g1' });
    expect(NotificationsBridge.testGroupConnection).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(result).toBe(winner);
  });

  it('urls.list forwards groupId to NotificationsBridge.listGroupUrls', async () => {
    const urls = [{ id: 'u1', groupId: 'g1', url: 'https://lan.local', timeoutMs: 5000, priority: 0 }];
    (NotificationsBridge.listGroupUrls as jest.Mock).mockResolvedValue(urls);
    const result = await NotificationsService.groups.urls.list({ groupId: 'g1' });
    expect(NotificationsBridge.listGroupUrls).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(result).toBe(urls);
  });

  it('urls.add forwards groupId/url/timeoutMs/priority to NotificationsBridge.addGroupUrl', async () => {
    const url = { id: 'u1', groupId: 'g1', url: 'https://lan.local', timeoutMs: 5000, priority: 0 };
    (NotificationsBridge.addGroupUrl as jest.Mock).mockResolvedValue(url);
    const result = await NotificationsService.groups.urls.add({
      groupId: 'g1',
      url: 'https://lan.local',
      timeoutMs: 5000,
      priority: 0,
    });
    expect(NotificationsBridge.addGroupUrl).toHaveBeenCalledWith({
      groupId: 'g1',
      url: 'https://lan.local',
      timeoutMs: 5000,
      priority: 0,
    });
    expect(result).toBe(url);
  });

  it('urls.update forwards groupId/urlId/url/timeoutMs/priority/linkedServerUrlId to NotificationsBridge.updateGroupUrl', async () => {
    const url = { id: 'u1', groupId: 'g1', url: 'https://lan.local', timeoutMs: 5000, priority: 1, linkedServerUrlId: 'su1' };
    (NotificationsBridge.updateGroupUrl as jest.Mock).mockResolvedValue(url);
    const result = await NotificationsService.groups.urls.update({
      groupId: 'g1',
      urlId: 'u1',
      url: 'https://lan.local',
      priority: 1,
      linkedServerUrlId: 'su1',
    });
    expect(NotificationsBridge.updateGroupUrl).toHaveBeenCalledWith({
      groupId: 'g1',
      urlId: 'u1',
      url: 'https://lan.local',
      timeoutMs: undefined,
      priority: 1,
      linkedServerUrlId: 'su1',
    });
    expect(result).toBe(url);
  });

  it('urls.remove forwards groupId/urlId to NotificationsBridge.removeGroupUrl', async () => {
    await NotificationsService.groups.urls.remove({ groupId: 'g1', urlId: 'u1' });
    expect(NotificationsBridge.removeGroupUrl).toHaveBeenCalledWith({ groupId: 'g1', urlId: 'u1' });
  });

  it('urls.test forwards groupId/url to NotificationsBridge.testGroupUrl', async () => {
    const probe = { url: 'https://lan.local', ok: true, status: 200, elapsedMs: 5 };
    (NotificationsBridge.testGroupUrl as jest.Mock).mockResolvedValue(probe);
    const result = await NotificationsService.groups.urls.test({ groupId: 'g1', url: 'https://lan.local' });
    expect(NotificationsBridge.testGroupUrl).toHaveBeenCalledWith({ groupId: 'g1', url: 'https://lan.local' });
    expect(result).toBe(probe);
  });

  it('getActiveUrl forwards to NotificationsBridge.getActiveGroupUrl', async () => {
    const active = { groupId: 'g1', urlId: 'u1' };
    (NotificationsBridge.getActiveGroupUrl as jest.Mock).mockResolvedValue(active);
    const result = await NotificationsService.groups.getActiveUrl();
    expect(NotificationsBridge.getActiveGroupUrl).toHaveBeenCalledWith();
    expect(result).toBe(active);
  });
});

describe('NotificationsService.scope', () => {
  it('getAll forwards to NotificationsBridge.getScopeAll', async () => {
    (NotificationsBridge.getScopeAll as jest.Mock).mockResolvedValue(true);
    const result = await NotificationsService.scope.getAll();
    expect(NotificationsBridge.getScopeAll).toHaveBeenCalledWith();
    expect(result).toBe(true);
  });

  it('setAll forwards enabled to NotificationsBridge.setScopeAll', async () => {
    await NotificationsService.scope.setAll({ enabled: true });
    expect(NotificationsBridge.setScopeAll).toHaveBeenCalledWith({ enabled: true });
  });

  it('getFollowedOnly forwards to NotificationsBridge.getScopeFollowedOnly', async () => {
    (NotificationsBridge.getScopeFollowedOnly as jest.Mock).mockResolvedValue(false);
    const result = await NotificationsService.scope.getFollowedOnly();
    expect(NotificationsBridge.getScopeFollowedOnly).toHaveBeenCalledWith();
    expect(result).toBe(false);
  });

  it('setFollowedOnly forwards enabled to NotificationsBridge.setScopeFollowedOnly', async () => {
    await NotificationsService.scope.setFollowedOnly({ enabled: false });
    expect(NotificationsBridge.setScopeFollowedOnly).toHaveBeenCalledWith({ enabled: false });
  });
});

describe('NotificationsService.groupAcrossSeries', () => {
  it('get forwards to NotificationsBridge.getGroupAcrossSeries', async () => {
    (NotificationsBridge.getGroupAcrossSeries as jest.Mock).mockResolvedValue(true);
    const result = await NotificationsService.groupAcrossSeries.get();
    expect(NotificationsBridge.getGroupAcrossSeries).toHaveBeenCalledWith();
    expect(result).toBe(true);
  });

  it('set forwards enabled to NotificationsBridge.setGroupAcrossSeries', async () => {
    await NotificationsService.groupAcrossSeries.set({ enabled: true });
    expect(NotificationsBridge.setGroupAcrossSeries).toHaveBeenCalledWith({ enabled: true });
  });
});

describe('NotificationsService.retentionDays', () => {
  it('get forwards to NotificationsBridge.getRetentionDays', async () => {
    (NotificationsBridge.getRetentionDays as jest.Mock).mockResolvedValue(30);
    const result = await NotificationsService.retentionDays.get();
    expect(NotificationsBridge.getRetentionDays).toHaveBeenCalledWith();
    expect(result).toBe(30);
  });

  it('set forwards days to NotificationsBridge.setRetentionDays', async () => {
    await NotificationsService.retentionDays.set({ days: 30 });
    expect(NotificationsBridge.setRetentionDays).toHaveBeenCalledWith({ days: 30 });
  });
});

describe('NotificationsService.collapseSerialChaptersNotification', () => {
  it('get forwards to NotificationsBridge.getCollapseSerialChaptersNotification', async () => {
    (NotificationsBridge.getCollapseSerialChaptersNotification as jest.Mock).mockResolvedValue(true);
    const result = await NotificationsService.collapseSerialChaptersNotification.get();
    expect(NotificationsBridge.getCollapseSerialChaptersNotification).toHaveBeenCalledWith();
    expect(result).toBe(true);
  });

  it('set forwards enabled to NotificationsBridge.setCollapseSerialChaptersNotification', async () => {
    await NotificationsService.collapseSerialChaptersNotification.set({ enabled: true });
    expect(NotificationsBridge.setCollapseSerialChaptersNotification).toHaveBeenCalledWith({ enabled: true });
  });
});

describe('NotificationsService.collapseWindowMs', () => {
  it('get forwards to NotificationsBridge.getCollapseWindowMs', async () => {
    (NotificationsBridge.getCollapseWindowMs as jest.Mock).mockResolvedValue(900000);
    const result = await NotificationsService.collapseWindowMs.get();
    expect(NotificationsBridge.getCollapseWindowMs).toHaveBeenCalledWith();
    expect(result).toBe(900000);
  });
});

describe('NotificationsService.history', () => {
  it('list forwards to NotificationsBridge.listHistory', async () => {
    const items = [
      {
        id: 'h1',
        seriesId: 's1',
        seriesName: 'One Piece',
        detectedAtMs: 1,
        read: false,
        createdAtLocalMs: 2,
      },
    ];
    (NotificationsBridge.listHistory as jest.Mock).mockResolvedValue(items);
    const result = await NotificationsService.history.list();
    expect(NotificationsBridge.listHistory).toHaveBeenCalledWith();
    expect(result).toBe(items);
  });

  it('markRead forwards id to NotificationsBridge.markHistoryRead', async () => {
    await NotificationsService.history.markRead({ id: 'h1' });
    expect(NotificationsBridge.markHistoryRead).toHaveBeenCalledWith({ id: 'h1' });
  });

  it('markAllRead forwards to NotificationsBridge.markAllHistoryRead', async () => {
    await NotificationsService.history.markAllRead();
    expect(NotificationsBridge.markAllHistoryRead).toHaveBeenCalledWith();
  });

  it('delete forwards id to NotificationsBridge.deleteHistoryItem', async () => {
    await NotificationsService.history.delete({ id: 'h1' });
    expect(NotificationsBridge.deleteHistoryItem).toHaveBeenCalledWith({ id: 'h1' });
  });

  it('unreadCount forwards to NotificationsBridge.unreadCount', async () => {
    (NotificationsBridge.unreadCount as jest.Mock).mockResolvedValue(3);
    const result = await NotificationsService.history.unreadCount();
    expect(NotificationsBridge.unreadCount).toHaveBeenCalledWith();
    expect(result).toBe(3);
  });
});

import { NativeModules } from 'react-native';
import { NotificationsBridge } from '../notifications';

const native = NativeModules.NotificationsBridgeModule;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NotificationsBridge', () => {
  it('isChannelEnabled/openChannelSettings take no arguments', async () => {
    await NotificationsBridge.isChannelEnabled();
    expect(native.isChannelEnabled).toHaveBeenCalledWith();
    await NotificationsBridge.openChannelSettings();
    expect(native.openChannelSettings).toHaveBeenCalledWith();
  });

  it('listGroups takes no arguments', async () => {
    await NotificationsBridge.listGroups();
    expect(native.listGroups).toHaveBeenCalledWith();
  });

  it('addGroup unwraps the named object into positional args', async () => {
    await NotificationsBridge.addGroup({ name: 'Home', providerId: 'ntfy', topic: 'chapters', linkedServerGroupId: 'sg1' });
    expect(native.addGroup).toHaveBeenCalledWith('Home', 'ntfy', 'chapters', 'sg1');
  });

  it('removeGroup unwraps groupId', async () => {
    await NotificationsBridge.removeGroup({ groupId: 'g1' });
    expect(native.removeGroup).toHaveBeenCalledWith('g1');
  });

  it('listGroupUrls unwraps groupId', async () => {
    await NotificationsBridge.listGroupUrls({ groupId: 'g1' });
    expect(native.listGroupUrls).toHaveBeenCalledWith('g1');
  });

  it('addGroupUrl unwraps the named object into positional args', async () => {
    await NotificationsBridge.addGroupUrl({ groupId: 'g1', url: 'https://ntfy.sh', timeoutMs: 5000, priority: 0, linkedServerUrlId: 'su1' });
    expect(native.addGroupUrl).toHaveBeenCalledWith('g1', 'https://ntfy.sh', 5000, 0, 'su1');
  });

  it('updateGroupUrl unwraps the named object, defaulting omitted timeoutMs/priority to -1', async () => {
    await NotificationsBridge.updateGroupUrl({ groupId: 'g1', urlId: 'u1', url: 'https://ntfy.sh' });
    expect(native.updateGroupUrl).toHaveBeenCalledWith('g1', 'u1', 'https://ntfy.sh', -1, -1, undefined);
  });

  it('removeGroupUrl unwraps groupId/urlId', async () => {
    await NotificationsBridge.removeGroupUrl({ groupId: 'g1', urlId: 'u1' });
    expect(native.removeGroupUrl).toHaveBeenCalledWith('g1', 'u1');
  });

  it('testGroupUrl unwraps groupId/url', async () => {
    await NotificationsBridge.testGroupUrl({ groupId: 'g1', url: 'https://ntfy.sh' });
    expect(native.testGroupUrl).toHaveBeenCalledWith('g1', 'https://ntfy.sh');
  });

  it('getActiveGroupUrl takes no arguments', async () => {
    await NotificationsBridge.getActiveGroupUrl();
    expect(native.getActiveGroupUrl).toHaveBeenCalledWith();
  });

  it('scope getters take no arguments', async () => {
    await NotificationsBridge.getScopeAll();
    expect(native.getScopeAll).toHaveBeenCalledWith();
    await NotificationsBridge.getScopeFollowedOnly();
    expect(native.getScopeFollowedOnly).toHaveBeenCalledWith();
  });

  it('scope setters unwrap enabled', async () => {
    await NotificationsBridge.setScopeAll({ enabled: true });
    expect(native.setScopeAll).toHaveBeenCalledWith(true);
    await NotificationsBridge.setScopeFollowedOnly({ enabled: false });
    expect(native.setScopeFollowedOnly).toHaveBeenCalledWith(false);
  });

  it('getGroupAcrossSeries takes no arguments and setGroupAcrossSeries unwraps enabled', async () => {
    await NotificationsBridge.getGroupAcrossSeries();
    expect(native.getGroupAcrossSeries).toHaveBeenCalledWith();
    await NotificationsBridge.setGroupAcrossSeries({ enabled: true });
    expect(native.setGroupAcrossSeries).toHaveBeenCalledWith(true);
  });

  it('getRetentionDays takes no arguments and setRetentionDays unwraps days', async () => {
    await NotificationsBridge.getRetentionDays();
    expect(native.getRetentionDays).toHaveBeenCalledWith();
    await NotificationsBridge.setRetentionDays({ days: 30 });
    expect(native.setRetentionDays).toHaveBeenCalledWith(30);
  });

  it('listHistory takes no arguments', async () => {
    await NotificationsBridge.listHistory();
    expect(native.listHistory).toHaveBeenCalledWith();
  });

  it('markHistoryRead/deleteHistoryItem unwrap id', async () => {
    await NotificationsBridge.markHistoryRead({ id: 'h1' });
    expect(native.markHistoryRead).toHaveBeenCalledWith('h1');
    await NotificationsBridge.deleteHistoryItem({ id: 'h1' });
    expect(native.deleteHistoryItem).toHaveBeenCalledWith('h1');
  });

  it('markAllHistoryRead/unreadCount take no arguments', async () => {
    await NotificationsBridge.markAllHistoryRead();
    expect(native.markAllHistoryRead).toHaveBeenCalledWith();
    await NotificationsBridge.unreadCount();
    expect(native.unreadCount).toHaveBeenCalledWith();
  });
});

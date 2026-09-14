import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('pt-BR'),
}));

const mockChannelIsEnabled = jest.fn();
const mockChannelOpenSettings = jest.fn();
const mockScopeGetAll = jest.fn();
const mockScopeSetAll = jest.fn();
const mockScopeGetFollowedOnly = jest.fn();
const mockScopeSetFollowedOnly = jest.fn();
const mockGroupAcrossSeriesGet = jest.fn();
const mockGroupAcrossSeriesSet = jest.fn();
const mockRetentionGet = jest.fn();
const mockRetentionSet = jest.fn();
const mockCollapseGet = jest.fn();
const mockCollapseSet = jest.fn();
const mockGroupsList = jest.fn();
const mockGroupsAdd = jest.fn();
const mockGroupsUpdate = jest.fn();
const mockGroupsRemove = jest.fn();
const mockGetActiveUrl = jest.fn();
const mockUrlsList = jest.fn();
const mockUrlsAdd = jest.fn();
const mockUrlsUpdate = jest.fn();
const mockUrlsRemove = jest.fn();
const mockUrlsTest = jest.fn();
const mockConnectionGetStatus = jest.fn();
const mockGroupTestConnection = jest.fn();

const serviceStatusEventListeners: Array<(status: string) => void> = [];
const mockAddListener = jest.fn((_event: string, cb: (status: string) => void) => {
  serviceStatusEventListeners.push(cb);
  return { remove: jest.fn() };
});

jest.mock('../../../shared/bridge', () => ({
  NotificationsEventEmitter: { addListener: (event: string, cb: (status: string) => void) => mockAddListener(event, cb) },
}));

jest.mock('../../../shared/services/notifications', () => ({
  NotificationsService: {
    channel: {
      isEnabled: (...a: unknown[]) => mockChannelIsEnabled(...a),
      openSettings: (...a: unknown[]) => mockChannelOpenSettings(...a),
    },
    connection: {
      getStatus: (...a: unknown[]) => mockConnectionGetStatus(...a),
    },
    scope: {
      getAll: (...a: unknown[]) => mockScopeGetAll(...a),
      setAll: (...a: unknown[]) => mockScopeSetAll(...a),
      getFollowedOnly: (...a: unknown[]) => mockScopeGetFollowedOnly(...a),
      setFollowedOnly: (...a: unknown[]) => mockScopeSetFollowedOnly(...a),
    },
    groupAcrossSeries: {
      get: (...a: unknown[]) => mockGroupAcrossSeriesGet(...a),
      set: (...a: unknown[]) => mockGroupAcrossSeriesSet(...a),
    },
    retentionDays: {
      get: (...a: unknown[]) => mockRetentionGet(...a),
      set: (...a: unknown[]) => mockRetentionSet(...a),
    },
    collapseSerialChaptersNotification: {
      get: (...a: unknown[]) => mockCollapseGet(...a),
      set: (...a: unknown[]) => mockCollapseSet(...a),
    },
    groups: {
      list: (...a: unknown[]) => mockGroupsList(...a),
      add: (...a: unknown[]) => mockGroupsAdd(...a),
      update: (...a: unknown[]) => mockGroupsUpdate(...a),
      remove: (...a: unknown[]) => mockGroupsRemove(...a),
      getActiveUrl: (...a: unknown[]) => mockGetActiveUrl(...a),
      testConnection: (...a: unknown[]) => mockGroupTestConnection(...a),
      urls: {
        list: (...a: unknown[]) => mockUrlsList(...a),
        add: (...a: unknown[]) => mockUrlsAdd(...a),
        update: (...a: unknown[]) => mockUrlsUpdate(...a),
        remove: (...a: unknown[]) => mockUrlsRemove(...a),
        test: (...a: unknown[]) => mockUrlsTest(...a),
      },
    },
  },
}));

const mockServersList = jest.fn();
const mockServerUrlsList = jest.fn();
jest.mock('../../../shared/services/servers', () => ({
  ServersService: { groups: { list: (...a: unknown[]) => mockServersList(...a) } },
  ServerService: { urls: { list: (...a: unknown[]) => mockServerUrlsList(...a) } },
}));

import { useNotificationChannel, useNotificationGroups, useNotificationPrefs, useNotificationServiceStatus } from './notifications.hooks';

const group = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'g1',
  name: 'Home',
  providerId: 'ntfy',
  topic: 'chapters',
  ...over,
});
const url = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'u1',
  groupId: 'g1',
  url: 'https://ntfy.sh',
  timeoutMs: 5000,
  priority: 0,
  ...over,
});

const appStateListeners: Array<(state: string) => void> = [];

beforeEach(() => {
  jest.clearAllMocks();
  appStateListeners.length = 0;
  serviceStatusEventListeners.length = 0;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
    appStateListeners.push(cb as (state: string) => void);
    return { remove: jest.fn() } as never;
  });
  mockChannelIsEnabled.mockResolvedValue(true);
  mockConnectionGetStatus.mockResolvedValue('stopped');
  mockChannelOpenSettings.mockResolvedValue(undefined);
  mockScopeGetAll.mockResolvedValue(false);
  mockScopeSetAll.mockResolvedValue(undefined);
  mockScopeGetFollowedOnly.mockResolvedValue(false);
  mockScopeSetFollowedOnly.mockResolvedValue(undefined);
  mockGroupAcrossSeriesGet.mockResolvedValue(false);
  mockGroupAcrossSeriesSet.mockResolvedValue(undefined);
  mockRetentionGet.mockResolvedValue(7);
  mockRetentionSet.mockResolvedValue(undefined);
  mockCollapseGet.mockResolvedValue(false);
  mockCollapseSet.mockResolvedValue(undefined);
  mockGroupsList.mockResolvedValue([]);
  mockGetActiveUrl.mockResolvedValue(null);
  mockUrlsList.mockResolvedValue([]);
  mockServersList.mockResolvedValue([]);
  mockServerUrlsList.mockResolvedValue([]);
});

// ── useNotificationChannel ───────────────────────────────────────────────────

describe('useNotificationChannel', () => {
  it('reads the channel state on mount', async () => {
    mockChannelIsEnabled.mockResolvedValue(true);
    const { result } = renderHook(() => useNotificationChannel());
    await waitFor(() => expect(result.current.enabled).toBe(true));
  });

  it('re-reads the channel state when the app returns to foreground', async () => {
    mockChannelIsEnabled.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { result } = renderHook(() => useNotificationChannel());
    await waitFor(() => expect(result.current.enabled).toBe(false));

    act(() => {
      appStateListeners.forEach(cb => cb('active'));
    });
    await waitFor(() => expect(result.current.enabled).toBe(true));
  });

  it('sets enabled to null when the read rejects', async () => {
    mockChannelIsEnabled.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useNotificationChannel());
    await waitFor(() => expect(mockChannelIsEnabled).toHaveBeenCalled());
    expect(result.current.enabled).toBeNull();
  });

  it('openSettings forwards to NotificationsService.channel.openSettings', () => {
    const { result } = renderHook(() => useNotificationChannel());
    act(() => {
      result.current.openSettings();
    });
    expect(mockChannelOpenSettings).toHaveBeenCalledWith();
  });
});

// ── useNotificationServiceStatus ─────────────────────────────────────────────

describe('useNotificationServiceStatus', () => {
  it('reads the status once on mount', async () => {
    mockConnectionGetStatus.mockResolvedValue('connected');
    const { result } = renderHook(() => useNotificationServiceStatus());
    await waitFor(() => expect(result.current.status).toBe('connected'));
  });

  it('updates live when connectionStatusChanged fires, without polling', async () => {
    mockConnectionGetStatus.mockResolvedValue('connecting');
    const { result } = renderHook(() => useNotificationServiceStatus());
    await waitFor(() => expect(result.current.status).toBe('connecting'));

    act(() => {
      serviceStatusEventListeners.forEach(cb => cb('connected'));
    });
    expect(result.current.status).toBe('connected');
  });

  it('sets status to null when the initial read rejects', async () => {
    mockConnectionGetStatus.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useNotificationServiceStatus());
    await waitFor(() => expect(mockConnectionGetStatus).toHaveBeenCalled());
    expect(result.current.status).toBeNull();
  });
});

// ── useNotificationPrefs ─────────────────────────────────────────────────────

describe('useNotificationPrefs', () => {
  it('loads the preference values, defaulting retentionDays to 7 when unset', async () => {
    mockScopeGetAll.mockResolvedValue(true);
    mockScopeGetFollowedOnly.mockResolvedValue(false);
    mockGroupAcrossSeriesGet.mockResolvedValue(true);
    mockRetentionGet.mockResolvedValue(null);
    mockCollapseGet.mockResolvedValue(true);

    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.scopeAll).toBe(true);
    expect(result.current.scopeFollowedOnly).toBe(false);
    expect(result.current.groupAcrossSeries).toBe(true);
    expect(result.current.retentionDays).toBe(7);
    expect(result.current.collapseSerialChaptersNotification).toBe(true);
  });

  it('setScopeAll(true) turns scopeFollowedOnly off and persists both', async () => {
    mockScopeGetFollowedOnly.mockResolvedValue(true);
    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setScopeAll(true);
    });

    expect(result.current.scopeAll).toBe(true);
    expect(result.current.scopeFollowedOnly).toBe(false);
    expect(mockScopeSetAll).toHaveBeenCalledWith({ enabled: true });
    expect(mockScopeSetFollowedOnly).toHaveBeenCalledWith({ enabled: false });
  });

  it('setScopeFollowedOnly(true) never touches scopeAll', async () => {
    mockScopeGetAll.mockResolvedValue(false);
    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setScopeFollowedOnly(true);
    });

    expect(result.current.scopeFollowedOnly).toBe(true);
    expect(result.current.scopeAll).toBe(false);
    expect(mockScopeSetFollowedOnly).toHaveBeenCalledWith({ enabled: true });
    expect(mockScopeSetAll).not.toHaveBeenCalled();
  });

  it('turning scopeAll back off does not touch scopeFollowedOnly', async () => {
    mockScopeGetAll.mockResolvedValue(true);
    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setScopeAll(false);
    });

    expect(result.current.scopeAll).toBe(false);
    expect(mockScopeSetFollowedOnly).not.toHaveBeenCalled();
  });

  it('setGroupAcrossSeries persists the value', async () => {
    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setGroupAcrossSeries(true);
    });

    expect(result.current.groupAcrossSeries).toBe(true);
    expect(mockGroupAcrossSeriesSet).toHaveBeenCalledWith({ enabled: true });
  });

  it('setRetentionDays clamps to [1, 15] and persists', async () => {
    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setRetentionDays(30);
    });
    expect(result.current.retentionDays).toBe(15);
    expect(mockRetentionSet).toHaveBeenCalledWith({ days: 15 });

    act(() => {
      result.current.setRetentionDays(0);
    });
    expect(result.current.retentionDays).toBe(1);
    expect(mockRetentionSet).toHaveBeenCalledWith({ days: 1 });
  });

  it('setCollapseSerialChaptersNotification persists the value', async () => {
    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setCollapseSerialChaptersNotification(true);
    });

    expect(result.current.collapseSerialChaptersNotification).toBe(true);
    expect(mockCollapseSet).toHaveBeenCalledWith({ enabled: true });
  });
});

// ── useNotificationGroups ────────────────────────────────────────────────────

describe('useNotificationGroups', () => {
  it('loads the single group and its urls sorted by priority', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ id: 'b', priority: 2 }), url({ id: 'a', priority: 1 })]);

    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.group).toEqual(group());
    expect(result.current.urls.map(u => u.id)).toEqual(['a', 'b']);
  });

  it('canAddGroup is true with no group and false once one exists', async () => {
    mockGroupsList.mockResolvedValue([]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canAddGroup).toBe(true);

    mockGroupsList.mockResolvedValue([group()]);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.canAddGroup).toBe(false);
  });

  it('marks activeUrlId only when getActiveGroupUrl points at this group', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);
    mockGetActiveUrl.mockResolvedValue({ groupId: 'g1', urlId: 'u1' });

    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeUrlId).toBe('u1');
  });

  it('activeUrlId is null when getActiveGroupUrl points at a different group', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);
    mockGetActiveUrl.mockResolvedValue({ groupId: 'other', urlId: 'u9' });

    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeUrlId).toBeNull();
  });

  it('addGroup rejects a blank name without calling the service', async () => {
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.addGroup('', 'topic', undefined);
    });
    expect(err).toBeTruthy();
    expect(mockGroupsAdd).not.toHaveBeenCalled();
  });

  it('addGroup rejects a blank topic without calling the service', async () => {
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.addGroup('Home', '', undefined);
    });
    expect(err).toBeTruthy();
    expect(mockGroupsAdd).not.toHaveBeenCalled();
  });

  it('addGroup adds via the ntfy provider, forwarding linkedServerGroupId, and reloads', async () => {
    mockGroupsAdd.mockResolvedValue(group());
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.addGroup('Home', 'chapters', 'server-1');
    });

    expect(err).toBeNull();
    expect(mockGroupsAdd).toHaveBeenCalledWith({ name: 'Home', providerId: 'ntfy', topic: 'chapters', linkedServerGroupId: 'server-1' });
  });

  it('addGroup surfaces a rejected add as an error string', async () => {
    mockGroupsAdd.mockRejectedValue(new Error('add failed'));
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.addGroup('Home', 'chapters', undefined);
    });
    expect(err).toBe('add failed');
  });

  it('editGroup rejects when there is no group without calling the service', async () => {
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.editGroup('Home', 'chapters', undefined);
    });
    expect(err).toBeTruthy();
    expect(mockGroupsUpdate).not.toHaveBeenCalled();
  });

  it('editGroup rejects a blank name/topic without calling the service', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.editGroup('', 'chapters', undefined);
    });
    expect(err).toBeTruthy();
    expect(mockGroupsUpdate).not.toHaveBeenCalled();
  });

  it('editGroup updates forwarding linkedServerGroupId and reloads', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockGroupsUpdate.mockResolvedValue(group({ name: 'New name' }));
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.editGroup('New name', 'chapters', 'server-2');
    });

    expect(err).toBeNull();
    expect(mockGroupsUpdate).toHaveBeenCalledWith({
      groupId: 'g1',
      name: 'New name',
      topic: 'chapters',
      linkedServerGroupId: 'server-2',
    });
  });

  it('editGroup surfaces a rejected update as an error string', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockGroupsUpdate.mockRejectedValue(new Error('update failed'));
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.editGroup('Home', 'chapters', undefined);
    });
    expect(err).toBe('update failed');
  });

  it('removeGroup removes and reloads', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeGroup('g1');
    });

    expect(mockGroupsRemove).toHaveBeenCalledWith({ groupId: 'g1' });
  });

  it('canAddUrl is true under MAX_URLS_PER_GROUP and false at the cap', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canAddUrl).toBe(true);

    mockUrlsList.mockResolvedValue([url({ id: 'a' }), url({ id: 'b' })]);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.canAddUrl).toBe(false);
  });

  it('canRemoveUrl is false with only one url and true with more than one', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canRemoveUrl).toBe(false);

    mockUrlsList.mockResolvedValue([url({ id: 'a' }), url({ id: 'b' })]);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.canRemoveUrl).toBe(true);
  });

  it('nextPriority is 0 for an empty group and max+1 otherwise', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.nextPriority).toBe(0);

    mockUrlsList.mockResolvedValue([url({ priority: 3 })]);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.nextPriority).toBe(4);
  });

  it('addUrl rejects when there is no group without calling the service', async () => {
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.addUrl('https://ntfy.sh', 0, undefined);
    });
    expect(err).toBeTruthy();
    expect(mockUrlsAdd).not.toHaveBeenCalled();
  });

  it('addUrl adds forwarding linkedServerUrlId and reloads', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsAdd.mockResolvedValue(url());
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.addUrl('https://ntfy.sh', 0, 'server-url-1');
    });

    expect(err).toBeNull();
    expect(mockUrlsAdd).toHaveBeenCalledWith({
      groupId: 'g1',
      url: 'https://ntfy.sh',
      timeoutMs: 5000,
      priority: 0,
      linkedServerUrlId: 'server-url-1',
    });
  });

  it('updateUrl updates forwarding linkedServerUrlId and reloads', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsUpdate.mockResolvedValue(url());
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.updateUrl('u1', 'https://ntfy.sh', 1, 'server-url-2');
    });

    expect(err).toBeNull();
    expect(mockUrlsUpdate).toHaveBeenCalledWith({
      groupId: 'g1',
      urlId: 'u1',
      url: 'https://ntfy.sh',
      priority: 1,
      linkedServerUrlId: 'server-url-2',
    });
  });

  it('removeUrl is a no-op when it is the last url of the group', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeUrl('u1');
    });

    expect(mockUrlsRemove).not.toHaveBeenCalled();
  });

  it('removeUrl removes when more than one url remains', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ id: 'a' }), url({ id: 'b' })]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeUrl('a');
    });

    expect(mockUrlsRemove).toHaveBeenCalledWith({ groupId: 'g1', urlId: 'a' });
  });

  it('testUrl forwards to the service when a group exists', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsTest.mockResolvedValue({ url: 'https://ntfy.sh', ok: true, status: 200, elapsedMs: 5 });
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const probe = await result.current.testUrl('https://ntfy.sh');

    expect(mockUrlsTest).toHaveBeenCalledWith({ groupId: 'g1', url: 'https://ntfy.sh' });
    expect(probe.ok).toBe(true);
  });

  it('testUrl returns a failed probe when there is no group', async () => {
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const probe = await result.current.testUrl('https://ntfy.sh');

    expect(probe.ok).toBe(false);
    expect(mockUrlsTest).not.toHaveBeenCalled();
  });

  it('linkedUrlLabel resolves a linked url to its server address', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ linkedServerUrlId: 'su1' })]);
    mockServersList.mockResolvedValue([{ id: 'sg1', name: 'Home Server', providerId: 'kavita', credentialsJson: '{}', healthCheckPath: '/health' }]);
    mockServerUrlsList.mockResolvedValue([{ id: 'su1', groupId: 'sg1', url: 'http://192.168.1.10:5000', timeoutMs: 5000, priority: 0 }]);

    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.linkedUrlLabel('u1')).toBe('http://192.168.1.10:5000');
  });

  it('linkedUrlLabel is undefined for an unlinked url', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);

    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.linkedUrlLabel('u1')).toBeUndefined();
  });

  it('urlsOfServerGroup forwards to ServerService.urls.list', async () => {
    mockServerUrlsList.mockResolvedValue([{ id: 'su1', groupId: 'sg1', url: 'http://host', timeoutMs: 5000, priority: 0 }]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const urls = await result.current.urlsOfServerGroup('sg1');

    expect(mockServerUrlsList).toHaveBeenCalledWith({ groupId: 'sg1' });
    expect(urls).toEqual([{ id: 'su1', groupId: 'sg1', url: 'http://host', timeoutMs: 5000, priority: 0 }]);
  });

  // ── testConnection ──

  it('testConnection sets connStatus ok, connMessage and activeUrlId on success', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url(), url({ id: 'u2', url: 'https://backup.ntfy.sh', priority: 1 })]);
    mockGroupTestConnection.mockResolvedValue({ id: 'u2', groupId: 'g1', url: 'https://backup.ntfy.sh', timeoutMs: 5000, priority: 1 });

    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connStatus).toBe('idle');

    await act(async () => {
      await result.current.testConnection();
    });

    expect(mockGroupTestConnection).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(result.current.connStatus).toBe('ok');
    expect(result.current.connMessage).toBe('https://backup.ntfy.sh');
    expect(result.current.activeUrlId).toBe('u2');
  });

  it('testConnection sets connStatus error and connMessage on failure', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);
    mockGroupTestConnection.mockRejectedValue(new Error('unreachable'));

    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.testConnection();
    });

    expect(result.current.connStatus).toBe('error');
    expect(result.current.connMessage).toBe('unreachable');
  });

  it('testConnection is a no-op when there is no group', async () => {
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.testConnection();
    });

    expect(mockGroupTestConnection).not.toHaveBeenCalled();
    expect(result.current.connStatus).toBe('idle');
  });
});

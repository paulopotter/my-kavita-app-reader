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
const mockGroupsList = jest.fn();
const mockGroupsAdd = jest.fn();
const mockGroupsRemove = jest.fn();
const mockUrlsList = jest.fn();
const mockUrlsAdd = jest.fn();
const mockUrlsRemove = jest.fn();

jest.mock('../../../shared/services/notifications', () => ({
  NotificationsService: {
    channel: {
      isEnabled: (...a: unknown[]) => mockChannelIsEnabled(...a),
      openSettings: (...a: unknown[]) => mockChannelOpenSettings(...a),
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
    groups: {
      list: (...a: unknown[]) => mockGroupsList(...a),
      add: (...a: unknown[]) => mockGroupsAdd(...a),
      remove: (...a: unknown[]) => mockGroupsRemove(...a),
      urls: {
        list: (...a: unknown[]) => mockUrlsList(...a),
        add: (...a: unknown[]) => mockUrlsAdd(...a),
        remove: (...a: unknown[]) => mockUrlsRemove(...a),
      },
    },
  },
}));

import { useNotificationChannel, useNotificationGroups, useNotificationPrefs } from './notifications.hooks';

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
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
    appStateListeners.push(cb as (state: string) => void);
    return { remove: jest.fn() } as never;
  });
  mockChannelIsEnabled.mockResolvedValue(true);
  mockChannelOpenSettings.mockResolvedValue(undefined);
  mockScopeGetAll.mockResolvedValue(false);
  mockScopeSetAll.mockResolvedValue(undefined);
  mockScopeGetFollowedOnly.mockResolvedValue(false);
  mockScopeSetFollowedOnly.mockResolvedValue(undefined);
  mockGroupAcrossSeriesGet.mockResolvedValue(false);
  mockGroupAcrossSeriesSet.mockResolvedValue(undefined);
  mockRetentionGet.mockResolvedValue(30);
  mockRetentionSet.mockResolvedValue(undefined);
  mockGroupsList.mockResolvedValue([]);
  mockUrlsList.mockResolvedValue([]);
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

// ── useNotificationPrefs ─────────────────────────────────────────────────────

describe('useNotificationPrefs', () => {
  it('loads the 4 preference values', async () => {
    mockScopeGetAll.mockResolvedValue(true);
    mockScopeGetFollowedOnly.mockResolvedValue(false);
    mockGroupAcrossSeriesGet.mockResolvedValue(true);
    mockRetentionGet.mockResolvedValue(45);

    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.scopeAll).toBe(true);
    expect(result.current.scopeFollowedOnly).toBe(false);
    expect(result.current.groupAcrossSeries).toBe(true);
    expect(result.current.retentionDays).toBe(45);
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

  it('setScopeFollowedOnly(true) turns scopeAll off and persists both', async () => {
    mockScopeGetAll.mockResolvedValue(true);
    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setScopeFollowedOnly(true);
    });

    expect(result.current.scopeFollowedOnly).toBe(true);
    expect(result.current.scopeAll).toBe(false);
    expect(mockScopeSetFollowedOnly).toHaveBeenCalledWith({ enabled: true });
    expect(mockScopeSetAll).toHaveBeenCalledWith({ enabled: false });
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

  it('setRetentionDays persists the value', async () => {
    const { result } = renderHook(() => useNotificationPrefs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setRetentionDays(45);
    });

    expect(result.current.retentionDays).toBe(45);
    expect(mockRetentionSet).toHaveBeenCalledWith({ days: 45 });
  });
});

// ── useNotificationGroups ────────────────────────────────────────────────────

describe('useNotificationGroups', () => {
  it('loads groups and, for each, its urls sorted by priority', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ id: 'b', priority: 2 }), url({ id: 'a', priority: 1 })]);

    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.groups).toEqual([group()]);
    expect(result.current.urlsByGroup.g1.map((u: { id: string }) => u.id)).toEqual(['a', 'b']);
  });

  it('addGroup rejects a blank name without calling the service', async () => {
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.addGroup('', 'topic');
    });
    expect(err).toBeTruthy();
    expect(mockGroupsAdd).not.toHaveBeenCalled();
  });

  it('addGroup rejects a blank topic without calling the service', async () => {
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.addGroup('Home', '');
    });
    expect(err).toBeTruthy();
    expect(mockGroupsAdd).not.toHaveBeenCalled();
  });

  it('addGroup adds via the ntfy provider and reloads', async () => {
    mockGroupsAdd.mockResolvedValue(group());
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.addGroup('Home', 'chapters');
    });

    expect(err).toBeNull();
    expect(mockGroupsAdd).toHaveBeenCalledWith({ name: 'Home', providerId: 'ntfy', topic: 'chapters' });
  });

  it('addGroup surfaces a rejected add as an error string', async () => {
    mockGroupsAdd.mockRejectedValue(new Error('add failed'));
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.addGroup('Home', 'chapters');
    });
    expect(err).toBe('add failed');
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
    expect(result.current.canAddUrl('g1')).toBe(true);

    mockUrlsList.mockResolvedValue([url({ id: 'a' }), url({ id: 'b' })]);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.canAddUrl('g1')).toBe(false);
  });

  it('canRemoveUrl is false with only one url and true with more than one', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canRemoveUrl('g1')).toBe(false);

    mockUrlsList.mockResolvedValue([url({ id: 'a' }), url({ id: 'b' })]);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.canRemoveUrl('g1')).toBe(true);
  });

  it('nextPriority is 0 for an empty group and max+1 otherwise', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.nextPriority('g1')).toBe(0);

    mockUrlsList.mockResolvedValue([url({ priority: 3 })]);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.nextPriority('g1')).toBe(4);
  });

  it('addUrl rejects for an unknown group without calling the service', async () => {
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.addUrl('missing', 'https://ntfy.sh', 0);
    });
    expect(err).toBeTruthy();
    expect(mockUrlsAdd).not.toHaveBeenCalled();
  });

  it('addUrl adds and reloads', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsAdd.mockResolvedValue(url());
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.addUrl('g1', 'https://ntfy.sh', 0);
    });

    expect(err).toBeNull();
    expect(mockUrlsAdd).toHaveBeenCalledWith({ groupId: 'g1', url: 'https://ntfy.sh', timeoutMs: 5000, priority: 0 });
  });

  it('removeUrl is a no-op when it is the last url of the group', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeUrl('g1', 'u1');
    });

    expect(mockUrlsRemove).not.toHaveBeenCalled();
  });

  it('removeUrl removes when more than one url remains', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ id: 'a' }), url({ id: 'b' })]);
    const { result } = renderHook(() => useNotificationGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeUrl('g1', 'a');
    });

    expect(mockUrlsRemove).toHaveBeenCalledWith({ groupId: 'g1', urlId: 'a' });
  });
});

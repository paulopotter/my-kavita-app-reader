import { act, renderHook, waitFor } from '@testing-library/react-native';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('pt-BR'),
}));

const mockProvidersList = jest.fn();
const mockGroupsList = jest.fn();
const mockGroupAdd = jest.fn();
const mockGroupUpdate = jest.fn();
const mockGroupRemove = jest.fn();
const mockGroupActiveSet = jest.fn();
const mockUrlsList = jest.fn();
const mockUrlsAdd = jest.fn();
const mockUrlsUpdate = jest.fn();
const mockUrlsRemove = jest.fn();
const mockUrlsGetActive = jest.fn();
const mockUrlsValidate = jest.fn();
const mockUrlsTest = jest.fn();

const mockExtProvidersList = jest.fn();
const mockExtGroupsList = jest.fn();
const mockExtGroupAdd = jest.fn();
const mockExtGroupUpdate = jest.fn();
const mockExtGroupRemove = jest.fn();
const mockExtGroupActiveSet = jest.fn();
const mockExtUrlsList = jest.fn();
const mockExtUrlsActiveGet = jest.fn();
const mockExtUrlsValidate = jest.fn();

jest.mock('../../../shared/services/servers', () => {
  const actual = jest.requireActual('../../../shared/services/servers');
  return {
    ...actual,
    ServersService: { providers: { list: (...a: unknown[]) => mockProvidersList(...a) }, groups: { list: (...a: unknown[]) => mockGroupsList(...a) } },
    ServerService: {
      group: {
        add: (...a: unknown[]) => mockGroupAdd(...a),
        update: (...a: unknown[]) => mockGroupUpdate(...a),
        remove: (...a: unknown[]) => mockGroupRemove(...a),
        active: { set: (...a: unknown[]) => mockGroupActiveSet(...a) },
      },
      urls: {
        list: (...a: unknown[]) => mockUrlsList(...a),
        add: (...a: unknown[]) => mockUrlsAdd(...a),
        update: (...a: unknown[]) => mockUrlsUpdate(...a),
        remove: (...a: unknown[]) => mockUrlsRemove(...a),
        getActive: (...a: unknown[]) => mockUrlsGetActive(...a),
        validate: (...a: unknown[]) => mockUrlsValidate(...a),
        test: (...a: unknown[]) => mockUrlsTest(...a),
      },
    },
    ExternalsService: { providers: { list: (...a: unknown[]) => mockExtProvidersList(...a) }, groups: { list: (...a: unknown[]) => mockExtGroupsList(...a) } },
    ExternalService: {
      group: {
        add: (...a: unknown[]) => mockExtGroupAdd(...a),
        update: (...a: unknown[]) => mockExtGroupUpdate(...a),
        remove: (...a: unknown[]) => mockExtGroupRemove(...a),
        active: { set: (...a: unknown[]) => mockExtGroupActiveSet(...a) },
      },
      urls: {
        list: (...a: unknown[]) => mockExtUrlsList(...a),
        active: { get: (...a: unknown[]) => mockExtUrlsActiveGet(...a) },
        validate: (...a: unknown[]) => mockExtUrlsValidate(...a),
      },
    },
  };
});

import { EventBus } from '../../../shared/managers/events';
import { ServerEvents } from '../../../shared/services/servers';
import { getStrings } from '../../../shared/i18n/strings';
import { MAX_URLS_PER_GROUP, useMetadataServer, useServer } from './server.hooks';

const t = getStrings('pt-BR');

const KAVITA_PROVIDER = {
  id: 'kavita',
  displayName: 'Kavita',
  version: '1',
  credentialFields: [{ name: 'apiKey', label: 'API Key', type: 'string', required: true }],
  defaultHealthCheckPath: '/api/Health',
};
const M3_PROVIDER = {
  id: 'm3',
  displayName: 'M3',
  version: '1',
  credentialFields: [],
  defaultHealthCheckPath: '/api/health',
};

const group = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'g1',
  name: 'Home',
  providerId: 'kavita',
  credentialsJson: '{"apiKey":"secret-key-1234"}',
  healthCheckPath: '/api/Health',
  ...over,
});
const url = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'u1',
  groupId: 'g1',
  url: 'http://host',
  timeoutMs: 5000,
  priority: 0,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockProvidersList.mockResolvedValue([KAVITA_PROVIDER]);
  mockGroupsList.mockResolvedValue([]);
  mockUrlsList.mockResolvedValue([]);
  mockUrlsGetActive.mockResolvedValue(null);
  mockExtProvidersList.mockResolvedValue([M3_PROVIDER]);
  mockExtGroupsList.mockResolvedValue([]);
  mockExtUrlsList.mockResolvedValue([]);
  mockExtUrlsActiveGet.mockResolvedValue(null);
});

// ── useServer ────────────────────────────────────────────────────────────────

describe('useServer', () => {
  it('loads providers and, with no group, leaves urls empty and not loading', async () => {
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.providers).toEqual([KAVITA_PROVIDER]);
    expect(result.current.group).toBeNull();
    expect(result.current.urls).toEqual([]);
  });

  it('when a group exists, lists its urls sorted by priority and reads the active url', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ id: 'b', priority: 2 }), url({ id: 'a', priority: 1 })]);
    mockUrlsGetActive.mockResolvedValue(url({ id: 'a', priority: 1 }));

    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.urls.map(u => u.id)).toEqual(['a', 'b']);
    expect(result.current.activeUrlId).toBe('a');
  });

  it('exposes the parsed credentials and a masked view of them', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.credentials).toEqual({ apiKey: 'secret-key-1234' });
    const masked = result.current.maskedCredential('apiKey');
    expect(masked).toMatch(/^secr.*1234$/);
    expect(masked).not.toBe('secret-key-1234');
    expect(result.current.maskedCredential('nope')).toBeNull();
  });

  it('treats a malformed credentialsJson as empty credentials', async () => {
    mockGroupsList.mockResolvedValue([group({ credentialsJson: '{not json' })]);
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.credentials).toEqual({});
    expect(result.current.maskedCredential('apiKey')).toBeNull();
  });

  it('treats a non-object credentialsJson as empty credentials', async () => {
    mockGroupsList.mockResolvedValue([group({ credentialsJson: '42' })]);
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.credentials).toEqual({});
  });

  it('addServer surfaces a rejected group.add as an error string', async () => {
    mockGroupAdd.mockRejectedValue(new Error('server add failed'));
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.addServer('Home', { apiKey: 'k' }, 'http://h');
    });
    expect(err).toBe('server add failed');
  });

  it('updateUrl surfaces a rejected service call, and returns the no-server string with no group', async () => {
    // no group (beforeEach default)
    const noGroup = renderHook(() => useServer());
    await waitFor(() => expect(noGroup.result.current.loading).toBe(false));
    expect(await noGroup.result.current.updateUrl('u', 'http://x', 0)).toBe(t.serverErrorNoServer);
    expect(await noGroup.result.current.addUrl('http://x', 0)).toBe(t.serverErrorNoServer);

    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsUpdate.mockRejectedValue(new Error('bad url'));
    const withG = renderHook(() => useServer());
    await waitFor(() => expect(withG.result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await withG.result.current.updateUrl('u1', 'http://x', 0);
    });
    expect(err).toBe('bad url');
  });

  it('addServer creates the group with the provider health-check path, adds the first url, activates and emits', async () => {
    mockGroupAdd.mockResolvedValue({ id: 'gNew' });
    mockUrlsAdd.mockResolvedValue(url({ groupId: 'gNew' }));
    mockGroupActiveSet.mockResolvedValue(undefined);
    mockUrlsGetActive.mockResolvedValue(url({ id: 'uNew', groupId: 'gNew', url: 'http://new' }));
    const emit = jest.spyOn(EventBus, 'emit');

    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = 'unset';
    await act(async () => {
      err = await result.current.addServer('Home', { apiKey: 'k' }, 'http://new');
    });

    expect(err).toBeNull();
    expect(mockGroupAdd).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'kavita', healthCheckPath: '/api/Health' }),
    );
    expect(mockUrlsAdd).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'gNew', url: 'http://new', priority: 0 }));
    expect(mockGroupActiveSet).toHaveBeenCalledWith({ groupId: 'gNew' });
    expect(emit).toHaveBeenCalledWith(ServerEvents.activeUrlChanged, expect.objectContaining({ groupId: 'gNew' }));
  });

  it('addServer returns an error string when there is no provider', async () => {
    mockProvidersList.mockResolvedValue([]);
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const err = await result.current.addServer('x', {}, 'http://x');
    expect(err).toBe(t.serverErrorNoProvider);
    expect(mockGroupAdd).not.toHaveBeenCalled();
  });

  it('url add/remove guards: canAddUrl caps at MAX_URLS_PER_GROUP, canRemoveUrl needs >1, nextPriority is max+1', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ id: 'a', priority: 0 }), url({ id: 'b', priority: 3 })]);

    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.urls).toHaveLength(MAX_URLS_PER_GROUP);
    expect(result.current.canAddUrl).toBe(false);
    expect(result.current.canRemoveUrl).toBe(true);
    expect(result.current.nextPriority).toBe(4);
  });

  it('removeUrl is a no-op when only one url remains', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url()]);
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeUrl('u1');
    });
    expect(mockUrlsRemove).not.toHaveBeenCalled();
  });

  it('testConnection maps a raw "no healthy url" error to the friendly string', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsValidate.mockRejectedValue(new Error('Could not resolve a healthy URL for group g1: No URL responded to health check'));

    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.testConnection();
    });
    expect(result.current.connStatus).toBe('error');
    expect(result.current.connMessage).toBe(t.serverConnErrorNoUrl);
  });

  it('testConnection on success sets ok + the winning url and emits activeUrlChanged', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsValidate.mockResolvedValue(url({ id: 'w', url: 'http://winner' }));
    const emit = jest.spyOn(EventBus, 'emit');

    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.testConnection();
    });
    expect(result.current.connStatus).toBe('ok');
    expect(result.current.connMessage).toBe('http://winner');
    expect(result.current.activeUrlId).toBe('w');
    expect(emit).toHaveBeenCalledWith(ServerEvents.activeUrlChanged, expect.objectContaining({ urlId: 'w' }));
  });

  it('updateServer patches the group, and re-auths + emits only when credentials changed', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockGroupUpdate.mockResolvedValue(undefined);
    mockGroupActiveSet.mockResolvedValue(undefined);
    mockUrlsGetActive.mockResolvedValue(url());
    const emit = jest.spyOn(EventBus, 'emit');

    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // name-only change → no re-auth, no emit
    await act(async () => {
      await result.current.updateServer('Renamed', { apiKey: 'secret-key-1234' });
    });
    expect(mockGroupUpdate).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'g1', name: 'Renamed' }));
    expect(mockGroupActiveSet).not.toHaveBeenCalled();

    emit.mockClear();
    // credential change → re-auth + emit
    await act(async () => {
      await result.current.updateServer('Renamed', { apiKey: 'new-key' });
    });
    expect(mockGroupActiveSet).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(emit).toHaveBeenCalledWith(ServerEvents.activeUrlChanged, expect.any(Object));
  });

  it('updateServer returns the error message and does not close on failure', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockGroupUpdate.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.updateServer('X', { apiKey: 'secret-key-1234' });
    });
    expect(err).toBe('nope');
  });

  it('updateServer with no group returns the "nothing to edit" string', async () => {
    const { result } = renderHook(() => useServer()); // beforeEach: groups = []
    await waitFor(() => expect(result.current.loading).toBe(false));
    const err = await result.current.updateServer('X', {});
    expect(err).toBe(t.serverErrorNoServerToEdit);
  });

  it('addUrl / updateUrl forward to the service; removeServer delegates + notifies onServerCleared', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ id: 'a', priority: 0 })]);
    mockUrlsAdd.mockResolvedValue(url({ id: 'b' }));
    mockUrlsUpdate.mockResolvedValue(url());
    mockGroupRemove.mockResolvedValue(undefined);
    const onServerCleared = jest.fn();

    const { result } = renderHook(() => useServer({ onServerCleared }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      expect(await result.current.addUrl('http://new', 1)).toBeNull();
      expect(await result.current.updateUrl('a', 'http://edited', 2)).toBeNull();
      await result.current.removeServer();
    });
    expect(mockUrlsAdd).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'g1', url: 'http://new', priority: 1 }));
    expect(mockUrlsUpdate).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'g1', urlId: 'a', url: 'http://edited', priority: 2 }));
    expect(mockGroupRemove).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(onServerCleared).toHaveBeenCalled();
  });

  it('addUrl surfaces a rejected service call as an error string', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsAdd.mockRejectedValue(new Error('url exists'));
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err: string | null = null;
    await act(async () => {
      err = await result.current.addUrl('http://x', 0);
    });
    expect(err).toBe('url exists');
  });

  it('removeUrl calls the service when >1 URL remains', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ id: 'a', priority: 0 }), url({ id: 'b', priority: 1 })]);
    mockUrlsRemove.mockResolvedValue(undefined);
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeUrl('a');
    });
    expect(mockUrlsRemove).toHaveBeenCalledWith({ groupId: 'g1', urlId: 'a' });
  });

  it('testUrl delegates to the service and, with no group, returns a not-ok probe', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsTest.mockResolvedValue({ url: 'http://x', ok: true, status: 200, elapsedMs: 5 });
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const probe = await result.current.testUrl('http://x ');
    expect(mockUrlsTest).toHaveBeenCalledWith({ groupId: 'g1', url: 'http://x' });
    expect(probe.ok).toBe(true);
  });

  it('friendlyConnError falls through to the generic string for an unrecognised error', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsValidate.mockRejectedValue(new Error('some totally different failure'));
    const { result } = renderHook(() => useServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.testConnection();
    });
    expect(result.current.connMessage).toBe(t.serverConnErrorGeneric);
  });
});

// ── useMetadataServer ────────────────────────────────────────────────────────

describe('useMetadataServer', () => {
  it('with no metadata group, renders nothing to configure and is not loading', async () => {
    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.group).toBeNull();
    expect(result.current.urls).toEqual([]);
  });

  it('the no-group guards return the localized error strings', async () => {
    const { result } = renderHook(() => useMetadataServer()); // no metadata group
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(await result.current.updateServer('X', {})).toBe(t.serverErrorNoMetadataServerToEdit);
    expect(await result.current.addUrl('http://x', 0)).toBe(t.serverErrorNoMetadataServer);
    expect(await result.current.updateUrl('u', 'http://x', 0)).toBe(t.serverErrorNoMetadataServer);
  });

  it('addServer with no metadata provider returns the no-provider string', async () => {
    mockExtProvidersList.mockResolvedValue([]);
    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(await result.current.addServer('X', {}, 'http://x')).toBe(t.serverErrorNoMetadataProvider);
  });

  it('addServer / addUrl surface a rejected ExternalService call as an error string', async () => {
    mockGroupsList.mockResolvedValue([group()]);
    mockExtGroupAdd.mockRejectedValue(new Error('meta add failed'));
    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let err: string | null = null;
    await act(async () => {
      err = await result.current.addServer('M3', {}, 'http://m3');
    });
    expect(err).toBe('meta add failed');
  });

  it('a malformed metadata credentialsJson yields empty credentials', async () => {
    mockExtGroupsList.mockResolvedValue([
      { id: 'm1', name: 'M3', providerId: 'm3', credentialsJson: 'nope', healthCheckPath: '/api/health' },
    ]);
    mockExtGroupActiveSet.mockResolvedValue(undefined);
    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.credentials).toEqual({});
  });

  it('auto-repairs a stale healthCheckPath to the provider default, then activates', async () => {
    mockExtGroupsList.mockResolvedValue([{ id: 'm1', name: 'M3', providerId: 'm3', credentialsJson: '{}', healthCheckPath: '/health' }]);
    mockExtGroupUpdate.mockResolvedValue({ id: 'm1', name: 'M3', providerId: 'm3', credentialsJson: '{}', healthCheckPath: '/api/health' });
    mockExtGroupActiveSet.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockExtGroupUpdate).toHaveBeenCalledWith({ groupId: 'm1', healthCheckPath: '/api/health' });
    expect(mockExtGroupActiveSet).toHaveBeenCalledWith({ groupId: 'm1' });
    expect(result.current.group?.healthCheckPath).toBe('/api/health');
  });

  it('does not update the group when its healthCheckPath already matches the provider', async () => {
    mockExtGroupsList.mockResolvedValue([{ id: 'm1', name: 'M3', providerId: 'm3', credentialsJson: '{}', healthCheckPath: '/api/health' }]);
    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockExtGroupUpdate).not.toHaveBeenCalled();
  });

  it('re-runs its load when a ServerEvents.activeUrlChanged is emitted', async () => {
    mockExtGroupsList.mockResolvedValue([]);
    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = mockExtGroupsList.mock.calls.length;

    await act(async () => {
      EventBus.emit(ServerEvents.activeUrlChanged, { groupId: 'g1', urlId: 'u1', url: 'http://x' });
    });
    await waitFor(() => expect(mockExtGroupsList.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('addServer wires the linked server group id and the provider health-check path', async () => {
    mockGroupsList.mockResolvedValue([group()]); // one server group to link to
    mockExtGroupAdd.mockResolvedValue({ id: 'mNew' });
    mockExtUrlsList.mockResolvedValue([]);

    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addServer('M3', {}, 'http://m3');
    });
    expect(mockExtGroupAdd).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'm3', healthCheckPath: '/api/health', linkedServerGroupId: 'g1' }),
    );
  });

  it('updateServer / removeServer / addUrl / updateUrl / removeUrl delegate to ExternalService', async () => {
    const metaGroup = { id: 'm1', name: 'M3', providerId: 'm3', credentialsJson: '{}', healthCheckPath: '/api/health' };
    mockExtGroupsList.mockResolvedValue([metaGroup]);
    mockExtUrlsList.mockResolvedValue([
      { id: 'ua', groupId: 'm1', url: 'http://a', timeoutMs: 5000, priority: 0, linkedServerUrlId: undefined },
      { id: 'ub', groupId: 'm1', url: 'http://b', timeoutMs: 5000, priority: 1, linkedServerUrlId: undefined },
    ]);
    mockExtGroupActiveSet.mockResolvedValue(undefined);
    mockExtGroupUpdate.mockResolvedValue(metaGroup);
    mockExtGroupRemove.mockResolvedValue(undefined);
    const extUrlsAdd = jest.fn().mockResolvedValue({});
    const extUrlsUpdate = jest.fn().mockResolvedValue({});
    const extUrlsRemove = jest.fn().mockResolvedValue(undefined);
    // reach into the mocked module to attach the url writers used only in this test
    const servers = jest.requireMock('../../../shared/services/servers');
    servers.ExternalService.urls.add = (...a: unknown[]) => extUrlsAdd(...a);
    servers.ExternalService.urls.update = (...a: unknown[]) => extUrlsUpdate(...a);
    servers.ExternalService.urls.remove = (...a: unknown[]) => extUrlsRemove(...a);

    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      expect(await result.current.updateServer('M3+', { token: 't' })).toBeNull();
      expect(await result.current.addUrl('http://c', 2, 'srv-url-1')).toBeNull();
      expect(await result.current.updateUrl('ua', 'http://a2', 0, 'srv-url-2')).toBeNull();
      await result.current.removeUrl('ua');
      await result.current.removeServer();
    });

    expect(mockExtGroupUpdate).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'm1', name: 'M3+' }));
    expect(extUrlsAdd).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'm1', url: 'http://c', linkedServerUrlId: 'srv-url-1' }));
    expect(extUrlsUpdate).toHaveBeenCalledWith(expect.objectContaining({ urlId: 'ua', linkedServerUrlId: 'srv-url-2' }));
    expect(extUrlsRemove).toHaveBeenCalledWith({ groupId: 'm1', urlId: 'ua' });
    expect(mockExtGroupRemove).toHaveBeenCalledWith({ groupId: 'm1' });
  });

  it('linkedUrlLabel resolves a metadata URL link to the server URL address', async () => {
    const metaGroup = { id: 'm1', name: 'M3', providerId: 'm3', credentialsJson: '{}', healthCheckPath: '/api/health' };
    mockExtGroupsList.mockResolvedValue([metaGroup]);
    mockExtGroupActiveSet.mockResolvedValue(undefined);
    mockExtUrlsList.mockResolvedValue([
      { id: 'ua', groupId: 'm1', url: 'http://meta', timeoutMs: 5000, priority: 0, linkedServerUrlId: 'srv-1' },
    ]);
    mockGroupsList.mockResolvedValue([group()]);
    mockUrlsList.mockResolvedValue([url({ id: 'srv-1', url: 'http://server-a' })]);

    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.linkedUrlLabel('ua')).toBe('http://server-a');
    expect(result.current.linkedUrlLabel('unknown')).toBeUndefined();
  });

  it('testConnection maps a raw error via friendlyConnError', async () => {
    const metaGroup = { id: 'm1', name: 'M3', providerId: 'm3', credentialsJson: '{}', healthCheckPath: '/api/health' };
    mockExtGroupsList.mockResolvedValue([metaGroup]);
    mockExtGroupActiveSet.mockResolvedValue(undefined);
    mockExtUrlsValidate.mockRejectedValue(new Error('No active server group for metadata'));

    const { result } = renderHook(() => useMetadataServer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.testConnection();
    });
    expect(result.current.connStatus).toBe('error');
    expect(result.current.connMessage).toBe(t.serverConnErrorNoActiveGroup);
  });
});

import { ServerService, ServersService } from './servers.services';

jest.mock('../../bridge/server', () => ({
  ServerBridge: {
    listProviders: jest.fn(),
    listGroups: jest.fn(),
    getGroup: jest.fn(),
    addGroup: jest.fn(),
    updateGroup: jest.fn(),
    removeGroup: jest.fn(),
    setActiveGroup: jest.fn(),
    getActiveGroupId: jest.fn(),
    getGroupUrls: jest.fn(),
    addGroupUrl: jest.fn(),
    updateGroupUrl: jest.fn(),
    removeGroupUrl: jest.fn(),
    validateGroupUrls: jest.fn(),
    reauthenticateActiveGroup: jest.fn(),
  },
}));

import { ServerBridge } from '../../bridge/server';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ServersService.providers.list', () => {
  it('forwards to ServerBridge.listProviders', async () => {
    const providers = [
      {
        id: 'kavita',
        displayName: 'Kavita',
        version: '1.0',
        credentialFields: [{ name: 'apiKey', label: 'Kavita API Key', type: 'string', required: true }],
        defaultHealthCheckPath: '/api/Health',
      },
    ];
    (ServerBridge.listProviders as jest.Mock).mockResolvedValue(providers);
    const result = await ServersService.providers.list();
    expect(ServerBridge.listProviders).toHaveBeenCalledWith();
    expect(result).toBe(providers);
  });
});

describe('ServersService.groups.list', () => {
  it('forwards to ServerBridge.listGroups', async () => {
    const groups = [{ id: 'g1', name: 'Home', providerId: 'kavita', credentialsJson: '{}', healthCheckPath: '/health' }];
    (ServerBridge.listGroups as jest.Mock).mockResolvedValue(groups);
    const result = await ServersService.groups.list();
    expect(ServerBridge.listGroups).toHaveBeenCalledWith();
    expect(result).toBe(groups);
  });
});

describe('ServerService.group', () => {
  it('get forwards groupId to ServerBridge.getGroup', async () => {
    (ServerBridge.getGroup as jest.Mock).mockResolvedValue(null);
    await ServerService.group.get({ groupId: 'g1' });
    expect(ServerBridge.getGroup).toHaveBeenCalledWith('g1');
  });

  it('add forwards args to ServerBridge.addGroup', async () => {
    (ServerBridge.addGroup as jest.Mock).mockResolvedValue({});
    await ServerService.group.add({
      name: 'Home',
      providerId: 'kavita',
      credentialsJson: '{}',
      healthCheckPath: '/health',
    });
    expect(ServerBridge.addGroup).toHaveBeenCalledWith('Home', 'kavita', '{}', '/health');
  });

  it('update forwards args to ServerBridge.updateGroup', async () => {
    (ServerBridge.updateGroup as jest.Mock).mockResolvedValue({});
    await ServerService.group.update({ groupId: 'g1', name: 'Home2' });
    expect(ServerBridge.updateGroup).toHaveBeenCalledWith('g1', 'Home2', undefined, undefined);
  });

  it('remove forwards groupId to ServerBridge.removeGroup', async () => {
    (ServerBridge.removeGroup as jest.Mock).mockResolvedValue(undefined);
    await ServerService.group.remove({ groupId: 'g1' });
    expect(ServerBridge.removeGroup).toHaveBeenCalledWith('g1');
  });

  it('active.set forwards groupId to ServerBridge.setActiveGroup', async () => {
    (ServerBridge.setActiveGroup as jest.Mock).mockResolvedValue(undefined);
    await ServerService.group.active.set({ groupId: 'g1' });
    expect(ServerBridge.setActiveGroup).toHaveBeenCalledWith('g1');
  });

  it('active.get forwards to ServerBridge.getActiveGroupId', async () => {
    (ServerBridge.getActiveGroupId as jest.Mock).mockResolvedValue('g1');
    const result = await ServerService.group.active.get();
    expect(ServerBridge.getActiveGroupId).toHaveBeenCalledWith();
    expect(result).toBe('g1');
  });
});

describe('ServerService.urls', () => {
  it('list forwards groupId to ServerBridge.getGroupUrls', async () => {
    (ServerBridge.getGroupUrls as jest.Mock).mockResolvedValue([]);
    await ServerService.urls.list({ groupId: 'g1' });
    expect(ServerBridge.getGroupUrls).toHaveBeenCalledWith('g1');
  });

  it('add forwards args to ServerBridge.addGroupUrl', async () => {
    (ServerBridge.addGroupUrl as jest.Mock).mockResolvedValue({});
    await ServerService.urls.add({ groupId: 'g1', url: 'http://x', timeoutMs: 5000, priority: 1 });
    expect(ServerBridge.addGroupUrl).toHaveBeenCalledWith('g1', 'http://x', 5000, 1);
  });

  it('update forwards args to ServerBridge.updateGroupUrl, -1 for the omitted numeric fields', async () => {
    (ServerBridge.updateGroupUrl as jest.Mock).mockResolvedValue({});
    await ServerService.urls.update({ groupId: 'g1', urlId: 'u1', url: 'http://y' });
    // timeoutMs / priority default to -1 ("leave unchanged") — the RN bridge can't marshal a
    // null through a primitive number arg.
    expect(ServerBridge.updateGroupUrl).toHaveBeenCalledWith('g1', 'u1', 'http://y', -1, -1);
  });

  it('remove forwards args to ServerBridge.removeGroupUrl', async () => {
    (ServerBridge.removeGroupUrl as jest.Mock).mockResolvedValue(undefined);
    await ServerService.urls.remove({ groupId: 'g1', urlId: 'u1' });
    expect(ServerBridge.removeGroupUrl).toHaveBeenCalledWith('g1', 'u1');
  });

  it('validate forwards groupId to ServerBridge.validateGroupUrls', async () => {
    (ServerBridge.validateGroupUrls as jest.Mock).mockResolvedValue({});
    await ServerService.urls.validate({ groupId: 'g1' });
    expect(ServerBridge.validateGroupUrls).toHaveBeenCalledWith('g1');
  });
});

describe('ServerService.auth', () => {
  it('reauthenticate forwards groupId to ServerBridge.reauthenticateActiveGroup', async () => {
    (ServerBridge.reauthenticateActiveGroup as jest.Mock).mockResolvedValue(undefined);
    await ServerService.auth.reauthenticate({ groupId: 'g1' });
    expect(ServerBridge.reauthenticateActiveGroup).toHaveBeenCalledWith('g1');
  });
});

describe('ServerService.bound', () => {
  it('pre-fills groupId on group.get/update/remove and active.set', async () => {
    (ServerBridge.getGroup as jest.Mock).mockResolvedValue(null);
    (ServerBridge.updateGroup as jest.Mock).mockResolvedValue({});
    (ServerBridge.removeGroup as jest.Mock).mockResolvedValue(undefined);
    (ServerBridge.setActiveGroup as jest.Mock).mockResolvedValue(undefined);
    const server = ServerService.bound({ groupId: 'g1' });
    await server.group.get();
    await server.group.update({ name: 'Home2' });
    await server.group.remove();
    await server.group.active.set();
    expect(ServerBridge.getGroup).toHaveBeenCalledWith('g1');
    expect(ServerBridge.updateGroup).toHaveBeenCalledWith('g1', 'Home2', undefined, undefined);
    expect(ServerBridge.removeGroup).toHaveBeenCalledWith('g1');
    expect(ServerBridge.setActiveGroup).toHaveBeenCalledWith('g1');
  });

  it('excludes group.add, since a group id does not exist yet at creation time', () => {
    const server = ServerService.bound({ groupId: 'g1' });
    expect('add' in server.group).toBe(false);
  });

  it('pre-fills groupId on urls and auth', async () => {
    (ServerBridge.getGroupUrls as jest.Mock).mockResolvedValue([]);
    (ServerBridge.reauthenticateActiveGroup as jest.Mock).mockResolvedValue(undefined);
    const server = ServerService.bound({ groupId: 'g1' });
    await server.urls.list();
    await server.auth.reauthenticate();
    expect(ServerBridge.getGroupUrls).toHaveBeenCalledWith('g1');
    expect(ServerBridge.reauthenticateActiveGroup).toHaveBeenCalledWith('g1');
  });

  it('lets a caller override a fixed field for one call', async () => {
    (ServerBridge.getGroup as jest.Mock).mockResolvedValue(null);
    const server = ServerService.bound({ groupId: 'g1' });
    await server.group.get({ groupId: 'g2' });
    expect(ServerBridge.getGroup).toHaveBeenCalledWith('g2');
  });

  it('does not expose a nested bound of its own', () => {
    const server = ServerService.bound({ groupId: 'g1' });
    expect('bound' in server).toBe(false);
  });
});

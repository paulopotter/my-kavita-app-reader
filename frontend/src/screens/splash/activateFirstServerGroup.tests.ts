import { activateFirstServerGroup } from './activateFirstServerGroup';

jest.mock('../../shared/services/servers/servers.services', () => ({
  ServersService: { groups: { list: jest.fn() } },
  ServerService: { group: { active: { set: jest.fn() } } },
}));

import { ServerService, ServersService } from '../../shared/services/servers/servers.services';

const mockList = ServersService.groups.list as jest.Mock;
const mockSetActive = ServerService.group.active.set as jest.Mock;

describe('activateFirstServerGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('activates the first group when one or more exist', async () => {
    mockList.mockResolvedValue([{ id: 'g1', name: 'A' }, { id: 'g2', name: 'B' }]);
    mockSetActive.mockResolvedValue(undefined);
    await activateFirstServerGroup();
    expect(mockSetActive).toHaveBeenCalledWith({ groupId: 'g1' });
  });

  it('does nothing when no group exists', async () => {
    mockList.mockResolvedValue([]);
    await activateFirstServerGroup();
    expect(mockSetActive).not.toHaveBeenCalled();
  });

  it('never throws when the list call rejects', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    await expect(activateFirstServerGroup()).resolves.toBeUndefined();
    expect(mockSetActive).not.toHaveBeenCalled();
  });

  it('never throws when the activate call rejects', async () => {
    mockList.mockResolvedValue([{ id: 'g1', name: 'A' }]);
    mockSetActive.mockRejectedValue(new Error('boom'));
    await expect(activateFirstServerGroup()).resolves.toBeUndefined();
  });
});

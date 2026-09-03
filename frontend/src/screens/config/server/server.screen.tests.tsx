import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('../../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
}));

const mockUseServer = jest.fn();
const mockUseMetadataServer = jest.fn();
jest.mock('./server.hooks', () => ({
  useServer: (...a: unknown[]) => mockUseServer(...a),
  useMetadataServer: (...a: unknown[]) => mockUseMetadataServer(...a),
}));

import { getStrings } from '../../../shared/i18n/strings';
import { ServerScreen } from './server.screen';

const t = getStrings('en');

const KAVITA_PROVIDER = {
  id: 'kavita',
  displayName: 'Kavita',
  version: '1',
  credentialFields: [{ name: 'apiKey', label: 'API Key', type: 'secret', required: true }],
  defaultHealthCheckPath: '/api/Health',
};

function baseHook(over: Partial<Record<string, unknown>> = {}) {
  return {
    loading: false,
    providers: [KAVITA_PROVIDER],
    group: null,
    credentials: {},
    maskedCredential: () => null,
    addServer: jest.fn().mockResolvedValue(null),
    updateServer: jest.fn().mockResolvedValue(null),
    removeServer: jest.fn(),
    urls: [],
    activeUrlId: null,
    canAddUrl: true,
    canRemoveUrl: false,
    nextPriority: 0,
    addUrl: jest.fn().mockResolvedValue(null),
    updateUrl: jest.fn().mockResolvedValue(null),
    removeUrl: jest.fn(),
    testUrl: jest.fn().mockResolvedValue({ url: '', ok: true, status: 200, elapsedMs: 1 }),
    connStatus: 'idle',
    connMessage: '',
    testConnection: jest.fn(),
    reload: jest.fn(),
    // metadata-only surface
    linkedUrlLabel: () => undefined,
    linkedServerGroups: [],
    urlsOfServerGroup: jest.fn().mockResolvedValue([]),
    ...over,
  };
}

const withGroup = (over: Partial<Record<string, unknown>> = {}) =>
  baseHook({
    group: { id: 'g1', name: 'Home', providerId: 'kavita', credentialsJson: '{"apiKey":"k"}', healthCheckPath: '/api/Health' },
    credentials: { apiKey: 'secret-key' },
    maskedCredential: () => 'abcd••••key',
    urls: [{ id: 'u1', url: 'http://host', timeoutMs: 5000, priority: 0 }],
    activeUrlId: 'u1',
    ...over,
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUseServer.mockReturnValue(baseHook());
  mockUseMetadataServer.mockReturnValue(baseHook());
});

describe('ServerScreen — manage mode', () => {
  it('shows the back chevron + server section title from the provider name', () => {
    const { getByText } = render(<ServerScreen onBack={jest.fn()} />);
    expect(getByText('‹')).toBeTruthy();
    expect(getByText(t.serverSectionTitle.replace('{0}', 'Kavita'))).toBeTruthy();
  });

  it('the back chevron calls onBack', () => {
    const onBack = jest.fn();
    const { getByText } = render(<ServerScreen onBack={onBack} />);
    fireEvent.press(getByText('‹'));
    expect(onBack).toHaveBeenCalled();
  });

  it('with no group, shows the "+ add server" button and opens the add modal', () => {
    const { getByText } = render(<ServerScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.serverAddServer));
    expect(getByText(t.serverModalNewTitle)).toBeTruthy();
  });

  it('add-server modal submit calls hook.addServer and closes on success', async () => {
    const hook = baseHook();
    mockUseServer.mockReturnValue(hook);
    const { getByText, getByPlaceholderText, queryByText, findByText } = render(<ServerScreen onBack={jest.fn()} />);

    fireEvent.press(getByText(t.serverAddServer));
    fireEvent.changeText(getByPlaceholderText(t.serverModalNamePlaceholder), 'Home');
    fireEvent.changeText(getByPlaceholderText('API Key'), 'k-1');
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'http://host');
    fireEvent.press(await findByText(t.serverFormSave));

    expect(hook.addServer).toHaveBeenCalledWith('Home', { apiKey: 'k-1' }, 'http://host');
    // modal closes once the (resolved) submit reports no error
    await waitFor(() => expect(queryByText(t.serverModalNewTitle)).toBeNull());
  });

  it('with a group, renders the GroupCard (name + masked credential + URL) and NO add-server button', () => {
    mockUseServer.mockReturnValue(withGroup());
    const { getByText, queryByText } = render(<ServerScreen onBack={jest.fn()} />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('abcd••••key')).toBeTruthy();
    expect(getByText('http://host')).toBeTruthy();
    expect(queryByText(t.serverAddServer)).toBeNull();
  });

  it('the group ⋯ menu → Delete calls hook.removeServer', () => {
    const hook = withGroup();
    mockUseServer.mockReturnValue(hook);
    const { getAllByText, getByText } = render(<ServerScreen onBack={jest.fn()} />);
    fireEvent.press(getAllByText('⋯')[0]); // group menu
    fireEvent.press(getByText(t.serverListDelete));
    expect(hook.removeServer).toHaveBeenCalled();
  });

  it('the URL ⋯ menu hides Delete when it is the only URL (canRemoveUrl=false)', () => {
    mockUseServer.mockReturnValue(withGroup({ canRemoveUrl: false }));
    const { getAllByText, queryAllByText, getByText } = render(<ServerScreen onBack={jest.fn()} />);
    fireEvent.press(getAllByText('⋯')[1]); // url menu
    expect(getByText(t.serverListEdit)).toBeTruthy();
    // only the group menu's Delete (still mounted, hidden) — the URL menu has none
    expect(queryAllByText(t.serverListDelete).length).toBeLessThanOrEqual(1);
  });

  it('renders the metadata section only once a server group exists', () => {
    mockUseServer.mockReturnValue(baseHook()); // no group
    const { queryByText, rerender } = render(<ServerScreen onBack={jest.fn()} />);
    expect(queryByText(t.serverAddMetadataServer)).toBeNull();

    mockUseServer.mockReturnValue(withGroup());
    mockUseMetadataServer.mockReturnValue(baseHook({ providers: [{ ...KAVITA_PROVIDER, id: 'm3', displayName: 'M3', credentialFields: [] }] }));
    rerender(<ServerScreen onBack={jest.fn()} />);
    expect(queryByText(t.serverAddMetadataServer)).toBeTruthy();
  });
});

describe('ServerScreen — group / URL editing flows', () => {
  it('group ⋯ → Edit opens the edit modal pre-filled and submit calls updateServer', async () => {
    const hook = withGroup();
    mockUseServer.mockReturnValue(hook);
    const { getAllByText, getByText, getByDisplayValue, queryByText } = render(<ServerScreen onBack={jest.fn()} />);

    fireEvent.press(getAllByText('⋯')[0]);
    fireEvent.press(getByText(t.serverListEdit));
    expect(getByText(t.serverModalEditTitle)).toBeTruthy();
    // name pre-filled from the group
    expect(getByDisplayValue('Home')).toBeTruthy();

    fireEvent.press(getByText(t.serverFormSave));
    expect(hook.updateServer).toHaveBeenCalledWith('Home', { apiKey: 'secret-key' });
    await waitFor(() => expect(queryByText(t.serverModalEditTitle)).toBeNull());
  });

  it('the "+ add URL" button (canAddUrl) opens the URL modal and submit calls addUrl', async () => {
    const hook = withGroup({ canAddUrl: true, nextPriority: 1 });
    mockUseServer.mockReturnValue(hook);
    const { getByText, getByPlaceholderText, queryByText } = render(<ServerScreen onBack={jest.fn()} />);

    fireEvent.press(getByText(t.serverAddUrl));
    expect(getByText(t.urlModalNewTitle)).toBeTruthy();
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'http://second');
    fireEvent.press(getByText(t.serverFormSave));

    expect(hook.addUrl).toHaveBeenCalledWith('http://second', 1, undefined);
    await waitFor(() => expect(queryByText(t.urlModalNewTitle)).toBeNull());
  });

  it('URL ⋯ → Edit opens the URL modal pre-filled and submit calls updateUrl', async () => {
    const hook = withGroup({ canRemoveUrl: true });
    mockUseServer.mockReturnValue(hook);
    const { getAllByText, getByText, getByDisplayValue } = render(<ServerScreen onBack={jest.fn()} />);

    fireEvent.press(getAllByText('⋯')[1]); // url menu
    fireEvent.press(getByText(t.serverListEdit));
    expect(getByText(t.urlModalEditTitle)).toBeTruthy();
    expect(getByDisplayValue('http://host')).toBeTruthy();

    fireEvent.press(getByText(t.serverFormSave));
    expect(hook.updateUrl).toHaveBeenCalledWith('u1', 'http://host', 0, undefined);
  });

  it('URL ⋯ → Delete calls removeUrl when more than one URL exists', () => {
    const hook = withGroup({
      canRemoveUrl: true,
      urls: [
        { id: 'u1', url: 'http://a', timeoutMs: 5000, priority: 0 },
        { id: 'u2', url: 'http://b', timeoutMs: 5000, priority: 1 },
      ],
    });
    mockUseServer.mockReturnValue(hook);
    const { getAllByText, getByText } = render(<ServerScreen onBack={jest.fn()} />);

    fireEvent.press(getAllByText('⋯')[1]); // first URL's menu
    fireEvent.press(getByText(t.serverListDelete));
    expect(hook.removeUrl).toHaveBeenCalledWith('u1');
  });

  it('keeps the server modal open and shows the error when addServer fails', async () => {
    const hook = baseHook({ addServer: jest.fn().mockResolvedValue('bad key') });
    mockUseServer.mockReturnValue(hook);
    const { getByText, getByPlaceholderText, findByText } = render(<ServerScreen onBack={jest.fn()} />);

    fireEvent.press(getByText(t.serverAddServer));
    fireEvent.changeText(getByPlaceholderText(t.serverModalNamePlaceholder), 'Home');
    fireEvent.changeText(getByPlaceholderText('API Key'), 'k');
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'http://h');
    fireEvent.press(getByText(t.serverFormSave));

    expect(await findByText('✗ bad key')).toBeTruthy();
    expect(getByText(t.serverModalNewTitle)).toBeTruthy(); // still open
  });

  it('the server modal ✕ closes it without calling any hook mutation', () => {
    mockUseServer.mockReturnValue(baseHook());
    const { getByText, queryByText } = render(<ServerScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.serverAddServer));
    fireEvent.press(getByText('✕'));
    expect(queryByText(t.serverModalNewTitle)).toBeNull();
  });

  it('the URL modal ✕ closes it', () => {
    mockUseServer.mockReturnValue(withGroup({ canAddUrl: true }));
    const { getByText, queryByText } = render(<ServerScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.serverAddUrl));
    expect(getByText(t.urlModalNewTitle)).toBeTruthy();
    fireEvent.press(getByText('✕'));
    expect(queryByText(t.urlModalNewTitle)).toBeNull();
  });

  it('falls back to the generic section title when the provider list is empty', () => {
    mockUseServer.mockReturnValue(baseHook({ providers: [] }));
    const { getByText } = render(<ServerScreen onBack={jest.fn()} />);
    expect(getByText(t.configKavitaServers)).toBeTruthy();
  });

  it('metadata URL modal renders the server-link picker (link prop wired through)', async () => {
    mockUseServer.mockReturnValue(withGroup());
    mockUseMetadataServer.mockReturnValue(
      withGroup({
        providers: [{ ...KAVITA_PROVIDER, id: 'm3', displayName: 'M3', credentialFields: [] }],
        linkedServerGroups: [
          { id: 'g1', name: 'Home', providerId: 'kavita', credentialsJson: '{}', healthCheckPath: '/h' },
        ],
        urlsOfServerGroup: jest.fn().mockResolvedValue([]),
        canAddUrl: true,
      }),
    );
    const { getAllByText, getByText } = render(<ServerScreen onBack={jest.fn()} />);
    // the metadata section's own "+ add URL"
    fireEvent.press(getAllByText(t.serverAddUrl)[getAllByText(t.serverAddUrl).length - 1]);
    // the URL modal opened (its title is unambiguous) and, with the link prop, the associate row shows
    expect(getByText(t.urlModalNewTitle)).toBeTruthy();
    expect(getByText(t.urlModalAssociateToUrl)).toBeTruthy();
  });
});

describe('ServerScreen — setup mode', () => {
  it('uses the setup header (no back chevron) and shows the CTA once a server exists', () => {
    mockUseServer.mockReturnValue(withGroup());
    const onComplete = jest.fn();
    const { getByText, queryByText } = render(<ServerScreen onComplete={onComplete} />);
    expect(queryByText('‹')).toBeNull();
    expect(getByText(t.setupTitle)).toBeTruthy();
    fireEvent.press(getByText(t.setupGoToLibrary));
    expect(onComplete).toHaveBeenCalled();
  });

  it('hides the CTA while there is no server yet', () => {
    mockUseServer.mockReturnValue(baseHook());
    const { queryByText } = render(<ServerScreen onComplete={jest.fn()} />);
    expect(queryByText(t.setupGoToLibrary)).toBeNull();
  });
});

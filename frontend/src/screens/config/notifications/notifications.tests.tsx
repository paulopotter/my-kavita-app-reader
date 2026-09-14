import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('../../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
}));

const mockUseNotificationChannel = jest.fn();
const mockUseNotificationPrefs = jest.fn();
const mockUseNotificationGroups = jest.fn();
const mockUseNotificationServiceStatus = jest.fn();
jest.mock('./notifications.hooks', () => ({
  useNotificationChannel: (...a: unknown[]) => mockUseNotificationChannel(...a),
  useNotificationPrefs: (...a: unknown[]) => mockUseNotificationPrefs(...a),
  useNotificationGroups: (...a: unknown[]) => mockUseNotificationGroups(...a),
  useNotificationServiceStatus: (...a: unknown[]) => mockUseNotificationServiceStatus(...a),
  MAX_URLS_PER_GROUP: 2,
  RETENTION_MIN_DAYS: 1,
  RETENTION_MAX_DAYS: 15,
}));

import { getStrings } from '../../../shared/i18n/strings';
import { NotificationsScreen } from './notifications.screen';

const t = getStrings('en');

function channelHook(over: Partial<Record<string, unknown>> = {}) {
  return { enabled: true, openSettings: jest.fn(), ...over };
}

function prefsHook(over: Partial<Record<string, unknown>> = {}) {
  return {
    loading: false,
    scopeAll: false,
    scopeFollowedOnly: false,
    groupAcrossSeries: false,
    retentionDays: 7,
    collapseSerialChaptersNotification: false,
    setScopeAll: jest.fn(),
    setScopeFollowedOnly: jest.fn(),
    setGroupAcrossSeries: jest.fn(),
    setRetentionDays: jest.fn(),
    setCollapseSerialChaptersNotification: jest.fn(),
    ...over,
  };
}

function groupsHook(over: Partial<Record<string, unknown>> = {}) {
  return {
    loading: false,
    group: null,
    canAddGroup: true,
    addGroup: jest.fn().mockResolvedValue(null),
    editGroup: jest.fn().mockResolvedValue(null),
    removeGroup: jest.fn(),
    urls: [],
    activeUrlId: null,
    canAddUrl: true,
    canRemoveUrl: false,
    nextPriority: 0,
    linkedUrlLabel: jest.fn(() => undefined),
    addUrl: jest.fn().mockResolvedValue(null),
    updateUrl: jest.fn().mockResolvedValue(null),
    removeUrl: jest.fn(),
    testUrl: jest.fn().mockResolvedValue({ url: '', ok: true, status: 200, elapsedMs: 1 }),
    connStatus: 'idle',
    connMessage: '',
    testConnection: jest.fn(),
    linkedServerGroups: [],
    urlsOfServerGroup: jest.fn().mockResolvedValue([]),
    reload: jest.fn(),
    ...over,
  };
}

function serviceStatusHook(over: Partial<Record<string, unknown>> = {}) {
  return { status: 'connected', ...over };
}

const homeGroup = { id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' };
const homeUrl = { id: 'u1', groupId: 'g1', url: 'https://ntfy.sh', timeoutMs: 5000, priority: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNotificationChannel.mockReturnValue(channelHook());
  mockUseNotificationPrefs.mockReturnValue(prefsHook());
  mockUseNotificationGroups.mockReturnValue(groupsHook());
  mockUseNotificationServiceStatus.mockReturnValue(serviceStatusHook());
});

describe('NotificationsScreen', () => {
  it('shows the back chevron and calls onBack when pressed', () => {
    const onBack = jest.fn();
    const { getByText } = render(<NotificationsScreen onBack={onBack} />);
    fireEvent.press(getByText('‹'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows the "on" channel pill and opens system settings when the row is tapped', () => {
    const openSettings = jest.fn();
    mockUseNotificationChannel.mockReturnValue(channelHook({ enabled: true, openSettings }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText(t.notificationsChannelStateOn)).toBeTruthy();
    fireEvent.press(getByText(t.notificationsChannelRowLabel));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('shows the "off" channel pill and hides the rest of the screen when disabled', () => {
    mockUseNotificationChannel.mockReturnValue(channelHook({ enabled: false }));
    const { getByText, queryByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText(t.notificationsChannelStateOff)).toBeTruthy();
    expect(queryByText(t.notificationsScopeAll)).toBeNull();
    expect(queryByText(t.notificationsGroupsTitle)).toBeNull();
  });

  it('shows neither pill state nor toggles while the channel/prefs/groups are still loading', () => {
    mockUseNotificationChannel.mockReturnValue(channelHook({ enabled: null }));
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ loading: true }));
    mockUseNotificationGroups.mockReturnValue(groupsHook({ loading: true }));
    const { queryByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(queryByText(t.notificationsChannelStateOn)).toBeNull();
    expect(queryByText(t.notificationsChannelStateOff)).toBeNull();
    expect(queryByText(t.notificationsScopeAll)).toBeNull();
  });

  it('toggling "all series" via the row (not just the Switch) calls setScopeAll', () => {
    const setScopeAll = jest.fn();
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ setScopeAll }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.notificationsScopeAll));
    expect(setScopeAll).toHaveBeenCalledWith(true);
  });

  it('toggling "followed only" via the row calls setScopeFollowedOnly', () => {
    const setScopeFollowedOnly = jest.fn();
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ setScopeFollowedOnly }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.notificationsScopeFollowedOnly));
    expect(setScopeFollowedOnly).toHaveBeenCalledWith(true);
  });

  it('"followed only" row is disabled when scopeAll is on', () => {
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ scopeAll: true }));
    const { UNSAFE_getAllByType } = render(<NotificationsScreen onBack={jest.fn()} />);
    const { Switch } = require('react-native');
    const switches = UNSAFE_getAllByType(Switch);
    expect(switches[1].props.disabled).toBe(true);
  });

  it('toggling "group across series" via the row calls setGroupAcrossSeries', () => {
    const setGroupAcrossSeries = jest.fn();
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ setGroupAcrossSeries }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.notificationsGroupAcrossSeries));
    expect(setGroupAcrossSeries).toHaveBeenCalledWith(true);
  });

  it('toggling "collapse serial chapters" via the row calls setCollapseSerialChaptersNotification', () => {
    const setCollapseSerialChaptersNotification = jest.fn();
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ setCollapseSerialChaptersNotification }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.notificationsCollapseSerialChaptersNotification));
    expect(setCollapseSerialChaptersNotification).toHaveBeenCalledWith(true);
  });

  it('the retention stepper increments/decrements via setRetentionDays', () => {
    const setRetentionDays = jest.fn();
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ retentionDays: 7, setRetentionDays }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText('+'));
    expect(setRetentionDays).toHaveBeenCalledWith(8);
    fireEvent.press(getByText('−'));
    expect(setRetentionDays).toHaveBeenCalledWith(6);
  });

  it('renders the group card with its urls', () => {
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, urls: [homeUrl] }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('https://ntfy.sh')).toBeTruthy();
  });

  it('shows the "Connected" pill when the foreground service is connected', () => {
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, urls: [homeUrl] }));
    mockUseNotificationServiceStatus.mockReturnValue(serviceStatusHook({ status: 'connected' }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText(t.notificationsServiceStatusConnected)).toBeTruthy();
  });

  it('shows the "Stopped" pill when the foreground service is not running', () => {
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, urls: [homeUrl] }));
    mockUseNotificationServiceStatus.mockReturnValue(serviceStatusHook({ status: 'stopped' }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText(t.notificationsServiceStatusStopped)).toBeTruthy();
  });

  it('hides the status pill until the first read resolves', () => {
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, urls: [homeUrl] }));
    mockUseNotificationServiceStatus.mockReturnValue(serviceStatusHook({ status: null }));
    const { queryByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(queryByText(t.notificationsServiceStatusStopped)).toBeNull();
    expect(queryByText(t.notificationsServiceStatusConnected)).toBeNull();
  });

  it('calls testConnection when the group card\'s test-connection button is pressed', () => {
    const testConnection = jest.fn();
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, urls: [homeUrl], testConnection }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.setupTestConnection));
    expect(testConnection).toHaveBeenCalled();
  });

  it('shows the success message once testConnection resolves ok', () => {
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({ group: homeGroup, urls: [homeUrl], connStatus: 'ok', connMessage: 'https://ntfy.sh' }),
    );
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText(`✓ ${t.setupConnectionOk}: https://ntfy.sh`)).toBeTruthy();
  });

  it('shows the error message when testConnection fails', () => {
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({ group: homeGroup, urls: [homeUrl], connStatus: 'error', connMessage: 'boom' }),
    );
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText('✗ boom')).toBeTruthy();
  });

  it('hides the add-group button once a group exists (single-group rule)', () => {
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, canAddGroup: false }));
    const { queryByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(queryByText(t.notificationsAddGroup)).toBeNull();
  });

  it('opens the add-group modal and submits via addGroup', async () => {
    const addGroup = jest.fn().mockResolvedValue(null);
    mockUseNotificationGroups.mockReturnValue(groupsHook({ addGroup }));
    const { getByText, getByPlaceholderText } = render(<NotificationsScreen onBack={jest.fn()} />);

    fireEvent.press(getByText(t.notificationsAddGroup));
    expect(getByText(t.notificationsGroupModalNewTitle)).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText(t.notificationsGroupModalNamePlaceholder), 'Home');
    fireEvent.changeText(getByPlaceholderText(t.notificationsGroupModalTopicPlaceholder), 'chapters');
    fireEvent.press(getByText(t.serverFormSave));

    expect(addGroup).toHaveBeenCalledWith('Home', 'chapters', undefined);
  });

  it('shows the submit error and keeps the add-group modal open when addGroup fails', async () => {
    const addGroup = jest.fn().mockResolvedValue('boom');
    mockUseNotificationGroups.mockReturnValue(groupsHook({ addGroup }));
    const { getByText, getByPlaceholderText, findByText } = render(<NotificationsScreen onBack={jest.fn()} />);

    fireEvent.press(getByText(t.notificationsAddGroup));
    fireEvent.changeText(getByPlaceholderText(t.notificationsGroupModalNamePlaceholder), 'Home');
    fireEvent.changeText(getByPlaceholderText(t.notificationsGroupModalTopicPlaceholder), 'chapters');
    fireEvent.press(getByText(t.serverFormSave));

    expect(await findByText('✗ boom')).toBeTruthy();
  });

  it('closes the add-group modal via its close button', () => {
    const { getByText, queryByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.notificationsAddGroup));
    expect(getByText(t.notificationsGroupModalNewTitle)).toBeTruthy();
    fireEvent.press(getByText('✕'));
    expect(queryByText(t.notificationsGroupModalNewTitle)).toBeNull();
  });

  it('opens the edit-group modal pre-filled, and submits via editGroup', async () => {
    const editGroup = jest.fn().mockResolvedValue(null);
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, editGroup }));
    const { getByText, getByDisplayValue } = render(<NotificationsScreen onBack={jest.fn()} />);

    fireEvent.press(getByText('⋯'));
    fireEvent.press(getByText(t.serverListEdit));
    expect(getByText(t.notificationsGroupModalEditTitle)).toBeTruthy();
    expect(getByDisplayValue('Home')).toBeTruthy();
    expect(getByDisplayValue('chapters')).toBeTruthy();

    fireEvent.press(getByText(t.serverFormSave));
    expect(editGroup).toHaveBeenCalledWith('Home', 'chapters', undefined);
  });

  it("shows a URL's linked-server sub-line via linkedUrlLabel", () => {
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({ group: homeGroup, urls: [homeUrl], linkedUrlLabel: jest.fn(() => 'http://192.168.1.10:5000') }),
    );
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText('↳ http://192.168.1.10:5000')).toBeTruthy();
  });

  it('removing the group via its context menu calls removeGroup', () => {
    const removeGroup = jest.fn();
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, removeGroup }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText('⋯'));
    fireEvent.press(getByText(t.serverListDelete));
    expect(removeGroup).toHaveBeenCalledWith('g1');
  });

  it('dismisses the group context menu by tapping the overlay', () => {
    const removeGroup = jest.fn();
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, removeGroup }));
    const { getByText, queryByText, UNSAFE_getAllByType } = render(<NotificationsScreen onBack={jest.fn()} />);
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(getByText('⋯'));
    expect(getByText(t.serverListDelete)).toBeTruthy();
    const overlays = UNSAFE_getAllByType(TouchableOpacity).filter(el => el.props.activeOpacity === 1);
    fireEvent.press(overlays[0]);
    expect(removeGroup).not.toHaveBeenCalled();
    expect(queryByText(t.serverListDelete)).toBeNull();
  });

  it('opens the add-URL modal for the group and submits via addUrl', async () => {
    const addUrl = jest.fn().mockResolvedValue(null);
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, addUrl }));
    const { getByText, getByPlaceholderText } = render(<NotificationsScreen onBack={jest.fn()} />);

    fireEvent.press(getByText(t.serverAddUrl));
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'https://ntfy.sh');
    fireEvent.press(getByText(t.serverFormSave));

    expect(addUrl).toHaveBeenCalledWith('https://ntfy.sh', 0, undefined);
  });

  it('shows the submit error and keeps the add-URL modal open when addUrl fails', async () => {
    const addUrl = jest.fn().mockResolvedValue('boom');
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, addUrl }));
    const { getByText, getByPlaceholderText, findByText } = render(<NotificationsScreen onBack={jest.fn()} />);

    fireEvent.press(getByText(t.serverAddUrl));
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'https://ntfy.sh');
    fireEvent.press(getByText(t.serverFormSave));

    expect(await findByText('✗ boom')).toBeTruthy();
  });

  it('closes the add-URL modal via its close button', () => {
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup }));
    const { getByText, queryByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.serverAddUrl));
    expect(getByText(t.urlModalNewTitle)).toBeTruthy();
    fireEvent.press(getByText('✕'));
    expect(queryByText(t.urlModalNewTitle)).toBeNull();
  });

  it('opens the edit-URL modal pre-filled, and submits via updateUrl', async () => {
    const updateUrl = jest.fn().mockResolvedValue(null);
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, urls: [homeUrl], canRemoveUrl: false, updateUrl }));
    const { getByText, getAllByText, getByDisplayValue } = render(<NotificationsScreen onBack={jest.fn()} />);
    // getAllByText('⋯') — group header + the URL row.
    fireEvent.press(getAllByText('⋯')[1]);
    fireEvent.press(getByText(t.serverListEdit));
    expect(getByText(t.urlModalEditTitle)).toBeTruthy();
    expect(getByDisplayValue('https://ntfy.sh')).toBeTruthy();

    fireEvent.press(getByText(t.serverFormSave));
    expect(updateUrl).toHaveBeenCalledWith('u1', 'https://ntfy.sh', 0, undefined);
  });

  it('removing a URL via its context menu calls removeUrl when canRemoveUrl is true', () => {
    const removeUrl = jest.fn();
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, urls: [homeUrl], canRemoveUrl: true, removeUrl }));
    const { getByText, getAllByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getAllByText('⋯')[1]);
    fireEvent.press(getByText(t.serverListDelete));
    expect(removeUrl).toHaveBeenCalledWith('u1');
  });

  it('hides the delete option in the URL menu when canRemoveUrl is false', () => {
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, urls: [homeUrl], canRemoveUrl: false }));
    const { getAllByText, queryByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getAllByText('⋯')[1]);
    expect(queryByText(t.serverListDelete)).toBeNull();
  });

  it('dismisses the URL context menu by tapping the overlay', () => {
    const removeUrl = jest.fn();
    mockUseNotificationGroups.mockReturnValue(groupsHook({ group: homeGroup, urls: [homeUrl], canRemoveUrl: true, removeUrl }));
    const { getAllByText, queryByText, UNSAFE_getAllByType } = render(<NotificationsScreen onBack={jest.fn()} />);
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(getAllByText('⋯')[1]);
    expect(queryByText(t.serverListDelete)).toBeTruthy();
    const overlays = UNSAFE_getAllByType(TouchableOpacity).filter(el => el.props.activeOpacity === 1);
    fireEvent.press(overlays[overlays.length - 1]);
    expect(removeUrl).not.toHaveBeenCalled();
    expect(queryByText(t.serverListDelete)).toBeNull();
  });
});

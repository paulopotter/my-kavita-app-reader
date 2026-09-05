import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('../../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
}));

const mockUseNotificationChannel = jest.fn();
const mockUseNotificationPrefs = jest.fn();
const mockUseNotificationGroups = jest.fn();
jest.mock('./notifications.hooks', () => ({
  useNotificationChannel: (...a: unknown[]) => mockUseNotificationChannel(...a),
  useNotificationPrefs: (...a: unknown[]) => mockUseNotificationPrefs(...a),
  useNotificationGroups: (...a: unknown[]) => mockUseNotificationGroups(...a),
  MAX_URLS_PER_GROUP: 2,
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
    retentionDays: 30,
    setScopeAll: jest.fn(),
    setScopeFollowedOnly: jest.fn(),
    setGroupAcrossSeries: jest.fn(),
    setRetentionDays: jest.fn(),
    ...over,
  };
}

function groupsHook(over: Partial<Record<string, unknown>> = {}) {
  return {
    loading: false,
    groups: [],
    addGroup: jest.fn().mockResolvedValue(null),
    removeGroup: jest.fn(),
    urlsByGroup: {},
    canAddUrl: () => true,
    canRemoveUrl: () => false,
    nextPriority: () => 0,
    addUrl: jest.fn().mockResolvedValue(null),
    removeUrl: jest.fn(),
    reload: jest.fn(),
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNotificationChannel.mockReturnValue(channelHook());
  mockUseNotificationPrefs.mockReturnValue(prefsHook());
  mockUseNotificationGroups.mockReturnValue(groupsHook());
});

describe('NotificationsScreen', () => {
  it('shows the back chevron and calls onBack when pressed', () => {
    const onBack = jest.fn();
    const { getByText } = render(<NotificationsScreen onBack={onBack} />);
    fireEvent.press(getByText('‹'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows the channel state and calls openSettings when the button is pressed', () => {
    const openSettings = jest.fn();
    mockUseNotificationChannel.mockReturnValue(channelHook({ enabled: true, openSettings }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText(t.notificationsChannelStateOn)).toBeTruthy();
    fireEvent.press(getByText(t.notificationsChannelOpenSettings));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('shows the "off" channel state when disabled', () => {
    mockUseNotificationChannel.mockReturnValue(channelHook({ enabled: false }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText(t.notificationsChannelStateOff)).toBeTruthy();
  });

  it('toggling "all series" calls setScopeAll', () => {
    const setScopeAll = jest.fn();
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ setScopeAll }));
    const { UNSAFE_getAllByType } = render(<NotificationsScreen onBack={jest.fn()} />);
    const { Switch } = require('react-native');
    fireEvent(UNSAFE_getAllByType(Switch)[0], 'valueChange', true);
    expect(setScopeAll).toHaveBeenCalledWith(true);
  });

  it('toggling "followed only" calls setScopeFollowedOnly', () => {
    const setScopeFollowedOnly = jest.fn();
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ setScopeFollowedOnly }));
    const { UNSAFE_getAllByType } = render(<NotificationsScreen onBack={jest.fn()} />);
    const { Switch } = require('react-native');
    fireEvent(UNSAFE_getAllByType(Switch)[1], 'valueChange', true);
    expect(setScopeFollowedOnly).toHaveBeenCalledWith(true);
  });

  it('toggling "group across series" calls setGroupAcrossSeries', () => {
    const setGroupAcrossSeries = jest.fn();
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ setGroupAcrossSeries }));
    const { UNSAFE_getAllByType } = render(<NotificationsScreen onBack={jest.fn()} />);
    const { Switch } = require('react-native');
    fireEvent(UNSAFE_getAllByType(Switch)[2], 'valueChange', true);
    expect(setGroupAcrossSeries).toHaveBeenCalledWith(true);
  });

  it('the retention stepper increments/decrements via setRetentionDays', () => {
    const setRetentionDays = jest.fn();
    mockUseNotificationPrefs.mockReturnValue(prefsHook({ retentionDays: 30, setRetentionDays }));
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText('+'));
    expect(setRetentionDays).toHaveBeenCalledWith(31);
    fireEvent.press(getByText('−'));
    expect(setRetentionDays).toHaveBeenCalledWith(29);
  });

  it('renders a group card for each group with its urls', () => {
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({
        groups: [{ id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' }],
        urlsByGroup: { g1: [{ id: 'u1', groupId: 'g1', url: 'https://ntfy.sh', timeoutMs: 5000, priority: 0 }] },
      }),
    );
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('https://ntfy.sh')).toBeTruthy();
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

    expect(addGroup).toHaveBeenCalledWith('Home', 'chapters');
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

  it('removing a group via its context menu calls removeGroup', () => {
    const removeGroup = jest.fn();
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({ groups: [{ id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' }], removeGroup }),
    );
    const { getByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText('⋯'));
    fireEvent.press(getByText(t.serverListDelete));
    expect(removeGroup).toHaveBeenCalledWith('g1');
  });

  it('opens the add-URL modal for a group and submits via addUrl', async () => {
    const addUrl = jest.fn().mockResolvedValue(null);
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({ groups: [{ id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' }], addUrl }),
    );
    const { getByText, getByPlaceholderText } = render(<NotificationsScreen onBack={jest.fn()} />);

    fireEvent.press(getByText(t.serverAddUrl));
    fireEvent.changeText(getByPlaceholderText(t.notificationsUrlModalUrlPlaceholder), 'https://ntfy.sh');
    fireEvent.press(getByText(t.serverFormSave));

    expect(addUrl).toHaveBeenCalledWith('g1', 'https://ntfy.sh', 0);
  });

  it('shows the submit error and keeps the add-URL modal open when addUrl fails', async () => {
    const addUrl = jest.fn().mockResolvedValue('boom');
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({ groups: [{ id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' }], addUrl }),
    );
    const { getByText, getByPlaceholderText, findByText } = render(<NotificationsScreen onBack={jest.fn()} />);

    fireEvent.press(getByText(t.serverAddUrl));
    fireEvent.changeText(getByPlaceholderText(t.notificationsUrlModalUrlPlaceholder), 'https://ntfy.sh');
    fireEvent.press(getByText(t.serverFormSave));

    expect(await findByText('✗ boom')).toBeTruthy();
  });

  it('closes the add-URL modal via its close button', () => {
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({ groups: [{ id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' }] }),
    );
    const { getByText, queryByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    fireEvent.press(getByText(t.serverAddUrl));
    expect(getByText(t.notificationsUrlModalNewTitle)).toBeTruthy();
    fireEvent.press(getByText('✕'));
    expect(queryByText(t.notificationsUrlModalNewTitle)).toBeNull();
  });

  it('dismisses the group context menu by tapping the overlay', () => {
    const removeGroup = jest.fn();
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({ groups: [{ id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' }], removeGroup }),
    );
    const { getByText, queryByText, UNSAFE_getAllByType } = render(<NotificationsScreen onBack={jest.fn()} />);
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(getByText('⋯'));
    expect(getByText(t.serverListDelete)).toBeTruthy();
    // The overlay is the outermost TouchableOpacity rendered once the menu Modal is visible.
    const overlays = UNSAFE_getAllByType(TouchableOpacity).filter(el => el.props.activeOpacity === 1);
    fireEvent.press(overlays[0]);
    expect(removeGroup).not.toHaveBeenCalled();
    expect(queryByText(t.serverListDelete)).toBeNull();
  });

  it('removing a URL via its context menu calls removeUrl when canRemoveUrl is true', () => {
    const removeUrl = jest.fn();
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({
        groups: [{ id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' }],
        urlsByGroup: { g1: [{ id: 'u1', groupId: 'g1', url: 'https://ntfy.sh', timeoutMs: 5000, priority: 0 }] },
        canRemoveUrl: () => true,
        removeUrl,
      }),
    );
    const { getByText, getAllByText } = render(<NotificationsScreen onBack={jest.fn()} />);
    // getAllByText('⋯') — group header + the URL row.
    fireEvent.press(getAllByText('⋯')[1]);
    fireEvent.press(getByText(t.serverListDelete));
    expect(removeUrl).toHaveBeenCalledWith('g1', 'u1');
  });

  it('dismisses the URL context menu by tapping the overlay', () => {
    const removeUrl = jest.fn();
    mockUseNotificationGroups.mockReturnValue(
      groupsHook({
        groups: [{ id: 'g1', name: 'Home', providerId: 'ntfy', topic: 'chapters' }],
        urlsByGroup: { g1: [{ id: 'u1', groupId: 'g1', url: 'https://ntfy.sh', timeoutMs: 5000, priority: 0 }] },
        canRemoveUrl: () => true,
        removeUrl,
      }),
    );
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

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { Check, MoreHorizontal, X } from 'lucide-react-native';
import type { ProviderCredentialField } from '../../../../shared/bridge/server';
import { findPressableAncestor } from '../../../../shared/test-utils/find-pressable-ancestor';
import { GroupCard, type GroupCardProps } from './group-card.component';

const CRED_FIELDS: ProviderCredentialField[] = [
  { name: 'apiKey', label: 'API Key', type: 'secret', required: true },
];

const strings = {
  urls: 'URLs',
  addUrl: '+ Add URL',
  testConnection: 'Test connection',
  testing: 'Testing…',
  connectionOk: 'Connected',
  moreOptions: 'More options',
};

const props = (over: Partial<GroupCardProps> = {}): GroupCardProps => ({
  name: 'Home',
  credentialFields: CRED_FIELDS,
  maskCredential: () => 'abcd••••wxyz',
  onGroupMenu: jest.fn(),
  urls: [{ id: 'u1', url: 'http://host', priority: 0 }],
  activeUrlId: 'u1',
  canAddUrl: true,
  onUrlMenu: jest.fn(),
  onAddUrl: jest.fn(),
  connTesting: false,
  connMessage: '',
  connStatus: 'idle',
  onTestConnection: jest.fn(),
  strings,
  ...over,
});

describe('GroupCard', () => {
  it('renders the name, the masked credential and the URL list', () => {
    const { getByText } = render(<GroupCard {...props()} />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('API Key')).toBeTruthy();
    expect(getByText('abcd••••wxyz')).toBeTruthy();
    expect(getByText('http://host')).toBeTruthy();
    expect(getByText('P0')).toBeTruthy();
  });

  it('hides a credential row when the mask returns null', () => {
    const { queryByText } = render(<GroupCard {...props({ maskCredential: () => null })} />);
    expect(queryByText('API Key')).toBeNull();
  });

  it('shows the add-URL button only when canAddUrl is true', () => {
    const { queryByText, rerender } = render(<GroupCard {...props({ canAddUrl: true })} />);
    expect(queryByText('+ Add URL')).toBeTruthy();
    rerender(<GroupCard {...props({ canAddUrl: false })} />);
    expect(queryByText('+ Add URL')).toBeNull();
  });

  it('renders a sub-line from urlSubline', () => {
    const { getByText } = render(<GroupCard {...props({ urlSubline: () => 'http://linked' })} />);
    expect(getByText('http://linked')).toBeTruthy();
  });

  it('wires the menu / add / test callbacks', () => {
    const onGroupMenu = jest.fn();
    const onUrlMenu = jest.fn();
    const onAddUrl = jest.fn();
    const onTestConnection = jest.fn();
    const { getByText, UNSAFE_getAllByType } = render(
      <GroupCard {...props({ onGroupMenu, onUrlMenu, onAddUrl, onTestConnection })} />,
    );
    const menuButtons = UNSAFE_getAllByType(MoreHorizontal).map(icon => findPressableAncestor(icon as never, TouchableOpacity));
    fireEvent.press(menuButtons[0] as never); // group menu
    fireEvent.press(menuButtons[1] as never); // url menu
    fireEvent.press(getByText('+ Add URL'));
    fireEvent.press(getByText('Test connection'));
    expect(onGroupMenu).toHaveBeenCalled();
    expect(onUrlMenu).toHaveBeenCalledWith('u1');
    expect(onAddUrl).toHaveBeenCalled();
    expect(onTestConnection).toHaveBeenCalled();
  });

  it('with zero URLs, shows neither the URL rows nor the test-connection block', () => {
    const { queryByText } = render(<GroupCard {...props({ urls: [], activeUrlId: null })} />);
    expect(queryByText('http://host')).toBeNull();
    expect(queryByText('Test connection')).toBeNull();
  });

  it('renders nothing while connStatus is "testing", then the check icon on ok and the X icon on error', () => {
    const { queryByText, UNSAFE_queryByType, rerender } = render(<GroupCard {...props({ connStatus: 'testing' })} />);
    expect(UNSAFE_queryByType(Check)).toBeNull();
    expect(UNSAFE_queryByType(X)).toBeNull();

    rerender(<GroupCard {...props({ connStatus: 'ok', connMessage: 'http://winner' })} />);
    expect(UNSAFE_queryByType(Check)).toBeTruthy();
    expect(queryByText('Connected: http://winner')).toBeTruthy();

    rerender(<GroupCard {...props({ connStatus: 'error', connMessage: 'no url' })} />);
    expect(UNSAFE_queryByType(X)).toBeTruthy();
    expect(queryByText('no url')).toBeTruthy();
  });
});

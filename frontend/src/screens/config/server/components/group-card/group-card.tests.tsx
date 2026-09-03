import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { ProviderCredentialField } from '../../../../../shared/bridge/server';
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

  it('renders a "↳ …" sub-line from urlSubline', () => {
    const { getByText } = render(<GroupCard {...props({ urlSubline: () => 'http://linked' })} />);
    expect(getByText('↳ http://linked')).toBeTruthy();
  });

  it('wires the menu / add / test callbacks', () => {
    const onGroupMenu = jest.fn();
    const onUrlMenu = jest.fn();
    const onAddUrl = jest.fn();
    const onTestConnection = jest.fn();
    const { getAllByText, getByText } = render(
      <GroupCard {...props({ onGroupMenu, onUrlMenu, onAddUrl, onTestConnection })} />,
    );
    fireEvent.press(getAllByText('⋯')[0]); // group menu
    fireEvent.press(getAllByText('⋯')[1]); // url menu
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

  it('renders nothing while connStatus is "testing", then the ✓ on ok and the ✗ on error', () => {
    const { queryByText, rerender } = render(<GroupCard {...props({ connStatus: 'testing' })} />);
    expect(queryByText(/✓/)).toBeNull();
    expect(queryByText(/✗/)).toBeNull();

    rerender(<GroupCard {...props({ connStatus: 'ok', connMessage: 'http://winner' })} />);
    expect(queryByText('✓ Connected: http://winner')).toBeTruthy();

    rerender(<GroupCard {...props({ connStatus: 'error', connMessage: 'no url' })} />);
    expect(queryByText('✗ no url')).toBeTruthy();
  });
});

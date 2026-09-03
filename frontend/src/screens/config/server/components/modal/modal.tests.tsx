import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../../shared/i18n/strings';
import type { ProviderInfo } from '../../../../../shared/bridge/server';
import { ServerModal, type ServerModalProps } from './modal.component';

const t = getStrings('en');

const KAVITA: ProviderInfo = {
  id: 'kavita',
  displayName: 'Kavita',
  version: '1',
  credentialFields: [{ name: 'apiKey', label: 'API Key', type: 'secret', required: true }],
  defaultHealthCheckPath: '/api/Health',
};
const NOAUTH: ProviderInfo = { ...KAVITA, id: 'm3', displayName: 'M3', credentialFields: [] };

const props = (over: Partial<ServerModalProps> = {}): ServerModalProps => ({
  t,
  mode: 'add',
  providers: [KAVITA],
  providerId: 'kavita',
  onSubmit: jest.fn(),
  onClose: jest.fn(),
  ...over,
});

describe('ServerModal', () => {
  it('shows the provider name (read-only) and the add-mode title + URL field', () => {
    const { getByText } = render(<ServerModal {...props()} />);
    expect(getByText(t.serverModalNewTitle)).toBeTruthy();
    expect(getByText('Kavita')).toBeTruthy();
    // first-URL field only in add mode — label is "URL" + a required "*"
    expect(getByText(`${t.urlModalUrlLabel} *`)).toBeTruthy();
  });

  it('edit mode uses the edit title and hides the first-URL field', () => {
    const { getByText, queryByText } = render(<ServerModal {...props({ mode: 'edit', initialName: 'Home' })} />);
    expect(getByText(t.serverModalEditTitle)).toBeTruthy();
    expect(queryByText(`${t.urlModalUrlLabel} *`)).toBeNull();
  });

  it('renders one input per credential field with a "*" on the required ones', () => {
    const { getByText } = render(<ServerModal {...props()} />);
    expect(getByText('API Key *')).toBeTruthy();
  });

  it('blocks Save until name + required credential + a valid URL are all present', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(<ServerModal {...props({ onSubmit })} />);

    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByPlaceholderText(t.serverModalNamePlaceholder), 'Home');
    fireEvent.changeText(getByPlaceholderText('API Key'), 'k-123');
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'http://host');
    fireEvent.press(getByText(t.serverFormSave));

    expect(onSubmit).toHaveBeenCalledWith('Home', { apiKey: 'k-123' }, 'http://host');
  });

  it('an auth-less provider needs only a name + URL to save', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText, queryByText } = render(
      <ServerModal {...props({ providers: [NOAUTH], providerId: 'm3', onSubmit })} />,
    );
    expect(queryByText('API Key *')).toBeNull();
    fireEvent.changeText(getByPlaceholderText(t.serverModalNamePlaceholder), 'M3');
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'http://m3');
    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).toHaveBeenCalledWith('M3', {}, 'http://m3');
  });

  it('surfaces a submitError and calls onClose from the ✕ and from Cancel', () => {
    const onClose = jest.fn();
    const { getByText } = render(<ServerModal {...props({ submitError: 'boom', onClose })} />);
    expect(getByText('✗ boom')).toBeTruthy();
    fireEvent.press(getByText('✕'));
    fireEvent.press(getByText(t.serverFormCancel));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('falls back to providers[0] when providerId matches nothing, and shows "—" with no providers', () => {
    const { getByText, rerender } = render(<ServerModal {...props({ providerId: 'ghost' })} />);
    expect(getByText('Kavita')).toBeTruthy(); // fell back to providers[0]

    rerender(<ServerModal {...props({ providers: [], providerId: 'ghost' })} />);
    expect(getByText('—')).toBeTruthy();
  });

  it('secureTextEntry is used for a "secret"-typed credential field', () => {
    const { getByPlaceholderText } = render(<ServerModal {...props()} />);
    expect(getByPlaceholderText('API Key').props.secureTextEntry).toBe(true);
  });
});

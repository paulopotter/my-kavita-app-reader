import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { getStrings } from '../../../../../shared/i18n/strings';
import type { ServerGroupInfo, ServerUrlInfo, UrlProbeResult } from '../../../../../shared/bridge/server';
import { UrlModal, type UrlModalProps } from './url-modal.component';

const t = getStrings('en');

const ok = (url: string): UrlProbeResult => ({ url, ok: true, status: 200, elapsedMs: 10 });
const fail = (url: string): UrlProbeResult => ({ url, ok: false, status: null, elapsedMs: 10 });

const props = (over: Partial<UrlModalProps> = {}): UrlModalProps => ({
  t,
  mode: 'add',
  initialPriority: 0,
  onTest: jest.fn().mockResolvedValue(ok('http://host')),
  onSubmit: jest.fn(),
  onClose: jest.fn(),
  ...over,
});

describe('UrlModal', () => {
  it('renders the URL + priority fields and the test button', () => {
    const { getByText } = render(<UrlModal {...props()} />);
    expect(getByText(t.urlModalNewTitle)).toBeTruthy();
    expect(getByText(t.serverFormPriorityLabel)).toBeTruthy();
    expect(getByText(t.urlModalTestConnection)).toBeTruthy();
  });

  it('Save stays disabled on an invalid URL (onSubmit never fires)', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(<UrlModal {...props({ onSubmit })} />);
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'not-a-url');
    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('the test button on an invalid URL shows the invalid-URL message instead of probing', async () => {
    const onTest = jest.fn();
    const { getByText, getByPlaceholderText } = render(<UrlModal {...props({ onTest })} />);
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'not-a-url');
    await act(async () => {
      fireEvent.press(getByText(t.urlModalTestConnection));
    });
    expect(onTest).not.toHaveBeenCalled();
    expect(getByText(t.serverErrorUrlInvalid)).toBeTruthy();
  });

  it('submits the URL and parsed priority once valid', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(<UrlModal {...props({ initialPriority: 2, onSubmit })} />);
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'http://host');
    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).toHaveBeenCalledWith('http://host', 2, undefined);
  });

  it('runs the connection test and shows the ✓ / ✗ result', async () => {
    const onTest = jest.fn().mockResolvedValue(ok('http://host'));
    const { getByText, getByPlaceholderText } = render(<UrlModal {...props({ onTest })} />);
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'http://host');
    await act(async () => {
      fireEvent.press(getByText(t.urlModalTestConnection));
    });
    await waitFor(() => expect(getByText(t.urlModalTestOk)).toBeTruthy());
    expect(onTest).toHaveBeenCalledWith('http://host');
  });

  it('a failing test shows the ✗ label', async () => {
    const onTest = jest.fn().mockResolvedValue(fail('http://host'));
    const { getByText, getByPlaceholderText } = render(<UrlModal {...props({ onTest })} />);
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'http://host');
    await act(async () => {
      fireEvent.press(getByText(t.urlModalTestConnection));
    });
    await waitFor(() => expect(getByText(t.urlModalTestFail)).toBeTruthy());
  });

  it('with `link`, renders the server picker and the associate toggle', async () => {
    const servers: ServerGroupInfo[] = [
      { id: 'g1', name: 'Home', providerId: 'kavita', credentialsJson: '{}', healthCheckPath: '/h' },
    ];
    const urlsOf = jest.fn().mockResolvedValue([
      { id: 'u1', groupId: 'g1', url: 'http://srv', timeoutMs: 5000, priority: 0 } as ServerUrlInfo,
    ]);
    const { getByText } = render(
      <UrlModal {...props({ link: { servers, urlsOf } })} />,
    );
    expect(getByText(t.urlModalServerLabel)).toBeTruthy();
    expect(getByText(t.urlModalAssociateToUrl)).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText(t.urlModalAssociateToUrl)); // turn association on
    });
    await waitFor(() => expect(urlsOf).toHaveBeenCalledWith('g1'));
  });

  it('passes the picked linkedServerUrlId on submit when associated', async () => {
    const onSubmit = jest.fn();
    const servers: ServerGroupInfo[] = [
      { id: 'g1', name: 'Home', providerId: 'kavita', credentialsJson: '{}', healthCheckPath: '/h' },
    ];
    const urlsOf = jest.fn().mockResolvedValue([
      { id: 'u1', groupId: 'g1', url: 'http://srv', timeoutMs: 5000, priority: 0 } as ServerUrlInfo,
    ]);
    const { getByText, getByPlaceholderText } = render(
      <UrlModal
        {...props({
          onSubmit,
          link: { servers, urlsOf, initialServerGroupId: 'g1', initialServerUrlId: 'u1' },
        })}
      />,
    );
    fireEvent.changeText(getByPlaceholderText(t.urlModalUrlPlaceholder), 'http://meta');
    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).toHaveBeenCalledWith('http://meta', 0, 'u1');
  });
});

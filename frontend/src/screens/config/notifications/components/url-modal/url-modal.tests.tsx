import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../../shared/i18n';
import { UrlModal, type UrlModalProps } from './url-modal.component';

const t = getStrings('en');

const props = (over: Partial<UrlModalProps> = {}): UrlModalProps => ({
  t,
  mode: 'add',
  initialPriority: 0,
  onSubmit: jest.fn(),
  onClose: jest.fn(),
  ...over,
});

describe('UrlModal', () => {
  it('renders the add title for add mode and edit title for edit mode', () => {
    const { getByText, rerender } = render(<UrlModal {...props({ mode: 'add' })} />);
    expect(getByText(t.notificationsUrlModalNewTitle)).toBeTruthy();
    rerender(<UrlModal {...props({ mode: 'edit', initialUrl: 'https://ntfy.sh' })} />);
    expect(getByText(t.notificationsUrlModalEditTitle)).toBeTruthy();
  });

  it('disables save for an invalid URL', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(<UrlModal {...props({ onSubmit })} />);
    fireEvent.changeText(getByPlaceholderText(t.notificationsUrlModalUrlPlaceholder), 'not-a-url');
    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the url and parsed priority for a valid URL', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(<UrlModal {...props({ onSubmit })} />);
    fireEvent.changeText(getByPlaceholderText(t.notificationsUrlModalUrlPlaceholder), 'https://ntfy.sh');
    fireEvent.changeText(getByPlaceholderText('0'), '2');
    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).toHaveBeenCalledWith('https://ntfy.sh', 2);
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<UrlModal {...props({ onClose })} />);
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

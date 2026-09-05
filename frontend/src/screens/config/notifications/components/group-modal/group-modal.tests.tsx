import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../../shared/i18n';
import { GroupModal, type GroupModalProps } from './group-modal.component';

const t = getStrings('en');

const props = (over: Partial<GroupModalProps> = {}): GroupModalProps => ({
  t,
  onSubmit: jest.fn(),
  onClose: jest.fn(),
  ...over,
});

describe('GroupModal', () => {
  it('renders the new-group title and both fields', () => {
    const { getByText, getByPlaceholderText } = render(<GroupModal {...props()} />);
    expect(getByText(t.notificationsGroupModalNewTitle)).toBeTruthy();
    expect(getByPlaceholderText(t.notificationsGroupModalNamePlaceholder)).toBeTruthy();
    expect(getByPlaceholderText(t.notificationsGroupModalTopicPlaceholder)).toBeTruthy();
  });

  it('disables save until both name and topic are filled', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(<GroupModal {...props({ onSubmit })} />);
    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByPlaceholderText(t.notificationsGroupModalNamePlaceholder), 'Home');
    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByPlaceholderText(t.notificationsGroupModalTopicPlaceholder), 'chapters');
    fireEvent.press(getByText(t.serverFormSave));
    expect(onSubmit).toHaveBeenCalledWith('Home', 'chapters');
  });

  it('shows the submit error when given', () => {
    const { getByText } = render(<GroupModal {...props({ submitError: 'boom' })} />);
    expect(getByText('✗ boom')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<GroupModal {...props({ onClose })} />);
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<GroupModal {...props({ onClose })} />);
    fireEvent.press(getByText(t.serverFormCancel));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ConfirmDialog } from './confirm-dialog.component';

describe('ConfirmDialog', () => {
  it('renders the title and both buttons when visible', () => {
    const { getByText } = render(
      <ConfirmDialog visible title="Excluir?" cancelLabel="Cancelar" confirmLabel="Excluir" onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );
    expect(getByText('Excluir?')).toBeTruthy();
    expect(getByText('Cancelar')).toBeTruthy();
    expect(getByText('Excluir')).toBeTruthy();
  });

  it('calls onConfirm when the confirm button is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <ConfirmDialog visible title="Excluir?" cancelLabel="Cancelar" confirmLabel="Excluir" onCancel={jest.fn()} onConfirm={onConfirm} />,
    );
    fireEvent.press(getByText('Excluir'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <ConfirmDialog visible title="Excluir?" cancelLabel="Cancelar" confirmLabel="Excluir" onCancel={onCancel} onConfirm={jest.fn()} />,
    );
    fireEvent.press(getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

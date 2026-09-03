import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AppAlert, type AppAlertProps } from './app-alert.component';

const base = (over: Partial<AppAlertProps> = {}): AppAlertProps => ({
  visible: true,
  title: 'Título',
  buttons: [{ label: 'OK', onPress: jest.fn() }],
  ...over,
});

describe('AppAlert', () => {
  it('renders the title, the optional message and every button', () => {
    const { getByText, queryByText, rerender } = render(<AppAlert {...base({ message: 'Detalhe' })} />);
    expect(getByText('Título')).toBeTruthy();
    expect(getByText('Detalhe')).toBeTruthy();
    expect(getByText('OK')).toBeTruthy();

    rerender(<AppAlert {...base()} />);
    expect(queryByText('Detalhe')).toBeNull();
  });

  it('fires a button onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<AppAlert {...base({ buttons: [{ label: 'Ir', onPress }] })} />);
    fireEvent.press(getByText('Ir'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss from the backdrop when dismissible', () => {
    const onDismiss = jest.fn();
    const { UNSAFE_getAllByType } = render(<AppAlert {...base({ dismissible: true, onDismiss })} />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]); // outermost = backdrop
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onDismiss from the backdrop when not dismissible', () => {
    const onDismiss = jest.fn();
    const { UNSAFE_getAllByType } = render(<AppAlert {...base({ dismissible: false, onDismiss })} />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('renders nothing while not visible', () => {
    const { queryByText } = render(<AppAlert {...base({ visible: false })} />);
    expect(queryByText('Título')).toBeNull();
  });

  it('applies the variant styles by button variant', () => {
    const { getByText } = render(
      <AppAlert
        {...base({
          buttons: [
            { label: 'P', variant: 'primary', onPress: jest.fn() },
            { label: 'D', variant: 'destructive', onPress: jest.fn() },
            { label: 'S', variant: 'secondary', onPress: jest.fn() },
          ],
        })}
      />,
    );
    // the label colours differ per variant — primary/destructive white, secondary dimmed
    expect(getByText('P').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#FFFFFF' })]));
    expect(getByText('S').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: 'rgba(255,255,255,0.80)' })]),
    );
  });
});

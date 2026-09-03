import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SplashAlert, type SplashAlertProps } from './alert.component';

const base = (over: Partial<SplashAlertProps> = {}): SplashAlertProps => ({
  visible: true,
  title: 'Título',
  buttons: [{ label: 'OK', onPress: jest.fn() }],
  ...over,
});

describe('SplashAlert', () => {
  it('renders the title, the optional message and every button', () => {
    const { getByText, queryByText, rerender } = render(<SplashAlert {...base({ message: 'Detalhe' })} />);
    expect(getByText('Título')).toBeTruthy();
    expect(getByText('Detalhe')).toBeTruthy();
    expect(getByText('OK')).toBeTruthy();

    rerender(<SplashAlert {...base()} />);
    expect(queryByText('Detalhe')).toBeNull();
  });

  it('fires a button onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SplashAlert {...base({ buttons: [{ label: 'Ir', onPress }] })} />);
    fireEvent.press(getByText('Ir'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss from the backdrop when dismissible', () => {
    const onDismiss = jest.fn();
    const { UNSAFE_getAllByType } = render(<SplashAlert {...base({ dismissible: true, onDismiss })} />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]); // outermost = backdrop
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onDismiss from the backdrop when not dismissible', () => {
    const onDismiss = jest.fn();
    const { UNSAFE_getAllByType } = render(<SplashAlert {...base({ dismissible: false, onDismiss })} />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('renders nothing while not visible', () => {
    const { queryByText } = render(<SplashAlert {...base({ visible: false })} />);
    expect(queryByText('Título')).toBeNull();
  });

  it('applies the variant styles by button variant', () => {
    const { getByText } = render(
      <SplashAlert
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

import React from 'react';
import { fireEvent, render, renderHook } from '@testing-library/react-native';

const mockSetLanguage = jest.fn();
let mockLanguage = 'en';
jest.mock('../../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
  useLanguage: () => ({ language: mockLanguage, setLanguage: mockSetLanguage }),
}));

// The server screen is exercised on its own — here it's a stub so we can assert composition only.
jest.mock('../server', () => ({
  ServerScreen: (props: { onComplete?: () => void }) => {
    const { Text } = require('react-native');
    return <Text testID="server-screen">server:onComplete={String(!!props.onComplete)}</Text>;
  },
}));

import { useSetup } from './setup.hooks';
import { SetupScreen } from './setup.screen';

beforeEach(() => {
  jest.clearAllMocks();
  mockLanguage = 'en';
});

describe('useSetup', () => {
  it('re-exports the shared language state + changeLanguage', () => {
    const { result } = renderHook(() => useSetup());
    expect(result.current.language).toBe('en');
    result.current.changeLanguage('pt-BR');
    expect(mockSetLanguage).toHaveBeenCalledWith('pt-BR');
  });
});

describe('SetupScreen', () => {
  it('renders the language toggle and the server screen in onComplete mode', () => {
    const onComplete = jest.fn();
    const { getByText, getByTestId } = render(<SetupScreen onComplete={onComplete} />);
    expect(getByText('🇧🇷 PT')).toBeTruthy();
    expect(getByTestId('server-screen').props.children.join('')).toBe('server:onComplete=true');
  });

  it('the language toggle is wired to changeLanguage', () => {
    const { getByTestId } = render(<SetupScreen onComplete={jest.fn()} />);
    fireEvent.press(getByTestId('language-toggle-track'));
    expect(mockSetLanguage).toHaveBeenCalledWith('pt-BR');
  });
});

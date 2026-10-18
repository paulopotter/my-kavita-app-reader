import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useBottomInset } from './safe-area.hooks';

describe('useBottomInset', () => {
  it('is 0 outside a SafeAreaProvider instead of throwing', () => {
    const { result } = renderHook(() => useBottomInset());
    expect(result.current).toBe(0);
  });

  it('reads the bottom inset the provider reports', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 15, left: 0, right: 0 }}>{children}</SafeAreaInsetsContext.Provider>
    );
    const { result } = renderHook(() => useBottomInset(), { wrapper });
    expect(result.current).toBe(15);
  });
});

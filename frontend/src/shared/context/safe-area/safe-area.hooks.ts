import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

// How far the system's bottom bar (gesture area or three buttons) reaches into the screen, in dp.
// The app draws edge-to-edge, so anything pinned to the bottom edge — a selection bar, a reader's
// controls — must add this to its own padding or its lower part sits under the system bar.
//
// Reads the context directly instead of useSafeAreaInsets(): that hook throws outside a
// SafeAreaProvider, and a bar that cannot read an inset should simply pad nothing, not crash.
export function useBottomInset(): number {
  return useContext(SafeAreaInsetsContext)?.bottom ?? 0;
}

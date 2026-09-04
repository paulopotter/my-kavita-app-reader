import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Immersive mode = the app is drawing edge-to-edge, behind the status bar and the display cutout
// (notch/camera). Only the Reader turns it on today, and only when its immersive-mode preference
// is set. App.tsx consumes `immersive` to drop the root paddingTop (statusBarHeight) that every
// other screen wants — with it, the reader content fills the whole screen; without immersive on,
// the reader still respects the status-bar area so notifications stay visible.
//
// This is a tiny UI-shell flag, deliberately its own context (not folded into StartupContext,
// which is about boot state). A future full-bleed screen (a video player, say) can set it too.

interface ImmersiveState {
  immersive: boolean;
  setImmersive: (value: boolean) => void;
}

const ImmersiveContext = createContext<ImmersiveState>({
  immersive: false,
  setImmersive: () => {},
});

export function ImmersiveProvider({ children }: { children: React.ReactNode }) {
  const [immersive, setImmersiveState] = useState(false);
  const setImmersive = useCallback((value: boolean) => setImmersiveState(value), []);
  const value = useMemo(() => ({ immersive, setImmersive }), [immersive, setImmersive]);
  return <ImmersiveContext.Provider value={value}>{children}</ImmersiveContext.Provider>;
}

export function useImmersive(): ImmersiveState {
  return useContext(ImmersiveContext);
}

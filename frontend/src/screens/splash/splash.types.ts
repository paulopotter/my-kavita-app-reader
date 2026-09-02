import type { AppAlertButton } from '../../shared/components/AppAlert';

// Where the splash hands off to when it's done.
//  - 'setup'  → no server / auth failed → the setup screen.
//  - 'home'   → into the app. Today that's the Library/Following tab (MainNavigator picks which
//               from hasFollowedSeries); a dedicated Home screen may replace it later.
//  - 'serial' / 'reader' → a deep link resolved to a specific series or chapter. Not produced
//               yet (no deep-link handling), declared so the boot graph and App.tsx can grow
//               into it without a type change.
export type SplashDestination =
  | { kind: 'setup' }
  | { kind: 'home' }
  | { kind: 'serial'; seriesId: string }
  | { kind: 'reader'; seriesId: string; chapterId: string };

export type OtaDialogAction = 'dismiss' | 'open_notes';

// The OTA advisory dialog, fully resolved by the hook (title/body/buttons already built from the
// policy mode + Strings). The screen just feeds this straight into the generic <AppAlert>. null
// when there's no advisory to show.
export interface SplashOtaAlert {
  title: string;
  message: string;
  buttons: AppAlertButton[];
  dismissible: boolean;
}

// What the hook exposes to splash.screen.tsx. Kept deliberately small for now — the real boot
// orchestration (auth check, server-group activation, Library warm-up, OTA advisory flow) lands
// in later steps of Task 038; this is the skeleton plus the one rule already in place.
export interface SplashState {
  // 0..1 progress for the bar.
  progress: number;
  // Optional caption under the bar (what's loading now / a message). Undefined = bar only.
  progressLabel?: string;
  // A downloaded OTA bundle is staged and can be applied now (drives the hidden update button).
  otaUpdateReady: boolean;
  // Resolved advisory dialog, or null. Built by the hook from the OTA policy + Strings.
  otaAlert: SplashOtaAlert | null;
  // null until the splash has decided; App.tsx navigates when it flips.
  destination: SplashDestination | null;
}

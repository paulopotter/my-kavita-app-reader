import type { AppAlertButton } from '../../shared/components/app-alert';

// The boot graph's own vocabulary for "where the app should go". Produced by runSplashBoot,
// translated to a concrete nav action by the hook (one place, exhaustive). Kept as a typed union
// so the graph stays testable without React navigation.
//  - 'setup'  → no server / auth failed.
//  - 'home'   → into the app (the hub / bottom-tab container).
//  - 'serial' / 'reader' → a deep link resolved to a specific series or chapter. Not produced
//               yet; declared so the graph and the hook's mapping grow into it without a type
//               change (the mapping already routes them to the hub).
export type SplashDestination =
  | { kind: 'setup' }
  | { kind: 'home' }
  | { kind: 'serial'; seriesId: string }
  | { kind: 'reader'; seriesId: string; chapterId: string };

// The object the screen hands straight to navigation.reset(). The hook fills it; the screen only
// forwards it. A deep link later just adds more routes / params here, no screen change.
export interface SplashNavAction {
  index: number;
  routes: Array<{ name: string; params?: object }>;
}

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

// What the hook exposes to splash.screen.tsx.
export interface SplashState {
  // 0..1 progress for the bar.
  progress: number;
  // Optional caption under the bar (what's loading now / a message). Undefined = bar only.
  progressLabel?: string;
  // A downloaded OTA bundle is staged and can be applied now (drives the hidden update button).
  otaUpdateReady: boolean;
  // Resolved advisory dialog, or null. Built by the hook from the OTA policy + Strings.
  otaAlert: SplashOtaAlert | null;
  // null until the splash has decided; the screen calls navigation.reset(navigate) when set.
  // null while `otaAlert` is a `required` block — the splash never navigates in that case.
  navigate: SplashNavAction | null;
}

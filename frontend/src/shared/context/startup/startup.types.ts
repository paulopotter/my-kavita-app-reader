// State discovered at app startup (via StartupBridge) that the navigation shell needs to decide
// its initial route and initial tab. Not per-screen state — this is "what did we find out about
// the install before rendering anything".
export interface StartupState {
  // A server group exists → skip onboarding.
  hasServerConfigured: boolean;
  // The user follows at least one series → open on the Following tab, not Library.
  hasFollowedSeries: boolean;
  // Badge on the notifications entry. Placeholder (always 0) until notifications ship (Plano 008).
  unreadNotificationCount: number;
  // Re-read all of the above (e.g. after the user wipes their server and bounces to setup).
  refresh: () => void;
}

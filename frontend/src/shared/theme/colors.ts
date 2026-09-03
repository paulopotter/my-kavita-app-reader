// Colour tokens — first pass.
//
// Seeded from the Splash rewrite (Task 038). Only the values used by the files touched there live
// here so far; the rest of the app still has literals in its own *.styles.ts. The plan is to
// migrate everything onto these tokens and give them their real, theme-aware names when the
// theming story lands (see .claude/sessions/backlog/items/theming.md). Until then: names describe
// *role*, values are the current dark palette, and nothing here is dynamic yet.

export const colors = {
  // App background — same value as the native @color/splash_background so the system-splash → RN
  // handoff has no colour jump.
  background: '#1A1A2E',

  // Primary accent (progress fill, primary buttons).
  accent: '#E94560',

  // Solid foreground text on the dark background.
  textOnDark: '#FFFFFF',

  // Progress bar.
  progressTrack: 'rgba(255,255,255,0.15)',
  progressLabel: 'rgba(255,255,255,0.6)',

  // App-versions footer (low-emphasis, on the dark background).
  versionLabel: '#44FFFFFF', // white ~27%
  versionValue: '#99FFFFFF', // white ~60%
  versionDivider: '#ffffff22', // white ~13%

  // ── Config/Setup rewrite (Task 035) ──────────────────────────────────────────
  // Pulled verbatim from the literals ConfigScreen/SetupScreen used inline. Same "role name,
  // current dark value, not dynamic yet" contract as the tokens above.
  card: '#16213E', // raised surface (rows, form cards, context menu)
  deep: '#0F3460', // inset surface (inputs, dividers, chips)
  positive: '#38A169', // active/ok dot
  muted: '#A0AEC0', // secondary text / icons
  mutedDim: '#4A5568', // inactive dot, placeholder text
  sectionLabel: '#8892b0', // uppercase section headers
  msgOk: '#68D391', // success message text
  msgError: '#FC8181', // error message text
  overlay: 'rgba(0,0,0,0.5)', // modal scrim
  overlayHeavy: 'rgba(0,0,0,0.72)', // blocking-alert scrim (darker than overlay)
  starActive: '#F6AD55', // "following" star, filled state
  danger: '#C0392B', // destructive action button
} as const;

export type ColorToken = keyof typeof colors;

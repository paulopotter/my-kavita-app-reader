// Colour tokens — every colour the RN side paints lives here, and nowhere else.
//
// This file is deliberately *flat and redundant right now*: it holds one token per distinct
// literal the app used before the migration, at the exact same value. Near-identical tones that
// play the same role (three destructive reds, two ambers, nine alphas over white) each kept their
// own token instead of being collapsed, so the migration could be proven pixel-identical.
//
// Collapsing them is the next step, done against a real device rather than on paper — see
// .claude/sessions/backlog/items/018-tema-e-design-tokens.md. Only after that lands do these names
// become a proper semantic taxonomy and gain a runtime theme. Two consequences until then:
//   - names describe the *role the value plays today*, not a position in a scale;
//   - nothing here is dynamic, and no token implies light/dark — themes will be named colour
//     identities, not a light/dark binary.

export const colors = {
  // ── Core surfaces ────────────────────────────────────────────────────────────
  // App background — same value as the native @color/splash_background so the system-splash → RN
  // handoff has no colour jump.
  background: '#1A1A2E',
  card: '#16213E', // raised surface (rows, form cards, context menu)
  deep: '#0F3460', // inset surface (inputs, dividers, chips)
  readerSurface: '#2D3748', // reader chrome surface
  readerBackground: '#000000', // reader page background (manga is read on black)
  sduBackground: '#1A1A1A', // server-driven chapter-boundary block

  // Translucent variants of the surfaces above — a scrim-over-content effect where the surface
  // must let the artwork show through.
  cardTranslucent: 'rgba(22,33,62,0.85)', // card at 85%
  deepTranslucent: 'rgba(15,52,96,0.85)', // deep at 85%

  // ── Brand accent ─────────────────────────────────────────────────────────────
  accent: '#E94560', // progress fill, primary buttons, active state
  accentStrong: 'rgba(233,69,96,0.9)', // offline banner
  accentSoft: 'rgba(233,69,96,0.24)', // freshness banner, stronger fill
  accentSofter: 'rgba(233,69,96,0.16)', // freshness banner, default fill
  accentFaint: 'rgba(233,69,96,0.12)', // chapter-sort selected row

  // ── Text and icons ───────────────────────────────────────────────────────────
  textOnDark: '#FFFFFF', // solid foreground text
  textBright: '#E2E8F0', // notification detail body
  textSubtle: '#CBD5E0', // series header secondary
  textBanner: '#B8C1D9', // library freshness banner
  muted: '#A0AEC0', // secondary text / icons
  mutedAlt: '#718096', // secondary text / icons (second tone in use)
  mutedDim: '#4A5568', // inactive dot, placeholder text
  sectionLabel: '#8892b0', // uppercase section headers

  // Alpha steps over white, ordered strongest → faintest. Each step is a literal the app already
  // used; several are near-duplicates kept apart on purpose (see the header).
  white80: 'rgba(255,255,255,0.80)',
  white72: 'rgba(255,255,255,0.72)',
  white60: 'rgba(255,255,255,0.6)',
  white55: 'rgba(255,255,255,0.55)',
  white45: 'rgba(255,255,255,0.45)',
  white40: 'rgba(255,255,255,0.4)',
  white35: 'rgba(255,255,255,0.35)',
  white20: 'rgba(255,255,255,0.2)',

  // ── Status ───────────────────────────────────────────────────────────────────
  positive: '#38A169', // active/ok dot
  positiveSoft: 'rgba(46,160,67,0.20)', // freshness banner, fresh state
  msgOk: '#68D391', // success message text
  msgError: '#FC8181', // error message text
  danger: '#C0392B', // destructive action button
  dangerAlt: '#C53030', // destructive badge on a card
  dangerDeep: '#7F1D1D', // destructive row background
  starActive: '#F6AD55', // "following" star, filled state
  progressAmber: '#FFC107', // reader thin progress bar
  progressAmberSoft: 'rgba(255,193,7,0.5)', // reader side progress bar, read-ahead
  badgeSpecial: '#553C9A', // special-edition badge on a card

  // ── Progress (splash) ────────────────────────────────────────────────────────
  progressTrack: 'rgba(255,255,255,0.15)',
  progressLabel: 'rgba(255,255,255,0.6)',

  // ── App-versions footer (low-emphasis, on the dark background) ────────────────
  versionLabel: '#44FFFFFF', // white ~27%
  versionValue: '#99FFFFFF', // white ~60%
  versionDivider: '#ffffff22', // white ~13%

  // ── Scrims — darkening what sits behind a modal or an overlay ────────────────
  overlay: 'rgba(0,0,0,0.5)', // modal scrim
  overlayCard: 'rgba(0,0,0,0.55)', // card image scrim
  overlayReader: 'rgba(0,0,0,0.6)', // reader top bar
  overlayHeavy: 'rgba(0,0,0,0.72)', // blocking-alert scrim
  overlayReaderStrong: 'rgba(0,0,0,0.75)', // reader side progress bar
  shadow: '#000', // elevation shadowColor
} as const;

export type ColorToken = keyof typeof colors;

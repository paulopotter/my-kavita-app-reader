// The colour contract every theme must fill.
//
// This is the single source of truth for *what a colour means* — each field's doc comment is its
// application rule, and an editor shows it at the call site, which a separate rules document never
// would. A theme (see `themes/<name>/colors.tokens.ts`) supplies the values; it may not add or
// remove fields.
//
// Grammar of a token path: <what it is>.<type of content>.<variation>.
//   - the first level says what is being painted (text, and later icon/surface/…);
//   - the second names the kind of content or the component (title, button, input, …);
//   - the third is the variation, and only exists when there is more than one.
// A type with a single variation stays flat: `text.label`, not `text.label.primary`.
//
// `primary` always means **the canonical case of its parent**, never "the strongest one":
// `title.primary` is the screen's main heading, `text.primary` is ordinary body copy, and
// `button.primary` is the label on the theme-coloured button.
//
// Names never mention brightness. `textOnDark`, `white80` and the like are disqualified: under a
// future identity they would describe something that is no longer true.


/**
 * A colour token's value: `rgb(r, g, b)` and nothing else.
 *
 * Deliberately not `string`. Two things follow from the shape:
 *   - **no alpha.** Opacity is a separate axis — how transparent something is depends on what is
 *     being drawn, not on its colour — so a token carries the colour and a call site applies the
 *     level with `alpha()`. `rgba(...)` does not satisfy this type, which makes that a compile
 *     error rather than a convention someone has to remember.
 *   - **one notation.** Hex, `hsl()` and named colours are all rejected, so `alpha()` has exactly
 *     one shape to parse and a theme cannot drift into a second style.
 *
 * TypeScript checks the shape, not the range: `rgb(999, 0, 0)` type-checks. The themes test
 * guards the values.
 */
export type RgbColor = `rgb(${number}, ${number}, ${number})`;

/** Text colours. Nothing here paints a background, a border or an icon. */
export interface TextColors {
  /** Ordinary body copy: paragraphs, summaries, chip text. The default for reading. */
  primary: RgbColor;
  /** Supporting text of lower weight: captions, metadata, helper lines under a field. */
  secondary: RgbColor;
  /** A disabled item's text — present but not actionable. */
  tertiary: RgbColor;
  /** The lowest emphasis in the app: the version footer's label. */
  ghost: RgbColor;
  /** A structurally highlighted run of text: a list-row title, a standalone value. */
  emphasis: RgbColor;
  /** Inline bold inside a paragraph — emphasis within running text, not a heading. */
  bold: RgbColor;

  /** Headings. `primary` is the screen's own title; deeper levels are section headers. */
  title: {
    /** The screen's main heading — at most one per screen, the "H1". */
    primary: RgbColor;
    /** A section header, typically uppercase, introducing a group of rows. */
    secondary: RgbColor;
  };

  /**
   * Text **inside a button**, named after the background it sits on — not after what the button
   * does. `destructive` is therefore the text that goes *on top of* a red button, which is light;
   * red text with no background behind it is `link.destructive`.
   */
  button: {
    /** On the theme-coloured (primary) button fill. */
    primary: RgbColor;
    /** On a transparent/outlined button, where the surface shows through. */
    secondary: RgbColor;
    /** On a destructive fill — delete, remove. */
    destructive: RgbColor;
  };

  /**
   * Tappable text with no fill behind it: an inline link, or a row in a context menu.
   * The distinction from `button` is the absence of a background, not the kind of action.
   */
  link: {
    /** An inline link in running text — the theme's accent. */
    primary: RgbColor;
    /** A neutral menu row, e.g. "Edit" in a context menu. */
    secondary: RgbColor;
    /** A destructive menu row, e.g. "Delete" — red text on the menu's own surface. */
    destructive: RgbColor;
  };

  /** Text belonging to a form field. */
  input: {
    /** The value the user typed. */
    primary: RgbColor;
    /** A masked value: a password (`secureTextEntry`) or a masked credential (••••1234). */
    masked: RgbColor;
    /** The example text shown while the field is empty. */
    placeholder: RgbColor;
  };

  /** A field's caption, or the leading title of a list row. */
  label: RgbColor;

  /**
   * An inline message about an operation the user just performed — form validation, the result of
   * a connection test, a screen-level failure. Not a banner or a toast: those are surfaces.
   */
  message: {
    /** Success: "connected", "saved". */
    good: RgbColor;
    /** Failure: validation error, failed connection, screen error. */
    bad: RgbColor;
  };
}


/** Icon colours. An icon takes a single colour; when it is filled, `fill` and `stroke` get the
 * same one (lucide's default is `fill: "none"`, so passing `fill` is what makes a glyph solid). */
export interface IconColors {
  /** A prominent action icon on an ordinary surface: back, close. */
  primary: RgbColor;
  /** A supporting icon: a navigation chevron, search, "⋯", a layout switcher. */
  secondary: RgbColor;
  /** An inactive icon — present but not currently acting. */
  tertiary: RgbColor;

  /**
   * An icon **inside a button**, named after the background it sits on — the same rule as
   * `TextColors.button`. `primary` is the icon on the theme-coloured fill; `secondary` is the icon
   * on a transparent button, where the surface shows through.
   */
  button: {
    /** On the theme-coloured fill: the scroll-to-top button, a ticked checkbox. */
    primary: RgbColor;
    /** On a transparent button: the back chevron, +/−, a loading spinner. */
    secondary: RgbColor;
  };

  /** The "following" star when filled. Specific on purpose: it is the app's one stateful icon. */
  following: RgbColor;

  /** The status dot next to a server, a group or a debug row. */
  status: {
    /** Active, connected, healthy. */
    good: RgbColor;
    /** Inactive — configured but not currently running. */
    off: RgbColor;
    /** Failed. */
    bad: RgbColor;
    /** Unread — an item the user has not opened yet. */
    unread: RgbColor;
  };

  /** An icon carrying the outcome of an operation, next to (or instead of) a message. */
  message: {
    /** A success check. */
    good: RgbColor;
    /** An error cross. */
    bad: RgbColor;
  };
}


/**
 * Surfaces — the planes content sits on. A surface is painted with `backgroundColor`; it never
 * colours text, an icon or a border.
 *
 * `primary`/`secondary`/`tertiary` is a depth ladder, not an emphasis one: `primary` is the screen
 * itself, and each step after it sits closer to the viewer.
 */
export interface SurfaceColors {
  /** The screen's own background — the base plane everything else sits on. */
  primary: RgbColor;
  /** A plane raised above the screen: a card, a list row, a context menu, a chip. */
  secondary: RgbColor;
  /** A plane recessed into its parent: a form field, a selected option, a cover placeholder. */
  tertiary: RgbColor;

  /** The reader, whose surfaces answer to legibility rather than to the theme. */
  reading: {
    /** The page itself. Always black, in every identity — the artwork is what must be seen. */
    background: RgbColor;
    /** The title and "end of chapter" bands drawn between pages. */
    strip: RgbColor;
  };

  /**
   * The colour that darkens whatever sits behind a modal or an overlay. Always used with an
   * opacity level, never at full strength — the level is the caller's, per the opacity axis.
   */
  dim: RgbColor;
}


/**
 * Interactive controls. Everything here is a *fill* — the text or icon that sits on top of it
 * comes from `TextColors.button` / `IconColors.button`, which are named after these very fills.
 */
export interface ButtonColors {
  /** The action the user is meant to take — the theme's own colour. One per view. */
  primary: RgbColor;
  /** An alternative to the primary action. Unlike it, several may sit side by side. */
  secondary: RgbColor;
  /** Deletes or removes something. */
  destructive: RgbColor;
  /** Continue/confirm, when it deserves to be told apart from the primary action. */
  confirmation: RgbColor;
  /** A selected option, a chosen row, a ticked checkbox. */
  selected: RgbColor;
  /** A control that cannot currently be used. */
  disabled: RgbColor;

  /** A switch, which is a two-state button: a thumb that slides along a track. */
  switch: {
    /** The sliding circle. */
    thumb: { on: RgbColor; off: string };
    /** The groove it slides along. */
    track: { on: RgbColor; off: string };
  };
}

/** A small label attached to an item, stating a fact about it. Not interactive. */
export interface BadgeColors {
  /** A special edition. */
  special: RgbColor;
  /** Something went wrong with this item. */
  error: RgbColor;
}

/**
 * A full-width strip announcing the state of a screen — offline, stale data, freshly updated.
 * Distinct from `TextColors.message`, which is text rather than a surface.
 */
export interface BannerColors {
  /** Needs attention: the app is offline. */
  alert: RgbColor;
  /** Worth knowing: the data on screen may be out of date. */
  notice: RgbColor;
  /** All good: the data was just refreshed. */
  good: RgbColor;
}


/**
 * Borders and dividers — a line, never a fill. `primary` is the ordinary structural line; the
 * alpha-over-white variants (a secondary button's outline, the faintest dividers) are still on the
 * legacy palette until the opacity axis lands, since their colour is a level, not a value.
 */
export interface BorderColors {
  /** The structural line: a card's outline, the divider between two sections. */
  primary: RgbColor;
  /** The outline of a transparent control, and the faintest dividers — always used with `alpha()`,
   * since what distinguishes it from the surface is the level, not the colour. */
  secondary: RgbColor;
  /** An outline that marks selection or an active state. */
  accent: RgbColor;
  /** The outline of a control that cannot be used. */
  disabled: RgbColor;

  /** A form field's outline. */
  input: {
    /** At rest. */
    primary: RgbColor;
    /** Failing validation. */
    error: RgbColor;
  };

  /** A checkbox's outline, which changes with its state. */
  checkbox: {
    /** Ticked. */
    on: RgbColor;
    /** Unticked. */
    off: RgbColor;
  };
}


/**
 * Progress bars. `primary` is the filled part, `secondary` the empty remainder — the same pair
 * whether the bar is the splash's or a "continue reading" indicator.
 */
export interface ProgressColors {
  /** The filled portion of a bar. */
  primary: RgbColor;
  /** The part not yet filled — the groove behind the fill. */
  secondary: RgbColor;

  /** The reader's own progress, which is gold rather than the theme's colour. */
  reading: {
    /** The thin side bar, and the dot for the page being read. */
    primary: RgbColor;
    /** A page already read, and the unread remainder. */
    secondary: RgbColor;
  };
}

/**
 * The full palette of a theme. Today it carries text, icons and surfaces — component fills and borders
 * join it as their slices land, and each new group is added here first.
 */
export interface ThemeColors {
  text: TextColors;
  icon: IconColors;
  surface: SurfaceColors;
  button: ButtonColors;
  badge: BadgeColors;
  banner: BannerColors;
  border: BorderColors;
  progress: ProgressColors;
}

/**
 * The search palette's keyboard contract (plan 506).
 *
 * Fumadocs renders a **controlled** Radix dialog: there is no `DialogTrigger`,
 * so Radix has nowhere to return focus when the palette closes and leaves it on
 * `<body>`. The site restores it itself, and these rules decide when. They are
 * DOM-free so the node test suite can prove the negative cases.
 */

/** The keys a palette shortcut may report, with its platform modifiers. */
export interface ShortcutInput {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
}

/** True for the palette shortcut: ⌘K on macOS, Ctrl+K elsewhere. */
export const isSearchShortcut = (input: ShortcutInput): boolean =>
  input.key.toLowerCase() === "k" && (input.metaKey || input.ctrlKey);

/** What the observer knows when the palette's dialog leaves the document. */
export interface FocusReturnState {
  readonly wasOpen: boolean;
  readonly open: boolean;
  readonly dismissedByEscape: boolean;
}

/**
 * Focus comes back only after Escape closed an open palette. Choosing a result
 * navigates, so pulling focus back to the old trigger would undo the reader's
 * move.
 */
export const shouldReturnFocus = (state: FocusReturnState): boolean =>
  state.wasOpen && !state.open && state.dismissedByEscape;

/** What the observer knows when a palette close also changed the route. */
export interface DestinationFocusState {
  readonly wasOpen: boolean;
  readonly open: boolean;
  readonly dismissedByEscape: boolean;
  readonly pathChanged: boolean;
}

/**
 * A chosen result is a client-side navigation, so focus belongs at the start of
 * the page that opened, not on the old trigger and never on `<body>`.
 */
export const shouldFocusDestination = (state: DestinationFocusState): boolean =>
  state.wasOpen && !state.open && !state.dismissedByEscape && state.pathChanged;

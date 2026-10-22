/**
 * The keyboard-only focus ring.
 *
 * `@gpuix/native@0.11.0` declares `focusVisible` with an outline, so a control
 * no longer learns it is focused to paint a ring: it **declares** the ring at
 * rest and the runtime paints it only after keyboard input (Tab), like CSS
 * `:focus-visible`. A mouse press never shows it. The measured behaviour is in
 * plan `053`: the `focus-visible` playground probe paints the outline on Tab and
 * not on a click, a native traversal or a programmatic focus before any key.
 *
 * The outline takes no layout space, so a control's measured geometry does not
 * change while it holds focus — the property the old spread-shadow workaround
 * was chosen for.
 */

import type { StyleDesc } from "@gpuix/react";
import { controlFocusRing } from "@gpuixui/tokens";
import type { PrimitiveTheme } from "./theme.js";

/**
 * The ring every control declares at rest; destructive when the control is
 * invalid.
 *
 * The rule is `@gpuixui/tokens`' `controlFocusRing`: this package's spelling of
 * it exists only to return a `StyleDesc`, so a call site never branches on the
 * control's state.
 */
export const keyboardRing = (
  theme: PrimitiveTheme,
  invalid?: boolean,
): StyleDesc => controlFocusRing(theme, { invalid }) ?? {};

/**
 * A control whose own content must stay readable while the keyboard focus is
 * elsewhere.
 *
 * The runtime dims every other focusable element to
 * `keyboardFocusDimOpacity` (40%) so a keyboard user can see where Tab can go.
 * On a filled action that composites the label into its own fill, and on a
 * field it fades the value the reader is reading, so both declare
 * `keyboardFocusDim: false`. A caller's `style` merges last and can put the dim
 * back. The measurement is `keyboardDimFailures` in `@gpuixui/tokens`.
 */
export const keepContent: StyleDesc = { keyboardFocusDim: false };

/** What decides whether a control declares a ring at all. */
export interface RingState {
  readonly disabled?: boolean;
  readonly invalid?: boolean;
}

/**
 * The ring a control declares at rest, or none for a control that cannot act.
 *
 * A disabled control leaves the tab order, but disabling the element that
 * already holds the focus does not move that focus — the runtime keeps it, so a
 * ring declared anyway would stay painted on a control that refuses every key.
 * Disabled therefore means no declaration; invalid still recolours it.
 *
 * The rule is `@gpuixui/tokens`' `controlFocusRing`; the absence it returns for
 * a disabled control becomes `{}` here, so a spread always paints the fill.
 */
export const controlRing = (
  theme: PrimitiveTheme,
  state: RingState = {},
): StyleDesc => controlFocusRing(theme, state) ?? {};

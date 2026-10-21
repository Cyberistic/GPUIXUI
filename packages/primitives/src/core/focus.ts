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
import { keyboardFocusRing } from "@gpuixui/tokens";
import type { PrimitiveTheme } from "./theme.js";

/** The ring every control declares at rest; destructive when the control is invalid. */
export const keyboardRing = (
  theme: PrimitiveTheme,
  invalid?: boolean,
): StyleDesc => {
  const ring = keyboardFocusRing(theme);
  return invalid === true
    ? {
        focusVisible: {
          ...ring.focusVisible,
          outlineColor: theme.colors.destructive,
        },
      }
    : ring;
};

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
 */
export const controlRing = (
  theme: PrimitiveTheme,
  { disabled, invalid }: RingState,
): StyleDesc => (disabled === true ? {} : keyboardRing(theme, invalid));

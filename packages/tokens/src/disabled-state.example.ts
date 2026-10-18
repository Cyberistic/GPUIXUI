/**
 * The inactive state a control paints: three roles, not a fade.
 *
 * The shipped component packages still reach the state with `opacity: 0.5`,
 * which GPUI composites as one group — the label dims with the fill it sits on.
 * A filled primary action's label measures **1.575:1** on the identity light
 * canvas and **1.468:1** at worst (Linux light, a card), under the 3:1 floor an
 * unavailable label is held to. A field dims the same way and its typed text
 * measures **3.273:1** on the macOS light `input` fill.
 *
 * A control that paints these roles instead keeps its label at the inactive
 * floor and its shape on any panel: the fill is allowed to sit near the panel,
 * so the edge carries the shape. Inside a tone-tinted status panel the canvas
 * fill is not a panel shape — keep the resting `softAction` fill and paint
 * `disabledForeground` (`inactivePanelActionPairs`).
 */
import type { Theme } from "./theme.js";

/** The style properties a disabled control paints. */
export interface DisabledPaint {
  /** Cleared, so a parent's dim cannot reach the control. */
  readonly opacity: number;
  readonly backgroundColor: string;
  readonly color: string;
  readonly borderColor: string;
}

/** The designed disabled state for a control on a normal panel. */
export const disabledPaint = (theme: Theme): DisabledPaint => ({
  opacity: 1,
  backgroundColor: theme.colors.disabled,
  color: theme.colors.disabledForeground,
  borderColor: theme.colors.border,
});

/**
 * The inactive state a control paints: three roles and its geometry, not a fade.
 *
 * The shipped component packages still reach the state with `opacity: 0.5`,
 * which GPUI composites as one group — the label dims with the fill it sits on.
 * A filled primary action's label measures **1.575:1** on the identity light
 * canvas and **1.468:1** at worst (Linux light, a card), under the 3:1 floor an
 * unavailable label is held to. A field dims the same way and its typed text
 * measures **3.273:1** on the macOS light `input` fill.
 *
 * A control that paints `disabledControl(theme)` instead keeps its label at the
 * inactive floor and its shape on any panel: the fill is allowed to sit near the
 * panel, so the edge carries the shape. Inside a tone-tinted status panel the
 * canvas fill is not a panel shape — keep the resting `softAction` fill and paint
 * `disabledForeground` (`inactivePanelActionPairs`).
 */
import type { ControlSize } from "./scale.js";
import { controlHeight, controlPaddingX, disabledControl } from "./styles.js";
import type { Theme } from "./theme.js";

/**
 * The inline style a disabled Button paints at the theme's density: the
 * designed roles plus the control's own box, so the example is a real control
 * shape rather than a bare colour bag.
 */
export const disabledButtonStyle = (
  theme: Theme,
  size: ControlSize = "md",
) => ({
  ...disabledControl(theme),
  height: controlHeight(theme, size),
  paddingLeft: controlPaddingX(theme, size),
  paddingRight: controlPaddingX(theme, size),
  borderRadius: theme.radius.md,
});

/**
 * The same designed pair on a row label: a selectable row that is chosen keeps
 * its `selected` fill and paints `disabledForeground`; while pressed it keeps
 * the `selectedActive` step (plan 651) and the same label. The contract
 * measures the label on both fills at the inactive floor, so a disabled row
 * item cannot vanish into the row the pointer is over.
 */
export const disabledRowStyle = (theme: Theme, pressed = false) => ({
  backgroundColor: pressed
    ? theme.colors.selectedActive
    : theme.colors.selected,
  color: theme.colors.disabledForeground,
  userSelect: "none" as const,
});

/**
 * The resting paint of a selection control that is **not** checked.
 *
 * The shipped primitives give the empty state no designed roles
 * (`primitives/src/core/selection.ts`): a checkbox draws its edge with `input`
 * — a field *fill* — and a switch paints its track with `muted` — a *surface* —
 * so on a card the two measure **1.000:1** in identity light and on every
 * platform dark card, and the control has no shape. The designed state is the
 * two boundary roles the rest of the system uses: the functional `borderStrong`
 * edge, and — for a switch, which is the unfilled part of a value indicator —
 * the `track` groove with its knob in `foreground`. A checkbox paints no fill of
 * its own, so the panel shows through the box.
 *
 * `trackMarkPairs` holds the knob to the mark floor on the groove and
 * `trackSurfacePairs`/`controlBoundaryPairs` hold the other two roles on their
 * surfaces, so an edited theme cannot erase the control. The checked state takes
 * the accent family instead (`filledControl`), with `insetFocusRing` for a ring
 * drawn inside the fill.
 */
import type { Theme } from "./theme.js";

/** The two controls that paint a selection state at rest. */
export type EmptySelectionControl = "checkbox" | "switch";

/** The roles an unchecked selection control paints. */
export interface EmptySelectionStyle {
  /**
   * The switch's unfilled groove (`track`); absent for a checkbox, which shows
   * its panel through the box. `undefined` is deliberate: this is the
   * `StyleDesc.backgroundColor` member, and GPUix paints nothing when it is
   * unset.
   */
  readonly backgroundColor: string | undefined;
  /** The functional control boundary (`borderStrong`). */
  readonly borderColor: string;
  /** The switch's knob (`foreground`), measured on the groove. */
  readonly knobColor: string;
}

/**
 * The designed paint of an unchecked checkbox or an off switch.
 *
 * @example
 * ```tsx
 * import { getTheme } from "@gpuixui/tokens";
 * import { emptySelectionStyle } from "./unchecked-selection.example.js";
 *
 * const theme = getTheme("light");
 * const track = emptySelectionStyle(theme, "switch");
 *
 * <div style={{ borderWidth: 1, ...track }} />;
 * ```
 */
export const emptySelectionStyle = (
  theme: Theme,
  control: EmptySelectionControl,
): EmptySelectionStyle => ({
  backgroundColor: control === "switch" ? theme.colors.track : undefined,
  borderColor: theme.colors.borderStrong,
  knobColor: theme.colors.foreground,
});

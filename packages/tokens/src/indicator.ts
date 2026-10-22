/**
 * The contract for an **indicator mark**: the role a component paints when it
 * shows rather than says something — a progress fill, a spinner's lit dot, a
 * slider's filled span, a switch's on-state, a presence dot.
 *
 * A mark is neither text nor a boundary, so no part of the contrast table
 * covered it: `primary` was measured only against its own on-colour, and a
 * progress bar or spinner dot drawn on the page was measured by nothing. A mark
 * still has one job — a reader has to find it from across a panel — so it gets
 * the non-text floor (`contrastFloors.boundary`, 3:1; 4.5:1 in a high-contrast
 * theme) on every strip a bar or dot is drawn on.
 *
 * A **status** mark does not paint the tone's solid role. That role is designed
 * as a *surface* that carries text — light `warning` is a pale amber with
 * near-black text, 1.78:1 on the page — so a dot or bar painted in it would be
 * the one mark nobody can find. A status mark paints the tone's readable role
 * instead, `statusTone(theme, tone).foreground`, which is already the role a
 * soft status surface and a field error paint.
 */

import type { ThemeColors } from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";
import { statusTones } from "./styles.js";
import type { ThemeContrast } from "./theme.js";

/**
 * The roles a component may paint a mark in: the three action and field marks
 * the recipes already use (`primary`, `success`, `destructive` and the neutral
 * `mutedForeground` a muted progress tone paints), plus each status tone's
 * readable role — never its solid fill.
 *
 * A mark drawn **inside** a filled control is the exception the table does not
 * need: it paints that fill's on-colour (`primaryForeground`, …), which the
 * contrast table already measures on its own fill.
 */
export const indicatorRoles = [
  "primary",
  "success",
  "destructive",
  "mutedForeground",
  ...statusTones.map((tone) => `${tone}SoftForeground` as const),
] as const satisfies readonly (keyof ThemeColors)[];

/**
 * The strips a mark is drawn on: the page, a card, a floating surface and a
 * muted toolbar strip at rest, the four washes a row wears while the pointer or
 * the reader's choice is on it, and a field's own fill. Each is a surface the
 * library already paints a bar or a dot on, and each is where the mark has to be
 * found.
 *
 * The washes are not decoration. A **menu or combobox row** paints its checked
 * tick (`packages/components/src/menu/item.tsx`,
 * `packages/components/src/combobox.tsx`) and washes itself `hover` on the
 * pointer and `active` while pressed, so the tick is read on those two strips
 * rather than on the popover it rests on. A **list row** is the second registry
 * and the other two washes: `list.tsx` tints `accent` under the pointer, keeps
 * `active` while the press that opened a surface is down, and fills `selected`
 * once the row is chosen, while its `leading` slot is documented as the place
 * for an `Avatar` (`docs/list.mdx`) — and an avatar's presence dot is a mark,
 * painted `success`, `destructive`, `mutedForeground` or a tone's readable role
 * (`avatar.tsx`). A dot on the row a reader has chosen was measured by nothing,
 * and it found Luna light's success fill at 2.99:1 on the look's selected wash.
 */
export const indicatorSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
  // A field's own fill carries its caret, and a field is a surface a mark is
  // drawn on: `nativeTextTheme` hands the runtime `primary` as the caret on the
  // fill the field paints. It was the one mark surface no placement named.
  "input",
] as const;

/** One indicator mark that cannot be found on the strip it is drawn on. */
export interface IndicatorFailure {
  /** The role the mark paints. */
  readonly role: keyof ThemeColors;
  /** The strip it is drawn on. */
  readonly surface: keyof ThemeColors;
  /**
   * The measured ratio, or `undefined` when a value is translucent or not hex.
   * An unverifiable mark is reported rather than skipped.
   */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/**
 * Every indicator mark in a theme that misses the non-text floor.
 *
 * An empty array means every bar, dot and presence mark is visible where the
 * library draws it. Runs the same placements the built-in themes are tested
 * against, so a brand theme is held to the floor the library publishes rather
 * than to a second one. The floors follow the theme's own `contrast` declaration
 * unless one is passed, so a brand derived from a high-contrast theme is held to
 * 4.5:1 without the caller naming a floor set. A mark or strip the theme does not
 * carry is reported unmeasurable rather than skipped.
 *
 * @example
 * ```ts
 * import { indicatorFailures, lightTheme } from "@gpuixui/tokens";
 *
 * indicatorFailures(lightTheme); // [] — every shipped mark is visible
 * ```
 */
export function indicatorFailures(
  theme: {
    readonly colors: Partial<ThemeColors>;
    readonly contrast?: ThemeContrast;
  },
  floors: ContrastFloors = contrastFloorsFor(theme),
): readonly IndicatorFailure[] {
  return indicatorRoles.flatMap((role) =>
    indicatorSurfaces.flatMap((surface): ReadonlyArray<IndicatorFailure> => {
      const ratio = contrastRatio(theme.colors[role], theme.colors[surface]);
      return ratio !== undefined && ratio >= floors.boundary
        ? []
        : [{ role, surface, ratio, floor: floors.boundary }];
    }),
  );
}

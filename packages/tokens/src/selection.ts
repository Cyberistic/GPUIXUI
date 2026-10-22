/**
 * The text-selection wash, measured where it is painted.
 *
 * `selection` is the one translucent role that sits **behind text the reader is
 * reading**: GPUix's `selectionColor` style property washes a run the reader
 * selected, and the run keeps the text role it already had. `contrastRatio`
 * refuses a translucent colour, so the contract that measures every other text
 * surface measured neither this role nor anything it touches — a theme could
 * ship a wash that hid the text it selects and pass the whole gate.
 *
 * It found three: Linux dark, Windows dark and Windows XP Luna dark carried a
 * 30% accent wash on surfaces lighter than the base theme's, which left body
 * text at 6.63:1, 6.33:1 and 6.80:1 against the 7:1 floor. Their own `selection`
 * is a 24% tint now, the share the base dark theme already used.
 *
 * Measuring **secondary** text on the same surfaces then found that most styles
 * had no room for a wash at all: with the rest of the palette unchanged the
 * wash left `mutedForeground` at 4.25–4.44:1 on the light platform themes and
 * 3.27–4.13:1 on the dark ones, against the 4.5:1 floor the unselected pair
 * meets. The wash is not the defect — the secondary role had no headroom above
 * the floor, so a selection could only ever bury it. The grey ramp's 600 and 400
 * steps sit at that edge (the base dark theme measured 4.96:1 on its popover
 * before any wash), so the light sets take a step darker (`#4B5362`) and the
 * dark sets a step lighter (`#C1C7D1`), and every platform and authored style
 * inherits the headroom. No wash strength changed.
 */

import { alphaOf, blend, type ThemeColors } from "./color.js";
import {
  contrastFloors,
  contrastRatio,
  type ContrastFloors,
  type ContrastPair,
} from "./contrast.js";
import { decorativeFloor } from "./decorative.js";

/**
 * The text pairs a reader can select, and the surface each keeps its role on.
 *
 * The four content surfaces — a field's value, prose on the page, a card and a
 * popover — where the resting pair is already held to the body floor, so a wash
 * that lowers what the reader can read is measured against the same floor the
 * unselected text is. The three prose surfaces also carry secondary text
 * (`mutedForeground`) — a caption, a table's second line, a log row — at the
 * secondary floor, so a wash readable for a heading but not for the line under
 * it is reported rather than passing on the heading alone.
 */
export const selectionPairs: readonly ContrastPair[] = [
  { foreground: "inputForeground", background: "input", floor: "body" },
  { foreground: "foreground", background: "background", floor: "body" },
  { foreground: "cardForeground", background: "card", floor: "body" },
  { foreground: "popoverForeground", background: "popover", floor: "body" },
  {
    foreground: "mutedForeground",
    background: "background",
    floor: "secondary",
  },
  { foreground: "mutedForeground", background: "card", floor: "secondary" },
  { foreground: "mutedForeground", background: "popover", floor: "secondary" },
];

/**
 * Which of a wash's two jobs it missed: being seen where the reader selected,
 * or keeping the text inside it readable.
 */
export interface SelectionFailure {
  /** `visibility` — a wash the reader cannot find; `legibility` — text it obscures. */
  readonly kind: "visibility" | "legibility";
  /** The text role the reader selected. */
  readonly foreground: keyof ThemeColors;
  /** The surface the wash is composited over. */
  readonly background: keyof ThemeColors;
  /** The colour a reader sees, or the surface itself when it could not be blended. */
  readonly wash: string;
  /**
   * The measured ratio, or `undefined` when it could not be measured because the
   * surface is translucent or not a colour the renderer paints. An unverifiable
   * wash is reported rather than skipped.
   */
  readonly ratio: number | undefined;
  /** The floor it had to reach: the pair's own text floor, or `decorativeFloor`. */
  readonly floor: number;
}

/** The wash a reader sees over one surface: the role at the share it carries. */
const washOver = (colors: ThemeColors, over: keyof ThemeColors): string =>
  blend(colors[over], colors.selection, alphaOf(colors.selection));

/**
 * Every selection wash in a theme that misses one of its two floors.
 *
 * The role is composited over each surface first, so the translucent wash is
 * measured by the result a reader sees. A wash must be visible against the
 * surface it tints — the same 1.05:1 perceptibility floor the decorative
 * surfaces use, because a selection the reader cannot find is not a selection —
 * and the text inside it must clear the floor the unselected pair already met:
 * the body floor for the text a surface is read in, the secondary floor for the
 * `mutedForeground` line beside it.
 *
 * An empty array means the theme can be selected from. Runs over `selectionPairs`,
 * so a brand is held to the surfaces the library's own themes are.
 *
 * @example
 * ```ts
 * import { selectionFailures, type Theme } from "@gpuixui/tokens";
 *
 * selectionFailures(brand).length === 0; // the wash is visible and its text readable
 * ```
 */
export function selectionFailures(
  theme: { readonly colors: ThemeColors },
  floors: ContrastFloors = contrastFloors,
): readonly SelectionFailure[] {
  return selectionPairs.flatMap(({ foreground, background, floor }) => {
    const wash = washOver(theme.colors, background);
    const failures: SelectionFailure[] = [];
    const visible = contrastRatio(wash, theme.colors[background]);
    if (visible === undefined || visible < decorativeFloor) {
      failures.push({
        kind: "visibility",
        foreground,
        background,
        wash,
        ratio: visible,
        floor: decorativeFloor,
      });
    }
    const legible = contrastRatio(theme.colors[foreground], wash);
    if (legible === undefined || legible < floors[floor]) {
      failures.push({
        kind: "legibility",
        foreground,
        background,
        wash,
        ratio: legible,
        floor: floors[floor],
      });
    }
    return failures;
  });
}

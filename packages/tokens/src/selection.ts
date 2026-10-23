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
 * inherits the headroom. The one wash that changed is the high-contrast dark
 * one — 30% to 26% — because its secondary text is held to the AAA floor.
 *
 * The fifth content surface is **`muted`**, the fill the library paints behind a
 * user's chat bubble (`MESSAGE_BUBBLES.user` is `bg-muted`) and behind a
 * `surface="muted"` box, and a `Text selectable` inside either one hands the
 * runtime the wash over that fill. It was measured by nothing, and it found one
 * style: Aero dark's 30% wash buried the bubble's body text at 6.74:1 under the
 * 7:1 floor, so the look carries the same 24% share its siblings use. The
 * bubble paints body copy only — its author line sits outside it — so the muted
 * surface is measured for the body role alone.
 *
 * **Where the wash is painted — and where it is not.** `surfaceStyle` also
 * paints two *saturated* tones, `accent` and `selected`, and a selectable run
 * inside either one is washed too. They are deliberately **not** pairs: a wash
 * is a share of the accent family, and so are those two fills, so the wash moves
 * the fill *toward* the text instead of away from it. Measured over the sixteen
 * shipped, high-contrast, platform and authored styles, that costs contrast in
 * **every one of the eighty placements** — the wash never helps — and leaves
 * **39 under the floor the unwashed pair already met**. The tightest is Windows
 * XP (Luna) dark's secondary line on a selected row at 3.78:1; the tightest
 * **body** placement is the base dark theme's selected row title at 5.33:1
 * against 7, because that role is body text (`selectedForeground` on
 * `selected`). No share can serve both jobs: one strong
 * enough to be seen on the page is exactly what erases text on a saturated fill,
 * and one weak enough to keep that text readable is invisible on the page. So a
 * selectable run belongs on a content tone, a state row that needs selectable
 * text paints it on one, and the two saturated tones stay outside the contract.
 * The exclusion is measured rather than assumed: `selection.test.ts` reads the
 * tones the primitives resolve, so a tone added to `SURFACE_TONES` fails until
 * the wash is measured on it or it is recorded here with its reason, and it
 * holds the eighty placements and their floors, so a palette that made the wash
 * help there would fail until the decision was re-read.
 *
 * **A status message's own tint is a third answer.** An `Alert`'s description is
 * a container — it may hold an action, so it may hold a selectable run — and the
 * fill behind its copy is the tone's `xSoft` role, which is a *content* tone
 * rather than a saturated one. The designed wash still cannot serve it: every
 * light tint carries it (the pale tints are far from the body ink), but **30 of
 * the 32 dark tint placements fall under the body floor**, the worst being
 * Windows dark's `warningSoft` at **5.21:1**, because the accent a dark wash is
 * drawn from is *lighter* than the tint and moves it toward the near-white text.
 * No single share fixes that — one weak enough for the tint is invisible on the
 * page — so the wash is derived per surface instead: {@link selectionOn} moves
 * the theme's own selection toward the page, away from the body ink, until both
 * jobs hold. Every shipped style and every tint resolves (the light tints keep
 * the theme's own wash), so a message's copy can be selectable without the
 * cascade that would follow from repainting four tint roles in eight styles.
 */

import {
  alphaOf,
  blend,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
  type ContrastPair,
} from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import type { Theme, ThemeContrast } from "./theme.js";

/**
 * The text pairs a reader can select, and the surface each keeps its role on.
 *
 * The five content surfaces — a field's value, prose on the page, a card, a
 * popover and a message bubble's `muted` fill — where the resting pair is
 * already held to the body floor, so a wash that lowers what the reader can read
 * is measured against the same floor the unselected text is. The three prose
 * surfaces also carry secondary text (`mutedForeground`) — a caption, a table's
 * second line, a log row — at the secondary floor, so a wash readable for a
 * heading but not for the line under it is reported rather than passing on the
 * heading alone.
 *
 * The two saturated state tones (`accent`, `selected`) are deliberately absent:
 * the wash is drawn from the same accent family as those fills, so it moves them
 * toward the text and costs contrast in all eighty placements (see the module
 * note). A selectable run belongs on one of the content tones.
 */
export const selectionPairs: readonly ContrastPair[] = [
  { foreground: "inputForeground", background: "input", floor: "body" },
  { foreground: "foreground", background: "background", floor: "body" },
  { foreground: "cardForeground", background: "card", floor: "body" },
  { foreground: "popoverForeground", background: "popover", floor: "body" },
  // A user message is `bg-muted`, the bubble paints no colour of its own, and a
  // selectable `Text` inside it washes the run over that fill — so the muted
  // surface is read in the same `foreground` role the page is. The bubble's
  // author line is painted outside it, so it carries body copy only.
  { foreground: "foreground", background: "muted", floor: "body" },
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
  /**
   * The colour a reader sees, or `undefined` when it could not be blended — a
   * transparent wash, or a surface the theme does not carry.
   */
  readonly wash: string | undefined;
  /**
   * The measured ratio, or `undefined` when it could not be measured because the
   * surface is translucent or not a colour the renderer paints. An unverifiable
   * wash is reported rather than skipped.
   */
  readonly ratio: number | undefined;
  /** The floor it had to reach: the pair's own text floor, or `decorativeFloor`. */
  readonly floor: number;
}

/**
 * The wash a reader sees over one surface: the role at the share it carries, or
 * `undefined` when the theme carries no wash or no surface to composite it over.
 */
const washOver = (
  colors: Partial<ThemeColors>,
  over: keyof ThemeColors,
): string | undefined => {
  const surface = colors[over];
  const wash = colors.selection;
  return surface === undefined || wash === undefined
    ? undefined
    : blend(surface, wash, alphaOf(wash));
};

/**
 * The granularity of a derived wash: 2% of the way from the theme's own
 * selection toward the page per step, so a wash stays as close to the designed
 * one as the surface allows.
 */
const WASH_STEPS = 50;

/**
 * The role a surface paints its body copy in, read from the pair table so a
 * content surface's own text role is used rather than the page's.
 */
const bodyRoleOn = (surface: keyof ThemeColors): keyof ThemeColors =>
  selectionPairs.find(
    (pair) => pair.background === surface && pair.floor === "body",
  )?.foreground ?? "foreground";

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
 * so a brand is held to the surfaces the library's own themes are. The text
 * floors follow the theme's own `contrast` declaration unless one is passed, so a
 * brand derived from a high-contrast theme is held to AAA without the caller
 * naming a floor set. A pair whose surface or wash the theme does not carry is
 * reported unmeasurable: the wash cannot be composited, and `invalidColorRoles`
 * names the role.
 *
 * @example
 * ```ts
 * import { selectionFailures, type Theme } from "@gpuixui/tokens";
 *
 * selectionFailures(brand).length === 0; // the wash is visible and its text readable
 * ```
 */
export function selectionFailures(
  theme: ColourSource & { readonly contrast?: ThemeContrast },
  floors: ContrastFloors = contrastFloorsFor(theme),
): readonly SelectionFailure[] {
  const colors = themeColors(theme);
  return selectionPairs.flatMap(({ foreground, background, floor }) => {
    const wash = washOver(colors, background);
    const failures: SelectionFailure[] = [];
    const visible = contrastRatio(wash, colors[background]);
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
    const legible = contrastRatio(colors[foreground], wash);
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

/**
 * The wash a selectable run paints on one **known** surface.
 *
 * {@link selectionFailures} measures the theme's one designed wash on the
 * content tones, which is where it was authored to work. A run on a surface that
 * wash cannot serve — a message's own `xSoft` tint, where the dark palettes leave
 * the designed wash at 5.21:1 — asks this instead: the theme's own selection,
 * moved toward the page (away from the body ink) by the smallest 2% step that
 * keeps the wash visible and the text readable on *that* surface. The page is
 * the anchor because it is the role furthest from body text in both modes, so a
 * step toward it can only lower the wash's interference with the ink.
 *
 * It returns the theme's own selection where that already carries the surface
 * (every light status tint, and every content tone in the shipped styles), and a
 * selection the renderer cannot measure is returned unchanged rather than
 * replaced by a guess. A surface no step can serve — a theme whose wash is fully
 * transparent, for instance — keeps the theme's own wash: the cue is not
 * removed, and {@link selectionFailures} reports the pair it breaks.
 *
 * The text floor follows the theme's own contrast variant (7:1 in both, through
 * `contrastFloorsFor`), the same rule the gate uses.
 *
 * @example
 * ```tsx
 * import { selectionOn, statusTone, type Theme } from "@gpuixui/tokens";
 *
 * const message = (theme: Theme) => {
 *   const tone = statusTone(theme, "warning");
 *   return (
 *     <text
 *       style={{
 *         backgroundColor: tone.background,
 *         selectionColor: selectionOn(theme, "warningSoft"),
 *       }}
 *     />
 *   );
 * };
 * ```
 */
export function selectionOn(
  theme: Theme,
  surface: keyof ThemeColors,
  floors: ContrastFloors = contrastFloorsFor(theme),
): string {
  const fill = theme.colors[surface];
  const text = theme.colors[bodyRoleOn(surface)];
  const carries = (wash: string): boolean => {
    const composed = blend(fill, wash, alphaOf(wash));
    const legible = contrastRatio(text, composed);
    const visible = contrastRatio(composed, fill);
    return (
      (legible === undefined || legible >= floors.body) &&
      (visible === undefined || visible >= decorativeFloor)
    );
  };
  return (
    Array.from({ length: WASH_STEPS + 1 }, (_, step) =>
      blend(theme.colors.selection, theme.colors.background, step / WASH_STEPS),
    ).find(carries) ?? theme.colors.selection
  );
}

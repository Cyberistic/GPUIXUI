/**
 * How a declared pointer state resolves, and the state probe's fixture chains.
 *
 * The bug being guarded: every interactive surface declares `style.hover` /
 * `style.active` (30 and 39 uses in `primitives`/`components`, most of them
 * colour-only), and the suite proves the mechanism on a **layout** property
 * plus the authored style report. A runtime that applies the refinement but
 * drops its `backgroundColor` would pass every check while every button, row,
 * tab and menu item had an invisible hover and pressed state.
 *
 * `state-pixels.ts` is the single source of truth for the precedence the probe
 * asserts (`active` > `hover` > authored), for the precondition that no fixture
 * hides a state behind its own fill, and for which theme role each fixture's
 * state uses. The view and the expectations both build from it, so a swapped
 * role cannot pass by agreeing with itself: the frame is the other witness.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ThemeColors } from "@gpuixui/tokens";

/** The pointer states a declared style can refine. */
export type PointerState = "rest" | "hover" | "active";

/** One fixture's declared background chain, as the runtime's style shape. */
export interface StateColours {
  readonly rest: string;
  readonly hover?: string;
  readonly active?: string;
}

const firstDeclared = (
  values: ReadonlyArray<Option.Option<string>>,
  fallback: string,
): string => Option.getOrElse(Option.firstSomeOf(values), () => fallback);

/**
 * The colour a chain resolves to for a pointer state.
 *
 * `active > hover > rest`: a pressed control must not look merely hovered, and
 * a chain that declares no `active` keeps its hover fill while pressed.
 */
export const resolveStateColour = (
  colours: StateColours,
  state: PointerState,
): string =>
  Match.value(state).pipe(
    Match.when("rest", () => colours.rest),
    Match.when("hover", () =>
      firstDeclared([Option.fromNullishOr(colours.hover)], colours.rest),
    ),
    Match.when("active", () =>
      firstDeclared(
        [
          Option.fromNullishOr(colours.active),
          Option.fromNullishOr(colours.hover),
        ],
        colours.rest,
      ),
    ),
    Match.exhaustive,
  );

/**
 * Whether every declared state is distinguishable from every other.
 *
 * A palette edit or a copy-paste slip that gives a fixture `hover: card` on a
 * `card` fill would make every pixel check pass while proving nothing, so the
 * probe refuses the fixture by name before it samples a frame.
 */
export const hasDistinctStates = (colours: StateColours): boolean => {
  const declared = Arr.getSomes([
    Option.some(colours.rest),
    Option.fromNullishOr(colours.hover),
    Option.fromNullishOr(colours.active),
  ]);
  return Arr.length(Arr.dedupe(declared)) === Arr.length(declared);
};

/** The four fixtures' chains, in role terms. */
export interface StateFixtures {
  readonly hover: StateColours;
  readonly parent: StateColours;
  readonly child: StateColours;
  readonly press: StateColours;
}

/**
 * The probe's chains, built from the theme so a palette edit moves the paint
 * and the expectation together.
 *
 * The roles are chosen to be far apart on the ramp (`card #191D25`,
 * `primary #A7A9FF`, `accent #2E2370`, `success #3BC97F`,
 * `destructive #FF6B6B` in the dark palette), not because the shipped controls
 * use exactly these pairs: the mechanism is the contract, and a sample must
 * fail loudly if its state does not paint.
 */
export const stateFixtures = (colors: ThemeColors): StateFixtures => ({
  hover: { rest: colors.card, hover: colors.primary },
  parent: { rest: colors.muted, hover: colors.accent },
  child: { rest: colors.card, hover: colors.success },
  press: {
    rest: colors.card,
    hover: colors.primary,
    active: colors.destructive,
  },
});

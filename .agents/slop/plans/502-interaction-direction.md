# Plan 502 — the interaction ladder's direction in the total check

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
097 (designed filled families), 327 (the accent family), 342 (the step floor),
357 (the wash ladder), 381 (the selection step), 383 (one total check), 387/388
(the shipped-theme enumeration), 394 (the panel action), 398 (the check index).

**Status:** done — `stateLadders` and `themeDirectionFailures` ship, the total
check composes a sixth kind, the tokens suite is green (102 files / 5197 tests),
and `nub run check`, `nub run lint`, `nub run test` pass. Both directions were
run: with the composition reverted, the new `theme-check` case fails; with the
rule stubbed to `[]`, both inversion cases fail; with the fix, every case
passes and every shipped set returns `[]`.

---

## 1. The measured gap

The contract publishes that a pointer state is **perceivable** — `stateStepPairs`
holds `xHover` one 1.05:1 step from `x` and `xActive` from `xHover`, and
`washStepPairs` / `selectionStepPairs` do the same for the generic wash and the
selected row. It does **not** publish which way the step must go.

Plan 097's defect was not a collapsed step; it was an **inverted** one. The
translucent hover made the light primary's hover *lighter* than its resting fill
and its press lighter still. Every shipped theme now steps **away from the
canvas** — darker in light, lighter in dark — and `filled-states.test.ts` asserts
it, but only on the shipped constants. `themeFailures` therefore accepts a
consumer theme that reintroduces the exact bug.

Measured on this tree with a probe (a light identity theme with one family
inverted, every other role untouched):

```text
primary #1E1060 → primaryHover #2A1A7A → primaryActive #372394
primaryForeground #FFFFFF:  16.18:1 / 13.75:1 / 11.47:1   (floor 4.5)
primary → hover 1.176:1 · hover → active 1.199:1          (step floor 1.05)
themeFailures(inverted) = []
```

The family passes the on-colour floor, the step floor and the surface floor, so
all five checks return `[]` while the hover and press move *toward* the white
canvas. The same holds in dark mode with the direction reversed:

```text
primary #A7A9FF → primaryHover #948CFA → primaryActive #8377F6
primaryForeground #11141A:   8.57:1 / 6.49:1 / 5.21:1
primary → hover 1.321:1 · hover → active 1.245:1
themeFailures(inverted) = []
```

The documentation already states the rule: `docs/tokens.md` says
`filled-states.test.ts` proves the direction follows the mode, and the
design-system says a filled control steps away from the canvas. The shipped
guarantee is the gap, not the design.

## 2. Decision

Publish the direction as a **sixth check** over an ordered ladder list, beside
the step contract rather than inside it.

1. **`relativeLuminance(color)` in `contrast.ts`.** The token maths already has a
   private `luminance(hex)`; expose the public function that parses a role and
   returns `0…1`, or `NaN` for a value the parser cannot read, the same
   convention as `contrastRatio`. The direction rule is a comparison of two
   luminances, and a consumer explaining a report should be able to reproduce it.
2. **`stateLadders` in a new `direction.ts`.** Every ladder the design system
   documents, in documentation order: the four filled families derived from
   `filledControlFamilies` (`x`, `xHover`, `xActive`), the panel action
   (`softAction`, `softActionHover`, `softActionActive`), the generic wash
   (`hover`, `active`) and the selection step (`accent`, `selected`). Deriving
   the families means a fifth family joins the direction rule with the one entry
   that already gives it hover and pressed roles.
3. **`themeDirectionFailures(theme)`.** Expected direction is
   `theme.mode === "light" ? "darker" : "lighter"`. A step that moves the other
   way is reported with the ladder, both roles, the expected direction and both
   luminances. A `NaN` luminance is reported too: the direction cannot be
   established. **An equal pair is not reported** — `stateStepPairs`,
   `washStepPairs`, `selectionStepPairs` and `softActionStepPairs` own that
   defect, and duplicating it would make one edit produce two diagnostics.
4. **The sixth check kind is `"direction"`, labelled "interaction direction".**
   `themeChecks` gains it after `hierarchy` and before `metric`, so
   `themeFailures` composes colour → typeface → contrast → hierarchy → direction
   → metric. The contrast and hierarchy halves keep the `contrast` argument; the
   direction half reads `theme.mode`, which no override can change.
5. **No colour, pair, floor or metric moves.** A probe over all 24 shipped sets
   (`shippedThemes`) finds every ladder already moves the expected way — the
   filled families, the panel action, the generic wash and the selection step.
   If any shipped set fails, that is a shipped defect: STOP (see §5).

Rejected alternatives:

- **Fold direction into `themeContrastFailures`.** A contrast pair is one
  ratio and a floor; a direction failure is two luminances and an ordering. Plan
  392 rejected the same fold for the text hierarchy, and the report would lose
  which rule was broken.
- **Express direction as a ratio pair.** `1.05:1` is symmetric: the same pair
  passes whichever side is lighter, which is exactly the blindness this plan
  closes.
- **Check direction on the shipped themes in `filled-states.test.ts` only.**
  That is the current state; it guards the library's own values and nothing a
  consumer copies.
- **Compare each fill with the surface behind it.** The canvas is not the only
  surface a ladder paints on (a card, a menu, a tinted panel), and several
  shipped pairs sit on a dark card where "away from the canvas" and "away from
  the card" agree. The design rule is stated against the mode, so the check
  compares the steps with each other.
- **Report equality from both checks.** It doubles the diagnostics for one edit
  and makes the step lists and the direction list overlap; keep the division:
  step owns collapsed, direction owns inverted.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

After the private `luminance` helper and before `contrastRatio`, add:

```ts
/**
 * The WCAG relative luminance of an opaque `#RRGGBB` colour: `0` for black and
 * `1` for white. A value the token maths cannot parse yields `NaN`, so a
 * malformed role is reported rather than ordered as if it were a colour.
 *
 * @example
 * ```ts
 * relativeLuminance("#FFFFFF"); // 1
 * relativeLuminance("#000000"); // 0
 * ```
 */
export function relativeLuminance(color: string): number {
  const hex = hexOf(color);
  return hex === undefined ? Number.NaN : luminance(hex);
}
```

Do not change `contrastRatio`'s behaviour.

### 3.2 `packages/tokens/src/direction.ts` (new)

```ts
/**
 * The direction half of the theme contract.
 *
 * A pointer state is not only perceivable, it moves a consistent way: the
 * design system steps a fill away from the canvas — darker in light, lighter in
 * dark. Plan 097's shipped defect was an *inverted* step, not a collapsed one,
 * so a step floor alone cannot see it: a light family whose hover and press
 * lighten passes 1.05:1, the on-colour floor and the surface floor while
 * returning toward the canvas. This module publishes the ladders and the rule
 * for an edited theme, beside the step pairs that publish the distance.
 */

import type { ThemeColors } from "./color.js";
import { relativeLuminance } from "./contrast.js";
import { filledControlFamilies } from "./styles.js";
import type { Theme } from "./theme.js";

/** One interaction ladder: a resting fill followed by its pointer states. */
export interface StateLadder {
  /** The family or mechanism the ladder belongs to, for diagnostics. */
  readonly name: string;
  /** The fills from rest upward — at least a rest and one state. */
  readonly roles: ReadonlyArray<keyof ThemeColors>;
}

/**
 * Every interaction ladder the library documents, in documentation order: the
 * four filled families (derived from {@link filledControlFamilies}), the action
 * a soft status panel carries, the generic wash a ghost or outline control
 * paints, and the selected step past the accent a row hovers with.
 */
export const stateLadders: ReadonlyArray<StateLadder> = [
  ...filledControlFamilies.map(
    (family): StateLadder => ({
      name: family,
      roles: [family, `${family}Hover`, `${family}Active`],
    }),
  ),
  {
    name: "softAction",
    roles: ["softAction", "softActionHover", "softActionActive"],
  },
  { name: "wash", roles: ["hover", "active"] },
  { name: "selection", roles: ["accent", "selected"] },
];

/** A ladder step that moves toward the canvas instead of away from it. */
export interface DirectionFailure {
  /** The ladder the step belongs to — a family, `softAction`, `wash` or `selection`. */
  readonly ladder: string;
  /** The fill the step starts from. */
  readonly from: keyof ThemeColors;
  /** The fill it moves to. */
  readonly to: keyof ThemeColors;
  /** The direction the theme's mode requires. */
  readonly expected: "darker" | "lighter";
  /** The starting fill's relative luminance. */
  readonly fromLuminance: number;
  /** The ending fill's relative luminance. */
  readonly toLuminance: number;
}

/**
 * Every ladder step that moves toward the canvas.
 *
 * A light theme steps darker and a dark theme lighter, the same direction
 * `filled-states.test.ts` asserts on the shipped values. An equal pair is not
 * reported here — `stateStepPairs`, `washStepPairs`, `selectionStepPairs` and
 * `softActionStepPairs` report a collapsed step — and a value the maths cannot
 * parse is reported because no direction can be established.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeDirectionFailures } from "@gpuixui/tokens";
 *
 * const inverted = extendTheme(getTheme("light"), {
 *   colors: {
 *     primary: "#1E1060",
 *     primaryHover: "#2A1A7A",
 *     primaryActive: "#372394",
 *   },
 * });
 *
 * themeDirectionFailures(inverted); // two `darker` failures, one per step
 * ```
 */
export function themeDirectionFailures(
  theme: Theme,
): ReadonlyArray<DirectionFailure> {
  const expected = theme.mode === "light" ? "darker" : "lighter";
  return stateLadders.flatMap(({ name, roles }) =>
    roles.flatMap((to, index) => {
      const from = roles[index - 1];
      if (from === undefined) {
        return [];
      }
      const fromLuminance = relativeLuminance(theme.colors[from]);
      const toLuminance = relativeLuminance(theme.colors[to]);
      const moves =
        expected === "darker"
          ? toLuminance < fromLuminance
          : toLuminance > fromLuminance;
      const collapsed = fromLuminance === toLuminance;
      return moves || collapsed
        ? []
        : [{ ladder: name, from, to, expected, fromLuminance, toLuminance }];
    }),
  );
}
```

### 3.3 `packages/tokens/src/index.ts`

Add `export * from "./direction.js";` between `contrast.js` and `elevation.js`.

### 3.4 `packages/tokens/src/theme-check.ts`

- Import `themeDirectionFailures` and `type DirectionFailure` from
  `./direction.js`.
- Add `"direction"` to `themeChecks` after `"hierarchy"`.
- Add `readonly direction: DirectionFailure;` to `FailurePayload`.
- Extend the `ThemeFailure` JSDoc: `direction` is a ladder step that moves
  toward the canvas.
- In `themeFailures`, compose the direction half after the hierarchy half and
  before the metrics, and extend the JSDoc's order sentence and its list of
  partial-check examples: "a light `primaryHover` lighter than its `primary`
  returns `[]` from the contrast check alone".

### 3.5 `packages/tokens/src/theme-check.example.ts`

Add an inverted light primary family to `brokenTheme` so it exercises the sixth
class without a second example theme:

```ts
    primary: "#1E1060",
    primaryHover: "#2A1A7A",
    primaryActive: "#372394",
```

Extend the doc comment above it ("…and a primary family whose hover and press
move lighter in a light theme") and the final JSDoc line to
`colour → typeface → contrast → hierarchy → direction → metric`.

### 3.6 `packages/tokens/src/theme-check.test.ts`

- Header: add a paragraph naming plan 502 and the direction class.
- Import `themeDirectionFailures`.
- Include it in the `brokenFailures.length` sum.
- Add the order assertions: `lastHierarchy < firstDirection` and
  `lastDirection < firstMetric`.
- Add a `direction` payload assertion:

```ts
    expect(brokenFailures).toContainEqual({
      kind: "direction",
      ladder: "primary",
      from: "primary",
      to: "primaryHover",
      expected: "darker",
      fromLuminance: expect.any(Number),
      toLuminance: expect.any(Number),
    });
```

- Add a case proving the sixth check earns its place:

```ts
  it("catches a direction-only defect the contrast check alone passes", () => {
    const inverted = extendTheme(getTheme("light"), {
      colors: {
        primary: "#1E1060",
        primaryHover: "#2A1A7A",
        primaryActive: "#372394",
      },
    });

    expect(themeContrastFailures(inverted)).toEqual([]);
    expect(kinds(themeFailures(inverted))).toEqual(["direction", "direction"]);
  });
```

- The existing `new Set(kinds) === new Set(themeChecks)` and the
  "emits the index's kinds, in its order" case then cover the sixth kind.

### 3.7 `packages/tokens/src/state-direction.test.ts` (new)

Header comment: the guarded bug — plan 097's inverted state, accepted by all five
checks on an edited theme.

Cases:

1. `shippedThemes.forEach` → `themeDirectionFailures(theme)` is `[]`.
2. The light regression above: contrast `[]`, two `darker` failures with the
   ladder/role pairs, and `themeFailures` reports two `direction` entries.
3. The dark mirror (`#A7A9FF → #948CFA → #8377F6` on the dark identity) → two
   `lighter` failures, contrast `[]`.
4. Equality is the step contract's: `primaryHover = primary` → direction `[]`,
   and `themeContrastFailures` contains the `primaryHover`/`primary` `step` pair.
5. `relativeLuminance`: `#FFFFFF` is `1`, `#000000` is `0`, white is greater
   than `#808080`, and an unparseable value is `NaN`.
6. Coverage: every consecutive pair in `stateLadders` is published by
   `stateStepPairs`, `softActionStepPairs`, `washStepPairs` or
   `selectionStepPairs`, so a new ladder cannot gain a direction rule without a
   measured distance. Build the set from the four lists; no hand-typed pairs.

### 3.8 `docs/tokens.md`

- **Types table**: add `DirectionFailure` after `Dimensions` and `StateLadder`
  after `Spacing`; extend the `ThemeFailure` row with `direction`.
- **`### Checking a theme`** (line ~1445): six checks, naming interaction
  direction.
- **New `#### Interaction direction`** after `#### Text hierarchy` and before
  `#### One check`: the rule (darker in light, lighter in dark), the four ladder
  kinds and `stateLadders`, the four step lists, the equality division, the
  `themeDirectionFailures` signature, the `relativeLuminance` helper, and the
  executed example. Quote the measured inverted light family and the fact that
  every shipped set is `[]`.
- **`#### One check`**: "Running one of the six checks…", "composes all six",
  the order sentence with `direction`, and `DirectionFailure` in the payload
  list.
- **`## Verification`**: in the step paragraph, add that the direction is
  published too (`themeDirectionFailures`, `stateLadders`), that equality is the
  step lists' defect and inversion is this check's, and that every shipped set
  passes.

### 3.9 `docs/design-system.md` §11

Extend the "Verify an edited theme" paragraph: six checks, the interaction
direction rule (away from the canvas, darker in light and lighter in dark), and
`themeDirectionFailures` in the "each part is available on its own" list. Keep
the exact phrase "Each part is available on its own" (a docs guard reads it).

### 3.10 `packages/tokens/README.md`

In the guarantee paragraph: "one of six checks", "composes all six", the order
`color`, `typeface`, `contrast`, `hierarchy`, `direction`, `metric`, and
`DirectionFailure` in the payload list. Mention `themeDirectionFailures` and the
inverted-family example.

### 3.11 `COMPONENTS.md`

- **Total theme check** row: six kinds and the new order; state that
  `themeDirectionFailures` reports a ladder step that moves toward the canvas
  while the step pairs report a collapsed one.
- **Filled control states** row: add one clause that the direction is now
  public, so an edited family whose hover lightens in a light theme is reported.

### 3.12 `.agents/slop/plans/README.md`

Add the row after 501:

```
| [502](./502-interaction-direction.md) | The interaction ladder's direction in the total check | F | 097, 327, 342, 357, 381, 383, 387, 388, 394, 398 | done |
```

Add a closing paragraph in the established voice: the five checks accepted a
family that moved toward the canvas, the two measured probes, the sixth kind,
the four ladders derived from their owners, the equality/inversion division, and
that no colour, pair, floor or metric moves.

### 3.13 `TODO.md`

Add a ticked row at the end of the design-tokens section (after plan 501) naming
the gap and `(plan 502)`, and bump the section progress bar by one.

## 4. Commands, expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

**Probe before writing prose** (uses the source entry, so no build is needed):

```sh
cat > packages/tokens/src/tmp-direction-probe.test.ts <<'EOF'
import { describe, expect, it } from "vitest";
import { extendTheme, getTheme, themeContrastFailures, themeFailures } from "./index.js";

describe("probe", () => {
  it("prints the inverted families", () => {
    const light = extendTheme(getTheme("light"), {
      colors: { primary: "#1E1060", primaryHover: "#2A1A7A", primaryActive: "#372394" },
    });
    const dark = extendTheme(getTheme("dark"), {
      colors: { primary: "#A7A9FF", primaryHover: "#948CFA", primaryActive: "#8377F6" },
    });
    expect({
      lightContrast: themeContrastFailures(light).length,
      lightAll: themeFailures(light).length,
      darkContrast: themeContrastFailures(dark).length,
      darkAll: themeFailures(dark).length,
    }).toEqual({});
  });
});
EOF
(cd packages/tokens && ./node_modules/.bin/vitest run src/tmp-direction-probe.test.ts)
# EXPECT before the fix: all four counts are 0 (the gap).
# DELETE the probe after reading it; it must not be committed.
```

**After the edits:**

```sh
nub run --filter @gpuixui/tokens test
# EXPECT: every file passes, including state-direction, theme-check, docs,
# readme, inventory and public-types.

nub run --filter @gpuixui/tokens check-types
# EXPECT: no diagnostics.

nub run check        # check:tests, lint, fmt, check-types
nub run lint
nub run test
# EXPECT: exit 0 for each.
```

**Both-direction proof** (`scripts/verify-two-directions.sh` still speaks `jj`;
use git):

```sh
# Direction 1 — without the direction composition, the new case must fail.
git stash push -- packages/tokens/src/theme-check.ts packages/tokens/src/direction.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/state-direction.test.ts)
# EXPECT: the three inversion cases fail (no direction failures); restore with
# `git stash pop`. If they pass, the test does not guard the fix: STOP.
git stash pop

# Direction 2 — with the fix, every case passes.
(cd packages/tokens && ./node_modules/.bin/vitest run src/state-direction.test.ts)
# EXPECT: every case passes.
```

A test that was not run is not evidence. Record both runs in the final message.

## 5. STOP conditions

Stop and report, do not improvise, if:

- **any shipped set fails a ladder.** That is a shipped token defect, not a
  guard: record the theme, the ladder, both roles and both luminances, and stop.
  Do not move a colour to make the check pass without a separate plan.
- **the direction rule reports equality.** That is a bug in the new check, not
  the theme; equality belongs to the step lists. Fix the check, not the plan.
- **a shipped ladder is missing from `stateLadders`** (a fifth family, a second
  wash) — add it through its owner (`filledControlFamilies`) and report the new
  coverage in the plan; do not hand-type a family.
- `theme-check.test.ts`'s broken example no longer reports all six kinds —
  inspect `brokenTheme`; the inverted primary family must add direction only.
- `docs.test.ts`, `readme.test.ts`, `inventory.test.ts` or `public-types.test.ts`
  fail for a name, count or sentence this plan did not intend to change — update
  the sentence the plan names, not the guard's intent.
- a gate fails for a reason outside the files this plan names.

## 6. Acceptance criteria

- `relativeLuminance`, `stateLadders`, `StateLadder`, `DirectionFailure` and
  `themeDirectionFailures` are public and named in `docs/tokens.md`.
- `themeChecks` is colour → typeface → contrast → hierarchy → direction → metric
  and `themeFailures` reports a ladder step that moves toward the canvas while
  the contrast check returns `[]`.
- An equal step is reported by the step lists and **not** by the direction
  check.
- Every shipped identity variant, platform variant and recipe passes all six
  checks; no colour, pair, floor or metric changes.
- The documents and the ledger state the sixth check, the rule and the
  equality/inversion division.
- `state-direction.test.ts` has a case that fails without the check and passes
  with it; both directions were run and recorded.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

None. The check is additive inside `packages/tokens` and its documents. A
consumer theme that had quietly inverted a pointer ladder will now be reported by
the total check — that is the point of the guard.

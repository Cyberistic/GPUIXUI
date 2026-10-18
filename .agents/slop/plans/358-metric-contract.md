# Plan 358 — The numeric half of an editable theme

**Phase:** F · **Owner:** `tokens-theme` · **Status:** done
**Depends on:** 010–019 and 050–072 (the extension mechanism and its docs),
071 (the public contrast contract), 086 (a total contrast contract), 089
(density merges by size), 096 (the control-size index), 342 (the published
`step` floor), 353 (`theme.dimensions`), 355–357 (the documentation guards).
**Owns:** `packages/tokens/src/metrics.ts` (new),
`packages/tokens/src/metrics.test.ts` (new),
`packages/tokens/src/metrics.example.ts` (new),
`packages/tokens/src/index.ts`, `packages/tokens/src/inventory.test.ts`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

The extension mechanism promises that a consumer can copy a platform style or a
brand palette, edit it, and ship their own look; the library then hands them
`themeContrastFailures` so an edited **colour** set is held to the same floors
the shipped sets are (plan `071`). Nothing holds the **numbers**.

A `Theme` carries eleven groups of metrics — colour is one; typography,
spacing, radius, density, dimensions, elevation, motion, border widths, icon
sizes and avatar sizes are the other ten. Every invariant those groups rely on
lives in test-only code, asserted on the *shipped* values only:

| Invariant | Where it lives today | What an edited theme can do |
| --------- | -------------------- | --------------------------- |
| `spacing` steps increase | `scale.test.ts` (shipped const only) | invert the scale; `gap="xl"` becomes tighter than `lg` |
| `radius` and icon/avatar ladders increase | `scale.test.ts` | make `md` smaller than `sm` |
| density sizes and padding increase | `scale.test.ts` (presets only) | a partial override makes `sm` taller than `md` |
| `lineHeight > fontSize` | `typography.test.ts` (shipped const only) | clip every line of a role |
| elevation alphas are `0…1` | `elevation.test.ts` | `alpha: NaN` → `alpha()` returns the tint unchanged, an **opaque** shadow |
| motion durations are ordered | `motion.test.ts` | `slow` shorter than `fast`, or negative |
| dimensions are positive and ordered | `dimensions.test.ts` | a zero-width toast, an inverted preview range |
| `borderWidth.strong > 0` | nowhere | **the focus ring disappears** — see below |

The last row is the measured worst case, not a hypothetical. `focusRing(theme)`
returns `{ boxShadow: { spreadRadius: theme.borderWidth.strong, … } }`, and that
shadow is the only focus indicator GPUix 0.10.0 can draw (`docs/tokens.md` §Focus;
the runtime has no `outline*` and no `focusVisible`). A consumer who sets
`borderWidth: { strong: 0 }` — or whose design system says "no ring, only a
border" — gets a ring with zero spread, and

```ts
themeContrastFailures(extendTheme(lightTheme, { borderWidth: { strong: 0 } }));
```

returns `[]`, because the ring's *colour* is still fine. The same class of
silent break: `typography: { body: { lineHeight: 10 } }` on a 14px face, or
`density: { controlHeight: { sm: 20 } }` against an 18px label plus its border,
both return `[]` while every line and every small control clips.

Two rules were rejected after measuring the shipped styles, because they would
have been design policing rather than breakage:

- **strict** radius ladders — Linux and Windows ship `lg === xl` (`4/6/12/12`,
  `2/4/8/8`); the contract asks for *non-decreasing* steps.
- **strict** motion ladders — Windows ships `fast === step` (`120`/`120`); the
  same non-decreasing rule applies.

A probe of every shipped set (identity × 2 modes × 2 contrast levels, three
platform variants × 2 modes, two recipes × 2 modes = 24 themes) against the
final rule set returns **no failure**, so this plan moves **no token value**.

## 2. Decision (do not re-litigate)

- **Ship one entry point beside the colour checker.** `themeMetricFailures(theme)`
  returns every numeric rule a theme misses; `themeContrastFailures` stays the
  colour half. Both are consumer test-suite checks, not runtime validators.
- **One failure per governed member per rule.** A member that misses two rules
  (a `radius.full` below both `xl` and half the largest control) reports twice;
  that is two distinct reasons, and the duplicate rule guards in plan `349` are
  about *pair* lists, which this is not.
- **Rules are breakage tests, not taste.** Each rule below is justified by the
  metric becoming unusable, in the comment beside it. Do not add "should look
  like" rules; a visual opinion belongs in a platform style.
- **Coverage is by group, not by number.** `metricGroups` is the ordered index;
  a guard fails if a group has no rule or a rule names a member a shipped theme
  does not carry. Elevation offsets and motion easings are deliberately
  ungoverned: the runtime accepts any finite offset, and an easing's shape is
  the `MotionEasing` union, checked by the compiler.
- **Vocabulary:** `MetricGroup`, `MetricRule`, `MetricFailure`, `metricGroups`,
  `themeMetricFailures`. "Metric" is the whole set of numbers a theme paints
  with; "scale" already means `scale.ts`'s spacing/radius/density groups.

## 3. Exact files and changes

### 3.1 `packages/tokens/src/metrics.ts` (new)

Header:

```ts
/**
 * The numeric half of the theme contract.
 *
 * {@link themeContrastFailures} holds an edited theme's colours to the floors
 * the shipped sets pass; this module holds its metrics — type, spacing, radii,
 * density, dimensions, elevation, motion, borders, icons and avatars — to the
 * invariants the components rely on. A rule is here because a value that breaks
 * it makes a metric or a control unusable, not because it is a house style.
 *
 * Every rule is a pure predicate over a `Theme`, so the same check a consumer
 * runs in their suite is the one this package's suite runs on every shipped
 * theme, platform variant and recipe.
 */
```

Imports: `type { Theme } from "./theme.js"`, `controlSizes` and
`densityNames`? (densityNames is not needed), `type { ControlSize }`;
`textRoles`; `type { ElevationLevel }` if needed.

Values, in this order:

```ts
/** The ordered index of metric groups the contract governs. */
export const metricGroups = [
  "typography",
  "borderWidth",
  "density",
  "dimensions",
  "iconSize",
  "avatarSize",
  "radius",
  "spacing",
  "elevation",
  "motion",
] as const;

export type MetricGroup = (typeof metricGroups)[number];

export type MetricRule =
  | "positive"
  | "non-negative"
  | "zero"
  | "increasing"
  | "non-decreasing"
  | "at-least"
  | "at-most"
  | "within";

export interface MetricFailure {
  /** The theme group the governed member belongs to. */
  readonly group: MetricGroup;
  /** The member, dotted the way the docs name it — `controlHeight.sm`. */
  readonly member: string;
  /** The rule the value broke. */
  readonly rule: MetricRule;
  /** The value measured. */
  readonly actual: number;
  /** The value it was compared with, when the rule compares two. */
  readonly bound: number;
}
```

Keep `bound` required: every failing comparison has one (`positive` → 0,
`non-negative` → 0, `zero` → 0, `within` → 1, ladders → the previous value,
`at-least`/`at-most` → the bound). That removes an optional field and makes the
failure shape total.

Helpers (module-local, ~45 lines):

```ts
const failure = (
  group: MetricGroup,
  member: string,
  rule: MetricRule,
  actual: number,
  bound: number,
): MetricFailure => ({ group, member, rule, actual, bound });

const positive = (group, member, actual) =>
  actual > 0 ? [] : [failure(group, member, "positive", actual, 0)];

const nonNegative = (group, member, actual) => ...;

const zero = (group, member, actual) =>
  actual === 0 ? [] : [failure(group, member, "zero", actual, 0)];

const within = (group, member, actual) =>
  Number.isFinite(actual) && actual >= 0 && actual <= 1
    ? []
    : [failure(group, member, "within", actual, 1)];

const atLeast = (group, member, actual, bound) =>
  actual >= bound ? [] : [failure(group, member, "at-least", actual, bound)];

const atMost = (group, member, actual, bound) =>
  actual <= bound ? [] : [failure(group, member, "at-most", actual, bound)];

/**
 * A ladder of named steps. Every step must be a non-negative number and, from
 * the second on, step past (or reach, for `non-decreasing`) the one before it.
 */
const ladder = (
  group: MetricGroup,
  steps: ReadonlyArray<readonly [string, number]>,
  rule: "increasing" | "non-decreasing",
): ReadonlyArray<MetricFailure> =>
  steps.flatMap(([member, value], index) => {
    const previous = steps[index - 1];
    const nonNegativeFailure = nonNegative(group, member, value);
    if (previous === undefined) {
      return nonNegativeFailure;
    }
    const ok = rule === "increasing" ? value > previous[1] : value >= previous[1];
    return [
      ...nonNegativeFailure,
      ...(ok ? [] : [failure(group, member, rule, value, previous[1])]),
    ];
  });
```

Entry function. Each group in this order, with the justification comment:

```ts
/**
 * Every numeric rule a theme misses.
 *
 * - **typography** — a role needs a size and leading; a line box shorter than
 *   its type clips the glyphs.
 * - **borderWidth** — `strong` is the focus ring's spread, and the ring is the
 *   only focus indicator the runtime can draw, so it may not be zero; `thin`
 *   may be zero in a borderless theme, so it is only non-negative.
 * - **density** — sizes and padding are ladders; the smallest control fits one
 *   label line plus its two borders; a row fits one body line.
 * - **dimensions** — every surface metric is positive, each documented range
 *   has a minimum below its default, an adornment fits the smallest control and
 *   a chip fits in a field.
 * - **iconSize / avatarSize** — named ladders.
 * - **radius** — `none` is square, the four steps are a ladder, and `full`
 *   rounds both the largest radius and half the largest control.
 * - **spacing** — a ladder.
 * - **elevation** — `sm`/`md`/`lg` each hold a shadow whose alpha is `0…1`
 *   (a `NaN` alpha falls back to the opaque tint) and whose blur is
 *   non-negative. `overlay` is reserved and exempt.
 * - **motion** — `none` is zero and the durations are a ladder.
 */
export function themeMetricFailures(theme: Theme): ReadonlyArray<MetricFailure> {
  const { typography, borderWidth, density, dimensions, iconSize, avatarSize, radius, spacing, elevation, motion } = theme;
  return [
    ...textRoles.flatMap((role) => [
      ...positive("typography", `${role}.fontSize`, typography[role].fontSize),
      ...atLeast("typography", `${role}.lineHeight`, typography[role].lineHeight, typography[role].fontSize),
    ]),
    ...nonNegative("borderWidth", "thin", borderWidth.thin),
    ...positive("borderWidth", "strong", borderWidth.strong),
    ...ladder("density", controlSizes.map((size) => [`controlHeight.${size}`, density.controlHeight[size]] as const), "non-decreasing"),
    ...ladder("density", controlSizes.map((size) => [`controlPaddingX.${size}`, density.controlPaddingX[size]] as const), "non-decreasing"),
    ...positive("density", "rowHeight", density.rowHeight),
    ...atLeast("density", "controlHeight.sm", density.controlHeight.sm, typography.label.lineHeight + 2 * borderWidth.thin),
    ...atLeast("density", "rowHeight", density.rowHeight, typography.body.lineHeight),
    ...ladder("iconSize", (["xs","sm","md","lg","xl"] as const).map((size) => [size, iconSize[size]] as const), "non-decreasing"),
    ...atMost("iconSize", "md", iconSize.md, density.controlHeight.sm),
    ...ladder("avatarSize", (["xs","sm","md","lg"] as const).map((size) => [size, avatarSize[size]] as const), "non-decreasing"),
    ...zero("radius", "none", radius.none),
    ...ladder("radius", (["sm","md","lg","xl"] as const).map((step) => [step, radius[step]] as const), "non-decreasing"),
    ...atLeast("radius", "full", radius.full, radius.xl),
    ...atLeast("radius", "full", radius.full, density.controlHeight.lg / 2),
    ...ladder("spacing", (["2xs","xs","sm","md","lg","xl","2xl","3xl","4xl","5xl"] as const).map((step) => [step, spacing[step]] as const), "non-decreasing"),
    ...(Object.entries(dimensions) as ReadonlyArray<[string, number]>).flatMap(([name, value]) => positive("dimensions", name, value)),
    ...ladder("dimensions", [["overlayMinWidth", dimensions.overlayMinWidth], ["overlayWidth", dimensions.overlayWidth]], "increasing"),
    ...ladder("dimensions", [["previewCardMinWidth", dimensions.previewCardMinWidth], ["previewCardMaxWidth", dimensions.previewCardMaxWidth]], "increasing"),
    ...atMost("dimensions", "fieldAdornmentSize", dimensions.fieldAdornmentSize, density.controlHeight.sm),
    ...atMost("dimensions", "chipMinWidth", dimensions.chipMinWidth, dimensions.fieldMinWidth),
    ...(["sm", "md", "lg"] as const).flatMap((level) => {
      const shapes = elevation[level];
      return shapes.length === 0
        ? [failure("elevation", level, "positive", shapes.length, 1)]
        : shapes.flatMap((shape, index) => [
            ...nonNegative("elevation", `${level}[${index}].blurRadius`, shape.blurRadius),
            ...within("elevation", `${level}[${index}].alpha`, shape.alpha),
          ]);
    }),
    ...zero("motion", "none", motion.none),
    ...ladder("motion", (["step","fast","normal","slow","pulse"] as const).map((level) => [level, motion[level]] as const), "non-decreasing"),
  ];
}
```

Notes for the executor:

- Use `as const` tuples in the `.map` calls so `ladder` receives
  `readonly [string, number]`; do **not** widen to `string[][]`.
- `density.controlHeight.lg / 2` is a fractional bound; the rules compare
  numbers, not pixels, so this is intentional.
- Do not add a rule for `elevation.overlay`: it is documented as reserved and
  empty (`elevation.ts`), and a consumer may design it.
- `Object.entries(dimensions)` is the only generic walk; `Dimensions` is a flat
  record of numbers, so the cast to `[string, number]` is over a known shape.
  If the cast is uncomfortable, enumerate the nine members explicitly — do not
  introduce `any`.

JSDoc on `themeMetricFailures` must include a runnable `@example` (the snippet
guard reads it):

```ts
/**
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeMetricFailures } from "@gpuixui/tokens";
 *
 * const themed = extendTheme(getTheme("dark"), { borderWidth: { strong: 0 } });
 * themeMetricFailures(themed); // [{ group: "borderWidth", member: "strong", … }]
 * ```
 */
```

### 3.2 `packages/tokens/src/index.ts`

Add `export * from "./metrics.js";` in alphabetical position (between
`./motion.js` and `./platform-recipes.js`).

### 3.3 `packages/tokens/src/metrics.test.ts` (new)

Header comment states the bug being guarded: *the extension mechanism checked
colours only; an edited theme could zero the focus ring, clip type or invert a
ladder and `themeContrastFailures` returned `[]`.* Cases:

1. **Every shipped theme passes.** Iterate the same 24 sets the contrast suites
   do (identity × `themeModes` × `themeContrasts`, `platformNames` × modes,
   `platformRecipeNames` × modes); `expect(themeMetricFailures(theme)).toEqual([])`
   with a `${label}` message.
2. **The shipped identity is clean** — one direct call, so a total break is
   obvious.
3. **A zero focus ring is reported** — `extendTheme(lightTheme, { borderWidth:
   { strong: 0 } })` yields exactly one failure with
   `{ group: "borderWidth", member: "strong", rule: "positive", actual: 0 }`, and
   `themeContrastFailures` on the same theme is `[]` (states the gap).
4. **A clipped type role is reported** — `typography: { body: { lineHeight: 12 } }`
   → one `typography`/`body.lineHeight`/`at-least` failure bound `14`.
5. **A clipped small control is reported** — `density: { controlHeight: { sm: 19 } }`
   (label 18 + 2 borders = 20) → `density`/`controlHeight.sm`/`at-least`, bound 20.
6. **An inverted density ladder is reported** — `density: { controlHeight: { md: 20 } }`
   with `sm` 24 → `controlHeight.md`/`non-decreasing`, bound 24 (and no
   `controlHeight.sm` failure).
7. **A rounded "none" is reported** — `radius: { none: 6 }` → `radius`/`none`/`zero`.
8. **A pill that does not round is reported** — `radius: { full: 8 }` → two
   failures for `radius.full` (`at-least` 12 and 20), proving a member can carry
   two reasons.
9. **An opaque shadow alpha is reported** — `elevation: { md: [{ …lightElevation.md[0], alpha: Number.NaN }] }`
   → `elevation`/`md[0].alpha`/`within`; and `alpha: 1.5` likewise.
10. **A negative duration is reported** — `motion: { fast: -140 }` →
    `motion`/`fast`/`non-negative` and the ladder failure against `step`.
11. **A zero-width dimension is reported** — `dimensions: { toastWidth: 0 }` →
    `dimensions`/`toastWidth`/`positive`.
12. **An inverted preview range is reported** — `previewCardMinWidth: 400`
    → `previewCardMaxWidth`/`increasing`.
13. **An icon larger than the smallest control is reported** —
    `density: { controlHeight: { sm: 20 } }` with
    `iconSize: { md: 21, lg: 22, xl: 24 }` (the icon ladder must still step)
    → `iconSize`/`md`/`at-most`, bound 20.
14. **`metricGroups` matches the failures' groups** — every failure's `group` is
    a member of `metricGroups`, and the index is 10 names in documentation
    order.
15. **The index covers every group with a rule** — build one broken theme per
    group (reuse the cases above via a small table) and assert the set of groups
    observed equals `metricGroups`. This is the guard that a future group cannot
    ship unmeasured.

`metrics.example.ts` (new, imported by case 1 so `examples.test.ts` is
satisfied):

```ts
/**
 * The documented path: an edited theme is held to the same numeric invariants
 * as the shipped ones.
 */
import { extendTheme, getTheme, themeMetricFailures } from "./index.js";

export const compact = extendTheme(getTheme("dark"), { density: "compact" });
export const compactFailures = themeMetricFailures(compact); // []

export const ringless = extendTheme(getTheme("light"), {
  borderWidth: { strong: 0 },
});
export const ringlessFailures = themeMetricFailures(ringless); // one failure
```

The test imports both consts and asserts `[]` and the one failure, so the
example cannot drift.

### 3.4 `docs/tokens.md`

1. In `## Types` (alphabetical, as the table is today) add `MetricFailure`,
   `MetricGroup`, `MetricRule` — `public-types.test.ts` fails without them.
2. In `### Checking a theme`, after the `themeContrastFailures` paragraphs and
   before "The parts are public too", add a subsection:

   ```md
   A theme is more than its colours. `themeMetricFailures(theme)` holds the
   numbers a component paints with — type, spacing, radii, density, component
   dimensions, elevation, motion, border widths, icon and avatar sizes — to the
   invariants the components rely on, and it is the check to run beside the
   colour one when a copied platform style or brand theme changes a metric:

   ```ts
   import { themeMetricFailures } from "@gpuixui/tokens";

   themeMetricFailures(brandTheme); // [] when every metric is usable
   ```

   It returns one entry per missed rule, naming the group, the member, the rule
   and both values. The rules are breakage tests, not a house style:
   `borderWidth.strong` is the focus ring's spread, so zero removes the only
   focus indicator the runtime can draw; a type role's leading must not be
   shorter than its size; the smallest control must fit one label line plus its
   borders; `radius.none` must be square; a named size ladder (`spacing`,
   `radius`, `iconSize`, `avatarSize`, the density presets and the motion
   timings) must not step backwards; elevation alphas must stay inside `0…1`,
   because `alpha()` falls back to the opaque tint on a value it cannot parse.
   Two rules are deliberately non-decreasing rather than strict: Linux and
   Windows ship `radius.lg === radius.xl`, and Windows ships
   `motion.fast === motion.step`. Every shipped theme, platform variant and
   recipe passes, so the check moves no value; it guards the next edit.

   `metricGroups` is the ordered index of the ten governed groups, so a
   documentation table or a settings row iterates it instead of retyping the
   names.
   ```

   The prose must mention `metricGroups`, `MetricGroup`, `MetricRule` and
   `MetricFailure` so the value and type guards pass.
3. In the Verification section, add one sentence naming `metrics.test.ts` and
   the 24-set iteration, beside the contrast suite's sentence.

### 3.5 `docs/design-system.md`

In §9 (Accessibility), after the contrast-floors paragraph, add:

> The floors are the colour half. `themeMetricFailures` is the numeric half: an
> edited theme cannot zero the focus ring (`borderWidth.strong` is its spread),
> clip a type role's leading, shrink the smallest control below its label, round
> a "square" corner, invert a named size ladder or ship an elevation alpha the
> colour helper cannot parse. Every shipped set passes; the check exists for the
> theme a consumer edits.

Also add the metric check to the state/focus row if the row names the checker —
keep the edit to prose the guards do not pin (run `docs.test.ts` to confirm).

### 3.6 `packages/tokens/README.md`

Add one bullet to the feature list and one paragraph in the usage/verification
area naming `themeMetricFailures` beside `themeContrastFailures`, with the
zero-ring example. Keep counters (role count, type-role count, platform table)
untouched — `readme.test.ts` pins them.

### 3.7 `COMPONENTS.md`

Add one Design system row after **Theme contrast check**:

```md
| Theme metric check | done | yes (values in a `Theme`) | `themeMetricFailures(theme)` holds an edited theme's numbers to the invariants the components rely on: type leading above its size, a non-zero `borderWidth.strong` (the focus ring's spread, the only focus indicator in 0.10.0), density, dimensions, icon, avatar, radius, spacing and motion ladders, elevation alphas inside `0…1`, and the `radius.none` square. Ten groups are indexed by `metricGroups`; every shipped identity theme, platform variant and recipe passes. The colour half is the **Theme contrast check** row. Docs in `docs/tokens.md`. |
```

### 3.8 `packages/tokens/src/inventory.test.ts`

Add a case for the new row: it names `themeMetricFailures`, every
`metricGroups` member, and the focus-ring reason; plus a case that the row's
group count matches `metricGroups.length`.

### 3.9 `.agents/slop/plans/README.md`

Add the plan row to the `tokens-theme` table (`358`, this file, Phase F,
depends on 071/086/353/357, `done`) and a paragraph after plan `357`'s
describing the gap and the decision.

### 3.10 `TODO.md`

Tick a new token task (add it under the design-tokens section):

```md
`[x]` Ship the numeric half of the theme contract — `themeMetricFailures` and
`metricGroups` hold an edited theme's type, spacing, radii, density, dimensions,
elevation, motion, border, icon and avatar metrics to the invariants the
components rely on; a zero `borderWidth.strong` removed the focus ring and an
inverted ladder or clipped leading returned `[]` from every existing check
(plan 358)
```

and bump the workstream progress bar by one.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

```sh
nub run --filter @gpuixui/tokens test
# expected: all files pass, including metrics.test.ts; the suite count grows by
# one file (72 → 73 at the time of writing) and every earlier case still passes.

nub run --filter @gpuixui/tokens check-types
# expected: exit 0, no diagnostics.

nub run check
# expected: check:tests, lint, fmt and the recursive type checks all pass.

nub run lint
nub run test
# expected: exit 0.
```

## 5. Test plan, including both directions

The suite above is the deliverable, but a new guard must be *proved able to
fail*. `scripts/verify-two-directions.sh` is jj-based and this repo is git
(D1), so prove it by hand and paste the output into the commit message:

1. **Green baseline:** `nub run --filter @gpuixui/tokens test` → all pass.
2. **Direction A — the shipped-theme case can fail.** Temporarily set
   `borderWidth = { thin: 1, strong: 0 }` in `packages/tokens/src/scale.ts`; run
   `nub x vitest run src/metrics.test.ts`; expect the "every shipped theme"
   case to fail with `borderWidth`/`strong`/`positive` on the identity sets.
   Restore the file and re-run → green.
3. **Direction B — a rule can be removed and only its case notices.** Comment
   out the `positive("borderWidth", "strong", …)` line; run the suite; expect
   case 3 (zero ring) and case 15 (group coverage) to fail and everything else
   to pass. Restore → green.
4. **Direction C — the docs guards can fail.** Temporarily remove
   `MetricFailure` from the `## Types` table; run `docs.test.ts` /
   `public-types.test.ts`; expect the type-index case to fail. Restore.

Record all four results in the commit message (the repo's rule: never claim a
test passed unless it ran).

## 6. STOP conditions

- A shipped theme, platform variant or recipe fails a rule. **STOP** — do not
  change the rule to fit the palette and do not move a shipped value without a
  measured reason. Report the failing set and member: it means the rule is
  wrong or a real defect exists; the supervisor decides.
- `alpha` in `elevation.ts` starts clamping rather than accepting `0…1` (check
  before relying on `within`).
- The `Object.entries(dimensions)` walk needs `any` to type-check. **STOP** and
  enumerate the nine members explicitly instead.
- Any existing guard (`docs.test.ts`, `inventory.test.ts`, `readme.test.ts`,
  `public-types.test.ts`, `snippets.test.ts`) fails for a reason other than a
  missing row you were told to add.
- The GPUix focus-ring evidence in `docs/tokens.md` §Focus no longer matches the
  pinned runtime (the plan's worst-case argument depends on it).

## 7. Acceptance

- `metrics.ts` exports `metricGroups`, `MetricGroup`, `MetricRule`,
  `MetricFailure`, `themeMetricFailures` through the core entry.
- Every shipped theme passes; each group has a case that fails without its rule;
  a broken group set equals `metricGroups` exactly.
- `themeContrastFailures` still returns `[]` for a zero-ring theme, and the test
  states that contrast: the two checkers are complementary.
- `docs/tokens.md` names every new value and type and explains the rules,
  including the two non-decreasing exceptions; `docs/design-system.md` states
  the numeric half; the README names the checker; `COMPONENTS.md` has the row.
- `nub run check`, `nub run lint`, `nub run test` pass.

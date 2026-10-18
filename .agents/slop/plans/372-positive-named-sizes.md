# Plan 372 — a named size is a positive size, and the rule index is the type

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the scale), 054 (the avatar size scale), 058 (the numeric tables guard),
358 (the metric contract), 360–370 (the contract's later members), 371 (the
third check).

**Status:** done (2026-10-18). Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`themeMetricFailures` holds `iconSize` and `avatarSize` only to a
**non-decreasing ladder**. A ladder accepts zero as its first step, so both
sizes can start at zero and every checker still returns `[]`:

```ts
import {
  extendTheme,
  getTheme,
  themeColorFailures,
  themeContrastFailures,
  themeMetricFailures,
} from "@gpuixui/tokens";

const zeroIcon = extendTheme(getTheme("light"), { iconSize: { xs: 0 } });
const zeroAvatar = extendTheme(getTheme("light"), { avatarSize: { xs: 0 } });

themeContrastFailures(zeroIcon); // []
themeMetricFailures(zeroIcon);   // []   (before this plan)
themeColorFailures(zeroIcon);    // []

themeMetricFailures(zeroAvatar); // []   (before this plan)
```

`xs` is a named size, not an absence. An icon painted at `theme.iconSize.xs`
becomes a 0×0 box — a missing glyph — and an avatar painted at
`theme.avatarSize.xs` becomes a 0×0 disc — a missing identity mark. That is the
same class of defect plans 360–370 closed for `NaN`, `Infinity`, a zero focus
ring, a zero-width dimension, a clipped row and an unusable font weight: a
number the renderer accepts but paints as nothing, while the checker says the
theme is fine.

The contract already states the principle for `dimensions`: "every surface
metric is positive". `iconSize` and `avatarSize` are the two groups where a
named step can be zero and still satisfy the ladder, and `positive` is already a
published `MetricRule` used by `dimensions` and `borderWidth.strong`.

The same audit found a documentation drift in the type index. The `MetricRule`
row says the rules are "positive, ladder, fit or fraction", but the contract
emits nine rules — `positive`, `non-negative`, `zero`, `finite`, `increasing`,
`non-decreasing`, `at-least`, `at-most` and `within` (the page states the
correct list later in its own prose). `MetricRule` is a hand-written union with
no ordered index, unlike `metricGroups`, `colorRoles`, `textRoles`,
`densityNames` and `controlSizes`, so a rule can join the union without a line
in the reference and nothing notices — which is exactly how the stale row
shipped.

## 2. Decision

1. **Export `metricRules`** from `metrics.ts` as the ordered index of the nine
   rules, and derive `MetricRule` from it, following the package's existing
   index pattern. A diagnostics table or a rule reference iterates the index
   instead of retyping the union.
2. **Give `ladder` an explicit step rule**, defaulting to `"non-negative"`, and
   pass `"positive"` for `iconSize` and `avatarSize`. Every named icon and
   avatar size must be greater than zero; the ladder comparison is unchanged.
3. **Correct `docs/tokens.md`'s `MetricRule` row** to name every indexed rule,
   and add a guard that the row lists exactly the rules `metricRules` exports.
4. Document the positive-size rule in `docs/tokens.md`,
   `docs/design-system.md`, the package README and `COMPONENTS.md`, and tick
   the row in `TODO.md`.

Rejected alternatives:

- **Hold only `xs` to `positive`** — the ladder already forces every later step
  to be at least the first, so checking `xs` alone would be enough today, but
  the failure would name one member of a degenerate ladder. Checking every
  step reports each zero and stays true if the ladder rule changes.
- **Reject zero in `extendTheme`** — the extension mechanism is a merge, not a
  validator; it deliberately returns a theme and lets the three checks report
  what is wrong. Throwing here would change the builder's contract.
- **A minimum icon or avatar size above 1px** — that is a house style, not an
  invariant. One pixel is a tiny size; zero paints nothing. Only zero is
  principled.
- **Fold the rule list into `metricGroups`** — a group is what a metric belongs
  to; a rule is why it failed. `MetricFailure` carries both and a diagnostics
  row needs both indexes.
- **Hand-write the rule row and guard it with an exact string** — plan 351
  showed how an exact-row assertion holds wording but not content. The row is
  built from `metricRules` so a tenth rule cannot ship undocumented.

No shipped theme, platform variant or recipe has a zero icon or avatar size
(they are `12/14/16/20/24` and `20/26/32/40`), so this plan moves **no token
value, colour, pair or floor** and changes no rendered pixel.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts` — the index

Replace the hand-written union (currently immediately after the `MetricFailure`
interface) with:

```ts
/**
 * The rules a metric can miss, in documentation order. `MetricRule` derives
 * from this list, so a new rule must also gain a value here and a line in the
 * rule reference; a diagnostics table iterates it instead of retyping the
 * names.
 */
export const metricRules = [
  "positive",
  "non-negative",
  "zero",
  "finite",
  "increasing",
  "non-decreasing",
  "at-least",
  "at-most",
  "within",
] as const;

/** The rule a metric missed. */
export type MetricRule = (typeof metricRules)[number];
```

### 3.2 `packages/tokens/src/metrics.ts` — the positive step

Extend `ladder` with a fourth parameter. Its current shape is:

```ts
const ladder = (
  group: MetricGroup,
  steps: ReadonlyArray<readonly [string, number]>,
  rule: "increasing" | "non-decreasing",
): ReadonlyArray<MetricFailure> =>
  steps.flatMap(([member, value], index) => {
    const previous = steps[index - 1];
    if (previous === undefined) {
      return nonNegative(group, member, value);
    }
    const ok =
      rule === "increasing" ? value > previous[1] : value >= previous[1];
    return [
      ...nonNegative(group, member, value),
      ...(ok ? [] : [failure(group, member, rule, value, previous[1])]),
    ];
  });
```

Change it to:

```ts
const ladder = (
  group: MetricGroup,
  steps: ReadonlyArray<readonly [string, number]>,
  rule: "increasing" | "non-decreasing",
  /**
   * The rule every step is held to. A spacing step or a radius may be zero — a
   * borderless or square theme is a design — while a named icon or avatar size
   * is a shape that must paint, so those two ladders ask for `positive`.
   */
  stepRule: "non-negative" | "positive" = "non-negative",
): ReadonlyArray<MetricFailure> =>
  steps.flatMap(([member, value], index) => {
    const previous = steps[index - 1];
    const sign =
      stepRule === "positive"
        ? positive(group, member, value)
        : nonNegative(group, member, value);
    if (previous === undefined) {
      return sign;
    }
    const ok =
      rule === "increasing" ? value > previous[1] : value >= previous[1];
    return [
      ...sign,
      ...(ok ? [] : [failure(group, member, rule, value, previous[1])]),
    ];
  });
```

Then pass `"positive"` in the two size ladders:

```ts
    ...ladder(
      "iconSize",
      (["xs", "sm", "md", "lg", "xl"] as const).map(
        (size) => [size, iconSize[size]] as const,
      ),
      "non-decreasing",
      "positive",
    ),
```

and the same on the `avatarSize` ladder (`["xs", "sm", "md", "lg"]`). No other
`ladder` call changes.

Update the `themeMetricFailures` JSDoc bullet for the two groups from "named
ladders, and the default icon fits the smallest control" to name the positive
floor:

```
 * - **iconSize**, **avatarSize**: named ladders of positive sizes — a zero
 *   size paints no icon or identity mark — and the default icon fits the
 *   smallest control.
```

### 3.3 `packages/tokens/src/metrics.example.ts` — a runnable case

Append:

```ts
/**
 * An icon size of zero: the ladder does not step backwards, so before plan 372
 * the numeric check accepted it and the `xs` icon painted a 0×0 box. The named
 * size is now held to `positive`.
 */
export const invisibleIcon = extendTheme(getTheme("light"), {
  iconSize: { xs: 0 },
});
export const invisibleIconFailures = themeMetricFailures(invisibleIcon);
```

### 3.4 `packages/tokens/src/metrics.test.ts` — the executed example

Import `invisibleIconFailures` from `./metrics.example.js` and add to the
existing "passes the identity theme and the executed example" case:

```ts
expect(invisibleIconFailures).toHaveLength(1);
```

The dedicated regression file (3.5) asserts the exact failure.

### 3.5 `packages/tokens/src/positive-sizes.test.ts` — new file

Header comment states the guarded bug: **`themeMetricFailures` held icon and
avatar sizes to a non-decreasing ladder only, so a zero `xs` returned `[]` from
all three checks while the glyph or avatar painted a 0×0 box.**

Cases:

1. `themeMetricFailures(extendTheme(lightTheme, { iconSize: { xs: 0 } }))`
   equals exactly
   `[{ group: "iconSize", member: "xs", rule: "positive", actual: 0, bound: 0 }]`.
2. The same edit returns `[]` from `themeContrastFailures` and
   `themeColorFailures` — the other two halves of the contract are silent, which
   is why this rule is needed.
3. `avatarSize: { xs: 0 }` produces the unchanged `avatarSize` analogue.
4. A ladder of zeroes (`iconSize: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 }`)
   reports five `positive` failures, one per named size, and no bogus
   `non-decreasing` noise. Assert the `member` list and that every `rule` is
   `positive`.
5. A positive-but-small first step (`iconSize: { xs: 1 }`) is accepted:
   `[]`. This proves the rule is `positive`, not a minimum above one.
6. `themeMetricFailures(lightTheme)` is still `[]`; the new rule moves no
   shipped value.

Use `extendTheme(lightTheme, …)` and `failuresOf`-style local helpers, matching
`metrics.test.ts`.

### 3.6 `packages/tokens/src/metric-rule-index.test.ts` — new file

Header comment states the drift: **the `MetricRule` type-index row named
`ladder`, `fit` and `fraction`, none of which the contract emits, while a
rule added to the union had no ordered index and no documentation guard.**

Use `node:fs` deliberately (the package's docs tests do) to read
`../../../docs/tokens.md`.

Cases:

1. `metricRules` equals the exact nine-value order above.
2. Every value is unique (`new Set(metricRules).size`).
3. Find the line starting with ``| `MetricRule` |``; assert it exists.
4. For every rule in `metricRules`, assert the row contains it as a whole word
   (`(^|[^A-Za-z0-9_$])rule(?![A-Za-z0-9_$])`), so `positive` is not satisfied
   by `positive-ish` and a renamed rule cannot pass on a substring.
5. Assert the row does **not** contain `ladder`, `fit` or `fraction` as whole
   words — the stale names this plan removes. This is the case that fails on the
   pre-fix document.

### 3.7 `docs/tokens.md`

- Add `metricRules` to the `## Import` block in alphabetical order (between
  `lightTheme` and `motionTransition`).
- Change the type-index row to:

  ```
  | `MetricRule` | One of `metricRules`: `positive`, `non-negative`, `zero`, `finite`, `increasing`, `non-decreasing`, `at-least`, `at-most` or `within`. |
  ```

- In the metric-contract prose, change the ladder sentence to:

  ```
  every named ladder — `spacing`, `radius`, `iconSize`, `avatarSize`,
  `controlHeight`, `controlPaddingX` and the motion timings — must not step
  backwards; `iconSize` and `avatarSize` must also stay above zero, because a
  named size that paints a 0×0 icon or avatar is not a size, and a timing must
  also be finite;
  ```

- Extend the `metricGroups` paragraph:

  ```
  `metricRules` is the ordered index of the nine rules a `MetricFailure` can
  carry, beside `metricGroups`, so a diagnostics table or a rule reference
  iterates it instead of retyping the union.
  ```

### 3.8 `docs/design-system.md`

In the paragraph that lists what an edited theme cannot do, after "invert a
named size ladder", add "name a zero-size icon or avatar". Keep the sentence
grammar intact; the file wraps prose, so rewrap as needed.

### 3.9 `packages/tokens/README.md`

In "Checking the numbers", after the `metricGroups` sentence, add:

```
`metricRules` is the ordered index of the nine rules a failure can carry, so a
diagnostics view does not retype the union.
```

In the long list of what the edit path can do, after "invert a size ladder", add
"or name an icon or avatar size of zero".

### 3.10 `COMPONENTS.md`

In the **Theme metric check** row, add the zero-size named size to the list of
defects the checker prevents, and name `metricRules` beside `metricGroups`.
Do not add a new row: this is the same check.

### 3.11 `TODO.md` and `.agents/slop/plans/README.md`

- Add one ticked TODO row under the tokens list and move the progress count
  (`139/190` → `140/191`).
- Add the plan row (`372`, title, phase F, dependencies `054, 058, 358,
  360–371`, status `done`) after `371`.
- Add a closing paragraph: the zero-size named size, the nine-rule index, the
  stale row, and that no token value moves.

## 4. Test plan and both directions

The new `positive-sizes.test.ts` must fail without the rule. Apply 3.1 and 3.5
first (the index and the test), then:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
(cd packages/tokens && ./node_modules/.bin/vitest run src/positive-sizes.test.ts)
# EXPECT: the icon and avatar cases fail — themeMetricFailures returns [] where
# one `positive` failure is expected. The `xs: 1` case still passes, and the
# shipped case passes, which shows the test is discriminating.
```

Now apply 3.2 (`"positive"` on the two ladders) and rerun:

```sh
(cd packages/tokens && ./node_modules/.bin/vitest run src/positive-sizes.test.ts)
# EXPECT: every case passes.
```

For the docs drift, run `metric-rule-index.test.ts` **before** editing
`docs/tokens.md`:

```sh
(cd packages/tokens && ./node_modules/.bin/vitest run src/metric-rule-index.test.ts)
# EXPECT: the whole-word case for `non-negative` (etc.) fails on the old row,
# and the stale-word case fails on `ladder`/`fit`/`fraction`.
```

Edit the row, rerun, expect green.

`scripts/verify-two-directions.sh` is jj-based and does not run in this
git-only worktree (`PLAN.md` D1); the explicit sequence above is the equivalent
proof. Record both directions in the commit message.

Then the gate, from the workspace root:

```sh
nub run --filter @gpuixui/tokens test   # EXPECT: all files pass, +2 files
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: `check:tests` accepts every case (each asserts a real fact); `tsc`
clean; oxfmt/oxlint clean; the full suite green.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe reports a metric failure — the
  shipped smallest sizes are 12 and 20, so this plan moves no value;
- a spacing or radius ladder starts reporting a `positive` failure — only the
  two size ladders take the new step rule;
- the docs guards (`docs.test.ts`, `public-types.test.ts`, `readme.test.ts`,
  `snippets.test.ts`) reject the new sentences — adjust the wording to the
  guard, never the guard to the wording;
- `public-types.test.ts` reports the derived `MetricRule` twice or not at all —
  the declaration line must remain `export type MetricRule = …`;
- the change appears to need a new minimum size, a validator in `extendTheme`
  or a new metric group — it is one index, one optional helper parameter and
  four documents;
- a case passes on the pre-fix `metrics.ts` where §4 says it must fail.

## 6. Acceptance criteria

- `metricRules` is exported, ordered, and `MetricRule` derives from it.
- `themeMetricFailures` reports `positive` for a zero `iconSize` or
  `avatarSize` step, and `[]` for `xs: 1` and every shipped set.
- `iconSize` all zero reports one `positive` failure per named size; the other
  two checkers stay `[]`.
- `docs/tokens.md`'s `MetricRule` row names every `metricRules` value and none
  of the retired words; a test fails if it drifts.
- `docs/tokens.md`, `docs/design-system.md`, the package README,
  `COMPONENTS.md` and `TODO.md` state the positive-size rule and the rule
  index.
- No token value, colour, pair or floor moves.
- No path outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None required. The new export is additive; consumers can call
`themeMetricFailures` as before. A diagnostics UI that lists rules can read
`metricRules`, which is documented for that use on the reference page.

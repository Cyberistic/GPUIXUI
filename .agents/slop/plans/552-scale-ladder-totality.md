# Plan 552 — Every volume ladder must walk the theme's own scale

**Workstream:** `tokens-theme`
**Phase:** F (metric-contract completeness)
**Depends on:** 358 (the numeric contract), 360 (ungoverned numeric members),
519 (ordered indexes), 531 (the finite pass walks the group value), 547–549
(lists own the index they derive from), 550 (the border-width ladder)
**Status:** ready

## 1. Why

`themeMetricFailures` is documented as total: "every named ladder — `spacing`,
`radius`, `iconSize`, `avatarSize`, `controlHeight`, `controlPaddingX` … — must
not step backwards" (`docs/tokens.md`) and `themeMetricFailures` returns "every
numeric rule a theme misses".

Two halves of that contract walk different domains:

- the **finite** rule walks the theme's own group (`finiteGroup` →
  `numericMembers`), so a member a theme adds is checked (plan 531);
- the **ladder** rules read hand-typed lists of the *shipped* member names, so a
  member the theme carries outside that list is never compared.

`extendTheme` keeps a member it does not know (it copies every defined entry),
so a copied scale is a real theme state. Probe on this branch:

```ts
const extended = { ...spacing, "6xl": 1 };
const theme = extendTheme(getTheme("light"), { spacing: extended });

theme.spacing["6xl"]; // 1 — the theme carries it
themeMetricFailures(theme); // [] — the ladder never saw it
```

The same probe passes for an extra `iconSize.xxl`, `avatarSize.xl`,
`radius["2xl"]` and `density.controlHeight.xl`, each set below the step before
it. The finiteness half sees the member and accepts it as finite; the ladder
half cannot see it at all. So a brand that widens a scale — or a style decoded
from data, which is how a copied platform file arrives — can ship an inverted
ladder while the package's total check returns `[]`, which is the class of
defect plans 531/547–549 removed one list at a time.

The fix is the same shape as plan 531: walk the **theme's own object** instead
of a shipped list. `extendTheme` copies the base group first and appends the
members the override adds, so a shipped theme keeps its authored order and an
added member lands after the last known step — exactly the order a ladder has to
compare.

## 2. What changes

### 2.1 `packages/tokens/src/metrics.ts` — derive the six ladders

`numericMembers` (already in the module) is the total walker used by the finite
pass: it returns `[name, number]` pairs in `Object.entries` order and ignores
non-numbers. Add two small helpers above `themeMetricFailures`, after
`ascendingSizes`:

```ts
/**
 * The steps of a scale in the order the theme holds them. `extendTheme` copies
 * the base group and assigns the override, so a shipped scale keeps its authored
 * order and a step the theme adds lands after the last one it knows. Walking the
 * theme's object — instead of the shipped names — is what makes the ladder
 * rules total: a brand may carry a wider scale than the identity.
 */
const scaleSteps = (
  scale: unknown,
): ReadonlyArray<readonly [string, number]> => numericMembers(scale, "");

/** A density size ladder, named the way a failure reports it. */
const sizeSteps = (
  group: "controlHeight" | "controlPaddingX",
  sizes: unknown,
): ReadonlyArray<readonly [string, number]> =>
  scaleSteps(sizes).map(([size, value]) => [`${group}.${size}`, value] as const);
```

Then replace the four hand-typed ladders and the two density ladders:

- `ladder("density", controlSizes.map(…controlHeight…), "non-decreasing")` →
  `ladder("density", sizeSteps("controlHeight", density.controlHeight), "non-decreasing")`
- the `controlPaddingX` ladder likewise, keeping the `"positive"` step rule;
- `ladder("iconSize", (["xs", …] as const).map(…), …)` →
  `ladder("iconSize", scaleSteps(iconSize), "non-decreasing", "positive")`
- `ladder("avatarSize", (["xs", …] as const).map(…), …)` →
  `ladder("avatarSize", scaleSteps(avatarSize), "non-decreasing", "positive")`
- `ladder("spacing", (["2xs", …] as const).map(…), "non-decreasing")` →
  `ladder("spacing", scaleSteps(spacing), "non-decreasing")`
- the `radius` ladder → `scaleSteps(radius).filter(([step]) => step !== "none" && step !== "full")`.
  `none` and `full` stay out of the ladder because each has its own rule
  (`zero` and the three `atLeast` bounds); including `full` would report one
  defect twice, which plan 532 forbids. Filtering preserves the relative order
  of the remaining steps, so a step a theme appends after `full` is still
  compared to `xl`.

Do **not** change the typography ladders: `proseLadder` and `codeLadder` are
deliberate subsets (a heading ladder and a code ladder, `bodyStrong` excluded),
not walks of the whole `typography` group.

Do **not** change `metricMembers`: it is the published index of the *shipped*
domain and keeps deriving from the default objects.

Extend the `themeMetricFailures` JSDoc bullet for `spacing`/`radius`/the two
size groups with one sentence: the ladder is read from the theme's own scale
object, so a step a brand adds joins it in the order the theme holds.

### 2.2 New test — `packages/tokens/src/scale-ladder-totality.test.ts`

Header comment states the bug being guarded: a theme carrying an extra scale
step (`extendTheme(light, { spacing: { ...spacing, "6xl": 1 } })`) was
finite-checked but never ladder-checked, so `themeMetricFailures` returned `[]`
while the catalogue promised every named ladder must not step backwards.

Use the public entry (`./index.js`). Five cases, each asserting the exact
failure with `toContainEqual` (the theme may legitimately report more than one
failure when the appended step is far below its bound; assert the ladder failure
by its `member`, `rule`, `actual` and `bound`):

1. **spacing** — `{ ...spacing, "6xl": 1 }` reports
   `{ group: "spacing", member: "6xl", rule: "non-decreasing", actual: 1, bound: 64 }`.
2. **iconSize** — `{ ...iconSize, xxl: 1 }` reports the `iconSize`/`xxl` ladder
   failure against `xl` (24).
3. **avatarSize** — `{ ...avatarSize, xl: 1 }` reports the `avatarSize`/`xl`
   failure against `lg` (40).
4. **radius** — `{ ...radius, "2xl": 1 }` reports the `radius`/`2xl` failure
   against `xl` (12, because `none`/`full` are skipped).
5. **density** — a comfortable preset whose `controlHeight` gains `xl: 1`
   reports `{ group: "density", member: "controlHeight.xl", … }` against `lg`.

Each extension is built by spreading the shipped object into a variable, which
TypeScript accepts (an excess property is only rejected on a fresh literal at
the assignment site). No cast, no `any`.

Also include one case that the shipped values still pass:
`shippedThemes.every(({ theme }) => themeMetricFailures(theme).length === 0)`.

### 2.3 `docs/tokens.md` — one clause in the ladder paragraph

In the metric-contract paragraph (around line 1951, “every named ladder —
`spacing`, `radius`, … — must not step backwards”), append one sentence:

> Each size ladder is read from the theme's own scale object, in the order the
> theme holds its steps, so a brand that adds a step is held to the same rule;
> the radius walk skips `none` and `full`, which have their own rules.

### 2.4 `packages/tokens/README.md` — the same clause, once

In “Checking the numbers”, after “invert a size ladder”, add
“, and the size ladders are read from the theme's own scale objects, so a step
a brand adds is held too”. One clause; do not add a second sentence.

### 2.5 `docs/design-system.md` — no new claim

The finite paragraph already says the walk reads a group's values; it makes no
ladder-domain claim. Leave it alone unless the package test holds a sentence
that must change.

### 2.6 `COMPONENTS.md` — the `Theme metric check` row

After the sentence naming the ten groups, add one clause: “the size ladders
(`spacing`, `radius`, `iconSize`, `avatarSize`, `controlHeight`,
`controlPaddingX`) are read from the theme's own scale object, so a brand that
adds a step is held to them (plan 552)”. Do not repeat a count.

### 2.7 `TODO.md` and the plan index

- Add and tick under “Design tokens and theming”:
  “Hold every size ladder to the theme's own scale — the finite pass walked a
  theme's values but the ladder half read the shipped names, so
  `extendTheme(light, { spacing: { ...spacing, "6xl": 1 } })` returned `[]`
  while the catalogue promised every named ladder must not step backwards; the
  six ladders now walk the theme's own objects, with `radius.none`/`full`
  keeping their own rules (plan 552).”
- Re-count the progress bar (done rows / total rows) and update it; do not
  quote a figure before counting.
- Add plan 552 to `.agents/slop/plans/README.md` after 551 with status `done`,
  and append one commentary paragraph in the voice of 546–551.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS (135 files, 5663 tests at the time of writing; use the actual
   count). Stop if red.

2. Add §2.2 **before** §2.1 and run only the file:
   ```sh
   cd packages/tokens && nub exec vitest run src/scale-ladder-totality.test.ts
   ```
   Expected: FAIL on the spacing case — `themeMetricFailures` returns no
   failure for `6xl` (and the same for the other four cases). Record the output.

3. Implement §2.1, then:
   ```sh
   cd packages/tokens && nub exec vitest run src/scale-ladder-totality.test.ts
   ```
   Expected: PASS, 6 tests.

4. Whole package:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, one more file and six more tests than the baseline (adjust to
   the actual count; do not fabricate a figure).

5. Gates:
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: all green.

6. Prove no shipped value moved:
   ```sh
   git diff --stat packages/tokens/src/color.ts packages/tokens/src/scale.ts packages/tokens/src/typography.ts packages/tokens/src/platform-styles
   ```
   Expected: empty. This plan changes no colour, step, type role, platform style
   or recipe value.

7. Commit and push:
   ```sh
   git add -A
   git commit -m "fix(tokens): read every size ladder from the theme's own scale"
   git push origin agent/tokens-theme
   ```

## 4. STOP conditions

Stop and report instead of improvising if:

- `numericMembers` cannot accept the theme's group without a cast or an `any` —
  it is typed `unknown` and already walks every group value;
- a shipped theme, platform variant or recipe reports a ladder failure after the
  change (its authored order would have to be wrong; that is a real finding, not
  something to silence by reordering);
- an existing `metrics`, `metric-members`, `metric-rule-index` or `finite-metrics`
  case changes result;
- the extra-step test needs a type assertion to compile — the spread variable
  avoids one; a cast is not acceptable;
- the package was already red before the change for reasons outside this
  workstream.

## 5. Acceptance

- A theme carrying an extra `spacing`, `iconSize`, `avatarSize`, `radius` or
  `controlHeight` step below its predecessor is reported by
  `themeMetricFailures`, with the extra member named in the failure.
- Shipped themes, platform variants and recipes still return `[]`.
- The new test fails without §2.1 (all five cases) and passes with it.
- `radius.none` and `radius.full` remain governed by their own rules and are not
  reported twice.
- `docs/tokens.md`, the README, `COMPONENTS.md`, `TODO.md` and the plan index are
  current.
- `nub run check`, `nub run lint`, `nub run test` pass.

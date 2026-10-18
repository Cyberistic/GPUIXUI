# Plan 566 — a defined `overlay` joins the elevation feather ladder

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
085 (a level is geometry plus an alpha over the `shadow` tint), 369 (a defined
level is a level, `overlay` included), 390 (the elevation feather ladder), 552
(the size ladders walk the theme's own scale).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

Plan 369 established that a **defined** `overlay` is governed by the same rules
as `sm`, `md` and `lg`, because `elevationShadow(theme, "overlay")` paints it,
and plan 390 added the feather ladder. Plan 390 deliberately left `overlay` out
of the ladder ("`overlay` stays out: it is reserved and empty") — but that
sentence describes the **shipped data**, not a theme a consumer defines, which
plan 369 made a first-class level.

The result is a contract the documents state and the checker does not keep:

- `docs/design-system.md` §7: "The level names are an order, not a label: the
  numeric contract holds **each level's** painted feather (`blurRadius`) to be
  no smaller than the level below it."
- `docs/tokens.md` "Numeric metrics": "a level a consumer defines, `overlay`
  included, is held to the same rules, because `elevationShadow` will paint it."
- `packages/tokens/src/metrics.ts` `themeMetricFailures` JSDoc: same sentence.

`featherLadder` still walks a hand-typed `["sm", "md", "lg"]`, so a defined
`overlay` — the topmost level in `elevationLevels` order — may feather less
than `lg` and every check returns `[]`. The probe on the shipped light theme
(2026-10-19):

```ts
const edited = extendTheme(getTheme("light"), {
  elevation: {
    overlay: [
      { offsetX: 0, offsetY: 32, blurRadius: 0, spreadRadius: -12, alpha: 0.2 },
    ],
  },
});
themeMetricFailures(edited); // []
elevationShadow(edited, "overlay"); // the 0px-feather shadow the runtime paints
```

A command palette defined at `overlay` therefore sits closer to the surface than
a resting card (shipped `sm` is 2px, `lg` 40px), while the design system says
the level names are an order. The failure mode is the one plan 390 fixed for
`lg`: a level name that no longer means its height.

Every shipped theme, platform variant and recipe ships `overlay: []`, so this
plan moves **no token value**.

## 2. Decision

Walk the ladder over `elevationLevels` itself instead of a hand-typed list, and
compare the **defined** levels in that order:

1. A level with no entry is skipped (the shipped `overlay`), so the reserved
   case stays exempt — the existing "at least one entry" rule owns the three
   designed levels.
2. `sm` → `md` → `lg` keep their current comparison.
3. A defined `overlay` joins after `lg`, because `elevationLevels` is the
   documented order and `elevationShadow` paints it.
4. A new level added to `elevationLevels` joins the ladder automatically — the
   same totality rule plans 552 and 554 applied to the size ladders and sign
   rules.

Rejected alternatives:

- **Remove `overlay` from `elevationLevels`** — it is the reserved level
  primitives already pass; the type is public and plan 369 made a defined one
  governed.
- **Keep the hand-typed list and delete the "each level" claim** — the runtime
  still paints the shallow top level, so the defect stays and the guarantee
  shrinks.
- **Ladder every entry of a level** — the native runtime paints the first entry
  only; plan 390 rejected this for a reason that still holds.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts` — walk the level index

Replace the hand-typed tuple inside `featherLadder`:

```ts
  const steps = (["sm", "md", "lg"] as const).flatMap((level) => {
```

with the ordered owner (`elevationLevels` is already imported by this module):

```ts
  const steps = elevationLevels.flatMap((level) => {
```

Update the helper's JSDoc to say "every defined level, in `elevationLevels`
order — `sm` → `md` → `lg`, and a defined `overlay` above them". Keep the
existing "one bad level keeps one diagnostic" behaviour: a non-finite or
negative neighbour is not compared.

### 3.2 `packages/tokens/src/metrics.ts` — the public JSDoc bullet

In the **elevation** bullet of `themeMetricFailures`, change
"each level's painted feather (`blurRadius`) is no smaller than the level below
it" to name the owner and the defined overlay:

> each defined level's painted feather (`blurRadius`) is no smaller than the
> defined level below it, in `elevationLevels` order — a defined `overlay`
> joins the ladder above `lg` — because the level names are an order.

Leave the following sentences (opacity is not a step; empty level exempt;
defined level governed) unchanged.

### 3.3 New `packages/tokens/src/elevation-overlay.example.ts`

A runnable example of the edit the contract now governs. The topmost surface a
theme can raise — a command palette — feathers further than a dialog, so the
example is valid:

```ts
import { darkTheme, extendTheme, type ElevationShape } from "./index.js";

/** A command palette's shadow: the topmost level feathers past a dialog's. */
export const commandPaletteShadow: ElevationShape = {
  offsetX: 0,
  offsetY: 32,
  blurRadius: 72,
  spreadRadius: -16,
  alpha: 0.9,
};

/**
 * A theme that defines the reserved `overlay` level. `themeMetricFailures`
 * holds every defined level to the `elevationLevels` order, so this shadow
 * must feather at least as far as `lg`.
 */
export const commandPaletteTheme = extendTheme(darkTheme, {
  name: "Command palette",
  elevation: { overlay: [commandPaletteShadow] },
});
```

Dark `lg` is 56px, so 72 passes; alpha 0.9 is a fraction.

### 3.4 New `packages/tokens/src/elevation-overlay.test.ts`

Header comment states the guarded bug: **the design system says the elevation
level names are an order, but the feather ladder walked a hand-typed
`sm`/`md`/`lg`, so a defined `overlay` could paint a shallower top level while
`themeMetricFailures` returned `[]`.**

Cases:

1. **The measured gap** — the probe in §1 returns exactly one `elevation`
   failure: `member: "overlay[0].blurRadius"`, `rule: "non-decreasing"`,
   `bound` equal to the shipped `lg` feather; `themeContrastFailures` stays
   `[]`.
2. **Equality is legal** — an `overlay` whose feather equals `lg` returns `[]`.
3. **The intended edit passes** — the example theme
   (`commandPaletteTheme`) returns `[]`, and
   `elevationShadow(commandPaletteTheme, "overlay")` has the example's
   `blurRadius` (proving the rule governs the painted path).
4. **The reserved case stays exempt** — every shipped set's defined levels
   return `[]`; derive the shipped sets from `shippedThemes`, not a hand list,
   and assert at least one set ships an empty `overlay` so the exemption is
   exercised.
5. **The rule follows the index** — read the expected predecessor from
   `elevationLevels`: for each adjacent defined pair, the failure names the
   later level. This is the case that fails if a future level is added to the
   index but skipped by the ladder.
6. **One bad level keeps one diagnostic** — an `overlay` with `blurRadius:
   Number.POSITIVE_INFINITY` returns only the `finite` failure and does not
   cascade, matching `metrics.test.ts`'s existing rule.

Use local shapes derived from the theme (`lightTheme.elevation.lg`) with an
explicit undefined check, or literal shapes; do not add non-null assertions.

### 3.4b `packages/tokens/src/overlay-elevation.test.ts` — the plan-369 fixture

Plan 369's accepted overlay used `blurRadius: 12` (the `md` feather). That is no
longer a legal **top** level, so raise the shared shape's feather above the
shipped `lg` (48px) and keep the designed-level case honest by spreading each
level's **own** shipped shape before corrupting its offset — otherwise the case
would report the new ladder failure alongside the intended `finite` one. The
test's intent and assertions do not change; only the fixture becomes a legal
level.

### 3.5 `docs/tokens.md` — "Numeric metrics"

Replace "so `sm` → `md` → `lg` must not get a smaller `blurRadius` as the level
rises" with the ordered owner and the defined overlay:

> so the defined levels in `elevationLevels` order — `sm` → `md` → `lg`, and a
> defined `overlay` above them — must not get a smaller `blurRadius` as the
> level rises

and add beside the existing empty-level sentence that the ladder reads the
index, so a level added to `elevationLevels` joins it.

Also add a runnable-example link at the end of the **Elevation** section, beside
the `elevationShadows` paragraph:

> A theme that defines the reserved `overlay` level is in
> [`src/elevation-overlay.example.ts`](../packages/tokens/src/elevation-overlay.example.ts).

### 3.6 `docs/design-system.md` §7

The paragraph already says "each level's painted feather … no smaller than the
level below it". Make the reserved case explicit so the sentence is true of the
data and the type:

> … no smaller than the defined level below it, in `elevationLevels` order — a
> theme that defines the reserved `overlay` level places it above `lg` — so a
> copied theme cannot make a dialog sit closer to the surface than a resting
> card.

### 3.7 `packages/tokens/README.md` — "Checking the numbers"

Change "an empty elevation level is exempt (the shipped `elevation.overlay`),
while a level a consumer defines is held to the same rules" to name the ladder:
"… and a defined level joins the feather ladder in `elevationLevels` order,
`overlay` included, because `elevationShadow` paints its first entry."

### 3.8 `COMPONENTS.md` — the **Theme metric check** row

In the list of what an edited theme cannot do, after "shrink a higher elevation
level's feather below the level under it", add "(a defined `overlay` joins the
ladder above `lg`; the shipped empty one is exempt)". Keep the row one line.

### 3.9 `.agents/slop/plans/README.md`

- Add the row after `565`:

```
| [566](./566-overlay-feather-ladder.md) | A defined `overlay` joins the elevation feather ladder | F | 369, 390, 552 | done |
```

- Add a closing paragraph in the established voice: the probe, the two
  document sentences that were false, the index walk, the exemption for the
  shipped empty level and that no value moves.

### 3.10 `TODO.md`

Add one ticked row under "Design tokens and theming (`tokens-theme`)" naming the
gap, the probe, the index walk, the example and the documents; bump the section
progress count by one.

## 4. Test plan and both directions

Prove the new cases fail without the fix (git, because
`scripts/verify-two-directions.sh` drives `jj`, absent per PLAN D1):

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/elevation-overlay.test.ts)
# EXPECT: cases 1, 3 (the failure half) and 5 FAIL with [] from the pre-fix
# checker; cases 2, 4 and 6 pass because they document legal edits. A "reports"
# case that passes here does not guard the fix — STOP and rewrite it.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/elevation-overlay.test.ts)
# EXPECT: every case passes.
```

Then the package suite and the gate:

```sh
nub run --filter @gpuixui/tokens test
# EXPECT: every file passes; one new test file and one new example.
nub run check
# EXPECT: check-tests, oxlint, oxfmt and tsc clean.
nub run lint
# EXPECT: clean.
```

Also run the guarded documents after the prose edits:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/inventory.test.ts src/readme.test.ts \
  src/metrics.test.ts src/examples.test.ts
# EXPECT: all pass.
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe fails the new comparison — the
  shipped `overlay` must stay empty and no value may move;
- an existing `metrics.test.ts` or `elevation-ladder.test.ts` expectation
  changes — the move must not alter an `sm`/`md`/`lg` diagnostic;
- the change needs a new rule, group, public type or function — it is one
  `flatMap` owner and documentation;
- `docs.test.ts`, `inventory.test.ts` or `readme.test.ts` rejects a sentence —
  adjust the wording to the guard, never the guard to the wording;
- a "reports" case passes on the pre-fix `metrics.ts`;
- `nub run check` or `nub run lint` fails for a reason outside these files.

## 6. Acceptance criteria

- A defined `overlay` with a feather below `lg` reports exactly
  `member: "overlay[0].blurRadius"`, `rule: "non-decreasing"`; a feather equal
  to or above `lg` returns `[]`; the shipped empty `overlay` stays exempt.
- The ladder walks `elevationLevels`, so a level added to the index is compared
  without a second edit; a case proves it.
- `themeMetricFailures`' JSDoc, `docs/tokens.md`, `docs/design-system.md`, the
  package README and the `COMPONENTS.md` metric row state the rule; the
  catalogue links the new example.
- The new cases fail on the pre-fix `metrics.ts` and pass after.
- No token value, colour pair, floor, metric, platform style or recipe changes;
  no path outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. `elevationShadow` already resolves a defined `overlay`; this plan makes
the numeric half report the order the design system publishes. No consumer
migration is implied — the shipped `overlay` stays empty and a consumer that
defines one is now held to the height it names.

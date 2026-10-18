# Plan 390 — the elevation ladder

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
358 (the metric contract), 368 (finiteness), 369 (a defined `overlay`),
085 (geometry plus alpha).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`docs/tokens.md` names the numeric contract's ladders in one sentence:

> every named ladder — `spacing`, `radius`, `iconSize`, `avatarSize`,
> `controlHeight`, `controlPaddingX` and the motion timings — must not step
> backwards

`docs/design-system.md` §7 states the elevation levels are semantic heights:
`sm` for resting cards, `md` for menus and popovers, `lg` for dialogs and the
command palette, and "dark shadows are darker and more opaque because contrast
between surfaces is lower". `themeMetricFailures` governs the elevation group
with per-shape range rules only — four finite geometry fields, a non-negative
blur and an alpha inside `0…1` (plans 360, 364, 368, 369). **Nothing compares one
level with the next**, so every other named scale has a ladder rule and this one
does not.

A probe on the shipped light theme, run on 2026-10-18, returns `[]` from
`themeMetricFailures` for both edits:

```ts
// The largest level loses its height: a dialog now casts the resting card's
// feather. "lg" is the shallowest level in the theme. (Swapping both ends
// reports two failures — `md` below `sm` and `lg` below `md`.)
const inverted = extendTheme(getTheme("light"), {
  elevation: { lg: getTheme("light").elevation.sm },
});
themeMetricFailures(inverted); // []

// The largest level loses its feather entirely: a hard 0px shadow behind the
// command palette, against 12px for a menu and 2px for a card.
const flatLargest = extendTheme(getTheme("light"), {
  elevation: {
    lg: [{ offsetX: 0, offsetY: 16, blurRadius: 0, spreadRadius: 0, alpha: 0.16 }],
  },
});
themeMetricFailures(flatLargest); // []
```

The composition is first-class: `elevationShadow(theme, level)` is how every
component paints depth, and the design system assigns `md` to menus, popovers
and tooltips and `lg` to dialogs and command palettes. A theme whose `lg`
feathers less than its `sm` makes "large elevation" mean "closest to the
surface" — the same class of defect plans 358 and 367 closed for the spacing,
radius, icon, avatar, density, motion and type ladders, where a name stopped
meaning what it said while both checkers returned `[]`.

Every shipped theme, platform variant and recipe is monotone in the feather, so
this plan moves **no token value**:

| Set | `sm` blur | `md` blur | `lg` blur |
| --- | --------- | --------- | --------- |
| identity light | 2 | 12 | 40 |
| identity dark | 2 | 24 | 56 |
| macOS light / dark | 3 / 3 | 18 / 28 | 48 / 64 |
| Linux light / dark | 4 / 4 | 16 / 20 | 44 / 52 |
| Windows light / dark | 2 / 2 | 10 / 18 | 32 / 44 |

The XP and Aero recipes reuse the Windows elevation; the authored Contoso style
overrides only `md` (16px between the identity's 2 and 40).

## 2. Decision

One rule, inside the existing `elevation` group — no new group, no new
`MetricRule` member, no colour, pair, floor or shipped value:

1. **The feather is the level's height.** A level's **first** entry is the
   shadow the native runtime paints (`elevationShadow` reads it; a level's other
   entries are for a compositing web renderer), so the rule compares
   `elevation.sm[0].blurRadius` → `md[0]` → `lg[0]` and requires each to be
   non-decreasing.
2. **Equality is allowed.** Flat themes, and designs that share a feather across
   two neighbouring levels, are a choice; inversion is the defect.
3. **Opacity is not part of the ladder.** `alpha` is a mode and tint decision —
   a big soft dialog shadow may be fainter than a small card shadow, and a
   shipped dark set is deliberately more opaque than its light peer. The rule
   governs geometry, not taste. `overlay` stays out: it is reserved and empty,
   and a consumer-defined entry already takes every range rule.

Rejected alternatives, with reasons:

- **A combined "depth" scalar** (`blur + offsetY` or a weighted sum) — an
  invented number with no meaning to the renderer, and it would reject a large
  shadow with a small offset. The feather is the only field whose growth
  unambiguously means "further from the surface".
- **Ladder `alpha` as well** — a fainter-but-larger dialog shadow is a real
  design, and the dark/light difference is already a mode decision, not a level
  order.
- **Order every entry of every level** — the native runtime paints one shadow;
  entries after the first are a web-compositing concern, and their order has no
  meaning to `elevationShadow`. Comparing the painted entry is the honest rule.
- **A runtime check in `extendTheme`** — the package keeps the extension
  mechanism total and side-effect free (plan 358); the contract is a test-time
  check a consumer runs.
- **Guard only in `elevation.test.ts`** — that suite reads the shipped
  constants; the defect is an edited theme, which only
  `themeMetricFailures` sees.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

**a.** Import the elevation type beside the existing metric type imports:

```ts
import type { Elevation } from "./elevation.js";
```

**b.** Add a helper beside `ascendingSizes`, above `themeMetricFailures`:

```ts
/**
 * The elevation feather is the level's height. A level's first entry is the
 * shadow the native runtime paints, so `sm` → `md` → `lg` may not get softer-
 * edged as it rises. Opacity is deliberately not a step: a fainter dialog
 * shadow or a flat theme is a design, while a dialog that feathers less than a
 * resting card makes "lg" a shallower level than "sm".
 */
const featherLadder = (
  elevation: Elevation,
): ReadonlyArray<MetricFailure> => {
  const steps = (["sm", "md", "lg"] as const).flatMap((level) => {
    const [shape] = elevation[level];
    return shape === undefined
      ? []
      : [[level, shape.blurRadius] as const];
  });
  return steps.flatMap(([level, blur], index) => {
    const previous = steps[index - 1];
    return previous === undefined || blur >= previous[1]
      ? []
      : [
          failure(
            "elevation",
            `${level}[0].blurRadius`,
            "non-decreasing",
            blur,
            previous[1],
          ),
        ];
  });
};
```

The member is `lg[0].blurRadius`, matching the existing shape diagnostics
(`md[0].alpha`, `md[0].offsetX`). A level with no entry is skipped here: the
existing "at least one entry" rule already reports it, and this rule must not
duplicate that failure.

**c.** In `themeMetricFailures`, insert the call immediately **after** the
per-level `elevation` block and **before** the `motion` rules:

```ts
    ...featherLadder(elevation),
```

**d.** Extend the `themeMetricFailures` JSDoc bullet for elevation:

> - **elevation**: `sm`/`md`/`lg` each hold a shadow whose two offsets, blur and
>   spread are finite, whose blur is non-negative, and whose alpha is a
>   fraction, and each level's painted feather (`blurRadius`) is no smaller than
>   the level below it — a dialog that feathers less than a resting card makes
>   "lg" a shallower level than "sm". Opacity is not a step: a fainter large
>   level and a flat theme are designs. `overlay` ships reserved and empty, and
>   an empty level is exempt; a level a consumer defines — `overlay` included —
>   is held to the same rules, because `elevationShadow` will paint it.

### 3.2 New `packages/tokens/src/elevation-ladder.test.ts`

Header comment states the guarded bug: **the design system publishes `sm` →
`md` → `lg` as increasing heights, but `themeMetricFailures` compared only the
range of one level, so an edited theme could swap the dialog and card feathers
and return `[]` while every component painted the wrong depth.**

Cases:

1. **The measured gap** — a `lg` set to the `sm` level returns exactly one
   `elevation` failure, and the colour check stays `[]`:

   ```ts
   it("reports a dialog that feathers less than the rest", () => {
     const light = getTheme("light");
     const edited = extendTheme(light, {
       elevation: { lg: light.elevation.sm },
     });
     expect(themeContrastFailures(edited)).toEqual([]);
     expect(themeMetricFailures(edited)).toEqual([
       {
         group: "elevation",
         member: "lg[0].blurRadius",
         rule: "non-decreasing",
         actual: light.elevation.sm[0]?.blurRadius,
         bound: light.elevation.md[0]?.blurRadius,
       },
     ]);
   });
   ```

   (Write the case so the actual/bound are derived from the shipped levels,
   not retyped.)

2. **A hard-edged largest level** — `lg` with `blurRadius: 0` against the
   shipped `md` 12 reports `lg[0].blurRadius` / `non-decreasing`.

3. **The intended edits pass** — `lg.blurRadius` equal to `md`'s returns `[]`,
   and a **fainter but larger** `lg` (`blurRadius` 48, `alpha` 0.08) returns
   `[]`. The second case is the explicit proof that opacity is not governed.

4. **A flat theme passes** — `sm`, `md` and `lg` all at `blurRadius: 0` return
   `[]`.

5. **Every shipped set passes** — `shippedThemes` (plan 387) mapped to
   `themeMetricFailures(theme)` is `[]` for each; the "no value moves" proof.

6. **The rule names the painted entry** — a level with two entries where the
   first is the shallow one reports the first (`md[0]`), proving the comparison
   reads the shadow the runtime paints.

7. **One bad level keeps one diagnostic** — an infinite `md` feather returns only
   the `finite` failure and does not cascade into `lg`, because the range rules
   already own that value.

### 3.3 `docs/tokens.md` — "Numeric metrics"

In the ladder sentence, insert elevation beside the other ladders:

> every named ladder — `spacing`, `radius`, `iconSize`, `avatarSize`,
> `controlHeight`, `controlPaddingX`, the motion timings and the elevation
> feather — must not step backwards

and add, after the elevation range clause (the sentence ending "a `NaN` is a
shadow the renderer cannot paint"):

> A level's **first** entry is the shadow the runtime paints, so `sm` → `md` →
> `lg` must not get a smaller `blurRadius` as the level rises — a dialog that
> feathers less than a resting card makes "lg" a shallower level than "sm".
> Opacity is not part of the ladder: a fainter large shadow or a flat theme is a
> design.

### 3.4 `docs/design-system.md` §7

After "Elevation is a semantic level…" paragraph's sentence about
`elevationShadow`, add:

> The level names are an order, not a label: the numeric contract holds each
> level's painted feather (`blurRadius`) to be no smaller than the level below
> it, so a copied theme cannot make a dialog sit closer to the surface than a
> resting card. Opacity stays a mode decision — a large shadow may be fainter
> and a flat theme may zero the feather at every level.

### 3.5 `packages/tokens/README.md` — "Checking the numbers"

In the list of what the edit path can do, after "invert a size ladder", add:

> shrink a higher elevation level's feather below the level under it

### 3.6 `COMPONENTS.md` — the **Theme metric check** row

In the list of what an edited theme cannot do, after "invert a named ladder",
add:

> shrink a higher elevation level's feather below the level under it

### 3.7 `packages/tokens/src/docs.test.ts`

Add one case beside the metric-claims cases, deriving the member from the
contract rather than retyping it:

```ts
it("states the elevation feather ladder", () => {
  const light = getTheme("light");
  const edited = extendTheme(light, { elevation: { lg: light.elevation.sm } });
  const [failure] = themeMetricFailures(edited).filter(
    (entry) => entry.group === "elevation",
  );
  expect(failure?.member).toBe("lg[0].blurRadius");
  expect(failure?.rule).toBe("non-decreasing");
  expect(markdown).toContain("feather");
  expect(designSystem).toContain("feather");
});
```

Import `extendTheme`, `getTheme` and `themeMetricFailures` if the file does not
already.

### 3.8 `.agents/slop/plans/README.md`

- Add the table row after 389:

```
| [390](./390-elevation-ladder.md) | The elevation ladder | F | 085, 358, 368, 369 | done |
```

- Add a closing paragraph in the established voice: the two probe edits that
  returned `[]`, the feather rule, why opacity is not governed, and that no
  shipped value moves.

### 3.9 `TODO.md`

Add one ticked row under "Design tokens and theming (`tokens-theme`)" naming the
gap, the probe, the feather rule and the docs/ledger updates, and bump the
section progress count by one.

## 4. Test plan and both directions

Prove the new cases fail without the rule (git, because
`scripts/verify-two-directions.sh` drives `jj`, absent per PLAN D1):

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/elevation-ladder.test.ts)
# EXPECT: cases 1, 2 and 6 FAIL (the pre-fix checker returns []); the "passes"
# cases pass. A "reports" case that passes here does not guard the fix — STOP
# and rewrite it.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/elevation-ladder.test.ts)
# EXPECT: every case passes.
```

Then the package suite and the gate:

```sh
nub run --filter @gpuixui/tokens test
# EXPECT: every file passes; one new file.
nub run check
# EXPECT: check-tests, oxlint, oxfmt and tsc clean.
nub run lint
# EXPECT: clean.
```

Also run the guarded documents after the prose edits:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/inventory.test.ts src/readme.test.ts src/metrics.test.ts
# EXPECT: all pass.
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe fails the new rule (that would
  mean a shipped value must move, which this plan forbids);
- a shipped set's elevation is **not** monotone in the feather as §1 states — the
  table is the evidence, and a mismatch means the audit is wrong;
- the new rule needs a new `MetricRule` member or a second comparison — the plan
  is one helper and one `non-decreasing` comparison;
- a level with no entry produces a duplicate failure (the existing "at least one
  entry" rule owns that diagnostic);
- a "reports" case passes on the pre-fix `metrics.ts`;
- `docs.test.ts` rejects the new sentences (re-read the guard; do not delete a
  guarded phrase);
- `nub run check` or `nub run lint` fails for a reason outside these files.

## 6. Acceptance criteria

- A `lg` set to the `sm` level and a hard-edged `lg` each return exactly one
  `elevation` failure with `member: "lg[0].blurRadius"`,
  `rule: "non-decreasing"`, and `themeContrastFailures` still returns `[]`.
- Equal neighbouring feathers, a fainter-but-larger `lg`, a flat theme and every
  shipped set return `[]`.
- `themeMetricFailures`' JSDoc, `docs/tokens.md`, `docs/design-system.md`, the
  package README and the `COMPONENTS.md` metric row state the rule.
- The new cases fail on the pre-fix `metrics.ts` (proven with §4) and pass after.
- No token value, colour pair, floor, metric, platform style or recipe changes;
  no path outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. `elevationShadow` already resolves the painted entry and every consumer
reads it; the contract describes the invariant that call assumes. No consumer
migration is implied.

# 725 — The scale ladders the tests still retype

**Phase:** F (the numeric contract's own reach) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 068 (`densityNames` / `isDensityName`), 096 (`controlSizes`),
305 (`themeModes` / `themeContrasts`), 372 (the named size ladders are
`positive`), 552 (every size ladder walks the theme's own scale), 668
(`spacingSteps` / `avatarSizeSteps` and the other ordered indexes) ·
**Number block:** 723 landed in this branch and 724 belongs to the `components`
worktree, so this takes **725** ·
**Status:** done

> **Status: executed 2026-10-20.** Execution evidence is at the end of this plan.

## Why

Plan 668 shipped the ordered indexes a table or a test should walk —
`spacingSteps`, `radiusSteps`, `borderWidthSteps`, `iconSizeSteps`,
`avatarSizeSteps`, `dimensionNames`, `paletteRamps` — and plan 305/096/068 the
axis indexes `themeModes`, `themeContrasts`, `controlSizes` and `densityNames`.
Four ladders in `scale.test.ts` still hand-type the pairs the indexes own:

```ts
const ascendingSpacing = [/* nine hand-typed pairs: 2xs→xs … 4xl→5xl */];
const ascendingDensities: readonly [DensityName, DensityName][] = [
  ["compact", "comfortable"],
  ["comfortable", "spacious"],
];
```

plus `avatarSize` (`sm > xs`, `md > sm`, `lg > md`) and the within-preset
control sizes (`sm < md`, `md < lg`). Each is correct today, and each is a hole
of the exact kind plans 068 and 668 closed: **a step added to the index is not
compared.**

- A fourth density preset — `roomy`, say — added to `densityNames` and
  `densityPresets` compiles (the record is typed by the union), ships, and is
  never ordered against `spacious`. `scale.test.ts` keeps passing while
  `roomy`'s controls are smaller than `comfortable`'s.
- A tenth spacing step (`6xl`) joins `spacing` and `spacingSteps` and no test
  compares `5xl` to it.
- Plan 068's summary claims "`scale.test.ts` no longer retypes the preset
  names", which is false for `ascendingDensities` — the names are retyped as
  pairs, one level down.

`rowHeight` is the second half. The design system's density section publishes
the three presets as a ladder — `compact` 28px rows, `comfortable` 32,
`spacious` 36, "dense workspaces" → "touch-leaning" — and
`scale.test.ts` only asserts `rowHeight > 0` inside each preset. A preset whose
rows shrink as density grows passes every check.

**Measured.** All four ladders hold in the shipped data: spacing 2 → 4 → 6 → 8 →
12 → 16 → 24 → 32 → 48 → 64, avatars 16 → 24 → 32 → 40, controls
24/28/32 → 28/32/36 → 32/36/40 and rows 28 → 32 → 36. This plan moves no value;
it makes the shipped order the index's, so a new member cannot ship uncompared.

A synthetic preset proves the check can fail:

```ts
const inverted = {
  ...densityPresets,
  compact: { ...densityPresets.compact, rowHeight: 100 },
};
// "compact < comfortable (rowHeight)" — the current suite cannot say this.
```

## Decision

1. Derive every adjacent pair from the index that owns the order: `spacingSteps`,
   `avatarSizeSteps`, `densityNames` and `controlSizes`. No literal step names in
   `scale.test.ts`.
2. Assert each derived list has exactly `index.length - 1` pairs, so a new member
   must be compared (a length that does not grow is the drift).
3. Extend the cross-preset order to all three density metrics — control height
   per size, horizontal padding per size, and `rowHeight` — and hold the rows
   strictly increasing, like the heights and the padding.
4. Prove the order check can fail with the inverted preset in the test itself
   (a local `presetOrderFailures` helper over both the shipped data and a
   synthetic copy), so the case is not a tautology on today's values.
5. No token value, role, pair, floor or metric moves. No new public export: the
   indexes already exist.

## Exact files and changes

### 1. `packages/tokens/src/scale.test.ts`

Replace `ascendingSpacing` with a derivation, and add the index-owned pairs and
the density helper:

```ts
import {
  avatarSize,
  avatarSizeSteps,
  controlSizes,
  densityNames,
  densityPresets,
  spacing,
  spacingSteps,
  type Density,
  type DensityName,
} from "./scale.js";

/** `[smaller, larger]` for every neighbouring pair of an ordered index. */
const adjacent = <Step extends string>(
  steps: ReadonlyArray<Step>,
): ReadonlyArray<readonly [Step, Step]> =>
  steps.flatMap((step, index) => {
    const next = steps[index + 1];
    return next === undefined ? [] : ([[step, next]] as const);
  });

const ascendingSpacing = adjacent(spacingSteps);
const ascendingDensities = adjacent(densityNames);

/** Why a preset ladder is not strictly increasing, as readable labels. */
const presetOrderFailures = (
  presets: Readonly<Record<DensityName, Density>>,
): ReadonlyArray<string> =>
  ascendingDensities.flatMap(([smaller, larger]) => [
    ...controlSizes.map((size) =>
      presets[larger].controlHeight[size] > presets[smaller].controlHeight[size]
        ? undefined
        : `controlHeight.${size}: ${larger} is not above ${smaller}`,
    ),
    `rowHeight: ${larger} is ${
      presets[larger].rowHeight > presets[smaller].rowHeight
        ? "above"
        : "not above"
    } ${smaller}`,
  ]).filter((failure): failure is string => failure !== undefined);
```

(`rowHeight` is written as the string pair so the assertion names the metric and
both presets; the control heights use the same shape.)

Cases:

```ts
it("compares every step the spacing index holds", () => {
  expect(ascendingSpacing).toHaveLength(spacingSteps.length - 1);
  ascendingSpacing.forEach(([smaller, larger]) => {
    expect(spacing[larger]).toBeGreaterThan(spacing[smaller]);
  });
});

it("compares every avatar step", () => {
  expect(adjacent(avatarSizeSteps)).toHaveLength(avatarSizeSteps.length - 1);
  adjacent(avatarSizeSteps).forEach(([smaller, larger]) => {
    expect(avatarSize[larger]).toBeGreaterThan(avatarSize[smaller]);
  });
});

it("orders every preset pair on all three metrics", () => {
  expect(ascendingDensities).toHaveLength(densityNames.length - 1);
  expect(presetOrderFailures(densityPresets)).toEqual([]);
});

it("catches a preset ladder that steps the wrong way", () => {
  const inverted = {
    ...densityPresets,
    compact: { ...densityPresets.compact, rowHeight: 100 },
  };
  expect(presetOrderFailures(inverted)).toEqual([
    "rowHeight: comfortable is not above compact",
  ]);
});

it("orders the control sizes the index holds inside every preset", () => {
  expect(adjacent(controlSizes)).toHaveLength(controlSizes.length - 1);
  densityNames.forEach((preset) => {
    adjacent(controlSizes).forEach(([smaller, larger]) => {
      expect(
        densityPresets[preset].controlHeight[larger],
        `${preset}: ${larger} > ${smaller}`,
      ).toBeGreaterThan(densityPresets[preset].controlHeight[smaller]);
    });
  });
});
```

Remove the four hand-typed lists and the two `ascendingDensities.forEach`
cases they fed (their assertions move into the cases above). Keep the
"gives every size in the index a metric in every preset" case as it is.

### 2. `docs/tokens.md` — §Density

After the preset table, add one sentence naming the order and its owner:

```md
The three metrics rise with the preset — `compact` → `comfortable` →
`spacious` for every control height, every horizontal padding and the row — and
`scale.test.ts` walks `densityNames` and `controlSizes` pairwise, so a fourth
preset or a fourth size cannot ship without its neighbours compared.
```

### 3. `packages/tokens/src/docs.test.ts`

The density table case already derives every row from `densityPresets`; add the
new sentence to the same `it` (search `lists every density preset at its real
metrics`):

```ts
expect(markdown).toContain(
  "`scale.test.ts` walks `densityNames` and `controlSizes` pairwise",
);
```

### 4. `docs/design-system.md` — §4 (density)

The three-bullet list already states the shipped figures. Add one clause after
the list:

```md
The order is a contract: each metric rises from `compact` to `spacious`, and a
preset that inverted it would fail `scale.test.ts` rather than ship.
```

### 5. `COMPONENTS.md`

**Design tokens** row: append, before the closing `|`:

```md
Plan `725` holds the scale ladders to the indexes that own them —
`scale.test.ts` derives its spacing, avatar and preset pairs from `spacingSteps`,
`avatarSizeSteps`, `densityNames` and `controlSizes` instead of hand-typing
them, and the density ladder now covers `rowHeight` beside every control height
and padding, so a fourth preset or a tenth spacing step cannot ship uncompared;
all shipped values already hold (spacing 2…64, avatars 16…40, controls
24/28/32 → 32/36/40, rows 28 → 32 → 36), so no token value moves.
```

### 6. `TODO.md`

Add one completed row at the end of *Design tokens and theming* and move the
counter `328/406` → `329/407`:

```
`[x]` Hold the scale ladders to their own indexes — `scale.test.ts` hand-typed
the neighbours `spacingSteps`, `avatarSizeSteps`, `densityNames` and
`controlSizes` own, so a tenth spacing step, a fourth avatar tier or a fourth
density preset joined the package without being compared, and `rowHeight` had no
cross-preset order at all (a preset whose rows shrank as density grew passed
every check); the pairs now derive from the indexes, the density ladder covers
all three metrics, and a synthetic inverted preset proves the check can fail —
every shipped value already holds, so no metric moves (plan 725)
```

### 7. `.agents/slop/plans/README.md`

Add one row after `723`:

```
| [725](./725-scale-ladder-indexes.md) | The scale ladders the tests still retype | F | 068, 096, 305, 372, 552, 668 | done |
```

Add a short paragraph after the `723` summary with the four hand-typed ladders,
the missing `rowHeight` order, the derived fix and the fact that no value moves.

## Commands

Run from the worktree root.

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| New guard only | `nub run --filter @gpuixui/tokens test -- src/scale.test.ts` | pass; the derived pair counts asserted |
| Prove it fails without the fix | append a fourth preset (`roomy`, rows 30) to `densityNames` and `densityPresets` in `scale.ts` and rerun the command above | "orders every preset pair on all three metrics" fails on `rowHeight: roomy is not above spacious`; revert `scale.ts` afterwards |
| Prove the order check can fail | run the inverted-preset case | one `rowHeight` failure, named |
| Package suite | `nub run --filter @gpuixui/tokens test` | every file green |
| Types | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| Whole gate | `nub run check` | `check:tests`, lint, format and types pass |
| Repo test gate | `nub run test` | all workspaces' suites pass |

## Test plan

- **Can the new cases fail?** Yes, in both directions:
  - the pair-count assertions fail if a member joins an index and the pairs are
    hand-typed again (two pairs against three neighbours);
  - the inverted-preset case fails unless the order check reports the
    `rowHeight` inversion, and the shipped case fails if any preset inverts.
- **No shipped value moves:** every assertion is `>` on today's figures; the
  probe in §Why lists them.
- **No redundancy:** the theme-side ladders (`themeMetricFailures` on the active
  preset) stay; the presets are shipped data no `Theme` holds, which is why the
  cross-preset order lives in the suite.

## Acceptance

- [ ] `scale.test.ts` holds no literal step or preset name.
- [ ] Spacing, avatar, preset and control-size pairs derive from their indexes,
      and each list's length is `index.length - 1`.
- [ ] The density ladder covers `controlHeight` (per size), `controlPaddingX`
      (per size) and `rowHeight`, across every adjacent preset.
- [ ] The inverted-preset case reports exactly one `rowHeight` failure.
- [ ] `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` and
      the plan index state the derivation and the order.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.

## STOP conditions

- **Any shipped ladder is not strictly increasing** → stop and report the pair
  and values. The probe says every one is; this plan moves no metric.
- **A derived pair count disagrees with the index** → fix the derivation, not the
  index.
- **A docs guard demands a different sentence** → update the sentence to the
  derived figures; never change a preset to satisfy prose.
- **A preset name would need a code change to be compared** → stop and report:
  the point of the plan is that adding one to `densityNames` and
  `densityPresets` is enough.
- **A gate fails in a file this plan does not own** → report it; do not edit
  another workstream's tree.

## Execution (2026-10-20)

- `scale.test.ts` derives `ascendingSpacing` from `spacingSteps` and
  `ascendingDensities` from `densityNames`; the avatar and control-size ladders
  derive from `avatarSizeSteps` and `controlSizes`, so no step name is typed in
  the file.
- The density ladder now holds `controlHeight` per size, `controlPaddingX` per
  size and `rowHeight` across every adjacent preset; the inverted-preset case
  reports exactly `"rowHeight: comfortable is not above compact"`.
- All shipped values already satisfy the order (spacing 2…64, avatars 16…40,
  controls 24/28/32 → 32/36/40, rows 28 → 32 → 36): no metric, role, pair or
  floor moves.
- Both-directions evidence: appending a fourth preset (`roomy`, rows 30) to
  `densityNames` and `densityPresets` makes "orders every preset pair on all
  three metrics" fail on `rowHeight: roomy is not above spacious` (plus the
  preset-enumerating docs cases), and reverting `scale.ts` returns the suite to
  green — so a new preset is compared, not silently skipped.
- The package suite, `nub run check` and the repo test gate are recorded in the
  commit.

# 642 — A level the runtime half-paints

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 018 (one shadow, no unsupported fields), 085 (stored level vs
painted shadow), 369 (a defined `overlay` is a level), 566 (the elevation
ladder) ·
**Number block:** 500–699 (`tokens-theme` overflow; `639`, `640` and `641` are
taken, so `642` is the next free number) ·
**Status:** done

## 1. The defect

`themeMetricFailures` validates every `ElevationShape` a level holds — finite
offsets, blur and spread, a non-negative blur and an alpha inside `0…1` — and
checks that `sm`/`md`/`lg` hold **at least one** shape. It never checks the
other end of the count. The native runtime paints one shadow per element, and
`elevationShadow` reads only the first entry:

```ts
export function elevationShadow(theme: Theme, level: ElevationLevel) {
  const [shape] = theme.elevation[level];
  return shape === undefined ? undefined : paint(theme, shape);
}
```

So a copied theme with two shapes silently loses the second:

```ts
const shape = {
  offsetX: 0,
  offsetY: 1,
  blurRadius: 2,
  spreadRadius: 0,
  alpha: 0.08,
};
const doubled = extendTheme(getTheme("light"), {
  elevation: { sm: [shape, { ...shape, offsetY: 2 }] },
});

themeMetricFailures(doubled); // []
themeFailures(doubled); // []
elevationShadow(doubled, "sm"); // only the first shape is painted
```

Every field of both shapes is finite and in range, so the metric check has
nothing to report; `elevation.test.ts` walks only the **shipped** themes, so the
copy is outside its guard. The documentation already tells the reader that a
second entry is discarded (`docs/tokens.md`: "A shipped level with two entries
would silently render only the first"), but a consumer's edited theme gets the
library's guarantee (`themeFailures` → `[]`) while painting half of what it
declared. This is the same class plan 641 closed for unusable bounds: a value
that is valid in isolation but that the runtime never uses.

The count is already a governed metric: an empty `sm`/`md`/`lg` reports
`{ rule: "at-least", actual: 0, bound: 1 }`. The missing half is the same count
held to `at-most 1`, which the existing `atMost` helper and `"at-most"` rule
express without a new rule, kind or public type.

## 2. Decision

For **every** level in `elevationLevels`, including the reserved `overlay`,
report a level that holds more than one shape as an `at-most` failure with the
shape count as `actual` and `1` as `bound`:

```ts
...atMost("elevation", level, shapes.length, 1),
```

The `member` is the level name (`sm`, `md`, `lg`, `overlay`), matching the
existing empty-level failure. A level with one shape or none passes this rule;
`sm`/`md`/`lg` keep their `at-least 1` rule, and `overlay` stays allowed to be
empty.

Not changed:

- **`elevationShadows`** — it remains the resolved list for a web renderer.
  The native contract now names a multi-entry level as a failure; the helper is
  not removed and its JSDoc keeps saying the native runtime paints only the
  first. The documentation will state that a multi-entry theme is outside the
  native guarantee.
- **the shipped themes** — plan 018 removed every multi-entry level, so no
  shipped value moves.
- **the feather ladder and the per-shape rules** — every shape in a reported
  level is still validated; the extra shape is reported because it never
  paints, not because its fields are malformed.
- **`elevationLevels` / `metricRules` / `metricMembers`** — no index or type
  changes; the count is a rule over an existing member.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | add the per-level `atMost` count rule in the elevation block; extend the `themeMetricFailures` elevation JSDoc |
| `packages/tokens/src/elevation-shape-count.test.ts` | new regression suite (header states the defect) |
| `packages/tokens/src/elevation-ladder.test.ts` | the "painted entry, not a later one" case already uses a two-entry level to prove the ladder reads the first; add the now-correct `at-most` failure to its exact list and a comment saying why |
| `docs/tokens.md` | name the rule in the Elevation section and in the metric-contract elevation bullet; update the elevation test paragraph |
| `docs/design-system.md` | name the rule in the § elevation paragraph |
| `packages/tokens/README.md` | name the rule in the Shadows section |
| `COMPONENTS.md` | add the rule to the **Theme metric check** row |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-642.md` | the audit note |

No other file. Do **not** change a shipped value, a colour, a pair, a floor, a
metric, a platform style, a recipe or a component.

## 4. `packages/tokens/src/metrics.ts`

In `themeMetricFailures`, the elevation block currently reads:

```ts
...elevationLevels.flatMap((level) => {
  const shapes = elevation[level];
  if (shapes.length === 0) {
    return level === "overlay"
      ? []
      : [failure("elevation", level, "at-least", shapes.length, 1)];
  }
  return shapes.flatMap((shape, index) => [
    ...nonNegative(
      "elevation",
      `${level}[${index}].blurRadius`,
      shape.blurRadius,
    ),
    ...fraction("elevation", `${level}[${index}].alpha`, shape.alpha),
  ]);
}),
```

Replace it with one block that always composes the count rules and the shape
rules:

```ts
...elevationLevels.flatMap((level) => {
  const shapes = elevation[level];
  return [
    ...(shapes.length === 0 && level !== "overlay"
      ? [failure("elevation", level, "at-least", shapes.length, 1)]
      : []),
    // The runtime paints one shadow per element and `elevationShadow`
    // reads the first entry; a second shape is geometry nothing paints.
    ...atMost("elevation", level, shapes.length, 1),
    ...shapes.flatMap((shape, index) => [
      ...nonNegative(
        "elevation",
        `${level}[${index}].blurRadius`,
        shape.blurRadius,
      ),
      ...fraction("elevation", `${level}[${index}].alpha`, shape.alpha),
    ]),
  ];
}),
```

Extend the `themeMetricFailures` JSDoc elevation bullet. It currently says each
of `sm`/`md`/`lg` holds a shadow, an empty `overlay` is exempt and a defined one
joins the rules. Add, after the count sentence:

> A level holds **at most one** shape: the native runtime paints one shadow per
> element and `elevationShadow` reads the first entry, so a second shape is
> geometry the theme declared and the runtime never paints. A copied web
> multi-shadow level is therefore reported by the native contract instead of
> silently returning `[]`; `elevationShadows` still resolves the list.

Do not reword the feather paragraph.

## 5. `packages/tokens/src/elevation-shape-count.test.ts`

Create the file with this header:

```ts
/**
 * Guards the defect plan 642 fixes: `themeMetricFailures` validated every shape
 * in an elevation level and required `sm`/`md`/`lg` to hold at least one, but
 * never reported a level holding a second shape. The native runtime paints one
 * shadow per element and `elevationShadow` reads the first entry, so a copied
 * theme with `elevation: { md: [a, b] }` returned `[]` from every check while
 * it painted `a` and silently discarded `b`. Every level, the reserved
 * `overlay` included, is now held to `at-most 1` shape; a single-shape level
 * and the shipped sets are unchanged.
 */
```

Imports: `describe`, `expect`, `it` from `vitest`; `elevationLevels` from
`./elevation.js`; `elevationShadow`, `extendTheme`, `getTheme`,
`themeFailures`, `themeMetricFailures`, `type ElevationShape` from `./index.js`;
`shippedThemes` from `./shipped-themes.js`.

Helpers:

```ts
const shape = (
  offsetY: number,
  blurRadius: number,
): ElevationShape => ({
  offsetX: 0,
  offsetY,
  blurRadius,
  spreadRadius: 0,
  alpha: 0.12,
});

const elevationFailures = (theme: ReturnType<typeof getTheme>) =>
  themeMetricFailures(theme).filter(
    (failure) => failure.group === "elevation",
  );
```

Cases:

1. **A second `md` shape is reported.** Override
   `elevation: { md: [shape(4, 12), shape(8, 24)] }`. Assert
   `elevationFailures(theme)` is exactly
   `[{ group: "elevation", member: "md", rule: "at-most", actual: 2,
   bound: 1 }]`.
2. **The second shape is the one that never paints.** On the same theme,
   assert `elevationShadow(theme, "md")` equals the shadow resolved from the
   first shape (compare `offsetY`, `blurRadius`), so the case states the harm as
   well as the report.
3. **The reserved `overlay` level is held too.** Override
   `elevation: { overlay: [shape(24, 56), shape(28, 64)] }`; assert the one
   `at-most` failure names `overlay`, and `elevationShadow(theme, "overlay")`
   is defined (the first entry), proving a defined level paints.
4. **A single shape stays clean.** Override `elevation: { md: [shape(4, 12)] }`;
   assert `elevationFailures(theme)` is `[]` and `themeFailures(theme)` is `[]`
   (the shape itself is valid).
5. **An empty `sm` keeps only its `at-least` diagnostic.** Override
   `elevation: { sm: [] }`; assert `elevationFailures(theme)` is exactly
   `[{ group: "elevation", member: "sm", rule: "at-least", actual: 0,
   bound: 1 }]` — no `at-most` for the same count.
6. **Three shapes report the count, not just "more than one".** Override
   `elevation: { lg: [shape(16, 40), shape(18, 44), shape(20, 48)] }`; assert
   `at-most` with `actual: 3`.
7. **A duplicated shape still counts.** Override
   `elevation: { sm: [shape(1, 2), shape(1, 2)] }`; assert one `at-most` with
   `actual: 2` — the rule is about the count the runtime discards, not about
   distinct geometry.
8. **The composed check tags it.** On the two-`md` theme, assert
   `themeFailures(theme).filter((failure) => failure.kind === "metric")`
   contains the `at-most` entry with `kind: "metric"` prepended.
9. **Every shipped set still passes.** `shippedThemes` returns `[]` from
   `themeMetricFailures` and every level of every shipped theme has at most one
   entry (`elevationLevels` walk).

Use `toBe`/`toEqual` with whole failure objects; do not assert a failure list
that includes unrelated failures — filter the `elevation` group.

### Proving both directions

1. On the pre-fix tree (`git stash push -- packages/tokens/src/metrics.ts`), run
   `cd packages/tokens && nub x vitest run src/elevation-shape-count.test.ts`:
   cases 1, 3, 6, 7 and 8 fail (they receive `[]` or a non-matching list);
   cases 2, 4, 5 and 9 pass — case 2 states the harm `elevationShadow` already
   paints, and 4, 5 and 9 are controls.
2. `git stash pop`, re-run the same command: all cases pass.
3. `nub run --filter @gpuixui/tokens test` → all suites green.

## 6. Documentation

### `docs/tokens.md` — Elevation section

The paragraph after the `elevationShadows` snippet currently ends:

> `elevationShadows` returns the resolved list. A shipped level with two entries
> would silently render only the first, so `packages/tokens/src/elevation.test.ts`
> fails if one appears, and `elevation-tint.test.ts` fails if editing
> `colors.shadow` stops retinting a level.

Append one sentence:

> The editable-theme contract applies the same count to every level: a theme
> that declares a second shape gets an `at-most` metric failure naming the
> level, because the native runtime paints only the first. `elevationShadows`
> still resolves a web renderer's list; such a theme is simply outside the
> native guarantee.

### `docs/tokens.md` — metric contract

In the elevation bullet (the paragraph beginning "and an elevation level must
hold a shadow whose alpha is a fraction…"), after "A level's **first** entry is
the shadow the runtime paints" insert:

> and a level may hold **only** that entry — a second shape is reported as
> `at-most`, because the runtime never paints it —

so the sentence reads “…paints, and a level may hold **only** that entry — a
second shape is reported as `at-most`, because the runtime never paints it — so
the defined levels in `elevationLevels` order …”. Do not change a table or a
figure.

### `docs/tokens.md` — elevation test paragraph

In "Elevation is held by `elevation.test.ts` and `elevation-tint.test.ts`…" add
that `elevation-shape-count.test.ts` holds the **editable** count:

> `elevation-shape-count.test.ts` holds an edited theme to the same one-entry
> rule, because the shipped guard alone never saw a copied level.

### `docs/design-system.md` — elevation paragraph

After "a shipped level carries at most one entry", append:

> The numeric contract enforces that count on an edited theme too — a second
> entry is reported as an `at-most` failure, because the runtime paints only
> the first.

The paragraph guard in `docs.test.ts` still requires "at most one entry" and
`elevationShadows`; keep both phrases.

### `packages/tokens/README.md` — Shadows

After "`elevationShadows` returns the resolved list for a renderer that
composites", append:

> A level with more than one entry is reported by `themeFailures` as an
> `at-most` metric failure, because the native runtime paints only the first.

### `COMPONENTS.md` — Theme metric check row

Find the sentence "an empty elevation level (the shipped `overlay`) is exempt,
while a defined one is checked because `elevationShadow` paints it". Append:

> A level holding a second shape is reported as `at-most` too — the native
> runtime paints one shadow per element and `elevationShadow` reads the first
> entry, so a copied web multi-shadow level is outside the native guarantee
> (plan 642).

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)" and tick:

```
`[x]` Report the second elevation shape the runtime never paints — the metric contract validated every shape in a level and required one, but never capped the count, so a copied theme with two shapes returned `[]` from every check while `elevationShadow` painted only the first; every level now holds at most one shape, every shipped set passes unchanged and no value moves (plan 642)
```

Bump `277/351` → `278/352`, keeping the ten-cell bar at `[████████░░]`.

### `.agents/slop/plans/README.md`

Add the table row after `641`:

```
| [642](./642-elevation-shape-count.md) | A level the runtime half-paints | F | 018, 085, 369, 566, 641 | done |
```

and a summary paragraph beside the other `tokens-theme` summaries.

## 7. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/elevation-shape-count.test.ts src/elevation-ladder.test.ts src/elevation.test.ts src/elevation-tint.test.ts src/elevation-contrast.test.ts`
   → every case passes.
3. `nub run --filter @gpuixui/tokens test` → all suites green.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 8. STOP conditions

Stop and report, do not improvise, if:

- a **shipped** theme fails the new rule — plan 018 removed every multi-entry
  level; a shipped failure is a data decision for the owner, not this unit;
- `elevation.test.ts` fails — the shipped one-entry guard must keep passing;
- `docs.test.ts` fails on a paragraph this plan edits because the new sentence
  contradicts a guard — adjust only the wording this plan owns, not the guard;
- the test needs a helper from outside `packages/tokens` — the suite must stay
  inside the package, like every other tokens guard;
- the rule would require removing or renaming `elevationShadows` — it must
  remain the web list; only the native contract grows;
- any colour, pair, floor, figure, dimension or shipped value would move — this
  unit moves none.

## 9. Acceptance

- A theme with a two-entry elevation level reports exactly one `at-most`
  failure naming that level, through both `themeMetricFailures` and
  `themeFailures` (tagged `metric`).
- The reserved `overlay`, when defined with two entries, is reported the same
  way; an empty `overlay` stays exempt; an empty `sm` keeps only its
  `at-least` diagnostic.
- A single-entry level, a duplicated second entry and a three-entry level
  behave as stated; a valid single-shape theme still returns `[]`.
- Every shipped identity theme, platform variant and recipe passes unchanged.
- The four documents name the rule, and the README, catalogue, design system
  and inventory cannot drift from the contract.
- The suite fails on the pre-fix tree (cases 1, 3, 6, 7 and 8) and passes
  after it; the shipped and single-shape controls prove the rule is not
  over-broad.
- `nub run check`, `nub run lint` and `nub run test` pass.

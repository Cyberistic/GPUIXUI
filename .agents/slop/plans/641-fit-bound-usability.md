# 641 — A fit bound that is no bound

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 358 (the metric contract), 521 (the inline icon fits its line),
522 (the inline avatar fits its row), 532 (one diagnostic per non-finite
metric) ·
**Number block:** 500–699 (`tokens-theme` overflow; `639` is the playground's
merge gate and `640` the components' colour swatch, so `641` is the next free
number in every worktree) ·
**Status:** done

## 1. The defect

`themeMetricFailures` compares a metric with a bound it reads from another
metric. `usableBound` exists for exactly one case: a bound that is zero,
negative or non-finite is already its own rule's diagnostic, so the dependent
fit must stay silent rather than blame the metric that fits inside it:

```ts
const usableBound = (bound: number): boolean =>
  Number.isFinite(bound) && bound > 0;
```

Plan 532 applied that rule to non-finite values, and the `atLeast` bounds that
read a scale use it. Three `atMost` fits never did:

| Rule | Actual | Bound | Where the bound comes from |
| ---- | ------ | ----- | -------------------------- |
| `iconSize.xs ≤ caption.lineHeight` | `iconSize.xs` | `typography.caption.lineHeight` | plan 521 |
| `iconSize.sm ≤ label.lineHeight` | `iconSize.sm` | `typography.label.lineHeight` | plan 521 |
| `avatarSize.xs ≤ density.rowHeight` | `avatarSize.xs` | `density.rowHeight` | plan 522 |

A negative or zero bound therefore reports the **correct** metric:

```ts
const clipped = extendTheme(getTheme("light"), {
  typography: { caption: { lineHeight: -1 } },
});
themeMetricFailures(clipped);
// [
//   { group: "typography", member: "caption.lineHeight", rule: "at-least", … },
//   { group: "iconSize", member: "xs", rule: "at-most", actual: 12, bound: -1 },
// ]
```

The second entry is false: `iconSize.xs` is the shipped 12 and nothing about
it changed. A consumer following the report would shrink a correct icon while
the line that broke stays broken. The same false report appears for
`caption.lineHeight: 0`, `label.lineHeight: -1`/`0` and `density.rowHeight:
-1`/`0`:

```ts
const crampedRow = extendTheme(getTheme("light"), {
  density: { rowHeight: -1 },
});
themeMetricFailures(crampedRow).filter((failure) => failure.group === "avatarSize");
// [{ group: "avatarSize", member: "xs", rule: "at-most", actual: 20, bound: -1 }]
```

`atMost` already skips a non-finite bound (`Number.isFinite(bound)`), which is
why plan 532 did not see this class; the finite pass was the only bound guard
it added. `usableBound` carries the zero and negative half and is already used
by `avatarPresenceDotSize`, the largest-corner bounds and the date-field width.

The shipped identity keeps `avatarSize.xs (20) ≤ rowHeight (32)`,
`iconSize.xs (12) ≤ caption.lineHeight (16)` and `iconSize.sm (14) ≤
label.lineHeight (18)`, and every platform style and recipe inherits or widens
those, so all 24 shipped sets pass before and after. No value, colour, pair,
floor or theme moves.

## 2. Decision

Guard the three fits with `usableBound`, exactly like the other dependent
bounds:

```ts
...(usableBound(typography.caption.lineHeight)
  ? atMost("iconSize", "xs", iconSize.xs, typography.caption.lineHeight)
  : []),
...(usableBound(typography.label.lineHeight)
  ? atMost("iconSize", "sm", iconSize.sm, typography.label.lineHeight)
  : []),
...(usableBound(density.rowHeight)
  ? atMost("avatarSize", "xs", avatarSize.xs, density.rowHeight)
  : []),
```

Not changed:

- **the fits themselves** — a usable bound still reports an icon or avatar that
  is genuinely taller than its line or row.
- **the sign and finite rules** — the broken line or row keeps its own
  diagnostic, including the `-Infinity` double report plan 532 documented.
- **the `atLeast` fits** — a negative bound there cannot false-report a
  positive actual; a negative actual is the same member's own defect.
- **`atMost` as a whole** — it stays finite-guarded; this is the zero/negative
  half.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | guard the three `atMost` fits with `usableBound`; extend the `usableBound` JSDoc with the inline tiers |
| `packages/tokens/src/fit-bound-usability.test.ts` | new regression suite (header states the defect) |
| `docs/tokens.md` | extend the diagnostic paragraph with the unusable-bound rule |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-641.md` | the audit note |

No other file. Do **not** change a shipped value, a pair, a floor, a metric, a
platform style or a component.

## 4. `packages/tokens/src/metrics.ts`

`usableBound` is defined before the two bound helpers. Extend its JSDoc after
“blaming the metric that fits inside it” with the classes it now covers:

> The same guard applies to a fit whose bound is a line or a row: an inline
> icon above a caption or label line, and an inline avatar above a dense row,
> are reported only when the line or row is itself a usable size.

Then wrap the three rules. They are the `atMost` calls near `iconSize` and
`avatarSize` (currently the rules whose comment says “An inline icon is painted
inside the line box” and “The `xs` tier is the inline avatar”). Keep the
comments and the order; only add the guard and its three closers.

## 5. `packages/tokens/src/fit-bound-usability.test.ts`

Create the file with this header:

```ts
/**
 * Guards the defect plan 641 fixes: `themeMetricFailures` compared
 * `iconSize.xs`/`sm` with a line height and `avatarSize.xs` with
 * `density.rowHeight` without asking whether that bound was a usable size. A
 * shipped-light theme with `caption.lineHeight: -1` (or `0`), `label.lineHeight:
 * -1` or `density.rowHeight: -1` reported the correct icon or avatar as an
 * `at-most` failure as well as the broken line or row, sending a consumer to
 * change a value that was already right. The three fits now read their bound
 * through `usableBound`, so only a usable line or row can judge the mark.
 */
```

Imports: `describe`, `expect`, `it` from `vitest`; `extendTheme`, `getTheme`,
`type Theme` from `./theme.js`; `themeFailures`, `themeMetricFailures`,
`type MetricFailure` from `./index.js`; `shippedThemes` from
`./shipped-themes.js`.

A helper:

```ts
const groupFailures = (theme: Theme, group: MetricFailure["group"]) =>
  themeMetricFailures(theme).filter((failure) => failure.group === group);
```

Cases:

1. **A negative caption line does not blame the caption icon.** Override
   `typography.caption.lineHeight: -1`; assert `groupFailures(theme, "iconSize")`
   is `[]` and the full result is exactly the one typography failure
   `{ member: "caption.lineHeight", rule: "at-least", actual: -1, bound: 12 }`.
2. **A zero caption line does not blame it either.** Same with `lineHeight: 0`
   and `actual: 0, bound: 12`; still no `iconSize` entry.
3. **A negative label line does not blame the label icon.** Override
   `typography.label.lineHeight: -1`; no `iconSize` entry; exactly the one
   `label.lineHeight` failure at `bound: 13`.
4. **A negative row does not blame the inline avatar.** Override
   `density.rowHeight: -1`; `groupFailures(theme, "avatarSize")` is `[]`; the
   `density.rowHeight` `positive` failure is present.
5. **A zero row does not blame it either.** Override `density.rowHeight: 0`;
   `groupFailures(theme, "avatarSize")` is `[]`; the `positive` failure is
   present.
6. **A usable line still reports a real overflow.** Keep the shipped icon and
   shrink the caption line to 10 (`caption: { fontSize: 9, lineHeight: 10 }`);
   the exact `atMost("xs", 12, 10)` failure remains. This is the guard's
   control case: it drops unusable bounds only.
7. **A usable row still reports a real overflow.** The shipped row 32 with
   `avatarSize.xs: 40` reports `atMost("xs", 40, 32)`.
8. **The composed check carries the same result.** For the negative-caption
   theme, `themeFailures` contains only the one `{ kind: "metric", … }` entry
   and no `avatarSize`/`iconSize` metric; for the negative-row theme it contains
   no `kind: "metric"` with `group: "avatarSize"`.
9. **Every shipped set still passes.** `shippedThemes` returns `[]` from
   `themeMetricFailures`.

Do not assert a whole failure list for the negative row: zero control height
and the row’s own two `at-least` fits are independent diagnostics, and plan 532
deliberately leaves negative signs as their own reports. Filter the group the
case is about.

### Proving both directions

1. On the pre-fix tree (`git stash push -- packages/tokens/src/metrics.ts`), run
   `cd packages/tokens && nub x vitest run src/fit-bound-usability.test.ts`:
   cases 1–5 and 8 fail (they receive the false `iconSize`/`avatarSize`
   entry); cases 6, 7 and 9 pass.
2. With the guards: all eight cases pass.
3. `nub run --filter @gpuixui/tokens test` → all suites green.

## 6. Documentation

### `docs/tokens.md`

The diagnostic paragraph currently ends:

> A value the `finite` rule rejects is not compared by a ladder or a bound, so a
> bad number is not blamed on its neighbour; a `NaN` is the finite rule's one
> diagnostic, while a `-Infinity` also fails a sign rule, because it is
> non-finite and negative — independent defects.

Append one sentence:

> A bound that is itself zero or negative is that metric's own sign
> diagnostic, so a fit does not blame the value inside it: an inline icon is
> judged only by a usable caption or label line, and an inline avatar only by a
> usable dense row (plan `641`).

No table, value or quoted figure changes, so `figures.ts`/`figures.test.ts` and
the derived tables are untouched.

### `TODO.md`

Add under “Design tokens and theming (`tokens-theme`)” and tick:

```
`[x]` Stop a broken line or row from blaming the mark that fits inside it — the three `atMost` fits (`iconSize.xs` against `caption.lineHeight`, `iconSize.sm` against `label.lineHeight`, `avatarSize.xs` against `density.rowHeight`) compared a zero or negative bound and reported the correct icon or avatar as well as the broken metric; all three now read their bound through `usableBound`, every shipped set passes unchanged and no value moves (plan 641)
```

Bump `276/350` → `277/351`, keeping the ten-cell bar at `[████████░░]`.

### `.agents/slop/plans/README.md`

Add the table row after `638`:

```
| [641](./641-fit-bound-usability.md) | A fit bound that is no bound | F | 358, 521, 522, 532 | done |
```

and a summary paragraph beside the other `tokens-theme` summaries.

## 7. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/fit-bound-usability.test.ts src/inline-icon-fit.test.ts src/inline-avatar-row-fit.test.ts`
   → every case passes.
3. `nub run --filter @gpuixui/tokens test` → all suites green.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 8. STOP conditions

Stop and report, do not improvise, if:

- a shipped theme fails after the guard — the bound was usable and a shipped
  icon/avatar genuinely overflows it; that is a design decision, not this unit;
- `inline-icon-fit.test.ts` or `inline-avatar-row-fit.test.ts` changes a real
  failure — the guard must not hide a usable-bound overflow;
- `themeMetricFailures` reports the broken line/row differently after the
  change — the sign and finite rules are out of scope;
- `docs.test.ts` fails on an unrelated guarded sentence — that is a baseline
  problem, not this unit;
- a test needs a negative `rowHeight` to assert a whole failure list — filter
  the group instead; plan 532 leaves each sign as its own report.

## 9. Acceptance

- A zero or negative `caption.lineHeight`, `label.lineHeight` or
  `density.rowHeight` reports only that metric's own failure, never the inline
  icon or avatar that fits inside it.
- A usable bound still reports a real overflow (the control cases).
- Every shipped identity theme, platform variant and recipe passes; no colour,
  pair, floor, metric or shipped theme value moves.
- The suite fails on the pre-fix tree (cases 1–5 and 8) and passes after it;
  cases 6, 7 and 9 prove the guard does not disable the fits.
- The catalogue names the rule; the plan, audit note and index are current.
- `nub run check`, `nub run lint` and `nub run test` pass.

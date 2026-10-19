# 621 — The time segment holds two digits

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 358 (the metric contract), 384 (a size that must fit must fit
the content box), 552 (every ladder walks the theme's own scale), 556 (the
calendar, time-segment and mark dimensions), 620 (the last landing plan) ·
**Number block:** 500–699 (`tokens-theme` overflow; 621 is free in every
worktree) ·
**Status:** done

## 1. The gap

`themeMetricFailures` holds `dimensions.timeSegmentWidth` to **one `body` em**:

```ts
...atLeast(
  "dimensions",
  "timeSegmentWidth",
  dimensions.timeSegmentWidth,
  typography.body.fontSize,
),
```

`TimePickerSegment` (`packages/components/src/time-picker.tsx`) paints an
`<input>` with `...textStyle(theme, "body")`, `padding: 0`, `textAlign:
"center"` and `width: SEGMENT_WIDTH` — and its value is the padded **two-digit**
`HH` / `MM` (`padSegment`, `time.ts`). The token comment, the catalogue table
row and `docs/tokens.md` §Component dimensions repeat the one-em rule
(`scale.ts` line 166, `docs/tokens.md` line 1088 and line 1121).

One em is roughly half of what two digits need. A copied platform style can
therefore raise the body role and keep a narrow segment while every check
returns `[]`:

| Theme | `body.fontSize` | `timeSegmentWidth` | Today | What the segment paints |
| ----- | --------------- | ------------------ | ----- | ----------------------- |
| shipped identity | 14 | 26 | passes (26 ≥ 14) | `HH` fits with slack |
| narrowed | 24 | 24 | **passes (24 ≥ 24)** | two 24px digits need ~28.8px |
| narrowed | 22 | 26 | **passes (26 ≥ 22)** | two 22px digits need ~26.4px |

The component already paints its own 26px literal (the migration is recorded in
`TODO.md`), so no shipped composition breaks today; the defect is in the
**guarantee** a brand is told to rely on. It is the same class plan 384 fixed
for a chip inside a field and plan 620 for a toast, inbox and menu row: a size
that must hold content must hold that content.

## 2. Decision

Hold `timeSegmentWidth` to **two tabular digits at a 0.65em advance**, rounded
up to the next whole pixel:

```
bound = Math.ceil(2 * digitAdvanceEm * typography.body.fontSize)
```

with one module constant in `metrics.ts`:

```ts
/**
 * A tabular digit advances at most 0.65em in the UI families the platform
 * styles name; two digits are 1.3em. The segment also carries a horizontal
 * half-pixel, so the bound rounds up to a paintable whole pixel.
 */
const digitAdvanceEm = 0.65;
```

Why 0.65em:

- The shipped UI faces (`SF`, Segoe UI, Ubuntu/Cantarell) advance a digit at
  about 0.55–0.60em; 0.65 leaves headroom for a wider installed face.
- It is a **ceiling**, not an exact metric: a theme that names a face with
  wider digits must widen its segment, exactly as a theme with a very tight
  leading must widen a field. The rule's JSDoc states that limit.
- Rounding up makes the bound a pixel a theme can write. Without `Math.ceil`,
  the body-24 bound is `31.200000000000003` and a theme that writes `31.2`
  fails a bound it computed itself.

At the shipped body role the bound is `Math.ceil(2 * 0.65 * 14) = 19`, so the
shipped `26` still passes (`26 / 19 = 1.37×`) and **no token value moves**.

Why not "two ems": two ems are safe for any face whose digits are at most 1em,
but they would demand 28 at the shipped body size and force every brand with a
22px body to paint a 44px segment — an over-constraint for a field that only
holds `HH`. The 1.3em estimate is the designed digit width; the JSDoc names the
font assumption instead of hiding it.

Why not `typography.body.lineHeight`: two digits are a width and a line box is a
height. It happens to work for the shipped leading (20px bound vs 26px), but a
theme may ship `lineHeight === fontSize` — which the contract allows — and the
bound would fall below the two digits it is meant to hold.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | add `digitAdvanceEm`; replace the one-em `timeSegmentWidth` rule; state the font assumption in the dimensions bullet of the `themeMetricFailures` JSDoc |
| `packages/tokens/src/time-segment-fit.test.ts` | create (new suite) |
| `packages/tokens/src/fixed-surface-metrics.test.ts` | update the case `"reports a time segment narrower than one body em"` — new title, new bound (19, not 14) |
| `docs/tokens.md` | the table row at line 1088 and the §Component dimensions sentence at line 1121 |
| `COMPONENTS.md` | one clause in the `Theme metric check` row's dimensions rationale |
| `TODO.md` | add one design-tokens row, tick it, bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |

No other file. Do **not** edit `packages/components` in this worktree.

## 4. `packages/tokens/src/metrics.ts`

Add the constant beside the other rule helpers, before the `themeMetricFailures`
documentation (for example after `easing` / before `weighable`, or next to
`usableBound`):

```ts
/**
 * A tabular digit advances at most 0.65em in the UI families the platform
 * styles name; a two-digit time segment is 1.3em. The bound rounds up because a
 * segment is painted at a whole pixel, and a theme that names a wider face must
 * widen its segment.
 */
const digitAdvanceEm = 0.65;
```

Replace the rule (currently after the calendar-cell rule):

```ts
// A time segment holds two body digits (`HH` or `MM`), so it is at least two
// tabular digits wide; one em showed barely one digit at a 24px body role. A
// zero or non-finite body size is its own rule's diagnostic, so the fit waits.
...(usableBound(typography.body.fontSize)
  ? atLeast(
      "dimensions",
      "timeSegmentWidth",
      dimensions.timeSegmentWidth,
      Math.ceil(2 * digitAdvanceEm * typography.body.fontSize),
    )
  : []),
```

In the `themeMetricFailures` JSDoc's **dimensions** bullet, replace “a time
segment is at least one body em wide” with “a time segment holds two body digits
(`HH`/`MM`), at a 0.65em tabular advance, rounded up”. Do not restate a shipped
pixel value there.

## 5. `packages/tokens/src/time-segment-fit.test.ts`

Header comment must state the bug being guarded:

> Guards the defect plan 621 fixes: `timeSegmentWidth` was held only to one
> `body` em, but a segment paints two digits (`HH`/`MM`), so a copied theme with
> a 24px body and a 24px segment passed every check while the segment could not
> show its own value.

Imports: `describe`, `expect`, `it` from `vitest`; `themeMetricFailures` and
`type MetricFailure` from `./metrics.js`; `shippedThemes` from
`./shipped-themes.js`; `extendTheme`, `getTheme`, `type Theme` from `./theme.js`;
`themeFailures` from `./theme-check.js`.

Helpers:

```ts
const base = getTheme("light");

/** Two tabular digits at the 0.65em advance, rounded up to a pixel. */
const segmentBound = (theme: Theme): number =>
  Math.ceil(2 * 0.65 * theme.typography.body.fontSize);

const dimensionFailures = (theme: Theme): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(theme).filter(({ group }) => group === "dimensions");
```

Cases:

1. **`passes every shipped set`** — for every `{ theme }` of `shippedThemes`,
   assert `theme.dimensions.timeSegmentWidth >= segmentBound(theme)` and collect
   `dimensionFailures(theme)`; expect `[]`. Track the tightest headroom
   (`timeSegmentWidth / segmentBound`) and expect it to be `toBeCloseTo(1.37, 2)`
   (26 / 19).
2. **`states the shipped bound`** — `segmentBound(base)` is `19`; the shipped
   segment is `26`.
3. **`reports a segment narrower than two digits`** — raise the body role to
   `24`/`32` and set `timeSegmentWidth: 24`. Expect exactly one dimensions
   failure: `member: "timeSegmentWidth"`, `rule: "at-least"`, `actual: 24`,
   `bound` close to `32`.
4. **`fits exactly at the derived bound`** — body `20`/`28` (bound exactly 26)
   with `timeSegmentWidth: 26` → `[]`; body `22`/`30` (bound 29) with the same
   segment → one failure, actual 26, bound 29. This proves the bound reads the
   theme's own body role instead of a hardcoded number.
5. **`carries the failure through the total check`** — the case-3 theme through
   `themeFailures`, filtered to `kind === "metric"`, has exactly the one
   `timeSegmentWidth` member.
6. **`reports nothing when the body role shrinks`** — body `12`/`18` with the
   shipped 26 → `[]`; the bound falls to 16, so a narrow body does not
   manufacture a failure.

Use `toMatchObject` plus `expect(failure.bound).toBeCloseTo(…, 5)` for the
fractional/rounded bounds; never compare the whole object to a float literal.

## 6. `packages/tokens/src/fixed-surface-metrics.test.ts`

The existing case at line 99 encodes the old rule:

```ts
it("reports a time segment narrower than one body em", () => {
  const themed = extendTheme(lightTheme, { dimensions: { timeSegmentWidth: 12 } });
  expect(themeMetricFailures(themed)).toEqual([
    { group: "dimensions", member: "timeSegmentWidth", rule: "at-least", actual: 12, bound: lightTheme.typography.body.fontSize },
  ]);
});
```

Rename it `"reports a time segment narrower than two digits"` and change
`bound: lightTheme.typography.body.fontSize` to `bound: 19`. Keep the theme
(segment 12) — it is still below both the old and the new bound, so the case
continues to prove the rule exists. Do not duplicate the new suite's cases here.

## 7. Documents

`docs/tokens.md` line 1088, the table row:

```md
| `dimensions.timeSegmentWidth` | 26 | hours or minutes segment of a time field; at least 1.3 `body` ems (two tabular digits), rounded up to a pixel |
```

`docs/tokens.md` line 1121, the §Component dimensions sentence: replace “a time
segment holds two body digits, so it is at least one `body` em wide” with “a
time segment holds two body digits (`HH`/`MM`), so it is at least 1.3 `body`
ems wide — two tabular digits at a 0.65em advance, rounded up to a whole pixel —
and a theme that names a face with wider digits must widen it.”

`COMPONENTS.md`, the `Theme metric check` row: after the calendar-cell clause,
add “a time segment fits the two digits it paints (1.3 body ems, rounded up)”.
Keep the row's existing sentence shape; do not add a count.

`TODO.md`: add one row to the design-tokens section, before the closing
cross-team rows:

```md
`[x]` Hold the time segment to the two digits it paints — `timeSegmentWidth`
was checked against one `body` em, so a copied theme with a 24px body and a
24px segment returned `[]` while the `HH`/`MM` value it edits could not be
shown; the bound is 1.3 body ems (two tabular digits at a 0.65em advance),
rounded up, and every shipped 26px segment still passes at 19 (plan 621)
```

Bump the section's progress count and bar by one (the section is `263/335`
today; the row makes it `264/336` — re-read the current numbers before editing
and keep them consistent).

## 8. Commands and expected results

1. `nub run --filter @gpuixui/tokens test` before any edit →
   **164 files / 6,074 tests passed** (the baseline observed on 2026-10-19).
2. Create `src/time-segment-fit.test.ts` **before** the rule; from
   `packages/tokens`, run `nub x vitest run src/time-segment-fit.test.ts`.
   Expected: **3 failed / 3 passed** — the raised-body, narrow-segment and
   total-check cases fail (the rule is absent), while the shipped pass, shipped
   bound and exact-bound cases pass because 26 already clears the old one-em
   rule. Record the exact counts before continuing.
3. Add the rule and the constant; rerun the same command → **6 passed**.
4. Update `fixed-surface-metrics.test.ts`; run
   `nub x vitest run src/fixed-surface-metrics.test.ts src/time-segment-fit.test.ts`
   → both files green.
5. `nub run --filter @gpuixui/tokens test` → **165 files / 6,080 tests** (the
   six new cases; the updated case replaces one, so the test count grows by
   six). If the count differs, explain why before committing.
6. `nub run check` → `check:tests`, lint, format and type-check green.
7. `nub run lint` → green.
8. `nub run test` → the same file/test total as step 5.

Both directions: after step 5, run
`git stash push -- packages/tokens/src/metrics.ts` and rerun the new suite →
the three cases fail again; `git stash pop` → green.

## 9. STOP conditions

- **A shipped set fails the new bound.** The shipped segment is 26 and the bound
  is 19; if any shipped theme fails, stop — a value would have to move, which
  this plan does not authorise.
- **`TimePickerSegment` no longer paints two digits or `padding: 0`.** Re-read
  `packages/components/src/time-picker.tsx` (lines ~350–410) and
  `time-picker/time.ts` (`padSegment`). If the component changed, stop and
  re-derive the bound; do not guess.
- **The 0.65em assumption is contradicted.** If a shipped sans family is known
  to advance digits above 0.65em, stop and raise the constant with evidence
  instead of shipping a bound the shipped face exceeds.
- **`fixed-surface-metrics.test.ts` has more than the one old-rule case.** Only
  the one-em case may change; any other change means the audit was incomplete —
  stop and report.
- **A command must edit a path outside §3.** Stop; the consumer migration is a
  cross-team row, not this plan.
- **A gate fails for a reason unrelated to this change.** Stop, record the
  exact output, and do not paper over it.

## 10. Acceptance criteria

- `themeMetricFailures` reports `timeSegmentWidth` when it cannot hold two
  digits at the theme's own body size, and the failure carries the derived
  bound (19 at the shipped body 14).
- The new suite proves the pre-fix pass and the post-fix failure in both
  directions.
- Every shipped theme, platform variant and recipe still passes `themeFailures`.
- No token value moves; no colour, pair, floor, metric other than the new rule,
  or consumer file changes.
- `docs/tokens.md` and `COMPONENTS.md` state the rule without a hand-written
  figure; `TODO.md` and the plan index are current; all gates in §8 are green.

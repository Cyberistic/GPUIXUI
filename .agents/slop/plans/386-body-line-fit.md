# Plan 386 — the smallest field must fit a body line

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the package), 353 (component dimensions), 358 (the numeric contract), 360
(the finite pass), 367 (the type-scale contract), 384 (content-box fit).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`themeMetricFailures` holds the smallest control to one **label** line:

```ts
...atLeast(
  "density",
  "controlHeight.sm",
  density.controlHeight.sm,
  typography.label.lineHeight + 2 * borderWidth.thin,
),
```

That is the bound a Button needs. It is **not** the bound every control needs: a
field paints the **body** role, not the label role. In
`packages/primitives/src/core/style.ts`:

- `fieldTextStyle` sets `fontSize`, `lineHeight` and `fontWeight` from
  `theme.typography.body` for `Input`, `TextArea`, `Select` and every field;
- `otpCellStyle` spreads `controlStyle` and then overrides the same three
  members from `theme.typography.body`;
- `controlStyle` fixes the box at `theme.density.controlHeight[size]`, whose
  borders are painted **inside** the height.

So a `size="sm"` field is `controlHeight.sm` tall, has a content box
`controlHeight.sm - 2 * borderWidth.thin` tall, and paints a `body` line box
inside it. The subject is the same one plan 384 fixed for glyphs and chips: a
size that must fit must fit the **content box**.

A probe on this branch (`extendTheme(getTheme("light"), { typography: { body:
{ fontSize: 14, lineHeight: 30 } } })`) returns **0 failures** while the shipped
`controlHeight.sm` is 28 with a 26px content box — a 30px body line in a 26px
box, clipped on every small input. The shipped `rowHeight` is 32, so the existing
`rowHeight >= body.lineHeight` rule passes and nothing else sees it:

| check | failures for the probe theme |
| ----- | ---------------------------- |
| `themeColorFailures` | 0 |
| `themeTypefaceFailures` | 0 |
| `themeContrastFailures` | 0 |
| `themeMetricFailures` | **0** |

A brand that enlarges its body text — the natural edit — can make every small
field clip while the guarantee the package teaches returns `[]`.

## 2. Decision

1. **One bound, not two failures.** Do not add a second `atLeast` for the same
   member: a theme that fails both the label and the body bound would report
   `controlHeight.sm` twice with two different bounds. The member is one box, so
   the rule is one bound:

   ```ts
   Math.max(typography.label.lineHeight, typography.body.lineHeight) +
     2 * borderWidth.thin
   ```

   A failure then names the requirement the theme actually missed.
2. **No new rule name.** The failure is still `at-least` on
   `density/controlHeight.sm`, so `metricRules` stays the same nine values and
   every diagnostics table, index and count in the docs stays true.
3. **No shipped value moves.** Every shipped set is `controlHeight.sm` 24
   (compact platform styles) or 28 (identity/comfortable) against a body line of
   20 + 2 = 22, so the new bound passes everywhere. The probe and the
   shipped-set loop in §3.5 prove it.
4. **The docs state both lines.** The catalogue, the design system, the package
   README and the ledger all say "one label line"; a field holds body type, so
   each says so.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

Replace the density label bound (currently the `atLeast` block that ends
`typography.label.lineHeight + 2 * borderWidth.thin`) with:

```ts
    // A control is not always a label: a field paints the body role, so the
    // smallest box has to fit the taller of the two line boxes. Both are
    // painted inside the two borders.
    ...atLeast(
      "density",
      "controlHeight.sm",
      density.controlHeight.sm,
      Math.max(typography.label.lineHeight, typography.body.lineHeight) +
        2 * borderWidth.thin,
    ),
```

and update the `themeMetricFailures` JSDoc bullet **density** (currently “the
smallest control fits one label line, the default icon and a field adornment
plus its two borders”) to “the smallest control fits one label line **and one
body line — a field paints body type** — the default icon and a field adornment,
each plus its two borders”.

### 3.2 `packages/tokens/src/metrics.test.ts`

The case `reports a smallest control that cannot fit its label` uses
`controlHeight.sm: 19`; the bound becomes the body line (20) + 2 = 22:

- rename the case to `reports a smallest control that cannot fit its label or a body line`;
- change its expected `bound: 20` to `bound: 22`;
- keep `actual: 19`.

No other case in the file compares against the old bound (the icon case at
`controlHeight.sm: 24` still fits the new 22 bound and reports only its icon
failure; the coverage case only reads `group`).

### 3.3 `packages/tokens/src/metrics.example.ts`

Add one executed example at the end:

```ts
/**
 * A body line taller than the smallest field: the colour, typeface and contrast
 * checks are empty, and the numeric one names the clipped `sm` control.
 */
export const crampedField = extendTheme(getTheme("light"), {
  typography: { body: { fontSize: 14, lineHeight: 30 } },
});
export const crampedFieldFailures = themeMetricFailures(crampedField);
```

### 3.4 `packages/tokens/src/body-line-fit.test.ts` (new)

Header comment names the bug guarded: *“Before plan 386 the numeric contract held
`controlHeight.sm` to one `label` line only, while `fieldTextStyle` and
`otpCellStyle` paint the `body` role inside the same box; a theme with
`body.lineHeight` 30 returned `[]` from every check while a 26px content box
clipped a 30px line on every small field.”*

Cases:

1. **`reports a body line taller than the smallest field`** — the
   `crampedField` example (or the same `extendTheme` inline) returns exactly:
   `{ group: "density", member: "controlHeight.sm", rule: "at-least", actual: 28, bound: 32 }`.
2. **`fits a body line exactly in the content box`** — `lineHeight: 26` on the
   shipped 28px control with two 1px borders → `[]`; `lineHeight: 27` → one
   failure with `bound: 29`. This proves the two borders are subtracted, the
   plan-384 standard.
3. **`the bound is the taller of the label and the body line`** — raise
   `label.lineHeight` to 30 and leave body at 20 → one failure with
   `bound: 32`; raise body instead → the same bound; raise neither → `[]`.
4. **`is invisible to the other checks`** — the cramped theme returns `[]` from
   `themeColorFailures`, `themeTypefaceFailures` and `themeContrastFailures`, and
   `themeFailures` returns exactly one `kind: "metric"` entry. This is the
   plan-383 proof that a partial check cannot see it.
5. **`passes every shipped set`** — the same shipped-set list the other contract
   suites build: `themeModes × themeContrasts`, real
   `platformNames × themeModes`, and `platformRecipeNames × themeModes`; expect
   `[]` for each.
6. **`runs the executed example`** — `crampedFieldFailures` is exactly the
   failure from case 1.

### 3.5 `docs/tokens.md`

In the numeric-contract paragraph, change

> the smallest control must fit one `label` line, the default `iconSize.md` and
> a field adornment, each plus its two borders

to

> the smallest control must fit one `label` line **and one `body` line — a field
> paints body type, not the label role** — plus the default `iconSize.md` and a
> field adornment, each plus its two borders

so the sentence states the rule and the reason in one place.

### 3.6 `docs/design-system.md` §9

Change

> shrink the smallest control below one label line plus its borders

to

> shrink the smallest control below one label line or one body line plus its
> borders

### 3.7 `packages/tokens/README.md`

Change

> shrink the smallest control below one label line

to

> shrink the smallest control below one label line or one body line

### 3.8 `COMPONENTS.md` — **Theme metric check** row

Change

> shrink the smallest control below one label line plus its borders

to

> shrink the smallest control below one label line or one body line plus its
> borders

No count changes: the row names ten groups and nine rules, both unchanged.

### 3.9 `TODO.md` and `.agents/slop/plans/README.md`

- Add and tick, in the design-tokens section, phrased as the defect:
  `[x]` *Hold the smallest field to a body line — `controlHeight.sm` was held to
  one label line while `fieldTextStyle` and `otpCellStyle` paint the body role in
  the same box, so a theme with a 30px body line returned `[]` from every check
  while a 26px content box clipped a small field (plan 386)*.
- Add plan 386 to the index table with status `done` and a one-paragraph summary
  in the prose block.

## 4. Test plan and both directions

Commands, from the workspace root:

1. `nub run --filter @gpuixui/tokens test` — every suite green, including
   `body-line-fit.test.ts`.
2. `nub run check` — exit 0.
3. `nub run lint` — exit 0.
4. `nub run fmt` — exit 0 (run `nub run fmt:fix` first if it reports).

**Direction 1 — the rule can fail.** Temporarily revert the bound in
`metrics.ts` to `typography.label.lineHeight + 2 * borderWidth.thin` and run
`nub exec vitest run src/body-line-fit.test.ts` from `packages/tokens`. Expect
case 1, the 27px half of case 2, the body half of case 3 and case 4 to fail;
restore and re-run: green.

**Direction 2 — the shipped values pass it.** With the fix in place, run the
same test file; the `passes every shipped set` case must be green. A shipped
value that fails means the plan's assumption is wrong (STOP, do not move a token
to satisfy the check).

Record the exact command output in the commit message; do not claim a run that
did not happen.

## 5. STOP conditions

Stop and report, without improvising, if:

- any shipped identity theme, platform variant or recipe fails the new bound —
  record which set and its `controlHeight.sm` / `body.lineHeight`, and do not
  change a shipped value without a new plan;
- the probe shows `themeMetricFailures` already returns the failure — the gap is
  smaller than described and the plan needs re-scoping;
- another suite asserts the old bound of 20 (grep `bound: 20`,
  `controlHeight.sm`); update only the expectation that states this rule, and
  report any other case whose meaning changed;
- `themeFailures` cannot surface the new failure as `kind: "metric"` (the
  composition changed beyond this plan);
- a gate fails for a reason outside the files in §3 — report it.

## 6. Acceptance criteria

- `themeMetricFailures` reports a `body.lineHeight` that does not fit
  `controlHeight.sm` minus its two borders, and the bound is the taller of
  `label.lineHeight` and `body.lineHeight` plus both borders.
- The shipped sets still return `[]`; no colour, family, pair, floor or token
  value moves.
- The new suite proves the rule can fail, the content-box subtraction, the
  label/body maximum, the other checks' blindness to it, and the executed
  example.
- The catalogue, the design system, the README and the ledger all state the body
  line; no document still says only a label line.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

None. The rule reads the `Theme` only. `primitives` already paints body type in
a field and needs no change; a consumer theme with a very large body line starts
failing its own `themeFailures` assertion, which is the point.

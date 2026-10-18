# Plan 554 — Every surface metric is a size, and every border is a width

**Workstream:** `tokens-theme`
**Phase:** F (metric-contract completeness)
**Depends on:** 358 (the numeric contract), 360 (ungoverned numeric members),
531 (the finite pass walks the group value), 530 (the dimension members),
552 (the ladders walk the theme's own scale)
**Status:** ready

## 1. Why

`themeMetricFailures` is documented as total: "every surface metric is
positive" (`metrics.ts`), and `docs/tokens.md` says the check holds "the
numbers a component paints with … to the invariants those components rely on".
Plan 552 closed half of the gap between that promise and the code: the **ladder**
rules now walk the theme's own scale object, so a step a brand adds is compared.

The **sign** rules did not get the same treatment. Plan 552's own audit note
(`.agents/slop/rd/2026-10-19-tokens-next-548.md`, candidate 3) recorded the
remaining half:

- the eighteen `positive("dimensions", …)` calls name the shipped members by
  hand;
- `borderWidth` names exactly `thin` (non-negative) and `strong` (positive).

`finiteGroup` walks each group value (plan 531), so a member a theme adds is
finite-checked. But it is never sign-checked, and `extendTheme` keeps a member
it does not know. Probe against this branch (run as a temporary test; deleted
after recording):

```ts
const widened = { ...dimensions, extraSurface: 0 };
const theme = extendTheme(getTheme("light"), { dimensions: widened });

themeMetricFailures(theme); // [] — a zero-pixel surface metric

const widerBorder = { ...borderWidth, hairline: -1 };
extendTheme(getTheme("light"), { borderWidth: widerBorder });
// [] — a negative border width
```

Both results contradict the documented rule. A copied or decoded platform
style (the copy-and-own path the whole contract exists for) can ship a zero or
negative dimension or width while `themeFailures` returns `[]` — the same class
of defect plans 531/547–549/552 removed one list at a time.

A dimension is a pixel size a component paints inside a fixed box: a zero width
or height paints nothing. A border width is a stroke; zero is a deliberate
borderless design (the shipped `thin` already allows it), but a negative stroke
is not a width. `strong` additionally stays positive because it is the focus
ring's spread.

## 2. What changes

### 2.1 `packages/tokens/src/metrics.ts` — walk the theme's own dimensions

Inside `themeMetricFailures`, replace the eighteen hand-typed
`positive("dimensions", "<member>", dimensions.<member>)` calls with one walk
over the theme's own object, placed where the first of them stands (immediately
after `finiteGroup("dimensions", dimensions)`):

```ts
    // Every surface metric is a pixel size a component paints inside a fixed
    // box, so a theme that adds one is held to the same rule as the shipped
    // members. `extendTheme` copies the group, so the walk sees the arrived
    // member in the order the theme holds it.
    ...scaleSteps(dimensions).flatMap(([member, value]) =>
      positive("dimensions", member, value),
    ),
```

Keep every relational rule that follows (`overlayMaxHeight` fits a row,
`fieldMinWidth` fits a chip, the three drawer ladders, the keycap line, the
carousel mark, the chat viewport). Those name members because the rule relates
two metrics, not because it is a completeness list. Keep `finiteGroup` where it
is.

`scaleSteps` already exists (plan 552) and uses `numericMembers`, which returns
`[name, number]` pairs and ignores non-numbers.

### 2.2 `packages/tokens/src/metrics.ts` — every border width is non-negative

Replace:

```ts
    ...nonNegative("borderWidth", "thin", borderWidth.thin),
```

with a walk that excludes `strong`, whose own `positive` rule is stricter and
would otherwise report one value twice:

```ts
    ...scaleSteps(borderWidth)
      .filter(([member]) => member !== "strong")
      .flatMap(([member, value]) => nonNegative("borderWidth", member, value)),
```

Leave `positive("borderWidth", "strong", …)` and the `strong >= thin` rule
unchanged. The filter names `strong` because it is the one member with a
stricter rule — exactly like plan 552's `radius.none`/`full` filter — not a
completeness list.

### 2.3 `packages/tokens/src/metrics.ts` — the JSDoc bullets

In the `themeMetricFailures` doc block:

- **borderWidth** bullet: say every width is non-negative and `strong` is
  positive, so a width a theme adds keeps the shape rule.
- **dimensions** bullet: say every surface metric is positive, including one a
  theme adds; the walk reads the theme's own group.

Keep the existing reason sentences. No new house-style claim.

### 2.4 New test — `packages/tokens/src/dimension-sign-totality.test.ts`

Header comment states the bug being guarded, with the probe: a theme carrying
an extra dimension or border width is finite-checked but never sign-checked, so
`themeMetricFailures` returned `[]` for `{ ...dimensions, extraSurface: 0 }` and
`{ ...borderWidth, hairline: -1 }`, while the JSDoc and the catalogue promise
every surface metric is positive and a negative stroke is not a width.

Use the public entry (`./index.js`) and a spread variable (a fresh object literal
would be excess-property checked; a spread variable reaches the checker the way
a decoded or copied style does — no cast, no `any`).

Cases:

1. **extra dimension, zero** — `{ ...dimensions, extraSurface: 0 }` reports
   exactly `{ group: "dimensions", member: "extraSurface", rule: "positive",
   actual: 0, bound: 0 }`.
2. **extra dimension, negative** — `extraSurface: -4` reports the same failure
   with `actual: -4`.
3. **named dimension, zero** — `{ ...dimensions, toastWidth: 0 }` still reports
   `toastWidth`, proving the derived walk kept the shipped member.
4. **extra border width, negative** — `{ ...borderWidth, hairline: -1 }` reports
   exactly `{ group: "borderWidth", member: "hairline", rule: "non-negative",
   actual: -1, bound: 0 }`.
5. **extra border width, zero** — `hairline: 0` returns `[]`: a borderless width
   is a design, and the walk must not raise it to positive.
6. **shipped sets** — `shippedThemes.every(({ theme }) =>
   themeMetricFailures(theme).length === 0)`.

Each extra-member case asserts the whole array with `toEqual`, so a duplicate
diagnostic (for example non-negative plus positive on one value) fails the test.

### 2.5 `docs/tokens.md` — one sentence in the numeric contract

In the metric-contract paragraph (§ *Checking a theme*, around the sentence
that ends "`borderWidth.strong` is the focus ring's spread, so it may equal the
default border but never be thinner than a divider …"), add one sentence:

> Every surface metric in `dimensions` is a positive size and every border
> width is non-negative, both read from the theme's own group, so a dimension or
> width a copied style adds is held to the same rule; only `strong` must stay
> above zero, because it is the ring's spread.

Do not add a member list; the table above already owns the shipped names.

### 2.6 `packages/tokens/README.md` — one clause in *Checking the numbers*

After "ship a non-finite spacing step, radius, type size or dimension the
renderer casts to a 32-bit float", add:

> , a zero or negative surface dimension or a negative border width (a zero
> `thin` is a borderless design),

so the sentence stays one list.

### 2.7 `COMPONENTS.md` — the `Theme metric check` row

After the sentence naming the ten groups, add one clause: "every surface
dimension is a positive size and every border width non-negative, each read
from the theme's own group, so a member a copied style adds is held too
(plan 554)". Do not repeat a count.

### 2.8 `TODO.md` and the plan index

- Add and tick under "Design tokens and theming":
  "Hold every surface metric to a sign — the positive dimensions and the
  non-negative width were hand-named, so a theme carrying an extra dimension of
  0 or an extra border of -1 was finite-checked and returned `[]` while the
  contract promised every surface metric is positive; both now walk the theme's
  own group, with `strong` keeping its stricter rule (plan 554)."
- Re-count the progress bar: 219 done of 284 (218 + 1). Do not quote a figure
  before counting.
- Add plan 554 to `.agents/slop/plans/README.md` after 553 with status `done`,
  and append one commentary paragraph in the voice of 546–553.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS — 136 files, 5,675 tests at the time of writing. Stop if red.
2. Add §2.4 **before** §2.1–2.2 and run only the file:
   ```sh
   cd packages/tokens && nub exec vitest run src/dimension-sign-totality.test.ts
   ```
   Expected: FAIL on cases 1, 2, 3 and 4 — the checker returns `[]` for the
   extra member and still passes a zero named dimension (case 3 actually passes
   on the pre-fix code, because `toastWidth` is in the hand list; run it to
   confirm the walk keeps it, and note that it is a regression guard rather than
   a failing direction). Record the real output.
3. Implement §2.1–2.3, re-run the file:
   ```sh
   cd packages/tokens && nub exec vitest run src/dimension-sign-totality.test.ts
   ```
   Expected: PASS, 6 tests.
4. Whole package:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, one more file and six more tests than the baseline.
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
   Expected: empty. This plan changes no colour, metric, platform style or
   recipe value.
7. Commit and push:
   ```sh
   git add -A
   git commit -m "fix(tokens): hold every surface metric and border width to a sign"
   git push origin agent/tokens-theme
   ```

## 4. STOP conditions

Stop and report instead of improvising if:

- `scaleSteps` cannot walk `dimensions` or `borderWidth` without a cast — it is
  typed `unknown` and already walks every group value;
- a shipped theme, platform variant or recipe reports a new failure after the
  change (its value would be a real finding; do not silence it by editing the
  rule away);
- one value is reported twice (for example a negative `strong` producing both a
  non-negative and a positive failure) — the filter in §2.2 must prevent it;
- an existing `metrics`, `metric-members`, `metric-rule-index`,
  `finite-metrics`, `scale-ladder-totality` or `dimensions` case changes result;
- the extra-member cases need a type assertion to compile — the spread variable
  avoids one; a cast is not acceptable;
- the package was already red before the change for reasons outside this
  workstream.

## 5. Acceptance

- A theme carrying `{ ...dimensions, extraSurface: 0 }` or
  `{ ...borderWidth, hairline: -1 }` is reported by `themeMetricFailures`, with
  the member, rule and value named.
- A zero extra border width stays valid, and the shipped `thin: 1` is unchanged.
- All shipped themes, platform variants and recipes still return `[]`.
- The new test fails without §2.1–2.2 and passes with them.
- No dimension or border value moves.
- `docs/tokens.md`, the package README, `COMPONENTS.md`, `TODO.md` and the plan
  index are current.
- `nub run check`, `nub run lint`, `nub run test` pass.

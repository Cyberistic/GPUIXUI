# 646 — A metric must survive the renderer's 32-bit cast

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 358 (the metric contract), 360 (finite elevation geometry),
364 (finite motion), 368 (the finite walk), 531 (member completeness), 532
(non-finite diagnostics), 641 (usable bounds), 643 (mark stroke floor) ·
**Number block:** 500–699 (`tokens-theme` overflow; `644` is owned by
`components`, `645` is the last plan, so `646` is the next free) ·
**Status:** done

## 1. The defect

Plan 368's `finite` rule promises "the numeric half" of the editable-theme
guarantee: a metric that the renderer cannot paint is reported. Its evidence is
the pinned runtime's own warning:

> A typo can hand us NaN, a negative size, or a value that **overflows `f32` to
> infinity**. Any of those turn into invalid Taffy geometry and gpui renders
> nothing at all, with no error to explain it.
> (`references/gpuix/packages/native/src/theme.rs`, `Metrics::apply`)

The style path does no such guard. Every metric a component paints reaches GPUI
through an unchecked cast:

```rs
if let Some(p) = style.padding {
    el = el.p(gpui::px(p as f32));
}
```

(`references/gpuix/packages/native/src/renderer.rs`)

The contract checks `Number.isFinite(value)`, which is true for a JavaScript
number far beyond `f32`'s range. Rust's `as f32` then rounds it to **infinity**,
Taffy rejects the geometry, and the element paints nothing — the exact failure
the rule exists to catch, still returning `[]`. A probe on the shipped light
theme (2026-10-19) confirmed it:

```ts
const huge = 1e39; // finite in JS, far beyond f32::MAX ≈ 3.4028235e38

themeMetricFailures(extendTheme(getTheme("light"), { spacing: { "5xl": huge } })); // []
themeMetricFailures(extendTheme(getTheme("light"), { radius: { full: huge } })); // []
themeMetricFailures(extendTheme(getTheme("light"), { borderWidth: { strong: huge } })); // []
themeMetricFailures(extendTheme(getTheme("light"), { iconSize: { xl: huge } })); // []
themeMetricFailures(extendTheme(getTheme("light"), { dimensions: { toastWidth: huge } })); // []
themeMetricFailures(extendTheme(getTheme("light"), {
  typography: { display: { fontSize: huge, lineHeight: huge } },
})); // []
themeMetricFailures(extendTheme(getTheme("light"), {
  elevation: { md: [{ offsetX: 0, offsetY: huge, blurRadius: 12, spreadRadius: -2, alpha: 0.12 }] },
})); // []
```

The mirror case is a positive size that **underflows** the cast: `Math.fround`
of `1e-50` is `0`, so a `caption.fontSize` of `1e-50` passes `positive` and
paints text at size zero. The same `as f32` produces it.

A huge value also cascades: `density.rowHeight: 1e39` makes four dependent bounds
(`overlayMaxHeight`, `notificationListMaxHeight`, `chatViewportMinHeight` and the
drawer height) report `at-least`, blaming the rows and surfaces for the one
broken number — against the contract's own rule that a value the `finite` rule
rejects is not compared by a ladder or a bound.

## 2. Decision

Define one predicate for "the renderer can paint this number" and use it
everywhere the contract already used `Number.isFinite`.

### 2.1 `packages/tokens/src/metrics.ts`

Beside `finite`, add:

```ts
/**
 * The renderer's own number. GPUix receives a metric as a JavaScript `f64` and
 * casts it to the `f32` GPUI lays out with (`renderer.rs`: `px(value as f32)`),
 * so a value beyond `f32`'s range becomes an infinity Taffy rejects and a
 * positive value below its smallest subnormal becomes zero. `Math.fround` is
 * that cast, so this is the predicate the contract means by "paintable".
 */
const paints = (value: number): boolean => Number.isFinite(Math.fround(value));
```

Then:

- **`finite`** — report a value `paints` rejects:
  ```ts
  const finite = (group, member, actual) =>
    paints(actual) ? [] : [failure(group, member, "finite", actual, 0)];
  ```
- **`positive`** — judge the painted value, so a positive metric that the cast
  rounds to zero is still a size that paints nothing:
  ```ts
  Math.fround(actual) <= 0 ? [failure(group, member, "positive", actual, 0)] : []
  ```
  `Infinity`/`NaN` stay silent here (their `finite` diagnostic is the cause),
  because `Math.fround(Infinity) <= 0` and `Math.fround(NaN) <= 0` are both
  false.
- **`non-negative`** — judge the painted value too: `Math.fround(actual) < 0`.
  A negative subnormal paints `-0` (a zero width), so it is not a negative
  stroke.
- **`atLeast` / `atMost`** — replace both `Number.isFinite(...)` guards with
  `paints(...)`, so an unpaintable actual keeps its one `finite` diagnostic and
  an unpaintable bound is not compared.
- **`ladder`** — replace `!Number.isFinite(value)` / `!Number.isFinite(previous[1])`
  with `!paints(...)`.
- **`usableBound`** — `paints(bound) && bound > 0`, so a huge row, line or
  control is its own `finite` diagnostic and does not blame the inline icon,
  avatar or fixed surface that fits inside it.
- **`extremeSize`** — exclude a value that does not `paint` from the theme's
  largest/smallest, so a huge avatar or control cannot invent a `radius.full`
  bound.
- **`orderedScale`** — treat an unpaintable step like an unpaintable neighbour:
  it cannot establish an order, so the scale yields no extreme (its `finite`
  failure is the diagnostic).

Update the `themeMetricFailures` JSDoc's final paragraph: `finite` means finite
**after the renderer's `f32` cast**, and a positive size that rounds to zero is
the `positive` rule's diagnosis.

No new rule, group, export or function; no shipped value, colour, pair, floor or
metric moves (every shipped metric is a small positive integer).

## 3. Exact files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/646-f32-metric-range.md` | this plan |
| `packages/tokens/src/metrics.ts` | `paints`; update `finite`, `positive`, `nonNegative`, `atLeast`, `atMost`, `ladder`, `usableBound`, `extremeSize`, `orderedScale`; extend the JSDoc |
| `packages/tokens/src/f32-metric-range.test.ts` | new regression suite |
| `docs/tokens.md` | extend the *Numeric metrics* `finite` paragraph with the f32 cast and the underflow case |
| `docs/design-system.md` | extend §11's `finite` sentence the same way |
| `packages/tokens/README.md` | extend *Checking the numbers*' non-finite clause |
| `COMPONENTS.md` | add the clause to the **Theme metric check** row |
| `TODO.md` | add and tick the row; bump the tokens section counter and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary paragraph |
| `.agents/slop/rd/2026-10-19-tokens-next-646.md` | the audit note |

No other file. **Do not** touch a component, primitive, docs app, platform style
or shipped value.

## 4. `packages/tokens/src/f32-metric-range.test.ts`

Header:

```ts
/**
 * Guards the defect plan 646 fixes: the numeric contract checked
 * `Number.isFinite`, which is true for a JavaScript number beyond `f32`'s
 * range. The renderer casts every metric with `value as f32`
 * (`renderer.rs`), so `1e39` became an infinity Taffy rejects and the element
 * painted nothing while every check returned `[]`; `1e-50` became zero, so a
 * positive text size painted nothing while `positive` passed. A huge
 * `density.rowHeight` also cascaded into four dependent bounds that blamed the
 * rows and surfaces. Every case below returns `[]` on the pre-fix tree and the
 * named failure after it.
 */
```

Imports: `describe`, `expect`, `it` from `vitest`; `themeMetricFailures` from
`./metrics.js`; `shippedThemes` from `./shipped-themes.js`; `themeFailures` from
`./theme-check.js`; `extendTheme`, `getTheme` from `./theme.js`.

Constants (derived, not shipped values):

```ts
const f32Max = 3.4028234663852886e38; // the largest finite f32
const overflow = 3.4028236e38;        // the next f32 is infinity
const underflow = 1e-50;              // Math.fround(1e-50) === 0
```

Cases:

1. **Every shipped theme still clears the check** — iterate `shippedThemes`,
   assert `themeMetricFailures(theme)` is `[]`.
2. **The largest finite `f32` is paintable** — `extendTheme(getTheme("light"),
   { radius: { full: f32Max } })` returns `[]` (`full` has no upper bound and is
   excluded from the radius ladder).
3. **One past it is reported** — the same theme at `overflow` returns exactly
   one `{ group: "radius", member: "full", rule: "finite", actual: overflow,
   bound: 0 }`.
4. **Every group's overflow is one `finite` failure** — a table of (group,
   member, value) for a last-in-ladder member of each group:
   `spacing["5xl"]`, `borderWidth.strong`, `iconSize.xl`, `avatarSize.lg`,
   `dimensions.toastWidth`, `typography.display.fontSize`,
   `typography.display.lineHeight`, `elevation.md[0].offsetY`,
   `motion.slow`. Each theme returns exactly one failure naming that member with
   `rule: "finite"`.
5. **A huge dependent bound does not blame its neighbours** — 
   `density.rowHeight: overflow` returns **one** `finite` failure for
   `rowHeight` and no `at-least` failure for `overlayMaxHeight`,
   `notificationListMaxHeight`, `chatViewportMinHeight` or `drawerHeightSm`.
   Build the assertion by filtering the returned list, not by hardcoding a
   count of every rule.
6. **A huge type size does not invert a ladder** — `typography.body.fontSize`
   and `body.lineHeight` both set to `overflow` produce two `finite` failures
   (one per member) and no `non-decreasing` failure for `label`/`caption`.
7. **A huge avatar does not invent a corner bound** —
   `avatarSize.lg: overflow` returns one `finite` failure and no `at-least`
   failure for `radius.full`.
8. **A positive size that rounds to zero is not a size** — 
   `typography.caption.fontSize: underflow` returns one
   `{ group: "typography", member: "caption.fontSize", rule: "positive",
   actual: underflow, bound: 0 }`.
9. **The total check tags it `metric`** — the `borderWidth.strong` overflow
   theme's `themeFailures(theme)` contains one entry with `kind: "metric"` and
   `group: "borderWidth"`.

Every expectation computes its value or names a derived member; no shipped
value is hardcoded. The test itself must fail on the pre-fix tree (cases 3–9)
and pass after the change.

## 5. Documents

- `docs/tokens.md`, *Numeric metrics*: after "must be a **finite** number too",
  state that the cast is part of the rule — a value beyond `f32` becomes the
  infinity Taffy rejects, so `1e39` is reported, and a positive size that rounds
  to zero is reported as `positive`; keep the walking/member sentences.
- `docs/design-system.md` §11: the same two sentences in the `finite`
  paragraph.
- `packages/tokens/README.md`, *Checking the numbers*: change "ship a non-finite
  spacing step, radius, type size or dimension the renderer casts to a 32-bit
  float" to name both halves — a value that overflows the cast and a positive
  value that rounds to zero.
- `COMPONENTS.md`, **Theme metric check** row: append "hold a metric that
  overflows the renderer's `f32` cast to `finite`, and a positive size that
  rounds to zero to `positive`, so `1e39` and `1e-50` cannot paint nothing
  silently (plan 646)".
- `TODO.md`: add the row under *Design tokens and theming* and tick it; change
  the section counter from `280/354` to `281/355` and keep the bar at eight
  filled cells.
- `.agents/slop/plans/README.md`: the table row after `645` and a summary
  paragraph after `645`'s.
- `.agents/slop/rd/2026-10-19-tokens-next-646.md`: the probe table, the renderer
  evidence, the underflow case, what was not changed.

## 6. Commands and expected results

Run in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

```sh
nub run --filter @gpuixui/tokens test -- f32-metric-range
```

Expected after the fix: the new file passes. Before the fix: cases 3–9 fail
(record that as the both-directions proof).

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check:tests
nub run check
nub run lint
nub run test
```

Expected: clean. If another workstream's package fails for its own reason,
record the exact failure and do not claim this plan's workspace gate passed.

## 7. STOP conditions

Stop and report with evidence if:

- a shipped theme gains a failure — the shipped metrics are small integers, so
  the predicate or a guard is wrong; do not move a value;
- fixing the cascade requires reading a new theme field or editing a consumer;
- `Math.fround` is not the runtime's cast (re-check `renderer.rs` `px(… as f32)`
  before implementing; if the value reaches GPUI as `f64`, the rule is wrong);
- a new test cannot fail on the pre-fix tree for a reason other than the
  intended rule (for example another rule also fires);
- a docs guard (`docs.test.ts`, `readme.test.ts`, `snippets.test.ts`) rejects a
  sentence this plan edits in a way the plan did not anticipate.

## 8. Acceptance

- [ ] `finite` means "finite after the renderer's `f32` cast", and a positive
      size that rounds to zero is `positive`.
- [ ] Every probe in §1 is reported with one diagnostic; the cascade cases
      report only the broken member.
- [ ] Every shipped theme, platform variant and recipe still returns `[]`.
- [ ] `f32-metric-range.test.ts` states the regression and fails on the pre-fix
      tree.
- [ ] The four documents and the ledger row describe the rule the code enforces.
- [ ] The plan is indexed; the TODO row is ticked; the counter is current; the
      commands in §6 were run and their results recorded in the commit message.

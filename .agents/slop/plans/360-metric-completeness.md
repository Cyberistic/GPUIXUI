# Plan 360 — the numeric contract's last ungoverned members

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:** 358
(the metric contract), 077 (`alpha` and `NaN`), 353 (`theme.dimensions`), 359.

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

Plan 358 shipped `themeMetricFailures(theme)` as "the numeric half" of the
editable-theme guarantee. It governs ten groups, and the promise is that an
edited theme cannot carry a number the components cannot paint with. Two numeric
members escape it, and a probe on the shipped light theme shows both returning
`[]`:

```ts
// offsetX: NaN — themeMetricFailures returns [], elevationShadow hands the
// runtime a shadow with offsetX: NaN:
elevationShadow(theme, "md") // { offsetX: NaN, offsetY: 4, blurRadius: 12, spreadRadius: -2, color: "#191D251F" }

// blurRadius: Infinity — []
// spreadRadius: NaN   — []

// controlHeight.md = 40, controlHeight.lg = 44 (ladder valid), rowHeight = 32:
themeMetricFailures(theme) // []
```

The second case is the one a reader hits first: `packages/components/src/list.tsx`
paints every row at `density.rowHeight`, and the default control the row holds is
`md` (`packages/primitives/src/core/style.ts` `controlStyle` takes a `ControlSize`
whose callers default to `"md"`). Raise `controlHeight.md` above `rowHeight` in an
edited theme and every action, checkbox or badge inside a list, table, menu or tree
row clips — with the checker silent.

Every shipped set happens to satisfy both relations (`rowHeight ===
controlHeight.md` in all three density presets — 28/32/36 — and every elevation
geometry field is finite), so this plan moves **no token value**.

## 2. Decision

Add two rules to the existing contract; no new group, no new public function, no
colour or pair change.

1. **`finite`** — a new `MetricRule`. `Number.isFinite` on `offsetX`, `offsetY`,
   `blurRadius` and `spreadRadius` of every elevation shape. A `NaN` or infinite
   geometry field is not a number the renderer can paint, so the level paints
   nothing; nothing else reports it. `blurRadius` keeps its `non-negative` rule as
   well (a negative blur is invalid even when finite).
2. **row fits the control** — `atLeast("density", "rowHeight", rowHeight,
   controlHeight.md)`, beside the existing `rowHeight >= body.lineHeight` rule.

Rejected alternatives, with reasons:

- **`non-negative` for the offsets/spread** — wrong. A negative `offsetY` lights a
  shadow from below and a negative `spreadRadius` insets it; the shipped
  `lightElevation` already ships `spreadRadius: -2, -8, -12`. Only *finite* is a
  breakage invariant.
- **`rowHeight >= controlHeight.sm`** — too weak to ever fire: every shipped set
  has `rowHeight === controlHeight.md > controlHeight.sm`, so the rule would pass
  in the exact edit it exists to catch (raising `md`).
- **A strict density ladder or `rowHeight > controlHeight.md`** — rejected by plan
  358's own precedent: the shipped presets use equality, and equality is a valid
  design ("a row is exactly one default control tall").
- **A runtime validator on `extendTheme`** — the package deliberately keeps
  `extendTheme` total and side-effect free; the contract is a test-time check a
  consumer runs (plan 358 §"No runtime schema"). Do not change that.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

**a.** Add `finite` to `MetricRule` (keep the existing order, insert after
`zero`):

```ts
export type MetricRule =
  | "positive"
  | "non-negative"
  | "zero"
  | "finite"
  | "increasing"
  | "non-decreasing"
  | "at-least"
  | "at-most"
  | "within";
```

**b.** Add the helper beside `zero` / `atLeast`:

```ts
/**
 * A value the renderer can paint. `NaN` and the infinities are numbers no
 * `StyleDesc` accepts, so a shadow carrying one paints nothing — the same
 * silent loss as the zero focus-ring spread, one metric group over.
 */
const finite = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  Number.isFinite(actual) ? [] : [failure(group, member, "finite", actual, 0)];
```

**c.** In the `elevation` block of `themeMetricFailures`, replace

```ts
            ...nonNegative(
              "elevation",
              `${level}[${index}].blurRadius`,
              shape.blurRadius,
            ),
            ...fraction("elevation", `${level}[${index}].alpha`, shape.alpha),
```

with

```ts
            ...finite("elevation", `${level}[${index}].offsetX`, shape.offsetX),
            ...finite("elevation", `${level}[${index}].offsetY`, shape.offsetY),
            ...finite(
              "elevation",
              `${level}[${index}].blurRadius`,
              shape.blurRadius,
            ),
            ...nonNegative(
              "elevation",
              `${level}[${index}].blurRadius`,
              shape.blurRadius,
            ),
            ...finite(
              "elevation",
              `${level}[${index}].spreadRadius`,
              shape.spreadRadius,
            ),
            ...fraction("elevation", `${level}[${index}].alpha`, shape.alpha),
```

**d.** In the `density` group, beside the existing `rowHeight` rule, add:

```ts
    ...atLeast(
      "density",
      "rowHeight",
      density.rowHeight,
      density.controlHeight.md,
    ),
```

**e.** Update the `themeMetricFailures` JSDoc bullet list:

- **density**: "…a row fits one body line **and the default `md` control**."
- **elevation**: "`sm`/`md`/`lg` each hold a shadow whose alpha is a fraction,
  whose blur is non-negative, and whose offsets, blur and spread are finite."

### 3.2 `packages/tokens/src/metrics.test.ts`

Add two cases beside "reports an elevation alpha the colour helper cannot parse".
Both must fail without §3.1 and pass with it (see §4).

```ts
  it("reports elevation geometry the renderer cannot paint", () => {
    const broken = extendTheme(lightTheme, {
      elevation: { md: [{ ...mdShape, offsetX: Number.NaN }] },
    });
    const failures = themeMetricFailures(broken);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.group).toBe("elevation");
    expect(failures[0]?.member).toBe("md[0].offsetX");
    expect(failures[0]?.rule).toBe("finite");
    expect(failures[0]?.actual).toBeNaN();

    // A negative offset and spread are directions, not breakage: the shipped
    // light level already ships a negative spread.
    expect(
      failuresOf({
        elevation: {
          md: [
            { ...mdShape, offsetX: -4, offsetY: -2, spreadRadius: -8 },
          ],
        },
      }),
    ).toEqual([]);

    // An infinite blur is finite-checked and sign-checked once each.
    const infinite = failuresOf({
      elevation: { md: [{ ...mdShape, blurRadius: Number.POSITIVE_INFINITY }] },
    });
    expect(infinite.map(({ member, rule }) => `${member}:${rule}`)).toEqual([
      "md[0].blurRadius:finite",
    ]);
  });

  it("reports a row shorter than the default control", () => {
    // The ladder stays valid (sm 28 < md 40 < lg 44) and the row still fits a
    // body line (20), so the only broken rule is the control it holds.
    expect(
      failuresOf({
        density: { controlHeight: { md: 40, lg: 44 }, rowHeight: 32 },
      }),
    ).toEqual([
      {
        group: "density",
        member: "rowHeight",
        rule: "at-least",
        actual: 32,
        bound: 40,
      },
    ]);
  });
```

Also extend "passes the identity theme and the executed example" with the new
executed example from §3.3:

```ts
    expect(stretchedFailures).toHaveLength(1);
```

(The existing case already asserts `ringlessFailures` has length 1.)

### 3.3 `packages/tokens/src/metrics.example.ts`

Append the documented row case, so the prose in §3.4 is backed by an executed
example (the package convention from plan 350: every `*.example.ts` is imported
by a suite — `metrics.test.ts` already imports this file):

```ts
/**
 * A density that raises the default control above the row that holds it: the
 * colour check is empty, and the numeric one names the clipped row.
 */
export const stretched = extendTheme(getTheme("light"), {
  density: { controlHeight: { md: 40, lg: 44 }, rowHeight: 32 },
});
export const stretchedFailures = themeMetricFailures(stretched);
```

### 3.4 `docs/tokens.md` — "Numeric metrics"

In the paragraph that starts "The rules are breakage tests…":

- change "the smallest control must fit one `label` line plus its two borders; a
  row must fit one `body` line;" to "…; a row must fit one `body` line **and the
  default `md` control it holds**;"
- change "and an elevation level must hold a shadow whose alpha is a fraction,
  because `alpha()` falls back to the opaque tint on a value it cannot parse." to
  "and an elevation level must hold a shadow whose alpha is a fraction (because
  `alpha()` falls back to the opaque tint on a value it cannot parse) **and whose
  two offsets, blur and spread are finite — a negative offset or spread is a
  direction, a `NaN` is a shadow the renderer cannot paint.**"

Update the `MetricRule` sentence at the end of the subsection to include
`finite`:

> A `MetricRule` is one of `positive`, `non-negative`, `zero`, `finite`,
> `increasing`, `non-decreasing`, `at-least`, `at-most` or `within`.

### 3.5 `docs/design-system.md` — "The floors are the colour half"

Extend the list of silent failures:

> … clip a type role's leading, shrink the smallest control below one label line
> plus its borders, **clip a row below the default control it holds**, round a
> "square" corner, invert a named size ladder, ship a zero-width surface metric,
> **hand the renderer a non-finite shadow offset** or hand `elevationShadow` an
> alpha the colour helper cannot parse …

### 3.6 `COMPONENTS.md` — the **Theme metric check** row

In the sentence that enumerates what an edited theme cannot do, add the two new
guarantees without disturbing the phrases the inventory guard requires
(`${metricGroups.length} groups`, every group name, `themeMetricFailures(theme)`,
"only focus indicator", "**Theme contrast check**"):

> … shorten a role's leading below its size, shrink the smallest control below one
> label line plus its borders, **clip a row below the default `md` control it
> holds**, round a "square" `radius.none`, invert a named ladder, ship a zero-width
> surface metric **or a non-finite shadow offset** or an elevation alpha outside
> `0…1`.

### 3.7 `.agents/slop/plans/README.md`

- Add the row to the `tokens-theme` table:

```
| [360](./360-metric-completeness.md) | The numeric contract's last ungoverned members | F | 077, 353, 358, 359 | done |
```

- Add a closing paragraph after plan 359's, in the same voice, stating: the probe,
  the two rules, that no shipped value moves, and that `finite` is the new rule.

### 3.8 `TODO.md`

- Add one ticked row under "Design tokens and theming (`tokens-theme`)", in the
  existing voice, naming the two gaps, the probe evidence, the new rule and the
  fact that no value moved.
- Update the section progress bar from `127/177` to `128/178` (one `[x]` added).

---

## 4. Test plan and both directions

The repo's `scripts/verify-two-directions.sh` drives `jj`, which is not installed
on this box (PLAN D1). Prove both directions with git instead.

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/metrics.test.ts)
# EXPECT: the two new cases FAIL (the old source returns [] where a failure is
# expected); no other case fails.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/metrics.test.ts)
# EXPECT: every case passes.
```

A case that passes in the first run means it does not guard the fix — STOP and
rewrite it.

Then the full gate:

```sh
nub run --filter @gpuixui/tokens test
# EXPECT: all files pass (currently 73 files / 4277 tests; +2 cases).
nub run check
nub run lint
```

Expected: `check` reports "every test asserts something", oxlint and oxfmt clean,
`tsc --noEmit` clean for `packages/tokens` and `packages/deploy`; `lint` clean.

Also confirm the docs claims the plan edits are still internally consistent:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts src/inventory.test.ts src/metrics.test.ts
# EXPECT: all pass. `docs.test.ts` guards the numeric tables and the
# design-system claims; `inventory.test.ts` guards the ledger row.
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe fails a new rule (that would mean
  a shipped value must move, which this plan explicitly forbids);
- any existing `metrics.test.ts` case gains a second failure because of the new
  `rowHeight` rule (the plan verified the current cases keep exactly one failure;
  a new one means the rule is placed or expressed wrongly);
- `themeMetricFailures` needs a signature change, a new group, or a runtime
  `extendTheme` check — the plan's decision is test-time only;
- `docs.test.ts` or `inventory.test.ts` rejects an edit in §3.4–§3.6 (re-read what
  the guard requires before rewording; do not delete a guarded phrase);
- `nub run check` or `nub run lint` fails for a reason outside these files.

## 6. Acceptance criteria

- `themeMetricFailures(extendTheme(getTheme("light"), { elevation: { md: [{ …,
  offsetX: NaN }] } }))` returns one `elevation`/`md[0].offsetX`/`finite` failure.
- A negative offset/spread still returns `[]`.
- `controlHeight.md: 40, lg: 44, rowHeight: 32` returns one
  `density`/`rowHeight`/`at-least (bound 40)` failure while the ladder and body
  line rules stay satisfied.
- Every shipped theme, platform variant and recipe still returns `[]`.
- The two docs pages and the ledger row state both rules; `docs.test.ts`,
  `inventory.test.ts` and the full `@gpuixui/tokens` suite pass.
- The two new cases fail on the pre-fix `metrics.ts` (proven with §4's git
  commands) and pass after it.
- No token value, colour pair, floor, platform style or recipe changes; no path
  outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. The change is entirely inside this workstream's paths. No consumer
migration is implied: both rules describe invariants the shipped consumers already
satisfy.

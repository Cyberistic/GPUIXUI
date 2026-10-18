# Plan 523 — a control's horizontal padding is a shape, not a number

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the package), 089 (density merges size by size), 358 (the numeric
contract), 368 (a metric must be finite), 372 (a named size is a positive size),
384 (fit the content box, not the outer metric), 517 (a fixed surface holds its
line).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`scale.ts` defines the density metric every control paints its label inside:

```ts
/** Density-dependent control metrics. Spacing and type are unaffected. */
export interface Density {
  /** Preset name, or the base preset name for a partially overridden density. */
  readonly name: DensityName;
  /** Control and input height per size. */
  readonly controlHeight: Readonly<Record<ControlSize, number>>;
  /** Horizontal control padding per size. */
  readonly controlPaddingX: Readonly<Record<ControlSize, number>>;
  /** Table, list, menu and tree row height. */
  readonly rowHeight: number;
}
```

Every other density member has a floor derived from a real composition:

- `controlHeight.*` is a non-decreasing ladder plus `atLeast` the taller of the
  label and body line (plan 386) and the default icon and field adornment, each
  plus its two borders (plan 384);
- `rowHeight` is positive, holds one body line and the default `md` control
  (plan 360);
- `controlPaddingX.*` is a non-decreasing, non-negative ladder — **and nothing
  else**. No rule requires it to paint.

The value is the inset between a control's label and the border the control
paints *inside its own box*: `internal/button.tsx`, `field.tsx`, the pagination
item and every field paint `controlPaddingX(theme, size)` as `paddingLeft` and
`paddingRight`, and a field's clear glyph sits `fieldAdornmentSize` from the
edge. A zero token therefore puts every labelled control's glyph on its own
border, and a negative one — which the ladder already rejects — would paint it
outside the control.

A probe on this branch returns `[]` from all six checks:

```ts
const flush = extendTheme(getTheme("light"), {
  // The whole ladder moves together to zero, so ordering is untouched.
  density: { controlPaddingX: { sm: 0, md: 0, lg: 0 } },
});
```

| check | failures for the probe theme |
| ----- | ---------------------------- |
| `themeColorFailures` | 0 |
| `themeTypefaceFailures` | 0 |
| `themeContrastFailures` | 0 |
| `themeTextTierFailures` | 0 |
| `themeDirectionFailures` | 0 |
| `themeMetricFailures` | **0** |

A second probe shows the same hole one step below the shipped minimum:

```ts
const tight = extendTheme(getTheme("light"), {
  density: { controlPaddingX: { sm: 1, md: 1, lg: 1 } },
});
// themeMetricFailures(tight) === []
```

`spacing` is documented as *"shared by padding, margin and gap"*, and its own
smallest step — the hairline `spacing["2xs"]`, documented as "optical spacing
around text and borders" — is 2px in the identity. A control inset tighter than
the theme's own hairline is not a tighter control; it is a label painted on a
border.

This is the density half of the rule plan 372 shipped for the icon and avatar
ladders ("a named size is a positive size") and plan 517 shipped for a fixed
surface ("a keycap holds its caption line"): a number a component paints with
must be able to paint.

## 2. The rule

In `themeMetricFailures`'s `density` group:

1. the `controlPaddingX` ladder takes the `positive` step rule (plan 372's
   pattern), so a zero or negative inset is reported as `positive`;
2. each `controlPaddingX.<size>` is `atLeast` the theme's own hairline,
   `spacing["2xs"]`, so a theme cannot claim a control inset tighter than the
   smallest padding its own spacing scale defines. The bound is the theme's
   value, not a house literal — the same way plans 365, 386, 517 and 521 read
   the theme's own row, line box and caption leading.

Together the two rules make a zero inset report both `positive` and `at-least`
(the way a zero `rowHeight` already reports `positive` plus its two `at-least`
bounds), and a 1px inset report only `at-least`. Every shipped theme, platform
variant and recipe ships 6–14px, so no value moves.

The density group's own description and the `ladder` helper's JSDoc must say
so: the ladder's zero-is-a-design exemption currently names spacing and radius
only, and "a named icon or avatar size is a shape" gains the control inset.

## 3. Exact changes

### 3.1 `packages/tokens/src/metrics.ts`

1. **Module doc**, the **density** bullet (around line 302): after "sizes and
   padding are ladders", state that a control's horizontal padding stays
   positive and no tighter than the theme's own hairline (`spacing["2xs"]`),
   because it is the inset between the label and the border painted inside the
   same box.

2. **`ladder` JSDoc** (around line 198): the `stepRule` paragraph currently
   reads "A spacing step or a radius may be zero — a borderless or square theme
   is a design — while a named icon or avatar size is a shape that must paint,
   so those two ladders ask for `positive`." Change the last clause to name the
   density padding too, e.g. "…while a named icon or avatar size, or a control's
   horizontal padding, is a size that must paint, so those ladders ask for
   `positive`."

3. **The `controlPaddingX` ladder** (around line 438): pass `"positive"` as the
   fourth argument:

   ```ts
   ...ladder(
     "density",
     controlSizes.map(
       (size) =>
         [`controlPaddingX.${size}`, density.controlPaddingX[size]] as const,
     ),
     "non-decreasing",
     "positive",
   ),
   ```

4. **Directly after it**, add the hairline bound:

   ```ts
   // A control paints its label `controlPaddingX` inside its own border, and
   // the spacing scale is shared by padding, so an inset tighter than the
   // theme's own hairline puts the glyph on the edge.
   ...controlSizes.flatMap((size) =>
     atLeast(
       "density",
       `controlPaddingX.${size}`,
       density.controlPaddingX[size],
       spacing["2xs"],
     ),
   ),
   ```

5. **Delete the duplicated comment** at the `finiteMembers("radius", …)` call
   (currently lines 521–523): the three lines repeat the inline-avatar comment
   that already sits above `atMost("avatarSize", "xs", …)` and describe no rule
   there.

Do not touch `controlHeight`, `rowHeight`, the chip rule or any colour.

### 3.2 `packages/tokens/src/control-padding.example.ts` (new)

Follow `inline-avatar.example.ts`: a complete, documented example the suite
executes (plan 350's rule that every `*.example.ts` is imported by a test).

```ts
/**
 * A density whose controls paint their labels on their own border: the colour,
 * typeface, contrast, hierarchy and direction checks are empty, and the numeric
 * one names the flush inset. The whole padding ladder moves together, so the
 * order rule stays satisfied and the only defect is the inset.
 */
import { extendTheme, getTheme, themeMetricFailures } from "./index.js";

export const flushControls = extendTheme(getTheme("light"), {
  density: { controlPaddingX: { sm: 0, md: 0, lg: 0 } },
});
export const flushControlFailures = themeMetricFailures(flushControls);
```

### 3.3 `packages/tokens/src/padding-fit.test.ts` (new)

Header comment states the bug being guarded (plan 523 §1) and names the probe.
Cases:

- `flushControlFailures` equals the six expected failures in the order the
  contract emits them — the three `positive` failures from the ladder, then the
  three `at-least` failures:

  ```ts
  const flush = (size: string): MetricFailure[] => [
    { group: "density", member: `controlPaddingX.${size}`, rule: "positive", actual: 0, bound: 0 },
    { group: "density", member: `controlPaddingX.${size}`, rule: "at-least", actual: 0, bound: 2 },
  ];
  ```

  (Build the array with `controlSizes.flatMap`; assert with `toEqual`.)
- a 1px inset reports only `at-least` (the hairline is 2 in the identity);
- the bound is the theme's own hairline: a theme with `spacing: { "2xs": 4 }`
  and the shipped 6px `sm` still passes, while a 3px `sm` under that theme
  reports `at-least (3, 4)`;
- a negative inset is reported (the ladder's `positive`, not only the ordering);
- the failure is invisible to the other five checks and reaches `themeFailures`
  as `{ kind: "metric", … }` (mirror `inline-avatar-row-fit.test.ts`'s final
  case);
- every `shippedThemes` entry passes `themeMetricFailures` (`theme.name` as the
  assertion message).

### 3.4 Documentation

- **`docs/tokens.md`** — the metric-contract section (the paragraph beginning
  "The rules are breakage tests"): in the ladder sentence, add that a control's
  horizontal padding must stay above zero and at least the theme's own hairline,
  `spacing["2xs"]`, because it is the inset between the label and the border
  painted inside the same box.
- **`docs/design-system.md` §6** — after "Components read
  `controlHeight(theme, size)` and `controlPaddingX(theme, size)` instead of
  hardcoding numbers.", add: "A control's horizontal padding is a shape: it
  stays positive and at least the theme's own hairline (`spacing["2xs"]`),
  because it is the only space between the label and the border the control
  paints inside its own box — a zero inset renders the glyph on the edge, and
  the numeric contract reports it."
- **`packages/tokens/README.md`** — the metric paragraph (around line 585) gains
  the same clause in one sentence.
- **`COMPONENTS.md`** — the **Theme metric check** row: add "a flush control
  inset" to the list of defects the contract reports, and cite plan 523 at the
  end (`… (plan 523).`).

Add a `docs.test.ts` case for the new §6 sentence (the existing
"states the icon-to-label gap" case is the model) so the claim cannot drift:
build the sentence from `spacing["2xs"]`.

### 3.5 `TODO.md`

Add and tick, under "Design tokens and theming":

> `[x]` Hold a control's horizontal padding to a paint — `controlPaddingX` was
> the only density metric with no floor: `extendTheme(light, { density: {
> controlPaddingX: { sm: 0, md: 0, lg: 0 } } })` returned `[]` from all six
> checks while every labelled control painted its glyph on its own border. The
> ladder now asks for `positive` and each size is `atLeast` the theme's own
> hairline (`spacing["2xs"]`); every shipped set already ships 6–14px, so no
> value moves (plan 523).

Then bump the section's progress count to include the new row.

## 4. Commands and expected results

Run from `packages/tokens` (or with `--filter @gpuixui/tokens`):

| Command | Expected |
| ------- | -------- |
| `nub exec vitest run src/padding-fit.test.ts` | 1 file, all cases pass |
| `nub run --filter @gpuixui/tokens test` | 116 files pass, 0 failures |
| `nub run --filter @gpuixui/tokens check-types` | exits 0 |
| `nub run lint` (repo root) | exits 0 |
| `nub run fmt` (repo root) | "All matched files use the correct format." |
| `nub run check:tests` (repo root) | exits 0 (the new test asserts real values) |

Prove the guard can fail: temporarily revert the two metric edits and re-run
`padding-fit.test.ts`; it must fail on `flushControlFailures` and on the
hairline case. Restore the edits and re-run; it must pass. Record both
directions in the commit message.

Then, from the repo root: `nub run --filter @gpuixui/tokens build` (exits 0).

## 5. STOP conditions

Stop and report instead of improvising if:

- any **shipped** theme, platform variant or recipe fails the new rule (no
  shipped value may move; if one does, the rule is wrong — report the set and
  its value before changing it);
- `themeMetricFailures` for the flush probe reports anything other than the six
  failures in §3.3 (an unexpected ordering means another rule fired; re-read
  `metrics.ts` rather than adjusting the expectation blindly);
- a docs guard (`docs.test.ts`, `readme.test.ts`, `inventory.test.ts`,
  `snippets.test.ts`) fails for a reason other than the sentence you added —
  do not edit an unrelated claim to make the suite green;
- the change needs a colour, a component or a package outside
  `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `packages/tokens/README.md`, `COMPONENTS.md` (design-system rows) and
  `TODO.md`.

## 6. Test plan — what it must catch

The regression is *"a control's inset can be zero and the numeric contract calls
the theme good"*. The suite must fail if:

1. the `controlPaddingX` ladder loses its `positive` step rule → the flush probe
   stops reporting `positive`;
2. the hairline `atLeast` is removed or reads a literal instead of
   `spacing["2xs"]` → the 1px and the `spacing["2xs"]: 4` cases stop matching;
3. the rule is attached to `controlHeight` or another group by mistake → the
   flush probe's `group` values stop being `density` and the shipped-set case
   may fail;
4. the docs sentence drifts from the rule → the `docs.test.ts` case fails.

The two-direction check is §4's revert-and-run.

## 7. Acceptance

- [ ] `themeMetricFailures` reports a zero inset as `positive` **and**
      `at-least`, and a below-hairline inset as `at-least` with the theme's own
      bound.
- [ ] Every shipped set still passes all six checks; no token value moves.
- [ ] `padding-fit.test.ts` and `control-padding.example.ts` exist, the example
      is imported by the suite, and the test demonstrably fails without the
      edit.
- [ ] `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`
      and the `COMPONENTS.md` row state the rule; the new design-system sentence
      is guarded.
- [ ] `TODO.md` carries the ticked row; the section's progress count is current.
- [ ] All commands in §4 pass; the branch is committed and pushed.

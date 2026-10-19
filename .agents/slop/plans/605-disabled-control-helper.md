# 605 — The disabled state as one call

**Workstream:** tokens-theme · **Phase:** F · **Depends on:** 306, 307, 510, 514, 520, 524, 539
· **Status:** ready

## 1. The defect

Every interaction state the library ships is resolved by one public function
except the disabled state:

| State | Owner |
| ----- | ----- |
| filled control, rest/hover/press | `filledControl(theme, family)` |
| action inside a tone-tinted panel | `softAction(theme)` |
| focus | `focusRing(theme)` |
| text selection | `selectionStyle(theme, on)` |
| native field caret | `nativeFieldTheme(theme)` |
| status tone (soft, text, solid) | `statusTone(theme, tone)` |
| **disabled** | **a copyable example only** |

`packages/tokens/src/disabled-state.example.ts` exports `disabledPaint`, but that
file is not part of the package entry. `docs/tokens.md` therefore tells a consumer
to “copy the three properties”, and `docs/design-system.md` and the package
README say the example “returns the three roles”.

That is the exact state the cross-team row in `TODO.md` reports as still broken
in the shipped consumers: `primitives` and `components` reach the state with
`opacity: 0.5`, which GPUI composites as one group, so a filled primary label
measures **1.468:1** on a Linux light card and a disabled field's typed text
**3.273:1** on the macOS light `input` fill. The designed roles exist and are
contrast-checked, but the package gives a consumer no call to reach them.

Ship `disabledControl(theme)` and `DisabledControlStyle` beside the other state
helpers, and make the example and all three documents use it.

**This plan moves no colour, pair, floor, metric or shipped pixel.** The helper
reads the roles plan 306 already shipped.

## 2. Exact files and changes

### 2.1 `packages/tokens/src/styles.ts`

Add, after `softAction` and before `FocusRing`:

- `export interface DisabledControlStyle` with four readonly members:
  `opacity: number`, `backgroundColor: string`, `color: string`,
  `borderColor: string`.
- `export function disabledControl(theme: Theme): DisabledControlStyle`
  returning:
  - `opacity: 1` (clears a parent dim),
  - `backgroundColor: theme.colors.disabled`,
  - `color: theme.colors.disabledForeground`,
  - `borderColor: theme.colors.border`.

The JSDoc must state: the three roles are the designed state; the fill is
allowed to sit near the panel so the `border` edge carries the shape; a parent
`opacity` composite dims the label with its own fill; inside a tone-tinted panel
keep the resting `softAction` fill and paint `disabledForeground` instead
(`inactivePanelActionPairs`). Add an `@example` fenced `ts` block that imports
`disabledControl`, calls it, and names the four returned members — the snippet
guard in `snippets.test.ts` reads it.

No new imports: `Theme` is already imported.

### 2.2 `packages/tokens/src/disabled-state.example.ts`

Rewrite as a runnable consumer example built on the helper:

```ts
import { controlHeight, controlPaddingX, disabledControl } from "./styles.js";
import type { ControlSize } from "./scale.js";
import type { Theme } from "./theme.js";

/** The inline style a disabled Button paints at the theme's density. */
export const disabledButtonStyle = (
  theme: Theme,
  size: ControlSize = "md",
) => ({
  ...disabledControl(theme),
  height: controlHeight(theme, size),
  paddingLeft: controlPaddingX(theme, size),
  paddingRight: controlPaddingX(theme, size),
  borderRadius: theme.radius.md,
});
```

Keep the header comment's measured evidence (the 1.468:1 and 3.273:1 dim
figures and the panel-action caveat), shortened to what the example itself
needs; the helper's JSDoc carries the contract.

### 2.3 `packages/tokens/src/disabled-state.test.ts`

- Import `disabledControl` from `./styles.js` and `disabledButtonStyle` from
  `./disabled-state.example.js` (the example must stay imported by a suite,
  `examples.test.ts`).
- Replace the `disabledPaint` equality case with `disabledControl`, keeping the
  same expected object and the light/dark loop.
- Add a case: on every shipped theme, the helper's `backgroundColor` has
  `disabledForeground` at or above `contrastFloors[theme.contrast].inactive`,
  and its `borderColor` on that fill is at or above
  `contrastFloors[theme.contrast].divider` (plain ratio).
- Add a case: `disabledButtonStyle` returns the helper's four fields plus a
  positive `height` equal to `controlHeight(theme, "md")`, for both modes.
- Keep the existing dim-regression cases unchanged.

### 2.4 `docs/tokens.md`

- Add `| \`DisabledControlStyle\` | The designed disabled state: cleared
  opacity, the disabled fill, its label and the control edge. |` to the `## Types`
  table, in alphabetical order after `DirectionFailure`.
- Rule 8 of *Using tokens in components*: replace “Copy the three properties”
  with `disabledControl(theme)`, name the four returned fields, and keep the
  link to `src/disabled-state.example.ts` as the full Button shape.
- Add one fenced `ts` snippet importing `disabledControl` and showing the four
  fields, so the documented call is compiled by the snippet guard and the value
  coverage guard finds the name.

### 2.5 `docs/design-system.md`

In the inactive-state paragraph (§9), replace “returns the three roles” with
“`disabledControl(theme)` returns the three roles” and keep the example link.
No figures change.

### 2.6 `packages/tokens/README.md`

Replace “returns the three properties” with “`disabledControl(theme)` returns
the three properties and `src/disabled-state.example.ts` builds the Button
shape”. No counts change.

### 2.7 `COMPONENTS.md`

In the **Theme extension** row, after the provider sentence, add:
“`disabledControl(theme)` returns the designed disabled state — cleared
opacity, `disabled` fill, `disabledForeground` label and the `border` edge —
so a consumer never dims a control with `opacity: 0.5`.” Do not touch any other
row.

### 2.8 `TODO.md`

- Add a ticked row in the tokens-theme section: the helper, its test, the three
  documents and the example.
- Update the existing cross-team row that asks `primitives`/`components` to
  replace `opacity: 0.5` to name `disabledControl(theme)` as the one-call path.

### 2.9 `.agents/slop/plans/README.md`

Add the plan row `| [605](./605-disabled-control-helper.md) | The disabled state
as one call | F | 306, 307, 510, 514, 520, 524, 539 | done |`.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. `nub run --filter @gpuixui/tokens test`
   → 158 files (one new suite is not required; the case joins the existing
   file) and every test green. Expected failure before the implementation:
   the new import of `disabledControl` does not resolve, so the suite cannot
   compile.
2. `nub run check`
   → `check:tests`, lint, format and type-check all green. The docs value
   coverage, public-type index, snippet and example guards are part of this
   run.
3. `nub run lint`
4. `nub run test` (the full workspace gate for the commit).

## 4. STOP conditions

- **STOP** if any shipped theme fails the inactive or divider floor. That would
  mean the roles moved; do not change a colour in this plan — report the set and
  the measured ratio.
- **STOP** if the helper needs a role that does not exist. The state must be
  expressible with `disabled`, `disabledForeground` and `border`.
- **STOP** if a document needs a count, floor or figure changed. This plan moves
  no value; a count change means something else drifted.
- **STOP** if `check:tests` rejects a new case as unable to fail. Rewrite it to
  assert the helper's returned values or a derived floor; do not add
  `check-tests-ok`.

## 5. Test plan — both directions

The new cases must fail when the helper is wrong:

1. Return `opacity: 0.5` from `disabledControl` → the equality case fails.
2. Return `theme.colors.muted` as `backgroundColor`, or
   `theme.colors.mutedForeground` as `color` → the equality case fails; the
   per-theme floor case would still pass, which is why the equality assertion is
   the guard against a *different* designed pair.
3. Return `theme.colors.borderStrong` as `borderColor` → the equality case
   fails. (The divider floor would pass, so equality is the primary guard.)
4. Remove the helper's name from `docs/tokens.md` → the namespace value
   coverage guard fails.
5. Remove the `DisabledControlStyle` row from the type index → the public-type
   guard fails.
6. Remove the import from the docs snippet → the snippet guard fails.

Manual both-directions check (the repo's `verify-two-directions.sh` is still
jj-based, see the harness TODO): make change 1, run the suite, observe the
failure, restore; make change 4, run `docs.test.ts`, observe the failure,
restore. State both runs in the commit body or the audit note.

## 6. Acceptance

- `disabledControl` and `DisabledControlStyle` are public from
  `@gpuixui/tokens`; the helper returns exactly the three designed roles and
  `opacity: 1`.
- The example file imports the helper and builds a real Button shape; a suite
  imports it.
- The catalogue, design system and README name the helper; the type table and
  the value coverage are green.
- No colour, pair, floor, metric or shipped pixel changes.
- `nub run check`, `nub run lint` and `nub run test` pass.

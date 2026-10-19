# 644 — A square button's loading spinner must fit the button

**Phase:** F (integration and polish)
**Owner:** primitives
**Depends on:** 041, 086, 328, 340, 368, 370, 375
**Status:** done — 2026-10-19

## 1. The defect

A `Button` with `square` (which is what `IconButton` composes) paints the
three-dot `Spinner` at a fixed `theme.iconSize.sm` (14 px). The spinner row is
`3 × 14 + 2 × spacing["2xs"]` = **46 px** wide. The square button is the
recipe's `size-8/9/10` — **32/36/40 px** — with no horizontal padding.

Measured on the pinned release runtime (2026-10-19, 1280 × 800):

```
IconButton md, loading →  button x 12…48   (36 wide)
                          status x  7…53   (46 wide)
```

The indicator paints five pixels outside the button on each side. This is the
same containment rule plan `368` applied to labels (D40): a control contains
its own content. A loading state is content.

The text-button case is fine: its spinner is a leading item in an auto-width
button, so 46 px is inside the button.

## 2. The rule

The spinner's row width must be no larger than the **content width** of the
button that paints it.

- **Text (non-square) button:** unchanged — `theme.iconSize.sm` per dot.
- **Square button:** each dot is the largest integer side such that
  `count × side + (count − 1) × spacing["2xs"]` fits the square's content
  width. `count` is the Spinner's existing three dots. The content width is the
  resolved recipe height less the recipe's horizontal border on both sides
  (a `square` button has no horizontal padding).

For the shipped recipe and test theme this yields:

| size | square | dots | row  |
| ---- | ------ | ---- | ---- |
| `sm` | 32     | 9    | 31   |
| `md` | 36     | 10   | 34   |
| `lg` | 40     | 12   | 40   |

An `outline` square (`lg`) has a 1 px border on both sides, so its content is
38 and its dots are 11 (row 37).

The gap and the dot count must stay **one source**: the Spinner row and the fit
calculation both read them from `core/loading.ts`. The Button reads the recipe's
own resolved `height`/`borderWidth`; it does not duplicate the size table.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/loading.ts` | Add `SPINNER_DOTS` (3), `spinnerRowStyle(theme)` (the row's display/flex/gap) and `spinnerDotSize(available, theme, count?)` — the largest dot side whose row fits. All three documented. |
| `packages/primitives/src/components/Spinner.tsx` | Render the row through `spinnerRowStyle` and the dots through `SPINNER_DOTS`; no visual change. |
| `packages/primitives/src/components/Button.tsx` | A square button resolves the spinner dot size from the recipe's content width and passes it to `Spinner`; a non-square button keeps `theme.iconSize.sm`. |
| `packages/primitives/src/core/loading.test.ts` | `spinnerDotSize` cases: 32/36/40, an outline content width, a zero/negative/NaN width falls back to one pixel, and the exact-fit boundary. |
| `packages/primitives/src/components/Button.test.tsx` | Element-tree case: a square loading button's `Spinner` size is fitted per `sm`/`md`/`lg`; an outline `lg` subtracts its border; a text button keeps `iconSize.sm`. |
| `packages/primitives/runtime/controls.runtime.test.tsx` | Runtime case (`it.each(["sm","md","lg"])`): a loading `IconButton`'s `status` box lies inside the button box on both axes, and the button still paints one spinner and no `svg`. |
| `packages/primitives/docs/button.mdx` | The `loading` row/section states the square rule. |
| `packages/primitives/docs/icon-button.mdx` | The `loading` row/section states that the indicator is sized to the square, not to the icon it replaces. |
| `COMPONENTS.md` | Append the measured rule and counts to the Buttons row. |
| `PLAN.md` | D51 records the rule: a loading indicator is content, and a square button sizes it to its content box. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `TODO.md` | One ticked row in the primitives section. |

Do **not** change the `Spinner` public API, the button recipe, or the text
button's spinner size.

## 4. Commands and expected results

Run from `workspaces/primitives`:

```sh
# 1. The new runtime case must fail before the fix:
nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx
# Expected before: the md/lg cases fail on `status.x >= button.x`
# (measured x 7 against a button at 12).

# 2. Implement, then run the offline cases:
nub run --filter @gpuixui/primitives test
# Expected: all files pass, including the new core and element-tree cases.

# 3. The same runtime file should now pass:
nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx
# Expected: 3/3 new cases pass; the file stays green.

# 4. Re-run the full runtime suite at the end of the task:
nub run --filter @gpuixui/primitives test:runtime
# Expected: every file passes on the release-tag build.

# 5. Gates:
nub run check
nub run lint
nub run test
# Expected: all pass.
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- the recipe's resolved `height` is not a number (the fit cannot be derived);
- a square button's spinner cannot be made to fit without changing the
  public `Spinner` API or the recipe;
- the runtime case still paints the status box outside the button after the
  change (the correction assumed the wrong box model — record the measured
  boxes instead of loosening the assertion);
- an existing text-button test changes behaviour.

## 6. Test plan (both directions)

- **Offline core:** `spinnerDotSize(36) = 10`, `(32) = 9`, `(40) = 12`, a
  border-reduced width, and a nonsense width -> 1. These fail on the old
  expression (which does not exist) and pin the arithmetic.
- **Offline element tree:** the square button's `Spinner` `size` is 9/10/12 and
  the text button's is 14. Reverting the Button wiring to the constant makes
  the three square cases fail by name.
- **Runtime:** each of `sm`/`md`/`lg` has `status` inside the `Button` node on
  both axes. Before the fix, `md` measured `x 7…53` against a button at
  `12…48`.

## 7. Acceptance

- A loading `IconButton` at every size paints its spinner inside its own box.
- A text button's loading spinner is unchanged.
- The docs, inventory and plan index record the rule, and all three gates pass.

## 8. Outcome (2026-10-19)

The rule landed in `core/loading.ts` (`SPINNER_DOTS`, `spinnerRowStyle`,
`spinnerDotSize`) and `Button` resolves the square's content width from the
recipe's own resolved `height`/`borderWidth`. The Spinner's row and its dots now
read the same gap and count.

- Offline: 60 files / **860 tests** pass, including the two core cases and the
  element-tree table (9/10/12, outline `lg` 11, text button 14).
- Scoped runtime: `runtime/controls.runtime.test.tsx` **54/54**.
- Full runtime: **58 files / 809 tests** green on the release-tag build.
- Both directions measured: reverting the Button wiring to the constant made
  all three `it.each` cases fail (`x 5/7/9 ≥ 12`); restored, they pass and the
  status box sits inside the button.
- `nub run check` and `nub run lint` pass (formatting included).

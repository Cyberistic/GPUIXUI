# Plan 572 — the native text metrics that hold type

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
367 (the type scale), 569 (`nativeTextTheme`, the runtime bridge).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`nativeTextTheme(theme)` (plan 569) supplies the native text theme's colours, its
24-capture syntax palette and most of its layout metrics from the type, spacing
and radius scales. Four metrics are still omitted, so the runtime's defaults —
tuned to **12.5px code**, **12px diff** and **14px body** — apply unchanged to
every theme:

| Native metric | Runtime default | Tuned to |
| ------------- | --------------- | -------- |
| `codeGutterDigitWidth` | `7` | `code_text_size: 12.5` |
| `diffGutterWidth` | `36` | `diff_text_size: 12` |
| `mdTableMinColumnWidth` | `96` | `md_text_size: 14` |
| `mdTableMinColumnContent` | `48` | `md_text_size: 14` |

`nativeTextTheme` does send `codeTextSize`/`diffTextSize` from `codeBlock` and
`mdTextSize` from `body`, and every one of those roles is a legal edited value:
`themeMetricFailures` only requires a positive size, a leading at least as tall
as the size and an ordered code ladder. A copied platform style or brand theme
may therefore raise `codeBlock.fontSize` to 24 and `body.fontSize` to 16 and pass
every check while the native surface keeps a 7px line-number gutter and a 36px
diff gutter.

The code gutter is the visible defect, not a cosmetic one. The pinned runtime
paints each gutter digit in the **code font at `code_text_size`**
(`packages/native/src/custom_elements/code.rs`, `gutter_width` and the
`.text_size(px(type_style.text_size))` row), and the gutter width is
analytically `digits * codeGutterDigitWidth + codeGutterPaddingRight`. At a 24px
code role a monospace digit advances roughly 13px while the gutter still reserves
7px per digit, so a three-digit line number overlaps itself. The runtime's own
proportion is `7 / 12.5 = 0.56em`; the token set never sends it.

The markdown table floors have the same shape: `mdTableMinColumnWidth` and
`mdTableMinColumnContent` are floors on a column's width. At a 16px body a
96px/48px floor is 6em/3em instead of the 6.86em/3.43em the runtime was designed
with, so a copied theme's tables squeeze and wrap earlier than the identity's.

This contradicts the catalogue's promise that "a copied platform style or brand
theme reaches code, diffs and markdown without component source changing"
(`docs/tokens.md`, *Native text documents*), and the page's own paragraph says
those fields "have no token in this scale yet". They do have a source: the type
role they are derived from.

## 2. Decision

Derive the four fields from the role that decides the text they hold, using the
runtime's **own shipped proportions**, and keep every shipped pixel exactly as
the runtime paints it today:

```ts
/** Scale a runtime default tuned to `base` px to a theme's own role size. */
const scaledMetric = (size: number, shippedAt: number, base: number): number =>
  Math.ceil((size * shippedAt) / base);
```

- `codeGutterDigitWidth = scaledMetric(codeBlock.fontSize, 7, 12.5)` —
  7px at the shipped 12px code role (6.72 → 7), 14px at 24px.
- `diffGutterWidth = scaledMetric(codeBlock.fontSize, 36, 12)` —
  36px at 12px, 72px at 24px.
- `mdTableMinColumnWidth = scaledMetric(body.fontSize, 96, 14)` —
  96px at 14px, 110px at 16px.
- `mdTableMinColumnContent = scaledMetric(body.fontSize, 48, 14)` —
  48px at 14px, 55px at 16px.

`Math.ceil` keeps the gutter wide enough for the glyph rather than one pixel
short: at 12px it returns the runtime's own 7. The multiply happens before the
divide (`size * shippedAt / base`) so `14 * 96 / 14` is exactly 96, not
`96.00000000000001` that a stored float ratio would produce.

The remaining runtime fields stay at their defaults, and the reason is stated
instead of hidden:

- `codeGutterMinWidth` (`28`) is a floor for one- and two-digit files; the
  computed width already exceeds it as the type grows.
- `diffAccentBarWidth` (`3`) is a chrome bar, not a glyph measure.
- The diff's per-digit advance (`6.6` in `diff/mod.rs`) and the table's
  max-content share are computed inside the runtime from constants with no
  theme source; a larger `diffGutterWidth` only raises the minimum, and the page
  says so.

Rejected alternatives:

- **Add four new colour-like roles to `Theme`.** These are layout numbers
  derived from a type role; a second editable copy would drift.
- **Hardcode the same four numbers in `nativeTextTheme`.** That is what the
  runtime does today and what the gap is.
- **Derive the diff per-digit width.** The runtime does not read one; it
  hardcodes `6.6`. Adding a field the runtime ignores is a lie in the API.
- **Derive `codeGutterMinWidth` from a `28 / 12.5` ratio.** It would round to
  27px at the shipped code size — a shipped pixel moves for no visible gain.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/tokens/src/native-text.ts` | Add the four readonly fields to `NativeTextMetrics` with JSDoc; add `scaledMetric`; return the four values from `metricsOf`; replace the "omitted and keep the runtime's defaults" interface comment with the shorter list of what still does. |
| `packages/tokens/src/native-text.test.ts` | Extend *derives the layout from the theme's type, spacing and radius scales* (the edited theme gains `codeBlock` 24/34, `code` 26/36 and `body` 16/24); assert the four derived values. Add a shipped-value case proving 7/36/96/48 in every shipped set. |
| `packages/tokens/src/native-text.example.ts` | Add `largeCodeTheme`, a brand with a larger code role, and assert it in the suite. |
| `docs/tokens.md` | Rewrite the metrics paragraph in *Native text documents*: the four fields, their role and the runtime's proportions; the remaining defaults. Add the values to the example prose if the existing table style fits. |
| `docs/design-system.md` | Add one clause to the native-text row/paragraph: the gutters and table floors scale with the role they hold. |
| `COMPONENTS.md` | Append one clause to the Design tokens row's `nativeTextTheme` sentence (plan 572). |
| `TODO.md` | Add and tick the task under *Design tokens and theming*; update the progress bar. |
| `.agents/slop/plans/README.md` | Add the plan row and a summary paragraph; keep the index's prose style. |

## 4. Exact commands and expected results

Run from the worktree root unless a command says otherwise.

1. `nub run --filter @gpuixui/tokens test`
   Expected: all files pass, including the new/changed `native-text.test.ts`;
   the reported test count grows.
2. `nub run --filter @gpuixui/tokens check-types`
   Expected: clean. Removing a field from `NativeTextMetrics` makes the new
   assertions a type error, which is the first direction of the guard.
3. `nub run lint`
   Expected: clean for the touched files.
4. `nub run fmt`
   Expected: clean; run `nub run fmt:fix` if it reports only formatting.
5. `nub run check`
   Expected: green (`check:tests`, lint, fmt and both workspace type checks).
6. `nub run test` (repo-wide merge gate)
   Expected: the tokens suite passes; the deploy workspace has no tests. Record
   the exact file/case counts in the verification section; do not claim it
   without running it.

## 5. STOP conditions

Stop and report, do not improvise, if:

- a shipped theme reports a value other than 7 / 36 / 96 / 48 for the four
  fields — the shipped proportions in §2 would move a pixel;
- any shipped platform style or recipe carries its own `codeBlock` or `body`
  font size (the derivation must stay a function of the role, not of a shipped
  constant);
- `docs.test.ts`, `snippets.test.ts`, `readme.test.ts` or `public-types.test.ts`
  fails for a reason other than the documented additions;
- the change needs a path outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/`.

## 6. Test plan — both directions

| Guard | Mutate | Expected |
| ----- | ------ | -------- |
| shipped proportion | return a constant `7` for `codeGutterDigitWidth` | the 24px case fails (`14` expected) |
| shipped pass | delete `codeGutterDigitWidth` from `metricsOf` | the shipped-value case fails (`undefined`) and `check-types` fails |
| body derivation | hardcode `mdTableMinColumnWidth` to `96` | the 16px case fails (`110` expected) |
| diff derivation | hardcode `diffGutterWidth` to `36` | the 24px case fails (`72` expected) |
| no pixel move | change `Math.ceil` to `Math.round` for the table | the 16px case still passes, but `codeGutterDigitWidth` at 24 becomes 13; the case records the chosen ceil |
| example | drop `largeCodeTheme` from the example export | the suite import fails |

Both directions: with the four fields removed, the new case fails to
type-check (and the shipped case fails at runtime if the interface is kept and
the values are omitted). With them restored, every case passes. Use
`scripts/verify-two-directions.sh` if it is executable; otherwise prove both
directions by temporarily reverting `metricsOf` in the worktree (never commit
the revert) and record the failing assertion.

## 7. Acceptance criteria

- `nativeTextTheme(shipped).metrics` carries `codeGutterDigitWidth: 7`,
  `diffGutterWidth: 36`, `mdTableMinColumnWidth: 96`,
  `mdTableMinColumnContent: 48` for every shipped identity theme, platform
  variant and recipe.
- A theme with `codeBlock.fontSize: 24` gets 14px per code-gutter digit and a
  72px diff gutter; a theme with `body.fontSize: 16` gets 110px/55px table
  floors; both clear `themeFailures`.
- The catalogue documents the four fields, their source and the runtime
  defaults that remain; the design system and the ledger state the same rule.
- One runnable example demonstrates a larger code role; it is imported by the
  suite.
- The tokens suite, `check-types`, lint and fmt pass; the repo-wide test run is
  recorded.

## 8. Cross-team

None. The fields are consumed through the runtime's `theme` prop; the
`components` migration to pass `nativeTextTheme(theme)` is already recorded by
plan 569 and is untouched here.

## 9. Verification (2026-10-19)

- `nub run --filter @gpuixui/tokens test` — 146 files, 5766 cases, all green
  (plan 569 ended at 5764; the two new cases are the shipped-value pass and the
  larger-code-role example).
- `nub run --filter @gpuixui/tokens check-types` — clean.
- `nub run check` — green: `check:tests`, lint, fmt and both workspace type
  checks.
- `nub run test` — 146 files, 5766 cases, green.
- Both directions: deleting `codeGutterDigitWidth` from `metricsOf` failed
  `check-types` with TS2741 ("Property 'codeGutterDigitWidth' is missing …");
  hardcoding it to `7` failed the edited case (`expected 7 to be 14`) and the
  example case (`expected 7 to be greater than 7`). Restoring the derivation
  passes both.

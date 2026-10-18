# Plan 558 — The opaque `FF` spelling the format checks accept and the maths cannot read

**Workstream:** `tokens-theme`
**Phase:** F (the editable-theme guarantee: one total check)
**Depends on:** 371 (colour-role form), 540 (role opacity), 557 (the caret pair; the
most recent edit to the same total-check path)
**Status:** ready

## 1. Why

Plan 540 shipped `themeOpacityFailures` with an explicit promise: an opaque role
written `#RRGGBBFF` is accepted, "because it paints the same colour either way".
Plan 371's `themeColorFailures` agrees — `isHexColor` accepts six- and
eight-digit hex. Both format checks therefore return `[]` for a theme that
spells an opaque role with its redundant alpha byte.

The colour maths does not. `contrast.ts` parses an opaque value with
`/^#([0-9A-Fa-f]{6})$/`, so **any** eight-digit string — including a fully opaque
one — becomes `NaN`. `compositeOver` likewise refuses an `#RRGGBBFF` background
and returns the overlay unchanged, which then measures as `NaN`.

Measured on the current tree with a probe:

- `extendTheme(lightTheme, { colors: { foreground: "#191D25FF" } })` —
  `themeColorFailures` `[]`, `themeOpacityFailures` `[]`, but
  `themeContrastFailures` **23 failures** (first: `foreground` on `background`,
  body floor 7, ratio `NaN`) and `themeFailures` **35**.
- `extendTheme(darkTheme, { colors: { card: "#191D25FF" } })` — both format
  checks `[]`, `themeContrastFailures` **62**, `themeFailures` **67**.
- `contrastRatio("#191D25FF", "#F6F8FA")` is `NaN`; `relativeLuminance("#FFFFFFFF")`
  is `NaN`; `compositeOver("#00000080", "#FFFFFFFF")` returns `"#00000080"`.

So the package's one total check reports a theme broken for a spelling its own
opacity check documents as valid. That is exactly the class of contradiction
plans 371 and 540 closed from the other side: a form the contract blesses must be
the form the maths reads. The painted result is identical (alpha `FF` is opaque),
so no shipped value moves; the defect is in the checker, not in any palette.

## 2. What changes

### 2.1 `packages/tokens/src/contrast.ts` — read the opaque suffix

Replace the opaque parser (around line 1207):

```ts
// An opaque role may carry its redundant alpha byte; the paint is the same
// colour either way (plan 540's accepted form, plan 558's measurement).
const opaqueHex = /^#([0-9A-Fa-f]{6})(?:[Ff]{2})?$/;
```

`hexOf` keeps returning capture group 1, so `relativeLuminance` and
`contrastRatio` see the six-digit colour. `compositeOver`'s `under` match uses
the same parser, so an `#RRGGBBFF` background composites like `#RRGGBB`. A
**partial** alpha (`#RRGGBB80`) still does not match: it is not an opaque paint
and stays the opacity check's diagnostic followed by a `NaN` ratio.

Update the JSDoc of the three functions:

- `relativeLuminance` — "an opaque `#RRGGBB` colour (the paint-identical
  `#RRGGBBFF` spelling included)".
- `contrastRatio` — "between two **opaque** colours, `#RRGGBB` or its
  `#RRGGBBFF` spelling".
- `compositeOver` — "over an opaque `#RRGGBB` (or `#RRGGBBFF`) one".

Do not change `translucentHex`, `isHexColor`, `alpha`, `themeColorFailures` or
`themeOpacityFailures`.

### 2.2 `packages/tokens/src/opaque-suffix.test.ts` (new)

Header comment states the bug: the two format checks accept an opaque role
spelled with `FF`, but `contrastRatio`/`relativeLuminance`/`compositeOver` read
only six digits, so the total check reported 23 (light `foreground`) and 62
(dark `card`) `NaN` contrast failures for a paint-identical theme.

Cases:

1. **the maths reads the accepted spelling** — `relativeLuminance("#FFFFFFff")`
   is `1`, `contrastRatio("#000000FF", "#FFFFFFFF")` is `21`,
   `contrastRatio("#191D25FF", "#F6F8FAFF")` equals the six-digit ratio.
2. **a partial alpha is still unmeasurable** — `contrastRatio("#191D2580",
   "#F6F8FA")` is `NaN`, and `compositeOver("#00000080", "#FFFFFF80")` returns
   the overlay unchanged (`"#00000080"`), the documented fallback for a base the
   parser cannot read. This is the case that fails if someone "fixes" the regex
   by accepting any alpha.
3. **a suffixed theme passes the total check** — `themeFailures` on
   `extendTheme(lightTheme, { colors: { foreground: "#191D25FF" } })` is `[]`,
   and on `extendTheme(darkTheme, { colors: { card: "#191D25FF" } })` is `[]`.
   (Both fail before §2.1 with the counts above.)
4. **the two format checks already agreed** — for those two themes,
   `themeColorFailures` and `themeOpacityFailures` are `[]`; this is the premise,
   not the fix, and it guards the contract from being "fixed" by tightening the
   format checks instead.
5. **a measured role with a partial alpha still fails both halves** —
   `foreground: "#191D2580"`: `themeOpacityFailures` reports
   `{ role: "foreground", expected: "opaque" }` and `themeContrastFailures`
   reports `NaN` ratios. (Fails if the regex accepts any eight-digit value.)
6. **the shipped sets are unchanged** — every `shippedThemes` entry returns `[]`
   from `themeFailures` (24 sets; the same loop other suites use).
7. **the composite example still holds** — `compositeOver("#00000080",
   "#FFFFFFFF")` is `"#7F7F7F"`, the same paint as the six-digit base.

Cases 1, 3 and 7 fail before §2.1; cases 2, 4, 5 and 6 pass and guard the fix.

### 2.3 `docs/tokens.md`

- In **Role opacity**, after "An opaque role written `#RRGGBBFF` is accepted,
  because it paints the same colour either way", add: the maths reads that
  spelling as the colour it paints — `contrastRatio`, `relativeLuminance` and
  `compositeOver` drop a fully opaque alpha byte — so a measured role written
  `#RRGGBBFF` is measured, not reported as a `NaN` failure by the contrast half
  while both format checks return `[]`. Name the probe: light `foreground` and
  dark `card` each produced dozens of failures for the same paint.
- In **the public parts** paragraph (around line 1921), widen "the WCAG ratio for
  opaque `#RRGGBB` values" to include the paint-identical `#RRGGBBFF` spelling.
- In **Colour format** (around line 2075), state that a measured role in a
  non-hex form still fails as `NaN`, while a fully opaque eight-digit spelling is
  the same paint and is measured.
- Do not add or change any pair, role or ratio figure.

### 2.4 `packages/tokens/README.md`

In the format/opacity paragraph that says every role is held to the six- or
eight-digit form, add one sentence: the opaque `FF` spelling is read by the
maths as the six-digit colour it paints, so the format, opacity and contrast
checks agree on it; a partial alpha remains the opacity check's failure.

### 2.5 `COMPONENTS.md`

In the `Theme colour check` row, replace "the only form `alpha`, `compositeOver`
and `contrastRatio` parse" with wording that keeps `alpha`'s six/eight-digit
reading and adds that the three maths functions read an opaque `FF` suffix as the
six-digit colour, so a measured role in the accepted opaque spelling is measured
rather than reported `NaN` (plan 558). No status change.

### 2.6 `TODO.md`, the plan index and the RD note

- Add and tick under "Design tokens and theming": "Make the maths read the opaque
  `FF` spelling the format checks accept — `themeColorFailures` and
  `themeOpacityFailures` returned `[]` for `foreground: "#191D25FF"`, while
  `contrastRatio`/`relativeLuminance`/`compositeOver` read only six digits and
  the total check reported **35** failures (23 of them contrast, ratio `NaN`);
  the opaque parser now accepts a fully opaque alpha byte, a partial alpha still
  fails, and the two halves of the contract agree (plan 558)".
- Re-count the progress bar from the file after editing.
- Add plan 558 to `.agents/slop/plans/README.md` after 557 with status `done` and
  a commentary paragraph in the voice of 546–557.
- Add `.agents/slop/rd/2026-10-19-tokens-next-558.md` with what landed, the test
  count, the queue state and the re-checked candidates.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline before the change:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS — 138 files, 5,706 tests. STOP if red.
2. Reproduce the defect on the current code (temporary probe, removed before the
   commit):
   ```sh
   cd packages/tokens && nub exec vitest run src/probe-558.test.ts
   ```
   Expected: the recorded counts — light `foreground` `#191D25FF` gives 23
   contrast failures / 35 total; dark `card` gives 62 / 67; both format checks
   `[]`; `contrastRatio` `NaN`. (The probe used during planning reported exactly
   these values.)
3. Add §2.1 and §2.2, then run only the new suite:
   ```sh
   cd packages/tokens && nub exec vitest run src/opaque-suffix.test.ts
   ```
   Expected: PASS, 7 cases. Revert §2.1 alone and re-run: cases 1, 3 and 7 fail.
   Change the parser to accept any alpha and re-run: cases 2 and 5 fail, and
   `contrast.test.ts` fails its `NaN` case (two directions).
4. Run the package:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS — 139 files, 5,713 tests (seven cases more than baseline).
5. Update §2.3–2.5, then the gates:
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: all green.
6. Prove no shipped value moved:
   ```sh
   git diff --stat packages/tokens/src/color.ts packages/tokens/src/theme.ts packages/tokens/src/platform-styles packages/tokens/src/platform-recipes.ts packages/tokens/src/scale.ts packages/tokens/src/typography.ts
   ```
   Expected: empty.
7. Commit and push:
   ```sh
   git add -A
   git commit -m "fix(tokens): measure the opaque FF spelling both format checks accept"
   git push origin agent/tokens-theme
   ```

## 4. STOP conditions

Stop and report instead of improvising if:

- a shipped theme, platform variant or recipe reports a new failure after §2.1 —
  all opaque roles are six-digit today, so this would mean the parser change
  altered behaviour rather than widening an accepted spelling;
- a case needs `@ts-expect-error`, an `as`, or a suppression to compile;
- the opaque parser change makes a **partial** alpha measurable (case 5 must keep
  failing) or changes `alpha`/`isHexColor` behaviour;
- a document guard fails on a sentence this plan did not name: update that
  guard's expected sentence, not the contract;
- the fix appears to require a new colour role, a palette value, or a `Theme`
  field — the defect is only in reading a form;
- `packages/tokens` was already red before the change for reasons outside this
  workstream.

## 5. Acceptance

- `contrastRatio`, `relativeLuminance` and `compositeOver` read `#RRGGBBFF` as
  the six-digit colour it paints; a partial alpha is still `NaN`.
- `themeFailures` returns `[]` for a theme whose measured roles carry the opaque
  `FF` suffix, matching `themeColorFailures`/`themeOpacityFailures`.
- The new suite fails without §2.1 in the recorded directions and proves the
  partial-alpha guard.
- No colour, type, metric, elevation, motion, platform-style or recipe value
  moves; all 24 shipped sets still return `[]`.
- `docs/tokens.md`, the README, `COMPONENTS.md`, `TODO.md` and the plan index are
  current.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 6. Candidates left out (and why)

- **Rejecting `#RRGGBBFF` in the format checks instead.** Plan 540 documents it
  as accepted and it paints identically; tightening the checks would break a
  valid authored theme to paper over a maths limitation.
- **Normalising every role to six digits in `extendTheme`.** It would rewrite a
  consumer's stored data and would not help a theme that reached the checker from
  JSON without `extendTheme`.
- **Extending `contrastRatio` to composite a partial alpha.** A measured role is
  opaque by contract; compositing `#RRGGBB80` would silently invent a surface
  behind it and hide the opacity failure.
- **A `colorForms` index / narrowing guard.** `ColorForm` is the package's last
  bare exported union, but it is a diagnostics payload with no stored form or URL
  boundary; it is a separate, smaller unit, not part of this correctness fix.

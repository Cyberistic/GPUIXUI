# Plan 557 — The native field's caret is ink, not a fill

**Workstream:** `tokens-theme`
**Phase:** F (contrast-contract completeness; the theming extension mechanism)
**Depends on:** 082 (`primaryText`, the accent's readable ink), 332 (the `mark`
pair class), 337 (the native field's reach), 511 (`nativeFieldTheme`), 527 (a
field on the four row washes), 546 (the exported-pair-list inventory)
**Status:** ready

## 1. Why

Plan 511 shipped `nativeFieldTheme(theme)` as `{ caret: theme.colors.primary }`
because "the accent is already held to the `mark` floor on the `input` fill and
the four `Surface` tones a transparent field sits on, so there is no second role
for the same colour". Plan 527 later established the composition that sentence
missed: `InlineEdit` swaps a row's text for a field **in place**, on the four row
washes, which is why `inputForeground` and `placeholder` gained pairs there.

The caret inherits onto that field, and `primary` is a *fill*: on the shipped
macOS dark set it measures **2.836:1** on the `active` wash and **2.748:1** on
the `selected` fill, under the 3:1 `mark` floor (`4.5:1` at AAA). So a caret in a
selected inline edit cannot be seen in that set — and in any copied theme that
moves its accent the same way — while `themeFailures` returns `[]`, because no
pair measures the caret on a wash.

The gap is the same class plan 082 fixed for links: a role designed as a fill is
painted as ink. `primaryText` is the accent's readable tonality, already held at
the secondary floor on `background`, `card`, `popover`, `muted`, `hover`,
`active`, `accent` and `selected`; it is the right role for a 1px caret. The
missing surface is the field's own `input` fill, which the caret is also painted
on. Measured across all 24 shipped sets, `primaryText` clears the mark floor on
all nine surfaces (tightest **5.587:1**, Windows dark on `active`), so no colour
moves and the caret becomes visible everywhere a field can sit.

## 2. What changes

### 2.1 `packages/tokens/src/contrast.ts` — `caretPairs`

Add beside `primaryTextPairs` (after the `primaryTextSurfaces` map, around line
521):

```ts
/**
 * The native field's caret on the one surface the text contract does not
 * already hold: its own `input` fill. The caret is the accent's readable ink
 * (`primaryText`), not the `primary` fill — the fill is tuned for a label on
 * top of it, and on macOS dark it measures **2.748:1** on `selected` and
 * **2.836:1** on `active`, under the 3:1 mark floor, so a caret in a selected
 * inline edit vanished while every check returned `[]`. The other eight
 * surfaces a field sits on — the `Surface` tones and the row washes an
 * in-place editor paints — are already held by `primaryTextPairs` at the
 * higher `secondary` floor. This pair is a `mark` because a caret is a 1px
 * indicator, not text.
 */
export const caretPairs: readonly ContrastPair[] = [
  ["primaryText", "input", "mark"],
];
```

The list is deliberately **one pair**. The eight text surfaces already carry
`primaryText` at the `secondary` floor, and adding a second class for the same
role/surface pair would break the contract's "one pair per composition"
invariant (`primary-text.test.ts`, `row-surface-text.test.ts` and
`mark-contrast.test.ts` all hold it).

Add `...caretPairs` to `contrastPairs`, immediately after `...primaryTextPairs`
(line ~985). The contract grows 404 → **405**.

Extend the `themeContrastFailures` JSDoc bullet that names the marks (the
`markPairs` sentence in the "Every documented pair a theme misses" list) with
the caret: "the native field's caret — `primaryText`, the accent's ink rather
than its fill — on the field's own `input` fill (`caretPairs`), with the
`Surface` tones and row washes an in-place editor paints already held by
`primaryTextPairs`." Do not state a count in that block: `contrast-reference.test.ts`
fails on a number word followed by "surfaces/families/pairs".

### 2.2 `packages/tokens/src/styles.ts` — the caret is `primaryText`

In `nativeFieldTheme` (line ~347) return:

```ts
  return { caret: theme.colors.primaryText };
```

Rewrite the JSDoc paragraph that begins "The caret is the accent — `primary` —":
it must say that the caret is the accent's **readable ink** (`primaryText`), not
the `primary` fill, because a caret is a 1px mark painted on the field's surface
and the fill was tuned for a label on top of it; on macOS dark `primary`
measures 2.748:1 on a selected row and 2.836:1 on a pressed one, under the 3:1
mark floor. Name `caretPairs` as the pair that holds `primaryText` on the field's `input`
fill, note the eight other surfaces are the text pairs', and keep the sentence that `primary` is still the slider thumb's ring
mark (`markPairs`) — that use is a mark on the `input` fill and is unchanged.

### 2.3 `packages/tokens/src/native-field.example.ts`

Update the doc comment: the caret is the accent's readable ink, not the fill.
The code is unchanged (it calls `nativeFieldTheme`).

### 2.4 Rewrite `packages/tokens/src/native-field-caret.test.ts`

Header comment states two bugs: plan 511's caret was the `primary` fill, which
plan 527's in-place field paints on the row washes; macOS dark measured
**2.836:1** on `active` and **2.748:1** on `selected`, under the 3:1 mark floor,
while every check returned `[]`.

Keep the plan-511 evidence (the runtime default `#7C86FF` at 3.129:1 on the AAA
light `input` and 2.795:1 on its quiet panel). Cases:

1. **every shipped set carries the accent's ink** — `nativeFieldTheme(theme).caret`
   equals `theme.colors.primaryText` for every `shippedThemes` entry.
2. **the caret is visible on every surface a field sits on** — for every shipped
   set, `contrastRatio(caret, theme.colors[surface])` meets
   `contrastFloors[theme.contrast].mark` for `input`, `background`, `card`,
   `popover`, `muted`, `hover`, `active`, `accent` and `selected`.
3. **the fill it used to be could not** — assert the pre-fix composition with
   `toBeCloseTo`: macOS dark `primary` on `selected` is 2.748 and on `active`
   2.836, both under `contrastFloors.default.mark`; identity light `primary` on
   `selected` is also under (proves it is not a macOS-only arithmetic slip).
4. **the contract reports a collapsed caret** — `extendTheme(lightTheme, {
   colors: { primaryText: lightTheme.colors.input } })` yields a
   `themeContrastFailures` entry `{ foreground: "primaryText",
   background: "input", pairClass: "mark" }`; the same edit on `selected`
   reports that surface at `secondary` (the text pair). (This case must fail
   before §2.1.)
5. **the caret follows edited ink, not the fill** — moving `primaryText` moves
   the caret; moving only `primary` leaves it unchanged.
6. **the runtime default is still replaced** — the AAA light `input` and `muted`
   ratios from plan 511, and the new caret clears the AAA mark floor there.
7. **the example runs** — `darkSearchField.theme.caret` is
   `dark.colors.primaryText` and the style colour is still `inputForeground`.
8. **`caretPairs` is the published list** — it is exactly
   `[["primaryText", "input", "mark"]]`, `contrastPairs` contains it, and the
   other eight surfaces carry `primaryText` at the `secondary` class.

Cases 2 and 5 pass before the change; case 3 is the recorded probe; cases 1, 4
and 8 fail before §2.1–2.2. Record the real output in the commit message.

### 2.5 `packages/tokens/src/contrast.test.ts` — the pair-list inventory

Add `caretPairs` to the `publishedPairLists` record (after `contrastPairs`,
alphabetical) and to the import block. The record's key type derives from the
package's exports, so the suite does not type-check until it is listed (plan 546).

### 2.6 `docs/tokens.md`

- §Native text fields: replace the `{ caret: theme.colors.primary }` sentence and
  its "no second role" rationale with the caret being `primaryText`, the accent's
  readable ink; name `caretPairs` and the nine surfaces a field sits on, the macOS dark 2.748:1 /
  2.836:1 failure and the 5.587:1 tightest shipped pair. Keep the runtime-default
  figures and the runnable-example link.
- The "No themeable native field placeholder or selection" bullet: "supplies it
  from the accent's readable ink".
- The `primaryText` row of the colour table: add "and the native field caret" to
  its description.
- Name `caretPairs` in the contrast-contract section beside `markPairs`, and add
  the list to the sentence that enumerates the published pair lists.

### 2.7 `docs/design-system.md`

Replace "A native field's caret is the accent as well … the accent is already a
measured mark on the `input` fill and the four surface tones" with: the caret is
the accent's readable ink (`primaryText`), held by `caretPairs` on the field, the
four surfaces and the four row washes an in-place editor paints; the fill would
measure 2.748:1 on macOS dark's selected row, under the 3:1 mark floor.

### 2.8 `packages/tokens/README.md`

Both places that say the caret comes "from the accent" (the selection section and
the limitations bullet) now say the accent's readable ink, name `primaryText` and
`caretPairs`, and keep the runtime-default figures.

### 2.9 `COMPONENTS.md`

In the `Design tokens` row, replace the clause "`{ caret: theme.colors.primary }`
… because the accent is already a `markPair` on the `input` fill and the four
`Surface` tones" with `primaryText` on the field's `input` fill (`caretPairs`)
and the eight text surfaces,
quoting the macOS dark 2.748:1 failure. No status change.

### 2.10 `TODO.md`, the plan index and the RD note

- Add and tick under "Design tokens and theming": "Ship the caret as ink, not a
  fill — `nativeFieldTheme` returned the `primary` fill, which plan 527's
  in-place field paints on the four row washes, and macOS dark's fill measures
  **2.748:1** on `selected` and **2.836:1** on `active`, under the 3:1 mark floor,
  while every check returned `[]`; the caret is `primaryText` and `caretPairs`
  holds it on the field's `input` fill beside the eight text surfaces (plan
  557)".
- Re-count the progress bar from the file after editing; do not quote a number
  before counting.
- Add plan 557 to `.agents/slop/plans/README.md` after 556 with status `done`
  and a commentary paragraph in the voice of 546–556.
- Add `.agents/slop/rd/2026-10-19-tokens-next-557.md` with what landed, the test
  count, the queue state and the re-checked candidates (§6).

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline before the plan lands:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS — 138 files, 5,694 tests (measured on 2026-10-19, with no probe
   file in the tree). STOP if red.
2. Record the defect on the current code (a temporary probe, removed before the
   commit):
   ```sh
   cd packages/tokens && nub exec vitest run src/probe.test.ts
   ```
   Expected: FAIL with macOS dark `primary` on `active` 2.836 and on `selected`
   2.748 under the 3:1 floor.
3. Implement §2.1–2.4, then run only the caret suite:
   ```sh
   cd packages/tokens && nub exec vitest run src/native-field-caret.test.ts
   ```
   Expected: PASS, 8 tests. Revert §2.2 alone and re-run: cases 1, 2, 3, 5 and
   7 fail (the probe's five). Remove `...caretPairs` from `contrastPairs` and
   re-run: cases 4 and 8 fail, and `contrast.test.ts`, `mark-contrast.test.ts`
   and `inventory.test.ts` fail their pair-count cases (two directions).
4. Update §2.5–2.9, then the whole package:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS — 138 files, 5,706 tests (twelve cases more than baseline).
5. Gates:
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: all green.
6. Prove no shipped colour or theme value moved:
   ```sh
   git diff --stat packages/tokens/src/color.ts packages/tokens/src/typography.ts packages/tokens/src/platform-styles packages/tokens/src/platform-recipes.ts packages/tokens/src/scale.ts packages/tokens/src/theme.ts
   ```
   Expected: empty.
7. Commit and push:
   ```sh
   git add -A
   git commit -m "fix(tokens): hold the native field carets to the mark floor"
   git push origin agent/tokens-theme
   ```

## 4. STOP conditions

Stop and report instead of improvising if:

- `primaryText` fails the mark floor on any of the nine surfaces in a shipped
  set (the probe says the tightest is 5.587:1; a failure means the palette moved
  and the design question is bigger than the caret);
- a shipped theme, platform variant or recipe reports a new contrast failure
  after §2.1 (the list only adds `primaryText` pairs that already pass, so this
  would be a real finding — do not narrow the list);
- the pair-list inventory needs an `as` or a suppression to accept `caretPairs`;
  the record's derived key type should accept it directly;
- a document guard fails on a sentence this plan did not name; update that
  guard's expected sentence, not the contract;
- the fix appears to require a 71st colour role, a change to macOS dark's
  `selected`/`active` fills, or a change to `Theme` — all three were considered
  and rejected in §6;
- the package was already red before the change for reasons outside this
  workstream.

## 5. Acceptance

- `nativeFieldTheme(theme)` returns `{ caret: theme.colors.primaryText }` and
  every shipped set's caret clears the `mark` floor on the `input` fill, the four
  `Surface` tones and the four row washes.
- `caretPairs` is exported, included in `contrastPairs`, listed in the
  exported-pair-list inventory, and named in the catalogue, README, design system
  and the `primaryText` row.
- `themeContrastFailures` reports a collapsed caret on `input` and on a row wash.
- The suite fails without §2.1–2.2 and passes with them; the recorded macOS dark
  figures are asserted, not quoted.
- No colour, type, metric, elevation, motion, platform-style or recipe value
  moves.
- `TODO.md`, `COMPONENTS.md` and the plan index are current.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 6. Candidates left out (and why)

- **A dedicated `caret` role (71st role).** The caret is the only consumer, every
  platform style and recipe would have to name it, and `primaryText` already
  measures ≥5.587:1 on exactly the surfaces a field sits on. A role for a 1px
  line is more surface than the problem needs.
- **Darkening macOS dark's `selected` and `active` fills.** Both are tuned for
  `selectedForeground`, the selection wash and the pointer ladder (plans 381,
  506, 525); moving them to rescue a fill used as ink would pull text pairs that
  currently pass and invert the intended fix.
- **Moving `primary` in macOS dark.** It is a fill with four measured steps and
  an on-colour foreground; the caret is the composition that is wrong, not the
  fill.
- **A caret on the four soft status fills.** A field paints its own `input` fill,
  so an inline validation block's field still shows the caret on `input`. A
  transparent field inside a soft status fill is not a documented composition;
  revisit if one ships.

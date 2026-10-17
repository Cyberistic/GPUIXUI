# 074 — The state washes and floating surfaces the contrast contract never checked

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility contract) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `013` (high contrast), `057` (status text), `059` (contrast completeness), `063` (platform styles), `071` (contrast contract), `073` (declared contrast) |
| Status | done |

This plan is self-contained. A weaker executor can follow it in order.

---

## 1. Why

`contrastPairs` in `packages/tokens/src/contrast.ts` is the library's public
accessibility contract: `color.test.ts` runs every pair against all four shipped
colour sets, `platforms.test.ts` runs them against every platform variant, and
`themeContrastFailures(theme)` gives a consumer the same check for an edited
theme. Its JSDoc calls the list "every documented text, status and boundary
pair", and `docs/tokens.md` repeats that the suite fails if "a semantic
text/surface pair drops below its floor".

The list never checks three situations the design system's own state table
describes:

1. **The focus ring on a tinted row.** `ring` is measured against `background`,
   `card` and `popover` only. Focus and selection co-occur in every row-based
   component — a list item, a table row, a tree node — and a focused row paints
   the ring over `hover`, `active` or `selected`, not over the canvas. A ring
   that clears the canvas can still disappear into a selected row; that is the
   classic "where did focus go" defect, and the contract cannot see it.
2. **An input inside a floating surface.** `borderStrong` is measured against
   `background`, `card` and `input`. A control in a dialog, popover or toast
   paints on `popover`, and `popover` is a different colour from both surfaces
   in dark mode.
3. **Status text inside a floating surface.** `xText` is measured against
   `background` and `card` only, although the `xText` role is defined as status
   text "on a plain surface". A status label in an alert dialog or a toast sits
   on `popover`.

Each is a real pair, not a hypothetical: the state table in
`docs/design-system.md` §8 names `hover`/`active`/`selected` as focus
destinations, and the layering model names dialogs, popovers and toasts as
surfaces. The contract was simply written before those surfaces existed.

**Measured on the pinned package — all eight missing pairs already pass in all
four colour sets**, at the floors their class demands:

| Pair | Class | light | dark | HC light | HC dark |
| ---- | ----- | ----- | ---- | -------- | ------- |
| `ring` on `hover` | boundary | 3.72 | 6.97 | 6.70 | 8.67 |
| `ring` on `active` | boundary | 3.34 | 6.16 | 5.64 | 6.94 |
| `ring` on `selected` | boundary | 3.72 | 6.14 | 6.49 | 10.75 |
| `borderStrong` on `popover` | boundary | 3.31 | 3.18 | 8.23 | 7.04 |
| `infoText` on `popover` | secondary | 8.42 | 10.45 | 12.72 | 15.09 |
| `successText` on `popover` | secondary | 6.63 | 11.38 | 12.76 | 16.16 |
| `warningText` on `popover` | secondary | 5.76 | 11.47 | 8.48 | 16.15 |
| `destructiveText` on `popover` | secondary | 7.21 | 10.10 | 13.26 | 14.91 |

So the change **tunes no colour in the identity**. It closes a blind spot: a
future palette edit that drops any of these pairs below its floor now fails the
gate instead of shipping.

One platform variant already misses one of them. macOS dark paints
`ring: #0A84FF` on its `active` wash `#48484A` — **2.50:1**, under the 3:1
boundary floor — so this plan also corrects that ring to `#409CFF` (3.26:1),
the style's own hovered accent. That is the defect class the contract exists to
catch, found by the contract rather than by a screenshot.

## 2. Design decision

1. **Extend `contrastPairs` by eight entries.** No new token, no new helper, no
   new dependency. The pair list is the contract; it grows the way plans 059,
   063 and 071 grew it.
2. **Keep each new pair in its family's place** so the list stays readable:
   `ring` on the washes beside `foreground` on the washes and
   `selectedForeground` on `selected`; `xText` on `popover` beside the
   `background`/`card` pairs; `borderStrong` on `popover` beside the existing
   boundary pairs.
3. **No `mutedForeground` on the washes.** That would widen a documented
   semantic ("secondary text on `muted` and on `background`") without a
   documented surface; ghost text on a wash is already checked as `foreground`.
   The plan adds only pairs the state table and the layering model already
   describe.
4. **The contract count moves from 40 to 48.** `contrast.test.ts` already
   asserts the exact length and that no pair is duplicated; both statements keep
   their meaning.
5. **The example stays one file.** `contrast.example.ts` gains one broken theme
   whose focus ring is a surface tint rather than a contrast ring, so the new
   pair is demonstrated by a runnable value rather than described in prose.
6. **The new pair found one real defect, and the palette is corrected.** macOS
   dark painted `ring: #0A84FF` over its `active` wash (`#48484A`): **2.50:1**,
   under the 3:1 boundary floor. The ring steps up to `#409CFF` — the style's
   own hovered accent — which measures **3.26:1**. Dropping the pair or lowering
   the floor would have hidden an invisible focus ring on a pressed row; the
   colour moves, the contract does not.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/074-contrast-state-and-overlay-surfaces.md` | **create** (this file) |
| `packages/tokens/src/contrast.ts` | **edit** — eight pairs in their family's place |
| `packages/tokens/src/contrast.test.ts` | **edit** — header count, `40 → 48`, the ring-on-washes regression test |
| `packages/tokens/src/contrast.example.ts` | **edit** — `quietRingTheme` and `quietRingFailures` |
| `packages/tokens/src/platform-styles/macos.ts` | **edit** — dark `ring` `#0A84FF → #409CFF` (the new pair measured 2.50:1 on `active`) |
| `packages/tokens/src/color.ts` | **edit** — the four `xText` JSDoc lines name `popover` |
| `packages/tokens/src/docs.test.ts` | **edit** — the §9 rows and one verification sentence |
| `packages/tokens/README.md` | **edit** — one sentence under *Checking a theme* |
| `packages/tokens/src/readme.test.ts` | **edit** — guard that sentence |
| `docs/tokens.md` | **edit** — verification, the `xText` rows and the status-tone paragraph |
| `docs/design-system.md` | **edit** — §9's status and boundary rows |
| `COMPONENTS.md` | **edit** — the *Theme contrast check* row: 48 pairs, state washes, popover |
| `TODO.md` | **edit** — tick the task, correct the section bar and the corrupted BLOCKERS sentence |
| `.agents/slop/plans/README.md` | **edit** — the `074` row and its explanation |

## 4. The implementation

`src/contrast.ts` — insert into `contrastPairs` (final order shown around the
insertion points, not the whole list):

```ts
  ["inputForeground", "input", "body"],
  ["foreground", "hover", "body"],
  ["foreground", "active", "body"],
  ["ring", "hover", "boundary"],
  ["ring", "active", "boundary"],
  // …
  ["selectedForeground", "selected", "secondary"],
  ["ring", "selected", "boundary"],
  // …
  ["infoText", "background", "secondary"],
  ["infoText", "card", "secondary"],
  ["infoText", "popover", "secondary"],
  ["successText", "background", "secondary"],
  ["successText", "card", "secondary"],
  ["successText", "popover", "secondary"],
  ["warningText", "background", "secondary"],
  ["warningText", "card", "secondary"],
  ["warningText", "popover", "secondary"],
  ["destructiveText", "background", "secondary"],
  ["destructiveText", "card", "secondary"],
  ["destructiveText", "popover", "secondary"],
  // …
  ["borderStrong", "background", "boundary"],
  ["borderStrong", "card", "boundary"],
  ["borderStrong", "input", "boundary"],
  ["borderStrong", "popover", "boundary"],
  ["ring", "background", "boundary"],
  ["ring", "card", "boundary"],
  ["ring", "popover", "boundary"],
```

The array ends at **48** entries. Update the module doc's "documented pairs"
wording only if it states a number (it does not; `contrast.test.ts` does).

`contrast.example.ts` — append:

```ts
/**
 * A theme whose focus ring is a surface tint: it passes as a fill, not as a
 * ring. Focus and selection co-occur, so the check measures the ring on the
 * washes a focused row paints, not only on the canvas.
 */
export const quietRingTheme = extendTheme(getTheme("light"), {
  name: "Quiet ring",
  colors: { ring: "#EFF4FF" },
});

/** Every pair the quiet ring misses, washes included. */
export const quietRingFailures = themeContrastFailures(quietRingTheme);
```

`#EFF4FF` is the light theme's `selected`, so the ring is invisible on the
selected row while still measured against the canvas. Do not change the value
without re-running test 3: the expected background list is exact.

## 5. Tests

`contrast.test.ts`:

1. **Header comment** — replace "the 41 documented pairs" with "the 48
   documented pairs" (the old text already disagreed with the assertion).
2. **`covers every documented pair`** — `toBe(40)` becomes `toBe(48)`; the
   uniqueness assertion stays. Removing any pair fails here.
3. **New: "checks the focus ring on the washes a focused row paints"** —
   `themeContrastFailures(quietRingTheme)` filtered to `foreground === "ring"`
   has exactly the backgrounds
   `["active", "background", "card", "hover", "popover", "selected"]`
   (sorted), every one at `pairClass: "boundary"` and `floor: 3`. Delete the
   `ring`/`hover`, `ring`/`active` or `ring`/`selected` pair and the list loses
   an entry, so the test fails.
4. The example is used in the assertion, so the documented value is the tested
   one.

`color.test.ts` needs no edit: it iterates `contrastPairs`, so the eight new
pairs add 32 tests (8 pairs × 4 colour sets). `platforms.test.ts` needs no edit
either: it runs the same pairs against each real platform variant, adding 48
(8 pairs × 3 platforms × 2 modes); the suite is where the macOS dark ring defect
surfaced. The three new assertions below (ring washes, catalogue sentence,
README sentence) bring the total from 656 to **739**.

`docs.test.ts`:

5. Update the §9 builders to the new sentences (below). A design-system edit
   that drops the washes or `popover` fails.
6. Add one assertion that `docs/tokens.md` states the two surfaces the contract
   now covers — use the exact verification sentence built below, so the
   catalogue cannot claim a narrower contract than the package enforces.

`readme.test.ts`:

7. Require the new README sentence verbatim (collapsed whitespace):
   "The focus ring is checked on the canvas, card, popover and the `hover`,
   `active` and `selected` washes, so a ring that vanishes on a selected row is
   caught."

## 6. Documentation edits

`docs/tokens.md`:

- **Colour roles table**, the four `xText` rows: "… on `background`/`card`"
  becomes "… on `background`/`card`/`popover`".
- **Status tones**, first paragraph: "drawn directly on `background` or `card`"
  becomes "drawn directly on `background`, `card` or `popover`"; the
  `tone.text` comment becomes "labels and dots on background/card/popover".
- **Verification**, after the floor sentence: "The focus ring is measured on the
  canvas, card and popover and on the `hover`, `active` and `selected` washes,
  because focus and selection co-occur in rows; status text (`xText`) and the
  `borderStrong` boundary are also measured on `popover`, so a status label or a
  control inside a dialog, popover or toast is covered." That is the exact
  sentence `docs.test.ts` requires.

`docs/design-system.md` §9 table:

- Status row: `| status text (\`xText\`) on \`background\`/\`card\`/\`popover\` | … |`
- Boundary row: `| focus ring and essential boundaries, including the ring on the \`hover\`/\`active\`/\`selected\` washes and a control boundary on \`popover\` | … |`

`packages/tokens/README.md`, *Checking a theme*: the sentence guarded by test 7.

`COMPONENTS.md`, *Theme contrast check* row: "the same 48 pairs" (was 40) and
"the selection wash is measured composited over `background` and `card`, the
focus ring on the `hover`/`active`/`selected` washes, and status text and the
control boundary on `popover`".

`TODO.md`:

- Add and tick: "Extend the contrast contract to the surfaces the state table
  and the layering model already name — the focus ring on the
  `hover`/`active`/`selected` washes, status text and the control boundary on
  `popover` — so an edited theme is held to the pairs an app actually paints
  (plan 074)".
- Recount the section bar (see §7).
- Repair the corrupted BLOCKERS sentence at the end of the file to
  "Both are specified in `~/GPUIXUI/BLOCKERS.md`; each fix starts with a plan
  under `.agents/slop/plans/`."

`.agents/slop/plans/README.md`: the `074` index row and a paragraph explaining
why the eight pairs were missing (focus/selection co-occurrence, controls and
status text inside floating surfaces).

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; 656 → 739 tests
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run fmt                                    # exit 0
nub run test                                   # exit 0
```

Recount the tokens section's bar:

```sh
awk '/### Design tokens and theming/{f=1} /## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[x\]`'   # done, including the bar line
awk '/### Design tokens and theming/{f=1} /## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[ \]`'   # pending
awk '/### Design tokens and theming/{f=1} /## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[!\]`'   # blocked
```

Before this plan the section held 40 done / 14 pending / 2 blocked = 56 tasks
against a bar labelled `40/56`. After the new ticked row it is 41 / 14 / 2 = 57,
so the bar becomes `41/57`, 7 of 10 cells. The `grep -c` above counts the bar
line itself as a `[x]` row, so subtract one from its output for the task count.

## 8. STOP conditions

Stop and report if:

- any of the eight pairs fails in a shipped or platform theme — that is a real
  contrast defect, not a mis-measurement. Report the ratio and the colour set;
  do **not** lower a floor or drop a pair to stay green;
- a pair would need a new colour role — these are existing roles on existing
  surfaces, so a missing role means the surface is not modelled; stop;
- `themeContrastFailures` would have to become effectful or return `Result` —
  the package ships zero runtime dependencies and an empty array is the
  documented success value;
- the design-system row guard cannot be written by string equality — the file
  is collapsed with `replace(/\s+/g, " ")` and the rows are single lines; do not
  add a Markdown parser;
- the test count after the change is not exactly 739 (656 + 8 × 4 in
  `color.test.ts`, 8 × 6 in `platforms.test.ts`, 3 new assertions) — recheck
  that both suites iterate `contrastPairs` rather than a local copy.

## 9. Test plan and both directions

1. Delete `["ring", "selected", "boundary"]` → test 3's expected list loses
   `selected` and fails; test 2 fails on the count. Restore.
2. Delete `["infoText", "popover", "secondary"]` → test 2 fails (47 ≠ 48).
   Restore.
3. Change `quietRingTheme.colors.ring` back to the default
   `lightTheme.colors.ring` → test 3's background list becomes empty and fails.
   Restore.
4. Drop `popover` from the design-system status row → test 5 fails. Restore.
5. Delete the verification sentence from `docs/tokens.md` → test 6 fails.
   Restore.
6. Delete the README sentence → test 7 fails. Restore.
7. Set the bar back to `40/56` → it no longer counts the new ticked row, so the
   section's done count (41) and total (57) disagree with the label. Restore.
8. Revert the macOS dark `ring` to `#0A84FF` → `platforms.test.ts` fails with
   `darwin dark: ring on active meets 3:1` at 2.50. Restore.

## 10. Acceptance criteria

- `contrastPairs` has 48 unique entries; the eight new pairs are exactly the
  focus ring on `hover`/`active`/`selected`, `borderStrong` on `popover`, and
  the four `xText` roles on `popover`.
- Every shipped theme, every platform variant and every high-contrast variant
  still passes `themeContrastFailures`; the macOS dark ring is corrected from
  `#0A84FF` to `#409CFF` because the new pair measured 2.50:1 on `active`.
- A theme whose ring is a surface tint fails with the selected row named.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
  `COMPONENTS.md` state the widened contract; the design-system rows, the
  catalogue sentence and the README sentence are guarded by tests.
- `TODO.md` carries the ticked task and an honest bar, and its BLOCKERS
  sentence is no longer corrupted.
- The gate commands exit 0.

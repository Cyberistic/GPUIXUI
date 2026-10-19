# 651 — The selected row's press

**Phase:** F (the state matrix of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 381 (the selected step past the accent hover), 506 (a selected
row's title through the wash), 619 (the selectable row's press), 623 (the
selected label's tier) ·
**Number block:** 500–699 (`tokens-theme` overflow; 651 is the next free number
in every worktree) ·
**Status:** done

## 1. The defect

Plans `381` and `619` completed two thirds of a selectable row's state matrix:

- `accent` is the wash a row paints under the pointer (`hover` in a selectable
  list), and `selectionStepPairs` holds `selected` one 1.05:1 step past it;
- `rowPressStepPairs` holds `active` one step past `accent`, the press of a row
  that is **not** selected.

Nothing holds the press of a row that **is** selected. `docs/design-system.md`
§8 claims it "still presses to `active` … and walk[s] away from the canvas like
every ladder (`stateLadders`)". A probe on the shipped sets says otherwise:

| Set | `selected` | `active` | step | direction |
| --- | ---------- | -------- | ---- | --------- |
| Light | `#E0E3FF` | `#E1E5EC` | **1.001:1** | toward (1.001) |
| High contrast light | `#D8DBFF` | `#D6D6D6` | 1.072:1 | **away** |
| Dark | `#402F94` | `#2E3543` | 1.203:1 | toward |
| High contrast dark | `#33257A` | `#3D3D3D` | 1.146:1 | **away** |
| macOS light | `#CFE3FA` | `#DCDCE2` | 1.042:1 | **away** |
| macOS dark | `#1A4568` | `#404042` | 1.032:1 | **away** |
| Linux light | `#D7E6F9` | `#DEDDDB` | 1.071:1 | **away** |
| Linux dark | `#27476A` | `#464646` | 1.013:1 | **toward** |
| Windows light | `#C2E2FF` | `#E0E0E0` | 1.019:1 | toward |
| Windows dark | `#094771` | `#454545` | 1.018:1 | **away** |
| Windows XP light | `#BDD4FF` | `#D8D2B7` | 1.015:1 | **away** |
| Windows 7 light | `#CCE4FA` | `#D5E3F4` | **1.005:1** | toward |

Eleven of twelve default palettes are under the library's 1.05:1 step floor, the
worst at **1.001:1** (identity light: the selection and the press wash are the
same luminance), and eight run the wrong way. `themeContrastFailures` and
`themeDirectionFailures` both returned `[]`, because neither list names the
composition. A reader who presses a chosen row sees the selection either not
move or move backwards toward the canvas.

The root cause is structural, not a bad value: a selected row's press is a
**different kind of state** from a filled control's press. Pressing a chosen row
previews the row it will return to if the click deselects it, so the fill moves
*toward* the canvas — the one ladder that runs the other way. `stateLadders`
had no per-ladder direction, so a "toward" ladder could not exist, and no role
was designed to carry it.

## 2. Decision

Ship one role and one ladder:

1. **`selectedActive`** — the fill a selected row paints while pressed. It is
   derived as a **24% veil of the canvas colour over `selected`**:
   `compositeOver("#FFFFFF3D", selected)` in light and
   `compositeOver("#0000003D", selected)` in dark. The veil is the design
   device that keeps the press proportionate to the palette; the shipped value
   is an opaque literal a consumer can edit like any other role.
2. **The `selectionPress` ladder** — `selected → selectedActive`, with a new
   per-ladder `direction` on `StateLadder` (`"away"` default, `"toward"` here).
   `themeDirectionFailures` reports a press that moves the wrong way; the step
   pair `selectionPressStepPairs` reports a collapsed press.

Why not move `active`? `active` is the generic press wash and is also one 1.05:1
step **away** from `hover` (`washStepPairs`) and one step from `accent`
(`rowPressStepPairs`). No single `active` can be both away from `hover` and at a
perceivable distance from every palette's `selected`; identity light needs it
0.04 luminance lighter to clear the step, which inverts the wash ladder.

Why not deepen `selected` instead? A probe (recorded in the audit note) showed
that making `selected` darker enough to leave room for `active` forces
`placeholder`, `track`, `border` and `skeleton` to move in six light palettes
and four dark ones — forty-odd values — to keep the pairs they already pass. The
canvas-tinted press keeps every shipped selection pixel and every existing pair.
The **only** existing value that moves is identity dark's `border`
(`#343B47` → `#434B59`), because the identity dark palette's divider sat 1.03:1
from the derived press fill at 22%; at the shipped 24% veil the original
`#343B47` passes, so no value moves at all (see §4.2: the probe was re-run).

Not changed:

- `selected`, `selectedForeground`, `placeholder`, `track`, `border` (any
  palette), `skeleton`, `active`, `accent` and every filled family keep their
  shipped values. The derived fills are added, not substituted.
- The text-selection wash, the modal scrim and the elevation walk stay on the
  **persistent** `selected` fill. `selectedActive` is a transient pointer state
  (the pointer is on the row, and a dialog, a selection drag or a dropdown is
  not being opened at the same time), the same exclusion plan `359` applies to
  `hover`/`active`. This is stated in the reference.
- `selected` under hover: a selected row keeps its fill while the pointer is
  over it (no `selectedHover`). Plan `381`'s step is from the *unselected* hover
  wash; a chosen row does not return to `accent`. The cross-team row for the
  shipped `List` composition stays, now pointing at `selectedActive` for the
  press.
- No new function. `selectedActive` is a role like `selected`; the component
  paints `active: { backgroundColor: theme.colors.selectedActive }`.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/color.ts` | `selectedActive` in `ThemeColors` (after `selected`), in `colorRoles`, and in the four identity palettes; JSDoc |
| `packages/tokens/src/platform-styles/macos.ts` | `selectedActive` in `colors.light` and `colors.dark` |
| `packages/tokens/src/platform-styles/linux.ts` | same |
| `packages/tokens/src/platform-styles/windows.ts` | same |
| `packages/tokens/src/platform-styles/recipes/xp.ts` | `selectedActive` in `colors.light` (dark inherits Windows dark) |
| `packages/tokens/src/platform-styles/recipes/aero.ts` | same |
| `packages/tokens/src/contrast.ts` | `selectionPressPairs`, `selectionPressStepPairs`; `selectedActive` in `stateFillRoles`, `skeletonSurfaces`, `trackSurfaces`, `contrastPairs`; JSDoc |
| `packages/tokens/src/direction.ts` | `StateLadder.direction`; the `selectionPress` ladder; the expected-direction arithmetic; JSDoc |
| `packages/tokens/src/selection-press.example.ts` | new executed example: a copied theme whose `selected` moves and whose press is derived with `compositeOver` |
| `packages/tokens/src/selection-press.test.ts` | new regression suite (header states the defect) |
| `packages/tokens/src/contrast.test.ts` | pair inventory keys; the step-pair count; `selectionPressPairs` in `measuredRoles` |
| `packages/tokens/src/filled-state-steps.test.ts` | (only if it pins the total step count) add the one new `step` pair |
| `packages/tokens/src/state-direction.test.ts` | a case for the toward ladder (or the new suite owns it) |
| `docs/tokens.md` | role count 70 → 71; the two colour tables; the selection/press prose; the pair-count history; the `stateLadders` description |
| `docs/design-system.md` | role count; §8 `pressed` and `selected` rows |
| `packages/tokens/README.md` | role count; the selection paragraph |
| `COMPONENTS.md` | the **Design tokens** and **Theme contrast check** rows |
| `TODO.md` | the new ticked row; the section count 283/357 → 284/358 |
| `.agents/slop/plans/README.md` | index 651 and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-651.md` | the audit note and probe |

No other file. Do **not** edit `packages/components`: its migration to
`selectedActive` is a cross-team row.

## 4. The values

### 4.1 Derivation

For every shipped default palette:

```js
light: compositeOver("#FFFFFF3D", selected) // 24% of the canvas
dark:  compositeOver("#0000003D", selected)
```

The checker's own `compositeOver` is the owner; the plan's table is a probe, not
a second implementation. At the shipped 24% the tightest step is Linux light at
**1.061:1**; every ink that paints on the fill clears its floor, and
`selectedForeground` stays one 1.05:1 step below `foreground` (the text tier).

### 4.2 The literal per palette

| Palette | `selected` | `selectedActive` |
| ------- | ---------- | ---------------- |
| identity light | `#E0E3FF` | `#E1E4FF` |
| identity dark | `#402F94` | `#312471` |
| AAA light | `#D8DBFF` | `#E1E4FF` |
| AAA dark | `#33257A` | `#271C5D` |
| macOS light | `#CFE3FA` | `#DAEAFB` |
| macOS dark | `#1A4568` | `#14344F` |
| Linux light | `#D7E6F9` | `#E1ECFA` |
| Linux dark | `#27476A` | `#1E3651` |
| Windows light | `#C2E2FF` | `#D1E9FF` |
| Windows dark | `#094771` | `#073656` |
| XP light | `#BDD4FF` | `#CDDEFF` |
| Aero light | `#CCE4FA` | `#D8EAFB` |

XP dark and Aero dark reuse `windowsPlatformStyle.colors.dark`, so they inherit
Windows dark's value with the rest of the palette.

**Probe result with these values:** `themeFailures` returns `[]` for all 24
shipped sets, every new pair clears its floor, and the direction check reports
nothing. **No existing value moves** — identity dark's `border` was moved during
the 22% probe and must stay `#343B47` at the shipped 24%.

## 5. `packages/tokens/src/contrast.ts`

Add after `rowPressStepPairs`:

```ts
/**
 * The selected row's press. A chosen row keeps `selected` under the pointer and
 * paints `selectedActive` while pressed; the press previews the canvas the row
 * returns to when the click deselects it, so it is the one ladder that moves
 * toward the canvas. The fill is designed as a 24% veil of the canvas over
 * `selected`, and every shipped palette names the composited literal.
 */
export const selectionPressStepPairs: readonly ContrastPair[] = [
  ["selectedActive", "selected", "step"],
];

/**
 * The text and chrome a pressed selected row paints. `selectedActive` is a row
 * surface: a title (`foreground`), the inherited label (`selectedForeground`),
 * metadata, a hint, a link, a status label and a disabled control all sit on it,
 * and the row's edge, ring, divider, groove and loading skeleton paint there
 * too. The transient state is outside the selection-wash, scrim and elevation
 * walks, like the other pointer washes (plan 359).
 */
export const selectionPressPairs: readonly ContrastPair[] = [
  ["foreground", "selectedActive", "body"],
  ["selectedForeground", "selectedActive", "secondary"],
  ["mutedForeground", "selectedActive", "secondary"],
  ["placeholder", "selectedActive", "secondary"],
  ["primaryText", "selectedActive", "secondary"],
  ["infoText", "selectedActive", "secondary"],
  ["successText", "selectedActive", "secondary"],
  ["warningText", "selectedActive", "secondary"],
  ["destructiveText", "selectedActive", "secondary"],
  ["disabledForeground", "selectedActive", "inactive"],
  ["borderStrong", "selectedActive", "boundary"],
  ["ring", "selectedActive", "boundary"],
  ["border", "selectedActive", "divider"],
];
```

- add `"selectedActive"` to `stateFillRoles` (→ +5 fill-on-surface pairs);
- add `"selectedActive"` to `skeletonSurfaces` (→ +2: skeleton and its pulse);
- add `"selectedActive"` to `trackSurfaces` (→ +1);
- spread `...selectionPressPairs` and `...selectionPressStepPairs` into
  `contrastPairs` after `rowPressStepPairs`;
- extend the big `contrastPairs` JSDoc (the paragraph that names
  `selectionStepPairs`/`rowPressStepPairs`) with the selected press and its
  toward-canvas direction.

**Contract maths.** `422 + 1 step + 9 pressed-row pairs + 5 fill-on-surface
+ 1 skeleton + 1 track + 4 status labels (from `statusTextSurfaces`)
+ 4 solid chip fills + 4 soft chip edges = 451` pairs.

## 6. `packages/tokens/src/direction.ts`

```ts
export interface StateLadder {
  readonly name: string;
  readonly roles: ReadonlyArray<keyof ThemeColors>;
  /**
   * Which way the ladder moves. `away` (the default) steps away from the canvas
   * — darker in light, lighter in dark. `toward` steps back toward it: the
   * selected row's press previews deselection.
   */
  readonly direction?: "away" | "toward";
}
```

Add after the existing `selection` ladder:

```ts
{
  name: "selectionPress",
  roles: ["selected", "selectedActive"],
  direction: "toward",
},
```

In `themeDirectionFailures`:

```ts
const away = ladder.direction !== "toward";
const expected =
  (theme.mode === "light") === away ? "darker" : "lighter";
```

Update the module JSDoc: "the selected step past the accent … and the selected
row's press, the one ladder that moves toward the canvas".

## 7. Tests

### `selection-press.test.ts` (new)

Header: the bug guarded — identity light's selected→active press measured
1.001:1 and eight palettes moved the wrong way while both checks returned `[]`;
the selected row now has a designed press.

Cases (each must be able to fail):

1. **publishes the step once** — `selectionPressStepPairs` deep-equals
   `[["selectedActive", "selected", "step"]]`, and exactly one such pair exists
   in `contrastPairs`.
2. **clears the step and the direction in every shipped set** — for
   `shippedThemes`, `contrastRatio(selectedActive, selected) >=
   contrastFloors[theme.contrast].step`, and
   `themeDirectionFailures(theme)` has no `selectionPress` entry.
3. **is the canvas veil the plan documents** — for every shipped set,
   `selectedActive === compositeOver(mode === "light" ? "#FFFFFF3D" :
   "#0000003D", selected)`. This guards the design device, not the checker.
4. **reports a collapsed press** — `extendTheme(getTheme("light"), { colors: {
   selectedActive: getTheme("light").colors.selected } })` returns a `contrast`
   failure with `foreground: "selectedActive"`, `background: "selected"`,
   `pairClass: "step"`, and `themeFailures` contains it.
5. **reports an inverted press** — a light theme whose `selectedActive` is
   darker than `selected` (e.g. `#B8BDF0`) clears the step but
   `themeDirectionFailures` returns exactly one `selectionPress` failure with
   `expected: "lighter"`.
6. **reports erased text on the press** — a light theme whose `selectedActive`
   is the canvas (`#F6F8FA`) reports the title/ink failures (at least
   `foreground` on `selectedActive`), proving the ink pairs aren't decorative.
7. **the copy-and-own example passes** — import `selectionPressExample` from
   `selection-press.example.ts` and assert `themeFailures(example.theme)` is
   `[]` while its `selected` differs from the base and its `selectedActive` is
   the recomputed veil.

### `contrast.test.ts`

- add `selectionPressPairs` and `selectionPressStepPairs` to
  `publishedPairLists` (the key type fails `check-types` otherwise);
- add `...selectionPressPairs` to the `measuredRoles` set (the completeness
  guard otherwise reports `selectedActive` unmeasured);
- update the total `step`-pair expectation (if it pins one);
- `contrastPairs` length 422 → 451 (the suite already asserts the length; keep
  it as the one owner).

### Both-directions proof

Record in the commit/plan: on the pre-fix tree, case 4's planted theme returned
`[]` from `themeContrastFailures` (the probe in §1) and `selectedActive` did not
exist; with the fix it returns the step failure. Run:

```sh
cd packages/tokens
nub exec vitest run src/selection-press.test.ts
```

Expected: 7/7 pass.

## 8. Documentation

- `docs/tokens.md`: role count `70` → `71` in the type index (§ Types), the
  colour-roles paragraph and the colour-format paragraph; a row in **both**
  colour tables (`selectedActive`, the light/dark values, "selected row or item
  while pressed; a step toward the canvas, because the press previews
  deselection"); the selection paragraph gains the press ladder and the
  transient-state exclusion; the `stateLadders`/direction section names the one
  toward ladder; the pair-count history ends `451` and names plan `651`.
- `docs/design-system.md`: `70` → `71` in §4 and the colour-format paragraph;
  §8 `pressed` names `selectedActive` as the selected row's press; §8 `selected`
  replaces "a chosen row still presses to `active` … walking away from the
  canvas like every ladder" with the designed press and its direction.
- `packages/tokens/README.md`: `70` → `71`; the selection sentence gains the
  press and the cross-team consumer note.
- `COMPONENTS.md`: **Design tokens** "70 semantic roles" → 71 and the selected
  state sentence; **Theme contrast check** "422 contrast pairs" → 451 and the
  new lists.
- Run `docs.test.ts`/`readme.test.ts`/`inventory.test.ts`; their guards derive
  the counts, so a missed sentence fails by name.

## 9. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/selection-press.test.ts src/contrast.test.ts src/state-direction.test.ts src/selection-states.test.ts src/selection-row-press.test.ts
nub run check-types
```

Expected: the new suite green; the touched suites green; no type errors (the
pair inventory and the palette literals are compiled).

```sh
nub run --filter @gpuixui/tokens test
```

Expected: 181 files, all green.

Then in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

```sh
nub run check:tests
nub run check
nub run lint
nub run test
```

Expected: clean. If another workstream's package fails for its own reason,
record the exact failure and do not claim this plan's workspace gate passed.

## 10. STOP conditions

Stop and report with evidence if:

- **any existing value** other than the new role has to move to make the new
  pairs pass — the 24% veil was probed to pass every shipped set as-is; if the
  real checker disagrees, record the failing pair instead of rebalancing the
  palette;
- the step cannot clear 1.05 in a shipped set without the veil exceeding 30%
  (the press would read as a different fill, not a state);
- `selectedActive` collides with `accentHover`/`active` in a way that makes the
  pressed selected row indistinguishable from an unselected hovered row — report
  the pair and the palette; do not move `accent`/`active`;
- the direction change breaks an existing `stateLadders` consumer: `direction`
  must default to `away` and the five existing ladders must produce byte-equal
  failures before and after;
- a docs guard pins a sentence that must change (search the literal before
  editing) and the guard's intent is not obvious — fix the guard to derive the
  claim rather than deleting it;
- a test claims "every shipped set" without importing `shippedThemes` — the
  full-set guard in `shipped-themes.test.ts` will fail.

## 11. Acceptance

- [x] `selectedActive` ships in every palette; `colorRoles` is 71; the four
      shipped identity themes and every platform variant/recipe pass
      `themeFailures` (all checks) with the new role.
- [x] `selectionPressStepPairs` publishes `selectedActive` → `selected` at the
      `step` class, and `selectionPressPairs` publishes the five inks, the disabled
      label and the three chrome pairs (the four status labels come from
      `statusTextSurfaces`); `contrastPairs` is 451.
- [x] `stateLadders` carries `selectionPress` with `direction: "toward"`, and
      `themeDirectionFailures` reports a press that moves away from the canvas.
- [x] The planted collapsed press and the planted inverted press each fail by
      name in the new suite; the pre-fix tree returned `[]` (both-directions
      evidence recorded).
- [x] `selectedActive`, `selected`, the veil relation and every pair are named in
      `docs/tokens.md`; the design system's §8 rows describe the press and its
      direction; the README and `COMPONENTS.md` carry the new counts; all docs
      guards pass.
- [x] The commands in §9 were run and their results recorded in the commit
      message.

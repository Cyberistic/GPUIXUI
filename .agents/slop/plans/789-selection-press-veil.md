# 789 — The pressed selected row's veil is the mode's extreme, not the canvas

**Workstream:** `tokens-theme`. **Phase:** F (integration/truth).
**Owner paths:** `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `TODO.md` (the design-system rows), `.agents/slop/plans/`.

## 1. The defect

`selectedActive` — the fill a chosen row paints while the pointer is held — is
described in six current-state surfaces as **“a 24% veil of the canvas colour
over `selected`”**. The shipped value is not that. It is a 24% veil of the
**mode's extreme**: pure white in light, pure black in dark.

Evidence, measured with the package's own helpers
(`compositeOver(alpha(background, 0.24), selected)` against the shipped
`selectedActive`):

| Set | `background` | `selected` | canvas veil | shipped `selectedActive` | white veil |
| --- | --- | --- | --- | --- | --- |
| `Light` | `#F6F8FA` | `#E0E3FF` | `#E5E8FE` | `#E7EAFF` | `#E7EAFF` |
| `Dark` | `#11141A` | `#402F94` | `#352977` | `#312471` | — |
| `Dark` (black veil) | `#11141A` | `#402F94` | — | `#312471` | `#312471` |
| `High contrast light` | `#FFFFFF` | `#D8DBFF` | `#E1E4FF` | `#E1E4FF` | `#E1E4FF` |
| `High contrast dark` | `#000000` | `#33257A` | `#271C5D` | `#271C5D` | — |

The composition rule is already **executed and guarded**:
`packages/tokens/src/selection-press.example.ts` owns

```ts
export const selectionPressVeils = {
  light: "#FFFFFF3D",
  dark: "#0000003D",
} as const;
```

and `selection-press.test.ts` (“ships the canvas veil over every palette's
selection”) asserts every one of the 24 shipped sets equals
`compositeOver(selectionPressVeils[mode], selected)`. So the **values are
right and the prose is wrong**. The phrase survived because both AAA sets have a
pure-white / pure-black canvas, where the canvas veil and the extreme veil are
the same colour; the ten default-contrast sets disagree by 2–8 RGB.

Why it matters: a consumer following `docs/tokens.md`'s copy-and-own path edits
`selected` and derives the press from **their canvas**, and ships a different
fill. The 1.05:1 step, the direction ladder and every text pair still pass (the
error is a couple of bytes), so no check reports it — the same class of truth
defect plans 742/747/749/750 fixed for other roles.

## 2. Decision

Keep the shipped values (the mode's extreme is the designed rule and the example
already owns it). Correct the prose to name it, make the 24% executable, and
guard every current-state passage so “canvas” cannot come back.

Do **not** recompute the 24 literals from `background`: that would move 24
shipped colours and every pair derived from them for a documentation defect.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/selection-press.example.ts`

- Add the fraction and build the two veils from it, so “24%” has one owner:

```ts
/** The share of the mode's extreme a selected row's press adds. */
export const selectionPressVeilAmount = 0.24;

/**
 * The veil a selected row's press adds: a 24% veil of white in light and black
 * in dark over `selected`. A light press lightens and a dark press darkens,
 * because both preview the row the click returns to.
 *
 * The extreme, not the canvas: a default canvas is near-white or near-black, so
 * veiling the canvas itself is a different fill. The high-contrast sets are the
 * only ones where the two readings agree, which is why the older wording
 * survived.
 */
export const selectionPressVeils = {
  light: alpha("#FFFFFF", selectionPressVeilAmount),
  dark: alpha("#000000", selectionPressVeilAmount),
} as const;
```

- Import `alpha` from `./index.js` beside the existing imports (the example
  already imports from the entry module).
- Delete the old JSDoc sentence “The canvas-tinted veil … 24% of the canvas
  colour over `selected`”.

### 3.2 `packages/tokens/src/color.ts` — `ThemeColors.selectedActive`

Replace

> that steps **toward** the canvas: a 24% veil of the canvas colour over
> `selected`, shipped as an opaque, editable literal.

with

> that steps **toward** the canvas: a 24% veil of white in light and black in
> dark over `selected`, shipped as an opaque, editable literal.

### 3.3 `docs/tokens.md` — two places

- The `selectedActive` role row (its use cell): keep “a step toward the canvas,
  because the press previews deselection” (that is the direction, and it is
  true); no change needed to the cell if it carries no composition.
- The *chosen row* paragraph (currently “`selectedActive` is a 24% veil of the
  canvas colour over `selected`, shipped as an editable opaque literal in every
  palette.”): replace with

> `selectedActive` is a 24% veil of white in light and black in dark over
> `selected`, shipped as an editable opaque literal in every palette. The veil
> is the mode's extreme rather than the canvas value — a default canvas is
> near-white or near-black, so deriving the press from `background` is a
> different fill; the high-contrast sets are where the two agree.

### 3.4 `docs/design-system.md` — two places

- §8 table, `pressed` row: “a 24% canvas veil over `selected` that previews
  deselection” → “a 24% veil of white in light and black in dark over
  `selected` that previews deselection”.
- §8 *selected row's press* paragraph: “`selectedActive` is a 24% veil of the
  canvas colour over `selected`, so it keeps the palette's proportion…” →
  “`selectedActive` is a 24% veil of white in light and black in dark over
  `selected`, so it keeps the palette's proportion…”.

### 3.5 `COMPONENTS.md` — two design-system rows

- **Design tokens**: “a 24% canvas veil over `selected` held one 1.05:1 step
  toward the canvas” → “a 24% veil of white in light and black in dark over
  `selected` held one 1.05:1 step toward the canvas”.
- **Theme contrast check** (the plan-651 history narrative): “`selectedActive`
  is a 24% canvas veil over `selected` and the one state ladder…” → the same
  corrected phrase. The history is kept (the plan number stays); only the
  refuted composition sentence changes.

### 3.6 `TODO.md` — two history rows

The plan-651 row and the later row that repeats its rule both say “24% canvas
veil”. Replace each with “a 24% veil of white in light and black in dark over
`selected`” (the surrounding sentence keeps its plan history). Add a new `[x]`
row for this plan under *Design tokens and theming*, worded like its siblings:

> `[x]` Hold the pressed selected row's veil to the value it ships — every
> current-state passage called `selectedActive` “a 24% veil of the canvas
> colour”, while all 24 shipped sets are the mode's extreme (white in light,
> black in dark) over `selected`; the veil is now derived from one fraction,
> every passage names the real composition, and `selection-press-claims.test.ts`
> proves the canvas is a different fill in ten default-contrast sets (plan 789)

### 3.7 `selection-press.test.ts`

- Header: “`selectedActive` is a 24% canvas veil over `selected`” → “a 24% veil
  of white in light and black in dark over `selected`”.
- Move the composition case (“ships the canvas veil over every palette's
  selection”, lines ~115–123) into the new claims file, so the veil rule has one
  owner; the file keeps the step/direction/ink cases. Remove the now-unused
  `selectionPressVeils` import only if nothing else uses it — it is still used
  by the copy-and-own example case, so keep it.

### 3.8 New `packages/tokens/src/selection-press-claims.test.ts`

Header comment states the bug (the prose says canvas; the value is the mode's
extreme; the AAA sets are why it looked true). Cases:

1. **“derives the veil from the fraction”** —
   `alpha("#FFFFFF", selectionPressVeilAmount)` and
   `alpha("#000000", selectionPressVeilAmount)` equal
   `selectionPressVeils.light` / `.dark`, and the bytes are `#FFFFFF3D` /
   `#0000003D`. Add: `alpha("#FFFFFF", 0.25)` is *not* the light veil, so the
   fraction is owned rather than decorative.
2. **“ships the mode's veil over every palette's selection”** — the moved case:
   every `shippedThemes` entry's `selectedActive` equals
   `compositeOver(selectionPressVeils[theme.mode], theme.colors.selected)`; a
   drift list rather than a loop of bare assertions so the failure names the
   set.
3. **“is not the canvas colour's veil”** — the regression evidence:
   `compositeOver(alpha(theme.colors.background, 0.24), theme.colors.selected)`
   differs from the shipped value for identity light and identity dark, and
   equals it for both AAA identity sets (where the canvas is the extreme). This
   case is what proves the old sentence false and pins why the wording survived.
4. **“names the mode's veil in every current passage”** — normalise whitespace
   and read:
   `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md`,
   `packages/tokens/src/color.ts`,
   `packages/tokens/src/selection-press.example.ts`,
   `packages/tokens/src/selection-press.test.ts`. Each must contain
   `24% veil of white in light and black in dark`, and none may contain
   `canvas veil`, `veil of the canvas` or `canvas-tinted`.
5. **“the refuted wording is detectable”** — call the predicate the scan uses on
   the old sentence and on the new one (true / false), so the guard has a case
   that fails if it becomes a no-op.

Use `node:fs` `readFileSync` deliberately, like `inventory.test.ts`: this is a
documentation test over the tree, and the package ships zero runtime deps.

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme

# 1. New guard fails on the current tree (before the prose edits):
nub exec vitest run packages/tokens/src/selection-press-claims.test.ts
#   expected: FAIL — the passage scan reports every file that still says
#   "canvas veil" / "veil of the canvas"; the composition cases pass.

# 2. Apply the edits, then:
nub run --filter @gpuixui/tokens test
#   expected: all files pass (the suite was 7053 tests / 210 files green before
#   this plan; the new file adds 5 cases).

nub run --filter @gpuixui/tokens check-types
#   expected: no output, exit 0.

# 3. Repository gates:
nub run check:tests
nub run lint
nub run fmt
nub run check-types
#   expected: exit 0. If fmt rewrites a line, re-run the tokens suite.
```

No playground scenario applies: this plan changes no runtime value. If a full
`nub run check` is run, it must be green.

## 5. STOP conditions

- **STOP** if the moved composition case does not already pass on the current
  tree: that means a shipped `selectedActive` is not the extreme veil, and this
  plan's premise is wrong. Report the failing set and do not edit prose.
- **STOP** if any of the six documents contains `canvas veil`/`canvas-tinted`
  in a passage this plan does not list. Report the file and line; do not
  blanket-replace.
- **STOP** if a docs guard (`docs.test.ts`, `inventory.test.ts`,
  `readme.test.ts`) fails after an edit. Read the assertion: if it pins the old
  sentence, update *that* assertion in the same plan and state why; if it
  catches a different drift, do not paper over it.
- **STOP** before changing a colour value. This plan moves no token; a failing
  pair means the prose fix is not the whole defect — report it.

## 6. Test plan (two directions)

| Direction | Action | Expected |
| --- | --- | --- |
| Fails without the fix | Add `selection-press-claims.test.ts` before editing any passage | passage case fails naming all seven files |
| Passes with the fix | Apply §3.1–3.8 | full tokens suite green |
| Fails without the value | Temporarily set `selectionPressVeilAmount = 0.25` (or change one shipped `selectedActive`) | fraction case / composition case fails naming the set |
| Fails on a regression of the old sentence | Temporarily restore one “24% canvas veil” phrase | passage scan fails naming that file |
| Direction preserved | The existing step/direction cases stay green | `selection-press.test.ts` unchanged in behaviour |

## 7. Acceptance

- `selectedActive` is described as a 24% veil of white in light and black in
  dark over `selected` on every current-state surface, and the AAA exception is
  explained once (why “canvas” looked true).
- The 24% fraction and the two bytes have one owner in the executed example.
- No colour, pair, floor, metric or shipped set moves; `contrastPairs` stays
  470.
- `docs/tokens.md`, `docs/design-system.md`, the package README (unchanged —
  it makes no veil claim), the ledger and the source JSDoc agree.
- `nub run --filter @gpuixui/tokens test`, `check-types`, `check:tests`, `lint`
  and `fmt` pass; commit on `agent/tokens-theme` and push.

# 610 — The scrim over the fills it excluded

**Workstream:** tokens-theme · **Phase:** F (contract closure) · **Depends on:**
099, 359, 375, 394, 395, 399, 508, 509, 584 · **Status:** done

## 1. The defect

The modal scrim is held to the 1.05:1 `surface` floor on every surface a window
shows: the six page layout surfaces and the twelve *content* fills
(`contentFillSurfaces`). Three fills are explicitly excluded, with this written
rationale in `contrast.ts`:

> `disabled`, `skeleton` and `track` are not the content a dialog opens over: a
> scrim that is invisible on a disabled control, a loading placeholder or a
> progress groove still dims the layout the reader is looking at.

That rationale is false for the exclusion it justifies. The scrim's job is to
make the **window behind it recede**; an element whose fill does not change under
the scrim does not recede and reads as if it sits above the modal (still live),
while the layout around it dims. This is exactly the defect plan 508 closed for
the three solid status chips — "a Badge is resting content a dialog opens over" —
and the same argument applies to the three excluded fills:

- `disabled` is the fill of a control that is **on screen** (a toolbar's
  disabled Save, a read-only field) when a rename or delete dialog opens. It is
  not a pointer state: it persists for as long as the control is unavailable.
- `skeleton` is a **loading placeholder row** a window shows while a dialog opens
  over it (a settings dialog over a list still loading). It is transient in
  time, not in pointer interaction — the two exclusions are not the same.
- `track` is the **unfilled groove** of a progress bar, meter or slider, a
  resting painted value indicator behind a modal.

A probe over the 24 shipped sets shows every one already passes the three
compositions, so no colour needs to move:

| Walk | Tightest shipped | Set / role |
| ---- | ---------------- | ---------- |
| scrim over the three fills | **1.284:1** | Dark · Windows / `track` |
| dialog face on the scrimmed fill | **1.155:1** | Dark / `skeleton` |
| floating `md` shadow over the fill | **1.245:1** | Dark · macOS / `track` |

The hole is a copy-and-own hole, which is what the public checker exists for. A
dark theme with `disabled`, `skeleton` and `track` set to `#000000` passes all
nine checks (`themeFailures` → `[]`) while the shipped black scrim composites to
**1.000:1** on each of them: the scrim is invisible on the disabled control, the
loading row and the progress groove.

This plan puts the three fills in `contentFillSurfaces`, so they join
`overlaySurfaces` (the scrim and the dialog face) and `elevationContentSurfaces`
(the floating `md` shadow) in one place. They are resting fills, not pointer
states: `hover`, `active` and the filled families' `xHover`/`xActive` remain
excluded for the plan-375 reason. No colour, floor, metric, platform style or
shipped theme changes.

## 2. Exact files and changes

### 2.1 `packages/tokens/src/contrast.ts`

In `contentFillSurfaces` (after `...softSurfaceRoles`), add:

```ts
  // Resting fills a window shows: a disabled control, a loading row and a
  // value indicator's groove. They are not pointer states — they persist while
  // a dialog is open — so the scrim must dim them with the window.
  "disabled",
  "skeleton",
  "track",
```

Update the `contentFillSurfaces` JSDoc paragraph: name the three new fills and
say they are resting, not transient.

Rewrite the `overlaySurfaces` JSDoc paragraph. Delete:

> `disabled`, `skeleton` and `track` are not the content a dialog opens over: a
> scrim that is invisible on a disabled control, a loading placeholder or a
> progress groove still dims the layout the reader is looking at.

Replace it with one sentence that says the three joins are resting fills — a
disabled control persists while the dialog is open, a loading row is on screen
behind it, a value groove is a painted indicator — and that only the pointer
states stay out.

Update the `elevationContentSurfaces` JSDoc: it now names fifteen resting fills
(a floating `md` menu opens over a disabled control, a loading row and a value
groove as readily as over an action).

Do not change `layoutSurfaces`, any pair class, floor, colour value or any other
list.

### 2.2 `packages/tokens/src/resting-fill-scrim.test.ts` (new)

Header states the bug being guarded: `disabled`, `skeleton` and `track` were
excluded from the scrim's surface list, so a copied theme whose scrim composited
to one of them (a black scrim over a black disabled fill) passed all nine checks
while the element was undimmed.

Cases:

1. **The three fills belong to every content surface list** — assert
   `overlaySurfaces`, `elevationContentSurfaces` and the backgrounds of
   `overlayWashPairs`, `dialogSurfacePairs` each contain `disabled`, `skeleton`
   and `track`. This case fails before the fix.
2. **The regression is reported** — build
   `extendTheme(getTheme("dark"), { colors: { disabled: "#000000", skeleton:
   "#000000", track: "#000000" } })`; it passes `themeFailures` before the fix.
   After the fix, `themeContrastFailures` must report, for each role, a
   `foreground: "overlay"`, `background: role` failure at ratio **1**. Assert
   the three failures exist and are tagged `wash: "overlay"`, `pairClass:
   "surface"`, and that `themeFailures` now returns them under `kind:
   "contrast"` (not another check). The same theme also produces the three
   `shadow` failures of case 4, so the contrast-kind total is six.
3. **Every shipped set clears the compositions** — for every `shippedThemes`
   entry, for each of the three roles, assert the scrim pair, the dialog-face
   pair and the `md` elevation pair are at least
   `contrastFloors[theme.contrast].surface`; label failures with `theme.name`
   and the role. Track the minimum scrim ratio and assert it is **above 1.2**
   (the shipped tightest is 1.284:1) so the unit states its headroom without a
   hard-coded per-set table.
4. **The shadow meets the same fills** — `extendTheme(getTheme("dark"), {
   colors: { track: "#000000", shadow: "#000000" } })` must be reported by
   `themeContrastFailures` with `foreground: "shadow"`, `background: "track"`
   at both defined walking levels; before the fix the shadow walk never saw the
   groove. (Use the same compositing helper the checker uses:
   `elevationShadow`/`compositeOver`.)
5. **Each walk grows to twenty-one while the plain list does not** —
   `overlayWashPairs` and `dialogSurfacePairs` each have 21 entries and
   `contrastPairs` stays 420: the scrim and the dialog face are separate
   published walks, like the elevation shadow, not rows in the plain list.

The test must fail before the implementation: case 1 and case 2 return `[]` /
missing pairs on the current tree; case 4 is missing too. Do not add
`check-tests-ok`.

### 2.3 `packages/tokens/src/contrast.test.ts`

No count changes: `contrastPairs` stays 420 because the scrim and the dialog
face are separate published walks, not rows in the plain list. Update the
`elevationContentSurfaces` shape assertion to name `disabled`, `skeleton` and
`track` after `destructiveSoft`.

### 2.4 `packages/tokens/src/docs.test.ts`

`countWords` currently ends at `"eighteen"`. Add `"nineteen"`, `"twenty"`,
`"twenty-one"`, `"twenty-two"`, `"twenty-three"`, `"twenty-four"` and
`"twenty-five"` so `countWord(21)` is `"twenty-one"` and existing larger counts
stay word-form.

### 2.5 `docs/tokens.md`

- The scrim paragraph (search "`overlayWashPairs` composites `overlay` over"):
  add the three roles to the enumerated list and change **eighteen** to
  **twenty-one**; state that the three are resting fills, not pointer states,
  and that the pointer washes and the filled families' press/hover steps remain
  the only exclusion. The tightest figure stays **1.060:1** (high-contrast dark,
  `overlay` on `info`).
- The dialog-face paragraph: "the six layout surfaces and the twelve resting
  content fills" → "the six layout surfaces and the **fifteen** resting content
  fills".
- The elevation paragraph (search "`elevationContentSurfaces` the twelve
  resting"): twelve → **fifteen**.
- The pair-count history paragraph ends "396 to **420** across plans `527`,
  `557` and `595`" — leave it: the scrim and dialog walks are not in
  `contrastPairs`. State the walk growth (18 → 21) where the scrim list is
  described.
- Leave the historical statements in plans 099/359/375/508 (`four → six`,
  `6 → 15`, `15 → 18`, `twelve → eighteen`) untouched — they describe those
  plans.

### 2.6 `docs/design-system.md`

- §7 ("on the eighteen surfaces it covers"): **twenty-one**; add `disabled`,
  `skeleton` and `track` to the enumerated list and say they are resting fills,
  not pointer states.
- §7 (dialog face): "the six layout surfaces and the twelve resting content
  fills" → **fifteen**.
- §9 (the elevation paragraph): "the twelve resting content fills" →
  **fifteen**.
- §9 (the scrim paragraph): **eighteen** → **twenty-one** in both the count and
  "The tightest of the eighteen pairs"; add the three roles (the row/paragraph
  guards derive membership, so every one must be named in backticks). The
  tightest value stays **1.060:1**.
- §9 (the "What the contract checks" dialog paragraph): "the six layout
  surfaces and the twelve resting content fills" → **fifteen**.

### 2.7 `packages/tokens/README.md`

- The scrim paragraph near `overlayWashPairs`: **eighteen** → **twenty-one**,
  "the six layout surfaces and the twelve resting content fills" → **fifteen**.
- The `overlay` paragraph in the colour-reference section: **eighteen** →
  **twenty-one**; add the three roles to its list; state the resting-fill rule.

### 2.8 `COMPONENTS.md`

In the **Theme contrast check** row only:

- "the same 420 contrast pairs" stays **420** (the walks are separate lists);
- "18 scrim pairs, 18 dialog-face pairs" → **21 scrim pairs, 21 dialog-face
  pairs**;
- if the row names the content-fill count (it says "the twelve fills" through
  `elevationContentSurfaces` in plan-584 prose), make it **fifteen**.

Do not touch any other row.

### 2.9 `TODO.md`

Add one ticked row at the end of the tokens-theme list:

> `[x]` Hold the modal scrim and the floating menu's shadow over the three
> resting fills it excluded — a dark theme with `disabled`, `skeleton` and
> `track` set to `#000000` passed all nine checks while the shipped black scrim
> composited to **1.000:1** on each, so a disabled control, a loading row and a
> progress groove sat undimmed behind a dialog; the three joins
> `contentFillSurfaces`, taking the scrim and dialog-face walks 18 → 21 pairs
> and the `md` elevation walk 12 → 15 fills, every shipped set
> already clears 1.05:1 (1.284:1 at the tightest) and no colour moves
> (plan 610)

### 2.10 `.agents/slop/plans/README.md`

Add after the 609 row:

```
| [610](./610-scrim-over-resting-fills.md) | The scrim over the fills it excluded | F | 099, 359, 375, 394, 395, 399, 508, 509, 584 | done |
```

Do not renumber any existing row.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. `nub run --filter @gpuixui/tokens test`
   → 159 files and every test green. Before the implementation: the new suite
   fails case 1 (the fills are absent from `overlaySurfaces`) and case 2 (the
   broken theme returns `[]`).
2. `nub run check`
   → `check:tests`, lint, format and type-check green. The docs value/type
   coverage, snippet, example, JSDoc and count guards are part of this run.
3. `nub run lint`
4. `nub run test` (the workspace gate for the commit).

## 4. STOP conditions

- **STOP** if any shipped set's new scrim, dialog-face or `md` shadow pair misses
  its declared `surface` floor. Report the set and the ratio; do not move a
  colour without a separate plan.
- **STOP** if `overlayWashPairs` or `dialogSurfacePairs` does not reach twenty-one
  entries, or if `contrastPairs` changes: the two walks are separate published
  lists and the plain contract must stay 420. A different delta means another
  list derives from `overlaySurfaces` — report it and update the plan before
  continuing.
- **STOP** if a docs guard needs a count other than 21 / 15. Derive it from the
  lists instead of typing a number.
- **STOP** if `check:tests` rejects the new cases as unable to fail. Case 1 fails
  before the fix; case 2 fails before the fix (returns `[]`); case 4 fails
  before the fix. Do not add `check-tests-ok`.
- **DO NOT** add `hover`, `active`, `xHover` or `xActive` to the lists. They are
  pointer states and the plan-375 exclusion stands.
- **DO NOT** claim this was seen in the native runtime. It is a contract and
  documentation change; the native proof belongs to the playground rows.

## 5. Test plan — both directions

1. Remove the three entries from `contentFillSurfaces` → cases 1, 2 and 4 fail.
2. Replace the walk assertions with the old eighteen-entry lists → case 5
   fails.
3. Remove `disabled` from the `docs/tokens.md` scrim list → `docs.test.ts`'s
   "names every surface the modal scrim covers" case fails.
4. Remove `track` from the `docs/design-system.md` §9 scrim row → "names every
   surface in the modal scrim's floor row" fails.
5. Revert a count word to "eighteen" → the count-derived docs case fails.
6. Restore each change → green.

Manual both-directions check (the repo's `verify-two-directions.sh` is still
jj-based; see the harness TODO): make change 1, run
`nub run --filter @gpuixui/tokens test`, observe the new suite fail, restore;
make change 3, run again, observe `docs.test.ts` fail, restore. State both runs
in the commit body or the audit note.

## 6. Acceptance

- `disabled`, `skeleton` and `track` are in `contentFillSurfaces`, so they are
  measured by `overlayWashPairs`, `dialogSurfacePairs` and the `md` elevation
  walk, with the rationale corrected in the module and the three documents.
- The scrim and dialog-face walks grow 18 → 21 pairs each, and the `md`
  elevation content list 12 → 15 fills; `contrastPairs` stays 420 because the
  walks are published separately.
- A regression suite proves the hole in both directions and every shipped set
  still clears the floor with the measured headroom (1.284:1 scrim, 1.155:1 face
  over the new fills, 1.245:1 shadow at the tightest). The overall face tightest
  remains 1.079:1 (Dark · Linux on `destructive`), unchanged.
- No colour, floor, metric, platform style or shipped theme changes.
- `nub run check`, `nub run lint` and `nub run test` pass.

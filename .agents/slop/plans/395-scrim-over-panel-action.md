# Plan 395 — the scrim over the panel action

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
099 (the modal scrim), 359 (the persistent row state and the field fill), 375
(the filled actions and status panels a window shows), 394 (`softAction`, the
raised action a soft status panel carries).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

Plan 375 added the surfaces a window shows behind a dialog — the four resting
filled actions (`primary`, `secondary`, `accent`, `destructive`) and the four
soft status panels — to `overlaySurfaces`, because a scrim that composites to one
of them leaves that control or Alert undimmed while `themeContrastFailures`
returns `[]`. Plan 394 then shipped a fifth filled action: `softAction`, the
raised fill a status panel's action paints. It is part of the layout a modal
opens over — an Alert stays on screen with its "Try again" button — and it was
not added to the scrim contract.

Measured on the built package with its own `compositeOver`/`contrastRatio`,
`overlay` composited over `softAction` in every shipped set:

| theme | ratio |
| ----- | ----- |
| high-contrast dark (identity, macOS, Linux, Windows, XP, Windows 7) | **1.5519:1** (`#FFFFFF26` on `#3A414D`) |
| every other shipped set | ≥ 1.60:1 |

All 24 sets clear the 1.05:1 surface floor with a wide margin, so no colour
moves. The gap is structural: the scrim list must name every resting fill a
dialog can cover, and the plan-394 family is the last one missing.

## 2. Decision

Add `softAction` to `overlaySurfaces`, after the four resting filled actions and
before the four soft status panels. The family's hover and press stay out for the
same reason the filled families' do: the pointer leaves the control to reach the
dialog, so a scrim over a transient state is not a composition the system
supports. The scrim list grows 14 → 15 pairs; `contrastPairs` does not change
(the scrim is applied as its own composited pass), so the plain count stays 360.

Rejected alternatives:

- **Measure the whole family.** `softActionHover`/`softActionActive` are
  pointer states; plan 375's exclusion is the design rule and applies here.
- **Leave it.** The list exists precisely so a new resting fill cannot ship
  unmeasured; plan 394 makes `softAction` a resting fill, so the omission would
  be the same defect plans 375 and 359 fixed twice already.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

- Add `"softAction",` to `overlaySurfaces`, after `"destructive",`.
- The `overlaySurfaces` JSDoc gains `softAction` in the "resting fills" clause
  and one sentence: the panel action is a resting fill too, and its hover and
  press are transient like the other families'.
- The `overlayWashPairs` JSDoc needs no new item — it derives from the list.

### 3.2 `packages/tokens/src/overlay-scrim.test.ts`

- `persistentSurfaces` gains `"softAction"` (the array is the fills plan 375
  added plus this one; rename nothing, extend the doc comment).
- `overlayWashPairs` expected list gains
  `["overlay", "softAction", "surface"]` after `destructive`.
- Header comment gains one sentence on plan 395.

### 3.3 `packages/tokens/src/contrast.test.ts`

No count change: `overlayWashPairs.length` is asserted nowhere except the scrim
suite; `contrastPairs.length` stays 360.

### 3.4 `packages/tokens/src/docs.test.ts`

- `countWords` gains `"fifteen"` (the §7 test derives the word from
  `overlaySurfaces.length`).
- The §7 assertion's expected sentence becomes "the fifteen surfaces it
  covers" with no other prose change (it is derived).
- Add `"softAction"` to the §7 surface loop? The existing case already maps
  `overlaySurfaces`, so no edit is needed beyond the word.

### 3.5 `docs/tokens.md`

- The scrim paragraph: "the fourteen surfaces" → "the fifteen surfaces", and the
  list of filled actions gains `softAction`.
- The verification paragraph: "The tightest of the fourteen pairs" → "fifteen".
  The tightest figure stays **1.075:1** (AAA dark on `primary`), so the quoted
  number does not move.
- The contract section that names `overlayWashPairs` lists the new fill.

### 3.6 `docs/design-system.md`

- §7: "the fourteen surfaces it covers" → "fifteen", and the filled-action
  clause names the panel action.
- §9: "over the fourteen surfaces a dialog covers" → "fifteen"; the tightest
  figure stays 1.075:1.

### 3.7 `packages/tokens/README.md`

- "composited over the fourteen surfaces" → "fifteen", with the panel action
  named beside the filled actions.

### 3.8 `COMPONENTS.md`

- **Theme contrast check** row: "14 scrim pairs" → "15 scrim pairs"; add the
  panel action to the scrim sentence.

### 3.9 `TODO.md`

Tick one new row under `tokens-theme` and bump the header count by one
(160/217 → 161/218):

```
`[x]` Hold the modal scrim over the panel action — plan 394 made `softAction` a
resting fill a window shows, but `overlaySurfaces` still named only the four
`primary`/`secondary`/`accent`/`destructive` actions and the four soft panels,
so a scrim that composited to the Alert's "Try again" button left it undimmed
while `themeContrastFailures` returned `[]`; the fill joins the scrim contract
(14 → 15 pairs) and every shipped set already clears 1.05:1 (1.5519:1 at the
tightest, AAA dark), so no colour moves (plan 395)
```

### 3.10 `.agents/slop/plans/README.md`

Add the row after 394 and a closing paragraph with the measurement.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens test
# EXPECT: 100 files, every test passes.
```

```sh
# Direction 1 — the surface is required:
git stash push -- packages/tokens/src/contrast.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/overlay-scrim.test.ts)
# EXPECT: the list-equality case and the regression case fail (the pair is gone).
git stash pop
```

Then the gate:

```sh
nub run check
nub run lint
nub run test
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- a shipped set fails the new scrim pair — quote the set and ratio; the family
  fill would need a value move, which this plan does not authorise;
- `docs.test.ts` rejects the §7 word — add it to `countWords`, do not change the
  derived sentence;
- a gate fails for a reason outside the files this plan names.

## 6. Acceptance criteria

- `overlaySurfaces` names `softAction`, `overlayWashPairs` has 15 entries, and
  `themeContrastFailures` reports an overlay equal to the panel action.
- Every shipped set clears the new pair; no colour moves.
- Both documents, the README and the ledger state the derived surface count.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

None. The fill and the pairing ship in this package; no consumer change follows
from adding a guard.

# Plan 512 — the panel action's label through the text-selection wash

**Workstream:** `tokens-theme` · **Phase:** F (contract completeness) · **Depends
on:** 091 and 362 (text selection inside a soft status surface), 394 (the
`softAction` family), 506 and 510 (the last selection-wash fixes), 387
(`shippedThemes`).

**Status:** done.

## 1. The defect

Plan `394` gave the action inside a tone-tinted status panel its own family and
moved a **ghost** action's label from the body role to `softActionForeground`.
Plan `091`/`362` had built `selectionSoftPairs` for text selected inside the
same panel, but the list still measures only three roles: `xSoftForeground`
(the tone's title), `foreground` (the description) and `mutedForeground` (the
caption). The ghost action's actual label role is measured at rest by
`softActionLabelPairs`, never through the composited `selection` wash.

The two roles are not interchangeable in the shipped data: `softActionForeground`
and `foreground` differ in all four Windows recipe sets — XP light `#191D25` vs
`#1A1A1A`, XP dark `#F6F8FB` vs `#EEF1F5`, Aero light `#191D25` vs `#101828`,
Aero dark `#F6F8FB` vs `#EEF1F5` — so measuring `foreground` is not a proxy for
the ghost action's label.

Measured with the package's own `contrastRatio`/`compositeOver`, identity light
with `softActionForeground: "#444444"`:

| fill | at rest (`softActionLabelPairs`) | through the `selection` wash | body floor |
| ---- | -------------------------------- | ---------------------------- | ---------- |
| `infoSoft` | 7.556:1 | **5.847:1** | 7 |
| `successSoft` | 7.441:1 | **5.741:1** | 7 |
| `warningSoft` | 7.548:1 | **5.770:1** | 7 |
| `destructiveSoft` | 7.347:1 | **5.685:1** | 7 |

The theme passes every pair the contract currently publishes, so
`themeContrastFailures` returns `[]` while a reader dragging over “Dismiss”
sees the label at 5.685:1 — below the 7:1 body floor the same label has at rest.

The same drift left a stale public sentence: `softAction`'s JSDoc in
`packages/tokens/src/styles.ts` says a ghost action “skips `background` and uses
`hover` and `active` on the panel”. Those are exactly the canvas washes plan
`394` measured at 1.0042:1 on a tint and replaced. `docs/tokens.md`,
`docs/design-system.md` and the README already say
`softActionHover`/`softActionActive`; only the source JSDoc is wrong.

## 2. The rule

1. **Add the role that is actually painted.** `selectionSoftPairs` gains
   `softActionForeground` on each of the four soft fills at the `body` floor,
   beside `xSoftForeground` and `foreground`. No colour moves: every shipped set
   passes (tightest **8.667:1**, identity dark `softActionForeground` on
   `infoSoft` through the wash), because the label is the same value as
   `foreground` in twenty sets and the two recipe values are near it.
2. **Correct the public JSDoc.** A ghost action paints
   `softActionHover`/`softActionActive` on the panel with
   `softActionForeground`; the generic `hover`/`active` washes are not a
   supported action surface there.
3. **Guard both.** The regression suite must fail if the pair disappears or the
   stale sentence returns.

No role, floor or colour changes. `selectionSoftPairs` grows 12 → 16.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

In `selectionSoftPairs` (currently the flatMap over `softSurfaceRoles`), add
`["softActionForeground", background, "body"]` to each fill's tuple, so the
list is:

```ts
export const selectionSoftPairs: readonly ContrastPair[] =
  softSurfaceRoles.flatMap(
    (background): ReadonlyArray<ContrastPair> => [
      [`${background}Foreground`, background, "body"],
      ["foreground", background, "body"],
      ["softActionForeground", background, "body"],
      ["mutedForeground", background, "secondary"],
    ],
  );
```

Update its JSDoc: name **four** text roles, say the body text is what
`AlertDescription` paints and the panel action is the ghost dismiss control's
`softActionForeground` (plan `394`), and keep the `primaryText` omission
sentence. In `themeContrastFailures`'s doc bullet for `selectionSoftPairs`,
name the panel action if the bullet enumerates roles.

### 3.2 `packages/tokens/src/styles.ts`

In the `softAction` JSDoc, replace

> A ghost action skips `background` and uses `hover` and `active` on the panel

with

> A ghost action skips `background` and paints `softActionHover` and
> `softActionActive` on the panel.

Do not change the returned `FilledControlStyle` fields (`hover`/`active` are the
designed roles), only the prose that names them.

### 3.3 `docs/tokens.md`

1. In the selection section (the paragraph beginning “a soft status surface
   carries its own tone”), change the role list to name
   `softActionForeground` for the ghost action, e.g. “its description with
   `foreground`, its panel action with `softActionForeground` and its caption
   with `mutedForeground`”.
2. Change “`selectionSoftPairs` measures all three text roles a status panel
   carries” to **four** and name the four roles.
3. In the action paragraph, after the `softActionLabelPairs` sentence, add that
   the same four fills are held through the selection wash by
   `selectionSoftPairs`, because a ghost action's label is dragged over with the
   panel text.
4. In the default-body-text paragraph, replace “an Alert's description and ghost
   dismiss control paint” with “an Alert's description paints”; the ghost action
   is measured as `softActionForeground` by the action family, not as
   `foreground`.
5. In the pair-count history, append a plan `512` paragraph: the label joins
   `selectionSoftPairs` (12 → 16), every shipped set passes (8.667:1 at the
   tightest, identity dark on `infoSoft`), no colour moves and `contrastPairs`
   stays **394**.

### 3.4 `docs/design-system.md`

1. In the accessibility floor table, the “text selection on a soft status fill”
   row gains `softActionForeground` beside `xSoftForeground`, `foreground` and
   `mutedForeground`.
2. In the interaction-state “text selection” row, add `softActionForeground` to
   the parenthesised role list for the soft fills.
3. The status-panel action section already says “with the same foreground”; make
   it name `softActionForeground` and say the label is held through the
   selection wash.

### 3.5 `packages/tokens/README.md`

In “Default body text is checked on …”, replace “an Alert's description and
ghost dismiss control paint” with “an Alert's description paints”. No count is
stated there.

### 3.6 `COMPONENTS.md`

1. The “Design tokens” row: replace “an Alert's description and ghost dismiss
   control paint (plan 320)” with “an Alert's description paints (plan 320)”.
2. The “Theme contrast check” row: change “12 soft-selection text pairs” to
   “16 soft-selection text pairs” and, in the same row, state that the panel
   action's label is held through the selection wash (plan 512).

### 3.7 Tests

`packages/tokens/src/contrast.test.ts`

- Change `expect(selectionSoftPairs.length).toBe(12)` to `16`.

`packages/tokens/src/selection-status-panel.test.ts`

- Update the header: plan `362` closed three roles; plan `394` added a fourth
  (`softActionForeground`) that plan `362` could not have named, and this suite
  now guards it too.
- Rename “is the three text roles on the four soft fills” to “is the four text
  roles on the four soft fills”, expect `16`, and append
  `["softActionForeground", fill, "body"]` to the expected tuple after
  `foreground`.
- Add `it("reports the panel action's label a theme loses through the wash", …)`:
  - build `extendTheme(getTheme("light"), { colors: { softActionForeground: "#444444" } })`;
  - assert the value clears `contrastFloors.default.body` on all four soft fills
    at rest (it measures 7.347–7.556:1);
  - assert `themeContrastFailures(theme)` returns four failures with
    `foreground: "softActionForeground"`, `wash: "selection"`,
    `pairClass: "body"`, `floor: 7`, one per fill, and that the
    `destructiveSoft` ratio is `5.685:1` (to two decimals);
  - assert `themeFailures(theme)` tags at least one as `kind: "contrast"`.
- Add `it("keeps the ghost action on the designed washes in the public JSDoc", …)`:
  read `./styles.ts` with `node:fs`, collapse whitespace, require the sentence
  “paints `softActionHover` and `softActionActive` on the panel”, and assert the
  stale phrase “uses `hover` and `active` on the panel” is absent.

`packages/tokens/src/docs.test.ts`

- In the selection-role sentence, add the panel action clause the document now
  carries.
- Change the claim list entry to “`selectionSoftPairs` measures all four text
  roles a status panel carries”.
- In “states where default body text is measured”, replace the description /
  ghost-control phrase with “an Alert's description paints”.

`packages/tokens/src/readme.test.ts`

- Update the expected default-body-text sentence the same way (no ghost control).

### 3.8 Ledger

- Add a `TODO.md` row under the tokens-theme section:
  `[x] Hold the panel action's label through the text-selection wash — plan 394
  moved a ghost action to softActionForeground but selectionSoftPairs still
  measured only foreground, so #444444 measured 5.685:1 through the wash on
  destructiveSoft while every check returned []; the four fills join the list,
  no colour moves (plan 512)`.
- Add the plan to `.agents/slop/plans/README.md` after `511` and mark it `done`
  when the gates pass.

## 4. Commands and expected results

Run from the worktree root.

1. **Prove the regression before fixing the source.** After §3.7 is written but
   before §3.1–3.2:
   `nub run --filter @gpuixui/tokens test -- selection-status-panel`
   Expected: failures on the tuple count and on the missing four wash failures
   (the theme returns `[]`), proving the test cannot pass without the pair.
   Then apply §3.1–3.2 and run again: all cases pass.
2. `nub run --filter @gpuixui/tokens check-types` — clean.
3. `nub run --filter @gpuixui/tokens test` — all suites pass.
4. `nub run check` — clean (`check:tests`, lint, format, type-check).
5. `nub run lint` — clean.
6. `nub run test` — clean.

## 5. STOP conditions

Stop and report rather than improvise if:

- any shipped set fails `softActionForeground` on a soft fill through the wash
  (report the set, fill and ratio; a colour move would need its own plan);
- the tightest shipped pair is not **8.667:1** identity dark `infoSoft` — recheck
  the composite rather than changing the figure;
- the pre-fix suite already passes, which would mean the pair is measured
  somewhere else and this plan is unnecessary;
- a docs guard needs a different sentence than §3.3–3.6 names, or a pair count
  is stated in another file this plan did not list;
- `inventory.test.ts` rejects the updated `COMPONENTS.md` row in a way a count
  edit does not fix.

## 6. Acceptance criteria

- `selectionSoftPairs` contains four washed pairs for `softActionForeground`,
  one per soft fill, at the `body` floor; the list is 16 pairs and
  `contrastPairs` stays 394.
- A theme with `softActionForeground: "#444444"` is reported by
  `themeContrastFailures` and `themeFailures` through the wash, while every
  shipped set still returns `[]`.
- `softAction`'s JSDoc recommends `softActionHover`/`softActionActive` and no
  document recommends the canvas washes for a panel action.
- The updated suite fails before the source edit and passes after it, including
  the stale-sentence guard.
- `docs/tokens.md`, `docs/design-system.md`, the README, `COMPONENTS.md`,
  `TODO.md` and the plan index state the same four roles, the same counts and the
  same 8.667:1 / 5.685:1 figures the code produces.
- `nub run check`, `nub run lint` and `nub run test` pass.

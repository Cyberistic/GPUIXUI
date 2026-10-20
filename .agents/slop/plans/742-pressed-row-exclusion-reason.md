# 742 — The pressed row's exclusion reason, after plan 723

**Phase:** F (the contract's prose keeps its own decisions) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 359 (the scrim at rest), 651 (the selected row's press,
`selectedActive`), 663/674 (the pressed row's text and disabled label), 700 (the
pressed option's label), 723 (the wash on the pressed fill) ·
**Number block:** 740 is the `primitives` worktree's and 741 is taken twice
across the worktrees (`notification-row-space`, `radio-group-typeahead`), so this
takes **742** ·
**Status:** done

> **Status: executed 2026-10-20.** Execution evidence is at the end of this plan.

## 1. The defect this plan closes

Plan `723` published `["selection", "selectedActive", "surface"]` in
`selectionWashPairs` — a reader click-drags a chosen row's text with the button
held, so the fill under the highlight is the pressed one — and its Decision 5
said:

> State the supersession in the documents that carry the old reason: the pressed
> row stays out of the **scrim** and **elevation** walks (a dialog opens and a
> shadow falls at rest), but it is a selection surface like the other pointer
> states.

The wash list and the pages that *enumerate* it were updated. The passages that
carry the **old reason** were not, and two of them state the reverse of the
shipped list. The reason is one sentence, restated in six places:

> a row is selected at rest

Plan `723` refuted it: `selectionSurfaces` already holds `hover` and `active`,
the pointer states of an *unselected* row, because a reader drags a selection
with the button held. The pressed fill is the same state on a chosen row.

### 1.1 The four false statements

| Location | Sentence as shipped | Why it is false |
| -------- | ------------------- | --------------- |
| `packages/tokens/src/contrast.ts`, `selectionPressPairs` JSDoc | “The transient state is deliberately outside the selection-wash, modal-scrim and elevation walks: a reader drags a selection or opens a dialog at rest …” | `selectionWashPairs` holds the pair since plan `723`; only the scrim and elevation walks read at rest |
| `docs/tokens.md`, *Interaction states* (the pressed-row paragraph) | “The transient fill is deliberately outside the selection-wash, modal-scrim and elevation walks, which measure the persistent `selected` fill at rest, like the other pointer washes (plan `359`).” | same, and it contradicts the catalogue's own *Text selection* section, which says the wash holds the pressed fill (plan `723`) |
| `docs/design-system.md` §8, the selected-row paragraph | “The fill is transient, so the selection wash, the modal scrim and the elevation walk stay on the persistent `selected` fill.” | the selection wash holds the pressed fill (plan `723`); the scrim and the elevation walk are the two that stay at rest |
| `packages/tokens/src/contrast.ts`, `selectionInputPairs` JSDoc | “The pressed `selectedActive` row is absent for the same reason it stays out of the selection-wash contract: a row is selected at rest.” | the wash contract *does* hold the pressed fill, and the reason is the refuted one |

The catalogue and the design system therefore contradict their own other
sections. The catalogue's *Text selection* section and the design system's §8
`text selection` row both already give the correct answer — “the wash itself
stays perceivable, including … on the pressed `selectedActive` a chosen row keeps
under the pointer (plan `723`)” — so the contradiction is between shipped
sections, not a matter of interpretation.

### 1.2 The three statements that are right about their list, wrong about why

| Location | Sentence as shipped | What is wrong |
| -------- | ------------------- | ------------- |
| `docs/design-system.md` §8, the `disabled` state row | “… and through the composited `selection` wash on the same fourteen persistent surfaces (a pressed row is transient)” | the fourteen-surface list is right; “transient” is exactly the criterion plan `723` refuted, because `hover`/`active` are transient and measured |
| `docs/design-system.md` §9, inactive-label row (pinned by `docs.test.ts`) | “… and through the composited `selection` wash on the same fourteen persistent surfaces — a pressed row is transient” | same sentence about the same list |
| `packages/tokens/src/selection-input-text.test.ts`, the `covers every field surface …` case | “the pressed `selectedActive` row is transient, like every pressed row in the selection contract, and a reader selects text at rest” | the case is right (plan `723` Decision 3 keeps the pressed row's text at rest); its stated reason is the refuted one |

Plan `723` Decision 3 stands and this plan does not reopen it: the pressed row's
text pairs live at rest in `selectionPressPairs`, and `selectedActive` stays out
of `selectionSurfaces`, `selectionPairs`, `selectionInputPairs`,
`selectionInactivePairs` and `selectionStatusPairs`. The reason those lists stop
there is *the list's owner* — `selectionPressPairs` measures the pressed row's
own pairs — not the row's transience.

## 2. Decision (do not re-litigate)

1. **The pressed fill is a selection surface; it is not a rest surface.** The
   corrected sentences name the walk that holds it (`selectionWashPairs`, plan
   `723`) and the two that keep reading at rest (the modal scrim and the
   elevation shadow, plan `359`).
2. **The pressed row's text stays at rest** (plan `723` Decision 3). Where a
   passage describes a list that excludes `selectedActive`, it names
   `selectionPressPairs` as the owner of the pressed row's own pairs, not the
   row's transience.
3. **No pair, colour, floor, metric or role moves.** `selectionWashPairs` stays
   **11** pairs, `selectionSurfaces` stays **nine**, `contrastPairs` stays
   **470**. This is a truth plan: nothing is added to the checker.
4. **The guarantee is a test, not care.** A new suite reads the two source
   blocks, the catalogue paragraph and the design-system row, and fails on the
   refuted reason or a claim the pair lists contradict. It also asserts the
   structural facts the corrected sentences state, so a later plan that moves
   `selectedActive` into or out of a walk has to take the prose with it.

## 3. Exact files and changes

### 3.1 `packages/tokens/src/contrast.ts` — `selectionPressPairs` JSDoc

Replace the second paragraph (search `The transient state is deliberately
outside`):

```
 * The transient state is deliberately outside the selection-wash, modal-scrim
 * and elevation walks: a reader drags a selection or opens a dialog at rest, so
 * the persistent `selected` fill is what those contracts measure, exactly as
 * plan 359 excludes the `hover`/`active` washes from the scrim.
```

with:

```
 * The pressed fill is a **selection** surface: a reader click-drags across a
 * chosen row's text with the button held, so {@link selectionWashPairs} holds the
 * wash on it beside the `hover`/`active` washes of an unselected row (plan 723).
 * It stays outside the modal-scrim and elevation walks, which read a window at
 * rest — a dialog opens and a menu casts its shadow with the pointer up —
 * exactly as plan 359 excludes the `hover`/`active` washes from the scrim.
```

### 3.2 `packages/tokens/src/contrast.ts` — `selectionInputPairs` JSDoc

Replace the closing sentence (search `row is absent for the same reason`):

```
 * The hint (`placeholder`) is deliberately absent: a placeholder is not typed
 * text and is not a selection a reader can drag. The pressed `selectedActive`
 * row is absent for the same reason it stays out of the selection-wash
 * contract: a row is selected at rest.
```

with:

```
 * The hint (`placeholder`) is deliberately absent: a placeholder is not typed
 * text and is not a selection a reader can drag. The pressed `selectedActive`
 * row is not one of the surfaces this list extends: a field inside a pressed row
 * is measured at rest by {@link selectionPressPairs}, and the wash over the
 * pressed fill by {@link selectionWashPairs} (plan 723).
```

### 3.3 `docs/tokens.md` — *Interaction states* pressed-row paragraph

Search `The transient fill is deliberately outside the`. Replace the closing
sentence pair:

```md
both checks returned `[]`. The transient fill is deliberately outside the
selection-wash, modal-scrim and elevation walks, which measure the persistent
`selected` fill at rest, like the other pointer washes (plan `359`).
```

with:

```md
both checks returned `[]`. The pressed fill is a selection surface: a reader
click-drags a selection with the button held, so `selectionWashPairs` holds the
wash on it beside the `hover` and `active` washes of an unselected row (plan
`723`). The modal-scrim and elevation walks read a window at rest — a dialog
opens and a menu casts its shadow with the pointer up — so they keep measuring
the persistent `selected` fill, like the other pointer washes (plan `359`).
```

### 3.4 `docs/design-system.md` §8 — the selected-row paragraph and the disabled row

Replace the closing sentence of the selected-row paragraph (search `The fill is
transient, so the selection wash`):

```md
The fill is transient, so the selection wash, the modal scrim and the elevation
walk stay on the persistent `selected` fill.
```

with:

```md
The pressed fill is a selection surface — a reader click-drags a selection with
the button held, so `selectionWashPairs` holds the wash on it (plan `723`) —
while the modal scrim and the elevation walk stay on the persistent `selected`
fill, because a dialog opens and a shadow falls with the pointer up.
```

In the `disabled` state row replace the same phrase (search `(a pressed row is
transient)`):

```md
and through the composited `selection` wash on the same fourteen persistent surfaces (a pressed row is transient)
```

with:

```md
and through the composited `selection` wash on the fourteen `inactiveSurfaces`, because plan `723` keeps the pressed row's own pairs at rest
```

### 3.5 `docs/design-system.md` §9 — the inactive-label row

Replace the row (search `| inactive label (`):

```md
| inactive label (`disabledForeground` on the `disabled` fill, the field's `input` fill, `background`/`card`/`popover`/`muted`, the `hover`/`active`/`accent`/`selected` washes, the pressed `selectedActive` and the four soft status fills, and through the composited `selection` wash on the same fourteen persistent surfaces — a pressed row is transient) | 3:1 | 4.5:1 |
```

with:

```md
| inactive label (`disabledForeground` on the `disabled` fill, the field's `input` fill, `background`/`card`/`popover`/`muted`, the `hover`/`active`/`accent`/`selected` washes, the pressed `selectedActive` `selectionPressPairs` owns and the four soft status fills, and through the composited `selection` wash on the fourteen `inactiveSurfaces`, because plan `723` keeps the pressed row's own pairs at rest) | 3:1 | 4.5:1 |
```

### 3.6 `packages/tokens/src/docs.test.ts` — the pinned row

The inactive-label row is built as a string in the `§9 accessibility floor
table` case. Replace the same phrase in the template literal:

```
… the pressed \`selectedActive\` and the four soft status fills, and through the composited \`selection\` wash on the same fourteen persistent surfaces — a pressed row is transient) …
```

with the corrected cell text from §3.5, with the same escaping.

### 3.7 `packages/tokens/src/selection-input-text.test.ts` — the case comment

Replace the two-line comment (search `the pressed \`selectedActive\` row is
transient`):

```ts
    // The `input` fill is the `inputForeground` pair in `selectionPairs`; the
    // pressed `selectedActive` row is transient, like every pressed row in the
    // selection contract, and a reader selects text at rest.
```

with:

```ts
    // The `input` fill is the `inputForeground` pair in `selectionPairs`; the
    // pressed row's own typed text lives at rest in `selectionPressPairs`, which
    // is the list that owns it (plan 723).
```

No case changes.

### 3.8 `packages/tokens/src/selection-press-exclusion.test.ts` (new)

Header comment states the bug:

```ts
/**
 * Guards the half of plan 723's Decision 5 that shipped undone: the wash walk
 * gained the pressed `selectedActive` fill, but seven passages that carry the old
 * reason — "a row is selected at rest" — were never corrected, and four of them
 * (both source blocks, the catalogue's interaction-states paragraph and the
 * design system's selected-row paragraph) said the pressed fill is deliberately
 * outside the selection-wash walk. The pages contradicted their own *Text
 * selection* sections, a reader was told the pressed fill is unmeasured when it
 * is measured, and the reason itself is the one plan 723 refuted:
 * `selectionSurfaces` holds `hover` and `active`, the pointer states of an
 * unselected row, because a reader drags with the button held.
 */
```

Cases:

1. **the structure the sentences describe** — `selectionWashPairs` contains
   `["selection", "selectedActive", "surface"]` exactly once; `overlaySurfaces`,
   `elevationSurfaces`, `elevationContentSurfaces` and every background in
   `dialogSurfacePairs` exclude `selectedActive`; `selectionSurfaces` stays nine
   and excludes it; `selectionInputPairs`, `selectionPairs`, `selectionInactivePairs`
   and `selectionStatusPairs` exclude it.
2. **the pressed-row block** — read `contrast.ts`, slice the JSDoc block directly
   above `export const selectionPressPairs`; assert it names `selectionWashPairs`
   and `723`, names `modal-scrim` and `elevation` as the walks it stays out of,
   and contains neither `deliberately outside the selection-wash` nor
   `a row is selected at rest`.
3. **the typed-text block** — same for `export const selectionInputPairs`;
   assert it names `selectionPressPairs` and `selectionWashPairs` and contains
   neither `a row is selected at rest` nor
   `stays out of the selection-wash contract`.
4. **the catalogue** — read `docs/tokens.md`, take the paragraph that begins
   with the sentence `Both checks returned` (`[]`. The pressed fill…) and ends at
   the next blank line; assert it names the pressed fill, `selectionWashPairs`
   and plan `723`, does not contain `deliberately outside the` together with
   `selection-wash`, and still names the scrim and elevation walks as the two it
   stays out of.
5. **the design system's pages** — read `docs/design-system.md`; the
   inactive-label row must not contain `a pressed row is transient`, must name
   `selectionPressPairs` and the fourteen `inactiveSurfaces`; the `disabled`
   state row must not contain the phrase either and must name `inactiveSurfaces`
   and plan `723`; the §8 selected-row paragraph must name `selectionWashPairs`,
   plan `723`, `modal scrim` and `elevation`, and must not contain
   `The fill is transient, so the selection wash`; the §8 `text selection` row
   must still name the pressed fill under the wash.

In total eight cases. Use `readFileSync(new URL("./contrast.ts",
import.meta.url), "utf8")` and the document paths the other tree-local guards
use (`../../../docs/tokens.md` from `packages/tokens/src/`, as `docs.test.ts`
reads them). The `selection-input-text.test.ts` comment is corrected in §3.7 but
is not read by the guard — a test reading a sibling test's comment buys nothing.

## 4. Commands

Run from the worktree root.

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| New guard | `nub exec vitest run src/selection-press-exclusion.test.ts` (from `packages/tokens`) | 8 tests pass |
| Prove it fails without the fix | restore any one of the six passages the guard reads and rerun the command | the matching case fails naming the phrase |
| The docs pin | `nub exec vitest run src/docs.test.ts` (from `packages/tokens`) | pass; the §9 row is the corrected cell |
| The affected suites | `nub exec vitest run src/selection-input-text.test.ts src/selection-press-wash.test.ts src/contrast-reference.test.ts` (from `packages/tokens`) | pass |
| Package suite | `nub run --filter @gpuixui/tokens test` | every file green |
| Types | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| Whole gate | `nub run check` | `check:tests`, lint, format and types pass |
| Repo test gate | `nub run test` | every workspace's suite passes |

`scripts/verify-two-directions.sh` is still written against `jj` while the repo
pins git (a cross-team row in `TODO.md`), so the both-directions proof is the
manual sequence above.

## 5. Test plan

- **Can the guard fail?** Yes, six ways: each of the six prose blocks it reads
  shipped with the phrase the case rejects, and each was verified to fail when
  that phrase was put back. The structural case fails if a later plan moves
  `selectedActive` into or out of a walk without the prose.
- **Surgical:** the cases read prose and list membership, not the palette. No
  shipped theme, pair, floor or metric is touched, so the contrast, selection,
  direction, metric and docs suites cannot move.
- **The counts:** `selectionSurfaces` is asserted at nine and the pressed pair at
  one entry; `contrastPairs` is already pinned at 470 by two other suites.
- **No colour:** nothing in `color.ts`, `platform-styles/`, `platform-recipes.ts`
  or the contrast module's pair data changes.

## 6. Acceptance

- [ ] The two source blocks, the catalogue paragraph, the three design-system
      passages, the doc pin and the case comment are corrected; no shipped
      passage claims the pressed fill is outside the selection-wash walk.
- [ ] `selection-press-exclusion.test.ts` passes and fails when any one of the
      six blocks it reads is restored.
- [ ] `selectionWashPairs` is 11 and `contrastPairs` is 470; no colour moves.
- [ ] `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md` and `TODO.md`
      record the plan; the plan index has its row.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.

## 7. STOP conditions

- **A corrected sentence would claim the pressed row's *text* is measured
  through the wash** → stop and report: plan `723` Decision 3 keeps those pairs
  at rest in `selectionPressPairs`, and this plan does not reopen it.
- **A guard wants `selectedActive` added to `selectionSurfaces` or to the
  washed text lists** → stop and report: that is plan `723` Decision 3, and
  `selectionSurfaces` also derives the caret's nine-surface figures.
- **The docs pin or another guard wants the old phrase kept** → update the pin to
  the corrected cell; never keep a false sentence to satisfy a test.
- **Any pair, colour, floor or metric wants to move** → stop: this plan changes
  prose and a guard only.
- **A gate fails in a file this workstream does not own** → report it; do not
  edit another workstream's tree.

## 8. Execution (2026-10-20)

- **Seven passages corrected.** `contrast.ts` (`selectionPressPairs`' and
  `selectionInputPairs`' JSDoc), `docs/tokens.md` (*Interaction states*),
  `docs/design-system.md` (§8 selected-row paragraph, §8 `disabled` row, §9
  inactive-label row), the `docs.test.ts` pin of the §9 row, and the
  `selection-input-text.test.ts` case comment. `grep -rn "deliberately outside
  the selection-wash\|a pressed row is transient\|a row is selected at rest"` over
  `packages/tokens/src`, `docs/` and `README.md` now returns only the two
  historical mentions in `selectionWashPairs`' JSDoc and the plan/TODO records.
- **New guard:** `selection-press-exclusion.test.ts`, 8 cases, reading the six
  prose blocks and the published pair lists. Each of the six directions was
  verified by restoring the old phrase and rerunning the file: 1 failed / 7
  passed in every case, then restored.
- **No pair, colour, floor, metric or role moved.** `selectionWashPairs` stays
  **11**, `selectionSurfaces` **nine**, `contrastPairs` **470**.
- **Gates:** the package suite is **202 files / 6961 tests** green (8 new);
  `check-types`, `check:tests`, `lint` and `fmt` pass. `nub run check`,
  `nub run test` and the scenario runs are recorded in the commit.

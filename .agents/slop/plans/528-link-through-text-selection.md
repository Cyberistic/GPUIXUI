# 528 — The link through a text selection

**Phase:** F (integration and polish) · **Workstream:** `tokens-theme` ·
**Depends on:** plans 071, 081, 082, 087, 314, 346, 351, 362, 366, 377, 391,
500, 506, 510, 525, 527 ·
**Number block:** 500–599 (`tokens-theme` overflow).

## 1. The bug

`docs/tokens.md` and `docs/design-system.md` call accent-toned text under a text
selection **the one deliberate omission** in the selection contract:

> An accent-toned link is the one deliberate omission: the shipped `primaryText`
> does not clear 7:1 at AAA, and macOS light measures 4.32:1 through the wash on
> `infoSoft`, under the default secondary floor.

The reasoning behind the omission is false. Plan `366` closed exactly this class
of gap for the four status tones: it found XP light `successText` at 3.671:1 on
`active`, moved the six light status roles one designed half-step, and the AA
floor held. `primaryText` is a **text role** — the catalogues say so, the
`primaryTextPairs` list holds it at the `secondary` floor, and plan `500` makes
the same argument for every surface's own body role. A link inside a paragraph,
a list row or an Alert is selected with the copy around it, like the status
label plan `366` covered.

The composition is unmeasured, and the shipped palettes fail it today. Measured
over the same thirteen surfaces the rest of the selection contract uses — the
nine `selectionSurfaces` plus the four soft status fills a link in a panel sits
on — with `selection` composited over each:

| shipped set | `primaryText` | worst washed surface | ratio | floor |
| --- | --- | --- | --- | --- |
| high-contrast light (all six AAA-light variants) | `#3B2C8F` | `destructiveSoft` | **5.376:1** | 7:1 |
| macOS light | `#0055B3` | `active` | **4.106:1** | 4.5:1 |
| macOS dark | `#64B5FF` | `selected` | **3.708:1** | 4.5:1 |
| Linux dark | `#99C1F1` | `selected` | **4.485:1** | 4.5:1 |
| Windows light | `#005BA1` | `selected` | **3.995:1** | 4.5:1 |
| Windows XP light | `#0046BD` | `selected` | **4.378:1** | 4.5:1 |
| Windows 7 (Aero) light | `#0F55A3` | `destructiveSoft` | **4.022:1** | 4.5:1 |

Twelve of the twenty-four shipped sets miss their floor (the six AAA-light
variants share one palette; six default sets fail on their own values), and
`themeContrastFailures` returns `[]` for every one of them because no pair names
the composition. The sets that already pass are identity light 4.789:1, identity
dark 5.170:1, high-contrast dark 8.096:1, Linux light 5.191:1 and the three
Windows-palette dark sets at 4.729:1.

The omission is asserted in `docs/tokens.md` (twice), `docs/design-system.md`,
`packages/tokens/README.md`, `contrast.ts` and two tests
(`docs.test.ts` quotes the cost; `selection-status-panel.test.ts` asserts the
exclusion), so it cannot be closed by adding pairs alone.

## 2. Decisions

1. **`selectionLinkPairs` is its own published list** — `primaryText` through
   the composited `selection` wash on `selectionSurfaces` (nine) and the four
   soft status fills, at the `secondary` floor. A separate list follows plan
   `366`'s precedent (`selectionStatusPairs`) and keeps `selectionPairs` meaning
   "each surface's body and secondary text".
2. **Thirteen pairs, not a folded list.** The soft fills are included because
   plan `346` already holds `primaryText` on them at rest, and an Alert's link is
   selectable (`selectionSoftPairs` covers the panel's other three text roles).
3. **Fix the palette, not the wash.** The `primaryText` role is the only thing
   that moves. The wash's own perceivability, the text tiers and every other
   role are untouched.
4. **No new ramp step.** The AAA light link needs a deeper step than `iris.800`
   (`#3B2C8F`, 5.376:1): `#241C5C` measures **7.484:1** on the worst washed soft
   fill. The AAA palettes already carry literals beside ramp references, so this
   is a designed literal, not a new global ramp.
5. **Escape the previous exclusion with evidence, not by weakening it.** The old
   sentence said "moving it would change the brand's text tonality". It does:
   the link stays in its own hue family in every set, and the `primary` fill,
   `primaryForeground`, the hover/pressed steps and `primaryText`'s at-rest pairs
   all still pass. The documents state the new rule instead of the exclusion.
6. **The examples already pass** — verified: `brandTheme` 4.704:1,
   `brandLightTheme` 4.670:1, the Contoso edited and authored themes 4.825–5.257.
   No example value moves and no example file is edited.

## 3. Exact edits

All paths are relative to the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

### 3.1 `packages/tokens/src/contrast.ts`

Insert the list immediately **after** `selectionStatusPairs` (currently ends
around line 1389):

```ts
/**
 * The brand-toned link a reader selects with the copy around it. `primaryText`
 * is a text role — plan `082` split it from the `primary` fill for exactly that
 * reason — and a link in a paragraph, a list row or an Alert's description is
 * dragged over like the text beside it. The wash is composited over the nine
 * `selectionSurfaces` and the four soft status fills plan `346` already holds
 * the role on at rest, so a copied theme cannot erase a selected link while the
 * checker returns `[]`.
 *
 * The audit found the omission hiding twelve failing shipped sets: the AAA light
 * link measured **5.376:1** through the wash on `destructiveSoft` under its 7:1
 * floor, macOS dark **3.708:1** on `selected`, Windows light 3.995:1, XP light
 * 4.378:1, Aero light 4.022:1, macOS light 4.106:1 on `active` and Linux dark
 * 4.485:1 on `selected`, all under 4.5:1. Seven values move inside their own
 * families and every shipped set clears its floor (4.729:1 at the tightest,
 * Windows dark; 7.484:1 at AAA).
 */
export const selectionLinkPairs: readonly ContrastPair[] = [
  ...selectionSurfaces.map(
    (background): ContrastPair => ["primaryText", background, "secondary"],
  ),
  ...softSurfaceRoles.map(
    (background): ContrastPair => ["primaryText", background, "secondary"],
  ),
];
```

In `themeContrastFailures`, insert the call **after** the status pairs and
before the inactive pairs:

```ts
    ...textOverWashFailures(selectionStatusPairs, "selection", theme, floors),
    ...textOverWashFailures(selectionLinkPairs, "selection", theme, floors),
```

In the big JSDoc above `themeContrastFailures`, in the second bullet
(`selectionPairs`, `selectionStatusPairs`, …), append a sentence:

> `selectionLinkPairs` holds the brand-toned link through the same wash on the
> same surfaces, because `primaryText` is text a reader selects.

In `selectionSoftPairs`' JSDoc, replace

> Accent-toned text is the one deliberate omission (plan 087): no wash that
> stays perceivable keeps a link at 7:1 at AAA.

with

> The brand-toned link is measured separately by `selectionLinkPairs`, on these
> four fills and the nine selection surfaces (plan `528`).

### 3.2 `packages/tokens/src/color.ts`

- `highContrastLightColors.primaryText`: `palette.iris[800]` → `"#241C5C"` with a
  two-line comment:

  ```ts
  // The AAA light link keeps the 7:1 secondary floor through the selection
  // wash on a soft status fill; the 800 step measures 5.376:1 there (plan 528).
  primaryText: "#241C5C",
  ```

- `highContrastLightColors`' JSDoc: append one sentence naming the deeper link
  and the washed soft fill.
- `ThemeColors.primaryText`'s JSDoc becomes:

  ```ts
  /** Brand-toned text, links and icons on plain surfaces, row fills and through a text selection. */
  ```

### 3.3 Platform styles — six values in five files

Each value stays inside its own accent family; only the shipped literals change.
Append one sentence to each touched file's header comment: “The link keeps the
secondary floor through the selection wash (plan 528).”

| file | mode | old | new | worst served surface |
| --- | --- | --- | --- | --- |
| `src/platform-styles/macos.ts` | light | `#0055B3` | `#004A9A` | `active` 4.952:1 |
| `src/platform-styles/macos.ts` | dark | `#64B5FF` | `#96CDFF` | `selected` 4.820:1 |
| `src/platform-styles/linux.ts` | dark | `#99C1F1` | `#A5CBF5` | `selected` 4.967:1 |
| `src/platform-styles/windows.ts` | light | `#005BA1` | `#004F8A` | `selected` 4.841:1 |
| `src/platform-styles/recipes/xp.ts` | light | `#0046BD` | `#003FA8` | `selected` 5.022:1 |
| `src/platform-styles/recipes/aero.ts` | light | `#0F55A3` | `#0C4A8C` | `destructiveSoft` 4.826:1 |

The XP and Aero dark halves read the Windows dark palette, so no second dark
edit exists. `src/platform-styles/default.ts` overrides no colour and stays.

### 3.4 `packages/tokens/src/selection-link.test.ts` (new)

Header comment states the bug being guarded (plan 087's documented omission; the
AAA light 5.376:1 and macOS dark 3.708:1 failures; every check returned `[]`).
Cases:

1. `measures the link through the wash on every surface a reader selects` —
   assert `selectionLinkPairs` has 13 entries and its backgrounds equal
   `[...selectionSurfaces, "infoSoft", "successSoft", "warningSoft",
   "destructiveSoft"]` in that order, and every `pairClass` is `secondary`.
2. `keeps every shipped link above its floor through the wash` — loop
   `shippedThemes` × `selectionLinkPairs`; assert the ratio clears
   `contrastFloors[theme.contrast][pairClass]`. Derive the tightest default and
   AAA figures and assert **4.729:1** (Windows dark, `selected`) and **7.484:1**
   (high-contrast light, `destructiveSoft`).
3. `records the pre-528 regressions` — for each of the seven old values, build
   the shipped theme with the old `primaryText` via `extendTheme` and assert
   `themeContrastFailures` reports exactly the link pairs that fail, naming the
   expected worst surface:
   - `getTheme("light", "high")` with `#3B2C8F` → the four soft fills plus
     `selected`/`active`/… under 7 (assert at least `destructiveSoft` at
     5.376:1 and `muted` at 6.748:1);
   - macOS light `#0055B3` → `active` at 4.106:1;
   - macOS dark `#64B5FF` → `selected` at 3.708:1;
   - Linux dark `#99C1F1` → `selected` at 4.485:1;
   - Windows light `#005BA1` → `selected` at 3.995:1;
   - XP light `#0046BD` → `selected` at 4.378:1;
   - Aero light `#0F55A3` → `destructiveSoft` at 4.022:1.
   Each assertion pins the ratio to three decimals and the failing background.
4. `keeps the at-rest link pairs and the family intact` — for every shipped set,
   `themeContrastFailures(theme)` filtered to `foreground === "primaryText"` is
   `[]`, and the `primaryText` at-rest pairs (`primaryTextPairs` equivalent:
   filter `contrastPairs`) all still clear their floor; assert the tightest
   at-rest figure is 5.675:1 (Linux dark, `selected`).
5. `reports a copied theme whose link matches its selection wash` — set
   `primaryText` to the composited selection wash over `card` and assert the
   checker names `primaryText` on all thirteen backgrounds.

### 3.5 `packages/tokens/src/contrast.test.ts`

- Import `selectionLinkPairs`.
- Add `["selectionLinkPairs", selectionLinkPairs]` to `publishedPairLists`.
- In the shapes case, add `expect(selectionLinkPairs).toHaveLength(13);` beside
  the other selection lengths.
- In `reports an opaque selection wash over every painted surface`, insert
  `...selectionLinkPairs.map(([foreground, background]) => [foreground,
  background])` **after** the `selectionStatusPairs` spread and before the
  `selectionSoftPairs` spread (the checker's order).
- In the contract-completeness block, add `...selectionLinkPairs` to the
  `measuredRoles` sources (it is already covered by `primaryText`, but the list
  belongs with its peers).

### 3.6 `packages/tokens/src/contrast-reference.test.ts`

- Add `"selectionLinkPairs"` to `appliedLists`, after `selectionStatusPairs`.
- Keep the guard's existing assertions; they now require the JSDoc to name it.

### 3.7 `packages/tokens/src/inventory.test.ts`

- Import `selectionLinkPairs` and add
  `` `${selectionLinkPairs.length} link-selection text pairs` `` to the phrase
  list in “states the contract's pair counts from the pair lists”.

### 3.8 `packages/tokens/src/selection-status-panel.test.ts`

Replace the case `leaves accent-toned text out, with its measured reason` with a
case asserting the opposite contract: `selectionLinkPairs` names `primaryText`
on all four soft fills, and the shipped macOS light link measures 4.952:1 through
the wash on `infoSoft` (derive it — do not restate a literal that the palette no
longer produces).

### 3.9 `packages/tokens/src/docs.test.ts`

- Rewrite the case `quotes the AAA wash-link cost` (around line 536) as
  `quotes the washed link's tightest pairs`: derive the tightest default and AAA
  `primaryText` washed pair over the thirteen surfaces from `shippedThemes` (the
  label convention is the one `scrimSets` uses) and assert the design-system
  sentence contains both derived figures with their labels and surfaces.
- In `quotes the row-text and status ratios the shipped themes produce`
  (line 1240), change
  `["primaryText", "selected", "macOS dark", 4.58]` →
  `["primaryText", "selected", "Linux dark", 5.68]` and
  `["primaryText", "destructiveSoft", "Windows light", 5.26]` →
  `["primaryText", "destructiveSoft", "identity light", 6.19]`.
- The floor-table rows array gains one row (exactly this string):

  ```
  | text selection of brand-toned text (`primaryText` over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`/`selected` and on `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`) | 4.5:1 | 7:1 |
  ```

  with both floor cells built from `contrastFloors.default.secondary` and
  `contrastFloors.high.secondary`, like its neighbours.
- The exact-prose case that builds the catalogue's link paragraph gains the new
  described text (see §3.10) — run `nub run --filter @gpuixui/tokens test --
  docs` and let the failure name the assertion.

### 3.10 `docs/tokens.md`

- Role table (identity): the `primaryText` “Use” cell gains “… and through a
  text selection”.
- High-contrast role table: `primaryText` light value `#3B2C8F` → `#241C5C`;
  same “Use” wording.
- The brand-toned-text paragraph near line 183: the macOS sentence now reads
  “while its text step `#004A9A` clears both”; leave the `primary` figures.
- The selection audit section (around line 1285): replace the omission sentence
  with the rule and the evidence — the thirteen surfaces, twelve failing sets,
  the worst pre-528 figures, the seven values, the new tightest figures (4.729
  default, 7.484 AAA) and the fact that the at-rest pairs still clear their
  floor.
- The audit paragraph near line 2374: `primaryText` on `selected` **4.58:1**
  (macOS dark) → **5.68:1** (Linux dark); on `destructiveSoft` **5.26:1**
  (Windows light) → **6.19:1** (identity light).
- The `themeContrastFailures` description list gains a clause naming
  `selectionLinkPairs` beside the other selection lists.
- Plan history: append a plan `528` paragraph after the plan `527` paragraph,
  stating that `contrastPairs` stays **404** and the selection contract gains
  **thirteen** pairs.
- Ensure the identifiers `selectionLinkPairs` appears exactly once as a value
  name (the “names every exported value” guard reads the whole page).

### 3.11 `docs/design-system.md`

- §8 `link` row: append “, through a text selection too”.
- §8 `text selection` row: add the brand-toned link to the list of text roles it
  holds.- §9 floor table: add the row from §3.9 verbatim (the guard compares the exact
  string).
- §9, before “Not covered, deliberately”: add the measured sentence —

  > Brand-toned text is measured through the wash as well: `primaryText` over the
  > composited `selection` wash, tightest **4.729:1** (Windows dark, on
  > `selected`) and **7.484:1** at AAA (high-contrast light, on
  > `destructiveSoft`).

- §9 “Not covered, deliberately”: delete the accent-toned-link bullet. The other
  two bullets stay.

### 3.12 `packages/tokens/README.md`

- The selection paragraph (around line 390): replace “accent-toned links stay the
  documented omission” with the new rule — the link is measured on the nine
  surfaces and the four soft fills, the seven values moved, the tightest figures.
- The brand-toned-text paragraph (around line 74): name the washed selection
  beside the at-rest surfaces.

### 3.13 `COMPONENTS.md`

- `Design tokens` row: in the selection clause, replace the “deliberately not a
  body tier …” continuation so it names `selectionLinkPairs` and the thirteen
  pairs; keep the sentence short and reference plan 528.
- `Theme contrast check` row: `26 selection pairs` stays, and the list gains
  `13 link-selection text pairs` after `36 status-selection text pairs`; append
  one sentence with the pre-528 evidence and the two tightest figures.

### 3.14 `TODO.md`

Add one ticked row before the cross-team block:

```
`[x]` Hold a brand-toned link through the text-selection wash — `primaryText` is
a text role, and a link in a paragraph, row or Alert is selected with the copy
around it, but the selection contract called it “the one deliberate omission”
(plan 087) while twelve of the twenty-four shipped sets missed their floor:
AAA light **5.376:1** on `destructiveSoft` under 7:1, macOS dark 3.708:1 on
`selected`, Windows light 3.995:1, XP light 4.378:1, Aero light 4.022:1, macOS
light 4.106:1 and Linux dark 4.485:1, all under 4.5:1, while every check
returned `[]`; `selectionLinkPairs` adds thirteen pairs (nine surfaces + the
four soft fills), seven values move one designed step inside their own families
(AAA light `#3B2C8F` → `#241C5C`, macOS `#0055B3` → `#004A9A` / `#64B5FF` →
`#96CDFF`, Linux dark `#99C1F1` → `#A5CBF5`, Windows light `#005BA1` →
`#004F8A`, XP `#0046BD` → `#003FA8`, Aero `#0F55A3` → `#0C4A8C`), every
shipped set passes (4.729:1 at the tightest, Windows dark; 7.484:1 at AAA) and
the plain 404 pairs do not move (plan 528)
```

Bump the section bar from `192/254` to `193/255`.

### 3.15 `.agents/slop/plans/README.md`

Add to the table after the 527 row:

```
| [528](./528-link-through-text-selection.md) | The link through a text selection | F | 071, 081, 082, 087, 314, 346, 351, 362, 366, 377, 391, 500, 506, 510, 525, 527 | done |
```

Append a plan-528 paragraph after the plan-527 paragraph, with the evidence, the
seven values and the two tightest figures.

## 4. Commands and expected results

Run in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

1. **Before the fix**, add nothing and run
   `nub run --filter @gpuixui/tokens test -- selection-link`.
   Expected: no test file — this proves the gap is untested. (Create the file
   only after the source edits are planned here; the two-directions check in
   §6 proves it fails without them.)
2. `nub run --filter @gpuixui/tokens test -- selection-link` after the edits →
   all five cases pass and the derived figures are 4.729 / 7.484 / 5.675.
3. `nub run --filter @gpuixui/tokens test -- contrast` → the new length, the
   opaque-wash order and the completeness guard pass.
4. `nub run --filter @gpuixui/tokens test -- contrast-reference` → the JSDoc
   names the new list.
5. `nub run --filter @gpuixui/tokens test -- inventory` → the ledger states the
   phrase.
6. `nub run --filter @gpuixui/tokens test -- docs` → the catalogue, the design
   system and the floor table agree with the implementation.
7. `nub run --filter @gpuixui/tokens test -- soft-panel-text` → update its quoted
   `primaryText`/`destructiveSoft` row from 5.26 (Windows light) to 6.19
   (identity light) in the same edit; the case then passes.
8. `nub run --filter @gpuixui/tokens test -- theme platform` → the brand and
   Contoso examples still return `[]` from `themeFailures` (they pass today at
   4.670–5.257:1 through the wash; no example value moves).
9. `nub run --filter @gpuixui/tokens test` → record the file/test counts from the
   run; do not quote a number the run did not print.
10. `nub run check` → `check:tests`, lint, format and `check-types` pass.
11. `nub run lint` and `nub run test` → both pass.

## 5. STOP conditions

Stop and report instead of improvising if:

- Any shipped set fails a **new** link pair after the table in §3.3. Report the
  theme, surface and ratio; a second palette move needs its own plan.
- Any **at-rest** `primaryText` pair changes its figure in a failing direction,
  or the tightest at-rest pair is not 5.675:1 (Linux dark, `selected`). The move
  only darkens light-mode links and lightens dark-mode ones, so an at-rest
  regression means a different value moved.
- `themeColorFailures` (or `themeMetricFailures`, `themeTextTierFailures`,
  `themeDirectionFailures`) becomes non-empty for a shipped set or an example.
- The AAA light value needs to go below `#241C5C` to clear 7:1 — that means the
  surface it sits on moved; report before darkening further.
- `docs.test.ts` fails on a claim this plan did not list. Find the drift; do not
  rewrite an unrelated claim to make it pass.
- The measured tightest figures are not 4.729:1 (Windows dark, `selected`) and
  7.484:1 (high-contrast light, `destructiveSoft`). Paste what the run printed.
- `selectionLinkPairs` cannot be added without breaking `selectionPairs`' meaning
  (it must not be folded into that list).

## 6. Test plan

| What can break | The case that catches it |
| --- | --- |
| The contract loses the composition | `selection-link.test.ts` case 1; `contrast.test.ts` length 13 and `publishedPairLists` |
| A shipped link disappears through a wash | case 2 (24 sets × 13 surfaces) |
| A copied theme re-introduces a pre-528 value | case 3 (seven exact regressions) |
| The fix darkens or lightens the at-rest role out of its family | case 4 + `themeFailures` on every example |
| A theme whose link equals its own wash passes | case 5 (thirteen reported pairs) |
| The reference stops naming the list | `contrast-reference.test.ts` |
| The ledger or a document re-states the omission | `docs.test.ts`'s exact-prose cases |
| A document quotes a stale figure | the rewritten “washed link's tightest pairs” and the updated row-text quote |
| A shipped platform style keeps the old literal | case 2's per-set loop |

To prove both directions, keep the fix as a patch and run the new suite twice:

```bash
git diff packages/tokens/src/contrast.ts packages/tokens/src/color.ts \
  packages/tokens/src/platform-styles > /tmp/plan-528.patch
git apply -R /tmp/plan-528.patch
nub run --filter @gpuixui/tokens test -- selection-link   # must fail
git apply /tmp/plan-528.patch
nub run --filter @gpuixui/tokens test -- selection-link   # must pass
```

Record both outputs in the commit message. (`scripts/verify-two-directions.sh`
is the repo convention; its `jj`-based root lookup does not resolve in this
worktree, so the manual pairing above is the honest equivalent.)

## 7. Acceptance criteria

- [ ] `selectionLinkPairs` publishes 13 pairs: `primaryText` on the nine
      `selectionSurfaces` and the four soft status fills, class `secondary`.
- [ ] `themeContrastFailures` composes it, and every shipped set, every
      base × style composition and both executed examples return `[]`.
- [ ] The seven values in §3.3 are the new ones; every shipped set clears its
      floor through the wash (4.729:1 and 7.484:1 at the tightest).
- [ ] `contrastPairs` stays **404**; the selection contract gains 13.
- [ ] The omission is gone from `docs/tokens.md`, `docs/design-system.md`, the
      README, `contrast.ts` and both tests; each states the rule and the
      evidence.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the README, `COMPONENTS.md`,
      `TODO.md` and the plan index state the new counts and figures.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.

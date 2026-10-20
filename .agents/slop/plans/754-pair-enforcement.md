# 754 — A published pair list is enforced, not only unique

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (contract completeness).
**Depends on:** 071 (the contrast contract), 349 (the uniqueness guard),
546 (the export-derived inventory), 651/737 (the newest lists), 544 (the quoted
figures over all shipped sets).

## 1. The defect

The contract publishes **44 pair lists** (`*Pairs` exports). Two guarantees hold
them today:

- `contrast.test.ts` asserts every list is *unique* — no repeated
  `[foreground, background, class]` (plan 349);
- the inventory is a compile-checked record, so a new `*Pairs` export fails
  `check-types` until it is listed (plan 546).

Neither guarantee says a listed pair is **measured**. `themeContrastFailures`,
`themeHighlightFailures` and the other checks compose a hand-written sequence of
walks:

```ts
return [
  ...pairFailures,                                  // contrastPairs + nativeSyntaxPairs
  ...textOverWashFailures(selectionPairs, "selection", …),
  ...textOverWashFailures(selectionStatusPairs, …),
  …
  ...washVisibilityFailures(overlayWashPairs, "overlay", …),
  ...textOverWashFailures(dialogSurfacePairs, "overlay", …),
  ...elevationFailures(theme, floors),
];
```

A list added to `publishedPairLists` and never added to one of those walks
passes uniqueness, passes `check-types`, and its pairs are exempt from every
public check — the same class of hole plans 349 and 546 fixed one step earlier,
now one step further along. The catalogue states the guarantee that would be
false:

> The suite derives its inventory from the package's exports, so a list added
> later cannot ship without the check.

"Without the check" means without the *uniqueness* check. It does not mean the
pairs are enforced.

## 2. Exact changes

### 2.1 `packages/tokens/src/published-pair-lists.ts` (new)

Move the inventory out of `contrast.test.ts` now that it has a second consumer
(the AGENTS rule: hoist on the second consumer), unchanged in content:

- the `PairListName` mapped type over `Tokens` exports;
- the `publishedPairLists: Readonly<Record<PairListName, ReadonlyArray<ContrastPair>>>`
  record;
- a JSDoc paragraph naming **both** consumers — uniqueness in `contrast.test.ts`
  and enforcement in `pair-enforcement.test.ts` — and the rule that a new list
  is listed once.

It is a test-support module beside the suite, like `full-set-claims.ts`: not
exported from `index.ts`, no public API change.

### 2.2 `packages/tokens/src/contrast.test.ts`

Delete the local `PairListName` and `publishedPairLists`; import
`publishedPairLists` from `./published-pair-lists.js`. Keep
`publishedPairListEntries` and every case unchanged. The import list loses the
`Tokens` namespace only if it has no other use — check before deleting it.

### 2.3 `packages/tokens/src/pair-enforcement.test.ts` (new)

One guarantee: **every published pair is reported by a public check when the
theme paints it wrong.**

```ts
const base = getTheme("light");

/** The pair's two roles painted the same colour — a ratio of 1.0. */
const planted = ([foreground, background]: ContrastPair): Theme =>
  extendTheme(base, { colors: { [foreground]: base.colors[background] } });

/** The dialog face walk composites the scrim first, so plant the composite. */
const plantedFace = ([, background]: ContrastPair): Theme =>
  extendTheme(base, {
    colors: { popover: compositeOver(base.colors.overlay, base.colors[background]) },
  });

/** The face-on-itself pair needs the scrim planted instead: the face and the
 *  scrimmed surface are one role, so moving the face moves the composite too. */
const plantedScrim = ([foreground]: ContrastPair): Theme =>
  extendTheme(base, { colors: { overlay: base.colors[foreground] } });

const reported = (theme: Theme, [foreground, background]: ContrastPair): boolean =>
  [...themeContrastFailures(theme), ...themeHighlightFailures(theme)].some(
    (failure) =>
      failure.foreground === foreground &&
      ("background" in failure ? failure.background === background
                               : failure.surface === background),
  );
```

- **case 1 — every published pair is enforced.** For every entry of
  `publishedPairLists`, every pair, deduplicated by `` `${foreground}|${background}` ``
  (the aggregate `contrastPairs` repeats most of them), assert `reported(...)`.
  `dialogSurfacePairs` tries both dialog plants; every other list uses `plant`.
  Failure message names the list and the pair, so a missing walk is actionable.
  The one composition the face plant cannot reach is `popover` on `popover` —
  a dialog over the page's own floating surface — because the face and the
  scrimmed surface are the same role: moving the face moves the composite, so
  `plantedScrim` paints the scrim as the face and the pair collapses to 1.0.
  Verified: the case passes in 1.9 s over the whole inventory.
- **case 2 — the guard can fail.** A planted local list
  `[["warning", "infoSoft", "body"]]` (a composition no walk measures) is fed to
  the same two strategies and must be reported *not enforced*. This is the
  can-fail half: it proves the case-1 predicate is not vacuous.
- **case 3 — the inventory is the export set.** The record's keys equal the
  package's `*Pairs` exports, read from the `Tokens` namespace. The mapped type
  already enforces it at compile time; the case fails loudly at runtime if the
  type is ever weakened to `Partial` or `Record<string, …>`.

Runtime: ~500 unique compositions, two checks each; well inside the package's
20 s budget (plan 333). If it is not, narrow to `themeContrastFailures` plus a
single `themeHighlightFailures` call over the highlight list only — record the
measurement in the commit body.

### 2.4 `docs/tokens.md` — *Verification*, after the uniqueness paragraph

Append one paragraph:

> Enforcement is checked beside uniqueness: `pair-enforcement.test.ts` plants
> every published pair on the shipped light theme — the two roles set to the same
> colour, and for the dialog face the face set to the scrimmed surface — and
> fails unless a public check reports that pair, so a list that is listed and
> unique but never walked cannot pass for part of the contract.

No count and no figure, so the paragraph cannot drift with the lists.

### 2.5 `packages/tokens/src/docs.test.ts`

Extend the existing case *“states that the uniqueness inventory is derived”*
with the new sentence (normalised prose, exact substring), so the page and the
suite move together.

### 2.6 `COMPONENTS.md` — *Theme contrast check* row

After the plan-546 clause (“… a new list now fails `check-types` until it is
covered.”) add:

> Plan `754` holds the inventory to **enforcement** as well: `pair-enforcement.test.ts` plants every published pair and fails unless a public check reports it.

No status change.

### 2.7 `TODO.md`

One completed row under *Design tokens and theming* naming plan `754`, the two
guarantees and the can-fail case. Progress bar `340/417` → `341/418`.

### 2.8 `.agents/slop/plans/README.md`

Index this plan after `753` and add one sentence to the block summary: the pair
inventory now proves enforcement, not only uniqueness.

## 3. Commands

```sh
# 1. The new guard against the current tree (§2.1–2.3 applied, no other change):
nub run --filter @gpuixui/tokens test pair-enforcement

# 2. The moved inventory still satisfies its first consumer:
nub run --filter @gpuixui/tokens test contrast.test

# 3. The docs guards:
nub run --filter @gpuixui/tokens test docs.test readme

# 4. Package gate:
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types

# 5. Repo gate:
nub run check
nub run lint
nub run test
```

Expected: step 1 passes all three cases; the can-fail case fails if the planted
pair is in fact measured (then pick another, see §4); steps 2–3 pass after
§2.4–2.5; step 4–5 green.

## 4. STOP conditions

- **The can-fail fixture is enforced after all.** `["warning", "infoSoft"]` must
  be unmeasured today (no `warning` foreground pair exists). If a probe finds it
  measured, choose another composition and record it; do not weaken case 2 to a
  synthetic string.
- **A published pair is genuinely unenforced today.** Then this is not a guard
  plan: stop, report the pair and the walk it belongs to, and write the fix as
  its own plan before landing the guarantee.
- **`contrast.test.ts` has changed shape** (the record is no longer local, or
  `publishedPairListEntries` reads something else): re-read the file before
  moving code; do not duplicate the record.
- **The new case exceeds the package budget** under a full parallel run: narrow
  to the two checks named in §2.3 and record the measured time; do not raise
  `testTimeout`.

## 5. Test plan

`pair-enforcement.test.ts` (new) — the three cases above.

Two-direction proof:

1. run case 1 with `dialogSurfacePairs` forced onto the default strategy →
   **fails** (the face is composited, so `popover = background` still clears the
   floor); restore the face strategy → passes. This proves a missing walk or a
   wrong strategy is caught;
2. run case 2 against `["warning", "infoSoft"]` → reports it unenforced; change
   the fixture to `["primary", "card"]` (measured as a mark) → case 2 fails,
   proving the predicate can distinguish;
3. delete one walk line from `themeContrastFailures` locally (e.g.
   `selectionStatusPairs`) → case 1 fails on that list; restore it.

Record the pre-fix and restored runs in the commit body.

## 6. Acceptance

- [ ] `publishedPairLists` lives in one module, imported by both suites; no
      public export changes.
- [ ] Case 1 covers every entry of the inventory, deduplicated, with the dialog
      face on its own strategy.
- [ ] Case 2 proves the predicate can report an unenforced pair.
- [ ] The catalogue states the guarantee and `docs.test.ts` pins the sentence.
- [ ] `COMPONENTS.md`, `TODO.md` and the plan index carry the row.
- [ ] `nub run check`, `nub run lint`, `nub run test` green.
- [ ] No token value, pair, floor, metric, role, platform style or shipped theme
      moves; `contrastPairs` stays 470.

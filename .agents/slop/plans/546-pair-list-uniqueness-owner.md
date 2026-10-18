# 546 — "Every exported pair list" checked 28 of 35

**Workstream:** `tokens-theme`. **Phase:** F (guard quality).
**Depends on:** 071 (the contrast contract), 349 (content uniqueness — the
defect this guard exists for), 339 / 340 / 394 / 514 (the seven lists added
after 349 and never joined the uniqueness list).
**Files:** `packages/tokens/src/contrast.test.ts`, `docs/tokens.md`,
`packages/tokens/src/docs.test.ts`, `COMPONENTS.md`, `TODO.md`, this plan index.

## 1. The defect

`docs/tokens.md` publishes a guarantee:

> Every exported pair list is held to content uniqueness: a repeated
> `[foreground, background, class]` would make the checker report one
> composition twice, so `contrast.test.ts` fails on it.

Plan 349 made that sentence true for the lists that existed then. It then went
false, silently, for every list added afterwards:

`contrast.test.ts` builds `publishedPairLists` as a **hand-typed array of 28
entries**. The package exports **35** `*Pairs` values; these seven are absent:

| List | Added by |
| ---- | -------- |
| `ringTrackPairs` | 516 |
| `selectionInactivePairs` | 510 |
| `skeletonPulsePairs` | 393 |
| `softActionPairs` | 394 |
| `softActionStepPairs` | 394 |
| `softActionLabelPairs` | 394 |
| `inactivePanelActionPairs` | 514 |

Six of the seven are folded into `contrastPairs`, so a duplicate there does fail
— but under the **master list's** name, not the list that owns it, which is what
the catalogue's “inside each list” sentence promises. The seventh,
`selectionInactivePairs`, is applied directly by `themeContrastFailures`
(`textOverWashFailures`) and is in no other checked list: a duplicate there
makes the checker report the same missed composition twice — the exact plan-349
defect — while every suite stays green. A probe on the pre-fix tree appends a
duplicate to `selectionInactivePairs` and the suite passes 33/33 (§4.2).

No shipped list contains a duplicate today, so the fix is the guard, not a
value: the unit is guard-only, like plans 372, 501 and 543.

The root cause is the form of the list, not the seven omissions: a hand-typed
inventory of exported names cannot stay complete when the module gains a value.
Every other inventory in this package is either derived from its domain
(`colorRoles`, `textRoles`, `metricMembers`, `contrastPairClasses`,
`shippedThemes`) or compile-enforced from a `Record` over a derived key union.
This one is neither.

## 2. The rule to state

**The module owns the inventory.** The uniqueness check enumerates a
`Record` whose key type is derived from the package's own export names, so a new
`*Pairs` export fails `check-types` until the suite lists it. The documentation
says the list is derived, and a guard holds that sentence to the implementation.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.test.ts` — derive the inventory

1. Add the namespace import beside the existing package imports:

```ts
import * as Tokens from "./index.js";
```

Keep every existing named import: the cases below use the values directly.

2. Replace the hand-typed `publishedPairLists` (currently lines 255-286, from
   `const publishedPairLists` through the closing `];`) with a derived key union
   and a compile-checked record:

```ts
/**
 * Every exported pair list, keyed by its export name. The key type is derived
 * from the package's exports, so a new `*Pairs` value fails `check-types` until
 * it is listed here; the record form (rather than an array literal) is what
 * makes the inventory compile-enforced.
 */
type PairListName = {
  [Name in keyof typeof Tokens]: Name extends `${string}Pairs` ? Name : never;
}[keyof typeof Tokens];

const publishedPairLists: Readonly<
  Record<PairListName, ReadonlyArray<ContrastPair>>
> = {
  contrastPairs,
  controlBoundarySoftPairs,
  dialogSurfacePairs,
  inactivePairs,
  inactivePanelActionPairs,
  inactiveSoftPairs,
  invalidRingPairs,
  markPairs,
  overlayWashPairs,
  ringSoftPairs,
  ringTrackPairs,
  selectionFillInactivePairs,
  selectionFillPairs,
  selectionFillWashPairs,
  selectionInactivePairs,
  selectionLinkPairs,
  selectionPairs,
  selectionSoftPairs,
  selectionSoftWashPairs,
  selectionStatusPairs,
  selectionStepPairs,
  selectionWashPairs,
  skeletonPulsePairs,
  softActionLabelPairs,
  softActionPairs,
  softActionStepPairs,
  softBorderSurfacePairs,
  softPanelTextPairs,
  stateFillSurfacePairs,
  stateStepPairs,
  statusFillPairs,
  toastTonePairs,
  trackMarkPairs,
  trackSurfacePairs,
  washStepPairs,
};
```

3. Replace the loop body of `never repeats a composition inside a list` with the
   record entries, and add the two cases that make the derivation itself
   observable:

```ts
const publishedPairListEntries = Object.entries(publishedPairLists);

describe("published pair lists", () => {
  it("detects a repeated composition, so the guard can fail", () => {
    expect(
      duplicatePairKeys([
        ["border", "card", "divider"],
        ["border", "card", "divider"],
      ]),
    ).toEqual(["border|card|divider"]);
  });

  it("derives the inventory from the package's exports", () => {
    expect(publishedPairListEntries.map(([name]) => name)).toContain(
      "contrastPairs",
    );
    expect(publishedPairListEntries.length).toBeGreaterThan(1);
  });

  it("never repeats a composition inside a list", () => {
    publishedPairListEntries.forEach(([name, pairs]) => {
      expect(duplicatePairKeys(pairs), name).toEqual([]);
    });
  });
});
```

`Object.entries` on a `Readonly<Record<PairListName, …>>` keeps both the name and
the typed list, so no assertion or `any` is needed. The `length > 1` case is an
anchor, not a count: it only proves the namespace walk is not empty, while the
key union does the completeness work at compile time.

4. Update the file header's plan-349 paragraph to say the inventory is now
   derived — leave the rest of the header intact:

```ts
 * Lists that measure the same roles through a different wash are separate
 * checks, not duplicates, so uniqueness is asserted inside each published list,
 * never across lists. Plan 546 derives the inventory from the package's exports,
 * after seven lists shipped outside the hand-typed array.
```

### 3.2 `docs/tokens.md` — state the owner

Replace the sentence at the start of the uniqueness paragraph (currently
line 1762):

> Every exported pair list is held to content uniqueness: a repeated
> `[foreground, background, class]` would make the checker report one
> composition twice, so `contrast.test.ts` fails on it.

with:

> Every exported pair list is held to content uniqueness: a repeated
> `[foreground, background, class]` would make the checker report one
> composition twice, so `contrast.test.ts` fails on it. The suite derives its
> inventory from the package's exports, so a list added later cannot ship
> without the check.

No other claim, figure, table or value changes.

### 3.3 `packages/tokens/src/docs.test.ts` — guard the sentence

Add one case beside the other uniqueness/contract cases (the file already reads
`docs/tokens.md` as `markdown`):

```ts
  it("states that the uniqueness inventory is derived", () => {
    expect(markdown).toContain(
      "The suite derives its inventory from the package's exports, so a list added later cannot ship without the check.",
    );
  });
```

Prove it can fail by deleting the sentence locally (see §4).

### 3.4 `COMPONENTS.md` — the ledger records the guard

In the *Theme contrast check* row, after the sentence that ends
"… so `contrast.test.ts` fails on it." add:

> Plan 546 derives that inventory from the package's `*Pairs` exports through a
> compile-checked record after seven lists (`ringTrackPairs`,
> `selectionInactivePairs`, `skeletonPulsePairs`, `softActionPairs`,
> `softActionStepPairs`, `softActionLabelPairs`, `inactivePanelActionPairs`)
> shipped outside the hand-typed array; a new list now fails `check-types` until
> it is covered.

Do not touch the row's pair counts or floor numbers.

### 3.5 `TODO.md` — tick the unit

Add under *Design tokens and theming (`tokens-theme`)*:

```
`[x]` Make the uniqueness guarantee own its inventory — `docs/tokens.md` says
"every exported pair list is held to content uniqueness", but
`contrast.test.ts` checked a hand-typed 28-entry array while the package exports
35 lists, so `ringTrackPairs`, `selectionInactivePairs`, `skeletonPulsePairs`,
`softActionPairs`, `softActionStepPairs`, `softActionLabelPairs` and
`inactivePanelActionPairs` could carry a duplicate and report one composition
twice while every suite stayed green; the inventory is now a record keyed by the
package's own export names, so a new list fails `check-types` until it is
covered, and the catalogue sentence names that owner (plan 546)
```

### 3.6 Plan index

Add the row to `.agents/slop/plans/README.md` in the `tokens-theme` table:

```
| [546](./546-pair-list-uniqueness-owner.md) | "Every exported pair list" checked 28 of 35 | F | 071, 339, 340, 349, 393, 394, 510, 514, 516 | done |
```

and a short paragraph in the prose tail, in the same voice as the 545 entry,
after the implementation lands.

### 3.7 Audit record

Add `.agents/slop/rd/2026-10-18-tokens-next-546.md` with what landed, the queue
state and the candidates re-checked (the same shape as the earlier `rd` notes).

## 4. Test plan — prove both directions

1. **Baseline:** `nub run --filter @gpuixui/tokens test` → 131 files / 5639 tests
   pass, exit `0`.
2. **The old guard misses a real duplicate (pre-fix direction):** on the
   unmodified tree, wrap `selectionInactivePairs` in an array literal and append
   `["disabledForeground", "background", "inactive"]` — a duplicate of its first
   entry. With the HEAD version of `contrast.test.ts`, run
   `./node_modules/.bin/vitest run src/contrast.test.ts` → **33/33 pass**
   (the hand array does not include `selectionInactivePairs`, and no master list
   folds it in). Record this; revert the edit.
3. **The new guard catches it (post-fix direction):** apply the same duplicate
   with §3.1 in place → `never repeats a composition inside a list` **fails**
   with `selectionInactivePairs` in the assertion message. Revert.
4. **The inventory is compile-enforced:** temporarily add
   `export const scratchPairs: readonly ContrastPair[] = [["border", "card", "divider"]];`
   to `contrast.ts` → `nub run --filter @gpuixui/tokens check-types` **fails**
   (`scratchPairs` is missing from the record). Remove it.
5. **The documentation guard can fail:** delete the new sentence from
   `docs/tokens.md` → `nub run --filter @gpuixui/tokens test` fails the new
   `docs.test.ts` case. Restore it.
6. **Full suite + gates:** `nub run --filter @gpuixui/tokens test` → all pass;
   `nub run check` → `check:tests`, `lint`, `fmt`, `check-types` pass;
   `nub run test` → the workspace suite passes.

## 5. Commands and expected results

```sh
cd packages/tokens
nub run test                      # 131 files, 5639 tests (baseline)
nub exec vitest run src/contrast.test.ts   # the derived cases pass
nub exec vitest run src/docs.test.ts       # the new sentence case passes
nub run check-types                        # the record is complete
cd ../..
nub run check
nub run test
```

`nub exec` is not a configured script in this workspace; run the package binary
directly as the earlier plans do:

```sh
cd packages/tokens
./node_modules/.bin/vitest run src/contrast.test.ts
./node_modules/.bin/vitest run src/docs.test.ts
```

## 6. STOP conditions

Stop and report instead of improvising if:

- the export-name key union does not compile as written (`keyof typeof Tokens`
  may include a non-`Pairs` value whose type is not a pair array). In that case,
  do **not** cast: list the 35 imports explicitly and add a compile-time
  exhaustiveness check with a mapped type over the namespace, or report that the
  namespace form is not expressible without an assertion.
- any of the seven newly covered lists already contains a duplicate — that is a
  real defect, not a guard gap. Record the duplicate, fix the list at its source
  (the duplicate pair should be removed or the composition re-expressed), and
  keep the plan's guard.
- adding the namespace import creates a cycle or a slower suite that trips the
  20 s budget (it is a test-only import of the same module the file already
  imports; the budget is per-file).
- `nub run check` fails for a reason unrelated to this change — record it as a
  cross-team row in `TODO.md` and stop; do not edit another workstream's file.

## 7. Acceptance criteria

- `contrast.test.ts` no longer carries a hand-typed inventory of pair lists; the
  record's key type derives from the package's exports.
- A 36th `*Pairs` export fails `check-types` until it is added to the record
  (proved by §4.4), and a duplicate inside any of the seven previously
  unchecked lists fails the suite (proved by §4.3).
- `docs/tokens.md` states that the inventory is derived, and `docs.test.ts`
  holds the sentence.
- `COMPONENTS.md` and `TODO.md` record the unit; the plan is indexed.
- No colour role, pair, floor, metric, theme, platform style or document value
  changes; all 24 shipped sets still pass all seven checks.
- `nub run check`, `nub run lint`, `nub run test` pass, and the commits are on
  `agent/tokens-theme` and pushed.

## 8. Rollback

Revert the commit. No runtime value moves, so a revert restores the 28-entry
hand list and the weaker (but still true for those 28) guard.

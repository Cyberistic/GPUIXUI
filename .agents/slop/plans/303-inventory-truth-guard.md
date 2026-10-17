# 303 — The inventory row that still called `overlay` exempt

| Field | Value |
| ----- | ----- |
| Phase | F (docs/inventory truth) |
| Owner | **tokens-theme workstream** (the design-system rows in `COMPONENTS.md`, `packages/tokens`) |
| Depends on | plans `056`, `062`, `099` |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Plan `099` made `overlay` a measured role: `overlayWashPairs` composites the
modal scrim over the four base surfaces, so it left the exemption list in
`packages/tokens/src/contrast.test.ts`. The inventory row repeated the **old**
list, so `COMPONENTS.md` now says two things that cannot both be true:

```
... a completeness suite fails when a colour role is neither measured by a
pair nor on the stated exempt list (`disabled`/`disabledForeground`, `overlay`,
`scrollbar`, `shadow`) ... and `overlay` leaves the exemption list ...
```

The same row is the only place outside test code where the contract's pair
counts and floor table are stated: `133 contrast pairs, 18 selection pairs, 4
soft-selection text pairs, 9 wash pairs, 4 soft wash pairs, 4 scrim pairs` and
`7 / 4.5 / 3 / 1.05 / 1.05 default, 7 / 7 / 4.5 / 1.05 / 3 high contrast`.
Nothing guards them. The neighbouring design-system rows repeat the role count
(62), the type-role count (10), the motion level count and easings, and the
platform variant count, also unguarded.

`docs/tokens.md` and `docs/design-system.md` are held to the implementation by
`docs.test.ts`; `packages/tokens/README.md` by `readme.test.ts`. The inventory
ledger was the last unguarded document in this workstream.

The shipped implementation is correct; this is an inventory-truth defect plus a
missing guard. No colour, scale or theme value changes.

## 2. Decisions (do not re-litigate)

- **Do not repeat the exemption list in `COMPONENTS.md`.** It is policy that
  lives in `contrast.test.ts`, and a duplicated list is exactly what went stale.
  Point at the test instead.
- **Guard what is derivable, from data.** Counts, floors, level names and role
  names are all exported; build the expected text from those, the way
  `docs.test.ts` does, rather than asserting the prose back to itself.
- **Guard only this workstream's design-system rows.** Other agents edit other
  `COMPONENTS.md` sections; the test must not impose claims on them.
- **No new public API.** The exemption list stays test-local policy; the row
  links to it by filename.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `packages/tokens/src/inventory.test.ts` | **new** — guards the design-system rows |
| `COMPONENTS.md` | fix the contrast row's exemption sentence; no other rows |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | one ticked row, counts updated |

## 4. Exact change

### 4.1 `COMPONENTS.md`

In the **Theme contrast check** row only, replace:

```md
a completeness suite fails when a colour role is neither measured by a pair nor
on the stated exempt list (`disabled`/`disabledForeground`, `overlay`,
`scrollbar`, `shadow`), held by `ring-surfaces.test.ts` and `contrast.test.ts`
```

with:

```md
a completeness suite fails when a colour role is neither measured by a pair nor
on the exemption list recorded in `contrast.test.ts` (plan `099` removed
`overlay` from it when the scrim became a measured wash), held by
`ring-surfaces.test.ts` and `contrast.test.ts`
```

Every other row stays untouched.

### 4.2 `packages/tokens/src/inventory.test.ts` (new)

Header comment states the bug guarded: plan 099 measured `overlay` but the ledger
still listed it as exempt, and the ledger's counts/floors had no guard while both
prose documents did.

Read the ledger with `node:fs` (the package ships zero runtime dependencies, the
same deliberate exception `docs.test.ts` and `readme.test.ts` record). Extract
the design-system table and the individual rows by their first cell.

Cases:

1. **Role count.** The `Design tokens` and `High-contrast theme` rows state
   `${colorRoles.length} roles` (and the high-contrast row says "same"). Derive
   the figure from `colorRoles`, never write it in the test.
2. **Type-role count.** The `Design tokens` row states `${textRoles.length} type
   roles`; assert the row contains that phrase.
3. **Contract counts.** The `Theme contrast check` row names the six list
   lengths derived from the exports:

   | Phrase in the row | Derived from |
   | ----------------- | ------------ |
   | `N contrast pairs` | `contrastPairs.length` |
   | `N selection pairs` | `selectionPairs.length` |
   | `N soft-selection text pairs` | `selectionSoftPairs.length` |
   | `N wash pairs` | `selectionWashPairs.length` |
   | `N soft wash pairs` | `selectionSoftWashPairs.length` |
   | `N scrim pairs` | `overlayWashPairs.length` |

   Build each phrase from the value and require it in the row, so a new pair
   list without a ledger edit fails.
4. **Floor table.** Build `default` and `high` rows from `contrastFloors` in the
   exact documented order — body / secondary / boundary / surface / divider —
   and require the joined string in the row:
   `7 / 4.5 / 3 / 1.05 / 1.05 default, 7 / 7 / 4.5 / 1.05 / 3 high contrast`.
5. **No stale exemption.** The row must not contain the literal
   `` `overlay`, `scrollbar` `` and must name `contrast.test.ts` as the place the
   exemption list lives.
6. **Motion row.** `theme.motion`'s level names in declaration order
   (`none`, `step`, `fast`, `normal`, `slow`, `pulse`) and the four easing keys
   all appear; the row states the derived counts (`six millisecond levels`,
   `four easings`).
7. **Filled-control row.** The six designed state roles — every `xHover`/`xActive`
   of the three filled families — appear and exist in `colorRoles`; the row says
   "Six designed roles".
8. **Platform row.** Every `platformNames` label appears in the shipped-variant
   sentence and the row says "Four shipped variants".

Keep the helper surface small: a `row(firstCell)` finder, a `derived` phrase
builder, and the cases. No prose is copied into the test except the phrases the
ledger is required to contain.

### 4.3 `TODO.md`

Add, ticked, under the tokens block:

```md
`[x]` Guard the design-system ledger — the contrast row still called `overlay`
exempt after plan 099 measured it, and its pair counts, floor table, role/type
counts, motion levels and platform count had no test while both prose documents
did (plan 303)
```

Update the section's done/total counts.

## 5. Commands and expected results

```sh
# Test first, before the COMPONENTS.md edit:
nub run --filter @gpuixui/tokens test src/inventory.test.ts
# expected: FAIL — case 5 (the stale `overlay`, `scrollbar` list) and no other
# failure; record the output.

# After §4.1 and §4.2:
nub run --filter @gpuixui/tokens test
# expected: exit 0 (39 files, 1815 + the new cases)

nub run check
# expected: exit 0

nub run lint
# expected: exit 0

nub run test
# expected: exit 0
```

## 6. STOP conditions

Stop and report instead of improvising if:

- the counts the plan lists disagree with the exports — the implementation is
  the source of truth; build the guard from the exports and fix the ledger, do
  not change the contract to match prose;
- a parser needs to match another workstream's row to find this one — narrow the
  finder to the exact first cell instead;
- `check-tests` rejects a case as asserting prose to itself — replace that case
  with a derivation from an export or delete it; never add
  `// check-tests-ok` for a guard that does not guard.

## 7. Test plan and two-direction proof

1. Write the file with the ledger still stale and run it: case 5 must fail on
   `` `overlay`, `scrollbar` ``. The count/floor cases pass at this point,
   proving the failure is the defect and not a broken parser.
2. Fix the row: all cases pass.
3. Mutate one count in memory (do not commit) — for example temporarily add a
   pair to a list — and confirm case 3 fails. Revert.
4. The shipped suites stay green: `docs.test.ts`, `contrast.test.ts`,
   `readme.test.ts`.

Acceptance: the ledger has one exemption story that matches the code; the new
suite fails if a pair list, a floor, a role count, a motion level, a filled
state or a platform variant changes without the ledger; no colour moves; and the
three gates pass.

## 9. Implementation note

Delivered on `agent/tokens-theme`. Two defects surfaced, not one:

1. the stale exemption list, as planned;
2. the **Motion tokens** row claimed "four easings" without naming them, so a
   reader could not check the claim. The row now names `standard`, `enter`,
   `exit` and `linear`, and the guard holds the names.

Two-direction proof: the suite failed before the ledger edit on the stale
`overlay`, `scrollbar` list and on the unnamed easings (2/7). After the edit it
passes 7/7. Changing one count in the ledger to `132` failed the pair-count case
with `AssertionError: 133 contrast pairs`; the revert restored 7/7. The full
package suite is 39 files / 1822 tests and `nub run check`, `nub run lint` and
`nub run test` are green.

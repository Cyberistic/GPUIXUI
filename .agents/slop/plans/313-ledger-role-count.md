# 313 — The ledger's second role count

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
015, 056–066, 303, 311 · **Touches:** `COMPONENTS.md`, `TODO.md`,
`packages/tokens/src/inventory.test.ts`, this index

## 1. The gap

`COMPONENTS.md`'s **Design tokens** row opens with the guarded count (`62
semantic roles`) and then contradicts itself later in the same sentence:

> The gallery last ran against the 47-role package; the current **58** ride the
> same `colorRoles` loop …

The package ships **62** roles. `inventory.test.ts` guards the opening phrase,
the type-role count, the pair counts, the floor table, the motion levels, the
filled-control roles and the platform names — but not a second count written as
prose. Plan 311 added four soft edges (58 → 62) without touching this sentence,
so the ledger has been false since that merge while every gate stayed green.

`TODO.md` repeats the same class of staleness in a cross-team row (“the current
**54**-role package”). That row is owned by `playground`, but the number is this
workstream's contract, so the text is corrected here and the work stays with the
owner.

## 2. Decision (do not re-litigate)

- Remove the second count from the ledger instead of updating it: the sentence
  becomes “The gallery last ran against an earlier, smaller role set; every
  current role rides the same `colorRoles` loop …”. A gallery run is a historical
  fact about a past tree; writing today's count beside it invites the same drift.
- Add a guard that reads **every** `<number> role(s)` phrase in the Design tokens
  row and requires it to equal `colorRoles.length`. Adding a role, or pasting a
  stale count, then fails the suite.
- Correct the TODO row's `54` to “the current role set” (no number, same reason).

## 3. Exact changes

### 3.1 `COMPONENTS.md`

In the Design tokens row, replace:

```
The gallery last ran against the 47-role package; the current 58 ride the same `colorRoles` loop; the newest roles are covered by the contrast test.
```

with:

```
The gallery last ran against an earlier, smaller role set; every current role rides the same `colorRoles` loop, and the newest roles are covered by the contrast test.
```

No other cell changes.

### 3.2 `TODO.md`

In the cross-team `playground` row (the one beginning “re-runs the theme gallery
against the current …”), replace `against the current 54-role package — the last
green run was the 47-role package` with `against the current role set — the last
green run predates the newest roles`. Leave the owner, plan reference and the
rest of the row intact.

### 3.3 `packages/tokens/src/inventory.test.ts`

Add one case after “states the role and type-role counts the package ships”:

```ts
it("states only the shipped role count, however it is written", () => {
  const tokens = row("Design tokens");
  const counts = [...tokens.matchAll(/(\d+)[-\s]roles?\b/g)].map((match) =>
    Number(match[1]),
  );
  expect(counts.length).toBeGreaterThan(0);
  counts.forEach((count) => expect(count).toBe(colorRoles.length));
});
```

The header comment gains: plan 313 found the row's second count (`58`) stale
after plan 311 added four roles, and this case holds every numeric role phrase
to the package.

### 3.4 This index

Add 313 as `done` with a closing paragraph; no plan-table change elsewhere.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | before §3.1/§3.3: the new case fails on `58 !== 62`; after: green |
| 2 | `nub run check` | exit 0 |
| 3 | `nub run lint` | exit 0 |
| 4 | `nub run test` | exit 0 |

## 5. STOP conditions

Stop and report if:

- the row contains a numeric role phrase that is legitimately not
  `colorRoles.length` (for example a historical gallery count the owner wants to
  keep) — then the guard needs an explicit exception, not a looser regex;
- `COMPONENTS.md` or `TODO.md` has moved since this plan was written and the
  quoted sentences no longer exist (re-read and re-scope before editing);
- a change is needed outside the paths listed above.

## 6. Acceptance

- [x] The Design tokens row contains no role count other than the shipped one.
- [x] A stale second count fails `inventory.test.ts`; removing it passes.
- [x] The TODO gallery row names no stale count.
- [x] Gates pass; committed and pushed.

## 7. Outcome

- The Design tokens row now says “the gallery last ran against an earlier,
  smaller role set; every current role rides the same `colorRoles` loop”, with no
  count to drift.
- `inventory.test.ts` reads every `<number> role`, `47-role` and `current <n>`
  phrase in the row and holds each to `colorRoles.length`. Re-introducing “the
  current 58” fails with `expected 58 to be 62`; the rewritten row passes.
- The TODO gallery row was corrected from “the current 54-role package” to “the
  current role set”.
- Green: `nub run check`, `nub run lint` and `nub run test` were run and passed.
  Committed and pushed.

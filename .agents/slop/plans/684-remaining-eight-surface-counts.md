# Plan 684 — The last two eight-surface counts after plan 651

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `docs/design-system.md`, `packages/tokens/README.md`,
> `packages/tokens/src/docs.test.ts`, `packages/tokens/src/readme.test.ts`,
> `TODO.md`, `.agents/slop/plans/README.md`. No colour, pair, floor, metric,
> shipped theme or runtime behaviour moves.
>
> ## Execution record (2026-10-19)
>
> - Before the prose edits, both new assertions failed: the design-system status
>   row still said eight and the README skeleton paragraph said eight and ended
>   at `selected` (2 failed / 248 passed across `docs.test.ts` and
>   `readme.test.ts`).
> - After the edits: both files **250/250**. The chip count is derived from
>   `statusFillPairs`, the skeleton count from `skeletonPulsePairs`, and the
>   enumeration is held to the derived list.
> - The touched suites together are **5 files / 270 tests**; the package suite is
>   **191 files / 6724 tests**; `nub run check`, `nub run lint` and
>   `nub run test` are green.
> - `readme.test.ts` needed `nub run fmt:fix` for the new helper; formatting is
>   clean after it.

## Why

Plan 651 added the pressed `selectedActive` row to both `chipSurfaces` and
`skeletonSurfaces`. Plans 683 and the reference documents fixed the chip count,
and the design system already says nine for the skeleton, but two current-state
sentences still say eight:

| File | Sentence | Real list |
| ---- | -------- | --------- |
| `docs/design-system.md` §8 `status` row | “held to 1.05:1 on the **eight** surfaces a status chip sits on (`statusFillPairs`)” | `chipSurfaces`: **nine** |
| `packages/tokens/README.md` skeleton paragraph | “on the same **eight** surfaces (`skeletonPulsePairs`)” and an enumeration ending at `selected` | `skeletonSurfaces`: **nine** |

Both pair lists are right; only the prose counts lag. The existing guards miss
them because `docs.test.ts`'s status case asserts that every surface *name*
appears in the row (and `selectedActive` appears later for `xText`), not that the
count word matches, and no README case derives the skeleton list.

## Scope

Documentation truth only. No token value, pair, floor, metric or shipped theme
changes.

## Exact steps

### 1. `docs/design-system.md`

In the §8 `status` row, change “on the eight surfaces a status chip sits on
(`statusFillPairs`)” to “on the nine surfaces …”.

### 2. `packages/tokens/README.md`

In the skeleton paragraph:

- add `/selectedActive` to the wash enumeration, so it names
  `hover`/`active`/`accent`/`selected`/`selectedActive`;
- change “on the same eight surfaces (`skeletonPulsePairs`)” to “on the same nine
  surfaces …”.

### 3. `packages/tokens/src/docs.test.ts`

Extend `it("names every solid status fill and the surfaces it is held against")`
with:

```ts
expect(designSystem).toContain(
  `on the ${countWord(surfaces.length)} surfaces a status chip sits on`,
);
```

`surfaces` is already derived from `statusFillPairs`; the union across the four
tones is the nine chip surfaces.

### 4. `packages/tokens/src/readme.test.ts`

Add one case, `"states the nine surfaces the skeleton pulse is measured on"`:

- derive the surfaces from `skeletonPulsePairs`, assert nine unique;
- add a local `countWords`/`countWord` helper (the same shape `docs.test.ts`
  uses) and require “on the same nine surfaces (`skeletonPulsePairs`)”;
- require the enumeration
  “`hover`/`active`/`accent`/`selected`/`selectedActive` washes a loading row
  paints”.

### 5. Truth files

- `TODO.md`: add a ticked row; advance **305/381 → 306/382**.
- `.agents/slop/plans/README.md`: add the plan row, status `done`.
- This plan: status `done` plus an execution record.

## Commands and expected results

```sh
nub run --filter @gpuixui/tokens test src/docs.test.ts src/readme.test.ts
# expected before the prose edits: FAIL — the design-system row says eight and
# the README says eight without `selectedActive`.

# after the edits
nub run --filter @gpuixui/tokens test src/docs.test.ts src/readme.test.ts
# expected: PASS.

nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## STOP conditions

- `statusFillPairs`/`skeletonPulsePairs` no longer yield nine unique surfaces —
  report the list instead of editing the count.
- A token value, pair, floor, metric or shipped theme would have to move.
- The `COMPONENTS.md` mentions of eight are historical statements about plans
  308 and 399; leave them.

## Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| design-system status count derived from `statusFillPairs` | the stale eight | Yes — pre-fix row fails |
| README skeleton count derived from `skeletonPulsePairs` | the stale eight | Yes — pre-fix paragraph fails |
| README enumeration names `selectedActive` | an incomplete list beside the right count | Yes — drop the name |

## Acceptance criteria

- Both current-state sentences say nine, and the README names `selectedActive`.
- The new/extended cases fail before the fix and pass after it.
- All gates are green; no token value moves.

# 767 — The package front door counts eight solid chip surfaces

| Field | Value |
| ----- | ----- |
| Status | landed (2026-10-20) |
| Phase | F (documentation truth) |
| Owner | `tokens-theme` |
| Depends on | `399` (solid status fills), `651` (pressed row), `683` (chip surface count), `766` (ledger status row) |
| Feeds | `packages/tokens/README.md`, every future edit of `chipSurfaces` or `statusFillPairs` |

> ## Execution record (2026-10-20)
>
> - With the guard written over the unfixed README, `src/readme.test.ts` was
>   **34 passed / 1 failed**: the new case reached `toContain` with the derived
>   count of nine and the README still said "on those eight surfaces". The
>   derivation itself passed its `toHaveLength(9)` assertion.
> - After the one-word prose edit the file is **35/35**. Package suite:
>   **208 files / 7012 tests**. `nub run check`, `nub run lint` and
>   `nub run test` are green.
> - `statusFillPairs` yields nine unique backgrounds; no token value, pair,
>   floor, metric, role or shipped theme moves.

## 1. The bug

`packages/tokens/README.md` says `statusFillPairs` holds the four solid status
fills "to the same 1.05:1 floor on those eight surfaces". The list holds
**nine**.

Two sentences apart the same paragraph correctly says "the nine surfaces a chip
sits on — the canvas, card and popover, the `muted` panel and the
`hover`/`active`/`accent`/`selected`/`selectedActive` washes". Plan `651` added
`selectedActive` to `chipSurfaces`, and `statusFillPairs` is derived from that
same list: `info`, `success` and `warning` each cover all nine, so the unique
backgrounds are nine even after the four `destructive` compositions already in
`stateFillSurfacePairs` are filtered out. `docs/tokens.md`,
`docs/design-system.md`, `COMPONENTS.md` (plan `766`) and
`statusFillPairs` itself all say or hold nine; only this README sentence still
says eight.

Plan `683` fixed the same count in `styles.ts`, `contrast.ts` and the README,
and plan `766` closed the ledger row, whose closing note claimed the remaining
"eight" mentions were historical. This sentence is present tense, names the
current pair list and survived both audits because `readme.test.ts` guards the
skeleton pulse count but never the solid-fill count.

## 2. Design

1. **Correct the README, not the list.** Every pair, floor, colour and shipped
   set is already right: `chipSurfaces` and `statusFillPairs` cover nine
   surfaces today.
2. **One derived guard in `readme.test.ts`.** The count word comes from
   `statusFillPairs`' own unique backgrounds, exactly as plan `766`'s guard
   derives the ledger count. A future surface added to `chipSurfaces` moves the
   required word with it.
3. **Assert the whole clause, and reject the old one.** The guard requires the
   floor, the derived count and the parenthetical that explains the
   `destructive` filter, then rejects "on those eight surfaces" so the stale
   phrase cannot return unnoticed.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/tokens/README.md` | "on those eight surfaces" → "on those nine surfaces" |
| `packages/tokens/src/readme.test.ts` | import `statusFillPairs`; new case "states the nine surfaces the solid status fills are measured on" |
| `TODO.md` | one new ticked row under *Design tokens and theming*; bar `346/423` → `347/424` |
| `.agents/slop/plans/README.md` | this plan's index row and a summary paragraph |
| `.agents/slop/plans/767-status-fill-chip-count.md` | this plan, status `landed` with an execution record |

No token value, pair, floor, metric, role or shipped theme moves. No file
outside the workstream's owned paths changes.

## 4. Commands and expected results

Run from the repository root.

```sh
# 1. write the guard first, over the unfixed README
cd packages/tokens && nub exec vitest run src/readme.test.ts
# expected: FAIL — the README says "eight" where statusFillPairs has nine.

# 2. after the README edit
cd packages/tokens && nub exec vitest run src/readme.test.ts
# expected: PASS, one new case, all existing cases unchanged.

# 3. full gates
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## 5. STOP conditions

- `statusFillPairs` yields anything other than nine unique backgrounds — report
  the derivation rather than editing the prose to fit.
- The guard passes on the pre-fix README. If it does, it is not testing the
  clause and must be tightened before the prose is edited.
- The fix would require changing a token value, pair, floor, metric, role or
  shipped theme. This plan changes prose and one test only.

## 6. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| solid-fill count derived from `statusFillPairs` | the stale "eight" and any list that grows or shrinks | Yes — the pre-fix README says eight |
| the full floor clause is present | a count corrected in a sentence that lost its floor or the `destructive` filter note | Yes — remove either clause |
| the old "on those eight surfaces" phrase is absent | a regression that adds the stale sentence back beside the new one | Yes — the pre-fix README contains it |

## 7. Acceptance criteria

- The README says the solid status fills are held on nine surfaces, matching
  `statusFillPairs` and the same paragraph's chip-surface sentence.
- The new case fails on the pre-fix README and passes after it.
- No token value, pair, floor, metric, role or shipped theme moves.
- All gates are green.

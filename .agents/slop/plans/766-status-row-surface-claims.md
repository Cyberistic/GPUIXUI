# 766 — The status row counts a list of eight and names seven surfaces

| Field | Value |
| ----- | ----- |
| Status | landed (2026-10-20) |
| Phase | F (documentation truth) |
| Owner | `tokens-theme` |
| Depends on | `399` (solid status fills), `548`/`549` (status list derivation), `651` (pressed row), `683` (chip surface count) |
| Feeds | the ledger's Status tones row, every future edit of the status lists |

> ## Execution record (2026-10-20)
>
> - The new case failed before the prose edits on the count:
>   `AssertionError: expected '| Status tones | …' to contain 'on the nine
>   surfaces a chip sits on'` (22 tests, 1 failed).
> - With only the count corrected it failed on the enumeration:
>   `AssertionError: muted: expected the xText clause to contain "muted"`.
> - After both edits it is 22/22. Package suite: **208 files / 7011 tests**.
>   `nub run check`, `nub run lint` and `nub run test` are green.
> - `statusFillPairs`, `softBorderSurfacePairs` and `statusTextSurfaces` each
>   cover nine surfaces; no token value, pair, floor, metric, role or shipped
>   theme moves.

## 1. The bug

`COMPONENTS.md`'s **Status tones** row makes two present-tense claims about the
status lists, and both are false:

| Sentence | Claim | The list |
| -------- | ----- | -------- |
| "`xText` for labels, icons and dots on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` state washes" | seven surfaces | `statusTextSurfaces` holds **nine** — the sentence omits the `muted` panel and the pressed `selectedActive` wash |
| "`statusFillPairs` holds each solid fill to the 1.05:1 surface floor on the eight surfaces a chip sits on" | eight surfaces | `chipSurfaces` holds **nine** — plan `651` added `selectedActive` |

The row is the only place in the ledger that describes what `statusFillPairs`
and `statusTextSurfaces` measure. `docs/design-system.md` (the status row and
the soft-edge floor row), `docs/tokens.md` (four passages) and the package
README all say **nine**; only this row still says eight, and its `xText`
enumeration stops one surface short of the wash list it then calls "the
`hover`/`active`/`accent`/`selected` state washes".

Plan `683` fixed the same count in `styles.ts`, `contrast.ts` and the package
README and closed with "the two in `COMPONENTS.md` are historical statements
about plans 308 and 399". That is true of the Theme contrast row's plan-308
parenthetical; it is **not** true here. This sentence uses the present tense and
names the current list, so nothing kept it honest: `inventory.test.ts` guards
the row's role, platform, motion and metric counts, but never the status
surfaces, and `soft-edge-surfaces.test.ts` reads only the sources plan `683`
touched.

## 2. Design

1. **Correct the row, not the lists.** Every pair, floor, colour and shipped set
   is already right: `statusFillPairs`, `softBorderSurfacePairs` and
   `statusTextSurfaces` each cover nine surfaces today.
2. **One derived guard in `inventory.test.ts`.** The count word comes from the
   pair list's own surfaces (`statusFillPairs`), and the label clause is read out
   of the row and held to `statusTextSurfaces` surface by surface. A future
   surface added to either list moves the required word or name with it.
3. **The enumeration is read as a clause, not the whole row.** `muted` already
   appears later in the row in the soft-surface sentence, so a `toContain` over
   the whole line would not notice its omission from the `xText` list. The guard
   slices from "`xText` for labels" to the next `;`.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `COMPONENTS.md` | Status tones row: the `xText` clause names `background`, `card`, `popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected`/`selectedActive` washes; "the eight surfaces a chip sits on" → "the nine surfaces a chip sits on" |
| `packages/tokens/src/inventory.test.ts` | import `statusFillPairs` and `statusTextSurfaces`; new case "names every surface the status lists measure" |
| `TODO.md` | one new ticked row under *Design tokens and theming*; bar `345/422` → `346/423` |
| `.agents/slop/plans/README.md` | this plan's index row and a summary paragraph |
| `.agents/slop/plans/766-status-row-surface-claims.md` | this plan, status `landed` with an execution record |

## 4. Commands and expected results

Run from the repository root.

```sh
# 1. write the guard first, over the unfixed row
cd packages/tokens && nub exec vitest run src/inventory.test.ts
# expected: FAIL — the row says "eight" where the pair list has nine, and the
# xText clause lacks `muted` and `selectedActive`.

# 2. after the COMPONENTS.md edit
cd packages/tokens && nub exec vitest run src/inventory.test.ts
# expected: PASS, one new case, all existing cases unchanged.

# 3. full gates
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## 5. STOP conditions

- `statusFillPairs` yields anything other than nine unique backgrounds, or
  `statusTextSurfaces` is not the same nine-surface set — report the derivation
  rather than editing the prose to fit.
- The row cannot be corrected without changing a token value, pair, floor,
  metric, role or shipped theme. This plan changes prose and one test only.
- The guard would pass on the pre-fix row. If it does, it is not testing the
  clause and must be tightened before the prose is edited.

## 6. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| chip count derived from `statusFillPairs` | the stale "eight" and any list that grows or shrinks | Yes — the pre-fix row says eight |
| `xText` clause names every `statusTextSurfaces` member | the seven-surface enumeration, even when a name appears elsewhere in the row | Yes — pre-fix clause lacks `muted` and `selectedActive` |
| both lists cover the same nine surfaces | the two claims drifting apart | Yes — remove a surface from one list |

## 7. Acceptance criteria

- The Status tones row says nine chip surfaces and names all nine `xText`
  surfaces, with the `muted` panel and the pressed wash in the enumeration.
- The new case fails on the pre-fix row and passes after it.
- No token value, pair, floor, metric, role or shipped theme moves.
- All gates are green.

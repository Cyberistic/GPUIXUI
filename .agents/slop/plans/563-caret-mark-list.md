# 563 — The caret mark outside the mark list

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | F (theme contract truth) |
| Owner | `tokens-theme` |
| Paths | `packages/tokens/src`, `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` |
| Depends on | 332 (mark class), 341 (combobox check), 351 (floor-table rows), 399 (solid status fill), 557 (native field caret) |

## 1. The defect

`markPairs` is published as **every** mark the contract measures:

```ts
/** Every mark on every surface it can sit on, plus the thumb's own fill. */
export const markPairs: readonly ContrastPair[] = [...]
```

Plan 557 added the native field's caret as a mark pair — `caretPairs` is
`["primaryText", "input", "mark"]` — but appended it to `contrastPairs`
directly:

```ts
  ...markPairs,
  ...caretPairs,
```

instead of to `markPairs`. So:

- the public list named "every mark" omits the one mark a native `<input>` /
  `<textarea>` paints; a consumer building a mark table or a per-class report
  from `markPairs` silently drops it;
- `docs/design-system.md`'s **graphic marks** floor row is derived from
  `markPairs` in `docs.test.ts` (the "names every mark role and surface the
  contract measures" case), so the accessibility page never mentions the caret's
  3:1 / 4.5:1 floor — the only mark rendered by the runtime itself;
- the guard that should have caught the page could not: it reads the incomplete
  list. This is the plan-349/398 failure mode (a guard whose inventory is
  hand-built) one level down.

No shipped colour is wrong and `themeContrastFailures` already reports the pair
(`caretPairs` is in `contrastPairs`), so an edited theme cannot erase a caret.
The incomplete halves are the published list and the page derived from it.

`docs/tokens.md` states the same split — "`markRoles` is the role list and
`markPairs` the pairs. The native field's caret is a mark too, … `caretPairs`" —
which reads as "outside `markPairs`".

## 2. The shape of the fix

### 2.1 `packages/tokens/src/contrast.ts`

1. Move the `caretPairs` declaration (with its JSDoc) above `markPairs`, beside
   `markRoles` / `comboboxCheckPairs`, so `markPairs` can spread it. Do not copy
   the tuple: one literal stays the owner.
2. Append `...caretPairs` to `markPairs`.
3. Delete the now-duplicate `...caretPairs,` from `contrastPairs` (it is inside
   `markPairs`). Keep the caret at the end of the mark list so the mark entries
   stay grouped; no test pins order.
4. Update `markPairs`' JSDoc to name the caret: "…, and the native field's caret
   ink (`primaryText`) on the fill it edits". Add to `caretPairs`' JSDoc that it
   is published inside `markPairs`, so a reader knows the class list is whole.

Keeping `caretPairs` exported matters: it names the caret composition for
`nativeFieldTheme`'s documentation, and the pair-list inventory in
`contrast.test.ts` requires every exported `*Pairs` list to be covered.

### 2.2 Tests

- New `packages/tokens/src/caret-mark-list.test.ts` — header states the defect
  above. Cases:
  1. every pair in `caretPairs` is in `markPairs`, and `markPairs` contains
     `["primaryText", "input", "mark"]`;
  2. `contrastPairs` contains the caret composition **exactly once** (the
     de-duplication half — two spreads would report the same miss twice);
  3. `themeContrastFailures(extendTheme(getTheme("light"), { colors: {
     primaryText: getTheme("light").colors.input } }))` contains a `mark`
     failure with `foreground: "primaryText"`, `background: "input"`,
     `floor: contrastFloors.default.mark` (the pair is still enforced);
  4. the thumb's own two mark pairs stay in the list, so the move did not
     replace one mark with another.
- `packages/tokens/src/status-solid.test.ts` — the "keeps the solid fill out of
  the mark class" case asserts `markPairs`' foregrounds equal exactly
  `{primary, success, destructive}`. That set was a proxy for "no solid status
  fill"; the caret's ink is not a solid fill. Change the expectation to the same
  set plus `primaryText`, with a comment naming the caret, and keep asserting
  that every entry's class is `mark`. (The intent — `info`/`warning` are not
  marks — is unchanged; `success` and `destructive` were already marks.)
- `packages/tokens/src/docs.test.ts` — the exact graphics-marks row literal in
  "states the floor table the checker reads" must match the edited page; the
  derived "names every mark role and surface" case then passes from
  `markPairs`.

### 2.3 Documentation

- `docs/design-system.md`, §9 floor table, graphics-marks row: add
  "`primaryText` on the `input` fill the native caret paints" beside the thumb
  rings. This is the row a reader checks; the caret is the only mark the runtime
  paints inside a field.
- `docs/tokens.md`, mark paragraph: replace the "… but it is … `caretPairs`"
  split with "… and it is in `markPairs` as `caretPairs`: `primaryText` on the
  field's own `input` fill, while the four `Surface` tones and the four row
  washes an in-place editor paints are already `secondary` text pairs".
- `COMPONENTS.md`, **Theme contrast check** row: add one sentence — the caret is
  a mark, `caretPairs` holds `primaryText` on the `input` fill and is part of
  `markPairs` — so the ledger names it beside the other mark entries.
- `packages/tokens/README.md` needs no change: its mark sentence is about the
  *solid* roles and stays true; the caret is documented in the native-field
  section, which already names `caretPairs`.

## 3. Exact commands and expected results

Run from the worktree root:

1. Write the new test first and run it on the pre-fix tree:

   ```sh
   nub run --filter @gpuixui/tokens test -- src/caret-mark-list.test.ts
   ```

   Expected: **fails** — `markPairs` lacks `["primaryText","input","mark"]`.
   That is the failing direction the plan must record.

2. Apply §2.1–§2.3, then:

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: all suites pass; `contrastPairs` stays **405** (the pair moved, it
   did not duplicate).

3. Gates, from the worktree root:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: green. `nub run check` includes `check:tests`, lint, format and
   type-check; `themeFailures` on all 24 shipped sets stays `[]`.

## 4. STOP conditions

Stop and report instead of improvising if:

- adding `caretPairs` to `markPairs` makes `themeContrastFailures` return a
  **new** failure for a shipped set (it must not — the pair was already in
  `contrastPairs`);
- `contrastPairs` changes length from **405** (a duplicate or a dropped pair);
- the pair-list inventory (`contrast.test.ts`) or the docs mark-row case fails
  for a reason other than the edits above;
- any suite fails for a reason outside this plan (report the pre-existing
  failure rather than hiding it).

## 5. Acceptance

- `markPairs` is the whole mark class: the three solid roles on the four plain
  surfaces, the thumb's `primary`/`destructive` on `input`, the combobox check
  on `hover`, and `primaryText` on `input`; its JSDoc says so.
- `caretPairs` is a published subset of `markPairs`, and `contrastPairs` holds
  the caret composition once.
- The design-system graphic-marks row names the caret, and the derived guard
  keeps it there; the catalogue paragraph no longer implies the caret sits
  outside the list.
- The ledger names the caret in the contrast row.
- The new suite fails on the pre-fix tree and passes after it; every shipped set
  still returns `[]`; no colour, metric, pair count or floor moves.
- `TODO.md` and the plan index are current; no cross-team row is needed (the
  consumer behaviour already uses `nativeFieldTheme`; only the published list
  and page were incomplete).
- `nub run check`, `nub run lint`, `nub run test` pass.

## 6. Candidates left out (and why)

- **`inactivePanelActionPairs` / `selectionFillInactivePairs` not named in the
  floor table's inactive row**: the state table (§ the disabled row) and the
  prose name both, and the row's "thirteen surfaces" is exactly
  `inactiveSurfaces`; these are additional compositions rather than members of
  that list, so no claim is false.
- **`markRoles` excluding `primaryText`**: `markRoles` is the *solid* roles
  painted as marks; the caret is ink, not a fill, and the caret's own list is
  `caretPairs`. Keeping the two concepts apart is deliberate.
- **Timeline marker metrics**: plan 556 considered the 8px dot and declined a
  dimension because it is a spacing step; the 16px column is the same. Revisit
  only if the timeline's mark grows a state the spacing scale cannot carry.

# Plan 501 — the accessibility floor table's modal scrim row

**Workstream:** `tokens-theme` · **Phase:** F (docs truth) · **Depends on:**
099 (the scrim), 359 (persistent surfaces), 375 (filled actions and status
panels), 395 (`softAction` joins `overlaySurfaces`), 351/352/354 (the floor
table's other content-derived rows), 398 (the check index), 500 (the last
hierarchy guard).

**Status:** done — 2 new cases in `docs.test.ts` (138 in the file), the full
tokens suite 101 files / 5167 tests, and `nub run check`, `nub run lint` and
`nub run test` green. Both directions run per case: without either document
clause the matching case fails; with both, all pass.

**Plan number.** `500–599` is this workstream's overflow block (opened by plan
500). This is `501`; do not reuse a number.

---

## 1. The measured gap

`docs/design-system.md` §9 is the accessibility floor table. One of its rows
describes the modal scrim:

```markdown
| modal scrim (`overlay` composited over `background`/`card`/`muted`/`input`/`selected`/`popover`, the four resting filled actions `primary`/`secondary`/`accent`/`destructive` and the four soft status panels `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`) | 1.05:1 | 1.05:1 |
```

It names **14** surfaces: six plain/layout roles, four filled actions and four
soft panels. The contract's `overlaySurfaces` (in
`packages/tokens/src/contrast.ts`) has **15** since plan 395:

```ts
export const overlaySurfaces = [
  "background", "card", "muted", "input", "selected", "popover",
  "primary", "secondary", "accent", "destructive",
  "softAction",                      // added by plan 395
  "infoSoft", "successSoft", "warningSoft", "destructiveSoft",
] as const;
```

`softAction` is the raised action a tone-tinted status panel carries. Plan 395
added it to the scrim contract and `docs/tokens.md`, the README and
`docs/design-system.md` §7 were updated — §7 is already held to
`overlaySurfaces` by `docs.test.ts` — but the §9 row was missed.

The same section's explanation repeats the count and then enumerates the
categories, again with 14:

```markdown
`overlay` over the fifteen surfaces a dialog covers — the four base surfaces,
the `input` fill a form paints, the persistent `selected` fill, the four resting
filled actions and the four soft status panels a window shows — ...
```

It says "fifteen" (correct) but names only fourteen (the raised action is
missing), so a reader cannot tell which surface the fifteenth pair measures.
The later sentence "The tightest of the fifteen pairs is **1.075:1**" is
correct and is derived by `docs.test.ts`, but the enumeration is not.

**Why no test caught it.** `docs.test.ts` guards the floor table in two ways:

- `states the floors the contrast checker enforces` holds an exact array of
  hand-written rows. The array does not include the modal scrim row at all, so
  the row is free to drift.
- `has a floor row for every pair class the checker enforces` maps each
  `ContrastPairClass` to one row. The scrim uses the `surface` class, whose row
  is already the interactive-fill row; it does not require a second row.

The §7 paragraph has a content-derived guard
(`names every surface the modal scrim covers`); §9 has none. This is the same
class of gap plans 351, 352 and 354 closed for the mark, boundary and
interaction-state rows.

No token value, pair, floor or metric is wrong: `overlayWashPairs` is correct
and every shipped set passes. Only the document and its guard are stale.

## 2. Decision

1. **Fix the row.** Add the raised action to the §9 modal scrim row, naming it
   the way §7 and `docs/tokens.md` already do:
   ``the raised action a status panel carries (`softAction`)``. The row then
   names all 15 surfaces.
2. **Fix the explanation.** Add the same clause to the §9 enumeration, so the
   word "fifteen" is followed by fifteen surfaces. Keep the existing wording for
   the other categories.
3. **Add derived guards**, in the existing `docs/design-system.md accessibility
   floors` describe block:
   - `tableRow("modal scrim (")` must contain `` `overlay` `` and every
     `overlaySurfaces` member as a backticked role. This is the exact membership
     check the row never had.
   - The row's two floor cells must equal `contrastFloors.default.surface` and
     `contrastFloors.high.surface` (`1.05:1` / `1.05:1`), derived rather than
     typed.
   - The §9 explanation must contain
     `the ${countWord(overlaySurfaces.length)} surfaces`,
     ``the raised action a status panel carries (`softAction`)`` and
     `The tightest of the ${countWord(overlaySurfaces.length)} pairs`. The
     count word and both members derive from `overlaySurfaces`, so the next
     surface cannot leave the prose behind.
4. **No API, value, pair or floor change.** This is a documentation truth fix
   plus the guard that prevents the same drift. There is no new helper to
   exercise, so no example file is added; `docs/design-system.md` is the
   document under test and `docs/tokens.md`, the README and §7 already carry the
   correct list.

Rejected alternatives:

- **Add only `softAction` to the row and stop.** That is what left the row free
  to drift since plan 395; the guard is the deliverable, the word follows.
- **Add the row to the hand-written exact-row array in
  `states the floors the contrast checker enforces`.** That holds the wording
  and floors but not membership, which is exactly how plans 351/352 found stale
  rows. Use the derived case instead.
- **Repeat all 15 names in the explanation.** The explanation is a category
  summary; the row is the exact list. Requiring every name in both would make
  the prose a duplicate of the table and still would not prove the categories
  add up. The count word, the one missing member and the derived row are the
  claims worth guarding.
- **Add a `softAction` pair to `overlayWashPairs`.** It is already there
  (plan 395); adding it again would break the contract's uniqueness guard.

## 3. Exact edits

### 3.1 `docs/design-system.md` — the §9 row

Find the line starting `| modal scrim (` and change it to:

```markdown
| modal scrim (`overlay` composited over `background`/`card`/`muted`/`input`/`selected`/`popover`, the four resting filled actions `primary`/`secondary`/`accent`/`destructive`, the raised action a status panel carries (`softAction`) and the four soft status panels `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`) | 1.05:1 | 1.05:1 |
```

The only change is the added clause and its comma; do not reflow the row.

### 3.2 `docs/design-system.md` — the §9 explanation

Find the sentence beginning `measured composited rather than as a value:` and
change its enumeration to:

```markdown
a dialog covers — the four base surfaces, the `input` fill a form paints, the
persistent `selected` fill, the four resting filled actions, the raised action a
status panel carries (`softAction`) and the four soft status panels a window
shows — which caught the AAA dark backdrop painting
```

Do not change "the fifteen surfaces" or the tightest-pair sentence; both are
already right and are now guarded by the cases below.

### 3.3 `packages/tokens/src/docs.test.ts`

Add the plan note to the file header comment, after the plan 397 paragraph:

```ts
 * Plan 501 guards the floor table's modal scrim row. Plan 395 added the raised
 * action a status panel carries (`softAction`) to `overlaySurfaces` and updated
 * §7, the catalogue and the README, but the §9 row still named fourteen
 * surfaces and the explanation said "fifteen" while listing fourteen. The row
 * and the explanation are now held to `overlaySurfaces`, and the row's floor
 * cells to `contrastFloors`, so the next surface cannot leave either behind.
```

Then, inside the `docs/design-system.md accessibility floors` describe block,
after `has a floor row for every pair class the checker enforces`, add:

```ts
  it("names every surface in the modal scrim's floor row", () => {
    const row = tableRow("modal scrim (");
    expect(row).toContain("`overlay`");
    overlaySurfaces.forEach((surface) => {
      expect(row, surface).toContain(`\`${surface}\``);
    });
    expect(row).toContain(
      `| ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
    );
  });

  it("names every surface in the modal scrim explanation", () => {
    expect(designSystem).toContain(
      `the ${countWord(overlaySurfaces.length)} surfaces`,
    );
    expect(designSystem).toContain(
      "the raised action a status panel carries (`softAction`)",
    );
    expect(designSystem).toContain(
      `The tightest of the ${countWord(overlaySurfaces.length)} pairs`,
    );
  });
```

`tableRow`, `designSystem`, `overlaySurfaces`, `contrastFloors` and `countWord`
are already in scope in that file; do not add imports.

## 4. Commands and expected results

Run from the repository root unless stated.

```sh
cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts
```

Before the fix: the new membership case fails naming `softAction`; the
explanation case fails on the missing clause. After the fix: **138 passed**
(136 existing + 2 new). Report the actual number; do not edit the expected count
into another test.

```sh
cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts -t "modal scrim"
```

Expected after the fix: 4 passed — the §7 membership case, the tightest-pair
case and the two new §9 cases. Report the actual number; do not tune the filter
until it looks like the number in this plan.

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

Expected: the tokens suite green (the plan does not change a value), and the
three gates green.

## 5. Test plan — prove the test can fail

1. Add the two cases **without** changing the document. Run
   `./node_modules/.bin/vitest run src/docs.test.ts`. Expected: both new cases
   fail; the membership failure message names `softAction`.
2. Apply the two document edits. Re-run. Expected: both pass, all 138 pass.
3. Revert only the row clause (keep the explanation fix). Re-run. Expected: the
   membership case fails, the explanation case passes — the two cases guard
   different claims.
4. Revert only the explanation clause. Re-run. Expected: the explanation case
   fails, the membership case passes.
5. Restore both and run the full gates.

The cases compare against `overlaySurfaces` and `contrastFloors`, not a literal
list, so a sixteenth surface added to the contract fails them until the row and
the explanation are updated. That is the point of the guard.

## 6. STOP conditions

- **STOP** if `overlaySurfaces` no longer contains `softAction` or does not have
  15 members. Another plan changed the scrim contract; re-audit and report
  rather than resurrecting a removed surface.
- **STOP** if the row already names `softAction` (another writer merged the
  fix). Keep the guard, remove only the duplicate clause, and report.
- **STOP** if the new membership case fails on a surface other than
  `softAction`. Do not guess a sentence for it; report the missing surface and
  the row verbatim.
- **STOP** if the docs suite count changes for any reason other than the two
  new cases. Do not weaken or skip unrelated cases.
- Do **not** change `overlayWashPairs`, any colour value, a pair count, a floor
  or a metric. This plan moves no token value.

## 7. Acceptance criteria

- The §9 modal scrim row names `overlay` and all 15 `overlaySurfaces` members,
  and its two floor cells are 1.05:1 / 1.05:1.
- The §9 explanation says "fifteen", names the raised action, and still quotes
  the derived tightest pair.
- Two derived cases in `docs.test.ts` fail without the document fix and pass
  with it, verified in both directions.
- `docs/tokens.md`, the README and §7 are untouched because they already name
  `softAction`; no duplicate sentence is added.
- `nub run check`, `nub run lint` and `nub run test` pass.
- The plan index marks 501 done, `TODO.md` ticks the task, and the `COMPONENTS.md`
  documentation claim names the new guard.

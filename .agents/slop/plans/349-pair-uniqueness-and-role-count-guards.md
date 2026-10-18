# Plan 349: Two guards that were not guarding — pair uniqueness and the palette's role count

> **Status:** done 2026-10-18. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src`, `docs/tokens.md`, `COMPONENTS.md`, `TODO.md`,
> `.agents/slop/plans/README.md`. No public API changes, no colour changes.

## Execution record (2026-10-18)

- `color.test.ts` failed before the comment fix with
  `high-contrast JSDoc: expected 64 to be 66`; it passes after, and the live
  JSDoc is now `66`.
- A temporary duplicate `["border", "card", "divider"]` in `contrastPairs`
  failed the new guard with
  `contrastPairs: expected [ 'border|card|divider' ] to deeply equal []`
  (five cases failed in total because the duplicate also breaks the exact
  counts); the edit was reverted.
- Replacing `duplicatePairKeys` with the old identity `Set` failed the
  self-test with
  `expected [] to deeply equal [ 'border|card|divider' ]`; the real helper was
  restored.
- Final: `nub run test` → **68 files / 4213 tests passed**; `nub run check`,
  `nub run lint` and `nub run test` are green.

## Why

An audit of the tokens package found two statements that claim to be guarded
and are not. Both are "the suite told itself a comfortable story" defects, the
same class plan `333` fixed for the suite's timeout budget and plan `303` fixed
for the inventory's stale exemption list.

### Finding A — the uniqueness guards compare tuple identity

Fourteen assertions across twelve test files use this shape:

```ts
expect(new Set(contrastPairs).size).toBe(contrastPairs.length);
```

Every element of a `ContrastPair` is a fresh tuple (`["border", "card", "divider"]`).
A `Set` of tuples compares **object identity**, so two copies of the same
composition are two distinct members and the sizes still match. The assertion
can only fail if the *same array reference* is spread into a list twice, which
is not the bug it claims to guard.

Consequence: a repeated `[foreground, background, pairClass]` in the contract
would ship, `themeContrastFailures` would report the same missed composition
twice, and every "publishes one pair per surface" suite would stay green.

Occurrences to remove (the exact assertion above each already proves the
composition, so the Set line is redundant as well as vacuous):

| File | Line | List |
| ---- | ---- | ---- |
| `packages/tokens/src/contrast.test.ts` | 400 | `contrastPairs` |
| `packages/tokens/src/contrast.test.ts` | 402 | `stateStepPairs` (length already asserted on 401) |
| `packages/tokens/src/contrast.test.ts` | 442 | `selectionPairs` |
| `packages/tokens/src/contrast.test.ts` | 454 | `overlayWashPairs` |
| `packages/tokens/src/row-surface-text.test.ts` | 102 | `contrastPairs` |
| `packages/tokens/src/canvas-input-text.test.ts` | 78 | `contrastPairs` |
| `packages/tokens/src/soft-divider.test.ts` | 128 | `softDividerPairs` |
| `packages/tokens/src/control-boundary.test.ts` | 130 | `boundaryPairs` |
| `packages/tokens/src/control-boundary-soft.test.ts` | 153 | `controlBoundarySoftPairs` |
| `packages/tokens/src/invalid-field-edge.test.ts` | 72 | `invalidEdgePairs` |
| `packages/tokens/src/skeleton-washes.test.ts` | 165 | `skeletonPairs` |
| `packages/tokens/src/filled-state-steps.test.ts` | 63 | `stateStepPairs` |
| `packages/tokens/src/ring-soft.test.ts` | 127 | `ringSoftPairs` |
| `packages/tokens/src/status-text.test.ts` | 120 | `washPairs` |
| `packages/tokens/src/mark-contrast.test.ts` | 89 | `markPairs` |

Lines are from the tree at plan time; find each by its text, not its number.

Two other `new Set(...)` checks in the same files operate on strings and are
meaningful; **do not remove them**:
`ring-surfaces.test.ts:88` (`backgrounds`), `accent-states.test.ts:123`
(`[resting, hover, pressed]`), `filled-states.test.ts:83` (same shape),
`control-boundary-soft.test.ts:1xx` uses `softPairs` length checks elsewhere.

### Finding B — the high-contrast palette's JSDoc says 64 roles

`packages/tokens/src/color.ts` lines 425 and 501 read "The same 64 roles as
`lightColors`/`darkColors`". `colorRoles.length` is **66** (the `track` role
from plan `347` was the 66th; the `selectionOnFill` role from `344` was the
65th). The two comments are the only numeric role claims in source that nothing
holds. The same drift was fixed in `docs/tokens.md`, the design system, the
README and `COMPONENTS.md` by plans `313`/`347`; the module's own hover
documentation was missed because it lives in source, not Markdown.

## Files to change

### 1. `packages/tokens/src/contrast.test.ts`

**1a.** Extend the import block from `./index.js` with the type and lists the
new guard needs (keep alphabetical order):

```ts
  controlBoundarySoftPairs,
  inactiveSoftPairs,
  invalidRingPairs,
  markPairs,
  ringSoftPairs,
  stateFillSurfacePairs,
  trackMarkPairs,
  trackSurfacePairs,
  type ContrastPair,
```

**1b.** After the imports, add the helper and the list registry:

```ts
/**
 * Guards the defect plan 349 fixes: every "unique" assertion in this suite built
 * a `Set` of tuple arrays, which compares identity — two copies of the same
 * `[foreground, background, class]` are different objects — so a repeated pair
 * could never fail one. The checker would report the same missed composition
 * twice while every suite stayed green.
 *
 * Lists that measure the same roles through a different wash are separate
 * checks, not duplicates, so uniqueness is asserted inside each published list,
 * never across lists.
 */
const duplicatePairKeys = (
  pairs: ReadonlyArray<ContrastPair>,
): ReadonlyArray<string> => {
  const seen = new Set<string>();
  return pairs.flatMap((pair) => {
    const key = pair.join("|");
    if (!seen.has(key)) {
      seen.add(key);
      return [];
    }
    return [key];
  });
};

const publishedPairLists: ReadonlyArray<
  readonly [string, ReadonlyArray<ContrastPair>]
> = [
  ["contrastPairs", contrastPairs],
  ["stateFillSurfacePairs", stateFillSurfacePairs],
  ["stateStepPairs", stateStepPairs],
  ["markPairs", markPairs],
  ["inactivePairs", inactivePairs],
  ["inactiveSoftPairs", inactiveSoftPairs],
  ["controlBoundarySoftPairs", controlBoundarySoftPairs],
  ["ringSoftPairs", ringSoftPairs],
  ["invalidRingPairs", invalidRingPairs],
  ["softPanelTextPairs", softPanelTextPairs],
  ["toastTonePairs", toastTonePairs],
  ["softBorderSurfacePairs", softBorderSurfacePairs],
  ["trackSurfacePairs", trackSurfacePairs],
  ["trackMarkPairs", trackMarkPairs],
  ["selectionPairs", selectionPairs],
  ["selectionWashPairs", selectionWashPairs],
  ["selectionSoftPairs", selectionSoftPairs],
  ["selectionSoftWashPairs", selectionSoftWashPairs],
  ["selectionFillPairs", selectionFillPairs],
  ["selectionFillWashPairs", selectionFillWashPairs],
  ["overlayWashPairs", overlayWashPairs],
];

describe("published pair lists", () => {
  it("detects a repeated composition, so the guard can fail", () => {
    expect(
      duplicatePairKeys([
        ["border", "card", "divider"],
        ["border", "card", "divider"],
      ]),
    ).toEqual(["border|card|divider"]);
  });

  it("never repeats a composition inside a list", () => {
    publishedPairLists.forEach(([name, pairs]) => {
      expect(duplicatePairKeys(pairs), name).toEqual([]);
    });
  });
});
```

**1c.** Delete the four vacuous assertions listed above (400, 402, 442, 454).
Keep `expect(contrastPairs.length).toBe(337)` and the other length assertions.

### 2. `packages/tokens/src/color.test.ts`

**2a.** Add `import { readFileSync } from "node:fs";` above the vitest import.

**2b.** Add a case to `describe("colour roles")`, after "indexes every role in
documentation order":

```ts
  it("states the shipped role count in the high-contrast JSDoc", () => {
    // `node:fs` is deliberate: this is a policy test over the package's own
    // source, and the package ships zero dependencies (see exports.test.ts).
    const source = readFileSync(new URL("./color.ts", import.meta.url), "utf8");
    const claims = [...source.matchAll(/The same (\d+) roles/g)];
    expect(claims).toHaveLength(2);
    claims.forEach(([, count]) => {
      expect(Number(count), "high-contrast JSDoc").toBe(colorRoles.length);
    });
  });
```

Run it **before** fixing the comments: it must fail with `64 !== 66` twice.

### 3. `packages/tokens/src/color.ts`

Change both occurrences of `The same 64 roles` to `The same 66 roles` (keep the
rest of each sentence). Do not hard-code 66 elsewhere.

### 4. Delete the fourteen vacuous assertions

From the files in the table, delete only the `new Set(<pairs>).size` line. Do
not delete the surrounding length/list assertions. Where the line was the last
statement before `});`, keep the closing braces tidy.

### 5. `docs/tokens.md`

In **Checking a theme**, after the paragraph that ends "…`selectionWashPairs`
is that list." (around line 1247), add:

```md
Every exported pair list is held to content uniqueness: a repeated
`[foreground, background, class]` would make the checker report one composition
twice, so `contrast.test.ts` fails on it. Lists that measure the same roles
through a different wash — `selectionPairs` beside `contrastPairs`, for example
— are separate checks, not duplicates, so uniqueness is asserted inside each
list and never across them.
```

### 6. `COMPONENTS.md`

In the **Theme contrast check** row, after the sentence that ends with the
`contrast.test.ts` mention (or at the end of the row's prose), append:

```md
Each exported pair list is also held to content uniqueness — a repeated
`[foreground, background, class]` would be reported twice — and the palette's
high-contrast JSDoc role count is held to `colorRoles.length` (plan 349).
```

### 7. `TODO.md`

Add to the tokens section (before the cross-team rows), and tick it:

```md
`[x]` Hold the contract's own guards to their claims — every "unique pairs"
assertion built a `Set` of tuple arrays, which compares identity, so a repeated
`[foreground, background, class]` could never fail one and the checker could
report a composition twice; each published list is now checked by content and
the guard has a case that proves it can fail. The high-contrast palette's JSDoc
still said 64 roles (66 ship) and is now held to `colorRoles.length` (plan 349)
```

Update the section header count and bar: **117/162** (the header said 151 while
the section already held 161 task bullets; this plan adds the 162nd). Use
`[███████░░░]` (117/162 ≈ 72%).

### 8. `.agents/slop/plans/README.md`

Add a row after `348`:

```md
| [349](./349-pair-uniqueness-and-role-count-guards.md) | Two guards that were not guarding: pair uniqueness and the palette's role count | F | 071, 303, 306, 313, 333, 347 | done |
```

## Commands and expected results

Run from the worktree root unless stated.

```bash
nub run --filter @gpuixui/tokens test
```

Expected before the source fix but after adding the `color.test.ts` case: **one
failure**, `states the shipped role count in the high-contrast JSDoc`
(`expected 66, received 64`). All other tests pass.

Expected after all edits: `68 passed (68)` / `4211 passed` (one new test file
case; the pair guard adds one `describe` with two cases, and one vacuous case is
removed per file but they were assertions inside existing cases, so only the two
new cases and one removed case in `color.test.ts`/`contrast.test.ts` change the
count — report the exact numbers the run prints, do not assume).

```bash
nub run --filter @gpuixui/tokens check-types
nub run lint
nub run fmt
nub run check:tests
```

Expected: all pass. `check:tests` must not flag the new "detects a repeated
composition" case: it asserts a function over a constructed fixture, which is a
real property.

## Both-directions verification (required)

1. **Pair guard fails on a real duplicate.** Temporarily add a second
   `["border", "card", "divider"]` to `contrastPairs` in
   `packages/tokens/src/contrast.ts`. Run the tokens suite. The
   `never repeats a composition inside a list` case must fail with
   `["border|card|divider"]` for `contrastPairs`. Revert.
2. **The guard itself can fail.** Temporarily change `duplicatePairKeys` to
   `pairs.flatMap((pair) => pair).length` (or any non-detecting body). The
   `detects a repeated composition` case must fail. Revert.
3. **JSDoc guard fails on drift.** With the comments still at 64, the new
   `color.test.ts` case fails. Fix the comments; it passes. Then change one back
   to 65 and watch it fail. Revert.
4. Run the full tokens suite again after both reverts.

Record the actual output of each failure in the commit message body or the plan
execution log under `.agents/slop/` if one is kept. Do not claim a direction was
verified without the failing output.

## STOP conditions

- **STOP** if `duplicatePairKeys` reports a duplicate in a shipped list. That is
  a real contract defect, not a test defect: record the duplicate in `TODO.md`,
  do not silence the guard, and report before changing any list.
- **STOP** if the unique assertion in a file is the *only* statement proving the
  list's composition (read the surrounding five lines; some files assert
  `toHaveLength` and an exact map instead). Report which file and leave that
  line in place until a content assertion is added.
- **STOP** if `docs.test.ts` rejects the new paragraph — do not edit the guard to
  accept it; report the exact assertion.
- **STOP** if a colour value, pair count or public export changes. This plan is
  test-and-comment only.

## Acceptance

- [ ] No `new Set(<array of tuples>)` uniqueness assertion remains in the suite.
- [ ] `publishedPairLists` covers every exported pair list in
      `packages/tokens/src/contrast.ts`, and the list is built from the exports
      rather than from literals.
- [ ] The self-test proves the content check detects a duplicate.
- [ ] `color.test.ts` holds both high-contrast JSDoc role counts to
      `colorRoles.length`, and fails when either drifts.
- [ ] `docs/tokens.md` and `COMPONENTS.md` describe the invariant.
- [ ] `TODO.md` ticks the task and its count/bar re-derive from the section.
- [ ] Plan row 349 is indexed and marked done.
- [ ] `nub run --filter @gpuixui/tokens test`, `check-types`, `lint`, `fmt` and
      `check:tests` pass.

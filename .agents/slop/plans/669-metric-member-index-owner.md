# Plan 669 — The metric-member index's documented owner

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `docs/tokens.md`, `packages/tokens/src/docs.test.ts`, `TODO.md`,
> `.agents/slop/plans/README.md`. No API, token, colour, pair, floor or metric
> changes.

## Execution record (2026-10-19)

- The new case failed before the edit with
  `textRoles: expected '`metricMembers` is the ordered index …' to contain
  '`textRoles`'`; it passes after the paragraph names the eleven indexes.
- `nub exec vitest run src/docs.test.ts src/metric-members.test.ts
  src/scale-indexes.test.ts src/snippets.test.ts src/examples.test.ts` →
  **5 files / 239 tests passed**.
- No source or token value changed.

## Why

Plan 668 moved `metricMembers` from the scale **objects** onto the ordered
**indexes** and changed its JSDoc to say so:

```
Each list derives from the group's ordered index (`dimensionNames`,
`spacingSteps`, `radiusSteps`, `borderWidthSteps`, `iconSizeSteps`,
`avatarSizeSteps`, `controlSizes`, `elevationLevels`, `motionLevels`,
`motionPhases`), so the shipped domain has one owner …
```

`docs/tokens.md` (§*Numeric metrics*, around line 2568) was not updated. It still
says:

> `metricMembers` is the ordered index of every numeric member inside those
> groups — the numeric sibling of `colorRoles` — derived from each group's
> default object and ordered indexes (`dimensions`, `controlSizes`,
> `elevationLevels`, `motionLevels`, `motionPhases`) …

Both halves are now wrong:

- `dimensions` is the default object, not an index. The index is
  `dimensionNames`. A reader who follows the sentence writes
  `Object.keys(dimensions)` — a `string[]` — which is exactly the unsafe cast
  plan 668 removed from `metrics.ts`.
- Six of the indexes the implementation reads (`textRoles` for the type roles,
  `spacingSteps`, `radiusSteps`, `borderWidthSteps`, `iconSizeSteps`,
  `avatarSizeSteps`, `dimensionNames`) are absent from the sentence.

No test reads this paragraph. `docs.test.ts` guards the numeric tables, the
figures, the type index, the lift table and the counts; a grep for
`metricMembers`, `derived from each group` and `ordered indexes` in
`docs.test.ts` returns nothing. Plan 668's own docs case (`scale-indexes.test.ts`
and the *For documentation sites* section) covers the public indexes, not this
ownership sentence.

Verified on 2026-10-19 on this branch: the sentence is present and unguarded.

## Scope

One paragraph and one guard:

- The catalogue names the ordered index every metric group derives from, matching
  `metricMembers`' JSDoc.
- `docs.test.ts` holds the paragraph to the eleven index names and rejects the
  old "default object" phrasing.
- No source, API or value changes; `metricMembers` is already correct.

Out of scope: the example-linkage gap found in the same audit (plan 670).

## Files

| File | Change |
| ---- | ------ |
| `docs/tokens.md` | rewrite the `metricMembers` ownership sentence. |
| `packages/tokens/src/docs.test.ts` | one case holding the paragraph to the index names. |
| `TODO.md` | tick the row for this plan. |
| `.agents/slop/plans/README.md` | index this plan. |

## Exact edits

### 1. `docs/tokens.md`

Replace this exact paragraph (leave the surrounding prose untouched):

```
`metricMembers` is the ordered index of every numeric member inside those groups
— the numeric sibling of `colorRoles` — derived from each group's default object
and ordered indexes (`dimensions`, `controlSizes`, `elevationLevels`,
`motionLevels`, `motionPhases`), so a diagnostics table iterates the walked
domain. It names the shipped domain: a theme may carry a wider scale, and the
size ladders walk the theme's own members. An elevation entry names the field
once per level (`md.offsetX`) because
every entry in the level is read, while a failure names the one it measured
(`md[0].offsetX`).
```

with:

```
`metricMembers` is the ordered index of every numeric member inside those groups
— the numeric sibling of `colorRoles` — derived from each group's ordered index:
`textRoles` for the type roles, and `spacingSteps`, `radiusSteps`,
`borderWidthSteps`, `iconSizeSteps`, `avatarSizeSteps`, `dimensionNames`,
`controlSizes`, `elevationLevels`, `motionLevels` and `motionPhases` for the
rest, so a diagnostics table iterates the walked domain without retyping or
casting a key. It names the shipped domain: a theme may carry a wider scale, and
the size ladders walk the theme's own members. An elevation entry names the field
once per level (`md.offsetX`) because
every entry in the level is read, while a failure names the one it measured
(`md[0].offsetX`).
```

Do not change the `metricGroups` or `metricRules` sentences beside it.

### 2. `packages/tokens/src/docs.test.ts`

Add a new `describe` block after the `docs/tokens.md numeric tables` block (the
one beginning `describe("docs/tokens.md numeric tables", () => {`), before the
`docs/tokens.md palette table` block:

```ts
describe("docs/tokens.md metric members", () => {
  /**
   * The index each metric group derives from. `textRoles` owns the type roles;
   * the rest are the scale indexes plan 668 introduced. `dimensions` is the
   * default object, not an index, and `Object.keys` on it is the cast 668
   * removed.
   */
  const indexes = [
    "textRoles",
    "spacingSteps",
    "radiusSteps",
    "borderWidthSteps",
    "iconSizeSteps",
    "avatarSizeSteps",
    "dimensionNames",
    "controlSizes",
    "elevationLevels",
    "motionLevels",
    "motionPhases",
  ] as const;

  it("names the ordered index every metric group derives from", () => {
    const start = markdownProse.indexOf("`metricMembers` is the ordered index");
    expect(start).toBeGreaterThan(-1);
    const end = markdownProse.indexOf("`metricRules` is", start);
    expect(end).toBeGreaterThan(start);
    const paragraph = markdownProse.slice(start, end);

    indexes.forEach((index) => expect(paragraph, index).toContain(`\`${index}\``));
    expect(paragraph).not.toContain("default object");
  });
});
```

Use the existing `markdownProse` binding (the whitespace-collapsed catalogue);
do not add a second file read.

### 3. `TODO.md`

Add this completed row immediately after the plan-668 row (the one beginning
"Give the numeric scales their ordered indexes"):

```
`[x]` Hold the metric-member index's documented owner — plan 668 moved
`metricMembers` onto the typed scale indexes, but §*Numeric metrics* still said
"each group's default object" and named `dimensions` (the object) rather than
`dimensionNames`, so a reader building a diagnostics table would write the
`Object.keys` cast 668 removed; the paragraph now names all eleven indexes and a
`docs.test.ts` case fails if one is dropped or the old phrase returns (plan 669)
```

Keep it in the same present-tense, evidence-first style as the rows around it.

### 4. `.agents/slop/plans/README.md`

Add one row to the `tokens-theme` table after `668`:

```
| [669](./669-metric-member-index-owner.md) | The metric-member index's documented owner | F | 531, 668, 324 | done |
```

Then extend the prose paragraph that begins "Plans 010–019 are the
`tokens-theme` workstream" with one sentence naming plan 669 as the docs guard
for plan 668's ownership change.

## Commands, in order

Before the edit, prove the guard can fail:

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts -t "names the ordered index every metric group derives from"
```

Expected: **1 failed**. The paragraph misses `textRoles`, `spacingSteps`,
`radiusSteps`, `borderWidthSteps`, `iconSizeSteps`, `avatarSizeSteps` and
`dimensionNames`, and contains `default object`. If it passes before the edit,
the case is reading the wrong paragraph — **STOP**.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts src/metric-members.test.ts src/scale-indexes.test.ts src/snippets.test.ts src/examples.test.ts
nub run check-types
```

Expected: all green. No other case may change.

Then the repository gates:

```sh
cd ../..
nub run check
nub run lint
nub run test
```

## STOP conditions

- The old paragraph cannot be found verbatim: read the surrounding section and
  adapt the replacement to the current wording; if the sentence has already been
  corrected, mark the plan done without editing and report.
- The new case passes before the paragraph edit: the slice is matching a
  different occurrence (for example the `metricMembers` JSDoc is in a different
  file) — **STOP** and report.
- `docs.test.ts` has another case that owns the same paragraph: do not duplicate
  the claim; fold this assertion into that case and note it in the plan's
  execution record.
- Any token, colour, pair, floor or metric value changes: **STOP**. This plan is
  documentation only.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | The new case reports the seven missing index names and `default object` on the pre-edit catalogue. |
| Passes with the fix | The rewritten paragraph names all eleven indexes and the case returns green. |
| Cannot pass by deleting the sentence | The case requires `metricMembers` to be described (`start > -1`) and every index to appear. |
| Cannot pass by editing the test only | The names are the implementation's own index exports, and `scale-indexes.test.ts` already fails if an index omits a scale member; the test asserts against the catalogue file a reader sees. |

## Acceptance

- [x] `docs/tokens.md` names `textRoles` and the ten scale indexes as
      `metricMembers`' owners, and no longer says "default object".
- [x] `docs.test.ts` fails on the pre-edit paragraph and passes after it.
- [x] No source or token value changes; `metric-members.test.ts` and
      `scale-indexes.test.ts` stay green.
- [x] `nub run check`, `nub run lint` and `nub run test` are green.
- [x] Plan indexed in `.agents/slop/plans/README.md`; `TODO.md` row ticked.

# 543 — The contrast contract's floor classes have no owner

**Workstream:** `tokens-theme`. **Phase:** F (guard quality).
**Depends on:** 071 (the contrast contract), 303 / 313 / 326 (the ledger's
hand-typed counts), 351 (a floor row per class), 372 / 519 (ordered indexes for
the other unions).
**Files:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/contrast.test.ts`,
`packages/tokens/src/inventory.test.ts`,
`packages/tokens/src/docs.test.ts`,
`packages/tokens/src/readme.test.ts`, `docs/tokens.md`,
`packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`, this plan index.

## 1. The defect

`ContrastPairClass` is the last exported domain union in the package without an
ordered index. Every sibling owns one — `colorRoles`, `textRoles`,
`themeModes`, `themeContrasts`, `densityNames`, `controlSizes`, `statusTones`,
`platformNames`, `metricGroups`, `metricRules`, `metricMembers`,
`motionLevels`, `motionPhases`, `typefaceRoles`, `typefaceRules`,
`translucentRoles`, `themeChecks` — and each of those was introduced for the
same reason (plans 305, 372, 398, 519, 540): a table, a settings screen or a
document that enumerates the domain must iterate it rather than retype it, so a
new member cannot land in the implementation while a published table silently
omits it.

The eight classes are hand-typed in `contrast.ts:22-45`. Two consequences:

1. **The ledger's floor table is a second hand-typed list.** `COMPONENTS.md`'s
   *Theme contrast check* row publishes the floors as a flat sequence
   (`7 / 4.5 / 3 / 3 / 3 / 1.05 / 1.05 / 1.05 default, 7 / 7 / 4.5 / 4.5 / 4.5 /
   1.05 / 1.05 / 3 high contrast`). `inventory.test.ts:57-71` rebuilds that
   sequence from **eight named fields in a fixed order**:

   ```ts
   const floorRow = (contrast: keyof typeof contrastFloors): string => {
     const floors = contrastFloors[contrast];
     return [
       floors.body,
       floors.secondary,
       floors.inactive,
       floors.boundary,
       floors.mark,
       floors.surface,
       floors.step,
       floors.divider,
     ]
       .join(" / ")
       .concat(` ${contrast}`);
   };
   ```

   `contrastFloors` is `Record<ThemeContrast, Record<ContrastPairClass, number>>`,
   so a ninth class forces a floor at both levels (compile error otherwise), and
   `docs.test.ts`'s `rowFor` is a `Record<ContrastPairClass, string>`, so the
   design-system must gain a row (compile error otherwise). `floorRow` is the one
   consumer the compiler **cannot** see: it keeps emitting eight numbers, the
   ledger publishes a floor table missing a class, and the containment assertion
   (`expect(row).toContain(...)`) still passes because the eight-value substring
   is intact. That is the exact defect class plans 313, 326, 349 and 396 fixed
   for other counts.

2. **Two orders, no owner.** The ledger's order lives in the `floorRow` array;
   the reference's order lives in the `contrastFloors` object literal, because
   `docs.test.ts:1811-1819` builds the expected snippet line from
   `Object.entries(contrastFloors[level])`. The two happen to agree today
   (`body`, `secondary`, `inactive`, `boundary`, `mark`, `surface`, `step`,
   `divider`); nothing says they must, and an edit that reorders the literal
   changes the reference's required order while leaving the ledger's alone.

Nothing here is a shipped-value defect: every class is used by `contrastPairs`,
every floor is enforced, and the documents agree. The unit is guard-only, like
plans 372 and 501.

## 2. The rule to state

**The index owns the union and its order.** `contrastPairClasses` is the ordered
list of floor classes in documentation order; `ContrastPairClass` derives from
it; the ledger's floor table, the reference's floor snippet and the design
system's per-class rows enumerate from it. A ninth class therefore reaches:

- the type (`ContrastPairClass`),
- both floor records (`contrastFloors`, compile-enforced),
- the design-system row guard (`rowFor`, compile-enforced),
- the ledger's floor table (derived),
- the reference's floor snippet (derived),

from one edit — and a class that has a floor but no pair is reported.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts` — the index owns the union

Replace the hand-typed union (currently lines 21-45) with the index and a derived
type. Preserve every semantic note in the index's JSDoc; keep the order exactly
as shipped.

```ts
/**
 * The floor classes, in the order the reference and the ledger state them.
 *
 * Every other domain union in the package owns an ordered index (`colorRoles`,
 * `textRoles`, `metricRules`), so a table renders from the domain instead of
 * retyping it. `ContrastPairClass` derives from this list, so a ninth class
 * reaches the type, both floor records and every published floor table from one
 * edit.
 *
 * - `body`: body copy on each surface it paints on.
 * - `secondary`: captions, descriptions, hints and other supporting text.
 * - `inactive`: a dimmed but readable label — a design floor, not a WCAG one.
 * - `boundary`: a functional edge — a field, a checkbox, a focus ring.
 * - `mark`: a solid role painted as a glyph, a bar or a dot rather than behind
 *   text. WCAG's non-text requirement is the boundary number; the separate name
 *   records the intent, so a fill's 1.05:1 wash floor cannot be mistaken for a
 *   mark's floor.
 * - `surface`: one surface perceivable against another (`xSoft` on a canvas).
 * - `step`: one designed state of a fill against the state before it, so a
 *   hover or a press that cannot be seen is reported.
 * - `divider`: a decorative border that must stay visible on its surface.
 */
export const contrastPairClasses = [
  "body",
  "secondary",
  "inactive",
  "boundary",
  "mark",
  "surface",
  "step",
  "divider",
] as const;

/** The floor class a documented pair belongs to. */
export type ContrastPairClass = (typeof contrastPairClasses)[number];
```

No other line in the file changes: `ContrastPair`, every pair list,
`contrastFloors` and every function already use the union by name.

### 3.2 `packages/tokens/src/inventory.test.ts` — the ledger derives its table

1. Import the index beside the existing `contrastFloors` import.

2. Replace `floorRow`'s hand-typed array with the index:

```ts
const floorRow = (contrast: keyof typeof contrastFloors): string => {
  const floors = contrastFloors[contrast];
  return contrastPairClasses
    .map((pairClass) => floors[pairClass])
    .join(" / ")
    .concat(` ${contrast}`);
};
```

The emitted text is byte-identical today, so the ledger row does not move.

3. Add the ledger's claim about the index itself (see §3.8):

```ts
  it("names the floor-class index its table is built from", () => {
    expect(row("Theme contrast check")).toContain("`contrastPairClasses`");
  });
```

The existing containment case becomes total once `floorRow` derives: the
expected string now carries one value per index member, so a ninth class makes
the assertion fail until the ledger row gains the ninth value. No second
assertion is added for the same fact.

### 3.3 `packages/tokens/src/docs.test.ts` — the snippet derives its order

1. Replace the `Object.entries`-based expected line in
   `states the floor table the checker reads` with the index:

```ts
  it("states the floor table the checker reads", () => {
    const line = (level: keyof typeof contrastFloors): string =>
      `contrastFloors.${level}; // { ${contrastPairClasses
        .map((pairClass) => `${pairClass}: ${contrastFloors[level][pairClass]}`)
        .join(", ")} }`;

    expect(markdown).toContain(line("default"));
    expect(markdown).toContain(line("high"));
  });
```

The rendered text is unchanged today.

2. Add `contrastPairClasses` to the names the `names the consumer check and the
   data behind it` case requires:

```ts
      "contrastFloors",
      "contrastPairClasses",
```

(Keep the rest of the list and the `mentions` helper.)

### 3.4 `packages/tokens/src/contrast.test.ts` — the contract owns its classes

Add a new `describe` after `contrastFloors`:

```ts
describe("contrastPairClasses", () => {
  const classesOf = (pairs: ReadonlyArray<ContrastPair>): ReadonlyArray<string> =>
    [...new Set(pairs.map(([, , pairClass]) => pairClass))];

  const unenforced = (
    classes: ReadonlyArray<string>,
    pairs: ReadonlyArray<ContrastPair>,
  ): ReadonlyArray<string> => {
    const used = new Set(classesOf(pairs));
    return classes.filter((pairClass) => !used.has(pairClass));
  };

  it("lists each class once", () => {
    expect(new Set(contrastPairClasses).size).toBe(contrastPairClasses.length);
  });

  it("owns both floor records, in index order", () => {
    themeContrasts.forEach((level) => {
      expect(Object.keys(contrastFloors[level]), level).toEqual([
        ...contrastPairClasses,
      ]);
      contrastPairClasses.forEach((pairClass) => {
        expect(contrastFloors[level][pairClass], `${level}/${pairClass}`)
          .toBeGreaterThan(0);
      });
    });
  });

  it("enforces every class through at least one pair", () => {
    expect(unenforced(contrastPairClasses, contrastPairs)).toEqual([]);
  });

  it("reports a class no pair enforces, so the guard can fail", () => {
    expect(
      unenforced([...contrastPairClasses, "unused"], contrastPairs),
    ).toEqual(["unused"]);
  });
});
```

Import `ContrastPair` as a type (already imported? add if absent), and import
`contrastPairClasses` and `themeContrasts` from the package modules the file
already uses. `themeContrasts` lives in `theme.ts`; the file already imports
`themeContrasts`? Check before adding a duplicate import.

### 3.5 `docs/tokens.md` — name the index

In the contrast-contract paragraph that introduces the data
(the sentence ending "are the data the check and the test suite both read"),
extend it:

> … `contrastPairs` / `contrastFloors` are the data the check and the test suite
> both read, and `contrastPairClasses` is the floor classes in documentation
> order — the order the table below and the ledger's floor table use — so a
> report iterates the contract instead of retyping the eight names.

Leave both fenced blocks, the floor line and every figure unchanged. The fenced
block already displays both records; the value-coverage case
(`names every value the package exports`) is satisfied by the prose mention.

### 3.6 `packages/tokens/README.md` — the same list

Change

> `contrastRatio`, `contrastPairs`, `contrastFloors` and `compositeOver` expose
> the parts.

to

> `contrastRatio`, `contrastPairs`, `contrastFloors`, `contrastPairClasses` and
> `compositeOver` expose the parts, the class list in the order the floor table
> states them.

### 3.7 `packages/tokens/src/readme.test.ts` — guard the README claim

Add one case beside the other contrast cases:

```ts
  it("names the floor-class order beside the contract's data", () => {
    expect(readme).toContain(
      "`contrastRatio`, `contrastPairs`, `contrastFloors`, `contrastPairClasses` and `compositeOver` expose the parts",
    );
  });
```

### 3.8 `COMPONENTS.md` — the ledger names the index

In the *Theme contrast check* row, change

> `contrastRatio`, `compositeOver`, `contrastPairs` and `contrastFloors` expose
> the parts;

to

> `contrastRatio`, `compositeOver`, `contrastPairs`, `contrastFloors` and the
> `contrastPairClasses` floor order expose the parts;

Do not touch the floor numbers; they are derived by §3.2 and must stay identical.

### 3.9 `TODO.md` and the plan index

- Add a ticked row under *Design tokens and theming (`tokens-theme`)*:

  ```
  `[x]` Give the contrast contract's floor classes an ordered owner — `ContrastPairClass` was the last
  exported union without an index, and the ledger's floor table was rebuilt from eight named fields, so a
  ninth class would gain a floor at both levels (compile-enforced) and a design-system row (compile-enforced)
  while `COMPONENTS.md` kept publishing an eight-value table and `inventory.test.ts` stayed green; the
  reference's floor snippet also took its order from the `contrastFloors` object literal — plan 543
  ```
- Add the plan row to `.agents/slop/plans/README.md` in the `tokens-theme` table:
  `| 543 | The contrast contract's floor classes have no owner | F | 071, 303, 313, 326, 351, 372, 519 | done |`
- Add a short paragraph to the index's prose tail describing the unit, in the
  same voice as the 542 entry.

## 4. Test plan — prove both directions

1. **Baseline (before any edit):**
   `nub run --filter @gpuixui/tokens test` → every file passes, exit `0`.
2. **The new ledger case fails on a ninth class (two directions):**
   - Temporarily append `"unused"` to `contrastPairClasses` and add
     `unused: 3` to both levels of `contrastFloors` (a local, uncommitted edit).
   - `nub exec vitest run src/inventory.test.ts` → `states a floor for every
     pair class, in the contract's order` **fails** (the ledger has eight
     values) and, with the old `floorRow`, it would have passed; also
     `states a floor for every pair class` fails the length assertion if the
     ledger is not updated.
   - `nub exec vitest run src/docs.test.ts` → the floor-snippet case **fails**
     (the reference lacks the ninth class).
   - `nub exec vitest run src/contrast.test.ts` → `enforces every class through
     at least one pair` **fails** with `["unused"]`.
   - Revert the three edits.
3. **The index cases fail without the index:** before §3.1, the new cases do not
   compile (the import is missing), which is the intended direction; after
   §3.1 they pass with no shipped value moving.
4. **Package suite:** `nub run --filter @gpuixui/tokens test` → same file count
   as the baseline, all pass.
5. **Gate:** `nub run check` → `check:tests`, `lint`, `fmt`, `check-types` all
   pass. `check-types` is the important one: it proves `rowFor`,
   `contrastFloors` and the `Record<ContrastPairClass, number>` fixtures still
   accept the derived type.

## 5. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/contrast.test.ts     # the new describe passes
nub exec vitest run src/inventory.test.ts    # the ledger cases pass
nub exec vitest run src/docs.test.ts         # the snippet + coverage cases pass
nub exec vitest run src/readme.test.ts       # the README case passes
nub run --filter @gpuixui/tokens test        # full package suite passes
cd ../..
nub run check                                 # 4 gate steps pass
```

## 6. STOP conditions

Stop and report instead of improvising if:

- the ledger's order and the `contrastFloors` literal order disagree before the
  change (they do not: both are `body`, `secondary`, `inactive`, `boundary`,
  `mark`, `surface`, `step`, `divider`). The index must adopt the shipped
  documentation order; do not reorder either document to match a different
  order. If they disagree, record the discrepancy in the plan and choose the
  ledger's order.
- any shipped floor value would have to change to satisfy a case — this plan
  moves no floor, pair or colour. Stop if it seems to.
- `themeContrasts` is not already exported (it is, from `theme.ts`) or importing
  it in `contrast.test.ts` creates a cycle that `check-types` rejects — then
  iterate the levels from `Object.keys(contrastFloors)` with a local
  `ReadonlyArray<ThemeContrast>` cast-free helper instead.
- a second copy of the floor sequence exists outside `inventory.test.ts`,
  `docs/tokens.md` and `COMPONENTS.md` — search first
  (`rg '1\.05 / 1\.05 / 1\.05'`), and extend this plan's derived guard to it
  rather than editing a fourth hand-typed copy.
- `nub run check` fails for a reason unrelated to this change (a pre-existing
  tree defect): record it in `TODO.md` as a cross-team row and stop, do not
  "fix" another workstream's file.

## 7. Acceptance criteria

- `contrastPairClasses` is exported from `@gpuixui/tokens`, named in
  `docs/tokens.md`, `packages/tokens/README.md` and the ledger, and
  `ContrastPairClass` derives from it.
- The reference's floor snippet, the ledger's floor table and the
  design-system's per-class rows all enumerate from the index; the ledger's
  rendered text is byte-identical to today.
- `contrastFloors` lists the classes in index order at both levels, and every
  class is enforced by at least one `contrastPairs` entry.
- A ninth class fails the ledger, reference and enforcement cases until all
  three are updated (proved by the temporary probe in §4.2).
- No colour role, pair, floor, metric or shipped theme value changes; all 24
  shipped sets still pass `themeFailures`.
- `nub run check`, `nub run lint` (via `check`) and the package test suite pass.
- The `TODO.md` row is ticked, the plan is indexed, and the commit is on
  `agent/tokens-theme` and pushed.

## 8. Rollback

Revert the commit. No runtime value moves, so a revert restores the hand-typed
union and the weaker ledger guard with no migration.

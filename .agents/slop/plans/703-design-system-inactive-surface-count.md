# 703 — The design system's inactive-label surface count

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth).
**Depends on:** 510 (the washed inactive-label list), 650 (`input` joins it),
674 (the §8/§9 rows' derived surface lists), 689 (the field's washed text list).

## 1. The defect

`docs/design-system.md` §9 says, in the present tense:

> `selectionInactivePairs` holds `disabledForeground` through the wash on the
> same **thirteen** surfaces at the same floor, and three values move one
> designed step away from the panel …

The list is `selectionInactivePairs`, which derives from `inactiveSurfaces`.
Plan 650 added the field's `input` fill to that owner, growing it **13 → 14**
(`TODO.md`, plan 650 row: "`input` joins the one owner, `inactivePairs` and
`selectionInactivePairs` grow 13 → 14, `contrastPairs` grows 421 → 422").

Every other surface states fourteen, so the page contradicts itself and its own
contract:

| Surface | Says | Source |
| ------- | ---- | ------ |
| `docs/tokens.md` (inactive section) | fourteen `inactiveSurfaces` | line 2346 |
| `docs/tokens.md` (selection section) | fourteen `inactiveSurfaces` | line 2489 |
| `docs/tokens.md` (contract summary) | fourteen `inactiveSurfaces` | line 3968 |
| `docs/design-system.md` §8 `disabled` row | "the same fourteen persistent surfaces" | line 420 |
| `docs/design-system.md` §9 floor table | "the same fourteen persistent surfaces" | line 655 |
| `docs/design-system.md` §9 narrative | **thirteen** | line 755 |
| `packages/tokens` | `inactiveSurfaces.length === 14` | `src/contrast.ts` |

Nothing reads the narrative. Plan 674's guard (`disabled-press-surfaces.test.ts`)
derives the *surface names* of the §8 `disabled` row, and `docs.test.ts` holds
the §9 floor row verbatim (line 3058) — the prose between the rows was never
measured. So a list can grow while the paragraph that explains it keeps the old
size, which is exactly the class plans 326, 326, 538, 664, 674 and 683 fixed
elsewhere.

**Why the numeral alone is not the fix.** Plan 650 added the field's `input`
fill, and the paragraph's whole point is that the washed list follows the
at-rest list. A corrected count with no mention of the added fill would read as
if the list had always been fourteen; the sentence must name the fill the
numeral accounts for, the way the catalogue's parallel sentence does not need to
because it sits beside the at-rest enumeration.

**Two neighbours in the same §9 narrative are correct but unguarded**, and are
held by the same guard so this cannot happen again one paragraph over:

- "through the wash on the twelve surfaces a field sits on beside that fill" —
  `selectionInputPairs.length` (12, plan 689).
- "`skeletonPulsePairs` holds the frame on the same nine surfaces" —
  `skeletonPulsePairs.length` (9).

## 2. Exact changes

### 2.1 `docs/design-system.md`

In §9, the paragraph beginning *"The label is read while it is selected, too."*
(around line 746), replace:

```
`selectionInactivePairs` holds `disabledForeground` through the wash on the same
thirteen surfaces at the same floor, and three values move one designed step
away from the panel
```

with:

```
`selectionInactivePairs` holds `disabledForeground` through the wash on the same
fourteen surfaces at the same floor — the field's `input` fill included
(plan `650`) — and three values move one designed step away from the panel
```

Nothing else in the paragraph changes: the three moved values
(`#6E7787` → `#545D6C`, `#5A5A5A` → `#444444`, `#A9A9A9` → `#B0B0B0`), the
1.301:1 / 1.168:1 hierarchy figures and the 3.177:1 / 4.722:1 tightest washed
pairs stay as they are (they are today's shipped values).

### 2.2 `packages/tokens/src/docs.test.ts`

Add `selectionInputPairs` to the `./contrast.js` import list (alphabetical, after
`selectionInactivePairs`), and add this block after the
`docs/design-system.md current figures` describe (line ~980):

```ts
/**
 * Plan 703 guards the one count in the design system's §9 narrative that no
 * test read. Plan 650 grew `inactiveSurfaces` from thirteen to fourteen by
 * adding the field's `input` fill, and the catalogue, the §8 state row and the
 * §9 floor row were updated while the paragraph explaining the washed list kept
 * "thirteen". The two neighbours in the same narrative — the field's washed
 * text (`selectionInputPairs`) and the loading pulse's dim frame — were correct
 * but equally unguarded, so all three counts derive from their owners here.
 */
describe("docs/design-system.md list counts", () => {
  /** The §9 prose between two headings' leading sentences. */
  const between = (from: string, to: string): string => {
    const start = designSystem.indexOf(from);
    const end = designSystem.indexOf(to, start);
    expect(start, from).toBeGreaterThan(-1);
    expect(end, to).toBeGreaterThan(start);
    return designSystem.slice(start, end);
  };

  /** Whether a passage states the washed inactive list at its shipped size. */
  const statesWashedInactiveCount = (prose: string): boolean =>
    prose.includes(
      `on the same ${countWord(inactiveSurfaces.length)} surfaces at the same floor`,
    ) && prose.includes("the field's `input` fill included");

  it("states the washed inactive-label list at its shipped size", () => {
    const paragraph = between(
      "The label is read while it is selected, too.",
      "The same gap exists one role over.",
    );

    expect(selectionInactivePairs).toHaveLength(inactiveSurfaces.length);
    expect(statesWashedInactiveCount(paragraph)).toBe(true);
    expect(paragraph).not.toContain("thirteen");
  });

  it("rejects the pre-650 sentence", () => {
    const stale = [
      "`selectionInactivePairs` holds `disabledForeground` through the wash",
      "on the same thirteen surfaces at the same floor, and three values move",
      "one designed step away from the panel",
    ].join(" ");

    expect(statesWashedInactiveCount(stale)).toBe(false);
  });

  it("states the field's washed text at its shipped size", () => {
    const paragraph = between(
      "The same gap exists one role over.",
      "A disabled raised action keeps its `softAction` fill",
    );

    expect(paragraph).toContain(
      `the ${countWord(selectionInputPairs.length)} surfaces a field sits on beside that fill`,
    );
  });

  it("states the skeleton pulse's surface count at its shipped size", () => {
    const paragraph = between(
      "A role painted through an alpha needs the composited pair",
      "A fill is not automatically a surface.",
    );

    expect(paragraph).toContain(
      `on the same ${countWord(skeletonPulsePairs.length)} surfaces`,
    );
  });
});
```

`countWord`, `designSystem`, `inactiveSurfaces` and `selectionInactivePairs`
already exist in that file. `skeletonPulsePairs` is already imported.

### 2.3 `TODO.md`

Under *Design tokens and theming (`tokens-theme`)*, append a ticked row (the
workstream's convention is one row per landed plan):

```
`[x]` Hold the design system's washed inactive-label count to its list — plan
`650` grew `inactiveSurfaces` to fourteen, but the §9 paragraph still said
"thirteen" while the catalogue said fourteen in three places, the §8 state row
and the §9 floor row said fourteen, and `selectionInactivePairs` derives
fourteen; the sentence now states fourteen and names the field's `input` fill
plan 650 added, and a guard derives that count, the field's washed-text count
and the skeleton pulse's surface count from `inactiveSurfaces`,
`selectionInputPairs` and `skeletonPulsePairs`, with a case proving the pre-fix
sentence fails (plan 703)
```

### 2.4 `COMPONENTS.md`

In the **Theme contrast check** row, after the clause naming the inactive lists,
add: `the design system's §9 narrative counts for the washed inactive label, the
field's washed text and the skeleton pulse's dim frame derive from
`inactiveSurfaces`, `selectionInputPairs` and `skeletonPulsePairs` (plan 703)`.
No count in the row changes (it already says "14 inactive-selection text
pairs").

### 2.5 `.agents/slop/plans/README.md`

Add the row to the `tokens-theme` table:

```
| [703](./703-design-system-inactive-surface-count.md) | The design system's inactive-label surface count | F | 510, 650, 674, 689 | done |
```

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Prove the new case fails without the document fix** — temporarily leave
   the document at "thirteen" and run:

   ```sh
   nub run --filter @gpuixui/tokens test -- docs.test.ts
   ```

   Expected: `docs/design-system.md list counts > states the washed inactive-label
   list at its shipped size` fails, with the mismatch on
   `expect(...).toBe(true)`; the other three files' cases pass. Record the exact
   failure in the plan's execution notes before applying §2.1.

2. **Apply §2.1** and re-run the same command.

   Expected: all cases in `docs.test.ts` pass.

3. **Package suite**:

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: every test file green (193 files / 6784 cases at the branch point,
   plus the four new cases).

4. **Type check and lint/format**:

   ```sh
   nub run --filter @gpuixui/tokens check-types
   nub run lint
   nub run fmt
   ```

   Expected: clean. `docs.test.ts` adds one imported value and one describe
   block; no type assertions, no `any`, no native sort, no console.

5. **No scenario runs.** This plan changes a document and a token-suite case. It
   touches no runtime path, no token value and no metric, so neither
   `apps/playground/dist/smoke/run.js` nor the live suite is scoped in. Say so in
   the commit message rather than claiming a native check.

## 4. STOP conditions

Stop and report instead of improvising if:

- `inactiveSurfaces.length` is not 14, or `selectionInputPairs.length` is not 12,
  or `skeletonPulsePairs.length` is not 9. That means the branch point differs
  from the plan and the prose needs a fresh audit, not a numeral edit.
- `docs/design-system.md` does not contain the sentence anchors used by
  `between` ("The label is read while it is selected, too.", "The same gap
  exists one role over.", "A disabled raised action keeps its `softAction`
  fill", "A role painted through an alpha needs the composited pair", "A fill is
  not automatically a surface."). Re-locate the paragraphs and adjust the
  anchors; do not delete an assertion to make the case pass.
- Any shipped colour, pair, floor, metric or platform style would have to move.
  This plan moves none; a failing contrast case means the audit found something
  else and needs its own plan.
- Another worktree already owns `703-` (checked with the command below). Take the
  next free number and record it.

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/7[0-9][0-9]-*"
```

At the time of writing `701` and `702` are `playground`'s; `703` is free.

## 5. Test plan

**The bug the case guards.** A derived list grows and the prose that explains it
keeps the old size. The pre-fix document is the failing fixture; the
`rejects the pre-650 sentence` case keeps that fixture in the suite so the
predicate cannot be weakened into something that passes anything containing the
word "fourteen".

**Both directions.**

- Without §2.1: the first case fails on `statesWashedInactiveCount(paragraph)`
  and on `not.toContain("thirteen")`.
- With §2.1: it passes; the stale fixture case still returns `false`, proving the
  predicate is not vacuous.
- The field-text and skeleton cases pass before and after the change (their
  counts are correct); they exist to catch the next list growth, and their
  can-fail property is the same derived-count predicate (planting a stale
  numeral in the same sentence shape returns `false`, which the stale-fixture
  case demonstrates for the shared predicate).

**What the case must not do.** It must not read a hand-typed "fourteen": the
number comes from `inactiveSurfaces.length`, so a fifteenth surface fails the
page until the paragraph is updated.

## 6. Acceptance

- `docs/design-system.md` §9 states fourteen and names the field's `input` fill.
- `docs/tokens.md`, the §8/§9 rows and the package agree; no count is retyped by
  a test.
- Four new cases in `docs.test.ts`, one of which fails on the pre-fix document
  (recorded verbatim in the execution notes).
- `nub run --filter @gpuixui/tokens test`, `check-types`, `nub run lint` and
  `nub run fmt` are green.
- `TODO.md`, `COMPONENTS.md` and the plan index carry the row.
- One commit on `agent/tokens-theme`, pushed to `origin`.

## 7. Execution notes (2026-10-20)

Ran at the branch point `04710c29`, all from this worktree.

1. **Guard first, document untouched** —
   `nub run --filter @gpuixui/tokens test -- docs.test.ts` failed exactly one
   case:

   ```
   FAIL src/docs.test.ts > docs/design-system.md list counts > states the
   washed inactive-label list at its shipped size
   AssertionError: expected false to be true // Object.is equality
    ❯ src/docs.test.ts:1001:50
       1001|     expect(statesWashedInactiveCount(paragraph)).toBe(true);
   ```

   The other three new cases passed, and `rejects the pre-650 sentence` passed
   (its planted "thirteen" text is rejected). The full run reported
   `1 failed | 6787 passed (6788)` — the `JSON.parse`-free document guard saw
   the stale numeral the old suite could not.

2. **Document fixed, same command** — `193 passed`, `6788 passed (6788)`.

3. **Package suite** — `nub run --filter @gpuixui/tokens test`: 193 files,
   6788 cases, green.

4. **`nub run check` / `nub run test`** — recorded in the commit that lands this
   plan; `check:tests` accepts the four new cases (no self-comparison, no
   literal-against-literal, no stubbed-value echo).

5. **No scenario ran, deliberately.** The change touches one document and one
   token-suite case: no token value, metric, pair, platform style, provider or
   runtime path. The smoke and live playground suites are therefore not scoped
   in, and the commit says so rather than implying a native check.

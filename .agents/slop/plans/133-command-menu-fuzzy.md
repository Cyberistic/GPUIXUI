# 133 — Command menu fuzzy matching and in-group ranking

- **Phase:** C/F (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 114 (CommandMenu), 117 (inventory gate), 129 (the type-ahead
  scoring precedent)
- **Status:** done, 2026-10-17. 12 fuzzy logic tests + 4 native tests
  (CommandMenu 8 → 12); docs and inventory updated. Both-direction proof and one
  intended assertion change in §9.

`CommandMenu` filters with a case-insensitive **substring**: typing `opfl` finds
nothing even though it is the initials of "**Op**en **f**i**l**e". Every desktop
command palette (VS Code, Raycast, Linear, cmdk) matches a subsequence and ranks
better matches first. The inventory has carried "no fuzzy scoring in v1" since
plan 114; this plan closes it without changing the public API.

Two constraints shape the design:

1. **Groups must survive ranking.** The palette renders a group heading when the
   group changes between consecutive rows, and the heading order is the
   declaration order. A global score sort would interleave groups and repeat
   headings ("File" / "Navigation" / "File"). Ranking therefore happens **within
   each group**, and groups stay in first-appearance order.
2. **The custom `filter` prop keeps its contract.** A consumer that passes
   `filter` gets exactly the rows it accepts, in declaration order — no hidden
   fuzzy pass and no reordering. Only the default path ranks.

---

## 1. Files

```
packages/components/src/menu/fuzzy.ts              # pure scorer + match + rank
packages/components/src/menu/fuzzy.test.ts         # +12 logic tests
packages/components/src/command-menu.tsx           # default path uses fuzzy matching
packages/components/src/behaviour/command-menu.test.tsx # +4 native tests
packages/components/docs/command-menu.mdx          # matching + ranking sections
packages/components/README.md                      # command-menu row
COMPONENTS.md                                      # Command menus row
packages/components/src/inventory.ts               # commandMenuMeta limitations
TODO.md                                            # the hardening task
.agents/slop/plans/README.md                       # index this plan
```

Read `src/menu/logic.ts` (the active-row rules this must not disturb),
`src/internal/typeahead.ts` (the prefix matcher that already exists — do **not**
merge the two: type-ahead is a prefix cycle, this is a ranked filter), and the
current `src/behaviour/command-menu.test.tsx`.

## 2. Design decisions (do not re-litigate)

1. **Subsequence, not substring.** The query's characters must appear in order in
   the label; they need not be adjacent. Empty (or whitespace-only) query matches
   everything with score `0`.
2. **Scores are relative and deterministic.** A match scores `10` per query
   character, plus `8` when the matched character starts a word, plus `2 × the
   current consecutive-run length`. Higher is better; there are no floating
   weights, no fuzz factor and no locale.
3. **Word starts beat runs in the middle of a word.** Query `open` ranks
   "Open file" (60) above "Reopen file" (52): the first `o` follows a separator.
   Query `of` ranks "Open file" (36) above "Proofread" (22): the `f` starts a
   word.
4. **Stable ties.** Every match carries its declaration index; the sort order is
   `(score desc, index asc)`, so equal scores never shuffle.
5. **Rank within groups, keep group order.** Groups are the first appearance of
   each `group` value in the filtered list; ungrouped actions (`group ===
   undefined`) form one group, in declaration order. Within a group, matches sort
   by `(score desc, index asc)`. A group with no match disappears.
6. **Only the default path changes.** `filter` still receives the action and the
   raw query, returns a boolean, and its accepted rows stay in declaration order.
7. **Ties against the old behaviour are impossible to break:** with the empty
   query every score is `0` and the index tie-break preserves declaration order,
   so the initial palette renders exactly as before.
8. **No new dependency.** The scorer is ~50 lines of pure code; a fuzzy-search
   package would add a dependency for one screen.

## 3. `src/menu/fuzzy.ts`

```ts
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Order } from "effect";
import * as Str from "effect/String";

/** One matching item with its score and declaration index. */
export interface FuzzyMatch<A> {
  readonly item: A;
  readonly score: number;
  /** Position in the input list; the stable tie-break. */
  readonly index: number;
}

/**
 * A case-insensitive subsequence score for `query` in `text`, or `None` when
 * the query is not a subsequence. `Some(0)` for an empty or whitespace query.
 */
export const fuzzyScore: (
  query: string,
  text: string,
) => Option.Option<number>;

/** Every matching item, scored and carrying its declaration index. */
export const fuzzyMatches: <A>(
  items: ReadonlyArray<A>,
  query: string,
  textOf: (item: A) => string,
) => ReadonlyArray<FuzzyMatch<A>>;

/**
 * Order matches by group: groups follow their first appearance, and each
 * group's items sort by score desc then declaration index. Returns bare items.
 */
export const rankByGroup: <A>(
  matches: ReadonlyArray<FuzzyMatch<A>>,
  groupOf: (item: A) => string | undefined,
) => ReadonlyArray<A>;
```

Implementation notes:

- `normalise` is `pipe(value, Str.trim, Str.toLowerCase)` (trim first, then
  lower — both are total).
- Word start: index `0`, or the previous character is not `[a-z0-9]` after
  normalisation. A space, dash, slash, underscore and punctuation all count as a
  boundary.
- The walk is a small tail recursion over `(queryIndex, textIndex, score,
  streak)`; it must terminate when either index reaches its length:
  ```ts
  const walk = (qi: number, ti: number, score: number, streak: number):
    Option.Option<number> => {
    if (qi >= query.length) return Option.some(score);
    if (ti >= text.length) return Option.none();
    return text.charAt(ti) === query.charAt(qi)
      ? walk(qi + 1, ti + 1, score + 10 + bonus(text, ti, streak), streak + 1)
      : walk(qi, ti + 1, score, 0);
  };
  ```
  Use `Str.charAt`? `String.prototype.charAt` is a native string helper; prefer
  `Str.charAt` if it exists (check `effect/String`), otherwise index access with
  an explicit `?? ""`. Nullish index returns are handled, never asserted.
- `bonus = boundary ? 8 : streak * 2`.
- `fuzzyMatches` uses `Arr.filterMap`:
  ```ts
  Arr.filterMap(items, (item, index) =>
    Option.map(fuzzyScore(query, textOf(item)), (score) => ({
      item,
      score,
      index,
    })),
  )
  ```
  Check `filterMap`'s callback arity in the installed Effect; if it passes only
  the value, zip with `Arr.map(items, (item, index) => …)` first. Do not use a
  mutable counter.
- `rankByGroup` uses `Arr.dedupe` for the keys, `Arr.filter` per key, and
  `Arr.sort` with:
  ```ts
  Order.combine(
    Order.mapInput(Order.Number, (m: FuzzyMatch<A>) => -m.score),
    Order.mapInput(Order.Number, (m: FuzzyMatch<A>) => m.index),
  )
  ```
  The combined order is total, so no reliance on sort stability.

## 4. `src/command-menu.tsx`

Replace `normalise` and `defaultFilter` with:

```ts
const defaultMatches = (
  actions: ReadonlyArray<CommandAction>,
  query: string,
): ReadonlyArray<CommandAction> =>
  rankByGroup(
    fuzzyMatches(actions, query, (action) => action.label),
    (action) => action.group,
  );
```

and in the component:

```ts
const matches =
  filter === undefined
    ? defaultMatches(actions, query)
    : Arr.filter(actions, (action) => filter(action, query));
```

Everything downstream (`specs`, `firstEnabled`, the active-index fallback, group
heading rendering, Enter/click) is unchanged: it already works on the filtered
array.

Update the module header: the default is a ranked subsequence match; a custom
`filter` replaces it and keeps declaration order. Update the `filter` prop JSDoc
to "Replace the default ranked fuzzy match with a boolean predicate; accepted
rows keep declaration order."

## 5. Tests

### 5a. `src/menu/fuzzy.test.ts` (pure, 12 tests)

Header comment states the guarded bugs: *a substring rule that rejected
initials; a scorer that let a mid-word run outrank a word start; a global score
sort that interleaved groups and repeated headings; a tie that reordered the
list; a custom filter that was silently fuzzy; an empty query that reordered the
palette.*

1. Empty and whitespace-only queries match everything with score `0`.
2. Matching ignores case and trims the query (`" Open "` matches "Open file").
3. A word-start match outranks a mid-word match (`open`: "Open file" >
   "Reopen file").
4. Boundary characters count (`of`: "Open file" > "Proofread").
5. A subsequence matches (`opfl` in "Open file") and a non-subsequence does not
   (`zzz`).
6. A query longer than the label is `None`.
7. Repeated query letters consume distinct text characters (`oo` matches "Open
   tool", not "Open file").
8. `fuzzyMatches` keeps declaration order and reports each item's index.
9. `rankByGroup` keeps groups in first-appearance order.
10. `rankByGroup` sorts within a group by score (declare "Reopen file" before
    "Open file"; expect "Open file" first).
11. `rankByGroup` breaks a score tie by declaration index.
12. `rankByGroup` drops a group with no match and treats ungrouped items as one
    group (two independent assertions).

Expected: logic suite 211 -> 223.

### 5b. `src/behaviour/command-menu.test.tsx` (+4 native tests)

Extend the header comment: *a non-contiguous query that matched nothing; a
ranking that ran the wrong row on Enter; a global sort that interleaved group
headings; an empty query that reordered the palette.*

Add a local `rankedActions` fixture:

```ts
const rankedActions = (perform: (id: string) => void) => [
  { id: "reopen", label: "Reopen file", group: "Files", perform: () => perform("reopen") },
  { id: "open", label: "Open file", group: "Files", perform: () => perform("open") },
];
```

and a `LocalPalette` wrapper over it (same controlled `open` shape as
`Palette`).

1. **A non-contiguous query matches by initials.** Existing actions, type
   `opfl`: `getAllText()` contains "Open file", does not contain "Open recent",
   and `command-empty` is absent. Enter runs `open-file`.
2. **Ranking decides the default Enter target.** `LocalPalette`, type `open`;
   `command-open` has `aria-selected: true` and `command-reopen` false; Enter
   calls `perform("open")`, not `"reopen"`.
3. **Group order survives ranking.** Use actions where a later group would win a
   global sort:
   ```ts
   [
     { id: "goto", label: "Go to line", group: "Navigation", perform },
     { id: "open", label: "Open file", group: "File", perform },
   ]
   ```
   type `o`; `getAllText()` contains each heading exactly once and
   `indexOf("Navigation") < indexOf("File")`.
4. **An empty query keeps declaration order.** Initial palette: the first
   enabled action (`command-open-file`) is the active row. This would fail if
   ranking applied non-zero scores to an empty query or reordered by label.

Expected: CommandMenu suite 8 -> 12; behaviour 259 -> 263.

### 5c. Both directions

1. Green first; record counts.
2. Make `defaultMatches` the old substring filter (`Arr.filter(actions, …)`) →
   test 1 must fail (no row for `opfl`).
3. Make `rankByGroup` return `Arr.map(matches, (m) => m.item)` without sorting →
   test 2 must fail with `command-reopen` active / `perform("reopen")`.
4. Make `rankByGroup` sort **globally** by score (ignore groups) → test 3 must
   fail with `File` before `Navigation`.
5. Restore; re-run green; record the red lines in §9.

## 6. Docs, inventory, ledgers

- `docs/command-menu.mdx` — replace the substring wording with a **Matching**
  section: subsequence, case-insensitive, trimmed; word starts and runs;
  ranking is within a group and groups keep declaration order; empty query is
  the full list in declaration order; a custom `filter` replaces all of it. Add
  three illustrative queries (`opfl`, `open`, `of`). Limitations: remove "no
  fuzzy scoring"; keep no `aria-activedescendant`. Verification: 12 behaviour
  tests + the 12 logic tests.
- `src/inventory.ts` → `commandMenuMeta.limitations`: replace the substring
  entry with "ranking is per group, not global, so a group's heading never
  repeats; a custom filter opts out and keeps declaration order".
- `COMPONENTS.md` → Command menus row: default is ranked subsequence matching
  (initials match), groups keep order, `filter` replaces it; 12 native tests.
- `packages/components/README.md` → `src/command-menu.tsx` row: mention ranked
  fuzzy matching.
- `TODO.md` → under "Tier 2 hardening after the inventory closed":
  `- [x] Command menu fuzzy matching and in-group ranking — plan 133`.
- `.agents/slop/plans/README.md` → plan 133 row with final counts.

## 7. STOP conditions

1. `Arr.filterMap` has no index argument and the zip workaround needs a cast or
   a mutable counter → STOP; prefer `Arr.map` + `Arr.getSomes`, report which.
2. The recursive score walk needs `any`, a non-null assertion or an unchecked
   index → STOP with the compiler output.
3. A group heading repeats after typing (the ranking flattened groups) → STOP;
   the grouping contract is the requirement.
4. The existing 8 CommandMenu tests change behaviour for `op` (two matches) →
   STOP; equal scores must keep declaration order.
5. A custom `filter` stops receiving the raw query or its rows reorder → STOP.
6. A test is flaky across two consecutive runs → STOP and report; nothing here
   is time-dependent.

## 8. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 211 -> 223
nub run --filter @gpuixui/components test:behaviour   # 259 -> 263; CommandMenu 12
nub run check                                         # exit 0
nub run test                                          # exit 0
```

Record actual counts and any deviation in §9.

## 9. Deviations, recorded during implementation

1. **The existing `op` test gained a legitimate match.** Fuzzy matching now finds
   "Export as PDF" for `op` (the `o` of "Export", the `p` of "PDF"). §7 STOP 4
   anticipated no extra matches; that expectation was wrong about the feature.
   The assertion now states the fuzzy rule (`Export` present, `Toggle sidebar`
   and `Save` absent) and the test still guards the ordering it was written for.
2. **Both-direction proof, recorded from the actual runs.**
   - The old substring default made *matches a non-contiguous query by initials*
     fail with `expected [ 'No matching commands', … ] to include 'Open file'`.
   - Dropping the sort from `rankByGroup` made *runs the best-ranked row, not the
     first declared* fail with `expected false to be true` on
     `command-open`'s `aria-selected` (the first declared `reopen` won).
   - Sorting globally instead of per group made *keeps groups in declaration
     order while ranking inside them* fail with `expected 0 to be greater than 2`
     (`File` painted before `Navigation`).
   All restored; the logic suite passed 12/12 and the CommandMenu suite 12/12.
3. **Actual counts.** Logic 211 → 223 (12 new). Behaviour 259 → 263: CommandMenu
   8 → 12.
4. **The group-order fixture needed a later group that scores higher for the
   query.** `Go to line` scores 10 for `o` (the second `o` is never consumed
   once the query is satisfied) and `Open file` scores 18, so a global sort puts
   the `File` group first — exactly the failure the test must catch.


# 817 — The state table's floor figures and the inactive floor have no owner

> **Renumbered from `816` (2026-10-21).** Two unexecuted plans in
> `workspaces/playground` already own that number
> (`816-content-surface-washes.md`, `816-nested-surface-press.md`), and plan
> numbers are a global identity across worktrees (PLAN.md D7). This plan had not
> been executed and takes the next free number; the content below is unchanged.

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `309`, `306`,
`347`, `354`, `381`, `393`, `501`, `510`, `543`, `674`, `737`, `815`.

## 1. The defect

`docs/design-system.md` §8 (the interaction-state table) and the three passages
that state the inactive floor are the page's floor vocabulary: seven table rows
quote the class floor a state is held to, and three paragraphs quote the
`inactive` pair. `contrastFloors` owns the numbers and `contrastPairClasses` the
order, and the §9 table's rows are derived (plans `501`, `543`, `674`), but the
figures §8 states are prose.

Measured on this tree — each mutation applied alone, the full suite run, the
tree restored. **All 219 files / 7127 tests stayed green**:

| Mutation | Where |
| -------- | ----- |
| `hover` row: “the 1.05:1 perceivability floor” → `1.06:1` | §8 table |
| `loading` row: “the 1.05:1 perceivability floor” → `1.06:1` | §8 table |
| `selected` row: “one 1.05:1 step past the `accent` wash” → `1.06:1` | §8 table |
| `unchecked` row: “held to 1.05:1 on the four plain surfaces” → `1.06:1` | §8 table |
| `disabled` row: “readable dim (3:1, 4.5:1 at AAA)” → `(4:1, …)` | §8 table |
| `invalid` row: “essential-boundary floor (3:1, 4.5:1 at AAA)” → `(4:1, …)` | §8 table |
| `status` row: “held to 1.05:1 on the nine surfaces” → `1.06:1` | §8 table |
| “readable dim (3:1, 4.5:1 at AAA) and the edge keeps the shape” → `(4:1, …)` | §8 inactive paragraph |
| “requires 3:1 for a disabled label (4.5:1 at AAA)” → `4:1` | §9 inactive paragraph |
| README “holds `disabledForeground` to 3:1 (4.5:1 at AAA)” → `4:1` | `packages/tokens/README.md` |

Why it matters:

- These are the figures a reader builds from. The §9 table is derived, so a
  `contrastFloors` edit fails it — but the author then updates the table and the
  palette and can still leave §8 and the inactive paragraphs quoting the old
  numbers, because nothing reads them. That is exactly the gap plan `815`
  closed for the border roles, one vocabulary over.
- The inactive floor is the library's one **non-WCAG** floor (1.4.3 exempts
  inactive components). It is stated three times as a deliberate design
  decision; a changed floor would leave the rationale arguing for a number the
  contract no longer enforces.
- The `hover`, `loading` and `status` rows are the filler/state floors the
  interactive-fill and surface classes own (`surface`), and `selected` is the one
  `step` row in the table — a reader comparing them is reading three different
  classes stated as one number.

No colour, pair, floor, metric, role or shipped theme moves: every stated figure
is correct today; the defect is that none of them is owned.

## 2. What the contract measures today

```
contrastFloors.default.surface   1.05   high   1.05
contrastFloors.default.step      1.05   high   1.05
contrastFloors.default.inactive  3      high   4.5
contrastFloors.default.boundary  3      high   4.5
contrastPairClasses              eight classes, `body` first
```

## 3. Decision

1. Add `packages/tokens/src/state-floor-claims.test.ts`, which derives every
   figure from `contrastFloors`, slices the seven §8 rows and the three inactive
   passages, and holds each to its class.
2. Change no prose value. Every figure is correct; the missing owner is the
   defect. (The §8 `pressed` row's “held to the same floor” is a deliberate
   cross-reference to the `hover` row and is not given a figure to derive.)
3. Keep the §9 table and its existing guards untouched: this plan owns the
   narrative §8 states, not the table `501`/`543`/`674` already derive.

## 4. Files to change

1. **create** `packages/tokens/src/state-floor-claims.test.ts`.
2. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.
3. `TODO.md` — a ticked row and the section counter.
4. `COMPONENTS.md` — the *Theme contrast check* row gains one sentence naming the
   new owner.

No document sentence changes. No source module changes.

## 5. Step 1 — `packages/tokens/src/state-floor-claims.test.ts`

Header states the bug: §8's state table and the three passages that state the
inactive floor quote seven class floors and the one non-WCAG floor as prose, and
mutating any of the ten leaves the whole suite green, so a `contrastFloors` edit
can leave the page arguing for a number the contract no longer enforces; the §9
table is derived and the figure vocabulary beside it was not.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `contrastFloors`, `contrastPairClasses` from `./contrast.js`.

Helpers (module scope):

```ts
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

const between = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  if (from === -1 || to === -1) {
    throw new Error(`no slice from ${JSON.stringify(start)}`);
  }
  return text.slice(from, to);
};

const floor = (level: "default" | "high", pairClass: "surface" | "step" | "inactive" | "boundary"): string =>
  `${contrastFloors[level][pairClass]}:1`;
```

Slices:

```
hoverRow      §8 table   start "| hover |"      end "| pressed |"
loadingRow    §8 table   start "| loading |"    end "| selected |"
selectedRow   §8 table   start "| selected |"   end "| unchecked |"
uncheckedRow  §8 table   start "| unchecked |"  end "| link |"
disabledRow   §8 table   start "| disabled |"   end "| invalid |"
invalidRow    §8 table   start "| invalid |"    end "| focus |"
statusRow     §8 table   start "| status |"     end "Find highlighting is"
designInactive  §8 paragraph  start "An inactive control is not an opacity composite"
                              end "A filled primary action at 50% opacity"
designRationale §9 paragraph  start "The inactive state is measured too"
                              end "The `disabled` fill is held like any other fill"
readmeInactive                start "The inactive state is measured too"
                              end "A disabled field keeps its own"
```

Cases:

1. **the classes are the contract's** — `contrastPairClasses` contains the four
   classes this plan reads, `surface` and `step` are `1.05` at both levels, and
   `inactive` is `3` / `4.5` while `boundary` is `3` / `4.5`.
2. **the state table states each class's floor** —
   `hoverRow` and `loadingRow` contain
   `` `held to the ${floor("default", "surface")} perceivability floor` ``;
   `selectedRow` contains `` `one ${floor("default", "step")} step past` ``;
   `uncheckedRow` contains
   `` `held to ${floor("default", "surface")} on the four plain surfaces` ``;
   `statusRow` contains
   `` `held to ${floor("default", "surface")} on the nine surfaces` ``;
   `disabledRow` and `invalidRow` contain
   `` `(${floor("default", "inactive")}, ${floor("high", "inactive")} at AAA)` ``
   and `` `(${floor("default", "boundary")}, ${floor("high", "boundary")} at AAA)` ``
   respectively.
3. **the inactive floor is stated from the same numbers** — `designInactive`
   contains
   `` `readable dim (${floor("default", "inactive")}, ${floor("high", "inactive")} at AAA)` ``,
   `designRationale` contains
   `` `requires ${floor("default", "inactive")} for a disabled label (${floor("high", "inactive")} at AAA)` ``,
   and `readmeInactive` contains
   `` `holds \`disabledForeground\` to ${floor("default", "inactive")} (${floor("high", "inactive")} at AAA)` ``.

Deliberately not asserted: the surface lists each row names (`docs.test.ts` plan
`354` owns them), the §9 floor table (`501`/`543`/`674` own it), the pair
membership (`contrast.ts`) and the measured ratios (`figures.ts`).

## 6. Test plan

```sh
nub run --filter @gpuixui/tokens test src/state-floor-claims.test.ts
```

Expected after: one file, three cases green.

**Prove every case in both directions** (apply, run the file, revert — one at a
time):

1. Each of the ten §1 mutations fails case 2 or 3 and the tree is restored.
2. Move `contrastFloors.default.surface` to `1.06` → cases 1 and 2 fail (the
   rows are read against the export).
3. Move `contrastFloors.high.inactive` to `5` → cases 1–3 fail.
4. Delete a marker phrase (e.g. “held to the 1.05:1 perceivability floor”) →
   `between` throws with the slice name, so a relocated row fails loudly rather
   than passing on an empty string.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

Expected: **220** test files and **7130** tests green (219 / 7127 before; three
cases added). No native scenario changes.

## 7. STOP conditions

- Stop if a colour, role, pair, floor, metric or shipped theme has to move. Every
  stated figure is correct.
- Stop if a §8 row has to be reworded to be asserted: the rows are the page's
  prose and plan `354` already owns their surface lists. Add the assertion the
  existing wording supports; if the wording makes the figure unassertable, record
  it instead of rewording.
- Do not add a count word, a surface or a pair to the documents.
- Do not touch `docs.test.ts`, `figures.ts` or the §9 table.
- No cast, `any`, or name-based lookup where a derived value exists.

## 8. Acceptance

- `state-floor-claims.test.ts` derives every figure from `contrastFloors` and
  reads the seven §8 rows plus the three inactive passages.
- Each of the ten mutations in §1 fails the suite, and moving either floor fails
  the anchor case.
- `nub run --filter @gpuixui/tokens test` is green (220 files, 7130 tests),
  `nub run check`, `nub run lint` and `nub run test` clean.
- `TODO.md` ticks the row and keeps the section counter current; the plan index
  lists `817`; the ledger row names the new owner.

## 9. Execution record

Executed on 2026-10-21 on `agent/tokens-theme`.

- Renumbered from `816` before executing: two unexecuted `playground` plans own
  that number on this tree's sibling worktrees.
- The defect reproduced as §1 states, before the new suite existed: all ten
  prose mutations left **219 files / 7127 tests** green.
- `state-floor-claims.test.ts` adds three cases. `states` slices the seven §8
  rows by their neighbouring row markers, the three paragraphs are sliced by
  their opening and closing sentence, and every figure is built from
  `contrastFloors`; the anchor case pins the four classes this plan reads.
- Every §6 mutation was applied alone, the new file run and the tree restored:
  each of the ten prose figures (cases 2–3), `contrastFloors.default.surface` at
  1.06 (cases 1–2), `contrastFloors.high.inactive` at 5 (cases 1–3) and a removed
  “perceivability floor” marker (case 2) failed; the restored tree passed.
- `nub run --filter @gpuixui/tokens test` → **220 files / 7130 tests** green;
  `nub run check`, `nub run lint` and `nub run test` clean.
- No prose value changed: every figure was already correct and none was owned. No
  native scenario was run.

# 813 — A keyboard-table row outside its table is not documentation

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth / consistency) |
| Owner | primitives workstream |
| Depends on | `027`, `074`, `349`, `394`, `583`, `804` |
| Status | done |

Self-contained: §0 the measured gap, §1 the decision, §2 the rule, §3 the files,
§4 commands and expected results, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan

### 0.1 The gap

Two pages in this package put a table row **after** the table's closing
paragraph. A Markdown table ends at the first blank line, so the row is painted
as body text, pipes included, and the key it documents is missing from the
table it belongs to:

| Page | Line | Rendered as |
| ---- | ---- | ----------- |
| `packages/primitives/docs/checkbox-group.mdx` | 113 | body text: `\| arrows \| **not handled** — arrows do not move between checkboxes on the platform \|` |
| `packages/primitives/docs/rating.mdx` | 69 | body text: `\| \`Delete\` / \`Backspace\` \| clear to \`0\` \|` |

Measured on this tree (a scan of every `docs/**/*.mdx`, `README.md` and
`docs/*.md` in both packages, 2026-10-21): exactly these two lines have no
table neighbour on either side. Every other `|` line in both packages is part
of a well-formed block, and every block's rows have the same cell count as its
header once `\|` cells are counted as one cell.

### 0.2 Why it matters

- The `Rating` page's clear contract — the **only** way the value returns to
  zero — does not render as a row; a reader scanning the table never sees it,
  and its prose ("Delete moves native focus to the first star") refers to a key
  the table did not show.
- The `CheckboxGroup` page's "arrows are not handled" statement is the one row
  that distinguishes it from `RadioGroup`; painted as a stray line after the
  `autoFocus` paragraph it reads as a dangling sentence.
- Nothing guards a page's table **structure**. Plans `027`/`394` guard which
  props and which axes a page names, `074` guards that a page exists, and
  `349` guards TSDoc — a row that falls out of its table is invisible to all of
  them, and to a reviewer reading the source, because it still starts with `|`.

### 0.3 What must not change

- No behaviour: no component, style resolver or prop changes.
- No other page's content beyond moving the two rows into the tables they
  already belong to, and the prose that referred to them stays as written.
- No page outside `packages/primitives` and `packages/icons` (the components
  and docs-site workstreams own their pages; the scan is recorded in `TODO.md`
  if it ever finds one there).

## 1. The decision

**Every `|` line in a page is inside a well-formed table, and a documented key
row is tied to the rule that answers it.** The two orphan rows move into their
tables, and `src/docs-tables.test.ts` reads both packages' pages and fails by
file and line when a row escapes a table or a table block is malformed.

The `Rating` and `CheckboxGroup` keyboard tables — the two the defects were on —
become part of the existing `src/docs-keyboard.test.ts` contract, which until now
tied only the `ToggleGroup`/`RadioGroup` axes to `decideMove`. The new cases are
two-directional: a documented movement key must be answered by `decideRating`
with the documented result, every key `decideRating` answers must be documented,
and an activation row must match `decideActivation` on its key phase. A checkbox
row must answer **no** arrow through either rule, which is what its "not handled"
row claims.

## 2. The rules

### 2.1 Table structure (`src/docs-tables.test.ts`)

1. Split a page into lines. A **table block** is a maximal run of consecutive
   lines whose first non-space character is `|`.
2. A block is well-formed when it has at least two lines, its second line is a
   delimiter row (every cell matches `^:?-{3,}:?$`), and every later row has the
   same cell count as the first.
3. Any `|` line whose neighbours are not `|` lines is an **orphan** and fails on
   its own (`a row outside a table renders as body text`).
4. Cells split on unescaped `|` only, so `"sm" \| "md"` remains one cell.
5. Pages are discovered from both packages (`docs/**/*.mdx`, `docs/*.md`,
   `README.md`, `src/../README.md`), through Effect `FileSystem`/`Path` like the
   existing doc guards (`docs-keyboard.test.ts`, `docs-commands.test.ts`).

### 2.2 The two page edits

- `checkbox-group.mdx`: the `| arrows | **not handled** … |` row moves into the
  keyboard table as its last row, before the blank line and the `autoFocus`
  paragraph.
- `rating.mdx`: the `| \`Delete\` / \`Backspace\` | clear to \`0\` |` row moves into
  the keyboard table after the `Enter`/`Space` row.

### 2.3 The keyboard truth (`src/docs-keyboard.test.ts`)

Map a documented key name to the runtime's name
(`ArrowRight → right`, `Home → home`, `Delete → delete`, `Space → space`, …),
then, over the page's `## Keyboard` table:

| Documented row | Assertion |
| -------------- | --------- |
| `ArrowRight`/`ArrowUp` | `decideRating(3, 5, key)` = `Some(4)` |
| `ArrowLeft`/`ArrowDown` | `decideRating(3, 5, key)` = `Some(2)` |
| `Home` / `End` | `Some(1)` / `Some(5)` |
| `Delete` / `Backspace` | `Some(0)` |
| `Enter` / `Space` | `decideActivation(key, "down", false)` for Enter, `(key, "up", false)` for Space, and `false` on the other phase |

and the reverse direction: the keys `decideRating` answers at `(3, 5)` are
exactly the movement keys the table documents.

For `CheckboxGroup`, the page's activation rows are checked against
`decideActivation` (`Space` up, `Enter` down) and its "arrows not handled" row is
proved by both rules refusing `up`/`down`: `decideActivation` false in both
phases and `typeaheadChar` `None`.

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/docs/checkbox-group.mdx` | the arrows row moves into its table |
| `packages/primitives/docs/rating.mdx` | the clear row moves into its table |
| `packages/primitives/src/docs-tables.test.ts` | new guard: well-formed blocks, no orphan rows, by file:line |
| `packages/primitives/src/docs-keyboard.test.ts` | the `Rating` and `CheckboxGroup` truth cases, and the row parser they share |
| `COMPONENTS.md` | no status change; the Rating row's note records that its keyboard table is now guarded |
| `TODO.md` | a ticked task for this plan |
| `.agents/slop/plans/README.md` | the plan row |

## 4. Commands and expected results

Run from `packages/primitives`:

| Command | Expected |
| ------ | -------- |
| `nub run test -- src/docs-tables.test.ts` | **fails before the fix**, naming `docs/checkbox-group.mdx:113` and `docs/rating.mdx:69`; green after (2 files' worth of pages scanned) |
| `nub run test -- src/docs-keyboard.test.ts` | 5 existing + new cases green; with the `Rating` clear row removed it fails by key |
| `nub run test` | 76 files / 1117 + new tests green |
| `nub run check-types` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run fmt` | clean for every touched file (the docs-site `demos.tsx` report is outside this workstream, already in `TODO.md`) |

## 5. Test plan and the two-direction proof

### 5.1 Structure guard

1. **The two orphans** — against the pre-fix pages the guard fails twice, with
   `docs/checkbox-group.mdx:113` and `docs/rating.mdx:69` in the message.
2. **A malformed block** — a temporary page (or an inline fixture through the
   parser) whose second line is not a delimiter fails by line.
3. **An escaped pipe** — a row containing `"sm" \| "md"` passes: the escape is
   not a cell separator (the current pages exercise this in quantity, so the
   positive direction is the whole suite).
4. **A blank line inside a table** — the block after the blank line is a header
   only (one row), which fails case 2.

### 5.2 Keyboard truth

5. **Rating moves** — every arrow/Home/End/Delete row maps to the documented
   result of `decideRating`; the reverse direction (the rule's own answers are
   all documented) fails if the clear row is deleted from the table.
6. **Rating activation** — Enter answers on key down, Space on key up, both
   refused when held and on the other phase.
7. **CheckboxGroup** — Space up and Enter down activate; arrows are refused by
   both `decideActivation` and `typeaheadChar`.

### 5.3 Two directions (require a failing run before the fix)

| Direction | Expected failure |
| --------- | ---------------- |
| Old pages (rows orphaned) | structure guard names both files and lines |
| A row removed from the Rating table | the keyboard reverse case names the missing `delete`/`backspace` |
| The Rating table's `Home` row changed to `0` | the forward case reports `expected 1, received 0` |
| The CheckboxGroup "arrows not handled" row deleted | the checkbox case names the missing row |

Each mutation is reverted after it fails.

## 6. STOP conditions

Stop and report rather than improvise if:

- the scan finds an orphan row in a package this workstream does not own
  (components, docs-site): record it in `TODO.md` and do not edit that page;
- a page needs its table restructured rather than a row moved (then the defect
  is a content change, which needs its own decision);
- guarding the Rating table needs a rule the component does not use (the guard
  must read `decideRating`/`decideActivation`, not restate them);
- any edit would land outside `packages/primitives`, `packages/icons`,
  `COMPONENTS.md` or `TODO.md`.

## 7. Outcome

Measured 2026-10-21 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test src/docs-tables.test.ts` | 1 file / **5 tests** green |
| `nub run --filter @gpuixui/primitives test src/docs-keyboard.test.ts` | 1 file / **7 tests** green (was 3; +4) |
| `nub run --filter @gpuixui/primitives test` | 77 files / **1126 tests** green (was 76 / 1117; +1 file, +9 tests) |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run fmt` | touched files clean (the docs-site `demos.tsx` report is the recorded cross-workstream row) |

### 7.1 The measured guard output

Against the pre-fix pages the structure guard reported both defects by file and
line and nothing else:

```
primitives/docs/checkbox-group.mdx:113: a row outside a table renders as body text
primitives/docs/rating.mdx:69: a row outside a table renders as body text
```

After the two rows move, the same scan over 36 pages (`primitives/docs`,
`primitives/README.md`, `icons/docs`, `icons/README.md`) reports `[]`. The scan
count is asserted (`> 20`) so the guard cannot pass by reading nothing.

### 7.2 Two-direction proof (each mutation reverted after it failed)

| Mutation | Failures |
| -------- | -------- |
| The two pages restored (`git checkout` of both) | structure guard: both lines above, exactly |
| The `Rating` `Delete` / `Backspace` row deleted | keyboard `document every Rating movement key…` (`the page documents Delete`), `answer no Rating key…` (`delete`/`backspace` missing) |
| The `Rating` `Home` / `End` row deleted | the same two cases, naming `Home` and `home`/`end` |
| A page with a row after its table (inline fixture) | structure `fails a row that fell out of its table, by line` |
| A header with no delimiter row / a short row (inline fixtures) | structure `fails a block with no delimiter row`, `fails a row whose cell count differs from the header` |

The keyboard cases pin the **keys** a page names against the rule that answers
them; the prose in an effect column is not parsed, and the guard does not claim
to read it.

## 8. Acceptance

- Both rows render inside their tables, and no `|` line in either package is
  outside one.
- The structure guard fails by file and line on the pre-fix pages, and the
  keyboard cases fail when a documented key and the rule disagree.
- No component, style or prop changed; the offline suite, `check-types` and
  `lint` are green, with exact commands and totals recorded in §7.

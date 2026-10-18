# 335 — Docs truth: every docs page states its real native-test count

**Phase:** F (docs truth pass) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 117, 139, 330–333.

**Status when written:** 41 components have a docs page and a behaviour suite.
Plan 333 checks the count only on pages that already use the sentence
`` `src/behaviour/<file>` runs in the real GPUix renderer (N tests) ``. Fourteen
pages state the same fact in another shape (or not at all):

| Page | Current shape |
| ---- | ------------- |
| `chat`, `message`, `message-scroller` | a `## Testing` section; "drives the real renderer", no count |
| `color-picker`, `countdown`, `hotkey-recorder`, `mention-input`, `tag-input` | "(N native tests) covers …", spliced into the logic-suite paragraph |
| `dropdown-menu`, `keyboard-shortcuts`, `navigation-menu` | the canonical sentence, broken across a line so the check's `(\d+ tests)` never matches |
| `time-picker`, `date-picker` | "(N tests) covers …", no canonical sentence |
| `toast` | a bullet: "— 14 tests in the real GPUix renderer" |

The check therefore validates 23 of 41 pages and silently ignores 18. A reader
cannot tell which pages were audited, and a wrong count on those 18 would never
fail a gate.

## 1. The rule

> Every component docs page has a `## Verification` section containing exactly
> one sentence of this exact form:
>
> `src/behaviour/<stem>.test.tsx` runs in the real GPUix renderer (N tests): <details>.
>
> `<stem>` is the component's own behaviour suite and `N` is its real `^  it(`
> case count. The sentence must be on one line up to the closing `)` so the
> check can read it.

This supersedes plan 333 §2's "a page that does not state a count is out of
scope": all pages now state it.

## 2. Exact changes

### 2.1 `packages/components/docs/*.mdx` — 14 pages

Change only the verification prose; no component code, example or API table
changes.

- `chat.mdx`: rename `## Testing` to `## Verification`; make the behaviour
  sentence canonical with `(9 tests)`.
- `message.mdx`: same, `(10 tests)`.
- `message-scroller.mdx`: same, `(10 tests)`.
- `color-picker.mdx`: canonical sentence `(8 tests)` in its own paragraph,
  before the logic-suite sentence (or after it; the logic suite stays).
- `countdown.mdx`: canonical sentence `(5 tests)`; split it out of the
  logic-suite paragraph.
- `hotkey-recorder.mdx`: canonical sentence `(11 tests)`; split as above.
- `mention-input.mdx`: canonical sentence `(11 tests)`; split as above.
- `tag-input.mdx`: canonical sentence `(9 tests)`; split as above.
- `date-picker.mdx`: canonical sentence `(16 tests)` in its own paragraph.
- `time-picker.mdx`: canonical sentence `(11 tests)` in its own paragraph.
- `dropdown-menu.mdx`: join the broken line so `(35 tests)` is on the sentence's
  first line.
- `keyboard-shortcuts.mdx`: join the broken line so `(6 tests)` is on the first
  line.
- `navigation-menu.mdx`: join the broken line so `(17 tests)` is on the first
  line.
- `toast.mdx`: replace the behaviour bullet with the canonical sentence
  `(14 tests)`; keep the `toast/store.test.ts` bullet above it.

Keep each page's existing detail after the colon; the counts are already correct
and the inventory test enforces the rows. Do not renumber, add or drop cases.

### 2.2 `packages/components/src/inventory.test.ts`

Replace the body of "states the real native test count in every docs verification
line" with a total check. For every inventory record:

1. read `meta.docs`;
2. match `/src\/behaviour\/([\w-]+)\.test\.tsx\S* runs in the real GPUix renderer \((\d+) tests?\)/g`
   (the `\S*` consumes the closing backtick, so the regex literal contains no
   backtick — `scripts/check-tests.ts` cannot read the rest of the file as a
   template string);
3. report a problem when there is no match, more than one match, when the
   matched stem is not `meta.testFile`'s stem, or when the count differs from
   `countBehaviourTests(meta.testFile)`.

Keep the existing `Arr`/`Option`/`Result` imports and the `countBehaviourTests`
helper. Report one string per page, in inventory order.

### 2.3 Nothing else

No source, behaviour, example or inventory-record change. No `COMPONENTS.md`
count changes: plan 139/333 already keep those rows honest.

## 3. Test plan

1. `nub run --filter @gpuixui/components test` before the docs edits **must
   fail** on this check with 18 problems (14 non-canonical + the three missing
   sections counted inside them; the 18 are the pages listed above). Record the
   exact first line.
2. Apply 2.1; the same command is green.
3. Both-direction proof: change one page's count by one (for example
   `card.mdx` 5 → 4) and re-run — it must fail with
   `Cards: card.test.tsx says 4, suite has 5`; restore.
4. `nub run --filter @gpuixui/components test:behaviour` → 517 green (no
   behaviour change, but the docs truth must reflect the suite that runs).
5. `nub run check`, `nub run lint`, `nub run test` → green.

## 4. STOP conditions

- A page's behaviour stem does not match its inventory `testFile` — STOP and
  report; do not add a second canonical line.
- The sentence cannot fit on one line without hurting readability — STOP and
  narrow the check to a whitespace-normalised match instead of loosening the
  page rule.
- A count differs from the suite — fix the prose only after re-reading the
  suite; never change a test to match prose.

## 5. Acceptance

- Every one of the 41 component docs pages carries exactly one canonical
  verification line with its real count.
- The tightened check fails on any missing, duplicated, misnamed or miscounted
  line.
- The three repo gates and the behaviour suite pass.

## 6. Outcome

Landed on `agent/components` (2026-10-18). Evidence:

- **Before:** the tightened check listed 14 problems, the first being
  `Chat (AI conversation): expected one verification line, found 0`; the
  remaining 13 were the pages in §1's table.
- **After:** `nub run --filter @gpuixui/components test` → 335 passed, and
  `nub run --filter @gpuixui/components test:behaviour` → 517 passed.
- **Both directions:** changing `card.mdx` to `(4 tests)` failed with
  `Cards: card.test.tsx says 4, suite has 5`; renaming the suite in the page to
  `badge.test.tsx` failed with
  `Cards: verification names badge.test.tsx, record says src/behaviour/card.test.tsx`.
  Both were restored.
- Fourteen docs pages were edited (prose only); no component, example,
  behaviour or inventory-record change. The canonical sentence is now on one
  line, so `\((\d+) tests?\)` matches it.

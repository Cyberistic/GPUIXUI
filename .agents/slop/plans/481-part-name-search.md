# 481 — A part name finds its component

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 419 (registry search), 431 (relevance), 442 (props-type search), 454 (index filter), 479 (real parts)

## 1. Why this plan exists

Plans 419, 442 and 454 made a component findable by its title, its props type
and its limitations. Plan 479 then made `parts` real on 29 records — but nothing
reads them. A reader who knows the part they need (`DialogTitle`,
`DropdownMenuSubTrigger`, `MessageScrollerJumpToLatest`) cannot find its
component from ⌘K or from the component index's filter, even though the record
now names the part and the page documents it. The record is the only place the
public part list exists in a form the site can search. `DialogTitle` is the
proof case because it has **no** `DialogTitleProps`: the match can only come
from the part name.

## 2. What changes (exact files)

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/search.ts` | `componentSearchIndex`: part names join the indexed `content` and `keywords`. |
| `apps/docs/src/components/component-index.tsx` | `matchesComponent` searches `component.parts` names. |
| `apps/docs/src/lib/search.test.ts` | A part name (`DialogTitle`) reaches `/docs/components/dialog`; a single-component record still does not match it. |
| `apps/docs/src/components/component-index.test.tsx` | The filter matches a part name on a compound record and rejects it on an unrelated one. |
| `apps/docs/scripts/smoke-build.ts` | The production search check gains `DialogTitle → /docs/components/dialog`, so a built index that lost parts fails the release gate. |
| `apps/docs/README.md` | The search section names part names as a findable field. |
| `.agents/slop/plans/README.md` | This plan in the docs table. |
| `TODO.md` | A docs-site row, ticked; progress bar kept current. |

No component-package change: a part is a public export (already checked by
`registryViolations`).

## 3. Test plan

- `search("DialogTitle", 5)` → the first result is `/docs/components/dialog`. The
  current code fails (the part is not in any indexed field, and it has no props
  type to match by accident).
- `search("DialogTitleProbe")` → `[]` (no invented match).
- `matchesComponent(record("dialog"), "DialogTitle")` → `true`;
  `matchesComponent(record("button"), "DialogTitle")` → `false` (Button is a
  single-component record).
- `smoke:build --no-build` → `85 pages`, `104 links`, `smoke: ok`. Its new query
  fails if the built search index drops parts.

Two-direction proof: remove the part names from `componentSearchIndex` →
the search test and the built smoke fail with `DialogTitle`; restore → green.
Remove them from `matchesComponent` → the index test fails; restore.

## 4. Commands

```sh
nub run --filter docs test          # exit 0
nub run --filter docs check-types   # exit 0
nub run --filter docs build         # exit 0
nub apps/docs/scripts/smoke-build.ts --no-build   # exit 0
nub run check                       # exit 0
nub run lint                        # exit 0
nub run test                        # exit 0
```

## 5. STOP conditions

- A part name collides with another record's title so strongly that it changes
  existing ranking (`Tab` vs `Tabs`): stop and report; do not add a special case.
- The built smoke cannot see the part: the built index is the test — fix the
  index, never the query's expected URL.

## 6. Acceptance

- A real part name finds its component in both ⌘K and the index filter; the
  unrelated record does not match.
- The built-site smoke queries a part name and passes.
- Every gate passes; the plan index, README and `TODO.md` are updated; the work
  is committed and pushed on `agent/docs-site`.

## 7. Progress (2026-10-18)

- **Landed.** `componentSearchIndex` indexes part names in `content` and
  `keywords`; `matchesComponent` searches them too. The built smoke adds
  `DialogTitle → /docs/components/dialog`; `DialogTitle` has no props type, so
  the query can only match the declared part.
- **Two-direction proofs**, run and reverted:
  - dropping the part names from `componentSearchIndex` → `search("DialogTitle")`
    returned no page and the built smoke failed on the new query;
  - dropping them from `matchesComponent` → the index test failed.
- `nub run --filter docs test`: 44 files / 279 tests green; `check-types`,
  `build`, `smoke:build --no-build` (85 pages / 104 links / search), `nub run
  check`, `nub run lint` and `nub run test` verified before the commit.

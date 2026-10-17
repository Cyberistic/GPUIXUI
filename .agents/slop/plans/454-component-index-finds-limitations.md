# 454 — The component index finds what the registry can prove

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 411, 417, 419, 421, 431, 441, 443.

## 1. Why

`/docs/components` is the site's component search: 66 records, a text filter and
a live count. The filter matches a record's **title and summary** only
(`matchesComponent`), while the record already carries two more things a reader
searches by:

- the **props types** the page documents (`ButtonProps`, `ToastViewportProps`) —
  ⌘K indexes them (plan 442), the index does not;
- the **documented limitations** (`No aria-checked`, `No portal`, `no submenus`)
  — the MDX index answers them on the component page (⌘K), the index does not.

So the two search surfaces disagree: a reader who knows the API type or the
limitation that matters to them can find it with ⌘K and not with the filter on
the very page that advertises it. This plan makes the index match everything the
registry can prove, and guards the production index from silently losing the
component pages.

## 2. Scope

**In scope**

- `matchesComponent` matches title, summary, `api` type names and `limitations`.
- The filter's visible copy and the page prose say what it matches.
- `smoke:build` proves the **production** index answers a component's prose
  (a limitation query), not just a component name.

**Out of scope**

- New registry records. Tier 3–5 rows stay out until their packages exist
  (plan 427 §9).
- Fuzzy matching, ranking or scoring in the index. The filter is a contains
  check; ranking is ⌘K's job (plan 431).
- Changing what ⌘K indexes. Its registry index already carries `api` names and
  the MDX index already carries the limitations as prose.

## 3. Files

**Change**

- `apps/docs/src/components/component-index.tsx`
  - `matchesComponent`: add `component.api` and `component.limitations` to the
    matched fields; keep the trim/lowercase rule and the empty-query behaviour.
  - Update the component's doc comment and the input `placeholder`.
- `apps/docs/src/components/component-index.test.tsx`
  - New cases under `component filter`:
    - `matchesComponent(checkbox, "aria-checked")` is `true` (a limitation);
    - `matchesComponent(button, "ButtonProps")` is `true` (an API type);
    - `matchesComponent(button, "portal")` is `false` (it matches nothing the
      record proves);
    - `filterGroups("aria-checked")` returns at least one group and every item
      is a record that names the limitation.
- `apps/docs/scripts/smoke-build.ts`
  - Replace the single ad-hoc `button` search block with a table
    `{ query, expectedUrlPrefix, what }` and a small `searchUrls` helper:
    `button` → `/docs/components/button` (a name, the registry index) and
    `aria-checked` → `/docs/components/checkbox` (prose, the MDX index). Keep
    the blank-query check as it is.
- `apps/docs/content/docs/components/index.mdx` — the filter searches titles,
  summaries, documented props types and limitations.
- `apps/docs/README.md` — the component-index paragraph states the same set.
- `.agents/slop/plans/README.md` — index this plan.
- `TODO.md` — tick the row under the docs-site workstream.

## 4. Rules

- The filter stays case-insensitive, trimmed, and an empty query matches
  everything. No ranking, no `any`, no new dependency.
- A limitation is evidence the **page** already carries; the filter must not
  invent a capability. `matchesComponent` reads only fields the record owns.
- The production smoke check asserts the **URL** of the answer, not the snippet
  text (the index is free to change the snippet).
- Do not add Tier 3–5 records to make a query pass (plan 427 §9 STOP).

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 39 files pass; the new filter cases included |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | exit `0`; `smoke: search checked` after both queries pass |
| `nub run check` | exit `0` (test-quality gate, lint, format, types) |
| `nub run lint` | exit `0` |

## 6. Test plan (both directions)

1. **Limitation match** — add the `aria-checked` case, then remove
   `component.limitations` from `matchesComponent`: the case fails. Restore.
2. **API-type match** — remove `component.api`: the `ButtonProps` case fails.
   Restore.
3. **No over-match** — `button` and `portal` must not match: if the matcher is
   changed to `true` unconditionally both cases fail.
4. **Production index** — run `smoke:build` once with the limitation query.
   Then temporarily change the expected prefix to `/docs/components/slider` and
   confirm the crawl reports `FAIL … checkbox …` and exits `1`; restore. This
   proves the check can fail.
5. **Filter renders** — the existing server-markup tests still pass, including
   the live count and the empty state.

## 7. STOP conditions

- The production build's `/api/search?query=aria-checked` does not return the
  Checkbox page: stop and report the index defect; do **not** weaken the smoke
  check to a component name.
- A filter case would require a registry field that does not exist: stop and
  record it in `TODO.md` instead of widening the schema here.
- `filterGroups` changes the sidebar or the record order: stop — the filter must
  preserve registry order.

## 8. Acceptance

- Typing a props type or a documented limitation into the component index finds
  the component that owns it; the page says so.
- `smoke:build` fails when the production index stops answering component prose.
- All commands in §5 pass; the plan index and `TODO.md` are current; the change
  is committed on `agent/docs-site` and pushed.

## 9. Progress (2026-10-18)

- `matchesComponent` now searches title, summary, `api` type names and
  `limitations`; the placeholder and the page copy say so.
- `component-index.test.tsx`: three new cases (`ButtonProps`, `aria-checked`
  → Checkbox + Switch, and `portal` still matching nothing on Button).
- `smoke-build.ts`: the ad-hoc `button` block became a two-entry table — a name
  from the registry index and `aria-checked` from the component page's prose —
  and answers are matched by URL prefix.
- `nub run --filter docs test`: 39 files / 235 tests pass (232 before).
  `nub run --filter docs check-types`, `nub run check`, `nub run lint` and
  `nub run test` exit `0`.
- `nub run --filter docs smoke:build` exits `0` (`68 pages`, links and both
  search queries checked). Pointing the prose query at
  `/docs/components/slider` made the crawl print
  `FAIL /api/search?query=aria-checked: no result under /docs/components/slider
  for a component page's documented prose` and exit `1`; restoring it returned
  `0`.
- Removing `api` and `limitations` from `matchesComponent` failed both new
  filter cases (`expected false to be true`) and nothing else; restoring them
  passed. Both directions were run, not inferred.

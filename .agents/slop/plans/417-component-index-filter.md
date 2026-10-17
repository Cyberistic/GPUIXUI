# 417 — searchable component index

- **Workstream:** docs-site
- **Phase:** B → F (showcase quality)
- **Owns:** `apps/docs/src/components/component-index.tsx`, its test,
  `apps/docs/content/docs/components/index.mdx`, the docs rows in `TODO.md`
- **Depends on:** 411 (the registry and generated index), 410 (the app shell)
- **Depended on by:** nothing. Component pages still link into the index.

## 1. Why

`MISSION.md` lists **component search** under showcase quality. The site's
full-text search cannot cover component names: the index is rendered from the
registry as React, so the MDX search index never sees those titles. Today a
reader scrolls 83 cards across five tiers to find `Combobox`.

This plan adds a client-side filter to the component index. It searches the same
registry records the cards render — title and summary — so it cannot disagree
with the inventory, and it needs no new index or dependency.

## 2. Scope

- One `<input type="search">` above the groups, labelled and keyboard reachable.
- Case-insensitive, whitespace-trimmed match on `title` **or** `summary`.
- Groups with no match disappear; an empty result states the query and the total.
- A live count (`N of M components`) so the filter's effect is visible.
- Clearing the field restores every group.
- No fuzzy matching, no ranking, no server call: the list is small and local.

Out of scope: filtering by tier/status (the badges already show status; a query
for `planned` is not a component name), `/` keyboard shortcut (needs a global
listener and focus handling the docs shell owns), and changing Fumadocs search.

## 3. Files and exact changes

| File | Change |
| ---- | ------ |
| `apps/docs/src/components/component-index.tsx` | add `"use client"`-free `useState` filter (TanStack Start hydrates MDX components as usual); export `matchesComponent(component, query)` and `filterGroups(query)` for the test; render the input, count and empty state |
| `apps/docs/src/components/component-index.test.tsx` | add tests for the matcher and the rendered form; keep the existing four |
| `apps/docs/content/docs/components/index.mdx` | one sentence: the index is filterable, and the filter searches titles and summaries |
| `TODO.md` | tick this row after the gates pass |

No new dependency. `useState` is React; the filter is a pure function.

## 4. Implementation notes

```tsx
export const matchesComponent = (
  component: ComponentMetaInput,
  query: string,
): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return (
    component.title.toLowerCase().includes(needle) ||
    component.summary.toLowerCase().includes(needle)
  );
};
```

- Compute the visible groups inside the component from `groups` and the query
  (the registry is a module constant, so no effect or memo is needed).
- Keep `data-status` / `data-gpuix` / `data-role` attributes unchanged; the
  existing tests count them.
- Input: `id="component-filter"`, `type="search"`, a visible `<label>` with the
  same `htmlFor`, `autoComplete="off"`, `placeholder="Filter by name or
  summary…"`, and `aria-describedby` pointing at the count. Focus styling comes
  from `focus-visible:ring-2 focus-visible:ring-fd-ring` plus the existing
  border.
- Empty state: `No component matches “<query>”.` with a button (`type="button"`)
  that clears the query.
- The count is `aria-live="polite"` so a screen reader hears the result change.

## 5. Test plan

`component-index.test.tsx` renders once with `renderToStaticMarkup` (initial
state, empty query) and tests the matcher directly:

1. **renders the filter control once** — exactly one
   `id="component-filter"`, with a `<label for="component-filter">`; catches a
   missing or unassociated label.
2. **the initial state still renders every record** — existing test; catches a
   filter that hides everything before typing.
3. **matches title and summary case-insensitively** — `"BUTTON"` matches the
   Button record, `"interactive"` matches a summary, `"zzz"` matches nothing;
   catches a case-sensitive or title-only filter.
4. **blank and whitespace queries match everything** — catches a filter that
   treats `""` as no match.
5. **the count and empty state are wired** — assert the rendered count is
   `components.length of components.length` for the initial state; the empty
   state is proven by calling the matcher, since SSR cannot type into the input.

Two-direction proof:
- Make `matchesComponent` return `false` before the empty-query guard → test 4
  fails.
- Remove `toLowerCase()` from the title comparison → test 3 fails with `BUTTON`.
- Restore; the suite passes.

## 6. Commands and expected results

From `/Users/cyberistic/GPUIXUI/workspaces/docs-site`:

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass; report the count |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run check` / `nub run lint` / `nub run test` | pass |

## 7. STOP conditions

- MDX components do not hydrate in this app (typing does nothing). Stop and
  report; do not replace the filter with a static list and call it search.
- The filter requires moving the registry into the browser bundle in a way that
  pulls Effect or a GPUix package. The registry is already plain data; if that
  changes, stop.
- The existing index tests cannot keep their counts because the structure had to
  change materially. Report before rewriting them.

## 8. Implementation record (2026-10-17)

Landed on `agent/docs-site`.

- The initial implementation carried a `needle === ""` branch; it was removed
  because every string already contains `""`. The blank-query test still guards
  the behaviour (adding `if (needle === "") return false` fails five tests).
- Two-direction proofs demonstrated:
  - removing `.toLowerCase()` from the title match → `matches a title
    case-insensitively` fails;
  - returning `false` for a blank query → the index tests fail (0 cards).
- **Browser verification** (Chrome 141 headless via the DevTools Protocol, dev
  server): typing `combobox` → `1 of 64 components`; `zzz` → `0 of 64` with the
  empty state; clearing → `64 of 64`. The component hydrates; the filter is not
  server-rendered-only.
- Deliberate exception: `useState` is local input state in a browser-only app.
  Effect Atom is not a dependency of `apps/docs`, and the architecture test
  forbids the Effect runtime in the client bundle.

## 9. Acceptance criteria

- [ ] The index has a labelled, keyboard-reachable filter that searches titles
      and summaries, case-insensitively.
- [ ] Clearing it restores all groups; an empty result explains itself and can be
      cleared.
- [ ] The live count and `aria-live` are present.
- [ ] Tests 1–5 pass and both two-direction proofs were demonstrated.
- [ ] Gates and the docs build pass; work is committed on `agent/docs-site`.

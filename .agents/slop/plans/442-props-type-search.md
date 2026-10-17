# 442 — A props type name finds its component in search

**Phase:** F (docs polish) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 419, 431, 441

## 1. Why

Plan 441 made every documented props type structured metadata, and the API
reference page now lists them. But a developer's shortest path is ⌘K: typing
`ButtonProps` or `ToastViewportProps` currently returns nothing, because the
registry search document (plan 419) indexes only the title, summary and package
name — and the Fumadocs page index never sees an `<auto-type-table>` attribute
(it indexes rendered prose, not the tag).

The workstream owns **search** and **API metadata**, so the two should meet: a
type name is the most precise query a reader can give, and it must reach the page
that documents it.

## 2. Current state (measured 2026-10-17, `556bedd`)

- `apps/docs/src/lib/search.ts` — `componentSearchIndex` sets
  `content: \`${title}\n${summary}\`` and `keywords: component.packageName`.
- `apps/docs/src/lib/search.test.ts` covers titles, planned components, dedupe,
  ranking and the empty guard; no props-type query.
- `search("ButtonProps")` returns `[]`.
- The API reference index (plan 441) links each type to
  `/docs/components/<slug>#api-reference`, so the anchor already exists.

## 3. Change

`apps/docs/src/lib/search.ts`, `componentSearchIndex` only:

```ts
content: [component.title, component.summary, ...component.api].join("\n"),
keywords: [component.packageName, ...component.api].join(" "),
```

No ranking change: a type-name query matches no component **title**, so the
existing merge returns the registry page hit. A planned record has `api: []`, so
nothing is added for it. The URL stays the component page — the API table is on
that page, and a title query must keep landing at the top, so the result must not
gain a permanent `#api-reference` anchor.

`apps/docs/README.md` — the Search paragraph gains one sentence: the props types
a page documents are indexed, so `ButtonProps` reaches Buttons.

## 4. Tests

`apps/docs/src/lib/search.test.ts`:

```ts
it("finds a component by one of its props types", async () => {
  const results = await search("ButtonProps");
  expect(results[0]?.url).toBe("/docs/components/button");
});

it("finds a component whose second table is the match", async () => {
  const results = await search("ToastViewportProps");
  expect(results[0]?.url).toBe("/docs/components/toast");
});
```

Both run the real page + registry indexes, like the rest of this file.
Two-direction proof: remove `...component.api` from `content` (and `keywords`)
and re-run — both fail; restore.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 0; 198 + 2 tests |
| `nub run --filter docs check-types` | 0 |
| `nub run check` / `nub run lint` / `nub run test` | 0 |
| built site `curl /api/search?query=ButtonProps` | one result, `/docs/components/button` |

## 6. STOP conditions

- The simple-search index treats `content` or `keywords` as prose only and the
  type name still returns nothing: stop and record the result; do not add fuzzy
  matching or a second index for one query shape.
- A type-name query starts outranking a title query for the same component in a
  way that changes `button` → Buttons: stop; the title rule (plan 431) wins.

## 7. Acceptance

- `ButtonProps` and a non-first table name (`ToastViewportProps`) each reach their
  component page, proven by a test that fails without the indexed names.
- The title, planned-component, dedupe and empty-query rules are unchanged.
- All gates pass; committed and pushed on `agent/docs-site`.

## 8. Progress (2026-10-17, `556bedd`)

- **Implemented.** `componentSearchIndex` puts the record's props types in
  `content` and `keywords`; the URL and every ranking rule are unchanged.
- **Tests:** `nub run --filter docs test` → 35 files / 200 tests pass.
- **Two directions:** with `...component.api` removed from `content`/`keywords`,
  both new tests failed (`finds a component by one of its props types`, `…second
  table…`); restoring them passed. Measured on the built site:
  `GET /api/search?query=ButtonProps` → one page result,
  `/docs/components/button`; `ToastViewportProps` → `/docs/components/toast`.

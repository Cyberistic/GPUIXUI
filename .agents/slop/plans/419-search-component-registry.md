# 419 — search the component registry from anywhere

- **Workstream:** docs-site
- **Phase:** B → F (showcase quality)
- **Owns:** `apps/docs/src/lib/search.ts`, `apps/docs/src/routes/api/search.ts`,
  their tests, the docs rows in `TODO.md`
- **Depends on:** 411 (registry), 410 (search route), 417 (index filter)
- **Depended on by:** nothing.

## 1. Why

The site's search index is built from MDX pages. Component records are rendered
React, not MDX text, so pressing ⌘K on any page and typing `Combobox` returns
nothing — the component exists in the inventory but not in the index. Plan 417
fixed this **on the index page only**; this plan closes the global path.

## 2. Decision

Run two search servers behind one route:

1. `createFromSource(source)` — the existing Fumadocs page index, unchanged;
2. `createSearchAPI("simple", { indexes })` — one document per registry record.

Results are **page results first, then registry results**, capped at the same
limit. Pages stay the primary ranking (the docs are prose); registry hits fill
the tail, which is where a query with no page match (`Combobox`) still succeeds.

Registry result URLs:

- a component that has left `planned` → its page `/docs/components/<slug>`;
- a planned component → `/docs/components` (the index, where the filter and the
  honest status live), with `(planned)` in the title so a search result never
  implies a page exists.

Simple indexes carry `title`, `description`, `content`, `url`, `breadcrumbs`
and `keywords`; use `content = title + summary`, `keywords = packageName`,
`breadcrumbs = ["Components"]`. No fabricated prose.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/search.ts` | **new** — the two servers, `componentSearchIndex`, `componentSearchUrl`, `search`, `parseSearchLimit` |
| `apps/docs/src/lib/search.test.ts` | keep the page tests (through `search`), add registry, ordering, URL and limit tests |
| `apps/docs/src/routes/api/search.ts` | GET parses `query`/`limit`, returns `Response.json(await search(...))` |
| `TODO.md` | tick the global-search row after the gates pass |

The record's real title is `Comboboxes`, so a planned result reads
`Comboboxes (planned)`; the plan's earlier `Combobox` example was shorthand for
the record and is corrected below.

## 4. Implementation sketch

```ts
import type { SortedResult } from "fumadocs-core/search";
import {
  createFromSource,
  createSearchAPI,
  type Index,
} from "fumadocs-core/search/server";
import { components } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { source } from "./source";

export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 50;

export const componentSearchUrl = (
  component: Pick<ComponentMetaInput, "slug" | "status">,
): string =>
  component.status === "planned"
    ? "/docs/components"
    : `/docs/components/${component.slug}`;

export const componentSearchIndex = (
  component: ComponentMetaInput,
): Index => ({
  title:
    component.status === "planned"
      ? `${component.title} (planned)`
      : component.title,
  description: component.summary,
  content: `${component.title}\n${component.summary}`,
  url: componentSearchUrl(component),
  breadcrumbs: ["Components"],
  keywords: component.packageName,
});

const pageSearch = createFromSource(source);
const registrySearch = createSearchAPI("simple", {
  indexes: components.map(componentSearchIndex),
});

export const search = async (query: string, limit = 10) => {
  const [pageResults, registryResults] = await Promise.all([
    pageSearch.search(query, { limit }),
    registrySearch.search(query, { limit }),
  ]);
  return [...pageResults, ...registryResults].slice(0, limit);
};

export const parseSearchLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(parsed)
    ? DEFAULT_SEARCH_LIMIT
    : Math.min(Math.max(parsed, 1), MAX_SEARCH_LIMIT);
};
```

Route:

```ts
GET: async ({ request }) => {
  const url = new URL(request.url);
  return Response.json(
    await search(
      url.searchParams.get("query") ?? "",
      parseSearchLimit(url.searchParams.get("limit")),
    ),
  );
}
```

Empty query → both servers return `[]`, so the route stays `200 []` as today.

## 5. Test plan

| Test | Catches |
| ---- | ------- |
| `Installation` still returns `/docs/installation` | the merge dropping the page index |
| an unknown query returns `[]` | a registry index that matches everything |
| `Combobox` returns a result titled `Comboboxes (planned)` at `/docs/components` | the record never reaching search, or a planned result linking to a page that does not exist |
| `select` keeps `/docs/data-display` ahead of `Selects (planned)` | the merge order driving prose below inventory noise |
| `search(query, 3)` returns exactly three results | an unbounded response |

Two-direction proofs (run, both directions):
- delete the registry spread in `search` → the `Dialog` and ordering tests fail
  (`2 failed | 77 passed`);
- flip the merge order → the ordering test fails (`1 failed | 78 passed`);
- restore → `79 passed`.

## 6. Commands and expected results

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 16 files, 79 tests passed |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| dev server: `curl 'localhost:3000/api/search?query=combobox'` | `[{"type":"page","content":"Comboboxes (planned)","breadcrumbs":["Components"],"url":"/docs/components"}]` |
| dev server: `curl 'localhost:3000/api/search?query=zzz'` | `[]` |
| dev server: `curl 'localhost:3000/api/search?query=installation&limit=2'` | two page results, `/docs/installation` first |
| browser (headless Chrome, CDP): Open Search, type `combobox` | the dialog lists `Components / Comboboxes (planned)` |
| `nub run check` / `nub run lint` / `nub run test` | pass |

## 7. STOP conditions

- `createSearchAPI("simple", …)` and `createFromSource` return incompatible
  result shapes. Stop and report the shape; do not silently drop fields the
  dialog needs.
- The merge slows `/api/search` perceptibly or the simple index rejects a
  registry field. Report the error; do not hand-roll a third index.
- The dialog renders simple results incorrectly (missing title/description).
  Report; the page index must keep working.

Neither STOP condition triggered: both servers return `SortedResult[]`, and the
dialog renders the simple result's breadcrumb and title.

## 8. Acceptance criteria

- [x] `/api/search?query=combobox` returns a registry result, honestly labelled
      and pointing at the index while the component is planned.
- [x] Page results keep their current behaviour and ordering.
- [x] The dialog shows the registry result in the browser.
- [x] Two-direction proofs and gates pass; work is committed on
      `agent/docs-site`.

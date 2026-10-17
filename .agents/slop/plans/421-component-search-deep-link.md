# 421 — a component search result lands on the right row

- **Workstream:** docs-site
- **Phase:** F (showcase quality)
- **Owns:** `apps/docs/src/lib/search.ts`, `apps/docs/src/lib/search.test.ts`,
  `apps/docs/src/components/component-index.tsx`, its test, this plan, the index
  row, the `TODO.md` note.
- **Depends on:** 417 (index filter), 419 (registry search).
- **Depended on by:** nothing.

## 1. Why

After plan 419, ⌘K finds a planned component from any page — but every planned
result links to `/docs/components`, the full 64-row index. The reader asked for
"Dialogs" and lands on a wall of cards. The index filter already exists (417);
the search result should arrive with it applied.

## 2. Decision

- A planned component's search URL becomes
  `/docs/components?q=<encoded title>`.
- `ComponentIndex` initialises its filter from `?q=` (after mount, so the server
  render stays deterministic), and writes the current filter back to `?q=` with
  `history.replaceState` — no history entry per keystroke, no router round trip.
- Unrelated query parameters (notably `platform`, plan 420) survive.
- A finished component still links to its own page; its page does not need the
  filter.

## 3. Files and changes

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/search.ts` | `componentSearchUrl` takes the title; planned → `/docs/components?q=<title>` |
| `apps/docs/src/lib/search.test.ts` | planned URL assertion includes the filter; finished URL unchanged |
| `apps/docs/src/components/component-index.tsx` | initialise from `q` on mount; mirror the filter into `?q=`; keep `platform` intact |
| `apps/docs/src/components/component-index.test.tsx` | pure `filterQuery`/`withFilterQuery` assertions if the URL helpers are exported |
| `TODO.md` | note the deep link under the docs site section |

Implementation sketch for the URL helper (exported, node-testable):

```ts
export const filterQueryFromSearch = (search: string): string =>
  new URLSearchParams(search).get("q")?.trim() ?? "";

export const withFilterQuery = (search: string, query: string): string => {
  const params = new URLSearchParams(search);
  const trimmed = query.trim();
  if (trimmed === "") params.delete("q");
  else params.set("q", trimmed);
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
};
```

The component:

```tsx
const [query, setQuery] = useState("");
useEffect(() => {
  setQuery(filterQueryFromSearch(window.location.search));
}, []);
const update = (next: string) => {
  setQuery(next);
  const search = withFilterQuery(window.location.search, next);
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${search}${window.location.hash}`,
  );
};
```

## 4. Test plan

| Test | Catches |
| ---- | ------- |
| planned search URL is `/docs/components?q=Dialogs` | a result returning to the unfiltered wall |
| finished search URL is still `/docs/components/button` | the filter leaking into real pages |
| `filterQueryFromSearch("?q=Dialog")` → `Dialog`; absent/blank → `""` | a missing or empty filter |
| `withFilterQuery("?platform=win32", "Dialog")` → both params | dropping the platform choice |
| `withFilterQuery("?q=x", "")` → `""` | a stale filter surviving a clear |

Two directions: remove the `q` from `componentSearchUrl` → the URL test fails;
drop the existing params in `withFilterQuery` → the platform-preservation test
fails.

Browser proof: open `/docs/components?q=Dialogs`, the count is below 64 and the
Dialogs card is present; type `combobox`, the URL gains `?q=combobox`; clear,
`q` disappears.

## 5. Commands

`nub run --filter docs test`, `check-types`, `build`, then the repo gates;
headless Chrome for the browser proof.

## 6. STOP conditions

- `useSearch`/the router rewrites the URL on every replaceState — STOP and report;
  do not fork the router.
- The initial filter causes a hydration warning — STOP; fall back to the
  post-mount effect only (that is already the design) and report.

## 7. Acceptance criteria

- [x] A planned component's search result opens the index filtered to it.
- [x] Clearing the filter removes `q`; `platform` and other params survive.
- [x] Tests, both directions, the browser proof and gates pass; committed and
      pushed.

## 8. Verification record

- `/docs/components?q=Dialogs&platform=linux` renders `2 of 65 components`
  (Dialogs, Confirmation dialogs) with Linux still applied.
- Typing `combobox` → `?q=combobox&platform=linux`, `1 of 65`.
- Clearing → `?platform=linux`, `65 of 65`.
- Two directions: removing `?q=` from `componentSearchUrl` fails 2 tests;
  dropping existing params in `withFilterQuery` fails 2 tests.
- `nub run --filter docs test`: 18 files, 97 tests. Gates and build pass.

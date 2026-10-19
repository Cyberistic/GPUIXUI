# 570 — The component index exposes the live surface

**Workstream:** docs-site · **Phase:** F (showcase quality) · **Depends on:**
410, 411, 412, 417, 419, 421, 431, 455, 495, 560, 563 · **Status:** done

`/docs/components` lists every delivered component with two badges — its
inventory status and its GPUix-support word — and a local text filter. It cannot
tell a reader which of the 66 pages they can actually interact with. The site
ships 44 component live scenes plus 3 composed scenes (plan 455 onward, counted
in `preview/scenes.ts`); a reader only discovers them by opening pages one at a
time, or by finding the Showcase page.

Measured on 2026-10-19 at `dd8c5f3f`:

| Surface | What it says today |
| ------- | ------------------ |
| `/docs/components` card | `done` / `yes` — nothing about the live surface |
| `/docs/components?q=live` | mixed results: some live pages, and records whose *limitation* says "No live scene ships" |
| `/docs/showcase` | one composed screen, not an index of the 44 component scenes |
| `/api/search` | a component name reaches its page, but no facet groups live pages |

The registry already owns the fact: a record's `liveScene` is non-null exactly
when `<NativePreview>` renders a tier-L surface. The index must read that field,
not a hand-written list.

## 1. The rule

1. **A live record is marked.** Every non-planned card whose `liveScene` is
   non-null renders one `data-preview="live"` badge whose title says the page
   carries a live GPUix surface. The badge is derived from the record, so a new
   scene marks its card with no docs edit.
2. **The index can be filtered by that fact.** A two-option radio-style control
   — `All components (66)` and `Live surface (44)` — applies a `live` facet. The
   counts are derived from `components` and `liveScene`; no digit is authored.
   The facet is a filter, not a sort: the tier/group order is unchanged.
3. **The facet is shareable.** It lives in the URL as `?preview=live`, beside
   `q` and `platform`. `?preview=all` is absent from the URL. An unknown value
   is `all`, never an error. `withFilterQuery` and `withPreviewFilter` preserve
   each other's parameters, so a search deep link and a platform choice survive
   the facet.
4. **The controls compose.** A text query and the live facet intersect. The
   live count and the "N of 66 components" line both reflect the intersection;
   **Clear filter** resets both the query and the facet so a reader cannot be
   stranded on an empty page.
5. **The reader is told what the badge means.** The page names the badge, the
   filter and the honest tier: a live surface is the published WebAssembly
   renderer, not the desktop binary, and the native evidence stays below it
   (`docs/preview-strategy.md`).
6. **The rule is proved in a browser.** `smoke:search` clicks `Live surface`,
   asserts the count and the URL, then returns to `All components`; a unit test
   alone cannot prove the hydrated control is wired.

## 2. Files

| Path | Change |
| ---- | ------ |
| `apps/docs/src/components/component-index.tsx` | `PreviewFilter`, `isLiveComponent`, `filterByPreview`, `previewQueryFromSearch`, `withPreviewFilter`; chip controls; card badge; mount effect reads both params |
| `apps/docs/src/components/component-index.test.tsx` | new cases for the badge, the counts, the facet, the URL round-trip and the intersection with `q` |
| `apps/docs/scripts/smoke-search.ts` | click the live facet in `checkIndexFilter`; assert count, URL and return to all |
| `apps/docs/content/docs/components/index.mdx` | one paragraph naming the badge/filter and the tier-L label rule |
| `.agents/slop/plans/README.md` | this row |
| `TODO.md` | tick the docs-site task |
| `PLAN.md` | decision `D48` |

## 3. Implementation

### 3.1 Pure helpers in `component-index.tsx`

```ts
export type PreviewFilter = "all" | "live";

export const isLiveComponent = (component: ComponentMetaInput): boolean =>
  component.liveScene !== null;

export const filterByPreview = (
  groups: ReadonlyArray<ComponentGroup>,
  filter: PreviewFilter,
): ReadonlyArray<ComponentGroup> =>
  filter === "all"
    ? groups
    : groups.flatMap((group) => {
        const items = group.items.filter(isLiveComponent);
        return items.length === 0 ? [] : [{ ...group, items }];
      });

export const previewQueryFromSearch = (search: string): PreviewFilter =>
  new URLSearchParams(search).get("preview") === "live" ? "live" : "all";

export const withPreviewFilter = (
  search: string,
  filter: PreviewFilter,
): string => {
  const params = new URLSearchParams(search);
  if (filter === "all") params.delete("preview");
  else params.set("preview", "live");
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
};
```

`withFilterQuery` is unchanged: it already builds on `URLSearchParams`, so it
preserves `preview`. The reverse is true for the new helper.

### 3.2 The component

- `const [preview, setPreview] = useState<PreviewFilter>("all")` beside `query`.
- the mount effect sets both: `filterQueryFromSearch` and
  `previewQueryFromSearch` from `window.location.search`.
- `const filtered = filterByPreview(filterGroups(query), preview)`; the live
  count sums `filtered`.
- `liveCount = components.filter(isLiveComponent).length`.
- the control is a `role="group"` labelled `Preview` with two buttons carrying
  `data-preview-filter`, `aria-pressed`, and the derived labels.
- `updatePreview` calls `setPreview` and `history.replaceState` with
  `withPreviewFilter(currentSearch, next)`.
- the empty state's **Clear filter** keeps its exact text (the smoke finds it by
  text) and now calls both `updateQuery("")` and `updatePreview("all")`.
- the card badge sits with the status/support badges:

```tsx
{isLiveComponent(component) ? (
  <span
    data-preview="live"
    title="This page carries a live GPUix surface — the published WebAssembly renderer, not the desktop binary."
    className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground"
  >
    Live
  </span>
) : null}
```

The badge is rendered only for a live record; absence is the honest default, so
a "static" marker cannot imply a tier the page does not have.

### 3.3 The page prose

`components/index.mdx` gains one paragraph after the existing status paragraph:
the `Live` badge marks a page whose `<NativePreview>` renders a tier-L surface
(the real component code on GPUix's published WebAssembly renderer); the
`Live surface` control filters the index to those pages; the live surface is
not the desktop binary, so each page keeps its native evidence beneath it, per
`docs/preview-strategy.md`. No count is written in prose — the control derives
it.

### 3.4 Browser gate

In `checkIndexFilter`, after the typed `combobox` case:

1. clear the query and click `[data-preview-filter="live"]`;
2. wait for `#component-filter-count` to equal
   `` `${liveCount} of ${components.length} components` ``, for the URL to carry
   `preview=live`, and for every rendered card link to belong to a live record
   (collect hrefs and compare their slugs with the derived set);
3. click `[data-preview-filter="all"]`, wait for the full count and assert
   `preview=` is gone from `location.search`.

A failure names the facet step and the measured count, like the existing
`q=combobox` case.

### 3.5 Tests

`component-index.test.tsx`:

- the server markup renders exactly `liveCount` `data-preview="live"` badges and
  each live record's title is inside a linked card;
- the two controls render with the derived totals and `aria-pressed` state;
- `filterByPreview(groups, "live")` contains every live record once, no
  non-live record, and the same tier/group order;
- `previewQueryFromSearch("?preview=live")` is `live`; `?preview=all`, an
  unknown value and an absent value are `all`;
- `withPreviewFilter` preserves `q` and `platform`, adds/removes only
  `preview`, and returns `""` for an empty result;
- the intersection: `filterByPreview(filterGroups(<a non-live title>), "live")`
  is empty, while a live title survives.

## 4. Test plan — both directions

Run each mutation, observe the named failure, revert.

| Forced defect | Expected failure |
| ------------- | ---------------- |
| Delete the card's `data-preview` badge | the badge-count test fails on the live total |
| Make `filterByPreview` return its input | the non-live record survives the live facet |
| Drop `preview` from `withPreviewFilter` | the URL round-trip test (and the smoke) fails |
| Remove the mount read of `previewQueryFromSearch` | the smoke's `?preview=live` navigation test fails |
| Have **Clear filter** reset only `q` | the smoke's return-to-all step fails |

## 5. Commands

```sh
nub run --filter docs test             # all suites, including the new cases
nub run --filter docs check-types
nub run --filter docs smoke:search     # builds, serves and drives Chrome
nub run --filter docs smoke:build      # the production index still crawls
nub run check
nub run lint
```

Expected: the docs suite is green (613 + the new cases), `smoke:search` exits
`0` with the facet step, `smoke:build` crawls 96 pages, and `check`/`lint` are
clean.

## 6. STOP conditions

- `smoke:search` exits `2` because Chrome or the preview server is unavailable:
  report it and do not claim the browser path passed.
- the card markup needs a new registry field: stop — `liveScene` already
  carries the fact.
- a count in prose would be needed: stop — the control derives it.
- a planned record has no page: the badge and the filter apply to delivered
  records only; planned records stay unlinked and unmarked.

## 7. Acceptance

- `/docs/components` marks every live record and no other.
- `?preview=live` shows exactly the live records, shareable and combined with
  `q`; `All components` returns the full index and removes the parameter.
- The counts are derived from the registry; no digit is authored.
- `smoke:search` operates the facet in a real browser and exits `0`.
- The page explains the badge and keeps the tier-L honesty rule.

## 8. Results (2026-10-19)

- The registry ships 66 delivered records; 44 declare a `liveScene`, so the
  control reads `All components (66)` / `Live surface (44)`.
- `nub run --filter docs test`: 86 files / **621 tests** (8 new), green.
- `nub run check`: green (check:tests, lint, fmt, types).
- `nub run --filter docs smoke:search`: exit `0`, including the deep link,
  `All components`, `Live surface` and the combined `q` + facet clear.
- `nub run --filter docs smoke:build`: green, 96 pages.
- `nub run --filter docs smoke:a11y`: green, every page in both schemes (the
  new buttons are reachable and named).

Forced defects, each measured and reverted:

| Defect | Observed failure |
| ------ | ---------------- |
| the card badge is removed | `marks every record with a live scene and no other` |
| `filterByPreview` returns its input | three facet tests, incl. the non-live card surviving |
| `withPreviewFilter` never writes `preview` | `writes the facet without losing the query or platform` |
| the mount effect does not read `previewQueryFromSearch` | `smoke:search`: `"?preview=live" left "66 of 66 components" and 66 card link(s)` |
| **Clear filter** resets only `q` | `smoke:search`: `clear left "44 of 66 components" and ?preview=live` |

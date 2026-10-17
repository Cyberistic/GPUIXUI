# 441 — The API reference is an index of real props types

**Phase:** F (docs polish) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 411, 414, 415, 425, 435

## 1. Why

`/docs/api-reference` is the IA entry for API metadata, and today it is a demo:
it explains the generator, shows a table for `CaptureProvenance` — a type owned
by the docs app, not by the library — and closes with a callout that says “Until
a component does [publish a props type], its page says the prop table is
unavailable”. All 49 delivered component pages publish a real props table, so
the page is both stale and not a reference: a reader cannot see which types
exist or jump to one.

The workstream owns **API metadata** (`MISSION.md`, docs scope). The tables
already exist and are guarded (`content-references.test.ts` proves every
`<auto-type-table>` resolves and generates props). What is missing is the
structured API surface the index needs:

- the registry does not record which props types a component publishes, so the
  page can only be hand-typed (and then drifts);
- no page lists the 49 tables;
- nothing enforces that a delivered page's API section is non-empty, so a page
  could drop its table and still pass every gate.

## 2. Current state (measured 2026-10-17, `5a0662b`)

- `apps/docs/src/component-meta/schema.ts` — `ComponentMeta` has `sourcePath`,
  `parts`, `runtime`, `limitations`; no API field.
- `apps/docs/src/component-meta/entries.ts` — 49 `delivered(...)` and 16
  `planned(...)` records.
- 49 component pages carry 55 `<auto-type-table>` tags (list and stack have two,
  toast has two). The names are the exported props types, e.g. `ButtonProps`.
- `content/docs/api-reference.mdx` is 42 lines and shows `CaptureProvenance`
  (a docs-app type) as its example; it carries the stale callout.
- `content-references.test.ts` already resolves each tag's `path` and proves the
  named type generates props. Nothing compares the page to the registry, and
  nothing requires a delivered page to have a table.

## 3. Registry — record the props types

`apps/docs/src/component-meta/schema.ts`, inside `ComponentMeta`:

```ts
    /**
     * The exported props types the page's API section generates tables from,
     * in page order. The page owns the table; the registry owns the index
     * (`/docs/api-reference`) and `content-references.test.ts` keeps them equal.
     */
    api: Schema.Array(Schema.NonEmptyString),
```

`apps/docs/src/component-meta/entries.ts`:

- `planned(...)` supplies `api: []`.
- `DeliveredOptions` gains a **required** `api: readonly string[]`, so the
  compiler forces every delivered record to declare its types; `delivered(...)`
  passes it through.
- Fill the 49 records from the pages (one line each), exactly:

| slug | `api` |
| ---- | ----- |
| accordion · alert · avatar · badge · box · breadcrumb · button-group · button · card · checkbox · collapsible · combobox · command-menu · confirm-dialog · context-menu · date-picker · dialog · dropdown-menu · empty-state · icon · inline-validation · label · meter · number-field · otp-field · pagination · popover · progress · radio-group · range-slider · rating · scroll-area · search-input · select · separator · skeleton · slider · spacer · spinner · switch · tabs · text-area · text-input · text · toggle · tooltip | the single `XProps` name its page generates |
| `list` | `["ListProps", "ListItemProps"]` |
| `stack` | `["StackProps", "GridProps"]` |
| `toast` | `["ToastProviderProps", "ToastViewportProps"]` |

`apps/docs/src/component-meta/contract.ts` — add the pure rule:

```ts
/** Props types the page generates but the record does not declare, and vice versa. */
export const apiDrift = (
  record: Pick<ComponentMetaInput, "slug" | "api">,
  pageTypes: readonly string[],
): readonly string[] => ...
```

Sorted-set comparison (page order is not a contract; the set is). One message
per direction: `<slug>: page generates X but the registry does not declare it`,
`<slug>: registry declares X but the page does not generate it`.

## 4. `/docs/api-reference` — the index

New `apps/docs/src/components/api-index.tsx` (server component, no state):

- Iterates `groups` from the registry; drops groups whose records have no `api`.
- Per group: an `<h3>` from `tierGroupTitle(tier, group)` and a `<ul>` of rows.
- Each row: the component title linked to
  `/docs/components/<slug>#api-reference` (`fumadocs-core/link`), and its type
  names in `font-mono` text. `data-api-slug` on the `<li>` for the test.
- Planned records have `api: []`, so they are never listed or linked.
- Classes follow `component-index.tsx` (`not-prose`, `border-fd-border`,
  `text-fd-muted-foreground`, `hover:bg-fd-accent`); no colour literal.

Rewritten `apps/docs/content/docs/api-reference.mdx` (short, no demo type):

1. Two sentences: every documented component has a table generated from its
   real types; `@internal` hides a prop and tsdoc becomes the description.
2. `<ApiIndex />`
3. `## How the tables are generated` — the app's generator file and
   `source.config.ts`, both through `<include>` of the real files (the existing
   include stays; its `<auto-type-table>` demo and the stale `<Callout>` go).

Register `ApiIndex` in `apps/docs/src/components/mdx.tsx`.

## 5. Tests

### 5.1 `apps/docs/src/content-references.test.ts` (extend)

Add one test after “generates a table with props from every auto-type-table”:

```ts
it("declares in the registry exactly the props types a page generates", () => { ... });
```

For every `component` from the registry, collect `typeTables` whose `page` is
`components/<slug>.mdx`, map to `name`, and assert
`apiDrift(component, names)` is empty for every record.

### 5.2 `apps/docs/src/components/api-index.test.tsx` (new)

Render `renderToStaticMarkup(<ApiIndex />)` and assert:

1. one `data-api-slug` per delivered record with a non-empty `api`, and none for
   a record with `api: []`;
2. every listed row links to
   `href="/docs/components/<slug>#api-reference"`;
3. every type name appears on the page (so the index is not just links);
4. no planned record's slug is linked.

### 5.3 `apps/docs/src/api-reference-page.test.ts` (new, small)

Read `content/docs/api-reference.mdx` and assert it contains `<ApiIndex />`,
contains no `<auto-type-table` (a demo table is exactly the regression this
guards), and carries the `## How the tables are generated` section that includes
`source.config.ts`. Headings/title/description stay covered by
`component-pages.test.ts` and `content.test.ts`.

### 5.4 Two-direction proofs (run and record in §8)

1. Delete `"ButtonProps"` from the `button` record → the new registry test fails
   with `button: page generates ButtonProps but the registry does not declare it`.
2. Add `"GhostProps"` to `badge` → fails with
   `badge: registry declares GhostProps but the page does not generate it`.
3. Set one delivered record's `api` to `[]` (measured on `tooltip`) → the drift
   test fails (`tooltip: page generates TooltipProps…`) **and**
   `api-index.test.tsx` fails with 48 rows against 49 delivered components;
   revert.
4. Re-add `<auto-type-table … CaptureProvenance …>` to the API reference page →
   `api-reference-page.test.ts` fails; revert.

## 6. Docs to update

- `apps/docs/README.md` — one paragraph under “Adding a component page”: the
  record's `api` names are the props types the page generates, and
  `/docs/api-reference` is generated from them.
- `.agents/slop/plans/README.md` — add the `441` row.
- `TODO.md` — add and tick the task under the docs-site workstream; raise the
  block header to `410–441` and keep the progress bar honest (plan 427 is still
  in progress).

## 7. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 0; 33 files + 2 new, ≥190 tests |
| `nub run --filter docs check-types` | 0 |
| `nub run --filter docs build` | 0; `/docs/api-reference` in the output |
| `nub run --filter docs smoke:build` | exit 0; 66 pages, `/docs/api-reference` renders the index |
| `nub run check` | 0 |
| `nub run lint` | 0 |
| `nub run test` | 0 |

## 8. STOP conditions

- A page's `<auto-type-table>` names cannot be expressed in the record (e.g. a
  name is generated with options no other page uses): stop and record why; do
  not drop the guard.
- The generator returns an empty table for a name that exists in the page: stop
  — that is a real defect in the page, not a registry problem.
- Any page would need its generated table changed to satisfy the index: stop.
  The index follows the pages; the pages are the API truth.

## 9. Acceptance

- Every delivered record declares its props types; the compiler required it.
- `/docs/api-reference` lists every delivered component, its types and a link to
  the real table, with no hand-typed rows and no demo type.
- The guard fails when a page or a record gains or loses a type in only one
  place, and when the API reference page stops using the generated index.
- All gates in §7 pass; the change is committed and pushed on
  `agent/docs-site`.

## 10. Progress (2026-10-17, `5a0662b`)

- **Implemented.** `ComponentMeta.api` records the props types; all 49 delivered
  records declare them (55 types: `list`, `stack` and `toast` have two).
  `DeliveredOptions.api` is required, so the compiler, not a test, is the first
  guard. `apiDrift` in `contract.ts` compares the record's set with the page's
  `<auto-type-table>` names in `content-references.test.ts`.
- **`/docs/api-reference`** is now `<ApiIndex />` plus two includes of the real
  generator and MDX config; the `CaptureProvenance` demo and the stale
  "until a component publishes props" callout are gone.
- **Tests:** 35 files / 198 tests pass (`nub run --filter docs test`), including
  the new `api-index.test.tsx` (4) and `api-reference-page.test.ts` (3).
- **Two directions, all measured:**
  1. `button`'s `api` emptied → `content-references.test.ts` failed with
     `components/button.mdx: button: page generates ButtonProps but the registry
     does not declare it`.
  2. `GhostProps` added to `badge` → failed with
     `components/badge.mdx: badge: registry declares GhostProps but the page does
     not generate it`.
  3. `tooltip`'s `api` emptied → the index test failed with 48 rows against 49
     delivered components, and the drift test failed with
     `tooltip: page generates TooltipProps but the registry does not declare it`.
  4. `<auto-type-table path=…CaptureProvenance>` re-added to the page →
     `api-reference-page.test.ts` failed.
  Every edit was reverted; the suite is green.

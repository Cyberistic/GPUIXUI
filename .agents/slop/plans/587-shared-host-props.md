# 587 — The shared host props have one documented home

**Phase:** F (API metadata and search completeness)
**Workstream:** docs-site
**Depends on:** 410 (docs site), 411/415 (API metadata), 419/431 (search),
490/500/504/569 (generated search documents), 479 (shared prop rows dropped from
search), 565 (the installed `HostProps` parser)
**Status:** implemented

## 1. The measured defect

Every part in the library extends `Props` from `@gpuix/react`, which is the
runtime's `HostProps` plus React's `key`, `children` and `ref`. The component
pages render one generated props table per part, so `testId`, `onKeyDown`,
`onMouseDownOutside`, `style`, `highlight` and `motion` are *visible* — about
thirty rows, repeated on every part of every compound.

They are explained nowhere, and they are not searchable:

- `search.ts` drops generated type-table rows (`withoutTypeTableRows`, plan 479)
  because their shared prop names match almost any accessibility query. The
  filter is right; the missing piece is a prose/table home outside the type
  tables.
- `aria-*`, `role`, `tabIndex` and `autoFocus` already have that home on
  `/docs/accessibility` (plan 565). The remaining host props have none.

Measured on 2026-10-19 against the production build (`/api/search?query=…`,
first result):

| Query | Before | The page that should own it |
| ----- | ------ | --------------------------- |
| `testId` | Meter (page) | Component API → Shared host props |
| `onKeyDown` | Cards (page) | Component API → Shared host props |
| `onMouseDownOutside` | Cards (page) | Component API → Shared host props |
| `tabindex` | Badge keyboard prose | Accessibility (already owns it) |
| `autofocus` | Number field limitations | Accessibility (already owns it) |
| `host props` | Box limitations prose | Component API → Shared host props |
| `shared props` | API reference prose | Component API → Shared host props |

`MISSION.md` requires API/prop docs on every component page and a useful API
reference. A reader who meets `testId` in a table of thirty inherited rows has
no page that says what it is, and ⌘K cannot find it. Repeating a definition on
66 pages would be the wrong fix; the base contract is one thing and belongs in
one section.

## 2. What to build

### 2.1 `apps/docs/src/lib/accessibility.ts` — export the body parser

`hostPropsBody` is already the fence-safe extractor for `interface HostProps`.
Export it unchanged (add a JSDoc line) so the new module reads the same
declaration body instead of growing a second parser.

### 2.2 `apps/docs/src/lib/host-props.ts` (new)

One authored table for the **shared host props that the accessibility page does
not own**, derived names and a both-direction guard.

```ts
import {
  hostPropsBody,
  supportedAria,
  supportedHostProps,
} from "./accessibility";

/** One shared prop a component part inherits, with the reader-facing meaning. */
export interface HostProp {
  readonly name: string;
  readonly summary: string;
}

/**
 * The props `/docs/accessibility` owns; the shared table links there instead of
 * repeating the meaning (plan 565). `HostProps` is the single source of names.
 */
export const accessibilityHostProps: ReadonlySet<string> = new Set([
  ...supportedAria.map((row) => row.attribute),
  ...supportedHostProps.map((row) => row.attribute),
]);

/** Names every HostProps body declares, quoted `aria-*` keys included. */
export const hostPropNames = (declarations: string): ReadonlyArray<string>;

/** The shared rows: declaration order, no accessibility-owned names. */
export const sharedHostProps: ReadonlyArray<HostProp>;
```

`sharedHostProps` covers (in `HostProps` declaration order):

| Name | Meaning to author |
| ---- | ----------------- |
| `style` | Host styles; components merge the caller's style after their own, and a function form receives the part's state (link State-aware styles). |
| `onClick` | Primary click only; use `onAuxClick` for the others. |
| `onAuxClick` | Non-primary click; `isRightClick` says which. |
| `onMouseDown` / `onMouseUp` | Pointer button pressed / released. |
| `onMouseEnter` / `onMouseLeave` | Pointer entered / left the element. |
| `onMouseMove` | Pointer moved over the element. |
| `onMouseDownOutside` | A press outside the element — the click-outside dismissal path. |
| `onKeyDown` / `onKeyUp` | Key pressed / released while focused. |
| `onFocus` / `onBlur` | Native focus entered / left; `autoFocus` dispatches no focus event. |
| `onScroll` | The host scrolled; `deltaY` is negative downwards on 0.10.0. |
| `onFileDrop` | A file was dropped on the host. |
| `onChange` | The control's value changed. |
| `onSubmit` | Enter on an input, or in a textarea when this listener is set. |
| `onToggleFile` | A file row's open state toggled. |
| `onShowMore` | The host asked for more content. |
| `onLineClick` | A line was clicked in a code or diff host. |
| `onLinkClick` | A link inside rich content was activated. |
| `onVisibleRange` | The virtual list's painted window changed; it lags the gesture by one. |
| `onHighlight` | The match count for `highlight` changed. |
| `highlight` | Paints a wash behind text ranges; the nearest declaration wins. |
| `onMotionComplete` | A native motion track reached its current target. |
| `motion` | Internal native animation description; components own it. |
| `testId` | Stable locator for the native suites and automation; every part forwards it. |

`hostPropsBody`/`hostPropNames` must **not** be a second source of names. The
guard is:

```ts
export const hostPropViolations = (input: {
  readonly declarations: string;
  readonly shared: ReadonlyArray<HostProp>;
  readonly owned: ReadonlySet<string>;
}): ReadonlyArray<string>;
```

It reports, in both directions:

- a shared name the installed `HostProps` does not declare;
- an installed name that is neither shared nor accessibility-owned;
- a shared name the accessibility page already owns;
- a duplicate shared row;
- a shared row with an empty summary;
- an installed `HostProps` with no names at all (parser broke).

### 2.3 `apps/docs/src/components/host-props-table.tsx` (new)

Mirror `<AriaSupportTable />`'s honest, scrollable table and `data-` contract.
No row is authored in the component; it draws `sharedHostProps`.
A grouped layout is unnecessary — declaration order plus a one-sentence intro
is enough, and fewer LOC wins.

### 2.4 `apps/docs/content/docs/component-api.mdx`

- Add `## Shared host props` after `## State-aware styles`, with one paragraph:
  every part inherits the runtime host props; the per-component tables repeat
  them; this section explains them once; `aria-*`, `role`, `tabIndex` and
  `autoFocus` are on Accessibility.
- Render `<HostPropsTable />`.
- Mention `testId` as the automation locator and `style` as the merge contract.
- Update the frontmatter description to name "shared host props" (the page is a
  hand-authored page, so its summary is a search identity — plan 568/574).
- Register `HostPropsTable` in `src/components/mdx.tsx`.

### 2.5 `apps/docs/src/lib/host-props-search.ts` (new)

One `GeneratedSearchEntry` (D32), like `accessibility-search.ts`:

- `title: "Component API"`, `url: "/docs/component-api#shared-host-props"`;
- `content`: every shared row as `` `${name}: ${summary}` ``;
- `names`: every shared prop for which `isDistinctiveName` is true
  (`testId`, `onClick`, `onKeyDown`, `onMouseDownOutside`, …). Plain words
  (`style`, `highlight`, `motion`) are indexed but never promoted, so Theming
  keeps `style` and the component pages keep `highlight`.
- Add the entry to `generatedEntries` in `src/lib/search.ts`.

### 2.6 `apps/docs/scripts/smoke-build.ts`

Add one production search check:

```ts
{ query: "testId", expected: "/docs/component-api", first: true,
  what: "a shared host prop from the generated host-prop index" },
```

and one for the section itself:

```ts
{ query: "shared host props", expected: "/docs/component-api", first: true,
  what: "the section's own heading" },
```

If the second cannot be made first without stealing a real page, keep it as
`first: false` and record why — the acceptance is that it resolves, not that it
outranks a subject page.

## 3. Files touched

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/accessibility.ts` | export `hostPropsBody` |
| `apps/docs/src/lib/host-props.ts` | new table, parser, both-direction guard |
| `apps/docs/src/lib/host-props.test.ts` | parser and guard fixtures + installed declarations |
| `apps/docs/src/lib/host-props-search.ts` | new generated search entry |
| `apps/docs/src/lib/host-props-search.test.ts` | promotion and integration cases |
| `apps/docs/src/components/host-props-table.tsx` | table renderer |
| `apps/docs/src/components/host-props-table.test.tsx` | one row per shared prop, page mount |
| `apps/docs/src/components/mdx.tsx` | register the block |
| `apps/docs/src/component-api-page.test.ts` | section order and description |
| `apps/docs/content/docs/component-api.mdx` | the section and its prose |
| `apps/docs/src/lib/search.ts` | add the entry |
| `apps/docs/scripts/smoke-build.ts` | two production queries |
| `.agents/slop/plans/README.md`, `TODO.md`, `PLAN.md` | index and result |

## 4. Commands and expected results

```sh
# 1. The new tests fail before the module/page exist (the regression proof).
nub run --filter docs test -- src/lib/host-props.test.ts \
  src/lib/host-props-search.test.ts src/components/host-props-table.test.tsx
# Expected before implementation: the modules do not resolve, so the run fails.

# 2. After implementation.
nub run --filter docs test
# Expected: every file passes; the suite grows by the new tests.

# 3. Types (the MDX component map and the generated entry are typed).
nub run --filter docs check-types

# 4. The production index really answers the queries.
nub run --filter docs smoke:build
# Expected: exit 0; the two new checks pass; the page count and anchors are
# unchanged except the one new heading.
```

Measured before/after (fill in §6):

```sh
nub apps/docs/scripts/smoke-build.ts --no-build   # after a build
```

## 5. Test plan (each test must be able to fail)

| Test | What it catches | Forced defect to prove it |
| ---- | --------------- | ------------------------- |
| `hostPropNames` fixture | quoted `aria-*` and plain keys parse; comments and nested names do not | break the regex to `[A-Za-z]+` → the quoted fixture fails |
| guard: installed but unclassified | a dependency upgrade adds a host prop and the docs silently ignore it | add `"aria-hidden"?: boolean` to the fixture body → fails by name |
| guard: shared but not installed | a removed runtime prop stays documented | add `{ name: "onLongPress" }` → fails by name |
| guard: accessibility owner repeated | two pages claim the same prop | add `{ name: "role" }` → fails by name |
| guard: empty summary / duplicate | a row is added without an explanation or twice | blank a summary, repeat a name → fails |
| installed declarations | the real `@gpuix/native` package still has exactly the covered set | run it; it is the production proof |
| table renderer | one `data-prop` row per shared row and the page mounts it | delete `<HostPropsTable />` from the page → the mount test fails |
| search entry names | every promoted name is a shared prop and `style`/`highlight`/`motion` are not promoted | promote `style` → the plain-word test fails |
| `search("testId")` | the exact camelCase name reaches the section first | drop the entry from `generatedEntries` → returns a component page |
| `search("on key down")` | the phrase form reaches it through the multiword rule | drop the name from promotion → falls back to prose |
| `search("tabindex")` | Accessibility keeps the accessibility-owned names | add `tabIndex` to `sharedHostProps` → the owner guard fails |
| page guard | the section, the block and the description cannot disappear | delete the section → `component-api-page.test.ts` fails |
| `smoke:build` | the production index, not only the fixture, answers | remove the entry → the crawl fails by query |

## 6. Measured runs (2026-10-19)

Production index (`/api/search?query=…`, first result), before → after:

| Query | Before | After |
| ----- | ------ | ----- |
| `testId` | Meter | `/docs/component-api#shared-host-props` |
| `on key down` | Cards | `/docs/component-api#shared-host-props` |
| `onMouseDownOutside` | Cards | `/docs/component-api#shared-host-props` |
| `host props` | Box limitations prose | `/docs/component-api` |
| `shared host props` | API reference prose | `/docs/component-api` |
| `style` | Theming | Theming (unchanged — not promoted) |
| `aria-label` | Accessibility | Accessibility (unchanged — not promoted) |
| `highlight` / `motion` | mention-input prose / Cards | unchanged (plain words, not promoted) |
| `tabindex` / `autofocus` | component prose | unchanged (the accessibility entry keeps its no-promotion rule) |

Test failures before the implementation (new tests run against the plan-586
code):

1. `src/lib/host-props.test.ts` and `src/lib/host-props-search.test.ts` did not
   load — the modules did not exist.
2. `src/components/host-props-table.test.tsx` did not load — the component did
   not exist.
3. `component-api-page.test.ts` expected the new section, so its ordered list
   failed.

Forced defects, each applied alone, run, and reverted:

1. Removed `hostPropsSearchEntry` from `generatedEntries` → **1 test failed**
   (`is the first result for a shared prop`), proving the production entry is
   load-bearing.
2. Deleted `## Shared host props` and the block from `component-api.mdx` →
   **3 tests failed** (the section order, the block assertion and the page
   mount).
3. Removed the `isDistinctiveName` filter → **1 test failed**
   (`leaves plain words and accessibility-owned props out of the promotion`),
   proving `style`/`aria-*` cannot silently steal their pages.

The guard fixtures prove the other directions: a prop added to the installed
`HostProps` without a row, a documented prop the package removed, a duplicate
row, a blank summary, and an accessibility-owned name documented twice all fail
by name.

Final: `nub run --filter docs test` — **104 files / 748 tests**;
`check-types` green; `smoke:build` **98 pages / 1 281 anchors**, exit `0`, the
two new production queries pass; `smoke:a11y --only /docs/component-api` **0
violations in both schemes**; `nub run check`, `nub run lint` and `nub run test`
green at the repo root (docs 104/748, total suite green).

## 7. STOP conditions

- `@gpuix/native`'s `HostProps` cannot be resolved from the docs app's
  declarations (the accessibility test already depends on it): stop and report
  the resolution path rather than hard-coding the prop list.
- The shared table needs a prop whose meaning cannot be stated from the runtime
  declarations or the source comment: stop and report the prop; do not invent
  behaviour.
- A gate fails outside `apps/docs` (repo `check`/`lint`/`test` or the deploy):
  record the failure and stop; do not weaken a docs guard.
- Promoting a shared name steals a page that owns it (`style` → Theming,
  `aria-*` → Accessibility): remove the promotion and keep the row; the index
  still answers by prose.

## 8. Acceptance

- `/docs/component-api#shared-host-props` renders one row per non-accessibility
  `HostProps` name, derived from the installed declarations.
- The page's section order guard names the new section; `mdx-components.test.ts`
  sees the block registered.
- `testId`, `onKeyDown` and `onMouseDownOutside` reach the section first;
  `style` keeps Theming and `aria-*` keep Accessibility.
- The both-direction guard fails on a renamed, removed or added host prop.
- `nub run --filter docs test`, `check-types`, `nub run check`, `nub run lint`,
  `nub run test` and `smoke:build` are green; the plan index, `TODO.md` and
  `PLAN.md` describe the result.

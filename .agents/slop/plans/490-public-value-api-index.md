# 490 — The public value API index

**Phase:** F (documentation completeness)
**Status:** planned
**Owner:** `docs-site`
**Depends on:** 410 (site), 415 (type tables), 416 (tokens), 441 (api-reference
index), 447 (tokens API), 487 (page template), 488 (extending)
**Paths this plan may write:** `apps/docs/**`, `TODO.md`,
`.agents/slop/plans/README.md`, this file
**Paths it must not write:** `packages/**` (other workstreams own them)

---

## 1. The bug this closes

`TODO.md` records it:

> The public value exports still have no generated API index. The component
> pages document props, and `/docs/extending` shows the `core/` surface as
> source; the helpers a consumer can import (`checkboxState`, `numberRange`,
> `otpCellLabel`, `initialActiveIndex`, `sliderValueText`, `iconPixels`,
> `ICON_SIZES`, `useToast`, …) and the `*Meta` inventory records are not
> indexed, so their only documentation is the source. Needs an explicit
> public/internal classification plus a guard that a new export is not silently
> undocumented.

Measured 2026-10-18 from the real entry points:

| Package | Runtime exports from its public entry | Value exports | Documented today |
| --- | --- | --- | --- |
| `@gpuixui/tokens` | 36 | 36 | partly, on `/docs/tokens-api` and `/docs/theming` |
| `@gpuixui/primitives` | 134 | 106 | `/docs/extending` names the modules and includes `core/index.ts`, not each helper |
| `@gpuixui/components` | 184 | 43 | 39 `*Meta` records and 2 hooks have no page |
| `@gpuixui/icons` | 5 | 4 | partly, in prose on `/docs/components/icons` |

The failure mode is silent: adding `export const sliderRange` to a package entry
documents nothing, and no test notices.

## 2. Decision

One **generated** page, `/docs/api-values`, lists every runtime value export of
the documented packages. It is derived from the packages' real entry points —
not hand-maintained — so it cannot drift, and it cannot grow a row that does not
exist.

The classification is explicit and lives in the docs app:

- **Indexed** — every package entry in `ENTRIES`.
- **Excluded** — `EXCLUDED_ENTRIES`, each with a written reason.
- **Internal** — `INTERNAL_EXPORTS`, each with a written reason; rendered in its
  own group and never presented as a compatibility promise.
- **Not a value** — a PascalCase component (documented on its component page) or
  a type (documented by the generated prop/type tables). Both are skipped by
  kind, never silently.

Dependency shape: `apps/docs` may not import the GPUix runtime or the Effect
runtime outside tests (`src/architecture.test.ts`). `node:fs` and `effect/*` are
therefore confined to a **test/script-only** module; the page imports a
generated data module whose only reference to it is `import type`.

## 3. Files

| File | New? | Purpose |
| --- | --- | --- |
| `apps/docs/src/lib/api-values.ts` | new | Policy (`ENTRIES`, `EXCLUDED_ENTRIES`, `INTERNAL_EXPORTS`), the source reader, `deriveValueExports`, `renderGeneratedModule`, `indexProblems`. Imports `node:fs`, `node:path`, `effect/Array`, `effect/Order`; **never imported by the browser bundle**. |
| `apps/docs/src/lib/api-values.generated.ts` | new (generated) | `export const valueExports: readonly ValueExport[]`; committed; the page imports it. |
| `apps/docs/src/components/value-index.tsx` | new | Renders grouped rows: package, kind, name, summary, source path. |
| `apps/docs/src/api-values.test.ts` | new | The guard: current generated file, no undocumented export, valid policy, honest page. |
| `apps/docs/src/components/value-index.test.tsx` | new | The render guard: every row rendered once, every package present, MDX registration. |
| `apps/docs/scripts/api-values.ts` | new | Writes the generated module and prints the count. |
| `apps/docs/content/docs/api-values.mdx` | new | The page. |
| `apps/docs/content/docs/meta.json` | edit | `"api-values"` after `"api-reference"`. |
| `apps/docs/src/components/mdx.tsx` | edit | Register `ValueIndex`. |
| `apps/docs/content/docs/api-reference.mdx` | edit | Link the values index beside the props index. |
| `apps/docs/content/docs/extending.mdx` | edit | Link every core helper to its generated row. |
| `apps/docs/content/docs/tokens-api.mdx` | edit | Link the generated export list; keep the editorial tables. |
| `apps/docs/content/docs/contributing.mdx` | edit | Name the regeneration command and what the guard proves. |
| `apps/docs/package.json` | edit | `"api:values": "nub scripts/api-values.ts"`. |
| `.agents/slop/plans/README.md` | edit | Index this plan. |
| `TODO.md` | edit | Tick the task, correct the workstream bar. |

## 4. `src/lib/api-values.ts` — exact contract

```ts
export type ValueKind =
  | "function" | "hook" | "class" | "constant" | "record" | "namespace";

export interface ValueExport {
  readonly name: string;
  readonly package: string;   // "@gpuixui/primitives"
  readonly kind: ValueKind;
  readonly summary: string;   // first sentence of the declaration's TSDoc
  readonly source: string;    // repo-relative, e.g. "packages/…/keyboard.ts"
}

interface PackageEntry {
  readonly package: string;
  readonly entry: string;     // repo-relative
}

export const ENTRIES: readonly PackageEntry[] = [
  { package: "@gpuixui/tokens",         entry: "packages/tokens/src/index.ts" },
  { package: "@gpuixui/tokens/react",   entry: "packages/tokens/src/react.ts" },
  { package: "@gpuixui/primitives",      entry: "packages/primitives/src/index.ts" },
  { package: "@gpuixui/components",      entry: "packages/components/src/index.ts" },
  { package: "@gpuixui/icons",           entry: "packages/icons/src/index.ts" },
];

export const EXCLUDED_ENTRIES: readonly { package: string; reason: string }[] = [
  {
    package: "@gpuixui/primitives/core",
    reason: "the same objects the package root already exports as its decision layer",
  },
  {
    package: "@gpuixui/testing",
    reason: "the native smoke harness, built to dist and not a dependency of the docs site",
  },
];

export const INTERNAL_EXPORTS: Readonly<Record<string, string>> = {
  "@gpuixui/components#useFieldsetDisabled":
    "a Fieldset-internal reader so FieldsetLegend can share disabled state; Fieldset is the consumer surface",
};
```

### 4.1 Reader rules (implement exactly; each has a fixture test in §7)

`deriveValueExports({ root, entries = ENTRIES })` returns
`ReadonlyArray<ValueExport>`, deduplicated by `package + name`.

1. Read the entry file. Walk it once, in source order, and collect:
   - `export const NAME`, `export function NAME`, `export class NAME` — a
     declaration.
   - `export * as NAME from "spec"` — a `namespace` export.
   - `export { A, B as C } from "spec"` — resolve `spec` to a source file and
     find the declaration of `A`/`B` there; the export's `name` is `C`, its
     `kind`/`summary` come from the origin. `export type { … }` and
     `type A` members are skipped.
   - `export { A, B };` without `from` — same file.
   - `export * from "spec"` — recurse into `spec`, guarded by a visited set.
   - `export type …`, `export interface …` — skipped: a type is documented by
     the prop/type tables.
2. Resolve a relative specifier by appending `.tsx`, `.ts`, then trying
   `index.tsx` / `index.ts`, after stripping a trailing `.js`. Resolve a bare
   `@gpuixui/…` specifier through the `ENTRIES` map (so `alpha` re-exported from
   `@gpuixui/tokens` keeps its real summary and source path).
3. Kind, first match wins:
   - `/^use[A-Z]/` → `hook`
   - `/Meta$/` → `record`
   - `/^[A-Z][A-Z0-9_]+$/` → `constant` (`ICON_SIZES`, `ENTER_KEY`)
   - declaration keyword `class` → `class`
   - `/^[A-Z]/` and the initializer contains `(` or `=>` → **component**
     (excluded from the value index; its page is the component page)
   - `function` keyword, or a `const` initializer starting with `(`, `async (`
     or `((`/`(` after `=` → `function`
   - otherwise → `constant`
4. Summary: the nearest `/** … */` immediately above the declaration in its
   **origin** file. Strip the leading ` * `, drop lines starting with `@`,
   join with a single space, remove backticks, take the first sentence
   (up to and including the first `.`, `!` or `?`). Empty means the export is
   undocumented and is a problem (§4.2) — never omit it silently.
5. `source` is the origin file's repo-relative path.
6. Sort by entry order, then by kind in this order:
   `function, hook, class, constant, record, namespace`, then `name` ascending.
   Use `Arr.sort(values, Order.mapInput(Order.String, …))` from `effect` — this
   file is test/script-only, which is why the docs app's Effect ban does not
   apply. (`registry.ts` is the precedent for boundary code choosing native
   helpers; this module need not.)
7. Dedupe by `package + "#" + name`; the first occurrence wins. A duplicate in
   the same package is a problem (§4.2), so dedupe must not hide it: derive
   without dedupe and let the problem check report it.

### 4.2 `indexProblems`

```ts
export interface IndexInput {
  readonly root: string;
  readonly values: ReadonlyArray<ValueExport>;   // derived
  readonly generated: ReadonlyArray<ValueExport>; // committed module
}

export const indexProblems = (input: IndexInput): ReadonlyArray<string> => …
```

It returns every message, sorted, and each message names the export and file:

- **duplicate** — two rows with the same package and name.
- **undocumented** — `summary === ""`: `"<name> (<source>) has no doc comment"`.
  This is the "a new export is not silently undocumented" rule.
- **stale** — `generated` differs from `values` (compare with `toEqual`
  semantics): `"the generated index is stale; run nub run --filter docs api:values"`.
  Add one message naming the added and removed names when the sets differ.
- **missing source** — a row's `source` does not exist, or does not contain
  `export … <name>` / the aliasing statement.
- **stale policy** — an `INTERNAL_EXPORTS` key or `EXCLUDED_ENTRIES` package
  that names nothing real.
- **unclassified package** — every directory in `packages/*` with a
  `package.json` and a `src/index.ts` must appear in `ENTRIES` or
  `EXCLUDED_ENTRIES`. This is the explicit classification that scales to a new
  package.

### 4.3 `renderGeneratedModule(values)`

Returns the committed file's exact text:

```ts
// Generated by `nub run --filter docs api:values` from the packages' real
// entry points (plan 490). Do not edit: `src/api-values.test.ts` fails when
// this file is stale.
import type { ValueExport } from "./api-values.js";

export const valueExports: readonly ValueExport[] = [
  { name: "…", package: "…", kind: "…", summary: "…", source: "…" },
];
```

`JSON.stringify` per string, two-space indentation, one row per export.

## 5. `scripts/api-values.ts`

```ts
#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deriveValueExports, indexProblems, renderGeneratedModule } from "../src/lib/api-values.js";
```

- `root = fileURLToPath(new URL("../../../", import.meta.url))` — `scripts/` is
  three levels inside the worktree.
- Write `src/lib/api-values.generated.ts` (resolved from the same root).
- Run `indexProblems` with the freshly derived values before writing; print
  every problem and exit `1` if any exist. A summary line
  `api-values: 191 exports from 5 entries` is the expected output (the count is
  derived; do not hard-code it in prose).
- Exit `0` after writing.

`package.json` adds `"api:values": "nub scripts/api-values.ts"`.

## 6. The page and the component

### `src/components/value-index.tsx`

- Imports `valueExports` from `@/lib/api-values.generated` and the
  `ValueExport`/`ValueKind` **types** from `@/lib/api-values`.
- Local presentation tables only: `kindLabel` (`function`, `hook`, `class`,
  `constant`, `record`, `namespace`) and `packageLabel`.
- Renders one `<section>` per package in entry order, `<h3>` with the package
  name, a count, and one row per export:
  - `data-value="<package>#<name>"` for the test,
  - `<code>{name}</code>`, a kind badge (`<span>` with the label),
  - the summary,
  - `<code>{source}</code>`.
- An `internal` badge when `INTERNAL_EXPORTS` contains the key. The component
  may import `INTERNAL_EXPORTS` — it is a plain object — but that would pull
  `api-values.ts` (and thus `node:fs`) into the bundle. **Do not.** The
  generated row carries `visibility: "public" | "internal"` instead; add that
  field to `ValueExport` in §4 and derive it in `deriveValueExports`. The page
  then renders the badge from data.
- No colour literal; `text-fd-muted-foreground`, `border-fd-border` and the
  existing row classes are the style vocabulary (`part-index.tsx`).

`mdx.tsx` registers `ValueIndex`.

### `content/docs/api-values.mdx`

Frontmatter: `title: Values API`, description naming functions, hooks, classes,
constants and inventory records. Sections:

1. What this page indexes, and what it deliberately does not: component props
   → [API reference](/docs/api-reference); the theme's values → [Theming](/docs/theming);
   the theme API → [Tokens API](/docs/tokens-api); the decision layer's design
   → [Extending](/docs/extending).
2. `<ValueIndex />`.
3. **How the index is generated** — the entry list, the kind rules, the
   regeneration command, and the guard. Include the real policy file:
   `<include lang="ts" meta='title="apps/docs/src/lib/api-values.ts"'> ../../src/lib/api-values.ts </include>`
4. **Importing a helper** — a real `ts` block importing from
   `@gpuixui/primitives/core` and `@gpuixui/icons` (both entry points the page
   documents), with the note that `core` and the package root expose the same
   objects.
5. **Internal exports** — why they are listed and what the badge means.

`meta.json`: insert `"api-values"` after `"api-reference"`.

Cross-links: `api-reference.mdx` paragraph at line 11–14 gains the values
index; `extending.mdx` "The public surface" gains "every export, with its
summary, is in the generated [Values API](/docs/api-values)";
`tokens-api.mdx` "Values" paragraph gains the same link.

## 7. Test plan

Every test file starts with a header comment naming the bug it guards. No test
asserts a value it stubbed.

### `src/api-values.test.ts`

- `indexProblems` over the real repo is `[]`. This is the release guard.
- **Undocumented export**: derive a temporary fixture package
  (`mkdtempSync(join(tmpdir(), "api-values-"))`, write
  `packages/fixture/src/index.ts` with one documented export and one
  `export const undocumented = 1;`) and pass it as `entries`/`root`. Expect the
  exact message `"undocumented (packages/fixture/src/index.ts) has no doc
  comment"`. Rewrite the fixture without that line → no problem. This proves the
  guard can fail.
- **Aliases and kinds**: the same fixture carries
  `export { documented as renamed } from "./other.js"` where `other.ts` holds
  `/** A helper. */ export const documented = () => 1;` — expect
  `{ name: "renamed", kind: "function", summary: "A helper." }`.
  A `*Meta` object → `record`; a `useThing` → `hook`; a PascalCase function
  with a `(` initializer → absent from the values.
- **Stale**: pass a `generated` array missing one row; expect the stale message
  naming it.
- **Stale policy**: an `INTERNAL_EXPORTS` key that does not exist → a problem.
- **Unclassified package**: a fixture root with a second package that has a
  `package.json` and `src/index.ts` but no entry → a problem.
- **Page truth**: `content/docs/api-values.mdx` contains `<ValueIndex />`, the
  regeneration command, and absolute links to `/docs/api-reference`,
  `/docs/theming`, `/docs/tokens-api` and `/docs/extending`; `meta.json`
  contains `"api-values"`.

### `src/lib/search.test.ts` and `scripts/smoke-build.ts`

- The page's rows are rendered React, not MDX prose, so the Fumadocs page index
  never sees them (the same gap plan 419 closed for components). Add one
  `valueSearchIndex` document to `/api/search` and prove it twice: a unit test
  that `search("checkboxState")` returns `/docs/api-values`, and a production
  query in the built-site smoke with the same name.

### `src/components/value-index.test.tsx`

- Registered in the MDX map (`getMDXComponents().ValueIndex === ValueIndex`),
  the failure `part-index.test.tsx` measured on 2026-10-18.
- `renderToStaticMarkup(<ValueIndex />)` contains one `data-value` per generated
  export, exactly — no duplicates, no drops.
- Every package in `ENTRIES` that contributes rows has its name in the HTML,
  and a `data-package` attribute on each section.
- A known helper (`checkboxState`) and a known record (`tabsMeta`) both render
  with their summary text.
- The internal export renders the `internal` badge; a public one does not.

### Two-direction proofs (must be run and pasted into this plan's §9)

1. Delete the TSDoc above `sliderValueText` in
   `packages/primitives/src/components/Slider.tsx`, run
   `nub run --filter docs test -- src/api-values.test.ts` → fails with the
   undocumented message naming the file; restore the comment → passes. Revert
   the edit; the worktree must be clean of package changes.
2. Add `export const temporary = 1;` to the same file without regenerating →
   the stale test fails and names `temporary`; run `api:values` → passes.
   Revert both edits.
3. Remove `<ValueIndex />` from the page → the page-truth test fails; restore.
4. Change `useFieldsetDisabled` in `INTERNAL_EXPORTS` to a non-existent name →
   the policy test fails; restore.

Package edits in proofs 1–2 are temporary and reverted; `git status` must show
no change under `packages/` before committing.

## 8. Commands and expected results

Run from the worktree root:

```sh
nub run --filter docs api:values
# api-values: N exports from 5 entries  (exit 0, file written)

nub run --filter docs test -- src/api-values.test.ts src/components/value-index.test.tsx
# both files pass (exit 0)

nub run --filter docs test
# the whole docs suite passes

nub run --filter docs check-types
# exit 0

nub run --filter docs build
# exit 0

nub run --filter docs smoke:build
# exit 0; the crawl now includes /docs/api-values
```

Then the repository gates from the worktree root:

```sh
nub run check
nub run lint
nub run test
```

`smoke:build` exits `2` when it cannot verify; that is not a pass. If Chrome or
the server is unavailable, record it in §9 rather than claiming green.

## 9. Results

Implemented 2026-10-18.

**The index.** `nub run --filter docs api:values` derives **190 value exports
from 5 entries** (tokens 36, tokens/react 1, primitives 106, components 43,
icons 4). Every row has a summary; 12 came from the docs-owned `SUMMARIES`
override because the package source has no doc comment yet (recorded as a
cross-team task in `TODO.md`). `@gpuixui/primitives/core` and
`@gpuixui/testing` are excluded with written reasons; `useFieldsetDisabled` is
the only `internal` export.

**Two-direction proofs.**

1. Deleted the TSDoc above `sliderValueText` (`packages/primitives/src/components/Slider.tsx`)
   → `api-values.test.ts` failed with
   `undocumented export sliderValueText (packages/primitives/src/components/Slider.tsx) has no doc comment`
   (2 failed / 11 passed); restored → 13 passed. Package file reverted.
2. Appended `/** … */ export const temporaryProbe = 1;` to
   `packages/tokens/src/scale.ts` without regenerating → failed with
   `the generated index is stale; … (added: @gpuixui/tokens#temporaryProbe; removed: none)`
   and the exact-text test named the missing row; `api:values` wrote 191 rows
   and the suite passed; reverted and regenerated to 190. Package file
   reverted.
3. Removed `<ValueIndex />` from the page → the page test failed
   (`expected … to contain '<ValueIndex />'`); restored → passed.
4. Renamed the internal classification to `@gpuixui/components#useFieldsetGone`
   → failed with
   `INTERNAL_EXPORTS names @gpuixui/components#useFieldsetGone, which no entry exports (a stale classification)`;
   restored → passed.
5. Dropped `valueSearchIndex` from `/api/search` → `finds a helper on the
   generated values page` failed (no result); restored → 22 search tests pass.
6. The production query `checkboxState` → `/docs/api-values` is in
   `smoke:build`, so the built index, not only the source test, proves the
   page is findable by a helper name.

**Commands.**

| Command | Result |
| --- | --- |
| `nub run --filter docs api:values` | exit `0`, `190 exports from 5 entries` |
| `nub run --filter docs test` | exit `0`, 51 files / 336 tests |
| `nubx vitest run src/api-values.test.ts src/components/value-index.test.tsx` | exit `0`, 18 tests |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| `nub run --filter docs smoke:build` | exit `0` — 89 sitemap pages (was 88), 108 links, four search queries (including `checkboxState` → `/docs/api-values`), 404 checked |
| `nub run check` | exit `0` (check:tests, lint, fmt, every workspace's types) |
| `nub run test` | exit `0` (all workspaces) |

`smoke:browser` and `smoke:preview` were not re-run: this change adds no preview
surface and the built-site crawl covers the new page. They remain in the
release gate for any change that touches a preview.

One formatting note: `api-values.generated.ts` is emitted in `oxfmt`'s own
shape (one field per line, summaries wrapped at 80 columns), because the
committed file is compared byte-for-byte with the generator's output.

## 10. STOP conditions

Stop and report instead of improvising if:

- the reader cannot resolve an entry without a regex that would also match a
  comment or a string — restructure the reader rather than widening the regex
  to the point where it matches prose;
- bringing `node:fs` or `effect` into a non-test module is the only way to make
  the page render — stop: the generated-data boundary is the decision, not an
  obstacle to route around;
- the generator needs an edit under `packages/**` — that is another
  workstream's path; record the need in `TODO.md` instead;
- an export's TSDoc is missing and the owner is not this workstream — mark the
  export `internal` with a reason only if it genuinely is; otherwise add the
  missing sentence to the package (forbidden here) → record the ask in
  `TODO.md` and leave the guard failing loudly, which is the honest state;
- the docs suite or a smoke exits `2`.

## 11. Acceptance criteria

- `/docs/api-values` renders every runtime value export of the five entries,
  generated from source, grouped by package, with each row's summary and real
  source path.
- `@gpuixui/testing` and `@gpuixui/primitives/core` are excluded with written
  reasons; `useFieldsetDisabled` is the only internal export and carries a
  written reason.
- A new export without a TSDoc fails `nub run --filter docs test` by name; an
  unregenerated export fails the same suite by name.
- The page is in the sidebar, sitemap, search and the built-site crawl.
- The three API pages and Extending cross-link to the index.
- `nub run check`, `nub run lint` and `nub run test` pass; both-direction
  proofs and exit codes are recorded in §9.

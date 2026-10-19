# 581 — An API table that renders nothing is a failing page

**Phase:** F (API metadata) · **Workstream:** docs-site · **Depends on:** 411,
414, 415, 441, 479, 487, 580

## 1. The gap

`fumadocs-typescript` returns an empty document set for a type name it cannot
find. The page template renders `<auto-type-table>` from that result, so a
renamed type — or a props type that moved to another file — leaves the heading
and **no rows**. Nothing fails: the build succeeds, the crawl sees a normal
page, and the reader gets an empty API section.

The existing guards prove the *names* agree, not that the **path + name pair**
resolves:

- `src/content-references.test.ts` proves every `<auto-type-table>` path exists
  and that the page's type names equal the record's `api` set.
- `src/lib/type-table.test.ts` proves the generator reads a fixture's props,
  hides `@internal` and returns `[]` for an unknown name — on a fixture, never
  on a real component page.

The failure mode was measured on `agent/docs-site` at `8c940733` while auditing
the 66 pages with the app's own generator:

| Path used for the type | Type | Rows |
| ---------------------- | ---- | ---- |
| `packages/components/src/toast/provider.tsx` | `ToastViewportProps` | **0** |
| `packages/components/src/dropdown-menu.tsx` | `MenuGroupProps` | **0** |
| `packages/components/src/context-menu.tsx` | `MenuGroupProps` | **0** |
| `packages/components/src/toast/viewport.tsx` | `ToastViewportProps` | 31 |
| `packages/components/src/menu/item.tsx` | `MenuGroupProps` | 43 |

The pages happen to use the right files, so the site is correct today — but the
wrong combinations resolve, return `[]`, and are indistinguishable from success.
A part's props type is exactly the kind that lives in a second file
(`MenuGroupProps` in `menu/item.tsx`, `ToastViewportProps` in `toast/viewport.tsx`),
which is where a move or a copy-paste goes wrong.

All 66 pages currently resolve to at least one row, so the new guard starts
green; §5 breaks two real tables to prove it fails.

## 2. The change

### 2.1 `apps/docs/src/lib/type-tables.ts` (new)

A pure parser, so the page-reading logic is testable without the generator:

```ts
/** One `<auto-type-table>` declaration on a page. */
export interface TypeTableTarget {
  readonly path: string;
  readonly name: string;
}

/**
 * Every real `<auto-type-table path name>` on a page, ignoring fenced code
 * blocks (a page may show the tag as example text).
 */
export const typeTableTargets = (mdx: string): ReadonlyArray<TypeTableTarget>;

/**
 * Tags that name a table but carry no `path` or no `name`. They are not
 * silently skipped: an incomplete tag is the same defect as an empty table.
 */
export const malformedTypeTables = (mdx: string): ReadonlyArray<string>;
```

- Strip fenced blocks (three backticks to the matching fence) before matching.
- Accept the two attributes in either order and across lines; require both.
- Ignore other attributes.
- JSDoc on both exports (EF-11); the module is a plain boundary parser, like
  `roadmap-note.ts` and `code-imports.ts`, so no Effect import.

### 2.2 `apps/docs/src/lib/type-tables.test.ts` (new)

Four cases over inline fixtures:

1. attributes in declaration order and reversed both parse to `{path, name}`;
2. a multi-line tag parses;
3. a tag inside a fenced code block is ignored;
4. a tag with no `name` is reported by `malformedTypeTables`, not dropped.

### 2.3 `apps/docs/src/component-api-tables.test.ts` (new)

The guard. It reads every `content/docs/components/*.mdx` except `index.mdx`,
resolves each table path against the app directory (`apps/docs`), and fails with
the page, the type and the path when:

- the tag is malformed;
- the resolved path does not exist;
- `generator.generateDocumentation({ path }, name)` returns **zero entries**.

The hint names the failure class, not just the assertion:

```ts
// `<auto-type-table>` renders nothing for an unknown name: a renamed type or a
// moved part file must fail here, before a reader finds an empty API section.
```

It also asserts the guard found a non-trivial page set (more than 60 pages, more
than 140 tables — measured 66 and 147) so a broken glob cannot pass by finding
nothing. This file
contains the string `content/docs/components`, so
`src/component-page-docs.test.tsx` will require it in the template's guard table
(§2.4).

Use `node:fs`/`node:path` at this vitest boundary, exactly as
`content-references.test.ts` does and for the same reason (no Effect runtime in
`apps/docs`); the generator is the app's own `src/lib/type-table-generator.ts`,
so the guard cannot pass against a configuration the site does not run.

### 2.4 `apps/docs/content/docs/component-pages.mdx`

- Add one row to `## The guards`:
  `| src/component-api-tables.test.ts | every props table on a page renders at least one row from the file it names |`
- Narrow the `content-references.test.ts` row so it no longer implies row
  resolution: `every include resolves and the record and page agree on api`.
- Add one sentence under `## The sections` naming the new failure: a table whose
  type is not in the file it names renders nothing, so it fails by name.

The page's own guard enumerates test files that read `content/docs/components`,
so the row is required, not optional.

### 2.5 `.agents/slop/plans/README.md`

Add the plan row (this file) and mark it implemented after §5 passes.

## 3. Commands and expected results

Run from the repository root unless stated.

| Command | Expected |
| ------- | -------- |
| `cd apps/docs && nub x vitest run src/lib/type-tables.test.ts` | 4 tests pass |
| `cd apps/docs && nub x vitest run src/component-api-tables.test.ts` | 4 tests pass || `nub run --filter docs test` | 95 files / 676 tests (668 + 4 + 4), exit 0 |
| `nub run --filter docs check-types` | exit 0 |
| `nub run check` | `check:tests`, lint, format and types green |
| `nub run --filter docs smoke:build` | `smoke: ok` on the unchanged site |

If the parser/generator run is slow, the guard is still one file: measure it
with `nub x vitest run src/component-api-tables.test.ts --reporter=verbose` and
record the duration. Do not split it into per-page files.

## 4. STOP conditions

- A type legitimately has no props (an empty interface). Do **not** weaken the
  global rule: add a written exception in the guard naming the page and the
  reason, and state it on the page. This is the only allowed exemption.
- The generator throws for a path that exists (a parse failure in a `.tsx`) —
  stop and report the file; do not catch and pass.
- `component-page-docs.test.tsx` asks for the guard row and the page cannot take
  it without changing the generated section list — stop; the section list is
  generated, the guard table is prose.

## 5. Test plan and the two-direction proof

The guard must fail for the reason it claims, not because a file moved:

1. **Baseline:** run the guard; it passes.
2. **Wrong file:** in `content/docs/components/toast.mdx`, point
   `ToastViewportProps` at `.../src/toast/provider.tsx`; run the guard. It must
   fail naming `toast.mdx`, `ToastViewportProps` and the path. Restore; pass.
3. **Renamed type:** in `content/docs/components/dialog.mdx`, change the first
   table's `name` to `NoSuchProps`; run the guard. It must fail naming
   `dialog.mdx` and `NoSuchProps`. Restore; pass.
4. **Parser can fail:** delete the `name` attribute from a tag in the
   `type-tables.test.ts` fixture and confirm the malformed case fails.

Record the two forced failures in this plan's status line and in `TODO.md`.

## 6. Measured (2026-10-19, this worktree)

- **Baseline audit** at `8c940733`: all 66 pages resolve; the three wrong
  path/name pairs in §1 return `[]`, the right pairs return 31 and 43 rows.
  The 147 declarations parse into 66 pages.
- **Guard added:** `nub run --filter docs test` → 95 files / 676 tests, exit
  `0`; `nub run check` → `check:tests`, lint, format and `check-types` green;
  `nub run test` → every package green (docs 676).
- **Forced failure 1** (toast path): `ToastViewportProps` pointed at
  `toast/provider.tsx` → `toast.mdx → ToastViewportProps (…/toast/provider.tsx)
  renders no rows: the file does not declare that type`; restored, 4/4.
- **Forced failure 2** (unknown type): `DialogProps` renamed to `NoSuchProps`
  → `dialog.mdx → NoSuchProps (…/dialog.tsx) renders no rows: the file does not
  declare that type`; restored, 4/4.
- **Parser failure**: removing `name` from the fixture tag is reported by
  `malformedTypeTables` (the `type-tables.test.ts` case that asserts it).


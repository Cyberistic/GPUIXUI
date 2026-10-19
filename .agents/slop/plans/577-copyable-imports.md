# 577 — Copyable imports resolve: a fenced example cannot name a module the package does not export

**Workstream:** docs-site. **Phase:** F. **Depends on:** 410, 414, 466, 524.
**Status:** implemented (2026-10-19).

## 1. The measured defect

The docs present code fences as copyable examples. Nothing checks the
`@gpuixui/*` imports inside them, so a page can tell a reader to import a module
that does not exist.

Measured 2026-10-19 on `agent/docs-site` at `50ad2c41`, with a throwaway scanner
over every fenced block in `apps/docs/content/docs/**/*.mdx`:

| Fact | Measurement |
| ---- | ----------- |
| fenced `@gpuixui/*` named imports | **219** |
| distinct specifiers | **28** |
| specifiers Node cannot resolve from `apps/docs` | **1** |
| named imports that are not exports of the resolved module | **0** (besides the unresolved one) |

The failure is `apps/docs/content/docs/components/inline-validation.mdx:21`:

```tsx
import { validate } from "@gpuixui/components/validation/logic";
```

`packages/components/package.json` exports `"."` → `./src/index.ts` and
`"./*"` → `./src/*.tsx`. `validation/logic` maps to
`src/validation/logic.tsx`, which does not exist (the file is
`src/validation/logic.ts`), and the root entry does not re-export it. Measured:

```sh
node -e 'const {createRequire}=require("module");const r=createRequire(process.cwd()+"/apps/docs/package.json");r.resolve("@gpuixui/components/validation/logic")'
# => Error [ERR_PACKAGE_PATH_NOT_EXPORTED] / MODULE_NOT_FOUND
```

The import is also **unused** in the snippet: the example passes `error` to
`Field`; `validate` never appears. The page's prose and States section present
`validate`/`validateAll` as consumer API, and `packages/components/docs/field.mdx`
makes the same promise (components-owned; record a cross-team task, do not edit
that package here).

A reader who copies the fence gets a module-not-found error before reaching the
component. That is a correctness defect in the docs, not a style issue.

## 2. What to build

### 2.1 `apps/docs/src/lib/code-imports.ts` (new)

A small vitest-boundary module, in the style of `src/lib/source-imports.ts` and
`src/lib/source-exports.ts` (`node:fs` is deliberate; the browser bundle never
imports it).

Export:

```ts
export interface CodeImport {
  readonly specifier: string;
  readonly names: ReadonlyArray<string>;
}

/** Named/default imports inside fenced blocks, in source order. */
export const importsInCodeFences: (
  markdown: string,
) => ReadonlyArray<CodeImport>;

/** Every name a `.ts`/`.tsx` module exports, following `export * from`. */
export const exportsOfModule: (file: string) => ReadonlySet<string>;
```

Rules:

- Only fenced blocks count. An `import` in prose must not be read as an example
  (the inline-validation paragraph names the module in backticks).
- Support the forms the pages use: `import { A, B as C } from "x"`,
  multi-line lists, `import type { T }`, a default import before the braces, and
  `import * as ns from "x"` (a namespace import contributes no named check).
- Strip `type ` from individual specifiers. `A as B` checks `A` (the module's
  name).
- Ignore non-`@gpuixui/*` specifiers in the caller, not in the parser.
- `exportsOfModule` reads:
  - `export (async)? (function|const|let|var|class|type|interface|enum) Name`
  - `export (type)? { A, B as C }` (the exported name is `C`)
  - `export * from "./x.js"` recursively, resolving `.tsx`, `.ts`,
    `index.tsx`, `index.ts`
  - a `visited` set so a re-export cycle terminates.
- It does not parse default exports; no page imports one. Say so in the doc
  comment instead of pretending to cover it.

### 2.2 `apps/docs/src/code-imports.test.ts` (new)

Three groups:

1. **Parser** (pure fixtures) — a fence with a multi-line `type` import and an
   alias yields the module names; an import written in prose is not returned; a
   non-fenced HTML line is not returned.
2. **Export scanner** — `exportsOfModule` on the real
   `packages/components/src/field.tsx` contains `Field` and `FieldInput`;
   a fixture module with `export { Inner as Outer }` and `export * from
   "./other.js"` yields `Outer` and the re-exported name; a name that is not in
   the module is absent.
3. **The site** — walk `content/docs/**/*.mdx`, run `importsInCodeFences`, and
   for every `@gpuixui/*` specifier:
   - resolve it with `createRequire(join(appRoot, "package.json")).resolve`;
   - `exportsOfModule` the resolved file;
   - collect `page: cannot resolve <specifier>` and
     `page: <specifier> has no export <name>`.
   Assert the violation list is empty. The failure message names the page, so a
   broken copyable example is actionable.

Use `node:fs`, `node:path`, `node:module` at this boundary, as
`content-references.test.ts` does. The test header records the bug it guards
(the unresolved `validation/logic` import) and the measured 219/28/1 table.

### 2.3 Fix the page (`apps/docs/content/docs/components/inline-validation.mdx`)

- Delete the unused `validate` import from the Usage fence. The fence then shows
  only imports a consumer can copy.
- Rewrite the opening sentence from
  "`validation/logic.ts` turns a `Schema` into a user-facing message" to name it
  as the package's **internal** helper and say it is not exported from the
  package entry yet. Point at `TODO.md` for the export task; do not imply a
  public import.
- In **States**, keep the `validate`/`validateAll` behaviour description (it is
  true of the module) but state the shipped import limitation immediately, so a
  reader does not try the broken path.
- Leave the composed example include and the `Field` API table untouched.

### 2.4 `TODO.md` — cross-team task

Under **Cross-team tasks raised by the docs-site workstream**, add:

> **Components**: export `validate`/`validateAll` from the package entry (or add
> an explicit `./validation/logic` export), then correct
> `packages/components/docs/field.mdx`, which shows the same unresolvable import
> the docs page no longer ships. Owner: components.

The docs-side guard will pass either way: it checks what the package actually
exports, and the page currently imports nothing from that module.

## 3. Order of work

1. Add the test **first** with the real-site check only. Run
   `nub run --filter docs test -- code-imports` and record it failing on
   `components/inline-validation.mdx: cannot resolve
   @gpuixui/components/validation/logic`. This is the two-direction proof that
   the guard sees the shipped defect.
2. Add `src/lib/code-imports.ts` and the pure tests; confirm the real-site test
   still fails for the same reason (the parser must not mask it).
3. Fix `inline-validation.mdx`; re-run and confirm it passes.
4. Record the cross-team task in `TODO.md`.
5. Re-run every command in §5.

## 4. Commands and expected results

```sh
nub run --filter docs test -- code-imports
# before 3: 1 failed — inline-validation.mdx: cannot resolve @gpuixui/components/validation/logic
# after 3:  3 passed (or the file's full test count), exit 0

nub run --filter docs test
# expect: 92 files / 660+ tests, exit 0 (baseline 91 / 652)

nub run --filter docs check-types
# expect: exit 0

nub run --filter docs build
# expect: exit 0

nub run check
nub run lint
# expect: exit 0
```

## 5. Two-direction proofs

Run each, record the exact output, then revert:

1. **The shipped defect** — the guard before the page fix fails by page and
   specifier (step 1 above).
2. **A removed export name** — temporarily change the Button page's Usage import
   to `import { Button, Nope } from "@gpuixui/primitives";`; the guard fails with
   `components/button.mdx: @gpuixui/primitives has no export Nope`, then revert.
3. **A parser that reads prose** — temporarily make `importsInCodeFences` return
   the whole document instead of the fences; the inline-validation prose's
   backticked module name is not an import, so this specific case may still
   pass. Instead prove the parser test: insert an `import` line in prose and
   assert it is absent from the result. Revert.
4. **A re-export alias** — remove `Outer` from the fixture's `export { Inner as
   Outer }` and confirm the scanner test fails; restore.

## 6. STOP conditions

Stop and report if:

- More than the one measured specifier fails to resolve. The plan fixes one
  page; a second defect needs its own decision and page edits.
- The package's entry or `exports` map has changed on this branch so that
  `@gpuixui/components/validation/logic` resolves (then the page fix is a
  different change: keep the import and delete the limitation note).
- `nub run --filter docs test` is red before the change for an unrelated reason.
- A command fails in a way this plan does not describe.

## 7. Acceptance

- Every `@gpuixui/*` import in a fenced block on the site resolves through the
  package's real `exports` map and names a real export.
- The Inline validation Usage fence copies without a module-resolution error.
- The page states the helper's shipped status instead of promising an import
  that does not exist.
- A cross-team task asks the components workstream to export the helper and fix
  its own page.
- All commands in §4 pass; the proofs in §5 are recorded in this plan's result
  section.

## 8. Result (2026-10-19)

**Landed.** `apps/docs/src/lib/code-imports.ts` (fence parser, direct-export
scanner, recursive `export *` walk), `apps/docs/src/code-imports.test.ts` (six
tests: parser, alias declarations, barrel re-export, single module, and the
site-wide resolution check), the Inline validation page correction, the
`apps/docs/README.md` paragraph and the Contributing row.

**Measured.**

| Command | Result |
| --- | --- |
| `nub run --filter docs test -- code-imports` | before the page fix: `1 failed` — `components/inline-validation.mdx: cannot resolve @gpuixui/components/validation/logic`; after: 6 passed |
| `nub run --filter docs test` | 92 files / 658 tests (was 91 / 652) |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build` | 98 pages / 121 links / 1 275 anchors, exit `0` |
| `nub scripts/smoke-a11y.ts --no-build --only /docs/components/inline-validation` (in `apps/docs`) | 1 page × 2 schemes, 0 violations, exit `0` |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` |

**Two-direction proofs (each forced, measured, then reverted).**

1. **The shipped defect** — the guard failed before the page fix, naming the page
   and the specifier (the table's first row).
2. **A removed export name** — adding `Nope` to the Button page's import made
   the guard fail with `components/button.mdx: @gpuixui/primitives has no export
   Nope`; the page was restored.
3. **A parser that reads prose** — replacing the fence pattern with
   `/([\s\S]*)/` made `ignores an import written in prose` fail; the fence
   pattern was restored.
4. **An alias the scanner drops** — reading the first name of
   `export { Inner as Outer }` instead of the alias made the declaration test
   fail with `Inner` where `Outer` is expected (and one site import that relies
   on an alias); the alias rule was restored.

**Recorded.** The components workstream owns the real export:
`TODO.md` → *Components: export `validate`/`validateAll` … then correct
`packages/components/docs/field.mdx`*.

**Limit.** The guard proves the specifier resolves and the named imports exist.
It does not type-check a fence's props or JSX; a fragment is not a module, and
the page's real type surface is already generated by `auto-type-table`. The
parser also does not check default or namespace imports; no page uses one to
reach a named export.

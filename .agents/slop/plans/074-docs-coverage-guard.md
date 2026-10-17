# 074 — Guard the package's own bar: every public component has an indexed page

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth / public-export check) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `047` |
| Status | **done** |

Self-contained: §1 the gap, §2 the rule, §3 files, §4 tests, §5 STOP list,
§6 outcome.

---

## 1. The gap

MISSION's bar for every component is *code + test + example + docs page +
inventory record*, and the plan index repeats it. Nothing enforces the docs half:
`COMPONENTS.md` rows and `docs/README.md` are hand-maintained, so a new component
export can ship with no page, a page can exist with no index row, or a deleted
page can leave a dangling link — and every gate stays green. The tokens package
already guards its exports (`packages/tokens/src/exports.test.ts`); primitives
does not.

## 2. The rule

A runtime-free test (`src/exports.test.ts`) asserts, against the real package
root and the real filesystem:

- every **PascalCase export** of `src/index.ts` is either a component with a
  docs page in the table below or an explicitly allowlisted non-component
  (`MissingThemeProviderError`);
- every table entry is exported and its `docs/<slug>.mdx` exists;
- every `.mdx` in `docs/` is linked from the `docs/README.md` page table, so no
  page is orphaned;
- every page declares `title` and `description` frontmatter, the documented
  page contract.

The table is the single place a new component is registered for docs. Adding an
export without touching it fails by name, which is the point.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/exports.test.ts` | the guard (new) |
| `TODO.md`, `.agents/slop/plans/README.md` | tick and index |

Commands:

```sh
nub run --filter @gpuixui/primitives test
nub run check
```

## 4. Test plan

- Deleting `docs/scroll-area.mdx` fails the "page exists" assertion naming the
  file.
- Removing its row from `docs/README.md` fails the "indexed" assertion.
- Adding a `export const Widget = ...` to the package without a table entry
  fails the "public component has a page" assertion.
- Removing `title:` from a page fails the frontmatter assertion.

This is a static guard, so its value is the failure message; there is no runtime
counterpart to measure.

## 5. STOP conditions

- `import.meta.dirname` is unavailable in the package's test ESM target — stop
  and use `fileURLToPath(import.meta.url)` rather than a hard-coded path.
- The check requires a build step to see the package root — stop; the package is
  source-exported (PLAN D11) and the test must not add one.

## 6. Outcome

Implemented and measured. The guard is `packages/primitives/src/exports.test.ts`
(5 tests, plain vitest; the filesystem effects are provided with
`NodeFileSystem`/`NodePath` and run at the **test boundary** with
`Effect.runPromise`, as the repo's Effect rules require).

- Offline suite: **32 files / 358 tests**, green.
- **Three directions proven** by breaking the thing guarded:
  - deleting `docs/scroll-area.mdx` → `has a page for every component` fails
    (1 failed / 4 passed);
  - removing one row from `docs/README.md` → both index tests fail with
    `[ 'info-tip' ]` and `[ 'info-tip.mdx' ]`;
  - appending `export const Widget = ...` to `src/index.ts` → the export test
    fails with `[ 'Widget' ]`.
  All three were restored and the suite went green.
- One implementation correction found while proving it: `Str.includes` is
  data-last (`includes(needle)(haystack)`), so the first draft passed a string
  as the `position` argument and the two index assertions were vacuously true.
  The guard now fails when it should; `tsc` also caught the mistake.

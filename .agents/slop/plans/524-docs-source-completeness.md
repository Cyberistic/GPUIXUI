# 524 — The test source sees every page

**Status:** implemented
**Phase:** F (docs verification)
**Depends on:** 410, 468
**Owns:** `apps/docs/vitest.config.ts`,
`apps/docs/src/lib/source-completeness.test.ts`

## 1. The bug

`apps/docs/src/lib/source.ts` declares its docs collection with
`defineDocs`. The `fumadocs-mdx` macro compiles that call into one
`import.meta.glob` whose **matched file list is baked into the transform**.

Vitest's filesystem module cache (`fsModuleCache`, default on, stored at the
workspace root in `node_modules/.vitest-cache`) is keyed by a module's **content**.
Adding an MDX page does not change `source.ts`, so the cached transform was
reused and the source kept the page list from the last time `source.ts` changed.

Measured in this worktree before the fix:

```text
docs.docs   15
docs.meta    4
getPages    15          # of 94 `.mdx` files on disk
built site  95 sitemap pages
```

Every guard that derives its page set from `source` — the sitemap membership
test, the search index test, the IA test — was therefore green over 15 pages
while 79 pages were invisible. The built smoke still saw 95 because a fresh
build re-runs the transform; the weakness was confined to `nub run test`, which
is exactly where the guards live.

Three pages that make the size of the gap concrete: `dark-mode`,
`components/button` and `patterns/confirmation-flow` were all absent from the
test-time source.

## 2. Exact changes

### 2.1 `apps/docs/vitest.config.ts`

The cache must change when the **set of pages** changes, not when `source.ts`
changes. Derive a key from the page paths and scope the cache to it:

```ts
const contentKey = createHash("sha256")
  .update(pagePaths(contentDirectory).join("\n"))
  .digest("hex")
  .slice(0, 12);

test: {
  fsModuleCachePath: fileURLToPath(
    new URL(`../../node_modules/.vitest-cache/docs-${contentKey}`, import.meta.url),
  ),
}
```

`pagePaths` walks `content/docs` for `*.mdx` and is order-independent enough for
the key (a sorted walk is not required because the directory order is stable for
the same tree; sorting would be fine but is unused). Adding or removing a page
yields a new cache; editing one does not.

**Rejected:** `fsModuleCache: false`. It fixes the staleness but re-transforms
every MDX file on every run — measured 69 s against 13 s for a warm keyed cache
(cold keyed: 52 s). The keyed path keeps the speed and removes the failure.

### 2.2 `apps/docs/src/lib/source-completeness.test.ts`

A guard that is independent of the cache's own bookkeeping: compare
`source.getPages()` with every `.mdx` file on disk, in both directions.

- `page.data.info.path` is relative to `content/docs` (`components/button.mdx`).
- Report the two lists by name: `{ missing, extra }` must both be empty, then
  assert the counts are equal.

### 2.3 `TODO.md`

Add under "Docs site workstream" (before the plan-525 entry):

```
`[x]` **The docs tests see every page (plan 524)** — Vitest's module cache was
      keyed by `source.ts`'s content, so adding a page reused a baked
      `import.meta.glob` list: `source` held 15 of 94 pages while every
      source-based guard passed. The cache is now keyed by the page set;
      `source-completeness.test.ts` compares the pages with the files on disk in
      both directions.
```

Counter: `125/125` → `127/127` after plan 525 lands.

### 2.4 `.agents/slop/plans/README.md`

Add a row; fill its status after §4.

## 3. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` (cold cache) | 77 files / 521 tests pass; ~52 s |
| `nub run --filter docs test` (warm) | 77 files / 521 tests pass; ~13 s |
| `nub run --filter docs check-types` | exit 0 |
| `nub run check` | exit 0 (the checker accepts `source-completeness.test.ts`) |
| `nub run lint` | exit 0 |

The test count is 516 before plan 525 adds its five; 521 after (the suite also
asserts the llms documents).

## 4. Test plan (two directions)

1. **Stale page set fails the guard.** Add a temporary
   `content/docs/tmp-source-proof.mdx`, remove `fsModuleCachePath` (so the
   default, already-stale cache is used), run the suite. Measured:
   `missing: ["tmp-source-proof.mdx"]`, exit 1, named by the guard.
2. **Keyed cache passes with the same page.** Restore `fsModuleCachePath`, keep
   the temp page, run. The completeness guard passes (the new key re-expands the
   glob); the two failures are `content.test.ts` (the temp page has no sidebar
   entry) and the llms index, which is page-tree based and does not invent a
   second navigation. Delete the temp page.
3. **The shipped tree passes.** After deleting the page, the full suite is
   green (77 files / 520 tests) and a warm rerun stays green.

## 5. STOP conditions

- The keyed cache does not re-expand the glob for a new page on this Vitest
  version → stop and report the measured page count; do not fall back to a
  permanent stale cache, and do not disable the guard.
- The key changes on every edit (for example because mtimes enter the key) →
  stop; the key must be the page path set only.
- `nub run check`'s test checker rejects the new guard → fix the guard, never
  add `check-tests-ok`.

## 6. Acceptance

- `source.getPages()` matches the `.mdx` files on disk in both directions.
- The completeness guard is green after adding a page and again after removing
  it, without editing `source.ts` (the page is listed in its sidebar, as
  `content.test.ts` requires).
- A warm suite stays within the pre-fix order of magnitude (13 s vs 10 s).

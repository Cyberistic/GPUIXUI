# 424 — docs truth pass against the implementation

- **Workstream:** docs-site
- **Phase:** F
- **Owns:** `apps/docs/src/component-truth.test.ts`, `apps/docs/content/docs/components/**`,
  `TODO.md`, this plan and the plan index
- **Depends on:** plans `410` §13 (the pre-component truth audit), `422`, `423`
  (all 20 Tier 1 pages)
- **Status:** implemented — guard, manual audit and both proofs in §7.1

The last open docs-site row is "Docs truth pass against the implementation —
needs the component pages" (`TODO.md`, Phase F). The pages now exist. This plan
turns the audit into a repeatable guard where the claim is mechanical, and
records the manual checks where it is not (plan 410 §13 explains why prose
intent cannot be tested).

## 1. What "true" means for a component page

| Claim | Guarded by |
| ----- | ---------- |
| The page exists, is in the sidebar, and its title/description match the registry | `component-pages.test.ts`, `registry.test.ts` |
| Every template section and the `ComponentState` / `NativePreview` blocks exist | `component-pages.test.ts` |
| The source path exists and the page includes exactly that file | `content-references.test.ts` |
| The API table resolves a real exported props type and generates rows | `content-references.test.ts` + `type-table.test.ts` |
| The preview is the strongest honest tier; no fake screenshot | `preview.test.tsx` |
| Related records that have no page are not linked | `related-components.test.tsx` |
| **Every repository path the prose names exists or is registered as planned** | **new `component-truth.test.ts`** |
| **No placeholder prose ("coming soon", "TBD", "TODO") is shipped as documentation** | **new `component-truth.test.ts`** |

## 2. The new guard

`apps/docs/src/component-truth.test.ts`:

1. Walks `content/docs/components/*.mdx`.
2. Extracts backticked repo paths: `` `packages/…` ``, `` `apps/…` ``,
   `` `examples/…` ``, `` `docs/…` ``, `` `LICENSES/…` ``.
3. For each path:
   - if it exists on disk, pass;
   - otherwise the owning directory's `README.md` must list it (that is the
     repository's register of planned files — e.g. `packages/data-grid` is
     listed in `packages/README.md`, so the virtualisation sentence is honest);
   - otherwise it is a violation naming the page and path.
4. Rejects `coming soon`, `TBD`, `TODO` (case-insensitive) in component page
   prose. Unfinished work belongs in `TODO.md`, not in a shipped page.
5. Proves it can fail: temporarily point a page at `packages/nope/nope.ts` and
   show the test fails; restore.

No Effect runtime, no `@gpuixui/*` import — it is a vitest filesystem boundary
like `content-references.test.ts`.

## 3. Manual audit (recorded, not automated)

For every one of the 20 pages, compare against its source and the inventory:

- **status / GPUix support** — from `COMPONENTS.md` (the registry test already
  enforces the pair; spot-check the numbers).
- **props** — the table is generated; spot-check that no prose lists a prop the
  type does not have.
- **keyboard** — compare with `core/keyboard.ts` and the component's handlers.
- **capability claims** — every "no `aria-checked` / `aria-valuenow` /
  `aria-labelledby` / `aria-describedby` / `focusVisible` / rotation" statement
  must match the verified 0.10.0 limits in `COMPONENTS.md`.
- **example** — the included example file exists and the runtime suite mounts it
  (plan 047).
- **preview** — tier X everywhere: no screenshot and no playground screen exists
  for these components, and the page says so through `<NativePreview>`.

Record the outcome in §6. A discrepancy is fixed in the page (or raised as a
cross-team `TODO.md` row when the package is wrong), never explained away.

## 4. Files

```
A apps/docs/src/component-truth.test.ts
M TODO.md                                   tick the Phase F truth pass
M .agents/slop/plans/README.md              index this plan
```

Any page edit that the audit forces is listed in §6 with its reason.

## 5. Commands

```sh
nub run --filter docs test           # 20 files; the new guard is one of them
nub run --filter docs check-types
nub run --filter docs build
nub run check
nub run lint
nub run test
```

Expected: all pass; the new test reports no missing path and no placeholder in
any of the 20 pages. Browser: every page returns 200 (already measured in plan
423 §8.1; re-run one page after any edit).

## 6. STOP conditions

- A page's claim cannot be traced to source or `COMPONENTS.md` → delete the claim
  or correct it; do not add a hedge that keeps the claim.
- A named path is neither present nor registered → either the page is stale (fix
  it) or the directory's README is missing a planned entry (raise a `TODO.md`
  row; do not edit another workstream's register without evidence).
- The guard starts rejecting legitimate prose (e.g. a plan number that looks
  like a path) → narrow the pattern; do not weaken it to "any backtick passes".

## 7. Acceptance criteria and evidence

- [ ] `component-truth.test.ts` guards paths and placeholder prose, and fails on
      a fabricated path (two-direction proof recorded).
- [ ] Every component page passes the manual checklist in §3.
- [ ] No stale claim or placeholder remains in `content/docs/components/**`.
- [ ] All gates pass; `TODO.md` Phase F row is ticked with the evidence pointer.
- [ ] Plan index updated.

### §7.1 Evidence (measured 2026-10-17)

- **Guard:** `apps/docs/src/component-truth.test.ts` — 4 assertions covering all
  20 pages: the page set equals the delivered registry records; every named
  repo path exists or is registered (e.g. `packages/data-grid` in
  `packages/README.md`); no placeholder prose ships; every import name in a
  usage snippet is actually exported by `@gpuixui/primitives` or
  `@gpuixui/icons`.
- **Two-direction proofs:**
  1. appended `` `packages/nope/nope.ts` `` to `progress.mdx` → guard failed with
     `progress.mdx: missing packages/nope/nope.ts` (1 failed, 104 passed);
     restored → 105/105 at that point.
  2. restored the old tooltip snippet, which imported `Icon` from
     `@gpuixui/primitives` → guard failed with
     `tooltip.mdx: Icon is not exported by @gpuixui/primitives` (1 failed,
     105 passed); corrected the page → 106 passed.
- **Manual audit:** all 20 pages compared with their source, `COMPONENTS.md` and
  `core/keyboard.ts`. Statuses/support match the inventory, the generated prop
  tables match each exported props type, the keyboard tables match the shared
  decision module (Enter down, Space up, held ignored, radio wrap/skip/Home/End),
  and every capability claim is a **negative** — no `aria-checked`,
  `aria-valuenow`, `aria-labelledby`, `aria-describedby`, `focusVisible`,
  rotation or gradient. The 120 ms / 700 ms intervals in the Progress, Spinner
  and Skeleton pages match `Progress.tsx`, `Spinner.tsx` and `Skeleton.tsx`.
  **One defect found:** the tooltip usage snippet imported `Icon` from the wrong
  package (inherited from `packages/primitives/docs/tooltip.mdx`). The docs page
  was fixed; the package page is recorded as a cross-team `TODO.md` row.
- **Gates:** `docs test` **20 files / 106 tests**; `docs check-types` pass;
  `docs build` exit 0; `nub run check`, `nub run lint`, `nub run test` pass
  (tokens 196, icons 18, primitives 156, docs 106). Browser: the 20 pages
  returned 200 in plan 423 §8.1; the tooltip edit is a snippet import only.
- **Page changes forced by the audit:** `tooltip.mdx` — `Icon` import moved to
  `@gpuixui/icons`. No other page changed.

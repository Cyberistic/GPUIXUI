# 459 — The Architecture page tells the truth about the packages and the previews

**Phase:** F (docs truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410 (the site), 426 (the prose-truth guard), 455–458 (the live
surface), `docs/README.md` (the maintainer-document ledger, another workstream)

## 1. Why this plan exists

`apps/docs/content/docs/architecture.mdx` is the page a new reader opens to learn
how the repository fits together. It has drifted in three ways, each provable
from the repository:

1. **It names three packages.** `@gpuixui/icons`, `@gpuixui/testing` and
   `@gpuixui/config`/`@gpuixui/deploy` exist with a `package.json`; the page does
   not name them. Its diagram also shows `icons` nowhere, although
   `primitives` depends on it.
2. **It promises a document that is not written.** “The full document will live
   at `docs/architecture.md` … is not written yet.” The site's own page is the
   architecture overview a reader can use; a future document is not.
3. **Its preview list omits the real GPUix surface.** It lists four groups
   (native run, screenshot, coverage, approximation, source) but not tier L —
   the published WebAssembly renderer the site now embeds on eleven pages
   (plans 455–458) — and says “no per-component playground screen exists yet”
   without saying what *does* exist live.

The existing guards do not catch any of this: the path guard allows a registered
planned path, and no test compares the page's package list with the repository.

## 2. Files

Change:

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/architecture.mdx` | rewrite the package section (every package named, real edges, icons included, tooling grouped), drop the `docs/architecture.md` promise, and describe the five preview groups including the opt-in live surface, linking the strategy and the capabilities page |
| `apps/docs/src/prose-truth.test.ts` | two guards: every `packages/*/package.json` name appears on the page; no `docs/*.md` the page names is missing from the repository |
| `TODO.md` | tick this row; amend the cross-team row so `docs/README.md` remains the only surface still promising `docs/architecture.md` |

Create: none.

## 3. Content rules

- The diagram states real edges only: `tokens → icons → primitives → components`,
  with `data-grid`, `docking`, `editor` marked as planned (they have no
  `package.json`).
- Tooling (`config`, `testing`, `deploy`) is named as tooling, not as library
  layers.
- “No package is published to a registry” stays true and useful; do not claim a
  registry release.
- The docs site paragraph says it reads package source at build time and never
  imports the native runtime at runtime; the live surface is an isolated
  WebAssembly document, not the desktop binary.
- No sentence promises a file that does not exist. Link `PLAN.md` by path only if
  the sentence is about the repository, not the site.

## 4. Commands and expected results

```sh
nub run --filter docs test          # exit 0, both new guards green
nub run --filter docs check-types   # exit 0
nub run --filter docs build         # exit 0
nub run check && nub run lint && nub run test
```

## 5. STOP conditions

- A package directory has no `package.json`: it is not “implemented”, so the
  guard counts it only when the file exists. Do not add an empty directory.
- `docs/README.md` changes the `architecture.md` promise before this lands:
  re-read it and keep this page consistent with what exists; do not edit that
  file (another workstream owns it).
- A new package lands while this runs: name it on the page; the guard will fail
  until it is.

## 6. Test plan

| Test | Guards | Proven to fail by |
| ---- | ------ | ----------------- |
| `prose-truth.test.ts` — packages | every real `packages/*/package.json` name is on the Architecture page | deleting `@gpuixui/icons` from the page |
| `prose-truth.test.ts` — documents | the page names no `docs/*.md` that does not exist | restoring the `docs/architecture.md` promise |

Both directions are recorded in §8 when the plan runs.

## 7. Acceptance

- The page names every implemented package with real edges and no empty claim.
- No absent maintainer document is promised from the site.
- The preview section includes the live GPUix surface and points at the strategy
  and the capability page.
- Both guards fail on the old text and pass on the new; the repository gate is
  green; the change is committed and pushed on `agent/docs-site`.

## 8. Progress

Implemented 2026-10-18.

- **The page** names all seven packages (`tokens`, `icons`, `primitives`,
  `components`, `config`, `testing`, `deploy`) with the real edges
  (`tokens → icons → primitives → components`), marks the three specialised
  packages as planned, separates tooling from the library, and describes the
  site as a browser app whose shell never imports the native runtime.
- **The promised document is gone.** The page now says the preview strategy
  lives in `docs/preview-strategy.md` (which exists) and adds the live GPUix
  surface to its preview list — six groups, matching plan 412.
- **Two guards** in `prose-truth.test.ts`: every `packages/*/package.json` name
  appears on the page, and no `docs/*.md` the page names is missing.
- **Measured:** `nub run --filter docs test` (41 files, 253 tests),
  `check-types`, `lint`, `fmt`, `build`, `nub run test` and `nub run check` are
  green.
- **Two directions proven:**
  1. deleting the `@gpuixui/icons` bullet failed `names every implemented
     package on the architecture page`;
  2. appending "The full document lives at `docs/architecture.md`." failed
     `does not promise a maintainer document that does not exist` with
     `[ 'docs/architecture.md' ]`.
  Both restored green.

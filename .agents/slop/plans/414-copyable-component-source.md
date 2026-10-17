# 414 — copyable real source on component pages

- **Workstream:** docs-site
- **Phase:** B–C (mechanism) → C–F (used by every component page)
- **Owns:** `apps/docs/content/docs/**`, `apps/docs/src/content-references.test.ts`,
  `apps/docs/README.md` (the page-template section), `docs/preview-strategy.md`
  (the source-tier note)
- **Depends on:** 410 (app shell), 411 (the component registry and page template),
  412 (the preview tiers — tier X is "source plus a limitation notice")
- **Depended on by:** every component page (plan 411 §4 "Provide copyable source")

Companion plans: [`410-docs-site.md`](./410-docs-site.md),
[`411-component-page-template.md`](./411-component-page-template.md),
[`412-preview-strategy.md`](./412-preview-strategy.md).

---

## 1. Goal

A component page must show the component's **real source**, copyable, without a
human copying it into the page. `MISSION.md` requires it ("Provide copyable
source"); plan 412 calls tier X the "source plus a limitation notice" tier, and
`TODO.md` carries a cross-team row for it.

This plan closes that gap and makes the rule enforceable: a finished component
whose page omits its real source fails a test.

## 2. Decision — use Fumadocs' `<include>`, not a custom component

Plan `412` §4 listed `apps/docs/src/components/preview/component-source.tsx`
("<ComponentSource path> — copyable real source"). **This plan deviates: it uses
Fumadocs' built-in `<include>` MDX tag instead.** Recorded as a deviation in plan
412 §4 later in this file.

Why:

- `MISSION.md` requires using Fumadocs' supported conventions, not inventing a
  custom docs framework. `<include>` is that convention
  (`references/fumadocs/apps/docs/content/docs/mdx/include.mdx`).
- `fumadocs-mdx`'s `remarkInclude` is applied to **every** page by default
  (`node_modules/fumadocs-mdx/dist/build-default-CSiWktEh.js` → `remarkPlugins:
  [remarkInclude, ...]`), reads the file **at build time** with `node:fs`,
  registers it as a compiler dependency, and replaces the tag with a fenced code
  block carrying `lang` and `meta`. A missing file throws
  (`failed to read file <path>`), so the build is a backstop against drift.
- It already supports everything `<ComponentSource>` would have had to build:
  a `lang`, a `title` via `meta`, and `// #region` extraction for showing one
  part of a file.
- No new dependency, no Vite glob-outside-root, no build-time inlining machinery,
  and **no new runtime component** (AGENTS: the fewer LOC, the better).
- A custom component would have to embed file text into the client bundle; this
  keeps the reproduction at build time and the page payload a normal code block.

### Evidence (probed, not assumed)

A throwaway page with

```mdx
<include lang="ts" meta='title="source.config.ts"'>
  ../../source.config.ts
</include>
```

was built and served:

- `nub run --filter docs build` exit 0; the built page chunk contains the real
  `source.config.ts` text (`createFileSystemGeneratorCache`, verbatim).
- `curl http://localhost:3000/docs/_probe` returns the source inside the same
  Shiki-highlighted `<pre>` the site's ordinary code blocks use, with
  `<figcaption class="flex-1 truncate">source.config.ts` and the `Copy` control.
- Paths are resolved relative to the MDX file (`remark-include-WlmaWKPS.js`:
  `path.resolve(file.dirname, relativePath)`), so a page under
  `content/docs/components/` reaches the repository root with **five** `../`
  segments.

The probe page and its built output were removed; the probe is repeated as a
verification step in §6 T3 against the real page.

## 3. The convention

Component pages carry a `## Source` section (page template, plan 411 §4):

```mdx
## Source

<include lang="tsx" meta='title="packages/primitives/src/button/button.tsx"'>
  ../../../../../packages/primitives/src/button/button.tsx
</include>
```

Rules:

1. The included path is **relative to the MDX file**; for component pages that is
   `../../../../../<repo-relative sourcePath>` — the page sits at
   `content/docs/components/<slug>.mdx`, five directories below the repository
   root — using the same `sourcePath` the registry record carries (plan 411 §3),
   so the page and the record cannot disagree.
2. The `meta` title is the repo-relative path, so a reader sees which file is
   being shown.
3. `lang` matches the file extension (`tsx`, `ts`, `css`, …). It must be set
   explicitly: a bare `<include>` of a `.tsx` file infers `tsx`, but the explicit
   attribute keeps the intent visible and survives extension-less files.
4. A long file may include a region (`#region-name`) instead of the whole file.
   Region markers follow the plugin's markers (`// #region name` for TS, `<!--
   #region name -->` for MDX). Preferred when the page needs the public API, not
   the whole implementation.
5. **The source is never pasted as a hand-written fence.** A paraphrase or a
   stale copy is what this plan exists to prevent.

## 4. Files to create or change

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/414-copyable-component-source.md` | this plan |
| `.agents/slop/plans/README.md` | index row `414` |
| `.agents/slop/plans/412-preview-strategy.md` | §4 deviation note (custom `component-source.tsx` → Fumadocs `<include>`), status line |
| `apps/docs/src/content-references.test.ts` | **new** — the guard (see §5) |
| `apps/docs/content/docs/api-reference.mdx` | first real usage: `<include>` of `apps/docs/source.config.ts`, explaining the table generator |
| `apps/docs/README.md` | "Adding a component page" step: the `## Source` section and the convention |
| `docs/preview-strategy.md` | tier X note: "source" is the real file via `<include>` |
| `TODO.md` | tick the docs-site copyable-source task; leave the first-real-page task pending |

No file outside the docs-site workstream is touched.

## 5. Test plan — `apps/docs/src/content-references.test.ts`

Vitest, co-located, plain `node:fs`. It reads every `content/docs/**/*.mdx` and
the registry, and asserts:

1. **Every `<include>` resolves.** For each matched
   `/<include\b([^>]*)>([\s\S]*?)<\/include>/g`, resolve the specifier (before
   any `#region`) from the page's directory, or from the app root when the tag
   carries `cwd` (matching the plugin's rule). A target that does not exist is a
   violation. *Fails when a component source is renamed and a page is not
   updated.*
2. **Every named region exists.** A specifier with `#name` requires a region
   marker `name` in the target file (`// #region name`, `/* #region name */`,
   `<!-- #region name -->`, `#region name`). *Fails when the marked block is
   deleted or the marker renamed.*
3. **No silent includes.** A self-closing `<include … />` or an empty body is a
   violation: the plugin skips it and renders **nothing**, so the page silently
   loses content and nothing else notices. *Fails when an author writes the tag
   the way most JSX is written.*
4. **Every `<auto-type-table path="…">` resolves** relative to its page. Same
   class as (1): the prop-table reference must point at a real file.
5. **A finished component's page shows its real source.** For every registry
   entry with `status !== "planned"`, the page
   `content/docs/components/<slug>.mdx` must contain an `<include>` whose
   resolved target equals `apps/docs/../../<entry.sourcePath>`. *Fails when a
   component is finished but its page omits the source — the build cannot catch
   this, because the page is still valid MDX.*

Each check returns the violations it found and asserts the list is empty, so the
failure output names the file and the specifier.

Two-direction proof (AGENTS §3), run before the commit and recorded in §8:

- (1): change the include in `api-reference.mdx` to `../../source.config.tsx` →
  `docs test` fails naming that page; restore → passes.
- (3): temporarily write `<include lang="ts" />` → fails "renders nothing";
  remove it → passes.
- (5): temporarily set `text`'s record to `status: "wip"` with
  `sourcePath: "apps/docs/source.config.ts"`, create
  `content/docs/components/text.mdx` without an include → fails naming `text`;
  remove the record override and the stub page → passes.

## 6. Work breakdown

| # | Task | Deliverable |
| - | ---- | ----------- |
| T1 | Recon | confirm `remarkInclude` is default-on in the installed `fumadocs-mdx` and read its path/region rules (done — §2) |
| T2 | Guard | `content-references.test.ts` with checks 1–5; proven to fail in both directions |
| T3 | First usage | `api-reference.mdx` gains "Where the tables come from" with the real `source.config.ts` include; `docs build` + `curl` prove the rendered code block (repeat of the probe against the real page) |
| T4 | Documentation | `apps/docs/README.md`, `docs/preview-strategy.md`, plan 412 deviation note |
| T5 | Gates | `nub run --filter docs test`, `nub run --filter docs check-types`, `nub run --filter docs build`, `nub run check`, `nub run lint`, `nub run test` |

## 7. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/docs-site`).

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all tests pass; report the count (was 42, plus the new file) |
| `nub run --filter docs check-types` | `fumadocs-mdx` + `tsc --noEmit` exit 0 |
| `nub run --filter docs build` | exit 0; the built page chunk for `api-reference` contains the real `source.config.ts` text |
| `nub run check` | test-quality gate, lint, format, type-check all pass |
| `nub run lint` | exit 0 |
| `nub run test` | every workspace passes |

Live check (dev server, then stop it):

```sh
nub run --filter docs dev &          # http://localhost:3000
curl -s http://localhost:3000/docs/api-reference | tr -d '\000' | grep -c 'createFileSystemGeneratorCache'
curl -s http://localhost:3000/docs/api-reference | tr -d '\000' | grep -o 'Copy\|shiki'
```

Expected: the source text appears, in a Shiki-highlighted block, with a `Copy`
control.

## 8. STOP conditions

Stop and report (do not improvise) if:

- `<include>` does not render in this app after all (the probe says it does;
  if a later build contradicts the probe, capture the command and the built
  output before deciding). Fallback in that case: keep checks (3)–(5) and
  implement the custom `component-source.tsx` from plan 412 §4 with a Vite
  build-time loader, recording the reason.
- An include cannot reach a file outside `apps/docs` in the **Cloudflare**
  build (the app's own Vite build passes; there is no Cloudflare deploy in this
  worktree). Record the evidence and the affected pages; the deploy path is
  `packages/deploy`, which this workstream does not own.
- Check (5) cannot be satisfied without a page file for a component that does
  not exist yet. Do not invent a component: leave (5) vacuous (no entry is
  non-planned today) and keep the two-direction proof for it as a documented
  local experiment.
- A gate fails for a reason outside this workstream. Report the failing
  workspace; do not edit it.

## 9. Acceptance criteria

- [ ] `content-references.test.ts` guards unresolved includes, missing regions,
      silent self-closing includes, `auto-type-table` paths, and the
      finished-component-source rule; each has been shown to fail.
- [ ] `api-reference.mdx` shows the real `source.config.ts`, rendered as a
      highlighted, copyable code block, verified against the dev server.
- [ ] The convention is documented in `apps/docs/README.md` and
      `docs/preview-strategy.md`; plan 412 records the deviation from
      `component-source.tsx`.
- [ ] No hand-copied component source exists on any page (no such fence exists
      today; the rule is written down for the first component page).
- [ ] `nub run check`, `nub run lint`, `nub run test` pass; work committed on
      `agent/docs-site` and pushed.

## 10. Results (implemented 2026-10-17)

- `apps/docs/src/content-references.test.ts` added; `nub run --filter docs test`
  → **10 files, 46 tests passed** (was 10 files, 42 tests).
- Two-direction proof for check (1): with
  `../../source.config.ts` edited to `../../source.config.tsx`,
  `resolves every include to a real file, and every region inside it` failed with
  `api-reference.mdx: include target does not exist: ../../source.config.tsx`
  (the search suite failed too — the index build compiles the same content).
  Restored → 46 passed.
- Two-direction proof for check (3): appending `<include lang="ts" />` to
  `api-reference.mdx` failed `never renders a silent include`; removing it passed.
- Two-direction proof for check (5): with `text` temporarily set to
  `status: "wip"`, `sourcePath: "apps/docs/source.config.ts"` and a
  `content/docs/components/text.mdx` that omitted the source, the check failed
  with `components/text.mdx: apps/docs/source.config.ts is not included`; adding
  the include (five `../` segments) made that check pass. Both edits were
  reverted.
- `nub run --filter docs build` exit 0, and
  `dist/server/assets/api-reference.mdx_macro_id_src_2Flib_2Fsource-*.js`
  contains the real `source.config.ts` text. `curl
  http://localhost:3000/docs/api-reference` renders
  `<figcaption class="flex-1 truncate">apps/docs/source.config.ts`, the `Copy`
  control, `createFileSystemGeneratorCache` and Shiki markup.

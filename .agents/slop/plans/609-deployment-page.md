# 609 — Deployment and hosting have a page: the real Worker path, its measured budgets, and what is not verified

Phase: F
Depends on: 410, 413, 418, 419, 431, 439, 470, 510, 516, 525, 584, 594, 597, 603, 608
Status: implemented

## 1. The measured defect

Plan 608 §8.5 recorded the boundary: **no page owns deployment or hosting**.
Measured 2026-10-20 at `40ad31a1` against the real `search()` the `/api/search`
route calls (harness in §4 step 1):

| Query | First result today | Owning page |
| ----- | ------------------- | ----------- |
| `deployment` | **(nothing)** | Deployment and hosting |
| `deploy` | `/docs/architecture` › *Tooling* | Deployment and hosting |
| `hosting` | `/docs/component-api` (page) | Deployment and hosting |
| `host` | `/docs/component-api` (page) | Deployment and hosting |
| `self-host`, `self host` | Component API › *Shared host props* | Deployment and hosting |
| `cloudflare` | **(nothing)** | Deployment and hosting |
| `workers` | **(nothing)** | Deployment and hosting |
| `custom domain` | `/docs/typography` › *Custom fonts on the pinned runtime* | Deployment and hosting |
| `production build` | `/docs/contributing` › *Docs site* (text) | Deployment and hosting |
| `publish docs` | `/docs/contributing` › *Docs site* (heading) | Contributing (keep) |

Three causes:

1. **The artifact is real, the page is absent.** `apps/docs` builds a Cloudflare
   Worker (`wrangler.jsonc`, the Cloudflare Vite plugin writes
   `dist/server/wrangler.json`), and `packages/deploy/alchemy.run.docs.ts`
   declares the worker `gpuixui-docs` at `docs.gpuixui.dev` with
   `rootDir: "../../apps/docs"`. No page reads any of it. `host` and
   `self host` are misrouted because *host element* is the component meaning.
2. **The budgets are measured but only written down privately.** The live
   surface ships a 20,033,123-byte wasm (19.1 MiB) inside
   `dist/client/gpuix-preview/assets/`; Cloudflare's documented per-asset limit
   is 25 MiB, 20,000 files per Worker version, 64 MiB Worker script. Nothing
   checks those numbers, so a renderer bump could cross one silently.
3. **Plan 608's reason for not writing the page no longer holds.** It said the
   Alchemy deploy path is unverified, so an alias would promise something the
   site cannot keep. But the **artifact** can be verified without an account:
   measured today, `nub x wrangler deploy --dry-run --config dist/server/wrangler.json`
   exits `0` after reading 154 files and reporting `Total Upload: 36964.32 KiB /
   gzip: 2497.79 KiB`. The **account** deploy (`nub run deploy:docs`) still
   needs Cloudflare credentials. The page can now separate the two honestly.

## 2. What to build

### 2.1 `apps/docs/src/lib/deployment.ts` (new, pure, no Node imports)

One module the script, the test and the page's budget table agree on:

```ts
/** The Worker `packages/deploy/alchemy.run.docs.ts` declares. */
export const docsWorker = {
  name: "gpuixui-docs",
  domain: "docs.gpuixui.dev",
  rootDir: "../../apps/docs",
} as const;

/** Cloudflare's documented limits for one Worker version (see §2.4). */
export const cloudflareLimits = {
  bytesPerAsset: 25 * 1024 * 1024,
  assetsPerVersion: 20_000,
  workerBytes: 64 * 1024 * 1024,
} as const;

/** Where the live surface's largest asset lives, repo-relative. */
export const liveSurfaceAssets = "apps/docs/dist/client/gpuix-preview/assets";
```

The module is data only. It must not read the filesystem, so `src/architecture.test.ts`
still proves the docs bundle imports nothing Node-side.

### 2.2 `apps/docs/content/docs/deployment.mdx`

Title **Deployment and hosting**. Sidebar position: directly after
`contributing` in `content/docs/meta.json`. Sections, in order:

1. Intro — one paragraph: this page covers **this documentation site**; shipping a
   desktop app built with the library is a different problem, answered by
   Installation and Troubleshooting, and no packaging guide exists yet.
2. `## What deploys` — a table of the three real declarations: Worker name,
   custom domain, `rootDir`, plus the Alchemy stack path and the app's
   `wrangler.jsonc` compatibility date/flags. Rendered prose, guarded by §4 test 3.
3. `## Build` — `nub run --filter docs build`; what `dist/client` (static
   assets, including `gpuix-preview/`) and `dist/server` (`index.js` plus the
   generated `wrangler.json`) are for; `no_bundle: true`; one copyable `sh` block.
4. `## Verify the artifact without an account` — the new `smoke:deploy`
   command, the three things it proves (build, dry-run packaging, budgets), and
   the `0`/`1`/`2` exit contract. One copyable `sh` block.
5. `## The asset budget` — Cloudflare's per-asset 25 MiB, 20,000 files per
   version and 64 MiB Worker script, and the rule that the live-surface wasm is
   the largest file. No byte count is typed that a build changes; `smoke:deploy`
   prints the measured sizes and fails by name when one crosses its limit.
6. `## Custom domain and canonical URLs` — `docs.gpuixui.dev` is the default in
   `src/lib/site.ts`; `VITE_SITE_URL` overrides it for a preview or self-hosted
   copy, and sitemap, canonical and OpenGraph all follow it (plans 418, 510).
7. `## What is verified, and what is not` — an explicit list. Verified: the
   production build, the dry-run packaging and the local crawls/browser gates.
   **Not verified:** `nub run deploy:docs` (needs Cloudflare credentials) and the
   production host serving `/gpuix-preview/` (tracked in `TODO.md`). The section
   says a reader must not treat the dry run as a deploy.
8. `## Shipping an app built with GPUIXUI` — honest boundary: the runtime is a
   native desktop window with platform-specific `@gpuix/native` bindings; this
   page does not describe packaging one. Link Installation's native-target table
   and Troubleshooting.
9. `## Related` — Contributing, Native testing, Previews, Troubleshooting.

The page is plain MDX; no new MDX component, no new generated table.

### 2.3 `apps/docs/scripts/smoke-deploy.ts` (new)

`nub run --filter docs smoke:deploy` → exit `0` pass, `1` a budget or config
failure, `2` could not verify (build, wrangler or the built tree missing). Mirrors
the house rule that `2` is never a pass.

Order of work inside the script:

1. Unless `--no-build`, run `nub run --filter docs build`; a non-zero exit is
   `2` with `build failed; the deployment was not verified`.
2. Read `apps/docs/dist/server/wrangler.json` (exit `2` if absent). Require:
   `name === docsWorker.name`, `main` resolves beside it,
   `assets.directory` resolves to `dist/client`, and `compatibility_date` /
   `compatibility_flags` match `apps/docs/wrangler.jsonc`. A mismatch is `1`.
3. Run `nub x wrangler deploy --dry-run --config dist/server/wrangler.json
   --outdir <temp dir>`; a spawn failure is `2`, a non-zero exit is `1` with the
   last stderr line. Delete the temp directory in a `finally`.
4. Walk `dist/client`: `files` count and largest file. Sum the Worker's
   JavaScript (`.js`/`.mjs`) under `dist/server`; the generated config sets
   `no_bundle: true`, so those modules are the Worker bundle.
5. Fail (`1`) by name when: `files > cloudflareLimits.assetsPerVersion`; the
   largest file `> bytesPerAsset`; the Worker script `> workerBytes`; or no
   `*.wasm` exists under `dist/client/gpuix-preview/assets` (the budget that
   matters must be measured, not skipped).
6. Print one summary line — file count, largest file and MiB, Worker KiB, dry-run
   `0` — and exit `0`.

Use `node:child_process`/`node:fs` exactly as the other scripts do
(`preview-server.ts`), not Effect: these are CLI boundary scripts in the docs
app whose bundle must stay free of the Effect runtime.

### 2.4 Sources of the limits

Cloudflare's Workers limits page (fetched 2026-10-20,
<https://developers.cloudflare.com/workers/platform/limits/>) documents:
individual static asset **25 MiB**, files per Worker version **20,000** (Free)
and **100,000** (Paid), Worker size **64 MiB** uncompressed. The page names the
Free-plan file count because the repository does not claim a paid plan.

### 2.5 Wiring

- `apps/docs/package.json`: add `"smoke:deploy": "nub scripts/smoke-deploy.ts"`.
- `content/docs/contributing.mdx`: add the smoke row (what it proves, exit
  codes). `src/docs-checks.test.ts` fails until every smoke script is named, so
  this is not optional.
- `content/docs/meta.json`: add `"deployment"` after `"contributing"`.
- `content/docs/architecture.mdx`: make the `@gpuixui/deploy` line a link to
  `/docs/deployment` (the page now exists).
- `apps/docs/README.md`: one `## Deployment` section: the Worker facts, the
  budgets, the dry-run command, and the two unverified items.
- `src/lib/page-aliases.ts`: add a `/docs/deployment` block with `deployment`,
  `deploy`, `deploying`, `hosting`, `host`, `self-host`, `self host`,
  `self-hosting`, `self hosting`, `cloudflare`, `cloudflare workers`, `workers`,
  `custom domain`, `production build`. `publish`, `publish docs` and `release`
  stay with Installation/Contributing as plan 592 left them.
- `src/lib/search.test.ts`: one measured table for the new terms, with the
  regressions (`host` no longer answers Component API for that query;
  `publish docs` still reaches Contributing).
- `scripts/smoke-build.ts`: one production query, `cloudflare` →
  `/docs/deployment`.
- `TODO.md`: tick this plan under the docs workstream and record the measured
  limits; add a cross-team row that `packages/deploy/alchemy.run.docs.ts`'s
  comment still says "Nothing deploys yet" (outside `docs-site`'s paths).

## 3. Commands and expected results

Run from `apps/docs` unless stated. A different result is a STOP condition.

1. `nub run test -- src/lib/search.test.ts` (or `nub exec vitest run src/lib/search.test.ts`)
   → the new deployment table fails before the alias block lands, naming the
   queries from §1.
2. `nub exec vitest run src/lib/page-aliases.test.ts` → green: no key outlives a
   page, no term is shared, no term shadows a page or component name.
3. `nub run build` → exit `0`; `dist/client` and `dist/server/wrangler.json`
   exist.
4. `nub run smoke:deploy` → exit `0` and one summary line; the measured run on
   this host is 149 client files, largest `gpuix-preview/assets/gpuix-web_bg-*.wasm`
   19.1 MiB, the Worker's JavaScript 36.1 MiB, dry-run `0`.
5. `nub run --filter docs test` → every file passes, including the new
   `src/deployment-page.test.ts`.
6. `nub run --filter docs check-types` → exit `0`, no output.
7. `nub run --filter docs smoke:build` → all pages render, the `cloudflare`
   query returns `/docs/deployment`, exit `0`.
8. From the repo root: `nub run check`, `nub run lint`, `nub run test` → green.

## 4. Test plan

`apps/docs/src/deployment-page.test.ts` must be able to fail in both directions.
It reads the page and the real sources, in the style of
`installation-page.test.ts` and `troubleshooting-page.test.ts`:

1. **Registered:** `source.getPages()` serves `/docs/deployment`; `meta.json`
   lists it directly after `contributing`; the frontmatter title and description
   are the page's.
2. **Sections:** every `##` heading from §2.2 is present exactly once.
3. **Worker truth:** parse `packages/deploy/alchemy.run.docs.ts` for `name`,
   `domain` and `rootDir`, and `apps/docs/wrangler.jsonc` for `name`,
   `compatibility_date` and `compatibility_flags`; assert `docsWorker` equals the
   first three and the page names all six. If the stack is renamed or the
   rootDir moves, the test fails by name.
4. **Canonical truth:** `SITE_URL`'s default is `https://${docsWorker.domain}`;
   the page names the domain and `VITE_SITE_URL`.
5. **Budget truth:** the page states 25 MiB, 20,000 files and 64 MiB; those
   numbers equal `cloudflareLimits`. The real wasm and file count are measured
   by `smoke:deploy`, not here: `dist/` is a build artifact, so the unit suite
   must stay green on a clean checkout. The smoke fails with the measured size
   when a renderer bump crosses a limit.
6. **Check truth:** `package.json` defines `smoke:deploy`; `scripts/smoke-deploy.ts`
   exists; the page names the command and the `0`/`1`/`2` contract.
7. **Honesty:** the page contains a "not verified" statement naming **Cloudflare
   credentials** and the production `/gpuix-preview/` asset; the test rejects a
   page that says the remote deploy is verified (`/deployed|deploys automatically/`
   in the verified list) and a page that omits the dry-run limit.
8. **Links:** the page's `/docs/...` links resolve to served pages (repo-wide
   guards already check fragments; this test asserts the five links exist by
   name).

`src/lib/search.test.ts` gains one table: every §1 query reaches
`/docs/deployment` first except `publish docs` (Contributing), and `host props`
still reaches Component API.

Two-direction proofs (run each, record the result, revert):

1. Remove `"deployment"` from `meta.json` → `content.test.ts` fails on the
   un-ordered page; restore.
2. Change the Worker name in the page → test 3 fails with the real name.
3. Set `cloudflareLimits.bytesPerAsset` to `1` → `smoke:deploy` exits `1`
   naming the wasm; restore and re-run to `0`.
4. Change `docsWorker.name` → `smoke:deploy` exits `1` on the generated config;
   restore.
5. Remove the `/docs/deployment` alias block → the new search table fails on
   `deployment`; restore.
6. Remove the `smoke:deploy` row from `contributing.mdx` → `docs-checks.test.ts`
   fails naming the script; restore.

## 5. STOP conditions

- The dry run requires authentication or a network account → **stop**, keep the
  page's "not verified" section, record the exact error, and do not claim the
  artifact was verified.
- The wasm or the client tree is missing from a clean `nub run build` → stop and
  report the build output; do not add a skip.
- Any real size exceeds a documented limit → stop; the page may state the
  overflow, but the plan is not done until the limit is resolved or the
  deployment target changes.
- A required fact cannot be derived from a real file (e.g. the domain lives only
  in prose) → stop; do not invent a source.

## 6. Acceptance

- `/docs/deployment` is served, in the sidebar, in the sitemap, the search
  index and `/llms.txt`, with the sections above.
- `smoke:deploy` runs without credentials on this host and exits `0`; a forced
  budget violation exits `1`; a missing build/wrangler exits `2`.
- The page and the real declarations cannot drift: the test derives the worker,
  domain, rootDir, compatibility facts, limits and the wasm size from the tree.
- The measured deployment queries reach the page; `publish docs` and `host
  props` keep their owners.
- `nub run check`, `nub run lint`, `nub run test`, the docs suite, type-check,
  build and the built-site smoke are green.
- No COMPONENTS.md row is owed: this is a page about the docs site, not a
  component. The inventory is untouched.

## 7. What was measured

Implemented 2026-10-20 at `5aa473a6` plus this change, on the docs worktree.

**Files:** `src/lib/deployment.ts` (facts, JSONC readers), `src/lib/deployment-page.test.ts`
(9 tests), `scripts/smoke-deploy.ts`, `content/docs/deployment.mdx`, the
`smoke:deploy` script/row, sidebar entry, Architecture link, `page-aliases.ts`,
the search table, the production query and `apps/docs/README.md`.

**The artifact, measured:**

```text
nub run smoke:deploy
deploy: 149 files, largest dist/client/gpuix-preview/assets/gpuix-web_bg-*.wasm 19.1 MiB, worker 36.1 MiB, dry run 0
exit 0
```

`wrangler deploy --dry-run` read 154 files and reported
`Total Upload: 36964.32 KiB / gzip: 2497.79 KiB`. The Worker's JavaScript
(`dist/server`, 142 modules) is 36.1 MiB against the 64 MiB limit.

**Gates:**

- `nub run test` (root): green — docs `120` files / `1 095` tests, primitives
  25 / 282 and the rest of the workspace unchanged.
- `nub run check`, `nub run lint`: green (the formatter rewrote three new files
  before the second run).
- `nub run --filter docs check-types`: green.
- `nub run --filter docs build`: green.
- `nub scripts/smoke-build.ts --no-build`: green — 103 pages, 227 links,
  1 340 anchors, search checked (including `cloudflare`), exit `0`.

**Two-direction proofs (each run, then reverted):**

1. Removed `"deployment"` from `meta.json` → `content.test.ts` failed:
   `orders every top-level page on disk in the sidebar`.
2. Changed the page's Worker name to `gpuixui-docs-old` → `deployment-page.test.ts`
   failed: `states the Worker the deploy stack really declares`, listing
   `` `gpuixui-docs` ``.
3. Set `cloudflareLimits.bytesPerAsset` to `1` → `smoke:deploy` exited `1`:
   `FAIL dist/client/gpuix-preview/assets/…wasm is 19.1 MiB, over the 0.0 MiB
   per-asset limit`.
4. Changed `docsWorker.name` → `smoke:deploy` exited `1` with both
   `generated Worker name …` and `wrangler.jsonc name …`.
5. Removed the `/docs/deployment` alias block → the plan-609 search row failed
   with `custom domain -> heading:/docs/deployment#custom-domain-and-canonical-urls`
   and `production build -> text:/docs/deployment#what-is-verified-and-what-is-not`.
6. Removed the `smoke:deploy` row from `contributing.mdx` →
   `docs-checks.test.ts` failed: `names every docs-site smoke check` listing
   `smoke:deploy`.

**A measured regression the gate caught:** after the page landed,
`smoke:build`'s existing `shared host props` query moved to `/docs/deployment`
first. The section's full name is now an explicit Component API alias and the
production query is green. This is recorded rather than hidden: adding a page
changes the lexical ranking of every page, and the production search check is
the guard that notices.

**Not measured:** the account deploy (`nub run deploy:docs`) and the production
host serving `/gpuix-preview/`; both need credentials or a deployment URL.

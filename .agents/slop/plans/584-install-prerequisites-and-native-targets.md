# 584 — Installation states its prerequisites and the published native targets

**Phase:** F (documentation completeness)
**Workstream:** docs-site
**Depends on:** 410 (docs site), 413 (page metadata), 419/431/568/574
(search), 426 (prose truth), 583 (the last reader-vocabulary pass)
**Status:** implemented

## 1. The measured defect

The Installation page is the page a new consumer follows, and it begins with
"The workspace is under construction" without ever saying **what the machine
must provide** or **which platforms GPUix actually publishes a binary for**. A
reader on Intel macOS follows the install and discovers the missing binding at
runtime; a reader searching for the requirement never reaches the page at all.

Measured on 2026-10-19 with the real `search()` over the real index
(`search(term, 3)`, first three URLs):

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `prerequisites` | *nothing* | Installation |
| `requirements` | `/docs/previews#the-full-rules`, `/docs/roadmap` | Installation |
| `system requirements` | `/docs/dark-mode#the-application-owns-the-mode` | Installation |
| `platform support` | `/docs/theming#platform-styles`, `/docs/tokens-api#functions` | Installation |
| `x86_64` | *nothing* | Installation |
| `arm64` | *nothing* | Installation |
| `intel mac` | `/docs/getting-started#the-native-playground` | Installation |
| `apple silicon` | `/docs/api-values` | Installation |

The facts already exist in the repository, but not on the page:

- `package.json` (`engines.node`) and `.node-version` pin **Node 24.18.0**.
- `package.json` (`devEngines.packageManager`) pins **nub ^0.9.6**.
- the root catalog pins **`@gpuix/react@0.10.0`** and
  `apps/docs/package.json` depends on **`@gpuix/native@0.10.0`**.
- the installed `@gpuix/native@0.10.0` package declares three `napi.targets`
  and three optional binary packages: `aarch64-apple-darwin`,
  `x86_64-unknown-linux-gnu`, `x86_64-pc-windows-msvc`. **There is no
  `x86_64-apple-darwin` (Intel macOS) target.**
- the repository's own remedy for Intel macOS is
  `sh apps/playground/scripts/build-native-binding.sh` (plan 140 §5,
  `apps/playground/README.md` §"The binding on this host").

This is not a ranker defect. The page has no prerequisites section, no platform
table and no summary that names either subject. Plans 568/574 already made a
page's authored `description` a search signal, and plan 426 already requires the
install page to describe what the reader really needs; this plan supplies the
missing facts and derives them.

## 2. What to build

### 2.1 `apps/docs/src/lib/native-platforms.ts` (new)

A browser-safe table, authored once and guarded against the installed package.
It must not import `node:*`.

```ts
/** The pinned native release the library and this site target. */
export const GPUixVersion = "0.10.0";

export interface NativePlatform {
  /** The Rust target exactly as `@gpuix/native`'s `napi.targets` spells it. */
  readonly target: string;
  /** The reader-facing platform label. */
  readonly label: string;
  /** The optional package that carries the prebuilt binary. */
  readonly packageName: string;
  readonly published: boolean;
}

/**
 * Every platform a reader can install today, plus the one that has no
 * published binary. `native-platforms.test.ts` compares the published rows
 * with the installed package's real `napi.targets` and optional dependencies.
 */
export const nativePlatforms: ReadonlyArray<NativePlatform> = [
  { target: "aarch64-apple-darwin", label: "macOS · Apple silicon", packageName: "@gpuix/native-darwin-arm64", published: true },
  { target: "x86_64-apple-darwin", label: "macOS · Intel", packageName: "@gpuix/native-darwin-x64", published: false },
  { target: "x86_64-unknown-linux-gnu", label: "Linux · x64", packageName: "@gpuix/native-linux-x64-gnu", published: true },
  { target: "x86_64-pc-windows-msvc", label: "Windows · x64", packageName: "@gpuix/native-win32-x64-msvc", published: true },
];
```

Do not name the page's prose from this module; the MDX note below carries the
explanation.

### 2.2 `apps/docs/src/components/native-platforms.tsx` (new)

Render the table from `nativePlatforms`, in the same plain semantic HTML the
other generated tables use. No colour literal, no hand-written target row.

Columns: **Platform**, **Rust target**, **Prebuilt binary**. A published row
says `Yes`; the Intel row says `No — build from source`. Each `<tr>` carries
`data-target` and `data-published` so the test can compare the rendered set
without parsing prose.

### 2.3 `apps/docs/content/docs/installation.mdx`

Update the frontmatter description so the page owns the subject words (the
plan-568 mechanism):

```yaml
description: Add GPUIXUI to a GPUix application: prerequisites and system requirements, the native binding targets for macOS, Linux and Windows, and the install commands.
```

Insert after the opening paragraph and before `## Packages are not published
yet`:

```mdx
## Prerequisites

GPUIXUI runs inside a GPUix application, so install and pin GPUix first. A
clean checkout of this repository also needs the following; the versions are
the ones the workspace pins, and a test fails when this table and the manifests
disagree.

| Requirement | Pinned version | Why |
| ----------- | -------------- | --- |
| Node.js | `24.18.0` | `.node-version`; `engines.node` in the root `package.json` |
| nub | `^0.9.6` | `devEngines.packageManager`; every command in this repository runs through it |
| GPUix | `0.10.0` | `@gpuix/react` and `@gpuix/native` are pinned together in the workspace catalog |
| A desktop session | — | a native GPUix window needs one; `check-types` and the unit suites run headless |

## Native bindings

`@gpuix/native` ships a prebuilt binary for the targets below. A platform
without one installs the JavaScript package but cannot create a window.

<NativePlatforms />

GPUix **0.10.0 publishes no Intel macOS (`x86_64-apple-darwin`) binary**. This
repository builds the identical 0.10.0 source on that host with
`gpui_macos`'s `runtime_shaders` feature:

```sh
sh apps/playground/scripts/build-native-binding.sh
```

The script installs the pinned Rust toolchain, builds the cdylib and places
`gpuix-native.darwin-x64.node` under `node_modules/@gpuix/native/`. It is the
same repository remedy the playground's native suite documents; the shipped
package's provenance and the measured result are on [GPUix
capabilities](/docs/capabilities) and [Native smoke suite](/docs/native-testing).
A published-binary run on CI remains the gold standard.
```

Keep the existing "Packages are not published yet", "The intended install" and
"TypeScript" sections unchanged. Do not claim a fourth published target, a
Windows arm64 build or an Intel macOS release.

### 2.4 `apps/docs/src/components/mdx.tsx`

Register `NativePlatforms` beside the other page blocks so MDX can render it.

### 2.5 `apps/docs/src/lib/native-platforms.test.tsx` (new)

Two suites in one file.

**Data guard.** Resolve the installed package from the app, not a hard-coded
path:

```ts
import { createRequire } from "node:module";
const resolve = createRequire(import.meta.url).resolve;
const packagePath = join(dirname(resolve("@gpuix/native")), "package.json");
const native = JSON.parse(readFileSync(packagePath, "utf8"));
```

`node:fs`/`node:path` are deliberate: this is a vitest boundary reading an
installed package, the same pattern `accessibility.test.ts` and
`typography-truth.test.ts` already use.

Assertions:

- `native.version === GPUixVersion`.
- `native.napi.targets` equals the `target`s of every `published` row, in the
  same order.
- every `published` row's `packageName` is a key of
  `native.optionalDependencies` at exactly `GPUixVersion`.
- no `unpublished` row's package name is an optional dependency.
- `nativePlatforms` has no duplicate target and every label is non-empty.
- **the forced direction:** flipping `published` on the Intel row fails the
  target comparison by name; adding a fourth published row fails it too.

**Render guard.** `renderToStaticMarkup(<NativePlatforms />)` contains one
`data-target` per row, the same `data-published` count as the data, every
label, and the word `source` on the Intel row.

### 2.6 `apps/docs/src/lib/installation-page.test.ts` (new)

Read `content/docs/installation.mdx` and assert:

- the page carries `## Prerequisites`, `## Native bindings` and
  `<NativePlatforms />`, in that order before `## Packages are not published
  yet`;
- the Node version string equals the root `.node-version` trimmed;
- the nub version string equals `devEngines.packageManager.version`;
- the GPUix version string equals the root catalog's `@gpuix/react` value and
  `apps/docs/package.json`'s `@gpuix/native` devDependency range;
- the script path `apps/playground/scripts/build-native-binding.sh` exists;
- the description names `prerequisites` and `platform` (the search subjects).

The test reads the manifests with `node:fs`; it is a Node test, not a browser
module.

### 2.7 `apps/docs/src/lib/platform-search.ts` (new)

The native-binding table is rendered React, so the Fumadocs page index cannot
see its rows. Add one `GeneratedSearchEntry` (the plan-504/505 pattern):

- `url: "/docs/installation#native-bindings"`, `breadcrumbs: ["Installation"]`;
- `title: "Platform support"`, content = the pinned GPUix version, every
  platform label, every Rust target and the published/not-published state, all
  read from `nativePlatforms` so it cannot drift;
- `names: ["platform support", "native bindings", "native platforms"]` —
  multi-word names only. `promotedNameRank` gives an exact query rank `0`, which
  beats Theming's `Platform styles` heading token match; a single plain word
  (`platform`, `binding`) is never promoted (plan 569's rule).

Register it in `src/lib/search.ts`'s `generatedEntries`. `platform-search.test.ts`
proves every row is carried, the exact phrases rank `0`, and `platform` /
`binding` rank `undefined`.

### 2.8 `apps/docs/src/lib/search.test.ts`

Add one measured case after the plan-583 case:

```ts
it("finds the installation prerequisites and native platform support (plan 584)", async () => {
  const expected = [
    ["prerequisites", "/docs/installation"],
    ["system requirements", "/docs/installation"],
    ["requirements", "/docs/installation"],
    ["platform support", "/docs/installation"],
    ["x86_64", "/docs/installation"],
    ["arm64", "/docs/installation"],
    ["intel mac", "/docs/installation"],
    ["apple silicon", "/docs/installation"],
  ] as const;
  // Same misses shape as the plan-583 case: split the first result at "#".
});
```

The table above is the before state; every row must fail before the page change
and pass after it. `requirements` and `platform support` may land on a heading
inside the page rather than the page URL; the existing assertion strips the
fragment, so both are acceptable.

### 2.9 `apps/docs/scripts/smoke-build.ts`

Add two production checks to `searchChecks`:

```ts
{
  query: "prerequisites",
  expected: "/docs/installation",
  first: true,
  what: "the installation page's prerequisites section",
},
{
  query: "platform support",
  expected: "/docs/installation",
  first: true,
  what: "the native binding target table",
},
```

### 2.10 `apps/docs/README.md`

Add a short subsection beside the other table guards:

- the page derives its platform rows from `nativePlatforms`, whose published
  set is compared with the installed `@gpuix/native`'s `napi.targets`;
- the prerequisites table's three versions are compared with the real
  manifests, and the Intel row is an explicit absence, not a promise;
- the search subjects (`prerequisites`, `platform support`, `x86_64`,
  `intel mac`) are guarded by `search.test.ts` and two production queries.

## 3. Commands, in order

Run from `/Users/cyberistic/GPUIXUI/workspaces/docs-site`.

1. `nub run --filter docs test -- src/lib/installation-page.test.ts src/lib/native-platforms.test.tsx` — expected: both files fail first (the page and module do not exist), then pass after §2.1–§2.6. Capture the failing run before the page change.
2. `nub exec vitest run src/lib/search.test.ts --reporter=verbose` (from `apps/docs`) — expected before: the new plan-584 case names every missing row; after: passes.
3. `nub run --filter docs check-types` — expected `0`.
4. `nub run --filter docs build` — expected `0`.
5. `nub run --filter docs smoke:build` — expected exit `0`; the crawl must report the two new production queries and a 98+ page site.
6. `nub run check` and `nub run lint` at the repo root — expected `0`.

## 4. STOP conditions

- Stop if `@gpuix/native`'s installed `napi.targets` is not the three targets in
  §1. Record the actual list and the version; do not edit the table to match a
  guess.
- Stop if `apps/playground/scripts/build-native-binding.sh` is absent or its
  README section no longer describes the Intel build. Report the moved path;
  do not link a dead script.
- Stop if the root `.node-version` or `devEngines.packageManager.version` is not
  the value in §1. Report both; the page must state the manifests, not this
  plan.
- Stop if `search("prerequisites")` still returns no Installation result after
  the page change. That means the page summary or prose is not in the index;
  report the built index, do not add a ranker special case.
- Do not add a new generated script or `props.generated.ts`-style module for
  four rows. The data guard is the derivation.

## 5. Acceptance

- The Installation page has `## Prerequisites` and `## Native bindings` before
  the install commands, with the exact pinned Node/nub/GPUix versions.
- The platform table is rendered from `nativePlatforms`; its published rows
  equal the installed package's `napi.targets` and optional dependencies, and
  Intel macOS is an explicit, evidenced absence with the source-build script.
- Eight measured search queries reach `/docs/installation` (page or fragment),
  and two are checked against the production index by `smoke:build`.
- `installation-page.test.ts`, `native-platforms.test.tsx`, the new search case
  and both smoke queries fail without the change and pass with it (record the
  failing output in §6 of this plan).
- `nub run check`, `nub run lint`, `nub run test`, docs `check-types`, `build`
  and `smoke:build` are green.
- `TODO.md` ticks the task and the docs-site totals count it; the plan index
  lists this plan as implemented.

## 6. Measured runs

Implemented on 2026-10-19 in `workspaces/docs-site`.

### After

- `nub run --filter docs test` — **100 files / 715 tests passed**. The new
  suites are `native-platforms.test.tsx` (7), `installation-page.test.ts` (6),
  `platform-search.test.ts` (4) and the plan-584 case in `search.test.ts`.
- The eight measured queries now return `/docs/installation` first (or a
  fragment of it): `prerequisites`, `system requirements`, `requirements`,
  `platform support`, `x86_64`, `arm64`, `intel mac`, `apple silicon`.
- `nub run --filter docs smoke:build` — exit `0`, **98 pages / 121 links /
  1 279 anchors / search checked**, so both production queries
  (`prerequisites`, `platform support`) answer from the built Worker.
- `nub run check` — test-quality, lint, format and every workspace type-check
  green. `nub run test` — every workspace green (docs 715, components 308,
  primitives 282, and the remaining packages).

The rendered table is now a generated search entry (`platform-search.ts`).
The first attempt without it left `platform support` on
`/docs/theming#platform-styles`: the heading `Platform styles` earns a token
rank of 6, while Installation's description earned 7. The entry's title
`Platform support` is an exact page-title match, and its multiword names also
promote `native bindings` / `native platforms`; a plain `platform` or `binding`
remains unpromoted.

The landing quick-start test used the **first** `sh` fence on the Installation
page. The page now carries the Intel build script before the install block, so
`landing.test.tsx` selects the fence containing `nub install` instead of the
first one. The assertion is unchanged: the landing page still mirrors the real
install commands.

### Forced defects (all measured, then reverted)

| Forced change | Failure it produced |
| ------------- | ------------------- |
| `nativePlatforms` Intel row set to `published: true` | 4 tests: the target list gained a fourth row (`aarch64-apple-darwin, …(3)`), the optional-dependency check reported `@gpuix/native-darwin-x64`, the unpublished-row check expected `x86_64-apple-darwin` and got `[]`, and the render lost `build the pinned source` |
| `platformSearchEntry` removed from `generatedEntries` | `search.test.ts` plan-584 case: `platform support -> /docs/theming` |
| Installation page Node version changed to `24.18.1` | `installation-page.test.ts` "states the pinned Node and nub versions": expected the page to contain `` `24.18.0` `` |

The pre-fix search run in §1 is the fourth proof: every query in that table
missed `/docs/installation` before the page and the generated entry existed.

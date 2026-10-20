# 602 — Architecture states the runtime contract: Effect and what runs where

**Phase:** F (documentation platform, architecture truth)
**Workstream:** docs-site
**Depends on:** 410, 419, 431, 459, 568, 574, 598, 601
**Status:** implemented — §6 records the commands, the 8-test suite and the two measured page/alias proofs

## 1. The measured defect

`MISSION.md` makes Effect a first-class architectural principle and requires the
docs to explain what actually runs where. The Architecture page names every
package, the tooling and the preview tiers, but it never says **where Effect
lives** or **which runtime renders what**, so the vocabulary has no owner and
the search ranker sends each query to whichever component happened to write the
word.

Measured 2026-10-20 at `d230eb2d` with the real index (`search(query)` in
`apps/docs/src/lib`):

| Query | First result today | Owning page |
| ----- | ------------------ | ----------- |
| `effect` | `/docs/components/confirm-dialog#keyboard-and-focus` (a *Key / Effect* table) | Architecture (`## State and Effect`) |
| `effect ts` | same table | Architecture |
| `effect runtime` | same table | Architecture |
| `effect-native` | same table | Architecture |
| `managed runtime` | `/docs/contributing#native-runtime` (a heading about the *native* runtime) | Architecture |
| `browser` | `/docs/patterns/project-browser` (a pattern, not support) | Architecture (`## What runs where`) |
| `browser build` | `/docs/patterns/project-browser` | Architecture |
| `run in browser` | `/docs/components/inline-edit` | Architecture |
| `web app` | `/docs#where-to-start` text chunk | Architecture |
| `ssr` | **nothing** | Architecture |
| `server rendering` | `/docs/components/date-picker#…` text chunk | Architecture |
| `hydration` | **nothing** | Architecture |

Why this is structural, not a ranker bug:

- **`Effect` is a word in a keyboard table.** Four component pages write
  `| Key | Effect |`; the library's actual Effect usage (the toast runtime, the
  `core/` decision layer, the app-owned clock) is stated only in per-component
  prose, never once at the architecture level. No rank can invent a page that
  says it.
- **`browser` is a pattern name.** `Project browser` is the only page whose
  title carries the word, so a support question ("does this run in a browser?")
  lands on a composition of `SearchInput` + `List`.
- **The site's own rendering model is undocumented.** The docs are
  server-rendered and the previews hydrate from state the providers publish on
  `<html>` (`data-platform`, the `dark` class, `theme-surface.tsx`). That is why
  a shared `?platform=win32` link paints the right preview, and nothing states
  it (`ssr`, `hydration` return nothing).

The fix is the one this page already owes: two sections backed by real source,
and a guarded alias table for the vocabulary (plans 598, 599, 601).

## 2. What to build

### 2.1 `apps/docs/content/docs/architecture.mdx`

**Replace `## The site and the runtime` with `## What runs where`.** Keep the
existing honesty sentences and add one table (three rows), then the hydration
paragraph:

```mdx
## What runs where

| Surface | Renderer | What it proves |
| ------- | -------- | -------------- |
| A desktop app using the library | GPUix's native renderer (`@gpuix/native`) | the target the components are built and tested against |
| The live previews on this site | the published GPUix **WebAssembly** renderer, in an isolated document under `/gpuix-preview/` | the real component code paints; it is not a DOM imitation |
| This site's own chrome | React in the browser, server-rendered by TanStack Start and hydrated | documentation only — its shell never imports the native runtime |

The library is not a DOM component set: every component renders GPUix host
elements, so the same code paints under the desktop binary and — through the
published wasm build — inside a browser. That is the only browser story the
project has; there is no HTML/CSS build of the components, and a browser
approximation on this site is labelled as one.

This site is server-rendered and then hydrated. The previews take their mode
and platform from what the providers publish on `<html>` — `data-platform` and
the `dark` class — through one `useSyncExternalStore` snapshot, so a preview
cannot disagree with the chrome around it and a shared `?platform=` link paints
the right surface after hydration.
```

**Add `## State and Effect`** immediately after `## Library packages` (before
`## Tooling`):

```mdx
## State and Effect

Effect is part of the architecture, not of the component API. Two rules hold
across the packages:

- **Decisions are plain functions, and failure or absence is data.** The
  `core/` layer under `@gpuixui/primitives` is written in Effect's data modules
  (`Option`, `Array`, `Order`), so a decision has no nullable return and no
  thrown error to forget. [Extending](/docs/extending) documents that layer.
- **A runtime exists only where a component owns ongoing work.** `ToastProvider`
  is the one case: it creates a `ManagedRuntime` over the toast store's `Layer`
  and `useToast()` sends commands to it. No other component starts a runtime.

What stays with the application: time and validation. `Countdown` owns no timer
and renders the `remainingMs` your clock passes; `validate` returns an
`Effect` that the caller runs. Using the components does not require writing
Effect code — `@gpuixui/components` declares `effect` as a dependency because
its toast runtime needs it, and `@gpuixui/tokens` has no dependencies at all.
```

No `<include>`: the source these claims point at is already included where it
belongs (Toast's viewport source on its page, `core/` on Extending), and the
section is four claims, each guarded against the real file in §2.2.

### 2.2 The guard — `apps/docs/src/architecture-runtime.test.ts`

A new suite, in the shape of `typography-truth.test.ts`: read the page once and
the real source once, and require each claim to exist in both directions.

| Test | Page requires | Source it must match |
| ---- | ------------- | -------------------- |
| toast runtime | `ToastProvider`, `ManagedRuntime` | `packages/components/src/toast/provider.tsx` contains `ManagedRuntime.make` and a `Layer` |
| Effect is a declared dependency | `` declares `effect` `` | `packages/components/package.json` `dependencies.effect` is present |
| time stays at the boundary | `Countdown`, `remainingMs` | `packages/components/src/countdown.tsx` contains `remainingMs` and no `setInterval` / `setTimeout` |
| preview state is published, not guessed | `data-platform`, `dark`, `useSyncExternalStore` | `apps/docs/src/components/preview/theme-surface.tsx` contains all three |
| the live surface is the wasm document | `/gpuix-preview/`, `WebAssembly` | `apps/docs/public/gpuix-preview/index.html` exists |
| the page has the two sections | `## State and Effect`, `## What runs where` | — |

Each failure must name the claim and the file. Never assert that a paragraph
equals a string: assert the token that makes the claim true.

### 2.3 Search vocabulary

`apps/docs/src/lib/page-aliases.ts` gains one key (header comment records the
fourth pass):

```ts
[
  "/docs/architecture",
  [
    "effect",
    "effect ts",
    "effect runtime",
    "managed runtime",
    "fiber",
    "browser",
    "browser build",
    "run in browser",
    "runs in browser",
    "web app",
    "ssr",
    "server rendering",
    "hydration",
  ],
],
```

`apps/docs/src/lib/page-aliases.test.ts`: `owned` gains the twelve rows above;
`regressions` gains `project browser` → `/docs/patterns/project-browser`,
`webassembly` → `/docs/previews`, `countdown` → `/docs/components/countdown`,
`toast` → `/docs/components/toast`, `effects` → `undefined` is not a page (do
not add it), and `architecture` → `/docs/architecture`.

`apps/docs/scripts/smoke-build.ts`: one production query, `effect` →
`/docs/architecture` (`first: true`).

### 2.4 Maintainer note

`apps/docs/README.md`: the page-alias paragraph gains the fourth-pass sentence
naming the runtime vocabulary and the production query.

## 3. Order of work and commands

Run from `apps/docs` unless stated.

1. Write `content/docs/architecture.mdx` (§2.1).
2. Write `src/architecture-runtime.test.ts` (§2.2).
3. `nub run --filter docs test src/architecture-runtime.test.ts` → the six
   tests pass **after** the page is written; see §5 for the failing direction.
4. Add the aliases and the test tables (§2.3).
5. `nub run --filter docs test src/lib/page-aliases.test.ts` → all pass,
   including the twelve new owned queries.
6. Add the production query and the README sentence.
7. `nub run --filter docs check-types` → exit `0`.
8. `nub run --filter docs test` → exit `0`; record the reported file/test counts
   in §6.
9. `nub run --filter docs smoke:build` → exit `0`; record the page count and
   `smoke: search checked`.
10. Root gates: `nub run check`, `nub run lint`, `nub run test` → exit `0`.

## 4. STOP conditions

- **Stop** if the page would have to claim Effect is a public API: it is not.
  The Toast provider is the only runtime; do not generalise.
- **Stop** if a claim cannot be tied to a real file. A sentence with no source
  in §2.2 is deleted, not softened.
- **Stop** if `browser` or `web app` shadows a page title or a component name
  (`page-aliases.test.ts` will say so); report the collision instead of adding a
  ranker tier.
- **Stop** if `webassembly` stops reaching Previews: the alias table must not
  claim a word another page already owns (plan 574).
- **Stop** if `smoke:build` exits `2` (cannot run); report it as unverified, not
  as a pass.
- Do **not** touch `apps/docs/src/architecture.test.ts`: it guards the app's
  bundle boundary (no `effect` in a non-test module), and the new suite is a
  page-truth suite, not a bundle guard.

## 5. Test plan

Each direction run and reverted (record the exact message in §6):

1. Delete `## State and Effect` from the page → the section test fails by name.
2. Remove the word `ManagedRuntime` from the page → the toast-runtime test
   fails with the page path.
3. Remove `"effect"` from the `@gpuixui/components` dependencies (in memory,
   revert immediately) → the dependency test fails with the package path.
4. Add a `setInterval` to `countdown.tsx` → the boundary test fails by name.
5. Remove `data-platform` from `theme-surface.tsx` → the preview-state test
   fails with the file path.
6. Remove `"effect"` from the alias table → the `effect → /docs/architecture`
   case fails with the old ConfirmDialog URL; with it restored,
   `smoke:build`'s `effect` query passes.
7. Add `"webassembly"` to the architecture aliases → the shadow/ownership guard
   fails, proving the table cannot steal a page's subject.

Regressions measured in the same suite: `project browser` → the pattern page,
`webassembly` → Previews, `countdown` → Countdown, `toast` → Toast,
`architecture` → Architecture.

## 6. Measured results

### 6.1 What shipped

- `apps/docs/content/docs/architecture.mdx` — `## State and Effect` (toast
  `ManagedRuntime`, the `core/` decision layer, the app-owned clock and
  validation, the declared `effect` dependency) and `## What runs where` (the
  desktop renderer / wasm live surface / SSR-and-hydrated docs chrome table,
  the no-DOM-library statement, the published `data-platform` / `dark` state).
  The frontmatter summary now names Effect, the browser story and the
  hydration model, because a page summary is a search signal (plan 568).
- `apps/docs/src/architecture-runtime.test.ts` — 8 tests (7 fixture rules +
  the real-page check).
- `apps/docs/src/lib/page-aliases.ts` — one key, fourteen terms.
- `apps/docs/src/lib/page-aliases.test.ts` — 99 tests (was 79): fourteen `owned`
  rows and five regressions.
- `apps/docs/scripts/smoke-build.ts` — `effect`, `browser` and `hydration` →
  `/docs/architecture` (`first: true`).
- `apps/docs/README.md` — the fourth-pass paragraph.

Measured after the change: `effect` → `/docs/architecture`,
`browser` → `/docs/architecture`, `browser build` → `/docs/architecture`,
`run in browser` → `/docs/architecture`, `web app` → `/docs/architecture`,
`ssr` → `/docs/architecture`, `server rendering` → `/docs/architecture`,
`hydration` → `/docs/architecture`, `managed runtime` → `/docs/architecture`,
`fiber` → `/docs/architecture`, `effect ts` → `/docs/architecture`,
`effect runtime` → `/docs/architecture`, `webassembly` → `/docs/architecture`.

Non-fixes, measured and kept: `wasm` stays on `/docs/previews` (plan 574 owns
the tier vocabulary), `project browser` keeps the pattern page, and `keypress`
and `keyup` still have no owner — keyboard **event names** are a separate
vocabulary question from plan 601's conventions (the runtime exposes
`onKeyDown` only), and this plan does not invent a page for them.

### 6.2 Commands run

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test src/architecture-runtime.test.ts` | 1 file / **8 tests** pass |
| `nub run --filter docs test src/lib/page-aliases.test.ts` | 1 file / **99 tests** pass |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs test` | **113 files / 925 tests** pass (was 898) |
| `nub run --filter docs smoke:build` | 99 pages, 220 links, 1 290 anchors, search checked, **exit `0`** |
| root `nub run check`, `nub run lint`, `nub run test` | exit `0`; docs reports 113 files / 925 tests |

### 6.3 Two-direction proofs (each run, then reverted)

| # | Forced defect | Measured failure |
| - | ------------- | ---------------- |
| 1 | rename `## State and Effect` to `## Effect and state` | the real-page test fails: `the page has no `## State and Effect` section` |
| 2 | point the alias key at `/docs/architecture-hold` | **15 failures**: 13 owned queries, the `webassembly` regression, and `keys every alias to a page that exists` |
| 3 | (in-suite fixtures) `toastOwnsRuntime: false` | `the page names a toast runtime \`provider.tsx\` no longer creates` |
| 4 | (in-suite fixtures) `declaresEffectDependency: false` | `the page claims an \`effect\` dependency the package no longer declares` |
| 5 | (in-suite fixtures) `countdownOwnsNoTimer: false` | `the page says Countdown owns no timer, but countdown.tsx schedules one` |
| 6 | (in-suite fixtures) `previewReadsPublishedState: false` | `the page claims previews read the published document state, but theme-surface.tsx does not` |
| 7 | (in-suite fixtures) `liveSurfaceExists: false` | `the page names a \`/gpuix-preview/\` document that does not exist` |

The source-side directions (3–7) are proven through the same pure rule the real
files feed, rather than by editing another workstream's package: mutating
`packages/components` to prove a docs guard would violate the one-writer rule
and is unnecessary here, because the rule's input is exactly the derived fact.

The page-side change also **removed** the need for the `effect` alias alone:
with the alias key renamed, `effect` still reached `/docs/architecture` from the
new section and the authored summary, and every other term failed. The alias is
kept for the phrases, not as the reason the page answers its own subject.


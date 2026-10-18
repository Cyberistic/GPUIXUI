# 503 — Getting started actually starts with the library (the two providers)

**Status:** implemented (2026-10-18) · **Phase:** F (docs truth / onboarding) · **Owner:** docs-site
**Depends on:** `410`, `411`, `426`, `440`, `455`, `457` §9; the shipped
`@gpuixui/tokens` and `@gpuixui/primitives` packages.

## 1. The defects this plan fixes

Two pages that a new reader follows in order — `/docs/installation` and
`/docs/getting-started` — do not produce a working library app.

1. **Getting started never uses the library.** It renders raw GPUix
   (`<div><text>Hello from GPUix</text></div>`) and links away to
   `examples/basic-app`. A reader finishes the page without importing a single
   `@gpuixui/*` component or mounting a theme provider.
2. **The intended install omits `@gpuixui/tokens`.**
   `apps/docs/content/docs/installation.mdx:34` is
   `nub add @gpuixui/primitives @gpuixui/components`. The only public React
   provider for the component packages is `@gpuixui/tokens/react`
   (`packages/tokens/package.json` exports `./react`); `@gpuixui/components`'
   public surface (`packages/components/src/index.ts`) exports **no** provider.
   With a strict linker, a consumer that imports `@gpuixui/tokens/react` without
   declaring the dependency is relying on a transitive hoist.
3. **The site never explains that a mixed app mounts two providers.** The
   packages read two different React contexts:
   - `packages/primitives/src/components/ThemeProvider.tsx:62-65` — primitives
     own a context and **throw** `MissingThemeProviderError` (`:22`) when none is
     above them;
   - `packages/tokens/src/react.ts:9,31-32` — the token context **falls back to
     `lightTheme`** when none is above it;
   - `packages/components/src/internal/theme.ts:45` re-exports the token
     provider, and components read that context.

   The consequence was measured in plan `457` §9: a tree with only the primitives
   provider painted light-on-dark components. The live surface has mounted both
   since then (`apps/docs/preview/main.tsx:81-82`), and
   `scene-contract.test.ts` guards that file — but no reader-facing page says it.
   `TODO.md` records the package-README half as a cross-team row; this plan owns
   the site half.

## 2. Files to change

All paths are relative to the `docs-site` worktree
(`/Users/cyberistic/GPUIXUI/workspaces/docs-site`). **Do not edit
`packages/*`, `examples/*`, `apps/playground` or `docs/*`** — record those asks
in `TODO.md` instead.

### 2.1 `apps/docs/content/docs/getting-started.mdx`

Replace the raw-GPUix first section with a **library** first section, and add a
`## Providers` section after it. Required content:

- The first snippet imports `render` from `@gpuix/react`, `Button`, `Stack`,
  `Text`, `ThemeProvider` from `@gpuixui/primitives`, and `lightTheme` from
  `@gpuixui/tokens`; it wraps the tree in `<ThemeProvider theme={lightTheme}>`
  and renders a real `Button`. Keep the existing
  `render(<App />, { title: "My app" })` shape.
- `## Providers` states, in prose:
  - primitives own their context and **throw** `MissingThemeProviderError` when
    the provider is missing;
  - components read `@gpuixui/tokens/react`, which **falls back to the light
    theme** — so a components-only app silently renders light, never an error;
  - a mixed app (primitives **and** components) mounts the token provider
    *outside* the primitives provider, with the same resolved theme.
- A second snippet for the mixed app:

  ```tsx
  import { darkTheme } from "@gpuixui/tokens";
  import { ThemeProvider as TokensThemeProvider } from "@gpuixui/tokens/react";
  import { ThemeProvider } from "@gpuixui/primitives";

  <TokensThemeProvider theme={darkTheme}>
    <ThemeProvider theme={darkTheme}>{/* primitives and components */}</ThemeProvider>
  </TokensThemeProvider>;
  ```

  Name the two packages in the prose next to the snippet so the text is
  self-contained (a reader who only reads the prose must still learn both import
  paths).
- Keep the existing "Try the library in an example", "The native playground" and
  "Native previews" sections, adjusting only what the new first section makes
  redundant. The page must still link `/docs/theming`, `/docs/tokens-api` and
  `examples/basic-app`.

### 2.2 `apps/docs/content/docs/installation.mdx`

- Add `@gpuixui/tokens` to the intended-install command:

  ```sh
  nub add @gpuixui/tokens @gpuixui/primitives @gpuixui/components
  ```

- Add one short paragraph: the theme provider lives at
  `@gpuixui/tokens/react`, so the app declares the package directly rather than
  relying on a transitive install; primitives require its provider, components
  fall back to light without one. Link `/docs/getting-started` and
  `/docs/theming`.
- Keep the existing "not published yet / built from this repository" honesty and
  the TypeScript section unchanged.

### 2.3 `apps/docs/content/docs/theming.mdx`

Add a `## Providers` section before `## Semantic roles` (the first thing a reader
needs is where the theme enters the tree). It contains:

- the two contexts in one short paragraph (the same facts as §2.1; each page must
  stand alone);
- the mixed-app nesting snippet (same shape as §2.1);
- one sentence pointing at `/docs/getting-started` for the full first app and
  `/docs/tokens-api` for the provider signature.

Do **not** duplicate the generated token tables or change any existing claim.

### 2.4 `apps/docs/src/provider-docs.test.ts` (new)

A content/truth suite in the style of `docs-checks.test.ts`,
`component-page-docs.test.tsx` and `content-references.test.ts`: `node:fs` /
`node:path` reads of real repository files, no Effect runtime (the docs bundle
must not import `effect`).

Required assertions, each with a header comment naming the bug it guards:

1. **The install page declares the provider package.** The `nub add` line under
   "The intended install" includes `@gpuixui/tokens`, and the page names
   `@gpuixui/tokens/react`.
2. **Getting started uses the library.** The page imports from
   `@gpuixui/primitives` and from `@gpuixui/tokens` and contains
   `<ThemeProvider`.
3. **The mixed snippet nests tokens outside primitives.** In the `## Providers`
   body of `getting-started.mdx`, the `<TokensThemeProvider` open tag appears
   before `<ThemeProvider` and its close tag after; the snippet imports both
   names from the two documented packages.
4. **The source still supports the claim.** Derive, from the real files:
   - `packages/primitives/src/components/ThemeProvider.tsx` contains
     `MissingThemeProviderError` and throws it from `useTheme`;
   - `packages/tokens/src/react.ts` initialises its context with `lightTheme`
     and returns `useContext` (the fallback);
   - `packages/components/src/internal/theme.ts` re-exports `ThemeProvider` /
     `useTheme` from `@gpuixui/tokens/react`;
   - `packages/components/src/index.ts` does **not** export `ThemeProvider`
     (so the page must never instruct importing it from
     `@gpuixui/components`).
5. **The live surface and the page agree.** `apps/docs/preview/main.tsx` still
   opens `<TokensThemeProvider` before `<ThemeProvider` and closes them in the
   reverse order.
6. **Theming names the provider.** The `theming.mdx` page names both
   `@gpuixui/tokens/react` and `@gpuixui/primitives` and links
   `/docs/getting-started`.
7. **No page tells a reader primitives fall back.** Assert that neither page
   contains a sentence pairing primitives with "falls back"/"fallback" — this is
   the exact inversion the two contexts invite.

Keep the suite small (7–10 `it` blocks). Every assertion reads a real file; do
not snapshot whole pages.

### 2.5 `TODO.md` and the plan index

- Add one ticked row under **Docs site workstream (plans 410–499, plus 500)**:

  `[x]` **Getting started starts with the library (plan 503)** — the first app
  mounts a primitives provider and renders a real component, the install
  declares `@gpuixui/tokens`, and Theming names the second provider a mixed app
  needs; `provider-docs.test.ts` derives both contexts from the package source.

- Amend the cross-team row at `TODO.md:764` (two theme providers) with one
  sentence: the site now documents the nesting (plan 503); the remaining work is
  the package READMEs / unifying the context, still owned by
  components/primitives. **Do not tick that row.**
- Append `503` to `.agents/slop/plans/README.md`'s docs-site table, and change
  the "plans `500`, `501` and `502` take the next free numbers" note to include
  `503`.

## 3. Commands and expected results

Run from the worktree root, in this order.

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | every suite passes, including the new `src/provider-docs.test.ts`; no `check-tests` escape needed |
| `nub run check:tests` | `tests: every test asserts something, and nothing asserts itself` |
| `nub run --filter docs check-types` | `fumadocs-mdx` generates, both `tsc` runs exit `0` |
| `nub run check` | exit `0` (test-quality, lint, format, types) |
| `nub run --filter docs smoke:build` | build + crawl exit `0`; `/docs/getting-started`, `/docs/installation` and `/docs/theming` render, every link and fragment resolves |

## 4. Two-direction proofs (record exact output in the plan's Results)

A test is not evidence until it has failed for the right reason. Temporarily
break each claim, run the suite, and restore:

1. Delete `@gpuixui/tokens` from the install line → assertion 1 fails, naming the
   missing package; restore.
2. Remove the `<TokensThemeProvider>` line from the Getting started snippet →
   assertion 3 fails on the nesting order; restore.
3. Change the Getting started prose to say primitives fall back to the light
   theme → assertion 7 fails on the inverted claim; restore.
4. Temporarily change `packages/primitives/src/components/ThemeProvider.tsx` to
   return `lightTheme` instead of throwing (do **not** commit this) → assertion 4
   fails; restore the file byte-for-byte (`git checkout -- <path>`).
5. Remove `@gpuixui/tokens/react` from `packages/components/src/internal/theme.ts`
   → assertion 4 fails; restore.

Record each failure message and the restore command under a `## Results` heading
before committing.

## 5. STOP conditions

- **Providers were unified before implementation** (components' root exports a
  provider, or primitives gained a default theme): STOP. The shipped truth wins;
  re-scope the page and rewrite assertion 4 rather than asserting an obsolete
  contract. Report the new source lines.
- **The install command cannot honestly list `@gpuixui/tokens`** because the
  package is not intended for direct consumption: STOP and report; do not invent
  a registry install command.
- **`nub run --filter docs test` fails outside the new suite**: STOP and report
  the failing suite; do not adjust unrelated tests.
- Any required edit outside `apps/docs`, `TODO.md`, `.agents/slop/plans/`:
  record it as a TODO row and do not edit the path.

## 6. Acceptance criteria

- `/docs/getting-started` imports the library, mounts
  `<ThemeProvider theme={…}>` from `@gpuixui/primitives`, and renders a real
  component.
- The page and `/docs/theming` each explain both contexts (primitives throw;
  components fall back to light) and show the tokens-outside-primitives nesting
  for a mixed app.
- `/docs/installation` declares `@gpuixui/tokens` in the intended install and
  says why.
- `src/provider-docs.test.ts` fails on each of §4's five breaks and passes
  restored.
- `nub run check`, `nub run --filter docs test` and `smoke:build` exit `0`.
- `TODO.md` and the plan index are updated; the commit is pushed to
  `origin/agent/docs-site`.

## 7. Results (2026-10-18)

Implementation is on `agent/docs-site`. The suite is
`apps/docs/src/provider-docs.test.ts` (10 tests); the docs suite is
**57 files / 380 tests passing** (`nub run --filter docs test`), up from 370.

### Two-direction proofs

Each break was made, the suite run, and the file restored immediately.

| Break | Failure |
| ----- | ------- |
| Removed `@gpuixui/tokens` from the install line | `the documented install reaches the provider > declares @gpuixui/tokens in the intended nub add line` — `expected '…' to contain 'nub add @gpuixui/tokens @gpuixui/primitives…'` |
| Removed `<TokensThemeProvider>` from the Getting started snippet | `getting started is a library app > nests the token provider outside the primitives provider` — `expected false to be true` |
| Inverted the prose (`Primitives fall back to the light theme…`) | `the inverted claim cannot ship > no sentence says primitives fall back to a default theme` — `+ "getting-started: Primitives fall back to the light theme without a provider."` |
| Changed `packages/primitives/.../ThemeProvider.tsx` to throw a plain `Error` | `the pages match the shipped contexts > primitives still throw without a provider` — `expected '…' to contain 'throw new MissingThemeProviderError()'` |
| Removed the provider re-export from `packages/components/src/internal/theme.ts` | `… > components read the token provider, not a provider of their own` — `expected '…' to contain 'ThemeProvider, useTheme'` |

**A proof found a real hole in the guard:** the first inverted-prose attempt
said "Primitives **fall back**…", and the filter only matched "falls back" /
"fallback", so the suite stayed green. The filter now matches "fall back",
"falls back" and "fallback"; the proof was rerun and failed by name. This is
recorded because it is the class of near-miss the proof exists to catch.

The two transient package edits were restored byte-for-byte; `git status`
showed no change under `packages/` afterwards.

### Commands

- `nub run --filter docs test` → `57 passed (57)`, `380 passed (380)`.
- `nub run check` → test-quality, lint, format and every workspace
  `check-types` exit `0`.
- `nub run --filter docs smoke:build` → build and the production crawl exit
  `0`; the three changed pages render, and every link/fragment resolves.

## 8. Why no `COMPONENTS.md` row

This is a docs-truth change, not a component: it ships no new library surface and
no component status moves. The inventory stays untouched; the cross-team row in
`TODO.md` keeps the package-README half open for its owners.

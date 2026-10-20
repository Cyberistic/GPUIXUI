# Plan 632 — Async data and effects have an owner

**Phase:** F (integration and polish) · **Workstream:** docs-site · **Block:** `500+`

**Depends on:** 410 (site), 412 (previews), 419/431/568/598 (search and page
aliases), 602 (Architecture's runtime contract), 603 (Troubleshooting), 619
(Security), 628 (Testing), 629/630/631 (the most recent page + vocabulary
plans), the shipped `@gpuixui/components` toast runtime.

**Status:** implemented 2026-10-21. The page, the alias block, the repository
guard and the compiled example landed; the measured runs are in §9.

---

## 1. The measured problem

The library is built on Effect, and its docs never tell a consumer how to run
asynchronous work. Measured on 2026-10-21 against the real index
(`apps/docs/src/lib/search.ts`, the same ranker `/api/search` uses), asking for
the subject in the words a React reader uses returns another page, a limitation
paragraph, or nothing:

| Query | First result before | Why it is wrong |
| ----- | ------------------- | --------------- |
| `async` | Combobox → *No async option loading* | a limitation, not the subject |
| `async data` | (none) | no owner |
| `data fetching` | Data display | the data-presentation page |
| `fetching` | (none) | — |
| `suspense` | (none) | — |
| `useeffect` | (none) | — |
| `use effect` | (none) | — |
| `isloading` | (none) | — |
| `promises` | (none) | — |
| `cache` / `caching` | (none) | — |
| `polling` | (none) | — |
| `retry` | Roadmap | a planned target |
| `cancellation` | (none) | — |
| `effectful` | (none) | — |
| `server state` | Component API → the `*State` table | part state, not server data |
| `error handling` | Inline validation | field errors, not async failure |
| `promise` | Troubleshooting → Where to ask | — |
| `side effects` | Preview card → Variants | — |

The facts a reader needs already exist, scattered and unowned:

- `ToastProvider` is the package's **only** `ManagedRuntime`, created in a
  `useState` initialiser, subscribed to the store's `SubscriptionRef` stream in
  a `useEffect`, and disposed through `createRuntimeLifecycle`
  (`packages/components/src/toast/provider.tsx`, `lifecycle.ts`).
- The store owns its timers in a `FiberMap`, reads `Clock`, and re-emits through
  `SubscriptionRef` (`packages/components/src/toast/store.ts`).
- `Form` runs `validateAll` synchronously at submit (`Effect.runSync`), and
  `Countdown` owns no timer at all (`packages/components/src/form.tsx`,
  `countdown.tsx`).
- The render loop is synchronous, so there is no `act`/`waitFor`
  (`/docs/testing#the-render-loop`), and `advanceTime` is the timer knob.
- The library makes no network requests and writes no storage
  (`/docs/security#the-library`, guarded by `security-page.test.ts`).
- No workspace installs a data-fetching or state library, and nothing in the
  installed `@gpuix/react` mentions `Suspense` (measured by this plan's guard).

MISSION.md requires a real Fumadocs site and Effect-first guidance; a consumer
adopting the library cannot answer "how do I load data?" anywhere on it.

## 2. Decision

Add **one hand-authored page, `/docs/async-data`**, titled **Async data and
effects**, that owns the consumer-facing answer:

1. the library has no data layer; the application owns the request;
2. where an effect may run (React effects at the boundary; the toast provider is
   the shipped template);
3. how to model `loading` / `ready` / `failed` as a tagged union and paint it
   with the shipped `Spinner`, `Skeleton`, `Alert` and `EmptyState`;
4. cancellation and disposal (fiber interruption, `AbortController`, the
   StrictMode-safe runtime lifecycle);
5. failure as a value (`Schema.TaggedError`, the render-error path on
   Troubleshooting);
6. how to test it (synchronous render loop, `advanceTime`, `TestClock` for an
   Effect store);
7. the absences: no `Suspense`, no query cache, no fetch helper, no background
   worker/thread, no async validation, no async option loading, no built-in
   async runner for a dialog.

Add exact page aliases for the measured queries and keep the existing owners of
the words that are not this subject (`loading` → Spinner, `state management` →
Component API, `managed runtime` → Architecture, `fetch` → Security). No ranker
change: the ranker is not wrong, the subject has no page.

Guard the page with a test that reads the repository in both directions, so a
later timer, `ManagedRuntime`, `Suspense` mention or data dependency fails by
name instead of leaving the page stale.

## 3. Exact files

Create:

- `apps/docs/content/docs/async-data.mdx` — the page.
- `apps/docs/src/async-page.test.ts` — the repository guard and the search rows.

Change:

- `apps/docs/content/docs/meta.json` — insert `"async-data"` directly after
  `"accessibility"`. Component API's guard requires it directly after
  Architecture and Accessibility's requires it directly after Component API, so
  the new page follows the pair it builds on.
- `apps/docs/src/lib/page-aliases.ts` — one new block (the plan-632 block) with
  the terms listed in §4.3, plus the paragraph documenting the measured gaps.
- `apps/docs/src/lib/page-aliases.test.ts` — the header comment gains one
  sentence naming plan 632; `owned` gains the new rows and `regressions` the
  pinned ones (§4.4).
- `apps/docs/src/example-snippets.test.ts` — compile the new page's fences too:
  a named `extraPages` list beside `pagesDirectory`, unioned into `examples`.
- `apps/docs/scripts/smoke-build.ts` — two production queries (§4.5).
- `.agents/slop/plans/README.md` — index row for this plan.
- `TODO.md` — one ticked docs-site row.
- `PLAN.md` — decision row D65.

Do **not** touch: `packages/*`, `docs/preview-strategy.md`,
`apps/docs/src/lib/search.ts`, or any component page. This plan adds a subject
page; it does not change the ranker, a preview tier, or a package.

## 4. What the page says, and where each claim comes from

### 4.1 Frontmatter

```yaml
---
title: Async data and effects
description: "Load data in a GPUix app: there is no data layer, effects run at your boundary, and loading, failure and cancellation are values — with the toast runtime as the shipped template, and the Suspense, query-cache and worker APIs that do not exist."
---
```

### 4.2 Sections (in this order)

| Heading | Content | Source of truth |
| ------- | ------- | --------------- |
| intro | the library renders; it does not fetch, cache or persist. Link Security and Architecture | `security-page.test.ts`, `/docs/architecture#state-and-effect` |
| `## The library does not fetch` | no HTTP client, storage or query cache ships; no workspace installs one | this plan's manifest scan; `/docs/security` |
| `## Where an effect may run` | React effects work; the toast provider is the shipped boundary — `useState` runtime, `useEffect` subscription, `runFork` commands, `dispose` on unmount; include the real provider and lifecycle source | `provider.tsx`, `lifecycle.ts` |
| `## The shipped template` | `SubscriptionRef` + `FiberMap` + `Clock`; a subscription, not a poll; ids are monotonic so a timer cannot dismiss another toast; disposing the runtime ends every timer | `store.ts`, `store.test.ts` |
| `## Model the states` | a tagged union `loading` / `ready` / `failed`, decoded with `Schema`; paint each state with Spinner, Skeleton, Alert, EmptyState; the copyable hook example | this page's compiled example |
| `## Cancel and dispose` | a React cleanup aborts the request and stops late writes; Effect fibers are interrupted; the StrictMode-safe lifecycle defers disposal one microtask | `lifecycle.ts`, `provider.tsx` |
| `## Failure is a value` | `Schema.TaggedError`, `Effect.tryPromise`; a thrown error at render is Troubleshooting's class boundary/overlay; field errors are Inline validation's subject | installed `effect` typings, `/docs/troubleshooting#a-component-throws` |
| `## Test it` | the render is synchronous; `advanceTime` for timers; `TestClock` for an Effect store; the toast store's own suite is the model | `/docs/testing#the-render-loop`, `store.test.ts` |
| `## What is not provided` | the seven absences in §4.4, each with its real alternative | this plan's guard |

End with the related links: Architecture, Component API, Testing, Troubleshooting,
Security, Inline validation, Toasts, Spinner, Skeleton, Empty states.

### 4.3 The copyable example (compiled)

One fence, `tsx`, importing `effect` and `react`, declaring the request function
as an injected parameter (the library never calls `fetch`):

```tsx
class ProjectLoadError extends Schema.TaggedError<ProjectLoadError>()(
  "ProjectLoadError",
  { cause: Schema.Unknown },
) {}

const loadProjects = (signal: AbortSignal) =>
  Effect.tryPromise({
    try: async () =>
      Schema.decodeUnknownSync(Schema.Array(Project))(await fetchProjects(signal)),
    catch: (cause) => new ProjectLoadError({ cause }),
  });

export const useProjects = (): ProjectsState => {
  const [state, setState] = useState<ProjectsState>({ _tag: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    void Effect.runPromise(loadProjects(controller.signal)).then(
      (projects) => live && setState({ _tag: "ready", projects }),
      (reason: ProjectLoadError) => live && setState({ _tag: "failed", reason }),
    );
    return () => {
      live = false;
      controller.abort();
    };
  }, []);
  return state;
};
```

The fence must be a complete module (declarations included) because
`example-snippets.test.ts` compiles it standalone with `tsc`.

### 4.4 Search rows

Owned by `/docs/async-data` (exact whole query, per the existing table rule):

`async`, `async data`, `asynchronous`, `data fetching`, `fetching`,
`fetch data`, `suspense`, `suspense fallback`, `useeffect`, `use effect`,
`use effect cleanup`, `react effects`, `isloading`, `promises`, `promise chain`,
`cache`, `caching`, `query cache`, `retry`, `retries`, `polling`, `poll`,
`cancellation`, `cancelled request`, `effectful`, `server state`,
`abort signal`, `abortsignal`, `error handling`, `async error`.

Regressions that must keep their owners (asserted in the same suite):
`loading` → `/docs/components/spinner`; `state management` →
`/docs/component-api`; `managed runtime` → `/docs/architecture`; `fetch` →
`/docs/security`; `virtualized` → `/docs/data-display`; `debounce` →
`/docs/testing`.

No term may be shared, shadow a page title or a component name; the existing
`page-aliases.test.ts` rules prove that automatically once the rows are added.

### 4.5 Production queries (`smoke-build.ts`)

Add exactly two, beside the existing search assertions:

- `useeffect` → `/docs/async-data`
- `suspense` → `/docs/async-data`

The smoke prints the failing query and the URL it received, so a page that loses
its aliases fails the built site, not only the unit suite.

## 5. The guard (`src/async-page.test.ts`)

`node:fs` is a test-boundary import, as in `content-references.test.ts` and
`example-snippets.test.ts`.

1. **Sections** — every `##` heading from §4.2 is present; the page includes
   `provider.tsx` and `lifecycle.ts` by their real relative specifiers; every
   `/docs/...` link resolves through `source.getPages()`.
2. **Only one runtime** — scan `packages/*/src` (excluding `node_modules`, `dist`
   and `*.test.*`) for `ManagedRuntime.make`; the result must be exactly
   `components/src/toast/provider.tsx`, and the page must name that file.
3. **Timers** — scan the same tree for `setTimeout(` / `setInterval(` calls; the
   set today is `components/src/preview-card.tsx` and
   `primitives/src/components/internal.ts`. The page must name both, and the
   countdown source must contain neither. Adding a timer fails the suite until
   the page says so.
4. **No data library** — read every workspace `package.json`; fail on any
   dependency or devDependency named `@tanstack/react-query`, `react-query`,
   `swr`, `axios`, `ky`, `urql`, `@apollo/client`, `jotai`, `zustand`, `redux`,
   `@reduxjs/toolkit`, `valtio` or `mobx`. This is the evidence for
   `## The library does not fetch` and `## What is not provided`.
5. **No Suspense** — scan `packages/*/src` and every file under the resolved
   installed `@gpuix/react` directory; zero `Suspense` occurrences. The page's
   `Suspense` sentence is a claim about the installed version, so a dependency
   upgrade that adds it fails here.
6. **Search** — the owned rows live in `page-aliases.test.ts`, the table's own
   suite: every owned query returns `/docs/async-data` first, and the five
   regression rows keep `loading`, `state management`, `managed runtime`,
   `fetch` and `debounce` with their pages.
7. **Summary discipline** — the description contains the words `loading`,
   `failure` and `cancellation` (so `descriptionMatchRank` can answer a natural
   phrase) but not `state management`, which stays Component API's alias.

### Two-direction proofs (run and record)

- Remove the alias block → every owned query fails with the old URL; restore →
  passes.
- Remove the provider `<include>` → `async-page.test.ts` fails on the missing
  source (and on the page no longer naming `provider.tsx`); restore → passes. An
  include whose body is emptied fails `content-references.test.ts` as a silent
  include.
- Add `"swr": "2.3.0"` to `apps/docs/package.json` temporarily → guard 4 fails
  by name; remove → passes (do not run `nub install`; the guard reads the file).
- Add `Suspense` to a comment in `packages/components/src/card.tsx` → guard 5
  fails; revert → passes.
- Add `setTimeout(() => {}, 0)` to `packages/components/src/card.tsx` → guard 3
  fails, naming the file; revert → passes.

## 6. Commands and expected results

```sh
cd apps/docs
nub x vitest run src/async-page.test.ts src/lib/page-aliases.test.ts src/example-snippets.test.ts
# expect: all pass; the first run of the new suites after the page exists

nub run check-types
# expect: exit 0 (fumadocs-mdx, app tsc, preview tsc)

cd ../..
nub run check
# expect: exit 0 (format, lint rules, type gates, check:tests, docs tests)

nub run lint
# expect: exit 0

nub run --filter docs smoke:build
# expect: exit 0; the page count rises by one (113) and both production
# queries are listed as passing
```

Scoped browser checks when iterating (not the full live suite):

```sh
nub run --filter docs smoke:search    # ⌘K still answers; exit 0
nub run --filter docs smoke:a11y      # the new page is in the sitemap; exit 0
```

`smoke:build` is the end-of-task check for this change. The full live GPUix
suite is not required: this plan changes no component and no native preview.

## 7. STOP conditions

Stop and report with the command output if:

- the measured before-state in §1 no longer reproduces (another workstream
  already owns the subject) — do not add a second owner;
- guard 3 finds timers other than the two named, or no countdown source at the
  expected path;
- guard 4 finds a data library already installed — record it in `TODO.md` and
  stop; the "no data layer" claim would be false;
- guard 5 finds `Suspense` in `@gpuix/react` or a package — the absence sentence
  must be rewritten from the new evidence, and the plan re-scoped;
- `example-snippets` cannot compile the fence after two corrections (do not
  weaken the compiler or add `any`);
- `smoke:build` exits `2` (cannot verify) rather than `0`/`1` — report the
  missing browser/server, do not treat it as a pass.

## 8. Acceptance

- `/docs/async-data` builds, is in the sidebar after Accessibility (the two
  adjacency guards keep Component API and Accessibility together), in the
  sitemap, `llms.txt` and the per-page Markdown route.
- Every owned query returns it first; every regression row keeps its page.
- The page names only real files, commands and absences, each guarded in both
  directions.
- The example compiles; the includes resolve; no MDX component is unregistered.
- `check-types`, `check`, `lint`, the focused vitest files and `smoke:build` are
  green; the exact commands and results are recorded in this plan's status note
  and `TODO.md`.

## 9. Measured results (2026-10-21)

- Measured before-state reproduced against the real index; the table in §1 is the
  probe output (`search(query, 1)` for 18 queries, then a second sweep for the
  vocabulary in §4.4).
- `nub x vitest run src/async-page.test.ts src/lib/page-aliases.test.ts
  src/example-snippets.test.ts` → 3 files, 522 tests, pass. The example compiler
  included the new page's fence.
- Two-direction proofs, each run and reverted:
  - removing `"useeffect"` from the alias block → 1 failed | 509 skipped;
  - removing the provider `<include>` → 2 failed in `async-page.test.ts`
    (the include source and the `provider.tsx` claim);
  - adding `"swr"` to `apps/docs/package.json` → 1 failed (the manifest scan
    named the dependency);
  - adding `Suspense` to `components/src/card.tsx` → 1 failed (the installed
    scan reported the package);
  - adding `setTimeout(() => {}, 0)` to `components/src/card.tsx` → 1 failed
    (the timer set no longer matched).
- Sidebar: the new page sits after Accessibility, because Component API's guard
  requires it directly after Architecture and Accessibility's requires it
  directly after Component API. Both guards were rerun green.
- Full docs suite: 150 files / 1 672 tests pass.
- `nub run check-types` → exit 0.
- `nub run --filter docs smoke:build` → `smoke: ok`; 113 pages, 247 links,
  1 459 anchors, search checked (the two new production queries included).


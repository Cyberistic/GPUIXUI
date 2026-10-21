# 637 — Frame loop and process lifecycle: the runtime's own loop has an owner

**Phase:** F (documentation completeness; a measured documentation gap)
**Depends on:** 410, 412, 413, 419, 431, 439, 448, 455, 568, 574, 598, 602, 605, 609, 624, 625, 634, 635, 636
**Status:** planned
**Owner:** docs-site workstream (`apps/docs`, `docs/preview-strategy.md`, the component-page template)

---

## 1. The gap this plan closes

`@gpuix/react@0.10.0` ships the whole application lifecycle: `render()`,
`createRenderer()`, `createRoot()`, `startFrameLoop()`, `resetRender()`,
`flushSync()`, the renderer's `init`/`tick`/`requiresTick`/`isInitialized`
contract, and a macOS CPU clamp (`MAC_CPU_THROTTLES`,
`readMacCpuThrottle`, `applyMacCpuThrottleFromEnv`). The site documents the
window (`/docs/window`), the event payload (`/docs/events`), the test renderer
(`/docs/testing`) and the driver (`/docs/automation`), but **no page explains how
a running app is driven**: the pace, what `tick()` returning `false` means, why
the process exits, what a hot reload remounts, or how to limit a macOS app's CPU.

Measured on 2026-10-21 in this worktree against the real `/api/search` merge (a
scratch vitest calling `search()`; deleted afterwards):

| Query | First result before | Correct owner |
| ----- | ------------------- | ------------- |
| `frame loop` | `/docs/automation` (page) | this page |
| `frame pacing` | `/docs/patterns/app-shell#composition` (text) | this page |
| `hot reload` | `/docs/components/hotkey-input` (page) | this page |
| `cpu` | **nothing** | this page |
| `cpu usage` | `/docs/components/accordion#usage` (heading) | this page |
| `throttle` | **nothing** | this page |
| `taskpolicy` | **nothing** | this page |
| `background throttle` | `/docs/styling#the-supported-surface` (text) | this page |
| `startFrameLoop` | `/docs/automation` (page) | this page |
| `requiresTick` | **nothing** | this page |
| `resetRender` | **nothing** | this page |
| `flushSync` | **nothing** | this page |
| `isInitialized` | **nothing** | this page |
| `applyMacCpuThrottleFromEnv` | **nothing** | this page |
| `readMacCpuThrottle` | **nothing** | this page |
| `MAC_CPU_THROTTLES` | **nothing** | this page |
| `THROTTLE` | **nothing** | this page |
| `requestAnimationFrame` | **nothing** | this page (as an absence) |
| `frame budget` | `/docs/deployment#the-asset-budget` (text) | this page |

Queries that must **not** move (their owners are correct):

- `fps`, `frame rate`, `benchmark`, `performance` → `/docs/performance` (what is
  measured, and what is not)
- `test render loop` → `/docs/testing#the-render-loop` (the test renderer's flush)
- `createRoot` → `/docs/testing` (the offscreen renderer's root)
- `frame overlay`, `debug frame overlay` → `/docs/window` (the overlay and its
  stats)
- `closing the window`, `window resize` → `/docs/window` / Styling
- `createNativeRenderer`, `enableAutomation`, `installBrowserAutomation` →
  `/docs/automation`
- `tick` → currently `/docs/components/checkbox` (a plain word; recorded below as
  a measured non-fix, like plan 608's `tabel` / `read only`)

Two facts make the page necessary rather than nice:

1. **The loop's contract is the reason a GPUix app's CPU is low or pegged.** The
   installed `@gpuix/native/dist/runtime.js` runs
   `if (!renderer.requiresTick()) return { stop() {} }`, schedules each frame
   only after the previous returns (`setTimeout(loop, Math.max(0, frameMs -
   (performance.now() - started)))`), defaults `DEFAULT_FRAME_MS = 8`, and stops
   on `tick() === false` before calling `onTerminated`. The declaration's own
   comment records the measurement behind it: a `setImmediate` spin measured
   **73% CPU on an idle app versus 1.5% when paced**. None of that is on the
   site.
2. **The site states a rule the runtime does not implement.** `/docs/window`
   says `render()` "is called **once per process**: a second `render()` throws".
   The installed `render()` does the opposite: when the slot already has a root
   it logs `[gpuix] remount: unmount previous tree`, unmounts it
   (`mountRoot` → `slot.root.unmount()`), reuses the same native window and
   loop, and mounts the new tree — the `bun --hot` path its own comment names.
   This plan corrects the Window page from the same evidence.

**Evidence boundary.** Every claim comes from the installed
`@gpuix/react@0.10.0` entry, `dist/reconciler/renderer.js`,
`dist/reconciler/reconciler.d.ts`, `dist/cpu-throttle.js`,
`@gpuix/native@0.10.0`'s `index.d.ts`, `dist/runtime.d.ts`,
`dist/runtime.js` and `dist/cpu-throttle.js`. The 73% / 1.5% figures are quoted
as the **runtime's recorded measurement**, not this site's; the site records no
frame-time measurement of its own and `/docs/performance` keeps that absence.

---

## 2. What the page says (and where each claim comes from)

Page: `/docs/frame-loop`, title **Frame loop**, sidebar directly after `window`
(Application window), before `data-display`.

Sections, in order:

1. **`## What render() does`** — the four steps the installed `render()` performs,
   in source order: resolve the process-wide render slot (one `globalThis` key);
   on the first call create a `GpuixRenderer` and `init(windowOptions)`; install
   the process-level error handlers; start the frame loop (first call only, and
   only when no renderer was injected); mount the React root with `flushSync`.
   It returns the `Root` (`{ render, unmount }`). Note that `onTerminated` calls
   `process.exit(0)`, so the last window closing ends the process.
2. **`## Remounting and hot reload`** — a second `render()` in the same process
   is a **remount**, not an error: the previous tree is unmounted, the same
   renderer, window and loop are reused, and the new tree is mounted. That is
   the `bun --hot` path the source comment names. A different renderer is
   possible by passing `renderer` in the options (the `createRenderer` recipe
   below), which also skips the loop. Correct Window's "once per process /
   throws" sentence and link here.
3. **`## The loop`** — `startFrameLoop(renderer, options)`:
   - a no-op `{ stop() {} }` when `renderer.requiresTick()` is `false`;
   - `frameMs` defaults to `DEFAULT_FRAME_MS` (**8** ms), a *budget*, not a cap:
     the next frame is scheduled `max(0, frameMs - elapsed)` after the current
     one returns, so a slow frame delays the next instead of queueing timers;
   - `tick()` runs inside a `try`; a throw goes to `onError` and the timer
     survives (on macOS that timer is the AppKit pump);
   - `tick() === false` stops the loop and calls `onTerminated`.
   Table: `<LoopOptions />`.
4. **`## Tick, and why the platform matters`** — `<TickContract />`:
   `requiresTick()` is `true` where JavaScript must pump the native loop;
   `tick()` returns `false` after the last window closes; the declarations say
   macOS pumps AppKit while Windows and Linux only report whether the UI thread
   is still inside `Platform::run`; `init()` opens the window; `isInitialized()`
   answers whether it did.
5. **`## The default budget`** — 8 ms is the loop's nominal budget (the
   declaration's own "~125fps" comment). It is not a measured frame rate: quote
   the runtime's recorded 73% → 1.5% CPU comparison as the runtime's
   measurement, and link [Performance](/docs/performance) for what this site has
   **not** measured. No sentence on the page may claim a measured frame rate.
6. **`## Stopping the loop`** — `render()` does not return the loop handle; the
   three-call recipe is the supported way to own it: `createRenderer()` →
   `createRoot(renderer, handlers)` → `startFrameLoop(renderer, options)`.
   Includes a compiled `tsx` fence of that recipe. `resetRender()` stops the
   loop, unmounts the root, closes browser automation and clears the slot — the
   hot-reload/test reset — and a later `render()` then creates a fresh renderer
   and window.
7. **`## What render() takes`** — `<RenderOptionsTable />`: only the three
   React-level fields (`onEvent`, `renderer`, `debugFrameOverlay`), with links to
   Window for `WindowOptions`, Events for `onKeyDown`/`onKeyUp`/
   `onSelectionChange`, and Window for the overlay itself. The table must not
   repeat the window options.
8. **`## CPU limits on macOS`** — `<CpuThrottleTable />` and the real rule:
   `THROTTLE=utility|background|maintenance`; `readMacCpuThrottle()` trims and
   lowercases the value, returns `null` when unset and **throws** on an unknown
   one; `applyMacCpuThrottleFromEnv()` re-execs the process under
   `taskpolicy -c <mode>`, marks the child with `GPUIX_CPU_THROTTLE_APPLIED` so
   it cannot recurse, and exits with the child's status. It throws when the
   platform is not `darwin` and when called inside a Vitest worker (wrap the
   runner instead). State that the site has recorded no measurement of the
   clamp's effect; the mode list and the errors are the evidence.
9. **`## What is not provided`** — `<LoopAbsences />`: no
   `requestAnimationFrame` (the loop is `setTimeout`); no vsync or refresh-rate
   query; no per-frame JavaScript callback; no `pause`/`resume` on the handle
   (`stop()` is the only operation); no handle returned by `render()`; no
   JavaScript frame-time read (Window's debug overlay owns `getDebugFrameOverlayStats`); no CPU clamp outside
   macOS; no automatic remount after an uncaught error (Troubleshooting owns the
   overlay and its Reload control).
10. **`## Related`** — Window, Performance, Automation, Testing, Events,
    Troubleshooting, Architecture, Deployment (the process the Worker is not).

Cross-links added by this plan:

- `window.mdx` `## Opening the window`: correct the second-`render()` claim and
  link here for the loop and remount.
- `performance.mdx` `## What is not measured`: one sentence linking the loop's
  pacing contract without claiming a rate.
- `automation.mdx` `## The app side` (or the row that names
  `startFrameLoop`): link the loop page as the owner of the pump.
- `testing.mdx` `## The render loop`: one sentence distinguishing the test
  renderer's `flush()` from the app's paced `tick()` loop, linking here.
- `architecture.mdx` `## What runs where`: name the frame loop in the desktop
  renderer row, link here.

---

## 3. Files to create

All paths relative to `apps/docs/`.

### 3.1 `src/lib/frame-loop.ts` (new)

Authored data plus a pure guard, mirroring `src/lib/events.ts` /
`src/lib/placement.ts`.

```ts
export interface LoopFunctionRow {
  readonly name: string;   // "startFrameLoop"
  readonly group: "mount" | "loop" | "reset" | "cpu";
  readonly summary: string;
}
export const loopFunctions: ReadonlyArray<LoopFunctionRow>;

export interface LoopOptionRow {
  readonly name: string;      // "frameMs"
  readonly type: string;      // "number"
  readonly default: string;   // "8 (DEFAULT_FRAME_MS)"
  readonly summary: string;
}
export const loopOptions: ReadonlyArray<LoopOptionRow>;

export interface TickRow {
  readonly name: string;       // "tick"
  readonly signature: string;  // "tick(): boolean"
  readonly summary: string;
}
export const tickContract: ReadonlyArray<TickRow>;

export interface RenderOptionRow {
  readonly name: string;    // "debugFrameOverlay"
  readonly type: string;    // 'DebugFrameOverlayMode'
  readonly owner: string;   // "/docs/window"
  readonly summary: string;
}
export const renderOptions: ReadonlyArray<RenderOptionRow>;

export interface CpuThrottleRow {
  readonly mode: string;    // "utility"
  readonly summary: string;
}
export const cpuThrottles: ReadonlyArray<CpuThrottleRow>;
export const throttleEnvironmentVariable = "THROTTLE";
export const throttleAppliedVariable = "GPUIX_CPU_THROTTLE_APPLIED";

export interface LoopAbsence {
  readonly subject: string;
  readonly statement: string;
}
export const loopAbsences: ReadonlyArray<LoopAbsence>;
export const loopAbsenceSubjects: ReadonlyArray<string>;

export interface FrameLoopInput {
  readonly reactEntry: string;             // installed dist/index.d.ts
  readonly reactRenderer: string;          // installed dist/reconciler/renderer.js
  readonly reactReconciler: string;        // installed dist/reconciler/reconciler.d.ts
  readonly reactCpuThrottle: string;       // installed dist/cpu-throttle.js
  readonly nativeRuntimeDeclarations: string; // installed @gpuix/native/dist/runtime.d.ts
  readonly nativeRuntimeSource: string;    // installed @gpuix/native/dist/runtime.js
  readonly nativeDeclarations: string;     // installed @gpuix/native/index.d.ts
  readonly nativeCpuThrottleSource: string; // installed @gpuix/native/dist/cpu-throttle.js
  readonly reactDistSources: ReadonlyArray<string>; // every installed @gpuix/react/dist/**/*.js
}
export const frameLoopViolations: (
  input: FrameLoopInput,
) => ReadonlyArray<string>;
```

`frameLoopViolations` rules (each returns a message naming the member):

1. **Export symmetry.** Every `loopFunctions` name is exported by the installed
   React entry, and every identifier in that entry matching the lifecycle
   vocabulary (`FrameLoop`, `RenderOptions`, `Throttle`, `MAC_CPU_THROTTLES`,
   `render`, `Root`, `flushSync`, `createRoot`, `createRenderer`,
   `resetRender`, `startFrameLoop`) has a row. A GPUix upgrade that adds or
   removes a lifecycle export fails by name.
2. **Loop options.** The keys of `startFrameLoop`'s options object in the
   installed `@gpuix/native/dist/runtime.d.ts` equal the `loopOptions` names
   (`frameMs`, `onTerminated`, `onError`), and the `FrameLoop` interface declares
   exactly `stop(): void`.
3. **Pacing.** `nativeRuntimeSource` contains `DEFAULT_FRAME_MS = ` with the
   number `defaultFrameMs` (exported as `8`), the early return
   `if (!renderer.requiresTick())`, the scheduling expression
   `Math.max(0, frameMs - `, the `try` around `renderer.tick()`, the
   `running === false` stop, and `options.onTerminated?.()`.
4. **Tick contract.** Each `tickContract` row appears in the installed
   `@gpuix/native/index.d.ts` inside `class GpuixRenderer` with the stated
   signature prefix (`init(`, `tick(): boolean`, `requiresTick(): boolean`,
   `isInitialized(): boolean`).
5. **Render options.** The three `renderOptions` names are declared by
   `interface RenderOptions` in `@gpuix/react/dist/reconciler/renderer.d.ts`;
   the interface still extends `WindowOptions` and `WindowKeyEventHandlers`; a
   fourth React-level field fails until it is explained.
6. **Remount, not throw.** `reactRenderer` contains `slot.root.unmount()`,
   `startFrameLoop(host`, `process.exit(0)` and the `remount` log line; the page
   may not claim a second `render()` throws while those are present.
7. **CPU clamp.** `nativeCpuThrottleSource` contains the three modes in
   `MAC_CPU_THROTTLES` (equal to `cpuThrottles`), `"THROTTLE"`,
   `"GPUIX_CPU_THROTTLE_APPLIED"`, `"taskpolicy"`, and both error prefixes
   (`needs macOS taskpolicy`, `must wrap the vitest process`); the React entry
   re-exports all three names.
8. **Absences are provable.** No file in `reactDistSources` contains
   `requestAnimationFrame`, `vsync` or `scrollToItem`-style frame callbacks; the
   `FrameLoop` interface declares no `pause`/`resume`; `render` is declared
   returning `Root` (not `FrameLoop`); the renderer declarations contain no
   `frameTime`/`fps` member. `loopAbsenceSubjects` matches the absence table
   exactly.

Authored summaries state meaning only; names, signatures, defaults and modes are
read from the installed files at test time.

### 3.2 `src/lib/frame-loop-search.ts` (new)

One `GeneratedSearchEntry` (`frameLoopSearchEntry`):

- `names`: the distinctive names — `startFrameLoop`, `requiresTick`,
  `resetRender`, `createRenderer`, `frameMs`, `isInitialized`,
  `MAC_CPU_THROTTLES`, `readMacCpuThrottle`, `applyMacCpuThrottleFromEnv`,
  `GPUIX_CPU_THROTTLE_APPLIED`, `THROTTLE`, `FrameLoop`, `RenderOptions` —
  filtered by `isDistinctiveName`. **Not** `render`, `tick`, `createRoot`,
  `flushSync` or `Root`: the first three are plain words or owned by another
  page, and the last two are documented by Testing/Window.
- `index`: title `Frame loop`, url `/docs/frame-loop`, description and content
  built from the functions/options/tick/render/throttle/absences rows, keywords
  `frame loop pacing tick hot reload cpu throttle taskpolicy`.

### 3.3 `src/components/frame-loop-tables.tsx` (new)

Six server components, following `placement-tables.tsx` / `event-tables.tsx`
(accessible scroll region, `data-frame-loop-*` attributes for the page guard):
`<LoopFunctions />`, `<LoopOptions />`, `<TickContract />`,
`<RenderOptionsTable />`, `<CpuThrottleTable />`, `<LoopAbsences />`. No colour
or spacing literal; reuse `border-fd-border` / `text-fd-muted-foreground`.

### 3.4 `content/docs/frame-loop.mdx` (new)

Frontmatter:

```yaml
---
title: Frame loop
description: How a GPUix app is driven — render and remount, the paced tick loop, what ends the process, how to own or stop the loop, and the macOS CPU clamp.
---
```

The sections in §2, with the six table components in place. One compiled `tsx`
fence (the three-call recipe) with real `@gpuix/react` imports. No `<include>`:
the sources are the installed dependency, not the repository, and the tables
derive from them.

### 3.5 `src/frame-loop.test.ts` (new)

Header comment states the bug guarded (measured 2026-10-21: the 19 misrouted or
empty queries in §1, and the Window claim about a second `render()` throwing).

Suites:

- **surface** — `frameLoopViolations` returns `[]` for the real input; each of
  the eight rules fails by name when its fact is changed in a copy (rename an
  export, add an option, change `DEFAULT_FRAME_MS`, change a `tick` signature,
  add a render option, drop the remount line, change a CPU mode, add
  `requestAnimationFrame`).
- **page** — `frame-loop.mdx` contains every section heading, the six table tags
  and the compiled fence, no placeholder prose; `getMDXComponents()` registers
  every tag the page uses; `meta.json` lists the slug after `window`.
- **search** — `generatedSearchEntries` contains the entry; each §1 query that
  should move lands on `/docs/frame-loop`; each regression stays put.
- **truth** — the Window page no longer claims a second `render()` throws, and
  no page on the site claims a measured frame rate (the pattern
  `/\d+ ?fps/` outside `/docs/performance`'s measured section).

---

## 4. Files to change

| File | Change |
| ---- | ------ |
| `src/components/mdx.tsx` | import and register the six table components |
| `content/docs/meta.json` | add `"frame-loop"` after `"window"` |
| `src/lib/search.ts` | import `frameLoopSearchEntry`; add it to `generatedSearchEntries` |
| `src/lib/search-docs.ts` | add the Frame loop `indexedSurfaces` row |
| `src/lib/page-aliases.ts` | new `/docs/frame-loop` block + the plan-637 paragraph in the header comment |
| `src/lib/page-aliases.test.ts` | `owned` rows for every new term; `regressions` rows pinning `render loop` (Testing), `createRoot` (Testing), `fps` / `frame rate` (Performance), `frame overlay` / `debug frame overlay` (Window), `closing the window` (Window), `createNativeRenderer` / `enableAutomation` / `installBrowserAutomation` (Automation), `tick` (Checkbox, recorded limit) |
| `content/docs/window.mdx` | correct the "once per process / throws" claim to the remount rule; link the loop page |
| `content/docs/performance.mdx` | one sentence in `## What is not measured` linking the loop's pacing contract; no rate claimed |
| `content/docs/automation.mdx` | link the loop page from the `startFrameLoop` row |
| `content/docs/testing.mdx` | one sentence in `## The render loop` distinguishing `flush()` from the paced app loop |
| `content/docs/architecture.mdx` | name the frame loop in `## What runs where`, link here |
| `scripts/smoke-build.ts` | two production queries: `requiresTick` → `/docs/frame-loop`, `taskpolicy` → `/docs/frame-loop` |
| `src/example-snippets.test.ts` | add `"frame-loop"` to `extraPages` |

**Aliases to add** (exact whole-query only; each must be answered by a section or
table on the page):

`frame loop`, `frame pacing`, `frame budget`, `tick loop`, `hot reload`,
`hot reloading`, `process lifecycle`, `app lifecycle`, `cpu throttle`,
`cpu usage`, `limit cpu`, `throttle`, `background throttle`, `taskpolicy`,
`why does the app exit`, `requestAnimationFrame`, `request animation frame`.

Deliberately absent (with the regression that proves it): `fps` / `frame rate`
(Performance owns measurement), `test render loop` (Testing's test-renderer
section), `createRoot` (Testing), `frame overlay` / `debug frame overlay` /
`closing the window` (Window), `createNativeRenderer` / `enableAutomation` /
`installBrowserAutomation` (Automation), `tick` (recorded limit: a plain word,
currently Checkbox).

---

## 5. Commands and expected results

Run from the worktree root unless stated.

1. `cd apps/docs && nub exec vitest run src/frame-loop.test.ts src/lib/page-aliases.test.ts src/lib/search-docs.test.ts src/example-snippets.test.ts src/mdx-components.test.ts`
   Expected: all files pass. **STOP** if `example-snippets` cannot compile the
   fence: fix the fence, do not remove it.
2. `nub run --filter docs check-types`
   Expected: exit 0 (the app and `preview/tsconfig.json`).
3. `nub run lint` and `nub run fmt`
   Expected: exit 0, no files reformatted.
4. `nub run --filter docs smoke:build`
   Expected: exit 0, `118 pages`, both new production queries answer
   `/docs/frame-loop`, every link and fragment resolves. **STOP** on exit `2`
   (build/server) — report, do not retry unchanged.
5. `nub run --filter docs smoke:a11y`
   Expected: exit 0 in both schemes; the six tables must have `<th scope>` and a
   keyboard-reachable scroll region.
6. `nub run --filter docs smoke:console`
   Expected: exit 0, no console error on the new page.
7. `nub run check` and `nub run test`
   Expected: exit 0, `check:tests` accepts every assertion without
   `check-tests-ok`.

Scoped native run: none. This page documents the React layer and the installed
declarations; there is no new native probe and no scenario is touched. Record
that decision in the commit body.

---

## 6. Test plan — the forced directions

Each of these must be run once, recorded, and reverted before the commit:

1. Rename `startFrameLoop` to `beginFrameLoop` in a copy of the entry →
   surface rule 1 fails naming it.
2. Add `intervalMs?: number` to a copy of `startFrameLoop`'s options →
   surface rule 2 fails naming the option.
3. Change `DEFAULT_FRAME_MS = 8` to `16` in a copy of the runtime source →
   surface rule 3 fails naming the number.
4. Change `tick(): boolean` to `tick(): void` in a copy of the renderer
   declarations → surface rule 4 fails naming `tick`.
5. Add `onError?:` to a copy of `interface RenderOptions` → surface rule 5 fails
   naming the field.
6. Remove `slot.root.unmount()` from a copy of the renderer source → surface
   rule 6 fails naming the remount.
7. Change `MAC_CPU_THROTTLES` to two modes in a copy of the CPU source →
   surface rule 7 fails naming `maintenance`.
8. Add `requestAnimationFrame` to a copy of a dist source → surface rule 8 fails
   naming it.
9. Remove the page's `## Stopping the loop` heading → the page suite fails
   naming the heading.
10. Delete the frame-loop search entry from `generatedSearchEntries` → the
    search suite fails on `requiresTick` and `resetRender`.
11. Add `render loop` to the page aliases → the regression row fails, proving
    Testing's owner is pinned.
12. Restore the Window page's "a second `render()` throws" sentence → the truth
    suite fails naming the file.

The regression file also runs the §1 `owned` and `regressions` query lists
through the real `search()` merge, so a ranker change that moves an owner fails
by query and URL.

---

## 7. Acceptance criteria

- `/docs/frame-loop` builds and is reachable from the sidebar, sitemap and
  search; the MDX page renders the six generated tables and the compiled
  recipe.
- Every claim is traceable to the installed declarations or implementation; the
  73% / 1.5% figures are attributed to the runtime's comment and no measured
  frame rate is claimed.
- The Window page's second-`render()` claim is corrected from the installed
  source, and the four related pages link the loop without duplicating it.
- The measured queries in §1 return the page, and every pinned regression keeps
  its owner (with `tick` recorded as a measured non-fix).
- `nub run --filter docs check-types`, `nub run lint`, `nub run check` and
  `nub run test` pass; `smoke:build`, `smoke:a11y` and `smoke:console` pass.
- `TODO.md`, `PLAN.md` and the plan index are updated; the branch is committed
  and pushed.

## 8. STOP conditions

- The installed `@gpuix/react` 0.10.0 lifecycle surface differs from §3.1's
  assumed facts (a different entry export, an extra loop option, a different
  default): stop, record the real declarations, and amend the plan before
  implementing.
- `render()` turns out to throw on a second call in some other installed path
  (for example `init` refusing a second window): stop and report the measured
  behaviour rather than shipping the remount paragraph.
- `smoke:build` exits `2` or reports a page count that disagrees by more than
  one page: stop and record the build log.
- The page-alias guard cannot keep `test render loop` on Testing or `createRoot`
  on Testing while adding the new terms: stop and record the measured conflict
  instead of widening the alias.
- Any gate fails for a reason outside `apps/docs`: stop and record it as a
  cross-team row.

## 9. Corrections measured during implementation

1. **`render loop` moved to this page, by the page index rather than an alias.**
   Measured after the page landed: `render loop` returned
   `/docs/frame-loop` (page) with `/docs/testing#the-render-loop` second, because
   the new page's title and body match both words. This plan's §1 originally
   pinned the phrase to Testing. The move is accepted rather than forced with an
   alias (§8 forbids widening one): the app's loop is the primary meaning of
   "render loop", and Testing keeps the narrower `test render loop` phrase,
   which is the regression row now. Testing's heading is unchanged, so
   `/docs/testing#the-render-loop` (linked from Async data) still resolves.
2. **`THROTTLE` and `GPUIX_CPU_THROTTLE_APPLIED` are read, not declared as
   literals.** The guard compares `process.env.THROTTLE` and
   `process.env.GPUIX_CPU_THROTTLE_APPLIED`, which is what the installed source
   contains; the first draft looked for quoted literals and failed correctly.
3. **`MAC_CPU_THROTTLES` needed its own export-vocabulary token.** The lifecycle
   filter matched `Throttle` case-sensitively, so the all-caps constant was
   dropped from the entry's exports and the guard reported it as claimed but
   absent. `THROTTLE` is now an explicit alternative, and the forced-defect case
   in §6.1 still fails by name.

### 9.1 Recorded runs

| Direction | Run | Result |
| --------- | --- | ------ |
| §6.1–8 | the eight forced-defect cases in `src/frame-loop.test.ts` | each fails by name (13 surface cases, 61 tests total) |
| §6.9 | renamed `## Stopping the loop` to `## Owning the loop` | `keeps every section the page promises` failed: `expected [ '## Stopping the loop' ]` |
| §6.10 | deleted `frameLoopSearchEntry` from `generatedSearchEntries` | `is one of the generated documents` failed, and `requiresTick` returned `/docs/frame-loop#tick-and-why-the-pla…` (a heading) instead of the page |
| §6.11 | added `frame loop` as an alias | `does not shadow a page title` failed with `[ 'frame loop' ]` — the direction now proves the title rule, because `render loop` legitimately moved here (§9.1) |
| §6.12 | restored the Window throw sentence | `Window describes a remount instead of a second-render throw` failed |

Commands that ran and their results:

- `nub run --filter docs check-types` — exit `0`.
- `nubx vitest run src/frame-loop.test.ts` — 61 tests pass; with `page-aliases`,
  `example-snippets`, `mdx-components`, `content`, `internal-links`,
  `prose-truth`, `performance-page`, `window-page` and `content-references`,
  720 tests across 4 files where combined.
- `nub run --filter docs smoke:build` (build included) — exit `0`, **118
  pages**, 257 links, 1 524 anchors, search checked, both production queries
  included.
- `nub scripts/smoke-a11y.ts --no-build --only /docs/frame-loop` — exit `0`,
  1 page × 2 schemes, 0 violations.
- `nub scripts/smoke-console.ts --no-build --only /docs/frame-loop` — exit `0`,
  1 page, 0 errors.
- The first two `smoke:build` runs reported all 130 search requests as `request
  failed` while the page crawl passed. The cause was the host, not the site:
  stray `vite preview`/`workerd` processes from earlier smoke runs were still
  resident, and the cold search-index build timed out under their load. After
  they were stopped the full run (build included) was green. Recorded here
  because a `request failed` on every search is a host symptom, not a ranker
  regression.
- No native scenario is touched; no `--only` playground run is part of this plan.

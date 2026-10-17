# 178 — Hoist the native renderer adapter into `@gpuixui/testing`

| Field | Value |
| ----- | ----- |
| Status | ready to execute |
| Phase | B (test infrastructure) |
| Owner | playground workstream (`packages/testing`, `apps/playground`) |
| Depends on | `100` (the package), `120` (the host adapter), `140` (a binding to run it) |
| Fixes | `TODO.md` → Primitives workstream → *"packages/testing: hoist `runtime/harness.ts` into the shared smoke framework"* (plan 041 §2.2) |

## 1. Problem

Two native adapters exist for the same renderer:

1. `apps/playground/src/smoke/host.ts` (284 lines) adapts `TestRenderer` to
   `Smoke.SmokeHost` for the 46-scenario suite.
2. `packages/primitives/runtime/harness.ts` (343 lines) adapts the same
   `TestRenderer` to an Option-returning `Runtime` for the Tier 1 suites.

Both implement the same subtle rules, independently:

- an element that paints no surface (`<anchored>`, `<virtual-list>`) has no
  bounds, so input targeting must walk to the nearest ancestor that does;
- `subtreeText` concatenates *own text plus every descendant*, like DOM
  `textContent`;
- `focusNext`/`focusPrevious` are raw native calls — they do **not** drain and
  dispatch focus events, so the adapter must call `dispatchNativeEvents()` and
  `flush()` or React's `onFocus` never runs;
- a `getScrollOffset` tuple becomes `{ x, y }` and a virtual list's
  `getListScrollTop` is the only exact anchor;
- the runtime's style/a11y/highlight payloads are decoded at the boundary, never
  trusted.

Plan 041 §2.2 recorded the duplication as intentional **only until
`packages/testing` landed**, and put the hoist in `TODO.md`. The package landed
in plan `100`; this plan closes the debt for the smoke half and leaves the
primitives half a one-file migration (recorded, not edited — different owner).

## 2. Measured baseline (this worktree, 2026-10-17)

| Command | Result |
| ------- | ------ |
| `nub run check` | passes (`tests: every test asserts something…`, lint, fmt, check-types) |
| `nub run test` | 282 primitives + 20 playground + package suites green |
| `nub run --filter playground build && nub apps/playground/dist/smoke/run.js` | **46/46**, `exit 0` |

So the refactor has a hard integration oracle: the same 46 scenarios must pass
after it, and the shim must still exit `2` on a host with no binding (that path
is unit-tested in `run.test.ts`).

## 3. Design

**One adapter, owned by the testing package, with no GPUix import.**

`packages/testing` must stay platform-free (plan `100` §1): its own tests run on
a host with no binding, and importing the package must never load one. That is
preserved by typing the renderer **structurally**:

```ts
export interface NativeRenderer { /* only the verbs the adapter calls */ }
```

`@gpuix/native`'s real `TestRenderer` already satisfies this interface
structurally; the compiler proves it where the playground constructs the host
(`createHost(root.renderer)`), so there is no assertion and no `any`. A narrower
renderer (a fake in a test) satisfies it too — which is exactly how the adapter
becomes unit-testable without the binding.

`packages/testing/src/native.ts` exports the namespace `Native`:

| Export | Purpose |
| ------ | ------- |
| `NativeElement`, `NativeRenderer` | the structural port (`id`, `testId`, `type`, `text`, `children`, `parentId`, `style`; the renderer verbs used) |
| `find`, `findById` | `Option` lookups by test id / element id |
| `allElements` | depth-first walk from the renderer root — primitives' "find a node with no testId" |
| `boundsOf` | the element's **own** painted bounds (`None` when it paints no surface) |
| `hitBoundsOf` | own bounds, else the nearest ancestor's — the input-targeting rule |
| `centerOf`, `subtreeText` | hit point, and own+descendant text |
| `focusedElement` | the focused node, not just its test id |
| `createHost(renderer)` | the `Smoke.SmokeHost` adapter the suite consumes |

Rules that stay explicit because the two consumers observe them differently:

- `SmokeHost.bounds` keeps reporting the element's **own** bounds (scenarios
  assert "this node paints nothing" — `<canvas>`); the ancestor fallback is only
  used for input targeting (`centerOf`).
- `SmokeHost.focused` still returns the focused element's `testId` or `null`;
  `focusedElement` returns the node.
- Style, a11y and highlight payloads are decoded in the adapter with the
  schemas `smoke.ts` already owns (`StyleSnapshot`, `A11yTree`,
  `HighlightMatch`). A malformed style payload still makes the whole snapshot
  `null` (documented defect behaviour); a malformed highlight is still dropped
  individually so one wash cannot hide the rest.

`apps/playground/src/smoke/host.ts` is deleted; `run.ts` imports
`Native.createHost`. The playground keeps exactly one GPUix-named import
(`run.ts`'s dynamic preflight and its `EventPayload` type), which is the point.

## 4. Files

```
packages/testing/src/native.ts        NEW   structural port + helpers + createHost
packages/testing/src/native.test.ts   NEW   fake-renderer tests for the adapter rules
packages/testing/src/index.ts         EDIT  export * as Native from "./native.js"
packages/testing/README.md            EDIT  Native namespace, the port, the two bounds rules
apps/playground/src/smoke/run.ts      EDIT  import { Native } from "@gpuixui/testing"; createHost
apps/playground/src/smoke/host.ts     DELETE
apps/playground/README.md             EDIT  structure table (no host.ts; adapter lives in the package)
TODO.md                               EDIT  tick the hoist; add the primitives migration task
PLAN.md                               EDIT  D25: one native adapter, structural port, no GPUix import
.agents/slop/plans/README.md          EDIT  index this plan
.agents/slop/plans/100-package-testing.md  EDIT  one-line amendment pointing at 178
```

No dependency change: `@gpuixui/testing` gains no `@gpuix/*` dependency, and
`package.json`/tsconfigs are untouched.

## 5. Steps

1. Create `native.ts` by moving the bodies of `host.ts` behind the port.
   Keep the JSDoc that explains *why* (ancestor bounds, focus dispatch), delete
   comment that only restates code.
2. `index.ts`: add `export * as Native from "./native.js";` beside `Smoke`,
   `Report`, `Runtime`.
3. `run.ts`: replace `import { createNativeHost } from "./host.js";` with
   `Native` in the existing `@gpuixui/testing` import; `const host =
   Native.createHost(root.renderer);`.
4. `rm apps/playground/src/smoke/host.ts`.
5. Write `native.test.ts` (see §6).
6. Update both READMEs, `PLAN.md`, `TODO.md` and the plan index.

Commands, in order, with the expected result:

```sh
nub run --filter @gpuixui/testing build      # tsc emits dist; no error
nub run --filter @gpuixui/testing test       # includes native.test.ts, all green
nub run check                               # lint + fmt + check:tests + check-types
nub run test                                # every workspace suite green
nub run --filter playground build && nub apps/playground/dist/smoke/run.js
# -> "46/46 scenarios passed", exit 0
```

On a host with no binding the last command must still exit `2` and write no
report; that behaviour is unit-tested and must not be re-observed by breaking
the host. If this box has the binding (it does), the honest check is the 46/46
run.

## 6. Test plan (`native.test.ts`)

A `fakeRenderer` implements `NativeRenderer` over an in-memory list and records
every simulated input. Each test names the rule it guards:

| Test | What it catches |
| ---- | --------------- |
| `text` joins an element's own text and its descendants in order | `subtreeText` dropping a child or reordering |
| `text` is `None` for an unknown test id | a lookup silently returning `""` |
| `boundsOf` reports `None` for a node that paints no surface, `hitBoundsOf` walks to its parent | the two bounds rules collapsing into one — either the `<canvas>` assertions or input targeting would break |
| `click` sends the hit point of the nearest ancestor with bounds | clicking at `0,0` for `<anchored>`/`<virtual-list>` |
| `click` on an unknown id simulates nothing | a scenario bug turning into a click on the origin |
| `focused` maps the renderer's focus id to the element's `testId`; `None` without a testId | returning a raw numeric id or the wrong node |
| `focusNext` calls `focusNext → dispatchNativeEvents → flush` in that order | React `onFocus` never firing (plan 140 §4) |
| `paintedStyle` decodes the runtime payload and refuses one whose type changed | coercion hiding a changed style report |
| `a11y` decodes the dump; an invalid dump is `None` | trusting an untyped payload |
| `scrollOffset` maps `[x, y]`; `listScrollTop` maps `[i, o, h]` | a persisted anchor reading the wrong axis/tuple |
| `rightClick` sends button 2; `drag` sends down, `n` moves, up in order | a context menu or drag probe receiving a primary click |
| `selectText` draws from the first endpoint's top-left to the second's bottom-right and returns the selection; a missing endpoint is `None` | selection probes silently selecting nothing |

**Two directions.** This is a refactor with no bug fix, so the guard is:
(a) each test fails when its rule is mutated in `native.ts` (temporarily drop the
ancestor walk, drop `dispatchNativeEvents`, swap the tuple, change the drag
button), and (b) the 46 native scenarios fail if the host regressed end to end.
Record the mutation, the failing test name and exit code in this plan's §7 after
running them.

## 7. Measured result

Run 2026-10-17 in this worktree, in this order:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/testing check-types` | clean — the structural port compiles |
| `nub run --filter playground check-types` | clean — `createHost(root.renderer)` accepts the real `TestRenderer` with no cast |
| `nub run --filter @gpuixui/testing test` | **40 tests / 4 files** (22 before + 18 adapter tests) |
| `nub run check` | passes (`check:tests`, lint, fmt, check-types) |
| `nub run test` | 282 primitives + 20 playground + the package suites, all green |
| `nub run --filter playground build && nub apps/playground/dist/smoke/run.js` | **46/46**, `exit 0` |

Two-direction proofs — each mutation was applied to `native.ts`, the named test
failed, and the file was restored (`diff` identical):

| Mutation | Failing test | Result |
| -------- | ------------ | ------ |
| `hitBoundsOf` drops the ancestor walk | `bounds > keeps the element's own bounds separate…`, `clicks a surface-less layer…`, `aims hover, wheel and a file drop…` | 3 failed / 37 passed |
| `focusNext` skips `dispatchNativeEvents` | `input > dispatches focus events before repainting on traversal` | 1 failed / 39 passed |
| `rightClick` sends button 0 | `input > right-clicks with button 2` | 1 failed / 39 passed |
| `scrollOffset` swaps its axes | `runtime reports > maps scroll tuples into the documented shapes` | 1 failed / 39 passed |

`host.ts` is deleted (284 lines); the adapter now lives once in
`packages/testing/src/native.ts` (375 lines including the port and its JSDoc).
The primitives harness is unchanged and its migration is recorded in
`TODO.md` with the exact exports to consume.

## 8. STOP conditions

- `@gpuixui/testing` would need to import `@gpuix/*` (even type-only) to
  satisfy the port → stop: widen the structural port or narrow the adapter;
  never add the dependency.
- `TestRenderer` is not structurally assignable to `NativeRenderer` → stop and
  report the exact `tsc` error; fix the port, not the renderer with a cast.
- Any of the 46 scenarios changes verdict → stop and report the failing
  scenario/check; do not adjust a scenario expectation to fit the refactor.
- The unsupported-host path (`run.test.ts`, exit `2`) breaks → stop.
- A primitives file (`packages/primitives/runtime/harness.ts`) needs an edit to
  make this work → stop: that file belongs to another workstream. Record the
  migration as a TODO item instead.

## 9. Acceptance

- `native.ts` is the only implementation of the adapter rules; `host.ts` is gone.
- `Native` is exported from `@gpuixui/testing`; the package still has no
  `@gpuix/*` dependency and no import of one.
- `native.test.ts` passes and each listed rule fails under its mutation.
- The native suite is still 46/46 on this host, exit `0`.
- `nub run check`, `nub run lint`, `nub run test` pass.
- `TODO.md`, both READMEs, `PLAN.md` (D25) and the plan index are updated;
  the primitives migration is recorded with the exact file and import.

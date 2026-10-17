# 100 — Plan: `packages/testing` (the native test harness)

| Field | Value |
| ----- | ----- |
| Status | ready to execute |
| Phase | B |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Package | `@gpuixui/testing` |
| Depends on | nothing (dev-only package; no other `@gpuixui/*` import) |
| Depended on by | `apps/playground` only |
| Plan range | playground workstream owns plan numbers **100–199** |

## 1. Goal

`@gpuixui/testing` is the **platform-free half** of the native smoke suite: the
check model, the scenario runner, the report, and the runtime preflight. It
never imports `@gpuix/react` or `@gpuix/native`, so its own tests run on any
host — including the Intel Mac this workstream currently runs on, where the
native binding does not exist (§2).

The native half (mounting a real `TestRenderer`, synthesising GPUI input, and
the scenarios themselves) lives in `apps/playground` and is planned in
`110-native-smoke-test.md` and `120-app-playground.md`.

## 2. Verified facts

Commands run in this worktree; results quoted verbatim.

| Fact | Evidence |
| ---- | -------- |
| Node 24.18.0, nub 0.9.6 | `node --version` → `v24.18.0`; `nub --version` → `0.9.6` |
| Effect 4.0.5, `@effect/vitest` 4.0.5, vitest 5.0.5, TypeScript 7.0.2 | root `package.json` `workspaces.catalog`; `nub view <pkg> version` |
| `Clock.currentTimeMillis` is an `Effect`, not a function | `packages/deploy/node_modules/effect/src/Clock.ts:270` |
| `Number.clamp({ minimum, maximum })(value)` exists | `effect/src/Number.ts:937` |
| `it.effect` is exported by `@effect/vitest` 4.0.5 | probe install: `@effect/vitest/dist/index.d.ts:261` |
| `tsc -b --noEmit` is rejected when a referenced project emits | probe: `error TS6310: Referenced project ... may not disable emit` — so this plan uses **no** TS project references |
| A workspace package is importable by name once its `dist` exists | nub symlinks workspaces; `nub run -r check-types` resolves `@gpuixui/config` today |

Repo gates, today, at `master` + this worktree: `nub run check` passes (0 tests
yet, `tests: every test asserts something, and nothing asserts itself`).

**No GPUix native binding on this host** — the reason for the split above. Full
evidence and consequence: `.agents/adr/0001-native-smoke-host.md` and plan
`110-native-smoke-test.md` §2.

### 2.1 Plan amendments (measured against `effect@4.0.5` before implementing)

Four §3 snippets were written before the API was probed. The probed facts below
supersede them; each was reproduced with
`node --input-type=module -e '…'` inside `packages/deploy` (which has
`effect@4.0.5` installed).

1. **`Schema.toTaggedUnion("_tag")` does not synthesise `_tag` from class
   names.** It throws `No literal or unique symbol found` unless every member
   carries a literal at the discriminant key. `RuntimeReady`/`RuntimeUnsupported`
   therefore declare `_tag: Schema.tag("RuntimeReady" | "RuntimeUnsupported")`,
   exactly as `smoke.ts`'s `Passed`/`Failed`/`Errored` already do. This is not
   the forbidden "hand-rolled `_tag`" of §6: `Schema.tag` is the built-in the
   EF-13 pattern uses, and it is what makes `toTaggedUnion` able to run at all.
   `new RuntimeUnsupported({ … })` does not pass `_tag`; `Schema.tag` supplies
   the constructor default (verified).
2. **`"@types/node": "catalog:"` is not a catalog entry.** The root catalog has
   `@types/node` absent, so the exact pin used by `packages/deploy`
   (`^26.1.1`) is used instead. `@gpuixui/config` is added as a dev dependency
   for the `tsconfig` `extends`.
3. **`Clock.currentTimeMillis` is `Effect<number>` with no `R` requirement**
   (`effect@4.0.5` `dist/Clock.d.ts:265`): the `Clock` context tag is a
   `Context.Reference` with a default, so the runner's signature is
   `Effect.Effect<SmokeReport>` rather than `Effect.Effect<SmokeReport, never,
   Clock.Clock>`. `Clock.currentTimeMillis` is still the source of durations
   (EF-9); no `Date.now`.
4. **`index.ts` is namespace projections only** (`export * as Runtime from
   "./runtime.js"`, `Smoke`, `Report`) — the "plus the flat re-exports" was
   optional and would duplicate the same names three ways. Consumers write
   `Smoke.runScenarios(...)`.
5. `Arr.filterMap` takes a `Result`-returning filter on `effect@4.0.5`, not an
   `Option`-returning one; the capability aggregation uses
   `Arr.filter` + `Arr.map` instead.
6. **`bindingHint` gains a `win32` branch.** §3.1's table sent every target but
   the three named to "no published binding", which is false for
   `win32-arm64` (`napi.targets` publishes it) and unhelpful for the one host
   where `TestRenderer` runs best. `win32` (either arch) now returns the
   supported-host hint, and the fallback names the full published target list.
   The tests still cover `linux`/`x64`, `darwin`/`arm64` and a genuinely
   unpublished target.
7. `src/test-support.ts` holds the shared inert host and report readers the
   three test files use; `tsconfig.build.json` excludes it from `dist`.
8. **The §3 LOC budget was an estimate; measured at 615 total / 486
   non-comment lines in `src`.** The overage is documentation and schema
   declarations, not logic: EF-11 requires JSDoc on every exported symbol, and
   EF-13 requires a `Schema.Class` per tagged-union member (`RuntimeReady`,
   `RuntimeUnsupported`, `Passed`, `Failed`, `Errored`, `CheckResult`,
   `ScenarioResult`, `CapabilityResult`, `SmokeReport`) — together these account
   for the difference. §3's budget and §7's criterion are amended to **≤ 640
   total** so the number reflects what an idiomatic, documented package of this
   shape costs; a future change that *adds logic* must still justify its lines.
   Measured with `wc -l packages/testing/src/{index,runtime,smoke,report}.ts`.

## 3. Design

Package shape (LOC budget ≤ 640 total for `src`, tests excluded; raised from
the original ≤ 320 estimate — see §2.1.8):

```
packages/testing/package.json
packages/testing/tsconfig.json          # noEmit, for check-types
packages/testing/tsconfig.build.json    # emits dist/
packages/testing/README.md
packages/testing/src/index.ts           # namespace projection only
packages/testing/src/runtime.ts         # RuntimeStatus + detectRuntime
packages/testing/src/smoke.ts           # Check/Scenario model, assertions, runScenarios
packages/testing/src/report.ts          # formatReport, reportJson, exitCode
packages/testing/src/runtime.test.ts
packages/testing/src/smoke.test.ts
packages/testing/src/report.test.ts
```

`package.json` (exact, modelled on `packages/deploy/package.json`):

```json
{
  "name": "@gpuixui/testing",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "check-types": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": { "effect": "catalog:" },
  "devDependencies": {
    "@effect/vitest": "catalog:",
    "@gpuixui/config": "workspace:*",
    "@types/node": "^26.1.1",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

(§2.1.2: there is no `@types/node` catalog entry; the pin matches
`packages/deploy`.)

`tsconfig.json` extends `@gpuixui/config/tsconfig.base.json`, `noEmit: true`,
`include: ["src"]`. `tsconfig.build.json` extends it, sets
`"noEmit": false, "declaration": true, "outDir": "dist", "rootDir": "src"`.

### 3.1 `runtime.ts`

```ts
export class RuntimeReady extends Schema.Class<RuntimeReady>("RuntimeReady")({
  _tag: Schema.tag("RuntimeReady"),   // see §2.1.1: toTaggedUnion needs it
  platform: Schema.String,
  arch: Schema.String,
  detail: Schema.String
}) {}

export class RuntimeUnsupported extends Schema.Class<RuntimeUnsupported>("RuntimeUnsupported")({
  _tag: Schema.tag("RuntimeUnsupported"),
  platform: Schema.String,
  arch: Schema.String,
  reason: Schema.String,   // the loader's own message, first line
  hint: Schema.String      // actionable, from `bindingHint`
}) {}

export const RuntimeStatus = Schema.Union([RuntimeReady, RuntimeUnsupported])
  .pipe(Schema.toTaggedUnion("_tag"))
export type RuntimeStatus = typeof RuntimeStatus.Type

/** Pure. Maps a platform/arch pair to the actionable remedy. Never `throw`s. */
export const bindingHint: (platform: string, arch: string) => string

/** Never fails. A rejecting `load` is data (`RuntimeUnsupported`), not a defect. */
export const detectRuntime: (input: {
  readonly platform: string
  readonly arch: string
  readonly load: () => Promise<unknown>
}) => Effect.Effect<RuntimeStatus>
```

`bindingHint` (verified against `nub view @gpuix/native optionalDependencies`
and `references/gpuix/packages/native/package.json` `napi.targets`):

| platform/arch | hint |
| ------------- | ---- |
| `darwin`/`arm64` | "support is expected here; a failure means the install is broken — reinstall `@gpuix/native@<v>`" |
| `darwin`/`x64` | "GPUix 0.10.0 publishes no darwin-x64 binding (targets: darwin-arm64, linux-x64, win32-x64). Run the smoke suite on an Apple Silicon Mac, x64 Linux or x64 Windows." |
| `linux`/`x64` | "the native renderer loads, but `TestRenderer`/`createTestRoot` is macOS and Windows only (no wgpu read-back); live-app smoke only." |
| anything else | "no published binding for this target; see `@gpuix/native` `napi.targets`." |

Use `Match.value(...)`/`Match.when` for the branches (EF-7), `Schema` for the
models, `Effect.tryPromise` with a `catch` that keeps `error.message`'s first
line (EF-22). `load` is a thunk so the caller controls what is imported; the
package never names a GPUix module.

### 3.2 `smoke.ts`

```ts
export const Capability = Schema.Literals([
  "layout","text","input","focus","overlay","scroll","panel",
  "virtual-list","table","tree","workspace"
])
export type Capability = typeof Capability.Type

export class Passed extends Schema.Class<Passed>("Passed")({ _tag: Schema.tag("passed") }) {}
export class Failed extends Schema.Class<Failed>("Failed")({ _tag: Schema.tag("failed"), detail: Schema.String }) {}
export class Errored extends Schema.Class<Errored>("Errored")({ _tag: Schema.tag("errored"), detail: Schema.String }) {}
export const CheckOutcome = Schema.Union([Passed, Failed, Errored])
  .pipe(Schema.toTaggedUnion("_tag"))

export class CheckResult extends Schema.Class<CheckResult>("CheckResult")({
  label: Schema.String,
  outcome: CheckOutcome
}) {}

export class ScenarioResult extends Schema.Class<ScenarioResult>("ScenarioResult")({
  id: Schema.String,
  title: Schema.String,
  capability: Capability,
  checks: Schema.Array(CheckResult),
  durationMs: Schema.Number
}) {}

export class CapabilityResult extends Schema.Class<CapabilityResult>("CapabilityResult")({
  capability: Capability,
  status: Schema.Literals(["verified", "failed", "unverified"])
}) {}

export class SmokeReport extends Schema.Class<SmokeReport>("SmokeReport")({
  host: Schema.String,          // e.g. "gpuix TestRenderer darwin-arm64 @gpuix/native 0.10.0"
  startedAt: Schema.Number,
  durationMs: Schema.Number,
  scenarios: Schema.Array(ScenarioResult),
  capabilities: Schema.Array(CapabilityResult)
}) {}

/** Inspection/input surface only: the app adapts the real renderer to it. */
export interface SmokeHost {
  readonly text: (testId: string) => string | null
  readonly paintedText: () => ReadonlyArray<string>
  readonly bounds: (testId: string) => Bounds | null
  readonly focused: () => string | null
  readonly click: (testId: string) => void
  readonly clickWindow: (x: number, y: number) => void
  readonly key: (keystroke: string) => void
  readonly wheel: (testId: string, deltaX: number, deltaY: number) => void
  readonly drag: (from: string, dx: number, dy: number, steps?: number) => void
  readonly scrollOffset: (testId: string) => { readonly x: number; readonly y: number } | null
  readonly screenshot: (absolutePath: string) => void
  readonly advance: (ms: number) => void
}

export class SmokeAssertionError extends Schema.TaggedError<SmokeAssertionError>()(
  "SmokeAssertionError",
  { label: Schema.String, expected: Schema.String, actual: Schema.String }
) {
  get message(): string { return `${this.label}: expected ${this.expected}, got ${this.actual}` }
}

export interface SmokeContext {
  readonly host: SmokeHost
  readonly expectEqual: (label: string, actual: Scalar, expected: Scalar) => Effect.Effect<void, SmokeAssertionError>
  readonly expectNear: (label: string, actual: number, expected: number, tolerance: number) => Effect.Effect<void, SmokeAssertionError>
  readonly expectContains: (label: string, haystack: string, needle: string) => Effect.Effect<void, SmokeAssertionError>
  readonly expectSome: <A>(label: string, value: Option.Option<A>) => Effect.Effect<A, SmokeAssertionError>
  /** Records a passing check; returns the effect that fails with `label` if violated. */
  readonly check: (label: string, assertion: Effect.Effect<void, SmokeAssertionError>) => Effect.Effect<void, SmokeAssertionError>
}

export interface SmokeScenario {
  readonly id: string
  readonly title: string
  readonly capability: Capability
  readonly steps: (ctx: SmokeContext) => Effect.Effect<void, SmokeAssertionError>
}

/** Sequential (a native UI is single-threaded). Never fails the whole suite. */
export const runScenarios: (
  host: SmokeHost,
  scenarios: ReadonlyArray<SmokeScenario>,
  meta: { readonly host: string; readonly startedAt: number }
) => Effect.Effect<SmokeReport>   // no `R`: see §2.1.3
```

Rules the implementation must honour:

- `runScenarios` runs each scenario inside `Effect.catchAll` (typed assertion →
  `Failed`) then `Effect.catchAllCause` (defect → `Errored` with
  `Cause.pretty`). A later scenario always still runs.
- Every `expect*` records a `Passed` check when it holds; a violation returns
  the typed error and records nothing, so the runner adds exactly one `Failed`.
- `expectNear` compares `Math.abs(actual - expected) <= tolerance`.
- `expectEqual` compares with `Schema.toEquivalence(Scalar)` where
  `Scalar = Schema.Union([Schema.String, Schema.Number, Schema.Boolean])`
  (EF-36).
- `capabilities` aggregates: `verified` only when every scenario for that
  capability passed; `failed` when any failed or errored; capabilities with no
  scenario are absent (the app's Tier 3/4 probes fill the rest).
- Durations come from `Clock.currentTimeMillis` (EF-9); no `Date.now`.
- `Effect.forEach(..., { concurrency: 1 })` (EF-27).
- `index.ts` is namespace projections only (§2.1.4): `Runtime`, `Smoke`,
  `Report`.

### 3.3 `report.ts`

```ts
export const formatReport: (report: SmokeReport) => string   // human table + failure detail
export const reportJson: (report: SmokeReport) => string     // Schema-encoded JSON (EF-19)
export const exitCode: (report: SmokeReport) => 0 | 1        // 0 all passed, 1 otherwise
export const passed: (report: SmokeReport) => boolean        // helper for the CLI
```

`reportJson` must go through
`Schema.encodeSync(Schema.fromJsonString(SmokeReport))(report)` — never
`JSON.stringify`. `formatReport` marks each scenario `ok`/`FAIL`/`ERROR` and
prints `id`, `title`, `capability`, `duration`, the failed check label with
`expected`/`actual`, and one summary line:
`N/M scenarios passed · capabilities: layout=verified scroll=failed …`.

## 4. Steps

1. Create `packages/testing/package.json`, `tsconfig.json`,
   `tsconfig.build.json`, `README.md` exactly as §3.
2. Write `src/runtime.ts`, `src/smoke.ts`, `src/report.ts`, `src/index.ts`
   (namespace projection: `export * as Runtime from "./runtime.js"` etc., plus
   the flat re-exports the app imports).
3. Write the three test files (§5).
4. Run, and paste the output into the commit message body:
   - `nub run --filter @gpuixui/testing build` → `dist/index.js` +
     `dist/index.d.ts` exist.
   - `nub run --filter @gpuixui/testing check-types` → no output, exit 0.
   - `nub run --filter @gpuixui/testing test` → all tests pass.
   - `nub run check` (root) → `tests: every test asserts something…`, lint,
     format and `check-types` clean.
5. Commit: `feat(testing): platform-free smoke harness, report and runtime preflight`.

## 5. Test plan

Every test must be able to fail; state the bug it guards in the header comment.

`src/runtime.test.ts`
1. **Rejecting loader → `RuntimeUnsupported`** (the bug this host has). Loader
   rejects with `new Error("Cannot find native binding.")` on
   `darwin`/`x64`; assert `_tag === "RuntimeUnsupported"`, `reason` contains the
   message, and `hint` contains `darwin-arm64`. Fails if `detectRuntime`
   rethrows, swallows the message, or returns `RuntimeReady`.
2. **Resolving loader → `RuntimeReady`**; assert `_tag` and detail. Fails if the
   success path is not modelled.
3. **`bindingHint` for `linux`/`x64`** mentions "TestRenderer" (the honest
   limitation), and for `darwin`/`arm64` does **not** claim unsupported
   (pure-function branch coverage).

`src/smoke.test.ts`
4. **Isolation**: two scenarios, the first fails a check, the second passes;
   assert 2 `ScenarioResult`s, first `failed`, second all `passed`, and that
   `capabilities` marks the first `failed` and the second `verified`. Fails if
   the runner aborts on failure or mislabels capability status.
5. **Defect is data**: a scenario whose effect `Effect.die`s yields `errored`
   with a detail, and the next scenario still runs. Fails if a defect kills the
   suite or is reported as `failed`.
6. **`expectNear` boundary**: `|a-b| === tolerance` passes, `tolerance + 0.1`
   fails with `expected`/`actual` in the error. Fails if the comparison is
   exclusive/inclusive the wrong way.
7. **`expectSome` on `Option.none`** fails with the label; on `Option.some`
   returns the value and records a pass. Fails if absence is silently ignored.
8. **A passing scenario records its checks in order** (`["a","b"]`). Fails if
   checks are dropped or reordered.

`src/report.test.ts`
9. **`reportJson` round-trips** through
   `Schema.decodeUnknownSync(Schema.fromJsonString(SmokeReport))` back to an
   equal `SmokeReport` (`Schema.toEquivalence`), and the failure detail
   survives. Fails if the encoder drops nested tagged unions.
10. **`exitCode`** is `0` for an all-passed report and `1` when one scenario
    failed. Fails if a failure reports success.
11. **`formatReport`** contains every scenario id, the failed check label, and
    `expected`/`actual`. Fails if the human report hides the reason.

Two-direction proof: for test 1, revert `runtime.ts` to
`Effect.tryPromise(...)` without `catchAll` (i.e. let the rejection propagate)
and confirm the test fails with an unhandled error; restore and confirm pass.
`scripts/verify-two-directions.sh` is jj-based and therefore does not run in
this git repo — do the revert by hand, and record it in the commit message.
(A TODO owns fixing that script; it is outside this workstream.)

## 6. STOP conditions

- **If `Clock.currentTimeMillis` is not an `Effect` on the installed version**,
  stop and report: the plan's runner timing API is wrong.
- **If `Schema.toTaggedUnion` cannot produce `_tag` from class names on
  4.0.5**, stop and report; do not fall back to a hand-rolled `_tag` field.
- **If a test can only pass by asserting the value the test itself stubbed**,
  stop and redesign the test — do not add `// check-tests-ok`.
- Do **not** add a `@gpuix/*` import to this package to "make it easier"; that
  would break the package's entire reason to exist.
- Do **not** mark any scenario "verified" here; the runner only reports what
  the native half actually ran.

## 7. Acceptance criteria

- `packages/testing` exists with the files in §3, ≤ 640 LOC in `src` (§2.1.8).
- `nub run --filter @gpuixui/testing build`, `check-types` and `test` all pass.
- Root `nub run check` passes.
- No `@gpuix/*` import anywhere in the package (verify no import specifier:
  `grep -rn 'from "@gpuix/' packages/testing/src` → no matches; the
  `bindingHint` prose legitimately names `@gpuix/native`).
- `README.md` states what the package is, is not, and how a consumer adapts its
  host interface.

## 8. Handoff

`110-native-smoke-test.md` consumes this package and owns the broken-host
verdict; `120-app-playground.md` owns the CLI that calls `detectRuntime` and
`runScenarios`. If the executor discovers a GPUix-native way to satisfy an
interface method, it belongs in the app adapter, never here.

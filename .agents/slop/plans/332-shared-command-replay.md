# Plan 332 — `@gpuixui/testing`: replay a component runtime without a renderer

**Workstream:** playground (`packages/testing`).
**Phase:** B (foundation) — the shared half of plan `201`.
**Depends on:** plan `201` (the runtime convention; `packages/components/src/core/runtime.ts`
is the reference implementation), plan `100` (`packages/testing`).
**Number:** `331` was the last playground plan; this takes `332`.

---

## 1. Why

Plan `201` made the convention "a stateful component is a pure reducer plus
part-shaped queries" and landed the runtime in `packages/components`. Its test
helper (`runtime.run`) lives **inside the components package**, so a suite in
`packages/primitives`, `packages/data-grid` or an app cannot replay the same
commands without importing a package it must not depend on.

`packages/testing` is the platform-free test package every workspace already
depends on. It gets one small, typed fold: commands in, final state and query
outputs out. No React, no GPUix, no import of `@gpuixui/components` — the runtime
is described structurally, so the compiler accepts the real one and a fake.

This is an interlock row in `TODO.md` (plan `201` shared helper) and the
interlock table in `TODO.md` → "Interlocks": *`packages/testing/src/state.ts` +
test: `runCommands(runtime, commands)` for suites outside this package*.

## 2. Contract

`packages/testing/src/state.ts` exports:

```ts
/** The two pieces of a runtime a replay needs. A structural port. */
export interface Runnable<State, Command> {
  readonly initial: State;
  readonly reduce: (state: State, command: Command) => State;
}

/** A runtime that can also answer part-shaped questions about a state. */
export interface Queried<State, Command, Queries>
  extends Runnable<State, Command> {
  readonly query: (state: State) => Queries;
}

export interface Replay<State, Queries> {
  readonly state: State;
  readonly queries: Queries;
}

/** Folds `commands` from `initial` and answers the final query. */
export const runCommands: <State, Command, Queries>(
  runtime: Queried<State, Command, Queries>,
  commands: Iterable<Command>,
) => Replay<State, Queries>;
```

Rules:

- pure and synchronous; `Arr.reduce` from `effect/Array`, never a native loop;
- returns a **new** value; `runtime.initial` is never mutated (the state is
  immutable by convention, and the test proves the initial object survives);
- an empty command iterable returns `{ state: initial, queries: query(initial) }`;
- the query runs **once**, after the fold, on the final state;
- `Command` is unconstrained: the components package's `Command` interface
  (`readonly _tag: string`) is assignable, but so is a plain union in a test.

Why both values: a caller usually needs the final state for a follow-up command
and the queries for an assertion. Returning them together keeps the query
honest (it can only see the final state).

## 3. Files

| Path | Action |
| ---- | ------ |
| `packages/testing/src/state.ts` | **create** — the port and `runCommands` |
| `packages/testing/src/state.test.ts` | **create** — the able-to-fail suite |
| `packages/testing/src/index.ts` | add `export * as State from "./state.js";` |
| `TODO.md` | tick the plan-`201` shared-helper row; update the interlock row |
| `.agents/slop/plans/README.md` | index this plan; mark plan `201`'s helper landed |
| `packages/testing/README.md` | one paragraph and one usage snippet (only if the file has a module list; otherwise skip — do not invent docs) |

Do **not** edit `packages/components`: its `runtime.run` stays the in-package
shortcut. Do **not** add a dependency: `effect` is already the package's only
runtime dependency.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/testing test
# expected: exit 0; 5 test files, 46 + N tests (N ≥ 4)

nub run --filter @gpuixui/testing build
# expected: exit 0; dist/state.js and dist/state.d.ts exist

nub run --filter @gpuixui/testing check-types
# expected: exit 0 (the package has a check-types script)

nub run check
# expected: exit 0 (check:tests, lint, fmt, check-types)
```

## 5. Test plan (`packages/testing/src/state.test.ts`)

Header comment states the bugs guarded: a fold that ignores the commands, a
query answered from the initial state, and a replay that mutates `initial`.

Fixture: a small tabs runtime with a `select` command and a `query(value)`
returning `{ active }` — the same shape as plan `201`'s reference test, written
locally so this package owns no import of the components package.

Cases (each must be able to fail):

1. **fold** — `runCommands(tabs, [select("second")])` reports
   `{ state: { selected: "second" }, queries: { active: true } }` for
   `query("second")`. Mutation: delete the `select` branch in the fake reducer
   (return `state`) → the assertion fails.
2. **query runs on the final state, once** — a query that counts its calls;
   assert one call and that the value reflects the last command. Mutation:
   answer `query(initial)` → the value is stale.
3. **empty replay** — no commands returns the initial state and its queries.
4. **initial untouched** — after a replay, `runtime.initial` still equals the
   original object (deep equality, and the initial `selected` is unchanged).
5. **structural fit** — pass an object with the components package's exact
   `Runtime` shape (an extra `run` property) through `runCommands`; the extra
   property must not be required and the call must type-check. This is a
   compile-time proof; no runtime assertion is needed.

Then run the mutation in case 1 by hand:

```sh
# edit the fake reducer's select branch to `() => state`
nub run --filter @gpuixui/testing test   # expected: FAIL, exit 1
# restore it
nub run --filter @gpuixui/testing test   # expected: PASS, exit 0
```

`scripts/verify-two-directions.sh` uses `jj` and is currently broken (recorded
in `TODO.md`); do the two runs above instead and record both outputs in the
plan's result section.

## 6. STOP conditions

Stop and report if:

- `packages/testing` would have to import `@gpuixui/components`, `react` or
  `@gpuix/*` — that breaks the package's platform-free rule (plan `100` §2);
- the components package's `Runtime` type cannot be passed structurally
  (i.e. its `run` property is not optional-compatible) — report the exact type
  error instead of casting;
- the test cannot fail when the reducer ignores its command — the helper is
  then untested and the plan is not done.

## 7. Acceptance

- [x] `packages/testing/src/state.ts` exists with the names in §2 and JSDoc on
      every export.
- [x] `state.test.ts` has the five cases above; the mutation in §5 fails and the
      restored tree passes.
- [x] `index.ts` re-exports the module as `State`.
- [ ] `nub run --filter @gpuixui/testing test`, `build`, `check-types` and
      `nub run check` are green; paste the real outputs in §8. **`check` is
      pending only on the concurrent session's unformatted live file.**
- [x] `TODO.md` ticks the plan-`201` shared helper and the interlock row; the
      plan index says plan `201`'s testing half is landed.

## 8. Result

Measured on this host, 2026-10-18.

- `nub run --filter @gpuixui/testing test` — **exit 0**, 5 files, **51 tests**
  (46 + 5 new).
- `nub run --filter @gpuixui/testing check-types` — **exit 0**.
- `nub run --filter @gpuixui/testing build` — **exit 0**;
  `dist/state.js` and `dist/state.d.ts` exist.
- `nub run check-types` (all workspaces) — **exit 0**.
- `nub run check` — `check:tests` and `lint` pass; `fmt` reports
  `apps/playground/src/live/scenarios.tsx`, an **uncommitted file owned by a
  concurrent playground session** (the duplicate-writer situation recorded in
  `TODO.md`). The two new files were formatted and now pass. Re-run `check`
  once that session commits its file.

Two-direction proof for the fold (the mutation required by `AGENTS.md` §3):

```sh
# fake reducer changed to `(state, _command) => state`
nub run --filter @gpuixui/testing test
# FAIL, exit 1 — 3 failed: the fold, the final-state query and the
# private-`run` case; the empty replay and untouched-initial cases still pass.
# restored
nub run --filter @gpuixui/testing test
# PASS, exit 0 — 5 files, 51 tests.
```

The fifth case doubles as the compile-time proof that the components package's
`Runtime` (which also carries `run`) satisfies the structural port.


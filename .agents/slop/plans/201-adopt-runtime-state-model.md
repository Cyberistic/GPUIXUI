# 201 — Adopt `base-gpui`'s runtime / context / parts state model as our state convention

| Field | Value |
| ----- | ----- |
| Phase | B (foundation) — the convention every stateful component follows |
| Owner | components workstream (owns `packages/components`); primitives owns the Tier 1 helpers |
| Depends on | `200-adopt-compound-part-api.md` (the public API the state model serves), `020-gpuix-runtime-capability.md` §3.1.3 (pure-logic tests run today) |
| Status | components half done — 2026-10-17 (`core/runtime.ts`, doc §7, ADR 0005, PLAN D10); the `packages/testing` helper is pending its owner |
| Source | `references/base-gpui/docs/component-architecture.md`, `src/*/runtime.rs`, `src/*/context.rs`, `src/*/tests/` (1,000+ window-free tests) |

This plan is self-contained. It produces a **convention, one shared hook and its
test helper** — not component source. The ADR in §5 must be filed under
`.agents/adr/`.

---

## 1. Why

`base-gpui` carves modules **by knowledge, not by widget**. Per component there
are exactly three module kinds:

1. a deep **runtime** holding all state and all rules;
2. a thin **context** (three methods: `read`, `update`, `select`) that is the
   **only** place the controlled/uncontrolled rule lives;
3. thin **renderable parts** that never see runtime internals.

The runtime's interface is exactly two vocabularies — **commands**
(`sync_children`, `reconcile`, `select`, `move_highlight`, `set_bounds`) and
**queries** that return style-state (`root_state()`, `part_state(..)`). The rules:
no getter/setter pairs; a query never answers "what is the highlighted index?",
only "am I highlighted?"; state mutates in exactly two places (top of root render,
and event handlers); every transition is computed once inside the runtime.

This is the concrete, proven shape our MISSION calls "explicit and testable", and
it is **window-free** — which matters here: on this host no GPUix window can open
(plan `020` §3), so pure-logic tests are the only tests that run today.

## 2. The convention (the target shape)

Put it in `docs/component-api.md` §"State model" and in a shared module.

### 2.1 Three module kinds per component

```
packages/components/src/<component>/
  state.ts       # the deep runtime: pure, no React, no GPUix
  context.tsx    # the thin context: read / update / select — the ONLY controlled/uncontrolled rule
  <part>.tsx     # thin renderable parts: emit commands, read style-state
```

### 2.2 The runtime is a pure reducer

- `state.ts` exports `create<Component>Runtime(config)` returning
  `{ initial, reduce, queries }`, or the equivalent `useReducer`-compatible
  `reducer(state, command)` plus `select<Part>State(state, id)`.
- **Commands** are the only way in: a discriminated union (`{ _tag: "select", id }`),
  never a setter.
- **Queries** return style-state per part (`rootState`, `partState(id)`), never
  raw indices. Branch with `Match` on the command union.
- The runtime imports nothing from `@gpuix/react` or `react`. It may use Effect's
  pure modules (`Arr`, `Option`, `Match`) — nothing effectful.

### 2.3 The context is thin and owns one rule

- `context.tsx` provides `read()`, `update(command)`, `select(id)`.
- It calls `useControllableState` from `@gpuix/react/floating` (published in
  0.10.0 — verified) for the controlled/uncontrolled resolution. There is **no
  other** place that rule may live.

### 2.4 Parts are thin

- A part reads `select(id)` (or the root state) and renders.
- A part never computes a transition and never reads another part's raw state.
- Event handlers emit one command.

### 2.5 When **not** to apply it

The convention is for components with real state. A `Separator`, `Spacer`,
`Badge` or `Text` has no runtime — do not invent one. The ADR records this
explicitly so it is not re-litigated.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `docs/component-api.md` | add the §2 "State model" section (created by plan `200`) |
| `packages/components/src/core/runtime.ts` | **create** — the shared types: `Command` helper, `RuntimeConfig<S, C, Q>`, and `createRuntimeState` test helper |
| `packages/components/src/core/runtime.test.ts` | **create** — the able-to-fail test (§6) |
| `packages/testing/src/state.ts` | **create** — `runCommands(runtime, commands)` driving a runtime without a renderer |
| `packages/testing/src/state.test.ts` | **create** |
| `.agents/adr/0001-component-state-model.md` | **create** — §5 |
| `PLAN.md` §4 | decision row pointing at the ADR |

Do **not** rewrite plans `110–117`; their components adopt the convention when
implemented. If a landed component violates it, that is a follow-up task in
`TODO.md`, not a rewrite here.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test     # expected: exit 0
nub run --filter @gpuixui/testing test        # expected: exit 0
grep -rn "useState\|useReducer" packages/components/src/core/runtime.ts
# expected: no matches (the runtime is pure; React lives in context.tsx)
grep -rn "from \"@gpuix/react\"\|from \"react\"" packages/components/src/core/runtime.ts
# expected: no matches
nub run check                                  # expected: exit 0
```

## 5. The ADR (write this file)

`.agents/adr/0001-component-state-model.md`:

```md
# 0001 — Component state model: deep runtime, thin context, thin parts

- Status: accepted
- Date: <YYYY-MM-DD>
- Deciders: components workstream
- Related: plans 200, 201; `references/base-gpui/docs/component-architecture.md`

## Context

Components with real state (tabs, combobox, slider, menus, tables) need one
explicit, testable state machine. On this host no GPUix window opens (plan 020
§3), so behaviour that lives inside a rendered tree cannot be tested here. The
controlled/uncontrolled rule is the single most duplicated and most bug-prone
piece of a headless component library, and it must live in exactly one place.

## Decision

Every stateful component is three modules by knowledge, not by widget: a pure
runtime (`state.ts`, commands in, style-state queries out, no React/GPUix), a
thin context (`context.tsx`, owning the one `useControllableState` call), and
thin parts that emit commands and render style-state. Components with no state
have no runtime.

## Consequences

Easier: state transitions are unit-testable with no renderer; the
controlled/uncontrolled rule cannot drift; parts stay small. Harder: a small
component pays the three-file tax. Impossible: parts reading each other's raw
state, or a second controlled/uncontrolled implementation.
```

## 6. Test plan

- `packages/components/src/core/runtime.test.ts` — drive a minimal fake runtime
  (a counter command union) through `createRuntimeState`, assert the command
  changes the state and that `select` returns style-state, not indices.
- `packages/testing/src/state.test.ts` — `runCommands` returns the final state
  and the query outputs.
- **Both tests must be able to fail:** deleting the reducer's command handling
  must fail the assertion. Run `scripts/verify-two-directions.sh` to prove both
  directions before calling it done.
- These are pure tests, so they **do** run on this host (plan `020` §3.1.3).

Measured 2026-10-17 (components half):

- `package/components/src/core/runtime.test.ts` — 3 tests: the command fold,
  part-shaped style-state (keys `active`/`highlighted`, no index), and `initial`
  unchanged after a run. 222 unit tests green in the package.
- Both directions: replacing the `select` branch with `() => state` fails 2 of
  the 3 tests; restored, green.
- The `packages/testing/src/state.ts` half is not in this package's ownership;
  it stays a `TODO.md` task for the playground workstream. `runtime.run` is the
  same fold, so nothing in this package waits on it.

## 7. STOP conditions

Stop and report if:

- the shared hook cannot be made pure (i.e. it needs `@gpuix/react` at import
  time) — then the runtime is in the wrong place;
- a component genuinely needs cross-part raw state and cannot be expressed as
  style-state queries — stop and report; do not add a getter;
- `useControllableState` is not exported by the pinned `@gpuix/react` version
  (re-verify with `grep useControllableState
  workspaces/*/node_modules/@gpuix/react/dist/floating.d.ts`).

## 8. Acceptance criteria

- The convention is documented in `docs/component-api.md`.
- `runtime.ts`, `runtime.test.ts`, `testing/src/state.ts` and its test exist and
  pass; both tests fail when the reducer is broken.
- ADR `0001` is filed and `PLAN.md` §4 points at it.
- Nothing in the tree claims a runtime interaction was verified.

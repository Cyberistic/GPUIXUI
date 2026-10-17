# 0005 — Component state: a deep pure runtime, a thin context, thin parts

- Status: accepted
- Date: 2026-10-17
- Deciders: components workstream
- Related: plan `201`; `docs/component-api.md` §7;
  `packages/components/src/core/runtime.ts`; `references/base-gpui/docs/component-architecture.md`

## Context

Stateful components (tabs, combobox, menus, date pickers, future tables and
workspace panels) need one explicit, testable state machine. Today some rules
live inside rendered parts, where a GPUix window is required to test them; the
controlled/uncontrolled rule is the most duplicated and most bug-prone piece and
must live in exactly one place.

`base-gpui` carves each component by knowledge: a deep runtime holding all state
and transitions, a thin context that owns the controlled/uncontrolled rule, and
thin renderable parts. Its runtime tests run without a window — the same
property we need, because behaviour tests need a native binding and a window.

## Decision

Every stateful component has three modules:

1. `<component>/state.ts` — a pure runtime built with
   `createRuntime({ initial, reduce, query })`. Commands are a tagged union;
   queries return part-shaped style-state, never raw indices. No React, no GPUix.
2. `<component>/context.tsx` — `read`/`update`/`select`, the only caller of
   `useControllableState`; it fires the consumer callback from the runtime's
   outcome and never stores a second copy of the value.
3. `<part>.tsx` — a part emits one command per event and reads its style-state.
   It never computes a transition and never reads another part's raw state.

Components with no state (`Badge`, `Separator`, `Text`) have no runtime. A
component adopts the convention when it is next changed; a landed component is
not rewritten solely to satisfy it.

## Consequences

Easier: transitions are unit-testable without a renderer; the
controlled/uncontrolled rule cannot drift; a part stays small. Harder: a small
component pays a three-file tax. Impossible: parts reading each other's raw
state, or a second controlled/uncontrolled implementation.

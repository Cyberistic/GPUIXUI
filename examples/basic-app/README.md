# `examples/basic-app` — the Tier 1 set in one workflow

A settings form that uses the whole Tier 1 component set the way an application
would: a labelled field set with live validation, a select, a checkbox, switches
and a radio group, a save with progress and a spinner, a loading skeleton, a
scroll area, a tooltip and a light/dark switch.

It is deliberately **not** a gallery of swatches. MISSION asks for realistic
compositions — "a dialog page shows a real form/confirmation workflow, not a
floating rectangle" — and this is the runnable end of that idea.

## Run it

```sh
nub run --filter @gpuixui/basic-app dev      # bun src/main.tsx
```

**Requirements:** the GPUix native binding and a desktop session. GPUix
publishes no `darwin-x64` binary and this environment has no GUI session, so the
app **has not been run here** — see
`.agents/slop/plans/020-gpuix-runtime-capability.md` §3. `apps/playground` owns
the run path that will discharge this (playground workstream).

## What is verified, and what is not

| | |
| --- | --- |
| verified | `nub run --filter @gpuixui/basic-app check-types` — every component is used with its real props |
| verified | the components themselves: `packages/primitives` `core/` behaviour and element-tree suites |
| **not verified** | the window opening, layout, hit-testing, focus order and everything a screenshot would show |

That gap is the repository's, not this example's: no component in the tree claims
a verified interaction until the native runtime runs.

## The theme is a stand-in

`src/theme.ts` carries one example palette because `@gpuixui/tokens` has not
landed yet (its `exports` still points at an uncommitted `dist`). It is not a
design system, and the only thing the app reads from it is the `PrimitiveTheme`
port. When tokens merges, delete that file and import `lightTheme`/`darkTheme`
from `@gpuixui/tokens` — the app takes its theme at the mount boundary, so
nothing else changes.

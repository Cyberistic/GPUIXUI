# 041 — Tier 1 in the real runtime (primitives workstream)

**Phase:** C (the half of the Tier 1 bar that was impossible until plan 140).
**Owner:** primitives workstream (`packages/primitives`, `packages/icons`).
**Depends on:** `030`, `031`, `040`, and **`140` (playground): the `darwin-x64`
GPUix 0.10.0 binding builds from source and the native suite runs on this host**.
**Status:** `implemented` — see §9 for the measured run.

Plan 040 §2 and `COMPONENTS.md` say the same thing: on this machine the runtime
half of a component's definition of done could only be *documented* as a gap
(plan 020 §3 — no `darwin-x64` binding, no Aqua session), so every Tier 1 row
stayed `wip` for ever. Plan 140 removed the blocker by building the binding from
source with `gpui_macos/runtime_shaders`: the `TestRenderer` mounts, dispatches
real GPUI events, and the capabilities are `verified 0.10.0`.

That leaves exactly one owner for the remaining gap: **nobody has run the
GPUIxUI Tier 1 components in the real runtime** — plan 140's scenarios drive the
playground's own views, not this library. This plan closes that with a runtime
suite that lives in this workstream's packages and can be re-run by anyone.

---

## 1. Goal

Give every Tier 1 component a **measured verdict** from the real GPUix 0.10.0
`TestRenderer` — render, bounds, text, hit-test, key dispatch, focus order, the
a11y dump and the timer — so a `COMPONENTS.md` row can stop saying "unverified on
screen" and start citing what was observed.

## 2. Design

### 2.1 Where the suite lives, and why not in `src/`

`packages/primitives/runtime/` and `packages/icons/runtime/`, each with its own
`vitest.runtime.config.ts` and a `test:runtime` script.

- `nub run test` (and therefore `nub run check`) must stay runnable on a host
  **without** a binding — that is the whole reason the suite is not in `src/`.
  The default configs keep `include: ["src/**/*.test.ts(x)"]`, so `runtime/` is
  invisible to them, and the gate stays host-independent (plan 030 §4).
- `test:runtime` is an **opt-in, must-run** command. It does not skip when the
  binding is missing: it fails and prints plan 140 §5 as the remedy. A skipped
  native suite is a green tick over nothing, which is the one thing AGENTS.md
  §3 forbids.
- The suite imports `@gpuix/react/testing` (which loads `@gpuix/native`) — the
  import plan 020 §3 said throws. It throws only where the binding is absent;
  the same dynamic-import preflight as `apps/playground`'s CLI is used so the
  failure is a message, not a stack trace.

### 2.2 One small harness, no second smoke framework

`runtime/harness.ts` adapts `TestRenderer` to the handful of verbs a component
test needs: `mount`, `find`, `bounds`, `click`, `key` (down/up, focused or by
id), `type`, `focusNext`, `a11y`, `scrollOffset`, `advance`, `paintedText`.

Deliberate deviation, recorded so it is not mistaken for drift: the playground
workstream already has the richer `Smoke`/`SmokeHost` model in
`packages/testing` + `apps/playground`. That package is not in this branch and
its host adapter (`apps/playground/src/smoke/host.ts`) is in the playground's
paths, so this harness is a second implementation of the same adapter idea.
**Hoist it when `packages/testing` lands** — recorded in `TODO.md` as a
cross-workstream item, not fixed here.

The same reasoning decides where the **icons** suite lives. One harness, one
location: `packages/primitives/runtime/`. A second harness in
`packages/icons` would be copy-paste, and the reverse import (icons →
primitives) would break the boundary, since `primitives` already depends on
`icons`. So `packages/primitives/runtime/icons.runtime.test.tsx` renders
`@gpuixui/icons` and the icons row cites that run. (Measured 2026-10-17: the
suite passes there, including the painted-tint capture.)

### 2.3 What counts as evidence

- Every assertion is on something the runtime produced: painted text, element
  bounds, the focus id, the a11y dump, a scroll offset, a handler the component
  actually ran. **No assertion is on the element tree** — that is what the
  `src/**` suites already do (D11), and repeating it here would prove nothing.
- A component that fails is _fixed in the component_ (this workstream's path).
  A component whose contract the runtime cannot satisfy is recorded with the
  measured fact, not papered over.
- The `COMPONENTS.md` row cites the command, the date and the observation.

## 3. Files to create or change

```
packages/primitives/
  vitest.runtime.config.ts          NEW  include: runtime/**/*.runtime.test.tsx
  runtime/
    harness.ts                      NEW  the TestRenderer adapter + preflight
    fixture.tsx                     NEW  Surface + openWindow, one window per test
    layout.runtime.test.tsx         NEW  Box, Stack, Grid, Separator, Spacer, ScrollArea, Text, Label
    controls.runtime.test.tsx       NEW  Button, ButtonGroup, Checkbox, Switch, RadioGroup
    fields.runtime.test.tsx         NEW  Input, TextArea, Select, Tooltip, a field's accessible name
    loading.runtime.test.tsx        NEW  Progress, Skeleton, Spinner
    icons.runtime.test.tsx          NEW  paint, sizing, a11y role, painted tint
  package.json                      EDIT script test:runtime; devDependency @effect/platform-node
  tsconfig.json                     EDIT include runtime/**/*
  README.md                         EDIT the runtime section (how to run it)
packages/icons/
  README.md                         EDIT where the on-screen proof lives (§9)
COMPONENTS.md                       EDIT measured verdicts on the Tier 1 rows
TODO.md                             EDIT tick the runtime task; add the hoist item
.agents/slop/plans/README.md        EDIT index this plan
.agents/slop/plans/040-phase-c-tier1.md  EDIT status
```

## 4. Per-component contract (what the runtime test must observe)

| Component | Observation | Moves the row because |
| --------- | ----------- | --------------------- |
| ThemeProvider | a child resolves a colour from the theme; density changes a control's height | the port is applied, not just typed |
| Box / Stack / Grid / Separator / Spacer | `getElementBounds` on children: gap, direction, grid columns, 1px rule, filler growth | flex/grid layout is real, not asserted from `StyleDesc` |
| ScrollArea | wheel moves `getScrollOffset`; the painted text changes | scrolling actually happens |
| Text | `getPaintedText()` contains the string; `lineClamp` bounds the height | the type scale paints |
| Label | painted name, and `labelledBy` reaches the control's `aria-label` in the a11y dump | the documented workaround is real |
| Button | click activates; Enter fires on key **down**, Space on key **up**; a held key does not; `disabled` does not; `loading` stays focusable | the owned keyboard contract, in the platform's own dispatcher |
| ButtonGroup | the group's children lay out attached vs separated | variant wiring |
| Checkbox / Switch | click and Space toggle; `aria-valuetext` in the a11y dump flips `unchecked → checked` | the `aria-checked` workaround is legible to AccessKit |
| RadioGroup | ArrowDown/ArrowUp move the selection and the tab stop; only one item is `tabIndex 0`; `focusNext` lands on the group once | the roving-index contract over real focus |
| Input / TextArea | `simulateKeystrokes` produces `onChange` with the accumulated text; Enter produces `onSubmit` | native editing and event payloads |
| Select | the trigger paints the placeholder, then the chosen option | the `@gpuix/react/select` reuse is real |
| Tooltip | the tip's text appears in the painted tree once opened | the wrapper opens a real overlay |
| Progress | `aria-valuetext` is `"42%"`; the fill's width tracks the value | the clamp and the value text |
| Skeleton | the pulse changes `opacity` in the element's own style over time | the one animation the runtime allows |
| Spinner | the lit dot index advances after `advanceTime` | the step cycle, since rotation is impossible |
| Icons | an icon paints with a non-zero, correctly-scaled box and a non-empty a11y role; `role="presentation"` when decorative | the "unverified on screen" claim in `COMPONENTS.md` |

## 5. Exact commands and expected results

```sh
# from the worktree root
nub run --filter @gpuixui/primitives test:runtime
# expect: all five suites pass (layout, controls, fields, loading, icons);
# the counts are recorded in §9
nub run --filter @gpuixui/primitives test        # the src suites: unchanged, still green
nub run check                                    # expect: green (runtime/ is not in the default include)
```

Two-direction proof for at least one runtime assertion, as with every other
suite: break the component (e.g. remove the `onMouseDownOutside`-independent
`onClick` from `Button`), watch the runtime test fail with the runtime's own
observation, restore it, watch it pass. Record which assertion was proven and
how in §9.

## 6. STOP conditions

Stop and report, do not improvise, if:

- the binding is **not** loadable in this worktree (the suite must say so and
  exit non-zero — do not add a skip);
- a component needs a capability plan 020 §1.6 says 0.10.0 lacks (rotation,
  `aria-checked`, `aria-valuenow`, colour animation, a fade mask) — record the
  measured result and the strongest honest alternative instead of inventing one;
- a runtime test can only pass by asserting the element tree — that is a test of
  the wrong layer; move the assertion to `src/` and delete it here;
- a scenario needs a fix in `apps/playground`/`packages/testing` to work — those
  are another workstream's paths; record the task in `TODO.md` and continue with
  what this workstream owns;
- `nub run check` cannot be kept green.

## 7. Test plan

The suite *is* the test. Its rules:

1. Every `it` asserts at least one runtime observation (`check-tests` runs over
   `runtime/` too, since it walks the whole tree).
2. Each interaction is asserted through the platform's own dispatcher
   (`nativeSimulateClick`, `simulateKeystrokes`, `focusNext`), never by calling a
   React handler directly.
3. Failure modes that must be caught: a click that does not activate; Enter
   firing twice (down **and** up); a held key activating; `disabled` activating;
   an arrow key not moving the roving tab stop; a wheel that does not scroll
   (`deltaY` is negative to scroll **down** in GPUI — plan 140 §4); an a11y value
   that does not flip.
4. Both-directions: §5.

## 8. Acceptance criteria

- `nub run --filter @gpuixui/primitives test:runtime` passes on this host, and
  the counts are recorded in §9. (The icons suite runs there too — §2.2.)
- `nub run check`, `nub run lint`, `nub run test` stay green (the runtime dirs
  are opt-in).
- Every Tier 1 `COMPONENTS.md` row names what the runtime run observed, and no
  row claims more than the run showed.
- The two-direction proof in §5 is recorded.

## 9. Measured results

Filled in by the implementation. `test:runtime` on `darwin-x64` with the
locally-built `@gpuix/native@0.10.0` binding (plan 140 §4 provenance).

**Run of 2026-10-17** (this worktree, one writer):

```sh
nub run --filter @gpuixui/primitives test:runtime
# Test Files  6 passed (6)
#      Tests  54 passed (54)
```

(46 when this plan landed; later plans added the theme, `testId` and
a11y-role tests.)

### Accessibility roles the tree actually reports

Measured from `getA11yTree()`; these are the names a test can match on, and the
proof that each `role` we write maps to a real AccessKit role rather than being
ignored:

| Our element | AccessKit role | Also carries |
| ----------- | -------------- | ------------ |
| `Button` | `Button` | label, `description: "Loading"` while busy |
| `Input` / `TextArea` | `TextInput` | label, `on_action: ["Focus"]` |
| `Label` | `Label` | the visible name as its `value` |
| `Checkbox` | `CheckBox` | label, `value: checked / unchecked / mixed` |
| `Switch` | `Switch` | label, `value: checked / unchecked` |
| `RadioGroup` | `RadioGroup` | the group's label |
| a radio option | `RadioButton` | option label, `value: checked / unchecked` |
| `Progress` | `ProgressIndicator` | `value: "42%"` / `"loading"` |
| `Spinner` | `Status` | its label |
| `Icon` with a label | `Image` | label |
| `Skeleton` | — | correctly absent (decorative) |

| Suite | Tests | What the frame showed |
| ----- | ----- | --------------------- |
| `layout.runtime.test.tsx` | 10 | `Box` padding equals the theme's `lg` step; row/column `Stack` gaps equal the theme's step; `Grid` lays equal columns and wraps; `Separator` is one border step across the surface; `Spacer` pushes its sibling to the far edge; a wheel (`deltaY: -100`) leaves `ScrollArea` at `y: -100`; `Text` paints its string at the role's line height (`h1` > `body`); `Label` paints name and description; a compact density changes a `Button`'s height and leaves its background identical. |
| `controls.runtime.test.tsx` | 15 | A real hit-tested click activates `Button` (exactly once); Enter activates on key **down** and not again on the up; Space activates only on the up; a held key does nothing; `disabled` ignores click and Enter; `loading` ignores both and announces `"Loading"` through `aria-description`; `ButtonGroup` is 0px apart attached and `spacing.sm` apart separated; `Checkbox` toggles on click and on **Space up**, and `aria-valuetext` flips `unchecked → checked → unchecked`; an indeterminate checkbox reads `mixed`; `Switch` toggles on click; `RadioGroup` arrows move the selection, wrap at the end, keep exactly one `tabIndex 0`, and select from a click on the circle. |
| `fields.runtime.test.tsx` | 11 | `simulateKeystrokes` reaches `onChange` with the accumulated text; Enter reaches `onSubmit`; a controlled field reports each edit; a `TextArea` is sized by rows and accepts a newline; the visible `Label` and the `TextInput`'s own name are two a11y nodes (roles `Label` and `TextInput`); `Select` opens, paints its options, and commits a clicked one; `Tooltip` opens on hover and on keyboard focus, and its content stays inside the frame it anchors to. |
| `loading.runtime.test.tsx` | 6 | `Progress` announces `"42%"` via `aria-valuetext`, paints role `ProgressIndicator`, fills 100% at 100 and 0 at 0, clamps 140 → `"100%"` / −5 → `"0%"`; the indeterminate segment changes width over time; `Skeleton` opacity samples take both `1` and `0.6`; the `Spinner`'s lit dot (the one painted in `colors.primary`) changes index — the accent colour is also the proof that a theme colour reaches a painted style. |
| `icons.runtime.test.tsx` | 4 | GPUix paints the raw `<svg source>`: at `lg` the box is exactly 20×20 and at `xl` exactly 24×24; a decorative icon is absent from the a11y tree, a labelled one is an `Image` node named `Done`; two captures of the same red icon are **byte-identical**, while the blue capture differs — so `style.color` really tints the painted mark. |

### What the run changed in the implementation

- **One window per test, never per file.** Measured: a re-render replaces the
  React tree but GPUI keeps the native `<input>`'s text, so two editing tests
  passed against the previous test's buffer. `fixture.tsx` owns `openWindow()`
  and every test opens its own window.
- **`boundsOf` walks to the nearest ancestor with bounds.** A `<svg>` (and an
  overlay layer) occupies space but reports `null` from `getElementBounds`, so a
  click aimed at the icon's own id hit nothing.
- **A `Label` does not make a field's name.** The visible name is an a11y
  `Label` node; the control needs its own `label` prop to become
  `TextInput` + name. This is the end-to-end form of `labelledBy`.

### Two-direction proof (§5)

Removed `props.onActivate?.()` from `Button`'s `onClick` handler:

```sh
nubx vitest run --config vitest.runtime.config.ts runtime/controls.runtime.test.tsx
# FAIL  runtime/controls.runtime.test.tsx > activates a Button on a real click
#       Tests  1 failed | 14 passed (15)
```

Restored it:

```sh
nubx vitest run --config vitest.runtime.config.ts runtime/controls.runtime.test.tsx
#       Tests  15 passed (15)
```

So the click assertion fails with the runtime's own observation (the handler
never ran) and passes only when the component is correct.

### What this run does **not** prove

- The binding is the **locally-built** 0.10.0 artifact from plan 140, not the
  published binary (no `darwin-x64` release exists). The published-binary
  confirmation is the playground workstream's CI task.
- `test:runtime` is deliberately **outside** `nub run test`/`nub run check`, so
  those gates still pass on a host with no binding — and a green gate says
  nothing about native behaviour here.
- The focus-ring distinction (`focusVisible`) is still unobservable: the runtime
  has no such state, so a mouse-opened and a keyboard-opened ring look the same.
- Scrollbar tint, rotation and colour interpolation remain impossible in 0.10.0;
  the alternatives measured above are the honest ones.

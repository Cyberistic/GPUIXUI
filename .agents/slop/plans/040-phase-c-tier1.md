# 040 — Phase C: Tier 1 foundational components (primitives workstream)

**Phase:** C. **Owner:** primitives workstream.
**Depends on:** `030-primitives-package.md`, `031-icons-package.md`, and — for the
*docs page* and *example* halves of each row only — `apps/docs` (docs-site) and
`examples/` (this workstream).
**Status:** `implemented` — code, tests, examples and runtime verification are
done; only the docs pages (docs-site workstream) remain.

The Bar (AGENTS.md §4 / MISSION "Implementation standards"): a component is
**not** complete until it has **code + a test that can fail + a working example +
a docs page + a `COMPONENTS.md` row**, and its interaction is verified in the real
runtime *or* the gap is documented with evidence. On this machine the second
option is the only available one (plan 020 §3), so every row below lands as
**`wip`**, never `done`, until `apps/playground` can run it.

## 1. Dependency-ordered delivery

Build in this order; each step unblocks the next. Do not start a later step
while an earlier one has a failing suite.

| # | Deliverable | Code | Test (able to fail) | Example | Docs page | Inventory |
| - | ----------- | ---- | ------------------- | ------- | --------- | --------- |
| 1 | `core/theme.ts` port + `ThemeProvider` | `components/ThemeProvider.tsx` | `theme.test.ts` | `examples/basic-app` theme switch | Theming (docs-site) | — |
| 2 | `core/style.ts` + `core/metrics.ts` | — | `style.test.ts` | — | Architecture | — |
| 3 | `icons` package | `Icon.tsx`, `registry.ts` | `registry.test.ts` | icon grid | Icons | Icons |
| 4 | `Text` | `Text.tsx` | `variants.test.ts` (typography scale) | typography specimen | Text | Text / typography |
| 5 | `Box`, `Stack`, `Grid`, `Separator`, `Spacer` | 5 files | `variants.test.ts` (layout specs) | layout gallery | Layout | 5 rows |
| 6 | `ScrollArea` | `ScrollArea.tsx` | axis/scrollbar spec test | scroll list | Scrollable containers | Scrollable containers |
| 7 | `Button` + `ButtonGroup` | 2 files | `keyboard.test.ts` + variant test | button matrix | Buttons, Button groups | 2 rows |
| 8 | `Label` + `Input` + `TextArea` | 3 files | `state.test.ts` (controlled value) + contract test | form field set | Labels, Text inputs, Text areas | 3 rows |
| 9 | `Checkbox`, `RadioGroup`, `Switch` | 3 files | `keyboard.test.ts` (toggle, radio move) | selection set | 3 pages | 3 rows |
| 10 | `Select` | `Select.tsx` (wraps `@gpuix/react/select`) | variant/theme spec test | select demo | Selects | Selects |
| 11 | `Progress`, `Skeleton`, `Spinner` | 3 files | value-clamp + step-cycle tests | loading set | 3 pages | 3 rows |
| 12 | `Tooltip` | `Tooltip.tsx` (wraps `@gpuix/react/tooltip`) | theme spec test | tooltip demo | Tooltips | Tooltips |
| 13 | `examples/basic-app` wiring every Tier 1 component | — | — | *is* the example | Getting started | — |

`examples/basic-app` is the runnable proof. It is the one place where the whole
Tier 1 set is composed in a real workflow (a settings form), not a grid of
swatches — MISSION: "a dialog page shows a real form/confirmation workflow, not
a floating rectangle".

## 2. Per-component definition of done

1. typed public props; sensible defaults; no boolean-prop proliferation (variant
   is a union, not `isPrimary`/`isGhost`);
2. every visual decision goes through `resolveStyleSpec` — no inline colour,
   no inline spacing literal;
3. hover/active/focus-visible declared in `style.hover`/`style.active`/
   `style.focusVisible`, never scripted with `onMouseEnter` + `useState`;
4. keyboard behaviour for anything focusable, drawn from `core/keyboard.ts`;
5. disabled/loading/error states present and distinguishable, and the disabled
   control still reachable by Tab when it is loading;
6. `role` + `aria-*` set from the *supported* set only (020 §1.4) — never invent
   `aria-checked`/`aria-valuenow`;
7. an example and a docs page, co-located with the source for copy-paste.

## 3. Tier-wide gates

```sh
nub run check                                   # tests-can-fail, lint, fmt, types
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/icons test
rg 'from "@gpuix/react"$' packages/*/src         # expect: no runtime root import
rg '#[0-9a-fA-F]{3,6}' packages/*/src/core       # expect: fixture only
rg 'aria-checked|aria-valuenow|aria-labelledby' packages/*/src
                                                 # expect: no matches (unsupported)
```

## 4. STOP conditions

- A component needs one of the unsupported capabilities; stop, add it to
  `COMPONENTS.md` with the evidence, and ship the strongest honest alternative.
- A component cannot get a test that can fail → the behaviour is in the wrong
  place; move it into `core/` and test it there. Do not add a test that only
  asserts a snapshot of itself.
- `nub run check` cannot be made green → stop and report rather than
  weakening the gate.

## 5. Acceptance criteria for Phase C (this workstream)

- All 20 Tier 1 inventory rows have code, a failing-able test, an example, a
  docs page and an honest inventory row.
- `examples/basic-app` composes the Tier 1 set into one coherent workflow.
- `PLAN.md` §4 records the decisions the work produced; `TODO.md` records the
  runtime-verification debt with the exact command that would discharge it.
- Nothing in the tree claims a runtime interaction was verified.

# 030 — `packages/primitives`

**Phase:** B and C. **Owner:** primitives workstream.
**Depends on:** `020-gpuix-runtime-capability.md`, `packages/tokens` (contract only —
see §2.2; no build-time dependency, so this plan is not blocked by tokens).
**Status:** `implemented` — the shipped tree supersedes §2.2/§3; see §9. All 19
Tier 1 components plus the claimed extras (plans `053`, `054`, `056`, `065`) have
code, tests, an in-package docs page, a mounted example and a runtime proof. The
`apps/docs` pages and the published-binary CI run remain (other workstreams).

Foundational render primitives **and** the Tier 1 component set (the swarm
assignment gives both to this workstream). Tier 2+ lives in `packages/components`.

Target GPUix: **`@gpuix/react` / `@gpuix/native` 0.10.0, published** — *not* the
`references/gpuix` checkout, which is ahead of the release. Two divergences that
matter and were measured against the installed tarball:

- the published package **does not export `./button`** and ships no
  `dist/components/button.js`, so `Button` / `buttonProps` / `ButtonState` from
  `main` are **not available**; this package implements its own keyboard
  behaviour (§3.4) — which is also the part we most want under test;
- `./floating`, `./tooltip`, `./select`, `./combobox` **are** published and
  **load without the native binding**, so they are safe to import and reuse.

---

## 1. Why this package exists

GPUix gives you one box (`div`), one text node (`text`), a flat CSS-shaped
`style` prop, native hover/active/focus-visible states and real native
keyboard/focus events. That is a runtime, not a component library. This package
is the layer that turns it into a *system*:

- **one place** where a semantic decision ("primary, medium, invalid") becomes a
  concrete `StyleDesc`;
- **one place** where keyboard behaviour lives (Enter/Space/Arrow/Escape,
  roving tabindex, `defaultPrevented`);
- **one place** where size metrics and variants are defined, so a Button, an
  Input and a Select cannot drift apart.

## 2. Boundaries

### 2.1 Package graph

```
@gpuixui/tokens     (peer: the theme *values*; not a dependency — see 2.2)
      ↓
@gpuixui/icons      (no runtime dependency; @gpuixui/primitives → icons)
      ↓
@gpuixui/primitives (depends on @gpuix/react, react, @gpuixui/icons)
      ↓
@gpuixui/components (Tier 2+, depends on primitives)
```

`@gpuixui/primitives` must never import `@gpuixui/components`, `apps/*`, or
`packages/data-grid|docking|editor`.

### 2.2 The theme is a **structural port**, not an import

`primitives` must compile and its tests must run **before** `packages/tokens`
lands, and it must still work with any theme that satisfies the shape. So the
theme arrives as a value of a locally declared interface — a port:

```ts
// src/core/theme.ts
export interface VariantColors {
  readonly background: string
  readonly foreground: string
  readonly hover: string
  readonly active: string
}

export interface ColorRoles {
  readonly background: string
  readonly foreground: string
  readonly surface: string
  readonly surfaceForeground: string
  readonly muted: string
  readonly mutedForeground: string
  readonly accent: string
  readonly accentForeground: string
  readonly border: string
  readonly input: string
  readonly ring: string
  readonly selection: string
  readonly overlay: string
  /** Paint for a raised surface's shadow. */
  readonly shadow: string
  /** Success state: a completed step, a healthy metric. */
  readonly success: string
  /** Scrollbar thumb colour, where the runtime exposes one (0.10.0 does not). */
  readonly scrollbar: string
  readonly primary: VariantColors
  readonly secondary: VariantColors
  readonly destructive: VariantColors
  /** low-emphasis fills for ghost/outline; `background` is a transparent colour */
  readonly subtle: VariantColors
}

export interface SpaceScale {
  readonly 0: number; readonly 1: number; readonly 2: number; readonly 3: number
  readonly 4: number; readonly 5: number; readonly 6: number; readonly 7: number
  readonly 8: number; readonly 10: number; readonly 12: number; readonly 16: number
}

export interface RadiusScale {
  readonly none: number; readonly sm: number; readonly md: number
  readonly lg: number; readonly full: number
}

export interface FontScale {
  readonly family: { readonly sans: string; readonly mono: string }
  readonly size: Readonly<Record<TextSize, number>>
  readonly weight: { readonly regular: number; readonly medium: number; readonly semibold: number }
  readonly lineHeight: Readonly<Record<TextSize, number>>
}

export interface PrimitiveTheme {
  readonly mode: "light" | "dark"
  readonly color: ColorRoles
  readonly space: SpaceScale
  readonly radius: RadiusScale
  readonly font: FontScale
}
```

`packages/tokens` (owner: tokens workstream) must export light and dark theme
values that satisfy this interface. **No colour, space, radius or font literal
may appear anywhere else in `primitives`** — `rg '#[0-9a-fA-F]{3,6}' src` and
`rg 'fontSize: [0-9]' src` must come back empty outside `src/core/metrics.ts`
and test fixtures.

The theme is supplied by `ThemeProvider` (§3.1). Tests supply a fixture theme
from `src/core/testing/theme.fixture.ts` — a test double, not a second palette:
it uses obviously-fake values (`"#000001"`, `1, 2, 3…`) so a test that passes
with it cannot accidentally depend on a real design decision.

## 3. Files to create

```
packages/primitives/
  package.json
  tsconfig.json
  README.md
  src/
    index.ts
    core/
      theme.ts                 ThemeProvider port types
      metrics.ts               size scales: control heights, paddings, icon sizes
      variants.ts              variant ∪ size → style spec, per component
      style.ts                 resolveStyleSpec(spec, theme) → StyleDesc
      keyboard.ts              pure key decisions
      state.ts                 pure controlled/uncontrolled + selection helpers
      contract.ts              decodeRenderProps: unknown → typed props
      variant.registry.ts      NAME → VariantSpec (single source for docs + tests)
      testing/
        theme.fixture.ts
        element.ts             read a React element's props in a test
      theme.test.ts
      style.test.ts
      variants.test.ts
      keyboard.test.ts
      state.test.ts
      contract.test.ts
    components/
      ThemeProvider.tsx
      Box.tsx
      Stack.tsx
      Grid.tsx
      Separator.tsx
      Spacer.tsx
      ScrollArea.tsx
      Text.tsx
      Label.tsx
      Button.tsx
      ButtonGroup.tsx
      Input.tsx
      TextArea.tsx
      Checkbox.tsx
      RadioGroup.tsx
      Switch.tsx
      Select.tsx
      Progress.tsx
      Tooltip.tsx
      Skeleton.tsx
      Spinner.tsx
      index.ts
```

**The rule that makes this testable here:** files under `src/core/` must not
import `@gpuix/react` at runtime (a `import type { StyleDesc } from "@gpuix/react"`
is fine — erased by `verbatimModuleSyntax`). Files under `src/components/` may
import `@gpuix/react/floating`, `/tooltip`, `/select`, `/combobox` (all load
without the native binding) but **not** the `@gpuix/react` root or `/testing`
(those throw `Cannot find native binding` on this machine).

### 3.1 `ThemeProvider.tsx`

A React context holding `PrimitiveTheme` with a `light`/`dark` switch and a
density override (`compact | comfortable | spacious`). It must **not** provide a
default palette: with no provider, `useTheme()` fails with a typed error naming
the missing provider. A silent default is how two palettes end up in one app.

Density multiplies the metrics from `src/core/metrics.ts` — it changes numbers,
never colours.

### 3.2 `core/style.ts` — the single resolution point

```ts
export type StyleSpec = { /* semantic, theme-independent */ }
export const resolveStyleSpec: (spec: StyleSpec, theme: PrimitiveTheme) => StyleDesc
```

Every component's visual identity is a `StyleSpec` (`{ variant, size, tone,
invalid, disabled, orientation, … }`). `resolveStyleSpec` is a total function —
no `any`, no `undefined` branches — and it is where the theme is applied.
It must be pure so `nub run test` can prove it.

**One deliberate asymmetry:** the published runtime has no `focusVisible` state
style (plan 020 §1.6), so a focused control's style is a *separate* resolution
(`controlFocusStyle`) that the component merges over the resting style while it
holds focus. Hover and active stay declarative in `style.hover`/`style.active`.

**Second asymmetry:** `hover`/`active` on a variant are functions
(`(theme) => StyleDesc`), not colours, so a variant can change its border or add
a text decoration instead of only repainting a fill — and an invariant test can
require every variant to declare *some* feedback.

### 3.3 `core/variant.registry.ts`

One table per component mapping `(variant, size, state)` → the semantic class
names the docs site and `COMPONENTS.md` quote. The table is data: the docs app
can read it, and a test asserts every declared variant resolves to a distinct,
non-empty style (catching a variant that silently renders as the default).

### 3.4 `core/keyboard.ts` — behaviour, not rendering

Pure decisions, one function per contract:

```ts
export interface KeyDecision { readonly activate: boolean; readonly preventDefault: boolean }
export const decideActivation: (key: string, phase: "down" | "up", held: boolean) => KeyDecision
export const decideToggle: (current: boolean) => boolean          // checkbox/switch
export const decideRadioMove: (index: number, count: number, key: string) => number | null
export const decideMenuMove: (index: number, count: number, key: string) => number  // Select reuse
```

Modelled on the reference `buttonProps` behaviour in the unreleased GPUix `main`:
Enter activates on key **down**, Space on key **up**, a held key does not
repeat, `defaultPrevented` wins. Tests state each rule and fail if it flips.

### 3.5 Components — one responsibility each

| File | GPUix mapping | Notes |
| ---- | ------------- | ----- |
| `Box` | `div` | surface/tone/padding/radius/border variants; the only place raw `style` merges |
| `Stack` | `div` flex | `direction`, `gap`, `align`, `justify`, `wrap`, `grow`; no `Spacer` guesswork |
| `Grid` | `div` grid | numeric-only GPUix grid: `columns`, `rowHeight` — document the missing areas/auto-flow |
| `Separator` | `div` | 1px border, `orientation`, `inset`, `label` slot |
| `Spacer` | `div` | `flexGrow` filler or fixed `size` |
| `ScrollArea` | `div` `overflow: scroll` | `axis` only — the published runtime has **no `scrollbarColor`/`scrollbarWidth`**, so the thumb is platform-themed and cannot be tinted; **no fade mask** (GPUI Kit's `scrollable_mask` has no equivalent). Document both. |
| `Text` | `text` | sizes `xs…2xl`, weights, `tone` (`default\|muted\|subtle\|primary\|destructive`), `truncate`, `lineClamp`, `align`, `mono`, `selectable` |
| `Label` | `text` (+ wrapping `div`) | `required`, `description`, `invalid`; **`aria-labelledby` does not exist in GPUix** — the label sets `aria-label` on the control via a render callback instead. Document the workaround. |
| `Button` | focusable `div` + `role="button"` | variants `primary\|secondary\|outline\|ghost\|destructive\|link`, sizes `xs\|sm\|md\|lg\|icon`, `loading`, `disabled`, `focusableWhenDisabled`, leading/trailing icon, `asChild` via `renderSlot` |
| `ButtonGroup` | `div` | `attached` (shared radius, single border) or `separated`; `role="group"` |
| `Input` | `input` | `value`/`onChange`/`placeholder`/`readOnly`/`onSubmit`, `autoFocus`, adornments, `invalid`, sizes, `clearable` |
| `TextArea` | `textarea` | `minRows`/`maxRows`, otherwise as `Input` |
| `Checkbox` | focusable `div` | `role="checkbox"`; **GPUix exposes no `aria-checked`** — supply `aria-valuetext` (`"checked"/"unchecked"`) and record the limitation; indeterminate is a distinct state |
| `RadioGroup` | `div` + children | roving `tabIndex`, arrow navigation via `decideRadioMove`, `role="radio"` per item |
| `Switch` | focusable `div` | `role="switch"`; Space/Enter toggle; thumb is a `div` positioned by `left` |
| `Select` | `@gpuix/react/select` | thin theme/variant wrapper; do not reimplement |
| `Progress` | `div` track + `div` fill | `value` clamped 0–100 (pure, tested); `indeterminate`; `role="progressbar"` + `aria-valuetext` (**no `aria-valuenow` in GPUix**) |
| `Tooltip` | `@gpuix/react/tooltip` | wrapper; `side`, `align`, `delay` live in GPUix already |
| `Skeleton` | `div` + `motion` | opacity pulse only — GPUix `motion` has **no** transform/shadow animation |
| `Spinner` | `svg` + step cycle | GPUix `motion` **cannot rotate**. Implement as a discrete step cycle (state advanced on a `setTimeout` tick, colour from `currentColor`) and document the limitation; `Progress` with `indeterminate` is the alternative |

## 4. Exact commands and expected results

```sh
# from the worktree root
nub install                    # expect: installs @gpuix/react + react; optional
                               # native-darwin-arm64 is skipped on darwin-x64
                               # and npm does NOT fail on a missing optional dep
nub run --filter @gpuixui/primitives check-types   # expect: exit 0, no output
nub run --filter @gpuixui/primitives test          # expect: all suites pass,
                               # >= 40 assertions, and no suite imports the
                               # @gpuix/react root or /testing
nub run check                  # expect: tests-can-fail ok, lint clean, fmt clean,
                               # type-check clean
rg 'from "@gpuix/react"' packages/primitives/src/core    # expect: no runtime import
rg '#[0-9a-fA-F]{3,6}' packages/primitives/src/components # expect: no matches
```

Every command above must be run and its output pasted into the commit body (or
the PR note) if it is the first green run of that suite. *A command that was not
run did not pass.*

## 5. STOP conditions

Stop and report, do not improvise, if:

- `@gpuix/react` 0.10.0's published `exports` map changes under you (a new
  release may add `./button` or remove `/floating` — re-run the probe in 020 §3);
- you need `@gpuix/react` root or `/testing` in a `src/core` file (this breaks
  `nub run test` on this machine);
- a Tier 1 component needs a GPUix capability §1 of plan 020 does not list
  (rotation, `aria-checked`, colour animation, fade masks, `position: fixed`);
- `packages/tokens` lands with a theme whose shape does not satisfy
  `PrimitiveTheme` — report the diff instead of changing `theme.ts` to match a
  half-finished token package;
- you are about to add a test that imports a module which fails to load here.

## 6. Test plan

Tests live beside the code as `src/**/*.test.ts`, run with
`nub run --filter @gpuixui/primitives test`, and each must be able to fail
(`nub run check:tests`).

| Suite | Must catch |
| ----- | ---------- |
| `style.test.ts` | a variant that resolves to an empty/identical style; a theme value that is ignored (change the fixture, assert the output changes — this is the anti-tautology test) |
| `variants.test.ts` | a declared variant missing from the registry, or two variants collapsing to the same spec |
| `keyboard.test.ts` | Enter activating on key **up**, Space activating on key **down**, a held key activating, or `defaultPrevented` being ignored — each is a real bug in the reference implementation's history |
| `state.test.ts` | controlled mode writing internal state; uncontrolled mode not updating; `onChange` firing when the value did not change |
| `contract.test.ts` | unknown props accepted without decode; a negative `Progress` value or `>100` leaking through instead of clamping |
| `theme.test.ts` | a theme literal leaking outside `metrics.ts` (assert by scanning the source), or density changing colour |

**Runtime rendering is not testable on this machine** (plan 020 §3). Render,
hit-test, focus-order and a11y-tree assertions for these components are a task
for `packages/testing` + `apps/playground` (playground workstream) and are
recorded in `TODO.md`. Until they run, every Tier 1 `COMPONENTS.md` row is `wip`
and says so.

Prove a fix with `scripts/verify-two-directions.sh <test-file>` before ticking
anything: revert the source change, watch the test fail, restore, watch it pass.

## 7. Acceptance criteria

- `nub run check` is green from the worktree root.
- Every Tier 1 component has: code, a `core` behaviour module with a real test,
  an example in `examples/`, a docs page (docs-site workstream), and a
  `COMPONENTS.md` row that is honest about runtime verification.
- No colour/space/radius/font literal outside `core/metrics.ts` and fixtures.
- No `any`, cast, `@ts-ignore`, `throw` in domain code, `console.*`, native
  string/array helpers, or imperative loop — `nub run lint` and the
  `opencode-effect-enforcer` plugin review are the gate.
- `README.md` in the package documents the theme port, the density switch, the
  component list and the runtime-verification gap.

## 8. Open items to record, not solve

- `PLAN.md` §4: source-first exports (no `build` step) until a publish
  requirement exists; the `PrimitiveTheme` port and the tokens contract.
- `TODO.md`: runtime tests for Tier 1 (playground workstream);
  `aria-checked`/`aria-valuenow` gaps (upstream GPUix); density in tokens.

---

## 9. Current state of `packages/primitives` — handover (read before editing)

**Several agents from the same workstream were editing this worktree at once.**
`022-swarm-single-writer.md` is the measured diagnosis (5 live
`swarm:primitives` sessions; 2–6 for every other workstream) and the reason no
workstream should write until its §4 leaves exactly one live session. This plan
recorded the collision from the other side: files under `src/core/` changed
signature *between* a compiler pass and an assertion, so a green `nub run check`
here proves nothing yet.

**Consequence for this plan:** §3's file list, §2.2's minimal theme port and the
`core/metrics.ts` split are all **superseded**. A later writer folded sizes into
the theme and aligned `core/theme.ts` group for group with `@gpuixui/tokens`
(`colors`, `typography`, `spacing`, `radius`, `density`, `elevation`,
`borderWidth`, `iconSize`), and added `core/{color,layout,selection,loading}.ts`.
**Keep that design** — it is what the tokens package satisfies directly, and it
replaces the port §2.2 proposed. What survives unchanged from this plan is the
architecture it argues for: one resolution point in `core/style.ts`, behaviour
in pure modules, hover/active declared rather than scripted, and no component
claiming a capability plan 020 §1.6 says the runtime lacks.

**Rule for resuming:** after `022` §4 has left one live session per tree, run
`nub run check` in `packages/primitives` and finish whatever is still red, then
continue with §3 of this plan. At the time of writing that was down to a single
failing test (`loading.test.ts` comparing two interned `Option.some`
singletons, which `Option` caches, so `not.toBe` cannot fail as written) and one
unused import — eroding by the minute, and not worth a second writer racing for.

**Complete and not to be redone:** `packages/icons` (18 tests, each proven in
both directions) and the plan set in this directory.

---

## 10. Delivered state (2026-10-17)

The tree was reconciled and finished: `nub run check` and `nub run test` are
green from the worktree root (`packages/primitives` 338 offline + 164 runtime
tests at plan `070`, `packages/icons` 19, `examples/basic-app` type-checks).
What exists:

- `core/`: `theme`, `style` (spec → `StyleDesc`), `variants`, `keyboard`,
  `state`, `layout`, `selection`, `loading`, `color` — each with a suite.
- `components/`: all 19 Tier 1 components, plus `ThemeProvider` and
  `testing/element.ts`, the Schema-decoded element-tree reader the suites assert
  through (D11 in `PLAN.md`).
- `examples/basic-app`: the Tier 1 set composed into one settings workflow.
- `packages/primitives/README.md`: the theme port, density, the component list
  and the runtime-verification gap.

What remains, and who owns it: **the `apps/docs` pages** (docs-site) and the
**published-binary native run** (gold-standard CI task, playground workstream).
Everything else this section once listed has since landed: the runtime suite is
15 files / 164 tests against the locally built 0.10.0 binding (plans `041`, `042`,
`055`, and the per-component regression plans `043`–`070`), the tokens hand-off is
plan `021` (`Theme` is `@gpuixui/tokens`' `Theme`, `focusRing`/`elevationShadow`
come from there), and every component has an in-package docs page and a mounted
example (plan `047`). Every Tier 1 `COMPONENTS.md` row stays `wip` until the two
external items land; each row already carries its measured runtime evidence.

Proven in both directions: the RadioGroup arrow-select wiring
(`src/components/selection.test.tsx` fails when `renderRadioGroup` stops calling
`handlers.onSelect`, passes when it does).

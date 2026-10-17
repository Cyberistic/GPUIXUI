# 110 — `packages/components`: the Tier 2 component package

- **Phase:** C (foundation and every Tier 2 component)
- **Workstream:** components
- **Owns:** `packages/components/**`
- **Depends on:** `@gpuixui/tokens` (plan 100-range, tokens-theme workstream),
  `@gpuixui/primitives` (primitives workstream), `@gpuix/react@0.10.0`
- **Depended on by:** `packages/data-grid`, `packages/docking`, `apps/playground`

This plan is the package-level contract. The component plans that follow
(`111`–`117`) assume every rule here and do not repeat it.

---

## 1. Purpose and boundary

`@gpuixui/components` is the composable Tier 2 layer: composition and feedback
components built from `@gpuixui/tokens` roles and `@gpuixui/primitives`
foundational parts, rendered on GPUix host elements through React.

**Allowed imports, in full:**

| Package | Why |
| ------- | --- |
| `effect` (canonical areas: `effect/Array`, `effect/Option`, `effect/Schema`, …) | domain logic, state machines |
| `@gpuixui/tokens` | colour, spacing, radius, type, elevation, motion roles |
| `@gpuixui/primitives` | `Box`, `HStack`, `VStack`, `Text`, `Button`, `IconButton`, `Input`, `Label`, `Separator`, `Skeleton`, `Spinner`, `Icon`, `ScrollArea` |
| `@gpuix/react` and its subpaths (`/floating`, `/dialog`, `/combobox`, `/testing`) | host elements, headless behaviour, native test renderer |
| `react` | components only |

**Forbidden imports:** anything from `apps/*`, `packages/data-grid`,
`packages/docking`, `packages/editor`, `node:*` in `src/**` (tests may use
`node:path`), any DOM API (`document`, `window`, `HTMLElement`), and any CSS
file or `className`.

**Never import `@gpuix/native` directly.** `@gpuix/react` re-exports every type
and helper this package needs; a direct native import means the abstraction
boundary was crossed.

---

## 2. Files to create

```
packages/components/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── src/
│   ├── index.ts                     # public barrel
│   ├── internal/
│   │   ├── theme.ts                 # the only file importing @gpuixui/tokens
│   │   ├── theme.test.tsx
│   │   ├── controllable.ts          # useControllableState hook
│   │   ├── slot.ts                  # renderSlot re-export + mergeProps
│   │   ├── collection.ts            # ordered item registry + index math
│   │   ├── collection.test.ts
│   │   ├── key.ts                   # KeyEvent name predicates
│   │   ├── key.test.ts
│   │   └── test-root.tsx            # themed createTestRoot helper for tests
│   ├── runtime.test.tsx             # fails loudly when the native renderer is absent
│   └── <component>.tsx              # one file per component (see 111–116)
│   └── <component>.test.tsx         # co-located behaviour test
├── examples/
│   ├── index.ts                     # id → example component registry
│   └── <component>.example.tsx      # one working example per component
└── docs/
    └── <component>.mdx              # one Fumadocs page per component
```

`docs/` and `examples/` live in this package on purpose: the components
workstream owns them. `apps/playground` and `apps/docs` **consume** them; a
task to wire them is recorded in `TODO.md` and owned by those workstreams.

---

## 3. `package.json` — exact content

```json
{
  "name": "@gpuixui/components",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*.tsx"
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@gpuix/react": "0.10.0",
    "@gpuixui/primitives": "workspace:*",
    "@gpuixui/tokens": "workspace:*",
    "effect": "catalog:"
  },
  "peerDependencies": {
    "react": "^19.2.0"
  },
  "devDependencies": {
    "@effect/vitest": "catalog:",
    "@gpuixui/config": "workspace:*",
    "@types/node": "^26.1.1",
    "@types/react": "^19.2.0",
    "react": "^19.2.0",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

Do **not** add a catalog entry for `@gpuix/react`: the root `package.json` and
its catalog belong to another workstream. A pinned version here is correct.

## 4. `tsconfig.json` — exact content

```json
{
  "extends": "@gpuixui/config/tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gpuix/react",
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "examples"]
}
```

`jsxImportSource` is what makes `<div>` mean a GPUix host element with
`StyleDesc` styling. Without it JSX would type-check against the DOM and compile
to nothing the runtime understands.

## 5. `vitest.config.ts` — exact content

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // The native renderer paints through a single retained tree; parallel
    // workers would race on the window and on the native module.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
```

---

## 6. The token contract

`src/internal/theme.ts` is the **only** file in the package allowed to import
`@gpuixui/tokens`. Every component calls `useTokens()` and the derived helpers
below. This is the whole point: when the token surface changes, one file changes.

Role names follow the shadcn/ui semantic vocabulary (the DX reference the
mission names), adapted where GPUix paints through JS style objects rather than
CSS variables. `foreground` replaces `text`, `card`/`popover` replace a single
`surface`, and three interaction values are explicit because a `StyleDesc` state
style needs a concrete colour.

| Role | Used for |
| ---- | -------- |
| `color.background` / `foreground` | page base and body copy |
| `color.card` / `cardForeground` | card and panel surfaces |
| `color.popover` / `popoverForeground` | dialogs, popovers, menus, toasts |
| `color.primary` / `primaryForeground` / `primaryHover` | primary actions, active page |
| `color.secondary` / `secondaryForeground` | secondary actions |
| `color.muted` / `mutedForeground` | subtle fills (badge, avatar, skeleton), meta copy |
| `color.accent` / `accentForeground` | hover and keyboard-active rows |
| `color.destructive` / `destructiveForeground` / `destructiveSoft` | destructive actions, errors |
| `color.success` / `successSoft` | success alerts, toasts |
| `color.warning` / `warningSoft` | warnings |
| `color.info` / `infoSoft` | informational alerts |
| `color.border` / `borderStrong` | separators, outlines, card edges |
| `color.input` | input borders |
| `color.ring` | focus outline |
| `color.overlay` | dialog backdrop (an rgba colour) |
| `color.selection` | text-selection wash |
| `space(step: 1..8)` | 4px-based spacing scale (4, 8, 12, 16, 20, 24, 32, 40) |
| `radius.sm/md/lg/full` | 4 / 6 / 10 / 999 |
| `font.size.xs/sm/md/lg/xl` | 12 / 13 / 15 / 18 / 22 |
| `font.weight.normal/medium/semibold/bold` | 400 / 500 / 600 / 700 |
| `font.lineHeight.tight/normal` | 1.25 / 1.5 multipliers |
| `control(size)` | 28 / 32 / 38 for `"sm" | "md" | "lg"` |
| `elevation.popover/dialog` | `BoxShadow` values (GPUix native type) |
| `motion.fast/normal` | seconds, for `MotionTransition.duration` |

`theme.ts` exports:

```ts
export interface ComponentTokens {
  readonly appearance: "light" | "dark";
  readonly color: { /* the roles above, all strings */ };
  readonly space: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => number;
  readonly radius: { readonly sm: number; readonly md: number; readonly lg: number; readonly full: number };
  readonly font: {
    readonly size: { readonly xs: number; readonly sm: number; readonly md: number; readonly lg: number; readonly xl: number };
    readonly weight: { readonly normal: number; readonly medium: number; readonly semibold: number; readonly bold: number };
    readonly lineHeight: { readonly tight: number; readonly normal: number };
  };
  readonly control: (size: "sm" | "md" | "lg") => number;
  readonly elevation: {
    readonly popover: BoxShadow | readonly BoxShadow[];
    readonly dialog: BoxShadow | readonly BoxShadow[];
  };
  readonly motion: { readonly fast: number; readonly normal: number };
}

export function useTokens(): ComponentTokens;
/** `outlineWidth/Color/Offset` for a keyboard-focus look. */
export function focusRing(tokens: ComponentTokens): StyleDesc;
```

**Interlock rule.** If `packages/tokens` does not yet export a role: read its
`src/index.ts`, map the nearest equivalent in `theme.ts`, and add a line to the
`Interlocks` table in `TODO.md`. **Never** introduce a literal colour in a
component file, and never fork a second token module.

---

## 7. The primitives contract

Only these imports are allowed, with only these props used:

```ts
import { Box, HStack, VStack, Text, Separator } from "@gpuixui/primitives";
import { Button, IconButton } from "@gpuixui/primitives";
import { Input, Label, Skeleton, Spinner, Icon } from "@gpuixui/primitives";
```

`Box`/`HStack`/`VStack` accept `style?: StyleDesc` and `children`. `Text` accepts
`tone?: "default" | "muted" | "faint" | "danger"` plus `style`. `Button` accepts
`variant?: "primary" | "secondary" | "ghost" | "danger"`, `size?: "sm" | "md" | "lg"`,
`disabled`, `onClick`. `Input` accepts `value`, `placeholder`, `onChange`, `onSubmit`,
`autoFocus`, `disabled`, `style`.

**Interlock rule.** If a primitive is missing or its props differ: STOP, write
the discrepancy in `TODO.md` under `Interlocks`, and report. Do not copy the
primitive into this package — a second copy is exactly the drift the boundary
law forbids.

Rationale for the rule: `packages/components` may not import from a higher
package, and `packages/primitives` may not be edited by this workstream.

---

## 8. Public API rules (apply to every component)

1. One file per component family, one named export per part:
   `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
2. Every exported function carries a JSDoc line stating its responsibility
   (`AGENTS.md` EF-11).
3. Props extend GPUix `Props` where the part renders one host element, so
   `style`, `testId`, `aria-label`, `onClick` compose. Never swallow `style`:
   merge it last (`mergeStyles(base, props.style)`), so a consumer can override.
4. Variants and sizes are string literal unions — never a `variant` boolean
   matrix, never a config object.
5. Controlled **and** uncontrolled state where the component owns state:
   `value`/`defaultValue`/`onValueChange` or `open`/`defaultOpen`/`onOpenChange`.
6. Compound parts throw a named error when used outside their root:
   `` throw new Error("CardHeader must be used inside Card") ``. This is a
   programming error at the boundary, not a domain failure, so `throw` is right
   here and is the documented exception to EF-1.
7. `disabled` and `loading` are explicit props, never inferred.
8. Every component file has a sibling `*.test.tsx` and a `meta` record:

```ts
/** Inventory record mirrored into COMPONENTS.md by plan 117. */
export const cardMeta = {
  name: "Card",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [],
} as const;
```

Plan 117 explains the meta shape and the check that keeps `COMPONENTS.md` in
sync. Until that check exists, update `COMPONENTS.md` by hand in the same commit.

---

## 9. Domain logic: Effect-first, and where the line is

Two layers per component, and the boundary is sharp:

- **`src/<component>/logic.ts`** — the part worth testing without a renderer:
  index arithmetic, filtering, windowing, state transitions, validation
  mapping. Uses `effect` modules (`Arr`, `Option`, `Schema`, `Match`, `Effect`).
  No React import. No JSX.
- **`src/<component>.tsx`** — rendering and event wiring. Calls the logic
  module. Contains no loops over collections (`Arr.map`), no manual index math.

Use `Effect` where the logic has **failure, time, or concurrency**
(toast auto-dismiss, validation decode, async confirm). Use plain pure
functions where it does not (`Arr` + `Option`, no `Effect` wrapper for a total
function). Wrapping a total function in `Effect` is ceremony, not Effect-first.

`Clock` and `Duration` are mandatory for timed behaviour; `Schema` is mandatory
for any value crossing into the component from outside (toast input, combobox
items, accordion type).

---

## 10. Test harness

`src/internal/test-root.tsx`:

```tsx
import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import type { ReactNode } from "react";
import { ThemeProvider } from "@gpuixui/tokens";
import { light, dark } from "@gpuixui/tokens";

export interface ComponentTestRoot extends TestRoot {
  rerender: TestRoot["render"];
}

/** Render `node` in the native GPUix test renderer under one theme. */
export function renderComponent(
  node: ReactNode,
  theme: "light" | "dark" = "dark",
): ComponentTestRoot;
```

Every behaviour test starts with `renderComponent(<X />)` and drives the **real**
native pipeline:

- `renderer.simulateClick(x, y)` — coordinates from
  `renderer.getElementBounds(id)`, so hit-testing is real.
- `renderer.simulateKeyDown("down")` / `simulateKeystrokes("enter")`.
- `renderer.getFocusedElementId()`, `findByType("text")`, `getAllText()`,
  `getElementBounds(id)`.
- `renderer.getTreeJson()` only for structural snapshots that would be
  unreadable as individual assertions.

`testId` is the locator: give every interactive part a stable `testId`
(`card-title`, `dialog-confirm`, `tab-2`). Tests find elements by `testId` via
the tree JSON, never by index.

**The suite may not silently skip.** `src/runtime.test.tsx`:

```tsx
import { expect, it } from "vitest";
import { hasNativeTestRenderer } from "@gpuix/react/testing";

it("has the native GPUix test renderer", () => {
  expect(hasNativeTestRenderer).toBe(true);
});
```

Crash course on the assertion gate: `expect(x).toBe(true)` compares a value with
a literal, so it can fail and `scripts/check-tests.ts` accepts it.

---

## 11. Commands and expected results

Run from the repo root of this worktree.

| Command | Expected result |
| ------- | --------------- |
| `nub install` | exits 0; `packages/components/node_modules` exists; `@gpuix/react` resolves |
| `nub run --filter @gpuixui/components check-types` | exit 0, no output |
| `nub run --filter @gpuixui/components test` | exit 0; `runtime.test.tsx` ran, not skipped; N tests passed |
| `nub run check:tests` | exit 0, `tests: every test asserts something…` |
| `nub run lint` | exit 0 |
| `nub run fmt` | exit 0 (run `nub run fmt:fix` first if it reports diffs) |
| `nub run test` | exit 0 for every workspace |

A command that was not run did not pass. Paste the last line of each into the
commit message body or the session log.

---

## 12. STOP conditions

Stop and report — do not improvise — when any of these is true:

1. `nub install` cannot resolve `@gpuix/react@0.10.0`, or
   `hasNativeTestRenderer` is `false` at test time (the native binary for
   `darwin-arm64` is missing). Report the platform, the `nub install` output,
   and `node -p "process.platform + process.arch"`.
2. `@gpuixui/tokens` or `@gpuixui/primitives` does not exist yet, or a role /
   primitive in §6–§7 is absent with no nearest equivalent. Record the interlock
   and continue with work that does not need it.
3. `jsxImportSource` typing fails for a GPUix element that the runtime supports
   (for example `anchored` in a nested slot). Report the exact error; do not
   cast to `any`.
4. `nub run check` fails for a reason outside `packages/components` (another
   workstream's package). Report it; keep your own gate clean.
5. A native test fails intermittently (different result across two identical
   runs). Report it as a runtime bug with both outputs — do not "stabilise" it
   with a sleep or a retry.

---

## 13. Acceptance criteria

- [ ] `packages/components` exists with the tree in §2.
- [ ] `nub run --filter @gpuixui/components check-types` and `… test` pass.
- [ ] `runtime.test.tsx` proves the native renderer is present.
- [ ] `src/index.ts` exports every implemented component and its props types.
- [ ] No file under `src/` imports a forbidden package (§1) or contains a
      literal colour.
- [ ] `README.md` in the package states the boundary and how to add a component.

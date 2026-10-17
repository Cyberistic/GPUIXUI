# 061 — The `@gpuixui/tokens/react` entry must not inherit the consumer's JSX runtime

**Workstream:** tokens-theme · **Phase:** B/F · **Depends on:** 011, 016
**Status:** done · **Owner:** tokens-theme
**Proof:** without the fix, `nub run --filter @gpuixui/tokens test` fails with
`src/react.tsx(23,5): error TS2875`; with it, 13 files / 309 tests pass. Adding a
fragment back to `src/react.ts` fails the consumer check again, so the guard is
not vacuous.

## 1. The defect

`packages/tokens/src/react.tsx` contains the only JSX in the package's runtime
source:

```tsx
return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
```

TypeScript compiles JSX with the **consumer's** `jsxImportSource`, not the
package's. A GPUix application sets `"jsxImportSource": "@gpuix/react"`, so when
it type-checks the imported source file, TypeScript emits:

```
src/react.tsx(23,5): error TS2875: This JSX tag requires the module path
'@gpuix/react/jsx-runtime' to exist, but none could be found.
```

`packages/tokens` has no dependency on `@gpuix/react` (it must not: tokens is the
bottom of the dependency graph), so the app cannot satisfy that import. The
`playground` workstream worked around it with a `paths` mapping in
`apps/playground/tsconfig.check.json` and `tsconfig.build.json`, and recorded the
fix here as a task for the tokens workstream (playground `TODO.md`; plan 150
§4, `@gpuixui/tokens/react` runtime-loadability STOP condition).

A `/** @jsxImportSource react */` pragma would also work, but it leaves JSX and a
compiler magic in a file whose job is a context provider. The entry needs no
JSX at all, so the honest fix is to remove it: no JSX, no jsx-runtime import, no
consumer requirement, and the module also loads under a plain transpile without a
`tsx` loader.

## 2. Files to change

```
packages/tokens/src/react.tsx            → delete (renamed)
packages/tokens/src/react.ts             → create (same exports, no JSX)
packages/tokens/package.json             → "./react" target: src/react.tsx → src/react.ts
packages/tokens/tsconfig.consumer.json   → create (consumer-shaped type check)
packages/tokens/src/react-consumer.test.ts → create (regression test)
packages/tokens/README.md                → one sentence on the React entry
docs/tokens.md                           → one sentence in "React binding"
COMPONENTS.md                            → Theme extension row: no-shim note
TODO.md                                  → tick the task, add the playground handoff
.agents/slop/plans/README.md             → index this plan
```

Nothing else. Do **not** add `@gpuix/react` to `packages/tokens`, do not add a
`paths` mapping, do not add a `jsxImportSource` pragma.

## 3. Implementation

### 3.1 Replace the JSX provider

Create `packages/tokens/src/react.ts`:

```ts
import { createContext, createElement, useContext, type ReactNode } from "react";
import { lightTheme, type Theme } from "./theme.js";

const ThemeContext = createContext<Theme>(lightTheme);

/** Props for {@link ThemeProvider}. */
export interface ThemeProviderProps {
  /** The resolved theme for this subtree. */
  readonly theme: Theme;
  /** The subtree that reads the theme. */
  readonly children?: ReactNode;
}

/**
 * Supply a theme to descendant hooks. Nested providers scope a brand theme to
 * a subtree. Without a provider, {@link useTheme} returns the light theme.
 *
 * There is no OS appearance detection: GPUix exposes no appearance query, so
 * the application owns the mode switch and passes the resolved theme.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return createElement(ThemeContext.Provider, { value: theme }, children);
}

/** Read the nearest theme, or the light theme when no provider exists. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
```

Delete `src/react.tsx`. Keep the JSDoc identical to the current file; only the
element construction changes. `ThemeContext.Provider` is still exported by React
19 and is the API the current JSX used, so behaviour is unchanged.

### 3.2 Update the export map

In `packages/tokens/package.json`, change both `types` and `default` of the
`"./react"` entry from `./src/react.tsx` to `./src/react.ts`.

### 3.3 Add the consumer-shaped type check

Create `packages/tokens/tsconfig.consumer.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsxImportSource": "@gpuix/react",
    "noEmit": true
  },
  "include": ["src"],
  "exclude": [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/**/*.example.ts"
  ]
}
```

This is exactly the GPUix consumer's setting, with no `paths` shim. It compiles
the package's **published** source only; tests are excluded because a consumer
never compiles them.

### 3.4 Add the regression test

Create `packages/tokens/src/react-consumer.test.ts`:

```ts
/**
 * Guards the defect fixed in plan 061: `src/react.tsx` was the package's only
 * JSX, and TypeScript compiles JSX against the *consumer's* `jsxImportSource`.
 * A GPUix app points that at `@gpuix/react/jsx-runtime`, which `tokens` does not
 * depend on, so type-checking the imported package failed with TS2875 and the
 * playground carried a `paths` shim. The React entry now uses `createElement`,
 * so the package compiles under any consumer jsx runtime.
 *
 * This test runs the real compiler with the GPUix consumer config and no shim.
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const tsc = join(
  dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
  "lib/tsc.js",
);

describe("consumer type check", () => {
  it("compiles under the GPUix jsxImportSource without a paths shim", () => {
    const result = spawnSync(
      process.execPath,
      [tsc, "-p", "tsconfig.consumer.json"],
      { cwd: packageRoot, encoding: "utf8" },
    );
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  });
});
```

Use `process.execPath` on purpose: tests run through `nub` on Node 24.18.0, and
the bare `node` on this box is v12. Do not shell out to `nub` or `npx`.

### 3.5 Documentation

- `packages/tokens/README.md`, next to the React entry bullet: “The React entry
  carries no JSX, so it compiles under any consumer `jsxImportSource` — a GPUix
  app needs no `@gpuix/react/jsx-runtime` shim.”
- `docs/tokens.md`, “React binding” after the provider paragraph: the same fact,
  phrased for maintainers, naming the `createElement` reason.
- `COMPONENTS.md`, Theme extension row: append “The React entry carries no JSX,
  so a GPUix consumer needs no jsx-runtime path shim.”
- `TODO.md`, Design tokens section: tick the new task and add a cross-team row:
  “playground removes the `@gpuix/react/jsx-runtime` `paths` mapping from
  `tsconfig.check.json` / `tsconfig.build.json` now that the tokens React entry
  carries no JSX (owner: `playground`; plan 061).”
- `.agents/slop/plans/README.md`: index 061 in the tokens-theme table.

## 4. Commands and expected results

Run from the repository root unless stated.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `cd packages/tokens && ~/.cache/nub/node/24.18.0/bin/node ../../node_modules/typescript/lib/tsc.js -p tsconfig.consumer.json` **before** the fix (same config, `react.tsx` still present) | exit 1, `error TS2875` naming `@gpuix/react/jsx-runtime` |
| 2 | `nub run --filter @gpuixui/tokens test` **before** the fix, with the new test | one failure: the consumer compile exits 1 |
| 3 | apply §3.1–§3.4 | — |
| 4 | `nub run --filter @gpuixui/tokens test` | 12 files + the new one pass |
| 5 | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| 6 | `nub run check` | exit 0 |
| 7 | `nub run lint` | exit 0 |
| 8 | `nub run test` | exit 0 |
| 9 | `git grep -n "src/react.tsx" packages/tokens` | no output |

## 5. Two-direction proof

1. **Fails without the fix.** With `react.tsx` in place and the new test added,
   command 2 must fail with TS2875. Record the output in the commit message or
   the plan's status note.
2. **Passes with the fix.** Command 4 must pass.
3. **Can fail again.** Temporarily add any JSX element to `src/react.ts` (for
   example, wrap the provider in `<>{children}</>`) and re-run command 4: it must
   fail with TS2875. Revert. This proves the guard is not vacuous.

## 6. STOP conditions

Stop and report with evidence instead of improvising if:

- `createElement(ThemeContext.Provider, …)` does not type-check against the
  installed `@types/react` (React 19). If so, report the exact error; do not cast,
  use `any`, or add a pragma.
- The consumer compile passes **without** the fix (for example because a stray
  `@gpuix/react` exists in `node_modules`). Report the resolution path; do not
  weaken the config to fake the failure.
- The test cannot spawn the compiler under the vitest process. Report
  `process.execPath` and `--version`; do not replace the test with a source-text
  grep that cannot observe compilation.
- Any consumer other than `apps/playground` still carries a shim: record it in
  `TODO.md` as a cross-team row; do not edit that workstream's paths.

## 7. Acceptance criteria

- `packages/tokens/src/react.tsx` no longer exists; `src/react.ts` exports
  `ThemeProvider`, `ThemeProviderProps` and `useTheme` with unchanged behaviour.
- `tsconfig.consumer.json` type-checks the package with
  `"jsxImportSource": "@gpuix/react"` and no `paths`.
- `react-consumer.test.ts` fails when JSX returns to the source and passes now.
- The three completion gates (`nub run check`, `nub run lint`, `nub run test`)
  pass.
- `TODO.md` ticks the task and carries the playground shim-removal handoff;
  `docs/tokens.md`, `packages/tokens/README.md` and `COMPONENTS.md` state the
  no-shim property.

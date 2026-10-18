# 350 — Composing with `@gpuixui/components` needs two providers, and the package must say so

**Phase:** F (integration truth) · **Owner:** primitives · **Depends on:** `021`,
`030`, `090` · **Status:** done (documentation; the runtime proof is blocked — §3)

## 1. The defect

`@gpuixui/primitives` owns `ThemeProvider` (a context that **throws**
`MissingThemeProviderError` when absent, by design), while
`@gpuixui/components` reads `@gpuixui/tokens/react`'s `useTheme` — a **different
context**, whose default is the light theme. A consumer composing both packages
must mount **two** providers, and nothing in this package said so.

The docs-site workstream measured the consequence while wiring live scenes: the
components painted **light-on-dark** until `apps/docs` mounted both providers
(its plan `457` §9), and recorded the ask: *"Unify the context or document the
nesting in both package READMEs."*

## 2. What was measured before writing the fix

### 2.1 The unification is blocked inside this package

The clean fix is for primitives' `ThemeProvider` to also render tokens' provider,
so one provider feeds both contexts. Adding the import and a temporary wrapper
and running `nub run --filter @gpuixui/primitives check-types`:

```
../tokens/src/react.tsx(23,5): error TS2875: This JSX tag requires the module
path '@gpuix/react/jsx-runtime' to exist, but none could be found.
```

`packages/tokens/src/react.tsx` compiles with the consumer's `jsxImportSource`
(`@gpuix/react`), and module resolution for that runtime starts **at the tokens
file**, whose package has no `@gpuix/react` dependency. Primitives declaring
`@gpuix/react` does not help. The fix belongs to `packages/tokens` (the
workstream's existing `TODO.md` row), so it is out of this package's paths.

### 2.2 A runtime proof in this package is blocked by the same error

The planned runtime test imported tokens' provider to mount the documented
composition. It runs under vitest (esbuild, no type check) but `nub run check`
compiles it and fails with the same `TS2875`. There is no honest way to import
that module here without a tsconfig `paths` shim — which the repo's own `TODO.md`
lists as a defect to remove, not to multiply. The test was removed rather than
shipped with `@ts-ignore` or a shim.

The composition itself is **not unverified**: the docs site mounts both providers
in its live native scenes and measured the light-on-dark failure before doing so
(its plan `457` §9). That is the evidence cited by the README until the tokens
fix lands.

## 3. The fix (documentation)

A **"Composing with `@gpuixui/components`"** section in
`packages/primitives/README.md`, next to the theme section:

```tsx
import { ThemeProvider } from "@gpuixui/primitives";
import { ThemeProvider as TokenThemeProvider } from "@gpuixui/tokens/react";

<ThemeProvider theme={theme}>
  <TokenThemeProvider theme={theme}>{/* app */}</TokenThemeProvider>
</ThemeProvider>;
```

It states: primitives throws without a theme and owns the no-default rule;
components read the tokens context, which falls back to light, so it needs its
own provider; both take the **same** resolved theme, so one switch repaints both;
and the two contexts become one when `@gpuixui/tokens/react` is consumable
without the JSX shim.

`src/components/ThemeProvider.tsx`'s file docstring gains the same one-sentence
pointer. No logic, props or types change.

## 4. Files changed

1. `packages/primitives/README.md` — the new section.
2. `packages/primitives/src/components/ThemeProvider.tsx` — docstring pointer.
3. `TODO.md` — the task row, and the tokens row now names the hand-off.
4. `.agents/slop/plans/README.md` — the plan row.

## 5. Test plan and its measured outcome

| Direction attempted | Result |
| --- | --- |
| mount both providers in a runtime probe and assert the painted background | **blocked**: `TS2875` in `nub run check` when primitives compiles `packages/tokens/src/react.tsx` |
| leave the provider out (the docs site's bug) | cannot be encoded locally for the same reason |

No test ships with this plan. The guard that *can* fail is the tokens workstream's
`@gpuixui/tokens/react` fix: when it lands, this plan's recipe collapses to one
provider and a runtime probe becomes possible. That is recorded in `TODO.md` so
the work is not lost.

## 6. Acceptance

- The README states the two-provider rule with a copyable composition; the
  `ThemeProvider` docstring points at it.
- The measured blockage (unification and local proof) is recorded here and in
  `TODO.md`, with the exact compiler error.
- `nub run check`, `nub run lint`, `nub run test` are green (no code changed).
- The plan index records the task.

## 7. Result

Landed on `agent/primitives`, 2026-10-18.

- `README.md` has the **Composing with `@gpuixui/components`** section; the
  `ThemeProvider` docstring names the second context.
- The unification and a local runtime proof are both blocked by
  `packages/tokens`' JSX resolution (`TS2875`, reproduced twice while planning and
  implementing); the failed test was removed rather than shipped with a shim.
- `TODO.md`'s tokens row now records the hand-off: when the tokens package
  compiles without the shim, primitives' provider can render the tokens provider
  and this section collapses to one provider.
- Gates: `nub run check`, `nub run lint`, `nub run test` green; suites unchanged
  (offline 43 / 574, runtime 23 / 409).

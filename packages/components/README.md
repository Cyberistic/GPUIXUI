# `@gpuixui/components`

Composable Tier 2 components — composition, overlays, navigation, menus,
feedback and choice inputs — rendered by GPUix through React.

Plans for this package and every component it will hold are in
`.agents/slop/plans/` (110–117). Read those before adding a component.

## Boundary

Allowed imports, in full: `effect`, `@gpuixui/tokens`, `@gpuixui/primitives`
(only where a behavioural primitive is genuinely needed — see plan 110 §7),
`@gpuix/react` and its subpaths, and `react`.

Never: `apps/*`, `packages/data-grid`, `packages/docking`, `packages/editor`,
`node:*` in `src/**`, DOM APIs, CSS or `className`.

## What is here

| Area | State |
| ---- | ----- |
| `src/internal/*` | collection index arithmetic, key predicates, theme adapter |
| `src/pagination/logic.ts` | page-window arithmetic |
| `src/accordion/logic.ts` | single/multiple open-state transitions |
| `src/breadcrumb/logic.ts` | trail collapsing |
| `src/menu/logic.ts` | active-row transitions over the shared collection |
| components (`card.tsx`, `dialog.tsx`, …) | per plans 111–116; not yet landed |

## Commands

```sh
nub install
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run check            # the repo gate, from the worktree root
```

## Adding a component

1. Read the matching plan in `.agents/slop/plans/`.
2. One file per component family, one named export per part, JSDoc on every
   export, `style` merged last so a consumer can override it.
3. Put anything worth testing without a renderer in `<component>/logic.ts`.
4. Test it: logic tests are plain vitest, behaviour tests use the GPUix native
   test renderer — see the environment matrix in plan 117 §5a for when the
   native renderer is available.
5. Ship an example (`examples/<name>.example.tsx`), a docs page
   (`docs/<name>.mdx`) and an inventory record, in the same commit.

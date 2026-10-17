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
| `src/internal/*` | collection index arithmetic, key predicates, theme seam, the a11y-dump reader and the behaviour-suite render helper |
| `src/runtime.test.tsx` | the native-renderer guard (plan 117 §5b) |
| `src/card.tsx` | Card and its five parts — verified natively |
| `src/badge.tsx` | Badge — the status pill, seven variants, two sizes |
| `src/avatar.tsx`, `src/avatar/logic.ts` | Avatar with unicode-safe initials and a presence dot |
| `src/alert.tsx` | Alert: four tones, a title, an optional icon and a dismiss control |
| `src/empty-state.tsx` | EmptyState: the centred "nothing here yet" panel |
| `src/list.tsx` | List / ListItem: rows with a roving tab stop and single selection |
| `src/internal/controllable.ts` | `useControllableState` — `value`/`defaultValue`/`onValueChange` in one hook |
| `src/internal/button.tsx` | `Button`/`IconButton` — the local stand-in for `@gpuixui/primitives` (plan 110 §7) |
| `src/internal/interaction.ts`, `src/internal/a11y.ts` | behaviour-suite helpers: hit-testing, focus, bounds, the accessibility dump |
| `src/pagination/logic.ts` | page-window arithmetic |
| `src/accordion/logic.ts` | single/multiple open-state transitions |
| `src/breadcrumb/logic.ts` | trail collapsing |
| `src/menu/logic.ts` | active-row transitions over the shared collection |
| `src/combobox/logic.ts` | option ranking and selection membership |
| `src/toast/model.ts`, `src/toast/store.ts` | the toast domain: schema inputs, and the queue with its timers |
| `src/validation/logic.ts` | schema-to-message mapping for form fields |
| more components (`badge.tsx`, `dialog.tsx`, …) | per plans 111–116; not yet landed |

## Commands

```sh
nub install
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test            # logic suites + the guard
nub run --filter @gpuixui/components test:behaviour  # needs a supported host
nub run check            # the repo gate, from the worktree root
```

Two suites, deliberately split. `test` runs everywhere: pure logic and the guard
in `src/runtime.test.tsx`. `test:behaviour` renders a real GPUix tree, so it needs
a host with a GPUix native binding — macOS arm64, Linux x64, Windows x64, or this
Intel Mac, where plan 140's locally built `darwin-x64` binding is installed.
`@gpuix/native` resolves its binding eagerly, so on a host without one a behaviour
file *fails to load* instead of skipping; that is why the default `test` run does
not collect it (plan 117 §5a–§5c).

## Adding a component

1. Read the matching plan in `.agents/slop/plans/`.
2. One file per component family, one named export per part, JSDoc on every
   export, `style` merged last so a consumer can override it.
3. Put anything worth testing without a renderer in `<component>/logic.ts`.
4. Test it twice: logic tests beside the code (`src/<name>.test.ts`), and a
   behaviour suite in `src/behaviour/<name>.test.tsx` that renders through
   `internal/test-root.tsx` — real clicks, keys, focus, text and bounds.
5. Ship an example (`examples/<name>.example.tsx`), a docs page
   (`docs/<name>.mdx`) and an inventory record, in the same commit.

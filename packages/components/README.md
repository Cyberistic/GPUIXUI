# `@gpuixui/components`

Composable Tier 2 components — composition, overlays, navigation, menus,
feedback and choice inputs — rendered by GPUix through React.

Plans for this package and every component it holds are in
`.agents/slop/plans/` (110–134). Read those before adding a component.

## Boundary

Allowed imports, in full: `effect`, `@gpuixui/tokens`, `@gpuixui/primitives`
(only where a behavioural primitive is genuinely needed — see plan 110 §7),
`@gpuix/react` and its subpaths, and `react`.

Never: `apps/*`, `packages/data-grid`, `packages/docking`, `packages/editor`,
`node:*` in component source (the inventory test is the sole repository-check
exception, plan 117 §3), DOM APIs, CSS or `className`.

## What is here

| Area | State |
| ---- | ----- |
| `src/internal/*` | collection index arithmetic, key predicates, theme seam, the merged host ref, the a11y-dump reader, the monotonic clock read and the behaviour-suite render helper |
| `src/runtime.test.tsx` | the native-renderer guard (plan 117 §5b) |
| `src/card.tsx` | Card and its five parts — verified natively |
| `src/badge.tsx` | Badge — the status pill, seven variants, two sizes |
| `src/avatar.tsx`, `src/avatar/logic.ts` | Avatar with unicode-safe initials and a presence dot |
| `src/alert.tsx` | Alert: four tones, a title, an optional icon and a dismiss control |
| `src/empty-state.tsx` | EmptyState: the centred "nothing here yet" panel |
| `src/list.tsx`, `src/list/selection.ts` | List / ListItem: rows with a roving tab stop, single or multiple selection, select-all, type-ahead and single/none row activation |
| `src/dialog.tsx` | Dialog: an anchored window veil, focus-in/return, Tab trap, Escape |
| `src/confirm-dialog.tsx` | ConfirmDialog: Cancel-first, caller-owned close, a locked loading state |
| `src/popover.tsx` | Popover: a `FloatingLayer` panel with the shared dismissal rules |
| `src/dropdown-menu.tsx`, `src/menu/*` | DropdownMenu over the shared row registry, rows, type-ahead buffer, menu surface and the shared `Sub`/`SubTrigger`/`SubContent` parts |
| `src/context-menu.tsx` | ContextMenu: the same rows, type-ahead and submenus at the pointer (`onAuxClick` + `isRightClick`) or at the trigger from `Shift+F10` |
| `src/command-menu.tsx` | CommandMenu: a dialog-hosted palette over `menu/logic.ts`, with ranked subsequence matching inside each declared group |
| `src/tabs.tsx` | Tabs: roving tab stop, automatic/manual activation, arrow wrap |
| `src/collapsible.tsx` | Collapsible: a trigger with `aria-expanded`, a body that unmounts |
| `src/accordion.tsx` | Accordion: single (collapsible) and multiple modes over a tagged union, with arrow/Home/End header movement |
| `src/breadcrumb.tsx` | Breadcrumb: a declarative trail with `maxItems` collapsing |
| `src/pagination.tsx` | Pagination: a stable-width page window with disabled edges |
| `src/field.tsx` | Field: label, control, one message slot; the inline-validation surface |
| `src/search-input.tsx` | SearchInput: a clear control, Enter submit, Escape clear |
| `src/combobox.tsx` | Combobox: GPUix's headless combobox over our ranked option core |
| `src/date-picker.tsx`, `src/date-picker/calendar.ts` | DatePicker: a pure `DateTime` month grid in a Popover, with bounded selection and a clear action (the day half) |
| `src/time-picker.tsx`, `src/time-picker/time.ts` | TimePicker: a 24-hour `HH:mm` field in two labelled segments, with clamped typing, arrow carry/wrap, `minuteStep` and an optional clear |
| `src/toast.tsx`, `src/toast/*` | the toast provider, viewport and Effect store, with pointer/focus pause/resume |
| `src/inventory.ts` | the Tier 2 inventory records, checked against `COMPONENTS.md` |
| `src/internal/dismiss-layer.ts` | the overlay stack: topmost layer wins, one event closes one overlay |
| `src/internal/controllable.ts` | `useControllableState` — `value`/`defaultValue`/`onValueChange` in one hook |
| `src/internal/theme.ts` | the one seam over `@gpuixui/tokens`: re-exports `alpha`, `focusRing`, `elevationShadow` and `statusTone`, and maps the component tone `danger` to the token role `destructive` (plan 157) |
| `src/internal/button.tsx` | `Button`/`IconButton` — the local stand-in for `@gpuixui/primitives` (plan 110 §7) |
| `src/internal/interaction.ts`, `src/internal/a11y.ts` | behaviour-suite helpers: hit-testing, focus, bounds, the accessibility dump |
| `src/behaviour/theme-matrix.test.tsx` | the both-theme assertions for the components without one in their own suite |

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
3. A part that needs the host instance internally (focus, trap, registration)
   takes `ref` out of its props and composes it with `internal/ref.ts`'s
   `useMergedRef`. The last `ref` spread onto a host element wins, so spreading
   props and then passing the internal ref silently drops the caller's.
4. Put anything worth testing without a renderer in `<component>/logic.ts`.
5. Test it twice: logic tests beside the code (`src/<name>.test.ts`), and a
   behaviour suite in `src/behaviour/<name>.test.tsx` that renders through
   `internal/test-root.tsx` — real clicks, keys, focus, text and bounds.
6. Ship an example (`examples/<name>.example.tsx`), a docs page
   (`docs/<name>.mdx`) and an inventory record, in the same commit.

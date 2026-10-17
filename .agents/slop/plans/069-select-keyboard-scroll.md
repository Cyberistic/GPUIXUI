# 069 — `Select`'s keyboard highlight does not scroll the capped list

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `057`, `062`, `066`, `068` |
| Status | **done** |

Self-contained: §0 corrects plan 068's conclusion, §1 measurement, §2 the rule,
§3 files, §4 tests, §5 STOP list, §6 outcome.

---

## 0. The claim in plan 068 is wrong

Plan 068 §6 recorded: *"GPUix owns the highlight and exposes no active-index
signal, so the capped list does not scroll when the arrows move past the fold."*
That conclusion came from observing the *painted* list, not from the published
component's state contract.

Read from the installed published `@gpuix/react@0.10.0`
(`dist/components/select.js` and `select.d.ts`): `SelectItem` receives the
active value through React state and exposes it **per item**:

```ts
interface SelectItemState {
  selected: boolean;
  highlighted: boolean; // context.activeValue === value
  disabled: boolean;
}
```

`SelectItem` accepts `children` as `ReactNode | ((state: SelectItemState) =>
ReactNode)`, and the published implementation calls `children(state)`. So the
wrapper can observe exactly when an option becomes highlighted. There is no
need to know GPUix's `activeValue` by name.

## 1. The bug, measured

GPUix 0.10.0 `TestRenderer`, 1280×800, this host, 60 options (a capped list —
plan 068's cap). The list content is the scroller; the focused element after
open is that content (`id 126`):

| Quantity | Value |
| -------- | ----- |
| scroll offset after open | `[0, 0]` |
| 40 Down presses on the focused content | highlight moves to "Option 39" (measured row background `colors.hover`, id `85`) |
| scroll offset after 40 Downs | `[0, 0]` — unchanged |
| highlighted row's painted box | `y 1249` — far outside the list (`y 44 … 792`) |
| `renderer.scrollIntoView(row 40)` called directly | offset `[0, -485]`; row 40 moves to `y 764`, inside the list |

The runtime API works. The wrapper simply never calls it. Keyboard users can
move the highlight to options they cannot see, and Enter commits an option they
never saw.

## 2. The rule

- When an option becomes **highlighted**, the wrapper scrolls it into view
  through the renderer's `scrollIntoView`.
- The trigger is the per-item `highlighted` state, not the arrow key: pointer
  hover also sets it, and the initial selected option is highlighted on open.
- The effect belongs to the commit phase: a highlighted item renders a null
  component whose `useEffect` asks the wrapper to scroll its own host element.
- A list that is not a scroller is unchanged: `scrollIntoView` is a no-op when
  there is nothing to scroll, so short lists do not jump.
- No new dependency and no arithmetic: the renderer already knows the nearest
  scroll container and the margins.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/Select.tsx` | `SelectHandlers` gains `onHighlight(index)` and `registerItem(index)`; `renderSelect` renders each `SelectItem`'s children as a function that mounts a null `ScrollWhenHighlighted` effect component and the label; the `Select` wrapper keeps the item host ids in a ref and calls `renderer?.scrollIntoView?.(id)` |
| `packages/primitives/runtime/fields.runtime.test.tsx` | one long-list test: 40 Downs scroll the list and leave the highlighted row inside it |
| `packages/primitives/docs/select.mdx` | remove the "keyboard does not scroll" limitation; document the new behaviour under Keyboard/Verification |
| `packages/primitives/README.md` | the Select capability row and the runtime test count |
| `COMPONENTS.md` | the `Selects` row and the runtime count (161 → 163 is **wrong**; measure it) |
| `TODO.md` | add and tick the task under the primitives workstream |
| `.agents/slop/plans/README.md` | index this plan as **done** with the measured outcome |

Notes:

- `SelectItem`'s state children are already part of the published type, so this
  is not a GPUix-internal reach.
- The item ref (`registerItem`) is the host div; the probe proved
  `scrollIntoView` on that row id scrolls the list, not the window.
- `scrollIntoView` is optional on `NativeRenderer`
  (`scrollIntoView?`), so the call is `renderer?.scrollIntoView?.(id)`; an element-
  tree test does not need a renderer.
- `useCallback` keeps `onHighlight` stable, so a highlighted row is not
  re-scrolled on every unrelated render (that would fight a user's wheel scroll).

## 4. Test plan and commands

Runtime (`fields.runtime.test.tsx`, the long-list test already there):

1. 60 options, opened. Press Down 40 times on the focused list content
   (`renderer.nativeSimulateKeyDown(focusedId, "down")` + drain + flush, as the
   probe below did).
2. The list is a scroller and its offset moved (`getScrollOffset(listId)[1]`
   strictly less than before, which is `0`).
3. The row painted with `theme.colors.hover` is "Option 39" and its bounds are
   inside the list's bounds.
4. Short list: 3 options, 2 Downs — still no scroller; the last row stays inside
   the list (proves the effect does not move a list that fits).
5. Open-at-selection: 60 options with `defaultValue="option-49"`; opening scrolls
   to the selected row (the only one wearing `colors.selected`) and leaves it
   inside the list. This is the same effect reached by the initial highlight,
   not by an arrow.

Commands:

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
```

Expected: offline unchanged (**337** at this plan; plan 070 adds one); runtime
**164** (161 + 3).

**Two-direction proof:** comment out the `onHighlight` call (keep everything
else), run the new runtime tests, record the exact failures in §6, restore.

## 5. STOP conditions

- Stop if `scrollIntoView` scrolls the window instead of the list in this
  wrapper — report the measured offsets; do not add a second scroller.
- Stop if the `children(state)` function is not actually invoked (the label
  disappears) — that would contradict the published types; report.
- Stop if the effect runs before the host element id is registered (ref timing)
  and the offset never moves on open — report, do not add timers.
- Stop if `nub run check` cannot stay green.

## 6. Outcome

Executed on this host, 2026-10-17.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 29 files, **337 tests green** (338 after plan 070) |
| `nub run --filter @gpuixui/primitives test:runtime` | 15 files, **164 tests green** (165 after plan 070) |
| 60 options, before | 40 Downs → highlight "Option 39" at `y 1249`; offset `[0, 0]` |
| 60 options, after | 40 Downs → offset `[0, -455]`; highlighted row `y 764` inside the list |
| opening on "Option 49" | offset `[0, -755]`; the selected row at `y 764` inside the list |
| short list | 3 options, 2 Downs: not a scroller, no movement |

**Two-direction proof:** removed the `onHighlight` call → the arrow test fails
with `expected 0 to be less than 0` (offset unchanged) and the highlighted row
outside the list; the open-at-selection test fails with the same
`expected 0 to be less than 0`. Restored, both green.

# 305 — State-aware `style` on interactive parts

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200-adopt-compound-part-api.md`, `201`, `304`, `110–117` |
| Status | planned 2026-10-17 |
| Source | `docs/component-api.md` §3 and the adoption table; `TODO.md` → "Expose `style` as `StateStyle<PartState>`" |

Self-contained.

---

## 1. Why

`docs/component-api.md` §3 says a part is styled from a public state object:

```ts
style?: StateStyle<TabsTriggerState>;   // or children(state)
```

Today no part exposes that. A consumer who wants a different selected/checked/
open/highlighted/invalid look must fork the component: the state is computed
inside it and the `style` prop is a plain `StyleDesc`, merged last but blind to
which state is active.

GPUix already ships the mechanism: `@gpuix/react/floating` exports
`StateStyle<State> = StyleDesc | ((state: State) => StyleDesc)` and
`resolveStyle(style, state)`, and its own headless `ComboboxItem` / `SelectItem` /
`SelectTrigger` use them. This package must expose the same shape on its own
parts instead of inventing a second contract.

## 2. Scope — the parts whose state is not already in `StyleDesc`

`StyleDesc` already carries nested `hover` / `active` rules, so a part whose
only state is a pointer style needs nothing new. This plan covers the parts that
compute a **public, non-pointer state**:

| Part | Exported state | Fields |
| ---- | -------------- | ------ |
| `TabsTrigger` | `TabsTriggerState` | `active`, `disabled`, `focused`, `highlighted`, `orientation` |
| `AccordionTrigger` | `AccordionTriggerState` | `open`, `disabled`, `focused` |
| `CollapsibleTrigger` | `CollapsibleTriggerState` | `open`, `closed`, `focused` |
| `ListItem` | `ListItemState` | `active`, `disabled`, `selected` |
| `MenuItem` | `MenuItemState` | `disabled`, `highlighted` |
| `MenuCheckboxItem` | `MenuCheckboxItemState` | `checked`, `disabled`, `highlighted` |
| `PaginationItem` | `PaginationItemState` | `active` |
| `SearchInput` | `SearchInputState` | `disabled`, `focused` |
| `FieldInput` | `FieldInputState` | `disabled`, `focused`, `invalid` |
| `TimePickerSegment` | `TimePickerSegmentState` | `disabled`, `focused` |
| `ComboboxItem` | `ComboboxItemState` (re-exported) | `selected`, `highlighted`, `disabled` |

Deliberately **out of scope**, and why (recorded in the contract §3):

- button-shaped triggers (`DialogTrigger`, `PopoverTrigger`,
  `DropdownMenuTrigger`, `ContextMenuTrigger`, `DatePickerTrigger`,
  `AlertDismiss`, `PaginationPrevious/Next`) style through the one local
  `internal/button.tsx` stand-in. That stand-in is deleted when
  `@gpuixui/primitives` lands (interlock), and its only state beyond `StyleDesc`
  is `disabled`. Re-implementing it per trigger would double the code that is
  about to disappear.
- `ComboboxTrigger` wraps GPUix's headless trigger, which exposes no state style;
  add it when the headless part does, not by copying its internals.
- `TabsContent`, `CollapsibleContent`, `AccordionContent` and `DialogContent`
  draw no interaction state of their own.
- `children(state)` is not part of this slice: no landed part's markup changes
  by state, and adding it doubles every part. `style` is the contract's first
  option and is enough. The §3 row is updated to say so.

Vocabulary: the contract's list is widened to the names actually used by
`base-gpui`'s per-part structs — `active`, `checked`, `closed`, `disabled`,
`focused`, `highlighted`, `invalid`, `open`, `orientation`, `selected` — because
its original six words omitted `open`/`invalid`/`checked`, which the reference
uses. A state object contains only the names in that list.

## 3. The change per part

One pattern, no second helper:

```ts
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";

export interface TabsTriggerState { /* §2 */ }

export interface TabsTriggerProps extends Omit<Props, "style"> {
  readonly style?: StateStyle<TabsTriggerState>;
}

const state: TabsTriggerState = { /* computed from the values already in scope */ };
style={mergeStyles(baseStyle, resolveStyle(style, state))}
```

Rules:

- The state object is recomputed on every render from values the part already
  has; no new registry, no new context field unless the state cannot be seen
  where the style is applied (none here — `TimePickerSegment` adds a local
  `focused`, exactly as `SearchInput` already has).
- The callback **replaces** the object style, then the result is merged after
  the part's own base style, exactly like today's object. A callback returning
  `{}` keeps the default look.
- `children(state)` is not added (§2).
- Every part exports `<Part>State` from its module; `src/index.ts` already
  re-exports every module, so the type is public.
- `ComboboxItem` passes `resolveStyle(style, state)` into the existing
  `mergeStyles(rowStyle(theme, state), …)` call; GPUix computes `state`.

## 4. Files to change

| Path | Action |
| ---- | ------ |
| `src/tabs.tsx` | `TabsTriggerState`, `style` type, state object, resolve |
| `src/accordion.tsx` | `AccordionTriggerState` (same) |
| `src/collapsible.tsx` | `CollapsibleTriggerState` (same) |
| `src/list.tsx` | `ListItemState` (same) |
| `src/menu/item.tsx` | `MenuItemState`, `MenuCheckboxItemState` (same) |
| `src/pagination.tsx` | `PaginationItemState` (same) |
| `src/search-input.tsx` | `SearchInputState` (same) |
| `src/field.tsx` | `FieldInputState` (same) |
| `src/time-picker.tsx` | `TimePickerSegmentState` + a local `focused` |
| `src/combobox.tsx` | `ComboboxItemProps.style` becomes `StateStyle<ComboboxItemState>`; re-export the type |
| `src/behaviour/state-style.test.tsx` | **new** — one case per part (§6) |
| `docs/component-api.md` | §3 rewritten as adopted; vocabulary widened; the out-of-scope list |
| `docs/<each part's page>.mdx` | a "Style by state" subsection with the state type and one snippet (tabs, accordion, collapsible, list, dropdown-menu, pagination, search-input, field, time-picker, combobox; the context-menu page cross-links the shared menu row) |
| `COMPONENTS.md` | no new rows; add one sentence to the notes where a row already mentions theming? Nothing required |
| `TODO.md`, `.agents/slop/plans/README.md` | tick and index |

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/components check-types     # exit 0
nub run --filter @gpuixui/components test            # exit 0
nub run --filter @gpuixui/components test:behaviour  # exit 0 — 298 existing + 11 new
nub run check                                        # exit 0
nub run lint                                         # exit 0
```

## 6. Test plan

`src/behaviour/state-style.test.tsx` — one case per part. Each renders the part
under the theme with `style` as a callback that records the state it receives and
returns `{ backgroundColor: "#123456" }`, then asserts:

1. the recorded state equals the documented shape for that composition;
2. the returned background is the rendered background (the callback wins over
   the part's own base);
3. an object `style` still behaves as before (one case, on `TabsTrigger`).

Cases:

- selected `TabsTrigger` (`active: true`, `highlighted: false`,
  `focused: false`, `orientation: "horizontal"`); a disabled trigger reports
  `disabled: true`;
- `AccordionTrigger` in an open item (`open: true`);
- `CollapsibleTrigger` with `defaultOpen` (`open: true`, `closed: false`);
- selected `ListItem` (`selected: true`, `active: false`);
- `MenuItem` (`highlighted: false`, `disabled: false`) and a disabled checkbox
  row (`checked: true`, `disabled: true`);
- current `PaginationItem` (`active: true`);
- `SearchInput` disabled (`disabled: true`, `focused: false`);
- `FieldInput` with an error (`invalid: true`);
- `TimePickerSegment` in a disabled picker (`disabled: true`);
- `ComboboxItem` with the popup opened by clicking the trigger; assert the
  recorded state is `{ selected: false, highlighted: <whatever GPUix says>,
  disabled: false }` without hard-coding the highlight rule (read it back).

**Both directions:** change one part (e.g. `ListItem`) to ignore the resolved
style (`style={mergeStyles(base, style as StyleDesc)}` would not typecheck; use
`resolveStyle(undefined, state)` instead) → its case fails. Restore.

## 7. STOP conditions

Stop and report if:

- a part does not already have the state value in scope and would need a new
  context field or an effect to observe it (none expected; `TimePickerSegment`
  adds a local `useState`, the same shape as `SearchInput`);
- `resolveStyle` from the published `@gpuix/react/floating` does not have the
  signature in §1 (then use the types it does publish, not a local copy);
- a state callback cannot win over a nested `hover`/`active` rule in `StyleDesc`
  (record the limit instead of flattening the runtime's merge);
- an existing behaviour test breaks because the callback is now applied in a
  path where a function reached `Props` style unchecked (fix the type, not the
  test).

## 8. Acceptance criteria

- Eleven parts expose `StateStyle<<Part>State>`; each state type is exported and
  documented.
- The callback receives the documented state and its style is merged last.
- Object styles and every existing behaviour are unchanged.
- `docs/component-api.md` §3 says adopted, with the vocabulary and the
  out-of-scope list; the docs pages record their state type.
- All gates in §5 green; the new suite fails without any one part's resolution.

## 9. Result

Filled in when the plan lands.

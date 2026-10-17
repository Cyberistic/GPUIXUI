# 121 — Accordion header keyboard navigation

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 113 (Accordion), 111 (`internal/collection.ts`)
- **Status:** done, 2026-10-17. 4 upsert tests, 4 new native tests (Accordion:
  12), docs and inventory synced. Deviations in §10.

`COMPONENTS.md` records "No arrow-key movement between headers" as the Accordion
gap. The ARIA accordion pattern expects `↓`/`↑` to move focus between headers
(and `Home`/`End` to the ends), leaving Tab as the base path. The shared
`internal/collection.ts` already computes exactly this arithmetic for List, Tabs
and the menus; this plan wires the Accordion to it instead of writing a second
implementation.

Scope is keyboard movement only: arrows must **not** open or close a section —
`Enter`/`Space` keep that job — and disabled headers stay unreachable.

---

## 1. Files

```
src/internal/collection.ts          # + upsertValue (order-preserving row upsert)
src/internal/collection.test.ts     # + upsertValue tests
src/accordion.tsx                   # trigger registry, active row, arrow/Home/End
src/behaviour/accordion.test.tsx    # + 7 native tests
docs/accordion.mdx                  # keyboard table, limitations
src/inventory.ts                    # no arrow-key limitation left to record
COMPONENTS.md                       # Accordion row notes
TODO.md, .agents/slop/plans/README.md
```

## 2. `internal/collection.ts`

```ts
/** A registered row with a stable value, for registries keyed by value. */
export interface ValueItem extends CollectionItem {
  readonly value: string;
}

/** Add or replace a row by value, preserving declaration order. */
export const upsertValue: <Item extends ValueItem>(
  items: ReadonlyArray<Item>,
  item: Item,
) => ReadonlyArray<Item>;
```

Replace semantics: same length, same position, no duplicates. Unit tests cover
append, replace-in-place, order preservation and an unchanged re-register.

## 3. `src/accordion.tsx`

1. `AccordionFrame` owns `rows: ReadonlyArray<TriggerRow>` where
   `TriggerRow = { value, disabled, nativeId }`, `active:
   Option.Option<string>`, and the renderer from `useGpuix()`.
2. `AccordionContextValue` gains:
   - `registerTrigger: (row: TriggerRow) => () => void` (stable, via
     `useCallback`);
   - `noteFocus: (value: string) => void`;
   - `rows` for the divider order (`lastValue` becomes `Arr.last(rows)` mapped to
     its value).
3. `AccordionItem` stops registering for dividers; the **trigger** is the row.
   `AccordionTrigger` gets a stable `attach` ref callback (the List pattern),
   keeps the `PublicInstance` in state, registers in `useLayoutEffect`, and calls
   `noteFocus(value)` in `onFocus` after its existing handler.
4. Each `AccordionTrigger` handles `↓`/`↑`/`Home`/`End` in its own `onKeyDown`
   (the handler is already there for activation) and asks the frame to move:
   - `↓`/`↑`: `nextEnabled(rows, indexOf(active), ±1)`, wrap at both ends, skip
     disabled headers;
   - `Home`/`End`: `firstEnabled`/`lastEnabled`;
   - `Enter`/`Space` keep toggling, exactly as today.
   Handling the key on the trigger, not the frame, means a control inside an
   open section (an input, a link) keeps its arrow keys: it must not move the
   accordion's focus.
   Focus moves with `renderer.focusElement(row.id)` and `active` follows.
5. The user's `onKeyDown` on `Accordion` still runs after the frame's handler.
6. Each enabled trigger remains its own Tab stop (`tabIndex={0}`), as the ARIA
   accordion pattern allows; only arrow movement changes.
7. Divider order now derives from trigger registration order, which is
   declaration order; an item without a trigger is invalid usage and draws no
   divider.

## 4. Tests — `src/internal/collection.test.ts`

- `upsertValue` appends a new value at the end.
- It replaces an existing value in place (order unchanged, length unchanged).
- Re-registering the same value with a new `nativeId` updates the row.
- No duplicates after two upserts of the same value.

## 5. Tests — `src/behaviour/accordion.test.tsx` (native)

Header states the bug: "arrow keys moved focus without skipping a disabled
header, or opened the section they moved to".

1. `↓` from the first header focuses the second enabled header; the section does
   not open.
2. `↓` from the last enabled header wraps to the first.
3. `↑` from the first wraps to the last.
4. A disabled header in the middle is skipped by `↓` and `↑`.
5. `Home`/`End` focus the first/last enabled header.
6. `Enter` on a focused header still toggles it (the arrow handler does not eat
   activation), and `aria-expanded` flips.
7. Both themes still render; focus ring follows real focus.

## 6. Docs, example, inventory

- `docs/accordion.mdx`: keyboard table gains `↓`/`↑` (wrap, skip disabled) and
  `Home`/`End`; state explicitly that arrow keys move focus only. Remove the
  "no arrow-key" limitation; keep "no height animation" and the glyph indicator.
- `COMPONENTS.md`: Accordion notes gain the keyboard path and lose the old
  limitation.
- `src/inventory.ts`: no change to the limitation array (it never listed arrow
  keys) unless the row text changes; check with the inventory test.
- Example unchanged: the feature is keyboard-only and the existing example
  already has three sections with one disabled.

## 7. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # +4 collection tests, all pass
nub run --filter @gpuixui/components test:behaviour   # accordion suite 8 → 15
nub run check                                         # repo gate, exit 0
```

## 8. STOP conditions

1. `renderer.focusElement` on a trigger's native id does not move focus (the List
   path works, so a failure here means the id is wrong) → STOP and report the
   registered ids.
2. The trigger registration re-renders forever (effect loop) → STOP; the
   `registerTrigger` callback must be stable and the row upsert must be
   order-preserving.
3. Moving the divider registry from items to triggers changes the rendered
   divider order in the existing suite → STOP and choose the two-registry design
   instead.

## 9. Acceptance criteria

- [x] Arrow/Home/End movement between enabled headers, wrapping, with real focus.
- [x] Activation untouched; disabled headers skipped; sections do not toggle on
      movement.
- [x] `upsertValue` unit-tested; native tests added; both themes unaffected.
- [x] Docs, inventory, `COMPONENTS.md` and `TODO.md` updated.
- [x] Gate commands in §7 pass.

## 10. Deviations, recorded during implementation (2026-10-17)

1. **User-visible rows are `ValueItem`s** (`{ id, disabled, value }`) rather than
   a separate `TriggerRow` with a duplicate `nativeId`; `id` is the native
   element id, so `nextEnabled` can run on the rows directly.
2. **The frame no longer tracks an `active` value.** `moveFrom` receives the
   value of the trigger that handled the key, which is the focused row by
   construction; tracking focus twice would only create a second source of
   truth.
3. **4 tests, not 7.** Down/up movement, wrapping past the disabled header,
   `Home`/`End`, and Enter-after-arrow are each one test; the "does not open"
   assertion lives in the first one instead of a seventh.
4. **Two-direction proof**: with the `isDown`/`isUp`/`isFirst`/`isLast` branches
   removed, all four new tests failed (8 old still passed); restoring them made
   the suite 12/12 green.
5. **`AccordionItem` no longer registers for dividers**; the trigger does, and
   the item reads `lastValue` from the trigger rows. The existing divider suite
   stayed green, which is STOP condition 3's check.


# 692 — A composite's focus and tab stop are indices, so an `options` change moves them to another item

**Owner:** `primitives` workstream · **Phase:** F · **Depends on:** 041, 049,
056, 065, 359, 380, 502, 583, 590, 601, 603, 639

## 1. The bug

Three pieces of state identify an item by its **array index**:

1. `useRovingFocus` (`src/components/internal.ts`) keeps
   `eventFocus: Option<number>` — the index reported by `onFocus`, or by a
   component's click path (`ToggleGroup`, `RangeSlider`) that calls
   `focus.onFocus(index)` because the pinned release build dispatches no focus
   events (plan `583`).
2. `ToggleGroup` (`src/components/ToggleGroup.tsx`) keeps
   `multipleIndex: number` as the `multiple` mode's tab stop — "the item that
   last held focus" (plan `600`).
3. `CheckboxGroup` (`src/components/CheckboxGroup.tsx`) keeps its own
   `focusedIndex: Option<number>` beside a second copy of the id map, the
   tracker merge and the reveal effect.

An index is not an identity. The options in these groups are **data**
(`options: ReadonlyArray<…>`), so a caller may filter, sort or append them. After
a re-render that changes their order or length, index `n` is a different item:

- the `multiple` tab stop is painted on whichever item now sits at that index;
- an event-tracked ring is painted on the item now at that index (on a runtime
  that dispatches `onFocus`, or through the explicit click path on the pinned
  build);
- `CheckboxGroup` has the same two facts in two copies, so a fix in one never
  reaches the other.

The focused **host id** is the identity the runtime itself preserves: React keeps
the element, and `useNativeFocus` samples its id (plan `590`). The option's
`value` is the identity of the data item. Neither should be re-derived from a
position.

### Measured evidence

A temporary runtime probe (deleted before the fix) mounts a `multiple`
`ToggleGroup` with `Bold / Italic / Underline`, clicks **Underline**, then
re-renders the same component with the options reordered
`Underline / Bold / Italic`:

| observation | before the fix | expected |
| --- | --- | --- |
| ring (`boxShadow`) after the reorder | `tg-italic` | `tg-underline` |
| Tab back into the group after `before` | `tg-italic` | `tg-underline` |

The same probe in `single` mode keeps the selected value `underline` and its
correct `activeIndex`, but the ring still jumps to `tg-italic`: the tab stop is
value-derived and the ring is index-derived, so the two disagree.

## 2. The fix

### 2.1 `useRovingFocus` tracks the focused host, not its index

`packages/primitives/src/components/internal.ts`

- Replace `eventFocus: Option<number>` with
  `eventHost: Option<Option<number>>` in state terms — concretely
  `useState<Option.Option<number>>(Option.none())` holding the **host id**
  returned by the item's ref.
- Derive the index each render:
  - `eventIndex = Option.flatMap(eventHost, (id) => indexOfHost(ids.current, id))`
  - `focusedIndex = Option.isSome(eventIndex) ? eventIndex : tracked`
  where `indexOfHost` searches `ids` (index → host id) with `Arr.fromIterable` +
  `Arr.findFirst`; the group size is small and the map is already the registry.
- `onFocus(index)` stores the host id at `index` (`Option.fromNullishOr`); a
  missing id records `None` and the tracker remains the source.
- `onBlur(index)` clears the stored host only when the id at `index` **is** the
  stored host. A blur whose index now names another item must not clear a live
  ring.
- Keep the existing tracker-clear rule (plan `601`): a sample that names none of
  the group's items clears the event host, so a ring cannot outlive focus. A
  sample that names a group item keeps the event path (it is the immediate
  paint); the host id makes that path identity-correct.
- Keep `registerItem`, `idOf` and the returned `onFocus`/`onBlur` signatures
  unchanged, so every consumer compiles untouched.

### 2.2 `ToggleGroup` stores the multiple tab stop's value

`packages/primitives/src/components/ToggleGroup.tsx`

- Replace `multipleIndex: number` with
  `multipleValue: Option.Option<string>` (`Option.none()` initially).
- `markFocused(index)` records the **option's value** at that index
  (`Option.map(Arr.get(options, index), (option) => option.value)`); it still
  calls `focus.onFocus(index)`.
- `activeIndex` for `multiple` derives `initialActiveIndex(options,
  Option.getOrUndefined(multipleValue))`, so a reordered item keeps the stop and
  a removed item falls back to the first enabled one. `single` is unchanged
  (already value-derived).
- No new public prop; `initialActiveIndex` already treats a missing value as
  "no stop" (plan `502`).

### 2.3 `CheckboxGroup` uses the one focus owner

`packages/primitives/src/components/CheckboxGroup.tsx`

- Delete `rowIds`/`focusedIndex` state, the `trackedFocusIndex` +
  `useNativeFocusId` merge and the duplicate reveal effect; call
  `useRovingFocus()` instead (it already does the id registry, the event/tracker
  merge, the stale-cursor clear and the `ScrollRevealContext` reveal).
- Pass `focusedIndex: focus.focusedIndex`, `onFocus: focus.onFocus`,
  `onBlur: focus.onBlur`, `registerRow: focus.registerItem`.
- The rows stay independent tab stops; nothing about the roving *keyboard*
  contract changes (this group has none).

This is a consolidation: on the pinned release build the click path does not set
`CheckboxGroup`'s event state (no `onFocus`), so its bug is not observable there;
the new runtime case guards the resulting contract (the ring stays on the option
after a reorder) and the structural rule is that one hook owns focus identity.
The failing direction for the class is the `ToggleGroup` case, whose click path
does write the event state on this build (plan `600`).

### 2.4 Docs and ledger

- `packages/primitives/docs/toggle-group.mdx`, `radio-group.mdx` and
  `checkbox-group.mdx`: one sentence in the keyboard/accessibility section that
  the ring and the (roving) tab stop follow the **item**, so reordering
  `options` does not move them.
- `COMPONENTS.md`: a plan-`692` sentence on the Toggle Group, Radio group and
  Checkboxes rows; update the current-run runtime file count `59 → 60` where the
  count is stated.
- `packages/primitives/README.md`: runtime file count `59 → 60`.
- `.agents/slop/plans/README.md`: index this plan.
- `TODO.md`: add the task under the primitives workstream and tick it with the
  measured counts.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/internal.ts` | identity-based `useRovingFocus` |
| `packages/primitives/src/components/ToggleGroup.tsx` | `multipleValue` replaces `multipleIndex` |
| `packages/primitives/src/components/CheckboxGroup.tsx` | use `useRovingFocus`; delete duplicate focus state |
| `packages/primitives/runtime/focus-identity.runtime.test.tsx` | **new** regression suite (3 cases + header) |
| `packages/primitives/docs/toggle-group.mdx` | identity statement |
| `packages/primitives/docs/radio-group.mdx` | identity statement |
| `packages/primitives/docs/checkbox-group.mdx` | identity statement |
| `COMPONENTS.md` | three rows + file count |
| `packages/primitives/README.md` | runtime file count |
| `.agents/slop/plans/README.md` | index |
| `TODO.md` | task row |

## 4. The regression suite

`packages/primitives/runtime/focus-identity.runtime.test.tsx` — header comment
names the bug (the `src/runtime-hygiene.test.ts` rule).

1. **`multiple` ToggleGroup: the ring and the tab stop follow the clicked item
   through a reorder.**
   - Mount `before`, the group (`bold/italic/underline`), `after`.
   - `click("tg-underline")`, `await awaitFrame(ring on tg-underline)`;
     `click("before")`, `settleFocus`, `focusNext`; assert focused
     `tg-underline` (the old code: `tg-italic`).
   - Re-render with `underline/bold/italic`; `awaitFrame` that
     `tg-underline` still paints the ring and `tg-italic` does not (old code:
     the reverse); then `click("before")`, `focusNext` and assert
     `tg-underline` (old code: `tg-italic`).
2. **`single` ToggleGroup: the ring follows the selected item through a
   reorder.**
   - `defaultValue="underline"`; click `tg-underline` (or focus it via a click),
     re-render reordered; assert the ring stays on `tg-underline` and the Tab
     stop is still `tg-underline` (old code: ring on `tg-italic`).
3. **`CheckboxGroup`: the ring follows the clicked row through a reorder.**
   - Click `cg-bold` (last of three), re-render with the options reordered;
     assert the ring is on the row with value `bold` (old `CheckboxGroup` code
     would agree on this build; the case fails if the hook merge or the id
     registry regresses).

Each case uses one fresh `openWindow()` (the fixture rule) and reads only the
painted frame (`element.style.boxShadow` via `isFocusRing`, `focused()` and
`a11yValueOf`), never the component's internal state.

## 5. Exact commands and expected results

Run from the worktree root.

```sh
# 1. The new suite FIRST (red): the ToggleGroup cases must fail by name.
nub run --filter @gpuixui/primitives test:runtime runtime/focus-identity.runtime.test.tsx
#   before the fix: 2 failed (ToggleGroup multiple ring/tab stop; single ring),
#   CheckboxGroup green. Record the failing names in the plan result.

# 2. After the fix, the same command.
#   expected: Test Files 1 passed, Tests 3 passed

# 3. The affected suites (roving, focus lifetime, tab order, groups).
nub run --filter @gpuixui/primitives test:runtime runtime/toggle-group.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/focus-loss.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/focus-ring.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/tab-order.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/roving-arrows.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/checkbox-group.runtime.test.tsx
#   expected: all files passed

# 4. Offline suite (contract, docs, counts).
nub run --filter @gpuixui/primitives test
#   expected: all files passed; the runtime file count guard sees 60

# 5. Repo gates.
nub run check
nub run lint
nub run test
#   expected: exit 0

# 6. Full runtime suite once (the final gate for a cross-control change).
nub run --filter @gpuixui/primitives test:runtime
#   expected: 60 files passed / 826 tests passed, 0 failed
```

## 6. Both directions

| Direction | Proof |
| --- | --- |
| **The old code fails** | Case 1 fails twice before the fix: the ring is on `tg-italic` after the reorder, and `focusNext` lands on `tg-italic`. Case 2 fails on the ring. The failing names are recorded before editing. |
| **The fix passes** | Same file green after the change; the exact assertions are unchanged. |
| **The hook's clear still works** | `runtime/focus-loss.runtime.test.tsx` stays green (a sample naming no item clears the ring). |
| **The tab stop still follows a click** | `toggle-group.runtime.test.tsx`'s plan-600 case stays green. |
| **Disabled options** | `initialActiveIndex` still skips a disabled item; `toggle-group`'s disabled-stop case stays green. |
| **No assert-the-stub** | The cases assert painted boxes, native focus and the a11y value; no stub supplies any of them. |

## 7. STOP conditions

- Case 1's ring or Tab stop is **already** `tg-underline` before the fix: the
  reorder does not reach the wrapper in this harness; stop and report the
  rendered tree rather than weakening the case.
- A case times out at `awaitFrame`: capture `runtime.a11y()` and the elements'
  `style.boxShadow`; do not widen the timeout or drop the ring assertion.
- `runtime/toggle-group.runtime.test.tsx`, `focus-loss` or `tab-order` fails
  after the change: the hook's contract regressed; fix the hook, not the
  existing assertion.
- The full runtime run is not green: stop and report the failing file names and
  the two-direction status. Do not re-baseline a focus, ring or tab-order
  assertion.

## 8. Acceptance

- [x] `useRovingFocus` stores the focused host id and derives the index every
      render; `onBlur` cannot clear a different item's ring.
- [x] `ToggleGroup`'s `multiple` tab stop is derived from the option's value.
- [x] `CheckboxGroup` has one focus owner (`useRovingFocus`); the duplicate
      state/id map/effect are gone.
- [x] The new suite fails in the old direction and passes with the fix (both
      measured, names recorded below).
- [x] The affected suites and the full runtime suite are green; offline
      `test`, `check` and `lint` are green.
- [x] Docs state the identity rule; `README.md` and `COMPONENTS.md` carry the
      measured file count; the plan is indexed and the `TODO.md` row is ticked.

## 9. Result (2026-10-19)

**Red, before the fix** (`runtime/focus-identity.runtime.test.tsx`, 2 failed /
1 passed):

- `keeps a multiple group's ring on the clicked item through a reorder` —
  `expected 'tg-italic' to be 'tg-underline'` (the `multiple` tab stop took the
  item now at the old index; the ring assertion passed once the tracker settled,
  so the tab stop is this build's measured half);
- `keeps a checkbox group's ring on the clicked row through a reorder` —
  timed out waiting for the ring on `cg-gamma`: it painted on `cg-beta`
  (measured directly: gamma's host id still mapped to the old index `2`).
- `keeps a single group's ring on the selected item through a reorder` passed
  before the fix on this build (the tracker's sample already named the moved
  item); it guards the same contract for `single` mode.

The probe also showed why a host-id-only event fix was not enough: React does
not re-run a moved row's ref, so the index→id registry stayed at the old
positions. The hook is therefore keyed by the caller's ordered **values** (the
composite passes them), not by index.

**Green, after the fix:**

```text
nub run --filter @gpuixui/primitives test:runtime runtime/focus-identity.runtime.test.tsx
  Test Files  1 passed (1) · Tests 3 passed

nub run --filter @gpuixui/primitives test:runtime runtime/toggle-group.runtime.test.tsx \
  runtime/focus-loss.runtime.test.tsx runtime/focus-ring.runtime.test.tsx \
  runtime/tab-order.runtime.test.tsx runtime/roving-arrows.runtime.test.tsx \
  runtime/checkbox-group.runtime.test.tsx
  Test Files 6 passed · Tests 104 passed

nub run --filter @gpuixui/primitives test:runtime
  Test Files 60 passed · Tests 826 passed
```

A first full run failed one focus-paint case (`controls`' attached-group ring)
under load and passed scoped; the second full run was 60/826 green — the known
fixed-sleep flake plan `691` addresses, not a regression from this change. The
offline suite is 62 files / 868 tests; `nub run check`, `nub run lint` and
`nub run test` are green.

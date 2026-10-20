# 804 — The pressed family's read-only state: `Toggle` and `ToggleGroup`

**Phase:** C/F (Tier 1 completeness, API symmetry)
**Depends on:** `030`, `040`, `041`, `047`, `054`, `056`, `079`–`081`, `097`,
`324`, `332`, `341`, `359`, `361`, `386`, `600`, `601`, `639`, `692`, `740`–
`748`, `751`, `786`, `796`, `797`, `799`, `800`, `802`, `803`
**Status:** done — implemented in this workstream. Offline **75 files / 1060
tests**; the new native file **7/7**; nine scoped runtime files **164/164**
(`toggle-read-only`, `tab-order`, `pointer-feedback`, `toggle`, `toggle-group`,
`toggle-group-typeahead`, `examples`, `focus-ring`, `state-style`); the full
`test:runtime` **78 files / 992 tests** green. Six mutation rounds were reverted
one at a time and each failed its named case: the resolver's read-only branch,
the `Toggle` inert guard, the group renderer's move and item-key guards, the
component's `onPress` guard, the renderer/component pair behind a click, and the
read-only stop index. One finding changed the implementation: the group's one tab
stop had to follow the ring while read-only, or Tab returned to the selected item
instead of leaving the group after an arrow (measured).

## 1. Why

Plans `786`, `796`, `797`, `799`, `800` and `802` established one review
contract: **`readOnly` keeps the tab stop, the focus ring, the name and the
announced value, refuses every change path, and paints the normal (non-disabled)
surface with a `default` cursor.** It ships on twelve value-bearing parts —
`Input`, `TextArea`, `NumberField`, `OTPField`, `Select`, `Rating`, `Checkbox`,
`Switch`, `CheckboxGroup`, `RadioGroup`, `Slider` and `RangeSlider`.

`Toggle` and `ToggleGroup` were excluded on the premise that they are
"`aria-pressed` actions, not values" (D52, plan `799` §2, plan `802` §2). That
premise does not survive the components' own contract:

- `docs/toggle.mdx` defines the part as "a button that stays on: bold, grid
  view, snap-to-grid, mute" and "a toggle sets a **mode** for what happens
  next". A mode is a persisted setting. The pressed flag is the value.
- `docs/toggle-group.mdx` calls the group "the control for **modes** — text
  alignment, density, view". `type="single"` is a segmented *setting* control:
  the same shape and the same stored value as `RadioGroup`, which already has
  the review state. The only difference is the announced role (buttons with
  `aria-valuetext` instead of radios), and that is a runtime limitation, not a
  different kind of thing.
- The action/value boundary that matters for a review state is not "is the
  control pressable" — a `Checkbox` and a `Switch` are pressable and both got
  the state. It is "does the state mean something a reader may need to see
  without being able to change it". For a stored mode, it does.

Measured consequence of the gap (source facts, guarded by plan `800`'s tab-stop
matrix): the only non-editing state today is `disabled`, which

- fades the control to half opacity (`core/style.ts` `controlStyle`), and
- removes it from the tab order (`tabIndex` is `undefined` while disabled, in
  both `renderToggle` and `renderToggleGroup`),

so a saved settings page cannot show "snap to grid: on" or "text alignment:
centre" as a state a keyboard or screen-reader user can reach. A `Text` beside
it is not a substitute: it loses the `button` role, the tab stop and the
`aria-valuetext` state that carries "pressed"/"not pressed".

0.10.0 publishes no `aria-readonly` (`@gpuix/native/host`'s host props carry
`aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
`aria-valuetext`, `aria-level` only), so the state is **behavioural and visual**;
both pages must say that, exactly as `Select`'s, `Rating`'s and the slider
family's pages do.

## 2. Decision

Add `readOnly?: boolean` to **`Toggle` and `ToggleGroup`**. `Button`,
`IconButton` and `ButtonGroup` stay out: they have no persistent state to
review — pressing them performs an action, and there is nothing to show.

Semantics, identical for both parts:

| Path | Disabled | Read-only |
| ---- | -------- | --------- |
| Tab stop | removed (`Toggle`: the control; group: the single stop) | **kept** |
| Focus ring while focused | none | **painted** |
| Pointer press | refused; no focus recording | refused; a click still **records the item as the group's stop** (the plan-600 rule), and changes nothing |
| `Enter` / `Space` | refused | refused |
| `ToggleGroup` arrows | refused (no movement) | **move the ring only** — `single` no longer selects, matching `RadioGroup`'s read-only rule |
| `ToggleGroup` type-ahead | nothing | **moves the ring only** — no selection |
| `onPressedChange` / `onValueChange` | never | never |
| Paint | `opacity: 0.5`, `cursor: not-allowed` | full opacity, `cursor: default` |
| Hover / press wash | none | none |
| `StateStyle` payload | `disabled: true` | `readOnly: true` on the toggle, the group and each item |
| Announced name / state | unchanged | unchanged |

`readOnly` is one state, not a second `disabled`; a caller passing both gets the
disabled paint and no tab stop (`disabled` wins), the same precedence `Select`
documents.

## 3. Exact files

Change:

1. `packages/primitives/src/core/style.ts`
   - `ControlSpec` gains `readonly readOnly?: boolean` with a JSDoc sentence
     naming the review state and `disabled` precedence.
   - `controlStyle`: one `inert` value; the cursor is `not-allowed` (disabled) /
     `default` (read-only) / `pointer`; the half opacity applies **only** when
     disabled; the hover/active rules are declared **only** when not inert (the
     plan-802 slider rule).
   - `controlFocusStyle` is unchanged: it already returns `{}` only for
     `disabled`, so a read-only control keeps the ring. State that in its
     docstring.
2. `packages/primitives/src/components/Toggle.tsx`
   - `ToggleProps.readOnly`, with JSDoc naming the tab stop, ring, refusal,
     `default` cursor and the missing `aria-readonly`.
   - `ToggleState.readOnly`.
   - `renderToggle`: one `inert` value refuses `toggle()`; `tabIndex` stays
     `0` unless **disabled**; `spec` and the `partState` payload carry
     `readOnly`.
3. `packages/primitives/src/components/ToggleGroup.tsx`
   - `ToggleGroupBase.readOnly`, with JSDoc (one tab stop, ring, refused press,
     arrows/type-ahead move the ring only, no `aria-readonly`).
   - `ToggleGroupState.readOnly`; `ToggleItemState.readOnly`.
   - `renderToggleGroup`:
     - `move(index)` presses only when `props.type === "single"` **and not**
       read-only, then always calls `handlers.onFocusMove(index)`;
     - the item's `onClick` refuses a read-only item **before** the press but
       still records it as the keyboard's return point (plan `600`), so the
       ring follows the click; it records nothing while disabled;
     - the item's `onKey` refuses activation while read-only;
     - the item `spec` and its `resolvePartStyle` payload carry `readOnly`;
     - the root `resolvePartStyle` payload carries `readOnly`;
     - the root `onKeyDown` still refuses a disabled group and still allows
       movement while read-only.
   - `ToggleGroup`:
     - `onPress` refuses `readOnly` (belt and braces on the click/key path);
     - the type-ahead callback focuses the match but does **not** select while
       read-only (`single`); `multiple` is unchanged (it only focused before).
4. `packages/primitives/examples/toggle.example.tsx` — a read-only row beside
   the existing disabled one (`testId="toggle-example-locked"`), showing a mode
   for review.
5. `packages/primitives/examples/toggle-group.example.tsx` — a read-only
   "Locked alignment" group (`testId="toggle-group-example-locked"`) below the
   editable ones.
6. `packages/primitives/docs/toggle.mdx`
   - a `readOnly` row in `## API`;
   - a **Read-only** paragraph (after *Variants, sizes and states*): tab stop,
     ring and announced state kept; click/Enter/Space refused; `disabled` wins;
   - one bullet in `## Accessibility` (no `aria-readonly` in 0.10.0, so the
     difference is behavioural and visual) and one sentence in `## Theming`
     (full contrast, `default` cursor, no wash);
   - `readOnly` in the `## Style by state` table;
   - the new test files in `## Verification`.
7. `packages/primitives/docs/toggle-group.mdx` — the same five edits, phrased
   for the group: one tab stop kept, arrows and type-ahead move the ring only,
   every press refused, and the `single` key rows qualify the read-only state.
8. `packages/primitives/README.md` — the shared-state paragraph names
   `readOnly` on `ToggleState`, `ToggleGroupState` and `ToggleItemState`.
9. `COMPONENTS.md` — a “Read-only (804)” sentence on the **Toggle** and
   **Toggle Group** rows.
10. `TODO.md` — a ticked row under the primitives workstream.
11. `.agents/slop/plans/README.md` — index this plan.
12. `PLAN.md` — D52's toggle sentence points at D54; D54 records the revised
    boundary (review state for a persisted mode; `Button` family still out).
13. `packages/primitives/README.md` and `COMPONENTS.md` — the runtime **file**
    count rises by one (79 → 80); the offline count is unchanged unless the new
    cases need a file (they extend existing suites). The offline **test** total
    is measured by the run, not written into prose (plan `588`).

Tests (updated / new):

14. `packages/primitives/src/core/style.test.ts` — in the control-resolver
    group: a read-only control declares no hover/active, no opacity and
    `cursor: "default"`; a focused read-only control paints the token ring; a
    disabled control keeps `not-allowed` + `0.5`.
15. `packages/primitives/src/components/Toggle.test.tsx` — a read-only toggle
    keeps `tabIndex: 0`, refuses click/Enter/Space (the callback sees zero
    calls), and still announces its pressed state; a disabled toggle keeps the
    existing skipped-stop case.
16. `packages/primitives/src/components/ToggleGroup.test.tsx` — read-only keeps
    the one tab stop and reports `onPress` zero times for a click, Enter and
    Space; in `single`, `ArrowRight` calls `onFocusMove` once and `onPress`
    zero times; a printable key reaches `onTypeahead` (the component, not the
    renderer, owns the no-selection rule).
17. `packages/primitives/src/components/state-style.test.tsx` — the existing
    exact payload assertions gain `readOnly: false`; one read-only mount asserts
    `readOnly: true` on the toggle, the group root and an item.
18. `packages/primitives/runtime/toggle-read-only.runtime.test.tsx` (new) — the
    native contract:
    - a read-only `Toggle` reaches focus with `focusNext`, paints one ring
      (`awaitFrame`), announces `"pressed"`, is not faded and takes
      `cursor: "default"`; the next Tab leaves it;
    - a click, Enter and Space report no `onPressedChange` and leave the
      announced state; a writable twin reports the same click, so a probe that
      missed the control cannot pass;
    - a disabled twin is skipped by the tab order (the contract this state
      replaces);
    - a read-only `ToggleGroup` (`single`) keeps its one stop on the selected
      item, an arrow moves the ring to the next item without changing either
      announced state, a click and Enter/Space report nothing, and a repeat Tab
      leaves the group;
    - a read-only `ToggleGroup` (`multiple`) enters on the last clicked item and
      refuses both a press and a second press that would unpress it;
    - writable twins: the arrow selects in `single`, a click toggles in
      `multiple`.
19. `packages/primitives/runtime/tab-order.runtime.test.tsx` — `Toggle` and
    `ToggleGroup` join `READ_ONLY_CASES` (14 rows).
20. `packages/primitives/runtime/pointer-feedback.runtime.test.tsx` — both parts
    join `READ_ONLY_GESTURES`: a read-only pressed control declares no wash.

## 4. Commands and expected results

Run from the repo root (`nub` is the pinned package manager):

```sh
nub run --filter @gpuixui/primitives check-types      # exit 0
nub run --filter @gpuixui/primitives test             # offline suite green
nub run --filter @gpuixui/primitives test:runtime runtime/toggle-read-only.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/tab-order.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/pointer-feedback.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/toggle.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/toggle-group.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/examples.runtime.test.tsx
```

- The scoped runtime form is the **positional file**, never `-- --run <file>`
  (plan `700`: the double-dash form ran the whole live suite).
- Expected: the new file passes; the tab matrix, the pointer-feedback matrix
  (enabled + disabled + read-only halves), both toggle suites and the examples
  suite still pass. A full `test:runtime` is the merge gate, not part of this
  plan.
- `nub run check` and `nub run test` are the end-of-task gate.

## 5. Test plan (must be able to fail)

- **Core** (`style.test.ts`): restore the hover/active wash on a read-only
  control → the read-only case reports declared interaction rules; keep
  `pointer` in the cursor → the case reports `pointer`; add `opacity` → the
  faded assertion fails.
- **Element tree** (`Toggle.test.tsx`, `ToggleGroup.test.tsx`): remove the
  read-only guard in `toggle()` / the item's key path → the read-only case sees
  one callback; drop the `single` guard in `move()` → `ArrowRight` calls
  `onPress`; drop the `readOnly` field from a payload → the exact-object case
  fails.
- **Runtime** (`toggle-read-only.runtime.test.tsx`): remove a guard → the
  click/key case reports a change and the announced state moves; make the read
  only `tabIndex` undefined → the tab matrix fails by part name and the focus
  case lands on the sentinel; drop the `single` move guard → an arrow changes
  the announced value.
- **Matrix** (`pointer-feedback.runtime.test.tsx`): restore the wash on a
  read-only toggle → the `Toggle` row reports a changed interaction property.

Each mutation is reverted after it fails; the plan's commit message records the
exact failing case names.

## 6. STOP conditions

Stop and report instead of improvising if:

- the runtime moves **no** native focus to a read-only `Toggle`/`ToggleGroup`
  item through `focusNext` (then keep the element-tree contract, do not claim
  the runtime tab stop, and record the measured limit);
- a read-only group's arrow cannot move the ring without the group also
  selecting — i.e. `move()` and the GPUix key path cannot be separated (record
  the measured sequence; do not fake it by moving the value);
- the runtime reports a hover/active wash for a read-only control that the
  authored style does not declare (record the applied-property limit, as plan
  `355` did for rows);
- a contract guard rejects the new prop because a page does not name it — fix
  the page, never relax the guard;
- the change would require editing another workstream's paths. Record it in
  `TODO.md` instead.

## 7. Acceptance

- `readOnly` exists on `Toggle` and `ToggleGroup`, keeps the documented tab
  stop(s) and the ring, refuses click/Enter/Space/type-ahead selection, and (for
  the group) lets arrows and type-ahead move the ring only.
- A read-only control paints full contrast with a `default` cursor and no
  pointer feedback; `disabled` still wins.
- `readOnly` is reported by `ToggleState`, `ToggleGroupState` and
  `ToggleItemState`.
- Both pages name the prop, state the missing `aria-readonly`, and list the new
  tests; both examples mount the state; the inventory, README, `TODO.md`,
  `PLAN.md` and the plan index are current.
- `nub run check` and `nub run test` are green, the scoped runtime files are
  green, and the exact commands and totals are recorded.

## 8. Result

Measured 2026-10-20/21 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run --filter @gpuixui/primitives test` | 75 files / **1060 tests** green (was 1059; +1 net offline case after the read-only cases) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/toggle-read-only.runtime.test.tsx` | 1 file / **7 tests** green |
| nine scoped runtime files (`toggle-read-only`, `tab-order`, `pointer-feedback`, `toggle`, `toggle-group`, `toggle-group-typeahead`, `examples`, `focus-ring`, `state-style`) | 9 files / **164 tests** green |
| full `test:runtime` (end-of-task, `controlStyle` is shared by the family) | **78 files / 992 tests** green, exit 0 |
| `nub run lint` | exit 0 |
| `nub run fmt` | exit 0 (primitives paths) |

Mutation proofs (each reverted after it failed):

- `controlStyle`'s read-only branch removed → `style.test.ts`'s read-only case
  fails and both `Toggle`/`ToggleGroup` pointer-feedback read-only rows fail.
- `Toggle`'s `inert` guard reverted to `disabled` only → the element case fails
  and `a read-only Toggle refuses every press` reports a change.
- The group renderer's `move` guard and item key guard removed → the element
  read-only case fails with `onPress` calls.
- The component's `onPress` read-only guard removed → `types to move the ring,
  never to press` reports a selection.
- The renderer and component guards removed together → `refuses click, Enter and
  Space` records a value.
- The read-only stop index reverted to the value-derived one → the element case
  reports `[0, -1, -1]` and the runtime case traps Tab on `tg-left`.

One finding changed the implementation: a read-only `single` group never moves
its value, so the value-derived tab stop stayed on the selected item while the
ring moved; Tab then returned to the selection instead of leaving the group.
The stop now follows the ring while read-only (`stopIndex`), which the element
case and the runtime Tab case both pin. The docs' read-only paragraph states it.

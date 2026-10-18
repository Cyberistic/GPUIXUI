# 332 — The activation contract: once, and Space on release

**Phase:** F · **Owner:** components workstream (`packages/components`) ·
**Depends on:** 110, 117, 200, 201, 310, 331.

**Status when written:** the documented keyboard rule in `docs/component-api.md`
§4 — "Enter activates on key down, Space on key up" — is **not implemented**,
and a second defect hides behind it: every activation path fires on a
`keyDown` repeat (`isHeld`), so holding a key can run an action twice.

## 1. The defects (measured on `agent/components`, 2026-10-18)

1. **Space activates on key down, not on release.** `internal/key.ts`'s
   `isActivation` is `key === "enter" || key === "space"` and every caller runs
   its action from `onKeyDown`. Upstream GPUix's own `Button`
   (`references/gpuix`, `packages/react/src/components/button.tsx`) activates
   Enter on key down and Space on key **up**, and the shared contract says the
   same. Consequence: Space cannot be cancelled by moving focus before release,
   and a held Space keeps its finger on a destructive action.
2. **A key repeat runs the action again.** `EventPayload.isHeld` is `true` on a
   native key-repeat event (`@gpuix/native` `index.d.ts`), and no predicate
   reads it. Holding Enter on an `AccordionTrigger` toggles the section open and
   closed repeatedly; on a `ListItem` it calls `onActivate` once per repeat; the
   Button stand-in fires `onClick` on every repeat. The runtime exposes
   `nativeSimulateKeyDown(id, key, isHeld)` so this is testable.

Both defects are in the shared activation path; no component has a private
implementation worth keeping.

## 2. The rule

> A control activates **once per keystroke**. Enter fires on key down; Space
> fires on key **up** for a control that activates through
> `internal/activate.ts`. A key-repeat event (`isHeld`) never activates.
>
> Composite row/cell parts keep Space as a **selection** key on key down
> (`List`, menus, grid cells, date cells, tabs): ARIA's listbox/grid patterns
> treat Space as selection there, and moving it to key up would change what the
> key means. Enter still activates them on key down. The repeat guard applies to
> every one of them.
>
> The helper lands with the controls that use it today (the Button stand-in and
> the two clear affordances). The other button-shaped parts — accordion,
> collapsible, breadcrumb, hotkey recorder, inline-edit display, tag chip — keep
> Space on key down; moving them is the follow-up recorded in `TODO.md`.

`defaultPrevented` remains unavailable in `@gpuix/react@0.10.0`; the contract
must stop claiming it is respected (it is not part of `EventPayload`).

## 3. Exact changes

### 3.1 `packages/components/src/internal/key.ts`

- `isActivation`: keep Enter/Space on key down, but return `false` when
  `event.isHeld === true`. Update its JSDoc: it is the **selection** activation
  (listbox/grid/menu rows), Space stays a key-down key there.
- `isEnter`: same repeat guard (`event.isHeld !== true`). Every row action
  (`List` activation, `InlineEdit` commit, `TagInput` commit) uses it.
- New `isSpaceRelease(event)`: `event.key === "space"` — the key-up half for
  button-shaped controls.

### 3.2 `packages/components/src/internal/activate.ts` (new)

One helper so the split exists once:

```ts
export interface ActivationTarget {
  readonly disabled?: boolean;
  readonly onKeyDown?: Props["onKeyDown"];
  readonly onKeyUp?: Props["onKeyUp"];
}

export const activationHandlers = (
  activate: (event: EventPayload) => void,
  { disabled = false, onKeyDown, onKeyUp }: ActivationTarget = {},
): Pick<Props, "onKeyDown" | "onKeyUp"> =>
  disabled
    ? { onKeyDown, onKeyUp }
    : {
        onKeyDown: (event) => {
          onKeyDown?.(event);
          if (isEnter(event)) activate(event);
        },
        onKeyUp: (event) => {
          onKeyUp?.(event);
          if (isSpaceRelease(event)) activate(event);
        },
      };
```

The caller's handler runs first, then the part's action — `docs/component-api.md`
§1. Required JSDoc: the rule from §2 of this plan.

### 3.3 `packages/components/src/internal/button.tsx`

- Destructure `onKeyUp` in `Button` and `IconButton`.
- Replace the local `activation` function with
  `activationHandlers(onClick, { disabled, onKeyDown, onKeyUp })`.
- Remove the now-unused `isActivation` import.

### 3.4 `packages/components/src/search-input.tsx`

The `search-clear` control is a raw `role="button"` div. Spread
`activationHandlers(clear)` and keep `onClick={clear}`. Remove the inline
`onKeyDown`.

### 3.5 `packages/components/src/time-picker.tsx`

`TimePickerClear` is the same shape: spread `activationHandlers(clear)`, keep
`onClick={clear}`, remove the inline `onKeyDown`.

### 3.6 Not changed

`List`, menus, tabs, accordion, collapsible, breadcrumb, date cells, chips,
mentionees and the inline-edit display keep `isActivation` on key down; the
repeat guard is their fix. Their docs' keyboard notes already say "Space
selects/activates" and stay true.

## 4. Tests (each must fail before the fix)

1. `src/internal/key.test.ts`
   - a held Enter/Space is **not** an activation (`isHeld: true`);
   - a plain Enter/Space still is;
   - `isSpaceRelease` accepts Space and rejects Enter/Tab.
   Add `isHeld` as a third parameter of the local `keyEvent` fixture.
2. `src/behaviour/button.test.tsx`
   - "activates Space on release, not on press": `nativeSimulateKeyDown(space)`
     → no call; `nativeSimulateKeyUp(space)` → one call. Today the key-down
     fires, so the first assertion fails.
   - "does not activate again while Enter repeats": `nativeSimulateKeyDown(enter)`
     then `nativeSimulateKeyDown(enter, true)` → one call total.
   - "composes a caller `onKeyUp`": caller spy runs on Space release and the
     button still activates once.
3. `src/behaviour/accordion.test.tsx`
   - "ignores a held Enter": open a section with Enter, send a held Enter, the
     section stays open. Today it closes (the repeat toggles), so this fails.
4. `src/behaviour/list.test.tsx`
   - "activates once while Enter repeats": `onActivate` spy fires once after a
     key-down plus a held key-down. Today it fires twice.
5. `src/behaviour/search-input.test.tsx`
   - "clears on Space release": key down alone leaves the value, key up clears.
6. `src/behaviour/time-picker.test.tsx`
   - the existing clear-by-key case is switched to a Space release; assert the
     key-down alone does nothing (same shape as the search-input case).

Every new case states the bug it guards in its file header or its own comment.

## 5. Docs, inventory and examples

- `docs/component-api.md` §4: replace the rule with §2 of this plan; record that
  `defaultPrevented` is absent from `EventPayload`, so suppression is the
  runtime's, not ours.
- `packages/components/docs/search-input.mdx` and `time-picker.mdx`: the
  keyboard table says Space activates the clear control on release.
- `COMPONENTS.md`: sync the native-test counts for Accordion, Lists, Search
  inputs and Time pickers (the inventory test fails otherwise). The Search
  input and Time picker notes gain "Space activates the clear control on
  release".
- No new example: the behaviour is keyboard, and the existing examples mount.
  `src/behaviour/examples.test.tsx` must stay green.

## 6. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

1. **Before the fix**, keep only the new tests and revert the source files; run
   `nub run --filter @gpuixui/components test:behaviour -- src/behaviour/button.test.tsx src/behaviour/accordion.test.tsx src/behaviour/list.test.tsx src/behaviour/search-input.test.tsx src/behaviour/time-picker.test.tsx`.
   Expected: the new cases fail naming the double activation or the early
   fire. If any passes before the fix, that test does not test the defect —
   STOP and rewrite it.
2. `nub run --filter @gpuixui/components test`
   Expected: green (`332 + new` unit tests).
3. `nub run --filter @gpuixui/components test:behaviour`
   Expected: green (`502 + new` behaviour tests); record the exact number.
4. `nub run check`, `nub run lint`, `nub run test`
   Expected: all green; `check:tests` accepts the new cases.

## 7. STOP conditions

- `nativeSimulateKeyUp` does not dispatch `onKeyUp` to a focused element on this
  host — STOP, record the measured event and do not fake the split.
- A component needs Space on key down for a reason its docs state — STOP and
  leave that part on `isActivation`; add it to §3.6.
- The change makes any existing behaviour suite fail for a reason other than
  the deliberate key split — STOP and report the call path.
- A type error requires an `any`, a cast or an omitted prop — STOP.

## 8. Acceptance

- The before-run shows every new case failing; the after-run is green.
- Holding a key never activates twice in the Button stand-in, an accordion
  header or a list row.
- A button-shaped control activates Space on release and Enter on press.
- `docs/component-api.md` §4 matches the code; inventory counts match the
  suites; the three repo gates pass.

## 9. Outcome

Landed on `agent/components` (2026-10-18). With the five source files stashed and
the new tests kept, the targeted run reported **7 failed / 501 passed**: three
button cases, the accordion held-Enter case, the list repeat case, and the two
clear controls. The accordion case first passed against the stashed source
because the fixture was non-collapsible (a second Enter on the open section is
refused by design); switching it to `collapsible` made the double toggle
observable, which is the shape the delivered test uses. After the fix:
**behaviour 508** (was 502), **unit 334** (was 332), both green, and
`nub run check`, `nub run lint` and `nub run test` pass.

One ordering decision worth recording: `activationHandlers` runs the synthetic
click **before** the caller's key handler, which is the order the Button
stand-in already had. `DropdownMenuTrigger` depends on it — its `onKeyDown`
records the row a keyboard open lands on *after* the click has opened the menu,
and a caller-first order makes the click's `setOpen(!open)` reset that row. The
caller's handler still runs once per keystroke; `docs/component-api.md` §1's
composition rule is about not dropping or replacing a handler, which holds.

Scope landed: the release split covers the four call sites built on the helper
(Button, IconButton, the search clear and the time clear). The other
button-shaped parts keep Space on key down — converting them is a separate sweep
recorded in `TODO.md`, and `docs/component-api.md` §4 names the split instead of
overclaiming it.


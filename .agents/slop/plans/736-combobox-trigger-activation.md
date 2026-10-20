# 736 — A closed combobox trigger opens from the keyboard

**Phase:** F (integration and polish, Tier 2 hardening)
**Owner:** `components` workstream (`packages/components`)
**Depends on:** 110, 116, 138, 302, 323, 328, 332, 334, 388, 398, 523, 565, 583,
602, 666, 672, 706, 721, 732
**Number:** `736` is the first free number across every worktree — `732` is the
previous components plan, `733` belongs to the tokens workstream and
`734`/`735` to the playground (`PLAN.md` D30).

---

## 1. The defect

`docs/combobox.mdx` → **Keyboard** states:

> | click / Enter / Down on the trigger | opens the popup |

Only two of those three paths exist. Measured on this host (2026-10-20) with the
real `TestRenderer`, a closed `Combobox` whose trigger holds native focus and
`Enter` (or `Space`) is pressed: the popup never mounts (`combobox-content`
absent), `aria-expanded` stays `false`, and focus stays on the trigger.
`ArrowDown` does open, because GPUix's headless `ComboboxTrigger` maps
`down`/`up` to `setOpen(true)` itself.

The cause is in the published runtime, not a styling slip: `@gpuix/react@0.10.0`'s
`ComboboxTrigger` (`dist/components/combobox.js`) handles `down`, `up` and
`escape` in `onKeyDown` and toggles on `onClick` — **no activation key**. A
browser would synthesize the click for a real `<button>`; GPUix has no button
element, our trigger is a `div` with `role="button"`, and this library's whole
button contract exists because the runtime synthesizes nothing (plans
332/334, `internal/activate.ts`). So the only way to open a combobox without a
pointer is the undocumented `ArrowDown`, while the documented `Enter` silently
does nothing.

Why this matters beyond the docs: every other trigger in the library is
keyboard-operable through the shared activation contract — `Popover`,
`PreviewCard`, `NavigationMenu`, `DropdownMenu` (plan 557 fixed its Space
regression), `ContextMenu` (`Shift+F10`, plan 122). The combobox is the one
composite a keyboard-only user cannot open the documented way.

### The measurement (recorded verbatim)

Probe (a scratch `src/behaviour/zz-probe.test.tsx`, deleted again before the
gates): `Combobox options={…}` + `ComboboxTrigger testId="picker-trigger"` +
`ComboboxContent` + `ComboboxInput` + `ComboboxList`, trigger focused with
`renderer.focusElement`, then:

| gesture | popup | focus after | verdict |
| ------- | ----- | ----------- | ------- |
| `simulateKeystrokes("down")` | present | `combobox-input` | works (untested in the suite) |
| `simulateKeystrokes("enter")` | absent | `picker-trigger` | **defect** |
| `nativeSimulateKeyDown/Up(id, "space")` | absent (both halves) | `picker-trigger` | **defect** |
| the same Space pair while `disabled` | absent | (out of tab order) | correct pin |

---

## 2. The rule and the fix

**Rule.** A closed `ComboboxTrigger` is a button-shaped control: `Enter` asks to
open on key **down**, `Space` asks to open on key **up**, a held `Enter` asks
once, and a disabled trigger asks for nothing. This is exactly
`internal/activate.ts`'s `activationHandlers` (plans 332/334/640), so the
component must use it rather than invent a second activation rule.

**One open rule.** The popup's open state belongs to the root (`Combobox`), whose
`setOpen` also reports `onOpenChange`, resets the query and clears
`restoreFocus`. The keyboard must go through it, not through a local `useState`.
Add one member to `ComboboxContextValue` and one handler to the trigger:

### 2.1 `packages/components/src/combobox.tsx`

1. In `interface ComboboxContextValue` (next to `noteEscape`/`noteLeave`):

   ```ts
   /** A trigger activation: open when closed, close when open. */
   readonly toggleOpen: () => void;
   ```

2. In the provider value (after `noteOutsidePress`), implement it with the same
   transitions the pointer path uses:

   ```ts
   toggleOpen: () => {
     if (visibleOpen) {
       close.current();
       return;
     }
     restoreFocus.current = false;
     setQuery("");
     setOpen(true);
   },
   ```

   `close.current()` is the existing close path (cancels a pending debounced
   query report, sets `open` false, clears the query), so an `Enter` that closes
   leaves nothing stale. Opening clears the query exactly as the pointer path
   does (`onOpenChange(true)` in the headless root) — one rule, two callers.

3. In `ComboboxTrigger`:
   - destructure `onKeyUp` from the props (today it is silently forwarded through
     `...rest`, which is where the activation handler must also go);
   - read `toggleOpen` from `useCombobox()`;
   - replace the hand-written `onKeyDown` with the shared pair, keeping the
     existing Escape behaviour as the caller-side handler:

   ```ts
   const { toggleOpen, ... } = useCombobox();
   ...
   {...activationHandlers(toggleOpen, {
     disabled,
     onKeyDown: (event) => {
       onKeyDown?.(event);
       if (isDismiss(event)) dismissTopLayer(event);
     },
     onKeyUp,
   })}
   ```

   `activationHandlers` already forwards the caller's `onKeyDown`/`onKeyUp`
   once per keystroke and mutes everything while `disabled`, so keep the spread
   **after** `{...rest}` (the existing order: `HeadlessTrigger` props, then
   `rest`, then the derived `aria-*`, then the handlers).

   Do not add `preventDefault` (0.10.0 has none) and do not touch the
   `down`/`up`/`escape` handling: GPUix keeps that inside `HeadlessTrigger`,
   which wraps our handler.

### 2.2 What must not change

- The pointer path (a press closes and the following click does not re-open,
  plan 583) — it runs through `HeadlessTrigger`'s `onClick`, untouched.
- `ArrowDown`/`ArrowUp` opening and `Escape` dismissal.
- A controlled-closed popup: `toggleOpen` calls `setOpen(true)`, so a caller
  that refuses the open sees one `onOpenChange(true)` and no popup, exactly as
  a click does today.
- The trigger's ring, name, expanded state and `disabled` tab order.

---

## 3. Test plan

File: `packages/components/src/behaviour/combobox.test.tsx` (real GPUix
renderer; three new `it(` cases plus one pin = suite 63 → 67).

Use the existing `Picker` harness (it is already `options`-driven and renders
`ComboboxTrigger`/`ComboboxContent`/`ComboboxInput`/`ComboboxList`). Add a helper
next to `open()`:

```ts
/** Focus the closed trigger, then press one real key. */
const keyOnTrigger = (root: ComponentTestRoot, key: "enter" | "space"): void => {
  const trigger = root.renderer.findByTestId("combobox-trigger");
  if (trigger === undefined) throw new Error("combobox suite: no trigger");
  root.renderer.focusElement(trigger.id);
  root.renderer.nativeSimulateKeyDown(trigger.id, key);
  root.renderer.nativeSimulateKeyUp(trigger.id, key);
};
```

(The default trigger testId is `combobox-trigger`.)

1. **`opens the popup on Enter`** — `keyOnTrigger(picker, "enter")`;
   expect `findByTestId("combobox-content")` defined and
   `focusedTestId(picker)` = `combobox-input` (the open rule already focuses the
   field). **Fails at HEAD** (popup absent, focus on the trigger).
2. **`opens on Space release, not on its press`** — focus the trigger,
   `nativeSimulateKeyDown(id, "space")`, assert the popup is still absent (the
   button contract: Space activates on release), then `nativeSimulateKeyUp`,
   assert the popup is present and the field focused. **Fails at HEAD** on the
   second assertion; the first assertion is the mutation guard for a key-down
   implementation.
3. **`opens nothing from Enter or Space while disabled`** — `Picker disabled`
   with a `radix`-style `autoFocus` is not needed: press both keys on the trigger
   element id, assert the popup never mounts and `onOpenChange` never runs.
   Pin — it must stay green at HEAD and after (guards `activationHandlers`'
   `disabled` option).
4. **`composes the caller's key handlers once per keystroke`** — pass
   `onKeyDown`/`onKeyUp` spies on the trigger; press Enter, assert one press; close
   with Escape; then press Space and assert one more press **and** one release
   each (measured deltas, because Escape's own keydown/up are the caller's too)
   and the popup open. Fails at HEAD on the final open assertion; it is the
   composition guard for the new path, not a pin.

Header comment: append a paragraph naming the defect — *"Keyboard opening: the
docs promised `click / Enter / Down`, but the headless trigger handled only the
arrows, so a keyboard-only user could not open the picker with `Enter` or
`Space` (plan 736)."*

### Both-direction proof (measured, 2026-10-20)

- Revert only `src/combobox.tsx` to `HEAD` and run the file: **64 passed /
  3 failed of 67** — cases 1, 2 and 4 fail with *"expected undefined to be
  defined"* for `combobox-content`, and the disabled pin passes.
- Restore the change: **67/67**. No plan-540 placement case exists in this file
  on this host.

One harness detail worth keeping: after `Enter` opens the popup, a real release
lands on the search field the open just focused, so `pressOnTrigger` sends the
key-up to the renderer's focused host. Sending it back to the trigger pulls
native focus there and the focus assertion reads `combobox-trigger` — a harness
artefact, not a component state.

---

## 4. Documentation and inventory sync (all required before "done")

1. `packages/components/docs/combobox.mdx`
   - Keyboard table: `click / Enter / Space / Down on the trigger | opens the
     popup`, with one sentence after the table: *"Enter activates on press and
     Space on release (the shared button contract), because GPUix synthesizes no
     activation click for a role-bearing div."*
   - Verification line: `(63 tests)` → `(67 tests)`, and name the new coverage
     in the sentence that lists the keyboard paths ("Enter and Space-release
     opening, with Space inert on its press").
2. `packages/components/src/inventory.ts` — nothing to change (`comboboxMeta`
   carries no count), but re-read the limitations list: no new limitation arises.
3. `COMPONENTS.md` → **Comboboxes** row: add *"a closed trigger opens on `Enter`
   (press) and `Space` (release) through the shared activation contract, and on
   `ArrowDown`; a disabled trigger opens nothing"* and change the stated count
   `63` → `67`.
4. `TODO.md` → under *Tier 2 hardening after the inventory closed*, add the
   ticked row for plan 736 with the measurement, the case counts and the gates.
5. `.agents/slop/plans/README.md` → add the 736 row with its status.
6. `PLAN.md` D30 → append: plan 736 takes the next free number (733 tokens,
   734/735 playground), and the next components overflow plan is 737.
7. Delete any scratch probe file (`src/behaviour/zz-probe.test.tsx`) — it would
   change the behaviour count the inventory check computes.

---

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/components test:behaviour -- combobox` | **before**: 63 passed. **after**: 67 passed. (Extra args after `--` are ignored by `nub run`; to scope, use `cd packages/components && nub run test:behaviour combobox`.) |
| `cd packages/components && nub run test:behaviour combobox` | 67 passed, exit 0 |
| `nub run check` | exit 0 (types, lint-adjacent checks, unit suite; the inventory count check must agree with the new count) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 (unit suite, `inventory.test.ts` included) |
| `nub apps/playground/dist/smoke/run.js --list` | lists ids; confirm which Tier 2 ids exist before claiming any |
| `nub apps/playground/dist/smoke/run.js --only <id>` | only if a listed id covers the combobox/overlay surface; otherwise state that the native `TestRenderer` suite above is the evidence (as plans 715/730 recorded) |

Full native suite: **not** required for this change (it is not cross-cutting);
if run before merging the branch, expect the recorded plan-540 binding failures
(28 at `HEAD`) and no new one.

---

## 6. STOP conditions

Stop and report with evidence if any of these happen:

- `activationHandlers` cannot be typed against `HeadlessTriggerProps` (e.g. no
  `onKeyUp` in `Props`) — report the type error instead of casting or using
  `any`.
- `Enter` opens the popup **and** also closes it (a double toggle) on this
  host — that means the runtime synthesizes an activation click for the div;
  record it and stop before adding a guard, because the right fix then differs
  (the plan-557 shape).
- The pointer press path (`closes on a second trigger press`) or the plan-583
  held-press case starts failing — the spread order is wrong; fix the order, and
  stop if it still fails.
- The inventory test reports a count mismatch after the docs edit — the docs
  sentence and `it(` count disagree; recount, do not edit the check.

---

## 7. Acceptance

- `Enter` and `Space` (on release) open a closed, enabled combobox in the real
  renderer; `Space` on its press does not; a disabled trigger does neither.
- The three new failing-at-HEAD cases pass, and the disabled pin stays green.
- Both navigation paths (pointer and keyboard) go through one open rule in the
  root, with no second source of truth for `open`.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 are synced;
  the docs' stated count is the suite's real count.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.
- The change is committed on `agent/components` and pushed (never to `master`).

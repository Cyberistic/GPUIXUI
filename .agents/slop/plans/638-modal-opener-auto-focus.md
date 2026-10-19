# 638 — A modal returns focus to its opener even when its content auto-focused

**Phase:** F (consistency and docs truth)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 112 (dialogs), 309 (drawer, the shared modal rules), 589
(CommandMenu's close focus, the first symptom), 627 (modal descriptions).
**Status:** done — 1 dialog + 1 drawer native case (Dialog 20, Drawer 17), both failing on the old source; docs, `COMPONENTS.md`, `PLAN.md` D30 and the plan index synced

## 1. The bug

`DialogContent` and `DrawerContent` both mount a surface that calls the shared
`useModalFocus` hook (`packages/components/src/internal/modal.ts`). The hook
records the id that held focus when the surface's `contentId` became available:

```ts
useLayoutEffect(() => {
  if (contentId === undefined) return;
  previousFocus.current = renderer?.getFocusedElementId?.() ?? null;
  renderer?.focusElement?.(contentId);
  ...
}, [contentId, renderer]);
```

`contentId` arrives in a layout effect after the surface has mounted. A control
inside the surface that carries `autoFocus` (for example
`<FieldInput autoFocus />` in a dialog form) has already taken native focus by
then — the renderer applies `autoFocus` during the commit. The hook therefore
records **the field inside the dialog** as the opener. On close, the cleanup
restores focus to that field: it is inside the unmounting surface, so focus
ends up on nothing.

Measured on this host (`@gpuix/native@0.10.0`, locally built `darwin-x64`):

- a dialog opened from a trigger, containing `<FieldInput autoFocus />`, ends
  with `focusedTestId === Option.none()` after Escape and `finishMotion`;
- the same dialog without `autoFocus` returns focus to its trigger, which is
  what `docs/dialog.mdx` and `docs/drawer.mdx` promise ("returns focus to
  whatever opened it / the trigger");
- this is the same mechanism plan 589 worked around locally in
  `CommandMenuInput` by removing its `autoFocus`; the shared hook still has the
  defect for every consumer-supplied auto-focused control.

The existing suites do not catch it: `dialog.test.tsx` and `drawer.test.tsx`
only open content without an auto-focused control.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/modal.ts` | Capture the opener at the surface's **first render**, before native focus moves, instead of in the layout effect that waits for `contentId`. |
| `packages/components/src/behaviour/dialog.test.tsx` | Add one native case: a dialog whose content holds an auto-focused `FieldInput` returns focus to the trigger after Escape. |
| `packages/components/src/behaviour/drawer.test.tsx` | The same case for the drawer (the shared hook, second surface). |
| `packages/components/docs/dialog.mdx` | Keep the focus-return promise; state that it holds when content uses `autoFocus` as well. Refresh the native-test count. |
| `packages/components/docs/drawer.mdx` | The same sentence and count. |
| `COMPONENTS.md` | Note the rule on the Dialogs and Drawer rows; refresh their native-test counts. |
| `.agents/slop/plans/README.md` | Index this plan as done once the gates pass. |
| `PLAN.md` | Record `638` as the claimed overflow number in D30. |
| `TODO.md` | Add and tick the task under Tier 2 hardening with the measured result. |

No new export, dependency, example or docs page is needed.

## 3. Exact implementation

In `internal/modal.ts`, replace the lazy ref assignment inside `useModalFocus`:

```ts
const previousFocus = useRef<number | null | undefined>(undefined);
if (previousFocus.current === undefined) {
  // The surface mounts in the same commit that opens the modal, before any
  // native focus change (including a child's `autoFocus`) is applied. Capture
  // the opener here, at render time, rather than in the effect that waits for
  // the content's id (plan 638).
  previousFocus.current = renderer?.getFocusedElementId?.() ?? null;
}
```

Then delete the assignment from the layout effect:

```ts
useLayoutEffect(() => {
  if (contentId === undefined) return;
  renderer?.focusElement?.(contentId);
  ...
```

Everything else stays: the effect still focuses the surface, runs `initialFocus`,
and restores the captured opener on cleanup. `useModalState` and both surfaces
are unchanged.

Do **not** change `CommandMenu`'s `initialFocus` path; it already focuses its
field through the dialog.

## 4. Test plan

Add to `src/behaviour/dialog.test.tsx`:

1. **"returns focus to the trigger when content took autoFocus"** — render a
   `Dialog` with a `DialogTrigger testId="open"`, a `DialogContent` holding
   `<Field label="Name"><FieldInput testId="name" autoFocus /></Field>`, click
   the trigger, then `Escape` and `finishMotion(dialog)`. Expect
   `focusedTestId(dialog)` to equal `Option.some("open")`.
2. Keep the existing "closes on Escape and returns focus to the trigger" case
   green as the no-autoFocus pin.

Add the equivalent case to `src/behaviour/drawer.test.tsx` using `Drawer`,
`DrawerTrigger` and `DrawerContent` (the drawer's exit needs
`finishMotion(drawer, 300)`).

Each case must be proven to fail on the old source:

- **Before the fix:** the dialog case reports `Option.none()` and the drawer
  case reports `Option.none()` (or the auto-focused field) after the exit.
- **After the fix:** both report the trigger id.
- **Can fail after the fix too:** put the opener capture back inside the
  effect keyed on `contentId`; both new cases fail again.

Commands:

```sh
# specific suites (run from packages/components; the behaviour config needs a
# host with the GPUix binding)
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/dialog.test.tsx src/behaviour/drawer.test.tsx

# the whole native suite
nub run test:behaviour

# unit suite + types (the inventory checks docs counts and API tables)
nub run test
nub run check-types
```

If the behaviour suite reports `unsupported-host`, **STOP** and report it —
never claim a pass without the native runtime.

## 5. Docs, inventory and ledger

- `docs/dialog.mdx` and `docs/drawer.mdx`: under the dismissal/focus section,
  add "An auto-focused control inside the content does not change this: the
  opener is captured before the surface takes focus." Refresh each page's
  canonical native-test count (Dialog 19 → 20, Drawer 16 → 17) and name the
  case.
- `COMPONENTS.md`: append the rule to the Dialogs and Drawer rows and update
  their test counts.
- `.agents/slop/plans/README.md`: add the plan row between 637 and the next
  free number, marked `done — …` after the gates.
- `PLAN.md` D30: record that the components workstream claimed `638` for the
  modal opener capture after checking every worktree.
- `TODO.md`: add a ticked entry under "Tier 2 hardening after the inventory
  closed" with the measured `Option.none()` result, the fix, the new counts and
  the both-direction proof.

## 6. STOP conditions

Stop and report rather than improvise if:

- the new dialog case passes **before** the source fix — the harness or the
  assertion is wrong and the defect is not proven;
- the probe reports `unsupported-host`;
- the fix changes the existing "moving focus into the surface" case (focus must
  still land on the surface on open; `autoFocus` is not promised to win);
- `check-types` fails for any reason outside `internal/modal.ts` and the two
  test files;
- another worktree has claimed `638` (re-check `ls
  /Users/cyberistic/GPUIXUI/workspaces/*/.agents/slop/plans/638-*`); if so, take
  the next free number and record it in `PLAN.md` D30.

## 7. Acceptance

- [x] Both new native cases fail at `HEAD` and pass with the fix.
- [x] Dialog and Drawer suites are otherwise unchanged (the recorded plan-540
      binding failures aside).
- [x] `nub run test` (454/454) and `nub run check-types` pass for the package.
- [x] Docs, `COMPONENTS.md`, the plan index and `TODO.md` state the measured
      result and the corrected counts.

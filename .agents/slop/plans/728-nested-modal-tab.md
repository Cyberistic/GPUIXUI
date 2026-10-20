# 728 — A nested modal owns its Tab

**Owner:** components workstream · **Phase:** F (Tier 2 hardening) ·
**Depends on:** 110, 112, 117, 200, 201, 309, 525, 526, 587, 669, 704, 719

**Numbering:** `727` is claimed by tokens-theme
(`727-stored-theme-edit-base`); `720`–`726` are claimed by this branch, the
playground and tokens. `728` is the first number free across `main` and every
worktree on 2026-10-20. Record it in `PLAN.md` D30.

## 1. Why

A dialog can open a confirmation dialog — a settings dialog whose Delete action
asks before doing it, a rename form whose "Discard changes" prompts. Both are
modal, so both mount a `DialogSurface` whose `onKeyDown` calls the shared
`handleModalKeyDown` (`src/dialog.tsx` line 254, `src/drawer.tsx` line 271).

`handleModalKeyDown` moves focus with `focusNextWithin(contentId)` but **does not
claim the press**. When the confirmation is nested inside the outer dialog, one
native `Tab` reaches both handlers in order:

1. the confirmation's trap moves Cancel → Confirm;
2. the outer dialog's trap then moves Confirm → the next stop **in the outer
   dialog**, so focus leaves the dialog that is painted on top.

Measured on this host from `packages/components` (scratch probe, since deleted;
the confirmation opens from a button inside an open dialog, and each gesture
crosses a task as plan 587 requires):

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/zz-probe.test.tsx
# open       confirm-cancel   confirm/outer   <- correct initial focus
# tab        outer-first      confirm/outer   <- skips confirm-accept, leaves the modal
# tab        outer-delete     confirm/outer   <- walks the dialog behind it
# tab        dialog-close     confirm/outer
# shift-tab  outer-delete     confirm/outer
# escape     outer-delete     -/outer         <- Escape was already correct
```

So the confirmation cannot be reached by keyboard after the first `Tab`, and
`Enter` on `outer-first` runs a control behind a painted modal. This is the same
defect class plan `719` fixed for a `Popover` inside a `Dialog`: there the
popover claimed each `Tab` it walked and `handleModalKeyDown` already skips a
claimed event. The modal's own trap never claimed its press, so an enclosing
modal still acted on it.

Scope of this plan:

- `handleModalKeyDown` claims the `Tab` it handles;
- therefore a nested modal (a `ConfirmDialog` in a `Dialog`, a `Dialog` in a
  `Drawer`) is the only trap that acts on that press, and the enclosing trap
  resumes on the next gesture;
- three native cases in `confirm-dialog.test.tsx` (two fail at `HEAD`);
- docs, `COMPONENTS.md`, the plan index and `TODO.md` synced.

**Out of scope** (do not add): Escape behaviour (the dismiss stack already
claims and closes one layer — measured above and in plan `669`); focus entry
(`useModalFocus` already lands on Cancel when the confirmation opens later);
two modals that open in the *same commit* (measured separately, record it as a
follow-up in `TODO.md`, do not fix here); portals, `aria-modal`, or any change to
placement, motion or the parts tree.

## 2. What exists today (read these first)

- `packages/components/src/internal/modal.ts` — the shared rules. `useModalState`
  owns the dismiss layer, `useModalFocus` owns focus entry/return,
  `handleModalKeyDown` runs Escape (`dismissTopLayer`) and Tab
  (`focusNextWithin` / `focusPreviousWithin`) then the caller's `onKeyDown`.
  Its entry guard is `if (!isEventClaimed(event))` — added by plan `719` so a
  popover's claimed `Tab` is not stepped twice.
- `packages/components/src/internal/event-claim.ts` — `claimEvent(event)` marks
  one event's fields for the rest of the task; `isEventClaimed(event)` reads
  without consuming, so every enclosing handler skips the same event.
- `packages/components/src/dialog.tsx` lines 222–309 and
  `packages/components/src/drawer.tsx` lines 230–330 — both surfaces call
  `handleModalKeyDown` from their `onKeyDown`; the confirmation's surface is
  rendered inside the outer content, so its key events bubble to both handlers.
- `packages/components/src/confirm-dialog.tsx` — `Dialog` + `DialogContent`
  with `showClose={false}` and `initialFocus` on Cancel; two actions.
- `packages/components/src/behaviour/confirm-dialog.test.tsx` — 7 native cases,
  `clickCentreOf`, `finishMotion`, `focusedTestId`, `nextTask` helpers.
- `packages/components/src/behaviour/dialog.test.tsx` — the single-modal trap
  case presses `Tab` and `Shift+Tab` in one task; a different modifier is a
  different claim, so the change does not affect it.
- `docs/component-api.md` §4 (the Tab-ownership paragraph) and
  `packages/components/docs/dialog.mdx` `## Keyboard` already state the popover
  rule this plan extends.

Measured today, same probe shape: a **drawer** opened from a dialog keeps its
`Tab` on this binding (`open inner-drawer`, `tab drawer-close`, `tab
drawer-close`). Its surface has one stop, so the inner trap wraps onto itself
and the outer move lands on the same id. The fix must leave that path unchanged
(re-run `drawer.test.tsx`; no new drawer case).

## 3. Exact changes

### 3.1 `packages/components/src/internal/modal.ts`

1. Import the claim beside the existing reader:

   ```ts
   import { claimEvent, isEventClaimed } from "./event-claim.js";
   ```

2. Update the `handleModalKeyDown` JSDoc to state the ownership rule:

   ```
   * Escape closes the topmost overlay. Tab wraps inside the surface and claims
   * the press, so a nested modal's trap is the one that acts on it and an
   * enclosing modal yields — the rule plan 719 established for a popover's own
   * Tab walk. onKeyDown runs last, so a caller observes every key after the
   * modal rules.
   ```

3. Claim the press in the Tab branch only (Escape already claims through
   `dismissTopLayer`):

   ```ts
   Match.when(isTab, (value) => {
     if (value.modifiers?.shift === true) {
       renderer?.focusPreviousWithin?.(contentId ?? -1);
     } else {
       renderer?.focusNextWithin?.(contentId ?? -1);
     }
     claimEvent(value);
   }),
   ```

   Do **not** claim in the `Match.orElse` branch: keys the trap did not act on
   stay available to an enclosing surface.

Do not add a second guard, a counter, a nesting depth or a new module. The claim
is the existing mechanism; this is a one-line claim plus its comment.

### 3.2 `packages/components/src/behaviour/confirm-dialog.test.tsx`

Extend the header comment with the bug this guards: "a confirmation opened from
a dialog lost the keyboard — one Tab moved focus into the dialog behind it,
because both modal surfaces trapped the same press".

Add a fixture below `Harness`:

```tsx
/** A dialog whose Delete action asks for confirmation, as an app composes it. */
const DialogWithConfirm = () => {
  const [confirm, setConfirm] = useState(false);
  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent label="Settings" testId="outer-content">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Button testId="outer-first">First</Button>
        <Button testId="outer-delete" onClick={() => setConfirm(true)}>
          Delete
        </Button>
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Delete?"
          description="This cannot be undone."
          onConfirm={() => undefined}
        />
      </DialogContent>
    </Dialog>
  );
};
```

Imports: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from
`../dialog.js`; `Button` from `../internal/button.js`; `nextTask` and
`isShown` join the `internal/interaction.js` import. Keep the existing imports.

Add three cases at the end of the `describe`:

1. **`it("keeps Tab inside a confirmation opened from a dialog", async () => {`**
   - `renderComponent(<DialogWithConfirm />)`;
   - `clickCentreOf(confirm, "outer-delete")`, `finishMotion(confirm)`;
   - expect `focusedTestId` to be `confirm-cancel`;
   - `await nextTask(); simulateKeystrokes("tab");` expect `confirm-accept`;
   - `await nextTask(); simulateKeystrokes("tab");` expect `confirm-cancel`
     (the two-stop wrap);
   - unmount.
   This fails at `HEAD` on the first `Tab` with `outer-first` (measured).
2. **`it("keeps Shift+Tab inside it too", async () => {`** — same setup; one
   `shift-tab` from Cancel; expect `confirm-accept`; unmount. Fails at `HEAD`
   with `outer-first` (measured).
3. **`it("closes only the confirmation and lets the outer trap resume", async
   () => {`** — open as above; `await nextTask(); escape; finishMotion(confirm);`
   expect `isShown(confirm, "confirm-accept")` to be `false`,
   `isShown(confirm, "outer-first")` to be `true`, and `focusedTestId` to be
   `outer-delete` (the opener); then `await nextTask(); tab;` expect
   `dialog-close` — the outer trap works on the next gesture. This pins the
   Escape path and proves the claim does not leak past its task. It passes at
   `HEAD`; say so in the header so nobody mistakes it for the regression.

The suite becomes 10 cases (7 → 10).

### 3.3 `packages/components/docs/confirm-dialog.mdx`

- `## Keyboard`: append to the `Tab` row's meaning, and add one sentence below
  the table: "A confirmation opened from a `Dialog` owns its `Tab`: the enclosing
  dialog's trap yields to the press the confirmation handled and resumes when it
  closes (plan 728)."
- `## Verification`: `(7 tests)` → `(10 tests)` and add the three cases to the
  sentence list ("a confirmation opened from a dialog keeps Tab and Shift+Tab
  inside it, and closes alone with the outer trap resuming").

### 3.4 `packages/components/docs/dialog.mdx`

In `## Keyboard`, extend the "A nested surface that handles `Tab` itself owns
that press" paragraph: name both cases — a `Popover` inside the content (plan
719) and a modal opened from the content (a `ConfirmDialog`, a `Dialog`; plan
728) — so a reader of the Dialog page sees the rule without opening the
confirmation page. No test-count change.

### 3.5 `docs/component-api.md`

§4, the Tab-ownership sentence: after the popover clause add "and so does a
modal: each `Tab` a `Dialog` or `Drawer` traps is claimed, so a nested modal owns
the keyboard and the enclosing trap resumes on the next press (plan `728`)."

### 3.6 `COMPONENTS.md`

- **Confirmation dialogs** row: `7 native behaviour tests` → `10 native
  behaviour tests`, and add the sentence "a confirmation opened from a dialog
  owns its `Tab` — the trap claims each press, so the enclosing dialog yields
  and resumes when it closes (plan 728)".
- **Dialogs** row: add the same sentence after the Tab/trap text; keep `21
  native behaviour tests` (the new cases live in the confirmation suite).

### 3.7 `TODO.md`

Add one bullet under "Tier 2 hardening after the inventory closed (plans 120+)",
formatted like its neighbours:

```
- [x] A nested modal owns its Tab — plan 728: measured that a confirmation
  opened from a dialog lost the keyboard on the first Tab (Cancel → the
  dialog's first control, while the confirmation stayed painted), because both
  surfaces trapped the same press. The modal trap now claims each Tab it
  handles, the existing reader makes the enclosing trap yield, and Escape's
  one-layer behaviour is unchanged; 2 new failing cases + 1 pin (Confirmation
  dialog 10), two mutation proofs; docs, `COMPONENTS.md` and the inventory
  synced (owner: components)
```

Then add a *follow-up* row, unticked, in the same section:

```
- [ ] A modal opened in the same commit as its parent loses the initial focus to
  the parent (measured with both `open` at mount: focus ends on the outer
  surface, not the confirmation's Cancel). Later-opened nested modals are
  correct (plan 728); the mount-order case needs its own plan (owner: components)
```

### 3.8 `PLAN.md`

D30's running sentence: record that plan 728 took the first free number after
`727` (tokens-theme).

### 3.9 `.agents/slop/plans/README.md`

Add the row to the components table, after `724`/`726` (keep numeric order):

```
| [728](./728-nested-modal-tab.md) | A nested modal owns its Tab | F | 110, 112, 117, 200, 201, 309, 525, 587, 669, 719 | done — measured: a confirmation opened from a dialog lost the keyboard on the first Tab (Cancel → the dialog's first control, confirmation still painted, controls behind it reachable), because both surfaces trapped the same press. The modal trap now claims each Tab it handles, so the enclosing trap yields and resumes on the next gesture; Escape is unchanged. 2 failing cases + 1 pin (Confirmation dialog 7 → 10), two mutation proofs; docs, `COMPONENTS.md` and the inventory synced |
```

## 4. Test plan

Run from `packages/components`.

1. **Scoped behaviour, before the fix** (proves the regression exists):

   ```sh
   nub exec vitest run --config vitest.behaviour.config.ts \
     src/behaviour/confirm-dialog.test.tsx
   ```

   Expected: 8 passed / 2 failed of 10 — the two new Tab cases fail with
   `Option.some("outer-first")`, the pin and the 7 existing cases pass.

2. **After the fix** — same command. Expected: 10/10.

3. **Mutation proofs** — each must fail only the intended cases, then restore:

   - remove `claimEvent(value)` from the Tab branch → the two Tab cases fail
     again with `outer-first` (the pin and the rest pass);
   - move `claimEvent(value)` into the `Match.orElse` branch (claiming every
     key) → the pin's Escape-then-Tab case fails (the Escape claim suppresses
     the following Tab only if it is in the same task; the pin crosses a task,
     so instead prove the over-broad claim by claiming in the Escape branch and
     observing that the pin's next `Tab` is suppressed when the task crossing is
     temporarily removed — record what was measured). If the second mutation
     cannot be made to fail deterministically, keep the first proof and say so
     in the plan index; do not invent a failure.

4. **Neighbour suites** (shared handler):

   ```sh
   nub exec vitest run --config vitest.behaviour.config.ts \
     src/behaviour/dialog.test.tsx src/behaviour/drawer.test.tsx \
     src/behaviour/popover.test.tsx
   ```

   Expected: the same pass/fail counts as at `HEAD` (Dialog 21, Drawer 17,
   Popover 26 — the recorded plan-540 placement failures only).

5. **End-of-task gates** (cross-cutting change — shared modal rule):

   ```sh
   nub run check
   nub run lint
   nub run test
   nub run --filter @gpuixui/components test:behaviour
   ```

   All three gates exit `0`; the full behaviour suite's only failures are the
   recorded plan-540 binding classes. Record the exact totals in the plan index.

6. **Native smoke:** no `apps/playground` scenario covers dialogs in this
   worktree (the registry is GPUix primitives only), so the real `TestRenderer`
   suite above is the native evidence. Do not run `--all` or the live suite for
   this change.

## 5. STOP conditions

- Stop and report if the two new Tab cases do **not** fail at `HEAD` with
  `outer-first` — the measurement is wrong or the fixture is not nested.
- Stop if `claimEvent` in the Tab branch changes Dialog, Drawer or Popover
  counts beyond the recorded plan-540 failures: the claim must only affect an
  *enclosing* trap, so a change elsewhere means the branch is claiming too much.
- Stop if `EventPayload` grows a `preventDefault` or the binding changes the
  claim's task boundary — re-measure before adapting.
- Do not touch `useModalFocus`, the dismiss stack, motion or the parts tree.

## 6. Acceptance

- `internal/modal.ts` claims the `Tab` it traps, with the ownership rule in its
  JSDoc.
- `confirm-dialog.test.tsx` has the fixture and three cases; two fail at `HEAD`
  and all three pass after; the header states which ones failed.
- `docs/confirm-dialog.mdx` claims `(10 tests)`; `dialog.mdx`,
  `docs/component-api.md`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the
  plan index are synced.
- `nub run check`, `nub run lint`, `nub run test` exit `0`; the full behaviour
  suite shows no new failure class.
- Committed on `agent/components` with the plan in its own commit and pushed.

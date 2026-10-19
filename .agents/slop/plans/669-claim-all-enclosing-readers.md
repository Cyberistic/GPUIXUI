# Plan 669 — One Escape closes one layer, however many surfaces enclose it

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 114, 366, 514, 583, 587 |
| Status | **done** — the claim is readable by every enclosing handler for its task; 1 claim + 1 dismiss-stack unit case and 1 native case fail at `HEAD` and pass after |
| Claimed number | `669` — the first free number after `668`; `667`/`668` are `tokens-theme`'s, checked across every worktree and recorded in `PLAN.md` D30 |

## 0. Why this plan exists

Plan 587 made the shared event claim live one **task**, so a live window's
delayed enclosing handler still sees it. That fix assumed the claim has exactly
one enclosing reader, and `isEventClaimed` therefore **consumes** the claim on
first read ("so an enclosing surface can never read it twice").

Three nested dismiss layers have two enclosing readers, not one. Measured in
this worktree on 2026-10-19 with the real `TestRenderer`:

```text
Dialog > DropdownMenu > Submenu, focus on a submenu row, one Escape
  submenu handler   claims  → closes the submenu
  menu handler               → consumes the claim, does nothing
  dialog handler             → sees no claim → dismissTopLayer() calls the
                               topmost remaining layer, which is the menu
result: submenu closed, menu closed, dialog open
```

The user asked to close one level and lost two. The same shape exists wherever a
surface inside a surface inside a surface handles one event (a field claim inside
a menu inside a dialog, a card inside a popover inside a dialog).

Unit evidence at `HEAD` (`src/internal/dismiss-layer.test.ts`, three layers):

```text
dismissTopLayer(escape()) → true    (inner closes)
dismissTopLayer(escape()) → false   (middle consumes)
dismissTopLayer(escape()) → true    (outer handler → middle closes)
```

The docs already promise the fixed behaviour: `docs/component-api.md` §4 and
`packages/components/docs/dialog.mdx` both say one event cannot close two
layers. The claim's consumption contradicts that promise at every depth above
two.

## 1. The rule

A claim names **one event occurrence for the rest of its task**. The surface
that handled the event claims it; every enclosing surface must leave it alone.
Reading a claim is a question, not a handover, so `isEventClaimed` must **not**
clear it. The task-long lifetime from plan 587 is what bounds it.

Consequence: two identical events delivered inside one task are
indistinguishable and the second is suppressed. That is not a real input — a
second key press or pointer press is a new task — and plan 587 already made the
one harness case that sends two identical presses in one test separate them by a
task (`combobox.test.tsx`'s two backdrop presses). Any other suite that batches
two identical claiming gestures must do the same, with a comment.

## 2. Exact files to change

1. `packages/components/src/internal/event-claim.ts` — `isEventClaimed` stops
   clearing; update the module comment to say every reader in the task sees the
   claim, and that a later identical event is only distinguishable across a task
   boundary.
2. `packages/components/src/internal/event-claim.test.ts` — replace the
   "consumes a claim on the first reader" case with "stays claimed for every
   reader in the task" (both reads `true`, then `false` after a task).
3. `packages/components/src/internal/dismiss-layer.test.ts` — add the
   three-layer case from §0: one Escape, three `dismissTopLayer` calls, only the
   inner handler runs; the third returns `false`.
4. `packages/components/src/behaviour/dialog.test.tsx` — a fixture
   `NestedMenuLayers` and one native case: dialog open, a dropdown menu open, the
   submenu open, focus in the submenu; one Escape closes only the submenu (menu
   and dialog still present), the second closes the menu and keeps the dialog
   (the third closes the dialog). Header comment names the measured bug.
5. `packages/components/docs/dialog.mdx` — the Verification count 20 → 21 and
   one clause naming the three-layer case.
6. `COMPONENTS.md` — Dialogs row: the dismissal clause now says one Escape
   closes exactly one layer at any nesting depth, and the counts become 21
   native tests + 8 dismiss-stack logic tests (7 existing + the new case).
7. `TODO.md` — tick the new hardening item (add it under Tier 2 hardening).
8. `.agents/slop/plans/README.md` — index row `669`.
9. `PLAN.md` D30 — record that `669` is the next components overflow number.

`docs/component-api.md` §4 and the dialog docs already state the intended rule;
add one sentence only where the reader count was ambiguous (do not rewrite the
section).

## 3. Implementation

### 3.1 `internal/event-claim.ts`

```ts
/**
 * Whether an enclosing surface must leave the same event alone.
 *
 * The claim is not consumed: one native event reaches every enclosing handler
 * (a submenu, its menu, the dialog around both), and all of them must skip it.
 * The task-long cleanup in `claimEvent` bounds it; a genuinely new event is a
 * new task.
 */
export const isEventClaimed = (event: EventPayload): boolean =>
  Option.exists(claim, (current) => sameClaim(current, claimOf(event)));
```

Remove the `claim = Option.none()` branch and the "Consume" comment. Keep
`claimEvent`, `claimOf`, `sameClaim`, and the `setTimeout` cleanup exactly as
they are.

### 3.2 `internal/event-claim.test.ts`

Replace:

```ts
it("consumes a claim on the first reader", () => {
  claimEvent(key());
  expect(isEventClaimed(key())).toBe(true);
  expect(isEventClaimed(key())).toBe(false);
});
```

with:

```ts
it("stays claimed for every reader in the task", async () => {
  claimEvent(key());
  // A submenu, its menu and the dialog around both all read one event.
  expect(isEventClaimed(key())).toBe(true);
  expect(isEventClaimed(key())).toBe(true);
  await nextTask();
  expect(isEventClaimed(key())).toBe(false);
});
```

### 3.3 `internal/dismiss-layer.test.ts`

```ts
it("keeps one event to one layer with three layers nested", () => {
  const outer = vi.fn();
  const middle = vi.fn();
  const inner = vi.fn();
  const removeOuter = pushDismissLayer(outer);
  const removeMiddle = pushDismissLayer(middle);
  const removeInner = pushDismissLayer(inner);

  expect(dismissTopLayer(escape())).toBe(true);
  expect(dismissTopLayer(escape())).toBe(false);
  expect(dismissTopLayer(escape())).toBe(false);

  expect(inner).toHaveBeenCalledTimes(1);
  expect(middle).not.toHaveBeenCalled();
  expect(outer).not.toHaveBeenCalled();

  removeInner();
  removeMiddle();
  removeOuter();
});
```

Keep the existing "consumes an event once" case: its observable result is
unchanged (second call `false`, outer not called); the claim simply stays for a
third reader.

### 3.4 Native case

Add to `dialog.test.tsx`, after `NestedOverlays`:

```tsx
/** A dialog holding a menu whose submenu is open: three dismiss layers. */
const NestedMenuLayers = () => {
  const [dialogOpen, setDialogOpen] = useState(true);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger testId="open">Open</DialogTrigger>
      <DialogContent label="Actions" testId="dialog">
        <DialogTitle>Actions</DialogTitle>
        <DropdownMenu>
          <DropdownMenuTrigger testId="menu-trigger">Actions</DropdownMenuTrigger>
          <DropdownMenuContent testId="menu" label="Actions">
            <DropdownMenuItem testId="rename" onSelect={vi.fn()}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger testId="share">Share</DropdownMenuSubTrigger>
              <DropdownMenuSubContent testId="submenu" label="Share">
                <DropdownMenuItem testId="copy-link" onSelect={vi.fn()}>
                  Copy link
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </DialogContent>
    </Dialog>
  );
};
```

Case:

```tsx
it("closes one layer per Escape with three surfaces nested", () => {
  const scene = renderComponent(<NestedMenuLayers />);

  clickCentreOf(scene, "menu-trigger");
  scene.renderer.simulateKeystrokes("down down");
  scene.renderer.simulateKeystrokes("right");
  expect(scene.renderer.findByTestId("submenu")).toBeDefined();

  scene.renderer.simulateKeystrokes("escape");
  expect(scene.renderer.findByTestId("submenu")).toBeUndefined();
  expect(scene.renderer.findByTestId("dialog")).toBeDefined();
  expect(scene.renderer.findByTestId("menu")).toBeDefined();

  scene.renderer.simulateKeystrokes("escape");
  expect(scene.renderer.findByTestId("menu")).toBeUndefined();
  expect(scene.renderer.findByTestId("dialog")).toBeDefined();

  scene.unmount();
});
```

Pointer clicks on the submenu trigger are unreliable in this fixture (the
menu surface's outside-press path intercepts the release); the keyboard path is
the one the bug was measured with and the one the existing submenu suite uses.
Add the needed imports (`DropdownMenu*`, `DropdownMenuItem`) at the top.

## 4. Test plan

From `packages/components`:

```sh
nub exec vitest run src/internal/event-claim.test.ts src/internal/dismiss-layer.test.ts
# HEAD: 1 claim case + 1 dismiss case fail (the rest pass).
# After §3.1: all green.

nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/dialog.test.tsx
# HEAD: the new case fails at "menu" (submenu + menu both gone).
# After §3.1: 21/21.

nub run test                 # unit suite, exit 0 (472 + 1 net case)
nub run test:behaviour       # 31 known plan-540 failures unchanged, +1 pass
cd ../.. && nub run check && nub run lint
```

Both-direction proof: run the two unit files and the dialog suite **before**
§3.1 and paste the failing output into the commit body; apply §3.1; run all
three again. Reverting §3.1 alone must restore both failures.

## 5. STOP conditions

- Any unit or native case other than the two named in §4 changes verdict: stop
  and name it. The claim is shared by menus, overlays and fields, so a real
  regression is possible.
- A suite reports more than the recorded 31 plan-540 binding failures: stop and
  classify the extra one before continuing.
- The native case passes at `HEAD`: stop — it does not reproduce the measured
  three-layer defect, and the plan's premise is wrong.
- A test that sends two identical claiming gestures in one task starts failing
  beyond the known sets: separate those gestures with `wait(0)` and a comment
  (plan 587's rule), do not shorten the claim.

## 6. Acceptance

- `isEventClaimed` neither clears nor mutates the claim.
- Three nested layers close one layer per Escape in the unit stack and in the
  real renderer.
- A claim still survives a microtask and is gone after a task.
- Unit suite green; native suite = the same recorded 31 plan-540 failures plus
  the new passing case; `nub run check` and `nub run lint` exit `0`.
- `docs/component-api.md` §4, `packages/components/docs/dialog.mdx`,
  `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan index agree.
- One commit: `fix(components): one event closes one layer at any depth (plan 669)`.

## 7. Results

- `internal/event-claim.ts`: `isEventClaimed` now reports the claim without
  clearing it (`Option.exists`), and the module/function comments name every
  enclosing reader and the task-long bound.
- `internal/event-claim.test.ts`: the "consumes a claim on the first reader" case
  is now "stays claimed for every reader in the task" (two reads true, then false
  after a task).
- `internal/dismiss-layer.test.ts`: the three-layer case; one Escape and three
  `dismissTopLayer` calls run only the inner handler.
- `behaviour/dialog.test.tsx`: `NestedMenuLayers` and one native case —
  submenu → menu → dialog, one Escape closes only the submenu, the next closes
  the menu and keeps the dialog. The suite is 21 tests.
- `internal/interaction.ts`: a shared `nextTask()` helper. The non-consuming
  claim makes two identical gestures in one test task the same event, so the
  suites that send two Escapes (dialog, chat, combobox, hotkey recorder, inline
  edit, mention input, search input) and the submenu arrow case cross a task
  between the real gestures, with a comment — plan 587's rule.
- Both-direction proof: on the old consuming body, `stays claimed for every
  reader` fails (`expected true to be false`), `keeps one event to one layer with
  three layers nested` fails, and the native case fails with the menu gone after
  the first Escape. Restoring the new body makes all three pass.
- Unit suite: 46 files / 473 tests, exit `0` (was 46 / 472). Native suite: 31
  failed / 832 passed of 863 — exactly the recorded plan-540 binding failures,
  plus the new passing case.
- Docs and inventory synced: `docs/component-api.md` §4,
  `packages/components/docs/dialog.mdx`, the `COMPONENTS.md` Dialogs row,
  `TODO.md`, `PLAN.md` D30 and the plan index.

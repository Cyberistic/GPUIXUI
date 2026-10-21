# Plan 839 — A dismissed alert hands the keyboard on

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 111, 112, 117, 158, 386, 516, 675, 680, 719, 728, 730, 769, 788, 832 |
| Status | done — 3 native cases + 1 pin; `focusNext()` needs no `contentId` branch (see §7) |
| Claimed number | `839` — `838` is this workstream's last plan; `833`–`836` are taken by `tokens-theme` and the `playground` (checked in every worktree on 2026-10-21) |

## 0. Why this plan exists — the measured defect

`Alert` is the one component whose **whole container** can be removed by one of its
own controls. `AlertDismiss` runs the app's `onDismiss`, the app stops rendering
the alert, and the focused control vanishes with it — leaving the native focused
host on **nothing**. Inside a modal that is worse than a lost place: with no
focused element the surface's key handler never runs, so the user cannot even
`Tab` back into the dialog.

Measured in this worktree on 2026-10-21 at `HEAD` `13ac34f3` with the in-flight
probe (`src/behaviour/zz-probe2.test.tsx`, deleted after the measurement), through
real keys in the real renderer:

```text
dialog: [alert with dismiss] then "After"
  focus alert-dismiss, Enter
  → alert gone, focused host None
  → Tab                         focused host still None   // the trap never runs

dialog: [Before] then [alert with dismiss] as the last control
  focus last-dismiss, focusNext() → dialog-close            // the surface wraps
  Enter on last-dismiss         → dialog-close               // (same, by luck)
```

Two measured facts shape the fix:

1. `focusNext()` from a control inside a modal stays inside that modal: the
   implementation fixture puts an `Outside` control after the dialog and the
   dialog's **last** control still wraps to `dialog-close`, not to `Outside`. The
   probe that suggested it could escape had the dialog as the window's only
   content; re-measured with a competing control, no `focusNextWithin` branch is
   needed (the shipped code keeps the single call).
2. An overlay's content publishes its surface id through the plan-730 host, so a
   child part can read it: `useOverlayHost().contentId` is the enclosing
   `Dialog`/`Drawer`/`ConfirmDialog` surface. Outside every overlay it is
   `undefined`. The implementation did not need it; see §7.

The same probe measured two shapes that already work and become pins elsewhere:
a toast action that opens a **drawer** or a **confirmation dialog** returns focus
to the raising control (the plan-830 rule through `useModalFocus`).

## 1. The rule

**A control that removes its own container hands the keyboard to the next control
in the enclosing surface — or the window, outside one — before the container
leaves.**

- Only when the control itself holds native focus, so a programmatic dismissal (a
  timer, a keyboard shortcut elsewhere) never steals the keyboard; the plan-769
  rule "a value change the app made never moves focus" is the same principle.
- The hand-off uses the renderer's `focusNext()`. Measured in the shipped
  fixture, it stays inside the active modal (a control after the dialog is not
  reached from the dialog's last control), so one call serves both the modal and
  the page; a `contentId` branch would have been dead code.
- `AlertDismiss` does this, because it is the only part whose action can unmount
  its own root. The alert's other parts are not focusable, so the next stop is
  outside the alert in every composed layout; a caller that adds a focusable child
  after the dismiss control still gets the surface's next stop (documented).
- If the app **keeps** the alert, focus has still moved to the next control: the
  control said "dismiss", and a keyboard user should not be left on a control that
  may disappear. Documented rather than hidden.

## 2. Exact files to change

1. `packages/components/src/alert.tsx` — the hand-off in `AlertDismiss`.
2. `packages/components/src/behaviour/alert.test.tsx` — three native cases.
3. `packages/components/docs/alert.mdx` — the keyboard rule, the honest
   "caller keeps the alert" consequence, and the native test count (18 → 22).
4. `docs/component-api.md` §5 — the self-removing control rule extended to a
   container.
5. `COMPONENTS.md` — the Alert row (behaviour text and count).
6. `TODO.md` — add and tick the task under Tier 2 hardening.
7. `.agents/slop/plans/README.md` — the index row for `839`.
8. `PLAN.md` D30 — record `839`.

No shared helper changes: `focusNext`/`focusNextWithin` and the overlay host
already exist.

## 3. Implementation

### 3.1 `src/alert.tsx` (shipped)

```ts
export const AlertDismiss = ({
  onDismiss,
  label = "Dismiss",
  testId = "alert-dismiss",
  onClick,
  ref,
  ...rest
}: AlertDismissProps) => {
  const { foreground } = useAlert();
  const renderer = useGpuix().renderer;
  const control = useRef<PublicInstance | null>(null);
  const attach = useMergedRef(control, ref);

  return (
    <IconButton
      {...rest}
      ref={attach}
      size="sm"
      label={label}
      testId={testId}
      onClick={(event) => {
        onClick?.(event);
        // This control leaves with its alert, so hand the keyboard to the next
        // stop while it still exists: the renderer keeps the traversal inside the
        // active surface, measured in a modal and on the page (plan 839).
        if (
          control.current !== null &&
          renderer?.getFocusedElementId?.() === control.current.id
        ) {
          renderer?.focusNext?.();
        }
        onDismiss();
      }}
    >
      <Icon name="x" color={foreground} size="sm" />
    </IconButton>
  );
};
```

`AlertDismissProps` already extends `Props`, so `ref` is a typed prop; the merge
keeps the plan-128 contract (a caller's ref still reaches the host). The plan's
`useOverlayHost`/`focusNextWithin` branch was not needed — see §0 fact 1 and §7.

### 3.2 Tests — `src/behaviour/alert.test.tsx`

- **inside a modal, the keyboard continues after the alert**: `Dialog open` with
  `[Alert + AlertDismiss testId="alert-dismiss"]` then `Button testId="after"`;
  focus the dismiss control, `Enter` → the alert is gone, focused host is
  `after-alert`, and one more `Tab` moves focus again (not `None`).
- **the last control wraps within its surface**: dialog with only the alert;
  focus and press the dismiss control → the alert is gone and the focused host is
  a control of the same dialog (`dialog-close`).
- **outside an overlay the window's next control takes it**: alert then `Button`;
  press the dismiss control from the keyboard → `after-alert`.
- Pin: **an app-driven removal does not move focus**: a separate "Dismiss all"
  button hides the alert without pressing its control; focus stays on that button
  and the alert is gone. This pins the rule's scope — the hand-off runs on the
  control's own activation, not on every unmount (a layout-effect design would
  fail it). The "control holds focus" gate itself is hygiene like plan 832's
  pending-request gate: a real press focuses the control before its handler, so
  no test can distinguish the gate from its absence, and none claims to.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components/packages/components`.

1. Add the three cases and the pin, restore the old `alert.tsx`, and measure:
   `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/alert.test.tsx`
   → **expected:** the three hand-off cases fail (`None` or the wrong host); the
   pin passes. Record the output in §7.
2. Apply §3.1 → Alert **22/22**.
3. **Both directions**, restoring after each:
   - drop the hand-off → the three cases fail (measured: 3 failed / 19 passed);
   - move the hand-off into an unmount layout effect instead of the activation →
     the pin fails (measured: 4 failed / 18 passed, the pin among them);
   - a `focusNextWithin` branch was dropped as unnecessary: the modal fixture
     carries a control after the dialog and the wrap still lands on
     `dialog-close`.
4. Touched suites:
   `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/{alert,form,multi-step-form,chat,dialog,confirm-dialog,drawer}.test.tsx`
   → **measured:** 119 passed / 1 failed; the failure is the recorded plan-540
   box-convention case in `drawer.test.tsx` (a 400 px drawer reports 398), which
   does not import `Alert`.
5. `nub x vitest run` → **measured:** 532 in 49 files, unchanged.
6. From the repo root: `nub run check`, `nub run lint`, `nub run test` → all exit
   0.
7. Scoped smoke `--only overlay-dialog` and `--only modal-focus-trap` → green.
8. End of task: the full native suite → the recorded 20 plan-540 failures, no new
   one; the full headless suite 17/20 with the three recorded binding failures.

**STOP conditions.** Stop and report instead of improvising if:

- a hand-off case passes at `HEAD` — the measurement is wrong; re-run the probe
  first;
- the enclosing surface's `contentId` is not published to the alert (focus lands
  outside the modal) — record what `useOverlayHost()` reports and stop; do not
  reach into Dialog internals;
- the pointer path leaves focus on the control after mouse-up in a way that makes
  the pin flaky — record it and drop the pin rather than weaken the gate;
- a Form/MultiStep/Chat alert case changes, because their banners are not
  dismissible and must be untouched.

## 5. Test plan — what each case can catch

| Case | Guards |
| --- | --- |
| modal: the keyboard continues after the alert | the measured stranded modal |
| modal: the last control wraps inside the surface | `focusNext` escaping the trap |
| outside: the window's next control takes it | the no-overlay path |
| pin: an app-driven removal does not move focus | the hand-off running on activation, not on unmount |
| Alert 18 existing cases + Form/MultiStep/Chat | the parts, the name and the tone rules |
| unit suite | no helper changed; nothing to drift |

## 6. Acceptance criteria

- The three hand-off cases fail at `HEAD` and pass after; the pin passes in both
  directions and its mutation (no gate) fails it.
- `check`, `lint`, `test` exit 0; the full native suite keeps only the recorded
  plan-540 failures; unit stays 532 in 49 files; scoped smoke ids green.
- `docs/alert.mdx`, `docs/component-api.md` §5, `COMPONENTS.md`, `TODO.md`, the
  plan index and `PLAN.md` D30 state the rule and its honest consequence (a caller
  that keeps the alert still sees focus move on).
- The probe file is deleted.

## 7. Outcome

Implemented 2026-10-21 in this worktree on `agent/components`.

**What shipped.** `AlertDismiss` records its host through `useMergedRef` (the
caller's `ref` still reaches it), and on activation — while the control itself
holds native focus — calls the renderer's `focusNext()` before `onDismiss()`. One
call covers both the modal and the page: the re-measured `focusNext()` stays
inside the active modal, so the planned `useOverlayHost().contentId` +
`focusNextWithin` branch was not needed and the two facts in §0 were corrected.

**Measurements.**

| Run | Result |
| --- | --- |
| Alert suite at `HEAD` `13ac34f3` (fix reverted, cases kept) | 3 failed / 19 passed — the three hand-off cases land on `Option.none()`, the pin passes |
| Alert suite with the fix | **22/22** |
| Mutation: hand-off moved to an unmount layout effect | 4 failed / 18 passed — the pin lands on `None` |
| Touched suites (`alert`, `form`, `multi-step-form`, `chat`, `dialog`, `confirm-dialog`, `drawer`) | 119 passed / 1 failed — `drawer.test.tsx:292` reports `398` for a 400 px drawer, the recorded plan-540 box-convention case (Drawer does not import Alert) |
| Unit suite (`nub x vitest run`) | 532 passed in 49 files |
| Full native behaviour suite | **1074 passed / 20 failed of 1094** — the same 20 recorded plan-540 classes as the plan-838 baseline (1068/20 of 1088 + the two plan-838 cases + these four); Alert 22/22 |
| `nub run check` / `nub run lint` / `nub run test` | exit 0 each |
| Scoped smoke `--only overlay-dialog` / `--only modal-focus-trap` | green (1/1 each) |
| Full headless suite (registry run while listing ids) | 17/20 — the three recorded binding failures unchanged |

The probe file (`src/behaviour/zz-probe2.test.tsx`) was deleted before the fix
landed; nothing named `zz-*` remains in `src/behaviour/`.

**Docs updated.** `packages/components/docs/alert.mdx` (keyboard rule, the
"caller keeps the alert" consequence, 18 → 22 tests), `docs/component-api.md` §5
(the rule extended from a control to a whole container), `COMPONENTS.md` (the
Alerts row), `TODO.md`, the plan index and `PLAN.md` D30 (next overflow number
`840`).


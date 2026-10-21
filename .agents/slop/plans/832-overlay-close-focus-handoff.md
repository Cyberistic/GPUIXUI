# Plan 832 — A surface that closes under the user hands the keyboard on

| | |
| --- | --- |
| Phase | F (Tier 2 hardening / composite integration) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 113, 114, 116, 117, 386, 521, 583, 704, 708, 808, 816, 826, 827, 830 |
| Status | planned — measured defect, fix and tests specified below |
| Claimed number | `832` — `830` is this workstream's last plan, `831` is tokens-theme and `829` is the playground; every `832`–`839` is free across every worktree and `main` on 2026-10-21 |

## 0. Why this plan exists — the measured defect

Plans 826, 827 and 830 taught every **surface that closes on its own control**
to name its trigger as that control's *focus successor*: a menu row, a closing
modal and a toast action each open a modal that captures a control which is
about to vanish. Popover, Navigation menu and Combobox never learned it, and a
Popover additionally strands the keyboard even with **no modal at all**.

Measured in this worktree on 2026-10-21 with the in-flight probe
(`src/behaviour/zz-probe.test.tsx`, deleted after the measurement), against
`HEAD` `a9f478d3`, through real presses and Escape:

```text
popover, app closes it from a control, no modal
   press "advanced"  → panel false, focused host None        // stranded
popover, app closes it from a control, dialog opens in the same commit
   press "advanced"  → dialog true, Escape → dialog false, focused None
popover, app leaves it open, dialog opens from a control
   press "advanced"  → dialog true, Escape → focused "advanced"   // already correct
navigation menu link, dialog opens in onSelect
   press "nav-advanced" → dialog true, Escape → focused None
combobox option, dialog opens in onValueChange
   press "combobox-option-owner" → dialog true, Escape → focused None
```

Four measured facts shape the fix:

1. **A control inside a closing surface is still focused at the closing
   render.** The dialog in the same commit captures it as its opener (the
   plan-638 capture), and the surface's effects run *after* the commit removed
   it, so by then `getFocusedElementId()` no longer names it (plan 708: a
   removed host cannot be read). The id must be read on the closing render.
2. **Box containment is the only focus-within signal** 0.10.0 gives (plan 386,
   `internal/reveal.tsx`). The plan-540 box conventions do not apply to a
   point-in-box test.
3. **The popover keeps an exit ghost**, so its own control is still painted
   (and still focused) when the close's effects run — but an app-driven close
   has no requested restore, so nothing moves focus off it and it is lost when
   the ghost unmounts.
4. **A close that already decided where focus goes must not be overridden.** An
   Escape, a `Tab` walk and an outside press each move focus themselves; only a
   close the surface did not request (the app set `open` false) needs the
   hand-off.

## 1. The rule

**A non-modal surface that closes while one of its own controls holds focus
names its trigger as that control's focus successor, and — only when the close
was not requested by the surface itself — hands the trigger the keyboard.**

- The leaving control is captured **on the closing render**, before the commit
  removes its host (§0 fact 1), by the shared box test.
- The mark goes through `internal/focus-successor.ts`, the channel plans
  826/827/830 already use, so a modal that captured the control at the same
  commit restores to the trigger instead of to nothing. No modal change.
- The keyboard hand-off happens only when the surface did **not** request the
  close (`useCloseFocus` has no pending request; the combobox has no
  `restoreFocus` flag). Escape, `Tab`, an outside press and a selection keep
  their own rules, so plan 521's Tab walk and plan 583's trigger press are
  untouched.
- The hand-off moves focus only when the control is gone (`null`) or is still
  the one inside the surface; a close where the app (or a modal opened in the
  same commit) already focused something else is left alone.
- **Preview card is mark-only.** Its trigger re-opens the card on focus (plan
  515), so handing it the keyboard would revive the card the user just closed;
  a modal that captured a card control still restores there. Recorded in
  `docs/preview-card.mdx` and `COMPONENTS.md`, not invented as working.
- An app that unmounts the whole surface (rather than setting `open` false) is
  out of scope: the closing render never happens, so there is nothing to
  capture. Recorded as a limitation in `docs/component-api.md` §5.

## 2. Exact files to change

1. `packages/components/src/internal/pointer.ts` — add `focusedWithin`.
2. `packages/components/src/internal/close-focus.ts` — `useLeavingControl`,
   `handOffClose`, and the `CloseHandOff` options on `useCloseFocus`.
3. `packages/components/src/internal/reveal.tsx` — delete its local
   `focusedInside`, use `focusedWithin` (one rule, one place).
4. `packages/components/src/popover.tsx` — pass the hand-off (focus on).
5. `packages/components/src/navigation-menu.tsx` — pass the hand-off (focus on).
6. `packages/components/src/notification-centre.tsx` — pass the hand-off (focus
   on; its panel ref must be hoisted into the root §3.4).
7. `packages/components/src/preview-card.tsx` — pass the hand-off with
   `focus: false`; hoist the panel ref (§3.4).
8. `packages/components/src/context-menu.tsx` — pass the hand-off with
   `focus: false` (its close is always requested).
9. `packages/components/src/combobox.tsx` — capture, mark and hand off in its
   own close effect (§3.5).
10. `packages/components/src/behaviour/composition.test.tsx` — three composite
    cases and one pin (§3.6).
11. `packages/components/src/behaviour/popover.test.tsx` — the no-modal
    hand-off case (§3.6).
12. `packages/components/docs/{popover,navigation-menu,combobox,preview-card}.mdx`
    — the close-focus paragraph.
13. `docs/component-api.md` §5 — the captured-leaving-control rule and the
    unmount limitation.
14. `COMPONENTS.md` — the four rows.
15. `TODO.md` — add and tick the task under Tier 2 hardening.
16. `.agents/slop/plans/README.md` — the index row for `832`.
17. `PLAN.md` D30 — record `832` and the rule.

`internal/modal.ts`, `internal/dismiss-layer.ts`, `internal/focus-successor.ts`
and the toast stack are **not** changed: the successor channel and the capture
already exist.

## 3. Implementation

### 3.1 `src/internal/pointer.ts`

```ts
/**
 * The focused host when its centre lies inside native element `id`.
 *
 * A surface cannot ask 0.10.0 "is focus inside me?" (no focus-within signal),
 * so the box test plan 386 established is the signal: a control whose centre is
 * inside a surface leaves with it. `None` when nothing is focused, because a
 * removed host cannot be read (plan 708), and when either box is missing.
 */
export const focusedWithin = (
  renderer: NativeRenderer | null,
  id: number | null | undefined,
): Option.Option<number> =>
  Option.all({
    surface: Option.flatMap(Option.fromNullishOr(id), (target) =>
      Option.fromNullishOr(renderer?.getElementBounds?.(target)),
    ),
    focused: Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null),
  }).pipe(
    Option.flatMap(({ focused, surface }) =>
      Option.map(
        Option.fromNullishOr(renderer?.getElementBounds?.(focused)),
        (control) => ({ control, focused, surface }),
      ),
    ),
    Option.filter(({ control, surface }) => {
      const x = control.x + control.width / 2;
      const y = control.y + control.height / 2;
      return (
        x >= surface.x &&
        x <= surface.x + surface.width &&
        y >= surface.y &&
        y <= surface.y + surface.height
      );
    }),
    Option.map(({ focused }) => focused),
  );
```

(`Option.filter`/`Option.map` keep it Effect-native; no native array helpers.)

### 3.2 `src/internal/close-focus.ts`

Keep `useCloseFocus`'s public shape but take an options object, so no caller can
forget the rule:

```ts
/** Where a surface's keyboard goes when it closes. */
export interface CloseHandOff {
  /** The surface the close takes away; its box names the leaving control. */
  readonly surface: RefObject<PublicInstance | null>;
  /** The trigger's host id, or `null` when it is gone. */
  readonly target: () => number | null;
  /** Hand the trigger the keyboard when an app-driven close removed its control. */
  readonly focus: boolean;
}

/**
 * The control this close is taking away, captured on the closing render.
 *
 * Effects run after the commit removed the control, so its host cannot be read
 * then (plan 708); the closing render still reports the previous commit's tree,
 * which is the only moment the id and its box both exist. A ref written during
 * render is the same measured exception `NavigationMenu` already makes for its
 * open mirror.
 */
export const useLeavingControl = (
  open: boolean,
  surface: RefObject<PublicInstance | null>,
): Option.Option<number> => {
  const renderer = useGpuix().renderer;
  const leaving = useRef(Option.none<number>());
  const wasOpen = useRef(open);
  if (open) {
    leaving.current = Option.none();
  } else if (wasOpen.current) {
    leaving.current = focusedWithin(renderer, surface.current?.id);
  }
  wasOpen.current = open;
  return leaving.current;
};

/**
 * Name `target` as the successor of the control the close takes away, and hand
 * it the keyboard when the close left nothing else focused.
 *
 * A close that moved focus itself (a Tab walk, an outside press, a modal opened
 * from the control) is left alone: `focus` is the caller's decision and the
 * containment test is the guard.
 */
export const handOffClose = (
  renderer: NativeRenderer | null,
  leaving: Option.Option<number>,
  surface: RefObject<PublicInstance | null>,
  targetId: number | null,
  focus: boolean,
): void => {
  if (targetId === null || renderer?.getElementBounds?.(targetId) === null) {
    return;
  }
  Option.match(leaving, {
    onNone: () => undefined,
    onSome: (control) => {
      markFocusSuccessor(control, targetId);
      if (!focus) return;
      const focused = renderer?.getFocusedElementId?.() ?? null;
      const taken =
        focused === null ||
        focused === control ||
        Option.isSome(focusedWithin(renderer, surface.current?.id));
      if (taken) renderer?.focusElement?.(targetId);
    },
  });
};
```

`useCloseFocus({ open, close, restore, handOff })`: the existing transition
effect gains, before the pending restore,

```ts
  handOffClose(renderer, leaving, handOff.surface, handOff.target(),
    handOff.focus && pending.current === undefined);
```

so a requested close still restores through its own callback exactly once.

### 3.3 `src/internal/reveal.tsx`

Delete `focusedInside` and use `focusedWithin(renderer, bodyId)` with
`Option.isSome`. No behaviour change; one box test in the codebase.

### 3.4 Root wiring

- **Popover**: `useCloseFocus({ open, close: () => setOpen(false), restore, handOff: { surface, target: () => trigger.current?.id ?? null, focus: true } })`.
- **Navigation menu**: same, `target: () => triggers.current.get(value)?.id ?? null`
  for the open item. Add a small `target` callback that resolves the open item's
  trigger through the existing `triggers` map.
- **Notification centre**: hoist the content's `surface` ref into the root and
  publish it through the context (`surface: RefObject<PublicInstance | null>`);
  the content uses the root's ref in its dismiss layer and `ownsRowKeys`. Then
  pass `handOff` with `focus: true`.
- **Preview card**: hoist `surface` the same way, pass `focus: false`.
- **Context menu**: `{ surface, target: () => triggerId.current ?? null, focus: false }`.

### 3.5 `src/combobox.tsx`

`surface` and `trigger` already exist on the root. Add
`const leaving = useLeavingControl(visibleOpen, surface);` and, inside the
existing close effect (before the focus movement):

```ts
handOffClose(renderer, leaving, surface, trigger.current?.id ?? null,
  restoreFocus.current === false && leave.current === null);
```

so a selection (which sets `restoreFocus`) and a `Tab` leave keep their own
focus rule, while an app-driven close hands the trigger the keyboard.

### 3.6 Tests

`src/behaviour/composition.test.tsx` — one fixture per surface, mirroring the
probe:

- `DialogFromPopover` (app closes the popover and opens the dialog in one
  handler) → Escape → `Some("filter-trigger")`.
- `DialogFromNav` (`NavigationMenuLink onSelect` opens the dialog) → Escape →
  `Some("trigger-platform")`.
- `DialogFromCombobox` (`onValueChange` opens the dialog) → Escape →
  `Some("role-trigger")`.
- Pin: `DialogFromPopover` with `close={false}` → Escape → `Some("advanced")`
  (the surface that stays open keeps the control; measured passing today).

`src/behaviour/popover.test.tsx` — no modal:

- a control whose press closes the popover hands focus to the trigger;
- pin: an outside press on the next control still leaves focus on that control
  (the existing outside-press case already pins the layer; this one pins that
  the hand-off is not a focus thief).

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components/packages/components`.

1. Add the two popover cases and the three composite cases first, restore the
   old sources, and measure the red:
   `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/composition.test.tsx src/behaviour/popover.test.tsx`
   → **expected:** the three composite cases and the no-modal popover case fail
   (`None` instead of the trigger); the two pins pass. Record the exact output
   in §7.
2. Apply §3.1–§3.5 → the same two files are green (composition 18/18, Popover
   34/34 unless a plan-540 placement case moves).
3. **Both directions**, restoring after each:
   - remove the `markFocusSuccessor` call → the three composite cases fail;
   - remove the focus hand-off → the no-modal popover case fails;
   - capture with `focusedWithin(renderer, null)` (no surface) → every new
     case fails, proving the box test is the capture;
   - hand off on a *requested* close too (`focus: true` without the pending
     guard) → the Tab-walk and outside-press pins in `popover.test.tsx` fail.
4. The touched suites:
   `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/{composition,popover,navigation-menu,combobox,preview-card,notification-centre,context-menu,dialog,confirm-dialog,tabs,collapsible}.test.tsx`
   → every case green except the recorded plan-540 classes; no new failure.
5. `nub x vitest run` → the unit suite unchanged except one `pointer`/`reveal`
   case if one is added (target: 49 files, 528+ tests).
6. From the repo root: `nub run check`, `nub run lint`, `nub run test` →
   **all exit 0**.
7. Scoped smoke: `nub apps/playground/dist/smoke/run.js --only overlay-dialog`
   and `--only modal-focus-trap` → **green**.
8. End-of-task (this touches the shared close/pointer helpers): the full
   headless suite `nub apps/playground/dist/smoke/run.js` → **17/20**, the same
   three recorded binding failures (`focus-traversal`, `floating-placement`,
   `shell-navigation`).

**STOP conditions.** Stop and report instead of improvising if:

- the closing render does **not** report the leaving control (capture is
  `None` for every case) — then the render-time read is wrong on this binding;
  record what it reports and stop, rather than sampling on a timer;
- a new case passes at `HEAD` — the measurement is wrong; rerun the probe
  against a clean tree before changing anything;
- any plan-521 Tab case, plan-583 trigger-press case or plan-704 refused-close
  case changes, because a requested close must keep its own focus rule;
- the preview card hand-off (`focus: false`) is changed to focus the trigger,
  because the card's trigger re-opens it (plan 515) — that is a regression, not
  a fix;
- hoisting a panel ref makes the notification centre's `ownsRowKeys` read the
  wrong host, or changes the preview card's placement — then keep the
  content-local ref and pass the id through a callback instead of a ref.

## 5. Test plan — what each case can catch

| Case | Guards |
| --- | --- |
| composition: popover's dialog returns to `filter-trigger` | the mark for an app-closed popover |
| composition: nav link's dialog returns to `trigger-platform` | the mark for a chosen link |
| composition: combobox option's dialog returns to `role-trigger` | the mark for a selection |
| composition pin: an open popover returns to `advanced` | that the surface which stays open keeps the control |
| popover: a control that closes the panel hands focus to the trigger | the no-modal hand-off |
| popover pin: an outside press leaves focus on the pressed control | the hand-off being gated |
| mutation: no mark | the successor being the whole composite fix |
| mutation: no hand-off | the popover's stranded keyboard |
| mutation: no surface box | the capture using containment, not "any focus" |
| mutation: hand off on requested closes | plan 521/583/704 being untouched |
| popover, nav, combobox, preview card, notification centre, context menu suites | no other close rule moved |
| unit suite | `reveal` and `pointer` still behave (the extraction) |

## 6. Acceptance criteria

- The four new focus cases fail at `HEAD` with `None` and pass after; the two
  pins pass in both directions; each mutation in §4.3 fails its case.
- `check`, `lint`, `test` exit 0; the touched behaviour suites are green apart
  from the recorded plan-540 classes, with no new failure.
- The four docs pages, `docs/component-api.md` §5, `COMPONENTS.md`, `TODO.md`,
  the plan index and `PLAN.md` D30 state the rule and its two limits: a preview
  card is mark-only, and an unmounted surface cannot capture.
- Scoped smoke ids are green and recorded; the full headless suite is 17/20 with
  only the three recorded binding failures.

## 7. Outcome (2026-10-21)

- **Measured at `HEAD` `a9f478d3`** with the scratch probe (deleted): a popover
  closed by its own control left the focused host on `None` **with no modal at
  all**, and a popover control, a navigation link and a combobox option that
  opened a `Dialog` each left `None` after Escape. The popover that stayed open
  kept the control (the pin), so the defect is the close, not the modal.
- **Red before the fix.** With the four source files reverted and only the tests
  kept: composition **3 failed** (`popover's trigger`, `nav trigger`,
  `combobox trigger` — all `None`) and popover **1 failed** (`hands focus to the
  trigger when a control inside closes the panel`, `None`), 43 passed / 7 failed
  of 50 across the two files including the three pre-existing plan-540 position
  cases. The two pins (panel stays open; outside press keeps its control) passed
  at `HEAD`, which is what makes them pins rather than fixes.
- **After the fix.** Composition **19/19**, Popover **32/32** except its three
  recorded plan-540 position cases (29/32 on this host); the preview card
  composite case was added last and is the fourth mark-dependent case.
- **Both directions proven.** Removing `markFocusSuccessor` fails the four
  composite cases (`popover`, `nav`, `combobox`, `preview card`) and leaves the
  popover hand-off case green; removing the hand-off (`focus: false` at the
  effect) fails only that popover case; capturing with no surface box fails all
  four new cases. **The pending-request gate is hygiene, not separately
  observable**: handing off on requested closes too still leaves every pin green
  (the restore that follows moves focus to the same place), so no test claims it.
- **Full native suite.** **1062 passed / 20 failed of 1082** — the 20 recorded
  plan-540 classes (position, native focus signals and the command-menu scroll),
  diffed against the pre-change run's list; no new failure. Composition 19,
  Popover 32, Toast 28, Dialog 21, Confirmation 13, Navigation menu 34,
  Combobox 70, Preview card 21, Notification centre 33, Context menu 25.
- **Gates.** `nub run check`, `nub run lint`, `nub run test` exit 0; unit
  **528 tests in 49 files** (unchanged — the fix is proven natively).
- **Scoped smoke.** `overlay-dialog` 1/1 and `modal-focus-trap` 1/1 green; the
  full headless suite is **17/20** with the same three recorded playground
  failures (`focus-traversal`, `floating-placement`, `shell-navigation`).
- Docs (`popover`, `navigation-menu`, `combobox`, `preview-card`),
  `docs/component-api.md` §5, `COMPONENTS.md` (four rows and the Popover native
  count), `TODO.md`, the plan index and `PLAN.md` D30 synced.

### Deviations from §3

- The panel ref was **hoisted into the root and published through the context**
  for `Popover`, `PreviewCard` and `NotificationCentre`, as §3.4 allowed: the
  capture must measure the surface at the root's closing render, and the
  content-local ref was not readable there.
- `NavigationMenu` already owned its panel ref in the root, so no hoist was
  needed; a `lastOpen` mirror names the closing item's trigger (the open state is
  already `null` on the closing render).
- The Preview card case found the mark path works while the card's own hand-off
  stays off, which is the behaviour §1 documents and the reason its trigger is
  not focused (plan 515).


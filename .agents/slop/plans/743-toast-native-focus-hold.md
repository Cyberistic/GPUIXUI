# 743 — A toast's keyboard hold follows native focus, and its tests read the queue

**Phase:** F (integration and polish, Tier 2 hardening)
**Owner:** `components` workstream (`packages/components`)
**Depends on:** 110, 115, 117, 123, 124, 183, 200, 201, 326, 327, 522, 525, 592,
597, 606, 613, 659, 672, 680, 738
**Number:** `743` is the first free number across every worktree — `739` is the
playground (`promotion-gate-with-shadow-pixels`), `740` and `741` are primitives
and components, and tokens-theme claimed `742` (`PLAN.md` D30).

**Status: done** (2026-10-20) — Toast 24/24 in the real renderer; the four hold
cases fail at `HEAD` (`0:none` three times and `285` against `342` on the
progress bar) and pass after; `check`, `lint` and `test` exit `0` (unit 488 in 46
files).

---

## 1. The defect

`docs/toast.mdx` → **Accessibility and limitations** promises:

> Hovering a card pauses its clock, and so does keyboard focus on either of its
> controls; the clock resumes with the remaining time once both the pointer and
> focus have left.

Plan 124 implemented the focus reason with React `onFocus`/`onBlur` on the two
controls. Measured on this host (2026-10-20) with the real `TestRenderer` and a
throwaway `src/behaviour/zz-probe.test.tsx` (deleted before this plan landed):

| step (toast `1`, `defaultDuration` 600 ms) | queue / timer | verdict |
| ------------------------------------------ | ------------- | ------- |
| `focusElement(toast-dismiss)` then 900 ms | `0 / none` | **defect** — the toast expired under native focus |
| `hoverCentreOf("toast-1")` then 900 ms | `1 / paused` | correct (hover works) |
| `getFocusedElementId()` after the focus  | `17` = the dismiss control's host id | the signal exists |

The cause is measured twice over:

1. `renderer.focusElement` and `renderer.focusNext` deliver **no React
   `focus`/`blur`** on this host (probe: a `div role="button"` with both handlers
   logged nothing for either call). Plans 536/540/646 recorded the same missing
   signal; plans 659/672 answered it with `internal/native-focus.ts`'s
   `useNativeFocusId` sample for `SearchInput` and the combobox trigger.
2. `getElementBounds`/focus aside, the runtime **does** report the focused host
   through `getFocusedElementId()`, so the sample can hold the clock correctly.

So the shipped promise is false for the only keyboard path a user has: tab to a
toast's action or dismiss control and the card — and the focus with it — is
removed mid-read. WCAG 2.2.1 (timing adjustable) is the reason plan 124 exists.

**The tests cannot see it.** Since plan 525 added the 500 ms exit motion, a card
that expired at 600 ms is still *painted* at 900 ms (the exit ghost, plan 597),
so the three focus-hold cases assert `findByTestId("toast-1")` and pass whether
the clock held or not. They were honest when they landed (no motion then), and
have been vacuous since. This is the "a test has to be able to fail" floor: the
strongest honest signal is the **queue**, not the paint.

## 2. The rule and the fix

**Rule.** A card's auto-dismiss clock is held while any of the following is
true, and released only when all are false:

- the pointer rests on the card or one of its member controls (`self` + the
  shared hover group, plan 606/738);
- the host that holds **native** focus (`getFocusedElementId`) is one of the
  card's own controls.

The focus reason is sampled, not derived from React's events, because this
runtime never sends them for a focus change. The card owns at most two focusable
controls (the action and the dismiss), so it registers their host ids and
compares them with the sampled id. No polling of element trees, no timers per
control, one interval per card bounded by the queue's `max` (3).

**One rule, not two.** The React `onFocus`/`onBlur` counting is removed: on this
host it never fires, and keeping it would leave two competing definitions of
"focused" (and a member count that leaks if a focused control unmounts without a
`blur`). The sample is the single focus reason; the hover group stays the
pointer reason.

### 2.1 `packages/components/src/toast/viewport.tsx`

1. Import `useNativeFocusId` from `../internal/native-focus.js` and
   `PublicInstance` from `@gpuix/react` (type-only).
2. In `ToastCard`, replace the `focus` count with a native signal:

   ```ts
   const [actionHost, setActionHost] = useState<number | null>(null);
   const [dismissHost, setDismissHost] = useState<number | null>(null);
   const focusedHost = useNativeFocusId(true);
   const focusHeld =
     focusedHost !== null &&
     (focusedHost === actionHost || focusedHost === dismissHost);
   ```

3. `held.current` becomes `{ self, members, focus, paused }` where `focus` is the
   boolean above; `syncHold` computes `self || members > 0 || focus`.
4. Add one effect beside the hover group:

   ```ts
   useEffect(() => {
     held.current.focus = focusHeld;
     syncHold();
   }, [focusHeld, syncHold]);
   ```

5. Remove `setFocus` and the `onFocus`/`onBlur` props from the action `Button`
   and the dismiss `IconButton`. Attach the two host ids instead, through stable
   callbacks so the merged ref does not churn:

   ```ts
   const attachAction = useCallback(
     (instance: PublicInstance | null) => setActionHost(instance?.id ?? null),
     [],
   );
   const attachDismiss = useCallback(
     (instance: PublicInstance | null) => setDismissHost(instance?.id ?? null),
     [],
   );
   ```

   and pass `ref={attachAction}` / `ref={attachDismiss}`. `internal/button.tsx`'s
   `useMergedRef` composes them with its own registration (plan 128/696), so the
   control keeps working.

Do **not** touch `src/toast/store.ts` (pause/resume are already idempotent) and
do **not** change the hover group.

### 2.2 What must not change

- Hover holding the clock, including a control's own crossing through the hover
  group (plan 738); the pointer reason is unchanged.
- The progress bar's freeze/resume (plan 592), the 500 ms enter/exit motion, the
  exit ghost being inert, the queue bound, ids, the action's run-once-and-dismiss,
  and the viewport's corner rules.
- A control that never takes focus (none today) must not hold anything: the ids
  start `null` and the comparison is `!== null`-guarded.

## 3. Test plan

File: `packages/components/src/behaviour/toast.test.tsx` (real GPUix renderer,
real time). Add a queue probe to the suite so a hold can never be read off the
exit ghost:

```tsx
/** Toast 1's queue length and hold, so a hold test cannot pass on the exit ghost. */
const Queue = () => {
  const toast = useToast();
  const held = Option.match(toast.timingFor("1"), {
    onNone: () => "none",
    onSome: (timing) => (timing.paused ? "held" : "running"),
  });
  return <text testId="queue-state">{`${toast.toasts.length}:${held}`}</text>;
};
```

Render it after `<ToastViewport />` inside the existing `Harness` (all
`getAllText` assertions use `toContain`, so the extra node is safe; the viewport
is absolutely positioned, so the layout is not affected). Add one helper:

```ts
const queueState = (root: ComponentTestRoot): string =>
  root.renderer
    .getAllText()
    .find((text) => /^\d+:(held|running|none)$/.test(text)) ?? "?";
```

1. **Strengthen** `pauses auto-dismiss while keyboard focus is on the dismiss
   control`: after `focusElement(dismiss)` and 900 ms, assert
   `queueState(page) === "1:held"` instead of only `toBeDefined()`. The second
   half (focus elsewhere, 900 ms, `finishExit`, gone) stays, plus
   `queueState(page) === "0:none"`.
2. **Strengthen** `keeps the hold when the pointer leaves while focus stays
   inside`: after the pointer leaves, assert `"1:held"`; after focus leaves and
   the wait, `"0:none"` and the card gone.
3. **Strengthen** `pauses auto-dismiss while keyboard focus is on the action
   control`: same `"1:held"` assertion.
4. **New** `resumes the clock when native focus leaves the card`
   (`duration: Duration.seconds(2)`, action toast): push, settle, wait 60 ms,
   `focusElement(toast-action)`, wait 150 ms, settle, read `progressWidth`
   (held); wait 300 ms, settle, assert the width is **unchanged** (the clock is
   held through native focus, not only its first sample); `focusElement(elsewhere)`,
   wait 300 ms, settle, assert the width is **less** (the clock resumed). One
   case, one honest both-direction signal: the hold comes from the sample and the
   release comes from the sample.

Suite 23 → 24 cases.

### Both-direction proof

- New tests + the old `viewport.tsx`: cases 1–3 fail with
  `expected "0:none" to be "1:held"` (the toast expired at 600 ms; the card was
  still painted, which is exactly the old assertion's blind spot), and case 4
  fails on its "unchanged" width (the clock never held).
- With the fix: 24/24.
- Remove only the `focusHeld` term from `syncHold` → cases 1–4 fail again
  (`0:none` and the shrinking width).
- Remove only the effect that publishes `focusHeld` → the same four fail.
- Remove only `attachDismiss` (leave the action id) → the two dismiss cases fail
  while the action cases stay green; removing `attachAction` is the mirror. Each
  id is a separate, necessary reason.
- Re-add a React `onFocus` pause beside the sample and the cases stay green: it
  is a redundant path, which is why the plan removes it rather than keeps both.

## 4. Documentation and inventory sync (all required before "done")

1. `packages/components/docs/toast.mdx`
   - **Accessibility and limitations**: state how the keyboard hold is measured —
     *"the card samples the natively focused host every 50 ms, because 0.10.0
     delivers no React `focus`/`blur` for a native focus change (`internal/native-focus.ts`, plans 536/540, 659/672)"* — and that the hold covers the
     action and the dismiss control.
   - **Verification**: 23 → 24 and name the native-focus hold and its release.
2. `COMPONENTS.md`
   - **Toasts / notifications** row: 23 → 24 and "keyboard focus ... pauses"
     now names the native sample.
   - **A focus ring needs a focus signal** paragraph: the sentence "No component
     fakes it with a timer or poll. The one sampled focus signal is `InlineEdit`'s
     commit watcher" is stale — `SearchInput` (plan 659), the combobox trigger
     (plan 672) and now the toast card sample host focus. Rewrite it to name the
     samplers and what each one is for, keeping the ring claim itself unchanged.
3. `packages/components/src/toast/viewport.tsx` → `toastMeta.limitations`: add
   *"the keyboard hold is a 50 ms sample of the renderer's focused host: 0.10.0
   delivers no React focus/blur for a native focus change"*.
4. `TODO.md` → under *Tier 2 hardening after the inventory closed*, add the
   ticked row for plan 743 with the measurement, counts and gates.
5. `.agents/slop/plans/README.md` → add the 743 row with its status.
6. `PLAN.md` D30 → append that `742` went to tokens-theme and 743 is this plan;
   the next components overflow plan is `744`.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

| Command | Expected |
| ------- | -------- |
| `cd packages/components && nub run test:behaviour toast` | **before**: 23 passed (with the vacuous hold assertions). **after**: 24 passed. |
| `cd packages/components && nub run test:behaviour toast` (old viewport, new tests) | 4 failures: the three `0:none` queue states and the frozen-width case. |
| `nub run check` | exit 0 (types, unit suite, inventory/docs count check agreeing with 24) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

The full native suite is **not** required for this change (it is not
cross-cutting). The recorded baseline is 922 passed / 28 failed of 950 (the
plan-540 binding classes); if run before merging, expect the same 28 plus this
plan's new pass, no new failure.

## 6. STOP conditions

Stop and report with evidence if any of these happen:

- `getFocusedElementId()` reports a different id than the control's
  `PublicInstance.id` after `focusElement` on this host — the sample cannot
  identify the card's controls and the fix needs a different signal.
- `Button`/`IconButton` does not forward a caller `ref` through `useMergedRef`
  (type error or a `null` instance) — report it instead of adding a second ref.
- A toast vanishes within 50 ms of focus because the first sample lands after
  the clock's deadline — report the timing, do not shorten `FOCUS_SAMPLE_MS`
  unilaterally (it is shared with SearchInput and the combobox trigger).
- The strengthened hover cases (the ones that read `progressWidth`) start failing
  — the pointer reason regressed; stop and report which case.
- The inventory check reports a docs/count mismatch — recount the `it(` cases
  (24), do not edit the check.

## 7. Acceptance

- With the pointer off the card, focusing a toast's action or dismiss control by
  any route (a `Tab` entry, `focusElement`, a click the host focuses) holds the
  clock, and focus leaving resumes it with the remaining time.
- A card cannot expire while one of its own controls holds native focus.
- The four hold cases fail at `HEAD` for the stated reason and pass after;
  removing either the id registration or the `focusHeld` term fails them again.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 are synced;
  the docs' stated count is the suite's real count.
- `nub run check`, `nub run lint` and `nub run test` exit `0`.
- The change is committed on `agent/components` and pushed (never to `master`).

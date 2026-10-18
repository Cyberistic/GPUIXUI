# 124 — Toast timers respect keyboard focus, not only the pointer

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 115 (toast store/viewport), 123 (hover pause), 117 (inventory gate)
- **Status:** done, 2026-10-17. 2 native tests (Toast: 10), docs and inventory
  synced. Deviations in §10.

`COMPONENTS.md` and `docs/toast.mdx` record that keyboard focus does not pause a
toast. That is a real defect, not only a missing nicety: the only focus target in
a card is its Dismiss control, and a user who tabs to it can have the card — and
the focus with it — removed mid-interaction. WCAG 2.2.1 (timing adjustable)
expects the same hold for focus that hover already has.

Plan 123 added `pause`/`resume` with remaining-time semantics. This plan adds the
missing **hold reason**: a card's clock stays paused while it is hovered **or**
focus is inside it, and resumes only when both are false. It is a viewport
change; the store is unchanged.

Probe evidence, measured on this host 2026-10-17 in the real renderer:

- A toast with `defaultDuration: 600ms`, whose Dismiss control was focused with
  `renderer.focusElement`, was gone after 900 ms — the bug is real today.
- `onFocus` on an ancestor `div` does **not** fire when a descendant button is
  focused (`{ child: 1, parent: 0 }`), so the handlers must sit on the focusable
  control itself, not on the card root.

---

## 1. Files

```
src/toast/viewport.tsx         # hold reasons: hover OR focus; wire onFocus/onBlur
src/behaviour/toast.test.tsx   # + 2 native tests (focus hold, focus survives pointer leave)
docs/toast.mdx                 # behaviour table, accessibility, verification count
src/inventory.ts               # toastMeta limitations (check whether focus is listed)
COMPONENTS.md                  # Toasts row
README.md                      # the toast line in the package table
TODO.md                        # tick the new hardening task
.agents/slop/plans/README.md   # index plan 124
```

Do not touch `src/toast/store.ts`: `pause`/`resume` are already idempotent in the
directions this needs (`pause` with no deadline is a no-op; `resume` with no
remaining time is a no-op).

## 2. `src/toast/viewport.tsx`

In `ToastCard`:

1. Import `useRef` from `react` (already imports `type ReactNode`).
2. Add one ref holding both reasons:

   ```ts
   const held = useRef({ hover: false, focus: false });
   ```

3. Add a local transition helper. Call the store only when the combined state
   changes, so a focus arriving while hovered does not restart anything, and a
   pointer leaving while focused does not resume the clock:

   ```ts
   const setHeld = (reason: "hover" | "focus", value: boolean): void => {
     const before = held.current.hover || held.current.focus;
     held.current[reason] = value;
     const after = held.current.hover || held.current.focus;
     if (before === after) return;
     if (after) pause(toast.id);
     else resume(toast.id);
   };
   ```

4. Replace the card root's hover handlers:

   ```tsx
   onMouseEnter={() => setHeld("hover", true)}
   onMouseLeave={() => setHeld("hover", false)}
   ```

5. Add the focus reason to the Dismiss `IconButton` (the only focusable child,
   per the probe):

   ```tsx
   onFocus={() => setHeld("focus", true)}
   onBlur={() => setHeld("focus", false)}
   ```

   `IconButton` already forwards both handlers (plan 110 §7). Do **not** rely on
   the card root: the probe shows focus does not bubble.

6. Leave the comment that explains why paint order matters intact. Add one short
   comment above `setHeld` only if the combined-reason rule is not obvious; the
   code above is meant to read without it.

## 3. Tests — `src/behaviour/toast.test.tsx` (native, real time)

Header comment gains the bug: "a toast could auto-dismiss while keyboard focus was
on its own dismiss control, dropping the user's focus with it".

Add two tests, both using the existing `Harness duration={Duration.millis(600)}`
pattern and `page.renderer.focusElement(...)`. The existing suite's `elsewhere`
button is the focus destination.

1. **Focus alone pauses, and leaving resumes.**
   - push, settle, focus `toast-dismiss`;
   - wait 900 ms, settle → `toast-1` is still defined;
   - focus `elsewhere`, wait 900 ms, settle → `toast-1` is undefined.
2. **A pointer leaving does not resume while focus is inside.**
   - push, settle, `hoverCentreOf(page, "toast-1")`;
   - focus `toast-dismiss`;
   - `hoverCentreOf(page, "elsewhere")` (pointer leaves the card, focus stays);
   - wait 900 ms, settle → still defined;
   - focus `elsewhere`, wait 900 ms → gone.

Both tests must be able to fail before the fix (test 1: the toast is already gone
after the first wait; test 2: it is gone after the pointer leaves). Prove both
directions before committing: run the suite with the new tests against the old
viewport (expect 2 failures), then with the fix (expect green).

If the 300 ms margin proves flaky after two runs, raise the durations/wait
together (e.g. 800/1200) and record it in §8 — never shrink the margin.

## 4. Docs, inventory, ledger

- `docs/toast.mdx`:
  - Behaviour table: "hovering **or focusing** a card pauses its clock; the clock
    resumes only when both the pointer and focus have left".
  - Accessibility: replace "Keyboard focus does not pause…" with the focus rule;
    keep the note that `useToast().pause`/`resume` remain available for custom
    holds.
  - Verification list: the behaviour suite is now 10 tests (8 + 2).
- `src/inventory.ts` → `toastMeta.limitations`: check for a focus entry; none is
  currently listed, so only keep the zIndex and progress-indicator limitations.
  Do not add a limitation this fix removes.
- `COMPONENTS.md` → Toasts row: "hovering or focusing pauses and leaving resumes
  with the remaining time; 10 native behaviour tests". Keep the zIndex and
  progress-bar limitations.
- `README.md` → the `src/toast.tsx` row: `with hover pause/resume` becomes
  `with pointer/focus pause/resume`.
- `TODO.md` → under "Tier 2 hardening after the inventory closed", add and tick:
  `- [x] Toast hold on keyboard focus — plan 124`.
- `.agents/slop/plans/README.md` → add the plan 124 row and update the status to
  `done` when the gates pass, with the test counts.

## 5. Commands and expected results

```
nub run --filter @gpuixui/components test:behaviour   # Toast: 8 → 10, all files green
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 178 logic tests still green
nub run check                                         # repo gate, exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

Run the behaviour suite twice before calling it done; the hold tests are
wall-clock tests.

## 6. STOP conditions

1. `focusElement` on the Dismiss control does not fire its `onFocus` in the test
   renderer → STOP and report; do not simulate focus with a click (a click also
   presses the control).
2. The two-direction check cannot produce the "fails without the fix" run (for
   example because the toast survives for another reason) → STOP and re-measure;
   do not commit a test that passes both ways.
3. Two consecutive behaviour runs disagree on either new test → raise the margin
   once as §3 allows; if it still disagrees, keep the focus-hold logic but STOP
   and report the flake rather than shipping an unstable suite.
4. The pointer-leave test resumes the clock while focus is inside → the combined
   `before`/`after` rule is wrong; STOP and fix the helper, do not weaken the
   test.

## 7. Acceptance criteria

- [x] A focused toast does not auto-dismiss until focus leaves.
- [x] Hover and focus compose: leaving with the pointer while focused keeps the
  hold; the toast resumes only when both are gone.
- [x] Both new tests fail without the viewport change and pass with it.
- [x] Docs, inventory, `COMPONENTS.md`, `README.md`, `TODO.md` and the plan index
  agree with the code.
- [x] The commands in §5 pass.

## 8. Deviations, recorded during implementation (2026-10-17)

1. **The hold helper is a `useRef` of two booleans, not Effect Atom state.** It is
   per-card, transient interaction bookkeeping with no shared reader; atomising it
   would add a store for state React already owns at the leaf. The effectful state
   stays in the toast store.
2. **`toastMeta.limitations` needed no edit.** The inventory never listed the
   focus gap; only the docs and `COMPONENTS.md` did.
3. **Two-direction proof:** with the old viewport, test 1 failed at the first
   wait (`expected undefined to be defined`) and test 2 failed the same way when
   run alone with `-t "keeps the hold"`; with the fix both passed twice in a row.
4. **Timings stayed at 600 ms / 900 ms**, the plan 123 values, and were stable
   over three runs.

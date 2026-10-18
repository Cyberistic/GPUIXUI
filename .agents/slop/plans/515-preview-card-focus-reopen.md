# Plan 515 — Preview card: a restored focus must not re-open it

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 completion) / F (consistency) |
| Owner | components workstream |
| Depends on | `110`, `112`, `317`, `323`, `325`, `326`, `386`, `388`, `393`, `394`, `398`, `399`, `514` |
| Status | planned |
| Number | `515` — `100–514` are claimed across the worktrees; `515` is the next free number |

This plan is self-contained. Facts marked **measured** were reproduced on this
host (Intel macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. Goal

`Escape` from **inside** an open `PreviewCard` closes it, hands focus back to
the trigger — and the trigger's `onFocus` immediately re-opens the card. The
enclosing overlay stays open, so the visible result is "Escape does nothing".

Measured after plan `514` (which fixed the trigger's own Escape): a `Dialog`
with a `PreviewCard` in its content; focus the trigger (the card opens), focus
the card surface, press `Escape`; the card is still mounted afterwards. In the
throwaway probe the caller's `onOpenChange` reported `true` (focus open),
`false` (dismissal), `true` (the restored focus), with focus back on the
trigger.

After the fix: `Escape` from the card closes it, focus returns to the trigger,
the card stays closed, and the enclosing dialog stays open. A second `Escape`
closes the dialog. Standalone behaviour is unchanged.

Why the existing suite misses it: "closes on Escape and returns focus to the
trigger" starts with focus **already on the trigger**, so the restore focuses
the same element and no `focus` event runs.

## 2. Facts this design rests on

- `PreviewCardContent` pushes one dismiss layer while open; its handler closes
  the card and, for a `keyDown`, calls `renderer.focusElement(trigger.id)`
  (plan `317`). The layer consumes the event, so plan `514`'s trigger path and
  this content path both leave the enclosing dialog open — the dialog is not
  the problem here.
- `PreviewCardTrigger`'s `onFocus` opens the card immediately (the keyboard
  open path, plan `317`). The restored focus is indistinguishable from a user
  focusing the trigger without a guard.
- `useHoverTravel`'s `cancel()` only clears a pending timer; it does not change
  the open state.
- `PublicInstance.id` is the renderer's focus handle; `PreviewCardContext`
  already holds the trigger and the layer handler already holds the renderer.
  `renderer.getFocusedElementId?.()` is available (used by `internal/modal.ts`
  and `inline-edit.tsx`).
- `Popover` avoids the whole class of bug by not letting its trigger handle
  `Escape`; the surface is auto-focused on open. `PreviewCard` keeps focus on
  the trigger on hover by design, so it needs the guard instead.
- **Baseline (measured 2026-10-18 after plan 514):** `nub run test` → 398 unit
  tests across 39 files; `nub run test:behaviour` → 654 native tests across 49
  files; PreviewCard 13 native tests.

## 3. Design

One non-public ref on the existing card context; one check in the layer
handler; one check in the trigger's focus handler. No public prop, part or
dependency.

In `PreviewCard`:

```ts
const suppressFocusOpen = useRef(false);
```

Add `readonly suppressFocusOpen: RefObject<boolean>;` to
`PreviewCardContextValue` and include it in the memoised context value.

In `PreviewCardContent`'s dismiss layer:

```ts
return pushDismissLayer((event) => {
  close.current();
  if (event.eventType !== "keyDown") return;
  const target = trigger.current;
  if (target === null) return;
  // A restored focus is not the user focusing the trigger (plan 515).
  if (renderer?.getFocusedElementId?.() !== target.id) {
    suppressFocusOpen.current = true;
  }
  renderer?.focusElement?.(target.id);
});
```

The flag is set only when focus really moves, so the trigger-already-focused
path (plan `514`) cannot leave a stale flag — the same element does not fire
`focus` again. In `PreviewCardTrigger`'s `onFocus`, after the disabled guard:

```ts
if (suppressFocusOpen.current) {
  suppressFocusOpen.current = false;
  return;
}
setOpen(true);
```

The flag is consumed by exactly the focus event it was set for, not cleared by
a timer, so a delayed focus delivery cannot lose it. If `focusElement` is
unavailable the focused-id comparison plus the renderer check fail first; the
flag is not set.

The hover, press and outside-press paths are unchanged. An outside press does
not restore focus, so it never sets the flag.

## 4. Files to create or change

| Path | Action |
| ---- | ------ |
| `src/preview-card.tsx` | add `suppressFocusOpen` to the context; set it in the key dismissal; skip exactly one focus-open |
| `src/behaviour/preview-card.test.tsx` | two new native tests (§6); header comment names the re-open bug |
| `docs/preview-card.mdx` | the nesting/restore sentence; Verification count 13 → 15 |
| `COMPONENTS.md` | Preview Card row: the rule and 15 native tests |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | add and tick the task under the Tier 2 hardening list |

No example change: the dialog composition is a test-side concern and the
existing example still shows the standalone card.

## 5. Steps

1. Implement §3 in `src/preview-card.tsx`; update the module header.
2. Add the two native tests in §6 with a header comment stating the bug.
3. Run the suites; PreviewCard 13 → 15, behaviour 654 → 656.
4. Prove both directions: revert only `src/preview-card.tsx` and confirm both
   new cases fail while the existing 13 pass; restore and confirm 15 pass.
5. Run the unit suite, type check and the repo gates (§7).
6. Update `docs/preview-card.mdx`, `COMPONENTS.md`, the plan index and the
   `TODO.md` task with the real counts.
7. Commit in two steps (plan, implementation + docs) and push the branch.

## 6. Test plan

### Native (`src/behaviour/preview-card.test.tsx`)

A dialog fixture with a controlled `open` (`useState(true)`) containing the
existing `Workspace` card tree.

**Escape from the card surface closes it and it stays closed** — render inside
the dialog; focus `trigger` (card opens); focus `preview` (the surface has
`tabIndex={-1}`); `simulateKeystrokes("escape")`; expect `preview` gone,
`dialog` present, focus on `trigger`. Wait one macrotask (`after(20)`) and
assert `preview` is still gone, so a delayed re-open cannot hide behind the
first assertion. Before the fix the card is back immediately.

**Escape from a control inside the card does the same** — focus the card's
existing `inside` button (the realistic composed case), `Escape`; expect the
card gone, the dialog open, focus on the trigger and the card still gone after
the wait. Before the fix the same re-open happens through the trigger's focus.

Both must fail on the pre-change source and pass after it.

### Existing suites

- All 13 PreviewCard tests must stay green, especially the plan `514` nested
  test (trigger-focused Escape) and the standalone Escape test.
- `dialog.test.tsx` (18 tests) and `popover.test.tsx` (12 tests) must stay
  green: the guard is local to PreviewCard and does not touch the stack.
- A genuine keyboard focus must still open the card (covered by "opens on
  hover after the delay, and on focus immediately").

### Both-direction proof

Revert only `src/preview-card.tsx`, keep the new tests: both fail (the card is
present after the wait). Restore: 15 pass. Do not weaken an assertion.

## 7. Commands and expected results

```sh
cd packages/components
nub run test                          # expected: 39 files, 398 unit tests green
nub run test:behaviour                # expected: 49 files, 656 native tests
nub run check-types                   # expected: exit 0
cd ../..
nub run check                         # expected: check-tests, lint, fmt and types green
nub run test                          # expected: every workspace package green
nub run lint                          # expected: green
```

## 8. STOP conditions

Stop and report with evidence if:

- the restored focus does not dispatch `onFocus` at all (then the re-open came
  from somewhere else; re-measure before adding a guard);
- a genuine keyboard focus stops opening the card, or the flag can swallow two
  focus events (the guard must consume exactly one);
- the fix needs a public prop, event, part or dependency — that is a design
  change, not this plan;
- an existing PreviewCard, Dialog, Drawer or Popover test fails for a reason
  other than the guard; do not weaken an assertion to get green.

## 9. Acceptance criteria

- `Escape` from the card surface or a control inside the card closes it,
  returns focus to the trigger, and does not re-open it; the enclosing dialog
  stays open and the next `Escape` closes it.
- Standalone hover, focus, press, outside-press and Escape behaviour, the
  delays and the disabled-trigger guards are unchanged.
- The two new native tests fail on the pre-change source and pass after it.
- `docs/preview-card.mdx`, the `COMPONENTS.md` row, the plan index and
  `TODO.md` match the implementation and the real counts.
- `nub run check`, `nub run test` and `nub run lint` are green.

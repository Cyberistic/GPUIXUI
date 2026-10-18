# Plan 514 — Preview card dismissal inside an enclosing overlay

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 completion) / F (consistency) |
| Owner | components workstream |
| Depends on | `110`, `112`, `317`, `323`, `325`, `326`, `386`, `388`, `393`, `394`, `398`, `399` |
| Status | planned |
| Number | `514` — `100–513` and `512` are taken across the worktrees (`512` by `tokens-theme`), so the next free number is `514` |

This plan is self-contained. Facts marked **measured** were reproduced on this
host (Intel macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. Goal

`PreviewCard` is the only overlay whose dismissal leaks out of itself. Two
measured defects, both only visible when the card is declared **inside another
overlay** (a dialog, a drawer, a sheet):

| Probe (Dialog open, PreviewCard declared in its content) | Before |
| ------------------------------------------------------- | ------ |
| Focus the card trigger (opens the card), press `Escape` | the card **and** the dialog close |
| Focus the card surface (`tabIndex={-1}`), press `Escape` | the card closes and **immediately re-opens**; the dialog stays |

After the fix: one `Escape` closes the card and leaves the enclosing dialog
open; the card stays closed and focus lands on its trigger; the next `Escape`
closes the dialog. A standalone card behaves exactly as today.

The second defect is invisible in the current suite because its Escape test
starts with focus **already on the trigger** (`src/behaviour/preview-card.test.tsx`,
"closes on Escape and returns focus to the trigger"). The dismissal restores
focus to the same element, so no `focus` event runs and the card cannot
re-open. Focus the card surface instead and the restore fires the trigger's
`onFocus`, which calls `setOpen(true)` again.

## 2. Facts this design rests on

- **Measured, trigger path.** Focus the trigger (card opens), press `Escape`:
  the tree afterwards has `card: false, dialog: false`. `PreviewCardTrigger`'s
  `onKeyDown` runs `if (isDismiss(event) && open) setOpen(false)` **without
  claiming the event**. The card's dismiss layer therefore pops before the
  enclosing `DialogContent`'s handler runs; `dismissTopLayer` then sees the
  dialog as the topmost layer and closes it.
- **Measured, content path.** Focus the card surface, press `Escape`: the
  dismiss layer runs (`cardClose(true, false, true)` through the caller's spy),
  the card unmounts, `PreviewCardContent`'s layer handler calls
  `renderer.focusElement(trigger.id)`, the trigger's `onFocus` calls
  `setOpen(true)`, and the tree ends with `card: true, dialog: true` and focus
  on the trigger. The layer stack count is `2` at the card handler's entry
  (dialog + card) and the event is not yet claimed, so the stack is not the
  problem — the re-open is.
- `internal/event-claim.ts` is the existing mechanism for "this event happened
  in an inner surface": `claimEvent(event)` marks it, and `dismissTopLayer`
  reads `isEventClaimed(event)` before closing an enclosing layer. The claim
  crosses the runtime's per-handler payload copies and clears in a microtask
  (plan `366`).
- `PreviewCardContent` already pushes one dismiss layer while open and its
  handler returns focus to the trigger for key dismissals (plan `317`); only
  the trigger's own path bypasses it. `Popover`'s trigger does not handle
  `Escape` at all — the surface is focused while open — which is why the same
  bug never surfaced there.
- The trigger's `onFocus` is the keyboard-open path (plan `317` / docs). A
  dismissal that restores focus must not be mistaken for a user focusing the
  trigger; that is the second fix below.
- **Baseline (measured 2026-10-18 before the change):** `nub run test` → 398
  unit tests across 39 files; `nub run test:behaviour` → 654 native tests
  across 49 files; PreviewCard 12 native tests.

## 3. Design

### 3.1 The trigger's Escape claims the event

In `PreviewCardTrigger`'s `onKeyDown`:

```ts
import { claimEvent } from "./internal/event-claim.js";

onKeyDown={(event: EventPayload) => {
  rest.onKeyDown?.(event);
  if (isDismiss(event) && open) {
    // Close here and tell the enclosing overlay this Escape is spent. Going
    // through the dismiss stack would also work while the card's layer is
    // pushed, but the trigger may close the card in the same tick it opened
    // (plan 514).
    claimEvent(event);
    setOpen(false);
  }
}}
```

Focus is already on the trigger, so no restore is needed on this path.

### 3.2 A restored focus must not re-open the card

`PreviewCardContextValue` gains one non-public field:

```ts
readonly suppressFocusOpen: RefObject<boolean>;
```

`PreviewCard` creates it with `useRef(false)` and puts it in the memoised
context. `PreviewCardContent`'s dismiss handler becomes:

```ts
return pushDismissLayer((event) => {
  close.current();
  if (event.eventType !== "keyDown") return;
  const target = trigger.current;
  if (target === null) return;
  // Restoring focus is not the user focusing the trigger (plan 514).
  if (renderer?.getFocusedElementId?.() !== target.id) {
    suppressFocusOpen.current = true;
  }
  renderer?.focusElement?.(target.id);
});
```

The flag is set only when focus really moves, so the trigger-is-already-focused
path cannot leave a stale flag. `PreviewCardTrigger`'s `onFocus` becomes:

```ts
onFocus={(event) => {
  rest.onFocus?.(event);
  hover.cancel();
  if (rest.disabled === true) return;
  if (suppressFocusOpen.current) {
    suppressFocusOpen.current = false;
    return;
  }
  setOpen(true);
}}
```

The flag is consumed by the focus event it was set for, not by a timer, so a
delayed focus delivery cannot lose it. If `focusElement` is unavailable the
flag is not set (guarded by the focused-id comparison plus the renderer check
already used by the layer).

The trigger's press and hover paths are unchanged: they still open. The
content's outside-press path does not restore focus, so it never sets the flag.

## 4. Files to create or change

| Path | Action |
| ---- | ------ |
| `src/preview-card.tsx` | import `claimEvent`; claim the trigger's Escape; add `suppressFocusOpen` to the context; set it in the key dismissal; skip one focus-open |
| `src/behaviour/preview-card.test.tsx` | two new native tests (§6); header comment names both bugs |
| `docs/preview-card.mdx` | nesting sentence in Accessibility; Verification count 12 → 14 |
| `COMPONENTS.md` | Preview Card row: the nesting rule and 14 native tests |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | add and tick the task under the Tier 2 hardening list |

No example change: the existing example is a standalone card, and the dialog
composition is a test-side concern.

## 5. Steps

1. Implement §3.1 and §3.2 in `src/preview-card.tsx`; update the module header
   (the card is a dismiss layer **and** its trigger claims its own Escape).
2. Add the two native tests in §6 with a header comment stating the bugs.
3. Run `nub run --filter @gpuixui/components test:behaviour` and record the
   result: PreviewCard 12 → 14, behaviour 654 → 656.
4. Prove both directions: revert only `src/preview-card.tsx` and confirm both
   new cases fail while the existing 12 pass; restore and confirm 14 pass.
5. Run the unit suite, type check and the repo gates (§7).
6. Update `docs/preview-card.mdx`, `COMPONENTS.md`, the plan index status and
   the `TODO.md` task with the real counts.
7. Commit in two steps (plan, then implementation + docs) and push the branch.

## 6. Test plan

### Native (`src/behaviour/preview-card.test.tsx`)

A dialog fixture with a controlled `open` (`useState(true)`) containing the
existing card tree, `openDelay={20}`, `closeDelay={20}`.

**One Escape closes the card, not the enclosing dialog** — focus `trigger`
(card opens), `simulateKeystrokes("escape")`; expect `preview` gone, `dialog`
still present, focus on `trigger`; then a second `Escape` and expect the
dialog gone. Before the fix the first assertion on the dialog fails (dialog
already gone).

**Escape from inside the card closes it and it stays closed** — focus
`trigger`, focus `preview` (the surface has `tabIndex={-1}`), `Escape`; expect
`preview` gone, `dialog` present, focus back on `trigger`, and after a short
`until` wait the card still gone. Before the fix `preview` is back (the
restored focus re-opened it).

Optionally assert the same from the card's inner button (`testId="inside"`)
because a composed card is the realistic case; that path shares the surface's
handler, so one test on the surface is the minimum.

### Existing suites

- The existing 12 PreviewCard tests must stay green, especially "closes on
  Escape and returns focus to the trigger" (focus starts on the trigger), the
  outside-press dismissal, hover travel and the disabled-trigger guards.
- `dialog.test.tsx` (18 tests, including a nested popover) must stay green:
  the new claim is additive and only fires while the card is open.

### Both-direction proof

Revert only `src/preview-card.tsx`, keep the new tests: both must fail exactly
as §1 records. Restore: 14 pass. Use `git stash`/checkout of the one file, not
a weakened assertion.

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

- the claim does not reach the dialog handler in the trigger path (measure the
  handler order before adding another mechanism);
- the card stops closing on a standalone `Escape`, or a genuine keyboard focus
  stops opening it (the suppression must consume exactly one restored focus);
- the fix needs a public prop, event, part or dependency — that is a design
  change, not this plan;
- an existing PreviewCard, Dialog, Drawer or Popover test fails for a reason
  other than the new claim; do not weaken an assertion to get green.

## 9. Acceptance criteria

- One `Escape` from the trigger closes the card and leaves an enclosing dialog
  open; the next closes the dialog.
- `Escape` from inside the card closes it, returns focus to the trigger, and
  does not re-open it; the enclosing dialog stays open.
- Standalone hover, focus, press, outside-press and Escape behaviour, the
  delays and the disabled-trigger guards are unchanged.
- The two new native tests fail on the pre-change source and pass after it.
- `docs/preview-card.mdx`, the `COMPONENTS.md` row, the plan index and
  `TODO.md` match the implementation and the real counts.
- `nub run check`, `nub run test` and `nub run lint` are green.

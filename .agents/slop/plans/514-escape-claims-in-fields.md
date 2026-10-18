# Plan 514 — An inner field that acts on `Escape` claims the event

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 completion) / F (consistency) |
| Owner | components workstream |
| Depends on | `110`, `112`, `114`, `200`, `201`, `310`, `313`, `316`, `366`, `398`, `399`, `207` |
| Status | done — five measured leaks fixed: a `SearchInput` clear, `InlineEdit` cancel, `HotkeyRecorder` stop, `Chat` stop and a `PreviewCard` trigger close each ran **and** closed the enclosing dialog on one Escape. Each now claims its key (the card through the dismiss stack); an empty search, idle recorder and idle chat still pass Escape on. 5 dialog cases + 1 pin (search-input 13, inline-edit 17, hotkey-recorder 13, chat 10, preview-card 13, behaviour 654), both-direction proof (the 5 dialog cases fail on the old source); docs, `COMPONENTS.md` and inventory synced |
| Number | First free number after `513` |

This plan is self-contained. Facts marked **measured** were reproduced on this
host (Intel macOS, the locally built `darwin-x64` binding from plan `140`) with
a throwaway behaviour suite that was deleted after measuring.

---

## 1. Goal

Plan `399` closed the last **popup** that consumed `Escape` without claiming the
event. It missed the fields: five controls handle `Escape` themselves and leave
the enclosing dismiss layer to see the same key, so inside a dialog one press
both acts on the field **and** closes the dialog.

Measured before the fix (one throwaway suite, `Dialog` around each control):

| Probe | Before |
| ----- | ------ |
| `Dialog > SearchInput` with text, press `Escape` | the field clears **and** the dialog is gone |
| `Dialog > InlineEdit` editing, press `Escape` | the edit cancels **and** the dialog is gone |
| `Dialog > HotkeyRecorder` recording, press `Escape` | recording stops **and** the dialog is gone |
| `Dialog > Chat` streaming, `Escape` in the composer | the request stops **and** the dialog is gone |
| `Dialog > PreviewCard` open on a focused trigger, `Escape` | the card closes **and** the dialog is gone |

After the fix: the field's action happens, the dialog stays, and the next
`Escape` closes the dialog. A control that has nothing to do with the key
(empty search, recorder not listening, chat not in flight) must still let
`Escape` reach the enclosing layer.

## 2. Facts this design rests on

- `internal/event-claim.ts` is the package's replacement for `preventDefault`,
  which `EventPayload` does not have in `0.10.0`. `claimEvent(event)` marks the
  key; the dismiss stack's `dismissTopLayer` calls `isEventClaimed(event)`
  before closing. The claim crosses the runtime's per-handler payload copies and
  resets in a microtask (plans `366`, `398`, `399`).
- A key event fired on a focused field bubbles to the enclosing `DialogContent`
  handler; plan `399` measured the same path for the mention list. This is why
  the current code closes both surfaces.
- Claiming is not dismissing. These controls close or change **their own**
  state; the claim only tells an enclosing surface to ignore the same key.
- `PreviewCard` already pushes a dismiss layer while open (`popover.tsx` does the
  same). Its **trigger**, however, closes the card locally in `onKeyDown` and
  does not go through `dismissTopLayer`, so the enclosing handler then dismisses
  the dialog underneath. The trigger must offer the key to the stack instead.
- **Baseline (measured 2026-10-18 before the change):** `nub run --filter
  @gpuixui/components test` → 398 unit tests green; `test:behaviour` → 648
  native tests across 49 files green.

## 3. Design

Five small, local changes; no new state, prop, part or dependency.

### `search-input.tsx`

```ts
onKeyDown={(event: EventPayload) => {
  onKeyDown?.(event);
  if (!isDismiss(event) || disabled || value === "") return;
  clear();
  claimEvent(event);
}}
```

`clear()` already refuses a disabled field and an empty value; the guard keeps
the claim tied to an action the user could observe.

### `inline-edit.tsx`

```ts
if (isDismiss(event)) {
  cancel();
  claimEvent(event);
}
```

The input only exists while editing, so `cancel()` always acts.

### `hotkey-recorder.tsx`

Inside the `recording` branch of `onKeyDown`:

```ts
if (isDismiss(event)) {
  claimEvent(event);
  setRecording(false);
  return;
}
```

The recorder already checks `isEventClaimed` before acting, so an already
consumed key still does nothing. A non-dismiss chord is a capture, not a dialog
command; only `Escape` is claimed here to keep the change minimal.

### `chat.tsx`

```ts
if (isDismiss(event) && canStop(status)) {
  claimEvent(event);
  stop();
}
```

`stop()` already refuses a status that cannot stop.

### `preview-card.tsx`

```ts
onKeyDown={(event: EventPayload) => {
  rest.onKeyDown?.(event);
  if (isDismiss(event) && open) dismissTopLayer(event);
}}
```

The card's layer closes it and claims the key. A layer opened above the card
keeps the key, which is the correct stacking rule; the local `setOpen(false)`
could not express that.

## 4. Files to create or change

| Path | Action |
| ---- | ------ |
| `src/search-input.tsx` | import `claimEvent`; claim the Escape that clears |
| `src/inline-edit.tsx` | import `claimEvent`; claim the Escape that cancels |
| `src/hotkey-recorder.tsx` | claim the Escape that stops recording (import already present) |
| `src/chat.tsx` | import `claimEvent`; claim the Escape that stops the request |
| `src/preview-card.tsx` | trigger Escape goes through `dismissTopLayer` |
| `src/behaviour/search-input.test.tsx` | +2 native cases (dialog nesting, and the empty field passing Escape on) |
| `src/behaviour/inline-edit.test.tsx` | +1 native case (dialog nesting) |
| `src/behaviour/hotkey-recorder.test.tsx` | +1 native case (dialog nesting) |
| `src/behaviour/chat.test.tsx` | +1 native case (dialog nesting) |
| `src/behaviour/preview-card.test.tsx` | +1 native case (dialog nesting) |
| `docs/search-input.mdx` | nesting sentence; Verification `11` → `12` |
| `docs/inline-edit.mdx` | nesting sentence; Verification `16` → `17` |
| `docs/hotkey-recorder.mdx` | nesting sentence; Verification `12` → `13` |
| `docs/chat.mdx` | nesting sentence; Verification `9` → `10` |
| `docs/preview-card.mdx` | nesting sentence; Verification `12` → `13` |
| `COMPONENTS.md` | five rows: the rule and the new native counts |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | add and tick the task under the Tier 2 hardening list |

The inventory records in each module keep their limitation arrays; add the
nesting rule where the row/summary states the keyboard contract expected it.

No example changes: the dialog composition is a test-side concern and the
existing examples already exercise each control standalone.

## 5. Steps

1. Apply §3 to the five modules; update each module header where it states the
   Escape contract.
2. Add one native case per suite, each with a small local `InDialog` wrapper
   (the pattern in `mention-input.test.tsx`). Put the bug in the header comment
   where the suite lists the bugs it guards.
3. Run the two suites (§7). Expected: search-input 13, inline-edit 17,
   hotkey-recorder 13, chat 10, preview-card 13; behaviour 648 → 654; unit
   unchanged at 398.
4. Update the five docs pages (one sentence plus the real count) and
   `COMPONENTS.md` (rule + counts).
5. Index the plan and tick the `TODO.md` task; run the completion gate.

## 6. Test plan

Each new case mounts a real `Dialog` (`defaultOpen`, local `open` state) around
the control, acts with `simulateKeystrokes`, then asserts:
1. **search-input** — dialog around `SearchInput defaultValue="abc"`; focus the
   field, `Escape`: the clear control is gone and the dialog is mounted; a
   second `Escape` closes the dialog. Also assert that an **empty** field's
   `Escape` closes the dialog (the claim must not swallow a key the field did
   not use).
2. **inline-edit** — dialog around `InlineEdit defaultEditing`; `Escape`: the
   input is gone (display back) and the dialog is mounted; a second `Escape`
   closes the dialog.
3. **hotkey-recorder** — dialog around the recorder; focus, `Enter` to record,
   `Escape`: recording stops (aria pressed/label back to idle) and the dialog is
   mounted; a second `Escape` closes the dialog.
4. **chat** — dialog around `Chat` with a `streaming` status; focus the
   composer, `Escape`: `onStop` is called once and the dialog is mounted; a
   second `Escape` closes the dialog.
5. **preview-card** — dialog around a card with `openDelay={0}`; focus the
   trigger (focus opens the card), `Escape`: the card is gone and the dialog is
   mounted; a second `Escape` closes the dialog.

Both-direction proof: revert only the five source files and confirm the five
dialog cases fail (each on the dialog being gone) while the rest of the suite
stays green; restore and confirm all pass. The empty-search case passes in both
directions — it pins the "do not swallow" half of the rule.

## 7. Commands and expected results

```sh
cd packages/components
nub run test                          # expected: 398 unit tests green
nub run test:behaviour                # expected: 49 files, 654 native tests
nub run check-types                   # expected: exit 0
cd ../..
nub run check                         # expected: check-tests, lint, fmt and types green
nub run test                          # expected: every workspace package green
```

The inventory check in `nub run test` recomputes every suite's `it(` count, so a
missed docs or `COMPONENTS.md` count fails there rather than in review.

## 8. STOP conditions

Stop and report with evidence if:

- a claim does not reach the dialog handler (the runtime ran the field and the
  dialog in separate tasks) — measure before adding a dismiss layer;
- a standalone control stops acting on `Escape` (the claim must be additive);
- an empty `SearchInput` stops letting `Escape` close its dialog;
- `PreviewCard`'s trigger `Escape` no longer closes the card when it is the
  topmost overlay;
- an existing test fails for a reason other than the new interaction. Do not
  weaken an assertion to get green.

## 9. Acceptance criteria

- One `Escape` acts on the focused field/card and leaves the enclosing dialog
  open; the next `Escape` closes the dialog — for all five controls.
- A field with nothing to do (`SearchInput` empty, recorder idle, chat idle)
  still passes `Escape` to the enclosing layer.
- Standalone behaviour is unchanged and every existing native test passes.
- The five dialog cases fail on the pre-change source and pass after it; the
  empty-search pin passes in both directions.
- `docs/*.mdx`, the `COMPONENTS.md` rows, the plan index and `TODO.md` match the
  implementation and the real counts.
- `nub run check`, `nub run test` and `nub run lint` are green.

# Plan 399 — Mention input claims its Escape inside an enclosing overlay

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 completion) / F (consistency) |
| Owner | components workstream |
| Depends on | `110`, `112`, `114`, `200`, `201`, `319`, `366`, `398` |
| Status | done — `Escape` from the field or a focused row closes the list and claims the event, so an enclosing dialog stays open for the next Escape; 2 native cases (Mention input 13, behaviour 631), both-direction proof (both fail without the claim); docs, `COMPONENTS.md` and inventory synced |
| Number | First free number in the `300–399` block (last landed: `398`) |

This plan is self-contained. Facts marked **measured** were reproduced on this
host (Intel macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. Goal

The mention list is the last popup that closes on `Escape` without claiming the
event. `Combobox` was fixed in plan `398`; every other overlay (`Popover`,
`PreviewCard`, menus, `Dialog`, `Drawer`) already participates in the shared
dismiss stack. `MentionInput` closes its list in the field's own `onKeyDown` (and
a focused row ignores `Escape` entirely), so inside a dialog the same `Escape`
also closes the dialog.

Measured before the fix (scratch behaviour suite, removed after measuring):

| Probe | Before |
| ----- | ------ |
| `Dialog > MentionInput`, type `@`, press `Escape` | the list **and** the dialog are gone |
| same, focus a row, press `Escape` | the list stays open and the dialog closes |

After the fix: one `Escape` closes the list and leaves the dialog open; the next
`Escape` closes the dialog. This holds whether focus is in the field or on a
suggestion row. Standalone behaviour is unchanged: `Escape` still closes the
list, and `Enter`/a press still insert.

## 2. Facts this design rests on

- The list is not a dismiss **layer**: it has no outside-press dismissal and no
  stacked surface of its own (unlike `PopoverContent`). Its open state is derived
  from the text (`mentionQuery`) plus a `dismissed` flag, so pushing a dismiss
  layer would add a second close path for a surface that is already closed by
  the field.
- The field keeps focus while the list is open in normal use (measured in plan
  `319`; the existing suite asserts the input still holds focus), and a caller can
  also `Tab` to a row, which is `tabIndex=0` (documented under Accessibility).
  Both paths must dismiss: the field's `onKeyDown` and the row's `onKeyDown`.
- `internal/event-claim.ts` exists for exactly this: `claimEvent(event)` marks
  the event, and `dismissTopLayer` reads `isEventClaimed` before closing an
  enclosing layer. The claim crosses the runtime's payload copies and is cleared
  in a microtask (plan `366`).
- Claiming is not the same as dismissing: the mention field closes itself with
  `setDismissed(true)` and the claim only tells the enclosing surface to ignore
  the same event.
- **Baseline (measured 2026-10-18 before the change):** `nub run --filter
  @gpuixui/components test` → 395 unit tests green; `test:behaviour` → 629
  native tests across 49 files green; MentionInput 11 native tests.

## 3. Design

In `MentionInput`'s `onKeyDown`, the dismiss branch becomes:

```ts
} else if (isDismiss(event)) {
  // The list closes here; an enclosing dialog must not close on the same
  // Escape (plan 399).
  claimEvent(event);
  setDismissed(true);
}
```

A focused row needs the same rule in `MentionInputItem`'s `onKeyDown`, because
the row is not a descendant of the input:

```ts
if (isDismiss(event)) {
  claimEvent(event);
  close();
  return;
}
```

`close` is already on the mention context (`() => setDismissed(true)`). One import
(`claimEvent` from `./internal/event-claim.js`) and two call sites. No new state,
prop, part or dependency. The list stays open until one of those handlers closes
it, exactly as today.

The list itself is unchanged: `MentionInputList` still returns `null` when the
query or the ranked rows are empty, and a press or `Enter` still inserts.

## 4. Files to create or change

| Path | Action |
| ---- | ------ |
| `src/mention-input.tsx` | claim the Escape in the field's and the row's dismiss branch; module header notes the rule |
| `src/behaviour/mention-input.test.tsx` | two new native tests: the field's Escape and a focused row's Escape each close the list and leave the dialog open |
| `docs/mention-input.mdx` | a nesting sentence and the Verification count 11 → 13 |
| `COMPONENTS.md` | Mention input row: the rule and 13 native tests |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | add and tick the task under the Tier 2 hardening list |

No example change: the existing example types `@`; the dialog composition is a
test-side concern.

## 5. Steps

1. Import `claimEvent` and add the calls in §3 (field and row).
2. Update the module header: `Escape` closes the list and is claimed so an
   enclosing overlay stays open (plan 399).
3. Add the two behaviour tests in §6, with a header comment naming the bug.
4. Run the suites (§7). MentionInput should move 11 → 13, behaviour 629 → 631,
   unit unchanged at 395. Record what the runs print.
5. Update `docs/mention-input.mdx` (a sentence plus the real count),
   `COMPONENTS.md`, the plan index status and the `TODO.md` task.

## 6. Test plan

### Native (`src/behaviour/mention-input.test.tsx`)

**One Escape closes the list, not the enclosing dialog** — a `Dialog` with
`defaultOpen` containing the existing `Harness`; focus the field, type `@`,
expect a row; `simulateKeystrokes("escape")`; expect the rows gone and the
dialog still mounted; a second `Escape` closes the dialog.

**A focused row is a valid dismissal surface** — the same tree; type `@`, focus
`row-ana` natively, `Escape`; expect the rows gone and the dialog mounted.

Both fail before the fix: the first on the dialog being gone after the field's
`Escape`, the second on the dialog being gone while the list was still open.

Both-direction proof: revert only `mention-input.tsx` and confirm both new cases
fail while the existing 11 pass; restore and confirm 13 pass.

### Existing suites

- The existing MentionInput tests must stay green: open on `@`, narrowing,
  arrows, Enter/press insertion, Escape and space closing, the double-callback
  guard, disabled, and the role checks.
- `dialog.test.tsx` must stay green (the claim is additive).

## 7. Commands and expected results

```sh
cd packages/components
nub run test                          # expected: 395 unit tests green
nub run test:behaviour                # expected: 49 files, 631 native tests
nub run check-types                   # expected: exit 0
cd ../..
nub run check                         # expected: check-tests, lint, fmt and types green
nub run test                          # expected: every workspace package green
```

## 8. STOP conditions

Stop and report with evidence if:

- the claim does not survive to the dialog's handler (then the runtime runs the
  field and the dialog in separate tasks; measure before adding a layer);
- a standalone mention list stops closing on `Escape`, or `Enter`/a press stops
  inserting (the claim must not change the field's own behaviour);
- the existing MentionInput tests fail for a reason other than the new
  interaction; do not weaken an assertion to get green.

## 9. Acceptance criteria

- One `Escape` closes an open mention list and leaves an enclosing dialog open;
  the next closes the dialog — from the field and from a focused row.
- Standalone `Escape`, `Enter`, presses and the focus contract are unchanged.
- The two new native tests fail on the pre-change source and pass after it.
- `docs/mention-input.mdx`, the `COMPONENTS.md` row, the plan index and `TODO.md`
  match the implementation and the real counts.
- `nub run check`, `nub run test` and `nub run lint` are green.

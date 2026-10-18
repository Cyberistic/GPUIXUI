# 379 — Inline edit commits when the user leaves the field

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `313` (inline edit), `326`/`327` (behaviour harness), `333`/`335` (docs truth), `347` §8.2 (the live finding) |
| Status | planned |

## 1. The problem

`InlineEdit` documents one commit rule: **Enter or blur** commits. The native
behaviour suite proves the blur path headlessly (`focusElement` dispatches a
blur). The playground then measured the shipped component **in a live window**
(plan `347` §8.2, 2026-10-18):

> React's `onBlur` does not run for a native focus change in a window. Clicking a
> sibling after entering edit mode left the editor open (the input stayed
> painted), while the headless renderer commits on blur.

So in the runtime users actually run, clicking away leaves the editor open. Only
Enter (commit) and Escape (cancel) complete the interaction; a pointer user who
clicks elsewhere is stuck in edit mode. This is a real interaction defect, not a
documented runtime limitation — the runtime does deliver `onMouseDownOutside`,
which every overlay in this package already uses (and the playground's live menu
and nav suites prove fires in a window).

Two more facts, measured on this host 2026-10-18 in the real `TestRenderer`:

| Probe | Result |
| ----- | ------ |
| edit, type, then click a **non-focusable** area | focus stays on the input, `onCommit` is **not** called (no blur is dispatched: the runtime only moves focus to another focus handle) |
| edit, type, then press `Tab` | the input keeps focus, no commit (the element sees the key; the renderer does not traverse, per the plan-140 note) |
| an `onMouseDownOutside` handler on a sibling | fires for a press on a third element (measured **2 calls** for a down/up pair; the commit guard already makes that harmless) |

The tab probe is the second half of the live contract: a keyboard user who tabs
out must also finish the edit, and in a window the native focus change does not
deliver React's blur either.

## 2. Scope

**In scope**

- `src/inline-edit.tsx`: commit on an outside press and on `Tab`, alongside the
  existing Enter/Escape/blur rule; compose the caller's `onMouseDownOutside`;
  update the module header and the inventory record's limitations.
- Three native tests in `src/behaviour/inline-edit.test.tsx`: outside press,
  `Tab`, and an inside press that must not commit.
- `docs/inline-edit.mdx`: the commit contract table, the live-window note, the
  stated test count, and the limitations.
- `COMPONENTS.md` row and its stated count.
- `TODO.md`, this plan, and the plan index.

**Out of scope — do not touch**

- No explicit commit/cancel buttons: Enter, Escape, Tab and a press outside now
  cover every finish path, and the playground's live twin already proves
  Enter/Escape in a window.
- No changes to `internal/key.ts` (`isTab` already exists) and no renderer
  changes.
- No `onBlur` removal: it still commits in the headless renderer and on any host
  that does deliver it; the new paths are additive.
- No change to the caller-owned value contract.
- No files outside `packages/components/`, `COMPONENTS.md`, `TODO.md` and this
  plan set.

## 3. Files and exact changes

### 3.1 `packages/components/src/inline-edit.tsx`

1. Import `isTab` from `./internal/key.js` (the module already imports
   `isDismiss` and `isEnter`).
2. Destructure `onMouseDownOutside` from the props (it currently rides in
   `...rest`).
3. In `handleInputKeyDown`, add the Tab branch **after** Enter:

   ```ts
   } else if (isTab(event)) {
     finish(true, false);
   }
   ```

   The focus goes wherever Tab takes it; do not pull it back to the display.

4. On the `<input>`, add the outside-press handler after `onBlur`:

   ```tsx
   onMouseDownOutside={(event) => {
     onMouseDownOutside?.(event);
     finish(true, true);
   }}
   ```

   `finish`'s `finished` guard makes the runtime's repeated dispatch (measured
   twice per down/up pair) call `onCommit` at most once.

   The `refocus: true` argument returns focus to the display when the press
   landed on a non-focusable area; when the press lands on another control, that
   control takes focus — both cases are asserted in §3.3. If measurement shows
   the display's refocus wins over a pressed control's focus, flip this argument
   to `false`, assert the pressed control keeps focus in test 1, and record the
   decision in the docs (STOP condition 4).

5. Update the module header: the commit rule becomes "Enter, `Tab` or a press
   outside commits; Escape cancels; an unchanged draft calls nothing. Blur still
   commits when the host delivers it."

6. Update `inlineEditMeta.limitations`: replace the `"blur commits; Escape
   cancels; ..."` entry with

   ```ts
   "Enter, Tab or a press outside commits; Escape cancels; a native blur that React does not deliver is covered by the outside-press path (measured live, plan 347 §8.2)",
   ```

### 3.2 `packages/components/src/behaviour/inline-edit.test.tsx`

Header comment: add the two bugs guarded — a live-window click-away leaving the
editor open (React's `onBlur` does not run for a native focus change), and a Tab
exit leaving the editor open.

1. Extend the `Harness` fixture with a **non-focusable** backdrop:

   ```tsx
   <div testId="backdrop" style={{ height: 120, width: 600 }}>
     Backdrop
   </div>
   ```

   No `tabIndex`, no role: pressing it moves no focus.

2. Add **three** tests (each fails on the pre-change code):

   - **commits when a press lands outside the field** — start editing, type
     `"outside"`, `nativeSimulateMouseDown`/`Up` at the backdrop's centre, then
     assert `onCommit` was called once with `"outside"`, the input is gone, and
     `focusedTestId` is `some("name")` (the display). Pass a host
     `onMouseDownOutside` spy through `Harness` and assert it was called, proving
     caller composition.
   - **commits on Tab so a keyboard exit closes the editor** — start editing,
     type `"tabbed"`, `simulateKeystrokes("tab")`, then assert one commit with
     `"tabbed"` and no input. If `simulateKeystrokes("tab")` is consumed before
     the input (measured once, then decide), dispatch it with
     `nativeSimulateKeyDown(input.id, "tab")` instead; do not change the
     component to chase the harness.
   - **does not commit when the press is inside the field** — start editing, type
     `"inside"`, press the centre of the input, then assert `onCommit` was not
     called and the input is still mounted.

3. Update the suite header's list of guarded bugs to include the two new ones.

### 3.3 `packages/components/docs/inline-edit.mdx`

1. In **The commit contract**, add two rows:

   ```
   | `Tab` in the input | commit the draft; focus moves on |
   | A press outside the field | commit the draft; the display takes focus back when the press did not land on another control |
   ```

2. Add a short paragraph under the table: 0.10.0 does not deliver React's
   `onBlur` for a native focus change in a live window (measured by the
   playground, plan `347` §8.2), so the outside press and `Tab` are the real
   leave-the-field paths; blur remains for hosts that deliver it.

3. **Limitations**: replace "Blur commits. If a consumer wants blur to cancel, it
   must not use this part." with a sentence covering the live blur gap and the
   additive paths.

4. **Verification**: `(11 tests)` → `(14 tests)` and name the three new cases.

### 3.4 `COMPONENTS.md`

- **Inline edit** row: append "commit on Enter, Tab or a press outside; the
  outside press and Tab are the live paths because 0.10.0 does not deliver
  React's `onBlur` for a native focus change, while blur still commits headlessly";
  change `11 native behaviour tests` to `14 native behaviour tests`.

### 3.5 `TODO.md`

Under **Tier 2 hardening after the inventory closed**, add and tick:

```
- [x] Inline edit commits when the user leaves the field: Tab and an outside
  press finish the edit, because a native focus change does not deliver React's
  `onBlur` in a live window — plan 379; 3 native tests (InlineEdit 14,
  behaviour 554), both-direction proof
```

### 3.6 This plan set

Add plan 379 to `.agents/slop/plans/README.md` with the final counts once every
gate passes, and record the playground interlock row as resolved in `TODO.md`
(interlocks table, owner components).

## 4. Commands and expected results

Run from `workspaces/components`.

```sh
nub run --filter @gpuixui/components check-types
# expected: exit 0

nub run --filter @gpuixui/components test
# expected: 37 files / 361 tests pass (no new unit tests; the inventory check
# picks up the new docs and COMPONENTS.md counts)

nub run --filter @gpuixui/components test:behaviour
# expected: 47 files pass; behaviour total 551 → 554 (InlineEdit 11 → 14)

nub run check
nub run lint
nub run test
# expected: exit 0
```

## 5. Both-direction proof

After the suite is green, prove each assertion can fail:

1. Remove the `onMouseDownOutside` handler from the input and run
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/inline-edit.test.tsx`
   from `packages/components`. Expected: "commits when a press lands outside the
   field" fails (`onCommit` never called; the input stays) — this is the measured
   old behaviour. Restore.
2. Remove the `isTab` branch. Expected: the Tab case fails. Restore.
3. Re-run the file: **14/14**.

Record the failing assertion names in the commit message body.

## 6. STOP conditions

Stop and report with evidence instead of improvising if:

- the runtime does not deliver `onMouseDownOutside` to the **input** (only to a
  sibling), so the press path cannot be owned by the field;
- the outside-press handler fires for a press **inside** the input, so it cannot
  distinguish leaving from editing;
- `simulateKeystrokes("tab")` neither reaches the input nor traverses, and
  `nativeSimulateKeyDown(input.id, "tab")` does not either — record the measured
  reality; do not add a window-level key listener just for a test;
- focus after the outside press cannot both (a) return to the display on a
  non-focusable press and (b) stay on a pressed control — then choose the
  non-stealing option, flip `refocus` to `false`, and update this plan and the
  docs before continuing;
- any file outside §3 must change;
- a gate fails twice for the same reason.

## 7. Acceptance criteria

- An edit finishes on Enter, Escape, `Tab` and a press outside the field; the
  unchanged-draft rule still applies; `onCommit` runs at most once per edit.
- A press outside on a non-focusable area returns focus to the display; a press
  on another control leaves focus there (whichever measurement §3.1 proves).
- The three new native tests fail on the pre-change code paths in §5 and pass
  after.
- Docs, inventory record, `COMPONENTS.md` (including the stated counts),
  `TODO.md` and the plan index are synced.
- `nub run check`, `nub run lint` and `nub run test` pass; no probe files remain.

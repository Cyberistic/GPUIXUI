# 764 — The editor's editing actions: clipboard and history, and the OTP paste path

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground workstream |
| Depends on | `188` (text entry), `197` (live a11y gap), `343` (pointer entry), `533` (input payload), `624` (live text entry), `054` (OTPField) |
| Feeds | the `input` capability row; the Text inputs, Text areas and OTP Field rows in `COMPONENTS.md`; every component that presents editable text |

## 1. Goal and the bug being guarded

The native `<input>`/`<textarea>` binds `Copy`, `Cut`, `Paste`, `Undo` and `Redo`
(`cmd-c`, `cmd-x`, `cmd-v`, `cmd-z`, `shift-cmd-z` on macOS), and every shipped
text surface inherits them. No scenario has ever pressed one of those chords.
The suite proves typing, carets, selections, `readOnly`, masking and autosize —
but a runtime that dropped the clipboard or history actions, or a view that
turned a single-line field into a multi-line one, would keep every check green.

The same gap leaves a shipped component half-proven. `OTPField`'s multi-character
path (`applyOtpInput`) is documented as the paste path, and `COMPONENTS.md` says
the multi-character fill is "proven only as a pure rule". The rule has never
received a real six-character edit.

This probe asserts the contract a component author depends on:

- **copy** writes the selected run to the clipboard; **cut** copies it and then
  deletes it in one change; **paste** inserts the clipboard text as **one**
  `onChange`;
- a **single-line** `<input>` replaces every pasted newline with a space, while a
  `<textarea>` keeps it;
- **`readOnly`** refuses paste, cut and undo, and a refused cut does **not**
  overwrite the clipboard;
- a copy with **no selection** writes nothing;
- **undo** reverses a contiguous single-character insert run as one step (the
  runtime coalesces within `UNDO_COALESCE = 700 ms`), **redo** restores it, and a
  new edit clears the redo stack; a multi-character paste is its own step;
- a **six-character paste into a one-time-code field** fills all six cells,
  fires `onComplete` once and moves focus to the last cell.

If the frame disproves any of these, record the measured rule and keep a check
that fails on the intended one (the plan-`156` precedent). Do not weaken a check
to match the runtime.

## 2. The measured source contract (read, do not guess)

| Fact | Source |
| ---- | ------ |
| The chords are bound for both `cmd` and `ctrl`; paste is bound only off-wasm | `~/GPUIXUI/references/gpuix/packages/native/src/custom_elements/input.rs:250-260` |
| `Copy` writes only when the selection is non-empty | `input.rs:1082-1088` |
| `Cut` returns early when `read_only` or the selection is empty; otherwise it copies **then** replaces the selection | `input.rs:1090-1096` |
| `Paste` propagates (does nothing) when `read_only` or the clipboard has no text; otherwise one `replace_text_in_range` | `input.rs:1098-1108` |
| `Undo`/`Redo` return early when `read_only` | `input.rs:1110-1128` |
| A single-line edit runs through `single_line_text`, which maps `\r\n`, `\r` and `\n` to a space | `input.rs:152-154`, used at `1544` and `1586` |
| `replace_text_in_range` emits exactly one `emit_change` per call | `input.rs:1536-1556` |
| Snapshots coalesce only when the edit kind matches, the anchor is adjacent and `elapsed < 700 ms` | `input.rs:76`, `607-634` |
| A multi-character insert is never a coalescing edit, so a paste is its own snapshot | `input.rs:595-610` |
| `restore` (undo/redo) emits a change | `input.rs:762-772` |
| An external value that matches a pending emitted value is ignored, so a controlled field's echo preserves its undo stack; an unrelated external value **clears** it | `input.rs:713-743` |
| The headless `VisualTestAppContext` wraps the **real** platform and delegates clipboard read/write to it | `~/GPUIXUI/references/gpui-ce/crates/gpui/src/app/visual_test_context.rs:16-18, 70-74, 344-352` |
| The fake in-memory clipboard belongs to `TestPlatform`, **not** to the visual test renderer | `~/GPUIXUI/references/gpui-ce/crates/gpui/src/platform/test/platform.rs:612-617` |

**Correction to the current records.** `COMPONENTS.md`'s OTP row says there is
"no clipboard simulation in the `TestRenderer`". There is no *simulation*: the
headless renderer uses the **real system pasteboard**. Consequences:

1. The probe must **copy before every paste** and must never depend on the
   clipboard's prior contents.
2. Both hosts overwrite the user's pasteboard. The scenario header comment must
   say so; there is no portable way to restore a rich clipboard.

`cmd-a` already works in both hosts (`text-entry`, `live-text-entry`), and both
hosts parse the chords with `Keystroke::parse`
(`automation.rs:269-282`, `visual_test_context.rs:227-234`), so no harness
change is needed.

## 3. Files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/editing-actions.tsx` | **create** — the view, the readouts and `editingActionsScenario` |
| `apps/playground/src/scenarios/index.ts` | import it and register it after `textEntryScenario` |
| `apps/playground/src/live/scenarios.tsx` | import it and add `liveEditingActions` to the live array |
| `apps/playground/README.md` | add the `editing-actions` / `live-editing-actions` row and the end-of-suite evidence paragraph |
| `COMPONENTS.md` | Text inputs, Text areas and OTP Field rows gain the measured contract; OTP row's "no clipboard" sentence is corrected |
| `TODO.md` | tick this task under the playground section and move the section count |
| `.agents/slop/plans/README.md` | add this plan's row and the number provenance |

No `packages/*` source changes. The probe measures the runtime and the shipped
component; it does not fix them.

## 4. The view (`editing-actions.tsx`)

One column, `560` px wide, with the same surface style as `text-entry`
(`colors.input`, `inputForeground`, `borderWidth.thin`, `radius.sm`). Every field
carries both `testId` and `aria-id` so the headless twin can read the native
editor's value; the live twin reads the readouts.

| testId | element | props | purpose |
| ------ | ------- | ----- | ------- |
| `edit-source` | `<input>` | `readOnly`, `value="one two"` | copy a known run; copy must work in a read-only field |
| `edit-target` | `<input>` | controlled `target`, `onChange` sets value **and** increments `targetEvents` | paste, replace, normalization |
| `edit-cut` | `<input>` | controlled `cut`, `onChange` sets value and `cutEvents` | cut deletes one run |
| `edit-locked` | `<input>` | `readOnly`, `value="locked"`, `onChange` increments `lockedEdits` | paste/cut/undo refusal |
| `edit-area-source` | `<textarea>` | `readOnly`, `value={"a\nb"}` | copy a two-line run |
| `edit-area` | `<textarea>` | controlled `area` | a paste keeps the newline; undo reverses it |
| `edit-undo` | `<input>` | controlled `undo` | coalescing, redo, atomic paste |
| `edit-otp-source` | `<input>` | `readOnly`, `value="123456"` | copy a six-digit code |
| `edit-otp` | `OTPField` | `length={6}`, controlled `code`, `onChange`, `onComplete` increments `otpCompletes`, `label="Code"` | the shipped paste path |

Readouts (each a `<text>` with its own `testId`, so a value with spaces is read
exactly and never parsed):

| testId | text |
| ------ | ---- |
| `edit-target-value` | `target` |
| `edit-target-events` | `String(targetEvents)` |
| `edit-cut-value` | `cut` |
| `edit-cut-events` | `String(cutEvents)` |
| `edit-locked-events` | `String(lockedEdits)` |
| `edit-area-value` | `Str.replaceAll("\n", "|")(area)` |
| `edit-undo-value` | `undo` |
| `edit-otp-value` | `code` |
| `edit-otp-completes` | `String(otpCompletes)` |

The header comment must state the pasteboard side effect:

> This probe copies from its own fields before every paste. On this host the
> offscreen renderer and the real window both use the **system** pasteboard, so
> running it replaces the user's clipboard contents.

## 5. Steps (headless `editing-actions`)

Use the `probes.ts` helpers (`read`, `readoutNumber`, `ariaOf`) and the
`text-entry` pattern for native values. Each numbered line is at least one
assertion; the runner records more (bounds/a11y lookups), so read the printed
count rather than predicting it.

1. **Copy.** Click `edit-source`; `cmd-a`; `cmd-c`. Assert the source's native
   (a11y) value is `one two` before the copy.
2. **Paste once.** Click `edit-target`; `cmd-v`. Assert the readout and the native
   value are `one two`, `targetEvents` is `1`, and focus is `edit-target`.
3. **Paste over a selection.** `cmd-a`; `cmd-v`. Assert `one two` again and
   `targetEvents` is `2` (a paste counts once even when it replaces a run).
4. **Cut.** Click `edit-cut`; `cmd-a`; `cmd-x`. Assert the value and the native
   value are empty and `cutEvents` is `1`.
5. **Paste the cut run.** Click `edit-target`; `cmd-a`; `cmd-v`. Assert `cut me`
   and `targetEvents` is `3`.
6. **Copy two lines.** Click `edit-area-source`; `cmd-a`; `cmd-c`.
7. **Single-line normalization.** Click `edit-target`; `cmd-a`; `cmd-v`. Assert
   `a b` (not `a\nb`) and `targetEvents` is `4`.
8. **Textarea keeps it.** Click `edit-area`; `cmd-v`. Assert the readout is
   `a|b` and the native textarea value is `a\nb`.
9. **Undo the paste.** `cmd-z`. Assert the readout is empty.
10. **Read-only refuses paste.** Click `edit-locked`; `cmd-a`; `cmd-v`. Assert
    focus is `edit-locked`, its native value is still `locked`, and
    `lockedEdits` is `0`.
11. **Read-only refuses cut.** `cmd-x`. Assert the native value is still
    `locked` and `lockedEdits` is `0`.
12. **A refused cut and an empty copy leave the clipboard alone.** Click
    `edit-target` (no selection); `cmd-c`; click `edit-area`; `cmd-v`. Assert
    the readout is `a|b` — the clipboard is still the two-line run from step 6.
    Then `cmd-z` and assert empty.
13. **Coalescing.** Click `edit-undo`; type `a b c` as one key call. Assert
    `abc`. `cmd-z` → empty (one run, not three). `cmd-shift-z` → `abc`.
    Type `d` → `abcd`; `cmd-z` → `abc` (a new edit clears redo).
14. **A paste is one step.** `cmd-v` (clipboard is still `a\nb` → `a b`). Assert
    `abca b`; `cmd-z` → `abc`.
15. **OTP paste.** Click `edit-otp-source`; `cmd-a`; `cmd-c`. Click
    `edit-otp-cell-1`; `cmd-v`. Assert `edit-otp-value` is `123456`,
    `edit-otp-completes` is `1`, focus is `edit-otp-cell-6`, and the
    accessibility nodes `TextInput "Code digit 1"` / `"Code digit 6"` report
    `1` / `6` (the distribution reached the DOM, not just React state).

Do not add a new key chord beyond `cmd-a/c/x/v/z` and `shift-cmd-z`.

## 6. The live twin (`live-editing-actions`)

`capability: "input"`, `view: editingActionsScenario.view`,
`ready: "edit-source"`. The live renderer exposes no a11y value (plan `197`), so
every value assertion reads a readout via `textOf`, waiting with
`waitForText`/`waitForTextNot` (three-second retry) after each chord; focus comes
from `focusedOf`. `settle` between steps.

Repeat steps 2, 3, 5, 7, 8, 10, 13, 14 and 15. The live twin is deliberately
shorter: it proves the chords reach the system pasteboard and the native
history in a real window; the full matrix stays headless. Add one screenshot at
the end (`LIVE_ARTIFACTS/live-editing-actions.png`).

Live coalescing warning from plan `624`: send **at most three** keys in one
`ctx.host.key` call. `a b c` is fine; do not send a 40-key batch.

## 7. Mutation and reverse proofs (observe, then revert)

A mutation must fail **by name**; a mutation that passes means the check is not
load-bearing and must be replaced. Record the exact strings in the results.

- **M1 — remove `readOnly` from `edit-locked`.** Steps 10 and 11 must fail: the
  paste lands (`a b`, `lockedEdits` 1).
- **M2 — remove the `setTargetEvents` increment.** Step 2 must fail
  (`expected "1", got "0"`).
- **M3 — change `edit-target` from `<input>` to `<textarea>`.** Step 7 must fail
  (`expected "a b", got "a|b"`), proving the single-line rule is asserted.
- **M4 — skip the `cmd-a`/`cmd-c` in step 15.** The clipboard still holds
  `a\nb`, so the OTP edit normalizes to `ab`; the value and `onComplete` checks
  must fail.
- **M5 — render `edit-source` with `value="changed"` while the constant stays
  `one two`.** Step 1 must fail (`expected "one two", got "changed"`), proving
  the source is read from the native editor.
- **R1 — insert `Effect.sleep(800 ms)` between `a`, `b`, `c` in step 13.** The
  first undo must yield `ab`, not empty; this proves the check measures
  coalescing rather than assuming it. **Measured:** in the headless renderer
  this is a **null result** — `Effect.sleep` does not advance the
  `VisualTestAppContext` clock, so all three edits still share one virtual
  instant. The reverse proof belongs to the **live** twin, where the platform
  clock is real and the same 800 ms gap yields `u=ab`.
- **R2 — replace `cmd-shift-z` with a second `cmd-z` in step 13.** The redo
  assertion must fail (the second undo leaves empty); this proves redo is the
  restoration, not a no-op.

M1–M5 are source mutations; R1–R2 are reverse proofs of an assumption. Revert
every one and re-run green. **M5's first form — changing the constant to
`one two three` — is a null result**, because the assertions interpolate the
constant. Record that honestly and use the rendered-value form instead.

## 8. Commands and expected results

```sh
nub run --filter playground build                       # exit 0
nub apps/playground/dist/smoke/run.js --list | wc -l    # previous total + 1
nub apps/playground/dist/smoke/run.js --only editing-actions
# expected: 1/1, exit 0; record the printed check count
nub apps/playground/dist/live/run.js --only live-editing-actions
# expected: 1/1, exit 0, one window; record the check count
nub apps/playground/dist/smoke/run.js                   # end-of-task: 112/112, exit 0
nub run check && nub run lint && nub run test
```

The live registry goes `100 → 101`. The headless registry goes `111 → 112`.
Do **not** run the full live suite: it is the merge gate and is not needed for a
single live twin.

If `--only` exits `2`, there is no binding on this host — that is not evidence.

## 9. STOP conditions

- **Paste reads nothing** (target stays empty after `cmd-v`): stop. Record that
  the renderer's clipboard is unavailable on this host and do not register a
  scenario that asserts paste. This is a harness limitation, not a green check.
- **The clipboard write is asynchronous** (the first paste observes the
  previous contents, a later one works): stop and report; do not add sleeps to
  hide a race.
- **Undo does not coalesce** (the first undo yields `ab`): keep the probe and
  assert the **measured** number of steps, with the source `UNDO_COALESCE`
  quoted. Do not claim coalescing.
- **`readOnly` accepts a paste** or the cut overwrites the clipboard: this is a
  real finding. Keep the probe, assert the measured behavior by name, and add a
  cross-team task; do not delete the fixture.
- **OTP paste fills fewer than six cells** or `onComplete` fires twice: record
  the exact value/focus and treat it as a component defect. Do not special-case
  the test.
- The view paints nothing or a field is missing from `bounds`: fix the layout;
  never skip a field to make the suite green.

## 10. Ledgers and docs to update

- `TODO.md`: add this task, tick it, and keep the section header count current.
- `COMPONENTS.md`:
  - **Text inputs** — the clipboard/history contract, the one-change-per-paste
    fact, the single-line newline rule, and the real-clipboard correction.
  - **Text areas** — a pasted newline is kept and one undo reverses the paste.
  - **OTP Field** — replace "no clipboard simulation … proven only as a pure
    rule" with the measured six-character paste (value, `onComplete`, focus,
    DOM cells).
- `apps/playground/README.md`: the scenario table and the end-of-suite counts.
- `.agents/slop/plans/README.md`: the `764` row, status **landed** once the
  gates pass; the provenance sentence.

## 11. Acceptance

- `editing-actions` and `live-editing-actions` green, focused, twice each.
- Five source mutations fail by name and two reverse proofs are observed; all
  reverted.
- Full headless registry **112/112**, exit `0`; live registry **101** (focused
  twin only).
- `nub run check`, `nub run lint`, `nub run test` green.
- Ledgers updated; nothing in `packages/*` changed.

## 12. Results

Host: `darwin-x64`, `@gpuix/native 0.10.0` (gpuix `9fcd6288`, zed `81c99f81`,
runtime shaders). Both focused runs were green **twice** before the mutations.

| Suite | Scenarios | Checks | Duration | Exit |
| ----- | --------- | ------ | -------- | ---- |
| headless `editing-actions` | 1/1 | **46** | 571 ms | 0 |
| live `live-editing-actions` | 1/1 | **73** | 4.9 s | 0 |
| full headless registry | **112/112** | **4152** | 65 capabilities, 339.8 s | 0 |

The headless total is exactly `4106 + 46`; the live registry goes `100 → 101`
and the derived live total `2860 + 73 = 2933`. The full live suite was **not**
run (merge gate).

### Measured rules

- **The clipboard is the real system pasteboard in both hosts.** The headless
  renderer wraps the platform, so `cmd-c` before every paste is mandatory and
  both hosts replace the user's clipboard. Step 12 (`cmd-c` with no selection,
  then paste) confirms the empty copy writes **nothing**: the two-line run from
  step 6 is still there.
- **One paste is one change.** Six characters into `edit-target` and six into
  the OTP field each produced exactly one `onChange`; pasting over a selection
  counts once more (`targetEvents` 1 → 2).
- **The single-line rule is real and asymmetric.** `a\nb` → `a b` in the
  `<input>`, `a\nb` in the `<textarea>`, and one undo reverses the whole paste.
- **`readOnly` is enforced natively for all three actions.** Paste, cut and undo
  each left the value at `locked` with `lockedEdits` at `0`, and the refused cut
  did not overwrite the clipboard.
- **Coalescing is `700 ms` of real time, so it is live-only.** Contiguous `abc`
  undoes as **one** step and `shift-cmd-z` restores `abc`; a new `d` clears the
  redo stack. An 800 ms gap **headless** is a null result — the
  `VisualTestAppContext` clock is virtual and `Effect.sleep` does not advance it,
  so the same probe **live** yields `u=ab`.
- **The OTP distribution reaches the DOM.** Pasting `123456` sets the value,
  fires `onComplete` once, focuses cell 6, and the a11y cells report `1` / `6`.
- **A value-based wait cannot observe an idempotent paste.** The live twin's
  second paste matches the stale text, so `waitForEdit` waits on
  `edit-target-events == "2"` instead — the event counter is the observable.
- **Layout:** the OTP row was below the live `1100 × 720` fold in one column;
  the view is now two columns (640 wide, 240 / 360), so every field is painted.
  No field was skipped.

### Mutation and reverse proofs (observed, then reverted)

| Probe | Result |
| ----- | ------ |
| M1 remove `readOnly` from `edit-locked` | `the refused paste reports no change: expected "0", got "1"` (exit 1). The **value** check still passes because the controlled prop resets native text — the event counter is the load-bearing assertion |
| M2 drop the `setTargetEvents` increment | `a paste reports one change…: expected "1", got "0"` (exit 1) |
| M3 make `edit-target` a `<textarea>` | `a single-line field turns a pasted newline into a space: expected "t=a b", got "t=a<newline>b"` (exit 1) |
| M4 skip the OTP `cmd-a`/`cmd-c` | `a pasted code fills the field: expected "o=123456", got "o=ab"` (exit 1) |
| M5 render `edit-source` as `value="changed"` | `the copy source exposes its run: expected "one two", got "changed"` (exit 1). The first form — changing `READ_ONLY_SOURCE` — was a **null result**: the assertions interpolate the constant |
| R1 800 ms gaps between `a`,`b`,`c` | headless **null** (virtual clock); live fails `one live undo reverses a coalesced run: expected "u=", got "u=ab"` (exit 1) |
| R2 `shift-cmd-z` → second `cmd-z` | `redo restores the run: expected "u=abc", got "u="` (exit 1) |

Every mutation was reverted and the tree rebuilt green.

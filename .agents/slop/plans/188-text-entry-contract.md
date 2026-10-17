# 188 — The native text-entry contract: caret, selection, paste, masking and autosize

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §9) |
| Phase | B (feasibility) → feeds C (Tag input, Inline edit, Search and replace), D (date entry) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `160` |
| Feeds | `@gpuixui/primitives` `Input`/`TextArea`/`NumberField`/`OTPField`, and every future text-bearing component |

## 1. Goal

The suite proves that a field receives keystrokes (`input-edit`) and that the
shipped `Input`/`TextArea` are themed and guarded (`primitives-fields`, plan
`025`). It does **not** answer what the native editor does *inside* a field, and
five component families are built on that:

| Component family | Needs to know |
| ---------------- | ------------- |
| Search input, inline edit | does the caret move, can a whole value be selected and replaced |
| Tag / token input | does Backspace on an empty field arrive, does typing insert mid-value |
| Date / time picker | does typed digit entry replace or append |
| Search and replace | is a programmatic "replace" only app state, or is there a native text command |
| Password / secret field | **is any entry surface masked**, and does the accessibility tree expose the plaintext |

There is also a concrete money-and-security question the inventory cannot
answer from types alone: `InputProps` is `{ value, placeholder, readOnly,
theme }` — no `type`, no `secureTextEntry`, no `maxLength`. If the native editor
paints and announces what is typed, a password field cannot be built honestly,
and the library must say so instead of shipping a fake.

The probe measures, with numbers:

1. Does typing update the **native editor's own value** (the accessibility
   dump's `value`), not only the React `onChange` payload?
2. Do Left/Right/Home/End move the caret, and does typing insert at it?
3. Does `shift-left`/`shift-right` extend a selection, and does typing replace it?
4. Does `cmd-a` select the whole value, and does typing replace it?
5. Does Backspace/Delete delete one character, and is an empty field safe?
6. Does `readOnly` refuse the edit but keep focus (`copyable` display field)?
7. Does a placeholder paint, and does it disappear once text exists?
8. Does a `<textarea>` grow with its content between `minRows` and `maxRows`?
9. Does a fixed-width `<input>` keep its width for a long value (clip, not grow)?
10. Is typed text exposed in clear by the accessibility tree, i.e. **is there a
    masked input at all**?

## 2. Scenario `text-entry` (capability `input`)

One view, `apps/playground/src/scenarios/text-entry.tsx`. It reuses the existing
`input` capability: this is the same mechanism (`<input>` receiving input),
measured one layer deeper. `Smoke.CAPABILITIES` and the registry's
`CORE_CAPABILITIES` do not change, so the report's capability line is unchanged
and the suite goes **55 → 56**.

### 2.1 The tree

```
<div column width=560>                                  testId="entry-root"
  <text>Native editor</text>
  <input                                                testId="entry-native"
    aria-id="entry-native"
    placeholder="name"                                  (no value prop)
    onChange -> setNative(event.value ?? "") + events++
    style width 240, themed input surface
  />
  <input                                                testId="entry-controlled"
    aria-id="entry-controlled"
    value={controlled} onChange -> setControlled(...)
    style width 240
  />
  <input                                                testId="entry-readonly"
    aria-id="entry-readonly"
    value="locked" readOnly
    style width 240
  />
  <input                                                testId="entry-secret"
    aria-id="entry-secret"
    placeholder="password"                              (no value prop)
    onChange -> setSecret(event.value ?? "")
    style width 240
  />
  <input                                                testId="entry-wide"
    aria-id="entry-wide"
    style width 160
  />
  <textarea                                             testId="entry-area"
    aria-id="entry-area"
    value={note} onChange -> setNote(...)
    minRows={2} maxRows={6}
    style width 240
  />
  <Readout testId="entry-readout">
    native=<native> events=<n> controlled=<controlled> secret=<secret>
    note=<note with \n replaced by |> areaH=<number>
  </Readout>
</div>
```

`areaH` is the textarea's painted height, read from
`useGpuix().renderer.getElementBounds(areaId)` after every change (the same
`ref` route plan `184`/`186` measured: a `ref` gives a `PublicInstance.id`). The
view is mounted once; the smoke steps drive it.

The inputs are **deliberately uncontrolled where the measurement is about the
editor** (`entry-native`, `entry-secret`, `entry-wide`): the accessibility dump
then reports what the native editor holds, not what React echoes back. The
controlled fields are the React half of the contract.

**Why `aria-id` matters.** `nodeFor(tree, "entry-native")` addresses the node by
the authored id; `fieldText(aria.value)` reads it. This is the same channel
`a11y-tree` uses for its `TextInput` (`value`, `placeholder`).

### 2.2 Steps

Every step starts by clicking the field it drives, then sends keys through
`ctx.host.key`. Where a step's expectation depends on a runtime capability that
has never been measured (cmd-a, shift-arrow), the plan states a **control
reading first, then the assertion** — see §6 for the rule when the expectation
does not hold.

| # | Action | Read | Assertion |
| - | ------ | ---- | --------- |
| 1 | click `entry-native`; keys `a b c` | `value` from the a11y node, `native=` from the readout, `events` | the native editor holds `abc` **and** `onChange` reported `abc`; `events=3` |
| 2 | keys `left left` then `X` | value | `aXbc` — the caret moved and typing inserted at it |
| 3 | keys `home` then `Y` | value | `YaXbc` — Home is the line start |
| 4 | keys `end` then `Z` | value | `YaXbcZ` — End is the line end |
| 5 | keys `backspace` | value | `YaXbc` — Backspace deletes one character |
| 6 | keys `shift-left shift-left` then `Q` | value | `YaXQ` — the selection extended left and typing replaced it (if shift-arrow selects; §6) |
| 7 | keys `cmd-a` then `W` | value | `W` — select-all then replace (if cmd-a selects; §6) |
| 8 | keys `backspace backspace` | value | `` — deleting the last character leaves an empty, working field |
| 9 | click `entry-readonly`; keys `n o` | `focused`, value | focus is `entry-readonly`, its value is still `locked`; the a11y `value` is also `locked` |
| 10 | click `entry-secret`; keys `h u n t e r 2` | a11y `value`, readout `secret` | the **plaintext** `hunter2` is the editor's value and is exposed by the accessibility tree |
| 11 | click `entry-wide`; keys 40 characters (`a` × 40) | `bounds.width` before and after | the width stays `160 ± 1` — a long value clips instead of growing the field |
| 12 | placeholder, before typing into `entry-native` | `paintedText` | `name` is painted while the field is empty; after step 1 it is gone |
| 13 | textarea: click `entry-area`; keys `o n e` | `areaH` | the height is the `minRows` height (two rows) and has not grown |
| 14 | keys `enter`, `t w o`, `enter`, `t h r e e`, `enter`, `f o u r` | `areaH`, `note` | the height grew (row count followed content) and the value holds four lines |
| 15 | `en`… keep adding lines past six | `areaH` | the height stops at `maxRows` (six rows) — the textarea scrolls instead |

Steps 12 and 13 are ordered as separate clicks because the placeholder
measurement needs the empty field, and step 1 already typed into it; the plan's
executor may reorder 12 before 1 and record the final order in §9. The checks
must not depend on order beyond what the readout states.

### 2.3 Checks that are anticipated, not assumed

The runtime editor may not implement `cmd-a`, `shift-arrow`, Home/End or
autosize. The **control reading** is taken first: run the scenario once with the
readouts, and put the measured values in §9. Then:

- if the runtime does it, the assertion stays as written;
- if it does not, the assertion encodes the measured truth (e.g. "shift-arrow
  does not extend a selection: typing appended") **and** the limitation is
  recorded in `COMPONENTS.md` under Text inputs, with the component rule that
  replaces it (e.g. an inline edit selects by replacing on the first keystroke).

An expectation is never deleted to make the suite green; it is replaced by the
measured fact, and the two-direction proof in §5 must still fail when the
measured fact is deliberately violated (see the note under §5).

## 3. Files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/188-text-entry-contract.md` | this plan; append §9 after implementation |
| `apps/playground/src/scenarios/text-entry.tsx` | **new** — the probe |
| `apps/playground/src/scenarios/index.ts` | import + append after `inputScenario` |
| `COMPONENTS.md` | Text inputs / Text areas rows gain the measured editor contract; a "no masked entry" note in *Not provided — needs real implementation*; suite `55 → 56` |
| `TODO.md` | tick the new task; add cross-team tasks for `@gpuixui/primitives` if §9 changes an `Input`/`TextArea` assumption |
| `PLAN.md` | a decision row only if the masking verdict or the autosize verdict is load-bearing (§9 decides) |
| `.agents/slop/plans/README.md` | index row for `188` |
| `apps/playground/README.md` | a `## Text entry (plan \`188\`)` section and the new count |

No `packages/testing` change: the host already exposes everything the probe
needs (`key`, `bounds`, `a11y`, `paintedText`, `focused`, `paintedStyle`).

## 4. Commands and expected results

From the worktree root:

```sh
nub run --filter playground build
# expect: exit 0

nub apps/playground/dist/smoke/run.js --only text-entry
# expect: exit 0 on the final probe; capabilities: input=verified
# (a first run with readouts may fail checks — that run is the measurement)

nub apps/playground/dist/smoke/run.js
# expect: 56/56, exit 0

nub run check
nub run lint
nub run test
# expect: all exit 0
```

After each mutation in §5, restore the file, then rebuild **in a later second or
with `--force`** — tsc's incremental build can miss a same-second edit (plan
`186` hit this):

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js --only text-entry
# expect: exit 1 and the named check failing
```

Screenshots (optional, artifacts are gitignored):

```sh
nub apps/playground/dist/smoke/run.js --only text-entry --screenshots
# expect: .artifacts/screenshots/text-entry.png
```

## 5. Two-direction proof

Each positive check gets a mutation that must make it fail. Where §2.3 found a
negative (the runtime does not implement a key), the mutation adds a small
component-side handler that *emulates* it, so the encoded fact is still
falsifiable.

| # | Mutation | Must fail |
| - | -------- | --------- |
| M1 | delete the two `left` keys before `X` in step 2 | *the caret inserted mid-value*: got `abcX` |
| M2 | replace `home` with `right` in step 3 | *Home moves to the line start*: got `YaXbc` appended |
| M3 | make `entry-readonly` non-read-only | *readOnly refuses the edit*: got `lockedno` |
| M4 | set the textarea `maxRows={2}` | *the textarea grows with its content*: height unchanged |
| M5 | give `entry-wide` `width: "auto"` / no width | *a fixed-width input clips a long value*: width grew |
| M6 | remove `placeholder="name"` | *the placeholder paints while empty*: no `name` in `paintedText` |
| M7 | select-all is negative: add `onKeyDown` that clears the active range on `cmd-a` | *the measured select-all fact*: value differs |
| M8 | shift-arrow is negative: add `onKeyDown` that deletes the previous character while `shift` is held | *the measured selection fact*: value differs |

M7/M8 are written only if §9 records those capabilities as absent; otherwise the
ordinary mutation (drop the `cmd-a`/`shift-left` keys) is used. Every mutation
run records its exit code and the failing label in §9.

## 6. STOP conditions

- **No binding** (`exit 2`): report the preflight output; do not mark the plan
  landed.
- **The accessibility `value` does not track typing** on an uncontrolled
  `<input>` (step 1 reads a stale or empty `value`): stop asserting through the
  dump. Switch to a controlled field and read the React value, record the
  limitation in §9, and re-scope the caret/selection checks to outcomes visible
  in the controlled value — they are the same measurements, only the observer
  changes. Do not invent a second measurement path.
- **`cmd-a`/`shift-left`/`home`/`end` are rejected by the keystroke parser**
  (the run throws from `Keystroke::parse`): record the exact error, remove that
  step from the scenario, and document the key vocabulary the harness supports.
  Do not alias keys to fake the behaviour.
- **The textarea's height cannot be read** (`getElementBounds` returns null for
  `entry-area`): record it, and assert the row growth through `maxRows`' only
  observable consequence (the bounds of the readout below the textarea shifting)
  or drop the autosize claim into `COMPONENTS.md` as unverified with the reason.
- **Typing a long value changes the input's own bounds**: record the measured
  width and encode "the field grows" instead; the component then owns a fixed
  width on the wrapper.
- Any measurement that contradicts an existing `COMPONENTS.md` claim: fix the
  claim in the same commit, with the scenario id as the evidence.

## 7. Test plan

The scenario is the test: 20–30 checks, each holding a measured fact, and §5's
eight mutation proofs give it a failing direction. `nub run test` additionally
covers the registry integrity test (`scenarioProblems`) and the runner's pure
tests; a duplicate id, an unknown capability or a duplicate `--only` selection
still fails there.

The report must show `input=verified` **before and after** the new scenario, and
the suite count moves `55 → 56`. No other scenario's result may change: the
scenario is mounted under the keyed `Fragment` (plan `182`), so it starts from a
fresh tree.

## 8. Security note (why this plan is not just ergonomics)

If step 10 finds the plaintext in the accessibility dump and the painted frame
with no masking prop in the typed API, then:

- a password input **cannot** be implemented honestly in GPUix 0.10.0 — hiding
  the characters with a controlled `value` does not work (the native editor
  owns the text, and `onChange` reports the masked string back, so the caret and
  the value desynchronise), and a `visibility: "hidden"` field loses its tab
  stop and its focus path;
- the honest alternatives are: do not accept secrets in a GPUix surface, or take
  them through an OS-native prompt owned by the app's platform layer;
- the library must not ship a `PasswordInput` that renders bullets over an
  editable field and calls it masked.

This is a documented limitation with evidence, not a decorative placeholder.

## 9. Measured facts (2026-10-17, this host, locally built 0.10.0 binding, ADR 0003)

Scenario `text-entry`, capability `input`, **56 checks**, suite `55 → 56`,
exit `0`.

**The accessibility `value` is the authored prop, not the live editor.** An
**uncontrolled** `<input>` (no `value`) reported `value: none` in the dump after
`abc` was typed, while `onChange` reported `abc` — so the dump cannot observe an
editor that diverges from its prop. Every value assertion here therefore reads a
**controlled** field: its authored value is React's echo of the editor, which is
also what `getPaintedText` shows. This is the reason the plan's first STOP
condition fired, and the reason a component test must assert `onChange` (and
paint) rather than the dump for live text. An **empty** field omits `value`
entirely, so the probe reads an absent value as `""`; every non-empty reading is
its own check.

**Typing and the placeholder.** One `onChange` per character (`events=3` for
`abc`), each carrying the accumulated value. The placeholder is both exposed
(`placeholder: "enter name"`) and **painted**, and it stops painting as soon as
text exists.

**Caret and selection — all supported natively.** Left twice then `x` gave
`axbc`; `home` + `0` gave `0axbc`; `end` + `9` gave `0axbc9`; `backspace`
removed one character; `shift-left` twice + `q` replaced exactly the selected
`bc` (`0axq`); `cmd-a` + `w` replaced the whole value (`w`). Deleting the last
character leaves a working empty field, and a second Backspace is a safe no-op.
So a search box, inline edit, tag input or date field can rely on the native
editor for caret and selection instead of re-implementing text handling.

**`readOnly` is enforced by the native editor, not only by a handler guard.**
The field takes and keeps native focus, its value stays `locked`, and **no
change event fires** (`lockedEdits=0`); removing `readOnly` fired two
(`lockedEdits=2`). A read-only display field is honest.

**There is no masked entry surface.** `InputProps` is
`{ value, placeholder, readOnly, theme }` — no `type`, no `secureTextEntry`, no
mask. The typed secret is held **in clear** (`s3cr3t9` in the a11y `value`) and
**painted in clear** (`getPaintedText` contains the string; the readout reports
only its length, so the paint can only come from the field). A password input
cannot be built honestly on 0.10.0; masking with a controlled `value` would be
overwritten by the next `onChange`, and hiding the field removes its tab stop and
focus path. The alternatives are an OS-native prompt owned by the app, or not
accepting secrets in a GPUix surface.

**A fixed-width field clips.** 40 characters left the field at `158` px before
and `158` px after; `width: "auto"` also measured `158` (it fills rather than
grows with content), so the component owns the field's width.

**Textarea autosize is real and exact.** `minRows={2}` painted `64` px; four
lines `116`; six lines `168`; seven lines `168` (clamped at `maxRows`, then it
scrolls). That is 26 px per line above a 12 px base — a prompt composer or
comment box can grow between two and six rows with no measurement code of its
own.

**Harness note:** a synthetic keystroke's character ignores Shift — `shift-1`
produced `1`, not `!`. The probe uses plain characters only; punctuation that
needs a shifted key cannot be typed through `simulateKeystrokes`.

Two-direction proofs (file restored after each run):

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | drop the two `left` keys before `x` | exit `1`, *Left moves the caret, and typing inserts at it*: got `abcx` |
| M2 | `home` → `right` | exit `1`, *Home moves to the start*: got `axb0c` |
| M3 | remove `readOnly` from the locked field | exit `1`, *readOnly refuses the edit, so no change is reported*: got `lockedEdits=2` |
| M4 | `maxRows={2}` | exit `1`, *the textarea grows with its content*: got `false` |
| M5 | size the wide field from its value length | exit `1`, *a fixed-width field clips…*: expected `158 ± 1`, got `318` |
| M6 | remove the placeholder | exit `1`, *the empty field exposes its placeholder*: got `none` |
| M7 | `cmd-a` → nothing (append instead of replace) | exit `1`, *select-all then typing replaces the whole value*: got `0axqw` |
| M8 | `shift-left` → `left` | exit `1`, *a selection replaced by typing…*: got `0axqbc` |
| M9 | make the secret field `readOnly` | exit `1`, *the editor holds the typed secret in clear*: got `""` |

**Action for the library.** Use the native editor for caret/selection/delete on
every text-bearing component; do not ship a `PasswordInput`; keep `readOnly`
for copyable display fields; give a fixed-width field an explicit width and
let it clip; use `minRows`/`maxRows` for autosize rather than measuring the
textarea.

## 10. Acceptance criteria

- `--only text-entry` exits `0`; the full suite is 56/56.
- §9 records every fact above with a number or a string from the readouts.
- `COMPONENTS.md`'s Text inputs and Text areas rows cite `text-entry` for the
  editor contract, the masking verdict is recorded with its evidence, and the
  suite count is current.
- Each check either states a measured capability or an evidenced limitation —
  no check asserts a behaviour the runtime does not have.
- §5's mutations each fail with the named label, and the file is restored after
  each run.
- `nub run check`, `nub run lint` and `nub run test` are green.

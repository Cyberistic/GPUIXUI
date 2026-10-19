# 570 — The shipped Tier 1 controls in a real window

**Owner:** playground workstream (`apps/playground`, `packages/testing`).
**Depends on:** `168` (Tier 1 primitives headless), `169` (choice/entry
controls headless), `189` (live window), `190` (live focus), `197` (live
observation), `343`/`536` (live pointer entry), `554` (published popups live),
`557` (declared states live), `565` (the most recent live twin).
**Phase:** F — live evidence for the foundation every component sits on.

## 1. Why

Plans `168` and `169` proved the **shipped** `@gpuixui/primitives` controls —
`Button`, `Toggle`, `Input`, `Checkbox`, `Switch`, `Select`, `Slider`,
`Progress`, `Meter`, `Skeleton`, `Tooltip`, `RadioGroup`, `Rating`,
`NumberField`, `OTPField` — but only in the offscreen `TestRenderer`. The live
suite proves the shipped **Tier 2** catalogue (plans `331`, `344`–`347`) and the
published popups (plan `554`), and it has repeatedly found that a real window
differs from the offscreen host in ways a component depends on:

- a click focuses natively **without** running React's `onFocus` (plan `345`);
- `onBlur` delivery is window-state dependent (plans `347`, `390`, `555`);
- events can arrive in **one React batch** (plans `199`, `347`);
- the live tree has no style and no accessibility dump (plan `197`).

Tier 1 is the foundation: every Tier 2–5 surface composes these controls. Their
pointer focus, key delivery, popup commit and focus advance have never been
observed in a window. This plan adds four live twins using the **same views**,
so the headless and live contracts drive one component.

The live twins deliberately assert only what a window can answer: painted text
(readouts and the trigger), painted bounds, native focus, keys and pointer
gestures. Style, colour and the a11y dump stay with the headless scenarios.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `primitivesFieldsScenario`/`primitivesDisplayScenario` and `primitivesChoiceScenario`/`primitivesEntryScenario`; add `live-primitives-fields`, `live-primitives-display`, `live-primitives-choice`, `live-primitives-entry` (`capability: "components"`); register all four |
| `apps/playground/src/scenarios/primitives.tsx` | the disabled-field edit counter (`locked`) and a quarter-track Slider click — two headless checks that could not fail before |
| `apps/playground/src/scenarios/primitives-advanced.tsx` | the radio click starts on the second row — the first-row click asserted the value it already had |
| `apps/playground/README.md` | a "the same five in a real window" subsection under the Tier 1 section (what each twin proves), and the live id count |
| `COMPONENTS.md` | the Button/Toggle/Input/Checkbox/Switch/Select/Slider/Progress/Meter/Skeleton/Tooltip/Radio/Rating/Number/OTP rows cite the live twins |
| `TODO.md` | the task ticked with the measured counts; progress/registry notes updated |
| `.agents/slop/plans/README.md` | index row for this plan |

No `packages/testing` change: every verb the twins need already exists
(`click`, `clickWindow`, `key`, `keyDown`/`keyUp`, `hover`, `focused`, `text`,
`bounds`, `paintedText`, `waitFor`, `screenshot`). No production component
change: the probes are the evidence, and a measured defect is recorded for the
owning workstream instead of patched here.

## 3. Implementation

All four scenarios live in `apps/playground/src/live/scenarios.tsx` beside the
other twins, reuse the headless views unchanged, and use the existing helpers
`settle`, `textOf`, `boxOf`, `focusedOf`, `waitForText`.

Every step settles before reading (the protocol has no frame boundary, D34). A
readout commit that can lag a React batch uses `waitForText` before the
assertion, so a check never reads a pre-commit frame.

### `live-primitives-fields` — `ready: "field-name"`

Reuses `primitivesFieldsScenario.view`.

1. click `field-name`, type `a t l a s` → `field-readout` contains `name=atlas`
   (a real click focuses the native editor and real keys reach `onChange`);
2. `enter` → `submits=1` (the shipped `Input`'s submit contract live);
3. click `field-locked` and type `x` → still `name=atlas` (the disabled field is
   `readOnly`, out of the tab order and refuses the edit);
4. click `field-check` → `checked=true`; Space on it → `checked=false` (the
   Checkbox's click and Space-up contract, the same `decideActivation` the
   button uses);
5. click `field-switch` → `paused=true`;
6. click `field-region` and settle → the painted text contains an option label
   (`Asia — South`); the shipped `Select` opens in the window;
7. `down` then `enter` → `region=us-east`, and `field-region` paints
   `United States — East`;
8. click `field-region`, `escape` → the option label is no longer painted and
   the value is kept (`region=us-east`).

### `live-primitives-display` — `ready: "display-quality"`

Reuses `primitivesDisplayScenario.view`.

1. click `display-quality` and read `display-quality-value`; assert the value is
   inside `0…100` (a real click on the track sets a value);
2. `right` → exactly one more; `left` → back to the clicked value (real key
   delivery to the focused slider);
3. `display-progress`, `display-meter`, `display-skeleton` each paint bounds;
   the skeleton's painted height is `14 ± 1` (the shipped skeleton is a real
   14 px box in the window);
4. hover `display-trigger` → the painted text contains `Booked revenue` (the
   shipped `Tooltip` wrapper, not the published component plan `554` used).

### `live-primitives-choice` — `ready: "choice-radio"`

Reuses `primitivesChoiceScenario.view`.

1. click the second radio row (`boxOf`, `y + height / 2`) → `cadence=weekly`
   (a real pointer selects an option);
2. `down` on `choice-radio` → `cadence=never`; `up` → `cadence=weekly`
   (the group's arrow move selects; the group handler sees the key through the
   focused item);
3. click the first row (`y + height / 6`) → `cadence=daily`;
4. click the first star of `choice-rating` (`x + 8`, `y + height / 2`) →
   `rating=1`;
5. `right` → `rating=2`; `end` → `rating=5`; `right` → stays `5` (clamp);
6. `delete` → `rating=0`; `left` → stays `0` (clamp).

### `live-primitives-entry` — `ready: "entry-quantity"`

Reuses `primitivesEntryScenario.view`.

1. click `entry-quantity`, `up` → `quantity=6`; `down` twice → `quantity=4`
   (a real click focuses the shipped number input and arrows step it);
2. type `9 9` then `enter` → `quantity=10` (the typed draft clamps to `max`);
   `down` → `quantity=9`;
3. click `entry-code-cell-1`, then type `1…6` **one digit per step with a
   settle**, because OTP focus advance is a React commit (plan `347`: keys in one
   batch coalesce) → `code=123456 complete=1`, and `focused` is
   `entry-code-cell-6`;
4. `backspace` on `entry-code-cell-6` → `code=12345`;
5. `left` → `focused` is `entry-code-cell-5`; type `7` → `code=12347`
   (the focused cell is rewritten).

## 4. Commands and expected results

```sh
nub run --filter playground build
# exit 0

nub apps/playground/dist/live/run.js --only live-primitives-fields
# 1/1 scenarios passed, exit 0

nub apps/playground/dist/live/run.js --only live-primitives-display
# 1/1, exit 0

nub apps/playground/dist/live/run.js --only live-primitives-choice
# 1/1, exit 0

nub apps/playground/dist/live/run.js --only live-primitives-entry
# 1/1, exit 0

nub apps/playground/dist/live/run.js --only live-primitives-fields,live-primitives-display,live-primitives-choice,live-primitives-entry
# 4/4, exit 0; capabilities: components=verified; four screenshots

nub apps/playground/dist/smoke/run.js --only primitives-actions,primitives-fields,primitives-display,primitives-choice,primitives-entry
# 5/5, exit 0 — the headless contracts are unchanged

nub apps/playground/dist/smoke/run.js
# 101/101, exit 0 (end-of-task check; the change is additive)

nub run check
nub run lint
nub run test
# exit 0
```

The full live suite is a merge/release gate, not an iteration step: do **not**
run `--all` for this task. Record the live registry count before and after
(`--list | wc -l`) instead of paying for a nine-minute run.

## 5. Test plan and mutation proofs

The scenarios are the tests. Each check must be able to fail; observe and
revert each mutation, recording the exact failure text:

- **M1 (`fields`)** — delete the `click("field-name")` before typing: typing
  goes to whatever had focus (nothing), so `name=atlas` never paints and the
  check fails. This proves the check depends on the real click reaching the
  native editor.
- **M2 (`fields`)** — in `primitives.tsx`, pass `readOnly` instead of `disabled`
  to `field-locked`… would still refuse. Instead change the locked input to a
  normal enabled `Input`: the `name=atlas` check fails because the `x` reaches
  `onChange`.
- **M3 (`choice`)** — replace the rating click with `click("choice-rating")` at
  the group centre (star 3) and keep `rating=1`: the check fails (`rating=3`),
  proving the click geometry really selects the first star.
- **M4 (`entry`)** — send the six OTP digits in one `key("1 2 3 4 5 6")` call
  and keep `complete=1`: if the focused-cell advance is outpaced, the code is
  not `123456`; the recorded result decides whether one-per-settle is
  load-bearing. (If the batched call passes, keep the paced form anyway — it
  mirrors what a human types and does not rely on a race.)
- **M5 (`display`)** — remove the hover: `Booked revenue` is not painted and the
  tooltip check fails.

If a mutation does not fail, the check is not proving anything and must be
strengthened before the task is done.

## 6. STOP conditions

- **A shipped control does not respond in the window.** Record the measured
  readout in the plan, add a `TODO.md` cross-team row naming the owning
  workstream, and assert the measured behaviour with a check whose name states
  it. Do **not** delete the check, relax a headless assertion, or fake a pass.
- **The live tree cannot answer the assertion** (style, a11y, colour). Drop the
  assertion from the live twin; it belongs to the headless scenario. Never
  substitute a different property to keep a check count.
- **A readout commit lags.** Use `waitForText`/`settle`; never widen an
  equality to a range to hide a race.
- **The headless scenarios regress.** Stop: a live twin must not change the
  headless contract.
- **A check needs a tolerance.** Only geometry may carry one, and it must be
  justified by a measured live difference (e.g. the 0.10.0 bounds box).

## 7. Acceptance

- Four live scenarios are in the registry, each green with `--only`, exit `0`.
- Four screenshots are written under `.artifacts/live/`.
- The five headless Tier 1 scenarios are still green; headless stays
  `101/101`, and `check`/`lint`/`test` pass.
- Mutation proofs M1–M5 observed and reverted, with the failure text recorded
  in §8.
- `README.md`, `COMPONENTS.md`, `TODO.md` and the plan index record the new ids
  and the measured result; a new runtime difference, if any, is a `PLAN.md`
  decision row.
- The live registry count is recorded from `--list`, not claimed from a full
  run.

## 8. Result (measured 2026-10-19)

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/live/run.js --only live-primitives-fields,live-primitives-display,live-primitives-choice,live-primitives-entry` | **4/4**, exit `0`; **72 checks** (22 + 12 + 22 + 16); four screenshots |
| `nub apps/playground/dist/smoke/run.js --only primitives-actions,primitives-fields,primitives-display,primitives-choice,primitives-entry` | 5/5, exit `0` — the headless contracts still hold |
| `nub apps/playground/dist/smoke/run.js` | **101/101** (**3538** checks), exit `0` |
| `nub apps/playground/dist/live/run.js --list` | **67** ids (was 63) |
| `nub run check` / `lint` / `test` | exit `0`; playground 417 tests, `@gpuixui/testing` 61 |

The full live suite was **not** run: it is the merge/release gate, and this
change is additive. The registry count comes from `--list`.

Measured in the window:

- every control's pointer/key/popup/focus path holds live; the four twins are
  the window evidence for `Input`, `Checkbox`, `Switch`, `Select`, `Slider`,
  `Progress`, `Meter`, `Skeleton`, `Tooltip`, `RadioGroup`, `Rating`,
  `NumberField` and `OTPField`;
- **two keys sent back to back can coalesce**: two `Down` calls on the number
  field stepped it once (`quantity=5` instead of `4`). The scenario settles per
  step;
- **the Select's list paints before its focus commit**: `Down`+`Enter` sent as
  soon as the options were painted left `region=eu-west`. A settle after the
  paint and between the two keys commits `us-east`;
- the `text` verb is `textContent`, so an `<input>`'s text is **empty**. The
  disabled-field refusal is therefore asserted with a `locked` edit counter,
  not the field's painted text;
- a multi-scenario live run slows every scenario after the first two (~6–13 s
  each) — pre-existing harness behaviour, reproduced with
  `live-shell,live-select,live-combobox`, not caused by these views.

Mutation proofs, each observed and reverted:

- **M1** — removed the `click("field-name")` before typing →
  `a real click and real keys edit the shipped Input: … got "name= submits=0 …"`,
  exit `1`.
- **M2** — removed `disabled` from `field-locked` → with the strengthened
  counter, `the disabled Input refuses the edit: expected "locked=0", got
  "… locked=1 …"`, exit `1`. (The old `name=atlas` assertion passed with the
  field enabled — this is why the view gained the counter.)
- **M3** — moved the rating click to the group's horizontal centre →
  `a click on the first star rates one: … got "cadence=daily rating=0"`,
  exit `1` (the centre is past the five-star row).
- **M4** — removed `focusCell(edit.focus)` from `OTPField`'s `apply` →
  `six real keystrokes complete the code: expected "code=123456 complete=1",
  got "quantity=9 code=6 complete=0"`, exit `1`.
- **M5** — removed the Tooltip hover → `hovering the trigger opens the shipped
  Tooltip: … got "Revenue\n50\nquality=50"`, exit `1`.
- **M6** — moved the live slider click from the quarter to the centre, and
  separately in the headless `primitives-display` →
  `a click at a quarter of the track sets a value below the middle: expected
  true, got false`, exit `1` in both runners.

Null result, recorded: sending the six OTP digits in **one** `key("1 2 3 4 5 6")`
call also completes the code, so the per-step settle is realism, not a race
guard. The paced form is kept.

Three headless checks were strengthened because the mutations exposed them as
unable to fail:

- `primitives-fields` proves the refusal with `locked=0` **and** `name=atlas`
  (the old `name=atlas` assertion passed with the field enabled);
- `primitives-display` clicks a quarter of the track instead of asserting
  `0…100` after a centre click that returned the initial value;
- `primitives-choice` clicks the **second** radio row (the old first-row click
  asserted `cadence=daily`, which was already the value); Down now expects
  `never` and Up returns to `weekly`. Mutation: moving that click back to the
  first row fails with `a click selects the second option: expected
  "cadence=weekly", got "cadence=daily rating=0"`, exit `1`.

Focused ids run: the four `live-primitives-*` and the five headless
`primitives-*`.

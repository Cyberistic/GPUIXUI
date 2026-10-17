# Plan 169 — the remaining Tier 1 controls in the native smoke suite

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B → C evidence.
**Depends on:** plans `100`, `110`, `120`, `140`, `168` and the primitives
package on `master` (`packages/primitives/src/components/{RadioGroup,Rating,
NumberField,OTPField}.tsx`).

## 1. Why this plan exists

Plan `168` mounted the shipped `Button`, `Toggle`, `Input`, `Checkbox`,
`Switch`, `Select`, `Slider`, `Progress`, `Meter`, `Skeleton` and `Tooltip`.
Four interactive Tier 1 components are still **not** exercised by the shared
suite — `RadioGroup`, `Rating`, `NumberField` and `OTPField` — so the
`components` capability verdict does not cover them, even though they are the
controls whose keyboard contracts are the most intricate in the package:

- `RadioGroup`: one tab stop, arrows move **selection and native focus**, wrap,
  and skip disabled options;
- `Rating`: arrows clamp (never wrap), Home/End jump, Delete clears;
- `NumberField`: a numeric contract over a text `<input>` — parse, clamp, step,
  commit on Enter;
- `OTPField`: one contiguous code over six cells, focus advances per character,
  and its arrow/Backspace contract runs on **key up**.

The primitives' `runtime/*.test.tsx` suites prove these, but they are opt-in
(`test:runtime`); the playground report is the shared gate and the docs'
evidence source. Mounting them here is the same integration proof plan `168`
established, extended to the rest of the interactive set.

## 2. What is built

Two scenarios in `apps/playground/src/scenarios/primitives-advanced.tsx`, both
capitalising the existing `components` capability. Each view bridges the token
theme into the primitives' `ThemeProvider`, like plan `168`.

### 2.1 `primitives-choice` — `RadioGroup` and `Rating`

View (width 420, column):

| testId | Element |
| ------ | ------- |
| `choice-radio` | `RadioGroup label="Digest cadence"` — options `daily`, `weekly`, `never` (vertical), controlled |
| `choice-rating` | `Rating label="Satisfaction" max={5}` — controlled |
| `choice-readout` | `cadence=<value> rating=<n>` |

Clicking an option has no `testId` (the package renders one per item), so the
steps click by **painted coordinates**: the group's bounds from `bounds()` and
`clickWindow(bounds.x + 8, bounds.y + 8)` for the first option, and
`bounds.x + 8, bounds.y + 28` for the second (the theme's `sm` gap + control
height). The check that matters is the selection, not the pixel.

Steps:

1. Click the first option → readout `cadence=daily`; `a11y()` has a
   `RadioButton` labelled `daily` with `value = "checked"`.
2. `down` → `cadence=weekly`, `weekly` announces `checked` and `daily`
   `unchecked`. Send `up` → back to `daily` (the group wraps).
3. Click the group's second option (coordinates) → `cadence=weekly` (the click
   path agrees with the key path).
4. Click the first star of `choice-rating` (bounds + 8) → `rating=1`;
   `right` → `rating=2`; `end` → `rating=5`; `right` at the end → still `5`
   (clamp, not wrap); `delete` → `rating=0`; `left` → `0` (clamp at the bottom).
5. `a11y()`: the rating's stars are `RadioButton`s labelled `N of 5`, with
   `value = "checked"` for stars `1..rating`.

### 2.2 `primitives-entry` — `NumberField` and `OTPField`

View (width 440, column):

| testId | Element |
| ------ | ------- |
| `entry-quantity` | `NumberField label="Quantity" defaultValue={5} min={0} max={10} precision={0}` |
| `entry-code` | `OTPField label="Code" length={6}` |
| `entry-readout` | `quantity=<n> code=<text> complete=<n>` |

Steps:

1. `entry-quantity` has `autoFocus` in the view; `up` → `quantity=6`; `down`
   twice → `quantity=4`.
2. Type `99` and press `enter` → `quantity=10` (clamped to `max`); press `down`
   → `9`. A `TextInput` a11y node labelled `Quantity` reports the committed
   value.
3. Click `entry-code-cell-1`, type `1 2 3 4 5 6` → readout
   `code=123456 complete=1`; focus has advanced to the last cell
   (`focused()` is `entry-code-cell-6`).
4. `backspace` → `code=12345` and `complete=1` stays (the completion event is
   not retracted); `left` moves native focus to `entry-code-cell-5` and the
   following `7` rewrites that digit → `code=12347` with `focused()` on cell 6.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/primitives-advanced.tsx` | new: the two scenarios |
| `apps/playground/src/scenarios/index.ts` | import and append both |
| `apps/playground/src/smoke/run.test.ts` | assert `primitives-choice` and `primitives-entry` are registered |
| `apps/playground/README.md` | suite count `36 → 38`; extend the "Tier 1 components" section with the keyboard contracts; structure line |
| `COMPONENTS.md` | the `components` evidence row gains the two scenarios; the Radio/Rating/Number/OTP rows cite the playground proof |
| `TODO.md` | tick the new probe; progress bar |
| `.agents/slop/plans/README.md` | index this plan as landed |
| `.agents/slop/plans/140-…` §4 | the `components` row gains the four keyboard contracts |

No new host methods are expected: clicks by coordinate use `bounds` +
`clickWindow`, and the key contracts use `key`/`keyDown`/`keyUp` from plan `168`.
No change outside the owned paths.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground build` | clean build |
| `nub apps/playground/dist/smoke/run.js --only primitives-choice` | green, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only primitives-entry` | green, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `38/38 scenarios passed`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proofs (both run, both recorded):**

1. Replace the RadioGroup `down` step with `up` and the "down selects weekly"
   check fails (`cadence=daily`), exit `1`. Restore.
2. Delete the OTP Backspace step or assert `code=123456` after it; the check
   fails with the code it actually holds, exit `1`. Restore.

## 5. STOP conditions

Stop and report with evidence if:

- **A click at the group's coordinates misses the option** (the runtime's
  painted bounds differ from the layout's). Record the bounds and the readout;
  adjust to the true geometry and state it in §8. Do not add a `testId` to the
  package (outside this workstream) or deep-import its internals.
- **A key reaches the wrapper but the focused item does not bubble it** (the
  arrow checks stay on the initial value). Record the sequence; if the
  component needs a wrapper-level handler the primitives package must change,
  record it in `TODO.md` and stop that check.
- **The NumberField's `autoFocus` does not take native focus** (typing does
  nothing). Click its centre instead, record the deviation.
- **The OTP `backspace` deletes two characters** (the key-up contract fails).
  Record the code; that is a component defect for the primitives workstream —
  record it in `TODO.md`, do not weaken the assertion.
- **A change outside the owned paths is required**: record it in `TODO.md` and
  do not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `primitives-choice` | native smoke | a radio group whose arrows do not move selection, wrap or agree with a click; a rating that wraps at the ends, ignores End/Delete, or announces the wrong stars |
| `primitives-entry` | native smoke | a number field that does not step, clamp on commit, or expose its value; an OTP field that drops a character, does not advance focus, or deletes twice on Backspace |
| `scenarioProblems` | unit | the two scenarios losing their registration or duplicating an id |
| two-direction runs (§4) | native smoke | the checks passing when the contract is broken |
| full suite | native smoke | focus/timers leaking into later scenarios |

## 7. Acceptance criteria

- Both scenarios registered and green; the suite is **38/38**, exit `0`.
- The four component contracts are recorded in plan `140` §4, the app README
  and `COMPONENTS.md`.
- Both two-direction proofs were run and recorded in §8.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome (executed on this host, 2026-10-17)

**38/38 green**, exit `0`; `components=verified`. `primitives-choice` records
18 checks and `primitives-entry` 12.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **`RadioGroup` moves selection and focus with the arrows, and wraps.** A
  click on the first row selects `daily`; Down selects `weekly` and the
  `RadioButton "Weekly"` announces `checked`; Up wraps to `daily`. A click on
  the second row selects `weekly`, agreeing with the key path.
- **`Rating` clamps and clears.** A click on the first star rates one; Right
  raises it; End jumps to five; Right at the end stays at five (no wrap);
  Delete clears to zero; Left at zero stays zero. The fifth star announces
  `checked` at five.
- **`NumberField` steps, clamps on commit and exposes its value.** Up steps
  5 → 6, two Downs take it to 4; typing `99` and pressing Enter commits the
  clamped `10`; a further Down steps to `9`; the `TextInput` a11y node reports
  `9`.
- **`OTPField` fills, advances, and deletes exactly once.** Six digits fill the
  code and fire `onComplete` once; focus lands on cell 6; Backspace deletes one
  character (`12345`, the completion event is not retracted); Left moves native
  focus to cell 5; typing `7` rewrites that digit (`12347`).

Deviation from this plan:

- **A keystroke delivered after the coordinate click did not reach the
  group's `onKeyDown` in this harness.** The first implementation sent
  `key("down")` after the click and the selection stayed on `daily` (the click
  itself had selected it). The steps now dispatch the pair with
  `keyDown`/`keyUp` on the group's own `testId` — the same route the package's
  runtime suites use. Focus routing is proven separately (`roving-focus`,
  `modal-focus-trap`); this probe asserts the group's keyboard contract. The
  precise renderer-side cause (where a child-delivered key stops) is a harness
  fact worth measuring separately, not a reason to weaken this check.

Two-direction proofs:

1. Sending `up` instead of `down` for the first move:
   `Down moves the selection: expected a string containing "cadence=weekly",
   got "cadence=never rating=0"` → `components=failed`, exit `1`.
2. Expecting the pre-Backspace code after a single Backspace:
   `expected a string containing "code=123456", got "quantity=9 code=12345
   complete=1"` → `components=failed`, exit `1`.

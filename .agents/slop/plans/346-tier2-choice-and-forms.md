# 346 — Tier 2 choice and form catalogue in the playground

**Status:** landed 2026-10-18 · **Phase:** C/D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `155`, `156`, `159`, `188`, `330`,
`344`, `345`.

## 1. Why this plan exists

Plan `330` proved the shipped Tier 2 **overlays** (Dialog, menus, toasts) and
plan `344` proved the **foundation and navigation** families. The remaining
Tier 2 families — the choice controls and the form controls — still have only
the package's own behaviour tests. They have never been mounted through the
**consumer path** (the published root import compiled by
`apps/playground/tsconfig.vendor.json`, plan `330` §3) and never driven in a
real GPUix window.

That is the same gap plan `344` closed for two families, and it matters for the
same three reasons:

- the vendor compile is the path a consumer in this repo actually takes; a
  family nobody mounts can regress at import time without any gate noticing;
- the playground is the docs' native evidence source, so a component it cannot
  mount cannot be shown honestly;
- the choice controls depend on the floating layer and the native editor in
  combination (`Popover` inside `DatePicker`, the headless combobox inside our
  `Combobox`, two native `<input>` segments in `TimePicker`), which is exactly
  the composition a per-part suite does not cover.

It also closes a specific **documentation-truth** gap: `docs/form.mdx` and
`docs/fieldset.mdx` say their runnable example is "which the native playground
mounts", and it does not. Plan 346 makes the playground prove the same contract
the examples show (with `testId`s the probes can address); the wording/registry
half is recorded as a cross-team task because `packages/components/examples/`
is not this workstream's path.

This plan changes **no package code**. If a shipped component is wrong, it is
recorded, not fixed here.

## 2. What will be proven

Two consumer views, one capability (`tier2`), one headless scenario each and one
live twin each. All assertions are the shipped contract; mechanisms already
measured elsewhere are not re-probed (`floating-placement` 156,
`select-choose`/`combobox-filter` 159, `text-entry` 188, `pointer-text-entry`
343, `live-key-routing` 345).

### `tier2-choice`

| Component | Interaction asserted |
| --------- | -------------------- |
| Popover | closed at rest; a click opens a panel **below** the trigger; the trigger reports `expanded`; a row click updates the consumer's selection; Escape closes and returns focus to the trigger; an outside press closes without the following click re-opening it |
| SearchInput | no clear control at rest; typing reports every keystroke; the clear control appears with text; Enter submits the current text; Escape clears and returns focus; the clear control clears and reports |
| Combobox | a click opens the popup below the trigger; typing filters and ranks (a start-of-label match first); arrow + Enter selects the **value**, closes the popup and paints the label on the trigger; a no-match query paints the empty state; Escape closes |
| DatePicker | a click opens the month grid; with no value it anchors on `today` and takes native focus; Left clamps at `min` instead of stepping onto an unavailable day; Enter selects the focused day, closes and returns focus; `clearable` resets to no date; a second selection takes the arrow path |
| TimePicker | typing clamps an out-of-range segment; hours and minutes compose one value; Up steps minutes by `minuteStep` and hours by one; Down reverses; the clear control empties both segments and reports `null` |

### `tier2-forms`

| Component | Interaction asserted |
| --------- | -------------------- |
| Field | the label, control and description paint; an error **replaces** the description; the error text is the schema's own message; the consumer's validate action is the only trigger (no validate-on-type); a required field announces `Required` in the control's description while its label stays clean |
| Fieldset | the group is a named AccessKit `Group`; a disabled group paints its inputs with the disabled token; edits are refused; the disabled inputs leave the tab order; the legend dims |
| Form | an invalid submit paints every message and does not call `onSubmit`; a valid submit calls `onSubmit` with the **decoded** value and clears the messages; the success line paints the decoded value; `pending` makes submit a no-op |

## 3. Files

Create:

- `apps/playground/src/scenarios/tier2-choice.tsx`
- `apps/playground/src/scenarios/tier2-forms.tsx`

Change:

- `apps/playground/src/scenarios/index.ts` — import and register both.
- `apps/playground/src/live/scenarios.tsx` — two live twins that reuse the same
  views.
- `apps/playground/README.md` — add both to the shipped-catalogue sentence.
- `COMPONENTS.md` — extend the `tier2` capability row; add the measured
  consumer facts.
- `TODO.md` — tick the new task with the measured counts; record the cross-team
  docs/registry gap.
- `.agents/slop/plans/README.md` — add the `346` row; move the next free number
  to `347`.

Do **not** change `packages/components`, `packages/primitives`,
`packages/tokens` or `apps/docs`. A wrong shipped component becomes a
`TODO.md` cross-team task with the measured evidence.

## 4. The views

Both frames follow the existing shape (`tier2-foundation`, `tier2-navigation`):
one root sized by `useWindowSize()`, `useTheme()` for every colour, a `Readout`
carrying every piece of state the steps assert, and `aria-id` on each part whose
accessibility is asserted (the runtime's keys are ephemeral — plan `160`).

Layout rule for both: a **column** frame (header, content row, readout at the
bottom). The live window is `1100×720` (plan `189`), so every popup must open
inside it.

### 4.1 `tier2-choice.tsx`

Root `testId="tier2-choice-frame"`. Content row, two columns, 24 px padding and
24 px gap.

Left column (about 420 px wide):

1. `Popover side="bottom" align="start"`:
   `PopoverTrigger testId="popover-trigger" aria-id="popover-trigger"
   variant="secondary"` labelled `Columns`;
   `PopoverContent testId="popover-panel"` containing two package `Button`s,
   `popover-row-name` and `popover-row-status`, each `aria-pressed` and
   toggling the consumer's `visible` array.
2. `SearchInput testId="search-field" aria-id="search-field"
   placeholder="Filter files…"` controlled by `query`, reporting
   `onValueChange`, `onSubmit`, `onClear`.
3. `Combobox` over three options: `ada` (Ada Lovelace), `grace` (Grace
   Hopper), `alan` (Alan Turing, `disabled`), single mode, controlled value.
   Parts: `ComboboxTrigger testId="assign-trigger" aria-id="assign-trigger"
   label="Assign reviewer" placeholder="No reviewer"`, `ComboboxContent`,
   `ComboboxInput`, `ComboboxList label="Reviewers"`, `ComboboxEmpty`.

Right column (about 420 px wide):

4. `DatePicker value={due} onValueChange={setDue} today="2026-10-17"
   min="2026-10-17" max="2026-12-31" clearable`
   with `DatePickerTrigger label="Due date"` (default testId
   `date-picker-trigger`, authored `aria-id`), `DatePickerContent`,
   `DatePickerCalendar`.
5. `TimePicker testId="standup" value={time} onValueChange={setTime}
   minuteStep={15} clearable label="Standup"` with
   `TimePickerSegment segment="hours"`, `TimePickerSeparator`,
   `TimePickerSegment segment="minutes"`, `TimePickerClear`.
6. `click-target`, an inert `div testId="choice-outside"` in the left column
   below the SearchInput — the outside press the live host clicks (it has no
   window-coordinate click).

Readout `tier2-choice-readout`:

```
visible=<name,status|none> query=<text> submitted=<text|none> cleared=<n>
reviewer=<value|none> due=<iso|none> time=<HH:mm|none>
```

### 4.2 `tier2-forms.tsx`

Root `testId="tier2-forms-frame"`. Two columns.

Left column:

1. `Field testId="slug-field" label="Workspace URL"
   description="Lowercase words joined by hyphens"
   error={Option.getOrNull(error)}` with
   `FieldInput testId="slug-input" aria-id="slug-input" value={slug}
   onChange={…}`;
   a `slug-validate` button that runs
   `Effect.runSync(validate(Slug)(slug))` and stores the message — the
   documented app boundary.
2. `Field testId="title-field" label="Project title" required` with
   `FieldInput testId="title-input"` (for the `Required` announcement).
3. `Fieldset legend="Billing address"` (enabled) with two rows with
   `FieldInput`s `billing-street` and `billing-city`, then a second
   `Fieldset legend="Shipping address" disabled` with `shipping-street` and
   `shipping-city`; a `focus-after-disabled` button after the group.
4. Readout `tier2-forms-readout`:
   `slug=<text> error=<text|none> title=<text> street=<text> city=<text>
   submits=<n> created=<text|none> pending=<bool>`.

Right column:

5. `Form schema={Signup} value={{ email, name }} onSubmit={…}
   pending={pending} label="Create account" testId="signup-form"`:
   the render prop draws `Field label="Email"` + `FieldInput
   testId="form-email"`, `Field label="Name"` + `FieldInput testId="form-name"`,
   a `form-submit` button (`form.submit`), a `form-hold` toggle that flips the
   consumer's `pending`, and a success line `form-created` that paints the
   decoded `email`.

`Signup` is a `Schema.Class` whose `email` is a `Schema.String.check` with a
check `message` of `"Enter at least three characters"` and whose `name` is
`Schema.NonEmptyString` — the messages are the schema's, never the view's.

## 5. Steps for the executor

1. Read this plan, then `apps/playground/src/scenarios/tier2-foundation.tsx`,
   `tier2-navigation.tsx`, `tier2-dialog.tsx`,
   `apps/playground/src/live/scenarios.tsx` (`tier2Dialog`,
   `tier2Foundation`), `apps/playground/src/ui.tsx`,
   `apps/playground/src/a11y.ts` and `apps/playground/src/scenarios/probes.ts`.
2. Write `tier2-choice.tsx` as §4.1. Keep every popup inside a `1280×800`
   frame; put the date picker near the top of its column so its six-row grid
   fits.
3. Write `tier2-forms.tsx` as §4.2. Import `validate` from
   `../../vendor/packages/components/src/validation/logic.js` (the vendor
   compile includes `src/**/*.ts`).
4. Register both in `src/scenarios/index.ts` beside the other `tier2-*`
   scenarios. Run the registry integrity check:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; `scenarioProblems` reports no duplicate id and no
   uncovered capability. Two scenarios may share `tier2`.
5. Build and run only the new scenarios:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only tier2-choice
   nub apps/playground/dist/smoke/run.js --only tier2-forms
   ```

   Expected: `1/1 scenarios passed`, exit `0`, each with its check count. A
   click that misses reports bounds/readout — fix the view's layout, never widen
   a tolerance.
6. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `76/76 scenarios passed`, exit `0`; the check total grows by the
   two counts.
7. Add the two live twins in `src/live/scenarios.tsx` with `view:` pointing at
   the same scenarios. Live steps settle (`settle`) after each input and use
   `waitFor` where a mount lags the click. Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected: `27/27 scenarios passed`, exit `0`, two screenshots. Measure the
   dates the live date-picker path lands on; do not hard-code a headless value
   that the window might not deliver.
8. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`.
9. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan
   index with the measured counts. Commit in two commits: the plan, then the
   scenarios + live twins + docs.

## 6. Test plan

The test **is** each scenario: typed checks (`expectEqual`, `expectNear`,
`expectContains`, `expectSome`) over host text, bounds, style and the
accessibility dump. Record four mutation proofs and two reverse proofs in §8
after implementation (temporary edit → `--only` run → revert):

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | Popover `side="bottom"` → `"top"` | "the panel opens below its trigger" |
| M2 | Drop `min="2026-10-17"` from the DatePicker | "Left clamps at the minimum bound" |
| M3 | `minuteStep={15}` → `1` | "Up steps the minutes by the step" |
| M4 | Drop `disabled` from the shipping `Fieldset` | "the disabled group paints its inputs disabled" |

Reverse proofs (the consumer wiring, not the component):

- `Field`'s `error` wired to a constant `undefined` → "an error replaces the
  description" fails after validate;
- `Form`'s `onSubmit` wired to a no-op → "a valid submit reports once" fails.

A mutation that fails for an unrelated reason is not a proof; fix and repeat.
Every failing label and exit code goes in §8.

## 7. STOP conditions

- The vendor compile does not export a part named here. Stop; record the missing
  export in `TODO.md` as a components task with the compiler error.
- A component throws `assertParts` for the layout this plan describes. Stop and
  record it; do not restructure another package's contract from here.
- A check can only pass with a tolerance above 2 px, or with a screenshot. Stop:
  that is a mechanism question, not a catalogue view.
- A live path cannot reach a control the headless path reaches (for example the
  combobox input never receives a live key). Record the measured limitation and
  narrow the live twin; do not delete the headless check.
- Any file outside §3 must change. Stop; write the task in `TODO.md`.
- The full suites are not `76/76` headless and `27/27` live, exit `0`. Stop and
  report the failing scenario; do not mark this plan done.

## 8. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003):

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `tier2-choice` | 59 | pass |
| `tier2-forms` | 34 | pass |

Suite `74 → 76` scenarios, `2070 → 2163` checks, exit `0`.

Live twins (real 1100×720 window):

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `live-tier2-choice` | 13 | pass |
| `live-tier2-forms` | 14 | pass |

Live suite `25 → 27`, checks `431 → 458`, exit `0`, two screenshots. Both live
twins were green on their first full run.

### 8.1 Findings the first runs produced

Two of the three initial failures were real, and one was a view bug:

1. **`DatePicker` focuses the month head when it opens with no value** —
   measured `date-day-2026-10-01` with `today="2026-10-17"` and
   `min="2026-10-17"`, so the focused day is before the bound. The focus effect
   falls back to `startOfMonth(viewMonth)` because `active` is still `None` in
   that commit; the effect that seeds `active` from `selectedDay ?? todayDay`
   only renders afterwards. The tab stop (`tabbable`) is correctly clamped, so
   Tab entry is fine and only the open-focus is wrong. The in-package suite
   opens with a selected day, which is why it never saw this. Recorded as a
   cross-team task; both scenarios assert the measured behaviour and must flip
   to `today` when `components` fixes it.
2. **`ComboboxTrigger` has no accessible node** — it authors `aria-expanded`
   but no `role`, so the trigger's authored `aria-id` is absent from the dump
   and the expanded state is not announced. Recorded as a cross-team a11y task;
   the scenario asserts the search field's `TextInput` node instead.
3. **The required marker is not text.** `Field` paints `*` and announces
   `Required` through the control's `aria-description`; the view's first
   assertion read the field's subtree text and saw `Project title*`. The check
   now reads the exposed description and, separately, the painted marker.

### 8.2 Mutation proofs

Each mutation was applied temporarily, built, run with `--only`, and reverted.

| # | Mutation | Failing check |
| - | -------- | ------------- |
| M1 | `PopoverContent side="bottom"` → `side="right"` | `the panel opens below its trigger: expected true, got false` |
| M2 | drop `min="2026-10-17"` from the DatePicker | `Left clamps at the minimum bound: expected "date-day-2026-10-17", got "date-day-2026-09-30"` |
| M3 | `minuteStep={15}` → `1` | `Up steps the minutes by the step: expected a string containing "time=09:45", got "... time=09:31"` |
| M4 | drop `disabled` from the shipping `Fieldset` | `the disabled input paints the disabled token: expected "#222730", got "#191D25"` |
| R1 | `Field error={Option.getOrUndefined(error)}` → `error={undefined}` | `the error is the schema's own message: expected a string containing "Use lowercase words joined by a hyphen", got "Workspace URLLowercase words joined by hyphens"` |
| R2 | `Form onSubmit` → `() => undefined` | `a valid submit reports once: expected a string containing "submits=1", got "... submits=0 created=none ..."` |

M1 was first attempted as `side="top"`; the runtime's snap flipped the panel
back below a trigger near the top of the frame, so the check passed. `side="right"`
is honoured and the below-trigger assertion fails — the proof uses a placement
the frame can actually satisfy.

### 8.3 Consumer facts

- `Form`'s messages are the schema's own (`validateAll`), and the error summary
  is painted inside the form root, so `host.text(formTestId)` is the whole
  workflow readout.
- A `Fieldset disabled` reaches `FieldInput` only: the input paints
  `theme.colors.disabled`, refuses an edit and leaves the tab order
  (`focusNext` jumps from the enabled group to the following control).
- `SearchInput`'s clear control has a fixed testId (`search-clear`), so one
  search field per view; the `TimePicker`'s parts are namespaced by its
  `testId`.
- A required field's accessible description is `Required` while its label stays
  clean; the painted `*` is a separate labelled node.
- The readout is built with `Arr.join(..., " ")` rather than a multi-line
  template: a newline made the `key=value` parser miss the fields after it.

## 9. Acceptance

- Both headless scenarios are green alone and in the full suite (`76/76`,
  exit `0`), with the check total recorded.
- Both live twins are green in a real window (`27/27`, exit `0`) with two
  screenshots.
- `tier2=verified` still holds, now backed by seven headless and seven live
  scenarios.
- The mutation and reverse proofs are recorded with exact failing labels.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index
  name the scenarios and their counts.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 10. What this plan does not prove

- It does not re-measure floating placement, dismissal identity, the native
  editor or live key routing; those have their own probes.
- It does not add docs pages (`apps/docs` is the docs-site workstream) and does
  not change the shipped examples or their registry (components workstream).
- It does not fix a defect in a shipped component; it records one.
- It does not cover the remaining Tier 2 families delivered after plan `344`
  (Drawer, Stepper, Timeline, InlineEdit, TagInput, Carousel, ColorPicker,
  MentionInput, NavigationMenu, PreviewCard, HotkeyRecorder,
  KeyboardShortcuts); those take the next catalogue plan.

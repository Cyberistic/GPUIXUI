# 624 — The native text-entry contract in a real window: caret, selection, readOnly, placeholder and autosize

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground |
| Depends on | `188` (`text-entry`, the headless probe), `189`/`190` (the live host), `343` (`pointer-text-entry`, the pointer half), `533` (`input-payload`, `cmd-a` and `keyChar`), `536` (the live key verb and the pointer gesture), `555`/`600`/`605` (live field focus), `623` (the last live twin) |
| Amends | `188` §9 (the live half), `COMPONENTS.md` Text inputs / `input` capability |

## 1. Goal

`text-entry` is the remaining `input` scenario with **only** `TestRenderer`
evidence. Three live twins already cover the input surface, but each covers a
different layer:

- `live-input` — typing reaches `onChange` and Enter reaches `onSubmit`;
- `live-input-payload` — one live key carries the produced character, `cmd-a`
  is consumed by the editor, a live wheel is `precise`;
- `live-pointer-entry` — a click places the caret, a real press-move-release
  selects, and `shift`-click extends.

What none of them prove in a window is the **editor contract inside the value**:
Left/Home/End move the caret, `shift-left` extends a selection that typing
replaces, `Backspace` deletes one character and is safe on an empty field,
`readOnly` refuses the edit while keeping focus and value, the placeholder
paints only while the field is empty, a fixed-width field clips a long value
instead of growing, and a `minRows`/`maxRows` textarea autosizes and then
clamps. Plan `188` measured all of these offscreen; this plan adds the live
twin, `live-text-entry`, over the same view.

It does **not** re-prove pointer caret placement (`live-pointer-entry`), it does
**not** claim masking (0.10.0 has no masking surface — D33/plan `188`), and it
does **not** claim the accessibility `value` (the live renderer has no a11y
method — plan `197`). The live twin reads the probe's React readout, which is
the value the field's own `onChange` produced.

## 2. What is already known

- The view is `apps/playground/src/scenarios/text-entry.tsx`
  (`textEntryScenario`). Fields and ids, top to bottom:
  - `entry-native` — controlled, `placeholder="enter name"`, the main editor;
  - `entry-controlled` — controlled, unused by this probe;
  - `entry-readonly` — `value="locked"`, `readOnly`, counts refused edits;
  - `entry-secret` — controlled, placeholder `password`, painted in clear;
  - `entry-wide` — fixed `width: 160`, controlled;
  - `entry-area` — controlled `<textarea>`, `minRows={2}`/`maxRows={6}`;
  - `entry-readout` — `native=… events=… plain=… lockedEdits=… secretLen=…
    note=… areaH=…`, where `note` joins lines with `|` and `areaH` is the
    rounded painted height read through the probe's own renderer.
  The fields are 240 px wide (the wide one 160 px), so the whole probe fits the
  1100 × 720 window.
- The headless scenario is **56 checks** and green:
  `nub apps/playground/dist/smoke/run.js --only text-entry`.
- The live host has every verb this twin needs: `click`, `key`, `focused`,
  `text`, `paintedText`, `bounds`, `screenshot` (plan `189`/`190`). Focus is
  read from the renderer the runner owns, so it is a native-focus claim
  (D35/plan `190`).
- The live `key` verb sends a keystroke **sequence** (`"h i"` in `live-input`,
  `"enter"` in `live-pointer-entry`), and it types the literal key (plan
  `536`). The native editor consumes `cmd-a` before React (D64), so
  `cmd-a` then a character replaces the whole value — measured live in
  `live-input-payload`.
- The window is the layout root and the 0.10.0 box is the content origin with
  borderless size; a non-scrolling field's box is stable (plan `529` §6.5,
  D77). A live `<textarea>` grew `32 → 64` for `x\ny` in
  `live-pointer-entry`, so autosize transfers.
- A live state commit can lag a protocol call; every read follows `settle`, and
  a check that must observe a later paint may use the bounded `waitForText`
  helper (which only waits; the assertion is still exact).

## 3. Files to create or change

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | Import `textEntryScenario` from `../scenarios/text-entry.js`; add `const liveTextEntry: LiveScenario` (`id: "live-text-entry"`, `capability: "input"`, `view: textEntryScenario.view`, `ready: "entry-native"`); register it in `liveScenarios` next to `pointerEntry`. No new host verb. |
| `apps/playground/src/scenarios/text-entry.tsx` | Add `wideLen=${wide.length}` to the readout. The live twin needs the **committed** value: the live tree has no accessibility `value` (plan `197`), and a painted run alone cannot tell a React state commit from text the native editor kept after a controlled prop failed to change. No behaviour change. Every temporary mutation proof in §6 is reverted before the commit. |
| `.agents/slop/plans/624-live-text-entry.md` | **This file**; fill §8 with the measured numbers after the focused run. |
| `.agents/slop/plans/README.md` | Index this plan under the playground table; note it takes `624` (the first free number after `623`). |
| `apps/playground/README.md` | One sentence in the real-window section naming the live editor contract and `live-text-entry`. |
| `COMPONENTS.md` | The capability table's `input` row gains `live-text-entry`; the Text inputs / `input` prose gains one paragraph with the measured live numbers. |
| `PLAN.md` | New decision row: the native editor's caret/selection/readOnly/autosize contract transfers to a real window; the live twin reads the React readout because the live tree has no a11y value. |
| `TODO.md` | Add the task under the Playground workstream and tick it when the gates pass; keep the bar at `104/104` plans-and-harness and bump the live registry count `89 → 90`. |

Do **not** touch `packages/primitives`, `packages/components`, `apps/docs` or
the bindings. This is a harness-only probe.

## 4. Implementation

### 4.1 The scenario

Add after `pointerEntry` in `apps/playground/src/live/scenarios.tsx`:

```ts
/**
 * `live-text-entry` — the native editor contract in a real window.
 *
 * `live-input` proves a keystroke reaches `onChange`; this twin proves what the
 * editor does inside the value: caret keys, a selection replaced by typing,
 * deletion, `readOnly`, the placeholder's paint, a clipped fixed width and a
 * `minRows`/`maxRows` autosize. The value is read from the probe's React
 * readout because the live tree carries no accessibility `value` (plan `197`).
 */
const liveTextEntry: LiveScenario = {
  id: "live-text-entry",
  title: "Live text entry: caret, selection, readOnly and autosize",
  capability: "input",
  view: textEntryScenario.view,
  ready: "entry-native",
  steps: (ctx) =>
    Effect.gen(function* () {
      // ... checks below ...
      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveTextEntry.id}.png`);
    }),
};
```

Read helpers local to the scenario (no new shared helper): the readout is one
string, so read it once and assert `Str.includes`/exact values.

### 4.2 The exact checks

Every check below is one `ctx.expect*` call and must be able to fail. `settle`
follows every input batch; use `waitForText(ctx, "entry-readout", "native=abc")`
before reading after the first typing batch.

1. **Mount and placeholder.** `boxOf(ctx, "entry-native")` is painted, and
   `paintedText()` contains `enter name`. This proves the view committed and
   the placeholder is painted live (not only in the a11y dump).
2. **Typing.** Click `entry-native`; `key("a b c")`; settle; the readout
   contains `native=abc`; `events=3`; `paintedText()` no longer contains
   `enter name`. (The placeholder stops painting once text exists.)
3. **Caret.** `key("left left x")`; readout `native=axbc`.
   `key("home 0")` → `native=0axbc`; `key("end 9")` → `native=0axbc9`;
   `key("backspace")` → `native=0axbc`.
4. **Selection.** `key("shift-left shift-left q")` → `native=0axq`
   (the selected run is replaced, and nothing else).
   `key("cmd-a w")` → `native=w` (select-all then typing replaces the whole
   value; the native editor consumes `cmd-a`, D64).
   `key("backspace backspace")` → `native=` (deleting the last character and
   then pressing Backspace on an empty field is safe: the readout is exactly
   `native= events=…`, not `native=undefined`).
5. **`readOnly`.** Click `entry-readonly`; `key("n o")`; settle. Assert
   `focused` is `entry-readonly`, the field's painted run is **exactly**
   `locked` (`paintedText()` returns whole element lines, and the readout's
   `lockedEdits=0` token also contains the substring `locked`, so a `contains`
   check would be vacuous), the field does **not** paint `lockedno`, and
   `lockedEdits=0`.
6. **No masking.** Click `entry-secret`; `key("s 3 c r 3 t 9")`; settle.
   `secretLen=7` and `paintedText()` contains `s3cr3t9`. The readout reports the
   length only, so the painted run can only come from the field: a secret is
   exposed in clear and no masking surface exists.
7. **Fixed-width clipping.** `boxOf(ctx, "entry-wide")` before the edit; click;
   `key("a")` 40 times, each followed by a frame; settle. Assert `wideLen=40`
   (the React value, not just the paint) and the width is within 1 px of
   before. (Height may not be asserted; the field must not grow.)
8. **Textarea autosize.** Read `areaH` from the readout (`areaH=` token) and
   assert `64 ± 1` (the minRows box measured live in `live-pointer-entry`).
   Click `entry-area`; type `one`; settle; `areaH` is unchanged (one line stays
   at minRows). Type `enter two enter three enter four`; settle; `areaH` is
   `116 ± 1`. Type `enter five enter six`; settle; `areaH` is `168 ± 1`. Type
   `enter seven`; settle; `areaH` equals the six-line height (clamped at
   `maxRows`). Assert the readout's `note` is
   `one|two|three|four|five|six|seven`.
9. **Screenshot** to `apps/playground/.artifacts/live/live-text-entry.png`.

The live scenario is **71 checks**, of which 27 are distinct assertions; the
rest are the `entry-readout is painted` guard that each `textOf` read emits (the
same shape every live twin uses). It does not repeat `live-pointer-entry`'s
pointer geometry or the headless a11y dump.

**Measured harness fact:** one 40-key `keystrokes` call painted all 40
characters in `entry-wide` while the controlled `wide` state stayed at `0` —
the value was never committed. Forty single-key calls, one frame apart, commit
each character (`wideLen` `1 … 40`). A live probe that asserts a controlled
value types one key per call.

### 4.3 Parsing the readout

Use the existing style rather than a regex library:

```ts
const readout = (ctx: LiveContext) => textOf(ctx, "entry-readout");

const field = (line: string, name: string): string =>
  pipe(
    Str.split(line, " "),
    Arr.findFirst((part) => Str.startsWith(`${name}=`)(part)),
    Option.map((part) => Str.slice(`${name}=`.length)(part)),
    Option.getOrElse(() => ""),
  );
```

`note` contains no spaces (lines are joined with `|`), so space splitting is
sound. `native` is a single token in every check. If a future edit needs a value
with a space, extend the readout with a delimiter rather than guessing.

## 5. Commands and expected results

Run from the repo root, in this order.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter playground build` | exit `0`, `dist/` refreshed |
| 2 | `nub apps/playground/dist/smoke/run.js --only text-entry` | `1/1 scenarios passed`, `input=verified`, **56 checks** unchanged, exit `0` |
| 3 | `nub apps/playground/dist/live/run.js --only live-text-entry` | `1/1 scenarios passed`, exit `0`, one PNG, the checks from §4.2 |
| 4 | `nub apps/playground/dist/live/run.js --list` | 90 ids, `live-text-entry` present |
| 5 | `nub apps/playground/dist/live/run.js --only live-text-entry` (second run) | `1/1`, exit `0` — the editor contract must not be timing-flaky |
| 6 | `nub run check` | exit `0` |
| 7 | `nub run lint` | exit `0` |
| 8 | `nub run test` | exit `0`; playground tests unchanged unless a helper test is added |
| 9 | `nub apps/playground/dist/smoke/run.js` | full headless **104/104**, exit `0`; record the check total (it does not change: no headless scenario is added) |

Do **not** run the full live suite. It is the merge/release gate; this task adds
one scenario and the focused runs are its evidence. Record the new registry
count (`89 → 90`) without claiming a full-live total.

## 6. Mutation proofs (the two-direction evidence)

Each mutation is applied to
`apps/playground/src/scenarios/text-entry.tsx`, run focused
`--only live-text-entry`, observed failing with `exit 1` and the exact check
name, then reverted. Record the observed output in §8.

| # | Mutation | Must fail |
| - | -------- | --------- |
| M1 | Remove `readOnly` from `entry-readonly` | `a live read-only field refuses the typed edit` — `lockedno` paints (observed: `expected false, got true`) |
| M2 | Delete the `placeholder={PLACEHOLDER}` prop from `entry-native` | `the live placeholder is painted while the field is empty` (observed: `expected true, got false`) |
| M3 | Delete `minRows={2} maxRows={6}` and set a fixed `height: 64` | `a live textarea starts at its minRows height` (observed: `expected 64 ± 1, got 62` — the 0.10.0 box excludes the borders) |
| M3b | Keep `minRows={2}` but set `maxRows={2}` | `a live textarea grows with its content` (observed: `expected 116 ± 1, got 64`) |
| M4 | Make `entry-wide` grow with its value: `width: 160 + wide.length * 4` | `a live fixed-width field clips a long value instead of growing` (observed: `expected 158 ± 1, got 318`) |

M4's first attempt — removing `width: 160` entirely — **passed**: the field
then took the 240 px `surface` width, and the check compares the width before
and after typing rather than against a literal, so a constant width is exactly
what it must accept. The recorded null result is why M4 grows with the value.

M3's first attempt failed at the minRows check rather than the growth check
(62 vs 64) because a fixed `height: 64` includes the field's borders; M3b is the
mutation that isolates the growth assertion.

A null result is recorded, never hidden: if a mutation passes, the plan's claim
is wrong and §4.2 must change to assert the real behaviour.

## 7. STOP conditions

Stop and report with the captured command output and the scenario's JSON entry
if any of these occur:

1. `live-text-entry` fails `typing reaches the live editor` after a `settle` +
   `waitForText`: the live `key` verb or the field's commit differs from
   plan `536`/`live-input`. Do not lengthen a sleep indefinitely; capture the
   readout and stop.
2. A caret key (`left`, `home`, `end`) does not move the caret in the live
   editor at all. That contradicts `live-pointer-entry`'s caret claim; record it
   as a runtime difference and stop rather than weakening the check to a click.
3. `paintedText()` does not contain the typed secret. The live protocol's
   `getPaintedText` is then not reporting field text; do not replace the check
   with a screenshot — stop and record, because the no-masking claim would lose
   its live evidence.
4. The read-only field's painted value cannot be distinguished (the probe paints
   no `locked` run). Stop; the check needs a different observation, not a
   tautology.
5. `nub run check`, `nub run lint` or `nub run test` fails for a reason this
   change introduced.
6. Any edit outside `apps/playground/`, `COMPONENTS.md`, `PLAN.md`, `TODO.md`
   and the plan files is required. Record it as a cross-team TODO instead.

## 8. Measured facts (this host, 0.10.0)

- `live-text-entry`: **71 checks**, three consecutive focused runs green, exit
  `0`, ~6.9 s per run, one PNG (`apps/playground/.artifacts/live/live-text-entry.png`).
- Caret/selection transfer exactly: `abc` → `axbc` (Left ×2 + `x`) →
  `0axbc` (Home) → `0axbc9` (End) → `0axbc` (Backspace) → `0axq`
  (`shift-left` ×2 + `q`) → `w` (`cmd-a` consumed, then `w`) → `""`.
- `readOnly`: native focus stays on `entry-readonly`, its painted run is exactly
  `locked`, `lockedno` never paints and `lockedEdits=0`.
- Placeholder: painted while empty, gone after the first character.
- Secret: `secretLen=7` and `s3cr3t9` is painted in clear.
- Fixed width: `158` px before and after 40 characters (declared `160` minus the
  two 1 px borders); the value commits as `wideLen=40`.
- Textarea: `64` (minRows) → `116` (four lines) → `168` (six lines) → `168`
  (seven lines, clamped); `note` is
  `one|two|three|four|five|six|seven`.
- Registry: live `89 → 90`; headless unchanged at `104` scenarios (`text-entry`
  stays 56 checks).
- Mutations: M1, M2, M3, M3b and M4 all fail with `exit 1` and the recorded
  message; one null result (removing `width: 160` passes) is explained in §6.
- Harness fact: one 40-key `keystrokes` call paints but does not commit a
  controlled value; one key per call does.
- Full merge/release gate at this head: headless **104/104** (`3672` checks, 64
  capabilities) and live **90/90** (`2330` checks, 59 capabilities, 881 s), both
  exit `0`; `nub run check`/`lint`/`test` green (playground 424 tests).

## 9. Acceptance

- `live-text-entry` is registered, green twice focused, exit `0`, and writes its
  screenshot.
- The headless `text-entry` is unchanged at 56 checks and green.
- Four mutations fail in the documented direction and are reverted.
- `nub run check`, `nub run lint`, `nub run test` and the full headless registry
  are green at the final head.
- `COMPONENTS.md`, `PLAN.md`, `TODO.md`, `apps/playground/README.md` and the plan
  index state exactly what was measured, with the plan number `624`.

# 554 — Leaving a field finishes the edit without `onBlur`

**Owner:** components workstream · **Phase:** F (integration and polish) ·
**Number:** 554 — `552`/`553` were claimed by two workstreams at once (this
branch's plan 552 and the tokens workstream's `552-scale-ladder-totality` and
`553-documented-brand-and-builder-examples`), so the first free number across
every worktree is 554.

## 1. The bug being guarded

`@gpuix/native@0.10.0` delivers **no React `focus`/`blur` for a native focus
change** — measured in plan 536 §3 for `focusElement`, `focusNext` and a pointer
focus change, and again live in the playground (plan 347 §8.2). Plan 379 already
fixed `InlineEdit` for this reason: it finishes an edit on `Tab` and on an
outside press instead of waiting for `blur`.

Three Tier 2 controls still put **behaviour** on `onBlur`:

| Component | What only `blur` does today | What a live user sees |
| --------- | --------------------------- | --------------------- |
| `ColorPicker` | commits a valid HEX draft, reverts an invalid one | typing `#123456` and clicking away never calls `onValueChange`; the preview keeps the old colour, so the user believes the colour was chosen |
| `HotkeyRecorder` | stops `recording` | click to record, click away: the field keeps saying “Press keys…” and the next press on it toggles the dead state instead of starting |
| `TimePicker` | pads both segments, filling a blank one with `00` | typing `9` in hours and moving to minutes leaves `9:45` painted although the value is `09:45`; the segment never reaches two digits |

The harness proves the same thing: the existing cases that call
`renderer.focusElement(...)` to simulate leaving the field fail today exactly
because no `blur` arrives —

```
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/time-picker.test.tsx
# FAIL  completes the value from the minute segment      expected '9' to be '09'
# FAIL  pads both segments when focus leaves the field   expected '9' to be '09'
```

and likewise for `color-picker.test.tsx` (“commits a valid draft on blur…”,
`onValueChange` called 0 times) and `hotkey-recorder.test.tsx` (“cancels
recording when focus leaves”, `Press keys…` still in the tree).

**A test may not keep asserting an event the runtime does not deliver.** Each of
those cases is replaced by the real signal (below), and the component no longer
depends on `blur` for behaviour. `onBlur` stays wired as a third path for hosts
that do deliver it; it is not the only path.

## 2. The signals that *are* observable

| Signal | Use |
| ------ | --- |
| `Tab` / `Shift+Tab` reaches the focused control's `onKeyDown` (plan 521 proves it for a panel) | finish the edit, then let the runtime move focus (do **not** claim the event) |
| `onMouseDownOutside` on the control's root (host prop, used by `InlineEdit`, `Popover`, `PreviewCard`) | finish the edit when a press lands elsewhere, without stealing focus from what was pressed |
| an edit to the *other* `TimePicker` segment | pad the untouched segment immediately; this only changes display, because the emitted value is already canonical (`composeIsoTime`) |

## 3. Exact changes

### 3.1 `packages/components/src/time-picker.tsx`

1. Import `isTab` from `./internal/key.js` and `parseSegment` from
   `./time-picker/time.js`.
2. Add one context method next to `normalize`:

   ```ts
   readonly padUntouched: (segment: TimeSegment) => void;
   ```

3. In `TimePicker`, implement it over the segment the edit is **not** in:

   ```ts
   const padUntouched = (segment: TimeSegment): void => {
     const other = segment === "hours" ? minutesText : hoursText;
     Option.match(parseSegment(other, segment === "hours" ? 59 : 23), {
       onNone: () => undefined,
       onSome: (value) => {
         const padded = padSegment(value);
         if (segment === "hours") setMinutesText(padded);
         else setHoursText(padded);
       },
     });
   };
   ```

   A blank untouched segment stays blank (no `parseSegment` value), so typing an
   hour alone still leaves minutes empty; that is the existing contract.

4. In `edit`, **after** the empty check and before `emit`, call
   `padUntouched(segment)`. The emitted value is unchanged: padding a `9` to
   `09` does not change what `composeIsoTime` returns.

5. In `handleKeyDown`, normalize on Tab and do not claim it:

   ```ts
   Match.when(isTab, () => normalize()),
   ```

6. On the group root, add `onMouseDownOutside={normalize}`. (The root takes no
   caller handler props, so nothing needs composing.)

### 3.2 `packages/components/src/color-picker.tsx`

1. Destructure `onMouseDownOutside` out of the props (it is currently in
   `...rest`, so a caller's handler would otherwise be overwritten).
2. On the root `<div>`, after `{...rest}`:

   ```tsx
   onMouseDownOutside={(event) => {
     onMouseDownOutside?.(event);
     commit();
   }}
   ```

3. On the HEX `<input>`, add an `onKeyDown` that commits on Tab and does not
   claim it:

   ```tsx
   onKeyDown={(event) => {
     if (isTab(event)) commit();
   }}
   ```

   Import `isTab` from `./internal/key.js` (it already imports `isActivation`
   from there). Keep `onSubmit={() => commit()}` and `onBlur`.

### 3.3 `packages/components/src/hotkey-recorder.tsx`

1. Destructure `onMouseDownOutside` (same reason as above).
2. On the root `<div>`, after `{...rest}`:

   ```tsx
   onMouseDownOutside={(event) => {
     onMouseDownOutside?.(event);
     setRecording(false);
   }}
   ```

3. In `onKeyDown`, inside the `recording` branch **before** setting
   `consumed.current`, add:

   ```ts
   if (isTab(event)) {
     setRecording(false);
     return;
   }
   ```

   Import `isTab` from `./internal/key.js`. Leaving `recording` does not start a
   new one on the Tab key-up (`isSpaceRelease` is false), so no `consumed` flag
   is needed.

## 4. Tests to write (they can fail)

Run from `packages/components`.

### `src/behaviour/time-picker.test.tsx`

- Keep **“completes the value from the minute segment”** unchanged. With
  `padUntouched` it passes without any focus event (today it fails: `'9'`).
- Replace **“pads both segments when focus leaves the field”** with
  **“pads both segments when a press lands outside the field”**:
  type `9` in hours; `clickCentreOf(time, "elsewhere")`; expect hours `09`,
  minutes `00` and the value `09:00` reported once. Add an `elsewhere`
  focusable `div` to the `Time` fixture.
- Add **“pads both segments on Tab”**: type `9` in hours, send
  `simulateKeystrokes("tab")`, expect `09` / `00`.
- Do **not** touch “paints the focus ring on the clear control”: it is one of
  the 59 pre-existing binding failures (plan 540) owned by `binding-gaps`.

### `src/behaviour/color-picker.test.tsx`

- Replace **“commits a valid draft on blur and reverts an invalid one”** with
  **“commits a valid draft when a press lands outside the field”**: type
  `#123456`, `clickCentreOf(picker, "elsewhere")`, expect
  `onValueChange("#123456")` and focus on `elsewhere`; then a second picker,
  type `nope`, click outside, expect the field back at `#000000`.
- Add **“commits a valid draft on Tab”**: type `#123456`,
  `simulateKeystrokes("tab")`, expect the commit.
- Leave the swatch focus-ring case to `binding-gaps`.

### `src/behaviour/hotkey-recorder.test.tsx`

- Replace **“cancels recording when focus leaves”** with
  **“cancels recording when a press lands outside the field”**: click the
  recorder, then `clickCentreOf(recorder, "elsewhere")`; expect no
  `Press keys…`, no `onChange`, focus on `elsewhere`.
- Add **“cancels recording on Tab”**: click to record, send
  `simulateKeystrokes("tab")`, expect no `Press keys…` and no `onChange`.
- Leave the clear-control focus-ring case to `binding-gaps`.

### Both-direction proof (required before calling it done)

Revert one change at a time and record the failure:

1. remove the `padUntouched(segment)` call in `edit` → the minute-segment case
   fails with `'9'` / `09`;
2. remove `onMouseDownOutside={normalize}` → the TimePicker outside-press case
   fails;
3. remove the Tab branch → the TimePicker Tab case fails;
4. remove ColorPicker's `commit()` on the outside press → the commit case fails;
5. remove the HotkeyRecorder cancel on the outside press / Tab → the matching
   case fails.

Use `scripts/verify-two-directions.sh` if it runs on this host; it currently
requires `jj`, which is not installed (D1), so record the manual diffs in the
plan/commit instead.

## 5. Documentation and inventory sync

The inventory test (`src/inventory.test.ts`) fails when a docs “Verification”
line or a `COMPONENTS.md` row states a different native-test count than the
suite. After the test replacements the counts become:

| Suite | Before | After |
| ----- | ------ | ----- |
| `time-picker.test.tsx` | 13 | 14 |
| `color-picker.test.tsx` | 9 | 10 |
| `hotkey-recorder.test.tsx` | 14 | 15 |

Update:

- `packages/components/docs/time-picker.mdx` — “Editing”: padding happens as
  soon as the other segment is edited, on `Tab`, and on a press outside the
  field; `blur` is no longer the mechanism. “Verification”: 14 tests and the
  renamed cases.
- `packages/components/docs/color-picker.mdx` — a commit happens on `Enter`,
  `Tab`, a press outside the picker, or `blur`; remove the claim that `blur`
  reverts. “Verification”: 10 tests.
- `packages/components/docs/hotkey-recorder.mdx` — a recording is cancelled by
  `Escape`, `Tab` or a press outside the field; “Verification”: 15 tests.
- `COMPONENTS.md` rows for **Time pickers**, **Color picker**,
  **Hotkey-recorder input** — counts and the blur wording.
- Each `*Meta.limitations` array in the three modules: drop the “on blur”
  dependency and state the real signals.
- `TODO.md` — a ticked Tier 2 hardening row for plan 554 with the counts and the
  measured red-case delta; `.agents/slop/plans/README.md` — this row.

## 6. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/components/packages/components

# focused native runs while iterating
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/time-picker.test.tsx
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/color-picker.test.tsx
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/hotkey-recorder.test.tsx
# expect: only the focus-ring cases that plan 540 attributes to the binding fail
# (time-picker 1, color-picker 1, hotkey-recorder 1); every case this plan adds passes

# package units + inventory sync
nub run --filter @gpuixui/components test          # expect 41 files / 417+ tests green

# full native suite at the end
nub run --filter @gpuixui/components test:behaviour
# expect: 737 tests, 55 pre-existing binding failures (was 734 / 59), all four
# behavioural failures this plan names now green

# repository gates
cd ../..
nub run check && nub run lint && nub run test
```

## 7. STOP conditions

- **`onMouseDownOutside` does not fire for a press on a sibling** in the test
  renderer: stop, record the probe, and report. Do not fake a focus move.
- **`Tab` does not reach `onKeyDown` on the `<input>`/`<div>`**: drop the Tab
  cases, keep the outside-press and cross-segment paths, and record the measured
  limitation rather than claiming keyboard exit.
- **The value changes when only the display should**: stop. `padUntouched` may
  only rewrite a one-digit segment to two digits; `composeIsoTime` must emit the
  same string before and after.
- **A new case passes with the fix reverted**: the test is not proving the fix;
  rewrite it before continuing.
- **The binding is rebuilt mid-work** (the plan-540 condition): record the
  artifact md5 and re-run; do not tune a component to a moving measurement.

## 8. Acceptance

- The three behavioural defects above are fixed with observable signals; `blur`
  remains an extra path, not the only one.
- The six new native cases pass, and each fails when its fix is reverted.
- Test counts in docs, `COMPONENTS.md`, metadata and `TODO.md` agree with the
  suites (`inventory.test.ts` green).
- `nub run check`, `nub run lint`, `nub run test` pass; the native suite is
  737 / 55 with the failures classified as pre-existing binding cases.
- Committed on `agent/components` and pushed.

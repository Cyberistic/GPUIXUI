# Plan 672 — The combobox trigger's focus ring follows native focus

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 116, 388, 394, 522, 523, 536, 540, 565, 583, 659, 660 |
| Status | **done** — a shared `useNativeFocusId` sample drives SearchInput and the combobox trigger; 2 native cases fail at `HEAD` and pass after, SearchInput 18/18 unchanged |
| Claimed number | `672` — the first free number after `671`; `670`/`671` are `tokens-theme`'s, checked across every worktree and recorded in `PLAN.md` D30 |

## 0. Why this plan exists

Plan 565 gave the combobox trigger a ring, but only from its `autoFocus` seed
and React `focus`/`blur`. The runtime delivers **no** React focus/blur for a
native focus change (measured in plans 536/540 and repeatedly since). Measured
in this worktree on 2026-10-19 with the real `TestRenderer`:

```text
combobox closed, trigger focused by a click (or by Tab)
  focusedTestId()            → Some("combobox-trigger")
  trigger.style.boxShadow    → undefined

open by clicking the trigger, then Escape
  focusedTestId()            → Some("combobox-trigger")   (focus returned)
  trigger.style.boxShadow    → undefined
```

So the control that owns keyboard focus paints exactly like an unfocused one in
the two states a keyboard user actually lives in: tabbing onto the trigger, and
returning to it after dismissing the popup. `autoFocus` masks this in the
existing test, because its seed stays `true` for the whole session.

The same measurement is the reason `SearchInput` samples
`getFocusedElementId()` (plans 659/660). This plan applies that rule to the
combobox trigger and hoists the sample into one internal hook, so the second
consumer does not copy the interval.

## 1. The rule

A part that can hold native focus asks the renderer **which host holds focus**
and paints the ring from that answer; it never assumes a React focus event
arrived. The sample is 50 ms (the SearchInput precedent), runs only while the
part is enabled, and stops on unmount. The ring is still suppressed while the
popup owns focus (`!open`) and while the trigger is disabled.

## 2. Exact files to change

1. `packages/components/src/internal/native-focus.ts` — new hook
   `useNativeFocusId(enabled)` and `FOCUS_SAMPLE_MS`.
2. `packages/components/src/combobox.tsx` — `ComboboxTrigger` derives
   `focused` from the sampled id and the trigger's registered instance id.
3. `packages/components/src/search-input.tsx` — consume the same hook; delete
   its local interval and the `focused`/`clearFocused` state (the two booleans
   are derived from the sampled id and the two instance refs).
4. `packages/components/src/behaviour/combobox.test.tsx` — two native cases
   (native focus on the closed trigger; focus restored by an accepted close).
5. `packages/components/docs/combobox.mdx` — the verification count 52 → 54,
   the focus limitation now says the trigger samples, and one clause names the
   new cases.
6. `COMPONENTS.md` — the Comboboxes row: ring clause and count 52 → 54.
7. `TODO.md` — tick a new hardening item under Tier 2 hardening.
8. `.agents/slop/plans/README.md` — index row `672`.
9. `PLAN.md` D30 — record `672` as the next components overflow number.

## 3. Implementation

### 3.1 `internal/native-focus.ts`

```ts
/**
 * The host that holds native focus, sampled on a timer.
 *
 * `@gpuix/native@0.10.0` delivers no React `focus`/`blur` for a native focus
 * change (plans 536/540), so a part that paints focus must ask the renderer.
 * The shared tracker in `@gpuixui/primitives` is the long-term home; until it
 * exists each consumer owns one interval (TODO.md → Interlocks).
 */

import { useGpuix } from "@gpuix/react";
import { useEffect, useState } from "react";

/** How often a component asks the renderer which host holds focus, ms. */
export const FOCUS_SAMPLE_MS = 50;

/** The focused host's id, or `null` when nothing has focus or sampling is off. */
export const useNativeFocusId = (enabled: boolean): number | null => {
  const renderer = useGpuix().renderer;
  const [focusedId, setFocusedId] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || renderer == null) {
      setFocusedId(null);
      return;
    }
    const read = (): void =>
      setFocusedId(renderer.getFocusedElementId?.() ?? null);
    read();
    const timer = setInterval(read, FOCUS_SAMPLE_MS);
    return () => clearInterval(timer);
  }, [enabled, renderer]);

  return focusedId;
};
```

### 3.2 `ComboboxTrigger`

Read the root's `trigger` ref from the existing context. Replace the
`useState` seed with:

```ts
const focusedId = useNativeFocusId(!disabled);
const focused =
  focusedId === null
    ? autoFocus && !disabled
    : focusedId === (trigger.current?.id ?? null);
```

Keep the caller-composed `onFocus`/`onBlur` and the existing style condition
`focused && !disabled && !open`. `trigger.current` is the instance
`registerTrigger` stores, so no second ref is needed. Delete the
`setFocused` calls in those handlers.

**Measured during implementation:** the first sample runs before the runtime
applies `autoFocus` (plan 388), so a null sample must not clear the seed. The
seed therefore stands only while the renderer reports no host at all; the first
reported host — the input, the clear control, another control or the trigger —
is authoritative. That keeps the synchronous `autoFocus` assertions and still
clears the ring as soon as focus is somewhere observable.

### 3.3 `SearchInput`

Replace the local effect and the `focused`/`clearFocused` state with:

```ts
const focusedId = useNativeFocusId(!disabled);
const clearFocused =
  focusedId !== null && focusedId === (clearControl.current?.id ?? null);
const focused =
  clearFocused ||
  (focusedId === null
    ? autoFocus && !disabled
    : focusedId === (input.current?.id ?? null));
```

The `onFocus`/`onBlur` handlers keep forwarding the caller's callbacks; only
their `setFocused` lines go. Remove the now-unused `useEffect` import and
`FOCUS_SAMPLE_MS` local constant.

### 3.4 Native cases

Add next to the trigger-surface cases in `combobox.test.tsx`:

```tsx
/**
 * The bug this guards (plan 672): a trigger focused natively — by Tab, by a
 * press, or by the focus an accepted close returns — painted no ring, because
 * no React focus event arrives. The trigger now samples the focused host.
 */
it("paints its focus ring when focus lands on the closed trigger", async () => {
  const picker = renderComponent(<TriggerPicker />);
  const trigger = picker.renderer.findByTestId("combobox-trigger");
  picker.renderer.focusElement(trigger?.id ?? -1);

  await until(
    () => picker.renderer.findByTestId("combobox-trigger")?.style.boxShadow !== undefined,
  );

  expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));
  expect(
    picker.renderer.findByTestId("combobox-trigger")?.style.boxShadow,
  ).toEqual(focusRing(darkTheme).boxShadow);

  picker.unmount();
});

it("rings the trigger again when an accepted close returns focus", async () => {
  const picker = renderComponent(<TriggerPicker />);
  await open(picker);

  expect(
    picker.renderer.findByTestId("combobox-trigger")?.style.boxShadow,
  ).toBeUndefined();

  picker.renderer.simulateKeystrokes("escape");
  await until(
    () => picker.renderer.findByTestId("combobox-trigger")?.style.boxShadow !== undefined,
  );

  expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));
  expect(
    picker.renderer.findByTestId("combobox-trigger")?.style.boxShadow,
  ).toEqual(focusRing(darkTheme).boxShadow);

  picker.unmount();
});
```

`until` is already imported. Add no other imports.

## 4. Test plan

From `packages/components`:

```sh
# HEAD: both new cases fail (focus is on the trigger, `boxShadow` undefined).
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/combobox.test.tsx

# After §3.1–§3.3: 54/54.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/combobox.test.tsx

# The SearchInput refactor must not move any of its 18 cases.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/search-input.test.tsx

nub run test            # unit suite, unchanged
cd ../.. && nub run check && nub run lint
```

Both-direction proof: run the combobox suite **before** §3.1–§3.3 and paste the
two failures (each case must fail alone); apply the source change and run all
four commands again. Reverting only `internal/native-focus.ts` and the two
component wirings must restore both failures.

## 5. STOP conditions

- The new cases pass at `HEAD`: stop — the measurement in §0 no longer holds and
  the plan's premise is wrong.
- Any SearchInput case changes verdict: stop and report. The hook is now shared;
  a failure there is a real regression, not a stale expectation.
- Any combobox case other than the two new ones changes verdict: stop and name
  it. The sampled id must not steal the ring from the popup field, and the
  `!open` gate must stay.
- A ring lingers after focus leaves the trigger in a way the suite can observe:
  stop — do not keep an `autoFocus` seed as a workaround; the sample is the
  signal.
- The suite reports more than its recorded failures (none in this file on this
  host): stop and classify.

## 6. Acceptance

- A trigger focused by code, Tab or a restored close paints the token ring; the
  ring is gone while the popup's field holds focus and while disabled.
- Exactly one sample implementation exists in `packages/components/src`, used by
  both SearchInput and ComboboxTrigger.
- `combobox.test.tsx` is 54 tests, all passing; SearchInput stays 18/18; the unit
  suite is unchanged; `nub run check` and `nub run lint` exit `0`.
- `docs/combobox.mdx`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan
  index agree.
- One commit: `fix(components): the combobox trigger's ring follows native focus (plan 672)`.

## 7. Results

- `internal/native-focus.ts`: `useNativeFocusId(enabled)` samples
  `getFocusedElementId()` every 50 ms while enabled and reports `null` when
  nothing is focused.
- `combobox.tsx`: the trigger derives its ring from the sampled host; the
  `autoFocus` seed stands only until a host is reported.
- `search-input.tsx`: the local interval and its two state booleans are gone;
  the field and clear-capture states derive from the same hook.
- `behaviour/combobox.test.tsx`: two cases — focus forced onto the closed
  trigger, and an accepted close returning focus — 54 tests.
- Both-direction proof: with only the two source files reverted, both new cases
  fail (`expected undefined to deeply equal { offsetX: 0, … }`); restoring them
  passes 54/54. SearchInput stays 18/18 after the refactor.
- Docs and inventory synced: `docs/combobox.mdx` (54), `COMPONENTS.md`,
  `TODO.md`, `PLAN.md` D30 and the plan index.

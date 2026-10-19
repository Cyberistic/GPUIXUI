# 591 — a focus state the runtime cannot clear, and `NumberField`'s blur commit

**Phase:** F (behaviour truth)
**Depends on:** `041`, `054`, `339`, `362`, `583`, `585`, `590`
**Owns:** `packages/primitives` only.

## 1. The bug

Published GPUix 0.10.0 moves native focus but **never dispatches `onFocus`/`onBlur`**
(measured, plan `583`). Plan `590` restored the focus *paint* with a tracker that
samples `getFocusedElementId()` — but the event state it ORs into the result can
only be **set** by an event, never cleared by the tracker:

```ts
focused: eventFocused || isTrackedFocus(tracked, hostId)
```

A control seeded `focused` by `autoFocus` (or by one event on a runtime that
dispatched it) therefore stayed focused forever once the tracker named another
host. Measured on this host's release-tag build:

- `NumberField > commits the draft when focus leaves an enabled field` reports
  `[12]`, not `[12, 12]`: the documented commit-on-blur (host `onBlur`) has no
  trigger, so `1.5` with `precision={2}` stays `1.5` after clicking away and a
  deferring parent never receives the blur commit;
- `NumberField`/`Input` mounted with `autoFocus` keep their ring after focus
  leaves (`paints an autoFocus Input's ring on mount, and clears it when focus
  leaves`);
- `OTPField` seeds its first cell focused, so it paints that ring forever after
  the user leaves the field;
- an OTP cell's **resting elevation** (`shadow-xs`, plan `585`) was still counted
  as a focus ring by one assertion, so it reported six rings for one focused
  cell.

The tracker knows the loss; the bug is that nothing acts on it. This is a
cross-control bug class (any `useFocus` consumer with a seeded state, plus the
one component with a blur action), so the fix belongs in the shared hook.

## 2. The fix

### 2.1 The provider publishes whether it has sampled, `components/native-focus.tsx`

`Option.none()` is ambiguous: "no provider" and "the tracker has not asked yet"
both looked like "nothing is focused". Add one internal snapshot type:

```ts
export interface NativeFocusSnapshot {
  readonly sampled: boolean;
  readonly focused: Option.Option<number>;
}
```

- `NativeFocusContext` holds `NativeFocusSnapshot | undefined` (`undefined` = no
  provider, the React boundary sentinel).
- `useNativeFocus()` returns the snapshot; `useNativeFocusId()` stays as the
  derived id for the roving composites.
- `read()` returns `current` unchanged when the focused id is stable, so the
  50 ms poll does not re-render a subtree that has not changed; otherwise
  `{ sampled: true, focused: next }`.

### 2.2 `useFocus` lets the sample clear a stale seed, `components/internal.ts`

```ts
const sample = useNativeFocus();
useEffect(() => {
  if (sample === undefined || !sample.sampled) return;
  const id = ownId?.() ?? own.current ?? undefined;
  if (id === undefined) return;
  if (!isTrackedFocus(sample.focused, id)) setEventFocused(false);
}, [sample, ownId]);
```

The effect **only clears, never sets**, so the event path stays immediate on a
runtime that dispatches; it runs only when the sample changes, so a focus event
cannot be undone by a stale sample. `focused` stays
`eventFocused || isTrackedFocus(sample?.focused, hostId)`.

### 2.3 `OTPField` clears its seeded cell the same way

`focusedIndex` starts `Some(0)` for `autoFocus` and only `onBlur` cleared it. One
effect on the snapshot clears a seeded index whose cell is not the tracked host:

```ts
useEffect(() => {
  if (sample === undefined || !sample.sampled) return;
  setFocusedIndex((current) =>
    Option.exists(current, (index) => {
      const id = cellIds.current.get(index);
      return id !== undefined && isTrackedFocus(sample.focused, id);
    })
      ? current
      : Option.none(),
  );
}, [sample]);
```

### 2.4 `NumberField` commits on the tracked loss, `components/NumberField.tsx`

A pure rule in `core/number.ts` owns the de-duplication:

```ts
export interface TrackedBlur {
  readonly wasFocused: boolean;
  readonly focused: boolean;
  readonly handledByEvent: boolean;
  readonly disabled: boolean;
}

export const commitsOnTrackedBlur = (spec: TrackedBlur): boolean =>
  spec.wasFocused && !spec.focused && !spec.disabled && !spec.handledByEvent;
```

The component factors its `onCommit` body into `commitDraft()`, keeps
`blurHandledByEvent` and `wasFocused` refs, and runs `commitDraft()` on a
true → false `focus.focused` transition when the rule allows it. The host
`onBlur` path sets `blurHandledByEvent` before committing, so a runtime that
dispatches blur cannot commit twice. No `EventPayload` is synthesised, and the
caller's `onBlur`/`onFocus` are not called from the tracker: the component acts
on the focus **state** the runtime actually reports.

### 2.5 Tests settle two tracker renders, `runtime/fixture.tsx`

A tracked state now needs one render to publish the sample and a second for the
state derived from it (the ring, the commit). `FOCUS_SETTLE_MS` is
`2 * NATIVE_FOCUS_POLL_MS + 20` (120 ms), documented on the helper. This is not
a tolerance: the ring/commit assertions read a *render*, so they wait for the
renders the component actually schedules.

## 3. Tests

- `src/core/number.test.ts` — four `commitsOnTrackedBlur` cases: a real tracked
  loss commits; a loss the event handled does not; disabled does not; a focus
  gain or unchanged state does not.
- `runtime/number-field.runtime.test.tsx`:
  - `commits the draft when focus leaves an enabled field` — `settleFocus()`
    after `focusNext()`; without the product fix the recorder holds `[12]` (this
    host measured exactly that), with it `[12, 12]`;
  - `reformats a pending draft when the tracker observes focus leaving` — type
    `1.5` with `precision={2}`, leave, settle, expect `1.50`; the old direction
    paints `1.5`;
  - `does not commit its draft once the field is disabled` — settle before the
    assertion; without the `disabled` guard it reports `[12, 12]`;
  - the two ring cases settle (the tracker contract plan `590` introduced).
- `runtime/fields.runtime.test.tsx` — the `autoFocus` Input case settles; without
  the `useFocus` clear it paints the ring forever.
- `runtime/otp.runtime.test.tsx` — the `autoFocus` cell case settles; the
  "rings only the cell the caret is in" case uses `isFocusRing` instead of "any
  `boxShadow`" (the resting elevation is not a ring, plan `585`) and settles.
  Without the OTP clear it counts a stale ring; without the predicate it counts
  six.

## 4. Verification

Run inside `packages/primitives`, **one runtime process at a time** (two
concurrent windows on this host corrupt each other's focus results — measured):

1. `nub run test` — `57 files / 805 tests`, green.
2. `nubx vitest run --config vitest.runtime.config.ts runtime/number-field.runtime.test.tsx`
   — `21 passed / 2 failed`; the two failures are the known hit-tested spin
   geometry (`steps from a hit-tested click…`, `steps the swapped range…`), not
   this plan.
3. `nubx vitest run --config vitest.runtime.config.ts runtime/otp.runtime.test.tsx`
   — `13 passed`.
4. `nubx vitest run --config vitest.runtime.config.ts runtime/fields.runtime.test.tsx`
   — the `autoFocus` Input case passes; the remaining failures are the published
   box model and the headless-tooltip focus limitation.
5. `nubx vitest run --config vitest.runtime.config.ts` — the whole suite once:
   recorded in §7. Expected: six fewer failures than the 72 baseline, no new
   failure.
6. `nub run check-types` — exit `0`.

### Two-direction proof

- **Old direction:** remove the tracked commit (keep the settles). The commit
  and reformat cases fail with `[12]` / `"1.5"`.
- **New direction:** restore it; both pass.
- **`useFocus` direction:** make `useFocus` ignore the sample clear (the old OR).
  The Input, NumberField and OTP `autoFocus` blur cases fail.
- **OTP direction:** drop the OTP clearing effect; the OTP blur case fails.
- **Disabled guard:** remove `!spec.disabled`; the disabled runtime case and its
  pure case fail.
- **Dedupe:** remove `!spec.handledByEvent`; the pure case fails (the event path
  cannot be exercised on this host, so the pure rule is the guard).

## 5. STOP conditions

- The sample never names another host after `focusNext` + `settleFocus`: STOP and
  report plan `590`'s tracker, not a component.
- A commit fires twice on the release build (`[12, 12, 12]`): STOP; the
  de-duplication rule is wrong.
- Any offline test, type check, or a previously passing runtime file regresses:
  STOP and revert rather than re-baseline.
- Do not touch the published box-model geometry or the headless-tooltip
  open-on-focus cases; they are separate, recorded classes.

## 6. Acceptance

- The six measured cases pass on the release-tag build; the disabled field still
  refuses; no new runtime failure.
- `nub run test` and `check-types` are green.
- Docs and inventory state the tracked commit and the cleared seed; the TODO row
  is ticked; this plan is indexed.

## 7. Result

Measured on this host (release-tag build, 2026-10-19).

**Offline:** `nub run --filter @gpuixui/primitives test` → **57 files / 805
tests, all green** (four new `commitsOnTrackedBlur` cases).
`nub run --filter @gpuixui/primitives check-types` → exit `0`.

**Scoped runtime:**

| File | Result |
| --- | --- |
| `runtime/number-field.runtime.test.tsx` | **21 passed / 2 failed** — only the two hit-tested spin-geometry cases |
| `runtime/otp.runtime.test.tsx` | **13 passed / 0 failed** |
| `runtime/fields.runtime.test.tsx` | **30 failed** (was 31) — the `autoFocus` Input ring case now passes; the rest are the box-model and tooltip classes |

**Whole runtime suite:** `50 files / 722 tests — 656 passed / 66 failed`, 13
failing files. The baseline before this plan was `50 / 721 — 649 passed / 72
failed`, 14 failing files.

**Fixed by this plan (six, no new failures):**

- `number-field > commits the draft when focus leaves an enabled field`
- `number-field > paints the chrome ring from mount when autoFocus is set`
- `number-field > paints the ring on the field's chrome when the input has focus`
- `fields > paints an autoFocus Input's ring on mount, and clears it when focus leaves`
- `otp > paints the first cell's ring from mount when autoFocus is set`
- `otp > rings only the cell the caret is in`

New test `number-field > reformats a pending draft when the tracker observes
focus leaving` passes.

**Remaining classes (not this plan):** the published box model (plan `529` §6.5),
the headless tooltip's open-on-focus (plan `583`), the `Select`-trigger ring
assertions that predate the tracker's settle, and the full-run
window-accumulation degradation (plan `379` §6).

### Both directions, measured

- Removing the tracked commit (`commitsOnTrackedBlur` → `false`) fails exactly
  `commits the draft…` and `reformats a pending draft…` (`2 failed | 21
  skipped`); restoring it passes both.
- Removing the `useFocus` clear fails `fields > paints an autoFocus Input's ring…
  clears it` and `number-field > paints the chrome ring from mount…`; restoring
  it passes both.
- Removing the `OTPField` clear fails `otp > paints the first cell's ring from
  mount…`; restoring it passes.
- Removing `!spec.disabled` fails only the pure `never commits a disabled field`
  case; removing `!spec.handledByEvent` fails only `leaves the loss to the host
  event`. Both restored.


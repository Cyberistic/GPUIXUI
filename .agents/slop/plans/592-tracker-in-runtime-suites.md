# 592 — the focus tracker in the component runtime suites

**Phase:** F (verification truth)
**Depends on:** `041`, `083`, `084`, `089`, `328`, `344`, `353`, `359`, `583`, `590`, `591`
**Owns:** `packages/primitives` only.

## 1. The problem

Plan `590` made focus a **sampled** signal on a runtime that dispatches no focus
events, and plan `591` made the sample able to clear a stale seeded state. Some
component suites still assert in the same tick as the focus move they just
performed. On the release-tag build that reads the *old* render:

| File | Case | Measured failure |
| ---- | ---- | ---------------- |
| `activation.runtime.test.tsx` | RadioGroup / Rating × enter/space sequences (8) | the focused item's index is still `None`, so activation falls back to the tab stop (`'a'` instead of `'b'`, or `[]` for Rating) |
| `roving-arrows.runtime.test.tsx` | `commits star 1 from an unrated rating…` | Space resolves the cursor from `value={0}`, so nothing is reported |
| `controls.runtime.test.tsx` | the four ring cases (attached group, separated group, radio, checkbox/switch) | the ring is read before the tracker's sample |
| `fields.runtime.test.tsx` | the five `Select` trigger ring cases (Tab, open, Escape, commit, disabled) | same: the trigger's `focused` is still false, so the resting elevation is read instead of the ring |
| `loading.runtime.test.tsx` | determinate `Progress` schedules no step timer | `setInterval` count is 1, not 0 — the count now includes `NativeFocusProvider`'s 50 ms sample |

None of these is a product defect: the underlying rules were proven in plans
`083`, `344`, `353`, `359`, `328`, `590` and `591`, and the assertions still
target them. The tests predate the tracker (or the timer count).

## 2. The changes

No component code. Test files only.

### 2.1 `runtime/activation.runtime.test.tsx`

Import `settleFocus`; make the `focus` helper async:

```ts
const focus = async (runtime: Runtime, testId: string): Promise<void> => {
  const element = Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`no element ${testId} in the activation scene`),
  );
  runtime.renderer.focusElement(element.id);
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  await settleFocus();
};
```

and `await focus(runtime, testCase.focusId)` in the case body. This is the focus
the component *sees*, not a different target: the sequence still runs on the
same `focusId`.

### 2.2 `runtime/roving-arrows.runtime.test.tsx`

Focus `ra-star-1` through the renderer, `flush`, `await settleFocus()`, then send
the Space pair to that id. `walk` already delivers every later key to
`runtime.focused()`, so only the first focus needs the wait.

### 2.3 `runtime/controls.runtime.test.tsx`

Import `settleFocus` and wait after each focus move whose assertion is about the
ring:

- `paints an attached group's focus ring inside its clip` — after `focusNext()`;
- `keeps the outer ring for a separated group` — after `focusNext()`;
- `rings the radio that holds focus, and only that one` — after **each**
  `focusNext()` (both assertions);
- `rings a focused Checkbox and Switch, and clears it when focus leaves` — after
  each `click`.

The two switch-thumb geometry cases are **not** touched (published box model).

### 2.4 `runtime/fields.runtime.test.tsx`

Import `settleFocus` (already imported for plan `591`) and wait after each focus
move that a `Select` ring assertion follows:

- Tab reaching the trigger, and the move away from it;
- opening the list with Enter, so the trigger is focused when the runtime opens
  it;
- Escape and option-commit cases, before reading the returned ring;
- the disabled-Tab case, before reading "no ring".

Do not change the placement, width or height assertions in this file.

### 2.5 `runtime/loading.runtime.test.tsx`

Count the component's own step timer, not every interval:

```ts
const stepTimers = (spy: SpyInstance): number =>
  Arr.length(Arr.filter(spy.mock.calls, ([, delay]) => delay === 120));
```

`useStep` uses 120 ms; the tracker uses `NATIVE_FOCUS_POLL_MS` (50). Assert
`0` for the determinate bar and `1` for the indeterminate one. Update the
comment to say the tracker's interval is excluded by its delay.

## 3. Test plan / expected results

Run one runtime process at a time (two concurrent windows corrupt focus on this
host — measured):

1. `nubx vitest run --config vitest.runtime.config.ts runtime/activation.runtime.test.tsx`
   — expected `72 passed` (was 64 passed / 8 failed).
2. `... runtime/roving-arrows.runtime.test.tsx` — expected all pass (was 1
   failure).
3. `... runtime/controls.runtime.test.tsx` — expected the four ring cases pass;
   the two switch-thumb geometry cases still fail.
4. `... runtime/fields.runtime.test.tsx` — expected the five `Select` ring cases
   pass; the placement/height/tooltip cases are unchanged.
5. `... runtime/loading.runtime.test.tsx` — expected all pass.
6. `nubx vitest run --config vitest.runtime.config.ts` — record the total; expect
   **19 fewer failures** than plan `591`'s `66 failed / 656 passed`, no new
   failure.
7. `nub run test`, `nub run check-types`, `nub run check`, `nub run lint` — green.

### Both directions

The settle must not weaken the assertion. For one case per file, mutate the
rule it guards and show it still fails **with** the wait:

- `controls`: drop the focus ring from `Switch`/`Checkbox` (`controlFocusStyle`)
  → `rings a focused Checkbox and Switch…` fails;
- `activation`: make `Rating`'s activation use the value tab stop instead of the
  focused index → its four cases fail (the plan `359` rule);
- `loading`: remove `useStep`'s `active` gate → the determinate count is 1
  again;
- `fields`: drop the ring from the Select trigger (`state.focused || state.open`)
  → the Tab case fails.

Restore each mutation and re-run the case. Record the outcomes in §5.

## 4. STOP conditions

- A case still fails after `settleFocus` with the rule intact: STOP; classify it
  (box model, tooltip open-on-focus, host degradation) and do not change its
  assertion.
- Any previously green case in the touched file regresses: STOP and revert that
  file.
- A test needs a longer wait than `settleFocus` (120 ms): STOP and report; do not
  add ad-hoc `sleep`s.

## 5. Result

Measured on this host, release-tag build, 2026-10-19.

**Scoped runs (one process each):**

| File | Result |
| --- | --- |
| `runtime/activation.runtime.test.tsx` | **81 passed / 0 failed** (was 8 failures) |
| `runtime/roving-arrows.runtime.test.tsx` | **6 passed / 0 failed** |
| `runtime/loading.runtime.test.tsx` | **9 passed / 0 failed** |
| `runtime/fields.runtime.test.tsx -t "Select trigger|disabled Select"` | **5 passed / 0 failed** |
| `runtime/controls.runtime.test.tsx -t` ring cases | separated ring, radio ring and checkbox/switch ring pass; the **attached-group** case still fails on the measured content-box offset (the overlay's border is reported inset by its 3 px width — the published box model, plan `529` §6.5), not this plan |

**Whole runtime suite:** `50 files / 722 tests — 669 passed / 53 failed`, 12
failing files (was 656 passed / 66 failed, 13 files). Fourteen cases left the
failure list and one `disabled > Button paints no ring` case appeared in this
particular full run; it passes scoped (`1 passed / 28 skipped`) and is the
documented window-accumulation degradation (plan `379` §6), not a regression.
The full run also still shows four activation cases that are 81/81 green in a
fresh process, the same host effect.

**Both-direction mutations (the wait does not mask the rule):**

- `Progress` without `useStep`'s `active` gate → the determinate case fails
  (1 step timer) and passes restored;
- `Select`'s trigger with `focused: false` → `rings the Select trigger when Tab
  reaches it` fails and passes restored;
- `Rating`'s cursor reverted to the value tab stop (`const cursor = value`) →
  all four Rating activation cases fail and pass restored;
- `Switch`'s paint spec with `focused: false` → `rings a focused Checkbox and
  Switch…` fails and passes restored.

`nub run test` (805), `nub run check-types`, `nub run check` and `nub run lint`
were green before the mutations; they were re-run after restoring and are green
again (the final counts are repeated in `TODO.md`).


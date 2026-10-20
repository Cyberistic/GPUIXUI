# 754 — The remaining ring owners sample native focus

**Phase:** F (integration and polish, Tier 2 hardening)
**Owner:** `components` workstream (`packages/components`)
**Depends on:** 110, 117, 200, 201, 388, 394, 522, 536, 540, 680, 748, 752
**Number:** `754` is the first free number across every worktree — `753` is
tokens-theme's (`753-dimensions-consumer-reach`), and the components workstream's
highest is `752` (`PLAN.md` D30).

**Status: done** (2026-10-20) — see §8 for the measured result.

---

## 1. The defect

Plan 752 moved the shared `useFocusState` hook onto the renderer's focused host
and adopted it in `Button`, `IconButton`, `TabsTrigger`, `AccordionTrigger` and
`CollapsibleTrigger`. Six ring owners still derive `focused` from React
`onFocus`/`onBlur` alone:

| family | ring owner | source |
| ------ | ---------- | ------ |
| Carousel | root (`role="group"`) and every indicator dot | `src/carousel.tsx` |
| Color picker | each swatch (the HEX field already uses `useFocusState`) | `src/color-picker.tsx` |
| Hotkey recorder | the clear control | `src/hotkey-recorder.tsx` |
| Tag / token input | each chip's removal control | `src/tag-input.tsx` |
| Mention input | each suggestion row | `src/mention-input.tsx` |
| Time picker | the clear control (`TimePickerClear`) | `src/time-picker.tsx` |

`@gpuix/native@0.10.0` delivers **no React `focus`/`blur` for a native focus
change** (plans 536/540; re-measured by 613, 659, 660, 672, 748 and 752). A ring
painted from `onFocus` is therefore absent after `Tab`, `renderer.focusNext()`,
`renderer.focusElement()` or a pointer press — the paths a user actually takes.

Measured on this host (2026-10-20) with
`nub run test:behaviour carousel color-picker hotkey-recorder tag-input mention-input time-picker`:

```
Test Files  6 failed (6)
Tests       7 failed | 91 passed (98)
```

The seven failures are:

| suite | case | why at `HEAD` |
| ----- | ---- | ------------- |
| `carousel` | `paints the focus ring on the group and the focused dot` | group and dot rings are `undefined` after `focusElement` |
| `color-picker` | `paints the focus ring on a focused swatch` | swatch ring is `undefined` |
| `hotkey-recorder` | `paints the focus ring on the clear control` | clear ring is `undefined` |
| `mention-input` | `paints the focus ring on a focused row` | row ring is `undefined` |
| `mention-input` | `composes the caller's field handlers` | React `onFocus` is never delivered for a native focus move — **the recorded plan-540 binding class, out of scope here** |
| `tag-input` | `paints the focus ring on a chip's removal control` | chip removal ring is `undefined` |
| `time-picker` | `paints the focus ring on the clear control` | clear ring is `undefined` |

The six ring cases are real, fixable defects. The seventh is the binding's
missing focus event and stays red; this plan does not synthesise a caller handler
for a native focus move.

## 2. The rule and the fix

**Rule (unchanged from 748/752).** A ring-owning part samples
`renderer.getFocusedElementId()` through `useNativeFocusId` while it is enabled
(50 ms, `src/internal/native-focus.ts`) and paints the ring only while **its own
host** is the focused host. The `autoFocus` seed and the React flag stand only
until the sample names a host. A disabled part neither samples nor paints.

Two shapes are enough:

1. **One part, one host id** — `useFocusState(autoFocus, disabled, hostId)` with
   the instance held in state exactly like `TabsTrigger`/`CollapsibleTrigger`:
   ```tsx
   const [instance, setInstance] = useState<PublicInstance | undefined>(undefined);
   const attach = useCallback((next: PublicInstance | null) => {
     setInstance(next ?? undefined);
   }, []);
   const setElement = useMergedRef<PublicInstance | null>(attach, ref);
   ```
   The `useCallback` is required: an inline ref callback re-attaches on every
   render and churns the state.
2. **A group of hosts, one sample** — the container calls
   `useNativeFocusId(!disabled)` once and keeps each child's host id in a
   `useRef` array written by its ref callback. A dot/swatch rings when
   `focusedId === ids.current[index]`. This keeps one interval per group rather
   than one per child.

### 2.1 `src/carousel.tsx`

- Root: replace the `root`-only merged ref with an attach callback that keeps
  both `root.current` (the key-ownership check in the existing `onKeyDown`) and
  a state instance; pass `instance?.id` to
  `useFocusState(autoFocus, false, instance?.id)`.
- Indicators: remove `focusedIndex`; sample once with
  `useNativeFocusId(count > 0)`; hold dot ids in `useRef<Array<number | undefined>>([])`
  and set `ref={(element) => { ids.current[index] = element?.id; }}` on each dot.
  The ring condition is `focusedId !== null && focusedId === ids.current[index]`.
  Keep `activationHandlers`, the pointer `onClick`, the labels and the styles.

### 2.2 `src/color-picker.tsx`

- Swatches: remove `focusedSwatch` and its disabled reset; sample once with
  `useNativeFocusId(!disabled)`; keep swatch ids in a ref array; ring when the
  sample names that swatch's host.
- The HEX field already calls `useFocusState(false, disabled)`; add an instance
  state + ref and pass `instance?.id` so its ring also follows native focus.

### 2.3 `src/hotkey-recorder.tsx`

- Root: add the instance state/attach pair and pass the id to the existing
  `useFocusState(autoFocus, disabled, id)`.
- Clear control: replace `clearFocused` with
  `useFocusState(false, disabled, clearId)` and give the control its own
  instance/attach pair (`ref={setClear}`).

### 2.4 `src/tag-input.tsx` — `TagInputChip`

- The chip wrapper keeps the caller's `ref`; the **removal control** gets its
  own instance state and `useFocusState(false, disabled, removeId)`.
- Replace `focused` with the hook's flag. Keep the removal `activationHandlers`,
  the `-remove` test id and the hover style.

### 2.5 `src/mention-input.tsx` — `MentionInputItem`

- Add the instance state/attach pair, compose the caller's `ref` with
  `useMergedRef`, and replace `focused` with
  `useFocusState(autoFocus, false, instance?.id)`.
- Keep the Escape claim, activation, highlight fill and caller handlers.

### 2.6 `src/time-picker.tsx` — `TimePickerClear`

- Add the instance state/attach pair and replace `focused` with
  `useFocusState(false, disabled, instance?.id)`.
- `TimePickerClear` has no caller `ref`; the attach is local.

### 2.7 What must not change

- The ring colour/geometry (`focusRing(theme)`), hover fills, `tabIndex`, the
  disabled dimming/absence of the control, `stateDescription`, and every
  caller handler (`onFocus`, `onBlur`, `onKeyDown`, `onClick`).
- No part synthesises a React focus event. The sampler paints; it does not call
  the caller's `onFocus`.
- No new polling for a part that already samples: `ColorPicker`'s HEX field and
  the recorder root keep their existing hooks and gain only a host id.

## 3. Test plan

The six ring cases already exist and are already red. Their assertions must wait
for the 50 ms sample instead of asserting synchronously, and must prove the ring
**clears** when focus leaves — the sample is the truth after it names a host.

1. `src/behaviour/carousel.test.tsx` — `paints the focus ring on the group and
   the focused dot`: `await until(group.boxShadow !== undefined)`, assert the
   first dot has none; focus dot 1; `await until(dot1.boxShadow !== undefined)`;
   assert dot 0 and the group are clear.
2. `src/behaviour/color-picker.test.tsx` — `paints the focus ring on a focused
   swatch`: `await until(swatch1.boxShadow !== undefined)`, assert swatch 0
   clear; focus swatch 0; `await until(swatch1.boxShadow === undefined)` and
   `await until(swatch0.boxShadow !== undefined)`.
3. `src/behaviour/hotkey-recorder.test.tsx` — `paints the focus ring on the
   clear control`: focus the clear control, `await until(ring)`, then focus
   another host and `await until(ring === undefined)`.
4. `src/behaviour/tag-input.test.tsx` — `paints the focus ring on a chip's
   removal control`: focus the removal control, `await until(ring)`, move focus
   to the field, `await until(ring === undefined)`.
5. `src/behaviour/mention-input.test.tsx` — `paints the focus ring on a focused
   row`: `await until(row-anna.boxShadow !== undefined)`, assert the highlighted
   row still has none; move focus to `row-ana`, await the ring moving.
6. `src/behaviour/time-picker.test.tsx` — `paints the focus ring on the clear
   control`: focus, `await until(ring)`, focus the hours segment,
   `await until(ring === undefined)`.

`until` comes from `../internal/interaction.js` (default 2 s budget, 20 ms
interval). Import it where the suite does not already.

### Both-direction proof (run and record)

- `git stash push` the six source files (keep the tests) → the six ring cases
  fail with `undefined`; the `mention-input > composes the caller's field
  handlers` case also fails, for its recorded reason.
- Restore the fix → the six ring cases pass; the caller-handler case stays red.
- Revert one part at a time to confirm each case is bound to its own source
  (Carousel group/dot, swatch, clear, chip, row, clear).
- A synchronous assertion (no `until`) must fail after the fix — that is the
  proof that the sample, not a stashed React event, is painting the ring.

### Expected counts

| suite | total | after this plan |
| ----- | ----- | --------------- |
| carousel | 21 | 21 passed |
| color-picker | 13 | 13 passed |
| hotkey-recorder | 16 | 16 passed |
| tag-input | 16 | 16 passed |
| mention-input | 18 | 17 passed, 1 plan-540 failure |
| time-picker | 14 | 14 passed |

No test is added or removed, so every stated docs/inventory count is unchanged.

## 4. Documentation and inventory sync (all required before "done")

1. `docs/component-api.md` §5 — add the six parts to the sentence that lists the
   parts sampling `getFocusedElementId()`.
2. `COMPONENTS.md` — the cross-cutting focus paragraph and the six rows
   (Carousel, Color picker, Hotkey-recorder input, Tag / token input, Mention
   input, Time pickers) say the ring follows the renderer's focused host. Counts
   stay as they are.
3. `packages/components/docs/{carousel,color-picker,hotkey-recorder,tag-input,mention-input,time-picker}.mdx`
   — replace the "React focus/blur, so a ring may not paint" limitation with the
   sampled rule. No count changes.
4. `TODO.md` — tick the follow-up row under *Tier 2 hardening after the
   inventory closed* with the measurement, the counts and the one remaining
   plan-540 case.
5. `.agents/slop/plans/README.md` — the 754 row with its status.
6. `PLAN.md` D30 — record `754`, that `753` went to tokens-theme, and the next
   free components overflow number.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

| Command | Expected |
| ------- | -------- |
| `cd packages/components && nub run test:behaviour carousel color-picker hotkey-recorder tag-input mention-input time-picker` | before: `7 failed / 91 passed`; after: `1 failed / 97 passed (98)` — the one failure is `mention-input > composes the caller's field handlers` |
| `cd packages/components && nub run test:behaviour carousel` | 21 passed |
| `cd packages/components && nub run test:behaviour color-picker` | 13 passed |
| `cd packages/components && nub run test:behaviour hotkey-recorder` | 16 passed |
| `cd packages/components && nub run test:behaviour tag-input` | 16 passed |
| `cd packages/components && nub run test:behaviour mention-input` | 17 passed, 1 recorded plan-540 failure |
| `cd packages/components && nub run test:behaviour time-picker` | 14 passed |
| `nub run check` | exit 0, including the inventory doc-count check |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

The full native behaviour suite is the end-of-task check for this cross-cutting
change: record passed/failed/total and compare the failing files with the
recorded plan-540 classes. A new failing file is a regression.

## 6. STOP conditions

Stop and report with evidence if any of these happen:

- `getFocusedElementId()` does not report the part's host after
  `focusElement` (nothing to compare against) — report the binding, do not fake
  the ring.
- A part's host id changes every render, so the comparison never holds — the
  sample shape is wrong for that part; report it instead of moving the ring to a
  wrapper.
- A new sample makes an existing `autoFocus` ring case flake (the seed must
  paint before the first tick) — fix the fallback, not the test.
- A caller `onFocus`/`onBlur` stops firing where the runtime does deliver it —
  the composed handlers are the contract.
- More than the one recorded `mention-input` case remains red, or a previously
  green case in these six suites turns red.
- The tests cannot be made to fail at `HEAD` (a test that cannot fail is not a
  test).

## 7. Acceptance

- A Carousel root, indicator dot, colour swatch, HEX field, recorder clear
  control, chip removal control, mention row and time-picker clear control paint
  the token ring when native focus reaches them, clear it when focus leaves, and
  paint none while disabled.
- Both-direction proof recorded (§3) with the real numbers; the one remaining
  `mention-input` failure is identified as the plan-540 binding class.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 are synced;
  every stated count is the suite's real count.
- `nub run check`, `nub run lint` and `nub run test` exit `0`.
- The change is committed on `agent/components` and pushed (never to `master`).

## 8. Result (filled when done)

Done 2026-10-20.

- **The fix.** Every remaining ring owner now follows the renderer's focused
  host. `Carousel`'s root and `ColorPicker`'s HEX field pass their host id to
  `useFocusState`; `HotkeyRecorder` (root and clear), `TagInputChip`'s removal
  control, `MentionInputItem` and `TimePickerClear` hold their own instance
  state and pass the id. The two groups (`CarouselIndicators`, the colour
  swatch grid) take one `useNativeFocusId` sample each and compare it with the
  host ids their children register in a ref array, so a group costs one interval
  rather than one per child. The caller `ref` still composes through
  `useMergedRef` where a part already exposed one.
- **Both directions.** With the six sources reverted (`git stash push`), the
  combined run is `7 failed / 91 passed (98)`; the six ring cases fail with
  `boxShadow: undefined` and the `mention-input > composes the caller's field
  handlers` case fails for its binding reason. With the fix it is
  `1 failed / 97 passed (98)` — only the caller-handler case remains.
- **Counts.** Carousel 21/21, Color picker 13/13, Hotkey recorder 16/16,
  Tag input 16/16, Mention input 17/18, Time picker 14/14. No test was added or
  removed, so every docs and `COMPONENTS.md` count is unchanged.
- **Full native suite.** `944 passed / 20 failed of 964` — the same 20
  plan-540 binding classes (placement, the density height probe, the React
  `onFocus`/`onBlur` cases in Inline edit, Mention input and Tabs). No new
  failing file; the six ring cases left the list (plan 752 recorded 938/26).
- **Gates.** `nub run check`, `nub run lint` and `nub run test` exit `0`
  (unit 488 in 46 files). The inventory's focus-claim check still passes: each of
  the six pages keeps the `autoFocus` claim and adds the sampled rule.
- **Recorded limitation.** `MentionInput`'s `composes the caller's field
  handlers` case stays red: the runtime delivers no React `focus` for
  `focusElement`, and this plan does not synthesise a caller handler. The tag
  input, mention input and time-picker **group** rings still follow React
  `focus`/`blur` for their field/segment focus; their pages state it.

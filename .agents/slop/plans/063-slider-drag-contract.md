# 063 — A slider drag is captured, and only the primary button may start one

**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** 030, 041, 047, 053 (the value controls), 140/130 (pointer capture
measured in the playground).
**Status:** done (2026-10-17) — see §6 for the measured outcome and both proofs.

---

## 0. Two measured facts, one of them a bug

### 0.1 The documented "no pointer capture" limitation is false

`Slider.tsx`'s header, `packages/primitives/README.md`, `COMPONENTS.md` and both
value docs say:

> there is no pointer capture, so a drag only tracks while the pointer is over
> the track.

That was an **assumption written into plan 053**, not a measurement. GPUix
0.10.0 captures the pointer on the pressed element from the left button:

- the playground's `panel-resize` scenario drags a 6 px divider 80 px and then
  far past the pane's edge, and the divider keeps tracking (20/20 native smoke
  green, `COMPONENTS.md` capability table, plan `140` §4);
- `.agents/adr/0002-two-gpuix-versions.md` records pointer-capture resizing on
  both 0.5.1 and 0.10.0;
- measured here with the primitives harness (`mousePress` at 25 %, move to 60 %
  **80 px below the track**, release): `onChange` reported `60`, then a second
  drag past the right edge reported `100`, and the left edge `0`.

The component already implements a drag (`dragging` ref, `onMouseDown` /
`onMouseMove` / `onMouseUp`, `pressedButton === 0`); it works because the
runtime captures. Nothing about the behaviour is broken — only the claim about
it, and the tests that were skipped because of the false claim.

### 0.2 A real bug: any mouse button moves a slider

`Slider` and `RangeSlider` start a gesture in `onMouseDown` without looking at
`event.button`. Measured on this host against the locally built
`@gpuix/native@0.10.0` (`nativeSimulateMouseDown(x, y, 2)` / `(x, y, 1)`):

| Component | Gesture | Measured | Expected |
| --------- | ------- | -------- | -------- |
| `Slider` (value 25) | right click at 75 % | value `75` | unchanged |
| `Slider` (value 25) | middle click at 75 % | value `75` | unchanged |
| `RangeSlider` (`[20, 60]`) | right click at 90 % | max `90`, native focus on `"P maximum"` | unchanged, no focus move |

The other clickable primitives are already correct: a right click on `Button`,
`Checkbox`, `Switch` and `Toggle` fires no activation (measured in the same
probe), because the runtime dispatches non-primary clicks as `onAuxClick` and
those components listen to `onClick`. Only the two sliders listen to raw mouse
down, so only they need the guard.

`EventPayload.button` is "0=left, 1=middle, 2=right … Populated for: mouseDown,
mouseUp, click, mouseDownOutside, contextMenu" (`@gpuix/native` 0.10.0
`index.d.ts`), and `pressedButton` carries the same encoding for a move.

## 1. Decision

1. **A slider gesture starts only on the primary button.**
   `onPointerDown` returns unless `event.button === 0` (and the component is not
   disabled). Nothing else about the drag changes: the move guard already
   refuses `pressedButton !== 0`, so a gesture that began on the left button
   stays a left-button gesture.
2. **Say what is true.** Delete the "no pointer capture" claim everywhere and
   replace it with the measured contract: a drag keeps tracking outside the
   track and clamps at the ends; the runtime exposes no capture *API* because it
   does not need one — capture is automatic for the pressed element.
3. **Test the gesture.** The drag was untested; add runtime tests for
   leaving the track, clamping past both ends, a range end dragged past its
   twin, and the non-primary guard on both sliders. Fix the existing "never lets
   the two ends cross" test, whose comment claims a drag it never performs.
4. **Record the measurement in plan 053.** Plan 053 is an executed record; do
   not rewrite its §2, append a correction section instead so the history and
   the correction stay legible.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Slider.tsx` | `onPointerDown` guards `event.button === 0` in `Slider` **and** `RangeSlider`; the header's false limitation is replaced with the measured drag/capture contract |
| `packages/primitives/runtime/value.runtime.test.tsx` | five runtime tests (drag leaves the track; clamps at both ends; non-primary click on `Slider`; range drag leaves the track; non-primary click on `RangeSlider` changes nothing and moves no focus); the crossing test now drags instead of pressing End |
| `packages/primitives/runtime/harness.ts` | `mouseMoveAt`'s doc says what capture means: a pressed-button move is routed to the pressed element even outside it |
| `packages/primitives/docs/slider.mdx` | "Pointer behaviour" states the captured drag; "Limitations" loses the false entry; Verification lists the new tests |
| `packages/primitives/docs/range-slider.mdx` | same two edits |
| `COMPONENTS.md` | `Slider` and `RangeSlider` rows: captured drag, primary-button-only, measured test names |
| `packages/primitives/README.md` | limitations table: pointer capture is **present**; drag stays inside the track is deleted; runtime count updated |
| `.agents/slop/plans/053-value-controls.md` | append §12: the §2.3 "no pointer capture" claim was wrong; measured evidence |
| `.agents/slop/plans/README.md` | index row for 063 |
| `TODO.md` | the new task, ticked when done |

Nothing outside `packages/primitives`, `COMPONENTS.md`, `TODO.md` and
`.agents/slop/plans/` is touched.

## 3. Steps and exact commands

From `/Users/cyberistic/GPUIXUI/workspaces/primitives`.

### 3.1 The guard

In `src/components/Slider.tsx`:

- `Slider`'s `onPointerDown` becomes

  ```ts
  onPointerDown: (event) => {
    if (props.disabled === true || event.button !== 0) return;
    dragging.current = true;
    apply(event);
  },
  ```

- `RangeSlider`'s `onPointerDown` gets the same condition *before* it reads the
  pointer or calls `focusThumb`:

  ```ts
  onPointerDown: (event) => {
    if (props.disabled === true || event.button !== 0) return;
    …
  },
  ```

- The header comment loses the "no pointer capture" bullet and gains the
  measured contract, naming plan 063 §0. Keep the `aria-valuenow` bullet: that
  limitation is real (the host props in `@gpuix/native` 0.10.0 are exactly
  `aria-label`, `aria-description`, `aria-id`, `aria-expanded`,
  `aria-selected`, `aria-valuetext`, `aria-level`).

### 3.2 The runtime tests

In `runtime/value.runtime.test.tsx`, next to the existing value tests. The
helpers already there are enough: `mount`, `boundsOf`, `pointAt`, `announced`.

1. **`tracks a drag that leaves the track`**

   ```ts
   const seen: number[] = [];
   const runtime = await mount(
     <Slider testId="s" label="V" defaultValue={25} onChange={(v) => seen.push(v)} />,
   );
   const box = boundsOf(runtime, "s");
   const start = pointAt(runtime, "s", 0.25);
   runtime.mouseDownAt(start.x, start.y);
   const end = pointAt(runtime, "s", 0.6);
   runtime.mouseMoveAt(end.x, box.y + box.height + 80, 0); // outside the track
   runtime.mouseUpAt(end.x, box.y + box.height + 80);
   expect(seen.at(-1)).toBe(60);
   ```

2. **`clamps a drag past either end`** — the same tree; press at the current
   value, move past the right edge → `100`; press again, move past the left edge
   → `0`.

3. **`a right or middle click never moves the slider`**

   `nativeSimulateMouseDown` / `nativeSimulateMouseUp` at 75 % with button `2`,
   then button `1`; `seen` stays `[]`; then a left click at 50 % still reports
   `50` (the guard must not cost primary input).

4. **`moves a range end while the pointer is outside the track`** — grab the
   start thumb at 20 %, drag to 40 % 80 px below the track; the start is `40`,
   the end stays `60`.

5. **`a right click moves neither end of a range and takes no focus`** — right
   click at 90 %; both values unchanged; `runtime.focused()` is `Option.none()`.

6. **Fix the crossing test.** `never lets the two ends cross` currently presses
   at 1 % and then sends `end` on the keyboard while its comment says "a start
   **dragged** past the end stops on it". Replace the last half with a real
   drag: with `[0, 0]`, grab the start thumb, drag to 95 %; both ends read `90`
   (the default step puts both thumbs on the same value). Keep the name.

### 3.3 Two-direction proof

1. **Bug direction.** Before the guard, run only the new non-primary tests:

   ```sh
   nub run --filter @gpuixui/primitives test:runtime -- -t "never moves the slider"
   ```

   Expected: fail with `expected [ 75 ] to strictly equal []`. The range test
   fails with `expected "90" to be "20"`. Record both.

2. **Drag direction.** Temporarily delete `onMouseMove={handlers.onPointerMove}`
   from `renderSlider` (one attribute), re-run
   `-t "tracks a drag that leaves the track"`; expected: `undefined` instead of
   `60` (no move reaches the track without the handler). Restore.

3. **Restored green.**

   ```sh
   nub run --filter @gpuixui/primitives test:runtime
   nub run --filter @gpuixui/primitives test
   nub run check
   nub run lint
   nub run test
   ```

   Expected: the runtime suite is **15 files / 145 tests** (140 before), the
   offline suite unchanged, and every gate green. Record the exact numbers in
   §6.

### 3.4 The docs truth pass

- `docs/slider.mdx`: "Pointer behaviour" says a press moves the value and a
  **drag keeps updating after the pointer leaves the track** (the runtime
  captures the pressed element), clamped at both ends. Delete the "No pointer
  capture" limitation. Verification gains the two new test names.
- `docs/range-slider.mdx`: same; also record that a press moves native focus to
  the grabbed thumb on the primary button only.
- `packages/primitives/README.md`: replace the `pointer capture | absent` row
  with `pointer capture | present (automatic on the pressed element)` and the
  consequence "a drag keeps tracking outside the track; click/keyboard remain
  the precise paths"; update the measured runtime count.
- `COMPONENTS.md`: both rows — `**Drag (063):**` pointer-captured, a move
  outside the track keeps tracking and clamps at the ends; only the primary
  button starts a gesture.
- `plan 053`: append §12 with the two measured facts and a pointer to 063.
- Index 063 in `.agents/slop/plans/README.md`; add and tick the task in
  `TODO.md`.

## 4. Acceptance

- A left-button drag on `Slider`/`RangeSlider` keeps updating when the pointer
  leaves the track and clamps at the ends — measured in the real runtime.
- A right or middle click changes neither the value nor native focus on either
  slider; a left click still does.
- No file claims "no pointer capture"; the docs describe the measured contract
  and name the tests.
- Both directions proven: the new tests fail without the guard / without the
  move handler, and pass with them.
- `nub run check`, `nub run lint`, `nub run test`,
  `nub run --filter @gpuixui/primitives test:runtime` all green.

## 5. STOP conditions

- `@gpuix/native` 0.10.0 does not report `button` on `mouseDown` in the pressed
  event (the probe above shows it does) — stop and record the payload; do not
  guess at a modifier.
- A drag that leaves the track stops updating even with the move handler — the
  capture evidence would then be wrong; stop, record the exact event sequence,
  and leave the limitation documented rather than deleting a true claim.
- The left-button `onClick` path regresses (the slider no longer moves on a
  click): stop and record which event carried which `button` value; the guard
  is `button !== 0`, so a `0` must pass.
- The runtime suite's window cannot be reused across the five new tests
  (floating paint or a stale drag flag) — stop and report; do not reorder tests
  until they pass by luck.

## 6. Outcome (executed on this host, 2026-10-17)

**The guard.** `Slider`'s and `RangeSlider`'s `onPointerDown` now return unless
`event.button === 0`; nothing else in the gesture changed. A right or middle
press no longer sets a value or calls `focusThumb`.

**The tests.** Five tests added to `runtime/value.runtime.test.tsx` (140 → 145
tests, still 14 files):

| Test | Guards |
| ---- | ------ |
| `keeps tracking a drag after the pointer leaves the track` | a drag is captured; a handler that checks the pointer position would freeze at the last inside value |
| `clamps a drag that runs past either end` | the value stays inside `min`/`max` after the pointer leaves on the right or the left |
| `refuses a non-primary press, and a left click still moves the value` | the `button === 0` guard, and that it does not cost primary input |
| `keeps dragging a range end after the pointer leaves the track` | the same capture contract on the grabbed thumb |
| `refuses a non-primary press on a range and moves no focus` | the guard also stops `focusElement` from moving focus to a thumb |

The existing `never lets the two ends cross` now performs the drag its comment
always claimed (it previously pressed and sent `End`), and still ends at
`[90, 90]`.

**Both directions proven, then restored green.**

| Guard removed | Failing test | Measured failure |
| ------------- | ------------ | ---------------- |
| `event.button !== 0` in both `onPointerDown`s | `refuses a non-primary press, and a left click still moves the value` | `expected [ 75 ] to strictly equal []` |
| same | `refuses a non-primary press on a range and moves no focus` | `expected '90' to be '60'` (the right click moved the maximum) |
| `onMouseMove={handlers.onPointerMove}` on `Slider` | `keeps tracking a drag after the pointer leaves the track` | `expected undefined to be 60` (no move reaches the track) |
| same | `clamps a drag that runs past either end` | `expected undefined to be 100` |

Restored: `nub run --filter @gpuixui/primitives test:runtime` → **14 files, 145
tests, all passing**; `nub run --filter @gpuixui/primitives test` → **306 tests**
(unchanged — this fix adds runtime coverage only).

**Docs corrected.** `docs/slider.mdx`, `docs/range-slider.mdx`,
`docs/number-field.mdx` (its drag-to-scrub note also cited the non-existent
capture limit), `packages/primitives/README.md`, both `COMPONENTS.md` rows and
plan 053 §2.3/§11.5/§13. The only remaining slider limitation is the real one:
no `aria-valuenow`/`min`/`max` in the host props.

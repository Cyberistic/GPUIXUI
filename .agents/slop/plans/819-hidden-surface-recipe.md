# 819 — The hidden-surface recipe, in the frame

**Phase:** F (native behaviour in the frame) · **Workstream:** playground ·
**Status:** planned

**Depends on:** `140`, `177`, `347`, `674`, `690`, `697`, `701`, `707`, `708`,
`713`, `715`, `722`, `724`, `734`, `736`, `745`, `754`, `761`, `773`, `775`,
`778`, `784`, `791`, `797`, `801`, `807`, `811`, `812`, `816`.

**Owns:** `apps/playground` only. `COMPONENTS.md` and the ledgers are updated
for the record; the component-side adoption stays a cross-team row.

---

## 1. The claim being guarded

Two shipped surfaces hide an inactive surface with the same recipe, and the
records state its contract in prose that no frame has ever tested:

- `workspace-panes` (plan `177`): tab panes stay mounted in **absolute
  overlapping slots**, the inactive slot is `visibility: "hidden"` +
  `pointerEvents: "none"`, and `display: "none"` is a no-op.
- `COMPONENTS.md`'s "Tabbed panels" row (line 735) and the **Carousel** row
  (line 1085) repeat it: "absolute-slot + `visibility` recipe", "the pane
  leaves the paint and the hit-test".
- `wizard` (`wizard.tsx:449`) uses the same `visibility` mechanism for steps.

The evidence behind those words is **text and geometry**, never paint:

| What was measured | How | Why it is not the recipe |
| ----------------- | --- | ------------------------ |
| the hidden pane's text is absent from `getPaintedText()` | `workspace-panes` | an element's **fill** never appears in painted text; a hidden pane that still paints its `card` background passes |
| a click meant for the row beneath is not swallowed | `workspace-panes`, with **both** mechanisms on | the two mechanisms are never isolated, so nobody knows whether `visibility` or `pointerEvents` owns the hit |
| `display: "none"` is a no-op | `workspace-panes`, plan `177` §8 | measured on a **pane with text**, not on a fill, and never in the frame |
| hidden panes keep their state | `workspace-panes` | true, and not in question here |

So a `visibility: "hidden"` element that paints its fill — or one that keeps
taking clicks when `pointerEvents` is dropped — passes every existing check.
The SuRFACE this guards is the mechanism a consumer is told to copy for tab
panes, carousel slides and multi-step forms.

**Goal:** isolate each mechanism in a decoded frame and on the hit path, prove
the recipe's contract in both hosts, and pin the recipe in one pure helper so a
consumer cannot drop half of it.

---

## 2. Reconnaissance (source, pinned `0.10.0`)

Read from `.agents/slop/scratch/gpuix-build/release/gpuix/packages/native/src/`:

- `renderer.rs:5844` — `visibility: "hidden"` → `el.invisible()`.
- `renderer.rs:5115–5134` — a `div` with an absolute position **occludes**:
  `should_occlude` decides between `el.occlude()` (`pointerEvents: "auto"`) and
  `el.block_mouse_except_scroll()` (everything else).
- `style.rs:307–323` — `should_occlude`: `pointerEvents: "none"` returns
  `false` first; then `position: absolute | fixed` returns `true`; then a
  non-transparent background returns `true`.
- `renderer.rs:5562–5566` — `display` is mapped only for `"flex"` and
  `"grid"`; every other value falls through, which is plan `177`'s no-op.
- `renderer.rs:5847` — `opacity` applies **after** visibility, so the two are
  independent fields of the same element.

**The open question the probe must answer:** GPUI inserts hitboxes during
**paint**, and `invisible()` skips paint. Does a `visibility: "hidden"` element
therefore lose its hitbox as well, making `pointerEvents: "none"` redundant —
the same null result plan `761`/`623` recorded for a toast card's
`pointerEvents: "auto"`? Either answer is a recorded fact; the recipe keeps
both mechanisms as **stated intent** until the frame says one is inert.

---

## 3. Design

### 3.1 The fixture (one static view, shared by both hosts)

A 640 × 460 stage (`hs-stage`, fill `background`) with four rows. Roles come
from the dark palette through `useTheme()` so the checks assert tokens:

| Row | Fixture | Style | Purpose |
| --- | ------- | ----- | ------- |
| 1 | `hs-display` | 140 × 64 at `(40, 40)`, fill `card`, `display: "none"` | the runtime's no-op is asserted on a **fill** |
| 2 | `hs-row` → `hs-hidden` + `hs-after` | a flex row at `(40, 130)`, two 140 × 64 boxes, `hs-hidden` is `visibility: "hidden"` | paint absent, layout retained |
| 3 | `hs-hit-base` / `hs-hit-none-base` | two 240 × 64 boxes side by side at `(40, 230)`, each with an absolute overlay that fills it: `hs-hit-overlay` is `visibility: "hidden"` only, `hs-hit-none-overlay` adds `pointerEvents: "none"` | which mechanism owns the hit |
| 4 | `hs-slots` | two absolutely positioned panes in a 400 × 100 relative box at `(40, 330)`: pane A (`card`, `hs-a-action` `Pressable`, `hs-a-hits` readout), pane B (`popover`, `<input testId="hs-b-input">`, `hs-b-draft` readout). The inactive pane uses `hiddenSlot(false)` from §3.3 | the recipe a consumer copies |
| — | `hs-hit` | readout `hit=<base\|overlay\|none>` written by the row-3 handlers | the hit evidence |

Rows 3 and 4 are mutually exclusive per click: each click reads `hs-hit`
**after** the click, and the readout is the only assertion about routing (plan
`724` measured that a painted handler runs alone).

### 3.2 The checks

Both hosts run the same `hiddenSurfaceChecks(ctx, driver)`. The frame is read
twice: once at rest with pane B active, once after switching to pane A.

**Frame frame:**

1. the frame's device scale is an integer;
2. `hs-display`'s centre paints `card` — `display: "none"` is inert on a fill
   too (the old claim only had text);
3. `hs-hidden`'s centre paints `background` — the hidden fill is absent;
4. `hs-hidden` reports **no painted bounds** — the runtime's own "not painted"
   answer, not an unmounted node (`text()` still returns its retained text);
5. `hs-after.x − hs-row.x` is `140 ± 1` and `hs-row.width` is `280 ± 1` — the
   hidden box still occupies its layout space, which is the pane-retention
   claim (a hidden element has no painted bounds, so the offset is measured
   against the row);
6. the hidden box's paint is far from its own `card` fill (guard against a
   sample that would pass either way).

**Hit path (row 3):**

7. a click on a plain `card` box (`hs-hit-plain`) sets `hit=base` — the
   coordinate and routing control;
8. a click at the first overlay's centre sets `hit` to the **measured** value
   (the outcome records `none` — the invisible overlay blocks the hitbox and
   its own handler is inert, so neither layer runs);
9. a click at the second overlay's centre sets `hit=base` — `pointerEvents:
   "none"` hands the press through, so that half is load-bearing;
10. all three fixtures paint the same `card` fill outside their overlays — the
    only difference is the mechanism (guard).

**The slot recipe (row 4):**

10. at rest, `hs-slots`' sample point paints `popover` (pane B active);
11. pane A's marker text is absent from `paintedText()`;
12. after switching to A, the same point paints `card`;
13. pane B's marker text is absent from `paintedText()`;
14. a click inside the slot (where hidden pane B covered it) reaches
    `hs-a-action`: `hits=1`;
15. switching back to B restores `draft=<typed>` — the state survived both
    switches;
16. pane B's own fill is painted again at the sample point.

**Recipe guard (pure, once per host):**

17. `slotProblems(hiddenSlot(false), false)` is empty;
18. `slotProblems({...hiddenSlot(false), pointerEvents: "auto"}, false)` names
    the missing mechanism — the recipe cannot silently lose half of itself.

### 3.3 The pure helper

`apps/playground/src/scenarios/hidden-surface.ts`:

```ts
/** An absolutely positioned layer that fills its parent. */
export interface SlotStyle {
  readonly position: "absolute";
  readonly top: 0;
  readonly left: 0;
  readonly right: 0;
  readonly bottom: 0;
  readonly visibility: "visible" | "hidden";
  readonly pointerEvents: "auto" | "none";
}

/** The recipe: the active layer paints and takes hits; the other does neither. */
export const hiddenSlot = (active: boolean): SlotStyle => ({ ... });

/** Why a slot style is not the recipe. Empty means correct. */
export const slotProblems = (
  slot: SlotStyle,
  active: boolean,
): ReadonlyArray<string> => [...];
```

`slotProblems` names both mechanisms separately, so a test (or a component's
own guard) can say *which* half is missing. Unit tests cover active, inactive,
and one dropped mechanism each.

### 3.4 Why a new scenario, not an edit to `workspace-panes`

`workspace-panes` is a 29-check composition probe whose measurements are cited
by plans `167`/`177`/`184`; adding four rows to it would move its numbers and
its geometry. A separate id keeps the recipe's evidence addressable and lets
the Carousel/components rows cite it directly. `workspace-panes` is unchanged.

---

## 4. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/hidden-surface.ts` | **new** — `SlotStyle`, `hiddenSlot`, `slotProblems` |
| `apps/playground/src/scenarios/hidden-surface.test.ts` | **new** — the three unit tests (§6) |
| `apps/playground/src/scenarios/hidden-surface.tsx` | **new** — `hiddenSurfaceView`, `hiddenSurfaceScenario` (`hidden-surface`), `hiddenSurfaceLiveScenario` (`live-hidden-surface`), `hiddenSurfaceChecks` |
| `apps/playground/src/scenarios/index.ts` | import + add `hiddenSurfaceScenario` to `scenarios` |
| `apps/playground/src/live/scenarios.tsx` | import the view/scenario, add a `liveHiddenSurface` entry with `ready: "hs-stage"` and a frame artifact, add it to `liveScenarios` |
| `apps/playground/README.md` | a "Hidden surfaces" section after "Tabbed panes (plan `177`)" |
| `COMPONENTS.md` | one sentence on the "Tabbed panels" row and one on the "Carousel" row citing `hidden-surface`/`live-hidden-surface` |
| `.agents/slop/plans/README.md` | the `819` row |
| `TODO.md` | the ticked workstream task |

No other path is edited (no `packages/*`).

---

## 5. Steps, commands, expected results

1. **Write the pure helper and its test first** (§3.3, §6). Run:
   ```sh
   nub run --filter playground test -- hidden-surface
   ```
   Expected: **red** on the inactive slot and on the dropped-mechanism case
   (the helper does not exist yet), then green after §3.3.

2. **Write the view and the headless scenario** (§3.1, §3.2), register it in
   `scenarios/index.ts`, and build:
   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only hidden-surface
   ```
   Expected: **green**, one scenario, the check count in §8 (predicted 44).

3. **Record the hit answer.** Read the `hit=` value the first overlay click
   produced. If it is `overlay`, `visibility` alone still takes the hit and
   `pointerEvents: "none"` is load-bearing; if it is `base`, `visibility` also
   removes the hitbox and `pointerEvents` is a stated-intent null result — in
   which case check 7 asserts `base` and §8 records the null result exactly as
   plan `623` did for a toast card. **Do not** delete `pointerEvents` from the
   recipe either way.

4. **Add the live twin** and run it:
   ```sh
   nub apps/playground/dist/live/run.js --only live-hidden-surface
   ```
   Expected: green, the same check count, one PNG artifact at
   `apps/playground/.artifacts/live/live-hidden-surface.png`.

5. **Mutation proofs (both directions).** Each is one edit, one run, then a
   revert:
   - `M1` — make `hiddenSlot(false)` `visibility: "visible"` only → the pane-B
     frame check fails by name (`expected #222730ff, got #191d25ff`);
   - `M2` — give the hidden pane B `pointerEvents: "none"` but drop
     `visibility` → check 13 or 16 fails by name;
   - `M3` — remove `pointerEvents: "none"` from the second row-3 overlay →
     check 8 fails with `hit=overlay`;
   - `M4` — remove the `hidden` from `hs-hidden` → check 3 fails with the card
     fill;
   - `M5` — remove `display: "none"` from `hs-display` → check 2 still passes
     (it is already the controlled expectation) — a **null control**, recorded,
     not counted as a proof;
   - `U1` — make `slotProblems` return `[]` always → the dropped-mechanism
     unit test fails.

   Every mutation must name the failing check in the output; a mutation that
   passes means the check is vacuous and must be strengthened before the plan
   is called done.

6. **Docs and ledgers.** README section, the two `COMPONENTS.md` sentences, the
   plan index row, the ticked `TODO.md` task.

7. **Gates.**
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: exit `0`; playground tests `+3`; the full headless suite is the
   end-of-task check (a new scenario changes the registry total).

8. **Commit and push** `agent/playground` in two commits: the plan, then the
   probe + records.

---

## 6. Test plan

| Test | Guards | Fails without the fix |
| ---- | ------ | --------------------- |
| `an inactive slot is hidden and pointer-transparent` | the recipe's two mechanisms | a slot with only visibility |
| `an active slot paints and takes hits` | the inverse, so the recipe is not "always hidden" | a slot that hides the active pane |
| `slotProblems names a dropped mechanism` | one source of truth for both halves | a helper that always returns `[]` |
| `display: none is inert on a fill` (runtime, both hosts) | the no-op claim on paint, not text | restoring `display` to a working value |
| `a hidden fill does not paint` (runtime, both hosts) | the paint half of the recipe | `visibility` missing |
| `the hidden box keeps its box and its space` (runtime) | layout retention | `display: none`-style removal, a zero-size slot |
| `pointerEvents: none hands the press through` (runtime, both hosts) | the hit half | the overlay taking the click |
| `the recipe keeps the pane's draft and routing` (runtime, both hosts) | the composition a consumer copies | a slot that unmounts, or that loses state |

Every runtime check names the measured value in its failure message, as the
existing pixel checks do.

---

## 7. STOP conditions

- **STOP** if `visibility: "hidden"` paints its fill anyway (check 3 sees
  `card`): the runtime ignores `invisible()` for fills, which **invalidates the
  recipe** every tabbed pane and carousel fix cites. Record it, stop, and open a
  cross-team row naming the affected components; do not paper over it with an
  `opacity: 0` workaround in the probe.
- **Measured during implementation:** the hidden element reports **no painted
  bounds** (`bounds` is `null`), which is expected for an unpainted element.
  The layout claim is therefore measured through the row's width and the
  painted sibling's offset, and `text()` proves the node is still retained —
  see §9. A `null` here is not a STOP; a *missing sibling offset* is.
- **STOP** if a click on the slot recipe reaches the hidden pane (check 14) —
  the recipe is not safe to copy; record the measured routing and stop.
- **STOP** if either host needs a tolerance beyond the shared `TOLERANCE` or a
  check removed.
- **STOP** if the live frame at rest and after the switch are identical (the
  switch did not repaint): settle the live driver before the second capture
  rather than loosening the check.
- **Do not** edit `packages/components`, `packages/primitives` or
  `packages/tokens`; adoption is a cross-team row.
- **Do not** widen `workspace-panes`; it stays the composition probe.

---

## 8. Acceptance

- `hidden-surface` and `live-hidden-surface` exist, are green in both hosts, and
  report the same check count (predicted **44**; the outcome records the real
  number).
- Each mechanism is isolated: a mutation that drops `visibility` fails by name,
  a mutation that drops `pointerEvents` fails by name, and the
  `display: "none"` control is recorded as inert.
- `paintedText` and the frame agree that a hidden fill does not paint.
- The recipe lives in one pure helper with three unit tests, and
  `slotProblems` names the missing half.
- `apps/playground/README.md` and the two `COMPONENTS.md` rows cite the
  measured facts; the plan index and `TODO.md` are current.
- `nub run check`, `nub run lint`, `nub run test` green; the full headless
  registry is green with the new id.

---

## 9. Outcome (filled after implementation)

**Status:** pending.

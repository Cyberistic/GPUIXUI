# 658 — The last Tier 1 controls with no window evidence: RangeSlider, ButtonGroup and the loading indicators

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground |
| Depends on | `168` (the Tier 1 probe pattern), `169` (value controls), `170` (the live platform twin), `197` (what a live window can observe), `529` (the 0.10.0 box), `570` (the live Tier 1 twins), `591` (live geometry is literal-exact) |
| Feeds | `COMPONENTS.md` rows: Range slider, Button groups, Loading indicators, Progress; the promotion gate (`657`) |

## 1. Goal and the gap being closed

Every shipped Tier 1 control now has live-window evidence except three:

- **RangeSlider** — headless runtime tests only (plan `053`); no playground scenario and no live twin. It is the only value control whose *pointer-focus-then-key* path (the pressed thumb becomes the native focus owner) has never been measured.
- **ButtonGroup** — headless runtime tests only (plan `041`/`048`); its attached/separated geometry is not measured in a real window.
- **Loading indicators** — `Spinner` and the indeterminate `Progress` are mounted by no playground scenario at all. `primitives-display` covers the determinate `Progress` only. The component's *animation* is a component-owned `setInterval`, so a live window is the honest place to prove that an otherwise idle view is repainted by the indicator.

Adding these to the existing `primitives-display` view closes the gap without a new registry id or capability: `components` already owns the Tier 1 twins.

**Non-goals:** changing any component. `packages/primitives` is another workstream's tree. If the probe exposes a component defect, record it in `TODO.md` as a cross-team row and assert the measured behaviour; do not edit the package.

## 2. Measured context the executor needs

Read `COMPONENTS.md` first:

- `Range slider` row: "a press at 10 % moves the start, at 90 % the end; native focus follows the grabbed thumb and an arrow moves only that end" — headless only.
- `Button groups` row: "attached children are 0 px apart, separated ones the theme's `sm` gap" — headless only.
- `Loading indicators` row: `Spinner` cannot rotate; it is a three-dot row whose lit dot advances. Headless only.

Token values (do not hard-code a second copy): `spacing["2xs"] = 2`, `spacing.sm = 6` (`packages/tokens/src/scale.ts`). `Spinner` size 10 with two `2xs` gaps is therefore a `34 × 10` box. `Progress` default `md` is `spacing.sm = 6` tall.

The three component contracts the probe relies on (already implemented, do not change them):

- `RangeSlider` renders `role="group"` + two `role="slider"` thumbs; a press picks the nearest thumb, **moves native focus to it** (`renderer.focusElement`) and the thumb's `onKeyDown` steps its own end.
- `ButtonGroup` `mode="attached"` sets `gap: 0`; `mode="separated"` sets the theme gap (`sm` = 6).
- `Spinner` renders `role="status"` named by `label` and advances a React step every 120 ms; indeterminate `Progress` renders `role="progressbar"`, `aria-valuetext="loading"` and its step moves a percentage-width lead spacer every 120 ms.

## 3. Files to change

### 3.1 `apps/playground/src/scenarios/primitives.tsx`

1. Extend the import list from `@gpuixui/primitives` with `ButtonGroup`, `RangeSlider`, `Spinner`.
2. In `DisplayProbe` add, inside the existing `PrimitiveThemeProvider`, after the determinate `Progress`:

   ```tsx
   <RangeSlider
     testId="display-range"
     label="Price"
     value={range}
     onChange={setRange}
     formatValue={(value) => `${value}%`}
   />
   <ButtonGroup testId="display-group-attached" label="Zoom" mode="attached">
     <Button testId="display-zoom-out" label="Zoom out" onActivate={() => {}}>−</Button>
     <Button testId="display-zoom-in" label="Zoom in" onActivate={() => {}}>+</Button>
   </ButtonGroup>
   <ButtonGroup testId="display-group-separated" label="Align" mode="separated">
     <Button testId="display-align-left" label="Align left" onActivate={() => {}}>Left</Button>
     <Button testId="display-align-right" label="Align right" onActivate={() => {}}>Right</Button>
   </ButtonGroup>
   <Spinner testId="display-spinner" label="Syncing" size={10} style={{ alignSelf: "flex-start" }} />
   <Progress testId="display-connecting" label="Connecting" />
   ```

   `const [range, setRange] = useState<readonly [number, number]>([20, 80]);` as the first hook in `DisplayProbe`. Add a readout:

   ```tsx
   <Readout testId="display-range-value">{`start=${range[0]} end=${range[1]}`}</Readout>
   ```

   The `alignSelf: "flex-start"` is load-bearing: the column stretches its children, and a content-sized spinner is what makes the `34 × 10` box assertable (the plan-`600` lesson).

3. Extend `primitivesDisplayScenario.steps` **after** the existing tooltip check (keep the existing checks and their order):

   - **RangeSlider pointer + focus + key**
     - read `bounds("display-range")`; click at `x + width * 0.1`, `y + height / 2`.
     - parse `display-range-value`; assert `start < 20` and `end === 80` — the press moved the **nearest** thumb (the start) and left the other.
     - `ctx.host.key("right")`; assert `start` incremented by exactly 1 and `end` unchanged — the pressed thumb owns native focus, so the key moves that end only.
     - click at `x + width * 0.9`; assert `end > 80` and the current `start` unchanged.
     - `ctx.host.key("left")`; assert `end` decremented by exactly 1 and `start` unchanged.
   - **RangeSlider accessibility**
     - `treeOf(ctx)`; `node(ctx, tree, "Group", "Price")`, `node(..., "Slider", "Price minimum")`, `node(..., "Slider", "Price maximum")`; assert the minimum's `value` text contains `%`.
   - **ButtonGroup geometry**
     - bounds of the four buttons; attached: `zoom-in.x - (zoom-out.x + zoom-out.width) === 0 ± 0.5`; separated: `align-right.x - (align-left.x + align-left.width) === 6 ± 0.5`.
     - `node(ctx, tree, "Group", "Zoom")` — the group is named.
   - **Spinner**
     - bounds: height `10 ± 0.5`, width `34 ± 0.5` (three 10 px dots and two 2 px gaps; `paintedStyle` has no `gap` field, so the width is the geometry proof).
     - `node(ctx, tree, "Status", "Syncing")` — the accessible name.
   - **Indeterminate Progress**
     - bounds height `6 ± 0.5`.
     - `node(ctx, tree, "ProgressIndicator", "Connecting")` with `value` text `"loading"`.
     - the determinate progress still reports `"42%"` (existing check stays).

   Update the scenario title to name the added controls.

### 3.2 `apps/playground/src/live/scenarios.tsx` — `livePrimitivesDisplay`

Append after the existing tooltip check, before the screenshot:

- extend the title to name the added controls.
- Same RangeSlider pointer/key sequence with `boxOf`/`clickWindow`/`settle`/`waitForText`; the readout is the only live value source. Every wait is bounded (`waitForText`), because a live click and its commit are separate protocol steps.
- ButtonGroup gap: `expectNear(gap, 0, 1)` attached and `expectNear(gap, 6, 1)` separated (the live box is the 0.10.0 content box; a 1 px tolerance absorbs rounding).
- Spinner box: `expectNear(width, 34, 1)`, `expectNear(height, 10, 1)`.
- Indeterminate Progress box: `expectNear(height, 6, 1)`.
- **Do not assert a frame-count delta for the indicator.** The first draft did, and the mutation in §8 measured that this view repaints **4 frames in 400 ms with no indicator mounted**, so the counter cannot attribute a paint to the interval. The step advance stays headless; the live claim is paint/layout.
- Keep the existing screenshot at the end.

### 3.3 Ledgers

- `COMPONENTS.md`:
  - capability row `components`: add the five live ids (`live-primitives-actions`, `live-primitives-fields`, `live-primitives-display`, `live-primitives-choice`, `live-primitives-entry`).
  - `Range slider` row: append the live evidence and the exact measured numbers.
  - `Button groups` row: append the live gap numbers.
  - `Loading indicators` row: append the live paint, the `34 × 10` box, the `Status` name and the repaint signature.
  - `Progress` row: append the indeterminate live box and `loading` value text.
- `apps/playground/README.md`: update the `primitives-display` / `live-primitives-display` rows with the new checks.
- `TODO.md`: add one task under the playground section describing this work, tick it with the measured numbers, and note that the full-suite totals recorded by the last gate (`657`) predate the added checks, so the next merge gate re-measures them (never invent a total).
- `PLAN.md`: add a D-row recording the two transferable facts: (a) a live window with a component-owned interval repaints while otherwise idle — the frame counter is the motion signal; (b) a press on a `RangeSlider` track moves native focus to the grabbed thumb, so the next key moves that end.
- `.agents/slop/plans/README.md`: index this plan in the playground block with its measured outcome.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`.

1. `nub run --filter playground build`
   Expected: exit `0`; `apps/playground/dist/smoke/run.js` and `dist/live/run.js` rebuilt.
2. `nub apps/playground/dist/smoke/run.js --only primitives-display`
   Expected: `1/1` scenario, exit `0`; the check total is the old 16 + the new checks; the report names `primitives-display`.
3. `nub apps/playground/dist/live/run.js --only live-primitives-display`
   Expected: `1/1`, exit `0`, one screenshot; no window is exit `2`.
4. Repeat steps 2–3 twice. A live timing assertion that is green once and red once is not a proof; record every run.
5. Mutation proofs (each observed and reverted before the next):
   - M1 remove the `Spinner` from the view → step 3 fails at "a loading indicator repaints an idle window" / the spinner box.
   - M2 remove `focusThumb(end === …)` from `RangeSlider` (temporary edit to `packages/primitives/src/components/Slider.tsx`, reverted) → step 3 fails at "Right moves only the pressed end" because the key never reaches a thumb.
   - M3 change the separated group to `mode="attached"` → step 2 fails at the 6 px gap.
   - M4 give the "Connecting" `Progress` a `value` → step 2 fails at `value = "loading"`.
   Record the exact failing message for each.
6. `nub run check`, `nub run lint`, `nub run test`
   Expected: all exit `0`; playground unit tests unchanged (the change is scenario code, not a unit).
7. Full headless `nub apps/playground/dist/smoke/run.js`
   Expected: **every** scenario green, exit `0`; record the new check total and capability count. This is the end-of-task check (a registry-wide change).
8. **Do not run the full live suite.** It is the merge/release gate. Record the focused live id and say the last full gate (`657`) predates these checks.

## 5. STOP conditions

- The `RangeSlider` press does not change the readout in the headless run: STOP. That is a component defect or a geometry mistake; measure `bounds("display-range")` and report the numbers rather than widening the assertion to a band that passes either way.
- The live `Right`/`Left` does not move the pressed end while the readout shows the press landed: STOP and record a cross-team defect (focus is not reaching the thumb); do not add a `focusElement` call to the probe to rescue it — the component owns that.
- The live frame count grows even with **no** indicator mounted: STOP and remove the frame-delta check. A repaint count cannot attribute paint to a component interval; record it as a measured limitation (§8) and keep the step proof headless. Do not replace the live motion proof with a headless one and call it live.
- The `Spinner` box is not `34 × 10`: check that `alignSelf: "flex-start"` survived and that `size` is 10; if the geometry is genuinely different, assert the measured box and record the difference — never assert a guessed number.
- Any component package edit other than the M2 temporary mutation: STOP. Record it in `TODO.md` for `primitives` instead.

## 6. Test plan — what each check can catch

| Check | The bug it catches |
| ----- | ------------------ |
| press at 10 % moves only the start | a range slider that moves both ends, or always moves the end |
| Right steps **only** the pressed end | the component failing to focus the grabbed thumb; a key handler that moves the wrong end |
| press at 90 % moves only the end | a nearest-thumb rule that always picks the start |
| `Group` + two named `Slider` nodes | losing the group name or one thumb's accessible name |
| attached gap 0 / separated gap 6 | `mode` ignored, or a gap literal drifting from the token |
| spinner `34 × 10`, gap 2, row | a dot count or gap regression; the `alignSelf` removal |
| `Status` named `Syncing` | dropping `role="status"` or the label |
| indeterminate `value = "loading"`, 6 px | an indeterminate bar rendered determinate, or the height drifting |

## 7. Acceptance

- `primitives-display` and `live-primitives-display` are green, three consecutive focused runs each.
- The four mutation proofs are observed failing with the recorded message and reverted.
- The full headless suite is green with the new total recorded.
- `nub run check`, `nub run lint`, `nub run test` are green.
- The three `COMPONENTS.md` rows, the README, `TODO.md`, `PLAN.md` and the plan index cite the measured numbers, and the plan index marks this plan landed.
- No file outside `apps/playground/` is changed (except the one-file, reverted M2 mutation).

## 8. Results (2026-10-19, darwin-x64, release-tag binding)

**Headless** — `nub apps/playground/dist/smoke/run.js --only primitives-display`
is **1/1**, exit `0`, **53 checks** (was 16 before this plan). Measured:

- a press at 10 % of the 460 px track moves the **start** to `9` and leaves the end at `80`;
- `Right` moves that start to `10` and leaves the end at `80` — the press/key pair addresses one end;
- a press at 90 % moves the **end** to `89` and leaves the start at `10`; `Left` returns the end to `88`;
- the accessibility tree holds `Group "Price"` with two `Slider` nodes named `Price minimum`/`Price maximum`, and the minimum's value text carries `%`;
- attached Buttons sit exactly **0 px** apart, separated Buttons exactly **6 px** apart (the `spacing.sm` token), with `Group "Zoom"` exposed;
- `Spinner` paints **34 × 10 px** (three 10 px dots, two `2xs` = 2 px gaps) and `Status "Syncing"` is exposed;
- the indeterminate `Progress` paints **6 px** tall, exposes `ProgressIndicator "Connecting"` and announces `loading`.

**Live** — `nub apps/playground/dist/live/run.js --only live-primitives-display`
is **1/1**, exit `0`, **34 checks** (was 12), one screenshot, three
consecutive green runs (1.18–1.19 s each). The same pointer/key sequence, the
same 0/6 px gaps (within 1 px), the same `34 × 10` and `6` px boxes hold in the
real 1100 × 720 window. The RangeSlider press changes exactly one end and the
following arrow moves that end only — live, not only offscreen.

**The frame-count motion signal is a measured null result.** The first draft
asserted that an otherwise idle view with a mounted indicator repaints (the
`live-frames` idle control). With the `Spinner` replaced by a static box and the
indeterminate `Progress` made determinate, the live window still painted **72 →
76 frames over 400 ms**, so a frame delta cannot be attributed to a component's
interval; the check was removed. What remains honest: the indicators paint, lay
out and expose their accessible names live; their step advance is proven
headlessly (the `Spinner`/`Progress` runtime suites and the pure step maths).
`COMPONENTS.md` and `PLAN.md` (D93) record the limitation.

**Mutation proofs** (each observed and reverted):

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | the `Spinner` node replaced by a 8 px placeholder | live: `the spinner is three 10 px dots tall: expected 10 ± 1, got 8`, exit `1` |
| M2 | `RangeSlider`'s `focusThumb(end === "start" ? 0 : 1)` removed (temporary edit to `packages/primitives`, reverted — `git diff` clean) | live: `the end press leaves the start alone: expected 10, got 9`, exit `1` — the focus handoff between the press and the key is load-bearing |
| M3 | the separated ButtonGroup set to `mode="attached"` | headless: `separated children keep the theme's 6 px gap: expected 6 ± 0.5, got 0`, exit `1` |
| M4 | the "Connecting" `Progress` given `value={42}` | headless: `an indeterminate bar announces loading: expected "loading", got "42%"`, exit `1` |

**Full headless** — the whole registry is green after the change: **105/105**,
**3802 checks**, 65 capabilities, exit `0` (was 3765 before the +37 checks).
`nub run check`, `nub run lint` and `nub run test` are green. The full live
suite was **not** run: it is the merge/release gate, and the last recorded full
run (plan `657`, **94/94**, 2447 checks) predates these 22 added live checks.
The next promotion gate re-measures it.

The `useState` in `DisplayProbe` is the existing probe-local controlled value
(the pattern plan `168` established); it is not shared state and an Atom would
make a probe's range global. The effect-enforcer's `avoid-react-hooks` note is a
false positive here.


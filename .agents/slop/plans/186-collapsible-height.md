# 186 — Collapsible height motion: natural measurement, clipping and state

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §10) |
| Phase | B (feasibility) → feeds C (Accordion, Collapsible) and D (collapsible sidebar, drawer) |
| Owner | playground workstream |
| Depends on | `110`, `120`, `140`, `157`, `177` |
| Feeds | `@gpuixui/components` Accordion + Collapsible; `packages/docking` collapsible sections |

## 1. Goal

`@gpuixui/components` ships `CollapsibleContent` and `AccordionContent` that
**unmount while closed**, with this TODO on the collapsible
(`packages/components/src/collapsible.tsx`):

```ts
// TODO: measure the body with `onLayout` and animate to that height once a
// motion budget exists; 0.10.0's `motion` needs a numeric target.
```

Two of those three premises are untested and one is false: `onLayout` does not
exist in the published `@gpuix/native@0.10.0` `HostProps`, `motion`'s `height`
target is documented but **never measured here** (`motion-collapse` measured
`width` and `opacity` only), and unmounting throws away the state inside a
closed section (`workspace-panes`, plan `177`, measured the cost of hiding by
unmount versus keeping a pane mounted).

This probe answers, with numbers, whether a **state-preserving animated
accordion** is possible on 0.10.0, and records the recipe:

1. Does `motion.div` interpolate **height** deterministically under the paused
   motion clock?
2. Can component code measure the **natural height** of content that is already
   mounted inside a `height: 0; overflow: hidden` container?
3. Does the clip refuse **hit-testing** for content that is laid out but
   collapsed, or does the component need a `pointerEvents: "none"` guard?
4. Does content mounted inside the collapsed container keep its **state** (an
   input draft) and its **place in the tree** across collapse/expand?

A `failed` verdict is a real outcome. Record it and give the honest alternative
(discrete show/hide, or measure-on-first-open) — never fake the animation.

## 2. What is documented, and what is not

From the installed `@gpuix/native@0.10.0` `dist/host.d.ts`:

- `MotionStyle` targets are exactly `width`, `height`, `opacity`, `top`,
  `right`, `bottom`, `left`, `borderRadius`. `duration` is in seconds.
- `HostProps` has **no `onLayout`** — grep confirms there is no such symbol in
  `@gpuix/react` or `@gpuix/native`. Measurement is `ref` →
  `PublicInstance.id` → `renderer.getElementBounds(id)`, the route plan `184`
  proved from component code during a gesture.
- `motion.div` (`MotionDivProps`) has no `testId`, `role` or `aria-*` — the
  typed-wrapper limitation plan `157` recorded. The probe therefore measures a
  plain `<div>` **inside** the animated container, which is also the element a
  component would measure.

From plan `177`: `display: "none"` is a no-op in 0.10.0, so "hidden" means
clipped or `visibility: hidden`, never `display`. From plan `157`: the motion
clock is frozen by `TestRenderer.clockPause` and moved by `clockFastForward`,
and `onMotionComplete` reaches React only after `dispatchNativeEvents` (which
`SmokeHost.fastForwardMotion` already does).

**Not measured anywhere in this repo:** height interpolation, whether a clipped
child still reports bounds, and whether a clipped child is hit-testable.

## 3. Scenario `collapsible-height` (capability `motion`)

New view `apps/playground/src/scenarios/collapsible.tsx`, registered in
`apps/playground/src/scenarios/index.ts` immediately after `motionScenario`.
It reuses the existing `motion` capability — the suite goes **53 → 54** and the
capability union is unchanged.

### 3.1 Tree

Column, width 420, padding 8, all colours from `useTheme()`:

```
<div column gap=8 width=420>                          testId="collapse-root"
  <text>Section</text>                                (a header row)
  <motion.div                                         testId="collapse-body"
      animate={{ height: open ? natural : 0 }}
      transition={{ duration: 200ms, ease: "linear" }}
      onMotionComplete={...}
      style={{ overflow: "hidden", backgroundColor: muted }}>
    <div ref={contentRef}                             testId="collapse-content"
         style={{ display:"flex", flexDirection:"column",
                  gap:8, padding:8 }}>
      <div height=24>alpha</div>                      testId="collapse-row-0"
      <div height=24>beta</div>                       testId="collapse-row-1"
      <input value={draft} onChange={...} />          testId="collapse-input"
      <div role="button" tabIndex={0}                 testId="collapse-button"
           onClick={() => setPresses(n => n + 1)}>press</div>
    </div>
  </motion.div>
  <div height=40>after</div>                          testId="collapse-after"
  <Readout testId="collapse-readout">
    open=<0|1> natural=<px> presses=<n> complete=<n> draft=<text>
  </Readout>
</div>
```

`natural` is component state, written by **measuring the content through the
renderer**, never a constant:

```ts
const contentRef = useCallback((instance: PublicInstance | null) => {
  contentId.current = Option.map(Option.fromNullishOr(instance), (e) => e.id);
}, []);

const measure = (): Option.Option<number> =>
  Option.flatMap(contentId.current, (id) =>
    Option.map(
      Option.fromNullishOr(renderer?.getElementBounds?.(id)),
      (bounds) => bounds.height,
    ),
  );
```

The view also tries a **mount-time** measurement in `useLayoutEffect` and writes
its outcome to the readout as a separate `mounted=<px|none>` field, so §10 can
record whether a `defaultOpen` section can animate on the first open.

`open` starts `false` and `natural` starts `0`. The toggle handler measures
before it opens:

```ts
const toggle = () => {
  if (open) return setOpen(false);
  const measured = measure();
  Option.match(measured, {
    onNone: () => setOpen(true),          // no measurement: still open, report it
    onSome: (height) => { setNatural(height); setOpen(true); },
  });
};
```

Keyboard: the header row (`testId="collapse-trigger"`, `role="button"`,
`tabIndex={0}`, Enter down / Space up) calls the same `toggle`, so a controlled
component's contract is exercised.

### 3.2 The clip guard

The **first** measurement run ships the body **without** a pointer guard. Record
in §10 whether the collapsed button's click fires. If it does, add
`pointerEvents: open ? "auto" : "none"` to `collapse-body` (the guard plan `183`
measured on the toast viewport) and keep it in the shipped scenario; the §10 note
states that the raw clip does not refuse input. Do not ship a check that asserts
a behaviour the runtime does not have.

### 3.3 Steps and checks

`steps` pauses the motion clock first (`ctx.host.pauseMotion()`). All values are
read from the readout or `ctx.host.bounds`, never from a screenshot.

1. **Collapsed layout is retained.** `bounds("collapse-body").height === 0` ± 1
   and `bounds("collapse-content")` exists with `height > 0`. Record the value
   as `natural`.
2. **Measurement matches the paint.** `readout` contains `natural=<bounds>` and
   `mounted=` is present (value may be `none`; record which in §10).
3. **Collapsed content is not hit-testable.** `ctx.host.click("collapse-button")`
   (which aims at the button's own centre) leaves `presses=0`. With the §3.2
   guard the same click still leaves `presses=0`; the check names the guard.
4. **No space is taken.** `bounds("collapse-after").y` is above the content's
   `y` and equals the header row bottom + gap ± 1.
5. **Open measures and animates.** Click `collapse-trigger`; `readout` shows
   `open=1`, `natural` unchanged, `complete=0`. Fast-forward **80 ms**: body
   height ≈ `natural * 0.4` ± 4; `collapse-after.y` moved down by exactly that
   body height ± 2.
6. **Open completes.** Fast-forward **200 ms**: body height === `natural` ± 1;
   `complete=1`; `ctx.host.click("collapse-button")` now gives `presses=1`.
7. **State survives the clip.** Click `collapse-input`, type `a`, `b`; readout
   `draft=ab`. Collapse (`collapse-trigger`), fast-forward 200 ms; body height 0
   ± 1, `complete=2`, readout still `draft=ab`. The content was **never
   unmounted**.
8. **Re-open reuses the measurement.** Open again; after 200 ms body height ===
   `natural` ± 1 and `draft=ab`; `complete=3`. The measurement is stable across
   the cycle (same `natural` every time).
9. **Never invisible by accident.** While collapsed, `collapse-content` is in the
   tree (`ctx.host.text("collapse-content")` is non-null) — the opposite of the
   shipped component today, and the fact the recipe depends on. If the runtime
   drops a clipped child from the tree instead, record it and switch §3.1 to
   `visibility: "hidden"` with the measurement taking the first open frame.

## 4. Files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/186-collapsible-height.md` | this plan; append §10 after implementation |
| `apps/playground/src/scenarios/collapsible.tsx` | **new** — the probe view + `collapsibleHeightScenario` |
| `apps/playground/src/scenarios/index.ts` | import and append the scenario after `motionScenario` |
| `COMPONENTS.md` | `motion` capability row gains `collapsible-height`; Tier 2 Accordions/Collapsible and Tier 4 Collapsible sidebars gain the measured recipe; suite count `53 → 54` |
| `TODO.md` | tick the new task; add one cross-team task for `@gpuixui/components` |
| `PLAN.md` | append a decision row only if §10 finds a load-bearing rule (e.g. "measure while clipped is the recipe") |
| `.agents/slop/plans/README.md` | index row for `186` |

`packages/testing` needs **no change**: `pauseMotion`, `fastForwardMotion`,
`bounds`, `click`, `key` and `text` already exist, and the new capability is not
needed.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`.

```sh
nub run --filter playground build
# expect: tsc exits 0, dist/smoke/run.js written

nub apps/playground/dist/smoke/run.js --only collapsible-height
# expect: one scenario, exit 0, a report naming every §3.3 check as passed
```

Then the two-direction runs (§6), each followed by restoring the file:

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js --only collapsible-height
# expect: exit 1 with the named check failing
```

Full suite and gates:

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js
# expect: 54/54 scenarios, exit 0, .artifacts/smoke-report.json + 54 screenshots
nub run check
nub run test
```

## 6. Two-direction proof (four mutations)

Each mutation is applied alone, the `--only` command is run, the failure is
recorded in §10, and the file is restored.

| # | Mutation | Must fail |
| - | -------- | --------- |
| M1 | `animate={{ height: open ? natural : 0 }}` → `animate={{ height: 0 }}` | step 5 (mid-tween height) and step 6 (open height) |
| M2 | Delete `overflow: "hidden"` from `collapse-body` | step 1 (collapsed body height is the content height) |
| M3 | Render the content only when open (`{open ? <div …/> : null}`) | step 3/7 (`draft` is lost; the collapsed content is absent) |
| M4 | Replace `measure()` with the constant `100` | step 2 (`natural` ≠ painted content height) |

M1 is the decisive one: it proves the tween is the thing under test, not the
final state.

## 7. STOP conditions

Stop and report with evidence — do not improvise a workaround:

- The binding cannot mount (exit `2`): the host lost its `0.10.0` build. Report
  the preflight output; do not mark the plan landed.
- `motion.div`'s `height` does not change at all under the paused clock (the
  body stays 0 or jumps): record it, ship the **discrete** alternative
  (`height: open ? natural : 0` with no transition) and mark the motion verdict
  `failed` in §10 and `COMPONENTS.md`. Do not add a CSS-like fake.
- `getElementBounds` returns `null` for a clipped child **and** the first-open
  measurement also fails: record both, and the recipe becomes "measure the body
  after opening it, then animate" with the one-frame caveat.
- Any check in §3.3 is false for a reason not listed above: stop, record the
  measured value, and amend this plan before changing the scenario.

## 8. Test plan

The scenario **is** the test: every check runs in the real `TestRenderer` and a
false check exits `1`. There is no pure helper worth a vitest unit test — the
geometry is the runtime's. The bar is met by:

- one scenario with the checks above, each able to fail;
- four recorded mutation proofs (M1–M4) that each turn the suite red with the
  named check;
- the full suite still green, so the new scenario did not disturb the keyed
  mount isolation (plan `182`).

`nub run check` must stay green (`check:tests` rejects a test that asserts
nothing; the scenario's checks are real assertions on measured values).

## 9. Acceptance criteria

- `nub apps/playground/dist/smoke/run.js --only collapsible-height` exits `0`.
- The full run is 54/54, exit `0`, and writes the report and screenshots.
- §10 records, with numbers: height interpolation, mount-time measurement,
  measurement-while-clipped, the hit-test result, state survival, and each
  mutation's failing check.
- `COMPONENTS.md` has the `motion` and Accordion/Collapsible rows updated with
  the recipe and the limitation, and `TODO.md` is ticked with a cross-team task
  for `@gpuixui/components`.
- `nub run check` and `nub run test` pass.

## 10. Measured facts (2026-10-17, this host, locally built 0.10.0 binding, ADR 0003)

Scenario `collapsible-height`, capability `motion`, suite `53 → 54`, exit `0`.
The body is a `motion.div` at `height: 0`, the content is a plain `div` with
`overflow: "hidden"` on the body, and the readout's `mounted`/`natural` numbers
come from `ref` → `renderer.getElementBounds` in component code.

**The three premises of the shipped component's TODO are settled.**

1. **`onLayout` does not exist** in `@gpuix/native@0.10.0` (`MotionProps` and
   `HostProps` have no such symbol). The measurement route is
   `ref` → `PublicInstance.id` → `renderer.getElementBounds(id)`, the same one
   plan `184` proved from component code.
2. **`motion.div` does interpolate height**, exactly and deterministically under
   the paused clock: 80 ms into a 200 ms linear tween the next row moved
   **56 px**, which is `140 × 0.4`; at 200 ms it moved the full **140 px**. The
   tween is read through the following sibling's `y`, because the published
   `MotionDivProps` still omits `testId` (plan `157`).
3. **A first-paint measurement is available.** The content measures **140 px**
   in a `useLayoutEffect` at mount, *while the body is already collapsed to
   `height: 0`*, and the same 140 px in the toggle handler. A `defaultOpen` or
   controlled-open section can therefore animate on its first open with no
   flash — the premise that blocked the animation is false.

**The clip is load-bearing for input.** Content stays laid out at its natural
140 px while the body is 0 px high, but a click at the collapsed button's own
painted centre does **not** activate it (`presses=0`). Removing
`overflow: "hidden"` makes the same click activate it (`presses=1`). No
`pointerEvents: "none"` guard is needed; the clip alone refuses the hit.

**State survives.** A draft typed while open (`draft=ab`) is still `ab` after a
collapse, a re-open and a second collapse; `collapse-content` is in the tree in
every phase. Unmounting the content while closed (the shipped component's
behaviour) fails at the first check — `collapse-content is painted: … none`.

**`onMotionComplete`** fires once per height tween (`complete=1`, `2`, `3`), with
no stale completion from the previous cycle, and the measured target is stable
across collapse/re-open (140 px every time).

**Keyboard** activation goes through the same `toggle`: `Enter` on key down
re-opened the section (the trigger is in the tab order and the click focused it).

Two-direction proofs, each with the exact failing check (the file was restored
after each run):

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | `animate={{ height: open ? natural : 0 }}` → `animate={{ height: 0 }}` | exit `1`, *the height tween is mid-flight at 80 ms*: expected `56 ± 4`, got `0` |
| M2 | delete `overflow: "hidden"` from the body | exit `1`, *the clip refuses input in the overflowing content*: expected `presses=0`, got `presses=1` |
| M3 | render the content only while open (`{open ? <div …/> : null}`) | exit `1`, *collapse-content is painted*: none |
| M4 | `setNatural(height)` → `setNatural(Math.min(height, 100))` | exit `1`, *the measurement is the painted content height*: expected `140 ± 1`, got `100` |

**Recipe for `@gpuixui/components`.** Keep the content mounted; put
`overflow: "hidden"` on the animated body; measure the content `div` with
`ref` + `getElementBounds` (available at `useLayoutEffect` and in handlers);
animate the body's `height` between `0` and the measured value; read the
animation through a sibling or the content bounds, never a `testId` on the
motion element. The one remaining limitation is unchanged from plan `157`: the
motion surface itself is not addressable by `testId`, `role` or `aria-*`.

**Residual limitation.** A body whose content height changes *while collapsed*
(e.g. a wider window rewrapping text) would keep the old target until the next
measurement; the probe's content is fixed-height, so that re-measure trigger is
not measured here. Record it as a component-level rule (re-measure on open and
on a width change), not as a runtime claim.


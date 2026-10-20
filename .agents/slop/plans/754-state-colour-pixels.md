# 754 — Declared hover and active colours, in the frame

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | F (native evidence) |
| Owner | playground workstream |
| Depends on | `020`, `100`, `110`, `120`, `140`, `189`, `197`, `529`, `557`, `674`, `676`, `736`, `745` |
| Feeds | the `states` row in `COMPONENTS.md`; the docs' interaction-state claim |

## 1. Goal

Every interactive surface in the library declares its pointer state as a
`style.hover` / `style.active` refinement rather than scripting pointer state:
**30 `hover:` and 39 `active:` declarations** across `packages/primitives` and
`packages/components`, most of them colour-only. The suite proves the
*mechanism* on a layout property (`declared-styles` / `live-states`, plan `557`:
`hover` grows `100 → 140`, `active` grows `180`) and it proves that the style
report keeps the **authored** colour while hovered. It never proves the frame
paints a **colour-only** hover or active state.

The bug being guarded: a runtime that applies a hover refinement to layout but
drops its `backgroundColor` (or a change in the refinement application order)
would pass every existing check while **every button, row, tab and menu item in
the library had an invisible hover and pressed state**. A style report cannot
see it — measured in plan `335`: `paintedStyle` is the authored style, so a
hover-only colour reads unchanged — and a screenshot is not an assertion.

Deliver a probe that decodes the frame in each pointer state and asserts:

1. a declared `hover` colour **replaces** the authored fill, and leaving
   **reverts** it;
2. hover is **owned per element**: hovering the parent paints the parent's hover
   colour and leaves the child's fill alone; hovering the child paints the
   child's colour and reverts the parent;
3. an `active` colour paints while the pointer is held;
4. `active` **wins over** `hover` when both apply, so a pressed control never
   looks merely hovered;
5. all of the above in both hosts: `state-pixels` (offscreen `TestRenderer`) and
   `live-state-pixels` (the real 1100 × 720 window).

Non-goals:

- **active persistence beyond the box.** Plan `557` measured a held pointer
  outside keeping the active layout until release; repeating that in colour
  would cost two more ~10 s offscreen captures for a mechanism already proven,
  so it stays a geometry claim;
- `hover.color` (glyph ink) — sampling glyph coverage is fragile, and the
  background path is the contract the components use;
- half-alpha hover fills (`alpha(primary, 0.5)` in `internal/button.tsx`): the
  eight-digit colour path is already proven by `search-highlights` (plan `701`)
  and `live-theme` (plan `676`); this probe is about the state refinement;
- `focusVisible` and the focus ring — `shadow-pixels` / `live-shadow-pixels`
  (plan `736`) own them;
- `cursor`, transitions and animation timing;
- `disabled` (a `disabled` control is authored with a different fill; there is
  no runtime refinement to prove).

## 2. What is already measured

- GPUix 0.10.0 applies these refinements in `apply_interactive_styles`
  (`packages/native/src/renderer.rs` in the pinned source): `apply_styles` first,
  then `el.hover(..)` from `style.hover`, then `el.active(..)` from
  `style.active`. GPUI's refinements are applied to the element's own state
  behind its `ElementId`, so a fixture needs a `testId` (which gives the element
  its id) for the states to exist at all.
- Both states are **exclusive per element**: plan `335` measured a child's
  hover cancelling its parent's (`parent 400 / child 120`), and delivered
  without a pointer-coordinate payload.
- A press **does not** set hover (plan `335`: press at a point → `active 180`,
  release → authored `100`); a held pointer **outside** keeps `active` until
  release.
- The frame chain is shared: `captureHeadless` / `captureLive`, `pixelAtId`,
  `expectColour` and `parseColour` in `src/scenarios/frames.ts` (plans `674`,
  `676`, `745`). Device scale is `2` on this host; tolerance is 2 per channel.
- The dark palette the checks read: `background #11141A`, `card #191D25`,
  `muted #222730`, `accent #2E2370`, `primary #A7A9FF`, `success #3BC97F`,
  `destructive #FF6B6B`. All hover/rest pairs below are distinct by a wide
  margin, so no check can pass on the rest colour.

## 3. Design

### 3.1 The pure half — `apps/playground/src/scenarios/state-pixels.ts`

No renderer, no host. It owns **which colour a state resolves to** and the
fixtures' role mapping, so the view and the expectations cannot drift:

```ts
/** The pointer states a declared style can refine. */
export type PointerState = "rest" | "hover" | "active";

/** One fixture's declared background chain. */
export interface StateColours {
  readonly rest: string;
  readonly hover?: string;
  readonly active?: string;
}

/** The colour a chain resolves to for a pointer state: active > hover > rest. */
export const resolveStateColour: (
  colours: StateColours,
  state: PointerState,
) => string;

/** Whether every declared state is distinguishable from the rest fill. */
export const hasDistinctStates: (colours: StateColours) => boolean;

/** The four fixtures' chains, in role terms. */
export const stateFixtures: (colors: ThemeColors) => {
  readonly hover: StateColours;   // card → primary
  readonly parent: StateColours;  // muted → accent
  readonly child: StateColours;   // card → success
  readonly press: StateColours;   // card → primary, active destructive
};
```

`hasDistinctStates` is the precondition that stops a palette change or a typo
from making a check vacuous: a chain whose hover equals its rest is rejected by
name before a frame is sampled.

### 3.2 The view — `apps/playground/src/scenarios/state.tsx`

One `640 × 360` stage painted `theme.colors.background`, all boxes borderless
and unpadded so the reported centre is a solid fill:

| testId | geometry | style chain |
| ------ | -------- | ----------- |
| `state-stage` | the stage | `background` |
| `state-rest` | `(40, 40)` `140 × 72` | `card` only — the control |
| `state-hover` | `(200, 40)` `140 × 72` | `card` → hover `primary` |
| `state-away` | `(360, 40)` `140 × 72` | `card` only — the leave target |
| `state-parent` | `(40, 160)` `280 × 72` | `muted` → hover `accent` |
| `state-child` | inside the parent at `(0, 0)` `120 × 72` | `card` → hover `success` |
| `state-press` | `(360, 160)` `140 × 72` | `card` → hover `primary` → active `destructive` |

The parent's centre (`x = 180`) is **outside** the child (`x < 160`), so
hovering the parent's centre hovers the parent alone; the child's centre
(`x = 100`) also hits the parent, which is the point of the per-element check.

The view builds its chains with `stateFixtures(theme.colors)` and the checks
build expectations with `stateFixtures(palettes.dark.colors)`, so a swapped role
fails both places at once and a palette edit moves the expectation with the
paint.

### 3.3 The scenarios and the shared checks

`state-pixels` (capability `states`) and `live-state-pixels` (capability
`states`, `ready: "state-stage"`). One generic `stateChecks` over a driver, the
way `border.tsx` shares `borderChecks`:

```ts
interface StateDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError | E>;
  readonly hover: (testId: string) => Effect.Effect<void, E>;
  readonly pressAt: (point: Point) => Effect.Effect<void, E>;
  readonly releaseAt: (point: Point) => Effect.Effect<void, E>;
}
```

- headless: `captureHeadless`, `Effect.sync(host.hover(..))`,
  `pressWindow`, `releasePointer`;
- live: `captureLive`, then the same verbs with a `settle` (120 ms, the live
  registry's own rule) before the capture, because the automation protocol has
  no frame boundary.

**A capture costs ~10 s offscreen** (the 2560 × 1600 PNG dominates: one
`border-pixels` run is 10.5 s), so the sequence asserts one frame per *distinct
pointer state* and no state twice. Six states, 14 checks:

| Frame | Action | Sample | Expectation |
| ----- | ------ | ------ | ----------- |
| A | hover `state-hover` | `state-hover` / `state-rest` / `state-away` | `primary` / `card` / `card` — the hover paints, per element, not globally, and the authored fill still paints beside it |
| B | hover `state-parent` | `state-hover` / `state-parent` / `state-child` | `card` / `accent` / `card` — leaving reverts; parent hover does not paint the child |
| C | hover `state-child` | `state-child` / `state-parent` | `success` / `muted` — the child owns the hover and the parent reverts |
| D | press `state-press` | `state-press` | `destructive` — active paints without hover |
| E | release, then hover `state-press` | `state-press` | `primary` — a release clears active and the hover applies |
| F | press while hovered | `state-press` | `destructive` — active wins over hover |

Plus the device-scale precondition on frame A and four `hasDistinctStates`
preconditions (the `hover`, `parent`, `child` and `press` chains) = **14 claims
per host**, which the harness records as **50 checks** (each sample also records
its "is painted", "maps into the frame" and "has a pixel" preconditions, the
same accounting as `border-pixels`' 19 claims / 64 checks). The authored fill is
asserted by frame A's two control samples and by frame B's revert, so there is
no separate opening frame.

The live twin writes `LIVE_ARTIFACTS/live-state-pixels.png` as its run artifact
(after the last step, i.e. the pressed state). The artifact is evidence of the
mount, not of a state; the assertions read the decoded frames in between.

## 4. Files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/state-pixels.ts` | new pure state resolution + fixture role mapping |
| `apps/playground/src/scenarios/state-pixels.test.ts` | new unit tests (§5) |
| `apps/playground/src/scenarios/state.tsx` | new view, driver, `stateChecks`, both scenarios |
| `apps/playground/src/scenarios/index.ts` | import and register `state-pixels` |
| `apps/playground/src/live/scenarios.tsx` | import and register `live-state-pixels` (view, `ready`, screenshot tap) |
| `apps/playground/README.md` | a "Declared hover and active colours, in the frame" subsection; the `live-state-pixels` row; the totals |
| `COMPONENTS.md` | the `states` evidence row gains the two ids and the paint claim; suite totals |
| `TODO.md` | one playground task, ticked with the measured values and the exact ids run |
| `.agents/slop/plans/README.md` | index this plan under the playground block; record the number choice (`752`/`753` claimed, `754` free) |

No `packages/testing` change: every verb and helper already exists. If one is
missing, stop and justify it rather than duplicating `frames.ts`.

## 5. Test plan

`state-pixels.test.ts` (pure):

| Test | Must fail when |
| ---- | -------------- |
| `rest` returns the authored fill | the resolver falls through to a refinement |
| `hover` returns the hover colour when declared | the hover branch is dropped |
| `hover` falls back to rest when the chain declares none | the resolver invents a colour |
| `active` returns the active colour when declared | the active branch is dropped |
| `active` beats `hover` when both are declared | the precedence is inverted (the frame's frame G depends on this) |
| `active` falls back to `hover`, then to `rest`, when the chain declares no active colour | a chain without `active` is treated as opaque |
| `hasDistinctStates` accepts the four fixtures and rejects a hover equal to rest | the precondition cannot fail |
| `stateFixtures` maps the roles (`hover` = primary, `parent` = muted→accent, `child` = card→success, `press` active = destructive) | a role is swapped in the view and the expectation together |

Scenario mutations, each observed failing by name and then reverted:

- **M1** remove `hover` from `state-hover` → frame A reads `card` at
  `hovering paints the hover colour`;
- **M2** remove the parent's `hover` → frame B reads `muted` at
  `hovering the parent paints the parent's hover colour`;
- **M3** remove the child's `hover` → frame C reads `card` at
  `hovering the child paints the child's own hover colour`;
- **M4** swap `active` and `hover` on `state-press` → frame E fails (the
  hovered fill reads `destructive`) and frame D fails (the press reads
  `primary`);
- **M5** remove `active` from `state-press` → frames D and F read `primary` at
  `pressing paints the active colour` / `active wins over hover`;
- **M6** give `state-hover` the `card` hover colour → the precondition
  `hasDistinctStates` fails by name before a frame is sampled;
- **M7** invert the resolver's precedence (`hover` over `active`) → the
  `active beats hover` unit test is red before the scenario runs.

## 6. Commands and expected results

```sh
nub run --filter playground test
# expected: green; 46 + 1 = 47 files, 495 + 13 = 508 tests (measured)

nub run --filter playground build
# expected: exit 0

nub apps/playground/dist/smoke/run.js --only state-pixels
# expected: 1/1 scenarios passed · states=verified, exit 0; 50 checks

nub apps/playground/dist/live/run.js --only live-state-pixels
# expected: 1/1 scenarios passed · states=verified, exit 0; 50 checks
# (one real window; the final frame is the run artifact)
```

Then every mutation in §5 as its own focused run of the matching host (the
headless one for M1–M3/M5–M6, the live one for M4 to prove the twin sees the
same bug), and:

```sh
nub apps/playground/dist/smoke/run.js
# expected: 110/110 scenarios passed, 4077 checks, 65 capabilities, exit 0

nub run check
nub run lint
nub run test
```

The full live suite is the merge/release gate and is **not** run here. Registry
totals: headless `109 → 110`, live `98 → 99`; `--list` must show both new ids.
The docs capability matrix is untouched because `states` already exists.

## 7. STOP conditions

Stop and report instead of improvising if:

- **frame A reads the rest fill** (`card`): the runtime applies a hover
  refinement but drops its background colour, or the fixture never became
  hovered. First prove the pointer reached the element by reading its bounds
  before/after a hover with a layout change (the `declared-styles` recipe); if
  the element is hovered and the fill still does not change, keep the scenario
  asserting the measured truth, record it in `COMPONENTS.md` and add a
  cross-team task that every colour-only hover in the library is invisible on
  0.10.0. Never claim a hover colour the frame does not show;
- **frame F reads `primary`** (hover beats active): the refinement order is not
  CSS's. Assert the measured order, document it, and add a cross-team task that
  a pressed-but-hovered control looks hovered; do not delete the check;
- **frame E reads `card`** (release clears hover even with the pointer over):
  the synthetic release does not re-enter hover. Record the rule, assert the
  measured value, and note the harness difference if the live run disagrees;
- a sample is neither expected colour (an anti-aliased or composited value):
  report the value and the box. Move the sample only after amending this plan;
  do not widen `TOLERANCE` and do not hard-code a window coordinate;
- the live capture reads the **previous** state after the 120 ms settle: raise
  the settle to one `settle` per action and re-run; if it still lags, report the
  harness gap and use the frame counter to prove a repaint happened, never a
  weakened assertion;
- the `640 × 360` stage does not fit the live window, or the device scale is not
  an integer: report the size pair and the scale; shrink the stage only by
  amending this plan first;
- the pure module needs a token import that the type-checker cannot resolve:
  stop — `border-pixels.ts` has no imports and `state.tsx` already imports the
  palette; a new dependency is a design change.

## 8. Acceptance

- `state-pixels` and `live-state-pixels` are registered and green on this host,
  with the exact sampled colours recorded in the README's pixel section.
- The pure module has at least seven tests that can fail, and at least six
  scenario mutations were observed failing by name before revert (M4 and M5 are
  the precedence/active proofs and must be attempted).
- `COMPONENTS.md` and `apps/playground/README.md` state the colour-state paint
  evidence and name the ids; no row still implies hover/active colour is
  style-report-only.
- `TODO.md` carries one ticked playground task with the measured values and the
  exact ids run, plus a cross-team task only where the frame showed a gap.
- `nub run check`, `nub run lint` and `nub run test` are green; the full
  headless registry is green.

## 9. Rollback

Revert the two commits (plan, implementation). Only `apps/playground`,
`COMPONENTS.md`, `TODO.md` and the plan index are touched; no package API
changes, so a revert cannot break a consumer.

## 10. Results (2026-10-20, darwin-x64)

**Implementation.** `state-pixels.ts` is the pure half — `resolveStateColour`
(`active > hover > rest`), `hasDistinctStates` and `stateFixtures`, which both
the view and the expectations build from, so a role swap has to survive the
frame. `state.tsx` holds the stage, the six-frame sequence and one generic
`stateChecks` over a `StateDriver`; the live driver adds the registry's 120 ms
settle before each capture. `state-pixels` and `live-state-pixels` are
registered; the headless registry is **110** and the live registry **99**.

**Measured, both hosts, tolerance 2** (the live frame is also the run artifact
`live/live-state-pixels.png`, the pressed state):

| State | Sample | Expected | Measured |
| ----- | ------ | -------- | -------- |
| hover | hovered / neighbour / leave target | `primary` / `card` / `card` | `#A7A9FF` / `#191D25` / `#191D25` |
| leaving | previously hovered | `card` | `#191D25` |
| parent hover | parent / child | `accent` / `card` | `#2E2370` / `#191D25` |
| child hover | child / parent | `success` / `muted` | `#3BC97F` / `#222730` |
| press | pressed | `destructive` | `#FF6B6B` |
| release + hover | pressed | `primary` | `#A7A9FF` |
| press while hovered | pressed | `destructive` | `#FF6B6B` |

So a colour-only `hover`/`active` refinement **does** reach the frame on
0.10.0, active wins over hover, and both states are owned per element.

**A measured correction.** The first sequence asserted "active paints without
hover", following plan `335`'s "a press at a point does not set the hover
state". Mutation M5 (remove `active` from the press fixture) then painted
`primary` while the button was held: **a synthetic press enters the pressed
element's hover state**, and plan `335`'s observation is the state **after**
the release. The claim is therefore "active wins over hover" (frame F), not
"active without hover"; components are unaffected because active wins, and the
README records the rule.

**Cost.** An offscreen capture is ~10.5 s (one `border-pixels` run), so ten
pointer states cost 107 s. The sequence was cut to the six distinct states that
carry the claims — a seventh frame for active persistence outside the box was
dropped and stays a plan-`557` geometry claim. The focused run is now ~40–52 s
headless and ~36–41 s live; the full headless suite is **240.0 s**.

**Commands run**

```sh
nub run --filter playground test
# 47 files, 508 tests (495 + 13), green

nub run --filter playground build
# exit 0

nub apps/playground/dist/smoke/run.js --only state-pixels
# 1/1 scenarios passed · states=verified, exit 0; 50 checks

nub apps/playground/dist/live/run.js --only live-state-pixels
# 1/1 scenarios passed · states=verified, exit 0; 50 checks

nub apps/playground/dist/smoke/run.js
# 110/110 scenarios passed, 4077 checks, 65 capabilities, 240.0 s, exit 0
```

The full live suite was **not** run: this is not the merge/release gate.

**Mutation proofs (observed, then reverted)**

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | remove the hover fixture's `hover` | `hovering paints the hover colour: expected #a7a9ffff, got #191d25ff`, exit `1` |
| M2 | remove the parent's `hover` | `hovering the parent paints the parent's hover colour: expected #2e2370ff, got #222730ff`, exit `1` |
| M3 | remove the child's `hover` | `hovering the child paints the child's own hover colour: expected #3bc97fff, got #191d25ff`, exit `1` |
| M4 | swap `hover`/`active` on the press fixture (view only) | `pressing paints the active colour: expected #ff6b6bff, got #a7a9ffff`, exit `1` — observed in **both** hosts |
| M5 | remove `active` from the press fixture | `pressing paints the active colour: expected #ff6b6bff, got #a7a9ffff`, exit `1` — and the fill is the hover colour, which is the measured correction |
| M6 | give the hover fixture `hover: card` in `stateFixtures` | `the hover fixture's states are distinguishable: expected true, got false`, exit `1` in **15 ms** — no frame is paid for |
| M7 | invert the resolver's precedence | two `state-pixels.test.ts` tests red (`returns the active colour…`, `lets active beat hover…`) |

**Limits.** Glyph ink (`hover.color`) is not sampled; the background path is the
contract the components use. Half-alpha hover fills (`alpha(primary, 0.5)` in
`internal/button.tsx`) stay proven by the highlight/palette wash pixels, not by
this probe. Active persistence outside the box, `cursor` and transitions remain
geometry/timing claims. Six frames per host is a deliberate cost ceiling; a new
state claim should replace a redundant one rather than add a capture.

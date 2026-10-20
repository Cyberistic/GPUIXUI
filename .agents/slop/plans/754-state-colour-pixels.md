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
5. a held pointer **outside** the box keeps the active colour until release;
6. all of the above in both hosts: `state-pixels` (offscreen `TestRenderer`) and
   `live-state-pixels` (the real 1100 × 720 window).

Non-goals:

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
  readonly moveTo: (point: Point) => Effect.Effect<void, E>;
}
```

- headless: `captureHeadless`, `Effect.sync(host.hover(..))`,
  `pressWindow`, `releasePointer`, `movePointer`;
- live: `captureLive`, then the same verbs with a `settle` (120 ms, the live
  registry's own rule) before the capture, because the automation protocol has
  no frame boundary.

Sequence and checks (one capture per state, each row is one assertion):

| Frame | Action | Sample | Expectation |
| ----- | ------ | ------ | ----------- |
| A | opening | `state-rest`, `state-hover`, `state-away`, `state-parent`, `state-child`, `state-press` | their rest fills; the device scale is an integer |
| B | hover `state-hover` | `state-hover` / `state-rest` / `state-away` | `primary` / `card` / `card` — the hover paints, per element, not globally |
| C | hover `state-parent` | `state-hover` / `state-parent` / `state-child` | `card` / `accent` / `card` — leaving reverts; parent hover does not paint the child |
| D | hover `state-child` | `state-child` / `state-parent` | `success` / `muted` — the child owns the hover and the parent reverts |
| E | press `state-press` | `state-press` | `destructive` — active paints without hover |
| F | release, then hover `state-press` | `state-press` | `primary` — release cleared active, hover now applies |
| G | press while hovered | `state-press` | `destructive` — active wins over hover |
| H | release in place | `state-press` | `primary` — hover survives the release |
| I | press, move outside | `state-press` | `destructive` — a held pointer outside keeps active |
| J | release outside | `state-press` | `card` — active and hover both clear |

Plus four preconditions, one per fixture chain, through `hasDistinctStates`
(`hover`, `parent`+`child`, `press`), each naming the fixture. Ten frames ×
their samples + the scale + the preconditions = **25 checks per host**.

The live twin writes `LIVE_ARTIFACTS/live-state-pixels.png` as its run artifact
(after the last step, i.e. the resting state). The artifact is evidence of the
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

- **M1** remove `hover` from `state-hover` → frame B reads `card` at
  `the hover colour replaces the authored fill`;
- **M2** remove the parent's `hover` → frame C reads `muted` at
  `hovering the parent paints its hover colour`;
- **M3** remove the child's `hover` → frame D reads `card` at
  `hovering the child paints its own hover colour`;
- **M4** swap `active` and `hover` on `state-press` → frames B/F fail (the
  hovered fill reads `destructive`) and frame E fails (the press reads
  `primary`);
- **M5** remove `active` from `state-press` → frames E/G/I read `primary` at
  `pressing paints the active colour`;
- **M6** give `state-hover` the `card` hover colour → the precondition
  `hasDistinctStates` fails by name before a frame is sampled;
- **M7** invert the resolver's precedence (`hover` over `active`) → the
  `active beats hover` unit test is red before the scenario runs.

## 6. Commands and expected results

```sh
nub run --filter playground test
# expected: green; 46 + 1 = 47 files, 495 + 8/9 = 503/504 tests (record the measured)

nub run --filter playground build
# expected: exit 0

nub apps/playground/dist/smoke/run.js --only state-pixels
# expected: 1/1 scenarios passed · states=verified, exit 0; 25 framework checks

nub apps/playground/dist/live/run.js --only live-state-pixels
# expected: 1/1 scenarios passed · states=verified, exit 0; 25 framework checks
# (one real window; the final frame is the run artifact)
```

Then every mutation in §5 as its own focused run of the matching host (the
headless one for M1–M3/M5–M6, the live one for one of them to prove the twin
sees the same bug), and:

```sh
nub apps/playground/dist/smoke/run.js
# expected: 110/110 scenarios passed, 4052 checks, 65 capabilities, exit 0

nub run check
nub run lint
nub run test
```

The full live suite is the merge/release gate and is **not** run here. Registry
totals: headless `109 → 110`, live `98 → 99`; `--list` must show both new ids.
The docs capability matrix is untouched because `states` already exists.

## 7. STOP conditions

Stop and report instead of improvising if:

- **frame B reads the rest fill** (`card`): the runtime applies a hover
  refinement but drops its background colour, or the fixture never became
  hovered. First prove the pointer reached the element by reading its bounds
  before/after a hover with a layout change (the `declared-styles` recipe); if
  the element is hovered and the fill still does not change, keep the scenario
  asserting the measured truth, record it in `COMPONENTS.md` and add a
  cross-team task that every colour-only hover in the library is invisible on
  0.10.0. Never claim a hover colour the frame does not show;
- **frame G reads `primary`** (hover beats active): the refinement order is not
  CSS's. Assert the measured order, document it, and add a cross-team task that
  a pressed-but-hovered control looks hovered; do not delete the check;
- **frame H reads `card`** (release clears hover even with the pointer over):
  the synthetic release does not re-enter hover. Record the rule, assert the
  measured value, and note the harness difference if the live run disagrees;
- **frame I reads `primary`** (a held pointer outside drops active): active is
  pointer-position-bound on this host. Record it; the shipped components would
  lose their pressed state on a drag-out, so add the cross-team note;
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

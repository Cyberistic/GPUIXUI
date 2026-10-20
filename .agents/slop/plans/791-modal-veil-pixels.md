# 791 — The modal veil: does the scrim dim the page, and does the surface stay above it?

**Phase:** F (pixel evidence) · **Workstream:** playground · **Status:** landed

**Depends on:** `100`, `110`, `112`, `120`, `140`, `150`, `155`, `197`, `330`,
`347`, `529`, `674`, `690`, `701`, `736`, `745`, `754`, `761`, `773`, `775`,
`778`, `784`, `786`.

**Owns:** `apps/playground` and `packages/testing` only. No other path is edited.

---

## 1. The bug being guarded

The shipped modal surfaces dim the window with a veil:

- `packages/components/src/dialog.tsx:245-256` — `DialogContent` returns an
  `<anchored position={{x:0,y:0}} occlude>` containing a `dialog-backdrop` `div`
  sized `window.width × window.height`, `backgroundColor: theme.colors.overlay`;
- `packages/components/src/drawer.tsx:248-262` — `DrawerContent` does the same
  with `drawer-backdrop`.

**No scenario in either registry ever names either backdrop.** `grep -rn
'dialog-backdrop\|drawer-backdrop' apps/playground/src` is empty. What the suite
knows about a modal is:

| Scenario | Asserts | Never asserts |
| -------- | ------- | ------------- |
| `tier2-dialog` / `live-tier2-dialog` | the content box is centred, native focus enters, the Tab trap, the `Dialog` a11y node, Escape returns focus and removes the surface | anything about the backdrop |
| `tier2-editing` / `live-tier2-editing` (Drawer) | the surface's edge/width/height, focus, Tab, Escape and **a press on the veil closes it** | that the veil paints, its colour, or its size |

A press outside the drawer proves a *hit target* exists there; a transparent,
`pointerEvents: "auto"` layer satisfies it. So today all of these ship green:

- `DialogContent`'s backdrop with `backgroundColor` deleted → the page stays
  fully bright behind a floating dialog box;
- the backdrop sized to the surface (`width/height` removed) → only the dialog
  box dims, the rest of the window does not;
- the drawer's backdrop with `backgroundColor` deleted → same;
- a backdrop that never unmounts → the page stays dim after closing (Escape
  removes the content; the final dim state is never read).

The modal is a core deliverable (`MISSION.md` "overlay", "focus") and the scrim
is the only part of it with no evidence. This probe makes the veil a decoded
frame assertion in both hosts.

**Goal:** mount the shipped `Dialog` and `Drawer` over a deterministic page,
decode one frame per state in each host, and prove that the veil paints the
`overlay` role, spans the window, leaves the modal surface undimmed, and unmounts
on close.

### 1a. Measured correction (2026-10-20, both hosts)

The first implementation sampled the page under the open dialog and read
**`#090909` everywhere**, not the predicted `#3A3B59`. A temporary four-route
probe (50 % red over a `primary` page) measured why:

| Route | Page pixel | Meaning |
| ----- | ---------- | ------- |
| `<anchored position={0,0}>` | `#8D0D0D` | 50 % red over **`#1A1A1A`** — the app is hidden |
| `<anchored … occlude>` | `#8D0D0D` | identical; `occlude` is not the cause |
| `<div position="absolute">` at the root | `#D3547F` | 50 % red over `primary` — composites correctly |
| `<div position="fixed">` at the root | `#D3547F` | identical; still parent-relative, not window-relative |

So the shipped `Dialog`/`Drawer` veil is **not a translucent scrim over the app**:
the anchored layer is an opaque surface whose clear colour is `#1A1A1A`, and the
`overlay` fill is composited over *that*. Opening a modal replaces the whole
window with `#090909` (`overlay` over `#1A1A1A`) instead of dimming the page. A
modal therefore loses the context the design intends to keep, and the defect was
invisible because no scenario named the backdrop.

The probe therefore asserts **both** routes: the shipped anchored behaviour (the
platform limitation, with the `overlay` token still reaching the paint) and the
**in-window absolute recipe** that dims the page correctly. The cross-team fix
(an app-root slot or a measured offset, since `absolute`/`fixed` resolve against
the mount parent) is recorded in `TODO.md`; when it lands, the anchored checks
flip to the recipe's expectations.

---

## 2. What the code does and what should be painted

Source-read at the pinned 0.10.0 / components HEAD:

- both veils are one `div` at `position: "absolute"` with
  `width: window.width`, `height: window.height` and
  `backgroundColor: theme.colors.overlay`, inside an `occlude` anchored layer;
- the surface is a child of that div, so it paints **after** the veil;
- the `overlay` role per palette: dark `#000000A6` (alpha `166/255 ≈ 0.651`),
  light `#00000073`, high-contrast `#000000CC`.

The runtime blends straight sRGB channels per channel (measured in plan `701`,
`highlight-pixels`), so the expected pixel is `Pixels.blendOver`.

**Predicted dark values** (model computes them; literals are for the reader):

| Point | Under | Expected |
| ----- | ----- | -------- |
| closed page panel one | `primary #A7A9FF` | `#A7A9FF` |
| closed page panel two | `success #3BC97F` | `#3BC97F` |
| anchored veil | runtime layer base `#1A1A1A` | `#090909` (measured) |
| in-window recipe | `primary #A7A9FF` | `#3A3B59` |
| in-window recipe | `success #3BC97F` | `#15462C` |
| modal surface | `popover #222730` | `#222730` (no veil over it) |

Every expected value is more than the `TOLERANCE = 2` apart from the undimmed
role, the other route's result and the surface, so each check can fail.

---

## 3. What is deliberately *not* claimed

- **Light and high-contrast palettes.** One palette per probe, like every other
  pixel probe; the model reads the role so a palette edit moves the expectation.
- **The surface's border, radius and elevation.** Those are plans `745` and
  `736`; this probe samples interior points only.
- **Nested-overlay order** (`187`, `558`) and the command palette's veil (`389`).
- **Blur, animation or a veil transition.** Neither exists on the pin.
- **The OS title bar.** Out of scope.
- **A component fix.** The anchored layer's opacity is a runtime property; the
  fix (an app-root slot for the veil, or a measured offset for
  `absolute`/`fixed`) belongs to `components` and is recorded cross-team. The
  probe proves the recipe and the shipped behaviour; it does not edit the
  component.

---

## 4. Exact changes

### 4.1 `apps/playground/src/scenarios/scrim-pixels.ts` (new, pure)

```ts
/** The roles the probe paints, in role terms so a palette edit re-derives. */
export interface ScrimFixtures {
  readonly page: string;   // colors.primary
  readonly second: string; // colors.success
  readonly modal: string;  // colors.popover
  readonly veil: string;   // colors.overlay
  readonly stage: string;  // colors.background
}

export const scrimFixtures = (colors: ThemeColors): ScrimFixtures => ({
  page: colors.primary,
  second: colors.success,
  modal: colors.popover,
  veil: colors.overlay,
  stage: colors.background,
});

/** The straight sRGB composite of the veil over a page fill. */
export const veiled = (veil: Pixels.Rgba, page: Pixels.Rgba): Pixels.Rgba =>
  Pixels.blendOver(veil, veil.a / 255, page);

/** The clear colour of an anchored layer, measured on 0.10.0 (plan 791 §1a). */
export const ANCHORED_LAYER_BASE = "#1A1A1A";

/** Whether every role is a different colour, so no check can be vacuous. */
export const distinctScrimRoles = (fixtures: ScrimFixtures): boolean => ...

/** Whether the veil moves the page further than the frame tolerance. */
export const veilIsVisible = (veil: Pixels.Rgba, page: Pixels.Rgba, tolerance: number): boolean =>
  !Pixels.rgbaNear(veiled(veil, page), page, tolerance);

/** The modal surface must stay distinguishable from the veiled page. */
export const surfaceStandsOut = (veil, page, modal, tolerance): boolean => ...
```

The **route guard** is the load-bearing new check: the anchored plane and the
in-window recipe must be distinguishable at the frame tolerance
(`!rgbaNear(anchored, recipe, TOLERANCE)`), or the probe could not tell the two
routes apart and would pass with the wrong one.

### 4.2 `apps/playground/src/scenarios/scrim-pixels.test.ts` (new)

At least eight tests:

1. a 65 % black veil over `#A7A9FF` is `#3A3B59` (per-channel, exact model);
2. over `#3BC97F` it is `#15462C`;
3. alpha `0` leaves the page unchanged;
4. alpha `255` is the veil colour itself;
5. `veilIsVisible` is true at the palette's alpha and false at `0.02`;
6. `surfaceStandsOut` is true for the dark roles and false when the modal is
   given the veiled page colour;
7. `distinctScrimRoles` is true for the dark palette and false when `second` is
   set to `page`;
8. `scrimFixtures` maps each role from the palette object it is given (a fake
   colours object, not the real palette), so the view and the expectations cannot
   drift.

### 4.3 `apps/playground/src/scenarios/dialog-scrim.tsx` (new)

The view (`scrim-stage`, `scrim-page`, `scrim-page-two`, `scrim-open-dialog`,
`scrim-open-drawer`, `scrim-open-recipe`, `scrim-readout`, `scrim-dialog`,
`scrim-dialog-blank`, `scrim-drawer`, `scrim-drawer-blank`,
`scrim-recipe-layer`, `scrim-close-recipe`):

- root `width: "100%", height: "100%"`, `backgroundColor: colors.background`,
  `position: "relative"`;
- `scrim-page` at `(24, 24)`, `200 × 120`, `backgroundColor: colors.primary`;
- `scrim-page-two` at `(window.width - 224, window.height - 144)`,
  `200 × 120`, `backgroundColor: colors.success` — the far corner proves the
  veil spans the window, not just the dialog;
- the three `Pressable` open controls and the `Readout`
  (`dialog=closed drawer=closed recipe=off`) so a failed click fails by state;
- `Dialog open={dialog}` + `DialogContent label="Scrim probe" testId="scrim-dialog"`
  containing `scrim-dialog-blank` (a transparent `div`, `height: 40`);
- `Drawer open={drawer}` + `DrawerContent side="right" label="Scrim probe"
  testId="scrim-drawer"` containing `scrim-drawer-blank`;
- the **in-window recipe**, the root's last child while `recipe` is on: a
  `div testId="scrim-recipe-layer"` with `position: "absolute"`, `left/top: 0`,
  `window.width × window.height`, `backgroundColor: colors.overlay`, holding a
  `Pressable testId="scrim-close-recipe"` that turns it off (the layer covers the
  page, so the close control must be inside it).

The module exports `scrimView`, `dialogScrimScenario` (id
`dialog-scrim-pixels`, capability `modal`) and `dialogScrimLiveScenario` (id
`live-dialog-scrim`, capability `modal`), sharing one `scrimChecks` function
behind a small driver:

```ts
interface ScrimDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError | E>;
  readonly click: (testId: string) => Effect.Effect<void, E>;
  readonly escape: () => Effect.Effect<void, E>;
  readonly text: (testId: string) => Effect.Effect<string | null, E>;
}
```

Headless wraps the sync host verbs in `Effect.sync`; live uses
`host.click`/`host.key`/`host.text` and sleeps 120 ms after a verb and before a
capture (the `opacity`/`state` pattern). The bulleted frames below are the run:

**Frames and checks, in order** (five captures per host):

| # | State | Checks |
| - | ----- | ------ |
| — | preconditions | the four roles are distinct; the veil is visible over both page roles and over `ANCHORED_LAYER_BASE`; the surface stands out from the veiled page; the anchored plane and the in-window recipe are distinguishable at `TOLERANCE` |
| F0 | closed | `scrim-page` = `primary`; `scrim-page-two` = `success`; `scrim-dialog`/`scrim-drawer`/`scrim-recipe-layer` have no bounds; readout `dialog=closed drawer=closed recipe=off` |
| F1 | dialog open | `scrim-page` = `veiled(overlay, ANCHORED_LAYER_BASE)` = `#090909`; `scrim-page-two` = the same plane (span); `scrim-dialog-blank` = `popover`; readout `dialog=open` |
| — | Escape | `scrim-dialog` has no bounds; readout `dialog=closed` |
| F2 | drawer open | `scrim-page` = the anchored plane **exactly once** (a dialog veil that failed to unmount would not change this pixel, because the plane is opaque — so the *surface* checks carry the unmount proof, and the final closed frame proves the drawer's); `scrim-drawer-blank` = `popover`; readout `drawer=open` |
| — | Escape | `scrim-drawer` has no bounds; readout `drawer=closed` |
| F3 | recipe open | `scrim-page` = `veiled(overlay, primary)` = `#3A3B59`; `scrim-page-two` = `veiled(overlay, success)` = `#15462C` — the in-window route dims the page, unlike the anchored one |
| — | click `scrim-close-recipe` | `scrim-recipe-layer` has no bounds; readout `recipe=off` |
| F4 | closed again | `scrim-page` = `primary`; `scrim-page-two` = `success` (both veils and the recipe unmounted) |

### 4.4 Registry wiring

- `apps/playground/src/scenarios/index.ts` — import `dialogScrimScenario`, add
  it to the `scenarios` array next to `opacityScenario`; the sidebar and the
  smoke runner read the same array.
- `apps/playground/src/live/scenarios.tsx` — import
  `dialogScrimLiveScenario`/`scrimView`, add a `liveDialogScrim: LiveScenario`
  with `ready: "scrim-stage"` and a `screenshot` artifact, and register it in the
  `liveScenarios` array.

### 4.5 Records

- `apps/playground/README.md` — a section under the pixel evidence (after
  `surface-theme`), with the table above and the four rules a consumer needs:
  the veil is `overlay` over the page, it is window-sized, the surface is above
  it, and it unmounts with the modal.
- `COMPONENTS.md` — the `modal` capability row gains the two ids; the Dialogs
  and Drawer rows note the measured veil.
- `TODO.md` — tick the new task under the playground workstream, with the
  focused ids and the end-of-task full headless total.
- `.agents/slop/plans/README.md` — add this plan's row and mark it landed.
- This plan — §7 Results.
- `TODO.md` — **cross-team (components):** an `anchored` modal veil is opaque.
  The shipped `DialogContent`/`DrawerContent` backdrop must become an in-window
  layer (an app-root slot, or a measured offset because `absolute`/`fixed`
  resolve against the mount parent), and then the anchored checks here flip to
  the recipe's expectations. Evidence: plan `791` §1a; the recipe is asserted by
  `dialog-scrim-pixels`.

---

## 5. Commands, expected results and STOP conditions

```sh
# 1. unit model
nub run --filter playground test          # +13 tests, green (593 total)

# 2. build the runners
nub run --filter playground build

# 3. focused headless probe (before it is registered, use the dev runner)
nub apps/playground/dist/smoke/run.js --only dialog-scrim-pixels
# expect: 1/1 passed, exit 0, 62 checks, five paints

# 4. focused live probe
nub apps/playground/dist/live/run.js --only live-dialog-scrim
# expect: 1/1 passed, exit 0, the same checks, one PNG artifact

# 5. end-of-task full headless suite (cross-cutting registry change)
nub apps/playground/dist/smoke/run.js
# expect: 118/118, exit 0, 4340 checks (4278 + 62)

# 6. completion gate
nub run check && nub run lint && nub run test
```

**STOP conditions.**

- **A measured pixel is outside `TOLERANCE = 2` of the model.** Re-derive once
  from the source/roles; if the runtime still disagrees, stop and record the
  actual value and what it implies (do **not** widen the tolerance).
- **The page under the veil reads `#000000`, is unchanged, or is a neutral
  plane.** It did: the anchored layer is opaque (`#1A1A1A`) and the page is not
  composited. That is a runtime finding, not a test to weaken, and §1a records
  it: the probe asserts the shipped plane **and** the in-window recipe that does
  dim the page. Do not "fix" the expectation without remeasuring both routes.
- **The modal blank point reads the veiled colour** instead of `popover`. The
  surface paints below the veil; stop and report the paint order.
- **A check cannot fail**: the veiled colour is within tolerance of the undimmed
  role or of the surface. Fix the fixture colours (do not keep a vacuous check).
- **The live host reports no bounds for a covered page panel.** The covered node
  left the tree; stop and record it (the headless twin may still run, but the
  live claim is dropped, not faked).
- **Any gate fails.** Do not retry unchanged; diagnose, and a fix needs its own
  two-direction proof.

---

## 6. Test plan

**Unit (`vitest`, co-located).** The eight cases in §4.2. They must fail if the
model stops honouring the veil alpha, ignores the base role, or accepts a veil
that cannot change the page. Unit mutation to observe: replace `veil.a / 255`
with a literal `0.65` (test 1 still passes — a null result to record) and then
with `0` (tests 1/5 must fail).

**Native checks.** The table in §4.3, ~18 checks per host.

**Mutation proofs, observed red and reverted:**

- **M1** — delete `backgroundColor: theme.colors.overlay` from
  `DialogContent`'s backdrop: F1's `scrim-page` reads the bare anchored base
  `#1A1A1A`, failing `the dialog veil tints the anchored plane`.
- **M2** — delete `width`/`height` from the dialog backdrop so it sizes to the
  surface: F1's `scrim-page-two` (the far corner) reads `#1A1A1A`, failing
  `the veil spans the window`.
- **M3** — delete `backgroundColor` from `DrawerContent`'s backdrop: F2's
  `scrim-page` reads `#1A1A1A`, failing `the drawer veil tints the anchored
  plane`.
- **M4** — remove the `if (!open) return null` early return in `DialogContent`
  (a veil that never unmounts): the final closed frame's `scrim-page` stays the
  plane and the dialog surface stays painted, failing both restore checks.
- **M5** — mount the recipe's layer as `<anchored>` instead of the in-window
  `div`: F3's `scrim-page` reads `#090909` instead of `#3A3B59`, failing
  `the in-window recipe dims the page` — the route guard earned its keep.
- **M6** — point the surface sample at the page panel: the surface check reads
  the plane, failing `the dialog surface is not dimmed`.
- **Unit mutation** — `veil.a / 255 → 0`: the composite and visibility tests
  fail.

Each mutation is applied, the focused scenario is run, the failure is copied
into §7 **by name**, and the source is reverted; the scenario is re-run green
afterwards. None of these mutations is committed.

---

## 7. Results

**Landed 2026-10-20.** Two new scenarios, one pure model, ten unit tests and one
new finding.

**The finding (§1a).** The shipped veil lives in an `<anchored>` layer, and that
layer is opaque on 0.10.0: opening the dialog paints `#090909` over the whole
window (`colors.overlay #000000A6` over the layer's `#1A1A1A`), so the app is
hidden, not dimmed. `occlude` makes no difference. An in-window `absolute` layer
of the same token composites over the page instead (`#3A3B59` over
`primary #A7A9FF`, `#15462C` over `success #3BC97F`). The probe asserts both
routes and a guard that they are distinguishable; the fix is recorded cross-team
(`TODO.md`, `components`).

**Focused runs.**

```sh
nub apps/playground/dist/smoke/run.js --only dialog-scrim-pixels
# -> ok, 1/1, 62 checks, 35.3 s, exit 0, modal=verified

nub apps/playground/dist/live/run.js --only live-dialog-scrim
# -> ok, 1/1, 62 checks, 48.8 s, exit 0, modal=verified
```

The live artifact `apps/playground/.artifacts/live/live-dialog-scrim.png`
(2200 × 1440, device scale 2) is the open state: the window is the `#090909`
plane and the dialog surface is `#222730`.

**Mutation proofs, observed red and reverted:**

- **M1** — dialog backdrop fill removed:
  `the dialog veil tints the anchored plane: expected #090909ff, got #1a1a1aff`.
- **M2** — dialog backdrop `width`/`height` removed:
  `the dialog veil tints the anchored plane: expected #090909ff, got #222730ff`
  (the content-sized backdrop moves the surface over the sampled panel).
- **M3** — drawer backdrop fill removed:
  `the drawer veil tints the anchored plane: expected #090909ff, got #1a1a1aff`.
- **M4** — `if (!open) return null` removed from `DialogContent`:
  `the closed page paints its token: expected #a7a9ffff, got #090909ff`.
- **M5** — the recipe's in-window `div` mounted inside an in-flow `<anchored>`
  layer:
  `the in-window recipe dims the page: expected #3a3b59ff, got #090909ff`.
- **M6** — the dialog surface sample moved to the page panel:
  `the dialog surface is not dimmed: expected #222730ff, got #090909ff`.
- **Unit mutation** — `veil.a / 255 → 0`: five tests red (both composites, the
  visibility pair and the anchored-plane test).

**One invalid mutation, recorded.** The first M5 attempt wrapped the recipe's
`div` in `<anchored>` but left the div `position: "absolute"`. An absolutely
positioned child inside an anchored layer **escapes into the main window**, so
the flow kept the working route and the scenario passed. That is now a measured
trap in the README: the mutation must remove the absolute positioning, and the
recipe itself must stay in-flow.

**End-of-task full headless.**

```sh
nub apps/playground/dist/smoke/run.js
# -> 118/118 scenarios passed, exit 0, 302.0 s
```

Artifact `.artifacts/smoke-report.json`: 118 scenarios, **4340** checks
(`4278 + 62`), 65 capabilities, host
`gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed
81c99f81, runtime shaders)`; `dialog-scrim-pixels` reports 62. The live registry
is **107** (`live-dialog-scrim` focused-green); the full live suite is the merge
gate and was not run.

**Completion gate.** `nub run check`, `nub run lint` and `nub run test` all ran
green on the code head (`playground` **593 passed** — 580 at plan `786` + 13 new
unit tests, `testing` 69). After merging `origin/master`'s four docs-only
commits the merged head re-ran `check` and `test` green; the headless suite
describes the code, which the merge does not touch.


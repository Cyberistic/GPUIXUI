# 791 — The modal veil: does the scrim dim the page, and does the surface stay above it?

**Phase:** F (pixel evidence) · **Workstream:** playground · **Status:** in progress

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
`overlay` role over the page, spans the window, leaves the modal surface
undimmed, and unmounts on close.

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
| page panel one | `primary #A7A9FF` | `#3A3B59` |
| page panel two | `success #3BC97F` | `#15462C` |
| modal surface | `popover #222730` | `#222730` (no veil over it) |
| stage | `background #11141A` | `#11141A` when closed |

Every expected value is more than the `TOLERANCE = 2` apart from the undimmed
role and from the surface, so the check can fail.

---

## 3. What is deliberately *not* claimed

- **Light and high-contrast palettes.** One palette per probe, like every other
  pixel probe; the model reads the role so a palette edit moves the expectation.
- **The surface's border, radius and elevation.** Those are plans `745` and
  `736`; this probe samples interior points only.
- **Nested-overlay order** (`187`, `558`) and the command palette's veil (`389`).
- **Blur, animation or a veil transition.** Neither exists on the pin.
- **The OS title bar.** Out of scope.

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

/** Whether every role is a different colour, so no check can be vacuous. */
export const distinctScrimRoles = (fixtures: ScrimFixtures): boolean => ...

/** Whether the veil moves the page further than the frame tolerance. */
export const veilIsVisible = (veil: Pixels.Rgba, page: Pixels.Rgba, tolerance: number): boolean =>
  !Pixels.rgbaNear(veiled(veil, page), page, tolerance);

/** The modal surface must stay distinguishable from the veiled page. */
export const surfaceStandsOut = (veil, page, modal, tolerance): boolean => ...
```

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
`scrim-open-drawer`, `scrim-readout`, `scrim-dialog`, `scrim-dialog-blank`,
`scrim-drawer`, `scrim-drawer-blank`):

- root `width: "100%", height: "100%"`, `backgroundColor: colors.background`,
  `position: "relative"`;
- `scrim-page` at `(24, 24)`, `200 × 120`, `backgroundColor: colors.primary`;
- `scrim-page-two` at `(window.width - 224, window.height - 144)`,
  `200 × 120`, `backgroundColor: colors.success` — the far corner proves the
  veil spans the window, not just the dialog;
- the two `Pressable` open controls and the `Readout`
  (`dialog=open drawer=closed`) so a failed click fails by state;
- `Dialog open={dialog}` + `DialogContent label="Scrim probe" testId="scrim-dialog"`
  containing `scrim-dialog-blank` (a transparent `div`, `height: 40`);
- `Drawer open={drawer}` + `DrawerContent side="right" label="Scrim probe"
  testId="scrim-drawer"` containing `scrim-drawer-blank`.

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
}
```

Headless wraps the sync host verbs in `Effect.sync`; live uses
`host.click`/`host.key` and sleeps 120 ms before each capture (the `opacity`/
`state` pattern). The drawer is sampled only on `scrim-page` (it covers the
right-hand panel).

**Frames and checks, in order** (four captures per host):

| # | State | Checks |
| - | ----- | ------ |
| — | preconditions | the four roles are distinct; the veil is visible over `page`; the surface stands out from the veiled page |
| F0 | closed | `scrim-page` = `primary`; `scrim-page-two` = `success`; `scrim-dialog`/`scrim-drawer` have no bounds; readout `dialog=closed drawer=closed` |
| F1 | dialog open | `scrim-page` = veiled `primary`; `scrim-page-two` = veiled `success`; `scrim-dialog-blank` = `popover`; readout `dialog=open` |
| — | Escape | `scrim-dialog` has no bounds; readout `dialog=closed` |
| F2 | drawer open | `scrim-page` = veiled `primary` **exactly once** (a dialog veil that failed to unmount would double-dim it); `scrim-drawer-blank` = `popover`; readout `drawer=open` |
| — | Escape | `scrim-drawer` has no bounds; readout `drawer=closed` |
| F3 | closed again | `scrim-page` = `primary` again (the drawer veil unmounted) |

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

---

## 5. Commands, expected results and STOP conditions

```sh
# 1. unit model
nub run --filter playground test          # +8 tests, green

# 2. build the runners
nub run --filter playground build

# 3. focused headless probe (before it is registered, use the dev runner)
nub apps/playground/dist/smoke/run.js --only dialog-scrim-pixels
# expect: 1/1 passed, exit 0, ~18 checks, one paint per state

# 4. focused live probe
nub apps/playground/dist/live/run.js --only live-dialog-scrim
# expect: 1/1 passed, exit 0, the same checks, one PNG artifact

# 5. end-of-task full headless suite (cross-cutting registry change)
nub apps/playground/dist/smoke/run.js
# expect: 118/118, exit 0, total = 4278 + the new check count

# 6. completion gate
nub run check && nub run lint && nub run test
```

**STOP conditions.**

- **A measured pixel is outside `TOLERANCE = 2` of the model.** Re-derive once
  from the source/roles; if the runtime still disagrees, stop and record the
  actual value and what it implies (do **not** widen the tolerance).
- **The page under the veil reads `#000000` or is unchanged from the page.** The
  veil is not compositing (or is opaque). Stop: that is a finding about the
  runtime or the component, not a test to weaken.
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
  `DialogContent`'s backdrop: F1's `scrim-page` reads `primary`, failing
  `the dialog veil dims the page`.
- **M2** — delete `width`/`height` from the dialog backdrop so it sizes to the
  surface: F1's `scrim-page-two` (the far corner) stays undimmed, failing
  `the veil spans the window`.
- **M3** — delete `backgroundColor` from `DrawerContent`'s backdrop: F2's
  `scrim-page` reads `primary`, failing `the drawer veil dims the page`.
- **M4** — remove the `if (!open) return null` early return in `DialogContent`
  (a veil that never unmounts): F2's `scrim-page` is double-dimmed, failing
  `the drawer frame is dimmed exactly once`; F3 fails the restore too.
- **M5** — point `scrim-dialog-blank` at the page panel (a coordinate mistake):
  the surface check reads the veiled colour, failing
  `the dialog surface is not dimmed`.
- **Unit mutation** — `veil.a / 255 → 0`: tests 1 and 5 fail.

Each mutation is applied, the focused scenario is run, the failure is copied
into §7 **by name**, and the source is reverted; the scenario is re-run green
afterwards. None of these mutations is committed.

---

## 7. Results

_(filled in by the executor; every number below must be read back from a run or
an artifact, never predicted)_

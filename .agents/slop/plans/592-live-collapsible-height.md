# 592 — The collapsible height recipe in a real window

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `186` (`collapsible-height`), `157` (`motion-collapse`), `192`
(`live-motion`, the paused live clock), `197` (bounds), `189` (the live runner),
`591` (the previous plan).
**Phase:** F — the last motion recipe with only `TestRenderer` evidence.

## 1. Why

Plan `186` measured the recipe that `@gpuixui/components`' Collapsible and
Accordion still need (the cross-team row in `TODO.md`):

- a body stays **mounted** inside a `height: 0; overflow: hidden` motion
  container, so a draft survives;
- the natural height is measured through `ref → renderer.getElementBounds`
  **at first layout while the body is clipped**;
- `motion.div` interpolates height exactly (56 px at 80 ms of a 200 ms / 140 px
  tween);
- the clip alone refuses input in the collapsed content (no `pointerEvents`
  guard);
- `onMotionComplete` fires once per tween.

Plan `192`'s `live-motion` proved the motion **clock** transfers (a 240 → 96 px
width frame at 80 ms), but not this recipe: the collapsible's own measurement,
its input clip and its state retention are still offscreen-only. This plan adds
one live twin over the existing view. No production or `packages/testing`
change.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `collapsibleHeightScenario`; add `liveCollapsible` next to `motion` (`capability: "motion"`); register it. |
| `apps/playground/README.md` | a `### The collapsible height recipe in a real window (plan 592)` section. |
| `COMPONENTS.md` | the `collapsible-height` evidence in the motion capability row and the `Collapsible sections` inventory row gain a live clause. |
| `PLAN.md` | one D78 row with the measured result. |
| `TODO.md` | claim this task; tick it with the measured checks and exact focused ids. |
| `.agents/slop/plans/README.md` | index row and the playground narrative line. |

No `packages/testing` change: `pauseMotion`, `fastForwardMotion`, `bounds`,
`clickWindow`, `click`, `key`, `text` and `screenshot` already exist.

## 3. Implementation

`view: collapsibleHeightScenario.view`, `ready: "collapse-trigger"`.

1. `pauseMotion()`. Read `collapse-content` and assert it is laid out while
   clipped (`height > 0`); read the trigger and `collapse-after` and assert the
   next row starts **below** the header (the collapsed body contributes no
   height).
2. Read `collapse-readout` and assert a measurement existed at mount (the text
   contains `mounted=` and not `mounted=none`). This is the first-layout
   measurement, the fact the whole recipe rests on.
3. Press at a window point just **below** the header (`clickWindow` at the
   header centre x, `header.y + header.height + 4`), i.e. inside the clipped
   content. Assert `presses=0`.
4. Click `collapse-trigger`; assert `open=1` and `complete=0`.
5. `fastForwardMotion(80)` + `settle`; assert `collapse-after` moved by
   `content.height * 0.4 ± 4`.
6. `fastForwardMotion(200)` + `settle`; assert the next row moved by
   `content.height ± 1` and the readout says `complete=1`.
7. Click `collapse-button`; assert `presses=1` (the open body is interactive).
8. Click `collapse-input`; type `a`, `settle`, `b`; assert `draft=ab`.
9. Click the trigger; `fastForwardMotion(200)`; assert the next row returned to
   its baseline (±1), `complete=2`, `draft=ab`, and `collapse-content` is still
   painted (mounted).
10. Focus the trigger, `keyDown("enter")` then `keyUp("enter")`;
    `fastForwardMotion(200)`; assert it re-opened to `content.height ± 1`,
    `complete=3`, `draft=ab`.
11. Screenshot to `${LIVE_ARTIFACTS}/${liveCollapsible.id}.png`.

Expected: **~17 live checks** (each `expect*` is one). Record the measured
count. `settle` after every click, key and clock step (the protocol has no frame
boundary).

## 4. STOP conditions

- **STOP** if `pauseMotion()` does not affect the live tween (the next row jumps
  to its final height before a `fastForwardMotion`). The recipe's mid-frame
  claim then stays headless; record it instead of dropping the check.
- **STOP** if the clipped press lands on the button (`presses=1`). Record the
  measured hit; do not move the press point until it misses — a changed point
  would hide the clip defect.
- **STOP** if the mounted measurement is absent (`mounted=none`). That is a
  live-only failure of the first-layout measurement and must be reported, not
  papered over with a later open.
- **STOP** if a needed host verb is missing.

## 5. Test plan

The scenario **is** the test; every check can fail. Required mutation proofs,
run one at a time in the real window, observe the failure, revert:

- **M1** change the motion container's `overflow: "hidden"` to `"visible"` →
  the clipped press check fails with `presses=1`.
- **M2** render the body only when `open` → the draft check fails after the
  collapse (`draft=`), and the "stayed mounted" check reads no bounds.
- **M3** drop the `natural` measurement (`animate={{ height: open ? 0 : 0 }}`)
  → the mid-tween and final-height checks fail against the measured `0`.

After reverting, the focused run must be green twice in a row.

## 6. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --list | grep live-collapsible
nub apps/playground/dist/live/run.js --only live-collapsible
```

Expected: `1/1` scenario passed, exit `0`, one screenshot under
`apps/playground/.artifacts/live/`.

Headless control: `nub apps/playground/dist/smoke/run.js --only collapsible-height`
(the view is untouched) — `1/1`, 32 checks.

End-of-task gate:

```sh
nub run check
nub run lint
nub run test
nub run --filter playground build
nub apps/playground/dist/smoke/run.js
```

Expected: all green; the headless registry stays **103/103** (`3653` checks,
64 capabilities). The full **live** suite is the merge/release gate and is
**not** run for this task; the live registry moves `79 → 80`.

## 7. Acceptance

- `live-collapsible` exists, is listed by `--list`, and is green twice.
- The measured numbers and any live/offscreen difference are recorded.
- The mutation proofs were observed failing and reverted.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` (D78) and the README carry the result.
- `check`, `lint`, `test` and the full headless suite are green.

## 8. Measured record (2026-10-19)

**Result:** `1/1` focused scenario, exit `0`, **37 checks**, four green runs
(one before the stronger `mounted` assertion, three after) plus the three
mutation runs. Live registry `79 → 80` (derived: `--list | wc -l`).
Screenshot: `.artifacts/live/live-collapsible.png`.

| Measurement | Value |
| ----------- | ----- |
| first-layout measurement | `mounted=140` while the body is clipped to `0` |
| collapsed geometry | the next row starts above the content |
| clipped control | `click("collapse-button")` is addressable but not hit-testable: `presses=0` |
| mid-tween | `fastForwardMotion(80)` moves the row `56 ± 4` of the 140 px tween, `complete=0` |
| opened | row delta `140 ± 1`, `complete=1` |
| interaction | `presses=1`; two keys (settled) give `draft=ab` |
| collapsed | row delta `0 ± 1`, `complete=2`, body still answers `alpha`, `draft=ab` |
| Enter re-open | row delta `140 ± 1`, `complete=3`, `draft=ab` |

The live values match plan `186` exactly. The first live run used a coordinate
press just below the header; it proved nothing about the clip (the top padding
has no handler). The **load-bearing** press is the automation click on
`collapse-button`, whose unclipped centre is below the collapsed wrapper (plan
`349`'s rule), so it hits nothing only because of the clip.

**Mutation proofs, each observed and reverted:**

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | `overflow: "hidden"` → `"visible"` | failed "the live clip refuses a press…": got `presses=1` |
| M2 | the close path cleared the draft (`setDraft("")`) | failed "the live draft survived the collapse": got `draft=` |
| M3 | `animate={{ height: open ? natural : 0 }}` → `height: 0` | failed "the live height tween is mid-flight at 80 ms": expected `56 ± 4`, got `0` |

**Focused ids run:** `live-collapsible` (four green runs and three mutation
runs); the headless control `collapsible-height` (32 checks, green). The full
live suite was **not** run (merge/release gate).

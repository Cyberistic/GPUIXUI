# 571 — The log viewer in a real window: tail anchoring, a wheel and no snap-back

**Owner:** playground workstream (`apps/playground`, `packages/testing`).
**Depends on:** `154` (the log-viewer probe), `152`/`166`/`197` (virtual-list
anchors and live observation), `300`/`301` (the message scroller, the pin
rule), `189`/`190` (the live window), `534`/`559` (recent virtual-list live
twins), `570` (the most recent live evidence).
**Phase:** F — the last Tier 4 interaction family with headless-only evidence.

## 1. Why

`log-viewer` (plan `154`) proved in the offscreen `TestRenderer` that a
`<virtual-list alignment="bottom" followTail>` opens at the tail and re-anchors
when lines are appended. Its header also states a third claim that the scenario
never exercises:

> Scrolling up and then appending does **not** snap back, so a real "follow"
> toggle is app state plus a scroll.

That claim is the contract a log viewer depends on, and it is exactly the kind
of scroll behaviour a real window has differed on before: a body-cell `deltaX`
wheel is swallowed (plan `338`), a scroller's own box moves with its scroll
(plan `556`), and `<virtual-list>` has no painted bounds live (plans `532`,
`559`). The live suite has never opened a log viewer. The headless scenario
also never drives a wheel, so neither claim is guarded today.

This plan closes both gaps with one shared view:

1. the headless `log-viewer` gains the wheel, no-snap-back and return-to-tail
   checks its header already promises;
2. a live twin, `live-log`, proves the same path through a real window and a
   real wheel.

It deliberately asserts only what both hosts can answer: painted text, the
virtual-list anchor (`getListScrollTop`) and the wheel. Style, colour and the
accessibility dump stay headless.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/log-viewer.tsx` | add `testId="log-viewport"` to the 280 px wrapper (the live wheel/box target); add the wheel, no-snap-back and return-to-tail steps; keep the two existing append checks |
| `apps/playground/src/live/scenarios.tsx` | import `logViewerScenario`; add `live-log` (`capability: "log"`, `ready: "log-count"`, `view: logViewerScenario.view`); register it after `scroller` |
| `apps/playground/README.md` | one line in the live-evidence section naming `live-log` and what it proves |
| `COMPONENTS.md` | the **Log viewers** row cites `live-log` and the measured anchor |
| `TODO.md` | add and tick the task with the measured counts; update the live-registry note |
| `.agents/slop/plans/README.md` | index row for this plan |

No `packages/testing` change: every verb exists (`wheel`, `listScrollTop`,
`scrollToItem`, `text`, `bounds`, `paintedText`, `screenshot`). No production
component change: a measured defect goes to `TODO.md` for its owner.

## 3. Implementation

### 3.1 The shared view

`LogViewerProbe` keeps `INITIAL = 30`, `APPEND = 20`, 20 px rows and a 280 px
list. Add only an addressable wrapper:

```tsx
<div testId="log-viewport" style={{ display: "flex", height: 280 }}>
```

`<virtual-list>` has no painted bounds in the live tree, so the wrapper is the
live wheel target and the live box. The list keeps `testId="log-list"` for the
anchor and the headless wheel.

### 3.2 Headless steps (extend `logViewerScenario.steps`)

After the existing two appends (count `70`), add:

1. read `ctx.host.listScrollTop("log-list")` — the opening anchor. Expected
   `[16, 0]` for 30 × 20 px in a 280 px list (`600 − 280 = 320 = 16 × 20`).
   **Measure it first**; encode the measured value, not this arithmetic.
2. `ctx.host.wheel("log-list", 0, 100)` then `advance(50)` — the anchor moves
   toward the head and the tail (`line 69`) is no longer painted, while an
   earlier line inside the new window **is** painted.
3. `click("log-append")` then `advance(50)` — count `90`; the anchor is
   **unchanged** (no snap-back) and `line 89` is **not** painted.
4. `ctx.host.scrollToItem("log-list", 90)` then `advance(50)` — the at-end
   sentinel clamps to the bottom: `line 89` paints and the anchor is the new
   maximum.
5. `click("log-append")` then `advance(50)` — count `110`; the tail follows
   again (`line 109` paints, `line 89` leaves the window). This is the
   "follow while at the end" half of the contract.

If step 4's sentinel does not clamp, try the last row index (`89`) and record
the difference in §8; do not widen an equality.

### 3.3 `live-log` (in `apps/playground/src/live/scenarios.tsx`)

Reuses `logViewerScenario.view`; every read settles or uses `waitForAnchor` /
`waitForPainted`.

1. `ready: "log-count"`; wait for the opening anchor and assert the tail paints
   (`paintedText` contains `line 29`) and `line 0` does not.
2. click `log-append`, settle, `waitForText("log-count", "50")`, wait for the
   new anchor, assert `line 49` paints and `line 29` does not (a real click and
   a real append follow the tail).
3. `wheel("log-viewport", 0, 100)`, settle: the anchor moves, `line 49` stops
   painting and an earlier line inside the window paints.
4. click `log-append`, settle, `waitForText("log-count", "70")`: the anchor is
   **exactly** the same as after the wheel and `line 69` is not painted (a real
   wheel plus an append does not yank the reader).
5. `scrollToItem("log-list", 70)`, settle: the tail paints again and the anchor
   is the new maximum.
6. click `log-append`, settle, `waitForText("log-count", "90")`: the tail
   follows (`line 89` paints, `line 69` leaves).
7. `screenshot(`${LIVE_ARTIFACTS}/live-log.png`)`.

The close-out line reports the number of checks and the measured anchor values.

## 4. Commands and expected results

```sh
nub run --filter playground build
# exit 0

nub apps/playground/dist/smoke/run.js --only log-viewer
# 1/1 scenarios passed, exit 0; capability log=verified

nub apps/playground/dist/live/run.js --only live-log
# 1/1 scenarios passed, exit 0; one screenshot in .artifacts/live

nub apps/playground/dist/live/run.js --list | wc -l
# 68 (was 67)

nub apps/playground/dist/smoke/run.js
# 101/101, exit 0 (end-of-task check; the change is additive)

nub run check
nub run lint
nub run test
# exit 0
```

The full live suite is the merge/release gate: do **not** run `--all` here.
Record the registry count from `--list`.

## 5. Test plan and mutation proofs

The scenarios are the tests. Every new check must fail without its behaviour;
observe and revert each mutation and record the exact failure text in §8.

- **M1 (tail)** — remove both `alignment="bottom"` and `followTail` from the
  list: the opening tail check fails headless and live.
- **M2 (wheel)** — delete the wheel step from the live twin: the anchor stays
  at the bottom, `line 49` still paints and the "the wheel leaves the tail"
  check fails.
- **M3 (no snap-back)** — remove the wheel in the **headless** scenario only:
  its no-snap-back check then asserts an anchor that never moved, so the
  movement assertion before it fails first. Record which check fails.
- **M4 (return)** — replace `scrollToItem("log-list", 90)` with `90 - 20`:
  the tail check after the jump fails, proving the sentinel is what clamps.
- **M5 (follow)** — drop `followTail` (keep `alignment="bottom"`): record
  whether append still follows. If it does, the follow half is the
  `alignment` prop's and the plan records that; do not invent a check.

If a mutation does not fail, the check proves nothing and must be strengthened
or removed.

## 6. STOP conditions

- **The wheel does not move the anchor in the window.** Try the wrapper's
  painted box first (it must exist); if neither `log-viewport` nor a wrapper
  child receives the wheel, record the measurement, mark the interaction
  headless-only on the **Log viewers** row, add a `TODO.md` cross-team row if a
  component is at fault, and stop. Never simulate a scroll in component code to
  make the check pass.
- **The anchor values differ from §3.** Encode the measured values in the plan
  and the checks. A mismatch in *behaviour* (the append yanks the reader) is a
  finding, not a tolerance.
- **`scrollToItem` does not clamp at the sentinel.** Record what it does; use
  the last row index if that is the working route; if neither reaches the tail,
  STOP and record the limitation.
- **The live tree cannot answer the assertion** (style, a11y, colour). Drop it
  from the live twin; it belongs to the headless scenario.
- **The headless scenario regresses.** Stop: a live twin must not change the
  headless contract except by adding checks.
- **A check needs a tolerance.** Only geometry may carry one, justified by a
  measured live difference.

## 7. Acceptance

- `log-viewer` and `live-log` are green with `--only`, exit `0`.
- One screenshot exists under `apps/playground/.artifacts/live/`.
- Headless stays `101/101`; `check`/`lint`/`test` pass.
- Mutation proofs M1–M5 observed and reverted, with the failure text recorded
  in §8.
- `README.md`, `COMPONENTS.md`, `TODO.md` and the plan index name `live-log`
  and the measured anchors.
- The live registry count is recorded from `--list`, not claimed from a full
  run.

## 8. Result (measured 2026-10-19)

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js --only log-viewer` | **1/1**, exit `0`; **22** checks (was 8) |
| `nub apps/playground/dist/live/run.js --only live-log` | **1/1**, exit `0`; **26** checks; one screenshot |
| `nub apps/playground/dist/live/run.js --list \| wc -l` | **68** (was 67) |
| `nub apps/playground/dist/smoke/run.js` | **101/101** (**3552** checks), exit `0` |
| `nub run check` / `lint` / `test` | exit `0`; playground 417 tests, `@gpuixui/testing` 61 |

The full live suite was **not** run: it is the merge/release gate, and this
change is additive. The registry count comes from `--list`.

Measured anchors (20 px rows, 280 px viewport):

| Moment | Anchor |
| ------ | ------ |
| opening, 30 lines | `[30, 0]` |
| after one pinned append, 50 lines | `[50, 0]` |
| after a real `100` px wheel up | `[31, 0]` |
| after an append while scrolled up, 70 lines | `[31, 0]` (unchanged) |
| after `scrollToItem(list, 70)` | `[70, 0]` |
| after a following append, 90 lines | `[90, 0]` |

**The anchor rule for a bottom-aligned list:** at the tail it reports
`[count, 0]`, not the plain virtual list's max-scroll `row, offset`. A pin test
therefore compares the index to the row count. Once the reader scrolls away it
reports the ordinary max-scroll pair, which is why `[31, 0]` is stable across
the unpinned append.

Mutation proofs, each observed and reverted:

- **M1** — removed `alignment="bottom"` and `followTail` from the list:
  headless `the list opens at the tail anchor: expected "30,0", got "0,0"`,
  exit `1`; live `the live log opens at the tail anchor: expected "30,0",
  got "0,0"`, exit `1`.
- **M2** — removed the live wheel: `the live wheel leaves the tail: expected
  "31,0", got "50,0"`, exit `1`.
- **M3** — removed the headless wheel: `a wheel moves the reader away from the
  tail: expected "51,0", got "70,0"`, exit `1`.
- **M4** — replaced the at-end sentinel with `rowCount − 20`: `the at-end
  sentinel returns to the tail: expected "90,0", got "70,0"`, exit `1`.
- **M5** — removed `followTail` and kept `alignment="bottom"`: headless and
  live both stayed green. **Null result:** `alignment="bottom"` alone follows
  an append, so `followTail` is redundant in this composition. Recorded rather
  than turned into a check.

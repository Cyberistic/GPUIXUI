# 301 — The message scroller in a real window

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts and the proof in §7) |
| Phase | F (live confirmation) |
| Owner | playground workstream |
| Depends on | `189`, `190`, `192`, `197`, `300` |
| Feeds | `COMPONENTS.md` **Message scroller**; the live-suite count |

## 1. Goal

Plan `300` measured the message-scroller contract on the offscreen
`TestRenderer`. The live suite exists to prove the same mechanisms survive a
**real window** driven through `@gpuix/native/automation` (plans `189`–`199`).
The scroller has one path that a window could change: the wheel goes through
the automation protocol, `onVisibleRange` is dispatched by a real frame loop,
and the anchor is read from the live renderer inside that handler.

This plan adds one live scenario, `live-scroller`, reusing the headless view.
It asserts the subset a window can answer: the mount-time at-end scroll, a
pinned append, a wheel that unpins, a no-yank append, jump-to-latest, a streamed
last row, and the short history. It does not repeat the 51 headless checks.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `messageScrollerScenario`; add `live-scroller`; register it last |
| `apps/playground/README.md` | the live section gains `live-scroller` and the count `15 → 16` |
| `COMPONENTS.md` | the live-suite paragraph names `live-scroller` |
| `TODO.md` | add and tick the task; live `15 → 16` |
| `.agents/slop/plans/README.md` | index this plan; §8 records the run |

No change to `packages/testing`: `AsyncSmokeHost` already exposes `wheel`,
`listScrollTop`, `click`, `bounds`, `paintedText`, `waitFor` and `screenshot`.
No change to the headless scenario.

## 3. The scenario

`id: "live-scroller"`, title "Live scroller: pin, no-yank and jump in a window",
capability `scroller`, `view: messageScrollerScenario.view`, `ready: "ms-count"`.

Steps (each input followed by `settle`):

1. **Opens at the latest.** Anchor `[50,0,300]`; `ms-pin` is `"true"`;
   `paintedText` contains `message 60`; `ms-jump` has no bounds.
2. **Pinned append.** Click `ms-append`; `ms-count` is `61`; anchor
   `[51,0,300]`; `message 61` is painted.
3. **A live wheel unpins.** `wheel("ms-viewport", 0, 400)`; `ms-pin` is
   `"false"`; anchor `[37,20,300]`; `ms-jump` is painted.
4. **No yank.** Click `ms-append`; anchor stays `[37,20,300]`; `ms-unread` is
   `"1"`; `ms-row-62` has no bounds (the live host reports `null` for an
   element that is not painted).
5. **Jump.** Click `ms-jump`; `ms-pin` is `"true"`; `ms-unread` is `"0"`;
   anchor `[52,0,300]`; `message 62` is painted.
6. **Streaming.** Click `ms-stream` twice; `ms-last-height` is `"50"`; anchor
   `[52,20,300]`; the bottom of `ms-row-62` equals the bottom of `ms-viewport`
   within 1 px.
7. **Short history.** Click `ms-reset`; `ms-count` is `"3"`; anchor
   `[0,0,300]`; all three rows are painted; `ms-jump` has no bounds.
8. Screenshot `apps/playground/.artifacts/live/live-scroller.png`.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub run --filter playground smoke:live` | `16/16`, exit `0`, `live-report.json` |
| `nub apps/playground/dist/smoke/run.js` | `60/60`, exit `0` (unchanged) |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 5. STOP conditions

- **STOP** if the live wheel does not deliver `onVisibleRange` (the pin readout
  never changes). Record whether the automation wheel reached the list at all
  (`scrollOffset`/anchor moved) before treating it as a runtime gap.
- **STOP** if the live anchor inside the handler is stale in a window while it
  was current offscreen. Record both numbers; do not add a timer.
- **STOP** if a live frame needs more than one `settle` for the anchor to
  commit; record the number of awaits, then use repeated `settle`s, not a
  longer sleep.
- **STOP** if the run exits `2` (no window on this host).

## 6. Test plan and two-direction proof

The scenario is the test; `smoke:live` is the runner. Reverse proof: change the
wheel from `400` to `0` and step 3 must fail (`ms-pin` stays `"true"`); revert
and the suite is green. The headless two-direction proofs from plan `300` still
guard the pin arithmetic.

## 7. Landed — measured results

Run on 2026-10-18, this host, a real GPUix window.

| Command | Result |
| ------- | ------ |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/live/run.js` | `16/16`, exit `0`, `live-report.json` |
| `nub apps/playground/dist/smoke/run.js` | `60/60`, exit `0` (unchanged) |

`live-scroller` is 45 checks and the whole contract transfers:

- the mount-time at-end scroll opens at `[50,0,300]` and paints the tail;
- a pinned append follows to `[51,0,300]`;
- a real `400` wheel unpins (`ms-pin=false`), lands on `[37,20,300]` and paints
  the affordance;
- an append while unpinned holds `[37,20,300]`, counts `unread=1`, and the new
  row has no bounds;
- jump-to-latest re-pins at `[52,0,300]` and clears unread;
- two streamed rows grow the last row to `50` and move the anchor to
  `[52,20,300]`, keeping the tail's bottom on the viewport bottom within 1 px;
- the 3-row history sits at `[0,0,300]`, paints every row and offers no jump.

One host fix came out of the run: the automation protocol answers a **retained
but unpainted** element with `AutomationError("NotFound", "Element has no
painted bounds")`, not with a missing locator. `AsyncSmokeHost.bounds` models
"not painted" as `null`, so `live/host.ts` now maps exactly that answer to
`null` and leaves every other failure typed. Without the mapping, step 4 failed
with `host bounds ms-row-62` rather than asserting absence.

Two-direction proof: changing the wheel from `400` to `0` failed `exit 1` at
`the live wheel unpins the reader: expected "false", got "true"`; reverted,
`16/16`, exit `0`.


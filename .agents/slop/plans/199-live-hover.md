# 199 — Hover in a real window: enter/leave and the grace close

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts and the proof in §7) |
| Phase | F (live runtime evidence) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `156`, `159`, `189`, `196` |
| Feeds | `COMPONENTS.md` **Preview Card**, **Navigation Menu**, **Tooltip**; the `hover` host verb, which the live suite has never used |

## 1. Goal

Every hover assertion in this repo is made on the offscreen `TestRenderer`:
`tooltip-open` (plan `159`) and `preview-card` (plan `196`) both use
`SmokeHost.hover`, which calls `nativeSimulateMouseMove`. The live host has a
`hover` verb (`locator.hover()` → `mouse.move`) but **no live scenario has ever
used it**. That leaves the most common pointer interaction in the library
unconfirmed in a real window:

1. does a real `mouse.move` deliver `onMouseEnter` / `onMouseLeave` to a React
   element?
2. is the ordering the same as headless — the card's enter **before** the
   trigger's leave?
3. does the grace-close pattern (a real `setTimeout` cancelled on enter and
   re-checked at fire time) work against a live event stream?
4. can a control inside a **hover-opened** floating card be clicked?
5. is `hover` also delivered per element (the body's leave not firing on a
   child-to-child move) in a live window?

The `preview-card` view (plan `196`) already encodes every readout, so this plan
needs no new view — only a live scenario. If the answer to (1) is no, that is a
precise, evidenced limitation of the automation protocol and the honest
alternative is a documented manual check.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `previewScenario`, add `live-preview`, register it (capability `preview`) |
| `apps/playground/README.md` | live table row; the live-suite count `14 → 15`; the "what it cannot assert" paragraph is unchanged (hover is not style/a11y) |
| `COMPONENTS.md` | capability `preview` row gains `live-preview`; live count `14 → 15`; **Preview Card** notes the live result |
| `TODO.md` | add and tick the task; live counts |
| `PLAN.md` | D43 — hover intent is measured in the window, not only headless |
| `.agents/slop/plans/README.md` | index row; playground block `100–199` |

## 3. The scenario `live-preview`, capability `preview`

View: `previewScenario.view` (the shipped probe). `ready: "preview-trigger"`.
Each `hover` is followed by `settle` (~120 ms); each wait on the 200 ms grace
timer is `Effect.sleep(Duration.millis(300))` — real JS time, exactly as the
headless scenario does.

1. **Closed at rest** — `preview-state` contains `open=false`; `bounds
   ("preview-card")` is `null`.
2. **Hover opens** — `hover("preview-trigger")`; `preview-state` contains
   `open=true` and `last=trigger:enter`; `focused()` is `"none"`.
3. **The card is hoverable** — `hover("preview-card-body")`; sleep 300 ms;
   `preview-state` contains `open=true` and `closes=0`. **The load-bearing
   check**: without the fire-time `inside` check the trigger's leave closes the
   card inside 200 ms.
4. **A control inside the card works** — `click("preview-card-action")`;
   `preview-actions` contains `actions=1`; still `open=true`.
5. **Leaving closes after the delay** — `hover("preview-away")`; sleep 300 ms;
   `preview-state` contains `open=false`, `reason=body`, `closes=1`.
6. **A re-enter inside the delay cancels** — `hover("preview-trigger")`;
   `hover("preview-away")`; `hover("preview-trigger")`; sleep 300 ms;
   `open=true` and `closes` still `1`.
7. **A leave with no return closes** — `hover("preview-away")`; sleep 300 ms;
   `open=false`, `reason=trigger`, `closes=2`.
8. **Record the live event order** — read `preview-order` and `preview-log`
   into the check labels (assert `last=body:enter` after step 3; record whether
   `prev=trigger:leave`, since plan `196` measured that order headless).
9. Screenshot `apps/playground/.artifacts/live/live-preview.png`.

Do not assert the leave payload's coordinate absence live: the readout logs it
(`trigger:leave:none`), and the headless scenario already pins it. If it differs
live, record it in §7 rather than changing the check.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/live/run.js` | `15/15`, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `59/59`, exit `0` (unchanged) |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 5. STOP conditions

- **STOP** if `hover("preview-trigger")` does not open the card (the readout
  stays `open=false`): the automation `mouse.move` does not deliver
  enter/leave to React. Record the readouts and the protocol call; treat hover
  as **unverified live** and keep `preview-card` as the headless evidence. Do
  not replace hover with a click — a tooltip and a preview card open on hover,
  not on press.
- **STOP** if the card opens but the pointer cannot reach the card body
  (`preview-card-body` never gets `body:enter`): record it; it changes the
  preview-card recipe.
- **STOP** if the 300 ms sleep does not let the 200 ms timer fire; the timer is
  real time (plan `196`), so a shorter delay would be indistinguishable.
- **STOP** if the run exits `2` (no window).

## 6. Test plan and two-direction proof

- The scenario is the test: step 3 fails if the grace close is not re-checked at
  fire time; step 5 fails if leaving never closes; step 4 fails if a
  hover-opened card is inert.
- Reverse run: remove the `hover("preview-card-body")` step (so the card closes
  on the trigger's leave) and assert the suite still reports `open=true`; it
  must fail `exit 1`. Revert. Record the exact line.
- A second reverse is optional and cheaper: change step 5's expected
  `reason=body` to `reason=trigger`; must fail. Pick one and record it.

## 7. Landed — measured results

Run on 2026-10-18, this host, the locally built `darwin-x64` 0.10.0 binding.

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/live/run.js` | `15/15`, exit `0`, `preview=verified` |
| `nub apps/playground/dist/smoke/run.js` | `59/59`, exit `0` (unchanged) |

**Hover works live.** A real `mouse.move` to the trigger opens the card; a move
to the card body sets `inside` and the 200 ms timer re-checks it, so the card
stays open past the grace period (`closes=0`); a click on the card's action
runs (`actions=1`) without closing it; leaving closes (`open=false`); a
re-enter inside the delay cancels (`closes=1`); a final leave closes from the
trigger (`closes=2`, `reason=trigger`).

Two measured differences from the headless run:

1. **The close reason after clicking the action is `action`, not `body`.** Enter
   and leave are per element (plan `196`); the pointer's last hovered child was
   the action, so that is the leave that schedules the close. The scenario
   asserts `reason=action` and records the rule.
2. **The card's enter and the trigger's leave arrive in one React batch live**,
   so a readout built from separate `prev`/`last` state collapses them
   (`prev=trigger:enter last=trigger:leave` while `open=true`). The view's
   append-only log keeps both (`body:enter trigger:leave`), and the scenario
   asserts on the log. Headless, the same two events are separated by a frame,
   so `prev`/`last` shows the order.

Two-direction proof: removing the `hover("preview-card-body")` step — so the
trigger's leave closes the card — fails `exit 1` with `the pointer reached the
card: expected a string containing "body:enter", got "trigger:enter"`. Restored,
`15/15`, exit `0`.

Landed note for components: a hover card's close timer may be scheduled by any
hoverable child's leave, not only the body's; the `inside` ref must be set on
every child (already the plan-196 rule), and a multiple-event batch must not be
used to infer order.

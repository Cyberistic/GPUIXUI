# 196 — An interactive hover card: hover intent and a grace close

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §7) |
| Phase | B → C (input/overlay feasibility) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `156`, `159` |
| Feeds | the new `preview` capability; `COMPONENTS.md` **Preview Card**, **Navigation Menu**, **Mention input** |

## 1. Goal

The library's hover surfaces split into two kinds, and only one is measured.
`tooltip-open` (plan `159`) proves a **tooltip**: hover opens it, leave closes it,
and it is not interactive. A **preview card** (a hover card with buttons, a
navigation menu's content panel, or a mention suggestion list the pointer can
enter) needs a different contract that nothing measures:

1. can the pointer enter **floating content** at all — does `hover("...")` on an
   element inside an `<anchored>` layer deliver `onMouseEnter`?
2. in what order do the trigger's leave and the card's enter arrive?
3. does a card survive the trigger's leave when its **enter cancels a delayed
   close** (the standard hover-intent rule), with a **real** JS timer?
4. does a re-enter within the delay cancel the close?
5. does a click on the card's own control work while it was opened by hover?
6. do ancestors receive enter/leave when the pointer is over a child (so a card
   root can own the grace area)?
7. does the leave event carry `x`/`y` (a bounds-based intent check would not
   need a timer at all)?

The answer decides whether Preview Card / Navigation Menu can be interactive
(`div` + timer) or must be non-interactive like a tooltip.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/preview.tsx` | **new** — the `preview-card` scenario |
| `apps/playground/src/scenarios/index.ts` | import + register; add `"preview"` to `PROBE_CAPABILITIES` |
| `packages/testing/src/smoke.ts` | add `"preview"` to `CAPABILITIES` |
| `apps/playground/README.md` | a scenario section with the measured table |
| `COMPONENTS.md` | capability table row `preview`; the **Preview Card** row gains the measured contract; suite count `57 → 58` |
| `TODO.md` | add and tick the task |
| `PLAN.md` | D40 — a hover card is interactive only with a delayed close |
| `.agents/slop/plans/README.md` | index row; playground block is now `100–196` |

## 3. The scenario `preview-card`, capability `preview`

View: a 720 × 420 app root (themed). A trigger `preview-trigger` (a
`Pressable`-style `div`, not focused by hover). When open, a
`FloatingLayer` + `<anchored side="bottom" align="start" sideOffset={8}>` renders
the card `preview-card`:

- root `preview-card`, `role="dialog"`, `aria-label="Preview card"` — its
  `onMouseEnter`/`onMouseLeave` only increment `rootIn`/`rootOut` (an observation
  of ancestor delivery, never the grace logic);
- a header with a **control** `preview-card-action` (`Pressable`, increments
  `actions`);
- a hover area `preview-card-body` filling the rest, carrying the real
  `onMouseEnter` → **cancel** any pending close, keep open, log
  `body:enter`; `onMouseLeave` → schedule a close (120 ms) and log
  `body:leave`.

The trigger: `onMouseEnter` → cancel any pending close, open, log
`trigger:enter`; `onMouseLeave` → schedule a close (120 ms), log
`trigger:leave`, with the event's coordinate availability appended
(`trigger:leave:xy` when `x`/`y` are numbers, `:none` otherwise).

The close timer: a real `setTimeout` (`CLOSE_DELAY = 120`) kept in a ref,
cleared by any enter and on unmount. It sets `open=false`, `closes += 1`,
`reason = "trigger" | "body"`.

A neutral box `preview-away` at the bottom-right moves the pointer out.

Readouts:

- `preview-state` = `open=<bool> closes=<n> reason=<last reason>`;
- `preview-order` = `prev=<event> last=<event>` (the last two trigger/body
  events, so an event order is assertable without a growing log);
- `preview-root` = `in=<n> out=<n>` (ancestor delivery counts);
- `preview-actions` = `actions=<n>`;
- `preview-log` = `trigger:enter trigger:leave:xy body:enter …`.

Steps (each gesture followed by `Effect.sleep("250 millis")` where the 120 ms
timer must have fired; the smoke steps run on the real clock, as
`toast-lifecycle` established):

1. **Closed at rest** — `preview-state` contains `open=false`; `bounds` of
   `preview-card` is absent; `focused()` is `"none"` (a hover must not focus).
2. **Hover opens** — `hover("preview-trigger")`; `preview-state` contains
   `open=true`; `preview-order` contains `last=trigger:enter`; focus is still
   `"none"`.
3. **The card is hoverable and cancels the delayed close** — `hover(
   "preview-card-body")`; sleep 250 ms; `preview-state` contains `open=true`
   and `closes=0`. This is the decisive check: without cancel-on-enter the
   trigger's leave closes the card inside 120 ms.
4. **Event order** — `preview-order` contains `last=body:enter`. **Record** whether
   `prev=trigger:leave`. `FloatingLayer` renders **inside** its anchor (plan
   `156`), so the card is a descendant of the trigger: a DOM-like hover model
   would not deliver the trigger's leave at all. Both orders are acceptable
   outcomes; the open check in step 3 is what must hold. Do not reverse an
   assertion to make a mechanism pass.
5. **Ancestor delivery** — read `preview-root`; record whether `in` is `1` or
   `0`. This is an **observation**, not a pass/fail: it says whether a card root
   can own the grace area or every child needs the handlers.
6. **The card is interactive** — `click("preview-card-action")`; `settle`;
   `preview-actions` contains `actions=1`; `preview-state` still
   `open=true`.
7. **Leaving the card closes after the delay** — `hover("preview-away")`; sleep
   250 ms; `preview-state` contains `open=false`, `reason=body`, `closes=1`.
8. **Re-enter within the delay cancels** — `hover("preview-trigger")`;
   `hover("preview-away")` (schedules); `hover("preview-trigger")` (cancels);
   sleep 250 ms; `open=true` and `closes` still `1`.
9. **Leaving the trigger with no return closes** — `hover("preview-away")`;
   sleep 250 ms; `open=false`, `reason=trigger`, `closes=2`.
10. **The leave payload** — `preview-log` contains `trigger:leave:none`
    (measured; the event carries no coordinates). Asserted, so a runtime change
    fails the check.
11. Screenshot `apps/playground/.artifacts/screenshots/preview-card.png`.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground test` | 10 files, 73 tests (unchanged) |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js --only preview-card` | exit `0`, the new checks pass |
| `nub apps/playground/dist/smoke/run.js` | `58/58`, exit `0` |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 5. STOP conditions

- **STOP** if `hover("preview-card-body")` does not move the pointer into the
  floating layer (the readout stays `last=trigger:enter`). Record the delivered
  events; do not move the card out of `<anchored>` to make it hittable.
- **STOP** if the trigger's leave and the body's enter never both arrive; record
  what did and treat an interactive hover card as unsupported with evidence.
- **STOP** if a 250 ms sleep does not let the 120 ms timer fire (the timer is
  real time, as `toast-lifecycle` measured); record it rather than shortening
  the delay to a value the clock cannot distinguish.
- **STOP** if the run exits `2`.

## 6. Test plan

- The scenario is the test: a card that closes synchronously on the trigger's
  leave fails step 3; one that never closes fails step 7; one that cannot be
  clicked fails step 6.
- Reverse run: remove the `cancel()` from the body's `onMouseEnter`; step 3 must
  fail `open=false` and exit `1`. Record the text.
- The headless suite must stay otherwise green (`57 → 58`).

## 7. Measured results

Run on this host (Intel macOS, locally built `@gpuix/native@0.10.0`, ADR 0003),
2026-10-18.

**An interactive hover card is feasible.** `preview-card` records **18
checks**; the suite is `58/58`, exit `0`:

- hovering the trigger opens the card and does **not** move native focus;
- moving the pointer onto the card body, then waiting 300 ms, leaves it
  `open=true closes=0` — the grace close is cancelled;
- the order readout is `prev=body:enter` with `last=trigger:leave`: the card's
  enter is delivered **before** the trigger's leave;
- the leave payload is `trigger:leave:none` — **no coordinates**;
- clicking the card's control runs it (`actions=1`) and the card stays open;
- leaving the card closes it after the 200 ms delay (`closes=1`), and leaving
  the trigger closes it with `reason=trigger` (`closes=2`);
- a re-enter inside the delay keeps it open and does not count a close;
- ancestor delivery: the card root counted `in=1 out=1`; a child-to-child move
  from the body to the control delivered the root's leave, so the root cannot
  own the grace area, and the control needed its **own** leave handler (without
  it the close never scheduled when the pointer left the control).

The mechanism that works: on any leave, cancel and schedule a 200 ms close; the
timer **re-checks an `inside` ref at fire time**. Cancelling on enter alone is
insufficient because the trigger's leave arrives after the enter. The timer is
real JS time — the steps need `Effect.sleep("300 millis")` **and**
`ctx.host.advance(0)` before the readout changes, the same rule as
`toast-lifecycle`.

**Reverse run:** deleting the `if (inside.current) return;` check makes the card
close the moment the pointer reaches it:
`the pointer enters the card and the grace close is cancelled: expected a string
containing "open=true", got "open=false closes=1 reason=trigger"` — exit `1`.
Restored and re-ran green.

Screenshot: `apps/playground/.artifacts/screenshots/preview-card.png`.

## 8. Acceptance

- `preview-card` is green, the suite is `58/58`, the reverse run is recorded,
  and the ancestor-delivery and leave-coordinate observations are written down.
- README, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the index state the result.
- All completion gates in `AGENTS.md` §7 pass.

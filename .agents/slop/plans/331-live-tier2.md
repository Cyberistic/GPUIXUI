# Plan 331 — the shipped Tier 2 components in a real window

**Workstream:** playground (`apps/playground`).
**Phase:** F (integration evidence).
**Depends on:** plan `330` (headless `tier2-*`, green), plans `189`–`193`
(the live runner and its verbs).
**Number:** `330` is the last playground plan; this takes `331`.

---

## 1. Why

Plan `330` proved the shipped Tier 2 components through the offscreen
`TestRenderer`. The live suite exists because the offscreen renderer and a real
window have already differed twice (exit callbacks firing twice, hover events
batching differently). A dialog that traps focus headlessly but not in a window
would be a broken component, so the consumer path needs the same confirmation
the Tier 1 `live-primitives` probe gives.

Scope is deliberately narrow: the draw, the focus move, the dismissal and the
timer path — not a second copy of every headless check. **No new capability**:
the three scenarios report `tier2`, which is already `verified` headless.

## 2. What is measured

Three live scenarios, each reusing the headless view from plan `330`:

| id | view | contract |
| -- | ---- | -------- |
| `live-tier2-dialog` | `tier2DialogScenario.view` | trigger opens; the surface is centred within 2 px of the window; focus is `dialog-content`; Tab moves focus and it stays inside; Escape closes and returns focus to `dialog-open`; ConfirmDialog is Cancel-first; Enter cancels; confirm reports once and leaves it open |
| `live-tier2-menu` | `tier2MenuScenario.view` | click opens; the surface takes focus; Down lands on `menu-rename`; Enter activates once and returns focus; the disabled row is skipped; a right click opens the context menu within 12 px; Escape closes |
| `live-tier2-toast` | `tier2ToastScenario.view` | a push paints a 380 px card inset 16 px; the action runs once and dismisses; two cards stack oldest-above-newest; a 300 ms duration dismisses itself (bounded real-time wait) |

Expected: **≥ 30 checks**, live `16 → 19`, exit `0`, three screenshots.

## 3. Files

Change only:

- `apps/playground/src/live/scenarios.tsx` — import the three headless views,
  add the three `LiveScenario` constants, append them to `liveScenarios`.
- `TODO.md` — tick the live row and update the live count.
- `COMPONENTS.md` — extend the Tier 2 composition paragraph with the live run.
- `.agents/slop/plans/README.md` — index this plan.

Do **not** touch the headless scenarios: their views are the fixture.

## 4. Prerequisites

```sh
nub run --filter playground build        # plan 330's vendor step runs here
nub apps/playground/dist/live/run.js     # the live runner; exit 2 means no window
```

Expected: the existing 16 live scenarios pass, exit `0`. If the runner exits `2`
(no desktop session), **STOP** — record that the host cannot open a window and
do not claim a live verdict. Do not fabricate evidence from the headless suite.

## 5. Implementation

Each scenario follows the existing shape exactly (see `overlay`, `primitives`):

```ts
const tier2Dialog: LiveScenario = {
  id: "live-tier2-dialog",
  title: "Live Tier 2: the shipped Dialog and ConfirmDialog",
  capability: "tier2",
  view: tier2DialogScenario.view,
  ready: "dialog-open",
  steps: (ctx) => Effect.gen(function* () {
    // click → waitFor → settle → text/bounds/focused → assert
  }),
};
```

Rules the live runner already established and this plan reuses:

- `settle` after every input; the protocol has no frame boundary.
- `ctx.host.waitFor("dialog-content")` after the open click, then `settle`.
- `ctx.host.focused()` (plan `190`) for focus assertions, `ctx.host.bounds` for
  geometry, `ctx.host.rightClick` for the context menu.
- The window is `1100 × 720` (`WINDOW`), so the dialog centre is `550, 360`.
- A real JS timer cannot be frozen; wait for it with a bounded poll:

```ts
const waitForCount = (ctx: LiveContext, count: number) =>
  ctx.host
    .text("tier2-toast-readout")
    .pipe(
      Effect.flatMap((text) =>
        text !== null && Str.includes(`count=${count}`)(text)
          ? Effect.void
          : Effect.fail("not yet"),
      ),
      Effect.retry(Schedule.spaced("100 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      )),
      Effect.orElseSucceed(() => undefined),
    );
```

The following assertion still reports the measured readout, so a timeout fails
readably rather than passing.

For the dialog's Tab containment, reuse a small `walk`-style loop over
`ctx.host.key("tab")` with the same `FOCUSABLE` list the headless scenario
exports **if** it is exported; otherwise keep the list local to the live file
(do not reach into scenario internals for a constant that is not public).

Screenshots: `${LIVE_ARTIFACTS}/${scenario.id}.png`, as every other live
scenario does.

## 6. Test plan

1. `nub run --filter playground check-types` — green.
2. `nub run --filter playground build && nub apps/playground/dist/live/run.js`
   — exit `0`, `19/19` live scenarios, three new screenshots.
3. **Two-direction proof**, one per scenario, reverted afterwards:
   - dialog: `dismissible={false}` in the view (edit the headless view
     temporarily, then restore) → Escape check fails;
   - menu: remove `disabled` from the Archive row → the skip check fails;
   - toast: `style={{ right: 4 }}` on the viewport → the inset check fails.
   These are the same mutations plan `330` §8 used headlessly; a live failure is
   the evidence that the live checks are live.
4. Repeat the full live run twice; both exit `0`.

## 7. STOP conditions

- The runner exits `2`: no window on this host. Record it and stop.
- A component defect appears only live (the headless run is green). Record the
  exact failing check and a `TODO.md` cross-team row; do not weaken the check or
  edit `packages/components/**`.
- The live automation protocol cannot address a part (`NotFound` where the
  headless test saw it): inspect `AsyncSmokeHost.bounds`' `null` mapping first
  (plan `301`), then record the limitation if it is real.

## 8. Result — measured on this host (2026-10-18)

Landed on the first run. Live suite **16 → 19**, exit `0`, `tier2=verified`,
60 checks (`live-tier2-dialog` 24, `live-tier2-menu` 15,
`live-tier2-toast` 21) and three real-window screenshots.

What the window confirmed beyond the headless run:

- the dialog centre is within 2 px of `550, 360` in an `1100 × 720` window, and
  the Tab trap keeps native focus inside across five presses;
- the shipped menu surface takes focus (`menu-content`), the disabled row is
  skipped by native focus, and the context menu lands within 12 px of the
  element-centre right click;
- the toast viewport insets by **16** px in a window too, the 300 ms timer
  dismisses on real time, and Escape leaves the stack alone.

Mutation proofs (full live run each time, exit `1`, then reverted):

- M1 `dismissible={false}` → `Escape closed the dialog: expected "open=false",
  got "open=true saves=0 confirm=false confirms=0"` (`18/19`, `tier2=failed`).
- M2 Archive row enabled → `the second arrow skipped the disabled row: expected
  "menu-delete", got "menu-archive"`.
- M3 `style={{ right: 4 }}` on the viewport → `the card is inset from the right:
  expected 16 ± 1, got 4`.

Two consecutive full live runs after the revert: both `19/19`, exit `0`. The
scroller and toast probes now wait on the readout or list anchor before each
assertion instead of relying on a fixed settle; a timeout still falls through to
the assertion, which fails with the measured value. This removed the
load-sensitive flakes without weakening a check.

**One live run at a time.** A run that overlapped a second live process failed
one `waitFor("toast-action")` after its timeout while the other process owned the
native window; the same build then passed twice in isolation. A live verdict
requires no concurrent run — the same rule the components package applies to
`createTestRoot`.

Headless gate after the same hardening: **64/64**, exit `0`. The load-sensitive
`toast-lifecycle` exit assertion now registers the frozen exit with
`fastForwardMotion(0)` before the real timer can remove its card.

## 9. Acceptance

- [x] `live-tier2-dialog`, `live-tier2-menu`, `live-tier2-toast` are registered
      and reuse the plan-330 views.
- [x] Live suite `19/19`, exit `0`, with three screenshots.
- [x] One live mutation proof per scenario recorded in this plan's result
      section.
- [x] `check-types`, `nub run check` and the headless `64/64` stay green.
- [x] `TODO.md`, `COMPONENTS.md` and the plan index updated.

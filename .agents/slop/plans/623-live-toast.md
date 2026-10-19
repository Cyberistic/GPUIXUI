# 623 — The toast viewport in a real window: layering, hit-testing and focus

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground |
| Depends on | `183` (`toast-lifecycle`, the headless probe), `189`/`190` (the live host), `330`/`331` (the shipped Tier 2 toast), `192` (the live motion clock), `597` (the frozen-exit rule) |
| Amends | `183` §7 (the live half), `COMPONENTS.md` Toast |

## 1. Goal

`toast` is one of the last registry capabilities with **only** `TestRenderer`
evidence. The headless `toast-lifecycle` probe measured five mechanisms a toast
viewport depends on (plan `183` §7):

1. `position: "absolute"` with `right`/`bottom` resolves exactly (24 px insets);
2. the bottom-anchored stack grows upward with an 8 px gap;
3. the viewport's `pointerEvents: "none"` lets a page control **under its empty
   strip** take a click, while a painted card is still hit;
4. paint order is the only stacking model (no `zIndex`), so the viewport must be
   the app root's **last** child and must cover the page below a card;
5. a toast never steals focus, its dismiss is one Tab stop away, and a per-toast
   JS timer removes only its own card.

`live-tier2-toast` (plan `331`) already proves the **shipped** provider in the
1100 × 720 window: the 16 px insets, the 378 px card, one action, stack order
and a real 300 ms timer. It does **not** prove (3) or (4), because the shipped
viewport has no page control under its strip and no overlapping surface to
count. Those two mechanisms are exactly the ones a consumer application relies
on when it puts a floating viewport over its own content.

This plan adds `live-toast`: the same `toast-lifecycle` view, driven in the real
window, proving the layering contract and the focus contract that remain
headless-only. It does **not** re-prove the shipped provider (that is
`live-tier2-toast`) and it does **not** claim colour or a11y — the live tree has
no style and `GpuixRenderer` has no a11y method (plan `197`).

## 2. What is already known

- The view `apps/playground/src/scenarios/toast.tsx` (`toast-lifecycle`) is
  window-sized: `toast-root` is `width: window.width`, `height: window.height`,
  so in the live window its reported box is `1100 × 720` (the same shape
  `live-floating` asserts on `float-window`, plan `594`).
- The probe's page controls are addressable: `toast-show`, `toast-show-short`,
  `toast-clear`, `toast-action`, `toast-field`; the cards are `toast-<id>` with
  `toast-dismiss-<id>`; the readout is `toast-readout` and reports
  `count=… action=… behind=… under=… dismissed=… hover=…`.
- Two overlapping surfaces make the layering claim measurable:
  `toast-behind` (under the card, same box) and `toast-under` (inside the
  viewport's empty strip, left of the cards).
- The live host exposes every verb the twin needs: `bounds`, `text`,
  `paintedText`, `click`, `hover`, `key`, `focused`, `focusNext`, `waitFor`,
  `pauseMotion`, `fastForwardMotion`, `screenshot` (plan `189`/`190`/`192`).
- The live motion clock is real: `pauseMotion()` then
  `fastForwardMotion(ms)` drives a tween exactly, and a synchronous click
  dismissal is the only deterministic frozen-exit observation point
  (plans `192`, `336`, `597`).
- The 0.10.0 box contract: a card's content box is its content origin, and its
  width excludes its 1 px borders but keeps the padding offset. The headless
  probe measured the card's right inset as `INSET + 9 = 33` and its bottom inset
  as `INSET + 17 = 41`, at a content width of `378` (plan `529` §6.3, plan
  `183` §7). Copy those measured numbers; do not re-derive them.

## 3. Files to create or change

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | Import `toastScenario` from `../scenarios/toast.js`; add `const liveToast: LiveScenario` (`id: "live-toast"`, `capability: "toast"`, `view: toastScenario.view`, `ready: "toast-root"`); register it in `liveScenarios` after `tier2Toast` (next to the other Tier 2 twins). |
| `.agents/slop/plans/623-live-toast.md` | **This file.** |
| `.agents/slop/plans/README.md` | Index this plan; note that `621`/`622` were claimed by the tokens workstream first, so this takes `623`. |
| `apps/playground/README.md` | Extend the "real window" section with the toast layering evidence (pointer-transparent strip, card covers the page, focus not stolen). |
| `COMPONENTS.md` | **Toast** row / capability line: add `live-toast` next to `toast-lifecycle` and state what the window adds. |
| `PLAN.md` | New decision row: the toast viewport's layering and focus contract is a real-window property; the frozen exit is asserted on a synchronous dismissal only. |
| `TODO.md` | Add the task under the Playground workstream and tick it when the gates pass; keep the progress bar at `104/104` plans-and-harness. |

Do **not** change `apps/playground/src/scenarios/toast.tsx` for the happy path.
The live twin reuses the headless view unchanged, so a failing live check is a
runtime difference, not a view redesign. The only edits to that file are the
temporary mutation proofs in §6, which must be reverted.

Do **not** touch `packages/primitives`, `packages/components`, `apps/docs` or
the bindings. This probe needs no production code and no new host verb.

## 4. Implementation

### 4.1 The scenario

Add next to `liveTier2Toast` in `apps/playground/src/live/scenarios.tsx`:

```ts
/**
 * `live-toast` — the toast viewport's layering and focus contract in a window.
 *
 * `live-tier2-toast` proves the shipped provider's insets and timer. This twin
 * proves the mechanisms underneath it that only the local probe can isolate:
 * a `pointerEvents: "none"` strip lets a page control take the click, a painted
 * card covers the page below it, and a toast never steals focus.
 */
const liveToast: LiveScenario = {
  id: "live-toast",
  title: "Live toast viewport: layering, hit-testing and focus",
  capability: "toast",
  view: toastScenario.view,
  ready: "toast-root",
  steps: (ctx) => Effect.gen(function* () {
    // The exit tween is driven by the clock, never by a race with a paint.
    yield* ctx.host.pauseMotion();

    yield* waitForBounds(
      ctx,
      "toast-root",
      (box) =>
        Math.abs(box.width - WINDOW.width) <= 1 &&
        Math.abs(box.height - WINDOW.height) <= 1,
    );
    const frame = yield* boxOf(ctx, "toast-root");
    yield* ctx.expectNear("the live probe takes the window width", frame.width, WINDOW.width, 1);
    yield* ctx.expectNear("the live probe takes the window height", frame.height, WINDOW.height, 1);
    yield* waitForText(ctx, "toast-readout", "count=0");

    // One card: right/bottom placement and the 0.10.0 content box.
    yield* ctx.host.click("toast-show");
    yield* ctx.host.waitFor("toast-1");
    yield* settle;
    const first = yield* boxOf(ctx, "toast-1");
    yield* ctx.expectNear(
      "the card's content is inset from the right",
      frame.x + frame.width - (first.x + first.width),
      INSET + 9,
      1,
    );
    yield* ctx.expectNear(
      "the card's content is inset from the bottom",
      frame.y + frame.height - (first.y + first.height),
      INSET + 17,
      1,
    );
    yield* ctx.expectNear("the card keeps its fixed content width", first.width, CARD_WIDTH - 2, 1);
    yield* ctx.expectContains("the card paints its title", yield* textOf(ctx, "toast-1"), "Toast 1");

    // Two cards: the stack grows upward with one gap, the newest owns the inset.
    yield* ctx.host.click("toast-show");
    yield* ctx.host.waitFor("toast-2");
    yield* settle;
    const firstLifted = yield* boxOf(ctx, "toast-1");
    const second = yield* boxOf(ctx, "toast-2");
    yield* ctx.expectNear(
      "the second card sits one gap above the first",
      second.y - (firstLifted.y + CARD_HEIGHT),
      GAP,
      1,
    );
    yield* ctx.expectNear(
      "the newest card owns the bottom inset",
      frame.y + frame.height - (second.y + second.height),
      INSET + 17,
      1,
    );

    // Three cards, then the two hit-testing claims. `toast-under` lives inside
    // the viewport's painted strip but left of the cards: `pointerEvents: "none"`
    // is what lets the click through, live.
    yield* ctx.host.click("toast-show");
    yield* ctx.host.waitFor("toast-3");
    yield* settle;
    yield* ctx.host.click("toast-under");
    yield* settle;
    yield* ctx.expectContains(
      "the viewport's empty strip does not block the page",
      yield* textOf(ctx, "toast-readout"),
      "under=1",
    );
    yield* ctx.host.click("toast-action");
    yield* settle;
    yield* ctx.expectContains(
      "a click beside the stack reaches the page",
      yield* textOf(ctx, "toast-readout"),
      "action=1",
    );

    // A painted card owns its box: the surface below it never sees the click.
    yield* ctx.host.click("toast-2");
    yield* settle;
    yield* ctx.expectContains(
      "the page under a card never sees the click",
      yield* textOf(ctx, "toast-readout"),
      "behind=0",
    );

    // Dismiss through the card's own control: a real click, a frozen exit, then
    // one clock jump. This is the only deterministic place for the exit claim
    // (a timer racing a paint is not; plans 336/597).
    yield* ctx.host.click("toast-dismiss-3");
    yield* settle;
    yield* ctx.expectContains(
      "dismissing removes exactly the clicked card",
      yield* textOf(ctx, "toast-readout"),
      "count=2",
    );
    yield* ctx.expectContains(
      "the dismiss click did not reach the page below",
      yield* textOf(ctx, "toast-readout"),
      "behind=0",
    );
    yield* ctx.expectSome(
      "the dismissed card is still laid out while its exit is frozen",
      Option.fromNullishOr(yield* ctx.host.bounds("toast-3")),
    );
    yield* ctx.host.fastForwardMotion(EXIT_MS);
    yield* settle;
    yield* ctx.expectEqual(
      "the dismissed card left the tree after its exit",
      (yield* ctx.host.bounds("toast-3")) === null,
      true,
    );
    const oneAfter = yield* boxOf(ctx, "toast-1");
    const twoAfter = yield* boxOf(ctx, "toast-2");
    yield* ctx.expectNear(
      "the survivors reflow with the same gap",
      twoAfter.y - (oneAfter.y + CARD_HEIGHT),
      GAP,
      1,
    );

    // Focus: the field keeps focus when its submit pushes a toast, and that
    // toast's dismiss is the next Tab stop.
    yield* ctx.host.click("toast-field");
    yield* waitForFocus(ctx, "toast-field");
    yield* ctx.host.key("enter");
    yield* waitForText(ctx, "toast-readout", "count=3");
    yield* ctx.expectEqual(
      "showing a toast does not steal focus",
      yield* focusedOf(ctx),
      "toast-field",
    );
    yield* ctx.host.focusNext();
    yield* settle;
    yield* ctx.expectContains(
      "Tab reaches a toast dismiss control",
      yield* focusedOf(ctx),
      "toast-dismiss-",
    );
    yield* ctx.host.key("escape");
    yield* settle;
    yield* ctx.expectContains(
      "Escape leaves the stack alone",
      yield* textOf(ctx, "toast-readout"),
      "count=3",
    );

    // Hover is per element and crosses the pointerEvents chain.
    yield* ctx.host.hover("toast-4");
    yield* waitForText(ctx, "toast-readout", "hover=4");
    yield* ctx.host.hover("toast-field");
    yield* waitForText(ctx, "toast-readout", "hover=none");

    // A real timer removes only its own card. Freeze the clock and name both
    // cards before the 250 ms timer starts.
    yield* ctx.host.click("toast-clear");
    yield* waitForText(ctx, "toast-readout", "count=0");
    yield* ctx.host.click("toast-show");
    yield* ctx.host.waitFor("toast-5");
    yield* ctx.host.click("toast-show-short");
    yield* ctx.host.waitFor("toast-6");
    yield* waitForText(ctx, "toast-readout", "dismissed=Short");
    yield* ctx.expectContains(
      "only the long toast remains queued",
      yield* textOf(ctx, "toast-readout"),
      "count=1",
    );
    yield* ctx.expectSome(
      "the long toast survived its sibling's timer",
      Option.fromNullishOr(yield* ctx.host.bounds("toast-5")),
    );
    yield* ctx.host.fastForwardMotion(0);
    yield* ctx.host.fastForwardMotion(EXIT_MS + 1);
    yield* settle;
    yield* ctx.expectEqual(
      "the short toast leaves the layout after its exit",
      (yield* ctx.host.bounds("toast-6")) === null,
      true,
    );
    const survivor = yield* boxOf(ctx, "toast-5");
    yield* ctx.expectNear(
      "the survivor reflows to the bottom inset",
      frame.y + frame.height - (survivor.y + survivor.height),
      INSET + 17,
      1,
    );

    yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveToast.id}.png`);
  }),
};
```

The constants already live in `apps/playground/src/scenarios/toast.tsx` but are
not exported. Either export them (`CARD_WIDTH`, `CARD_HEIGHT`, `GAP`, `INSET`,
`EXIT_MS`) and import them, or declare the same names at the top of the live
scenario. **Prefer exporting the constants** from `toast.tsx` so the headless
and live checks cannot drift; keeps one source of truth. Exporting a constant
is not a behaviour change, so the headless suite must stay green unchanged.

### 4.2 The id sequence

The probe's `seq` is monotonic, so the ids depend on every push before it:

| Step | Push / dismiss | Live ids |
| ---- | -------------- | -------- |
| first three cards | `show` ×3 | `toast-1`, `toast-2`, `toast-3` |
| dismiss | `toast-dismiss-3` | survivors `toast-1`, `toast-2` |
| submit in the field | `enter` → `onSubmit` | `toast-4` |
| clear | `toast-clear` | none |
| long then short | `show`, `show-short` | `toast-5`, `toast-6` |

If the live ids do not line up, **STOP** (§7): the view's state changed and the
twin's assertions must be re-derived from the headless sequence, not guessed.

## 5. Commands and expected results

Run from the repo root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground build` | exit `0`; `dist/live/run.js` rebuilt |
| `nub apps/playground/dist/smoke/run.js --only toast-lifecycle` | `1/1`, exit `0`; the headless control is unchanged |
| `nub apps/playground/dist/live/run.js --only live-toast` | **first run**: `1/1`, exit `0`; if a layout number differs, STOP (§7) |
| `nub apps/playground/dist/live/run.js --only live-toast` (again) | `1/1`, exit `0` — stable |
| `nub run --filter playground test` | all package tests pass |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` |
| `nub apps/playground/dist/smoke/run.js` | the full headless suite (a bare command has no `--all`), `104/104`, exit `0` |
| `nub apps/playground/dist/live/run.js --only live-tier2-toast,live-toast` | both green; the shipped provider and the local viewport agree about the window |

While iterating, run only the two focused ids above. The full headless suite is
the end-of-task check. The **full live suite is the merge gate**: run it only if
this plan's head is the promotion candidate; otherwise record that it was not
run and why.

## 6. Test plan and two directions

**The live scenario is the test.** There is no new pure helper, so no new unit
test is justified. Every check names its own failure.

**Direction one (the claim holds).** `--only live-toast` is green twice in a
row; the focused headless control `toast-lifecycle` is green.

**Direction two (each claim is load-bearing).** Observe each mutation failing,
then revert it:

| Mutation | Expected failure |
| -------- | ---------------- |
| Remove `pointerEvents: "none"` from the viewport | `the viewport's empty strip does not block the page: expected "under=1", got "under=0"` (also fails the headless `toast-lifecycle`, which is the control) |
| Render `toast-viewport` **before** `toast-behind` | a click on `toast-2` reaches the page: `behind=1` instead of `0`, or the card's dismiss is unreachable |
| Remove `pointerEvents: "auto"` from a card | the card no longer takes its own click; the dismiss miss fails the count check |
| Drop the frozen assertion by passing `EXIT_MS` before reading bounds | `the dismissed card is still laid out while its exit is frozen` fails |
| Change `INSET` `24 → 16` (only in the probe view) | the two inset checks fail at `33`/`41` |

Record every observed message in §9, then run the twin again green.

**No-op guard.** If the card's own click (`toast-2`) misses because the
locator's centre lands on a text child, do **not** delete the paint-order
check; click the card's dismiss control's parent instead, or use
`clickWindow` at the card's centre. The claim is that the surface below never
sees the click, not that a particular coordinate is special.

## 7. STOP conditions

- **The live window's card geometry differs from the headless measurement**
  (right inset not `33 ± 1`, bottom not `41 ± 1`, width not `378 ± 1`). STOP:
  do not adjust the expected numbers to whatever the window reports. Record the
  live numbers and investigate whether the view's `useWindowSize` root behaves
  differently live; the plan built on plan `529`'s measured box.
- **A click on `toast-under` reaches nothing** even with
  `pointerEvents: "none"` on the viewport. STOP: the strip's transparent hit
  path is not a window property. Record it as a live limitation and assert the
  measured behaviour, exactly as plan `597` did for the timer exit.
- **The frozen exit is not observable live** (the card is gone before
  `fastForwardMotion`). STOP: keep the survivor/timer checks and record the
  exit as headless-only with the measurement; do not weaken it into a
  tautology.
- **The id sequence differs** from §4.2. STOP and re-derive from the headless
  steps; do not rename ids in the view.
- **Any step needs a change to `packages/**` production code or a new host
  verb.** STOP; this probe needs neither.
- The live view does not fit the window or `toast-root` never commits. STOP.

## 8. Acceptance

- `live-toast` is registered with capability `toast`; the live registry grows
  `88 → 89`, the headless registry is unchanged at `104`.
- The window proves: the pointer-transparent strip, a card covering the page,
  a self-timer that removes only its own card, a toast that does not steal
  focus, and a Tab-reachable dismiss control.
- `COMPONENTS.md`'s toast row cites the new id; the README and `PLAN.md`
  record the claim and the frozen-exit rule.
- `nub run check`, `nub run lint`, `nub run test` pass; focused headless and
  live runs exit `0`; the full headless suite exits `0`.
- `TODO.md` carries the task, ticked, with the exact ids run and the mutation
  proofs.

## 9. Measured (2026-10-19, `darwin-x64` release-tag binding)

**The layering contract transfers to a real window.** `live-toast` is **38
checks**, green twice focused after the reverts. The window-sized probe reports
`1100 × 720`; the card's content inset is **33 px** from the right and **41 px**
from the bottom at a content width of **378 px** — every number is identical to
the headless `toast-lifecycle` (plan `183` §7, plan `529` §6.3), so the 0.10.0
box contract needs no live correction.

**The two hit-testing claims are live.**
- The viewport's `pointerEvents: "none"` strip covers `toast-under` and the
  click still reaches it (`under=1`) — the page control under a painted strip
  is usable in a window.
- A painted card owns its box: the dismiss click runs (`count=3 → 2`) and the
  surface below never sees it (`behind=0`).

**Focus is not stolen.** Submitting from `toast-field` pushes `toast-4`,
`focused()` still answers `toast-field`, and `focusNext()` lands on a
`toast-dismiss-*` control. Escape leaves the stack at `count=3`.

**The exit is a clock property.** Dismissing `toast-3` by its own control leaves
it laid out while the clock is paused; one `fastForwardMotion(EXIT_MS)` step
plus a `settle` removes it, and the survivors reflow with the 8 px gap. A real
250 ms timer removes `toast-6` only, leaving `toast-5` at the bottom inset. The
timer path asserts only timer-observable facts, never the frozen frame
(plans `336`, `597`).

**Mutation proofs (observed failing, then reverted).**

| Mutation | Result |
| -------- | ------ |
| Viewport `pointerEvents: "none"` removed | `the viewport's empty strip does not block the page: expected a string containing "under=1", got "… under=0 …"` |
| `toast-behind` rendered **after** the viewport | `dismissing removes exactly the clicked card: expected a string containing "count=2", got "count=3 … behind=1 …"` |
| A clock jump (plus `settle`) before the frozen read | `the dismissed card is still laid out while its exit is frozen: expected a value, got none` |
| Viewport `right: INSET` → `INSET + 8` | `the card's content is inset from the right: expected 33 ± 1, got 41` |

**Null results (measured, then reverted).**

- Removing the card's own `pointerEvents: "auto"` changes **nothing** in either
  harness: a child of the `none` viewport is still hit by default in 0.10.0.
  The prop stays as an explicit statement of intent, but it is not load-bearing.
- A clock jump without a following `settle` still reports the card as laid out,
  so the absence read needs the commit — the jump alone is not a frame. This is
  a harness fact, not a weaker exit claim.
- Changing `INSET` alone would not fail either suite because both expectations
  derive from the shared constant; the right-edge mutation above is the honest
  proof.

**Focused ids run:** `live-toast` (twice), `toast-lifecycle`; then the full
headless suite and `nub run check` / `lint` / `test` as the end-of-task check.
The **full live suite was not run** (merge/release gate).

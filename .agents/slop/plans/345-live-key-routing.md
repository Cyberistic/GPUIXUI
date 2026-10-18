# 345 — Live key routing: the focused element, its ancestors and the window

**Status:** planned · **Phase:** B/F · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `140`, `176`, `189`, `190`, `344`.

## 1. Why this plan exists

Plan `344`'s live Tier 2 catalogue surfaced a difference the offscreen
`TestRenderer` hides:

- a key reaches the **focused element** (a probe counter on a List row fired
  while the row held native focus), but
- the **List root's** `onKeyDown` never ran, so `Down` did not move focus;
- a live click focused a Tabs trigger natively but did not run React's
  `onFocus`, so the tab's roving `active` stayed empty and an arrow started from
  the first tab.

That is too important to leave as an inference from two component views. Every
interactive component in the library either (a) puts a key handler on the
focusable element, (b) relies on a handler on an ancestor, or (c) uses the
app-level window handler. This plan measures the three paths directly, in one
real window, and turns the result into a contract the components workstream can
build against.

It also closes a harness gap: the live runner does **not** wire
`render({ onKeyDown })` or `withWindowKeyProvider`, so `useWindowKey` — the
command palette's mechanism — has never been exercised in a real window.

## 2. What will be proven

One live scenario, `live-key-routing`, over a probe view with:

- `key-outer`, a focusable container with `onKeyDown` and `onFocus` counters;
- `key-inner`, a focusable child with `onKeyDown` and `onFocus` counters and
  `autoFocus`;
- a `useWindowKey` handler that counts only the letter `x`;
- a readout `inner=<n> outer=<n> focuses=<n> window=<n>`.

| # | Action | Expected (to confirm) |
| - | ------ | --------------------- |
| 1 | mount | native focus is `key-inner`; `autoFocus` does not run `onFocus` |
| 2 | `key("x")` | `inner=1`, `outer=0`, `window=1` — the focused element and the window handler run; the ancestor does not |
| 3 | `key("down")` | `inner=2`, `outer=0`, `window=1` — named keys behave the same |
| 4 | click `key-outer` | native focus is `key-outer`; the measured `onFocus` count is recorded |
| 5 | `key("x")` | `outer=1`, `inner=2`, `window=2` — delivery follows focus |
| 6 | click `key-inner` | native focus is `key-inner` |
| 7 | `key("x")` | `inner=3`, `outer=1`, `window=3` |

The probe also gives the components workstream the working alternative: the
**window handler fires regardless of which element is focused**; putting the
key handler on the focused item also works. A handler on an ancestor does not.

## 3. Files

Create:

- `apps/playground/src/live/key-routing.tsx` — the probe view.

Change:

- `apps/playground/src/live/run.ts` — wire the window key registry:
  declare `{ current: Option.Option<WindowKeyHandler> }` before `render`, pass
  `onKeyDown` to `render`, and wrap each mounted view in
  `withWindowKeyProvider(register, …)` (the same shape as `src/smoke/run.ts`).
- `apps/playground/src/live/scenarios.tsx` — import and register
  `live-key-routing` (capability `focus`).
- `apps/playground/README.md` — the live table row and the measured contract.
- `COMPONENTS.md` — the `focus` capability row and the List/Tabs live notes.
- `TODO.md` — the task and the cross-team fix note.
- `.agents/slop/plans/README.md` — this row; `346` becomes the next number.

Do not change `packages/components`, `packages/primitives` or `packages/tokens`.

## 4. Steps for the executor

1. Read plan `344` §8.1 first; it contains the observed behaviour this probe
   explains.
2. Wire the live window-key registry exactly as `src/smoke/run.ts` does
   (`withWindowKeyProvider`, a mutable `Option` slot, `onKeyDown` on `render`).
   The live `render` call currently passes only `renderer`, `title` and the
   window size.
3. Write `src/live/key-routing.tsx`:
   - two focusable divs, each `tabIndex={0}`, `testId`, `aria-id`, and its own
     `onKeyDown`/`onFocus` counters;
   - `autoFocus` on the inner one;
   - `useWindowKey` filtering `event.key === "x"`;
   - the readout.
4. Write the scenario in `src/live/scenarios.tsx`:
   - assert native focus with `focusedOf` after mount, after each click;
   - send `x`, `down`, `x`, `x` in the order in §2;
   - use `waitForText` for each readout transition (the window has no frame
     boundary);
   - assert the measured `focuses` count — run it once, record the number, then
     assert it. Do not guess.
5. Build and run the live suite (there is no `--only` for live):
   ```sh
   nub run --filter playground build
   nub apps/playground/dist/live/run.js
   ```
   Expected: `25/25 scenarios passed`, exit `0`, a screenshot at
   `.artifacts/live/live-key-routing.png`.
6. Run the headless suite and the gates:
   ```sh
   nub apps/playground/dist/smoke/run.js
   nub run check
   nub run test
   ```
   Expected: `74/74` headless, gates exit `0`.
7. Record the numbers and the conclusion in §6, then update `COMPONENTS.md`,
   the README, `TODO.md` and the plan index. Commit the plan first, then the
   code and docs.

## 5. Test plan

The scenario is the test. It must be able to fail:

- moving the `onKeyDown` from `key-inner` to `key-outer` alone should fail
  `inner=1` (the ancestor never receives the key);
- removing `autoFocus` should fail the initial focus check;
- filtering `event.key` incorrectly in the window handler should fail
  `window=1`;
- removing the `withWindowKeyProvider` wiring should leave `window=0` and fail.

Record two of these as mutation proofs with the exact failing labels.

## 6. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003). `live-key-routing`, 19 checks:

| # | Action | Measured |
| - | ------ | -------- |
| 1 | mount | native focus is `key-inner`; `innerFocus=0` — **`autoFocus` does not run React's `onFocus`** |
| 2 | `key("x")` | `inner=1 middle=1 outer=1 window=1` — the focused element, **every** ancestor (focusable or not) and the app window handler all run |
| 3 | `key("down")` | `inner=2 middle=2 outer=2 window=1` — named keys follow the same path |
| 4 | click `key-outer`, then `key("x")` | native focus moves; `outer=3`, `inner=2`, `middle=2`, `window=2`; `outerFocus=0` — **a live click focuses natively without running React's `onFocus`** |
| 5 | click `key-inner`, then `key("x")` | `inner=3 middle=3 outer=4 window=3`; `innerFocus=0` |

**The contract.** A key is delivered to the focused element, bubbles through
every React ancestor, and finally reaches the app-level window handler. An
ancestor handler is a working path — the List does not need to change. The live
gap is narrower and belongs to `onFocus`: a native click or `autoFocus` does not
run React's `onFocus`. A component that tracks "the item the user is on" in
`onFocus` therefore loses a click, while a component that calls its own
`focusElement`/state update on click (as `List` does) is correct.

Live suite `24 → 25`, checks `405 → 427`, exit `0`.

Mutation proofs (temporary edit, full live run, reverted):

| # | Mutation | Failing check |
| - | -------- | ------------- |
| M1 | make the inner `onKeyDown` a no-op | `the focused element and every ancestor receive the key: … got "inner=0 middle=1 outer=1 innerFocus=0 outerFocus=0 window=1"` — and the ancestors still fire, so bubbling does not depend on the focused element's own handler |
| M2 | make the window handler filter `"y"` instead of `"x"` | `the app-level window handler receives it too: expected … "window=1", got "… window=0"` |

The probe also corrected plan `344` §8.1: the List keyboard works in a window.
The earlier failure was a harness race — the key was sent before the click's
React commit, so the list still moved from the previous active row. A live step
must `settle` after the click that establishes the active row (the runner's own
rule, now applied in `live-tier2-foundation`, which gained three checks to 18).
The Tabs arrow result remains a real component issue: `Tabs` sets `active` only
in `onFocus`, and a clicked tab never reaches that handler.

## 7. STOP conditions

- `render({ onKeyDown })` does not reach the live window handler. Stop and
  record it; do not simulate a window handler in component code.
- Native focus after `autoFocus` or a click cannot be read through
  `AsyncSmokeHost.focused`. Stop; the probe would have no observation.
- The readout needs a sleep longer than the suite's 3 s wait to settle. Stop and
  report the timing.
- The live suite is not `25/25` with exit `0`. Stop and report the failing
  scenario.

## 8. Acceptance

- `live-key-routing` is green in a real window and its checks are recorded.
- The live suite is `25/25`, exit `0`; the headless suite is unchanged at
  `74/74`.
- The three delivery paths are stated with measured numbers in
  `COMPONENTS.md` and the README.
- The `useWindowKey` mechanism is now exercised live (it was headless-only).
- `nub run check`, `nub run lint` and `nub run test` pass.

## 9. What this plan does not prove

- It does not fix the List/Tabs keyboard defect; it gives the components
  workstream the contract and the workaround. The fix stays in `TODO.md`.
- It does not measure modifier handling (plan `176` covers `cmd-k` headless);
  the probe uses an unmodified letter and a named arrow key.
- It does not prove window keys on platforms other than this host.

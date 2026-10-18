# 532 — The terminal surface in a real window

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (live evidence) |
| Owner | playground |
| Depends on | `179` (the headless terminal probe), `189`/`190`/`197` (the live host), `345` (live key routing), `529` (the pinned binding) |
| Paths | `apps/playground/src/live/scenarios.tsx`, `apps/playground/README.md`, `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md` |

## 1. Why

`terminal-grid` (plan `179`) is the **last Tier 4 capability whose evidence is
headless only**. Every other desktop surface has a live twin: the shell, input,
scroll, panels, overlays, focus, selection, motion, docking, float, menus,
tabs, the data grid, the editor and the workspace restore all run in a real
`1100×720` window.

The terminal is also the surface where a headless result is least trustworthy:

- Plan `345` measured that a live window routes a key to the **focused element**
  and that a real click focuses natively **without running React's `onFocus`** —
  neither of which the offscreen `simulateKeystrokes` path exercises.
- Plan `533` measured that `keyChar` is absent on a plain `div` headless and
  present on a text field, so a terminal's `keyChar ?? key` fallback is only
  proven by a probe that types into a real surface.
- A `<virtual-list>` is not a live wheel target (plan `350`), so the scrollback's
  own scroller wrapper is a live composition question.

A terminal is Tier 4 (`MISSION.md` → "terminal surfaces if feasible") and the
workstream owns the native evidence, so this plan closes the gap rather than
adding a new surface.

## 2. The contract after this plan

One new live scenario, `live-terminal`, reusing `terminal-grid`'s view exactly
(no second implementation). It asserts, in the real window:

| # | Check | Expected |
| - | ----- | -------- |
| 1 | the surface is painted | `418` wide, `266` tall inside its 1 px borders (±1) |
| 2 | a real click focuses the surface | `focused() = terminal-surface` |
| 3 | two real printable keys edit the prompt | `$ ls` |
| 4 | Enter commits and clears | input `$ `, count `201` |
| 5 | the committed command is painted | `paintedText` contains `$ ls` |
| 6 | Up recalls the last command | `$ ls` |
| 7 | Backspace deletes one character | `$ l` |
| 8 | Escape clears and reports the cancel | `$ `, status `cancelled` |
| 9 | a real `ctrl-c` aborts the line | status `interrupted`, events contain `c+ctrl`, input `$ ` |
| 10 | the scrollback starts at the tail | `boot 199` painted, `boot 000` absent |
| 11 | a real wheel moves the scrollback | the list anchor index drops by ≥ 10 |
| 12 | a jump to the head paints row 0 | `boot 000` painted, `boot 199` absent, anchor `0` |
| 13 | the prompt survives the jump | input `$ ` |
| 14 | native focus survives the jump | `focused() = terminal-surface` |
| 15 | input still works after the jump | typing `x` paints `$ x` |
| 16 | a row is exactly one line tall | `terminal-row-0` height `18` (±0.5) |
| 17 | equal character counts paint equal widths | `terminal-text-0` and `-1` within 0.5 px |
| 18 | the caret is painted | `7 × 12` (±0.5) |
| 19 | the scrollback viewport is one screen | `terminal-viewport` height `240` (±1) |
| 20 | the prompt row is below the scrollback | `terminal-input.y ≥ terminal-viewport.y + height` |

**Not asserted live (measured reason, plan `197`):** the mono family and the
`destructive`/`success` run colours. The live renderer exposes no style report;
those three checks stay in `terminal-grid`.

**Not asserted at all:** ANSI parsing and a PTY. 0.10.0 has no process API, so
the app owns both (already recorded in `COMPONENTS.md`).

## 3. Changes, file by file

### 3.1 `apps/playground/src/live/scenarios.tsx`

1. Add `import { terminalScenario } from "../scenarios/terminal.js";` beside the
   other scenario imports.
2. Add one `const terminal: LiveScenario` after `media`:
   - `id: "live-terminal"`, `capability: "terminal"`,
     `title: "Live terminal: a focused text grid and the control keys"`;
   - `view: terminalScenario.view`, `ready: "terminal-surface"`;
   - `steps` exactly the §2 table, using the existing helpers (`settle`,
     `textOf`, `boxOf`, `focusedOf`, `waitForText`, `waitForAnchor`,
     `waitForFocus`, `LIVE_ARTIFACTS`). Use `ctx.host.key` for the keys,
     `ctx.host.wheel("terminal-viewport", 0, 400)` for the upward wheel (a
     positive `deltaY` scrolls up, plan `189`'s sign) and
     `ctx.host.scrollToItem("terminal-list", 0)` for the jump.
   - take one screenshot: `${LIVE_ARTIFACTS}/${terminal.id}.png`.
3. Append `terminal` to `liveScenarios` after `media`.
4. Header comment: add plan `532` to the paragraph that records what a live
   window asserts.

### 3.1a `apps/playground/src/scenarios/terminal.tsx` (measured amendment)

Two small changes the first live run proved necessary; both are shared with the
headless view and add no headless assertion:

1. `testId="terminal-viewport"` on the `VISIBLE_HEIGHT` wrapper. The automation
   tree reports **no painted bounds** for a `<virtual-list>` itself
   (`terminal-list is painted: expected a value, got none`), so the live box and
   the wheel target need the wrapper — the plan-`350` rule.
2. Declare the surface height as
   `VISIBLE_HEIGHT + ROW_HEIGHT + 8 + theme.borderWidth.thin * 2`. The 0.10.0
   box excludes borders from the reported size, so the original `266`-tall
   surface reported `264` inside and flex-shrunk the scrollback to `238`.

### 3.2 `apps/playground/README.md`

Add a short "Live terminal" subsection (a two-row table: `terminal-grid`,
`live-terminal`) after the terminal-surfaces section, and update the live-suite
paragraph: the registry now lists **51** scenarios, the last **full** live run
stays **50/50 (1014 checks)** until a merge gate runs the new one, and this task
ran `--only live-terminal`.

### 3.3 `COMPONENTS.md`

- Capability table: `| terminal | `terminal-grid`, `live-terminal` | verified |`.
- Terminal surfaces row: append the live sentence — a real click focuses the
  `role="textbox"` `div`, real printable keys edit the prompt, `ctrl-c` arrives
  with the control modifier, the scrollback's tail/head and the prompt survive
  a wheel and a jump, and focus survives; colour stays headless.

### 3.4 `TODO.md`

Add under the playground workstream, and tick it in the same commit:

```
`[x]` Prove the **terminal surface in a real window** per plan `532`: `live-terminal` ...
```

Include the measured check count and the focused commands actually run.

### 3.5 `.agents/slop/plans/README.md`

Add the plan row, and take `532` in the playground paragraph (the next free
number above `531`; `530`/`537`/`538` are claimed by other workstreams).

## 4. Commands and expected results

From the worktree root, while iterating:

```sh
nub run --filter playground build
# expect: exit 0 (testing build, vendor, binding pin, tsc).

nub apps/playground/dist/live/run.js --only live-terminal
# expect: 1/1 scenarios passed · capabilities: terminal=verified, exit 0,
#         one screenshot at apps/playground/.artifacts/live/live-terminal.png.
```

Baseline before the change (already measured 2026-10-18):

```sh
nub apps/playground/dist/live/run.js --list | wc -l
# expect: 50 before, 51 after.

nub apps/playground/dist/live/run.js --only live-input
# expect: 1/1, exit 0 (proves the window and binding are healthy).
```

Focused headless guard (the reused view must not regress):

```sh
nub apps/playground/dist/smoke/run.js --only terminal-grid
# expect: 1/1 scenarios passed · capabilities: terminal=verified, exit 0.
```

End of task:

```sh
nub run check
nub run lint
nub run test
# expect: exit 0 each; record the playground test count.
```

Do **not** run the full live suite (merge/release gate): this task changes one
live scenario, not the harness contract.

## 5. Test plan

The scenario **is** the test: `live-terminal` fails the run (`exit 1`, the check
label in the report) when a mechanism breaks. Two-direction proofs, each run
with `--only live-terminal` and reverted:

| Mutation | Must fail with |
| -------- | -------------- |
| M1 — change the viewport's `height` from `VISIBLE_HEIGHT` to `220` | `the live scrollback viewport is 240 tall` (`expected 240 ± 1, got 220`) |
| M2 — remove the `modifiers.ctrl` branch in `handleKeyDown` | `ctrl-c aborts the line` (status stays `cancelled` / falls through) |
| M3 — drop `alignment="bottom" followTail` from `terminal-list` | `the committed command is painted` (`expected true, got false`) — the list stays at the top, so the tail is not painted |
| M4 — remove `onKeyDown` from `terminal-surface` | `printable keys edit the prompt` (`expected "$ ls", got "$ "`) |

**A measured non-mutation:** removing `tabIndex={0}` from the surface still
passes. A real click focuses a plain `div` natively in a window, exactly as the
headless probe measured; `tabIndex` is a tab-order declaration here, not what
makes the click focus.

No unit test is added: the scenario is pure orchestration over the host verbs,
and every assertable rule already lives in the view it reuses.

## 6. Results

All §4 commands matched (2026-10-18):

| Command | Result |
| ------- | ------ |
| `nub apps/playground/dist/live/run.js --list \| wc -l` | **51** (was 50) |
| `nub apps/playground/dist/live/run.js --only live-terminal` | **1/1**, `terminal=verified`, **48 checks**, 1.7 s, exit `0`; screenshot at `apps/playground/.artifacts/live/live-terminal.png` |
| `nub apps/playground/dist/smoke/run.js --only terminal-grid` | **1/1**, `terminal=verified`, exit `0` |
| full headless suite | **101/101**, **3536 checks**, exit `0` (unchanged — the view amendment adds no headless assertion) |
| `nub run check` / `lint` / `test` | exit `0`; playground **32 files / 408 tests**, primitives 282, components 308, icons 19, testing and deploy green |

Four mutation proofs, each observed with `--only live-terminal` and reverted:

- **M1** viewport `height: 220` → `the live scrollback viewport is 240 tall:
  expected 240 ± 1, got 220`, exit `1`.
- **M2** `ctrl-c` branch removed → `ctrl-c aborts the line: expected
  "interrupted", got "cancelled"`, exit `1`.
- **M3** `alignment="bottom" followTail` removed → `the committed command is
  painted: expected true, got false`, exit `1` (the list stays at the top, so
  the tail never paints).
- **M4** `onKeyDown` removed from the surface → `printable keys edit the prompt:
  expected "$ ls", got "$ "`, exit `1`.

**Measured amendments to the plan** (recorded, not defects in the view's
behaviour):

1. `bounds("terminal-list")` is `null` — a `<virtual-list>` has no painted box in
   the live automation tree (`terminal-list is painted: expected a value, got
   none`). The view gained a `terminal-viewport` wrapper for the box and the
   live wheel target; `listScrollTop`/`scrollToItem` still address the list id.
2. The declared `266` surface reported `264` inside its 1 px borders, so flex
   shrank the scrollback to **238**. The height now includes
   `theme.borderWidth.thin * 2`; the viewport measures **240** and the surface
   **266** inside.
3. Removing `tabIndex={0}` did **not** fail the focus check: a real click
   focuses a plain `div` natively, confirming plan `179`'s headless result in a
   window. The live suite therefore does not use it as a mutation; `tabIndex` is
   a tab-order declaration, not the click-focus mechanism.

## 7. STOP conditions

- The live runner exits `2` (no window) or the binding provenance check fails.
  STOP: no evidence was produced; do not claim the checks passed.
- A real click on `terminal-surface` focuses a descendant row or nothing.
  Record the measured target. The plan then authorises **one** probe change: the
  surface owns `onMouseDown` and calls
  `useGpuix().renderer.focusElement` on itself (a terminal must own focus), and
  the scenario still asserts `terminal-surface`. Do not weaken the check to
  "some element".
- A live `keystrokes` call cannot express `ctrl-c`. STOP and record the protocol
  limitation; do not replace it with a synthetic `keyDown` that skips the window
  path.
- A real wheel on `terminal-surface` does not move the list anchor. STOP and
  record it: the terminal would need its own scroller wrapper (plan `350`), and
  that composition change is a separate plan.
- A literal expectation in §2 is wrong (row height, caret, surface height).
  Record the measured value, amend §2 and the scenario, and say so in §6 — a
  measurement is not a defect, but an unrecorded one is.
- Any change is needed outside the §3 paths. STOP; record it in `TODO.md` as a
  cross-team task.

## 8. Acceptance

- `--only live-terminal` is `1/1`, `terminal=verified`, exit `0`, with the
  measured check count recorded in §6, `TODO.md` and `COMPONENTS.md`.
- The four mutation proofs fail in the stated direction and the restored code is
  green.
- `--only terminal-grid` stays green; `nub run check`, `nub run lint` and
  `nub run test` pass.
- No full live total is claimed; the registry count and the last full-run total
  are both stated.

# 554 — The published popups in a real window: Select, Combobox and Tooltip

| Field | Value |
| ----- | ----- |
| Workstream | playground |
| Phase | F (native evidence) |
| Depends on | `100`, `110`, `140`, `159`, `189`, `190`, `193`, `197`, `199`, `529` |
| Owns | `apps/playground/src/live/scenarios.tsx`, the `select`/`combobox`/`tooltip` rows of `COMPONENTS.md`, the live section of `apps/playground/README.md` |
| Feeds | the `Selects`, `Comboboxes`, `Tooltips` and `Select`/`Combobox`/`Tooltip` capability rows — they stop being headless-only |

## 1. Why this exists

Plan `159` measured the three popups GPUix publishes (`Select`, `Combobox`,
`Tooltip`) in the offscreen `TestRenderer`. They are the only overlays the
library **reuses instead of implementing** (D15), so their contract is the
library's contract: open, commit, focus return, Escape, outside dismissal,
type-to-filter, and the tooltip's real-time close.

No live scenario drives them. `live-tier2-choice` exercises the *shipped*
`Combobox` wrapper, and `live-preview` proves hover works, but:

- the published `Select` has **no live evidence at all**;
- the published `Combobox` is only proven through one wrapper, with a
  different view;
- the published `Tooltip` is only proven headless — `live-preview` is a
  hand-built hover card, not `Tooltip`.

MISSION §"Interaction, layout, state" says an interaction is not complete until
it runs in the actual native runtime. The `COMPONENTS.md` capability table
currently claims `select`, `combobox` and `tooltip` as `verified` on headless
evidence only. This plan closes that gap with three live twins that reuse the
existing views — no new UI, no new host verb.

**Goal:** `live-select`, `live-combobox` and `live-tooltip` run green in the
real 1100×720 window, and the ledgers cite them.

## 2. What is already measured (do not re-derive)

| Fact | Source |
| ---- | ------ |
| A live `click(testId)` uses the element's painted centre | `live-*` suite |
| A live key reaches the focused element, then bubbles | `live-key-routing` (plan `345`) |
| The live `key` verb types the **literal, lowercase** key | plan `536` |
| `AsyncSmokeHost.focused` reads the renderer's native focus | plan `190` |
| `AsyncSmokeHost.hover` moves a real pointer and a real enter/leave arrives | plan `199` |
| The live `text` verb **errors** for an unmounted element; `bounds` returns `null` | plan `389` §6 |
| A mounted surface commits one React frame after the input | plan `534`/`536`; `settle` is 120 ms |
| The headless popup contract: click opens, item click commits and returns focus, Down opens + moves, Enter commits, Escape/outside dismiss, typing filters, empty state mounts, hover opens the tooltip and the leave closes it after 80 ms | plan `159` §8 |

## 3. Files to change

1. `apps/playground/src/live/scenarios.tsx`
   - import `selectScenario`, `comboboxScenario`, `tooltipScenario` from
     `../scenarios/popups.js` (they are not imported today);
   - add three `LiveScenario` constants — `live-select`, `live-combobox`,
     `live-tooltip` — reusing the scenario's `view` (the three share one
     `PopupsProbe`, so each mounts a fresh copy under its own keyed fragment);
   - add them to `liveScenarios`, after `primitives` (before `table`).
   No other file in `packages/testing` changes: every verb used here exists.
2. `COMPONENTS.md`
   - the capability table's `select`, `combobox` and `tooltip` rows cite the new
     live ids;
   - the `Selects`, `Comboboxes` and `Tooltips` inventory rows gain one
     sentence naming the live checks.
3. `apps/playground/README.md` — a `## Published popups in a real window`
   section under the native-popups section, with the measured table.
4. `.agents/slop/plans/README.md` — index this plan in the playground table.
5. `TODO.md` — one task line under the playground workstream.
6. `PLAN.md` — decision `D69`.

## 4. The three scenarios, step by step

All checks are exact strings; no tolerances. `settle` follows every input that
changes state or focus. Conditionally mounted ids are awaited with
`ctx.host.waitFor(id)` **before** `text`, because live `text` rejects for an
unmounted id; "unmounted" is asserted with `bounds === null`.

### 4.1 `live-select` — `view: selectScenario.view`, `ready: "select-trigger"`

```
1.  click("select-trigger"); waitFor("select-content"); settle
2.  awaitedTextOf("select-readout", "open=true") contains "open=true"
3.  textOf("select-content") contains "Beta"
4.  click("select-item-Beta"); waitForText("select-readout", "open=false value=Beta")
5.  textOf("select-readout") contains "open=false value=Beta"
6.  bounds("select-content") === null                      // unmounted
7.  waitForFocus("select-trigger")
8.  focused() === "select-trigger"                         // focus returned
9.  key("down"); settle; waitForText("select-readout", "open=true")
10. key("down"); settle; key("enter"); settle
11. waitForText("select-readout", "value=Gamma")
12. textOf("select-readout") contains "open=false"           // committed and closed
13. key("down"); settle; key("escape"); settle
14. waitForText("select-readout", "open=false")
15. key("down"); settle; clickWindow(1000, 690); settle
16. waitForText("select-readout", "open=false")             // outside press
17. waitForFocus("select-trigger")
18. focused() === "select-trigger"
19. screenshot(LIVE_ARTIFACTS/live-select.png)
```

`(1000, 690)` is inside the 1100×720 window and below the 520-wide probe, so it
is a genuine outside press. Do **not** reuse the headless `(1200, 700)` point:
that is outside the live window.

### 4.2 `live-combobox` — `view: comboboxScenario.view`, `ready: "combo-input"`

```
1.  click("combo-input"); waitFor("combo-content"); settle
2.  waitForText("combo-readout", "open=true")
3.  textOf("combo-content") contains "Alpha"
4.  key("b"); key("e"); settle
5.  waitForText("combo-readout", "query=be")
6.  bounds("combo-item-Alpha") === null                     // filtered out
7.  textOf("combo-item-Beta") contains "Beta"
8.  key("enter"); settle
9.  waitForText("combo-readout", "open=false value=Beta")
10. bounds("combo-content") === null
11. click("combo-input"); waitFor("combo-content"); settle
12. key("z"); key("z"); settle
13. waitFor("combo-empty"); textOf("combo-empty") contains "no matches"
14. bounds("combo-item-Beta") === null
15. key("escape"); settle; waitForText("combo-readout", "open=false")
16. screenshot(LIVE_ARTIFACTS/live-combobox.png)
```

The query is **not** reset by a commit in this view (`query` stays `be`), so the
second typing pass produces `bezz`. The assertion is the empty state, not the
literal query.

### 4.3 `live-tooltip` — `view: tooltipScenario.view`, `ready: "tooltip-trigger"`

```
1.  hover("tooltip-elsewhere"); settle
2.  textOf("tooltip-readout") contains "open=false"
3.  hover("tooltip-trigger"); settle
4.  waitForText("tooltip-readout", "open=true")
5.  waitFor("tooltip-content"); textOf("tooltip-content") contains "tip text"
6.  bounds("tooltip-content") !== null
7.  hover("tooltip-elsewhere"); settle
8.  waitForText("tooltip-readout", "open=false")            // the 80 ms JS timer
9.  bounds("tooltip-content") === null
10. screenshot(LIVE_ARTIFACTS/live-tooltip.png)
```

Step 8 must use the bounded `waitForText` (3 s): the close is an 80 ms JS timer
inside the component, not the GPUI motion clock (plan `159` §8).

## 5. STOP conditions

Stop and report rather than improvising if:

- any live verb rejects with a `SmokeHostError` — that is a protocol gap, not a
  check to loosen;
- the live keyboard commit differs from the headless contract (for example
  Enter commits `Beta` instead of `Gamma`, or Down does not move) — record the
  measured difference and **do not** silently change the expectation; a
  divergence between `TestRenderer` and a real window is exactly what this plan
  exists to find;
- the tooltip does not open on `hover` — plan `199` says hover works, so a
  failure means the published `Tooltip` differs from the probe; record it;
- an assertion needs a tolerance or a `waitFor` longer than the existing 3 s;
- the three scenarios cannot share a window without interfering (they mount
  sequentially in one window, keyed per id, so they must not).

## 6. Test plan (the scenarios are the tests)

From the repo root:

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --list | rg '^live-(select|combobox|tooltip)$'
nub apps/playground/dist/live/run.js --only live-select --only live-combobox --only live-tooltip
nub run --filter playground test
nub run check
nub run lint
```

Expected: `--list` prints the three ids; the focused live run is `3/3`,
`exit 0`, with one screenshot each. The full live suite is a merge gate and is
**not** run for this task.

Mutation proofs — each applied to `scenarios.tsx`, run with the same focused
command, then restored. Every one must exit `1`:

- **M1 — the wrong item.** In `live-select`, click `"select-trigger"` instead of
  `"select-item-Beta"`: the commit check fails (`value=none`).
- **M2 — the wrong hover target.** In `live-tooltip`, hover `"tooltip-elsewhere"`
  in step 3: the open check fails (`open=false`).
- **M3 — the wrong query.** In `live-combobox`, type `"a"` instead of `"b"`/`"e"`:
  the `query=be` check fails and `combo-item-Beta` is filtered out.
- **M4 — the outside press.** In `live-select`, remove the `clickWindow(1000,
  690)` step: the list stays open and the check fails (`open=true`).
  **Do not** use a click on the trigger as this lever: a trigger click also
  closes an open list (measured, §8), so it cannot distinguish the outside
  path.

Record every observed `expected`/`got` pair in §8.

## 7. Acceptance

- `live-select`, `live-combobox` and `live-tooltip` each run `1/1`, `exit 0`,
  in one focused invocation (`3/3`), with screenshots.
- The live registry is `53 → 56` ids and `--list` names all three.
- M1–M4 fail in the documented direction and are recorded.
- `COMPONENTS.md`, the playground README, this index, `PLAN.md` (D69) and
  `TODO.md` cite the new ids.
- `nub run --filter playground test`, `nub run check` and `nub run lint` pass.

## 8. Measured result

`nub run --filter playground build`, then:

```sh
nub apps/playground/dist/live/run.js --only live-select --only live-combobox --only live-tooltip
```

**3/3 scenarios, exit `0`**, `select`/`combobox`/`tooltip` each `verified`, one
screenshot per scenario. The live registry is **56** ids (`53 → 56`), and the
three new scenarios carry **17 + 17 + 9 = 43 checks**:

| Scenario | Checks | Measured |
| -------- | ------ | -------- |
| `live-select` | 17 | a real click opens and paints `Beta`; the item click commits `open=false value=Beta`, unmounts the list and returns native focus to the trigger; Down opens, the next Down + Enter commits `Gamma`; Escape closes; a real click at `(1000, 690)` dismisses and returns focus |
| `live-combobox` | 17 | the input click opens and paints `Alpha`; `be` reaches the query, unmounts `Alpha` and leaves `Beta`; Enter commits `Beta` and unmounts the list; a second `zz` pass paints `no matches`; Escape closes |
| `live-tooltip` | 9 | nothing is open before the pointer arrives; a real enter opens the tip and paints `tip text` in a painted box; the leave runs the component's timer and closes it |

Two measurements worth keeping:

- the tooltip block takes ~3 s when it follows the combobox in the same window
  (a frame stall during the hover settle), against ~0.5 s alone. It is harness
  cost, not a check: every assertion is an exact readout, and the focused run is
  green both alone and in the three-scenario invocation;
- a trigger click closes an open list, so it is **not** a valid mutation for the
  outside-dismissal check (measured: the scenario still passed). The check is
  proven by removing the outside press.

### Mutation proofs (each edited, run, restored; all exit `1`)

| Lever | Observed failure |
| ----- | ---------------- |
| **M1** click `select-trigger` instead of `select-item-Beta` | `choosing an item commits and closes: expected "open=false value=Beta", got "open=false value=none"` |
| **M2** hover `tooltip-elsewhere` instead of the trigger | `a real mouse enter opens the tooltip: expected "open=true", got "open=false"` |
| **M3** type `a` instead of `b`/`e` | `typing reaches the query: expected "query=be", got "open=true value=none query=a"` |
| **M4** remove the outside `clickWindow` press | `an outside press dismisses: expected "open=false", got "open=true value=Gamma"` |
| **M4\*** replace the outside press with a click on the trigger | **passes** — a trigger click is also a dismissal, so that lever cannot distinguish the outside path; recorded rather than counted. |

**Transferable finding:** the published `Select`, `Combobox` and `Tooltip`
behave in a real window exactly as the `TestRenderer` measures them, including
native focus return after a commit or an outside dismissal and the tooltip's
80 ms real-time close. No component needs a live-specific path.

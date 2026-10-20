# 724 — Click routing: the painted element takes it, and nothing bubbles

**Phase:** B/F (native input contract). **Depends on:** `100`, `110`, `120`,
`140`, `162`, `172`, `188`, `376`, `381`, `533`. **Number:** the first free
number after `723`.

## 1. Why

Two measurements in this workstream disagree about what a click does on the way
up the tree:

- Plan `381` (notification centre) moved the bell's toggle from `nc-bell` to its
  parent `nc-bellwrap`; the click on `nc-bell` then became **inert**. Recorded
  as "the headless `click(testId)` verb does not run an ancestor's `onClick`",
  and the view deliberately keeps the toggle on the child.
- Plan `376` (multi-pane editor) records that "a click on the code **bubbles**
  to the viewport", whose `onClick`/`tabIndex` take the activation.
- Plan `193` (live context menu) records "child bubbling" in a real window.

Re-measured while preparing plan `723`: a temporary counter on `nc-bellwrap`
stayed **`0`** after a click on `nc-bell`, while the bell's own handler ran
(`open=true`). So the parent handler never ran. That is not bubbling — yet the
code→viewport case and the live context menu say an ancestor handler *does* run
when the hit element has none.

The hypothesis these three facts fit: **a click is dispatched to the nearest
element with an `onClick` handler on the hit path, and propagation stops
there.** The `<code>` has no handler, so the viewport receives it; the bell has
one, so its wrapper does not.

This is load-bearing for every component that nests a control inside a
clickable row, closes a surface on an inside press, or relies on a row's handler
seeing a child's activation. No scenario owns the contract.

## 2. What to measure

The probe (`click-routing`, capability `input`) mounts one nested tree with
counters on every level:

```
cr-outer   (onClick, tabIndex=0, 320 × 220)
  cr-mid   (onClick, 280 × 150)
    cr-inner (onClick, 120 × 60)   — cr-leaf (20 × 20, NO handler) at (4, 4)
                                   — cr-text (text, NO handler) at (4, 32)
    cr-sibling (onClick, 100 × 40)
```

Checks, in order:

1. `click("cr-inner")` → `inner=1`, `mid=0`, `outer=0`, last target `inner`.
   **This decides bubbling vs nearest-handler.**
2. `click("cr-leaf")` (no handler, inside inner) → does `inner` take it? Records
   nearest-handler-over-a-child-with-none.
3. `click("cr-text")` (text child, no handler) → same question over a text run.
4. `click("cr-sibling")` → `sibling=1`, and `mid`/`outer` unchanged.
5. A coordinate click in mid's empty area (`clickWindow(box.x + w − 8, box.y + h
   − 8)`) → `mid` increments, `outer` does not.
6. A coordinate click in outer's empty area → `outer` increments.
7. Focus after step 1: `ctx.host.focused()` — the nearest focusable ancestor
   (`cr-outer`, the only `tabIndex`) or `none`? Recorded, then asserted.
8. `Enter` and `Space` on the focused `cr-outer` synthesize **no** click (0.10.0
   has no native activation); every counter is unchanged.

The live twin `live-click-routing` repeats 1–4 and 7 with real protocol clicks
and settles between steps. It answers the second question the headless host
cannot: **does a real window route the same way?** If it differs, both hosts'
measured behaviour is asserted and the difference is recorded, not averaged.

## 3. Files

- **Create** `apps/playground/src/scenarios/click-routing.tsx` — the view
  (`ClickRoutingProbe`), a `readField` helper over the `cr-counts` readout, and
  `export const clickRoutingScenario`.
- **Change** `apps/playground/src/scenarios/index.ts` — import it and add it to
  the `scenarios` array next to `inputPayloadScenario`.
- **Change** `apps/playground/src/live/scenarios.tsx` — import the scenario and
  add `liveClickRouting` (`id: "live-click-routing"`, capability `input`,
  `view: clickRoutingScenario.view`, `ready: "cr-outer"`, same settle pattern as
  `live-input-payload`).
- **Change** `apps/playground/README.md` — a `## Click routing (plan 724)`
  section with the measured table, and the `input` capability row in the
  scenario index table if it lists ids.
- **Change** `COMPONENTS.md` — the `input` capability row cites `click-routing`
  and `live-click-routing` and states the rule.
- **Change** `TODO.md` — a playground task with the measured numbers.
- **Change** `.agents/slop/plans/README.md` — this plan's row and the number
  narrative.
- No `packages/testing` change is expected: the host verbs already exist
  (`click`, `clickWindow`, `focused`, `keyDown`, `keyUp`). If a verb is missing,
  STOP and record it rather than adding API to this plan.

## 4. Commands

From `/Users/cyberistic/GPUIXUI/workspaces/playground`:

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only click-routing
nub apps/playground/dist/live/run.js --only live-click-routing
nub apps/playground/dist/smoke/run.js           # end-of-task: whole headless registry
nub run check && nub run lint && nub run test
```

The first focused run is **expected to fail on purpose** if an assertion states
a hypothesis rather than a measurement: read the `expected … got …` line, set
the measured value, rebuild and re-run until green. Do not weaken a check to
make it pass; assert the measured value by name.

## 5. Expected result

- `click-routing` **green** with the measured rule. The hypothesis is that
  steps 1, 4, 5 and 6 give counts on the clicked element only, steps 2 and 3
  give `inner`, and step 8 gives no change.
- The live twin **green** with the same counts, or with the difference recorded
  in §7 and in the ledgers.
- Scoped mutation proofs observed and reverted (see §6). Each one exits `1` and
  names the check.
- End-of-task headless registry green at **107/107** (106 + this scenario) with
  the live registry at **96** ids after the twin lands (the full live suite is a
  merge gate and is **not** run for this task).

## 6. Test plan (the checks must be able to fail)

| # | Mutation | The check that must go red |
| - | -------- | -------------------------- |
| M1 | Move `cr-inner`'s handler to `cr-mid` | "the clicked element handles its own click" — `inner=0 mid=1` |
| M2 | Give `cr-leaf` its own handler | "the leaf's click reaches the nearest handler" — `inner` no longer increments, `leaf=1` |
| M3 | Remove `cr-outer`'s `tabIndex` | "the click focuses the nearest focusable ancestor" — `focused=none` |
| M4 | Make the live twin assert `mid=1` after the inner click | live run exits `1` if the window does not bubble (and passes only if it does — then the headless twin is the one corrected) |

Record every observation and every revert. A mutation that stays green is a
**null result** and is written down as one.

## 7. STOP conditions

- A clicked element's reported centre is covered by another element (a child at
  the centre): reposition the layout, do not accept a wrong target.
- The live protocol cannot address one of the nested elements (`bounds` is
  `null`): record which one and keep that check headless, with the reason in the
  scenario header.
- The two hosts disagree in a way that suggests a flake (a count changing
  between identical runs): stop, record both runs, and do not average them.
- `nub run check`/`lint`/`test` fails anywhere: fix it before claiming the task.

## 8. Acceptance

- `click-routing` + `live-click-routing` exist, are registered, and are green
  with the measured counts.
- Four mutation proofs observed and reverted (at most one null result, named).
- The README, `COMPONENTS.md`, `TODO.md` and the plan index carry the rule, the
  ids and the exact commands run.
- Full headless registry green (107/107) and the gates green; one commit pushed
  on `agent/playground`.

## 9. As measured (2026-10-20)

The hypothesis in §1 was **wrong**, and the probe corrected it. GPUI hit-testing
**follows paint**; there is no nearest-handler walk and no bubbling:

| Case | Measured line | Rule |
| ---- | ------------- | ---- |
| painted child with a handler (`cr-deep`) | `deep=1` | the handler runs alone; no ancestor |
| painted child with no handler (`cr-plain`) | all zero | the click is swallowed |
| painted box owning the handler (`cr-plainbox`) | `plainbox=1` | alone, from its own empty area |
| transparent element with a handler (`cr-clear`) | `clear=1 mid=1` | the painted ancestor **and** the overlay both run |
| painted ancestor's own area (`cr-mid`) | `mid=1` | alone |
| outer's empty area | `outer=1` | alone |
| focus after a non-focusable click | `cr-reset` (unchanged) | focus does not move; a `tabIndex` child takes it |
| `Enter` / `Space` on the focused `cr-outer` | all zero | no click synthesis |

This resolves all three records: the plan-381 bell **wrapper** is transparent, so
it is not the hit target while its painted child owns a handler; the plan-376
`<code>` is not the painted target, so the viewport (which is) receives the
click; and the plan-193 "child bubbling" is the painted element receiving the
event, not an ancestor.

- `click-routing` **18 checks**, `live-click-routing` **13 checks**, both green
  (the live twin green first run and after the reverts). The headless registry
  is **107** ids; live is **96**.
- Both cases run from a keyed remount (`cr-reset`), so a case cannot be
  contaminated by an earlier click; the remount needs a settle before the next
  click reads its fresh bounds (measured: an earlier draft read the previous
  mount's bounds and misattributed a count).
- Four mutation proofs observed and reverted:
  - **M1** `cr-plain` gets `plainbox`'s handler → `a painted handler-less child
    swallows the click` fails with `plainbox=1`.
  - **M2** `cr-clear` gets a background → `a transparent handler and the painted
    ancestor both run` fails with `mid=0 clear=1`.
  - **M3** `cr-deep` gets `tabIndex={0}` → `a click on a non-focusable element
    does not move focus` fails with `cr-deep`.
  - **M4** the live twin expects `mid=1` on the deep case → the live run exits
    `1` with the measured `mid=0`.
- **Not claimed:** a text run and a `<code>` surface inside a clickable box. An
  in-flow label on a shipped `Button` activates it, while an absolutely
  positioned label swallowed the click in an early draft; that difference needs
  its own probe. Recorded on the README section, not asserted.
- End-of-task: full headless **107/107 pass** (**3920** checks, 65
  capabilities), `nub run check`, `nub run lint`
  and `nub run test` green (playground **481** unit tests, `packages/testing`
  69). No full live gate (merge gate); the live registry total is **96**
  ids, so the next gate's checks should be `2663 + 13 = 2676`.

# 734 — Inline click routing: a `<text>` label and a `<code>` surface inside a clickable box

**Phase:** B/F (native input contract). **Depends on:** `100`, `110`, `120`,
`140`, `161`, `188`, `376`, `381`, `533`, `724`. **Number:** `725`–`733` are
claimed by other workstreams, so this plan takes the first free number, `734`.

## 1. Why

Plan `724` measured click routing and wrote the rule **hit-testing follows
paint**: a painted child with a handler runs alone, a painted handler-less child
swallows the click, and a transparent handler runs together with the painted
ancestor. It explicitly left one case **unmeasured**, and the two observations
it had disagree:

- an **in-flow** `<text>` label inside the shipped `Button` activates the button;
- an **absolutely positioned** label over a box **swallowed** the click.

Those are the two shapes every component uses. A `Button`, a menu row, a tab, a
list row and a card all wrap their visible label in a `<text>`; a table cell or a
badge may position a label over a surface. If the rule is really "paint", an
in-flow text run is painted and therefore ought to swallow, yet it does not. If
the rule is "a layout node with a painted background", then position and element
type decide, and a component author needs the list.

The README's `## Click routing (plan 724)` section records this as the one
open question, and `COMPONENTS.md`'s `input` row is `verified` on plan 724's
evidence. This plan closes the gap with the same two hosts.

## 2. What to measure

Extend the existing `click-routing` probe with a second, independent counter set
and readout, so plan 724's counts and live literals are untouched:

```
cr-inline            (inside the keyed ClickTree, so `cr-reset` resets it)

  cr-labelbox        handler `label`, 220 × 36, card background, padding 4
    <text testId="cr-label">Label</text>                 in-flow text
  cr-absbox          handler `abs`, 220 × 36, position relative, card background
    <text testId="cr-abs" style={{ position: "absolute", left: 4, top: 10 }}>
  cr-codebox         handler `code`, 240 × 76, card background
    <code testId="cr-code" language="ts" code="const x = 1" />
  cr-badgebox        handler `badgebox`, 240 × 44, card background
    <div testId="cr-badge" 120 × 28 accent>             painted, NO handler
      <text testId="cr-badge-label">Badge</text>
  cr-row             handler `row`, tabIndex 0, 220 × 36, card background
    <text testId="cr-rowlabel">row</text>
  cr-textbtnbox      no handler, 160 × 28, card background
    <text testId="cr-textbtn" onClick={…}>tap</text>     a text that owns a click
```

Readouts: `cr-inline-counts` (`label=0 abs=0 code=0 badgebox=0 row=0
textbtn=0`) and `cr-inline-last` (the last level that ran, `none` initially).
`cr-inline-reset` is the existing `cr-reset` remount, so every case starts from
zero.

Checks, in order. The **hypothesis** column is what the plan expects; the
in-code expectation is set from the **measured** value, never the hypothesis.

| # | Case | Hypothesis |
| - | ---- | ---------- |
| 1 | `click("cr-label")` — in-flow text inside a handler box | `label=1` (the shipped `Button` shape). If instead nothing runs, an in-flow text swallows and every component label is a dead zone — a recorded defect, not a relaxed check |
| 2 | `click("cr-abs")` — absolutely positioned text over a handler box | nothing (plan 724's observed swallow), unless the absolute run is treated like case 1 |
| 3 | `click("cr-code")` — `<code>` inside a handler box | `code=1` (plan 376 says a code click reaches its viewport, so the code surface is not a swallow point), unless `<code>` owns a hitbox with no handler |
| 4 | `click("cr-badge-label")` — text inside a painted handler-less child of a handler box | nothing; plan 724's swallow rule should already stop at `cr-badge` |
| 5 | `click("cr-rowlabel")` — text inside a `tabIndex=0` handler box | whatever handler runs, and `focused()` is the measured focus owner (`cr-row` or `none`); the shipped `Button`'s focus contract depends on it |
| 6 | `click("cr-textbtn")` — a `<text>` that owns `onClick` | its own handler runs, or the click falls to `cr-textbtnbox`'s absent handler (nothing). This decides whether a label can be a control |
| 7 | `click("cr-label")` twice, reading `cr-inline-last` | the last target names the element whose handler ran |

The live twin repeats **1–6** with real protocol clicks and a settle after each,
because the automation locator's centre is unclipped while the headless host's
is the renderer's own box.

## 3. Files

- **Change** `apps/playground/src/scenarios/click-routing.tsx`:
  - add `INLINE_LEVELS`, `InlineCounts`, `formatInline`, `InlineTree`;
  - mount `<InlineTree />` inside `ClickTree` **after** `cr-last`, so the keyed
    remount resets both counter sets;
  - add the checks above to `clickRoutingScenario.steps`;
  - keep every existing level, string and check byte-identical.
- **Change** `apps/playground/src/live/scenarios.tsx` (`clickRouting`) — the
  repeat of cases 1–6 with `ctx.host.click` + `settle`, asserting the measured
  `cr-inline-counts` strings.
- **Change** `apps/playground/README.md` — replace the "Not measured"
  paragraph in `## Click routing (plan 724)` with the measured inline table and
  its component rule; update the check counts.
- **Change** `COMPONENTS.md` — the `input` row cites `click-routing` +
  `live-click-routing` (already) and the suite paragraph's check total.
- **Change** `TODO.md` — tick a new playground task with the measured numbers
  and the focused ids run.
- **Change** `.agents/slop/plans/README.md` — this plan's row and the number
  narrative.
- **No** `packages/testing` change: the host verbs (`click`, `clickWindow`,
  `focused`, `text`) already exist. If a verb is missing, STOP and record it.

## 4. Commands

From `/Users/cyberistic/GPUIXUI/workspaces/playground`:

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only click-routing
nub apps/playground/dist/live/run.js --only live-click-routing
nub apps/playground/dist/smoke/run.js          # end-of-task: full headless registry
nub run check && nub run lint && nub run test
```

The first focused run is expected to differ from the hypotheses. Read each
`expected … got …` line, set the **measured** value in the code, rebuild, and
re-run until green. Never weaken a check to force a pass; assert the value by
name and record the hypothesis that was wrong.

## 5. Expected result

- `click-routing` green with the inline cases; the suite total grows by 15
  checks (8 assertions plus the seven structural "is painted" checks each
  `expectSome` emits) and the live twin by 12.
- Both hosts agree on every case, or the difference is named and both measured
  behaviours are asserted (plan 724's precedent).
- Scoped mutation proofs observed and reverted (§6), each `exit 1` and naming
  its check.
- Full headless registry green (`107/107`, exit `0`); `check`/`lint`/`test`
  green. The full live suite is a merge gate and is **not** run for this task.

## 6. Test plan and mutation proofs

The scenario checks **are** the test: each one reads a counter from the view and
fails by name. Prove they can fail, by mutation, then revert each:

- **M1** — remove `cr-labelbox`'s `onClick`: case 1 must fail
  (`expected label=1…`, got all zero).
- **M2** — paint a `backgroundColor` on `cr-textbtn` (so the label owns a
  painted box) *if* case 6 measured "the ancestor is the hit target": the check
  must fail. If case 6 already measured the text's own handler, this mutation is
  a null result and is recorded as one.
- **M3** — move `cr-abs` from `position: "absolute"` to in-flow: the case 2
  check must fail if §2's measured difference is positional; if it does not, the
  difference is not position and the recorded rule must say so.
- **M4** — give `cr-badge` its own `onClick` counter: case 4 must fail (the
  painted child then takes the click alone).

A mutation that passes is a **null result**: record it with the measurement it
disproves instead of deleting the check.

## 7. STOP conditions

- A `<text testId>` is not found by `ctx.host.click`/`bounds` in either host, or
  has no bounds: record the exact failure and use `clickWindow` at a declared
  point **only** if the box's own bounds are readable; otherwise STOP and report.
- The JSX types refuse `onClick` on `<text>`: drop case 6, record the type error
  verbatim, and keep cases 1–5.
- Any existing plan-724 counter, string or check changes meaning: STOP — this
  plan is additive.
- A case is non-deterministic across three focused runs: record all three
  results and STOP rather than adding a wait that hides it.

## 8. Report

**Measured, both hosts agreeing.** An in-flow `<text>` is **not** a hit
target: the click reaches the painted ancestor's handler (`label=1`), and a
`tabIndex=0` ancestor takes native focus (`cr-row`). A `<text>` that owns
`onClick` **is** a hit target and runs alone (`textbtn=1`). An **absolutely
positioned** `<text>` is a hit target and, with no handler, swallows the click
(`abs=0`, nothing runs) — the plan-724 observation, now reproducible. A
`<code>` surface is not a hit target (`code=1`, the box runs). A label inside a
painted handler-less child is swallowed by that child (`badgebox=0`).

**Mutation proofs observed and reverted**, all `exit 1` and by name:

| # | Mutation | Failure |
| - | -------- | ------- |
| M1 | remove `cr-labelbox`'s `onClick` | `an in-flow label inside a handler box routes to the box: expected "label=1 …", got "label=0 …"` |
| M2b | remove `cr-textbtn`'s `onClick` | `a text element can own a click handler: expected "… textbtn=1", got "… textbtn=0"` |
| M3 | make `cr-abs` in-flow (`position`/`left`/`top` removed) | `an absolutely positioned label does not reach its handler box: expected "… abs=0 …", got "… abs=1 …"` |
| M4 | give `cr-badge` its own `onClick` | `a label inside a painted handler-less child is swallowed: expected "… badgebox=0 …", got "… badgebox=1 …"` |
| M5 | remove `cr-row`'s `tabIndex` | `a label inside a focusable clickable row focuses the row: expected "cr-row", got "cr-reset"` |

**Null result:** the plan's M2 (paint a background on `cr-textbtn`) **passed** —
a text run's hitbox is not decided by its background, unlike a `<div>` (plan
724). The check was not weak; the mutation was meaningless, so it is recorded
rather than replaced.

**Runs.** `click-routing` 18 → **33 checks**, `live-click-routing` 13 → **25**;
three consecutive focused green runs per host (`click-routing` 4443/4508/4464 ms,
`live-click-routing` 2947/2995/3000 ms) plus the five mutation runs. Full
headless registry **107/107**, **3935 checks**, 65 capabilities, 167.9 s, exit
`0`; `nub run check`/`lint`/`test` green. Live registry stays **96**; the full
live suite was not run (merge gate).

The count is arithmetic: 8 assertions + 6 `inlineCaseOf` "is painted" checks +
1 "the inline last target is painted" check = 15 headless; the live twin adds 6
assertions + 6 "is painted" checks = 12.


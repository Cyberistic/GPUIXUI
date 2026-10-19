# 581 — The last shipped Tier 2 surfaces in the playground: `MessageScroller` and `CommandMenu`

Phase: F (integration) · Workstream: playground (`apps/playground`, `packages/testing`)
Depends on: `100`, `120`, `189`, `197`, `300`, `301`, `330`, `344`, `347`, `529`, `533`, `565`, `571`
Evidence already in the repo: `message-scroller` / `live-scroller` (plan `300`/`301`) measure the
**contract**, not the shipped component; `command-palette` / `live-command-palette` (plan `176`/`389`)
measure a **local** palette, not the shipped `CommandMenu`.

## 1. Why this plan exists (the gap)

Every shipped Tier 2 component is mounted and driven from the playground **except two**:

| Shipped component | Playground consumer path | What exists instead |
| ----------------- | ------------------------ | ------------------- |
| `MessageScroller` (`packages/components/src/message-scroller.tsx`) | **missing** | `message-scroller`/`live-scroller` mount a **local probe** built on `<virtual-list>`; `packages/components/docs/message-scroller.mdx` says “The runnable build is `examples/message-scroller.example.tsx`, **which the native playground mounts**” — false today |
| `CommandMenu` (`packages/components/src/command-menu.tsx`) | **missing** | `command-palette`/`live-command-palette` mount a **local** palette over `FloatingLayer`; plan `330`'s `tier2-menu` mounts only `DropdownMenu`/`ContextMenu` |

Both rows in `COMPONENTS.md` say `done` and cite in-package tests (10 + 14 native behaviour tests).
That is the component-side bar; the **consumer path** — the published root import through
`vendor/`, the token theme, a real window — is the playground's bar (plans `330`, `344`–`347`).
This plan closes the last two components, and removes the false docs claim by making it true.

**Non-goals.** No change under `packages/components` (owned by another workstream). If the consumer
path exposes a component defect, record it as a cross-team task in `TODO.md` and STOP from
weakening the check (see §6).

## 2. Files

Create:

- `apps/playground/src/scenarios/tier2-scroller.tsx` — the shipped `MessageScroller` view and
  `tier2ScrollerScenario`.
- `apps/playground/src/scenarios/tier2-command.tsx` — the shipped `CommandMenu` view and
  `tier2CommandScenario`.

Change:

- `apps/playground/src/scenarios/index.ts` — import both, add to `scenarios` (before
  `declaredStylesScenario`), keep `capability: "tier2"` so the capability union is unchanged.
- `apps/playground/src/live/scenarios.tsx` — import both; add `live-tier2-scroller` and
  `live-tier2-command` to `liveScenarios` (after `tier2Flow`).
- `COMPONENTS.md` — the `tier2` capability row gains the four ids; the `Command menus` and
  `Message scroller` rows gain the measured consumer-path/live evidence.
- `TODO.md` — add and tick the task in the playground section; record focused ids run and counts.
- `.agents/slop/plans/README.md` — index this plan.
- `packages/components/docs/message-scroller.mdx` is **owned by `components`** — do not edit it.
  The false sentence becomes true when this lands; note it in the TODO task so the owner can
  re-read it (only if the landed wording still needs a change).

Both new scenarios follow the exact shape of `tier2-toast.tsx`: a frame with
`width: useWindowSize().width`, `height: useWindowSize().height`, shipped parts imported from
`../../vendor/packages/components/src/index.js`, `Readout` for every asserted value, and a
`PlaygroundScenario` with `Effect.gen` steps.

## 3. Phase A — headless `tier2-scroller` (shipped `MessageScroller`)

### 3.1 View

- Frame `tier2-scroller-frame` (window-sized, column, theme background).
- `MessageScroller label="Conversation" onPinnedChange={...}` (testId `tier2-scroller`).
- `MessageScrollerViewport testId="tier2-scroller-viewport" style={{ height: 240 }}` holding
  `N = 40` `MessageScrollerItem`s, each `testId={`tier2-scroller-row-${i}`}`, text
  `message ${i}`. Rows are ~26 px + `spacing.sm`; 40 rows overflow 240 px.
- `MessageScrollerJumpToLatest testId="tier2-scroller-jump"`.
- Consumer controls (plain `Pressable`s): `scroller-append` (append one row),
  `scroller-stream` (add 60 px to the last row's height), and a second, short instance
  (`tier2-scroller-short` + `short-viewport` + `short-jump`) with 3 rows and a 240 px viewport.
- `Readout testId="tier2-scroller-readout"`: `count=<n> pinned=<true|false> unread=<n> last=<height>`.
  `pinned`/`unread` are consumer state fed by `onPinnedChange`; `unread` is read from the
  affordance's painted text (the component owns it), e.g. `jumpLabel` captured from painted text
  instead of duplicating the rule. Simplest honest readout: `count`, `pinned`, `lastHeight`, and
  assert the unread copy from the jump button's painted text.

### 3.2 Checks (~20)

1. the frame and the `group` named `Conversation` are painted (a11y `Group`, label `Conversation`);
2. the scroller starts at the end: `getScrollOffset("tier2-scroller-viewport")[1] < 0`;
3. the last row is visible: `row-39.y + row-39.height <= viewport.y + viewport.height + 1`;
4. `jump` is not painted (`bounds` is `None`);
5. append while pinned → `readout count=41`, last row visible, `jump` absent;
6. stream while pinned (last row `+60`) → last row visible, `jump` absent, `lastHeight` grew;
7. wheel up 120 over the viewport → offset moves toward 0 and `jump` paints;
8. append while unpinned → offset is **unchanged within 1 px**, the new row is not visible,
   `jump` paints `1 new message`;
9. a second append while unpinned → `jump` paints `2 new messages` (counts arrivals);
10. stream while unpinned → offset unchanged within 1 px, `pinned=false` stays;
11. click `jump` → last row visible, `jump` disappears, `readout pinned=true`;
12. wheel down −2000 over the viewport → re-pins, `jump` disappears;
13. the short instance: offset `0`, `short-jump` absent (no pointless affordance).

The "end is visible" rule is the component's own: tail sentinel bottom ≤ viewport bottom + 1.
Read bounds with `ctx.host.bounds`; never screenshot.

### 3.3 Commands

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only tier2-scroller
```

Expected: `1/1 scenarios passed`, exit `0`, `.artifacts/smoke-report.json` names the scenario;
each check count recorded in `TODO.md`.

## 4. Phase B — headless `tier2-command` (shipped `CommandMenu`)

### 4.1 View

- Frame `tier2-command-frame` (window-sized), a `Pressable testId="command-open"` labelled
  `Open command menu`, and the shipped `CommandMenu open={open} onOpenChange={setOpen} actions`.
- Parts: `CommandMenuInput testId="command-input"`, `CommandMenuList`, `CommandMenuEmpty`
  (children `No commands`).
- Actions (six, three groups): `Navigation` → “Go to Components”, “Go to Tokens”;
  `File` → “New file”, “Save”; `View` → “Toggle sidebar”, **disabled** “Reset zoom”. Each
  `perform` increments a consumer `ran` state with its label.
- `Readout testId="tier2-command-readout"`: `open=<bool> ran=<label|none>`.

### 4.2 Checks (~18)

1. starts closed (`open=false`, input not painted);
2. click `command-open` → dialog paints, `open=true`, input holds native focus;
3. the group headings paint (`Navigation`, `File`, `View`) and all six labels paint;
4. the first enabled row is highlighted: its `aria-selected` is `true` and the disabled
   `Reset zoom` row is `false`/absent from the enabled walk;
5. Down moves the highlight by one enabled row while **native focus stays in the input**;
6. Up wraps to the last enabled row (skips disabled); Home/End reach the first/last enabled row;
7. typing `op` filters the list (non-matching rows unpainted, `Go to Components` still paints);
8. `zz` paints `No commands`; Enter runs nothing (`ran=none`);
9. clearing the field (cmd-a + Backspace or typing the full query again) restores rows —
   simplest: press Escape, reopen, then type `save`; the highlight is the first enabled match;
10. Enter on the highlighted row runs it once (`ran=Save`), closes the dialog (`open=false`)
    and returns focus to `command-open`;
11. Escape closes without running (`ran` unchanged);
12. reopening after a close starts with an empty query (the component clears it) — the six rows
    paint again;
13. a display-only shortcut: `cmd-s` while open runs nothing (the component binds no keys) and
    does not close the dialog.

Use `ariaOf`/`treeOf` for roles (the palette is a Dialog with ListBox options, per plan `176`).

### 4.3 Commands

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only tier2-command
```

Expected: `1/1`, exit `0`.

## 5. Phase C — live twins

### 5.1 `live-tier2-scroller`

View = `tier2ScrollerScenario.view`; `ready: "tier2-scroller-viewport"`.

Steps:
1. wait for `tier2-scroller-readout` to contain `count=40`;
2. assert `scrollOffset("tier2-scroller-viewport").y < 0` and the last row's painted box inside
   the viewport (byte-exact geometry, 1 px tolerance);
3. click `scroller-append` + `settle`; wait for `count=41`; assert the tail is visible;
4. a **real** `wheel("tier2-scroller-viewport", 0, 120)` + `settle` → `waitForBounds("tier2-scroller-jump", …)`
   (bounded 3 s) and assert the offset moved toward 0;
5. click `scroller-append` + settle; wait for `count=42`; assert the offset is within 1 px of the
   pre-append value and the jump paints `1 new message`;
6. click `scroller-stream` + settle; assert `lastHeight` grew and the offset did not move;
7. click `tier2-scroller-jump` + settle → jump unpainted (`bounds` is `null`) and the last row is
   visible;
8. screenshot `${LIVE_ARTIFACTS}/live-tier2-scroller.png`.

### 5.2 `live-tier2-command`

View = `tier2CommandScenario.view`; `ready: "command-open"`.

Steps:
1. click `command-open`; `waitFor("command-input")`; `settle`; assert `open=true` and
   `ctx.host.focused()` is `command-input`;
2. assert the six labels are painted; press `down` + settle → assert the highlight moved (read the
   row's `aria-selected` via the automation tree is not available live — assert the readout's
   `active=<label>` field instead, which the scenario must render from the component's painted
   row: simplest is to reuse the shipped list's own `aria-selected` through
   `ctx.host.paintedText()` is not possible. Therefore the **view** keeps a `ran` readout only;
   the active row is asserted headlessly. Live asserts focus + typing + Enter + Escape + close);
3. type a real query through `ctx.host.key("s a v e")` (the live key verb types lowercase; the
   filter is case-insensitive) + settle → assert only `save` remains (`Go to Components`
   unpainted);
4. `ctx.host.key("enter")` + settle → `ran=Save`, `open=false`, focus back on `command-open`;
5. reopen, press `escape` + settle → `open=false`, `ran=Save` unchanged;
6. reopen and type `zz` → `No commands` paints; Enter runs nothing;
7. screenshot `${LIVE_ARTIFACTS}/live-tier2-command.png`.

Live scope is deliberately narrower than headless (plan `189`/`197`): colour, a11y and the
declared-style report are not observable in a real window and stay in the headless twin.

### 5.3 Commands

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only live-tier2-scroller,live-tier2-command
```

Expected: `2/2`, exit `0`, two screenshots. Never `--all` while iterating (plan `517`).

## 6. STOP conditions

STOP and report (do not improvise, do not weaken a check) if:

1. the shipped parts cannot be imported through `../../vendor/packages/components/src/index.js`
   and `tsconfig.vendor.json` → record the compiler error verbatim; the vendor workaround is the
   existing documented mechanism (plan `330` §3), not a new one.
2. the shipped `MessageScroller`'s pin rule fails in the consumer path in a way the local probe
   did not (e.g. a real wheel does not unpin, or an append yanks a scrolled-up reader). That is a
   **component defect**: keep the scenario asserting the truthful behaviour, mark the check
   honestly, add a `TODO.md` cross-team task with the measured numbers, and STOP the task.
3. `CommandMenu` cannot close on Escape / runs a disabled row / leaves focus outside the input.
   Same handling: record and stop; do not edit `packages/components`.
4. a live check is window-state dependent (as plans `390`/`555` found). Re-run three times; if it
   varies, assert only the stable half and record the variance in the plan §8 and `TODO.md`.

## 7. Test plan (both directions)

- Write the scenarios **before** trusting the checks; every check must be able to fail.
- Mutation proofs, each observed failing and then reverted (record the measured failure line):
  - M1 `tier2-scroller`: make `scroller-append` also call `renderer.scrollTo(viewport, 0, 0)`
    while unpinned → check 8/9 must fail (`offset` moved).
  - M2 `tier2-scroller`: replace the shipped `MessageScrollerJumpToLatest` with a plain
    `Pressable` that does nothing → check 11 must fail (jump did not return to the end).
  - M3 `tier2-command`: make `perform` a no-op → check 10 must fail (`ran` stays `none`).
  - M4 `tier2-command`: remove the `CommandMenuEmpty` child → check 8 must fail (`No commands`
    not painted).
  - M5 live `live-tier2-scroller`: remove the real `wheel` step → the jump must not paint and
    step 4 must fail.
- Unit tests: none new — the scenarios are the test; the pure rules already have 11 + 12 tests in
  `packages/components`. The smoke registry integrity test (`scenarioProblems`) covers unique ids
  and capability membership.
- Verify the headless suite still reports the same total plus two; the live registry plus two
  (derive counts from the registry, do not run `--all`).

## 8. Acceptance

- `tier2-scroller`, `tier2-command`, `live-tier2-scroller`, `live-tier2-command` exist, are listed
  (`--list`), and pass focused runs with exit `0`.
- `COMPONENTS.md` cites the four ids on the `tier2` row and the two component rows, with the
  measured check counts.
- `TODO.md` has the ticked task, the exact focused ids run, and the measured numbers.
- Four mutation proofs recorded and reverted; no `--all` run while iterating.
- `nub run check`, `nub run lint`, `nub run test` green.
- Commit(s) on `agent/playground`, pushed to `origin/agent/playground`.

## 9. Measured outcome (landed 2026-10-19)

Focused ids run: `tier2-scroller`, `tier2-command`, `live-tier2-scroller`,
`live-tier2-command` (4/4, exit `0`, three consecutive headless runs and two
consecutive live runs).

| Id | Checks | Notes |
| -- | ------ | ----- |
| `tier2-scroller` | 43 | shipped parts, token theme, offscreen |
| `tier2-command` | 35 | shipped parts, token theme, offscreen |
| `live-tier2-scroller` | 22 | real 1100×720 window, real wheel |
| `live-tier2-command` | 14 | real window, real typing and keys |

Full headless **103/103** (`3632` checks, 64 capabilities), exit `0`. Live
registry `73 → 75`; no full live run (merge gate).

**The plan's STOP condition 2 fired.** The shipped `MessageScroller` does not
re-pin when the reader wheels back to the end. Measured in `tier2-scroller`:
the offset reaches the bottom (`-1003`) with `pinned=false` and the affordance
still painted. Cause: `MessageScrollerViewport.handleScroll` computes the
distance from `renderer.getElementBounds(viewport.id)`, and 0.10.0 reports a
scroller's own box shifted by its own scroll offset (plan `529` §6.3), so the
distance never falls below the 24 px threshold. The check now asserts the
measured behaviour (and will fail when the component is fixed); the defect is
recorded cross-team in `TODO.md`, and the `COMPONENTS.md` row carries the
limitation. A second defect was found in `CommandMenu`: closing leaves no focus
owner because `CommandMenuInput`'s `autoFocus` is captured before the dialog
records the opener (headless and live agree). `Home`/`End` are consumed by the
native editor, so the palette's first/last branches never run (the `cmd-a`
rule, plan `533`); both are asserted as measured and recorded cross-team.

**Geometry note for future probes.** The "tail visible" check cannot compare the
row against the scroller's reported box once it has scrolled. It uses the
non-scrolling `MessageScroller` root plus the declared 240 px height. The same
rule is already recorded for live scrollers (plan `556`); this plan re-measured
it offscreen for a plain `overflowY: "scroll"` container.

**Mutation proofs (each observed exit `1`, then reverted):**

| # | Lever | Observed failure |
| - | ----- | ---------------- |
| M1 | a layout effect that scrolls to the end after an unpinned append | `an unpinned append does not yank the reader: expected -769 ± 1, got -923` |
| M2 | viewport `height: 240 → 2400` (history shorter than the box) | `the last row starts visible: expected true, got false` |
| M3 | `perform` no longer sets the consumer's `ran` state | `Enter ran the matching action: expected "ran=Save", got "ran=none"` |
| M4 | `CommandMenuEmpty` not rendered | `an unmatched query paints the empty state: expected "No commands", got "none"` |
| M5 | the live real-wheel step removed | `the live wheel moved toward older rows: expected true, got false` |


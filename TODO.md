# TODO.md — the persistent source of truth

This file is how work resumes after a context compaction, a restart, or a new
agent. Tick items as they finish. Add categories as plans land. If a task is not
here, add it and tick it. Implementation details do not belong here — only tasks
worth tracking.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled

---

## Harness — the supervisor that keeps the swarm alive

`[x]` `[█████████░]` 6/7

`[x]` Repo on `proserver` with the required shape, mission, rules and plan index
`[x]` opencode 2.0.31 installed with the provider credentials and a trimmed config
`[x]` Verified a real run on `opencode-go-braven/deepseek-v4.1-flash`
`[x]` Supervisor: 30-minute tick, ≥5 agents, one worktree each, idempotent and crash-safe
`[x]` Scheduler installed (launchd agent + daemon driver; see `.agents/slop/README.md`)
`[x]` Model fallback chain with limit detection, one active model for the whole swarm, and an hourly recovery probe (see `scripts/README.md`)
`[ ]` Enforce one live session per worktree: the `opencode run` loop currently
starts a new session before the previous one closes (evidence:
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`; the guard is
planned in `primitives` plan 022, `022-swarm-single-writer.md`)

---

## Phase A — audit and feasibility

`[~]` `[███░░░░░░░]` 3/7

`[x]` Inspect the environment, package manager and toolchain; record the findings
`[x]` Establish the GPUix version, APIs, primitives, events, layout and limits
`[x]` Read GPUix docs and examples; write the capability map
`[~]` Inspect GPUI Kit (hierarchy, theming, layout, interaction, licence)
`[ ]` Study shadcn/ui organisation and semantic tokens; review PanelUI; review Fumadocs setup
`[~]` Write and index every phase and package plan in `.agents/slop/plans/`
`[x]` **Blocker B1 resolved: the GPUix runtime runs on this machine.** The
      `darwin-x64` 0.10.0 binding is built from source with
      `gpui_macos/runtime_shaders` and the native suite runs on it — plan `140`,
      ADR 0003. The original evidence and the three honest routes are kept in
      `.agents/slop/plans/020-gpuix-runtime-capability.md` §3; the wasm path
      remains a docs-site question (D21), not native evidence.
`[!]` **BLOCKER B3: several live agents are writing the same worktree.** Measured
      2026-10-17 07:40: 5 live `swarm:primitives` sessions (and 2–6 for every
      other workstream) editing `workspaces/primitives` concurrently, clobbering
      each other's files. `scripts/swarm-supervisor.sh`'s runner loops
      `opencode run` without a session id, so each CLI return leaves a live turn
      and starts another. Evidence, mitigation and the fix:
      `.agents/slop/plans/022-swarm-single-writer.md`. Fix lives in `scripts/`
      (shared checkout) — needs a coordinator or the human.
      **Update 2026-10-17 08:40:** the primitives tree is back to one writer —
      the duplicate session was removed (§4) after the tree was committed, and
      the tree then went green (`nub run check`, 133 + 18 tests). The runner
      **still forks a new session per loop iteration**, so every workstream will
      re-acquire a duplicate until §5.1 lands in the shared `scripts/`.
      **Update 2026-10-19 06:34:** the recurrence reached `workspaces/playground`
      — a second live `swarm:playground` session (PID `94630`) committed
      `b15f9dad` and `74427df5` over this session's uncommitted edits and swept
      them into its commits. The result is consistent (the same plan and the same
      fix), but the tree was written by two agents and neither noticed the other
      until `git log` showed it. Still needs the supervisor fix.

### Playground workstream (`apps/playground`, `packages/testing`)

`[x]` `[██████████]` 104/104 plans-and-harness

`[x]` Prove **Tabs' vertical axis through the consumer path** per plan `633`:
      the shipped `orientation="vertical"` had package tests but neither
      `tier2-navigation` nor `live-tier2-navigation` set it. A vertical fixture
      now proves the rail stacks with the panel beside it, `End`/`Home` seed the
      roving index, `Up`/`Down` skip the disabled row and wrap, `Right`/`Left`
      are inert, the disabled trigger is not a tab stop, and each selected panel
      replaces the last — **55 → 78 checks**. `live-tier2-navigation`
      (**20 → 26**) proves the stack, a real click, native focus and the inert
      disabled row in the 1100 × 720 window. Measured: a headless
      `keyDown(trigger)` bubbles to `TabsList`; the window does not (plan `344`),
      so arrows stay headless. Six mutation proofs observed and reverted
      (vertical root/list arms, inverted deltas, a lateral fallback, an ignored
      `delta`, and the live `orientation` removed). Focused ids run:
      `tier2-navigation`, `live-tier2-navigation`; then the full headless
      **104/104** (**3695** checks), exit `0`, plus `nub run check`, `lint`,
      `test` (playground 424).

`[x]` Prove the **native text-entry contract in a real window** per plan `624`:
      `live-text-entry` (**71 checks**, three consecutive focused runs, ~6.9 s)
      reuses plan `188`'s `text-entry` view in the real 1100×720 window and reads
      the probe's React readout, because the live tree carries no accessibility
      `value` (plan `197`). Measured: `axbc` after two Lefts and an insert,
      `0axbc` after Home, `0axbc9` after End, Backspace back to `0axbc`,
      `shift-left` twice then `q` → `0axq`, `cmd-a` then `w` → `w`, an empty
      field after the last Backspace, `readOnly` keeping native focus and its
      painted `locked` run while refusing the edit (`lockedEdits=0`), the
      placeholder painted only while empty, the secret painted in clear, a
      `158` px field still `158` px after 40 characters, and a textarea at
      `64 → 116 → 168` px, clamped at `168` for seven lines. **Two measured
      harness facts:** one 40-key `keystrokes` call painted all 40 characters
      while the controlled value stayed empty (the value was never committed),
      so the twin types one key per call; and `paintedText()` returns whole
      element lines, so the read-only check compares the field's run exactly
      (the readout's `lockedEdits=0` token would make a `contains` check
      vacuous). Five mutation proofs (remove `readOnly`, remove the placeholder,
      fixed textarea height → `64 ± 1, got 62`, `maxRows={2}` → `116 ± 1,
      got 64`, a content-growing width → `158 ± 1, got 318`) and one null result
      (removing `width: 160` passes, because the check compares before/after).
      Live registry `89 → 90`; headless unchanged at **104/104** (`text-entry`
      stays 56 checks). The view gained one readout token, `wideLen`, so the
      live twin reads the **committed** value. Focused ids run:
      `live-text-entry` (×3), `text-entry`; then the full headless registry
      (**104/104**), the full live merge gate (**90/90**, 2330 checks, 59
      capabilities, 881 s) and `nub run check`/`lint`/`test` (playground 424).

`[x]` Prove the **toast viewport's layering and focus contract in a real window**
      per plan `623`: `toast` was one of the last capabilities with only
      `TestRenderer` evidence for its hit-testing and stacking mechanism.
      `live-toast` (**38 checks**, green twice focused) reuses plan `183`'s
      `toast-lifecycle` view in the real 1100×720 window: a click on the page
      control under the viewport's `pointerEvents: "none"` strip lands
      (`under=1`), a painted card owns its box and the surface below never sees
      the click (`behind=0`), a toast pushed from the focused field's
      `onSubmit` leaves focus there and `focusNext` lands on a
      `toast-dismiss-*` control, Escape leaves the stack alone, a synchronous
      dismissal stays laid out while the clock is frozen and leaves after one
      `fastForwardMotion(EXIT_MS)` + `settle`, and a real 250 ms timer removes
      only its own card. The 33/41 px insets and 378 px content width are
      **identical** to headless, so the 0.10.0 box needs no live correction.
      **Four mutation proofs** observed and reverted: removing the viewport's
      `pointerEvents: "none"` fails the strip check (`got "under=0"`); painting
      the overlap surface after the viewport fails the covered-card check
      (`got "… behind=1 …"`); a clock jump + `settle` before the frozen read
      fails with `expected a value, got none`; moving the viewport's right edge
      by 8 px fails with `expected 33 ± 1, got 41`. **Two measured null
      results:**
      removing the card's own `pointerEvents: "auto"` changes nothing (it is
      not load-bearing), and a clock jump without a following `settle` still
      reports the card (the removal read needs the commit). Focused ids run:
      `live-toast` (twice), `toast-lifecycle`; then the full headless registry
      **104/104** (**3672** checks, 64 capabilities) and `nub run check`,
      `nub run lint`, `nub run test` green (playground 424 tests). Live registry
      `88 → 89`. **The full live suite was not run** (merge/release gate).

`[x]` Fix the **live-toast fixture budget** the first full gate exposed
      (plan `623` §10): the gate after plan `624` failed exactly one check —
      `dismissing removes exactly the clicked card: expected "count=2", got
      "count=1 … dismissed=Toast 3"` — because the probe's long-lived cards had
      `durationMs: 5000` and a toast's timer is real JS time even while the
      GPUI motion clock is paused (plan `337`). Under full-suite load the first
      card expired before the dismissal step, so the queue held two cards and
      dismissing one left `count=1`. The fixture is now `LONG_MS = 60_000`
      (the deliberately short `SHORT_MS = 250` card still proves the timer
      path). **Two-direction proof:** with `LONG_MS = 5000` and a temporary 6 s
      sleep before the dismissal the check fails `exit 1` (`got "count=0 …"`);
      with `60_000` and the same delay it passes all 38 checks; the sleep was
      removed, and `live-toast` is green twice focused with `toast-lifecycle`
      green at 56 checks. No assertion was weakened.

`[x]` Prove the **cost model's retention half in a real window** per plan `620`:
      `live-scale` reuses plan `302`'s `scale-cost` view and adds
      `AsyncSmokeHost.retainedNodes()` over the automation tree (the same tree
      the focus bridge walks). Measured in the `1100×720` window: 2,000 rows
      retain **6,019** nodes and 100 retain **319** — the delta is exactly
      `3 × 1,900 = 5,700`, the same **3 nodes per row** as the headless host
      counter, plus a constant **7** chrome nodes; `scrollToItem(1000)` paints
      row 1000 and unpaints row 0 at an **unchanged** count, and shrinking then
      regrowing restores `6,019`. So paint is windowed and memory is not. The
      syntax-cache half stays headless: the automation protocol has no cache
      verb and `GpuixRenderer` exposes no counter. `live-scale` is **17 checks**,
      green twice after the reverts; `scale-cost` control green at 36. Three
      mutation proofs: painted-text-as-retention fails `the live tree retains a
      node per row` (`expected true, got false`), a `+1` per-row constant fails
      the delta (`expected 7600, got 5700`), and a root-only `countNodes` fails
      the unit test (`expected 1 to be 5`). Playground tests gain **4**
      (`tree.test.ts`); live registry `87 → 88`, headless unchanged `104`.
      Focused ids run: `live-scale`, `scale-cost`; then the full headless
      **104/104** (**3672** checks, 64 capabilities) and full live **88/88**
      (**2220** checks, 58 capabilities, 921.7 s), both exit `0`. `nub run check`,
      `nub run lint` and `nub run test` green (playground 424 tests).

`[x]` Probe the **window selection-change signal** per plan `615`:
      `onSelectionChange` was the last published window-level handler with no
      evidence. `selection-signal` (**19 checks**) and `live-selection-signal`
      (**31**) register it through a `useSelectionChange` seam (the
      `useWindowKey` shape — a component cannot reach the root options) and
      drive one copy affordance entirely from the event. Measured: `value` is
      the joined selected text and is **absent** for an empty selection; a
      clear (`clearSelection` and a click) **notifies**; one drag delivers
      **several** events (1–3 headless, ~8 live), so a view treats it as "the
      selection changed, here is the text", never a gesture count. **The
      load-bearing trap:** a click on the affordance clears the selection —
      headless the clear lands **before** `onClick` (`D S(-) C`), live **after**
      it (`D C S(-)`), so reading state in the handler copies nothing headless
      and only happens to work live. The recipe is a pointer-down snapshot of
      the last event text (D88). Three mutation proofs: removing the headless
      seam (`the drag reported a change` fails), `String(event.value)` (the
      mapper unit test fails with `undefined`), and reading `selected` in the
      copy handler (fails headless, passes live — the measured difference); a
      fourth removes the live `onSelectionChange` (`the live drag reported a
      change` fails). Focused ids run: `selection-signal`,
      `live-selection-signal`; then the whole headless registry
      **104/104** (**3672** checks, 64 capabilities) and the whole live registry
      **87/87** (**2203** checks, 57 capabilities, 932.5 s), both exit `0`.
      Also verified: `nub run check`, `nub run lint`, `nub run test`.

`[x]` Reset the **data-grid anchor in the row-set update** per plan `607`:
      the first full live gate on the plan-`606` head failed exactly one check
      (`the live sort resets the anchor: expected 0, got 45`) while three
      focused runs passed. The probe reset the list in a `useEffect`, so the
      paint carrying `sort=desc` still windowed rows 45–53 of the new order and
      the scenario read that paint under load. One `restart()` now runs from
      the sort click, the filter `onChange` and `clear`, so the row set and
      `anchor=0` are one update (the `data-toolbar` shape). Focused
      `data-grid-virtual` (59 checks) and `live-data-grid` (83, three runs)
      green; full headless **103/103** (**3653** checks, 64 capabilities) and
      full live **86/86** (**2172** checks, 57 capabilities, 932.7 s), both
      exit `0`. Ids run: `data-grid-virtual`, `live-data-grid` (×3), then the
      whole headless and live registries.

`[x]` Prove the **virtualized, panned data grid in a real window** per plan
      `606`: `data-grid-virtual` was the last Tier 3 composition with no live
      twin (`live-grid` drives plain rows; `live-data-grid-columns` asserts a
      resize over this view but not the composition). `live-data-grid`
      (**83 checks**, two consecutive focused runs, exit `0`) mounts plan
      `338`'s view in the real 1100×720 window: a vertical wheel virtualizes
      the `<virtual-list>` body (anchor `10`, header and pan unchanged), a
      header `deltaX` wheel pans header and body together (`-90`, then `-400`
      at the far edge) with the frozen column still, a panned body cell selects
      its row and takes native focus, the frozen row follows
      `getListScrollTop`, a filter from anchor 45 narrows `60 → 11` and resets
      to 0, and a sort from 45 resets and flips (`Item 059` / `Item 000`).
      **Two measured rules:** a `deltaX` wheel over a body **cell** pans the
      scroller live (`-400 → -310`) while the offscreen runtime swallows the
      same verb (plan `338`) — a harness difference, so the headless suite
      keeps using the affordance; and a live wheel sent in the same protocol
      step as its pointer move can land at the old position, so every wheel is
      preceded by `hover` + `settle` (the difference between two green runs and
      four failures). M1 (no anchor reset), M2 (frozen column off by one) and
      M3 (no `overflowX`) fail as predicted; M4 (`ROW_HEIGHT 28 → 30`) first
      **passed**, so the twin gained a row-height and row-pitch check and now
      fails at `expected 28 ± 1, got 30`. Live registry `85 → 86`; headless
      unchanged at `103/103`, control `data-grid-virtual` green (59 checks).
      Focused ids run: `data-grid-virtual`, `live-data-grid`.

`[x]` Prove the **QR rendering recipe in a real window** per plan `599`:
      `qr-code` (plan `518`) was the last capability with only `TestRenderer`
      evidence — a 226-node absolute module grid, an SVG alpha mask and an SVG
      data-URL image. The live twin `live-qr` (45 checks) asserts the
      matrix-relative geometry (`174 × 174`, quiet `+24`, module `6`, finders
      `+60`/`(42, 42)`), the absent light module, a real module click
      (`hit=r3c3`), both single-node routes at `174 × 174`, the clean remount
      and the v4 scale (`164`, `+16`, `4`); colour, the retained-node cost and
      the `Image` a11y node stay headless (plan `197`). Six mutation proofs
      observed and reverted; registry `83 → 84`; re-verified focused
      `--only live-qr` green after the closing ledger edit.

`[x]` Harden the **live InlineEdit blur entry** per plan `600`: the plan-`599`
      merge gate's only failure (`a click away commits the open live draft`,
      `name=live commits=1`) came from a coordinate click 200 px into a
      **content-sized** display; when it missed, no editor opened and the Escape
      checks were vacuous too. The scenario now asserts the swapped editor owns
      native focus after all three entries, presses `end` before the appended
      `z`, and asserts the click away reached `ws-elsewhere` before the commit
      check; the coordinate clicks are gone. `live-tier2-editing` is **31
      checks**, green three times focused; M1 (a no-op entry) and M3 (the
      removed click away) fail at the new focus assertions, and M2 (`end`
      removed) is a null result because a fresh input already sits at the end.

`[x]` Assert **both live blur states** per plan `605`: the next gate moved
      native focus away but did not deliver React's `onBlur`, so the editor kept
      its draft and `commits` stayed `1`. `live-tier2-editing` now branches on the
      display: `livez` asserts the commit, `""` asserts the open editor, refocuses
      it and commits the retained draft with Enter. Focused runs take the commit
      branch (**32 checks**, three green); the full gate is **85/85**, exit `0`.
      The same gate exposed a missing wait in `live-query-builder` (a select item
      clicked before its popup painted); the four later opens now wait for their
      content text, focused **41 checks** green. Focused ids run:
      `live-key-routing`, `live-query-builder`, `live-tier2-editing`,
      `focus-traversal`, `tier2-editing`.

`[x]` Prove the **element scroll route in a real window** per plan `601`:
      `scroll-into-view` was the last scroll primitive with only `TestRenderer`
      evidence, and `AsyncSmokeHost` had no `scrollIntoView` at all. The live
      host now exposes it (`idOf` → `renderer.scrollIntoView`) and
      `live-scroll-into-view` (39 checks) mounts plan `166`'s view in the real
      `1100×720` window: `End` focuses and **reveals** row 199, `Home` returns
      to `y = 0`, `scrollToItem(120)` (offset `-1312`) and
      `scrollIntoView(row 10)` both paint their target and leave focus on
      `siv-row-0`, three `Down`s paint and focus row 13, and a second
      `scrollIntoView` paints row 199 without moving focus. **Measured limit:**
      the element route only reaches a row the list has laid out — from the
      anchor at 120, row 20 moved the list, while rows 50 and 100 were no-ops;
      use `scrollToItem` for a far jump. **2/2** focused green after the
      reverts, live registry `84 → 85`; three mutation proofs (a no-op verb,
      the wrong target row, and a verb that also focuses) observed failing and
      reverted. Headless control `scroll-into-view` green at 34 checks.
      Focused ids run: `live-scroll-into-view`, `scroll-into-view`.

`[x]` Correct the **`autoFocus` `onFocus` claim** per plan `603`: the plan-`600`
      gate's only failure was `autoFocus does not run React's onFocus`
      (`innerFocus=1`); the same code read `innerFocus=0` in earlier runs, so the
      `autoFocus` half is as state-dependent as the click half plan `390`
      corrected. The assertion is gone (`live-key-routing` 21 → 20 checks) and both
      counters stay in the readout; native focus, key delivery and the `cmd-k`
      chord are still asserted. **M1** (asserting `innerFocus=1`) failed focused
      with `innerFocus=0`, proving both states; **M2** (a wrong ancestor count)
      still fails. Three focused runs green; the next gate read `focus=verified`
      (the only failure was the unrelated blur check).

`[x]` Prove the **panel and floating-layer primitives in a real window** per
      plan `594`: `live-panel-nested` (30 checks) drives the vertical split
      `180 → 228` and the nested split `300 → 360` without moving the other, the
      sidebar collapsing to painted width **`0`** (not `null`) and restoring
      `160`, a clicked divider taking native focus with Right/Left `376/360`,
      and traversal leaving it. `live-floating` (17) measures the `1100 × 720`
      probe frame, bottom/start content `(209, 175)`, right/start `(335, 129)`,
      the measured `align="center"` defect (content bottom `147`, the anchor's
      centre line) and the edge snap `641..719` instead of a flip. **2/2**
      focused, exit `0`, two green runs after seven mutation proofs
      (M1 `43`, M2 `167`, M3 panel bottom `1727` vs `720`, M4 `outer=360`,
      M5 height `320`, M6 `inner=360`, M7 width `160`); a `side="top"` edge
      mutation **passed** and is recorded as a null result. Live registry
      `81 → 83`; the full live suite was not run (merge gate). Headless controls
      `panel-nested,floating-placement` unchanged; the accessibility half
      (`role`/`aria-valuetext`) stays headless (plan `197`).

`[x]` Prove the **chart recipe in a real window** per plan `593`: `chart-svg`
      was the last Tier 3 rendering recipe with only `TestRenderer` evidence.
      `live-chart` (40 checks) proves the bars (`56` wide, `96/64/32` tall, on
      the baseline, `72` apart), a real click selecting a series, both `<svg>`
      layers at `480 × 160`, a retained-but-unpainted SVG child, and the SVG
      data-URL `<img>` at exactly `480 × 120`. **Finding:** an SVG source keeps
      its declared box live; the raster data URL's 1 px loss (plan `577`) does
      not apply. **1/1** focused, two green runs, live `80 → 81`; three
      mutation proofs observed and reverted; `check`/`lint`/`test` green, full
      headless **103/103** (`3653` checks, 64 capabilities).

`[x]` Prove the **collapsible height recipe in a real window** per plan `592`:
      `live-collapsible` (37 checks) mounts the `collapsible-height` view in the
      real 1100×720 window through the paused live motion clock. Measured:
      `mounted=140` at first layout while the body is clipped to `0`; the 80 ms
      frame moves the next row `56 ± 4` of the 140 px tween (`complete=0`); the
      opened row is `140 ± 1` (`complete=1`); a press aimed at the clipped
      control counts nothing (`presses=0`) while the open control runs
      (`presses=1`); two keys give `draft=ab`, which survives the collapse
      (`complete=2`) and an Enter re-open (`complete=3`); the closed body still
      answers `alpha`. **1/1** focused, exit `0`, four green runs, live registry
      `79 → 80`; three mutation proofs observed and reverted (`overflow` visible
      → `presses=1`; clearing the draft on close → `draft=`; a zero-target
      animation → `56 → 0`). Focused id: `live-collapsible`, headless control
      `collapsible-height`; `check`/`lint`/`test` green.

`[x]` Prove the **layout and typography contracts in a real window** per plan
      `591`: `layout-flex`, `layout-grid` and `typography-layout` were the last
      layout-family scenarios with only `TestRenderer` evidence. The twins
      `live-layout-flex` (11 checks), `live-layout-grid` (77) and
      `live-typography` (32) reuse the same views and reproduce every offscreen
      number exactly: `640/200/320` widths and the `8` px gap; `93.33` tracks
      with `10` px gaps, `145×95` cells and all four `gridColumnMin` modes;
      `30/60` line heights, the `19.5/26/39` default line boxes, a bold run
      > 2 px wider, `alignSelf` `100/200`, `justifyContent` `70`, and
      **`textAlign` still a no-op**. The grid view is **992 px** tall, so the
      twin mounts it in a `WINDOW.height − 80` scroller and reads rows 1–4 at
      rest, rows 5–8 after a real `-400` wheel reaches the `-392` clamp; every
      assertion is container-relative. **3/3** focused, exit `0`, three green
      runs, live registry `76 → 79`; four mutation proofs observed and reverted
      (flex gap `8 → 12`, grid gap `10 → 12`, lineHeight `30 → 24`, reverse
      `flex-end` `200 → 180`). The headless views are unchanged except one
      `type-root` testId. Focused ids run:
      `live-layout-flex,live-layout-grid,live-typography` and the headless
      `layout-flex,layout-grid,typography-layout`; `check`/`lint`/`test` green,
      full headless **103/103** (`3653` checks, 64 capabilities).

`[x]` **Re-run the merge/release gate on the final branch** (2026-10-19): the
      code head `3213388c` (after plan `581`) ran the whole registry —
      headless **103/103** (`3632` checks, 64 capabilities) and live **75/75**
      (`1697` checks, 51 capabilities, 783.8 s), both exit `0` on the
      release-tag binding, so every registered live scenario has now run
      together rather than only in focused batches. `nub run check`,
      `nub run lint` and `nub run test` pass (playground 417 tests; components
      308; primitives 282; tokens 196; tw 103; testing 61; icons 19; docs 7).
      The ledger totals in `COMPONENTS.md` and `apps/playground/README.md` were
      corrected to those numbers, the `scroller` evidence row gained its live
      and shipped-tier-2 ids, and `focus-traversal`'s header now states the
      measured event contract (`onFocus` is not dispatched; `onBlur` is) with
      the scenario re-run green after the comment-only edit, and
      `tier2-navigation`'s two stale `TODO 549` references now point at plan
      `529` and the Tabs re-verify row. No scenario behaviour changed, so there
      is no mutation proof; the full suites are the two-direction evidence.
      Exact ids: the whole headless registry and the whole live registry (last
      focused live ids before this run: `live-tier2-scroller,live-tier2-command`).

`[x]` Close the **last two shipped Tier 2 consumer paths** per plan `581`:
      `tier2-scroller` (43 checks) and `tier2-command` (35) mount the shipped
      `MessageScroller` and `CommandMenu` through the published root and the
      token theme; `live-tier2-scroller` (22) and `live-tier2-command` (14)
      repeat them in the real 1100×720 window. Focused runs `4/4`, exit `0`;
      full headless **103/103** (`3632` checks, 64 capabilities), exit `0`;
      live registry `73 → 75`. Five mutation proofs observed and reverted:
      a compensating scroll on an unpinned append fails the no-yank check
      (`-923` vs `-769`), a viewport taller than the history fails the tail
      check, a no-op `perform` fails `ran=Save`, removing `CommandMenuEmpty`
      fails the empty-state check, and removing the live wheel fails the
      live offset check. Two component defects found and recorded
      cross-team below, and asserted as the measured behaviour.

`[x]` Measure the **`<img>` source contract** per plan `586`: `COMPONENTS.md`
      claimed path + data URL + http(s) were verified, but only data URLs and
      `setImagePixels` had ever run. `native-surfaces` (**61 checks**) and
      `live-content` (**44**) now mount a ref `setImage(bytes)` case (valid
      PNG → readout `ok`, `48 × 48`, no fallback; garbage → the runtime
      **throws** `unrecognized image format`, node keeps `img: no src`,
      `46 × 46`), a real `apps/playground/fixtures/one-pixel.png` path, a
      missing path (live only for the visual) and a refused
      `https://127.0.0.1:1/…` URL. Painted-text totals: `img: no src` = 2,
      `img: load failed` = 1. **Measured limit:** a path/URL load has **no
      assertable signal** — `gpui::img(path|uri)`'s fallback is a plain GPUI
      element absent from `getPaintedText()` and the tree, there is no
      load/error event, and the offscreen loader never settles; the live
      screenshot (red bitmap for the valid path, `img: load failed` for the
      missing/refused) is the only visual evidence. The ledger now says data
      URL + bytes verified, path/URL screenshot-only, with an app-owned error
      state. Focused ids run twice: `native-surfaces`, `live-content`, both
      exit `0`; five mutation proofs observed and reverted (M1 removed upload
      → `got 3`; M3 asserting a path fallback → `expected 2, got 1`; M4 box →
      `expected 32 ± 0.5, got 48`; M5 no live URL node → `got none`). Full
      headless **103/103** (**3653** checks, 64 capabilities), exit `0`; the
      ledger totals moved from 3632. Plan `586` §9.

`[x]` Prove the **document half of search and replace in a real window** per
      plan `587`: `live-search-replace` (48 checks) reuses the `search-replace`
      view in the real `1100×720` window — real typing drives the query
      (`errorx` → `total=0`, Backspace → `5`), the find cursor steps, one
      replace recounts/re-washes (`total=4`, `an fixed follows`), replace-all
      empties the document, reset restores (`fired=1`), a count-preserving
      `ERROR` replace moves the washes without a count event, longer/shorter
      replacements put the survivor at starts `7`/`4`, the length-changing
      replace-all rewrites once, and `<code>` re-highlights by prop. **Measured
      harness trap:** a reset restores `total=5` before the keyed remount
      commits, so the twin waits for `sr-doc-text`; without it the longer/
      shorter checks read zero washes. Six mutation proofs observed and
      reverted (plan §8). Live registry `75 → 76`; focused id run:
      `live-search-replace` (four green, six mutation runs) plus headless
      `search-replace`.

`[ ]` **Cross-team:** any future image-preview component (owner:
      `components`/`primitives`) must own its **error state** — 0.10.0's
      `<img>` exposes no load/error event, a failed path/URL paints only a
      GPUI fallback the app cannot observe, and a bad `setImage` byte buffer
      throws. Read and validate bytes (`FileSystem` + `setImage`) or stat the
      path before rendering; do not cite this suite as path/URL verification
      (evidence: plan `586`).

`[ ]` **Cross-team (defect):** `@gpuixui/components` **MessageScroller** never
      re-pins when the reader wheels back to the end. `tier2-scroller` (plan
      `581`) measured the offset reaching the bottom (`-1003`) with
      `pinned=false` and the affordance still painted. Cause: the viewport's
      `handleScroll` computes `tailBounds.y - (viewportBounds.y + height)`, and
      0.10.0 reports a scroller's own box shifted by its own scroll offset
      (plan `529` §6.3), so the distance never falls below the threshold once
      scrolled. Fix: capture the viewport's rest box before the first
      `scrollToEnd` and reuse it, or derive the distance from a non-scrolling
      ancestor (`ref` on the root). Update `tier2-scroller`'s two
      measured-defect checks to the fixed behaviour. Owner: `components`.

`[ ]` **Cross-team (defect):** `@gpuixui/components` **CommandMenu** closing
      leaves **no** focus owner instead of returning focus to the opener —
      `tier2-command` and `live-tier2-command` both measured `focused=none`
      (plan `581`). Cause: `CommandMenuInput`'s `autoFocus` takes native focus
      in the same commit, before `useModalFocus` records the previous owner, so
      the saved id is the input being destroyed. Fix: drop `autoFocus` (the
      dialog's `initialFocus` already focuses the input) or capture the opener
      before the content mounts; also note that `Home`/`End` never reach the
      palette (the native editor consumes them, like `cmd-a` in plan `533`),
      so the `isFirst`/`isLast` branches are dead on 0.10.0. Owner: `components`.

`[x]` Prove the **drag family in a real window** per plan `580`: `drag-targets`
      and `drag-autoscroll` were the last interaction family with headless-only
      evidence. `live-drag-targets` (20 checks) and `live-drag-autoscroll` (29)
      reuse the plan-162/172 views through the plan-536 press/move/release
      verbs — every held move and the `up` stay on the pressed box, the target
      gets neither, the live gesture ends in a click on the source, three held
      bottom-edge moves scroll exactly three 24 px rows (asserted on the
      **painted row**; the readout alone passed with `scrollTo` removed), a
      top-edge move returns one, the drop index follows, and the plain list does
      **not** auto-scroll. **Measured:** hover settles but its order relative to
      the `up` varies with the source's state-recording move handler (after with
      it, during the hold without it), so the live probe asserts membership and
      the headless freeze stays headless; dropping `pressedButton: 0` is a null
      result for capture (unlike the editor's selection, plan `536`). **2/2**
      exit `0`, three consecutive runs, live registry `71 → 73`; six mutation
      proofs observed and reverted (M2 the null result, M6 how the hover
      variance was found). `nub run check`, `lint`, `test` green (playground
      417); full headless **101/101 (3554 checks, 64 capabilities)**, exit `0`.
      Focused ids run: `live-drag-targets,live-drag-autoscroll` (three times),
      plus each alone for the mutations. §8 records the numbers.

`[x]` Prove the **content surfaces in a real window** per plan `577`: `content`
      was the last core capability with no live twin. `live-content` (28 checks)
      reuses the `native-surfaces` view — the sourced icon's `48 × 48` box, the
      `img: no src` / `img: load failed` fallbacks, a valid data URL and a
      ref-uploaded 2 × 2 bitmap, the 640 px diff with four painted patch lines,
      and `<canvas>` with no bounds and its child out of the paint (the
      retained child still answers `text`). `live-markdown` (19) reuses the
      `markdown-surface` view — GFM blocks as live text, a real drag selection
      across the boundary, a real coordinate link click with prose firing
      nothing, and React children out of the paint. **2/2**, exit `0`, two
      consecutive runs; live registry `69 → 71`; the headless controls are
      unchanged (`native-surfaces` 40, `markdown-surface` 21). Five mutation
      proofs recorded (canvas→div, swap the valid/invalid data URLs, no-op the
      link handler, render the markdown child as a div, shrink the svg), each
      observed failing and reverted. **Measured:** an `<img>` keeps the
      tracker's 1 px-per-axis loss live (`96 × 64` → `94 × 62`). Focused ids
      run: `live-content`, `live-markdown`, `native-surfaces`,
      `markdown-surface`.

`[x]` Prove the **tabbed panes in a real window** per plan `575` and prove the
      nested-scroller wheel guard in both harnesses. The guard had only been
      toggled, never exercised, because the inner's recorded box goes stale after
      an ancestor scroll; the probe now wheels a **painted inner row** with the
      guard on (inner `-240 → -360`, outer `0`) after the chain was proven off
      (`outer -240`). `live-workspace-panes` (39 checks) repeats hidden-pane
      retention, the guard, the tab order and a paced `+60` resize (more rows,
      anchor `30`) in the real 1100×720 window. Headless `workspace-panes` 27
      checks, headless stays **101/101**; live registry `68 → 69`. Five mutation
      proofs (guard forced off → `outer -120`; guard forced on → `outer 0`;
      conditional editor mount → missing marker/draft; no-op drag → `top=240`;
      always-visible slot → hidden rows still paint), each observed and reverted.
      Focused ids run: `workspace-panes`, `live-workspace-panes`; `check`, `lint`
      and `test` green.

`[x]` Prove the **log viewer in a real window** per plan `571`: the Tier 4
      log-viewer follow contract was headless-only and its no-snap-back claim
      was untested. `live-log` (26 checks) reuses the `log-viewer` view behind
      a real `log-viewport` wheel: opening `[30,0]`, a pinned append `[50,0]`,
      a real wheel to `[31,0]` with the tail unpainted, an append while
      scrolled up still `[31,0]` (no yank), the at-end sentinel `[70,0]`, and
      a following append `[90,0]`. The headless scenario gained the same
      wheel/no-snap-back/return checks (7 → 22 checks). **Measured:** a
      bottom-aligned list reports `[count, 0]` at the tail, not the plain
      list's max-scroll pair, so a pin test compares the index to the count;
      `alignment="bottom"` alone passes everything (`followTail` is redundant
      here — a recorded null result, not a failure). **1/1** live, exit `0`;
      live registry `67 → 68`, headless stays `101/101`; five mutation proofs
      (M1 no alignment → `expected "30,0", got "0,0"`; M2 no live wheel →
      `expected "31,0", got "50,0"`; M3 no headless wheel → `expected "51,0",
      got "70,0"`; M4 wrong sentinel → `expected "90,0", got "70,0"`; M5
      `followTail` removed → still green, recorded). Focused ids run:
      `log-viewer`, `live-log`; `check`/`lint`/`test` green (playground 417,
      testing 61).

`[x]` Prove the **shipped Tier 1 controls in a real window** per plan `570`:
      the foundation every other component composes was headless-only. Four
      live twins reuse the plan-168/169 views in the real 1100×720 window —
      `live-primitives-fields` (22 checks: a real click focuses the Input and
      `a t l a s` reaches `onChange`, Enter `onSubmit`; a disabled field refuses
      the edit, `locked=0` with the other field unchanged; click-check /
      Space-uncheck; a click flips the Switch; the Select paints, Down+Enter
      commits `us-east`, Escape closes and keeps it), `live-primitives-display`
      (12: a quarter-track click sets a value below the middle and Right/Left
      step it; Progress/Meter/Skeleton paint at 14 px; a real enter opens the
      Tooltip), `live-primitives-choice` (22: a pointer row select plus Down/Up;
      first-star click, Right/End up, Right clamps, Delete clears, Left clamps)
      and `live-primitives-entry` (16: click focus, Up/Down, typed `99` → `10`;
      six OTP keystrokes advance focus, Backspace one, Left back, retype).
      **4/4, exit `0`, 72 checks**, four screenshots; live registry
      `63 → 67`, headless stays **101/101** (`3536 → 3538` checks, +2),
      `check`/`lint`/`test` green (playground 417, testing 61). Five mutation
      proofs (removed Input click → `name=`; enabled locked field → `locked=1`;
      centre rating click → `rating=0`; removed Tooltip hover → no paint;
      removed OTP `focusCell` → `code=6 complete=0`), plus a measured null
      result: six digits in one call also pass, so the per-step settle is
      realism, not a race guard. Three **test-quality fixes** fell out: the
      headless `primitives-fields` now proves the refusal with a `locked`
      counter (the old `name=atlas` check passed with the field enabled),
      `primitives-display` clicks a quarter of the track (the old 0–100 range
      passed without a click), and `primitives-choice` clicks the second radio
      row (the old first-row click asserted the value it already had); all
      three observed failing and passing. Measured:
      two keys in one batch can coalesce, and the Select's popup paints before
      its focus commit. Focused ids run: the four `live-primitives-*` and the
      five headless `primitives-*`.

`[x]` Give the playground's native captures **provenance** per plan `564`:
      `--capture <dir>` writes one frame per selected scenario plus a
      `provenance.json` in the docs' published shape (`platform`,
      `gpuixVersion`, `commit`, `command`, `capturedAt`) — and only when every
      selected scenario passed. `--commit <sha>` overrides
      `git rev-parse --short HEAD`; without either, capture exits `2` rather
      than inventing a revision. Any earlier PNGs and sidecar in the directory
      are cleared before capture, so a capture directory always describes
      exactly one run and a red run can never leave an old caption over new
      frames. The timestamp is the report's start, never a later clock read;
      the command is normalised from the directory and the selected ids, never
      raw argv. `2/2` focused capture (`theme-color-roles`,
      `theme-type-and-shadow`), exit `0`, one PNG per frame and a decodable
      sidecar; 9 new tests (**417** playground tests), three mutation proofs
      (the `Report.passed` guard removed → the red/empty cases become `Some`;
      the timestamp replaced with a fixed value → the timestamp test fails; the
      PNG clear removed → a stale frame survives), each observed and reverted.
      Full headless stays **101/101**; `check`/`lint`/`test` green. The docs
      contract is plan `412` §5; the sidecar decodes against plan `433`'s schema.

`[x]` Prove the **tab strip in a real window** per plan `565`: `live-tab-overflow`
      (35 checks) and `live-tab-focus` (18) reuse plans `173`/`174`'s views in
      the real 1100×720 window. A real `deltaX` wheel pans `-240` (a vertical
      wheel leaves the strip alone), the clipped `tab-9` keeps painted bounds,
      the component reveal lands it at the trailing edge (**4 px** past — the
      strip's padding; offscreen lands 1 px past), the revealed neighbour
      click/focus works, the component pan reaches exactly `-400`, and
      `Home`/`End` move selection, native focus and the reveal together. The
      load-bearing measurement: **the automation `tab` key reaches the focused
      element but does not traverse**, so the tab-order contract is driven by
      the runner's own `renderer.focusNext()` (new async host verbs
      `focusNext`/`focusPrevious`, D35) — nine steps reach the last clipped tab
      with the strip's offset **unchanged** (focus does not reveal), the next
      step leaves the strip, and one step leaves the roving strip. Live
      registry `61 → 63`; headless stays **101/101**; three mutation proofs (M1
      no reveal → `Home returns to the start region (x=-400)`; M2 roving
      tabindex `() => 0` → `expected "roving-after", got "roving-1"`; M3
      `overflowX: "hidden"` → `tab-strip reports an offset: none`). Focused ids
      run: `live-tab-overflow`, `live-tab-focus`; `check`/`lint`/`test` green.
      Merge gate at `e405a99e`: live **63/63** (**1428** checks, 48 capabilities,
      717 s) and headless **101/101** (**3536** checks), both exit `0`.

`[ ]` **Root (outside this workstream):** decide whether `playground:capture`
      becomes a root script. It cannot carry the required directory without a
      fragile `--` convention, so keeping the documented built-CLI command as
      the contract is the alternative (plan `564` §8; the docs' published run
      is already spelled out above).

`[ ]` **Cross-team:** the docs' component pages still need **per-component
      screens** — the capture mechanism is now publishable, but the registry
      scenarios are capability probes, not one clean screen per delivered
      component (owner: `docs-site` with `components`; evidence: plan `564`,
      `agent/docs-site` TODO "Playground: add a per-component screen"). The
      docs' published run is
      `nub apps/playground/dist/smoke/run.js --capture apps/docs/public/screenshots/<subject> --only <ids>`
      after `nub run --filter playground build`.

`[x]` Prove the **virtualized tree in a real window** per plan `559`: the last
      Tier 3 interaction probe with headless-only evidence. `live-tree` (44
      checks) reuses the 48-row flattened tree in the real 1100×720 window — a
      real click expands `dir-0` 8 → 48 rows and collapses it, the child still
      indents 16 px inside a virtual row, a real `-800` wheel moves the list
      anchor and unpaints the rows above, `scrollToItem(25)` anchors
      `[25, 0, 260]` and paints `dir-3/file-24`, a click focuses that row and
      Down/Up move native focus and the selection, and at the top Right expands
      and walks to the first child while Left returns to the parent and
      collapses. **1/1**, exit `0`, two consecutive runs; live registry
      `60 → 61`, headless stays **101/101 (3536 checks)**; three mutation proofs
      (removed toggle, no-op roving move, 16 → 8 indent). Measured: the anchor
      reports the **flex-resolved 260 px** viewport, not the wrapper's declared
      280; `vtree-viewport` is the live wheel/box target because a
      `<virtual-list>` has no painted bounds live. `nub run check`, `lint` and
      `test` green (playground 408 tests). Focused ids run: `live-tree`,
      `virtualized-tree`, `live-input`. Closes the tree row's live gap.

`[x]` Prove the **nested-layer dismiss stack in a real window** per plan `558`:
      `live-layers` (41 checks) mounts the shipped `nested-layer-dismiss` view in
      the 1100×720 window — a real click opens the parent, a row opens a focused
      submenu, an inside press activates once while the parent's outside handler
      sees it with coordinates, one key reaches two handlers as **two payload
      objects** (`keyObjects=2`), and one Escape or outside press closes exactly
      one layer. **The first live run disproved the claim's lifetime**: with a
      microtask reset both layers closed on one Escape, because a window
      delivers the nested handler and its parent across a microtask. The probe
      now clears the claim on the next **task**; the headless two-press
      separation moved from `yieldNow` to `1 ms`. **1/1**, exit `0`, three
      consecutive runs; live registry `59 → 60`, headless stays `101`; two
      mutation proofs (inverted containment, skipped claim). Focused id:
      `live-layers`. Cross-team guidance recorded on the `dismiss-layer` row.

`[x]` Prove **declared hover/active and text truncation in a real window** per
      plan `557`: `live-states` (32 checks) drives the shipped
      `declared-styles` view — a real hover applies `100 → 140`, hover is per
      element (parent `420` / child `100`, then parent `400` / child `120`),
      leaving reverts both, a press applies `active` `180` without hover, a
      release returns `100`, and a held pointer outside keeps `180` until
      release. `live-truncation` (23) proves the geometry in a window:
      ellipsis/nowrap one line, the unclamped sample past eight lines,
      `lineClamp` exact and inherited (`52`/`78`), the shared `(string, width)`
      layout still unclamped, and painted text the source run with no `…`.
      **2/2**, exit `0`, three consecutive runs; live registry `57 → 59`,
      headless stays `101`; four mutation proofs (plan `557` §9). `paintedStyle`
      stays headless: the live tree has no `style`. Focused ids:
      `live-states,live-truncation`.

`[x]` Prove the **pinned, windowed data grid in a real window** per plan `556`:
      `live-grid` reuses the `grid-wide-table` view in the real 1100×720 window —
      a real wheel moves the body ten rows with the frozen column aligned within
      1 px, a `deltaX` wheel over the body is swallowed, the component pan
      reaches `-360` and the last viewport at `-1700` with header/body
      alignment, an off-window column has no painted bounds, six Rights pan and
      align the reveal, and three Downs keep the frozen row aligned. **53
      checks**, 1/1 exit `0`, four consecutive runs; live registry `56 → 57`,
      headless stays `101`, control `grid-wide-table` still green. Two measured
      harness facts: a scroller's own box moves with its scroll (cache it before
      panning), and every child of a live scroller reports a moved box whatever
      its `position`, so the `sticky` claim itself stays headless. Three
      mutation proofs (plan `556` §9). Focused id: `live-grid`.

`[x]` Prove the **published Select, Combobox and Tooltip in a real window** per
      plan `554`: the three popups the library reuses instead of implementing
      (D15) were headless-only. `live-select` (17 checks), `live-combobox` (17)
      and `live-tooltip` (9) reuse plan `159`'s `PopupsProbe` in the real
      1100×720 window — a click opens, the item click commits `Beta` and returns
      **native** focus to the trigger, Down opens/moves and Enter commits
      `Gamma`, Escape and a click at `(1000, 690)` dismiss; `be` filters `Alpha`
      out, Enter commits `Beta`, `zz` paints `no matches`; a real pointer enter
      opens the tip and its 80 ms timer closes it. Focused **3/3**, exit `0`,
      live registry `53 → 56`, one screenshot each. Four mutation proofs
      (wrong item, wrong hover target, wrong query, removed outside press) — and
      a **measured trap**: a trigger click also closes an open list, so it cannot
      distinguish the outside-dismissal check; recorded in the plan §8. Focused
      ids run: `live-select`, `live-combobox`, `live-tooltip`.

`[x]` Re-measure and guard the **InlineEdit blur commit in a real window** per
      plan `555`: plan `347` recorded that React's `onBlur` did not run for a
      native focus change, and plan `390` found the sibling delivery is
      window-state dependent, so the gap needed a current measurement. A live
      click on the focusable `ws-elsewhere` **does** commit the open draft
      (`name=livez commits=2`), paints it and leaves focus on the clicked
      element; `live-tier2-editing` gains the commit, display and focus checks
      (5 new, 31 total) and `tier2-editing`'s comment records the headless
      no-blur behaviour as a harness fact. Three consecutive green runs; M1
      (remove the click away) fails with `got "name=live commits=1…"`. The
      plan-596 gate also removed the coordinate click that started each edit:
      the locator's click starts it and the component's layout effect moves
      native focus, which the scenario now asserts directly (2026-10-19). Focused
      id: `live-tier2-editing`. Closes the cross-team `InlineEdit` row; the Tabs
      row stays open (its result is ambiguous, not merely state-dependent).

`[x]` Prove the **live pointer gesture** per plan `536`: `AsyncSmokeHost` gains
      `pressWindow`/`movePointer`/`releasePointer` (and a modifier on
      `clickWindow`) over the automation protocol's `mouse.down/move/up`, and
      `live-pointer-entry` extends to the pointer-selection half — a
      press-move-release selects `abcdef` and typing replaces it, a plain click
      clears the selection, and `shift`-click extends. **22 checks**, 1/1 exit
      `0`; live registry stays `53` (same id, up from 14 checks). Three mutation
      proofs: a press at the right edge gives `got "abcdefz"`, a move without
      `pressedButton: 0` gives `got "zabcdef"`, and a click without `shift`
      gives `got "abcdefs"` (all exit `1`). Closes plan `535`'s "not claimed"
      line; measured that the live key verb types **lowercase**. Focused id run:
      `live-pointer-entry`; full gate after the change: headless **101/101**
      (`3536` checks) and live **53/53** (`1133`), both exit `0`;
      `check`/`lint`/`test` green.

`[x]` Prove **variable row heights in a real window** per plan `534`: the last
      interaction family whose evidence was headless-only. `live-variable-rows`
      reuses the `variable-rows` view in the real `1100×720` window — 20/40/60 px
      rows stack at their declared offsets, a real click expands row 2 to
      exactly 120 px and moves rows 3–5 by exactly `+60` with the anchor
      `[0,0,300]` unmoved, a second click collapses it, `scrollToItem(30)` sits
      row 30 at the viewport top, and a real `-120` wheel keeps its in-row
      offset. **49 checks**, 1/1 exit `0`; live registry `51 → 52` and the
      merge gate then ran the whole registry at **52/52** (`1111` checks,
      exit `0`). Two mutation proofs:
      `EXPAND_BY 60 → 40` fails with `expected 120 ± 1, got 100`, and a
      never-expanding toggle fails with `expected "expanded=2", got
      "expanded=none"` (both exit `1`). Measured: a `<virtual-list>` has no
      bounds live but its rows do, so the declared geometry is assertable
      against the wrapper `div` with no correction term. `COMPONENTS.md`'s
      `Virtualized lists` and `Expandable rows` rows now cite it. Focused ids
      run: `live-variable-rows`; `nub run check` and `nub run test` green.

`[x]` Prove **pointer text entry in a real window** per plan `535`: the gesture
      behind inline rename, a search box and a cell editor was headless-only.
      `live-pointer-entry` reuses the `pointer-entry` view in the real
      `1100×720` window — a click at `x + 25` of the 300 px field puts the caret
      inside `abcdef` (index 1–5), a right-edge click appends, a left-edge click
      prepends, a `<textarea>` takes `x\ny` and autosizes to 64 px, and Up
      returns to the previous line (`xz\ny`). **14 checks**, 1/1 exit `0`; live
      registry `52 → 53`, and the merge gate then ran the whole registry at
      **53/53** (`1125` checks), exit `0`. Two levers: the middle click moved
      to the right edge fails `expected 3 ± 2, got 6`, and rendering the area as
      an `<input>` fails `expected "x\ny", got "xy"` (both exit `1`). Not
      claimed: a live press-drag-release selection gesture — the async host has
      no press/move/release verbs and `live-selection` already proves a real
      drag. `COMPONENTS.md`'s `Text inputs` row and the README cite it.

`[x]` Guard the **headless smoke CLI's arguments** per plan `531`: `--list`
      prints the 101 ids and exits `0` without loading the binding; `--only`
      accepts `a,b` and repeats; an unknown token or id prints the usage (and
      every known id) and exits `2` in ~2 s instead of running the suite. The
      selection rules moved to `src/scenario-selection.ts`, shared with the live
      CLI (M4 proves both read one rule). 11 new CLI tests, four mutation proofs
      (§6). Full suite **101/101 (3536 checks)**, playground **408** tests,
      `check`/`lint`/`test` green; focused live `live-input` is `1/1` after the
      shared-selection refactor.

`[x]` Prove the **terminal surface in a real window** per plan `532`: `live-terminal`
      reuses the `terminal-grid` view in the real `1100×720` window — a real click
      focuses the text-grid surface (removing `tabIndex` did not change it),
      printable keys edit the prompt through the `keyChar ?? key` fallback,
      Enter/Up/Backspace/Escape/`ctrl-c` run, a real wheel moves the scrollback by
      more than a screen, a jump to row 0 keeps the prompt and native focus, and
      the 18 px rows, equal-width mono runs and 7×12 caret paint. **48 checks**,
      live registry `50 → 51`, exit `0`; four mutation proofs (plan `532` §6).
      Measured: a `<virtual-list>` has **no painted bounds** in the live tree
      (the `terminal-viewport` wrapper is the box and wheel target), and a
      bordered surface must include its borders in the declared height (the
      scrollback shrank `240 → 238`). Colour stays headless. Focused runs:
      `live-terminal`, `terminal-grid`; full headless **101/101 (3536)**, exit `0`;
      `check`/`lint`/`test` green (playground 408 tests).

`[x]` **Re-baseline the headless native evidence against the published 0.10.0
      source** per plan `529`: the binding had been built from
      `references/gpuix` HEAD (`515df19`, main) instead of the release tag
      (`9fcd6288`) with the main zed pin. Rebuilt from the tag + zed
      `81c99f81`; added the pin/fingerprint (`Binding`, `apps/playground/src/
      binding.ts`, `scripts/install-binding.mjs`, because a shared `nub install`
      restores the old artifact); triaged **28 → 0** failures; the suite is
      **101/101, 3536 checks, exit `0`** on the release binding. Ledgers
      corrected (ADR 0003 amendment, plan `140`, `COMPONENTS.md`). The measured
      deltas are §6.5 of the plan — the big one is the 0.10.0 bounds box
      (content origin + borderless size, and stale after an ancestor scroll).
`[x]` **Re-baseline the LIVE suite** on the release-tag binding (plan `529` §5):
      **50/50 (1014 checks), exit `0`**, host label carries the pins. 13
      scenarios needed the same box triage; `live-table-sort` clicks its row
      before the sort because the row's recorded box is stale after the scroll
      reset.

`[x]` Probe the **paint/frame counters** per plan `527` — the last supported
runtime surface with no contract: `frame-stats` (67 checks) and `live-frames`
(29) over five new host verbs (`frameStats`, `resetFrameStats`, `overlayMode`,
`setOverlayMode`, `cycleOverlayMode`) plus a forced `paint` offscreen. Measured:
a **read is free**, `flush()` is **exactly `+1` frame and `+1` sample`, a state
change and a native wheel paint (4 / 2 frames), `reset` keeps the lifetime count
and clears the ring to **one** sample with `p90 = p99 = max = current`, the ring
is bounded at **1000 samples** while `frames` keeps counting, the timings are
ordered, and the overlay is **paint-only** (no host node, no painted text, no
input capture). Live: an **idle window repainted 0 times in 300 ms**, a click
grew the count (`3` frames), a live reset left `samples = 1`, and a click under
the `full` overlay still activated. Suite `99 → 100` (`3455 → 3522`), exit `0`,
`frames=verified`; live registry `48 → 49`; six mutation proofs and one reverse
proof (plan `527` §6). The **full live suite was not run** (merge gate): the
focused id is `live-frames`.

`[ ]` **Cross-team (blocker for a11y):** `@gpuixui/primitives` and
      `@gpuixui/components` derive focus rings from React `onFocus`, which the
      published `@gpuix/native@0.10.0` **never dispatches** — a click,
      `autoFocus` and `focusNext` all move native focus and run `onBlur`, but no
      `onFocus` (plan `529` §6.5; `focus-traversal`/`primitives-actions` pin it).
      Keyboard users therefore get no ring on the release runtime. Derive the
      ring from a native focus source, or document the limitation on every
      focusable component.
`[ ]` **Cross-team:** `@gpuixui/components` geometry that reads
      `renderer.getElementBounds` must account for the published 0.10.0 box
      (plan `529` §6.5): `x`/`y` are the **content origin** (inside border and
      padding), `width`/`height` exclude only the borders, a scroller's box
      **moves with its own scroll**, and a child's box is **stale after an
      ancestor scroll**. Cache a scroller's box before scrolling; do not use the
      box as a stable frame. Affects docking surfaces, collapsible measurement,
      anchored placement and drag edge loops.
`[ ]` **Cross-team:** the docs-site capability matrix
      (`apps/docs/src/lib/capabilities.ts` + its test) must gain the `frames`
      capability and the ids `frame-stats` + `live-frames`, or its gate stays
      red against `COMPONENTS.md` (owner: `docs-site`; evidence: plan `527`)

`[x]` Add a **scenario filter to the playground shell** per plan `528`: a pure
      `filterScenarios` rule (id, title or capability, case-insensitive and
      trimmed) with 8 unit tests; the sidebar is the filtered view while the
      stage and the painted highlight follow the derived current, and
      `selected` survives a transient filter; `Escape` belongs to the sidebar,
      so it clears from the field **and** from a focused row. `shell-filter`
      (16 checks) and `live-shell-filter` (13) drive typing, the count, the
      hidden pick, the case-insensitive match, the empty state and the clear;
      six mutation proofs (plan `528` §5). Suite `100 → 101`
      (`3522 → 3538` checks), live `49 → 50` (`999 → 1012`), exit `0`; focused
      ids run: `shell-filter`, `shell-navigation`, `shell-selection`,
      `live-shell-filter`, `live-shell`, then the full headless and live suites.

`[x]` Probe the **window as the layout root** per plan `526` — the desktop
      boundary every shell sits on: `window-layout` (27 checks) and `live-window`
      (29) over a pure `window-layout-model.ts` (7 tests). `useWindowSize()`
      reports the runner's window exactly (`1280x800` offscreen, `1100x720`
      live), and a real `zoomWindow()` **reaches React** (`→ 1680x923`, one
      render per change) within the hook's 100 ms poll; a second call restores
      `1100x720` exactly. The wide layout's `240` px sidebar ends at the window's
      bottom below the `36` px toolbar, the window-sized veil tracks both axes
      across the resize, and the restored layout is compact again. Desktop
      insets are **zero** and 0.10.0 has **no window-drag API** (window controls
      exist; nothing starts a move), so a custom title bar can paint under the
      traffic lights but cannot drag the window. Two host verbs added:
      `windowSize` on both hosts and async `zoomWindow`. Suite `98 → 99`
      (`3428 → 3455`), exit `0`; the focused live run is green and the **full
      live suite was not run** (merge gate). Five mutation proofs (plan `526` §8).
      Measured traps: a row's children are content-sized, so the sidebar needs
      an explicit height; and asserting a painted metric against the model
      constant it came from let the first mutation proof pass until the
      assertion used literals.

`[ ]` **Cross-team:** the docs-site capability matrix
      (`apps/docs/src/lib/capabilities.ts` + its test) must gain the `window`
      capability and the ids `window-layout` + `live-window`, or its gate stays
      red against `COMPONENTS.md` (owner: `docs-site`; evidence: plan `526`)

`[x]` Scope **live smoke verification** per plan `517`: `--only <id[,id]>`
      (repeatable) runs just those scenarios, `--all` runs the full suite,
      `--list` prints the ids without a window, and a bare command, unknown id
      or unknown flag exits `2` before the native import. A focused
      `--only live-input` run passes `1/1`; the full suite is now an explicit
      final-gate action. The swarm prompt tells agents to use `--only` while
      iterating and `--all` only at the end. `nub run check` and `nub run test`
      pass.

`[x]` Plans `100`–`199`, `300`–`302`, `330`–`350`, `376`–`378`, `381`, `382`, `384`–`392`, `517`–`520` and `522` written and indexed for the playground workstream; `379`/`380` are held by the components and tokens workstreams, `521` and `523` were taken by components (and `524` by the `tw` workstream), and the next plan takes `526`

`[x]` Probe the **input payload contract** per plan `533` — the last unmeasured
      fields of the event the library's handlers receive: `input-payload`
      (39 checks) and `live-input-payload` (12), six mutation proofs. A
      **double click is not observable** (`clickCount` is always `1`, headless
      and live, even for real press/release pairs 80 ms apart), so a component
      owns a second-press rule. `keyChar` is absent on a plain `div` but carries
      `é`/`日`/`" "` on a text field; `isHeld` is populated and the host gained
      an optional third `keyDown` argument to force a repeat; `cmd-a` is
      consumed by the native editor before React's handler; a synthetic wheel
      always reports `precise=true`/`touchPhase=moved`. Headless suite
      `97 → 98` (`3389 → 3428` checks), exit `0`; the live twin is `12/12` green
      and the registry now lists 47 live scenarios. The **full live suite is a
      merge/release gate and was not run for this task** (never claim its
      total). D64 and the Text inputs row record the contract.

`[ ]` **Cross-team:** `@gpuixui/components` must not expose an
      `onDoubleClick`/double-click activation contract — `clickCount` is always
      `1` on this host in both harnesses, so List/Tree/Grid keep the
      second-press rule; if a double click is wanted, the component owns the
      interval and a test can only assert the two presses (owner: `components`;
      evidence: plan `533` §2/§8)

`[x]` Probe the **app root** per plan `522` — the rule every consumer's
      top-level tree sits on (surfaced by `components` plan `510`):
      `root-single-child` (10 checks) and `root-wrapper` (10), plus
      `live-root` (5). The native root keeps **exactly one child, the last
      one**: a two-root fragment silently drops the earlier root (no retained
      testId, no bounds, no painted text) while its host nodes stay retained
      (measured **6** for two 3-node roots); one wrapper keeps every sibling
      (7 nodes, both painted, `gap: 12` exact). The live twin proves the
      reconciler rule transfers to a window. Suite `95 → 97` (`3369 → 3389`),
      live `45 → 46` (`924 → 929`), exit `0`, `root=verified`; five mutation
      proofs (plan `522` §8). Consequence recorded in `COMPONENTS.md` and the
      playground README: an `App` renders one root element, and a context
      provider does not change the count.

`[x]` Probe the **media surface** per plan `520` — the last inventory row with
      no runtime evidence: `media-surface` (62 checks) and `live-media` (14)
      over a pure `media-model.ts` (15 tests). 0.10.0 has **no media element,
      transport or audio device** (twelve closed element tags, none media), so
      playback is an app boundary. Measured: a 64-bar envelope at a 7.5 px slot,
      a 4 px/s clamped seek, native focus with 1 s/5 s key steps,
      `role="slider"` + `aria-valuetext`, and the `<img>` route's cost (delta
      **63** vs 64 bars). Key rule: **a press on the envelope never scrubs** —
      moves go to the pressed element, so the plane is topmost or the painted
      layer is `pointerEvents: "none"`. Suite `94 → 95` (`3307 → 3369`), live
      `44 → 45` (`910 → 924`), `media=verified`; five mutation proofs (§8.5)

`[x]` Probe the **in-window application menu bar** per plan `519`: `menu-bar`
      (56 checks) and `live-menu-bar` (29) over a pure 19-test model. Hover and
      Left/Right switch the open menu and **skip the disabled View**; Down/Up
      wrap and **skip the disabled Save As** row; Escape and activation return
      native focus to the **open title**; `cmd-s` runs exactly once, never opens
      a menu, dismisses one when open and is inert for a disabled row (the window
      handler is the sole owner); AccessKit maps `menubar`/`menu`/`menuitem` to
      `MenuBar`/`Menu`/`MenuItem` with `aria-expanded` on the open title. Suite
      `93 → 94` (`3251 → 3307`), live `43 → 44` (`881 → 910`), exit `0`,
      `menubar=verified`; five mutation proofs (plan `519` §9). The OS menu bar
      stays unavailable in 0.10.0 (no menu/tray API) and is documented as such.
      Closes the last Tier 4 row with no measured interaction model.

`[x]` Probe a **QR code** per plan `518` — the last `todo` inventory row with no
      runtime evidence: `qr-code` (53 checks) renders the same version-1 fixture
      (21 × 21, 226 dark, Python `qrcode` 7.4.2 EC M) three ways. The module grid
      is exact — `(index + 4) × 6` from the matrix origin, `foreground` modules on
      the `background` quiet zone, a real hit target (`hit=r3c3`), no node for a
      light module — and costs **one retained host node per dark module**:
      `246` vs `21` for either single-node route (`226 − 1`), `611` vs `21` at
      version 4 (`591 − 226` delta). A sourced `<svg>` is one node, one path,
      tinted by `color` (its quiet zone is the container); an `<img>` SVG data URL
      is one node on the full-colour path and bakes a white quiet zone so the code
      stays two-colour in both themes. `role="img"` + `aria-label` give one
      `Image` node named for the payload; mode/version switches remount cleanly.
      Suite `92 → 93` (`3198 → 3251` checks), exit `0`, `qr=verified`; four
      mutation proofs (§8.3). **Not claimed:** scannability (no decoder, no pixel
      readback), and no encoder is chosen or implemented.

`[x]` Probe a **reorderable list** per plan `391` — the unmeasured half of the
      Drag and drop row: `list-reorder` (36 checks) and `live-reorder` (19) with
      16 pure model tests. A pointer names an insertion **boundary**; the
      dragged item's removal shifts later boundaries, so a drop at boundary 3
      from index 0 lands at **index 2** (the unadjusted rule fails both the unit
      test and the scenario) and rows paint at `index * rowHeight` within 1 px.
      A click focuses/activates without reordering; a >2 px travel starts a drag;
      the gesture-ending click is real and is suppressed by that distance
      (`activations 1 → 2` without the guard). Escape cancels through the window
      handler; keyboard lift/arrows/drop uses the same rule and ends focus on the
      moved handle. `<virtual-list>` reorders **keyed** children in place and
      keeps `[0, 0, 240]`. Suite `90 → 91` (`3088 → 3124`), live `41 → 42`
      (`839 → 858`), exit `0`, `reorder=verified`; five mutation proofs
      (plan `391` §9).

`[x]` Probe **hierarchical drag reorder** (a file tree) per plan `392`:
      `tree-reorder` (74 checks) and `live-tree-reorder` (23) over a pure
      pre-order `allRows`/`visibleRows`/`subtreeEnd`/`moveSubtree`/`targetAt`/
      `indicatorAt` model (21 tests). A drop names a row plus `before`/`after`/
      `into`, where `into` is the **middle 50 %** of a directory row with one
      16 px indent step of x — so a file never takes a child and a between-drop
      never guesses depth from x. The source is the **whole subtree** and every
      moved depth shifts (`dir-1/sub/a` 2 → 3 with its root at 1); a drop into
      its own descendant is `refused=descendant`, on itself `refused=self`, and
      the post-move pre-order re-parse refuses a corrupt result as
      `illegal-depth`. A collapsed target opens on drop; a 500 ms hover opens it
      without dropping and Escape cancels. The flattened `at`/`depth`/`parent`
      is reported, and a `<virtual-list>` keeps `[20,0,240]` across a move.
      Keyboard arrows choose the gap (skipping the source) and Right/Left choose
      sibling-versus-child. Suite `91 → 92` (`3124 → 3198`), live `42 → 43`
      (`858 → 881`), exit `0`, `tree-reorder=verified`; seven mutation proofs
      (plan `392` §9).


`[x]` Probe a **notification centre** per plan `381`: `notification-centre`
      (80 checks) and `live-notification-centre` (27): a 36 × 36 bell with a
      derived badge (`Button:Notifications, 3 unread`) opens a 320 × 360
      `align="end"` panel within 1 px of the bell; 24 px group headers and 60 px
      notification rows coexist in one `<virtual-list>`; read flags survive
      close/reopen, a row click is idempotent, opening marks nothing read, and
      the badge unpaints at zero; Down/Up move an active row, Enter marks it
      read, Escape returns native focus to the bell, and an outside press
      dismisses without stealing focus; clear-all paints an empty state and a
      later arrival restores the list. **The key measured rule: a prepend is
      already stable — the list keeps the reader's row (anchor `2 → 3`), and
      component code must not compensate** (forcing the pre-insert index moved
      the row by exactly 60 px). The first mutation removed the planned
      identity re-anchor and the suite still passed, which is how the runtime
      behaviour was found; the effect and the `reanchorTarget`/`rowIndex`
      helpers were then deleted. Suite `84 → 85` (`2644 → 2724`), live
      `35 → 36` (`651 → 678`), exit `0`, `notification=verified`; ten mutation
      proofs and one reverse proof (plan `381` §9.3). Also measured: the
      headless `click(testId)` verb does not run an ancestor's `onClick` for a
      press on a descendant
`[x]` **Harden the live query-builder reveal assertion** per plan `382`: a
      bounded `waitForBounds` (3 s, 50 ms poll) closes the race between
      `rules=4` and the post-commit `scrollIntoView`. Observed once under full-suite
      load (`the live appended row sits at the strip's bottom: expected 181 ± 2,
      got 221`), not again in two consecutive full runs after the fix; removing
      the reveal still fails with the same `221`, so the wait does not mask a
      defect. Live stays `36/36` (`678`) and no check was added.
`[x]` Probe **column configuration** per plan `384`: `column-config`
      (122 checks) and `live-column-config` (27): a `{order, hidden}` model over
      the plan-349 widths, driven from an anchored `Group:Columns` panel. Hiding
      `status` unpaints its header and every cell and closes the gap
      (`content 560 → 440`); showing restores the order slot and the width;
      moving `notes` up yields `name,status,notes,size` (`notes` at `320`,
      `size` at `470`) with every body cell within 1 px; a widened 240 px column
      survives hide/show (`600 → 360 → 600`); the visible width drives the pan
      and a shrink clamps the live offset at once (`-200 → -50`); and a jump to
      row 45 plus its selection survive hide, reorder and show. Escape returns
      focus to the trigger; an outside press dismisses without returning it.
      Suite `85 → 86` (`2724 → 2846`), live `36 → 37` (`678 → 705`), exit `0`,
      `column-config=verified`; seven mutation + one reverse proof (plan `384`
      §10.3). Measured: the panel mounts a React commit later live, so a live
      step must `waitFor("config-panel")` before pressing a control, and an
      outside press on a non-focusable target leaves focus `none`.

`[x]` Probe a **crop area** per plan `385`: `crop-area` (74 checks) and
      `live-crop-area` (10): a 320 × 200 stage whose `<img>` box is the crop
      coordinate space — `objectFit: "contain"` and `"cover"` both report the
      same box and paint no fallback, and there is no fitted rect, load event or
      natural size. The dimming mask is four plain `div`s covering the exact
      complement; a 12 px handle keeps every held move and the release, a
      `+40/+20` drag grows `192 × 120 → 232 × 140`, the SE clamp stops at
      `256 × 160`, a move stops at `(0, 0)` (no left/top mask) and a shrink at
      `16 × 16`; the box takes native focus, `right` moves 1 px and `shift-down`
      grows 1 px. **The transferable finding: `pointerEvents: "none"` still
      delivers the click to the mask as well as the plane beneath it
      (`mask:top>plane`), while `"auto"` delivers it to the mask only — a
      click-through overlay must guard its handler by mode.** Suite
      `86 → 87` (`2846 → 2920`), live `37 → 38` (`705 → 715`), exit `0`,
      `crop=verified`; six mutation + one reverse proof (plan `385` §10.3).
      Measured harness lesson: a readout above the stage grew by a line and
      moved it 16 px, so the geometry must not read a baseline stage; the
      gesture lives in a `ref` so a move sees the press before the commit

`[x]` Probe a **multi-step form (wizard)** per plan `386` — the last
      `todo | ?` inventory row. `wizard-flow` (70 checks) and `live-wizard`
      (11): three steps over one draft, per-step schema messages, a derived
      step indicator, Back/Next/Submit and an `unmount`/`hide` toggle. A step
      swap **must request native focus**: without it a click leaves focus on
      `wizard-next` and Enter inside the field leaves it on `wizard-team` (a
      positional fallback), while a rejected Next focuses the first invalid
      field from the same click handler through a nonce-keyed layout effect.
      Drafts are app state (`unmount`) or retained hidden subtrees (`hide`,
      which still paint nothing and leave the tab order); Enter submits a step;
      the review paints `ada <ada@x> my-w / core`; the chips are
      `ListItem` + `aria-selected`. Suite `87 → 88` (`2920 → 2990`), live
      `38 → 39` (`715 → 726`), exit `0`, `wizard=verified`; 24 model unit tests
      (207 → 231); six mutation + one reverse proof (plan `386` §9.3).
`[x]` Probe **editable grid cells and a row menu** per plan `387`:
      `grid-cell-editing` (57 checks) and `live-grid-cell-editing` (36): a
      second press on a cell mounts and focuses a native editor inside a
      `<virtual-list>`; typing is a draft and Enter commits. **The editor's keys
      bubble to the grid container**, so navigation needs an `editing` guard
      (without it a Down moves the selection). A focused editing row **stays
      painted** after the list scrolls past it, so the probe commits on leave
      (`commits 2 → last=leave`) rather than leaving an edit attached to a row
      the reader cannot see. A row-anchored menu paints unclipped at the action's
      bottom-left (±1 px), takes focus, returns it on Escape and closes on any
      anchor change because its window point cannot follow a scrolled row. A
      sort commits the draft and keeps it with the row id. Suite `88 → 89`
      (`2990 → 3047`), live `39 → 40` (`726 → 762`), exit `0`,
      `cell-editing=verified`; six mutation + one reverse proof (plan `387`
      §9.3); 33 model unit tests (231 → 264).
`[x]` Probe a **file-upload queue** per plan `388`: `file-upload` (41 checks) —
      a drop carries paths only, and a row is `size=unknown` until the app stats
      it; a drop reaches the **nearest** handler once (a handler-less child lets
      the zone run, a nested handler takes it alone); a handled drop delivers
      **no** trailing click, so the planned click guard was deleted — it
      swallowed the first real click (`picker 0`); a 20/40/100% fill measures
      48/96/240 px of a 240 px track; cancel freezes the fill and retry resets
      it; a failed row paints the destructive border; a duplicate path and a
      refused `.exe` add no row. The OS picker is a documented boundary:
      `promptForPaths` is blocking and has no automation verb. Suite
      `89 → 90` (`3047 → 3088`), exit `0`, `upload=verified`; five mutation
      proofs (plan `388` §10.1); 19 model unit tests (264 → 283).
`[x]` Prove the **command palette in a real window** per plan `389`: mount the shipped
      `command-palette` view in the 1100×720 window and drive the whole path through
      the automation protocol — `cmd-k` with nothing focused, the window-sized veil,
      typing/filtering, arrows that move the row but keep focus in the input, Enter
      commit through `onSubmit`, Escape and a veil click, and the focus return. Live
      `40 → 41` (`762 → 839` checks), exit `0`, `command=verified`, 80 checks for the
      scenario; four mutation proofs recorded (plan `389` §6). The headless scenario
      and its a11y/style checks stay unchanged. Measured: the live `text` verb errors
      for an unmounted element while `bounds` is `null`, so unmount checks use `bounds`.
`[x]` Correct the **two live checks that assert a window-state-dependent
      observation** per plan `390`: the clean `HEAD` of the same day read
      `innerFocus=0` and "an arrow after a click restarts at the first tab" at
      15:03/15:10, then `innerFocus=1` and `tab=settings` from 15:25 onward in
      four runs. Replaced the `onFocus=0` expectation with "the click focuses the
      child" and dropped the arrow-after-click expectation; live is `41/41`
      (`839` checks), exit `0`; the Tabs/InlineEdit cross-team rows are re-verify.
`[x]` Correct the unearned **File / folder selection = verified** verdict in
      `COMPONENTS.md`: no scenario in `apps/` or `packages/` calls
      `promptForPaths`, the picker is a blocking OS dialog with no automation
      verb, and `TestRenderer.promptForPaths` forwards to GPUI's
      `cx.prompt_for_paths`, which waits on the platform panel. The row now
      reads docs-only, with the reason inline.
`[x]` Playground: prove or bound the platform path picker
      (`promptForPaths`) — **bounded by plan `388`**: the picker is a blocking
      OS panel, `TestRenderer.promptForPaths` forwards to `cx.prompt_for_paths`,
      and no automation verb exists, so the suite drives the drop and records
      the picker request instead of opening the panel. The gap is recorded on
      the File / folder selection row; a manual macOS run is not required to
      claim the interaction.
`[ ]` **packages/components** (no owner yet): implement a notification centre
      from the contract plan `381` measured — a bell with a derived unread badge
      and an accessible label, a non-modal `align="end"` panel, grouped
      newest-first rows in a virtual list, roving keyboard selection, idempotent
      reads, an outside press and Escape (focus return on Escape only), and an
      empty state. Key rule: do **not** compensate a prepend; the runtime keeps
      the reader's row. `notification-centre` is the acceptance evidence.
`[x]` Probe the **filter-rule builder** per plan `378`: `query-builder` (83 checks)
      and `live-query-builder` (41): a 40 px `Toolbar:Query` over a 132 px
      `Group:Filters` strip of 40 px rule rows, each three native `Select`s and a
      remove control, over a 120-row `<virtual-list>`. `status is paused` → 40
      rows, `name contains item 1` → 31 (12 under `all`, 59 under `any`), score
      `> 80` → 19 / `>= 80` → 20, `owner is Ada` → 30 / `is not` → 90; a field
      change resets the operator and value; an incomplete rule is ignored by
      both combinators; `add` reveals and **focuses** the appended row; a picker
      opened from the scrolled strip paints past the clip and commits; Escape
      closes and returns focus; zero matches paint the empty state; a rule edit
      resets the anchor and clears the selection. Suite `83 → 84`
      (`2561 → 2644`), live `34 → 35` (`610 → 651`), exit `0`,
      `query=verified`; ten mutation + one reverse proof. Measured: three
      `add` clicks sent in one frame coalesce, so the live step settles between
      them before the reveal lands
`[x]` Probe the **data toolbar and statistic cards** per plan `377`:
      `data-toolbar` (61 checks) and `live-data-toolbar` (24): a 40 px
      `role="toolbar"` over a 60-row `<virtual-list>`, with a native search,
      status filters, sort, column toggles, a selection count and a bulk
      archive. `item 1` narrows to 11 rows and puts the first match at the
      viewport top; paused narrows to 20; the status sort (paused first) unpaints
      the previous first row; hiding `owner` unpaints its header and every cell;
      selected rows paint `colors.accent` and survive a scroll; a filter clears
      the selection; archive removes them (`total 60 → 58`, `archived=2`). The
      three 160 × 64 cards derive `Total`/`Showing`/`Selected` and follow every
      change; the toolbar is `Toolbar:Data toolbar` and the search
      `TextInput:Search`. Suite `82 → 83` (`2500 → 2561`), live `33 → 34`
      (`586 → 610`), exit `0`, `data-toolbar=verified`; seven mutation + one
      reverse proof. Measured: **the virtual list resets its own anchor on a
      filtered re-render but does not report it**, so the `onVisibleRange`
      readout stays stale (30) until the component mirrors the reset.
`[x]` Probe the **multi-pane editing layout** per plan `376`:
      `multi-pane-editor` (55 checks) and `live-editor` (19): two tabbed panes
      around one live split, each a 28 px `userSelect: none` strip over a 372 px
      `overflowY: "scroll"` viewport holding a `<code showLineNumbers>`; a
      `-200` wheel pans only pane A and moves the code's painted box by exactly
      `-200` at unchanged height; a code click bubbles to the viewport, takes
      native focus and sets `active=b`; a tab swap paints the other document
      and resets the pane to the top because **the runtime clamps a shorter
      document's offset silently and fires no `onScroll`**; a `+80` divider drag
      sets `500` and re-widths both code surfaces within 1 px without moving an
      offset; `End` clamps at `560` and the divider is a `Splitter` with
      `aria-valuetext="560px"`; both surfaces are `TextInput`s named
      `Editor A`/`Editor B`; selection stays in one pane or crosses both while
      the tab chrome stays out. Suite `81 → 82` (`2445 → 2500`), live
      `32 → 33` (`567 → 586`), exit `0`, `editor=verified`; seven mutation + one
      reverse proof. Measured: **`overflowY: "hidden"` still pans with the
      wheel** — only omitting the axis declaration stops it.
`[x]` Probe the **inspector / property panel** per plan `348`: `property-panel`
      + `live-inspector` — a 300 px inspector whose `<virtual-list>` rows own
      native editors: Enter arrives as the field's `onSubmit` (not a bubbled
      key), typing is a draft until commit, the committed model repaints the
      preview, an `Opacity` edit resizes the bar (48 px), a row and its draft
      survive a scroll out of and back into the window, the filter preserves
      drafts, and reset restores everything. Suite `78 → 79` (`2270 → 2312`
      checks), live `29 → 30` (`506 → 530`), exit `0`, `inspector=verified`;
      five mutation proofs + one reverse proof. Measured live lesson: typing and
      Enter can share one React batch, so the commit must be a functional update.
      Gives the Key-value / Property panel / Inspector panel / Property editor
      rows their first runtime evidence. §9
`[x]` Probe **resizable columns inside the virtualized data grid** per plan `349`:
      `data-grid-columns` (87 checks) and `live-data-grid-columns` (18): a 6 px
      header-cell handle drives per-column width state; header and virtual rows
      stay aligned within 1 px, the row width and pan maximum follow the sum, a
      shrink clamps the live offset immediately (`-350 → -130`), the anchor
      (`[45]`), frozen column and selection survive a resize, and
      Home/End/arrows clamp. Suite `79 → 80` (`2312 → 2399`), live `30 → 31`
      (`530 → 548`), exit `0`, `columns=verified`; six mutation + one reverse
      proof. Measured: a handle straddling the cell boundary loses its centre
      click to the next cell, and the automation click uses the unclipped
      centre (pan a clipped handle first). Closes the `Resizable columns` row
      that plan `130` only measured on plain rows.
`[x]` Probe **application chrome** per plan `350`: `app-chrome` (46 checks) and
      `live-app-chrome` (19) — a 36 px toolbar over a two-pane body over a 24 px
      status bar; the panes scroll independently while the bar stays pinned; a
      clipped toolbar action keeps painted bounds and one `scrollTo(-340)`
      reveals and runs it; a breadcrumb collapses its middle from app state and
      each crumb is a focusable `Link` that activates on click or Enter. Suite
      `80 → 81` (`2399 → 2445`), live `31 → 32` (`548 → 567`), exit `0`,
      `chrome=verified`; six mutation + one reverse proof. Measured: a
      `flexShrink: 0` flex row overflows its declared width (the reveal must
      cover the trailing item's real x), a `<virtual-list>` needs a wrapper to
      be a live wheel target, and chrome metrics must be asserted against
      literals, not the layout constants.
`[x]` **Blocker B1 fixed**: the `darwin-x64` GPUix 0.10.0 binding builds from source with `gpui_macos/runtime_shaders` (the `xcrun metal` step is optional) and loads — plan `140`, ADR 0003
`[x]` **The native smoke suite is green on this host** (44/44 when the blocker closed; **101/101, 3536 checks** measured 2026-10-18) — `nub run --filter playground build && nub apps/playground/dist/smoke/run.js` exits `0`, writes `smoke-report.json` and one screenshot per scenario. Two-direction proof recorded (plan `140` §4, plan `150` §4, plans `151`–`187` §7/§8/§9/§10: exit `1` when a check is broken). Every capability in `COMPONENTS.md` is now `verified 0.10.0`
`[x]` Probe the modal contract per plan `155`: `modal-focus-trap` — component code moves native focus (`renderer.focusElement`), Tab wraps inside the surface (`focusNextWithin`/`focusPreviousWithin`), focus returns to the trigger, and a nested popover's Escape closes only the popover — 19/19 green (fails with exit `1` when the Tab trap or the focus return is removed)
`[x]` Probe floating placement per plan `156`: `floating-placement` — `side`/`sideOffset`/`align="start"` are exact; **`align="center"` is off by half the panel** and `fit="snap"` clamps inside the window without flipping, so a bottom-side menu can cover its trigger — 20/20 green (fails with exit `1` when the layer ignores `side`)
`[x]` Probe native motion per plan `157`: `motion-collapse` — the paused motion clock makes a 200 ms width tween exact (96 px of 240 at 80 ms), the inner pane keeps its 240 px width (outer clipping, no reflow), and `AnimatePresence` retains the leaving toast until the native exit settles; `onMotionComplete` needs `dispatchNativeEvents` — 21/21 green (fails with exit `1` when the mid-tween expectation is a jump value)
`[x]` Probe roving focus per plan `158`: `roving-focus` — programmatic focus reaches a never-clicked row and the next key is delivered there; inside a `<virtual-list>` focus survives the window scrolling past it and stays in the painted set; 22/22 green (fails with exit `1` when the focus move is removed)
`[x]` Probe the runtime accessibility tree per plan `160`: `a11y-tree` — roles map, names are **not** derived from text, CheckBox/Switch have no checked state, and a virtual list exposes only the painted window; 26/26 green
`[x]` Probe the published popups per plan `159`: `select-choose`, `combobox-filter`, `tooltip-open` — all three work natively and are `verified`; the suite is now 25/25 and the host gained `hover`
`[x]` Probe native content surfaces per plan `161`: `native-surfaces` — `<svg>`, `<img>` and `<diff>` are retained **and painted** (bounds fire from `on_painted`); `<img>` paints `img: no src` / `img: load failed` fallbacks and `setImagePixels` uploads through the ref; **`<canvas>` is retained as a node but renders `gpui::Empty`** — no bounds, children dropped from the paint log, so charts and the colour picker cannot use it; a corrupt PNG with a valid MIME is indistinguishable without pixel readback — 27/27 green (fails with exit `1` when the canvas is swapped for a div, or when the data-URL fallback count changes)
`[x]` Probe cross-element drag targets per plan `162`: `drag-targets` — capture keeps every move and the up on the source; **hover is frozen during the drag** and settles as `A:leave>B:enter` after release; the gesture ends in a **click on the source**; `onFileDrop` carries paths and coordinates, the drop simulation emits moves, and a drop on an element without a handler emits **no drop but a click**; 28/28 green (fails with exit `1` when the drop handler is removed or the gesture is swapped)
`[x]` Probe native text selection per plan `163`: `text-selection` — cross-element selection joins with newlines exactly; `<code>`/`<diff>` copy only line text (no line numbers, headers, gutters or markers); **a drag anchored inside `userSelect: "none"` selects nothing**, while one crossing it skips it; `clearSelection` and a click leave it empty — 30/30 green (fails with exit `1` without `userSelect: none`, or without `clearSelection`)
`[x]` Probe workspace restore per plan `167`: serialise split width, tab order, active tab and the virtual-list anchor; prove a reset loses them and a remount restores them exactly, including `scrollToItem`'s `offsetInItem` — 28 checks, suite `32 → 33`
`[x]` Probe scrolling a virtual row into view per plan `166`: `scroll-into-view` — `focusElement` alone reveals an off-window row; `scrollToItem(list, 120)` anchors `[120, 0, 280]` and `scrollIntoView(row 10)` anchors `[10, 0, 280]` exactly; **`getScrollOffset` saturates on a virtual list** so persistence reads `getListScrollTop`; a scroll does not move focus — 32/32 green (fails with exit `1` when `scrollIntoView` is a no-op or the index is wrong)
`[x]` Probe a virtualized tree per plan `165`: `virtualized-tree` — 328 flattened rows inside `<virtual-list>`; `paddingLeft` still indents 16 px per depth; expanding 8 ↔ 48 rows repaints the window with no stale child; click and arrows move selection **and native focus** by roving index, and an off-window focused row stays painted and still receives the next key — 31/31 green (fails with exit `1` when the indent, the focus move or the flattening is removed)
`[x]` Probe the right-click context-menu contract per plan `164`: `context-menu-pointer` — a right click is `onAuxClick` + `isRightClick` with **no `button`** and no `onClick`; a child's right click bubbles; `<anchored position={pointer}>` is exact **inside a scrolled container** (no offset, no clipping, an item below the viewport still activates); outside press and Escape dismiss; `shift-f10` opens and Escape returns focus — 30/30 green (fails with exit `1` when the open call, the position or the focus return is removed)
`[x]` Prove the platform type styles in the native runtime per plan `170`: cycle Default/macOS/Linux/Windows and assert the mono family and unchanged colours — `theme-platform`, 39/39 green
`[x]` Probe native search highlights per plan `171`: `highlight` / `onHighlight` / `useTextSearch` / `getPaintedHighlights`, case/whole-word/active/ranges, nested scoping, `<code>` text and the virtual `matchIndexOffset` contract — `search-highlights` 41 checks, suite `39 → 40`, two-direction proof recorded
`[x]` Probe drag edge auto-scroll per plan `172`: whether a held drag scrolls a container, whether `scrollTo` keeps the capture, and the derived reorder drop index — `drag-autoscroll`: the runtime does **not** auto-scroll a held drag; a component-owned `scrollTo` loop keeps the capture, and the drop index follows the offset — 17 checks, suite `40 → 41`, two-direction proof recorded
`[x]` Probe horizontal scrolling per plan `173`: `overflowX: "scroll"` pans on `deltaX`, a vertical wheel does not pan a horizontal-only strip, a clipped tab **keeps painted bounds**, `scrollIntoView` reveals it (saturating at `-461`, with the near-end reveal at `-5`), and `scrollTo` is exact — `tab-strip-overflow` 29 checks, suite `41 → 42`, two-direction proof recorded
`[x]` Probe the tab strip focus contract per plan `174`: a clipped tab **is** a tab stop and focus does **not** reveal it in a plain scroller; a roving strip is one stop and End/Home move selection, native focus and reveal together — `tab-strip-focus` 19 checks, suite `42 → 43`, two-direction proofs recorded
`[x]` Probe nested panels per plan `175`: a vertical split (`dy` → painted height), isolation of a nested split, a zero-width sidebar, keyboard resize on a focused divider, and the AccessKit `Splitter` role — `panel-nested` 32 checks, suite `43 → 44`, two-direction proofs recorded
`[x]` Probe tabbed panes per plan `177`: `workspace-panes` — **`display: "none"` is a no-op in 0.10.0**, so an inactive pane still laid out and stole a click; absolute slots + `visibility: "hidden"` keep the pane's draft, pick and virtual-list anchor while leaving the paint and the tab order; a nested scroller chains the wheel to its ancestor unless `pointerEvents: "auto"` guards it; a resized pane re-windows its list and keeps its anchor — 29 checks, suite `45 → 46`, three two-direction proofs recorded
`[x]` Probe a Tier 4 terminal surface per plan `179`: `terminal-grid` — a click focuses a `div` surface natively (even without `tabIndex`), printable keys reach its `onKeyDown`, Enter/Up/Backspace/Escape and `ctrl-c` with `modifiers.ctrl` are delivered, 18 px rows align at equal width for equal character counts in the mono family, per-run colour carries `destructive`/`success`, and a 200-line scrollback starts at the tail while the sibling prompt row keeps focus across jumps; there is **no PTY/process API** in 0.10.0, so the app owns the process — 27 checks, suite `46 → 47`
`[x]` Probe the Tier 3 chart surface per plan `180`: `chart-svg` — bars composed from `div`s keep exact geometry, token colour and painted hit-testing; a sourced `<svg>` is an **alpha mask tinted by one `color`**, so a multi-series line is one layer per series; SVG-internal text is painted but absent from `getPaintedText`/a11y, and SVG children are retained but unpainted; an `<img>` SVG data URL is the **full-colour** path (linear + radial gradient and distinct fills) — 52 checks, suite `47 → 48`, four two-direction proofs recorded
`[x]` Probe the Tier 5 markdown surface per plan `181`: `markdown-surface` — GFM heading/list/table/fenced-code blocks paint as addressable text, a crossing drag copies the document, a coordinate click on a link fires `onLinkClick` with the URL while prose does not, React children are retained but unpainted, and `role="article"` is one named AccessKit region with no per-heading nodes — 21 checks, suite `48 → 49`, four two-direction proofs recorded
`[x]` Probe the playground shell's own behaviour per plan `182`: `shell-selection` — clicking an entry mounts its real view and paints the accent active state; Enter (down) and Space (up) switch entries through the shipped `decideActivation`; the light palette repaints the shell and keeps the selection. The full run exposed a **harness state leak** — consecutive `<App>` scenarios shared Shell state and the sidebar's native scroll offset — fixed by mounting every scenario under a `Fragment` keyed by id — 17 checks, suite `49 → 50`, four two-direction proofs recorded
`[x]` Probe the toast viewport per plan `183`: `toast-lifecycle` — `position: "absolute"` with `right`/`bottom` is exact (24 px insets), the bottom-anchored stack grows upward, the viewport's `pointerEvents: "none"` is load-bearing (a page control under its strip takes the click; `auto` blocks it) while a painted card is hit without `auto`, paint order covers the app under the card, `role="status"` maps to an AccessKit `Status` and dismiss to a `Button`, a toast does not steal focus and its dismiss is one Tab away, and a per-toast JS timer dismisses only its own card through a frozen exit — 55 checks, suite `50 → 51`, six two-direction proofs recorded. Follow-up: mount the shipped `ToastProvider`/`ToastViewport` once `@gpuixui/components` is on the integration branch
`[x]` Probe the docking layout per plan `184`: `docking-layout` — the surface rectangle is read from component code (`ref` + `renderer.getElementBounds`) and every model-derived pane box matches the runtime; a pixel-exact drop bar inside a nested `position: "relative"` pane; an edge drop splits the target, a centre drop merges; dropping a group's last tab prunes it and collapses its split (including at the top level); every split must be `key`ed by node id or a reparented split keeps the parent's size; a recursive layout with nested sizes restores exactly through a keyed remount; AccessKit exposes `Region`/`TabList`/`TabPanel`/`Tab`/`Splitter` — 80 checks, suite `51 → 52`, four two-direction proofs
`[x]` Probe pinned grid chrome per plan `185`: `grid-wide-table` — **`position: "sticky"` is ignored**, so a header and a frozen column derive from the body's single scroll offset (`renderer.getScrollOffset`) and align within 1 px on both axes; only the visible columns are in the tree (3–10 at `x=-360`, 17–23 at the end) and rows window the same way; six Rights reach column 7 with focus and a component-owned pan to `-260`; `gridcell` is AccessKit `GridCell` with `aria-selected` — 57 checks, suite `52 → 53`, four runtime two-direction proofs plus a clamp-unit mutation; adds the `grid` capability
`[x]` Probe collapsible height motion per plan `186`: `collapsible-height` — **`onLayout` does not exist**; `ref` + `renderer.getElementBounds` measures the content at **first layout while the body is clipped to `height: 0`** (`mounted=140`), so a `defaultOpen` section can animate on its first open; `motion.div` height interpolates exactly (56 px at 80 ms of a 200 ms/140 px tween); the clip refuses a collapsed child's click with no pointer guard (removing `overflow: hidden` lets it through); content stays mounted so a typed draft survives collapse/re-open; `onMotionComplete` fires once per tween — 32 checks, suite `53 → 54`, five two-direction proofs recorded. Answers the `CollapsibleContent` TODO; the recipe is in plan `186` §10
`[ ]` Cross-team: `@gpuixui/components` **Collapsible/Accordion** keep their content mounted under an `overflow: "hidden"` motion body and animate the measured height instead of unmounting. Plan `186` §10 measured every ingredient (natural height at first layout while clipped, exact height tween, the clip refusing input, draft survival, `onMotionComplete`); **plan `592` now proves the same recipe in a real window** (`live-collapsible`, 37 checks: `mounted=140` while clipped, `56 px` at 80 ms, the clipped control refusing a press, `draft=ab` across a collapse and re-open). The remaining gap is the motion wrapper's missing `testId`/`role`/`aria-*` (owner: `components`; evidence: plans `157`, `186`, `592`)
`[x]` Probe nested overlay layers per plan `187`: `nested-layer-dismiss` — one key event reaches a nested layer and its parent as **separate payload objects** (`keyHandlers=2`, `keyObjects=2`), so the identity-keyed `dismiss-layer.ts` stack closes **both** layers on one Escape; a field-keyed claim closes exactly one. A press inside the submenu fires the parent's `onMouseDownOutside` (`outsideParent=1`, `outsideSub=0`) with `x`/`y`, making the bounds containment load-bearing; a row-derived `<anchored position>` is exact and a raw `<anchored side/align>` anchors to the parent — 29 checks, suite `54 → 55`, four two-direction proofs. Adds the `layers` capability
`[x]` Probe the native text-entry contract per plan `188`: `text-entry` — one `onChange` per character; Left/Right/Home/End move the caret and typing inserts at it; `shift-arrow` extends a selection and `cmd-a` selects all, and typing replaces either exactly; Backspace deletes one and is a safe no-op on an empty field; `readOnly` keeps focus and value and fires **no** change event; the placeholder is exposed and painted and stops painting once text exists; a fixed-width field clips (158 px before/after 40 characters); `minRows`/`maxRows` autosize exactly (64 → 116 → 168 px, then clamped); **a typed secret is held, announced and painted in clear** — no masking prop exists, so a `PasswordInput` must not be shipped — 56 checks, suite `55 → 56`, nine two-direction proofs. Also hoists the readout `field`/`numberField` helpers into `scenarios/probes.ts`
`[x]` Run the smoke suite in a **real window** per plan `189`: `smoke:live` mounts the shipped `App` in a real 1100×720 window and drives it through `@gpuix/native/automation` — `live-shell` (shell fills the window, click and Enter navigate), `live-input` (typing reaches `onChange`, Enter `onSubmit`), `live-scroll` (wheel moves the container, `onScroll` delta) `live-panel` (a **paced** divider drag resizes the split `320 → 400`; six moves sent back to back are ignored) `live-overlay` (a modal opens centred and Escape closes it) `live-docking` (a paced tab drag onto a pane edge splits it) `live-primitives` (the **shipped** Button/Toggle run) and `live-table` (a virtual row click and a live list scroll) — 8/8 green, exit `0`, eight real-window screenshots; the async host reuses the smoke report and exit codes, and the no-window path exits `2` (proven by forcing an `init` throw). Adds `AsyncSmokeHost`/`runAsyncScenarios` to `packages/testing` with two tests
`[x]` Prove **focus in a real window** per plan `190`: `AsyncSmokeHost.focused` over the in-process renderer, a pure tree→`testId` lookup, and `live-focus` — focus entry, the modal Tab/Shift-Tab trap, focus return and nested-popover Escape. 18 checks; live suite `8 → 9`, exit `0`; fails `exit 1` when the trap or the focus return is removed. Removes the false plan-189 limitation that the live suite cannot observe focus
`[x]` Prove **text selection in a real window** per plan `191`: async `selectText`/`selectedText`/`clearSelection`, a pure drag-geometry helper, and `live-selection` — a real drag copies three nodes, a `userSelect: none` anchor selects nothing, a crossing drag skips the chrome, and clear/click empty it. 9 checks; live suite `9 → 10`, exit `0`; ending the drag inside the last line fails `exit 1` with the partial copy
`[x]` Prove **motion in a real window** per plan `192`: `live-motion` pauses the live clock, collapses the 240 px sidebar and reads 96 px at 80 ms of a 200 ms linear tween, the inner pane's unchanged width, `onMotionComplete`, and the `AnimatePresence` exit. 25 checks; live suite `10 → 11`, exit `0`; `fastForwardMotion(0)` fails `exit 1` with 0 px. Measured difference: `onExitComplete` fires **twice** live for one exit (headless: once), so handlers must be idempotent; the live host's `bounds` now returns `null` for a removed element
`[x]` Prove the **right click and a context menu in a real window** per plan `193`: `AsyncSmokeHost.rightClick` + `live-context-menu` — pointer placement (1 px), disabled row, outside/Escape dismissal, child bubbling, scrolled-container anchoring. 31 checks; live suite `11 → 12`, exit `0`; sending the click as button 0 fails `exit 1` (`open=false last=none`)
`[x]` Probe **detachable tabs as in-window floating panels** per plan `194`: `float-tab` — a tab released outside the dock opens an absolute panel at the release point (the last held move); it paints above the dock as the app root's last child and takes the overlap click (`body=1 dockBody=0`); its title bar drags it by the pointer delta and a component clamp pins it at `(640,320)` on `900×480`; the float tab takes native focus, Escape closes it and returns focus to the dock; dragging its tab back appends/activates it and prunes the window; the `{dock, float}` snapshot restores the exact position. 46 checks, suite `56 → 57`, exit `0`; three two-direction proofs (clamp, paint order, release point). New `float` capability; limits: no drag preview, and a close control nested in the drag surface does not fire
`[x]` Prove the float **in a real window** per plan `195`: `live-float` — a paced drag tears the tab out and the panel lands on the release point within 1 px, the title bar drags to exactly `(200,60)`, its tab takes focus, Escape returns focus to `float-tab-beta`, and the close button drops a reopened tab. 28 checks; live suite `12 → 13`, exit `0`; a release inside the dock fails `host waitFor float-window`, exit `1`. Caught a live-only race: the drag-ending click re-applied the pre-drag dock from a stale closure and resurrected the tab; the tab click is now a functional state update
`[x]` Probe the **interactive hover card** per plan `196`: `preview-card` — hovering opens the card, moving the pointer into it keeps it open (the card enter arrives **before** the trigger leave, so the 200 ms close re-checks an `inside` ref at fire time), a card control click works, leaving closes after the delay, a re-enter inside the delay cancels, and the leave payload has **no coordinates**. Also measured: enter/leave are **per element**, so every hoverable child needs the handler. 18 checks, suite `57 → 58`, exit `0`; removing the fire-time check fails `open=true` with exit `1`. New `preview` capability
`[x]` Prove **painted highlights and virtual-list anchors in a real window** per plan `197`: `AsyncSmokeHost` gains `highlights`/`scrollToItem`/`listScrollTop` over the renderer the runner owns; `live-highlights` asserts four document washes with rects inside their line, clear/restore, the find cursor and document-wide `matchIndexOffset` numbering after a row-90 jump; `live-table` asserts the exact anchor `[0,0,h]` → `[120,0,h]`. 14/14 live, exit `0`; both directions fail `exit 1` (expected `121`, and `3` washes). Recorded: the live tree has **no `style`** and `GpuixRenderer` has **no a11y method**, so colour/a11y stay headless for a measured reason
`[x]` Probe **variable row heights and an expandable row** per plan `198`: `variable-rows` — declared 20/40/60 px rows stack exactly (y `0/20/60/120/140/180`), eight fill a 300 px viewport, a `60 → 120` expansion moves the rows below by exactly `+60` with the anchor still `[0,0,300]`, collapsing restores, `scrollToItem(30)` anchors exactly and `scrollIntoView(45)` reveals it, and a wheel's in-row offset stays inside its row. 59/59 headless, exit `0`; expected `+40` fails `exit 1` (`expected 160, got 180`)
`[x]` Prove **hover in a real window** per plan `199`: `live-preview` is the first live scenario to use the `hover` verb — a real `mouse.move` opens the preview card, the pointer reaches its body and the fire-time presence check holds it past the 200 ms grace close, a control inside the hover-opened card clicks, leaving closes from the **last hovered child** (`reason=action`), a re-enter cancels and a final leave closes (`closes=2`). Measured: the card enter and the trigger leave arrive in **one React batch** live, so `prev`/`last` collapses them and the append-only log is the reliable order. Live `14 → 15`, exit `0`; skipping the body hover fails `exit 1` (`expected "body:enter", got "trigger:enter"`)
`[x]` Probe the **message scroller** per plan `300`: `message-scroller` — a chat opens at the latest message with a mount-time at-end scroll; a single 400 px wheel up unpins, and an append while unpinned leaves the anchor untouched and counts unread; jump-to-latest re-pins; a streamed last row keeps the tail at the viewport bottom; a 10 px scroll stays inside the 24 px threshold; a 3-row history has nowhere to scroll and no affordance. The pin comes from `renderer.getListScrollTop` **inside** `onVisibleRange` — the payload is a built-window range with overdraw and lags one gesture, so `endIndex >= count` yanks. 59 checks, suite `59 → 60`, exit `0`; the stale-payload mutation fails `exit 1` (`expected "false", got "true"`), and removing the growth effect fails with `expected "52,20", got "52,0"`. Adds the `scroller` capability and the pure `scroller-state.ts` rules with 11 unit tests
`[x]` Prove the **message scroller in a real window** per plan `301`: `live-scroller` reuses the headless view and drives it through the automation protocol — the chat opens at the latest message, a pinned append follows, a real 400 px wheel unpins and paints the affordance, an append while unpinned leaves the anchor untouched and counts unread, jump re-pins, two streamed rows keep the tail on the viewport bottom, and the short history is inert. 45 checks; live `15 → 16`, exit `0`; a no-op wheel fails `exit 1` (`expected "false", got "true"`). Also fixes the live host: the protocol reports a retained-but-unpainted element as `NotFound`, which `bounds` now maps to `null` instead of a host error
`[x]` Probe the **native cost model** per plan `302`: `scale-cost` — `SmokeHost` gains `retainedElements` and a schema-decoded `syntaxCache`; a virtual list retains **3 host nodes per row** (2,000 rows = 6,012, 100 rows = 312; the 1,900-row delta is exactly 5,700) even though it paints ~15, a jump neither leaks nor recycles, two identical `<code>` blocks cost one miss + one hit, a **theme switch reparses nothing**, idle frames do nothing, and each source edit costs exactly one miss + one hit + one document. 36 checks; suite `60 → 61`, exit `0`; three two-direction proofs (M1 theme-dependent code: `expected 2, got 3`; M2 a wrong per-row constant: `expected 3800, got 5700`; M3 a two-number tuple: the adapter test fails). Adds the `scale` capability
`[ ]` Cross-team: fold the `scale-cost` numbers into `COMPONENTS.md` — `Virtualized lists`/`Virtualized tables` retain **3 host nodes per row** (paint is windowed, retention is not), and `Syntax highlighting` reparses only when the document key changes (a theme switch costs nothing) (owner: `components`; evidence: plan `302` §2)
`[ ]` Cross-team: `@gpuixui/primitives` must **not** add a `PasswordInput` — 0.10.0 has no masking surface (no `type`/`secureTextEntry`), and a typed secret is announced and painted in clear; document the limitation and the OS-prompt alternative on the `Input` docs page (owner: `primitives`; evidence: plan `188` §9)
`[ ]` **Cross-team (defect):** `@gpuixui/components` `internal/dismiss-layer.ts` keys event consumption on `WeakSet<EventPayload>` identity; 0.10.0 delivers **a separate payload object per handler** (measured), so one Escape closes every open overlay. Replace it with the field claim `internal/event-claim.ts` already implements (one shared claim module), and keep `menu/sub.tsx`'s `insideSurface` containment — it is measured working (owner: `components`; evidence: plan `187` §9) — **live correction (plan `558`):** the field claim must be cleared on the next **task**, not a microtask. A real window delivers the two handlers of one propagation across a microtask, so the microtask reset closed both layers and both outside presses; with `setTimeout(…, 0)` one press closes one layer. `live-layers` (41 checks) is the guard. Do **not** use a `WeakSet` or a microtask claim.
`[x]` Probe the command surface per plan `176`: `command-palette` — a window shortcut opens a non-modal overlay, the field keeps focus while arrows move a visual row, letters/arrows/Escape reach both the field and the app-level handler while Enter and Backspace do not, `cmd-k` does not type, `onSubmit` commits and returns focus, the scrim is a hit-testable sibling under the surface; adds the `command` capability — 58 checks, suite `44 → 45`, three two-direction proofs recorded. `Application menus` is recorded as in-window only: 0.10.0 has no menu API
`[x]` Probe the remaining Tier 1 controls natively per plan `169`: `RadioGroup` arrow selection/wrap, `Rating` clamp/clear, `NumberField` step/clamp, `OTPField` focus advance and Backspace — 38/38 green, two-direction proofs recorded
`[x]` Probe the shipped Tier 1 primitives natively per plan `168`: mount `@gpuixui/primitives` (`Button`, `Toggle`, `Input`, `Checkbox`, `Switch`, `Select`, `Slider`, `Progress`, `Meter`, `Skeleton`, `Tooltip`) through the tokens theme and add the `components` capability — 36/36 green, two-direction proofs recorded
`[ ]` **packages/data-grid** (no owner yet): implement the contract plans `152`, `185` and `338` measured — one plain horizontal scroller holding the header and a wide `<virtual-list>`, a frozen column placed from `getListScrollTop` read inside `onVisibleRange`, a `scrollToItem(0)` reset on every sort/filter, a pan affordance outside the rows (a body-cell `deltaX` wheel is swallowed by the list), and component-windowed columns when the grid is wider than this probe. `data-grid-virtual` is the acceptance evidence.
`[ ]` **packages/docking** (owner: docking): implement the contract plan `184` measured — a recursive layout tree, 48 px edge drop zones from the surface rectangle, right/bottom-secondary and left/top-primary splits, prune/collapse of emptied groups, `key={node.id}` on every split, `Region`/`TabList`/`TabPanel` semantics, and app-owned JSON restore. The playground's `docking-layout` is the acceptance evidence.
`[ ]` Cross-team: `@gpuixui/components` must handle the measured floating defects — `PopoverContent`/`DropdownMenuContent` expose `align="center"`, which is short by half the panel on both axes, and `fit="snap"` does not flip, so a near-bottom menu must choose `side="top"` itself (owner: `components`; evidence: plan `156` §8)
`[ ]` Cross-team: `motion.div`'s published `MotionDivProps` omits `testId`, `role` and the `aria-*` props, so an animated surface cannot be addressed in a smoke test or given an accessible role through the typed API. Add a typed motion wrapper (published `HostProps` + `motion`) in `@gpuixui/components` and use it for Collapsible/sidebar/toast surfaces (owner: `components`; evidence: plan `157` §8)
`[~]` **Promote the playground workstream to the integration branch** —
      **prepared and pushed on this branch 2026-10-19:** an owner/supervisor
      runs the fast-forward; the workstream itself never pushes to master.
      **Preparation:** `agent/playground` merged
      `origin/master` (43 commits: the docs site and its Blocks/Theme Editor,
      `@gpuixui/tw`, the zIndex patch and the transform work). The six
      conflicts were resolved here: `apps/playground/src/smoke/run.ts` and its
      test keep the shared `scenario-selection.ts` rule (master had an earlier
      single-value `--only`), `scripts/swarm-supervisor.sh` takes master's
      scoped-verification text, `TODO.md` and both READMEs take the union of the
      two truths, and the plan-number collision on `525` is fixed by renumbering
      the input-payload plan to **`533`**. `origin/master` (`b8fbf153`, the docs
      Tabs indicator) was merged again on 2026-10-19; its one formatting
      violation in `apps/docs/src/components/docs/demos.tsx` is fixed in commit
      `751bb2aa`, so the branch contains every commit of `origin/master` and the
      promotion is a fast-forward. Merge/release gate **re-run on the plan-620
      code (2026-10-19, `ca045161`):** headless **104/104** (`3672` checks, 64
      capabilities) and live **88/88** (`2220` checks, 58 capabilities,
      921.7 s), both exit `0`; `nub run check`, `nub run lint` and
      `nub run test` pass at that head. Artifacts:
      `apps/playground/.artifacts/smoke-report.json` and `live-report.json`.
      The workstream's own instruction is *never push to master*, so an
      owner/supervisor performs the final merge. **Addendum (plan `623`):**
      `live-toast` and (plan `624`) `live-text-entry` are registered after that
      gate, so the recorded 88/88 predated them. **Final gate re-run on this
      head (2026-10-19):** headless **104/104** (`3672` checks, 64
      capabilities) and live **90/90** (`2330` checks, 59 capabilities, 881 s),
      both exit `0`; `nub run check`, `nub run lint` and `nub run test` pass
      (playground 424, testing 61, components 308, primitives 282, tokens 196,
      tw 103, icons 19, docs 7). The gate's first run exposed a real-time
      fixture budget in `live-toast` — its 5 s cards expired under load — fixed
      to 60 s with a two-direction proof (plan `623` §10). **Addendum (plan
      `633`):** `live-tier2-navigation` gained six checks (20 → 26, same id)
      after that gate, so the supervisor's merge gate must cover the current
      head; no registered id changed, so the total stays **90**.
`[ ]` Cross-team: `@gpuixui/components` plan `117` §5a still reports the native renderer as **unavailable** on this host, so its 21 Tier 2 behaviour suites are not collected. ADR 0003 fixed that: point the behaviour config at the locally built `darwin-x64` 0.10.0 binding (or run on CI) and record the measured verdicts (owner: `components`; evidence: plan `140` §4, ADR 0003)
`[ ]` Cross-team: **charts and the colour picker must not build on `<canvas>`** — it is retained but renders `gpui::Empty` on 0.10.0 (no bounds, children dropped). Use `<svg>` for static drawing and `<img>` + `setImagePixels` for live bitmaps (owner: `components`; evidence: plan `161` §8, `COMPONENTS.md` Charts / Color picker)
`[ ]` Cross-team: `@gpuixui/components` **ToastViewport** — `createPortal` is **not exported by `@gpuix/react` 0.10.0**, so the absolute, last-child viewport is the only path (it is measured working); and the AccessKit dump has **no live-region concept**, so a static `role="status"` label does not announce a toast's message — label each card (or expose its text as the accessible name) rather than relying on the viewport label. Owner: `components`; evidence: plan `183` §7
`[x]` Cross-team (risk, resolved by measurement): a **timer-driven `AnimatePresence` exit can be skipped** — plan `336` reproduced a frozen-clock exit that had been painted and still lost its leaving card, consistent with a queued `setRenderedChildren(presentChildren)` remounting the exiting child (a fresh motion state whose first frame is the exit settles at once). The playground no longer asserts a frozen timer exit (`toast-lifecycle` asserts it on a synchronous dismissal). **Plan `337` measured the shipped `ToastViewport`: it renders the queue directly with no `motion`/`AnimatePresence` (`viewport.tsx:227`), so a timer removal is a plain state update and there is no leaving card to skip.** The risk applies only to the local motion probe (already guarded) and to a consumer that wraps toast cards in `motion.div`; there is no component defect.
`[ ]` Cross-team: **drag-and-drop and detachable tabs must hit-test pointer coordinates** — hover is frozen during a captured drag, the drag still ends in a click on the source, and a drop on an element without `onFileDrop` produces a click. The component owns the drop indicator and click suppression (owner: `components`/`docking`; evidence: plan `162` §8)
`[ ]` Cross-team: export the composed examples from `@gpuixui/primitives` (`"./examples": "./examples/index.ts"` in its `exports` map) so the playground can show and smoke the ten realistic compositions its README already points at; plan `168` builds against the public root export for now (owner: `primitives`)
`[ ]` Cross-team: `@gpuixui/primitives` `Text` must document the measured truncation caveats — `clamp` is real (`lineClamp` 2 → 52 px, 3 → 78 px, inherited from a width-constrained box) but GPUI **shares text layout per `(string, width)` and the key ignores `lineClamp`**, so two identical strings at one width clamp together (first laid out wins), and `whiteSpace: "nowrap"` alone has the same geometry as `ellipsis` while the painted report never carries the glyph. `truncate` is correct (owner: `primitives`; evidence: plan `335` §1/§12)
`[ ]` Cross-team: `@gpuixui/components` must not assume a row/menu item stays hovered while the pointer is over a child — hover is **per element** and a child's hover cancels its parent's (measured 400/120, not 420/120). A whole-row highlight needs the `hover` style on the child too, or a documented decision not to have one (owner: `components`; evidence: plan `335` §1.3)
`[x]` Playground (this workstream): `toast-lifecycle`'s frozen-exit assertion is deterministic — plan `336`. The flake's assertion now runs on the **synchronous** click dismissal (M1 fails it when `exit` is removed); the timer path asserts only what a timer proves (fired, own card only, survivor, later removal, reflow), and the two cards are named (`count=1`, `toast-6`, `toast-7`) before the timer starts (M2 fails it precisely when the long push is dropped, where the old assertion blamed a card that never existed). Suite `68/68`, 1785 checks (+4), three green full runs, gates green. Measured: a motion element's first painted frame is its from-state; a timer racing a paint and an `AnimatePresence` re-render is not a deterministic observation point
`[x]` Playground: `tier2-toast` measures whether the **shipped** `ToastProvider`'s real timer can hit the same `AnimatePresence` remount that skips a leaving card — plan `337`. Measured: the shipped `ToastViewport` maps the queue straight to cards with **no `motion`/`AnimatePresence`**, so the timer removal is a plain state update and there is no leaving card; the timer fires with the GPUI motion clock frozen, the removed card has no painted bounds, and the survivor reflows to the 16 px inset. `tier2-toast` 21 → **25** checks, suite 1789 (+4), three green full runs; `smoke:live` stays 20/20; four mutation proofs (§8). No component defect: plan `336`'s race is a local-probe/consumer-motion property
`[x]` Probe the **pointer half of native text entry** per plan `343`: `pointer-text-entry` — a click places the caret at the nearest glyph (left edge prepends, middle lands inside, right edge appends); a press-move-release selects the run and typing replaces it; a plain click clears the selection; `shift`-click extends it; Enter inserts a newline in a `<textarea>` (autosize 32 → 64) and `Up` returns to the previous line. Adds `pressWindow` and modifier arguments to the host's click verbs (adapter test included). 22 checks, suite `71 → 72`, 1951 → 1973 checks, exit `0`; three mutation proofs recorded (plan `343` §8)
`[x]` Probe the **typography layout contract** per plan `342`: `typography-layout` — an explicit `lineHeight` is exact (30, and 60 for two wrapped lines), the default line box scales with the font size (12 → 19.5, 16 → 26, 24 → 39), `fontWeight: "700"` widens the word by ~4 px, and a `<text>` block fills its parent. **`textAlign` is a no-op in 0.10.0** on the `<text>` and its parent, so `Text`'s documented `align` prop does nothing; `alignSelf` (82.5/165 in a 200 px column) and a narrower width in a `justifyContent` row (70) are the working routes. 28 checks, suite `70 → 71`, 1923 → 1951 checks, exit `0`; three mutation proofs recorded (plan `342` §8). Adds the `typography` capability
`[x]` Probe the **grid and wrapping layout contract** per plan `341`: `layout-grid` — three equal tracks split 300 px into `93.5/93/93.5` with exact 10 px gaps; explicit rows split a fixed height (`145×95`) and stretch an unsized child while a declared height wins; auto rows follow the tallest child; only the default and `gridColumnMin: "zero"` give equal tracks (`min-content` fills with `104/186`, `max-content` leaves `66` px unused); a nested grid resolves against its cell; an oversized child overflows its track; `flexGrow` fills a flex row; `justifyContent` centres content-sized tracks; and a fixed-height wrapping row stretches its line boxes (third child y `104`) unless it sets `alignContent: "flex-start"` (`38`), while an auto-height row is exact (`68`). 75 checks, suite `69 → 70`, 1848 → 1923 checks, exit `0`; three mutation proofs recorded (plan `341` §8). Adds the `grid-layout` capability
`[x]` Probe the **virtualized data grid** per plan `338`: `data-grid-virtual` — a wide `<virtual-list>` inside one plain horizontal scroller pans the header and every row (alignment within 1 px at `-90` and at the far edge `-400`); a `deltaX` wheel over a header cell pans, while the same wheel over a body cell is **swallowed by the list**; a frozen column placed from `getListScrollTop` read inside `onVisibleRange` aligns within 1 px (the `onVisibleRange` payload left the anchor at `0` after a 280 px wheel); sorting or filtering from anchor `45` must call `scrollToItem(list, 0)` or the grid shows unrelated rows; a cell in a panned virtual row hit-tests and takes native focus. 59 checks, suite `68 → 69`, 1789 → 1848 checks, exit `0`; five mutation proofs recorded (plan `338` §8)
`[x]` Prove **workspace restore in a real window** per plan `339`: `live-restore` mounts the shipped `workspace-restore` probe in the real 1100×720 window — a paced divider drag paints `320 → 400`, a tab activation makes `active=two`, `scrollToItem(120, 16)` anchors the list, and save → reset → restore re-applies the split, the tab and the anchor exactly (`[120,16]`; row 120 painted, row 0 absent). Native focus is **not** restored, and a click on row 121 focuses the restored list. Live `20 → 21`, exit `0`; two mutation proofs recorded (plan `339` §6)
`[x]` Prove **table sort and selection in a real window** per plan `340`: `live-table-sort` mounts the shipped `table-select-sort` view — a wheel moves the body (`y ≈ -200`), `table-sort` reorders the row the automation tree points at (`table-first` → `Item 199`), a real click selects `r199`, and the selection survives a re-sort. Live `21 → 22`, exit `0`; three mutation proofs recorded (plan `340` §6)
`[x]` Mount the **rest of the shipped Tier 2 catalogue** in the playground per plan `344`: `tier2-foundation` (Card's three variants and shadow rule, primary Badge painting the token role, Avatar initials/32–40 px/`Image`, Alert role and dismiss, EmptyState action, List selection by click/arrow/Enter with a disabled row) and `tier2-navigation` (Tabs panel swap/arrows/disabled skip, Accordion single mode and `collapsible`, Collapsible `expanded`, Breadcrumb `navigation`/`Link`, Pagination page/Next/Prev/`aria-selected`). 42 + 55 checks, suite `72 → 74`, 1973 → 2070 checks, exit `0`; four mutation and two reverse proofs recorded (plan `344` §8). Measured consumer facts: an a11y node carries `author_id` only when the consumer authors `aria-id`; the runtime **does** map `role="img"` to AccessKit `Image` (the plan-160 table omitted it)
`[x]` Prove the **foundation and navigation catalogue in a real window** — plan `344`: `live-tier2-foundation` (18 checks: Card/avatar paint, alert dismiss, empty-state action, List click/arrow/Enter selection with the disabled row skipped) and `live-tier2-navigation` (17: a click swaps the panel, a later click selects Settings, Accordion single mode + Enter close, Collapsible open/Enter close, Breadcrumb clicks, Pagination page/Next/Prev). Live `22 → 24`, checks `373 → 405`, exit `0`, two screenshots. **Two harness lessons:** a live step must `settle` after the click that establishes a row's active state before sending a key (the first run raced the commit and made List arrows look broken), and a click focuses natively without running React's `onFocus` (plan `345`), which is the real cause of the Tabs arrow result
`[x]` Measure **live key routing** per plan `345`: `live-key-routing` (23 checks) proves a key reaches the focused element, bubbles through **every** ancestor (focusable or not), and then reaches the app-level window handler (`inner=1 middle=1 outer=1 window=1`); `autoFocus` and a real click both focus natively **without running React's `onFocus`** (`innerFocus=0 outerFocus=0`); a live `cmd-k` reaches the window handler with `modifiers.cmd`. The probe also wires `useWindowKey` into the live runner for the first time. Live `24 → 25`, checks `427 → 431`, exit `0`. **Amended by plan `390`:** a click's `onFocus` count is window/host-state dependent (the same clean code read `0` at 15:03/15:10 and `1` from 15:25), so the check is now "the click focuses the child" (22 checks) and the counter is printed, not asserted.
`[x]` Mount the **Tier 2 choice and form catalogue** per plan `346`: `tier2-choice` drives the shipped `Popover` (anchored below, row toggle, Escape focus return, outside dismissal), `SearchInput` (typing, submit, Escape clear), `Combobox` (ranked filter, value select, disabled row, empty state), `DatePicker` (month grid, bound clamp, Enter select, clear) and `TimePicker` (segment composition, clamp, `minuteStep`, clear); `tier2-forms` drives `Field` (consumer-triggered schema message replacing the description, `Required` announcement), `Fieldset` (named `Group`, disabled token paint, refused edit, tab-order exit) and `Form` (invalid messages, decoded submit, pending lock). 59 + 34 checks, suite `74 → 76`, `2070 → 2163` checks, exit `0`; live twins `live-tier2-choice` (13) and `live-tier2-forms` (14) make the live suite `25 → 27` (`431 → 458`), exit `0`; four mutation and two reverse proofs recorded (plan `346` §8)
`[x]` Mount the **remaining shipped Tier 2 catalogue** per plan `347`: Drawer, Stepper, Timeline, InlineEdit, TagInput, Carousel, ColorPicker, MentionInput, NavigationMenu, HotkeyRecorder, KeyboardShortcuts and Countdown. `tier2-editing` (48 checks) and `tier2-flow` (59) drive the consumer path; suite `76 → 78`, `2163 → 2270`, exit `0`; live twins `live-tier2-editing` (24) and `live-tier2-flow` (24) take live `27 → 29` (`458 → 506`), exit `0`; five mutation + two reverse proofs (plan `347` §8.3). Adds `AsyncSmokeHost.clickWindow`. Measured: a swapped editor took the edit from a coordinate click until the plan-596 gate replaced it with the locator click plus the component's own focus move (which the scenario now asserts), React's `onBlur` does not run for a native focus change headless, `Carousel`'s `display: none` does not hide a slide, and `TagInput`'s chip control has no `testId`
`[ ]` **Cross-team (defect):** `@gpuixui/components` **Carousel** hides an inactive slide with `display: "none"`, which 0.10.0 ignores — every slide keeps painted bounds and stays hit-testable, so a carousel shows all slides stacked and a hidden link can be clicked. `tier2-flow`/`live-tier2-flow` assert the measured behaviour. Fix: the tabbed panes' absolute-slot + `visibility: "hidden"` recipe (`workspace-panes`, plan `177`), with a bounds test. Owner: `components`; evidence: plan `347` §8.2
`[x]` **Cross-team (limitation, resolved by measurement):** `@gpuixui/components` **InlineEdit** commits on blur; plan `347` measured that React's `onBlur` did not run for a native focus change in a live window, and plan `390` found the sibling delivery window/host-state dependent. **Re-measured 2026-10-19 (plan `555`):** in the current window a click on the focusable `ws-elsewhere` **does** commit the open draft (`name=livez commits=2`), paints it and leaves focus on the clicked element; three consecutive live runs. `live-tier2-editing` now guards it (and asserts the click's focus is not stolen); the headless host still delivers no `onBlur`, so `tier2-editing` asserts the editor stays open there — a harness difference, not a component defect. No explicit commit/cancel control is needed. Owner: `components` (no change); evidence: plan `555` §8, plan `347` §8.2, plan `390` §6
`[ ]` **Cross-team (re-verify):** `@gpuixui/components` **Tabs** sets its roving `active` only in `onFocus`. Plan `344`/`345` measured that a live click focuses a tab natively without running React's `onFocus`, so an arrow after a click started from the **first** enabled tab; plan `390` measured the same clean code with `onFocus` running (a click-then-arrow from the clicked tab), so the result is **window-state dependent** and the live suite no longer asserts the old defect. Fix anyway for robustness: set `active` in the trigger's click handler (or use the `focusRow` path `List` uses), add a headless click-then-arrow test, and re-run `live-tier2-navigation` in both states. Owner: `components`; evidence: plans `344` §8.1, `345` §6, `390` §6
`[ ]` **Cross-team (defect):** `@gpuixui/components` **DatePicker** focuses the **month head**, not `today`, when it opens with no value — `tier2-choice` measured `date-day-2026-10-01` with `today="2026-10-17"`, and with `min="2026-10-17"` the focused day is *before* the bound, so the first arrow press jumps forward. Cause: `date-picker.tsx`'s focus effect falls back to `startOfMonth(viewMonth)` while `active` is still `None` in that commit (the `useLayoutEffect` that sets `active` from `selectedDay ?? todayDay` has not rendered yet); the tab stop itself is correctly clamped. The in-package suite only opens with a selected day, so it does not cover the no-value case. Fix: seed `active` from the same clamped anchor (or focus `tabbable`), add a no-value focus test and flip `tier2-choice`/`live-tier2-choice` to assert `today`. Owner: `components`; evidence: plan `346` §8
`[ ]` **Cross-team (a11y):** `@gpuixui/components` **ComboboxTrigger** authors `aria-expanded` but **no `role`**, and in `tier2-choice` no accessible node was addressable by its authored `aria-id` — so the expanded state is not exposed to assistive technology. Add `role="combobox"` (or `button`) to the trigger and a behaviour test that reads its `aria` node. Owner: `components`; evidence: plan `346` §8
`[~]` **Cross-team (docs truth):** 15 `packages/components/docs/*.mdx` pages say their runnable example is "which the native playground mounts" (`preview-card`, `countdown`, `drawer`, `navigation-menu`, `inline-edit`, `hotkey-recorder`, `color-picker`, `mention-input`, `carousel`, `form`, `stepper`, `fieldset`, `timeline`, `keyboard-shortcuts`, `tag-input`), but `packages/components/examples/index.ts` lists only 24 of the 38 examples. **The playground half is done:** plans `346`/`347` mount all 15 families' contracts (`tier2-choice`/`tier2-forms`/`tier2-editing`/`tier2-flow`, plus live twins). Remaining: complete the example registry and point each page at the playground view that proves it (or reword). Owner: `components`; evidence: `rg "which the native playground" packages/components/docs`, plan `347` §1. **Addendum:** `message-scroller.mdx` makes the same claim, but plan `581` mounts the shipped parts in `tier2-scroller`/`live-tier2-scroller`, not the example file — reword that page to cite the scenario.

`[x]` Mount the real Tier 2 components in the playground and drive open/close/confirm in the native suite — plan `330`: `tier2-dialog` (24 checks: open, centred, focus entry, Tab/Shift-Tab containment, Escape + focus return, ConfirmDialog cancel-first and confirm-never-closes), `tier2-menu` (18: click open, arrows skip the disabled row, Enter activates once and restores focus, right-click placement within 12 px, outside/Escape dismissal) and `tier2-toast` (21: push paints, 16 px inset, 380 px card, action runs once, stack order, Escape is not a shortcut, a 300 ms duration dismisses itself). Suite `61 → 64`, exit `0`, `tier2=verified`; three mutation proofs recorded (plan `330` §8). The toast probe's fixed 350 ms wait is replaced by a bounded `awaitReadout`, removing the flake seen under load
`[x]` Prove the shipped Tier 2 components **in a real window** per plan `331`: `live-tier2-dialog` (24 checks: centre within 2 px of the window, Tab trap, focus return, Cancel-first, confirm leaves it open), `live-tier2-menu` (15: native focus on the surface, disabled row skipped, Enter once, context menu within 12 px of the right click, Escape) and `live-tier2-toast` (21: 16 px inset, 380 px card, action once, stack order, a real 300 ms timer). Live `16 → 19`, exit `0`, `tier2=verified`; three live mutation proofs recorded (plan `331` §8); two consecutive full live runs green
`[x]` Probe the **replace** half of the find bar per plan `333`: `replace-contract` + `live-replace` — an `<input>`'s own `highlight` reports `matchCount=0` (editor text is not highlightable, so a find bar needs a rendered preview), a component-set value repaints the editor and the preview's washes, **the caret moves to the end** across the rewrite, `replace-all` is idempotent, and there is **no `setSelection`** to select the active match. Suite `64 → 66` (both replace probes), live `19 → 20`, exit `0`, `replace=verified`; 8 pure tests and the two-direction proof recorded (plan `333` §8). Also hardened three real-timer flakes found under full-suite load: the toast's frozen exit pauses the motion clock before the short timer can fire, and the tooltip/preview closes use the bounded `awaitReadout`
`[x]` Probe the **document half** of search-and-replace per plan `334`: `search-replace` — a document mutation re-washes and recounts; replacing one of five matches keeps the cursor at index 2 and the active wash on the match that followed; replace-all clears the paints and count; a **count-preserving** replacement (`error` → `ERROR`) moves the washes **without** firing `onHighlight`, so a UI cannot rebuild from the event alone; `error` → `errors`/`err` shift downstream matches by exactly `+1`/`-2`; `<code>` re-highlights by prop; and a textarea/input value is painted but **never washed** while a `<text>` sibling under the same query is. 50 checks, exit `0`; 9 pure tests for the right-to-left range fold and cursor clamp; two-direction proofs: dropping `highlight` fails `total=5 → 0`, and folding ranges left-to-right fails two unit tests plus the native exact-text check with the measured corrupted string (plan `334` §9)
`[x]` Probe **declared interaction states and text truncation** per plan `335`: `declared-styles` — hover 100 → 140 and active → 180, reverted on leave/release; **hover is per element** (a child's hover cancels its parent's: 400/120, not 420); the style report keeps the authored values, so `paintedStyle` cannot see a colour-only hover; a press at a point does not enter hover; `active` survives the pointer leaving while held. `text-truncation` — `textOverflow` (both variants) collapses to one line, `lineClamp` is exact (2 → 52 px, 3 → 78 px) and inherits, **but the shared text layout is keyed on `(string, width)` and ignores `lineClamp`**, so identical strings clamp together while `textOverflow`/`nowrap` re-key it; `getPaintedText()` reports the source run, so the ellipsis glyph is not assertable. 17 + 12 checks, suite `66 → 68`, exit `0`, `states`/`truncation=verified`; six mutation proofs recorded (plan `335` §8/§12)
`[x]` Land the shared runtime replay helper per plan `332`: `packages/testing/src/state.ts` (`State.runCommands`) folds a structural runtime's commands and returns the final state plus the query output; 5 tests, the "ignore the command" mutation fails three of them, and the package README documents the namespace
`[ ]` **Cross-team (blocker):** `@gpuixui/components` cannot be executed from source by `nub` — its `tsconfig.json` maps `@gpuix/react/jsx-runtime` to a `.d.ts`, so Node throws `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` (reproduced from inside the package). The playground works around it by compiling the package with `apps/playground/tsconfig.vendor.json` (`vendor/` script). Durable fix: point that mapping at the runtime `.js` (or give `packages/tokens` a resolvable `@gpuix/react` and delete the shim). Owner: `components`/`tokens`; evidence: plan `330` §8.1
`[x]` Record the build host's missing 0.10 binding as ADR 0001 (evidence + consequence)
`[x]` Probe GPUix 0.5.1 on this host: it runs (real window, layout/input/overlay/panel/virtual-list/programmatic scroll) and it never delivers focus or wheel-scroll events — ADR 0002
`[x]` Establish the GPUix capability map from docs/types and measured probes (layout, input, focus, overlay, scroll, panel, virtual-list, Tier 3/4)
`[x]` Land `packages/testing` (harness, report, runtime preflight) per plan `100`
`[x]` Land the `legacy-probe` (0.5.1) so the documented capability matrix is reproducible per plan `110` §3.4
`[x]` Land `apps/playground` shell + `SplitPane` + the eight core scenarios per plan `120`
`[x]` Land the Tier 3/4 probe scenarios per plan `130` (`table-select-sort`, `table-column-resize`, `workspace-tab-drag`) — now run green on this host
`[x]` Correct the scenarios to the measured 0.10.0 contract (wheel sign, painted-window virtual-list, visible-row selection, pointer-capture `onMouseMove`, focus traversal, overlay handlers on the content div) — plan `140` §4
`[x]` Add the app-level window-key probe (`window-key-shortcut`: cmd-k palette, Escape) so the command-palette/app-menu path is covered — 12/12 green
`[x]` Land the native theme gallery per plan `150`: `paintedStyle` on the smoke host (schema-decoded at the boundary), `theme` capability, `theme-color-roles` + `theme-type-and-shadow`, and the shell wired to `@gpuixui/tokens` — 14/14 green; `src/theme.ts` deleted
`[x]` Guard the app's own navigation per plan `151`: `App` takes the scenario list as a prop and the sidebar is a scroll container; `shell-navigation` mounts the real shell, proves the 15-entry list scrolls and that the last entry ends up inside it — 15/15 green (fails with exit `1` when `overflowY` is removed)
`[x]` Probe the virtualized table per plan `152`: `virtualized-table` — 500 fixed-height flex rows with fixed-width cells inside `<virtual-list>`, a painted row hit-tested and selected, selection surviving scroll; measured the one-gesture `onVisibleRange` lag — 16/16 green (fails with exit `1` when the row `onClick` is removed)
`[x]` Probe the tree view per plan `153`: `tree-view` — exact per-depth indentation, expand/collapse repaint, click-to-focus and arrow-key delivery; the no-programmatic-focus limitation recorded — 17/17 green (fails with exit `1` when the directory toggle is disabled)
`[x]` Probe the log viewer per plan `154`: `log-viewer` — bottom-anchored `<virtual-list>` starts at the tail and re-anchors on appends; the overlap of `alignment`/`followTail` and the no-snap-back-on-scroll limitation recorded — 18/18 green (fails with exit `1` when both props are dropped)
`[ ]` **Gold standard (outside this workstream):** add `.github/workflows/native-smoke.yml` running `nub run --filter playground smoke` on `macos-14` (Apple Silicon) to confirm with the **published** binary (this host's verdict uses a locally-built binding, ADR 0003). A **real window** and a live automation run are now confirmed locally (plan `189`), so CI only has to reproduce them on the published binary — `macos-14` runners have a display for `smoke:live`; a headless runner should expect its exit `2`. Owner: whoever owns CI/platform
`[ ]` Cross-team: the docs-site capability matrix must gain the `root` capability and the ids `root-single-child` + `root-wrapper` (and `live-root` if its live list names ids) — `apps/docs/src/lib/capabilities.test.ts` compares `COMPONENTS.md`'s measured table with `apps/docs/src/lib/capabilities.ts` and requires every cited scenario to exist in the playground registry, so its gate stays red until the row lands (owner: `docs-site`; evidence: plan `522` §4)
`[ ]` Cross-team: the docs' honest native previews need **committed** images; the smoke run writes 18 frames to the gitignored `apps/playground/.artifacts/screenshots`. Decide (docs-site) whether to commit a curated set under the docs app and how it is refreshed; never substitute a browser reimplementation. Owner: `docs-site`
`[x]` Wire the playground to `@gpuixui/tokens` and delete the app-local `src/theme.ts` (plan `150`) — the shell, shared helpers and every scenario read `useTheme()`; the smoke runner wraps each view in `ThemeProvider`
`[ ]` Make `@gpuixui/tokens/react` consumable by a GPUix app without a tsconfig shim: its JSX compiles against `@gpuix/react/jsx-runtime` because the consumer sets that `jsxImportSource`, but `packages/tokens` cannot resolve it, so `apps/playground` maps the type path in `tsconfig.check.json`/`tsconfig.build.json`. Fix in `packages/tokens` (a `/** @jsxImportSource react */` pragma, or `createElement`) and remove the mapping. Owner: `tokens` workstream
`[ ]` Replace the jj-based `scripts/verify-two-directions.sh` with a git implementation (outside this workstream)

#### Process — one writer per tree

`[ ]` **Supervisor bug: two playground agents ran in `workspaces/playground` at
once.** The 30-minute tick starts a workstream loop when its pid file is gone,
but an interactive session for the same workstream is not tracked, so a second
agent implemented `packages/testing` while the first was mid-edit. Either track
interactive sessions or refuse to start a workstream whose tree has uncommitted
changes from another pid. Owners: whoever owns `scripts/swarm-supervisor.sh`.

`[!]` **B3 recurred 2026-10-18 ~04:30–05:20 in this worktree.** Two live
`swarm:playground` sessions wrote `apps/playground` at once: the rotating
`opencode run` turn (`ses_eb35f2b2…`, started 04:29) and an interactive session
(`ses_eb379350…`, started 04:01, `time_idle` null). Both independently chose
plan number `333` and built a replace probe; the two also ran the native/live
suites concurrently, so each saw a different real-timer scenario fail
(`tooltip-open` once, `toast-lifecycle` once) while the same scenarios passed in
isolation. Resolution: the two probes were kept as plans `333` (editor/caret,
`replace-contract`/`live-replace`) and `334` (document/cursor, `search-replace`),
the pair was committed and re-run to `66/66` + `20/20`, and the measured fact
that contradicts plan 333's original commit message was corrected in the plan,
`COMPONENTS.md` and `TODO.md` (the caret moves to the **end**; the typed `z`
landed after the final period). Do not start a second playground session while
this tree has one: the supervisor's `agent_alive` still cannot see an
interactive session, so this needs the plan `022` §5 fix in `scripts/`.

**B3 recurred again 2026-10-19 ~07:34 in this worktree.** A new rotating
`swarm:playground` turn (PID `35710`) started while the interactive session was
live and edited the plan `603`/`605` measured records at 07:35, seconds after the
interactive session committed a renumber of the same file. The additions were
consistent with the gate and were kept in `979de6e0`; no work was lost. The
supervisor still cannot see an interactive session, so this remains a
`scripts/swarm-supervisor.sh` fix, not a workstream one.

**B3 recurred again 2026-10-19 ~08:28–08:43.** A rotating turn (PID `98015`,
started 08:28) ran the merge gate and committed `0d083cef` (the 607 gate record)
and `aa34395b` (promotion prepared) while the interactive session was running its
own full live gate. Both gates were green and agreed (86/86, 2172 checks), so
the duplication cost ~15 minutes and no work was lost. The turn's promotion
record and this session's independent gate agreed (each ran the full suite);
the ledger kept one copy. The guard is still the one-writer fix in `scripts/`.


## Phase B — working foundation

`[x]` `[██████████]` 10/10

`[x]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[x]` Land the `@gpuixui/tw` extension registry, luma `cn-*` aliases and state
variants (plan 524)
`[x]` Land the primitives package
`[x]` **Native smoke test**: layout, input, focus, overlay, scroll, panel and virtual-list primitives verified in real GPUix 0.10.0 on this host (11/11, plan `140` §4)
`[x]` Land one fully working component running in GPUix — all 19 Tier 1
      components mount in the real `TestRenderer` (plan 041; 119 runtime tests
      after plan 055), and the playground drives the shipped package through the
      token theme (`primitives-actions`, `primitives-fields`,
      `primitives-display`, plan `168`)
`[x]` Land the docs shell and the component page pattern in Fumadocs — the
sectioned sidebar (Getting Started / Components / Contributing), the reusable
Preview/Code template, the `nub` install block, the "On this page" TOC, the
previous/next pager, and the Button, Dialog, Popover and Tabs pages are deployed
under <https://gpuixui.sudokw.com/docs>
`[x]` Land the Blocks and Theme Editor docs surfaces (plan 436) — the
`/docs/blocks` index with Login/Settings recipes and the `/docs/themes` live
token editor, deployed under <https://gpuixui.sudokw.com/docs>
`[x]` Land the marketing landing page at `/` (plan 434) — Hunter License
identity, stacked-native deck hero, library grid, proof, attribution
`[x]` Deploy the Fumadocs app (landing + getting started) to
<https://gpuixui.sudokw.com> on Cloudflare Workers via the alchemy stack

### Design tokens and theming (`tokens-theme`)

`[x]` `[███████░░░]` 14/20

`[x]` Write and index the tokens/theme plan set (plans 010–019 and 051)
`[x]` Implement `packages/tokens`: semantic colour roles, typography, spacing,
radii, density, elevation, light + dark themes
`[x]` Implement the theme extension mechanism (`createTheme`/`extendTheme`) and
the `@gpuixui/tokens/react` provider
`[x]` Add high-contrast (AAA) light and dark themes (`getTheme(mode, "high")`)
`[x]` Add status tone roles plus `alpha` and `statusTone` helpers
`[x]` Expose `colorRoles` for the docs site's generated token tables
`[x]` Make `@gpuixui/tokens` resolvable from source so a clean checkout needs no
prebuilt `dist` (plan 016)
`[x]` Ship `focusRing(theme)` and correct the focus claims in `docs/tokens.md` and
`docs/design-system.md` — GPUix 0.10.0 has no `outline*` and no `focusVisible`
(plan 017)
`[x]` Drop `BoxShadow.inset`, document the one-shadow rule and hoist
`elevationShadow(theme, level)` (plan 018)
`[x]` Write `docs/tokens.md` (every token + extension API)
`[x]` Write `docs/design-system.md` (identity, roles, state, accessibility)
`[x]` Add platform type styles and `platformTheme(theme, platform)` for the docs
platform toggle (plan 051)
`[x]` Add the design-system rows to `COMPONENTS.md`
`[ ]` Add motion tokens (durations/easings) once a component consumes them
`[ ]` Ship `registerFonts` so a consumer's (or the library's) typeface reaches the
runtime, and record the licence review for any bundled family — plan 052, native
proof blocked by B1 (rescued from the abandoned `agent/fonts` branch)
`[x]` Cross-team: native theme gallery in `apps/playground` (owner:
`playground`) — landed as plan `150`; Fumadocs Theming page from `docs/tokens.md` and the
docs platform toggle (macOS / Linux / Windows / Default) built on
`platformTypes` + `platformTheme` (owner: `docs-site`); ignore the `references`
**symlink** — a `references/` rule does not match a symlink, so every worktree
shows it as untracked (owner: repo tooling; `packages/README.md` already lists
`tokens`)
`[x]` Components consume `@gpuixui/tokens` directly: the local `withAlpha`,
`focusRing`, `elevation` and hand-mixed `tone` palette are gone; `internal/theme.ts`
re-exports the token helpers and keeps only the `danger` → `destructive` mapping
(plan 157)
`[ ]` Cross-team: `primitives` still carries its local focus-ring and
first-shadow helpers (`primitives/src/core/style.ts`) — delete them now that
`focusRing` and `elevationShadow` are in tokens (owner: `primitives`; plan 157
records the components half)
`[x]` Components carry no structural copy of `@gpuixui/tokens` and import the
package directly (plan 157)
`[!]` Tokens' `src/react.tsx` is compiled inside the components program when
tokens resolves from source; the isolated linker puts `@gpuix/react` only under
`packages/components/node_modules`, so components' `tsconfig.json` maps the JSX
runtime to its own dependency. The durable fix is a tokens-side
`@gpuix/react` devDependency or an `@jsxImportSource react` pragma (owner:
tokens-theme — do not edit from this workstream)
`[x]` Promote the workstream to `main`: plans 010–019 and 051, `packages/tokens`
and the union plan index are on `main` (commit `458fe10`); `main` now compiles
`@gpuixui/tokens` from source, so `primitives`, `components` and `docs-site` can
merge it and drop their structural copies
`[ ]` Merge `main` into `agent/tokens-theme` once plan 019 (motion tokens) lands
there, then promote that commit — `agent/tokens-platform` is a second branch for
this workstream, created because two live sessions shared one worktree (see
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`), and should be
retired once both branches are one

### Primitives workstream (owner: primitives)

`[x]` Write and index the primitives, icons and Tier 1 plans
`[x]` `packages/icons`: registry, sizing, accessibility rule, invariant tests
`[x]` `packages/primitives`: the `core/` layer (theme re-export, style
      resolution, variants, keyboard, state, layout, selection, loading) with
      tests
`[x]` `packages/primitives`: `ThemeProvider` + density override
`[x]` `packages/primitives`: layout primitives (Box, Stack, Grid, Separator, Spacer, ScrollArea)
`[x]` `packages/primitives`: Text + typography scale
`[x]` `packages/primitives`: Button + ButtonGroup
`[x]` `packages/primitives`: Label, Input, TextArea
`[x]` `packages/primitives`: Checkbox, RadioGroup, Switch, Select
`[x]` `packages/primitives`: Progress, Skeleton, Spinner, Tooltip
`[x]` `packages/primitives`: element-tree test harness + component suites
      (`src/components/testing/element.ts`; render is impossible here, so a test
      asserts on the tree the runtime would receive)
`[x]` `packages/primitives`: package README (theme port, density, component
      list, and the runtime-verification status)
`[x]` `packages/primitives`: docs page + composed example for every Tier 1
      component, co-located in the package (`docs/`, `examples/`); one runtime
      suite mounts every example (plan 047)
`[x]` `packages/icons`: docs page and the icon-gallery example (plan 047)
`[x]` `packages/icons`: the size scale is `@gpuixui/tokens`' `iconSize`, not a
      second copy (plan 024)
`[x]` `packages/primitives`: `Input`/`TextArea` gain an honest `disabled` state
      (read-only, out of the tab order, guarded handlers) — plan 025
`[x]` `packages/primitives`: close three fixable limitations — a named
      `ButtonGroup`, `ScrollArea` scroll deltas, RadioGroup Home/End (plan 048)
`[x]` `packages/primitives`: the RadioGroup focus contract — a per-item focus
      ring, focus following the selection, a derived roving index, and
      `Switch`'s ignored `invalid` prop (plan 049)
`[x]` `packages/primitives`: Tier 1 runtime suites in `runtime/` — 46 tests
      against the real GPUix 0.10.0 `TestRenderer` (layout, controls, fields,
      loading, icons), with the two-direction proof; results in plan 041 §9
`[x]` `packages/primitives`: consume `@gpuixui/tokens` directly — delete the
      structural theme port and the local ring/shadow helpers, use `focusRing`
      and `elevationShadow`, and verify both shipped themes in the runtime
      (plan 021)
`[x]` `packages/primitives`: `alpha` comes from `@gpuixui/tokens`; delete the
      local copy and its test (plan 023)
`[x]` `examples/basic-app`: compose the Tier 1 set into one settings-form workflow
      (typed + `check-types` green; the app itself is **never run** — it needs a
      desktop session, while the primitives it composes are runtime-verified)
`[x]` `packages/primitives`: the extra Tier 1 controls are claimed here (D18):
      `Slider`, `RangeSlider` and `Meter` (plan 053) — value maths, paint,
      element trees, runtime geometry and focus proofs, docs pages and a
      composed example; the rest of the claimed rows are plan 054
`[x]` `packages/primitives`: `NumberField`, `OTPField`, `Toggle` and `Rating`
      landed (plan 054) — core modules, element-tree and runtime suites, docs
      pages and examples. `OTPField`'s multi-character fill is proven as a pure
      rule; a real clipboard paste is unverifiable in 0.10.0 (no `onPaste`, no
      clipboard simulation) and is documented as such
`[x]` `packages/primitives`: the remaining theme axes are runtime-proven (plan
      055) — the high-contrast palettes in both modes, a density override
      measured against the preset metrics, and `platformTheme`'s mono family
      reaching the paint; 13 files / 119 runtime tests
`[ ]` `packages/primitives`: docs pages for every Tier 1 component (docs-site workstream)
`[x]` **packages/testing**: the native adapter is hoisted (plan `178`) —
      `Native.createHost(renderer)` plus the structural `NativeRenderer` port and
      the `boundsOf`/`hitBoundsOf`/`subtreeText`/`focusedElement` lookups live in
      `@gpuixui/testing`; `apps/playground` no longer owns an adapter and the
      package still imports no `@gpuix/*`
`[ ]` Cross-team (defect): `@gpuixui/primitives` **`Text`'s `align` prop promises `textAlign`, which 0.10.0 ignores** — left/centre/right all paint the glyph run at the block's left edge, on the `<text>` and on its parent (measured). Implement it by moving the block (`alignSelf`/a `justifyContent` row) or document it as unsupported, add a runtime test, and fix `packages/primitives/docs/text.mdx` (owner: primitives; evidence: plan `342` §2)
`[ ]` Cross-team: `@gpuixui/primitives` **`Stack`'s wrapping contract** — a wrapping row in a fixed-height box **stretches its line boxes**, so the third 30 px child sits at y `104` in a 200 px container instead of `38`; the fix is `alignContent: "flex-start"` whenever `wrap` is set (or an explicit documented decision), with a runtime test (owner: primitives; evidence: plan `341` §2)
`[ ]` **packages/primitives** (owner: primitives): delegate
      `runtime/harness.ts` to `@gpuixui/testing`'s `Native` helpers — import the
      `NativeRenderer`/`NativeElement` types, `find`/`findById`,
      `boundsOf`/`hitBoundsOf`, `subtreeText`, `focusedElement` and the
      `focusNext`/`focusPrevious` dispatch rule, and delete the local copies.
      `test:runtime` must build `@gpuixui/testing` first (as the playground does).
      Evidence and the exact exports: plan `178` §3.

### Cross-workstream dependencies (do not edit their paths — record only)

`[x]` **resolved (D18)**: `COMPONENTS.md`'s extra Tier 1 rows — Slider, Range
      slider, Meter, Number Field, OTP Field, Toggle, Rating — are claimed by
      the primitives workstream: they are single-purpose input/selection/value
      primitives built from `div` + `<input>` + our keyboard contract, which is
      this package's definition (plans 053, 054). They stay outside MISSION's
      Tier 1 list but are in the inventory, so they are built to the same bar.

`[x]` **root**: `nub.lock` is generated by `nub install`; `master` now tracks it,
      so a clean install resolves the same versions (Phase G).
`[ ]` **root**: `.gitignore` ignores `references/`, which does not match the
      `references` **symlink** the supervisor creates in each worktree. It
      therefore shows as untracked, and a `git add -A` at the root would commit a
      symlink to an absolute path outside the repo. Ignore `references` without
      the trailing slash.

`[!]` **swarm runner**: one writer per worktree. Add
      `opencode run --session swarm-<ws>` to the generated runner, count live
      sessions in `agent_alive`, and land `scripts/check-single-writer.sh` as the
      regression guard. Full evidence and the fix:
      `.agents/slop/plans/022-swarm-single-writer.md`.
`[x]` **root**: `PLAN.md`'s "GPUix cannot run" decision (now D10 after merging
      `master`'s infrastructure decisions) is marked superseded: plan 140 built
      the binding and plan 041 used it.
`[x]` **tokens workstream**: `packages/tokens` exports light and dark themes that
      are the primitives' `PrimitiveTheme` (plan 021 proves it in the offline and
      runtime suites)
`[x]` **playground workstream**: the runtime blocker is resolved — plan `140`
      built the `darwin-x64` 0.10.0 binding from source (`gpui_macos/runtime_shaders`)
      and the native suite runs on this host; ADR 0003 records the provenance.
      The wasm path stays a docs-site question (D21), not native evidence
`[x]` **playground workstream**: Tier 1 runtime coverage — render, hit-test, Tab
      order, Enter/Space activation, checkbox/switch toggle, radio arrows, scroll
      offset and the a11y dump are measured by `packages/primitives/runtime/`
      (plan `041`, 119 tests) and by the playground's five `primitives-*`
      scenarios (plans `168`–`169`). `packages/testing` stays platform-free; the
      native adapter is `Native.createHost` in `packages/testing/src/native.ts`
      (plan `178`)
`[ ]` **docs-site workstream**: Tier 1 component pages + the `docs/preview-strategy.md`
      decision (code examples plus a companion native playground, never a silent
      HTML/CSS reimplementation)
`[ ]` **licensing**: record the GPUix (Apache-2.0) and Lucide (ISC) provenance and
      any icon/blend decision in `LICENSES/`

## Phase C — Tier 1–2 components

`[~]` `[███░░░░░░░]` 2/3

`[~]` Tier 1 foundational components (code + test + example + docs + inventory):
      all 19 components have code, tests, a runtime-verified interaction, an
      in-package docs page, a mounted example and an inventory row; **docs-site
      pages are still pending** (docs-site workstream)
`[x]` Verify every component in both themes (`runtime/theme.runtime.test.tsx`: both palettes, a live switch, and no colour outside the active palette)
`[x]` Tier 2 composition/feedback components (same bar)
  - [x] Write and index the Tier 2 plan set (plans 110–119)
  - [x] `packages/components` package, token/primitives adapters, native test harness
    - [x] Package scaffold (package.json, tsconfig, vitest config, README)
    - [x] `internal/collection.ts` (index arithmetic), `internal/key.ts` (key predicates)
    - [x] `internal/theme.ts` adapter over the landed token API (plan 110 §6) — the tokens workstream is merged into this branch
    - [x] `runtime.test.tsx` — the renderer guard (plan 117 §5b): a lifted dynamic import decides `available` / `unsupported-host` / `missing`, and fails on a supported host. Proven to fail by adding this host to `supportedHosts`.
    - [x] `internal/test-root.tsx` (`renderComponent`) — renders under a theme; runs here now that the native binding loads
    - [x] `internal/a11y.ts` — the accessibility dump normalised for assertions (role case, `value` vs `label`)
    - [x] Behaviour suites under a second config (`src/behaviour/`, `test:behaviour`): a static GPUix import fails to *load* on an unsupported host, so `describe.skipIf` cannot gate them (plan 117 §5a/§5c). **The split stays**: the suites now run here, on hosts with a binding
  - [x] Foundation parts: Card, Badge, Avatar, Alert, EmptyState, List (plan 111)
    - [x] `internal/collection.ts` (List single-selection core, shared with Tabs/menus)
    - [x] Card: `src/card.tsx`, behaviour suite, example, docs page, inventory record — **verified natively** (5/5, `nub run --filter @gpuixui/components test:behaviour`)
    - [x] Badge: `src/badge.tsx` + `toneSurface` in the theme seam, behaviour suite (7/7), example, docs page, inventory record
    - [x] Avatar: `src/avatar.tsx` + `src/avatar/logic.ts` (unicode-safe initials), behaviour suite (7/7) + logic suite (8), example, docs page, inventory record
    - [x] Alert: `src/alert.tsx`, behaviour suite (10/10, real click + keyboard), example, docs page, inventory record — the dismiss control is `internal/button.tsx`
    - [x] Local button stand-in: `src/internal/button.tsx` (`Button`, `IconButton`), behaviour suite (9/9); plan 110 §7 amended
    - [x] EmptyState: `src/empty-state.tsx`, behaviour suite (6/6), example, docs page, inventory record
    - [x] List / ListItem: `src/list.tsx` over `internal/collection.ts`, behaviour suite (12/12: real focus, wrap over disabled rows, controlled), example, docs page, inventory record
  - [x] Overlays: Dialog, Confirmation dialog, Popover
    - [x] Plan 112 §1/§1b re-measured against 0.10.0 and corrected: there is **no** `Dialog`, `DismissableLayer`, `pushDismissLayer` or `anchored fill="window"`, so the overlays are local implementations over host elements
    - [x] Plan 112 §1b's five overlay probes answered and recorded in plan 112 §1c — the veil must be an `<anchored position={{x:0,y:0}}>`, because `position:"absolute"` resolves against the mount parent; `focusNextWithin` wraps; a focused `tabIndex={-1}` node receives keys
    - [x] `internal/dismiss-layer.ts` (topmost-layer-wins, one event consumes one layer) + `dialog.tsx` (+ 5 logic tests, 12 native behaviour tests)
    - [x] `confirm-dialog.tsx` — Cancel-first, caller-owned close, loading locks both dismissals (+ 5 native behaviour tests)
    - [x] `popover.tsx` — `FloatingLayer` anchoring, Escape restores focus, Tab/outside press do not, mouse-down re-open guard (+ 8 native behaviour tests, both themes)
    - [x] Examples, docs pages and inventory rows for Dialog, Confirmation dialog and Popover
    - [x] Plans 112/113 reference `keyboardFocusDim` and `focusVisible`, which 0.10.0's `StyleDesc` does not have — corrected in the plans before any overlay style was written
    - [x] `StyleDesc` has per-side border *widths* but a single `borderColor`; a separator that needs its own colour uses a 1px `div` or `borderColor` (as `CardFooter` does). Plan 111's footer row uses `borderColor`.
    - [x] Plan 112's `DialogContent` names the surface through `aria-label` only (0.10.0 has no `aria-labelledby`; verified in `AnchoredProps`/`HostProps`)
  - [x] Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination (plan 113)
    - [x] Logic: `accordion/logic.ts`, `breadcrumb/logic.ts`, `pagination/logic.ts`, `tabs/logic.ts`
    - [x] `tabs.tsx` + 8 native behaviour tests (automatic/manual activation, wrap, disabled, controlled)
    - [x] `collapsible.tsx` + 4 native behaviour tests (unmounts while closed, Enter/Space, controlled)
    - [x] `accordion.tsx` + 8 native behaviour tests (single/multiple, collapsible, disabled, null close)
    - [x] `breadcrumb.tsx` + 5 native behaviour tests (collapse keeps the ends, separators follow their item)
    - [x] `pagination.tsx` + 8 native behaviour tests (edges, current page no-op, both themes)
    - [x] Examples, docs pages and inventory rows for all five
  - [x] Menus: Dropdown, Context, Command (plan 114)
    - [x] Logic: `menu/logic.ts` over the shared collection
    - [x] `menu/state.ts` + `menu/item.tsx` + `menu/surface.tsx` (the shared row registry, highlight-follows-focus, menu keyboard rules)
    - [x] `dropdown-menu.tsx`, behaviour suite (9/9), example, docs page, inventory row
    - [x] `context-menu.tsx` on `onAuxClick` + `isRightClick` and an `anchored` surface at the pointer (6/6), example, docs, inventory
    - [x] `command-menu.tsx` composing Dialog + the shared row look; input keeps focus, Enter arrives as `submit` (8/8), example, docs, inventory
  - [x] Choice inputs: Search input, Combobox (plan 116)
    - [x] Logic: `combobox/logic.ts` (ranking + selection)
    - [x] `search-input.tsx` + 6 native behaviour tests (typing, clear + focus, Enter, Escape once, controlled)
    - [x] `combobox.tsx` wrapping GPUix's headless combobox with pre-ranked items; 10 native behaviour tests (ranking, value payload, single/multiple, disabled, Escape)
    - [x] Examples, docs pages and inventory rows for both
  - [x] Feedback: Toast system, inline validation (`Field`)
    - [x] `toast/model.ts` + test (the `ToastInput` boundary type and the queued `Toast`)
    - [x] `toast/store.ts` + test (queue, monotonic ids, `FiberMap` timers, `TestClock`)
    - [x] `validation/logic.ts` + test (`validate` / `validateAll` over schema issues)
    - [x] `toast/provider.tsx` + `viewport.tsx` + `toast.tsx` (ManagedRuntime boundary, `useToast`, viewport) + 7 native behaviour tests
    - [x] `field.tsx` (Field/FieldLabel/FieldDescription/FieldError/FieldInput) + 5 native behaviour tests
    - [x] Examples, docs pages and inventory rows for Toast and Field
  - [x] Date / time picker (plan 119) — the day picker is done; a time picker is documented as out of scope
  - [x] Tier 2 verification matrix and inventory sync check (plan 117)
    - [x] `src/inventory.ts` + `src/inventory.test.ts`: files exist, rows agree, no duplicates, `done` implies a behaviour test
    - [x] `src/behaviour/theme-matrix.test.tsx`: the both-theme matrix for the 11 components without one
    - [x] Six records corrected from `gpuixSupport: "yes"` to `partial` where the runtime lacks the ARIA surface or a keyboard path
  - Tier 2 hardening after the inventory closed (plans 120+)
    - [x] List multiple selection (`selectionMode="multiple"`, modifiers, range) and the duplicate `COMPONENTS.md` row — plan 120
    - [x] Accordion arrow/Home/End movement between headers — plan 121
    - [x] Context menu Shift+F10 opening and focus return — plan 122
    - [x] Toast pause-on-hover with remaining-time resume — plan 123
    - [x] Toast hold on keyboard focus, composed with hover — plan 124
    - [x] List select-all (`Cmd`/`Ctrl`+A) over enabled rows — plan 125
    - [x] Dropdown menu keyboard opening lands on the first/last row — plan 126
    - [x] Date picker `min`/`max` bounds and a clear action — plan 127
    - [x] Trigger parts merge the caller's ref with their internal one (found by plan 127)
    - [x] Every part that owns a ref composes the caller's too — plan 128
    - [x] Menu type-ahead (`DropdownMenu`/`ContextMenu`) — plan 129
    - [x] List type-ahead over the shared type-ahead core — plan 130
    - [x] Dropdown menu submenus — plan 131
    - [x] Time picker, the time half of the date/time item — plan 132
    - [x] Command menu fuzzy matching and in-group ranking — plan 133
    - [x] List row activation on Enter and click — plan 134
    - [x] Submenu pointer activation and ContextMenu submenus — plan 135
    - [x] SearchInput ref and TabsTrigger onBlur forwarding — plan 136
    - [x] ListItem caller `onClick` forwarding — plan 137
    - [x] Combobox pointer selection coverage — plan 138
    - [x] Inventory test counts and the drifted rows — plan 139
    - [x] Tabs vertical orientation verified: axis keys, layout and manual activation — plan 321
    - [x] Toast actions: one labelled action with a provider-owned handler — plan 322
    - [x] Floating placement truth: compensate `align="center"` from the measured
      panel and flip a snapped surface off its trigger — plan 323 (evidence:
      plan 156 §8; `PopoverContent`/`DropdownMenuContent` promised a runtime
      flip that 0.10.0 does not provide)
    - [x] Cross-team: handle the playground's measured floating defects
      (`align="center"` off by half the panel; `fit="snap"` clamping over the
      trigger) in `PopoverContent`, `DropdownMenuContent` and
      `ComboboxContent` — plan 323; 6 new native tests, both-direction proof
  - Reference adoption
    - [x] 200 — adopt `base-gpui`'s compound-part contract as the Tier 1–2 API spec: `docs/component-api.md`, ADR 0004, `LICENSES/base-gpui.md`, `PLAN.md` D25 and a contract check in `inventory.test.ts` (plan 200; proven to fail by changing one translation row)
    - [x] 201 (components half) — `core/runtime.ts` (`createRuntime`: initial/reduce/query/run), its pure test, the `docs/component-api.md` §7 state-model section, ADR 0005 and PLAN.md D26 (plan 201; both-direction proof: deleting the select branch fails the fold test)
    - [x] 201 (shared helper) — `packages/testing/src/state.ts` + its test (`runCommands` over a runtime), so suites outside `packages/components` replay commands (owner: playground; plan `332`; 5 tests, both-direction proof recorded)
    - [x] Split Alert into parts — `Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss` over a tone context; 11 native tests; docs, example and API table updated (plan 158)
    - [x] Split the remaining landed deviations named in `docs/component-api.md` §9 into parts — each with its own behaviour test, docs update and inventory row (owner: components). Plans 300–303 are landed.
      - [x] Pagination parts — plan 300
      - [x] CommandMenu parts — plan 301
      - [x] Combobox parts — plan 302
      - [x] DatePicker + TimePicker parts — plan 303
    - [x] Typed-by-position children — plan 304: `PartChildren` (elements/conditionals, never text) plus a family-scoped render check on 32 parents; part identity cannot be a compile error in React 19's JSX types, recorded in `docs/component-api.md` §1 (owner: components)
    - [x] Expose `style` as `StateStyle<PartState>` on the interactive parts — plan 305: 11 parts with exported state types; button-shaped triggers stay on the local stand-in until `@gpuixui/primitives` owns it (owner: components)
    - [ ] `packages/primitives` adopts the same contract for Tier 1 (a parts table row is the spec; the package is owned by primitives) (owner: primitives)
  - Tier 2 gap rows (plan 205; each row gets its own plan before implementation)
    - [x] Write and index plans 309–320 for the twelve remaining gap rows
    - [x] Fieldset — plan 306: groups fields, propagates `disabled` to `FieldInput` (7 native tests; both-direction proof)
    - [x] Stepper — plan 307: read-only multi-step indicator, statuses derived from `value` (8 native tests; both-direction proof)
    - [x] Form — plan 308: owned-value schema validation, one alert summary, decoded `onSubmit`, pending guard (7 native tests; both-direction proof)
    - [x] Drawer — plan 309: 10 native tests; the modal rules extracted from Dialog, whose 18 tests re-pass
    - [x] Keyboard shortcuts / keycap display — plan 310 (owns the accelerator model): 10 accelerator tests + 6 native tests; both-direction proof
    - [x] Timeline — plan 311: 6 native tests; both-direction proof
    - [x] Countdown — plan 312: 9 formatting tests + 5 native tests
    - [x] Inline edit — plan 313: 8 native tests; both-direction proof
    - [x] Tag / token input — plan 314: 10 rule + 8 native tests; both-direction proof
    - [x] Carousel — plan 315: 8 native tests; both-direction proof
    - [x] Hotkey-recorder input — plan 316 (consumes plan 310): 8 capture + 8 native tests; both-direction proof
    - [x] Preview Card — plan 317: 8 native tests; delay, pointer travel and Escape proven
    - [x] Color picker — plan 318 (discrete swatches: 0.10.0 has no gradients): 8 hex + 8 native tests; both-direction proof
    - [x] Mention input — plan 319: 12 rule + 9 native tests; both-direction proof
    - [x] Navigation Menu — plan 320: 6 parts, 10 native tests; both-direction proof
    - [x] Message scroller — plan 206: pinned follow over a 1px tail sentinel, no yank when scrolled up, unread count, jump-to-latest, streamed growth; 11 rule + 10 native tests + 1 theme-matrix case; both-direction proof (behaviour 437, unit 296). Non-virtualized viewport recorded as the limitation (`<virtual-list>` takes an item count, not compound children)
    - [x] Tier 2 gap cluster complete: all twelve landed with code, a native test, an example, a docs page and an inventory row; after plan 206 the suite is behaviour 437, unit 296
`[x]` Verify every component in both themes

## Blockers (project-level, with evidence)

`[x]` **The GPUix native runtime now loads on this machine, so the Tier 2 behaviour
suites run here.** Resolved 2026-10-17 08:57 by plan `140` (playground workstream):
`@gpuix/native@0.10.0` publishes no `darwin-x64` binary, so the pinned source was
built locally with `gpui_macos/runtime_shaders` (which removes the build-time
`xcrun metal` dependency) and the resulting `gpuix-native.darwin-x64.node` is in
the store, hard-linked across worktrees. Verified from `packages/components`:
`nub run --filter @gpuixui/components test:behaviour` runs the real
`TestRenderer` and Card's suite passes 5/5.

Evidence, 2026-10-17 (the failure this replaced): `uname -m` → `x86_64`;
`@gpuix/native@0.10.0` published only `-darwin-arm64`, `-linux-x64-gnu`,
`-win32-x64-msvc`; loading it failed with `mach-o file, but is an incompatible
architecture (have 'arm64', need 'x86_64')`.

Still true and worth remembering:

- The `wasm` build exports only `GpuixRenderer`, not `TestGpuixRenderer`.
- The binding is a **locally built artifact**, not a published one: a clean
  `nub install` on a bare host still has none, so the behaviour suites stay out
  of the default `test` run (plan 117 §5a–§5c) and a host without a binding
  reports `unsupported-host` from `src/runtime.test.tsx`.
- On an Apple-silicon Mac, Linux x64 or Windows x64 the published binding works
  with no local build.

`[x]` **nub's isolated linker does not install optional platform binaries of
transitive dependencies.** `@gpuix/native-darwin-arm64` (an optional dependency
of `@gpuix/native`) was absent from the store entry; `nub install --node-linker
hoisted` links it. Superseded on this host: the store now carries a locally built
`darwin-x64` binding (first entry above), hard-linked across worktrees.

`[x]` **Two sessions wrote this worktree at once — B3, resolved 2026-10-17
08:56.** Root cause and permanent fix: plan `022-swarm-single-writer.md`
(primitives worktree). Measurement for this worktree: plan
`118-single-writer-components.md`, which also records the resolution: the stale
turn `ses_eb7f09666ffeRRbJxPz0d344Cw` (07:12) committed and pushed everything it
produced and stood down, because the rotating `run-components.sh` turn is the one
the supervisor can see and replace. Re-verified at 08:56 and again at 09:00: the
`session_v2` count is `1`, and the tree is clean apart from the untracked
`nub.lock` and `references` symlink. The permanent fix — pinning `--session` and
teaching `agent_alive` to count live server-side sessions (plan 022 §5) — is
still the coordinator's, in `scripts/`.

`[!]` **`@gpuix/react@0.10.0` (the latest published release) is far behind the
reference clone in `~/GPUIXUI/references/gpuix`.** Verified against the installed
package, 2026-10-17:

| Surface | Reference clone | installed 0.10.0 |
| ------- | --------------- | ---------------- |
| `KeyEvent` type, `preventDefault`, `defaultPrevented` | yes | **no** — handlers receive `EventPayload` |
| `Button`, `buttonProps` | yes | **no** |
| `Dialog` + parts, `DialogPortal/Backdrop/Popup` | yes | **no** |
| `DismissableLayer`, `pushDismissLayer`, layer stack, focus restore | yes | **no** |
| `FloatingLayer`, `renderSlot`, `useControllableState`, `mergeStyles` | yes | yes, via `@gpuix/react/floating` |
| `Select` + parts, `Combobox` + parts, `Tooltip` + parts | yes | yes |
| `motion`, `AnimatePresence` | yes | yes |
| WASM build exports `TestGpuixRenderer` | no | no |

Consequences for Tier 2: Escape dismissal, layer stacking, focus-in/out and
Tab trapping must be implemented in this package on top of `renderer.focusElement`
/ `focusNextWithin` / `focusPreviousWithin` and element-level `onKeyDown`, instead
of relying on the clone's `DismissableLayer`. `Button`/`buttonProps` and
`Dialog` parts must be equivalent local implementations over `<div>` + host props
until `packages/primitives` and a newer `@gpuix/react` land. Plans 110 §1/§7 and
112/114 have been corrected for this.

Related: the reference clone must not be treated as the API of the pinned
dependency anywhere in this repo, and `package.json` pins must stay explicit.

`[!]` **Two sessions write this worktree at once — B3, still live** (measured
2026-10-17 08:47). Root cause and permanent fix: plan
`022-swarm-single-writer.md` (primitives worktree). Measurement for this
worktree: plan `118-single-writer-components.md`. Two live top-level sessions
hold `workspaces/components` at the same time —
`ses_eb7f09666ffeRRbJxPz0d344Cw` (07:12:12, a stale turn from an earlier tick)
and `ses_eb7a7c3edffeSehcVqeqHJEsYa` (08:31:44, the current `run-components.sh`
turn). `run-components.sh` starts a new `opencode run` session every iteration
and does not own the turn, so a turn that outlives its CLI call keeps writing
while the loop starts another on top of it; `agent_alive` only checks the runner
pid, so the supervisor cannot see the duplicate. Between 08:40 and 08:47 the tree
gained `card.tsx`, `behaviour/card.test.tsx`, `docs/card.mdx`,
`examples/card.example.tsx` and the commits `7786193`, `f424b1e`, `ab000ab` —
none authored by the supervisor's session. **Response:** this workstream stopped
writing component code the moment the duplicate was confirmed, restoring the
one-writer invariant; the one clean non-overlapping commit (`22f706c`, the
status-tone palette) is preserved. No session was deleted — that is the
coordinator's call and would discard the stale session's in-flight work (plan
022 §4/§7). Resume `packages/components` only when the plan 118 §5 check prints
`1` twice. **Re-measured 08:54:** the pair rotates — `ses_eb7a7c3e…` went idle and
`ses_eb795d97…` took its place while the stale turn stayed live — so the count
stays `2` and the condition **cannot** be met by agent discipline; it needs plan
022 §5's pinned-session fix (coordinator, `scripts/`). Component code stays
paused on a green, pushed `HEAD`; plan 118 carries the measurement.

## Interlocks (cross-workstream dependencies)

Work that this workstream needs but does not own. Another agent owns each row.

| Need | Owner | Status |
| ---- | ----- | ------ |
| `@gpuixui/tokens` roles in plan 110 §6 | tokens-theme | **resolved** — the workstream is merged into `agent/components`; `internal/theme.ts` is the seam over it |
| Serialise writers per worktree: a second live session writes `packages/components` alongside the supervisor's; root cause in plan `022` (primitives), this worktree's measurement in plan `118` | repo tooling (`scripts/`) | **resolved in this worktree** 2026-10-17 (the stale turn stood down; the tree has read one writer since); the permanent `scripts/` fix (plan 022 §5) is still pending |
| Decide the GPUix version: stay on 0.10.0 and implement dismiss layers/focus locally, or ship a release that includes `Dialog`/`Button`/`DismissableLayer` (0.10.0 is the latest published) | owner / playground | pending |
| Soft tone pair per status (`info`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` + readable foregrounds) | tokens-theme | **resolved** — landed on `main`; `internal/theme.ts` consumes `statusTone` (plan 157) |
| `alpha(color, amount)` helper | tokens-theme | **resolved** — landed on `main`; the local `withAlpha` is deleted (plan 157) |
| An `info` status role so Alert/Badge/Toast stop borrowing `accent` | tokens-theme | **resolved** — `infoSoft`/`infoSoftForeground` are the tone's roles (plan 157) |
| `@gpuixui/tokens`' React file compiles with this package's `jsxImportSource`; tokens cannot resolve `@gpuix/react` under the isolated linker | tokens-theme | pending — worked around in `packages/components/tsconfig.json` `paths`; durable fix is a tokens devDependency or pragma |
| `packages/testing/src/state.ts` + test: `runCommands(runtime, commands)` for suites outside this package (plan 201) | playground | **resolved** — `State.runCommands` in `packages/testing` (plan 332); `runtime.run` in `packages/components` remains the in-package shortcut |
| An avatar diameter scale (20/26/32/40) so `DIAMETER` in `avatar.tsx` can be deleted | tokens-theme | pending |
| `@gpuixui/primitives` exports in plan 110 §7 | primitives | pending — **blocking nothing meanwhile**: `internal/button.tsx` is the local `Button`/`IconButton` stand-in (plan 110 §7 amendment), to be deleted when the package lands |
| A `primaryHover` / `destructiveHover` role pair so filled buttons stop using a half-alpha fill for hover | tokens-theme | pending |
| Playground mounts the Tier 2 catalogue and runs it headless and live | playground | **resolved** — plans `330`, `331`, `344`–`347`: nine `tier2-*` headless scenarios and nine live twins, `78/78` + `29/29` |
| Docs site renders `packages/components/docs/*.mdx` and the example registry | docs-site | pending |
| `scripts/verify-two-directions.sh` uses `jj`, which is not installed (D1) | tooling | pending |
| Decide whether `nub.lock` is committed: it is currently untracked and regenerated per worktree, so every workstream's copy would conflict | tooling | **resolved** — master tracks `nub.lock`; the merge took master's committed copy |
| `LICENSES/`: record GPUI Kit = Apache-2.0 (+ CC BY 4.0 for its docs prose, Lucide ISC for icons, no NOTICE file); shadcn/ui is referenced as design inspiration only, not copied source. The Message Scroller behaviour port (MIT) needs its own `provenance.md` row (plan 206 credits it on the docs page) | licensing | pending |

## Phase D — data and workspace components

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Tier 3 data presentation
`[ ]` Tier 4 desktop workspace (panels, docking, tabs, command palette)
`[ ]` Verify critical interactions in the real runtime

## Phase E — specialised components

`[ ]` `[░░░░░░░░░░]` 0/2

`[ ]` Tier 5 specialised components where justified
`[ ]` Document every capability GPUix does not provide, with evidence

## Phase F — integration and polish

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Consistency, keyboard, themes, composability pass
`[ ]` Performance and packaging
`[ ]` Docs truth pass against the implementation

## Phase G — release readiness

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Clean-environment install and public-export checks
`[ ]` Licence inventory and attribution complete
`[ ]` All gates green (`nub run check`, `nub run lint`, `nub run test`)

## Swarm-owned blockers (fix these)

- **B1** ~~GPUix native bindings fail to install~~ **resolved** — the `darwin-x64` 0.10.0 binding builds from source (`gpui_macos/runtime_shaders`) and both native suites are green on this host (headless 101/101, live 61/61; plan `140`, ADR 0003).
`[ ]` **Cross-team:** `@gpuixui/components` **InlineEdit** commits only on
      React `onBlur` or Enter. A real window can move native focus away without
      delivering `onBlur` (plans `555`, `605`: the full-suite state read `commits=1`
      with the editor still open), so a consumer cannot rely on the blur commit.
      Add a component-owned outside-press or focus-loss path (the measured
      event-claim + bounds route), or document that a blur commit needs an explicit
      Enter or click. `live-tier2-editing` asserts both measured states. Owner:
      `components`; evidence: plan `605` §8.

- **B2** No durable scheduler — the swarm runs on a detached daemon; launchd and cron do not fire here.

Both are specified in ; each fix starts with a plan under .

- **Docs: platform toggle (macOS / Linux / Windows / Default)** — every component preview switches platform style; the styles are real editable token themes in packages/tokens, not docs-only CSS (see MISSION.md).

- [ ] Tabs: a measured shared indicator on the **native** component (the docs demo now slides; the native side still styles the selected trigger per-trigger).

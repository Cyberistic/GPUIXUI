# 375 — Tier 4 feasibility: a multi-pane editing layout

**Status:** planned 2026-10-18 · **Phase:** D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `152`, `163`, `166`, `175`, `177`,
`198`, `338`, `339`, `343`, `350`.

> Numbering: `351`–`374` were claimed by the components and tokens workstreams
> after `350` landed; this playground plan takes `375`, and the next playground
> plan takes `376`.

## 1. Why this plan exists

One Tier 4 row is still `GPUix support: ?` with no runtime evidence:

| Row | Current note |
| --- | ------------ |
| Multi-pane editing layouts | Composition over split panes + editors. |

Every ingredient has been measured **alone**: a pointer-captured split with
keyboard resize (`panel-nested` `175`), two independently scrolling panes
(`workspace-panes` `177`, `app-chrome` `350`), a virtual list that keeps its
anchor while the split moves (`338`, `339`), read-only `<code>` that paints and
copies without its line-number chrome (`text-selection` `163`), and a native
editor's caret/selection (`text-entry` `188`, `pointer-entry` `343`).

No probe has composed them into the shape an editor actually uses: **two panes,
each with tabs, each holding a scrolling read-only code surface, separated by a
live split**. The open questions are the composition's own:

1. Does a `<code>` surface inside an `overflowY: "scroll"` viewport pan with the
   wheel, and does the painted code move with the viewport rather than re-lay
   out?
2. Do the two panes keep independent scroll offsets, and does a pane take native
   focus and become the active pane when clicked?
3. Does a tab strip swap the document in place while the other pane's document
   and scroll survive, and does the pane keep its offset across the swap?
4. Does a split resize re-width both code surfaces (so the editor follows the
   pane) and leave both offsets alone?
5. Can a selection stay inside one pane, and can a cross-pane drag select both
   documents while `userSelect: "none"` keeps the tab chrome out?
6. Are the panes addressable as named text surfaces and the divider as a
   `Splitter` in AccessKit?

This plan changes **no package code**.

## 2. What will be proven

Capability: `editor` (new). Scenario: `multi-pane-editor`; live twin:
`live-editor`.

View: an 860 × 460 frame. A 400 px horizontal split (pane A 420, divider 6,
pane B 434) sits above a state readout and a small control row. Each pane has a
28 px tab strip and a 372 px `overflowY: "scroll"` viewport holding one `<code
showLineNumbers>` surface. Pane A opens `alpha` (80 lines) and can switch to
`util` (30); pane B opens `beta` (60) and can switch to `notes` (20). The
readout prints `active=a split=420 aY=0 bY=0 aTab=main bTab=main`.

| Area | Check |
| ---- | ----- |
| layout | pane A is 420 wide and pane B starts after the 6 px divider; each viewport is 372 tall under its 28 px strip |
| documents | both code surfaces paint their first line; the tab strip paints `main` and `util` / `main` and `notes` |
| selection | a drag inside pane A copies only `alpha…` lines; a drag from A to B copies both documents and no tab label |
| focus | a click on pane B's viewport makes `active=b` and puts native focus on `editor-b-viewport` |
| scroll | a `-200` wheel on pane A moves only A's offset (`aY=-200`), leaves B at 0, and moves the painted code box by exactly `-200`; the code's height does not change |
| tabs | clicking `editor-a-tab-util` paints `helper…` instead of `alpha…`, leaves `beta…` painted, keeps A's offset and B's offset, makes `active=a`, and switching back restores `alpha…` |
| resize | a `+80` drag on the divider sets `split=500`, pane A paints 500 wide, the code surface follows its pane within 1 px, and both offsets are unchanged |
| keyboard resize | the divider is a focusable `Splitter` whose `aria-valuetext` carries the size and whose `End` clamps at 560 |
| a11y | `editor-surface-a` is a `TextInput` named `Editor A`, `editor-surface-b` named `Editor B`, the divider a `Splitter` |
| live | a real wheel scrolls A only, a real click activates/focuses B, a real divider drag resizes both code surfaces, and a real drag selects within A |

The probe does **not** re-measure the split's pointer capture (`panel`), the
virtual-list anchor (`339`), tab-strip overflow (`173`) or the editor caret
(`188`); it composes them. It does not claim an editable code surface:
`<code>` is read-only and 0.10.0 has no editable syntax surface (`296`, `333`).
Scroll persistence across a full workspace restore stays plan `167`/`339`.

## 3. Files

Create:

- `apps/playground/src/scenarios/multi-pane-editor.tsx` — the view and the
  `multi-pane-editor` scenario. No pure module: the state is one active pane,
  two document keys and two offsets.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register the scenario and
  add `"editor"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"editor"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, add `live-editor`
  after `live-app-chrome`, and append it to `liveScenarios`.
- `apps/playground/README.md` — a `## Multi-pane editor (plan 375)` section and
  the new file under `Structure`.
- `COMPONENTS.md` — the `editor` capability row and the measured evidence on
  **Multi-pane editing layouts** (status stays `todo`: the probe is the runtime
  contract, not a shipped package), plus one sentence on **Code editor
  integration** for the read-only composition.
- `TODO.md` — tick the new playground task with the measured counts.
- `PLAN.md` — a decision row.
- `.agents/slop/plans/README.md` — add the `375` row; the next playground plan
  takes `376`.

Do **not** change any package, `apps/docs`, the shell, `SplitPane` or the
smoke runner.

## 4. The view (`multi-pane-editor.tsx`)

Constants: `FRAME_WIDTH = 860`, `SPLIT_HEIGHT = 400`, `PANE_INITIAL = 420`,
`PANE_MIN = 260`, `PANE_MAX = 560`, `TAB_STRIP = 28`, `VIEWPORT_HEIGHT = 372`,
`DIVIDER = 6`, `WHEEL = -200`, `DRAG = 80`, `READ_MIN = 260`, `READ_MAX = 560`.
Codes: `ALPHA` 80 lines, `HELPER` 30, `BETA` 60, `NOTES` 20, built by
`lines(prefix, count)` → lines joined with `\n`, each line
`` `const ${prefix}${index} = ${index};` `` (unique, so a missing line names
itself in a failure).

Document keys: `"main" | "util"` for A (`main` = ALPHA, `util` = HELPER) and
`"main" | "notes"` for B (`main` = BETA, `notes` = NOTES).

`EditorPane` (same file, props `id: "a" | "b"`, `document`, `label`,
`onActivate`, `onScrollY`):

1. root `testId={`editor-${id}-pane`}` — column, `width: "100%"`,
   `height: "100%"`, card background.
2. **tab strip** `testId={`editor-${id}-strip`}` — 28 px, row, 4 px gap,
   `userSelect: "none"`, bottom border. Two `Pressable` tabs
   (`editor-a-tab-main`, `editor-a-tab-util`; `editor-b-tab-main`,
   `editor-b-tab-notes`), 22 px high, `padding: 0 8`, muted when active,
   `onClick` → `setDocument(key)` + `onActivate()`.
3. **viewport** `testId={`editor-${id}-viewport`}`, `aria-id={`editor-surface-${id}`}`,
   `aria-label={`Editor ${id.toUpperCase()}`}`, `role="textbox"`,
   `tabIndex={0}`, 372 px, `overflowY: "scroll"`, `overflowX: "hidden"`,
   `backgroundColor: background`, `onClick={onActivate}`, and
   `onScroll` → `renderer.getScrollOffset(ref.current.id)` → `onScrollY(y)`.
4. inside the viewport one `<code testId={`editor-${id}-code`}
   code={DOCUMENTS[...]} language="ts" showLineNumbers
   style={{ width: "100%" }} />`.

The frame (top level) holds state `active: "a" | "b"` (initial `"a"`),
`split` (initial 420), `aDoc` (initial `"main"`), `bDoc` (initial `"main"`),
`aY`, `bY`. Structure:

- `editor-frame` (860, column, 8 px gap):
  1. `editor-split-surface` (860 × 400) wrapping `<SplitPane id="editor"
     initial={420} min={260} max={560} label="Resize editors"
     onResize={setSplit} primary={<EditorPane id="a" …/>}
     secondary={<EditorPane id="b" …/>} />`.
  2. `editor-state` readout
     `` `active=${active} split=${split} aY=${aY} bY=${bY} aTab=${aDoc} bTab=${bDoc}` ``.
  3. a control row: `editor-focus-a` (click → activate A and focus
     `editor-a-viewport` via the ref), `editor-focus-b`, and
     `editor-scroll-home-a` (click → `renderer.scrollTo(viewportA, 0, 0)` and
     `setAY(0)`), so a check can restore A without a wheel.

`onScroll` is the only writer of `aY`/`bY`; the controls mirror a programmatic
`scrollTo` into the same state, exactly as `app-chrome`'s pan controls do.

## 5. Steps for the executor

1. Read this plan, then `app-chrome.tsx`, `panel.tsx`,
   `workspace-panes.tsx` (the pane shape), `text-selection.tsx` (the code
   selection), `ui.tsx` (`Pressable`/`Readout`) and `live/scenarios.tsx`
   (`live-app-chrome`, `live-panel`, `live-selection`).
2. Write `multi-pane-editor.tsx`; register it and add the capability literal.
   Run:

   ```sh
   nub run --filter playground check-types
   nub run --filter playground test
   ```

   Expected: both exit `0`; `scenarioProblems` reports nothing (the new
   capability forces a scenario).
3. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only multi-pane-editor
   ```

   Expected: `1/1 scenarios passed`, exit `0`, `editor=verified`. Every
   failure prints the readout, the offset or the bounds — fix geometry, never
   widen a tolerance past 2 px.
4. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `82/82 scenarios passed`, exit `0`; record the check total.
5. Add `live-editor` (`view: multiPaneEditorScenario.view`,
   `ready: "editor-state"`) with `settle` after every input and `waitForText`
   after state changes. Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected: `33/33 scenarios passed`, exit `0`, one screenshot; record the
   check total. A live step may not assert style or the a11y dump (plan `197`).
6. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0` (run `nub run fmt:fix` if the formatter complains).
7. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`, `PLAN.md`
   and the plan index with the measured counts and any surprise. Commit the
   plan first, then the probe.

## 6. Test plan

### 6.1 The scenario

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | the viewport is `overflowY: "hidden"` | "the wheel scrolls pane A" (offset stays 0) |
| M2 | pane A's `onScroll` reports pane B's ref | "the wheel leaves pane B alone" / `bY=-200` |
| M3 | a tab click does not change the document key | "the util tab swaps pane A's document" (`alpha` still painted) |
| M4 | a tab click does not call `onActivate` | "a tab click makes its pane active" |
| M5 | `<code>` has `width: 420` instead of `"100%"` | "the code follows its pane after the resize" |
| M6 | the tab strip drops `userSelect: "none"` | "the cross-pane selection excludes tab chrome" |
| M7 | `onResize` is not wired to the readout | "the divider drag sets the split to 500" |

Reverse proof (consumer wiring): remove the viewport's `onClick` → "a click on
pane B makes it active" fails.

Run each mutation with `--only multi-pane-editor`, record the exact failure,
revert.

### 6.2 Two-direction checks by hand

- Full headless `82/82`, live `33/33`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 7. STOP conditions

- **A wheel over the code does not scroll its viewport.** Record whether the
  `<code>` swallows the wheel; if it does, wrap the code in a one-child column
  that owns the scroller and amend §4, or record the limitation.
- **The code's painted box does not move with the viewport** (it re-lays out at
  the top instead of panning). That is the core mechanism finding: record the
  measured geometry, amend the check to the measured contract and write it up
  for any editor component.
- **A click on the viewport does not reach the activation handler** because the
  code child does not bubble. Move the handler to the smallest wrapper that
  contains the code, record it, and amend §4.
- **A selection cannot cross the split** or includes the tab chrome even with
  `userSelect: "none"`. Record the measured selection; if it cannot be made
  honest, narrow the claim and say what an editor must do instead.
- **The split resize detaches the code width from its pane by more than 1 px**
  or needs a manual re-render. Record the measured widths and amend §4.
- **A check needs a tolerance above 2 px** or a screenshot. Stop; that is a
  mechanism question.
- **A live step cannot select or wheel a clipped surface.** Restore the scroll
  first (the `editor-scroll-home-a` control exists for this); if it still
  cannot, narrow the live twin and say why.
- **A file outside §3 must change.** Stop and write the task in `TODO.md`.
- The suites are not `82/82` headless and `33/33` live, exit `0`. Stop and
  report the failing scenario.

## 8. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003).

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `multi-pane-editor` (headless) | 55 | pass — suite `81 → 82`, `2445 → 2500`, exit `0`, `editor=verified` |
| `live-editor` | 19 | pass — live `32 → 33`, `567 → 586`, exit `0`, one screenshot |

### 8.1 Facts that changed the plan

- **A tab swap clamps a shorter document's offset and fires no `onScroll`.** The
  first build asserted that pane A kept `-200` across the swap to the 30-line
  `helper` document. The runtime reported `-168` (the shorter document's own
  maximum) while the `onScroll`-driven readout still said `-200`. A component
  cannot assume the old offset survives a document swap, and cannot learn the
  new one from the event either. The probe now **resets the pane to the top**
  on a tab click (`renderer.scrollTo(viewport, 0, 0)`) and mirrors that into the
  readout; a per-tab offset needs a post-layout pass. §7's stop condition was
  the right one: the surprise is the finding.
- **`overflowY: "hidden"` still pans with the wheel.** Mutating `scroll` to
  `hidden` left the suite green (`-200` unchanged). Removing the `overflowY`
  declaration entirely is what stops the pan (`0`). The axis declaration creates
  the scroller; `hidden` hides its affordance, not its input. This is a sharper
  version of plan `173`'s horizontal-scroll result and belongs in the editor
  contract.
- **A click on the code bubbles to the viewport.** The viewport's `onClick` and
  `tabIndex` receive the activation and native focus even though the pointer
  lands on the `<code>` child, so the pane surface needs no separate hit target.
- **The code box pans rather than re-laying out.** After `-200`, the code's
  `y` moved by exactly `-200` and its height was unchanged.
- **`<code>` line height is 18 px**, which is why the 30-line document's maximum
  scroll is `540 − 372 = 168`.

### 8.2 The measured contract

| Fact | Value |
| ---- | ----- |
| layout | pane A `420`; the divider `6`; pane B starts at `paneA.x + 426`; each viewport is `372` tall under a `28` strip |
| independent scroll | a `-200` wheel on pane A reports `-200`; pane B stays `0`; the readout agrees |
| panning | the code box moves by exactly `-200`; its height is unchanged |
| focus | a click on pane B makes `active=b` and puts native focus on `editor-b-viewport` |
| tabs | `util` paints `helper0` and not `alpha0`; pane B keeps `beta0`; the swap resets the pane to `0`; the tab holds native focus |
| resize | the `+80` drag sets `500`; pane A paints `500` and its code `500`; pane B's code is `354`; both offsets are unchanged |
| keyboard | `End` on the divider clamps at `560`; `aria-valuetext` reports `560px` |
| a11y | `TextInput:Editor A`, `TextInput:Editor B`, `Splitter` |
| selection | a drag inside pane A copies `alpha…` and not `beta…`; a crossing drag copies both and excludes the tab chrome |

### 8.3 Mutation proofs

Each mutation was applied, built, run with `--only multi-pane-editor`, and
reverted:

| # | Mutation | Measured failure |
| - | -------- | ---------------- |
| M1 | the viewport drops `overflowY` | `the wheel scrolls pane A: expected -200 ± 2, got 0` |
| M2 | pane A reports its offset into pane B's state | `the readout reports the A offset: expected "-200", got "0"` |
| M3 | `selectTab` does not set the document | `the util tab swaps pane A's document` |
| M4 | `selectTab` does not activate | `the swap makes its pane active` |
| M5 | `<code>` is fixed at `420` | `the code follows its pane` |
| M6 | the tab strip drops `userSelect: "none"` | `the tab chrome stays out of the drag` |
| M7 | `SplitPane` gets no `onResize` | `the divider drag sets the split to 500` |

Reverse proof (consumer wiring): the viewport's `onClick` removed →
`a click on pane B makes it active` fails.

### 8.4 Limits recorded

- The surface is **read-only** `<code>`: 0.10.0 has no editable syntax element
  (plans `296`, `333`). A real editor must pair this layout with an
  `<input>`/`<textarea>` text model, and the probe does not claim one.
- The probe keeps **one offset per pane**, not per tab. The measured clamp plus
  the missing `onScroll` mean a per-tab model needs an explicit post-layout
  restore; that is a component task, not a runtime feature.
- Scroll persistence across a full workspace restore is measured by plans `167`
  and `339`; this probe does not repeat it.
- The split is fixed-size in the probe; a real app derives the height from its
  window (`workspace-panes`' `height: "100%"` chain rules).
- `overflowY: "hidden"` still receives a wheel; a component that needs to
  disable panning must not declare the axis at all (or guard the input).


## 9. Acceptance

- `multi-pane-editor.tsx`, the registry entry, the capability literal, the live
  twin, the README section, the inventory row and the plan-index row.
- Headless `82/82`, live `33/33`, exit `0`; all three gates exit `0`.
- Seven mutation proofs and one reverse proof recorded in §8.
- No package changed; any defect is a `TODO.md` task with its own plan number.

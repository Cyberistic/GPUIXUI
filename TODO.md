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

### Playground workstream (`apps/playground`, `packages/testing`)

`[x]` `[█████████░]` 61/65 plans-and-harness

`[x]` Plans `100`–`199`, `300`–`302` and `330` written and indexed for the playground workstream; the next plan takes `331` (the components and tokens workstreams hold `300`–`329`)
`[x]` **Blocker B1 fixed**: the `darwin-x64` GPUix 0.10.0 binding builds from source with `gpui_macos/runtime_shaders` (the `xcrun metal` step is optional) and loads — plan `140`, ADR 0003
`[x]` **The native smoke suite is green on this host** (44/44 when the blocker closed; **64/64** today) — `nub run --filter playground build && nub apps/playground/dist/smoke/run.js` exits `0`, writes `smoke-report.json` and one screenshot per scenario. Two-direction proof recorded (plan `140` §4, plan `150` §4, plans `151`–`187` §7/§8/§9/§10: exit `1` when a check is broken). Every capability in `COMPONENTS.md` is now `verified 0.10.0`
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
`[ ]` Cross-team: `@gpuixui/components` **Collapsible/Accordion** keep their content mounted under an `overflow: "hidden"` motion body and animate the measured height instead of unmounting. Plan `186` §10 measured every ingredient (natural height at first layout while clipped, exact height tween, the clip refusing input, draft survival, `onMotionComplete`); the remaining gap is the motion wrapper's missing `testId`/`role`/`aria-*` (owner: `components`; evidence: plans `157`, `186`)
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
`[ ]` **Cross-team (defect):** `@gpuixui/components` `internal/dismiss-layer.ts` keys event consumption on `WeakSet<EventPayload>` identity; 0.10.0 delivers **a separate payload object per handler** (measured), so one Escape closes every open overlay. Replace it with the field claim `internal/event-claim.ts` already implements (one shared claim module), and keep `menu/sub.tsx`'s `insideSurface` containment — it is measured working (owner: `components`; evidence: plan `187` §9)
`[x]` Probe the command surface per plan `176`: `command-palette` — a window shortcut opens a non-modal overlay, the field keeps focus while arrows move a visual row, letters/arrows/Escape reach both the field and the app-level handler while Enter and Backspace do not, `cmd-k` does not type, `onSubmit` commits and returns focus, the scrim is a hit-testable sibling under the surface; adds the `command` capability — 58 checks, suite `44 → 45`, three two-direction proofs recorded. `Application menus` is recorded as in-window only: 0.10.0 has no menu API
`[x]` Probe the remaining Tier 1 controls natively per plan `169`: `RadioGroup` arrow selection/wrap, `Rating` clamp/clear, `NumberField` step/clamp, `OTPField` focus advance and Backspace — 38/38 green, two-direction proofs recorded
`[x]` Probe the shipped Tier 1 primitives natively per plan `168`: mount `@gpuixui/primitives` (`Button`, `Toggle`, `Input`, `Checkbox`, `Switch`, `Select`, `Slider`, `Progress`, `Meter`, `Skeleton`, `Tooltip`) through the tokens theme and add the `components` capability — 36/36 green, two-direction proofs recorded
`[ ]` **packages/docking** (owner: docking): implement the contract plan `184` measured — a recursive layout tree, 48 px edge drop zones from the surface rectangle, right/bottom-secondary and left/top-primary splits, prune/collapse of emptied groups, `key={node.id}` on every split, `Region`/`TabList`/`TabPanel` semantics, and app-owned JSON restore. The playground's `docking-layout` is the acceptance evidence.
`[ ]` Cross-team: `@gpuixui/components` must handle the measured floating defects — `PopoverContent`/`DropdownMenuContent` expose `align="center"`, which is short by half the panel on both axes, and `fit="snap"` does not flip, so a near-bottom menu must choose `side="top"` itself (owner: `components`; evidence: plan `156` §8)
`[ ]` Cross-team: `motion.div`'s published `MotionDivProps` omits `testId`, `role` and the `aria-*` props, so an animated surface cannot be addressed in a smoke test or given an accessible role through the typed API. Add a typed motion wrapper (published `HostProps` + `motion`) in `@gpuixui/components` and use it for Collapsible/sidebar/toast surfaces (owner: `components`; evidence: plan `157` §8)
`[ ]` **Promote the playground workstream to the integration branch**: `origin/master` still carries only the `apps/playground/README.md` placeholder — none of the 143 commits ahead (plans `100`–`182`, `packages/testing`, the playground, ADR 0001–0003) are on it. `agent/playground` is a **fast-forward** of `origin/master` (0 behind), so the promotion is conflict-free; the workstream's own instruction is *never push to master*, so an owner/supervisor performs the merge
`[ ]` Cross-team: `@gpuixui/components` plan `117` §5a still reports the native renderer as **unavailable** on this host, so its 21 Tier 2 behaviour suites are not collected. ADR 0003 fixed that: point the behaviour config at the locally built `darwin-x64` 0.10.0 binding (or run on CI) and record the measured verdicts (owner: `components`; evidence: plan `140` §4, ADR 0003)
`[ ]` Cross-team: **charts and the colour picker must not build on `<canvas>`** — it is retained but renders `gpui::Empty` on 0.10.0 (no bounds, children dropped). Use `<svg>` for static drawing and `<img>` + `setImagePixels` for live bitmaps (owner: `components`; evidence: plan `161` §8, `COMPONENTS.md` Charts / Color picker)
`[ ]` Cross-team: `@gpuixui/components` **ToastViewport** — `createPortal` is **not exported by `@gpuix/react` 0.10.0**, so the absolute, last-child viewport is the only path (it is measured working); and the AccessKit dump has **no live-region concept**, so a static `role="status"` label does not announce a toast's message — label each card (or expose its text as the accessible name) rather than relying on the viewport label. Owner: `components`; evidence: plan `183` §7
`[ ]` Cross-team: **drag-and-drop and detachable tabs must hit-test pointer coordinates** — hover is frozen during a captured drag, the drag still ends in a click on the source, and a drop on an element without `onFileDrop` produces a click. The component owns the drop indicator and click suppression (owner: `components`/`docking`; evidence: plan `162` §8)
`[ ]` Cross-team: export the composed examples from `@gpuixui/primitives` (`"./examples": "./examples/index.ts"` in its `exports` map) so the playground can show and smoke the ten realistic compositions its README already points at; plan `168` builds against the public root export for now (owner: `primitives`)
`[x]` Mount the real Tier 2 components in the playground and drive open/close/confirm in the native suite — plan `330`: `tier2-dialog` (24 checks: open, centred, focus entry, Tab/Shift-Tab containment, Escape + focus return, ConfirmDialog cancel-first and confirm-never-closes), `tier2-menu` (18: click open, arrows skip the disabled row, Enter activates once and restores focus, right-click placement within 12 px, outside/Escape dismissal) and `tier2-toast` (21: push paints, 16 px inset, 380 px card, action runs once, stack order, Escape is not a shortcut, a 300 ms duration dismisses itself). Suite `61 → 64`, exit `0`, `tier2=verified`; three mutation proofs recorded (plan `330` §8). The toast probe's fixed 350 ms wait is replaced by a bounded `awaitReadout`, removing the flake seen under load
`[x]` Prove the shipped Tier 2 components **in a real window** per plan `331`: `live-tier2-dialog` (24 checks: centre within 2 px of the window, Tab trap, focus return, Cancel-first, confirm leaves it open), `live-tier2-menu` (15: native focus on the surface, disabled row skipped, Enter once, context menu within 12 px of the right click, Escape) and `live-tier2-toast` (21: 16 px inset, 380 px card, action once, stack order, a real 300 ms timer). Live `16 → 19`, exit `0`, `tier2=verified`; three live mutation proofs recorded (plan `331` §8); two consecutive full live runs green
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

## Phase B — working foundation

`[~]` `[████░░░░░░]` 4/6

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[x]` Land the primitives package
`[x]` **Native smoke test**: layout, input, focus, overlay, scroll, panel and virtual-list primitives verified in real GPUix 0.10.0 on this host (11/11, plan `140` §4)
`[x]` Land one fully working component running in GPUix — all 19 Tier 1
      components mount in the real `TestRenderer` (plan 041; 119 runtime tests
      after plan 055), and the playground drives the shipped package through the
      token theme (`primitives-actions`, `primitives-fields`,
      `primitives-display`, plan `168`)
`[ ]` Land the docs shell and document that component in Fumadocs

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
    - [ ] 201 (shared helper) — `packages/testing/src/state.ts` + its test (`runCommands` over a runtime), so suites outside `packages/components` replay commands (owner: playground; this package's `runtime.run` is the same fold)
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
| `packages/testing/src/state.ts` + test: `runCommands(runtime, commands)` for suites outside this package (plan 201) | playground | pending — `runtime.run` in `packages/components` is the same fold meanwhile |
| An avatar diameter scale (20/26/32/40) so `DIAMETER` in `avatar.tsx` can be deleted | tokens-theme | pending |
| `@gpuixui/primitives` exports in plan 110 §7 | primitives | pending — **blocking nothing meanwhile**: `internal/button.tsx` is the local `Button`/`IconButton` stand-in (plan 110 §7 amendment), to be deleted when the package lands |
| A `primaryHover` / `destructiveHover` role pair so filled buttons stop using a half-alpha fill for hover | tokens-theme | pending |
| Playground mounts the Tier 2 examples and runs a dialog/menu/toast smoke | playground | pending |
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

- **B1** ~~GPUix native bindings fail to install~~ **resolved** — the `darwin-x64` 0.10.0 binding builds from source (`gpui_macos/runtime_shaders`) and the native suite is 60/60 on this host (plan `140`, ADR 0003).
- **B2** No durable scheduler — the swarm runs on a detached daemon; launchd and cron do not fire here.

Both are specified in ; each fix starts with a plan under .

- **Docs: platform toggle (macOS / Linux / Windows / Default)** — every component preview switches platform style; the styles are real editable token themes in packages/tokens, not docs-only CSS (see MISSION.md).

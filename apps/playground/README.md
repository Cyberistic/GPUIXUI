# apps/playground — the native GPUix playground

**Status: Phase B, implemented and verified** (plans `120`, `140`, `150`). One
app, three jobs:

1. **The playground** — a real GPUix window showing every scenario, so a human
   can drive each primitive by hand. The shell's palette switch paints the same
   `@gpuixui/tokens` themes the library ships.
2. **The native smoke runner** — the same scenarios exercised by synthetic GPUI
   input in a `TestRenderer`, producing `smoke-report.json`.
3. **The evidence source for the docs** — scenario ids, readouts and screenshots
   are what `apps/docs` links to instead of faking a native preview.

The **registry is the single source of truth**: `src/scenarios/index.ts` is both
the sidebar and the smoke list, so a scenario cannot exist in one and not the
other. Each scenario is one capability, one view, one `steps` effect: the core
capabilities (including the theme gallery, the modal contract and floating
placement), the Tier 3/4 probes
(`table-select-sort`, `table-column-resize`, `virtualized-table`,
`tree-view`, `log-viewer`, `property-panel`, `workspace-tab-drag`,
`workspace-restore`), the
command surface probe (`command-palette`), the tabbed-pane probe
(`workspace-panes`), the docking probe (`docking-layout`), the detachable-tab
probe (`float-tab`), the hover-card probe (`preview-card`), the app-level
shortcut probe (`window-key-shortcut`), the chart probe (`chart-svg`), the
markdown probe
(`markdown-surface`), the toast-viewport probe (`toast-lifecycle`), the
collapsible-height probe (`collapsible-height`), the nested-layer probe
(`nested-layer-dismiss`), the shipped Tier 2 catalogue
(`tier2-dialog`, `tier2-menu`, `tier2-toast`, `tier2-foundation`,
`tier2-navigation`, `tier2-choice`, `tier2-forms`, `tier2-editing`,
`tier2-flow`), the multi-pane editor probe (`multi-pane-editor`), the shell
probes (`shell-navigation`, `shell-selection`), which mount the real `App` — the
first proves the sidebar scrolls (the registry is longer than the window, so an
unreachable entry would be a scenario the app cannot open), the second proves
selecting an entry, the keyboard contract and the palette switch.

## Run it

```sh
nub run dev:playground              # from the repo root: opens the playground window
nub run --filter playground smoke   # the native smoke suite, headless
nub run --filter playground smoke:live  # a real window, driven by automation
```

`dev` and `smoke` both **preflight first**: they import the native binding only
after asking whether it loads, so a host without one gets a one-line remedy and
exit `2`, never a stack trace.

Run the app with **`nub`**, not a bare `node`: the theme provider comes from
`@gpuixui/tokens/react`, whose export is TypeScript with JSX, and nub transpiles
it. Plain `node` on `dist/` cannot.

The workspace resolves **one** React (19.3.1) for the playground, the token
provider and its tests. The playground depends on `^19.2.0`, not an exact pin: an
exact `react` beside `react-dom`'s `^19.2.0` can install two copies, and two
copies make every hook throw. `@gpuix/react@0.10.0` accepts `^19.0.0`.

## Exit codes (`smoke`)

| Exit | Meaning |
| ---- | ------- |
| `0`  | every scenario ran and passed |
| `1`  | at least one scenario failed — a real regression |
| `2`  | the runtime is unsupported here, or nothing ran — **no evidence** |

Both scripts run the built CLI from the **repo root**, so artifacts always land
in `apps/playground/.artifacts` regardless of which entrypoint you use.

**Observe the code from the built CLI, not through `nub run`.** nub 0.9.6
collapses any non-zero child exit to `1`, so `nub run --filter playground smoke`
reports `1` even when the suite said `2`:

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js; echo $?
# -> 0 here (82/82 green); -> 2 on a host with no binding
```

Artifacts (gitignored, under `.artifacts/`):

- `.artifacts/smoke-report.json` — the schema-encoded report (`Report.reportJson`);
- `.artifacts/screenshots/<scenario-id>.png` — one frame per scenario with `--screenshots`.

Flags: `--json`, `--only <scenario-id>`, `--screenshots`, `--artifacts <dir>`.

Nothing is written to `.artifacts/` on an unsupported host: exit `2` means there
is no evidence, and a stale report must never be mistaken for a fresh one.

## The binding on this host

The library targets `@gpuix/react@0.10.0` + `@gpuix/native@0.10.0`. GPUix
publishes **no `darwin-x64` binding** for 0.10.0, so this Intel Mac has none by
default and the suite would exit `2`.

It is built from source instead: the blocking `xcrun metal` step is **optional**
— `gpui_macos`'s `runtime_shaders` feature compiles the identical shader source
through the OS Metal compiler at runtime, so the pinned Rust toolchain plus
Command Line Tools suffice. One script does the whole thing (idempotent):

```sh
sh apps/playground/scripts/build-native-binding.sh
```

It installs Rust 1.97.1 and the pinned zed tree under
`.agents/slop/scratch/gpuix-build/` (agent state, gitignored), builds the
cdylib with `runtime_shaders`, and drops it at
`node_modules/@gpuix/native/gpuix-native.darwin-x64.node`. The recipe, commands,
STOP conditions and the measured per-capability facts are in
`.agents/slop/plans/140-gpuix-native-darwin-x64-build.md`; the decision is
`.agents/adr/0003-darwin-x64-source-build.md`.

The artifact is a build product (gitignored). A fresh checkout has no binding
and reports exit `2` until the script is run. Its provenance: same version, same
source revision, same Rust code as the published package; only the
shader-compilation feature differs. Confirming with the **published** binary on
an Apple Silicon CI runner is the gold standard, tracked in `TODO.md`.

## The theme gallery (plan `150`)

`tokens-theme` proves the token layer on a plain host; this app proves it **in
the runtime**. Two scenarios:

| Scenario | What it asserts |
| -------- | --------------- |
| `theme-color-roles` | every one of the 47 roles in `colorRoles` paints its exact value; the palette switch (dark → light → high contrast) re-paints every swatch and the three colour sets differ |
| `theme-type-and-shadow` | every type role in `typography` reaches the runtime through `textStyle` (size and family, with `code` on the mono family); `focusRing` paints the zero-blur spread ring; `elevationShadow(theme, "md")` paints its blur, offset and colour |

The checks read the **runtime's own style report** (`SmokeHost.paintedStyle`,
decoded at the adapter boundary), not a screenshot, so a token that never
reaches the renderer fails by name. The role lists are derived from `colorRoles`
and `typography`; a new token cannot go untested. The gallery is the native
preview source for the docs' Theming page.

`theme-platform` adds the platform type styles: a switch cycles Default → macOS
→ Linux → Windows and the mono role paints `Menlo`, `Menlo`, `DejaVu Sans Mono`
and `Consolas` while the sans role stays GPUI's `.SystemUIFont`; the surface
colour does not move, because the shipped variants are type styles, not a second
palette. The expected families come from `platformTypes`.

Two honest notes:

- The ring check is a **style** proof. Focus delivery itself is
  `focus-traversal`; GPUix 0.10.0 has no `:focus-visible`, so a component owns
  the state.
- `tsconfig.check.json` and `tsconfig.build.json` map
  `@gpuix/react/jsx-runtime` for type-checking. `@gpuixui/tokens/react` is
  React-only, so its JSX must resolve against React's runtime types, and it
  cannot see this app's `@gpuix/react` install. At runtime nub transpiles the
  entry correctly; the mapping is typecheck-only and `tsconfig.json` (which nub
  reads) stays clean. The durable fix belongs in `packages/tokens` and is
  tracked in `TODO.md`.

## The shell itself (plan `182`)

`shell-navigation` guards reachability; `shell-selection` guards the shell's
behaviour. It mounts the real `App` and drives navigation and the palette with
native input:

| Fact | Measured |
| ---- | -------- |
| selection | clicking `nav-text-native` mounts that scenario's real view (`text-plain` = `hello gpuix`), paints the entry with `colors.accent` and the first entry with `colors.background` |
| keyboard | Enter on key **down** switches; Space on key **up** switches; Space on the down alone does nothing. The nav uses the shipped `Button`'s `decideActivation`, not a second copy |
| palette | `theme-mode-light` repaints `app-shell` from `#11141A` to the light `#F6F8FA`, keeps the selected scenario and leaves its view mounted |
| isolation | the full suite mounts every scenario under a `Fragment` keyed by id: without it React kept the previous `<App>`'s Shell state and native scroll offset, and a click landed outside the viewport (found by this probe; `--only` passed, the full run did not) |

## The shipped Tier 1 components (plan `168`)

The scenarios above prove runtime mechanisms; these three mount
`@gpuixui/primitives` — the package a consumer imports — through the shipped
token theme, so the report covers the composition and not only the renderer.
Each view bridges the two providers: the runner's `@gpuixui/tokens/react`
theme is read with `useTheme()` and passed to the primitives' own
`ThemeProvider`, which has no default palette.

| Scenario | What it asserts |
| -------- | --------------- |
| `primitives-actions` | `Button` activates on a click, on Enter **down** and on Space **up**; `disabled` and `loading` refuse all three; the loading button announces `Loading`; the focus ring `controlFocusStyle` merges into the runtime's own style report and disappears when focus moves; `Toggle` flips and announces `pressed` / `not pressed` |
| `primitives-fields` | a controlled `Input` receives the native edit and `onSubmit`; a disabled `Input` refuses the edit and still exposes its value as a `TextInput`; `Checkbox` toggles by click and Space-up with `aria-valuetext`; `Switch` toggles and announces checked; `Select` paints its options, commits the next one with Down + Enter, and Escape closes without losing the value |
| `primitives-display` | `Slider` steps by one with the arrow keys and announces its formatted value; `Progress` reports `42%` and `Meter` `68 GB`; `Skeleton` paints a 14 px box with a themed background; `Tooltip` opens on a native mouse enter |
| `primitives-choice` | `RadioGroup` selects on a click and with the arrows (Down selects and wraps, Up returns), and the item announces `checked`; `Rating` rates on the first star, Right/End raise, Right clamps at five, Delete clears and Left clamps at zero |
| `primitives-entry` | `NumberField` steps with Up/Down, commits a typed `99` as the clamped `10`, and exposes the committed value; `OTPField` fills six digits with focus advancing, fires `onComplete` once, Backspace deletes exactly one character and Left moves native focus back a cell |

The harness gained `keyDown`/`keyUp` for this: `simulateKeystrokes("space")`
does not deliver the key **up** a button contract needs, and the choice/entry
scenarios dispatch arrows to the group's own `testId` because a keystroke
delivered after the coordinate click did not reach the wrapper. Focus routing
is proven by `roving-focus` and `modal-focus-trap`; these probes assert the
controls' contracts. Measured facts are in plan `168` §8 and plan `169` §8.

## The modal contract (plan `155`)

`modal-focus-trap` is the native evidence for the Tier 2 overlays: it drives the
same mechanism `DialogContent` uses (a ref callback, `renderer.focusElement`, and
`focusNextWithin`/`focusPreviousWithin` on the content's own `onKeyDown`) and
proves:

| Fact | Result |
| ---- | ------ |
| focus enters the modal | `renderer.focusElement` moves native focus from component code; `getFocusedElementId` reports the content |
| Tab cannot leave | forward order `content → a → b → open-popover → close → content`; Shift-Tab is the reverse; every id stays inside |
| focus returns on close | the layout-effect cleanup focuses the saved trigger id; `getElementBounds` is the existence check |
| Escape closes one layer | with a popover open inside the modal, Escape closes the popover and returns focus to its opener; a second Escape closes the modal |

The last row is why every overlay pushes onto one dismiss stack: the keystroke
reaches only the focused layer, so a nested dialog closes outside-in.

## Floating placement (plan `156`)

`FloatingLayer` is the only positioning engine the library has, so
`floating-placement` measures the native `<anchored side align gap fit>` it
renders. Three facts, two of them defects to design around:

| Fact | Result |
| ---- | ------ |
| `side` + `sideOffset` + `align="start"` | exact: bottom is `anchor.bottom + gap`, right is `anchor.right + gap`, top/left edges align |
| `align="center"` | **not centred**: it ends the panel at the anchor's centre line, short by half the panel's own size on both axes (`anchored.rs` wraps the layer in a full-size zero box and also positions it from the anchor point). `start`/`end` are exact; a component must compensate with a known-size `alignOffset` or avoid `center` |
| window edge | `fit="snap"` clamps the panel to `window − snapMargin`; it **does not flip**. A bottom-side menu near the bottom ends up over its trigger, so the component must choose `side="top"` itself |

## Native popups (plan `159`)

`select-choose`, `combobox-filter` and `tooltip-open` are the runtime verdicts
for the three interactive components GPUix publishes and the library composes.
They add the `hover` host call (`nativeSimulateMouseMove`), which no earlier
scenario exercised.

| Scenario | What it asserts |
| -------- | --------------- |
| `select-choose` | a trigger click opens and paints the items; an item click commits, closes and **returns native focus to the trigger**; Down opens, Down on the auto-focused content moves, Enter commits the next item; Escape closes; an outside press dismisses and returns focus |
| `combobox-filter` | focus/click opens; typing filters (the non-matching row unmounts); Enter commits the auto-highlighted row; the empty state mounts; Escape closes |
| `tooltip-open` | a real native mouse enter opens the tooltip and paints its content; leaving closes it after the component's 80 ms timer; a click closes it |

Two traps worth knowing: `ComboboxList` filters **only** when its child is a
function — static children render every item regardless of the query. And a
Tooltip trigger closes on click (mousedown → close, click → close), so focus
that arrives from a click does not leave it open; hover is the supported path.

## Interactive hover cards (plan `196`)

`preview-card` asks the question a tooltip does not answer: can the pointer
move **into** a floating card and use it, or is every hover surface
non-interactive by construction? The answer is yes, with a specific mechanism
(18 checks). The card is a `FloatingLayer`, and that layer renders **inside** its
anchor (plan `156`), so the card is a descendant of the trigger — which is what
makes the naive model fail.

| Fact | Measured |
| ---- | -------- |
| entering the card | `body:enter` arrives **before** the trigger's `trigger:leave`, so cancelling a close on enter does not work — the leave schedules one after |
| the leave payload | **no coordinates** (`trigger:leave:none`), so intent cannot be computed from the event |
| the grace close | a 200 ms timer scheduled on any leave, which **re-checks an `inside` ref at fire time**; `hover(card)` then 300 ms later reads `open=true closes=0` |
| leave delivery | **per element**: moving from the card's control to empty space fires the control's leave, not the body's — every hoverable child in the card needs the handler |
| ancestors | the card root does receive enter/leave (`in=1 out=1`), but a child-to-child move can leave it, so the root cannot own the grace area |
| the timer | real JS time: a 300 ms `Effect.sleep` and `advance(0)` are needed before the close is visible, the same rule as `toast-lifecycle` |
| interactivity | a click on the card's control runs (`actions=1`) and the card stays open; a hover does not move native focus |
| re-enter | leaving and re-entering the trigger inside the delay keeps the card open and does not count a close |

The component contract: an interactive hover card needs a **delayed** close
that re-checks pointer presence, a handler on **every** hoverable child, and no
dependence on ancestor enter/leave or event coordinates. Remove the fire-time
check and the card closes the moment the pointer reaches it (the recorded
reverse proof).

## Accessibility (plan `160`)

`a11y-tree` reads the last painted frame's AccessKit dump and turns the
library's accessibility claims into a test:

| Fact | Result |
| ---- | ------ |
| roles | `button`→`Button`, `checkbox`→`CheckBox`, `switch`→`Switch`, `slider`→`Slider`, `heading`→`Heading`, `option`→`ListBoxOption`, `<input>`→`TextInput` |
| names | **not derived from text**: a button with a text child and no `aria-label` has no accessible name |
| states | `aria-expanded` (including `false`), `aria-selected`, `aria-level`, `aria-valuetext`, `aria-description`, `aria-id` all reach the dump |
| missing | **no checked state** for CheckBox/Switch (`aria-checked` is not in the typed props); no `valuenow`; no `labelledby`/`describedby` |
| actions | `on_action` follows the native listeners: a `Click` action exists only with `onClick` |
| presentation | produces no node; its text still paints as a `Label` |
| virtual list | 8 of 50 retained rows are exposed — the a11y tree follows the **painted** window |

The honest consequence: every control must pass `aria-label`, and a
Checkbox/Switch announces its state through `aria-description` until GPUix
exposes a checked channel.

## Native content surfaces (plan `161`)

`native-surfaces` is the runtime verdict for icons, image preview, the diff
viewer and the `<canvas>` trap. Bounds are read from GPUI's `on_painted`, so a
non-null box is paint evidence, not merely layout.

| Surface | Result |
| ------- | ------ |
| `<svg source>` | retained as type `svg`, painted at its declared box (48 × 48) |
| `<img>`, no `src` | retained, painted, and the paint log holds exactly one `img: no src` |
| `<img>`, undecodable data URL | exactly one `img: load failed` |
| `<img>`, valid PNG data URL | 64 × 64, no fallback added |
| `<img>` + `setImagePixels` | 2 × 2 RGBA uploaded through the ref, painted at 32 × 32, no fallback |
| `<diff>` | 640 wide with a painted height; file header, hunk header, added and removed lines all reach the paint log |
| `<canvas>` | **retained as type `canvas`, paints nothing**: no bounds, child kept in the tree but dropped from the paint log |

Two limits, stated rather than hidden: there is no pixel readback, so a corrupt
PNG with a valid MIME is indistinguishable from a decoded one, and an empty
`<svg>` has the same type and box as a painted icon — the screenshot artifact is
the only visual evidence, never an assertion. Charts and the colour picker
cannot use `<canvas>`; `<svg>` and `<img>` + `setImagePixels` are the honest
alternatives.

## Cross-element drag and file drops (plan `162`)

`drag-targets` logs every mouse and drop event on three adjacent boxes and
records exactly where a captured gesture goes. It answers the question tab
dragging and drag-and-drop depend on:

| Fact | Result |
| ---- | ------ |
| capture | every move (8 of 8) and the up stay on the element that received the press; the element under the pointer gets neither |
| hover during the drag | **frozen**: the target sees no enter/leave until the button is released, then `A:leave>B:enter` settle in that order |
| the end of a drag | **a click on the source** fires even after 170 px of movement |
| `onFileDrop` | receives both absolute paths and the window drop point (`218,58`); the simulation also emits moves around the drop |
| a drop with no handler | no drop event — **but the element still gets a click** (`C:up>C:click`) |
| after the gesture | a click and a hover work immediately (`B:click`, then `B:leave>A:enter>A:move`); nothing stays captured |

So a drop target must be found by hit-testing pointer coordinates, not hover,
and both the drag-ending click and a failed-drop click must be suppressed. The
log is deterministic across runs.

## Native text selection (plan `163`)

`text-selection` drives the renderer's own `dragSelect` and reads
`getSelectedText`. Copy is a core desktop interaction for the log viewer, code
blocks and diffs, so the claims are measured rather than assumed:

| Drag | Selection |
| ---- | --------- |
| heading → second body line | exactly `Selection heading\nfirst line\nsecond line` |
| anchored inside `userSelect: "none"` | **empty** — no selection at all |
| body line → past the unselectable toolbar | both text runs, toolbar excluded |
| across a `<code>` block with line numbers | `alpha();\nbeta();` — no line numbers |
| across a `<diff>` | only the line text — no file header, hunk header, gutter or marker |

`clearSelection` empties an existing selection and a plain click selects
nothing. The surprising half is the anchor rule: a selection that **crosses**
`userSelect: "none"` skips it, but one **anchored** inside it selects nothing,
so a gutter or toolbar must never start a drag. One harness note: ending a drag
2 px inside the right edge truncates the last glyph, so `selectText` ends at the
edge.

## Native context menus (plan `164`)

`context-menu-pointer` drives the right click and a real `<anchored>` surface at
the pointer, then repeats it on a row inside a scrolled container. What holds:

| Gesture | Measured |
| ------- | -------- |
| right click on the trigger | `mouseDown(button 2)` → `auxClick` → `mouseUp`; `isRightClick` is `true` and the payload carries **window coordinates** (`100,50` at the element centre) |
| `auxClick` payload | **no `button`** (`undefined`); guard on `isRightClick`, never `button === 2` |
| `onClick` for a right click | **never fires** — `onClick` is primary-only |
| a right click on a child | bubbles to the trigger, so a row's label can carry the gesture |
| `<anchored position={pointer}>` | exact — 180×110 at exactly the pointer point |
| outside press / Escape | both dismiss; the outside element receives the press first |
| `shift-f10` | arrives as `key=f10` with `modifiers.shift`; the surface auto-focuses; Escape returns focus to the trigger |
| a **scrolled** ancestor | scroll offset `-400`, row centre `(130,241)`, the in-container surface measured exactly `(130,241)` — **no double offset and no clipping**: an item ~50 px below the viewport still paints and still activates |

The honest consequence: a context menu does **not** need a portal or a root
mount in 0.10.0 — the anchored surface is window-positioned even inside
`overflowY: "scroll"`.

## Virtualized tree (plan `165`)

`virtualized-tree` flattens 8 directories × 40 files into one list inside a
`<virtual-list>` and drives the tree contract through the component's own
handlers. What holds:

| Question | Measured |
| -------- | -------- |
| indentation inside a virtual row | `paddingLeft: 4 + depth * 16` shifts the child label exactly **16 px** |
| expand/collapse under virtualization | 8 rows ↔ 48 rows; the painted window follows, no stale child remains |
| click / arrows | the clicked row takes native focus; Down/Up move selection **and** focus, including after an expansion shifted the indices |
| focus outside the window | at scroll `-512` the window painted `file-12 … file-20` plus the focused `file-22`; Down still moved focus to `file-23` |
| Right on an open directory | moves to its first child; Left on a file moves to its parent |

The limit is the one `a11y-tree` records: the accessibility tree follows the
painted window, so a virtualized file tree must treat "painted" as the window
**plus** the focused row.

## Scroll into view (plan `166`)

`scroll-into-view` drives a 200-row `<virtual-list>` with Home/End and arrows.
What holds, and the trap it records:

| Route | Measured |
| ----- | -------- |
| `focusElement` on an off-window row | **reveals it** — no explicit scroll call is needed for a keyboard move |
| `scrollToItem(list, 120)` | logical anchor `[120, 0, 280]` exactly; the selection and focus do not move |
| `scrollIntoView(row 10)` | logical anchor `[10, 0, 280]` exactly, focus untouched |
| `getListScrollTop` | the exact anchor `[itemIndex, offsetInItemPx, viewportHeightPx]` |
| `getScrollOffset` on a virtual list | **saturates** — `-1320` at the end of a 200-row list whose top row is 191; never use it to persist a position |

A scroll does not move focus, and the focused row stays painted as a straggler
after the window moves away.

## Variable row heights (plan `198`)

`variable-rows` is the one virtual-list probe with **real, differing row
heights** — the shape an expandable row, a wrapped data cell or a message
thread needs. 60 rows cycle 20/40/60 px with `estimatedItemHeight={20}`.

| Question | Measured |
| -------- | -------- |
| Do declared heights stack? | yes, exactly: rows 0–5 sit at `0, 20, 60, 120, 140, 180` with those heights |
| Does the paint window follow real heights? | yes — eight rows fill the 300 px viewport (`20+40+60+20+40+60+20+40`) |
| Does a mismatched `estimatedItemHeight` break it? | no: 20 against a 40 px average still lays out exactly |
| Expanding row 2 (`60 → 120`) | rows 3/4/5 move `120 → 180`, `140 → 200`, `180 → 240` — exactly `+60`; the anchor stays `[0, 0, 300]`; the window drops to six rows |
| Collapsing | restores every `y` and repaints the eighth row |
| `scrollToItem(list, 30)` | anchor `[30, 0, 300]` exactly; row 30 paints at the viewport top and rows 28/29 detach |
| `scrollIntoView(row 45)` | reveals the row inside the viewport from a jump to the top |
| A `-120` wheel | anchor index `> 0` with `offsetInItem <` that row's height |

The recipe for Expandable rows: declare each row's height (state, not a
measurement pass), let the list reflow, and persist the anchor as before — no
`estimatedItemHeight` tuning is needed for correctness, only for the scrollbar's
rough scale. A component does **not** need to scroll by hand after an expansion.

## Message scroller (plan `300`)

`message-scroller` is the chat/stream contract plan `206` defines: follow new
content while the reader is at the end, leave them alone when they are not, and
offer a way back. The runtime makes it narrower than the browser version, and
the probe pins the recipe.

| Question | Measured |
| -------- | -------- |
| Opening at the latest message | a mount-time `renderer.scrollToItem(list, count)` (the at-end sentinel) anchors `[50, 0, 300]` for 60 × 30 px rows and paints rows 51–60 — no `alignment`/`followTail` needed |
| Is there a scroll event on `<virtual-list>`? | **no `onScroll`**. The only signal is `onVisibleRange` |
| Is the range payload a pin source? | **no**: it is a built-window range with overdraw, and it lags one gesture. After a 400 px scroll up from the tail it still reported `endIndex = 66`, so `endIndex >= count` stayed pinned and the next append **yanked** the reader |
| The exact pin source | `renderer.getListScrollTop(listId)` read **inside** `onVisibleRange` returns the post-scroll anchor (`[42, 20, 300]` in the same gesture). Call it as a method — extracting it unbound throws `Cannot read properties of undefined (reading 'native')` |
| Does the runtime follow an append? | **no** — with the app's follow effect removed, appending at the tail left the anchor unmoved; the component scrolls to `scrollToItem(list, count)` while pinned |
| Append while unpinned | anchor untouched (`[42,20,300]` before and after), the new tail is not painted, and the unread count increments; no yank |
| Jump to latest | `scrollToItem(list, count)` lands on the new max scroll exactly and re-pins; unread clears |
| Streaming a pinned last row | growing the row 30 → 40 → 50 re-pins: the anchor moves `52,0 → 52,10 → 52,20` so the tail's bottom stays on the viewport bottom |
| Threshold | a 10 px scroll up stays pinned at 24 px; a 400 px scroll up does not |
| Short history | 3 × 30 px in a 300 px viewport: anchor `[0,0,300]`, the sentinel scroll is a no-op, every row paints, and no affordance appears |

The recipe: derive `pinned` with `distanceFromEnd = contentHeight −
scrollTop(anchor) − viewportHeight` (`scenarios/scroller-state.ts`), read the
anchor in the range handler, and re-scroll only while pinned on append **and**
on last-row growth. Do not build a timer to compensate for the lagging payload.

## Search highlights (plan `171`)

`search-highlights` drives the published find contract — `highlight`,
`onHighlight`, `useTextSearch` and `getPaintedHighlights()` — over one
document. What holds, and the traps it records:

| Fact | Measured |
| ---- | -------- |
| a wash reaches the paint | `getPaintedHighlights()` reports one entry per match, with the run text, UTF-16 `[start, end)` and boxes |
| coordinates | the rects are **window coordinates**, the same space as `getElementBounds` (a doc offset by 40/30 painted at `x=68.4, y=30`) |
| `useTextSearch` totals | `total=4` for two matches on each of two lines; `active` starts at 0 and `next` moves it |
| `onHighlight` | delivered after `dispatchNativeEvents` (the same requirement as `onMotionComplete`); it carried `matchCount=3` |
| scoping | a nested `highlight` **replaces** the ancestor's for its subtree — the outer query does not wash the nested run |
| matching | case-insensitive by default, `caseSensitive` respected, `wholeWord` skips `errors`, explicit `ranges` paint exactly |
| surrogate pairs | a range that splits one is **refused** (no wash), while a valid range after the surrogate still paints |
| soft wrap | a match that wraps paints **more than one box** — one per visual row |
| `<code>` | `query` searches native code text; a `ranges` spec paints **nothing** inside `<code>` |
| virtual list | `matchIndexOffset: row` + `activeIndex: 90` makes row 90 the only active wash after `scrollToItem(list, 90)` — numbering is document-wide, not window-local |

The honest gap: `getPaintedHighlights()` reports no colour, so the wash colour
and `activeColor` are not asserted; a screenshot is visual evidence, never an
assertion.

## Drag edge auto-scroll (plan `172`)

`drag-autoscroll` drives the mechanism a reorderable list or a movable tab strip
needs: a real press, held moves, an edge hold and a release. What holds, and the
trap it records:

| Fact | Measured |
| ---- | -------- |
| runtime auto-scroll on a held drag | **none** — the plain list's source received the move, the pointer sat at the bottom edge for 600 ms, and the offset stayed `0` |
| a component-owned loop | one `renderer.scrollTo(id, 0, y ± rowHeight)` per held move inside the 24 px edge band scrolls exactly one row (`0 → -24 → -48 → -72`) |
| scrolling back | a held move at the top edge scrolls one row back (`-72 → -48`) |
| capture during the scroll | the source still receives every held move and the `up`; scrolling does not lose the gesture |
| the drop index | derived from the pointer and the live offset (`floor((viewY - offset) / 24)`); it follows the scroll and moves back with it |
| the gesture-ending click | still fires on the source after 170 px of held scrolling — a reorder must swallow it |

The honest contract: **a drag-and-drop or detachable-tab component owns its edge
scrolling** on 0.10.0; the runtime does not do it.

## Workspace restore (plan `167`)

`workspace-restore` saves a two-pane workspace — split width, both tab lists, the
active tab and a `<virtual-list>` anchor — through app-owned JSON, then kills the
tree and restores it. What holds:

| Fact | Measured |
| ---- | -------- |
| a reset is a real restart | the live workspace returns to `split=320` and anchor row `0`; the saved JSON stays |
| restore | split `400`, `tabsA=two tabsB=one active=one`, and the anchor **exactly** at index `120`, in-row offset `16` |
| `scrollToItem(id, index, offsetInItem)` | supported and exact on a freshly mounted list; a mount-only layout effect applies it |
| native focus | **not restored** — the row focused before the save is not focused after the remount; the restored list still accepts a click |

The docking contract: persist `anchorIndex` + `anchorOffset` from
`getListScrollTop`, never `getScrollOffset` (it saturates), and do not promise
focus restore.

## The command surface (plan `176`)

`command-palette` is the Tier 4 command surface: a global shortcut, a **non-modal**
overlay, one focus owner and a filtered list — 58 checks. It also settles the
application-menu path, because `@gpuix/native` 0.10.0 exposes only window
controls (`setWindowTitle`, `activateWindow`, `minimizeWindow`, `zoomWindow`,
`toggleFullscreen`) and **no native menu or tray API**: a menu is an in-window
surface opened by a window key, exactly like this palette.

| Fact | Measured |
| ---- | -------- |
| window keys under a focused `<input>` | letters, arrows and Escape reach **both** the field and the app-level handler (`window=t keys=3`; `window=escape`) |
| Enter and Backspace | **not** delivered to the app-level handler — Enter becomes the field's `onSubmit`, Backspace is consumed by the native editor. A shortcut layer must not rely on them |
| a chord while typing | `cmd-k` reaches the app handler and does **not** type into the field (`query=o` unchanged, `window=k`); a chord also does not reset the query while the palette is open |
| arrows | delivered to the field as **key down** (`input=d:down`), and they move the active row while native focus stays in the input — the selection is visual only |
| a11y | the surface is AccessKit `Dialog`; each row is an option whose `aria-selected` follows the active index. There is no `aria-activedescendant`, so this is the only AT-visible selection |
| commit | `onSubmit` commits the active row, closes the palette and returns focus to the trigger |
| dismissal | Escape closes from the field and returns focus; the app handler sees the same Escape; an outside press on the scrim covers a full-window layer and dismisses |
| layering | the scrim and surface are **siblings** inside the `<anchored>` layer: a row click lands above the veil (a successful commit proves it) and a click on the veil's centre dismisses |
| focus | `autoFocus` focuses the field on a conditional mount; the previously focused element is captured **in the open handler** (before the input mounts) and restored through `renderer.focusElement` |

The component contract: a palette keeps one focus owner and moves a visual
selection, handles arrows on key down and Enter through `onSubmit`, never routes
commit/dismiss through window keys alone, and treats the window handler as a
chord shortcut layer that may also see plain typing.

## Tabbed panes (plan `177`)

`workspace-panes` composes a vertical split, a tab strip, two panes and a
`<virtual-list>`, and records the composition rules a workspace needs — 29
checks. The first rule is a trap:

| Fact | Measured |
| ---- | -------- |
| `display: "none"` | **a no-op**: the binding maps `display` only for `"flex"`/`"grid"`. An inactive pane rendered this way still laid out (`y 205.5`, `h 78`), painted its text and **stole a click** from the tree row under it |
| hiding a pane | absolute overlapping slots + `visibility: "hidden"` + `pointerEvents: "none"`: no paint, no click, still mounted |
| state | a hidden pane keeps its draft (`notes`), its pick (`2`) and its `<virtual-list>` anchor (index `20`) across switches |
| tab order | `visibility: "hidden"` also removes the pane's tab stop (`focusNext` reaches the visible pane's input); a hidden slot with `tabIndex={0}` did **not** become a stop |
| nested scrolling | a wheel over a nested scroller scrolls **both** it and its ancestor (`−240`, `−240`) — it chains |
| the wheel guard | `pointerEvents: "auto"` on the inner scroller keeps the ancestor at `0`; the inner still scrolls and clamps at `−480` |
| a resized pane | `240 → 180` re-windows the list `5 → 2` painted rows and keeps the anchor; the painted window follows the **clipped** intersection, not only the list's own height |
| heights | a `height: "100%"` chain through the split, strip and two flex levels gives the list no viewport; derive the pane height from the split size instead |

The component contract: keep tab panes mounted and hide them with
`visibility: "hidden"` in absolutely positioned slots, guard a nested scroller's
wheel with `pointerEvents: "auto"`, and pass an explicit content height down from
the split.

## Docking layouts (plan `184`)

`docking-layout` is the composition a docking grid needs: a recursive tree of
groups and splits (`src/panels/dock.ts`, pure and unit-tested), a drag between
panes, edge drop zones and an app-owned restore. It is also the first probe that
reads geometry **from component code during a gesture**.

| Fact | Measured |
| ---- | -------- |
| pane geometry | a `ref` gives a `PublicInstance.id`; `useGpuix().renderer.getElementBounds(id)` returns the surface's window box; every group box the `rects` model projects from it matched the runtime within 1 px, including splits created mid-run |
| drop indicator | an **absolute child of a `position: "relative"` pane**: the right bar sits at `pane.right − 4` (4 × pane height), the top bar on the pane's top edge; the centre zone covers the pane. `paintedStyle.backgroundColor` is the palette's `primary`; `pointerEvents: "none"` keeps it out of the hit path |
| zones | a 48 px edge band; the nearest edge wins a corner, otherwise the centre |
| captured drag | every held move reached the pressed tab **while the indicator re-rendered on each move**; the `up` applied exactly one drop. The handler must be on the tab, not the group |
| edge drop | right/bottom puts the new group **secondary**, left/top **primary**, at half the target's extent |
| centre drop | merges into the target's strip, no split |
| prune | moving a group's last tab out removes the group and collapses its split to the survivor — measured both inside a nested split and at the top level |
| keys | every split must be `key`ed by its node id: a collapse reparents the survivor into its parent's position and React otherwise reuses the parent's size state (`320` instead of `324` in the two-direction proof) |
| restore | the tree owns every size; save → reset → restore re-applies the outer `280` and nested `324`/`197` through a keyed remount, and the restored tree answers a tab click |
| a11y | the dump exposes `Region` (the pane, labelled), `TabList`, `TabPanel`, `Tab` (with `aria-selected`) and `Splitter`. Role names are AccessKit's capitalised names, not the authored tokens |

Limits: there is no docking package yet; the indicator's paint order is inferred
from the last-child rule (`toast-lifecycle`) and not asserted; the
gesture-ending click is a measured `drag-targets` fact and must be suppressed by
a component; a detached tab stays in-window (0.10.0 has one app window).

## Detachable tabs as floating panels (plan `194`)

`float-tab` answers the half of **Detachable / movable tabs** that `172` left
open. The negative half is settled: 0.10.0 has one application window and no
`openWindow`, so a detached tab cannot become an OS window. This probe measures
the honest alternative — an absolutely positioned panel inside the app surface —
end to end (46 checks, model in `src/panels/float.ts`).

| Fact | Measured |
| ---- | -------- |
| tear-off | a press on a tab, two held moves and a release **outside** the dock open a float at the release point exactly (`x=560 y=320` on a 900 × 480 app surface); the strip loses the tab (`main=beta,gamma@beta`) |
| the release point | the **last held move** is the release; the `up` handler needs no coordinates |
| paint order | the float is the app root's **last child** inside `position: "relative"`; a click where it overlaps the dock reaches the float body (`body=1`, `dockBody=0`). Rendering it before the dock reverses that — the dock takes the click |
| title drag | the title bar moves the window by the pointer delta exactly; no offset double-count, no scroll correction |
| clamp | moving far past the corner pins the box at `(640, 320)` — `900 − 260` and `480 − 160`. The clamp is component code: without it the frame follows the pointer to `2200` |
| focus | a click focuses the float's tab; Escape closes the float and `renderer.focusElement` returns focus to the dock's active tab |
| re-dock | dragging the float's tab onto the strip appends and activates it (`main=gamma,beta@beta`) and prunes the emptied window |
| restore | the JSON snapshot is `{ dock, float }` with a nullable float; save → move → restore reproduces `(420, 300)` exactly |
| close | the close button drops the tab (the app's choice); an emptied window is not painted |
| a11y | the panel is an AccessKit `Region` labelled `Floating panel`, its tab a `Tab`, its close control a labelled `Button` |

Two honest limits. There is **no drag preview**: the panel appears on release,
and pointer-following paint was not measured here. And a close control nested
**inside** the press-captured title bar did not fire its click; the same control
as a sibling of the title bar does. A floating panel should keep its drag
surface and its controls separate.

`live-float` repeats the mechanism in a real window (plan `195`) and caught a
live-only race: the runtime ends a captured drag with a **click on the source
tab** (`drag-targets`), and that click re-applied the pre-drag `dock` from a
stale closure — resurrecting the tab that had just been torn off. The headless
gesture (`press`/`releasePointer`) does not synthesize that click, so `float-tab`
could not see it. The fix is a functional `setDock((current) => ...)`, so the
click applies to the post-tear-off state and is a no-op; a component whose tab
click is destructive must suppress the gesture-ending click outright. In the
window the panel lands on the release point within 1 px, the title drag is
exact, and focus/Escape and the close button hold. The live suite is `33/33`.

## Pinned grid chrome (plan `185`)

`grid-wide-table` is the wide-table contract: a header that stays put, a frozen
first column, column windowing and keyboard navigation across 24 columns. The
decisive fact is negative:

| Fact | Measured |
| ---- | -------- |
| `position: "sticky"` | **ignored**: a sticky header inside a scroller moved exactly 80 px for a `-80` wheel, so it is in normal flow (`style.rs` maps only absolute/fixed/relative) |
| one scroll source | the body is the only scroller; the header cells sit at `c*90 + pan.x` and the pinned rows at `r*28 + pan.y`, fed by `renderer.getScrollOffset(bodyId)` |
| alignment | after `-360` the header cell and body cell agree within 1 px; after `-280` the pinned row and body row agree within 1 px; the pinned header does not move |
| windowing | at `x=-360` the tree holds columns 3–10 (`0` and `20` return `null`); at the end `x=-1700` it holds 17–23 (`20` paints, `0` is absent); rows window the same way (`row 0` absent at `y=-280`, `row 39` painted at the bottom) — the runtime does not drop clipped children, the grid never rendered them |
| keyboard | six Rights from column 1 reach `0,7`, focus follows, and the component pans to `-260` to reveal it; three Downs reach `3,7` with the pinned row aligned |
| a11y | `role="gridcell"` is AccessKit `GridCell`; the authored `aria-id` is the dump key, `aria-label` the name, and `aria-selected` is exposed |

Limits: column windowing is component code (no horizontal virtual list), the
probe derives its windows from the renderer's offset rather than accumulating
wheel deltas, and rows are plain — combining the window with `<virtual-list>`
row virtualization is measured by `data-grid-virtual` (plan `338`, below).

## Virtualized data grid (plan `338`)

`data-grid-virtual` is the composition plan `185` left to the data grid: a
`<virtual-list>` **wider than its viewport** inside a plain horizontal scroller,
a frozen column derived from the list's anchor, and a sort/filter that changes
the row set. 60 rows × 10 columns (900 px of content in a 500 px viewport),
59 checks.

| Fact | Measured |
| ---- | -------- |
| wide list inside a horizontal scroller | the header row and the list are children of one `overflowX: "scroll"` div; `renderer.scrollTo` on it pans both, and a header cell aligns with its body cell within 1 px at `-90` and at the far edge `-400`; the list keeps painting and scrolling vertically while panned |
| the wheel route | a `deltaX` wheel over a header cell pans exactly (`-90` for `-90`); the same wheel over a **body cell does nothing** — the list owns the gesture and does not chain it to the ancestor. A grid needs a pan affordance outside its rows, or a forwarder |
| the frozen column | `renderer.getListScrollTop` read inside `onVisibleRange` places its rows; after a 280 px wheel (anchor 10) and after `scrollToItem(list, 45)`, the frozen row and its body row agree within 1 px. The `onVisibleRange` **payload is not a sync source**: with it the anchor was still `0` after the wheel |
| a row-set change | sorting or filtering from anchor 45 returns the list to 0 (the component's `scrollToItem`); without the reset the anchor stays `45` and the frozen column shows unrelated rows. The filtered 10-row set then paints inside the 300 px viewport |
| sort | ascending paints `Item 000`, descending `Item 059`; the list keeps its element and `scrollToItem(45)` is exact |
| panned hit-testing | a click on column 9 at `-400` selects the row, takes native focus (`dg-cell-<id>-9`) and does not move the pan |

The recipe: keep the header and the list in one horizontal scroller, window rows
with `<virtual-list>`, place the frozen column from the list anchor, reset the
anchor on any row-set change, and read the anchor in the handler. Limits: no
column windowing here (`grid-wide-table` covers it) and an app-owned jump must
mirror its anchor optimistically, because a programmatic `scrollToItem` has no
range event to read. The probe is the suite's slowest (≈ 10–19 s) because a
60-row re-render dominates; it is the cheapest shape that still proves the
composition.

## Resizable data-grid columns (plan `349`)

`data-grid-columns` composes the two shapes a data grid needs: plan `130`'s
drag-resized column and plan `338`'s panned virtual body. Four columns (560 px of
content in a 360 px viewport) sit beside a 150 px frozen ID column; each header
cell carries a 6 px handle that drives per-column width state. 87 checks; live
twin `live-data-grid-columns` (18 checks).

| Fact | Measured |
| ---- | -------- |
| header geometry | the pan starts at the frozen column's right edge; the header row is the content width; every visible header cell shares its body cell's left edge and width within 1 px |
| the drag | a +40 drag on a header handle grows `name` `200 → 240`, moves the next header **and** body cell by exactly `+40`, and widens the header row to 600 |
| clamps | drags stop inclusively at the declared bounds (`name` 96 and 320); the last column clamps at 300 |
| the body follows | the virtual rows are flex children of a row whose width is the width sum: a resize repaints every row at the new width, with no stale cell |
| the pan range | the row width is the sum of the widths, so the horizontal maximum follows a resize (`-200 → -350` after growing the last column). **A shrink clamps the live offset immediately**: `getScrollOffset` reported the new maximum `-130` without a manual scroll |
| hit-testing | a 6 px handle straddling its cell's right edge loses its **centre** click to the *next* header cell — the later sibling owns the boundary pixel. The handle must sit fully inside its own cell (`left = width − 6`), which also keeps it reachable while panned |
| anchor | `scrollToItem(list, 45)` anchors exactly; a resize then leaves the readout anchor at 45, `getListScrollTop[0]` at 45 and the frozen row 45 aligned with its body row |
| selection | a selected row survives a resize |
| keyboard | a click focuses the handle; `Right` grows by 16, `End` clamps to the maximum, `Home` to the minimum |
| accessibility | `role="separator"` is an AccessKit `Splitter` carrying `aria-valuetext="200px"` (there is no `aria-valuenow`) |

**Live lesson:** the automation protocol's `click(testId)` uses the element's
**unclipped** centre, so a handle outside the 360 px viewport (the `size` column
after a reset) is not reachable live even though the headless host intersects the
clip. The live twin resizes a visible column instead, and pans before touching
the last one. Every width mutation is a functional update, the plan-348 lesson.

Limits: no auto-fit or double-click reset, no column reordering, no persisted
widths (the reset control plus app state cover storage, as `workspace-restore`
did for layouts), and every column is painted — column windowing stays
`grid-wide-table`.

## Application chrome (plan `350`)

`app-chrome` builds the shell the Tier 4 rows never had evidence for: a 36 px
toolbar, a two-pane body and a 24 px status bar in a 640 × 420 surface. 46
checks; live twin `live-app-chrome` (19 checks).

| Fact | Measured |
| ---- | -------- |
| pinned status bar | the 24 px bar's bottom edge is the shell's; a `-100` sidebar wheel and a `-240` list wheel each move only their own scroller and never the bar |
| independent panes | the sidebar holds `-100` while the list anchors at line 10; the status text reads the list's `getListScrollTop` anchor, not the offset |
| toolbar overflow | a 380 px viewport over a 720 px row: the trailing `sync` action starts past the edge but keeps painted bounds; one `scrollTo(-340)` moves it by exactly `-340`, and it then hit-tests and runs |
| the spacer's place | a 300 px spacer **after** the primary actions keeps `new`/`split`/`close` visible at rest and leaves exactly one trailing item to reveal; before them, it hid the primary actions |
| breadcrumb collapse | `Workspace / … / file.ts` — the middle segment is unpainted, the root and the current page stay; expanding restores all four |
| breadcrumb navigation | each crumb is a focusable `Link` in a `Navigation` named `Trail`; a click truncates the trail to that depth and drops the deeper crumbs; Enter on the focused root does the same |
| a11y | the trail is `Navigation:Trail` and the bar `Status:Status` |

**Two measured traps:** a flex row of `flexShrink: 0` items **overflows its
declared width**, so a reveal must cover the trailing item's real layout x, not
`viewport − rowWidth` (560 px and `-180` left `sync` off-screen); and a
`<virtual-list>` is not a live wheel target — wrap it and wheel the wrapper, as
`vtable-viewport`/`ms-viewport` already do. The probe asserts the chrome metrics
against literals (`36`/`360`/`24`), because comparing them to the same constants
that lay the view out lets a changed height pass.

Limits: overflow is a scroller plus an explicit reveal, not measurement-driven
collapse into a menu (`ref` + `renderer.getElementBounds` is available, as
`docking-layout` measured, but needs a first-layout pass); the shell is
fixed-size; no native menu bar exists in 0.10.0 (`command-palette` records the
in-window alternative).

## Multi-pane editor (plan `375`)

`multi-pane-editor` is the composition the Tier 4 row never had: two tabbed
panes around one live split, each holding a scrolling read-only `<code>`
surface. 55 checks; live twin `live-editor` (19 checks).

| Fact | Measured |
| ---- | -------- |
| geometry | pane A `420`, divider `6`, pane B after it; each pane is a 28 px tab strip over a 372 px viewport |
| independent scroll | a `-200` wheel pans pane A only; pane B stays at 0 and the readout agrees |
| panning | the code box moves by exactly `-200` and its height does not change — the viewport pans the surface, it does not re-lay it out |
| focus and activation | a click lands on the `<code>` child, bubbles to the viewport, makes `active=b` and puts native focus on `editor-b-viewport` |
| tab swap | `util` paints `helper0`, stops painting `alpha0`, leaves pane B's document alone, and starts the new document at the top |
| resize | a `+80` divider drag sets `500`; pane A and its code paint `500`, pane B's code `354`, and no offset moves |
| keyboard | `End` clamps at `560`; the divider is an AccessKit `Splitter` with `aria-valuetext="560px"`; the two surfaces are `TextInput`s named `Editor A`/`Editor B` |
| selection | a drag inside pane A copies its code; a crossing drag joins both documents and `userSelect: none` keeps the tab chrome out |

**Measured traps:** a tab swap **clamps** the old offset to the shorter
document's maximum (`-200 → -168`) and fires **no `onScroll`**, so the readout
drifts unless the component resets or re-reads the offset; and
`overflowY: "hidden"` **still pans with the wheel** — only omitting the axis
declaration stops it.

Limits: the surface is read-only (`<code>` has no editable form in 0.10.0); the
probe keeps one offset per pane, not per tab — a per-tab model needs a
post-layout restore; and the split is fixed-size.

## Inspector panels (plan `348`)

`property-panel` is the composition the four Tier 3/4 rows — key-value
displays, property panels, inspector panels, property editors — never had: an
860 × 440 frame with a rendered preview and a 300 px inspector, whose **virtual
list owns the native editors**. 42 checks.

| Fact | Measured |
| ---- | -------- |
| key/value geometry | the 300 px pane ends within 1 px of the frame's right edge; a row is exactly 36 px; the label column is 96 px and the editor starts exactly one 8 px gap after it |
| the commit path | Enter in a focused `<input>` arrives as the field's **`onSubmit`**, not as a key that bubbles to the row: the row's `onKeyDown` did not deliver the commit. Escape does arrive on the field's key down |
| draft vs model | typing updates a parent-owned draft; the preview, which reads the committed model, does not move until Enter. Enter clears the draft and repaints the preview; Escape drops a draft without a commit |
| model → paint | `Opacity = 40` resizes the preview bar to exactly 48 px (a percentage of a 120 px bar), so an inspector edit is assertable outside the list |
| windowing | `scrollToItem(list, 40)` unpaints row 0 (and paints `Property 40`); scrolling back repaints the editor with the **committed** value. The editor is controlled, so the model — not a native echo — is what returns |
| draft survival | a draft typed into row 0 survives a scroll to row 40 and back (the parent owns it, so a windowed rebuild cannot lose it) |
| filtering | `role` paints only the matching row; the draft on the hidden `Name` row is still there; Escape clears the query and restores every row |
| reset | restores every baseline value, clears the draft and the filter, and returns the preview bar to 96 px |
| accessibility | the editor is a `TextInput` with its committed value in the dump; the filter and the editor are addressable by their authored `aria-id` |

**Live lesson (plan `348` §9):** typing and Enter can arrive in the same React
batch — the live automation has no frame boundary — so a commit handler that
closes over `state` reads a stale, draft-less value and silently commits
nothing. Every inspector mutation is a functional update; the same fix that
plan `195` needed for a drag-ending click.

Limits: the probe proves the **value and the model** survive windowing, not
that an off-window editor keeps native focus. A grid that edits while scrolling
should still reveal the cell (`scrollToItem`) or assert focus itself.

## Terminal surfaces (plan `179`)

`terminal-grid` asks whether a Tier 4 terminal is feasible. The runtime has no
terminal host element — `ElementType` is `div`, `text`, `img`, `svg`, `canvas`,
`input`, `textarea`, `anchored`, `code`, `diff`, `markdown`, `virtual-list` —
and `GpuixRenderer` exposes no process or PTY API. A terminal is therefore **a
component over a text grid, with the PTY owned by the app**; that boundary is the
finding, and the probe measures the library's two halves:

| Fact | Measured |
| ---- | -------- |
| input surface | a click focuses the surface natively; removing `tabIndex` did **not** stop that, so a clickable focus target does not need component focus code |
| printable keys | `simulateKeystrokes("l")` / `"s"` reach a focused `div`'s `onKeyDown` and paint `$ ls` |
| control keys | Enter commits and clears, `up` recalls history, `backspace` deletes one character, Escape clears with status `cancelled` |
| chords | `ctrl-c` arrives as `key: "c"` with `modifiers.ctrl === true`; the surface aborts the line |
| grid | rows paint at exactly `18 px`; two 8-character runs paint the **same width**, and the run reports the theme's `mono` family — the grid aligns without a cell hack |
| colour | per-run `paintedStyle.color` equals `colors.destructive` / `colors.success`, so ANSI ranges can map to theme spans |
| scrollback | the list starts at the tail of 200 lines; `scrollToItem(list, 0)` paints the head and `listScrollTop` reports index `0`; the tail is reachable again |
| prompt | the prompt row is a **sibling** of the virtual list, so a scrollback jump keeps it painted and keeps native focus on the surface |

The honest limits: there is no PTY/process surface, so terminal output and
lifecycle belong to the app; there is no per-cell background or glyph atlas, so a
block caret is a themed `div` and wide glyphs rely on the monospace font's
advance. ANSI parsing is the component's (or the app's), not the renderer's.

## Chart surfaces (plan `180`)

`chart-svg` settles the Tier 3 chart question and the colour picker's gradient
square. The decisive fact is a runtime mechanism: **`<svg source>` is a tinted
stencil**. GPUI rasterizes the document to an alpha mask and paints a
`MonochromeSprite` with the element's `color`, so one SVG document is one
colour — multi-series means one layer per series.

| Fact | Measured |
| ---- | -------- |
| bars from `div`s | a painted mark keeps its exact height (`96`/`64`/`32`), stands on the plot baseline, advances by `width + gap`, and reports `colors.primary`/`success`/`destructive` |
| chart interaction | a click on a painted bar hit-tests, selects its series and writes the readout |
| labels | axis/value labels are real `<text>` nodes: assertable and in the a11y tree |
| chart a11y | `role="img"` + `aria-label` on the container is one AccessKit `Image`; **without `role` the node disappears entirely** |
| one SVG per series | two absolutely stacked layers paint the same `480 × 160` box; each reports **its own** `color` tint |
| SVG text | `svg-internal-label` is visible in the screenshot but **absent from `getPaintedText`** and the a11y tree — labels must be siblings |
| SVG children | React children are retained (`chart-svg-child` reads back) but dropped from the paint, like `<canvas>` |
| full colour | an `<img>` with a percent-encoded `data:image/svg+xml` URL paints `480 × 120` with no fallback; the screenshot keeps a linear **and** a radial gradient plus two fills |

The recipe: bars from `div`s (fully assertable), one `<svg>` layer per line or
area series in an absolute slot, labels as `<text>`, and `<img>` + SVG for any
full-colour artwork. The limit is unchanged: no pixel readback, so exact colour
inside the image and the gradient stops are screenshot evidence.

## Markdown surfaces (plan `181`)

`markdown-surface` mounts `<markdown>` — the host element a rich-text preview, a
changelog pane or an AI message row will render — and measures the contract the
library had only assumed:

| Fact | Measured |
| ---- | -------- |
| render | a heading, bold/emphasis, inline code, a bullet list, a bordered table and a fenced `ts` block (language label + highlighting) all paint, and every run is in `getPaintedText` |
| selection | a drag from a sibling text before the document to one after it returns a selection containing `Release notes` and `const total`; `userSelect: "none"` on the document excludes it from the same drag |
| links | a coordinate click on a link's glyphs fires `onLinkClick` with `https://example.test/docs`; a click on prose does not. The element is `w_full`, so a short link is **not** reachable from the element centre |
| children | React children stay in the retained tree but are never painted, like `<svg>`/`<canvas>` |
| a11y | `role="article"` + `aria-label` is one AccessKit `Article`; internal headings and the table are **not** separate nodes |
| styling | the document paints with its built-in `Theme` default; `theme` is the typed styling prop (only the default was measured) |

The `(x + 2, y + 2) → (x + width, y + height - 2)` mapping is now used by the **live** suite too (`live-selection`, plan `191`), which proves a real pointer drag copies three text nodes, a drag anchored in `userSelect: none` selects nothing, and a crossing drag skips the chrome. The headless verdict remains the place for code/diff copy and `<code>` chrome exclusion.

The recipe: markdown for a rendered document, `<markdown>`'s own text for copy,
and `<text>`/element coordinates for anything a test must address — the internal
blocks are not addressable elements.

## Toast viewports (plan `183`)

`toast-lifecycle` reproduces the mechanism the shipped `ToastViewport` depends
on, without importing the components package (it is not on the integration
branch). The viewport is a plain `div` with `position: "absolute"`, `right: 24`,
`bottom: 24`, a transparent 120 px strip, `pointerEvents: "none"`, and one
painted card per toast with `pointerEvents` left at its default; it is the app
root's **last child**, because paint order is the only stacking model.

| Fact | Measured |
| ---- | -------- |
| placement | each card's right and bottom edge is exactly 24 px from the root's edges; the bottom-anchored stack grows **upward** (adding a card lifts the older ones) |
| pointer chain | a page control under the viewport's transparent strip receives the click (`under=1`) — flipping the viewport to `auto` blocks it. A **painted** card is hit-tested without `pointerEvents: "auto"`; removing the card's `auto` still passes |
| stacking | the viewport painted last covers a page control at the same coordinates: dismissing the bottom card leaves `behind=0`, while a click outside the box still reaches the page |
| queue | four pushes keep three, dropping the oldest; dismissing one reflows the rest with the same 8 px gap |
| focus | a toast pushed from the focused field's `onSubmit` does not move focus; `focusNext` reaches a dismiss button; Escape leaves the stack alone. A click focuses a plain `div` even with `tabIndex={-1}` — do not use a click to prove "no focus steal" |
| timers | a card's `setTimeout` is **real JS time** (the dispatcher clock does not move it): a 250 ms card dismisses while its 5 s sibling survives. The **frozen exit** is asserted on a **synchronous** click dismissal — still laid out at elapsed 0, gone after `fastForwardMotion(exit + 1)`. A frozen exit driven by a real timer is **not** a deterministic assertion point: the timer races a paint and `AnimatePresence`'s own re-render, and the leaving card can be lost even with the paint forced (plan `336`); the timer path asserts the queue, the sibling and the later removal only |
| removal evidence | use `bounds` (`null` after the exit). `getPaintedText()` can still report the removed card's title for that frame |
| a11y | `role="status"` + `aria-label="Notifications"` is an AccessKit `Status`; the dismiss control is a `Button` labelled `Dismiss`. There is **no live-region/announcement field**, so the static region label is all the runtime exposes |

Same caveat as every Tier 2 probe: this is the mechanism, not `@gpuixui/components`.
Mount the real `ToastProvider`/`ToastViewport` once that package is on the
integration branch.

## Collapsible sections (plan `186`)

`collapsible-height` measures the recipe an animated, state-preserving
Accordion/Collapsible needs. The shipped `CollapsibleContent` unmounts while
closed because its TODO assumed the body could not be measured; that premise is
false.

| Fact | Measured |
| ---- | -------- |
| measurement API | there is **no `onLayout`** in `@gpuix/native@0.10.0`. The route is `ref` → `PublicInstance.id` → `renderer.getElementBounds(id)` |
| first paint | a `useLayoutEffect` measure returns the content's natural **140 px at mount, while the body is already clipped to `height: 0`** — a `defaultOpen` section can animate on its first open with no flash |
| height tween | `motion.div` interpolates `height` exactly under the paused clock: 56 px at 80 ms of a 200 ms/140 px linear tween, 140 px at 200 ms. Read it through the following sibling's `y` — the motion surface has no `testId` |
| the clip | content stays laid out at 140 px, but a click at a collapsed button's own painted centre does **not** activate it; deleting `overflow: "hidden"` lets the same click through. No `pointerEvents` guard is needed |
| state | a draft typed while open survives collapse, re-open and a second collapse — the content is never unmounted. Unmounting it fails the first check (`collapse-content` is absent) |
| completion | `onMotionComplete` fires once per height tween (`1`, `2`, `3`), with no stale completion; the measured target is stable across the cycle |
| disclosure state | `role="button"` + `aria-label` + `aria-expanded` is an AccessKit `Button` whose `expanded` follows the section (`true` open, `false` closed) |
| keyboard | `Enter` on key down re-opens through the same toggle (the trigger is a focused tab stop) |

The recipe: keep the body mounted under an `overflow: "hidden"` motion
container, measure the content `div`, animate the container's height, and
re-measure on open and on a width change — a fixed-height probe cannot measure
text rewrap while collapsed. The remaining limitation is the motion wrapper's
missing `testId`/`role`/`aria-*` (plan `157`).

## Nested layers (plan `187`)

`nested-layer-dismiss` measures the event model behind the shipped dismiss
stack. It nests two `<anchored>` layers in one React subtree — the shape a
submenu uses, unlike `modal-focus-trap`'s sibling layers.

| Fact | Measured |
| ---- | -------- |
| payload identity | one `x` reaches the inner and the enclosing `onKeyDown` (`keyHandlers=2`) as **two distinct objects** (`keyObjects=2`). The `WeakSet<EventPayload>` model is false; the field claim is right |
| the identity stack | written exactly as `dismiss-layer.ts` writes it, one Escape closed **both** layers (`last=parent-escape`). With the field claim, one Escape closes the submenu (`sub=0`, `parent=1`, `last=sub-escape`) and the second closes the parent |
| the descendant press | clicking a submenu row fires the **parent** surface's `onMouseDownOutside` (`outsideParent=1`) and not the submenu's own (`outsideSub=0`) |
| outside coordinates | `event.x`/`event.y` are present (`coords=yes`), so containment against `getElementBounds` is computable. With it the row activates (`subClicks=1`); without it the submenu closes on the press (`subClicks=0`) |
| placement | a row-derived `<anchored position>` is exact inside the parent layer (right edge + 4 px, same `y`, ±1 px). A raw `<anchored side align>` anchors to the **parent's** box, not the trigger's |
| the tick boundary | two identical outside presses in one synchronous tick are indistinguishable (the claim's microtask reset needs a task boundary); a real second click has one, and `Effect.yieldNow` models it |

The action for `@gpuixui/components`: `dismiss-layer.ts` must use the field claim
`event-claim.ts` already implements. The submenu's containment branch is correct
as shipped.



## The live window run (plan `189`)

The 82-scenario suite runs on the offscreen `TestRenderer`. `smoke:live` opens
a **real GPUix window**, mounts the shipped `App`, and drives it through
`@gpuix/native/automation` — `getByTestId`, `click`, keys, the wheel and
`screenshot`. It reports through the same `Smoke` model and exit codes, so a
live pass is citable evidence rather than a second log format.

| Scenario | What it asserts in the window |
| -------- | ------------------------------ |
| `live-shell` | `app-shell` fills the 1100 × 720 window; clicking a sidebar entry mounts that view and paints its own text; `Enter` on a focused entry switches the stage |
| `live-input` | a click focuses the field, `h i` reaches `onChange` (`value=hi`), and `Enter` reaches `onSubmit` (`submits=1`) |
| `live-scroll` | `scroll-container` starts at offset `0`, a `-200` wheel scrolls it down, and `onScroll` reports `delta=-200` |
| `live-panel` | a paced divider drag grows the split `320 → 400`, `onResize` reports it, and pane A's measured width agrees within 2 px |
| `live-motion` | the paused clock collapses a 240 px sidebar exactly: 96 px at 80 ms of a 200 ms linear tween, the inner pane stays 240 px, `onMotionComplete` fires once per tween, and a leaving toast stays painted until the exit settles — 25 checks. **`onExitComplete` fires twice live for one exit**; treat it as idempotent |
| `live-overlay` | the modal trigger opens a painted 280 × 236 surface centred in the window, and Escape closes it (`open=false last=escape`) |
| `live-focus` | focus enters the modal (`modal-content`), Tab and Shift-Tab walk `a → b → open-popover → close` and wrap back to the content, Escape returns focus to the trigger, and a nested popover's Escape closes only the popover and returns focus to its opener — 18 checks |
| `live-selection` | a real pointer drag selects three text nodes; a drag anchored in `userSelect: none` selects nothing; a crossing drag keeps both sides and skips the chrome; `clearSelection` and a click empty it — 9 checks |
| `live-context-menu` | a right click opens a pointer-placed menu (its painted box equals the click point within 1 px); a disabled row is inert, Copy runs and closes, outside/Escape dismiss, a child click bubbles, and a right click inside a **scrolled** container still places the menu at the pointer — 31 checks |
| `live-docking` | dragging the Notes tab onto the editor pane's right edge prunes it from the left group, creates `panel-1` and splits the target (`split-1=`) |
| `live-float` | a paced drag from the Alpha tab, released outside the dock, opens the floating panel at the release point within 1 px; its title bar drags it to exactly `(200, 60)`; its tab takes focus, Escape closes it and returns focus to `float-tab-beta`; the close button drops the reopened tab — 28 checks |
| `live-primitives` | the **shipped** `Button` activates, a disabled `Button` refuses, and the `Toggle` reports `pressed=true` |
| `live-table` | a painted `<virtual-list>` row is hit-testable (`r3`), the list scrolls to `[0,-300]`, the selection survives, and `getListScrollTop` reports the logical anchor exactly — `[0, 0, h]` at rest, `[120, 0, h]` after `scrollToItem(120)` |
| `live-preview` | the **first live hover** scenario: a real mouse move over the trigger opens the card (`open=true`), the pointer reaches the card body and the fire-time presence check keeps it open past the 200 ms grace close (`closes=0`), a control inside the hover-opened card clicks, leaving closes through the last hovered child (`reason=action`), a re-enter inside the delay cancels, and a final leave closes from the trigger (`closes=2`). The card enter and trigger leave arrive in **one batch** live, so the `prev`/`last` readout collapses them — the append-only log keeps both |
| `live-highlights` | the mounted find probe paints its four document washes with window-space rects (each inside its line), clearing removes them and restoring repaints, `search-next` moves the active match to index 1, and a jump to row 90 shows exactly one active row wash — document-wide `matchIndexOffset` numbering in a real window |
| `live-scroller` | the message scroller opens at the latest message, a pinned append follows to the new max scroll, a real `400` wheel unpins it and paints the affordance, an append while unpinned leaves the anchor and counts unread, jump-to-latest re-pins, two streamed rows keep the tail on the viewport bottom, and the 3-row history has nowhere to scroll — 45 checks. An element that is **retained but unpainted** has no bounds: the protocol answers `NotFound` and the host maps exactly that to `null` |
| `live-restore` | the shipped `workspace-restore` probe in a window: a paced divider drag paints 320 → 400, a tab activation makes `active=two`, `scrollToItem(120, 16)` anchors the list, and save → reset → restore re-applies the split, the tab and the anchor exactly (`[120,16]`, row 120 painted, row 0 absent). Native focus is **not** restored, and a click on row 121 focuses the restored list |
| `live-table-sort` | the shipped `table-select-sort` view: a real wheel moves the body (`y ≈ -200`), `table-sort` makes `table-first` read `Item 199` (the reordered row the automation tree points at), a click selects `r199`, and the selection survives a re-sort back to `Item 000` |
| `live-tier2-foundation` | the catalogue's foundation view in a window: the Card stack and 32 px avatar paint, the alert dismiss and empty-state action run, a click selects a List row and `Down`/`Enter` move and select while skipping the disabled row — 18 checks. A live key must follow the click's React commit (`settle`), or it moves from the previous active row |
| `live-tier2-navigation` | the catalogue's navigation view: a click swaps the Tabs panel, a later click selects Settings, Accordion single mode replaces/composes a section and Enter closes it, Collapsible opens and Enter closes, Breadcrumb clicks and Pagination page/Next/Prev run — 17 checks. **A live click focuses a tab natively without running React's `onFocus`**, so an arrow after a click starts from the first tab (the Tabs fix is a cross-team task) |
| `live-tier2-choice` | Popover opens below its trigger and Escape restores focus, a live editor types/submits/clears, a Combobox ranks and selects, the DatePicker month grid picks a day and clears, and both TimePicker segments compose one value — 13 checks |
| `live-tier2-forms` | the schema's message paints on an explicit validate, a disabled input refuses a live edit, an invalid submit reports nothing, a valid one paints the decoded value, and a pending form locks submit — 14 checks |
| `live-tier2-editing` | the InlineEdit swap focuses a real editor and a coordinate click + `cmd-a` types, Enter commits and Escape discards; a typed comma adds a tag; a chord records and clears; `@` + arrow + Enter inserts a mention; the Drawer opens flush right at 400 × window height, traps Tab, returns focus on Escape and closes on a **window-coordinate veil click** — 24 checks. React's `onBlur` does not run live, so the blur-commit path stays headless |
| `live-tier2-flow` | the stepper's control moves the value, the timeline stacks, a tick and an expiry repaint the countdown, the shortcut glyphs are explicit, the carousel steps/clamps/home, a swatch and `abc` normalise the colour, and the nav opens one panel by pointer and keyboard with Escape, focus return and an outside press — 24 checks |
| `live-key-routing` | the three key paths in one tree: the focused element, **every** ancestor (focusable or not) and the app-level window handler all receive a key (`inner=1 middle=1 outer=1 window=1`); `autoFocus` and a click focus natively **without running React's `onFocus`** (`innerFocus=0 outerFocus=0`); delivery follows focus; and `cmd-k` reaches the window handler with `modifiers.cmd` — 23 checks |

Artifacts: `.artifacts/live-report.json` and one real-window PNG per scenario
under `.artifacts/live/` (gitignored).

Two rules the runner needs, both measured:

- the renderer must be built with `createRenderer()`, not `new GpuixRenderer()`
  — the bare constructor has no React event callback, so the window paints but
  receives no input;
- the automation protocol has **no frame boundary**, so every scenario settles
  (~120 ms) or `waitFor`s the element a click should have mounted before it
  reads. `simulateClick` returning is not the same as React having committed.
  The same rule paces a drag: six moves sent back to back left the split at
  `320`, and the same six one frame apart took it to `400`.

A third rule came out of the Tier 2 catalogue and is a **component constraint**,
not a harness quirk: `autoFocus` and a real pointer click focus an element
natively **without running React's `onFocus`**. `live-key-routing` measured it on
two plain divs (`innerFocus=0 outerFocus=0` after both a click and `autoFocus`).
Plan `347` measured the **blur** twin: a live click that moves native focus away
does not run React's `onBlur` either, so a component whose commit path is
`onBlur` (InlineEdit) keeps editing after the user clicks away.
A component that tracks "the item the user is on" only in `onFocus` therefore
loses a click. `List` is correct because its click calls its own focus routine;
`Tabs` is not, and an arrow after a click restarts from the first tab — that is
the one live-only defect the catalogue found, recorded as a components task.
Key delivery itself is fine: a key reaches the focused element, bubbles through
**every** ancestor (focusable or not) and finally reaches the app-level window
handler, so an ancestor handler is a valid component path and `useWindowKey` is
the global-shortcut path. The live runner now wires `useWindowKey` (plan `345`).

Exit codes match the headless suite: `0` passed, `1` a failed check, `2` no
window (CI, a locked session, a missing binding) — and no report is written on
`2`. The window appears for a few seconds and takes focus while it runs; it is
opt-in for that reason.

What it cannot assert: **colour and the accessibility dump**. The live
automation tree carries `id`/`type`/`testId`/`bounds` and **no `style`**
(measured: a styled probe div reports only its box), and `GpuixRenderer` has no
a11y method — `getA11yTree` exists on `TestRenderer` alone. Those two stay
headless.

Everything else the protocol lacks, the **renderer** answers, because the runner
owns the renderer it created: `live-focus` reads `getFocusedElementId` and maps
the id through the automation tree (plan `190`); `live-selection` uses the
protocol's selection verbs with a real paced drag (plan `191`); and
`live-highlights`/`live-table` read `getPaintedHighlights`, `scrollToItem` and
`getListScrollTop` straight from the renderer (plan `197`). Focus entry, the
modal Tab/Shift-Tab trap, focus return, a nested popover's Escape, a real drag
copy, a painted find wash and an exact virtual-list anchor are therefore
measured **in the window**, not only headless. A synthetic `tab` still does not
traverse in a live window (measured: `a`, `tab`, `x` left the field reading
`value=ax` in plan `189`) — traversal is component code (`focusNextWithin`).
`live-motion` proves the live clock controls a tween and that a removed
surface's `bounds` becomes `null`, but `onExitComplete` fires **twice** there
for one exit, so the exit check asserts removal (and that at least one
completion fired), and the docs rule is that the handler must be idempotent.

## Text entry (plan `188`)

`text-entry` measures the editor **inside** a field — the contract every search
box, inline edit, tag input and date field depends on. Caret, selection and
deletion turn out to be the native editor's, so a component must not
re-implement text handling:

| Fact | Measured |
| ---- | -------- |
| typing | one `onChange` per character, each carrying the accumulated value |
| caret | `left` twice then `x` gave `axbc`; `home`/`end` move to the line start/end |
| selection | `shift-left` twice then `q` replaced exactly the selected run (`0axq`); `cmd-a` then `w` replaced the whole value (`w`) |
| deletion | Backspace removes one character, and is a safe no-op on an empty field |
| `readOnly` | keeps focus and value and fires **no** change event; without it the same keys fire two |
| placeholder | exposed in the dump **and** painted, and it stops painting once text exists |
| fixed width | 40 characters left the field at `158` px before and after; `width: "auto"` also fills rather than grows |
| textarea autosize | `minRows={2}` paints `64` px, four lines `116`, six lines `168`, seven lines `168` — it grows 26 px per line to `maxRows`, then scrolls |

Two limits worth stating rather than hiding. **The accessibility `value` is the
authored prop, not the live editor**: an uncontrolled field reports no value
after typing, so a test observes `onChange` and `getPaintedText`. And there is
**no masked entry surface** — `InputProps` has no `type`, `secureTextEntry` or
mask, so a typed secret is held, announced and painted in clear. A password
field is an app-owned OS prompt, not a component; the shipped library must not
pretend otherwise.

## The shipped Tier 2 catalogue (plans `330`, `344`)

Five scenarios mount `@gpuixui/components` through its **published root**, the
same way a consumer does, and drive it with native input. They are the end-to-end
half of the package's own behaviour tests and the source of the docs' native
evidence.

| Scenario | What it drives | Checks |
| -------- | -------------- | ------ |
| `tier2-dialog` | `Dialog`/`ConfirmDialog`: open, centre, focus entry, Tab trap, Escape and focus return, Cancel-first, confirm reports once | 24 |
| `tier2-menu` | `DropdownMenu`/`ContextMenu`: click/right-click open, disabled row skipped, Enter once, placement, dismissal | 18 |
| `tier2-toast` | `ToastProvider`/`ToastViewport`: push, 16 px inset, stack order, action once, a real 300 ms timer | 25 |
| `tier2-foundation` | Card's three variants, Badge token paint, Avatar initials/size/`Image`, Alert role + dismiss, EmptyState action, List selection | 42 |
| `tier2-navigation` | Tabs swap + arrows, Accordion single mode, Collapsible, Breadcrumb landmarks, Pagination window | 55 |
| `tier2-choice` | Popover, SearchInput, Combobox, DatePicker, TimePicker: open, rank, select, clamp, clear | 59 |
| `tier2-forms` | Field validation, Fieldset disable, Form messages/pending | 34 |
| `tier2-editing` | InlineEdit swap/commit, TagInput add/remove/cap, HotkeyRecorder, MentionInput, Drawer edge/focus/trap | 48 |
| `tier2-flow` | Stepper, Timeline, Countdown, KeyboardShortcuts glyphs, Carousel stepping, ColorPicker, NavigationMenu | 59 |

Three consumer-path rules hold across all five:

- the renderer reports **one root host element** — a provider whose children are
  siblings at the root paints nothing, so each view has one frame element;
- the package is compiled by the consumer (`tsconfig.vendor.json`) because its
  tsconfig maps the JSX runtime to a `.d.ts` that `nub` cannot execute;
- an accessibility node carries its `author_id` only when the consumer authors
  `aria-id`. A role paints without one (`Image`, `Alert`, `Tab`), but a probe
  cannot address it by id. Plan `344` measured all three; the runtime maps
  `role="img"` to AccessKit `Image` even though the plan-160 table did not list
  it.

`tier2-foundation` and `tier2-navigation` also run in a real window as
`live-tier2-foundation` and `live-tier2-navigation` (plan `344`). That run
measured the key-delivery limit described above; the click-driven interactions
all hold live.

## The cost model (plan `302`)

`scale-cost` reads the renderer's own two counters — `getRetainedElementCount`
and `getSyntaxCacheStats` — so the library's virtualized data and highlighted
text have a measured cost, not an assumed one.

| Question | Measured |
| -------- | -------- |
| Does `<virtual-list>` window *retained* host nodes? | **no.** 2,000 rows retain 6,012 nodes; 100 rows retain 312; the 1,900-row delta is exactly 5,700 = **3 host nodes per row** (div, text, runtime text node). Only ~15 rows paint. Window at the app level when rows can grow unbounded |
| Does scrolling leak or recycle nodes? | neither: the count after `scrollToItem(1000)` is identical to the count before it, and jumping back and forth leaves no residue |
| Do two identical `<code>` blocks parse twice? | no: **one miss + one hit**, one cached document |
| Does a theme switch reparse? | **no** — the cache key excludes colour; all three counters are unchanged after switching to the light palette |
| Does an idle frame do anything? | no: an unchanged element short-circuits before the cache is even consulted |
| What does editing the source cost? | exactly one miss + one hit + one document per changed document; the previous documents stay cached |

Two rules for components: keep a code string referentially stable across
renders (an inline template containing a render counter defeats the cache), and
do not assume virtualization makes an arbitrarily large model free — it
windows paint, not host retention.

## Evidence on this host

The suite is **82/82 green** here (`exit 0`, 2500 checks):

```
82/82 scenarios passed · capabilities: layout=verified text=verified
input=verified focus=verified overlay=verified modal=verified
floating=verified select=verified combobox=verified tooltip=verified
a11y=verified scroll=verified panel=verified motion=verified
virtual-list=verified table=verified tree=verified log=verified
theme=verified workspace=verified docking=verified command=verified
content=verified drag=verified selection=verified menu=verified
components=verified search=verified terminal=verified chart=verified
toast=verified grid=verified data-grid=verified columns=verified
chrome=verified
layers=verified scroller=verified scale=verified tier2=verified
replace=verified grid-layout=verified typography=verified
inspector=verified editor=verified
```

The measurements that shaped the scenarios (full list: plan `140` §4):

| Capability | Measured on 0.10.0 here |
| ---------- | ----------------------- |
| layout, text, input | exact bounds; `getAllText`/`getPaintedText`; `onChange`/`onSubmit` |
| pointer entry | a click places the native editor's caret at the nearest glyph (left edge prepends, middle lands inside, right edge appends); a press-move-release **selects** the run and typing replaces it; a plain click **clears** the selection; `shift`-click **extends** it; Enter inserts a newline in a textarea (32 → 64 autosize) and `Up` returns to the previous line |
| typography | an explicit `lineHeight` is exact (30 → 60 for two wrapped lines); the default line box is ~1.6× the font size (12 → 19.5, 16 → 26, 24 → 39); `fontWeight` widens the run; a `<text>` block fills its parent. **`textAlign` is a no-op** (`left`/`center`/`right` all leave the glyph run at the block edge) — `alignSelf` in a column flex or a narrower width in a `justifyContent` row is the working route |
| grid layout | equal tracks split a width to the half pixel (`93.5/93/93.5` in 300 with 10 px gaps); explicit rows split a fixed height and stretch an unsized child, but a declared height wins; auto rows follow the tallest child; **default and `zero` `gridColumnMin` are equal**, `min-content` fills with unequal tracks, `max-content` leaves the remainder unused; nested grids resolve against their cell; an oversized child **overflows** its track; `justifyContent` centres content-sized tracks; a fixed-height wrapping row **stretches its line boxes** unless it sets `alignContent: "flex-start"` (measured 104 → 38) |
| focus | **`onFocus`/`onBlur` fire** (0.5.1 never delivered them). `autoFocus` takes native focus without dispatching `onFocus`; a synthetic `"tab"` reaches `onKeyDown` but does not traverse in the `TestRenderer` — `focusNext`/`focusPrevious` do. **Overflow:** a clipped tab is still a tab stop and focus does not reveal it (`tab-strip-focus`) |
| overlay | the `<anchored>` paints no surface of its own, so `onMouseDownOutside`/`onKeyDown` go on the **content div**; the popup takes focus on open and Escape reaches it |
| modal | `useGpuix().renderer` is the programmatic-focus path: `focusElement` moves native focus from component code, `getElementBounds` is the existence check before returning focus, and `focusNextWithin`/`focusPreviousWithin` cycle `content → a → b → open-popover → close → content` without leaking. A nested popover's Escape closes only the popover; a second Escape closes the modal |
| floating | `<anchored side align gap>` is exact for `side`, `gap` and `align="start"`/`"end"` (`bottom` = `anchor.bottom + gap`, `right` = `anchor.right + gap`). **`align="center"` is off by half the panel on both axes** (it ends the panel at the anchor's centre line), and **`fit="snap"` clamps to `window − snapMargin` without flipping**, so a bottom-side menu can end up over its trigger |
| popups | Select and Combobox open, commit and close under synthetic input, including native keys after `autoFocus`; Select returns focus to its trigger on every close. `nativeSimulateMouseMove` delivers enter/leave, so a hover tooltip is measurable; its close is a JS timer, not the GPUI clock |
| a11y | the AccessKit dump maps every typed ARIA token to a role; names come only from `aria-label`; CheckBox/Switch have no checked state; the tree follows the painted virtual window |
| docking | the surface's window rectangle is read from component code (`ref` → `renderer.getElementBounds`), and every model-derived pane box matches; an absolute drop bar resolves to its nested `position: "relative"` pane and paints the palette's `primary`; a captured tab drag survives indicator re-renders and applies one drop; edge drops split (new group secondary on right/bottom, primary on left/top), a centre drop merges; an emptied group prunes and its split collapses; **every split needs `key={node.id}`**; a recursive layout restores exactly through a keyed remount; AccessKit exposes `Region`/`TabList`/`TabPanel`/`Tab`/`Splitter` |
| content | `<svg>`/`<img>`/`<diff>` are retained **and** painted (bounds fire from `on_painted`); `<canvas>` is retained but renders nothing and drops its children; `setImagePixels` uploads a bitmap through the ref |
| drag | capture owns every move and the up; hover is frozen during the drag; the gesture ends in a click on the source; a drop on a handler-less element still clicks; `onFileDrop` carries paths and coordinates |
| drag autoscroll | the runtime does **not** scroll a held drag at an edge; component code scrolls with `renderer.scrollTo` on each held move, keeps the capture and the up, and derives the drop index from the pointer and the live offset |
| selection | cross-element selection joins with newlines; `<code>`/`<diff>` copy is chrome-free; an anchor inside `userSelect: "none"` selects nothing; a click selects nothing |
| menu | a right click is `onAuxClick` + `isRightClick` (no `button`, no `onClick`); `<anchored position>` is exact at the pointer, even inside a **scrolled** container (no offset, no clipping); `shift-f10` opens and Escape returns focus |
| hierarchy | a flattened tree inside `<virtual-list>`: 16 px per depth, 8 ↔ 48 rows on expand/collapse, roving focus moves native focus, the focused row stays painted outside the window |
| scroll into view | `focusElement` reveals a virtual row by itself; `scrollToItem`/`scrollIntoView` reach exact anchors; `getScrollOffset` **saturates** on a virtual list, `getListScrollTop` is exact |
| scroll | the wheel **works**; `deltaY` is negative to scroll down (the opposite of the DOM) |
| horizontal scroll | `overflowX: "scroll"` pans; `deltaX: -240` → `x = -240`; a vertical wheel leaves a horizontal-only strip at the same `x`; a clipped tab **keeps painted bounds**; `scrollIntoView` reveals it and saturates at `-461`, but the near-end reveal stops at `x = -5` (clamp it); `renderer.scrollTo(id, -400, 0)` is exact |
| panel | pointer capture + inclusive clamp. **Nested (`panel-nested`)**: `dy` drives a vertical split (`180 → 228`), a nested inner drag (`300 → 360`) leaves its parent at `228`, a collapsed sidebar paints width `0`, arrows resize the focused divider by 16 px, and the divider is an AccessKit `Splitter` whose size rides on `aria-valuetext` |
| virtual-list | retains 5 000 rows but **paints ~9**; `getPaintedText` is the window |
| table, workspace | row click/sort/keyboard, column drag; a virtualized table of 500 rows paints ~9, a painted row is hittable and its selection survives scrolling out and back; tab drag between panes, split resize |
| virtual table | `onVisibleRange` **lags the painted window by one gesture** — after two wheel gestures the painted rows were `32–40` while the range read `16`; an index-driven feature must use the painted rows as the current window |
| tree | `paddingLeft` indents exactly (16px per depth); expand/collapse repaints the subtree; a clicked row takes native focus and receives arrow keys. Focus movement from component code is measured separately (`modal`), so a roving-tabindex tree can use `renderer.focusElement` |
| log | bottom-anchored `<virtual-list>` starts at the tail and re-anchors on appends; `bottom` alone and `top` + `followTail` alone both anchor at the bottom. Scrolling up and appending does **not** snap back — a follow toggle is app state plus a scroll |
| theme | `TestElement.style` reports `backgroundColor`, `fontSize`, `fontFamily` and `boxShadow` verbatim, including 8-digit `#RRGGBBAA`; a provider re-render repaints every swatch |
| components | the shipped `@gpuixui/primitives` mount and behave in the runtime through the token theme: click/Enter-down/Space-up activation, a focus ring that the component merges and drops, controlled `Input` edits plus `onSubmit`, `Checkbox`/`Switch` state on `aria-valuetext`, the themed `Select` commit/dismiss, `Slider` arrow steps, `Progress`/`Meter` value text, a painted `Skeleton`, and a hover `Tooltip`. `simulateKeystrokes("space")` delivers no key up, so the harness now exposes `keyDown`/`keyUp` (plan `168`) |
| window key | the app-level `render({ onKeyDown })` handler runs after the focused element's `onKeyDown`, with `event.modifiers` set — the command-palette path |
| search | `highlight`/`getPaintedHighlights` paint window-space boxes; a nested declaration replaces its ancestor; soft wraps paint one box per row; a surrogate-split range is refused; `<code>` is searched by query, not ranges; a virtual row's `matchIndexOffset` numbers matches document-wide |
| search and replace | an `<input>`/`<textarea>` value is **painted but never washed** (`matchCount=0`), while a `<text>` sibling under the same query washes — so a replace bar needs a rendered preview or a context list. A document mutation re-washes and recounts; replacing one of five matches leaves the cursor at the same index (now the next match); replace-all clears the count; a **count-preserving** rewrite (`error` → `ERROR`) moves the washes with **no** `onHighlight` event; a longer/shorter replacement shifts downstream offsets by exactly `+1`/`-2`; `<code>` re-highlights by prop. A component-set value repaints an editor, but the **caret moves to the end** of the rewritten sentence, and there is no `setSelection` to put it back |
| shell | a flex child needs `minHeight: 0` to scroll; without `overflowY` the list is not a scroll container and its last row is unreachable. **Selection:** clicking an entry mounts its view and paints the accent active state; Enter (down) and Space (up) switch entries; the light palette repaints the shell and keeps the selection. **Harness:** each scenario mounts under a keyed Fragment, or consecutive `<App>` scenarios share Shell state and the sidebar scroll offset |
| toast | `position: "absolute"` + `right`/`bottom` is exact and bottom-anchored; the viewport's `pointerEvents: "none"` lets a control under its strip take the click (the cards do not need `auto`); paint order covers the app; `role="status"` is an AccessKit `Status`; a toast does not steal focus; a per-toast JS timer is real time and its frozen exit needs a dispatched frame first; removal is a `bounds` check, not painted text |
| chart | bars from `div`s keep exact geometry/colour and hit-test; `<svg source>` is an **alpha mask tinted by one `color`** (one layer per series); SVG text/children are painted/retained but not addressable; `<img>` SVG data URLs are the full-colour path (linear + radial gradient, distinct fills) |
| markdown | `<markdown>` paints GFM blocks as addressable text; a crossing drag copies the document; a coordinate click on a link fires `onLinkClick`; children are retained but unpainted; one named `Article` node, with no per-heading nodes |
| inspector | Enter in a focused `<input>` is the field's `onSubmit` (not a bubbled key); a row editor's draft survives a virtual-list scroll and the committed model repaints it on return; a 96 px label column plus an 8 px gap positions the editor; an inspector edit resizes a rendered surface outside the list |
| chrome | a 24 px status bar stays pinned while two panes scroll independently; a 380 px toolbar keeps its clipped trailing action addressable and reveals it with one `scrollTo`; a breadcrumb collapses its middle and each crumb is a focusable `Link` |
| columns | a header-cell handle drives per-column width state; the virtual rows, the frozen column, the row width and the pan maximum follow within 1 px; a shrink clamps the live offset at once; a handle on the cell boundary loses its centre click to the next cell; the anchor and selection survive a resize; `Home`/`End`/arrows clamp |

`legacy-probe/` keeps the 0.5.1 measurements as historical hardware evidence
(`./legacy-probe/run.sh probe`); they never set a component status.

## Structure

```
src/main.tsx             the dev entry: preflight, then one render()
src/app.tsx              the shell: palette switch, sidebar = registry, stage
src/palettes.ts          the three built-in palettes the shell and gallery share
src/ui.tsx               Readout / Panel / Pressable / … reading useTheme()
src/types.ts             PlaygroundScenario = SmokeScenario + view
src/panels/resize.ts     pure resize math (nextSize, clamped)
src/panels/split-pane.tsx the pointer-captured divider
src/panels/dock.ts      the docking model: tree, geometry, drops, JSON boundary
src/panels/dock.test.ts the pure docking rules
src/scenarios/*.tsx      one view + one steps effect per capability
src/scenarios/theme.tsx  the token gallery (colour roles, type, ring, shadow)
src/scenarios/primitives.tsx the shipped Tier 1 components (actions, fields, display)
src/scenarios/primitives-advanced.tsx choice and entry controls (radio, rating, number, OTP)
src/scenarios/theme.tsx  also the platform type-style cycle (`theme-platform`)
src/scenarios/shell.tsx  mounts the real App: sidebar scroll, selection, keys, palette
src/scenarios/virtual-table.tsx a 500-row table inside <virtual-list>
src/scenarios/tree.tsx      indentation, expand/collapse, arrow keys
src/scenarios/log-viewer.tsx bottom-anchored virtual list (tail, appends)
src/scenarios/modal.tsx     focus entry, Tab trap, focus return, nested Escape
src/scenarios/floating.tsx  side/align/offset placement and the window snap
src/scenarios/popups.tsx    Select, Combobox and Tooltip in the runtime
src/scenarios/a11y.tsx      the AccessKit dump: roles, names, states, window
src/scenarios/surfaces.tsx  svg, img (fallbacks, data URL, ref upload), diff, canvas
src/scenarios/drag-targets.tsx capture, hover during drag, file drops
src/scenarios/text-selection.tsx selection across text, code, diff and chrome
src/scenarios/context-menu.tsx right click, pointer placement, dismissal
src/scenarios/virtual-tree.tsx a 328-node flattened tree inside <virtual-list>
src/scenarios/scroll-into-view.tsx keyboard follow and the two scroll routes
src/scenarios/search.tsx  painted highlights, find controls and the virtual match index
src/scenarios/drag-autoscroll.tsx held edge scroll, capture and the drop index
src/scenarios/message-scroller.tsx pin/no-yank/stream/jump over a virtual list
src/scenarios/scroller-state.ts the pure anchor → distance-from-end → pinned rules
src/scenarios/scale.tsx     retained host nodes, the syntax cache and a theme switch
src/scenarios/tab-overflow.tsx horizontal pan, tab-strip overflow and reveal
src/scenarios/tab-focus.tsx     clipped tab stops and the roving strip
src/scenarios/panel-nested.tsx  vertical split, nested isolation, collapsible sidebar
src/scenarios/command-palette.tsx the window shortcut, a non-modal overlay, filtering and focus
src/scenarios/workspace-panes.tsx tabbed panes: visibility, tab order, nested scroll, resize
src/scenarios/docking.tsx   docking: drop zones, split creation, prune, restore
src/scenarios/layout-grid.tsx grid tracks, rows, column minima, overflow and wrap
src/scenarios/typography.tsx line height, weight and the alignment routes
src/scenarios/pointer-entry.tsx caret placement, drag selection and textarea lines
src/scenarios/grid.tsx      pinned grid chrome: sticky, one scroll source, column windows
src/scenarios/property-panel.tsx key/value rows and a native editor inside <virtual-list>
src/scenarios/property-model.ts  the inspector's drafts, commits, filter and bar maths
src/scenarios/property-model.test.ts the pure inspector rules
src/scenarios/grid-window.ts the pure window: clamp, visible range, keyboard reveal
src/scenarios/terminal.tsx  terminal grid: key path, scrollback, mono alignment, colour
src/scenarios/chart.tsx     chart: bars, one svg layer per series, SVG text, img gradients
src/scenarios/markdown.tsx  markdown: blocks, selection, links, children, a11y
src/scenarios/data-grid.tsx the panned virtual grid: frozen column, sort and filter
src/scenarios/column-resize-model.ts the pure column widths, offsets, row width and pan bound
src/scenarios/column-resize-model.test.ts the pure width rules
src/scenarios/data-grid-columns.tsx header-drag column resize over the virtual body
src/scenarios/app-chrome.tsx toolbar, pinned status bar and a breadcrumb trail
src/scenarios/multi-pane-editor.tsx two tabbed panes with scrolling code and a live split
src/scenarios/index.ts   the registry + scenarioProblems (pure integrity check)
src/window-key.tsx       the app-level window key bridge (useWindowKey)
src/smoke/run.ts         the CLI (preflight → mount each scenario → report)
```

## Deviations from plan `120`, and why

The plan was written against upstream `main`; the installed `0.10.0` API is
narrower. Each deviation is deliberate and measured:

- **The host adapter is synchronous, over `TestRenderer`** (`Native.createHost`
  in `@gpuixui/testing`), not the async `automation` `Locator`/`App`. Every
  renderer input and inspection method is synchronous and the `SmokeHost`
  contract is synchronous.
- **0.10.0 has no `getElementsAt`, `onLayout` or `onScrollChange`** (verified by
  grep over the installed `dist`). The overlay asserts the popup is *painted*
  and dismissible rather than hit-tested; the panel's `max` is a prop; the
  scroll scenario reads `getScrollOffset`.
- **Programmatic focus is a renderer call, not an instance method.**
  `PublicInstance` has no `focus()`, but `useGpuix().renderer` exposes
  `focusElement`, `focusNextWithin`, `focusPreviousWithin` and
  `getFocusedElementId`; `modal-focus-trap` measures that they work, so a
  component can move focus into a dialog and return it on close.
- **`style.gridTemplateColumns` is a column count**, not a CSS track list, so
  the (plan `130`) table probe uses flex rows with fixed widths instead.
- **`panels/resize.ts` + `panels/split-pane.tsx`**, not `split.ts` +
  `split.tsx`: two files with the same basename collide on emit (`split.js`).
- **`@effect/platform-node`'s `NodeFileSystem`/`NodePath`** write the artifacts
  (EF-21), not `node:fs`.

## What is proven here, honestly

- The eighteen core capabilities (including the modal contract, floating
  placement, the three published popups, the accessibility tree, the content
  surfaces, text selection, the detachable-tab float and the interactive hover
  card), the Tier 3/4 probes, the drag/file-drop probe, the app-level shortcut
  probe, the search-highlight probe, the drag-autoscroll probe, the
  command-palette probe, the tabbed-pane probe, the terminal-grid probe, the
  chart probe, the markdown probe, the toast-viewport probe, the shell probe,
  the pinned-grid probe, the virtualized data-grid probe, the
  collapsible-height probe, the nested-layer probe and the variable-row-height
  probe, the grid/wrap layout probe, the typography probe, the **inspector
  probe** (`property-panel`, plan `348`), the **column-resize probe**
  (`data-grid-columns`, plan `349`) and the **Tier 2 catalogue**
  (`tier2-dialog`, `tier2-menu`, `tier2-toast`, `tier2-foundation`,
  `tier2-navigation`, `tier2-choice`, `tier2-forms`, `tier2-editing`,
  `tier2-flow`; plans `330`, `344`, `346`, `347`)
  pass in real GPUix 0.10.0 on this host (82/82), with a written report and
  screenshots. The **message-scroller** probe
  (plan `300`) proves the chat/stream pin contract: the live anchor inside
  `onVisibleRange`, a follow on append and on a growing row, no yank while
  unpinned, jump-to-latest, the threshold and a short history. The
  **scale-cost** probe (plan `302`) reads the retained-node and syntax-cache
  counters: 3 host nodes per virtual row, no leak across jumps, a shared
  document for identical code, and no reparse on a theme switch.
  The **real-window** suite (`smoke:live`) is 33/33 — layout, input, scroll,
  panel, **motion**, overlay, **focus**, **selection**, **context menus**,
  docking, the detachable-tab float, the shipped primitives, a virtual table
  with its exact anchor, a painted **find** probe, a **live hover** card, the
  **message scroller**, the **Tier 2 choice and form families**, and the
  **multi-pane editor** — including the modal's
  Tab/Shift-Tab trap and focus return (plan `190`), a real pointer drag-select
  with `userSelect: none` exclusion (plan `191`), a paused-clock mid-tween
  frame (plan `192`), a pointer-placed menu in a scrolled container (plan
  `193`), a tab torn out into a floating panel (plan `195`), highlights plus
  `getListScrollTop` read from the renderer (plan `197`), a live hover card
  with its grace close (plan `199`), and the scroller's pin/no-yank/jump/stream
  path through the automation protocol (plan `301`), and a live inspector whose
  editor commits, scrolls out of and back into a virtual list, and resets
  (plan `348`), a live column drag that resizes the header, the virtual rows
  and the pan (plan `349`), and a live app shell whose status bar stays pinned
  while two panes scroll (plan `350`).
- The suite can fail: changing `panel-resize`'s expected delta `+80 → +81` makes
  it exit `1`, name the check, and report `panel=failed` (plan `140` §4).
  Pointing `swatch-background` at `card` does the same for the gallery
  (`swatch background: expected "#11141A", got "#191D25"`, exit `1`). Removing
  the Tab trap makes `modal-focus-trap` fail with
  `Tab moved focus [modal-content,modal-content,…]`, and removing the focus
  return fails with `expected "modal-trigger", got "none"` — both exit `1`
  (plan `155` §8). Hard-coding `side="bottom"` in the floating layer fails
  `side=right sits one gap right of the anchor: expected 326 ± 1, got 200`
  (plan `156` §8). A no-op `Select.onValueChange` fails with
  `expected … "open=false value=Beta", got "open=false value=none"`,
  `autoHighlight={false}` fails the Combobox commit, and replacing the tooltip
  hover with a click fails the open check — all exit `1` (plan `159` §8).
  Dropping `aria-label` from the probe button fails with
  `expected "Save", got "none"`, and dropping `aria-level` fails the heading
  with `expected 3, got 0` (plan `160` §8). Dropping `disabled` from the probe's
  delete button makes `disabled and loading buttons refuse activation` fail
  (`got "activations=4"`), and removing the primitives theme bridge makes
  `primitives-display` fail at its first check with
  `MissingThemeProviderError` — both exit `1` (plan `168` §8).
- The registry reveals a missing or duplicated capability (`scenarioProblems`,
  unit-tested).
- The resize arithmetic clamps inclusively (`resize.test.ts`).
- The CLI's unsupported path returns `2` without evaluating the suite
  (`run.test.ts`).
- The style snapshot refuses a payload whose property type changed, rather than
  coercing it (`smoke.test.ts`).

Not proven here: the verdicts use a **locally-built** binding (ADR 0003), not the
published binary; and detaching a tab into a new window is impossible (no
multiple windows).

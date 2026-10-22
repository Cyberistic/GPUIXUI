# apps/playground — the native GPUix playground

**Status: Phase B, implemented and verified** (plans `120`, `140`, `150`). One
app, five jobs:

1. **The playground** — a real GPUix window showing every scenario, so a human
   can drive each primitive by hand. The shell's palette switch paints the same
   `@gpuixui/tokens` themes the library ships.
2. **The native smoke runner** — the same scenarios exercised by synthetic GPUI
   input in a `TestRenderer`, producing `smoke-report.json`.
3. **The live window runner** — the probes a window can prove (focus routing,
   keyboard input, paint) driven through `@gpuix/native/automation`, producing
   `live-report.json` plus one PNG per paint state.
4. **The terminal-mode probe** — the same view rendered into a pty with
   `render(<App />, { terminal: true })`, driven through a real terminal's
   escape stream for a resize, a pointer press and a key, producing decoded
   frame PNGs (the capability record's *Terminal rendering* row had no probe
   before it).
5. **The evidence source for the docs** — scenario ids, readouts and screenshots
   are what `apps/docs` links to instead of faking a native preview.

The **registry is the single source of truth**: `src/scenarios/registry.ts`
owns each id, title and capability and imports nothing native, so `--list` and
the argument guard run on a host with no binding; `src/scenarios/index.ts` owns
the one `view`/`steps` implementation per id and is imported only after the
preflight. `Record<ScenarioId, ScenarioBody>` makes a missing implementation a
compile error. Each scenario is one capability, one view, one `steps` effect: the eleven
core capabilities (including the three theme-gallery scenarios, the modal
contract, floating placement and text selection), the Tier 3/4 probes
(`table-select-sort`, `table-column-resize`, `data-grid-fixed-header`,
`data-grid-frozen-column`, `virtualized-table`, `virtual-list-windowed`,
`virtual-list-rows`, `virtual-list-expand`, `virtual-list-prepend`,
`tree-view`, `log-viewer`,
`workspace-tab-drag`, `dock-reflow`, `docking-nested`, `drag-autoscroll`,
`search-highlights`, `tab-overflow`, `editor-surface`, `a11y-tree`), the
app-level
shortcut probe
(`window-key-shortcut`) and
the shell-navigation guard (`shell-navigation`), which mounts the real `App` and
proves its sidebar scrolls — the registry is longer than the window, so an
unreachable entry would be a scenario the app cannot open — and
`examples-mount`, which pages through every shipped example the docs quote.

The **live** registry (`src/live/registry.ts`) is separate and shorter: the
59 probes a real window can prove, of which fifteen mount shipped
`@gpuixui/components` (the dialog and its fade, the confirmation flow, the
field's validation, the menu,
the context menu, the toast system,
the command palette, the tabs, the list, the popover, the message scroller, the
combobox, the nested overlay stack and the modal focus rule), five mount
`@gpuixui/primitives` (the Input, Checkbox, Slider, Text and Tooltip), one more
mounts the runtime's own `Select` parts, and the rest prove the runtime itself
(focus, paint, fonts, placement, content surfaces, pointer capture, the window's
own wheel and size, a split pane, a virtual list, a paginated list's loading-row
restore, a dock's keyboard order, an anchored menu in a scrolled header, the
window's own backdrop, the app-level key handler, the app-level selection
handler, a field's hint and value ink, a configurable data grid, a generated
SVG pattern and a property inspector beside its preview).
`apps/playground` depends on `@gpuixui/components` for exactly that.

## Run it

```sh
nub run dev:playground              # from the repo root: opens the playground window
nub run --filter playground smoke   # the native smoke suite, headless
nub run --filter playground build && nub apps/playground/dist/live/run.js --list
nub run --filter playground build && nub apps/playground/dist/live/run.js --only focus-visible
nub run --filter playground build && nub apps/playground/dist/terminal/run.js  # the pty probe
```

`--only` is **repeatable** in both runners; with none, the runner selects every
scenario.

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

**Observe the code from the built CLI, not through `nub run`.** nub 0.9.6
collapses any non-zero child exit to `1`, so `nub run --filter playground smoke`
reports `1` even when the suite said `2`:

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js; echo $?
# -> 0 here (40/40 green); -> 2 on a host with no binding
```

Artifacts (gitignored, under `.artifacts/`):

- `.artifacts/smoke-report.json` — the schema-encoded report (`Report.reportJson`);
- `.artifacts/screenshots/<scenario-id>.png` — one frame per scenario with `--screenshots`;
- `.artifacts/live-report.json` — the live runner's report (same shape);
- `.artifacts/live/<state>.png` — one capture per state a live probe names.

Flags: `--list` (print the scenario ids, exit `0`), `--json`,
`--only <scenario-id>`, `--screenshots`, `--artifacts <dir>`. An unknown flag or
scenario id prints the usage line and exits `2` before the binding loads.

Nothing is written to `.artifacts/` on an unsupported host: exit `2` means there
is no evidence, and a stale report must never be mistaken for a fresh one.

## The binding on this host

The library targets `@gpuix/react@0.11.0` + `@gpuix/native@0.11.0`. GPUix
publishes **no `darwin-x64` binding**, so this Intel Mac has none by default and
the suite would exit `2`.

It is built from source instead: the blocking `xcrun metal` step is **optional**
— `gpui_macos`'s `runtime_shaders` feature compiles the identical shader source
through the OS Metal compiler at runtime, so the pinned Rust toolchain plus
Command Line Tools suffice. One script does the whole thing (idempotent):

```sh
sh apps/playground/scripts/build-native-binding.sh
```

It fetches the **pinned upstream revision** (the `@gpuix/native@0.11.0` release
commit; `GPUIX_REV=<sha>` overrides it for a deliberate bump) because the napi
surface is version-specific — a binding built from a different revision does not
satisfy the installed package. It installs Rust 1.97.1 and that revision's zed
tree under `.agents/slop/scratch/gpuix-build/` (agent state, gitignored), applies
`apps/playground/patches/gpuix-zindex.patch` (the binding's `StyleDesc.zIndex`,
which orders paint and hit testing among `absolute`/`fixed` siblings — plan
`530`), builds the cdylib with `runtime_shaders`, and drops it at
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
the runtime**. Four scenarios:

| Scenario | What it asserts |
| -------- | --------------- |
| `theme-color-roles` | every one of the 47 roles in `colorRoles` paints its exact value; the palette switch (dark → light → high contrast) re-paints every swatch and the three colour sets differ |
| `theme-type-and-shadow` | every type role in `typography` reaches the runtime through `textStyle` (size and family, with `code` on the mono family); `focusRing` paints the zero-blur spread ring; `elevationShadow(theme, "md")` paints its blur, offset and colour |
| `theme-platform` | one row per platform through `platformTheme`: the runtime reports each platform's mono family (`Menlo`, `DejaVu Sans Mono`, `Consolas` — three distinct families) while every platform keeps `.SystemUIFont` for UI text, plus that platform's `primary` fill, its own `lg` radius and an `md` control at its density (28 / 36 / 32px) |
| `theme-look` | one row per authored look through `retroTheme`: Luna and Aero each paint their own mono family (`Lucida Console`, `Consolas`), `primary` fill, `lg` radius (3 and 6 against the base's 8) and an `md` control at their density (28 / 32px) |

The checks read the **runtime's own style report** (`SmokeHost.paintedStyle`,
decoded at the adapter boundary), not a screenshot, so a token that never
reaches the renderer fails by name. The role lists are derived from `colorRoles`
and `typography`; a new token cannot go untested. The gallery is the native
preview source for the docs' Theming page.

`theme-platform` paints the three non-default platforms because `default` is the
house identity the other two scenarios already cover. Its negative control,
measured: painting `base.radius.lg` (8) instead of the platform's own `lg` fails
`darwin large radius: expected 10, got 8`, exit `1`; restored, green. The
`primary` fill and the `md` control height are asserted the same way, so a
`platformTheme` that returned its base would fail all three platforms on colour
and two on density.

`theme-look` holds the authored looks to the same bar. Its negative control is
the base `lg` radius: painting `base.radius.lg` fails
`luna large radius: expected 3, got 8`, exit `1`. Both looks are sampled, so a
`retroTheme` that returned its base would fail on the radius, the `primary` fill
and the mono family; Luna's compact density (28) also separates its control
height from the base's comfortable 32.

Two honest notes:

- The ring check is a **style** proof. Focus delivery itself is
  `focus-traversal`; 0.10.0 had no `:focus-visible`, so a component owned the
  state. 0.11.0 declares `focusVisible`, and plan 053 owns the outline
  migration; this gallery keeps asserting the shadow the library ships today.
- `tsconfig.check.json` and `tsconfig.build.json` map
  `@gpuix/react/jsx-runtime` for type-checking. `@gpuixui/tokens/react` is
  React-only, so its JSX must resolve against React's runtime types, and it
  cannot see this app's `@gpuix/react` install. At runtime nub transpiles the
  entry correctly; the mapping is typecheck-only and `tsconfig.json` (which nub
  reads) stays clean. The durable fix belongs in `packages/tokens` and is
  tracked in `TODO.md`.

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

## Text selection

`text-selection` mounts the shipped `Text` primitive twice and drags across each
line with the renderer's own `dragSelect`. It is not a pointer `drag`: selection
listeners are registered during **paint**, so a hand-rolled down/move/up with no
flush between the steps selects nothing, and a probe built that way would pass or
fail for reasons unrelated to `Text`.

| Line | `selectable` | Result |
| ---- | ------------ | ------ |
| `hello selectable world` | yes (`userSelect: "text"`) | the whole line reaches `getSelectedText()` |
| `chrome must not select` | no (the default) | the same drag selects nothing, and `clearSelection` drops the previous one |

So a log viewer, message row or code block can be copied by dragging, while a
toolbar or gutter cannot be swept into the clipboard. Negative controls,
measured: marking the chrome line `selectable` fails
`a drag over the chrome line selects nothing`; dropping `selectable` from the
first line fails `a drag over the selectable line produces a selection`
(`expected a value, got none`) — both exit `1`, restored green.

## Horizontal scroll

`scroll-horizontal` mounts an `overflowX: "scroll"` strip (18 columns of 80px in a
320px viewport) and drives it with `deltaX` wheels. It is the scroller a wide
table, a tab strip or a code block sits in, and no scenario had measured one.

| Step | Check |
| ---- | ----- |
| mount | the strip reports an offset and starts at `x = 0` |
| wheel `deltaX = -160` | `x < 0` — negative scrolls right, like `deltaY` scrolls down |
| the same wheel | `y` stays `0`: a horizontal gesture does not move the vertical axis |
| `onScroll` | reports a non-zero `deltaX` |
| wheel `deltaX = -4000` | clamps exactly at `-(18 × 80 − 320) = -1120` |

Negative control, measured: dropping `overflowX` from the strip fails
`the strip reports a scroll offset` (`expected a value, got none`), exit `1`;
restored, green.

## Tab overflow

A workspace with more tabs than its rail is wide is the commonest tab strip, and
nothing had measured it. `tab-overflow` mounts the same eight 80px tabs three
times in a 320px rail: a **plain** strip, a **revealing** strip whose selection
change calls the selected tab's `scrollIntoView()`, and a **nested** strip whose
tabs sit inside a flex row.

| Step | Check |
| ---- | ----- |
| mount | each rail reports `x = 0` |
| plain: focus tab 0, press `End` | the readout selects tab 7 and the rail **does not move** — the runtime does not reveal a selection |
| plain: the selected tab's bounds | it starts past the rail's right edge (`x ≥ 320`), so it really is clipped |
| revealing: focus tab 0, press `End` | the readout selects tab 7, `scrollIntoView()` moves the rail to `x = -320`, and tab 7 is painted wholly inside the rail |
| nested: focus tab 0, press `End` | the rail barely moves (`x = -1`): `scrollIntoView()` scrolls the nearest scroller to the index of its **direct child**, so it reaches the row, not the tab |

The nested case is the measured limitation, not a bug in the probe: GPUix's
`scroll_element_into_view` resolves one scroll target (the nearest ancestor that
is a scroll container) and scrolls it to the child index. A tab strip therefore
keeps its tabs as direct children of the `overflowX` scroller — a wrapper row
makes the selected tab unreachable, and the fix is layout, not a second call.
`getElementBounds` reports the painted position of an element inside a scroller,
so the reveal is asserted on the tab's own boxes.

Negative controls, measured: dropping the `scrollIntoView()` call fails
`scrollIntoView moves the rail left` (exit `1`); widening the rail to 720px so
the tabs fit fails `the last tab starts past the rail's right edge` (exit `1`).
Restored, green.

## Drag auto-scroll

Dragging to the bottom of a pane to grow a tree, or to the edge of a list to
reach a far row, needs the rail to move while the pointer rests in its edge
band. `drag-autoscroll` mounts two identical 320×200 rails of 24 rows and drags
row 4 (centre `y = 180`, inside the 24px band of the 200px rail) by 10px in eight
moves:

| Rail | Handler | Measured |
| ---- | ------- | -------- |
| plain | none | offset stays `y = 0` — the runtime does **not** auto-scroll a scroller because a pointer rests near its edge |
| driven | `onMouseMove` reads the rail's own `getElementBounds`, and inside the band calls `renderer.scrollTo(id, 0, offset - 16)` | `moves=8` and `y = -128` — one step per move, driven by the component |

The driven rail is the strongest honest alternative, not a workaround: the
renderer exposes no drag-scroll policy, so the component owns the edge band,
the step and the clamp. Measured ordering fact: `scrollTo` paints synchronously,
so probe state written **after** the call was not committed when the drag
returned (`moves=0` while the offset had reached `-128`); the probe increments
first and scrolls second. A real component that derives its next offset from
state should keep the offset in a ref, as this probe does.

Negative controls, measured: with the driven rail's handler off, the drag scrolls
nothing and fails `every edge move runs the scroll step` (`moves=0`); giving the
plain rail the handler fails `a drag at the edge does not scroll by itself`
(`expected 0, got -128`), exit `1` each. Restored, green.

## File drops

`file-drop` mounts a drop zone and drives the renderer's own
`nativeSimulateFileDrop`, which dispatches the same `FileDrop::Entered` then
`Submit` pair a Finder drag produces. The payload is therefore measured rather
than assumed, and the second drop proves a target is a real region rather than
the whole window.

| Step | Check |
| ---- | ----- |
| mount | `drops=0 paths=` |
| drop `/tmp/alpha.txt` and `/tmp/beta.txt` on the zone | `drops=1 paths=/tmp/alpha.txt,/tmp/beta.txt` — absolute paths, in order |
| drop a file on a sibling element | the readout does not change |

`SmokeHost` gained `fileDrop(testId, paths)`, which flushes the painted layout
before the raw native call (a view that just replaced the previous scenario has
not painted), aims at the centre of the nearest painted ancestor, then dispatches
and flushes the queued event. `packages/testing`'s fake-renderer suite holds that
sequence (`flush`, `drop 100,50 /tmp/alpha.txt,/tmp/beta.txt`, `dispatch`,
`flush`; 47 tests). Negative control, measured: pointing the outside drop at the
zone fails `a drop outside the zone reaches no handler` (`expected "drops=1
paths=…", got "drops=2 …"`, exit `1`).

Measured ordering fact: when the scenario before it had left a **text field**
focused (`--only input-edit --only file-drop`), the simulated drop did not reach
the zone (`drops=0`) until the probe pressed the sibling element first; the press
ends the platform's text-input session. The probe keeps that press so it is
independent of what ran before it.

## The windowed virtual list

Every other virtual-list probe uses the **children** form: React and the retained
tree hold all rows and GPUI skips only the build and paint of the off-screen
ones. A data table with a hundred thousand rows needs the other mode —
`itemCount` + `estimatedItemHeight` + `windowStart`, where the app renders
`rows.slice(start, end)` and native positions the mounted slice by index — and
nothing had measured it.

`virtual-list-windowed` declares 100 000 logical rows, mounts a 60-row window and
asserts, from the renderer:

| Step | Check |
| ---- | ----- |
| mount | `wrow-0` and `wrow-59` are in the tree, `wrow-60` is not — mount cost follows the window, not the data |
| mount | row 0 paints but row 59 does not, so the estimate is positioning rows the paint never reached |
| mount | every painted row lies inside the mounted window |
| two `deltaY = -560` wheels | the list's own offset moved; `onVisibleRange` fired |
| the event | reports **absolute** indices (`20..27`), not offsets into the window, and never runs ahead of the paint |
| the event handler | the app moved its window to `10..70`, which still covers the painted rows |
| a press on a painted row | reports that row's absolute index |
| press `Reveal 90000` | the app window becomes `90000..90060`, `File 90000` paints, the old window is dropped from the tree, and the offset is the estimate's arithmetic (`-90000 × 28` within one row) |

22 checks, `--only virtual-list-windowed`, green on 0.11.0. Two measured rules
for a table built this way:

- **The window must be wider than the viewport plus overdraw.** `onVisibleRange`
  lags the paint by one gesture here exactly as it does in the children form
  (after two wheels the event still read `20..27` while the paint had reached
  `40..46`), so a window sized to the viewport alone would show native's empty
  estimate boxes for the rows the lag exposed. 60 rows against a 280px viewport
  (10 painted rows plus 512px of overdraw) leaves the lag harmless.
- **A reveal moves the app's window first, then calls `scrollToItem`.** The
  window is app state, so a jump to row 90 000 is not something native can infer;
  the queued scroll applies after that commit's child splice.

Negative controls, measured: dropping the reveal's `scrollToItem` fails
`the revealed row is painted` (the paint stays at the old offset, so nothing of
the window renders) and mounting one row beyond the window fails
`the row after the window is never mounted` — exit `1` each; restored, green.

## The virtual list's variable rows

Every virtual-list probe declared fixed-height rows, so "rows do not need equal
heights" was the runtime's claim rather than a measurement. A table with a
wrapped description, a tree with a two-line label and an expandable row all
depend on that path. `virtual-list-rows` declares 400 rows whose heights cycle
24 / 48 / 72px, so a uniform row would be visible in the first painted box.

| Step | Check |
| ---- | ----- |
| mount | the first three painted rows measure 24, 48 and 72, and each starts where the previous one ended |
| `Reveal 150` | that row paints, lands at the viewport's top edge, and keeps its own cycle height — the estimate positioned a row nothing had measured |
| `Grow row 0` (+40px), reader at row 150 | the painted rows are unchanged **and** the offset is unchanged: a row outside the window is not remeasured until it paints again, so nothing the reader can see moves |
| `Back to top` | row 0 paints 64px tall and row 1 moved down by the growth |

15 checks, `--only virtual-list-rows`, green on 0.11.0. The third row of that
table is the one a data grid needs to know: a row that changes height while it
is outside the window is invisible to the reader until it enters the window, so
an expandable row must be measured when it is on screen (which is also why a
streamed row only grows its own slice — `log-viewer` measures the tail case).

Negative controls, measured: a uniform 32px row fails
`the first row keeps its declared height` (`expected 24, got 32`); ignoring the
grow fails `the grown first row paints its new height` (`expected 64, got 24`);
dropping the reveal's `scrollToItem` fails `the revealed row is painted` — exit
`1` each; restored, green.

## An expanded row

`virtual-list-rows` measured rows of different heights and a row that grows
while it is **outside** the window. The case an expandable row needs is the
other one: the reader presses a row on screen, its detail opens, and the layout
below has to follow with no scroll event to prompt a re-measure.
`virtual-list-expand` mounts 200 rows of 32px and opens an 88px detail on row 3.

| Step | Check |
| ---- | ----- |
| mount | row 3 is 32px and row 4 starts one row lower |
| `Toggle detail` | row 3 re-measures to 120px on the next frame — no scroll, no offset change, and row 0 has not moved |
| the same frame | **row 4 leaves the painted window**: 3 × 32 + 120 leaves 24px of the 240px viewport, and the list paints only whole rows |
| one wheel (−80) | row 4 paints again at `row 3 + 120`, so the layout below really moved (only the paint was deferred), and a press on it selects row 4 — the shift is not a stale hit-test |
| `Toggle detail` again | row 3 paints 32px, the detail unpaints, and row 4 returns to one row pitch |
| `Reveal 150` (detail open) | that row lands on the viewport's top edge, so the grown height joined the estimate — a reveal is not 88px out |
| `Back to top` | row 3 still paints 120px after leaving the window and returning, so a row opened by state keeps its measured box |

18 checks, `--only virtual-list-expand`, green on 0.11.0.

What it settles, for an expandable row or an expandable table row:

1. **No workaround is needed to make an expansion real.** The list re-measures a
   painted row on the next frame and recomputes its window from measured heights,
   so an app neither remounts the row nor forces a re-layout.
2. **The list paints the rows that fit whole.** At mount it paints seven 32px
   rows in a 240px viewport and leaves the eighth row's 16px unpainted, so a
   growth that leaves less than one row below it defers the next row's paint
   until the reader scrolls. An expandable table that wants the following row
   visible sizes its viewport (or its overdraw) against the open row's height.
3. **The measured height is remembered with the row.** A row reopened by state
   keeps its box after leaving the window and painting again, and the grown
   height joins `scrollToItem`'s arithmetic.

Negative controls, measured: an expansion that does not change the row's height
fails `the expanded row re-measures without a scroll` (`expected 120, got 32`);
a 56px detail leaves a whole row of viewport free and fails
`the row below leaves the painted window until the reader scrolls`
(`expected true, got false`) — exit `1` each; restored, green.
`expand-fixture.test.ts` guards the geometry those two checks depend on (3
cases).

## A prepended page

A feed, a notification centre, a message scroller and a log viewer that loads
older messages all splice rows in **above** what the reader is looking at. None
of the other virtual-list probes measures that direction: they append, expand or
declare the rows up front. `virtual-list-prepend` mounts 12 rows of 20px in a
160px list — 240px, so it overflows at mount — scrolls it by 60px, then prepends
a four-row page. A second two-row list stays short throughout and is the control.

| Step | Check |
| ---- | ----- |
| mount | the feed paints `100–107` and reports offset `0`; the control list paints both of its rows |
| one wheel (−60) | the offset is exactly `-60` and row 100 leaves the viewport |
| `prepend 4 above` | the paint is still `103–110` at the same `y`, rows 96–99 are unpainted **but retained**, and the offset is `-140` — exactly the 80px inserted above |
| wheel to the top, then `prepend 4 above` | the offset stays `0` and row 92 paints at the top with row 96 one page below it: at the top the page is shown |
| `prepend 2 above` on the short list | offset `0` and the newest row painted — the same reading a broken anchor would give |

21 checks, `--only virtual-list-prepend`, green on 0.11.0.

What it settles, for a feed or a "load older" pane:

1. **A prepend is anchored on the row, not on the pixel.** The offset moves by
   the inserted height (`-60` → `-140`), so a feed that splices a page into
   `children` keeps the reader on the row they were reading with no app-side
   compensation and no jump.
2. **A reader already at the top sees the page.** The runtime drops the anchor
   for a top-aligned list sitting at `0`, so "load older" behaves like a
   browser: the new content appears at the top instead of being hidden above
   the viewport.
3. **A short list cannot prove any of it.** While the content fits the viewport
   the list re-anchors to the first row on every layout, so a probe written on
   two rows passes with the anchoring removed. The scenario mounts an
   overflowing feed before it scrolls for exactly that reason, and its first
   check is the overflow itself.

Negative controls, measured: starting the feed at 4 rows fails `the feed's
declared rows overflow the viewport` (and, with that guard relaxed, `the wheel
moved the feed off the top` — `expected true, got false`, because a list that
does not overflow has nothing to scroll); jumping to the top in the prepend
handler, the naive "show the newest page", fails `the new rows stay above the
viewport` (`expected false, got true`); adding `followTail` to the feed fails
`the feed starts at its first row` (`expected 100, got 104`) — a follow list
mounts at its tail and is the wrong component for a history pane.

Not measured here: the **loading-row correction** for infinite scroll, where the
row standing in for the arriving page is the anchor and the app restores it with
`getScrollTop` plus a negative `scrollToItem` offset. That path needs a window's
`scrollToItem`, which the headless host does not expose; it is a TODO row below
rather than a claim.

## The accessibility tree

The library tells a reader what assistive technology is told — the tooltip's
`aria-description`, a row's `aria-selected`, a dialog's role — and nothing had
ever read the tree those claims are about: `paintedText` cannot see an attribute,
and a window's automation protocol has no a11y verb. The offscreen renderer
exposes `getA11yTree()`, so `@gpuixui/testing` decodes its dump into
`Smoke.A11yTree` and `a11y-tree` mounts one node per shape the closed aria set
offers.

| Shape | What the platform reports |
| ----- | ------------------------- |
| `role="button"` + `aria-label` / `aria-description` / `aria-id`, `onClick`, `tabIndex` | role `Button`, `label=Save project`, `description=Writes the file`, `author_id=file.save`, actions `Click` and `Focus` |
| `role="option"` + `aria-selected` / `aria-expanded` | role `ListBoxOption`, `selected=true`, `expanded=true` |
| `role="heading"` + `aria-level={2}` | role `Heading`, `level=2` |
| `role="progressbar"` + `aria-valuetext="42%"` | role `ProgressIndicator`, `value=42%` |
| `<text>Hello accessibility</text>` | a `Label` node whose `value` is that text |
| `role="none"` with an `aria-label` | **no node** |
| a div with `aria-label` and no role | **no node** |
| the window | a `Window` node |

19 checks, `--only a11y-tree`, green on 0.11.0.

Two measured rules a component plan has to carry:

1. **The ARIA token is not the role you get back.** `option` arrives as
   `ListBoxOption` and `progressbar` as `ProgressIndicator`; a test that asserts
   the token it passed fails against a correct tree.
2. **A node needs a role to exist at all.** An `aria-label` on a roleless `div`
   is silently absent, and `role="none"` is dropped, so an element that must be
   announced needs both a role and the label. A window's automation protocol has
   no a11y verb, so this stays a `TestRenderer` measurement.

The dump's own shape is a boundary: the pinned `index.d.ts` declares
`getA11yTree(): string` while the JS returns the parsed object, so the port types
it `unknown` and `createTestHost` decodes it — a dump it cannot decode reports
`null` rather than an empty tree, and `native.test.ts` guards both the decode and
that absence. Nodes are flattened: the dump keys them by an ephemeral letter.

Negative controls, measured: removing the button's `role` fails
`the tree describes "Save project"` (`expected a value, got none`); dropping its
`aria-description` fails `aria-description reaches the tree`
(`expected "Writes the file", got ""`) — exit `1` each; restored, green.

## Dock reflow: `onLayout` reports the width a sibling takes

`docking-nested` pins a **fixed-width** split, because a split's `max` is the
caller's number and an inner split does not re-clamp when its parent shrinks.
The stated way out is the container's own `onLayout` — "a dock passes its own
bounds" — and nothing had measured that a reflow reports at all: an `onLayout`
that fired only for the first paint would make the workaround useless.

`dock-reflow` mounts a 560px row of a 120px sidebar, a flexible centre pane and
a fixed 100px inspector. `Widen sidebar` takes 100px from the centre.

| Step | Check |
| ---- | ----- |
| mount | the centre takes `560 − 120 − 100 = 340` and the inspector keeps 100 |
| mount | the centre's reported width is its painted `bounds`, not the style's intent |
| `Widen sidebar`, before a frame | a layout pass arrives with the box the pane **still** has (`w=340 reports=2`) — the commit reports before the new width applies |
| one frame later | the settled report reads `w=240`, exactly the 100px the sidebar took, and it still equals `bounds` |
| the inspector | keeps its 100px and **still receives a report** (its count reaches 2), although its box never changed |
| `Narrow sidebar` | the centre returns to 340 and reports again, still agreeing with `bounds` |

12 checks, `--only dock-reflow`, green on 0.11.0 (three consecutive runs of the
counts behind it).

What it settles for a docking package:

1. **The re-clamp signal exists.** A flex child's `onLayout` fires again when a
   sibling takes space, and the settled payload is the painted box.
2. **A report is not an event that says "you changed".** The same reflow
   produced a stale pass first, and it also reported to the pane whose box did
   not change. A handler must therefore re-clamp from the width it is *given* and
   be idempotent — setting a size that is already set must not start a loop —
   rather than treating every report as a change or reading a container's width
   in the same tick as the state change.

Negative controls, measured: a centre that does not flex fails
`the widened sidebar shrinks the centre by exactly what it took`
(`expected 240, got 289`); dropping the inspector's `onLayout` fails
`a pane that kept its box still got a report` (`expected 2, got 1`) — exit `1`
each; restored, green.

## A frozen data-grid column

The runtime has no sticky, so a frozen first column is the header rule on the
other axis: its own vertical scroller beside the grid's, kept in step by the app.
`data-grid-frozen-column` mounts a 120px label pane and a 240px grid over 60 rows
of 28px and measures the composition:

| Step | Check |
| ---- | ----- |
| mount | both panes report offset `0` and row 0 sits at the same `y` in both |
| wheel `deltaY = -300` over the grid | the grid moves to `-300` and **the frozen column follows** — one `onScrollChange` → `scrollTo` mirror |
| wheel `deltaY = -300` over the frozen column | it moves to `-600` and the grid follows it back — the mirror is two-way |
| the row under the reader | its `y` matches in both panes, so labels cannot drift from cells |
| wheel `deltaX = -200` over the grid | the grid's row moves 200px left and the frozen column does not move — a frozen column does not pan |
| press a frozen cell | the row is selected for the whole grid, not just the label pane |
| wheel `deltaY = -10000` over the grid | both panes clamp at the same `-(60 × 28 − 240) = -1440` |

25 checks, `--only data-grid-frozen-column`, green on 0.11.0. The mirror runs in
`onScrollChange` because that event carries the clamped absolute pair, and it is
guarded by a ref: `scrollTo` paints synchronously, so the target's own change
arrives inside the call and would otherwise mirror back. `getScrollOffset`
reports both axes, which is what makes the horizontal half assertable — the same
`scrollTo` call sets `x` and `y` independently.

Negative controls, measured: dropping the grid → frozen mirror fails
`the frozen column follows the grid` (`expected -300 ± 1, got 0`); dropping the
grid's `overflowX` fails `a horizontal wheel pans the grid`
(`expected -200 ± 2, got 0`) — exit `1` each; restored, green.

## The example gallery

`packages/components/examples/index.ts` is the registry of the 39 screens the
component docs quote, and this app is its only consumer. Nothing proved those
screens *mount*: a component's behaviour suite proves its parts, not a
composition of parts with caller-owned state. `examples-mount` pages through the
registry in sorted id order — one screen mounted at a time, because 39 screens at
once lay out a very tall tree and leave a screen's timer or `Effect` fiber running
behind the next one — and asserts, from the renderer:

| Step | Check |
| ---- | ----- |
| each page | the readout names the next id (`example=<id> page=<n> of=39`) |
| each page | the example's wrapper paints (`bounds` is a value) and lays out a height of its own |
| each page | the wrapper's own subtree carries text, so the screen painted content rather than merely existing |
| after the last press | the readout reads `example=none …` — the plan ends where the registry does, and the last screen unmounts with its timers |

The wrapper holds the example and nothing else (the id label and the readout sit
above it), so its text is the screen's own. That is what lets the run also assert
that no two pages paint the same screen: a registry row pointing at a component
another row already mounts would show the reader one example under two names.

158 checks, `--only examples-mount`, green on 0.11.0. Negative controls
measured: adding an id the registry has no entry for fails
`no-such-example lays out a height of its own` (`expected true, got false`);
mounting every page from one component fails
`no two examples paint the same screen` (`expected 39, got 1`) — exit `1` each.

## Search in a virtualized document

A find bar over a log, a code editor or a data grid searches a document the
runtime never holds: a `<virtual-list>` mounts a window of its rows, so
`getPaintedHighlights()` reports only that window's washes and `activeIndex`
would mean "the nth match on screen". `matchIndexOffset` is the published seam —
**a match count per row, not a row index**, because rows hold different numbers
of matches.

`search-virtual-document` searches 400 rows of 24px in a 200px viewport, each
built with zero, one or two occurrences of `error`; the document holds 676
matches, 540 of them above row 320. Measured on 0.11.0:

| Step | Check |
| ---- | ----- |
| mount | the first row paints and row 399 does not, so native holds a window; an empty query washes nothing |
| find | the app's `findRanges` count is 676 while the painted washes are only the mounted rows' matches — row 0, row 3 and row 5 wash 2, 1 and 0 — so the document's count and the paint are different numbers |
| next | the global cursor marks exactly one wash: row 0's first match |
| far match | `scrollToItem(320)` paints that row, its two washes and **exactly one active** — the second match, which is the one the cursor names (`active=541 row=320 local=1 offset=match:540`), on the viewport's top edge |
| a row index as the offset | no active wash at all — `320` compared against a match numbered `541` — while the row keeps both of its washes |
| an off-by-one offset | the **first** match of the same row is active: the match before the one named, read from `start`, so the wash is a number compared arithmetically rather than a row looked up |
| a negative offset | every wash disappears — the runtime drops the whole spec rather than mis-numbering it |
| replace all | total 0, no washes, the mounted row paints `fixed`, no `error` survives, and the reader's row does not move |
| find `fixed` | total 676 again — one replacement per old occurrence across the unmounted rows too — and the row washes twice |

36 checks, `--only search-virtual-document`, green on 0.11.0. The three wrong
offsets are steps of the same run, so the pass holds the contract in both
directions: a runtime that ignored `matchIndexOffset` fails
`the active wash is the second match of the row`, a parser that accepted `-1`
fails `a refused offset drops every wash`, and a replace that rewrote one
occurrence per row fails `replace-all leaves no match in the document`.

Two out-of-band controls measured, exit `1` each and restored green: dropping
`matchIndexOffset` from the spec fails `the cursor marks exactly one match`
(`expected 1, got 8` — the naive composition lights the cursor on every mounted
row), and replacing one occurrence per row fails
`replace-all leaves no match in the document`
(`expected a string containing "total=0", got "… total=312 …"`).
`src/scenarios/find-document.ts` holds the offset and replace arithmetic —
`find-document.test.ts` (7 cases) holds the per-row counts, the offsets, the
locate rule and replace-all, so a green probe cannot stand on wrong numbers.

## Evidence on this host

The suite is **40/40 green** here on GPUix 0.11.0 (`exit 0`):

```
40/40 scenarios passed · capabilities: layout=verified text=verified
input=verified focus=verified overlay=verified modal=verified
floating=verified scroll=verified panel=verified virtual-list=verified
table=verified tree=verified log=verified theme=verified workspace=verified
editor=verified search=verified
```

The measurements that shaped the scenarios (full list: plan `140` §4):

| Capability | Measured on this host (0.11.0 unless noted) |
| ---------- | ----------------------- |
| layout, text, input | exact bounds; `getAllText`/`getPaintedText`; `onChange`/`onSubmit` |
| text selection | `dragSelect` fills `getSelectedText()` for `selectable` text and nothing for chrome; `clearSelection` empties it |
| accessibility | the offscreen renderer's `getA11yTree()` describes `role` and all seven `aria-*` props (the token mapped to the platform's role name), a node with no role is absent, and a `<text>` is a `Label` with its content (`a11y-tree`) |
| focus | **`onFocus`/`onBlur` fire** (0.5.1 never delivered them). `autoFocus` takes native focus without dispatching `onFocus`; a synthetic `"tab"` reaches `onKeyDown` but does not traverse in the `TestRenderer` — `focusNext`/`focusPrevious` do |
| overlay | the `<anchored>` paints no surface of its own, so `onMouseDownOutside`/`onKeyDown` go on the **content div**; the popup takes focus on open and Escape reaches it |
| modal | `useGpuix().renderer` is the programmatic-focus path: `focusElement` moves native focus from component code, `getElementBounds` is the existence check before returning focus, and `focusNextWithin`/`focusPreviousWithin` cycle `content → a → b → open-popover → close → content` without leaking. A nested popover's Escape closes only the popover; a second Escape closes the modal |
| floating | `<anchored side align gap>` is exact for `side`, `gap` and `align="start"`/`"end"` (`bottom` = `anchor.bottom + gap`, `right` = `anchor.right + gap`). **`align="center"` is off by half the panel on both axes** (it ends the panel at the anchor's centre line), and **`fit="snap"` clamps to `window − snapMargin` without flipping**, so a bottom-side menu can end up over its trigger |
| scroll | the wheel **works**; `deltaY` is negative to scroll down and `deltaX` negative to scroll right (the opposite of the DOM); an `overflowX` strip clamps exactly at `contentWidth − viewportWidth` |
| panel | pointer capture + inclusive clamp |
| virtual-list | retains 5 000 rows but **paints ~9**; `getPaintedText` is the window. `itemCount` mode mounts only the 60-row window the app renders (`virtual-list-windowed`), and `onVisibleRange` reports absolute indices but lags the paint by one gesture in both modes. Rows may differ in height: each is measured and stacked (`virtual-list-rows`), and a row that grows while outside the window is not remeasured until it paints. A row that grows **while painted** re-measures on the next frame and the rows below shift by the growth; the list paints whole rows only, so a growth that leaves less than a row of viewport defers the following row's paint until a scroll (`virtual-list-expand`). A page prepended above a scrolled reader keeps their rows and their `y` exactly while the offset grows by the page height, and at `0` the anchor is dropped so the new page paints (`virtual-list-prepend`) |
| table, workspace | row click/sort/keyboard, column drag; a virtualized table of 500 rows paints ~9, a painted row is hittable and its selection survives scrolling out and back; tab drag between panes, split resize |
| data grid | a frozen first column is its own vertical scroller beside the grid, mirrored in `onScrollChange` with a re-entrancy guard: a wheel over either pane moves both, the same row shares its `y` across the panes, a horizontal wheel pans the cells but not the frozen column, and both clamp at the same `-1440` (`data-grid-frozen-column`). A header **outside** the row scroller keeps its painted y while the rows scroll (`position: "sticky"` paints nothing: a sticky sample *inside* the scroller moves by exactly the scroll amount, so the header must be a sibling); one `overflowX` scroller wrapping header and rows moves a header cell and its column's cells by the same x, keeping them aligned |
| search highlights | a `highlight` spec paints a wash per match, and `SmokeHost.highlights()` (the renderer's `getPaintedHighlights`) reports each wash's run, `[start, end)` and boxes: three for `alpha`, two for `beta`, and none once the query is case-sensitive `ALPHA` or a whole-word `alp` — the insensitive/word-off queries mark them again. One `activeIndex` marks exactly one wash `active`. `ranges: [[0, 5)]` marks the same region `indexOf` would. A wash is a quad, so `text`/`paintedText` never report it |
| search, virtual document | the runtime numbers only the matches it paints, so a find bar over a `<virtual-list>` carries a match count per row: `matchIndexOffset` = 540 puts row 320's second match at document index 541 and marks exactly one wash active, while the row index (320) marks none and an off-by-one prefix sum marks the match before the named one. A negative offset drops the whole spec. `findRanges` over all 400 rows is the document's count (676) and a replace-all clears it (`search-virtual-document`) |
| editor | a `<textarea>` edits lines: Enter inserts a newline (a field with an `onSubmit` listener reports Enter **instead**, so an editor must not set one), and the arrow keys move the native caret (two lefts from the end of `cd` put the next character before its `c`). `<code code language showLineNumbers>` paints its source and every line, scrolls in a bounded viewport, and `<diff patch>` paints both sides of a changed line. **No caret or selection API exists**, so a highlighted editable surface cannot be built: the honest editor is edit in the textarea, display in `<code>` |
| docking | nested splits compose: each level keeps its own width, so an outer drag moves the inner split's origin and leaves its width alone, and an inner drag leaves the sidebar alone. A caller-owned sidebar collapses to 0 (the nested split takes the width) and reopens at the width it had; a tab switch inside a pane repaints it without moving it. A split's `max` is the **caller's number**, not the container's width: a nested split does not re-clamp when its parent shrinks, so a dock passes its own bounds — and `dock-reflow` measured the signal: a pane's `onLayout` fires again when a sibling takes 100px, the settled payload equals the painted `bounds`, but a stale pass arrives first with the pane's current box and a pane whose box did not change is still reported to, so the handler must re-clamp from the width it is given and be idempotent |
| drag auto-scroll | a drag at a scroller's edge does **not** move it: the offset stays `0` across eight moves. `renderer.scrollTo(id, 0, y)` from the component's `onMouseMove`, using the rail's own `getElementBounds` for the edge band, is the measured alternative (`y = -128` for 8 × 16px). `scrollTo` paints synchronously, so state after the call is not committed when the drag returns — keep the offset in a ref |
| virtual table | `onVisibleRange` **lags the painted window by one gesture** — after two wheel gestures the painted rows were `32–40` while the range read `16`; an index-driven feature must use the painted rows as the current window |
| tree | `paddingLeft` indents exactly (16px per depth); expand/collapse repaints the subtree; a clicked row takes native focus and receives arrow keys. Focus movement from component code is measured separately (`modal`), so a roving-tabindex tree can use `renderer.focusElement` |
| log | bottom-anchored `<virtual-list>` starts at the tail and re-anchors on appends; `bottom` alone and `top` + `followTail` alone both anchor at the bottom. Scrolling up and appending does **not** snap back — a follow toggle is app state plus a scroll |
| theme | `TestElement.style` reports `backgroundColor`, `fontSize`, `fontFamily` and `boxShadow` verbatim, including 8-digit `#RRGGBBAA`; a provider re-render repaints every swatch |
| window key | the app-level `render({ onKeyDown })` handler runs after the focused element's `onKeyDown`, with `event.modifiers` set — the command-palette path |
| window size | `getWindowSize()` is the box the layout fills (not the retired 800×600 constant): `useWindowSize()` reads the same pair, and `zoomWindow()` takes a 900×520 window to 1680×923 while the flexible pane reflows and `onLayout` reports the new width (`window-resize-reflow`) |
| shell | a flex child needs `minHeight: 0` to scroll; without `overflowY` the list is not a scroll container and its last row is unreachable |
| content | `<svg source>` paints as one `style.color` tint; a multi-colour chart is one stacked `<svg>` per colour, and `<text>` inside it paints; `<img>` paints a data URL or a pixel buffer uploaded from a **layout** effect; `<canvas>` tracks no bounds and paints nothing (see the probe below) |

`legacy-probe/` keeps the 0.5.1 measurements as historical hardware evidence
(`./legacy-probe/run.sh probe`); they never set a component status.

## The live window runner (plan `053` STOP gate)

The headless suite drives the offscreen `TestRenderer`; a live run drives a
**real window** through `@gpuix/native/automation` (`getByTestId`, `textContent`,
`keystrokes`, `screenshot`) plus the renderer's own focus calls. It reports
through the same `Smoke` model, so the exit codes below hold for both runners:

| Exit | Meaning |
| ---- | ------- |
| `0`  | every selected probe ran and passed |
| `1`  | a probe failed — a real regression |
| `2`  | no window (no desktop session or no binding) — **no evidence** |

Probes live in `src/live/`: `registry.ts` owns ids and capabilities (no native
import, so `--list` costs no binding), `scenarios.tsx` owns the view and steps,
`host.ts` adapts the window to `Smoke.AsyncSmokeHost`, and `run.ts` is the CLI.
Artifacts: `.artifacts/live-report.json` and `.artifacts/live/<state>.png`.

### The critical interactions, each measured in a window

MISSION's representative list, mapped to the probes that drive it. Every row is
a real window measurement, the probes pass in the same run, and
`registry.test.ts` fails when a row loses its probes or names an id the registry
does not declare — so a rename cannot quietly retire an interaction.

| Critical interaction | Probes | What a window measures |
| -------------------- | ------ | ---------------------- |
| dialog open/close/confirm | `dialog-lifecycle`, `confirm-dialog-lifecycle`, `nested-overlay-lifecycle` | a press opens and focuses the surface; Escape and the dialog's own close return the focus; the confirmation holds Cancel, reports once, and cancels on Enter; a dialog holding a popover holding a menu dismisses one surface per Escape and per outside press, outside-in |
| menu selection/dismissal | `menu-lifecycle`, `context-menu-lifecycle` | a press or a keyboard open lands on row one, arrows move real focus, Enter and a press activate, Escape dismisses |
| input update/validation | `text-input`, `validation-lifecycle` | typed keys reach `onChange` and Enter reaches `onSubmit`; a failed submit paints the schema's message and the destructive role, keeps the focus, and a valid value clears both |
| tabs and panel switching | `tabs-lifecycle`, `dock-focus-lifecycle` | a press and an arrow select a tab and the pill follows; a rail step carries the focus and swaps the pane |
| theme switching | `theme-switch-lifecycle` | a palette press repaints the page and card; a platform look re-lays an `md` control at its own density |
| table sort/selection | `table-lifecycle` | a header press sorts by the column it hit and a second press flips it; a row press selects and focuses, and the selected record survives the sort |
| panel resizing | `split-pane-lifecycle` | a divider drag resizes the pane and clamps at the caller's bounds |
| workspace restore | `workspace-restore` | a saved arrangement paints again after a re-mount, a corrupt string opens the default, and an out-of-bounds width is clamped |

### A probe waits for a settled paint

A window paints a sequence of frames, so a check that reads one frame after a key
measures the journey instead of the state a user is left with: a dismissed surface
stays mounted for its exit tween (`@gpuixui/motion`'s `slow` level is 320ms, five
times the runner's frame settle) and a panel that enters travels a few pixels
before it rests. Three measured shapes of that, all fixed by polling:

- a dialog or menu read right after `Escape` was still painted
  (`Escape unpaints the dialog surface: expected true, got false`);
- the tabs pill was caught mid-slide (`the pill follows the selected trigger:
  expected 110 ± 2, got 49.5`);
- a context menu read on its entry offset (`the surface starts at the press
  point's y: expected 124 ± 1, got 121.5`).

`src/live/settle.ts` holds the one poll — `settleUntil(read, holds)` re-reads
until the state arrives, `settleNumber(read)` waits for a box to stop moving —
and `settleGone`/`settlePainted`/`boxAxis` in `scenarios.tsx` are its
host-shaped wrappers. The poll is **bounded** (40ms × 50, ~2s): an overlay that
never dismisses still fails, and the assertion after it names the value it
settled on, so a steady-state defect cannot hide behind a wait. `settle.test.ts`
(6 cases) holds the semantics — including that `settleNumber` returns the
resting value rather than the mid-tween one it was waiting to leave.

Three more shapes of the same lesson, measured after the presence wiring gave
every overlay a tween:

- the popover's gap was read 40ms into its 200ms entry (`expected 6 ± 1, got
  0.5`), so the gap is now taken from a settled `y`;
- the context menu's keyboard-placed surface was read on its entry offset
  (`expected 204 ± 1, got 201`), so both axes are settled;
- the header menu's Escape check used a one-shot `gone` and saw the 200ms exit
  still painted, so it waits with `settleGone` — and a check that expects a
  surface to *survive* polls for the painted state with `settlePainted`, so it
  does not spend the whole budget on a surface doing the right thing.

Three more, and the reason a full pass reports the probes it failed rather than
a count: every one of these was green alone and red in a pass, and the two full
passes that found them named *different* probes, so the box's load was the
variable rather than the components.

- a fresh mount was read before its own first layout pass had reported (`the
  centre is the painted box the onLayout report names: expected 780 ± 1, got
  0`), so `window-resize-reflow` waits for `reports > 0` and for the app's
  `useWindowSize()` to carry a positive pair before it compares either;
- the palette was reopened with a press sent during the previous surface's exit
  tween (`the runtime paints command-zoom: expected a value, got none`): the
  layer that is closing dismisses the press that would reopen it, so the surface
  never mounts. `openPalette` now waits for the surface to be **gone**, then
  **painted**, then its search field **focused** — the three states the typing
  after it depends on;
- the column menu was reopened the same way (`a press still opens the menu after
  the header shrank: expected true, got false`), and the select that starts that
  exit tween is now a check of its own (`selecting a column dismisses the
  menu`), so the wait is a measurement rather than a sleep in front of one.

### `focus-visible` — measured on 0.11.0 here

The probe paints the ring as a `focusVisible` outline
(`outlineWidth: borderWidth.strong`, `outlineColor: colors.ring`,
`outlineOffset: 0`) on three identical samples, then moves focus five ways.
Both facts are asserted: the focus id after each move, and the **paint** — the
probe decodes each capture and counts pixels of `colors.ring` (`Pixels`, in
`@gpuixui/testing`), so a ring that stops painting fails the run. Painting the
same probe with a wrong ring colour fails `Tab paints the focus ring`
(`expected true, got false`, exit `1`), which is the negative control.

| State | Focus id (asserted) | Ring painted |
| ----- | ------------------- | ------------ |
| mouse press | `press-ring` | **no**, and nothing dims |
| native traversal (`focusNext`) before any key | `tab-ring` | **no** |
| programmatic focus (`focusElement`) before any key | `programmatic-ring` | **no** |
| Tab key | wraps `programmatic-ring → press-ring` | **yes**, and the other focusables dim |
| programmatic focus after a Tab has been delivered | `programmatic-ring` | **yes**, and the others stay dimmed |

Three consequences, which is what plan `053` needed:

1. `focusVisible` **paints** in a real window, so a keyboard-only ring is
   available and a component no longer needs to track focus for a Tab.
2. It does **not** paint for a programmatic focus until some keyboard input has
   happened. An overlay opened by a **mouse** cannot rely on it, so the existing
   programmatic ring stays for that path.
3. `keyboardFocusDim` is on by default and tracks the same keyboard-input state:
   it dims other focusables exactly when the ring appears.

### `keyboard-focus-dim` — measured on 0.11.0 here

Three identical samples, one with `keyboardFocusDim: false`. After a pointer
press every fill is at full strength; after Tab (keyboard focus on the second),
the first sample dims — fill **and** text — the focused one stays full, and the
opted-out one stays full. The probe asserts this from the frame: the count of
exact `colors.muted` pixels drops by about one sample's worth, so a runtime that
dimmed the whole window, or ignored the opt-out, fails.

That answers plan `053`'s third question: dimming is **on by default**, it is
per-element, and an element that draws its own focus look opts out with
`keyboardFocusDim: false`.

A failed probe still writes its report and captures, so a regression is visible,
not just red.

### `filled-action-dim` — measured on 0.11.0 here

`keyboard-focus-dim` measures the mechanism on plain `div`s; this probe mounts the
**shipped** actions and reads the rule back off the frame. It renders a filled
`secondary` action, a `ghost` action, a `destructive` action whose caller forces
`keyboardFocusDim: true` back on, and a fourth action that takes the focus. Each
measured action paints one colour nothing else in the view uses, so the count is
the action's own pixels:

| Sample | Pointer focus on the fourth action | After Tab returns the focus to it |
| ------ | ---------------------------------- | --------------------------------- |
| filled `secondary` | 66 008 exact-fill pixels | **66 008** — every pixel kept |
| `ghost` (label tinted `success`, sized 28px, by the caller) | 3 218 label pixels | **0** — dimmed away |
| `destructive` forced into the cue | 65 483 | **0** — the dim composites the fill |

So the components' declaration is a painted fact: a filled action opts out
(`keyboardFocusDim: false` from `paintsFilledSurface`) and a ghost keeps the
where-can-Tab-go cue, while a caller's `style` merges last and can put the dim
back. The ghost's label is tinted and sized from the caller because it paints no
fill, the label is the only pixel the mechanism can change, and 28px keeps
enough exact-coloured glyph interiors for the count to read on a non-retina
display.

**A text field is not a dim target.** The first version of this probe tabbed into
a shipped `Input` and measured no dim at all — the ghost's label pixels survived
every Tab. That is the runtime, not the probe: `renderer.rs`'s
`keyboard_focus_path` returns no path when the focused element is an
`input`/`textarea`, "text fields do not count: typing is keyboard input too, and
dimming the window while someone types is noise". The focus target is therefore a
fourth action, which is also what the token catalogue's "every other focusable
dims" claim quietly assumes; the token pages do not say it yet (`TODO.md`).

Negative controls, measured: forcing the filled action into the cue fails
`a filled action keeps every pixel of its fill — expected 66008, got 0`; giving
the ghost `keyboardFocusDim: false` fails `a ghost action's label is dimmed
away — expected 0, got 3218` (exit `1` each). Restored, 12 checks green.
Captures: `.artifacts/live/pointer.png`, `.artifacts/live/keyboard.png`.

### `floating-sides` — measured on 0.11.0 here

The headless `floating-placement` scenario measures the engine against the
`TestRenderer`; a window can differ (the tabs indicator did). The horizontal
sides and the runtime's `align="center"` offset had never been measured live, so
this probe mounts three anchors at rest — `side="right"`, `side="left"` and
`side="right" align="center"` — and compares each panel's painted box with its
anchor's on the axis the prop controls:

| Placement | Check | Measured |
| --------- | ----- | -------- |
| `side="right"` | panel left edge | anchor right + 6px |
| `side="left"` | panel right edge | anchor left − 6px |
| `align="start"` (both) | panel top | anchor top |
| `side="right" align="center"` | panel bottom | the anchor's centre line — the runtime ends the panel at the centre rather than centring it |

That last row is the quirk the overlay components compensate for with a measured
`start` offset (plan `323`); the probe pins the runtime behaviour so an upstream
fix fails here instead of silently moving every menu. The components' own
compensation is their native behaviour suites' job; the live `dialog-lifecycle`
and `menu-lifecycle` probes mount those components themselves.

Negative control, measured: mapping the left layer to `side="right"` fails
`side=left ends one gap left of its anchor: expected 254 ± 1, got 546`,
exit `1`. Capture: `.artifacts/live/floating-sides.png` — the right panel sits
beside its anchor, the left panel mirrors it, and the centre panel visibly starts
half its height low.

### `font-registration-late` — measured on 0.11.0 here

The typings for `registerFont` say a family that did not exist when the text
naming it was first laid out "has already fallen back to another font". That is
true of the frame it describes, but it leaves the practical question open: does
the text stay the fallback forever, or does the next layout pick the file up?
This probe measures the second half.

The view names `GpuixTestSquare` and declares **no** `fonts`, so the first paint
is the fallback. The probe measures the word's painted width, installs the file
through the renderer (`AsyncSmokeHost.registerFont`), presses a re-layout control
whose handler flips the sample's tint (so the node really re-renders), and
measures again. A second sample names a family nothing ever installs, so it must
not move — otherwise the difference would be noise rather than the file.

| Sample | Before the install | After the install + re-layout |
| ------ | ------------------ | ----------------------------- |
| `late-face` (`GpuixTestSquare`) | 44px (fallback) | **81px** (4em at 20px, rounded) |
| `late-control` (`GpuixTestMissing`) | 44px | 44px |

Four checks: the control family paints the fallback, the next layout paints the
installed face (80 ± 1), the face was **not** painted before the install, and the
control does not move. Negative control, measured: declaring
`fonts: [SQUARE_FACE]` (the face known at mount, so the first paint is already
81px) fails `the face was not painted before it was installed` and exits `1`.

The consequence is not "register whenever you like": registering after the first
paint still costs a fallback frame, so the documented order stays the right one.
What this measures is that the fallback is **not permanent** — a repaint re-lays
the text out against the family the renderer now knows. `packages/tokens` says
the opposite in four places (the `fonts.ts` header, `docs/tokens.md`, the package
README and the `COMPONENTS.md` row); the correction is recorded as an interlock
in `TODO.md` because those files are not this workstream's.

The capture pair is `.artifacts/live/late-before.png` and `late-after.png`: the
first two samples are ordinary text, the face sample becomes a solid rectangle
once the install has been repainted.

### `register-font` — measured on 0.11.0 here

Plan `052` shipped `registerFonts`, but a unit test cannot show the face
*painted*, and a window's renderer reports no style. The proof therefore has to
be the font's own **metrics**: the probe paints one word three ways at 20px — the
theme's family, a family no runtime knows, and `GpuixTestSquare` (GPUix's
generated test face: `A` 1em, `B` 2em, `m` 1em, every glyph a filled square)
which the runner installs with `registerFonts` before the view's first paint:

| Sample | Family | Painted width |
| ------ | ------ | ------------- |
| `face-default` | the theme's `.SystemUIFont` | 42px |
| `face-missing` | `GpuixTestMissing` (no such family) | 44px |
| `face-registered` | `GpuixTestSquare` | **80px** (4em at 20px) |

Three checks: the installed family paints its own advances (80 ± 1), the unknown
family does **not** (naming a family changes nothing on its own — it lands on a
fallback two pixels off even the theme's own face), and the fallback paints
something. Negative control, measured: dropping the probe's `fonts` entry makes
the third row fall back as well and fails
`the installed family paints the face's own advances`
(`expected 80 ± 1, got 44`, exit `1`).

The capture is unambiguous (`.artifacts/live/register-font.png`): the first two
rows are text, the third is one solid rectangle, because every glyph in the
installed face is a filled square.

Two consequences:

1. A theme may name a family the machine did not have, and the runtime resolves
   it from the **file** — so a consumer's own typeface travels with the
   application, which is what plan `052` needed.
2. **Register before the first layout.** Registering later still costs a frame of
   fallback text; `font-registration-late` measured that the text then re-shapes
   on the next repaint (44px → 81px), so the fallback is not permanent but the
   first frame is. The pinned typings say only the first half.

The fixture is `GpuixTestSquare`, GPUix's generated test face
(`references/gpuix/packages/react/src/__tests__/make-square-font.py`). Its bytes
are embedded in `src/live/fonts.ts` so the runner needs no asset-copy step, and
`src/live/fonts.test.ts` decodes them to check the family the file declares, that
the fallback family is **not** in the file, and that `registerFonts` installs the
bytes once.

### `text-input` — measured on 0.11.0 here

The first probe that mounts a **shipped component** rather than a hand-built
sample: `@gpuixui/primitives`' `Input`, controlled, above a readout that prints
the value React received and the number of submits.

| Step | Check |
| ---- | ----- |
| mount | the readout reads `value= submits=0` |
| press the field, type `h`, type `i` | the readout reads `value=hi` — the window's keystrokes reached the component's `onChange` |
| `Enter` | the readout reads `submits=1` — the runtime delivers submit |

The capture (`.artifacts/live/typed.png`) shows the field's own chrome, the
typed text, the keyboard focus ring and the readout, so the readout is a check
and the frame is the visual evidence. Negative control, measured: dropping
`value`/`onChange` from the composition (so the field keeps its own draft and
never reports it) fails `typing reaches the component's onChange`
(`expected a string containing "value=hi", got "value= submits=0"`, exit `1`).

That is the first native proof that a library component — not a primitive host
element — takes real typed input in a window. The Tier 2 probes that followed
(`dialog-lifecycle`, `menu-lifecycle`, `toast-lifecycle`) mount
`@gpuixui/components`; they were blocked until the package's `jsx-runtime` path
mapping was deleted (TODO → Interlocks) and now run here.

### `field-ink` — measured on 0.11.0 here

What a field paints for a **hint** and for a **value**, read out of the frame's
own pixels. Two inks are the runtime's rather than a `StyleDesc`'s: an empty
`<input>`'s hint is a fixed `#8F8F8F` (`custom_elements/input.rs` at the pinned
release), and its value paints the element's `color`, not the theme object's
`text`. The probe paints four fields and crops each one to its own box, so a
role painted elsewhere on the page cannot stand in for the field's ink.

| Field | Check |
| ----- | ----- |
| the host's own hint (theme object only) | the box paints `#8F8F8F`; the theme's `placeholder` role paints **0** pixels |
| the workaround the fields ship (no host placeholder, a themed `<text>` over it) | `#8F8F8F` is **0**; `#858E9F` — the dark palette's `placeholder` — paints |
| a value typed into a host given only the seam | the hint is gone, the value paints **darker than its fill**, and the box's brightest pixel is its **47.5**-luminance border — never the seam's ink |
| the same value with `color` set from `inputForeground` | the brightest pixel is the ink itself (**240.7** against 240.7), so the element's colour is what paints |
| the shipped `Input` (`@gpuixui/primitives`) | its hint is the `placeholder` role and paints **none** of the runtime's grey; once typed, the hint is gone and the value's peak is the seam's ink |

The probe is the measurement behind two contract sentences. The `placeholder`
role never reaches a host's hint, so a field that wants a readable hint paints
it — the second row is the workaround and the last is the shipped `Input` doing
it (the primitives' window half of the themed-placeholder row). And the theme
object's `text` **does not reach an `<input>`'s value**: the platform default
paints instead, which is near-black on a dark fill. The library's own fields set
`color` from their recipe, so a shipped field is readable — the last row reads
that ink back — while a consumer following the token page's bare
`<input theme=…>` snippet is not. That sentence is an interlock row in `TODO.md`
(owner: tokens-theme and docs-site).

The exact-colour counts work because a `<text>` and the runtime's own hint have
solid glyph cores; a native value's glyphs are antialiased and never reach their
pure colour, so the value is read as a **peak** luminance against the ink's own,
with `INK_PEAK_TOLERANCE` (12) as the window. 22 checks, `--only field-ink`,
green on 0.11.0 (~4 s). Negative control, measured: dropping the seamed field's
`color` (the same value typed into a host carrying only the theme object) fails
`a value paints the colour the field sets, not the theme's text`
(`expected true, got false`, exit `1`). Evidence:
`.artifacts/live/{field-ink-rest,field-ink-plain,field-ink-seamed,field-ink-shipped}.png`.

### `checkbox-toggle` — measured on 0.11.0 here

The shipped `Checkbox` from `@gpuixui/primitives`, controlled, with a readout of
`checked` and the number of changes. Two activation paths, because they prove
different layers:

| Step | Check |
| ---- | ----- |
| mount | `checked=false changes=0` |
| press the box | `checked=true changes=1` — the painted box is hit-testable and the press reaches `onCheckedChange` |
| `Space` press + release | `checked=false changes=2` — the runtime routes the key to the focused `div role="checkbox"` |

The second path is the component's **own** keyboard contract, and measuring it
found a gap in the live harness: a window's automation `keystrokes` delivers the
key **down** and no `keyUp` (the probe's listener read `keys=D:space `), so
`onKeyUp` — where Space activates, the way a browser button does — never fired.
The host therefore gained `keyUp(keystroke)`, released through the renderer's
`simulateKeyUp`, and `AsyncSmokeHost` documents the split. Negative control,
measured: pressing Space without releasing it leaves the readout at
`checked=true changes=1` and fails `Space toggles the focused checkbox` (exit
`1`).

### `tabs-lifecycle` — measured on 0.11.0 here

The shipped `Tabs` (`@gpuixui/components`), four triggers with `settings`
disabled and a controlled value the readout prints. The measured selected
surface (`tabs-indicator`) is what makes this a window probe: `bounds` reads the
runtime's own geometry for the pill and the trigger, so the assertion is that
the pill covers the selected trigger, not that a screenshot looks right.

| Step | Check |
| ---- | ----- |
| mount | `value=overview changes=0`; the pill is within 2px of the trigger's `x`, `width` and `height`; `tabs-panel-reports` has no bounds |
| `Tab` | focus is `tabs-overview`; the trigger's `onFocus` counter is **0** — a window's traversal moves the focus without running the handler (three runs on 0.11.0, 2026-10-22) |
| first `right` | focus is `tabs-reports`, `value=reports changes=1`, the reports panel paints and the overview panel has no bounds; the pill moved to the reports trigger |
| second `right` | focus is `tabs-archive` — the disabled `settings` is skipped — `value=archive changes=2` |
| `Home` / `End` | `value=overview changes=3`, then `value=archive changes=4` |
| press `tabs-reports` | `value=reports changes=5`, the pill follows the pressed trigger |
| press `tabs-settings` | the readout does not change — a disabled tab ignores a press |

**The bug this probe found, and the fix it measures.** A window's `Tab`
traversal focuses a trigger **without running React's `onFocus`** (measured at
`focuses=0`, three runs on 0.11.0 on 2026-10-22), so a row seeded only from
`onFocus` was empty and the first arrow re-anchored at the first enabled tab.
`@gpuixui/components` fixed it in `moveOrigin` (`src/tabs/logic.ts`), which
anchors a move on the trigger that sent the key (`event.elementId`), then the
recorded row, then the selection. That is why the probe keeps asserting the
traversal's counter at **0**: the anchor, not the handler, is what makes the
first arrow move off the traversal's tab. **The two hosts disagree, and only the
window is authoritative here** — the offscreen `focus-traversal` scenario reads
`focusNext` dispatching `onFocus` (`traversal dispatched onFocus`), which is a
`TestRenderer` fact that does not survive into a real window. A component may not
be held to "it gets an `onFocus`" on the strength of the offscreen suite.
`src/live/focus-delivery.test.ts` holds this paragraph, the table row and both
probe assertions to that measurement, and the offscreen scenario to its own.

27 checks, `--only tabs-lifecycle`, green on 0.11.0; the paint guards
`paintedBox` adds are counted in that number. Negative controls measured:
dropping `disabled` fails `the arrow skips the disabled trigger`
(`expected "tabs-archive", got "tabs-settings"`), and moving the expected pill
40px fails `the pill starts on the selected trigger's left edge`
(`expected 61 ± 2, got 21`), exit `1` each.

### `slider-lifecycle` — measured on 0.11.0 here

The shipped `Slider` (`@gpuixui/primitives`), controlled, with a second disabled
track beside it. The checks are the two input paths this probe owns — a press
anywhere on the track and the keyboard. The drag path is measured separately by
`pointer-capture`, which drags this same component off its track and proves the
value follows: the runtime **does** capture the pointer for an element that
listens to both `mouseDown` and `mouseMove`.

| Step | Check |
| ---- | ----- |
| mount | `value=0 changes=0 centred=false` |
| press the middle of the track | `centred=true changes=1` — the hit-test read the track's box and turned the pointer's x into a value near 50 |
| `Home` | `value=0 changes=2` |
| `End` | `value=100 changes=3` |
| `ArrowLeft` / `ArrowRight` | `value=99 changes=4`, then `value=100 changes=5` |
| press the disabled track | the readout does not change |

10 checks. Captures: `.artifacts/live/slider-pressed.png` and
`slider-keys.png`. Negative control, measured: making the interactive track
`disabled` fails `a press in the middle of the track moves the value there`
(`expected a string containing "centred=true", got "value=0 changes=0
centred=false"`, exit `1`).

### `list-lifecycle` — measured on 0.11.0 here

The shipped `List` selection model in a window. The list is the keyboard and
selection foundation the menus and tabs reuse: a roving tab stop, arrow moves
that skip disabled rows, Enter/Space activation, Home/End, type-ahead, and
`Cmd+A` / `Shift+Arrow` in multiple mode. Its 38 behaviour tests run in a
`TestRenderer`; a window is where a key event has to bubble from the **focused
row** to the list, which is the origin rule `list/origin.ts` exists for.

Two lists share the five rows (`ada`, `grace`, a disabled `alan`, `linus`,
`margaret`), one single-select and one multiple-select, each with its own
readout.

| State | Measured |
| ----- | -------- |
| a press on `Grace` | `selected=grace changes=1 activates=1` and the focus is the pressed row |
| `down` | focus moves to `Linus` — the disabled `alan` is skipped — and the selection does not move |
| `Enter` | selects the focused row and runs its action (`selected=linus changes=2 activates=2`) |
| `up`, then `Space` and its release | `selected=grace changes=3`; the action count stays `2`, because Space selects and never activates |
| `Home` / `End` / `Enter` | focus reaches `Ada`, then `Margaret`, and Enter selects the row End reached (`changes=4 activates=3`) |
| typing `g` | focus jumps to `Grace` without selecting; the next Enter acts from there (`changes=5 activates=4`) |
| a press on disabled `Alan` | selection and activation do not change, though the pointer **does** focus the row; `Enter` still chooses nothing and `down` leaves it for `Linus` |
| multiple: press `Ada` | `selected=ada changes=1` (a plain press replaces) |
| `Shift+down` | extends from the pressed row (`selected=ada,grace changes=2`) |
| `Cmd+A` | selects every enabled row (`selected=ada,grace,linus,margaret changes=3`) |
| a press on `Grace` | replaces the select-all (`selected=grace changes=4`) |
| a press on disabled `Alan` | leaves it (`changes=4`) |

23 checks, `--only list-lifecycle`, green on 0.11.0. The disabled-row detail is
the measured part worth keeping: a row that cannot be chosen can still take the
pointer's focus, because the press focuses whatever has a tab index — the
component refuses only the selection and activation, and the arrow path leaves
the row.

Two negative controls measured, each exit `1`: enabling `alan` fails
`down skips the disabled row` (`expected "single-row-linus", got
"single-row-alan"`), and dropping the list's `onActivate` fails the press check
(`expected "selected=grace changes=1 activates=1", got "… activates=0"`).
Evidence: `.artifacts/live/list-single.png`,
`.artifacts/live/list-multiple.png`.

### `tooltip-lifecycle` — measured on 0.11.0 here

The shipped `Tooltip` (`@gpuixui/primitives`) in a window. A tooltip has no state
a caller can read, so the probe measures it the way the frame reports it: its
**text** through the renderer's `getPaintedText`, and its **box** through the
content's own `onLayout`. That second choice is a measured limitation, not a
preference: the automation tree does not address a tooltip's layer, so
`text("tooltip-content")` reports `Locator did not match any element` while the
tip's text is painted.

| Step | Check |
| ---- | ----- |
| mount | the tip's text is not painted; `enters=0 leaves=0` |
| `Tab` | focus lands on `tooltip-trigger` and the tip **stays closed** — a traversal moves the focus without running the trigger's `onFocus` (three runs on 0.11.0, 2026-10-22) |
| `Escape` after the traversal | no tip to dismiss; it stays closed and the focus stays on the trigger |
| hover the trigger | `enters=1`, the tip paints its content, and the layout report puts it **above** the trigger on `side="top"`, overlapping it horizontally |
| hover a sibling | `leaves=1` and the tip stops painting — leaving closes it (80ms close timer) |
| hover again, `Escape` | the tip paints again, then Escape dismisses it while the focus stays on the trigger |

14 checks, `--only tooltip-lifecycle`, green on 0.11.0; capture
`.artifacts/live/tooltip-open.png`. Negative control, measured: mounting the
trigger without the `Tooltip` wrapper fails
`a hover opens the tip with its own content` (`expected true, got false`,
exit `1`).

**The wait is a poll, not a sleep.** Every state above is read from the frame
after the probe polls it: `settleTip(wanted)` re-reads `getPaintedText` every
40ms until the tip's paint state matches, bounded at 50 attempts (~2s), and the
assertion that follows names what it actually read. A fixed 240ms sleep passed
the close path on an idle box and failed `leaving the trigger closes the tip`
once while a production docs build shared the machine — the frame, not the
timer, is what the probe needs. Re-reading without waiting is not a substitute:
polling for the closed state immediately after a hover (the wrong state, so the
poll returns at once) fails `the pointer enters the trigger`
(`got "enters=0 leaves=0 above=true overlaps=true tip=227 anchor=252"`) and
`a second hover reopens the tip` (`expected true, got false`), which is that
direction measured.

**The on-screen caption now says what the checks measure** — "a hover opens it
above its trigger, and leaving or Escape closes it. A Tab traversal focuses the
trigger without running its onFocus, so the tip stays closed."

**Measured gap: a traversal does not open the tip.** An earlier section of this
file claimed it did, after one run read the counter at 1. Three runs at HEAD on
2026-10-22 read the opposite: the traversal focuses `tooltip-trigger`
(`getFocusedElementId` reports it) and React's `onFocus` never runs, so the
runtime — which opens the tip on focus — leaves it closed for the whole ~2s the
poll waits. The earlier read was not a frame too early; the two hosts genuinely
differ. The offscreen `focus-traversal` scenario proves `focusNext` **does**
dispatch `onFocus` in the `TestRenderer`, so a headless suite cannot stand in
for this check. A keyboard user therefore has **no open path** for a tip in a
window; hover is the only one, and the tip's text still reaches assistive
technology as the trigger's `aria-description`. The primitives' page and the
capability record carry the same limitation; `src/live/focus-delivery.test.ts`
holds this file, both probe assertions and the offscreen scenario to that
measurement.

`AsyncSmokeHost` gained `hover(testId)` for this: the automation protocol's own
`hover` moves the pointer onto the element's centre without pressing, which is
what fires the enter/leave pair. A press would fire the trigger's close handler
instead, so it cannot stand in for hover.

### `drag-between-panes` — measured on 0.11.0 here

A cross-pane drag, the feasibility question a drag-and-drop component has to
answer. The item records the press; each pane listens for the travel and the
release over itself, and the readout names the side that resolved the drop.
Automation sends real `mouseMove` events with the button held, so this is a
pointer drag rather than a synthesised down/move/up.

| Step | Check |
| ---- | ----- |
| mount | `zone=left leftMoves=0 rightMoves=0 drops=0 dragging=false` |
| drag the item to the right pane's centre | `zone=right drops=1 dragging=false`, and the right pane counted the move travel |
| drag it back to the left pane | `zone=left drops=2 dragging=false`, and the left pane counted the return travel |

The measured lesson is a **timing** one, and it shapes the component: the
protocol delivers the whole drag — press, eight moves, release — before React
commits the render the press scheduled. A handler that gated on `dragging`
**state** therefore saw `false` for every move and the drag never started. The
press flag must be synchronous (a ref); state is only for the readout. The
second fact is the capture rule (`pointer-capture` probe): only an element that
listens to both `mouseDown` and `mouseMove` keeps the pointer. The item here
listens to `mouseDown` alone, so it captures nothing and the pane under the
pointer sees every move and resolves the release; a drag handle that wants the
moves after leaving its box must also subscribe to `mouseMove`.

`AsyncSmokeHost` gained `drag(testId, deltaX, deltaY)` for this, implemented with
the protocol's real drag (eight interpolated moves with `pressedButton` set).
Captures: `.artifacts/live/drag-right.png` and `drag-left.png`. Negative control,
measured: forcing the release's side to `left` fails `the drop lands in the right
pane` (`expected a string containing "zone=right", got "zone=left leftMoves=3
rightMoves=4 drops=1 dragging=false"`, exit `1`).

### `dialog-lifecycle` — measured on 0.11.0 here

The first live probe of the **Tier 2 components** rather than a primitive: the
shipped `Dialog` (`@gpuixui/components`), uncontrolled, with a readout of what its
`onOpenChange` reported. A unit suite can press a synthetic key into the
`TestRenderer`; this probe asks whether the same contract holds in a window where
the automation protocol, not the test harness, delivers the press and the key.

| Step | Check |
| ---- | ----- |
| mount | `opens=0 closes=0`, and `dialog-content` has no bounds — a closed dialog paints nothing |
| `Tab` with the dialog closed | focus lands on `dialog-trigger` — the control for the trap check below: a leaked focus would be named |
| press the trigger | the surface paints with a non-zero box, focus is `dialog-content`, the readout reads `opens=1` |
| `Tab` × 6 | the focus never names `dialog-trigger`, reaches both fields inside the surface and cycles back to the first one (the surface itself is `tabIndex: -1`, so the wrap is the first stop) |
| `Shift-Tab` | stays inside the surface too |
| `Escape` | the surface has no bounds again, focus returns to `dialog-trigger`, the readout reads `closes=1` |
| press the trigger, then the dialog's own `DialogClose` | the surface paints again and closes, `opens=2 closes=2`, focus is back on the trigger |

19 checks. The Tab half is the window-only claim: `DialogContent` handles Tab
itself (`focusNextWithin` + `preventDefault`), so a window that delivered the key
to its default traversal instead would move the focus out. Two focusable stops
are the probe's own (`dialog-field-a`, `dialog-field-b`), and the dialog's
built-in top-right close control is deliberately left unnamed: it is a stop with
no `testId`, so one reading is `none` — which is why the assertion is that the
trigger is *never* reached, not that every reading is a known id.

Negative control, measured: `dismissible={false}` (an
uninterruptible dialog) fails `Escape unpaints the dialog surface`
(`expected true, got false`, exit `1`), which is the check's real subject — the
dismiss stack, not the paint. Captures: `.artifacts/live/dialog-open.png` (the
veil over the whole window, the surface centred) and `dialog-closed.png`.

The veil is an `anchored` element sized from the window, so the probe's root has
to **fill** the window: mounted inside a 720px column the veil covered only that
column, which is the documented "dim only its parent's box" behaviour rather than
a defect.

### `surface-fade` — measured on 0.11.0 here

The half of the presence seam (`packages/components/src/internal/presence.tsx`)
that no bounds check can prove: a surface **fades** into its resting frame. The
runtime's style report sees geometry, not paint, so the probe reads the frame —
the shipped `Dialog` opens over a page the probe fills white, and every reading
is the pixel at one point inside the content's own left padding, where nothing
but the surface paints.

The reading is taken on the renderer's **motion clock**, not on wall time. A
software renderer can block a paint longer than the 320 ms tween (measured: a
first paint of the dialog held the JS thread ~1 s), so "capture 107 ms after the
press" raced the frame it named — the wall-clock probe passed on a warm run and
read a resting surface on a cold one. The automation surface exposes the clock
the motion states are computed from, so the probe freezes it before the press,
advances it by an exact offset and captures the frame at that progress; the paint
can take as long as it likes, the progress cannot drift.

| Step | Check |
| ---- | ----- |
| mount | the palette resolves the surface colour, and a closed dialog paints no bounds |
| freeze the clock, press the trigger | the readout reaches `opens=1`, the content paints a box, and the first frame is the **page** (`rgba(255, 255, 255, 255)`) — the mount is at opacity 0 and the clock cannot move it |
| advance to 107 ms (a third of the level) | the clock reports exactly `+107`, and the pixel is a **mix** of the surface and the page: `rgba(141, 142, 145, 255)` — the frame the fade produced, not a cut |
| advance to 400 ms (past the level) | the pixel is the surface's own colour exactly: `rgba(34, 39, 48, 255)` = `#222730`, the dark palette's `popover` |
| resume, press the reduce control, `Escape` | the surface unpaints and the readout reads `preference=reduced` |
| freeze again, open again | the pixel is **already** the surface's own colour under the same frozen clock — the journey is removed, not the resting frame; `opens=2 closes=1` |

23 checks. The frozen clock is also what makes the reduced half a real control:
an animated surface under the same frozen clock stays at opacity 0, so a
preference the runtime ignored could never paint the surface there. The fixture's
own suite (`src/live/fade.test.ts`, 8 cases) holds the duration to
`motionLevels.slow`, the level to the dialog's `useSurfaceTiming("slow")`, both
clock offsets to the level in both directions, and the partial-frame predicate to
the page and the surface.

Negative control, measured: rendering the surface under `MotionProvider
preference="reduced"` for the first phase fails `a frozen mount paints the page,
not the surface` (`expected true, got false`, exit `1`) — the frozen frame is the
resting one, which is exactly the difference the preference makes.
Captures: `.artifacts/live/fade-{frozen,partial,settled,reduced}.png`.

The probe also paid for a decoder fix: one 1800×1040 capture took **4.2 s** to
decode because the PNG filter was dispatched per byte. Resolving it once per row
(`packages/testing/src/pixels.ts`) takes the same frame in **254 ms**, and the
capture-bound probe from 24 s to 6 s. `pixels.test.ts` gained the three filters
that had no decoded-byte case (Up, Average, Paeth) and the unknown-filter
rejection; swapping Average and Paeth in the table fails both cases by name.

### `menu-lifecycle` — measured on 0.11.0 here

The shipped `DropdownMenu`. A menu's highlight is real focus, so every step reads
the renderer's focused testId rather than a painted colour: an arrow key that
moved a highlight without moving focus would fail here.

| Step | Check |
| ---- | ----- |
| mount | `last=none`, no menu surface |
| press the trigger | the surface paints |
| `Escape` | the surface unpaints and focus returns to `menu-trigger` |
| `ArrowDown` on the trigger | the menu opens **from the keyboard** and focus lands on `menu-rename` |
| `ArrowDown` again | focus moves to `menu-delete` |
| `Enter` | `last=delete`, the surface unpaints, focus returns to the trigger |
| press the trigger, press `menu-rename` | `last=rename`, the surface unpaints |

13 checks. Negative control, measured: dropping the second `ArrowDown` fails
`an arrow key moves focus to the next row`
(`expected "menu-delete", got "menu-rename"`, exit `1`). Captures:
`.artifacts/live/menu-open.png`, `menu-closed.png`.

### `context-menu-lifecycle` — measured on 0.11.0 here

The shipped `ContextMenu` (`@gpuixui/components`) — the one overlay whose opening
input is a **right press**. The headless suites synthesise the aux click
themselves, so a window had never delivered one: the trigger opens on
`onAuxClick` with `isRightClick`, and a primary press carries neither field. The
probe also mounts a sibling that is **not** the trigger, because the menu is
scoped to its trigger.

| Step | Check |
| ---- | ----- |
| mount | `opens=0 closes=0 last=none`, and no menu surface paints |
| left press the trigger | still no surface — a primary click is not an aux click |
| right press the trigger | the surface paints, `opens=1`, and its own box starts at the **press point** on both axes (the locator presses the painted centre) |
| the same open | the surface itself holds the focus (`autoFocus`), so the keys reach the menu |
| `ArrowDown` ×2 | focus moves row by row: `context-rename`, then `context-delete` |
| `Enter` | `last=delete`, the surface unpaints, `closes=1` |
| right press, then `Escape` | unpainted and `closes=2`, and the focus reads **`none`** |
| `Shift+F10` on the focused trigger | `opens=3`; the surface's left edge is the trigger's, its top the trigger's bottom — the keyboard route places from the trigger's own bounds, not the pointer, and both axes are read at rest (`201` mid-entry, `204` at rest) |
| `Escape` | focus is back on `context-trigger` — the keyboard route restores it |
| right press a sibling (menu closed) | nothing opens |
| right press the trigger, then the sibling | the open surface dismisses; `opens` stays 4, so the outside press opened no second menu |

22 checks, `--only context-menu-lifecycle`, green on 0.11.0. The probe needed a
new host verb: `AsyncSmokeHost.rightClick(testId)` presses the element's centre
with button 2 through the protocol's locator (`host.ts`'s `rightPress`), and its
unit test holds the button number — a primary press would silently turn the
probe into a no-op.

Negative control, measured: pressing the trigger with the primary button
(`rightClick` → `click`) fails `a right press opens the menu`
(`expected a string containing "opens=1", got "opens=0 closes=0 last=none"`,
exit `1`). Captures: `.artifacts/live/context-open.png` (the surface over the
card at the pointer) and `context-closed.png`.

Two measured consequences:

1. **A pointer-opened context menu leaves the focus nowhere when it dismisses.**
   The pointer open records no restore target (the pointer is already where the
   reader put it), so Escape and an outside press leave the native focus `none`;
   the keyboard route is the one that hands it back. Measured above in both
   directions, and the behaviour is deliberate in `ContextMenu`'s state — a
   consumer that opens the menu from its own shortcut should go through
   `Shift+F10` or a controlled `open` if it wants focus restored.
2. **A right press outside the trigger closes the open menu and opens nothing.**
   The trigger is the only element with an aux-click handler, which is the
   documented scope: another target's context menu is a second `ContextMenu`
   mount, not a repositioned one.

### `motion-geometry` — measured on 0.11.0 here

The runtime's `motion` measured on **painted geometry**. Two inventory rows name
it — Tier 3's "expandable rows" (`motion` height) and Tier 4's "collapsible
sidebars" (`motion` width, as an outer clipping box) — and neither had a window
measurement: a `TestRenderer` frame is not a run. A 120×40 box tweens to 240×240
with `transition={{ duration: 3, ease: "easeInOut" }}` and holds a fixed 320×200
child.

| Step | Check |
| ---- | ----- |
| mount | the box is 120×40 |
| the child inside it | 320×200 although the box is 120×40 — the box **clips**, it does not reflow the content |
| grow press, eight heights ~50ms apart | `40, 43, 117, 123, 221, 240, 240, 240` — a tween, not a jump |
| settled | 240×240, and `onMotionComplete` fired once |
| the child again | still 320×200 — the larger box did not stretch it |
| shrink press, eight samples | `240, 240, 167, 63, 59.5, 40, 40, 40` — the reverse run tweens too |
| settled | 40 high again, `completes=2`, the child still 200 tall |

35 checks, `--only motion-geometry`, green in three consecutive runs (each
alongside `context-menu-lifecycle` and `pointer-capture`, so the result does not
depend on being the first probe). The negative control is
`transition={{ duration: 0 }}`: it fails
`the growth paints a frame between the two sizes` (exit `1`), so the check really
is observing the run rather than the two target sizes. Captures:
`.artifacts/live/motion-grown.png`, `motion-shrunk.png`.

What it settles:

1. **`motion` animates in a window and lands exactly on a numeric target**, so an
   expandable row or a collapsing sidebar can animate height/width — and
   `onMotionComplete` fires once per run (measured twice), which is what an
   "animate, then unmount or unlock" step needs.
2. **The animated box clips its content.** The 320×200 child keeps its size while
   the box is 120×40 and while it is 240×240, so a width collapse does not
   re-layout the panel inside it: a collapsible sidebar animates its **outer**
   box with `overflow: "hidden"` and the content stands still. That is the Tier 4
   row's claim, now measured.
3. **What it does not provide:** no `transform`, so nothing slides (the
   carousel's documented limitation stands), and the animation is a box-geometry
   tween, not a spring. `animate` is required — `motion` is not Framer Motion.
4. **`duration` is not a wall-clock promise.** The same 200px travel was sampled
   as a ~100ms step (`40, 115.5, 240`), a ~250ms tween (the table above) and a
   ~400ms sweep for a declared 5s, in different runs of the same window. A
   component must drive its next step from `onMotionComplete`, never from a
   timer that assumes the number.

**Two measured probe caveats**, both recorded in the steps' header:

- A screenshot stalls the animation clock, and the run then completes early once
  frames resume: with a capture taken between the press and its samples the box
  read `240, 238, 40, 40` instead of tweening. The captures here therefore come
  **after** every timed run, with a settle between them.
- A probe must not press the instant it mounts. Run after another probe's
  screenshot, the growth's intermediate frames were missed altogether
  (`expected true, got false`); with an 800ms settle after `waitFor` the same
  three-probe selection passed three times in a row. The probe settles first for
  that reason, and samples eight times so one unlucky frame cannot decide it.

### `toast-lifecycle` — measured on 0.11.0 here

The shipped toast system in a window. `ToastProvider` owns a `ManagedRuntime` and
an Effect store, so this probe also proves that an Effect-backed store runs off
the test clock: the queue is pushed, painted and dismissed through the real
window, with the store's timers live.

| Step | Check |
| ---- | ----- |
| mount | `queued=0` |
| press Publish | `queued=1` (read from `useToast()`) and the viewport's text contains `Changes published` |
| press the card's dismiss control | `queued=0` and the card leaves the viewport |

4 checks. Negative control, measured: dropping `<ToastViewport />` — a provider
with no viewport — fails `text toast-viewport: Locator did not match any element`
(exit `1`), so the viewport check is not reading the store's own state. Captures:
`.artifacts/live/toast-queued.png` (the bottom-right stack over the page) and
`toast-dismissed.png`.

**A root-level fragment paints one child.** The toast probe first mounted
`ToastProvider` as its root, whose children are two siblings (the panel and the
viewport). The window painted only the second: the automation tree listed just the
viewport and `getPaintedText()` was empty for the panel. Two sibling host elements
*inside* a host element paint normally (measured), so the rule is about the render
root: every probe here mounts exactly one wrapper element, and the toast provider
is mounted inside it. This is a runtime quirk, not a probe workaround — record it
before nesting a provider at a window's root.

### `command-palette` — measured on 0.11.0 here

The shipped `CommandMenu` — the Tier 4 command palette — in a window. The palette
is controlled and has no trigger part (an application opens it from a shortcut),
so the probe's own button stands in for that shortcut, and a readout reports what
React received: the difference between a **highlighted** row and an **executed**
one.

| Step | Check |
| ---- | ----- |
| mount | `ran=none runs=0`, and the closed palette paints no surface |
| press the trigger | the surface paints and the **search field** holds the focus |
| `ArrowDown` | the field **keeps** the focus — the highlight moves, the focus does not |
| `Enter` | `ran=open-settings runs=1` — the *second* row ran, so the arrow really moved the highlight |
| the palette | closes itself when an action runs, and the focus returns to `palette-trigger` |
| press, type `theme` | only `Toggle Theme` paints; `New File` is filtered out; no empty state |
| `Enter` | `ran=theme runs=2` — the filtered row ran |
| press, type `zoom` | the **disabled** row still paints |
| `Enter` | nothing runs and the palette stays open |
| `Escape` | the palette dismisses and the focus returns to `palette-trigger` |

16 checks. Captures: `.artifacts/live/palette-open.png` (the field, the two
groups, the disabled row muted), `palette-filtered.png` (the field holding
`theme`, one row left) and `palette-closed.png`.

The design claim is the one a browser-shaped test cannot make: the highlight is
**not** focus. If the arrow key moved the focus instead, the typing would stop
after the first keystroke, so the filter check would fail by name — the two
checks together are the contract.

The focus return is the fixed half of the gap this probe originally measured:
the field no longer carries `autoFocus`, so the dialog focuses it through
`initialFocus` after recording its opener, and both close paths hand the focus
back to the palette's trigger. Negative control, measured: expecting `none`
fails `closing the palette returns the focus to its opener`
(`expected "none", got "palette-trigger"`, exit `1`). `modal-focus-restore`
below still measures the remaining raw-`autoFocus` case.

A **reopen** is its own wait. The palette's close runs the dialog's exit tween,
and a press sent during it is dismissed by the layer that is closing instead of
opening the surface again — measured as a full-pass failure (`the runtime paints
command-zoom: expected a value, got none`). `openPalette` therefore waits for the
surface to be gone, then painted, then `command-input` focused before a step
types into it; a palette that never focuses its field still fails the focus check
after the wait, on `none`.

### `popover-lifecycle` — measured on 0.11.0 here

The shipped `Popover` in a window: where it opens, and the three ways it leaves.
The placement claims are the runtime quirks the component compensates for, so the
checks are about the compensation rather than about the runtime's raw behaviour.

| Step | Check |
| ---- | ----- |
| press the trigger | the panel paints below the trigger, on its start edge, one measured gap down (the gap is read at rest: the entry tween first painted `0.5` for `6`) |
| press the `align="center"` trigger | the panel's centre is the trigger's centre line (the runtime would centre on the containing block) |
| press a trigger 40px from the window's bottom | the panel opens **above** it, and `Escape` returns the focus to that trigger |
| `Escape` on the default panel | the panel unpaints and the focus is back on its trigger |
| press outside | the press reaches the control it landed on (`presses=1`) and the panel unpaints |
| press inside the panel | the panel stays open (polled for the painted state, so a surviving surface does not spend the poll's budget) |

17 checks. Two negative controls, measured: dropping `align="center"` fails
`a centred panel is centred on its trigger` (`expected 127.5 ± 1, got 192`, exit
`1`), and moving the low trigger up the window fails `a panel with no room below
opens above its trigger` (`expected true, got false`, exit `1`) — both restored,
green. Captures: `.artifacts/live/popover-open.png`, `popover-centred.png`,
`popover-flipped.png`.

**The probe's own layout is part of the measurement.** The outside-press target
first sat in the column under the triggers, where the open panel covered it: the
press landed *inside* the popover, so the readout stayed `presses=0` and the check
failed by name. A probe for an outside press needs a target no panel can reach;
the one here is pinned to the window's top-right. That is the same lesson as the
veil note under `dialog-lifecycle`, from the other direction.

### `modal-focus-restore` — measured on 0.11.0 here

The rule behind the gap above, measured with three modals that differ only in
what holds the focus while the surface is open.

| Case | What holds the focus while open | Focus after `Escape` |
| ---- | ------------------------------ | --------------------- |
| control: nothing focusable inside | the modal's own surface | **the opener** |
| the modal focused a field itself (`initialFocus`) | the field | **the opener** |
| a field took the focus at mount (`autoFocus`) | the modal's own surface | **the opener** |

6 checks. The control comes first, so the third row is about the field and not
about modals in general.

The mechanism, measured rather than inferred: the modal records who held the
focus **in the render that opens it**, before the surface's children exist, so
a child's `autoFocus` cannot become the restore target. That is the rule in
`packages/components/src/internal/modal.ts`, and it makes the third row hold
for a consumer's own field, not just for the shipped `CommandMenu` — which
still focuses its search field through `initialFocus` after the opener is
recorded.

### `content-surfaces` — measured on 0.11.0 here

What a chart or an image preview can actually draw with: SVG markup, an `<img>`
two ways, and a `<canvas>`. Each surface carries a colour no theme paints, and
the probe counts that colour's exact bytes in the capture, so every claim below
is read out of the frame rather than inferred from the element type.

| Surface | Measured |
| ------- | -------- |
| `<svg source>` with a whole chart | paints, but as **one tint** — the `style.color` value. The probe paints all five shapes and asserts the markup's own `fill` never reaches the frame |
| one `<svg>` per layer, stacked | each layer paints its own tint: bar green, bubble blue, line red, axis yellow, label orange — a multi-series chart is five overlaid `<svg>` elements |
| `<text>` inside the SVG | **paints** (the label's orange is in the frame), so series/axis labels can live in the chart markup |
| `<img src="data:image/png;base64,…">` | paints its bytes |
| `<img>` + `ref.setImagePixels(8, 8, pixels)` | paints, **only from a layout effect**; from a passive `useEffect` the element keeps its `img: no src` fallback |
| `<canvas>` | a blank host element: it tracks no painted bounds and paints nothing, so the fill behind it shows through |

The mechanism for the SVG row is `@gpuix/native`'s `SvgElement`: it renders
through GPUI's icon element, which rasterises the markup and paints the result in
`style.color`. That is why a tinted mask is the whole story and why a chart has
to stack one element per colour.

21 checks. Two negative controls were measured, each exit `1`: tinting every
layer with the single-source tint fails `the bar layer paints its own tint`
(`expected true, got false`), and moving the pixel upload into a `useEffect`
fails `an image paints a pixel buffer set after mount` (same message).

The consequences for the component inventory:

- **Charts are buildable** from SVG, with one `<svg>` per series colour; a
  gradient or a per-shape palette inside one element is not available.
- **Image preview and avatar bytes work** both ways, but the pixel route must
  upload before the frame paints — the upstream waveform example's `useLayoutEffect`
  is the pattern, not a preference.
- **`<canvas>` is not a drawing surface.** The capability matrix's reason is now
  a measurement: no retained context, no bounds, no paint.

Evidence: `.artifacts/live/content.png`; the fixtures and their guard live in
`src/live/content.ts` and `src/live/content.test.ts`.

### `scroll-lifecycle` — measured on 0.11.0 here

The window's own scroll path, which the headless `scroll-container` cannot
prove: the wheel is a **hit-tested** input here, both scroll events arrive, and
the offset clamps instead of overscrolling. The strip is 320×200 over 24 fixed
40px rows, so the content is exactly 960px and the end is exactly `-760`.

| Step | Check |
| ---- | ----- |
| at rest | `getScrollOffset` is `(0, 0)` and `onScrollChange` has reported `x=0 y=0` |
| wheel `-200` over a **sibling** | the strip has not moved and `onScroll` did not fire — the wheel reaches only the element under the pointer |
| wheel `-200` over the strip | the offset is the wheel's own delta (within 1px), `onScroll` fires once with `delta=-200`, and `onScrollChange`'s pair equals `getScrollOffset`'s |
| wheel `+100000` | clamps at `0`; no overscroll past the start |
| press "jump to end" | the last row's `scrollIntoView` lands the offset at `-760`, and the last row's painted box is wholly inside the viewport |
| wheel `-100000` | clamps at `-760`; no overscroll past the end |

20 checks (six of them the repeated `getScrollOffset` read). Two negative
controls measured, each exit `1`: removing `overflow: "scroll"` fails
`the scroller reports a scroll offset` (`expected a value, got none`), because
an element without a scroll handle has no offset at all; setting the expected
end to `-700` fails `scrollIntoView reaches the end of the content`
(`expected -700 ± 1, got -760`) — the clamp is the value, not a guess.

The two events report different things, and a scrollbar component needs both:
`onScroll`'s `deltaY` is the **input** the runtime received (the huge wheel
reports `-100000`, not the distance actually travelled), while
`onScrollChange`'s `scrollX`/`scrollY` is the clamped absolute pair the
renderer holds — which is what `ScrollArea`'s `onScrollChange` forwards.
Evidence: `.artifacts/live/scroll-end.png`.

### `nested-scroll-lifecycle` — measured on 0.11.0 here

A scroller inside a scroller: a dock pane's list inside the page's scroll root,
a dialog body's list inside the panel behind it. The window measured the wheel's
routing rule, and it is not "the innermost scroller takes it":

| Step | Check |
| ---- | ----- |
| at rest | both offsets are `(0, 0)`; the inner list is painted wholly inside the page's viewport, and the filler row a page-only wheel aims at starts below the list |
| wheel `-100` over the **inner list** | the list moves to `-100` **and the page moves to `-100` too**, though the list had 240px of its own travel left; the page's `onScroll` hears the wheel (`events=1`) |
| wheel `+100` over a **filler row below the list** | the page returns to `0` and the list stays at `-100` — the one wheel that moves a single scroller is the one that never reaches the other |
| wheel `-100000` over the inner list | the list clamps at `-340` (its content's end) and the page clamps at `-360` (its own): each scroller takes the **whole** delta and clamps against its own content, not against the other's end |
| readouts | the list heard both wheels aimed at it (`events=2`); the page counted all three, including the two aimed inside the list (`events=3`) |
| wheel `-100` over a **`<virtual-list>`** pane in the same page | the list paints past its first row **and the page behind it moves to `-100`** with `events=1` — the rule belongs to the native scroll host, not to the `overflow: "scroll"` box |

One wheel scrolls **every scrollable ancestor** on the hit path by the same
delta, and that holds for a `<virtual-list>` pane as well as for a div scroller.
There is no wheel handler and no `preventDefault` in the host props, so a pane
cannot keep a wheel from its page: a dock's outer layout must not be a scroller
around pane scrollers (size the workspace to the window and let each pane
scroll), and a page that does scroll will move together with a list inside it.
`onScroll` fires on the ancestor for a wheel aimed inside the descendant, so a
page listener cannot tell which scroller the reader rolled from the event alone —
read each scroller's own `onScrollChange` offset instead.

31 checks, `--only nested-scroll-lifecycle`, green on 0.11.0. Two negative
controls measured, each exit `1`: removing the page's `overflow: "scroll"` fails
`the nested-outer scroller reports an offset` (`expected a value, got none`),
and aiming the first wheel at the filler row instead of the list fails
`the inner list takes the wheel's own delta` (`expected -100 ± 1, got 0`) — the
rules are about these two scrollers, not about one shared offset.
Evidence: `.artifacts/live/nested-scroll.png`.

### `message-scroller-lifecycle` — measured on 0.11.0 here

The shipped `MessageScroller` in a real window: the first proof that its pin
rule survives a window's scroll channels. The headless suite drives the
renderer's wheel and `scrollIntoView` directly; here the wheel is a hit-tested
input, `scrollIntoView` has to paint in the press's frame, and the jump control
is a real press. Two transcripts share one geometry (28px rows, a 200px
viewport, a 1px tail): the shipped one measures the rules, and a plain scroller
that always follows proves the same verbs reach a scroller.

| Step | Check |
| ---- | ----- |
| at rest | `pinned=true`, no jump control, the offset is `-137`, and the last row is wholly inside the viewport |
| press "Append two" | still pinned; the offset follows to `-193` (exactly one 56px page) and the appended row is inside the viewport |
| wheel `+400` | unpins (`changes=1`), clamps at `0`, and the jump control appears as `Jump to latest` |
| press "Append two" while away | the offset stays `0`, the state is still `pinned=false`, the control reads `2 new messages`, and the arrived page waits below the viewport |
| the control transcript | its wheel lands at `0` and its append scrolls it to `-137` — the same verbs move a following scroller |
| press the jump control | pinned again (`changes=2`), the offset is `-249`, the control leaves, and the newest row is inside the viewport |
| wheel `+400`, append, wheel `-10000` | the page is counted (`2 new messages`); the wheel re-pins (`changes=4`, nothing unseen), the offset is `-305`, and the way back is gone |

42 checks, `--only message-scroller-lifecycle`, green on 0.11.0.

The control is the probe's input proof: an offset that "did not move" is also
what a dead append handler or a wheel aimed at nothing reads. The plain scroller
follows on every render, so the same presses move it to `-137`; a page that
arrives without a render fails that check before the shipped transcript's
unchanged offset is believed.

Two negative controls measured, each exit `1`: expecting the mount's `-137`
after the append fails `the pinned transcript follows the page by its own
height` (`expected -137 ± 2, got -193`), and controlling the shipped transcript
`pinned` makes the wheel-up land back at the end instead of `0` (`a wheel past
the top clamps the offset at zero: expected 0 ± 1, got -193`) — the yank the
unpinned rule exists to prevent.

Evidence: `.artifacts/live/message-scroller-end.png`,
`message-scroller-followed.png`, `message-scroller-unpinned.png`,
`message-scroller-unpinned-arrivals.png`, `message-scroller-jumped.png`,
`message-scroller-rerolled.png`.

### `split-pane-lifecycle` — measured on 0.11.0 here

The Tier 4 resize interaction in a real window. The split is the playground's
`SplitPane` — the fixture the headless `panel-resize`, `docking-nested` and
`workspace-tab-drag` scenarios drive — at 320px inside a 500px container, with
`min=80` and `max=520`.

| Step | Check |
| ---- | ----- |
| at rest | `split=320`; pane A paints 320px and the divider's left edge is pane A's right edge |
| drag the divider `+80` | `split=400`, and the painted pane is 400px, so state and paint agree |
| ...and the same drag's moves | all eight reached the divider, although it is 6px wide and the pointer ends 80px past it |
| drag `-320` | clamps at the 80px minimum |
| drag `+600` | clamps at the caller's 520px maximum |
| drag **pane A** itself `+40` | nothing resizes: only the divider is a handle |

Every drag stays inside the window on purpose: a drag that leaves the frame
would measure the OS's pointer delivery as well as the split.

12 checks. The window found the defect this probe now guards: the press was
React state, and a window delivers the press and all eight moves before React
commits the press's render, so the first move read no press and the pane never
followed. `SplitPane` holds the press in a ref now — the same finding as
`drag-between-panes`. Negative control measured: reverting the press to state
fails `a drag grows the pane by its travel` with the readout still `split=320`
(exit `1`). Evidence: `.artifacts/live/split-resized.png`.

The `moves=8` row is the pointer-capture measurement: the element that took the
press keeps receiving moves after the pointer leaves its box, which is what a
6px divider needs. The `pointer-capture` probe now isolates the runtime rule and
measures the shipped `Slider` against it, so the Slider pages' "no pointer
capture" sentence is retired rather than left as a competing claim.

### `virtual-list-lifecycle` — measured on 0.11.0 here

The Tier 3 virtualization path in a window: 5 000 fixed 32px rows in a 280px
viewport. The retained tree holds all 5 000 children, so the probe reads
`getPaintedText`, and it counts `onVisibleRange`'s own reports rather than
trusting the first one.

| Step | Check |
| ---- | ----- |
| at rest | the first row is painted, the last of 5 000 is not, and fewer than 40 row lines exist |
| at rest | no range has been reported yet (`first=-1 last=-1 reports=0`) |
| wheel `-400` | the painted window moves past row 0 (the capture shows rows 13–21), one report arrives, and it still starts at row 0 |
| wheel `-400` again | the second report has caught up to the window the first scroll reached (`first=12`, not 0) |
| wheel past the start | clamps back to row 0 |

10 checks. The measured limitation is the **lag**: a scroll's `onVisibleRange`
carries the range from *before* that scroll, so a table that reads the event
after a wheel paints the previous window. The headless `virtualized-table`
already compensates by choosing rows from the painted window; this is the same
rule measured with a capture, and the probe fails if an upgrade removes the lag
(so the note cannot outlive it). Second measured limit: `<virtual-list>` reports
no painted bounds of its own, so the wheel is aimed at the frame it fills and the
hit test still lands on the list.

Negative control measured: dropping the `onVisibleRange` handler fails
`the first report still starts at the first row (measured lag)`
(`expected true, got false`, exit `1`). Evidence:
`.artifacts/live/vlist-scrolled.png` — rows 13–21 painted beside a readout that
still says `first=0 last=9`.

### `window-shortcut-lifecycle` — measured on 0.11.0 here

The app-level key path a command palette or an application menu needs. The runner
installs the window handler once (`render({ onKeyDown })`) and forwards to
whatever the mounted probe registered with `useWindowKey` — the same seam the
shell uses, so the probe measures the shipped mechanism rather than a local
copy.

| Step | Check |
| ---- | ----- |
| at rest | `open=false last=none` |
| `cmd-k` | `open=true last=cmd-k`, and the palette's text is painted |
| `Escape` | `open=false last=escape` |
| press "another focus", then `cmd-k` | the focus read names `shortcut-other`, so the probe's own element is not holding it, and the palette still opens |

6 checks. Negative control measured: dropping the runner's `onKeyDown`
forwarding fails `cmd-k reaches the window handler`
(`expected "open=true last=cmd-k", got "open=false last=none"`, exit `1`) — the
window handler is the only path, so a probe cannot pass through an element
handler. Evidence: `.artifacts/live/shortcut-open.png`.

### `pointer-capture` — measured on 0.11.0 here

Whether a press keeps delivering moves after the pointer leaves the element is
the whole contract behind a splitter, a drag handle and a slider's track. The
runtime answers it in `renderer.rs`: it arms GPUI's pointer capture on left
mouse down **only** for an element that listens to both `mouseDown` and
`mouseMove`. The probe mounts both cases side by side — a 24px sample with the
pair and one with `onMouseMove` alone, each beside a 400px sibling that counts
its own moves — then drags each 120px right, ending over the sibling. It also
drags the shipped `Slider` 60px right and 120px down, so the pointer leaves the
track entirely. The shipped `RangeSlider` gets the same drag, because its two
thumbs are separate stops on one track and a capture rule that held for one
control need not hold for the pair.

| Sample | Listeners | Measured after the drag |
| ------ | --------- | ----------------------- |
| `capture-both` | `mouseDown` + `mouseMove` + `mouseUp` | `both=8 bothUnder=0 bothUp=1` — every move and the release went to the chosen element, 120px outside its box |
| `capture-move-only` | `mouseMove` only | `move=1 moveUnder=8` — the one move before the press landed on it, then the captured-or-not rule sent all eight drag moves to the sibling |
| `capture-slider` | the shipped `Slider` | `slider=66 sliderChanges=9` from a press at the track's centre and a release 120px below it, so the value followed the pointer's x while the pointer was off the track |
| `capture-range` | the shipped `RangeSlider`, `[10, 30]` | the same drag leaves `range=10-…`: the press picked the **nearer** end (the centre is value 50, closest to 30) and that end followed the pointer to ~65 while the other thumb stayed at 10 |

Six checks — one at rest and one per sample plus the range's "only the nearer
end moves" pair. Negative control measured: deleting the sample's `onMouseMove`
handler (so the runtime no longer arms capture) fails the first check with
`both=0 bothUnder=8 bothUp=0` — the sibling received the drag and the release,
exit `1`; restored, `--only pointer-capture` is green (6 checks, exit `0`).
Evidence: `.artifacts/live/pointer-capture.png`.

The consequence for the library: both shipped sliders **do** capture — the
`RangeSlider` drag is measured above, not inferred from the `Slider`'s — so the
limitation their source headers, `docs/slider.mdx`, `docs/range-slider.mdx`, the
`number-field.mdx` aside and the two `COMPONENTS.md` rows stated — "no pointer
capture; a drag that leaves the track stops" — was wrong. `primitives` retracted
it in those surfaces and added the headless twin
(`runtime/value.runtime.test.tsx`); this probe pins the window behaviour so a
runtime change fails here instead of moving the components silently.

### `clipboard-lifecycle` — measured on 0.11.0 here

A desktop library needs copy and paste on every surface it ships — a log viewer's
selected line, a table's row, a code view's block, a path in a field — and the
pinned binding publishes **no clipboard API**: `index.d.ts` and
`host.d.ts` carry no read and no write. The only clipboard a consumer can reach
is the platform's own text-input action inside a focused `<input>`/`<textarea>`.
The probe mounts two shipped `Input`s and drives the whole loop with real keys:
select all (`cmd-a`), copy (`cmd-c`), paste into the second field (`cmd-v`), then
select-all and cut (`cmd-x`) it back out. The value the second field reports
through `onChange` is the system clipboard's, round-tripped by GPUI.

The marker is **unique to each mount** (`gpuix clipboard` plus six random
characters): a fixed string would let a paste pass on the previous run's
clipboard without the copy having run at all. The app-level key log has its own
control — a `cmd-k` from a focusable control that has no key handler — so an
empty log cannot be mistaken for a broken handler registration.

| State | Measured |
| ----- | -------- |
| at rest | the source holds this mount's marker, the target is empty |
| the source is pressed | the focus lands on `clipboard-source` |
| `cmd-a`, `cmd-c` in the source | the window handler sees **nothing** — the field claims both keys |
| `cmd-v` in the target | its `onChange` reports the marker, and the source is unchanged |
| `cmd-a`, `cmd-x` in the target | its `onChange` reports `""` |
| `cmd-k` from a plain focusable control | reaches the window handler (`keys=k`), so the empty log above is the field's, not a dead seam |
| after the whole sequence | the log is still `keys=k` — the field keeps every clipboard key from the application |

Nine checks. Negative control measured: dropping `cmd-c` fails
`paste delivers the copied text into the second field` with the **previous**
run's marker (`expected "gpuix clipboard q6uuii", got "gpuix clipboard
pt6c88"`, exit `1`); restored, green twice in a row. Evidence:
`.artifacts/live/clipboard-pasted.png`.

The consequence for Tier 3/4: the platform's action belongs to the target, not
to the application. `selection-lifecycle` measured the other half — `Cmd+C` over
a **selected** `<text>` run reaches the clipboard too (the run a drag selected
pasted into a field intact) — so a user can copy a log line, a table's cell text
or a code block by selecting it. What an application cannot do is *initiate* a
copy: there is no write to the clipboard to call, and while a field has focus
none of the clipboard keys reach the window handler, so a "copy" button that
promised the OS clipboard would be a fake. The honest alternatives are the
user's own gesture on a selectable surface, or a read-only field holding the
text. The probe writes only its own marker to the system clipboard and never
reads what was there.

### `selection-lifecycle` — measured on 0.11.0 here

Text selection had one proof, and it was synthetic: the headless
`text-selection` scenario drives the renderer's own `dragSelect`, because the
offscreen renderer registers selection listeners during paint. So "a drag
selects" had never been produced by a **pointer** in a window. This probe drags
with the automation protocol — a real press, eight moves, a release — over the
shipped `Text` and asks two questions separately: does the wash paint, and what
does the renderer report?

The wash is the probe's own: the theme's `selection` role overridden to an
opaque `#00FF00` (`extendTheme`), because a capture is device-scaled and a count
of one exact colour is honest where a coordinate would depend on the scale. The
line's box hugs its text (`alignSelf: "start"`); with a stretched box the press
lands past the last glyph and selects nothing — measured while building the
probe, and the reason the first three runs reported no selection at all.

| State | Measured |
| ----- | -------- |
| before any drag | the wash paints `0` pixels |
| a drag from the line's middle past its right edge | the wash paints (`4 764` pixels of it), and `getSelectedText()` reports `ection world` |
| `Cmd+C` over that selection, pasted into a field | the field's `onChange` receives the same run — the platform's copy works for a selected `<text>`, not only a field |
| `clearSelection()` | the wash is back to `0` pixels |
| the same drag over the default `Text` | no wash: the chrome node opts out |

Nine checks. Negative control measured: dropping `selectable` from the line
fails `a pointer drag paints the selection wash` (`expected true, got false`,
exit `1`); restored, green. Evidence:
`.artifacts/live/selection-dragged.png` (the green run) and
`.artifacts/live/selection-before.png`.

What it means: a log viewer, code block or message row can really be copied by
dragging in the window, and an application can read the selected run with
`getSelectedText()`. Copying is the platform's own action — the app has no
clipboard write (see `clipboard-lifecycle`), so a component may offer "select
and copy" but cannot put arbitrary text on the clipboard from a button.

### `window-selection-lifecycle` — measured on 0.11.0 here

`selection-lifecycle` proves the wash and the renderer's `getSelectedText()`.
Neither tells the **app** that the reader picked something: a selection-aware
toolbar, an inspector that follows the text, or a "quote selection" action needs
the window-level event, and the runtime publishes exactly one route for it —
`render(<App/>, { onSelectionChange })`. No probe measured that route, so the
playground now *is* the app: it registers through the runtime's own seam
(`src/window-handlers.tsx`), records every change, and paints the count and the
last run it received.

| Gesture | Measured |
| ------- | -------- |
| a programmatic `clearSelection()` with nothing selected | the app's counter is the baseline the other rows are read against |
| a pointer drag over the selectable line | the counter rises and the last run the app received is the same run `getSelectedText()` reports (the drag starts mid-line, so it is the line's tail) |
| `clearSelection()` after that drag | the counter rises again and the change carries **no** run (`last=none`), so a toolbar can hide itself |
| the same drag over the non-selectable line | the counter does **not** move — a node that opted out publishes no change |

Eleven checks. Negative control measured: dropping `onSelectionChange` from
the runner's `render` call fails `a pointer drag publishes a window selection
change` (`expected true, got false`); restored, `--only
window-selection-lifecycle` is green three runs in a row.

What it means: an app can react to a selection, and the empty change is part of
the contract rather than a silence the app has to time out. Two limits are worth
stating: the payload carries the **joined text only** (`EventPayload.value`, and
it is absent for the empty change), so the app cannot tell which pane the run
came from, and there are no selection offsets — "comment on this line" is a line
click, not a selection range.

### `select-lifecycle` — measured on 0.11.0 here

The runtime's `Select` is the one overlay surface a window had never painted:
`COMPONENTS.md` says a select's "open state, positioning and dismissal are the
runtime's", and every proof for it was a `TestRenderer` case. The probe mounts
the runtime's own parts (`@gpuix/react/select`) rather than the shipped wrapper,
because the wrapper passes a **root** `testId` only — its trigger and its rows
paint with no id a locator can address. The parts are the ones the wrapper
composes, so the behaviour measured here is the behaviour it inherits. The
options are `Daily` (selected), `Weekly`, `Monthly` and a disabled `Archived`
last, so an arrow that starts on `Monthly` has to wrap past the disabled row.

| State | Measured |
| ----- | -------- |
| at rest | the trigger paints `Daily` and the readout is `value=daily changes=0`; the list is absent from the tree |
| one press on the trigger | the list paints in its own layer one `6`px gap below the trigger, on the trigger's start edge, and the focus moves **into the list** (`select-list`) |
| a press on `Weekly` | the readout becomes `value=weekly changes=1`, the trigger repaints with `Weekly`, and the list unpaints |
| the keyboard | the list opens with the selected row highlighted, one `down` moves the highlight off it and `Enter` selects the row it landed on (`value=monthly`) |
| a `down` from the last enabled row | wraps to `Daily`, not to the disabled `Archived` — the disabled row changes nothing and leaves the list open |
| `Escape` | unpaints the list, leaves the selection alone and gives the **focus back to the trigger** |
| an outside press | reaches the control it landed on (`presses=1`), unpaints the list and leaves the selection alone |
| a second press on the trigger | closes the list (the outside-press path, not a toggle) |
| a disabled select | ignores the press and keeps its label |

26 checks of the runtime's own parts, plus 10 on the shipped wrapper. Two
negative controls measured: dropping `sideOffset={6}` fails
`the list keeps the gap it was given below the trigger` with
`expected 6 ± 1, got 0`; enabling the disabled row fails
`an arrow skips the disabled row and wraps to the first enabled one` with
`expected "value=daily changes=3", got "value=archived changes=3"` — exit `1`
each, and restored green (`--only select-lifecycle`). Evidence:
`.artifacts/live/select-open.png`, `.artifacts/live/select-picked.png`.

The second half mounts the **shipped `Select`** through `triggerTestId` and
`itemTestId`, which is what makes the wrapper driveable from automation at all:
the root paints only its width, so a locator on it addresses nothing a press can
use. It opens on a press on `shipped-trigger`, selects `shipped-row-weekly` by
press (readout `value=weekly changes=1`, trigger repaints), chooses the next row
with `down`+`Enter` (`value=monthly changes=2`) and closes on `Escape` with the
focus back on its trigger. Negative control, measured: deriving the row locators
from a constant fails `a press on the shipped trigger opens its list` with
`expected true, got false` (exit `1`); restored, 36 checks green.

### `combobox-lifecycle` — measured on 0.11.0 here

The shipped `Combobox` in a real window. Its 21 behaviour tests run in a
`TestRenderer`, where `renderer.focusElement` lands immediately; a window is the
only place that proves the popup takes the focus from a press, that a typed query
filters the painted rows, that the arrow path skips a disabled row, and that
`Escape`/an outside press close it without stealing the focus back. Unlike the
`Select` wrapper, every part the probe addresses is exported test-id-able: the
trigger takes one, a row is `combobox-option-<value>`, and the surface, input and
empty slot have fixed ids.

The option order is the measurement: `ada`, `grace`, a disabled `alan`, then
`linus` and `margaret`. Three arrows from the top walk `ada` → `grace` → past
`alan` → `linus`.

| State | Measured |
| ----- | -------- |
| at rest | the trigger paints `Assign reviewer`, the readout is `value=none changes=0 presses=0`, and no list is in the tree |
| one press on the trigger | the list paints one `4`px gap below the trigger on its start edge and the focus moves **into the search field** (`combobox-input`) |
| typing `gr` | only `combobox-option-grace` paints; the other four rows are gone |
| `Enter` | selects the highlighted match (`value=grace changes=1`), the trigger repaints `Grace Hopper`, the list unpaints and the focus returns to the trigger |
| three `down`s then `Enter` | skips the disabled row and chooses `linus` (`value=linus changes=2`) |
| typing `ala` | the disabled `Alan Turing` row paints; `Enter` changes nothing and leaves the list open |
| `Escape` | closes the list, returns the focus to the trigger and leaves `linus` selected |
| typing `zzz` | no row paints and the empty slot reads `No matches` |
| an outside press | reaches the control beside the list (`presses=1`) and dismisses it |

27 checks, `--only combobox-lifecycle`, green on 0.11.0.

One timing rule came out of it, and it is the component's, not the harness's:
the arrow highlight is React state, so a key that acts on the highlight must
arrive after a frame. Three `down`s and an `Enter` sent back-to-back read the
pre-arrow highlight — measured as `value=grace` instead of `linus` when the
settle before `Enter` was dropped. A person's key repeat is far slower than a
frame; an automation script is not.

Two negative controls measured, each exit `1`: enabling the disabled row fails
`three arrows skip the disabled row and Enter chooses the next` with
`expected "value=linus changes=2", got "value=alan changes=2"`, and dropping the
settle between the last arrow and `Enter` fails the same check with
`got "value=grace changes=1"`. Also measured while building: the first outside
control sat under the open list, so the press reached the list (`presses=0`);
the target now sits beside the combobox.

Evidence: `.artifacts/live/combobox-open.png`,
`.artifacts/live/combobox-filtered.png`, `.artifacts/live/combobox-selected.png`,
`.artifacts/live/combobox-empty.png`.

### `virtual-tree-lifecycle` — measured on 0.11.0 here

The Tier 3/4 file tree, which needs a flattened hierarchy **and** windowing from
the same component. Forty directories hold ninety-nine files each; when every
directory is open the tree is 4 000 rows in a 280px viewport. Every visible node
is one `<virtual-list>` child, and the keyboard model is the tree's own: arrows
move **native** focus between rows through the renderer (`focusElement`), which
is the roving-focus path plan `153` recorded as unproven.

| Step | Check |
| ---- | ----- |
| at rest | one row per directory (`visible=40 expanded=0 selected=none range=none`), `dir 000` painted and the last of forty outside the window |
| a press on `dir 000` | the focus read names `tree-row-dir-000` — a press is a real focus, not just a click handler |
| `Right` | opens the directory in place (`visible=139 expanded=1 selected=dir-000`, 99 files join the rows) and the focus stays on it |
| the opened child | its label's painted `x` is one `TREE_INDENT` (16px) past its parent's |
| `Right` again | enters the first child (`tree-row-file-dir-000/000`); `Left` returns to the parent |
| `Left` on the open directory | closes it (`visible=40 expanded=0`) |
| `down` / `up` | move the roving focus a row at a time (`tree-row-dir-001`, then back) |
| `Right` on a file | changes no row and keeps the focus: a leaf does not expand |
| `Expand all` | 4 000 rows (`visible=4000 expanded=40`), fewer than 40 row lines painted, and the last row (`file 039/098`) is not |
| `scrollToItem(3000)` | paints `dir 030` and no longer `dir 000`; the renderer's anchor reads `itemIndex=3000` and the list's own viewport |
| a press on the revealed row | `tree-row-dir-030` takes the focus — a revealed row is an ordinary row |

30 checks. Measured along the way:

- **A reveal is index-addressed, not pixel-addressed.** `renderer.scrollToItem`
  moved the window to a row that had never been mounted; `getListScrollTop`
  reported `itemIndex=3000`, and the list's `viewportHeight` is the frame's
  painted height minus its two 1px borders (`278`), not the fixture's 280.
- **A programmatic reveal fires no `onVisibleRange`.** The probe reads the
  report count before and after the reveal and asserts it did not change, so a
  tree cannot lazily load from that event after a "reveal this path" action; it
  must read the painted rows or the anchor.
- **Changing the flattened row count reports indices that do not describe the
  window.** Expanding and collapsing fired four events whose ranges read
  `1..2` and `0..1` while the painted window held ten rows of 139 or 4 000 —
  the event is computed against the child list at the moment of the splice.
  The probe does not assert the count (it is paint-timing dependent); the stable
  half — no report on a programmatic reveal — is the check above. A consumer
  that paginates from this event has to treat the row count and the report as
  two separate facts.
- **Roving focus is available to component code.** `useGpuix().renderer`'s
  `focusElement` moves the native focus from a row's own key handler, so the
  Tab-stop-per-row model plan `153` called impossible from a component is not:
  the tree keeps one focus and moves it.

Two host verbs were added for it, both on `AsyncSmokeHost`:
`scrollToItem(testId, index, offsetInItem?)` and `listAnchor(testId)` (the
`[itemIndex, offsetInItem, viewportHeight]` tuple as a named record, `null` for
anything that is not a `<virtual-list>`). `listAnchorOf` refuses a short tuple
rather than filling the gap with zero, held by three unit tests.

Negative controls measured: revealing index `0` instead of 3000 fails
`the reveal paints the directory the index names`; dropping the renderer's
`focusElement` from the row key handler fails
`Right on an open directory enters its first child` — exit `1` each, restored
green (`--only virtual-tree-lifecycle`). Evidence:
`.artifacts/live/vtree-expanded.png`, `.artifacts/live/vtree-revealed.png`.

### `portal-layer` — measured on 0.11.0 here

`@gpuix/react` publishes `createPortal`, and nothing in the repo had rendered
one in a window: the styled `Dialog` and `Drawer` use an `anchored` veil, the
menus a local surface, and the components page calls wrapping the headless
dialog "a future migration". The probe answers the three questions a detached
tab, a dialog or a toast viewport asks of a portal — does it paint, does it
escape the clip, and does input survive the host boundary — and it does so with
both pixel evidence and the runtime's paint report.

| Step | Check |
| ---- | ----- |
| at rest | the clipping box, a control box and the portal target all paint; the sibling beyond the clip's edge still reports a box, and its `x` lies outside the clip |
| the capture | the control box's cyan fill paints (>0 px), the clipped sibling's magenta fill paints **0** px, and the portalled card's green fill paints |
| paint report | the portalled card's text is in `getPaintedText` |
| bounds | the card paints inside its **target's** box, not where the caller sits |
| context | the card reads `ctx=portal-context` from the provider above the caller — the context crosses the host boundary |
| pointer | a press on a control inside the portal reaches its `onClick` (`presses=1`) |
| keys | focusing the portal's field and typing `h`, `i` reaches `onChange` (`typed=hi`) |
| detach | removing the portal unpaints the card and drops it from the tree |
| reattach | adding it back paints it again |

19 checks. Two measured facts decide how a component should use it:

- **A clip is a pixel fact, not a text fact.** `getPaintedText` still listed the
  clipped sibling's `clipped away` line although no pixel of it reached the
  frame, so a component that asks the paint report whether it is visible gets
  the wrong answer at a clip boundary. The probe therefore proves the clip from
  a capture: the same box paints cyan when unclipped and 0 px of magenta when
  clipped.
- **The clipping box has to be the child's containing block.** The first
  version of the probe put an absolutely positioned child inside an unpositioned
  `overflow: hidden` box; the child painted at the root's coordinates, unclipped
  — the same containing-block rule CSS has. A consumer that clips a subtree and
  positions inside it needs `position: "relative"` on the clipping box.

Negative controls measured: dropping `overflow: "hidden"` from the clipping box
fails `the clipped sibling paints no pixel` with `expected 0, got 23780`;
pointing the portal at the clipping box instead of the layer fails
`the card paints inside its target's box` — exit `1` each, restored green
(`--only portal-layer`). Evidence: `.artifacts/live/portal-attached.png`,
`.artifacts/live/portal-reattached.png`.

What it still does not prove: a **detached tab in its own window**. The binding
opens one window per process, and there is no drag host feature, so a portal
moves a tab to another layer in the same window — the piece that was missing —
not to a new OS window.

### `loading-row-correction` — measured on 0.11.0 here

A paginated history paints a **loading void** at the edge a page is arriving
from: a normal row, 80px here, standing in for the page. While the reader waits
in it, that row is the list's anchor, so the runtime holds *it* still and the
splice puts the page where the reader was reading. `virtual-list-prepend`
measured the ordinary prepend — a reader scrolled into content keeps their row.
This probe measures the case a message scroller or a feed actually has: the row
at the viewport top is the void.

Four lists, identical geometry (an 80px void, 40px rows, a 160px viewport), in
two pairs: the left pair is left to the runtime, the right pair applies
`loadingRowRestore` (`src/live/loading-row.ts`). Every expected pixel comes from
that module, and `loading-row.test.ts` holds the rule and its arithmetic, so the
probe cannot assert hand-copied numbers.

| Edge | Left to the runtime | Re-anchored |
| ---- | ------------------- | ----------- |
| prepend, the void is the anchor (`itemIndex 0`) | the page's first row paints at the pixel the reader's message held (`y=80`) and that message leaves the screen | the message stays at `y=80`, the page fills `0..80`, and the void sits above the viewport |
| prepend, a second page (the guard) | — | the anchor is a message row, so the app does **not** correct: the message stays at `80` and the new page joins above it (`guarded=1`) |
| append, resting on the at-end sentinel (`itemIndex == row count`) | the sentinel follows the new end, the reader's last message leaves the screen and the page paints at `y=0` | the page's first row takes the void's old top edge (`y=80`) and the message above it keeps `y=40` |
| append, after wheeling back to the end | — | the rule fires again: the next page's first row lands at `80`, the row above keeps `40` (`corrected=2`) |

The probe records the request the app made as well as the settled pixels
(`request=3:-80`, `request=10:-80`, `request=12:-80`), because the read-back is
a normalised report: `getListScrollTop` names the **row at the viewport top
after layout**, so a negative offset resolves into whichever row landed there.

58 checks. Three measured mechanics a consumer needs:

- **Queue the scroll after the commit, not with it.** React batches the click's
  state update; a `scrollToItem` called beside `setPage` was applied against the
  old child list, and the splice then shifted it a second time (measured: the
  message landed at `y=0`). `flushSync` from `@gpuix/react` around the splice,
  then `scrollToItem` — the order the upstream example uses, now measured here.
- **A top-aligned list pinned at `scrollTop 0` is re-pinned after a prepend.**
  The runtime matches the browser there, which is why the uncorrected prepend
  shows the new page instead of keeping the reader's row; a reader who has
  scrolled into content is anchored logically and needs no correction.
- **The at-end sentinel is an index, not an offset.** A bottom-aligned list at
  its end reports `itemIndex == row count`, and the trailing void's top edge is
  `edgeHeight - viewportHeight` below the viewport top — the arithmetic
  `loadingRowRestore` applies so the new page lands on the void's old pixel.

Negative controls measured: passing `0` instead of the rule's offset fails
`the corrected load leaves the reader's message where it was`
(`expected 80 ± 1, got 0`); removing the prepend guard fails
`the reader's message still painted` (`expected a value, got none` — the app
moved the reader twice) — exit `1` each, restored green
(`--only loading-row-correction`). The unit test's two directions: dropping the
page rows from the corrective index fails `anchors the message under the top
void at the pixel it held` (`Some({index: 1})` against `Some({index: 3})`), and
a rule that always corrects fails `leaves a prepend alone once the reader is
past the void`. Evidence: `.artifacts/live/loading-row-corrected.png`.

### `window-resize-reflow` — measured on 0.11.0 here

A workspace changes size from its **window**, not only from a sibling pane
taking space. Two things a panel needs had never been read: the window's own
size (a split's `max` is the caller's number, so a dock must pass the window's
width) and whether a resize re-runs the layout a re-clamp listens to. The
binding publishes no `setSize`, so `renderer.zoomWindow()` is the one lever a
probe has; a 900×520 window is a user frame, so the platform's zoom takes it to
its standard frame and a second call restores it.

The probe fills a 100%-wide row with a fixed 120px sidebar and a flexible centre
whose `onLayout` records its width and report count. Measured:

| State | Window (`getWindowSize`) | `useWindowSize()` | Flexible centre | `onLayout` |
| ----- | ------------------------ | ----------------- | --------------- | ---------- |
| opened | 900×520 | 900×520 | 780 (sidebar + centre = the window) | reported 780 |
| zoomed | 1680×923 | 1680×923 | 1560 | reported 1560 again |
| restored | 900×520 | 900×520 | 780 | reported again |

So `getWindowSize` is the **box the layout fills**, not the retired 800×600
constant — the sidebar plus centre equals it in all three states, which is the
check a constant cannot pass. The app's hook reports the same pair; the
flexible pane reflows without the app writing a width; and a window resize runs
the pane's layout pass again with its new painted box, so `onLayout` remains the
re-clamp signal for the window as well as for a sibling. The zero-size guard
(`windowSizeOf`) reports a renderer that answers `0`, a negative or a non-finite
dimension as a missing size instead of asserting a layout against it.

The **opening** read is polled, not sampled: `useWindowSize()` samples every
100ms and the centre's `onLayout` reports on the runtime's first layout pass, so
a loaded box read a `w=0` readout beside a 780px painted box (`expected 780 ± 1,
got 0`). The probe waits for both channels to carry a value before it asserts,
and a hook or a pane that never reports still fails on the placeholder.

The app channel lags the renderer: the platform's zoom is animated and
`useWindowSize()` samples every 100ms, so the probe waits (bounded at 960ms) for
both channels to name the new box before it asserts. That wait is the negative
control below, and the rule for a component: read the size for arithmetic,
re-clamp on `onLayout`. The guard's own two directions: `host.test.ts` refuses a
zero, negative and non-finite box (measured: dropping `windowSizeOf`'s filter
fails `refuses a box no layout can be measured against`, restored 68/68).

Negative controls measured: the first version of the probe sampled once at
180ms against the renderer alone and failed
`useWindowSize follows the zoomed width — expected 1680, got 900`, which is the
lag the wait exists for; dropping the `zoomWindow()` call fails
`the platform's zoom changes the window's width` (`expected true, got false`);
and drawing the sidebar 40px wider than the constant the probe expects fails
`the sidebar plus the centre fill the window's width` (`expected 900 ± 1, got
860` — the arithmetic is the layout's, not a tautology). Exit `1` each, restored
green (`--only window-resize-reflow`, 16 checks). Evidence:
`.artifacts/live/window-zoomed.png` (3360×1846, the window's 2× backing) and
`.artifacts/live/window-restored.png` (1800×1040).

### `drag-reorder` — measured on 0.11.0 here

The other half of `drag-between-panes`: a row that **keeps** the pointer. A
reorderable list, a file tree or a tab strip has to track the travel after the
pointer leaves the row, so the row subscribes to `mouseDown` and `mouseMove` —
which is exactly what makes the runtime capture the pointer (`pointer-capture`
measured the mechanism). The consequence for a drop was never measured: the row
under the pointer hears nothing, so no target's `onMouseUp` can resolve the drop,
and the whole gesture is the dragged row's.

Four 44px rows in a 280px column. Each row registers its own native id from its
`ref`; the drop is the **first id `renderer.getElementsAt(x, y)` reports that is
one of those rows**, matched in `src/live/reorder.ts` (`rowAt`) and applied with
`moveRow`. Measured:

| Step | Readout |
| ---- | ------- |
| mount | `order=alpha,bravo,charlie,delta from=none over=none drops=0 misses=0 heard=0 moves=0 top=none` |
| drag `alpha` onto **`delta`'s label** | `order=bravo,charlie,delta,alpha from=alpha over=delta drops=1 misses=0 heard=0 moves=8 top=other` |
| jitter 4px inside `bravo` | `over=bravo drops=2`, order unchanged |
| release 420px right of `alpha` | `over=none misses=1 drops=2`, order unchanged |

Three facts a component can build on:

1. **The dragged row keeps the release.** `heard=0` after every drag: no other
   row's `onMouseUp` ran, so a drop target cannot be a listener. (Drop the row's
   `onMouseMove` and capture is not armed — measured: `heard=1 from=none
   drops=0`, the release lands on the target row and no reorder happens.)
2. **The hit test names the row beneath a painted child.** The pointer was over
   `delta`'s `<text>` label, and `getElementsAt` reported that label first — the
   readout says `top=other`, because the label is not the row — while the row
   beneath it is what `rowAt` found. Reading only the topmost id instead
   measures `over=none misses=1` and no reorder, which is the negative control
   below.
3. **The painted order follows the rule, not just the readout.** After the drop
   `row-alpha`'s painted `y` equals `row-delta`'s old `y` and `row-bravo` takes
   the first row's old `y`, so the list really reordered rather than relabelling
   a string.

`rowAt` and `moveRow` are pure and unit-tested (`src/live/reorder.test.ts`, 6
cases: a label id above its row, the topmost of two rows, a miss, and a move
down/up/out-of-range), because both bugs read correctly in a readout: a rule
that reads only the topmost id drops the row under the cursor, and a `moveRow`
that inserts at `to` in the shortened array puts a downward move one slot too
far.

Negative controls measured, both exit `1` and restored green:
`rowAt` reading only the topmost hit fails `the dragged row takes the dropped-on
row's slot` (`got "order=alpha,bravo,charlie,delta from=alpha over=none drops=0
misses=1 heard=0 moves=8 top=other"`), and removing the row's `onMouseMove` — so
the runtime captures nothing — fails the same check with `heard=1 from=none
drops=0`. 21 checks, `--only drag-reorder`, green on 0.11.0. Capture:
`.artifacts/live/drag-reorder.png`.

What is still absent, and why this is not a drag-and-drop component: there is no
drag host feature (no drag image, no cross-application payload, no drag between
windows — the binding opens one window per process), and `onFileDrop` is the
only OS drop path. A row reorder is therefore the caller's own pointer gesture,
which is what this probe composes.

### `table-lifecycle` — measured on 0.11.0 here

Tier 3's table does not exist yet, so this probe composes the shape a data grid
has to use — fixed-width cells in flex rows, a header sibling above the row
scroller, one horizontal scroller around both — and measures the two
interactions MISSION names for a table, **sort and selection**, in a window. The
headless `table-select-sort` and `data-grid-fixed-header` scenarios proved the
state changes and the geometry against a `TestRenderer`; what a window adds is
that a press is hit-tested rather than a handler invoked, a wheel is aimed by
geometry, and a key only reaches the element the press actually focused.

Sixty rows of 28px in a 300×200 viewport, three columns (160 / 120 / 100) inside
a 380px content box, so the table has 80px of horizontal travel and 1 480px of
vertical. Order and selection are keyed by **record**, not by row position.
Measured:

| Step | Readout / paint |
| ---- | --------------- |
| mount | `rows=60 sorted=name-asc selected=none`, first row `Item 000` |
| press `table-row-3` | `selected=r3`, focus `table-row-3` |
| `down` | `selected=r4`, focus `table-row-4` |
| press the size header | `sorted=size-asc`, first row `Item 005`, `selected=r4` still |
| press it again | `sorted=size-desc`, first row `Item 004` |
| wheel the rows −100 | offset `-100`; header `y` unchanged; row 5 moved by −100 |
| wheel the header −100 | the row offset did not move |
| wheel the header −60 across | `table-hscroll` `x=-60`; header cell and row cell both −60, still aligned |
| wheel the rows −10 000 | offset `-1480`, the content's end |

Four facts a table can build on:

1. **A press selects the record it hit and that row holds the focus.** A
   `tabIndex={0}` row is focused by the press in a window, so the key that
   follows reaches *that* row's `onKeyDown` — no synthetic focus needed.
2. **An arrow can rove focus.** `down` from `table-row-3` reaches
   `table-row-4`'s handler; moving the focus in that handler
   (`renderer.focusElement`) leaves the *next* key on row 4 with the selection,
   which is how a table's arrows walk.
3. **The header must be a sibling of the row scroller.** It keeps its painted
   `y` while the rows scroll under it, and a wheel over the header scrolls
   nothing — the body is not its ancestor, so a header inside the scroller would
   scroll away instead (that is the negative control below).
4. **One horizontal scroller carries the header and the cells.** A single
   `overflowX` box around header + body means the pan moves both by the same
   amount with no synchronisation to write; the two stay aligned at the same
   `x` after the pan.

One measured constraint on a sortable header: the automation protocol aims a
press at the element's **painted centre**, so a header cell whose centre is
clipped by the horizontal viewport sorts nothing. This probe's first run put
`size` last (280…380 in a 300px frame, centre 330) and the press changed no
order; both sortable cells now sit inside the frame and the third column is the
one that overflows. A table whose sortable columns overflow needs its own
header pan before a press lands.

`sortTable`, `toggleSort` and the fixture are pure and unit-tested
(`src/live/table.test.ts`, 4 cases: a different first row per column and
direction, ties broken by record, every record sorted once, and the flip rule),
because a fixture whose name and size orders coincided would keep the probe green
while it measured only that a press repainted something.

Negative controls measured, all exit `1` and restored green:
pointing the size header's `onPress` at the name column fails
`a press on the size header sorts by size`
(`got "rows=60 sorted=name-desc selected=r4"`); dropping the `focus` call after
an arrow fails `down moves the focus with it`
(`expected "table-row-4", got "table-row-3"`); and moving the header inside
`table-body` — the sticky-inside-the-scroller shape the runtime cannot paint —
fails `the header keeps its painted y` (`expected 64 ± 1, got -36`). 34 checks,
`--only table-lifecycle`, green on 0.11.0. Capture:
`.artifacts/live/table-sorted.png`.

### `frozen-column-lifecycle` — measured on 0.11.0 here

The frozen column, in a window. The runtime paints no `position: "sticky"`, so a
frozen first column is **two vertical scrollers whose offsets are kept equal**
by the app: each pane's `onScrollChange` mirrors its `y` into the other through
`renderer.scrollTo`, guarded by a ref because a programmatic scroll reports its
own change inside the call. The headless `data-grid-frozen-column` scenario
measured the arithmetic against a `TestRenderer`; this probe asks whether the
mirror holds in a window, where the wheel is hit-tested and a press lands on a
painted cell rather than calling a handler.

Sixty 28px rows in two 240px-tall panes — a 120px frozen column and a 240px grid
whose rows are 600px wide — so both panes have 1 440px of vertical travel and
the grid pans 360px sideways. Measured:

| Step | Result |
| ---- | ------ |
| mount | both offsets `0`, `F0` and `B0` at the same `y` |
| wheel the **grid** −300 | grid `-300`, frozen column `-300` in the same frame |
| wheel the **frozen column** −300 | frozen `-600`, grid mirrors it to `-600` |
| the scrolled window | rows `B22`… are painted, and `F22` sits at `B22`'s `y` |
| wheel the grid −200 across | grid `x=-200`, its row moved −200, the frozen column unmoved |
| press a frozen cell | `frozen-selected=r22` — the press selects the row for the grid |
| wheel the grid −10 000 | both panes clamp at `-1440` |

Two facts a frozen-column table can build on:

1. **The mirror lands in the same frame as the wheel.** `scrollTo` paints
   synchronously from inside `onScrollChange`, so both panes report one offset
   after a single settle — the laggy alternative, mirroring on the next render,
   would leave the frozen column one frame behind every wheel.
2. **The horizontal pan is the grid's alone.** The frozen pane has no
   `overflowX`, so a sideways wheel moves the cells and leaves the column still;
   the frozen column is a vertical scroller only.

Negative controls measured, both exit `1` and restored green: dropping the
grid's mirror (`onScrollChange` on `frozen-body`) fails
`the frozen column mirrors the grid in the same frame` (`expected -300 ± 1, got
0`), and dropping the frozen pane's fails `the grid mirrors the frozen column`
(`expected -600 ± 1, got -300`). 32 checks, `--only
frozen-column-lifecycle`, green on 0.11.0. Capture:
`.artifacts/live/frozen-column.png`.

The guard that makes this work is worth naming: without the `syncing` ref, the
target's synchronous `onScrollChange` would mirror straight back and the two
panes would drive each other. The probe does not measure the loop (an unguarded
version hangs, which is not a check a gate can read); the headless scenario's
`syncGuard` note and the ref here are the same rule.

### `dock-focus-lifecycle` — measured on 0.11.0 here

The keyboard inside a **nested dock**: a collapsible sidebar, a three-document
rail and the selected pane, in one layout. Tier 4's *keyboard navigation* row
had no measurement — the shipped `Tabs` covers roving focus inside a rail
(`tabs-lifecycle`), not the layer above it. This probe asks the questions a dock
plan needs answered: which controls a Tab traversal visits and in what order,
what a collapsed pane's controls do to that traversal, and what a key pressed in
the pane's field does to the rail.

The fixture is composed by hand rather than from the components, because a dock
composes them: the toggle and its sidebar's two actions, one stop per rail
(the selected trigger), the pane's field, and a status-bar action. Measured from
the toggle, with the sidebar open:

| Step | Result |
| ---- | ------ |
| Tab × 6 | `dock-sidebar-toggle` → `dock-sidebar-new` → `dock-sidebar-settings` → `dock-rail-explorer` → `dock-field-explorer` → `dock-status` → back to the toggle |
| close the sidebar | its box paints **0** wide |
| Tab from the toggle | `dock-sidebar-new` — the unguarded control still has a stop, and still reports its own **12px** box inside a zero-width parent |
| Tab again | `dock-rail-explorer` — the guarded control (`tabIndex={-1}`) is skipped |
| press the clipped `new` | `actions=0`: the pointer is clipped away even though the keyboard reached it |
| `focusElement` on it | the runtime focuses a control the app never shows |
| reopen, Tab × 2 | `dock-sidebar-new` → `dock-sidebar-settings`: the guard is state, not a removal |
| right on the rail | focus and the selection move to `output`; the previous pane's field left the tree and the new one is painted |
| Tab | `dock-field-output` — the rail's next stop is the pane's first field |
| left in the field | the document stays `output`: the field owns its arrows |
| Shift+Tab, left | back on the rail, focus and selection return to `explorer`; Tab reaches `dock-field-explorer` |
| left on the first tab | the rail wraps to `problems` and selects it |

Four rules a dock component carries:

1. **One stop per rail, one per pane.** A per-trigger stop would put three rail
   stops in the traversal (negative control 3 measured exactly that sequence),
   and an inactive pane is not in the tree at all, so its field cannot be one.
2. **A closed pane keeps its controls' stops.** The runtime does not skip a
   control because its parent paints nothing — a width-0 sidebar still keeps
   `new` in the traversal, still reports a 12px box for it, and still accepts
   programmatic focus. The dock removes the stop (`tabIndex={-1}`) or the
   traversal walks into a pane the reader cannot see; the pointer half is
   already clipped, so the two inputs disagree unless the app guards.
3. **A rail step moves focus, not just state.** The runtime does not move focus
   when the selected trigger changes; the rail's key handler calls
   `renderer.focusElement`. Without it the readout says `output` while the focus
   stays on `explorer` (negative control 2).
4. **The field owns its arrows.** `left`/`right` in the pane's field never reach
   the rail, so a dock must move its rail with its own chords (or leave arrows
   to the fields) rather than assume a bubble.

Negative controls measured, each exit `1` and restored green: removing the
closed-sidebar guard fails `the guarded control is skipped by the same
traversal` (`expected "dock-rail-explorer", got "dock-sidebar-settings"`);
dropping the rail's `focusElement` delegation fails `the rail moves focus to the
next document` (`expected "dock-rail-output", got "dock-rail-explorer"`); and
giving every trigger a stop fails the order check with
`dock-rail-explorer > dock-rail-output > dock-rail-problems > dock-field-explorer`.
24 checks, `--only dock-focus-lifecycle`, green on 0.11.0. Capture:
`.artifacts/live/dock-focus.png`.

### `header-menu-lifecycle` — measured on 0.11.0 here

A **column menu anchored inside a scrolled header**. Tier 3's column
configuration row is `?`: the composition needs a menu whose trigger lives in
the header a data grid scrolls horizontally, and the header's offset is a
paint-level value — the fact a plan needs is whether an overlay placed from that
trigger's box stays with it when the header moves. The shipped `DropdownMenu`
is mounted in the trigger cell of a 540px header inside a 420px frame, so the
header has 120px of travel.

Measured:

| Step | Result |
| ---- | ------ |
| mount | name 200px, trigger cell at the name cell's end (200 → 216 at the window's padding), status clipped |
| press `columns…` | the panel paints **below** the trigger's box and starts at the trigger's own `x` (±2) — read once the panel paints (`settledBox`), not on the frame before its entry |
| wheel the header −100 | the trigger moves −100 and the panel moves **−100 in the same read** |
| Escape | the panel unpaints (the check waits for the exit tween: a one-shot read saw it still painted) and the focus returns to the trigger |
| Enter (keyboard open) | focus lands on the first item, `status` |
| Enter again | `hidden=status changes=1`, the status header unpaints |
| the select | the surface dismisses on its own exit tween — the probe waits for it to be gone before reopening |
| a column after the anchor | the trigger's `x` is unchanged |
| press the trigger again | the menu still opens after the header shrank (the check waits for the painted panel: a one-shot read saw nothing) |

Four facts a column menu can be built on:

1. **An anchored overlay follows its anchor's scroll.** The wheel is a
   paint-level offset and the panel re-places with it — one read after the wheel
   has both at −100 — so a filter or column menu can live inside the scrolled
   header rather than needing a fixed toolbar.
2. **Anchor arithmetic uses the cell, not the trigger element.** The trigger
   cell starts where the name column ends (200), while the trigger itself paints
   at 222 because the control carries its own inset; a column-width calculation
   that reads the trigger's box would be 22px out.
3. **The menu's own keyboard path agrees with the press path.** Enter opens it
   on the first item, Escape returns the focus to the trigger, and the first
   item is the one the paint lists first — the item order is a component
   decision, not the column order.
4. **Hiding a column before the anchor moves it; hiding one after it does not.**
   The fixture's `headerTriggerCellX` models both, so a grid that keeps the
   trigger in a fixed cell has to pin it outside the reflowed columns.

Negative controls measured, both exit `1` and restored green: dropping the
header's `overflowX` fails `the wheel moved the trigger with its column`
(`expected 122 ± 2, got 222` — the wheel moved nothing), and painting the menu
in column order instead of reverse fails `Enter opens the menu on its first
item` (`expected "header-menu-item-status", got "header-menu-item-name"`).
20 checks, `--only header-menu-lifecycle`, green on 0.11.0. Capture:
`.artifacts/live/header-menu.png`.

### `window-backdrop` — measured on 0.11.0 here

The **window's own backdrop**. `WindowOptions.windowBackground` is declared as
`"opaque" | "transparent" | "blurred"` and nothing on this host had opened a
window with one, so the capability record still listed window vibrancy as
`unverified` and a workspace plan could not tell a translucent window from an
option the runtime ignores. A window reports neither its options nor its style,
so the probe paints **one box** and leaves every other pixel to the window
server: the capture carries that area's alpha, and the probe compares it with
the mode the runner passed to `init`.

**One window per process** — a second `init` fails with `A GPUI application
already exists on this thread` (measured; the same fact behind "no detachable
tab") — so each mode is its own run:

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only window-backdrop                            # opaque (default)
nub apps/playground/dist/live/run.js --only window-backdrop --window-background transparent
nub apps/playground/dist/live/run.js --only window-backdrop --window-background blurred
```

Measured, one 900×520 window per run, captured at 1800×1040 (the display's 2×
scale, read back rather than assumed):

| Mode | The box the app paints | The surface the app leaves empty |
| ---- | ---------------------- | -------------------------------- |
| `opaque` | `rgba(217, 67, 43, 255)` | alpha **255** — the window fills it |
| `transparent` | `rgba(217, 67, 43, 255)` | alpha **0** — the desktop shows through |
| `blurred` | `rgba(217, 67, 43, 255)` | alpha **0**, byte-identical to `transparent` |

Three facts a workspace can be built on:

1. **The option is real.** The unpainted surface goes from alpha 255 to 0
   between two runs of the same probe, so `windowBackground` is honoured, not
   ignored. A vibrancy pane, a floating inspector or a HUD window can be a real
   translucent window rather than an opaque rectangle painted with a dark tint.
2. **`blurred` is translucent, and the blur is the window server's.** Both modes
   produce the same app-side capture — the vibrancy is composited *behind* the
   window, so no app-side frame can prove it. Use `"blurred"` for the effect and
   confirm the look by eye on the target OS; do not claim it from a capture.
3. **The app's own translucent paint composites against that surface.** A box
   filled `#D9432B80` painted `rgba(109, 34, 22, 255)` in an opaque window — 50%
   over black — so a translucent window plus a translucent app fill does not
   produce the colour a theme literal names. Paint the content opaque and let
   the *unpainted* area carry the translucency.

Negative controls measured, both exit `1` and restored green: pointing
`windowOptionsOf` at `"opaque"` while the probe still asserts the flag fails
`transparent: the window's unpainted surface alpha: expected 0, got 255`, and
painting the fixture box at 50% fails
`opaque: the box the app paints carries its fill: expected "rgba(217, 67, 43,
255)", got "rgba(109, 34, 22, 255)"`. 4 checks per run, capture
`.artifacts/live/backdrop.png`.

### `chart-raster` — measured on 0.11.0 here

The **chart surface**. A chart has no host element and no drawing surface on
this runtime — `<canvas>` paints nothing and `<svg source>` is rasterised into
**one** tinted mask — so the only per-pixel route the published API offers is
`ImgInstance.setImagePixels`, and the only vector route is `ImgInstance.setImage`
decoding SVG **bytes**. The probe paints the same three-series plot three ways:
a buffer, a second buffer when the data changes, and the plot's SVG markup
pushed as bytes.

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only chart-raster
```

19 checks, green on 0.11.0. The fixture is `src/live/chart.ts` (three 14×30
bars, one band of columns per series) and its arithmetic — the bands do not
overlap, the margin has no colour in it, a buffer pixel converts to a fraction
of the painted box — is held by `chart.test.ts` (7 cases).

| Question | Measurement |
| -------- | ----------- |
| Does a buffer keep each pixel's own colour? | Three series paint three exact colours (`#2ECC71`, `#3498DB`, `#E74C3C`), and a sampled point inside the first bar reads `rgba(46, 204, 113, 255)` — one element, more than one colour, which a tinted `<svg>` cannot do |
| Does a transparent pixel composite? | The buffer's `0, 0, 0, 0` margin reads the `#14223A` box behind the element, so a chart inherits the card it sits on instead of painting an opaque rectangle |
| Does new data repaint? | A press pushes a second buffer: the frame carries `#9B59B6`, `#F1C40F` and `#16A085` and **none** of the first palette, with no re-mount and no re-layout call |
| Do SVG bytes carry their own fills? | `setImage(Buffer.from(markup))` decodes and paints `#B14AFF`, `#00A893` and `#FF8A00` — the vector route, unlike `<svg source>`, which paints every shape in the one tint its `style.color` names |

Two negative controls measured, exit `1` each and restored green: pushing the
first buffer on the "New data" press fails
`the updated series 1 paints from the second buffer: expected true, got false`,
and painting the plot's backing in the theme's card colour fails
`the plot's transparent margin shows the surface behind it: expected
"rgba(20, 34, 58, 255)", got "rgba(25, 29, 37, 255)"` (the sample is a real
frame read, not a constant).

What a chart component should do with this:

1. **`setImagePixels` is the multi-colour raster route**, and the pixels must be
   on the element before the frame that paints it — a layout effect, the order
   `content-surfaces` records for a waveform.
2. **Re-push for new data.** The element is not remounted, and the second
   buffer replaces the first whole.
3. **`setImage` with SVG bytes is the vector route**: one element, every `fill`
   its own colour. `<svg source>` stays one tint, so a multi-series vector chart
   is either this or one element per colour.
4. **Leave the plot's background transparent** so the surface behind it shows;
   paint a background only when the chart must not inherit the card.
5. **Labels are not part of the raster.** A chart composes `<text>` beside the
   image for axes and legends, and the raster carries the marks.

Not measured here: a **translucent** bar over another bar (only a fully
transparent pixel is proved to composite), and resize — the element scales its
buffer to its box, so a chart drawn at its layout size is the safe shape.

### `window-chrome` — measured on 0.11.0 here

The **window's own chrome**. A Tier 4 toolbar, status bar or titlebar-integrated
workspace has to know two things no probe had measured: whether the runtime
already reserves the titlebar (so an app's `y = 0` is below the traffic lights),
and what `getWindowInsets()` answers — the number an app would inset its own
chrome by. `WindowOptions.titlebarTransparent` is the switch for the other case
("draw chrome under the traffic lights"), so the runner passes it and the probe
reads both modes:

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only window-chrome                          # default titlebar
nub apps/playground/dist/live/run.js --only window-chrome --titlebar transparent
```

14 checks per run, green on 0.11.0 in both. The probe paints a bar at its own
`y = 0` and a second bar at `top: effective.top`, and reads both the renderer's
`getWindowInsets()` and the app channel's `useWindowInsets()`.

| Question | Measurement |
| -------- | ----------- |
| What does the window report as its safe area? | `safeArea`, `ime` and `effective` are all `0,0,0,0` on this host, in **both** titlebar modes |
| Does the app channel agree? | `useWindowInsets()` reports the same edges as the renderer; it samples every 100ms, so the probe polls rather than reading it in the mount's tick |
| Is the effective inset the safe area? | Yes while no keyboard is up (`ime` is empty), which is the composite an app reads |
| Does an inset by that number land where it says? | A bar painted at `top: effective.top` starts at that `y` (±1) and paints there, so the number a toolbar insets by is the number the app is given |
| Does the runtime reserve the titlebar for the app? | No: the app's own bar is the capture's **first row**, so the app's layout starts at the window's top edge and the chrome is the app's to paint |
| Does a transparent titlebar change the insets? | No — the option is accepted and the reported edges stay empty, so an app that draws under the traffic lights reserves that inset itself |

What a workspace does with this: **reserve your own chrome.** The traffic-light
geometry is an *input* (`WindowOptions.trafficLightX` / `trafficLightY`), not a
reported safe area, so a titlebar-integrated toolbar keeps its own constant (28pt
on macOS) and paints over the window's top edge. The reported insets are for
what the OS knows and the app cannot: a display notch's safe area and an
on-screen keyboard — and on this host both are empty.

Two limits, measured and stated rather than implied:

1. **Whether the OS titlebar is actually hidden is not app-visible.** No API
   reports it and a capture is the app's own scene, so `--titlebar transparent`
   proves the option was passed and the insets it left; the titlebar itself is
   an OS-composited fact, like the `blurred` vibrancy above — confirm it by eye
   on the target OS.
2. **An IME inset is not measured.** The window's automation protocol cannot
   start an IME session, so the `ime` edges are only proved empty.

Fixture: `src/live/chrome.ts` (the flag, the `WindowOptions` it asks `init` for,
and the readout) with `chrome.test.ts` (7 cases, including a readout that is not
four numbers decoding to `None` rather than a zero). Two negative controls
measured, exit `1` each and restored green: painting the app's bar 28px down
fails `the app's own bar paints at the window's top edge: expected
"rgba(45, 107, 224, 255)", got "rgba(17, 20, 26, 255)"`, and reporting a safe top
of 28 fails the two-channel check
`the app channel reports the renderer's safe area: expected "28,0,0,0", got
"0,0,0,0"`. Capture: `.artifacts/live/chrome.png`.

### `workspace-restore` — measured on 0.11.0 here

The **arrangement a dock gets back**. Tier 4's *persistent panel state* is
app-owned — the runtime publishes no storage — so the half a window can prove is
the restore: a sidebar width, a caller-owned document width, a chosen document
and an inspector's scroll are written as a string, decoded at the app's boundary
and handed back to a **re-mounted** workspace. Nothing had measured that the
second mount paints them: a pane given a restored width, a document that mounts
from a restored value, and a programmatic scroll applied on the first layout.

The probe changes the arrangement with controls rather than a drag — panel drags
are `split-pane-lifecycle` and `dock-focus-lifecycle` — so the restore is the
only variable. It then saves, re-mounts from the saved string, and re-mounts two
more times from a corrupt string and from one outside the pane's bounds.

| Step | Measurement |
| ---- | ----------- |
| open | `sidebar=160 document=240 tab=explorer scroll=0 mount=1`; the sidebar, the document pane and the inspector divide the row exactly (the inspector takes what the fixed panes and the 6px divider leave) |
| change | a press collapses the sidebar to **0**, four widening presses stop at the pane's **360** bound, the document switches to `output`, and a −120 wheel leaves `scroll=120` |
| save | the saved string decodes back to `[0, 360, "output", 120]` — the arrangement the window is showing |
| restore | `mount=2 source=stored`: the sidebar paints **0**, the document pane **360**, the inspector the rest of the row, `document=output`, the pane's layout pass reports **360**, and the saved scroll paints at **−120** |
| corrupt | `not a workspace` restores `mount=3 source=default` at 160 / 240 / explorer / scroll 0, so a bad string opens the default rather than a partial layout |
| clamp | a stored `sidebar:-5 document:9999 scroll:-30` restores `mount=4 source=stored` at **0 / 360 / 0**, so a stale width cannot leave the inspector off the frame |

30 checks, `--only workspace-restore`, green on 0.11.0. Fixture:
`src/live/workspace-restore.ts` — the `WorkspaceLayout` schema (sidebar,
document, tab, scroll), `encodeWorkspace`/`decodeWorkspace`, `restoreWorkspace`
(default on a decode failure), the clamp to the pane's bounds, and the
`SplitPane`'s caller-owned width. `workspace-restore.test.ts` (7 cases) holds the
string round-trip for every document, the default on both a corrupt and a
partial string, the clamp of width/sidebar/scroll, the one-step control at both
bounds, and that a patch leaves the other fields alone.

Negative controls measured, exit `1` each and restored green: restoring the
default instead of the saved layout fails `a restore re-mounts the workspace
from its saved string` (`got "sidebar=160 document=240 tab=explorer scroll=0
mount=2 saved=yes source=stored"`), and skipping the saved-scroll application
fails `the saved scroll paints where it was saved` (`expected -120 ± 1, got 0`).
Captures: `.artifacts/live/{workspace-changed,workspace-restored,
workspace-default,workspace-clamped}.png`.

### `theme-switch-lifecycle` — measured on 0.11.0 here

The **provider switch in a window**. The headless theme gallery proves the token
layer through the runtime's style report; a window's renderer reports no style,
so this probe reads the frame and the layout instead: the page and card fills at
points inside their own padding, and the height of an `md` control, which the
theme's density owns. The palette cycle is the shell's own switch, and the
platform cycle covers every look in `platformStyles` (a new platform fails
`src/live/theme-switch.test.ts` until the probe visits it).

| Step | Measurement |
| ---- | ----------- |
| open | `palette=dark platform=default h=32`; page `rgba(17, 20, 26, 255)` (`#11141A`), card `#191D25`, the `md` control **32** |
| palette → light | page `#F6F8FA`, card `#FFFFFF` — a **different** fill from the dark frame — and the control stays **32**, so a palette press repaints without reflowing |
| palette → high contrast | page `#000000`, card `#0D0D0D`, a third different fill, height still **32** |
| platform → macOS | the page stays `#000000` — `applyStyle` **reserves** a high-contrast palette — while the control re-lays out to **28** (compact) |
| platform → Linux | the control takes **36** (spacious) |
| platform → Windows | **32** (comfortable) |
| platform → Default | the base density again, **32** |
| palette → dark | the page, the card and the height are the opening frame's, so both cycles close |

73 checks, `--only theme-switch-lifecycle`, green on 0.11.0. Fixture:
`src/live/theme-switch.ts` — the palette and platform cycles, `themeFor`, the
two sample points, the role-to-frame colour conversion and the readout.
`theme-switch.test.ts` (7 cases) holds the premise: both cycles reach every id
and return, each platform's density is a preset the control height can show (at
least three distinct heights), every platform's palette differs from the base at
the sampled point, a high-contrast base keeps its fill while it takes a look's
density, both sample points sit inside the padding they claim, and every visited
state's roles are paint-ready colours.

Negative controls measured, exit `1` each and restored green: pinning the page
to the dark fill fails `a palette press repaints the page` (`expected
"rgba(246, 248, 250, 255)", got "rgba(17, 20, 26, 255)"`), and pinning the
control to 32 fails `darwin: the md control takes the theme's height`
(`expected 28 ± 1, got 32`). The second is why the height is a check: a look
that repainted but never reflowed would pass every colour read.
Captures: `.artifacts/live/theme-{dark,light,high,darwin,restored}.png`.

### `confirm-dialog-lifecycle` — measured on 0.11.0 here

The **confirmation flow** — MISSION's "dialog open/close/confirm" — driven
through the shipped `ConfirmDialog`. `dialog-lifecycle` measures open, focus
entry, Escape and the dialog's own close; what it cannot is the pair of actions
that make a confirmation safe, because `ConfirmDialog` has no trigger, reports
`onConfirm` and leaves the close to the caller. So the probe's fixture **is the
caller**: `confirmFlow` (`src/live/confirm.ts`) owns `open`, counts each open,
and closes the surface when a confirm is reported — exactly the app half the
component's docs name.

| Step | Measurement |
| ---- | ----------- |
| open | a press on the app's own `confirm-open` action paints the surface; the focus is on **Cancel**, not on Delete; `open=true opens=1` |
| Enter | the untouched dialog dismisses on `Enter` — `confirms=0 closes=1` — and the focus returns to `confirm-open`, so the safe path is what a reader's first key takes |
| confirm | a press on Delete reports **once** (`confirms=1`), the surface goes because the fixture closed it, and the focus returns to the opener |
| cancel | a press on Cancel dismisses and reports nothing (`confirms=1` still), focus back on the opener |
| Escape | dismisses and reports nothing either (`opens=4 closes=4`), with the focus back on the opener |

17 checks, `--only confirm-dialog-lifecycle`, green on 0.11.0. Fixture:
`src/live/confirm.ts` — the opener and readout ids, the shipped controls' ids,
the `ConfirmFlow` state and its reducer. `confirm.test.ts` (7 cases) holds the
premise: a confirm reports once **and** closes, a cancel closes without
reporting, a duplicated confirm is two reports (so the single-report check can
fail), every open counts, the shipped source still carries the two locators,
Cancel as `initialFocus` and a confirm that only reports, and the fixture's ids
are the ones the probe addresses. It also holds the **check count printed above**
to the probe: this section printed 18 while `confirmSteps` asserts 17, so
`prints the check count the probe actually asserts` reads the sentence and counts
the effect's `ctx.expect*` sites — an assertion added without the sentence, and
a sentence edited alone, both fail.

Negative controls measured, exit `1` each and restored green: duplicating the
confirm call in the fixture fails `the confirmation reports once and the caller
records the close` (`expected "open=false opens=2 confirms=1 closes=2", got
"open=false opens=2 confirms=2 closes=3"`), and wiring the fixture's close path
to the confirm event — a caller that treats a dismissal as confirmation — fails
`Enter on the untouched dialog confirms nothing` (`expected "open=false opens=1
confirms=0 closes=1", got "…confirms=1 closes=1"`). Captures:
`.artifacts/live/confirm-{open,cancelled,accepted,escaped}.png`.

### `validation-lifecycle` — measured on 0.11.0 here

The **validation** half of MISSION's "input update/validation": `text-input`
measures the update, and this measures what a window does with an invalid value.
`Field` never validates a keystroke — it paints the `error` its caller hands it —
so the probe is the caller: the shipped `validate` runs when the field submits
(through the host's `onSubmit`, the Enter path) and the schema's own `message`
becomes the field's message. Every check reads something a declared style cannot
promise: the text the field swapped in, the focus the submit left alone, and the
destructive role **counted in the frame**.

| Step | Measurement |
| ---- | ----------- |
| valid | `error=none applied=none submits=0`; the field paints its description and **no** pixel of the destructive role |
| submit empty | `error=Use lowercase letters, numbers and single hyphens applied=none submits=1`; the message is the pattern's own wording, it **replaces** the description, the focus stays on `validation-input`, and the invalid edge and message paint the destructive role |
| type `design`, Enter | `error=none applied=design submits=2`; the description is back and the destructive pixels are **gone** |
| type a space, Enter | `error=… applied=design submits=3` — the value the field kept is what the next submit validates, and the focus is still in the field |

15 checks, `--only validation-lifecycle`, green on 0.11.0 (~6 s). Fixture:
`src/live/validation.ts` — the field/input/readout ids, the `WorkspaceSlug`
pattern and its `message`, `submitSlug` (the shipped `validate` at the app's
submit boundary, as `field.mdx` documents) and the readout.
`validation.test.ts` (6 cases) holds the premise: the empty field and a
separator-breaking value earn the pattern's message, a single word and
hyphen-joined words pass, the readout prints every field, and the description
cannot contain the message (or the "cleared" checks would read the description
as the message).

Negative controls measured, exit `1` each and restored green: validating
`Schema.String` instead of the pattern fails `an empty submit paints the schema's
own message` (`expected "error=Use lowercase letters…", got "error=none
applied= submits=1"`), and counting the `foreground` role instead of the
destructive one fails `a valid field paints none of the destructive role`
(`expected 0, got 1016`). The second is why the paint check is measured both
ways: a count that never reaches zero would pass an invalid frame and a valid
one alike.

Limitation, stated rather than implied: `FieldError` carries `role="alert"`, and
a window's automation protocol has no accessibility verb — the role is proven
offscreen by `a11y-tree`, not by this probe. Captures:
`.artifacts/live/validation-{valid,rejected,accepted}.png`.

### `nested-overlay-lifecycle` — measured on 0.11.0 here

The **nested overlays** MISSION lists under interaction: the shipped `Dialog`
holding the shipped `Popover` holding the shipped `DropdownMenu`. Each component
pushes a dismiss layer onto the shared stack in
`packages/components/src/internal/dismiss-layer.ts`, and the stack exists for one
claim: a keystroke bubbles through **every** enclosing surface, so only the
deepest open one may consume it. A missing guard closes the menu, the popover
and the dialog on one Escape — which no single-surface probe can see.

The probe is the caller: `nestedFlow` (`src/live/nested-overlay.ts`) controls all
three surfaces and appends the surface each close lands on, so the readout's
`dismissed=` list is the order the stack actually resolved.

| Step | Measurement |
| ---- | ----------- |
| open | the dialog is alone; the popover and the menu are unpainted; focus is on the dialog surface; `opens=1,0,0` |
| popover | opens inside the dialog without dismissing it (dialog and popover painted, menu not); focus enters the popover surface |
| menu | opens inside the popover with all three painted; a **pointer**-opened menu nested in a popover takes the surface's focus (one arrow then reaches its first row — a standalone menu leaves a pointer open's focus on its trigger) |
| Escape 1 | the menu leaves, the popover and the dialog stay painted, `closes=0,0,1 dismissed=menu`, and focus returns to the menu's trigger |
| Escape 2 | the popover leaves, the dialog stays, `closes=0,1,1 dismissed=menu,popover`, focus back on the popover's trigger |
| Escape 3 | the dialog leaves, `closes=1,1,1 dismissed=menu,popover,dialog`, focus back at the app's own opener |
| pointer 1 | the stack reopens; one press on a target inside the dialog and **outside both floating surfaces** closes the menu only — `closes=1,1,2`, one close for three handlers, while the popover and the dialog stay painted |
| pointer 2 | a second press is a **new gesture**, so the popover closes (`closes=1,2,2`) and the dialog stays |
| pointer 3 | a press outside the dialog closes the last surface (`closes=2,2,2`, the six-name order outside-in) and returns focus to the app's opener |

41 checks, `--only nested-overlay-lifecycle`, green on 0.11.0 (~14 s, two consecutive runs). Fixture:
`src/live/nested-overlay.ts` — the ids, the three-surface state, its reducer and
the readout. `nested-overlay.test.ts` (7 cases) holds the premise: an open is not
a close, the outside-in order prints in the order it happened, a second close of
one surface counts twice (so the "one Escape, one surface" checks can fail), a
re-open clears only its own flag, the readout prints every surface, and the
README's printed check count equals the probe's assertions (the explicit
`ctx.expect*` sites plus every `paintedBox` read, which asserts its own
presence).

**The pointer half is asserted too.** It used to be a defect: one press outside
the popover and the menu raised both surfaces' `onMouseDownOutside` handlers, and
the fixture recorded the menu closed **twice** on that one gesture
(`closes=1,1,3`, `dismissed=menu,popover,dialog,menu,menu`); a following press on
the same target did not reach the popover's handler at all. `@gpuixui/components`
now identifies one pointer gesture by the fields every handler of it shares
(`pressShape`) for the one frame a press can last, so the probe's three presses
close one surface each (`closes=1,1,2`, then `1,2,2`, then `2,2,2`). The fix's own
suites hold both directions (`dismiss-layer.test.ts` fails eight cases with the
guard returning "not consumed"; `overlay-layering.test.tsx` fails when the first
press closes the popover too) — this probe is the window proof on the shipped
three-level composition. A measured negative control here: dismissing the
popover from the menu's own close handler (the caller double-closing) fails
`the runtime paints nested-popover-panel` before the press readouts, because the
popover is gone after the first press. Captures:
`.artifacts/live/nested-{open,menu-dismissed,dismissed,pointer-dismissed}.png`.

### `editor-overlay` — measured on 0.11.0 here

Plan `130`'s handoff leaves one editor question a probe owes: an **editable
highlighted** surface has no runtime element, and the only honest composition is
the read-only `<code>` display with a text field above it. Two things decide
whether that composition is an editor, and neither is visible from the typings:

- a field can be made **invisible** — transparent glyphs and fill — so the code
  beneath is the only thing a reader sees, while typing still reaches the app;
- the reader can see **where** they type, and a file longer than the frame stays
  in step with the code view.

The probe paints one source twice: the left box holds a `<code>` with a
`<textarea>` laid over it, the right box is the same `<code>` with no field. The
pair is the instrument — the boxes share size, fill, source, font, size, line
height and padding, so a pixel-for-pixel comparison of the two regions reports
exactly what the field painted. The **negative control is in the probe**: the
same comparison with the field's ink switched to the `destructive` role, a colour
no code layer paints, so a broken instrument cannot pass as "nothing painted".

| Measurement | Result |
| ----------- | ------ |
| a transparent field over the code | the two regions differ by **0** pixels — the code is the only ink, and it still paints (its `foreground` glyphs are counted inside the box) |
| the same comparison with the field's ink on | **14 028** differing pixels — the comparison reports the field's own glyphs, so the 0 above is a measurement rather than an empty frame |
| hiding the ink again | back to 0 |
| typing into the transparent field | `chars` and `lines` in the readout follow the keys, so the field really edits |
| the code layer after an edit | differs from the untouched reference — the display is a live view of the same value, not a picture |
| the caret | **no caret is painted** — the probe asks for the window's activation at mount, focuses a plain opaque control field, moves the caret with an arrow key and samples five frames 120 ms apart: they differ by 0 pixels, while that field's own text paints and a press focuses it |
| the scroll offset of a longer file | `scrollOffset` reports **no offset** for the field, so an app cannot mirror the field's scroll into the code view |

**Verdict: the composition is not an editor in 0.11.0.** A reader can type into
a code view that shows their text, but cannot see the insertion point, and a file
longer than the frame desynchronises from the display with no API to re-align it.
The honest pattern therefore stays the one `editor-surface` (headless) already
records: edit in a real field, display in a `<code>` view — which is also what
`packages/components`' editor-facing surfaces do. The two gaps to revisit are a
caret token that paints under a transparent glyph colour and an offset a
`<textarea>` reports.

Two facts were measured the hard way and are what the fixture encodes:

- the glyph ink belongs to `style.color`: a field mounted with a theme whose
  `text` token named the control colour painted nothing while its style said
  `transparent`, and the same field painted as soon as the style named the
  colour — so the ink the probe toggles has one owner, and the theme was dropped
  rather than kept as a second, contradictory one.
- the ink is React state, so a capture taken on the click's own frame shows the
  previous state; the probe polls the readout before every capture (the first
  run read the control as an unpainted field for exactly that reason).

29 checks, `--only editor-overlay`, green on 0.11.0 (~18 s). Two negative controls
were measured and restored green:

- painting the field's ink at mount (so the "transparent" state is not
  transparent) fails `a transparent field paints nothing over the code beneath
  it` with **`expected 0, got 14028`** — the same count the control reports, so
  the instrument and the composition are not confused.
- making the control ink transparent fails `the comparison sees the field's
  glyphs when its ink is on` (`expected true, got false`), so the control cannot
  pass by the field painting nothing. Fixture:
`src/live/editor-overlay.ts` — the sources, the two inks, the shared metric, the
readout and the region arithmetic; `editor-overlay.test.ts` (7 cases) holds the
premises: one metric for both layers, no fill in either ink, a control ink the
code never paints, counts rather than the value in the readout, the source
fitting inside the frame, the page fitting the two boxes, and enough typed lines
to outgrow the frame. Captures: `.artifacts/live/editor-overlay-*.png`.

### `multi-pane-editor` — measured on 0.11.0 here

The **editing session a split shares**. Tier 4's *multi-pane editing layouts*
row is composition over split panes and editors, and the composition has one
interaction nothing had measured: a window has a single platform text session,
so a press has to move it from one pane's field to the other, typing must reach
only the pane that holds it, and the splitter between them must resize the panes
without taking it away. Each pane is a real `<textarea>` — `editor-overlay`
already settled that a highlighted *editable* surface is not available (no caret,
no offset), so the honest editor is a field and a view, not an overlay — and the
divider is the shipped `SplitPane` whose pointer-capture contract
`split-pane-lifecycle` measures.

| Step | Measurement |
| ---- | ----------- |
| open | both buffers paint side by side: the left pane **380**, the 6px divider on its right edge, and the right pane the rest of the row — the three add up to the row |
| left | a press focuses `mp-input-left`; one typed key changes the left buffer and leaves the right |
| right | a press moves the session to `mp-input-right`; the next key changes the right buffer and leaves the left |
| resize | a **+60** drag moves the splitter to **440** and both typed buffers are unchanged |
| session after a drag | focus is still `mp-input-right`, and the next key reaches it: a splitter press does not take the text session |
| bounds | a further drag stops at **460** with the right editor still painted; a **−260** drag stops at **220** |
| close | the closed pane paints nothing, the surviving editor takes the whole **row**, and both buffers are still in the app |
| reopen | the split paints at the width it held, the right editor takes its share of the row again, and a press on it accepts a key |

30 checks, `--only multi-pane-editor`, green on 0.11.0 (~3 s). Fixture:
`src/live/multi-pane.ts` — the two files and buffers, the width/divider
arithmetic, the drag clamp and a counts-only readout; `multi-pane.test.ts` (7
cases) holds the split arithmetic (a closed pane's space goes to the survivor,
the widest pane never meets the divider), both clamps, the premise that the
readout carries counts rather than buffers, and the README check count. The
count is 22 `ctx.expect*` call sites plus one painted-box check per `paintedBox`
call (8), because that helper asserts the element paints.

Two negative controls were measured, exit `1` each, then restored green:

- swapping the right pane's setter so a key writes the left buffer fails
  `typing follows the session: the right buffer changed, the left did not` with
  `expected "left=2/47 right=3/47 open=both width=380", got "left=3/47
  right=3/46 open=both width=380"` — the checks read the app's state, not the
  frame.
- rendering both panes regardless of `open` fails `the surviving pane takes the
  whole row` with **`expected 876 ± 1, got 220`**, so the closed-pane checks
  cannot pass by a pane that is still there.

Captures: `.artifacts/live/{multi-pane-split,multi-pane-closed,
multi-pane-reopened}.png`.

### `table-filter-lifecycle` — measured on 0.11.0 here

The **rules around a grid's filter**. Tier 3's *filtering controls* row is `div` +
`<input>`, so the runtime cannot refuse the control; what a data grid owns is
what happens to the rows, the selection and the focus while the set changes under
them. The probe puts a literal, case-insensitive query field above 120 rows in a
240px scroller and drives the decisions a grid has to make.

| Step | Measurement |
| ---- | ----------- |
| open | `rows=120 query=none selected=none offset=0`, and a row paints at its declared **28px** |
| press | the pressed record is selected and its row holds the focus, so the next key reaches it |
| type `1` | `rows=39` (`Item 1`, 10–19, the eight odd tens and 100–119), the visible selection is kept, and the field keeps the text session |
| type `2` | `rows=2` (`Item 12`, `Item 112`) and the hidden selection is **cleared**, not kept invisibly |
| type `z` | `rows=0`: the empty state paints and the filtered-out row paints nothing |
| clear | every row returns and the session is parked back in the filter field |
| scroll, then filter | a −200 wheel scrolls the list; the next key opens the new set at **0** — read from `scrollOffset` and not only the readout |
| Down | from `Item 1` the step lands on `Item 10`, the next **filtered** row rather than the numeric one, and the focus moves with it |
| clear | the full set returns and keeps `item-10`, which it still holds |

20 checks, `--only table-filter-lifecycle`, green on 0.11.0 (~1 s). Fixture:
`src/live/table-filter.ts` — the literal filter, the selection rule
(`keepSelection`), the filtered-order step (`stepRow`) and the counts-only
readout; `table-filter.test.ts` (7 cases) holds the label match (39 rows for
`1`, `[12, 112]` for `12`, case-insensitive), both ends of the step, the cleared
selection, the no-filter/empty distinction and the README check count.

Two negative controls were measured, exit `1` each, then restored green:

- keeping the selection across a filter that hides it fails `a selection the
  narrower set hides is cleared` with `selected=item-1` where `selected=none` was
  expected — the grid would act on a record the reader cannot see.
- dropping the scroll reset (leaving the app's readout at `0`) fails `the list
  itself paints at the top, not only the readout` with **`expected 0, got
  -200`** — the readout alone would have passed, so the probe reads the
  renderer's own offset beside it.

Capture: `.artifacts/live/table-filtered.png`.

### `table-columns-lifecycle` — measured on 0.11.0 here

The **rules around a grid's column menu**. Tier 3's *column configuration* row is
`grid tracks + a menu`, so the runtime cannot refuse the control; what the grid
owns is the consequence: the content width follows the visible set, every later
column shifts by the hidden one's width, a press lands on the column that moved
into the gap, and the header and its cells read one column list. Six columns
(120/80/160/100/140/90 = 690px) sit in a 360px scroller over 40 rows at 28px.

| Step | Measurement |
| ---- | ----------- |
| open | `cols=name,status,owner,updated,size,kind width=690 offset=0,0 selected=none`; `status` paints 80px and the content is wider than the viewport |
| press a name cell | the record is selected (`r3`) and the pressed cell holds the focus |
| wheel −200 | the rows scroll under the header to `-200` |
| hide `status` | width **610**, the order loses the column, its header and cells paint nothing, and every later column shifts **−80**; the header and its cells still share one `x`; the vertical offset stays `−200` and the selection survives |
| press row 9's `owner` cell | the column that moved into the gap is the one the press hits (`selected=r9`) |
| pan to the end | **−250** (360 − 610), with the last column's edge at the viewport's edge |
| hide `owner` while panned | the renderer **clamps its own offset** to **−90** (360 − 450) and reports it through `onScrollChange` — no `scrollTo` from the app, no blank space past the last column — and the vertical offset stays `−200` |
| restore both | the 690px order returns, the offset stays `−90`, and `owner` paints at 120 + 80 = 200 − 90 from the viewport's left edge |
| move `owner` after `updated` | `cols=name,status,updated,owner,size,kind` at the same 690px; the header paints at 300 and its cells follow it |

34 checks, `--only table-columns-lifecycle`, green on 0.11.0 (~1.4 s). Fixture:
`src/live/table-columns.ts` — the widths and order, `visibleColumns`,
`contentWidth`, `columnOffset`, `maxOffsetX`, `moveColumn` and the
counts-only readout; `table-columns.test.ts` (8 cases) holds the width sum, the
local shift a hide makes, the end each width has, the move's order and clamps,
the readout wording and the README check count.

Two negative controls were measured, exit `1` each, then restored green:

- expecting the **pre-hide** end after the second hide fails `the offset clamps
  to the content's new end` with **`expected -250 ± 2, got -90`** — the clamp is
  the renderer's, so the probe does not call `scrollTo` and a grid that trusts
  the old pair would paint blank space even though the offset it reads moved.
- laying the rows out from the **unfiltered** order while the header reads the
  visible one fails `a hidden column paints no cell` (`expected true, got
  false`) — the two lists drift apart at the first hide, which is the failure a
  single shared list prevents.

Capture: `.artifacts/live/table-columns.png`.

### `svg-pattern` — measured on 0.11.0 here

The **generated line art a decorative field is made of**. Plan 600's `hexagon`
and `topography` are one generated `<path>` in a view box, sized by the element,
and the open question was whether the runtime paints that route at all — the
icons prove a small glyph path paints, not that a wide generated path is scaled,
clipped and re-laid-out when its box changes. The probe mounts five shapes with
disjoint tints, so one capture answers each half:

| Shape | Measurement |
| ----- | ----------- |
| square: a 60-unit square stroked 10 in a 100-unit view box, in a **200×200** element | ink **140×140**, centred: the path is scaled 2× with its stroke, so the 15–85-unit ink lands 30–170 points in from the element's origin |
| overhang: the same band drawn from **−40 to 140**, outside the view box on both sides | ink **200** wide and **40** tall, and nothing outside it: the view box clips its own overflow |
| wide: the band (0–100) in a **300×100** element | ink **300** wide and **30** thick, centred: the view box is scaled by the **width** (3×), not fitted to the short axis (which would paint 100 wide) |
| tall: the band in a **100×200** element | ink **100** wide and **10** thick: the height is not consulted, so the 2× it would have given appears nowhere |
| comb: 20 vertical subpaths in one `<path>`, a 240×80 view box in a **480×160** element | **20/20** strokes paint their tint, at each stroke's own centre |
| press **Resize** (square → **300×100**) | the path is laid out again at the new width (ink **210** wide, centred) and the square content area becomes 300 points tall: it paints **above and below** the 100-point element (ink bbox top 0, the window's edge) rather than being clipped to it |

34 checks, `--only svg-pattern`, green on 0.11.0 (~1.9 s). Fixture:
`src/live/pattern.ts` — the geometry, the width-only scale rule (`patternScale`,
`strokeWeight`), the generated comb path, the tint per shape and the capture →
logical conversion; `pattern.test.ts` (9 cases) holds the tints apart, the
fraction against the path the markup strokes, the overhang past both view-box
edges, the 20 subpaths the samples assume, the conversion, and the check count
the README prints against the steps' assertion sites.

What it settles, for a pattern field:

1. **A generated path paints, scaled from its view box by the element's width**,
   stroke included. A hexagon or topography path needs no `onLayout` pass: the
   host scales it.
2. **The view box clips.** A path drawn past its edges paints nothing outside
   them, so a pattern can be authored edge-to-edge without bleeding.
3. **A non-square element is neither letterboxed nor stretched.** The scale is
   the width's and the content is centred, so the content area keeps the view
   box's shape (square here) and the element does **not** clip it — in a 3:1 box
   the line art paints above and below the box it was given, over whatever is
   painted after it. A field with a square view box must therefore be sized
   near-square, and this is the one rule a plan for `hexagon`/`topography` has to
   carry.
4. **A stroke's weight follows that same width scale**: 10 units paint 10 points
   in the 100-wide box and 30 points in the 300-wide one. A pattern in a wide
   pane has heavier lines, not longer ones only.

Four negative controls were measured, exit `1` each, then restored green:

- dropping the stroke from the expected fraction fails `a generated path is
  scaled from its view box` with **`expected 120 ± 4, got 140`** — the ink is
  the path **plus** its half-stroke, which is what a line-art field is.
- truncating the generated path by one subpath fails `every subpath of a
  generated path paints` (`expected 20, got 19`) — a prefix of a generated path
  would otherwise paint and pass as a whole field.
- drawing the band inside the view box (`M 10 50 H 90`) fails `a path past the
  view box is clipped at the view box's edge` (`expected 200 ± 3, got 160`) —
  the check reads both edges, not one.
- resizing to a **square** box (300×300) fails `the square content area is not
  clipped to the element's own box` (`expected true, got false`) — the overflow
  is what a box that disagrees with the view box's aspect causes.

Captures: `.artifacts/live/svg-pattern.png` (the five shapes) and
`.artifacts/live/svg-pattern-resized.png` (the 300×100 square).

### `inspector-lifecycle` — measured on 0.11.0 here

**A property inspector beside the thing it edits.** Tier 3's *property
panels*, *key-value displays*, *data toolbars* and *statistic cards*, and Tier
4's *inspector panels* and *property editors*, are composition over controls
the runtime already provides — the runtime cannot refuse a key-value row any
more than it can refuse a toolbar. What no probe had measured is the
composition: whether one object can be read by a preview, a key-value table, a
metric card and an editing field at once, and whether an inspector pane behaves
like a pane rather than a form floating over the page.

The probe mounts the shipped `SplitPane`, the primitives' `Input` and 30
key-value rows beside a preview on 0.11.0, and measured:

| Step | Measurement |
| ---- | ----------- |
| open | the preview (520 px) and the inspector share one row: the **6 px** divider is their whole gap, both panes start at one `y`, and the group's right edge is the inspector pane's own |
| one object, four views | the preview box paints **120×80**, the readout, the `size` row and the metric all read that object, and the metric card totals **9600** |
| the table reads down | every label cell holds one `x`, every value cell holds one `x`, and a value starts at its label's right edge |
| the toolbar | both actions paint on one row **above** the first property row |
| type `ab` | the field keeps the text session, and the readout, the preview caption and the `tag` key-value row all read `ab` — one edit, one object |
| press **Wide** | the width becomes **240**, the area **19200**, the preview box paints **240** wide and still **80** tall, and the `size` row and metric follow in the same frame |
| press **Reset size** | the width returns to **120**; the typed tag stays, because reset is a size action, not a new object |
| wheel **−200** in the inspector | the inspector reports **−200** and scrolls its 30 rows, while its own pane and the preview caption keep their exact `y`, and the preview reports no scroll offset at all (it is not a scroller) |

48 checks, `--only inspector-lifecycle`, green on 0.11.0 (~0.8 s alone;
the mount is the window's, so a run after another probe's teardown reports
seconds). Fixture:
`src/live/inspector.ts` — the object, its four readings, the area and size
arithmetic, the row set and the scroll premise; `inspector.test.ts` (9 cases)
holds the area against a sum, the tag's absence against an empty string, the
reset against a lost edit, the row count against the viewport it must overflow,
and the README's count against the steps' assertion sites.

What it settles, for the workspace components:

1. **A property panel is a pane, not a page.** The inspector scrolls its own
   rows inside the split while the preview holds still, so an inspector can own
   `overflow` and a layout does not need to keep the whole dock in view.
2. **One object, every view.** The key-value table, the metric card, the
   preview and the field all repaint from the same state in the frame the edit
   lands, with no reconciliation step.
3. **An editing field inside a scrolled pane keeps the platform text session**
   while the pane's rows are taller than its viewport — the property-editor
   half of the inspector.
4. **A toolbar is a row in the pane.** Its actions sit above the rows and are
   hit-tested like any control; the runtime provides no toolbar host, and needs
   none.

Three negative controls were measured, exit `1` each, then restored green:

- painting the preview at the **initial** width instead of the object's fails
  `the preview paints the width the action set` with
  **`expected 240 ± 1, got 120`** — the preview is a second reader of the same
  state, not a snapshot.
- turning the inspector's `overflowY` to `hidden` fails `the wheel scrolls the
  inspector` with **`expected -200 ± 2, got NaN`** — a pane that fits its rows
  reports no scroll handle at all, so the wheel check cannot pass on a box that
  merely clips.
- widening one property row's label column fails `one value column holds its x
  down the rows` with **`expected 641 ± 1, got 649`** — the value column is
  derived from the label width, so a per-row width breaks the table the reader
  scans down.

Captures: `.artifacts/live/inspector.png` (the workspace after the type, the
resize, the reset and the scroll).

## Terminal mode: the pty probe

`docs/gpuix-capabilities.md` lists **Terminal rendering** as supported — the
runtime runs the same view on a kitty-graphics terminal platform
(`render(<App />, { terminal: true })`) — and until this probe existed nothing
here had painted one. A terminal frame is not a window: the automation protocol
cannot see it, so the app is the instrument and the pty's escape stream is the
evidence.

```sh
nub run --filter playground build
nub apps/playground/dist/terminal/run.js                         # all four scenarios
nub apps/playground/dist/terminal/run.js --only terminal-input   # one of them
nub apps/playground/dist/terminal/run.js --only terminal-pointer # the pointer press
nub apps/playground/dist/terminal/run.js --only terminal-resize  # the terminal resize
nub apps/playground/dist/terminal/run.js --list                  # derived ids
```

`src/terminal/main.tsx` renders a page whose colour says what the app read — the
rest page is red, the native-window page is green, the pressed page is blue — and
one centred word whose ink turns yellow once a pointer press has reached the app. `src/terminal/run.ts` starts it inside a **100×40-cell pty**
and decodes the frames the platform writes back with `parseKittyStream`
(`src/terminal/kitty.ts`): kitty graphics sends each frame as zlib-compressed
RGBA in base64, chunked across APC continuations, and the platform reuses one
image id and placement for every frame of the window.

Two details of the harness are load-bearing:

- **The pty is macOS `script`, and its stdin must be a plain pipe.** libuv hands
  a child a socketpair; `script` calls `tcgetattr` on stdin and treats the
  `ENOTSUP` a socket returns as fatal (`script: tcgetattr/ioctl: Operation not
  supported on socket`). The runner therefore spawns `cat | script`, forwards
  writes through the `cat`, and sizes the pty with `stty` inside the child.
  `effect/process`'s spawner uses the same socketpair, so this one boundary uses
  the platform's own spawner; everything after it is Effect.
- **Ctrl-C is the quit gesture**, and the restore only appears after it: the
  platform leaves ctrl-c unhandled in the terminal's text contexts, restores the
  terminal on exit, and replays its logs to stderr afterwards.

Measured on 0.11.0 here (`terminal-render`, `terminal-resize`, `terminal-pointer`,
`terminal-input`, 4/4, ~6–10 s on a busy host):

| State | What the stream proves |
| ----- | ---------------------- |
| handshake | the alternate screen entered and the cursor hidden; mouse (`?1003h`, `?1016h`), kitty keyboard (`>31u`), bracketed paste (`?2004h`) and in-band resize (`?2048h`) enabled; the window titled `GPUIX` |
| first frame | one inline transfer (`t=d`, `f=32`, `o=z`, `q=2`) inside a `?2026h` synchronized-update batch, **800×640** — the 100×40 grid at the platform's fallback 8×16 cell |
| page | **510 864 of 512 000** pixels (99.78%) are exactly `#D9432B`, 0.00% are the native-window page, so `isTerminal()` reads true in the app |
| text | **508** exact-white ink pixels; the ink's box is centred within 2px horizontally and 8px vertically of the frame's centre |
| click | a left SGR press at the frame's centre (`ESC[<0;400;320M`, released with `m`) reaches the app's `onClick`: the word's **508** white ink pixels become `#FFF200` while the page stays `#D9432B` |
| resize | the terminal's in-band resize (`ESC[48;20;50;0;0t`, the protocol `?2048h` negotiates) repaints the app at **400×320** — the 50×20 grid — with the page still filling it. A `stty` on the pty alone did **not** repaint: the platform answers its terminal's own resize message, not a pty ioctl |
| key | a kitty keyboard event (`ESC[116u`, `t`) reaches the app-level handler and repaints the **whole** page `#2B43D9`, with **0** rest-page pixels left |
| quit | ctrl-c exits `0`; the stream then leaves the alternate screen, shows the cursor, disables the four protocols, pops the keyboard flags and deletes the image (`a=d`) |

Exit codes are the suite's: `0` passed, `1` a check failed, `2` no evidence (no
frame at all, an unknown argument, or a host without the macOS pty wrapper). A
no-frame failure quotes the child's own terminal text with the control stream
stripped — the preflight's "no GPUix binding" remedy is printed on the pty, not
on the wrapper's stderr, so the run has to replay it.
Artifacts: `.artifacts/terminal/frame.png`, `.artifacts/terminal/clicked.png`,
`.artifacts/terminal/resized.png`, `.artifacts/terminal/pressed.png`,
`.artifacts/terminal-report.json`.

Two decoder defects this probe found and `src/terminal/kitty.test.ts` now holds:
a completed transfer **replaced** the frame list instead of appending, so a run
that had repainted read as "no page frame at all"; and an image delete carries
no `;<payload>`, so the original APC grammar never saw the restore. Both
directions were measured — reverting either fails its kitty case by name.

The paint check was measured failing too: with `TERMINAL_REST_FILL` one hex
digit off (`#D9432C`), all four scenarios `FAIL` and the run exits `1` —
`terminal-render` reports `expected at least 0.9 of the frame in #d9432b, got
0.000`, `terminal-resize` finds no resized page, and both input scenarios report
no repaint frame; restored, 4/4.

The harness is macOS-only in this runner (`script` + `stty`): the runtime's
terminal platform also targets Linux, and a Linux wrapper is not a claim this
probe makes. Terminal host elements are a different matter — there is no PTY
*element*, which is the Tier 4 row's honest limitation.

## Release gate

The live suite is **not** part of `nub run check`: it needs a desktop session
and a loaded binding, so it runs as a **release gate** — once, on the release
host, before a tag:

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js            # every probe; ~1 min
echo $?                                          # 0 = evidence, 2 = no window
```

What a release records:

- `.artifacts/live-report.json` — each probe's checks, with the host line
  (`gpuix live window darwin-x64 @gpuix/native 0.11.0 (window-background
  opaque)`) and the duration, so a report says which window it came from;
- `.artifacts/live/<state>.png` — one capture per paint state a probe names,
  which is what the docs cite instead of a fake preview;
- the probe count, **derived** from the registry rather than typed:
  `nub apps/playground/dist/live/run.js --list | wc -l`.

A failing probe exits `1` and still writes its report and captures, so a release
blocker stays visible. Exit `2` is **not** a pass: it means the host had no
window and the suite produced no evidence — re-run it on a host that can open
one. While iterating, select only the probes a change touches with
`--only <id>` (repeatable); the full suite is for the gate.

A probe's `durationMs` includes its **mount**, and a mount swaps the previous
probe's tree out of the same window. A probe that follows one which painted
`anchored` layers therefore reads seconds longer than the same probe run alone
(measured: `dialog-lifecycle` 0.4 s first, 4.2 s after `floating-sides`;
`menu-lifecycle` 0.5 s alone, 7.2 s after `dialog-lifecycle`) while every check
still passes. Read the checks, not the milliseconds: the number is the harness's
teardown cost, not the probe's work.

## Structure

```
src/main.tsx             the dev entry: preflight, then one render()
src/app.tsx              the shell: palette switch, sidebar = registry, stage
src/palettes.ts          the three built-in palettes the shell and gallery share
src/ui.tsx               Readout / Panel / Pressable / … reading useTheme()
src/types.ts             PlaygroundScenario = SmokeScenario + view
src/panels/resize.ts     pure resize math (nextSize, clamped)
src/panels/split-pane.tsx the pointer-captured divider
src/scenarios/*.tsx      one view + one steps effect per capability
src/scenarios/theme.tsx  the token gallery (colour roles, type, ring, shadow)
src/scenarios/shell.tsx  mounts the real App; guards the sidebar's scrolling
src/scenarios/expand-fixture.ts the expandable-row geometry the probe asserts
src/scenarios/virtual-table.tsx a 500-row table inside <virtual-list>
src/scenarios/tree.tsx      indentation, expand/collapse, arrow keys
src/scenarios/log-viewer.tsx bottom-anchored virtual list (tail, appends)
src/scenarios/virtual-list-prepend.tsx a prepended page holds the reader's row, and shows at the top
src/scenarios/modal.tsx     focus entry, Tab trap, focus return, nested Escape
src/scenarios/floating.tsx  side/align/offset placement and the window snap
src/scenarios/docking.tsx   nested splits, a caller-owned sidebar and a tabbed pane
src/scenarios/dock-reflow.tsx a pane's onLayout reports the width a sibling takes
src/scenarios/a11y-tree.tsx  role and aria-* read back from the a11y tree
src/scenarios/data-grid.tsx a fixed header over a vertical scroller, one shared x offset
src/scenarios/search-highlights.tsx the runtime's find: query, case, word and ranges
src/scenarios/editor.tsx    a textarea that edits lines, <code> and <diff> read-only
src/scenarios/examples.tsx  the shipped-example gallery: one page per registry id
src/scenarios/index.ts   one implementation per registered id
src/scenarios/registry.ts the ids, titles and capabilities + the pure integrity check
src/scenarios/registry.test.ts the README's printed total and capability list against it
src/window-handlers.tsx  the app-level window key and selection seams
src/smoke/run.ts         the CLI (preflight → mount each scenario → report)
src/live/registry.ts     live probe ids + capabilities (imports nothing native)
src/live/scenarios.tsx   one window view + async steps per live probe
src/live/fonts.ts        the probe typeface's bytes and its declared advances
src/live/loading-row.ts  the loading-row fixture, its pixel arithmetic and the restore rule
src/live/content.ts      the chart/image fixtures the content probe paints
src/live/virtual-tree.ts the 4 000-node file-tree fixture and its flattening
src/live/dock-focus.ts   the dock fixture and the Tab stop rule the probe measures
src/live/header-menu.ts  the header widths and trigger-cell arithmetic the probe asserts
src/live/backdrop.ts     the window-backdrop modes, fixture and capture arithmetic
src/live/window-facts.tsx the window options the runner opened, read by a probe
src/live/editor-overlay.ts the editable-code fixture: one source under a field and beside it
src/live/multi-pane.ts  the two-pane editor fixture: buffers, split arithmetic and the drag clamp
src/live/table-filter.ts the filtered-grid fixture: the label match, the selection rule and the filtered-order step
src/live/table-columns.ts the configurable-grid fixture: widths, column offsets, the pan end and the column move
src/live/settle.ts      the bounded poll a probe waits for a settled paint with
src/live/host.ts         the window → AsyncSmokeHost adapter
src/live/run.ts          the live CLI (preflight → mount each probe → report)
src/terminal/logic.ts    the three page colours and the word the pty probe measures
src/terminal/app.tsx     the terminal-mode view: one page, one word, one key count
src/terminal/main.tsx    the terminal-mode entry (`render(…, { terminal: true })`)
src/terminal/kitty.ts    the kitty-graphics escape stream → frames and protocol facts
src/terminal/run.ts      the pty CLI (spawn → key → quit → report) and its frame rules
```

## Deviations from plan `120`, and why

The plan was written against upstream `main`; the installed `0.10.0` API is
narrower. Each deviation is deliberate and measured:

- **The host adapter is synchronous, over `TestRenderer`** (`smoke/host.ts`),
  not the async `automation` `Locator`/`App`. Every renderer input and
  inspection method is synchronous and the `SmokeHost` contract is synchronous.
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

- The eleven core capabilities (including the token gallery, the modal contract,
  floating placement and text selection), the Tier 3/4 probes, the window's own
  backdrop, the app-level shortcut and selection probes run in real GPUix 0.11.0
  on this host. The last full pass was **58/58** on 2026-10-22: every probe the
  registry declares ran and passed in one window. Two partial passes before it
  named different probes (`list-lifecycle` and `command-palette`, then
  `window-resize-reflow` and `header-menu-lifecycle`), and the component defects
  behind the first pair were fixed in that workstream while the remaining three
  were one-shot frame reads in the probes — see §A probe waits for a settled
  paint, which records all three measured shapes and the waits that replaced
  them. The full live suite is the release gate, and this line is its result.
  Measured alone since then: `inspector-lifecycle` (one probe, run alone).
- Every shipped example the docs quote mounts and paints: `examples-mount`
  pages through the components' registry (39 screens, 158 checks) and fails when
  a page paints nothing or two ids show one screen. Its two negative controls
  are named in §The example gallery.
- The terminal-mode probe proves the runtime paints a view into a pty:
  `terminal-render`, `terminal-resize`, `terminal-pointer` and `terminal-input`
  (4/4 on 0.11.0) decode the platform's kitty frames to an 800×640 page with
  99.78% exact fill and 508 ink pixels, resize it to 400×320 through the
  terminal's in-band resize, drive a pointer press that turns the word's ink
  yellow without moving the page, drive a kitty key that repaints the whole page,
  and watch ctrl-c restore the terminal and delete the image. §Terminal mode
  records the numbers and the two decoder defects it found; a one-digit page
  colour change fails every scenario with the measured pixels (exit `1`).
- The suite can fail: changing `panel-resize`'s expected delta `+80 → +81` makes  it exit `1`, name the check, and report `panel=failed` (plan `140` §4).
  Pointing `swatch-background` at `card` does the same for the gallery
  (`swatch background: expected "#11141A", got "#191D25"`, exit `1`). Removing
  the Tab trap makes `modal-focus-trap` fail with
  `Tab moved focus [modal-content,modal-content,…]`, and removing the focus
  return fails with `expected "modal-trigger", got "none"` — both exit `1`
  (plan `155` §8). Hard-coding `theme-platform`'s expected family to `Menlo`
  fails with `linux mono family: expected "Menlo", got "DejaVu Sans Mono"`,
  exit `1`; restored, green. Hard-coding `side="bottom"` in the floating layer
  fails `side=right sits one gap right of the anchor: expected 326 ± 1, got 200`
  (plan `156` §8). Declaring `GpuixTestSquare` at mount in
  `font-registration-late` fails `the face was not painted before it was
  installed` (exit `1`), which is that probe's negative control. Mapping the
  left layer to `side="right"` in `floating-sides` fails
  `side=left ends one gap left of its anchor: expected 254 ± 1, got 546`
  (exit `1`). In `text-selection`, marking the chrome line `selectable` fails
  `a drag over the chrome line selects nothing`, and dropping `selectable` from
  the content line fails `a drag over the selectable line produces a selection`
  (`expected a value, got none`) — exit `1` each. In `scroll-horizontal`,
  dropping `overflowX` fails `the strip reports a scroll offset`
  (`expected a value, got none`, exit `1`). In `dialog-lifecycle`,
  `dismissible={false}` fails `Escape unpaints the dialog surface`
  (`expected true, got false`); in `menu-lifecycle`, dropping one `ArrowDown`
  fails `an arrow key moves focus to the next row`
  (`expected "menu-delete", got "menu-rename"`); in `toast-lifecycle`, dropping
  the viewport fails `text toast-viewport: Locator did not match any element` —
  each exit `1`. In `modal-focus-restore`, expecting the opener to get the focus
  back from the `autoFocus` case fails
  `a field that took the focus at mount leaves the focus nowhere when the modal
  closes: expected "restore-auto-trigger", got "none"` (exit `1`) — the defect
  the probe measures; in `command-palette`, expecting the first row instead of
  the highlighted one fails
  `Enter runs the highlighted action, not the first one: expected "ran=new-file
  runs=1", got "ran=open-settings runs=1"` (exit `1`). In `select-lifecycle`,
  dropping `sideOffset` fails `the list keeps the gap it was given below the
  trigger` (`expected 6 ± 1, got 0`) and enabling the disabled row fails the
  wrap case (`expected "value=daily changes=3", got "value=archived
  changes=3"`). In `clipboard-lifecycle`, dropping `cmd-c` pastes the previous
  run's marker (`expected "gpuix clipboard q6uuii", got "gpuix clipboard
  pt6c88"`) — each exit `1`. In `selection-lifecycle`, dropping `selectable`
  fails `a pointer drag paints the selection wash` (`expected true, got false`,
  exit `1`).
- The registry reveals a missing or duplicated capability (`scenarioProblems`,
  unit-tested).
- The README's printed totals follow the registry: `registry.test.ts` fails when
  the scenario count or the capability list stops matching, so a new scenario
  cannot leave the document claiming the previous run.
- The resize arithmetic clamps inclusively (`resize.test.ts`).
- The CLI's unsupported path returns `2` without evaluating the suite
  (`run.test.ts`).
- The style snapshot refuses a payload whose property type changed, rather than
  coercing it (`smoke.test.ts`).

Not proven here: the verdicts use a **locally-built** binding (ADR 0003), not the
published binary; and detaching a tab into a new window is impossible (no
multiple windows).

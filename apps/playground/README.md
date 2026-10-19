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
`tier2-flow`), the multi-pane editor probe (`multi-pane-editor`), the data
toolbar probe (`data-toolbar`), the data-grid column probes
(`data-grid-columns`, `column-config`), the notification-centre probe
(`notification-centre`), the crop-area probe (`crop-area`), the multi-step-form
probe (`wizard-flow`), the editable-grid probe (`grid-cell-editing`), the shell
probes (`shell-navigation`, `shell-selection`, `shell-filter`), which mount the real `App` — the
first proves the sidebar scrolls (the registry is longer than the window, so an
unreachable entry would be a scenario the app cannot open), the second proves
selecting an entry, the keyboard contract and the palette switch, and the third
proves the filter that makes 100 entries scannable — and the
app-root probe (`root-single-child`, `root-wrapper`), which measures the one
rule every scenario's mount sits on: the native root keeps only its **last**
child.

The **live registry** (`src/live/scenarios.tsx`) is a second, hand-maintained
list of the window twins. `liveScenarioProblems` guards it against the headless
registry: ids must be unique and `live-`-prefixed, and every live capability
must also be mounted by a headless scenario. A duplicate id would make `--only`
run one of two entries while a report counts both, and an unmatched capability
would claim live evidence for a family the offline suite never mounted. The rule
is pure (four tests in `src/live/scenarios.test.ts`), so it costs no window.

## Run it

```sh
nub run dev:playground              # from the repo root: opens the playground window
nub run --filter playground smoke   # the native smoke suite, headless
nub apps/playground/dist/smoke/run.js --only layout-flex   # one headless scenario
nub apps/playground/dist/smoke/run.js --list               # headless ids, no binding
nub run --filter playground smoke:live  # the full live suite (explicit --all)
nub apps/playground/dist/live/run.js --only live-tier2-toast  # one window, one scenario
nub apps/playground/dist/live/run.js --list                    # ids, no window
```

`--only` accepts `a,b` and repeats in both runners. An unknown flag or an
unknown id prints the usage (and, for an id, every valid one) and exits `2`
**before the binding is imported** — a typo never runs the wrong set.

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
| `2`  | the runtime is unsupported here, **or a usage error / nothing ran** — no evidence |

Both scripts run the built CLI from the **repo root**, so artifacts always land
in `apps/playground/.artifacts` regardless of which entrypoint you use.

**Observe the code from the built CLI, not through `nub run`.** nub 0.9.6
collapses any non-zero child exit to `1`, so `nub run --filter playground smoke`
reports `1` even when the suite said `2`:

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js; echo $?
# -> 0 here (104/104 green); -> 2 on a host with no binding
```

Artifacts (gitignored, under `.artifacts/`):

- `.artifacts/smoke-report.json` — the schema-encoded report (`Report.reportJson`);
- `.artifacts/screenshots/<scenario-id>.png` — one frame per scenario with `--screenshots`.

Flags: `--json`, `--only <id[,id]>` (repeatable), `--list`, `--screenshots`,
`--capture <dir>`, `--commit <sha>`, `--artifacts <dir>`.

Nothing is written to `.artifacts/` on an unsupported host: exit `2` means there
is no evidence, and a stale report must never be mistaken for a fresh one.

## Capturing native frames for the docs (plan `564`)

The docs may publish a capture only when a sidecar names the run that produced
it (docs plan `412` §5); a frame without one is not evidence. `--capture <dir>`
writes one PNG per selected scenario and, **only when every selected scenario
passed**, one `provenance.json` beside them:

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --capture /tmp/gpuixui-theming \
  --only theme-color-roles,theme-type-and-shadow
```

```json
{
  "platform": "darwin-x64",
  "gpuixVersion": "0.10.0",
  "commit": "965fc69",
  "command": "nub apps/playground/dist/smoke/run.js --capture /tmp/gpuixui-theming --only theme-color-roles,theme-type-and-shadow",
  "capturedAt": "2026-10-19T02:04:56.000Z"
}
```

- `capturedAt` is the **report's** start time, not the time the file was copied.
- `command` is normalised from the directory and the selected ids, never raw
  argv, so a temporary path cannot leak into a published caption.
- `commit` is `git rev-parse --short HEAD` in the checkout. Pass
  `--commit <sha>` when the tree has no git metadata; without either, capture
  exits `2` rather than inventing a revision.
- The sidecar is published only for a green run. The directory's earlier PNGs
  and sidecar are removed before capture, so a capture directory always
  describes exactly one run; a red run leaves the frames it painted but no
  caption.
- `--capture` implies `--screenshots`; `--screenshots` alone still writes to
  `.artifacts/screenshots/` with no sidecar.

The full contract, including the two-direction proofs, is plan `564`.

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
`.agents/slop/scratch/gpuix-build/` (agent state, gitignored), applies
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

### Finding a scenario (plan `528`)

The registry became 100 entries, so the sidebar gained a filter. It is a
controlled native `<input>` over the same registry — the rule is the pure
`filterScenarios` (`src/shell-filter.ts`), matched case-insensitively against
each scenario's **id, title and capability**, and the count is painted beside
it. `shell-filter` and `live-shell-filter` drive it.

| Fact | Measured |
| ---- | -------- |
| filter | typing `crop` paints `1 of 103`, keeps `nav-crop-area` and drops `nav-window-layout` from the tree; `CROP` matches the same entry |
| stage | while the previous pick is hidden the stage follows the first match and **that row** paints `colors.accent` — the highlight is the derived current, not the stored `selected` |
| clearing | `Escape` belongs to the sidebar container, so it clears from the focused filter **and** from a focused row (keys bubble, plan `345`); the full list returns and the pick the reader made is kept |
| empty | `zzz` paints `0 of 103`, `No scenarios match` in the sidebar and `no scenarios` in the stage |
| selection | filtering never rewrites `selected`: hide the pick, then clear, and the stage returns to the hidden pick (a filtered-out pick yields to the first match only while the filter is active) |

## The app root (plan `522`)

`root-single-child` and `root-wrapper` measure the boundary every other
scenario's mount sits on: the native root keeps **exactly one child, the last
one**. Both views are plain `div`s, so nothing but the root rule differs.

| Fact | Measured |
| ---- | -------- |
| two roots | only `root-last` is reachable and painted (200 × 40 at the origin); `root-first` has no retained node, no bounds and no painted text |
| silent cost | `retainedElements()` reports **6** — two text-bearing roots are three host nodes each, so the dropped subtree is retained but unreachable |
| one wrapper | `root-wrap` paints 320 wide and content-high; both children paint, `gap: 12` is exact, both texts are painted, 7 host nodes |
| live twin | `live-root` mounts the two-root view in the real window: the earlier root is absent there too, so the rule is the reconciler's, not the `TestRenderer`'s |

The sidebar preview nests a view inside the shell's stage, so both roots paint
there; the smoke mount **is** the app boundary and is the honest observation.
Consequence for a consumer: an `App` must render one root element. A context
provider (`ThemeProvider`, `useWindowKey`'s provider) adds no host element and
does not change the count, so wrapping two roots in a provider does **not** fix
them — wrap them in a `div`.

## Layout and typography in a real window (plan `591`)

The three geometry contracts every component rests on were the last
layout-family evidence that was `TestRenderer`-only. Their live twins mount the
same views in the 1100×720 window and read `bounds()` and `highlights()`:

| Live id | Proves in a window |
| ------- | ------------------ |
| `live-layout-flex` | `640/200/320` widths, the `8` px gap, absolute insets `24/16`, and one shared row |
| `live-layout-grid` | `93.33` tracks with `10` px gaps, `145×95` explicit cells, all four `gridColumnMin` modes, nested/overflow/`flexGrow`, and the wrapping-line stretch (`104` vs `38`) |
| `live-typography` | `30/60` line heights, the `19.5/26/39` default line boxes, the bold run's extra width, `alignSelf` at `100/200`, `justifyContent` at `70`, and **`textAlign` still a no-op** |

The grid view is 992 px tall, so `live-layout-grid` mounts it in one scroller
and reads it in two batches: the first four wrapped rows at rest, the rest after
a real wheel reaches the clamp. Every assertion compares a box with its own
container, so the scroll offset never enters a number. The window reproduces
every offscreen value exactly — no font or device-scale correction was needed.

## The collapsible height recipe in a real window (plan `592`)

`collapsible-height` is the recipe `@gpuixui/components`' Collapsible and
Accordion still need, and it was `TestRenderer`-only. `live-collapsible` mounts
the same view in the window and drives it through the paused live motion clock:

| Fact | Measured live |
| ---- | ------------- |
| first-layout measurement | the body is mounted and laid out while clipped; the readout says `mounted=140` |
| the collapsed row | the next row starts above the clipped content |
| the clip | a press aimed at `collapse-button` counts nothing (`presses=0`) |
| the tween | the 80 ms frame moves the next row `56 px` of the 140 px tween, and `complete=0` |
| the end state | the row moved `140 ± 1`, `complete=1` |
| interaction | the open control runs (`presses=1`) and typing reaches `draft=ab` |
| retention | collapsing reaches `0`, `complete=2`, the body still answers `alpha`, and `draft=ab` survives |
| the keyboard | Enter re-opens to 140 px, `complete=3`, `draft=ab` |

The recipe is therefore real in a window, not just offscreen: a component can
keep its body mounted, measure it while clipped, animate it and keep its state.

## The chart recipe in a real window (plan `593`)

`chart-svg` decides the Tier 3 chart recipe; `live-chart` confirms the parts a
window can answer:

| Fact | Measured live |
| ---- | ------------- |
| bars | `56` wide, `96 / 64 / 32` tall, each bottom on the plot baseline, advancing by `72` |
| hit target | a click on `chart-bar-1` selects `series=beta value=64` |
| labels | `chart-value-1` paints `64`, `chart-label-0` paints `Jan` |
| vectors | both `<svg>` layers paint the same `480 × 160` box |
| SVG children | the authored `chart-svg-child` answers its text but is **absent** from `paintedText()` |
| full colour | the SVG data-URL `<img>` keeps its declared `480 × 120` box |

The last row refines plan `577`: a **raster** data URL loses 1 px per axis in
the live tracker, but an **SVG** source keeps its declared box. A chart
component can therefore size its colour layer exactly; only its pixels are
screenshot evidence.

## The QR recipe in a real window (plan `599`)

`qr-code` decides how a matrix can be drawn; `live-qr` (45 checks) measures the
226-node absolute grid and both single-node routes in a window:

| Fact | Measured live |
| ---- | ------------- |
| matrix | `174 × 174` for v1, `164 × 164` for v4 |
| modules | `6 × 6` at v1 and `4 × 4` at v4, advancing by exactly one module |
| quiet zone | the first dark module starts `+24` (v1) / `+16` (v4) from the matrix |
| finders | top-right at `x + 60`, bottom-left at `y + 60`, centre at `(42, 42)` |
| light module | `bounds` is `null` — the runtime retains no node for it |
| hit target | a click on `qr-dot-3-3` reports `hit=r3c3` |
| SVG mask | one painted `174 × 174` node and no module nodes |
| image | the SVG data URL keeps `174 × 174` and paints no `img:` fallback |

Colour, the retained-node cost and the `Image` accessibility node stay headless:
the live renderer exposes no style, retained count or a11y dump (plan `197`).

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

### The same controls in a real window (plan `570`)

Tier 1 is what every other component composes, so its pointer focus, keys, popup
commit and focus advance are proven in the real 1100 × 720 window too. The four
twins reuse the views above unchanged (72 checks). Style, colour and the
accessibility dump stay headless: `GpuixRenderer` has no such report (plan
`197`).

| Scenario | What it asserts in the window |
| -------- | ----------------------------- |
| `live-primitives-fields` | a real click focuses the Input, `a t l a s` reaches `onChange` and Enter `onSubmit`; the disabled field refuses the edit (`locked=0`) without leaking the key to another field; a click checks the Checkbox and Space-up unchecks it; a click flips the Switch; the Select paints its options, Down+Enter commits `us-east`, Escape closes and keeps it |
| `live-primitives-display` | a click at a quarter of the Slider track sets a value below the middle, Right/Left step it by one; Progress, Meter and Skeleton paint (the skeleton is 14 px); a real pointer enter opens the Tooltip |
| `live-primitives-choice` | a real click selects a radio row and Down/Up move the selection; a real first-star click rates one, Right/End raise it, Right clamps at five, Delete clears and Left clamps at zero |
| `live-primitives-entry` | a click focuses the NumberField, Up/Down step it and typed `99` commits as `10`; six OTP keystrokes advance focus to the last cell, Backspace deletes one, Left moves focus back and typing rewrites that cell |

A measured harness fact: two keys sent back to back can coalesce (two Downs
stepped once), so the entry scenario settles per step; the Select's popup also
paints before its focus commit lands, so the Down/Enter path settles between the
paint and the key. Mutation proofs are in plan `570` §8.

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

### The same three in a real window (plan `554`)

`live-select`, `live-combobox` and `live-tooltip` reuse the `PopupsProbe` views
above in the real 1100×720 window, so the published popups are no longer
headless-only evidence (17 + 17 + 9 checks). The measured facts:

| Question | Measured |
| -------- | -------- |
| open | a real `click` on the trigger mounts the list and paints its items; a click on the input opens the combobox |
| commit | an item click commits `Beta` and returns **native** focus to the trigger; Enter commits the highlighted `Beta` in the combobox |
| keyboard | Down on the focused trigger opens, the next Down moves, Enter commits `Gamma`; Escape closes |
| outside press | a real click at `(1000, 690)` — inside the window, outside the probe — dismisses and returns focus to the trigger. The headless point `(1200, 700)` is outside the live window, so the live twin uses its own point |
| filter / empty | typing `be` reaches the query and unmounts `Alpha`; a later `zz` query paints `no matches` |
| tooltip | a real pointer enter opens the published tip and paints `tip text`; the leave runs the component's 80 ms timer and closes it |

A trigger click also closes an open list, so that gesture cannot distinguish the
outside-dismissal path; the mutation proof removes the outside press instead
(plan `554` §8).

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

### `<img>` sources (plan `586`)

The image element has four source kinds, and only two are assertable. All four
are mounted by `native-surfaces` (`live-content` adds the http(s) case):

| Source | Asserted | Evidence |
| ------ | -------- | -------- |
| data URL (`src={ONE_PIXEL_PNG}`) | box `64 × 64`, no load-failure fallback | `getPaintedText` + bounds |
| bytes (`ref.setImage(png)`) | state readout `ok`, box `48 × 48`, **no** `img: no src` | `getPaintedText` + bounds |
| bytes, undecodable (`setImage`) | the runtime **throws** `unrecognized image format`; the node keeps `img: no src` and the `46 × 46` fallback box | the view records the caught throw |
| file path (`src={absolutePath}`) | box only; the real window paints the bitmap | **screenshot only** |
| http(s), refused (`https://127.0.0.1:1/…`) | box only; the real window paints `img: load failed` | **screenshot only** |

The path/URL limit is measured, not assumed: `gpui::img(path|uri)` renders its
fallback through a plain GPUI element, which is **not** a retained text node and
never reaches `getPaintedText()`; there is no load/error event; and the
offscreen loader does not settle, so headless paints nothing. A consumer that
needs an error state must read the bytes itself (`FileSystem`) and validate them
before `setImage`, or stat the path before rendering. The PNG fixture lives at
`apps/playground/fixtures/one-pixel.png`; the bytes are decoded from the same
base64 constant with `Schema.Uint8ArrayFromBase64`.


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

## The selection-change signal (plan `615`)

`selection-signal` proves the published `onSelectionChange` reaches a view, and
what a copy affordance may rely on. The runner owns the root option (a component
cannot reach it) and forwards it through `useSelectionChange`, the same shape as
`useWindowKey`:

| Question | Measured |
| -------- | -------- |
| payload | `value` is the joined selected text; it is **absent** when the selection is empty |
| a clear | `clearSelection()` and a click that clears a selection both notify with no `value` |
| one drag | **several** events — 1–3 headless, ~8 live (one per pointer move that changed the range) |
| a click on the affordance | **clears the selection**: headless the clear lands before `onClick` (`D S(-) C`), live after it (`D C S(-)`) |

So a copy action snapshots the last event text at pointer-down and copies the
snapshot; reading component state in `onClick` copies nothing headless. The
`live-selection-signal` twin repeats the whole path in a real window, and the
headless removal of the seam fails the first check (`the drag reported a
change`).

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

In a real window (`live-tree`, plan `559`) the same path holds: a real click
expands `dir-0` to 48 rows and keeps it selected, the child label indents 16 px
inside the virtual row, the painted window stays smaller than the flattened
tree, a second click collapses it, and a second directory expands. A real
`-800` wheel moves the list anchor and unpaints the rows above the window; an
exact `scrollToItem(25)` anchors `[25, 0, 260]` and paints `dir-3/file-24`; a
click focuses that row, `Down`/`Up` move native focus and the selection; and at
the top a click collapses the open directory, `Right` re-opens it, `Right` again
focuses its first child, `Left` returns to the parent and `Left` again collapses
it. **One measured composition fact:** the 280 px wrapper is a flex child in a
340 px column, so the live viewport resolves to **260** — the list anchor reports
the flex-resolved height, not the declared one. `vtree-viewport` is the painted
box and wheel target because a `<virtual-list>` has no bounds live.

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

**In a real window (`live-variable-rows`, plan `534`):** the same six facts hold
through the automation protocol — 20/40/60 px rows stack at their declared
offsets and heights, a real click expands row 2 to exactly 120 px and moves rows
3–5 by exactly `+60` with the anchor unmoved, a second click collapses it,
`scrollToItem(30)` puts row 30 at the viewport top, and a real `-120` wheel lands
inside the row it names. Two rules for a live probe: read the origin from the
`vr-viewport` `div` because a `<virtual-list>` has **no painted bounds** in the
live tree (plan `532`), and read the anchor from `listScrollTop` — never from a
list's bounds.

The recipe for Expandable rows: declare each row's height (state, not a
measurement pass), let the list reflow, and persist the anchor as before — no
`estimatedItemHeight` tuning is needed for correctness, only for the scrollbar's
rough scale. A component does **not** need to scroll by hand after an expansion.

## The cost model in a real window (plan `620`)

`scale-cost` measured what a virtual list **retains** in the `TestRenderer`;
`live-scale` repeats the measurable half in a real window through
`retainedNodes()`, which counts the automation tree (the same retained tree the
focus bridge walks). The point is the difference between paint and memory:
scrolling windows the paint, but every declared row keeps its nodes.

| Question | Measured in the 1100 × 720 window |
| -------- | --------------------------------- |
| Nodes at 2,000 rows | **6,019** (100 rows: **319**) |
| Nodes per row | **3** — the delta is exactly `3 × 1,900 = 5,700`, matching the headless host-node count |
| Why the totals differ from `scale-cost` | the protocol tree adds a constant **7** chrome nodes around the list (`6,019 − 6,012`, `319 − 312`) |
| `scrollToItem(1000)` | the anchor is `[1000, …]`, row 1000 paints, row 0 does not, and the node count is **unchanged** |
| Shrinking the model to 100 rows | removes exactly 5,700 nodes; regrowing restores 6,019 |
| The syntax-cache half | **stays headless**: the automation protocol has no cache verb and `GpuixRenderer` exposes no counter |

So component code can rely on windowed paint, but not on windowed memory: a
100,000-row table still retains hundreds of thousands of nodes. Virtualize the
model at the app level when the row count can grow unbounded.

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
exact, and focus/Escape and the close button hold.

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

## Column configuration (plan `384`)

`column-config` adds the settings axis the grid was missing: a pure
`{ order, hidden }` model over the plan-349 widths, driven from an anchored panel
that lists every column with a show/hide control and up/down controls. The grid
keeps its 150 px frozen ID column; the four configurable columns start at
`name 200`, `status 120`, `size 90`, `notes 150` (560 px of content in a 360 px
viewport). 122 checks; live twin `live-column-config` (27 checks).

| Fact | Measured |
| ---- | -------- |
| the panel | opens at the trigger's left edge and below it within 1 px; `autoFocus` puts native focus on it; `Group:Columns`; the trigger is `Button:Configure columns` |
| dismissal | a press outside closes it with `last=outside` and returns focus to nothing (the outside target is not focusable); Escape closes it with `last=escape` and returns focus to the trigger |
| hide | hiding `status` reads `hidden=status visible=3 content=440`; its header and every body cell unpaint; `size` moves to `name.x + name.width` within 1 px, header and body agree |
| show | showing restores the order slot, the 120 px width and every cell; content returns 560 |
| the pan range | the visible width drives the scroller. From `-200`, hiding the last column (`content 410`) clamps the runtime offset to `-50` **at once**, and pan end lands there |
| reorder | moving `notes` up yields `name,status,notes,size`; `notes` takes `status`'s old slot (320) and `size` moves to 470; every body cell follows within 1 px |
| clamps | up on the first column and down on the last are no-ops |
| widths | a widened `name` (240) survives hide/show: content `600 → 360 → 600`, and the restored header still paints 240 |
| the reader | after a jump to 45 and a selection, a hide, a reorder and a show keep `anchor=45`, `getListScrollTop[0] = 45`, the frozen row aligned and the accent paint |
| configuration a11y | the panel is a named `Group`, the trigger a `Button`, and the hidden column's control reports `value=hidden` through `aria-valuetext` |

The panel is probe chrome, not the data-grid package's menu: the probe isolates
the order/visibility mechanism, and plan `164` already measured the `<anchored>`
primitive it uses. Limits: every column still paints (windowing stays
`grid-wide-table`), there is no drag reordering, no persisted settings, and the
frozen ID column is not configurable by design.

**Live lesson:** the panel mounts on a later React commit, so a live step must
`waitFor("config-panel")` and `settle` after opening it before clicking a control.
The first live run failed with `Locator did not match any element` at
`config-show-size`; the headless host is synchronous and cannot show that race.

## Crop areas (plan `385`)

`crop-area` is the runtime half of a crop surface: a 320 × 200 stage whose
`<img>` box is the crop coordinate space, four plain `div` masks, four 12 px
handles and a focusable crop box. 74 checks; live twin `live-crop-area`
(10 checks).

| Fact | Measured |
| ---- | -------- |
| the coordinate space | `objectFit: "contain"` and `"cover"` both report the same `320 × 200` box and paint no fallback; the renderer exposes no fitted-bitmap rect, no load event and no natural size, so the app owns the aspect mapping |
| the mask | four `div`s are the exactly complement of the crop; a crop at `x = 0`/`y = 0` renders no left/top mask; the stage's 1 px border offsets every absolute child by 1 |
| pass-through | with `pointerEvents: "none"` the click reaches the plane — **and still runs the mask's own handler** (log `mask:top>plane`); with `"auto"` only the mask runs. A click-through overlay must guard its handler by mode |
| a handle drag | a 12 px handle keeps every held move and the release; `+40/+20` grows the crop `192 × 120 → 232 × 140`; the masks and handles follow within 1 px; the gesture ends in a click on the handle, not the image |
| clamping | the SE handle stops at `256 × 160`; a move stops at `(0, 0)`; a shrink stops at `16 × 16`; the NW corner cannot pass the SE minimum |
| the box | a click focuses it natively; `right` moves it 1 px; `shift-down` grows the height 1 px |
| a11y | `Image:Image to crop` contains a named `Group:Crop selection` and `Button:Resize crop bottom right` |

**Harness lesson:** the first run read a phantom `197` for the bottom mask
because the gesture log started empty and grew to one line, moving the stage
down by 16 px after the baseline was captured. Both readouts now sit **below**
the stage. The held gesture also lives in a `ref`, not React state, so a move
can trust the press that started it before the commit lands.

Limits: no pixel readback; a parent `overflow: hidden` does not clip an `<img>`
child, so a rounded crop mask is not measured; rectangular selection only (no
rotation or aspect lock); the accessibility model is a region plus a group and
buttons, not a multi-value slider.

## Multi-step forms (plan `386`)

`wizard-flow` is the runtime half of a wizard: three steps over one draft
(`Account`, `Workspace`, `Review`), per-step schema validation, a derived step
indicator, Back/Next/Submit and a `steps: unmount` / `steps: hide` toggle.
70 checks; live twin `live-wizard` (11 checks).

| Fact | Measured |
| ---- | -------- |
| step swap | in `unmount` mode the previous step's subtree is gone (`bounds === null`) and the indicator's `aria-selected` moves; the draft survives because it is app state |
| focus | the new step is **not** focused by the runtime: without the request a click leaves focus on `wizard-next`, and Enter inside the field leaves it on `wizard-team` (a positional fallback, not the first field). The probe requests focus in a `useLayoutEffect` keyed on a nonce |
| rejected step | stays on the step, paints each failing field's own schema message and focuses the first invalid field from the click handler; an edit clears only that field's error |
| Enter | reaches the raw input's `onSubmit`; it validates the step, focuses the next invalid field, and advances when the step passes |
| review | paints `ada <ada@x> my-w / core`; Submit reports `Created …` once; Back through both steps restores every a11y `value` |
| tab order | only the mounted step is reachable: `wizard-name → wizard-email → wizard-next → wizard-name` |
| hide mode | inactive inputs are **retained** as `input` hosts but have no bounds, paint no label and leave the tab walk; the step change still focuses the slug |
| a11y | each step chip is a `ListItem` with `selected` true only on the current step; the chips need an authored `aria-id` to be addressable |

**Load-bearing lesson:** a wizard cannot rely on the runtime to place focus after
a step swap, and it cannot rely on an unmount dropping focus — the fallback is
wherever the old node was. Every step entry and every rejection requests focus
explicitly.

**Limits:** the draft is app state, so unmounting a step loses native editor
state (caret, undo); hide mode keeps the subtree but native focus on a hidden
editor was not measured. No async validation, server submit or persisted
progress. The live twin cannot read the a11y dump or styles, so the chip and
hidden-subtree assertions are headless-only.

## Editable grid cells and row menus (plan `387`)

`grid-cell-editing` puts the two things a data grid needs beyond sorting and
panning inside one `<virtual-list>`: a native `<input>` in a row, and a row
action menu. 57 checks; live twin `live-grid-cell-editing` (36 checks).

| Fact | Measured |
| ---- | -------- |
| starting an edit | a first press selects the row (`last=select`); a **second** press mounts the editor and it takes native focus (`ge-editor-0`). 0.10.0 has no double click, so the second press is the probe's edit affordance |
| the draft | typing changes only the draft: `commits=0`, the committed value (a preview outside the list) stays `item-00`, and the editor paints its own text |
| committing | Enter arrives as the input's `onSubmit`: `editing=none commits=1 last=commit`, the row and the preview repaint `beta` |
| key routing | the editor's keystrokes **do** bubble to the grid container's `onKeyDown` (`keys` grows); without an `editing` guard a `down` moves the grid selection, with the guard the selection stays and the caret key keeps focus |
| grid navigation | with no editor open, a cell press selects and `down`/`up` move the selection in the rendered order |
| leaving the window | an editing row **stays painted** after the list scrolls past it (the plan-158 focused-row rule), so the runtime does not end the edit; the grid commits on leave: `editing=none commits=2 last=leave`, and the value survives the scroll back |
| the row menu | an `<anchored position>` child of the virtual row paints at the action's left edge and below it within 1 px — including the part below its 32 px row — takes native focus and is `Group:Row actions` |
| dismissing | Escape closes it (`panel=none last=escape`) and returns focus to the row action; an outside press closes it (`last=outside`) and does not return focus |
| menu actions | Rename closes the menu and opens that row's editor with focus (`last=rename`); Delete removes exactly that row (`rows=60 → 59`), unpaints it and leaves its neighbour; Escape in the editor cancels |
| scrolling | the captured point is a **window** point, so a scroll leaves an open menu pointing at the row's old place; the probe closes any menu on an anchor change (`last=scroll`) |
| a row-set change | a sort commits the open draft, ends the edit (`last=sort`), flips the order and keeps the committed text with its **row id** after the reorder |
| live | the same path holds in a real window; the app-owned jump (not the host's `scrollToItem`) is what applies the leave rule, because a programmatic scroll fires no range event live (plan `338`'s rule) |

**Load-bearing lessons.** A grid cannot let its navigation handler see the
editor's keys unguarded — the keys bubble, and the guard is a state check, not
an event stop. And an edit must end when its row leaves the viewport: the
row stays painted because it holds focus, so the runtime never decides that the
edit is over. The row menu's window point is the other trap: an
anchored child does not follow a scrolling virtual row.

**Limits:** no double click, no multi-cell range, no validation, no undo and no
persisted edit; a right-click context menu and column virtualization stay with
plans `164` and `185`. The menu opens from a row near the top, so paint beyond
the list's own viewport clip was not measured (the close-on-scroll rule makes
it moot for this contract).

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

## Data toolbars (plan `377`)

`data-toolbar` composes the two Tier 3 rows that had no runtime evidence: a
toolbar whose controls mutate the table under it, and the metric cards that
must follow. 61 checks; live twin `live-data-toolbar` (24 checks).

| Fact | Measured |
| ---- | -------- |
| cards | three 160 × 64 cards (`Total`, `Showing`, `Selected`) read `60/60/0` at rest; showing follows the filter (`20`) and search (`11`), selected follows the selection |
| search | `item 1` narrows 60 → 11 rows and paints the first match at the viewport top |
| filter | `paused` narrows to 20 and paints only paused rows; active and archived rows are absent |
| sort | `id` → `status` (paused first) puts row 1 at the top and unpaints row 0; a second click restores |
| columns | hiding `owner` unpaints its header and every owner cell while `name` stays |
| selection | rows 2 and 5 paint `colors.accent`, survive a scroll away and back, and the selected card reads 2; a filter clears the selection |
| archive | removes the selected rows (`total 60 → 58`, `archived=2`, `selected=0`) and the cards follow |
| anchor | a wheel to row 30, then a filter: the renderer resets to 0 but the `onVisibleRange` readout stays 30 — the component mirrors the reset |
| a11y | `Toolbar:Data toolbar`, `TextInput:Search` |

**Measured trap:** the virtual list resets its own anchor when a filtered
re-render shrinks the set, but it does **not** report that through
`onVisibleRange`; an app-owned anchor readout is stale until re-read (or
`scrollToItem(0)` plus a state mirror, as here). That qualifies plan `338`'s
"must reset" rule.

Limits: the toolbar fits its width (overflow is `app-chrome`'s scroller +
reveal); columns are fixed widths (`data-grid-columns` owns resize); the view
uses segmented controls, not menus; no view state is persisted.

## Query builders (plan `378`)

`query-builder` is the composition the Tier 5 row **Advanced filtering / query
builders** never had: a rule list over a virtualized table. 83 checks; live twin
`live-query-builder` (41 checks).

| Fact | Measured |
| ---- | -------- |
| geometry | a 780 px frame, a 40 px toolbar and a 132 px rule strip; the strip paints even while closed, so its height is assertable |
| rule row | 40 px: field `Select`, operator `Select`, value control and a remove button; `Group:Rule 1` to assistive technology |
| field kinds | `name` starts on `contains`, `status`/`owner` on `is`, `score` on `>`; the operator picker offers only that kind's subset |
| re-typing | a field change resets the operator **and** clears the value — a stale `contains` never reaches a number |
| completeness | an empty value is incomplete and is ignored by **both** `all` and `any` (an unfinished row never widens a query) |
| status | `status is paused` → 40 rows; the first paused row sits at the viewport top and row 0 is unpainted |
| text | `name contains item 1` is case-insensitive → 31; `is item 1` → 1; `is zzz` → 0 |
| number | `> 80` → 19, `>= 80` → 20, `< 10` → 20; a non-numeric value matches nothing and is still "complete" |
| enum | `owner is Ada` → 30; `is not Ada` → 90 |
| combinator | paused **and** `item 1` → 12; **any** → 59; the summary reads `status is paused and name contains item 1` and flips its joiner |
| append | `add` appends a rule, reveals it in the strip and **focuses its value control** (the effect runs after the commit; the node does not exist in the handler) |
| scrolled strip | four rules: the appended row's bottom edge equals the strip's, and the first rule keeps painted bounds above it (`y < strip.y`) |
| pickers in a scroller | a field `Select` opened from the scrolled strip paints its content and its items **past the clip** and commits; the content is not clipped by `overflowY: scroll` |
| dismissal | Escape from a rule input closes the strip and returns focus to the toggle; reopening keeps all four rules |
| empty state | zero matches paints `No matching rows` in place of the list |
| reset | a rule edit clears the selection and returns the anchor to 0; the first match paints at the top |
| a11y | `Toolbar:Query`, `Group:Filters` |

**Live lesson:** three `add` clicks sent back to back coalesce into one commit,
and the reveal then runs before the new rows are laid out — the appended row
stayed at the strip's bottom edge (`221` against `181` expected). The live step
settles between clicks, as a human would; `scrollIntoView` is the reveal, not a
`scrollTo` formula. The reveal assertion is **bounded** (`waitForBounds`, 3 s at
50 ms): `rules=4` can land before the effect paints, and a full-suite run once
read the pre-reveal box. With the reveal removed the wait times out and the same
assertion fails with `221`, so it cannot mask the defect (plan `382`).

Limits: the builder is inline (an overlay panel is `tier2-choice`'s `Popover`),
rules are AND/OR without nesting or groups, operators are the four numeric
comparisons plus text/enum equality, and no rule set is persisted. `Select`
content is anchored to its trigger's row, not portalled (0.10.0 has no
`createPortal`).

## Notification centres (plan `381`)

`notification-centre` is the composition the Tier 5 row **Notification centre**
never had: a bell → a non-modal panel → a newest-first virtual list → live
arrivals. 80 checks; live twin `live-notification-centre` (27 checks).

| Fact | Measured |
| ---- | -------- |
| bell | 36 × 36; the badge reads `3`; `Button:Notifications, 3 unread`; the panel does not paint while closed |
| panel | 320 × 360 anchored `bottom`/`end`/`gap 8` to the bell wrapper; right edge and top within 1 px; `autoFocus` gives it native focus in both hosts |
| rows | a 280 px viewport with 24 px `Today`/`Earlier` headers and 60 px notification rows in one `<virtual-list>`; `Region:Notifications`, each row a `Button` named `<title>, read or unread` |
| unread | derived from the read flags; a row click is idempotent; opening marks nothing read; close/reopen keeps every flag |
| badge | disappears at zero; the bell label follows (`Notifications, 0 unread`) |
| keyboard | Down/Up move the active row, Enter marks it read, Escape closes and returns focus to `nc-bell` |
| arrival (closed) | the badge increments and the row is first on reopen |
| arrival (open, top) | the new row paints under `Today`; the anchor stays 0 |
| arrival (open, scrolled) | **the list itself keeps the reader's row**: anchor `2 → 3`, the row stays at the viewport top |
| outside | a press on the body closes the panel, does not steal focus back, and keeps the state |
| empty | clear-all paints `You're all caught up`, removes the list and the badge; a later arrival restores it |

**The measured rule: do not compensate a prepend.** The plan carried an
identity re-anchor effect (`scrollToItem` to the row's new index). Removing it
did **not** fail the suite — the runtime had already moved the anchor from 2 to
3 and kept the paint. Forcing the pre-insert index reproduced the bug the effect
was meant to prevent: anchor `2` and the row moved from `96.5` to `156.5`,
exactly one notification height. The effect, `reanchorTarget` and `rowIndex`
were deleted. An app still re-reads the anchor (`getListScrollTop` inside
`onVisibleRange`) because the index is what it displays; the paint is the
runtime's.

Limits: state is app-owned (a remount resets it; restore is `167`/`339`), the
panel is non-modal (no focus trap), there is no toast bridge, and edge flipping
belongs to `floating-placement` (`156`/`323`).

## Multi-pane editor (plan `376`)

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

### The live terminal (plan `532`)

`live-terminal` reuses that exact view in a real `1100 × 720` window. It closes
the last Tier 4 capability whose evidence was headless only:

| Fact | Measured live |
| ---- | ------------- |
| focus | a real click focuses the `role="textbox"` surface; removing `tabIndex` did **not** change that, so the click's native focus is not a tab-order effect |
| typing | real `keystrokes("l")` / `("s")` reach the surface and paint `$ ls` — with the runtime's `keyChar` absent on a plain `div`, the probe's `keyChar ?? key` fallback is the path that runs |
| control keys | Enter commits (count `200 → 201`), Up recalls, Backspace deletes one and Escape reports `cancelled` |
| chords | a real `ctrl-c` arrives with `modifiers.ctrl` and aborts the line; status `interrupted` |
| scrollback | a real wheel moves the list anchor by more than a screen; `scrollToItem(list, 0)` paints `boot 000`, unpaints `boot 199` and reports anchor `0` |
| prompt and focus | the sibling prompt keeps `$ ` and the surface keeps native focus across the jump; the next key still edits it |
| grid | rows are `18 px`, equal character counts paint equal widths, the caret is `7 × 12`, and the prompt row sits below the scrollback |

Two composition facts a terminal consumer needs:

- **A `<virtual-list>` has no painted bounds in the automation tree.** The probe
  adds a `terminal-viewport` wrapper for the painted box and the live wheel
  target; `listScrollTop`/`scrollToItem` still address the list's own `testId`.
- **The declared surface height must include its borders.** A `266`-tall surface
  with a 1 px border reports `264` inside (plan `529`'s box) and its children
  lose 2 px — the scrollback measured `238` instead of `240` until the border
  was added to the declared height. Set the height from the content plus
  `borderWidth * 2`, or let the flex layout size it.

Colour stays headless: `GpuixRenderer` exposes no style report, so the
`destructive`/`success` runs remain `terminal-grid`'s evidence.

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

**`live-toast` (plan `623`, 38 checks) repeats the pointer chain and stacking
rows in a real 1100 × 720 window.** A real click on the page control under the
viewport's strip lands (`under=1`), a real click on a painted card never reaches
the surface below it (`behind=0`), the card's 33/41 px insets and 378 px content
width are identical to headless, a toast pushed from the focused field does not
steal focus, and `focusNext` lands on a dismiss control. Removing
`pointerEvents: "none"` fails the strip check; rendering the overlap surface
after the viewport fails the dismissal. The card's own `pointerEvents: "auto"`
is **not** load-bearing in either harness (measured null result).

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

The 104-scenario headless suite runs on the offscreen `TestRenderer`, and the
live registry lists 91 scenarios. `smoke:live` opens
a **real GPUix window**, mounts the shipped `App`, and drives it through
`@gpuix/native/automation` — `getByTestId`, `click`, keys, the wheel and
`screenshot`. It reports through the same `Smoke` model and exit codes, so a
live pass is citable evidence rather than a second log format.

A live run is **scoped**. `--only <id[,id]>` (repeatable) runs just those
scenarios; `--all` runs the full suite; a bare command is a usage error, never a
silent full run. Use `--only` while iterating and `--all` only at the final
gate: the full suite opens a real window and takes about nine minutes.

| Scenario | What it asserts in the window |
| -------- | ------------------------------ |
| `live-shell` | `app-shell` fills the 1100 × 720 window; clicking a sidebar entry mounts that view and paints its own text; `Enter` on a focused entry switches the stage |
| `live-input` | a click focuses the field, `h i` reaches `onChange` (`value=hi`), and `Enter` reaches `onSubmit` (`submits=1`) |
| `live-input-payload` | two real clicks 80 ms apart are **two** clicks, each `clickCount=1`; the live editor receives `é` and `日` (`keyChar` carries each), `cmd-a` is consumed before React and the next space replaces the value, and a live wheel is `40/true/moved` — 12 checks (plan `533`) |
| `live-pointer-entry` | where a live click puts the caret and what a real press-move-release selects: a click at `x + 25` lands inside `abcdef` (index 1–5), a right-edge click appends, a left-edge click prepends, a drag selects all six and typing replaces them, a plain click clears the selection, `shift`-click extends it, a `<textarea>` takes a newline and autosizes to 64 px, and Up returns to the previous line — 22 checks (plans `535`, `536`) |
| `live-drag-targets` | a real press keeps the held move and the `up` on the pressed box while the target under the pointer receives neither, the gesture ends in a click on the source, a hover settles during the gesture, and a click/hover work immediately afterwards — 20 checks (plan `580`). Live hover delivery is re-render dependent, so its order is printed, not asserted |
| `live-drag-autoscroll` | a held bottom-edge move scrolls the list one 24 px row (the painted row moves, not just the readout), three moves reach `-72`, a top-edge move returns to `-48`, the drop index follows the offset, the release keeps the `up` and the ending click, and the plain list does **not** auto-scroll — 29 checks (plan `580`) |
| `live-scroll` | `scroll-container` starts at offset `0`, a `-200` wheel scrolls it down, and `onScroll` reports `delta=-200` |
| `live-tab-overflow` | a horizontal tab strip in a window: a real `deltaX` wheel pans `-240`, a vertical wheel is inert, the clipped last tab keeps painted bounds, the component reveal lands it at the trailing edge (4 px past — the strip's padding), the revealed neighbour click/focus works, the exact `scrollTo` reaches `-400`, and Home/End move selection, native focus and the reveal together — 35 checks (plan `565`) |
| `live-panel` | a paced divider drag grows the split `320 → 400`, `onResize` reports it, and pane A's measured width agrees within 2 px |
| `live-panel-nested` | the nested workspace in a window: the vertical drag grows `outer 180 → 228` and the nested drag `inner 300 → 360` without touching the other split, the sidebar collapses to painted width `0` and restores to `160`, a clicked divider takes native focus and Right/Left step it `376/360`, and traversal leaves it — 30 checks (plan `594`). `role`/`aria-valuetext` stay headless (no live a11y report) |
| `live-motion` | the paused clock collapses a 240 px sidebar exactly: 96 px at 80 ms of a 200 ms linear tween, the inner pane stays 240 px, `onMotionComplete` fires once per tween, and a leaving toast stays painted until the exit settles — 25 checks. **`onExitComplete` fires twice live for one exit**; treat it as idempotent |
| `live-overlay` | the modal trigger opens a painted 280 × 236 surface centred in the window, and Escape closes it (`open=false last=escape`) |
| `live-floating` | the placement engine in a window: the probe frame is `1100 × 720`, the panel content sits at `(209, 175)` for bottom/start and `(335, 129)` for right/start, `align=center` still ends at the anchor's centre line (`147`) — the measured 0.10.0 defect — and the edge layer snaps to `641..719` inside the window instead of flipping — 17 checks (plan `594`) |
| `live-focus` | focus enters the modal (`modal-content`), Tab and Shift-Tab walk `a → b → open-popover → close` and wrap back to the content, Escape returns focus to the trigger, and a nested popover's Escape closes only the popover and returns focus to its opener — 18 checks |
| `live-roving-focus` | the roving-tabindex model in a window: a click + Down move native focus and the index, Enter activates, a component-owned `renderer.focusElement` reaches a never-clicked row and the next key lands there; a real `-1200` wheel moves the virtual anchor, unpaints a previously painted row and leaves native focus on `vrow-3`, which stays painted and still receives the next Down; scrolling back restores the path — 28 checks (plan `637`). **Measured:** focusing a virtual row already reveals it, so the pre-wheel anchor is `3`; the check uses the anchor, not row 0 |
| `live-tab-focus` | the tab strip's focus model in a window: a synthetic `tab` key reaches the focused tab but does not traverse (so the live tab-order proof uses the renderer's own `focusNext`), nine traversal steps reach the last clipped tab with the strip's offset unchanged (focus does not reveal), one more leaves the strip, the roving strip is one stop, and End/Home move selection, focus and the reveal — 18 checks (plan `565`) |
| `live-selection` | a real pointer drag selects three text nodes; a drag anchored in `userSelect: none` selects nothing; a crossing drag keeps both sides and skips the chrome; `clearSelection` and a click empty it — 9 checks |
| `live-context-menu` | a right click opens a pointer-placed menu (its painted box equals the click point within 1 px); a disabled row is inert, Copy runs and closes, outside/Escape dismiss, a child click bubbles, and a right click inside a **scrolled** container still places the menu at the pointer — 31 checks |
| `live-docking` | dragging the Notes tab onto the editor pane's right edge prunes it from the left group, creates `panel-1` and splits the target (`split-1=`) |
| `live-float` | a paced drag from the Alpha tab, released outside the dock, opens the floating panel at the release point within 1 px; its title bar drags it to exactly `(200, 60)`; its tab takes focus, Escape closes it and returns focus to `float-tab-beta`; the close button drops the reopened tab — 28 checks |
| `live-primitives` | the **shipped** `Button` activates, a disabled `Button` refuses, and the `Toggle` reports `pressed=true` |
| `live-table` | a painted `<virtual-list>` row is hit-testable (`r3`), the list scrolls to `[0,-300]`, the selection survives, and `getListScrollTop` reports the logical anchor exactly — `[0, 0, h]` at rest, `[120, 0, h]` after `scrollToItem(120)` |
| `live-variable-rows` | the variable-height list in a window: rows stack at 20/40/60 px, a real click expands row 2 to 120 px and moves the rows below by exactly `+60` with the anchor unmoved, a second click collapses, `scrollToItem(30)` sits row 30 at the viewport top, and a real wheel keeps its in-row offset — 49 checks (plan `534`) |
| `live-preview` | the **first live hover** scenario: a real mouse move over the trigger opens the card (`open=true`), the pointer reaches the card body and the fire-time presence check keeps it open past the 200 ms grace close (`closes=0`), a control inside the hover-opened card clicks, leaving closes through the last hovered child (`reason=action`), a re-enter inside the delay cancels, and a final leave closes from the trigger (`closes=2`). The card enter and trigger leave arrive in **one batch** live, so the `prev`/`last` readout collapses them — the append-only log keeps both |
| `live-highlights` | the mounted find probe paints its four document washes with window-space rects (each inside its line), clearing removes them and restoring repaints, `search-next` moves the active match to index 1, and a jump to row 90 shows exactly one active row wash — document-wide `matchIndexOffset` numbering in a real window |
| `live-search-replace` | the document half of find/replace in a window: real typing drives the query (`errorx` → `total=0`, Backspace → `total=5`), the cursor steps, one replace recounts and re-washes (`total=4`, `an fixed follows`), replace-all empties the document, reset restores (`fired=1`), a count-preserving `ERROR` replace moves the washes without a new count event, longer/shorter replacements shift survivors (start `7` / `4`), a length-changing replace-all rewrites once, and `<code>` re-highlights by prop — 48 checks (plan `587`) |
| `live-scroller` | the message scroller opens at the latest message, a pinned append follows to the new max scroll, a real `400` wheel unpins it and paints the affordance, an append while unpinned leaves the anchor and counts unread, jump-to-latest re-pins, two streamed rows keep the tail on the viewport bottom, and the 3-row history has nowhere to scroll — 45 checks. An element that is **retained but unpainted** has no bounds: the protocol answers `NotFound` and the host maps exactly that to `null` |
| `live-log` | the log viewer opens at the tail (`[30,0]`), a real click and append follow to `[50,0]`, a real wheel over the wrapper moves the reader to `[31,0]` and leaves the tail unpainted, an append while scrolled up keeps `[31,0]` and does not yank, the at-end sentinel returns to `[70,0]`, and the next append follows to `[90,0]` — 26 checks (plan `571`). Measured: a **bottom-aligned** list reports the anchor as `[count, 0]` at the tail, not the max-scroll row/offset a plain list reports |
| `live-restore` | the shipped `workspace-restore` probe in a window: a paced divider drag paints 320 → 400, a tab activation makes `active=two`, `scrollToItem(120, 16)` anchors the list, and save → reset → restore re-applies the split, the tab and the anchor exactly (`[120,16]`, row 120 painted, row 0 absent). Native focus is **not** restored, and a click on row 121 focuses the restored list |
| `live-workspace-panes` | the shared tabbed-panes view in a window: the hidden editor pane paints nothing but stays mounted, the tree keeps its pick, draft and anchor, a real wheel chains the inner scroller to its ancestor (`-240`) until `pointerEvents: "auto"` guards it (inner `-240 → -360`, outer stays `0`), the hidden pane leaves the native tab order, and a paced `+60` drag paints more virtual rows with the anchor still `30` — 39 checks (plan `575`) |
| `live-table-sort` | the shipped `table-select-sort` view: a real wheel moves the body (`y ≈ -200`), `table-sort` makes `table-first` read `Item 199` (the reordered row the automation tree points at), a click selects `r199`, and the selection survives a re-sort back to `Item 000` |
| `live-grid` | the pinned, windowed grid in a window: a real wheel moves the body ten rows with the frozen column aligned, a `deltaX` wheel over the body is swallowed, the component pan reaches `-360` and the last viewport at `-1700` with header/body alignment, an off-window column has no painted bounds, and six Rights plus three Downs pan and align the reveal — 53 checks (plan `556`). Every child of a live scroller reports a moved box whatever its `position`, so `sticky` stays a headless claim; a scroller's own box moves with its scroll and must be cached first |
| `live-data-grid` | the virtualized data grid in a window: a real wheel virtualizes the `<virtual-list>` body (header stays, pan stays `0`), a header `deltaX` wheel pans the header and body together (`-90`, then `-400` at the far edge) with the frozen column still, a panned body cell selects its row and takes native focus, the frozen row follows `getListScrollTop`, and a filter/sort from anchor `45` resets to `0` (`count=11`, first `1`; descending first `59`) — 83 checks (plan `606`). **Measured harness difference:** a `deltaX` wheel over a body **cell** pans the scroller live (`-400 → -310`), while the offscreen `TestRenderer` swallows the same verb (plan `338`), so the headless suite keeps using the affordance. A wheel needs the pointer over its target first (`hover` + settle), or the window can deliver it at the previous pointer position |
| `live-states` | the declared-style probe in a window: a real hover applies `100 → 140`, hover is per element (parent `420` / child `100`, then parent `400` / child `120`), leaving reverts both, a press applies `active` `180` without hover, a release returns `100`, and a held pointer outside keeps `180` until release — 32 checks (plan `557`) |
| `live-truncation` | the truncation probe in a window: ellipsis/nowrap are one line, the unclamped sample wraps past eight lines, `lineClamp` is exact (`52` = 2 × `26`, `78` = 3 × `26`) and inherited from the box, the repeated string still lays out unclamped, and painted text stays the source run with no `…` glyph — 23 checks (plan `557`) |
| `live-layers` | the nested-layer probe in a window: a click opens the parent, a row opens a focused submenu, an inside press activates once while the parent's outside handler sees it with coordinates, one key reaches two handlers as two payload **objects**, and one Escape or outside press closes exactly one layer — 41 checks (plan `558`). Measured: the field claim must be cleared on the next **task**, not a microtask; a window delivers the two handlers across a microtask, so the original microtask reset closed both |
| `live-content` | the host-element surfaces in a window: the sourced `<svg>` keeps its 48 × 48 box, a missing `src` paints `img: no src` and an undecodable one `img: load failed`, a valid PNG data URL and a ref-uploaded 2 × 2 bitmap lay out without adding a fallback, the 640 px `<diff>` paints its four patch lines, and `<canvas>` has no bounds and drops its child from the paint (the retained child still answers `text`) — 28 checks (plan `577`). An `<img>` keeps the tracker's 1 px-per-axis loss live too (`96 × 64` → `94 × 62`) |
| `live-markdown` | the markdown surface in a window: the GFM blocks paint as text, a real drag across the boundary selects the heading and the fenced code, a real coordinate click on the link fires `onLinkClick` while prose fires nothing, and React children stay out of the paint — 19 checks (plan `577`). The article role stays headless (no live a11y dump, plan `197`) |
| `live-tier2-foundation` | the catalogue's foundation view in a window: the Card stack and 32 px avatar paint, the alert dismiss and empty-state action run, a click selects a List row and `Down`/`Enter` move and select while skipping the disabled row — 18 checks. A live key must follow the click's React commit (`settle`), or it moves from the previous active row |
| `live-tier2-navigation` | the catalogue's navigation view: a click swaps the Tabs panel, a later click selects Settings, a vertical tab set stacks its rail with the panel beside it and a real click selects (the disabled row stays inert), Accordion single mode replaces/composes a section and Enter closes it, Collapsible opens and Enter closes, Breadcrumb clicks and Pagination page/Next/Prev run — 26 checks (the vertical half is plan `633`). Whether a click runs React's `onFocus` is window-state dependent (plan `390`), so the old click-then-arrow limit is no longer asserted; the Tabs fix remains a robustness task |
| `live-tier2-choice` | Popover opens below its trigger and Escape restores focus, a live editor types/submits/clears, a Combobox ranks and selects, the DatePicker month grid picks a day and clears, and both TimePicker segments compose one value — 13 checks |
| `live-tier2-forms` | the schema's message paints on an explicit validate, a disabled input refuses a live edit, an invalid submit reports nothing, a valid one paints the decoded value, and a pending form locks submit — 14 checks |
| `live-tier2-editing` | the InlineEdit swap focuses a real editor (the locator's click starts the edit; the component's layout effect moves native focus to the swapped input) and `cmd-a` types, Enter commits and Escape discards; a typed comma adds a tag; a chord records and clears; `@` + arrow + Enter inserts a mention; the Drawer opens flush right at 400 × window height, traps Tab, returns focus on Escape and closes on a **window-coordinate veil click** — 32 checks in the committed state. A click away moves native focus; whether React's `onBlur` follows is host-state dependent (plans `390`, `603`, `605`): focused runs commit, while the full-suite state leaves the editor open and the scenario then asserts that state and commits the retained draft with Enter. The headless probe asserts the other side |
| `live-tier2-flow` | the stepper's control moves the value, the timeline stacks, a tick and an expiry repaint the countdown, the shortcut glyphs are explicit, the carousel steps/clamps/home, a swatch and `abc` normalise the colour, and the nav opens one panel by pointer and keyboard with Escape, focus return and an outside press — 24 checks |
| `live-key-routing` | the three key paths in one tree: the focused element, **every** ancestor (focusable or not) and the app-level window handler all receive a key (`inner=1 middle=1 outer=1 window=1`); `autoFocus` focuses natively; delivery follows focus; and `cmd-k` reaches the window handler with `modifiers.cmd` — 20 checks. React's `onFocus` delivery — for a **click** and for `autoFocus` alike — is host-state dependent (measured `0` and `1` on the same host, plan `603`), so both counters are printed, not asserted |
| `live-command-palette` | the shipped command surface in a window: `cmd-k` opens it with **nothing focused**, the veil is the window (1100 × 720), typing filters while the window handler sees each letter, arrows move the row and keep focus in the input, Enter commits through `onSubmit`, Escape/veil/row clicks dismiss with their reason, and a click-opened palette returns focus to its trigger — 80 checks |
| `live-reorder` | the reorder probe in a window: a paced `drag` from row 0 by `+80` px lands the row at **index 2** (boundary 3), the moved row paints two rows below `bravo`, the drop is not an activation, a real click on a handle focuses it and activates without reordering, the keyboard lift/up/drop moves the row to index 1 and keeps native focus, and a keyboard cancel leaves the order and removes the indicator — 19 checks |
| `live-tree` | the virtualized tree in a window: a real click expands `dir-0` to 48 rows and keeps it selected, a child indents 16 px inside a virtual row, the painted window is smaller than the flattened tree, a second click collapses it, a real `-800` wheel moves the anchor and unpaints the rows above, `scrollToItem(25)` anchors `[25, 0, 260]` and paints `dir-3/file-24`, a click and `Down`/`Up` move native focus and the selection, and `Right` expands/walks while `Left` returns to the parent and collapses — 44 checks (plan `559`). The list anchor reports the **flex-resolved** 260 px viewport, not the declared 280 |
| `live-qr` | the QR matrix in a window: the 226-node absolute grid paints at the headless offsets (quiet zone `+24`, module `6`, finders `+60`/`(42, 42)`), a light module has no bounds, a real click reports `hit=r3c3`, the SVG mask and the SVG data-URL image each paint one `174 × 174` node, and the v4 scale is exact (`164`, `+16`, `4`) — 45 checks (plan `599`) |
| `live-scroll-into-view` | the element scroll route in a window: `End` focuses row 199 and the list paints it, `Home` returns to `y = 0`, `scrollToItem(120)` and `scrollIntoView(row 10)` both move the window and paint their target while leaving focus alone, three `Down`s paint and focus row 13, and a second `scrollIntoView` paints row 199 without moving focus — 39 checks (plan `601`). **Measured limit:** the element route only reveals a row the list has laid out; from the anchor at 120, row 20 moved the list while rows 50 and 100 did nothing — use `scrollToItem` for a far jump |

### Search and replace in a real window (plan `587`)

The **document** half of the find/replace contract (plan `334`) was measured only
offscreen, while the editor half already had `live-replace`. `live-search-replace`
(48 checks) reuses the `search-replace` view in the real window.

| Fact | Measured in the window |
| ---- | ---------------------- |
| typing | the query is the native editor: `error` + `x` makes `total=0`, Backspace restores `5` |
| one replace | from cursor 2 → `total=4`; `an fixed follows` paints no wash and the active wash is on `the last error` |
| replace-all | `total=0`, 0 document washes, no `error` left; stepping is inert |
| reset | `total=5` and `fired=1`; the surface is keyed, so the reset is a real remount |
| count-preserving replace | `ERROR error here` paints `ERROR,error` and `sr-events` does **not** change |
| length changes | a longer replacement (`errors`) leaves the next match at start `7`; a shorter one (`err`) leaves the survivor at `4` |
| fold order | a length-changing replace-all rewrites each match exactly once |
| `<code>` | two washes before the prop rewrite, none after |

**Harness lesson:** after a reset the count is already `5` before the remount
commits, so waiting on `total=5` alone returns immediately and the next click
lands on the old tree. The twin waits for `sr-doc-text` after every reset.
Six mutation proofs are recorded in plan `587` §8.

### The content surfaces in a real window (plan `577`)

`content` was the last core capability whose only evidence was the offscreen
`TestRenderer`. `live-content` and `live-markdown` reuse the plan-161/181 views
unchanged and close that gap (28 + 19 checks).

| Fact | Measured in the window |
| ---- | ---------------------- |
| `<svg>` | a sourced icon reports its declared `48 × 48` painted box |
| `<img>` fallbacks | `img: no src` and `img: load failed` each paint exactly once; a valid data URL and a ref-uploaded 2 × 2 bitmap add none |
| `<img>` box | the tracker's 1 px-per-axis loss applies live too: a declared `96 × 64` reports `94 × 62` |
| `<diff>` | painted at its declared 640 px with all four patch lines in the paint log |
| `<canvas>` | retained, `bounds` is `null`, its child is absent from the paint — and the automation `text` verb still returns the retained child's string |
| `<markdown>` | GFM blocks are live painted text; a real drag across the boundary selects the document; a real coordinate click fires `onLinkClick`; prose fires nothing; React children stay out of the paint |

The article role, the style report and colour remain headless for the measured
reason above (`197`). Five mutation proofs are recorded in plan `577` §8.

### The drag family in a real window (plan `580`)

`drag-targets` and `drag-autoscroll` were the last interaction family whose only
evidence was the offscreen `TestRenderer`. `live-drag-targets` (20 checks) and
`live-drag-autoscroll` (29) reuse the plan-162/172 views through the plan-536
press/move/release verbs.

| Fact | Measured in the window |
| ---- | ---------------------- |
| capture | every held move and the `up` stay on the pressed box; the box under the pointer gets neither |
| the end of a drag | the live gesture **does** end in a click on the source |
| hover | settles in the window, but its position relative to the `up` varies: with the source's move handler recording state it settled after the release, and with that handler removed the window delivered `B:enter>A:leave` during the held move. The live probe asserts membership, never order; the headless "frozen" claim stays headless |
| the edge loop | one held move inside the 24 px band scrolls exactly one row: the **painted row** moves 24 px (`-24 → -72`, then `-48` at the top edge), so the check cannot pass on component state alone |
| the drop index | follows the live offset and moves back with it |
| the plain list | still does **not** auto-scroll a held drag live — its row does not move after a 600 ms edge hold |
| `pressedButton` | a null result: dropping it from the live `movePointer` changed nothing, so pointer capture does not depend on the per-move field (unlike the native editor's selection, plan `536`) |

Mutation proofs M1, M3, M4, M5 and M6 are recorded in plan `580` §5/§8; M2 is the
null result above. Artifacts: `.artifacts/live-report.json` and one PNG per
scenario under `.artifacts/live/`.

Two rules the runner needs, both measured:

- the renderer must be built with `createRenderer()`, not `new GpuixRenderer()`
  — the bare constructor has no React event callback, so the window paints but
  receives no input;
- the automation protocol has **no frame boundary**, so every scenario settles
  (~120 ms) or `waitFor`s the element a click should have mounted before it
  reads. `simulateClick` returning is not the same as React having committed.
  The same rule paces a drag: six moves sent back to back left the split at
  `320`, and the same six one frame apart took it to `400`.

A third rule came out of the Tier 2 catalogue, and plan `390` corrected its
scope: `autoFocus` focuses an element natively **without running React's
`onFocus`**, which is stable. Whether a **real pointer click** runs `onFocus` is
**window/host-state dependent** — `live-key-routing` measured
`innerFocus=0 outerFocus=0` at 15:03/15:10 and `innerFocus=1 outerFocus=1` from
15:25 on the same clean code, and `live-tier2-navigation`'s click-then-arrow
result moved with it (`tab=overview` vs `tab=settings`). The live suite therefore
asserts focus **movement** and key delivery, not the counter. The consequence
still stands as a rule: a component that tracks "the item the user is on" only
in `onFocus` should also set it on click (`List` does; `Tabs` should; the Tabs
row is a re-verify task). Key delivery itself is fine: a
key reaches the focused element, bubbles through **every** ancestor (focusable
or not) and finally reaches the app-level window handler, so an ancestor handler
is a valid component path and `useWindowKey` is the global-shortcut path. The
live runner wires `useWindowKey` (plan `345`).

The `InlineEdit` blur half of that family was re-measured for plan `555`: in the
current window, clicking the focusable `ws-elsewhere` **does** deliver
`onBlur` and the shipped component commits the open draft (`name=livez
commits=2`), paints it, and leaves focus on the clicked element. `live-tier2-editing`
guards all three facts; the headless host delivers no `onBlur`, so
`tier2-editing` keeps asserting the editor stays open there. Delivery is still
window-state dependent, which is why the live check exists.

A fourth rule came from plan `391`: a close produced by a **real timer** is
awaited with a bounded `waitForText` (3 s), not a fixed sleep. `live-preview`'s
200 ms grace close had not run 300 ms after the leave under full-suite load
(measured `open=true closes=0` twice), while a genuinely absent close still
fails the assertion after the wait. The probe's own drag and keyboard checks
assert order and geometry after the same bounded wait, never a screenshot.

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
`value=ax` in plan `189`; nine tab presses stayed on the first tab in plan
`565`) — traversal is component code (`focusNextWithin`), and the live
tab-order proof drives the renderer's own `focusNext`/`focusPrevious` verbs
(plan `565`).
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

**The pointer half is live-proven (`live-pointer-entry`, plans `535` and `536`):**
in a real window a click at `x + 25` of a 300 px field puts the caret inside
`abcdef` (index 1–5), a right-edge click appends, a left-edge click prepends, a
`<textarea>` takes `x`, Enter, `y` as exactly `x\ny` and autosizes to 64 px, and
Up returns to the previous line (`xz\ny`). The selection half runs through the
new `pressWindow`/`movePointer`/`releasePointer` verbs: a real press-move-release
selects all six characters and typing replaces them, a plain click clears the
selection, and a modified (`shift`) click extends it. The native editor owns
pointer selection — a component must not reimplement it or swallow a modified
click.

**The editor half is live-proven too (`live-text-entry`, plan `624`):** the same
view in the 1100 × 720 window reproduces every number above — `axbc` after two
Lefts and an insert, `0axbc` after Home, `0axbc9` after End, Backspace back to
`0axbc`, `shift-left` twice then `q` → `0axq`, `cmd-a` then `w` → `w`, an empty
field after the last Backspace, `readOnly` keeping native focus and its painted
`locked` run while refusing the edit, the placeholder painting only while empty,
the secret painting in clear, a `158` px field still `158` px after 40
characters, and a textarea at `64 → 116 → 168`, clamped at `168`. One harness
fact: a single 40-key `keystrokes` call painted all 40 characters while the
controlled value stayed empty, so the twin types one key per call.

Two limits worth stating rather than hiding. **The accessibility `value` is the
authored prop, not the live editor**: an uncontrolled field reports no value
after typing, so a test observes `onChange` and `getPaintedText`. And there is
**no masked entry surface** — `InputProps` has no `type`, `secureTextEntry` or
mask, so a typed secret is held, announced and painted in clear. A password
field is an app-owned OS prompt, not a component; the shipped library must not
pretend otherwise.

## Input payloads (plan `533`)

`input-payload` (headless) and `live-input-payload` (a real window) read the
event fields behind every handler, rather than the field's value:

| Field | Measured |
| ----- | -------- |
| `clickCount` | **always `1`** — three clicks 100 ms apart, press/release pairs 80 ms apart, and two real `mouse.click`s in a window all report `1`; a double click cannot be observed, so a component owns a second-press rule and must not expose `onDoubleClick` |
| click `x`/`y` | exact window coordinates of the target's centre |
| `button` | `0` for a primary click (`2` for a right click, `context-menu-pointer`) |
| `keyChar` on a text field | the produced character: `é`, `日`, and a space for the `space` key (`key` stays `space`) |
| `keyChar` on a plain `div` | absent — a focusable `div` reads `event.key` only |
| `isHeld` | `false` for a first press, `true` for a repeat (the host's `keyDown` gained an optional third argument) |
| `cmd-a` in a field | **consumed by the native editor**: it never reaches React's `onKeyDown`, while the next character still replaces the whole value |
| wheel `precise` / `touchPhase` | `true` / `"moved"` for a simulated wheel, headless and live — it cannot stand in for a line wheel |

The negative is the important half: a grid, list or tree that wants
"double-click to rename" cannot verify it here, and `Grid`'s existing
second-press rule is the honest pattern.

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
| `tier2-navigation` | Tabs swap + arrows, Tabs' vertical axis and its roving keys, Accordion single mode, Collapsible, Breadcrumb landmarks, Pagination window | 78 |
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

## Reorder (plan `391`)

`list-reorder` closes the composition half of the Drag and drop row: plans `162`
and `172` measured the gesture, this applies the order change.

| Fact | Measured |
| ---- | -------- |
| the boundary rule | a pointer names an insertion boundary (`0…count`); removing the dragged item shifts every boundary after it. A drop at boundary 3 from index 0 lands at **index 2**, and the rows between move by exactly one |
| the geometry | after a 0 → 2 drop, `alpha` paints at `listTop + 2 * 32` and `delta` (index 3) stays at `listTop + 3 * 32`, within 1 px |
| a click is not a drag | a click on a handle focuses it and activates, and moves nothing; a press has to travel more than 2 px before the drop commits |
| the ending click | the source still receives a click after the drop; without a distance guard it also counts as an activation (`2` instead of `1`), so the component owns the suppression |
| cancel | Escape during a held drag clears the indicator and leaves the order; the window handler is the reliable route because a press does not have to focus the handle |
| keyboard | Enter/Space lifts, arrows move the boundary (clamped), Enter drops through the same rule, Escape cancels; native focus ends on the moved handle |
| virtualization | a `<virtual-list>` reorders its **keyed** children in place: 60 rows, `v-0` dropped at boundary 5 gives `v-1…v-4, v-0, v-5…`, the row paints at `index * 24`, and the anchor stays `[0, 0, 240]` — no generation-keyed remount was needed |

The pure rules (`insertionAt`, `dropIndex`, `moveItem`) live in
`src/scenarios/reorder-model.ts` with 16 unit tests; the scenario is 36 checks
and the live twin 19. Five mutation proofs: dropping the boundary adjustment,
removing the click guard, ignoring the pointer's y, removing Escape, and a no-op
arrow each fail the named check.

## Hierarchical reorder (plan `392`)

`tree-reorder` composes the flat reorder with the virtualized tree:
`virtualized-tree` flattens and indents, `list-reorder` applies an order
change, and this applies one **to a subtree inside a file tree**.

| Fact | Measured |
| ---- | -------- |
| the target | a drop names a row and `before` / `after` / `into`; `into` is the **middle 50 %** of a directory row and one indent step (16 px) past its label, so a file never accepts a child and a between-drop never guesses a depth from x |
| the slice | the source is the **whole subtree**: a directory moves with its children, and every moved node's depth shifts by the same delta — `dir-1/sub/a` lands at depth 3 with its root at depth 1 |
| the flattened index | `tree-last` reports `at`, `depth` and `parent` from the new visible list; the moved root's `at` is its index in the pre-order window, which is what the virtual list and the focus contract index into |
| cycles | a drop into the source's own descendant is refused (`refused=descendant`) and a drop on itself is `refused=self`; the order and the indicator are unchanged. The pre-order invariant is re-checked after every move, so a corrupt result is refused as `illegal-depth` rather than rendered |
| opening | a drop into a collapsed directory opens it in the same commit, so the moved node paints one row below its parent; a 500 ms **hover** opens it without dropping (and Escape cancels) |
| the anchor | a `<virtual-list>` keeps its anchor across a tree move: at anchor `[20,0,240]`, moving `dir-19` into `dir-17` gives `at=26 depth=1`, the row paints at `dir-17.y + 24`, and the anchor is still `[20,0,240]` |
| keyboard | Enter lifts, Up/Down choose the gap (skipping the source row), Right turns the gap into an `into` target, Left back to `after`, Enter drops, Escape cancels; native focus follows the keyed move |

The pure rules (`allRows`, `visibleRows`, `subtreeEnd`, `moveSubtree`,
`targetAt`, `indicatorAt`) live in `src/scenarios/tree-reorder-model.ts` with
21 unit tests; the scenario is 74 checks and the live twin 23. Seven mutation
proofs: a one-node slice, removing the cycle refusal, letting a file accept
`into`, ignoring the y zone, a 5 s hover delay, keeping the old depths, and
resetting the list to row 0 on a drop each fail the named check.

## QR codes (plan `518`)

`qr-code` renders one version-1 fixture (21 × 21, 226 dark modules, generated by
Python `qrcode` 7.4.2 at error correction M) through all three routes the
inventory left open, and measures what each costs. 53 checks. The pure geometry
(`darkModules`, `moduleOrigin`, `matrixSize`, `modulePath`, `svgSource`,
`dataUrl`) lives in `src/scenarios/qr-layout.ts` with its unit test.

| Fact | Measured |
| ---- | -------- |
| module grid | `div` per **dark** module; `6 × 6` at `(index + 4) × 6` from the matrix origin, so the 4-module quiet zone is geometry; a light module has no node |
| colours | a module paints `colors.foreground`, the matrix paints `colors.background`; the same tokens in both palettes |
| hit target | a module press writes `hit=r3c3` — a logo overlay or per-module hover is possible |
| the cost | **one retained host node per dark module**: `246` nodes in `div` mode versus `21` for a single-node route (`246 − 21 = 226 − 1`); at version 4, `611` versus `21` (`611 − 246 = 591 − 226`) |
| svg mask | one `<svg source>` node, `174 × 174`, `color = foreground`; the whole matrix is one path, and no module nodes exist |
| img data URL | one `<img>` node, `174 × 174`, no `img: load failed` / `img: no src`; the document bakes a white quiet zone, so it stays two-colour in the dark palette |
| remount | switching back to `div` restores the exact node count; the version toggle swaps to `591` dark modules in a `164 × 164` box with `4 × 4` modules 16 px in |
| a11y | `role="img"` + `aria-label` expose one `Image` node named `QR code for <payload>` |

Four mutation proofs: dropping the quiet zone fails at `expected 24 ± 0.5, got 0`;
rendering every module fails `a light module has no node`; a no-op module click
fails `expected "hit=r3c3", got "hit=none"`; removing `role` fails
`the QR is an accessibility node`.

Not proven: **scannability** (no decoder on this host, no pixel readback — the
screenshot is the visual evidence), the white quiet zone as a check (a transparent
one still paints), and any encoder. A module grid is the wrong default for a large
code: version 40 is 177 × 177, so tens of thousands of retained nodes.

## Application menu bar (plan `519`)

`menu-bar` measures the last Tier 4 row that had only a capability note:
`COMPONENTS.md` records Application menus as **unsupported as an OS menu** (0.10.0
has no menu/tray API), so an application menu is an in-window bar. The palette
(`command-palette`) and the dropdown/context surfaces were measured already; the
bar's own interaction model was not. 56 checks, 19 pure model tests, and
`live-menu-bar` (29 checks) repeats the path in a real window.

| Fact | Measured |
| ---- | -------- |
| the surface | `FloatingLayer side="bottom" align="start" sideOffset={2}` places the menu **2 px under its title** and aligned to the title's start (within 2 px), even though the bar is only 28 px tall |
| switching | hovering another title switches the open menu, and the switched menu's first enabled row takes native focus; hover is inert while the bar is closed and on a disabled title |
| the disabled menu | `View` is disabled: Right from Edit opens Help and skips View; Left from File wraps to Help. A disabled title never opens |
| roving rows | Down/Up wrap, and both skip the disabled `Save As…` row (`New → Open → Save → New`); `Save As…` paints but runs nothing |
| focus return | Escape and item activation return native focus to the **open title** (`menubar-help` after Escape from Help, not the first title) |
| activation | Enter **or a click** runs the focused row once, closes the menu and returns focus; a second press on a title toggles its menu shut |
| accelerators | `cmd-s` runs `save` exactly once with the menu closed, never opens one, and **closes a menu when one is open**; `cmd-shift-s` (a disabled row) is inert. The window handler is the only accelerator owner |
| outside press | an outside control closes the menu without running any row |
| accessibility | `role="menubar"` → AccessKit `MenuBar`, `role="menu"` → `Menu`, `role="menuitem"` → `MenuItem`; `aria-expanded` is true only on the open title |

Five mutation proofs: removing the hover handler fails `hover switches the open
menu` (`got "open=file …"`); letting `stepTitle` enter a disabled menu fails
`Right skips a disabled menu` (`got "open=view …"`); returning focus to title 0
fails `Escape returns focus to the open title` (`got "menubar-file"`); binding a
disabled row's chord fails `a disabled row's chord is inert` (`runs=3
last=accel:save-as`); handling the chord in the bar as well as the window fails
`a chord runs its command once` (`runs=3`).

Not available: a real macOS menu bar or tray — `NativeRenderer` exposes only
window controls and no menu API, so this is honestly an in-window bar.

## Media surfaces (plan `520`)

`media-surface` closes the last inventory row with no runtime evidence, and the
answer is deliberately split: **0.10.0 cannot play media**, so the player is an
app boundary, while the waveform and the seek are ordinary primitives that work.
62 checks plus 14 live and 15 pure model tests.

| Fact | Measured |
| ---- | -------- |
| no media element | the closed `ElementType` union and the JSX intrinsics map both have exactly twelve tags, none of them `video`/`audio`/`media`; `NativeRenderer` exposes no transport or audio-device call, and `<canvas>` renders `gpui::Empty` |
| the envelope | 64 bars, `left = i × 7.5`, `width 6`, heights `12…59`, every bottom edge on the stage's at `96` |
| the image route | one `<img>` of an SVG data URL, `480 × 96`, no fallback, no per-bar node |
| the cost | the bar route retains **63 more host nodes** than the image route (`64` bars vs `1` image); switching back restores the exact count |
| the seek | 4 px/s (`480 px ↔ 120 s`); a press 120 px in seeks to `30 s`, a held `+60 px` drag to `45 s`, and both ends clamp |
| the hit target | a press **on the envelope does not scrub** (`pos=0`, empty log) because moves go to the pressed element; a plane **over** the envelope and a plane **under** it with `pointerEvents: "none"` on the painted layer both scrub |
| keyboard | the plane takes native focus; Right `+1 s`, Shift+Right `+5 s`, Home/End the ends, all clamped |
| accessibility | one AccessKit `Slider` named `Playback position` with `value = "36s of 120s"` (`aria-valuetext`, not `aria-valuenow`) |

Five mutation proofs: dropping the seek clamp fails `expected "120", got "530"`;
forcing the envelope to always block fails `expected "45", got "0"`; adding one
route-specific host node fails the cost check at `expected 63, got 64`; dropping
`aria-valuetext` fails `expected "36s of 120s", got "none"`; and a no-op
`onMouseMove` fails the live drag at `pos=60` instead of `75`. `live-media`
confirms the click, the paced drag, focus and the image route in a real window.

Not available: decoding, audio output, a media clock, per-bar hit targets in the
image route, and colour/pixel readback (screenshot evidence only). A player must
own its decoder and clock in the app; the component renders the state it is
given.

## Evidence on this host

The suite is **104/104 green** here (`exit 0`, 3695 checks, 2026-10-19):

```
104/104 scenarios passed · capabilities: layout=verified root=verified text=verified
input=verified focus=verified overlay=verified modal=verified floating=verified
select=verified combobox=verified tooltip=verified a11y=verified scroll=verified
panel=verified motion=verified virtual-list=verified table=verified tree=verified
log=verified theme=verified workspace=verified docking=verified float=verified
preview=verified command=verified content=verified drag=verified reorder=verified
tree-reorder=verified selection=verified menu=verified menubar=verified
components=verified search=verified terminal=verified chart=verified toast=verified
grid=verified data-grid=verified columns=verified column-config=verified
chrome=verified layers=verified scroller=verified scale=verified tier2=verified
replace=verified states=verified truncation=verified grid-layout=verified
typography=verified inspector=verified editor=verified data-toolbar=verified
query=verified notification=verified crop=verified wizard=verified
cell-editing=verified upload=verified qr=verified media=verified window=verified
frames=verified
```

The last full merge/release gate ran **91/91** (`exit 0`, 2369 checks, 59
capabilities, 942.6 s, `.artifacts/live-report.json`, 2026-10-19), including
every scenario this branch added through `live-roving-focus` (plan `637`) and
the `live-toast` fixture fix (plan `623` §10). It is the gate for the
promotion merge; the owner/supervisor performs that merge. The full live suite
is a merge/release gate rather than a per-task check.

The measurements that shaped the scenarios (full list: plan `140` §4):

| Capability | Measured on 0.10.0 here |
| ---------- | ----------------------- |
| layout, text, input | exact bounds; `getAllText`/`getPaintedText`; `onChange`/`onSubmit` |
| pointer entry | a click places the native editor's caret at the nearest glyph (left edge prepends, middle lands inside, right edge appends); a press-move-release **selects** the run and typing replaces it; a plain click **clears** the selection; `shift`-click **extends** it; Enter inserts a newline in a textarea (32 → 64 autosize) and `Up` returns to the previous line |
| typography | an explicit `lineHeight` is exact (30 → 60 for two wrapped lines); the default line box is ~1.6× the font size (12 → 19.5, 16 → 26, 24 → 39); `fontWeight` widens the run; a `<text>` block fills its parent. **`textAlign` is a no-op** (`left`/`center`/`right` all leave the glyph run at the block edge) — `alignSelf` in a column flex or a narrower width in a `justifyContent` row is the working route |
| grid layout | equal tracks split a width to the half pixel (`93.5/93/93.5` in 300 with 10 px gaps); explicit rows split a fixed height and stretch an unsized child, but a declared height wins; auto rows follow the tallest child; **default and `zero` `gridColumnMin` are equal**, `min-content` fills with unequal tracks, `max-content` leaves the remainder unused; nested grids resolve against their cell; an oversized child **overflows** its track; `justifyContent` centres content-sized tracks; a fixed-height wrapping row **stretches its line boxes** unless it sets `alignContent: "flex-start"` (measured 104 → 38) |
| focus | **`onBlur` fires; `onFocus` does not** on the release-tag binding (plans `529`, `583`). `autoFocus`, a click and a traversal all move native focus, reported by `getFocusedElementId()`; a `"tab"` keystroke reaches `onKeyDown` but does not traverse in the `TestRenderer` — `focusNext`/`focusPrevious` do. **Overflow:** a clipped tab is still a tab stop and focus does not reveal it (`tab-strip-focus`) |
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
| notification centre | a 36 × 36 bell with a derived badge opens a 320 × 360 `align="end"` panel whose right edge and top are exact; mixed 24 px headers and 60 px rows in one virtual list; **a prepend is already stable — the list keeps the reader's row (anchor 2 → 3) and component code must not compensate** (forcing the old index moves the row by 60); Escape returns focus to the bell, an outside press does not; read flags survive close/reopen and the badge disappears at zero |
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
src/scenarios/log-viewer.tsx bottom-anchored virtual list (tail, appends, wheel, no snap-back)
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
src/scenarios/column-config-model.ts the pure order/visibility, offsets and visible width
src/scenarios/column-config-model.test.ts the pure configuration rules
src/scenarios/column-config.tsx hide/show/reorder over the virtual body, anchored settings
src/scenarios/app-chrome.tsx toolbar, pinned status bar and a breadcrumb trail
src/scenarios/multi-pane-editor.tsx two tabbed panes with scrolling code and a live split
src/scenarios/data-toolbar.tsx a data toolbar over a virtual table, with derived cards
src/scenarios/query-model.ts the pure filter rules: operators, completeness, predicate, summary
src/scenarios/query-model.test.ts the pure rule tests (counts, bounds, combinators)
src/scenarios/query-builder.tsx a rule strip of native Selects over a virtualized result
src/scenarios/notification-model.ts the pure grouping and unread rules
src/scenarios/notification-model.test.ts the pure notification rules
src/scenarios/notification-centre.tsx a bell, a non-modal panel and a newest-first virtual list
src/scenarios/crop-model.ts the pure crop geometry, the mask complement and the readout
src/scenarios/crop-model.test.ts the pure crop rules
src/scenarios/crop.tsx the image box, four masks, captured handles and a keyboard crop
src/scenarios/reorder-model.ts the pure boundary/index/move rules
src/scenarios/reorder-model.test.ts the pure reorder rules
src/scenarios/reorder.tsx a plain and a virtualized reorderable list, pointer and keyboard
src/scenarios/tree-reorder-model.ts the pure pre-order tree: targets, subtree moves, refusals
src/scenarios/tree-reorder-model.test.ts the pure tree reorder rules
src/scenarios/tree-reorder.tsx a plain and a virtualized file tree, pointer and keyboard
src/scenarios/menubar-model.ts the pure open menu, roving rows and accelerators
src/scenarios/menubar-model.test.ts the pure menu-bar rules
src/scenarios/menu-bar.tsx the in-window bar, switching, keyboard and chords
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

- The nineteen core capabilities (including the modal contract, floating
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
  `tier2-flow`; plans `330`, `344`, `346`, `347`) and the **query-builder
  probe** (`query-builder`, plan `378`), the **reorder probe**
  (`list-reorder`, plan `391`), the **hierarchical reorder probe**
  (`tree-reorder`, plan `392`), the **QR probe** (`qr-code`, plan `518`), the
  **application menu bar** (`menu-bar`, plan `519`) and the **media surface**
  (`media-surface`, plan `520`)
  pass in real GPUix 0.10.0 on this host (104/104, 3695 checks), with a written report and
  screenshots. The **message-scroller** probe
  (plan `300`) proves the chat/stream pin contract: the live anchor inside
  `onVisibleRange`, a follow on append and on a growing row, no yank while
  unpinned, jump-to-latest, the threshold and a short history. The
  **scale-cost** probe (plan `302`) reads the retained-node and syntax-cache
  counters: 3 host nodes per virtual row, no leak across jumps, a shared
  document for identical code, and no reparse on a theme switch.
  The **real-window** suite (`smoke:live`) ran in full at **91/91** on
  2026-10-19 (2369 checks, 59 capabilities, 942.6 s, exit `0`, the merge gate;
  plan `639`) — the plan `532` terminal
  twin, the plan `534` variable-row twin, the plan `535`/`536` pointer twins,
  plan `554`'s select/combobox/tooltip twins, plan `556`'s `live-grid`, plan
  `557`'s `live-states`/`live-truncation`, plan `558`'s `live-layers`, plan
  `559`'s `live-tree`, plan `565`'s two tab-strip twins, the plan `570`–`581`
  live twins (Tier 1 controls, `live-log`, workspace panes, content surfaces,
  drag, and the shipped Tier 2 scroller/command paths) and the twins through
  plans `591`–`637` are all included. The suite covers —
  layout, **root**, input, scroll,
  panel, **floating**, **motion**, overlay, **focus**, **selection**, **context menus**,
  docking, the detachable-tab float, the shipped primitives, a virtual table
  with its exact anchor, a painted **find** probe, a **live hover** card, the
  **message scroller**, the **Tier 2 choice and form families**, the
  **multi-pane editor**, the **data toolbar**, the **query builder**, the
  **notification centre**, the **crop area**, the **multi-step form**, the
  **reorder** (a paced drop at boundary 3 lands at index 2, keyboard
  lift/arrow/drop and cancel), the **hierarchical reorder** (a paced drag into
  a collapsed folder, a refused cycle and keyboard nesting), the
  **application menu bar** (hover/arrow switching, roving rows, focus return and
  a live accelerator), the **waveform seek** (a click at a stage coordinate, a
  paced drag and the keys — plan `520`) and the **command palette** (plan `389`: `cmd-k` with nothing focused, a window-sized
  veil, filter + window keys, arrows that keep focus, `onSubmit` commit and
  three dismissals) —
  including the modal's
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
  while two panes scroll (plan `350`), plus the terminal text grid whose click
  focus, real keystrokes, chords and scrollback survive a window (plan `532`).
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

## Window layout (plan `526`)

Every desktop shell sits on the window, and until plan `526` no probe had
measured that boundary. Two scenarios now do:

| Scenario | What it asserts |
| -------- | --------------- |
| `window-layout` | the hook reports the runner's `1280x800`, the breakpoint is derived from it, the wide sidebar is `240` wide and ends at the window's bottom below the `36` px toolbar, the window-sized veil is `(0,0,1280,800)`, and the desktop insets are zero |
| `live-window` | the same view in the real `1100x720` window: compact → no sidebar; `zoomWindow()` reaches React (`→ 1680x923`), the layout goes wide and the veil tracks the new size; a second call restores `1100x720` exactly |

Four facts a consumer has to know:

- **The hook is the window, not a container.** `useWindowSize()` reports the
  paintable size; 0.10.0 has no container query and no `onLayout`, so a pane's
  own width is a `ref` + `renderer.getElementBounds` read (the docking probe).
- **A resize is a 100 ms poll**, not a native event (`intervalMs` is
  configurable). A layout may lag a resize by a poll; it does not get a frame
  callback.
- **Desktop insets are zero** (`safeArea`/`ime`/`effective`), so a custom title
  bar must reserve its own height rather than reading a safe area.
- **Nothing drags the window.** The renderer exposes `zoomWindow`,
  `toggleFullscreen`, `minimizeWindow`, `activateWindow` and `setWindowTitle`,
  but no window-move API — a custom title bar can paint under the traffic
  lights (`titlebarTransparent`, `trafficLightX/Y`) and cannot move the window.

The live scenario restores the window in an `Effect.ensuring`, so a failed check
never leaves the next scenario maximised. The full live suite is a merge gate;
this task ran `--only live-window`.

## Paint and frame diagnostics (plan `527`)

`getDebugFrameOverlayStats()` is the runtime's own paint counter. Until plan
`527` no probe had measured it, so the only way to claim a component repainted
was to inspect its readout — not to prove a frame happened. Two scenarios pin
the contract:

| Scenario | What it asserts |
| -------- | --------------- |
| `frame-stats` | two reads are equal (a read is free); `flush()` is exactly `+1` frame and `+1` sample; a click and a wheel repaint; `reset` keeps the lifetime count and leaves one sample whose timings are all equal; the ring stops at `1000`; the overlay adds no host nodes, changes no painted text and never intercepts a click; the cycle order is hidden → minimal → full |
| `live-frames` | an idle window does not repaint across 300 ms; a click grows the count; a live reset clears the ring to its own sample; the live overlay changes no painted text and a click still activates underneath it |

Host verbs: `paint` (offscreen only), `frameStats`, `resetFrameStats`,
`overlayMode`, `setOverlayMode`, `cycleOverlayMode`; the live host has the same
five minus `paint`, read from the renderer the runner owns.

Three rules for a consumer or a future probe:

- **A read is free; `flush` is one paint.** Reading the stats never paints, so
  a delta around an action measures the action. `advance(0)` is *not* a paint —
  it adds no frame in a settled tree.
- **`frames` counts paints, not gestures.** A headless click cost 4 frames and a
  native scroll wheel 2. Use it to answer "did anything repaint?", never "how
  many gestures happened?".
- **The overlay is paint-only.** It is drawn after layout: no host node, no
  painted text, no input capture. A screenshot with `full` on still shows the
  interaction underneath, which is why the live artifact is taken with it on.

The 1005-paint loop in `frame-stats` fills the sample ring on purpose; it is the
only way to prove the documented 1000-sample bound. The full live suite is a
merge gate; this task ran `--only live-frames`.

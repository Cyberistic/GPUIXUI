# apps/playground — the native GPUix playground

**Status: Phase B, implemented and verified** (plans `120`, `140`, `150`). One
app, four jobs:

1. **The playground** — a real GPUix window showing every scenario, so a human
   can drive each primitive by hand. The shell's palette switch paints the same
   `@gpuixui/tokens` themes the library ships.
2. **The native smoke runner** — the same scenarios exercised by synthetic GPUI
   input in a `TestRenderer`, producing `smoke-report.json`.
3. **The live window runner** — the probes a window can prove (focus routing,
   keyboard input, paint) driven through `@gpuix/native/automation`, producing
   `live-report.json` plus one PNG per paint state.
4. **The evidence source for the docs** — scenario ids, readouts and screenshots
   are what `apps/docs` links to instead of faking a native preview.

The **registry is the single source of truth**: `src/scenarios/registry.ts`
owns each id, title and capability and imports nothing native, so `--list` and
the argument guard run on a host with no binding; `src/scenarios/index.ts` owns
the one `view`/`steps` implementation per id and is imported only after the
preflight. `Record<ScenarioId, ScenarioBody>` makes a missing implementation a
compile error. Each scenario is one capability, one view, one `steps` effect: the thirteen
core capabilities (including the three theme-gallery scenarios, the modal
contract, floating placement and text selection), the Tier 3/4 probes
(`table-select-sort`, `table-column-resize`, `virtualized-table`,
`tree-view`, `log-viewer`, `workspace-tab-drag`), the app-level shortcut probe
(`window-key-shortcut`) and
the shell-navigation guard (`shell-navigation`), which mounts the real `App` and
proves its sidebar scrolls — the registry is longer than the window, so an
unreachable entry would be a scenario the app cannot open.

The **live** registry (`src/live/registry.ts`) is separate and shorter: the
twelve probes a real window can prove, of which five mount shipped
`@gpuixui/components` (the dialog, the menu, the toast system, the command
palette and the modal focus rule) and the rest prove the runtime itself (focus,
paint, fonts, placement). `apps/playground` depends on `@gpuixui/components` for
exactly that.

## Run it

```sh
nub run dev:playground              # from the repo root: opens the playground window
nub run --filter playground smoke   # the native smoke suite, headless
nub run --filter playground build && nub apps/playground/dist/live/run.js --list
nub run --filter playground build && nub apps/playground/dist/live/run.js --only focus-visible
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
# -> 0 here (23/23 green); -> 2 on a host with no binding
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
the runtime**. Three scenarios:

| Scenario | What it asserts |
| -------- | --------------- |
| `theme-color-roles` | every one of the 47 roles in `colorRoles` paints its exact value; the palette switch (dark → light → high contrast) re-paints every swatch and the three colour sets differ |
| `theme-type-and-shadow` | every type role in `typography` reaches the runtime through `textStyle` (size and family, with `code` on the mono family); `focusRing` paints the zero-blur spread ring; `elevationShadow(theme, "md")` paints its blur, offset and colour |
| `theme-platform` | one row per platform through `platformTheme`: the runtime reports each platform's mono family (`Menlo`, `DejaVu Sans Mono`, `Consolas` — three distinct families) while every platform keeps `.SystemUIFont` for UI text, plus that platform's `primary` fill, its own `lg` radius and an `md` control at its density (28 / 36 / 32px) |

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

## Evidence on this host

The suite is **23/23 green** here on GPUix 0.11.0 (`exit 0`):

```
23/23 scenarios passed · capabilities: layout=verified text=verified
input=verified focus=verified overlay=verified modal=verified
floating=verified scroll=verified panel=verified virtual-list=verified
table=verified tree=verified log=verified theme=verified workspace=verified
```

The measurements that shaped the scenarios (full list: plan `140` §4):

| Capability | Measured on this host (0.11.0 unless noted) |
| ---------- | ----------------------- |
| layout, text, input | exact bounds; `getAllText`/`getPaintedText`; `onChange`/`onSubmit` |
| text selection | `dragSelect` fills `getSelectedText()` for `selectable` text and nothing for chrome; `clearSelection` empties it |
| focus | **`onFocus`/`onBlur` fire** (0.5.1 never delivered them). `autoFocus` takes native focus without dispatching `onFocus`; a synthetic `"tab"` reaches `onKeyDown` but does not traverse in the `TestRenderer` — `focusNext`/`focusPrevious` do |
| overlay | the `<anchored>` paints no surface of its own, so `onMouseDownOutside`/`onKeyDown` go on the **content div**; the popup takes focus on open and Escape reaches it |
| modal | `useGpuix().renderer` is the programmatic-focus path: `focusElement` moves native focus from component code, `getElementBounds` is the existence check before returning focus, and `focusNextWithin`/`focusPreviousWithin` cycle `content → a → b → open-popover → close → content` without leaking. A nested popover's Escape closes only the popover; a second Escape closes the modal |
| floating | `<anchored side align gap>` is exact for `side`, `gap` and `align="start"`/`"end"` (`bottom` = `anchor.bottom + gap`, `right` = `anchor.right + gap`). **`align="center"` is off by half the panel on both axes** (it ends the panel at the anchor's centre line), and **`fit="snap"` clamps to `window − snapMargin` without flipping**, so a bottom-side menu can end up over its trigger |
| scroll | the wheel **works**; `deltaY` is negative to scroll down and `deltaX` negative to scroll right (the opposite of the DOM); an `overflowX` strip clamps exactly at `contentWidth − viewportWidth` |
| panel | pointer capture + inclusive clamp |
| virtual-list | retains 5 000 rows but **paints ~9**; `getPaintedText` is the window |
| table, workspace | row click/sort/keyboard, column drag; a virtualized table of 500 rows paints ~9, a painted row is hittable and its selection survives scrolling out and back; tab drag between panes, split resize |
| virtual table | `onVisibleRange` **lags the painted window by one gesture** — after two wheel gestures the painted rows were `32–40` while the range read `16`; an index-driven feature must use the painted rows as the current window |
| tree | `paddingLeft` indents exactly (16px per depth); expand/collapse repaints the subtree; a clicked row takes native focus and receives arrow keys. Focus movement from component code is measured separately (`modal`), so a roving-tabindex tree can use `renderer.focusElement` |
| log | bottom-anchored `<virtual-list>` starts at the tail and re-anchors on appends; `bottom` alone and `top` + `followTail` alone both anchor at the bottom. Scrolling up and appending does **not** snap back — a follow toggle is app state plus a scroll |
| theme | `TestElement.style` reports `backgroundColor`, `fontSize`, `fontFamily` and `boxShadow` verbatim, including 8-digit `#RRGGBBAA`; a provider re-render repaints every swatch |
| window key | the app-level `render({ onKeyDown })` handler runs after the focused element's `onKeyDown`, with `event.modifiers` set — the command-palette path |
| shell | a flex child needs `minHeight: 0` to scroll; without `overflowY` the list is not a scroll container and its last row is unreachable |

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

### `dialog-lifecycle` — measured on 0.11.0 here

The first live probe of the **Tier 2 components** rather than a primitive: the
shipped `Dialog` (`@gpuixui/components`), uncontrolled, with a readout of what its
`onOpenChange` reported. A unit suite can press a synthetic key into the
`TestRenderer`; this probe asks whether the same contract holds in a window where
the automation protocol, not the test harness, delivers the press and the key.

| Step | Check |
| ---- | ----- |
| mount | `opens=0 closes=0`, and `dialog-content` has no bounds — a closed dialog paints nothing |
| press the trigger | the surface paints with a non-zero box, focus is `dialog-content`, the readout reads `opens=1` |
| `Escape` | the surface has no bounds again, focus returns to `dialog-trigger`, the readout reads `closes=1` |
| press the trigger, then the dialog's own `DialogClose` | the surface paints again and closes, `opens=2 closes=2`, focus is back on the trigger |

13 checks. Negative control, measured: `dismissible={false}` (an
uninterruptible dialog) fails `Escape unpaints the dialog surface`
(`expected true, got false`, exit `1`), which is the check's real subject — the
dismiss stack, not the paint. Captures: `.artifacts/live/dialog-open.png` (the
veil over the whole window, the surface centred) and `dialog-closed.png`.

The veil is an `anchored` element sized from the window, so the probe's root has
to **fill** the window: mounted inside a 720px column the veil covered only that
column, which is the documented "dim only its parent's box" behaviour rather than
a defect.

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
| the palette | closes itself when an action runs |
| press, type `theme` | only `Toggle Theme` paints; `New File` is filtered out; no empty state |
| `Enter` | `ran=theme runs=2` — the filtered row ran |
| press, type `zoom` | the **disabled** row still paints |
| `Enter` | nothing runs and the palette stays open |
| `Escape` | the palette dismisses |

14 checks. Captures: `.artifacts/live/palette-open.png` (the field, the two
groups, the disabled row muted), `palette-filtered.png` (the field holding
`theme`, one row left) and `palette-closed.png`.

The design claim is the one a browser-shaped test cannot make: the highlight is
**not** focus. If the arrow key moved the focus instead, the typing would stop
after the first keystroke, so the filter check would fail by name — the two
checks together are the contract.

**The measured gap: the palette does not give the focus back.** After the
palette closes, nothing holds the focus (`none`), so the opener never gets it
back. `modal-focus-restore` below isolates the cause; the components workstream
owns the fix (`TODO.md`).

### `popover-lifecycle` — measured on 0.11.0 here

The shipped `Popover` in a window: where it opens, and the three ways it leaves.
The placement claims are the runtime quirks the component compensates for, so the
checks are about the compensation rather than about the runtime's raw behaviour.

| Step | Check |
| ---- | ----- |
| press the trigger | the panel paints below the trigger, on its start edge, one measured gap down |
| press the `align="center"` trigger | the panel's centre is the trigger's centre line (the runtime would centre on the containing block) |
| press a trigger 40px from the window's bottom | the panel opens **above** it, and `Escape` returns the focus to that trigger |
| `Escape` on the default panel | the panel unpaints and the focus is back on its trigger |
| press outside | the press reaches the control it landed on (`presses=1`) and the panel unpaints |
| press inside the panel | the panel stays open |

18 checks. Two negative controls, measured: dropping `align="center"` fails
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
| a field took the focus at mount (`autoFocus`) | the modal's own surface | **nothing** |

8 checks. The control comes first, so the third row is about the field and not
about modals in general.

The mechanism, measured rather than inferred: `autoFocus` takes the focus during
the commit that mounts the field, **before** the modal's focus effect records
who held it. The modal therefore saves the *field* as its restore target, and
`getElementBounds` reports that field as gone by the time the surface unmounts —
so the restore is skipped and the focus ends up nowhere. A field the modal
focuses itself (`initialFocus`) is focused *after* the modal has recorded the
opener, so the restore works.

That is why the shipped `CommandMenu` loses the focus: its search field carries
`autoFocus` **and** the modal's `initialFocus`. The fix is the components
workstream's (`TODO.md`); these two checks pin the measurement and flip to
`restore-auto-trigger` with it.

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
  (`gpuix live window darwin-x64 @gpuix/native 0.11.0`) and the duration;
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
src/scenarios/virtual-table.tsx a 500-row table inside <virtual-list>
src/scenarios/tree.tsx      indentation, expand/collapse, arrow keys
src/scenarios/log-viewer.tsx bottom-anchored virtual list (tail, appends)
src/scenarios/modal.tsx     focus entry, Tab trap, focus return, nested Escape
src/scenarios/floating.tsx  side/align/offset placement and the window snap
src/scenarios/index.ts   the registry + scenarioProblems (pure integrity check)
src/window-key.tsx       the app-level window key bridge (useWindowKey)
src/smoke/host.ts        createNativeHost(renderer): the SmokeHost adapter
src/smoke/run.ts         the CLI (preflight → mount each scenario → report)
src/live/registry.ts     live probe ids + capabilities (imports nothing native)
src/live/scenarios.tsx   one window view + async steps per live probe
src/live/fonts.ts        the probe typeface's bytes and its declared advances
src/live/host.ts         the window → AsyncSmokeHost adapter
src/live/run.ts          the live CLI (preflight → mount each probe → report)
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

- The thirteen core capabilities (including the token gallery, the modal contract,
  floating placement and text selection), the Tier 3/4 probes
  and the app-level shortcut probe pass in real GPUix 0.11.0 on this host
  (23/23), with a written report and screenshots.
- The suite can fail: changing `panel-resize`'s expected delta `+80 → +81` makes
  it exit `1`, name the check, and report `panel=failed` (plan `140` §4).
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
  runs=1", got "ran=open-settings runs=1"` (exit `1`).
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

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
other. Each scenario is one capability, one view, one `steps` effect: the nine
core capabilities (including the theme gallery), the Tier 3/4 probes
(`table-select-sort`, `table-column-resize`, `virtualized-table`,
`tree-view`, `workspace-tab-drag`), the app-level shortcut probe
(`window-key-shortcut`) and
the shell-navigation guard (`shell-navigation`), which mounts the real `App` and
proves its sidebar scrolls — the registry is longer than the window, so an
unreachable entry would be a scenario the app cannot open.

## Run it

```sh
nub run dev:playground              # from the repo root: opens the playground window
nub run --filter playground smoke   # the native smoke suite, headless
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

**Observe the code from the built CLI, not through `nub run`.** nub 0.9.6
collapses any non-zero child exit to `1`, so `nub run --filter playground smoke`
reports `1` even when the suite said `2`:

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js; echo $?
# -> 0 here (17/17 green); -> 2 on a host with no binding
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

## Evidence on this host

The suite is **17/17 green** here (`exit 0`):

```
17/17 scenarios passed · capabilities: layout=verified text=verified
input=verified focus=verified overlay=verified scroll=verified panel=verified
virtual-list=verified table=verified theme=verified workspace=verified
```

The measurements that shaped the scenarios (full list: plan `140` §4):

| Capability | Measured on 0.10.0 here |
| ---------- | ----------------------- |
| layout, text, input | exact bounds; `getAllText`/`getPaintedText`; `onChange`/`onSubmit` |
| focus | **`onFocus`/`onBlur` fire** (0.5.1 never delivered them). `autoFocus` takes native focus without dispatching `onFocus`; a synthetic `"tab"` reaches `onKeyDown` but does not traverse in the `TestRenderer` — `focusNext`/`focusPrevious` do |
| overlay | the `<anchored>` paints no surface of its own, so `onMouseDownOutside`/`onKeyDown` go on the **content div**; the popup takes focus on open and Escape reaches it |
| scroll | the wheel **works**; `deltaY` is negative to scroll down (the opposite of the DOM) |
| panel | pointer capture + inclusive clamp |
| virtual-list | retains 5 000 rows but **paints ~9**; `getPaintedText` is the window |
| table, workspace | row click/sort/keyboard, column drag; a virtualized table of 500 rows paints ~9, a painted row is hittable and its selection survives scrolling out and back; tab drag between panes, split resize |
| virtual table | `onVisibleRange` **lags the painted window by one gesture** — after two wheel gestures the painted rows were `32–40` while the range read `16`; an index-driven feature must use the painted rows as the current window |
| tree | `paddingLeft` indents exactly (16px per depth); expand/collapse repaints the subtree; a clicked row takes native focus and receives arrow keys. GPUix cannot move native focus from component code, so roving-tabindex focus movement is a runtime gap |
| theme | `TestElement.style` reports `backgroundColor`, `fontSize`, `fontFamily` and `boxShadow` verbatim, including 8-digit `#RRGGBBAA`; a provider re-render repaints every swatch |
| window key | the app-level `render({ onKeyDown })` handler runs after the focused element's `onKeyDown`, with `event.modifiers` set — the command-palette path |
| shell | a flex child needs `minHeight: 0` to scroll; without `overflowY` the list is not a scroll container and its last row is unreachable |

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
src/scenarios/*.tsx      one view + one steps effect per capability
src/scenarios/theme.tsx  the token gallery (colour roles, type, ring, shadow)
src/scenarios/shell.tsx  mounts the real App; guards the sidebar's scrolling
src/scenarios/virtual-table.tsx a 500-row table inside <virtual-list>
src/scenarios/tree.tsx      indentation, expand/collapse, arrow keys
src/scenarios/index.ts   the registry + scenarioProblems (pure integrity check)
src/window-key.tsx       the app-level window key bridge (useWindowKey)
src/smoke/host.ts        createNativeHost(renderer): the SmokeHost adapter
src/smoke/run.ts         the CLI (preflight → mount each scenario → report)
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
- **No programmatic focus from component code.** `PublicInstance` has no
  `focus()`, so "focus returns to the trigger" cannot be implemented or checked
  from a component; the overlay scenario does not claim it.
- **`style.gridTemplateColumns` is a column count**, not a CSS track list, so
  the (plan `130`) table probe uses flex rows with fixed widths instead.
- **`panels/resize.ts` + `panels/split-pane.tsx`**, not `split.ts` +
  `split.tsx`: two files with the same basename collide on emit (`split.js`).
- **`@effect/platform-node`'s `NodeFileSystem`/`NodePath`** write the artifacts
  (EF-21), not `node:fs`.

## What is proven here, honestly

- The nine core capabilities (including the token gallery), three Tier 3/4
  probes and the app-level shortcut probe pass in real GPUix 0.10.0 on this host
  (17/17), with a written report and screenshots.
- The suite can fail: changing `panel-resize`'s expected delta `+80 → +81` makes
  it exit `1`, name the check, and report `panel=failed` (plan `140` §4).
  Pointing `swatch-background` at `card` does the same for the gallery
  (`swatch background: expected "#11141A", got "#191D25"`, exit `1`).
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

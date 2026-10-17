# 110 — Plan: the native smoke test (cross-cutting)

| Field | Value |
| ----- | ----- |
| Status | ready to execute; **runtime run is blocked on this host** (§2) |
| Phase | B (MISSION's "real native smoke test early") |
| Owner | playground workstream |
| Depends on | `100-package-testing.md`, `120-app-playground.md` |
| Feeds | `COMPONENTS.md` GPUix-support column, `docs/preview-strategy.md` (docs-site workstream), every component plan's "verify in the runtime" step |

## 1. Goal

Prove, in the **real GPUix runtime**, the primitives every component plan
assumes: layout, text, input, focus, overlay, scroll and panel resizing — and
record one machine-readable verdict per capability. This is the mission's
biggest risk, resolved before component APIs are invested in.

Deliverables:

1. An executable suite in `apps/playground` (plan `120`), one scenario per
   capability, each with checks that can fail.
2. A **capability report** (`smoke-report.json`) plus screenshots, so
   `COMPONENTS.md` and the docs cite measured facts rather than prose.
3. An honest verdict for this host: *which* capabilities are unverified and
   *why*, with the reproduction.

## 2. Verified facts — the host, and the two versions

### 2.1 The 0.10.0 runtime cannot execute on this machine

Commands run in this worktree; results verbatim.

```
$ node -p "process.arch + ' ' + process.platform"
x64 darwin

$ sysctl -n machdep.cpu.brand_string
Intel(R) Core(TM) i7-8750H CPU @ 2.20GHz

$ nub view @gpuix/native optionalDependencies
{ "@gpuix/native-darwin-arm64": "0.10.0",
  "@gpuix/native-linux-x64-gnu": "0.10.0",
  "@gpuix/native-win32-x64-msvc": "0.10.0" }

$ node -e "import('@gpuix/native').then(...).catch(e => print(e.message))"
Cannot find native binding. npm has a bug related to optional dependencies
(https://github.com/npm/cli/issues/4828). ...
```

`references/gpuix/packages/native/package.json` → `napi.targets`:
`aarch64-apple-darwin`, `x86_64-unknown-linux-gnu`, `x86_64-pc-windows-msvc`,
`aarch64-pc-windows-msvc`. **No `x86_64-apple-darwin`** from 0.6.0 onwards.

Building from source is not available either: `cargo`/`rustc` are not
installed, `xcode-select -p` points at CommandLineTools, and
`xcrun -f metal` fails (the Metal toolchain ships with Xcode).

Consequences for the **0.10.0** suite:

- `TestRenderer`/`createTestRoot` cannot be constructed here; the native smoke
  suite exits `2` (unverified) with this evidence, not `0`.
- No capability may be marked `verified` on this host, and no 0.10-based
  component may be marked `done` on the strength of a run that did not happen.
- The `wasm` browser build ships (`@gpuix/native/wasm/gpuix-web_bg.wasm`,
  20 MB), but it is a browser canvas, not the native runtime; using it as
  native evidence would be a lie. It is a *docs-embedding* candidate for the
  docs-site workstream.

### 2.2 0.5.1 **does** run here — and what it measured

`@gpuix/native-darwin-x64@0.5.1` is the last Intel-macOS binding
(`npm view @gpuix/native-darwin-x64 time` ends at `0.5.1`, 2026-08-26;
`@gpuix/native@0.6.0` drops the target). The measured results, on this exact
host with `react@19.2.0` (raw output:
`.agents/slop/rd/gpuix-0.5.1-*.txt`):

| Claim | Measured | 
| ----- | -------- |
| Offscreen `TestGpuixRenderer` runs the real GPUI pipeline | **yes** — painted text, exact bounds, click → `clicks=1` |
| Live window opens, paints, screenshots | **yes** — 1400×1040 RGBA PNGs |
| Layout bounds (flex/gap/absolute) | **yes** — exact |
| Text, `<code>`, `<markdown>` | **yes** — `getAllText` + `getPaintedText` |
| Input editing (`nativeSimulateKeystrokes`), `onChange`, `onSubmit` | **yes** |
| Overlay: `<anchored>` paints above; `onMouseDownOutside`; Escape | **yes** (the anchored node itself has no painted bounds) |
| Panel resize: pointer capture + clamp | **yes** — `320 → 380`, big negative drag clamps at `80` |
| Virtual list | **yes** — 5 of 500 rows built |
| Programmatic scroll | **yes** — `scrollTo(id,0,-40)`; `getScrollOffset` `[0,-40]` |
| Wheel scroll | **no** — synthetic wheel leaves offset `[0,0]` and content unmoved; only the `onScroll` delta fires |
| Focus/blur events | **no** — click, Tab, `focusElement(id)` and live `press("tab")` never fire `onFocus` |
| Live keyboard injection | **no** — `AutomationError: keystrokes are not live yet` |
| `canvas` | **no** — element type exists, no painted bounds |
| `onLayout`, `onScrollChange`, `getElementsAt`, `getFocusedElementId`, `role`/`aria-*`, `focusVisible` | **absent** from 0.5.1 |

Decision and consequence (ADR 0002): the library and the playground target
**0.10.0**; the **legacy probe** below records the 0.5.1 measurements as
hardware/runtime evidence and never as component verification. The reason
0.5.1 is not the target is focus: with no `onFocus`/`onBlur` delivery, a
component library cannot paint focus states, and `MISSION.md` forbids fake
interactions.

### 2.3 What 0.10.0 supports, from upstream evidence

Static evidence (installed `@gpuix/react@0.10.0` types + `references/gpuix`
README). To be **confirmed by the suite** on a supported host; never cited as
verified before a report exists.

| Capability | Upstream evidence | What the suite must confirm |
| ---------- | ----------------- | --------------------------- |
| layout | flex/grid/gap/absolute; `div` is block unless `display:"flex"` | measured bounds match the arithmetic within 1px |
| text | `<text>`, `<code>`, `<diff>`, `<markdown>`; `getPaintedText()` | `getAllText` for `<text>`; `getPaintedText` for native text |
| input | `<input>`/`<textarea>`; `autoFocus` or a click required for keys | typing updates the value; `onChange`/`onSubmit` fire |
| focus | `tabIndex`, `focusVisible`, `keyboardFocusDim`, Tab defaults, `getFocusedElementId` | Tab moves focus; Shift+Tab returns; click focuses |
| overlay | `@gpuix/react/dialog` (anchored `fill="window"`), Escape layer stack, `getElementsAt` | open, topmost hit-test, Escape closes, focus returns |
| scroll | `overflow:"scroll"`, `onScrollChange`, `getScrollOffset`, `scrollTo*` | wheel changes the offset; `onScrollChange` matches |
| panel | pointer capture, `onLayout`, `cursor:"col-resize"` | divider drag changes measured widths; clamping holds |
| virtual-list | `<virtual-list>` children/`itemCount`, `onVisibleRange` | only a window of rows is built |

Known 0.10 gaps the probes in `130` must record: no `canvas` (charts need
`<img>` + `setImagePixels`); no multiple windows (no detachable tabs); no
`position: fixed` and no `z-index` (deferred `<anchored>` layers only); **no
nested scrolling**; no `white-space: pre`; no storage primitive (persistence is
an app-boundary concern).

## 3. Design

### 3.1 Scenario contract

Each scenario is one capability, one view, one `steps` effect:

```ts
// apps/playground/src/scenarios/layout.tsx
export const layoutScenario: PlaygroundScenario = {
  id: "layout-flex-grid",
  title: "Flex layout, gaps and absolute positioning",
  capability: "layout",
  view: () => <LayoutProbe />,          // real GPUIX tree
  steps: (ctx) => Effect.gen(function* () {
    const a = yield* ctx.expectSome("box a painted", Option.fromNullishOr(ctx.host.bounds("layout-a")))
    yield* ctx.expectNear("a.width", a.width, 200, 1)
    ...
  })
}
```

Every step asserts a **number or a string read from a readout element**,
never pixels of a screenshot (upstream's own rule: "Assert numbers, not
pixels"). Readouts are `<text testId="...">` elements whose content encodes the
state being asserted, e.g. `open=true x=24 y=-160 left=320`.

### 3.2 The capability verdict

`runScenarios` (plan `100`) maps scenario outcomes to
`verified` / `failed` / `unverified`. The CLI (plan `120`) writes
`apps/playground/.artifacts/smoke-report.json` and exits:

| Exit | Meaning |
| ---- | ------- |
| 0 | every scenario ran and passed |
| 1 | at least one scenario failed — a real regression |
| 2 | the runtime is unsupported here, or no scenario ran — **no evidence** |

Exit `2` is what this host produces. `COMPONENTS.md` must never read a missing
report as support.

### 3.3 Scenario inventory (owned here; implemented per plan `120`)

| id | capability | asserts |
| -- | ---------- | ------- |
| `layout-flex` | layout | widths/margins/gaps within 1px; absolute child position |
| `text-native` | text | `getAllText` for `<text>`; `getPaintedText` for `<code>`/`<markdown>`; explicit colour set (upstream's black-text trap) |
| `input-edit` | input | click → focus; `h i` keystrokes; `onChange` readout; Enter → `onSubmit`; textarea multiline |
| `focus-traversal` | focus | `autoFocus`; Tab; Shift+Tab; click-to-focus; `getFocusedElementId` mapping |
| `overlay-dialog` | overlay | open on Enter; popup text painted; `getElementsAt` topmost is the popup; Escape closes; focus returns to trigger; backdrop click closes |
| `scroll-container` | scroll | wheel → negative offset; `onScrollChange` readout equals `getScrollOffset`; programmatic `scrollIntoView` |
| `panel-resize` | panel | divider drag +80 → left width +80 (±2); clamp at min; drag past the parent still tracks (pointer capture) |
| `virtual-list-window` | virtual-list | 5 000 rows, initial last visible index < 100; wheel → first index > 0; `onVisibleRange` readout |

Tier 3/4 probes (`table-sort-select`, `table-column-resize`,
`workspace-tab-drag`) are planned in `130`.

### 3.4 The legacy probe (0.5.1, this host)

`apps/playground/legacy-probe/` is a **nested, non-workspace package** (its own
`package.json` with `@gpuix/react@0.5.1`, `@gpuix/native@0.5.1`,
`react@19.2.0`, installed with `nub install` inside that directory). It is
deliberately outside the app build: it exists to reproduce the ADR 0002
measurements on this host and to demonstrate the runtime in a real window. Its
files:

```
apps/playground/legacy-probe/package.json
apps/playground/legacy-probe/README.md      # how to run, what it proved, what it could not
apps/playground/legacy-probe/REPORT.md      # the measured table, quoted numbers, evidence paths
apps/playground/legacy-probe/probe.mjs      # offscreen capability probe (one file, per-step isolation)
apps/playground/legacy-probe/live-app.mjs   # a real window with focus/input/drag/scroll readouts
apps/playground/legacy-probe/live-driver.mjs# drives live-app.mjs over the automation stdio protocol
```

Rules: it never sets a `COMPONENTS.md` status; its verdicts read
`verified on GPUix 0.5.1 (legacy host)`. Screenshots go to
`apps/playground/legacy-probe/.artifacts/` (gitignored).

### 3.5 Artifacts and evidence rules

- `apps/playground/.artifacts/smoke-report.json` — Schema-encoded report.
- `apps/playground/.artifacts/screenshots/<scenario-id>.png` — one frame per
  failing scenario (and `--screenshots` for all).
- `.artifacts/` is gitignored; the *report* is evidence to quote in
  `COMPONENTS.md`/docs, not to commit as a binary.
- A claim of support must name the report field it came from, e.g.
  `capabilities.scroll = verified (smoke-report.json, paste-log 2026-…, host
  darwin-arm64)`. Without a report, the row says
  `unverified (no supported host — ADR 0001)`.
- Screenshots are for a human; assertions are the evidence.

## 4. Steps

1. Finish plans `100`, `120`, `130`; implement `packages/testing` (plan `100`).
2. Implement the scenarios and CLI (plan `120`).
3. Implement `legacy-probe` (§3.4) and run it on this host:
   `cd apps/playground/legacy-probe && nub install && node probe.mjs` and
   `node live-driver.mjs`. Expected: the §2.2 table. Paste the numbers into
   `legacy-probe/REPORT.md`.
4. On **this** host: `nub run --filter playground smoke`; expected result is
   exit code `2` with the §2.1 evidence printed and *no* report written. Paste
   the exact output into the commit message and `TODO.md`.
5. On a supported host (Apple Silicon Mac / x64 Windows / Linux x64 for
   live-app smoke), run the same command; expected exit `0`, then copy the
   report summary into `COMPONENTS.md` and the docs. **If no such host is
   available, record that as the blocker; do not fake it.**
6. Update `COMPONENTS.md`'s GPUix-support column for the eight capabilities
   with `verified`, `verified on GPUix 0.5.1 (legacy host)` where §2.2 measured
   it, or `unverified (no supported host, ADR 0001)`.
7. Commit each step separately; the blocker commit is
   `docs(smoke): record the unsupported-host verdict and its evidence`.

## 5. Test plan

The smoke suite is itself a test, so it gets the same two-direction rule:

1. **Suite fails when a primitive misbehaves.** On a supported host, change
   `panel-resize`'s expected delta from `+80` to `+81` and confirm the suite
   exits `1` naming that check. Revert. (On this host the suite never runs;
   the proof is deferred with the run.)
2. **Unsupported host exits `2`, not `0`.** On this host:
   `nub run --filter playground smoke; echo $?` → `2`. Fails if the CLI
   swallows the missing binding and reports success.
3. **Preflight is pure-logic tested** by `packages/testing` tests (plan `100`
   tests 1–3), which run on every host.
4. **Scenario metadata integrity** (app test): every scenario id is unique,
   non-empty, and its declared `capability` is in the `Capability` union; the
   registry covers all eight capabilities. Fails if a scenario is added without
   a capability or duplicated.
5. **Report honesty** (app test): when `detectRuntime` returns unsupported, the
   CLI claims exactly zero verified capabilities.

## 6. STOP conditions

- **If the executor finds a working darwin-x64 binding, or a reproducible
  source build**, stop and report with the exact commands and versions before
  using it; this plan's entire verdict changes.
- **If a capability fails on a supported host**, do not weaken the check.
  Record `failed` with the measured numbers, report it, and the owning
  component plan must design around the limitation.
- **If a scenario needs a workaround to pass** (e.g. splitting a nested scroller
  so the wheel lands), that is a limitation: record it as a separate finding
  with the reproduction, and keep the honest scenario.
- **Never** use the wasm/browser renderer, a mocked renderer, or a screenshot as
  proof of native support.
- If screenshots land outside `.artifacts/`, stop: binaries must not be
  committed.

## 7. Acceptance criteria

- On a supported host: all eight scenarios pass, exit `0`, report and
  screenshots written, `COMPONENTS.md` updated from the report.
- On this host: exit `2`, the §2.1 evidence is printed and quoted in `TODO.md`,
  no capability claims a run that did not happen, and `nub run check` passes.
- The legacy probe reproduces §2.2 in `legacy-probe/REPORT.md`, and the report
  names the interactions it could not verify (focus/blur, wheel scroll, live
  keys, canvas).
- Every capability in `COMPONENTS.md` carries either a verified report
  reference or an explicit `unverified` reason.

## 8. Handoff

- Component plans: their "verified in the real runtime" step is *this suite's
  scenario for the capability*, plus their own interaction checks.
- Docs-site workstream: link `apps/playground` run instructions from component
  pages instead of implying a browser preview is native (MISSION's preview
  strategy); the artifact paths in §3.4 are stable.
- Integration branch: if any run is ever performed elsewhere, the report must be
  pasted into the PR/commit, because `.artifacts/` is not committed.

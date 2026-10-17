# apps/playground — the native GPUix playground

**Status: Phase B, implemented** (plan `120`,
`.agents/slop/plans/120-app-playground.md`). One app, three jobs:

1. **The playground** — a real GPUix window showing every scenario, so a human
   can drive each primitive by hand.
2. **The native smoke runner** — the same scenarios exercised by synthetic GPUI
   input in a `TestRenderer`, producing `smoke-report.json`.
3. **The evidence source for the docs** — scenario ids, readouts and screenshots
   are what `apps/docs` links to instead of faking a native preview.

The **registry is the single source of truth**: `src/scenarios/index.ts` is both
the sidebar and the smoke list, so a scenario cannot exist in one and not the
other. Each scenario is one capability, one view, one `steps` effect: the eight
core capabilities plus three Tier 3/4 probes (`table-select-sort`,
`table-column-resize`, `workspace-tab-drag`).

## Run it

```sh
nub run dev:playground              # from the repo root: opens the playground window
nub run --filter playground smoke   # the native smoke suite, headless
```

`dev` and `smoke` both **preflight first**: they import the native binding only
after asking whether it loads, so a host without one gets a one-line remedy and
exit `2`, never a stack trace.

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
nub run --filter playground build && node apps/playground/dist/smoke/run.js; echo $?
# -> 2 on this host
```

Artifacts (gitignored, under `.artifacts/`):

- `.artifacts/smoke-report.json` — the schema-encoded report (`Report.reportJson`);
- `.artifacts/screenshots/<scenario-id>.png` — one frame per scenario with `--screenshots`.

Flags: `--json`, `--only <scenario-id>`, `--screenshots`, `--artifacts <dir>`.

Nothing is written to `.artifacts/` on an unsupported host: exit `2` means there
is no evidence, and a stale report must never be mistaken for a fresh one.

## Evidence on this host (read this before believing a status row)

The library targets `@gpuix/react@0.10.0` + `@gpuix/native@0.10.0`, and this
Intel Mac has **no `darwin-x64` binding** for it, so the 0.10.0 smoke suite
cannot run here (`.agents/adr/0001-native-smoke-host.md`). `@gpuix/native@0.5.1`
is the last release with that binding and **does** run; `legacy-probe/` measures
what GPUI does on this hardware, and `legacy-probe/REPORT.md` is the measured
table (`./legacy-probe/run.sh probe` reproduces it):

| Capability | Measured on 0.5.1 here |
| ---------- | ---------------------- |
| Layout, text, input editing, click, overlay anchoring, pointer-capture resize, virtual list, programmatic scroll | works |
| Focus / blur events | **never delivered** — no focus state can be built on 0.5.1 |
| Synthetic wheel scroll | **not applied** — only the `onScroll` delta fires |
| `<canvas>` | element type exists, nothing paints |

Those verdicts are evidence about the runtime and the hardware. They are
**never** the basis for marking a 0.10 component `done`; that needs the smoke
suite run on a supported host (Apple Silicon macOS, x64 Windows, or x64 Linux
for the live-app path).

On this host the suite exits `2`. The phase's "runs in GPUix" exit condition is
therefore met by `legacy-probe` only, and the eight scenarios stay `unverified`
until a supported host runs them.

## Structure

```
src/main.tsx             the dev entry: preflight, then one render()
src/app.tsx              the shell (sidebar = registry, stage, note)
src/ui.tsx               Readout / Panel / Pressable / … presentational helpers
src/theme.ts             app-local semantic colours (TODO: @gpuixui/tokens)
src/types.ts             PlaygroundScenario = SmokeScenario + view
src/panels/resize.ts     pure resize math (nextSize, clamped)
src/panels/split-pane.tsx the pointer-captured divider
src/scenarios/*.tsx      one view + one steps effect per capability
src/scenarios/index.ts   the registry + scenarioProblems (pure integrity check)
src/smoke/host.ts        createNativeHost(renderer): the SmokeHost adapter
src/smoke/run.ts         the CLI (preflight → mount each scenario → report)
```

## Deviations from plan `120`, and why

The plan was written against upstream `main`; the installed `0.10.0` API is
narrower. Each deviation is deliberate and measured:

- **The host adapter is synchronous, over `TestRenderer`** (`smoke/host.ts`),
  not the async `automation` `Locator`/`App`. Every renderer input and
  inspection method is synchronous and the `SmokeHost` contract is synchronous;
  the async locator would force every scenario to await for no extra capability.
- **0.10.0 has no `getElementsAt`, `onLayout` or `onScrollChange`** (verified by
  grep over the installed `dist`). The overlay scenario asserts the popup is
  *painted* and dismissible rather than hit-tested; the panel's `max` is a prop
  rather than an observed layout; the scroll scenario reads the `getScrollOffset`
  the renderer exposes instead of a layout event.
- **No programmatic focus from component code.** `PublicInstance` has no
  `focus()`, so "focus returns to the trigger" cannot be implemented or checked
  from a component; the overlay scenario does not claim it. The app boundary
  could call `renderer.focusElement`, but injecting renderer calls the component
  itself cannot make would be dishonest.
- **`style.gridTemplateColumns` is a column count**, not a CSS track list, so
  the (plan `130`) table probe uses flex rows with fixed widths instead.
- **`panels/resize.ts` + `panels/split-pane.tsx`**, not `split.ts` +
  `split.tsx`: two files with the same basename collide on emit (`split.js`).
- **`@effect/platform-node`'s `NodeFileSystem`/`NodePath`** write the artifacts
  (EF-21), not `node:fs`.

## What is proven here, honestly

- `node apps/playground/dist/smoke/run.js` exits `2` on this host with the
  loader message and the `darwin-arm64` remedy, and writes no report. (`nub run
  … smoke` prints the same lines but returns `1`; see the exit-code note.)
- The registry reveals a missing or duplicated capability (`scenarioProblems`,
  unit-tested).
- The resize arithmetic clamps inclusively (`resize.test.ts`; proven to fail
  without the clamp).
- The CLI's unsupported path returns `2` without evaluating the suite
  (`run.test.ts`).
- The eight core scenarios and the three Tier 3/4 probes are **authored, not
  verified** here: running them needs a supported host, per ADR 0001/0002.

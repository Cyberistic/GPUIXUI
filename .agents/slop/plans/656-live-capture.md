# 656 — The live runner's capture mode and provenance sidecar

**Status:** planned (this plan). **Phase:** F (integration and the docs pipeline).
**Depends on:** `120` (the live runner), `189` (a real window), `564` (capture
provenance), `655` (the current promotion gate). **Owner:** playground
(`apps/playground`).

## 1. Why

The docs' published native frames are produced by the **headless** runner:

```sh
nub apps/playground/dist/smoke/run.js --capture <dir> --only <ids>
```

`--capture` writes one PNG per selected scenario plus a `provenance.json` that
names the platform, the binding version, the commit, the command and the capture
time (plan `564`; the sidecar shape is docs plan `412` §5).

The **live** runner already opens a real 1100×720 window and some live
scenarios call `ctx.host.screenshot(...)` into
`apps/playground/.artifacts/live/`. Those frames are the strongest honest
evidence the mission asks for, but they have no caption and no selection
contract, so the docs cannot publish them without inventing provenance.
`--capture` is therefore a headless-only pipeline today.

This plan adds the same, already-tested capture contract to the live runner. It
is deliberately small: it reuses `src/smoke/capture.ts` unchanged in behaviour,
adds two flags to the live CLI, and writes the frame at the same point in a
scenario's life that the headless runner does — after the view is mounted and
its `ready` gate has settled, before the scenario's steps run.

**Not in scope:** changing any scenario, any component, or the sidecar shape;
committing frames to the docs app (docs owner); a screenshot on every live run
(the existing ad-hoc `live/*.png` artifacts stay exactly as they are).

## 2. The contract

```sh
# a real-window capture of one scenario, with a caption
nub apps/playground/dist/live/run.js \
  --only live-shell \
  --capture /tmp/gpuixui-live-shots \
  --commit HEAD

# a red/unrecordable run still exits normally but writes no sidecar
nub apps/playground/dist/live/run.js --only live-shell --capture /tmp/x
# (without --commit: reads `git rev-parse --short HEAD`; if that fails, exit 2)
```

Rules, identical to the headless runner:

1. `--capture <dir>` creates `<dir>`, removes every stale `*.png` and
   `provenance.json` in it before the first frame (`clearCapture`).
2. One frame per **selected** scenario, named `<id>.png` (`captureFile`),
   captured after `mount` + `settle` + the scenario's `ready` wait.
3. `--commit <sha>` overrides `git rev-parse --short HEAD`. When neither is
   available, the run exits `2` **before** opening a window: a frame may never
   carry a guessed commit.
4. `provenance.json` is written only when every selected scenario passed
   (`captureProvenance` returns `None` for a red or empty report) and its
   `command` names the **live** runner, the capture directory and the selected
   ids (`captureCommand(..., "live")`). `capturedAt` is the report's start.
5. `--capture` changes no check and no scenario. A capture run must report the
   same checks as the same selection without it.

## 3. Files to change

### 3.1 `apps/playground/src/smoke/capture.ts`

`captureCommand` currently hardcodes the headless path. Add a runner argument
with a `"smoke"` default so every existing call and test is unchanged:

```ts
/** The runner a caption names; both CLIs write the same sidecar. */
export type CaptureRunner = "smoke" | "live";

const CAPTURE_SCRIPTS: Readonly<Record<CaptureRunner, string>> = {
  smoke: "dist/smoke/run.js",
  live: "dist/live/run.js",
};

export const captureCommand = (
  directory: string,
  only: ReadonlyArray<string>,
  runner: CaptureRunner = "smoke",
): string => ...
```

Everything else in the module stays byte-for-byte the same.

### 3.2 `apps/playground/src/live/cli.ts`

Add to `LiveFlags`:

```ts
readonly capture: Option.Option<string>;
readonly commit: Option.Option<string>;
```

Parse `--capture <dir>` and `--commit <sha>` exactly like the headless parser:
a missing value appends `"--capture needs a directory"` /
`"--commit needs a sha"` to `unknown`, never a silent no-op. Extend the usage
text with the two lines and the `dist/live/run.js` spelling.

### 3.3 `apps/playground/src/live/cli.test.ts`

New tests (the file is pure):

- `--capture out --commit abc123` sets both options and leaves `unknown` empty;
- `--capture` alone reports `--capture needs a directory`; same for `--commit`;
- a bare run still has both `Option.none()`.

### 3.4 `apps/playground/src/live/run.ts`

- Acquire `Path.Path` (already provided by `main`).
- Read the commit before the native import, mirroring the headless runner:
  `flags.commit` or `readCommit(spawner)`; when capture is on and no commit is
  readable, print the same one-line message and return `EXIT.unverified`
  **before** `createRenderer`.
- When capture is on: `makeDirectory(dir, { recursive: true })` and
  `clearCapture(dir)` before mounting the first view.
- In `mount`, after `settle` and the optional `ready` wait, call
  `host.screenshot(captureFile(path, dir, live.id))` when capture is on.
- After the report is written: when capture and commit are both present, build
  `captureProvenance(report, { platform, gpuixVersion: bindingPin.version,
  commit, command: captureCommand(dir, selectedIds, "live") })`, write it on
  `Some`, and print the headless runner's "no provenance written" line on
  `None`.
- Add `ChildProcessSpawner.ChildProcessSpawner` to `program`'s requirements and
  `NodeChildProcessSpawner.layer` to `main`'s provides.

### 3.5 `apps/playground/src/smoke/capture.test.ts`

One new case in the `captureCommand` describe: the `"live"` runner string. No
existing case changes.

### 3.6 `apps/playground/README.md`

In the live-runner section, document the two flags, the one-frame-per-selected
-scenario rule, the sidecar's five fields and the exact command. State the
honesty rule explicitly: a live frame is a real 1100×720 window; a headless
frame is the offscreen `TestRenderer`; both are GPUix-native and both need the
sidecar.

### 3.7 Ledgers

- `TODO.md`: add this task (ticked with the measured evidence) under the
  playground workstream.
- `.agents/slop/plans/README.md`: index `656` in the playground table.

## 4. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`).

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground test` | all playground tests pass, including the new capture/CLI cases |
| `nub run check` | `check:tests`, lint, fmt and every type check pass |
| `nub run --filter playground build` | `dist/live/run.js` rebuilt |
| `nub apps/playground/dist/live/run.js --list` | prints ids, exit `0`, no window |
| `nub apps/playground/dist/live/run.js --only live-shell --capture /tmp/gpuixui-live-capture --commit HEAD` | exit `0`; `live-shell.png` and `provenance.json`; the sidecar names `dist/live/run.js`, records `--commit` verbatim, and has a decodable timestamp |
| `nub apps/playground/dist/live/run.js --only live-shell --capture /tmp/gpuixui-live-capture-2` | exit `0` when git is readable (sidecar written), exit `2` before the window when it is not |
| `nub apps/playground/dist/live/run.js --only live-nope --capture /tmp/x` | exit `2`, names the id, opens no window |
| `nub apps/playground/dist/live/run.js --only live-shell` | unchanged: no `provenance.json`, no new frame in the capture dir |
| `nub apps/playground/dist/smoke/run.js --only layout-flex` | unchanged headless control, exit `0` |

Re-run the capture command twice into the same directory after deleting one
frame by hand: the directory must contain exactly one PNG and one sidecar.

## 5. STOP conditions

- If `host.screenshot` in the live window throws or blocks the run: stop,
  record the exact error and do **not** fake the frame or the sidecar.
- If the live capture changes any scenario's checks: stop; the mount hook is in
  the wrong place.
- If the sidecar's command cannot name the live runner without breaking the
  headless callers: stop and report the API shape rather than duplicating the
  helper.
- Do not add a `--screenshots` flag to the live runner in this plan; the
  existing ad-hoc scenario screenshots are out of scope.

## 6. Test plan (must be able to fail)

1. **CLI parse tests** — delete the `--capture` arm and the test fails
   (`Option.none()` where `Some(out)` was parsed); delete the missing-value
   branch and the `unknown` assertion fails.
2. **`captureCommand("live")`** — change the map's `live` entry to the smoke
   path and the test fails with the literal command.
3. **Provenance guard** — the existing `captureProvenance` tests already fail
   if a red report yields a sidecar; no new production path may bypass them.
4. **Two-direction proof (manual):** with a deliberately broken commit read
   (comment out the `--commit` branch so only git is available, run in a
   directory where `git` is unavailable) the run must exit `2` before a window;
   restore and the command passes. Record the observed output.
5. **Frame presence:** after a green capture, assert in the shell that the PNG
   exists and `file` reports a PNG; after a `--only live-nope` run, assert the
   directory is unchanged (no new frame, no sidecar).

## 7. Acceptance

- The two flags exist, are documented in the usage text and the README, and are
  guarded by pure tests.
- A focused live run writes exactly one frame per selected scenario and one
  decodable sidecar naming the live runner; a red/unrecordable run writes none.
- `nub run check`, `nub run lint`, `nub run test` pass.
- The headless capture contract, every scenario and every check are unchanged.

# 564 — The playground capture mode and its provenance sidecar

**Phase:** F (docs evidence) · **Owner:** playground · **Status:** landed
**Depends on:** `100` (the smoke harness), `120` (the runner), `150` (the theme
gallery), `529` (the binding pin), docs plan `412` §5 (the sidecar contract)
**Closes:** the playground half of the docs-site task "the docs' honest native
previews need committed images" — frames without provenance are not publishable.

## 1. The gap

The headless runner can write one frame per scenario (`--screenshots`), but the
PNGs land in the gitignored `.artifacts/` and carry **no provenance**. The docs
site (plan `412` §5) may only render a capture whose sidecar names the platform,
the GPUix version, the commit, the exact command and the capture time; a frame
without one is deliberately not rendered. Plan `433` therefore copied two
theming frames by hand and wrote `provenance.json` manually. That does not scale
to the component pages, and it lets a stale frame keep a plausible caption.

The missing unit is a **capture mode**: write the frames to a caller-named
directory **and** write the sidecar from the same run, only when every selected
scenario passed. The command is the reproducible one, so the docs can re-run it
and re-copy the directory.

Measured facts this plan builds on:

- `--screenshots` captures at **mount**, before a scenario's steps run
  (`smoke/run.ts`, `mount`). That is the right frame for a gallery screen, and
  this plan does not change when the frame is taken.
- `SmokeReport.startedAt` is the run's start in epoch milliseconds; it is the
  honest `capturedAt`, and it already ships in the report.
- `bindingPin.version` is `0.10.0` and `bindingPin.gpuix` is the release commit
  the suite claims (`binding.ts`, plan `529`). The sidecar's `gpuixVersion` is
  the **package version**, not the source commit; the report host already
  carries the source commits.
- The docs' sidecar schema is exactly
  `{ platform, gpuixVersion, commit, command, capturedAt, kind? }` with
  non-empty strings (`apps/docs/src/components/preview/captures.test.ts` on
  `agent/docs-site`). Extra keys would decode, but this plan writes only these
  five. `kind` is omitted for a still.

## 2. What changes

| File | Change |
| ---- | ------ |
| `apps/playground/src/smoke/capture.ts` | **new.** `CaptureProvenance` (`Schema.Class`), `captureJson`, `captureCommand`, `captureFile`, `captureProvenance` (report → `Option<CaptureProvenance>`), `writeProvenance`, `clearCapture`. |
| `apps/playground/src/smoke/capture.test.ts` | **new.** The pure rules and one filesystem round-trip. |
| `apps/playground/src/smoke/run.ts` | `--capture <dir>` flag (implies screenshots, wins over `--artifacts` for frames), `--commit <sha>` override, a commit read from git at the boundary, sidecar written **only for a green run**, and the usage text. |
| `apps/playground/src/smoke/run.test.ts` | Extend the existing argument tests with `--capture`/`--commit` cases. |
| `apps/playground/README.md` | A "Capturing native frames for the docs (plan 564)" section: command, sidecar fields, the green-run rule. |
| `TODO.md` | Tick the new task; note the docs-side per-component screens still pending. |
| `.agents/slop/plans/README.md` | Index this plan. |

Nothing outside `apps/playground`, `packages/testing` (read-only), `TODO.md`
and the plan index is edited. The docs site is not touched.

## 3. The contract

### 3.1 CLI

```
--capture <dir>   capture one frame per scenario plus provenance.json in <dir>
                  (implies --screenshots)
--commit <sha>    the commit to record; default: git rev-parse --short HEAD
```

- `--capture` with no value is a usage error (exit `2`), like `--only`.
- `--capture` and `--screenshots` together are accepted; `--capture` chooses the
  directory and the sidecar. `--screenshots` alone keeps today's behaviour
  (`.artifacts/screenshots/<id>.png`, no sidecar).
- The sidecar is written **after** the report and only when
  `Report.passed(report)` is true. A red or empty run writes no sidecar and
  prints `capture: no provenance written (the run did not pass)`.
- Any PNGs and the sidecar already in `<dir>` are removed **before** the frames
  are captured, so a capture directory always describes exactly one run: a
  failed run can never leave an old caption over new frames, and a green run
  cannot leave a stale frame beside its fresh caption. Non-PNG files are left
  alone.
- `--commit` is read before the binding loads. Without it and without a git
  checkout, capture exits `2` with an actionable message; it never guesses.

### 3.2 Sidecar

`<dir>/provenance.json`:

```json
{
  "platform": "darwin-x64",
  "gpuixVersion": "0.10.0",
  "commit": "965fc69",
  "command": "nub apps/playground/dist/smoke/run.js --capture out --only theme-color-roles,theme-type-and-shadow",
  "capturedAt": "2026-10-19T02:04:56.000Z"
}
```

- `platform` is `${process.platform}-${process.arch}` (the docs render it in the
  caption: `Captured from GPUix — darwin-x64, GPUix 0.10.0, 965fc69`).
- `command` is normalised from the capture directory and the **selected ids**,
  never from raw argv: the same run produces the same string, and a temp path
  cannot leak into a published caption.
- `capturedAt` is `DateTime.formatIso` of the report's `startedAt`.
- The JSON goes through `Schema.encodeSync(Schema.fromJsonString(...))`, so the
  boundary is typed like every other report.

## 4. Commands

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --capture /tmp/gpuixui-capture \
  --only theme-color-roles,theme-type-and-shadow
# expect: 2 scenarios passed, exit 0,
#   /tmp/gpuixui-capture/theme-color-roles.png,
#   /tmp/gpuixui-capture/theme-type-and-shadow.png,
#   /tmp/gpuixui-capture/provenance.json
nub apps/playground/dist/smoke/run.js --capture /tmp/gpuixui-capture --capture
# expect: usage error, exit 2, no binding loaded
nub apps/playground/dist/smoke/run.js --capture /tmp/gpuixui-capture --commit deadbee \
  --only theme-color-roles
# expect: the sidecar's commit is "deadbee"
nub apps/playground/dist/smoke/run.js --capture /tmp/gpuixui-capture --only input-edit
# expect (mutation check): if the scenario fails, exit 1, no provenance.json
```

For the docs, the publishable run is:

```sh
nub apps/playground/dist/smoke/run.js \
  --capture apps/docs/public/screenshots/theming \
  --only theme-color-roles,theme-type-and-shadow
```

Only after that green run does the docs workstream commit the frames.

## 5. Test plan

New tests must be able to fail; state the mutation that makes each fail.

1. **`captureCommand` normalises.** `captureCommand("out", ["b","a"])` is
   `nub apps/playground/dist/smoke/run.js --capture out --only b,a`; with no
   ids it has no `--only`. Mutation: append raw argv or omit the dir → fail.
2. **The sidecar has exactly the published keys.** Decode `captureJson` with a
   strict `Schema.Struct` and assert the sorted key set is
   `capturedAt, command, commit, gpuixVersion, platform`. Mutation: add `host`
   or `source` → fail.
3. **A green report produces provenance; a red or empty one does not.**
   Build two `SmokeReport` values (one passing scenario, one failing/empty) and
   assert `captureProvenance` is `Some`/`None`. Mutation: drop the
   `Report.passed` guard → the red case fails.
4. **A filesystem round-trip.** Write the sidecar with `NodeFileSystem` into a
   temp dir, read it back, decode the same schema, and assert `capturedAt`
   equals the report's start (not `Clock.currentTimeMillis`). Mutation: write
   with `Date.now()` → fail. The temp dir is created by the test and removed
   after it.
5. **A capture directory owns one run.** With a sidecar, `old-frame.png` and
   `notes.txt` present, `clearCapture` removes the sidecar and the PNG, keeps
   the text file, and treats a missing directory as a no-op. Mutation: clear
   only the sidecar → the PNG assertion fails.
6. **The CLI parses `--capture` and `--commit`.** `parseArgs` returns the
   directory and the override; a missing value is an unknown token (usage
   error). Mutation: treat a missing value as the next flag → `--capture --only`
   would silently capture to `--only`.
7. **The frames go to the capture dir.** `captureFile(path, "out", "id")` is
   `out/id.png`. Mutation: keep `artifacts/screenshots` → fail.

## 6. STOP conditions

- The git commit cannot be read and no `--commit` was given: print the remedy
  and exit `2`. Do not write `"unknown"` into a caption.
- A scenario fails: do not write the sidecar, and delete one written by an
  earlier run in the same directory. Do not publish a partial set.
- The sidecar's fields cannot be read from the run: stop and add the field to
  the report; never invent provenance.
- The change needs a path outside `apps/playground` (the root
  `playground:capture` alias, the docs directory, `COMPONENTS.md`): record it
  in `TODO.md` instead of editing it.
- The full headless suite is not green after the change: stop and report; a
  capture feature must not disturb the suite.

## 7. Acceptance

- `--capture` writes one frame per selected scenario plus one decodable
  `provenance.json`; a red run writes none.
- The sidecar decodes against the docs' published field shape.
- The six tests above run, and the two stated mutations fail in the stated
  direction.
- `nub run --filter playground build`, the focused
  `--only theme-color-roles,theme-type-and-shadow` capture, the focused
  headless scenarios, the full headless suite, `nub run check`, `nub run lint`
  and `nub run test` all pass.
- `README.md`, `TODO.md` and the plan index record the command, the contract
  and the measured result.

## 8. Result (measured 2026-10-19)

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js --capture /tmp/gpuixui-capture --only theme-color-roles,theme-type-and-shadow` | **2/2**, exit `0`; `theme-color-roles.png` (289,680 B), `theme-type-and-shadow.png` (193,390 B), `provenance.json` (237 B) |
| a second run into a directory holding `old-frame.png`, a stale sidecar and `notes.txt` | exit `0`; `old-frame.png` and the stale sidecar removed, `theme-color-roles.png` + a fresh sidecar written, `notes.txt` kept |
| the sidecar | `{"platform":"darwin-x64","gpuixVersion":"0.10.0","commit":"965fc695","command":"nub apps/playground/dist/smoke/run.js --capture /tmp/gpuixui-capture --only theme-color-roles,theme-type-and-shadow","capturedAt":"2026-10-18T23:11:36.975Z"}` |
| `nub apps/playground/dist/smoke/run.js` | **101/101**, exit `0` |
| `nub run --filter playground test` | 33 files, **417 tests** (+9) |
| `nub run check` / `lint` / `test` | exit `0` |

Two mutation proofs, each observed and reverted:

- **M1** — `captureProvenance`'s `Report.passed(report)` replaced by `true` →
  `publishes only a run where every scenario passed` fails with
  `expected true to be false` for the red report, exit `1`.
- **M2** — the report timestamp replaced by a fixed `1970-01-01T00:00:00.000Z` →
  `takes its timestamp from the report, not from a later clock read` fails with
  `expected '1970-01-01T00:00:00.000Z' to be '2025-11-24T16:00:00.000Z'`, exit
  `1`.
- **M3** — `clearCapture`'s PNG filter replaced by an empty list (so only the
  sidecar is cleared) → `clears the previous frames and sidecar but leaves
  other files` fails with `expected true to be false` for `old-frame.png`,
  exit `1`.

No `apps/playground/package.json` script was added: a `capture` script cannot
carry the required directory argument without a fragile `--` convention, so the
documented built-CLI command is the contract. The docs' `playground:capture`
alias (if it wants one) is a root-level task, recorded in `TODO.md`.

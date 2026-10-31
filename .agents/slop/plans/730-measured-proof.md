# 730 — Measured proof: the numbers the landing prints

| Field | Value |
| ----- | ----- |
| Owner | `playground` (`apps/playground/src/bench`) |
| Depends on | `728` (the pipeline block is the measured app) |
| Feeds | `727` §3 (proof strip) |
| Status | planned |

## Why

Native Mac apps are sold on how they feel *and* on what they cost: start time,
memory, size. A landing number is a claim, so every number comes from a script
in the repo, run on a named machine, written to a results file the landing
imports. No number is typed by hand.

## What is measured (the pipeline block, `examples/blocks`, darwin arm64)

| Metric | Definition | How |
| ------ | ---------- | --- |
| Cold start | process spawn → first painted frame | spawn `nub examples/blocks/src/main.tsx pipeline --bench`; the block's first `onLayout` writes `performance.now()` to stdout; wall clock from `Clock.currentTimeMillis` before spawn. Median of 10 runs after 1 warm-up, cache not dropped (say so) |
| Idle memory | RSS 5 s after first paint | `ps -o rss= -p <pid>` from the bench script |
| Frame time p99 | while the table scrolls 2 000 px | `setDebugFrameOverlay` + `getDebugFrameOverlayStats` (in `NativeRenderer`'s typed surface), driven by `scrollTo` |
| Install size | the native binding + JS a consumer ships | `du -sk` of the `@gpuix/native-darwin-arm64` store dir + the bundled block |

`apps/playground/src/bench/run.ts` (new, Effect, `@effect/platform` `Command`)
runs all four and writes `apps/docs/src/lib/proof.json`:

```json
{ "measuredAt": "2026-…", "machine": "MacBook Pro M3, macOS 26.3", "runtime": "@gpuix/native 0.11.0",
  "coldStartMs": 0, "idleRssMb": 0, "frameP99Ms": 0, "installMb": 0, "runs": 10 }
```

`proof.json` is decoded with `Schema.Class` in the landing (`727`); a missing
field fails the build rather than printing `undefined`.

## Comparator (optional, owner decision)

"vs Electron" needs an Electron build of the same block — a large dependency the
repo does not have. **STOP before adding Electron** and ask the owner. Without
it, the landing prints our numbers alone, with the machine line under them.

## Test plan

- `apps/playground/src/bench/parse.test.ts`: the RSS and timing parsers read a
  recorded sample and reject a malformed line (inversion: return `0` on a
  parse failure).
- `apps/docs/src/lib/proof.test.ts`: decoding fails on a missing field
  (inversion: make the field optional).

```sh
nub run --filter playground build && nub apps/playground/dist/bench/run.js
```

Expected: `proof.json` written, four positive numbers, `runs: 10`.

## STOP

- Stop if `getDebugFrameOverlayStats` is absent on the host renderer: record
  it in `docs/gpuix-capabilities.md` and drop the frame metric, do not estimate.
- Stop before adding any comparator dependency.

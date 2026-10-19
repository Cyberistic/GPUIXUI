# 596 — The QR rendering recipe in a real window

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `518` (`qr-code`), `161` (content surfaces), `180` (the SVG alpha
mask), `189` (the live runner), `197` (the live observation surface), `529` (the
0.10.0 bounds box), `577` (the `<img>` source contract), `591`–`594` (the
previous live twins).
**Phase:** F — the last rendering recipe with only `TestRenderer` evidence.

## 1. Why

`qr-code` (plan `518`) measured three rendering routes for one real fixture and
is still the **only** capability in `COMPONENTS.md` whose evidence is entirely
offscreen:

- a `div` per dark module (226 of them for v1, 591 for v4) inside one
  `position: "relative"` matrix — exact geometry, token colour, a real hit
  target, one retained host node per module;
- one sourced `<svg>` — a single node, but an alpha mask tinted by `color`;
- one `<img>` with an SVG data URL — a single node on the full-colour path.

The chart twin (plan `593`) later found that an SVG data URL keeps its declared
box **live**, unlike the raster data URL's 1 px-per-axis loss (plan `577`). The
QR probe uses a larger SVG data URL (`174 × 174`), so the live twin re-checks
that finding on a second surface rather than assuming one result transfers.

What live **can** settle: whether a 226-node absolutely positioned grid paints
at the exact headless offsets in a real window, whether a module is hittable
there, whether the quiet zone survives, whether switching route leaves the old
route's nodes out of the paint, and whether the version scale is exact. What it
**cannot** (measured reasons, plan `197`): token colour (`paintedStyle` is
`TestRenderer`-only), the retained-node cost (`retainedElements` likewise), and
the `role="img"` / accessible name (`GpuixRenderer` has no a11y method). Those
stay headless claims and the scenario's header says so.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `qrScenario`; add `liveQr` (after `liveChart`); add it to the exported `liveScenarios` list. |
| `apps/playground/README.md` | the live-scenario table gains a `live-qr` row; correct the live-registry count to the derived number. |
| `COMPONENTS.md` | the capability table's `qr` row cites `live-qr`; the live-suite paragraph states the new derived registry count and keeps the last full-run total honest. |
| `PLAN.md` | one `D72` row with the measured result. |
| `TODO.md` | add the task and tick it with the measured check count and the exact focused ids. |
| `.agents/slop/plans/README.md` | index row `596`; the playground narrative line records that `595` was taken by `components` and this twin takes `596`. |

No `packages/testing` change: `bounds`, `text`, `paintedText`, `click` and
`waitFor` already exist (plans `189`, `197`). No probe-view change: the headless
`qr-code` scenario stays the untouched control.

## 3. `live-qr`

Mount `qrScenario.view`, `ready: "qr-state"`. Use the existing helpers in
`live/scenarios.tsx`: `settle` (120 ms), `textOf`, `boxOf`, `waitForText`. A
live commit lands a frame later, so every route switch waits for the new
`testId` (`ctx.host.waitFor`) and settles before reading bounds.

All assertions are **matrix-relative** — the view is mounted at the window
origin, but the probe must not depend on where the shell puts it.

1. **Default route.** `qr-state` reads
   `mode=div version=v1 dark=226 size=174 hit=none`. `qr-matrix` paints
   `174 × 174` (`± 0.5`).
2. **Module grid.** `qr-dot-0-0` is `(matrix.x + 24, matrix.y + 24)`, `6 × 6`
   (`± 0.5`); `qr-dot-0-1` is exactly `+6` on x; `qr-dot-0-6` is at
   `matrix.x + 60`; `qr-dot-6-0` is at `matrix.y + 60`; `qr-dot-3-3` is at
   `(matrix.x + 42, matrix.y + 42)`.
3. **Light module.** `bounds("qr-dot-1-1")` is `null` (the runtime retains no
   node for a light module; plan `589`'s `bounds = null`, not a host error).
4. **Hit target.** Click `qr-dot-3-3`, settle, and `qr-hit` reads `hit=r3c3`.
5. **SVG route.** Click `qr-mode-svg`; `waitFor("qr-svg")`; `qr-state` reads
   `mode=svg`. `qr-svg` paints `174 × 174` (`± 0.5`) and
   `bounds("qr-dot-3-3")` is `null`.
6. **Image route.** Click `qr-mode-img`; `waitFor("qr-img")`; `qr-state` reads
   `mode=img`. `qr-img` paints `174 × 174` (`± 0.5`) — the SVG data URL keeps
   its box, re-confirming plan `593` on a second surface.
   `paintedText()` contains neither `img: no src` nor `img: load failed`.
7. **Return.** Click `qr-mode-div`; `waitFor("qr-dot-3-3")`; the module is
   painted again at the same matrix-relative `(42, 42)` — no residue and no
   drift.
8. **Version scale.** Click `qr-version`; `waitForText("qr-state", "dark=591")`.
   `qr-matrix` is `164 × 164` (`± 0.5`), `qr-dot-0-0` is at `+16` on both axes
   and is `4 × 4` (`± 0.5`).
9. Screenshot to `${LIVE_ARTIFACTS}/${liveQr.id}.png`.

Not asserted live, and said so in the header comment: module and matrix colour
(`dark.colors.foreground` / `background`), the retained-node delta, and the
`Image` a11y node named for the payload.

Expected: **~24 checks**. Record the measured count.

## 4. STOP conditions

- **STOP** if `qr-matrix` does not paint `174 × 174` in the window: the grid is
  laid out differently live and every relative offset below is meaningless.
  Record the box and the readout.
- **STOP** if a module's relative offset differs from the headless figure by
  more than `± 1` px: do not widen the tolerance. Record the matrix and module
  boxes.
- **STOP** if a light module's `bounds` is not `null` (e.g. the automation
  protocol reports the matrix instead): record what it returned. That is a
  harness mapping defect to fix, not a check to weaken.
- **STOP** if `qr-img` paints smaller than `174 × 174` (the raster 1 px loss):
  record the box — it would contradict plan `593` and must be investigated, not
  tolerated.
- **STOP** if a needed host verb is missing; do not add one without a plan.

## 5. Test plan (mutation proofs)

The scenario **is** the test. Each mutation is applied alone, the focused live
scenario is run, the failure observed, and the mutation reverted:

- **M1 (quiet zone):** `moduleOrigin` ignores `quiet` (offset `0`) → the `+24`
  and `+60` checks fail. (This also fails the headless control; that is the
  point — the live check guards the same contract.)
- **M2 (matrix box):** `matrixSize` drops one module (`(modules - 1) * size`)
  → the `174 × 174` matrix check fails.
- **M3 (hit target):** remove the module's `onClick` → `qr-hit` stays
  `hit=none`.
- **M4 (image route):** the `<img>` style width `size → size - 14` → the
  `174 × 174` image check fails while the SVG check still passes, which is what
  distinguishes the two routes.
- **M5 (light module):** render `qr-dot-1-1` unconditionally → its `bounds` is
  no longer `null`.
- **M6 (version scale):** `SPECS.v4.module` `4 → 5` → the v4 matrix, quiet-zone
  and module-size checks fail.

After reverting, the focused scenario must be green **twice in a row**.
Mutations M1, M3, M5 and M6 are probe/layout source edits; they are reverted
before the todo is ticked.

## 6. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --list | grep live-qr
nub apps/playground/dist/live/run.js --only live-qr
```

Expected: `live-qr` is listed; `1/1`, exit `0`, one screenshot at
`apps/playground/.artifacts/live/live-qr.png`.

Headless control (the view is untouched):

```sh
nub apps/playground/dist/smoke/run.js --only qr-code
```

Expected: `1/1`, exit `0`, the same check count as before (53).

End-of-task gate:

```sh
nub run check
nub run lint
nub run test
nub run --filter playground build
nub apps/playground/dist/smoke/run.js
```

Expected: all green; headless stays **103/103** (`3653` checks, 64
capabilities). The live registry moves **`83 → 84`** (derived with
`--list | wc -l`).

The full live suite is the **merge gate**. This branch is prepared for
promotion, so after the focused runs and the reverts, run it **once**:

```sh
nub apps/playground/dist/live/run.js --all
```

Expected: `84/84`, exit `0`. Record the measured total and duration; if it
flakes, re-run the failing scenario focused, fix or record it, and do not
claim a green total.

## 7. Acceptance

- `live-qr` exists, is listed, and is green twice in a row.
- The measured boxes, offsets and check count are recorded in §8.
- Six mutation proofs were observed failing and reverted.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` (D72), the README and this index carry
  the result, and no new full-suite total is claimed before it is run.
- `check`, `lint`, `test` and the full headless suite are green.

## 8. Measured record

**Result:** `live-qr` green twice in a focused run, exit `0`, one screenshot.
Live registry **`83 → 84`** (derived).

| Measurement | Value |
| ----------- | ----- |
| v1 matrix | `174 × 174` |
| quiet zone | first dark module at `(+24, +24)` |
| module | `6 × 6`, next at `+6` |
| finders | top-right `x + 60`, bottom-left `y + 60`, centre `(42, 42)` |
| light module | `bounds = null` |
| hit target | click `qr-dot-3-3` → `hit=r3c3` |
| svg route | `174 × 174`, no module nodes |
| image route | `174 × 174`, no `img: no src` / `img: load failed` |
| v4 | matrix `164 × 164`, quiet `+16`, module `4 × 4` |
| live checks | `live-qr` **?** |

Fill this table with the values the focused run printed; do not transcribe the
headless figures as if they were live measurements.

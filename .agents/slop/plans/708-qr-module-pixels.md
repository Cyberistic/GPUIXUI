# 708 — The QR module grid, in pixels: reconstruct the authored matrix from the frame

**Phase:** F (native evidence).
**Workstream:** playground (`apps/playground`, `packages/testing`).
**Depends on:** `518` (the QR recipe), `599` (the live twin), `674` (the PNG
decoder), `676`/`690`/`697`/`701`/`707` (the frame-sampling helpers), `197`
(what the live tree cannot report).

## 1. Why this plan exists

`COMPONENTS.md`'s QR row still ends at:

> Scannability is **not** asserted (no decoder, no pixel readback); the
> screenshot is the visual evidence.

The second half of that sentence is no longer true. `packages/testing`'s
`Pixels` module decodes the frame the runtime writes (plan `674`), and
`apps/playground/src/scenarios/frames.ts` is the shared sampling chain. The QR
probe has **geometry** evidence (174 × 174, quiet zone 24, module 6, finders at
60/42) and **painted-style** evidence (foreground on background), but it has
never looked at the pixels a decoder would actually sample.

This plan closes exactly that gap, honestly:

- **Measured:** every one of the 21 × 21 module centres in the frame carries the
  authored `#`/`.` value, the derived dark count is 226, and the four-module
  quiet zone paints the background (module route) or white (`img` route).
- **Still not claimed:** *decoding*. There is no decoder on this host. The new
  claim is the precondition a decoder needs — the sampled module grid **is** the
  authored matrix — not that a scanner reads the payload.

The two routes that matter are covered:

1. `div` per dark module (the reference route: theme foreground on background);
2. `<img>` SVG data URL (the single-node full-colour route: `#000` on `#fff`).

The sourced-`<svg>` route is deliberately **out of scope**, with a reason: its
dark geometry is the same `modulePath` the `div` route already samples, and its
single-tint behaviour is the runtime property plan `180`/`697` prove generically
(one alpha mask tinted by `color`). Re-sampling it would repeat a proven rule,
not add a new one.

## 2. Files

### 2.1 New: `apps/playground/src/scenarios/qr-pixels.ts`

The pure half plus the one shared assertion helper. It must not import a host or
React; it takes a frame reader and a capture result from the caller.

```ts
/**
 * QR pixels: what a decoder would sample, read back from the frame.
 *
 * The geometry probe (plan `518`/`599`) proves where the modules are; this
 * proves what colour each module centre paints. The reconstruction is pure and
 * takes a sampler, so a unit test can feed it a hand-built frame and prove the
 * comparison fails on one wrong module.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import type { FrameReader } from "./frames.js";
import { asHex, expectColour, pixelAtPoint, TOLERANCE } from "./frames.js";
import type { QrSpec } from "./qr-layout.js";

/** One sampled module: the authored value and what the frame painted. */
export interface QrPixelMismatch {
  readonly row: number;
  readonly col: number;
  readonly expected: "dark" | "light";
  readonly actual: string;
}

/** The colours one route is allowed to paint. */
export interface QrRouteColours {
  readonly dark: Pixels.Rgba;
  readonly light: Pixels.Rgba;
}

/** Reconstruct the matrix from module-centre samples. */
export const sampleMatrix = (
  matrix: ReadonlyArray<string>,
  spec: QrSpec,
  origin: { readonly x: number; readonly y: number },
  colours: QrRouteColours,
  sample: (x: number, y: number) => Option.Option<Pixels.Rgba>,
): ReadonlyArray<QrPixelMismatch> =>
  Arr.flatMap(Arr.range(0, matrix.length - 1), (row) =>
    Arr.filterMap(
      Arr.range(0, (matrix[row]?.length ?? 0) - 1),
      (col) => {
        const x = origin.x + (col + spec.quiet + 0.5) * spec.module;
        const y = origin.y + (row + spec.quiet + 0.5) * spec.module;
        const expected = matrix[row]?.[col] === "#" ? "dark" : "light";
        const wanted = expected === "dark" ? colours.dark : colours.light;
        const actual = Option.flatMap(sample(x, y), (colour) =>
          Pixels.rgbaNear(colour, wanted, TOLERANCE)
            ? Option.none()
            : Option.some(asHex(colour)),
        );
        return Option.map(actual, (hex) => ({ row, col, expected, actual: hex }));
      },
    ),
  );

/** The frame's dark-module count, derived from the same samples. */
export const paintedDarkCount = (/* … */): number => /* … */;

/** The four quiet-zone corner samples, all expected to be `colours.light`. */
export const quietZoneSamples = (
  spec: QrSpec,
  origin: { readonly x: number; readonly y: number },
): ReadonlyArray<{ readonly x: number; readonly y: number }> => /* … */;
```

Then the shared scenario helper (same shape as `highlightColourChecks`):

```ts
export interface QrPixelRoute {
  readonly label: string;
  readonly colours: QrRouteColours;
}

export const qrFrameChecks = <E>(
  ctx: Pick<Smoke.SmokeContext, "check" | "expectSome" | "expectEqual">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  route: QrPixelRoute,
): Effect.Effect<ReadonlyArray<string>, Smoke.SmokeAssertionError | E>
```

It must:

1. read `qr-matrix`'s bounds (the matrix/quiet-zone box) and the window size;
2. sample every module centre with `Pixels.framePoint` + `Pixels.pixelAt`;
3. emit **three** checks:
   - `"<label>: the frame's module grid reconstructs the authored matrix"` —
     actual reports `"<n> mismatches, first <r,c expected dark, got #hex>"`;
   - `"<label>: the frame's dark modules number 226"` — the count derived from
     the samples, not from the fixture;
   - `"<label>: the quiet zone paints <colour>"` — all four corner samples
     compared with the route's light colour;
4. return the reconstructed rows (as strings) so the caller can compare the two
   routes.

`sampleMatrix` and `paintedDarkCount` must share one sampling pass: build the
rows first, then derive both. Do not sample twice.

### 2.2 New: `apps/playground/src/scenarios/qr-pixels.test.ts`

Unit tests (vitest, co-located) for the pure half. At minimum:

1. a 3 × 3 fixture with a 1 px quiet zone and a scripted sampler echoing the
   authored colours reconstructs to the same rows, zero mismatches;
2. flipping **one** scripted sample (a light module painted dark) yields exactly
   one mismatch naming that `row`/`col` and the colour it saw;
3. the module centre is `(col + quiet + 0.5) * module` — a spec of
   `{ module: 6, quiet: 4 }` samples x `27, 33, 39 …`, not `3, 9, 15 …` (a
   quiet-zone-offset bug is the real risk);
4. `paintedDarkCount` counts only `#` rows, not the fixture length;
5. an empty/short row is skipped rather than sampled out of range.

Test 2 is the one that proves the assertion can fail; tests 1 and 3 fail if the
quiet-zone offset or the dark/light colour choice is wrong.

### 2.3 Change: `apps/playground/src/scenarios/qr-code.tsx`

- Import `qrFrameChecks` and `frames.ts`'s `captureHeadless`/`readSync`.
- **Module route:** before the probe switches to `svg`, capture one headless
  frame and run `qrFrameChecks` with `{ label: "the module grid", colours: {
  dark: foreground, light: background } }`.
- **Image route:** inside the existing `mode === "img"` section (after
  `qr-img` is painted), capture a second frame and run `qrFrameChecks` with
  `{ label: "the image route", colours: { dark: #000000, light: #ffffff } }`.
- One extra check compares the two returned row arrays: the image route paints
  the same matrix the module grid does.
- Keep the existing 59 checks untouched and in order. Update the file header:
  "Scannability is not asserted: there is no decoder on this host" stays, and
  gains "the module grid itself **is** sampled (plan `708`)".
- The palette literals come from `palettes.dark` (`foreground`, `background`).

### 2.4 Change: `apps/playground/src/live/scenarios.tsx` (`liveQr`)

- Import `qrFrameChecks` and `captureLive` (already imported in this file).
- **Module route:** after the finder/geometry checks and before the
  `qr-mode-svg` click, `captureLive(ctx.host, `${LIVE_ARTIFACTS}/${liveQr.id}.png`)`
  (the run artifact) and run `qrFrameChecks`.
- **Image route:** inside the `qr-mode-img` section, `captureLive(ctx.host)`
  (temp frame, no second artifact) and run `qrFrameChecks` with the black/white
  colours.
- The same equality check as the headless twin.
- Update the header comment: colour is no longer "screenshot only" for the QR —
  the module grid is decoded (plan `708`); a11y and the retained-node cost stay
  headless.

## 3. Exact commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/playground

# 1. Unit tests for the pure half (must fail before the module exists).
nub run --filter playground test
# expect: qr-pixels.test.ts collected; all tests green.

# 2. Build.
nub run --filter playground build
# expect: exit 0, "binding: gpuix-native.darwin-x64.node is current".

# 3. Focused headless.
nub apps/playground/dist/smoke/run.js --only qr-code
# expect: "1/1 scenarios passed · capabilities: qr=verified", exit 0.
# qr-code reports 59 + 7 = 66 checks.

# 4. Focused live (opens a real window, ~1–3 s).
nub apps/playground/dist/live/run.js --only live-qr
# expect: "1/1 scenarios passed · capabilities: qr=verified", exit 0.
# live-qr reports 45 + 7 = 52 checks; one PNG + the scenario frame is written.

# 5. End-of-task cross-cutting check.
nub run check && nub run lint && nub run test
```

The full headless suite (`nub apps/playground/dist/smoke/run.js`) is the
end-of-task check and should report **106/106** with the new check total. The
full **live** suite is a merge/release gate only and is **not** run for this
task; the focused `live-qr` run is the evidence.

## 4. Two-direction proofs (observed, reverted)

Each must be run, observed `exit 1` **with the named check failing**, then
reverted:

| # | Mutation | Expected failure |
| - | -------- | ---------------- |
| M1 | `sampleMatrix` drops `spec.quiet` from the x origin | reconstruction mismatch on row 0/col 0 |
| M2 | one character of `QR_V1.matrix` flipped in the view's fixture (`R` fixture file untouched: flip the matrix passed to the module map) | exactly one module mismatch |
| M3 | `SPECS.v1.quiet: 4 → 0` | the quiet-zone check fails (matrix box 174 still, dark offsets move) |
| M4 | the image route is checked with the theme foreground instead of `#000` | every dark module mismatches |
| M5 | `paintedDarkCount` returns the fixture's row length instead of counting | dark count check fails (`21 ≠ 226`) |
| M6 | `sampleMatrix` inverts the `expected` predicate | every module mismatches |

Record each observed failure label and the `exit` code in the landed plan.

## 5. STOP conditions

Stop and report, do not improvise, if:

- the decoded frame's module centres are **not** uniform (a mismatch that is
  consistent across a whole edge band) — that is a real anti-aliasing/scale
  finding, and the sample point rule (module centre) must be re-derived from
  measurement rather than loosened with a bigger tolerance;
- the live `<img>` box is not 174 × 174 at device scale 2 (plan `593` says an
  SVG source keeps its declared box; if this differs, record the measurement and
  stop before asserting module centres);
- `Pixels.frameScale` reports something other than 2 for the live window;
- any check passes with the fixture matrix deliberately corrupted (the assertion
  is not load-bearing) — fix the sampler, not the fixture.

## 6. Acceptance criteria

- `qr-pixels.ts` + `qr-pixels.test.ts` exist, pure, no host import.
- `qr-code` and `live-qr` both sample the module grid and the image route from
  decoded frames, and compare the two reconstructions.
- 7 new checks per suite (59 → 66 headless, 45 → 52 live); the focused runs are
  green and the M1–M6 mutations fail in the documented direction.
- `COMPONENTS.md`'s QR row no longer says "no pixel readback"; it names the new
  evidence and keeps "no decoder" as the honest limit.
- `apps/playground/README.md` and `.agents/slop/plans/README.md` record the new
  totals and this plan's status.
- `TODO.md` ticks the task, `.agents/slop/plans/README.md` indexes plan `708`,
  and `nub run check`, `nub run lint`, `nub run test` are green.

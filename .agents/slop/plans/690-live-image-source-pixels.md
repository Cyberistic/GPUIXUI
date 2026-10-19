# 690 — Image-source pixels in a real window: a path and a refused URL are colour evidence

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | F (native evidence) |
| Owner | playground |
| Depends on | `586` (the image-source contract), `577` (the live content twin), `674` (the PNG decoder and frame sampler), `676` (the shared capture path), `677` (the last gate) |
| Feeds | `COMPONENTS.md` → Image preview; `apps/playground/README.md` → the measurements table; `TODO.md` |

## 1. Goal and the gap being closed

Plan `586` measured `<img>` sources and had to stop at the box:

- a **data URL** and a **ref-uploaded byte buffer** are assertable;
- a **file path** and an **http(s) URL** load in a real window (the screenshot
  shows the bitmap and the `img: load failed` fallback), but
  `gpui::img(path|uri)`'s fallback is a plain GPUI element **absent from
  `getPaintedText()` and the tree**, there is no load/error event, and the
  offscreen loader never settles. The box was the only assertion, so
  `COMPONENTS.md` says **path/http(s) screenshot-only** (line 765).

Plan `674` then added exact pixel readback: `Pixels.decodePng` plus the shared
`scenarios/frames.ts` sampler, used by `pixel-colour`, `live-pixel-colour` and
the palette stops in `live-theme` (plan `676`). The missing step is to use that
same sampler on the **path** and **refused-URL** boxes of `live-content`.

This plan converts that screenshot-only claim into a failing-capable check:
the real window's captured frame must show the fixture's **red** pixel inside
`surface-img-path`, and must **not** show red inside the missing-path and
refused-URL boxes. The data-URL and byte-buffer routes are sampled at the same
time, so a regression in the known-good routes is caught by the same frame.

**Non-goals:** a real OS drop, upload transport/progress from a server, image
decoding quality, gradients/anti-aliasing, or a new component. It does not
claim scannability of a QR code or a pixel diff of a photograph. It changes no
headless scenario and no `packages/testing` code.

## 2. What is already measured (so the executor does not re-derive it)

From plan `586` §2/§9 and `apps/playground/src/scenarios/surfaces.tsx`:

| Node | Source | Box | Current evidence |
| ---- | ------ | --- | ---------------- |
| `surface-img-data` | 1 × 1 red PNG data URL | 64 × 64 | accepted, no fallback |
| `surface-img-bytes` | the same bytes through `ImgInstance.setImage` | 48 × 48 | readout `ok` |
| `surface-img-bytes-bad` | four junk bytes | 46 × 46 fallback | `unrecognized image format` |
| `surface-img-path` | `apps/playground/fixtures/one-pixel.png` | 48 × 48 | **box only** |
| `surface-img-path-missing` | a path that does not exist | 48 × 48 | **box only** |
| `surface-img-url-refused` | `https://127.0.0.1:1/none.png` (live view only) | 48 × 48 | **box only** |
| `surface-img-invalid` | `data:image/nope;base64,AAAA` | 96 × 64 | fallback text count |

The fixture is a real 1 × 1 RGBA PNG, verified with `file`:

```text
apps/playground/fixtures/one-pixel.png: PNG image data, 1 x 1, 8-bit/color RGBA, non-interlaced
```

The view is 680 px wide and ends at ~640 px tall, so all six source boxes are
inside the 1100 × 720 window; the current screenshot is the visual proof. The
fixture's pixel is **red**, so a decoded, painted image samples
`#FF0000FF` (tolerance `2`, `frames.TOLERANCE`). The runtime paints a fallback
for a missing/refused source, never the red fixture.

`live-content` currently reports **44 checks** (plan `577`, re-check with
`--only live-content` before changing anything). The change adds **six** colour
checks — three red, three not-red — for **50**.

## 3. Files to change

### 3.1 `apps/playground/src/live/scenarios.tsx` (only `liveContent`)

At the end of the `liveContent.steps` generator, replace the bare artifact
screenshot:

```ts
yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveContent.id}.png`);
```

with a captured frame that is both the artifact and the evidence:

```ts
yield* settle;
const frame = yield* captureLive(
  ctx.host,
  `${LIVE_ARTIFACTS}/${liveContent.id}.png`,
);
const reader = readAsync(ctx.host);
const red = new Pixels.Rgba({ r: 255, g: 0, b: 0, a: 255 });
const redIds = [
  "surface-img-path",
  "surface-img-data",
  "surface-img-bytes",
] as const;
const notRedIds = [
  "surface-img-path-missing",
  "surface-img-url-refused",
  "surface-img-invalid",
] as const;

yield* Effect.forEach(
  redIds,
  (testId) =>
    expectPixel(ctx, `${testId} paints the red fixture`, reader, frame, testId, red),
  { concurrency: 1, discard: true },
);

yield* Effect.forEach(
  notRedIds,
  (testId) =>
    Effect.gen(function* () {
      const actual = yield* pixelAtId(ctx, reader, frame, testId);
      yield* ctx.expectEqual(
        `${testId} does not paint the red fixture`,
        Pixels.rgbaNear(actual, red, TOLERANCE),
        false,
      );
    }),
  { concurrency: 1, discard: true },
);
```

Imports: `captureLive`, `expectPixel`, `readAsync` are already imported;
`pixelAtId`, `TOLERANCE` and `Pixels` must be imported (`Pixels` is already
imported for the palette scenario, `pixelAtId`/`TOLERANCE` are new).

Why the exact assertions can fail:

- **M1** point `surface-img-path` at `MISSING_PNG_PATH` → the red check fails.
- **M2** sample `surface-img-path-missing` for red → the red check fails (the
  fallback is not the fixture).
- **M3** expect `#00FF00FF` → every red check fails.
- **M4** remove the `settle` before capture → may read a pre-load frame; if it
  still passes, record it as a null result, not a weakened check. The existing
  `ready` gate and the many preceding steps are the real load window; the
  `settle` is belt-and-braces.

Do not add a tolerance above `2`; a letterboxed or unfilled box must fail by
name rather than pass on a nearby colour.

### 3.2 `apps/playground/src/scenarios/surfaces.tsx` (comment only)

The module header currently says "a path or URL load is **not** [assertable]".
Change that sentence to cite the new live pixel evidence and keep the offscreen
limitation (the offscreen loader still never settles; the **path/URL contract
is asserted in the live window only**). No view or headless check changes.

### 3.3 `COMPONENTS.md` → Image preview (line 765)

Replace **"data URL and bytes verified; path/http(s) screenshot-only"** with:

- data URL, bytes **and a real file path** pixel-verified;
- the **refused URL** is proven by the absence of the fixture's red in a real
  window (the fallback's exact pixels are not a contract);
- keep the honest limits: no load/error event, no natural size, no decode-quality
  claim, and a consumer still owns the error state.

Cite `live-content` and plan `690`. Do not touch the other rows.

### 3.4 `apps/playground/README.md` → the measurements table

In the `content` row, after the existing live sentence, add: `live-content`
decodes the frame and samples the 1 × 1 red fixture in the path, data-URL and
byte boxes, and asserts the missing-path, refused-URL and invalid-data boxes do
not show it (plan `690`). The live registry stays **95** ids and the scenario
stays one id; only its check count grows 44 → 50.

### 3.5 `TODO.md`

Add one ticked task in the playground section, above the plan-677 gate task,
naming:

- the gap (path/http(s) was screenshot-only since plan `586`);
- the six checks and the 44 → 50 count;
- the exact focused command and its result;
- the mutation proofs observed;
- that no headless scenario changed.

### 3.6 `.agents/slop/plans/README.md`

Add a row after plan `677`:

```md
| [690](./690-live-image-source-pixels.md) | Image-source pixels in a real window | F | `586`, `577`, `674`, `676` | **landed** — `live-content` 44 → 50 checks: the 1 × 1 red fixture paints in the path, data-URL and byte boxes; the missing-path, refused-URL and invalid-data boxes do not; … |
```

Use the measured numbers. 690 is the first free number in the shared table
(`678`/`679` are tokens-theme, `680`–`689` are components/tokens plans).

### 3.7 This plan

Replace `Status | planned` with `Status | landed` and fill §7 with the head,
the exact commands, the `live-content` totals, and the mutation results.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`.

1. Preflight:

   ```sh
   git status --porcelain          # expected: empty after committing this plan
   git rev-parse --short HEAD      # record the head
   nub run --filter playground build
   ```

2. Control run **before** the change (the current count):

   ```sh
   nub apps/playground/dist/live/run.js --only live-content
   ```

   Expected: `1/1`, **44 checks**, exit `0`. If it is not 44, STOP: the plan's
   delta is wrong; re-read the scenario and update this plan before editing.

3. Implement §3.1/§3.2. Rebuild and run the focused live scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/live/run.js --only live-content
   ```

   Expected: `1/1`, **50 checks**, exit `0`, one
   `.artifacts/live/live-content.png`. If a red check fails, STOP and record
   the actual sampled colour (do not lower the tolerance or change the
   fixture).

4. Headless control (the view is shared; no headless check changed):

   ```sh
   nub apps/playground/dist/smoke/run.js --only native-surfaces
   ```

   Expected: `1/1`, exit `0`, unchanged check count.

5. Gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`; playground tests stay **442** (no test file changes),
   testing **68**, components **308**, primitives **282**, tokens **196**,
   tw **103**, icons **19**, docs **7**.

6. End-of-task headless registry (a shared view was touched, so run it):

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `106/106`, **3824 checks**, 65 capabilities, exit `0`.

7. Mutation proofs (each observed failing, then reverted):

   - M1: `surface-img-path` → `MISSING_PNG_PATH`;
   - M2: the red sample targets `surface-img-path-missing`;
   - M3: expected `#00FF00FF`.

   Rebuild and run `--only live-content` after each; each must exit `1` and
   name the check. Then revert all three, rebuild, and confirm **50** green
   again.

8. Write the ledgers (§3), commit and push:

   ```sh
   git add apps/playground/src/live/scenarios.tsx \
           apps/playground/src/scenarios/surfaces.tsx \
           COMPONENTS.md TODO.md apps/playground/README.md \
           .agents/slop/plans/690-live-image-source-pixels.md \
           .agents/slop/plans/README.md
   git commit -m "feat(playground): sample image-source pixels in a live window (690)"
   git push origin agent/playground
   ```

## 5. STOP conditions

- `git status --porcelain` is non-empty before editing: STOP and commit the
  plan first.
- The control `live-content` is not **44** checks: STOP; the plan is stale.
- `surface-img-path` does not sample red in the live window: **STOP**. That is
  the finding, not a test to weaken. Record the actual colour and the frame
  (`.artifacts/live/live-content.png`) and report that the path route is not
  pixel-assertable on this host; do not claim the screenshot as the assertion.
- The path box is not inside the window (`pixelAtPoint` has no pixel): STOP and
  report the bounds; do not scroll the view in this plan.
- Any other scenario check fails, or the headless registry is not 106/106 /
  3824: STOP; this plan changes one live scenario and one comment.
- Do not raise `TOLERANCE`, do not change the fixture, do not sample an edge,
  and do not add a fallback expectation that would hide a failed load.
- Never push to `master`; never force-push.

## 6. Test plan — what the new checks can catch

| It catches | How |
| ---------- | --- |
| a path source that stops loading | the fixture is the only red thing in that box; M1 fails |
| a sample aimed at the wrong node | M2 samples the fallback and fails |
| a colour comparison with no teeth | M3 changes the expected channel and fails |
| a data-URL or byte route regressing while the path passes | all three red boxes are sampled in one frame |
| a fallback accidentally painting the fixture | the three not-red boxes fail |
| a device-scale or decode regression | the shared `frames.ts` sampler is used, and `pixel-colour`/`live-pixel-colour`/`live-theme` already guard the scale |
| a box that is clipped or unmounted | `pixelAtId` reads bounds first and fails by name |

This is not a screenshot diff: the assertion is an exact channel comparison on
the frame the runtime wrote, which is the same standard as plan `674`'s
`live-pixel-colour`. The PNG remains the run artifact.

## 7. Results

_Filled in by the executor after the run._

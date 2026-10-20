# 713 — The crop masks, in pixels: dimming is a colour, not a rectangle

**Phase:** F (evidence). **Depends on:** `385` (the crop probe), `674` (the PNG
decoder), `690`/`697` (image and SVG-artwork pixels), `701`/`707`/`708` (the
frame-pair and matrix patterns). **Number:** `709`–`712` were claimed by the
`tokens-theme` and `components` workstreams first; `713` is the first free
number at the time of writing.

---

## 1. Why this plan exists

`crop-area` (plan `385`) asserts the four masks by **geometry**: each mask's box
is the exact complement of the crop, and a crop at `x = 0`/`y = 0` paints no
mask. Every one of those checks would still pass if the mask `div` had **no
background at all** — the probe never reads what the mask painted.

`COMPONENTS.md` and `apps/playground/README.md` both say so: *"Limits: no pixel
readback …"*. Since plan `674` the suite can decode the frame, so this is now a
gap that can be closed rather than documented.

The claim to prove:

1. inside the crop the fixture's image is painted **undimmed** (its flat blue
   left half and amber right half);
2. outside the crop the same image is painted **through the mask** — the
   background token at 60 % over the image colour, sRGB-composited;
3. the boundary moves with the crop: after the measured `+40/+20` resize, a
   point that was masked is undimmed, and a point that is still masked is dimmed.

That converts "a mask rectangle exists" into "a mask paints the image darker".

Non-goals: no `<img>` fitted-rect claim (plan `385` keeps that limit), no
rounded mask, no rotation/aspect lock. The fixture's own shape (a centre circle)
is avoided by the sample points rather than asserted.

## 2. What the runtime already gives us (measured, do not re-derive)

- `packages/testing`'s `Pixels` decodes the captured PNG; `frames.ts` maps a
  logical point through the device scale (`frameScale`/`framePoint`), and
  `TOLERANCE = 2` is the per-channel slack.
- A frame capture works in both hosts: `captureHeadless(host)` and
  `captureLive(host)`. **An `<img>` with an SVG data URL paints offscreen** —
  `qr-code`'s `img` route reconstructs its matrix from a headless frame (plan
  `708`), and the crop fixture is the same kind of source.
- The mask is `backgroundColor: alpha(theme.colors.background, 0.6)`
  (`apps/playground/src/scenarios/crop.tsx`). `alpha()` rounds `0.6 × 255` to
  **`0x99` = 153/255 = 0.6 exactly**, and the runtime composites in sRGB by
  direct channel arithmetic — plan `701` verified this for a 30 % wash
  (`#7C86FF` over `#11141A` = `#31365F`).
- Both runners mount every scenario under `ThemeProvider theme={palettes.dark}`
  (`apps/playground/src/smoke/run.ts`, `apps/playground/src/live/run.ts`), so
  the mask's background token is `palettes.dark.colors.background`.
- Absolutle children of `crop-stage` are positioned from the stage's reported
  origin: the top mask's `y` equals `stage.y` (±1). The crop box reads `+2`
  because `getElementBounds` reports its **content** origin inside its own 2 px
  border. Therefore a stage-relative point maps to the window as
  `(stage.x + x, stage.y + y)` with **no correction term**.

## 3. The fixture and the sample points

`crop.tsx`'s fixture is a 400 × 200 SVG data URL: blue `#3b82f6` for `x < 200`,
amber `#f59e0b` for `x ≥ 200`, and a `#111827` circle at `(200, 100) r = 48`.
The initial crop is `x 64 y 40 w 192 h 120`; the measured resize is
`w 232 h 140`.

`objectFit` is accepted but its fitted rect is unobservable (plan `385`), so the
samples must be correct under **all three** plausible placements:

| placement | circle spans (x, at `y = 56`) |
| --------- | ----------------------------- |
| `contain` (320 × 160 centred) | `141 … 179` |
| stretched to 320 × 200 | none (centre `y = 100`, `r = 38.4`, `dy = 44`) |
| 1 : 1 from the top-left | `181 … 219` |

Therefore every sample sits at `y = crop.y + 16` and the amber sample sits at
`x ≥ 232` — outside every circle span — while staying clear of the crop border
(2 px), the NW handle (12 px, ends at `y = 46`) and the mask edges.

| sample | initial point (stage-relative) | expected |
| ------ | ------------------------------ | -------- |
| crop left half | `(crop.x + 24, crop.y + 16)` = `(88, 56)` | blue, undimmed |
| crop right half | `(crop.x + crop.width − 16, crop.y + 16)` = `(240, 56)` | amber, undimmed |
| left mask | `(crop.x / 2, crop.y + 16)` = `(32, 56)` | `60 % background` over blue |
| right mask | `(min(stage.width − 8, crop.x + crop.width + 16), crop.y + 16)` = `(272, 56)` | `60 % background` over amber |

After the `+40/+20` resize (`w = 232`): right half `(280, 56)` — still undimmed
amber; right mask `(312, 56)` — still inside the mask, still dimmed. So the pair
`240 → 280` proves the mask's edge moved, and `272 → 312` proves a mask is still
painted (not merely removed).

The expected colours are **derived**, never hardcoded: `blendOver(bg, 0.6,
image)` with `bg = palettes.dark.colors.background`. Dark background
`#11141A` gives `#224072` (over blue) and `#6C4B14` (over amber); the code
computes them so a palette or token change fails by name instead of silently
matching.

## 4. Files to create

### 4.1 `apps/playground/src/scenarios/crop-pixels.ts`

Pure expectations + one frame-check helper. No Node, no binding.

- `export const IMAGE_LEFT = "#3B82F6"`, `IMAGE_RIGHT = "#F59E0B"` — the
  fixture's flat halves; the view builds its SVG from them so the fixture and
  the expectation cannot drift.
- `export const MASK_ALPHA = 0.6` — imported by the view (one source of truth).
- `export const blendOver = (over: Pixels.Rgba, amount: number, under:
  Pixels.Rgba): Pixels.Rgba` — `round(amount·over + (1−amount)·under)` per
  channel, alpha `255`.
- `export interface CropSample { label; point: {x, y}; expected: string }`
- `export const cropSamples = (crop: CropRect, stage: Stage, background: string):
  ReadonlyArray<CropSample>` — the four rows of §3, using `Pixels.hexToRgba`;
  an unparseable colour is `Option.None` and the caller fails by name.
- `export const cropFrameChecks = <E>(ctx, reader: FrameReader<E>, frame,
  stage: Smoke.Bounds, crop: CropRect, background: string):
  Effect.Effect<void, Smoke.SmokeAssertionError | E>` — one
  `pixelAtPoint(...)` + `expectColour(...)` per sample, i.e. **4 checks per
  capture**. Reads bounds/window through the injected `FrameReader` so both
  hosts share it (the `qrFrameChecks` shape).

JSDoc on every export (AGENTS §5 EF-11). Domain code stays Effect-native:
`Effect.gen`, `Arr.map`, `Option`. No `throw`, no `console`.

### 4.2 `apps/playground/src/scenarios/crop-pixels.test.ts`

Header comment names the bug being guarded: *a mask with no background passed
every geometry check*. Vitest, `describe`/`it`, Effect-free assertions.

### 4.3 Edits

- `apps/playground/src/scenarios/crop.tsx`
  - import `{ MASK_ALPHA, IMAGE_LEFT, IMAGE_RIGHT, cropFrameChecks }` from
    `./crop-pixels.js`; delete the local `MASK_ALPHA`;
  - build `IMAGE_SVG` from `IMAGE_LEFT`/`IMAGE_RIGHT` (lower-case hex is fine;
    `hexToRgba` is case-insensitive);
  - import `captureHeadless`/`readSync` from `./frames.js` and `palettes` from
    `../palettes.js`;
  - add a `RESIZED` constant `{ x: 64, y: 40, width: 232, height: 140 }`;
  - after step 1 (geometry), capture a frame and run `cropFrameChecks` with
    `initialCrop(STAGE)`; comment it `2. Pixels: …` and renumber the following
    comments by one;
  - inside step 6 (the captured resize), after the existing resize assertions,
    capture a second frame and run `cropFrameChecks` with `RESIZED`.
  - the `stage` argument is the `boxOf(ctx, "crop-stage")` value already read
    at the top of the steps.
- `apps/playground/src/live/scenarios.tsx` (`cropArea`)
  - import `captureLive` (already imported) and `cropFrameChecks`;
  - after the opening geometry asserts and the `waitForText` settle, capture a
    frame and run the checks with the initial crop;
  - after the paced `drag("crop-handle-se", 40, 20)` and its `waitForText`,
    capture and run with `RESIZED`;
  - the stage box is already read as `yield* boxOf(ctx, "crop-stage")`.
- `apps/playground/README.md`
  - the crop section: 74 → **82** checks, live 10 → **18**, and replace the
    "no pixel readback" limit with the measured pixel contract; add a row to
    that table for the mask's colour;
  - the pixel-evidence section: name `crop-pixels.ts` beside `word-wash.ts`, and
    add the crop mask colour to the list of things proven by colour.
- `COMPONENTS.md` — the **Crop area** row: replace the "no pixel readback"
  limit with the crop-mask colour evidence and its scenario ids.
- `TODO.md` — a new `[x]` entry at the top of the playground workstream block
  with the exact counts, ids run and mutation proofs.
- `.agents/slop/plans/README.md` — this plan's row in the playground table, and
  one sentence appended to the number narrative.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`.

1. `nub run --filter playground test -- crop-pixels`
   → the new unit tests pass (5–6 tests). The filter may be ignored; then run
   `nub run --filter playground test` (whole package). Expected: green.
2. `nub run --filter playground build`
   → `apps/playground/dist/smoke/run.js` and `dist/live/run.js` are rewritten.
3. `nub apps/playground/dist/smoke/run.js --only crop-area`
   → `1/1 scenarios passed`, exit `0`, and the run reports **82** checks
   (74 + 8). A failure prints `expected #224072, got #…` — read the actual
   colour before touching the code.
4. `nub apps/playground/dist/live/run.js --only live-crop-area`
   → `1/1`, exit `0`, **18** checks. Run it **twice**; both green.
5. `nub run check && nub run lint && nub run test`
   → all green (playground unit tests go 452 → 457±, testing 68 unchanged,
   components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7).
6. End-of-task full headless registry: `nub apps/playground/dist/smoke/run.js`
   → **106/106**, exit `0`, checks **3879 + 8 = 3887**. No live `--all`
   (merge gate; a focused `live-crop-area` is this task's live evidence).

## 6. Test plan — unit tests that can fail

`crop-pixels.test.ts`:

1. `blendOver` is sRGB compositing, not a tint: `#11141A` at `0.6` over
   `#3B82F6` is exactly `r 34, g 64, b 114`; over `#F59E0B` exactly
   `r 108, g 75, b 20`. Guards direction and rounding.
2. Fails if the mask were opaque: the masked colours differ from
   `palettes.dark.colors.background` and from the image colours. Guards
   "expected background" (an opaque assumption) from passing.
3. Every sample point lies inside its own region, computed with the real
   `maskRects` (`crop-model.ts`): the two image samples inside the crop rect,
   the left sample inside `masks.left`, the right sample inside `masks.right`,
   for **both** the initial and the resized crop. Guards a hardcoded point
   that stops tracking the crop.
4. Every expected colour parses with `Pixels.hexToRgba`; the two image colours
   differ. Guards a typo'd fixture colour.

Proof that the tests can fail (do this, then revert):
- swap the blend operands → test 1 fails with the bleached value;
- use `MASK_ALPHA = 1` → test 2 fails (masked equals background);
- return `initialCrop`'s points regardless of the argument → test 3 fails on the
  resized crop.

## 7. Runtime mutation proofs (observe, then revert — all must exit `1`)

| # | Mutation | Expected failing check |
| - | -------- | ---------------------- |
| M1 | delete `backgroundColor` from `maskStyle` | `the left mask dims the image` (actual = the bright image colour) |
| M2 | `MASK_ALPHA = 0.3` | both mask checks (`expected #224072`, got the lighter blend) |
| M3 | swap `IMAGE_LEFT` / `IMAGE_RIGHT` in `cropSamples` | `the crop shows the image's right half` |
| M4 | fix the right-mask sample at window `x = 272` instead of following the crop | the **resized** right-mask check (272 is now inside the crop) |
| M5 | sample the crop's *centre* for the "right half" | fails on the fixture's circle — shows the point choice is load-bearing |
| M6 | capture the second frame **before** the resize | the resized checks (stale crop) |

Record the exact message of each in the plan's §11 addendum (added after the
run) and in `TODO.md`. Re-run `crop-area` and `live-crop-area` after the last
revert.

## 8. STOP conditions

Stop and report instead of improvising if:

- `crop-area` fails with the **masked** sample reading the *background* colour
  in **both** hosts: the mask may not composite as `alpha()` implies. Then the
  honest outcome is a documented limitation (geometry-only masks), not a
  weakened check — record the measured colour and stop.
- Headless reads the image as background but live reads it correctly: the
  offscreen `<img>` SVG route does not paint. Keep the live checks, drop the
  headless ones, and record the harness difference in the plan, the README and
  `COMPONENTS.md` (the `586` precedent).
- The frame capture makes `live-crop-area` exceed ~60 s, or it flakes twice in a
  row after a `settle`: stop and report the timing rather than adding sleeps.
- Any check needs a tolerance wider than `TOLERANCE = 2` to pass: the sample
  point is probably on an edge. Move the point; do not widen the tolerance.
- `nub run check` fails anywhere: fix the type/lint error before claiming the
  task.

## 9. Acceptance

- `crop-pixels.ts` + its tests exist; the view and both scenarios import the
  shared constants (no duplicated `0.6`, no duplicated fixture colours).
- `crop-area` reports **82** checks and `live-crop-area` **18**, both green.
- Six runtime mutations observed red and reverted; the unit-test mutations
  observed red and reverted.
- Ledgers updated (`TODO.md`, `COMPONENTS.md`, `apps/playground/README.md`,
  the plan index) with the real counts and the exact ids run.
- `nub run check`, `nub run lint`, `nub run test` green; full headless
  **106/106** with **3887** checks, exit `0`.
- Commit(s) on `agent/playground`, pushed to origin. Never push to master.

## 10. As measured (2026-10-20)

Everything in §5 held: `crop-area` **82** checks (74 + 8) and `live-crop-area`
**18** (10 + 8), both green on the first run; full headless **106/106**,
**3887** checks, exit `0`; `check`/`lint`/`test` green (playground **466** tests,
testing 68). The offscreen `<img>` SVG data URL paints, so the headless checks
are real and the shared `cropFrameChecks` serves both hosts unchanged. The live
twin took 16 s (one run 37 s under load).

**Measured colours.** Headless and live agree exactly with
`blendOver`: the image halves are `#3B82F6FF` / `#F59E0BFF` inside the crop, and
the masked halves are `#224072FF` / `#6C4B14FF` (the dark background at 60 %),
i.e. `alpha()`'s `0x99` really is 0.6 and the runtime composites in sRGB.

### 10.1 Mutation proofs observed and reverted

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | mask `backgroundColor` deleted | `the left mask dims the image: expected #224072ff, got #3b82f6ff` |
| M2 | `MASK_ALPHA = 0.3` | **null result** — the view and the expectation import the same constant, so both move and the suite stays green. That is the one-source-of-truth property, not a hole; it is *why* the constant lives in `crop-pixels.ts` |
| M2′ | `blendOver` returns `over` (an opaque mask) | `expected #11141aff, got #224072ff` |
| M3 | the left-half sample expects `IMAGE_RIGHT` | `expected #f59e0bff, got #3b82f6ff` |
| M4 | right-mask point fixed at `x = 272` | the **resized** capture fails: `expected #6c4b14ff, got #f59e0bff` (272 is inside the wider crop) |
| M5 | right-half sample moved to the crop's centre (`x = 160`) | **null result** — and a useful one: see §10.2 |
| M6 | the second capture passes `initialCrop` instead of `RESIZED` | `expected #6c4b14ff, got #f59e0bff` |
| U1 | `blendOver` operands swapped | unit test fails: `composites … in sRGB, not the reverse` |
| U2 | `cropSamples` ignores its `crop` argument | both `inside the crop and the mask samples inside their mask` and `a resize moves the right-hand samples` fail |

### 10.2 A measured correction to §3

`contain` scales the 400 × 200 fixture **by 0.8** into the 320 px stage, so the
centre circle is `r = 38.4` at `(160, 100)`, not the natural `r = 48`. The
sample row at `y = 56` is therefore clear of the circle under **every**
placement, which is why M5 (the crop's centre) passed: at `x = 160` it reads
amber, meaning the bitmap is **scaled to the box width** and the divider paints
at `stage.x + 160`. That narrows plan `385`'s "the fitted rect is unobservable":
the horizontal fit is observable through the divider; only the vertical
letterbox (whether the bitmap is stretched to 200 px or letterboxed to 160) is
still open, and no pixel check depends on it.

The sample points are unchanged (they were already outside all three circle
spans); only the rationale in §3 is corrected here.


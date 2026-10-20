# 722 — The media waveform, in the frame: bars, gaps, wash and playhead

**Phase:** F (evidence). **Depends on:** `520` (the media probe), `674`/`676`
(the frame sampler), `697` (the SVG image route paints full colour and its
transparent regions show the stage), `713`/`715` (the sRGB composite).
**Number:** `716`–`721` are claimed on the `tokens-theme` and `components`
branches; `722` is the first free number at the time of writing.

---

## 1. Why this plan exists

`media-surface` (plan `520`) asserts the waveform by **geometry and authored
style**:

- 64 bars at `left = i × 7.5`, `width 6`, heights `12…59`, bottom edges on the
  stage's `96`;
- the bars are `div`s; the image route is one `<img>` of an SVG data URL;
- the played wash is `alpha(primary, 0.3)` and the playhead is `2 px` of
  `foreground` — both asserted only by bounds.

Every one of those checks passes if the bars paint **nothing**, if the gap
between two bars is filled by a full-width wash, or if the image route decodes
to a blank bitmap. `apps/playground/README.md` records the gap as *"colour/pixel
readback (screenshot evidence only)"* and `COMPONENTS.md`'s media row ends with
*"no pixel readback (scannability/colour stays screenshot evidence)"*. That is
the last named colour gap in this workstream.

The claim to prove, from one decoded frame per state:

1. the **bar route** paints the `mutedForeground` token at a bar's centre and
   the stage's `card` in the **gap** beside it — so the envelope is bars, not a
   filled block and not nothing;
2. the slot **above** a bar paints `card` — so the bar's height is the authored
   amplitude, not a full-height column;
3. the **played wash** is `primary` at 30 % over `card` on the stage and the same
   wash over a bar's `mutedForeground` above it — so the wash covers the
   envelope, not just empty space;
4. the **playhead** is `foreground` at its own `x`;
5. the **image route** paints the same envelope in the same token at the same
   fixture coordinate, and its transparent background shows the stage.

Non-goals: no claim about decoding audio, playback, a media clock, per-bar hit
targets in the image route, glyph rasterisation or anti-aliased edges. The
image route's **gap** is not sampled: a 1.5 px gap is not a safe sample on a
rasterised SVG (plan `577`'s 1 px-per-axis loss note); the bar route's div gap
is exact.

## 2. What the runtime already gives us (measured, do not re-derive)

- `packages/testing`'s `Pixels` (`decodePng`, `frameScale`, `framePoint`,
  `pixelAt`, `hexToRgba`, `rgbaNear`, `blendOver`) and `scenarios/frames.ts`'s
  `captureHeadless`, `captureLive`, `readSync`, `readAsync`, `frameSampler`,
  `parseColour`, `asHex`, `TOLERANCE = 2`. Both hosts capture at device scale
  **2**; `framePoint` rounds.
- Both runners mount every scenario under `palettes.dark`, so the four tokens
  are `palettes.dark.colors`: `mutedForeground #A1A9B7`, `card #191D25`,
  `primary #A7A9FF`, `foreground #EEF1F5`.
- The stage is **borderless** (`media.tsx`: "a border would inset every absolute
  child"), so `media-wave`'s bounds are the envelope's coordinate origin.
- A bar slot is exactly `7.5` logical px (`480 / 64`) and a bar `6` wide, so at
  device scale 2 the bar is 12 device px and the gap 3 device px: **no
  fractional device pixel and no anti-aliased edge**. A gap sample rounds into
  the middle of those three pixels at every slot (checked for slots 0, 32, 63).
- The envelope layer's paint order is `envelope → progress → playhead`, so the
  wash covers a bar and the playhead covers the wash.
- `amplitudeAt(32) = 12 + (32 × 29 mod 48) = 28`, so bar 32 spans `y 68…96`;
  `y = 60` is above it and above **every** bar (the tallest is 59).
- The image route's `<img>` is `480 × 96` and is an SVG data URL with **no
  background rect**; plan `697` measured a transparent SVG region showing the
  stage (the chart's linear gradient fades to the background). Its bar fill is
  `theme.colors.mutedForeground` (the SVG is built with that token).

## 3. The samples

Coordinates are **stage-relative** until they are added to the stage's or the
image's reported bounds; never hardcoded window points.

### 3.1 Bar route, `pos = 0` (no wash, playhead at `x = 0…2`)

`bar0` = `bounds("media-bar-0")`, `bar32` = `bounds("media-bar-32")`,
`stage` = `bounds("media-wave")`.

| # | sample | point | expected |
| - | ------ | ----- | -------- |
| 1 | the first bar | `bar0`'s centre (`x + 3`, `y + h/2`) | `mutedForeground` |
| 2 | the gap after bar 32 | `bar32.x + 6 + 0.75`, `bar32`'s mid row | `card` |
| 3 | the middle bar | `bar32`'s centre | `mutedForeground` |
| 4 | the slot above bar 32 | `bar32.x + 3`, `bar32.y − 8` | `card` |

Sample 1 is 3 px from the slot's left edge, clear of the playhead's 2 px
(`x 0…2`). Samples 2 and 3 are a pair at the same row: a filled block fails 2, a
missing bar fails 3. Sample 4 fails a full-height column.

### 3.2 Played wash, `pos = 30` (washed `0…120`)

| # | sample | point | expected |
| - | ------ | ----- | -------- |
| 5 | wash over the stage | `stage.x + 60`, `stage.y + 4` | `blendOver(primary, 0.3, card)` |
| 6 | wash over bar 0 | `bar0`'s centre | `blendOver(primary, 0.3, mutedForeground)` |
| 7 | the playhead | `stage.x + 121`, `stage.y + 4` | `foreground` |

`y + 4` is above every bar (tallest top is `37`), so samples 5 and 7 isolate the
wash and the playhead from the envelope. Sample 6 is 3 px inside the wash and
clear of the playhead (120…122). The two composites are distinct (`#444766` over
`card`, `#A3A9CD` over `mutedForeground`), so a wash that paints over empty
space only fails 6.

### 3.3 Image route, `pos = 5` (washed `0…20`)

`image` = `bounds("media-envelope-image")`. A stage-relative point is mapped
proportionally into the image's reported box (`imagePoint`), so an inset raster
does not shift the sample out of a 6 px bar.

| # | sample | point | expected |
| - | ------ | ----- | -------- |
| 8 | the image's middle bar | bar 32's centre, mapped | `mutedForeground` |
| 9 | the slot above it | bar 32's top − 8, mapped | `card` |

## 4. Files to change

### 4.1 `apps/playground/src/scenarios/media-pixels.ts` (new)

Pure expectations + three frame-check helpers. No Node, no binding; JSDoc on
every export.

- `export const PLAYED_ALPHA = 0.3` — imported by `media.tsx` so the view and
  the expectation cannot drift.
- `export interface MediaPalette { mutedForeground; card; primary; foreground }`.
- `export interface MediaPoint { readonly x: number; readonly y: number }`.
- `export const barPoint = (bar: Smoke.Bounds): MediaPoint` — sample 1/3/6.
- `export const gapPoint = (bar: Smoke.Bounds): MediaPoint` — sample 2; asserts
  nothing, returns `bar.x + bar.width + (SLOT − BAR_WIDTH) / 2`, the bar's mid
  row.
- `export const aboveBarPoint = (bar: Smoke.Bounds, gap = 8): MediaPoint` —
  sample 4/9; `bar.y − gap` at the bar's centre x.
- `export const washPoint = (stage: Smoke.Bounds, seconds: number):
  MediaPoint` — sample 5; `stage.x + xAt(seconds) / 2`, `stage.y + 4`.
- `export const playheadPoint = (stage: Smoke.Bounds, seconds: number):
  MediaPoint` — sample 7; `stage.x + xAt(seconds) + 1`, `stage.y + 4`.
- `export const imagePoint = (image: Smoke.Bounds, point: MediaPoint):
  MediaPoint` — a stage-relative point mapped by `STAGE.width/height` into the
  image box.
- `export const mediaEnvelopeChecks = <E>(ctx, reader, frame, stage, bar0,
  bar32, palette)` — samples 1–4, four checks.
- `export const mediaPlayedChecks = <E>(ctx, reader, frame, stage, bar0,
  seconds, palette)` — samples 5–7, three checks.
- `export const mediaImageChecks = <E>(ctx, reader, frame, image, palette)` —
  samples 8–9, two checks.

Each check goes through `frameSampler(frame, window)` and `parseColour`; the
failure shape is `asHex(expected)` / `asHex(actual)` (or `"outside the frame"`).

### 4.2 `apps/playground/src/scenarios/media-pixels.test.ts` (new)

Header comment names the bug being guarded: *the waveform was asserted by
geometry and authored style only, so a bar that painted nothing, a filled gap,
or a blank image route passed every check*.

- `gapPoint` is strictly between `bar.x + BAR_WIDTH` and `bar.x + SLOT` for
  slots 0, 32 and 63 (and its x moves when the bar moves).
- `barPoint` is inside `[bar.x, bar.x + bar.width]` on both axes.
- `aboveBarPoint` is above the bar and inside the stage for **every** fixture
  bar (`barRect(i)`), and above `bar 32` when the bar is tall.
- `washPoint`/`playheadPoint`: the wash x is inside `0…xAt(30)`, the playhead x
  is within the 2 px line, and both are above every bar (`y < STAGE.height − 59`).
- `PLAYED_ALPHA` is `0.3`; `blendOver(primary, PLAYED_ALPHA, card)` differs from
  `card` and from `primary`, and differs from the same wash over
  `mutedForeground`.
- `imagePoint` maps the stage corners to the image box corners and the centre to
  the centre.
- All four palette tokens parse with `Pixels.hexToRgba`.

### 4.3 `apps/playground/src/scenarios/media.tsx`

- Import `PLAYED_ALPHA` and use `alpha(theme.colors.primary, PLAYED_ALPHA)`.
- Import `captureHeadless, readSync` from `./frames.js`, `palettes` from
  `../palettes.js`, and the three check helpers from `./media-pixels.js`.
- **After step 1's geometry checks** (before "2. A press maps…"): read
  `media-bar-32`, capture one frame, run `mediaEnvelopeChecks`. Comment
  `// 2. Pixels: the bars paint their token with a gap between them` and
  renumber the following comments.
- **Inside step 2**, after the wash/playhead bounds checks and before step 3's
  reset: capture a frame, run `mediaPlayedChecks`.
- **Inside step 9**, after the image box and fallback checks: capture a frame,
  run `mediaImageChecks`.

### 4.4 `apps/playground/src/live/scenarios.tsx` (`live-media`)

Add the same three captures around the existing steps; keep every existing
check and the final screenshot:

- after the two stage checks, capture `live-media-envelope.png` and run
  `mediaEnvelopeChecks` (needs `boxOf(ctx, "media-bar-0"/"media-bar-32")`);
- after step 1's `pos=30` check and playhead bound, capture
  `live-media-played.png` and run `mediaPlayedChecks` (30 s);
- in step 4, after the image box check and before the seek, capture
  `live-media-image.png` and run `mediaImageChecks`.

### 4.5 Docs and ledgers

- `apps/playground/README.md` — the media table gains rows for the bars/gap,
  the wash and the playhead, and the image route's pixels; the limits paragraph
  loses "colour/pixel readback"; the media intro counts update; the
  pixel-evidence section names `media-pixels.ts`; the scenario table rows for
  `media-surface` / `live-media` gain their new counts; the "Evidence on this
  host" totals are only updated after the full headless run.
- `COMPONENTS.md` — the **Video / audio player + waveform** row: the envelope,
  wash and playhead are frame pixels; the image route paints the same envelope;
  the remaining limits are decode, audio, per-bar hit targets and the gap in
  the image route.
- `TODO.md` — one `[x]` entry at the top of the playground workstream block:
  counts per id, exact ids run, mutation proofs, measured colours.
- `.agents/slop/plans/README.md` — this plan's row and one sentence in the
  playground number narrative.
- `PLAN.md` §4 — one decision row (`D96`) recording the measured rule: a
  waveform is proven by frame pixels; the bar route's 6/1.5 px geometry is exact
  at scale 2, the wash composites over bars, and the image route's transparent
  background shows the stage.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`.

1. `nub run --filter playground test -- media-pixels` → the new unit tests pass
   (6–7 tests). If the filter is ignored the whole package runs; expected green.
2. `nub run --filter playground build` → `dist/smoke/run.js` and
   `dist/live/run.js` rewritten; the binding install prints
   `gpuix-native.darwin-x64.node is current`.
3. `nub apps/playground/dist/smoke/run.js --only media-surface` → `1/1`, exit
   `0`, **62 → 71** checks. A failure prints `expected #…, got #…` — read the
   measured colour before changing code.
4. `nub apps/playground/dist/live/run.js --only live-media` → `1/1`, exit `0`,
   **14 → 23** checks. Run it **twice**; both green.
5. `nub run check && nub run lint && nub run test` → green (playground unit
   tests **472 → ~479**, testing 69, components 308, primitives 282, tokens
   196, tw 103, icons 19, docs 7 — the non-playground counts are current).
6. End-of-task full headless registry: `nub apps/playground/dist/smoke/run.js`
   → **106/106**, exit `0`, checks **3892 + 9 = 3901**. No live `--all` (merge
   gate; focused `live-media` is this task's live evidence).

## 6. Test plan — unit tests that can fail

`media-pixels.test.ts`, as in §4.2. Prove each fails once, then revert:

- make `gapPoint` return the bar's centre → "the gap point is in the gap"
  fails;
- make `aboveBarPoint` return `bar.y + 1` → "above every fixture bar is the
  stage, not the bar" fails;
- use `PLAYED_ALPHA = 1` → the "differs from primary" composite test fails;
- map `imagePoint` with a swapped axis → the corner/centre mapping fails;
- hardcode a window x in `barPoint` → the "moves with the bar" test fails.

## 7. Runtime mutation proofs (observe, then revert — all must exit `1`)

| # | Mutation | Expected failing check |
| - | -------- | ---------------------- |
| M1 | delete the bars' `backgroundColor` | `the first bar paints the muted foreground` (reads `card`) |
| M2 | widen every bar to `SLOT` (`7.5`) | the geometry check fails first; record that it does, then use M2′ |
| M2′ | keep the geometry, fill the envelope layer's own background with `mutedForeground` | `the gap between bars paints the stage` (reads the token) |
| M3 | paint the progress wash `alpha(primary, 1)` | `the wash over the stage is primary at 30 %` (`got #a7a9ff`) |
| M4 | paint the playhead `mutedForeground` | `the playhead paints the foreground` |
| M5 | build the image route's SVG fill from a literal `#FF0000` | `the image envelope bar paints the muted foreground` |
| M6 | `PLAYED_ALPHA = 0.6` | **null result expected** (the view and the expectation share the constant — the one-source-of-truth property; record it like plan `715` M5) |
| M7 | skip the played capture (sample the `pos=0` frame for the wash) | `the wash over the stage is primary at 30 %` (reads `card`) |

Record each exact message in §10 and `TODO.md`.

## 8. STOP conditions

Stop and report instead of improvising if:

- the bar's frame pixel is **not** `mutedForeground` in both hosts while the
  authored style reports it: the style does not reach the frame; record the
  measured colour and stop rather than weakening the check.
- the **gap** reads anything other than `card` (for example a bar's
  `mutedForeground`): the bar box is wider than `BAR_WIDTH` or the slot maths is
  wrong; record the measured pixel and the box, and stop.
- the **played wash** reads opaque `primary` or `card`: `alpha()` does not
  composite through the envelope; the honest fix is a documented finding plus
  the working route (plans `701`/`713`), not a silenced check.
- the **image route's** transparent region reads **white** rather than `card`:
  the SVG data URL rasterises on an opaque background. Record that as a real
  finding for a media component (a theme-aware envelope must bake its
  background) and keep only the bar-colour check; do not assert white as
  "correct".
- any sample needs a tolerance wider than `TOLERANCE = 2`: the point is on an
  edge; move it inwards.
- the live capture needs a sleep longer than `settle`/`waitFor`, or flakes
  twice: stop and report the timing; do not add retries.
- `nub run check` fails anywhere: fix it before claiming the task.

## 9. Acceptance

- `media-pixels.ts` + its tests exist; `media.tsx` imports `PLAYED_ALPHA`.
- `media-surface` reports **71** checks and `live-media` **23**, both green (the
  live twice).
- Seven runtime mutations observed and reverted (six red, at most one recorded
  null), and the unit-test mutations observed red and reverted.
- Ledgers updated with the real counts and the exact ids run.
- `nub run check`, `nub run lint`, `nub run test` green; full headless
  **106/106** with **3901** checks, exit `0`.
- Commit(s) on `agent/playground`, pushed to origin. Never push to master.

## 10. As measured

To be filled by the executor.

# 520 — Tier 5 feasibility: the media surface — no player, a verbatim seek waveform

| Field | Value |
| ----- | ----- |
| Status | landed — `media-surface` 62 checks + `live-media` 14 + 15 model tests, `media=verified`, exit `0`; five mutation proofs (§8) |
| Phase | D→E (feasibility probe) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `161` (content surfaces), `180` (svg/img colour), `302` (retained-node cost), `385` (pointer modes) |
| Closes | `COMPONENTS.md` Tier 5 → *Video / audio player + waveform* (currently `no`, unverified) |

## 1. Question

`COMPONENTS.md` says "No media host element. Playback needs a platform surface
— **unverified**; a waveform can only be drawn via `<svg>` or the planned
`<canvas>`." That is the last inventory row with no measured evidence, and it
mixes two very different questions:

1. **Playback.** Does 0.10.0 provide any audio/video surface — an element, a
   renderer transport, an output device? If not, a player cannot be a component
   at all: it is an app-owned platform integration, and the library must say so
   rather than ship a decorative play button.
2. **The waveform and the seek.** A waveform is a data visualisation plus a
   pointer/keyboard scrub surface. Both halves are ordinary 0.10.0 primitives
   (`div` geometry, `<img>`, pointer capture, focus, keys, AccessKit), but the
   **gesture** has one measured trap: plan `172` found that pointer moves go to
   the **pressed** element, not its container. So a seek surface must be the
   topmost hit target (or the envelope must be `pointerEvents: "none"`), or a
   press that lands on a 6 px bar never scrubs.
3. **Cost.** A bar-per-sample waveform retains one host node per bar (plan
   `518` measured exactly that for QR modules); a single `<img>` SVG data URL
   retains one. How large is the difference, and what does each route give up?

This probe does **not** invent an encoder or a decoder. It measures the
renderer contract and records the player as an app boundary.

## 2. Source evidence (confirm in the run, do not assume)

- `apps/playground/node_modules/@gpuix/native/dist/host.d.ts:137` →
  `ElementType = "div" | "text" | "img" | "svg" | "canvas" | "input" |
  "textarea" | "anchored" | "code" | "diff" | "markdown" | "virtual-list"`.
  No `video`, `audio` or `media`.
- `apps/playground/node_modules/@gpuix/react/jsx-runtime.d.ts` → the JSX
  `IntrinsicElements` map has exactly the same twelve tags. `<video>` and
  `<audio>` do not type-check.
- `NativeRenderer` (`host.d.ts:471`) exposes mutation, focus, scroll, image,
  selection, highlight, window, path-prompt, window-control and debug methods.
  None starts, stops or observes playback; there is no audio device call.
- `native-surfaces` (plan `161`) → `<canvas>` is retained but renders
  `gpui::Empty`, so it is not a media surface either.
- `chart-svg` (plan `180`) → an `<img>` whose `src` is an SVG data URL is the
  **full-colour** image path; a sourced `<svg>` is an alpha mask tinted by
  `color`.
- `drag-autoscroll` (plan `172`) → "moves go to the pressed element, not its
  container"; `crop-area` (plan `385`) → an absolutely positioned transparent
  `div` is hit-testable, and `pointerEvents: "none"` still runs the element's
  own handler.
- `a11y-tree` (plan `160`) → `role="slider"` maps to AccessKit `Slider` and
  `aria-valuetext` becomes the node's `value`; `aria-valuenow` is dropped.

If the run contradicts any of these, **STOP** and record the measurement before
changing this plan (§7).

## 3. Design

New capability `media`; new scenario `media-surface`; new live twin `live-media`;
new pure model `apps/playground/src/scenarios/media-model.ts` with its test.

### 3.1 Fixtures (deterministic, no randomness)

- Stage `480 × 96`; `DURATION = 120` s; `BARS = 64`; `SLOT = 480 / 64 = 7.5`;
  `BAR_WIDTH = 6`; `PX_PER_S = 480 / 120 = 4`.
- `amplitudeAt(i) = 12 + ((i * 29) % 48)` → heights `12 … 59`, bottom-aligned.
- The envelope SVG is built from those same amplitudes by the pure model, so
  both routes show one fixture.

### 3.2 View (`apps/playground/src/scenarios/media.tsx`)

A 560 px frame containing:

- a toolbar: `media-plane` (plane over/under), `media-back` (−5 s),
  `media-forward` (+5 s), `media-reset`;
- `media-wave`, a `480 × 96` `position: "relative"` stage, whose children in
  paint order are
  1. the envelope — `route=bars` renders **64** absolute `div`s at
     `left = i * 7.5`, `width 6`, `height = amplitudeAt(i)`,
     `top = 96 − height`, `backgroundColor = colors.mutedForeground`; bars 0,
     32 and 63 carry `testId="media-bar-0|32|63"`; `route=image` renders one
     `<img testId="media-envelope-image">` of the same envelope (SVG data URL,
     `480 × 96`);
  2. `media-progress`, an absolute wash from x `0` to `xAt(pos)` in
     `alpha(colors.primary, 0.3)`, so it has **no bounds at 0**;
  3. `media-playhead`, 2 px, full height, `colors.foreground`, at
     `left = xAt(pos)`;
  4. `media-seek`, an absolute transparent plane over the whole stage with
     `role="slider"`, `aria-label="Playback position"`,
     `aria-valuetext="${pos}s of ${DURATION}s"`, `tabIndex={0}`,
     `cursor: "pointer"`, and the press/move/release handlers. In
     `plane=under` it renders **before** the envelope instead.
- `media-readout`: `pos=<n> duration=120 plane=over|under route=bars|image`.
- `media-log`: the gesture order, e.g. `down:seek>move:seek>up:seek`.

The plane owns the gesture; the bars and the image have no handlers. There is
**no play/pause control**: a button that changed an icon without producing
sound would be exactly the decorative placeholder MISSION forbids.

### 3.3 Assertions (`media-surface`)

1. The stage is `480 × 96`; bar 0 is at the stage origin, `6` px wide, bottom
   `96`; bar 63's left is `472.5`; bar 0's height is `12`.
2. A press at `stage.x + 120` sets `pos=30`; the playhead's left is exactly
   `120` from the stage origin; the progress wash is `120` wide; bar 32 stays
   `mutedForeground`.
3. A held drag `+60` px from that press sets `pos=45`, the wash grows to `180`,
   and the log is `down:seek>move:seek>up:seek`.
4. A held move past the right edge clamps at `pos=120`; a move before the left
   edge clamps at `0`.
5. Keyboard: clicking the plane focuses `media-seek`; `right` → `31`,
   `shift-right` → `36`, `home` → `0`, `end` → `120`; `left` at `0` and `right`
   at `120` are no-ops.
6. AccessKit: one `Slider` named `Playback position` with
   `value = "36s of 120s"`.
7. Transport: `media-forward` → `+5`, `media-back` → `−5`, both clamp at
   `0`/`120`; reset restores `pos=0`.
8. Paint order is load-bearing: in `plane=under`, a press on a bar followed by
   moves changes **nothing** and the log stays empty; in `plane=over` the same
   gesture scrubs. Then the bars are set `pointerEvents: "none"` **with the
   plane still under** and the gesture scrubs again — the two working routes.
9. Cost: read `retainedElements()` in `route=bars` and `route=image`; the
   delta must be exactly `63` (`64 bars − 1 image`). The image route paints
   `480 × 96`, has no `img: load failed` fallback, and `media-bar-0` has no
   bounds because it does not exist.
10. Seeking works in the image route too: a press at `120` → `pos=30` with a
    `120` px wash.

### 3.4 Live twin (`live-media`, ~14 checks)

Reuse `mediaScenario.view`. In the real window:

- the stage and the plane are `480 × 96`;
- `clickWindow(stage.x + 120, stage.y + 48)` → `pos=30`;
- a paced `drag("media-seek", 60, 0)` from the centre (`240 → 300`) → `pos=75`;
- a click focuses the plane, `right` → `+1`, `home` → `0`;
- `media-forward` → `5`; reset → `0`;
- the image route paints and still seeks.

Colour, `paintedStyle`, `retainedElements` and a11y are **not** asserted live
(the live renderer exposes none of them — plan `197`).

### 3.5 Pure model (`media-model.ts`, ~15 tests)

`timeAt(px)`, `xAt(seconds)`, `stepTime(seconds, key, shift)`,
`amplitudeAt(index)`, `barRect(index)`, `positionLabel(seconds)`,
`envelopeSvg(amplitudes, width, height)`, and the constants. Tests must fail if
the clamp, the `4 px/s` scale, the bottom alignment, the bar slot or the label
changes.

## 4. Files

| File | Action |
| ---- | ------ |
| `apps/playground/src/scenarios/media-model.ts` | new — pure seek/envelope model |
| `apps/playground/src/scenarios/media-model.test.ts` | new — ~15 tests |
| `apps/playground/src/scenarios/media.tsx` | new — `media-surface` scenario |
| `apps/playground/src/scenarios/index.ts` | import; `"media"` in `PROBE_CAPABILITIES`; append the scenario |
| `apps/playground/src/live/scenarios.tsx` | import + `live-media` scenario |
| `packages/testing/src/smoke.ts` | `"media"` in `CAPABILITIES` |
| `apps/playground/README.md` | a short measured section + suite counts |
| `COMPONENTS.md` | the row + capability table + suite counts |
| `TODO.md` | tick the task |
| `PLAN.md` | one decision row |
| `.agents/slop/plans/README.md` | index row; next free number `521` |

## 5. Commands and expected results

```sh
nub run --filter playground test          # -> new model tests pass
nub run --filter playground check-types   # -> exit 0
nub run --filter playground build         # -> dist/smoke + dist/live
nub apps/playground/dist/smoke/run.js --only media-surface
# -> "1/1 scenarios passed", media=verified, exit 0,
#    .artifacts/screenshots/media-surface.png written
nub apps/playground/dist/live/run.js --only live-media
# -> "1/1 scenarios passed", media=verified, exit 0
```

Final gate for this task: `nub run check`, `nub run lint`, `nub run test`, and
the **full** headless suite once (`nub apps/playground/dist/smoke/run.js --all`)
because `index.ts` and the capability union are shared by every scenario.

## 6. Two directions

Each mutation must fail, then be restored:

- **M1 — the seek source:** drop the clamp in `timeAt` (return `px / 4`); the
  past-the-edge drag check must fail with the overshoot.
- **M2 — the hit target:** ship the plane **under** the bars and remove the
  `pointerEvents: "none"` route; the zero-change check turns into a scrub, or
  the scrub stops. Either direction proves the plane/bars rule.
- **M3 — the cost:** render one bar per **two** amplitudes; `retainedElements`
  delta reads `31` instead of `63`.
- **M4 — the a11y value:** drop `aria-valuetext`; the `Slider` value check
  fails.
- **M5 — live drag:** make the plane `pointerEvents: "none"` in the live view;
  `live-media`'s drag must stop scrubbing.

## 7. STOP conditions

- Any media/playback API appears in 0.10.0's types or renderer (then the plan's
  limitation is wrong: record it and redesign as a player probe).
- The image route's retained-node delta is not `63` (record the measured count
  and do not force the number).
- A real-window drag cannot be paced (`live-media` nondeterministic across two
  runs): drop the live drag check rather than widen its tolerance, and record
  why.
- The AccessKit role is not `Slider` or the value is not `aria-valuetext`
  (record the dump and correct §3.3 item 6).
- Any change would require editing a path outside `apps/playground`,
  `packages/testing` or the shared ledgers: stop and add a `TODO.md` task.

## 8. Measured result

### 8.1 The player question

Playback is **not available** and the evidence is the published type surface,
not an inference: `ElementType` is the twelve-tag closed union listed in §2, the
JSX intrinsics map is the same twelve, `NativeRenderer` has no transport or
audio call, and `<canvas>` renders `gpui::Empty` (plan `161`). A player is
therefore an app-owned decoder and clock; the library can render the state it is
given. `COMPONENTS.md` now records the row as `blocked (no media surface;
waveform probe only)` with `unsupported` runtime support.

### 8.2 The waveform and the seek

- The stage is exactly `480 × 96` with **no border**: a 1 px border insets every
  absolute child by one pixel, which shifted bar 0 to `+1` and would put the
  playhead one pixel right of the pointer. Removing it made the stage's bounds
  the coordinate origin (the first run failed `expected 12 ± 0.5, got 13`).
- 64 bars at `left = i × 7.5`, `width 6`, height `12…59`, every bottom edge on
  the stage at `96`; bar 63 is at `472.5`.
- The seek is exactly 4 px/s: a press 120 px in is `30 s`, a held `+60 px` drag
  is `45 s`, and both ends clamp. The playhead's left is the seek x, and the
  progress wash's width is the same distance; at `0` no wash is painted.
- Keyboard: the plane takes native focus, Right `+1`, Shift+Right `+5`, Home/End
  the ends, all clamped. `+5 s`/`-5 s` buttons clamp identically.
- AccessKit: one `Slider` named `Playback position`, `value = "36s of 120s"`
  (from `aria-valuetext`; `aria-valuenow` is dropped, plan `160`).

### 8.3 The hit target (the transferable finding)

- `plane=under` + the envelope blocking: pressing at `+120 px` and moving
  `+60 px` leaves `pos=0` and an **empty** log. The press lands on the playhead
  or a bar, and the runtime delivers the moves to that pressed element, not to
  the plane beneath (plan `172`).
- `plane=pass` (plane under, `pointerEvents: "none"` on the painted layer) and
  `plane=over` both scrub to `45`.
- So the rule is: **the seek plane must be the topmost hit target, or the
  painted layer must be `pointerEvents: "none"`** — one transparent plane plus
  one non-interactive layer is the whole component.

### 8.4 The cost

| Route | Retained host nodes (whole scenario) |
| ----- | ------------------------------------ |
| `route=bars` | `93` |
| `route=image` | `30` |
| delta | **`63` = 64 bars − 1 image** |

Switching back to the bars restores exactly `93`, so the counter is stable and
no node leaks across the route change. A long waveform should use the vector
route (or window its bars); the bar route is only worth it when a per-bar hit
target or a per-bar colour is required.

### 8.5 Two directions

Each mutation was applied, run with `--only`, and restored (`diff -q` clean):

| # | Mutation | Measured failure |
| - | -------- | ---------------- |
| M1 | `timeAt` loses `clampTime` | `a drag past the right edge clamps at the end: expected "120", got "530"` |
| M2 | pass mode no longer sets `pointerEvents: "none"` | `a passing envelope lets the plane under it scrub: expected "45", got "0"` |
| M3 | one route-specific host node added to the bars | `64 bars retain 63 more host nodes than one image: expected 63, got 64` |
| M4 | `aria-valuetext` removed | `the slider's value is the position out of the duration: expected "36s of 120s", got "none"` |
| M5 | `onMouseMove` becomes a no-op (live) | `the live drag scrubs to 75 s: expected "pos=75 …", got "pos=60 …"` |

Note for M3: a node added **outside** the route conditional cancels out of the
delta (both routes gain it), which is why the mutation had to live in the bars
branch. The first two attempts taught that before the published one.

### 8.6 Limits

- No decode, no audio output, no media clock, and no per-bar hit target in the
  image route.
- Colour and pixel readback are not observable; the screenshot is the visual
  evidence.
- The live suite does not assert `paintedStyle`, a11y or retained nodes — the
  live renderer exposes none of them (plan `197`).
- A real media file would need the app to own a decoder and feed `<img>` frames
  or `setImagePixels`; that is an integration, not a component contract.

### 8.7 Suite

`media-surface` 62 checks, `live-media` 14, model tests 15 (playground suite
`382` tests). Headless `95/95` (`3369` checks) and live `45/45` (`924` checks)
are the final gate runs recorded in `TODO.md`.

# 697 — The chart recipe's colour contract in a real window: per-element SVG tint, fills and gradients

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground |
| Depends on | `180` (the chart recipe), `593` (the live chart twin), `674` (the PNG decoder and frame sampler), `690` (the image-source pixel precedent), `691` (the last gate) |
| Feeds | `COMPONENTS.md` → Charts; `apps/playground/README.md` → the chart section and the pixel section; `TODO.md` |

## 1. Goal and the gap being closed

Plan `180` decided the Tier 3 chart recipe from what the renderer actually does:

- bars from `div`s keep exact geometry, token colour and hit-testing;
- a sourced `<svg>` is an **alpha mask tinted by the element's `color`**, so one
  document is one colour;
- an `<img>` with an SVG data URL takes the image path, which keeps **every fill
  and gradient**.

Plan `593` moved the geometry into a real window. The **colour** half of that
recipe still stops at the style report and the screenshot:

| Claim | Today |
| ----- | ----- |
| a sourced `<svg>` is painted in its element `color` | `paintedStyle` (headless only) — the live tree has no `style` |
| an `<img>` SVG data URL keeps two distinct opaque fills | screenshot only |
| its linear gradient fades and its radial gradient is a second colour | screenshot only |

`COMPONENTS.md` says so explicitly ("Colour, gradients and the alpha mask stay
`TestRenderer`/screenshot evidence") and so does the playground README ("only
its pixels are screenshot evidence").

Plan `674` added exact pixel readback (`Pixels.decodePng` plus the shared
`scenarios/frames.ts` sampler), plan `676` used it for the palette, and plan
`690` for image sources. This plan uses the same sampler on the chart: one
captured live frame must show the two mask tints, the two image fills and both
gradients.

**Non-goals:** scannability, SVG glyph rendering, anti-aliased edge colours,
natural-size/decode-quality claims, a chart component. No headless check
changes and no `packages/testing` code changes.

## 2. What is already measured (so the executor does not re-derive it)

From `apps/playground/src/scenarios/chart.tsx` and the palette:

| Fact | Value |
| ---- | ----- |
| palette | `palettes.dark`: `primary #A7A9FF`, `success #3BC97F`, `background #11141A` |
| bars | 3 `div`s, `56` wide, heights `96/64/32`, baseline-aligned |
| sourced `<svg>` | `chart-series-0` (primary) and `chart-series-1` (success), both `480 × 160`, two strokes 2 px wide |
| image | `chart-image`, `<img>`, declared `480 × 120`, SVG data URL, no fallback |
| image contents | `480 × 120`; linear gradient rect `0,0,480,120` (`#4f7cff` → alpha 0); radial gradient rect `200,0,140,120` (centre `#ffd166` → alpha 0); opaque bar 1 `24,56,48,56` `#e5484d`; opaque bar 2 `96,28,48,84` `#30a46c` |
| frame | live `1100 × 720` logical → `2200 × 1440` PNG, device scale **2** (`frames.ts`) |
| current checks | `chart-svg` **52** headless; `live-chart` **40** live |

The tint proof needs a **solid** mask: a 2 px antialiased stroke is not a safe
sample point. The view therefore gains two 40 × 40 sourced SVGs whose document
is one fully opaque black square — the alpha mask is 1 everywhere, so the
painted pixel is exactly the element's `color`. They are live fixtures; the
existing headless series layers keep proving the same mechanism through
`paintedStyle`.

## 3. Files to change

### 3.1 `apps/playground/src/scenarios/chart.tsx`

Add two constants beside the existing dimensions:

```ts
const TINT_SIZE = 40;
const TINT_GAP = 12;
const TINT_MASK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${TINT_SIZE}" height="${TINT_SIZE}" viewBox="0 0 ${TINT_SIZE} ${TINT_SIZE}"><rect width="${TINT_SIZE}" height="${TINT_SIZE}" fill="#000"/></svg>`;
```

At the end of `ChartProbe`'s root `div`, directly after the `<img
testId="chart-image">`, add the two mask boxes:

```tsx
      <div
        testId="chart-tint-row"
        style={{
          display: "flex",
          flexDirection: "row",
          gap: TINT_GAP,
          width: TINT_SIZE * 2 + TINT_GAP,
          height: TINT_SIZE,
        }}
      >
        <svg
          testId="chart-tint-0"
          source={TINT_MASK_SVG}
          style={{
            width: TINT_SIZE,
            height: TINT_SIZE,
            color: theme.colors.primary,
          }}
        />
        <svg
          testId="chart-tint-1"
          source={TINT_MASK_SVG}
          style={{
            width: TINT_SIZE,
            height: TINT_SIZE,
            color: theme.colors.success,
          }}
        />
      </div>
```

Update the module header: claim 1/2/3 now say colour is asserted in a live frame
(plan `697`), and keep the honest limits (pixels of glyphs/edges are not
asserted). Do not change any existing node, check or dimension.

### 3.2 `apps/playground/src/live/scenarios.tsx`

Import `expectColour` and `pixelAtPoint` from `../scenarios/frames.js`
(`captureLive`, `expectPixel`, `pixelAtId`, `readAsync`, `TOLERANCE` are already
imported). Add `palettes` to the existing `../palettes.js` import if the module
does not already import it; `live-chart` is in the same file as `live-theme`,
which already uses `palettes`, so check the import first.

At the end of `liveChart.steps`, **replace** the bare screenshot:

```ts
      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveChart.id}.png`);
```

with a captured frame that is both the run artifact and the evidence:

```ts
      // Colour, not only geometry: the frame the runtime wrote is sampled
      // (plan `697`). `chart-tint-*` are solid masks, so their centres are the
      // element `color` exactly; the image box is sampled at SVG coordinates.
      yield* settle;
      const frame = yield* captureLive(
        ctx.host,
        `${LIVE_ARTIFACTS}/${liveChart.id}.png`,
      );
      const reader = readAsync(ctx.host);
      const window = yield* reader.windowSize();

      const tint = (token: string) =>
        ctx.expectSome(`${token} parses`, Pixels.hexToRgba(token));

      yield* expectPixel(
        ctx,
        "a sourced svg is painted in its own colour",
        reader,
        frame,
        "chart-tint-0",
        yield* tint(palettes.dark.colors.primary),
      );
      yield* expectPixel(
        ctx,
        "a second sourced svg is tinted independently",
        reader,
        frame,
        "chart-tint-1",
        yield* tint(palettes.dark.colors.success),
      );

      const sample = (label: string, dx: number, dy: number) =>
        pixelAtPoint(ctx, frame, window, image.x + dx, image.y + dy, label);

      const expectFill = (label: string, dx: number, dy: number, hex: string) =>
        Effect.gen(function* () {
          const colour = yield* sample(label, dx, dy);
          yield* expectColour(ctx, label, colour, yield* tint(hex));
        });

      const expectDominant = (
        label: string,
        dx: number,
        dy: number,
        predicate: (colour: Pixels.Rgba) => boolean,
      ) =>
        Effect.gen(function* () {
          const colour = yield* sample(label, dx, dy);
          yield* ctx.expectEqual(label, predicate(colour), true);
        });

      yield* expectFill(
        "the image keeps its first opaque fill",
        48,
        84,
        "#e5484d",
      );
      yield* expectFill(
        "the image keeps a second opaque fill",
        120,
        70,
        "#30a46c",
      );
      yield* expectFill(
        "the radial gradient's centre is its stop colour",
        270,
        60,
        "#ffd166",
      );
      yield* expectDominant(
        "the linear gradient starts blue",
        8,
        4,
        (colour) => colour.b - colour.r > 60,
      );
      yield* expectDominant(
        "the linear gradient has faded at the bottom",
        8,
        116,
        (colour) => colour.b - colour.r < 25,
      );
      yield* expectDominant(
        "the radial gradient does not cover the left edge",
        160,
        60,
        (colour) => colour.r - colour.b < 20,
      );
```

The exact offsets are **SVG coordinates inside the 480 × 120 image**, so the
expected count is predicted, not promised; the run is the authority. The
`yield* tint(...)` inside the `expectPixel` argument is evaluated before the
call, so it is one `expectSome` each; if the compiler rejects a `yield*` in that
position, hoist the two parses into `const primary = ...; const success = ...`
before the calls (behaviour identical).

Why each assertion can fail:

- the tint samples are exact token colours: a missing `color`, a
  `backgroundColor` instead, or a fallback fill fails by name;
- the fill samples are opaque rectangles 12 px inside their edges, so an image
  decoder that drops the second fill, or reorders the rects, fails;
- the radial centre is opaque `#ffd166`; removing the radial rect leaves the
  blue linear layer and fails;
- the top/bottom pair fails if the linear gradient stops fading (a constant
  stop makes the bottom blue), and the left-edge pair fails if the radial is
  widened to cover the image.

Do **not** lower `TOLERANCE`, sample an edge, or turn the gradient checks into
"top differs from bottom" only: the dominance predicates say which stop is
which.

### 3.3 `COMPONENTS.md` → Charts (line ~1056)

Replace the closing sentence "Colour, gradients and the alpha mask stay
`TestRenderer`/screenshot evidence." with the measured live result: `live-chart`
decodes one frame and samples the two sourced masks (exact `primary`/`success`),
the image's two opaque fills (`#e5484d`, `#30a46c`), the radial centre
(`#ffd166`) and the linear gradient's top/bottom (blue → background). Keep the
limits: SVG-internal glyphs are still not addressable, anti-aliased edges and
scannability are not colour-checked, and the image path is the only full-colour
route. Cite plan `697`.

Also fix the stale **Image preview** row if it still says path/http(s) are
screenshot-only: plan `690` landed the live frame proof, so the row must cite
the path match and the refused-URL absence. Do not touch other rows.

### 3.4 `apps/playground/README.md`

1. The chart section's table gains two rows:

   | Fact | Measured live |
   | ---- | ------------- |
   | SVG tint | two solid sourced masks paint `#A7A9FF` and `#3BC97F` exactly |
   | image colour | fills `#E5484D` and `#30A46C` exact; radial centre `#FFD166`; the linear gradient is blue at the top and background-dark at the bottom |

   and the paragraph "only its pixels are screenshot evidence" becomes a
   citation of the frame samples (plan `697`).

2. The pixel section's closing sentence ("gradients ... still out of scope")
   becomes: gradients and the image fills are now sampled in `live-chart`; the
   untouched limits are glyph rendering and anti-aliased edges.

3. The `<img>` sources table: change the `file path` and `http(s), refused` rows
   from **screenshot only** to the plan-`690` pixel evidence (path paints the
   fixture's colour; the refused URL does not), keeping the measured loader
   limits (no load/error event, the offscreen loader never settles, the
   consumer owns the error state). This is a truth fix for a landed plan, not a
   new claim.

### 3.5 `TODO.md`

Add one ticked task in the playground section, above the plan-691 gate row,
naming the gap, the six samples plus two tints, the `40 → 68` measured count,
the focused command, the mutation proofs and that no headless check changed.

### 3.6 `.agents/slop/plans/README.md`

Add one row after plan `691`:

```md
| [697](./697-chart-colour-pixels.md) | The chart recipe's colour contract in a real window | F | `180`, `593`, `674`, `690`, `691` | **landed** — `live-chart` 40 → 68 checks: … |
```

Use the measured numbers. `697` is the first number not claimed in any
worktree (`692`–`696` belong to other workstreams).

### 3.7 This plan

Replace `Status | planned` with `Status | landed` and fill §7 with the head, the
commands, the measured counts and the mutation results.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`.

1. Preflight:

   ```sh
   git status --porcelain          # expected: empty after committing this plan
   git rev-parse --short HEAD      # record the head
   nub run --filter playground build
   ```

2. Controls **before** the change:

   ```sh
   nub apps/playground/dist/live/run.js --only live-chart    # 1/1, 40 checks
   nub apps/playground/dist/smoke/run.js --only chart-svg    # 1/1, 52 checks
   ```

   If either count differs, STOP: the plan is stale; re-read the scenario and
   update the plan before editing.

3. Implement §3.1/§3.2, rebuild, run the focused live twin:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/live/run.js --only live-chart
   ```

   Expected: `1/1`, **68 checks**, exit `0`, one
   `.artifacts/live/live-chart.png`. Read the check count from
   `apps/playground/.artifacts/live-report.json`, not from memory.

4. Headless control (the view gained two nodes; no check changed):

   ```sh
   nub apps/playground/dist/smoke/run.js --only chart-svg
   ```

   Expected: `1/1`, exit `0`, **52 checks**.

5. Gates:

   ```sh
   nub run check && nub run lint && nub run test
   ```

   Expected: all exit `0`; playground **442**, testing **68**, components
   **308**, primitives **282**, tokens **196**, tw **103**, icons **19**,
   docs **7**.

6. End-of-task headless registry (a shared view was touched):

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `106/106`, **3824 checks**, 65 capabilities, exit `0`.

7. Mutation proofs — one at a time, rebuild, run `--only live-chart`, observe
   `exit 1` and the named check, then revert:

   - **M1**: `chart-tint-1`'s `color` → `theme.colors.destructive`
     (`the second sourced svg is tinted independently` fails).
   - **M2**: swap the two tint expectations in the live scenario
     (the primary check fails with `#3bc97fff`).
   - **M3**: delete the second opaque rect from `CHART_IMAGE_SVG`
     (`the image keeps a second opaque fill` fails).
   - **M4**: make the linear stops constant
     (`stop-opacity="1"` on the second stop, or the same colour at both ends)
     (`the linear gradient has faded at the bottom` fails).
   - **M5**: delete the radial `<rect … url(#glow)>`
     (`the radial gradient's centre is its stop colour` fails).
   - **M6**: widen the radial rect to the whole image
     (`the radial gradient does not cover the left edge` fails).

   After the reverts, rebuild and confirm **68** green again. If a mutation
   passes, record it as a null result with the sampled colour; do not weaken
   the check to force a failure.

8. Write the ledgers (§3.3–§3.6), commit and push:

   ```sh
   git add apps/playground/src/scenarios/chart.tsx \
           apps/playground/src/live/scenarios.tsx \
           COMPONENTS.md TODO.md apps/playground/README.md \
           .agents/slop/plans/697-chart-colour-pixels.md \
           .agents/slop/plans/README.md
   git commit -m "feat(playground): sample the chart's colour contract in a live window (697)"
   git push origin agent/playground
   ```

## 5. STOP conditions

- `git status --porcelain` is non-empty before editing: STOP and commit the plan
  first.
- The controls are not `live-chart` **40** and `chart-svg` **52**: STOP; the
  plan's delta is wrong.
- A tint sample is not its exact token, or a fill is not its exact literal:
  **STOP and record the measured colour**. A wrong value is a finding about the
  renderer (for example, a different tint source or a colour-managed image),
  not permission to use a loose tolerance.
- A gradient sample is inside no painted pixel (`pixelAtPoint` fails): STOP and
  report the image box; do not scroll or move the view.
- The new tint row pushes the image or the tint boxes outside the window: STOP
  and report the bounds. Do not shrink an existing element to make room.
- Any other scenario check fails, or the headless registry is not `106/106` /
  `3824`: STOP; this plan changes one live scenario, one probe view and the
  ledgers.
- Do not raise `TOLERANCE`, do not sample an edge, do not change the theme, and
  do not add a screenshot-only check.
- Never push to `master`; never force-push.

## 6. Test plan — what the new checks can catch

| It catches | How |
| ---------- | --- |
| a sourced `<svg>` that stops being tinted by `color` | two solid masks sampled against exact tokens; M1/M2 fail |
| a tint that comes from the wrong element (parent/background) | two boxes with different tokens in one frame |
| an image path that drops a fill or paints the wrong one | two opaque rectangles sampled 12 px inside their edges; M3 fails |
| a gradient that stops being a gradient | the linear top/bottom pair; M4 fails |
| a gradient that collapses to one stop or one colour | the radial centre is exact; M5/M6 fail |
| an image route falling back to a single-colour mask | the tints and the multi-fill image are sampled in the same frame |
| a device-scale or decode regression | the shared `frames.ts` sampler plus `pixel-colour`/`live-pixel-colour`/`live-theme` guard the scale |
| a clipped or unmounted box | `pixelAtPoint`/`pixelAtId` read bounds first and fail by name |

The checks are channel comparisons on the frame the runtime wrote, not a
screenshot diff. The PNG remains the run artifact.

## 7. Results

Landed 2026-10-19 on `agent/playground`, darwin-x64 with the release-tag
binding. The plan commit is `53d846dd`; the implementation head is the commit
carrying this section.

**Controls** (before the change): `live-chart` **1/1, 40 checks**; `chart-svg`
**1/1, 52 checks**. Both matched the plan.

**The change.** Two `40 × 40` solid sourced masks (`chart-tint-0`,
`chart-tint-1`) were added to the probe view, and `liveChart.steps` replaced its
bare `ctx.host.screenshot(...)` with `captureLive` + samples: the two masks
through `expectPixel`, the image's two fills and the radial centre through
`expectColour`, and the linear top/bottom plus the radial left edge through
dominance predicates. `palettes` and `expectColour`/`pixelAtPoint` joined the
existing imports.

**Measured count.** `live-chart` **40 → 71 checks** (the plan predicted 68; the
run is the authority). The delta is 31: two `expectPixel` at 5 checks each
(parse + bounds + pixel + colour), three fills at 4, and three dominance checks
at 3. Green on the first run, `exit 0`, with one
`.artifacts/live/live-chart.png` (170,811 bytes). The headless control stayed
**52** checks — the two new nodes changed no headless check, which is what the
plan requires.

**Gates.** `nub run check`/`lint`/`test` all `exit 0` with playground **442**,
testing **68**, components **308**, primitives **282**, tokens **196**, tw
**103**, icons **19**, docs **7**. End-of-task headless registry: **106/106**,
**3824 checks**, 65 capabilities, `exit 0`.

**Mutation proofs** (each rebuilt, ran `--only live-chart`, observed `exit 1`,
then reverted; 71 green again afterwards):

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | `chart-tint-1`'s `color` → `destructive` | `the second sourced svg is tinted independently: expected #3bc97fff, got #ff6b6bff` |
| M2 | swap the two tint expectations | `a sourced svg is painted in its own colour: expected #3bc97fff, got #a7a9ffff` |
| M3 | delete the `#30a46c` rect | `the image keeps a second opaque fill: expected #30a46cff, got #2b4079ff` |
| M4 | second linear stop `stop-opacity="1"` | `the linear gradient has faded at the bottom: expected true, got false` |
| M5 | delete the radial `<rect … url(#glow)>` | `the radial gradient's centre is its stop colour: expected #ffd166ff, got #30488cff` |
| M6 | widen the radial rect to the whole image | `the radial gradient's centre is its stop colour: expected #ffd166ff, got #e5c06bff` |

M6 is caught, but by the **earlier** radial-centre sample rather than the named
left-edge check: widening the rect moves the gradient's centre, so the centre
sample stops being the stop colour first. A sixth variant isolated the
left-edge check honestly — the radial rect widened only to `x = 150`, `w = 190`
with an opaque final stop (so the centre stays exact and the linear top/bottom
stay intact) — and failed `the radial gradient does not cover the left edge:
expected true, got false`, `exit 1`. The left-edge check therefore can fail.

**Ledger corrections.** Beyond §3.3–§3.6, three stale claims in the plan's blast
radius were fixed because this plan falsifies them directly: the `chart-svg`
narrative in `COMPONENTS.md` ("no pixel readback, so exact colour and gradient
stops are screenshot evidence"), the plan-180 README section's closing "the
limit is unchanged", and the native-content README limit that said a
screenshot is "the only visual evidence, never an assertion". The plan-`690`
truth fixes (§3.3 Image preview row, §3.4.3 `<img>` sources) were still
outstanding and are now landed too.

**Not run.** The full live registry is the merge gate; the expected total is
`2545 + 31 = 2576` checks for 95 ids.


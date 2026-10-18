# 518 — Tier 5 feasibility: rendering a QR code — module grid, SVG mask and image

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | D→E (feasibility probe) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `161` (content surfaces), `180` (svg/img colour), `302` (retained-node cost) |
| Closes | `COMPONENTS.md` Tier 5 → *QR code* (currently `todo`, no evidence) |

## 1. Question

`COMPONENTS.md` says a QR code can be "a grid of `div`s or one `<svg>`; both
are provided" and that "the encoder is ours (dependency not yet chosen)". That is
a plausible claim, not a measured one. A QR component has three separable
rendering questions and one cost question:

1. **Module grid** — can a 21 × 21 matrix be a `div` per dark module, with an
   exact quiet zone, exact module geometry, a painted hit target per module and
   the expected token colours?
2. **One `<svg>` layer** — plan `180` measured that a sourced `<svg>` is an alpha
   mask tinted by the element's `color`. Is that usable for a matrix (one node,
   one colour, background from a sibling), and does the mask honour a path built
   from hundreds of sub-paths at module scale?
3. **One `<img>`** — plan `180` measured that an SVG data URL on `<img>` goes
   through the full-colour image path. Is that the honest route for a two-colour
   code (white quiet zone + black modules) that stays scannable in both themes?
4. **Cost** — how many host nodes does each route retain, and how does that
   scale from version 1 (21 × 21) to version 4 (33 × 33)? Plan `302` measured
   **3 host nodes per virtual-list row**, so a 177 × 177 version-40 code as
   `div`s would be ~94,000 retained nodes. That is the decision the probe must
   inform.

This probe does **not** choose or implement the encoder. It renders two
pre-generated, provenance-stated matrices and measures the renderer contract.
Encoding is out of scope and is recorded as such.

## 2. Source evidence (confirm in the run, do not assume)

- `packages/native/src/custom_elements/img.rs` → `<svg>` supports exactly `src`
  and `source`, builds `gpui::svg().data(bytes).text_color(tint)`, and never
  appends children (plan `180` §2).
- `zed/crates/gpui/src/svg_renderer.rs` → the SVG raster keeps only alpha, so
  every fill in one document paints in one colour.
- `packages/native/src/custom_elements/img.rs` + GPUI's image path → an `<img>`
  whose `src` is an SVG data URL becomes a full-colour `RenderImage` (plan
  `180` §8).
- `getRetainedElementCount` counts host elements only; a bare `div` is one, a
  `<svg>`/`<img>` is one (plan `302` §2).

If the run contradicts any of these, **STOP** and record the measurement before
changing this plan (§7).

## 3. Design

New capability `qr`; new scenario `qr-code`; new pure model
`apps/playground/src/scenarios/qr-layout.ts` with its test. The model is the
reusable half a future `QRCode` component would own: matrix → module boxes →
SVG path → SVG document → data URL.

### 3.1 Fixtures (provenance)

Two matrices, generated **once, offline** by Python `qrcode` 7.4.2 with error
correction M (byte mode), and committed as string rows:

| Fixture | Payload | Version | Modules | Dark | Provenance |
| ------- | ------- | ------- | ------- | ---- | ---------- |
| `QR_V1` | `GPUixUI` | 1 | 21 × 21 | 226 | `qrcode.QRCode(ERROR_CORRECT_M).add_data("GPUixUI")` |
| `QR_V4` | `https://gpuixui.dev/docs/components/qr-code` | 4 | 33 × 33 | 591 | same, version chosen by `make(fit=True)` |

The fixture is the encoder's output, not an assertion about the encoder. The
scenario comment states the provenance and that **scannability is not asserted**
(no decoder on this host; no pixel readback).

### 3.2 View

`apps/playground/src/scenarios/qr-code.tsx`, one `useState` mode
(`div` | `svg` | `img`) and one `useState` version (`v1` | `v4`), under the
theme provider the runner mounts (dark).

Layout, top to bottom (width 520):

1. Controls: `qr-mode-div`, `qr-mode-svg`, `qr-mode-img`, `qr-version`
   (`v4` ↔ `v1`), each a `role="button"` pressable.
2. `qr-state` readout: `mode=<m> version=<v> dark=<n> size=<px> hit=<none|rNcM>`.
3. `qr-hit` readout: `hit=<none|rNcM>` written by a module press.
4. `qr-root` (`role="img"`, `aria-id="qr-root"`, `aria-label="QR code for
   <payload>"`) containing `qr-matrix` — a fixed-size box whose background is
   `theme.colors.background`:
   - **div mode**: one absolutely positioned `div` per dark module, `testId`
     `qr-dot-<row>-<col>`, size `module`, `backgroundColor`
     `theme.colors.foreground`, `onClick` writes `r<row>c<col>`;
   - **svg mode**: one `<svg source={svgSource(...)}>` sized to the box, `color`
     `theme.colors.foreground`;
   - **img mode**: one `<img src={dataUrl(...)}>` sized to the box; its document
     carries a **white** background rect and black modules, so it is two-colour
     and theme-independent (the QR stays scannable in the dark palette).
5. Screenshot `apps/playground/.artifacts/screenshots/qr-code.png`.

Specs: v1 `module: 6`, `quiet: 4` → box `174`; v4 `module: 4`, `quiet: 4` →
box `164`.

### 3.3 Assertions

| # | Check | Why it matters |
| - | ----- | -------------- |
| 1 | `qr-matrix` paints its declared 174 × 174 box | the matrix has a resolved size |
| 2 | `qr-dot-0-0` is 6 × 6 at (24, 24) | quiet zone (4 modules) + module size are exact |
| 3 | `qr-dot-0-1` starts at x 30; `qr-dot-0-6` at x 60; `qr-dot-6-0` at y 60; `qr-dot-3-3` at (42, 42) | the module origin rule is `(index + quiet) × module` on both axes |
| 4 | a light module (`qr-dot-1-1`) has no node and no bounds | only dark modules are rendered |
| 5 | `qr-dot-0-0` paints `theme.colors.foreground`; the matrix paints `theme.colors.background` | module and quiet-zone colour are tokens |
| 6 | clicking `qr-dot-3-3` writes `hit=r3c3` | a module is a real hit target (a logo overlay / hover needs one) |
| 7 | `dark=226` in the readout; it becomes `591` after the version toggle | the fixture and the model agree, and the toggle really swaps |
| 8 | v4's box is 164 × 164 and `qr-dot-0-0` is 4 × 4 at (16, 16) | the same rule holds at a second version |
| 9 | div mode retains exactly `dark − 1` more host nodes than svg mode | one node per module; the cost claim is exact |
| 10 | svg mode and img mode retain the same count | both are a single host node |
| 11 | v1 → v4 in div mode grows retention by exactly `591 − 226` | retention scales with the number of dark modules |
| 12 | the svg node is type `svg`, paints 174 × 174, `color` = `foreground` | the mask-tinted route works at matrix scale |
| 13 | the svg mode paints no module text | the mask is pixels, not text |
| 14 | the img node is type `img`, paints 174 × 174, and adds no `img: load failed`/`img: no src` | the data-URL route is accepted and painted |
| 15 | `qr-root` is an AccessKit `Image` named for its payload, found by `aria-id` | the matrix is one labelled node for assistive technology |
| 16 | switching back to div mode restores the original retained count | the modes mount/unmount cleanly (no residue) |

Checks 9, 10 and 11 are the cost model; they are exact, not approximate.

### 3.4 Pure model

`qr-layout.ts` exports:

- `darkModules(matrix)` — the `{ row, col }` of every `#`;
- `moduleOrigin(row, col, spec)` — `{ x, y, size }` with the quiet zone;
- `matrixSize(matrix, spec)` — the painted box in pixels;
- `modulePath(matrix, spec)` — one `M…h…v…h-…z` command per dark module, in
  pixel units;
- `svgSource(matrix, spec, background)` — a document with an optional background
  rect and a black path (the tint is the element's `color`);
- `dataUrl(svg)` — the percent-encoded `data:image/svg+xml` URL.

`qr-layout.test.ts` (unit, no renderer):

| Check | Fails when |
| ----- | ---------- |
| `darkModules` counts 226 (v1) and 591 (v4) and each row is square | a fixture row is corrupted or the `#` filter is wrong |
| `moduleOrigin(0, 0, { module: 6, quiet: 4 })` is `(24, 24, 6)` and `(3, 3)` is `(42, 42, 6)` | the quiet zone is dropped or the axis order is swapped |
| `matrixSize` is 174 (v1) and 164 (v4) | the quiet zone or module size is misapplied |
| `modulePath` has exactly one `M` per dark module and starts at the first module | the path builder drops or duplicates a module |
| `svgSource` declares the pixel size, contains a `<path>`, and includes a background rect only when asked | the two-colour image route loses its quiet zone |
| `dataUrl` starts with `data:image/svg+xml` and encodes `<` as `%3C` | the URL is not percent-encoded |

## 4. Files

```
packages/testing/src/smoke.ts                        EDIT  CAPABILITIES += "qr"
apps/playground/src/scenarios/qr-layout.ts           NEW   the pure model
apps/playground/src/scenarios/qr-layout.test.ts      NEW   model tests
apps/playground/src/scenarios/qr-code.tsx            NEW   the scenario
apps/playground/src/scenarios/index.ts               EDIT  import + registry + PROBE_CAPABILITIES
apps/playground/README.md                            EDIT  structure, evidence row, scenario count
COMPONENTS.md                                        EDIT  Tier 5 QR code row with the measured facts
TODO.md                                              EDIT  tick the probe
PLAN.md                                              EDIT  D61 — the QR rendering recipe
.agents/slop/plans/README.md                         EDIT  index this plan; record the number
.agents/slop/plans/518-qr-code-rendering.md          EDIT  §8 measured result
```

No change to `packages/testing/src/native.ts`: `elementType`, `bounds`,
`paintedStyle`, `a11y`, `retainedElements` and `click` already exist.

## 5. Commands and expected results

```sh
nub run --filter playground test
# -> the pure model tests and the existing suite pass

nub run --filter playground build
# -> tsc exits 0

nub apps/playground/dist/smoke/run.js --only qr-code
# -> "1/1 scenarios passed", qr=verified, exit 0

nub apps/playground/dist/smoke/run.js --all
# -> 93/93 scenarios passed, capabilities include qr=verified, exit 0,
#    .artifacts/screenshots/qr-code.png written

nub run check && nub run lint && nub run test
# -> all green
```

## 6. Two directions

Apply each mutation temporarily, run `--only qr-code`, name the failing check,
restore the file. At least three are recorded in §8:

- drop the quiet zone from `moduleOrigin` → checks 2/3 fail by 24 px;
- render every module (dark and light) → check 4 fails, and the retention delta
  grows to `441 − 1`;
- make the module click a no-op → check 6 fails (`hit=none`);
- remove the `background` rect from the img document → the image still paints
  (a transparent quiet zone is legal), so this is *not* a check; the screenshot
  is the only evidence for the white quiet zone. Record it as such.
- replace `role="img"` with no role → check 15 fails (the node disappears, as
  plan `180` measured).

## 7. STOP conditions

- **Absolutely positioned module `div`s do not paint or hit-test** (bounds
  missing, click lands on the container) → record it; the honest fallback is one
  `<svg>`/`<img>` plus a hit-testable overlay, and module addressability is
  dropped from the claim.
- **The retention delta is not `dark − 1`** → the host count includes nodes this
  probe does not model; record the measured numbers and rewrite checks 9–11 as
  the delta actually observed. Never keep an exact check that did not hold.
- **A sourced `<svg>` ignores the pixel path and paints nothing / the wrong box**
  → record it; the img route becomes the only vector route and the svg checks are
  inverted to the measured behaviour.
- **`<img>` rejects the data URL** → record the fallback; the svg mask route
  remains, with a themed quiet zone and the scannability limitation stated.
- **The a11y node is missing** → record which of `role`, `aria-id` or
  `aria-label` was responsible (plan `180` measured `role` is required).
- **A pixel claim cannot be asserted** → do not invent a check; put the fact in
  the screenshot evidence paragraph.

## 8. Measured result

`qr-code` is **53 checks, exit 0**, capability `qr=verified`; the pure model has
1 test file (348 playground tests total). The screenshot is
`.artifacts/screenshots/qr-code.png`.

### 8.1 The three routes (version 1, 21 × 21, 226 dark modules)

| Route | Nodes retained | Painted | Addressable |
| ----- | -------------- | ------- | ----------- |
| `div` per dark module | **246** (225 more than one node) | each module `6 × 6`, `(index + 4) × 6` from the matrix origin, `foreground` on the `background` quiet zone | every module is a hit target (`hit=r3c3`) |
| one `<svg source>` | **21** | `174 × 174`, `color = foreground` | one node; no module children |
| one `<img src=data:…>` | **21** | `174 × 174`, no `img: load failed` / `img: no src` | one node |

Version 4 (33 × 33, 591 dark) in `div` mode retains **611** and paints a
`164 × 164` box with `4 × 4` modules 16 px in. The deltas are exact:
`246 − 21 = 226 − 1`, and `611 − 246 = 591 − 226`. **One retained host node per
dark module plus the matrix container the single-node routes also pay for.**
At version 40 (177 × 177, up to 15,000 dark modules) a `div` grid is tens of
thousands of nodes; the vector routes are the only sane default for large codes.

### 8.2 What transfers

- The quiet zone is part of the geometry, not the encoder: `(index + quiet) × module`
  held on both axes and at both versions; a light module has no node at all.
- The matrix is one `Image` accessibility node named for the payload
  (`role="img"` + `aria-label`); `role` is required (plan `180`).
- Mode and version switches remount cleanly: returning to `div` restores the
  exact node count, so a component can swap routes without residue.
- A sourced `<svg>` remains an **alpha mask tinted by `color`**, so the quiet zone
  of that route is the container's background; only the `<img>` route bakes a
  white quiet zone into a two-colour document.
- Scannability is **not** asserted: no decoder on this host and no pixel
  readback. The fixtures are real encoder output (Python `qrcode` 7.4.2, EC M)
  and their counts are pinned by the unit tests, but "it scans" is a visual
  claim, not a check.

### 8.3 Two directions (each run with `--only qr-code`, restored after)

| Mutation | Result |
| -------- | ------ |
| drop the quiet zone from `moduleOrigin` | **exit 1** — `the quiet zone offsets x: expected 24 ± 0.5, got 0` |
| render every module, not only the dark ones | **exit 1** — `a light module has no node: expected "none", got "div"` |
| make the module click a no-op | **exit 1** — `a module is a real hit target: expected "hit=r3c3", got "hit=none"` |
| remove `role="img"` from the root | **exit 1** — `the QR is an accessibility node: expected a value, got none` |

The white background rect is **not** a check (a transparent quiet zone is legal
and the image still paints); the screenshot is its only evidence, as the plan
predicted.

### 8.4 Limits

The probe renders committed matrices; **no encoder is implemented or chosen**.
There is no live-window twin: plans `189`/`197` already prove that `<svg>`/`<img>`
paint in a window, and the `qr-code` claims here are geometry, retention, colour
and a11y, which the headless report exposes and the live tree does not.

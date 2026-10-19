# 586 — The `<img>` source contract: bytes are assertable, path and URL loads are screenshot-only

| Field | Value |
| ----- | ----- |
| Status | landed — §9 records the measured sources, counts and mutation proofs |
| Phase | D/E (content surfaces; honesty pass) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `161`, `189`, `197`, `529`, `577` |
| Feeds | `COMPONENTS.md` **Image preview**, any future image-preview component, docs capture |

## 1. The defect this plan fixes

`COMPONENTS.md` claims:

> Image preview | `<img>` (path, data URL, http(s)) | **verified** (runtime:
> `native-surfaces`, `live-content`)

The registry only ever mounts **data URLs** (`surfaces.tsx`'s `ONE_PIXEL_PNG`,
`INVALID_IMAGE`; `qr-code`; `chart`; `crop`; `media` all build data URLs) plus
`setImagePixels` through the ref. **Neither a file-path `src`, an `http(s)`
`src`, nor the documented `setImage(bytes)` path has ever run in the suite.**
That is an unearned `verified` claim — exactly what AGENTS.md forbids.

This plan measures all four source kinds, keeps the assertable facts, and
narrows the ledger to what the harness can actually observe.

## 2. Reconnaissance (measured 2026-10-19, not yet in the repo)

Scratch probes (`.agents/slop/scratch/image-source-probe.mjs`,
`image-live-probe.mjs`, `set-image-probe.mjs`, `set-image-live-probe.mjs`) on
the pinned 0.10.0 release-tag binding:

| Source | Headless (`TestRenderer`) | Live window |
| ------ | ------------------------- | ----------- |
| `src` = absolute file path (1 × 1 red PNG) | box `64 × 64`, **no painted text**, no load | box `64 × 64`; the screenshot shows the red bitmap; **no painted text** |
| `src` = missing file path | box `64 × 64`, **no painted text** (loader never resolves) | screenshot shows `img: load failed`, but `getPaintedText()` returns **only** the React `text` nodes; the fallback is absent from the tree too |
| `src` = `https://127.0.0.1:1/none.png` (refused) | not probed (avoid a socket in the headless suite) | screenshot shows `img: load failed`; **absent from `getPaintedText()`**; gpui logs `asset_cache … Connection refused` to stderr |
| `setImage(valid PNG bytes)` through `ImgInstance` | `ok`; box `64 × 64`; **no fallback text** | same: `ok`, `64 × 64`, no fallback |
| `setImage(garbage bytes)` | **throws** `Error: unrecognized image format`; node keeps `img: no src`, box `62 × 62` | same throw and same fallback box |

Two causes, both in the pinned runtime:

- `ImgSource::Invalid` (an undecodable **data URL**) renders the explicit
  `img_fallback(...)` surface, whose `chrome_text` **is** collected by
  `getPaintedText` — that is the one text signal the current suite asserts.
- `gpui::img(path|uri).with_fallback(...)` is a **plain GPUI fallback**, not a
  retained text node and not part of the React text pass, so neither
  `getPaintedText()` nor the automation tree reports it. There is also **no
  `onError`/load event**, so an app cannot learn that a path/URL failed.

Consequence: **bytes are assertable; path/URL are screenshot-only.** The honest
alternative for a consumer is to read the bytes (`FileSystem`) and call
`setImage`, validating them itself; or to stat the path before rendering.

## 3. Files to change

### 3.1 New fixture

`apps/playground/fixtures/one-pixel.png` — the same 70-byte, 1 × 1 RGBA red
pixel the data URL already encodes (verified with `file`: `PNG image data, 1 x
1, 8-bit/color RGBA, non-interlaced`). Commit it (binary fixtures are normal);
do **not** reference `apps/docs/public/*` (the native runtime must not depend
on the docs app).

### 3.2 `apps/playground/src/scenarios/surfaces.tsx`

- Rename the base64 to `ONE_PIXEL_PNG_BASE64`; derive:
  - `ONE_PIXEL_PNG = \`data:image/png;base64,${ONE_PIXEL_PNG_BASE64}\``
  - `ONE_PIXEL_PNG_BYTES = Schema.decodeUnknownSync(Schema.Uint8ArrayFromBase64)(ONE_PIXEL_PNG_BASE64)`
  - `ONE_PIXEL_PNG_PATH = fileURLToPath(new URL("../../fixtures/one-pixel.png", import.meta.url))`
    (works from `src/scenarios/` **and** `dist/scenarios/`: both resolve to
    `apps/playground/fixtures/`).
- Add a `BytesImage` component: an `<img>` with **no `src`**, a `ref`, a
  `useLayoutEffect` that calls `image.current?.setImage(bytes)` inside
  `try/catch`, and a `<text testId="{testId}-state">` readout of
  `"ok"` or `"error: <message>"`. Two instances:
  `surface-img-bytes` (valid) and `surface-img-bytes-bad` (garbage).
- Add `surface-img-path` (`src` = the fixture path) and
  `surface-img-path-missing` (`src` = `<fixture dir>/does-not-exist.png`).
- Add an optional prop to `SurfacesProbe`: `liveSources?: boolean`. When true,
  mount `surface-img-url-refused` (`src = "https://127.0.0.1:1/none.png"`).
  The default is false, so the **headless** suite opens no socket and the
  playground sidebar does not either.
- Every new node keeps the declared `width: 96, height: 64` (except the bytes
  pair, which use `64 × 64` to mirror the measured facts).

### 3.3 `native-surfaces` steps (headless)

Add, after the existing `surface-img-live` block:

- `surface-img-bytes` is `img`, box `64 × 64` (±0.5), state readout `ok`.
- `surface-img-bytes-bad` is `img`, box `62 × 62` (±0.5) (the fallback border
  loses 1 px per axis, the measured 0.10.0 tracker rule), state contains
  `unrecognized image format`, and the painted fallback is `img: no src`.
- The **counts** after the additions: `img: no src` = **2** (the empty `src`
  node + the garbage node), `img: load failed` = **1** (the invalid data URL).
  The valid bytes node contributes neither — that is the positive assertion.
- `surface-img-path` and `surface-img-path-missing` are `img`, keep their
  `64 × 64`/`96 × 64` boxes, and add **no** painted fallback text. The check
  labels must say this is the *measured* limit: "the offscreen runtime paints no
  text for a path source (the loader does not settle)".
- Do **not** attempt a URL in the headless view.

### 3.4 `live-content` steps

`liveContent.view` becomes `() => <SurfacesProbe liveSources />` (or an
equivalent wrapper) so the URL case exists only in the window. Add the same
bytes/path checks (live boxes are exact, tolerance `1`), plus:

- `surface-img-url-refused` has bounds and adds no `getPaintedText` entry —
  label it as the measured limit, not as a load success.
- Keep the existing final `screenshot` call; the capture is the visual evidence
  for the path/URL fallbacks. **No assertion may read the PNG.**

Counts live: `img: no src` = 2, `img: load failed` = 1 (the refused URL's
fallback is invisible to `getPaintedText`, which is the point).

### 3.5 `COMPONENTS.md`

- **Image preview** row: keep `done | yes` for the `<img>` element, but state:
  data URL **verified**; ref **bytes (`setImage`)** verified; `setImagePixels`
  verified; **path / http(s) are screenshot evidence only** — the runtime loads
  them, but the fallback text is not in `getPaintedText`/the tree and there is
  no load/error event; headless never settles the loader. App rule: read bytes
  and validate them, or stat the path first.
- Do not change the `content` capability row beyond citing the same two ids (it
  already lists `native-surfaces`, `live-content`).

### 3.6 `apps/playground/README.md`

Extend the "Native content surfaces" section with a four-row table: data URL,
bytes, path, http(s) — what is asserted, what is only visual, and the app rule.

### 3.7 `TODO.md`

- Add and tick this task with the exact focused ids run and check counts.
- Add a cross-team row for any future image-preview component (owner
  `components`/`primitives`): it must own its error state (no runtime load
  event) and must not claim path/URL verification from this suite.

## 4. Commands and expected results

Run from the repo root, in this order:

1. `nub run --filter playground check-types` → exit `0`.
2. `nub run --filter playground build` → exit `0`.
3. `nub apps/playground/dist/smoke/run.js --only native-surfaces` →
   `1/1 scenarios passed · capabilities: content=verified`, exit `0`.
4. `nub apps/playground/dist/live/run.js --only live-content` →
   `1/1 scenarios passed`, exit `0`, one PNG written under
   `apps/playground/.artifacts/live/live-content.png`.
5. `nub run --filter playground test` → exit `0`.
6. End-of-task gate: `nub run check`, `nub run lint`, `nub run test` → exit `0`.

## 5. Test plan (the checks must be able to fail)

| # | Lever (mutate, observe exit `1`, revert) | Expected failure |
| - | ---------------------------------------- | ---------------- |
| M1 | delete the `setImage(bytes)` call in `BytesImage` | valid bytes keep `img: no src` → `img: no src` count `3`, expected `2` |
| M2 | pass `GARBAGE` instead of the PNG to the valid instance | state readout not `ok`; bytes box is the fallback's `62 × 62` |
| M3 | assert the missing path paints `img: load failed` in `getPaintedText` | the count stays `1` — the assertion fails, and the limit is recorded |
| M4 | change the declared bytes box to `32 × 32` | measured `64 × 64` fails |
| M5 | mount the URL node headless (drop the `liveSources` gate) | the snapshot/list check or the socket-free expectation fails (recorded, reverted) |

Two-direction evidence: each mutation observed failing and reverted; the
focused runs above are the passing direction. No `--all` run while iterating.

## 6. STOP conditions

- **STOP** if `setImage(valid bytes)` paints a fallback in either harness: the
  reconnaissance says it does not, so the premise is wrong — record the
  measurement and re-plan the positive half.
- **STOP** if the headless run does not exit (a background path/URL loader
  keeps the event loop alive). Make the path nodes **live-only** and record why.
- **STOP** if the live `getPaintedText()` *does* contain the path/URL fallback:
  then a stronger assertion is possible; update the plan's §2 and use it.
- **STOP** if a fixture path resolves differently from `src/` and `dist/`;
  resolve it at runtime through a helper with a unit test rather than guessing.

## 7. Acceptance

- `native-surfaces` and `live-content` assert the bytes contract (valid + the
  thrown garbage) and the measured path/URL limit.
- `COMPONENTS.md` no longer claims path/http(s) are verified; it names the
  evidence and the app-owned alternative.
- The README documents the four `<img>` sources.
- The five mutations are recorded in §9 and reverted.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Not in scope

- Implementing an image-preview component (owner: `components`).
- Retrying the reader's own URL policy, HTTP auth, caching or cancellation.
- Pixel readback; D24 stands (screenshots are artifacts, never assertions).
- `objectFit` (already measured by `crop-area`, plan `385`).

## 9. Measured outcome (landed 2026-10-19)

Focused ids run: `native-surfaces`, `live-content` — each twice, exit `0`
(headless `1/1`, live `1/1`). Check counts: `native-surfaces` **61**,
`live-content` **44** (`live-report.json`, 44/44 passed). The full headless
suite then ran the whole registry: **103/103**, **3653 checks**, 64
capabilities, exit `0` (the ledger total moved from 3632).

| Source | Headless | Live |
| ------ | -------- | ---- |
| data URL | box `64 × 64`, no fallback | box `64 × 64`, no fallback |
| `setImage(valid PNG bytes)` | readout `ok`, box `48 × 48`, no `img: no src` | same |
| `setImage([1,2,3,4])` | throw `unrecognized image format`, `img: no src`, box `46 × 46` | same |
| absolute file path | box `48 × 48`, **no painted text** | screenshot shows the red bitmap; **no painted text** |
| missing file path | box `48 × 48`, **no painted text** | screenshot shows `img: load failed`; absent from `getPaintedText()` and the tree |
| refused `https://127.0.0.1:1/none.png` | not mounted (no socket) | screenshot shows `img: load failed`; absent from `getPaintedText()`; GPUix logs `asset_cache … Connection refused` |

Painted-text totals: `img: no src` = **2** (the empty `src` node and the failed
byte upload), `img: load failed` = **1** (the invalid data URL). The valid byte
upload contributes neither; the path/URL fallbacks contribute nothing because
they are not retained text.

**Mutation proofs (each observed exit `1`, then reverted):**

| # | Lever | Observed failure |
| - | ----- | ---------------- |
| M1 | remove the `setImage(bytes)` call | `img: no src` expected `2`, got `3` |
| M2 | pass the garbage buffer to the valid instance | count `3` (and the `ok` readout would change) |
| M3 | assert the missing path paints `img: load failed` (`2`) | expected `2`, got `1` — confirms the limit |
| M4 | expect the bytes box at `32` instead of `48` | expected `32 ± 0.5`, got `48` |
| M5 | drop `liveSources` from the live view | `surface-img-url-refused is painted: expected a value, got none` (live) |

**Ledger:** `COMPONENTS.md` no longer claims path/http(s) are verified; the
Image preview row records data URL + bytes verified and path/URL screenshot-only,
with the app-owned error-state rule. `apps/playground/README.md` has the
four-source table. The cross-team image-preview note is in `TODO.md`.


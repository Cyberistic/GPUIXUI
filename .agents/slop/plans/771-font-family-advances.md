# 771 — The typeface reaches the frame: `fontFamily`, the platform mono face and the silent fallback

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground workstream |
| Depends on | `150`, `170`, `171`, `197`, `342`, `529`, `591`, `654`, `674` |
| Feeds | the `typography` capability row; the platform type styles (macOS / Linux / Windows) and the `tokens` `registerFonts` plan `052` |

## 1. Goal and the gap being guarded

The platform type styles are a first-class mission requirement: macOS, Linux and
Windows variants each name a real family in `packages/tokens/src/platforms.ts`.
What the suite knows about them today is **authored style**, not type:

- `theme-platform` (`themeTypeAndShadow`) reads the family back from the
  runtime's **style report** — `paintedStyle(...).fontFamily`;
- `live-theme-platform` asserts that the *readout* and the *boxes* follow the
  switch, and plan `654` records that the resolved family **stays headless**
  because the live tree has no `style` and a missing host family falls back
  silently;
- `typography-layout` proves `fontSize`, `lineHeight` and `fontWeight` reach the
  paint (a bold run is measurably wider), but never varies `fontFamily`.

So a runtime that accepted `fontFamily` in the style payload and then shaped the
text with the default face anyway would pass **every** check in the suite, while
the macOS / Linux / Windows type variants were cosmetic. That is the same class
of gap plans `736`, `745`, `754` and `761` closed for the other style families:
the authored report is not the frame.

This probe makes the typeface a measured thing. The contract it asserts:

- the default face is **proportional** — eight `W` glyphs advance further than
  eight `i` glyphs;
- the platform table's mono family (`systemMonoFamily`: `Menlo` on macOS,
  `DejaVu Sans Mono` on Linux, `Consolas` on Windows) is **actually
  monospaced** — the two eight-glyph runs advance the same;
- the **same phrase** advances differently in the two faces, so changing
  `fontFamily` changes the shaped glyphs, not only the reported style;
- a family the host does not have paints at the **default face's** advance (a
  silent fallback) and is not the mono face.

### The registration finding (recorded, not asserted)

A separate reconnaissance question belongs in the same record because it is the
other half of "can this identity travel?": **the pinned runtime has no font
registration API**.

```sh
grep -rn "registerFont" node_modules/.store/@gpuix+native@0.10.0/node_modules/@gpuix/native/index.d.ts \
  node_modules/.store/@gpuix+native@0.10.0/node_modules/@gpuix/native/index.js   # no output
```

and at runtime, from the worktree root:

```sh
nub apps/playground/.artifacts/fontprobe.mjs   # both prototype method lists
# GpuixRenderer      font []   (55 methods)
# TestGpuixRenderer  font []   (57 methods)
```

`registerFont` exists in the reference clone's **main** (`packages/native/src/
renderer.rs:2339`, post-0.10.0) but not in the published 0.10.0 typings, JS or
either renderer. Consequence, documented in §11: on the pinned release a
consumer can only use **OS-installed** families; a bundled brand face is not
possible, and tokens plan `052`'s native half is blocked by the **pinned API**,
not by B1. This plan records that; it does not change `packages/tokens`.

## 2. Files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/font-metrics.ts` | **create** — the pure model: run constants, `runWidths`, `uniform`, `proportional`, `differs`, `same`, and the fixture guard |
| `apps/playground/src/scenarios/font-metrics.test.ts` | **create** — unit tests (§6) |
| `apps/playground/src/scenarios/font-family.tsx` | **create** — the view plus `fontFamilyScenario` and `fontFamilyLiveScenario` |
| `apps/playground/src/scenarios/index.ts` | import and register `fontFamilyScenario` (after `typographyScenario`) |
| `apps/playground/src/live/scenarios.tsx` | import `fontFamilyLiveScenario` and append it to the live array |
| `apps/playground/README.md` | the `font-family` / `live-font-family` row in the live table and a short "Typefaces" section with the registration evidence |
| `COMPONENTS.md` | `Text / typography` row gains the two ids and the registration limitation |
| `TODO.md` | tick this task; add one cross-team row (`tokens`, plan `052` re-scope) |
| `.agents/slop/plans/README.md` | this plan's row |

Nothing under `packages/*` changes.

## 3. The fixtures (one static view, no interaction)

One column, width `420`, gap `4`, background `background`, testId root
`font-root`. Every run is a `<text>` with `fontSize: 16`, `color: foreground`
and its own `highlight={{ query: <that run's text> }}` — the wash rect is the
shaped run, the only glyph-advance signal the host exposes in **both** hosts
(plan `342` used it for the bold/regular difference).

| testId | `fontFamily` | text | what it proves |
| ------ | ------------ | ---- | -------------- |
| `font-system-narrow` | omitted (default) | `iiiiiiii` | the default face is proportional |
| `font-system-wide` | omitted | `WWWWWWWW` | …its wide glyph is wide |
| `font-mono-narrow` | `systemMonoFamily` | `iiiiiiii` | the platform mono resolves |
| `font-mono-wide` | `systemMonoFamily` | `WWWWWWWW` | …and is uniform |
| `font-system-run` | omitted | `GPUixUI 0123` | the reference phrase, default face |
| `font-mono-run` | `systemMonoFamily` | `GPUixUI 0123` | the same phrase, mono face |
| `font-missing-run` | `MISSING_FAMILY` | `GPUixUI 0123` | a family no host has |

`MISSING_FAMILY = "GPUIXUI Missing Face"` — a name no platform ships, and the
module's guard fails if it ever equals the platform family.

## 4. Pure model (`font-metrics.ts`)

```ts
export const FONT_SIZE = 16;
export const NARROW_RUN = "iiiiiiii";
export const WIDE_RUN = "WWWWWWWW";
export const PHRASE_RUN = "GPUixUI 0123";
export const MISSING_FAMILY = "GPUIXUI Missing Face";

/** The first wash rect's width for each painted run of `text`, in paint order. */
export const runWidths = (
  highlights: ReadonlyArray<Smoke.HighlightMatch>,
  text: string,
): ReadonlyArray<number>;

export const uniform = (widths: ReadonlyArray<number>, tolerance: number): boolean;
export const proportional = (narrow: number, wide: number, minimum: number): boolean;
export const differs = (left: number, right: number, minimum: number): boolean;
export const same = (left: number, right: number, tolerance: number): boolean;
/** Guard: the missing family must not be the platform family. */
export const missingFamilyIsForeign = (platformFamily: string): boolean;
```

`runWidths` filters by exact `text`, takes `rects[0].width` and **drops** a
match with no rects (the adapter already drops a malformed wash; a match with an
empty rect list must not crash a scenario).

## 5. Checks (identical in both hosts)

Paint order decides `index`: the narrow and wide runs appear twice (system then
mono) and the phrase appears three times (system, mono, missing), in document
order — the same convention plan `342` uses for two runs. A mis-order cannot
pass silently: the system pair is proportional and the mono pair is uniform, so
swapping them fails one of the two checks by name.

1. `the default face is proportional` — `wide(system) > narrow(system) + 16`.
2. `the platform mono face is monospaced` — `|wide(m3) − narrow(mono)| ≤ 1`.
3. `the same phrase is wider in one face than the other` — `|mono − system| > 4`.
4. `a family the host lacks falls back to the default face` —
   `|missing − system| ≤ 2`.
5. `the fallback is not the mono face` — `|missing − mono| > 4`.

Plus one `expectSome` per run for its wash rect (7), so the measured count is
**12 checks per host** (7 lookups + 5 relations). Every threshold is stated as
the *predicted* value; §11 records the measured widths and any correction. A
correction may only widen a rounding tolerance; it may never turn a relation
into an equality-of-family list.

## 6. Unit tests (`font-metrics.test.ts`)

1. `runWidths` keeps only the named run **in paint order** and returns one width
   per match. *Fails if the filter is dropped or the order is reversed.*
2. `runWidths` drops a match whose `rects` is empty instead of returning `NaN`.
3. `uniform` is true at the tolerance boundary and false one pixel past it.
4. `proportional` is false when the wide run is only equal, true one pixel past
   the margin. *Fails if `minimum` is ignored.*
5. `differs`/`same` agree at their boundaries and disagree on a clear gap.
6. `missingFamilyIsForeign(systemMonoFamily)` is true and
   `missingFamilyIsForeign(MISSING_FAMILY)` is false. *Fails if the fixture is
   pointed at a real family.*

Every test names the inversion it guards in the file header.

## 7. Commands and expected results

```sh
nub run --filter playground build                       # exit 0
nub apps/playground/dist/smoke/run.js --list | wc -l    # 113
nub apps/playground/dist/smoke/run.js --only font-family
# expected: 1/1, exit 0, 12 checks
nub run --filter playground test                        # playground 520 -> ~528
nub apps/playground/dist/live/run.js --only live-font-family
# expected: 1/1, exit 0, 12 checks, one window
nub apps/playground/dist/smoke/run.js                   # end of task: 113/113, exit 0
nub run check && nub run lint && nub run test
```

## 8. Mutation proofs (observe, then revert)

- **M1** — give `font-mono-narrow`/`font-mono-wide` no `fontFamily` (the mono
  fixture silently becomes the default face): check 2 must fail with a width
  difference well over 1 px.
- **M2** — set `fontFamily: systemMonoFamily` on `font-system-run` as well:
  check 3 must fail with `0` difference.
- **M3** — set `MISSING_FAMILY` to `systemMonoFamily`: the guard unit test fails
  and check 5 must fail.
- **M4** — make `proportional` ignore `minimum`: unit test 4 fails.
- **M5** — reverse the paint-order index in one relation: the corresponding
  check must fail, proving the order convention is load-bearing.

Record the actual failure strings in §11. A mutation that **passes** is a check
that is not load-bearing; replace it, do not keep it.

## 9. STOP conditions

- The headless `highlights()` reports no wash for a fixture: stop and fix the
  query/fixture; do not sample another run's rect.
- `fontFamily` does **not** change the advance (check 3 fails): this is a real
  runtime finding. Stop, record it with both widths in §11 and in
  `COMPONENTS.md`, and **do not** weaken check 2 or 5 to hide it.
- The platform mono family is not uniform (check 2 fails): report whether the
  family is missing on the host (then the finding is a platform-table problem)
  or the runtime ignores the family (then it is a runtime problem). Evidence
  decides; do not widen the tolerance past 1 px.
- The missing family paints at a width that matches **neither** face: record the
  measured fallback, keep the "not the mono face" check, and state the measured
  rule in §11.
- `--only` exits `2`: no binding on this host — not evidence.
- The live run needs a real window; a failure to open one is not a failure of
  the probe.

## 10. Acceptance

- 12 checks green in both hosts, focused, twice each.
- Unit tests green; playground unit total rises by the new tests only.
- The full headless registry is **113/113**, exit `0`; the live registry lists
  **102** (no full live run — merge gate).
- Five mutation proofs observed and reverted (§8), or a measured correction
  recorded instead.
- README section, `COMPONENTS.md` row, TODO tick and the `tokens` cross-team row
  landed; nothing in `packages/*` changed.

## 11. Results (2026-10-20, darwin-x64, `@gpuix/native` 0.10.0 release-tag binding)

**Measured — the typeface reaches the shaped glyphs.** The same view, the same
relations, identical widths to the last digit in the offscreen host and the real
1100 × 720 window:

| Run at 16 px | Default face | `Menlo` (the platform mono here) |
| ------------ | ------------ | -------------------------------- |
| `iiiiiiii` | `29.125` | `77.0625` |
| `WWWWWWWW` | `121.375` | `77.0625` |
| `GPUixUI 0123` | `100.2656` | `115.5938` |
| `GPUixUI 0123` in `GPUIXUI Missing Face` | `102.2656` | — |

So: the default face is proportional (92.25 px between narrow and wide), the
platform mono is uniform to **0 px** (the 1 px tolerance is headroom), the same
phrase differs by **15.33 px** across the faces, and the missing family paints
within **2.0 px** of the default and **13.33 px** from the mono face — the
default's metrics, i.e. a silent fallback, not an error.

**Measured correction.** §5 predicted a 2 px tolerance for the fallback. The
measurement is exactly `2.000` px, which a floating-point rounding on another
run could push past the boundary, so the tolerance is **4 px**. The check stays
load-bearing: the mono face is 13.33 px away, so a fallback to the wrong face
still fails both the "falls back" check (> 4) and the "not the mono" check.

**Measured absence — no font registration.** `@gpuix/native@0.10.0` has no
`registerFont`: absent from `index.d.ts` and `index.js`, and both renderers'
prototypes expose no method matching `/font/i` (`GpuixRenderer` 55 methods,
`TestGpuixRenderer` 57). The reference clone's `main`
(`packages/native/src/renderer.rs:2339`) has it, so it is post-0.10.0. A
bundled brand face cannot ship on the pin; only OS-installed families resolve.

| Suite | Scenarios | Checks | Duration | Exit |
| ----- | --------- | ------ | -------- | ---- |
| headless `font-family` | 1/1 | **13** | 39 ms | `0` |
| live `live-font-family` | 1/1 | **13** | 175–246 ms | `0` |

Both ran focused twice, green. Playground unit tests **520 → 527** (7 new).

**Mutation proofs observed and reverted** (M5's stated intent corrected below):

- **M1** — no `fontFamily` on the mono runs: `the platform mono face is
  monospaced: expected true, got false`.
- **M2** — `font-system-run` given the mono family: `the same phrase advances
  differently in the two faces: expected true, got false`.
- **M3** — `MISSING_FAMILY = "Menlo"`: `the missing-family fixture is not a real
  family: expected true, got false`.
- **M4** — `proportional` ignores its margin: the unit test fails at
  `proportional(48, 60, 16)` (`expected false, got true`).
- **M5** — the two `NARROW_RUN` indices swapped: `the platform mono face is
  monospaced: expected true, got false`. The swap does **not** fail the
  proportional check (mono `i` `77.06` is still over 16 px below the system `W`
  `121.38`), so the order convention is guarded by the uniform check — a
  measured note, not a weakened check.

End of task: the full headless registry is **113/113 · 4165 checks · 65
capabilities · 237.6 s**, exit `0` — exactly `4152 + 13`. The live registry is
**102** (`live-font-family` focused-green twice; the full live suite is the
merge gate and was not run). `nub run check`/`lint`/`test` green (playground
**527**).

```sh
nub run --filter playground build                       # exit 0
nub apps/playground/dist/smoke/run.js --only font-family        # 1/1 · 13 · exit 0 (twice)
nub apps/playground/dist/live/run.js --only live-font-family     # 1/1 · 13 · exit 0 (twice)
nub run --filter playground test                        # 527 tests
nub apps/playground/dist/smoke/run.js                   # 113/113 · 4165 · 237.6 s · exit 0
```


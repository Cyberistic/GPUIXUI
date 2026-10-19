# 676 — The palette switch, in pixels: `live-theme` reads the frame

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground |
| Depends on | `643` (`live-theme`), `654` (the platform twin), `674` (the pixel decoder and `live-pixel-colour`), `675` (the gate that put pixel evidence on the head) |
| Feeds | `COMPONENTS.md`'s native-theme row, `apps/playground/README.md`, the live registry totals |

## 1. Goal and the gap being closed

Plan `674` made colour assertable: `packages/testing` decodes the PNG the
runtime writes, and `live-pixel-colour` samples five boxes in one palette in a
real window. But the **palette switch itself** still has no pixel evidence.
`live-theme` (plan `643`) proves only that a real click changes the painted
readout and keeps the swatch box; the same readout would pass if the window
never repainted a single swatch. `theme-color-roles` proves the switch through
`paintedStyle`, which the live renderer does not expose (plan `197`).

This plan closes that gap: after each switch (`dark → light → high`), capture
the real window's frame and assert that the centres of `swatch-background` and
`swatch-primary` equal that palette's `colors.background` / `colors.primary`,
at the frame's own device scale. The interaction, the palette and the actual
pixels then agree in one scenario.

It also removes the duplicated capture/decode/sample chain that currently lives
inside `scenarios/pixels.tsx`, so a second pixel scenario cannot invent its own
scale rule, tolerance or temp-file lifecycle.

**Non-goals:** no new capability, no new live id, no component change, no
screenshot diffing. Colour outside the sampled swatch centres (anti-aliasing,
gradients, text) is still not asserted.

## 2. Measured context the executor needs

Recon on 2026-10-19 on the plan-`675` head (`d206df18`), read-only:

```text
$ nub apps/playground/dist/live/run.js --list | wc -l
95                                   # the live registry
$ python3 ... live-report.json       # live-theme entry
id=live-theme checks=9 durationMs=4250
```

- `live-theme`'s nine checks are: readout painted ×3, opens dark, swatch
  painted ×2, switch→light, switch→high, box unchanged.
- `live-pixel-colour` is 22 checks, 10.1 s, and its helpers are **private** to
  `apps/playground/src/scenarios/pixels.tsx` (`capture`, `captureLive`,
  `decodeFrame`, `readFile`, `removeFile`, `tempPath`, `pixelAtId`,
  `pixelAtPoint`, `expectColour`, `hex`).
- The frame's device scale is **2** on this host (`674`), so every coordinate
  must go through `Pixels.framePoint`; never hard-code a pixel.
- The three palettes have distinct backgrounds and primaries:
  `palettes.dark`, `palettes.light`, `palettes.high` in
  `apps/playground/src/palettes.ts` (`getTheme("dark" | "light")`,
  `getTheme("dark", "high")`).
- The gallery view is `themeColorRolesView` in
  `apps/playground/src/scenarios/theme.tsx`; the two sampled ids are
  `swatch-background` and `swatch-primary`, each a 22 px-tall solid fill with a
  1 px border, so its centre is a pure fill pixel.
- `Smoke.AsyncSmokeHost.screenshot(path)` returns
  `Effect<void, SmokeHostError>`; the live runner writes artifacts under
  `LIVE_ARTIFACTS` (`apps/playground/src/live/scenarios.tsx`).
- `Smoke.SmokeHost.screenshot(path)` is synchronous and needs a `paint()` first;
  the live host must not be asked to paint.

## 3. Design

### 3.1 A shared frame module

New `apps/playground/src/scenarios/frames.ts` owns capture, decode, sampling and
comparison. It exports:

| Export | Responsibility |
| ------ | -------------- |
| `TOLERANCE` | `2` per channel (the measured JPEG-free PNG round trip of plan `674`) |
| `asHex(colour)` | `#RRGGBBAA`, for a failing check's `actual`/`expected` |
| `captureHeadless(host, path?)` | `paint()` then `screenshot()`; decodes and deletes a temp frame unless `path` keeps it as an artifact |
| `captureLive(host, path?)` | the automation `screenshot` verb; same temp/keep rule |
| `pixelAtPoint(ctx, frame, x, y, label)` | an element-independent sample |
| `pixelAtId(ctx, reader, frame, testId)` | the painted **centre** of `testId`, mapped through `Pixels.framePoint` |
| `expectColour(ctx, label, actual, expected)` | the tolerance comparison, recorded through `ctx.check` |
| `expectPixel(ctx, label, reader, frame, testId, expected)` | `pixelAtId` + `expectColour` |

`FrameReader<E>` is the two host reads a sample needs (`bounds(testId)` and
`windowSize()` as Effects). Two adapters keep both hosts on one rule:

```ts
export const readSync = (host: Smoke.SmokeHost): FrameReader<never>;
export const readAsync = (host: Smoke.AsyncSmokeHost): FrameReader<Smoke.SmokeHostError>;
```

This is the important part: the sync adapter lifts the `TestRenderer`'s plain
values with `Effect.sync`, the async one uses the host's effects, and neither
scenario branches on which host it has.

`expectPixel`'s error channel is `SmokeAssertionError | E`, so the headless
scenario still returns exactly `SmokeAssertionError` and the live one may also
return `SmokeHostError` — which is what both scenario types already allow.

### 3.2 The palette expectations are pure and testable

New `apps/playground/src/scenarios/palette-pixels.ts`:

```ts
export interface PalettePixel {
  readonly testId: string;
  readonly colour: string;
}
/** The swatches a palette switch must repaint, with their token colours. */
export const palettePixels = (palette: PaletteId): ReadonlyArray<PalettePixel>;
```

It returns `swatch-background` → `palettes[palette].colors.background` and
`swatch-primary` → `palettes[palette].colors.primary`.

`palette-pixels.test.ts` guards the premises the live checks would otherwise
assume:

1. every expected colour parses with `Pixels.hexToRgba`;
2. for each of the two test ids, the three palettes' colours are **pairwise
   distinct** — otherwise "the switch repainted this swatch" could pass without
   a visible change;
3. the two ids are the ones the gallery actually paints (`swatch-` prefix and
   the role name, derived from the palette's `colors`, never copied).

### 3.3 `live-theme` gains the frame

After `settle` at each stop, `live-theme` calls
`captureLive(ctx.host, `${LIVE_ARTIFACTS}/live-theme-<palette>.png`)` — the same
frame is the run artifact and the evidence — and then, for both entries of
`palettePixels(palette)`, `expectPixel`. The existing readout/box checks stay, so
the scenario still proves the interaction and now also proves the paint.

Per palette that is: 2 samples × (painted, maps, pixel, colour) = 8 checks.
Three palettes → 30 new checks (2 token parses + 8 samples per palette),
`live-theme` **9 → 39**. The two existing
artifact screenshots (`-dark`, `-light`) become the captured frames; the last
one is `live-theme.png` for the high palette.

`live-pixel-colour` keeps its existing 22 checks and is rewritten on the shared
helpers with the **same labels**, so its report is unchanged. That equality is
the regression guard for the refactor.

## 4. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/frames.ts` | **new** — capture/decode/sample/compare, `FrameReader`, `readSync`, `readAsync` |
| `apps/playground/src/scenarios/palette-pixels.ts` | **new** — `PalettePixel`, `palettePixels` |
| `apps/playground/src/scenarios/palette-pixels.test.ts` | **new** — 3 tests (§3.2) |
| `apps/playground/src/scenarios/pixels.tsx` | delete the private helpers; use `frames.ts`; preserve every existing check label |
| `apps/playground/src/live/scenarios.tsx` | `liveTheme`: capture per palette and assert `palettePixels` through `expectPixel`; update the doc comment |
| `apps/playground/README.md` | `live-theme` paragraph: state the pixel evidence and the new check count |
| `COMPONENTS.md` | native-theme row: the switch is now pixel-verified; scenario list unchanged |
| `TODO.md` | tick this task with the measured run and the exact ids |
| `.agents/slop/plans/README.md` | index this plan with its measured status |
| `PLAN.md` | decision `D94` (the measured rule) |

## 5. Commands and expected results

Run from the repo root, in this order.

```sh
# 1. type/format the touched files through the repo gates
nub run --filter playground test
# expect: the new palette-pixels tests and the existing playground tests pass

# 2. build so the CLIs pick up the change
nub run --filter playground build
# expect: exit 0 (the binding is already built; no compiler error)

# 3. the headless regression guard (the refactored pixel scenario)
nub apps/playground/dist/smoke/run.js --only pixel-colour
# expect: 1/1, 22 checks, the identical labels to plan 674

# 4. the new evidence, three consecutive runs (a window opens each time)
nub apps/playground/dist/live/run.js --only live-theme
# expect: 1/1, 39 checks, exit 0, three PNGs under .artifacts/live

# 5. the untouched pixel twin still passes through the shared helpers
nub apps/playground/dist/live/run.js --only live-pixel-colour
# expect: 1/1, 22 checks, exit 0
```

Then `nub run check`, `nub run lint`, `nub run test`. The full live suite is a
merge gate and is **not** run for this task (`--only` ids above are the scoped
verification).

## 6. Test plan

### 6.1 Unit

`palette-pixels.test.ts`, `@effect/vitest`-free (pure):

- `every palette swatch colour parses` — `Pixels.hexToRgba` returns `Some` for
  all six entries.
- `the three palettes paint distinct backgrounds` — set size 3.
- `the three palettes paint distinct primaries` — set size 3.

Each fails if a palette collapses onto another; the second/third fail if a token
is accidentally shared, which would make the live sample vacuous.

### 6.2 Measured (must run)

| Id | Expectation |
| --- | ----------- |
| `pixel-colour` | 22/22, unchanged labels |
| `live-theme` | 39/39, exit 0, three consecutive runs |
| `live-pixel-colour` | 22/22, exit 0 |

### 6.3 Mutation proofs (observe, then revert, in this worktree)

- **M1 — the switch does not repaint:** make `ColorRolesProbe` keep the dark
  theme after `theme-next` (drop the `palette` state from `theme`). `live-theme`
  must fail on the light palette's `swatch-background` colour (`expected
  #F…, got #1…`), exit `1`.
- **M2 — sample the wrong swatch:** point `palettePixels` at
  `swatch-foreground` for `background`. The light/high samples fail against the
  foreground colour, exit `1`.
- **M3 — ignore the device scale:** replace `Pixels.framePoint` with the raw
  logical bounds in `frames.ts`. The sample lands at half the intended pixel;
  at least one palette fails, exit `1`. If all three still pass, STOP — the
  frame is not 2× on this host and the scale claim in plan `674` needs
  re-measuring before this plan can claim anything.
- **M4 — the unit guard:** force light's background to dark's in
  `palette-pixels.ts` expectations. `the three palettes paint distinct
  backgrounds` fails.
- **Null-result candidate:** if all four mutations fail as predicted there is no
  null result; record any that does not.

## 7. STOP conditions

Stop and report with the failing output — do not adjust a tolerance or delete a
check to go green — when:

- `live-theme` opens on a palette other than `dark`, or a switch does not move
  the readout (the view changed under this plan).
- A sampled swatch centre does not decode (`None`): the artifact path is wrong
  or the window frame is blank. Report the PNG and the bounds.
- The measured colour differs by more than `2` per channel from the token:
  report both hex values. A real theme mismatch is a `tokens` finding, not a
  playground fix.
- `pixel-colour`'s labels or count change in the refactor: the shared helper is
  not behaviour-preserving.
- The binding fails to load (exit `2`): BLOCKER B1 regressed; stop and record.

## 8. Ledger updates after the run

- `apps/playground/README.md`: `live-theme`'s row says 9 → **39** checks and
  that the sampled centres match the palette's `background`/`primary` at device
  scale 2; the live registry stays **95**.
- `COMPONENTS.md`: the native-theme row says the three palettes are verified in
  the frame, not only in the readout; the scenario list is unchanged.
- `TODO.md`: a ticked entry with the exact ids run (`pixel-colour`,
  `live-theme` ×3, `live-pixel-colour`), the counts, the mutation proofs and the
  `check`/`lint`/`test` results. Do not claim a new full-suite total.
- `plans/README.md`: the 676 row, status **landed**, with the measured numbers.
- `PLAN.md`: `D94` — a palette switch is only proven when the frame's pixels
  move; the live tree has no style report, so the frame is the only live colour
  evidence.

## 9. Known limits recorded by this plan

- Only two solid swatches are sampled per palette. Text, borders, focus rings
  and anti-aliased edges remain unasserted; a screenshot diff is still the only
  evidence for them.
- The tolerance stays `2` per channel and is about PNG decode fidelity, not a
  licence for a wrong token. A mismatch larger than that fails.
- The high-contrast palette is `getTheme("dark", "high")`; the plan does not
  claim WCAG contrast ratios, only that the palette's own values paint.

## 10. Measured — 2026-10-19

Focused runs on the reverted tree, in this worktree:

| Command | Result |
| ------- | ------ |
| `nub apps/playground/dist/smoke/run.js --only pixel-colour` | **1/1**, **22 checks**, exit `0` (the plan-674 labels are unchanged by the refactor) |
| `nub apps/playground/dist/live/run.js --only live-theme` | **1/1**, **39 checks**, exit `0`; four green runs (24.9 s, 18.1 s, 18.3 s before the mutation proofs; 58.9 s after the revert under load; 17.3 s on the final rebuilt tuple API) |
| `nub apps/playground/dist/live/run.js --only live-pixel-colour` | **1/1**, **22 checks**, exit `0` |

The frame reports device scale **2** and these exact swatch centres:

| Palette | `swatch-background` | `swatch-primary` |
| ------- | ------------------- | ---------------- |
| dark | `#11141A` | `#A7A9FF` |
| light | `#F6F8FA` | `#5F4BDB` |
| high | `#000000` | `#C7CBFF` |

Three PNGs are written as both artifact and evidence:
`.artifacts/live/live-theme-dark.png`, `-light.png`, `live-theme.png`.

Mutation proofs, observed and reverted (each run on a green build):

- **M1** — `ColorRolesProbe` ignored the switch (`const theme = palettes.dark`):
  `live-theme` failed `light swatch-background paints #F6F8FA: expected
  #f6f8faff, got #11141aff`, exit `1`.
- **M2** — `palettePixels` sampled `swatch-foreground` for the background:
  failed `dark swatch-foreground paints #11141A: expected #11141aff, got
  #eef1f5ff`, exit `1`.
- **M3** — halved the logical point before `framePoint` (as if the frame were
  1×): failed `dark swatch-background paints #11141A: expected #11141aff, got
  #222730ff` (a neighbouring swatch), exit `1`.
- **M4** — every palette expected the dark background: the pure test failed
  `the three palettes paint distinct backgrounds and primaries` with
  `expected 1 to be 3`, exit `1`.

No null results. Gates: `nub run check`, `nub run lint` and `nub run test` are
green; the playground suite is **442** tests (439 + the three new
`palette-pixels` tests). The full live suite was not run — the registry is
unchanged at **95** and the next full gate covers `live-theme`'s +30 checks.

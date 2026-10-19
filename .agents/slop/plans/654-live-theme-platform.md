# 654 — The platform type styles in a real window

**Phase:** F
**Depends on:** `100`, `110`, `120`, `140`, `150`, `170`, `189`, `190`, `197`, `529`, `643`
**Workstream:** playground (`apps/playground`, `packages/testing`)

## 1. Why this plan exists

MISSION makes the three platform style variants a first-class requirement: a
consumer picks macOS, Linux or Windows and every component renders in that
style. `packages/tokens` implements them as real theme values
(`platformTheme(base, platform)` changes the two type families and the theme
name, nothing else), and plan `170` proved them **headlessly** through the
runtime's own style report — `paintedStyle("platform-mono").fontFamily` reads
`Menlo`, `DejaVu Sans Mono` and `Consolas` across the cycle.

Plan `653`'s coverage guard requires every headless capability to have live
evidence. The `theme` capability satisfies that through `live-theme`, but
`live-theme` cycles **palettes** only. The platform **type** styles therefore
still have no real-window evidence, and the guard cannot see the distinction:
one live id per capability is the guard's unit. This is the last theming
contract with a headless-only proof.

What a window can and cannot add:

| Claim | Headless (`theme-platform`) | Live (this plan) |
| ----- | --------------------------- | ---------------- |
| the switch applies a platform theme | `paintedStyle` family per platform | the painted readout follows a real click through all four states |
| the platform style does not move the palette | `paintedStyle` background equals the dark palette | the palette-derived surface keeps its exact box |
| the type style does not move layout | not asserted | the mono/sans runs and the surface keep their boxes across the cycle |
| the switch reaches the **paint**, not just React state | not asserted | the renderer's paint counter grows on every switch |
| the resolved glyph family | family declaration | **not observable live** — `GpuixRenderer` has no style report (plan `197`) and the live automation tree carries no `style`. Fonts the host lacks (`DejaVu Sans Mono`, `Consolas` here) also fall back silently, so a width assertion would be host-specific. Recorded, not asserted. |

**Guard being exercised:** the mission's native-evidence rule for the design
system. The reverse proof (a switch whose `platformTheme` never reaches the
text style) is in §5.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/theme.tsx` | Export `platformThemeView = (): ReactNode => <PlatformProbe />` beside the existing `themeColorRolesView`, so the live twin mounts the **same** view the headless scenario drives. No behaviour change. |
| `apps/playground/src/live/scenarios.tsx` | Import `platformThemeView`; add `liveThemePlatform` (`id: "live-theme-platform"`, `capability: "theme"`, `view: platformThemeView`, `ready: "platform-readout"`) next to `liveTheme`, and append it to `liveScenarios`. Steps: read the opening readout and the pre-cycle boxes; click `platform-next` four times, waiting on the painted readout each time (`platform=darwin label=macOS`, `platform=linux label=Linux`, `platform=win32 label=Windows`, `platform=default label=Default`); assert the painted run text is present at every stop; assert `platform-surface`, `platform-mono` and `platform-sans` keep their opening boxes at every stop; assert `host.frameStats().frames` grew across each click; assert the closing readout restored the default. One screenshot per platform, named from `LIVE_ARTIFACTS`. |
| `apps/playground/src/live/scenarios.test.ts` | No behaviour change expected: the real-registry test already requires unique, `live-`-prefixed ids and a headless twin. Re-run it; if it fails, the registry edit is wrong (STOP §4). |
| `apps/playground/README.md` | The live-registry section gains `live-theme-platform` in the theme row and the new live total. |
| `COMPONENTS.md` | The `theme` capability row cites `live-theme-platform`; the **Platform type styles** and **Native theme gallery** rows record the live contract and the family limit. |
| `TODO.md` | New ticked row at the top of the playground section: what was measured, the check count, the exact commands and the mutation proofs. |
| `.agents/slop/plans/README.md` | Add `654` to the playground table and the numbering paragraph. |
| This plan | Fill §8 "Landed" with the observed output and check count. |

Do **not** touch `packages/tokens`: the family values are already covered by
plan `170` and their package tests. This plan proves the consumer path.

## 3. Commands and expected results

Run from the worktree root
(`/Users/cyberistic/GPUIXUI/workspaces/playground`) with `nub`.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter playground build` | exit `0`; `dist/smoke/run.js` and `dist/live/run.js` include the new scenario. |
| 2 | `nub apps/playground/dist/live/run.js --list \| wc -l` | `94` (was `93`). |
| 3 | `nub apps/playground/dist/smoke/run.js --list \| wc -l` | `105` (unchanged; no headless scenario is added). |
| 4 | `nub apps/playground/dist/smoke/run.js --only theme-platform` | `1/1`, exit `0` — the shared view still satisfies the headless checks. |
| 5 | `nub apps/playground/dist/live/run.js --only live-theme-platform` | `1/1`, exit `0`, **three consecutive runs**; record the check count and the claimed time. This opens a real window. |
| 6 | `nub run --filter playground test` | exit `0`; the live-registry suite still passes. Record the playground total. |
| 7 | `nub run check` | exit `0` (`check:tests`, lint, format, every `check-types`). |
| 8 | `nub run lint` | exit `0`. |
| 9 | `nub run test` | exit `0`; record the per-package totals. |

The full headless suite is **not** required while iterating: only one scenario
is added and no shared behaviour changes. Run it at the end only if step 4 or a
compile error suggests the shared view moved. The full live suite is a
merge/release gate and is out of scope for this focused plan.

## 4. STOP conditions

Stop and report the command output — never weaken an assertion — if:

1. Step 5 reports `frames` **not** growing across a switch. That would mean the
   platform theme reaches React but not the paint. Record the exact numbers and
   file a cross-team defect row in `TODO.md`; do not delete the assertion.
2. Step 5 reports a box movement on `platform-surface`, `platform-mono` or
   `platform-sans`. A platform style must change type declarations only; a box
   change means the theme leaks spacing or a family's metrics resize the layout.
   Record the measured boxes and stop.
3. Step 5's readout does not reach a state, or the cycle does not return to
   `default`. The shared view and `nextPlatform` disagree; fix the probe in the
   headless scenario (its checks cover the same path) rather than forking the
   view.
4. Step 6 fails on the real-registry test: the new entry is not unique, not
   `live-`-prefixed, or names a capability the headless registry does not mount.
5. A registry count in steps 2–3 is not `94`/`105`. The tree already moved;
   record the actual counts and re-read the registry before continuing.
6. Step 4 fails: the export changed the view's behaviour. Revert the export to
   a pure alias and re-run.

## 5. Test plan

The test is the live scenario itself (the live suite is its runner) plus the
pure registry guard.

| Check | What it must catch |
| ----- | ------------------ |
| opening readout `platform=default label=Default` | a view that opens on a non-default platform |
| `platform=darwin`, `platform=linux`, `platform=win32` after real clicks | a `nextPlatform` map or a click path that skips a platform |
| painted mono run present at every stop | a switch that unmounts or blanks the type sample |
| `platform-surface` box identical across all five reads | a platform theme that leaks spacing/colour-driven layout |
| `platform-mono` / `platform-sans` boxes identical across all five reads | a family change that resizes the text nodes (it must not at a fixed width) |
| `frameStats().frames` strictly grows per switch | a platform switch that only rewrites React state and never paints |
| closing readout `platform=default` | a cycle that does not close |
| registry guard (unchanged) | a duplicate / mis-prefixed / unmatched live entry |

**Two-direction evidence (observe, then revert):**

- **M1** — make `nextPlatform.darwin` return `"darwin"` (a switch that does not
  advance): the first `platform=darwin` wait fails, exit `1`.
- **M2** — pin `platformTheme(palettes.dark, "default")` in `PlatformProbe` so
  the readout advances but the theme never changes: the frame-growth assertion
  or the readout/theme divergence must fail. If it passes, the frame assertion
  is not isolating the paint — record that null result and rely on M1 plus the
  headless `theme-platform` family checks.
- **M3** — move `platform-surface` by 1 px in the Linux branch of the probe: the
  box check fails, exit `1`.

Each mutation is run, observed red, and reverted. Record the exact message.

## 6. Ledger wording

- `TODO.md`: one ticked row naming the twin, its checks, the three commands run,
  the focused runs and the mutation proofs, and the family limit (the live tree
  has no style, so the resolved family stays headless).
- `COMPONENTS.md`: `theme` row gains `live-theme-platform`; the platform row
  says what the window proves and that the family itself is headless evidence.
- `README.md`: the live registry paragraph gains the id and the count.

## 8. Landed

`liveThemePlatform` mounts `platformThemeView` (the exported `PlatformProbe`) in
the real 1100 × 720 window on this host.

- **45 checks**, three consecutive focused runs green (`live-theme-platform`,
  ~5.6–6.5 s each, exit `0`). The live registry is **94**; the headless registry
  stays **105** and `theme-platform` is still `1/1`.
- Screenshots: `apps/playground/.artifacts/live/live-theme-platform-{default,darwin,linux,win32}.png`.
- Measured: the opening readout is `platform=default label=Default`; the four
  clicks reach macOS, Linux, Windows and back; the mono and sans runs and the
  120 × 32 surface keep the **same box strings** at every stop; every switch
  grows the paint counter; the code run is in `paintedText()` at every stop.
- **M1** (observe, then reverted) — `nextPlatform.darwin = "darwin"` failed with
  `the switch reaches Linux: expected a string containing "platform=linux
  label=Linux", got "platform=darwin label=macOS"`, exit `1`.
- **M3** (observe, then reverted) — a 1 px wider surface in the Linux branch
  failed with `the Linux style does not move the palette surface`, exit `1`.
- **M2** (observe, then reverted) — pinning `platformTheme(palettes.dark,
  "default")` while the readout still advances **passed**. The null result is
  the honest scope: the twin proves the gesture path, the repaint and layout
  stability; the applied family remains `theme-platform`'s `paintedStyle`
  evidence because the live tree carries no `style` and a missing family falls
  back silently.
- `nub run --filter playground test` — 37 files, **436** tests, exit `0` (the
  registry guard accepts the new entry unchanged).

# 055 — Tier 1 under the remaining theme axes: high contrast, density, platform type

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — closes three theme claims that have no runtime proof |
| Owner | primitives workstream (`packages/primitives`, `packages/icons`) |
| Depends on | `030`, `041`, `042`, `051`, `016`–`018` |
| Status | planned |
| Evidence | plan `042` §8 proves only `lightTheme` / `darkTheme`; `COMPONENTS.md`'s high-contrast, density and platform rows cite values, never a paint |

This plan is self-contained. Run every command; do not claim a test passed unless
it ran.

---

## 1. Why

`COMPONENTS.md` claims three theme capabilities that the runtime suites never
exercise:

| Row | Claim today | Missing proof |
| --- | ----------- | ------------- |
| High-contrast theme | AAA roles exist in `@gpuixui/tokens` | no Tier 1 component has painted under `highContrastLightTheme` / `highContrastDarkTheme` |
| Density | `ThemeProvider` replaces the numeric metrics | no control has been measured under a non-default density, and `theme.runtime.test.tsx` only checks that a *theme* switch leaves height alone |
| Platform type styles | `platformTheme` returns a real `Theme` | the platform palette's mono family has never reached a mounted tree — the docs platform toggle's mechanism is unproven end-to-end |

All three are **verification** gaps, not new component APIs. The fix is one
runtime suite plus three small helper hoists, and it is the honest prerequisite
for the docs-site platform toggle (MISSION's platform requirement) and for
marking the design-system rows complete.

**STOP** if a claim cannot be proven: do not weaken an assertion until it passes.
Record the component and the observed value in this plan's §6 and in
`COMPONENTS.md` as a limitation instead.

## 2. Files

| Action | Path |
| ------ | ---- |
| create | `packages/primitives/runtime/theme.ts` — the colour helpers lifted out of `theme.runtime.test.tsx` |
| change | `packages/primitives/runtime/theme.runtime.test.tsx` — import the helpers instead of declaring them |
| create | `packages/primitives/runtime/theme-axes.runtime.test.tsx` — the new suite (4 tests) |
| change | `packages/primitives/docs/theme-provider.mdx` — a "Contrast, density and platform" section with the verified behaviour |
| change | `packages/primitives/README.md` — the runtime test count and one line naming the axes |
| change | `COMPONENTS.md` — the three design-system rows cite `Runtime (055)` |
| change | `TODO.md` — tick the new task and update the primitives progress bar if the count changes |
| change | `.agents/slop/plans/README.md` — index this plan |

Do **not** touch `packages/tokens`: every value and helper this plan needs is
already exported (`highContrastLightTheme`, `highContrastDarkTheme`,
`densityPresets`, `platformTheme`). If one is missing, STOP and record it as a
cross-team task instead of editing tokens.

## 3. Step 1 — hoist the colour helpers

`runtime/theme.runtime.test.tsx` currently declares `styleOf`, `painted`,
`isColour`, `rgbOf`, `paintedColours`. The second suite needs all five.

1. Create `packages/primitives/runtime/theme.ts` with exactly those five
   exports, their existing doc comments, and imports for `Arr`, `Option`, `R`,
   `Runtime`, and `expect` (the `expect.fail` fallbacks stay identical).
2. In `theme.runtime.test.tsx`, delete the five declarations and import them
   from `./theme.js`; delete now-unused imports (`R` may still be used).
3. Run `nub run --filter @gpuixui/primitives test:runtime` — still **12 files,
   115 tests** green. A helper that changed behaviour shows up here first.

## 4. Step 2 — the new suite

Create `packages/primitives/runtime/theme-axes.runtime.test.tsx` with the file
header naming the three claims it guards and the plan.

Shared scene (module-local):

```tsx
const controls = (theme: PrimitiveTheme) => (
  <ThemeProvider theme={theme}>
    <Box tone="background" padding="lg" testId="surface">
      <Stack direction="column" gap="md">
        <Text role="body">Settings</Text>
        <Button variant="primary" testId="button">Save</Button>
        <Input testId="input" placeholder="Name" />
        <NumberField label="Count" defaultValue={3} testId="number" />
        <Checkbox checked label="Enable" testId="checkbox" />
        <Switch checked label="Notify" testId="switch" />
        <Progress value={40} label="Uploading" />
        <Separator orientation="horizontal" />
      </Stack>
    </Box>
  </ThemeProvider>
);
```

**Test 1 — high-contrast light.** Render `controls(highContrastLightTheme)`.
Assert `paintedColours(runtime)` is non-empty, every value is in
`R.values(highContrastLightTheme.colors)` after `rgbOf`, and the frame contains
a colour that is **not** in the default `lightTheme` palette (proves the palette
actually swapped, not that both palettes agree). State in a comment which role
that is.

**Test 2 — high-contrast dark, and the switch.** Render the light high-contrast
scene, capture `surface`'s background; re-render with
`highContrastDarkTheme`; assert the background equals the dark high-contrast
background, differs from the captured value, and every painted colour belongs to
the dark high-contrast palette. Same membership invariant as plan `042`.

**Test 3 — density moves heights and nothing else.**
Render `controls(lightTheme)` twice: once with
`density={densityPresets.compact}`, once with
`density={densityPresets.spacious}`. Assert:

- `runtime.bounds("button")`, `bounds("input")`, `bounds("number")` heights are
  the respective `controlHeight.md` for `md` controls (`32` compact, `36`
  spacious — read them from the preset, never hard-code);
- the two frames report the same `backgroundColor` for `surface` and the same
  `color` for `button` (density cannot introduce colour);
- `bounds("checkbox")` width and height are `lightTheme.iconSize.md` in **both**
  frames — selection size is icon-driven by design, so it must not drift with
  density.

**Test 4 — the platform theme reaches the paint.**
Render `Text role="code"` inside `ThemeProvider theme={platformTheme(lightTheme, "win32")}`.
Assert the `<text>`'s `fontFamily` is `platformTypes.win32.mono`. Re-render the
same tree with `platformTheme(lightTheme, "linux")` and assert it changes to
`platformTypes.linux.mono`. This is the docs platform toggle's path — the
provider receives a new theme object and the mounted tree repaints.

Expected: **4 tests, 13 files, 119 tests** in `test:runtime` (adjust the count in
the README/COMPONENTS only to what the run printed).

## 5. Step 3 — documentation truth

1. `docs/theme-provider.mdx`: add a "Contrast, density and platform" section
   showing `getTheme("dark", "high")`, `density={densityPresets.compact}` and
   `platformTheme(theme, "win32")`, and state what plan 055 measured.
2. `README.md`: update the measured test count and add the three axes to the
   verification paragraph.
3. `COMPONENTS.md`:
   - High-contrast theme row — append **Runtime (055)**: Tier 1 paints only the
     high-contrast palette, in both modes, and a switch repaints;
   - Density row — **Runtime (055)**: a control's height follows the preset,
     colours do not, and selection boxes stay icon-sized;
   - Platform type styles row — **Runtime (055)**: a code role's `fontFamily`
     changes with `platformTheme`, so the docs toggle is a real theme.
4. `TODO.md`: tick the task and keep the progress bar honest.

## 6. Test plan and two-direction proof

Run, in order:

```sh
nub run --filter @gpuixui/primitives test:runtime
nub run --filter @gpuixui/primitives test
nub run check
nub run test
```

Expected: the runtime run prints 16 files / 119 tests green; the offline suite is
unchanged (282); `check` prints "every test asserts something" and clean
type-check/format/lint; `nub run test` is green across the workspace.

Prove each new test can fail (mutation, then restore):

| Test | Mutation | Expected failure |
| ---- | -------- | ---------------- |
| high contrast | render `lightTheme` instead of `highContrastLightTheme` | the "a colour outside the default palette" assertion fails |
| density | make `withDensity` return `theme` unconditionally (`components/internal.ts`) | the height assertions fail |
| platform | make `platformTheme` keep `base.typography.mono` (`packages/tokens/src/theme.ts`) | the `fontFamily` assertion fails |

Record the observed failure line for each in this plan's §7, then restore the
mutation and re-run.

**STOP conditions:** a missing export; a control whose height does not follow
density (record which one and why, do not silently drop it from the scene); a
runtime that cannot report `fontFamily`; any red command after two corrected
attempts.

## 7. Measured results

Run on 2026-10-17 in `workspaces/primitives`, against the locally built GPUix
0.10.0 binding (plan 140):

- `nub run --filter @gpuixui/primitives test:runtime` — **13 files, 119 tests,
  all passing** (was 12/115; the new file adds 4).
- `nub run --filter @gpuixui/primitives test` — 25 files, 282 tests, green.
- `nub run check` and `nub run test` in the workspace — green (see the commits).

Two-direction proofs (each mutation applied, the named test run, the mutation
restored):

| Test | Mutation | Observed failure |
| ---- | -------- | ---------------- |
| high contrast | the scene rendered `lightTheme` instead of `highContrastLightTheme` | `expected [ '#F6F8FA', '#191D25', …(10) ] to strictly equal []` — the default palette's colours are outside the high-contrast one |
| density | `withDensity` returned `theme` unconditionally | `expected 32 to be 28` at the button height assertion |
| platform | the first render used `code("linux")` but asserted the win32 family | `expected 'DejaVu Sans Mono' to be 'Consolas'` |

One runtime fact the density test records rather than assumes: a native
`<input>` reports its **content box**, so its painted height is the density
height minus its two 1px borders (`26` for compact `md`, `28` for spacious `md`).
The contract is still the density metric; the assertion names the delta so a
future runtime that changes it fails loudly.


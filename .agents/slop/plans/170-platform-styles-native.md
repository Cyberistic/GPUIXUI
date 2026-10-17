# Plan 170 — the platform styles in the native runtime

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B → F (theming evidence).
**Depends on:** plans `100`, `110`, `120`, `140`, `150`; tokens plan `051`
(`platformTypes`, `platformTheme`) on `master`.

## 1. Why this plan exists

`packages/tokens` ships three platform style variants (`darwin`, `linux`,
`win32`, plus `default`). Plan `051` proves them **on a plain host**: the
`mono` family changes per platform, `sans` stays GPUI's `.SystemUIFont`
sentinel, and the theme merge keeps every colour. The docs platform toggle is
built on the same functions.

What no test proves is that a platform style **reaches the runtime**: that
`platformTheme(...)` produces a theme whose `textStyle(..., "code")` paints the
platform's mono family through GPUix. That is the native evidence the docs
need before claiming the platform toggle reflects the library. The theme
gallery already has the shape — a switch, a readout and `paintedStyle`
assertions — so this is one more scenario there, not a new mechanism.

The honest scope of the variants: they change **typography only** (the mono
family; `sans` is the system sentinel everywhere) and the theme name. The
scenario asserts exactly that, including that colours do **not** move.

## 2. What is built

One scenario, `theme-platform` (capability `theme`), in
`apps/playground/src/scenarios/theme.tsx`.

View (`PlatformProbe`, width 460):

- a `Pressable testId="platform-next"` cycling `default → darwin → linux →
  win32 → default`;
- `platform-mono` — a `<text>` painted with `textStyle(platformTheme(palettes.dark,
  platform), "code")`;
- `platform-sans` — the same with `"body"`;
- `platform-surface` — a div whose background is
  `platformTheme(palettes.dark, platform).colors.background`;
- `platform-readout` — `platform=<id> label=<platformTypes[id].label>`.

Steps:

1. `default` → `paintedStyle("platform-mono").fontFamily = "Menlo"`,
   `platform-sans` = `.SystemUIFont`, readout `platform=default label=Default`.
2. Click `platform-next` → `darwin`: readout `platform=darwin label=macOS`;
   the mono family is still `Menlo` (the two share it by design — the label is
   the only difference, and the readout proves the switch ran).
3. Click → `linux`: mono is `DejaVu Sans Mono`; sans is still
   `.SystemUIFont`; `platform-surface` background equals
   `palettes.dark.colors.background` (a platform style does not move colour).
4. Click → `win32`: mono is `Consolas`.
5. Click → `default` again; mono is `Menlo`.

The expected families are derived from `platformTypes` (the shipped table), not
restated, so a platform whose family changes updates the test.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/palettes.ts` | add `platformIds`, `PlatformId` and `nextPlatform` (the cycle) |
| `apps/playground/src/scenarios/theme.tsx` | the `PlatformProbe` view and `themePlatformScenario` |
| `apps/playground/src/scenarios/index.ts` | append the scenario |
| `apps/playground/src/smoke/run.test.ts` | assert `theme-platform` is registered |
| `apps/playground/README.md` | suite count `38 → 39`; a platform-styles paragraph in the theme-gallery section |
| `COMPONENTS.md` | the theme capability row gains `theme-platform`; the design-system section cites the native platform proof |
| `TODO.md` | tick the platform-style native evidence item; progress bar |
| `.agents/slop/plans/README.md` | index this plan as landed |
| `.agents/slop/plans/140-…` §4 | the theme row gains the platform findings |

No change outside the owned paths. `packages/tokens` is consumed, never edited.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground build` | clean build |
| `nub apps/playground/dist/smoke/run.js --only theme-platform` | green, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `39/39 scenarios passed`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proof:** point the `linux` expectation at `Menlo` and the run
must exit `1` with both families named. Restore.

## 5. STOP conditions

Stop and report with evidence if:

- **`paintedStyle.fontFamily` does not report the platform family** (the runtime
  reports the system sentinel for every role, or omits the property). Record the
  snapshot; a platform style that does not reach the paint is a real limitation
  and must go in `COMPONENTS.md` — do not fall back to a readout-only check.
- **A platform family is not installed on this host** (the runtime substitutes
  another family). Record what it painted; the *style* proof is what the
  library can guarantee, and the substitution is a host fact for the docs.
- **`platformTheme` mutates the base theme** or changes a colour (compare
  `platform-surface` against `palettes.dark.colors.background`). Record it; the
  tokens workstream owns the fix — add a `TODO.md` cross-team item.
- **A change outside the owned paths is required**: record it in `TODO.md` and
  do not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `theme-platform` | native smoke | a platform switch that never re-renders; a `platformTheme` whose mono family does not reach `textStyle`/the paint; a platform style that leaks into colours |
| `scenarioProblems` | unit | the scenario losing its registration |
| two-direction run (§4) | native smoke | the check passing when the linux family is wrong |
| full suite | native smoke | the extra switch disturbing later scenarios |

## 7. Acceptance criteria

- `theme-platform` registered, green, and its four platform states measured in
  the runtime.
- The suite is **39/39**, exit `0`; the two-direction proof is recorded in §8.
- The measured facts are in plan `140` §4, the app README and `COMPONENTS.md`.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome (executed on this host, 2026-10-17)

_To be filled when the plan runs._

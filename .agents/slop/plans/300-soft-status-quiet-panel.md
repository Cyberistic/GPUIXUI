# 300 — The soft status surface on the quiet panel

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
014, 063, 071, 076, 090, 094 · **Touches:** `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`, `TODO.md`

## 1. The defect

Plan 076 made every soft status surface (`infoSoft`, `successSoft`,
`warningSoft`, `destructiveSoft`) perceivable at 1.05:1 on the three plain
surfaces — `background`, `card` and `popover` — after platform styles changed
their canvases and inherited the identity's tints. The quiet panel (`muted`) is
the fourth base surface the design system names: it is the sidebar and settings
group surface, and `packages/primitives` exposes it as `Box`/`Surface` tone
`muted`. A status Badge or a small Alert in a settings group is exactly the
composition MISSION's badge and workspace rows describe.

No pair measures it. Measured on that surface, four of the ten shipped colour
sets are **under the library's own 1.05:1 floor**:

| Set | `muted` | `infoSoft` | `successSoft` | `warningSoft` | `destructiveSoft` |
| --- | ------- | ---------- | ------------- | ------------- | ----------------- |
| light | `#EEF1F5` | 1.077 | 1.077 | 1.105 | 1.091 |
| dark | `#222730` | 1.266 | 1.237 | 1.241 | 1.228 |
| high-contrast light | `#F2F2F2` | 1.281 | 1.176 | 1.167 | 1.326 |
| high-contrast dark | `#1A1A1A` | 1.368 | 1.364 | 1.441 | 1.313 |
| **macOS light** | `#ECECF0` | **1.036** | **1.036** | 1.063 | **1.049** |
| macOS dark | `#2C2C2E` | 1.177 | 1.150 | 1.154 | 1.141 |
| **Linux light** | `#EBEBEA` | **1.023** | **1.023** | **1.050** | **1.036** |
| Linux dark | `#303030` | 1.114 | 1.089 | 1.093 | 1.290 |
| **Windows light** | `#EDEDED` | **1.043** | **1.043** | 1.070 | 1.056 |
| Windows dark | `#2B2B2B` | 1.195 | 1.168 | 1.172 | 1.160 |

The four affected sets are the platform light variants: each changes `muted` and
inherits the identity's pastel tints, so a sidebar status badge is nearly the
same luminance as the panel behind it. This is plan 076's defect one surface
over, and the same class plans 078–095 closed for the skeleton, the dividers, the
control boundary and the scrim.

**Row washes are deliberately not part of this plan.** A soft status *chip*
inside a hovered, pressed or selected row is bounded by its designed
`xSoftBorder` edge, which is measured on the fill; unlike a full Alert panel, a
chip does not claim to be a surface in its own right, and keeping its pastel
close to a transient state wash is intended so the chip does not compete with
the row's own state colour. The base-surface contract is the promise an Alert or
Toast relies on.

## 2. Decision (do not re-litigate)

- `muted` joins the surfaces a soft status surface must be perceivable on:
  `softSurfacePairs` gains four pairs (129 → 133 `contrastPairs`).
- The four **light identity tints** move one small step deeper so they clear the
  darkest shipped quiet panel (`#EBEBEA`, Linux light) with margin. The dark and
  high-contrast sets already pass; they do not move.
- The values stay custom pastel tints rather than a full palette ramp step,
  because a full step (`blue 200` `#C5D8FF`, `red 200` `#FFC6C6`) would change a
  soft badge into a stronger fill. This matches `successSoft` and `warningSoft`,
  which already carry custom tints.
- The soft text floor, the designed edge floor, the selection-through-wash pairs
  and the surface floor on `background`/`card`/`popover` must all still pass; the
  tints only darken, which raises contrast on every lighter surface.

## 3. Exact values

| Role | Before | After | Linux light `muted` | Window light | macOS light | Identity `muted` | Edge on fill |
| ---- | ------ | ----- | ------------------- | ------------ | ----------- | ---------------- | ------------ |
| `infoSoft` | `#DEE9FF` | `#D6E3FF` | 1.023 → **1.081** | 1.043 → 1.105 | 1.036 → 1.097 | 1.077 → 1.138 | 1.525 → 1.444 |
| `successSoft` | `#C2F4D6` | `#B8EDCE` | 1.023 → **1.097** | 1.043 → 1.122 | 1.036 → 1.114 | 1.077 → 1.155 | 1.423 → 1.327 |
| `warningSoft` | `#FFE3A3` | `#FFDF9A` | 1.050 → **1.082** | 1.070 → 1.102 | 1.063 → 1.095 | 1.105 → 1.139 | 1.130 → 1.096 |
| `destructiveSoft` | `#FFE0E0` | `#FFD6D6` | 1.036 → **1.111** | 1.056 → 1.132 | 1.049 → 1.124 | 1.091 → 1.170 | 1.515 → 1.412 |

Soft text stays far above its floors (lowest: `infoSoftForeground` on the new
tint at 9.87:1; `warningSoftForeground` at 12.96:1). The soft edge stays above
the 1.05:1 default divider floor (lowest: `warningSoftBorder` at 1.096:1).

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Add `"muted"` to the soft-surface surface list and widen the comment: the quiet
panel is the fourth base surface a status panel sits on — a sidebar badge or a
settings-group Alert — and the platform light variants inherit the identity's
tints while changing `muted`.

### 4.2 `packages/tokens/src/color.ts`

Change the four light roles to the §3 values. Add one sentence to the
`lightColors` header comment: the soft tints clear the quiet panel as well as the
canvas, card and popover, and the platform light variants inherit them.

### 4.3 `packages/tokens/src/contrast.test.ts`

- `covers every documented pair`: 129 → 133.
- Header comment: add the plan 300 note (the quiet panel is the fourth base
  surface; the three platform light variants failed).
- Nothing else moves: `overlayWashPairs` and the selection lists are unchanged.

### 4.4 `packages/tokens/src/soft-quiet-panel.test.ts` (new)

Header: *Guards the defect plan 300 fixed: the soft status tints were checked on
`background`, `card` and `popover` but not the quiet `muted` panel, so macOS,
Linux and Windows light shipped a status badge at 1.023–1.049:1 against a
sidebar.*

Tests:

1. **Every shipped soft surface clears the quiet panel** — the ten shipped
   colour sets, four tones, `contrastRatio(fill, muted) >= 1.05`.
2. **The previous tints are one step under the floor on a platform light set** —
   build `extendTheme(getPlatformTheme("linux", "light"), { colors: {
   infoSoft: "#DEE9FF", successSoft: "#C2F4D6", warningSoft: "#FFE3A3",
   destructiveSoft: "#FFE0E0" } })` and assert `themeContrastFailures` reports
   exactly the four `xSoft`/`muted` `surface` pairs at the 1.05 floor, each
   measured below it (1.0232, 1.0232, 1.0498, 1.0361), on the public checker.
3. **The edge and the text survive the deeper tints** — for each tone,
   `xSoftBorder` on the new fill ≥ 1.05 and `xSoftForeground` on the new fill
   ≥ 7 (body floor).
4. **The affected sets are the platform light variants** — assert the generic
   loop covers `getPlatformTheme("darwin" | "linux" | "win32", "light")`, so a
   future style that lightens `muted` is caught.

### 4.5 `docs/tokens.md`

1. The default colour table's four soft rows take the new light values (the docs
   test derives them).
2. The tone paragraph: `background`, `card`, `popover` **and the `muted` quiet
   panel**; state that the audit found macOS 1.036/1.049, Linux 1.023/1.050 and
   Windows 1.043 below the floor and the four light tints moved one step.
3. Verification section: add the quiet-panel paragraph and the regression.

### 4.6 `docs/design-system.md`

§9 table row `soft status surface (xSoft) on background/card/popover` gains
`/muted`; the narrative says a status panel in a sidebar or settings group is the
composition that forced the extension and names the four failing platform light
sets.

### 4.7 `packages/tokens/README.md`

The soft-surface sentence names `muted` as the fourth surface and records the
platform-light regression (plan 300).

### 4.8 `COMPONENTS.md`

- *Theme contrast check* row: counts 129 → 133 and the plan 300 clause.
- *Status tones* row: soft surfaces are held to 1.05:1 against `background`,
  `card`, `popover` **and `muted`**.

### 4.9 `TODO.md`

Add and tick under **Design tokens and theming (`tokens-theme`)**:

```
`[x]` Hold the soft status surface on the quiet panel — a badge or Alert in a
sidebar inherited the pastel tints while the platform light styles changed
`muted`, so macOS measured 1.036:1, Linux 1.023:1 and Windows 1.043:1; the four
light tints move one small step and `muted` joins the surface pairs (plan 300)
```

Progress `67/86` → `68/87`.

### 4.10 Plan index

Add 300 with status `done` and a closing narrative paragraph.

## 5. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | fails before §4.2 on the four platform light pairs (1.023–1.049) |
| 2 | `nub run --filter @gpuixui/tokens test` | 36 files green, 1761 + the new tests |
| 3 | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| 4 | `nub run lint` | exit 0 |
| 5 | `nub run fmt` | exit 0 |
| 6 | `nub run check` | exit 0 |
| 7 | `nub run test` | exit 0 |

## 6. Test plan — proof in both directions

1. Add `muted` and the new suite **before** changing the tints: the suite fails
   on macOS light 1.036, Linux light 1.023 and Windows light 1.043 (and the docs
   table disagrees with the implementation). Capture the output.
2. Change the four tints; the suite passes and the checker reports no failure.
3. Temporarily revert one tint (for example `infoSoft` to `#DEE9FF`) and observe
   the platform loop fail only for that tone; restore.
4. Temporarily drop `"muted"` from the soft-surface list and observe the
   regression test fail (`expected []` for the old tints); restore.

## 7. STOP conditions

Stop and report, do not improvise, if:

- a new tint drops the soft text below 7:1, the soft edge below 1.05:1, or the
  fill below 1.05:1 on `background`/`card`/`popover` — the value is wrong;
- another shipped pair fails after the change — that is a second defect;
- a change is needed outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md` or `TODO.md`;
- a step needs `any`, a cast, a retyped list or a lower floor.

## 8. Acceptance

- [x] `muted` is in the soft-surface pair list; `contrastPairs` is 133.
- [x] All ten shipped sets clear 1.05:1 for all four tints on `muted`.
- [x] The four light tints clear the soft text, edge and lighter-surface floors.
- [x] The new suite fails without the tints and passes with them.
- [x] Docs, README, `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint`, `nub run test` pass — run, not assumed.
- [x] Committed on `agent/tokens-theme` and pushed.

## 9. Outcome (executed on this host, 2026-10-17)

- The defect was real and the contract caught it before the tints moved: adding
  `muted` to the soft-surface list failed **ten** shipped pairs — macOS light
  `infoSoft`/`successSoft` at 1.0359, `destructiveSoft` at 1.0490; Linux light
  `infoSoft`/`successSoft` at 1.0232, `warningSoft` at 1.0498, `destructiveSoft`
  at 1.0361; Windows light `infoSoft`/`successSoft` at 1.0425 — plus
  `platforms.test.ts`'s “clears the documented contract on every variant” and the
  docs surface sentence.
- The four light tints moved to §3 (`#D6E3FF`, `#B8EDCE`, `#FFDF9A`, `#FFD6D6`).
  On the darkest quiet panel (Linux light `#EBEBEA`) they now measure 1.081,
  1.097, 1.082 and 1.111; on Windows light 1.105, 1.122, 1.102 and 1.132. The
  soft text floor is still far clear (lowest: `infoSoftForeground` at 9.87:1) and
  the soft edge keeps 1.096:1 at its tightest (`warningSoftBorder`). Dark and
  high-contrast sets do not move.
- `contrastPairs` moved 129 → 133; `overlayWashPairs` and the selection lists are
  unchanged. The public checker reports the new pairs like the rest.
- The extension forced one historical figure to be pinned rather than derived:
  `docs.test.ts`'s selection-regression quote now writes out the pre-091
  `successSoft` (`#C2F4D6`) because plan 300 moved the fill. `ring-soft.test.ts`
  now names `destructiveSoft` (3.18:1) as the tightest ring pair, which the
  deeper tints made true; the `COMPONENTS.md` figure follows.
- Two-direction evidence, run and reverted:
  - **one tint back**: reverting `infoSoft` to `#DEE9FF` failed seven tests —
    the three platform-light pairs, the platform contract, the new suite and two
    docs guards — then passed again;
  - **no quiet panel**: dropping `"muted"` from the soft-surface list failed four
    tests, including the new regression test with `expected [] to deeply equal [
    …(4) ]` and the docs surface guard; restored.
- Green: **36 test files, 1805 tests** (1761 before plan 300).
  `nub run check` and `nub run test` were run and passed.
- The quiet panel is documented in `docs/tokens.md` (tone paragraph, verification
  section), `docs/design-system.md` (§9 row and narrative), the package README,
  `COMPONENTS.md` and `TODO.md`.

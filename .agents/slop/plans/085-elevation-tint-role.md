# 085 — The elevation tint role the theme never painted

| Field | Value |
| ----- | ----- |
| Phase | F (design-system truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `011`, `018`, `056`, `058`, `063`, `066` |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`ThemeColors.shadow` is documented as the **elevation tint** (`packages/tokens/src/color.ts`,
`docs/tokens.md` → Colour roles, `docs/design-system.md` §4). It is not.

- `lightElevation`, `darkElevation` and every platform style's `elevation` block
  carry a **complete colour string per level** (`sm` = `#191D2514`, `md` =
  `#191D251F`, `lg` = `#191D2529`, dark `#00000066`/`#000000A6`/`#000000CC`).
  `elevationShadow` returns that level unchanged.
- Nothing in the package reads `theme.colors.shadow`. `rg "colors.shadow"` over
  `packages/` finds no consumer.
- The platform styles nevertheless set `shadow` in six colour blocks
  (`macos.ts`, `linux.ts`, `windows.ts`, light + dark), so the role *looks*
  applied in a copied style file while painting nothing.

So a consumer who copies a platform style and edits `colors.shadow` — the
documented way to retint elevation — sees no change, and three of the same value
are duplicated per theme instead of being derived from one role. This is the
same "documented but unwired" class of defect plans `060` (reserved `overlay`),
`069` (`scrollbar`) and `077` (`alpha(NaN)`) closed.

The arithmetic proves the intent: every shipped level colour is exactly one
tint at one alpha (identity light `#191D25` at 8 / 12 / 16 %, dark `#000000` at
40 / 65 / 80 %), and the role was authored at a mid alpha (`#191D2526`,
`#00000080`) — i.e. the role was meant to be the **opaque tint**, not a shadow.

## 2. Design decisions (do not re-litigate)

1. **The role becomes the opaque tint; a level becomes geometry + alpha.**
   `ElevationShape` holds `offsetX`, `offsetY`, `blurRadius`, `spreadRadius` and
   `alpha`. `elevationShadow(theme, level)` composes the shape with
   `alpha(theme.colors.shadow, shape.alpha)` into the runtime's five-field
   `BoxShadow`. Editing `colors.shadow` retints every level; the per-level
   opacity stays design data.
2. **`BoxShadow` is unchanged.** It remains the runtime's exact five fields, so
   `elevationShadow` still returns something `StyleDesc.boxShadow` accepts.
3. **A list is still a list.** `elevationShadows(theme, level)` resolves every
   entry for a web renderer; `elevationShadow` returns the first (the runtime
   paints one). A shipped level still holds at most one entry.
4. **The role values become opaque bases** — identity light `#191D25`, every
   other set `#000000` — and every shipped level resolves to its current hex.
   No shipped pixel changes: `alpha("#191D25", 0.08)` is `#191D2514`.
5. **The alpha steps are the documented design data**: identity light
   `0.08 / 0.12 / 0.16`, identity dark `0.4 / 0.65 / 0.8`; macOS
   `0.08 / 0.12 / 0.16` and `0.4 / 0.6 / 0.8`; Linux light
   `0.10 / 0.14 / 0.19`, dark `0.4 / 0.65 / 0.8`; Windows light
   `0.10 / 0.16 / 0.20`, dark `0.4 / 0.65 / 0.8`. (0.19 × 255 = 48.45 → 48 =
   `0x30`, the current Linux `lg` byte; 0.18 would round down to `0x2E`.)
6. **High contrast keeps its shared elevation.** It already used the light/dark
   identity geometry; with the tint now supplied by the theme it becomes pure
   black, which is the correct high-contrast shadow. No new AAA value.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/085-elevation-tint-role.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/color.ts` | four `shadow` values become opaque tints; JSDoc |
| `packages/tokens/src/elevation.ts` | `ElevationShape`; `lightElevation`/`darkElevation` as geometry + alpha; `elevationShadow` composes; new `elevationShadows` |
| `packages/tokens/src/platform-styles/macos.ts` | six-in-one: opaque `shadow`, elevation alphas |
| `packages/tokens/src/platform-styles/linux.ts` | same |
| `packages/tokens/src/platform-styles/windows.ts` | same |
| `packages/tokens/src/platform-styles.example.ts` | authored level uses `alpha` |
| `packages/tokens/src/elevation.test.ts` | assert on resolved shadows; runtime/shape field split |
| `packages/tokens/src/elevation-tint.test.ts` | **new** — the regression test |
| `packages/tokens/src/theme.test.ts` | custom level uses `alpha` |
| `packages/tokens/src/docs.test.ts` | elevation table built from `elevationShadow` |
| `docs/tokens.md` | role rows, Elevation section, verification prose |
| `docs/design-system.md` | §4 shadow row, §8 elevation paragraph |
| `packages/tokens/README.md` | Shadows paragraph |
| `COMPONENTS.md` | *Design tokens* row |
| `TODO.md` | one ticked row, one cross-team row, the section bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's paths.

## 4. Exact changes

### 4.1 `packages/tokens/src/color.ts`

- `ThemeColors.shadow` JSDoc:
  ``/** Opaque elevation tint; each level applies its own alpha. */``
- `lightColors.shadow: "#191D2526"` → `"#191D25"`.
- `darkColors.shadow`, `highContrastLightColors.shadow`,
  `highContrastDarkColors.shadow` → `"#000000"`.
- No other role moves; `colorRoles` still has 54 entries and keeps `shadow` last.

### 4.2 `packages/tokens/src/elevation.ts`

```ts
import { alpha } from "./color.js";
import type { Theme } from "./theme.js";

/** A shadow as GPUix's `StyleDesc.boxShadow` takes it: five fields, no list. */
export interface BoxShadow { offsetX; offsetY; blurRadius; spreadRadius; color }

/** One level's geometry and opacity, before the theme's tint is applied. */
export interface ElevationShape {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blurRadius: number;
  readonly spreadRadius: number;
  /** Opacity of the theme's `shadow` tint, `0…1`. */
  readonly alpha: number;
}

export interface Elevation {
  readonly sm: ElevationShape[];
  readonly md: ElevationShape[];
  readonly lg: ElevationShape[];
  readonly overlay: ElevationShape[];
}
```

Resolve with one private helper:

```ts
const paint = (theme: Theme, shape: ElevationShape): BoxShadow => {
  const { alpha: opacity, ...geometry } = shape;
  return { ...geometry, color: alpha(theme.colors.shadow, opacity) };
};

export function elevationShadow(theme, level): BoxShadow | undefined {
  const [shape] = theme.elevation[level];
  return shape === undefined ? undefined : paint(theme, shape);
}

/** Every shadow a level holds, resolved — for a renderer that composites a list. */
export function elevationShadows(theme, level): ReadonlyArray<BoxShadow> {
  return theme.elevation[level].map((shape) => paint(theme, shape));
}
```

Values (geometry unchanged, `color` → `alpha`):

| Set | sm | md | lg |
| --- | --- | --- | --- |
| identity light | `0 1 2 0`, 0.08 | `0 4 12 -2`, 0.12 | `0 16 40 -8`, 0.16 |
| identity dark | `0 1 2 0`, 0.4 | `0 8 24 -4`, 0.65 | `0 24 56 -12`, 0.8 |

`overlay` stays `[]` in both.

JSDoc: a level is geometry + the theme's tint; the runtime paints one shadow, so
`elevationShadow` resolves the first and `elevationShadows` resolves the list.
Keep the plan-018 note that a level with two entries renders one.

### 4.3 `packages/tokens/src/platform-styles/{macos,linux,windows}.ts`

- `colors.light.shadow` and `colors.dark.shadow` → `"#000000"`.
- Every elevation entry: drop `color`, add `alpha` from §2.5. Geometry is
  unchanged.
- Add one JSDoc sentence per file: elevation levels apply their own alpha to the
  `shadow` tint, so a copied style retints all three by editing one role
  (plan 085).

### 4.4 `packages/tokens/src/platform-styles.example.ts`

`contosoPlatformStyle.elevation.light.md[0]`: drop `color: "#00000024"`, add
`alpha: 0.14`.

### 4.5 `packages/tokens/src/elevation.test.ts`

Keep the plan-018 guarantee, restated against the resolved shadow:

- `never carries more than the one shadow the runtime paints` — unchanged
  (levels still arrays).
- `uses exactly the runtime's shadow fields` — assert
  `Object.keys(elevationShadow(theme, level))` equals the five runtime fields,
  and `Object.keys(shape)` equals the four geometry fields + `alpha`.
- `paints a colour the runtime can parse` — resolved `color` matches the hex
  pattern.
- `keeps the overlay level reserved and empty` — unchanged.
- `paints a different shadow in light and dark` — compare resolved `md` colours.

### 4.6 `packages/tokens/src/elevation-tint.test.ts` (new)

Header: the bug guarded — `colors.shadow` was documented as the elevation tint
but no level read it, so editing the role in a copied platform style changed no
shadow while the level colours duplicated the same tint three times.

1. `retints every level from the theme's shadow role` — `extendTheme(lightTheme,
   { colors: { shadow: "#FF0000" } })`; `elevationShadow(custom, level).color`
   is `#FF0000` followed by the documented alpha byte (`14`, `1F`, `29`) for
   `sm`/`md`/`lg`.
2. `composes the documented tint into the runtime shadow` —
   `elevationShadow(lightTheme, "md")` deep-equals
   `{ offsetX: 0, offsetY: 4, blurRadius: 12, spreadRadius: -2, color: "#191D251F" }`;
   dark `lg` → `#000000CC`.
3. `keeps the painted pixels the pre-085 levels shipped` — the resolved colours
   for identity light/dark, macOS, Linux and Windows light/dark equal the
   historical hex table (`#191D2514` … `#00000033`).
4. `every shipped theme declares an opaque tint` — `getTheme` four levels and
   `getPlatformTheme` for `platformNames` × modes: `colors.shadow` matches
   `/^#[0-9A-F]{6}$/`.
5. `resolves the whole level for a compositing renderer` —
   `elevationShadows(lightTheme, "md")` has one entry equal to
   `elevationShadow(lightTheme, "md")`; `elevationShadows(…, "overlay")` is `[]`.

### 4.7 `packages/tokens/src/theme.test.ts`

`replaces a whole elevation level`: the custom level becomes
`{ offsetX: 0, offsetY: 2, blurRadius: 4, spreadRadius: 0, alpha: 0.2 }`; assert
the level is replaced and `elevationShadow(custom, "md")?.color` is
`alpha(lightTheme.colors.shadow, 0.2)`.

### 4.8 `packages/tokens/src/docs.test.ts`

`documentedShadow` takes `BoxShadow | undefined`; the row builder calls
`elevationShadow(themes.light, level)` / `elevationShadow(themes.dark, level)`.
Drop the now-unused `lightElevation`/`darkElevation` imports if nothing else
uses them. Add a prose guard: the Elevation section names `colors.shadow` and
`elevationShadows`.

### 4.9 `docs/tokens.md`

- Colour table: `shadow` `#191D25` / `#000000`, Use cell
  "elevation tint (opaque; each level applies its own alpha)".
- High-contrast table: `shadow` `#000000` / `#000000`, same Use cell.
- Elevation section: a level is geometry + alpha; the resolved table stays (its
  guard now reads `elevationShadow`); add the sentence that
  `colors.shadow` is the one tint and `elevationShadows` resolves a whole list
  for a compositing renderer. Example gains an `extendTheme(base, { colors: {
  shadow: "#000000" } })` retint line.
- *Extension API* merge rules: elevation replaces the level; a level is a shape +
  alpha.
- Verification section: add the plan-085 outcome (one tint, three alphas, the
  role was dead).

### 4.10 `docs/design-system.md`

- §4 table row: `| shadow | graphite | black |`.
- §8 Elevation paragraph: the tint is `colors.shadow`, each level applies its
  own alpha, and retinting a brand is one role.

### 4.11 `packages/tokens/README.md`

Shadows paragraph: the role is the tint, a level is geometry + alpha,
`elevationShadow` resolves the painted shadow and `elevationShadows` the list.

### 4.12 `COMPONENTS.md`

*Design tokens* row: say elevation resolves through `elevationShadow` from the
`shadow` tint plus the level's alpha. No status change.

### 4.13 `TODO.md`

- Add a ticked row:
  `[x] Make the documented elevation tint real — colors.shadow was never read, so a copied platform style retinted nothing; a level is now geometry + alpha resolved by elevationShadow (plan 085)`
- Add a cross-team row: `primitives`/`components` fixtures and
  `style.test.ts:317` still read `elevation.md[0].color`; read
  `elevationShadow(theme, level).color` instead (owner: those workstreams;
  plan 085).
- Section bar `52/68` → `53/69`.

## 5. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/tokens test` | all suites green, including `elevation-tint.test.ts` |
| `nub run --filter @gpuixui/tokens check-types` | clean |
| `nub run check` | clean |
| `nub run lint` | clean |
| `nub run fmt` | clean |
| `nub run test` | every workspace green |

**Two-direction proof** (required before committing):

1. Compose with a fixed `#000000` instead of `theme.colors.shadow`:
   `elevation-tint` #1 must fail (`#FF0000` never appears), #2 and #3 must fail,
   and the docs row must fail. Record the text.
2. Revert one platform tint (`macosPlatformStyle.colors.light.shadow`) to
   `"#191D2526"`: test #4 must fail the opaque-hex assertion. Restore.
3. Change identity light `sm.alpha` from `0.08` to `0.06`: test #3 must fail the
   historical-pixel comparison (`#191D250F` vs `#191D2514`). Restore.

## 6. STOP conditions

Stop and report with evidence if:

- **A shipped level's resolved hex changes.** The alphas in §2.5 are chosen to
  round to the current bytes; a different result means the wrong alpha or tint.
  Do not accept a pixel change silently.
- **`alpha()` or a role value is not an opaque `#RRGGBB`.** A translucent tint
  would be silently re-alphaed; fix the role, not the helper.
- **A consumer package reads `elevation.md[0].color`.** Record it in `TODO.md`
  as the cross-team row; do not edit the other workstream.
- **The docs table cannot be built from `elevationShadow`.** Build it from the
  helper; do not reintroduce a hand-written shadow table.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `elevation-tint` #1 | unit | the role going dead again (the plan-085 defect) |
| `elevation-tint` #2 | unit | the tint/alpha composition changing shape |
| `elevation-tint` #3 | unit | the refactor changing a shipped pixel |
| `elevation-tint` #4 | unit | a platform style shipping a translucent tint |
| `elevation-tint` #5 | unit | a compositing renderer losing the resolved list |
| `elevation.test.ts` | unit | a runtime field leaking into the stored shape or `alpha` leaking into the painted shadow |
| `theme.test.ts` | unit | `extendTheme` no longer replacing a whole level |
| `docs.test.ts` | unit | the elevation table drifting from the resolved shadows |
| `docs.test.ts` public values | unit | `elevationShadows` shipping undocumented |
| generic colour loops | unit | a role edit that breaks the 54-role contract |

## 8. Outcome (executed on this host, 2026-10-17)

- `colors.shadow` is now the opaque tint — identity light `#191D25`, every other
  shipped set `#000000` — and `elevationShadow` composes it with the level's
  alpha. Six duplicate colour strings per platform collapsed to one tint.
- Painted pixels are unchanged: identity light `#191D2514` / `#191D251F` /
  `#191D2529`; identity dark `#00000066` / `#000000A6` / `#000000CC`; macOS light
  `#00000014` / `#0000001F` / `#00000029`; macOS dark `#00000066` / `#00000099` /
  `#000000CC`; Linux light `#0000001A` / `#00000024` / `#00000030`; Linux dark
  `#00000066` / `#000000A6` / `#000000CC`; Windows light `#0000001A` /
  `#00000029` / `#00000033`; Windows dark `#00000066` / `#000000A6` /
  `#000000CC`.
- Two-direction proof (`nub run --filter @gpuixui/tokens test`):
  - composing with a fixed `#000000` instead of the role produced **6 failed /
    1299 passed**: the retint test (`expected ['#00000014', …] to deeply equal
    ['#FF000014', …]`), the composition test, the historical-pixel test
    (`light: expected ['#00000014', …] to deeply equal ['#191D2514', …]`), the
    docs elevation row, the `extendTheme` level test and the consumer type check
    (the unused `theme` parameter);
  - restoring macOS light's tint to `#191D2526` produced **2 failed / 1303
    passed**: the opaque-tint guard (`expected '#191D2526' to match
    /^#[0-9A-F]{6}$/`) and the historical pixels;
  - identity light `sm.alpha` 0.08 → 0.06 produced **3 failed / 1302 passed**:
    the retint (`'#FF00000F'`), the historical pixels (`'#191D250F'`) and the
    docs row (`#191D250F`).
- Suites green: 23 files, 1305 tests.

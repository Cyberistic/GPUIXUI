# 063 — Platform style variants: macOS, Linux, Windows and Default

**Phase:** B (the foundation the docs platform toggle renders).
**Owner:** `tokens-theme`.
**Depends on:** 051 (platform type styles), 053 (branch reconciliation), 056–062
(docs-truth guards).
**Status:** done.

## 0. Why

`MISSION.md` §*Platform styles* makes three built-in platform style variants a
first-class requirement: **macOS, Linux and Windows**, plus the **Default**
identity. They must be real, editable token themes in `packages/tokens` — not
docs-only CSS — so the Fumadocs platform toggle previews what a native build
renders and a consumer can copy one file, edit it, and ship their own look.

Today `platformTheme(base, platform)` changes **only** the two font families.
That is plan 051's honest answer to "what type does this platform install", but
it is not a style variant: a Windows preview still has the same radii, density,
accent and shadows as macOS. Plan 063 turns the platform table into a real style
table while keeping the default identity untouched.

**Non-goal:** bundling fonts. GPUix 0.10.0 has no `registerFont` (plan 052 is
blocked upstream); `sans` stays `.SystemUIFont` and `mono` names a family each
platform installs. A platform style changes **values**, not the font-loading
story.

## 1. Design

### 1.1 One platform table, two concerns

A new `packages/tokens/src/platform-types.ts` owns the shapes and the GPUI
sentinel, so the style files can import them without a runtime cycle through the
registry:

```ts
export const systemUiFont = ".SystemUIFont";

export interface PlatformStyle {
  /** Families and the human-readable label. */
  readonly types: PlatformType;
  /** Mode-independent structure: radii, density, motion. */
  readonly structure: PlatformStyleStructure;
  /** Mode-specific surfaces and accent roles. */
  readonly colors: Readonly<Record<ThemeMode, Partial<ThemeColors>>>;
  /** Mode-specific shadow levels. */
  readonly elevation: Readonly<Record<ThemeMode, Partial<Elevation>>>;
}

export interface PlatformStyleStructure {
  readonly radius?: Partial<Radius>;
  readonly density?: DensityName;
  readonly motion?: Partial<Omit<Motion, "ease">>;
}
```

`packages/tokens/src/platforms.ts` becomes the registry:

- `platformStyles: Readonly<Record<PlatformName, PlatformStyle>>`, built from the
  four files.
- `platformTypes`, derived from `platformStyles[name].types`, so a platform's
  label and families are written once.
- `currentPlatform` and `systemMonoFamily`, unchanged.
- re-exports of `systemUiFont`, `PlatformName`, `PlatformType` and the style
  shapes, so the public surface stays on `@gpuixui/tokens`.

Each style lives in its own editable file so the "copy one platform theme file"
acceptance is literal:

```
packages/tokens/src/platform-styles/default.ts   — the identity (no overrides)
packages/tokens/src/platform-styles/macos.ts     — macOS / Apple conventions
packages/tokens/src/platform-styles/windows.ts   — Windows 11 conventions
packages/tokens/src/platform-styles/linux.ts     — GNOME / Adwaita conventions
```

The runtime graph stays acyclic: `theme.ts → typography.ts → platforms.ts →
platform-styles/* → platform-types.ts`.

### 1.2 Building a theme

In `theme.ts`, replace `platformTheme(base, platform)` with two functions that
share one merge path:

```ts
/** Apply any platform style, shipped or copied, to a base theme. */
export function applyPlatformStyle(
  base: Theme,
  style: PlatformStyle,
  contrast: ThemeContrast = "default",
): Theme;

/** Resolve a shipped platform style for a mode and contrast. */
export function getPlatformTheme(
  platform: PlatformName,
  mode: ThemeMode,
  contrast: ThemeContrast = "default",
): Theme;
```

`applyPlatformStyle` is what makes the copy-one-file acceptance real: a consumer
copies a style file, edits it, and passes it to the same merge the library uses.
The caller passes the base's contrast level; `getPlatformTheme` does that for the
built-ins.

Rules, in order of priority (accessibility outranks platform resemblance):

1. `platform === "default"` returns `getTheme(mode, contrast)` **unchanged**.
   The default identity is not a variant of itself.
2. `contrast === "default"`: apply `structure`, `types`, `colors[mode]` and
   `elevation[mode]` with `extendTheme`. Name becomes
   `` `${base.name} · ${style.label}` ``.
3. `contrast === "high"`: apply **only** `structure` and `types`; keep the
   high-contrast colour set untouched, because a platform accent that looks
   native is not allowed to drop the AAA floors. Name is suffixed the same way.

Every result is a normal `Theme`: `extendTheme` stays the only extension
mechanism, and `getPlatformTheme(...)` output can be passed to `extendTheme`
again (a consumer's edited look).

### 1.3 The values

Values are chosen to read as the platform, not to bake one vendor's brand. Each
file keeps a short header comment naming the source convention.

| Token group | macOS | Windows | Linux |
| ----------- | ----- | ------- | ----- |
| primary (light / dark) | Apple blue `#0071E3` / `#0A84FF` + dark text | Windows blue `#0067C0` / `#4CC2FF` + dark text | Adwaita blue `#1C71D8` / `#78AEED` + dark text |
| canvas (light / dark) | `#F2F2F7` / `#1C1C1E` | `#F3F3F3` / `#202020` | `#F6F5F4` / `#242424` |
| raised surface | `#FFFFFF` / `#2C2C2E` | `#FFFFFF` / `#2B2B2B` | `#FFFFFF` / `#303030` |
| radius `sm/md/lg/xl` | 4 / 6 / 10 / 12 | 2 / 4 / 8 / 8 | 4 / 6 / 12 / 12 |
| density | `compact` | `comfortable` | `comfortable` |
| motion `fast/normal/slow` | 140 / 180 / 280 | 120 / 160 / 240 | 160 / 200 / 300 |
| mono family | `Menlo` | `Consolas` | `DejaVu Sans Mono` |

The colour overrides cover the surface family (`background`, `card`, `popover`,
`muted`, `border`, `borderStrong`, `input`, `hover`, `active`, `secondary`) and
the accent family (`primary`, `primaryForeground`, `primaryHover`, `accent`,
`accentForeground`, `ring`, `selection`, `selected`, `selectedForeground`).
Status roles, disabled/skeleton/scrollbar, `shadow` and all non-colour scales
inherit the identity. `mutedForeground`, `placeholder` and `secondaryForeground`
are overridden **only if the contrast test proves they fail** on the new
surfaces; the test decides, not taste.

`selection` stays an 8-digit translucent accent wash. Every value is a 6- or
8-digit hex string (GPUix paints no `rgb()`/colour names).

## 2. Files

Create:

- `packages/tokens/src/platform-types.ts` — the sentinel and the
  `PlatformStyle`/`PlatformType` shapes, shared without a cycle.
- `packages/tokens/src/platform-styles/default.ts`
- `packages/tokens/src/platform-styles/macos.ts`
- `packages/tokens/src/platform-styles/windows.ts`
- `packages/tokens/src/platform-styles/linux.ts`
- `packages/tokens/src/testing/contrast.ts` — the WCAG maths and the guarded
  `pairs` list lifted out of `color.test.ts`, so the default and platform suites
  share one list instead of copying it.
- `packages/tokens/src/platform-styles.example.ts` — copy/edit/apply example:
  derive the Windows theme, override its accent, and show that the base is
  untouched.

Change:

- `packages/tokens/src/platforms.ts` — becomes the registry: `platformStyles`,
  the derived `platformTypes`, `currentPlatform`/`systemMonoFamily`, and the
  re-exports of the platform-types module.
- `packages/tokens/src/theme.ts` — delete `platformTheme`, add
  `applyPlatformStyle` and `getPlatformTheme` over one private
  `platformOverrides` helper.
- `packages/tokens/src/platforms.test.ts` — replace the `platformTheme` suite
  with the platform-style suite and the contrast suite.
- `packages/tokens/src/color.test.ts` — import the shared contrast helper; no
  behaviour change.
- `packages/tokens/src/exports.test.ts` — assert `getPlatformTheme` and
  `platformStyles` are exported from the package entry.
- `packages/tokens/src/docs.test.ts` — guard the new docs table.
- `packages/tokens/src/react.test.tsx` — no change unless the provider test
  imports `platformTheme` (it does not).
- `packages/tokens/README.md` — replace the "Platform type" section with
  "Platform styles".
- `docs/tokens.md` — replace "### Platform type" with "### Platform styles":
  the variant table, what each overrides, the high-contrast rule, the copy/edit
  example, and the import list. Update the Verification and Limitations bullets
  that claim platform styles change only families.
- `docs/design-system.md` — §5's "A platform is a font decision here, never a
  second design system" is now false; replace it with the variant model (the
  default identity is the source, the platform styles are derived variants,
  accessibility wins over resemblance).
- `COMPONENTS.md` — change the "Platform type styles" row to "Platform style
  variants" with the four variants, and note that the docs toggle is the
  consumer.
- `TODO.md` — tick the new `tokens-theme` task; add the cross-team row for the
  `docs-site` platform toggle.
- `.agents/slop/plans/README.md` — index this plan.

## 3. Steps and exact commands

Run every command from the worktree root
(`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`). `nub` is the only package
manager; a bare `node` is the wrong toolchain.

1. **Shared contrast helper.** Move the `contrast`, `composite`, `pairs` and
   `PairClass` definitions from `color.test.ts` into
   `src/testing/contrast.ts` (named exports, no test file extension). Import them
   back into `color.test.ts`.
2. **Style data.** Create the four files under `platform-styles/`. Start from
   the table in §1.3 and verify each candidate pair with the step-5 test rather
   than eyeballing it. Use `as const satisfies PlatformStyle` so a missing field
   fails type-check.
3. **Registry and API.** Add the shapes and table to `platforms.ts`; add
   `getPlatformTheme` to `theme.ts`; delete `platformTheme` and its JSDoc. Update
   `platforms.example.ts` to import `getPlatformTheme`.
4. **Tests.** Replace the old `platformTheme` suite with:
   - table completeness: `platformStyles` keys are exactly the four
     `PlatformName`s; every label is non-empty and distinct.
   - default identity: `getPlatformTheme("default", "light")` is
     `lightTheme` (same object) and same for dark/high-contrast.
   - real variants: for each of macOS/Windows/Linux and both modes, the theme
     differs from the identity in `colors.primary`; `darwin` also differs in
     density from the identity, and every variant differs in `radius.md` or
     `radius.lg`; the four `primary` values are distinct.
   - mode isolation: `getPlatformTheme("win32", "dark").colors.background` is
     the Windows dark canvas, not the Windows light canvas.
   - completeness: every platform theme carries all `colorRoles` and all `Theme`
     groups, and `mode` equals the requested mode.
   - no mutation: serialising `lightTheme` before and after leaves it unchanged.
   - composition: `extendTheme(getPlatformTheme("linux", "light"), { colors:
     { primary: "#123456" }, radius: { md: 2 } })` keeps the platform's mono
     family and other values.
   - high contrast: `getPlatformTheme("win32", "dark", "high")` keeps
     `highContrastDarkColors` exactly, applies the Windows mono/radius, and is
     named `High contrast dark · Windows`.
   - contrast: the shared `pairs` list holds every platform theme to the same
     floors as `colorSets` (body 7, secondary 4.5, boundary 3), including the
     composited `selection` wash and soft status surfaces. This is the test that
     can fail when a platform palette edit is unreadable.
5. **Run the package.**
   ```
   nub run --filter @gpuixui/tokens check-types
   nub run --filter @gpuixui/tokens test
   ```
   Expected: both exit 0. Fix values and tests until they do; never weaken a
   floor to make a value pass.
6. **Docs and inventory.** Update `docs/tokens.md`, `docs/design-system.md`,
   `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md` and the plan index.
   The docs table is:
   ```
   | Platform | `sans` | `mono` | Radius `sm/md/lg/xl` | Density | Primary (light) | Primary (dark) |
   ```
   and `docs.test.ts` builds each row from `platformStyles` so a value edit
   cannot ship a lying document. Add a sentence that names all four labels and
   the count `4` variant. Guard it by requiring the label to be present in the
   markdown for every platform.
7. **Gates.**
   ```
   nub run check
   nub run lint
   nub run test
   ```
   Expected: exit 0. `nub run test` runs every workspace; if another workstream
   is red, record it and prove the tokens package is green separately — do not
   edit their paths.

## 4. STOP conditions

Stop and report (with the command and output) rather than improvise when:

- a platform palette cannot meet the contrast floors without becoming a copy of
  the identity — report the measured pair and the candidate value;
- a change would require editing a file outside this workstream's owned paths
  (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`); add the
  cross-team row to `TODO.md` instead;
- `platformTheme` turns out to have a consumer in another worktree that this
  change would break — record it as a cross-team migration row and keep the
  new API additive until they migrate;
- the GPUix `StyleDesc` or `MotionStyle` shape contradicts a value (for example
  a radius or shadow the runtime cannot paint) — quote the pinned `.d.ts`.

## 5. Test plan, including the two-direction proof

The regression this guards: a platform style that is a *name change only*
(plan 051's behaviour) would pass "a theme exists" but does not satisfy the
mission, and an unreadable platform palette would ship silently.

- **Without the implementation** (stash the `platforms.ts`/`theme.ts` change,
  keep the new test file): `getPlatformTheme` is undefined and every platform
  style assertion fails. Prove it once with
  `git stash push packages/tokens/src/platforms.ts packages/tokens/src/theme.ts`
  → run the tokens tests → expect failures → `git stash pop`.
- **With the implementation:** all green.
- A palette value change (for example lightening Windows `primary` until white
  text drops below 4.5:1) must fail the contrast test. Prove it by temporarily
  editing one value, running the test, and reverting.
- The docs guard must fail if a platform row in `docs/tokens.md` is edited to a
  different primary or radius, and if a platform label is removed.

## 6. Acceptance

- [x] `platformStyles` ships exactly `darwin`, `linux`, `win32`, `default`.
- [x] Each real platform changes type, radii, density, motion and its surface +
      accent colours; `default` is the untouched identity.
- [x] `getPlatformTheme` resolves the shipped variants, `applyPlatformStyle`
      applies a copied/edited `PlatformStyle`, and `extendTheme` remains the
      extension mechanism; every result is editable.
- [x] High contrast + platform keeps the AAA colour set and applies only
      structure and type.
- [x] Contrast floors hold for every platform theme in both modes.
- [x] `docs.test.ts` guards the platform table; the docs and README describe the
      variants and the copy/edit story.
- [x] `COMPONENTS.md` row and `TODO.md` task updated; plan indexed.
- [x] `check-types`, package tests, `nub run check`, `nub run lint`,
      `nub run test` pass (or the only failures are in another workstream and
      are recorded).

# 505 — The elevation tint on the AAA dark canvas

**Phase:** F (integration and polish)
**Depends on:** 085 (a level is geometry plus an alpha over `shadow`), 099 (the
AAA dark scrim veils with light), 345 (platform elevation applies at high
contrast), 371 (the colour-format check), 390 (the painted feather ladder), 393
(the composited-fade check the elevation check follows), 387/388 (the shipped
enumeration and its guard).

**Owner:** `tokens-theme`. Paths: `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `TODO.md`, `COMPONENTS.md`.

---

## 1. The defect

`colors.shadow` is the elevation tint: a level is geometry plus an alpha, and
`elevationShadow` applies that alpha to the role (plan `085`). Every
high-contrast dark set — the identity and its five platform/recipe variants —
ships `shadow: #000000` over `background: #000000`, so a dark tint has nothing
to darken:

| Set | Level | Surface | Ratio (before) |
| --- | --- | --- | --- |
| high-contrast dark (all six sets) | `sm`, `md`, `lg` | `background` | **1.000:1** |
| high-contrast dark (all six sets) | `sm` | `card` | **1.030:1** |
| high-contrast dark (all six sets) | `md` | `card` | **1.048:1** |

`docs/design-system.md` §7 says the AAA modal is separated by "a light wash, its
own edge and **elevation**". The wash is true — plan `099` gave the AAA dark
scrim `#FFFFFF26` because a dark veil cannot darken black — but the elevation
half is false on the canvas: a raised card, menu or dialog has no shadow there.
The card and popover still step off the canvas, so the surfaces are not
invisible; the *level* is simply not doing any work.

The second half of the defect is that nothing catches it. `themeContrastFailures`
is the library's guarantee over every composition it documents, but no pair
measures `shadow`: plan `371` holds only its **form** (a six- or eight-digit
hex), and `contrast.test.ts` still keeps `shadow` in the exemption list as "an
elevation tint, never text or a bounded surface". A consumer who copies the AAA
dark palette, or edits `shadow` to its canvas colour, ships an invisible
elevation and all six checks return `[]`.

A platform style makes it worse. Plan `345` applies a platform's elevation level
at high contrast while the AAA tint stays (elevation carries no colour of its
own). Platform dark alphas are 0.4, 0.65 and 0.8 — designed against a dark tint.
A light AAA tint with those alphas would paint a near-white halo, so the light
tint and its own alphas have to be kept together through the platform path.

## 2. The fix

Three changes, one contract.

**1. The AAA dark set paints with light.** Plan `099` already established the
rule for the scrim: on a pure black canvas a dark cue cannot exist. The
elevation follows it.

| File | Value | Before | After |
| --- | --- | --- | --- |
| `src/color.ts` (`highContrastDarkColors`) | `shadow` | `#000000` | `#FFFFFF` |
| `src/elevation.ts` (new `highContrastDarkElevation`) | `sm.alpha` / `md.alpha` / `lg.alpha` | 0.4 / 0.65 / 0.8 | 0.10 / 0.14 / 0.18 |

The geometry stays the identity dark set's (`1/2`, `8/24 -4`, `24/56 -12`), so
the feather ladder plan `390` guards is unchanged. The alphas are the set's own
because a light tint is as potent on black as a dark tint is on white; they are
the light theme's order of magnitude (0.08/0.12/0.16), a step stronger for the
AAA variant.

Measured on the shipped AAA dark surfaces (the composited shadow against the
surface it paints over):

| Level | `background` | `card` | `muted` | `popover` |
| --- | --- | --- | --- | --- |
| `sm` (10%) | 1.207:1 | 1.284:1 | 1.338:1 | 1.319:1 |
| `md` (14%) | 1.353:1 | 1.452:1 | 1.530:1 | 1.502:1 |
| `lg` (18%) | 1.546:1 | 1.683:1 | 1.759:1 | 1.723:1 |

**2. A platform lends geometry; the tint keeps its alpha.** At high contrast,
`applyPlatformStyle` takes each level's geometry (`offsetX`, `offsetY`,
`blurRadius`, `spreadRadius`) from the platform style and the level's **alpha**
from the base theme. An alpha is designed against a tint, so it belongs with it.
At AAA light the result is the identity's 0.08/0.12/0.16 with the platform's
feathers, near the platform's own values; at AAA dark it is the new light set's
0.10/0.14/0.18, never a dark platform's 0.4–0.8 over white. Default contrast is
untouched: the style's own tint, geometry and alpha all apply, as today.

**3. The shadow joins the contrast contract.** `elevationSurfaces` is the four
plain surfaces a raised element can float over (`background`, `card`, `muted`,
`popover`). `themeContrastFailures` walks every defined level in
`elevationLevels`, composites the level's painted shadow over each surface
(the way the skeleton pulse and the modal scrim are measured) and holds it to
the `surface` floor — 1.05:1 at both contrast levels. A missed level is reported
with `foreground: "shadow"`, `wash: "shadow"`, the level's `opacity` and a new
`level` field.

After the fix every shipped set passes. The tightest pair is the one that was
already tightest: **1.061:1** (identity dark, `sm` on `background`). The AAA dark
tightest becomes **1.207:1** (`sm` on `background`) from **1.000:1**.

## 3. Exact changes

### 3.1 `packages/tokens/src/elevation.ts`

Add the ordered index beside the type at the top (the package's index pattern:
the union derives from one list, so a fifth level cannot ship untested):

```ts
/** The elevation levels in documentation order, the reserved `overlay` included. */
export const elevationLevels = ["sm", "md", "lg", "overlay"] as const;

/** A level a surface can be raised to. */
export type ElevationLevel = (typeof elevationLevels)[number];
```

Replace the existing `export type ElevationLevel = keyof Elevation;`.

After `darkElevation`, add:

```ts
/**
 * High-contrast dark elevation. The canvas is pure black, so a dark tint cannot
 * darken it: the identity dark set measured **1.000:1** on the canvas at every
 * level and 1.030:1 at the tightest on the card. This set paints with the light
 * tint instead — the same choice the AAA scrim makes (plan 099) — and its
 * alphas are its own, because a light tint is as potent on black as a dark tint
 * is on white. The geometry is the identity dark set's, so the feather ladder
 * still holds.
 */
export const highContrastDarkElevation: Elevation = {
  sm: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, alpha: 0.1 }],
  md: [
    { offsetX: 0, offsetY: 8, blurRadius: 24, spreadRadius: -4, alpha: 0.14 },
  ],
  lg: [
    { offsetX: 0, offsetY: 24, blurRadius: 56, spreadRadius: -12, alpha: 0.18 },
  ],
  overlay: [],
};
```

Update the `Elevation` JSDoc if it names the level union; it does not.

### 3.2 `packages/tokens/src/theme.ts`

- Import `highContrastDarkElevation` beside `darkElevation` and
  `lightElevation`; import `type ElevationShape` if needed for the helper.
- `highContrastDarkTheme.elevation` (`~line 337`): `darkElevation` →
  `highContrastDarkElevation`.
- Add the composition helpers above `platformOverrides` (`~line 457`):

```ts
/**
 * A style level's geometry with the base theme's opacity. An alpha is designed
 * against a tint — the AAA dark set paints with light, so a dark-mode platform's
 * 0.4–0.8 would paint a near-white halo — so at high contrast the platform's
 * depth applies and the base's opacity stays with its tint.
 */
const withBaseAlpha = (
  base: ReadonlyArray<ElevationShape>,
  style: ReadonlyArray<ElevationShape>,
): ReadonlyArray<ElevationShape> => {
  const [painted] = base;
  return painted === undefined
    ? style
    : style.map((shape) => ({ ...shape, alpha: painted.alpha }));
};

/** Every level a style defines, its geometry kept and its alpha taken from the base. */
const platformElevation = (
  base: Elevation,
  style: Partial<Elevation>,
): Partial<Elevation> => {
  const sm =
    style.sm === undefined ? undefined : withBaseAlpha(base.sm, style.sm);
  const md =
    style.md === undefined ? undefined : withBaseAlpha(base.md, style.md);
  const lg =
    style.lg === undefined ? undefined : withBaseAlpha(base.lg, style.lg);
  const overlay =
    style.overlay === undefined
      ? undefined
      : withBaseAlpha(base.overlay, style.overlay);
  return { sm, md, lg, overlay };
};
```

(`mergeDefined` drops the `undefined` keys, so an omitted level still inherits.)

- In `platformOverrides`, compute the elevation before `structural`:

```ts
const elevation =
  contrast === "high"
    ? platformElevation(base.elevation, style.elevation[base.mode])
    : style.elevation[base.mode];
```

Remove `elevation: style.elevation[base.mode]` from `structural`, and add
`elevation` to both returned objects (the high-contrast branch and the colours
branch). Update the comment above the old line: a level carries no colour, so
the platform's **geometry** applies at every contrast level while an AAA base
keeps its own tint **and the opacity that tint was designed with**.

- `applyPlatformStyle`'s JSDoc (`~line 502`): change "the platform's elevation
  levels" to "the platform's elevation geometry, with the AAA set's opacity".
- `resolveHighContrastPlatformTheme` in `platforms.example.ts`: same wording
  ("radii, density, motion and elevation geometry still apply").

### 3.3 `packages/tokens/src/contrast.ts`

Imports: add `elevationLevels`, `elevationShadow`, `type ElevationLevel` from
`./elevation.js`.

Add beside `overlaySurfaces` (or near `skeletonSurfaces`):

```ts
/**
 * The surfaces a raised element's shadow is painted over. A card (`sm`), a menu
 * or popover (`md`) and a dialog (`lg`) float above the canvas, another card,
 * the quiet panel or a floating surface, so every one is measured. The
 * pointer-state washes are excluded for the same reason the scrim excludes
 * them, and the reserved empty `overlay` paints no shadow.
 */
export const elevationSurfaces = [
  "background",
  "card",
  "muted",
  "popover",
] as const;
```

Add to `ContrastFailure`:

```ts
/** The elevation level a shadow pair was painted at, when the pair is a shadow. */
readonly level?: ElevationLevel;
```

Add the helper beside `fadedVisibilityFailures`:

```ts
/**
 * An elevation level's painted shadow, composited over each surface it can sit
 * on. A level is geometry plus an alpha over the `shadow` tint, so the ratio is
 * the one the runtime paints; a level that composites to its own surface is an
 * invisible shadow. The reserved empty `overlay` paints nothing and is skipped.
 */
const elevationFailures = (
  theme: Theme,
  floors: Readonly<Record<ContrastPairClass, number>>,
): ReadonlyArray<ContrastFailure> =>
  elevationLevels.flatMap((level) => {
    const [shape] = theme.elevation[level];
    const shadow = elevationShadow(theme, level);
    if (shape === undefined || shadow === undefined) {
      return [];
    }
    return elevationSurfaces.flatMap((background) => {
      const painted = compositeOver(shadow.color, theme.colors[background]);
      const ratio = contrastRatio(painted, theme.colors[background]);
      const floor = floors.surface;
      return ratio >= floor
        ? []
        : [
            {
              foreground: "shadow",
              background,
              wash: "shadow",
              opacity: shape.alpha,
              level,
              pairClass: "surface",
              floor,
              ratio,
            },
          ];
    });
  });
```

Call it from `themeContrastFailures`, after `overlayWashPairs`:

```ts
...elevationFailures(theme, floors),
```

Update the `themeContrastFailures` JSDoc bullet list with:

```
 * - `elevationLevels` above `elevationSurfaces` — each defined level's painted
 *   shadow, composited at its own alpha over the surfaces a raised element can
 *   sit on. A level that composites to the surface beneath it has no shadow;
 *   the reserved empty `overlay` is skipped, and a failure names the level and
 *   the fraction.
```

and extend the closing sentence: "a pair through a fade names the fraction, and
an elevation pair names its level."

### 3.4 `packages/tokens/src/color.ts`

`highContrastDarkColors.shadow`: `"#000000"` → `"#FFFFFF"`, with one sentence in
the palette's JSDoc paragraph: on the pure black canvas a dark tint cannot
darken, so the elevation paints with light and its own alphas
(`highContrastDarkElevation`), like the scrim plan `099` gave it.

The default `darkColors.shadow` stays `#000000`; only the AAA dark set moves.

### 3.5 Existing tests to update

- `src/elevation.test.ts`
  - `const levels = [...]` → import and use `elevationLevels`.
  - Add a case holding the index to the interface:
    `expect([...elevationLevels].toSorted()).toEqual(Object.keys(lightElevation).toSorted())`.
  - Replace "follows a high-contrast theme's tint": the AAA dark `lg` colour is
    `#FFFFFF2E` (white at 18%), while the AAA light tint stays `#000000` and
    keeps `lightElevation`.
  - Add `["high-contrast dark", highContrastDarkElevation]` to the `shapes`
    table.
- `src/elevation-tint.test.ts`
  - `levels` → `elevationLevels.slice(0, 3)` (the painted levels) or the index
    with empties skipped.
  - Add AAA dark to the `painted` table:
    `["high-contrast dark", getTheme("dark", "high"), ["#FFFFFF1A",
    "#FFFFFF24", "#FFFFFF2E"]]`.
- `src/platform-contrast-elevation.test.ts`
  - "gives every high-contrast variant its platform's elevation": the level is
    the style's geometry with the base's alpha. Assert the geometry fields
    separately from the alpha (helper:
    `const geometry = (levels) => levels.map(({ alpha, ...rest }) => rest)` with
    `alpha` intentionally discarded — name it `shapeGeometry`), and assert
    `themed.elevation[level][0]?.alpha` equals the base's.
  - Same for recipes.
  - "keeps the AAA shadow tint while taking the platform geometry": the
    expected colour is `alpha(highContrastLightTheme.colors.shadow, base alpha)`,
    not the style's alpha.
  - Add: "keeps the AAA dark light tint and its own opacity through a platform"
    — for each real variant and both AAA modes, the resolved `sm`/`md`/`lg`
    alpha equals `getTheme(mode, "high").elevation.*`'s, and for dark the
    resolved `lg` colour is `#FFFFFF2E`.
- `src/contrast.test.ts`
  - Remove `shadow` from the `exempt` list; the comment says it is measured by
    the elevation walk now. Add `"shadow"` to `measuredRoles` with a one-line
    comment (the walk measures it per level, not through a static pair list).
  - Add cases: `elevationSurfaces` is the four plain surfaces; a theme whose AAA
    dark tint is `#000000` reports three failures on `background` (levels
    `sm`/`md`/`lg`) with `level`, `opacity` and `ratio` set; a level with
    `alpha: 0` reports on every `elevationSurfaces` member for that level.
- `src/contrast-reference.test.ts`
  - Add `"elevationSurfaces"` to `appliedLists`.
- `src/theme-check.test.ts`
  - "catches a format-only defect the contrast check alone passes": use
    `colors: { scrollbar: "rebeccapurple" }` (an exempt role, no pair) so the
    case still proves a format-only defect.
  - Add: "reports an unparseable elevation tint as contrast too" — a theme with
    `shadow: "black"` now yields `["color", "contrast"]` kinds (contrast from
    the elevation walk, `ratio: NaN`), so the doc claim "a role the maths cannot
    parse is reported as NaN" stays true.
- `src/docs.test.ts`
  - Replace the local `elevationLevels` array with the import.
  - Add a case for the elevation paragraph in §7 (below) and a case deriving the
    §9 floor row's surfaces from `elevationSurfaces` and its floor from
    `contrastFloors.*.surface`.
  - Add a case quoting the tightest elevation pair from `shippedThemes`:
    `["Dark", "sm", "background", 1.061]` and the AAA dark before/after figure
    `1.207`.
- `src/inventory.test.ts`: extend the "Theme contrast check" row case to require
  `elevationSurfaces` and `highContrastDarkElevation` in the row.

### 3.6 New test file `packages/tokens/src/elevation-contrast.test.ts`

Header states the defect: the AAA dark set shipped a black tint on a black
canvas (1.000:1 at every level) while no pair measured a shadow, and plan 345's
platform path would have put a dark platform's 0.4–0.8 opacity over a light AAA
tint.

Cases:

1. **Every shipped set paints a shadow on every elevation surface.** Iterate
   `shippedThemes`; for each defined level, composite
   `elevationShadow(theme, level)?.color` over each `elevationSurfaces` member
   and assert `>= contrastFloors[theme.contrast].surface`. (This is the case
   that fails before §2.1: all six AAA dark sets measure 1.000 on
   `background`.)
2. **The AAA dark set paints with light.** `getTheme("dark", "high").colors.shadow`
   is `#FFFFFF`; `elevationShadow(...,"sm"|"md"|"lg")?.color` is
   `#FFFFFF1A`/`#FFFFFF24`/`#FFFFFF2E`; `getTheme("light", "high")` keeps a black
   tint and `lightElevation`.
3. **The regression is reported.** `extendTheme(getTheme("dark", "high"),
   { colors: { shadow: "#000000" } })` returns elevation failures:
   `[{ level: "sm", background: "background", floor: 1.05, ratio: 1, opacity:
   0.1 }, ...]` — filter to `foreground === "shadow"`, assert the three
   `background` entries for `sm`/`md`/`lg` and `ratio` 1.
4. **A collapsed alpha is reported.** `extendTheme(getTheme("light"),
   { elevation: { md: [{ ...mdShape, alpha: 0 }] } })` reports four failures on
   `md`, one per `elevationSurfaces` member, `opacity: 0`, `ratio: 1`.
5. **A platform keeps the AAA geometry and the AAA opacity.**
   `getPlatformTheme("darwin", "dark", "high")`: the `lg` shape's geometry equals
   `platformStyles.darwin.elevation.dark.lg[0]`'s geometry, its `alpha` is
   `0.18`, and the resolved colour is `#FFFFFF2E`; the default-contrast variant
   keeps macOS's own alpha (`0.4`-family), proving only the high path changes.
6. **Every shipped high-contrast platform and recipe passes the contract.**
   `shippedThemes.filter(theme.contrast === "high")` → `themeFailures(theme)` is
   `[]`; each AAA dark variant's `lg` alpha is `0.18` (so no dark platform alpha
   leaks through).
7. **The reserved level is skipped.** Defining `overlay` with a visible shadow
   is measured, an empty `overlay` is not (`themeContrastFailures` on every
   shipped set has no `level: "overlay"` entry), matching plan `369`.
8. **The index owns the levels.** `Object.keys(lightElevation)` and
   `Object.keys(getTheme("dark","high").elevation)` equal `elevationLevels`.

Use `shippedThemes` (the plan-388 guard fails a suite that rebuilds its own
list while claiming "every shipped set").

### 3.7 Docs

`docs/tokens.md`:

- High-contrast colour table (`~line 540`): the `shadow` row's HC dark cell
  becomes `#FFFFFF` (the table is derived by `docs.test.ts`).
- `## Elevation` (`~line 984`): after the existing table and before "The table
  shows the resolved shadow", add:

  > The AAA dark set is the exception to a dark tint: its canvas is pure black,
  > so `shadow` is `#FFFFFF` and `highContrastDarkElevation` carries the set's
  > own alphas (10%, 14% and 18%). The scrim already veils with light for the
  > same reason (plan `099`); a black tint measured **1.000:1** at every level on
  > that canvas. The light elevation still clears the 1.05:1 surface floor on
  > every set — the tightest is **1.061:1** (identity dark, `sm` on
  > `background`) and the AAA dark tightest is **1.207:1** — and
  > `elevationSurfaces` is the surface list the check reads.
- `## Elevation`: state the platform rule: "At high contrast a platform style
  contributes a level's geometry; the base's alpha stays with its tint, so the
  AAA dark set never takes a dark platform's 0.4–0.8 opacity over white."
- In the `themeContrastFailures` section (`~line 1471`): add the elevation
  sentence — each defined level of `elevationLevels` composited at its own alpha
  over `elevationSurfaces`, reported with `wash: "shadow"`, the `opacity` and
  the `level`.
- In "Every colour role is accounted for" (`~line 2580`): `shadow` is no longer
  exempt; only `scrollbar` is. State that `shadow` is measured composited at each
  level's alpha, and keep the plan-371 form sentence.
- In the exported-sets paragraph (`~line 1902`): name
  `highContrastDarkElevation`; in the values it lists, and name
  `elevationLevels`/`elevationSurfaces` where the contract is enumerated.
- Pair-count history: add a sentence — the elevation walk is not a pair list, so
  `contrastPairs` stays 394; the checker gains one composited check per defined
  level and surface (three levels × four surfaces in every shipped set).

`docs/design-system.md`:

- §7 (`~line 276`): extend the AAA dark sentence — it veils with light **and
  shadows with light** (`highContrastDarkElevation`), because a dark tint cannot
  darken pure black; name the 10/14/18% alphas and the 1.207:1 tightest figure.
  Add: "At high contrast a platform's geometry applies and the AAA opacity stays
  with its tint."
- §9 floor table (`~line 491`): add a row after the modal scrim:
  `| elevation shadow (each defined level of \`sm\`/\`md\`/\`lg\` — the reserved \`overlay\` is empty — painted on \`background\`/\`card\`/\`muted\`/\`popover\`) | 1.05:1 | 1.05:1 |`
  and a sentence in the following paragraph: elevation shadows are measured
  composited like the scrim, and the audit found AAA dark at 1.000:1 until plan
  `505`.
- The format paragraph (`~line 589`): replace "the two tint roles have no pair"
  with "`scrollbar` has no pair; `shadow` is measured composited at each level's
  alpha", and correct the `shadow: "black"` sentence — it now fails the contrast
  check as `NaN` as well as the colour check.

`packages/tokens/README.md`:

- `## Shadows`: add the AAA dark light tint, `highContrastDarkElevation` and the
  alpha rule for platforms at high contrast.
- The high-contrast platform paragraph (`~line 651`): "the platform's elevation
  levels" → "the platform's elevation geometry, with the AAA set's own opacity".
- The limitations paragraph (`~line 780`): same correction.

`COMPONENTS.md`:

- **Design tokens** row: add a sentence naming the light AAA dark tint, the
  platform geometry/alpha rule and `elevationSurfaces`.
- **High-contrast theme** row: state that the AAA dark set shadows with light.
- **Theme contrast check** row: add the elevation walk to the list of measured
  compositions (no count), with the tightest figure.
- **Platform style variants** row: the plan-345 sentence now says geometry, not
  alpha.

`TODO.md`: tick the elevation row in the tokens section (one paragraph: the
defect, the values, the platform rule and the contract), and update the section
bar to the current counts (171/228 after the tick).

`.agents/slop/plans/README.md`: add the index row
`| [505](./505-elevation-tint-aaa-dark.md) | The elevation tint on the AAA dark canvas | F | 085, 099, 345, 371, 390, 393 | done |`
and one prose paragraph after the plan-504 paragraph.

## 4. Commands and expected results

Run from the worktree root.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: every file green after the implementation. Before it, the new
`elevation-contrast.test.ts` cases 1/2/3 fail (the AAA dark sets measure 1.000
on `background`; there is no `shadow` pair; the platform alpha is the style's).

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: exit 0. If `platformElevation`'s `Partial<Elevation>` with explicit
`undefined` keys widens, keep the explicit keys and let `mergeDefined` drop them
— do not cast.

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. `nub run check` includes the test-shape guard, lint, format
and the workspace type check.

## 5. STOP conditions

Stop and report instead of improvising if:

- any shipped set fails an elevation pair after §2 — the measurements above were
  taken on this tree; a new failure means a value was mistyped or a set changed;
- the tightest shipped elevation ratio is not `1.061:1` (identity dark, `sm` on
  `background`) or the AAA dark tightest is not `1.207:1` — re-measure and
  update §2 and the docs from the output, never guess;
- a platform AAA dark variant keeps a 0.4–0.8 alpha after §3.2 — the light tint
  must never meet a dark alpha;
- `themeFailures(getTheme("dark", "high"))` returns a failure — the new tint and
  alphas must pass every check;
- a `docs.test.ts` figure disagrees with the suite's output — update the prose to
  the derived figure;
- a change would require editing `packages/primitives`, `packages/components`,
  `apps/docs` or `apps/playground` — record it in `TODO.md` and continue. No
  consumer change is expected: `elevationShadow` already returns the level.

## 6. Test plan (prove both directions)

1. **Fails without the fix.** Add `elevation-contrast.test.ts` cases 1–3 and the
   `contrast.test.ts` shadow case before editing the palette or `contrast.ts`.
   Run the package suite: they fail (no elevation check exists; the AAA dark
   shadow is black).
2. **Passes with the fix.** Apply §3.1–§3.4 and re-run; every case green.
3. **The regression can be re-broken.** Temporarily revert
   `highContrastDarkColors.shadow` to `#000000` and confirm case 1/2/3 go red;
   restore. Temporarily put `elevation: style.elevation[base.mode]` back in the
   high-contrast branch and confirm the platform case goes red; restore.
4. **The contract is not vacuous.** Set a light theme's `md.alpha` to `0` and
   confirm four failures; restore.
5. **Every shipped set.** The suite enumerates `shippedThemes`; the plan-388
   guard fails a claiming suite that rebuilds its own list.
6. **Docs.** `docs.test.ts` must pass with the derived figures; the §9 row is
   literal, and the new cases derive its surfaces and floor from
   `elevationSurfaces` and `contrastFloors`.

## 7. Acceptance

- `elevationLevels` is exported and equals the `Elevation` keys;
  `ElevationLevel` derives from it.
- The AAA dark set ships `shadow: #FFFFFF` and
  `highContrastDarkElevation` (0.10/0.14/0.18 over the identity dark geometry);
  every other set keeps its tint.
- At high contrast, `applyPlatformStyle` and the recipes take a style's level
  geometry and the base's alpha; default contrast is unchanged.
- `elevationSurfaces` is exported and `themeContrastFailures` measures every
  defined level composited at its alpha over it, reporting `wash: "shadow"`,
  `opacity` and `level`; `contrastPairs` stays 394.
- Every one of the 24 shipped sets passes `themeFailures`; the tightest
  elevation pair is 1.061:1 (identity dark, `sm` on `background`), the AAA dark
  tightest is 1.207:1 (`sm` on `background`) from 1.000:1.
- `shadow` is measured, not exempt; `scrollbar` is the only exempt role.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
  `COMPONENTS.md` and the plan index state the light AAA dark tint, the platform
  geometry/alpha rule, the surfaces and the figures; every quoted ratio is
  derived by `docs.test.ts`.
- The three gates are green and the branch is pushed.

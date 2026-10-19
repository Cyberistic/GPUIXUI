# 618 — A default request takes the requested palette's elevation opacity

**Phase:** F (the level/palette/elevation contract) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 301 (a shape-only style keeps the base's level), 373 (a forced
default palette is whole), 505 (the AAA dark elevation paints with light and its
own alphas), 541 (the level decides the palette, name, declaration and elevation
opacity), 545 (re-applying a style is idempotent), 551 (`undefined` colour
segments inherit the requested palette) ·
**Number block:** 500–699 (`tokens-theme` overflow; 617 is the last landed plan
and this takes 618).

## 1. The gap

`applyPlatformStyle(base, style, "default")` on a **high-contrast** base with a
style that contributes **colours** builds the default palette of the base's mode
(plan 373) and declares `default` (plan 541). It does **not** take that palette's
elevation:

```ts
elevation:
  level === "high"
    ? mergeDefined(
        palette.elevation,
        platformElevation(palette.elevation, style.elevation[base.mode]),
      )
    : style.elevation[base.mode], // merged by extendTheme over the *base*
```

`extendTheme(base, …)` merges that partial elevation over `base.elevation`. When
`level` is `"default"` over an AAA base, `base` is still the AAA theme, so **every
level the style does not name keeps the AAA shape and alpha**. The palette
replacement of plan 373 covers colours only; the elevation's opacity still comes
from the theme the request is leaving.

The result is a theme the library's own checker rejects. On the shipped AAA dark
set, a valid copied style that names one colour and no elevation level returns:

- `contrast: "default"`, `colors.shadow: "#000000"` (the default palette's tint),
- `elevation.sm.alpha: 0.10`, `md: 0.14`, `lg: 0.18` (the **AAA** alphas, designed
  for a light tint) instead of the default dark set's `0.40 / 0.65 / 0.80`,
- `themeFailures(result)` — **15 failures**, all `elevation` surface pairs under
  the 1.05:1 floor (worst 1.0175:1, `sm` on the canvas), because a 10% black
  shadow is not perceivable on the default dark canvas.

The caller did nothing wrong: the style is a shape/colour override set, and the
docs say an omitted elevation level inherits the identity. The bug is that it
inherits the identity of the **base** rather than the palette the request
resolved.

No shipped value moves: every shipped style names `sm`, `md` and `lg` in both
modes, and a same-level application has `palette === base`, so the old and new
expressions are identical there. The defect needs a copied style that omits an
elevation level — exactly the "copy a file and edit it" path the docs teach.

## 2. Decision

One owner for the elevation, as plan 541 already decided for the palette: **the
requested level's palette owns every level the style does not name**, in both
branches.

```ts
elevation:
  level === "high"
    ? mergeDefined(
        palette.elevation,
        platformElevation(palette.elevation, style.elevation[base.mode]),
      )
    : mergeDefined(palette.elevation, style.elevation[base.mode]),
```

- `level === "default"`, `palette === base` (same-level base): the merge is over
  the base's own elevation, so a brand's edited level survives — the existing
  guarantee.
- `level === "default"`, `palette !== base` (an AAA base asked for `"default"`):
  the merge is over the default-level identity, so an unnamed level takes the
  default palette's geometry and alpha, and a named level takes the style's.
- `level === "high"` is unchanged; plan 505/541 already keep the AAA opacity
  while lending the platform geometry.

Rejected alternatives:

- **Fix only the alpha and keep the base's geometry.** It would repair the
  checker, but the docs say the palette decides the opacity and a forced
  palette is whole; keeping AAA geometry on a default palette leaves two
  identities in one theme. The `high` branch already replaces unnamed levels
  with the requested palette's, so the default branch matches it.
- **Always use `getTheme(base.mode, level).elevation`.** It would discard a
  same-level base's edits, which plan 541 explicitly keeps; the `palette`
  lookup already handles both cases.
- **Document the mixed elevation as intended.** A library-produced theme that
  fails the library's own `themeFailures` is not a design choice.

## 3. Exact edits

### 3.1 `packages/tokens/src/theme.ts`

In `platformOverrides`, replace the `elevation` ternary's `else` arm:

| Before | After |
| ------ | ----- |
| `        : style.elevation[base.mode],` | `        : mergeDefined(palette.elevation, style.elevation[base.mode]),` |

Do not touch the `level === "high"` arm. Update the comment above the returned
object (the existing "One decision, four consequences" block) with one sentence:

```
  // A same-level base keeps its edited levels because `palette` is the base; a
  // requested level supplies the levels its style does not name.
```

Also extend the `applyPlatformStyle` JSDoc's `"default"` bullet (line ~584) with
the elevation sentence:

```
 *   taking the roles and elevation levels it does not name from the
 *   default-level identity of the same mode, so the result is a whole palette
 *   and one elevation ladder rather than half an AAA one (plans 373 and 618).
```

### 3.2 `packages/tokens/src/applied-level.example.ts`

Add a copied-style example after `windowsHigh`, and update the file header's
first paragraph to name the elevation rule:

```ts
/** A copied style that names a colour and leaves the elevation to the palette. */
export const colourOnlyStyle: PlatformStyle = {
  ...platformStyles.default,
  types: { ...platformStyles.default.types, label: "Colour only" },
  colors: {
    light: { primary: getTheme("light").colors.primary },
    dark: { primary: getTheme("dark").colors.primary },
  },
  elevation: { light: {}, dark: {} },
};

/** A default request over the AAA dark base: the default palette's shadows. */
export const defaultFromHighContrast = applyPlatformStyle(
  getTheme("dark", "high"),
  colourOnlyStyle,
  "default",
);
```

Imports: add `type PlatformStyle` to the `./platforms.js` import.

Header addition: "An omitted elevation level follows the palette too: a default
request takes the levels its style does not name from the requested palette, not
from the AAA base it is leaving."

### 3.3 `packages/tokens/src/applied-level-elevation.test.ts` (new)

Header states the guarded bug: a default request over the AAA dark base with a
colour-bearing style that names no elevation kept the AAA alphas on the default
palette's black tint, so `themeFailures` reported 15 elevation pairs and the
documented call returned a theme the library rejects.

Cases:

1. **"takes the requested palette's levels for a style that names none"** —
   `defaultFromHighContrast.contrast === "default"`; for every `elevationLevel`,
   `elevationShadow(defaultFromHighContrast, level)` deep-equals
   `elevationShadow(getTheme("dark"), level)`; `themeFailures(...)` is `[]`.
2. **"keeps a level the style names and takes the rest from the palette"** — a
   local style with `elevation.dark.sm` replaced by a distinctive shape (e.g.
   `blurRadius: 3`, `alpha: 0.5`); after applying at `"default"` over the AAA
   dark base, `elevationShadow(out, "sm")?.blurRadius === 3` while `md`/`lg`
   equal the default identity's.
3. **"keeps a same-level base's edited level"** — a default dark base extended
   with `elevation: { md: [{ …default md, blurRadius: 7 }] }`; apply a
   colour-bearing style with no elevation; the base's `md.blurRadius` is 7.
4. **"still honours a high request"** — a default dark base with
   `platformStyles.win32` at `"high"`: every level's shadow colour equals the
   AAA dark identity's, as plan 505 decided (re-asserted here because the edited
   ternary must not change the branch).
5. **"the light set is unchanged"** — `applyPlatformStyle(getTheme("light",
   "high"), colourOnlyStyle, "default")` equals
   `elevationShadow(getTheme("light"), level)` for every level; the light AAA
   set already carries the default light alphas, so the case documents the
   asymmetry rather than claiming a second defect.

Use `themeFailures` from `./theme-check.js`, `elevationLevels`/`elevationShadow`
from `./elevation.js`, and the two example exports.

### 3.4 `docs/tokens.md`

In the "A `"default"` request builds the default palette…" paragraph (line ~731),
after "A role the style sets to `undefined` is unnamed too…", add:

```
The elevation is the same decision: a level the style does not name comes from
the palette the request resolved, so a copied style that names no shadow keeps a
default request's elevation opacity instead of inheriting the AAA alphas the
request is leaving (plan `618`).
```

### 3.5 `packages/tokens/README.md`

In "The applied theme carries the level it declares…" (line ~977), after the
`undefined` colour sentence, add:

```
An elevation level the style does not name follows the same rule: it comes from
the palette the request resolved, so a copied style that names no level cannot
carry the AAA dark alphas onto a default palette (plan 618).
```

### 3.6 `docs/design-system.md`

In §11's "A requested level decides the palette…" paragraph (line ~947), after
"coming from the identity at that level", add:

```
An elevation level a style does not name comes from that same identity, so a
requested level carries one shadow ladder, not the AAA alphas under the default
palette's tint (plan `618`).
```

### 3.7 `COMPONENTS.md`

Append to the **Platform style variants** row, after the `applyPlatformStyle`
level sentence:

```
A requested level supplies the elevation levels a copied style does not name,
because the palette owns the opacity: a colour-bearing style with no shadow
applied at `"default"` over the AAA base previously kept the AAA alphas on the
default tint and `themeFailures` reported the elevation pairs (plan 618).
```

### 3.8 `.agents/slop/plans/README.md`

Add the row after `617`:

```
| [618](./618-applied-default-elevation.md) | A default request takes the requested palette's elevation opacity | F | 301, 373, 505, 541, 545, 551 | done |
```

Append one paragraph in the established voice: the `"default"` branch of
`applyPlatformStyle` merged a partial style's elevation over the **base**, so a
copied style that names colours but no level kept the AAA alphas on the default
palette's black tint; `themeFailures` rejected the library's own result (15
elevation pairs, worst 1.0175:1). The branch now merges over the requested
palette's elevation, named levels still win, same-level edits survive, and no
shipped value moves.

### 3.9 `TODO.md`

Add one ticked row under "Design tokens and theming (`tokens-theme`)", before the
cross-team rows:

```
`[x]` Make a default request own its elevation — `applyPlatformStyle`'s
`"default"` branch merged a style's partial elevation over the **base**, so a
copied style that named a colour but no level, applied to an AAA base asking for
`"default"`, declared the default palette with its black `shadow` tint but kept
the AAA alphas (0.10/0.14/0.18 instead of 0.40/0.65/0.80) and `themeFailures`
reported 15 elevation pairs (worst 1.0175:1); the levels a style does not name
now come from the requested palette, a named level still wins, a same-level
base keeps its edits, and every shipped style already names `sm`/`md`/`lg`, so
no shipped pixel moves (plan 618)
```

Bump the section header from `260/332` to `261/333`; the bar stays
`████████░░` (261/333 = 78.4%, the same tenth).

## 4. Test plan and both directions

The new case must fail on the pre-fix tree. Write §3.3 first and run:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme/packages/tokens
nub exec vitest run src/applied-level-elevation.test.ts
# EXPECT: FAIL — `defaultFromHighContrast`'s `sm`/`md`/`lg` shadows equal the
# AAA dark set's, and `themeFailures` is non-empty (15 elevation pairs).
```

Apply §3.1, then:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme/packages/tokens
nub exec vitest run src/applied-level-elevation.test.ts
# EXPECT: all five cases pass.
```

Prove the other direction on the code (git, not `jj`; PLAN D1):

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/theme.ts
cd packages/tokens
nub exec vitest run src/applied-level-elevation.test.ts
# EXPECT: FAIL on the pre-fix ternary with the elevation failure list.
cd ../..
git stash pop
cd packages/tokens
nub exec vitest run src/applied-level-elevation.test.ts
# EXPECT: pass.
```

Then the package and repo gates:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens test
# EXPECT: every file passes (161 files / 6,044 tests before this plan; the new
# file adds five and examples.test.ts stays green because the new exports run).
nub run check
nub run lint
# EXPECT: clean.
nub run test
# EXPECT: every workspace's suite passes.
```

If the full `nub run test` is red for a reason outside `packages/tokens`, record
the failing workspace and its output in the commit message; do not edit another
workstream's paths.

## 5. STOP conditions

Stop and report, do not improvise, if:

- the shipped style files name an elevation level other than
  `sm`/`md`/`lg`/`overlay`, or one ships an empty `md`/`lg`, so a shipped value
  could move — the plan's no-pixel-move claim is wrong;
- `getTheme("dark", "default")` and `getTheme("dark", "high")` carry the same
  alphas — the premise (a visible difference) is wrong;
- `themeFailures(defaultFromHighContrast)` is already `[]` before the fix — the
  probe did not reproduce the defect;
- `mergeDefined(palette.elevation, …)` changes a **same-level** application —
  `palette === base` there, so it must be byte-identical to the old result;
- a docs guard (`docs.test.ts`, `readme.test.ts`, `snippets.test.ts`) fails on a
  sentence added in §3.4–§3.6 — narrow the sentence to the guard's claim, do not
  edit the guard;
- `examples.test.ts` reports an example that no suite imports — import the new
  exports from the new test.

## 6. Acceptance criteria

- `applyPlatformStyle(highContrastDarkTheme, colourOnlyStyle, "default")` declares
  `default`, paints every elevation level with `getTheme("dark")`'s shadow, and
  returns `[]` from `themeFailures`.
- A style that names one level keeps that level and takes the rest from the
  requested palette.
- A same-level base keeps an edited level; a `"high"` request still keeps the AAA
  opacity on the platform geometry.
- The pre-fix file fails the new suite; the post-fix file passes it. Both
  directions are observed, not asserted.
- `nub run --filter @gpuixui/tokens test`, `nub run check` and `nub run lint`
  pass; no path outside `packages/tokens`, `docs/`, `COMPONENTS.md`, `TODO.md`
  and `.agents/slop/plans/` is touched.
- No shipped token value, colour pair, floor, metric, platform style, recipe or
  theme name moves.

## 7. Cross-team

None. The fix is internal to `applyPlatformStyle`; a consumer that copies a
platform style and applies it at a requested level is the beneficiary. No
consumer file changes.

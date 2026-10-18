# Plan 373 — the default palette a caller asked for

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the theme builder), 063 (platform style variants), 073 (a theme declares
its floors), 301 (an applied style declares the level it carries), 323 (an
`undefined` colour is not an override), 345 (a high-contrast variant keeps its
elevation).

**Status:** done (2026-10-18). Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`applyPlatformStyle(base, style, "default")` on a high-contrast base is a
documented call: "Naming `"default"` on a high-contrast base applies the platform
colours, so the returned theme declares `default` — the AAA palette is no longer
there" (`docs/tokens.md`, Theme API). Plan 301 made the **declaration** follow
the palette. It did not make the **palette** whole.

A platform style overrides only the roles it names. The roles it leaves out —
the soft status tints, their text and edges, the disabled pair — are inherited
from the base. When the base is the AAA set and the caller asks for default
floors, the result is half a palette: default-level surfaces from the style, AAA
tints and dividers from the base. The library's own checker reports it:

```ts
import {
  applyPlatformStyle,
  getTheme,
  platformStyles,
  themeContrastFailures,
} from "@gpuixui/tokens";

const half = applyPlatformStyle(
  getTheme("light", "high"),
  platformStyles.win32,
  "default",
);

half.contrast; // "default"
themeContrastFailures(half);
// [
//   { foreground: "border", background: "infoSoft", ratio: 1.0133, floor: 1.05, … },
//   { foreground: "border", background: "destructiveSoft", ratio: 1.0215, floor: 1.05, … },
// ]
```

Every combination of mode × real shipped style (macOS, Linux, Windows) applied
this way, measured on this tree:

| Theme | Failures |
| ----- | -------- |
| light / macOS | `border` on `destructiveSoft` 1.0248 < 1.05 |
| light / Linux | `border` on `destructiveSoft` 1.0162 < 1.05 |
| light / Windows | `border` on `infoSoft` 1.0133 < 1.05, on `destructiveSoft` 1.0215 < 1.05 |
| dark / Linux | `infoSoft` on `card`/`popover`/`muted` 1.0375 < 1.05; `successSoft` on the same three 1.0346 < 1.05 |

Dark macOS and dark Windows pass by luck of their canvases. The page documents
the residual: "A style overrides only the roles it names, so a mixed palette can
still miss a default-floor pair … and `themeContrastFailures` reports it rather
than rewriting the consumer's palette (plan `301`)." That caveat is honest, but
the call that produces it is a **shipped call with shipped inputs**: a consumer
who wants a high-contrast base with a platform's default palette gets a theme the
library's contract rejects, and the only remedy the docs offer is to stop asking
for it.

The declaration is not the problem — it is correct (`contrast: "default"`). The
palette behind it is. Asking for the default level is asking for the default
palette; the roles the style does not name belong to that palette, not to the
AAA one being replaced.

## 2. Decision

When `applyPlatformStyle` applies colour to a base that declares a **different**
contrast level, it rebases the palette on the **default-level identity of the
same mode** before merging the style's roles. Concretely, the unnamed roles come
from `getTheme(base.mode, "default").colors`, not from `base.colors`.

Rules this preserves:

- **Same level keeps the consumer's palette.** When the base already declares the
  level being applied (`base.contrast === "default"` for a colour application),
  the merge is unchanged: edits a consumer made on top of the identity survive,
  and a style still overrides only the roles it names. This is plan 301's
  "rather than rewriting the consumer's palette".
- **`undefined` is still not an override** (plan 323): a style whose colour
  object names no defined role applies no colour and keeps the base's level and
  palette.
- **AAA application keeps the AAA colours** (plan 301): naming `"high"` on any
  base applies only families, shape and elevation, so no palette is mixed.
- **The shipped variants do not move.** `getPlatformTheme(platform, mode)` and
  `getPlatformTheme(platform, mode, "high")` already start from a base at the
  requested level, so the rebase branch is not taken and every pixel, colour,
  pair and floor stays exactly as it is.

Rejected alternatives:

- **Name every soft, status, disabled and edge role in each platform file** —
  four files × two modes would repeat the identity values, and the next identity
  tint edit would leave them stale. A copied style would still be partial, so the
  class of defect survives.
- **Leave the mixed palette and keep the caveat** — a shipped call with shipped
  inputs should not return a theme its own contract rejects. The caveat becomes
  the place a defect hides; plans 098 and 310 fixed exactly this class in the
  copy-and-own examples.
- **Throw or reject the combination** — the builders are merges, not validators
  (plan 372's rejected alternative). `extendTheme` and `applyPlatformStyle`
  return a theme; the three checkers report what is wrong.
- **Rebase on every application** — it would discard a consumer's default-level
  edits whenever a style does not name them, which is the opposite of "a style
  overrides only the roles it names" and would break the brand-theme path.
- **Rebase on `getPlatformTheme(platform, mode)` and copy its colours** — it
  would drop a consumer's same-level edits for the same reason, and would make
  the function depend on the shipped-style registry rather than on the style it
  was handed.

No shipped theme, platform variant or recipe changes, so this plan moves **no
token value, colour, pair or floor** and changes no rendered pixel. The only
behaviour change is the documented forced-level call.

## 3. Exact edits

### 3.1 `packages/tokens/src/theme.ts` — rebase the palette

Immediately above `platformOverrides` add:

```ts
/**
 * The palette an applied platform colour set is written over. A theme that
 * already declares the default level keeps its own colours, edits included. A
 * base at another level is replaced as a set, because a platform palette is
 * designed at the default floors and the roles a style does not name must not
 * stay behind from a palette the caller asked to leave (plan 373).
 */
const appliedPalette = (base: Theme): ThemeColors =>
  base.contrast === "default"
    ? base.colors
    : getTheme(base.mode, "default").colors;
```

Then replace the final `return` of `platformOverrides`:

```ts
  return {
    ...structural,
    colors,
    // The declaration follows the palette: a defined platform colour is an
    // override designed at the default floors, while an undefined one inherits
    // the base role and leaves the base's level alone.
    contrast: appliesColors ? "default" : base.contrast,
  };
```

with:

```ts
  return {
    ...structural,
    colors: appliesColors ? { ...appliedPalette(base), ...colors } : colors,
    // The declaration follows the palette: a defined platform colour is an
    // override designed at the default floors, while an undefined one inherits
    // the base role and leaves the base's level alone.
    contrast: appliesColors ? "default" : base.contrast,
  };
```

`ThemeColors` is already imported as a type in this module, and `getTheme` is
declared above `platformOverrides`, so no import changes.

Extend the `applyPlatformStyle` JSDoc paragraph after the sentence about a style
with no colour overrides:

```
 * Naming `"default"` on a base at another level replaces the palette as a set:
 * the roles the style does not name come from the default-level identity of the
 * same mode, so the returned theme is held to the floors it declares and
 * `themeContrastFailures` returns `[]` for every shipped style. A base that
 * already declares the level keeps its own colours, so a consumer's edits and a
 * style's unnamed roles are untouched.
```

### 3.2 `packages/tokens/src/platform-claim.test.ts` — tighten the first guard

The first case currently accepts the mixed palette:

```ts
    expect(dropped.contrast).toBe("default");
    // The mixed palette keeps the AAA roles the style does not override, so the
    // checker still reports the one divider they no longer satisfy; what the fix
    // removes is the AAA judgement of a default palette.
    const declared = themeContrastFailures(dropped);
    const aaa = themeContrastFailures(dropped, "high");
    expect(declared.length).toBeLessThan(aaa.length);
    expect(declared.every(({ floor }) => floor < 7)).toBe(true);
```

Replace it with the whole-palette guarantee, and update the file's header
comment to say plan 373 finished what 301 started:

```ts
    expect(dropped.contrast).toBe("default");
    expect(themeContrastFailures(dropped)).toEqual([]);
    // The theme is a default-level palette now, so the AAA judgement has
    // failures to report; the call no longer carries AAA colours.
    expect(themeContrastFailures(dropped, "high").length).toBeGreaterThan(0);
```

Also add `import { platformStyles, type PlatformStyle }` is already there; no new
import needed. The `dark`/`default` cases are unchanged.

### 3.3 `packages/tokens/src/applied-palette.test.ts` — new regression file

Header comment states the guarded bug: **`applyPlatformStyle(highBase, style,
"default")` replaced only the roles a style names, so the inherited AAA soft tints
and borders left the returned `default` theme failing the library's own contract —
macOS light 1.0248:1, Linux light 1.0162:1, Windows light 1.0133:1 and Linux dark
1.0346–1.0375:1 on the pairs in §1.**

Cases:

1. **Every shipped style, both modes.** For each `mode` of `themeModes` and each
   real `platform` of `platformNames` (skip `default`): build
   `applyPlatformStyle(getTheme(mode, "high"), platformStyles[platform], "default")`
   and assert all three checks are `[]` (`themeContrastFailures`,
   `themeMetricFailures`, `themeColorFailures`). This is the case that fails
   before the fix.
2. **The palette is the default palette.** The same theme's `colors` deep-equals
   `getPlatformTheme(platform, mode, "default").colors`, so the unnamed roles are
   the default-level identity's and the named ones are the style's.
3. **A same-level base keeps its edits.** `const brand = extendTheme(getTheme("dark"), { colors: { background: "#101820" } })`;
   `applyPlatformStyle(brand, platformStyles.linux, "default").colors.background`
   is `"#101820"` (and not `darkTheme.colors.background`), so the rebase does not
   run when the levels already match.
4. **A theme at the requested level keeps a role the style does not name.**
   `applyPlatformStyle(brand, platformStyles.linux, "default").colors.successSoft`
   equals `brand.colors.successSoft` (the style does not name it), so
   same-level inheritance still works.
5. **An `undefined` colour stays an inheritance, not a palette swap.**
   `applyPlatformStyle(getTheme("light", "high"), styleWithUndefinedPrimary, "default")`
   keeps `contrast: "high"` and `colors` equal to the AAA set (plan 323). This is a
   second direction: the rebase must not run when no colour applies.
6. **The shipped variants do not move.** For every mode and contrast,
   `getPlatformTheme("win32", mode, contrast).colors.primary` equals
   `platformStyles.win32.colors[mode].primary` at default contrast and
   `getTheme(mode, "high").colors.primary` at high contrast, so the fix is not
   silently recolouring the shipped gallery.
7. **The shipped recipes get the same replacement.** For every real
   `platformRecipeName` and mode, applying the recipe with `"default"` to an AAA
   base returns `[]` from the contrast check and its `colors` equal
   `getPlatformRecipeTheme(recipe, mode, "default").colors` — a recipe is the
   same `PlatformStyle` shape through the same path.

Use `getPlatformTheme`, `getPlatformRecipeTheme`, `platformRecipeNames`,
`platformRecipes`, `themeModes`, `themeContrasts`, `platformNames` and
`platformStyles` from `./index.js`; keep `extendTheme`'s brand edit local to the
file.

### 3.4 `docs/tokens.md`

Replace the last sentence of the `applyPlatformStyle` paragraph:

```
(plan `323`). A style overrides only the roles it names, so a mixed palette can
still miss a default-floor pair — for example the AAA `border` it does not
override on an inherited soft tint — and `themeContrastFailures` reports it
rather than rewriting the consumer's palette (plan `301`).
```

with:

```
(plan `323`). A style overrides only the roles it names, and the roles it does
not name belong to the palette it is written over: naming `"default"` on a base
at another level replaces the palette as a set, taking the unnamed roles from the
default-level identity of the same mode. The result is a whole palette rather
than half of one, so `themeContrastFailures` returns `[]` for every shipped style
applied this way; a base that already declares the level keeps its own colours,
edits included, so a style still overrides only what it names (plan `373`).
```

### 3.5 `docs/design-system.md`

In §11 Extension, replace:

```
A declaration is a claim; `themeContrastFailures` is what proves it, and a
mixed palette is reported rather than silently repaired.
```

with:

```
A declaration is a claim; `themeContrastFailures` is what proves it. Asking for
a level replaces the palette as a set, so the roles a style does not name come
from the identity at that level — a forced default palette is whole, not half of
one — while a base already at that level keeps its own colours, edits included.
```

### 3.6 `packages/tokens/README.md`

After the paragraph ending "(plan 323)." in the platform section, add:

```
Naming `"default"` on a base at another level replaces the palette as a set: the
roles the style does not name come from the default-level identity of the same
mode, so the applied theme is held to the floors it declares. A base that already
declares the level keeps its own colours, so this is not a rewrite of a
consumer's edits (plan 373).
```

### 3.7 `COMPONENTS.md`

In the **Theme extension** row, after the plan-301/323 sentence, add that a
forced default palette is rebased on the default-level identity of its mode, so
`applyPlatformStyle(highBase, style, "default")` passes `themeContrastFailures`,
and that same-level bases keep their edits (plan 373). No new row.

### 3.8 `TODO.md` and `.agents/slop/plans/README.md`

- Add one ticked TODO row under the tokens list, and move the progress count
  (`140/191` → `141/192`).
- Add the plan row (`373` — "The default palette a caller asked for", phase F,
  dependencies `011, 063, 073, 301, 323, 345`, status `done`) after `372`.
- Add a closing paragraph: the ten measured failures, the set-level replacement,
  the same-level exemption, and that no token value moves.

## 4. Test plan and both directions

The new `applied-palette.test.ts` must fail without 3.1. Write 3.3 first, then:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
(cd packages/tokens && ./node_modules/.bin/vitest run src/applied-palette.test.ts)
# EXPECT: case 1 fails for light macOS/Linux/Windows and dark Linux with the
# ratios in §1; case 2 fails for the same four palettes. Cases 3–7 pass, which
# shows the test is discriminating rather than asserting the empty set.
```

Apply 3.1 and rerun:

```sh
(cd packages/tokens && ./node_modules/.bin/vitest run src/applied-palette.test.ts src/platform-claim.test.ts)
# EXPECT: every case passes.
```

`scripts/verify-two-directions.sh` is jj-based and does not run in this git-only
worktree (`PLAN.md` D1); the explicit sequence above is the equivalent proof.
Record both directions in the commit message.

Then the gate, from the workspace root:

```sh
nub run --filter @gpuixui/tokens test   # EXPECT: all files pass, +1 file
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: `check:tests` accepts every case (each asserts a real fact); `tsc`
clean; oxfmt/oxlint clean; the full suite green. `docs.test.ts` must still accept
the rewritten paragraphs; if it rejects a sentence, adjust the sentence, never
the guard.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped `getPlatformTheme` variant changes a colour, pair count or floor —
  the rebase branch is not taken for them and this plan moves no shipped value;
- the rebase reaches a same-level base and drops a consumer's edit — §3.3 case 3
  or 4 fails, which means the `base.contrast` condition is wrong;
- the `undefined`-colour path (plan 323) starts rebasing — case 5 fails;
- a case passes on the pre-fix `theme.ts` where §4 says it must fail;
- the fix appears to need a new role, a new checker, a change to a platform style
  file, or edits outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` and
  `.agents/slop/plans/`.

## 6. Acceptance criteria

- `applyPlatformStyle(getTheme(mode, "high"), platformStyles[p], "default")`
  returns `[]` from all three checks for every mode and real shipped style.
- Its `colors` equal `getPlatformTheme(p, mode, "default").colors`.
- A same-level base keeps its edits and the roles a style does not name.
- A style with no defined colour keeps the base's level and palette.
- Every shipped `getPlatformTheme` palette is unchanged.
- `docs/tokens.md`, `docs/design-system.md`, the README and `COMPONENTS.md`
  state the set-level replacement, and `TODO.md` is ticked.
- No token value, colour, pair or floor moves.
- No path outside the package, the two documents, `COMPONENTS.md`, `TODO.md` and
  `.agents/slop/plans/` is touched.

## 7. Cross-team

None required. The change is confined to the theme builder; consumers calling
`applyPlatformStyle` see the same result for same-level bases and a valid theme
for the forced-level call the docs already advertise.

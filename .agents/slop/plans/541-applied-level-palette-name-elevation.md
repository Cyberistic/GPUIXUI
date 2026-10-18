# 541 — The applied theme's level, name, palette and elevation agree

| Field | Value |
| ----- | ----- |
| Phase | F (contract completeness) |
| Owner | `tokens-theme` — `packages/tokens`, `docs/tokens.md`, `docs/design-system.md` |
| Depends on | 073 (a theme declares its level), 301 (an applied style declares what it carries), 323 (`undefined` is not an override), 373 (a forced default palette is whole), 505 (the AAA tint keeps its own opacity) |
| Status | done |

`applyPlatformStyle(base, style, contrast?)` takes three inputs that can disagree
about one thing: **which contrast level the returned theme carries**. Today the
four outputs that depend on it are derived separately — the palette from the
style's colours, the name from the base, the elevation opacity from the
`contrast` argument, and the declaration from the palette — so three
compositions return a theme that lies about itself or paints the wrong tint:

1. **A high request on a default base returns a default theme.** The caller asks
   for the accessibility level and receives the non-AAA palette, because only a
   style's *colours* can select a palette at the `"default"` path and the
   `"high"` path never selects the AAA one. `themeFailures` returns `[]` — the
   result declares `default`, so it is checked at the default floors — and the
   only record of the ignored request is a sentence in `docs/tokens.md`: "so the
   theme stays `default`".
2. **A default request on an AAA base returns a theme named "High contrast …"
   carrying the default palette.** The name comes from the base, the palette from
   plan 373's rebase, and nothing reconciles them. A preview or a diagnostic
   prints a label that names a palette the theme does not carry.
3. **A shape-only style at a default request paints the style's default-level
   alpha over the AAA tint.** A style that names no colour keeps the base's level
   (plan 301) — so the result is an AAA theme — but the elevation is taken from
   the style's own level, and a dark platform's 40–80% applied to the AAA dark
   set's **light** `shadow` tint is the near-white halo plan 505 exists to
   prevent. `themeFailures` returns `[]` because 65% white over a black card
   still clears the 1.05:1 elevation floor.

The fix is one decision with four consequences. The requested level decides the
palette; the palette decides the name, the declaration and the elevation's
opacity; and a base that already carries that level keeps its own palette and the
caller's edits. No shipped pixel, pair, floor or metric moves.

## 1. Evidence

All three probes ran on this branch (`5e4fa5b4`, 129 files / 5605 tests green).

### 1.1 The high request that stays default

| Call | `contrast` | `colors.background` | `colors.shadow` | `themeFailures` | `themeContrastFailures(theme, "high")` |
| ---- | ---------- | ------------------- | --------------- | --------------- | -------------------------------------- |
| `applyPlatformStyle(getTheme("light"), darwin, "high")` | `default` | `#F6F8FA` | `#191D25` | `[]` | **180** |
| `applyPlatformStyle(getTheme("dark"), darwin, "high")` | `default` | `#11141A` | `#000000` | `[]` | many |

The default palette is returned unchanged below the platform's shape, and the
result declares `default`, so the library's own contract reports nothing. The
AAA palette (`getTheme(mode, "high").colors`) is never consulted.

### 1.2 The name that claims a palette the theme does not carry

```
applyPlatformStyle(getTheme("light", "high"), platformStyles.darwin, "default")
// { contrast: "default", name: "High contrast light · macOS",
//   colors.background: "#F2F2F7" }   ← macOS light's default canvas
```

Plan 373 made this call replace the palette as a set — correctly — but
`platformOverrides` named the result from the **base** (`High contrast light`),
not from the palette it now carries. The catalogue's table prints
`applyPlatformStyle` results, so a row could print a platform's default values
under an AAA label.

### 1.3 The halo a shape-only style paints

```ts
const shapeOnly = {
  ...platformStyles.default,                    // no colours
  types: { ...platformStyles.default.types, label: "Shape only" },
  elevation: platformStyles.win32.elevation,    // dark alpha 0.4 / 0.6 / 0.8
};
const themed = applyPlatformStyle(getTheme("dark", "high"), shapeOnly, "default");
elevationShadow(themed, "md")?.color; // "#FFFFFFA6" — 65% white
themed.contrast;                      // "high"     — the AAA palette is kept
themeFailures(themed);                // []
```

Plan 301 keeps the base's level because the style changes no colour; plan 505
says "at high contrast a platform style contributes the level's geometry while
the AAA opacity stays with its tint". Here both rules are claimed and the second
is broken: the tint is the AAA dark set's light `#FFFFFF`, the opacity is the
Windows **default** level's 65%, and the result is a near-white halo the checker
cannot see.

### 1.4 What the documents promise

- `theme.ts:544-562` — "The contrast level defaults to the one the base declares
  … At `"high"` the families and shape are applied … while the base keeps its
  colour set … The result declares the level of the palette it carries."
- `docs/tokens.md:700-706` — "Naming `"high"` on a default base applies only
  families, shape and elevation levels, so the theme stays `default`."
- `docs/design-system.md:824-834` — "Asking for a level replaces the palette as a
  set, so the roles a style does not name come from the identity at that level —
  a forced default palette is whole, not half of one."
- `packages/tokens/README.md:830-840` — the same rule for the `"default"`
  direction only.

The catalogue documents the ignored high request as a consequence of the
implementation; the design system states the general rule the implementation
only follows in one direction. One of the three has to be wrong, and the design
system's rule is the one an accessibility level should follow.

## 2. Design decisions

1. **The requested level decides the palette.** A request is a claim about the
   floors a theme is designed against; it must not silently return the other
   level. `"high"` always builds `getTheme(mode, "high").colors`; `"default"`
   builds the default palette when the style contributes colours (plan 373).
2. **A same-level base keeps its own palette.** Omitting the argument, or naming
   the level the base declares, returns the base's colours — a consumer's edits
   survive and a style still overrides only what it names (plans 301 and 373).
3. **A style's colours never repaint a high-contrast palette.** They are designed
   at the default floors, so AAA wins; this is today's behaviour and stays.
4. **A shape-only style at a default request keeps the base's level** (plan 301):
   it changes no colour, so there is no palette to rebase. Its requested level is
   therefore not honoured — the one documented exception, and it is visible in
   the result's own name, because the name now comes from the palette.
5. **The name follows the palette.** `palette.name + " · " + label`. A rebase
   brings the identity's name, because the result *is* that identity at the
   requested level; a same-level base keeps its own name, so a brand's label
   survives. This is the only place a consumer's `name` is dropped, and it is
   dropped exactly when their palette was replaced.
6. **The elevation opacity follows the declared level.** If the result declares
   `high`, the alpha comes from the palette's own identity (AAA light 8/12/16%,
   AAA dark 10/14/18%), never from the style's default level. A style still
   contributes the geometry.
7. **`mergeDefined` keeps an unnamed elevation level from the palette**, not from
   the original base: when the palette is rebased, the base's levels are not the
   palette's.
8. **No shipped value moves.** Every shipped resolver passes a base at the
   requested level (`getPlatformTheme` builds `getTheme(mode, contrast)` first),
   so `palette === base` on every shipped path and every name, colour and shadow
   is unchanged.

## 3. Exact changes

### 3.1 `packages/tokens/src/theme.ts`

1. Replace `appliedPalette` (lines 454-464) with the level identity helper:

   ```ts
   /**
    * The theme a requested level is built on. A base that already carries the
    * level is kept as it is — a consumer's edits, a brand's name and a style's
    * unnamed roles survive — and otherwise the identity at that level supplies
    * the palette, its name and the opacity its `shadow` tint was designed with.
    */
   const levelIdentity = (base: Theme, level: ThemeContrast): Theme =>
     base.contrast === level ? base : getTheme(base.mode, level);
   ```

2. Replace `platformOverrides` (lines 500-542) with the single-decision version:

   ```ts
   const platformOverrides = (
     base: Theme,
     style: PlatformStyle,
     contrast: ThemeContrast,
   ): ThemeOverrides => {
     const { label, sans, mono } = style.types;
     const styleColors = style.colors[base.mode];
     const appliesColors = Object.values(styleColors).some(
       (color) => color !== undefined,
     );
     // One decision, four consequences: the level decides the palette, and the
     // palette decides the name, the declaration and the elevation opacity.
     // A high request always builds the AAA palette; a default request builds
     // the default palette when the style contributes colours (plan 373); a
     // shape-only style changes no colour, so the base's level is kept
     // (plan 301).
     const level =
       contrast === "high" ? "high" : appliesColors ? "default" : base.contrast;
     const palette = levelIdentity(base, level);
     return {
       name: `${palette.name} · ${label}`,
       typography: { sans, mono, ...style.structure.typography },
       spacing: style.structure.spacing,
       radius: style.structure.radius,
       density: style.structure.density,
       motion: style.structure.motion,
       borderWidth: style.structure.borderWidth,
       iconSize: style.structure.iconSize,
       avatarSize: style.structure.avatarSize,
       dimensions: style.structure.dimensions,
       // A high-contrast palette keeps the opacity its tint was designed with:
       // a dark platform's 0.4–0.8 over the AAA dark set's light tint paints a
       // near-white halo (plan 505). A style still lends its geometry.
       elevation:
         level === "high"
           ? mergeDefined(
               palette.elevation,
               platformElevation(palette.elevation, style.elevation[base.mode]),
             )
           : style.elevation[base.mode],
       // AAA floors win over a style's colours, which are designed at the
       // default level. A same-level base keeps its own palette, edits included.
       colors:
         level === "high"
           ? palette === base
             ? undefined
             : palette.colors
           : { ...palette.colors, ...styleColors },
       contrast: palette === base ? undefined : level,
     };
   };
   ```

   `mergeDefined` is already in this module (line 176); `platformElevation` and
   `withBaseAlpha` stay as they are.

3. Rewrite `applyPlatformStyle`'s JSDoc (lines 544-574) to state the one rule —
   the requested level decides the palette, the name and the elevation opacity; a
   style's colours never repaint a high-contrast palette; a same-level base keeps
   its own colours and edits; a shape-only style keeps the base's level. Keep the
   worked `@example` unchanged (it is snippet-guarded).

### 3.2 `packages/tokens/src/applied-level.test.ts` (new)

Header: the three regressions above, with the measured values.

Cases:

1. **`a high request builds the AAA palette on a default base`** — for both
   modes, `applyPlatformStyle(getTheme(mode), platformStyles.darwin, "high")`:
   `contrast === "high"`, `colors` equals `getTheme(mode, "high").colors`,
   `themeFailures(theme)` is `[]`, `themeContrastFailures(theme, "high")` is `[]`.
   **This is the regression case**: before this plan the theme declares
   `default` and `themeContrastFailures(theme, "high")` is non-empty.
2. **`a high request ignores a style's default-level colours`** — the same call
   has `colors.primary` equal to the AAA identity's `primary`, not
   `platformStyles.darwin.colors[mode].primary`.
3. **`the name states the palette the theme carries`** —
   `applyPlatformStyle(getTheme("light", "high"), platformStyles.darwin, "default").name`
   is `"Light · macOS"` (was `"High contrast light · macOS"`), and its colours
   equal `getPlatformTheme("darwin", "light", "default").colors`;
   `applyPlatformStyle(getTheme("light"), platformStyles.darwin, "high").name`
   is `"High contrast light · macOS"`; a same-level AAA base still reads
   `"High contrast light · macOS"`.
4. **`a shape-only style keeps the AAA opacity`** — the §1.3 probe:
   `contrast === "high"`, `colors.shadow === "#FFFFFF"`, and
   `elevationShadow(themed, "md")` equals `elevationShadow(highContrastDarkTheme, "md")`
   (10/14/18% of white), **not** the Windows default 65%. Before this plan the
   colour is `#FFFFFFA6`.
5. **`a same-level base keeps its own palette, name and elevation`** — start from
   `extendTheme(getTheme("dark", "high"), { name: "Acme", colors: { successSoft: "#123456" } })`,
   apply the macOS style with no argument, and assert `name` is `"Acme · macOS"`,
   `colors.successSoft` is `"#123456"` and
   `elevationShadow(theme, "md")` equals the AAA dark level's (the base's own
   opacity, because the base already declares `high`).
6. **`the plan-373 rebase stays whole`** — the existing
   `applyPlatformStyle(getTheme(mode, "high"), style, "default")` still equals
   `getPlatformTheme(platform, mode, "default").colors` and passes every check
   (a duplicate of the documented contract, kept here so one file states the
   whole level rule).
7. **`no shipped variant moves`** — for every `shippedThemes` entry, `name`,
   `colors`, `contrast` and `elevation` equal the value `getPlatformTheme` /
   `getPlatformRecipeTheme` produced before this plan: assert `name` for the 24
   sets explicitly (`"Light"`, `"High contrast light"`, `"Light · macOS"`,
   `"High contrast dark · Linux"`, …) and `elevationShadow(theme, "md")`
   against the shipped identity alpha per level.
8. **`a shape-only style at a default request keeps the base's level`** — plan
   301 stays: `applyPlatformStyle(getTheme("light", "high"), shapeOnly, "default")`
   declares `high` and keeps the AAA colours (the existing
   `applied-palette.test.ts` case is untouched; this one asserts the *name* also
   says high).
9. **`the copyable example`** — import `applied-level.example.ts` and assert the
   level, colours, `md` tint and name it exports, so the documented snippet and
   the code cannot drift (plan 350's rule).

### 3.2a `packages/tokens/src/applied-level.example.ts` (new)

A copyable example, in the shape of `opacity.example.ts`: the high request on a
default theme (`highContrastWindows`), the level it exports
(`highContrastWindowsLevel`), the `md` tint it paints, a same-level brand base
(`acmeWindows`), and the resolver that builds the level first (`windowsHigh`).
Export plain values; no functions, no JSX. Link it from `docs/tokens.md` and the
package README.

### 3.3 `packages/tokens/src/platform-claim.test.ts`

The case "cannot claim high when only shape was applied" encodes the pre-plan
rule: a high request changed no palette, so declaring high would have been false.
This plan supplies the palette, so the case becomes the positive proof of the new
rule and its name changes to
`"builds the AAA palette for a high request instead of refusing it"`:

```ts
it("builds the AAA palette for a high request instead of refusing it", () => {
  const raised = applyPlatformStyle(lightTheme, platformStyles.linux, "high");

  expect(raised.contrast).toBe("high");
  expect(raised.colors).toEqual(getTheme("light", "high").colors);
  expect(themeContrastFailures(raised)).toEqual([]);
  expect(themeContrastFailures(raised, "high")).toEqual([]);
});
```

The other five cases in that file stay unchanged: a default request over an AAA
base still rebases and declares `default`; a same-level base, a shape-only style
and an `undefined` colour still keep the base's level; one colour beside an
`undefined` one still rebases. Update the file's header with a paragraph that
says the plan-301 principle (a declaration follows the palette) is preserved and
the composition now supplies the palette it declares.

No change is expected in `platforms.test.ts`; run it. If a shipped expectation
contradicts the new rule, stop (§6) rather than editing the expectation.

### 3.4 `docs/tokens.md`

Replace the paragraph at lines 700-717 with the one rule:

```
The result carries the level it declares, and the level is decided once. A
`"high"` request always builds the AAA palette of the base's mode — a style's
colours are designed at the default floors, so they never repaint it, while the
platform still contributes its geometry and the AAA `shadow` tint keeps the
opacity designed against it. A `"default"` request builds the default palette
when the style contributes colours, taking the roles it does not name from the
default-level identity of the same mode, so the result is a whole palette rather
than half of one (plan `373`). Omitting the argument, or naming the level the
base already declares, keeps the base's palette: a consumer's edits and a style's
unnamed roles survive, and the result keeps the base's name. A style with no
colour overrides changes no colour, so it keeps the base's level (plan `301`) —
the one request that is not honoured, and the theme's name says so. A colour key
set to `undefined` is not an override either (plan `323`).
```

The `; // keeps the AAA palette` snippet comment at line 694 still holds (a
high base with no argument). Add one sentence after the snippet: "A `"high"`
request on any other base builds the same AAA palette, so a contrast toggle
cannot return a theme below the level it asked for." Link
`../packages/tokens/src/applied-level.example.ts` from the paragraph.

### 3.4a `packages/tokens/src/docs.test.ts`

Three cases in a new `describe("the applied level's documents")`:

- **`states that a requested level supplies its palette`** — the catalogue holds
  "A `"high"` request on any other base builds the same AAA palette", the design
  system "A requested level decides the palette" and the README (collapsed, it
  wraps) "a requested level decides the palette".
- **`no longer says a high request stays at the default level`** — none of the
  three documents holds "so the theme stays `default`" or "Asking for a level
  replaces the palette as a set".
- **`states the name and elevation consequences`** — the catalogue holds "The
  name always follows the palette" and "the elevation's opacity", the design
  system "the palette decides the name".

### 3.5 `docs/design-system.md`

1. §5 (the platform paragraph, lines 156-167) — after "At high contrast the
   families and shape apply …" add: "A high request on a default theme builds the
   same AAA palette, so the request is the level the result carries; a style's
   colours never repaint it, and the AAA tint keeps the opacity designed against
   it."
2. §11 (lines 824-834) — replace the declaration/rebase paragraph with the one
   rule: the level decides the palette, a same-level base keeps its own colours
   and edits, a high request always builds the AAA palette, and the name follows
   the palette. Keep "A declaration is a claim; `themeContrastFailures` is what
   proves it."

### 3.6 `packages/tokens/README.md`

1. The high-contrast paragraph (~line 790) — add the request rule: "A `"high"`
   request on a default base builds the AAA palette, so the argument is the level
   the result carries; a style's colours are designed at the default floors and
   never repaint it."
2. The declaration paragraph (~line 830) — replace "Asking for a level replaces
   the palette as a set … (plan 373)" with the general rule, naming the name and
   elevation consequences and plans `541`/`505`.

### 3.7 `COMPONENTS.md`

1. **Theme extension** row — replace the "Asking for a level replaces the palette
   as a set: … (plan 373)" sentence with: "The requested level decides the
   palette: `"high"` always builds the AAA palette (a style's colours never
   repaint it), `"default"` builds the default palette when the style contributes
   colours, and a same-level base or a shape-only style keeps the base's palette
   and name (plans 301, 373 and 541). A shape-only style over an AAA base takes
   the AAA tint's own opacity, so a dark platform cannot paint a near-white
   halo (plan 505)."
2. **Platform style variants** row — add after "`applyPlatformStyle` defaults to
   the level the base declares (plan 073)": "and a requested `"high"` always
   builds the AAA palette, so the result cannot claim a level it does not carry;
   its name and elevation opacity follow the palette (plan 541)."

### 3.8 `TODO.md`

- One ticked workstream row for this plan; the section bar moves one task and one
  total up (currently `205/271` → `206/272`).
- No cross-team row: the change is the package's own resolver and documents.

### 3.9 `.agents/slop/plans/README.md`

Add `541` to the `tokens-theme` table after `540` and one paragraph after the
plan-540 prose, stating the three compositions and the one-decision rule.

## 4. Exact commands

```sh
nub run --filter @gpuixui/tokens test            # expected: exit 0, 130 files
nub run --filter @gpuixui/tokens check-types     # expected: exit 0
nub run check:tests                              # expected: exit 0
nub run lint                                     # expected: exit 0
nub run check                                    # expected: exit 0
nub run test                                     # expected: exit 0
```

## 5. Test plan — prove both directions

1. Land `theme.ts` and `applied-level.test.ts` **without** the document edits.
   Run the package suite. Expected: `applied-level.test.ts` green; every existing
   suite still green (no shipped value moves); the docs suites unchanged.
2. **Prove the regression cases can fail.** Revert `platformOverrides` to the
   pre-plan body (`git stash` the file or copy it aside) and run
   `applied-level.test.ts`. Expected: case 1 fails with `contrast: "default"` and
   non-empty `themeContrastFailures(theme, "high")`; case 3 fails on the name
   `"High contrast light · macOS"`; case 4 fails with `"#FFFFFFA6"`. Restore.
3. **Prove the rule is not vacuous.** Temporarily change the high branch to keep
   `style.elevation[base.mode]` (the old elevation). Expected: case 4 fails with
   the Windows 65% value. Restore.
4. **Prove no shipped pixel moves.** `git stash` the docs edits only and run the
   whole package suite: `shippedThemes`-based suites (`contrast`,
   `platform-composition`, `platforms`, `docs`, `figures`, `readme`) stay green.
5. Apply the document edits. Expected: `docs.test.ts`, `snippets.test.ts` and
   `readme.test.ts` stay green; add no new doc sentence without a guard unless it
   states a rule the package test already holds (`applied-level.test.ts` does).
6. Run §4. Expected: all exit 0.
7. `git status` shows only this plan's files.

## 6. STOP conditions

Stop and report if:

- any shipped `getPlatformTheme` / `getPlatformRecipeTheme` result changes a
  colour, name, elevation shadow, pair count or metric — this plan moves no
  shipped pixel, and a shipped change means the `palette === base` path is wrong;
- a shipped set fails `themeFailures` after the change — the AAA palette or a
  platform's geometry does not compose, which is a finding for a separate plan;
- `applied-palette.test.ts`'s "does not rebase when no colour applies" case
  changes — plan 301's shape-only rule must survive;
- `themeContrastFailures(getTheme(mode, "high"))` stops being `[]`;
- a document already states the rule this plan introduces in a way that makes the
  edit contradictory (read the paragraph before rewriting it);
- any command in §4 fails for a reason other than the new assertions.

## 7. Acceptance criteria

- `applyPlatformStyle(base, style, "high")` returns a theme with
  `contrast === "high"` and `colors` equal to `getTheme(base.mode, "high").colors`
  for a default base, and `themeContrastFailures(result, "high")` is `[]`.
- The returned `name` always names the palette the theme carries; the
  §1.2 call reads `"Light · macOS"` and the high request reads
  `"High contrast light · macOS"`.
- A shape-only style over an AAA base paints the AAA tint at the AAA opacity
  (`elevationShadow(themed, "md")` equals the AAA dark level's).
- Every shipped theme, platform variant and recipe is byte-for-byte unchanged:
  same name, colours, contrast declaration and elevation shadows.
- `docs/tokens.md`, `docs/design-system.md`, `README.md`, `COMPONENTS.md` and
  `TODO.md` state the one rule and no longer say a `"high"` request stays
  `default`; the plan index names plan `541`.
- Every command in §4 passes.

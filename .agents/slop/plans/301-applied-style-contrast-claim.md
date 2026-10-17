# 301 — An applied platform style must declare the contrast it carries

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
063, 071, 073 · **Touches:** `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`

## 1. The defect

Plan 073 made a `Theme` declare the floor set it is designed against, so
`themeContrastFailures(theme)` checks the levels the theme actually meets. The
declaration is a **claim**: `extendTheme` keeps the base's level unless an
override sets one, and `applyPlatformStyle` inherits the base's level by default.

That last part is wrong when the caller asks for the other palette:

```ts
const dropped = applyPlatformStyle(getTheme("light", "high"), linuxStyle, "default");
dropped.contrast;              // "high"  — a lie
themeContrastFailures(dropped); // 46 failures
```

A high-contrast base with the platform's default palette is **not** a
high-contrast theme: the AAA palette is gone. The function applies the platform
colours (that is what `"default"` means) and then leaves the base's `contrast`
declaration untouched, so the result claims floors it cannot meet. The public
guarantee — “an empty array is the library's guarantee” — turns into a wall of
failures for a legitimate call, and a consumer who trusts `theme.contrast` is
misled. The same reasoning applies in the other direction:
`applyPlatformStyle(getTheme("light"), style, "high")` applies only families and
shape, so the result carries the **default** palette and must not claim AAA.

Measured on this host: the dropped case declares `high` and produces **46**
contrast failures; the raised case declares `default` and passes. A copied style
with no colour overrides (`colors: { light: {}, dark: {} }`, like
`platformStyles.default`) is shape-only and must keep the base's claim.

## 2. Decision (do not re-litigate)

- `applyPlatformStyle` returns a theme whose `contrast` is the level of the
  **palette it carries**:
  - platform colours applied → `"default"` (the shipped platform palettes are
    designed at the default floors; plan 063 applies only families and shape at
    AAA);
  - no colours applied (the `"high"` argument, or a style whose colour record for
    the mode is empty) → the base's declaration.
- The default call is unchanged: a high-contrast base with no explicit argument
  applies no colours and keeps `"high"` (plan 073's guarantee is preserved).
- The declaration does **not** make a mixed palette pass. A style overrides only
  the roles it names; the rest stay from the base, so an AAA base dropped to a
  platform palette can still fail a default-floor pair (the audit's hybrid
  inherits the AAA `border` and one soft tint, and their divider pair sits at
  1.016:1). The checker must report that rather than the fix rewriting a
  consumer's palette. What changes is that the theme is judged at the floors it
  actually carries, not at AAA.
- The declaration stays a claim: the checker still measures it.

## 3. Exact changes

### 3.1 `packages/tokens/src/theme.ts`

`platformOverrides` already builds the colour override conditionally. Give the
returned overrides an explicit `contrast`:

```ts
const platformOverrides = (
  base: Theme,
  style: PlatformStyle,
  contrast: ThemeContrast,
): ThemeOverrides => {
  const { label, sans, mono } = style.types;
  const structural: ThemeOverrides = {
    name: `${base.name} · ${label}`,
    typography: { sans, mono },
    radius: style.structure.radius,
    density: style.structure.density,
    motion: style.structure.motion,
  };
  if (contrast === "high") {
    return structural;
  }
  const colors = style.colors[base.mode];
  return {
    ...structural,
    colors,
    contrast: Object.keys(colors).length === 0 ? base.contrast : "default",
    elevation: style.elevation[base.mode],
  };
};
```

No cast, no retyped union: `"default"` is a `ThemeContrast`. Update the
`applyPlatformStyle` JSDoc: the result declares the level of the palette it
carries, and naming `"default"` on a high-contrast base yields a default theme
because the AAA palette is no longer present.

### 3.2 `packages/tokens/src/platform-claim.test.ts` (new)

Header: *Guards the defect plan 301 fixed: `applyPlatformStyle(highBase, style,
"default")` applied the platform palette but kept the base's `contrast: "high"`
claim, so the library's own checker reported 46 failures for a theme the caller
had built on purpose.*

Tests:

1. **Dropping to the platform palette declares default** — the call above returns
   `contrast: "default"`; the declared check reports fewer failures than the AAA
   check and none at the 7:1 body floor, because the theme is no longer judged as
   AAA. The hybrid's remaining default-floor divider failure is expected and
   documented: the style only overrides the roles it names.
2. **Asking for AAA on a default base cannot claim high** — the raised call
   returns `contrast: "default"`; the current code already does this, and the
   test pins it so a later change cannot start claiming a palette that was never
   applied.
3. **The default call still keeps AAA** — `applyPlatformStyle(highBase, style)`
   keeps the base's colours, `contrast: "high"` and no failures.
4. **A shape-only style keeps the claim** — a copied style with
   `colors: { light: {}, dark: {} }` on a high base at `"default"` keeps
   `contrast: "high"` because it changes no colour.

### 3.3 `docs/tokens.md`

After the `applyPlatformStyle` paragraph (around line 444), state that the result
declares the level of the palette it carries: naming `"default"` on an AAA base
applies the platform colours and returns a `default` theme, naming `"high"` on a
default base changes only families and shape so the theme stays `default`, and a
shape-only style (no colour overrides) keeps the base's level.

### 3.4 `docs/design-system.md`

In §11 (Extension), add one sentence after the contrast-declaration paragraph:
applying a platform style’s default palette to a high-contrast base yields a
theme that declares `default`, because the declaration follows the palette.
Keep “a declaration is a claim; `themeContrastFailures` is what proves it”.

### 3.5 `packages/tokens/README.md`

One sentence in the extension/contrast section: the applied style carries the
level of the palette it ends with (plan 301).

### 3.6 `COMPONENTS.md`

Append to the *Theme extension* row: `applyPlatformStyle` now declares the level
of the palette it carries — applying default colours to an AAA base returns a
`default` theme instead of claiming floors it misses (plan 301).

### 3.7 `TODO.md`

Add and tick:

```
`[x]` Make an applied platform style declare the contrast it carries —
`applyPlatformStyle(highBase, style, "default")` kept the base's `contrast:
"high"` claim and produced 46 checker failures; the returned declaration now
follows the palette, and a shape-only style keeps the base's level (plan 301)
```

Progress `68/87` → `69/88`.

### 3.8 Plan index

Add 301 with status `done` and a closing narrative paragraph.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | the new suite fails before §3.1 (`contrast: "high"`, 46 failures) |
| 2 | `nub run --filter @gpuixui/tokens test` | 37 files green, 1805 + the new tests |
| 3 | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| 4 | `nub run lint` | exit 0 |
| 5 | `nub run fmt` | exit 0 |
| 6 | `nub run check` | exit 0 |
| 7 | `nub run test` | exit 0 |

## 5. Test plan — proof in both directions

1. Write the new suite before §3.1 and run it: test 1 fails on
   `expected 'high' to be 'default'` with the 46 AAA failures behind it; test 2
   already passes because that direction happened to be truthful, and it stays
   as a guard.
2. Apply §3.1; all four pass.
3. Temporarily remove the `contrast` field and observe test 1 fail; restore.
4. Temporarily make the shape-only case report `"default"` unconditionally and
   observe test 4 fail; restore.

## 6. STOP conditions

Stop and report, do not improvise, if:

- the default call stops keeping the AAA palette (plan 073's guarantee);
- any shipped platform theme gains a contrast failure through the change — the
  claim is metadata, so no colour may move;
- a change is needed outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md` or `TODO.md`;
- a step needs `any`, a cast or a retyped contrast union.

## 7. Acceptance

- [x] The declaration follows the palette in both explicit directions.
- [x] The default call keeps the base's level and colours.
- [x] A shape-only style keeps the base's level.
- [x] The new suite fails without the fix and passes with it.
- [x] Docs, README, `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint`, `nub run test` pass — run, not assumed.
- [x] Committed on `agent/tokens-theme` and pushed.

## 8. Outcome (executed on this host, 2026-10-17)

- The defect was real: `applyPlatformStyle(getTheme("light", "high"),
  platformStyles.linux, "default")` returned `contrast: "high"` while carrying
  the platform's default palette, and `themeContrastFailures` reported **46**
  failures against the AAA floors the theme claimed. The opposite direction
  (`"high"` on a default base) already declared `default`; the new suite pins it
  so it cannot regress into claiming a palette that was never applied.
- `platformOverrides` now sets `contrast` from the palette it applies:
  `"default"` when the style's colour record for the mode is non-empty, the
  base's level otherwise. `Object.keys` on the partial colour record is the
  smallest honest test — a shape-only style (the Default style's pattern) changes
  no colour and keeps the base's claim.
- The default call is unchanged: a high-contrast base applies only families and
  shape, keeps the AAA colours and declares `high`; `themeContrastFailures`
  still returns `[]`.
- A mixed palette is not silently repaired. The dropped call inherits the AAA
  roles the Linux style does not override (the `border` and one soft tint), and
  their divider pair measures 1.016:1 at the default floor; the checker reports
  it, and the test asserts the declared check is smaller than the AAA check and
  has no 7:1 failure rather than pretending the hybrid is perfect. The API change
  is the truthful claim, documented in `docs/tokens.md`, §11 of the design
  system, the README and `COMPONENTS.md`.
- Two-direction evidence, run and reverted:
  - **no declaration**: removing the `contrast` field fails test 1 with
    `expected 'high' to be 'default'`; restored;
  - **unconditional default**: making the field always `"default"` fails the
    shape-only test with `expected 'default' to be 'high'`; restored.
- Green: **37 test files, 1809 tests** (1805 before the four new ones).
  `nub run check` and `nub run test` were run and passed.

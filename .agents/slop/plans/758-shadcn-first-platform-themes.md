# Plan 758 — shadcn-first platform themes

Two changes, one plan, because the second cannot land without deciding the
first's audit policy.

1. **Platform palettes are authored as shadcn variables.** *Landed:* each style
   declares `{ shadcn, extras }` per mode and `palette()` maps it with
   `shadcnOverrides(vars, { derive: false })`; `platforms.test.ts` freezes every
   current value and fails on any repaint. `darwin`, `linux`,
   `win32` and `default` declare their colours in shadcn's variable names
   (`--background`, `--primary`, …) and convert with `shadcnOverrides` at load,
   instead of hand-writing role keys.
2. **`default` is shadcn's neutral black-and-white theme, exactly.** *Landed for
   the site:* `shadcnNeutral` / `shadcnNeutralTheme` in `@gpuixui/tokens`, the
   docs' `resolvePlatformTheme` resolves `default` to it, and the theme editor
   reports its sub-floor pairs as warnings.

## Where it stands

- `shadcnTheme(css, mode)`, `shadcnOverrides(vars)`, `parseShadcnStyles(css)`,
  `shadcnCss(theme)`, `shadcnStylesheet(light, dark)` and
  `shadcnPlatformTheme(css, platform, mode)` are landed and green.
- `applyStyle` / `platformTheme` take `{ keepPalette: true }`, so an imported
  palette keeps its colours under a platform's type, radius and density.
- `default` still names no colours; the base `lightTheme` / `darkTheme` paint.

## Part 1 — author the palettes as shadcn variables

Only `default` can be *pure* shadcn: the three platform looks name roles shadcn
has no variable for (`hover`, `active`, `selected`, `borderStrong`,
`selection`, `destructiveSoftForeground`). Each keeps those in a small
`extras` block beside its shadcn map.

| File | Change |
| ---- | ------ |
| `packages/tokens/src/shadcn-vars.ts` | **new** — the pure half: `parseShadcnStyles`, `shadcnColour`, `shadcnOverrides`, `ShadcnVars`, `ShadcnStyles` |
| `packages/tokens/src/shadcn.ts` | keeps the theme half; re-exports the vars module |
| `packages/tokens/src/platforms.ts` | each style declares `shadcn: { light, dark }` plus `extras`; `colors` is derived at load |
| `packages/tokens/src/index.ts` | export the new module |

The split exists so `platforms.ts` can convert without importing `theme.ts`
(which imports `platforms.ts`). `shadcn-vars.ts` imports `color`, `series` and
type-only `theme`, so it stays a leaf.

## Part 2 — `default` is shadcn's neutral theme

Exact values, light then dark:

```ts
background oklch(1 0 0) / oklch(0.145 0 0)
foreground oklch(0.145 0 0) / oklch(0.985 0 0)
card,popover oklch(1 0 0) / oklch(0.205 0 0)
primary oklch(0.205 0 0) / oklch(0.922 0 0)
primary-foreground oklch(0.985 0 0) / oklch(0.205 0 0)
secondary oklch(0.97 0 0) / oklch(0.269 0 0)
secondary-foreground oklch(0.205 0 0) / oklch(0.985 0 0)
muted oklch(0.97 0 0) / oklch(0.269 0 0)
muted-foreground oklch(0.556 0 0) / oklch(0.708 0 0)
accent oklch(0.97 0 0) / oklch(0.269 0 0)
accent-foreground oklch(0.205 0 0) / oklch(0.985 0 0)
destructive oklch(0.577 0.245 27.325) / oklch(0.704 0.191 22.216)
border oklch(0.922 0 0) / oklch(1 0 0 / 10%)
input oklch(0.922 0 0) / oklch(1 0 0 / 15%)
ring oklch(0.708 0 0) / oklch(0.556 0 0)
```

`--radius` stays ours (6px). shadcn's `0.625rem` is a Tailwind radius scale, not
a black-and-white trait; changing it re-cuts every corner in the library.

## The decision this plan needs

Measured: painting `default` with that palette fails **~100 tests across 20
files** (`contrast`, `selection`, `native-text`, `brand-text`, `highlight`,
`divider`, `indicator`, `focus-dim`, `disabled`, `pointer-wash`, `ring-fill`,
`styles`, `platforms`, `docs`). The floors are ours (4.5:1 body, 7:1 soft,
3:1 non-text); shadcn's `muted-foreground` on `muted` measures about 4.4:1.

Three policies. One must be chosen before Part 2 lands.

| Policy | Effect | Cost |
| ------ | ------ | ---- |
Chosen: **B**, with the misses shown as warnings in the editor.

| **A — exact, outside the gate** | `default` keeps shadcn's values; the sweeps skip it, and one test asserts it equals the shadcn palette byte for byte | ~20 test files touch a shared `shippedStyles` list; the library no longer claims WCAG floors for its own default |
| **B — exact, gate relaxed for `default`** | same values, failures recorded as a known-exception list with the measured ratios | one exception table; the gate still runs and prints, which is the honest middle |
| **C — near-exact** | three values nudged until the floors pass (`muted-foreground` 0.556 → ~0.53, dark `muted-foreground` 0.708 → ~0.72, `ring` to match) | passes everything, is no longer "the exact same theme" |

Recommendation: **B**. It keeps the palette exact, keeps the gate running, and
records the exact pairs that miss so a reader sees why.

## Test plan

1. `shadcnOverrides` on the neutral map yields exactly the documented roles, and
   leaves `success`/`warning`/`info` to the base.
2. `platformTheme(themes[mode], "default")` equals the shadcn palette for every
   named role (policy A/B) or the nudged value (policy C).
3. Each platform's derived palette still equals its current hand-written one —
   the conversion is a source change, not a repaint. A snapshot of all three
   styles before and after proves it.
4. `shadcnPlatformTheme(css, "win32", "dark")` keeps the imported colours.
5. Doc tables in `docs/tokens.md` follow the new source; the `default` column is
   added.

Tests must fail without the change: case 3 is the one that catches a palette
silently repainted during the conversion.

## Commands

```bash
cd packages/tokens && nub run test
cd packages/tokens && nub run check-types
cd /Users/cyberistic/Documents/GPUIXUI && nub run lint && nub run test
```

## STOP conditions

- Stop if a platform's palette cannot be expressed without a role shadcn has no
  variable for and no `extras` block can carry.
- Stop before Part 2 until an audit policy is chosen.
- Stop if the derived palette differs from today's for `darwin`, `linux` or
  `win32` — that is a repaint nobody asked for.

## Acceptance

- `default` reads as shadcn's neutral theme in both modes.
- The three platform looks are unchanged.
- The audit reports what it is asked to, with no silent exceptions.

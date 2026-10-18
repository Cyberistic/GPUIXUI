# 374 — A platform style applied over another platform's theme

**Workstream:** `tokens-theme` · **Phase:** F (extension truth) · **Block:** `300–399`
**Depends on:** 063 (platform variants), 071 (contrast contract), 073 (declared
contrast), 091 (Linux dark soft destructive tint), 301/323/373 (applied-palette
claims), 311 (recipes), 328 (recipe dark palette)

## 1. The defect

`applyPlatformStyle(base, style, contrast = base.contrast)` applies a
`PlatformStyle` to **any** `Theme`. A shipped style names 32 of the 66 colour
roles in each mode; the roles it omits inherit the base. When the base is an
identity theme that is correct — the style is an override set over the identity.
When the base is **another platform's theme**, the roles the applied style omits
keep the *previous platform's* values. For one role in one mode that value was
tuned for the previous canvas, and it is unreadable on the new one.

Linux dark is the only shipped style that names `destructiveSoft`
(`palette.red[950]`, `#3A0B0D`, plan 091: the light-accent selection wash had to
stay visible on the soft destructive fill). macOS dark, Windows dark, XP dark
and Aero dark inherit the identity dark tint (`#66191B`). Applying any of them
over a Linux dark theme therefore keeps `#3A0B0D`:

```ts
themeContrastFailures(
  applyPlatformStyle(getPlatformTheme("linux", "dark"), platformStyles.darwin),
);
// [{ foreground: "destructiveSoft", background: "background",
//    pairClass: "surface", floor: 1.05, ratio: 1.0005152960451316 }]
```

Measured on the merged tree (probe over every shipped base × style × mode ×
contrast × level):

| Base | Applied style | Ratio of `destructiveSoft` on `background` | Floor |
| ---- | ------------- | ------------------------------------------ | ----- |
| Linux dark | macOS dark | **1.0005:1** | 1.05:1 |
| Linux dark | Windows dark | 1.0448:1 | 1.05:1 |
| Linux dark | Windows XP (dark halves) | 1.0448:1 | 1.05:1 |
| Linux dark | Windows 7 Aero (dark halves) | 1.0448:1 | 1.05:1 |

All other 380 combinations pass all three checks. If the role is authored by the
*wrong* platform, the role that carries the Alert/Badge/Toast surface the package
deliberately holds to 1.05:1 (plan 076) is invisible.

This is the same class as plan 373: a **documented public call** can produce a
theme the package's own checker rejects. `applyPlatformStyle`'s JSDoc says
"Apply any platform style … to a base theme", and `getPlatformTheme` returns a
normal `Theme`, so a consumer can chain the two without a type error or a warning.

## 2. The decision

**A shipped style names the canvas-tuned tint it inherits.** The dark macOS,
Windows, XP and Aero sets gain `destructiveSoft` with the identity dark value
(`darkColors.destructiveSoft`, `#66191B`), imported from `color.ts` so the
value cannot drift from the identity it means.

Why this and not the alternatives:

- **Do not drop Linux's tint.** Plan 091 moved Linux dark's `destructiveSoft` to
  `#3A0B0D` because the light-accent `selection` wash over `#66191B` failed the
  body floor for `destructiveSoftForeground`. Moving it back reopens that defect.
- **Do not move the identity tint to `#3A0B0D`.** The identity dark canvas
  (`#191D25`) is darker than Linux's (`#242424`); `#3A0B0D` measures ~1.000:1 on
  it, so every identity dark soft-destructive panel would disappear.
- **Do not rebuild the palette from the identity on every application.** Plan
  373 deliberately keeps a base that already declares the level — a consumer's
  `extendTheme` edits included — and a style must keep overriding only the roles
  it names. Replacing the whole palette would erase brand edits.
- **Do not add provenance to `Theme`** (`platformStyle?: PlatformStyle`) to
  detect a platform base. That is a public type change, a docs/table/guard
  change, and a fresh axis of theme state, for a corner the data can fix in two
  values with no pixel moving.
- **Do not duplicate all 66 roles per style.** The style files are the copyable,
  readable override sets the docs teach; the two roles that need to be owned are
  exactly the ones another shipped style changes.

**No shipped pixel moves.** macOS dark, Windows dark, XP dark and Aero dark
already produce `#66191B` for `destructiveSoft` by inheritance; the fix *names*
the value they already carry. Every documented path (identity → style) renders
the same colour before and after.

**The invariant is guarded for the future.** A new test applies **every shipped
style and recipe to every shipped base** — identity, `createTheme`, macOS, Linux,
Windows, XP, Aero — in both modes, both contrasts and both requested levels, and
holds each result to all three public checks. If a future style changes a role
another style does not name, the cross-product fails instead of shipping a
hybrid.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/tokens/src/platform-styles/macos.ts` | import `darkColors`; add `destructiveSoft: darkColors.destructiveSoft` to `colors.dark` |
| `packages/tokens/src/platform-styles/windows.ts` | import `darkColors`; add `destructiveSoft: darkColors.destructiveSoft` to `colors.dark` (XP and Aero re-use this dark set, so both recipes inherit the fix) |
| `packages/tokens/src/platform-composition.test.ts` | **new** regression suite (§5) |
| `docs/tokens.md` | § *Platform styles*: state that a style names the canvas-tuned tint it owns and that every shipped base × style pair is checked; § *Authoring a platform style*: one sentence on the rule |
| `packages/tokens/README.md` | § *Platform styles*: one sentence beside the copy-and-own example |
| `docs/design-system.md` | § *Extension* (only if it repeats the "omitted roles inherit" claim without the tint) — add one clause |
| `packages/tokens/src/docs.test.ts` | hold the new platform sentence and the named-role claim (§6) |
| `packages/tokens/src/readme.test.ts` | hold the README sentence |
| `COMPONENTS.md` | *Platform style variants* row: record the cross-product guard |
| `TODO.md` | add and tick the task; update the workstream progress bar |
| `.agents/slop/plans/README.md` | index this plan and append its summary paragraph |

## 4. Implementation steps

### 4.1 macOS dark

In `packages/tokens/src/platform-styles/macos.ts`:

1. Change the import line from
   `import { systemUiFont, type PlatformStyle } from "../platform-types.js";`
   to add `import { darkColors } from "../color.js";` above it.
2. In `colors.dark`, after `placeholder: "#9A9AA0",`, add:

   ```ts
   destructiveSoft: darkColors.destructiveSoft,
   ```

3. Extend the file's header JSDoc with one sentence: the dark soft destructive
   tint is named so applying the style over another platform's theme cannot keep
   that platform's tint (plan 374).

### 4.2 Windows dark

Same in `packages/tokens/src/platform-styles/windows.ts`: import `darkColors`,
add `destructiveSoft: darkColors.destructiveSoft` to `colors.dark` after
`placeholder: "#A6A6A6",`, and add the same header sentence. XP (`recipes/xp.ts`)
and Aero (`recipes/aero.ts`) assign `windowsPlatformStyle.colors.dark` directly,
so both recipes pick the role up with no edit of their own. Do **not** edit the
recipe files.

### 4.3 The regression suite

Create `packages/tokens/src/platform-composition.test.ts` with the header below
(states the bug; the file must fail without the data change) and the cases in
§5.

### 4.4 Commands

Run from `workspaces/tokens-theme`:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: all files pass, including `platform-composition.test.ts`; test count
grows by the new file's cases.

```sh
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
```

Expected: every command exits 0 with no output after its banner.

### 4.5 Two-direction proof

The repo's `scripts/verify-two-directions.sh` uses `jj`, which is not installed
on this box (PLAN.md D1; TODO records it), so prove it by hand:

1. Stash/undo the two data lines **only** (keep the new test):
   `git stash push packages/tokens/src/platform-styles/macos.ts packages/tokens/src/platform-styles/windows.ts`
2. `nub exec vitest run src/platform-composition.test.ts` (inside
   `packages/tokens`) → **fails** on the four Linux-dark compositions, with
   `destructiveSoft` and `background` in the failure.
3. `git stash pop` → the same command passes.
Record both outputs in the commit message (a `refs` line is enough).

## 5. Test plan (`platform-composition.test.ts`)

Header comment:

> Guards the defect plan 374 fixes: `applyPlatformStyle` on a base that already
> carries another platform's theme kept the base's style-specific roles. Linux
> dark's `destructiveSoft` (`#3A0B0D`, plan 091) measured **1.0005:1** on macOS
> dark's canvas, so a macOS or Windows look applied over a Linux theme shipped an
> invisible Alert. This file fails without the fix.

Cases (all must be able to fail):

1. **The four measured regressions.** For each applied style
   `["darwin", "win32"]` and each recipe `["xp", "aero"]`:
   `themeContrastFailures(applyPlatformStyle(getPlatformTheme("linux", "dark"), style))`
   is `[]`. Assert the specific role, not just the empty array:
   `colors.destructiveSoft` is `darkColors.destructiveSoft` (pre-fix it is
   `palette.red[950]`, so this assertion alone fails without the fix).
2. **Every shipped base × style.** Bases: `getTheme(mode, contrast)`,
   `createTheme({ mode, contrast })`, every `platformNames` entry through
   `getPlatformTheme`, every `platformRecipeNames` entry through
   `getPlatformRecipeTheme`. Styles: `Object.values(platformStyles)` and
   `Object.values(platformRecipes)`. For each pair and each requested level
   (`themeContrasts`), assert `themeContrastFailures`,
   `themeMetricFailures` and `themeColorFailures` are `[]`, labelled with
   `base → style @ level`.
3. **No shipped pixel moves.** For every mode and contrast,
   `getPlatformTheme(platform, mode, contrast).colors.destructiveSoft` equals
   `getTheme(mode, contrast).colors.destructiveSoft` on all three real variants.
   (It is true before and after by inheritance/naming; it pins that the fix
   names the value rather than inventing one.) For dark, also assert the value
   is `darkColors.destructiveSoft` — false for Linux before and after, because
   Linux deliberately owns a different tint; scope this to macOS and Windows and
   both recipes.
4. **The XP/Aero dark half carries it.** `platformRecipes.xp.colors.dark` and
   `platformRecipes.aero.colors.dark` carry the same `destructiveSoft` as
   `platformStyles.win32.colors.dark`; the recipes share the Windows palette
   (plan 328) instead of redeclaring it.

Use `themeModes`, `themeContrasts`, `platformNames`, `platformRecipeNames`,
`platformStyles`, `platformRecipes` — every axis is iterated from its ordered
index, never retyped.

## 6. Documentation truth

- `docs/tokens.md` § *Platform styles*, after the "Each real variant changes …"
  paragraph: "A style names the roles it owns. macOS, Windows and both recipes
  name their dark `destructiveSoft` — the identity tint they already paint — so
  applying one style over another platform's theme cannot leave the previous
  canvas's tint behind (plan `374`). Every shipped base and style pair is applied
  in `platform-composition.test.ts` and held to all three checks."
- `docs/tokens.md` § *Authoring a platform style*: "A copied style that changes a
  canvas role another shipped style also changes must name that role, or the
  cross-product guard fails."
- `packages/tokens/README.md` § *Platform styles*: one sentence after the
  copy-and-own snippet, same claim.
- `docs/design-system.md` § *Extension*: if it says omitted roles inherit, add
  "and a style names the canvas-tuned tints it owns, so one style applied over
  another keeps its own tint".
- `docs.test.ts`: extend the existing "names the skeleton a real platform style
  carries" case (or add one beside it) so the page must contain the new sentence
  and `(status, disabled, scrollbar)` must be replaced by the truthful
  parenthetical that no longer claims every status role is unnamed; also assert
  each real dark style names `destructiveSoft`.
- `readme.test.ts`: assert the README sentence.

## 7. STOP conditions

Stop and report, without improvising, if:

- any command in §4.4 fails for a reason other than the four known combinations;
- naming `darkColors.destructiveSoft` changes a shipped theme's value (compare
  `getPlatformTheme` output before/after) — that would mean the tint is not the
  inherited one and the decision must be revisited;
- the two-direction proof in §4.5 fails in either direction;
- a test outside this workstream's paths must change (record it in `TODO.md`
  as a cross-team row instead);
- the cross-product test finds a failure beyond `destructiveSoft` (report the
  role, the pair and the ratio; do not add a value silently).

## 8. Acceptance

- The four Linux-dark combinations pass all three checks.
- The full shipped base × style × mode × contrast × level cross-product passes.
- No shipped theme's colour value changes.
- `nub run check`, `nub run lint`, `nub run test` pass.
- `platform-composition.test.ts` fails with the data change reverted and passes
  with it.
- `docs/tokens.md`, `packages/tokens/README.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and this index are current.

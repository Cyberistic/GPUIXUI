# Plan 347 — The value indicator's track: a role the contract never had

**Phase:** F · **Owner:** `tokens-theme` · **Status:** done
**Depends on:** 071 (the public contract), 076/300 (surface pairs), 309 (state
fills on their panel), 332 (a fill painted as a mark), 338 (`filledControl`).
**Owns:** `packages/tokens/src/color.ts`,
`packages/tokens/src/platform-styles/macos.ts`,
`packages/tokens/src/platform-styles/linux.ts`,
`packages/tokens/src/platform-styles/windows.ts`,
`packages/tokens/src/platform-styles/recipes/xp.ts`,
`packages/tokens/src/platform-styles/recipes/aero.ts`,
`packages/tokens/src/contrast.ts`, `packages/tokens/src/track-contrast.test.ts`
(new), `packages/tokens/src/contrast.test.ts`, `packages/tokens/src/docs.test.ts`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

`Progress`, `Meter` and `Slider` paint their **track** with `theme.colors.muted`
(`packages/primitives/src/core/style.ts`, `progressTrackStyle` at line 437 and
`sliderRailStyle` at line 506). `muted` is a **surface** role: the quiet panel,
not a fill. In the dark palettes it is the same value as the surface the
indicator sits on:

| Palette | track (`muted`) | surface it sits on | ratio |
| ------- | --------------- | ------------------ | ----- |
| identity dark | `#222730` | `popover` `#222730` | **1.000:1** |
| macOS dark | `#2C2C2E` | `card`, `popover` `#2C2C2E` | **1.000:1** |
| Linux dark | `#303030` | `card`, `popover` `#303030` | **1.000:1** |
| Windows / XP / Aero dark | `#2B2B2B` | `card`, `popover` `#2B2B2B` | **1.000:1** |

The consequence is not cosmetic. `Progress` with `value={undefined}` renders
`progressPercent(undefined ?? 0)` = 0, so the fill has zero width and **the track
is the entire control**: an indeterminate progress bar on a dark card paints
nothing at all. The basic-app example renders exactly that composition
(`examples/basic-app/src/App.tsx`, the `saving` block inside a dialog). A slider
or meter rail loses its unfilled half on a card or in a menu, so the thumb's
position has no visible span.

Nothing catches it. `markPairs` (plan 332) measures the **fill** (`primary`,
`success`, `destructive`) against `muted`; it never measures the track itself,
because `muted` is a surface and is deliberately *not* a fill (plan 309 tuned it
as a panel; it is 1.02–1.04:1 from the card on purpose, and several sets share
its value with `hover` or `secondary`). The completeness guard sees `muted`
measured as a surface, so the role is "accounted for" while the composition is
not.

The same class of defect plan 078 fixed for the loading skeleton: a role that is
painted as the fill of a state, but measured only as a surface.

## 2. The decision

Add one semantic role, **`track`** — "the unfilled groove of a value indicator" —
65 → 66 roles, and hold it in the public contract:

- `trackSurfacePairs`: `track` against `background`, `card`, `popover`, `muted`,
  `accent` and `selected` at the 1.05:1 `surface` floor.
- `trackMarkPairs`: `primary`, `success`, `destructive` and `mutedForeground`
  (the four `PROGRESS_TONES` fills, `muted` tone included) against `track` at the
  `mark` floor (3:1, 4.5:1 at AAA).

Contrast pairs move **323 → 333**.

### 2.1 Why a new role

- **`muted` is wrong by construction.** It is the quiet panel surface and the
  platform darks set it equal to the card they raise the panel from. Making it a
  fill would undo plan 309's deliberate panel ladder.
- **`border` cannot be the track.** It is a line role: at high contrast it is
  `#575E6B`/`#A0A0A0`, and `primary` measures **1.432:1** on it — a progress
  segment would disappear into its own track except on the default identity set.
- **`active` cannot be the track.** It is a pressed wash. macOS dark's
  `primary #0A84FF` measures **2.84:1** on it (3.11:1 on `hover`), under the 3:1
  mark floor, and the state direction is wrong: a pressed fill steps *away* from
  the canvas, while the track must separate from every surface in either mode.

### 2.2 The values

Chosen as a neutral step away from the surfaces in each palette's own hue, then
verified against both pair lists. The tightest shipped pair is XP light `track`
on its `selected` fill at **1.06:1**; the tightest mark is Aero light `success`
on `track` at **3.15:1**.

| Theme | Mode | `track` |
| ----- | ---- | ------- |
| identity | light | `#DBDFE5` |
| identity | dark | `#323945` |
| identity (AAA) | light | `#C6C8CD` |
| identity (AAA) | dark | `#3A3A3A` |
| macOS | light | `#DADADF` |
| macOS | dark | `#242426` |
| Linux | light | `#DAD8D6` |
| Linux | dark | `#2A2A2A` |
| Windows | light | `#D8D8D8` |
| Windows | dark | `#262626` |
| Windows XP | light | `#E6E2D1` |
| Windows XP | dark | `#262626` (the Windows dark palette) |
| Aero | light | `#CED8E5` |
| Aero | dark | `#262626` (the Windows dark palette) |

AAA platform variants keep the identity AAA value because
`applyPlatformStyle` skips colour overrides at `"high"`; there are only two AAA
values.

### 2.3 The surfaces and the deliberate omission

The four base surfaces plus `accent` and `selected` are measured. `hover` and
`active` are **not**: they are momentary pointer washes, and the filled portion
(the mark) still carries the value while the pointer is down. They are also the
one constraint the XP light palette cannot satisfy without changing a shipped
value: at the luminance where `success` stays at 3:1 on the track, XP's
`active #DDD7BE` is only 1.04:1 away, and darkening `active` would make XP's
`border` edge invisible on the pressed wash (plan 080's guarantee). The pair
list therefore follows plan 300's precedent: name the persistent surfaces, and
state the transient ones as out of scope in the docs.

### 2.4 The consumer migration

`primitives` still paints `muted`; the contract keeps the `markPairs` on `muted`
until it migrates, the way plan 334 kept the secondary Button's generic washes.
The migration is recorded cross-team in `TODO.md`, owner `primitives`:
`progressTrackStyle` and `sliderRailStyle` read `theme.colors.track`.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/color.ts`

1. In `ThemeColors`, after the `skeleton` field (search
   `readonly skeleton: string;`), add:

   ```ts
   /**
    * The unfilled groove of a value indicator — a progress bar, meter or slider
    * rail. A surface role cannot carry this: the quiet panel is the same value
    * as the card in every platform dark style, so a track painted with `muted`
    * disappears on the surface it sits on.
    */
   readonly track: string;
   ```

2. Add `track` to each of `lightColors`, `darkColors`,
   `highContrastLightColors` and `highContrastDarkColors`, immediately after
   `skeleton`:

   - light: `track: "#DBDFE5",`
   - dark: `track: "#323945",`
   - high-contrast light: `track: "#C6C8CD",`
   - high-contrast dark: `track: "#3A3A3A",`

3. In `colorRoles`, add `"track",` after `"skeleton",` and before
   `"scrollbar",`.

### 3.2 `packages/tokens/src/platform-styles/macos.ts`

After `skeleton` in each mode's colours, add `track: "#DADADF",` (light) and
`track: "#242426",` (dark).

### 3.3 `packages/tokens/src/platform-styles/linux.ts`

After `skeleton` in each mode's colours, add `track: "#DAD8D6",` (light) and
`track: "#2A2A2A",` (dark).

### 3.4 `packages/tokens/src/platform-styles/windows.ts`

After `skeleton` in each mode's colours, add `track: "#D8D8D8",` (light) and
`track: "#262626",` (dark).

### 3.5 `packages/tokens/src/platform-styles/recipes/xp.ts`

After `skeleton: "#CFC8AE",` in the light palette, add `track: "#E6E2D1",`.
The dark half is `windowsPlatformStyle.colors.dark`, so it inherits the Windows
track; do not add a dark value.

### 3.6 `packages/tokens/src/platform-styles/recipes/aero.ts`

After `skeleton: "#BDCFE4",` in the light palette, add `track: "#CED8E5",`.
The dark half inherits the Windows track; do not add a dark value.

### 3.7 `packages/tokens/src/contrast.ts`

1. After the `skeletonSurfaces` / `surfacePairs` block, add:

   ```ts
   /**
    * The surfaces a value indicator's unfilled groove sits on. A progress bar,
    * meter or slider rail can be placed on the four base surfaces, a selectable
    * row's persistent `accent` fill and a selected row's `selected` fill. The
    * momentary `hover`/`active` washes are deliberately absent: the filled part
    * of the indicator still carries the value while the pointer is down, and the
    * XP light palette has no track that clears both the 1.05:1 wash floor and
    * the 3:1 mark floor at once.
    */
   const trackSurfaces = [
     "background",
     "card",
     "popover",
     "muted",
     "accent",
     "selected",
   ] as const;

   /** The track measured against every surface it is painted on. */
   export const trackSurfacePairs: readonly ContrastPair[] = trackSurfaces.map(
     (background): ContrastPair => ["track", background, "surface"],
   );

   /**
    * The filled part of a value indicator is a mark, not a wash: a progress
    * segment that matches its groove is a bar with no value. The four
    * `PROGRESS_TONES` in `primitives` are `primary`, `success`, `destructive`
    * and `muted` (which paints `mutedForeground`), so all four are held to the
    * mark floor on the track.
    */
   export const trackMarkPairs: readonly ContrastPair[] = [
     ["primary", "track", "mark"],
     ["success", "track", "mark"],
     ["destructive", "track", "mark"],
     ["mutedForeground", "track", "mark"],
   ];
   ```

2. In `contrastPairs`, after `...surfacePairs,` add:

   ```ts
   ...trackSurfacePairs,
   ...trackMarkPairs,
   ```

3. In the JSDoc above `contrastPairs`, append a sentence after the mark
   paragraph: "The unfilled groove of a progress bar, meter or slider rail is
   `track`; its four surfaces and the four fills painted on it are measured, so
   a value indicator cannot lose its track on a dark card (`trackSurfacePairs`,
   `trackMarkPairs`)."

### 3.8 `packages/tokens/src/track-contrast.test.ts` (new)

Header comment states the bug being guarded (indeterminate progress paints
nothing on a dark card because `muted` equals `card`/`popover`).

Cases:

1. `"publishes six surface pairs and four mark pairs"` — assert the exact tuple
   lists and classes.
2. `"the old role was invisible on the surfaces the indicator paints"` — for
   every dark default variant, `contrastRatio(theme.colors.muted, surface)`
   against `card` and `popover` is **below 1.05** for at least one of the two,
   and name the identity-dark `popover` and macOS-dark `card` as exactly
   `1.000:1` so the regression is pinned, not restated.
3. `"every shipped track clears the surface floor on the six surfaces"` — loop
   `themeModes × themeContrasts × {identity, platformNames, platformRecipeNames}`
   and assert `>= floors.surface`.
4. `"every progress tone is a mark on the track"` — same loop over
   `trackMarkPairs`, against the level's `mark` floor.
5. `"every platform carries its own track"` — for each of `darwin`, `linux`,
   `win32` and each mode, the default-contrast track differs from the identity
   theme's track; XP/Aero light differ from Windows light.
6. `"a track that matches its card is reported"` — `extendTheme(lightTheme,
   { colors: { track: lightTheme.colors.card } })` produces a `surface` failure
   with `foreground: "track"` from `themeContrastFailures`.
7. `"an edited track merges"` — `extendTheme` override of `track` changes only
   that role, and `themeContrastFailures` still returns `[]` for a track chosen
   from the same set's `active`? No: assert the override is applied and the rest
   of the palette is untouched.

### 3.9 `packages/tokens/src/contrast.test.ts`

- Bump the exact pair count `323` → `333` (line 389).
- Add a line to the header comment naming plan 347 and the 1.000:1 regression.

### 3.10 `packages/tokens/src/docs.test.ts`

- The pair-count sentence: the page must say
  `taking it from 323 to **${contrastPairs.length}**`; update the test's
  hard-coded `315`.
- The audit range sentence: `plans \`076\`–\`346\` closed` → `plans \`076\`–\`347\` closed`.
- Add a quoted-figure case `"quotes the invisible track the audit found"` that
  derives identity dark `muted` on `popover` and macOS dark `muted` on `card`
  from the themes and requires the page to contain both `1.000:1` figures in the
  track paragraph.

### 3.11 `docs/tokens.md`

- `ThemeColors` row: `65` → `66`.
- "There are 65 roles." → `There are 66 roles.` and add a sentence naming
  `track` beside the state roles: the unfilled groove of progress/meter/slider,
  separate from `muted` because a surface role equals the card/popover in every
  platform dark style; measured on the four base surfaces and the persistent
  `accent`/`selected` fills, with the four progress fills as `mark` pairs;
  transient washes out of scope.
- Default role table: add
  ``| `track` | `#DBDFE5` | `#323945` | the unfilled groove of a progress bar, meter or slider rail |``
  after `skeleton`.
- High-contrast role table: add
  ``| `track` | `#C6C8CD` | `#3A3A3A` | ... |`` after `skeleton`.
- "the same 65 roles" → `the same 66 roles`.
- In the state section (near the skeleton/mark paragraphs), add a paragraph:
  the defect (`muted` equals card/popover in identity dark and every platform
  dark, so an indeterminate progress bar paints nothing), the two refused
  roles (`border`: 1.43:1 at AAA; `active`: 2.84:1 on macOS dark), the six
  surfaces and the four mark pairs, the values, the tightest ratios, the
  transient-wash omission, and the cross-team migration.
- Pair-count history: append "Plan `347` adds the value indicator's track — six
  surface pairs and four fills as marks — taking it from **323** to **333**."
- Profile the platform table? No: it quotes type/shape/accent only. Check the
  recipe table for a colour row and add only if present.
- Audit range sentence: `plans 076–346` → `plans 076–347`.

### 3.12 `docs/design-system.md`

- "Both themes expose exactly the same 65 roles" → 66 (the template fills the
  number).
- In §7/§8, add one paragraph: a value indicator's unfilled groove is `track`,
  not `muted`; the platform dark palettes set `muted` equal to their card, so a
  track painted with it vanished on the surface it sat on; the role is measured
  on the four base surfaces and the persistent row fills, and its four fills are
  marks against it. Keep it short; the catalogue carries the values.

### 3.13 `packages/tokens/README.md`

- "It reuses the same 65 roles" → 66 (the test derives it).
- Add `track` to the role list/summary if one exists; otherwise add one
  sentence to the roles paragraph.

### 3.14 `COMPONENTS.md`

- `Design tokens` row: `65 semantic roles` → 66; append a sentence describing
  `track` and the dark-card regression.
- `High-contrast theme` row: `same 65 roles` → 66 (derived by the test).
- `Theme contrast check` row: `${contrastPairs.length}` is derived; update the
  prose from `323` to `333` and append the plan 347 sentence.

### 3.15 `TODO.md` and the plan index

- Add under the tokens section (and tick):
  `[x] Ship the value indicator's track — \`track\` is a role, measured on the
  four base surfaces and the persistent \`accent\`/\`selected\` fills, with the
  four progress fills as marks, because \`muted\` equals the card/popover in
  every platform dark style and an indeterminate progress bar painted nothing
  (plan 347)`.
- Add cross-team:
  `[ ] Cross-team: \`primitives\` paints \`progressTrackStyle\` and
  \`sliderRailStyle\` with \`theme.colors.track\` — the designed groove role —
  instead of the surface role \`muted\` (owner: \`primitives\`; plan 347)`.
- Update the progress bar `114/149` → `115/150`.
- Plan index: add the 347 row with status `done` after implementation and a
  short paragraph describing the plan.

## 4. Commands and expected results

```bash
nub run --filter @gpuixui/tokens test
# 67 test files, all passing; no failures.
nub run --filter @gpuixui/tokens check-types
# tsc exits 0.
nub run check
# tests, lint, format and type checks all pass.
```

**Two-direction proof.** Before implementing, run the new
`track-contrast.test.ts` against the unchanged package:
`nub run --filter @gpuixui/tokens test -- track-contrast` must fail (the role
does not exist; the surface-loop assertion cannot run). After adding the role,
the same command passes. Then revert only `color.ts`'s `track` value to `muted`
on one palette (identity dark) and confirm case 3 fails with a `surface`
failure, then restore it.

## 5. STOP conditions

- STOP if any shipped theme needs a value moved in an *existing* role to make a
  track pass. The design above avoids that; if the constraints cross, report the
  failing set and values rather than editing unrelated roles.
- STOP if `color.test.ts` or `styles.test.ts` requires a role map that cannot
  take a new key without a structural change; report the exact error.
- STOP if the docs test's role-table parser rejects the new row's position;
  report the parser's expectation rather than reordering roles.
- Do not edit `packages/primitives` in this workstream. The migration is a
  cross-team row.

## 6. Acceptance

- `track` ships in all 14 palettes (two AAA), the role type and `colorRoles`.
- `trackSurfacePairs` and `trackMarkPairs` are exported and in `contrastPairs`;
  `contrastPairs.length` is 333.
- Every shipped theme passes both new lists at its declared floors.
- The regression is pinned: `muted` on `popover` (identity dark) and on `card`
  (macOS dark) measures 1.000:1, and the page says so.
- The catalogue, design system, README, inventory and plan index agree with the
  implementation, and every count is derived by a test.
- `nub run check`, `nub run lint`, `nub run test` pass.

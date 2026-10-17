# 305 — The last two unions without an ordered index

**Workstream:** `tokens-theme` · **Phase:** F (contract closure) · **Depends on:**
067, 068, 096, 304 · **Touches:** `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`

## 1. The gap

Plans 067, 068 and 096 gave every union a consumer can persist an **ordered
index** beside its narrowing guard: `platformNames` / `isPlatformName`,
`densityNames` / `isDensityName`, `statusTones` / `isStatusTone`,
`controlSizes` / `isControlSize`. Two unions were missed: `ThemeMode` and
`ThemeContrast` ship guards but no index.

That is not cosmetic. Fourteen suites write the members by hand:

```ts
(["light", "dark"] as const).map((mode) => …)
(["default", "high"] as const).flatMap((contrast) => …)
```

A third mode added to the union would compile (`themes` is a
`Record<ThemeMode, Theme>` and would demand a value), but every one of those
loops would keep testing two, so the new variant would ship with no contrast
audit while the suite stayed green. The same duplication is what plan 096
removed from `scale.test.ts` and `styles.test.ts`; the guards themselves also
compare literals instead of deriving from one list.

A consumer (the docs platform/mode toggle, a settings row, a persisted
preference) has the same problem: nothing to iterate, so it retypes
`"light" | "dark"` or drops a member.

## 2. Decisions (do not re-litigate)

- `themeModes` and `themeContrasts` live in `theme.ts` beside the themes they
  select, in documentation order (`light`, `dark`; `default`, `high`).
- `ThemeMode` and `ThemeContrast` derive from their index. The guards narrow by
  scanning the index, so adding a member is one edit at the union owner.
- The existing records stay the data: `themes` / `highContrastThemes` and
  `contrastFloors` are not retyped, and the indexes are held to them by test.
- No new module, no new dependency, no colour or scale change.

## 3. Exact changes

### 3.1 `packages/tokens/src/theme.ts`

Above `Theme`:

```ts
/**
 * Theme modes the library ships, in documentation order. `ThemeMode` derives
 * from this list, so a new mode must also gain a value in `themes` and
 * `highContrastThemes`.
 */
export const themeModes = ["light", "dark"] as const;

/** Theme modes the library ships. */
export type ThemeMode = (typeof themeModes)[number];
```

Replace the standalone `ThemeContrast` declaration and both guards:

```ts
/**
 * Contrast variants the library ships, in documentation order. `ThemeContrast`
 * derives from this list, so a new variant must also gain a set of floors and
 * a theme per mode.
 */
export const themeContrasts = ["default", "high"] as const;

/** Contrast variants the library ships, independent of light/dark mode. */
export type ThemeContrast = (typeof themeContrasts)[number];

/** Narrow unknown input to a theme mode. Not a theme decoder. */
export const isThemeMode = (value: unknown): value is ThemeMode =>
  themeModes.some((mode) => mode === value);

/** Narrow unknown input to a contrast variant. Not a theme decoder. */
export const isThemeContrast = (value: unknown): value is ThemeContrast =>
  themeContrasts.some((contrast) => contrast === value);
```

Remove the now-duplicated `ThemeMode` / `ThemeContrast` declarations; keep the
`getTheme` signature and every theme object unchanged.

### 3.2 The fourteen suites that retype a union

Replace the literal loops with the index and add the import from `./index.js`
(the file already imports its theme from there):

| File | Replacement |
| ---- | ----------- |
| `overlay-scrim.test.ts` | `(["light", "dark"] as const)` → `themeModes` |
| `primary-text.test.ts` | same |
| `control-boundary-soft.test.ts` | `themeModes` and `themeContrasts` (two loops) |
| `skeleton-washes.test.ts` | same |
| `selection-text.test.ts` | `themeModes` |
| `filled-states.test.ts` | `const modes = ["light", "dark"] as const` → `const modes = themeModes`; `const contrasts: readonly ThemeContrast[] = ["default", "high"]` → `const contrasts = themeContrasts` (drop the unused `ThemeContrast` import) |
| `control-edge.test.ts` | `themeModes` |
| `control-boundary.test.ts` | `themeModes` and `themeContrasts` |
| `status-text.test.ts` | `themeModes` and `themeContrasts` |
| `selection-secondary.test.ts` | `themeModes` |
| `body-text-surfaces.test.ts` | `themeModes` |
| `state-text.test.ts` | `themeModes` |
| `ring-soft.test.ts` | `themeModes` and `themeContrasts` |
| `soft-quiet-panel.test.ts` | `themeModes` |
| `soft-divider.test.ts` | `themeModes` and `themeContrasts` |
| `platforms.test.ts` | `const modes = ["light", "dark"] as const` → `const modes = themeModes` (keep the platform axis) |

Mechanical, no assertion changes. `inventory.test.ts`'s helper parameter
`"default" | "high"` becomes `ThemeContrast` so the last hand-written copy of
the union goes; import the type from `./index.js`.

### 3.3 `packages/tokens/src/guards.test.ts`

Switch the two existing guard cases to iterate the indexes, and add:

1. **The indexes match the shipped records**:
   `expect(Object.keys(themes)).toEqual([...themeModes])` and
   `expect(Object.keys(highContrastThemes)).toEqual([...themeModes])`; for the
   contrast axis, every `themeContrasts` entry resolves through
   `getTheme(mode, contrast)` to a theme declaring that same level.
2. **Every mode has every contrast variant**: nested `themeModes` ×
   `themeContrasts`, `getTheme(mode, contrast).mode === mode` and
   `.contrast === contrast`. This is the case that fails if a mode is added to
   the index without both variants — or if a variant is added without the
   themes.
3. **A stored pair resolves to the shipped theme**: executed example below.

### 3.4 `packages/tokens/src/persisted-choices.example.ts`

Add the consumer-shaped function the docs describe:

```ts
/**
 * Resolve a stored mode and contrast to a shipped theme. An unknown half keeps
 * the readable default rather than selecting a theme that does not exist.
 */
export const themeFromStoredChoice = (stored: {
  readonly mode: unknown;
  readonly contrast: unknown;
}): Theme =>
  getTheme(
    isThemeMode(stored.mode) ? stored.mode : "light",
    isThemeContrast(stored.contrast) ? stored.contrast : "default",
  );
```

Cover it in `guards.test.ts`: a stored `dark`/`high` pair returns
`highContrastDarkTheme`; an unknown pair returns `lightTheme`.

### 3.5 `docs/tokens.md`

- **Theme API** persisted-choice paragraph: add `themeModes` and
  `themeContrasts` beside the guards — "iterate the index rather than retyping
  the union".
- The sentence must stay derivable: the guard in `docs.test.ts` checks both
  names appear (the namespace-wide value-coverage case already requires them
  once they are exported; this makes the mention explanatory rather than
  incidental).

### 3.6 `docs/design-system.md` §11 and `packages/tokens/README.md`

One clause each: the mode and contrast axes have ordered indexes beside their
guards, so a settings row or a docs toggle iterates them.

### 3.7 `COMPONENTS.md`

Extend the *Theme extension* row with `themeModes` / `themeContrasts`: the two
axes now have ordered indexes beside their narrowing guards, so a settings row
or docs toggle cannot omit a member.

### 3.8 `TODO.md`

Add, ticked:

```md
`[x]` Ship `themeModes` / `themeContrasts` as ordered indexes and derive the
unions and guards from them — the last two unions without an index, retyped in
sixteen test loops, so a third mode would have shipped untested (plan 305)
```

Update the section's done/total counts (`72/96` → `73/97`).

### 3.9 `.agents/slop/plans/README.md`

Add `305` with status `done` and a narrative paragraph.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test src/guards.test.ts` (after §3.3, before §3.1) | fails to resolve `themeModes` — the index does not exist yet |
| 2 | `nub run --filter @gpuixui/tokens test` (after §3.1–3.4) | 39 files green, 1826 + the new cases |
| 3 | `grep -rn '\["light", "dark"\]' packages/tokens/src --include=*.test.ts` | no matches |
| 4 | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| 5 | `nub run check` | exit 0 |
| 6 | `nub run lint` | exit 0 |
| 7 | `nub run test` | exit 0 |

## 5. Test plan — proof in both directions

1. Write §3.3 first: it cannot import `themeModes`; record the failure.
2. Add §3.1 and the example: the coverage cases pass.
3. Two-direction proof for the coverage guard: temporarily drop `"dark"` from
   `themeModes` (do not commit) and confirm the "indexes match the records"
   case fails with the missing mode; restore.
4. Mechanical sweep check: `grep` shows no hand-written `["light", "dark"]` or
   `["default", "high"]` left in the package's suites.
5. The shipped suites stay green — this changes no colour, scale or floor.

## 6. STOP conditions

Stop and report, do not improvise, if:

- a test uses a mode literal for something other than iterating the shipped
  axis (a single `getTheme("dark")` call is fine and stays);
- removing a local `ThemeContrast` import leaves an unused import or a type
  error in a file that still needs the type;
- the change needs a cast or an `as const` on the index (it is already
  `as const`);
- a shipped theme or contrast pair changes value.

## 7. Acceptance

- [x] `themeModes` / `themeContrasts` exist, and both unions derive from them.
- [x] The guards scan the index; adding a member is one edit at the owner.
- [x] No package suite retypes either union.
- [x] A stored mode/contrast pair resolves through the executed example.
- [x] Docs, README, `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint`, `nub run test` pass — run, not assumed.
- [x] Committed on `agent/tokens-theme` and pushed.

## 8. Outcome (executed on this host, 2026-10-17)

- `themeModes` and `themeContrasts` now own both axes in `theme.ts`;
  `ThemeMode` and `ThemeContrast` derive from them and `isThemeMode` /
  `isThemeContrast` scan them instead of comparing literals.
- Sixteen suites stopped retyping the axes. `grep -rn '\["light", "dark"\]'` over
  `packages/tokens/src --include=*.test.ts` returns nothing, and the same for
  the contrast pair; the loops still cover every shipped variant because they
  read the index.
- `guards.test.ts` holds `Object.keys(themes)` and
  `Object.keys(highContrastThemes)` to `themeModes`, proves every mode resolves
  every contrast through `getTheme` with the matching `mode` and `contrast`, and
  runs `themeFromStoredChoice` for the persisted-path example.
- `themeFromStoredChoice` was added to `persisted-choices.example.ts`; a stored
  `dark`/`high` pair returns the AAA dark theme, an unknown pair returns the
  light theme.
- Two-direction evidence, run and reverted: dropping `"dark"` from `themeModes`
  failed **two** cases — `expected [ 'light', 'dark' ] to deeply equal [ 'light'
  ]` and the stored-choice case, which then fell back to
  `High contrast light`; the restored index passes 19/19 in the file. Before
  the guard existed the literal loops would have kept passing with the mode
  missing, which is the defect.
- `inventory.test.ts`'s floor-row helper now takes `keyof typeof
  contrastFloors`, removing the last hand-written contrast union in test code.
- Green: **39 test files, 1829 tests** (1826 before the three new cases).
  `nub run check`, `nub run lint` and `nub run test` were run and passed.

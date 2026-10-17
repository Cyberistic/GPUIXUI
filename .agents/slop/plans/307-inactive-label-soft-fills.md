# 307 — The inactive label inside a status panel

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
090–093, 306 · **Touches:** `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`,
this index

## 1. The gap

Plan 306 gave the inactive label a floor (`inactive`, 3:1 default / 4.5:1 at
AAA) on nine surfaces: its own `disabled` fill, the four plain surfaces and the
four row washes. Plans 090–093 already treat the four soft status fills as
surfaces a composition paints on — a status surface, its designed edge, the
selection wash, the essential boundary and the focus ring are all measured there,
because an Alert, Badge or Toast carries actions ("Retry", "Undo", "Dismiss")
and those actions can be disabled.

`disabledForeground` is not measured on those four fills. Every shipped set
already clears the floor — the table below — so this is the same contract
completion plan 093 made for the ring, not a colour fix:

| Set | `infoSoft` | `successSoft` | `warningSoft` | `destructiveSoft` |
| --- | ---------- | ------------- | ------------- | ----------------- |
| light | 3.50 | 3.45 | 3.50 | 3.41 |
| dark | 5.01 | 5.12 | 5.10 | 5.16 |
| high-contrast light | 4.81 | 5.24 | 5.28 | 4.65 |
| high-contrast dark | 5.41 | 5.43 | 5.14 | 5.64 |
| macOS light / Linux light / Windows light | 3.50 | 3.45 | 3.50 | 3.41 |
| macOS dark / Linux dark / Windows dark | 5.01 | 5.12 | 5.10 | 5.16 / 7.19 |

The risk is an edited theme, not a shipped one: a brand that re-tints
`warningSoft` or moves `disabledForeground` has no pair behind the disabled
"Retry" in its Toast, and `themeContrastFailures` would say nothing.

## 2. Decision (do not re-litigate)

- The four soft fills join `inactiveSurfaces`, so `inactivePairs` grows from nine
  to thirteen and `contrastPairs` from 144 to 148.
- No colour moves: every shipped pair clears 3:1 / 4.5:1 with margin.
- The pairs are ordered with the other soft-fill compositions: after the nine
  existing surfaces, in `statusTones` order (`info`, `success`, `warning`,
  `destructive`), so a fourth tone cannot ship unmeasured.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. Add a companion list derived from `softSurfaceRoles` (already declared at the
   top of the file, in `statusTones` order) and spread it into
   `inactiveSurfaces`:

   ```ts
   const inactiveSoftPairList: readonly ContrastPair[] = softSurfaceRoles.map(
     (background): ContrastPair => ["disabledForeground", background, "inactive"],
   );
   ```

   Simpler: keep one list and append the four names, so `inactiveSurfaces` stays
   the documented order:

   ```ts
   export const inactiveSurfaces = [
     "disabled", "background", "card", "popover", "muted",
     "hover", "active", "accent", "selected",
     "infoSoft", "successSoft", "warningSoft", "destructiveSoft",
   ] as const;
   ```

   The soft names must be taken from `softSurfaceRoles` rather than retyped; the
   executor should build the array as
   `[...inactiveBaseSurfaces, ...softSurfaceRoles]` with a module-local
   `inactiveBaseSurfaces`, so the four tones are never duplicated.

2. Update the `inactiveSurfaces` JSDoc: a status panel carries actions, and a
   disabled one is an inactive label on the soft fill.

### 3.2 `packages/tokens/src/contrast.test.ts`

- `inactivePairs.length` 9 → 13 and the expected surface order gains the four
  soft fills.
- `contrastPairs.length` 144 → 148.

### 3.3 `packages/tokens/src/inactive-soft.test.ts` (new)

Header: *Guards the gap plan 307 closed: the inactive floor covered the nine
surfaces of plan 306 but not the four soft status fills a Toast's or Alert's
action sits on, so a brand theme could ship an invisible disabled "Retry" while
`themeContrastFailures` stayed silent.*

Tests:

1. **The four pairs exist in tone order** — `inactiveSoftPairs` (export it, like
   `controlBoundarySoftPairs`) is the four `xSoft` names derived from
   `statusTones`.
2. **Every shipped set clears the floor on the four fills** — identity, AAA and
   platform themes, at the theme's declared `inactive` floor.
3. **The public checker reports an erased label** — extend the light theme with
   `disabledForeground: theme.colors.warningSoft` and assert the checker returns
   exactly the four `inactive` failures with ratio 1, so the pairs are wired into
   `themeContrastFailures` and not merely declared.

The file fails on the current tree (test 1 and 3 fail without §3.1).

### 3.4 Documents

- `docs/tokens.md`: the inactive paragraph in *Checking a theme* names the four
  soft fills and `inactiveSoftPairs`; the *Verification* sentence lists them.
- `docs/design-system.md`: the `inactive label` row of the §9 table gains "and
  the four soft status fills"; no other sentence changes.
- `packages/tokens/README.md`: one clause in the inactive paragraph.
- `COMPONENTS.md`: the *Theme contrast check* row's pair count 144 → 148 and the
  inactive clause gains the four fills.
- `TODO.md`: tick a row; the progress bar 74/98 → 75/99.

### 3.5 Plan index

Add 307 with status `done` and a closing paragraph.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | before §3.1: `inactive-soft.test.ts` fails (list length, missing pairs) |
| 2 | same | after: 41 files green |
| 3 | `nub run check` | exit 0 |
| 4 | `nub run lint` | exit 0 |
| 5 | `nub run test` | exit 0 |

## 5. STOP conditions

Stop and report if a shipped set is under the floor on a soft fill (that would be
a colour fix, and the plan's "no colour moves" premise is wrong), or if a change
is needed outside the paths listed above.

## 6. Acceptance

- [x] `inactiveSurfaces` is thirteen surfaces and the four soft ones come from
      `statusTones`.
- [x] Every shipped set clears the declared inactive floor on all four fills.
- [x] The checker reports an erased inactive label on a soft fill.
- [x] Documents and ledger are current; gates pass; committed and pushed.

## 7. Outcome (executed on this host, 2026-10-17)

- The pairs were missing and the suite said so first: with `inactiveSoftPairs`
  left out of `inactivePairs`, `covers every documented pair`,
  `reports an inactive label that the soft fill erases` and the ledger guard all
  failed; restored, all pass. No colour moved — the shipped worst is 3.41:1
  (light `destructiveSoft`) against the 3:1 floor, and 4.65:1 at AAA against 4.5.
- `inactiveSoftPairs` is public and built from `softSurfaceRoles`, so a fifth
  status tone cannot ship without its inactive pair; `inactiveSurfaces` is the
  thirteen-entry order the docstring and the test share.
- Green: **41 test files, 1987 tests**. `nub run check`, `nub run lint`,
  `nub run fmt` and `nub run test` were run and passed.

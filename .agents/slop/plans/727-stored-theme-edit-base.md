# 727 — A stored edit records the base it was made against

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (the extension mechanism's persistence contract).
**Depends on:** 011 (the package), 063/311 (`platformStyles`, recipes), 380
(`resolveThemeChoice`), 529 (`ThemeChoice` URL codec), 685 (`themeOverrides`),
713 (the no-mutation contract).
**Status:** done

> **Status: executed 2026-10-20.** Execution evidence is at the end of this plan.

## 1. The defect

`themeOverrides(base, theme)` is `extendTheme`'s inverse, and every document
states one constraint on its base: **the mode must match**. Four consumer
surfaces say so —

- `packages/tokens/src/theme-diff.ts`: “the caller must choose a base of the
  theme's mode, and the absence is not a silently wrong diff”;
- `docs/tokens.md` § Deriving a theme back to overrides: “A different `mode`
  returns `undefined` … choose a base of the theme's mode”;
- `packages/tokens/README.md`: “`undefined` means the modes differ, because
  `extendTheme` cannot change the mode”;
- `docs/design-system.md` § 11: “A different mode returns `undefined`, because
  the mode is not overridable”.

The constraint is real but **insufficient**: the overrides are relative to *that
exact base*, not to its mode. `resolveThemeChoice` can rebuild every shipped
base, so the rule a consumer can actually follow is “record the base's choice” —
and nothing says it anywhere.

**Measured (2026-10-20).** A Windows application opens the shipped Windows light
variant, edits one radius step, and stores the diff:

```ts
const base = getPlatformTheme("win32", "light");
const edited = extendTheme(base, { radius: { md: 8 } });
themeOverrides(base, edited); // { radius: { md: 8 } } — one step, as promised
```

Replaying that artifact the way the documents permit (“a base of the theme's
mode”) yields a **different theme, silently**:

| member | edited (`Light · Windows` + step) | replayed on `getTheme("light")` |
| ------ | --------------------------------- | ------------------------------- |
| `radius.sm` | `2` | `4` |
| `radius.md` | `8` | `8` |
| `radius.xl` | `8` | `12` |
| `colors.border` | `#D6D6D6` | `#D6DAE1` |
| `name` | `Light · Windows` | `Light` |

`themeFailures` returns `[]` for **both** themes, and nothing else throws: the
failure is a silent look regression in a settings screen or a re-opened editor,
invisible to every gate. The Windows `radius`, `border` colour, type families,
spacing and every other style group the platform carries are all lost by the
same replay for the same reason.

The second half is the shape of the artifact. A consumer that stores “the
overrides” has no owner for the pair `{ base, overrides }`, so the settings app,
the docs site and any example each invent it — and one of them will write the
bug above.

## 2. Decision

1. **The rule is the base, not its mode.** The four documents state that
   `themeOverrides` is relative to the exact base, and that a stored edit records
   the base it was made against.
2. **The package owns the stored artifact**, as two small, total functions over
   the types that already exist:
   - `ThemeEdit` — `{ base: ThemeChoice; overrides: ThemeOverrides }`;
   - `themeEdit(choice, edited)` — resolve the choice, diff against *that* base,
     so a stored edit cannot name a base it was not made against. Returns
     `undefined` only when the modes differ (the one case `extendTheme` cannot
     express), which is the same boundary `themeOverrides` already documents.
   - `applyThemeEdit(edit)` — `extendTheme(resolveThemeChoice(edit.base),
     edit.overrides)`, the replay.
   The choice is resolved **inside** `themeEdit`, so a caller cannot pass a
   choice that disagrees with the base — the input that produced the defect above
   is not representable.
3. **Every shipped base is nameable.** `resolveThemeChoice({ mode, contrast,
   platform })` must equal `getPlatformTheme(platform, mode, contrast)`, and the
   recipe form must equal `getPlatformRecipeTheme(recipe, mode, contrast)`. This
   is the property that makes the pattern sound; it is asserted for the whole
   product (4 platforms × 2 modes × 2 contrasts, plus 2 recipes × 2 × 2) rather
   than assumed.
4. **A base a choice cannot name is out of scope, and said so.** An edit of a
   brand theme built by `extendTheme` is stored as the whole theme; `ThemeEdit`
   names shipped bases only. The docs say this in one sentence.
5. No token value, colour, pair, floor, metric, platform style or shipped theme
   moves. No existing signature changes.

## 3. Exact files and changes

### 3.1 `packages/tokens/src/theme-diff.ts`

- Import `resolveThemeChoice` and `ThemeChoice` from `./theme-choice.js`.
- After `themeOverrides`, add:

```ts
/**
 * A stored edit: the shipped base it was made against, named as the choice a
 * settings row or a URL already persists, and the minimal overrides that
 * rebuild it.
 *
 * `ThemeOverrides` alone is base-relative — replaying an edit of the Windows
 * variant on the identity of the same mode silently paints the identity's
 * radii, border and type — so the pair is the unit a consumer stores.
 */
export interface ThemeEdit {
  /** The choice {@link applyThemeEdit} resolves to the base. */
  readonly base: ThemeChoice;
  /** The overrides {@link themeOverrides} derived against that base. */
  readonly overrides: ThemeOverrides;
}

/**
 * Store an edit of a shipped base. The base is resolved from `choice` here, so
 * the artifact can never name a base the diff was not measured against.
 *
 * Returns `undefined` when the modes differ, the one case `extendTheme` cannot
 * express; every other choice reproduces its theme through
 * {@link applyThemeEdit}. An edit of a theme a choice cannot name — a brand
 * theme, or one built by `extendTheme` — is stored as the whole theme instead.
 */
export function themeEdit(
  choice: ThemeChoice,
  edited: Theme,
): ThemeEdit | undefined {
  const base = resolveThemeChoice(choice);
  const overrides = themeOverrides(base, edited);
  return overrides === undefined ? undefined : { base: choice, overrides };
}

/**
 * Rebuild a stored edit: resolve the choice it records, then apply its
 * overrides. `applyThemeEdit(themeEdit(choice, edited))` reproduces `edited`
 * for every same-mode `choice` and shipped base.
 */
export function applyThemeEdit(edit: ThemeEdit): Theme {
  return extendTheme(resolveThemeChoice(edit.base), edit.overrides);
}
```

- Correct the `themeOverrides` JSDoc sentence to:

> A different `mode` returns `undefined`: `extendTheme` cannot change the mode,
> so the caller must choose a base of the theme's mode. The overrides are
> relative to that **exact** base, not merely its mode — a Windows edit replayed
> on the identity of the same mode loses the platform's radii, border and type —
> so a stored edit is a {@link ThemeEdit}, which records the choice and resolves
> it back with {@link applyThemeEdit}.

No other JSDoc in the file changes.

### 3.2 `docs/tokens.md`

**(a) § Deriving a theme back to overrides** — replace the closing sentences
(“A different `mode` returns `undefined` … choose a base of the theme's mode.”)
with the full rule and the stored-edit pattern:

```ts
import {
  applyThemeEdit,
  extendTheme,
  themeEdit,
  themeOverrides,
  type ThemeEdit,
} from "@gpuixui/tokens";

const choice = { mode: "light", platform: "win32" } as const;
const base = resolveThemeChoice(choice); // the Windows variant
const edited = extendTheme(base, { radius: { md: 8 } });

const overrides = themeOverrides(base, edited); // { radius: { md: 8 } }
const stored: ThemeEdit | undefined =
  overrides === undefined ? undefined : { base: choice, overrides };

// Later, in another run: the recorded choice rebuilds the base, then the edit.
const theme = stored === undefined ? undefined : applyThemeEdit(stored);
```

with the prose: the diff is relative to the exact base; `themeEdit(choice,
edited)` derives the pair without the chance of naming a different base;
`applyThemeEdit` is the replay; the measured Windows example (identity `sm` 4 /
`xl` 12 against Windows 2 / 8, `border` `#D6DAE1` against `#D6D6D6`) is what a
replay on the wrong base costs, and `themeFailures` reports neither. A base a
`ThemeChoice` cannot name is stored whole.

**(b) § Types** — add one row, alphabetically between `ThemeColors` and
`ThemeConfig`:

| `ThemeEdit` | A stored edit: the base's `ThemeChoice` and its minimal overrides. |

**(c) § Theme API** — the paragraph listing the extension calls gains
`themeEdit(choice, edited)` and `applyThemeEdit(edit)` in one sentence pointing
at § Deriving.

### 3.3 `packages/tokens/src/theme-diff.example.ts`

Add the executed stored-edit pattern beside the existing identity example:

```ts
/** The shipped base a stored edit names: the Windows variant, in documentation order. */
export const exportedBaseChoice = {
  mode: "light",
  platform: "win32",
} as const satisfies ThemeChoice;

/** The stored pair, derived the way the catalogue teaches. */
export const exportedPlatformEdit = themeEdit(exportedBaseChoice, exportedPlatformTheme);

/** The replay the pair exists for. */
export const exportedReplay = ...
```

`exportedPlatformTheme` is `extendTheme(getPlatformTheme("win32", "light"),
{ radius: { md: 8 } })`. `themeEdit` returns the union, so the module exports it
un-narrowed (the same convention `exportedOverrides` already uses) and the test
narrows with its `overridesOf`-style helper. `exportedReplay` must therefore be
built in the test, not the module — the module exports the choice and the pair,
the test exports nothing. Adjust the header comment to name both halves.

### 3.4 `packages/tokens/src/theme-edit.test.ts` (new)

Header comment states the defect (the silent Windows-edit replay of §1) and the
guard. Cases:

1. **“reproduces an edit through the choice it records, for every shipped
   base.”** For each `platformNames` × `themeModes` × `themeContrasts`, and each
   `platformRecipeNames` × `themeModes` × `themeContrasts`: resolve the base,
   edit a radius step, `themeEdit(choice, edited)`, and
   `expect(applyThemeEdit(stored)).toEqual(edited)`. Also assert the choice
   resolves the base itself (`resolveThemeChoice(choice)` equals
   `getPlatformTheme` / `getPlatformRecipeTheme`) — decision 3.
2. **“the diff alone loses the base, and the pair keeps it.”** The measured
   case: Window light base, `{ radius: { md: 8 } }` as the diff; assert the
   replayed-on-identity theme differs at `radius.sm`, `radius.xl` and
   `colors.border`, that `themeFailures` reports neither theme (the hazard is
   silent), and that `applyThemeEdit` reproduces the edit exactly. This case
   fails if the pair stops carrying the base and passes on the current code only
   for the correctness half — the failing direction is the `not.toEqual` pair.
3. **“returns undefined across modes.”** `themeEdit({ mode: "light" },
   getTheme("dark"))` is `undefined`.
4. **“a recorded choice survives the URL codec.”** `themeChoiceParams` →
   `themeChoiceFromParams` → `applyThemeEdit` reproduces the edit, so a stored
   artifact is shareable in the page state the docs-site toggle already uses.
5. **“the example is the documented pattern.”** Import
   `exportedBaseChoice`/`exportedPlatformEdit` from the example, narrow, and
   assert the replay equals the edited theme — the `examples.test.ts` rule that
   every example runs.

Every case can fail: (1) breaks if `themeEdit` diffs against the wrong base or
`resolveThemeChoice` stops reproducing a base; (2) breaks if the diff starts
carrying the base (its `not.toEqual` half) or if the pair stops reproducing
(its `toEqual` half); (3) breaks if the cross-mode guard is dropped; (4) breaks
if the codec drops an axis; (5) breaks if the example drifts.

### 3.5 `packages/tokens/README.md`

- Correct the `themeOverrides` sentence: `undefined` still means the modes
  differ, and the overrides are relative to the exact base, so a stored edit is
  the `ThemeEdit` pair; name `themeEdit` and `applyThemeEdit` and keep the
  existing example link.
- `src/theme-diff.example.ts` remains the linked example.

### 3.6 `docs/design-system.md` § 11

Replace the bullet's closing clause with the base rule, naming `themeEdit` /
`applyThemeEdit` and the `ThemeEdit` shape in one sentence. No other section
changes.

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens check-types     # Done, no diagnostics
nub run --filter @gpuixui/tokens test            # 198+ files, all green
nub run check                                    # check:tests, lint, fmt, check-types all green
```

Then the defect proof in both directions (the first two commands use the
worktree's own built sources through `nub`):

```sh
nub /tmp/hazard.mts   # the measured table in §1; must print naive == edited: false,
                      # correct == edited: true
nub /tmp/choice.mts   # mismatches: 0 for the 24 base/choice pairs
```

**Expected.** `theme-diff.test.ts`, `docs.test.ts`, `snippets.test.ts`,
`public-types.test.ts` and `docs-links.test.ts` stay green without edits beyond
the documented additions; the two new value exports and one new type are named
in `docs/tokens.md` (the namespace and type walks fail otherwise).

## 5. STOP conditions

Stop and report if:

- `resolveThemeChoice(choice)` does **not** equal the matching
  `getPlatformTheme`/`getPlatformRecipeTheme` for any of the 24 pairs — the
  pattern is then unsound and the plan must be re-decided, not patched.
- `themeFailures` reports a failure for the replayed-on-identity theme (the
  hazard would be visible, and §1's statement “both are silent” must be
  corrected before writing the case).
- A guard test rejects the new prose in a way that requires changing an existing
  derived claim (for example a count that now must include two values). Do not
  weaken that guard; report it.
- `themeEdit` would need a deep structural comparison to be sound — it does not,
  because the base is resolved inside it; if an implementation starts comparing
  two themes, stop.

## 6. Acceptance

- The four documents state the base rule; none still says a base “of the same
  mode” is sufficient.
- `ThemeEdit`, `themeEdit` and `applyThemeEdit` are public, documented in the
  reference (type index and value coverage), compiled in an executed example,
  and guarded by `theme-edit.test.ts` in both directions.
- `nub run check` and the tokens suite pass; no token value, pair, floor, metric
  or shipped theme moves.
- `TODO.md` gains the row, ticked, and the workstream bar moves 329/407 →
  330/408; the plan index gains this row.

## Execution (2026-10-20)

- `ThemeEdit`, `themeEdit(choice, edited)` and `applyThemeEdit(edit)` ship in
  `packages/tokens/src/theme-diff.ts`; `themeEdit` resolves the choice before it
  diffs, so a mismatched base is not representable.
- The four documents state the base rule: the `themeOverrides` JSDoc,
  `docs/tokens.md` § Deriving (with the measured Windows table and the stored
  snippet), `packages/tokens/README.md` and `docs/design-system.md` § 11. The
  type index gains `ThemeEdit`, and `COMPONENTS.md`'s extension row names the
  pair.
- `theme-edit.test.ts` walks all 24 platform/recipe choices across both modes and
  both contrast levels (`resolveThemeChoice` equals the resolver for each), pins
  the silent hazard (identity `radius.sm` 4 / `xl` 12 and `border` `#D6DAE1`
  against Windows 2 / 8 and `#D6D6D6`, with `themeFailures` `[]` for both), the
  cross-mode `undefined`, a density-named base, the URL codec round trip, and the
  executed example.
- Both directions, run with `nubx vitest run src/theme-edit.test.ts` after
  temporarily making `themeEdit` diff against `getTheme(edited.mode)` instead of
  the resolved base: **3 failed / 3 passed** (the platform walk, the silent
  hazard and the density case); restoring the fixed source gives **6 passed**.
- Gates: `nub run --filter @gpuixui/tokens test` → 198 files, 6866 tests;
  `nub run check` (check:tests, lint, fmt, check-types) green. No token value,
  pair, floor, metric or shipped theme moves; `contrastPairs` stays 464.

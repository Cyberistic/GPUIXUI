# 744 — The brand edit `ThemeEdit` already carries

**Phase:** F (the extension story keeps its own capabilities) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 685 (`themeOverrides`), 727 (`ThemeEdit`, the base a stored edit
records), 742 (the previous truth pass over a Decision's prose) ·
**Number block:** 743 is the `components` worktree's (`toast-native-focus-hold`),
so this takes **744** ·
**Status:** done

> **Status: executed 2026-10-20.** Execution evidence is at the end of this plan.

## 1. The defect this plan closes

`themeEdit`'s JSDoc and the catalogue both end the storage rule with a capability
the API does not have:

> An edit of a theme a choice cannot name — a brand theme, or any theme built by
> `extendTheme` — is stored as the whole theme instead.
> — `packages/tokens/src/theme-diff.ts`, `themeEdit` JSDoc

> A base a `ThemeChoice` cannot name — a brand theme, or any theme built by
> `extendTheme` — is stored as the whole theme.
> — `docs/tokens.md`, *Deriving a theme back to overrides*

`ThemeEdit` is exactly two fields:

```ts
export interface ThemeEdit {
  readonly base: ThemeChoice;
  readonly overrides: ThemeOverrides;
}
```

There is no whole-theme variant, no second function, and `applyThemeEdit` takes
only the pair. So a consumer who reads the sentence looks for an artifact the
package never returns. The sentence also hides the capability the API *does*
have, which is better news: `themeEdit` measures the overrides against the
**resolved** choice, so a brand theme's differences from that base travel in the
overrides and the pair reproduces the brand exactly.

Probe over the shipped tree (the same calls the new case makes):

```ts
import { applyThemeEdit, extendTheme, getPlatformTheme, getTheme, themeEdit } from "@gpuixui/tokens";

const win = getPlatformTheme("win32", "light");
const brand = extendTheme(win, { name: "Contoso Light", radius: { md: 8 } });
const stored = themeEdit({ mode: "light", platform: "win32" }, brand);
// stored is { base, overrides }, and applyThemeEdit(stored) deep-equals brand
```

The claim is also the only sentence in either document that separates a brand
base from a different **mode**. The JSDoc two paragraphs earlier states the mode
case correctly — `extendTheme` cannot change the mode, so `themeEdit` returns
`undefined` — and that is the *one* thing a caller cannot store. Grouping the
brand base with it tells a reader two cases are unexpressible when only one is.

## 2. Decision (do not re-litigate)

1. **`ThemeEdit` stays `{ base, overrides }`.** Adding a whole-theme variant
   would duplicate `Theme` inside the artifact and force every consumer to branch
   on a union for a case the overrides already express; the pair reproduces any
   same-mode theme, brand or shipped.
2. **The corrected sentences state the mechanism and the one limit:** the
   overrides are measured against the resolved choice, so a brand's differences
   are carried too; a different mode returns `undefined`, and the caller keeps
   the theme object itself.
3. **The claim is held by behaviour, not only prose:** a brand theme built from
   a shipped base is stored and replayed in a case, and a structural case pins
   the artifact's two fields. A future whole-theme branch added to `ThemeEdit`
   without the documents fails both.
4. **No token, pair, colour, floor, metric or role moves.** This plan changes one
   JSDoc block, one catalogue paragraph and the `theme-edit` suite.

## 3. Exact files and changes

### 3.1 `packages/tokens/src/theme-diff.ts` — `themeEdit` JSDoc

Replace (search `is stored as the whole theme instead`):

```
 * An edit of a theme a choice cannot name — a brand theme, or any theme built
 * by `extendTheme` — is stored as the whole theme instead.
```

with:

```
 * An edit of a theme a choice cannot name — a brand theme, or any theme built by
 * `extendTheme` — is measured against the resolved choice, so the brand's own
 * differences travel in the overrides and the pair still reproduces it. The one
 * theme the artifact cannot express is a different `mode`; that case returns
 * `undefined` and the caller keeps its theme object.
```

### 3.2 `docs/tokens.md` — *Deriving a theme back to overrides*

Replace (search `A base a \`ThemeChoice\` cannot name`):

```md
`ThemeEdit` is the artifact that avoids it: the base's `ThemeChoice`, which a
settings row or a URL already persists, plus the overrides. `themeEdit(choice,
edited)` resolves the choice *before* it diffs, so the pair can never name a base
it was not measured against, and `applyThemeEdit(edit)` resolves the recorded
choice and applies the overrides. A base a `ThemeChoice` cannot name — a brand
theme, or any theme built by `extendTheme` — is stored as the whole theme.
```

with the same paragraph ending:

```md
`ThemeEdit` is the artifact that avoids it: the base's `ThemeChoice`, which a
settings row or a URL already persists, plus the overrides. `themeEdit(choice,
edited)` resolves the choice *before* it diffs, so the pair can never name a base
it was not measured against, and `applyThemeEdit(edit)` resolves the recorded
choice and applies the overrides. A base a `ThemeChoice` cannot name — a brand
theme, or any theme built by `extendTheme` — is measured against the resolved
choice, so the brand's own differences travel in the overrides and the pair still
reproduces it. The one theme the pair cannot express is a different `mode`;
`themeEdit` returns `undefined` there and the caller keeps its theme object.
```

### 3.3 `packages/tokens/src/theme-edit.test.ts`

Add the import and three cases (the light brand family comes from the executed
example rather than a second copy, so one file owns it):

```ts
import { brandLightTheme } from "./brand-theme.example.js";
...
describe("a brand edit in the stored pair", () => {
  it("carries the brand's differences against the resolved choice", () => {
    const stored = editOf({ mode: "light" }, brandLightTheme);

    expect(themeFailures(brandLightTheme)).toEqual([]);
    expect(stored.overrides.name).toBe("Acme Light");
    expect(stored.overrides.colors?.primary).toBe("#6A45F0");
    expect(applyThemeEdit(stored)).toEqual(brandLightTheme);
  });

  it("has no whole-theme storage path", () => {
    const stored = editOf(
      { mode: "light" },
      extendTheme(getTheme("light"), { radius: { md: 8 } }),
    );
    const keys = Object.keys(stored);

    expect(keys).toHaveLength(2);
    expect(keys).toContain("base");
    expect(keys).toContain("overrides");
    // The one theme the pair cannot express, and the only `undefined`.
    expect(themeEdit({ mode: "light" }, getTheme("dark"))).toBeUndefined();
  });

  it("states the rule the artifact has, not a whole-theme one", () => {
    const source = readFileSync(
      new URL("./theme-diff.ts", import.meta.url),
      "utf8",
    );
    const declaration = source.indexOf("export function themeEdit");
    const block = source.slice(
      source.lastIndexOf("/**", declaration),
      source.indexOf("*/", declaration),
    );
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    [block, catalogue].forEach((prose) => {
      expect(prose).not.toContain("stored as the whole theme");
      expect(prose).toContain("resolved choice");
    });
    expect(catalogue).toContain("the caller keeps its theme object");
  });
});
```

Add `readFileSync` from `node:fs` to the imports (deliberate here, as in the
other tree-local documentation guards). `themeFailures(brandLightTheme)` is `[]`
only after plan 745 moves the light brand's link ink, so **745 lands first**; if
it has not, the brand case's total-check line fails and that plan is the fix —
do not weaken it.

### 3.4 `COMPONENTS.md` — Theme extension row

Append before the closing `|`:

```md
Plan `744` corrects the storage rule the JSDoc and the catalogue stated: `ThemeEdit` is `{ base, overrides }` and has no whole-theme variant, so an edit of a brand base is measured against the resolved choice and its differences travel in the overrides (`theme-edit.test.ts` replays a brand theme through the pair and pins the two fields). The one theme the pair cannot express is a different `mode`, which returns `undefined`.
```

### 3.5 `TODO.md`

Add one completed row at the end of *Design tokens and theming* and move the
counter `334/412` → `335/413` (plan 745 follows and takes it to `336/414`).

### 3.6 `.agents/slop/plans/README.md`

Add the table row after `742`, marked `done`, and a summary paragraph.

## 4. Commands

Run from the worktree root.

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| The suite | `nub exec vitest run src/theme-edit.test.ts` (from `packages/tokens`) | pass, 8 cases |
| Prove the prose case can fail | restore `stored as the whole theme` in the JSDoc | the new prose case fails |
| Prove the brand case can fail | change `themeEdit`'s diff to `themeOverrides(edited, edited)` locally, rerun | the brand and structural cases fail; restore |
| Package suite | `nub run --filter @gpuixui/tokens test` | every file green |
| Whole gate | `nub run check` | `check:tests`, lint, format and types pass |
| Repo test gate | `nub run test` | every workspace's suite passes |

## 5. Test plan

- **Can the guard fail?** The prose case fails on the shipped sentence (verified
  before the edit); the brand case fails if the diff stops being measured
  against the resolved choice; the structural case fails if `ThemeEdit` grows a
  third field.
- **No token moves:** the palette, pairs, floors and metrics are untouched, so
  the contrast, selection, metric and docs suites cannot move.

## 6. Acceptance

- [ ] Neither `theme-diff.ts` nor `docs/tokens.md` claims a whole-theme storage;
      both state the resolved-choice measurement and the mode limit.
- [ ] `theme-edit.test.ts` replays a brand theme through the pair and pins the
      artifact's two fields; the prose case fails on the old sentence.
- [ ] `COMPONENTS.md`, `TODO.md` and the plan index record the plan.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.

## 7. STOP conditions

- **A case wants `ThemeEdit` to gain a whole-theme variant** → stop: the
  overrides already express a brand base, and a union would duplicate `Theme`
  for no capability.
- **The brand example in `§3.3` fails `themeFailures`** → stop and report the
  failures; the family moved there must clear the contract or the example must
  take the documented brand family from `brand-theme.example.ts` unchanged.
- **Any pair, colour, floor or metric wants to move** → stop: this plan changes
  prose and two cases.
- **A gate fails in a file this workstream does not own** → report it.

## 8. Execution (2026-10-20)

- `themeEdit`'s JSDoc and the catalogue now state the resolved-choice mechanism
  and the mode limit; neither says "stored as the whole theme".
- `theme-edit.test.ts` gains three cases: the executed light brand replays
  through the pair (`applyThemeEdit(stored)` deep-equals `brandLightTheme`), the
  artifact's two fields are pinned (a third field fails), and the prose case
  fails on the old sentence — verified by restoring it (1 failed / 8 passed),
  then removed again.
- The light brand family is imported from `brand-theme.example.ts` rather than
  duplicated, so plan 745's moved ink has one owner.
- No token, pair, colour, floor or metric moves. Package suite 202 files /
  6966 tests green (this plan and 745 together add five cases); `nub run check`
  passes.

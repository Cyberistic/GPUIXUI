# 745 — The documented light brand fails the one-call guarantee

**Phase:** F (the extension story's example passes the contract it teaches) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 082/098/553 (the brand family and the documented examples), 569
(`nativeTextTheme`), 574/583 (the native document's ink wash), 611–617 (the
total check), 742/744 (the extension story's truth passes) ·
**Number block:** 743 is the `components` worktree's and 744 is this
workstream's, so this takes **745** ·
**Status:** done

> **Status: executed 2026-10-20.** Execution evidence is at the end of this plan.

## 1. The defect this plan closes

`brand-theme.example.ts` exports two brands. The dark one is held to the total
check by the catalogue itself (`expect(themeFailures(brandTheme)).toEqual([])`),
and it passes. The **light** one passes `themeContrastFailures` — which is what
`theme.test.ts` asserts — and fails `themeFailures` with three `nativeText`
entries:

```
Acme Light failures 3
   nativeText primaryText background 6.880   (the runtime's 3.5% ink wash)
   nativeText primaryText background 6.834   (a code-block body wash)
   nativeText primaryText background 6.941   (the plain-tone pair the check
                                              measures before the washes)
```

`primaryText: "#5330C8"` measures 7.516:1 on a plain canvas and **6.941:1**
through the 3.5% ink a native `<markdown>`/`<code>`/`<diff>` paints under its
body, under the 7:1 body floor. The ink-washed code surface is a layer the
native-text check added after plan 098 wrote the light family; plan 574 already
moved eight light platform inks for exactly this wash, and this example was never
re-checked.

So the executed example a consumer copies ships a brand the package's own one-call
guarantee rejects, while the catalogue teaches `themeFailures(brandTheme)` as the
assertion to run. That is the plan-098 defect one check later: the contrast half
passes, the total does not.

## 2. Decision (do not re-litigate)

1. **The light brand's link ink takes one designed step** inside its own violet
   family: `primaryText` `#5330C8` → **`#4B2AB4`**, which measures **7.957:1**
   through the ink wash (8.616:1 on the plain canvas) and leaves every other
   pair above its floor. Only the example moves; no shipped theme, pair, floor or
   metric changes.
2. **Both brands are held to `themeFailures`**, not only to
   `themeContrastFailures`, so the next check that lands cannot leave the
   documented example behind again.
3. **The regression case states the pre-fix failure**: rebuilding the light family
   with `#5330C8` must return three `nativeText` entries, and the shipped family
   must return none — the same both-directions shape plans 098 and 553 use.
4. **The plan-744 storage case stops duplicating the family** and imports
   `brandLightTheme`, so one example owns the light brand's values.

## 3. Exact files and changes

### 3.1 `packages/tokens/src/brand-theme.example.ts`

In `brandLightTheme.colors`, replace:

```ts
    primaryText: "#5330C8",
```

with:

```ts
    primaryText: "#4B2AB4",
```

and extend the file's JSDoc (search `The lighter fill needs no custom scrim`) with
one sentence:

```
 * The light brand's link ink takes one step inside its own violet family —
 * `#5330C8` → `#4B2AB4` — because a native document paints body text on a 3.5%
 * ink wash, where the old value measured 6.941:1, under the body floor the
 * total check enforces (plan 745).
```

### 3.2 `packages/tokens/src/theme.test.ts`

Replace the light brand's contrast-only assertion (search
`themeContrastFailures(brandLightTheme)`) with the total check, and keep the
contrast one beside it:

```ts
    expect(themeContrastFailures(brandLightTheme)).toEqual([]);
    expect(themeFailures(brandLightTheme)).toEqual([]);
```

Add the regression case in the same describe block:

```ts
  it("clears the native document's ink wash on the light brand's link", () => {
    const regressed = createTheme({
      mode: "light",
      name: "Acme Light",
      colors: {
        primary: "#6A45F0",
        primaryForeground: "#FFFFFF",
        primaryHover: "#5A38D8",
        primaryActive: "#4929B8",
        primaryText: "#5330C8",
        ring: "#7C5CFF",
      },
    });

    // The defect: the contrast half passes while the total check reports the
    // ink-washed link.
    expect(themeContrastFailures(regressed)).toEqual([]);
    expect(
      themeFailures(regressed)
        .filter(({ kind }) => kind === "nativeText")
        .map(({ role, surface }) => `${role} on ${surface}`),
    ).toEqual([
      "primaryText on background",
      "primaryText on background",
      "primaryText on background",
    ]);
    expect(themeFailures(brandLightTheme)).toEqual([]);
  });
```

`createTheme` and `themeFailures` are already imported in that suite; add
`themeContrastFailures` if it is not.

### 3.3 `packages/tokens/src/theme-edit.test.ts` (plan 744's case)

Replace the duplicated light family with the example:

```ts
import { brandLightTheme } from "./brand-theme.example.js";
...
  it("carries a brand's differences against the resolved choice", () => {
    const stored = editOf({ mode: "light" }, brandLightTheme);

    expect(themeFailures(brandLightTheme)).toEqual([]);
    expect(stored.overrides.name).toBe("Acme Light");
    expect(stored.overrides.colors?.primary).toBe("#6A45F0");
    expect(applyThemeEdit(stored)).toEqual(brandLightTheme);
  });
```

The radius assertion goes — the light brand does not move one; the colour and
name assertions carry the same proof.

### 3.4 `COMPONENTS.md` — Theme extension row

Append before the closing `|`:

```md
Plan `745` holds the documented light brand to the total check it is copied under: `brandLightTheme.primaryText` measured 6.941:1 through the 3.5% ink a native document paints under its body, so the contrast half passed while `themeFailures` returned three `nativeText` entries. The link ink takes one designed step (`#5330C8` → `#4B2AB4`, 7.957:1 through the wash) and both brands are held to `themeFailures`.
```

### 3.5 `TODO.md`

Add one completed row at the end of *Design tokens and theming* and move the
counter `335/413` → `336/414`.

### 3.6 `.agents/slop/plans/README.md`

Table row after `744`, marked `done`, plus a summary paragraph.

## 4. Commands

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| Brand cases | `nub exec vitest run src/theme.test.ts src/snippets.test.ts` (from `packages/tokens`) | pass |
| Prove the case fails without the fix | restore `primaryText: "#5330C8"` and rerun | the regression case and the total-check assertion fail |
| Package suite | `nub run --filter @gpuixui/tokens test` | every file green |
| Whole gate | `nub run check` | `check:tests`, lint, format and types pass |
| Repo test gate | `nub run test` | every workspace's suite passes |

## 5. Test plan

- **Can the regression case fail?** Yes: it rebuilds the pre-fix palette, so the
  `nativeText` list is non-empty today and the shipped family's total check is
  empty only after the move.
- **No shipped theme moves:** the change is in an `.example.ts`; the palette,
  pair lists, floors and metrics are untouched.
- **The documented maps:** `snippets.test.ts` builds every documented colour map
  and holds it to `themeFailures`; it is the second reader of this family.

## 6. Acceptance

- [ ] `themeFailures(brandLightTheme)` is `[]` and the pre-fix palette returns
      three `nativeText` entries naming `primaryText` on `background`.
- [ ] `theme.test.ts` holds both brands to the total check.
- [ ] `COMPONENTS.md`, `TODO.md` and the plan index record the plan.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.

## 7. STOP conditions

- **A shipped theme or a pair list wants to move** → stop: only the example's
  `primaryText` moves.
- **The darker ink drops another pair below its floor** → stop and report the
  pair; the step was chosen from a probe that returned `[]`, so a new failure
  means a different check is reading the brand.
- **`snippets.test.ts` builds a documented map with the old value** → move the
  documented map with the example; do not keep two families.
- **A gate fails in a file this workstream does not own** → report it.

## 8. Execution (2026-10-20)

- The pre-fix palette returned three `nativeText` failures — `primaryText` on
  `background` at 6.880, 6.834 and 6.941:1 — while `themeContrastFailures` was
  `[]`; the shipped `brandLightTheme` now returns `[]` from `themeFailures`.
- `primaryText` `#5330C8` → **`#4B2AB4`**: 8.616:1 on the plain canvas and
  **7.957:1** through the runtime's 3.5% ink wash. No other role moves.
- `theme.test.ts` holds both brands to `themeFailures` and keeps the pre-fix
  palette as its can-fail fixture; `theme-edit.test.ts` (plan 744) imports the
  same example, so one file owns the light family.
- Package suite 202 files / 6966 tests green; `nub run check` passes.

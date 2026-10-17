# Plan 320 — Default body text on the soft status fills

**Workstream:** `tokens-theme`
**Phase:** F (contract completeness)
**Depends on:** 071 (public contrast contract), 074 (state and overlay surfaces), 088
(body text on the quiet panel and popover), 300, 306–319 (the surface-audit series)
**Status:** ready

## 1. Why

`contrastPairs` measures `foreground` — the default body text role — on the canvas,
card, quiet panel, popover, and the pointer washes (`background`, `card`, `muted`,
`popover`, `hover`, `active`), plus the `accent`/`selected` fills a row paints.
It does **not** measure it on the four soft status fills (`infoSoft`,
`successSoft`, `warningSoft`, `destructiveSoft`).

A shipped composition paints exactly that pair:

- `packages/components/src/alert.tsx:181` — `AlertDescription` sets
  `color: theme.colors.foreground` on a container inside the Alert root.
- The Alert root (`alert.tsx:75`) paints `toneSurface(theme, value)`, i.e.
  `backgroundColor: xSoft`.
- `AlertDismiss` renders the package's `IconButton`; its `ghost` variant paints
  `color: theme.colors.foreground` (`packages/components/src/internal/button.tsx:84`),
  and it sits on the same soft root.

So an Alert's description and dismiss glyph are `foreground` painted on `xSoft`,
and no pair exists. An edited theme or a copied platform style could retint one
soft fill until the description disappears while `themeContrastFailures` returns
`[]` — the exact class of gap plans 312–319 closed for other painted surfaces.
The role-level completeness guard cannot see it: `foreground` is measured
somewhere.

The evidence was checked against the sibling worktree at
`~/GPUIXUI/workspaces/components` (read-only), against the components package as
it exists on 2026-10-18. The tokens package must not import components; the pair
is data, not a dependency.

## 2. What changes

### 2.1 `packages/tokens/src/contrast.ts`

Add a `softBodyPairs` list beside the existing soft-surface lists:

```ts
/**
 * The four soft status fills a default body-text role is painted on. An Alert's
 * description and its ghost dismiss control paint `foreground` inside the
 * tone-tinted root (`components/alert.tsx`), so the body floor applies to each
 * fill the same way it does on the quiet panel.
 */
const softBodyPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["foreground", background, "body"],
);
```

Include `...softBodyPairs` in `contrastPairs` after `...bodyTextPairs` (order
inside the exported list does not matter to the checker, but keep the file's
reading order: body text first, then the soft fills it also paints).

Update the `contrastPairs` JSDoc sentence that enumerates the body-text surfaces
so it names the four soft status fills as well.

Do **not** change any colour value. A probe over the shipped identity themes
(light, dark, both AAA variants) and every platform variant and recipe found the
tightest `foreground`-on-`xSoft` pair at 10.46:1, far above the 7:1 body floor.

### 2.2 `packages/tokens/src/soft-body-text.test.ts` (new)

Header comment states the bug guarded: an Alert's description and dismiss
control paint `foreground` on the soft status fill, but the contract measured
`foreground` only on the plain surfaces and row washes, so an edited theme could
erase the description while the checker returned `[]`.

Tests:

1. **The contract carries the four pairs.** Filter `contrastPairs` for
   `foreground === "foreground" && pairClass === "body"` and assert the four
   soft fills are present:
   `["infoSoft", "successSoft", "warningSoft", "destructiveSoft"]`.
2. **Every shipped set clears the floor.** Iterate:
   - `themeModes` × `themeContrasts` through `getTheme`;
   - `platformNames` × `themeModes` through `getPlatformTheme`;
   - `platformRecipeNames` × `themeModes` through `getPlatformRecipeTheme`.
   For each theme and each soft surface assert
   `contrastRatio(theme.colors.foreground, theme.colors[surface]) >= contrastFloors[theme.contrast].body`
   with a message naming the theme and surface.
3. **The checker reports the regression.** Build
   `extendTheme(getTheme("light"), { colors: { infoSoft: "#191D25" } })` (the
   light `foreground` used as the fill) and assert `themeContrastFailures`
   returns one pair with `foreground: "foreground"`, `background: "infoSoft"`,
   `pairClass: "body"`, `floor: 7` and a ratio near 1. Do the same for
   `destructiveSoft` with `#191D25`, or loop the four fills with the same
   regression fill. A single loop is preferred.
4. **Removing one pair fails.** A dedicated assertion that
   `softBodyPairs.length` is 4 and that every soft role appears once guards
   against a partial list; the public-checker regression already proves the list
   is consulted.

The test must fail before the change (the pair assertion sees 8 body surfaces,
not 12; the regression checker returns no failure) and pass after it.

### 2.3 `packages/tokens/src/contrast.test.ts`

The pair-count assertion at line 348 changes from `257` to `261`
(`257 + 4`). Do not change any other count in that file.

### 2.4 `packages/tokens/src/body-text-surfaces.test.ts`

This file derives `bodyTextPairs` from `contrastPairs` and asserts the exact
surface list. Extend the expected list from the current eight surfaces to:

```ts
[
  "background",
  "card",
  "muted",
  "popover",
  "hover",
  "active",
  "accent",
  "selected",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
]
```

Update its header comment to say plan 320 adds the soft status fills an Alert
paints. Leave the existing regression tests unchanged.

### 2.5 `packages/tokens/src/docs.test.ts`

- In the `docs/design-system.md` floors table guard, extend the body-text row
  string (line ~837) so it reads:
  `... and the four soft status fills an Alert's description paints`.
  The row is a literal; update both the document and the test in the same
  commit.
- The test `names every surface default body text is measured on` derives the
  surfaces from `contrastPairs`; extend its expected array with the four soft
  fills in the same order as the catalogue (`infoSoft`, `successSoft`,
  `warningSoft`, `destructiveSoft`).
- No other docs guard needs a change; the count is not asserted in
  `docs.test.ts`.

### 2.6 `docs/tokens.md`

- In `## Verification`, the paragraph starting “Default body text is measured
  on …” is the executable claim. Add the soft status fills and the reason:
  an Alert's description and its ghost dismiss control paint `foreground` on the
  tone-tinted root, so the body floor covers all four fills.
- In the paragraph that enumerates the contract's growth, append:
  “Plan `320` adds default body text on the four soft status fills, taking it
  from 257 to **261**.”
- Keep the existing wording about typed text and placeholders intact — this
  plan does not change either.

### 2.7 `docs/design-system.md`

In §9, the “body text on …” table row gains the four soft status fills and the
Alert composition. This is the row the `docs.test.ts` guard above holds.

### 2.8 `packages/tokens/README.md`

In `## Checking a theme`, the sentence that enumerates default body text
surfaces gains the four soft status fills and an Alert's description as the
shipped composition. Do not quote a pair count (the README does not today).

### 2.9 `COMPONENTS.md`

Only the design-system rows owned by this workstream:

- `Theme contrast check`: change “the same 257 contrast pairs” to “the same 261
  contrast pairs”, and append one sentence naming plan 320 and the Alert body
  text. Keep the rest of the row unchanged.
- `Design tokens`: append a short clause to the existing list of guarded
  compositions: default body text on the four soft status fills an Alert paints.
  Do not repeat the role count or add a number that is not guarded.

### 2.10 `TODO.md` and the plan index

- Add a task under “Design tokens and theming”:
  “Hold default body text on the four soft status fills an Alert's description
  and dismiss control paint — `foreground` was measured on the plain surfaces
  and row washes only, so an edited theme could erase an Alert body while the
  checker returned `[]`; every shipped set passes, so no colour moves and the
  contract grows 257 → 261 (plan 320).”
- Tick it in the same commit.
- Update the progress line from `87/113` to `88/114` (one task added, one
  completed).
- Add plan 320 to `.agents/slop/plans/README.md` after 319, status `done`, and
  append a paragraph to the block's running commentary.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Before the change, to prove the new test guards something:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: all existing tests pass (49 files, 3149 tests on the current
   branch). This is the baseline; do not proceed if it is red.

2. Add the new test file **before** the implementation and run only it:
   ```sh
   nub run --filter @gpuixui/tokens test -- soft-body-text
   ```
   Expected: FAIL, because `contrastPairs` has no `foreground` on a soft fill
   and the regression checker returns no failure. Record the failure output in
   the commit message or the plan index note. If the filter runs the whole
   suite in this repo's vitest configuration, use:
   ```sh
   cd packages/tokens && nub exec vitest run src/soft-body-text.test.ts
   ```
   Expected: FAIL with the pair-count assertion.

3. Implement `contrast.ts` and the doc/test updates, then:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 50 files, 3153+ tests. The exact total is not a gate; the
   absence of failures is.

4. Run the package type check:
   ```sh
   nub run --filter @gpuixui/tokens check-types
   ```
   Expected: `Done` with no diagnostics.

5. Run the repository gates:
   ```sh
   nub run check
   nub run lint
   nub run fmt
   ```
   Expected: `check:tests` prints “every test asserts something”, lint is silent,
   formatting reports every file correct.

6. Read both documents' changed passages and confirm they say “257 → 261” and
   name the Alert composition. The docs guard must pass in step 3.

## 4. STOP conditions

Stop and report instead of improvising if:

- any shipped identity, platform or recipe theme fails the new 7:1 pair — the
  plan asserts no colour moves; a failure means the audit was wrong and needs a
  colour decision, not a lowered floor;
- the existing `contrastPairs.length` is not 257 before the change (another
  branch landed a pair since this plan was written);
- the `components` Alert no longer paints `foreground` on its soft root when
  re-checked — record the evidence and close the task as “not applicable”
  rather than adding a pair no component paints;
- `nub run --filter @gpuixui/tokens test` is red before the change for reasons
  unrelated to this plan.

## 5. Acceptance

- `contrastPairs` contains four `foreground`/`xSoft` body pairs.
- `themeContrastFailures` reports the regression when a soft fill is set to the
  light foreground; every shipped set returns `[]` unchanged.
- The new test file fails without the pair and passes with it.
- `docs/tokens.md`, `docs/design-system.md` and the package README name the new
  surface in the same commit as the implementation.
- `COMPONENTS.md`, `TODO.md` and the plan index are current.
- `nub run check`, `nub run lint`, `nub run test` pass, or any pre-existing
  failure outside this workstream is recorded with its exact command and output.

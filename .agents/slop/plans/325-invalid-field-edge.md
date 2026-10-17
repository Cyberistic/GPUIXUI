# Plan 325 — The invalid field edge the contract never measures

**Workstream:** `tokens-theme`
**Phase:** F (contrast contract completeness)
**Depends on:** 057 (`xText`), 071 (the contract), 074/084/092 (essential
boundaries), 306 (inactive labels), 312 (the field edge on `input`)
**Status:** ready

## 1. Why

An invalid field signals its error with a `destructive` border. Two shipped
compositions do it:

- `packages/components/src/field.tsx` — `FieldInput` paints
  `backgroundColor: theme.colors.input` and, when `isInvalid`, sets
  `borderColor: theme.colors.destructive`;
- `packages/components/src/color-picker.tsx` — the hex `<input>` paints
  `backgroundColor: theme.colors.background` and sets
  `borderColor: valid ? border : destructive`.

The contract measures `border` and `borderStrong` on the surfaces those fields
paint (`fieldEdgePairs`, `borderStrong` on `input`/`background`/`card`/`popover`),
and it measures `destructive` as a **fill** (`destructiveForeground` on it, its
hover/pressed steps, and the fill against the surface behind). It never measures
`destructive` painted **as an edge**. So an edited theme whose `destructive`
approaches `input` — a pale pink error border on a white field — erases the only
error signal of an invalid control while `themeContrastFailures` returns `[]`.

This is the same class as plan 084 (`borderStrong` on the washes a checkbox sits
in) and plan 312 (the field edge on `input`): a functional boundary measured
everywhere except the state that needs it. The design system already names the
error state as a first-class interaction state; the floor table does not.

A probe across every shipped set (identity default and AAA, the three platform
variants and the two recipes, both modes) finds every ratio clearing the
`boundary` floor; the tightest is Aero light's `destructive` on `background` at
**4.180:1** (3:1 default floor) and the AAA pairs are above 10:1. So this plan
moves **no colour**; it makes an existing guarantee explicit and guarded.

## 2. What changes

### 2.1 `packages/tokens/src/contrast.ts`

After `fieldEdgePairs`, add:

```ts
/**
 * The invalid field edge. A field in an error state paints `destructive` as its
 * border — `FieldInput` on its `input` fill and the ColorPicker hex field on the
 * `background` canvas — so the error signal is an essential boundary, not a
 * fill. `destructive` is measured as a fill elsewhere; this is the pair that
 * keeps the error itself visible.
 */
const invalidEdgePairs: readonly ContrastPair[] = [
  ["destructive", "input", "boundary"],
  ["destructive", "background", "boundary"],
];
```

Spread `...invalidEdgePairs` into `contrastPairs` immediately after
`...fieldEdgePairs`, and extend the long list comment with one sentence naming
the invalid edge.

### 2.2 `packages/tokens/src/contrast.test.ts`

The total-pair assertion changes `262` → `264`. Nothing else in the file changes:
the generic loops read the list.

### 2.3 `packages/tokens/src/docs.test.ts`

- The “names every interactive fill and the surfaces it is held against” case
  filters `contrastPairs` by foreground alone, so a `destructive` **boundary**
  pair would be swept into the fill list and fail the `stateFillSurfacePairs`
  equality. Add the class to the filter:
  ```ts
  const pairs = contrastPairs.filter(
    ([foreground, , pairClass]) =>
      fillRoles.has(foreground) && pairClass === "surface",
  );
  ```
- Add a case in the `docs/tokens.md contrast surfaces` block:
  ```ts
  it("states the invalid field edge and the surfaces it is painted on", () => {
    const pairs = contrastPairs
      .filter(
        ([foreground, , pairClass]) =>
          foreground === "destructive" && pairClass === "boundary",
      )
      .map(([, background]) => background);

    expect(pairs.toSorted()).toEqual(["background", "input"]);
    expect(markdown).toContain("the invalid field edge");
    expect(markdown).toContain("`destructive` on the `input` fill");
    expect(markdown).toContain("the `background` canvas a transparent field paints");
  });
  ```
- Update the exact `focus ring … and essential boundaries …` row in the
  design-system floor-table case only if §2.5 changes that row's text (it does;
  keep the two strings identical).

### 2.4 `packages/tokens/src/invalid-field-edge.test.ts` — new guard

Header comment states the bug: the invalid edge is the only error signal, and it
was unmeasured, so an edited theme could erase it while the checker returned
`[]`.

```ts
const variants: ReadonlyArray<readonly [string, Theme]> = themeModes.flatMap(
  (mode) =>
    themeContrasts.flatMap((contrast) => [
      [`identity ${mode} ${contrast}`, getTheme(mode, contrast)] as const,
      ...platforms.map(
        (platform) =>
          [
            `${platform} ${mode} ${contrast}`,
            getPlatformTheme(platform, mode, contrast),
          ] as const,
      ),
      ...platformRecipeNames.map(
        (recipe) =>
          [
            `${recipe} ${mode} ${contrast}`,
            getPlatformRecipeTheme(recipe, mode, contrast),
          ] as const,
      ),
    ]),
);
```

Cases:

1. **one pair per field surface** — the `destructive`/`boundary` pairs are
   exactly `input` and `background`, each with the `boundary` class.
2. **every shipped theme keeps the error edge perceivable** — flat-map the two
   pairs over `variants`, compare with `contrastFloors[theme.contrast].boundary`,
   expect `[]`. This is the case that fails if a platform style changes
   `destructive` or `input`.
3. **a theme whose error edge matches the field is reported** — the regression:
   ```ts
   const base = getTheme("light");
   const regressed = extendTheme(base, {
     colors: { destructive: base.colors.input },
   });
   const failures = themeContrastFailures(regressed).filter(
     ({ foreground, pairClass }) =>
       foreground === "destructive" && pairClass === "boundary",
   );

   expect(failures.map(({ background }) => background).toSorted()).toEqual([
     "background",
     "input",
   ]);
   expect(
     failures.every(({ floor }) => floor === contrastFloors.default.boundary),
   ).toBe(true);
   ```
   Before §2.1 this filter returns `[]` and the test fails; the same case proves
   the public checker (not only the shipped-set loop) reports it.

### 2.5 `docs/design-system.md`

- §8 Interaction states: add one row after `disabled`:
  ```md
  | invalid | a `destructive` edge on the `input` fill a field paints and on the `background` canvas a transparent field paints, held to the essential-boundary floor (3:1, 4.5:1 at AAA); the message itself uses `destructiveText`, not the fill |
  ```
- §9 floor table: in the focus/boundary row, after “the four soft status fills”,
  add “and the invalid field edge (`destructive` on `input`/`background`)”.
  Update the matching string in `docs.test.ts` verbatim.

### 2.6 `docs/tokens.md`

- Colour-role table, `destructive` row: the description becomes
  “destructive action, and the invalid field edge”. Do not touch the values.
- `### Checking a theme`: after “the field edge on its `input` fill”, add “the
  invalid field edge (`destructive` on that `input` fill and on the `background`
  canvas a transparent field paints)”.
- In the same section, one short paragraph after the field-edge sentence:
  “An invalid field is an error state, not a decoration: `FieldInput` paints a
  `destructive` border over its `input` fill and the ColorPicker hex field over
  the `background` canvas, so both are `boundary` pairs. Every shipped set
  clears 3:1 (4.5:1 at AAA); the tightest is the Aero light canvas at
  **4.180:1**.” — derive the figure from the shipped Aero recipe in the test if
  `docs.test.ts` should hold it; otherwise state no number and let the guard
  check the pair names.

  Prefer **no quoted ratio**: the pair names are what the guard holds, and a
  moving figure would need another derivation. Keep the sentence to the two
  compositions.

### 2.7 `COMPONENTS.md`

- “Theme contrast check” row: `262 contrast pairs` → `264 contrast pairs`, and
  append one sentence: “Plan 325 measures the invalid field edge — `destructive`
  on the `input` fill `FieldInput` paints and the `background` canvas the
  ColorPicker hex field paints — as a `boundary` pair; every shipped set clears
  it, so no colour moves.”
- “Design tokens” row: nothing (no value changes).

### 2.8 `TODO.md` and the plan index

- Add and tick under “Design tokens and theming”: “Hold the invalid field edge —
  `FieldInput` paints a `destructive` border on `input` and the ColorPicker hex
  field on `background`, but the contract measured `destructive` only as a fill,
  so an edited theme could erase the error signal while the checker returned
  `[]`; both pairs join the `boundary` class, every shipped set passes, so no
  colour moves (plan 325).”
- Re-count the subsection and move the progress bar to the new `done/total`.
- Add plan 325 to `.agents/slop/plans/README.md` after 324 with status `done`,
  and append one commentary paragraph.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 52 files / 3217 tests. Stop if red.

2. Add `invalid-field-edge.test.ts` **before** §2.1 and run only it:
   ```sh
   cd packages/tokens && nub exec vitest run src/invalid-field-edge.test.ts
   ```
   Expected: the pair-list case and the regression case FAIL (the contract has
   no `destructive`/`boundary` pair); the shipped-theme case passes vacuously
   because it iterates the same empty list — it is covered by case 1.
   Record the output.

3. Implement §2.1, then:
   ```sh
   cd packages/tokens && nub exec vitest run src/invalid-field-edge.test.ts
   ```
   Expected: PASS, 3 tests.

4. Update §2.2, §2.3 and the documents, then:
   ```sh
   nub run --filter @gpuixui/tokens test
   nub run check
   nub run lint
   nub run fmt
   nub run test
   ```
   Expected: all green; 53 files / 3220 tests; `contrast.test.ts` proves 264
   pairs.

5. Re-read the `Checking a theme` paragraph so the added clause is one sentence,
   not a second contract story.

## 4. STOP conditions

Stop and report instead of improvising if:

- any shipped ratio is already below `boundary` — that is a palette defect, not
  a contract-only task; report the theme and the ratio before changing a colour;
- `destructive` is painted as an edge on a surface beyond `input` and
  `background` in either consumer package — add the pair to the plan first;
- another suite hard-codes the 262 count (search `262`); update it in the same
  commit rather than relaxing the assertion;
- the package was red before the change for reasons outside this workstream.

## 5. Acceptance

- `contrastPairs` contains exactly two `destructive`/`boundary` pairs — `input`
  and `background` — and the total is 264.
- `invalid-field-edge.test.ts` fails without the pairs and passes with them, and
  the regression case proves `themeContrastFailures` reports an edited theme
  whose `destructive` matches `input`.
- No colour, pair class, floor, role or theme value changes.
- `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` and the
  plan index are current; the guarded design-system row string is updated with
  the row.
- `nub run check`, `nub run lint` and `nub run test` pass.

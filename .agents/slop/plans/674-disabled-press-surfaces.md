# Plan 674 — The disabled label and the divider on the pressed selected row

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/disabled-state.example.ts`,
> `packages/tokens/src/disabled-state.test.ts`,
> `packages/tokens/src/disabled-press-surfaces.test.ts` (new),
> `packages/tokens/src/docs.test.ts`, `packages/tokens/README.md`,
> `docs/tokens.md`, `docs/design-system.md`, `TODO.md`,
> `.agents/slop/plans/README.md`. No colour, pair, floor, metric or shipped
> theme moves.

## Execution record (2026-10-19)

- The new cases and the extended `docs.test.ts` case were run before the prose
  edits and failed exactly as measured: the §8 `disabled` row and the §9
  inactive-label row did not name `selectedActive`, the §9 decorative-divider
  row named `selected` but not `selectedActive`, and neither the catalogue nor
  the README named the pressed row for an unavailable label. The divider case
  also found that `selected` itself was missing from the floor row, although
  `selectedRowEdgePairs` has measured it since plan 335.
- After the edits: the focused suites are green, the package is **188 files /
  6703 tests**, and `nub run check`, `nub run lint` and `nub run test` are
  green.
- Both directions were re-proved by reverting the four prose surfaces to their
  pre-fix wording: **9 failed / 211 passed** in
  `disabled-press-surfaces.test.ts` + `docs.test.ts`. Restoring the files
  returned both suites to green.

## Why

Plan 651 shipped the selected row's press, `selectedActive`, and
`selectionPressPairs` measures the text and chrome a chosen row paints while it
is pressed. Two of those pairs are still missing from the documentation, and the
same press left a third count one behind:

1. `selectionPressPairs` includes

   ```ts
   ["disabledForeground", "selectedActive", "inactive"],
   ```

   but the design system's §8 `disabled` row names the `hover`/`active`/
   `accent`/`selected` washes and stops there, its §9 *inactive label* floor row
   does the same, `docs/tokens.md`'s Verification paragraph names "the four row
   washes", and `packages/tokens/README.md` repeats that four-wash list. A
   reader is told a disabled label has fourteen measured surfaces when the
   contract has fifteen, and that a disabled control inside a pressed chosen
   row has no pair behind it.

2. `selectionPressPairs` also includes

   ```ts
   ["border", "selectedActive", "divider"],
   ```

   while the §9 *decorative dividers* row names "the `selected` fill an outline
   action sits on in a selected row". The row misses both the pressed fill and
   — because the static test string was written before plan 335 — the
   persistent `selected` fill that `selectedRowEdgePairs` has measured since
   then.

3. The same press moves the selected row's label tier. `textTiers` holds
   `selectedForeground` one step below `foreground`, and plan 651 gave the pair
   a fifth shared fill, `selectedActive`; `selected-label-tier.test.ts` already
   calls it "the five fills". The catalogue's tier paragraph still says "four
   for the selected row's label below its title (the `hover`/`active`/`accent`/
   `selected` fills both roles are documented on)", and the README says "on all
   four fills it keeps (plan 525)". Design-system §11 already says five.

The tests could not catch any of it: `docs.test.ts` derives the `disabled` state
row's surfaces from `inactivePairs` and `selectionInactivePairs` only, the §9
floor rows are compared with one hand-written expected string per row, and the
tier paragraph's counts are not derived at all. This is the same failure mode
plans 351, 352 and 354 closed for the first rows of that table: a hand-typed
list drifts one plan behind while every gate stays green.

The fix is documentation truth, not a palette change. The contract already
passes on all 24 shipped sets; a reader simply cannot see the pair.

## Scope

- Name the pressed `selectedActive` row in the §8 `disabled` state row, the §9
  inactive-label row, the catalogue's Verification paragraph and the package
  README.
- Name both `selected` and `selectedActive` in the §9 decorative-divider row.
- Correct the selected-label tier from four fills to five in the catalogue and
  the README, and derive every tier count in the catalogue paragraph.
- Derive the `disabled` state row's surfaces from every `disabledForeground`
  pair, including the ones `selectionPressPairs` owns.
- Add a derived case for the two floor rows and for the example.
- Extend `disabled-state.example.ts` with the row composition the new sentence
  names, and execute it — the pressed selected row is a surface a copyable
  example can paint.
- No source composition, token value, pair, floor, metric or shipped theme
  changes.

Out of scope: every other floor row, the selection wash on the pressed row
(`selectedActive` is transient, so the selection, scrim and elevation walks stay
on the persistent `selected` fill, exactly as plan 651 documents), and the
`components` migration that keeps a selected row's fill under the pointer.

## Files

| File | Change |
| ---- | ------ |
| `docs/design-system.md` | §8 disabled row; §9 inactive-label and divider rows. |
| `docs/tokens.md` | the Verification paragraph's inactive-label sentence. |
| `packages/tokens/README.md` | the inactive-state paragraph. |
| `packages/tokens/src/disabled-state.example.ts` | `disabledRowStyle` for a chosen row. |
| `packages/tokens/src/disabled-state.test.ts` | execute the new style. |
| `packages/tokens/src/disabled-press-surfaces.test.ts` | new derived guard suite. |
| `packages/tokens/src/docs.test.ts` | the `disabled` state row derives every pair; the two static floor rows move. |
| `TODO.md`, `.agents/slop/plans/README.md` | ledger and index. |

`COMPONENTS.md` needs no edit: its *Theme contrast check* row already names "the
inactive label … on its fill, the plain surfaces and the state washes", and the
pressed row is one of those washes.

## Exact edits

### 1. `docs/design-system.md` §8, the `disabled` row (line 419)

Replace

```
the `hover`/`active`/`accent`/`selected` washes, the four soft status fills, and
through the composited `selection` wash on the same surfaces;
```

with

```
the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive`,
the four soft status fills, and through the composited `selection` wash on the
same fourteen persistent surfaces (a pressed row is transient);
```

### 2. `docs/design-system.md` §9, the inactive-label floor row (line 653)

Replace

```
the `hover`/`active`/`accent`/`selected` washes and the four soft status fills,
and through the composited `selection` wash on the same fourteen surfaces)
```

with

```
the `hover`/`active`/`accent`/`selected` washes, the pressed `selectedActive`
and the four soft status fills, and through the composited `selection` wash on
the same fourteen persistent surfaces — a pressed row is transient)
```

### 3. `docs/design-system.md` §9, the decorative-divider floor row

Replace

```
the `selected` fill an outline action sits on in a selected row, the `disabled`
fill a disabled control keeps its edge on
```

with

```
the `selected`/`selectedActive` fills an outline action sits on in a selected or
pressed row, the `disabled` fill a disabled control keeps its edge on
```

### 4. `docs/tokens.md`, the Verification paragraph (around line 3171)

Replace

```
measures `disabledForeground` on its own fill, the field's `input` fill (plan
`650`), the plain surfaces, the four row
washes and the four soft status fills a tone-tinted Alert's action sits on
(plan `307`)
```

with

```
measures `disabledForeground` on its own fill, the field's `input` fill (plan
`650`), the plain surfaces, the four row washes, the pressed `selectedActive` a
chosen row keeps while a disabled control is pressed (`selectionPressPairs`) and
the four soft status fills a tone-tinted Alert's action sits on (plan `307`)
```

### 5. `packages/tokens/README.md`, the inactive-state paragraph (around line 634)

Replace

```
`disabled` fill, the field's `input` fill, the four plain surfaces, the four row
washes and the four soft
status fills a tone-tinted Alert's action sits on (`inactiveSoftPairs`)
```

with

```
`disabled` fill, the field's `input` fill, the four plain surfaces, the four row
washes, the pressed `selectedActive` a chosen row keeps (`selectionPressPairs`)
and the four soft status fills a tone-tinted Alert's action sits on
(`inactiveSoftPairs`)
```

### 5b. `docs/tokens.md`, the tier paragraph (around line 2819)

Replace

```
(`softAction` and the four soft fills), and four for the selected row's label
below its title (the `hover`/`active`/`accent`/`selected` fills both roles are
documented on).
```

with

```
(`softAction` and the four soft fills), and five for the selected row's label
below its title (the `hover`/`active`/`accent`/`selected`/`selectedActive` fills
both roles are documented on).
```

### 5c. `packages/tokens/README.md`, the selection paragraph (around line 460)

Replace

```
washes it highlights with and the selected row's inherited `selectedForeground`
on all four fills it keeps (plan 525).
```

with

```
washes it highlights with and the selected row's inherited `selectedForeground`
on all five fills it keeps (plan 525; the pressed `selectedActive` joined them
in plan 651).
```

### 6. `packages/tokens/src/disabled-state.example.ts` — the row composition

Add after `disabledButtonStyle`:

```ts
/**
 * The same designed pair on a row label: a selectable row that is chosen keeps
 * its `selected` fill and paints `disabledForeground`; while pressed it keeps
 * the `selectedActive` step (plan 651) and the same label. The contract
 * measures the label on both fills at the inactive floor, so a disabled row
 * item cannot vanish into the row the pointer is over.
 */
export const disabledRowStyle = (theme: Theme, pressed = false) => ({
  backgroundColor: pressed ? theme.colors.selectedActive : theme.colors.selected,
  color: theme.colors.disabledForeground,
  userSelect: "none" as const,
});
```

No new export path: the example module is not a package entry; it is linked from
the catalogue and imported by its test.

### 7. `packages/tokens/src/disabled-press-surfaces.test.ts` (new)

Header states the bug: `selectionPressPairs` measures `disabledForeground` on
`selectedActive` and `border` on `selectedActive`, but four prose surfaces and
the §9 floor row stopped at the persistent washes; the `disabled` state row's
derived guard read only `inactivePairs`/`selectionInactivePairs`, so nothing
could fail.

Read the two pages and the README with the same normalisation the other
documentation guards use (`replace(/\s+/g, " ")`), and slice a table row by its
leading label. Cases:

```ts
it("measures the two pairs the prose names", () => {
  expect(selectionPressPairs).toContainEqual([
    "disabledForeground",
    "selectedActive",
    "inactive",
  ]);
  expect(selectionPressPairs).toContainEqual([
    "border",
    "selectedActive",
    "divider",
  ]);
});

it("names the pressed selected row in the inactive-label floor row", () => {
  const row = floorRow("inactive label (");
  expect(row).toContain("`selectedActive`");
  inactiveSurfaces.forEach((surface) =>
    expect(row, surface).toContain(`\`${surface}\``),
  );
});

it("names every decorative divider surface in its floor row", () => {
  const row = floorRow("decorative dividers (");
  const surfaces = [
    ...new Set(
      contrastPairs
        .filter(
          ([foreground, , pairClass]) =>
            foreground === "border" && pairClass === "divider",
        )
        .map(([, surface]) => surface),
    ),
  ];
  expect(surfaces).toContain("selected");
  expect(surfaces).toContain("selectedActive");
  surfaces.forEach((surface) =>
    expect(row, surface).toContain(`\`${surface}\``),
  );
});

it("names the pressed row for an unavailable label in the catalogue and README", () => {
  [catalogue, readme].forEach((prose) => {
    expect(prose).toContain("pressed `selectedActive`");
    expect(prose).not.toContain("the four row washes and the four soft status fills");
  });
});

it("derives every tier count in the catalogue and the selected label's fill count", () => {
  const surfaceCount = (
    dimmer: keyof ThemeColors,
    brighter: keyof ThemeColors,
  ): number => {
    const brighterSurfaces = surfaceSet(brighter);
    return surfaceSet(dimmer).filter((surface) =>
      brighterSurfaces.includes(surface),
    ).length;
  };
  const rows = [
    ["mutedForeground", "foreground", "shared surfaces"],
    ["mutedForeground", "cardForeground", "`card` for `cardForeground`"],
    ["mutedForeground", "popoverForeground", "for `popoverForeground`"],
    ["inputForeground", "mutedForeground", "surfaces typed text"],
    ["disabledForeground", "mutedForeground", "for the inactive label"],
    ["placeholder", "mutedForeground", "for a hint and a caption"],
    ["disabledForeground", "softActionForeground", "the disabled panel-action label"],
    ["selectedForeground", "foreground", "the selected row's label"],
  ] as const;

  rows.forEach(([dimmer, brighter, marker]) => {
    const count = surfaceCount(dimmer, brighter);
    expect(count, `${dimmer} / ${brighter}`).toBeGreaterThan(0);
    expect(catalogue, marker).toContain(`${countWord(count)} ${marker}`);
  });

  const shared = surfaceCount("selectedForeground", "foreground");
  expect(shared).toBe(5);
  surfaceSet("selectedForeground")
    .filter((surface) => surfaceSet("foreground").includes(surface))
    .forEach((surface) =>
      expect(catalogue, surface).toContain(`\`${surface}\``),
    );
  expect(readme).toContain(`all ${countWord(shared)} fills it keeps`);
});

it("paints both chosen fills at the inactive floor (the example runs)", () => {
  shippedThemes.forEach(({ theme }) => {
    (["light", "dark"] as const).forEach((mode) => {
      const style = disabledRowStyle(theme, mode === "dark");
      expect(style.backgroundColor).toBe(
        mode === "dark" ? theme.colors.selectedActive : theme.colors.selected,
      );
      expect(style.color).toBe(theme.colors.disabledForeground);
      expect(
        contrastRatio(style.color, style.backgroundColor),
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].inactive);
    });
  });
});
```

The last case uses `shippedThemes`, not a hand-built list, and loops both fills
rather than one; it proves the example paints the roles the docs publish.
`surfaceSet(role)` is the deduplicated background list from `contrastPairs`;
`countWord(n)` spells `1…15` the way the prose does (copy the helper from
`docs.test.ts`).

### 8. `packages/tokens/src/docs.test.ts`

- In the §8 interaction-state suite, extend the `disabled` case:

```ts
it("names every surface an inactive label is measured on", () => {
  const surfaces = [
    ...new Set(
      [
        ...inactivePairs,
        ...selectionInactivePairs,
        ...selectionPressPairs.filter(
          ([role]) => role === "disabledForeground",
        ),
      ].map(([, background]) => background),
    ),
  ];
  expect(missing("disabled", surfaces)).toEqual([]);
});
```

  The pre-fix row misses `selectedActive`, so this case fails without edit 1.

- In the §9 expected-row array, move the two strings from edits 2 and 3 to the
  new wording. (This is the one place the plan changes an expected literal; the
  new suite derives the same content from `contrastPairs`/`inactiveSurfaces`, so
  the row is no longer hand-only.)

### 9. `packages/tokens/src/disabled-state.test.ts`

Add a case beside "paints the designed roles, not a fade":

```ts
it("paints a chosen row's disabled label on both fills", () => {
  shippedThemes.forEach(({ theme }) => {
    const rest = disabledRowStyle(theme);
    const pressed = disabledRowStyle(theme, true);
    expect(rest.backgroundColor).toBe(theme.colors.selected);
    expect(pressed.backgroundColor).toBe(theme.colors.selectedActive);
    expect(rest.color).toBe(theme.colors.disabledForeground);
    expect(pressed.color).toBe(theme.colors.disabledForeground);
  });
});
```

Import `disabledRowStyle` beside `disabledButtonStyle`.

### 10. `TODO.md` and `.agents/slop/plans/README.md`

Tick a new row after plan `673`'s, and add the plan index row after `673`.
Raise the workstream progress from 295/369 to **296/370**.

## Commands, in order

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts src/disabled-press-surfaces.test.ts
```

Expected before the prose edits: the extended `docs.test.ts` inactive-label case
fails (the §8 row omits `selectedActive`), and the new suite's floor-row,
catalogue/README and example cases fail. The example case may not compile until
edit 6 lands; add the example first, then run the remaining cases to see them
fail on the untouched prose. If every case passes before the prose edits,
**STOP** and re-measure.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts src/disabled-press-surfaces.test.ts src/disabled-state.test.ts src/examples.test.ts src/snippets.test.ts src/inventory.test.ts
nub run check-types
nub run test
```

Then the repository gates:

```sh
cd ../..
nub run check
nub run lint
nub run test
```

Expected: all green. `docs.test.ts`'s expected-row array and the new derived
cases must agree; if they do not, the prose is wrong, not the derivation.

## STOP conditions

- A shipped theme fails the new example case: **STOP**. The contract already
  passes; a failure means the example is measuring a different composition.
- `docs.test.ts`'s expected-row array disagrees with the derived surface set:
  fix the row to name the surface, never delete the derived case or relax it to
  a subset.
- A prose edit requires changing a token, pair, floor or metric: **STOP**. This
  plan moves none.
- A documentation guard fails on a sentence this plan did not touch: report it;
  do not weaken the guard.
- The pressed row is added to `selectionWashPairs`, the scrim or the elevation
  walk: **STOP**. Plan 651 deliberately keeps those on the persistent
  `selected` fill because a press is transient.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | The `disabled` state row omits `selectedActive`; the inactive-label floor row and the catalogue/README name four washes; the divider floor row omits `selected` and `selectedActive`; `disabledRowStyle` does not exist. |
| Passes with the fix | The state row names every `disabledForeground` surface (derived), the two floor rows name every measured surface (derived), both prose documents name the pressed row, and the example paints both chosen fills at the inactive floor on all 24 shipped sets. |
| Cannot pass by changing a literal | The surfaces come from `contrastPairs`, `inactivePairs`, `selectionInactivePairs`, `selectionPressPairs` and `inactiveSurfaces`; the example loops `shippedThemes` and both fills. |
| No token change smuggled in | `git diff --name-only` lists only the files above; no theme, pair, floor or metric value appears in the diff. |

## Acceptance

- [x] The §8 `disabled` row names the pressed `selectedActive`.
- [x] The §9 inactive-label and decorative-divider rows name the pressed row
      (and the divider row names the persistent `selected` fill too).
- [x] `docs/tokens.md` and the README name the pressed row for an unavailable
      label.
- [x] `disabledRowStyle` ships in the executable example and is tested.
- [x] `docs.test.ts` derives every `disabledForeground` surface, and the new
      suite derives both floor rows.
- [x] Both directions proved; `nub run check`, `nub run lint` and `nub run test`
      are green.
- [x] Plan indexed; `TODO.md` row ticked.

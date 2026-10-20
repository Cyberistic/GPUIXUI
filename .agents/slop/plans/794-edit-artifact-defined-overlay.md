# 794 — The edit artifact refuses a defined `overlay` level it can carry

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `685`, `758`.

## 1. The defect

`themeOverrides(base, theme)` is documented as the inverse of `extendTheme`: it
returns the minimal overrides that rebuild `theme` from `base`. Plan `758` made
it refuse a pair whose **member sets** differ at any depth, because a widened
scale (`{ ...spacing, "6xl": 96 }`) is accepted by the checks and cannot travel
in a `ThemeOverrides`.

That guard walks *arrays* as if they were member maps too. An elevation level is
not a member map: `extendTheme` replaces a defined level **whole**, and a
defined `overlay` is a level the contract explicitly governs (plan `369`) —
`themeMetricFailures` checks a defined level's offsets, blur, spread, alpha and
feather above `lg`, and exempts only the **empty** level.

So a brand that defines the reserved level — the documented extension path —
produces a theme every check accepts, whose exact override set is
`{ elevation: { overlay: [...] } }`, and the diff returns `undefined`:

```
base      Light           overlay: []
edited    Light           overlay: [one shape]
failures  []              (themeFailures accepts it)
shadow    defined         (elevationShadow(edited, "overlay"))
diff      undefined       ← themeOverrides refuses what it could carry
stored    undefined       ← themeEdit returns nothing; the edit cannot be saved
```

The identity ships `overlay` empty (`lightElevation`, `darkElevation`,
`highContrastDarkElevation`), and every platform style leaves it empty, so the
0 → 1 transition is the only way a brand can use the level — and it is the one
transition the diff refuses. The same refusal runs backwards: a base that
defines `overlay` cannot be diffed back to the identity that empties it, even
though `{ elevation: { overlay: [] } }` reproduces it exactly.

Proof (run in `packages/tokens`, deletes itself afterwards):

```sh
cat > src/zz-probe.test.ts <<'EOF'
import { describe, expect, it } from "vitest";
import {
  elevationShadow,
  extendTheme,
  getTheme,
  themeEdit,
  themeFailures,
  themeOverrides,
} from "./index.js";

const base = getTheme("light");
const shape = {
  offsetX: 0,
  offsetY: 28,
  blurRadius: 64,
  spreadRadius: -12,
  alpha: 0.24,
};

describe("probe", () => {
  it("refuses a defined overlay", () => {
    const edited = extendTheme(base, { elevation: { overlay: [shape] } });
    expect(themeFailures(edited)).toEqual([]);
    expect(elevationShadow(edited, "overlay")).not.toBeUndefined();
    expect(themeOverrides(base, edited)).toEqual({
      elevation: { overlay: [shape] },
    });
    expect(themeEdit({ mode: "light" }, edited)).not.toBeUndefined();
  });
});
EOF
nub x vitest run src/zz-probe.test.ts
rm src/zz-probe.test.ts
```

Expected today: the first two assertions pass, the `themeOverrides` one fails
with `undefined`, and the `themeEdit` one fails.

## 2. Decision

An array is a **value** in a `ThemeOverrides`, not a member set. The record walk
still owns the member boundary — an elevation *level* the base does not declare,
a widened scale, an added colour role or type field is still refused, and a
different `mode` still returns `undefined` — while a level's entries are
compared by the group's own diff (`changedElevation`), which already emits the
whole list because `extendTheme` replaces it.

- `sameMembers` accepts two arrays as members of the same shape.
- No token value, pair, floor, metric or shipped theme moves; the 24 shipped
  sets keep round-tripping.
- The guarantee is unchanged and now actually total: **a returned override set
  always rebuilds the theme it was measured against**, and a theme the checks
  accept can be stored whenever `ThemeOverrides` can name the difference.

## 3. Files to change

1. `packages/tokens/src/theme-diff.ts` — the array branch of `sameMembers` and
   three JSDoc paragraphs (`sameMembers`, `themeOverrides`, `themeEdit`).
2. `packages/tokens/src/theme-diff.example.ts` — an executed defined-`overlay`
   edit and its diff.
3. `packages/tokens/src/theme-diff-overlay-level.test.ts` — **new** regression
   suite.
4. `docs/tokens.md` — §*Deriving a theme back to overrides*.
5. `docs/design-system.md` — §11 *Extension*.
6. `packages/tokens/README.md` — the `themeOverrides` paragraph.
7. `COMPONENTS.md` — the *Theme extension* row.
8. `packages/tokens/src/docs.test.ts` — one case holding the three passages to
   the diff.
9. `TODO.md` and `.agents/slop/plans/README.md` — ledger and index.

## 4. Step 1 — the guard

In `packages/tokens/src/theme-diff.ts`, replace the array branch of
`sameMembers`:

```ts
const sameMembers = (base: unknown, theme: unknown): boolean => {
  if (Array.isArray(base) || Array.isArray(theme)) {
    // A level is replaced whole, so its entries are a value, not a member set:
    // a defined `overlay` travels in the diff and `changedElevation` emits it.
    return Array.isArray(base) && Array.isArray(theme);
  }
  ...
```

Update the function's JSDoc to say that the boundary is the *named* members of a
record and that an array is carried whole. Keep the sentence
`member set differs from the base's` in `themeOverrides`' doc (guarded by
`docs.test.ts`), and add the elevation consequence beside it.

## 5. Step 2 — the regression suite

Create `packages/tokens/src/theme-diff-overlay-level.test.ts` with a header
comment stating the bug (a defined `overlay` is refused by the edit artifact
although the checks accept it and the level is replaced whole), then:

1. **The level is valid**: build `extendTheme(getTheme("light"), { elevation:
   { overlay: [shape] } })` and assert `themeFailures(edited)` is `[]` and
   `elevationShadow(edited, "overlay")` is defined — the refusal is not a
   validity judgement.
2. **The diff carries it**: `themeOverrides(base, edited)` equals
   `{ elevation: { overlay: [shape] } }`, and `extendTheme(base, overrides)`
   equals `edited`.
3. **The artifact stores it**: `themeEdit({ mode: "light" }, edited)` is defined
   and `applyThemeEdit(edit)` reproduces `edited`.
4. **The reverse direction**: `themeOverrides(edited, base)` equals
   `{ elevation: { overlay: [] } }` and rebuilds the identity.
5. **The member boundary still holds**: `themeOverrides(lightTheme,
   extendTheme(lightTheme, { spacing: { ...spacing, "6xl": 96 } }))` is still
   `undefined` — the record walk owns that rule.
6. **The executed example**: the example's `exportedOverlayOverrides` equals
   `{ elevation: { overlay: [exportedOverlayShape] } }` and rebuilds
   `exportedOverlayTheme`.

`docs.test.ts` gains one case in its *edit artifact's member boundary* block: it
derives the diff from the public API, then requires the three passages to state
the defined level, so the sentence cannot outlive the behaviour.

## 6. Step 3 — the executed example

In `packages/tokens/src/theme-diff.example.ts`, add:

```ts
/** The one shape a brand defines on the reserved `overlay` level. */
export const exportedOverlayShape = {
  offsetX: 0,
  offsetY: 28,
  blurRadius: 64,
  spreadRadius: -12,
  alpha: 0.24,
} as const;

/** The identity with the reserved level defined. */
export const exportedOverlayTheme = extendTheme(exportedBase, {
  elevation: { overlay: [exportedOverlayShape] },
});

/** The one-group diff that rebuilds it, executed by the suite. */
export const exportedOverlayOverrides = themeOverrides(
  exportedBase,
  exportedOverlayTheme,
);
```

## 7. Step 4 — the documents

Both pages already say an elevation level is replaced whole and that the pair
refuses a group whose member set differs. Add the consequence so a reader does
not conclude a defined `overlay` is refused:

- `docs/tokens.md`, §*Deriving a theme back to overrides*, after the elevation
  sentence: a level is replaced whole, so its entries travel in the diff — a
  brand that defines the reserved `overlay` stores as
  `{ elevation: { overlay: [...] } }`; the member boundary is a group's named
  members, not a level's list.
- `docs/design-system.md`, §11: the same sentence, in the paragraph that states
  the two refusals.
- `packages/tokens/README.md`: the same sentence in the `themeOverrides`
  paragraph.
- `COMPONENTS.md`, *Theme extension* row: note the defined `overlay` behind the
  round-trip clause.

Keep the guarded phrases intact — `the extra step a brand spreads into a scale`,
`the two themes the pair cannot express`, `a group's member set differs from the
base's`, `a group carries a member the base does not declare`, and
`member set differs from the base's` in the source — because
`docs.test.ts` holds them.

## 8. Test plan

```sh
cd packages/tokens
nub x vitest run src/theme-diff-overlay-level.test.ts src/theme-diff.test.ts \
  src/theme-edit.test.ts src/theme-overrides-members.test.ts src/docs.test.ts
nub run check-types
nub run test          # the whole package, 211 files
```

Expected: the new suite passes, the four neighbouring suites stay green
(`theme-overrides-members.test.ts`'s widened-scale refusals unchanged), the
type check is clean, and the package suite is green.

**Prove the test fails without the fix**: restore the old array branch
(`base.length === theme.length && base.every(...)`), run the new suite, and
expect the diff, the artifact and the example cases to fail; then re-apply the
fix.

## 9. STOP conditions

- Stop if a shipped theme stops round-tripping, or if
  `theme-overrides-members.test.ts` reports that a widened scale is no longer
  refused: the record walk must keep the member boundary.
- Stop if any token value, pair, floor or metric has to move. This plan changes
  the artifact only.
- Stop if the diff for a defined `overlay` needs a cast, `any`, or a new public
  type: the fix is the array branch, nothing else.

## 10. Acceptance

- The new suite passes both directions, and the pre-fix code fails it.
- `nub run --filter @gpuixui/tokens test` is green.
- `nub run check` and `nub run lint` pass at the repo root.
- `TODO.md` ticks the row, the plan index lists 794, and the documents state the
  level consequence without losing a guarded phrase.

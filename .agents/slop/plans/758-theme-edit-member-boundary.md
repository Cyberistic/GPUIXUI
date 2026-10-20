# 758 — The edit artifact silently drops a scale member the theme declares

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `685`, `727`,
`744`.

## 1. The defect

`themeOverrides(base, theme)` walks the **shipped** ordered indexes
(`spacingSteps`, `radiusSteps`, `dimensionNames`, …), so it only ever sees the
members the package declares. A brand can widen a scale — the documented
extension path, held by the metric contract since plans `552`, `554` and `568`:

```ts
const wide = { ...spacing, "6xl": 96 };            // no cast; the spread is the
const edited = extendTheme(lightTheme, { spacing: wide }); // documented shape
```

`themeFailures(edited)` returns `[]`: the ten checks accept the widened theme.
But the inverse does not see the added member:

```
failures  []
diff      {}
stored    {"base":{"mode":"light"},"overrides":{}}
replayed  the identity — "6xl" is gone
```

Proof (run in `packages/tokens`, deletes itself afterwards):

```sh
cat > src/zz-probe.test.ts <<'EOF'
import { describe, expect, it } from "vitest";
import { applyThemeEdit, extendTheme, lightTheme, spacing, themeEdit, themeFailures, themeOverrides } from "./index.js";

describe("probe", () => {
  it("loses an added step", () => {
    const wide = { ...spacing, "6xl": 96 };
    const edited = extendTheme(lightTheme, { spacing: wide });
    const stored = themeEdit({ mode: "light" }, edited);
    console.log(JSON.stringify(themeFailures(edited)));
    console.log(JSON.stringify(themeOverrides(lightTheme, edited)));
    console.log(JSON.stringify(stored));
    console.log(JSON.stringify(stored === undefined ? undefined : applyThemeEdit(stored).spacing));
    expect(true).toBe(true);
  });
});
EOF
nub x vitest run src/zz-probe.test.ts --silent=false | grep -E '^\[|^\{|stdout'
rm src/zz-probe.test.ts
```

Expected today: `[]`, `{}`, a stored pair, and a spacing object with no `6xl`.

Three documents promise the opposite:

- `docs/tokens.md` (Deriving a theme back to overrides): *“the brand's own
  differences travel in the overrides and the pair still reproduces it. The one
  theme the pair cannot express is a different `mode`”*.
- `docs/design-system.md` (extension mechanism): *“A different mode returns
  `undefined`, because the mode is not overridable”* and nothing else.
- `packages/tokens/README.md`: *“`undefined` means the modes differ”*.
- `theme-diff.ts`'s own `themeEdit` JSDoc: *“The one theme the artifact cannot
  express is a different `mode`”*.

So a copy-and-own editor that stores `themeEdit(choice, brandTheme)` and
replays it gets a **different theme**, with no failure anywhere.

## 2. Decision

A `ThemeOverrides` can only name the declared members: `spacing` is
`Partial<Spacing>`, and widening that type with an index signature would give up
the excess-property check every consumer's override relies on (`spacing: {
lgg: 12 }` would type-check). The artifact therefore cannot carry the member.

Refuse the pair instead of returning a lossy one:

- `themeOverrides` returns `undefined` when the two themes' **member sets**
  differ at any depth, as well as for a mode mismatch.
- `themeEdit` inherits it (it already returns `undefined` when the diff does).
- `applyThemeEdit` is unchanged.
- No token value, pair, floor, metric or shipped theme moves; the 24 shipped
  sets still round-trip because their groups share one member set.

The guarantee becomes exactly true: **a returned override set always rebuilds
the theme it was measured against.**

## 3. Files to change

1. `packages/tokens/src/theme-diff.ts` — the guard and three JSDoc paragraphs.
2. `packages/tokens/src/theme-overrides-members.test.ts` — new regression suite.
3. `packages/tokens/src/docs.test.ts` — one describe block holding the four
   documents to the boundary.
4. `docs/tokens.md` — §*Deriving a theme back to overrides*, two sentences.
5. `docs/design-system.md` — the `themeOverrides` bullet.
6. `packages/tokens/README.md` — the `themeOverrides` paragraph.
7. `COMPONENTS.md` — the *Theme extension* row's round-trip clause.
8. `TODO.md`, `.agents/slop/plans/README.md` — ledger and index.

## 4. Step 1 — the guard

In `packages/tokens/src/theme-diff.ts`, above `changedSteps`, add:

```ts
const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Whether two themes declare the same members, at every depth. `extendTheme`
 * merges with a spread, so a brand can widen a scale — `{ ...spacing, "6xl":
 * 96 }` — and the numeric contract accepts the result as a `Theme`. A
 * `ThemeOverrides` names only the declared members, so the diff cannot carry an
 * added step back; refusing the pair is what keeps a returned set able to
 * rebuild the theme it was measured against.
 */
const sameMembers = (base: unknown, theme: unknown): boolean => {
  if (Array.isArray(base) || Array.isArray(theme)) {
    return (
      Array.isArray(base) &&
      Array.isArray(theme) &&
      base.length === theme.length &&
      base.every((member, index) => sameMembers(member, theme[index]))
    );
  }
  if (isRecord(base) && isRecord(theme)) {
    const members = Object.keys(base);
    return (
      members.length === Object.keys(theme).length &&
      members.every(
        (member) =>
          member in theme && sameMembers(base[member], theme[member]),
      )
    );
  }
  return true;
};
```

In `themeOverrides`, replace

```ts
  if (base.mode !== theme.mode) {
    return undefined;
  }
```

with

```ts
  if (base.mode !== theme.mode || !sameMembers(base, theme)) {
    return undefined;
  }
```

`changedSteps`' JSDoc gains one sentence after “so a new step joins the diff
from the one owner a table iterates.”:

> A step the base does not declare never reaches this walk: `themeOverrides`
> refuses a pair whose member sets differ.

### JSDoc: `themeOverrides`

Replace the closing sentence of the third paragraph

```
 * an elevation level is replaced whole, matching the documented merge rule. A
 * different `mode` returns `undefined`: `extendTheme` cannot change the mode, so
 * the caller must choose a base of the theme's mode.
```

with

```
 * an elevation level is replaced whole, matching the documented merge rule.
 *
 * `undefined` means the pair cannot be expressed, and there are two cases: a
 * different `mode`, which `extendTheme` cannot change, and a group whose member
 * set differs from the base's — a brand that widens a scale with an extra step,
 * `{ ...spacing, "6xl": 96 }`, which the checks accept as a `Theme` while a
 * `ThemeOverrides` can only name the declared members. Refusing is what keeps
 * the promise: a returned set always rebuilds the theme it was measured
 * against, and a caller holding an unnamed member keeps its theme object.
```

### JSDoc: `themeEdit`

Replace

```
 * `extendTheme` — is measured against the resolved choice, so the brand's own
 * differences travel in the overrides and the pair still reproduces it. The one
 * theme the artifact cannot express is a different `mode`; that case returns
 * `undefined` and the caller keeps its theme object.
```

with

```
 * `extendTheme` — is measured against the resolved choice, so the brand's own
 * differences travel in the overrides and the pair still reproduces it while
 * every group keeps the member set the base declares. Two themes the artifact
 * cannot express return `undefined`: a different `mode`, and one whose scale
 * carries a member the base does not — the extra step a brand spreads into
 * `spacing` is accepted by the checks and cannot travel in `ThemeOverrides`.
 * The caller keeps its theme object in both cases.
```

## 5. Step 2 — the regression suite

New file `packages/tokens/src/theme-overrides-members.test.ts`:

```ts
/**
 * Guards the defect plan 758 fixes: `themeOverrides` walked the shipped scale
 * indexes, so a brand that widened a scale kept its extra step in the theme
 * while the diff dropped it. `themeFailures` accepted the widened theme and
 * `themeEdit` returned a pair whose replay was the identity — the copy-and-own
 * artifact silently lost a member. The pair is refused now, so nothing is lost
 * without the caller knowing, and an edit inside the declared members still
 * round-trips.
 */
import { describe, expect, it } from "vitest";
import {
  avatarSize,
  borderWidth,
  dimensions,
  extendTheme,
  getTheme,
  iconSize,
  lightColors,
  lightTheme,
  radius,
  spacing,
  themeEdit,
  themeFailures,
  themeOverrides,
} from "./index.js";

const choice = { mode: "light" } as const;

describe("the edit artifact refuses an undeclared member", () => {
  it("refuses a spacing step the base does not declare", () => {
    const wide = { ...spacing, "6xl": 96 };
    const edited = extendTheme(lightTheme, { spacing: wide });

    // The checks bless the widened theme, which is what made the loss silent.
    expect(themeFailures(edited)).toEqual([]);
    expect(themeOverrides(lightTheme, edited)).toBeUndefined();
    expect(themeEdit(choice, edited)).toBeUndefined();
  });

  it("refuses an added member in every group a brand can widen", () => {
    const cases = [
      extendTheme(lightTheme, { radius: { ...radius, "2xl": 22 } }),
      extendTheme(lightTheme, { dimensions: { ...dimensions, chartMinHeight: 240 } }),
      extendTheme(lightTheme, { borderWidth: { ...borderWidth, hairline: 0.5 } }),
      extendTheme(lightTheme, { iconSize: { ...iconSize, xxl: 40 } }),
      extendTheme(lightTheme, { avatarSize: { ...avatarSize, xl: 56 } }),
      extendTheme(lightTheme, {
        colors: { ...lightColors, chartGrid: "#EEF1F5" },
      }),
      extendTheme(lightTheme, {
        typography: { body: { fontSize: 14, lineHeight: 20, fontWeight: 450 } },
      }),
    ];

    cases.forEach((edited) => {
      expect(themeOverrides(lightTheme, edited), edited.name).toBeUndefined();
    });
  });

  it("refuses a base that carries a member the theme does not", () => {
    const wide = extendTheme(lightTheme, { spacing: { ...spacing, "6xl": 96 } });

    // Replaying `{}` over `wide` rebuilds `wide`, not the identity.
    expect(themeOverrides(wide, lightTheme)).toBeUndefined();
  });

  it("still round-trips an edit inside the declared members", () => {
    const edited = extendTheme(lightTheme, {
      spacing: { md: 9 },
      radius: { md: 7 },
      name: "Narrow edit",
    });
    const overrides = themeOverrides(lightTheme, edited);

    expect(overrides).not.toBeUndefined();
    expect(extendTheme(lightTheme, overrides ?? {})).toEqual(edited);
    expect(themeEdit(choice, edited)).not.toBeUndefined();
  });

  it("keeps the identity diff of a widened theme", () => {
    const wide = extendTheme(getTheme("light"), { spacing: { ...spacing, "6xl": 96 } });

    // Its own base carries the member, so there is nothing to express.
    expect(themeOverrides(wide, wide)).toEqual({});
  });
});
```

Type rules: every widened scale is built into a **variable** first — a fresh
object literal is excess-property checked (`TS2353`), a spread variable is not
(see `scale-ladder-totality.test.ts`). No `any`, no cast.

## 6. Step 3 — the documents

`docs/tokens.md`, in the paragraph ending “A different `mode` returns
`undefined`, because `extendTheme` cannot change the mode.” (after “an elevation
level is replaced whole, matching the documented merge rule.”), replace the
final sentence with:

> `undefined` means the pair cannot be expressed, for one of two reasons: a
> different `mode`, because `extendTheme` cannot change the mode, or a group
> whose member set differs from the base's — the extra step a brand spreads into
> a scale (`{ ...spacing, "6xl": 96 }`) is a theme every check accepts, while a
> `ThemeOverrides` can only name the declared members, so refusing the pair is
> what keeps the returned set able to rebuild the theme it was measured against.

and in the next paragraph replace

> `the pair still reproduces it. The one theme the pair cannot express is a different `mode`;
> `themeEdit` returns `undefined` there and the caller keeps its theme object.`

with

> `the pair still reproduces it while every group keeps the member set the base declares. A
> different `mode` and an added scale member are the two themes the pair cannot
> express; `themeEdit` returns `undefined` there and the caller keeps its theme
> object.`

`docs/design-system.md`, the `themeOverrides` bullet: replace “A different mode
returns `undefined`, because the mode is not overridable.” with

> A different mode returns `undefined`, because the mode is not overridable, and
> so does a group whose member set differs from the base's — a scale a brand
> widened with an extra step, which the checks accept and a `ThemeOverrides`
> cannot name.

`packages/tokens/README.md`, the same paragraph: replace “`undefined` means the
modes differ, because `extendTheme` cannot change the mode.” with

> `undefined` means the pair cannot be expressed: the modes differ, or a group
> carries a member the base does not declare — the extra step a brand spreads
> into a scale, which the checks accept and a `ThemeOverrides` cannot name, so
> the returned set always rebuilds the theme it was measured against.

`COMPONENTS.md`, the *Theme extension* row: replace “a mode mismatch is
`undefined`, plan 685” with “a mode mismatch or a group whose member set the
base does not declare is `undefined`, plans 685 and 758”.

## 7. Step 4 — the documents' guard

Append to `packages/tokens/src/docs.test.ts`:

```ts
describe("the edit artifact's member boundary", () => {
  const readmeProse = readmeSource.replace(/\s+/g, " ");

  it("states both themes the pair cannot express", () => {
    expect(markdownProse).toContain("the extra step a brand spreads into a scale");
    expect(markdownProse).toContain("the two themes the pair cannot express");
    expect(designSystem).toContain("a group whose member set differs from the base's");
    expect(readmeProse).toContain("a group carries a member the base does not declare");
  });

  it("states it in the diff's own JSDoc", () => {
    const source = readFileSync(
      new URL("./theme-diff.ts", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(source).toContain("member set differs from the base's");
    expect(source).toContain("cannot travel in `ThemeOverrides`");
    expect(source).not.toContain("The one theme the artifact cannot express is a different `mode`");
  });
});
```

## 8. Step 5 — ledger and index

`TODO.md`, in the *Design tokens and theming* block, add one ticked row beside
the other plan rows:

```
`[x]` Refuse an edit artifact that would lose a member — `themeOverrides`
walked the shipped indexes, so a brand that widened a scale kept its extra step
while the diff returned `{}` and `themeEdit` stored a pair whose replay was the
identity, although `themeFailures` accepted the widened theme and three
documents promised the pair reproduces it; the diff now compares every group's
member set at every depth and returns `undefined` with a mode mismatch, the
promise is exact, and no value, pair or shipped theme moves (plan 758)
```

`.agents/slop/plans/README.md`: add below the `757` row

```
| [758](./758-theme-edit-member-boundary.md) | The edit artifact that drops a scale member the theme declares | F | 685, 727, 744 | done |
```

## 9. Commands and expected results

Run from the worktree root unless stated.

1. **Failing direction** — write the new suite first, run it before the guard:
   `cd packages/tokens && nub x vitest run src/theme-overrides-members.test.ts`
   Expected: the first three cases fail (`expected {} to be undefined`), the
   last two pass. If the first case passes, STOP: the probe is not reaching the
   diff.
2. Apply the guard, rerun the same command.
   Expected: 5 passed.
3. `cd packages/tokens && nub x vitest run src/theme-diff.test.ts src/theme-edit.test.ts src/docs.test.ts`
   Expected: all green — the 24 shipped sets, the recipe/brand round trips and
   the new document cases.
4. `nub run --filter @gpuixui/tokens test` — expected `207 → 208` files and
   `6992 → 6997` tests passed.
5. `nub run --filter @gpuixui/tokens check-types` — expected exit 0.
6. `nub run lint` from the root — expected exit 0.
7. `nub run check` from the root — expected exit 0.

No native smoke scenario changes: no colour, metric, role or shipped theme
moves, and `apps/playground` has no built `dist` in this worktree. Record that
in the commit message.

## 10. STOP conditions

- The guard refuses a shipped theme (case 1 of `theme-diff.test.ts` fails):
  a shipped set has diverging member sets — investigate `applyPlatformStyle`'s
  merges; do **not** narrow the guard to the scales.
- `check-types` rejects a widened-scale fixture: the spread must be a variable,
  never a fresh literal.
- A document phrase you were told to add is already there in another form:
  match the sentence as given; do not add a second paragraph.
- Anyone reports a public type change is needed: STOP. The plan is refuse-only.

## 11. Acceptance

- `themeFailures` accepts a widened theme and `themeOverrides` returns
  `undefined` for it; `themeEdit` returns `undefined`.
- `themeOverrides(theme, theme)` is `{}` for a widened theme.
- A declared-member edit still round-trips through `themeOverrides` and
  `themeEdit`.
- All 24 shipped sets still round-trip (existing suite, unchanged).
- Catalogue, design system, README, the `themeEdit` JSDoc and the ledger state
  both non-expressible cases, and `docs.test.ts` holds them.
- `nub run check`, `nub run lint`, `nub run test` green.

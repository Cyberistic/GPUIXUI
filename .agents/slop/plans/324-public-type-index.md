# Plan 324 — Name every public type in the reference

**Workstream:** `tokens-theme`
**Phase:** F (documentation truth)
**Depends on:** 066 (every public value is named and guarded), 071/086 (the
contrast contract's public types), 311 (recipes add a public type union)
**Status:** ready

## 1. Why

`docs/tokens.md` opens with the promise “if a token is not here, it is not
public”, and plan 066 made that true for **values**: `docs.test.ts` iterates
`Object.keys(Tokens)` and fails on any value export the page does not name.

Types are public API too — a consumer cannot write a typed platform style, a
theme config or a custom recipe without `PlatformStyle`,
`PlatformStyleStructure`, `ThemeConfig`, `ThemeOverrides`,
`TypographyOverrides` or `DensityOverrides` — but nothing enumerates them,
because they do not exist at runtime. A probe of the entry modules
(`src/index.ts` and `src/react.ts`, following `export *` and named re-exports)
finds **44 public types**, of which **24 are absent from the reference**:

```
BoxShadow          MotionLevel          ThemeConfig
ContrastFailure    MotionPhase          ThemeOverrides
ContrastPair       MotionTransition     ThemeProviderProps
ContrastPairClass  PlatformRecipeName   TypographyOverrides
DensityOverrides   PlatformStyleStructure
ElevationLevel     SelectionStyle
ElevationShape     StatusToneStyle
FontWeight         TextRole
MotionEasing       TextStyle
MotionEasings      TextStyleProperties
```

The newest one is the sharpest example: plan 311 shipped
`getPlatformRecipeTheme(recipe: PlatformRecipeName, …)` and a narrowing guard,
but `PlatformRecipeName` is nowhere in the catalogue, so a consumer storing a
recipe choice has to infer the type from the function signature. The same is
true of every type the contrast contract returns (`ContrastPair`,
`ContrastPairClass`, `ContrastFailure`) — the page documents the function and
the data, not the types that describe them.

This is the type half of plan 066, and it needs the same guard: the reference
must name every public type, and the suite must fail when one is added without
the page.

## 2. What changes

### 2.1 `docs/tokens.md` — a type index

Insert a new `## Types` section immediately after the `## Import` code block (so
it precedes `## Colour roles`). One table, alphabetical, every public type with
a one-line purpose:

```md
## Types

Every public type export, in alphabetical order. The section that owns a value
also owns its shape; this index exists so a consumer typing a config, a platform
style or a contract check can find the name without reading the source.

| Type | Purpose |
| ---- | ------- |
| `AvatarSize` | Avatar diameters by size. |
…
```

The rows are exactly the 44 names the walk in §2.2 returns:

`AvatarSize`, `BorderWidth`, `BoxShadow`, `ContrastFailure`, `ContrastPair`,
`ContrastPairClass`, `ControlSize`, `Density`, `DensityName`,
`DensityOverrides`, `Elevation`, `ElevationLevel`, `ElevationShape`,
`FocusRing`, `FontWeight`, `IconSize`, `Motion`, `MotionEasing`,
`MotionEasings`, `MotionLevel`, `MotionPhase`, `MotionTransition`,
`PlatformName`, `PlatformRecipeName`, `PlatformStyle`,
`PlatformStyleStructure`, `PlatformType`, `Radius`, `SelectionStyle`,
`Spacing`, `StatusTone`, `StatusToneStyle`, `TextRole`, `TextStyle`,
`TextStyleProperties`, `Theme`, `ThemeColors`, `ThemeConfig`,
`ThemeContrast`, `ThemeMode`, `ThemeOverrides`, `ThemeProviderProps`,
`Typography`, `TypographyOverrides`.

Write each purpose from the declaration's own JSDoc; do not invent behaviour.
Keep the existing references to types in the sections that already use them
(`Theme`, `PlatformName`, …) — the table is an index, not a replacement.

### 2.2 `packages/tokens/src/public-types.test.ts` — the guard

New file. Header comment states the bug it guards: the catalogue promises to
name every public token, but it only enumerated runtime values, so 24 public
types — including `ThemeOverrides`, `PlatformRecipeName` and the contrast
contract's `ContrastPair` — were absent while every suite stayed green.

The test walks the module graph from the two entry modules, because types do not
exist at runtime:

```ts
const walk = (entry: URL): ReadonlySet<string> => {
  const visited = new Set<string>();
  const names = new Set<string>();
  const visit = (url: URL): void => {
    if (visited.has(url.href)) return;
    visited.add(url.href);
    const source = readFileSync(url, "utf8");
    for (const [, name] of source.matchAll(
      /^export (?:interface|type|class|enum) (\w+)/gm,
    )) names.add(name);
    for (const [, from] of source.matchAll(
      /^export \* from "([^"]+)";/gm,
    )) visit(new URL(from.replace(/\.js$/, ".ts"), url));
    for (const [, from] of source.matchAll(
      /^export (?:type )?\{[^}]+\} from "([^"]+)";/gm,
    )) visit(new URL(from.replace(/\.js$/, ".ts"), url));
  };
  visit(entry);
  return names;
};
```

(Write it without non-null assertions; `matchAll` destructuring gives
`string | undefined`, so guard or use array indexing with an explicit check.)

Two cases:

1. **The walk finds the public API.** Assert the union of the two entries
   contains the anchors `Theme`, `ThemeOverrides`, `ThemeConfig`,
   `PlatformRecipeName` and `ThemeProviderProps`, and that the union is larger
   than 40. This fails loudly if the regex or an entry path breaks, instead of
   silently shrinking the required set.
2. **The type index matches the walk, both directions.** Parse the `## Types`
   section (between its heading and the next `^## `), collect every
   `` | `Name` | `` row, and assert the sorted unique rows equal the sorted walk
   union. This fails when a type is undocumented **and** when the table names a
   type that is no longer exported; the duplicate check (`rows.length ===
   new Set(rows).size`) keeps the table one row per name.

`node:fs` is deliberate, like `docs.test.ts`: this is a documentation test over
the tree's own sources and the package ships zero runtime dependencies.

### 2.3 `COMPONENTS.md` — the Design tokens row

Append one sentence: every public type is named in the reference and held by
`public-types.test.ts`. Do not add a count or repeat an existing pair count.

### 2.4 `TODO.md` and the plan index

- Add and tick under “Design tokens and theming”: “Name every public type in
  `docs/tokens.md` — 24 of the 44 exported types, including `ThemeOverrides`,
  `PlatformRecipeName` and the contrast contract's `ContrastPair`, were absent
  while the value-coverage test stayed green; a module-walk guard now holds the
  type index to the entry modules (plan 324).”
- Re-count the subsection and move the progress bar to the new `done/total`.
- Add plan 324 to `.agents/slop/plans/README.md` after 323 with status `done`,
  and append one commentary paragraph.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 51 files / 3215 tests. Stop if red.

2. Add §2.2 **before** §2.1 and run only the new file:
   ```sh
   cd packages/tokens && nub exec vitest run src/public-types.test.ts
   ```
   Expected: the index case FAILS and prints the 24 missing names; the anchor
   case passes. Record the output.

3. Add the `## Types` table (§2.1) and re-run:
   ```sh
   cd packages/tokens && nub exec vitest run src/public-types.test.ts
   ```
   Expected: PASS, 2 tests.

4. Whole package and gates:
   ```sh
   nub run --filter @gpuixui/tokens test
   nub run check
   nub run lint
   nub run test
   ```
   Expected: all green; the package suite is 52 files.

5. Read the rendered section once to check the descriptions match the
   declarations (no copied guess).

## 4. STOP conditions

Stop and report instead of improvising if:

- the walk returns fewer than 40 names or misses an anchor — the entry paths or
  the re-export shapes changed; do not widen the regex silently to make it pass;
- a name in §2.1 has no exported declaration (a stale plan, not a docs task);
- the docs page already fails a different truth guard — report it instead of
  folding an unrelated fix into this plan;
- the suite was red before the change for reasons outside this workstream.

## 5. Acceptance

- `docs/tokens.md` has a `## Types` index naming exactly the types the entry
  modules export, once each, in alphabetical order.
- `public-types.test.ts` fails without the table and passes with it; it also
  fails when a table row names a type that is no longer exported.
- No runtime value, token, pair, floor or theme changes.
- `COMPONENTS.md`, `TODO.md` and the plan index are current.
- `nub run check`, `nub run lint` and `nub run test` pass.

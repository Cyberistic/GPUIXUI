# 015 — Colour role index for documentation

**Workstream:** `tokens-theme`
**Phase:** B, closing the last inbound interlock on `@gpuixui/tokens`
**Depends on:** plans 011, 013, 014 (the implemented package)
**Files owned:** `packages/tokens/**`, `docs/tokens.md`, this plan,
`.agents/slop/plans/README.md` (index row only), `TODO.md` (this workstream only),
`COMPONENTS.md` (design-system section only).

Self-contained. Follow the steps in order.

---

## 1. Why

The `docs-site` workstream recorded an interlock
(`workspaces/docs-site/TODO.md` → "Tokens-theme: expose a dependency-free token
data export the docs site can read for token tables").

The package is already dependency-free pure data (`themes`, `highContrastThemes`,
`palette`, `typography`, `spacing`, `radius`, `densityPresets`, `borderWidth`,
`iconSize`). The one thing a table generator cannot do without a cast is iterate
the colour roles **with their key type intact**:

```ts
Object.entries(themes.light.colors); // [string, string][] — the role is not `keyof ThemeColors`
```

A `keyof ThemeColors` index makes the obvious recipe type-check and makes the
documentation order a public contract instead of an object-literal incident.

## 2. Decision (do not re-litigate)

Export a single ordered, typed role index. It is written as a literal tuple
because the alternatives are worse:

- `Object.keys(...) as readonly (keyof ThemeColors)[]` is an unsafe cast, which
  the repo forbids;
- reflecting with Effect's `Record` would add a runtime dependency to a package
  whose whole contract is having none.

The tuple is guarded against drift by a test that compares it to the shipped
role keys, so a role added to one and not the other fails the suite.

## 3. Exact change

### 3.1 `packages/tokens/src/color.ts`

Append after the four colour sets:

```ts
/**
 * Every semantic colour role, in the order the token documentation lists them.
 * Documentation sites iterate this to build colour tables against any theme.
 *
 * @example
 * ```ts
 * import { colorRoles, themes } from "@gpuixui/tokens";
 *
 * const rows = colorRoles.map((role) => ({
 *   role,
 *   light: themes.light.colors[role],
 *   dark: themes.dark.colors[role],
 * }));
 * ```
 */
export const colorRoles = [
  "background", "foreground", "card", "cardForeground", "popover",
  "popoverForeground", "primary", "primaryForeground", "secondary",
  "secondaryForeground", "muted", "mutedForeground", "accent",
  "accentForeground", "destructive", "destructiveForeground", "success",
  "successForeground", "warning", "warningForeground", "info",
  "infoForeground", "infoSoft", "infoSoftForeground", "successSoft",
  "successSoftForeground", "warningSoft", "warningSoftForeground",
  "destructiveSoft", "destructiveSoftForeground", "border", "borderStrong",
  "input", "inputForeground", "placeholder", "ring", "selection", "overlay",
  "hover", "active", "selected", "selectedForeground", "disabled",
  "disabledForeground", "skeleton", "scrollbar", "shadow",
] as const satisfies readonly (keyof ThemeColors)[];
```

The order is the `ThemeColors` member order, which is also the order of both
role tables in `docs/tokens.md`. Let `oxfmt` decide the final line breaks (§5).

### 3.2 `packages/tokens/src/color.test.ts`

Add to `describe("colour roles")`:

- `expect(colorRoles).toEqual(Object.keys(lightColors))` — order and contents.
  This fails if a role is added to the interface and the sets but not to the
  index, or if the index order drifts from the sets.
- every entry of `colorRoles` has a value in all four sets
  (`colourSets.forEach(({ label, colors }) => colorRoles.forEach((role) =>
  expect(colors[role], `${label}.${role}`).toBeDefined()))`).
- `expect(new Set(colorRoles).size).toBe(colorRoles.length)` — no duplicate role
  in the index.

### 3.3 `docs/tokens.md`

Add a **For documentation sites** section after "Using tokens in components": the
type-checking problem, the `colorRoles` recipe (the snippet in §3.1), and the
statement that `themes` / `highContrastThemes` / `palette` and the scale objects
are the dependency-free value source. Say plainly: do not import
`@gpuixui/tokens/react` from the site.

Add `colorRoles` to the import snippet.

### 3.4 `COMPONENTS.md`

Extend the "Design tokens" row's notes with "`colorRoles` indexes the roles for
generated doc tables." No new row.

### 3.5 `TODO.md`

The tokens-theme task list gains and ticks
`[x] Expose `colorRoles` for the docs site's generated token tables`, and the
cross-team line drops the docs-site item that this closes (the Fumadocs Theming
*page* stays with the docs workstream).

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # 6 files, all pass
nub run lint                                   # exit 0
nub run fmt                                    # exit 0
nub run check                                  # exit 0
nub run test                                   # exit 0
```

Prove the new guard can fail: delete one role name from `colorRoles`, run the
package tests, capture the failure, restore it, run again. Record both outputs in
the commit body.

## 5. STOP conditions

- If `as const satisfies readonly (keyof ThemeColors)[]` does not compile, stop
  and report. Do not fall back to a cast.
- If `oxfmt` cannot format the literal, stop and report.
- If a document or test outside this workstream's paths needs a change, record it
  in `TODO.md`; do not edit it.
- If a gate fails for a reason outside `packages/tokens` and `docs`, report it and
  leave it alone.

## 6. Acceptance criteria

- [ ] `colorRoles` is exported, JSDoc'd, ordered, and exactly the `ThemeColors`
      keys.
- [ ] A test fails if the index and the colour sets disagree.
- [ ] `docs/tokens.md` documents the documentation-site recipe with a snippet
      that type-checks against the real API.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.

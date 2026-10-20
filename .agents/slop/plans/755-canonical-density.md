# 755 — The canonical link writes the density it resolves

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (contract completeness / docs truth).
**Depends on:** 380 (the persisted choice), 529 (the URL codec), 534 (a style
owns its density preset), 542 (the density exception's rule), 688 (plan numbering).

## 1. The defect

`themeChoiceParams(choice)` is documented as writing **every** resolved axis,
with density as the one deliberate exception to minimality. The JSDoc in
`packages/tokens/src/theme-choice.ts` states the rule and its own example:

> `density` is the one axis written even when it equals the resolved theme's
> preset, so the writer is deliberately not minimal there. Its fallback is the
> *resolved theme's* preset, which the platform supplies (macOS ships
> `compact`), so omitting it would make the same stored row resolve differently
> the moment a reader edits the platform in the link: `platform=darwin` without
> a density is `compact`, and the same link with `win32` is `comfortable`.

The catalogue, the design system and the README repeat it ("every valid
density, because the platform supplies the density fallback").

The writer only writes a density the caller **passed**:

```ts
density: (choice) =>
  isDensityName(choice.density) ? choice.density : undefined,
```

so the exact case the paragraph uses as its example — a row that omits the axis,
`{ platform: "darwin" }` — writes no density at all:

```ts
themeChoiceParams({ platform: "darwin" }); // [["platform", "darwin"]]
```

and the canonical link for that row, edited from macOS to Windows by a reader,
resolves `comfortable` instead of the `compact` the link showed. The existing
test only pins the explicit case (`{ platform: "darwin", density: "compact" }`)
and another case asserts the omission for `{ platform: "win32" }` — the two
sentences cannot both be true.

`themeChoiceParams` is the function a settings screen or a docs platform toggle
writes a shareable link with. It is the only place the package promises that a
link reproduces the theme it was made from; here it reproduces it today and
loses the density as soon as the reader changes the platform in the link.

## 2. Exact changes

### 2.1 `packages/tokens/src/theme-choice.ts`

Replace the density encoder with the resolved preset:

```ts
density: (choice) => resolveThemeChoice(choice).density.name,
```

`Density.name` is a `DensityName`, so the entry is total: a choice that names a
valid density resolves it, an unknown one keeps the platform's preset, and an
absent one does too. Nothing else changes; `themeChoiceKeys` order, the recipe
suppression and the other encoders stay.

Rewrite the `themeChoiceParams` JSDoc paragraph so it states the implemented
rule without the conditional reading:

- `density` is **always** written, as the preset the choice resolves to:
  `platform=darwin` writes `density=compact`, an identity row writes
  `density=comfortable`, and a row that carries `spacious` keeps it.
- The reason is unchanged: the fallback belongs to the platform (or recipe), so
  a link without a density would change meaning when the platform axis is
  edited.
- Keep the existing statement that the writer is not minimal for density, and
  keep the example block; update its comment if it spells an output.

### 2.2 `packages/tokens/src/theme-choice-params.test.ts`

- **Rewrite** the case `"omits every axis a fallback already selects"` to
  `"omits the axes with a global fallback and writes the resolved density"`:
  `themeChoiceParams({ mode: "light", contrast: "default", platform: "default" })`
  is `[["density", "comfortable"]]`; `{ mode: "dark" }` is
  `[["mode", "dark"], ["density", "comfortable"]]`; `{ contrast: "high" }` and
  `{ platform: "win32" }` likewise gain the density entry; the per-axis
  necessity loop keeps working because every entry it writes is required.
- **Add the failing case** `"writes the density a choice omits"`:
  - `themeChoiceParams({ platform: "darwin" })` contains
    `["density", "compact"]`;
  - `themeChoiceParams({})` contains `["density", "comfortable"]`;
  - `themeChoiceParams({ recipe: "aero" })` contains
    `["density", resolveThemeChoice({ recipe: "aero" }).density.name]`;
  - the edit-stability scenario from the JSDoc: write `{ platform: "darwin" }`,
    set `platform=win32`, decode, and expect `density.name === "compact"`.
  This case fails on the current tree.
- Update the `"lets a recipe suppress the platform it overrides"` expectation
  to the array including the resolved density (derive the value, do not type
  `"comfortable"`).
- Update the `"is deliberately not minimal for density"` case to also cover the
  omitted axis (or fold it into the new case and keep the explicit one).
- Update the file header comment: the writer omits the global fallbacks and
  writes the density the row resolves to, even when the row never named one.
- `"is canonical: re-encoding a decoded link writes the same link"` must keep
  passing; the writer's own output now carries a density, so decode → encode is
  stable.

### 2.3 `packages/tokens/src/theme-choice.example.ts`

Add one exported, executed value:

```ts
/** The canonical link for a row that names only a platform. */
export const canonicalLink = themeChoiceParams({ platform: "darwin" });
```

import `themeChoiceParams` from `./index.js`, and assert it in
`theme-choice-params.test.ts` (`toContainEqual(["density", "compact"])`) so the
example and the rule cannot drift. The module is already linked from
`docs/tokens.md` and the README (`theme-choice.example.ts`); keep the links.

### 2.4 Documents

- `docs/tokens.md` — the shareable-URL paragraph (§ *Theming* / theme choice):
  replace "Density is the one exception: it is written even when it equals the
  resolved theme's preset" with a sentence naming the implemented rule: the
  density is written as the preset the choice resolves to, so a row that names
  none (`platform=darwin`) writes the platform's `compact`. No count, no
  figure.
- `docs/design-system.md` — the paragraph at §11 (near line 1054) says "every
  valid density, because the platform supplies the density fallback"; state
  that the resolved preset is written even when the row omits the axis.
- `packages/tokens/README.md` — the paragraph at ~line 258: same correction.
- `COMPONENTS.md` — *Theme extension* row, after the URL-codec clause: one
  sentence naming plan `755` and the rule.
- `docs.test.ts` — extend the existing theme-choice sentence guard (the case
  that pins the omission rule and the density exception) with the new phrase,
  so a future edit to either page must keep it. `readme.test.ts` holds the
  README paragraph if it already reads this sentence; otherwise add the same
  substring check there.

### 2.5 `TODO.md` and the plan index

- One completed row under *Design tokens and theming* naming plan `755`, the
  contradictory docs and the writer fix; progress bar `341/418` → `342/419`.
- `.agents/slop/plans/README.md`: index `755` after `754`; add one sentence to
  the block summary.

## 3. Commands

```sh
# 1. The new case against the current writer (expected: fails on the darwin row):
nub run --filter @gpuixui/tokens test theme-choice-params

# 2. After §2.1, the same suite plus the composition suite:
nub run --filter @gpuixui/tokens test theme-choice

# 3. The docs guards touched in §2.4:
nub run --filter @gpuixui/tokens test docs.test readme test

# 4. Package gate:
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types

# 5. Repo gate:
nub run check
nub run lint
nub run test
```

Expected: step 1 fails on the new case before the fix; steps 2–3 pass after;
step 4–5 green, no token value, pair, floor, role, metric or shipped theme
moves.

## 4. STOP conditions

- **A consumer contract requires the minimal link.** If a shipped consumer (the
  docs-site toggle, a settings row) asserts a link without `density` as its
  canonical output, do not change the writer: stop, report the consumer, and
  write the alternative as its own plan (correct the four documents to the
  explicit-density reading instead). Do not change both halves silently.
- **Resolving inside the writer creates an import cycle.** `theme-choice.ts`
  already imports `platform-recipes`, `platforms`, `scale` and `theme`; if a
  cycle appears, hoist the resolved-density helper into a module those four do
  not import and keep the encoder total; do not duplicate the precedence.
- **A test beyond the two named in §2.2 depends on the omission** for an
  unrelated reason (e.g. an example snapshot): read the case, decide whether it
  asserts the old rule or a different one, and only update the former.
- **The full-matrix case slows the file past the package's 20 s budget**
  (plan 333): the writer resolves one theme per encode and the matrix is 96
  choices; if it times out, hoist a single `resolveThemeChoice` call in the test
  helper (not in the package) and record the measurement; do not raise
  `testTimeout`.

## 5. Test plan

`theme-choice-params.test.ts`:

1. `"writes the density a choice omits"` — darwin → compact, identity →
   comfortable, aero → the recipe's preset, and the darwin link edited to
   `win32` keeps compact. **Fails before the fix** (first expectation: the
   writer emits only `platform`).
2. The rewritten omission case — the three global fallbacks are omitted and the
   density entry is present.
3. The canonical case stays green: `encode(decode(encode(choice)))` is stable
   for every shipped axis at the default contrast.

Two-direction proof:

1. Run case 1 on the current tree → fails with the missing density entry;
   apply §2.1 → passes.
2. Revert the encoder line locally → case 1 fails again; restore it.
3. Run the docs guard against the pre-fix paragraph → fails; after §2.4 → passes.

Record the pre-fix failure and the restored run in the commit body.

## 6. Acceptance

- [ ] `themeChoiceParams` always emits a `density` entry, the preset the choice
      resolves to; no other key changes order or presence.
- [ ] The JSDoc, catalogue, design system, README and COMPONENTS row state the
      implemented rule; the docs guard pins it.
- [ ] The executed example exports the canonical link and the suite asserts it.
- [ ] The new case fails without §2.1 and passes with it.
- [ ] `nub run check`, `nub run lint`, `nub run test` green.
- [ ] No token value, pair, floor, role, metric, platform style, recipe or
      shipped theme moves; `contrastPairs` stays 470.

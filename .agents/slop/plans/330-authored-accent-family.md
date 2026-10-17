# 330 — The authored platform example moves an accent family it does not finish

**Phase:** F (truth pass) · **Workstream:** `tokens-theme` · **Depends on:** 063
(platform styles), 327 (accent states), 310 (copy-and-own example contract)

## The defect

`contosoPlatformStyle` is the package's executed "author a style from scratch"
example (`packages/tokens/src/platform-styles.example.ts`). It moves the Contoso
blue `accent` and its `accentForeground` in both modes, but inherits the identity
iris `accentHover` and `accentActive`.

That is the exact defect plan 327 fixed in every shipped theme: the toggle-on
state is a filled family, and a state that comes from another hue moves the
control *toward the lavender base* while it is hovered and pressed. The package
states the rule in three places — `packages/tokens/README.md` ("`accentForeground`,
`accentHover` and `accentActive` belong beside `accent`"), `docs/design-system.md`
§2 (same sentence) and the shipped `accent-states.example.ts` — while the executed
example contradicts it.

The contrast contract cannot catch this: the inherited iris states still clear
every floor against the Contoso fill, so `themeContrastFailures` returns `[]`
while the example ships an incoherent interaction. This is the plan 098/310 class
of defect one family over: a documented extension path that does not demonstrate
the rule it teaches.

## Exact files

Change:

- `packages/tokens/src/platform-styles.example.ts` — add the two accent state
  roles to each mode and record the measured reason.
- `packages/tokens/src/platforms.test.ts` — add the regression case that the
  whole accent family moves with the fill.
- `docs/tokens.md` — the "Authoring a platform style" section names both
  families.
- `packages/tokens/src/docs.test.ts` — hold that sentence to the example.
- `packages/tokens/README.md` — no text change is required (the rule is already
  stated); do not edit it unless a command below shows drift.
- `COMPONENTS.md` — the Platform style variants row records that the authored
  example moves both families.
- `TODO.md` — add and tick the task under the tokens block.
- `.agents/slop/plans/README.md` — index this plan.

No shipped theme, recipe, token value, pair or floor changes.

## Exact change

### 1. `platform-styles.example.ts`

In `contosoPlatformStyle.colors.light`, beside `accent`/`accentForeground`:

```ts
accentHover: "#D5E8F7",
accentActive: "#B7D4F0",
```

In `contosoPlatformStyle.colors.dark`:

```ts
accentHover: "#17497A",
accentActive: "#245F96",
```

Extend the file's JSDoc above `contosoPrimary` or above
`contosoPlatformStyle` with one sentence: a style that moves `accent` moves
`accentForeground`, `accentHover` and `accentActive` with it, because an
inherited state keeps the base hue (plan 330).

Measured with the package's own `contrastRatio` against the identity surfaces the
authored style extends (`background` / `card` / `popover` / `muted`):

| Mode | Step | Accent→hover | Hover→press | Min fill-on-surface | Min `accentForeground` | Min `border` divider |
| ---- | ---- | ------------ | ----------- | ------------------- | ---------------------- | -------------------- |
| light | `#E8F1FB` → `#D5E8F7` → `#B7D4F0` | 1.101 | 1.221 | 1.072 | 6.450 | 1.094 |
| dark | `#0C3559` → `#17497A` → `#245F96` | 1.360 | 1.388 | 1.191 | 4.836 | 1.116 |

Every figure clears the default floors the theme declares (`surface` 1.05,
`secondary` 4.5, `divider` 1.05), so `themeContrastFailures` stays `[]`.

### 2. `platforms.test.ts`

Import nothing new: `getTheme`, `modes`, `contrastRatio` and `contrastFloors`
are already in the file. Add beside the existing Contoso cases:

```ts
it("moves the whole accent family when the authored style moves the accent", () => {
  modes.forEach((mode) => {
    const authored = resolveAuthoredPlatformStyle(mode).colors;
    const base = getTheme(mode).colors;
    expect(authored.accent, mode).not.toBe(base.accent);
    (
      ["accentForeground", "accentHover", "accentActive"] as const
    ).forEach((role) => {
      expect(authored[role], `${mode} ${role}`).not.toBe(base[role]);
    });
  });
});
```

The header comment for the case states the bug it guards: the example moved
`accent` and `accentForeground` only, so hover and press fell back to the
identity iris while the fill was Contoso blue, and no contrast pair failed.

### 3. `docs/tokens.md`

In "Authoring a platform style", replace:

> It names the whole primary family — fill, foreground, hover, pressed and text —

with:

> It names the whole primary family — fill, foreground, hover, pressed and text —
> and the whole accent family — fill, foreground, hover and pressed —

so the sentence reads through the existing clause ("and is compiled, applied and
held to `themeContrastFailures` …").

### 4. `docs.test.ts`

Add one case to the platform/example group:

```ts
it("states that the authored style moves both filled families", () => {
  expect(markdown).toContain(
    "and the whole accent family — fill, foreground, hover and pressed —",
  );
});
```

### 5. `COMPONENTS.md`

In the Platform style variants row, after the sentence about the copy-and-own
examples, add: "The authored example moves the whole accent family as well as
the primary one (plan 330), so a copied file cannot inherit another hue's hover
and press." Keep the row's existing numeric claims unchanged.

### 6. `TODO.md` and the plan index

Tick a new row under "Design tokens and theming":

`[x]` Hold the authored platform example to the whole-family rule — it moved
`accent` and `accentForeground` but inherited the identity iris
`accentHover`/`accentActive`, so the documented Contoso toggle turned lavender
while hovered and pressed while every contrast pair stayed green; both states now
belong to the Contoso blue family, and a regression case holds each moved role
to the base (plan 330)

Add the index row to `.agents/slop/plans/README.md` with status `done`.

## Commands and expected results

1. Before the source fix, with the new test only:
   `nub run --filter @gpuixui/tokens test -- src/platforms.test.ts`
   Expected: the new case fails on `accentHover` (authored equals the identity
   iris value). Record the failure output in the commit body.
2. After the source fix:
   `nub run --filter @gpuixui/tokens test`
   Expected: 54 files pass; the new case is green and `themeContrastFailures`
   stays empty for both examples.
3. `nub run --filter @gpuixui/tokens check-types`
   Expected: `Done`.
4. `nub run check`
   Expected: test-lint, lint, format and type-check clean.
5. `nub run test`
   Expected: the workspace suite passes.

## Test plan

- The regression case is the new `platforms.test.ts` case. It fails without the
  source change because `accentHover`/`accentActive` still equal
  `getTheme(mode).colors`; it passes with the two values added.
- Prove both directions manually: comment out the four added values, run command
  1, see the failure, restore them, run again. Do not commit the reverted state.
- The existing `themeContrastFailures` assertions on both Contoso examples are
  the second direction: a value that fixes the hue but misses a floor turns the
  suite red.

## STOP conditions

- Stop if any new value makes `themeContrastFailures` non-empty; do not loosen a
  pair, floor or pair class to make the example pass.
- Stop if the authored style's `accent` no longer differs from the identity
  base — that would make the regression case meaningless.
- Stop if a command fails for a reason outside this plan's files (a dependency,
  a workspace script, a missing tool); report the exact output instead of
  editing another workstream's path.

## Acceptance

- `contosoPlatformStyle` names `accentForeground`, `accentHover` and
  `accentActive` in both modes.
- The new case fails on the pre-fix source and passes after it.
- `themeContrastFailures` is `[]` for both Contoso examples in both modes.
- Every gate above is green and no token value, pair or floor changes.

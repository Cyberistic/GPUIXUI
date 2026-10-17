# 331 — The authored style leaves text selection on the identity iris

**Phase:** F (truth pass) · **Workstream:** `tokens-theme` · **Depends on:** 063
(platform styles), 069 (selection role), 330 (authored accent family)

## The defect

`contosoPlatformStyle` is the package's executed "author a style from scratch"
example (`packages/tokens/src/platform-styles.example.ts`). After plan 330 it
moves the whole Contoso blue family — `primary`, `accent`, their foregrounds,
hovers and presses, `selected` and `selectedForeground` — but it still inherits
the identity iris `selection` wash (`#7567F23D` light, `#A7A9FF33` dark).

Every shipped style ties its drag-selection wash to its own accent:
`macos` `#0071E333` / `#0A84FF33`, `linux` `#1C71D833`, `win32` `#0067C033` /
`#0067C066`, `xp` `#5B8DE647`, `aero` `#1565C03D`. The authored example is the
only resolved theme in the package whose selection lives in a different hue from
its accent. A consumer who copies it gets a blue application where selecting text
flashes lavender.

The contrast contract cannot catch this: the identity wash clears every
selection, secondary-selection and wash-perceivability pair on the identity
surfaces, so `themeContrastFailures` returns `[]` while the example ships the
wrong hue. This is plan 330 one role over.

## Exact files

Change:

- `packages/tokens/src/platform-styles.example.ts` — set `selection` in each
  mode and record the reason.
- `packages/tokens/src/platforms.test.ts` — add the regression case.
- `docs/tokens.md` — the "Authoring a platform style" section states the wash
  follows the accent.
- `packages/tokens/src/docs.test.ts` — hold that sentence.
- `packages/tokens/README.md` — the family rule names `selection`.
- `COMPONENTS.md` — the Platform style variants row records the wash.
- `TODO.md` — add and tick the task under the tokens block.
- `.agents/slop/plans/README.md` — index this plan.

No shipped theme, recipe, token value, pair or floor changes.

## Exact change

### 1. `platform-styles.example.ts`

In `contosoPlatformStyle.colors.light`, beside the accent family:

```ts
selection: "#0F6CBD3D",
```

In `colors.dark`:

```ts
selection: "#5CB8FF33",
```

Both are the Contoso primary at the alpha the identity already uses for that
mode (24% light, 20% dark). Measured with the package's own checker over the
authored theme, `themeContrastFailures` stays `[]` in both modes — the wash
keeps body, secondary, status and inactive text readable on all nine selection
surfaces and stays perceivable on each.

Extend the example's JSDoc: the selection wash follows the accent, because the
identity wash is an iris tint and a copied style would otherwise select text in
another hue (plan 331).

### 2. `platforms.test.ts`

Add beside the plan 330 accent case:

```ts
it("moves the selection wash when the authored style moves the accent", () => {
  modes.forEach((mode) => {
    const authored = resolveAuthoredPlatformStyle(mode).colors;
    const base = getTheme(mode).colors;
    expect(authored.accent, mode).not.toBe(base.accent);
    expect(authored.selection, mode).not.toBe(base.selection);
  });
});
```

The case header states the bug: the example moved the accent and selected
surfaces but kept the identity's iris drag wash, and no contrast pair failed.

### 3. `docs/tokens.md`

In "Authoring a platform style", after the accent-family sentence, add:

> The drag-selection wash follows the accent too: `selection` is the accent at
> the identity's alpha for the mode, because a copied style that keeps the
> identity wash selects text in another hue.

### 4. `docs.test.ts`

Extend the "authored platform style" describe with:

```ts
it("states that the selection wash follows the accent", () => {
  expect(markdown).toContain(
    "The drag-selection wash follows the accent too: `selection` is the accent at",
  );
});
```

### 5. `packages/tokens/README.md`

In the "Extending a theme" family-rule paragraph, extend the accent clause:

> … `accentForeground`, `accentHover` and `accentActive` belong beside `accent`,
> and `selection` is the accent's translucent wash.

### 6. `COMPONENTS.md`

In the Platform style variants row, extend the plan 330 sentence: "… so a copied
file cannot inherit another hue's hover, press or selection wash."

### 7. `TODO.md` and the plan index

Tick a new row under "Design tokens and theming":

`[x]` Make the authored example's selection wash follow its accent — every
shipped style ties `selection` to its accent, but `contosoPlatformStyle` kept the
identity iris wash while moving the rest of the family to Contoso blue, so a
copied theme selected text in the wrong hue while `themeContrastFailures`
returned `[]`; the wash is now the Contoso primary at the identity's alpha and a
regression case holds it away from the base (plan 331)

Add the index row to `.agents/slop/plans/README.md` with status `done`.

## Commands and expected results

1. With the new test only, before the source change:
   `nub run --filter @gpuixui/tokens test -- src/platforms.test.ts`
   Expected: the new case fails with `light selection: expected '#7567F23D' not
   to be '#7567F23D'`. Record it in the commit body.
2. After the source change:
   `nub run --filter @gpuixui/tokens test`
   Expected: 54 files pass, and `themeContrastFailures` stays empty for both
   Contoso examples.
3. `nub run --filter @gpuixui/tokens check-types`
   Expected: `Done`.
4. `nub run check`
   Expected: test-lint, lint, format and type-check clean.
5. `nub run test`
   Expected: the workspace suite passes.

## Test plan

- The new case fails on the pre-fix source because `selection` still equals
  `getTheme(mode).colors.selection`; it passes with the two values added.
- Prove both directions: run command 1 before the source edit, then after it.
  Do not commit the pre-fix state.
- The existing `themeContrastFailures` assertions on both Contoso examples are
  the second guard: a wash that fixes the hue but erases selected text turns the
  suite red.

## STOP conditions

- Stop if either wash makes `themeContrastFailures` non-empty; adjust the alpha
  within the identity's range (20–25%) or stop and report. Do not weaken a pair,
  floor or class.
- Stop if the authored `selection` no longer differs from the identity base —
  the regression case would be meaningless.
- Stop if a command fails for a reason outside this plan's files; report the
  exact output instead of editing another workstream's path.

## Acceptance

- `contosoPlatformStyle` names `selection` in both modes.
- The new case fails on the pre-fix source and passes after it.
- `themeContrastFailures` is `[]` for both Contoso examples in both modes.
- Every gate above is green and no token value, pair or floor changes.

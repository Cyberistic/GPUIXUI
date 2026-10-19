# 591 — The native diff row tint

**Phase:** F (contract completeness)
**Depends on:** 332 (a fill as a mark), 574 (the syntax palette on every
document surface), 582 (the find highlight on the painted code surface), 583
(the document fades), 588 (the chrome washes), 589 (the code block's frame),
590 (inline code on its accent wash)
**Owner:** `tokens-theme`
**Paths:** `packages/tokens/src/native-text-check.ts`,
`packages/tokens/src/native-text-check.test.ts`,
`packages/tokens/src/platform-styles/{macos,windows}.ts`,
`packages/tokens/src/platform-styles/recipes/{xp,aero}.ts`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`,
`.agents/slop/plans/README.md`

## Why

The pinned runtime paints every line of a native `<diff>` on its pane tone, and a
changed line adds a **5.5% tint of its status role** behind the whole row:

- `references/gpuix/packages/native/src/custom_elements/diff.rs:742-745` sets
  `add_bg.a = 0.055` from `theme.diff_add` and `del_bg.a = 0.055` from
  `theme.diff_del`;
- `:830-832` paints it as the row background;
- the gutter, marker and body are children of that row (`:857-901`), so the tint
  is their surface;
- the syntax runs are painted from `theme.syntax.color(span.kind)` at full alpha
  (`:789-792`), not from the 92% body fade.

`nativeTextTheme` maps `diffAdd` to `successText` and `diffDel` to
`destructiveText` (`nativeTextRoles`). The contract composites:

- `nativeTextOverFades`: only the base `text` role over the tint, plus the
  blockquote body over the accent wash;
- `nativeTextFades`: the gutter, marker and bar fades on the **plain** tone;
- the syntax palette on the plain tone (`nativeSyntaxPairs`) and through the
  3.5% code-body ink (`themeNativeTextFailures`).

Nothing measures a syntax capture or the row's own chrome **on the row tint**.
Five shipped pairs miss the body floor there while every check returns `[]`:

| Set | Role (syntax capture) | Row tint | Ratio | Floor |
| --- | --------------------- | -------- | ----- | ----- |
| Light · macOS | `warningText` (`stringSpecial`, `escape`, `number`, `boolean`, `constant`, `variableSpecial`, `attribute`) | `successText` 5.5% | **6.950:1** | 7 |
| Light · macOS | `warningText` | `destructiveText` 5.5% | **6.963:1** | 7 |
| Light · Windows | `warningText` | `successText` 5.5% | **6.990:1** | 7 |
| Light · Windows | `warningText` | `destructiveText` 5.5% | **6.958:1** | 7 |
| Light · Windows XP | `successText` (`string`) | `destructiveText` 5.5% | **6.989:1** | 7 |

The audit also covered the row's own chrome, which passes today and is therefore
a guard rather than a colour move: `textFaint` at 80% (the ordinary gutter
number), `diffAdd`/`diffDel` at 90% (the changed line's number and marker) and
`diffAdd`/`diffDel` at 55% (the 3px accent bar) on their own row tint. None may
be erased by an edited theme just because the tint is subtle in the shipped
palette.

The fix is designed, not literal: the failing inks take one step in the family
they already belong to.

## What to change

### 1. `packages/tokens/src/native-text-check.ts`

Add a public descriptor beside `NativeTextOverFade`:

```ts
/**
 * A syntax role painted on one of the runtime's row tints. The tint is a role
 * at a fixed fraction, so the palette is measured on it rather than on the
 * document tone alone.
 */
export interface NativeSyntaxTint {
  /** The `NativeTextTheme` field whose role is the row tint. */
  readonly wash: keyof typeof nativeTextRoles;
  /** The fraction of the role painted, `0…1`. */
  readonly opacity: number;
}

/**
 * The two row tints a native diff paints under every line of a changed hunk —
 * `diffAdd` (`successText`) at 5.5% and `diffDel` (`destructiveText`) at 5.5%.
 * The runtime paints the gutter, marker and body over them, and a syntax run at
 * full alpha. Five shipped sets measured a syntax capture below the body floor
 * on these tints before their inks took one designed step.
 */
export const nativeSyntaxTints: readonly NativeSyntaxTint[] = [
  { wash: "diffAdd", opacity: 0.055 },
  { wash: "diffDel", opacity: 0.055 },
];
```

Extend `nativeTextOverFades` with the six row paints (the first two are the
existing `text` entries and stay):

```ts
{ field: "textFaint", opacity: 0.8, wash: "diffAdd", washOpacity: 0.055, pairClass: "surface" },
{ field: "textFaint", opacity: 0.8, wash: "diffDel", washOpacity: 0.055, pairClass: "surface" },
{ field: "diffAdd", opacity: 0.9, wash: "diffAdd", washOpacity: 0.055, pairClass: "secondary" },
{ field: "diffDel", opacity: 0.9, wash: "diffDel", washOpacity: 0.055, pairClass: "secondary" },
{ field: "diffAdd", opacity: 0.55, wash: "diffAdd", washOpacity: 0.055, pairClass: "surface" },
{ field: "diffDel", opacity: 0.55, wash: "diffDel", washOpacity: 0.055, pairClass: "surface" },
```

Keep the existing `text` over-fade entries. Update the `nativeTextOverFades`
JSDoc to say the six additions are the changed row's gutter, number/marker and
accent bar on the row tint.

In `themeNativeTextFailures`, after `overFadeFailures`:

```ts
const syntaxTintFailures = nativeSyntaxTints.flatMap((tint) => {
  const washRole = nativeTextRoles[tint.wash];
  return [...new Set(Object.values(nativeSyntaxRoles))].flatMap((role) =>
    nativeTextSurfaces.flatMap((surface) => {
      const tinted = compositeOver(
        alpha(theme.colors[washRole], tint.opacity),
        theme.colors[surface],
      );
      const ratio = contrastRatio(theme.colors[role], tinted);
      return ratio >= floors.body
        ? []
        : [{
            role,
            surface,
            opacity: 1,
            wash: washRole,
            washOpacity: tint.opacity,
            pairClass: "body" as const,
            floor: floors.body,
            ratio,
          }];
    }),
  );
});
```

Return it between `overFadeFailures` and `inlineFailures`. The existing
`NativeTextFailure` shape already carries `wash` and `washOpacity`, so no type
change is needed there. Update the `themeNativeTextFailures` JSDoc to name
`nativeSyntaxTints` and the five-set regression, and the `nativeTextOverFades`
comment to say the row tint is the surface for the changed line's chrome.

### 2. Palette steps (one designed step in each failing family)

- `packages/tokens/src/platform-styles/macos.ts` (light half, beside
  `infoText`): add `warningText: "#4B3100"` — `palette.amber[900]`, the step XP
  and Aero already ship. The untouched identity ink was `palette.amber[800]`
  `#6B4500`.
- `packages/tokens/src/platform-styles/windows.ts` (light half): add
  `warningText: "#4B3100"`.
- `packages/tokens/src/platform-styles/recipes/xp.ts` (light half):
  `successText: "#0E5135"` → `"#0A3A26"` (`palette.green[900]`).
- `packages/tokens/src/platform-styles/recipes/aero.ts` (light half): the same
  `successText` step, so the invariant that Aero names the XP recipe's status
  inks (`native-highlight-code-surface.test.ts`) still holds.

After these four edits the tinted walk's tightest pair is **7.008:1**
(`Light`, `primaryText` on the `destructiveText` tint, identity). That is a pass
with a small margin; do not move the identity brand ink or `destructiveText` to
widen it — both are measured by many other contracts and neither is under a
floor.

### 3. `packages/tokens/src/native-diff-row-tint.test.ts` (new)

State the bug in the header: the runtime paints a changed diff line on a 5.5%
status tint and the contract measured only the plain tone, so five shipped pairs
were under the body floor while every check returned `[]`.

Cases:

1. **The five pre-fix pairs.** Rebuild the old palettes with `extendTheme`:
   macOS/Windows light `warningText: "#6B4500"`, XP/Aero light
   `successText: "#0E5135"`. Assert `themeNativeTextFailures` reports exactly
   those five, with the roles, surfaces, washes, `washOpacity: 0.055` and ratios
   from the table (use `toBeCloseTo(…, 3)`), and that every other check on the
   same theme (`themeFailures` filtered to `kind !== "nativeText"`) is `[]`.
2. **Every shipped set passes.** `shippedThemes.flatMap(({ theme }) =>
   themeFailures(theme))` is `[]`.
3. **The row chrome can fail.** Plant `textFaint` equal to
   `compositeOver(alpha(theme.colors.successText, 0.055),
   theme.colors.background)` on identity light and assert a failure with
   `field: "textFaint"`, `opacity: 0.8`, `wash: "successText"`,
   `washOpacity: 0.055`, `pairClass: "surface"`. This proves the six new
   over-fade entries are live, not decorative.
4. **Both tints on every surface.** Plant a syntax role equal to the tint
   (`successText` on identity light) and assert one failure per native surface
   for each of `diffAdd`/`diffDel` (eight), so a future edit cannot quietly drop
   a surface or a tint.
5. **The quoted tightest figure.** Derive the minimum tinted syntax ratio over
   `shippedThemes` and every surface/tint; assert `docs/tokens.md` contains the
   `toFixed(3)` figure and the theme label the sentence names.

Also add `nativeSyntaxTints` and `NativeSyntaxTint` to the names case in
`packages/tokens/src/native-text-check.test.ts`.

### 4. `docs/tokens.md`

- In the native-text fade paragraph (the one starting “The runtime also paints
  through fades a theme cannot change”), add: a changed diff line paints every
  child — gutter, marker, accent bar and syntax run — on the 5.5% row tint, so
  `nativeTextOverFades` includes the row's chrome and `nativeSyntaxTints` holds
  the palette on the tint, both on every `nativeTextSurfaces` tone.
- Add one paragraph after it with the five pre-fix figures, the four ink steps
  and the derived tightest **7.008:1** (`Light`, `primaryText` on the
  `destructiveText` tint). Say why the identity ink was not moved (it is the
  brand link and the light ring, and the pair passes).
- Update the “light platform styles own the steps” sentence: macOS and Windows
  now name `warningText` `#4B3100`; XP and Aero name `successText` `#0A3A26`
  (and keep their other named inks).
- Add `NativeSyntaxTint` to the alphabetical `## Types` index.

### 5. `docs/design-system.md` §10

In the native-text paragraph, say the diff row tint is the surface for a changed
line's gutter, marker, bar and syntax runs, that `nativeSyntaxTints` and the
extended `nativeTextOverFades` hold them, and that four light status inks took
one step.

### 6. `packages/tokens/README.md`

Add `nativeSyntaxTints` and the row-tint composition beside `nativeTextFades`,
`nativeTextOverFades` and `nativeTextWashes` in the native-text paragraph.

### 7. `COMPONENTS.md` and `TODO.md`

Append the plan-591 sentence to the **Total theme check** row. Add one ticked
TODO row with the five figures and four steps, and keep the progress bar
current.

### 8. `.agents/slop/plans/README.md`

Add plan 591 after 590 with status `done` and the one-line description, plus a
short narrative paragraph after plan 590's.

## Commands and expected results

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `nub run --filter @gpuixui/tokens test -- --run src/native-diff-row-tint.test.ts`
   → green.
3. `nub run --filter @gpuixui/tokens test` → green. Update any
   `native-text`, `native-text-check`, `platform-claims`, `figures`, `docs` or
   `snippets` case that quotes an affected value by deriving it from the
   implementation — never by retyping a ratio.
4. `nub run check`, `nub run lint`, `nub run test` → exit 0.

Both directions: with the `nativeSyntaxTints` arm removed, case 1 finds no
tinted failure; with the palette steps reverted, every shipped set fails the new
check; with both restored, every shipped set returns `[]`.

## STOP conditions

- A shipped set still fails a tinted pair after the four steps (re-measure; do
  not lower the floor).
- Any other check fails for the four planted themes (they were probed clean; if
  a step changes that, the value is wrong).
- A docs guard needs a figure that cannot be derived from `shippedThemes`,
  `nativeTextSurfaces` and `nativeSyntaxTints`.
- Moving an ink breaks a quoted present-tense figure outside this plan's reach;
  update the derived sentence and its guard together, or stop and report.

## Acceptance

- `nativeSyntaxTints` publishes both row tints and `themeNativeTextFailures`
  holds every syntax role on them at the body floor on every native surface.
- `nativeTextOverFades` holds the changed row's gutter, number/marker and accent
  bar on the tint.
- The five shipped pairs pass after three inks move one designed step; every
  other shipped set and every other check still returns `[]`.
- The reference, design system, README and ledger name the composition, the
  steps and the current tightest figure.
- `nub run check`, `nub run lint`, `nub run test` pass.

## Outcome

Landed on `agent/tokens-theme`. `nativeSyntaxTints` publishes the two row tints
and `themeNativeTextFailures` holds every syntax role on both, on all four
document tones; six extended `nativeTextOverFades` entries hold the changed
row's gutter, number/marker and accent bar. The regression reproduces the five
pre-fix pairs (6.950–6.990:1) while every other check returns `[]`, and a
planted `textFaint` proves the row-chrome entries can fail. Four inks take one
designed step — macOS/Windows light `warningText` `#4B3100`, XP/Aero light
`successText` `#0A3A26` — and the tightest tinted pair is **7.008:1** (`Light`,
`primaryText` on the `destructiveText` tint). The opaque syntax tightest moves to
7.706:1 (`Light`, `primaryText`) and the ink-wash tightest to 7.110:1
(`Light · macOS`, `successText`), because macOS warning ink darkened; the
selection-wash status tightest moves to 4.891:1 (`Linux light`, `infoText` on
`active`). The suite grows by five cases (5,808 tests). Both directions were
verified: removing the tint arm fails the regression, and reverting the four inks
fails the shipped-set case. `nub run check`, `nub run lint` and `nub run test`
pass. No role, plain pair, floor or metric is added.

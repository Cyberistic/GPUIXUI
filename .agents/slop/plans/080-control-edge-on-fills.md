# 080 — The control edge on the fills it paints

| Field | Value |
| ----- | ----- |
| Phase | F (design-system truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `014` (status tones), `063` (platform styles), `071`–`079` (the contrast contract) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`border` is the role every bordered control paints:

- `packages/components/src/internal/button.tsx` — the secondary Button sets
  `backgroundColor: secondary`, `borderColor: border`, then hovers to `hover` and
  presses to `active` without changing the border;
- `packages/primitives/src/core/variants.ts` — the `outline` Button and the
  `toggle` outline variant are `border: border` plus `hover` / `active` washes;
- the same file's `toggleVariants.outline.pressed` keeps `border: border` while
  the fill becomes `accent`.

So the edge is painted on **four fills**: `secondary` (rest), `hover` (pointer),
`active` (press) and `accent` (a pressed outline toggle). The contract never
measured that pair — it measured `border` only on `background`, `card` and
`popover`. The design system states that `border` "is intentionally subtle, but
held to a 1.05:1 perceivability floor … so subtle never means invisible"
(`docs/design-system.md` §7). That claim is false today: in four shipped colour
sets the divider and the fill are the **same value**, so an outlined control's
edge vanishes exactly while it is pressed or hovered.

| Variant | Pair | Before | Floor |
| ------- | ---- | ------ | ----- |
| light (`border` `#E1E5EC`) | `border` on `active` (`#E1E5EC`) | **1.00:1** | 1.05:1 |
| dark (`border` `#2A303B`) | `border` on `secondary` (`#2A303B`) | **1.00:1** | 1.05:1 |
| dark | `border` on `active` (`#2A303B`) | **1.00:1** | 1.05:1 |
| dark | `border` on `accent` (`#2E2370`) | **1.00:1** | 1.05:1 |
| macOS dark (`border` `#3A3A3C`) | `border` on `hover` (`#3A3A3C`) | **1.00:1** | 1.05:1 |
| macOS dark | `border` on `secondary` (`#3A3A3C`) | **1.00:1** | 1.05:1 |
| macOS dark | `border` on `accent` (`#1C3A57`) | **1.03:1** | 1.05:1 |
| high-contrast dark (`border` `#7A7A7A`) | `border` on `active` (`#3D3D3D`) | **2.53:1** | 3:1 |

Every other shipped set already passes the four pairs (Linux and Windows light
and dark, macOS light, both high-contrast light), which is why the suite stayed
green: the pairs were absent, not safe. This is the same class plan `076` fixed
for the soft status tints, `078` for the skeleton and `079` for secondary text.

## 2. Design decisions (do not re-litigate)

1. **The four fills join the `divider` class.** `border` on a fill is the same
   decorative edge already expressed by `ContrastPairClass.divider`; no new
   class, no new export.
2. **Move `border`, not the state fills.** In light, `active` (`#E1E5EC`) is
   exactly `border`; in dark, `secondary`/`active` (`#2A303B`) are exactly
   `border`. Darkening the light `active` would also pull the focus ring on that
   wash toward its 3:1 boundary (`#7567F2` measures 3.34:1 now and would fall to
   3.01 at `#D6DAE1`), and turning the dark `accent` a lighter violet would
   restyle every selectable row's hover wash. The edge is what must stay
   visible, so `border` moves one half-step off the fill ladder and changes
   nothing a control paints at rest except the divider itself.
3. **Values, with margins, not bare floors.**

   | Role | Before | After | Worst fill |
   | ---- | ------ | ----- | ---------- |
   | light `border` | `#E1E5EC` | `#D6DAE1` | 1.11:1 on `active` |
   | dark `border` | `#2A303B` | `#343B47` | 1.17:1 on `accent` |
   | macOS dark `border` | `#3A3A3C` | `#48484A` | 1.13:1 on `active` |
   | high-contrast dark `border` | `#7A7A7A` | `#8A8A8A` | 3.15:1 on `active` |

   Light `#D6DAE1` and dark `#343B47` are half-steps between the ramp values
   `neutral[200]`/`neutral[300]` and `neutral[800]`/`neutral[700]`. They stay
   inline like the existing `borderStrong` and `placeholder` values; the palette
   is a public ramp and does not need a step for one role.
4. **Existing pairs must not regress.** The same value is measured on
   `background`, `card` and `popover`, where a stronger edge only helps:
   light 1.20–1.30, dark 1.33–1.64, macOS dark 1.53–1.87, AA dark 5.34–6.08. No
   other role moves, so no text or boundary pair changes.
5. **One description.** The pairs stay in `contrastPairs`; the suites keep
   iterating them, and the documents are built from the implementation.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/080-control-edge-on-fills.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | generated `controlFillPairs` block; JSDoc |
| `packages/tokens/src/color.ts` | four `border` values |
| `packages/tokens/src/contrast.test.ts` | header, pair count, divider expectation |
| `packages/tokens/src/control-edge.test.ts` | **new** — the regression test |
| `packages/tokens/src/color.test.ts` | header comment only (the generic loop guards it) |
| `packages/tokens/src/platforms.test.ts` | header comment only (the generic loop guards it) |
| `packages/tokens/src/docs.test.ts` | the §9 divider row must name the fills |
| `docs/tokens.md` | the three `border` rows, the checking and verification prose |
| `docs/design-system.md` | §7 border bullet, §8 note, §9 floor row |
| `packages/tokens/README.md` | the checking paragraph |
| `COMPONENTS.md` | the *Theme contrast check* and *Design tokens* rows |
| `TODO.md` | one ticked row and the section progress bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's paths.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Add one generated block beside `secondaryTextPairs`:

```ts
/**
 * The fills a bordered control paints behind its own edge: a secondary control's
 * resting fill, the hover and pressed washes an outline control uses, and the
 * accent fill a pressed outline toggle takes. `border` is painted on all four,
 * so the divider floor applies to each.
 */
const controlFillRoles = ["secondary", "hover", "active", "accent"] as const;

const controlFillPairs: readonly ContrastPair[] = controlFillRoles.map(
  (background): ContrastPair => ["border", background, "divider"],
);
```

Spread `...controlFillPairs` in `contrastPairs` after the divider pairs. Extend
the JSDoc of `contrastPairs` and `themeContrastFailures`: "including the fills a
bordered control paints (`secondary`, `hover`, `active`, `accent`)". Keep the
exported array a literal; only the generated blocks are derived.

### 4.2 `packages/tokens/src/color.ts`

- `lightColors.border`: `palette.neutral[200]` → `"#D6DAE1"`.
- `darkColors.border`: `palette.neutral[800]` → `"#343B47"`.
- `highContrastDarkColors.border`: `"#7A7A7A"` → `"#8A8A8A"`.
- Add one JSDoc sentence to each changed set: the divider is a half-step off the
  fill ladder so a bordered control's edge stays visible on the fill it paints
  (plan 080).

### 4.3 `packages/tokens/src/platform-styles/macos.ts`

`colors.dark.border`: `"#3A3A3C"` → `"#48484A"`. Add one sentence to the file's
JSDoc: the dark divider is Apple's separator grey so it clears the floor on the
washes an outline control paints (plan 080).

### 4.4 `packages/tokens/src/contrast.test.ts`

- Header: add the plan 080 paragraph (the divide between `border` and the fill
  it sits on).
- `covers every documented pair`: `70` → `74`.
- `reports an invisible divider at the level it declares`: a white border now
  also fails on the four control fills. Expect the backgrounds
  `["background", "card", "popover", "secondary", "hover", "active", "accent"]`
  (the order the pairs are listed), all `divider` at floor `3` with ratio `1`.

### 4.5 `packages/tokens/src/control-edge.test.ts` (new)

Header comment: the bug guarded — the four fills a bordered control paints, and
the four sets where `border` equalled the fill (1.00:1), so an outlined control
lost its edge while pressed.

Tests:

1. `documents one pair per control fill` — filter `contrastPairs` for
   `foreground === "border"` and assert the backgrounds are exactly
   `secondary`, `hover`, `active`, `accent` (one each).
2. `clears the declared divider floor on every shipped theme` — iterate
   `lightTheme`, `darkTheme`, both high-contrast themes and the six real
   platform variants; measure each pair at `contrastFloors[theme.contrast].divider`.
3. `keeps an outlined control's edge visible on every fill it paints` — the
   named regression: for the identity light/dark, macOS dark and high-contrast
   dark themes, assert `contrastRatio(border, fill) >= floor` for all four fills
   and that `border` is a different hex from each fill (the root cause: the
   divider and the fill were the same value).
4. `names the fill when a theme regresses` — extend `darkTheme` with the old
   `border: "#2A303B"` and assert `themeContrastFailures` returns exactly the
   `secondary`, `active` and `accent` divider failures at floor `1.05` (`hover`
   passed at that value, so it must not be reported).

### 4.6 `packages/tokens/src/color.test.ts` and `platforms.test.ts`

Header comments only: the generic `contrastPairs` loops now hold the control
fills, so no bespoke block is added.

### 4.7 `packages/tokens/src/docs.test.ts`

The §9 floor row becomes:

```
| decorative dividers (`border`) on `background`/`card`/`popover` and the `secondary`/`hover`/`active`/`accent` fills a bordered control paints | 1.05:1 | 3:1 |
```

built from `contrastFloors` as the neighbouring rows are.

### 4.8 `docs/tokens.md`

- The colour table rows: light `border` `#D6DAE1`, dark `border` `#343B47`, HC
  dark `border` `#8A8A8A`.
- *Checking a theme*: the divider sentence names the four fills.
- *Verification*: the divider sentence names the four fills and records the
  defect (four sets measured 1.00:1 before the fix).
- Keep the existing sentence about status text and `borderStrong` on `popover`.

### 4.9 `docs/design-system.md`

- §7 `border` bullet: the floor covers the fills a bordered control paints
  (`secondary`, `hover`, `active`, `accent`), because the edge is painted there
  too.
- §8: a pointer state never changes the fill to the divider's own value.
- §9 table: the divider row names the four fills.

### 4.10 `packages/tokens/README.md`

The *Checking a theme* paragraph: the `border` sentence names the four fills, so
an outlined control keeps its edge while hovered, pressed or toggled on.

### 4.11 `COMPONENTS.md`

- *Theme contrast check*: `70` → `74` pairs; the four control fills and the
  defect (four sets at 1.00:1, macOS dark 1.00–1.03, AA dark 2.53).
- *Design tokens*: the divider floor is stated on the fills a bordered control
  paints.

### 4.12 `TODO.md`

Add a ticked row under the tokens/theme section:

`[x] Hold the control edge to the perceivability floor on the fills it paints —
the identity pressed wash and the dark secondary/accent fills were the same
value as `border` (plan 080)`

and move the bar `47/63` → `48/64`.

## 5. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/tokens test` | all suites green, including the new `control-edge.test.ts` |
| `nub run --filter @gpuixui/tokens check-types` | clean |
| `nub run check` | clean |
| `nub run lint` | clean |
| `nub run test` | every workspace green |

**Two-direction proof** (required before committing):

1. Revert `darkColors.border` to `"#2A303B"`, run the tokens suite: it must fail
   for `secondary`, `active` and `accent` (three generic loop tests, the new
   contract loop and `control-edge.test.ts`), with the ratio at `1`.
2. Revert `lightColors.border` to `palette.neutral[200]`: it must fail on
   `active` at `1.0`.
3. Revert the macOS dark border to `"#3A3A3C"`: it must fail on `hover` and
   `secondary` at `1.0` and `accent` at `1.03`.
4. Revert the AA dark border to `"#7A7A7A"`: it must fail on `active` at `2.53`
   against the `3` floor.
5. Restore every value: the suite must be green.

Record the exact failure text in §8.

## 6. STOP conditions

Stop and report with evidence if:

- **Any shipped set still fails a control-fill pair after the value changes.**
  The measured values are in §2.3; a different failure means a different set
  moved. Do not lower the floor.
- **A text or boundary pair regresses** because `border` also sits on
  `background`/`card`/`popover`; the new values only raise those ratios, so a
  regression means a value was transcribed wrong.
- **A documented pair count the page cannot regenerate breaks.** Add the derived
  figure to the doc guard rather than retyping it.
- **A change outside the owned paths is required.** Record it in `TODO.md` and do
  not edit it.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `control-edge` #1 | unit | the contract silently dropping a fill (a role rename or a removed pair) |
| `control-edge` #2 | unit | a shipped theme (identity, high contrast or platform) losing the edge on a fill |
| `control-edge` #3 | unit | the exact regression: `border` equal to the fill it is painted on |
| `control-edge` #4 | unit | the public checker not reporting the fill pair |
| `contrast.test.ts` pair count | unit | the contract shrinking or growing without a deliberate edit |
| `contrast.test.ts` divider expectation | unit | an invisible divider no longer being reported on every surface it is painted on |
| `color.test.ts` / `platforms.test.ts` generic loops | unit | any shipped colour set failing a documented pair |

## 8. Outcome (executed on this host, 2026-10-17)

- `contrastPairs` now holds **74** pairs: 70 + the four control fills.
- Values: light `border` `#D6DAE1`, dark `border` `#343B47`, macOS dark
  `border` `#48484A`, high-contrast dark `border` `#8A8A8A`. Measured on the
  four fills (`secondary`, `hover`, `active`, `accent`):
  - light: 1.222 / 1.222 / 1.110 / 1.223
  - dark: 1.176 / 1.330 / 1.176 / 1.171
  - macOS dark: 1.244 / 1.244 / 1.134 / 1.284
  - high-contrast dark: 3.934 / 3.934 / 3.146 / 4.876
- The same values on `background`/`card`/`popover` only strengthened: light
  1.20–1.30, dark 1.33–1.64, macOS dark 1.53–1.87, AA dark 5.34–6.08.
- No text or boundary pair moved; nothing but the four dividers changed.
- Two-direction proof (all restored to 1007 passed):
  - dark `border` back to `#2A303B` failed `dark: border on secondary/active`
    at `1` and `accent` at `1.0039` (generic loop), the new contract loop, and
    `control-edge.test.ts` (`border equals secondary`).
  - light `border` back to `neutral[200]` failed `light: border on active:
    expected 1 to be greater than or equal to 1.05` and the root-cause guard.
  - macOS dark `border` back to `#3A3A3C` failed `hover`/`secondary` at `1` and
    `accent` at `1.0325`, plus the variant contract.
  - AA dark `border` back to `#7A7A7A` failed `border on active: expected
    2.5305706508043344 to be greater than or equal to 3`.
  - Restoring all four values made every suite green.

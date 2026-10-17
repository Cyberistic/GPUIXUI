# 054 — The avatar diameter scale

**Workstream:** `tokens-theme`
**Phase:** B, closing a `components` interlock on `@gpuixui/tokens`
**Depends on:** plans 011, 016 (the implemented, source-resolvable package)
**Files owned:** `packages/tokens/**`, `docs/tokens.md`, `docs/design-system.md`,
this plan, `.agents/slop/plans/README.md` (index row only), `TODO.md` (this
workstream only), `COMPONENTS.md` (design-system section only).

Self-contained. Follow the steps in order. Plan `055` is the sibling task; the
two are independent and may land in either order.

---

## 1. Why

`workspaces/components/TODO.md` → **Interlocks** carries an open request to
`tokens-theme`:

> An avatar diameter scale (20/26/32/40) so `DIAMETER` in `avatar.tsx` can be
> deleted.

`packages/components/src/avatar.tsx` holds the literal scale today:

```ts
const DIAMETER: Readonly<Record<AvatarSize, number>> = {
  xs: 20, sm: 26, md: 32, lg: 40,
};
```

with the comment "Tokens ship no avatar scale — the control heights are wider
than a person chip wants". A scattered literal is exactly what the token layer
exists to prevent (AGENTS §4: "Tokens are the single source of colour, spacing,
typography, radius and state. No scattered literals"), and the consumer has
asked for the value with a concrete scale.

The scale belongs beside `iconSize`: both are fixed size tiers a component reads
by name, independent of density.

## 2. Decision (do not re-litigate)

- Name the interface `AvatarSize` and the const `avatarSize`, mirroring the
  existing `IconSize` / `iconSize` pair in `scale.ts`. Do **not** invent a new
  naming scheme for one scale.
- Put it on `Theme`, like every other scale (`iconSize`, `borderWidth`,
  `spacing`, `radius`). A brand can then resize avatars in the theme instead of
  overriding component source, and the "every shipped theme carries every group"
  guard keeps it honest.
- Do **not** export an `AvatarSize` label union. `ControlSize` exists because
  `Density.controlHeight` is keyed by it, and `IconSize` has no label type
  either; the consumer's public `size` prop type stays the consumer's.

## 3. Exact change

### 3.1 `packages/tokens/src/scale.ts`

After the `iconSize` block (which ends with `export const iconSize: IconSize = …`),
append:

```ts
/** Diameters for identity marks (avatars) in pixels. */
export interface AvatarSize {
  /** 20px — inline with a dense row. */
  readonly xs: number;
  /** 26px. */
  readonly sm: number;
  /** 32px — the default. */
  readonly md: number;
  /** 40px — profile headers and detail panes. */
  readonly lg: number;
}

/** Default avatar diameters. */
export const avatarSize: AvatarSize = { xs: 20, sm: 26, md: 32, lg: 40 };
```

Let `oxfmt` decide the final line breaks.

### 3.2 `packages/tokens/src/theme.ts`

Four edits, all mechanical:

1. Import `avatarSize` and `type AvatarSize` in the `./scale.js` import block
   (keep the existing alphabetical-ish order `AvatarSize` first among the types).
2. `interface Theme`: add after `iconSize`:

   ```ts
   /** Avatar diameters. */
   readonly avatarSize: AvatarSize;
   ```

3. `interface ThemeOverrides`: add after `iconSize`:

   ```ts
   /** Override individual avatar diameters. */
   readonly avatarSize?: Partial<AvatarSize>;
   ```

4. All four shipped theme objects (`lightTheme`, `darkTheme`,
   `highContrastLightTheme`, `highContrastDarkTheme`): add `avatarSize,` after
   `iconSize,`. `extendTheme` gains, after `iconSize`:

   ```ts
   avatarSize: { ...base.avatarSize, ...overrides.avatarSize },
   ```

### 3.3 `packages/tokens/src/scale.test.ts`

Add a `describe("avatar size scale")` block:

- increases strictly `xs < sm < md < lg`;
- every diameter is a positive whole number.

The first assertion is the guard: it fails if the scale is reordered or a value
collapses, which would make two avatar sizes indistinguishable.

### 3.4 `packages/tokens/src/theme.test.ts`

Extend the existing `extendTheme` describe with:

- "overrides one avatar diameter and keeps the others" — `extendTheme(lightTheme,
  { avatarSize: { lg: 44 } })` has `avatarSize.lg === 44` and
  `avatarSize.md === lightTheme.avatarSize.md`, and `lightTheme.avatarSize.lg`
  is still `40`.

The existing "gives every shipped theme the same groups" test already fails if a
theme object misses `avatarSize`; do not duplicate it.

### 3.5 `docs/tokens.md`

1. Rename the `## Borders and icons` section to `## Borders, icons and avatars`
   and add the avatar rows to its table:

   | Token | Pixels |
   | ----- | ------ |
   | `avatarSize.xs` | 20 |
   | `avatarSize.sm` | 26 |
   | `avatarSize.md` | 32 |
   | `avatarSize.lg` | 40 |

2. In the `## Theme API` code block, add `avatarSize: AvatarSize;` after
   `iconSize: IconSize;`.
3. In `## Theme API`'s merge-rules list, add avatar sizes to the "merge key by
   key" bullet (which currently names colour, spacing, radius, border width and
   icon).

### 3.6 `docs/design-system.md`

In §6 "Spacing and density", after the density paragraph, add one short
paragraph: control heights are density-dependent, but **icon and avatar sizes are
fixed tiers** (icons 12/14/16/20/24, avatars 20/26/32/40) read by name, because
a 26px person chip is not a density decision. Keep it to two sentences; see §7
for why avatars are not `controlHeight`.

### 3.7 `COMPONENTS.md` (design-system section only)

The "Design tokens" row's notes currently read "47 semantic roles, 10 type roles,
spacing/radii/density/elevation". Change the scale list to
`spacing/radii/density/elevation/icon+avatar sizes`. No new row.

### 3.8 `TODO.md` (this workstream only)

- Add and tick: `[x]` Ship the avatar diameter scale (`avatarSize`) so
  `components` can delete its local `DIAMETER` (plan 054).
- Update the section's progress bar and count from 18/26 to 19/26.
- Add to the cross-team block: `components`' interlock row *"An avatar diameter
  scale (20/26/32/40) so `DIAMETER` in `avatar.tsx` can be deleted"* is closed by
  plan 054; the consumer deletes the literal when it imports `@gpuixui/tokens`
  directly (owner: `components`).

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; one new file's tests pass
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0
```

Prove the new guards can fail, capture both outputs, restore, and record them in
the commit body:

1. Reorder `avatarSize` so `sm` is 20, run the package tests, capture the
   ordering failure.
2. Remove `avatarSize` from `darkTheme`, run the package tests, capture the
   theme-completeness failure.

## 5. STOP conditions

- If `Partial<AvatarSize>` in `ThemeOverrides` does not type-check, stop and
  report.
- If any gate fails for a reason outside `packages/tokens` and `docs`, report it
  and leave it alone.
- If a file outside the owned list needs a change, record it in `TODO.md` and do
  not edit it.

## 6. Acceptance criteria

- [ ] `avatarSize` is exported from `@gpuixui/tokens`, JSDoc'd, and holds exactly
      `20/26/32/40`.
- [ ] Every shipped theme and `extendTheme` carry `avatarSize`.
- [ ] A test fails if the scale is reordered or a theme drops the group.
- [ ] `docs/tokens.md` and `docs/design-system.md` document the scale.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.

# 055 — Designed hover roles for filled controls

**Workstream:** `tokens-theme`
**Phase:** B, closing a `components` interlock on `@gpuixui/tokens`
**Depends on:** plans 011, 013, 014, 015, 016 (the implemented package)
**Files owned:** `packages/tokens/**`, `docs/tokens.md`, `docs/design-system.md`,
this plan, `.agents/slop/plans/README.md` (index row only), `TODO.md` (this
workstream only), `COMPONENTS.md` (design-system section only).

Self-contained. Follow the steps in order. Plan `054` is the sibling task; the
two are independent and may land in either order.

---

## 1. Why

`workspaces/components/TODO.md` → **Interlocks** carries an open request to
`tokens-theme`:

> A `primaryHover` / `destructiveHover` role pair so filled buttons stop using a
> half-alpha fill for hover.

`packages/components/src/internal/button.tsx` fakes the state today:

```ts
const HOVER_ALPHA = "80";
// Tokens ship no `primaryHover`; a half-alpha fill is the closest honest step,
// and the interlock records the missing role.
hover: { backgroundColor: withAlpha(theme.colors.primary, HOVER_ALPHA) },
```

A translucent fill is not a decision: it composites over whatever happens to be
behind the button, so the same button reads differently on `background`, `card`
and a popover, and the composited pair is never contrast-checked. A designed
opaque role is checked, and a brand can change it in one place.

## 2. Decision (do not re-litigate)

- Add exactly two roles: `primaryHover` and `destructiveHover`. No
  `secondaryHover` (the secondary and ghost variants already read the generic
  `hover` / `active` washes, and a solid status button has no consumer yet), and
  no `*Active` pair — pressing a filled control is not in scope.
- They are **opaque** ramp steps, not alpha values: an opaque role is what the
  contrast test can hold to a floor.
- Direction: a filled control **darkens in light mode and lightens in dark
  mode**, which is what a raised surface does as it recedes from the canvas.

## 3. Exact change

### 3.1 `packages/tokens/src/color.ts`

Add the two fields to the `ThemeColors` interface **immediately after their
solid pair**, so the interface order, every shipped set, `colorRoles` and both
documented tables stay in one order:

- after `primaryForeground`, before `secondary`:

  ```ts
  /** Primary action background while hovered. */
  readonly primaryHover: string;
  ```

- after `destructiveForeground`, before `success`:

  ```ts
  /** Destructive action background while hovered. */
  readonly destructiveHover: string;
  ```

Add the values in the same position in all four sets:

| Set | `primaryHover` | `destructiveHover` |
| --- | -------------- | ------------------ |
| `lightColors` | `palette.iris[700]` (`#4C39B5`) | `palette.red[700]` (`#A5262B`) |
| `darkColors` | `palette.iris[200]` (`#C7CBFF`) | `palette.red[300]` (`#FF9E9E`) |
| `highContrastLightColors` | `palette.iris[900]` (`#2E2370`) | `palette.red[900]` (`#5C1619`) |
| `highContrastDarkColors` | `palette.iris[100]` (`#E0E3FF`) | `palette.red[200]` (`#FFC6C6`) |

Insert `"primaryHover"` and `"destructiveHover"` into `colorRoles` in the same
two positions. Update the two doc comments that say "The same 47 roles" to "49".

### 3.2 `packages/tokens/src/color.test.ts`

1. Add to `pairs` (after the matching solid pair, so the failure reads in role
   order):

   ```ts
   ["primaryForeground", "primaryHover", "secondary"],
   ["destructiveForeground", "destructiveHover", "secondary"],
   ```

   The `secondary` class gives the default themes a 4.5:1 floor and the
   high-contrast themes 7:1 — the same floor the un-hovered pair carries, so a
   hover step can never dim the label below what hover-free text is held to.
2. Add to `describe("colour roles")`:

   ```ts
   it("moves every filled surface away from its resting role", () => {
     colourSets.forEach(({ label, colors }) => {
       expect(colors.primaryHover, label).not.toBe(colors.primary);
       expect(colors.destructiveHover, label).not.toBe(colors.destructive);
     });
   });
   ```

   This is the regression guard: a hover role that equals its base renders no
   feedback, which is the bug the alpha fill was papering over.

### 3.3 `docs/tokens.md`

1. Update the role count sentence: "There are 47 roles." → "There are 49 roles.",
   and mention that a filled action has a designed hover (`primaryHover`,
   `destructiveHover`) so a component never composites an alpha fill.
2. In the `## Colour roles` table, add the two rows in the **same position** as
   the interface:

   | `primaryHover` | `#4C39B5` | `#C7CBFF` | primary action while hovered |
   | `destructiveHover` | `#A5262B` | `#FF9E9E` | destructive action while hovered |

3. In the `## High contrast` section, update "the same 47 roles" to "the same 49
   roles" and add the two rows to the HC table in the same position:

   | `primaryHover` | `#2E2370` | `#E0E3FF` | primary action while hovered |
   | `destructiveHover` | `#5C1619` | `#FFC6C6` | destructive action while hovered |

4. In `## Verification`, add the two new pairs to the sentence that lists the
   contrast floors (on-colour text on a hovered fill, same floor as on the
   resting fill).

### 3.4 `docs/design-system.md`

In §8 "Interaction states", extend the table's `hover` row (or add a row) to name
the designed fills: "filled actions step to `primaryHover` / `destructiveHover`
(opaque, contrast-checked) rather than compositing an alpha fill; ghost and
subtle surfaces use the `hover` wash". §4's "same 47 roles" becomes "same 49
roles".

### 3.5 `COMPONENTS.md` (design-system section only)

1. The "Design tokens" row's notes: `47 semantic roles` → `49 semantic roles`.
2. The "High-contrast theme" row's notes: `same 47 roles` → `same 49 roles`.
3. Add one design-system row after "Status tones":

   | Filled control hover | done | yes (values in a `Theme`) | `primaryHover` / `destructiveHover` are opaque, contrast-checked fills so a filled Button never composites a half-alpha colour; on-colour text is held to its floor on both the resting and hovered fill in all four colour sets. Docs in `docs/tokens.md`. |

### 3.6 `packages/tokens/README.md`

The high-contrast section says "It reuses the same 47 roles" → "49 roles".

### 3.7 `TODO.md` (this workstream only)

- Add and tick: `[x]` Ship designed `primaryHover` / `destructiveHover` roles so
  filled controls stop faking hover with an alpha fill (plan 055).
- Update the section's progress bar and count (with plan 054: 20/26).
- Add to the cross-team block: `components`' interlock rows *"a
  `primaryHover` / `destructiveHover` role pair"*, *"soft tone pair per status"*,
  *"`alpha(color, amount)`"* and *"an `info` status role"* are all shipped by
  `@gpuixui/tokens` (plans 014, 055); `components` deletes `tone()`, `withAlpha`,
  the `HOVER_ALPHA` fill and the borrowed `accent` pair when it imports the
  package directly (owner: `components`).

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0
```

Prove the new guards can fail, capture both outputs, restore, and record them in
the commit body:

1. Set `lightColors.primaryHover` to `lightColors.primary`, run the package
   tests, capture the "moves every filled surface away from its resting role"
   failure.
2. Set `highContrastLightColors.primaryHover` to `#F0F0F0` (white-ish, so white
   label text loses contrast), run the package tests, capture the contrast
   failure at the 7:1 floor.

## 5. STOP conditions

- If `expect(colorRoles).toEqual(Object.keys(lightColors))` fails, the two
  insertion points disagree — fix the order; do not relax the test.
- If any contrast floor cannot be met by an opaque ramp step, stop and report
  with the computed ratio rather than shipping a role that fails.
- If a gate fails for a reason outside `packages/tokens` and `docs`, report it
  and leave it alone.
- If a file outside the owned list needs a change, record it in `TODO.md` and do
  not edit it.

## 6. Acceptance criteria

- [ ] `primaryHover` and `destructiveHover` are in `ThemeColors`, all four colour
      sets and `colorRoles`, in interface order.
- [ ] Every shipped set's hover role differs from its resting role.
- [ ] The contrast test holds on-colour text on a hovered fill to the same floor
      as on the resting fill, in all four sets.
- [ ] `docs/tokens.md`, `docs/design-system.md` and the package README document
      the roles and the new count.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.

# 097 — Designed hover and pressed roles for every filled control

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
011, 014, 055, 063, 071, 080, 084 · **Touches:** `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`, `TODO.md`

## 1. The defect

Plan 055 shipped `primaryHover` and `destructiveHover` so a filled control would
stop compositing an alpha fill for hover. It deliberately declined a neutral
role and a pressed pair on a premise that is false in the consumer:

> No `secondaryHover` (the secondary and ghost variants already read the generic
> `hover` / `active` washes …), and no `*Active` pair.

`packages/primitives/src/core/variants.ts` on `master` shows what a filled
control actually paints:

```ts
const filled = (color) => ({
  hover: (theme) => ({ backgroundColor: alpha(color(theme), 0.9) }),
  active: (theme) => ({ backgroundColor: alpha(color(theme), 0.8) }),
});

const primary = { background: primary, foreground: primaryForeground, ...filled(primary) };
const secondary = { background: secondary, foreground: secondaryForeground, ...filled(secondary) };
const destructive = { background: destructive, foreground: destructiveForeground, ...filled(destructive) };
```

`alpha` makes the fill translucent, so the painted state is composited over
whatever surface sits behind the control. Two consequences, both measured from
the shipped identity themes:

| Set | Family | Resting | Fake hover (`alpha 0.9` over `background`) | Fake press (`alpha 0.8`) | Step (rest→hover / hover→press) |
| --- | ------ | ------- | ----------------------------------------- | ----------------------- | ------------------------------- |
| light | primary | `#5F4BDB` | `#6E5CDE` | `#7D6EE1` | 1.291 / 1.290 |
| light | secondary | `#EEF1F5` | `#EFF2F5` | `#F0F2F6` | **1.009 / 1.003** |
| light | destructive | `#CC3439` | `#D0474C` | `#D45B60` | 1.183 / 1.211 |
| dark | primary | `#A7A9FF` | `#989AE9` | `#898BD1` | 1.228 / 1.257 |

1. **The direction is inverted.** A filled control must darken in light mode and
   lighten in dark mode, the way `primaryHover` already does (`#5F4BDB` →
   `#4C39B5` light, `#A7A9FF` → `#C7CBFF` dark). Alpha moves the fill *toward the
   backdrop* instead: the light primary's fake hover is lighter than its resting
   fill and its fake press is lighter still; the dark primary's fake hover is
   darker than rest.
2. **The neutral fill has no visible state at all.** `secondary` is only just
   distinguishable from the canvas (1.064:1 in the light identity), so 90% of it
   over the canvas is a 1.009:1 step — a 1–2 RGB change at rest. The light
   secondary button has no perceptible hover, and its press is lighter than its
   hover (1.003:1).

The tokens are the single source for state (MISSION.md "interaction, disabled,
loading, focus and selection states"; AGENTS.md "tokens are the single source of
… state"). A state that only exists as a runtime alpha composite is not a token,
is not editable in a copied platform style, and is never contrast-checked.

## 2. Decision (do not re-litigate)

- Add exactly **four** roles, completing the six-role matrix:

  | Family | Resting | Hover | Pressed |
  | ------ | ------- | ----- | ------- |
  | brand | `primary` | `primaryHover` (shipped) | **`primaryActive`** |
  | neutral fill | `secondary` | **`secondaryHover`** | **`secondaryActive`** |
  | destructive | `destructive` | `destructiveHover` (shipped) | **`destructiveActive`** |

- They are **opaque ramp steps**, never alpha values, and they are measured as
  fills of `xForeground`.
- The generic `hover` / `active` roles stay unchanged: they are the *washes* a
  ghost or outline control paints, not the fill of a filled control. Both
  docstrings must say so; the two are easy to confuse.
- Direction: **resting → hover → pressed moves away from the canvas**, so each
  step's luminance decreases in light mode and increases in dark mode. The
  existing `primaryHover`/`destructiveHover` already follow that rule.
- Every real platform style carries its own `primaryActive`, `secondaryHover`
  and `secondaryActive`, because it already carries its own `primary`,
  `primaryHover` and `secondary`; inheriting the identity's iris press on a
  macOS blue button would be a visible platform-fidelity bug. `destructive*` is
  shared across platforms, exactly as `destructive` and `destructiveHover` are.

## 3. Exact values

### 3.1 Identity (`packages/tokens/src/color.ts`)

| Set | `primaryActive` | `secondaryHover` | `secondaryActive` | `destructiveActive` |
| --- | --------------- | ---------------- | ----------------- | ------------------- |
| `lightColors` | `palette.iris[800]` (`#3B2C8F`) | `palette.neutral[200]` (`#E1E5EC`) | `palette.neutral[300]` (`#CBD1DB`) | `palette.red[800]` (`#7E1D21`) |
| `darkColors` | `palette.iris[100]` (`#E0E3FF`) | `palette.neutral[700]` (`#3D4552`) | `palette.neutral[600]` (`#545D6C`) | `palette.red[200]` (`#FFC6C6`) |
| `highContrastLightColors` | `palette.iris[950]` (`#1C1547`) | `#D6D6D6` | `#B8B8B8` | `palette.red[950]` (`#3A0B0D`) |
| `highContrastDarkColors` | `palette.iris[50]` (`#EEF0FF`) | `#3D3D3D` | `#4A4A4A` | `palette.red[100]` (`#FFE0E0`) |

Every foreground pair clears its floor (lowest: light destructive
`#FFFFFF` on `#7E1D21` at 10.07:1; high-contrast light secondary `#000000` on
`#B8B8B8` at 10.59:1; dark secondary `#E1E5EC` on `#545D6C` at 5.26:1) and every
step is ≥ 1.11:1, well above the 1.05:1 perceivability floor.

### 3.2 Platform styles (`packages/tokens/src/platform-styles/`)

| Style | Mode | `primaryActive` | `secondaryHover` | `secondaryActive` |
| ----- | ---- | --------------- | ---------------- | ----------------- |
| `macos.ts` | light | `#004C99` | `#DEDEE3` | `#D1D1D6` |
| `macos.ts` | dark | `#64B5FF` | `#434345` | `#4C4C4E` |
| `linux.ts` | light | `#16518D` | `#DEDDDB` | `#D4D3D1` |
| `linux.ts` | dark | `#A9CCF5` | `#434343` | `#4D4D4D` |
| `windows.ts` | light | `#004E8C` | `#E0E0E0` | `#D6D6D6` |
| `windows.ts` | dark | `#9BDDFF` | `#424242` | `#4C4C4C` |

Each keeps its platform's grey family and accent hue. Every pair clears its
floor and every step is ≥ 1.10:1 (measured; the tightest is Windows light
secondary hover→press at 1.109:1).

## 4. Exact changes

### 4.1 `packages/tokens/src/color.ts`

1. Add the four fields to `ThemeColors` **beside their solid pair**, in role
   order:
   - `primaryActive` immediately after `primaryHover`, before `primaryText`;
   - `secondaryHover` and `secondaryActive` immediately after
     `secondaryForeground`, before `muted`;
   - `destructiveActive` immediately after `destructiveHover`, before `success`.
   The docstrings must distinguish the *fill* roles from the generic `hover` /
   `active` washes, and say that a filled control uses its family's roles.
2. Add the values in the same positions in all four sets (§3.1).
3. Insert `"primaryActive"`, `"secondaryHover"`, `"secondaryActive"` and
   `"destructiveActive"` into `colorRoles` in the same positions.
4. Update the "same 58 roles" prose comments to 62.

### 4.2 `packages/tokens/src/platform-styles/{macos,linux,windows}.ts`

Add the per-mode values from §3.2, `primaryActive` after `primaryHover` and the
two neutral roles after `secondaryForeground`, and extend each file's header
comment by one clause: "The pressed and neutral hover steps are designed roles
(plan 097), not alpha composites." Do **not** add a `destructiveActive` override:
platforms inherit the shared destructive family.

### 4.3 `packages/tokens/src/contrast.ts`

Add the pairs beside the existing family pairs (same `secondary` class):

```ts
["secondaryForeground", "secondary", "secondary"],
["secondaryForeground", "secondaryHover", "secondary"],
["secondaryForeground", "secondaryActive", "secondary"],
["primaryForeground", "primary", "secondary"],
["primaryForeground", "primaryHover", "secondary"],
["primaryForeground", "primaryActive", "secondary"],
["destructiveForeground", "destructive", "secondary"],
["destructiveForeground", "destructiveHover", "secondary"],
["destructiveForeground", "destructiveActive", "secondary"],
```

Replace the `["secondaryForeground", "secondary", "secondary"]` line where it
currently sits; do not duplicate it. Extend the `contrastPairs` docstring to say
that the filled families are measured at rest, hover and press, and that the
neutral fill's steps are designed roles rather than the generic washes.

### 4.4 `packages/tokens/src/filled-states.test.ts` (new)

Header comment states the guarded bug: the consumer composited
`alpha(primary/secondary/destructive, 0.9 / 0.8)` over the surface behind a
filled control, which inverted the direction in both modes and left the neutral
fill's hover at 1.009:1.

The suite iterates **every shipped theme**: the four identity themes
(`getTheme(mode, contrast)`) and the twelve platform variants
(`getPlatformTheme(platform, mode, contrast)` for the three real platforms). For
each theme and each family (`primary`, `secondary`, `destructive`):

1. `x`, `xHover`, `xActive` exist and are three distinct values.
2. Each successive step is perceivable: `contrastRatio(x, xHover) >= 1.05` and
   `contrastRatio(xHover, xActive) >= 1.05`.
3. Direction follows the theme's mode. Derive luminance without duplicating the
   colour maths: `luminance(color) = (contrastRatio(color, "#000000") - 1) * 0.05`.
   - light: `luminance(x) > luminance(xHover) > luminance(xActive)`;
   - dark: `luminance(x) < luminance(xHover) < luminance(xActive)`.
4. The foreground clears the theme's floor on all three steps:
   `contrastFloors[theme.contrast].secondary`, using `theme.colors`.
5. Every state role appears in `contrastPairs` with its family foreground, so a
   sixth `xActive` cannot ship unmeasured.

Also assert the **generic washes are still washes**: `hover` and `active` are
not used as the filled families' state roles (a simple inequality against the
family's own steps), so the two ideas cannot be merged later by accident.

### 4.5 `packages/tokens/src/color.test.ts`

Extend "moves every filled surface away from its resting role" to cover all
three steps of all three families (`x !== xHover`, `xHover !== xActive`,
`x !== xActive`) in every colour set. Keep the existing assertions.

### 4.6 `packages/tokens/src/contrast.test.ts`

Change the stale `so a 55th role cannot ship unmeasured` comment to
`so a new role cannot ship unmeasured`. No list changes: the four roles are
measured by `contrastPairs`.

### 4.7 `docs/tokens.md`

1. "There are 58 roles." → `There are ${62} roles.` and rewrite the filled-action
   sentence: a filled action has designed hover **and pressed** steps for all
   three families, so a component never composites an alpha fill; the generic
   `hover`/`active` roles are the washes for ghost and outline controls.
2. Add the four rows to the default table in `colorRoles` order:
   `primaryActive` after `primaryHover`; `secondaryHover`/`secondaryActive`
   after `secondaryForeground`; `destructiveActive` after `destructiveHover`.
3. "the same 58 roles" → 62; add the four rows to the high-contrast table in the
   same order with §3.1's values.
4. In `## Verification`, change "text on a hovered filled action" to "text on a
   hovered or pressed filled action", and mention that the neutral fill's hover
   and press are designed steps (the audit measured 1.009:1 / 1.003:1 for the
   alpha composite).
5. Add a short paragraph under the colour table naming the distinction
   (`hover`/`active` = washes; `xHover`/`xActive` = filled-control fills), or
   extend the existing filled-action paragraph if that reads better.

### 4.8 `docs/design-system.md`

1. §4 role count: "exactly the same 58 roles" → 62.
2. §8 state table: hover and pressed rows name the six roles; add one sentence
   below the table: "A filled control steps through its own family — `x` →
   `xHover` → `xActive` — so the state is an editable, measured fill; the
   generic `hover` and `active` washes belong to ghost and outline controls. All
   six roles are contrast-checked with their on-colour foreground."

### 4.9 `packages/tokens/README.md`

"the same 58 roles" → 62 (the readme test derives the number). If the README
names the filled hover roles anywhere, add the pressed and neutral pair.

### 4.10 `COMPONENTS.md`

- *Design tokens* row: 58 → 62 roles; add that the filled-control states are
  designed, measured roles.
- *Filled control hover* row: rename to **Filled control states**, keep `done`,
  and record that `primaryActive`, `secondaryHover`, `secondaryActive` and
  `destructiveActive` join the two shipped hover roles, so no filled control
  composites an alpha fill; note the measured defects the plan fixed.

### 4.11 `TODO.md`

Under **Design tokens and theming (`tokens-theme`)** add and tick:

```
`[x]` Complete the filled-control state matrix — `primaryActive`,
`secondaryHover`, `secondaryActive` and `destructiveActive` — so a filled
control's hover and press are editable, measured fills instead of an alpha
composite over the backdrop; the neutral fill's fake hover measured 1.009:1 and
the light primary's press moved *lighter* than its hover (plan 097)
```

Update the progress fraction `64/83` → `65/84`. Add **one cross-team** row:

```
`[ ]` Cross-team: `primitives` and `components` read `xHover`/`xActive` for
filled controls and delete the `filled()` alpha helper, `withAlpha` and
`HOVER_ALPHA` — the six roles are measured and platform-specific now (plan 097;
owner: those workstreams)
```

### 4.12 Plan index

Add the row to `.agents/slop/plans/README.md` at 097, status `done` when the plan
is executed, and update the closing narrative paragraph with the measured
finding (1.009:1 neutral hover, inverted light primary press).

## 5. Commands and expected results

Run from the worktree root, in this order:

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | 34 files green; test count rises by the new suite |
| 2 | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| 3 | `nub run lint` | exit 0 |
| 4 | `nub run fmt` | exit 0 (use `nub run fmt:fix` first if drifted) |
| 5 | `nub run check` | exit 0 |
| 6 | `nub run test` | exit 0 |

If an unrelated package fails at step 6, record the package and failure in the
commit message; do not edit outside this workstream.

## 6. Test plan — proof in both directions

1. **New suite fails without the roles.** Run `filled-states.test.ts` before
   adding the fields: it cannot read `primaryActive` etc. (compile error), then
   with only the fields and no values the step/direction assertions fail.
2. **Direction is real, not inequality-only.** Temporarily set
   `lightColors.primaryActive` to `#7D6EE1` (the alpha composite) and observe the
   light direction assertion fail (`luminance(active) > luminance(hover)`) while
   contrast still passes; restore.
3. **Perceivability is real.** Temporarily set `lightColors.secondaryHover` to
   `#EFF2F5` (the alpha composite) and observe the 1.05:1 step assertion fail;
   restore.
4. **Platform fidelity.** Temporarily delete `primaryActive` from `macos.ts` and
   observe the platform-ownership assertion fail with
   `darwin light primaryActive: expected undefined to be defined`; restore. (The
   step/direction checks alone can pass an inherited iris value, because it is
   still a valid darker step — which is exactly why the suite asserts that each
   real style *owns* its primary and neutral steps.)
5. **Docs drift.** `docs.test.ts` parses both colour tables and requires all 62
   roles in order, and `readme.test.ts`/`docs.test.ts` derive the role count, so
   a partially updated document fails.

Record the actual two-direction evidence in this plan's Outcome section.

## 7. STOP conditions

Stop and report, do not improvise, if:

- any shipped pair (identity, platform or high contrast) misses a floor after the
  values in §3 — that means the values are wrong, not the floor;
- the direction rule cannot hold for a platform style without changing its
  accent hue substantially (record the conflict; do not quietly flip the rule);
- a consumer needs a new role name to adopt the change (record it as a
  cross-team row instead of editing that package);
- a step requires `any`, a cast, or retyping a role list;
- the docs table order disagrees with `colorRoles` (fix the order, do not relax
  the guard).

## 8. Acceptance

- [x] Four roles ship in all four identity colour sets and in the three real
      platform styles (`primaryActive`, `secondaryHover`, `secondaryActive`,
      `destructiveActive`; platforms carry the first three).
- [x] `colorRoles`, `ThemeColors`, the two doc tables and the high-contrast table
      list all 62 roles in one order.
- [x] `filled-states.test.ts` proves presence, perceivability and direction on
      every shipped theme, and can fail (evidence in §9).
- [x] `contrastPairs` measures every new role with its family foreground
      (125 → 129 pairs).
- [x] Docs, README, `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint` and `nub run test` pass, run — not assumed.
- [x] Committed on `agent/tokens-theme` and pushed.

## 9. Outcome (executed on this host, 2026-10-17)

- `color.ts` adds `primaryActive`, `secondaryHover`, `secondaryActive` and
  `destructiveActive` (58 → 62 roles), in `ThemeColors`, all four colour sets and
  `colorRoles`, in role order; the generic `hover`/`active` docstrings now name
  the split.
- `macos.ts`, `linux.ts` and `windows.ts` carry per-mode `primaryActive`,
  `secondaryHover` and `secondaryActive` in their own accent and grey families;
  `destructiveActive` is inherited from the shared destructive family, like
  `destructive` and `destructiveHover`.
- `contrast.ts` measures rest, hover and press for all three families
  (125 → 129 pairs); every shipped identity and platform theme clears its floor
  (lowest: dark `secondaryForeground` on `secondaryActive` at 5.26:1; high
  contrast light `secondaryForeground` on `secondaryActive` at 10.59:1).
- `filled-states.test.ts` (new) holds 16 themes × 3 families to presence,
  a ≥ 1.05:1 step, mode-correct luminance direction, the foreground floor on
  every step, the pair list, the identity neutral regression, and platform
  ownership of the platform-specific steps.
- Two-direction evidence, each run and reverted:
  - **direction**: `lightColors.primaryActive = "#7D6EE1"` (the old alpha press)
    failed `default light: primary steps through rest, hover and press` with
    `expected 1 to be -1` (the step moved lighter, the wrong sign) and the
    on-colour floor at 4.05:1; restored;
  - **perceivability**: `lightColors.secondaryHover = "#EFF2F5"` (the old alpha
    hover) failed with `1.0082784259524802` under the 1.05:1 step floor;
    restored;
  - **platform ownership**: removing `primaryActive` from `macos.ts` failed with
    `darwin light primaryActive: expected undefined to be defined`; restored;
  - restored, `packages/tokens` is green: **34 files, 1755 tests** (1754 before
    the platform-ownership assertion).
- `docs/tokens.md` (count, both tables, the state paragraph and the Verification
  prose), `docs/design-system.md` (role count, state table, filled-state
  paragraph), `packages/tokens/README.md`, `COMPONENTS.md` (design tokens,
  high-contrast, contrast-check and the renamed *Filled control states* row) and
  `TODO.md` are updated; the plan index marks this plan done.
- One cross-team row is queued: `primitives`/`components` should read the six
  roles and delete the `filled()` alpha helper, `withAlpha` and `HOVER_ALPHA`.


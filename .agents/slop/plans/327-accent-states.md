# Plan 327 — The accent family's missing hover and press

**Workstream:** `tokens-theme`
**Phase:** F (state-token completeness)
**Depends on:** 011 (roles), 063 (platform styles), 071 (contract), 080/318
(the control edge on its fills), 097 (the filled-control state matrix), 309
(interactive fills as surfaces), 311 (recipes)
**Status:** ready

## 1. Why

Plan 097 replaced `alpha(fill, 0.9)` / `alpha(fill, 0.8)` with designed,
opaque, contrast-checked hover and pressed roles for **three** filled families —
`primary`, `secondary` and `destructive` — because an alpha composite takes its
state colour from the surface behind the control, is not editable in a copied
platform style, and cannot be measured by the contract.

The fourth family was missed. `accent` is a filled surface with a foreground:
it is the "this mode is on" paint of a toggle and the selected surface of a row.
The shipped primitives still composite it:

```ts
// packages/primitives/src/core/variants.ts (master)
const togglePressedBase = (border): ControlVariant => ({
  background: (theme) => theme.colors.accent,
  foreground: (theme) => theme.colors.accentForeground,
  border,
  hover: (theme) => ({ backgroundColor: alpha(theme.colors.accent, 0.9) }),
  active: (theme) => ({ backgroundColor: alpha(theme.colors.accent, 0.8) }),
});
```

So a pressed toggle's hover and press are the exact defect plan 097 fixed for
the other three families: the state lightens or darkens with the backdrop,
cannot be tuned per platform, and has no pair in the contrast contract. In dark
mode the composite moves the fill *toward* the canvas — the direction the design
system forbids — and in light mode it moves away from the designed value by an
amount nobody chose.

`docs/tokens.md` already teaches that a filled control steps `x` → `xHover` →
`xActive`, and the design system's state table says the same. The accent family
is the only filled surface that does not. This plan completes the matrix:
`accentHover` and `accentActive` become designed roles (62 → 64), every shipped
set carries its own steps, and the contract measures the foreground on both and
the outlined toggle's `border` edge on both.

**Audit result.** No shipped composition fails today's on-colour or border
floors *after* the new values (see §2.2). The values move no existing role; they
add two roles and their pairs. `accentForeground` keeps at least 4.60:1 on every
new fill (7.64:1 in the AAA sets), each step is at least 1.06:1 from the one
before it, and `border` stays at least 1.05:1 from the pressed fill (1.05 on
macOS light is the tightest; 3.70:1 at AAA dark).

## 2. What changes

### 2.1 `packages/tokens/src/color.ts`

1. In `ThemeColors`, after `accentForeground`:
   ```ts
   /** Tinted emphasis surface while hovered. */
   readonly accentHover: string;
   /** Tinted emphasis surface while pressed. */
   readonly accentActive: string;
   ```
2. Add the two values to all four sets:

   | set | `accent` | `accentHover` | `accentActive` |
   | --- | -------- | ------------- | -------------- |
   | light | `#EEF0FF` | `#E0E3FF` | `#C7CBFF` |
   | dark | `#2E2370` | `#42319F` | `#4C39B5` |
   | high-contrast light | `#E0E3FF` | `#D5D8FF` | `#BFC2FF` |
   | high-contrast dark | `#251B5C` | `#33257A` | `#42319F` |

   The light set uses the iris ramp (`50 → 100 → 200`); the dark set steps away
   from the canvas through a bespoke `#42319F` (between iris `800` and `700`,
   because iris `800`'s `#3B2C8F` measures 1.043:1 against the dark `border`
   `#343B47`, just under the divider floor on the outlined toggle's on-fill).
3. In `colorRoles`, add `"accentHover"` and `"accentActive"` immediately after
   `"accentForeground"`.
4. Update the two JSDoc sentences that say “The same 62 roles” on
   `highContrastLightColors`/`highContrastDarkColors` to 64.

### 2.2 Platform and recipe styles

Each style that owns an accent names the whole family (plan 310's rule). Add
`accentHover`/`accentActive` beside `accent`:

| file | mode | hover | active |
| ---- | ---- | ----- | ------ |
| `platform-styles/macos.ts` | light | `#CBE2FC` | `#BFD9F8` |
| `platform-styles/macos.ts` | dark | `#284F73` | `#2D577E` |
| `platform-styles/linux.ts` | light | `#D8E6F9` | `#CFE0F8` |
| `platform-styles/linux.ts` | dark | `#20446C` | `#264C77` |
| `platform-styles/windows.ts` | light | `#CFE3F5` | `#B9D3EF` |
| `platform-styles/windows.ts` | dark | `#113A5D` | `#174572` |
| `platform-styles/recipes/xp.ts` | light | `#BDD4F9` | `#B0CBF7` |
| `platform-styles/recipes/aero.ts` | light | `#CFE5FA` | `#C4DEF9` |

The recipes' `dark: {}` halves inherit the identity dark accent family, which is
what they inherit today for `accent` and `accentForeground`; the `default` style
carries no colours at all. Every value above was chosen with the same rules the
other families use — away from the canvas, a perceivable step at each stage, the
on-colour floor, the outlined control's `border` edge, and the surface floor
against `background`/`card`/`popover`/`muted`:

| set | accent→hover | hover→active | fg on hover/active | border on hover/active |
| --- | ------------ | ------------ | ------------------ | ---------------------- |
| identity light | 1.12 | 1.24 | 8.54 / 6.90 | 1.11 / 1.12 |
| identity dark | 1.37 | 1.18 | 6.18 / 5.24 | 1.17 / 1.37 |
| AAA light | 1.10 | 1.22 | 9.49 / 7.78 | 4.69 / 3.85 |
| AAA dark | 1.21 | 1.29 | 9.84 / 7.64 | 4.76 / 3.70 |
| macOS light | 1.08 | 1.09 | 5.36 / 4.91 | 1.15 / 1.05 |
| macOS dark | 1.37 | 1.13 | 5.51 / 4.87 | 1.07 / 1.21 |
| Linux light | 1.06 | 1.06 | 7.07 / 6.67 | 1.19 / 1.13 |
| Linux dark | 1.17 | 1.13 | 5.92 / 5.23 | 1.06 / 1.19 |
| Windows light | 1.08 | 1.17 | 6.72 / 5.73 | 1.10 / 1.06 |
| Windows dark | 1.08 | 1.19 | 7.71 / 6.47 | 1.08 / 1.10 |
| XP light | 1.06 | 1.10 | 7.35 / 6.71 | 1.16 / 1.06 |
| Aero light | 1.05 | 1.07 | 7.12 / 6.64 | 1.30 / 1.21 |

If the executor cannot reproduce a row within ±0.01, **STOP** and report the
measured value; do not silently retune a palette.

### 2.3 `packages/tokens/src/contrast.ts`

1. Add `"accentHover"` and `"accentActive"` to `stateFillRoles`, next to
   `"accent"` (13 → 15 fills; `stateFillSurfacePairs` grows by 8).
2. Add the on-colour pairs beside the other filled families:
   ```ts
   ["accentForeground", "accentHover", "secondary"],
   ["accentForeground", "accentActive", "secondary"],
   ```
3. Add the decorative edge on the two fills to `controlFillRoles`:
   `"accentHover"` and `"accentActive"` (the outline toggle keeps its `border`
   edge through the hover and press exactly as the neutral family does).
4. Extend the two list comments: the accent family now has a designed hover and
   press, and the toggle-on outline control keeps its edge on both.

### 2.4 `packages/tokens/src/filled-states.test.ts`

- `families` becomes `["primary", "secondary", "destructive", "accent"]`.
- The platform-ownership case's `platformRoles` gains `"accentHover"` and
  `"accentActive"`.
- Update the header to name the fourth family and plan 327.

### 2.5 `packages/tokens/src/accent-states.test.ts` — new guard

The header states the bug: the accent family's states were alpha composites, so
a pressed toggle's hover took its colour from the surface behind it, moved the
wrong way in dark mode and had no contrast pair; plan 097 fixed the other three
families and this suite holds the fourth to the same contract.

Cases:

1. **the roles exist and are ordered** — `colorRoles` contains `accent`,
   `accentForeground`, `accentHover`, `accentActive` in that order, and
   `ThemeColors`-carrying sets are total at runtime (`Object.keys(themes.light.colors)`
   has 64 entries).
2. **every shipped set carries its own steps** — identity default and AAA, the
   three platform variants and the two recipes, both modes: the three values are
   distinct, each step is ≥1.05:1, and `accentForeground` clears
   `contrastFloors[theme.contrast].secondary` on every step.
3. **the direction follows the mode** — luminance of
   `accent` → `accentHover` → `accentActive` decreases in light and increases in
   dark, the same check `filled-states.test.ts` runs for the other families.
4. **the outlined toggle keeps its edge** — `border` clears
   `contrastFloors[...].divider` on both new fills in every shipped set.
5. **the public checker reports an unreadable step** — the regression: a
   theme whose `accentHover` becomes the foreground measures 1:1 and is
   reported. (An erased step — `accentHover` equal to `accent` — is caught by
   the distinct-and-direction case above, not by the pair contract, which
   measures pairs rather than steps.)
   ```ts
   const base = getTheme("light");
   const regressed = extendTheme(base, {
     colors: { accentHover: base.colors.accentForeground },
   });
   const failures = themeContrastFailures(regressed).filter(
     ({ foreground, background }) =>
       foreground === "accentForeground" && background === "accentHover",
   );

   expect(failures).toHaveLength(1);
   expect(failures[0]?.floor).toBe(contrastFloors.default.secondary);
   expect(failures[0]?.ratio).toBe(1);
   ```
   Before §2.3 the filter returns `[]` and the case fails.
6. **the example paints the designed roles** — import
   `toggleOnPaints` from `accent-states.example.ts` and assert each field is
   exactly the theme role (no alpha string).

### 2.6 `packages/tokens/src/accent-states.example.ts` — new example

```ts
import type { Theme } from "./theme.js";

/**
 * The three paints of a toggle that is on. Read the whole family from the
 * theme: a component never composites `alpha(accent, 0.9)` for hover, because
 * that state would take its colour from the surface behind the control.
 */
export const toggleOnPaints = (theme: Theme) => ({
  rest: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.accentForeground,
  },
  hover: {
    backgroundColor: theme.colors.accentHover,
    color: theme.colors.accentForeground,
  },
  press: {
    backgroundColor: theme.colors.accentActive,
    color: theme.colors.accentForeground,
  },
});
```

Add JSDoc and export nothing from `index.ts` (examples are compiled and
asserted, not public API; match `brand-theme.example.ts`).

### 2.7 Test counts and guards that hard-code a size

- `packages/tokens/src/contrast.test.ts`: `contrastPairs.length` 264 → **276**.
- `packages/tokens/src/state-fill-surfaces.test.ts`: the two
  `toHaveLength(52)` → **60**, and add `accentHover`/`accentActive` to the
  `filledRoles` list.
- `packages/tokens/src/docs.test.ts`:
  - `toHaveLength(52)` → **60** in “names every interactive fill …”.
  - Pair history: the final sentence becomes “Plan `327` adds the accent
    family's designed hover and press to the fill, on-colour and control-edge
    contracts, taking it from 264 to **276**.”, and the guard asserts
    `taking it from 264 to **${contrastPairs.length}**`.
  - Audit-series string `plans \`076\`–\`325\` closed` → `…–\`327\``.
- `packages/tokens/src/inventory.test.ts`: “names the six designed
  filled-control roles” becomes “…the eight designed filled-control roles” and
  its array gains `"accent"`, so the row is held to the fourth family.

### 2.8 Documents

- `docs/tokens.md`
  - Role table: add `accentHover` and `accentActive` rows after
    `accentForeground`; update the `accent` use to “selection and toggle-on
    surface”.
  - The same two rows in the high-contrast table.
  - “There are 62 roles.” → 64; “There are 62 roles” is
    `colorRoles.length`-guarded, as is “the same 62 roles”.
  - Colour-roles prose: “Every filled action has designed hover and pressed
    steps — `primaryHover`/`primaryActive`, `secondaryHover`/`secondaryActive`,
    `destructiveHover`/`destructiveActive` **and `accentHover`/`accentActive`**”.
  - “the thirteen fills” → “the fifteen fills”; name the accent family in the
    `stateFillSurfacePairs` paragraph.
  - The filled-control paragraph gains one sentence: the toggle-on accent is a
    filled surface too, its alpha composite was the plan 097 defect one family
    over, and its steps are designed.
  - `COMPONENTS.md` / `README` counts follow in §2.9.
- `docs/design-system.md`
  - §4: “exactly the same 62 roles” → 64.
  - §3: in the family rule, add `accentHover`/`accentActive` to the list of
    roles that belong beside a changed fill.
  - §8: the `selected` row mentions the accent fill; add “a toggle that is on
    steps `accent` → `accentHover` → `accentActive` and keeps
    `accentForeground` on all three”.
  - §9 floor table: the filled-control row names the accent family, and the
    decorative-divider row gains the two accent fills (the outline toggle's
    edge). Update the matching `docs.test.ts` strings verbatim.
- `packages/tokens/README.md`
  - “same 62 roles” → 64; the state-fill sentence names the accent family and
    `readme.test.ts`'s exact expected string is updated in the same commit.
- `COMPONENTS.md`
  - Design tokens row: 62 → 64 and one clause naming the accent states.
  - High-contrast row: same 62 → 64.
  - Theme contrast check row: 264 → 276 pairs and one sentence for plan 327.
  - Filled control states row: “Six designed roles” → “Eight designed roles”,
    name `accentHover`/`accentActive`, and note that the toggle-on accent no
    longer needs an alpha composite.

### 2.9 `TODO.md` and the plan index

- Add and tick under “Design tokens and theming”: “Complete the accent family's
  state matrix — the toggle-on fill still hovered and pressed at
  `alpha(accent, 0.9/0.8)`, so the state depended on the backdrop and had no
  contrast pair (plan 097 fixed the other three families); `accentHover` and
  `accentActive` are designed, platform-specific, contrast-checked roles
  (62 → 64 roles, 264 → 276 pairs), and the primitives migration is recorded
  cross-team (plan 327).”
- Add a cross-team row: “`primitives` and `components` read
  `accentHover`/`accentActive` for a toggle that is on and delete the
  `alpha(accent, …)` hover/press at
  `packages/primitives/src/core/variants.ts` (`togglePressedBase`); the six
  values are designed and measured now (plan 327; owner: `primitives`).”
- Re-count the subsection and move the progress bar to the new `done/total`.
- `.agents/slop/plans/README.md`: add plan 327 after 326 with status `done` and
  append a commentary paragraph.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 53 files / 3244 tests. Stop if red.

2. Add `accent-states.test.ts` and the example **before** §2.1, and run only it:
   ```sh
   cd packages/tokens && nub exec vitest run src/accent-states.test.ts
   ```
   Expected: FAIL — `accentHover` is `undefined` (or the roles are absent from
   `colorRoles`); the direction, edge and checker cases cannot run meaningfully
   yet. Record the output as the failing direction.

3. Implement §2.1–§2.3, then:
   ```sh
   cd packages/tokens && nub exec vitest run src/accent-states.test.ts
   ```
   Expected: PASS, 6 tests.

4. Update the counts, documents, ledger and index, then:
   ```sh
   nub run --filter @gpuixui/tokens test
   nub run check
   nub run lint
   nub run fmt
   nub run test
   ```
   Expected: all green. The role loops add one case per role per suite, so the
   token suite's case count rises; `contrast.test.ts` proves 276 pairs and
   `docs.test.ts` proves the documents match.

5. Prove both directions once more by temporarily reverting only §2.1's
   `colorRoles` addition (keep the type/values) and re-running §3.2: the
   ordered-roles case must fail. Restore immediately.

## 4. STOP conditions

Stop and report instead of improvising if:

- any new pair is below its floor in a shipped set after §2.2 — report the set,
  the pair and the ratio; do not move a shared wash, a divider or a foreground
  to make room, because those carry other contracts;
- a platform style's accent family needs a sixth value or a mode-specific
  foreground to pass — that is a palette decision, not this plan;
- `accent` is painted as a *row* hover fill by primitives and a designed
  `accentHover` would change that composition (it does not: rows keep reading
  `accent`) — if a consumer is found painting `accentHover` on a row, stop and
  record it cross-team instead;
- another suite or document hard-codes 62 roles, the 264 pair count or “six
  designed roles” (search `62`, `264`, `six designed`); update every occurrence
  in the same commit rather than relaxing a guard;
- the package was red before the change for reasons outside this workstream.

## 5. Acceptance

- `ThemeColors` carries `accentHover` and `accentActive`, `colorRoles` lists them
  after `accentForeground`, and all four identity sets, all three platform
  styles and both recipe light halves carry their own values.
- `filled-states.test.ts` covers the fourth family; `accent-states.test.ts`
  fails without the roles and passes with them.
- `contrastPairs` contains the on-colour pairs and the edge pairs for both
  fills, `stateFillRoles` is 15, and the total is 276.
- `themeContrastFailures` reports an edited theme whose `accentHover` equals its
  `accent`.
- The example compiles and asserts the designed roles.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
  `COMPONENTS.md`, `TODO.md` and the plan index are current.
- `nub run check`, `nub run lint` and `nub run test` pass.

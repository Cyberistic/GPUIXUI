# 609 — The focus indicator on a filled control

**Workstream:** tokens-theme · **Phase:** F (contract closure) · **Depends on:**
017, 085, 097, 327, 338, 340, 394, 605 · **Status:** ready

## 1. The defect

`focusRing(theme)` draws the only focus indicator GPUix 0.10.0 can paint: a
zero-offset, zero-blur shadow spread by `borderWidth.strong` in the `ring` role.
It is designed for the surface *behind* the control, and the contrast contract
measures it on `background`, `card`, `popover`, `muted`, `accent`, the four
washes, the four soft status fills and the `track` groove — every one a surface,
never a filled control's own fill.

That is not where every consumer paints it:

- `primitives` `clippedFocusRingStyle` (`core/style.ts`, `Button.tsx`,
  `ButtonGroup.tsx`) paints the ring as an **inset border** in `ring` on a
  button's own fill, because a clipped group cannot draw the outer shadow.
- `components` `date-picker.tsx` paints a **today ring** with
  `borderColor: primary` on a day cell whose selected fill is also `primary`.
- `primitives` `selectionBoxStyle` / `switchTrackStyle` paint a pressed
  `borderColor: ring` on a `primary` or `destructive` fill.

On the fill, `ring` is not a signal. A probe over all 24 shipped sets measures
`ring` against `primary` at **1.000:1 in sixteen sets** (both identity dark
themes, the light half of every platform style including XP and Aero, the dark
half of Linux, Windows, XP and Aero, and every high-contrast dark half) and only
1.288–1.374:1 in the rest — never the 3:1 a boundary needs. The three rows are recorded in `TODO.md` as cross-team handoffs,
but each one is asked to invent the same workaround: "paint it with the family's
foreground". The token package owns that decision and has no helper for it, so
the consumer has to pair the right role by hand.

The measured alternative already exists as a pair: a filled family's foreground
is held to the **on-colour** floor on all three of its fills (`primary`,
`primaryHover`, `primaryActive` and the other three families). A probe over the
same 24 sets puts the tightest family foreground on its own fills at
**4.697:1** (identity macOS light), above the 3:1 default boundary and the 4.5:1
high-contrast boundary. A ring painted from it is readable on the control it
belongs to, and needs no new colour role.

This plan ships the missing call, `insetFocusRing(theme, family)`, and documents
that a clipped or on-fill indicator is a **border**, not the outer shadow. It
does not change `focusRing`, any role value, any contrast pair, floor, metric or
shipped theme; it adds one helper, one example and one guard.

## 2. Exact files and changes

### 2.1 `packages/tokens/src/styles.ts`

After `filledControl` (and before `softAction`), add:

```ts
/** The inset focus indicator a filled control paints inside its own box. */
export interface InsetFocusRing {
  /** The family's on-colour, readable on its resting, hover and pressed fills. */
  readonly borderColor: string;
  /** The indicator thickness, the same as the outer ring's spread. */
  readonly borderWidth: number;
}

/**
 * The focus indicator for a filled control that cannot draw the outer shadow —
 * a clipped button inside a group, a calendar day whose cell is the fill, a
 * selection box. `ring` is designed for the surface behind a control and
 * measures 1.000:1 against `primary` in sixteen shipped sets, so an inset ring
 * painted with it disappears. This returns the family's on-colour instead, which
 * the on-colour pairs already hold on the resting, hover and pressed fill
 * (4.697:1 at the tightest in the shipped sets), at the outer ring's
 * `borderWidth.strong`. A control that already carries a border can apply
 * `borderColor` alone.
 *
 * @example
 * ```ts
 * import { getTheme, insetFocusRing } from "@gpuixui/tokens";
 *
 * const focused = insetFocusRing(getTheme("dark"), "primary");
 * focused.borderColor; // primaryForeground
 * ```
 */
export function insetFocusRing(
  theme: Theme,
  family: FilledControlFamily,
): InsetFocusRing {
  return {
    borderColor: filledControl(theme, family).foreground,
    borderWidth: theme.borderWidth.strong,
  };
}
```

No new import: `Theme`, `FilledControlFamily` and `filledControl` are already in
the module.

### 2.2 `packages/tokens/src/inset-focus-ring.example.ts` (new)

An executed example in the style of `disabled-state.example.ts`: a clipped
ButtonGroup member. It must import its helpers and be imported by the test (the
example-coverage guard rejects an unimported `*.example.ts`, plan 350).

```ts
/**
 * A focused filled control inside a clipped group paints its focus indicator
 * inside its own box, because the group clips the outer shadow. The ring role
 * is designed for the surface behind a control; `insetFocusRing` returns the
 * family's measured on-colour at the outer ring's thickness instead.
 */
import type { ControlSize } from "./scale.js";
import { controlHeight, controlPaddingX } from "./styles.js";
import { filledControl, insetFocusRing } from "./styles.js";
import type { Theme } from "./theme.js";

/** The style a focused primary member of a clipped button group paints. */
export const clippedFocusedButtonStyle = (
  theme: Theme,
  size: ControlSize = "md",
) => {
  const fill = filledControl(theme, "primary");
  const ring = insetFocusRing(theme, "primary");
  return {
    backgroundColor: fill.background,
    color: fill.foreground,
    height: controlHeight(theme, size),
    paddingLeft: controlPaddingX(theme, size),
    paddingRight: controlPaddingX(theme, size),
    borderColor: ring.borderColor,
    borderWidth: ring.borderWidth,
  };
};
```

(`filledControl` and `insetFocusRing` are both from `styles.js`; merge the two
import lines into one.)

### 2.3 `packages/tokens/src/inset-focus-ring.test.ts` (new)

Header states the bug guarded: the inset focus indicator was painted with
`ring`, which measures 1.000:1 on `primary` in sixteen shipped sets; a filled
control's only readable indicator is its family's on-colour, at the ring's
thickness.

Cases (import `shippedThemes`, `filledControl`, `filledControlFamilies`,
`insetFocusRing`, `focusRing`, `contrastFloors`, `contrastRatio`, `extendTheme`,
`getTheme`, `shippedThemeLabels` if useful; `node:fs` for the docs case):

1. **The shape is the family's on-colour at the ring's thickness** — for
   `getTheme("light")` and `getTheme("dark")`, for every family:
   `insetFocusRing(theme, family)` equals
   `{ borderColor: filledControl(theme, family).foreground,
   borderWidth: theme.borderWidth.strong }`.
2. **It clears the boundary on every state of every shipped set** — for every
   `shippedThemes` entry and every `filledControlFamilies` member, compute the
   three ratios (`background`, `hover`, `active`) and assert each is at least
   `contrastFloors[theme.contrast].boundary`; label failures with
   `theme.name`. Track the minimum and assert it is **above 4.6** (the shipped
   tightest is 4.697:1, identity macOS light) so a future palette edit that
   drops below the floor is named by this case, not by a consumer. Do not hard
   code a per-set table.
3. **`ring` is not the inset indicator** — for every shipped set, compute the
   minimum of `contrastRatio(theme.colors.ring, fill)` over the four families'
   three fills; assert it is **below** `contrastFloors[theme.contrast].boundary`
   in **every** set, and count the sets where it is exactly 1.000 against
   `primary`; assert the exact sixteen-name list. This is the regression evidence: a
   helper that returned `theme.colors.ring` passes case 1's shape only if its
   source is changed too, and fails case 2; the count is data, not prose.
4. **A copied theme owns both fields** —
   `extendTheme(getTheme("light"), { borderWidth: { strong: 4 }, colors:
   { primaryForeground: "#000000", primary: "#FFFFFF", primaryHover: "#F7F7F7",
   primaryActive: "#EFEFEF" } })` returns `borderWidth: 4` and
   `borderColor: "#000000"`, so neither field is a literal.
5. **The example paints a real control** — import
   `clippedFocusedButtonStyle` and assert, for light and dark, that its
   `borderColor`/`borderWidth` equal `insetFocusRing`, its `backgroundColor`
   equals `filledControl(...).background`, and its height/padding equal the
   density helpers at `sm`/`md`/`lg` (proves the example stays a control shape).
6. **Both documents and the README name the call** — read `docs/tokens.md`,
   `docs/design-system.md` and `packages/tokens/README.md`; require
   `insetFocusRing` in each and the clause that an inset/clipped indicator is a
   border using the family's on-colour. No count is asserted; the figure lives
   in case 3.

The test must fail in both directions:

- return `{ borderColor: theme.colors.ring, borderWidth: … }` → case 2 fails on
  every set and case 3's count no longer describes the helper;
- omit the helper or either field → the suite does not compile / case 1 fails;
- remove the sentence from either document → case 6 fails.

### 2.4 `docs/tokens.md`

- **Types table**: add a row after `FilledControlStyle`:
  `| `InsetFocusRing` | The on-fill focus indicator: the family's on-colour and the outer ring's thickness. |`
- **Focus** section, after the paragraph about the slider's ring (the one that
  names `ringTrackPairs`), add:

  > A focus indicator painted **inside** a filled control is a border, not the
  > outer shadow: a clipped button group, a calendar day whose cell is the
  > fill, or a selection box cannot draw outside its own box, and `ring` is
  > designed for the surface behind a control — it meets `primary` at
  > **1.000:1** in **16** shipped sets. `insetFocusRing(theme, family)` returns
  > the family's on-colour, which the on-colour pairs already hold on the
  > resting, hover and pressed fill (4.697:1 at the tightest), at the outer
  > ring's `borderWidth.strong`. A control that already has a border applies
  > `borderColor` alone.

  Do not change the existing `focusRing` paragraph, the invalid-ring sentence or
  any ratio in the section.
- **Verification** paragraph: add `insetFocusRing` to the list of helpers the
  suite holds (the sentence that names `focusRing`/`nativeFieldTheme`/… if it is
  a derived list; if the list is guarded, follow its form).

### 2.5 `docs/design-system.md`

In §7's interaction-state table, the `focus` row: after the `focusRing(theme)`
clause, add: “a ring painted inside a filled control — a clipped group member or
a selected calendar day — uses `insetFocusRing(theme, family)`, the family's
on-colour at `borderWidth.strong`, because `ring` meets `primary` at 1.000:1 in
the shipped sets.” In the focus prose below the table, add one sentence that
a border is the only inset indicator the runtime can draw (`boxShadow` has no
inset flag). No colour, pair or floor moves.

### 2.6 `packages/tokens/README.md`

In **Focus**, after the `focusRing` example paragraph, add:

```tsx
import { getTheme, insetFocusRing } from "@gpuixui/tokens";

const ring = insetFocusRing(getTheme("dark"), "primary"); // the family's on-colour
```

and one sentence: “A control that clips its shadow, or paints the ring inside a
filled cell, uses this border instead: `ring` is designed for the surface behind
a control and is 1.000:1 on `primary` in the shipped sets.”

### 2.7 `COMPONENTS.md`

In the **Focus state** row, append: “A ring painted inside a filled control is
`insetFocusRing(theme, family)`: the family's on-colour at
`borderWidth.strong`, measured on the resting, hover and pressed fill
(4.697:1 at the tightest), because `ring` is 1.000:1 on `primary` in twelve
shipped sets (plan 609).” Touch no other row.

### 2.8 `TODO.md`

Add a ticked row at the end of the tokens-theme list:

> `[x]` Ship the inset focus indicator — a clipped ButtonGroup, a selected
> calendar day and a pressed selection control paint their ring on the control's
> own fill, where `ring` is **1.000:1** on `primary` in sixteen shipped sets and
> never above 1.374:1; `insetFocusRing(theme, family)` returns the family's
> on-colour at `borderWidth.strong` (4.697:1 at the tightest on a fill), the
> three cross-team rows can point at one call, and no colour, pair, floor,
> metric or shipped theme moves (plan 609)

Then update the three cross-team rows that prescribe the workaround
(`primitives` clipped ButtonGroup ring, `components` DatePicker today ring,
`primitives` pressed selection control) to name `insetFocusRing(theme, family)`
as the designed replacement, keeping their diagnoses and evidence intact. Do not
tick them — the consumer change is still theirs.

### 2.9 `.agents/slop/plans/README.md`

Add after the 607 row:

```
| [609](./609-inset-focus-ring.md) | The focus indicator on a filled control | F | 017, 085, 097, 327, 338, 340, 394, 605 | done |
```

Do not renumber any existing row.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. `nub run --filter @gpuixui/tokens test`
   → 158 files and every test green. Expected failure before the implementation:
   the new suite does not compile (`insetFocusRing` is absent); after adding the
   helper returning `ring`, cases 2 and 3 fail.
2. `nub run check`
   → `check:tests`, lint, format and type-check green. The docs value and type
   coverage, snippet, example and JSDoc guards are part of this run.
3. `nub run lint`
4. `nub run test` (the workspace gate for the commit).

## 4. STOP conditions

- **STOP** if any shipped theme's family foreground misses its on-colour floor on
  a fill. The helper is then not a valid ring; report the set and do not move a
  colour without a plan.
- **STOP** if `ring` clears the 3:1 boundary on a filled family in a shipped
  set — the premise of the unit is then false for that set; report it.
- **STOP** if `check:tests` rejects a new case as unable to fail. Case 2 fails
  when the helper returns `ring`; case 6 fails when a document loses the
  sentence. Do not add `check-tests-ok`.
- **STOP** if a docs guard needs a pair, floor or metric to change. Nothing
  numeric moves here.
- **DO NOT** claim the inset ring was seen in the native runtime. It is covered
  by the token suite; the native proof is the consumer rows' playground work.

## 5. Test plan — both directions

1. Change the helper to return `theme.colors.ring` → case 2 fails in every set
   (and the 1.000 count no longer describes it).
2. Omit `borderWidth` → the suite does not compile / case 1 fails.
3. Remove the Focus sentence from `docs/tokens.md` → case 6 fails.
4. Remove the §7 clause from `docs/design-system.md` → case 6 fails.
5. Remove the README paragraph → case 6 fails.
6. Change `borderWidth.strong` in the copied theme → case 4 fails if the helper
   uses a literal.
7. Change the example's height to a literal → case 5 fails.

Manual both-directions check (the repo's `verify-two-directions.sh` is still
jj-based, see the harness TODO): make change 1, run
`nub run --filter @gpuixui/tokens test`, observe case 2 fail, restore; make
change 3, run again, observe case 6 fail, restore. State both runs in the commit
body or the audit note.

## 6. Acceptance

- `insetFocusRing(theme, family)` and `InsetFocusRing` are exported and
  documented in the catalogue's Types table and Focus section, the design
  system, the README and the Focus state row.
- The suite derives every field from all 24 shipped sets, proves the helper
  clears the boundary on all three fills, and pins the `ring` failure it
  replaces (sixteen sets at 1.000:1 on `primary`).
- A runnable `inset-focus-ring.example.ts` paints a real clipped control and is
  imported by the suite.
- No colour, pair, floor, pair count, metric or shipped theme changes; the three
  cross-team rows name the helper as the designed replacement and stay open.
- `nub run check`, `nub run lint` and `nub run test` pass.

# 539 — The disabled dim's documented figure

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth) |
| Owner | `tokens-theme` — `packages/tokens`, `docs/tokens.md`, `docs/design-system.md` |
| Depends on | 306 (the inactive state), 336 (quoted-figure guards), 537/538 (the figures table) |
| Status | todo |

Three present-tense claims about the disabled state are wrong or unguarded, and
the state they describe is the one every consuming control actually paints:

- `docs/design-system.md` §8 says a filled primary action at 50% opacity
  measures **2.25:1** on the light canvas; the composition measures **1.575:1**
  on the identity light canvas and **1.468:1** at worst (Linux light, a card).
- `docs/design-system.md` §9 repeats the same 2.25:1.
- `docs/tokens.md` says a disabled field "reads `disabledForeground`". The
  shipped primitives dim the whole field with `opacity: 0.5`, so its typed text
  is `inputForeground` composited at 50% and measures **3.273:1** at worst
  (macOS light, the `input` fill) — under both the body and the secondary floor
  — and `disabledForeground` is never painted by a field.

None of the three figures is derived by a test, which is why they drifted while
every gate stayed green. This plan states the composition precisely, derives the
three figures from `shippedThemes`, ships a copyable designed replacement, and
changes **no** colour value, pair, floor or check.

## 1. Evidence

### 1.1 What `opacity` does in the runtime

GPUI's `opacity` is a **group** composite, not a per-primitive alpha:

> `fn opacity` — "Sets the opacity of this element and its children, composited
> together as one group."
> `references/gpui-ce/crates/gpui/src/styled.rs:968`

GPUix passes `StyleDesc.opacity` straight to it
(`references/gpuix/packages/native/src/renderer.rs:6504`:
`el = el.opacity(opacity as f32)`). So a control at 50% opacity paints

```
fill'  = compositeOver(alpha(fill,  0.5), panel)
label' = compositeOver(alpha(label, 0.5), fill')
```

and the label ratio is `contrastRatio(label', fill')` — the label is dimmed
against its own dimmed fill. The shipped consumers set `opacity: 0.5` on the
control root: `components/packages/components/src/internal/button.tsx:139`
(`disabledStyle`), `primitives/packages/primitives/src/core/style.ts:119`,
`:471`, `:607`, `core/select.ts`/`menu/item.tsx`/`list.tsx`/`tabs.tsx`/
`accordion.tsx`/`combobox.tsx`/`search-input.tsx` (plan 306 §1(b)).

### 1.2 Measured, all 24 shipped sets

Derived with `compositeOver`, `alpha` and `contrastRatio` over `shippedThemes`:

| Composition | Worst | Where |
| ----------- | ----- | ----- |
| `primaryForeground` dimmed on a dimmed `primary`, canvas | **1.509:1** | Linux light |
| `primaryForeground` dimmed on a dimmed `primary`, card | **1.468:1** | Linux light |
| `destructiveForeground` dimmed on a dimmed `destructive`, card | 1.527:1 | identity light |
| `secondaryForeground` dimmed on a dimmed `secondary`, background | 2.835:1 | identity light |
| `foreground` dimmed on the canvas (ghost) | 3.199:1 | Windows XP light |
| `inputForeground` dimmed on `input` (a disabled field) | **3.273:1** | macOS light |
| identity light `primary` dimmed, canvas (the sentence's set) | **1.575:1** | identity light |
| designed `disabledForeground` on `disabled` | **5.076:1** (tightest) | Windows 7 light |

The dim misses the `inactive` floor in **24 of 24** shipped sets for `primary`
and `destructive`, in **7 of 24** for `secondary` (2.835:1 at worst, 5.262:1 at
best — a dim's readability is a property of the panel, not the control) and in
**6 of 24** for the ghost, all of them AAA. The dimmed field misses the 7:1 body
floor everywhere. The designed pair clears its floor in every set, so nothing
about the *palette* needs to change — the consumer does.

The plan-306 figure of 2.25:1 has no derivation in the current palette: the
"opaque label over the dimmed fill" model gives 2.335 (light) and 3.053 (dark);
the group model gives 1.575 (light) and 1.862 (dark). 3.05 matches the dark
figure plan 306 quoted, so the plan used the opaque-label model and the light
number was never exact; under the runtime's group model both are optimistic.

## 2. Design decisions

1. **State the composition, not just a number.** The sentence names the model —
   an element and its children composite as one group — so a reader can
   recompute it. A bare ratio invited the drift.
2. **Derive the three figures.** Extend `figures.ts` with a `"dim"` figure kind
   and a `panel` field; the three sentences join `documentedFigures`, so
   `figures.test.ts` derives each from `shippedThemes` and fails when a palette
   edit or a document edit moves one.
3. **No contrast pair.** A pair for `primaryForeground` over
   `alpha(primary, 0.5)` would bless a composition no palette can make pass
   (plan 338's precedent). The designed pair (`inactivePairs`) is already
   measured; the dim stays a TODO row plus evidence.
4. **Ship the replacement as an executed example, not API.** `disabledPaint`
   returns the three roles and `opacity: 1`; a consumer copies it. No new public
   export, so no index or docs type table changes.
5. **Do not rewrite plan 306.** Plans are history; the current documents are
   corrected, and the TODO row carries the corrected evidence for the consumer.

## 3. Exact changes

### 3.1 `packages/tokens/src/figures.ts`

1. Extend the kind union:

   ```ts
   export type FigureKind =
     | "plain"
     | "selection"
     | "overlay"
     /** An element at `disabledDimOpacity` over a panel: its fill and its
      * label composite as one group. */
     | "dim";
   ```

2. Add to `DocumentedFigure`:

   ```ts
   /** The panel a `"dim"` composition sits on; the pair's background is the fill. */
   readonly panel?: keyof ThemeColors;
   ```

3. Add the fraction and the measurement:

   ```ts
   /** The opacity every shipped consumer dims a disabled control with. */
   export const disabledDimOpacity = 0.5;
   ```

   `measure` gains a `panel` argument (`keyof ThemeColors | undefined`) and a
   `"dim"` case:

   ```ts
   case "dim": {
     if (panel === undefined) return Number.NaN;
     const fill = compositeOver(alpha(colors[background], disabledDimOpacity), colors[panel]);
     const label = compositeOver(alpha(colors[foreground], disabledDimOpacity), fill);
     return contrastRatio(label, fill);
   }
   ```

   `within` passes `entry.panel`. Import `alpha` from `./color.js`.

4. Three entries appended to `documentedFigures` (before the track figures, so
   the table reads in documentation order — the design system is quoted first):

   ```ts
   const disabledDimFigures: ReadonlyArray<DocumentedFigure> = [
     {
       document: "docs/design-system.md",
       name: "the disabled primary action, dimmed on the identity light canvas",
       pairs: [["primaryForeground", "primary", "secondary"]],
       kind: "dim",
       panel: "background",
       claim: "value",
       provenance: identityTheme("light", "default"),
       decimals: 3,
       sentence:
         "A filled primary action at 50% opacity measures **{figure}:1** on the identity light canvas",
     },
     {
       document: "docs/design-system.md",
       name: "the disabled primary action, dimmed on the worst shipped card",
       pairs: [["primaryForeground", "primary", "secondary"]],
       kind: "dim",
       panel: "card",
       claim: "tightest",
       provenance: platformTheme("linux", "light", "default"),
       decimals: 3,
       sentence:
         "the primary label measures **{figure}:1** on a Linux light card",
     },
     {
       document: "docs/tokens.md",
       name: "the disabled field's typed text, dimmed on its input fill",
       pairs: [["inputForeground", "input", "body"]],
       kind: "dim",
       panel: "input",
       claim: "tightest",
       provenance: platformTheme("darwin", "light", "default"),
       decimals: 3,
       sentence:
         "the shipped primitives still dim the field at 50%, which measures **{figure}:1** on the macOS light `input` fill",
     },
   ];
   ```

   `documentedFigures` becomes
   `[toastToneFigure, ...inactivePanelActionFigures, ...disabledDimFigures, trackSurfaceFigure, trackSelectedFigure]`.

5. JSDoc on the union member and `disabledDimOpacity` names the GPUI group model
   and the consumer sites, so the model is not folklore.

### 3.2 `packages/tokens/src/disabled-state.example.ts` (new)

```ts
/**
 * The inactive state an edited theme can own: roles, not a fade.
 *
 * The shipped component packages still reach the state with `opacity: 0.5`,
 * which composites the label with its own dimmed fill (1.468:1 at worst, Linux
 * light, a card). A control that paints these three roles instead keeps its
 * label at the inactive floor and its edge on the fill.
 */
import type { Theme } from "./theme.js";

/** The style properties a disabled control paints. */
export interface DisabledPaint {
  readonly opacity: number;
  readonly backgroundColor: string;
  readonly color: string;
  readonly borderColor: string;
}

/** The designed disabled state for a control on a normal panel. */
export const disabledPaint = (theme: Theme): DisabledPaint => ({
  opacity: 1,
  backgroundColor: theme.colors.disabled,
  color: theme.colors.disabledForeground,
  borderColor: theme.colors.border,
});
```

Named imports only; no JSX, no React.

### 3.3 `packages/tokens/src/disabled-state.test.ts` (new)

Header comment states the bug: the documents quoted 2.25:1 for a composition
that measures 1.468:1 at worst and 3.273:1 for a dimmed field, and the shipped
consumers dim with `opacity: 0.5` instead of the measured `disabled` /
`disabledForeground` pair.

Cases:

1. `paints the designed roles` — `disabledPaint(getTheme("light"))` equals
   `{ opacity: 1, backgroundColor: "disabled", color: "disabledForeground",
   borderColor: "border" }` resolved from the theme, for light and dark.
2. `holds the designed pair to the inactive floor` — every shipped set:
   `contrastRatio(disabledForeground, disabled)` is at least
   `contrastFloors[theme.contrast].inactive`.
3. `the dimmed label misses the floor` — `primary` and `destructive` miss the
   inactive floor in every shipped set; `secondary`'s minimum is under it while
   its maximum is over it (the readability depends on the panel); the ghost
   clears the default floor and misses AAA; the dimmed field misses the body
   floor everywhere. This is the case that fails if someone "fixes" the palette
   so the dim passes while the documents still call it unreadable.
4. `the example is the pair the contract measures` —
   `themeContrastFailures` does not report the pair `disabledForeground` on
   `disabled` for the example's roles (i.e. the example's pair is inside the
   published contract).

### 3.4 `docs/design-system.md`

§8, the inactive paragraph, last sentence:

```
A filled primary action at 50% opacity measures **1.575:1** on the identity
light canvas, which is the state a designed pair replaces: GPUI composites an
element and its children as one group, so the label is dimmed with the fill it
sits on, not only the fill.
```

§9, the paragraph that begins "The disabled label is still read": replace
"(a disabled primary action measures 2.25:1 on the light canvas)" with the
derived worst case and the design reference:

```
(a disabled primary action's label measures **1.468:1** on a Linux light card,
under the 3:1 floor)
```

and keep the sentence's claim that the designed pair is what a control should
paint. Also link the executed example by relative path, as the package's other
examples are linked:
`[`src/disabled-state.example.ts`](../packages/tokens/src/disabled-state.example.ts)`.

### 3.5 `docs/tokens.md`

In the body-text paragraph (the sentence "a disabled field is deliberately out
of scope — it reads `disabledForeground`, which plan `306` measures"), replace
it with:

```
a disabled field is out of scope for these body pairs because the designed
state reads `disabledForeground`, which `inactivePairs` measures — the shipped
primitives still dim the field at 50%, which measures **3.273:1** on the macOS
light `input` fill, under both the body and the secondary floor — while a field
inside a row is measured on the four row washes (plan `527`).
```

Link the example from the `## Using tokens in components` rule list ("an
inactive control paints roles, not a fade — copy
`src/disabled-state.example.ts`"), and add no new table row or type.

### 3.6 `packages/tokens/README.md`

In the paragraph that says "A disabled control is not an `opacity: 0.5`
composite; it paints the designed pair and the edge", add one clause naming the
measured cost and the example:

```
the dim measures **1.468:1** at worst (Linux light, a card); copy
`src/disabled-state.example.ts` for the three roles.
```

### 3.7 `COMPONENTS.md`

No design-system row claims the dim is designed: the `Design tokens` row names
the `disabled` role (plan 306) and the `Theme contrast check` row scopes the
checker to *pairs*, which the dim is not. Add one clause to the
`Theme contrast check` row so the ledger names the measured composition the
checker cannot see:

```
the `opacity: 0.5` dim the consumer packages still paint is not a pair — it
measures 1.468:1 at worst (Linux light, a card) — and stays a cross-team row
(plan 539)
```

No other row changes.

### 3.8 `TODO.md`

- Add and tick a workstream row for this plan; move the section bar from
  `203/269` to `204/270`.
- Correct the existing cross-team row (owner `primitives` and `components`,
  plan 306): replace "a disabled primary action measures 2.25:1 on the light
  canvas" with the group-model evidence — the label measures **1.575:1** on the
  identity light canvas and **1.468:1** on a Linux light card, a disabled
  field's typed text measures **3.273:1** on the macOS light `input` fill — and
  name `src/disabled-state.example.ts` as the three roles to copy. Keep the row
  open.

### 3.9 `.agents/slop/plans/README.md`

Add the plan to the `tokens-theme` table after `538`, and one paragraph to the
prose that follows it.

## 4. Exact commands

```sh
nub run --filter @gpuixui/tokens test          # expected: exit 0, 128 files green
nub run --filter @gpuixui/tokens check-types   # expected: exit 0
nub run check:tests                            # expected: exit 0
nub run lint                                   # expected: exit 0
nub run check                                  # expected: exit 0
nub run test                                   # expected: exit 0, 128 files
```

## 5. Test plan — prove both directions

1. Land `figures.ts`, the example and `disabled-state.test.ts` **without** the
   document edits; run the tokens suite. Expected: the three new
   `figures.test.ts` cases fail ("must quote <figure>:1"), the
   `disabled-state.test.ts` cases pass.
2. Edit the three sentences; run again. Expected: green.
3. Temporarily change one quoted figure in `docs/design-system.md` (e.g.
   `1.468` → `2.468`) and run `figures.test.ts`. Expected: the
   "disabled primary action, dimmed on the worst shipped card" case fails.
   Revert.
4. Temporarily set `disabledForeground` to `disabled` in `lightColors`; run
   `disabled-state.test.ts`. Expected: `holds the designed pair to the inactive
   floor` fails. Revert with `git checkout -- packages/tokens/src/color.ts`.
5. Temporarily drop the `"dim"` case from `measure`; run the suite. Expected:
   the three dim figures derive `NaN` and their cases fail (the guard is not a
   tautology). Revert.
6. Delete `zz-audit` scratch if present; confirm `git status` is clean apart
   from this plan's files.

## 6. STOP conditions

Stop and report if:

- a shipped set's designed pair (`disabledForeground` on `disabled`) misses the
  inactive floor — the palette needs a fix before the documents can claim it;
- a document already quotes the derived figures (the defect would be gone and the
  plan re-scoped);
- the fix would require editing `packages/components` or `packages/primitives`
  — other workstreams; record in `TODO.md`;
- any change would move a colour value, a contrast pair, a floor or a check —
  this plan is prose, a test-shaped figure kind and one example;
- the group model cannot be evidenced from the reference runtime — then the
  figure must be stated as the opaque-label model instead, and the plan's
  numbers change;
- a command in §4 fails for a reason other than the new assertions.

## 7. Acceptance criteria

- The three sentences state the composition and the derived figures; no page
  quotes 2.25:1 or claims a disabled field reads `disabledForeground`.
- `figures.ts` has the `"dim"` kind, `disabledDimOpacity` and the three entries;
  `figures.test.ts` derives each figure and fails on a document edit.
- `disabled-state.example.ts` and `disabled-state.test.ts` exist and were run;
  the example is imported by the suite and linked from `docs/tokens.md` and
  `docs/design-system.md`.
- `COMPONENTS.md` names the measured dim in the `Theme contrast check` row;
  `TODO.md` carries the corrected cross-team evidence and the new ticked row.
- Every command in §4 passes.

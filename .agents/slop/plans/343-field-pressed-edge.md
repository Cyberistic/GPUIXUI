# Plan 343 — The field's pressed edge is not in the public contract

**Phase:** F · **Owner:** `tokens-theme` · **Status:** ready
**Depends on:** 071 (the public contract), 084 (`borderStrong` on `input`),
325 (the invalid field edge), 340 (the `destructive` ring), 341/342 (the last
pairs added).
**Owns:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/contrast.test.ts`,
`packages/tokens/src/field-pressed-edge.test.ts` (new),
`packages/tokens/src/invalid-field-edge.test.ts`,
`packages/tokens/src/docs.test.ts`,
`packages/tokens/src/inventory.test.ts`,
`packages/tokens/README.md`,
`docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

`contrast.ts` is the contract a **consumer** runs:
`themeContrastFailures(theme)` must return every documented pair the theme
misses. Four field edges are already in it:

- `border` on the resting `input` fill (`fieldEdgePairs`, plan 312);
- `destructive` on `input` and on `background` for an invalid field
  (`invalidEdgePairs`, plan 325);
- `borderStrong` on `input` for a hovered field (the `boundary` class);
- `ring` on the eight surfaces a **focus shadow** sits on, plus the four soft
  status fills (`ringPairs`, `ringSoftPairs`, plans 086 and 093).

`packages/primitives/src/core/variants.ts` has four field states:

```ts
export const fieldVariant: ControlVariant = {
  background: (theme) => theme.colors.input,
  foreground: (theme) => theme.colors.inputForeground,
  border: (theme) => theme.colors.border,
  hover: (theme) => ({ borderColor: theme.colors.borderStrong }),
  active: (theme) => ({ borderColor: theme.colors.ring }),
};
```

`controlStyle` (`packages/primitives/src/core/style.ts`) paints `variant.active`
on press, so a pressed field's border is `ring` **on the field's own `input`
fill**. That composition has no pair. A consumer theme whose `ring` equals
`input` returns `[]` from `themeContrastFailures` while its pressed field has no
visible edge — the same class of gap plans 335 and 339 closed.

The hover edge is already measured (`borderStrong` on `input`, boundary class),
so the field's two pointer edges are asymmetric for no reason.

Every shipped set already passes the missing pair, so this plan moves **no
colour**: the tightest is the identity light theme at **4.218:1**, and the AAA
sets are above 8:1. The floor is the `boundary` class (3:1, 4.5:1 at AAA), the
same one the hover edge and `borderStrong` on `input` already use.

The same audit found a **real defect in `primitives`**, not a missing pair:
`controlStyle` sets `backgroundColor: rest`, and `rest` is
`theme.colors.destructive` when `spec.invalid === true`. An invalid
`Input`/`TextArea`/`Select` therefore paints a **solid `destructive` surface**
behind `inputForeground` text, and its `hover`/`active` variants replace the
error border with `borderStrong`/`ring`. Measured on the shipped sets:

| pair | tightest | widest |
| ---- | -------- | ------ |
| `inputForeground` on `destructive` | **1.97:1** (both AAA dark) | 3.48:1 (Aero light) |

under the 4.5:1 secondary / 7:1 body floor, while the documented invalid state
is "a `destructive` edge on the `input` fill" (`docs/design-system.md` §8). The
designed tinted alternative already exists and is measured at 7:1
(`destructiveSoftForeground` on `destructiveSoft`). The fix belongs to
`primitives`, so it is recorded as a cross-team `TODO.md` row with this
evidence; no tokens colour can make a solid `destructive` fill carry the light
mode's dark `inputForeground`.

## 2. Files and exact changes

### 2.1 `packages/tokens/src/contrast.ts`

1. Add a named list beside `fieldEdgePairs` (after it, before
   `invalidEdgePairs`):

   ```ts
   /**
    * The field's pressed edge. `fieldVariant.active` in `primitives` repaints the
    * field border with `ring` on the `input` fill, the way `hover` repaints it
    * with `borderStrong`; the role is a control boundary here, not a shadow
    * outside the control.
    */
   const fieldPressedEdgePairs: readonly ContrastPair[] = [
     ["ring", "input", "boundary"],
   ];
   ```

2. Spread it into `contrastPairs` immediately after `...fieldEdgePairs,`:

   ```ts
   ...fieldEdgePairs,
   ...fieldPressedEdgePairs,
   ```

3. Extend the big JSDoc block above `contrastPairs` (the paragraph that ends
   "an invalid field's `destructive` edge is a boundary pair on that fill and on
   the `background` canvas a transparent field paints.") with one sentence:

   > A field's pressed border is `ring` on that same `input` fill — the hover
   > edge is `borderStrong` — so the ring's shadow surfaces and its one control
   > edge are both measured.

   Keep the line width of the surrounding prose.

### 2.2 `packages/tokens/src/contrast.test.ts`

1. Append to the header comment (after the plan 342 paragraph):

   ```
    * Plan 343 closes the field's pressed edge: `fieldVariant.active` repaints a
    * field border with `ring` on the `input` fill, but the contract measured
    * `ring` only where a focus shadow sits — outside the control. Every shipped
    * set already clears the boundary floor there (identity light is tightest at
    * 4.218:1), so no colour moves.
   ```

2. Change the exact-size assertion in `"covers every documented pair"` from
   `expect(contrastPairs.length).toBe(314)` to `315`.

3. Do **not** add a new assertion there for the pair; the new file owns it.

### 2.3 `packages/tokens/src/field-pressed-edge.test.ts` (new)

Header comment states the bug being guarded, in the house style:

```
/**
 * Guards the defect plan 343 fixes: a pressed field repaints its border with
 * `ring` on its own `input` fill (`fieldVariant.active` in `primitives`), but
 * the contract measured `ring` only on the surfaces a focus shadow sits on —
 * outside the control. An edited theme whose `ring` equalled `input` could
 * therefore erase the pressed edge while `themeContrastFailures` returned `[]`.
 *
 * The hover edge (`borderStrong` on `input`) was already a boundary pair, so
 * this file closes the asymmetric half.
 */
```

Imports: `contrastFloors`, `contrastPairs`, `contrastRatio`, `extendTheme`,
`getPlatformRecipeTheme`, `getPlatformTheme`, `getTheme`, `platformRecipeNames`,
`themeContrastFailures`, `themeContrasts`, `themeModes`, `type Theme` from
`./index.js`.

Build the variant list the same way `invalid-field-edge.test.ts` does (identity
+ the three platform styles + both recipes, both modes, both contrast levels; 24
sets).

Cases:

1. `"publishes the field's pressed edge as one boundary pair"`
   - filter `contrastPairs` for `foreground === "ring" && background === "input"`;
   - expect exactly one entry, `pairClass === "boundary"`.

2. `"keeps every shipped theme's pressed edge perceivable"`
   - for each variant, `contrastRatio(theme.colors.ring, theme.colors.input)`
     must be `>= contrastFloors[theme.contrast].boundary`;
   - collect failures as `` `${label}: ring on input at ${ratio}` `` and expect
     `[]`.

3. `"reports an edited theme whose pressed edge matches the field"`
   - `const base = getTheme("light"); const regressed = extendTheme(base, { colors: { ring: base.colors.input } })`;
   - filter `themeContrastFailures(regressed)` for the `ring`/`input` pair;
   - expect one failure with `pairClass: "boundary"`, `floor: 3`, `ratio: 1`.

4. `"keeps the focus shadow and the pressed edge distinct"` (truth guard)
   - expect `contrastPairs` to contain `["ring", "card", "boundary"]` (the focus
     shadow on the card) **and** `["ring", "input", "boundary"]` (the pressed
     edge), so a future refactor cannot merge the two lists and lose the
     distinction the docs make.

### 2.4 `packages/tokens/src/invalid-field-edge.test.ts`

Add a fourth case, `"pins why the solid destructive fill cannot carry field
text"`, with a comment naming plan 343 and the `primitives` defect:

- for every variant, `contrastRatio(theme.colors.inputForeground,
  theme.colors.destructive)` must be **below**
  `contrastFloors[theme.contrast].secondary`;
- `contrastRatio(theme.colors.destructiveSoftForeground,
  theme.colors.destructiveSoft)` must be **at or above**
  `contrastFloors[theme.contrast].body`;
- collect both failure lists and expect `[]`.

This is deliberately a limitation test: if a palette change ever makes a solid
`destructive` fill able to carry field text, it fails and the `TODO.md` row and
`docs/design-system.md` must be revisited. It also pins the measured alternative
the cross-team row recommends.

### 2.5 `packages/tokens/src/docs.test.ts`

1. In the `"focus ring surfaces"` case (the long expected sentence around the
   text `A field's own \`input\` fill`), replace

   > A field's own `input` fill and a control's `secondary` fill are what the
   > ring surrounds, not what it sits on, so they are deliberately not ring
   > surfaces.

   with the updated docs wording (2.7 below), keeping the rest of the expected
   string byte-identical.

2. In `"ends the pair-count history at the contract's shipped size"`, change the
   anchor from `` `taking it from 306 to **${contrastPairs.length}**` `` to
   `` `taking it from 314 to **${contrastPairs.length}**` ``, so it keeps
   deriving the final number from the contract.

3. In `"names the audit series through the latest plan"`, change
   `` plans `076`–`342` closed `` to `` plans `076`–`343` closed ``.

4. Add a case to `docs/tokens.md` contract checks:

   ```ts
   it("states the pressed field edge on the input fill", () => {
     expect(markdownProse).toContain(
       "a pressed field repaints its border with `ring` on its own `input` fill",
     );
     expect(markdownProse).toContain(
       "The pressed edge is `ring` on the same `input` fill",
     );
   });
   ```

5. In the `docs/design-system.md` §9 row array, update the focus-row expected
   string to include `the field's pressed edge (\`ring\` on \`input\`)` at the
   place the docs put it (see 2.8).

### 2.6 `packages/tokens/src/inventory.test.ts`

Read the file before editing. If a row string quotes the pair count or the focus
row, add the new phrase exactly as the ledger has it (2.9). If it derives counts
from the contract, only the ledger text needs the change. Run the suite to
confirm.

### 2.7 `docs/tokens.md`

1. In the focus-ring paragraph at the end of the contrast section, replace the
   sentence about the field's own `input` fill with:

   > A field's own `input` fill and a control's `secondary` fill are what the
   > focus shadow surrounds, not what it sits on, so they are not
   > `ringSurfaces`. The ring role has one other job: a pressed field repaints
   > its border with `ring` on its own `input` fill, the way hover repaints it
   > with `borderStrong`, so that control edge is a `boundary` pair
   > (`fieldPressedEdgePairs`, plan `343`).

2. Append to the history paragraph (after "taking it from 306 to **314**."):

   > Plan `343` holds the field's pressed edge — `ring` on the `input` fill —
   > taking it from 314 to **315**.

3. Change `plans \`076\`–\`342\` closed` to `plans \`076\`–\`343\` closed`.

4. Add one sentence to the field-edge paragraph: "The pressed edge is `ring` on
   the same `input` fill, measured at the boundary floor; the hover edge is
   `borderStrong`."

### 2.8 `docs/design-system.md`

1. §8, after the paragraph that starts "Focus never changes layout", add:

   > A field is not a filled action: at rest its edge is `border`, under the
   > pointer `borderStrong`, and while pressed `ring`, all three painted on its
   > own `input` fill. The focus shadow still surrounds the field, so the two
   > uses of the ring role are measured separately: the shadow on the surface
   > behind the control, the pressed edge on the field's fill.

2. §9, in the focus/boundary row, add "the field's pressed edge (`ring` on
   `input`)" beside the existing invalid field edge phrase:

   `... plus the invalid field edge (\`destructive\` on \`input\`/\`background\`) and the field's pressed edge (\`ring\` on \`input\`) | 3:1 | 4.5:1 |`

3. Keep the §8 invalid sentence ("a `destructive` edge on the `input` fill")
   unchanged — it is the documented contract the `primitives` defect breaks; the
   cross-team row carries the evidence.

### 2.9 `COMPONENTS.md`

1. In the **Theme contrast check** row:
   - change "the same 314 contrast pairs" to "the same 315 contrast pairs";
   - append: "Plan 343 holds the field's pressed edge — `ring` on the `input`
     fill, the pressed counterpart to the `borderStrong` hover edge — so an
     edited theme cannot collapse the field's pointer state while the checker
     returns `[]` (314 → 315 pairs)."
2. In the **Focus state** row, append: "The same role is the pressed field
   border on the `input` fill (plan 343), measured separately from the shadow
   surfaces."

### 2.10 `packages/tokens/README.md`

In the contrast section, after the `stateStepPairs` paragraph, add:

> A field's pointer edges are both measured on its own `input` fill:
> `borderStrong` under the pointer and `ring` while pressed
> (`fieldPressedEdgePairs`). The focus shadow still sits on the surface behind
> the control; the two uses of the ring role are separate pairs.

`readme.test.ts` fails if the README drifts; run it.

### 2.11 `TODO.md`

1. In **Design tokens and theming**, add a ticked row after the plan 342 row:

   ```
   `[x]` Hold the field's pressed edge — `ring` on the `input` fill — so the
   pressed counterpart to the `borderStrong` hover edge is in the public
   contract; every shipped set already passes, so the contract grows 314 → 315
   (plan 343)
   ```

   (One logical line, wrapped like its neighbours.)

2. In the same section's cross-team rows, add an **unchecked** row:

   ```
   `[ ]` Cross-team: `primitives` must not paint an invalid field as a solid
   `destructive` surface — `controlStyle` in `src/core/style.ts` sets
   `backgroundColor: rest`, and `rest` is `destructive` when `invalid` is true,
   so an invalid `Input`/`TextArea`/`Select` paints `inputForeground` on
   `destructive` at **1.97:1** (both AAA dark) to **3.48:1** (Aero light),
   under the 4.5:1 floor, and its `hover`/`active` variants replace the error
   border with `borderStrong`/`ring`, so the error signal disappears under the
   pointer. Keep the `input` fill and the `destructive` border in every state
   (the documented invalid state), or use `destructiveSoft` +
   `destructiveSoftForeground` (measured at 7:1); `destructiveText` carries the
   message (plan 343; owner: `primitives`)
   ```

3. Do not change the progress bar unless the row count is expected to move; the
   section's bar counts finished tasks, so increment the numerator by one for
   the ticked row and leave the denominator if the ticked row replaces no row.
   Read the current `██` bar and adjust the digits so the ratio matches the
   ticked rows (the plan 342 commit did the same: `109/142` → `110/145`).

### 2.12 Plan index

In `.agents/slop/plans/README.md`:

1. Add the table row after 342:

   ```
   | [343](./343-field-pressed-edge.md) | The field's pressed edge in the public contract | F | 071, 084, 325, 340–342 | done |
   ```

2. Append the prose paragraph after the plan 342 paragraph, stating the gap,
   the measured tightest ratio (4.218:1 identity light), the 314 → 315 count,
   and the cross-team `primitives` invalid-fill finding with its 1.97–3.48:1
   range and the `destructiveSoft` alternative.

## 3. Commands

Run from the worktree root (`workspaces/tokens-theme`):

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

Expected: the package type check is clean; all tokens files pass (62 → 63 test
files with the new one, 3932 → 3936+ tests); the repo gates pass.

Run the new file alone while iterating:

```sh
cd packages/tokens && nub x vitest run src/field-pressed-edge.test.ts
```

Expected: three/four passing cases.

## 4. STOP conditions

Stop and report (do not improvise) if:

- `contrastPairs.length` is not 314 before the change — another plan landed;
  rebase and re-derive every count and anchor;
- any shipped variant fails `ring` on `input` at its declared boundary floor —
  that is a palette defect, not a contract addition; report the set and ratio
  instead of moving colour without a plan;
- the `docs.test.ts` focus-ring expected string no longer matches the document
  after the edit (a concurrent docs change) — re-read both and reconcile;
- `nub run test` fails outside `packages/tokens` for a reason unrelated to this
  plan — record it in `TODO.md` and leave it to its owner;
- `controlStyle` no longer sets `variant.active` for fields (upstream changed) —
  re-derive whether the pressed edge still exists before adding the pair.

## 5. Test plan (both directions)

- **Without the fix:** delete the new pair (or run the new file before editing
  `contrast.ts`). `field-pressed-edge.test.ts` case 1 fails (no pair) and case 3
  returns `[]` instead of the `ring`/`input` failure. Case 2 passes either way,
  which is the point: shipped themes were never the problem — the consumer
  checker was.
- **With the fix:** all three pass; `contrastPairs.length` is 315; the docs,
  ledger and README agree with the contract.
- The `invalid-field-edge.test.ts` limitation case passes before and after the
  pair (it guards the cross-team evidence, not the pair); prove it can fail by
  temporarily asserting the opposite direction locally, then restore.

## 6. Acceptance

- `themeContrastFailures` reports `ring` on `input` as a `boundary` pair for an
  edited theme that sets `ring` equal to `input`.
- Every shipped theme clears it at the level it declares, with no colour change.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
  `COMPONENTS.md` name the pressed field edge and the 315-pair contract, and
  `docs.test.ts` / `inventory.test.ts` / `readme.test.ts` hold them to it.
- The `primitives` invalid-fill defect is recorded in `TODO.md` with measured
  evidence and the designed alternative.
- `nub run check`, `nub run lint` and `nub run test` pass; the commit is on
  `agent/tokens-theme` and pushed.

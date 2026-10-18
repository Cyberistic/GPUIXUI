# 547 — The interactive-fill index retypes the families it says it derives

**Workstream:** `tokens-theme`. **Phase:** F (guard quality).
**Depends on:** 097 (the filled-control families), 309 (the fill-on-surface
pairs), 327 / 342 (the accent steps and the step contract), 502 (the direction
contract — the second consumer that derives from the family index), 546 (the
same guard-quality class, one list over).
**Files:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/state-fill-surfaces.test.ts`,
`packages/tokens/src/docs.test.ts`, `docs/tokens.md`, `COMPONENTS.md`,
`TODO.md`, this plan index.

## 1. The defect

`docs/tokens.md` publishes an extensibility guarantee:

> `stateFillRoles` is the fill list and `stateFillSurfaces` the surface list, so
> a fifth surface or a new filled family joins one place.

The second half of that sentence is false. `stateFillRoles`
(`packages/tokens/src/contrast.ts:281`) is a **hand-typed 15-entry array** that
retypes the four families from `filledControlFamilies`
(`packages/tokens/src/styles.ts:143`):

```ts
export const stateFillRoles = [
  "primary", "primaryHover", "primaryActive",
  "secondary", "secondaryHover", "secondaryActive",
  "destructive", "destructiveHover", "destructiveActive",
  "accent", "accentHover", "accentActive",
  "hover", "active", "selected",
] as const;
```

Every other consumer of the family index already derives from it:

| Consumer | Derivation |
| -------- | ---------- |
| `filledControl` (`styles.ts:186`) | template-keys `${family}`, `${family}Foreground`, `${family}Hover`, `${family}Active` |
| `stateStepPairs` (`contrast.ts:356`) | `filledControlFamilies.flatMap(…)` |
| `stateLadders` (`direction.ts:32`) | `filledControlFamilies.map(…)` |
| `selectionFillRoles` (`contrast.ts:1498`) | `...filledControlFamilies` |

So a maintainer who follows the documented one-place edit — add a fifth family
to `filledControlFamilies`, give it its four roles (the type system demands
them, because `filledControl` indexes them) — gets the family's step pairs, its
direction ladder, its selection pairs and its `filledControl` helper, **but no
fill-on-surface pair**. A pressed or resting fill that matches the panel behind
it is then invisible while `themeContrastFailures` returns `[]` — the exact
defect plan 309 created these pairs for, one family over.

The test that is supposed to guard the list repeats the families by hand too
(`state-fill-surfaces.test.ts:47-61`: `filledRoles`), so it cannot see a fifth
family either. The documentation sentence is the only place the promise is
written down, and nothing holds it.

This is the plan-546 class: a hand-typed inventory behind a documented
derivation. There, the inventory was the pair-list uniqueness check; here it is
the fill list. No shipped value is wrong — all four shipped families are named
— so the unit is guard-only and no colour, pair or floor moves.

## 2. The rule to state

**The family index owns the family fills.** `stateFillRoles` derives every
filled family's rest, hover and press from `filledControlFamilies`, then appends
the two generic washes and `selected`. Adding a family to the index adds its
three fills to the contract with no second edit; adding a surface to
`stateFillSurfaces` does the same for the surface half. The documentation names
both owners.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts` — derive the list

Replace the hand-typed `stateFillRoles` (currently lines 281-298, from
`export const stateFillRoles = [` through `] as const;`) with:

```ts
export const stateFillRoles = [
  ...filledControlFamilies.flatMap((family) => [
    family,
    `${family}Hover`,
    `${family}Active`,
  ]),
  "hover",
  "active",
  "selected",
] as const;
```

The order is unchanged — `filledControlFamilies` is
`["primary", "secondary", "destructive", "accent"]`, which is the order the hand
list wrote — so `stateFillSurfacePairs` stays 60 entries in the same order and
no document figure moves.

Extend the existing doc comment above it by one sentence, after the list
description:

> The four designed families' rest, hover and press are derived from
> `filledControlFamilies`, so a fifth family joins the family index alone.

Do **not** add a type annotation unless §4.4 fails without it. The derived
values are template-literal keys of `ThemeColors`; if TypeScript cannot see them
as such, stop and report (§6) rather than asserting.

### 3.2 `packages/tokens/src/state-fill-surfaces.test.ts` — derive the guard

1. Import the family index:

```ts
import { filledControlFamilies } from "./index.js";
```

2. Replace the `it("holds the filled-action families, not only the neutral
   washes", …)` case (currently lines 46-62) with:

```ts
  it("derives every filled family's three fills from the family index", () => {
    expect(stateFillRoles).toEqual([
      ...filledControlFamilies.flatMap((family) => [
        family,
        `${family}Hover`,
        `${family}Active`,
      ]),
      "hover",
      "active",
      "selected",
    ]);
  });
```

The case fails if the list is ever reverted to a hand-typed array that omits a
family the index ships; the pre-fix direction is proved with the fifth-family
probe in §4.2-4.3.

3. Update the file header with one sentence, after the existing paragraph:

```
 * Plan 547 derives the fill list from `filledControlFamilies`: the hand list it
 * replaced omitted any family added to the index, so the fill-on-surface pairs
 * 309 introduced could skip a new family with every case green.
```

### 3.3 `docs/tokens.md` — state the owner

Replace the sentence at line ~2972:

> `stateFillRoles` is the fill list and `stateFillSurfaces` the surface list, so a
> fifth surface or a new filled family joins one place.

with:

> `stateFillRoles` derives every filled family's rest, hover and press from
> `filledControlFamilies` and adds the two generic washes and `selected`;
> `stateFillSurfaces` is its surface list, so a fifth family joins the family
> index alone and a fifth surface joins the surface list alone.

The "fifteen fills" count and every ratio in the paragraph stay as they are:
the derived list is still 15 entries and the pairs still 60.

### 3.4 `packages/tokens/src/docs.test.ts` — guard the sentence

In the `it("names every interactive fill and the surfaces it is held against",
…)` case, after `expect(markdown).toContain("stateFillRoles");`, add:

```ts
    expect(markdown).toContain(
      "`stateFillRoles` derives every filled family's rest, hover and press from\n`filledControlFamilies`",
    );
```

Match the wrapping of the paragraph exactly (the line breaks above are the ones
the document uses; confirm with `sed -n '2968,2976p' docs/tokens.md` and adjust
the string rather than rewrapping the document).

### 3.5 `COMPONENTS.md` — the ledger records the owner

In the *Theme contrast check* row, after the clause that names the pair lists,
add one sentence:

> The fifteen interactive fills are derived from `filledControlFamilies`
> (plan 547), so a fifth family's rest, hover and press join the fill-on-surface
> contract with the family index alone.

Do not change any count, floor or ratio in the row.

### 3.6 `TODO.md` — tick the unit

Add under *Design tokens and theming (`tokens-theme`)*:

```
`[x]` Make the interactive-fill contract own the families it derives from —
`docs/tokens.md` said "a fifth surface or a new filled family joins one place",
but `stateFillRoles` retyped the four families by hand, so a fifth family added
to `filledControlFamilies` gained its step pairs, direction ladder, selection
pairs and `filledControl` helper while its three fills were never measured
against a panel; `stateFillRoles` now derives from the index, the test derives
its expectation from the index too, and the catalogue names that owner
(plan 547)
```

### 3.7 Plan index

Add the row to `.agents/slop/plans/README.md` in the `tokens-theme` table:

```
| [547](./547-interactive-fill-family-index.md) | The interactive-fill index retypes the families it says it derives | F | 097, 309, 327, 342, 502, 546 | done |
```

and a short paragraph in the prose tail after the 546 entry, when the
implementation lands.

### 3.8 Audit record

Add `.agents/slop/rd/2026-10-19-tokens-next-547.md` with what landed, the queue
state and the candidates re-checked (the same shape as the earlier `rd` notes).
Record the `softSurfaceRoles` gap as the next candidate: it is the same class
one list over — a fifth status tone joins `statusTones`, `statusFillPairs` and
`selectionFillRoles`, but the private `softSurfaceRoles` retypes the four tones,
so its tint would skip about ten soft lists. It is deliberately **not** this
unit: proving it needs a fifth tone's six roles in four palettes, while this
plan's probe needs two existing status roles.

## 4. Test plan — prove both directions

1. **Baseline:** `nub run --filter @gpuixui/tokens test` → 131 files / 5641
   tests pass, exit `0`.
2. **Pre-fix probe — add a fifth family.** On the unmodified tree:
   - add `warningHover` / `warningActive` to `ThemeColors` in `color.ts`
     (after `warningForeground`) and to all four palettes
     (`lightColors`, `darkColors`, `highContrastLightColors`,
     `highContrastDarkColors`; any hex is fine, the probe is not a palette
     exercise);
   - add `"warning"` to `filledControlFamilies` in `styles.ts`.
   Then create the scratch case `src/scratch-family.test.ts`:

   ```ts
   import { describe, expect, it } from "vitest";
   import { extendTheme, lightTheme, themeContrastFailures } from "./index.js";

   describe("scratch family", () => {
     it("measures the fifth family's fill on the panel", () => {
       const edited = extendTheme(lightTheme, {
         colors: { warningHover: lightTheme.colors.background },
       });
       expect(
         themeContrastFailures(edited).filter(
           (failure) =>
             failure.foreground === "warningHover" &&
             failure.background === "background",
         ),
       ).toHaveLength(1);
     });
   });
   ```

   Run `./node_modules/.bin/vitest run src/scratch-family.test.ts`. With the
   HEAD `contrast.ts` it **fails** (`toHaveLength(1)` receives `[]`): the
   `stateStepPairs` entry is a different pair, and no fill-on-surface pair
   exists. Record the output. Delete the scratch file.
3. **Post-fix direction.** With §3.1-3.2 in place and the same fifth family
   still applied, rerun the scratch case → it **passes** (the derived role set
   includes `warningHover`, so the pair reports 1.00:1). Record the output.
4. **Revert the probe.** Remove the two roles from `color.ts` and `"warning"`
   from `filledControlFamilies`; confirm `nub run --filter @gpuixui/tokens
   check-types` passes. Do not commit any part of the probe.
5. **The derivation compiles without an assertion**: `nub run --filter
   @gpuixui/tokens check-types` → exit `0`.
6. **The documentation guard can fail:** delete the new sentence from
   `docs/tokens.md` → `nub run --filter @gpuixui/tokens test` fails the new
   `docs.test.ts` case. Restore it.
7. **The derivation guard can fail:** temporarily replace the derived
   `stateFillRoles` body with the old hand list minus `"accentActive"` →
   `state-fill-surfaces.test.ts` fails the derived-equality case. Restore.
8. **Full suite + gates:** `nub run --filter @gpuixui/tokens test` → 131 files /
   5641 tests pass (the derivation case replaces the hand-typed case, so the
   count is unchanged); `nub run check` → `check:tests`, `lint`, `fmt`,
   `check-types` pass; `nub run test` → the workspace suite passes.

## 5. Commands and expected results

```sh
cd packages/tokens
nub run test                              # 131 files, 5641 tests (baseline)
nub run check-types                       # derived list type-checks
./node_modules/.bin/vitest run src/state-fill-surfaces.test.ts
./node_modules/.bin/vitest run src/docs.test.ts
cd ../..
nub run check
nub run test
```

## 6. STOP conditions

Stop and report instead of improvising if:

- the derived array does not type-check as `keyof ThemeColors` without an
  assertion. Do **not** cast; a functional derivation (a `familyFills` helper
  typed against `FilledControlFamily`) is acceptable only if it stays
  assertion-free, otherwise report that the tuple form is not expressible.
- `stateFillSurfacePairs` changes length or order — it must stay 60 pairs in
  the documented order, or a shipped pair or document figure would move and the
  unit is no longer guard-only.
- any shipped theme, platform variant or recipe fails a pair after the change.
- `docs.test.ts` already contains a case for the old sentence (it does not as
  of plan 546; confirm before editing the document).
- `nub run check` fails for a reason unrelated to this change — record it as a
  cross-team row in `TODO.md` and stop; do not edit another workstream's file.

## 7. Acceptance criteria

- `stateFillRoles` no longer retypes the four families; its family entries
  derive from `filledControlFamilies`.
- `stateFillSurfacePairs` is still 60 pairs in the documented order, and every
  shipped set still passes all seven checks.
- A fifth family added to the index contributes its three fills to the
  fill-on-surface contract with no edit to `contrast.ts` (proved by §4.3).
- `state-fill-surfaces.test.ts` derives its expectation from the family index.
- `docs/tokens.md` states the owner and `docs.test.ts` holds the sentence.
- `COMPONENTS.md` and `TODO.md` record the unit; the plan is indexed; the `rd`
  note records the `softSurfaceRoles` candidate.
- `nub run check`, `nub run lint`, `nub run test` pass, and the commits are on
  `agent/tokens-theme` and pushed.

## 8. Rollback

Revert the commit. No runtime value moves, so a revert restores the hand-typed
15-entry list and the weaker (but currently complete) guard.

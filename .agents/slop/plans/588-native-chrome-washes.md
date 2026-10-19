# 588 — The native document's chrome washes

**Phase:** F (contract completeness)
**Depends on:** 583 (the native document fades and ink wash), 574 (the syntax
palette on every document tone), 585 (the runtime-only text metrics)
**Owner:** `tokens-theme`
**Paths:** `packages/tokens/src/native-text-check.ts`,
`packages/tokens/src/native-ink.ts`,
`packages/tokens/src/native-text-check.test.ts`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`,
`.agents/slop/plans/README.md`

## Why

`themeNativeTextFailures` (plan 583) holds the runtime's fixed fades and the
3.5% code-block ink wash, but the pinned runtime paints **three more neutral ink
washes inside a document's own chrome**, and no check measures a role on them:

| Composition | Role painted | Ink fraction | Pinned evidence |
| --- | --- | --- | --- |
| Markdown code-block language header | `textMuted` | 2% | `packages/native/src/markdown/render.rs` `.bg(ink(&theme, 0.02)).text_color(theme.text_muted)` |
| Code-block header separator | `border` | 2% | same header `.border_b_1().border_color(theme.border)` |
| Diff file header | `textMuted`, `diffAdd`, `diffDel` | 2.5% | `packages/native/src/custom_elements/diff.rs` `.bg(ink(theme, 0.025))` and its three labels |
| Diff file header under the pointer (and the show-more row) | `textMuted` (and the same two counts) | 5% | `diff.rs` `.hover(\|s\| s.bg(ink(theme, 0.05)))` |

The plan-583 list names the 3.5% code body, the 92% diff line, the 80%/50%
gutters, the 90% marker, 55% bar, 5.5% row tint, 85% list marker, 60% rail and
5% quote wash; it does not name these four chrome washes.

This is not only a documentation gap. A `border` value that clears the 1.05:1
divider floor on every plain surface can be invisible on the code header's 2%
ink: on `Dark · macOS` (`card: #2C2C2E`, white 2% ink → `#303032`), the accepted
theme `extendTheme(getPlatformTheme("macos", "dark"), { colors: { border:
"#303030" } })` measures **1.002:1** on that wash while `themeFailures` returns
`[]` today. The same theme is the regression proof.

The text roles on the diff header are held by the plain-surface and row-wash
pairs in the shipped sets, so no shipped value moves; they join the contract
because a brand theme is free to set a role exactly at its floor, and the
runtime's wash is then unmeasured.

The blockquote composition from plan 583 is deliberately **not** changed here:
the runtime sets `text_muted` on the blockquote container, and the existing
`textMuted` over the 5% accent wash at the body floor is stricter than the role's
own tier. A separate unit may reconcile it if the runtime's run colours ever
change.

## What to change

### 1. `packages/tokens/src/native-ink.ts`

Let the ink wash take a fraction, keeping the existing 3.5% default:

```ts
export function nativeInk(
  theme: Theme,
  surface: keyof ThemeColors = "card",
  opacity: number = nativeInkOpacity,
): string {
  const ink =
    relativeLuminance(theme.colors[surface]) < 0.5 ? "#FFFFFF" : "#000000";
  return compositeOver(alpha(ink, opacity), theme.colors[surface]);
}
```

Update the JSDoc: the default is the code block's 3.5% wash; a caller may name
the header/hover fraction. No behaviour change for the existing callers.

### 2. `packages/tokens/src/native-text-check.ts`

Add, beside `nativeTextOverFade`:

```ts
/** A text-theme field the runtime paints on one of its fixed neutral ink washes. */
export interface NativeTextWash {
  /** The `NativeTextTheme` field whose role is painted. */
  readonly field: keyof typeof nativeTextRoles;
  /** The fraction of black or white the runtime washes the document tone with. */
  readonly ink: number;
  /** The floor the painted pair must clear. */
  readonly pairClass: ContrastPairClass;
}

/**
 * The chrome the runtime paints on its own neutral ink washes: a code block's
 * language header (2%) and its separator, a diff file header (2.5%) and its
 * hover (5%, also the show-more row). ...
 */
export const nativeTextWashes: readonly NativeTextWash[] = [
  { field: "border", ink: 0.02, pairClass: "divider" },
  { field: "textMuted", ink: 0.02, pairClass: "secondary" },
  { field: "textMuted", ink: 0.025, pairClass: "secondary" },
  { field: "diffAdd", ink: 0.025, pairClass: "secondary" },
  { field: "diffDel", ink: 0.025, pairClass: "secondary" },
  { field: "textMuted", ink: 0.05, pairClass: "secondary" },
  { field: "diffAdd", ink: 0.05, pairClass: "secondary" },
  { field: "diffDel", ink: 0.05, pairClass: "secondary" },
];
```

In `themeNativeTextFailures`, after the over-fade arm:

```ts
const washFailures = nativeTextWashes.flatMap((wash) => {
  const role = nativeTextRoles[wash.field];
  return nativeTextSurfaces.flatMap((surface) => {
    const ratio = contrastRatio(
      theme.colors[role],
      nativeInk(theme, surface, wash.ink),
    );
    return ratio >= floors[wash.pairClass]
      ? []
      : [{
          field: wash.field,
          role,
          surface,
          opacity: 1,
          ink: wash.ink,
          pairClass: wash.pairClass,
          floor: floors[wash.pairClass],
          ratio,
        }];
  });
});
return [...fadeFailures, ...overFadeFailures, ...washFailures, ...inkFailures];
```

Update `NativeTextFailure.ink`'s JSDoc from "the code block" to "the document".
Update the `themeNativeTextFailures` JSDoc to name the chrome washes and the
`border` regression.

Do **not** change the `inkFailures` arm, the `nativeHighlight*` modules, or any
token value.

## Commands and expected results

Run from the worktree root.

1. `nub run --filter @gpuixui/tokens check-types`
   → exit 0.
2. `nub run --filter @gpuixui/tokens test -- --run src/native-text-check.test.ts`
   → the new cases pass and the shipped-set case stays green.
3. `nub run --filter @gpuixui/tokens test`
   → all suites green (149+ files).
4. `nub run check`, `nub run lint`, `nub run test`
   → exit 0 (the merge gate; run before calling the unit done).

## Test plan

All in `packages/tokens/src/native-text-check.test.ts`; update the header
comment to state the new defect.

1. **Publishes every chrome wash.** Assert the exact array:
   `["border@0.02 divider", "textMuted@0.02 secondary",
   "textMuted@0.025 secondary", "diffAdd@0.025 secondary",
   "diffDel@0.025 secondary", "textMuted@0.05 secondary",
   "diffAdd@0.05 secondary", "diffDel@0.05 secondary"]`.
   Fails if a fraction or floor is retyped.
2. **Reports a code header separator the plain pairs accept.**
   ```
   const planted = extendTheme(getPlatformTheme("macos", "dark"), {
     colors: { border: "#303030" },
   });
   expect(themeFailures(planted).filter((f) => f.kind !== "nativeText")).toEqual([]);
   const failure = themeNativeTextFailures(planted).find(
     (f) => f.field === "border" && f.ink === 0.02,
   );
   expect(failure?.pairClass).toBe("divider");
   expect(failure?.surface).toBe("card");
   expect(failure?.ratio).toBeCloseTo(1.002, 2);
   ```
   Without the fix the filter is `[]` and the `find` is `undefined`; with it the
   failure is reported. This is the two-directions proof.
3. **Every published wash can fail on its own surface.** For each entry, build
   `extendTheme(light, { colors: { [role]: nativeInk(light, "card", wash.ink) } })`
   and assert a failure with that `field`, `ink`, `pairClass` and `surface:
   "card"` exists. This proves the list is not decorative.
4. **Shipped sets stay clean.** The existing `passes every shipped set` case
   covers `shippedThemes`; keep it and do not narrow it.
5. **Names every value in the reference.** Add `nativeTextWashes` and
   `NativeTextWash` to the names case.
6. **Docs type index.** Add a `| `NativeTextWash` | … |` row to
   `docs/tokens.md`; `public-types.test.ts` fails until it is there.

Do not assert a shipped ratio for the new text washes unless the test derives it
from `contrastRatio`; do not hard-code a percent.

## Documentation

- `docs/tokens.md` (*Native text* section): after the existing fade paragraph,
  add one paragraph naming the four chrome washes, `nativeTextWashes`, and the
  floors (code header text + separator; diff header three roles at 2.5% and 5%).
  State that the code header separator is `border` on the 2% wash and that the
  accepted `border: "#303030"` theme on `Dark · macOS` is reported. Add the type
  row.
- `docs/design-system.md` §10: one sentence naming the chrome washes beside the
  existing fade sentence.
- `packages/tokens/README.md`: extend the native-text sentence to include the
  chrome washes.
- `COMPONENTS.md`: append a sentence to the **Total theme check** row naming
  plan 588 and the code-header separator regression.
- `TODO.md`: tick the new row; keep the progress bar current. Add the row under
  the tokens section before implementation starts? No — add and tick it in the
  same commit that lands the fix, as the other plans do.

## STOP conditions

Stop and report if:

- a shipped theme fails a new wash pair (that is a real palette defect; do not
  move values without measuring every set and updating the plan);
- `nativeInk`'s optional third argument does not type-check against an existing
  caller;
- the `border: "#303030"` theme reports any failure other than the new
  `nativeText` one (the regression proof is no longer clean);
- the docs type-index or snippet guard needs a public value that is not
  documented.

## Acceptance

- `nativeTextWashes` is exported, typed and documented.
- `themeNativeTextFailures` reports the four chrome washes on all four
  `nativeTextSurfaces`.
- The `border: "#303030"` / `Dark · macOS` theme is reported only by the native
  text check.
- Every shipped set still returns `[]` from `themeFailures`.
- `nub run check`, `nub run lint`, `nub run test` pass.
- No colour, pair, floor, metric, platform style or recipe value moves.

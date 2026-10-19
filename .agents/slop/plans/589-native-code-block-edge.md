# 589 — The native code block's own edge on its body ink wash

**Phase:** F (contract completeness)
**Depends on:** 583 (the native document fades and ink wash), 588 (the chrome
washes), 574 (the syntax palette on every document tone), 585 (the runtime-only
text metrics)
**Owner:** `tokens-theme`
**Paths:** `packages/tokens/src/native-text-check.ts`,
`packages/tokens/src/native-text-check.test.ts`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`,
`.agents/slop/plans/README.md`

## Why

`themeNativeTextFailures` holds every syntax role on the code block's 3.5% ink
wash, and plan 588 added the `border` on the **2% language-header** wash below
it. The same fenced block paints `.border_1().border_color(theme.border)` around
its **whole body**, which sits on the **3.5%** ink wash
(`references/gpuix/packages/native/src/markdown/render.rs:474-481`). No pair
measures that edge.

The missing pair is real, not theoretical. The 3.5% wash moves the body tone
*toward* the theme's border (darker in light mode, lighter in dark mode), so a
border that clears the 1.05:1 divider floor on every plain surface can fall
under it inside the block. A probe over the shipped `Dark` theme finds
`extendTheme(getTheme("dark"), { colors: { border: "#222222" } })` returns `[]`
from `themeContrastFailures` (1.061:1 on the card) while the border measures
**1.036:1** on the code block's 3.5% body wash — an invisible frame around every
fenced block. Every shipped set already passes (the tightest is `Dark · Linux`
at 1.130:1), so no colour moves.

`nativeTextWashes` is the owner of the runtime's chrome washes, so the 3.5% body
edge belongs beside the 2% header edge. The alternative — a new list for "the
same field on another fraction" — duplicates the owner.

## What to change

### 1. `packages/tokens/src/native-text-check.ts`

Add one entry to `nativeTextWashes`, first, because it is the block's own frame:

```ts
export const nativeTextWashes: readonly NativeTextWash[] = [
  { field: "border", ink: 0.035, pairClass: "divider" },
  { field: "border", ink: 0.02, pairClass: "divider" },
  // …the eight existing entries unchanged
];
```

Update the `nativeTextWashes` JSDoc: the code block's outer edge is the theme's
`border` on the 3.5% body wash; the language header's separator is the same
role on the 2% header wash. Keep the `Dark · macOS` / `border: "#303030"` 1.002:1
evidence and add the `Dark` / `#222222` 1.036:1 body-edge evidence.

Update the `themeNativeTextFailures` JSDoc sentence about chrome so it says the
`border` is measured on the body wash **and** the header wash.

### 2. `packages/tokens/src/native-text-check.test.ts`

- Extend `publishes every chrome wash` with `"border@0.035 divider"` first.
- Add a regression case:

```ts
it("reports a code block frame the plain pairs accept", () => {
  const planted = extendTheme(getTheme("dark"), {
    colors: { border: "#222222" },
  });
  expect(
    themeFailures(planted).filter((failure) => failure.kind !== "nativeText"),
  ).toEqual([]);

  const failure = themeNativeTextFailures(planted).find(
    (candidate) => candidate.field === "border" && candidate.ink === 0.035,
  );
  expect(failure?.role).toBe("border");
  expect(failure?.surface).toBe("card");
  expect(failure?.pairClass).toBe("divider");
  expect(failure?.opacity).toBe(1);
  expect(failure?.ratio).toBeCloseTo(1.036, 2);
});
```

- The existing `can fail every published chrome wash on its own surface` case
  covers the new entry automatically. Do not special-case it.
- Update the header comment: name the body edge beside the header separator and
  the `#222222` regression.
- Extend the `pins the code-header figure` case (or add a sibling) so the
  reference is held to the new figure: read the derived ratio
  `contrastRatio("#222222", nativeInk(getTheme("dark"), "card", 0.035))`, assert
  the document contains its three-decimal spelling, and assert it names
  `border: "#222222"` and `Dark`.

### 3. `docs/tokens.md` (*Native text documents*)

In the chrome paragraph (currently "The runtime's own chrome sits on lighter ink
washes…"), say the code block's **whole body** is framed with the theme's
`border` on its 3.5% body wash, and the language header's separator with the same
role on the 2% header wash. Add the `#222222` regression beside the existing
`#303030` one: on `Dark`, `border: "#222222"` clears every plain pair and
measures **1.036:1** on the body wash while every other check returns `[]`.

Then add one sentence to the omissions paragraph: the runtime also draws two
neutral hairlines of its own — a diff file header's 4% top edge and a markdown
table's 10% rule — which are fixed black-or-white ink, not a theme role, so no
theme edit can move them and they stay outside the contract (like the 28% word
wash). Do not quote a ratio for them; they are runtime constants.

Update the `NativeTextFailure` type-row wording from "fade, two-fade composition,
chrome wash or ink wash" only if it no longer reads correctly; it still does.

### 4. `docs/design-system.md` §10

Extend the chrome sentence: the code block's body frame is `border` on the 3.5%
body wash, the header separator on the 2% header wash, and the diff header's
three roles on 2.5%/5%.

### 5. `packages/tokens/README.md`

In the native-text paragraph, change "a code block's language header and
separator on a 2% ink wash" to "a code block's body frame on the 3.5% ink wash
and its language header and separator on 2%".

### 6. `COMPONENTS.md`

Append to the **Total theme check** row: "Plan 589 holds the code block's own
`border` on the 3.5% body ink wash beside the language header's 2% separator,
because a border that cleared every plain pair measured 1.036:1 inside the block
on `Dark` while the check returned `[]`."

### 7. `TODO.md`

Add and tick one row in the tokens section, before the cross-team rows that
follow the plan-588 row:

> `[x]` Hold the native code block's own frame on its body ink wash — …

Keep the progress bar current (`240/318` → `241/319`, unless the counts moved
since; recompute from the file's own numbers).

### 8. `.agents/slop/plans/README.md`

Add plan 589 to the `tokens-theme` table after 588, status `done`, with the
short description, and name it in the prose block if the surrounding paragraph
ends with 588.

## Commands and expected results

Run from the worktree root.

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `nub run --filter @gpuixui/tokens test -- --run src/native-text-check.test.ts`
   → all cases green, including the new list entry and regression.
3. `nub run --filter @gpuixui/tokens test` → all suites green.
4. `nub run check`, `nub run lint`, `nub run test` → exit 0 (merge gate).

Proof in both directions: remove the new `nativeTextWashes` entry and the
regression case's `find` is `undefined` (and the list case fails); restore it and
both pass.

## STOP conditions

Stop and report if:

- any shipped theme fails the new pair (a real palette defect; do not move a
  value without measuring all 24 sets and updating this plan);
- `#222222` on `Dark` reports any non-`nativeText` failure (the regression proof
  is no longer clean);
- the new figure cannot be derived without hard-coding a percentage in the docs;
- a documentation guard needs a public value or type that does not exist.

## Acceptance

- `nativeTextWashes` publishes the body frame (`border` at 0.035) and still the
  header separator (`border` at 0.02).
- `themeNativeTextFailures` reports the `#222222` / `Dark` body frame and every
  shipped set still returns `[]` from `themeFailures`.
- The reference derives and states the new figure; the design system and README
  name the composition.
- `nub run check`, `nub run lint`, `nub run test` pass.
- No colour, pair, floor, metric, platform style or recipe value moves.

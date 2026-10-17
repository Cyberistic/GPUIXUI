# 319 — Typed text on every surface a field sits on

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
059, 071–095, 300, 306–318 · **Touches:** `packages/tokens`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `TODO.md`, this index

## 1. The gap

`inputForeground` is the role a field paints its typed text with. It is measured
twice: on the `input` fill a bounded field paints, and on the `background`
canvas a transparent field sits on (plan 315). Those two pairs are the whole
contract.

Plan 317 established the missing half of the picture one role over: a field is
not tied to one surface. `primitives` exposes four `Surface` tones, so a sidebar
search sits on `muted`, a command palette's field on `popover`, a settings form
on `card`, and the canvas is plan 315's case. The placeholder was given a pair
on all four. The **typed text** was not: it still has a pair on `background`
alone, so a copied platform style that retints `muted`, `popover` or `card`
while keeping the identity's `inputForeground` can erase a query, a filename or
a command while `themeContrastFailures` returns `[]`.

Every shipped set clears the body floor on all three surfaces (the tightest is
`inputForeground` on the `muted` panel), so this is a contract gap rather than a
shipped defect — the same class as plans 088 and 315, and the direct counterpart
of plan 317.

## 2. Decision (do not re-litigate)

1. Measure `inputForeground` on `card`, `popover` and `muted` as well as the
   `background` canvas and the `input` fill. All five are `body` pairs, because
   typed text is content, not a hint. Three pairs; `contrastPairs` moves
   **254 → 257**.
2. No colour moves. Every shipped identity, platform and recipe set already
   clears 7:1 on the three surfaces.
3. Do **not** measure `inputForeground` on the row washes or `disabled`. A field
   on a hovered row is not a shipped composition, and an unavailable field reads
   `disabledForeground`, which plan 306 measures — the same omissions plan 317
   recorded for the placeholder.
4. No new role, floor class, helper or export.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

Replace the single canvas pair with a mapped list over the four surfaces a
transparent field can sit on, and keep the `input` fill explicit beside it:

```ts
/**
 * The surfaces typed text is painted on: the four `Surface` tones a transparent
 * field (`SearchInput`, `InlineEdit`, `ColorPicker`, `TagInput`, `MentionInput`)
 * can sit on. The same four surfaces the placeholder is measured on, because a
 * field that loses its text is worse than one that loses its hint.
 */
const inputTextSurfaces = ["background", "card", "popover", "muted"] as const;

const inputTextSurfacePairs: readonly ContrastPair[] = inputTextSurfaces.map(
  (background): ContrastPair => ["inputForeground", background, "body"],
);
```

In `contrastPairs`, replace `["inputForeground", "background", "body"]` with
`...inputTextSurfacePairs` and keep `["inputForeground", "input", "body"]`
explicit. Extend the doc comment: typed text is measured on the `input` fill and
on the four `Surface` tones a transparent field sits on.

### 3.2 `packages/tokens/src/canvas-input-text.test.ts`

- Rewrite the header: plan 315 added the canvas; plan 319 adds the other three
  `Surface` tones, because a transparent field in a sidebar, a command palette
  or a settings form had no pair.
- Case 1: assert each of `background`, `card`, `popover`, `muted` has exactly
  one `body` pair, and `input` has one.
- Case 2 already loops every `inputForeground` pair over every shipped theme;
  it now covers the three new surfaces.
- Add the regression: rebuild the identity light theme with `muted` set to
  `inputForeground` and assert the checker reports `inputForeground` on `muted`
  (class `body`, floor 7). This case fails if the surface pairs are removed.
- Keep the canvas and input-fill regression cases.

### 3.3 `packages/tokens/src/contrast.test.ts`

The published pair-count case moves `254` → `257`.

### 3.4 `docs/tokens.md`

- The role-table row for `inputForeground`: “on the `input` fill or the
  `background` canvas a transparent field paints” becomes “on the `input` fill
  or the `background`/`card`/`popover`/`muted` surfaces a transparent field
  paints”.
- The Verification paragraph pinned by `docs.test.ts` (“Default body text is
  measured …”): typed text is `inputForeground` on the `input` fill and on the
  four `Surface` tones a transparent field sits on, matching the placeholder.
- The closing pair-count paragraph: append plan `319` and the new total
  (254 → 257).

### 3.5 `docs/design-system.md`

§9's body row: “typed text on `input` and on the `background` canvas a
transparent field paints” becomes the four `Surface` tones.

### 3.6 `packages/tokens/src/docs.test.ts`

Update the pinned “states where default body text is measured” sentence from
§3.4 and the pinned §9 body row from §3.5.

### 3.7 `packages/tokens/README.md`

In “Checking a theme”, typed text is checked on the `input` fill and the four
`Surface` tones a transparent field can sit on, not only the canvas.

### 3.8 `COMPONENTS.md`

`Theme contrast check` row: `the same 254 contrast pairs` → `257`, and append a
plan-319 clause beside the plan-315/317 sentences — typed text is measured on
the same four surfaces as the placeholder, because a transparent field in a
sidebar, a command palette or a settings form is not tied to the canvas.

### 3.9 `TODO.md`

Add under “Design tokens and theming”, ticked:

`[x]` Hold typed text on every surface a field sits on — `inputForeground` had
pairs on the `input` fill and the `background` canvas only, while the placeholder
gained all four `Surface` tones in plan 317, so a copied style could erase a
search query in a sidebar or a dialog while the checker returned `[]`; the
`card`, `popover` and `muted` surfaces join the body contract (254 → 257) and
every shipped set clears 7:1, so no colour moves (plan 319).

Move the progress bar from `86/112` to `87/113`.

### 3.10 `.agents/slop/plans/README.md`

Add a row for 319 to the tokens table and a closing paragraph recording the
three pairs and the resulting count.

## 4. Commands and expected results

Run from the worktree root, in order:

| # | Command | Expected |
| - | ------- | -------- |
| 1 | apply §3.1–3.3, then `nub run --filter @gpuixui/tokens test` | green; the new regression case reports the erased text on `muted`, and `contrastPairs.length` is 257 |
| 2 | `nub run check` | exit 0 — test inventory, lint, format and types |
| 3 | `nub run lint` | exit 0 |
| 4 | `nub run test` | exit 0 |
| 5 | `nub run --filter @gpuixui/tokens build` | exit 0 |

To prove the regression case can fail, temporarily remove
`...inputTextSurfacePairs` from `contrastPairs` and re-run: the muted case must
fail with an empty failure list, then restore.

## 5. STOP conditions

Stop and report if:

- any shipped set is below 7:1 on `inputForeground` over `card`, `popover` or
  `muted` — the audit says every set passes, so a failure means the premise is
  stale; do not move a surface without a separate decision;
- a pair for any of the three surfaces already exists — report the duplicate
  instead of adding a second pair;
- satisfying the contract requires touching a consumer package, a floor, a
  recipe or the identity palette.

## 6. Test plan

- **Pair presence:** case 1 fails if a surface is dropped or lands in another
  class; the count pins 257.
- **Shipped floors:** case 2 fails on an edited `muted`/`popover`/`card` that
  drops typed text below 7:1.
- **Regression:** the muted case fails with the pairs removed (the checker
  returns `[]`) and passes with them, which is the guard this workstream
  requires.
- **Docs:** `docs.test.ts` pins the two sentences, so the contract and the
  reference cannot drift.

## 7. Acceptance

- [x] `inputForeground` is measured on `input`, `background`, `card`, `popover`
  and `muted`; the public count is 257.
- [x] Every shipped set clears 7:1 on all five pairs; no colour moves.
- [x] The two documents, the README and the ledger name the four surfaces; the
  pinned doc assertions are updated.
- [x] `TODO.md` is ticked and its progress bar moved; this index records 319.
- [x] `nub run check`, `nub run lint` and `nub run test` pass in this worktree.

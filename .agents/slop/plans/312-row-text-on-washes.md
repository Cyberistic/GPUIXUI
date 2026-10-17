# 312 — The row's own text on the washes it paints

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
059, 071–095, 300, 306–309 · **Touches:** `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`,
`TODO.md`, this index

## 1. The gap

Plans 079, 083 and 086 measured *secondary* text, *status* text and the *ring*
on the four row washes (`hover`, `active`, `accent`, `selected`). Plans 081 and
087 measured selected text through the composited selection wash. No plan has
measured the **default text roles of a row** on the fills the row paints:

| Painted by | Role | Fill |
| ---------- | ---- | ---- |
| `list.tsx` `ListItem` (selectable, hovered) | `foreground` (via `ListItemTitle`) | `accent` |
| `list.tsx` `ListItem` (selected) | `foreground` (via `ListItemTitle`) | `selected` |
| `list.tsx` `ListItem` (selected, hovered/pressed) | inherited `selectedForeground` | `accent`, `active` |
| `menu/item.tsx` `menuRowStyle` | `popoverForeground` | `hover`, `active` |

Two of these are surprising in the shipped source, which is why they were
missed:

- `ListItem` sets `color: selectedForeground` on a selected row, but
  `ListItemTitle` then sets `color: foreground` on itself. A selected row's
  title therefore paints `foreground` on `selected`, not
  `selectedForeground`. Only children that do not set their own colour inherit
  `selectedForeground`.
- A selected row is also selectable, so its `hover`/`active` arms replace the
  background with `accent`/`active` while the inherited `color` stays
  `selectedForeground`. The pointer changes the fill under selected text.

The audit found every one of these pairs above its floor in all ten shipped
themes — the tightest are `foreground` on `selected` at **7.466:1** (Linux dark)
and `selectedForeground` on `active` at **5.212:1** (macOS light) — so no colour
moves. The pairs exist so an edited theme or a copied platform style cannot make
a row's label disappear on its own hover, press or selected fill while the
checker stays green.

## 2. Decision (do not re-litigate)

Add seven pairs to `contrastPairs` (232 → **239**):

| Foreground | Background | Class | Why |
| ---------- | ---------- | ----- | --- |
| `foreground` | `accent` | `body` | a list title on a hovered selectable row |
| `foreground` | `selected` | `body` | a list title on a selected row |
| `popoverForeground` | `hover` | `body` | a menu row under the pointer |
| `popoverForeground` | `active` | `body` | a menu row pressed |
| `selectedForeground` | `hover` | `secondary` | selected text under a pointer, inherited |
| `selectedForeground` | `active` | `secondary` | selected text pressed, inherited |
| `border` | `input` | `divider` | a text field's edge on its own fill (the field-edge half of plan 313 lands with it — see §3.3) |

`selectedForeground` stays a `secondary` pair, matching plan 081's decision for
`selectedForeground` on `selected`; it is a highlight label, not the body role.
`foreground` and `popoverForeground` are body text and take the 7:1 / 7:1 floors.

The two groups are module-private lists spread into `contrastPairs`. They are
**not** new public exports: the public surface stays `contrastPairs` and
`themeContrastFailures`, and the tests filter the published list. This avoids a
second documentation index for seven rows.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. After `statusTextWashPairs`, add:

   ```ts
   /**
    * The default text roles a row paints on the washes it paints behind them.
    * A selectable list row uses `accent` on hover and `selected` when selected,
    * a selected row keeps its inherited `selectedForeground` while hovered or
    * pressed, and a menu row paints `popoverForeground` on `hover`/`active`.
    */
   const rowTextPairs: readonly ContrastPair[] = [
     ["foreground", "accent", "body"],
     ["foreground", "selected", "body"],
     ["popoverForeground", "hover", "body"],
     ["popoverForeground", "active", "body"],
     ["selectedForeground", "hover", "secondary"],
     ["selectedForeground", "active", "secondary"],
   ];
   ```

2. Next to the divider group, add:

   ```ts
   /**
    * The field edge. A text field paints `border` on the `input` fill, so the
    * divider floor applies to the pair a reader uses to find the field.
    */
   const fieldEdgePairs: readonly ContrastPair[] = [
     ["border", "input", "divider"],
   ];
   ```

3. Spread `...rowTextPairs` after `...statusTextWashPairs` and
   `...fieldEdgePairs` after the other `border` pairs in `contrastPairs`.
4. Extend the `contrastPairs` JSDoc with one clause: the default text role of a
   list or menu row is measured on the washes the row paints, and a field's
   edge is measured on the `input` fill.

### 3.2 `packages/tokens/src/body-text-surfaces.test.ts`

The filter takes every `foreground` + `body` pair, so the two new body pairs
join that test's contract. Update the expected surface list to:

```ts
[
  "background",
  "card",
  "muted",
  "popover",
  "hover",
  "active",
  "accent",
  "selected",
]
```

and extend the header comment: plan 312 adds the row washes, and a selected
row's title paints `foreground` on `selected` because `ListItemTitle` overrides
the row's inherited `selectedForeground`.

### 3.3 `packages/tokens/src/wash-text.test.ts` (new)

Header comment: *Guards the gap plan 312 closed — the contract measured
secondary text, status text and the ring on the four row washes, but not the
default text role a row paints. A selected list row's title is `foreground` on
`selected` (`ListItemTitle` overrides the inherited `selectedForeground`); a
hovered selectable row paints `foreground` on `accent`; a selected row under the
pointer keeps `selectedForeground` on `accent`/`active`; and a menu row paints
`popoverForeground` on `hover`/`active`. All ten shipped sets pass, so no colour
moves; the pairs stop an edited theme from erasing a row label on its own state
fill.*

Tests:

1. **The pairs exist exactly once, in the intended classes** — filter
   `contrastPairs` for `foreground`/`accent`, `foreground`/`selected`,
   `popoverForeground`/`hover`, `popoverForeground`/`active` (all `body`) and
   `selectedForeground`/`hover`, `selectedForeground`/`active` (`secondary`);
   assert one pair each and `new Set(contrastPairs).size === contrastPairs.length`.
2. **Every shipped theme clears its declared floor** — identity, both
   high-contrast variants and each real platform theme in both modes; fail with
   the pair named.
3. **A regressed row title is reported** — `extendTheme(getTheme("light"),
   { colors: { accent: "#191D25" } })` (the light `foreground`) makes
   `foreground` on `accent` 1.0; assert exactly the named failure with
   `pairClass: "body"` and the default body floor.
4. **A regressed selected label is reported** —
   `extendTheme(getTheme("light"), { colors: { hover: "#3B2C8F" } })` (the light
   `selectedForeground`) makes `selectedForeground` on `hover` 1.0; assert the
   named `secondary` failure.
5. **A regressed menu row is reported** — `extendTheme(getTheme("dark"), {
   colors: { active: "#F6F8FA" } })` (the dark `popoverForeground`) makes
   `popoverForeground` on `active` 1.0; assert the named `body` failure.
6. **The field edge is a divider pair** — `border` on `input` exists once,
   every shipped theme clears the declared divider floor, and
   `extendTheme(getTheme("light"), { colors: { input: "#D6DAE1" } })` (the light
   `border`) reports `border` on `input` at 1.0.

### 3.4 `packages/tokens/src/contrast.test.ts`

- `contrastPairs.length` 232 → 239.

### 3.5 Documents

- `docs/tokens.md`
  - The “Default body text is measured on …” paragraph: add `accent` and
    `selected`, and state why (a row title overrides the inherited colour).
  - Add a short paragraph after it: a row's default text role is measured on the
    washes it paints, naming the menu and selected-row cases; quote the tightest
    shipped values (`foreground` on `selected` 7.47:1, Linux dark;
    `selectedForeground` on `active` 5.21:1, macOS light) and say no value
    moves. Name the field-edge pair and its worst shipped value
    (`border` on `input` 1.25:1, Linux dark, above the 1.05 divider floor).
  - The Verification section's pair list gains “the row text on the washes it
    paints, and the field edge on its own fill”.
- `docs/design-system.md`
  - §9 floor table: add the field edge / row text rows, or extend the existing
    `decorative borders` and `default body text` rows. Keep the numbers derived
    from `contrastFloors` as the rest of the section is.
- `packages/tokens/README.md`: one sentence in the contrast paragraph naming the
  new pairs; no figure unless the test derives it.
- `COMPONENTS.md`: “Theme contrast check” row 232 → 239 pairs and one clause for
  the row labels and field edge; “Design tokens” row's contrast sentence gains
  the row-label rule.
- `TODO.md`: add the row under the design-tokens section, then tick it; move the
  progress bar.
- This index: add 312 as done with a closing paragraph.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | before §3.1: `wash-text.test.ts` fails on the missing pairs; after §3.1–3.4: green |
| 2 | `nub run check` | exit 0 — the docs and ledger pair counts agree with the new length |
| 3 | `nub run lint` | exit 0 |
| 4 | `nub run test` | exit 0 |

## 5. STOP conditions

Stop and report if:

- any of the seven pairs fails its floor in a shipped theme (the premise was
  “no colour moves”; a failure means a shipped defect the plan did not predict);
- adding the body pairs changes an unrelated contract pair (they are additions,
  so nothing should move);
- `selectedForeground` on `hover`/`active` needs the body floor rather than the
  secondary floor to pass (that would contradict plan 081's class decision and
  needs a separate decision, not a silent reclass);
- a change is needed outside the paths listed above.

## 6. Acceptance

- [x] `contrastPairs` is 239 with the six text pairs and `border` on `input`.
- [x] Every shipped theme clears its declared floor on all seven pairs.
- [x] The three text regressions and the field-edge regression are stated and
      reported by `themeContrastFailures`.
- [x] Documents, ledger and TODO are current; gates pass; committed and pushed.

## 7. Outcome

- The audit found every pair already above its floor: the tightest are
  `foreground` on `selected` at **7.466:1** (Linux dark) and
  `selectedForeground` on `active` at **5.212:1** (macOS light), and the field
  edge measures **1.253:1** at its weakest (Linux dark). No colour moved.
- `rowTextPairs` and `fieldEdgePairs` are module-private and spread into
  `contrastPairs`, so the public surface stays `contrastPairs` and
  `themeContrastFailures`; `contrastPairs` is 232 → 239.
- `body-text-surfaces.test.ts` now expects `accent` and `selected` among the
  body surfaces, and the new `wash-text.test.ts` states five regressions:
  a light `accent` equal to `foreground`, a light `selected` equal to
  `foreground`, a light `hover` equal to `selectedForeground`, a dark
  `active` equal to `popoverForeground`, and a light `input` equal to
  `border` — each reported at 1.0 with its class.
- Both directions were proved: with the two spreads removed, seven cases fail
  (the surface list, the pair list, the four text regressions and the field
  edge); restored, the file and the full suite pass.
- Green: **45 test files, 2946 tests**. `nub run check`, `nub run lint` and
  `nub run test` were run and passed. Committed and pushed.

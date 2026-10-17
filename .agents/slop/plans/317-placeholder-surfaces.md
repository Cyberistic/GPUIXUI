# 317 — The placeholder on every surface a field sits on

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
059, 071–095, 300, 306–316 · **Touches:** `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md`, this
index

## 1. The gap

`placeholder` is a text role. It is measured exactly once, on the `input` fill
(`contrastPairs`, `["placeholder", "input", "secondary"]`), on the reasoning
plan 315 recorded: the transparent fields plan 315 audited (`SearchInput`,
`InlineEdit`, `ColorPicker`, `TagInput`, `MentionInput`) leave placeholder
colour to the runtime default, so only a field that paints its own `input` fill
uses the role.

That reasoning protects one fill, not the role. `primitives` exposes four
`Surface` tones — `background`, `card`, `muted` and `popover` — and a transparent
field can be placed on any of them: a sidebar search sits on the quiet `muted`
panel, a command palette or an inline filter sits on `popover`, a settings form
sits on `card`, and the canvas is plan 315's case. When the `components`
workstream paints the role (the cross-team row in `TODO.md`), the placeholder on
three of those surfaces has no pair behind it, and the fourth (`input`) is the
only one the checker knows.

The audit found a **shipped** value below the library's own floor, not just a
missing pair. The identity dark `placeholder` is `#7C8595`; the quiet panel and
the floating surface are both `#222730` in that palette, and the role measures
**4.03:1** on each — under the 4.5:1 the package states for secondary text. The
`default` platform variant *is* the identity, and the XP and Aero dark recipes
inherit the identity placeholder, so four of the ten shipped colour sets carry
an unreadable placeholder on a sidebar or in a dialog while every suite stays
green. Every other shipped set clears 4.5:1 on all four surfaces.

This is the same class of gap plans 079 (`mutedForeground` on the row washes),
082 (`primary` as text), 083 (`xText` on the washes), 087 (selected secondary
text), 312 (the row's own label), 314 (the selected option and the sidebar dot)
and 315 (typed text on the canvas field) closed: a role measured on one of the
fills it paints, with the missing surface hiding a real failure.

## 2. Decision (do not re-litigate)

1. Measure `placeholder` on the four `Surface` tones as well as the `input`
   fill: `background`, `card`, `muted`, `popover`. All five are `secondary`
   pairs, matching the existing input pair.
2. Move the identity dark `placeholder` one designed step,
   `#7C8595` → `#858F9F`, so it clears 4.5:1 on the quiet panel and the floating
   surface:
   - `#222730` (muted/popover): **4.03 → 4.59:1**
   - `#191D25` (input): 4.54 → 5.17:1
   - `#11141A` (card): 4.96 → 5.64:1
   - `#0B0D11` (background): 5.23 → 5.95:1
   The new value stays dimmer than `mutedForeground` (neutral 300, `#CBD1DB`),
   so a placeholder still reads as a hint and not as content.
3. Do **not** measure `placeholder` on the row washes or on `disabled`. A field
   is its own row, not a row's label, and an unavailable field reads
   `disabledForeground`, which plan 306 already measures on its own fill. State
   both omissions in `docs/tokens.md`.
4. No public export, floor class or helper changes. The pair list moves
   `contrastPairs` from 248 to **252**.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

Next to `fieldEdgePairs`, add the surface list and the pairs (or extend the
existing literal with one small list — keep the docs order
`background`, `card`, `popover`, `muted`):

```ts
/**
 * The surfaces a placeholder is painted on: the `input` fill a bounded field
 * paints, and the four `Surface` tones a transparent field (`SearchInput`,
 * `InlineEdit`, `ColorPicker`, `TagInput`, `MentionInput`) sits on. A hint that
 * disappears into the sidebar or the floating surface is a failed field.
 */
const placeholderSurfaces = ["background", "card", "popover", "muted"] as const;

const placeholderPairs: readonly ContrastPair[] = placeholderSurfaces.map(
  (background): ContrastPair => ["placeholder", background, "secondary"],
);
```

Remove the single `["placeholder", "input", "secondary"]` literal from
`contrastPairs` and spread `...placeholderPairs` plus keep the `input` pair
explicit beside it (five pairs total, `input` first or last — choose the order
the existing list already documents and keep `input` explicit so the “field
fill” and the “transparent field” cases read apart).

Extend the `contrastPairs` doc comment: the placeholder is measured on the
`input` fill and on the four surfaces a transparent field sits on.

### 3.2 `packages/tokens/src/color.ts`

Dark palette only:

```ts
placeholder: "#858F9F",
```

Leave the light `#66707F`, the high-contrast `#B0B0B0` and every platform
style's own dark placeholder untouched. Add no ramps.

### 3.3 `packages/tokens/src/placeholder-surfaces.test.ts` (new)

Header comment: state the bug — `placeholder` was measured on `input` alone,
the identity dark value measures 4.03:1 on `muted`/`popover`, and the XP/Aero
dark recipes inherit it.

Cases:

1. **Pair shape** — `contrastPairs` filtered to `placeholder` equals the five
   documented pairs, once each, all `secondary`; the surfaces are exactly
   `background`, `card`, `popover`, `muted`, `input`.
2. **Shipped floors** — every shipped set (identity light/dark/default/high,
   the three real platform styles in both modes and both contrasts, and both
   recipes in both modes) clears its declared floor on every one of the five
   pairs. Use the theme-list shape from `canvas-input-text.test.ts`, including
   recipes.
3. **Regression** — rebuild the identity dark theme with the old value:

   ```ts
   const regressed = extendTheme(getTheme("dark"), {
     colors: { placeholder: "#7C8595" },
   });
   const failures = themeContrastFailures(regressed).filter(
     ({ foreground }) => foreground === "placeholder",
   );
   expect(failures.map(({ background }) => background).sort()).toEqual([
     "muted",
     "popover",
   ]);
   ```

   Assert each failure's `pairClass` is `secondary`, its floor is
   `contrastFloors.default.secondary`, and its ratio is close to `4.03`.
4. **The checker reports an erased hint on a transparent field** — set
   `placeholder` to the light `muted` colour in the light theme and assert the
   checker reports `placeholder` on `muted` (a fresh case, not the old value).
5. **The hint stays a hint** — on the identity dark `muted` panel,
   `contrastRatio(placeholder, muted)` is strictly less than
   `contrastRatio(mutedForeground, muted)`, so the fix does not promote the
   placeholder to body text.

### 3.4 `packages/tokens/src/contrast.test.ts`

The published pair-count case moves `248` → `252`.

### 3.5 `docs/tokens.md`

- The role table row for `placeholder`: replace `placeholder text` with
  “placeholder text on the `input` fill and the `background`/`card`/`popover`/
  `muted` surfaces a transparent field paints”.
- The Verification paragraph that begins “Default body text is measured on …”
  (currently pinned verbatim in `docs.test.ts`): append the placeholder
  sentence — measured on the `input` fill and the four `Surface` tones, because
  a transparent field sits on any of them; identity dark measured 4.03:1 on the
  quiet panel and the floating surface until the value moved to `#858F9F`; a
  field on a row wash or a disabled field is deliberately out of scope (the
  latter reads `disabledForeground`, plan 306).
- The closing contract paragraph (“These seven pairs take `contrastPairs` from
  232 to 239; plan `314` … plan `315` … plan `316` …”) gains plan `317` and the
  new total: the placeholder pairs take the contract from 248 to 252.

### 3.6 `docs/design-system.md`

In §9's floor table, change the secondary row so `placeholder` names its
surfaces instead of appearing bare:

```
| secondary text (`mutedForeground` on plain surfaces and on the `hover`, `active`, `accent` and `selected` washes), on-colour text, placeholder text on the `input` fill and the `background`/`card`/`popover`/`muted` surfaces a transparent field sits on, ghost text on the `hover`/`active` washes | 4.5:1 | 7:1 |
```

### 3.7 `packages/tokens/src/docs.test.ts`

- Update the pinned §9 row from §3.6 (verbatim, floors interpolated).
- Update the pinned “Default body text is measured on …” sentence from §3.5.
- No count phrase is pinned there; `inventory.test.ts` reads the ledger count
  from `contrastPairs.length`, so no test-code number changes beyond
  `contrast.test.ts`.

### 3.8 `COMPONENTS.md`

- `Theme contrast check` row: `the same 248 contrast pairs` → `252`, and add a
  clause after the plan-315 sentence: the placeholder is measured on the
  `input` fill and the four `Surface` tones, after identity dark measured
  4.03:1 on `muted`/`popover` (plan 317).
- `Design tokens` row: add the same plan-317 sentence beside the plan-315
  clause so the ledger names the surface set, not only the fill.

### 3.9 `TODO.md`

Add under “Design tokens and theming”, ticked:

`[x]` Hold the placeholder on every surface a field sits on — it was measured
on the `input` fill only, so a transparent SearchInput in a sidebar or a dialog
had no pair, and the identity dark `#7C8595` measured 4.03:1 on `muted` and
`popover` while the XP/Aero dark recipes inherited it; the four `Surface` tones
join the contract (248 → 252), identity dark moves to `#858F9F` and every
shipped set clears 4.5:1 (plan 317).

Move the progress bar from `84/110` to `85/111`.

### 3.10 `.agents/slop/plans/README.md`

Add a row for 317 to the tokens table and a closing paragraph recording the
gap, the four pairs, the one value and the resulting count.

## 4. Commands and expected results

Run from the worktree root, in order:

| # | Command | Expected |
| - | ------- | -------- |
| 1 | apply §3.3 only (and the pair list from §3.1), then `nub run --filter @gpuixui/tokens test -- placeholder-surfaces` | **fails** on the identity dark floor case — this proves the test catches the shipped defect |
| 2 | apply §3.2, re-run the same command | passes; the regression case reports exactly `muted`/`popover` at ~4.03 when rebuilt with the old value |
| 3 | `nub run --filter @gpuixui/tokens test` | all suites green, `contrastPairs.length` is 252 |
| 4 | `nub run check` | exit 0 — test inventory, lint, format and types |
| 5 | `nub run lint` | exit 0 |
| 6 | `nub run test` | exit 0 |

## 5. STOP conditions

Stop and report if:

- a shipped set other than the identity dark family is below the floor on any of
  the five pairs — the audit says only identity/default/XP/Aero dark fail, so a
  different set means the premise is stale; do not move it without a separate
  decision;
- `placeholder` on `muted`/`popover` is already in `contrastPairs` — then the
  gap is elsewhere; report the duplicate instead of adding a second pair;
- the new identity dark value (`#858F9F`) does not clear 4.5:1 on `muted` and
  `popover`, or becomes as bright as `mutedForeground` — pick the next step and
  record the ratios rather than changing a surface;
- satisfying the pair requires touching a consumer package, `contrastFloors`, a
  platform style or a recipe.

## 6. Test plan

- **Pair presence and class:** case 1 fails if a surface is dropped or a pair
  lands in another class.
- **Shipped floors:** case 2 fails on the identity dark value before §3.2 and
  on a platform edit that retints `muted`/`popover` below the floor.
- **Regression:** case 3 rebuilds the exact shipped defect; it fails if the
  pair is removed (empty failures) and passes only when the pair exists and the
  value moved.
- **Public checker:** case 4 proves `themeContrastFailures` reports an erased
  hint, not only the library's own suites.
- **Design intent:** case 5 fails if a future edit promotes the placeholder to
  the secondary grey.
- **Count:** `contrast.test.ts` pins 252, so an accidental removal or a second
  addition fails.

## 7. Acceptance

- [x] `placeholder` is measured on `input` and the four `Surface` tones; the
  public count is 252.
- [x] Identity dark `placeholder` is `#858F9F`; every shipped set clears its
  declared floor, and the regression test proves the checker reports the old
  value.
- [x] `docs/tokens.md`, `docs/design-system.md` and `COMPONENTS.md` name the
  surface set and the out-of-scope fills; the pinned doc sentences are updated.
- [x] `TODO.md` is ticked and its progress bar moved; this index records 317.
- [x] `nub run check`, `nub run lint` and `nub run test` pass in this worktree.

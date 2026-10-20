# Plan 750 — the disabled fill's reason in the palette doc and the status paragraph

**Workstream:** `tokens-theme` · **Phase:** F (contract truth) ·
**Depends on:** plan `306` (the inactive state and its reason), `737` (the fill
becomes a measured surface), `747` (the first three passages carrying that
reason), `749` (the same sweep, one role over).

## 1. The defect this plan closes

Plan `747` corrected the three passages that still called the `disabled` fill
exempt: the public `ThemeColors.disabled` JSDoc, the design system's inactive
rule and the high-contrast role row. It anchored its guard on those passages.
Two more current-state passages carry the refuted reason and were missed:

| File | Passage | What it still says |
| ---- | ------- | ------------------ |
| `packages/tokens/src/color.ts` `:320` | the `lightColors` doc block | "while the fill stays near the panel and the control's `border` edge carries its shape (plan `306`)" |
| `docs/tokens.md` `:3330` | the *Accessibility floors* inactive paragraph, starting "The inactive floor is new in plan `306`" | "The `disabled` fill stays near the panel by design, so a disabled control's shape is carried by its `border` edge (plan `306`)" |

Both are contradicted by the package:

- `disabledFillPairs` holds the fill to the 1.05:1 `surface` floor on the five
  surfaces a control is placed on (`background`, `card`, `popover`, `muted`,
  `input`), and `themeFailures` rejects a fill that equals its panel;
- plan `737` moved five shipped values precisely because eight shipped pairs sat
  under that floor — the identity dark fill **was** its `muted` panel and its
  `popover` (`1.000:1`);
- the catalogue's own later section says "The `disabled` fill is a fill, not an
  exemption";
- `disabled-fill-claims.test.ts` already fails a role JSDoc or role row that
  restores the reason, but it never reads the palette doc block or this
  paragraph.

A consumer designing a light palette is told the fill may sit on the panel and
that its edge carries the shape, while `themeFailures` rejects exactly that
theme. This is plan `747`'s defect in the two passages its guard did not reach.

## 2. Decision (do not re-litigate)

- **The measured rule is the only description.** The fill is a perceivable step
  off each of the five surfaces a control is placed on (`disabledFillPairs`);
  the `border` edge is held to the divider floor on the fill, as reinforcement.
- **Both passages name the pair list.** The light palette's rationale and the
  catalogue's inactive paragraph point at `disabledFillPairs` and plan `737`, so
  a reader of either resolves the rule without finding the other document.
- **No colour, pair, floor, metric or role moves.** This plan is prose plus two
  guard cases: `contrastPairs` stays **470** and `disabledFillPairs` stays five.

## 3. Files to change

All paths relative to this worktree
(`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`).

### 3.1 `packages/tokens/src/color.ts`

In the `lightColors` doc block, replace:

> `disabledForeground` is neutral 600 so an inactive label clears the 3:1
> `inactive` floor on the darkest platform pressed wash with margin, while the
> fill stays near the panel and the control's `border` edge carries its shape
> (plan 306).

with:

> `disabledForeground` is neutral 600 so an inactive label clears the 3:1
> `inactive` floor on the darkest platform pressed wash with margin, while the
> fill is a perceivable step off each of the five surfaces a control is placed
> on (`disabledFillPairs`, plan 737) and the control's `border` edge reinforces
> its shape (plan 306).

No other sentence in the block changes.

### 3.2 `docs/tokens.md`

In the inactive-floor paragraph, replace:

> The `disabled` fill stays near the panel by design, so a disabled control's
> shape is carried by its `border` edge — held to the divider floor on
> `disabled`, and on the `muted` panel a settings sidebar divides (plan `306`).

with:

> The `disabled` fill is a perceivable step off each of the five surfaces a
> control is placed on (`disabledFillPairs`, plan `737`), so a disabled
> control's shape starts with its fill and is reinforced by its `border` edge —
> held to the divider floor on `disabled`, and on the `muted` panel a settings
> sidebar divides (plan `306`).

### 3.3 `packages/tokens/src/disabled-fill-claims.test.ts`

Two cases appended to the existing suite (the right owner: it already reads
`color.ts` and the catalogue, and derives the five surfaces from
`disabledFillPairs`). Header comment gains one paragraph naming this defect.

### 3.4 `TODO.md`

Add a ticked row to the `tokens-theme` list describing the fix; move the
progress bar to `339/416`.

### 3.5 `.agents/slop/plans/README.md`

Index plan `750` after `749`.

### 3.6 `COMPONENTS.md`

Append one clause to the `Theme contrast check` ledger row: plan `750` holds the
light-palette rationale and the catalogue's inactive paragraph to
`disabledFillPairs`. No count changes.

### 3.7 No example

No executable example is added: this plan changes prose and adds two
documentation cases; no API shape, value or interaction moves.

## 4. Commands and expected results

All token commands run from `packages/tokens`.

### 4.1 Prove the cases fail first (two directions)

1. Write the two cases (§6) **before** §3.1–§3.2.
2. `nub exec vitest run src/disabled-fill-claims.test.ts`

Expected: **fails** on both new cases (the palette block and the paragraph each
contain the refuted reason and neither names `disabledFillPairs`). The existing
cases stay green — this plan adds coverage, it does not repair them. If the new
cases pass, they are not reading the passages; fix the cases.

### 4.2 Scoped tests

```sh
nub exec vitest run src/disabled-fill-claims.test.ts src/disabled-fill.test.ts src/docs.test.ts src/readme.test.ts src/inventory.test.ts
```

Expected: all green after §3.1–§3.2.

### 4.3 Whole package

```sh
nub run --filter @gpuixui/tokens test
```

Expected: `204 passed` files (the suite count does not change; two cases are
added), `0 failed`, inside the 20 s budget plan `333` set.

### 4.4 Gates

```sh
nub run check
nub run lint
nub run test
```

Expected: all three green.

### 4.5 Native verification

Not applicable: prose and documentation cases only; no token value, style
property or interaction changes. Do not claim a native run.

## 5. STOP conditions

- **STOP** if `disabledFillPairs` does not have five pairs or does not derive
  from `stateFillSurfaces`; plan `747`'s derived case already asserts this, but
  the prose in §3 assumes it.
- **STOP** if a fix would need a colour, pair, floor or metric to move.
- **STOP** if another current-state passage still presents the exemption after
  §3.1–§3.2. Add it to the same commit and to the guard; history paragraphs
  that quote the old reason while refuting it stay.
- **STOP** if a document guard would have to search the whole file. Anchor on
  the `lightColors` doc block (the block directly above
  `export const lightColors`) and on the paragraph starting "The inactive floor
  is new in plan `306`".

## 6. Test plan

Two cases appended to `src/disabled-fill-claims.test.ts`:

1. **"the light palette's rationale states the measured fill"** — the doc block
   above `export const lightColors` contains `disabledFillPairs` and does not
   contain `stays near the panel` or `edge carries its shape`.
2. **"the inactive-floor paragraph states the measured fill"** — the catalogue
   paragraph starting `The inactive floor is new in plan` (slice 600 characters)
   contains `disabledFillPairs` and does not contain `stays near the panel by
   design` or `shape is carried by its`.

Both fail before §3.1–§3.2 and pass after. The suite's existing cases continue
to hold the role JSDoc, the two role rows and the design system's rule.

## 7. Acceptance criteria

- The `lightColors` doc block and the catalogue's inactive-floor paragraph
  describe the fill as a measured step on the five surfaces, name
  `disabledFillPairs`, and no longer present the exemption as current fact.
- The historical narrative that refutes the old reason stays in both documents.
- No colour, pair, floor, metric or role moves: `contrastPairs` **470**,
  `disabledFillPairs` five.
- The two new cases fail on the pre-fix prose (run §4.1 and keep the evidence in
  the commit message) and pass after.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` are green.
- `TODO.md`, `COMPONENTS.md` and the plan index carry plan `750`.

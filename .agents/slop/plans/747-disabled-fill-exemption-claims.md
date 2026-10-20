# Plan 747 — the disabled fill's exemption, in the three passages plan 737 missed

**Workstream:** `tokens-theme` · **Phase:** F (contract truth) ·
**Depends on:** plan `306` (the inactive state and its recorded exemption),
`737` (the fill becomes a measured surface), `742` (the same
"passages carry the refuted reason" repair, one role over).

## 1. The defect this plan closes

Plan `737` shipped the rule and most of the prose:

- `disabledFillPairs` holds the `disabled` fill to the 1.05:1 `surface` floor on
  the five surfaces a control is placed on (`stateFillSurfaces`), and five
  values moved so every shipped set clears it;
- the catalogue's default role table, its interaction section, its *One check*
  narrative, the design system's history section and the package README all say
  the fill is a measured surface and that plan `306`'s reason — *"no neutral
  clears both a white card and the quiet panel"* — is false.

Three current-state passages were left behind, and each still presents the
refuted exemption as the rule:

| File | Passage | What it still says |
| ---- | ------- | ------------------ |
| `packages/tokens/src/color.ts` | `ThemeColors.disabled` JSDoc (the public type) | the fill is "deliberately allowed to sit near the panel: no neutral clears both a white card and the quiet panel" |
| `docs/design-system.md` §9, the inactive-control paragraph (`:587`) | the design system's rule for the state | "the fill is allowed to sit within the panel's own value — no neutral clears a white card and the quiet panel at once" |
| `docs/tokens.md`, the high-contrast role table's `disabled` row (`:592`) | the AAA palette's role description | "disabled surface (kept near the panel; the control's `border` edge carries its shape)" |

Every one of them is contradicted by the package:

- `disabledFillPairs` measures exactly those five surfaces (`contrast.ts:351`),
  and `themeFailures` reports a fill that equals its panel;
- the same design system, forty lines below, says the fill is held like any
  other fill and that the reason is false (`docs/design-system.md:746`);
- the same catalogue, further down, says "The `disabled` fill is a fill, not an
  exemption" (`docs/tokens.md:2533`);
- the same catalogue's default role table already reads "measured on every
  surface a control is placed on (`disabledFillPairs`)" (`docs/tokens.md:288`).

A consumer reading the **public type** or the design system's rule is told the
fill is exempt and near-invisible by design, while a copied theme whose fill
equals its panel is rejected by `themeFailures`. This is plan `742`'s defect —
a superseded exclusion reason surviving in prose — for the disabled fill.

## 2. Decision (do not re-litigate)

- **The measured rule is the only description.** `disabled` is a fill held to
  the `surface` floor on the five surfaces a control is placed on; the `border`
  edge is held to the `divider` floor on that fill. No passage may say the fill
  is allowed to sit near the panel or that no neutral can clear the panels.
- **The role's JSDoc names the owner.** `ThemeColors.disabled` names
  `disabledFillPairs` so the public type points at its check, like the
  neighbouring `skeleton`/`track` roles do.
- **The AAA table row names the five surfaces, derived from the pair list.**
  The catalogue's default row already named the list; the AAA row gets the same
  treatment, so the two tables describe one rule.
- **No colour, pair, floor, metric or role moves.** This plan is prose plus a
  guard; `contrastPairs` stays **470** and `disabledFillPairs` stays five pairs.

## 3. Files to change

All paths relative to this worktree
(`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`).

### 3.1 `packages/tokens/src/color.ts`

Replace the `ThemeColors.disabled` JSDoc with:

> Disabled surface. A perceivable step off each of the five surfaces a control
> is placed on — the canvas, a card, a popover, the quiet `muted` panel and the
> field's `input` fill (`disabledFillPairs`) — with its `border` edge held to
> the divider floor on the fill.

It must name `disabledFillPairs` and must not contain "deliberately allowed",
"no neutral clears" or "sit near the panel".

### 3.2 `docs/design-system.md`

The inactive-control paragraph, first sentence pair:

> An inactive control is not an opacity composite. It paints the `disabled` fill
> with `disabledForeground` on it and its `border` edge around it: the label keeps
> a readable dim (3:1, 4.5:1 at AAA) and the edge keeps the shape, because the fill
> is allowed to sit within the panel's own value — no neutral clears a white card
> and the quiet panel at once.

becomes:

> An inactive control is not an opacity composite. It paints the `disabled` fill
> with `disabledForeground` on it and its `border` edge around it: the label keeps
> a readable dim (3:1, 4.5:1 at AAA) and the edge keeps the shape, and the fill is
> itself a perceivable step off each of the five surfaces a control is placed on
> — `background`, `card`, `popover`, the `muted` panel and the field's `input`
> fill (`disabledFillPairs`) — because an unavailable control still needs a shape.

The rest of the paragraph (the 1.575:1 opacity measurement) stays.

### 3.3 `docs/tokens.md`

Both `disabled` role-table rows (the default table at `:288` and the
high-contrast table at `:592`) read:

> fill of an unavailable control, measured on `background`/`card`/`popover`/`muted`/`input` (`disabledFillPairs`); the control's `border` edge is held on it

The default row's value cells keep their current hexes; only the use cell is
unified. Neither row may contain "kept near the panel".

### 3.4 `packages/tokens/src/disabled-fill-claims.test.ts` (new)

Header comment names the bug in the AGENTS §3 form. Cases in §6.

### 3.5 `TODO.md`

Add a ticked row to the `tokens-theme` list describing the fix, and move the
progress bar to `337/415`.

### 3.6 `COMPONENTS.md`

Append one sentence to the `Theme contrast check` ledger row: plan `747` holds
the three surviving exemption passages to `disabledFillPairs`; no value moves.
No count changes.

### 3.7 `.agents/slop/plans/README.md`

Index plan `747` after `745`.

## 4. Commands and expected results

All token commands run from `packages/tokens`.

### 4.1 Prove the test fails first (two directions)

1. Write `src/disabled-fill-claims.test.ts` (§6) **before** §3.1–§3.3.
2. `nub exec vitest run src/disabled-fill-claims.test.ts`

Expected: **fails** on the role JSDoc case, the design-system paragraph case and
the AAA table-row case; passes only on the derived pair-list case. If it passes,
the guard is not reading the passages — fix the guard, not the prose.

### 4.2 Scoped tests

```sh
nub exec vitest run src/disabled-fill-claims.test.ts
nub exec vitest run src/disabled-fill.test.ts src/docs.test.ts src/readme.test.ts src/inventory.test.ts
```

Expected: all green after §3.1–§3.3.

### 4.3 Whole package

```sh
nub run --filter @gpuixui/tokens test
```

Expected: `203 passed` files (202 + the new suite), `0 failed`, inside the 20 s
budget plan `333` set.

### 4.4 Gates

```sh
nub run check
nub run lint
nub run test
```

Expected: all three green. `check:tests` rejects an assertion that cannot fail.

### 4.5 Native verification

Not applicable: this plan changes prose and adds a documentation guard, and
`apps/playground` has no built smoke/live runner in this worktree. The theme
gallery re-run that paints `disabled` is already a `playground` cross-team row.
Do not claim a native run.

## 5. STOP conditions

- **STOP** if `disabledFillPairs` does not have five pairs or does not derive
  from `stateFillSurfaces`; the prose in §3 assumes that contract.
- **STOP** if a fix would need a colour, pair, floor or metric to move. Plan
  `737` settled the values; this plan only corrects prose.
- **STOP** if another current-state passage in either document still calls the
  fill exempt after §3.1–§3.3. Add it to the same commit and to the guard.
- **STOP** if the guard cannot separate a current-state sentence from the
  historical narrative (both documents legitimately quote the old reason while
  refuting it). Anchor on the role table rows, the JSDoc block and the inactive
  paragraph — not on a substring search of the whole file.

## 6. Test plan

New suite `src/disabled-fill-claims.test.ts`, modelling
`selection-press-exclusion.test.ts`: read the source and both documents with
`node:fs`, normalise whitespace, and assert against the contract.

1. **"measures the fill on the five surfaces a control is placed on"** — the
   backgrounds of `disabledFillPairs` equal `stateFillSurfaces` and the list has
   five entries. This is the derived half; it also proves the prose in §3 is
   complete.
2. **"the public role names its check"** — the JSDoc block above
   `readonly disabled: string;` in `color.ts` contains `disabledFillPairs` and
   none of `deliberately allowed`, `no neutral clears`, `sit near the panel`.
3. **"the catalogue's two role rows describe the measured fill"** — every
   `| \`disabled\` |` row contains `disabledFillPairs`, contains each surface
   the pair list names, and contains no `kept near the panel`.
4. **"the design system's inactive rule states the measured fill"** — the
   paragraph starting `An inactive control is not an opacity composite` contains
   `disabledFillPairs` and each surface, and none of `allowed to sit within`,
   `no neutral clears`.
5. **"the fix is still a fix"** — the catalogue's later narrative and the design
   system's history paragraph still contain the refutation (the claim that plan
   `306`'s reason is false), so correcting the current-state passages cannot be
   done by deleting the history.

Cases 2–4 fail before §3.1–§3.3 and pass after; case 1 and 5 pass in both
directions and exist to keep the guard honest.

## 7. Acceptance criteria

- The public `ThemeColors.disabled` JSDoc, the design system's inactive rule and
  both catalogue role rows describe the fill as measured on the five surfaces,
  and none of the three carries the refuted exemption as current fact.
- No colour, pair, floor, metric or role moves: `contrastPairs` **470**,
  `disabledFillPairs` five.
- The new suite fails on the pre-fix prose (run §4.1 and keep the evidence in
  the commit message) and passes after.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` are green.
- `TODO.md`, `COMPONENTS.md` and the plan index carry plan `747`.

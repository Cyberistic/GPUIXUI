# Plan 749 — the placeholder role's surface claims

**Workstream:** `tokens-theme` · **Phase:** F (contract truth) ·
**Depends on:** plan `317` (the four `Surface` tones), `527` (the four row
washes), `651` (`selectedActive` joins the pressed row's pairs), `659` (the
four soft status fills a field inside a status panel paints), `747` (the same
"public type understates its contract" repair, one role over).

## 1. The defect this plan closes

`placeholder` is held to the secondary floor on **fourteen** surfaces, and the
contract measures every one of them:

| List | Surfaces | Pairs |
| ---- | -------- | ----- |
| the field's own fill | `input` | `["placeholder", "input", "secondary"]` |
| the transparent field's `Surface` tones | `background`, `card`, `popover`, `muted` | `placeholderSurfacePairs` |
| the row washes an in-place field paints | `hover`, `active`, `accent`, `selected` | `placeholderWashPairs` |
| the pressed row it keeps | `selectedActive` | `selectionPressPairs` |
| the tone-tinted status panel a field sits in | `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` | `softFieldPairs` |

`placeholder-surfaces.test.ts` already pins that exact fourteen-pair list, and
`docs/tokens.md` (both role tables after this plan), `docs/design-system.md`
("that same fourteen-surface list") and `packages/tokens/README.md` ("the same
fourteen surfaces") describe it.

The **public type** does not. `ThemeColors.placeholder` says:

> Placeholder text inside an input, held to the secondary floor on the `input`
> fill, the four `Surface` tones a transparent field sits on and the four row
> washes an in-place field paints.

That is **nine** surfaces: it omits `selectedActive` (plan `651`) and the four
soft status fills (plan `659`). A consumer reading the type is told a copied
theme is stricter than it is — exactly the defect plan `747` fixed for
`disabled`, where the type published a superseded exemption. The AAA role-table
row is terse for the same reason, so the two tables disagree about one rule.

Nothing checks any of it: no test reads the `placeholder` JSDoc, and
`disabled-fill-claims.test.ts` is the only role-prose guard of this shape.

## 2. Decision (do not re-litigate)

- **The pair list is the only description.** The `placeholder` JSDoc and both
  catalogue role rows name every surface `contrastPairs` measures the role on,
  and name `softFieldPairs` as the owner of the soft-fill half.
- **The surface list is derived, never retyped.** The new guard reads
  `contrastPairs`, filters the `placeholder` foreground, and holds the prose to
  the backgrounds it finds, so a fifteenth surface fails the suite until the
  prose names it.
- **No colour, pair, floor, metric or role moves.** This plan is prose plus a
  guard. `contrastPairs` stays **470** and the placeholder pairs stay fourteen.

## 3. Files to change

All paths relative to this worktree
(`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`).

### 3.1 `packages/tokens/src/color.ts`

Replace the one-line `ThemeColors.placeholder` JSDoc with:

```ts
  /**
   * Placeholder text inside an input, held to the secondary floor on the
   * fourteen surfaces a field paints it on: the `input` fill, the four
   * `Surface` tones a transparent field sits on, the four row washes an
   * in-place field paints, the pressed `selectedActive` fill it keeps, and the
   * four soft status fills a field inside a status panel paints
   * (`softFieldPairs`).
   */
  readonly placeholder: string;
```

### 3.2 `docs/tokens.md`

The default role-table row (`:278`) already names all fourteen. Only the
high-contrast row (`:582`) changes, from:

> placeholder text

to the same use cell the default row carries (without its native-field
parenthetical):

> a hint the consumer renders on the `input` fill, the
> `background`/`card`/`popover`/`muted` surfaces a transparent field paints, the
> `hover`/`active`/`accent`/`selected`/`selectedActive` washes a field inside a
> row paints and the four soft status fills a field inside a status panel paints

Keep both value cells and every other cell unchanged.

### 3.3 `packages/tokens/src/placeholder-claims.test.ts` (new)

Header comment names the bug in the AGENTS §3 form. Cases in §6.

### 3.4 `TODO.md`

Tick the queued row (the one beginning *"Name the soft status fills in
`ThemeColors.placeholder`"*), correcting its stale "thirteen-surface" wording
to the fourteen the contract measures, and move the progress bar to `338/416`.

### 3.5 `.agents/slop/plans/README.md`

Index plan `749` after `747`.

### 3.6 `COMPONENTS.md`

Append one clause to the `Theme contrast check` ledger row: plan `749` holds the
public `placeholder` role and both catalogue rows to the fourteen surfaces its
pairs measure. No count changes.

### 3.7 No example

No executable example is added: this plan changes prose and adds a
documentation guard, and no API shape or value moves. `examples.test.ts` and
`docs-links.test.ts` must stay green unchanged.

## 4. Commands and expected results

All token commands run from `packages/tokens`.

### 4.1 Prove the test fails first (two directions)

1. Write `src/placeholder-claims.test.ts` (§6) **before** §3.1–§3.2.
2. `nub exec vitest run src/placeholder-claims.test.ts`

Expected: **fails** on the JSDoc case (the block does not name `selectedActive`,
the four soft fills or `softFieldPairs`) and on the AAA role-row case (it names
none of the fourteen). The derived-pair case passes in both directions by
design. If the suite passes before the fix, the guard is not reading the right
passages — fix the guard, not the prose.

### 4.2 Scoped tests

```sh
nub exec vitest run src/placeholder-claims.test.ts src/placeholder-surfaces.test.ts src/soft-field.test.ts src/selection-press.test.ts src/docs.test.ts src/readme.test.ts src/inventory.test.ts
```

Expected: all green after §3.1–§3.2.

### 4.3 Whole package

```sh
nub run --filter @gpuixui/tokens test
```

Expected: one more passing file than before this plan, `0 failed`, inside the
20 s budget plan `333` set.

### 4.4 Gates

```sh
nub run check
nub run lint
nub run test
```

Expected: all three green. `check:tests` rejects an assertion that cannot fail.

### 4.5 Native verification

Not applicable: this plan changes prose and adds a documentation guard; no
token value, style property or interaction changes. Do not claim a native run.

## 5. STOP conditions

- **STOP** if `contrastPairs` yields anything other than fourteen `placeholder`
  pairs or their backgrounds differ from the table in §1. The documented
  "fourteen" is then wrong beyond this plan (the design system, the README and
  the default catalogue row all say fourteen) and that is a separate repair.
- **STOP** if a fix would need a colour, pair, floor or metric to move. This
  plan only corrects prose.
- **STOP** if the guard cannot distinguish the two catalogue role rows from the
  historical narrative that also mentions `placeholder` surfaces. Anchor on
  lines that start with `` | `placeholder` | `` and on the JSDoc block above
  `readonly placeholder: string;`, as `disabled-fill-claims.test.ts` does.
- **STOP** if `docs.test.ts` pins a literal containing the old AAA use cell
  "placeholder text"; update that literal in the same commit instead of
  weakening the row.

## 6. Test plan

New suite `src/placeholder-claims.test.ts`, modelling
`disabled-fill-claims.test.ts`: read `color.ts`, `docs/tokens.md` with
`node:fs`, normalise whitespace, and assert against the contract.

1. **"measures the hint on fourteen surfaces"** — the `placeholder` pairs have
   fourteen entries, every one is `secondary`, and there is one pair per
   surface (no duplicate background). This is the derived half; it makes the
   prose assertions below complete.
2. **"the public role names every surface it is measured on"** — the JSDoc
   block above `readonly placeholder: string;` contains `softFieldPairs`, every
   surface the pairs name (as `` `surface` ``), the word `fourteen` and the
   count itself, and does not contain the stale nine-surface wording
   (`the four row washes an in-place field paints.` as its ending is replaced;
   assert the block no longer ends that sentence before naming the pressed
   row — easiest as: it must contain `selectedActive` and `softFieldPairs`).
3. **"both catalogue role rows describe the measured hint"** — there are exactly
   two lines starting `` | `placeholder` | ``; each contains every surface the
   pairs name and `softFieldPairs` (the default row gains the owner name; the
   AAA row gains the whole list). Neither may say only `placeholder text`.

Cases 2 and 3 fail before §3.1–§3.2 and pass after; case 1 passes in both
directions and keeps the guard honest.

## 7. Acceptance criteria

- `ThemeColors.placeholder` and both catalogue role rows describe the hint as
  measured on the fourteen surfaces, naming `softFieldPairs` and the pressed
  `selectedActive` fill.
- No colour, pair, floor, metric or role moves: `contrastPairs` **470**, the
  placeholder pairs fourteen.
- The new suite fails on the pre-fix prose (run §4.1 and keep the evidence in
  the commit message) and passes after.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` are green.
- `TODO.md`, `COMPONENTS.md` and the plan index carry plan `749`.

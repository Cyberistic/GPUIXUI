# Plan 399 — the solid status fill and its one call

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
014 (status tones), 057 (`xText`), 071 (the contrast contract), 083/314 (status
text on the washes and the quiet panel), 090 (`xSoftBorder`), 300 (the soft
surface on the quiet panel), 308 (the chip's edge on eight surfaces), 309 (the
interactive fills on their panels), 324 (the public type index), 332 (a fill as a
mark), 347 (`track`), 371 (the colour-format check), 383 (the total theme
check), 387 (`shippedThemes`), 388 (the shipped-set claim), 394
(`softAction`), 398 (the check index).

**Status:** executed on `agent/tokens-theme` (2026-10-18). Two deviations,
both forced by the contract's own uniqueness rule and recorded in §2: the list
is 28 pairs, not 32, because `destructive` is also an action fill and its four
base-surface pairs already exist in `stateFillSurfacePairs`; the contract
therefore grows 360 → 388, not 392. The docs-test case that asserts the
interactive fills now checks coverage rather than exact equality, because one
role serves two families.

---

## 1. The measured gap

The four status families publish **three tonalities**: a solid fill with one
readable foreground, a soft surface with its foreground and designed edge, and
`xText` for labels and dots on a plain surface. The documents state it —
`docs/tokens.md`'s status table has a `Solid fill` column
(`info` / `infoForeground` …), `ThemeColors.success` is documented as
"success background and indicator", and `docs/design-system.md` §8 says a status
is painted "via its solid role for a fill". The design system also states the
corollary: "A fill is not automatically a surface … Status marks are `xText`,
never the solid status fill."

Half of that pair is measured. `contrastPairs` holds each `xForeground` on its
`x` fill (`infoForeground` on `info`, …, at the 4.5:1 / 7:1 on-colour floor),
which is exactly what makes the solid role a *fill*. The other half is not: no
list holds a solid status fill to the surface it paints on. Plan 309's
`stateFillSurfacePairs` covers the *interactive* fills — the action families,
the washes and `selected` — and a status chip is not interactive, so it fell
outside the list. `markPairs` covers `success`, `destructive` and `primary` as
*glyphs* on the four plain surfaces, which is a different question at a
different floor.

The consequence is the class of defect the whole audit series exists to close: a
copied platform style or brand theme that sets a status fill close to its panel
erases the chip, and `themeFailures` returns `[]` because nothing measured it.
The status contract had already found the same defect twice for neighbouring
compositions — a status label on a row wash (plan 083) and a soft status surface
on the quiet panel (plan 300) — so a solid chip is the remaining hole in the
same family.

**Measured on the built package** with its own `contrastRatio`, four solid
fills × the eight surfaces a chip sits on, less the four `destructive` pairs the
interactive fills already publish (`background`, `card`, `popover`,
`muted`, `hover`, `active`, `accent`, `selected`) × 24 shipped sets:
**28 pairs after the overlap below, none failing**, so this is a guard, not a palette change. The
tightest pair is **1.262:1** (XP light `warning` on `selected`); on the four
base surfaces it is **1.549:1** (light `warning` on `background`, the figure the
catalogue already quotes at 1.78:1 for the identity set). Identity light:
`info` `#2559D6`, `success` `#158754`, `warning` `#F5B01F` (its foreground
`#2A1B00`), `destructive` `#CC3439`.

The same audit found the second half of the gap in the helper:
`statusTone(theme, tone)` resolves the soft surface, its foreground, its edge and
`xText`, but **not** the solid pair. A consumer building a solid status chip
therefore retypes the role names the helper exists to own —
`theme.colors[tone]` / `theme.colors[`${tone}Foreground`]` — and can pair a fill
with the wrong foreground. The catalogue's own sentence says the helper
"resolves the soft surface, its readable foreground, its designed edge, and the
plain-surface text role", so the third tonality is documented in the table and
absent from the call.

## 2. Decision

1. **`statusTone` resolves the solid pair too.** `StatusToneStyle` gains
   `solid: { background, foreground }` — additive, so every existing consumer
   (`components/internal/theme.ts` `tone()`, which destructures the soft trio)
   is unchanged. `solid.background` is `theme.colors[tone]` and
   `solid.foreground` is `theme.colors[`${tone}Foreground`]`, in one place, so a
   solid chip cannot pair a fill with the wrong on-colour.
2. **Publish `statusFillPairs`** — each of the four solid fills on each of the
   eight surfaces a chip sits on, at the `surface` floor (1.05:1, 1.05:1 at
   AAA). Spread into `contrastPairs`, which grows **360 → 388**. `destructive` is
   also an action fill, so the four base-surface pairs it already has through
   `stateFillSurfacePairs` are filtered out rather than measured twice. No
   colour moves.
3. **One owner for the eight-surface list.** The list already exists as
   `softBorderSurfaces` (plan 308). Rename it `chipSurfaces` — a chip is a soft
   badge *or* a solid one — and use it for both lists, so the two cannot drift.
4. **Keep the mark question separate.** The solid role used as a dot, bar or
   glyph is a mark at 3:1 (4.5:1 at AAA), and `markPairs` already measures
   `success`, `destructive` and `primary` there; light `warning` is deliberately
   not a mark (1.78:1 on the canvas), which is why a status dot is `xText`. The
   shipped Avatar presence dot is the recorded cross-team row, not this plan.
5. **Document the distinction** in the reference, the design system and the
   README: a solid status fill is measured as a *fill* on the eight chip
   surfaces; a status dot or label is `xText`, never the solid fill.
6. **Guard it** in `status-solid.test.ts`, and keep the documents derived from
   the list in `docs.test.ts`.

Rejected alternatives, with reasons:

- **Add the solid roles to `markPairs` on every surface.** A mark floor is
  3:1; light `warning` measures 1.78:1 on the canvas and fails in 12 shipped
  sets, so the pair would turn a deliberate palette decision red and its fix
  belongs to the Avatar dot's `xText` migration (already recorded cross-team).
  A fill and a mark are different classes — plan 332 exists for exactly this.
- **Measure only the four base surfaces.** A solid Badge in a selectable or
  selected row sits on `accent`/`selected` like a soft chip does, and plan 308
  already established the eight-surface chip list for that composition.
- **Rename `StatusToneStyle.background`/`foreground` to `soft.*`.** It would
  read better beside `solid.*` but it is a public, already-consumed shape; an
  additive field breaks nobody and a breaking rename buys nothing.
- **A separate `solidStatusTone(theme, tone)` call.** Two calls for one family
  invite the mismatch the helper removes; the existing shape is a flat record
  and one more field keeps it one lookup.
- **Leave it unmeasured and let the documents carry the claim.** That is the
  defect: the page publishes a `Solid fill` column and the ledger a "solid
  role for a fill", and nothing held an edited theme to it.

## 3. Exact edits

### 3.1 `packages/tokens/src/styles.ts`

Extend `StatusToneStyle` after `text`:

```ts
  /**
   * The solid fill and its one readable foreground — the third tonality the
   * status families publish, beside the soft surface and the plain-surface text.
   * The fill is measured on the eight surfaces a status chip sits on
   * (`statusFillPairs`) and the foreground on the fill; a status *dot* is
   * `text`, not this, because the light `warning` fill is 1.78:1 on the canvas,
   * under the 3:1 a mark needs.
   */
  readonly solid: {
    /** The solid fill (`info`, `success`, `warning` or `destructive`). */
    readonly background: string;
    /** The on-colour foreground (`xForeground`). */
    readonly foreground: string;
  };
```

Extend the `statusTone` return:

```ts
    text: theme.colors[`${tone}Text`],
    solid: {
      background: theme.colors[tone],
      foreground: theme.colors[`${tone}Foreground`],
    },
```

Extend the `statusTone` JSDoc: one sentence naming the third tonality and the
mark distinction, and one line in the example:

```ts
 * tone.solid.background; // "#2559D6" in the light theme — the solid fill
```

### 3.2 `packages/tokens/src/contrast.ts`

Rename the private eight-surface list and its doc comment opening so it owns
both chip lists (the value order and the comment's content stay the same):

```ts
const softBorderSurfaces = [ … ] as const;
```

becomes

```ts
const chipSurfaces = [ … ] as const;
```

and `softBorderSurfacePairs` iterates `chipSurfaces`. Its JSDoc already says
"the surfaces a soft status chip occupies"; widen the opening to "a status chip
occupies" and note that a solid chip uses the same list.

After `softBorderSurfacePairs`, add:

```ts
/**
 * The solid status fill on the surfaces a chip occupies. The solid roles carry a
 * measured foreground (`xForeground` on `x`), so they are designed as fills; the
 * fill half of that pair was the one no list measured, because plan 309 holds
 * the *interactive* fills and a status chip is not interactive. A status dot or
 * label is a different class: it is `xText` at the secondary floor, because the
 * light `warning` fill is 1.78:1 on the canvas, under the 3:1 a mark needs. A
 * solid chip is a fill, so it is held to the perceivability floor where it is
 * painted.
 */
export const statusFillPairs: readonly ContrastPair[] = statusTones.flatMap(
  (tone) =>
    chipSurfaces.map(
      (background): ContrastPair => [tone, background, "surface"],
    ),
);
```

Spread it into `contrastPairs` immediately after `...softBorderSurfacePairs`, so
the status lists stay together.

Extend the `contrastPairs` JSDoc with a clause naming `statusFillPairs` beside
the soft chip's edge. Extend the `themeContrastFailures` JSDoc's `contrastPairs`
bullet with `` `statusFillPairs` `` (the chip surfaces a solid status fill is
held against) — `contrast-reference.test.ts` requires every list named.

### 3.3 New `packages/tokens/src/status-solid.test.ts`

Header comment states the guarded bug: **the solid status roles are documented
as fills and have a measured on-colour foreground, but no pair held the fill to
the surface it paints on, so a copied theme whose status fill equalled its card
erased a solid chip while every check returned `[]`; and `statusTone` resolved
every tonality except the solid one.**

Cases (expectations derived from the package, not from literals):

1. **The helper resolves the solid pair in every shipped set** — for each
   `shippedThemes` entry and each `statusTones` member,
   `statusTone(theme, tone).solid` equals `{ background: theme.colors[tone],
   foreground: theme.colors[`${tone}Foreground`] }`.
2. **The list is every tone on every chip surface** — `statusFillPairs` has the full
   `statusTones × 8` matrix less the overlapping `destructive` pairs, is derived (`map` equality), and every pair
   is the `surface` class.
3. **Every shipped set clears the floor** — `shippedThemes` flatMapped over the
   list, labelled with `theme.name`; each ratio ≥
   `contrastFloors[theme.contrast].surface`.
4. **The checker reports a solid fill that vanishes into its surface** — set
   `success` to `getTheme("light").colors.card`; expect eight `success` failures,
   each `surface`, each floor 1.05, each ratio 1. This is the case that fails
   before the fix (no pair exists) and passes after it.
5. **The total check tags it** — `themeFailures` on the same theme contains a
   `kind: "contrast"` entry for `success`.
6. **The mark story is unchanged** — `markRoles` does not contain `"warning"`,
   and `markPairs` measures `primary`/`success`/`destructive` (not `info`) at
   the mark floor; assert the sets, so a later edit cannot quietly turn the fill
   pairs into mark pairs or vice versa.

### 3.4 `packages/tokens/src/contrast.test.ts`

- Import `statusFillPairs`.
- In `it("covers every documented pair")`: `contrastPairs.length` 360 → 388;
  `expect(statusFillPairs).toHaveLength(28)` and the derived map equality
  (`statusTones` × the eight surfaces, foreground in `statusTones`).

### 3.5 `packages/tokens/src/docs.test.ts`

- Pair history: `taking it from 339 to …` becomes
  `taking it from 360 to **${contrastPairs.length}**`.
- New case in the quoted-figures block: derive the weakest pair in
  `statusFillPairs` across `quotedSets` and assert it is
  `warning`/`selected`/`XP light` at **1.262:1**; require the catalogue to
  contain `**1.262:1** (XP light `warning` on `selected`)`.
- New case in the design-system block: every solid status fill and every chip
  surface must be named in the §9 "solid status fill" row and the page must
  contain `statusFillPairs`; each `statusTones` member and each surface of
  `statusFillPairs` is checked, so a fifth tone or a new surface cannot ship
  unnamed.
- Add `solid status fill` to the state-row check if the §8 status row is the
  place the details land (see 3.8) — the row is already in the
  "has a row for every interaction state" list as `status`.

### 3.6 `docs/tokens.md`

- After the paragraph "The solid roles are fills, not foregrounds …", add one
  paragraph:

  > Because it is a fill, the solid role is held like one: `statusFillPairs`
  > measures each of the four solid fills on the eight surfaces a status chip
  > sits on — `background`, `card`, `popover`, the `muted` panel and the four row
  > washes — at 1.05:1 (1.05:1 at high contrast). The tightest shipped pair is
  > **1.262:1** (XP light `warning` on `selected`), so the pairs guard an edited
  > theme rather than a shipped value. A status *dot* is still `xText`: a fill
  > that is perceptible as a large chip is not a mark, and the light `warning`
  > fill is 1.78:1 on the canvas.

- Extend the `statusTone` snippet with `tone.solid.background` and
  `tone.solid.foreground`, and the sentence before it to say it resolves the
  solid pair as well.
- In "Every colour role is accounted for", name `statusFillPairs` among the
  lists.
- In the contract narrative, append the audit step at its end:
  "Plan `399` adds the solid status fill on the eight surfaces a status chip
  sits on (`statusFillPairs`) — four fills on eight surfaces less the four
  `destructive` pairs the interactive list already holds, 28 pairs, no colour
  moves — taking it from 360 to **388**."
- In `## Verification`, name `status-solid.test.ts`.

### 3.7 `docs/design-system.md`

- §8 `status` row: after the soft/edge clause, add "the solid fill is held to
  the perceivability floor on the eight surfaces a status chip sits on
  (`statusFillPairs`); a dot or label is `xText`, never the solid fill".
- §9 table: after the "interactive fills and washes" row, add

  `| solid status fill (`info`/`success`/`warning`/`destructive` on `background`, `card`, `popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes) | 1.05:1 | 1.05:1 |`

  with the floors interpolated from `contrastFloors`.
- §8's paragraph that introduces "A fill is not automatically a surface …" stays
  as it is; the new sentence is the other half (a fill is still a surface).

### 3.8 `packages/tokens/README.md`

One sentence in the "Checking a theme" enumeration, beside the soft-status
clause: "the solid status fills themselves are held to 1.05:1 on the eight
surfaces a chip sits on (`statusFillPairs`), because a solid role is a fill; a
status dot or label is `xText`."

### 3.9 `COMPONENTS.md`

- **Status tones** row: name `statusTone(theme, tone).solid` and
  `statusFillPairs`; say the solid fill is measured on the eight chip surfaces
  while a dot is `xText`.
- **Theme contrast check** row: `360 contrast pairs` → `${contrastPairs.length}`
  (388) and add `statusFillPairs` to the list of lists named in the row.
- **Design tokens** row: no role count change (70), one clause that the solid
  status fill is measured.

### 3.10 `TODO.md`

- Section count `164/221` → `165/222`.
- Append a ticked row after plan 398's, stating: the solid status fill was the
  documented third tonality with no surface pair and no helper field; 28 pairs
  (360 → 388), no colour moves, tightest 1.262:1; `statusTone(...).solid`;
  mark/dot story unchanged.

## 4. Commands and expected results

Run from `packages/tokens` unless stated:

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| `nub exec vitest run src/status-solid.test.ts` | 6 passed |
| `nub exec vitest run src/contrast.test.ts src/docs.test.ts src/inventory.test.ts src/styles.test.ts src/snippets.test.ts src/contrast-reference.test.ts src/exports.test.ts` | all passed |
| `nub run --filter @gpuixui/tokens test` | the whole suite green (118+ files) |
| `nub run lint` (repo root) | exit 0 |
| `nub run check` (repo root) | exit 0 |

## 5. STOP conditions

Stop and report instead of improvising if:

- any shipped set fails a new `statusFillPairs` pair — the plan claims no colour
  moves; a failure means the audit was wrong, so record the failing set and
  re-plan rather than moving a colour;
- a document guard requires a count or surface list the implementation does not
  produce, or a test that should be new already exists;
- `contrastPairs.length` is not 360 before the change (another plan landed);
- the repo-wide gates fail for a reason outside `packages/tokens`, `docs/`,
  `COMPONENTS.md` or `TODO.md` — record it, do not edit another workstream.

## 6. Test plan (prove both directions)

1. Before the implementation, add only `status-solid.test.ts` and confirm cases
   1, 4 and 5 fail for the documented reason (case 1: `solid` is `undefined`;
   case 4: `themeContrastFailures` returns no `success` pair; case 5: no
   `contrast` kind). Cases 2, 3 and 6 fail to compile/import before the list
   exists, which is the same evidence.
2. Implement 3.1–3.3, run `status-solid.test.ts` → 6 passed.
3. Update counts/docs/tests; run the package suite and the repo gates.
4. Re-run case 4 with the `...statusFillPairs` spread removed (stash-style, then
   restore): it must fail again, proving it guards the list and not the helper.
5. Report the exact commands and outputs in the commit message body.

## 7. Acceptance

- `statusTone(theme, tone).solid` resolves the fill and its on-colour for every
  tone in every shipped set.
- `statusFillPairs` is public, derived from `statusTones` and one eight-surface
  list, spread into `contrastPairs` (360 → 388), and every shipped set clears
  its floor.
- The checker reports an erased solid status fill and the total check tags it.
- The reference, the design system, the README, the ledger and `TODO.md` state
  the new list and the fill-versus-mark distinction; the derived docs cases fail
  if they drift.
- Every gate in §4 passes; no colour, role, floor or existing pair moves.

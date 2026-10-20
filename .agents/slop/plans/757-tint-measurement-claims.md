# 757 — The tint is measured, and three passages still say it is not

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, and the design-system rows of `COMPONENTS.md`).
**Phase:** F (contract completeness / docs truth).
**Depends on:** 085 (the elevation tint), 371 (the colour-format check),
505 (the elevation contrast walk), 747/749/750 (the same claims class),
754 (a published pair list must be enforced).

## 1. The defect

`shadow` is the one **tint** role: `alpha()` writes each elevation level's
alpha into it, and since plan `505` the contrast check composites it at that
alpha over the surfaces the level floats above. So a copied theme whose tint
equals its backdrop — or whose tint is not a colour the maths parses — is
reported by `themeFailures`.

Three current-state passages say the opposite:

1. `packages/tokens/src/contrast.ts`, the JSDoc of `themeColorFailures` — the
   public reference for the colour check:

   > A measured role in another CSS form is painted by the runtime but invisible
   > to the helpers; for a measured role the contrast check then reports `NaN`,
   > but the tint roles have no pair: a `shadow` of `"black"` makes every
   > elevation level fully opaque because `alpha` returns an unparseable tint
   > unchanged, **and no other check sees it**.

2. `docs/tokens.md` §*Colour format*:

   > **The tint roles have no pair.** `shadow` is applied to every elevation
   > level through `alpha()` (plan `085`), and an unparseable tint is returned
   > unchanged, so `shadow: "black"` painted a **fully opaque** shadow at every
   > level — the shipped 0.08, 0.12 and 0.16 alphas gone — **while both other
   > checks returned `[]`**.

3. `COMPONENTS.md`, the **Theme colour check** row:

   > … A measured role in another CSS form fails the contrast check as `NaN`;
   > **the tint roles have no pair**, so a `shadow` of `"black"` made every
   > elevation level fully opaque while both other checks returned `[]`
   > (plan 371).

The sentence is false now, and the package itself says so three ways:

- `contrast.ts`'s `elevationFailures` composites every defined level at its own
  alpha and reports a `ContrastFailure` naming `shadow`, the level and the
  fraction (plan `505`).
- `contrast.test.ts`'s completeness exemption list holds exactly one entry and
  its comment says "`shadow` used to be here; the elevation walk measures it
  composited at each level's alpha (plan 505)".
- `docs/tokens.md`'s own completeness paragraph (~1400 lines below passage 2)
  says `themeContrastFailures` "measures `shadow` composited at each elevation
  level's alpha over `elevationSurfaces`" and that `scrollbar` is "the one role
  that is not a pair" — a direct self-contradiction inside one document.
- `docs/design-system.md` §9 says "Plan `505` measures the shadow, so that tint
  also fails the contrast check as `NaN`".

Measured on this tree (`packages/tokens`, probe run 2026-10-20):

```
themeColorFailures(tinted)       -> [{ role: "shadow", value: "black" }]
themeContrastFailures(tinted)    -> 33 failures, ratio NaN,
                                    wash "shadow", levels sm/md/lg,
                                    over elevationSurfaces + md's content fills
themeMetricFailures(tinted)      -> []
themeOpacityFailures(tinted)     -> []
themeFailures(tinted) kinds      -> ["color", "contrast"]
```

So "no other check sees it" is false, and the *practical* harm is the other
direction: a consumer reading the reference is told the colour check is the only
guard on an edited tint, while a tint that is a perfectly valid hex and equals
its backdrop — the case the elevation walk exists for — is reported only by the
contrast check.

The ledger's historical clause ("…made every elevation level fully opaque while
both other checks returned `[]` (plan 371)") is **true of plan 371**, which
predates the elevation walk. The fix keeps that history and stops stating it in
the present tense.

## 2. Exact changes

### 2.1 `packages/tokens/src/contrast.ts` — the `themeColorFailures` JSDoc

Replace the last sentence of the paragraph (from "for a measured role the
contrast check then reports `NaN`, but the tint roles have no pair:") with:

> A role in another CSS form is painted by the runtime but invisible to the
> helpers, so the contrast check reports `NaN` for it — the tint included,
> because the elevation walk composites `shadow` at each defined level's own
> alpha over `elevationSurfaces`. A `shadow` of `"black"` therefore makes every
> elevation level fully opaque (`alpha` returns an unparseable tint unchanged)
> *and* reaches the contrast check as `NaN`; this check is the one that names
> the role, its value and the form.

Keep the `@example` block unchanged. Change nothing else in the file.

### 2.2 `docs/tokens.md` §*Colour format*

Replace the paragraph from "This is the format half…" through "…behave the same
way." with:

> This is the format half of the editable-theme guarantee; the opacity half
> follows below. A role in a non-hex form also fails the contrast check, because
> `contrastRatio` returns `NaN`, which never passes a floor — the tint included:
> `shadow` is a measured composition, composited at each defined elevation
> level's own alpha over `elevationSurfaces` (and over `elevationContentSurfaces`
> for `md`, the level a menu opens across), so an edited tint is not an
> exemption (plan `505`). A fully opaque eight-digit spelling (`#RRGGBBFF`) is
> the same paint, so the maths reads it and measures the colour. `shadow` is
> applied to every elevation level through `alpha()` (plan `085`), and an
> unparseable tint is returned unchanged, so `shadow: "black"` paints a **fully
> opaque** shadow at every level — the shipped 0.08, 0.12 and 0.16 alphas gone —
> and the contrast check reports each composited level as `NaN`. `#000` and
> `rgb(0 0 0)` behave the same way.

Keep the surrounding sentences ("Every shipped identity theme, platform variant
and recipe is hex…", the `isHexColor` block and the paragraph after it)
unchanged.

### 2.3 `COMPONENTS.md` — the **Theme colour check** row

Replace "the tint roles have no pair, so a `shadow` of `"black"` made every
elevation level fully opaque while both other checks returned `[]` (plan 371)"
with:

> no check measured the tint then, so a `shadow` of `"black"` made every
> elevation level fully opaque while both other checks returned `[]`
> (plan 371); since plan `505` the contrast check composites the tint at each
> defined level's own alpha over `elevationSurfaces`, so that edit now fails
> both halves

Do not touch the row's other sentences or any other row.

### 2.4 New guard — `packages/tokens/src/tint-claims.test.ts`

Model it on `disabled-fill-claims.test.ts` (read the three files with
`node:fs`, collapse whitespace, anchor on the paragraph or block, then assert
both the refuted phrases are gone and the owner is named). Header comment states
this bug: three present-state passages claimed the tint has no pair after
plan `505` measured it, while the catalogue's completeness paragraph says
`scrollbar` is the only role that is not a pair.

Cases:

1. **Derives the fact.** On `extendTheme(getTheme("light"), { colors: { shadow: "black" } })`:
   - `themeColorFailures` names the role and the value;
   - `themeContrastFailures` returns one failure per painted pair, each with
     `wash: "shadow"`, `ratio: NaN` and `pairClass: "surface"`; the count equals
     the sum over the defined levels of the surfaces that level walks
     (`elevationSurfaces.length` for `sm`/`lg`, `elevationContentSurfaces.length`
     for `md`), derived from the exported lists — never typed;
   - `themeMetricFailures` and `themeOpacityFailures` return `[]`.
2. **JSDoc**: the block above `export function themeColorFailures(` names
   `elevationSurfaces`, and does not contain "tint roles have no pair" or
   "no other check sees it".
3. **Catalogue**: the *Colour format* paragraph names `elevationSurfaces` and
   `elevationContentSurfaces`, and does not contain "The tint roles have no
   pair".
4. **Ledger**: the `Theme colour check` row names `elevationSurfaces` and does
   not contain "the tint roles have no pair"; it keeps the plan-371 history
   ("plan `371`").
5. **Agreement with the completeness paragraph**: the catalogue's completeness
   paragraph still names `scrollbar` as the one role that is not a pair, so the
   two paragraphs cannot diverge again.
6. **Can fail**: run the same predicate over the three pre-fix strings and
   expect it to name each one.

The suite must fail on the current tree and pass after §2.1–2.3.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

```sh
nub run --filter @gpuixui/tokens exec vitest run src/tint-claims.test.ts
```
Expected after the fix: 1 file, 6 tests passing. Before the fix: cases 2–6 fail
on the three passages.

```sh
nub run --filter @gpuixui/tokens test
```
Expected: every file passes (207 files after this plan; 6986 + 6 tests).

```sh
nub run --filter @gpuixui/tokens check-types
nub run check:tests
nub run lint
nub run fmt
```
Expected: all clean. `nub run check` is the end-of-task gate.

## 4. STOP conditions

- If `themeContrastFailures` does **not** report the unparseable tint, stop and
  report: the design system, `contrast.test.ts`'s exemption comment and the
  completeness paragraph are then also false, and that is a larger plan than
  this one.
- If the catalogue or the ledger contains another present-tense passage making
  the same claim, add it to the guard rather than leaving it — but do not
  rewrite historical plan narratives that are true of their own plan.
- Do not change a token value, a pair, a floor, a metric or a shipped theme.
  This plan moves prose and adds one test file.

## 5. Completion

- The three passages state the measured composition and its owner.
- `tint-claims.test.ts` fails without §2.1–2.3 and passes with them.
- `TODO.md` records the row; the plan index lists `757`; `COMPONENTS.md`'s row
  stays guarded by `inventory.test.ts`.
- Commit on `agent/tokens-theme` and push.

# Plan 573 — The find-highlight wash the native text theme feeds

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
069 (`selectionColor`), 081/087 (the composited selection pairs), 337 (the
native field), 569 (`nativeTextTheme`, the runtime bridge).

**Status:** done. Executed on `agent/tokens-theme`.

**Implementation note.** The check shipped as its own kind —
`themeHighlightFailures`, the eighth entry in `themeChecks`, composed into
`themeFailures` — rather than as two composited calls inside
`themeContrastFailures`. `ContrastFailure` keys a wash by role, and the active
wash is a derived alpha with no role key; folding it into the contrast check also
re-ran the match wash (the `selection` role) over pairs the selection lists
already hold, so the public checker named the same missed composition twice. The
dedicated kind measures both washes once, on the published
`nativeHighlightPairs`, and the derived figures live in
`native-highlight.test.ts`'s `derives every figure the reference quotes` case.
Everything else below is as executed.

---

## 1. The measured gap

`nativeTextTheme(theme)` (plan 569) sets the runtime text theme's `accent` to
`primaryText`. The pinned runtime uses that same field to **seed the default
find-highlight washes**: `HighlightSpec.color` defaults to `theme.accent` at
**30%** alpha and `HighlightSpec.activeColor` to `theme.accent` at **65%**
(`references/gpuix/packages/native/src/text/search.rs`, `parse()`: `let mut base
= theme.accent; base.a = 0.30; let mut active = theme.accent; active.a = 0.65;`
— the prop shipped in 0.5.0, `CHANGELOG.md`, and is present in 0.10.0's
`host.ts`). An explicit `color`/`activeColor` is used verbatim, not re-faded.

So a native `<code>`, `<diff>` or `<markdown>` that enables find highlighting
with the theme prop this package supplies paints `primaryText` as a wash behind
its own text. On the identity dark set, body text through the **active** wash
measures **2.81:1**; through the **match** wash **6.80:1** — under the 7:1 body
floor the package publishes. Every dark shipped set is under the body floor at
30% (macOS 5.99, Linux 5.76, Windows 6.16) and every set, light or dark, is far
under it at 65% (light identity 4.80, Linux/dark 4.73, AAA 4.23). A find bar is
a Tier-4 interaction (`MISSION.md`: search-and-replace, editor surfaces), so
this is a shipped-contract gap, not a hypothetical edit.

The cause is not `primaryText` as a link ink — plan 082 chose it because the
`primary` fill is unreadable as text. It is that the runtime reuses that one
field for a *wash*, and a 65% wash of the accent ink is a surface the text is
then read on.

The package already models every other composited wash: the selection pairs
(`selectionPairs`, `selectionWashPairs`, the soft and fill variants), the
skeleton pulse, the modal scrim, the runtime's fixed text fades. The find
highlight is the one composite the pinned runtime paints from a field this
package chooses and no list measures.

## 2. Decision

1. Ship **`nativeHighlight(theme)`**, the `highlight` prop the runtime reads:
   `{ color, activeColor }`. `color` is the theme's `selection` role — the
   accent-tinted wash designed and already checked for readable text. The active
   match is the same RGB with its alpha raised by **one documented step**,
   `nativeHighlight(theme).activeColor = alpha(selection, selectionAlpha +
   nativeHighlightStep)`, `nativeHighlightStep = 0.1`, clamped to `1`.
2. Publish **`nativeHighlightPairs`** — every text role a native document paints
   that a find can match (`foreground`, `mutedForeground` and the seven
   `nativeSyntaxRoles` roles, deduplicated) on the four `Surface` tones `bg` may
   name (`background`, `card`, `popover`, `muted`) — at the **secondary** floor.
3. Compose both washes into `themeContrastFailures` as composited pairs, so an
   edited theme that raises or erases its `selection` wash is caught by the one
   checker, with `wash: "selection"` and the derived `opacity` in the failure.
4. Document the limitation honestly: a find wash **cannot** keep every syntax
   token at the 7:1 body floor and still be visible. The neutral `hover` wash
   (the only other visible candidate) measures 1.06:1 at its weakest — no
   highlight — and still leaves syntax at 6.30:1. The selection wash keeps every
   token at **5.34:1** (match) and **4.61:1** (active) at the secondary floor,
   body text at **9.65:1** and **8.03:1**, and the wash itself visible
   (1.17:1 / 1.28:1 at the weakest). That is the strongest honest floor; the
   page states it and why.

No new role, no new pair class, no new check kind: the derived washes reuse the
`selection` role, the `secondary` floor class and `ContrastFailure`'s existing
`wash`/`opacity` fields, so `themeChecks` stays seven and every documented count
stays derived.

Alternatives rejected:

- **Map `nativeTextTheme.accent` to `accent` instead of `primaryText`.** The
  accent wash is invisible in dark styles: 1.02–1.11:1 on the card, under the
  1.05:1 surface floor. It would trade unreadable text for no highlight.
- **Map `accent` to a neutral (`hover`/`active`).** No accent tint, `hover` is
  1.06:1 at its weakest, and links in the document lose their brand ink.
- **Add a `selectionStrong` role.** A second translucent role in 24 shipped
  sets, the role index, the opacity index and every catalogue table, for a
  derivation that is a pure function of `selection`. The public checker needs no
  role to measure the composite.
- **Hold the highlight at the body floor.** Impossible with a visible wash: at
  7:1 the wash is at or below the surface floor (an invisible highlight). The
  page records the trade instead of pretending.
- **Do nothing and let consumers pass their own colours.** The package supplies
  the `accent` that seeds the default; a consumer has no way to know the default
  is unreadable in dark, and every other theme-derived paint is measured.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/highlight.ts` (new)

```ts
import { alpha } from "./color.js";
import type { Theme } from "./theme.js";

export const nativeHighlightStep = 0.1;

export interface NativeHighlight {
  readonly color: string;
  readonly activeColor: string;
}

const alphaByte = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})$/;

const ownAlpha = (color: string): number => {
  const match = alphaByte.exec(color);
  return match?.[1] === undefined ? 1 : Number.parseInt(match[1], 16) / 255;
};

export function nativeHighlight(theme: Theme): NativeHighlight {
  const color = theme.colors.selection;
  return {
    color,
    activeColor: alpha(color, Math.min(1, ownAlpha(color) + nativeHighlightStep)),
  };
}
```

JSDoc (public API, so every symbol carries it):

- module/JSDoc for `nativeHighlight`: the runtime's `highlight` prop defaults to
  `theme.accent` at 30% / 65%; `nativeTextTheme`'s accent is `primaryText`, the
  accent's readable ink, and a 65% wash of it takes body text to 2.81:1 in
  identity dark. Return the `selection` role and the same RGB one step stronger,
  so a find bar paints a wash whose text the contract holds. `@example`:
  `highlight={{ ...nativeHighlight(theme), query }}`.
- `nativeHighlightStep` JSDoc: the absolute alpha step, why it is absolute (an
  edited selection may start at any alpha) and that the active wash must stay a
  perceivable step above the match while keeping the secondary floor.
- `NativeHighlight` field docs.

### 3.2 `packages/tokens/src/native-text.ts`

In the `nativeTextTheme` JSDoc, after the `bg` paragraph, add: the `accent`
field also seeds the runtime's default find-highlight washes (30% and 65%), and
those are not readable in every mode; `nativeHighlight(theme)` is the prop a
find bar passes. No code change.

### 3.3 `packages/tokens/src/contrast.ts`

1. Import `nativeHighlight`, `nativeHighlightStep` (only if needed) from
   `./highlight.js`.
2. Add near `nativeSyntaxPairs`:

```ts
const nativeHighlightSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

export const nativeHighlightPairs: readonly ContrastPair[] = [
  ...new Set([
    "foreground",
    "mutedForeground",
    ...Object.values(nativeSyntaxRoles),
  ] as const),
].flatMap((role) =>
  nativeHighlightSurfaces.map(
    (background): ContrastPair => [role, background, "secondary"],
  ),
);
```

JSDoc: the roles a find can match (the syntax captures plus the body and
secondary tiers), the four surfaces `bg` may name, the secondary floor and why
(no visible wash keeps a syntax token at body strength; the tightest shipped
pairs are 5.34:1 match and 4.61:1 active, body text 9.65/8.03 above the body
floor).

3. Add the composited runner next to `textOverWashFailures`:

```ts
const alphaOf = (color: string): number | undefined => {
  const match = translucentHex.exec(color);
  return match?.[2] === undefined ? undefined : Number.parseInt(match[2], 16) / 255;
};

const textOverPaintFailures = (
  pairs: readonly ContrastPair[],
  paint: string,
  theme: Theme,
  floors: Readonly<Record<ContrastPairClass, number>>,
): ReadonlyArray<ContrastFailure> =>
  pairs.flatMap(([foreground, background, pairClass]) => {
    const ratio = contrastRatio(
      theme.colors[foreground],
      compositeOver(paint, theme.colors[background]),
    );
    const floor = floors[pairClass];
    const opacity = alphaOf(paint);
    return ratio >= floor
      ? []
      : [
          {
            foreground,
            background,
            wash: "selection",
            pairClass,
            floor,
            ratio,
            ...(opacity === undefined ? {} : { opacity }),
          },
        ];
  });
```

4. In `themeContrastFailures`, after the selection lists:

```ts
const highlight = nativeHighlight(theme);
...
...textOverPaintFailures(nativeHighlightPairs, highlight.color, theme, floors),
...textOverPaintFailures(nativeHighlightPairs, highlight.activeColor, theme, floors),
```

5. Extend the `themeContrastFailures` JSDoc prose: name `nativeHighlightPairs`
   and the two derived washes beside the selection lists (`contrast-reference.test.ts`
   requires every applied list to be named, and states no counts).

### 3.4 `packages/tokens/src/index.ts`

No change — it is `export *` per module; add `export * from "./highlight.js";`
in the same alphabetical position (`highlight.js` before `metrics.js`).

### 3.5 `packages/tokens/src/contrast-reference.test.ts`

Add `"nativeHighlightPairs"` to `appliedLists`.

### 3.6 `packages/tokens/src/contrast.test.ts`

1. Import `nativeHighlightPairs`.
2. Add it to the compile-enforced `publishedPairLists` record (the key type
   derives from every exported `*Pairs`, so `check-types` fails until it is
   listed).
3. No count changes: `contrastPairs` is unchanged; composited lists are not in
   it.

### 3.7 `packages/tokens/src/native-highlight.test.ts` (new)

Header comment states the bug this file guards: the runtime seeds find washes
from the theme accent at 30/65%; `nativeTextTheme`'s accent is `primaryText`,
which measures 2.81:1 for body text in identity dark at 65% and 6.80:1 at 30%
while every check returned `[]`. Cases:

1. **The runtime default is the defect.** For every shipped theme assert
   `nativeTextTheme(theme).accent === theme.colors.primaryText`; compute
   `compositeOver(alpha(accent, 0.3), card)` and `…0.65…`; assert identity dark's
   foreground falls below the body floor on both (6.80 and 2.81, tolerance
   `toBeCloseTo`), so the file fails on a revert to "no helper, use the default".
2. **The helper is the selection wash plus one step.**
   `nativeHighlight(theme).color === theme.colors.selection`; the active colour
   equals `alpha(selection, ownAlpha + 0.1)`; RGB is preserved; on an edited
   theme with an opaque selection the active colour is opaque rather than
   `NaN` (parse `#RRGGBBAA` locally, not with an unsafe cast).
3. **Every shipped set clears the secondary floor through both washes**, on each
   of the four surfaces, for every role in `nativeHighlightPairs`, and body text
   (`foreground`) stays above the **body** floor. This case must read
   `shippedThemes` (plan 388's guard), and its title may claim "every shipped
   theme".
4. **The checker fails an edited theme.** Extend identity light with
   `{ colors: { selection: alpha(lightColors.selection, 0.95) } }`; assert
   `themeContrastFailures` reports a failure whose `wash === "selection"` and
   whose `foreground`/`background` name a highlight pair (so the check can fail,
   not only pass).
5. **The active wash is a perceivable step above the match.** For every shipped
   set, `contrastRatio(compositeOver(active, surface),
   compositeOver(color, surface)) > 1` (or `>= contrastFloors.default.step`); the
   shipped minimum is 1.28:1 step from the surface vs 1.17 for the match.
6. **The example runs.** Import `nativeHighlight` and assert the example file's
   two colours (add `packages/tokens/src/native-highlight.example.ts` used by the
   docs snippet guard's executable-example policy — every `*.example.ts` must be
   imported by a suite).

`packages/tokens/src/native-highlight.example.ts` (new): a resolved theme, the
highlight prop for a find bar, and a second theme for the active wash, following
`native-text.example.ts`.

### 3.8 `packages/tokens/src/native-text.test.ts`

The "names every native field and syntax capture in the reference" case adds
`nativeHighlight`, `nativeHighlightPairs` and `NativeHighlight` to the names it
requires in `docs/tokens.md`.

### 3.9 `docs/tokens.md`

1. **Types** index: add `NativeHighlight` (alphabetical) — "The `highlight` prop
   for a native find bar." (`public-types.test.ts`/`docs.test.ts` read this
   table.)
2. **Native text documents**, after the `bg` paragraph: a new paragraph and
   example:

   - the runtime seeds the highlight washes from `theme.accent` at 30% / 65%
     with the `search.rs` path as evidence;
   - `nativeTextTheme`'s accent is `primaryText`, so the default takes body text
     to 2.81:1 in identity dark at 65% and 6.80:1 at 30%;
   - `nativeHighlight(theme)` returns `{ color, activeColor }`: the `selection`
     role and the same RGB one `nativeHighlightStep` (0.1) stronger, so the
     active match is a perceivable step (1.28:1 at the weakest vs 1.17 match)
     while text keeps the secondary floor (5.34:1 match, 4.61:1 active, on all
     four `Surface` tones; body text 9.65/8.03 above the body floor);
   - the honest limitation: no visible wash keeps every syntax token at the
     body floor — the neutral `hover` wash is 1.06:1 at its weakest and still
     leaves syntax at 6.30:1 — so the pairs are held at the secondary floor and
     the page says so;
   - how to apply: `highlight={{ ...nativeHighlight(theme), query }}`.
3. **Checking a theme** / contrast contract paragraph: name
   `nativeHighlightPairs` with the other composited lists, and add it to the
   sentence about what `themeContrastFailures` covers.
4. **Limitations and future work**: one bullet: find highlighting is
   secondary-floor by design; the runtime exposes no outline highlight and the
   body floor cannot be kept through a visible wash.
5. **Verification** guarantee sentence: keep the derived sentence untouched
   (`themeChecks` does not grow) but add the highlight pair list to the lists
   the prose names, without restating counts.

### 3.10 `docs/design-system.md`

In §9 Accessibility, beside the selection paragraph: a find highlight is a
composited wash; the selection role is the source; the active match adds
`nativeHighlightStep`; the floor is the secondary class because no visible wash
keeps syntax at body strength; quote no new unguarded figures (the suite holds
the numbers).

### 3.11 `COMPONENTS.md`

In the `Design tokens` row, after the selection sentence: find highlighting is
`nativeHighlight(theme)` (selection wash + one step for the active match),
published as `nativeHighlightPairs` at the secondary floor, because the
runtime's accent default measured 2.81:1 for body text at 65% in identity dark
(plan 573).

### 3.12 `TODO.md` and the plan index

- Add under Design tokens and theming:

  `[x] Ship the find-highlight contract — `nativeHighlight(theme)` ... (plan 573)`

- Add the plan row to `.agents/slop/plans/README.md` after 572 and a sentence to
  the block's closing paragraph.

## 4. Commands and expected results

Run from the worktree root:

```sh
nub run --filter @gpuixui/tokens check-types
# expect: Done, no diagnostics (the `publishedPairLists` key type forces the
# new list into the inventory)

nub run --filter @gpuixui/tokens test
# expect: all files pass; the new suite's 6 cases included

nub run check
# expect: check-tests, lint, fmt and check-types all pass
```

Two-direction proof for the regression case (AGENTS §3):

```sh
# 1. With the fix: the highlight cases pass.
nub run --filter @gpuixui/tokens test -- native-highlight

# 2. Revert only `nativeHighlight` to `{ color: theme.colors.primaryText,
#    activeColor: alpha(primaryText, 0.65) }` (or delete its body), re-run:
#    expect case 1 and case 3 to FAIL (identity dark 2.81 < 7, and the
#    highlight pairs under the floor), proving the suite catches the defect.
# 3. Restore the fix; expect green again.
```

`scripts/verify-two-directions.sh` is currently written against `jj`
(TODO harness row); this worktree uses git, so record the manual both-directions
run above in the commit message.

## 5. STOP conditions

- **STOP** if the pinned runtime does not seed `highlight` from `theme.accent`
  at 30/65% with the evidence quoted in §1 — the whole derivation would be a
  lie. Re-read `references/gpuix/packages/native/src/text/search.rs` and
  `host.ts`, and report the discrepancy instead of shipping the helper.
- **STOP** if any shipped theme cannot clear the secondary floor through both
  washes without moving a colour. Report which set and pair; do not move role
  values in this plan.
- **STOP** if `themeContrastFailures` would need a new failure shape or a new
  check kind: the existing `wash`/`opacity`/`pairClass` fields are the contract
  this plan relies on. Re-plan instead of growing the union.
- **STOP** if the docs guard requires quoting a figure that `figures.ts` cannot
  derive; use a count-free sentence rather than an unguarded number.

## 6. Acceptance

- `nativeHighlight(theme)` is public, documented in `docs/tokens.md`, exported
  from the entry, and used by the example file.
- `nativeHighlightPairs` is public, in `publishedPairLists`, named in the
  `themeContrastFailures` reference, and enforced by the checker.
- Every shipped theme passes all checks and both highlight washes; an edited
  theme with an unreadable highlight is reported by `themeContrastFailures`.
- `nub run check` and `nub run --filter @gpuixui/tokens test` pass.
- `TODO.md`, `COMPONENTS.md`, the plan index and the docs state the same,
  derived facts; no count is retyped.

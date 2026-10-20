# 800 — The recipes' three inherited status-ink ranges have no owner

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `535`, `574`,
`582`, `649`, `799`.

## 1. The defect

Plans `574`, `582` and `649` moved platform inks and justified each move in the
recipe files with a **historical premise** — the range the inherited values used
to measure:

- `packages/tokens/src/platform-styles/recipes/xp.ts` (on the status inks):
  > The native code surface: the inherited light status inks measured
  > **6.41–6.95:1** on the beige canvas, opaque and through the runtime's 3.5%
  > ink wash, under the 7:1 body floor. Each takes one designed step in its own
  > family (plan 574).
- `packages/tokens/src/platform-styles/recipes/aero.ts` (on
  `mutedForeground`/`primaryText`):
  > The secondary and primary inks take one designed step darker so the active
  > find match keeps the secondary floor over the native diff's 5.5% row tints
  > (plan 649): the inherited values measured **4.437–4.498:1** on the quiet
  > panel and the canvas, under 4.5:1, while the code-ink and plain arms passed.
- `packages/tokens/src/platform-styles/recipes/aero.ts` (on
  `successText`/`destructiveText`):
  > The success and destructive inks take the XP recipe's step because a find
  > match paints over that same ink wash: the inherited values measured
  > **4.429–4.496:1** through the active match, under the 4.5:1 secondary floor
  > (plan 582).

Each range is a claim about what the palette produced **before** the move. The
pre-fix hexes survive only in the defect suites' planted tables — and only some
of them: `native-highlight-code-surface.test.ts` writes out Aero's pre-582
`successText`/`destructiveText` and `native-highlight-diff-tint.test.ts` writes
out Aero's pre-649 `mutedForeground`/`primaryText`, but **neither derives a
range**, and no suite writes out the four identity inks XP inherited before plan
574 at all. Consequently:

- editing a digit in any of the three ranges leaves every suite green;
- a palette edit to the XP beige canvas, the Aero canvas or quiet panel, the
  `selection` wash, `nativeHighlightStep` or `nativeInkOpacity` changes what the
  premise would be, while the three comments still quote the old endpoints;
- the two Aero suites pin single ratios (4.429, 4.437, 4.481, 4.496, 4.445,
  4.479), not the endpoints (4.437 and 4.498; 4.429 and 4.496), so the range
  itself has no assertion behind it.

This is the same class of unguarded present-tense provenance that plans `785`,
`798` and `799` closed for other platform comments.

## 2. What the figures are today

Recomputed through the public helpers (all four XP numbers are the identity
light inks at `574`'s parent in `theme.ts`; the two Aero pairs are the values
the defect suites already plant):

```
Windows XP light (canvas #ECE9D8), four inherited inks, opaque / 3.5% ink:
  infoText        #1B45AC  6.903 / 6.408
  successText     #0E5739  7.052 / 6.546
  warningText     #6B4500  6.951 / 6.453
  destructiveText #8F2126  7.132 / 6.621
  six of the eight pairs are under 7:1 → 6.408–6.951  → "6.41–6.95"

Aero light (canvas #F0F4F9), pre-582 inks through the active match on 3.5% ink
over background / muted:
  successText     #0E5739  4.445 / 4.429
  destructiveText #8F2126  4.496 / 4.479
  all four under 4.5:1 → 4.429–4.496                 → "4.429–4.496"

Aero light, pre-649 inks through the active match on a 5.5% diff tint over
background / muted:
  mutedForeground #3D4C5F  4.491 / 4.440 (success)  4.454 / 4.437 (destructive)
  primaryText     #0C4A8C  4.536 / 4.484 (success)  4.498 / 4.481 (destructive)
  seven under 4.5:1     → 4.437–4.498                → "4.437–4.498"
```

No shipped value is wrong. The fix is the guard, not the palette.

## 3. Decision

Extend `packages/tokens/src/platform-claims.test.ts` — the suite that already
owns every current-state figure in the platform style files (plan `535`) and
already reads `recipes/aero.ts` through its `source()` helper (plan `799`) —
with three cases:

1. write out each pre-fix palette as a named constant (the hexes are no longer
   in the palette, the same split plan `785` used for the pre-098 brand fill);
2. derive each range by planting the pre-fix palette on the **shipped** recipe
   theme and recomputing the composition the comment names (opaque and 3.5%
   ink; the active find match over 3.5% ink; the active match over each 5.5%
   diff tint);
3. assert the failing-pair count, the derived range string and the sentence's
   floor word, so a palette edit, a wash change or a retyped digit fails the
   case.

No colour, pair, floor, metric, role, recipe or shipped theme moves.

## 4. Files to change

1. `packages/tokens/src/platform-claims.test.ts` — imports, three constants,
   one range helper, three cases.
2. `.agents/slop/plans/README.md` — the index row and a closing paragraph.
3. `TODO.md` — tick the queued row.

No source file under `platform-styles/` changes: the comments are already true.

## 5. Step 1 — imports and constants

Add to the existing imports:

```ts
import { extendTheme } from "./theme.js";           // beside getPlatformTheme
import { nativeInk, nativeInkOpacity } from "./native-ink.js";
import { nativeHighlight } from "./highlight.js";
import { nativeSyntaxTints } from "./native-text-check.js";
import { nativeTextRoles } from "./native-text.js";
```

`compositeOver`, `contrastFloors`, `contrastRatio`, `alpha`, `statusTones` and
`getPlatformRecipeTheme` are already imported.

Add beside the plan-798/799 constants:

```ts
/** The identity light status inks Windows XP inherited before plan 574. */
const xpPre574Inks = {
  infoText: "#1B45AC",
  successText: "#0E5739",
  warningText: "#6B4500",
  destructiveText: "#8F2126",
} as const;

/** The identity light inks Aero inherited before plan 582. */
const aeroPre582Inks = {
  successText: "#0E5739",
  destructiveText: "#8F2126",
} as const;

/** The Aero light inks plan 649 moved for the diff-tint find match. */
const aeroPre649Inks = {
  mutedForeground: "#3D4C5F",
  primaryText: "#0C4A8C",
} as const;

/** The two document tones the find-highlight sentences name. */
const highlightSurfaces = ["background", "muted"] as const;

/** The en-dash range a provenance sentence prints, at its own precision. */
const range = (ratios: ReadonlyArray<number>, digits: number): string =>
  `${fixed(Math.min(...ratios), digits)}–${fixed(Math.max(...ratios), digits)}`;
```

## 6. Step 2 — the three cases

Add after the plan-799 Aero disabled case:

```ts
it("holds XP's inherited status-ink range to the palette it names", () => {
  const theme = extendTheme(getPlatformRecipeTheme("xp", "light"), {
    colors: xpPre574Inks,
  });
  const floor = contrastFloors[theme.contrast].body;
  const painted = statusTones.flatMap((tone) => {
    const ink = theme.colors[`${tone}Text`];
    return [
      contrastRatio(ink, theme.colors.background),
      contrastRatio(ink, nativeInk(theme, "background")),
    ];
  });
  const failing = painted.filter((ratio) => ratio < floor);

  expect(failing).toHaveLength(6);
  expect(source("recipes/xp.ts")).toContain(
    `measured ${range(failing, 2)}:1 on the beige canvas, opaque and ` +
      `through the runtime's ${fixed(nativeInkOpacity * 100, 1)}% ink wash, ` +
      `under the ${floor}:1 body floor`,
  );
});

it("holds Aero's inherited find-match range on the code ink", () => {
  const theme = extendTheme(getPlatformRecipeTheme("aero", "light"), {
    colors: aeroPre582Inks,
  });
  const floor = contrastFloors[theme.contrast].secondary;
  const wash = nativeHighlight(theme).activeColor;
  const failing = (["successText", "destructiveText"] as const)
    .flatMap((role) =>
      highlightSurfaces.map((surface) =>
        contrastRatio(
          theme.colors[role],
          compositeOver(wash, nativeInk(theme, surface)),
        ),
      ),
    )
    .filter((ratio) => ratio < floor);

  expect(failing).toHaveLength(4);
  expect(source("recipes/aero.ts")).toContain(
    `the inherited values measured ${range(failing, 3)}:1 through the ` +
      `active match, under the ${floor}:1 secondary floor (plan 582)`,
  );
});

it("holds Aero's inherited quiet-panel range to the diff tints", () => {
  const theme = extendTheme(getPlatformRecipeTheme("aero", "light"), {
    colors: aeroPre649Inks,
  });
  const floor = contrastFloors[theme.contrast].secondary;
  const active = nativeHighlight(theme).activeColor;
  const failing = (["mutedForeground", "primaryText"] as const)
    .flatMap((role) =>
      nativeSyntaxTints.flatMap(({ wash, opacity }) =>
        highlightSurfaces.map((surface) =>
          contrastRatio(
            theme.colors[role],
            compositeOver(
              active,
              compositeOver(
                alpha(theme.colors[nativeTextRoles[wash]], opacity),
                theme.colors[surface],
              ),
            ),
          ),
        ),
      ),
    )
    .filter((ratio) => ratio < floor);

  expect(failing).toHaveLength(7);
  expect(source("recipes/aero.ts")).toContain(
    `the inherited values measured ${range(failing, 3)}:1 on the quiet ` +
      `panel and the canvas, under ${floor}:1`,
  );
});
```

## 7. Test plan

```sh
cd packages/tokens
nub exec vitest run src/platform-claims.test.ts
nub run check-types
```

Expected: `platform-claims.test.ts` green with the three new cases; the type
check clean.

**Prove every case can fail** (revert each mutation afterwards):

1. `xp.ts`: restate `6.41–6.95` as `6.42–6.95` → the XP case fails on the
   sentence.
2. `aero.ts`: restate `4.437–4.498` as `4.437–4.499` → the tint case fails.
3. `aero.ts`: restate `4.429–4.496` as `4.430–4.496` → the ink case fails.
4. `xp.ts` recipe light canvas `#ECE9D8` → `#EDEAD9`: the XP case derives a new
   range and fails until the sentence is updated (the palette edit is the point,
   not a broken ink). Revert the canvas.
5. Delete the pre-582 ink constant's `successText` and plant `#0E5739` on both
   keys: the count moves to two and the range collapses, so the case fails on
   `toHaveLength(4)`. Revert.

## 8. STOP conditions

- Stop if a shipped token has to move: this plan guards provenance, it does not
  change a palette.
- Stop if a case needs a cast, `any`, a second file-reading helper, or a
  hand-typed ratio: `source()` accepts `recipes/*`, and every number must come
  from `range(...)`/`fixed(...)`.
- Stop if the XP pre-fix hexes differ from §2: derive them from `574`'s parent
  (`git show e22bfbbb^:packages/tokens/src/color.ts`) before changing the
  constant, and record the discovery — do not tune the hexes to the sentence.
- Do not widen this plan to the platform headers' readable-ink figures (plan
  `781` owns those) or the Aero disabled fill (plan `799`).

## 9. Acceptance

- The three cases derive each range from a written-out pre-fix palette and hold
  the recipe comments to it; each fails under its §7 mutation and passes when
  reverted.
- `nub run --filter @gpuixui/tokens test` is green;
  `nub run --filter @gpuixui/tokens check-types` is clean.
- `TODO.md` ticks the row, and the plan index lists `800`.

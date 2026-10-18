# Plan 346 — The link and caption inside a status panel

**Phase:** F · **Owner:** `tokens-theme` · **Status:** ready
**Depends on:** 071 (the public contract), 076/300 (the soft surfaces), 082
(`primaryText`), 088 (body text on the quiet panel and popover), 307 (the
inactive label on soft fills), 320 (body text on soft fills), 339 (field
adornment text).
**Owns:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/status-panel.example.ts` (new),
`packages/tokens/src/soft-panel-text.test.ts` (new),
`packages/tokens/src/contrast.test.ts`, `packages/tokens/src/docs.test.ts`,
`packages/tokens/src/inventory.test.ts` (only if the derived phrase fails),
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

The contrast contract now measures the soft status fills
(`infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`) for six classes:

| class | pairs | plan |
| ----- | ----- | ---- |
| body text — `foreground` on each fill | `softBodyPairs` | 320 |
| soft tone text — `xSoftForeground` on its own fill | `contrastPairs` | 071 |
| inactive label — `disabledForeground` on each fill | `inactiveSoftPairs` | 307 |
| control boundary — `borderStrong` on each fill | `controlBoundarySoftPairs` | 092 |
| focus ring — `ring` and `destructive` on each fill | `ringSoftPairs`, `invalidRingPairs` | 093, 340 |
| decorative divider — `border` on each fill | `softDividerPairs` | 095 |

Two text roles a status panel actually carries are missing:

- **a link or action.** `AlertDescription` says, in its own JSDoc, "It is a
  container, so it may hold an action." The shipped behaviour test renders a
  `Button` inside it (`alert.test.tsx`, "renders an interactive description
  without swallowing its click"), and the primitives `Link` paints
  **`primaryText`** on whatever surface it sits on (plan 082). A "Learn more"
  link in an Alert therefore paints `primaryText` on an `xSoft` fill.
- **a caption or secondary line.** A status panel routinely carries a
  timestamp, a source or a helper line in the quiet tonality — `Badge`
  description, `AlertDescription`'s supporting text, a chat error's retry
  hint. That is `mutedForeground` on an `xSoft` fill.

Neither pair exists, so an edited theme can set `primaryText` or
`mutedForeground` equal to a soft fill and `themeContrastFailures` still returns
`[]` for that composition.

The audit measured both roles on all four fills in all 24 shipped colour sets
(identity × 2 modes × 2 contrasts, three platform variants × 2 × 2, XP and Aero
× 2 × 2):

| role on its fill | tightest shipped | set |
| ---------------- | ---------------- | --- |
| `mutedForeground` | **6.61:1** | Aero light, `destructiveSoft` |
| `primaryText` | **5.26:1** | Windows light, `destructiveSoft` |

Both clear the secondary floor (4.5:1, and 7:1 at AAA) with margin, so no colour
moves. The contract grows **315 → 323** pairs (four fills × two roles).

## 2. The decision

Ship one exported pair list, `softPanelTextPairs`, holding the two roles on the
four fills at the `secondary` class, and add it to `contrastPairs`. Ship a
runnable example, `statusPanelTextStyles`, that resolves the panel's text roles
from an existing theme and tone so the composition is compiled and tested rather
than described.

Alternatives rejected:

- **Add the pairs as a separate list measured only by
  `themeContrastFailures`, beside `contrastPairs`.** The roles are ordinary
  text-on-surface pairs, not composited washes; every other plain pair lives in
  `contrastPairs`, and the completeness guard derives its accounting from that
  list.
- **Add `secondaryForeground` (the shipped Retry button) instead.** Its label is
  already measured on `secondary`/`secondaryHover`/`secondaryActive`, and the
  button's own `border` edge carries its shape on the tint (plans 080/318). The
  unmeasured roles are the ones with no pair at all.
- **Add `xText` status roles on soft fills.** A status label nested inside a
  status panel of another tone is not a composition the components invite.
- **Move a palette value to make a number nicer.** Every shipped set already
  clears the floor; a plan that moves colour here would be churn.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. After `softBodyPairs` (before `secondaryWashPairs`), add:

   ```ts
   /**
    * The two text roles a status panel carries besides its own tone and body:
    * a caption or supporting line in the quiet tonality (`mutedForeground`) and
    * a link or action in the brand tonality (`primaryText`). `AlertDescription`
    * is documented as a container that may hold an action, and the primitives
    * `Link` paints `primaryText`, so both sit on the tone-tinted root.
    */
   export const softPanelTextPairs: readonly ContrastPair[] =
     softSurfaceRoles.flatMap((background): ReadonlyArray<ContrastPair> => [
       ["mutedForeground", background, "secondary"],
       ["primaryText", background, "secondary"],
     ]);
   ```

2. In `contrastPairs`, after `...softBodyPairs,` add `...softPanelTextPairs,`.

3. In the big JSDoc above `contrastPairs`, append one sentence after the body
   text sentence: "A status panel's caption and link — `mutedForeground` and
   `primaryText` on the four soft status fills — are held to the same secondary
   floor (`softPanelTextPairs`)."

### 3.2 `packages/tokens/src/status-panel.example.ts` (new)

```ts
import {
  statusTone,
  textStyle,
  type StatusTone,
  type Theme,
} from "./index.js";

/**
 * The text roles a status panel paints on its tone-tinted root: the tone's own
 * title, body prose, a caption in the quiet tonality and a link or action in the
 * brand tonality. The four roles are the ones the contrast contract holds on
 * every soft status fill (`softPanelTextPairs`).
 */
export const statusPanelTextStyles = (theme: Theme, tone: StatusTone) => {
  const { background, foreground } = statusTone(theme, tone);
  return {
    surface: background,
    title: { ...textStyle(theme, "bodyStrong"), color: foreground },
    body: { ...textStyle(theme, "body"), color: theme.colors.foreground },
    caption: {
      ...textStyle(theme, "caption"),
      color: theme.colors.mutedForeground,
    },
    link: { ...textStyle(theme, "body"), color: theme.colors.primaryText },
  };
};
```

### 3.3 `packages/tokens/src/soft-panel-text.test.ts` (new)

Header comment states the bug being guarded:

```
/**
 * Guards the gap plan 346 closes: the contrast contract measured body text,
 * soft tone text, the inactive label, the control boundary, the focus ring and
 * the divider on the four soft status fills, but not a status panel's caption
 * (`mutedForeground`) or its link/action (`primaryText`). An Alert's
 * description is documented as a container that may hold an action, and the
 * primitives Link paints `primaryText`, so an edited theme could set either
 * role equal to a soft fill while `themeContrastFailures` returned [].
 */
```

Cases:

1. **"keeps every shipped set above the secondary floor"** — build the 24
   themes from `themeModes` × `themeContrasts` (identity), `platformNames`
   (non-default) and `platformRecipeNames`; for every `softPanelTextPairs`
   entry compute `contrastRatio(theme.colors[foreground],
   theme.colors[background])` and compare against
   `contrastFloors[theme.contrast].secondary`; collect failures as
   `` `${label}: ${foreground} on ${background} at ${ratio}` `` and expect `[]`.
2. **"quotes the weakest shipped caption and link"** — over the default-contrast
   identity, platform and light-recipe sets, assert
   `[label, Number(ratio.toFixed(2))]` equals `["Aero light", 6.61]` for
   `mutedForeground`/`destructiveSoft` and `["Windows light", 5.26]` for
   `primaryText`/`destructiveSoft`.
3. **"reports a caption that matches its soft fill"** — build
   `extendTheme(lightTheme, { colors: { infoSoft: lightTheme.colors.mutedForeground } })`;
   filter `themeContrastFailures(edited)` to
   `foreground === "mutedForeground" && background === "infoSoft"`; expect one
   failure with `pairClass: "secondary"`, `floor: 4.5`, `ratio: 1`.
4. **"reports a link that matches its soft fill"** — the same with
   `warningSoft: lightTheme.colors.primaryText` and `foreground: "primaryText"`.
5. **"resolves the example's caption and link to the contract roles"** — for
   each tone in `statusTones`, `statusPanelTextStyles(lightTheme, tone)` has
   `caption.color === lightTheme.colors.mutedForeground` and
   `link.color === lightTheme.colors.primaryText`; and
   `softPanelTextPairs` has 8 entries, each `[role, soft, "secondary"]`.

### 3.4 `packages/tokens/src/contrast.test.ts`

1. In `"covers every documented pair"`, update
   `expect(contrastPairs).toHaveLength(315)` → `323`, and add
   `expect(softPanelTextPairs).toHaveLength(8)` beside the other nested-list
   assertions.
2. Import `softPanelTextPairs` from `./contrast.js`.

### 3.5 `packages/tokens/src/docs.test.ts`

1. `ends the pair-count history…`: expected sentence becomes
   `` `taking it from 315 to **${contrastPairs.length}**` ``.
2. `names the audit series through the latest plan`: "plans `076`–`346` closed".
3. In the quoted-tightest-figures case, add the two rows:

   ```ts
   ["mutedForeground", "destructiveSoft", "Aero light", 6.61],
   ["primaryText", "destructiveSoft", "Windows light", 5.26],
   ```

   and the corresponding prose expectations (the existing loop already asserts
   `` `\`${foreground}\` on \`${background}\` at **${value}:1** (${label})` ``).

### 3.6 `docs/tokens.md`

1. In the contract paragraph beginning "`themeContrastFailures(theme,
   contrast = theme.contrast)` measures `contrastPairs`…", after the sentence
   about default body text on the four soft status fills, add: "A status
   panel's caption and link — `mutedForeground` and `primaryText` on the four
   soft status fills (`softPanelTextPairs`) — are held to the same secondary
   floor."
2. In the pair-count history, after the plan `344` sentence, add: "Plan `346`
   holds a status panel's caption and link — `mutedForeground` and `primaryText`
   on the four soft status fills — taking it from 315 to **323**."
3. In the "Every colour role is accounted for" list, add `softPanelTextPairs`
   beside the other pair lists.
4. In the brand-toned text section (the paragraph that names the six surfaces a
   link paints), add the four soft status fills, and quote the tightest shipped
   value: "`primaryText` on `destructiveSoft` at **5.26:1** (Windows light)".
5. In the secondary-text paragraph (the one that lists the `input` fill and the
   row washes), add the four soft status fills and quote "`mutedForeground` on
   `destructiveSoft` at **6.61:1** (Aero light)".

### 3.7 `docs/design-system.md` §9

1. Secondary-text row: append "and the four soft status fills a status panel's
   caption sits on".
2. Brand-toned-text row: append "and the four soft status fills a link in a
   status panel sits on".

### 3.8 `packages/tokens/README.md`

1. In the "Secondary text is checked…" paragraph, add the four soft status
   fills and the Aero light figure.
2. In the brand-toned-text paragraph, add the four soft status fills and the
   Windows light figure.
3. If `readme.test.ts` derives a pair count from `contrastPairs`, no manual
   count is needed; run it and follow the failure.

### 3.9 `COMPONENTS.md`

In the **Theme contrast check** row, change "the same 315 contrast pairs" to
"the same 323 contrast pairs" and append after the plan 343 sentence: "Plan 346
holds a status panel's caption and link — `mutedForeground` and `primaryText` on
the four soft status fills — taking the contract from 315 to 323; every shipped
set already clears the secondary floor (6.61:1 and 5.26:1 at the tightest), so
no colour moves."

### 3.10 `TODO.md`

Add a ticked row after the plan 344 row in **Design tokens and theming**:

```
`[x]` Hold a status panel's caption and link — `mutedForeground` and
`primaryText` had pairs on the plain surfaces and the row washes but not the
four soft status fills an Alert's description can hold a caption or a link on,
so an edited theme could erase either while the checker returned `[]`; every
shipped set passes (6.61:1 and 5.26:1 at the tightest), so no colour moves and
the contract grows 315 → 323 (plan 346)
```

Bump the section's progress numerator by one, leaving the denominator.

### 3.11 Plan index

1. Table row after 345:

   ```
   | [346](./346-soft-panel-text.md) | The caption and link inside a status panel | F | 071, 076, 082, 088, 307, 320, 339 | done |
   ```

2. A prose paragraph after the plan 345 one: the soft fills were held for body,
   tone, inactive, boundary, ring and divider text but not the quiet caption or
   the brand-toned link; both pass in every shipped set, so the contract grows
   without a colour move.

## 4. Commands

From the worktree root:

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

New file alone while iterating:

```sh
cd packages/tokens && nubx vitest run src/soft-panel-text.test.ts
```

Expected: the new file passes five cases; the package suite grows by one file and
eight pairs; `contrast.test.ts` reads 323; every docs guard resolves the new
figures; the gates stay green.

## 5. STOP conditions

- A shipped theme's `softPanelTextPairs` ratio is below its floor — stop; the
  plan claimed no colour moves, so the palette or the fills changed. Re-measure
  and report instead of moving colour.
- `contrast.test.ts`'s uniqueness assertion fails — a pair already exists; do not
  duplicate it, report which list owns it.
- The tightest figures differ from 6.61:1 / 5.26:1 — re-derive them, update the
  docs and this plan's prose before continuing.
- `docs.test.ts` or `inventory.test.ts` fails on a sentence this plan did not
  name — re-read the document and reconcile the expected string.
- A test needs another workstream's file to pass — stop; record it in `TODO.md`
  instead.

## 6. Test plan (both directions)

- **Without the fix:** the new file's cases 1, 3 and 4 fail — the pair list does
  not exist, and the filtered `themeContrastFailures` result is empty for a
  caption/link that matches its fill. Prove it by stashing the `contrast.ts`
  edit and running the new file (the identity/default pair experiments fail with
  `[]`).
- **With the fix:** the five cases pass, every shipped theme clears the
  secondary floor on the eight pairs, and the two edited themes report exactly
  the named pair.
- Docs guards fail if a count or quoted figure is edited without its test, and
  pass together.

## 7. Acceptance

- `softPanelTextPairs` ships with eight pairs, is exported, is in
  `contrastPairs` and is measured by `themeContrastFailures`.
- Every shipped colour set passes at its declared floors; no colour moves.
- The new suite fails without the pair list and passes with it.
- `docs/tokens.md` names the list and the two tightest figures; the design
  system's floor table and the inventory row state the new surfaces; the README
  matches.
- `nub run check`, `nub run lint`, `nub run test` pass; the commit is on
  `agent/tokens-theme` and pushed.

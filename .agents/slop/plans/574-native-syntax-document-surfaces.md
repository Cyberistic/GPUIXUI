# Plan 574 — The native syntax palette on every document surface

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
088/319 (body text on every `Surface` tone), 503 (platform text steps),
528 (recipe text steps), 569/572 (`nativeTextTheme` and its metrics),
573 (`nativeTextSurfaces`' sibling, the find-highlight contract).

**Status:** done. Executed on `agent/tokens-theme`.

**Implementation note.** The plan's eight values shipped as written; the suite
derived two figures the plan did not name. Darkening XP `infoText` moved the
`selectionStatusPairs` minimum from **4.584:1** (XP light `infoText` on
`selected`) to **4.827:1** (Aero light `successText` on `selected`), so
`docs.test.ts`, `selection-status.test.ts`, `docs/tokens.md` and the ledger were
updated together. The improved light status inks also lifted the find-highlight
minima the reference quotes — match 5.34 → **5.49:1**, active 4.61 → **4.71:1**,
and the neutral hover comparison 6.30 → **6.74:1** — so
`native-highlight.test.ts` keeps passing on the same derived sentences. The
`contrast.test.ts` brand case grows 15 → 18 plain failures because the code plane
now has four body pairs; its assertion no longer restricts `body` to `card`.
`7.5617` rounds to **7.562**, which is the figure the page and ledger quote.

---

## 1. The measured gap

`nativeTextTheme(theme)` (plan 569) returns the `theme` prop for a native
`<code>`, `<diff>` or `<markdown>`. Its JSDoc and `docs/tokens.md` both say the
same thing:

> `bg` is the raised `card` surface … A document painted directly on the canvas
> overrides it … every role the prop returns is measured on all four `Surface`
> tones.

The syntax palette is **not** measured on four tones. `nativeSyntaxPairs`
(`packages/tokens/src/contrast.ts:763`) maps every capture role except
`foreground` to one pair, always on `card`:

```ts
nativeSyntaxPairs = [...new Set(Object.values(nativeSyntaxRoles))]
  .filter((role) => role !== "foreground")
  .map((role): ContrastPair => [role, "card", "body"]);
```

Six pairs, one surface. The four surfaces `bg` may name are
`nativeTextSurfaces` in this plan: `background`, `card`, `popover`, `muted`
(the `Surface` tones `primitives` exposes and plans 317/319 already use).

That blind spot is a shipped defect, not a hypothetical edit. On the Windows XP
(Luna) light recipe the inherited identity status roles sit on the beige canvas
`#ECE9D8`:

| Pair | Ratio | Floor |
| ---- | ----- | ----- |
| `infoText` on `background` | **6.903:1** | 7 (`body`) |
| `warningText` on `background` | **6.951:1** | 7 (`body`) |

`infoText` is the `typeName`/`typeBuiltin`/`constructor` capture and
`warningText` the `string`/`number`/`boolean`/`constant` family, so a markdown
document or a fenced code block painted directly on XP's canvas loses the body
floor on its type names and most literals. `themeContrastFailures` returns `[]`
because the pair list never asked.

The runtime also paints a fixed **3.5% ink wash** over `theme.bg` for a fenced
code block (`references/gpuix/packages/native/src/markdown/render.rs:478`,
`ink(&theme, 0.035)`; the wash picks white on a dark `bg` and black on a light
one, `:635`). That composition is stricter than the opaque pair, and the suite
holds it on `card` only (`native-text.test.ts`, `inkFailures`). On the four
surfaces it is a real second gap — eight shipped pairs miss the body floor:

| Shipped set | Surface | Role | Ratio |
| ----------- | ------- | ---- | ----- |
| Light · macOS | `background` | `infoText` | **6.960:1** |
| Light · Windows XP | `background` | `successText` | **6.546:1** |
| Light · Windows XP | `background` | `warningText` | **6.453:1** |
| Light · Windows XP | `background` | `infoText` | **6.408:1** |
| Light · Windows XP | `background` | `destructiveText` | **6.621:1** |
| Light · Windows XP | `muted` | `infoText` | **6.988:1** |
| Light · Windows 7 | `muted` | `warningText` | **6.998:1** |
| Light · Windows 7 | `muted` | `infoText` | **6.950:1** |

The platform styles inherit identity's light status roles, and the light identity
canvas is lighter than XP's beige and Aero's blue-grey quiet panel. The values
were tuned on the identity canvas; the recipe canvases were never asked.

## 2. Decision

1. **One owner for the surfaces.** Export
   `nativeTextSurfaces = ["background", "card", "popover", "muted"] as const`
   from `native-text.ts`. `highlight.ts` already carries a private copy
   (`nativeHighlightSurfaces`) and plan 573's suite a third; both use the
   exported list. `contrast.ts` uses it for the syntax pairs.
2. **Publish the syntax palette on every surface.** `nativeSyntaxPairs` becomes
   six roles × four surfaces = **24 pairs**, still at the `body` floor and still
   excluding `foreground` (it has body pairs on all four surfaces from plans
   088/319). `contrastPairs` does **not** include `nativeSyntaxPairs` — the
   checker spreads both — so `contrastPairs` stays **405**; the published native
   list grows 6 → 24.
3. **Move eight platform text steps**, all one designed family step darker and
   all local to the style that needs them (no identity value moves):
   - macOS light `infoText`: `#173A88` (blue 800; the inherited `#1B45AC` is
     blue 700).
   - Windows light `infoText`: `#173A88` — it passes today at **7.0003:1**
     through the ink wash, a three-decimal edge with no margin; the same step
     makes the guard meaningful instead of accidental.
   - Windows XP light `infoText` `#173A88`, `warningText` `#4B3100`
     (amber 900), `successText` `#0E5135` (green 800), `destructiveText`
     `#7E1D21` (red 800).
   - Windows 7 (Aero) light `infoText` `#173A88`, `warningText` `#4B3100`.
   Every other platform value stays; dark sets do not move.
4. **Hold the ink wash on every surface.** Generalise `inkFailures` in
   `native-text.test.ts` to take a surface and loop `nativeTextSurfaces`. The
   ink choice stays the runtime's (white on a dark `bg`, black on a light one);
   the 3.5% fraction stays test-local, as the runtime constant is not a token.
5. **Make the two quoted figures derive.** The page currently quotes
   `7.83:1` (opaque) and `7.06:1` (ink) as hand-computed minima. After this plan
   they are **7.562:1** — Windows XP light `primaryText` on `background` — and
   **7.008:1** — macOS light `warningText` on `background` through the ink wash.
   The native suite derives both minima, the role and the set, and asserts the
   exact sentences, so a palette edit cannot leave the page quoting an old
   number (the plan-536 failure mode).
6. **Update the one status-selection figure the move changes.** COMPONENTS
   quotes the `selectionStatusPairs` tightest pair as **4.661:1** (XP light
   `infoText` on `active`). Darkening XP's `infoText` makes the minimum
   **4.827:1** (Aero light `successText` on `selected`); the AAA minimum stays
   **7.370:1**. Update the sentence to the derived pair.

No new role, no new pair class, no new check kind, no shipped `contrastPairs`
count change. `themeChecks` stays eight.

### Alternatives rejected

- **Keep the syntax pairs on `card` and delete the “all four tones” claim.**
  Documents painted on the canvas are a documented, executable example
  (`native-text.example.ts` `canvasDocument`); deleting the claim would make the
  reference honest and the XP defect permanent.
- **Hold the opaque pairs only and leave the ink wash on `card`.** The ink wash
  is the actual painted code surface; a suite that stops at the opaque role
  would leave eight measured under-floor pairs in shipped sets (the failure mode
  plans 573/569 exist to close). The fix is local to four platform files.
- **Move the identity light status roles instead of the platform styles.** It
  would retint every platform and recipe that inherits them for a defect that
  only the XP/Aero canvases expose, and it would move figures in plans 366/528
  far outside this workstream's evidence. A style owns the step its own canvas
  needs.
- **Raise the syntax floor to `secondary`.** The palette is code, which the
  library treats as body copy (plan 569); 4.5:1 would silently weaken every
  shipped code surface.
- **Model the ink wash as a role or a public pair class.** It is a fixed runtime
  composition of a luminance-chosen tint, not theme data; the suite already owns
  the other fixed fades the same way, and the public checker keeps the opaque
  roles.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/native-text.ts`

1. Add beside the interfaces, before `nativeTextRoles`:

```ts
/**
 * The four `Surface` tones a native text document may paint on. `bg` is `card`
 * by default; a document painted directly on the canvas overrides it with
 * `background`, and a command palette or sidebar document uses `popover` or
 * `muted`. The syntax pairs and the runtime's ink-wash guard measure the same
 * list.
 */
export const nativeTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const satisfies ReadonlyArray<keyof ThemeColors>;
```

`ThemeColors` is already imported as a type.

2. In `nativeTextTheme`'s JSDoc, keep the `bg` paragraph but make the claim
   specific: the opaque syntax palette is measured on all four
   `nativeTextSurfaces` (`nativeSyntaxPairs`), and the runtime's 3.5% ink wash
   over the same four is held by the suite. State that `foreground` is omitted
   from the syntax list because it already has a body pair on each surface.
3. The `NativeTextMetrics` JSDoc's “the runtime's remaining fields” paragraph is
   unchanged.

### 3.2 `packages/tokens/src/highlight.ts`

Replace the private `nativeHighlightSurfaces` array with the import:

```ts
import { nativeSyntaxRoles, nativeTextSurfaces } from "./native-text.js";
```

and use `nativeTextSurfaces` in `nativeHighlightPairs`. Keep the existing
rationale (the four tones `bg` may name). No value changes.

### 3.3 `packages/tokens/src/contrast.ts`

Replace `nativeSyntaxPairs` with the four-surface list:

```ts
export const nativeSyntaxPairs: readonly ContrastPair[] = [
  ...new Set(Object.values(nativeSyntaxRoles)),
]
  .filter((role) => role !== "foreground")
  .flatMap((role) =>
    nativeTextSurfaces.map(
      (background): ContrastPair => [role, background, "body"],
    ),
  );
```

Import `nativeTextSurfaces` beside `nativeSyntaxRoles`. Update the JSDoc above
the list (the body floor on every surface a document may paint on; `foreground`
omitted because the body pairs already hold it; the runtime's 3.5% ink wash is
suite-held) and the bullet in `themeContrastFailures`' JSDoc that still says
“the code block's `card` plane”. Keep `themeContrastFailures` spreading
`nativeSyntaxPairs` beside `contrastPairs`.

### 3.4 Platform styles

`packages/tokens/src/platform-styles/macos.ts`, `platform-styles/windows.ts`,
`platform-styles/recipes/xp.ts`, `platform-styles/recipes/aero.ts`:

- Add the values named in §2 to the `colors.light` object, in the semantic
  order the file already uses (`infoText`/`successText`/`warningText`/
  `destructiveText` sit with the other text roles — place them before
  `border` or beside the status family, whichever keeps the file's grouping).
- Add one sentence to each file's JSDoc: the native syntax palette forced the
  step — the inherited light status role measured under the body floor on this
  canvas or through the runtime's 3.5% ink wash (plan 574).
- Do not touch `colors.dark`, `elevation`, `structure` or `types`.

### 3.5 `packages/tokens/src/native-text.test.ts`

Header: add the plan-574 bug. State that the syntax pairs measured `card` only
while XP light's `infoText`/`warningText` measured **6.903**/**6.951:1** on its
canvas, and that the ink wash added six more under-floor pairs across XP and
Aero, while every check returned `[]`.

Changes:

1. Import `nativeSyntaxPairs`, `nativeTextSurfaces` and `platformRecipes` /
   `platformStyles` as needed.
2. `inkWash(theme, surface)` takes the surface and picks the ink from that
   surface's luminance, exactly as today's `card` case does. `inkFailures`
   takes the surface and defaults to `"card"` only so the existing planted case
   keeps its exact `6.384:1` measurement.
3. The existing “holds the syntax palette … on the painted code surface” case
   loops `nativeTextSurfaces` and labels the assertion `theme.name` + surface.
4. New cases:
   - **publishes the palette on every document surface** — build the expected
     `[role, surface, "body"]` rows from `nativeSyntaxRoles` (minus
     `foreground`) and `nativeTextSurfaces`, compare with
     `nativeSyntaxPairs` by content and length (24).
   - **holds the opaque palette on every document surface** — every shipped
     set, every surface, every non-body role ≥ the theme's `body` floor.
   - **reports a syntax role erased on a non-card surface** — extend
     `lightTheme` with `infoText: lightTheme.colors.background` and assert
     `themeContrastFailures` contains
     `{ foreground: "infoText", background: "background", pairClass: "body" }`.
     This case fails before §3.3, when the list has no `background` row.
   - **names the platform steps the wash required** — assert the eight shipped
     values in §2 and that each affected theme returns `[]` from
     `themeFailures`.
   - **quotes the derived tightest figures** — compute the opaque minimum (role,
     surface, set, ratio) and the ink minimum; assert
     ``the tightest is `primaryText` at **7.562:1**`` and
     ``7.008:1 at the tightest`` in the page. Derive the role, set and surface,
     not only the number; a `docs.test.ts`-style whitespace collapse makes the
     match robust.
5. Add `nativeTextSurfaces` to the “names every native field … in the
   reference” name list.

### 3.6 `packages/tokens/src/native-highlight.test.ts`

Delete the local `surfaces` array and import `nativeTextSurfaces`, so plan 573's
suite and the syntax list cannot drift. No case changes.

### 3.7 `packages/tokens/src/inventory.test.ts`

Add `${nativeSyntaxPairs.length} native syntax pairs` to the contract-row phrase
list in “states the contract's pair counts from the pair lists”, and import
`nativeSyntaxPairs`. The row must say “24 native syntax pairs (`nativeSyntaxPairs`)
on the four `Surface` tones a document may name”, not “6 … on the code plane”.

### 3.8 `docs/tokens.md`

1. **Native text documents** — replace the paragraph that says the captures are
   held on “the code block's `card` plane” and quotes `7.83:1`. New facts, all
   derived by the suite:
   - the captures are held to the body floor on every `Surface` tone a document
     may paint on — `nativeTextSurfaces` — through `nativeSyntaxPairs`;
   - `foreground` is omitted because the body pairs already hold it on all four;
   - every shipped set clears the opaque floor; the tightest is `primaryText`
     at **7.562:1** on Windows XP's canvas;
   - the runtime's 3.5% ink wash is the stricter code surface; the suite holds
     the same palette through it on every surface, tightest **7.008:1** (macOS
     light `warningText` on its canvas);
   - the eight platform steps: macOS/Windows/XP/Aero `infoText` `#173A88`, XP
     `warningText` `#4B3100` / `successText` `#0E5135` / `destructiveText`
     `#7E1D21`, Aero `warningText` `#4B3100`, because the inherited values
     measured 6.41–6.96:1 through the wash. State one sentence, no table.
2. **`bg` override paragraph** — keep the snippet; say the override stays inside
   the contract because the opaque roles are measured on all four tones, and
   that the ink composite is held there too.
3. **Verification / contrast contract** — name `nativeTextSurfaces` beside
   `nativeSyntaxPairs` so a reader can find the owner without reading source.
   Do not restate counts.
4. **Value coverage** — the new `nativeTextSurfaces` export is named by the
   paragraph above, satisfying the public-value guard.

### 3.9 `docs/design-system.md`

In §10's native text paragraph, replace “the `card` plane” with the four
`Surface` tones (`nativeTextSurfaces`) and the 3.5% ink wash over each. Add one
sentence: the light platform styles name their own status text steps where the
inherited ink missed the body floor through the wash (plan 574). No figures.

### 3.10 `packages/tokens/README.md`

In *Native text documents*, replace “`nativeSyntaxPairs` holds code to the body
floor on its `card` plane” with the four-surface list (`nativeTextSurfaces`) and
the ink wash. Mention the two tightest figures if the README's style keeps them
(it currently does not quote the native figures; do not add unguarded ones).

### 3.11 `COMPONENTS.md`

- **Theme contrast check** row: “6 native syntax pairs (`nativeSyntaxPairs`) on
  the code plane” → “24 native syntax pairs (`nativeSyntaxPairs`) on the four
  `Surface` tones a native document may name”; update the
  `selectionStatusPairs` tightest sentence from **4.661:1** (XP light `infoText`
  on `active`) to **4.827:1** (Aero light `successText` on `selected`), AAA
  unchanged at **7.370:1**. Add a short sentence naming plan 574 and the eight
  steps.
- **Design tokens** row: the native sentence “`nativeSyntaxPairs` holds code to
  the body floor on `card` and the suite holds … 3.5% ink wash” becomes the
  four-surface version; no role count changes.

### 3.12 `TODO.md` and the plan index

- Add the completed row under *Design tokens and theming* after the plan-573
  row, in the same style:

  ``[x] Hold the native syntax palette on every document surface — … (plan 574)``

- Add the plan row to `.agents/slop/plans/README.md` after 573 and a sentence to
  the block's closing paragraph. The plan's status flips to `done` in the
  implementation commit.

## 4. Commands and expected results

Run from the worktree root:

```sh
nub run --filter @gpuixui/tokens check-types
# expect: Done, no diagnostics

nub run --filter @gpuixui/tokens test -- native-text
# expect: native-text.test.ts and native-highlight.test.ts pass; the six
# plan-574 cases included. The opaque tightest is 7.5617…, the inked tightest
# 7.0080… and no shipped set is below its declared floor.

nub run --filter @gpuixui/tokens test
# expect: all files pass (the package suite is the regression gate for the
# palette moves, the recipes, the docs guards and the inventory)

nub run check
# expect: check-tests, lint, fmt and check-types pass

nub run test
# expect: the workspace suites pass
```

### Two-direction proof (AGENTS §3)

`scripts/verify-two-directions.sh` is written against `jj` (TODO harness row),
so record the manual run in the commit message:

1. With the fix: `nub run --filter @gpuixui/tokens test -- native-text` is green.
2. Revert only `nativeSyntaxPairs` to the card-only map and the eight platform
   values to their inherited identity values; re-run. Expect the opaque case to
   fail on XP `infoText` (6.903 < 7) and `warningText` (6.951 < 7), the ink
   case to fail on the eight pairs in §1, and the figure case to fail on the
   page's old `7.83`/`7.06`.
3. Restore; expect green.

## 5. STOP conditions

- **STOP** if `nativeTextSurfaces` cannot be exported without breaking the
  value-coverage or public-type guards in a way this plan does not name. Report
  the guard and the missing document row.
- **STOP** if any shipped set still misses the body floor after the eight
  values in §2. Report the set, surface, role and ratio. Do not move identity
  roles, and do not add a ninth value without re-planning — the next tightest
  pair is a palette-wide step, not a recipe-local one.
- **STOP** if a moved value changes a *fill*, a pair class other than `body`,
  or a shipped `contrastPairs` entry. These are text roles only.
- **STOP** if the derived opaque/inked minimum is not the pair this plan names
  (§2.5). Report the measured minimum and update the plan before the docs.
- **STOP** if `themeFailures` on a moved platform theme returns a failure other
  than a previously passing pair that the darker text improved. A darker text
  role must not need a selection, direction or metric change.

## 6. Acceptance

- `nativeTextSurfaces` is public, documented, and the one list
  `nativeSyntaxPairs`, `nativeHighlightPairs` and both suites use.
- `nativeSyntaxPairs` publishes 24 rows on four surfaces; `contrastPairs` stays
  405.
- Every shipped set clears the body floor opaque and through the runtime's 3.5%
  ink wash on all four surfaces; XP/Aero/macOS/Windows carry the eight named
  steps.
- The checker reports a syntax role erased on a non-card surface, and the suite
  proves the old card-only list would not.
- `docs/tokens.md`, `docs/design-system.md`, the package README and
  `COMPONENTS.md` state the same derived facts; the two native figures and the
  status-selection figure are derived, not hand-written.
- `nub run check`, `nub run lint` and `nub run test` pass.

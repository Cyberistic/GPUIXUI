# 805 — The copyable examples' header figures have no owner

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `310`, `394`,
`539`, `651`, `658`, `717`, `733`, `803`.

## 1. The defect

Every copyable module under `packages/tokens/src/*.example.ts` opens with a
rationale paragraph. A consumer copies that file, edits it, and reads the
paragraph to judge the values — the same "file a consumer copies and edits"
argument plans `781`, `798`, `799`, `800` and `803` used for the platform and
palette sources. **The figures in those paragraphs are read by no suite.**

Proof, run on the committed tree before this plan:

```sh
# bump every ratio digit in every example header by one unit in its last place
cd packages/tokens/src
mkdir -p /private/tmp/opencode/examples-bak && cp *.example.ts /private/tmp/opencode/examples-bak/
python3 - <<'PY'
import re, glob
for f in glob.glob('*.example.ts'):
    out = []
    for line in open(f).read().split('\n'):
        if line.strip().startswith('*'):
            line = re.sub(r'([0-9]+\.[0-9]+):1',
                          lambda m: f"{float(m.group(1)) + 10 ** -len(m.group(1).split('.')[1]):"
                                    f".{len(m.group(1).split('.')[1])}f}:1", line)
        out.append(line)
    open(f, 'w').write('\n'.join(out))
PY
cd ../.. && nub exec --filter @gpuixui/tokens vitest run
```

Result: **7071 of 7075 tests passed; 3 files failed** — `brand-figures.test.ts`
(3 cases) and `figures.test.ts`'s toast-groove entry (1 case). Every other
example figure survived a falsified digit, including:

- `disabled-state.example.ts` — three figures;
- `styles.ts` — `disabledControl`'s JSDoc repeats the same three figures, and
  changing them alone left **7075/7075 green**;
- `contrast.example.ts` — two figures;
- `platform-styles.example.ts` — two figures;
- `row-press.example.ts` — one figure;
- `toast-countdown.example.ts` — one of its two (the other is in the figures
  table);
- `unchecked-selection.example.ts` — one sentence.

`recipe-edit.example.ts`'s `3.999` **is** owned (`recipe-edit.test.ts` rebuilds
the pre-658 fixture and asserts it) and is out of scope. `brand-theme.example.ts`
and the toast groove's `1.069` are owned by `brand-figures.test.ts` and
`documentedFigures`; out of scope except the groove's second figure.

Three sentences are not only unowned but **already wrong**:

1. `toast-countdown.example.ts`: "`muted` is `popover` in the identity dark theme
   and **every platform and recipe dark set**, so the groove measures 1.000:1".
   Only the six **default-contrast** dark sets measure 1.000:1; every AAA dark
   set measures 1.0585:1 (`muted #1A1A1A`, `popover #141414`).
2. `unchecked-selection.example.ts`: "on a card **the two** measure **1.000:1**
   in identity light and on **every** platform dark card". In identity light the
   checkbox edge is 1.000:1 but the switch track is **1.027:1**; on macOS dark
   the track is 1.000:1 but the edge is **1.221:1**.
3. `platform-styles.example.ts`: "The Windows dark foreground this example used
   to inherit measured 2.96:1 on the fill and 2.12:1 on the hover (plan 310)."
   Those two numbers are black on `#005A9E`/`#004578` — neither hex is in the
   file any more (the family is `#0F6CBD`/`#0C5694` light and
   `#5CB8FF`/`#8CCFFF` dark), so a reader cannot reproduce them. The same
   rationale is still true of the shipped family: the Windows dark foreground
   `#EEF1F5` on the dark fill measures **1.900:1**, and **1.485:1** on its hover.

## 2. What the figures are today

Derived through `contrastRatio` / `compositeOver` / `alpha` on this tree:

```
contrast.example.ts — quietHighContrastTheme (AAA light, mutedForeground #444444)
  mutedForeground on active (pressed wash)                  6.7014 → 6.70
  mutedForeground through selection on background           6.6520 → 6.65
  floors.high.secondary = 7; all 16 failures ≥ 4.5 (default secondary)

disabled-state.example.ts and styles.ts (same three, derived in plan 539)
  primaryForeground dimmed on primary, identity light       1.5753 → 1.575
  the same on the worst card (Linux light)                  1.4680 → 1.468
  inputForeground dimmed on input, macOS light              3.2731 → 3.273
  floors.default.inactive = 3

platform-styles.example.ts — inherited Windows dark foreground #EEF1F5
  on resolveEditedPlatformTheme("dark").primary   (#5CB8FF) 1.9001 → 1.900
  on its primaryHover                             (#8CCFFF) 1.4848 → 1.485
  floors.default.secondary = 4.5

row-press.example.ts
  invertedRowPressTheme accent (#393939) vs active (#333333) 1.0940 → 1.094
  floors.default.step = 1.05 (the pair is accepted, the direction is not)

toast-countdown.example.ts
  muted on popover, identity dark and the 5 default-contrast
  platform/recipe dark sets                                 1.0000 → 1.000
  muted on popover, the six AAA dark sets                   1.0585 → 1.058
  floors.default.surface = 1.05

unchecked-selection.example.ts
  identity light: input on card   1.0000 → 1.000
                  muted on card   1.0272 → 1.027
  every default-contrast dark card:
                  muted on card   1.0000 → 1.000
                  input on card   1.0000 → 1.000 (linux, win32, xp, win7)
                                  1.2209 → 1.221 (darwin)
  floors.default.surface = 1.05
```

No shipped token, role, pair, floor or metric moves. Two prose sentences are
corrected; the rest gain an owner.

## 3. Decision

1. Add the twelve figures measured on **shipped** themes to `documentedFigures`
   (six disabled, two toast, four unchecked), so the existing per-entry loop
   holds each document's sentence and its named set.
2. Add one new `FigureDocument`, `packages/tokens/src/disabled-state.example.ts`,
   and teach the figures suite to read a source document as prose (see step 3).
3. Add `packages/tokens/src/example-header-figures.test.ts` for the figures an
   **example theme** produces (`quietHighContrastTheme`, `invertedRowPressTheme`,
   the platform example's own family) and for the **sweeps** a single figure
   cannot state ("every default-contrast dark set", "every default-contrast
   dark card but macOS dark").
4. Correct the three sentences in §1 in place.

`styles.ts`'s JSDoc is in scope because it is the same three figures as the
example it documents and it was equally unguarded; `figures.ts` already lists
`packages/tokens/src/styles.ts` as a document.

## 4. Files to change

1. `packages/tokens/src/figures.ts` — add the twelve entries and a small dim
   factory the four existing dim entries share.
2. `packages/tokens/src/figures.test.ts` — read the new document, strip JSDoc
   decoration from source documents.
3. **create** `packages/tokens/src/example-header-figures.test.ts`.
4. `packages/tokens/src/platform-styles.example.ts` — corrected header.
5. `packages/tokens/src/toast-countdown.example.ts` — corrected header.
6. `packages/tokens/src/unchecked-selection.example.ts` — corrected header.
7. `.agents/slop/plans/README.md` — plan row `805` and a closing paragraph.
8. `TODO.md` — a ticked row in the tokens section.

No `.test.ts` other than the new suite changes.

## 5. Step 1 — the dim factory and the new entries in `figures.ts`

Insert immediately **before** `disabledDimFigures` (which becomes the first
consumer):

```ts
/** The dim of a filled primary action's label, on the panel the control sits on. */
const dimmedPrimaryLabel = (
  document: FigureDocument,
  name: string,
  claim: FigureClaim,
  provenance: ShippedThemeProvenance,
  panel: keyof ThemeColors,
  sentence: string,
): DocumentedFigure => ({
  document,
  name,
  pairs: [["primaryForeground", "primary", "secondary"]],
  kind: "dim",
  claim,
  provenance,
  panel,
  decimals: 3,
  sentence,
});

/** The dim of a field's typed text, on its own `input` fill. */
const dimmedFieldText = (
  document: FigureDocument,
  name: string,
  claim: FigureClaim,
  provenance: ShippedThemeProvenance,
  sentence: string,
): DocumentedFigure => ({
  document,
  name,
  pairs: [["inputForeground", "input", "body"]],
  kind: "dim",
  claim,
  provenance,
  panel: "input",
  decimals: 3,
  sentence,
});
```

Rewrite `disabledDimFigures`' four existing entries through the factory, with
their current names, claims, provenances, panels and sentences unchanged:

```ts
const disabledDimFigures: ReadonlyArray<DocumentedFigure> = [
  dimmedPrimaryLabel(
    "docs/design-system.md",
    "the disabled primary action, dimmed on the identity light canvas",
    "value",
    identityTheme("light", "default"),
    "background",
    "A filled primary action at 50% opacity measures **{figure}:1** on the identity light canvas",
  ),
  dimmedPrimaryLabel(
    "docs/design-system.md",
    "the disabled primary action, dimmed on the worst shipped card",
    "tightest",
    platformTheme("linux", "light", "default"),
    "card",
    "the primary label measures **{figure}:1** on a Linux light card",
  ),
  dimmedFieldText(
    "docs/tokens.md",
    "the disabled field's typed text, dimmed on its input fill",
    "tightest",
    platformTheme("darwin", "light", "default"),
    "the shipped primitives still dim the field at 50%, which measures **{figure}:1** on the macOS light `input` fill",
  ),
  dimmedPrimaryLabel(
    "packages/tokens/README.md",
    "the disabled dim's worst shipped card",
    "tightest",
    platformTheme("linux", "light", "default"),
    "card",
    "the dim measures **{figure}:1** at worst (Linux light, a card)",
  ),
];
```

Then, immediately after it:

```ts
/**
 * The disabled dim in `disabledControl`'s own JSDoc and in the executed example
 * a consumer copies. Plan 539 held the two pages and plan 717 the source JSDoc
 * it knew about; these two files repeated the same three figures and bumping
 * any digit in them left the suite green (plan 805).
 */
const disabledStateFigures: ReadonlyArray<DocumentedFigure> = [
  dimmedPrimaryLabel(
    "packages/tokens/src/disabled-state.example.ts",
    "the example's disabled primary label on the identity light canvas",
    "value",
    identityTheme("light", "default"),
    "background",
    "A filled primary action's label measures **{figure}:1** on the identity light canvas",
  ),
  dimmedPrimaryLabel(
    "packages/tokens/src/disabled-state.example.ts",
    "the example's disabled primary label on the worst card",
    "tightest",
    platformTheme("linux", "light", "default"),
    "card",
    "and **{figure}:1** at worst (Linux light, a card)",
  ),
  dimmedFieldText(
    "packages/tokens/src/disabled-state.example.ts",
    "the example's dimmed field text on its input fill",
    "tightest",
    platformTheme("darwin", "light", "default"),
    "its typed text measures **{figure}:1** on the macOS light `input` fill",
  ),
  dimmedPrimaryLabel(
    "packages/tokens/src/styles.ts",
    "disabledControl's disabled label on the identity light canvas",
    "value",
    identityTheme("light", "default"),
    "background",
    "a filled primary action's label measures **{figure}:1** on the identity light canvas",
  ),
  dimmedPrimaryLabel(
    "packages/tokens/src/styles.ts",
    "disabledControl's disabled label on the worst card",
    "tightest",
    platformTheme("linux", "light", "default"),
    "card",
    "and **{figure}:1** at worst (Linux light, a card)",
  ),
  dimmedFieldText(
    "packages/tokens/src/styles.ts",
    "disabledControl's dimmed field text on its input fill",
    "tightest",
    platformTheme("darwin", "light", "default"),
    "a disabled field's typed text **{figure}:1** on the macOS light `input` fill",
  ),
];

/**
 * The shipped Toast groove. `muted` equals `popover` in every default-contrast
 * dark set (1.000:1) and steps to 1.058:1 at AAA — the distinction the header's
 * pre-805 sentence erased.
 */
const toastGrooveFigures: ReadonlyArray<DocumentedFigure> = [
  {
    document: "packages/tokens/src/toast-countdown.example.ts",
    name: "the shipped Toast groove in the default-contrast dark sets",
    pairs: [["muted", "popover", "surface"]],
    kind: "plain",
    claim: "value",
    provenance: identityTheme("dark", "default"),
    decimals: 3,
    sentence: "so the groove measures **{figure}:1** there",
  },
  {
    document: "packages/tokens/src/toast-countdown.example.ts",
    name: "the shipped Toast groove at AAA",
    pairs: [["muted", "popover", "surface"]],
    kind: "plain",
    claim: "value",
    provenance: identityTheme("dark", "high"),
    decimals: 3,
    sentence: "the AAA dark sets step it to **{figure}:1**",
  },
];

/**
 * The unchecked selection control's two roles on a card: the checkbox edge is
 * the card in identity light and on every default-contrast dark card but macOS
 * dark, and the switch's track is the card on every default-contrast dark card.
 * One figure cannot state those two sweeps; the suite holds them, these entries
 * hold the four numbers the header prints.
 */
const uncheckedSelectionFigures: ReadonlyArray<DocumentedFigure> = [
  {
    document: "packages/tokens/src/unchecked-selection.example.ts",
    name: "the unchecked edge in identity light",
    pairs: [["input", "card", "surface"]],
    kind: "plain",
    claim: "value",
    provenance: identityTheme("light", "default"),
    decimals: 3,
    sentence: "the edge measures **{figure}:1** in identity light",
  },
  {
    document: "packages/tokens/src/unchecked-selection.example.ts",
    name: "the unchecked edge on macOS dark",
    pairs: [["input", "card", "surface"]],
    kind: "plain",
    claim: "value",
    provenance: platformTheme("darwin", "dark", "default"),
    decimals: 3,
    sentence: "but macOS dark (**{figure}:1**)",
  },
  {
    document: "packages/tokens/src/unchecked-selection.example.ts",
    name: "the unchecked track on a default-contrast dark card",
    pairs: [["muted", "card", "surface"]],
    kind: "plain",
    claim: "value",
    provenance: identityTheme("dark", "default"),
    decimals: 3,
    sentence: "the track **{figure}:1** on every default-contrast dark card",
  },
  {
    document: "packages/tokens/src/unchecked-selection.example.ts",
    name: "the unchecked track in identity light",
    pairs: [["muted", "card", "surface"]],
    kind: "plain",
    claim: "value",
    provenance: identityTheme("light", "default"),
    decimals: 3,
    sentence: "(**{figure}:1** in identity light)",
  },
];
```

Add `...disabledStateFigures, ...toastGrooveFigures, ...uncheckedSelectionFigures`
to `documentedFigures` after `...disabledDimFigures`.

Add to the `FigureDocument` union, in path order:

```ts
  | "packages/tokens/src/disabled-state.example.ts"
```

## 6. Step 2 — the documents reader in `figures.test.ts`

A source document's lines are prefixed with ` * `, so a sentence that wraps is
not a substring. Replace the `documents` initialiser with:

```ts
/** A source document read as prose: the JSDoc decoration removed, not `**`. */
const source = (url: URL): string =>
  readFileSync(url, "utf8").replaceAll(/^[ \t]*\*(?!\*)[ \t]?/gm, "");

const documents: Readonly<Record<FigureDocument, string>> = {
  "docs/tokens.md": readFileSync(
    new URL("../../../docs/tokens.md", import.meta.url),
    "utf8",
  ),
  "docs/design-system.md": readFileSync(
    new URL("../../../docs/design-system.md", import.meta.url),
    "utf8",
  ),
  "packages/tokens/README.md": readFileSync(
    new URL("../README.md", import.meta.url),
    "utf8",
  ),
  "COMPONENTS.md": readFileSync(
    new URL("../../../COMPONENTS.md", import.meta.url),
    "utf8",
  ),
  "packages/tokens/src/ring.ts": source(new URL("./ring.ts", import.meta.url)),
  "packages/tokens/src/contrast.ts": source(
    new URL("./contrast.ts", import.meta.url),
  ),
  "packages/tokens/src/native-text-check.ts": source(
    new URL("./native-text-check.ts", import.meta.url),
  ),
  "packages/tokens/src/styles.ts": source(
    new URL("./styles.ts", import.meta.url),
  ),
  "packages/tokens/src/toast-countdown.example.ts": source(
    new URL("./toast-countdown.example.ts", import.meta.url),
  ),
  "packages/tokens/src/disabled-state.example.ts": source(
    new URL("./disabled-state.example.ts", import.meta.url),
  ),
};
```

Markdown keeps its raw read. The `(?!\*)` lookahead is what leaves `**bold**`
untouched; it removes only the comment's own ` *` prefix.

## 7. Step 3 — the prose corrections

`packages/tokens/src/platform-styles.example.ts`, lines 17–18:

```
 * the base hue and an inherited foreground can miss the on-colour floor:
 * inheriting the Windows dark foreground on this family's fill measures
 * **1.900:1** and **1.485:1** on its hover, under the **4.5:1** on-colour floor
 * the designed pair clears (plan 310 found the same failure with a darker fill).
```

`packages/tokens/src/toast-countdown.example.ts`, lines 6–9:

```
 * `popover` in the identity dark theme and every default-contrast platform and
 * recipe dark set, so the groove measures **1.000:1** there and the unfilled
 * remainder of the countdown has no shape; the AAA dark sets step it to
 * **1.058:1**, a hair over the surface floor. The designed groove is `track`
```

`packages/tokens/src/unchecked-selection.example.ts`, lines 6–13:

```
 * — a field *fill* — and a switch paints its track with `muted` — a *surface*,
 * so on a card the edge measures **1.000:1** in identity light and on every
 * default-contrast dark card but macOS dark (**1.221:1**), and the track
 * **1.000:1** on every default-contrast dark card (**1.027:1** in identity
 * light): all but macOS dark's edge sit under the **1.05:1** surface floor, so
 * the control has no shape. The designed state is the
```

Re-flow the paragraph so no quoted sentence needs the other side of a line
break to read naturally; the guard reads prose, so wrapping is free.

## 8. Step 4 — `example-header-figures.test.ts`

The suite header states the bug: the digits of every example rationale were
unread, four sentences were already wrong, and the guard is what keeps the
copyable files honest.

```ts
/**
 * Guards the figures the copyable examples state in their own headers.
 *
 * Plan 717 closed the package's JSDoc and plan 539 the two pages, but a
 * `*.example.ts` header — the file a consumer copies and edits — was read by no
 * suite: bumping every ratio digit across nine example files left 7071 of 7075
 * tests green, and `styles.ts`'s copy of the same three disabled figures left
 * the whole suite green on its own. Four sentences were already wrong: the Toast
 * groove counted the AAA dark sets as 1.000:1 (they are 1.058:1), the unchecked
 * control called both roles 1.000:1 in identity light and on every platform dark
 * card (they are 1.027:1 and 1.221:1 in the two sets the sentence named), and
 * the platform example quoted two figures measured on hexes the file no longer
 * contains.
 *
 * The figures measured on a shipped theme live in `figures.ts`; this suite owns
 * the ones an example theme produces and the sweeps a single figure cannot
 * state.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alpha } from "./color.js";
import {
  quietHighContrastTheme,
  quietHighContrastFailures,
} from "./contrast.example.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  themeContrastFailures,
} from "./contrast.js";
import { disabledDimOpacity } from "./figures.js";
import {
  getPlatformTheme,
  highContrastThemes,
  themes,
} from "./index.js";
import { resolveEditedPlatformTheme } from "./platform-styles.example.js";
import { invertedRowPressTheme, rowPressFailures } from "./row-press.example.js";
import { shippedThemes } from "./shipped-themes.js";
import { getTheme } from "./theme.js";

/** A source module's comment block read as one paragraph. */
const prose = (file: string): string =>
  readFileSync(new URL(file, import.meta.url), "utf8")
    .replaceAll(/^[ \t]*\*(?!\*)[ \t]?/gm, "")
    .replaceAll(/\s+/g, " ");

const figure = (value: number, digits: number): string =>
  value.toFixed(digits);
```

Cases (each builds the sentence from derived numbers, so a moved palette or a
retyped digit fails):

1. **the quiet AAA theme** — `mutedForeground` on `active` = 6.70 and through
   the selection wash on `background` = 6.65; both under
   `contrastFloors.high.secondary` (7); `themeContrastFailures` is non-empty and
   every failure is at or above `contrastFloors.default.secondary` (4.5) — the
   header's "still passing the default floors on every pair"; the header quotes
   the whole sentence.
2. **the row press** — `accent`/`active` = 1.094, at or above
   `contrastFloors.default.step`; `rowPressFailures` is exactly one `rowPress`
   direction failure; the header quotes the step.
3. **the platform example's inherited foreground** — `getPlatformTheme("win32",
   "dark").colors.foreground` on the resolved dark family's `primary` = 1.900
   and on `primaryHover` = 1.485, both under
   `contrastFloors.default.secondary`; the header quotes them and the floor.
4. **the Toast groove's sweep** — every `mode === "dark" && contrast ===
   "default"` entry has `muted === popover` and measures 1.000; every
   `contrast === "high"` dark entry measures 1.058; the header names the
   default-contrast sweep and the AAA step (which the pre-805 sentence erased).
5. **the unchecked control's sweep** — identity light edge 1.000 and track
   1.027; every default-contrast dark entry's track 1.000; every one but
   `darwin` dark's edge 1.000, `darwin` 1.221; the header quotes all four and
   the 1.05 floor.
6. **the two disabled copies agree** — the three figures in
   `disabled-state.example.ts` equal the three in `styles.ts`, both quote the
   `contrastFloors.default.inactive` floor word, and both are the derived dim.
7. **the pre-805 sentences are gone** — `platform-styles.example.ts` no longer
   contains `2.96:1`/`2.12:1`, the Toast header no longer says "every platform
   and recipe dark set", the unchecked header no longer says "the two measure
   **1.000:1** in identity light and on every platform dark card", and
   `styles.ts` still names its three figures.

Reference code for the dim helper (case 6) and case 4's sweep:

```ts
const dimmed = (label: string, fill: string, panel: string): number => {
  const paintedFill = compositeOver(alpha(fill, disabledDimOpacity), panel);
  return contrastRatio(
    compositeOver(alpha(label, disabledDimOpacity), paintedFill),
    paintedFill,
  );
};

const darkSets = shippedThemes.filter(({ theme }) => theme.mode === "dark");
const defaultDark = darkSets.filter(
  ({ theme }) => theme.contrast === "default",
);
const highDark = darkSets.filter(({ theme }) => theme.contrast === "high");
```

`themeContrastFailures`/`quietHighContrastFailures` are the same list; use the
exported constant once and assert its length once.

## 9. Test plan

From `packages/tokens`:

```sh
nub exec vitest run src/example-header-figures.test.ts src/figures.test.ts
nub run check-types
```

Expected: the new suite green, every `documentedFigures` case green including
the twelve new ones, type check clean.

**Prove every case can fail** (revert each mutation):

1. `figures.ts`: `"**{figure}:1** on the identity light canvas"` →
   `"**{figure}:1** on the identity canvas"` → the disabled example entry fails.
2. `disabled-state.example.ts`: `1.575` → `1.574` → case 6 (and the entry) fail.
3. `styles.ts`: `3.273` → `3.272` → the helper entry and case 6 fail.
4. `contrast.example.ts`: `6.70` → `6.71` → case 1 fails.
5. `contrast.example.ts`: `6.65` → `6.64` → case 1 fails.
6. `row-press.example.ts`: `1.094` → `1.093` → case 2 fails.
7. `platform-styles.example.ts`: `1.900` → `1.899` → case 3 fails.
8. `toast-countdown.example.ts`: put "every platform and recipe dark set" back
   → case 4 and case 7 fail.
9. `toast-countdown.example.ts`: `1.058` → `1.059` → the AAA entry fails.
10. `unchecked-selection.example.ts`: `1.221` → `1.220` → case 5 fails.
11. `unchecked-selection.example.ts`: `1.027` → `1.028` → case 5 and the entry
    fail.
12. `shipped-themes.ts` is not touched; moving a palette value to make a sweep
    fail is not required — cases 4 and 5 iterate the shipped enumeration, so a
    new shipped set that breaks either sweep fails them.

Then the workstream gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: **214** files and **7094** tests green (213/7075 before; twelve
figure cases and seven suite cases are added); `check` and `lint` clean.

## 10. STOP conditions

- Stop if a token, role, pair, floor, metric or shipped theme has to move. This
  plan owns prose and tests; the three corrected sentences describe the shipped
  values, they do not change them.
- Stop if a case needs a cast, `any`, a hand-typed ratio, a second read helper or
  a name-based shipped-set lookup where a provenance is available: every number
  comes from `contrastRatio`/`compositeOver`/`alpha`/`contrastFloors`.
- Do not widen this plan to `recipe-edit.example.ts` (`3.999` is owned),
  `brand-theme.example.ts` (owned by `brand-figures.test.ts`), the toast groove's
  `1.069` (owned by `documentedFigures`), or the comments in `platforms.test.ts`,
  which name `#000000` and describe plan 310's fixture.
- If a derived figure differs from §2, stop and record it — do not tune the test
  to the sentence or the sentence to the test.

## 11. Acceptance

- The twelve new `documentedFigures` entries derive their figures and hold their
  documents; the four corrected sentences quote the derived numbers and sets.
- The new suite's seven cases fail under their §9 mutation and pass when
  reverted; every quoted figure is derived, none typed.
- `nub run --filter @gpuixui/tokens test` is green (214 files, 7094 tests),
  `nub run check-types` is clean.
- `TODO.md` ticks the row and the plan index lists `805`.

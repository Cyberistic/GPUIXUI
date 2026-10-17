# 075 — The contrast figures the catalogue quotes

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `056`–`058` (numeric table guards), `059` (colour pairs), `071`–`074` (contrast contract) |
| Status | done |

This plan is self-contained. A weaker executor can follow it in order.

---

## 1. Why

The catalogue's tables are built from the implementation one way: `docs.test.ts`
parses every colour row, builds every numeric row, and fails if a palette or
type edit lands without its document edit. Three claims escaped that net because
they are **sentences**, not table rows:

1. **`docs/tokens.md` §Status tones quotes three measured ratios.** "Light
   `warning` (`#F5B01F`) is 1.78:1 against `background` and 1.89:1 against
   `card` … and light `success` is 4.26:1". Those numbers are the whole argument
   for a separate `xText` tonality. A palette edit that moves `amber.400` would
   leave the rationale quoting a number the theme no longer produces, while
   `color.test.ts` stays green (the *pairs* still pass; the prose is stale).
2. **`docs/design-system.md` §3 repeats the first figure** — "light `warning` is
   1.78:1 against the canvas" — with nothing holding it to `lightColors`.
3. **The selection wash strength is quoted three times** — in both colour tables'
   Use column (`24% alpha`, `30% alpha`) and in §Text selection ("24% in the
   default themes, 30% at high contrast"). The colour-table guard compares only
   role, light and dark; the percentage text is unguarded. Changing `#7567F23D`
   to `#7567F24D` would ship a catalogue that disagrees with the theme.

Two defects fall out of the same audit:

4. **The high-contrast table's status Use cells are stale.** The four `xText`
   rows say "on `background`/`card`"; the default table says
   "on `background`/`card`/`popover`". Plan `074` extended the contrast contract
   to measure `xText` on `popover` precisely because a status label or dot can
   sit in a dialog or toast, so the high-contrast table now describes a smaller
   contract than the library enforces.
5. **`contrast.ts`'s `compositeOver` example is numerically wrong.** It shows
   `compositeOver("#00000080", "#FFFFFF"); // "#808080"`. The alpha byte is
   `0x80 = 128`, so the composite is `255 × (1 − 128/255) = 127` — `#7F7F7F`.
   The function is right; the example is not. A reader copying the example into
   an assertion writes a failing test.

None of these changes a token value. This plan fixes two documents and one JSDoc
example, and adds the guards that make the quoted figures fail the gate if they
ever drift again.

## 2. Design decisions (do not re-litigate)

1. **The guard derives the figure; the document states it.** Every new assertion
   computes the ratio or percentage from `themes`, `contrastRatio`,
   `contrastFloors` or the alpha byte and then requires the exact sentence or
   row to appear. A test that asserted `"1.78"` from a literal would be asserting
   the prose back to itself, which `scripts/check-tests.ts` rejects.
2. **No new token, helper or export.** `contrastRatio`, `compositeOver`,
   `contrastFloors` and the colour sets already exist. The floor values in the
   two quoted sentences come from `contrastFloors.default`, so a future floor
   change cannot leave "under the 3:1 non-text floor" stranded.
3. **The two mode variants share one wash strength, and the test says so.** The
   prose quotes one percentage for "the default themes"; the guard asserts light
   and dark (and high-contrast light and dark) round to the same percentage, so a
   mode-only edit cannot make the singular number a lie.
4. **The status rows are guarded from `contrastPairs`, not from the other row.**
   The expected surfaces for `xText` are the backgrounds the public contract
   measures it against, so adding a surface to the contract automatically
   demands it in both tables. Comparing the two tables with each other would
   only prove they agree, not that they agree with the contract.
5. **The JSDoc example is guarded against the function.** `contrast.test.ts`
   reads `contrast.ts` and requires the computed value inside the example line.
   The source of truth is `compositeOver`, not the comment.
6. **No colour moves.** The four new checks all pass against the shipped
   palette; only the two stale claims and the wrong example change.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/075-quoted-contrast-figures.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | fix the `compositeOver` example's hex |
| `packages/tokens/src/contrast.test.ts` | add the JSDoc-example guard (1 test) |
| `packages/tokens/src/docs.test.ts` | add 4 tests for the quoted figures and the status rows |
| `docs/tokens.md` | add `/popover` to the four high-contrast `xText` Use cells |
| `docs/design-system.md` | no text change (the 1.78 sentence is already right; it gains a guard) |
| `TODO.md` | one ticked row and the bar |
| `COMPONENTS.md` | design-tokens row: mention the quoted figures guard |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's paths.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

```diff
- * compositeOver("#00000080", "#FFFFFF"); // "#808080"
+ * compositeOver("#00000080", "#FFFFFF"); // "#7F7F7F"
```

### 4.2 `docs/tokens.md`

The high-contrast table (below `## High contrast`), four rows — append
`` `/popover` `` to the Use cell:

```diff
-| `infoText` | `#152F6B` | `#DEE9FF` | info text and indicators on `background`/`card` |
+| `infoText` | `#152F6B` | `#DEE9FF` | info text and indicators on `background`/`card`/`popover` |
```

and the same for `successText`, `warningText` and `destructiveText`.

No numeric text changes: the quoted figures are already correct. The new guards
hold them there.

### 4.3 `packages/tokens/src/docs.test.ts`

Add three imports to the existing import block:

```ts
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
} from "./contrast.js";
```

(`contrastFloors` is already imported at line 22; extend it to the three names.)
Add two helpers beside `documentedRows`:

```ts
/** The catalogue's prose, collapsed so a wrapped sentence can be matched. */
const markdownProse = markdown.replace(/\s+/g, " ");

/** The alpha a role carries, as the whole percentage the catalogue quotes. */
const washPercent = (color: string): number =>
  Math.round((Number.parseInt(color.slice(7, 9), 16) / 255) * 100);
```

The prose guards read `markdownProse`; the table guards keep reading the raw
`markdown`, because a row is one line and must not be collapsed.

Add one `describe` block after `describe("docs/tokens.md status table")`:

```ts
describe("docs/tokens.md quoted figures", () => {
  it("quotes the status ratios the light palette produces", () => {
    const light = themes.light.colors;
    const sentence =
      "The solid roles are fills, not foregrounds. " +
      `Light \`warning\` (\`${light.warning}\`) is ` +
      `${contrastRatio(light.warning, light.background).toFixed(2)}:1 against \`background\` and ` +
      `${contrastRatio(light.warning, light.card).toFixed(2)}:1 against \`card\`, under the ` +
      `${contrastFloors.default.boundary}:1 non-text floor, and light \`success\` is ` +
      `${contrastRatio(light.success, light.background).toFixed(2)}:1, under the ` +
      `${contrastFloors.default.secondary}:1 text floor.`;

    expect(markdownProse).toContain(sentence);
  });

  it("quotes the selection wash strength both modes and both contrasts share", () => {
    const { light, dark } = themes;
    const high = highContrastThemes;

    expect(washPercent(dark.colors.selection)).toBe(
      washPercent(light.colors.selection),
    );
    expect(washPercent(high.dark.colors.selection)).toBe(
      washPercent(high.light.colors.selection),
    );

    const sentence =
      "The wash is translucent (" +
      `${washPercent(light.colors.selection)}% in the default themes, ` +
      `${washPercent(high.light.colors.selection)}% at high contrast), ` +
      "so selected text keeps the foreground's contrast.";
    expect(markdownProse).toContain(sentence);
  });

  it("states the wash strength in both colour tables", () => {
    const cell = (color: string): string =>
      `text selection wash (${washPercent(color)}% alpha; \`selectionColor\`)`;

    expect(markdown).toContain(
      `| \`selection\` | \`${themes.light.colors.selection}\` | \`${themes.dark.colors.selection}\` | ${cell(themes.light.colors.selection)} |`,
    );
    expect(markdown).toContain(
      `| \`selection\` | \`${highContrastThemes.light.colors.selection}\` | \`${highContrastThemes.dark.colors.selection}\` | ${cell(highContrastThemes.light.colors.selection)} |`,
    );
  });

  it("names every surface the contract checks status text on, in both tables", () => {
    statusTones.forEach((tone) => {
      const surfaces = contrastPairs
        .filter(([foreground]) => foreground === `${tone}Text`)
        .map(([, background]) => `\`${background}\``);
      const rows = markdown
        .split("\n")
        .filter((line) => line.startsWith(`| \`${tone}Text\` |`));

      expect(surfaces.length, tone).toBe(3);
      expect(rows.length, tone).toBe(2);
      rows.forEach((tableRow) =>
        surfaces.forEach((surface) =>
          expect(tableRow, `${tone}Text on ${surface}`).toContain(surface),
        ),
      );
    });
  });

  it("quotes the warning figure the design system repeats", () => {
    const warning = themes.light.colors.warning;
    const sentence = `The solid roles are fills: light \`warning\` is ${contrastRatio(warning, themes.light.colors.background).toFixed(2)}:1 against the canvas, so it is never the colour of text or a dot.`;

    expect(designSystem.includes(sentence), sentence).toBe(true);
  });
});
```

Five tests, not four: the table-cells one and the four status rows are separate
guards. The header comment of `docs.test.ts` gains one sentence naming the
quoted figures.

### 4.4 `packages/tokens/src/contrast.test.ts`

Add `readFileSync` beside the existing imports:

```ts
import { readFileSync } from "node:fs";
```

and one test inside the existing `describe` (after the ratio tests):

```ts
it("keeps its JSDoc example at the value the function returns", () => {
  const source = readFileSync(new URL("./contrast.ts", import.meta.url), "utf8");
  const composited = compositeOver("#00000080", "#FFFFFF");

  expect(composited).toBe("#7F7F7F");
  expect(source).toContain(
    `compositeOver("#00000080", "#FFFFFF"); // "${composited}"`,
  );
});
```

The second assertion guards the document; the first states the arithmetic the
guarded line must show. The suite header comment gains a sentence naming the
defect: the example claimed `#808080` while the alpha byte composites to
`#7F7F7F`.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test          # exit 0; 739 → 745 tests
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run fmt                                    # exit 0
nub run test                                   # exit 0
```

Six new tests: five in `docs.test.ts`, one in `contrast.test.ts`. If the count
differs, recount before editing anything else — a skipped guard is a silent one.

## 6. Test plan and both directions

The two defect guards **must fail before the fix**:

1. Run the new `names every surface … status text` test before editing
   `docs/tokens.md`: it fails for `infoText`, `successText`, `warningText` and
   `destructiveText` because the high-contrast rows lack `` `popover` ``.
   Apply the table edit; it passes.
2. Run the new JSDoc test before editing `contrast.ts`: the first assertion
   (`#7F7F7F`) passes but the second fails, because the source still contains
   `#808080`. Apply the example edit; it passes.

The three drift guards pass on today's palette. Prove each can fail:

3. Change `lightColors.warning` to `palette.amber[500]` (`#D99400`) in
   `color.ts`. The status-ratio test fails: the sentence expects `2.41:1` and
   `2.57:1`; the design-system test fails the same way. Restore `palette.amber[400]`.
4. Change `lightColors.selection` to `"#7567F24D"` (30%). The table-cell test
   fails on `24% alpha` and the §Text selection sentence fails on `24% in the
   default themes`. Restore `"#7567F23D"`.
5. Delete `["infoText", "popover", "secondary"]` from `contrastPairs`. The
   surfaces test fails on `surfaces.length` (2 ≠ 3) before it even reads the
   document. Restore.
6. Change `contrastFloors.default.boundary` to `4` (do **not** commit). The
   status-ratio sentence expects `4:1` and the document says `3:1`, so the test
   fails; restore. This proves the floors are not retyped in the test.

Run the gate after every restore; a demonstration that leaves the tree dirty is
not a demonstration.

## 7. STOP conditions

Stop and report if:

- any quoted figure does **not** match the computed value — do not edit the
  document to match a wrong test; the implementation is the source of truth, so
  recompute by hand and state both values;
- a quoted sentence needs a Markdown parser, not `toContain` — the file wraps
  prose, so collapse whitespace the way the existing design-system guard does
  rather than adding a dependency;
- the status surfaces guard would need a fourth surface or a role that is not in
  `contrastPairs` — that means the contract and the catalogue disagree about what
  `xText` means; stop and report rather than guessing which is right;
- the JSDoc guard would have to assert a string it builds from itself — read the
  raw source, never a copied constant;
- the test count after the change is not 745 — recount, because a missing test
  file or a skipped `describe` hides the guard;
- any command in §5 fails for a reason unrelated to these files — report it; do
  not paper over it.

## 8. Acceptance criteria

- `compositeOver("#00000080", "#FFFFFF")` is documented as `#7F7F7F`, and
  `contrast.test.ts` fails if the example or the function changes apart.
- The light `warning` and `success` ratios, the design-system's `warning`
  figure, the selection percentages in both tables and in the §Text selection
  sentence are all derived from the implementation by a test that fails when the
  palette or the floors change.
- Both colour tables name `background`, `card` and `popover` for every `xText`
  row, derived from `contrastPairs`.
- No token value changes; every shipped theme and platform variant still passes
  its contrast suite.
- The plan is indexed in `.agents/slop/plans/README.md`, the `TODO.md` row is
  ticked with the bar updated, and the `COMPONENTS.md` design-tokens row names
  the new guard.
- `nub run check`, `nub run lint`, `nub run fmt` and `nub run test` exit 0.

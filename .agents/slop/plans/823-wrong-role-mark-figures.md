# 823 — The wrong-role marks' figures, and the two that put the canvas number on a card

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `075`, `309`,
`332`, `342`, `369`, `818`.

## 1. The defect

`docs/design-system.md` §9 closes the mark section with the three shipped marks
that paint the *wrong* role, and quotes the evidence for each:

> Status marks are `xText`, never the solid status fill, because the light
> `warning` fill is **1.78:1** on the canvas; the avatar's presence dot and the
> timeline's pending dot are two shipped marks the ledger records for the
> components workstream to move onto the designed role. A third is the menu row's
> 2px highlight bar: it paints `accent`, which measures 1.118–1.392:1 on the
> menu's `popover` and 1.000–1.113:1 on the `hover` fill the row also paints, so
> the bar that exists to show the highlight is invisible.

Two further passages restate the *avatar* figure, and both name the wrong
surface:

- `packages/tokens/src/mark-contrast.test.ts` header: "the avatar's presence dot
  paints the solid `warning` (**1.78:1 on a light card**)";
- `TODO.md`'s cross-team row: "`avatar.tsx` `statusFill` paints
  `success`/`warning`/`destructive` on a `card`-coloured ring, and light
  `warning` measures **1.78:1 on its card**".

`1.78:1` is the light `warning` fill against the **canvas** (`background`,
`#F6F8FA`); the light `card` is `#FFFFFF`, where the same fill measures
**1.89:1**. The catalogue already carries the split correctly —
"(`#F5B01F`) is 1.78:1 against `background` and 1.89:1 against `card`" — and
`warning-fill-claims.test.ts` derives `["1.78", "1.89"]` in one case, so the two
passages contradict a figure the package itself publishes, in the documents a
consumer reads to decide what the dot's own ring measures.

None of the five figures in the §9 paragraph is read by a suite:

| Claim | Where | Owner today |
| ----- | ----- | ----------- |
| light `warning` 1.78:1 on the canvas | §9 | `warning-fill-claims.test.ts` counts this file's two `light \`warning\`` passages — it reads the *figure*, not the surfaces beside it, and does not read the avatar/timeline sentences |
| light `warning` 1.89:1 on the card | mark-contrast header, `TODO.md` | none — both state 1.78 instead |
| `muted` 1.036:1 on the identity canvas | §9 | none as this claim (the literal appears only in unrelated blocks) |
| `accent` 1.118–1.392:1 on `popover` | §9, mark-contrast header, `TODO.md` | none |
| `accent` 1.000–1.113:1 on `hover` | §9, `TODO.md` | none |

Replacing all five with neighbouring numbers leaves the package suite green, so a
palette edit in any of the 24 shipped sets can leave the paragraph quoting a
range the package no longer produces — and the sentence's premise ("under the
3:1 mark floor") can become false with nothing to report it.

No colour, pair, floor, metric, role or shipped theme moves: four of the five
figures are correct today and one pair of passages attributes the canvas figure
to the card.

## 2. What the package produces today

Measured on this tree with `contrastRatio` and `shippedThemes`:

```
light `warning` on `background`   1.7751 → 1.78    (below the 3:1 mark floor)
light `warning` on `card`         1.8898 → 1.89    (below the 3:1 mark floor)
`muted` on `background`:
  Light (identity)                1.0364 → 1.036
  Light · Windows 7 (Aero)        1.0139 → 1.014   ← the tightest shipped set
`accent` on `popover`:
  1.1176  Dark · Windows          (minimum)
  1.3915  Light · Windows XP      (maximum)
`accent` on `hover`:
  1.0004  Light                   (minimum)
  1.1125  High contrast dark      (maximum)
```

Every one of the four `accent` endpoints is under its set's `mark` floor
(`3` at default, `4.5` at high), which is the paragraph's premise.

## 3. Decisions

1. **Correct the two attributions to the card's own figure.** Both passages say
   `1.78:1` beside `card`; they become `1.89:1` and keep naming the card. The
   canvas sentence in §9 stays `1.78:1`, because it is a claim about the canvas.
2. **Add a purpose-named claims suite**, matching plans `815`, `818`, `821` and
   `822`: these are three documents' narrative restatements of a shipped
   defect's measurements, not a `documentedFigures` entry with one sentence
   form. The suite derives each figure with `contrastRatio` over
   `shippedThemes`, formats it the way the pages do, and reads the passages.
3. **Do not touch the historical plans.** `332-mark-contrast.md` and the ledger's
   plan-332 sentence record what was measured when they were written; they are
   not current-state claims.
4. **Do not move a value.** Every figure except the two attributions is correct,
   and no palette edit is justified by a documentation defect.

## 4. Files to change

1. **create** `packages/tokens/src/wrong-role-mark-claims.test.ts`.
2. `packages/tokens/src/mark-contrast.test.ts` — the header's avatar figure and
   surface.
3. `TODO.md` — the Avatar cross-team row's figure; a ticked row and the workstream
   counter (`376/451` → `377/452`).
4. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.

`docs/design-system.md` needs no edit: its `1.78:1 … on the canvas` sentence is
correct, and the new suite holds it. No token value, pair, floor, metric, role or
shipped theme changes.

## 5. Step 1 — `packages/tokens/src/wrong-role-mark-claims.test.ts`

Header states the bug: the avatar's presence dot is ringed with `card` and two
passages quote the canvas's `1.78:1` for it, while the card measures `1.89:1`;
the §9 paragraph's five figures — the two `warning` surfaces, the timeline's
`muted` on the identity canvas and both `accent` ranges — are read by no test, so
a palette edit leaves three documents quoting numbers the package no longer
produces.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from `vitest`;
`contrastFloors`, `contrastRatio` from `./contrast.js`; `extendTheme`, `getTheme`
from `./theme.js`; `shippedThemes` from `./shipped-themes.js`.

Helpers (module scope):

```ts
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

/** The three-decimal form the pages quote a range in. */
const fixed = (value: number): string => value.toFixed(3);

/** A paragraph, sliced between two anchors that appear once each. */
const slice = (text: string, from: string, to: string): string => {
  const start = text.indexOf(from);
  const end = text.indexOf(to, start + from.length);
  expect(start, `missing "${from}"`).toBeGreaterThanOrEqual(0);
  expect(end, `missing "${to}"`).toBeGreaterThan(start);
  return text.slice(start, end);
};

/** The ordered minimum and maximum of one pair over every shipped set. */
const range = (
  foreground: keyof ThemeColors,
  background: keyof ThemeColors,
) => {
  const rows = shippedThemes.map(({ theme }) => ({
    name: theme.name,
    ratio: contrastRatio(theme.colors[foreground], theme.colors[background]),
  }));
  const ordered = [...rows].sort((a, b) => a.ratio - b.ratio);
  const low = ordered[0]!;
  const high = ordered[ordered.length - 1]!;
  return { low, high, text: `${fixed(low.ratio)}–${fixed(high.ratio)}:1` };
};

const design = prose("../../../docs/design-system.md");
const marks = slice(
  design,
  "A fill is not automatically a surface.",
  "It can fail:",
);
const ledger = prose("../../../COMPONENTS.md");
const todo = prose("../../../TODO.md");
const avatarRow = slice(
  todo,
  "moves the Avatar presence dot off the solid status",
  "moves the Timeline upcoming dot off",
);
const menuRow = slice(
  todo,
  "moves the menu row's highlight bar off",
  "moves the Avatar presence dot off the solid status",
);
const header = prose("./mark-contrast.test.ts");
```

Use the package's own types: import `type ThemeColors` from `./color.js` for the
two keys above.

Cases:

1. **the avatar dot's ring is a card, and the card measures 1.89** — with
   `getTheme("light")`, `fixed(contrastRatio(warning, background))` is `"1.78"`,
   `fixed(contrastRatio(warning, card))` is `"1.89"`, and both are below
   `contrastFloors.default.mark`; the header contains "1.89:1 on the `card`" and
   does not contain "1.78:1"; `avatarRow` contains "`card`-coloured ring" and
   "1.89:1 on its card" and not "1.78:1"; `marks` contains "`warning` fill is
   **1.78:1** on the canvas".
2. **the timeline dot is the tightest on Aero light** — the identity light
   `muted` on `background` is `"1.036"`; the minimum over `shippedThemes` is
   `"1.014"` and its set is `Light · Windows 7`; the `mark-contrast.test.ts`
   header states `1.036:1`, and `TODO`'s timeline row states both — the row is
   sliced from "moves the Timeline upcoming dot off" to "paints the Notification
   centre's unread dot" and contains "1.036", "on Aero light" and "1.014". §9
   names the dot without a figure, so the suite does not invent one there.
3. **both menu-bar ranges come from the shipped sets** — `range("accent",
   "popover").text` is `"1.118–1.392:1"` with `Dark · Windows` and
   `Light · Windows XP` as its endpoints; `range("accent", "hover").text` is
   `"1.000–1.113:1"` with `Light` at the minimum and a high-contrast dark set at
   the maximum (several AAA sets tie at `1.113`, so the maximum is asserted on
   the value and the AAA prefix, not one set name); `marks`, `menuRow` and the
   header each contain both range strings.
4. **every quoted figure is under its own mark floor** — for every shipped set,
   `contrastRatio(accent, popover)` and `contrastRatio(accent, hover)` are below
   `contrastFloors[theme.contrast].mark`, and the light `warning`'s two figures
   are below `contrastFloors.default.mark`; this is the paragraph's "under the 3:1
   mark floor" premise, derived rather than asserted.
5. **the guard reads the page, not a constant** — the pre-fix sentences
   ("1.78:1 on a light card" in the header, "1.78:1** on its card" in the ledger
   row) fail cases 1 and 2's substring expectations; a digit changed in either
   range fails case 3; and a `range` computed over a one-set base changes when
   that set's `accent` moves.
6. **the figures can move** — `extendTheme(getTheme("light"), { colors: {
   accent: "#000000" } })` derives a `range` whose minimum and maximum differ
   from the shipped ones, so the page's `1.000–1.113:1` claim would be false and
   case 3 fails; no shipped set changes, because every quoted figure is correct.

## 6. Step 2 — the two attributions

`packages/tokens/src/mark-contrast.test.ts`, header only:

- `the solid \`warning\` (1.78:1 on a light card)` →
  `the solid \`warning\` (1.89:1 on the \`card\` its ring paints)`.

`TODO.md`, the Avatar row only:

- `light \`warning\` measures **1.78:1** on its card` →
  `light \`warning\` measures **1.89:1** on its card`.

Do not retype the row's other facts (the `card`-coloured ring, the three status
fills, `statusTone(...).text`).

## 7. Test plan

```sh
nub run --filter @gpuixui/tokens test src/wrong-role-mark-claims.test.ts
```

Expected after: one file, six cases green.

**Prove every case in both directions** (apply the mutation, run the file,
restore):

1. Restore `1.78:1 on a light card` in the header: case 1 fails. Before the
   suite exists the same restoration leaves the whole package suite green — the
   §1 evidence.
2. Restore `1.78:1** on its card` in `TODO.md`: case 1 fails.
3. Change one digit of the `popover` range in `marks` (`1.118` → `1.119`):
   case 3 fails; change one digit in the `hover` range in `menuRow`: case 3
   fails.
4. Change `1.036` to `1.037` in the header: case 2 fails.
5. Set the light identity `warning` to its `card` colour in `src/color.ts`:
   case 1 fails (`1.000`) and case 4's planted palette proves the same. Restore.
6. Reflow a passage across lines: passes — `prose` normalises whitespace.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

No native scenario changes: no runtime behaviour or token value moves. Record the
ids that were run (none) in the execution record.

## 8. STOP conditions

- Stop if a colour, pair, floor, metric or shipped theme has to move. Every
  figure except the two attributions is correct.
- Stop if `warning-fill-claims.test.ts` needs its passage count or regex changed:
  the new suite must read §9 without adding a `light \`warning\` … 1.89:1`
  phrase to `docs/design-system.md`, and if the wording cannot avoid that
  collision, record it in `TODO.md` instead of editing the existing guard.
- Do not edit `.agents/slop/plans/332-mark-contrast.md` or `COMPONENTS.md`'s
  plan-332 sentence: they are historical records.
- Do not weaken case 4 into a constant comparison; it must read
  `contrastFloors` per set.

## 9. Acceptance

- `wrong-role-mark-claims.test.ts` derives all five figures (the warning pair,
  the timeline dot, both accent ranges) from the shipped themes, holds the §9
  paragraph, both `TODO.md` rows and the `mark-contrast.test.ts` header, rejects
  the pre-fix attributions and the pre-fix ranges, and proves the figures move
  with a planted palette.
- The header and the Avatar row state `1.89:1` against the `card`; no other
  prose changes.
- Each mutation in §7 fails the file, and the tree is restored afterwards.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` are clean.
- `TODO.md` ticks the row and keeps the counter current; the plan index lists
  `823`.

## 10. Execution record

Executed on 2026-10-21 on `agent/tokens-theme`.

- The defect reproduced as §1 states: on the pre-plan tree the header said
  `1.78:1 on a light card` and the Avatar row `**1.78:1** on its card`, and the
  whole package suite was green at **224 files / 7147 tests**. The light
  palette measures `warning` at **1.7749** on `background` (`1.78`) and
  **1.8890** on `card` (`1.89`), so both passages named a number the ring does
  not produce.
- `wrong-role-mark-claims.test.ts` derives all five figures: the two `warning`
  surfaces (two decimals, as the pages quote them), the identity `muted` on
  `background` `1.036` with the shipped minimum `1.014` at `Light · Windows 7`,
  and both `accent` ranges with their endpoints — `1.118–1.392:1` on `popover`
  (`Dark · Windows` … `Light · Windows XP`) and `1.000–1.113:1` on `hover`
  (`Light` … the high-contrast dark value `1.113`, which several AAA sets tie).
- Every §7 mutation was applied alone, the new file run and the tree restored:
  the pre-fix header failed case 1; the pre-fix Avatar row failed cases 1 and 5;
  `1.118` → `1.119` in the design system failed cases 3 and 5; `1.000` → `1.001`
  in the menu row failed case 3; `1.036` → `1.037` in the header failed case 2;
  the light identity `warning` set to `#FFFFFF` failed case 1
  (`1.06` / `1.00`); the light `accent` set to `#000000` failed case 4 and moved
  both ranges; the restored tree passed all six.
- The header now reads "1.89:1 on the `card` its ring paints" and the Avatar row
  "**1.89:1** on its card"; no other prose changed, because the design system's
  `1.78:1 … on the canvas` sentence is correct.
- `nub run --filter @gpuixui/tokens test` → **225 files / 7153 tests** green
  (224 / 7147 before; one file with six cases added). `nub run check`,
  `nub run lint` and `nub run test` clean.
- **No native scenario was run**: no runtime code or token value moves, and this
  worktree has no `apps/playground/dist` build (`apps/playground/dist/smoke/run.js`
  is absent — the playground build is blocked by `BLOCKERS.md` B1, another
  workstream's task).

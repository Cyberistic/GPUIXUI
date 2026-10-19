# 698 — The selected option's check on its selected fill

> **Status: executed 2026-10-19.** The selected option's check now has pairs on
> `selected` and `selectedActive`; the shipped macOS dark accent moves one
> designed step so the check clears 3:1 on the fill it marks, the documented
> brand example moves its primary family, and every other colour, floor and
> metric stays. Execution evidence is at the end of this plan.

## Why

`comboboxCheckPairs` (`packages/tokens/src/contrast.ts`) publishes one
composition:

```ts
const comboboxCheckPairs: readonly ContrastPair[] = [
  ["primary", "hover", "mark"],
];
```

Plan 341 added it because `ComboboxItem` marks a selected option with a
`primary` check and `rowStyle` paints the `hover` wash behind a highlighted row,
so the check needed the `mark` floor while the pointer is on the row. The check
also marks a **selected** option, and a selected row is not always highlighted:

- `rowStyle` paints `selected` behind a chosen row and keeps it under the
  pointer; the row presses to `selectedActive` (plan 651).
- `ComboboxItem` marks the selected option with a `primary` check
  (`TODO.md`, plan 341 row).
- The check is therefore `primary` on `selected` at rest and `primary` on
  `selectedActive` while the chosen option is pressed.

The contract measures `primary` as a mark on the four plain surfaces, the
slider thumb's `input` fill, the highlighted row's `hover` wash, and as the
native caret's ink (`markPairs`), but **not** on `selected` or `selectedActive`.
A theme can therefore erase the check on the fill that carries the selection
while `themeFailures` returns `[]`.

**Measured gap (shipped).** The shipped macOS dark variant already fails it:
`primary` (`#0A84FF`) on `selected` (`#1A4568`) measures **2.748:1**, under the
3:1 default mark floor, while `themeFailures(getPlatformTheme("darwin", "dark"))`
returns `[]`. The same ratio appears in the catalogue as the reason the native
**caret** uses `primaryText` (plan 557) — the caret fix changed the caret role,
not the check that paints `primary` on the same fill. `primary` on
`selectedActive` (`#14344F`) measures 3.524:1 in that set, so only the resting
selected fill is below the floor.

A planted theme proves the diagnostic is missing, not only the shipped value:

```ts
const regressed = extendTheme(getTheme("light"), {
  colors: { selected: getTheme("light").colors.primary },
});
```

On the pre-fix tree `themeContrastFailures(regressed)` reports no
`primary`/`selected` `mark` pair. The check, its row and its label all disappear
into one fill, exactly the defect plan 341 closed one surface over.

## Decision

1. Publish `["primary", "selected", "mark"]` and
   `["primary", "selectedActive", "mark"]` in `comboboxCheckPairs`. The selected
   fill is the persistent state the check marks; the pressed fill is the same
   check under the pointer.
2. Do **not** add a new pair list or check kind. `comboboxCheckPairs` is already
   part of `markPairs`, which is part of `contrastPairs`, so the new pairs are
   reported by `themeContrastFailures` and by `themeFailures` with no composition
   change.
3. Move macOS dark's accent family one designed step so the check clears the
   floor on the selection the theme already ships: `primary` `#0A84FF` →
   `#2E93FF`, `primaryHover` `#409CFF` → `#48A0FF`, `primaryActive` `#64B5FF` →
   `#62ADFF`, `ring` `#409CFF` → `#48A0FF`, and the 20% selection wash
   `#0A84FF33` → a 14% wash of the new accent, `#2E93FF24` (the 14% keeps
   `foreground` through the wash on `selected` above 7:1). `primary` on
   `selected` (`#1A4568`) then measures **3.214:1**, and on `selectedActive`
   (`#14344F`) **4.121:1**. Keep `selected`/`selectedActive`: moving the fill
   instead would put the derived 24% press veil within 1.05:1 of the dark card,
   so the accent is the role that moves.
4. Do not change the other roles, pairs, classes or floors.

The pair count moves 461 → **463** (two mark pairs). No pair class, floor,
metric, role or other colour moves.

## Exact files and changes

### 1. `packages/tokens/src/contrast.ts`

Replace the list and its JSDoc:

```ts
/**
 * A selected option's check glyph on the fills it marks. `ComboboxItem` marks
 * the selected option with a `primary` check; `rowStyle` paints `hover` behind
 * a highlighted row, `selected` behind a chosen one, and `selectedActive` while
 * the chosen row is pressed. Plan 341 measured only the highlighted surface, so
 * a selected option that is not under the pointer painted its check on
 * `selected` with no pair behind it — the shipped macOS dark set measured
 * **2.748:1** there, under the 3:1 mark floor. The persistent and pressed
 * selected fills join the list; both are published inside {@link markPairs}.
 */
const comboboxCheckPairs: readonly ContrastPair[] = [
  ["primary", "hover", "mark"],
  ["primary", "selected", "mark"],
  ["primary", "selectedActive", "mark"],
];
```

Update the two sentences that enumerate the list:

- `markPairs` JSDoc: "the combobox check on the wash it highlights with **and on
  the selected and pressed fills it marks**".
- The `contrastPairs` JSDoc sentence that names the highlighted option's check
  (search `a selected option's check also sits on the`): name the selected and
  pressed fills as well.
- The `markPairs` description above `markRoles` (search `a selected option's
  check also sits on the`) if the same sentence appears there.

### 2. `packages/tokens/src/platform-styles/macos.ts`

In `colors.dark`, move the accent family and its two derived roles:

```ts
      primary: "#2E93FF",
      primaryForeground: "#000000",
      primaryHover: "#48A0FF",
      primaryActive: "#62ADFF",
      primaryText: "#A4D4FF",
      ring: "#48A0FF",
      selection: "#2E93FF24",
```

The light palette, `selected`, `selectedActive`, `selectedForeground` and the
`accent`/`secondary` families do not move. Extend the header comment:

```md
 * macOS: Apple's blue accent (`#0071E3` light, `#2E93FF` dark) ...
 * The dark focus ring is `#48A0FF`, the accent at its hovered weight, and it
 * measures 3.817:1 on the pressed-row wash.
 * ...
 * The selected option's `primary` check clears the 3:1 mark floor on the
 * `selected` fill at 3.214:1, so the lighter accent keeps the selection's
 * designed press instead of repainting it (plan 698).
```

Update the two stale sentences in the same comment: the dark readable text step
is `#A4D4FF`, and the dark fill measures 4.47:1 on a dark card.

### 2b. Documented examples that the new pair reveals

The selected-option pair is a real contract, so every documented theme the
package ships as an example must satisfy it:

- `packages/tokens/src/brand-theme.example.ts`: the dark brand's primary family
  becomes `#9579FF` / `#A78DFF` / `#B9A4FF`. It clears `primary` on the
  inherited `selected` at **3.146:1**, keeps the identity groove below 3:1
  (2.97:1, so the `track` override stays), and makes the identity scrim
  sufficient (face 1.157:1), so the example drops its `overlay` override. Update
  its rationale to state the selected-check rule and the base scrim.
- `docs/tokens.md`, `packages/tokens/README.md` and the `createTheme` `@example`
  in `packages/tokens/src/theme.ts`: the same snippet values and rationale.
- `packages/tokens/src/theme.test.ts`: the brand primary assertion, and keep the
  groove rationale test (it recomputes 2.97:1 from the source).
- `packages/tokens/src/docs.test.ts`: the brand scrim test now asserts the
  inherited overlay and the **1.157:1** face figure.
- The historical fixtures that quote a pre-698 figure pin the old value they
  were measured on: `native-field-caret.test.ts` (`primary` `#0A84FF`,
  `selected` `#1A4568`), `dialog-scrim.test.ts` (`primary` `#0A84FF`) and
  `selection-link.test.ts` (`selected` `#1A4568`, `selection` `#0A84FF33`).
  The figures they record stay the historical ones.
- `packages/tokens/src/recipe-edit.test.ts`: the pre-658 reconstruction filters
  its recorded marks to the six surfaces plan 658 audited; the positive case
  reads the full eight-surface list including the two new fills.

### 3. `packages/tokens/src/combobox-check-mark.test.ts`

Keep every existing case. Update the file header to say plan 698 closed the
selected fills and that the shipped macOS dark set was **2.748:1**, not a
hypothetical; the existing hover case's tightest figure moves from **3.111:1**
to **3.639:1** with the lighter accent. Add a second
`describe("the combobox check on a selected option")`:

```ts
const selectedFailures = (
  theme: Theme,
  background: "selected" | "selectedActive",
) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background: fill, pairClass }) =>
      foreground === "primary" && fill === background && pairClass === "mark",
  );

it("names the check on the selected and pressed fills once", () => {
  (["selected", "selectedActive"] as const).forEach((background) => {
    const pair = ["primary", background, "mark"] as const;
    expect(
      contrastPairs.filter(
        ([foreground, fill, pairClass]) =>
          foreground === pair[0] &&
          fill === pair[1] &&
          pairClass === pair[2],
      ),
    ).toEqual([pair]);
    expect(
      markPairs.some(
        ([foreground, fill, pairClass]) =>
          foreground === pair[0] &&
          fill === pair[1] &&
          pairClass === pair[2],
      ),
    ).toBe(true);
  });
});

it("keeps every shipped theme above its declared mark floor on the selected fills", () => {
  const failures = themes.flatMap(([label, theme]) => {
    const floor = contrastFloors[theme.contrast].mark;
    return (["selected", "selectedActive"] as const).flatMap((fill) => {
      const ratio = contrastRatio(theme.colors.primary, theme.colors[fill]);
      return ratio >= floor
        ? []
        : [`${label}: primary on ${fill} at ${ratio} < ${floor}`];
    });
  });

  expect(failures).toEqual([]);
});

it("reports a check erased on the selected fill", () => {
  const light = getTheme("light");
  const regressed = extendTheme(light, {
    colors: { selected: light.colors.primary },
  });
  const failures = selectedFailures(regressed, "selected");

  expect(failures).toHaveLength(1);
  expect(failures[0]?.floor).toBe(contrastFloors.default.mark);
  expect(failures[0]?.ratio).toBeCloseTo(1, 5);
});

it("pins the selected-fill figure the catalogue quotes", () => {
  const macos = getPlatformTheme("darwin", "dark");
  expect(
    Number(contrastRatio(macos.colors.primary, macos.colors.selected).toFixed(
      3,
    )),
  ).toBe(3.214);
  expect(
    Number(
      contrastRatio(macos.colors.primary, macos.colors.selectedActive).toFixed(
        3,
      ),
    ),
  ).toBe(4.121);
});
```

Import `getPlatformTheme` from `./index.js`. The planted case fails on the
pre-fix tree because the pair list has no `primary`/`selected` entry; the shipped
cases fail if the new pair is added without the macOS dark move.

### 4. `packages/tokens/src/checked-control.example.ts` (new)

An executed example of the composition, not a sketch:

```ts
import { getTheme, type Theme } from "./index.js";

/** The three roles a selected option paints its check on. */
export const selectedOption = (theme: Theme) => ({
  background: theme.colors.selected,
  pressedBackground: theme.colors.selectedActive,
  foreground: theme.colors.popoverForeground,
  check: theme.colors.primary,
});

/** The light theme's selected option, resolved for the suite. */
export const selectedOptionLight = selectedOption(getTheme("light"));
```

Import it in `combobox-check-mark.test.ts` and add:

```ts
it("resolves the documented selected option from the theme", () => {
  expect(
    contrastRatio(selectedOptionLight.check, selectedOptionLight.background),
  ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
  expect(
    contrastRatio(
      selectedOptionLight.check,
      selectedOptionLight.pressedBackground,
    ),
  ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
  expect(selectedOptionLight.foreground).toBe(
    getTheme("light").colors.popoverForeground,
  );
});
```

Also import it in `examples.test.ts` if that suite enumerates every example
directly; otherwise the test above is the consumer and the existing guard passes.

### 5. `docs/tokens.md`

- Add the executed example link beside the selection examples:
  "A selected option paints its check on `selected`/`selectedActive`; the
  executed shape is
  [`src/checked-control.example.ts`](../packages/tokens/src/checked-control.example.ts)."
- Add the plan to the contrast history sentence (search `396 to **461** across
  plans`): `463` and `698` in the plan list.
- Update the mark paragraph (search `the graphic marks a progress segment`) to
  name the selected and pressed fills for the combobox check.
- If the *Verification* paragraph enumerates the marks, add the two fills there.

### 6. `docs/design-system.md`

Update the hardcoded floor-table mark row (the line that begins
`| graphic marks (`) so the combobox clause reads:

```md
`primary` on the `hover` wash a highlighted combobox option paints its check
on, and on the `selected`/`selectedActive` fills the chosen option marks
```

`docs.test.ts` also derives this row from `markPairs`; both must pass.

### 7. `packages/tokens/README.md`

Find the mark paragraph (search `graphic marks` or `combobox check`) and add the
selected and pressed fills to it. Keep the existing hover clause.

### 8. `COMPONENTS.md`

- **Theme contrast check** row: change `461 contrast pairs` to `463 contrast
  pairs` and append to the plan history sentence:
  "Plan 698 holds a selected combobox option's `primary` check on the
  `selected`/`selectedActive` fills it marks — the shipped macOS dark set
  measured **2.748:1** on `selected` while the checker returned `[]` — taking
  the contract from 461 to **463** pairs and moving that set's `selected` one
  designed step (`#0A84FF` → `#2E93FF`, **3.214:1** on `selected`)."
- **Design tokens** row if it quotes pair counts: update the count there too
  (the inventory test derives its phrases from the lists).

### 9. `TODO.md`

Add one completed row under *Design tokens and theming* and move the counter
from `314/391` to `315/392`:

```
`[x]` Hold a selected option's check on the fill it marks — `ComboboxItem`
paints a `primary` check on the selected option, but the contract measured it
only on the `hover` wash a highlighted row paints (plan 341); a selected option
at rest sits on `selected` and presses to `selectedActive`, and the shipped
macOS dark set measured **2.748:1** on `selected` while `themeFailures` returned
`[]`. The two fills join `comboboxCheckPairs`, macOS dark's `selected` moves one
designed step (`#0A84FF` → `#2E93FF`, **3.214:1** on `selected`) and every shipped
set passes (plan 698)
```

### 10. `.agents/slop/plans/README.md`

Add one row to the tokens table after `695`:

```
| [698](./698-selected-option-check.md) | The selected option's check on its selected fill | F | 332, 341, 557, 651 | done |
```

Add a short paragraph after the `695` summary stating the defect, the two added
pairs, the one moved platform value and that no other colour moves.

## Commands

Run from the worktree root unless stated.

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| New regression only | `nub run --filter @gpuixui/tokens test -- src/combobox-check-mark.test.ts` | pass after the change; 2 new mark pairs |
| Prove it fails without the fix | temporarily comment out the two new `comboboxCheckPairs` entries and rerun the command above | the "names the check on the selected and pressed fills once" and "reports a check erased on the selected fill" cases fail |
| Package suite | `nub run --filter @gpuixui/tokens test` | 193 files, 6770 tests pass |
| Types | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| Whole gate | `nub run check` | `check:tests`, lint, format and types pass |
| Repo test gate | `nub run test` | all workspaces' suites pass |

`scripts/verify-two-directions.sh` is written against `jj` while the repo pins
git (recorded in `TODO.md` as a cross-team tooling row), so the both-directions
proof is the manual sequence above: two new cases must fail with the entries
removed and pass with them restored. Do not rewrite the script from this plan.

## Test plan

- **Can the new test fail?** Yes. The pair-existence case requires entries that
  do not exist on the pre-fix tree; the planted case requires a
  `primary`/`selected` mark failure that the pre-fix checker cannot emit; the
  shipped case fails if the pair is added without the macOS dark move (2.748 < 3).
- **The shipped sets:** all 24 sets must clear the default 3:1 / AAA 4.5:1 mark
  floor on `selected` and `selectedActive`. The tightest is macOS dark at
  **3.214:1** on `selected` and **4.121:1** on `selectedActive`.
- **The palette move is isolated:** the existing contrast, platform, direction,
  metric, docs and inventory suites must all stay green. The new family was
  probed against `themeFailures` before planning; the 14% selection wash keeps
  the selected title at 7:1 through the inherited wash.
- **The example runs:** `combobox-check-mark.test.ts` resolves the example and
  measures both of its fills, so the copyable snippet cannot drift from the
  roles; `theme.test.ts` pins the brand's quoted **3.146:1** on the inherited
  selection and holds `selectedActive` above the mark floor.

## Acceptance

- [ ] `comboboxCheckPairs` holds `primary` on `hover`, `selected` and
      `selectedActive`.
- [ ] `themeContrastFailures` reports a `primary`/`selected` `mark` failure for
      the planted theme and returns `[]` for every shipped set.
- [ ] macOS dark's accent is `#2E93FF` with hover `#48A0FF`, active `#62ADFF`,
      ring `#48A0FF` and selection `#2E93FF24`; `primary` on `selected`
      measures **3.214:1** and on `selectedActive` **4.121:1**, with
      `selected`/`selectedActive` unchanged.
- [ ] The executed example exists, is imported by the suite and is linked from
      `docs/tokens.md`.
- [ ] `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
      `COMPONENTS.md`, `TODO.md` and the plan index state the new pairs, count
      and moved value.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.

## STOP conditions

- Any other shipped set falls below the mark floor on `selected` or
  `selectedActive` → stop and report the set, fill and ratio. Do not move more
  palettes from this plan.
- Moving the macOS dark accent family reports any other failure → stop and
  report the failure kind and pair. Do not move `selected`/`selectedActive` or
  the card/popover/muted surfaces to chase it: the 24% press veil would then
  collide with the dark card, which is why the accent is the role this plan
  moves.
- A documented example fails the new pair → move that example's primary family
  or its selection with it as section 2b states, and record the cascade; never
  weaken the pair.
- A docs or inventory guard disagrees with the measured count → update the
  document to the derived list and re-run; never edit a list to satisfy prose.
- A gate fails in a file this plan does not own → report it; do not edit another
  workstream's tree.

## Execution (2026-10-19)

- `comboboxCheckPairs` now:

  ```ts
  [
    ["primary", "hover", "mark"],
    ["primary", "selected", "mark"],
    ["primary", "selectedActive", "mark"],
  ]
  ```

- macOS dark accent family: `primary` `#0A84FF` → `#2E93FF`, `primaryHover`
  `#409CFF` → `#48A0FF`, `primaryActive` `#64B5FF` → `#62ADFF`, `ring`
  `#409CFF` → `#48A0FF`, `selection` `#0A84FF33` → `#2E93FF24`.
  `selected`/`selectedActive` are unchanged.
- `contrastPairs`: 461 → 463.
- Tightest new pairs: `primary` on `selected` **3.214:1** (macOS dark);
  `primary` on `selectedActive` **4.121:1** (macOS dark); the hover pair moves
  from **3.111:1** to **3.639:1** with the lighter accent.
- The brand example's primary family moved to `#9579FF` / `#A78DFF` /
  `#B9A4FF`, the selection check measures **3.146:1** on the inherited
  `selected`, the identity groove still measures 2.97:1 (the `track` override
  stays) and the identity scrim now measures 1.157:1 (the `overlay` override is
  gone). Historical fixtures pin the pre-698 values they recorded.
- The new regression fails with the two pair entries removed (two cases) and
  passes with them restored. The full package suite is 193 files / 6770 tests
  green; `nub run check` and the repo test gate are recorded in the commit.

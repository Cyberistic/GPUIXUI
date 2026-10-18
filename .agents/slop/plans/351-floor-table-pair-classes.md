# Plan 351: The accessibility floor table omits the pair classes it claims to publish

> **Status:** done 2026-10-18. Owner: `tokens-theme`. Paths touched:
> `docs/design-system.md`, `packages/tokens/src/docs.test.ts`, `COMPONENTS.md`,
> `TODO.md`, `.agents/slop/plans/README.md`. No token, colour, pair or floor
> changes.

## Execution record (2026-10-18)

- Before the document edit, `nub run --filter @gpuixui/tokens test` reported
  **4 failed | 4216 passed (4220)**:
  - the exact-row case (`a Toast's tone glyph and bar …` absent);
  - `names every mark role and surface the contract measures` —
    `primary on hover: expected '| graphic marks (…' to contain '`hover`'`;
  - `names the value indicator's groove and every mark painted on it` —
    `value indicator groove (: expected undefined to be defined`;
  - `names every Toast tone role the contract measures on its card` — the row
    was undefined.
- After the three rows and the widened mark row landed: **4220 passed**.
- Final: `nub run check` (format included), `nub run lint` and the root
  `nub run test` are green.

## Why

`docs/design-system.md` §9 opens with "The token suite enforces:" and then lists
the contrast contract as a floor table. The table is the page a consumer reads to
learn what `themeContrastFailures` guarantees, so a missing row is a missing
guarantee.

Three contract groups are missing or incomplete:

1. **No row for the value indicator's groove.** Plan 347 added `track` and two
   contract lists — `trackSurfacePairs` (track on `background`/`card`/`popover`/
   `muted` and the `accent`/`selected` fills) and `trackMarkPairs` (the four
   progress fills on the track). The table names neither the role nor either
   list, so an indeterminate progress bar — whose only visible paint is its
   track — has no documented floor.
2. **The mark row omits the combobox check on a highlighted row.** Plan 341
   added `["primary", "hover", "mark"]`; the row names the four plain surfaces
   and the `input` fill a slider thumb rings, but not the `hover` wash.
3. **No row for the Toast's shipped tone paint.** Plan 348 added
   `toastTonePairs` — the four `xSoftForeground` roles on `popover`, the shipped
   composition until `components` migrates to `xText` — at the secondary floor.
   The soft-status row measures `xSoftForeground` only on its own fill.

The existing guard (`docs.test.ts`, "states the floors the contrast checker
enforces") asserts 23 **exact strings**. It holds the wording, not the content:
a pair class or a surface can ship and the table stays green, which is how all
three omissions happened. Plans 313, 326, 336 and 349 fixed the same class of
drift in the catalogue; the floor table is the last hand-written list of the
contract's size.

## Files to change

### 1. `docs/design-system.md` — §9 accessibility table

Change the graphic-marks row to name the combobox check on the highlight wash.
Replace:

```md
| graphic marks (`primary`/`success`/`destructive` on `background`/`card`/`popover`/`muted`, and `primary`/`destructive` on the `input` fill a slider thumb rings) | 3:1 | 4.5:1 |
```

with:

```md
| graphic marks (`primary`/`success`/`destructive` on `background`/`card`/`popover`/`muted`, `primary` and `destructive` on the `input` fill a slider thumb rings, and `primary` on the `hover` wash a highlighted combobox option paints its check on) | 3:1 | 4.5:1 |
```

Insert two rows immediately after it:

```md
| value indicator groove (`track`) on `background`/`card`/`popover`/`muted` and the `accent`/`selected` fills | 1.05:1 | 1.05:1 |
| value indicator marks (`primary`/`success`/`destructive`/`mutedForeground` on `track`) | 3:1 | 4.5:1 |
```

Insert one row after the soft-status-text row:

```md
| a Toast's tone glyph and bar (`infoSoftForeground`/`successSoftForeground`/`warningSoftForeground`/`destructiveSoftForeground` on `popover`, the shipped composition until `components` paints `xText`) | 4.5:1 | 7:1 |
```

No other prose changes. The body already explains `track` (§ "A value indicator's
unfilled groove is `track`") and the Toast migration is a cross-team TODO row.

### 2. `packages/tokens/src/docs.test.ts`

Add imports beside the existing contrast imports:

```ts
import type { ContrastPairClass } from "./contrast.js";
import {
  markPairs,
  toastTonePairs,
  trackMarkPairs,
  trackSurfacePairs,
} from "./contrast.js";
```

Keep the raw design-system source so a row can be found by its first cell.
Today `designSystem` is the whitespace-collapsed string; add:

```ts
const designSystemSource = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
);

const designSystem = designSystemSource.replace(/\s+/g, " ");
```

Add a row finder beside `designSystem`:

```ts
/** The table row that starts with `label`, or a failure naming it. */
const tableRow = (label: string): string => {
  const line = designSystemSource
    .split("\n")
    .find((candidate) => candidate.startsWith(`| ${label}`));
  expect(line, label).toBeDefined();
  return line ?? "";
};
```

Update the "states the floors the contrast checker enforces" `rows` array: the
graphic-marks string changes to the new wording, and the three new rows join the
list with their floors derived from `contrastFloors` (`surface`, `mark`,
`secondary`).

Add three content guards below that test:

```ts
it("names every mark role and surface the contract measures", () => {
  const row = tableRow("graphic marks (");
  markPairs.forEach(([role, surface]) => {
    expect(row, `${role} on ${surface}`).toContain(`\`${role}\``);
    expect(row, `${role} on ${surface}`).toContain(`\`${surface}\``);
  });
});
```

```ts
it("names the value indicator's groove and every mark painted on it", () => {
  const groove = tableRow("value indicator groove (");
  trackSurfacePairs.forEach(([, surface]) => {
    expect(groove, surface).toContain(`\`${surface}\``);
  });

  const marks = tableRow("value indicator marks (");
  trackMarkPairs.forEach(([role]) => {
    expect(marks, role).toContain(`\`${role}\``);
  });
  expect(marks).toContain("`track`");
});
```

```ts
it("names every Toast tone role the contract measures on its card", () => {
  const row = tableRow("a Toast's tone glyph and bar (");
  toastTonePairs.forEach(([role]) => {
    expect(row, role).toContain(`\`${role}\``);
  });
  expect(row).toContain("`popover`");
});
```

Add the class-coverage guard. The `Record<ContrastPairClass, string>` is the
exhaustiveness proof: a new pair class cannot compile until it is mapped to the
row that documents it, and the last assertion fails if a mapped row is absent:

```ts
it("has a floor row for every pair class the checker enforces", () => {
  const rowFor: Readonly<Record<ContrastPairClass, string>> = {
    body: "| body text on",
    secondary: "| secondary text (",
    inactive: "| inactive label (",
    boundary: "| focus ring on",
    mark: "| graphic marks (",
    surface: "| interactive fills and washes (",
    step: "| filled-control state steps (",
    divider: "| decorative dividers (",
  };

  expect(Object.keys(rowFor).sort()).toEqual(
    Object.keys(contrastFloors.default).sort(),
  );
  Object.entries(rowFor).forEach(([pairClass, prefix]) => {
    expect(designSystemSource.includes(prefix), pairClass).toBe(true);
  });
});
```

Update the file header comment with a plan-351 paragraph: the floor table is the
last hand-written description of the contract's size, and its mark, track and
Toast rows are now derived from the lists that enforce them.

### 3. `COMPONENTS.md`

In the **Theme contrast check** row, after the sentence about the pair lists,
add: the design-system floor table now has a row for every `ContrastPairClass`,
and its mark, track and Toast rows are derived from `markPairs`,
`trackSurfacePairs` / `trackMarkPairs` and `toastTonePairs`, so a new
role/surface cannot ship unmentioned (plan 351).

### 4. `TODO.md`

Add under **Design tokens and theming (`tokens-theme`)**, ticked:

```md
`[x]` Hold the design-system's accessibility floor table to the contract — it
had no row for the `track` groove or its four marks (plan 347) and its mark row
omitted the combobox check on a highlighted row's `hover` wash (plan 341); the
table now names every `ContrastPairClass` and derives the mark, track and Toast
role/surface lists from the contract (plan 351)
```

### 5. `.agents/slop/plans/README.md`

Add `| [351](./351-floor-table-pair-classes.md) | The accessibility floor table omits the pair classes it claims to publish | F | 071, 303, 336, 341, 347, 348 | done |`
to the tokens table.

## Commands and expected results

Run from the worktree root, after step 2's new tests exist but **before** the
document edit:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: **fail**, three or four cases —

- `names every mark role and surface the contract measures` → the mark row does
  not contain `` `hover` ``;
- `names the value indicator's groove and every mark painted on it` → the row is
  `undefined` (`value indicator groove (`);
- `names every Toast tone role the contract measures on its card` → the row is
  `undefined`;
- the exact-row case → the old graphic-marks string is present only until the
  document changes, so it may pass before the edit; record which cases fail.

Capture the output in the execution record. This is the two-direction proof for
the guard.

After the document edit:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

Expected: the tokens suite passes (69 files, 4220+ tests), `check` includes the
formatting pass, `lint` is clean, and the root `test` is green.

## STOP conditions

- Stop if `markPairs`, `trackSurfacePairs`, `trackMarkPairs` or `toastTonePairs`
  is not exported from `contrast.ts`; report rather than duplicating the lists in
  the test.
- Stop if a required doc row would have to change a **colour or floor value**;
  this plan is documentation and guard only.
- Stop if the class map cannot be made exhaustive without editing
  `ContrastPairClass`; report the mismatch instead of adding a cast.
- Stop if any command in the completion gate fails for a reason outside these
  files; report the failure with its output.

## Test plan

| Case | Kills |
| ---- | ----- |
| derived mark row | a mark role or surface shipping without a documented floor (the plan-341 omission) |
| derived track rows | the `track` role and its four marks being unmentioned (the plan-347 omission) |
| derived Toast row | the shipped `xSoftForeground`-on-`popover` composition being unmentioned (the plan-348 omission) |
| class map | a new `ContrastPairClass` compiling with no floor row |
| exact rows | a floor value in the table drifting from `contrastFloors` |

Both directions: the new cases fail against today's table (captured in the
execution record) and pass after the rows are added.

## Acceptance

- Every pair class in `contrastFloors.default` has a row in the §9 table.
- The mark, track and Toast rows name every role and surface the corresponding
  contract lists measure.
- The exact-row guard reflects the new wording and floors.
- The tokens suite, `nub run check`, `nub run lint` and `nub run test` pass.
- No token, colour, pair or floor value changes.

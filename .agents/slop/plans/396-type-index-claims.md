# Plan 396 — the type index's counts, its weight claim and the colour-format role count

**Workstream:** `tokens-theme` · **Phase:** F (docs truth) · **Depends on:**
324 (the type index), 370 (the `FontWeight` type), 394 (`softAction`, which took
the palette from 66 to 70 roles), 395 (the last role-count edit).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`docs/tokens.md` has two places that are still written against the pre-394
palette, and a claim about the type scale that was never true — written twice,
in the type index and in the Typography prose:

| # | Location | Says | Ships |
| - | -------- | ---- | ----- |
| 1 | `## Types`, row `ThemeColors` (line 126) | “The **66** semantic colour roles.” | `colorRoles.length` = **70** |
| 2 | `### Colour format` (line 1644) | “`themeColorFailures(theme)` walks all **66** `colorRoles`” | 70 |
| 3 | `## Types`, row `FontWeight` (line 94) | “the shipped scale uses `400`, `500`, `600` and **`700`**” | the ten `typography` roles use **`400`, `500`, `600`** only |
| 4 | `## Typography` prose (line 524) | “The shipped weights are `400`, `500`, `600` and **`700`**” | the same three weights |

Plan 394 added four roles (`softAction`, `softActionHover`,
`softActionActive`, `softActionForeground`) and updated the sentences
`color.test.ts` already read — “There are 70 roles.” and “the same 70 roles” —
plus the **Design tokens** row in `COMPONENTS.md`. The two statements above were
not read by any test, so the document now disagrees with the package while
`nub run test` is green.

The `FontWeight` row is the same class of defect one paragraph earlier: the
public type is a CSS number in `1…1000` (plan 370), and the sentence describes
the **shipped** scale. No role in `typography` uses `700`; the strongest role is
`display`/`h1`/`h2`/`h3`/`bodyStrong` at `600`. A reader who picks `700` because
the reference says the scale ships it is reading a value no role carries.

Measured on the built package (Node, `packages/tokens/dist`):

```
colorRoles.length                 70
textRoles.length                  10
motion timing levels              6   (none, step, fast, normal, slow, pulse)
motion easing phases              4   (standard, enter, exit, linear)
distinct typography weights       400, 500, 600
```

`docs.test.ts` already holds the *role count* in two other sentences
(`There are ${colorRoles.length} roles.` and `the same ${colorRoles.length}
roles`), the numeric tables and the design-system's claims. It does not parse
the `## Types` table at all, so a count written there is unguarded.

## 2. Decision

1. Fix the two stale counts to **70** (the value `colorRoles.length` produces
   today).
2. Fix the `FontWeight` sentence to the three shipped weights and drop `700`.
3. Add one guard that reads the `## Types` table and holds every **count or
   ordered-range** claim to its runtime owner:
   - `ThemeColors` → `colorRoles.length`;
   - `Typography` → `textRoles.length`;
   - `Motion` → the timing levels and easing phases of `motion`;
   - `FontWeight` → the distinct weights the ten `typography` roles use;
   - `AvatarSize` / `IconSize` → the first and last key of the scale record.
   The same weight set is held to the “shipped weights are …” sentence in the
   Typography prose, which repeats the table's claim.

   The weight case compares the **set** of backticked numbers in the row with
   the set the roles use, so adding a `700` role forces the sentence to grow and
   removing it forces the sentence to shrink.
4. Hold the colour-format paragraph to `colorRoles.length` too, so the third
   count cannot drift again.

Rejected alternatives:

- **Set the two counts to the literal `70` and stop.** That is what plan 394 did
  for the two sentences `color.test.ts` happened to read, and it is why this
  drift exists. The guard is the deliverable; the numbers follow from it.
- **Guard every cell of the type table.** Most rows are qualitative
  (“A complete resolved theme.”). The enum-name rows are already held by their
  owning tables (`public-types.test.ts` for membership; the platform, status and
  contrast suites for content). This plan guards the claims a future value edit
  can falsify without touching another test: counts, weights and ranges.
- **Export a `themeChoiceAxes` index for the `ThemeChoice` row's “five unknown
  axes”.** No runtime owner exists, and inventing one to satisfy a sentence is
  backwards. The row is left alone; it is a shape description, not a claim about
  a shipped value.

## 3. Exact edits

### 3.1 `docs/tokens.md`

- In the `## Types` table:
  - `| `ThemeColors` | The 66 semantic colour roles. |` →
    `| `ThemeColors` | The 70 semantic colour roles. |`
  - `| `FontWeight` | A numeric CSS weight, `1…1000`; the shipped scale uses
    `400`, `500`, `600` and `700`. |` →
    `| `FontWeight` | A numeric CSS weight, `1…1000`; the shipped scale uses
    `400`, `500` and `600`. |`
- In `## Typography`:
  - “The shipped weights are `400`, `500`, `600` and `700`;” →
    “The shipped weights are `400`, `500` and `600`;”.
- In `### Colour format`:
  - “`themeColorFailures(theme)` walks all 66 `colorRoles`” →
    “`themeColorFailures(theme)` walks all 70 `colorRoles`”.

Use the implementation's numbers, not the literals: run

```sh
cd packages/tokens
nub run build
node --input-type=module -e '
import { colorRoles, textRoles, typography } from "./dist/index.js";
console.log(colorRoles.length, textRoles.length,
  [...new Set(Object.values(typography).filter((value) => typeof value === "object")
    .map((role) => role.fontWeight))].sort());
'
```

Expected: `70 10 [ 400, 500, 600 ]`.

### 3.2 `packages/tokens/src/docs.test.ts`

Add `describe("docs/tokens.md type index")` after the existing
`describe("docs/tokens.md contract counts")` block (the `countWord` helper and
the `markdownProse` constant are already in scope there).

Helper, beside `documentedRows` or inside the new describe:

```ts
/** The `## Types` row for `name`, or a failure naming it. */
const typeRow = (name: string): string => {
  const line = markdown
    .split("\n")
    .find((candidate) => candidate.startsWith(`| \`${name}\` |`));
  expect(line, name).toBeDefined();
  return line ?? "";
};
```

Cases:

```ts
const timingLevels = Object.keys(motion).filter((key) => key !== "ease");
const easingPhases = Object.keys(motion.ease);
const shippedWeights = [
  ...new Set(textRoles.map((role) => typography[role].fontWeight)),
].toSorted((left, right) => left - right);
const weightRow = /`(\d{2,4})`/g;

describe("docs/tokens.md type index", () => {
  it("states the colour and type-role counts the package ships", () => {
    expect(typeRow("ThemeColors")).toContain(
      `The ${colorRoles.length} semantic colour roles.`,
    );
    expect(typeRow("Typography")).toContain(
      `${countWord(textRoles.length)} type roles`,
    );
  });

  it("states the motion levels and phases the scale ships", () => {
    expect(typeRow("Motion")).toContain(
      `${countWord(timingLevels.length)} timing levels and ` +
        `${countWord(easingPhases.length)} easing phases.`,
    );
  });

  it("names exactly the font weights the type roles use", () => {
    const claimed = [...typeRow("FontWeight").matchAll(weightRow)].map(
      (match) => Number(match[1]),
    );
    expect(new Set(claimed)).toEqual(new Set(shippedWeights));
    const quoted = shippedWeights.map((weight) => `\`${weight}\``);
    expect(markdownProse).toContain(
      `shipped weights are ${quoted.slice(0, -1).join(", ")} and ${quoted.at(-1)}`,
    );
  });

  it("states the shipped range of the avatar and icon scales", () => {
    const range = (scale: object): string => {
      const keys = Object.keys(scale);
      return `\`${keys[0]}\` to \`${keys.at(-1)}\``;
    };
    expect(typeRow("AvatarSize")).toContain(range(avatarSize));
    expect(typeRow("IconSize")).toContain(range(iconSize));
  });

  it("states the colour-format walk over every role", () => {
    expect(markdownProse).toContain(
      `walks all ${colorRoles.length} \`colorRoles\``,
    );
  });
});
```

Notes for the executor:

- `motion`, `textRoles`, `typography`, `colorRoles`, `avatarSize` and
  `iconSize` are already imported by `docs.test.ts`; do not add imports unless
  TypeScript says a name is missing.
- `Object.keys`/`Object.values` in a documentation test is deliberate: these
  rows describe runtime objects, and the suite already reads `Object.keys` of
  `motion` and `typography` elsewhere in the file. Do not add an Effect import
  to a test that has none.
- `keys.at(-1)` returns `string | undefined`; the `range` helper's template
  turns `undefined` into the literal `undefined`, and the assertion then fails
  naming the row. That is the intended failure mode — an empty scale record is
  not a passing row.
- Do **not** rewrite the existing role-count test at line 229. It holds two
  different sentences; this plan holds the type table and the colour-format
  paragraph.

### 3.3 `TODO.md`

Add one row under **Design tokens and theming** and tick it after the tests
pass (the convention is the implementation commit; see plan 395's
`docs(todo)` commit):

```
`[x]` Hold the type index's counts and weight claim — `ThemeColors` still said
66 roles after plan 394 shipped 70, the colour-format paragraph repeated the 66,
and `FontWeight` claimed a shipped `700` no role uses; the four type-table
counts/ranges and the paragraph are now derived from `colorRoles`,
`textRoles`, `motion`, `typography`, `avatarSize` and `iconSize` (plan 396)
```

### 3.4 `.agents/slop/plans/README.md`

Add this plan to the `036` block table (after `395`) and one paragraph to the
prose after the `395` paragraph:

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [396](./396-type-index-claims.md) | The type index's counts, its weight claim and the colour-format count | F | 324, 370, 394, 395 | done |

Paragraph: the gap and the derived guard, in the same voice as 394/395.

## 4. Commands and expected results

Run from the workspace root unless a step says otherwise.

1. `nub run --filter @gpuixui/tokens test`
   Expected before the edit: **100 files / 4862 tests pass** (baseline captured
   on 2026-10-18).
2. Add the `docs.test.ts` cases first, then run
   `nub run --filter @gpuixui/tokens test`.
   Expected: **the new type-index cases fail** — `ThemeColors` 66 vs 70,
   `FontWeight` 700 vs {400,500,600}, and the colour-format walk 66 vs 70. If
   they pass, the guard is broken: STOP and fix the guard.
3. Edit `docs/tokens.md` (§3.1), then run
   `nub run --filter @gpuixui/tokens test`.
   Expected: all files pass.
4. `nub run check`
   Expected: type-check and `check-tests` pass.
5. `nub run lint`
   Expected: no findings.
6. `nub run test`
   Expected: all workspace tests pass.

## 5. Test plan (both directions)

The regression is: **a role or weight edit leaves a count in the `## Types`
table or the colour-format paragraph stale while every other suite stays green.**

- **Without the guard (before this plan):** set `ThemeColors` to 66 and run the
  suite — green. Set `FontWeight` to include 700 — green. This is the captured
  baseline; the plan exists because it happened.
- **With the guard, without the fix:** the three new cases fail with the exact
  row/sentence in the diff. Capture the failing output for the commit message.
- **With the guard and the fix:** all cases pass.
- **Sensitivity:** in a scratch run, set the `ThemeColors` row to 71 → the
  count case fails; add `fontWeight: 700` to `display` → the weight case fails
  (and the numeric tables case fails too, because it lists every role's
  weight; that is expected and is why the plan does not add a role). Revert the
  scratch edits before committing.

No native runtime is involved: this is a documentation contract over shipped
data, and the package ships zero runtime dependencies by design.

## 6. STOP conditions

Stop and report rather than improvise if:

- `colorRoles.length` is not 70, or another sentence in either document states
  a role count this plan did not list. The plan's premise is the 66 → 70 drift;
  if the palette changed again, re-measure first.
- The `FontWeight` row is guarded by another suite with a different expectation
  (search `docs.test.ts`, `public-types.test.ts`, `font-weight.test.ts`). Do not
  create two competing guards; move the assertion instead.
- A test fails for a reason outside the three statements (a palette value, a
  type role, a platform style). Do not "fix" the test by editing the value it
  reads; report it as a separate finding.
- `nub run check` fails inside `check-tests` because a new test asserts a
  derived value (the checker rejects an assertion of a literal against itself).
  The cases above compare a document against runtime data, so they are valid
  tests; if `check-tests` still objects, quote its finding in the report rather
  than weakening the case.

## 7. Acceptance

- [ ] `docs/tokens.md` states 70 roles in the `ThemeColors` row and in the
      colour-format walk, and `400`, `500`, `600` (no `700`) for `FontWeight`.
- [ ] `docs.test.ts` fails when any of those three claims, or the `Motion`,
      `Typography`, `AvatarSize` or `IconSize` claims, disagree with the
      package.
- [ ] Both directions were run and the failing output recorded in the commit
      message.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
- [ ] `TODO.md`, the plan index and the ledger are updated.

# 815 — The border role's two floors and its fill list have no owner

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `080`, `084`,
`318`, `327`, `335`, `352`, `501`, `550`, `555`, `683`, `754`, `814`.

## 1. The defect

`border` and `borderStrong` are the only two roles whose whole story is a pair of
floors and a list of fills:

```
divider   border on      secondary secondaryHover secondaryActive hover active
                         accent accentHover accentActive          (8 fills, 1.05:1 / 3:1)
boundary  borderStrong on background card popover input muted the four washes
                         selectedActive and the four soft fills   (3:1 / 4.5:1)
```

`contrastFloors` owns the numbers and `controlFillRoles` owns the eight fills,
and `docs.test.ts` already holds §7's `border` bullet to the *enumeration*
(“names every fill a bordered control paints”) and §7's `borderStrong` bullet to
its *surfaces* (“names every surface the functional boundary is measured on”).
Nothing owns the numbers or the counts those same sentences state, and the
catalogue's own introduction of the two roles retypes a subset of the fills.

Measured on this tree (each mutation applied alone, the full suite run, the tree
restored — all **7121** tests were green in every case):

| Mutation | Where | Suite |
| -------- | ----- | ----- |
| “those eight fills” → “those nine fills” | `docs/design-system.md` §7 | 7121 green |
| “those four fills carry the same floor” → “those five/six” | `docs/design-system.md` §7 | 7121 green |
| “1.05:1 perceivability floor (3:1 at high contrast)” → `1.06:1` | `docs/design-system.md` §7 | 7121 green |
| the same phrase → “(4:1 at high contrast)” | `docs/design-system.md` §7 | 7121 green |
| “It meets 3:1 against the `background` canvas” → `4:1` | `docs/design-system.md` §7 | 7121 green |
| “the essential control boundary held to 3:1 (4.5:1 at high contrast)” → `4:1` | `docs/tokens.md`, role introduction | 7121 green |
| “the eight fills a bordered control paints” → “nine” | `docs/tokens.md`, Verification | 7121 green |
| “divides (1.05:1, and 3:1 at high contrast)” → `1.06:1` | `docs/tokens.md`, Verification | 7121 green |
| “the decorative `border` at 1.05:1” → `1.06:1` | `packages/tokens/README.md` | 7121 green |
| “(3:1 at high contrast)” → “(4:1 at high contrast)” | `packages/tokens/README.md` | 7121 green |
| “`accent` for an outline toggle that is on” → “its designed hover and press” (dropping `accentHover`/`accentActive`) | `docs/tokens.md`, role introduction | 7121 green |
| removing `accentHover` from the Verification enumeration | `docs/tokens.md`, Verification | **1 failed** (owned by plan 555's list) |
| “the four soft status fills” → “five” | `packages/tokens/README.md` | **1 failed** (owned by an earlier count case) |

So the omissions are structural, not cosmetic:

- **The catalogue contradicts itself.** Its role introduction lists six of the
  eight fills (`secondary`, `secondaryHover`, `secondaryActive`, `hover`,
  `active`, `accent`) and says “the divider is held to its floor on those fills
  too”, while the same page's Verification paragraph lists all eight. Plan 318
  and plan 327 added `accentHover`/`accentActive` precisely because an outlined
  toggle that is on paints them — a reader following the introduction has no
  reason to check the toggle's pointer states before placing a bordered action
  on them.
- **The floors a reader builds from are prose-only.** A palette or floor edit is
  free to leave three documents quoting 1.05:1 / 3:1 (and 3:1 / 4.5:1 for the
  boundary) for ever; `contrastFloors` can change and no suite reads the
  sentences. That is the class plans `501`, `536` and `617` closed elsewhere by
  deriving the figure from its owner.
- **The two count words are unowned**, so the ninth control fill plan `327`
  added could have left both pages saying “eight”, and a fifth status family
  would leave §7 saying “four”. That is the class plans `683`, `684` and `814`
  closed for the chip, skeleton and groove lists.
- **§7 states only half of `borderStrong`'s pair**: “It meets 3:1 against …”
  and never its high-contrast floor, while the `border` bullet beside it states
  both. A reader editing at AAA is told the default number only.

No colour, pair, floor, metric, role or shipped theme moves. The contract is
already measured; this plan owns prose and a guard.

## 2. What the contract measures today

Derived on this tree with the package's own values:

```
controlFillRoles.length       8
  secondary secondaryHover secondaryActive hover active accent accentHover accentActive
controlFillPairs              8   ["border", role, "divider"]
contrastFloors.default.divider  1.05   high  3
contrastFloors.default.boundary 3      high  4.5
statusTones.length            4   info success warning destructive
border on each ${tone}Soft    measured as divider pairs (plan 095)
```

Every shipped set clears every one of those pairs, so the palette does not move.

## 3. Decision

1. Correct the catalogue's role introduction to name all eight fills, in
   `controlFillRoles` order, and to name its owner — the paragraph is the first
   thing a reader sees about the role.
2. State `borderStrong`'s high-contrast floor in §7 beside its default one, so
   the two bullets read symmetrically. This adds no claim the §9 floor table does
   not already hold (plan `501`).
3. Add `packages/tokens/src/border-role-claims.test.ts`, which derives the two
   floors from `contrastFloors`, the two count words from `controlFillRoles` and
   `statusTones`, and the enumerations from `controlFillRoles`, and reads the
   five passages that state them. It fails on this tree before step 1 and on
   every mutation in §9 after it.
4. Keep the existing `docs.test.ts` cases: they own the enumerations and the
   surfaces, the new suite owns the figures and the counts. No existing case is
   loosened or deleted.

## 4. Files to change

1. `docs/tokens.md` — the role introduction (the paragraph before *There are 71
   roles*) and nothing else in the page.
2. `docs/design-system.md` — the `borderStrong` bullet in §7.
3. **create** `packages/tokens/src/border-role-claims.test.ts`.
4. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.
5. `TODO.md` — a ticked row and the section counter.
6. `COMPONENTS.md` — the *Theme contrast check* row gains the sentence that both
   border floors and the control-fill count are derived.

No other file changes. In particular `contrast.ts`, `docs.test.ts`,
`control-edge.test.ts` and `readme.test.ts` keep their content.

## 5. Step 1 — `docs/tokens.md`, the role introduction

Replace

```
`secondary` at rest, `secondaryHover`/`secondaryActive` while a filled neutral
control is hovered or pressed, the generic `hover`/`active` washes on a ghost or
outline control, and `accent` for an outline toggle that is on — so the divider
is held to its floor on those fills too, not only on the plain surfaces.
```

with

```
`secondary` at rest, `secondaryHover`/`secondaryActive` while a filled neutral
control is hovered or pressed, the generic `hover`/`active` washes on a ghost or
outline control, and the `accent`/`accentHover`/`accentActive` fills of an
outline toggle that is on (`controlFillRoles`) — so the divider is held to its
floor on those eight fills too, not only on the plain surfaces.
```

The paragraph's first sentence — “`borderStrong` is the essential control
boundary held to 3:1 (4.5:1 at high contrast)” — is already correct and is now
held by the new case; do not reword it.

## 6. Step 2 — `docs/design-system.md`, the `borderStrong` bullet

Replace

```
- `borderStrong` is functional — input and control boundaries. It meets 3:1
  against the `background` canvas, a `card`, a `popover`, the `input` fill a
```

with

```
- `borderStrong` is functional — input and control boundaries. It meets 3:1
  (4.5:1 at high contrast) against the `background` canvas, a `card`, a
  `popover`, the `input` fill a
```

Nothing else in the bullet changes; the surfaces and the strong-over-thin rule
stay exactly as they are.

## 7. Step 3 — `packages/tokens/src/border-role-claims.test.ts`

Header states the bug: the two border roles are documented as a floor plus a
fill list, and three documents quote four floor figures and two count words that
no case read — a `contrastFloors` or `controlFillRoles` edit could leave all
three quoting the old numbers while every suite stayed green — and the
catalogue's role introduction named six of the eight fills the contract
measures.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `contrastFloors`, `contrastPairs`, `controlFillRoles` from
`./index.js`; `statusTones` from `./index.js`.

Helpers (module scope, ~15 lines):

```ts
const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

const between = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  if (from === -1 || to === -1) {
    throw new Error(`no slice ${start}`);
  }
  return text.slice(from, to);
};

const floor = (level: "default" | "high", pairClass: "divider" | "boundary") =>
  `${contrastFloors[level][pairClass]}:1`;

const countWord = (count: number): string =>
  "zero one two three four five six seven eight nine ten".split(" ")[count] ??
  String(count);
```

Slices (throw when a marker moves, so a relocated paragraph fails with its name):

```
catalogueIntro   docs/tokens.md
                 start: "`border` is decorative; `borderStrong` is the essential"
                 end:   "The four status families"
catalogueVerify  docs/tokens.md
                 start: "if a decorative `border` is imperceptible"
                 end:   "Each soft surface also has a role for its edge"
designBorder     docs/design-system.md
                 start: "- `border` is decorative"
                 end:   "- `borderStrong` is functional"
designStrong     docs/design-system.md
                 start: "- `borderStrong` is functional"
                 end:   "Elevation is a semantic level"
readmeBorder     packages/tokens/README.md
                 start: "the decorative `border` at"
                 end:   "outline action sits on in a selected row"
```

Cases:

1. **the contract's list and floors are what the prose states** — `controlFillRoles`
   has eight members, `contrastPairs` contains `["border", role, "divider"]` for
   every one and `["border", `${tone}Soft`, "divider"]` for every tone,
   `contrastFloors.default.divider` is `1.05`, `.high.divider` is `3`,
   `.default.boundary` is `3` and `.high.boundary` is `4.5`. (This case is the
   floor/derivation anchor; it fails the moment a list or floor moves.)
2. **the decorative border states both of its floors** — `designBorder` contains
   `` `held to a ${floor("default", "divider")} perceivability floor (${floor("high", "divider")} at high contrast)` ``,
   `catalogueVerify` contains
   `` `(${floor("default", "divider")}, and ${floor("high", "divider")} at high contrast)` ``
   and `readmeBorder` contains
   `` `at ${floor("default", "divider")} (${floor("high", "divider")} at high contrast)` ``.
3. **both documents state the functional boundary's floors** — `catalogueIntro`
   contains `` `to ${floor("default", "boundary")} (${floor("high", "boundary")} at high contrast)` ``
   and `designStrong` contains
   `` `It meets ${floor("default", "boundary")} (${floor("high", "boundary")} at high contrast)` ``.
4. **every page names every fill a bordered control paints** — for each of
   `catalogueIntro`, `catalogueVerify`, `designBorder` and `readmeBorder`, every
   member of `controlFillRoles` appears as `` `role` ``; `accentHover` and
   `accentActive` are asserted explicitly so the failure names the fills plan
   `327` added.
5. **the count words are the contract's** — `designBorder` contains
   `` `those ${countWord(controlFillRoles.length)} fills` `` and
   `` `those ${countWord(statusTones.length)} fills carry the same floor` ``;
   `catalogueIntro` contains
   `` `those ${countWord(controlFillRoles.length)} fills too` ``; `catalogueVerify`
   contains `` `the ${countWord(controlFillRoles.length)} fills a bordered control` ``.
6. **the pre-plan catalogue sentence is gone and is detected** — a predicate built
   from the historical clause
   ```ts
   const namesSix = (text: string): boolean =>
     text.includes("and `accent` for an outline toggle that is on") &&
     !text.includes("`accentHover`");
   ```
   returns `true` for the sentence quoted in this plan's §1 and `false` for
   `catalogueIntro`. (This is the case that fails on this tree before step 1.)

Deliberately not asserted: the `borderStrong` surface list
(`docs.test.ts` owns it), the strong-over-thin rule (`docs.test.ts` owns it),
the `selected`/`selectedActive` edge (`selectedRowEdgePairs`, plan `335`) and the
tightest shipped figures (`figures.ts`).

## 8. Test plan

From `packages/tokens`:

```sh
nub run --filter @gpuixui/tokens test src/border-role-claims.test.ts src/docs.test.ts src/control-edge.test.ts src/readme.test.ts
```

Expected **before** the prose changes: the new suite fails case 6 (the six-fill
sentence) and case 5 (the catalogue's count word is absent), which is the proof
it can fail; the other three files are green.

Expected **after**: four files green, six new cases.

**Prove every case in both directions** (apply, run, revert — one at a time):

1. `docs/design-system.md`: restore “those eight”/“those four” to the old counts
   → case 5 fails.
2. `docs/design-system.md`: change either floor figure in the `border` bullet →
   case 2 fails.
3. `docs/design-system.md`: drop “(4.5:1 at high contrast)” from the
   `borderStrong` bullet → case 3 fails.
4. `docs/tokens.md`: restore the six-fill introduction → cases 4, 5 and 6 fail.
5. `docs/tokens.md`: change “the eight fills” or the Verification floor figure →
   case 5 or case 2 fails.
6. `packages/tokens/README.md`: change either floor figure → case 2 fails;
   delete `` `accentActive` `` → case 4 fails.
7. `contrast.ts`: add a ninth role to `controlFillRoles` → cases 1, 2? and 4–5
   fail (the pages must state the new count and name it); remove
   `accentActive` from it → case 4 fails, proving the expected list is derived
   and not restated.
8. `contrastFloors`: raise `default.divider` to `1.06` → cases 1 and 2 fail.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: **219** test files and **7127** tests green (218 / 7121 before; six
cases added). No native scenario changes, so no smoke scenario is run for this
plan.

## 9. STOP conditions

- Stop if a colour, role, pair, floor, metric or shipped theme has to move. Every
  stated figure is already correct; this plan adds an owner, not a value.
- Stop if `docs.test.ts` fails on a sentence this plan does not edit. Read the
  failure; if a neighbouring guard reconstructs the old wording, update that
  guard once in the corrected form — do not tune the new prose to an old test.
- Do not add a count to a passage that reads better without one, and do not
  restate `controlFillRoles` in the test as a literal array.
- Do not export a new symbol and do not change `contrastFloors`,
  `controlFillRoles` or `contrastPairs`.
- Do not delete or loosen the two existing `docs.test.ts` border cases.
- No cast, `any`, or name-based lookup where a derived list exists.

## 10. Acceptance

- The catalogue's role introduction names all eight control fills and its owner;
  §7 states both floors of both border roles.
- `border-role-claims.test.ts` derives the four floor figures, the two count
  words and the four enumerations from `contrastFloors`, `controlFillRoles` and
  `statusTones`, and each case fails under its §8 mutation.
- `nub run --filter @gpuixui/tokens test` is green (219 files, 7127 tests),
  `nub run check` and `nub run lint` clean.
- `TODO.md` ticks the row and keeps the section counter current; the plan index
  lists `815`; the *Theme contrast check* row in `COMPONENTS.md` names the new
  owner.

## 11. Execution record

Executed on 2026-10-21 on `agent/tokens-theme`.

- The defect reproduced as §1 states, before any edit: each of the eleven prose
  mutations in the table left **219 files / 7121 tests** green; only the two
  mutations on lists another plan already owns (the Verification enumeration and
  the README's soft-fill count) failed. `docs.test.ts` holds §7's enumerations
  and the `borderStrong` surfaces, which is why the counts and the floors slipped
  through.
- Step 1 and step 2 landed as specified: the catalogue's role introduction names
  the `accent`/`accentHover`/`accentActive` fills of an outline toggle and its
  `controlFillRoles` owner, and §7's `borderStrong` bullet states
  `(4.5:1 at high contrast)` beside its default.
- `border-role-claims.test.ts` adds six cases. Its slices are
  `catalogueIntro`, `catalogueVerify`, `designBorder`, `designStrong` and
  `readmeBorder`; the four figures come from `contrastFloors`, the two count
  words from `controlFillRoles` and `statusTones`, and the four enumerations from
  `controlFillRoles`. Before step 1 the suite failed on the six-fill sentence and
  the missing count (cases 4–6).
- Every §8 mutation was applied alone, the new suite run, and the tree restored:
  reverting the introduction (cases 4–6), dropping the boundary floors (case 3),
  `eight`→`nine` and `four`→`five` (case 5), the divider's default and
  high-contrast figures in the design system (case 2), the catalogue's figure and
  count (cases 2 and 5), the README's figure and a removed `accentActive` (cases 2
  and 4), adding `input` to `controlFillRoles` (cases 1, 4, 5), removing
  `accentActive` from it (cases 1 and 4) and moving `contrastFloors.default.divider`
  to 1.06 (cases 1 and 2). Every mutation failed, and the restored tree passed.
- `nub run --filter @gpuixui/tokens test` → **219 files / 7127 tests** green;
  `nub run check` and `nub run lint` clean.
- No native scenario was run: the change is prose and a source-reading suite, and
  no runtime paints a sentence.

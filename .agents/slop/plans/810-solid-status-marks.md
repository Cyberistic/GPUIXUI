# 810 — The solid status roles are described as fills, and three of them are marks

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `014`, `057`,
`083`, `090`, `306`, `332`, `340`, `341`, `347`, `394`, `399`, `503`, `609`,
`619`, `651`, `679`, `698`, `733`, `749`, `806`.

## 1. The defect

Every present-tense description of the solid status roles says the same thing:
they are **fills**, and a dot is something else.

- `docs/design-system.md` §3, the paragraph that defines the four status
  families:

  ```
  The solid roles are fills: light `warning` is 1.78:1 against the canvas, so it
  is never the colour of text or a dot.
  ```

- `docs/tokens.md`, *Status tones*:

  ```
  The solid roles are fills, not foregrounds.
  ```

  and, in the same section's role summary, the families "each have three
  tonalities … a solid fill with a readable foreground on it, a soft pair … and
  a text role (`xText`) for status labels, icons and indicator dots".

- `packages/tokens/src/color.ts`: `ThemeColors.destructive` is "Destructive
  action background." and `ThemeColors.success` is "Success background and
  indicator."

- The colour role table's rows: `| \`success\` | … | success |` and
  `| \`destructive\` | … | destructive action, and the invalid field edge |`,
  in both the default and the high-contrast table.

The contract says something else. Derived on this tree from `contrastPairs`
(`nub exec vitest run` probe, deleted again), in `contrastPairClasses` order —
the role on either side of the pair, so the on-colour label and the designed
`destructiveHover` → `destructive` step are counted too:

```
success      secondary:1  mark:5   surface:9
destructive  secondary:1  boundary:14  mark:6  surface:10  step:1
info         secondary:1  surface:9
warning      secondary:1  surface:9
```

`markRoles` is `["primary", "success", "destructive"]`; `markPairs` and
`trackMarkPairs` hold those three on

```
primary      background card popover muted input hover selected selectedActive track   (9)
success      background card popover muted track                                        (5)
destructive  background card popover muted input track                                  (6)
```

and the shipped primitives paint exactly that: `Progress` fills with
`primary`/`success`/`destructive` (`progressTones`, `primitives/src/core/style.ts`),
`Slider` fills and rings its thumb with `primary`/`destructive`,
`Rating` colours a filled star with `primary`, and `Timeline`'s current dot is
`primary`. Plan `332` added the class for exactly those compositions and plan
`806` documented the same split for `primary`; the status roles were never
corrected, so the pages still tell a reader that the solid status roles are
never a dot.

`destructive` has a third job the descriptions also omit: it is the **invalid
boundary**. Twelve ring pairs (`invalidRingPairs`) plus the field's own error
edge on `input` and `background` hold it at the boundary floor, and
`invalidFocusRing(theme)` is the only focus indicator an invalid control can
paint because the runtime draws one shadow. A reader copying the palette is told
"destructive action, and the invalid field edge" — the edge is two of fourteen
pairs, and the ring, the reason a failed field is visible at all, is not named
in any role description.

Both wrong sentences are **guarded by `docs.test.ts`**: the case at
*quotes the status ratios the light palette produces* reconstructs
"The solid roles are fills, not foregrounds. …", and the case at *quotes the
warning figure the design system repeats* reconstructs
"The solid roles are fills: light `warning` is …". The suite therefore enforces
the overgeneralisation, which is why every later plan preserved it.

Why it matters rather than being pedantic:

- A reader who trusts "never the colour of … a dot" has no reason to check the
  mark floor before painting a progress segment, a slider fill or thumb ring, a
  rating star or a timeline dot — the compositions the shipped primitives
  already paint. On a copied palette those are the pixels that vanish first: a
  fill tuned as a background is one ramp step from its own panel.
- `warning` is the one family where the sentence is true (1.78:1 on the
  canvas), and the blanket statement makes the *reason* disappear: the reader
  cannot tell that `warning` is fill-only because it misses the floor while
  `success` at 4.26:1 clears it. The contract encodes exactly that difference.
- The invalid ring is the error state's only visible signal when a field is
  focused. A role description that calls `destructive` "a background" invites a
  palette edit that clears the fill pair and erases the ring.
- This is the class plans `747`, `749`, `750`, `757`, `781` and `806` closed for
  the disabled fill, the placeholder, the tint, three platform headers and
  `primary`: a role description that undercounts its measurement obligations.

## 2. What the contract measures today

Derived on this tree with the package's own lists:

```
markPairs, by role
  primary      9  background card popover muted input hover selected selectedActive
                  (plus track from trackMarkPairs)
  success      4  background card popover muted
                  (plus track)
  destructive  5  background card popover muted input
                  (plus track)
  primaryText  1  input          the native caret, ink not a fill (plan 563)

boundary pairs whose role is `destructive`
  invalidRingPairs        12  card popover muted accent hover active selected
                              selectedActive infoSoft successSoft warningSoft
                              destructiveSoft
  invalid field edge       2  input background
  ────────────────────────────
  total                   14

floors
  mark  default 3     high 4.5
  boundary default 3  high 4.5
  surface default 1.05 high 1.05
```

`warning` and `info` have no `mark` and no `boundary` pair; all four carry the
`secondary` on-colour label pair, and `destructive` alone carries the
`destructiveHover` → `destructive` `step`. The light `warning` fill measures
1.78:1 on `background` and 1.89:1 on `card`; the light `success` fill measures
4.26:1 on `background`, under the 4.5:1 text floor and above the 3:1 mark floor.
Those two figures are the whole reason the split is not uniform, and both are
already derived by `docs.test.ts`.

No colour, pair, floor, metric, role or shipped theme moves. The plan owns
sentences and a guard.

## 3. Decision

1. State the split precisely in the four places a reader learns what a status
   role is: the design system's status paragraph, the catalogue's status
   section, the role's JSDoc, and the role table rows. The rule is:
   **every solid status role is a surface; `primary`, `success` and
   `destructive` are also marks; `warning` and `info` are fill-only;
   `destructive` is also the invalid boundary.** Labels, icons and *status*
   dots on a plain surface or row wash stay `xText` — that half was always
   right and is stated beside the correction.
2. Update the two `docs.test.ts` cases that reconstruct the old sentences, so
   the suite stops enforcing the overgeneralisation.
3. Add `packages/tokens/src/solid-role-claims.test.ts`, which derives the
   classes, mark surfaces and boundary surfaces from `contrastPairs`,
   `markPairs`, `trackMarkPairs` and `invalidRingPairs`, and holds every
   sentence to them — in both directions, so a role added to the mark list
   without its description also fails.
4. Correct the header of `status-solid.test.ts`, which repeats the blanket
   claim ("a status dot or label is `xText`, never the solid fill") in the suite
   that owns the class boundary.

No token value moves. `markRoles`, `markPairs`, `trackMarkPairs`,
`invalidRingPairs` and `contrastFloors` are the owners; the documents derive
from them.

## 4. Files to change

1. `docs/design-system.md` — §3's last sentence.
2. `docs/tokens.md` — the status section's role summary and the
   *The solid roles are fills* paragraph; the `success` and `destructive` rows
   in both colour tables.
3. `packages/tokens/src/color.ts` — the `success`, `warning`, `info` and
   `destructive` `ThemeColors` JSDoc.
4. `packages/tokens/src/docs.test.ts` — the two cases that reconstruct the old
   sentences.
5. `packages/tokens/src/status-solid.test.ts` — the header's blanket claim.
6. **create** `packages/tokens/src/solid-role-claims.test.ts`.
7. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.
8. `TODO.md` — a ticked row, and the section counter.

No other file changes.

## 5. Step 1 — `docs/design-system.md` §3

Replace the last sentence of the status paragraph:

```
The solid roles are fills: light `warning` is 1.78:1 against the
canvas, so it is never the colour of text or a dot.
```

with

```
The solid roles are surfaces, and three of them are also marks: light `warning`
is 1.78:1 against the canvas, under the 3:1 mark floor, so `warning` and `info`
are fill-only and a status label, icon or dot on a plain surface is `xText`;
`primary`, `success` and `destructive` also paint a progress segment, a slider
fill or thumb ring, a rating star and a timeline dot, so they are held to the
mark floor on the surfaces `markPairs` and `trackMarkPairs` name. `destructive`
is also the invalid boundary — a failed field's edge and the ring it is focused
with (`invalidRingPairs`) — held to the same floor.
```

The paragraph now names `markPairs`, `trackMarkPairs` and `invalidRingPairs`,
which is what the new suite asserts. Nothing else in §3 changes.

## 6. Step 2 — `docs/tokens.md`

### 6a. The status section's role summary

In the paragraph beginning "There are 71 roles.", after

```
a text role (`xText`)
for status labels, icons and indicator dots drawn on `background`, `card` or
`popover`.
```

insert

```
The solid role's third job is the value indicator: `primary`, `success` and
`destructive` are measured as marks too — a progress segment, a slider fill or
thumb ring, a rating star and a timeline dot paint them — and `destructive` is
also the invalid boundary, the field's error edge and the ring an invalid
control is focused with (`invalidRingPairs`). `warning` and `info` are fill-only:
light `warning` is 1.78:1 on the canvas, under the 3:1 mark floor.
```

Keep `xText` described as the role for labels, icons and *status* dots; the
distinction between a status dot (`xText`) and a value-indicator mark (the solid
role) is the point of the correction.

### 6b. The paragraph that states the rule

Replace

```
The solid roles are fills, not foregrounds. Light `warning` (`#F5B01F`) is
1.78:1 against `background` and 1.89:1 against `card`, under the 3:1 non-text
floor, and light `success` is 4.26:1, under the 4.5:1 text floor.
```

with

```
The solid roles are fills and marks, never foregrounds. Light `warning`
(`#F5B01F`) is 1.78:1 against `background` and 1.89:1 against `card`, under the
3:1 mark floor, so `warning` and `info` carry no mark pair; light `success` is
4.26:1, under the 4.5:1 text floor and above the mark floor, so it joins
`primary` and `destructive` as a mark: a progress segment, a slider fill or thumb
ring, a rating star and a timeline dot paint those three at 3:1, 4.5:1 at AAA,
on the surfaces `markPairs` and `trackMarkPairs` name. `destructive` is also the
invalid boundary: the field's error edge and the ring an invalid control paints,
its only focus indicator, held to the same floor on every surface
`invalidRingPairs` names.
```

The rest of the paragraph (`xText`'s surfaces, the regression figures) is
unchanged.

### 6c. The colour table rows, in both tables

Default table and high-contrast table, identical wording:

```
| `success` | … | success fill; also the mark a progress segment, slider fill or thumb ring, rating star and timeline dot paint, at the mark floor |
| `destructive` | … | destructive action, the invalid field edge and the invalid control's focus ring; also the mark a progress segment, slider fill or thumb ring, rating star and timeline dot paint, at the mark floor |
```

Only the *Use* cell changes; the three value cells must stay byte-identical (the
palette rows are guarded by `color.test.ts` and `docs.test.ts`).

Leave the `info` and `warning` rows as they are: they are fill-only and the new
suite asserts they do **not** claim a mark.

## 7. Step 3 — `packages/tokens/src/color.ts`

`destructive`:

```ts
/**
 * Destructive action background. Also a **mark** — a progress segment, a slider
 * fill or thumb ring, a rating star and a timeline dot paint it — and the
 * invalid **boundary**: a failed field's edge and the ring an invalid control
 * is focused with, the only focus indicator the runtime can draw. Measured as a
 * fill (`statusFillPairs`), a mark (`markPairs`, `trackMarkPairs`) and a
 * boundary (`invalidRingPairs` and the field's own edge), so a copied palette is
 * held at 1.05:1, 3:1 and 3:1 (4.5:1 at AAA).
 */
readonly destructive: string;
```

`success`:

```ts
/**
 * Success background, and the mark a progress segment, a slider fill or thumb
 * ring, a rating star and a timeline dot paint (`markPairs`, `trackMarkPairs`).
 * `successText` is the readable role for a label, icon or status dot on a plain
 * surface.
 */
readonly success: string;
```

`warning`:

```ts
/**
 * Warning background. A fill only: light `warning` is 1.78:1 on the canvas,
 * under the mark floor, so a label, icon or status dot is `warningText`.
 */
readonly warning: string;
```

`info`:

```ts
/**
 * Informational status fill, distinct from `primary`. A fill only; a label,
 * icon or status dot is `infoText`.
 */
readonly info: string;
```

No other JSDoc in the interface changes.

## 8. Step 4 — `packages/tokens/src/docs.test.ts`

Two cases change; both currently *reconstruct the wrong sentence*, so they must
be rewritten rather than deleted, or the suite keeps teaching the old rule.

### 8a. *quotes the status ratios the light palette produces*

Keep the derived warning ratios and the `success` ratio; change the surrounding
words to the corrected rule and stop before the mark-role sentence (the new
suite owns that half):

```ts
const sentence =
  "The solid roles are fills and marks, never foregrounds. " +
  `Light \`warning\` (\`${light.warning}\`) is ` +
  `${contrastRatio(light.warning, light.background).toFixed(2)}:1 against \`background\` and ` +
  `${contrastRatio(light.warning, light.card).toFixed(2)}:1 against \`card\`, under the ` +
  `${contrastFloors.default.mark}:1 mark floor, so \`warning\` and \`info\` carry no mark pair; ` +
  `light \`success\` is ` +
  `${contrastRatio(light.success, light.background).toFixed(2)}:1, under the ` +
  `${contrastFloors.default.secondary}:1 text floor and above the mark floor,`;
```

`contrastFloors.default.mark` replaces `boundary`; the *derived* figures and the
`secondary` floor are unchanged.

### 8b. *quotes the warning figure the design system repeats*

```ts
const sentence =
  `The solid roles are surfaces, and three of them are also marks: light \`warning\` is ` +
  `${contrastRatio(light.warning, light.background).toFixed(2)}:1 against the canvas, under the ` +
  `${contrastFloors.default.mark}:1 mark floor, so \`warning\` and \`info\` are fill-only`;
expect(designSystem.includes(sentence), sentence).toBe(true);
```

Both cases keep asserting a *derived* figure; neither hand-types a ratio.

## 9. Step 5 — `packages/tokens/src/status-solid.test.ts`

The header currently says:

```
 * The mark is a different class (plan 332): a status dot or label is `xText`,
 * never the solid fill, because the light `warning` fill is 1.78:1 on the canvas
 * — under the 3:1 a mark needs.
```

Replace it with:

```
 * The mark is a different class (plan 332): a *status* dot or label is `xText`,
 * never the solid fill, because the light `warning` fill is 1.78:1 on the canvas
 * — under the 3:1 a mark needs. Three of the four solid roles are nevertheless
 * marks: `Progress`, `Slider`, `Rating` and `Timeline` paint `primary`,
 * `success` and `destructive` as a progress segment, a fill or thumb ring, a
 * star and a dot, and `solid-role-claims.test.ts` holds every sentence that
 * describes them to `markPairs`/`trackMarkPairs`. `warning` and `info` are the
 * two fill-only families.
```

No assertion in that file changes.

## 10. Step 6 — `packages/tokens/src/solid-role-claims.test.ts`

Header states the bug: every present-tense description of the solid status
roles said they are fills and never a dot, while the contract measures
`success` as five marks and `destructive` as six marks and fourteen boundary
pairs; the two sentences were guarded by `docs.test.ts`, so the suite enforced
the wrong rule.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `contrastFloors`, `contrastPairClasses`, `contrastPairs`,
`invalidRingPairs`, `markPairs`, `markRoles`, `statusTones`,
`trackMarkPairs` from `./index.js`.

Helpers (copy the shapes from `primary-mark-claims.test.ts`, plan 806):

- `prose(url)` — a document as one line.
- `between(text, start, end)` — the slice between two visible markers.
- `classesOf(role)` — `contrastPairClasses.filter((pairClass) =>
  contrastPairs.some(([foreground, background, measured]) => measured ===
  pairClass && (foreground === role || background === role)))`.
- `markSurfacesOf(role)` — the union of `markPairs`' `mark` surfaces for the
  role and `trackMarkPairs`' surfaces for it, in list order.
- `boundarySurfacesOf(role)` — `contrastPairs` with class `boundary` and the
  role on either side, its surfaces in list order.

Constants: `catalogue`, `designSystem`, `readme`, `typeSource` (via `prose`),
and `rawCatalogue` (unwrapped, for table rows).

Cases:

1. **the contract's classes** —
   ```ts
   expect(classesOf("success")).toEqual(["secondary", "mark", "surface"]);
   expect(classesOf("destructive")).toEqual([
     "secondary", "boundary", "mark", "surface", "step",
   ]);
   expect(classesOf("warning")).toEqual(["secondary", "surface"]);
   expect(classesOf("info")).toEqual(["secondary", "surface"]);
   expect([...markRoles]).toEqual(["primary", "success", "destructive"]);
   ```
   The `secondary` pair is each family's on-colour label and the `step` pair is
   `destructiveHover` → `destructive`, which is why the classification is read
   from both sides of `contrastPairs` rather than the foreground alone.
2. **the mark surfaces are the five and the six** —
   `markSurfacesOf("success")` equals
   `["background","card","popover","muted","track"]`;
   `markSurfacesOf("destructive")` equals
   `["background","card","popover","muted","input","track"]`;
   `markSurfacesOf("warning")` and `markSurfacesOf("info")` are `[]`.
3. **the boundary is the twelve rings and the two field edges** —
   `boundarySurfacesOf("destructive")` equals the twelve
   `invalidRingPairs` surfaces followed by `["input","background"]`; assert the
   ring list length is `12` and the derived total `14`, both from the lists, and
   that `invalidRingPairs` only carries `boundary`.
4. **the design system names the split** — the §3 paragraph, sliced from
   "The four status families" to the blank line before "This keeps a brand theme
   small:", contains `markPairs`, `trackMarkPairs`, `invalidRingPairs`, the
   words "fill-only", the three mark roles and no occurrence of
   "never the colour of text or a dot".
5. **the catalogue's role summary names the mark job and the boundary** — the
   paragraph from "There are 71 roles." to "A status panel's action is a family
   of its own:" contains the mark lists, the four compositions ("progress
   segment", "slider fill", "rating star", "timeline dot"), the derived mark
   floor (`\`${contrastFloors.default.mark}:1\``), `invalidRingPairs`, and the
   phrase "the invalid boundary".
6. **the catalogue's rule paragraph names the mark surfaces and floors** — the
   paragraph from "The solid roles are fills and marks, never foregrounds." to
   the next paragraph, contains the mark floor and the high mark floor, the four
   compositions, the two fill-only families, and both mark lists. Every mark
   surface of `success` and `destructive` is named in the surrounding status
   section (the paragraph set from "There are 71 roles." to "A status panel's
   action is a family of its own:"), so a surface added to `markPairs` fails
   here instead of shipping undescribed.
7. **the role rows: mark roles claim a mark, fill-only roles do not** — for each
   table (`rawCatalogue.split("\n")`), find the `success` and `destructive`
   rows (there must be two of each) and assert each contains "mark" and the
   composition list; find the `info` and `warning` rows (two of each) and assert
   none contains "mark". This is the bidirectional half: plan `806`'s rows and
   this one cannot drift in either direction.
8. **the JSDoc carries the same three jobs** — `typeSource` slices:
   - from "Destructive action background." to "Destructive action background
     while hovered." contains `markPairs`, `trackMarkPairs`, `invalidRingPairs`
     and "invalid";
   - from "Success background," to "Text and icons on `success`." contains
     `markPairs` and `trackMarkPairs`;
   - from "Warning background." to "Text and icons on `warning`." contains
     "fill only" and `warningText`;
   - from "Informational status fill" to "Text and icons on `info`." contains
     "fill only" and `infoText`.
   The slice markers are the neighbours, so the assertions cannot leak into the
   next role's comment.
9. **the pre-plan claim is detected and is gone** — a predicate
   ```ts
   const claimsSolidsAreFillOnly = (text: string): boolean =>
     /The solid roles are fills, not foregrounds\./.test(text) ||
     /The solid roles are fills: light `warning`/.test(text);
   ```
   returns `true` for both historical sentences verbatim and `false` for
   `catalogue`, `designSystem` and `readme`; this proves the guard can fail on
   the exact text it exists to reject.

Deliberately **not** asserted here: the two ratios (owned by `docs.test.ts`),
the mark floor value itself (owned by `contrastFloors`), and any tightest
shipped figure (no sentence quotes one). No case imports `shippedThemes`, so the
case titles avoid "every shipped set".

## 11. Test plan

From `packages/tokens`:

```sh
nub exec vitest run src/solid-role-claims.test.ts src/docs.test.ts src/status-solid.test.ts src/primary-mark-claims.test.ts
```

Expected: the new suite green (nine cases); `docs.test.ts` green after the two
rewritten sentences; `status-solid.test.ts` and `primary-mark-claims.test.ts`
unchanged and green.

**Prove every case can fail** (apply, run, revert — one at a time):

1. `docs/design-system.md`: put the old sentence back → case 4 fails (and
   `docs.test.ts` 8b fails).
2. `docs/tokens.md`: delete `invalidRingPairs` from the rule paragraph → case 6
   fails.
3. `docs/tokens.md`: change the `success` row's "mark" to "fill" → case 7
   fails.
4. `docs/tokens.md`: add "mark" to the `warning` row → case 7 fails.
5. `color.ts`: replace the `destructive` JSDoc with "Destructive action
   background." → case 8 fails.
6. Simulate a contract change inside the test: temporarily assert
   `classesOf("warning")` equals `["mark","surface"]` → case 1 fails, which
   proves the expectation is read from `contrastPairs` rather than restated.
7. `markPairs`/`trackMarkPairs` are the only sources for case 2: temporarily
   change `markSurfacesOf` to read `statusFillPairs` → case 2 fails.
8. Put the old design-system sentence back and run only case 9's predicate
   target: case 9 stays green by construction (the predicate matches history),
   which is why 4 must be the case that fails — confirm the pair, then revert.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: **217** files and **7116** tests green (216 / 7107 before; nine cases
added); `check` and `lint` clean. No native scenario changes, so no smoke
scenario is run for this plan.

## 12. STOP conditions

- Stop if a colour, role, pair, floor, metric or shipped theme has to move. This
  plan states what the tree already ships.
- Stop if `docs.test.ts` fails **because a different case** reads one of the
  reworded sentences. Rewrite the sentence once, in the corrected form, and
  record the extra case; do not tune a guard to keep the old wording.
- Do not change the `info` or `warning` role rows: they are fill-only, and case
  7 exists to keep them that way.
- Do not add a new role, pair list or floor. `markPairs`, `trackMarkPairs`,
  `invalidRingPairs` and `contrastFloors` are the owners.
- Do not quote a shipped ratio in the new paragraphs: no sentence needs one, and
  a ratio would need a `documentedFigures` entry (plan 717) rather than a
  hand-typed number.
- No cast, `any`, or name-based lookup where a derived list exists.

## 13. Acceptance

- The design system, the catalogue's two paragraphs and the four role JSDoc
  blocks state the split: every solid status role is a surface, `primary`,
  `success` and `destructive` are marks, `warning` and `info` are fill-only, and
  `destructive` is the invalid boundary.
- Both colour tables' `success` and `destructive` rows name the mark job; their
  `info` and `warning` rows do not.
- `docs.test.ts` no longer reconstructs either old sentence.
- `solid-role-claims.test.ts` derives every class, surface and the ring/edge
  split from the published lists, and each of its cases fails under its §11
  mutation.
- `nub run --filter @gpuixui/tokens test` is green (217 files, 7116 tests),
  `nub run check` and `nub run lint` clean.
- `TODO.md` ticks the row; the plan index lists `810`.

## 14. Execution record

Executed on 2026-10-20 on `agent/tokens-theme`.

- The classification derived with both sides of `contrastPairs` as §1 now states:
  `success` is `secondary`/`mark`/`surface`, `destructive` adds `boundary` and
  `step`, and `warning`/`info` are `secondary`/`surface` only. The first probe
  read the foreground alone and therefore missed the on-colour label and the
  designed destructive step; the plan's first draft recorded that narrower view
  and was corrected before the suite landed.
- `markSurfacesOf` derived `success` as `background`/`card`/`popover`/`muted`/
  `track` and `destructive` as the same plus `input`. `invalidRingPairs` derived
  twelve rings, and the two field edges (`input`, `background`) complete the
  fourteen boundary surfaces.
- `nub exec vitest run src/solid-role-claims.test.ts src/docs.test.ts
  src/status-solid.test.ts src/primary-mark-claims.test.ts` → four files, 249
  tests green; nine new cases.
- The mutations of §11 each failed the suite and the tree was restored green
  after every one, including the two-directional ones: dropping the mark from
  the `success` row, adding a mark claim to the `warning` row, deleting
  `invalidRingPairs` from either catalogue paragraph, restoring the old design
  system sentence, collapsing the `destructive` JSDoc, adding
  `["success","hover","mark"]` to `markPairs` (which proves the surface lists
  are read from the contract, not restated), and restoring the pre-plan
  predicate's targets.
- One guard was strengthened during execution: the role-row case first asserted
  `toContain("mark")`, which the row's own trailing "at the mark floor" already
  satisfied, so replacing "the mark a progress segment" with "the fill a
  progress segment" passed. It now asserts the whole phrase and the mark floor.
- `nub run --filter @gpuixui/tokens test` → **217 files / 7116 tests** green;
  `nub run check` (check-tests, lint, fmt, type-check) clean.
- No native scenario was run: the change is prose, JSDoc and a source-reading
  suite, none of which the runtime paints.

# Plan 555 — The border rationale names five of the thirteen boundary surfaces, and prints one rule twice

**Workstream:** `tokens-theme`
**Phase:** F (documentation truth for the contract)
**Depends on:** 080 (the divider on control fills), 084 (the functional boundary
on panels and washes), 300 (the soft status panel), 318 (the neutral press
edge), 327 (`accentHover`/`accentActive`), 352 (the boundary row derives its
surfaces), 550 (the strong-over-thin rule)
**Status:** ready

## 1. Why

`docs/design-system.md` §7 is the rationale a component author reads before
choosing a border role. Two claims in it drifted from the contract that
enforces them.

**1.1 The duplicates.** Plan 550 added the strong-over-thin rule to the
`borderStrong` bullet by inserting the paragraph, and the insertion landed
twice. The page prints the same eleven-line sentence pair verbatim:

```
The numeric contract holds `borderWidth.strong` at least `thin`: the focus
ring may match the default border but never be thinner than a divider, or the
only focus indicator is less prominent than the decoration it surrounds.
The numeric contract holds `borderWidth.strong` at least `thin`: …
```

A rule a reader is told twice is a rule the page was edited by copy-paste; it
also hides whether the second copy was meant to say something else.

**1.2 The omissions.** The two bullets are the page's surface lists, and both
are shorter than the pair lists the checker enforces:

- The `border` bullet names the fills a bordered control paints as
  `secondary`, `secondaryHover`, `secondaryActive`, `hover`, `active` and
  `accent`. `controlFillPairs` — the divider pairs in `contrast.ts` — also
  measure `accentHover` and `accentActive`, the two steps an outline toggle
  presses through (plan 327). §8 and the §9 floor table name all eight; §7
  names six, so the rationale reads as if the toggle has no pointer state.
- The `borderStrong` bullet names five of the thirteen surfaces `contrastPairs`
  measures by role — `muted`, `hover`, `active`, `accent` and `selected`. It
  writes the canvas as "canvas" rather than `background`, omits a `card`, a
  `popover` and the `input` fill a field paints (plans 084 and 343), and
  describes the four soft status fills generically instead of naming
  `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft` (plan 300). A
  sentence that exists to justify the boundary names five of its thirteen
  surfaces.

The cause is the one plans 547–549 and 552–554 removed from code: the list has
no owner, so prose and contract are edited apart. `controlFillRoles` already
exists in `contrast.ts` as the owner of the eight control fills — it is simply
module-private, so no test can read it and the page cannot name it.

The bug is documentation-only: no colour, pair, floor, metric or shipped theme
is wrong. The failure mode is a reader who trusts §7 and paints the shortcut.

## 2. What changes

### 2.1 `packages/tokens/src/contrast.ts` — export the owner

Change

```ts
const controlFillRoles = [
```

to

```ts
export const controlFillRoles = [
```

and extend the JSDoc above it with one sentence:

> Exported as the ordered owner of the list, so the reference states the eight
> fills a bordered control paints instead of retyping a subset of them.

Do not add a `controlFillPairs` export: the pair list derives from
`controlFillRoles` already, and plan 546's uniqueness inventory is keyed by the
`*Pairs` exports — exporting another would open an inventory row this plan does
not need.

### 2.2 `docs/design-system.md` §7 — the `border` bullet

Replace the sentence fragment

```
  and the `accent` for an outline toggle that is on — so the floor covers
  those fills as well,
```

with

```
  and the `accent`, `accentHover` and `accentActive` fills of an outline toggle
  that is on (`controlFillRoles`) — so the floor covers those eight fills as
  well,
```

Keep the rest of the bullet (the soft status fill clause and the `xSoftBorder`
distinction) unchanged.

### 2.3 `docs/design-system.md` §7 — the `borderStrong` bullet

Replace

```
  It meets 3:1
  against the canvas, the `muted` panel, the `hover`/`active`/`accent`/
  `selected` washes a row paints and the four soft status fills a tone-tinted
  Alert paints, so a checkbox or field is perceivable without relying on fill alone.
```

with

```
  It meets 3:1
  against the `background` canvas, a `card`, a `popover`, the `input` fill a
  field paints, the `muted` panel, the `hover`/`active`/`accent`/`selected`
  washes a row paints and the `infoSoft`/`successSoft`/`warningSoft`/
  `destructiveSoft` fills a tone-tinted Alert paints, so a checkbox or field is
  perceivable without relying on fill alone.
```

### 2.4 `docs/design-system.md` §7 — delete the second copy of the rule

Remove the second occurrence of the three-line strong-over-thin sentence pair,
leaving exactly one. Both copies are byte-identical after whitespace
normalisation; delete either, then confirm the paragraph reads once.

### 2.5 `docs/tokens.md` — name the new value

The catalogue promises that every exported value is named. In the contrast
section's decorative-divider sentence (the one that lists
`secondary`/`secondaryHover`/`secondaryActive`/`hover`/`active`/`accent`/
`accentHover`/`accentActive`), add the owner beside the list:

> … `accent`, `accentHover` and `accentActive` fills a bordered control paints
> (`controlFillRoles`), …

Do not restate the eight names a second time; the existing list already owns
them.

### 2.6 `packages/tokens/src/docs.test.ts` — hold §7 to the contract

Import `controlFillRoles` from `./contrast.js` (the module already imports
`contrastPairs`, `contrastFloors`, `stateFillRoles` and the other lists). Add a
new describe after the existing `docs/design-system.md` block:

```ts
/**
 * The bug these cases catch: §7's two border bullets are the page's surface
 * lists, and both had drifted from the pair lists the checker enforces. The
 * `border` bullet named six of the eight fills `controlFillPairs` measures —
 * `accentHover` and `accentActive`, the toggle's pointer steps, were missing —
 * and the `borderStrong` bullet named five of the thirteen surfaces by role:
 * it wrote the canvas as "canvas", omitted a card, a popover and the `input`
 * fill, and described the four soft fills generically. The plan-550 edit also
 * printed the strong-over-thin rule twice. A reader trusting §7 would paint the
 * shortcut.
 */
describe("docs/design-system.md border roles", () => {
  const normalised = designSystem.replaceAll(/\s+/g, " ");
  const slice = (start: string, end: string): string => {
    const from = normalised.indexOf(start);
    const to = normalised.indexOf(end, from);
    if (from === -1 || to === -1) {
      throw new Error(`docs/design-system.md has no §7 slice ${start}`);
    }
    return normalised.slice(from, to);
  };

  it("names every fill a bordered control paints", () => {
    const bullet = slice(
      "- `border` is decorative",
      "- `borderStrong` is functional",
    );
    controlFillRoles.forEach((role) => {
      expect(
        contrastPairs,
        `${role} is a measured control fill`,
      ).toContainEqual(["border", role, "divider"]);
      expect(bullet, role).toContain(`\`${role}\``);
    });
  });

  it("names every surface the functional boundary is measured on", () => {
    const bullet = slice(
      "- `borderStrong` is functional",
      "\n\nElevation is a semantic level",
    );
    const surfaces = contrastPairs
      .flatMap(([foreground, background, pairClass]) =>
        foreground === "borderStrong" && pairClass === "boundary"
          ? [background]
          : [],
      )
      .filter((surface, index, all) => all.indexOf(surface) === index);

    expect(surfaces.length).toBeGreaterThan(0);
    surfaces.forEach((surface) => {
      expect(bullet, surface).toContain(`\`${surface}\``);
    });
  });

  it("states the strong-over-thin rule once", () => {
    const rule =
      "The numeric contract holds `borderWidth.strong` at least `thin`";
    expect(normalised.split(rule).length - 1).toBe(1);
  });
});
```

`\n\nElevation is a semantic level` is the end of the `borderStrong` bullet:
§7 closes it with a blank line before the elevation paragraph. Confirm the
slice is non-empty in the first run; if the heading moved, STOP rather than
inventing a new anchor.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS — 137 files, 5,681 tests at the time of writing. Stop if red.
2. Add §2.6 **before** §2.1–2.5 and run only the file:
   ```sh
   cd packages/tokens && nub exec vitest run src/docs.test.ts
   ```
   Expected: **FAIL** on all three new cases — the `border` bullet lacks
   `accentHover`/`accentActive`, the `borderStrong` bullet lacks `background`
   as a role, `card`, `popover`, `input` and the four named soft fills, and the
   rule is printed twice. Record the output.
3. Implement §2.1–2.5, then re-run:
   ```sh
   cd packages/tokens && nub exec vitest run src/docs.test.ts
   ```
   Expected: PASS, three new tests.
4. The whole package:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 137 files and three more tests than the baseline (the cases
   are added to the existing `docs.test.ts`, so the file count does not move).
5. The gates:
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: all green.
6. Prove no shipped value moved:
   ```sh
   git diff --stat packages/tokens/src/color.ts packages/tokens/src/scale.ts packages/tokens/src/typography.ts packages/tokens/src/platform-styles packages/tokens/src/metrics.ts packages/tokens/src/contrast.ts
   ```
   Expected: only `contrast.ts` (the export and its JSDoc). No colour, metric,
   platform style or recipe value changes.
7. Documentation indexes:
   - Tick the new `TODO.md` row under "Design tokens and theming"; update the
     progress count to 220 done of 284 (do not quote a count before counting).
   - Add plan 555 to `.agents/slop/plans/README.md` after 554 with status `done`
     and append one commentary paragraph in the voice of 546–554.
8. Commit and push:
   ```sh
   git add -A
   git commit -m "fix(tokens): hold the design system's border rationale to the contract"
   git push origin agent/tokens-theme
   ```

## 4. STOP conditions

Stop and report instead of improvising if:

- the `- \`border\`` or `- \`borderStrong\`` anchor is absent or matches more
  than once after normalisation — the section moved and the plan's slices are
  stale;
- the `borderStrong` derivation yields a surface the §7 bullet legitimately
  should not name, or a new surface appears that the contract does not measure —
  report it, do not widen or narrow the checker;
- `controlFillRoles` cannot be exported without a type change (it is a plain
  `as const` array, so a type error means the file moved);
- exporting `controlFillRoles` breaks the value-coverage case in
  `docs.test.ts` for any reason other than the missing catalogue mention;
- a shipped theme, platform variant or recipe reports a new failure — this plan
  must not change a colour, so any new failure is a real defect outside its
  scope;
- the package was already red before the change for reasons outside this
  workstream.

## 5. Acceptance

- §7 names all eight fills in `controlFillRoles` exactly, and the export is the
  list the test reads; a ninth fill added to the owner fails the case until the
  page names it.
- §7 names every surface `contrastPairs` measures for `borderStrong`, derived
  from the contract rather than retyped.
- The strong-over-thin rule appears once in `docs/design-system.md`.
- `docs/tokens.md` names `controlFillRoles`, so the public-value coverage case
  stays green.
- The three new cases fail on the pre-fix page and pass after it.
- No colour, pair, floor, metric, theme, platform style or recipe value moves.
- `nub run check`, `nub run lint`, `nub run test` pass.

# Plan 500 — the text hierarchy on each surface's own body role

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
059 (`textRoles`), 071 (the contrast contract), 315/319 (typed text and its
surfaces), 371 (colour format), 383 (one total check), 387/388 (the shipped-theme
enumeration), 391/392 (the contrast reference and the text hierarchy), 398 (the
check index).

**Status:** done — 7 hierarchy tests (one new), the full tokens suite 101 files /
5165 tests, and `nub run check`, `nub run lint`, `nub run test` green. Both
directions run: without the three tiers the new case fails; with them it passes.

**Plan number.** `010–019` and the overflow block `050–099` are spent;
`300–399` is spent by this workstream's 300–399 plans; `400–499` belongs to
`docs-site` (it is at 497); `433–435` belong to `components`/`playground`. This
plan therefore opens `500–599` for `tokens-theme` overflow and adds the block to
the number table in `.agents/slop/plans/README.md`.

---

## 1. The measured gap

Plan 392 shipped `textTiers` as three relationships:

```ts
["mutedForeground", "foreground"],
["disabledForeground", "mutedForeground"],
["placeholder", "mutedForeground"],
```

Every tier is compared only on the surfaces where **both** roles have a
documented pair. That works for the canvas, the quiet panel and the row washes —
`foreground` has pairs there. But a card, a menu/dialog and a field paint their
**own** body role, and those roles are never the brighter side of a tier:

| Surface | Body role it paints | Secondary role it paints |
| ------- | ------------------- | ------------------------ |
| `card` | `cardForeground` | `mutedForeground` |
| `popover` | `popoverForeground` | `mutedForeground` |
| `input` | `inputForeground` | `mutedForeground` |

Measured on the built package (`dist`, every shipped identity variant, platform
variant and recipe; probe run for this plan):

```text
identity light   cardForeground   = mutedForeground → themeFailures 0  contrast 0
identity light   popoverForeground = mutedForeground → themeFailures 0  contrast 0
identity light   inputForeground  = mutedForeground → themeFailures 0  contrast 0
high-contrast light, dark halves:                         0              0
```

The floor check cannot see it: identity light's `mutedForeground` measures
**9.671:1** on `card` and on `input`, far above the 7:1 body floor. So a copied
theme can render every menu label and field value at secondary strength while
all five checks return `[]` — the same class of defect plan 392 closed for the
canvas, one body role over.

The design system already says the comparison is "measured on the same surface";
the contract just never compared secondary text with the body role that surface
paints. `selectedForeground` is deliberately **not** a body role: it is a
secondary-strength tint for inherited row labels, and a selected row's title is
painted with `foreground` (plans 312/363). Adding it as a body tier would
demand a step that the design deliberately does not have.

## 2. Decision

Add the three surface body roles to `textTiers` as data, in the same shape as
the existing tiers, and document the rule and its one deliberate omission.

1. **Data, not a condition.** `textTiers` gains
   `["mutedForeground", "cardForeground"]`,
   `["mutedForeground", "popoverForeground"]` and
   `["mutedForeground", "inputForeground"]`. `themeTextTierFailures` does not
   change: it already derives the shared surfaces from `contrastPairs`.
2. **No new pairs, roles, floors or metrics.** The pairs already exist
   (`cardForeground` on `card`, `popoverForeground` on `popover`,
   `inputForeground` on `input` and `inputTextSurfacePairs`), so the check gains
   comparisons without the contract gaining a pair. The pair count and the
   floor table do not move.
3. **The new tiers must pass in every shipped set.** Probe: the tightest is
   **1.274:1** (high-contrast light, on `card`, `popover` and `muted`
   respectively) — above the 1.05:1 step. No colour moves. If any shipped set
   fails, that is a shipped defect: STOP and report with the theme, surface and
   ratio (see §5).
4. **State the omission.** `docs/tokens.md` and `docs/design-system.md` say why
   `selectedForeground` is not a body tier, so the next reader does not "fix"
   the gap by adding it.

Rejected alternatives:

- **Derive the body roles from `contrastPairs`.** A role is not a body role
  because it has a pair; `foreground`, `cardForeground`, `popoverForeground` and
  `inputForeground` are a **design** set (the role each surface paints) and the
  list is the design statement. Deriving it would also pull in
  `secondaryForeground`, `accentForeground` and `selectedForeground`, which are
  deliberately not body roles.
- **Add `selectedForeground` as a tier.** A selected row's inherited label is
  secondary-strength by design and its title is `foreground`; the tier would
  fail every shipped set for a relationship the design does not claim.
- **Fold it into `themeContrastFailures`.** Rejected in plan 392 for the same
  reason: a hierarchy failure carries two ratios and a step, not one pair and a
  floor.
- **Compare the roles' colours directly.** The reader sees both on a surface;
  the hierarchy is the ratio of their ratios there.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

In the `textTiers` JSDoc (currently lines ~963–972), replace the first sentence
so it names the four body roles and add the omission sentence. Target text:

```ts
/**
 * The text tiers the library documents, each held a perceivable step below the
 * tier above it, as `[dimmer, brighter]`: the body role each surface paints —
 * `foreground` on the canvas and the row washes, `cardForeground` on a card,
 * `popoverForeground` on a menu, dialog or toast, `inputForeground` in a field —
 * then secondary text, then the two roles below it, an unavailable label and a
 * field's hint. A tier that is only *at least* as readable as the one above it
 * is not a tier; the reader uses the difference to tell a caption from body copy
 * and a disabled label from an enabled one. `selectedForeground` is not a body
 * role: it is the secondary-strength tint an inherited label keeps inside a
 * selected row, whose title is painted with `foreground`. The step is the same
 * 1.05:1 the filled families and the wash ladder publish, applied to roles a
 * reader compares side by side.
 */
export const textTiers = [
  ["mutedForeground", "foreground"],
  ["mutedForeground", "cardForeground"],
  ["mutedForeground", "popoverForeground"],
  ["mutedForeground", "inputForeground"],
  ["disabledForeground", "mutedForeground"],
  ["placeholder", "mutedForeground"],
] as const satisfies ReadonlyArray<
  readonly [keyof ThemeColors, keyof ThemeColors]
>;
```

No other code changes in this file. `themeTextTierFailures` already derives the
shared surfaces; do not add a surface list.

### 3.2 `packages/tokens/src/text-hierarchy.test.ts`

- Update the header comment: add a paragraph naming plan 500 and the guarded
  bug — a card, menu or field body role set to `mutedForeground` returns `[]`
  from every check because secondary text clears the 7:1 body floor in the
  shipped palette.
- Add one case after "reports a tier raised to body strength through the one
  total call":

```ts
it("reports a surface body role flattened to its secondary text", () => {
  const identity = getTheme("light");
  const bodyRoles = [
    "cardForeground",
    "popoverForeground",
    "inputForeground",
  ] as const;

  bodyRoles.forEach((role) => {
    const flattened = extendTheme(identity, {
      colors: { [role]: identity.colors.mutedForeground },
    });

    // The floors still pass — identity light's secondary text is 9.671:1 on a
    // card and on a field, so the body floor cannot see the inversion.
    expect(themeContrastFailures(flattened), role).toEqual([]);
    expect(themeTextTierFailures(flattened), role).toContainEqual(
      expect.objectContaining({
        dimmer: "mutedForeground",
        brighter: role,
      }),
    );
    expect(
      themeFailures(flattened).some((failure) => failure.kind === "hierarchy"),
      role,
    ).toBe(true);
  });
});
```

The existing "can fail every tier in the published list" loop already covers the
new entries once they are in `textTiers`; do not duplicate it.

### 3.3 `docs/tokens.md`

In `#### Text hierarchy` (lines ~1738–1772):

- Replace "documents three tiers — body copy (`foreground`) …" with the four
  body roles and the three lower tiers. Keep the exact phrases the docs guard
  requires: each tier must appear as `` `dimmer` below `brighter` `` in prose.
- State the shared surface counts from the derivation: the 12 canvas/panel/wash
  surfaces for `mutedForeground` below `foreground`, **one** card for
  `cardForeground`, **four** (`popover`, `hover`, `active`, `selected`) for
  `popoverForeground`, and the **five** surfaces typed text is documented on
  (`muted`, `background`, `card`, `popover`, `input`) for `inputForeground`.
  Verify the counts with the probe in §4 before writing them.
- State each new tier's tightest step: all three are **1.274:1** in
  high-contrast light (`card`, `popover`, and the quiet panel `muted`), above
  the 1.05:1 step.
- Add the omission sentence: "`selectedForeground` is deliberately not a body
  tier: it is the secondary-strength tint an inherited label keeps inside a
  selected row, whose title is `foreground` (plans 312 and 363)."
- Update the final "No shipped value moves" sentence to include the three new
  tiers.

The `docs.test.ts` block "docs/tokens.md text hierarchy" derives each tier's
tightest figure and requires the `**x.xxx:1**` string; quoting 1.274 for each
new tier satisfies it. Do not change the test to relax the derivation.

### 3.4 `docs/design-system.md`

In §9, the paragraph at lines ~523–531 ("Those three relationships are the text
hierarchy"):

- Change "Those three relationships" to name the four body roles and the three
  lower tiers, and say the comparison runs on each surface's own body role.
- Add the `selectedForeground` omission sentence.
- Keep the existing tightest figures and add that the three surface body roles
  clear the same step at 1.274:1.
- Do not add a number the derived docs guard does not produce; if a figure
  changes, quote the derived one and say so.

### 3.5 `packages/tokens/README.md`

In the `themeTextTierFailures` sentence (~lines 250–255), replace the tier list
with the new one: `mutedForeground` below `foreground`, `cardForeground`,
`popoverForeground` and `inputForeground`, and `disabledForeground`/`placeholder`
below `mutedForeground`; keep the 1.05:1 sentence; add one clause for the
`selectedForeground` omission.

### 3.6 `COMPONENTS.md`

In the **Total theme check** row (design-system table, line ~22), add one clause:
the hierarchy compares secondary text with the body role each surface paints
(`foreground`, `cardForeground`, `popoverForeground`, `inputForeground`), and
`selectedForeground` is deliberately not a body tier. Do not change role, pair,
metric or check counts: none move.

### 3.7 `.agents/slop/plans/README.md`

- Add `500–599` to the number block table: "tokens and theming overflow (this
  workstream)".
- Add the row after 399:

```
| [500](./500-text-hierarchy-surface-body-roles.md) | The text hierarchy on each surface's own body role | F | 059, 071, 315, 319, 371, 383, 387, 388, 391, 392, 398 | done |
```

- Add a closing paragraph in the established voice: the body roles the tiers
  never compared, the probe that returned `[]` from all five checks, the three
  new tiers, the surface counts, the 1.274:1 tightest step, the
  `selectedForeground` omission, and that no colour, pair, floor or metric
  moves.

### 3.8 `TODO.md`

- Tick the pending row at the end of the design-tokens section (the row that
  names `cardForeground`, `popoverForeground`, `inputForeground`), and replace
  its "Needs a plan number from a free block" tail with "(plan 500)".
- Bump the section progress `165/223` → `166/223` (the row already exists, so
  the denominator does not change; verify by counting the section's task lines
  before editing).

## 4. Commands, expected results, and the pre-write probe

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

**Probe the new tiers before writing prose** (build is already generated and
`dist/` is not tracked):

```sh
nub run --filter @gpuixui/tokens build
# EXPECT: "Done", no diagnostics.

node --input-type=module -e '
import { shippedThemes, contrastRatio, contrastPairs } from "./packages/tokens/dist/index.js";
const tiers = [
  ["mutedForeground","cardForeground"],
  ["mutedForeground","popoverForeground"],
  ["mutedForeground","inputForeground"],
];
const surfacesOf = (role) => contrastPairs
  .flatMap(([f,b]) => f === role ? [b] : [])
  .filter((s,i,a) => a.indexOf(s) === i);
for (const [dimmer, brighter] of tiers) {
  const shared = surfacesOf(brighter).filter((s) => surfacesOf(dimmer).includes(s));
  let tightest = Infinity, at = "";
  for (const { theme } of shippedThemes) for (const surface of shared) {
    const ratio = contrastRatio(theme.colors[brighter], theme.colors[surface]) /
      contrastRatio(theme.colors[dimmer], theme.colors[surface]);
    if (ratio < tightest) { tightest = ratio; at = `${theme.name} on ${surface}`; }
  }
  console.log(`${dimmer} < ${brighter}: ${shared.join(", ")} — ${tightest.toFixed(3)} (${at})`);
}
'
# EXPECT (on this tree, 24 shipped sets):
#   mutedForeground < cardForeground: card — 1.274 (High contrast light on card)
#   mutedForeground < popoverForeground: popover, hover, active, selected — 1.274 (High contrast light on popover)
#   mutedForeground < inputForeground: muted, background, card, popover, input — 1.274 (High contrast light on muted)
# A different list means a pair list moved. Use the printed list and figure in
# the docs, and record the difference in the plan/RESULT; do not force these
# numbers.
```

**After the edits:**

```sh
nub run --filter @gpuixui/tokens test
# EXPECT: every file passes, including text-hierarchy, docs, inventory,
# public-types and theme-check. No snapshot or count changes.

nub run --filter @gpuixui/tokens check-types
# EXPECT: no diagnostics.

nub run check        # check:tests, lint, fmt, check-types
nub run lint
nub run test
# EXPECT: exit 0 for each.
```

**Both-direction proof for the regression test** (`scripts/verify-two-directions.sh`
still speaks `jj`; use git):

```sh
# Direction 1 — without the three tiers, the new case must fail.
git stash push -- packages/tokens/src/contrast.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/text-hierarchy.test.ts)
# EXPECT: "reports a surface body role flattened to its secondary text" FAILS
# (no hierarchy entry for cardForeground/popoverForeground/inputForeground);
# the older cases still pass. If it passes, the test does not guard the fix:
# STOP and rewrite it.
git stash pop

# Direction 2 — the suite is green with the fix and every shipped set passes.
(cd packages/tokens && ./node_modules/.bin/vitest run src/text-hierarchy.test.ts)
# EXPECT: every case passes.
```

A test that was not run is not evidence. Record both runs in the final message.

## 5. STOP conditions

Stop and report, do not improvise, if:

- **any shipped set fails a new tier.** That is a shipped token defect, not a
  guard; record the theme name, the surface and both ratios, and stop. Do not
  move a colour to make the guard pass without a separate plan.
- **the derived surface lists or tightest figures differ from §1/§4.** Quote the
  derived values in the documents and say so in the commit; do not force
  1.274:1 or the listed surfaces.
- **a new tier has no shared surface** (e.g. `mutedForeground` lost its `input`
  pair). That is a vacuous check; report the missing pair instead of adding a
  hand-typed surface.
- `docs.test.ts` fails on a sentence this plan updates — update the sentence,
  not the test's intent.
- `theme-check.test.ts`'s broken example changes its reported kinds — inspect
  `brokenTheme`; it must still report all five kinds.
- `inventory.test.ts`, `public-types.test.ts` or `readme.test.ts` fail for a
  name, count or role this plan did not intend to change.
- a gate fails for a reason outside the files this plan names.

## 6. Acceptance criteria

- `textTiers` contains the three surface body-role tiers; `themeTextTierFailures`
  and `themeFailures` report a role flattened to `mutedForeground` on the
  surface it is painted on.
- Every shipped identity variant, platform variant and recipe passes all five
  checks; the tightest new step is stated from the derivation (1.274:1 on this
  tree).
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
  `COMPONENTS.md` state the tiers, the derivation and the `selectedForeground`
  omission; the docs guard enforces each tier and figure.
- `text-hierarchy.test.ts` has a case that fails without the tiers and passes
  with them; both directions were run and recorded.
- No colour, pair, floor, metric or public type changes.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

None. The change is additive inside `packages/tokens` and its documents; no
consumer call shape changes. A consumer theme that had quietly set a card, menu
or field body role to secondary strength will now be reported by the total
check — that is the point of the guard.

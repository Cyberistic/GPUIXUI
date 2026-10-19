# 584 — The floating element's shadow on the content it opens over

**Workstream:** `tokens-theme`
**Phase:** F (the elevation half of the total surface contract)
**Depends on:** plan 509 (the elevation walk derives from the six page surfaces),
plan 375 (the scrim covers the resting content fills), plan 508 (the solid status
chips), plan 526 (the dialog face derives from the scrim list)
**Files owned:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/contrast.test.ts`,
`packages/tokens/src/elevation-contrast.test.ts`,
`packages/tokens/src/docs.test.ts`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`,
`TODO.md`, this plan, `.agents/slop/plans/README.md` (index row only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Plan 509 made the elevation check total over the **page layout**: a raised card,
menu, popover or preview card casts its shadow on `background`, `card`, `muted`,
`input`, `selected` and `popover`. Plan 375 then made the **scrim** total over
the content a window shows — the four resting filled actions, the three solid
status chips, the raised panel action and the four soft status panels — because
"a dialog opens over a status chip or an action as easily as over the page
layout".

The same sentence is true of a menu. A dropdown anchored to one toolbar button
opens across the next button; a context menu opens over a Badge; a combobox list
opens over an Alert. Those are `md` shadows painted on a resting content fill.
The elevation check never measured them, so an edited theme whose `shadow` is
close to `primary`, `info` or `destructiveSoft` returns `[]` from
`themeContrastFailures` while the menu's only depth cue disappears exactly where
it opens.

Measured on the shipped tree (probe below): no shipped theme fails on the
twelve content fills at `md`; the tightest is **1.0579:1** (AAA dark, `md` on
`info`). The defect is in the public guarantee, not in today's palette — the
same class plan 086 closed for the focus ring and plan 314 closed for text.

This plan adds the content fills to the **`md`** walk only:

- `sm` is "resting cards and raised rows" — a card is placed in the layout, it
  does not float over an action. `sm` shadows are already measured on the six
  page surfaces.
- `md` is "menus and popovers" — the floating elements that open over arbitrary
  content.
- `lg` is "dialogs and command palettes" — their face and shadow sit on the
  scrim, which `dialogSurfacePairs` measures (plan 526). Measuring `lg` over
  content would require a separation the default dark sets cannot paint, which
  plan 376 already records.

**STOP** if a shipped theme fails the new `md` pairs. The fix then moves a
value, which changes shipped pixels and needs its own design decision; do not
silently adjust a palette. Record the measured set, its ratio and the surface in
the plan's status and stop for review.

## 2. Current state

- `packages/tokens/src/contrast.ts`
  - `layoutSurfaces` — the six page surfaces, at the scrim and elevation
    section (`const layoutSurfaces = [...] as const`).
  - `contentFillSurfaces` — the twelve resting content fills, defined beside it.
  - `overlaySurfaces = [...layoutSurfaces, ...contentFillSurfaces]`.
  - `export const elevationSurfaces = layoutSurfaces;` (the page-surface walk).
  - `elevationFailures(theme, floors)` iterates `elevationLevels`, then
    `elevationSurfaces`, and returns `ContrastFailure` entries with
    `wash: "shadow"` and `level`.
- `packages/tokens/src/contrast.test.ts` — two cases pin the walk:
  "names the surfaces a raised element floats over" and "reports a collapsed
  alpha on every surface the level paints over" (the latter expects
  `elevationSurfaces` for `md`).
- `packages/tokens/src/elevation-contrast.test.ts` — the shipped-set walk and
  the AAA dark alphas (10% / 14% / 18%).
- `packages/tokens/src/docs.test.ts` — `elevationRatios` derives every painted
  pair from `elevationSurfaces`; two cases pin the quoted figures (1.061 and
  1.207); one case holds the design-system floor row to
  `elevationSurfaces`.
- `docs/tokens.md` — the Elevation section and the Verification paragraph quote
  the six page surfaces and the 1.061 / 1.207 figures; the plan history names
  plan 509.
- `docs/design-system.md` — §7 and §9 quote the six surfaces, and the §9 floor
  table has one elevation row.
- `packages/tokens/README.md` — one paragraph repeats the six surfaces and
  1.061.
- `COMPONENTS.md` — the `Theme contrast check` row names the six surfaces and
  1.109 (a plan-509 figure that later plans superseded).

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. After `contentFillSurfaces`, add:

```ts
/**
 * The content fills a floating `md` element opens over. A menu, popover or
 * combobox list is anchored to a control but paints across whatever is beside
 * it, so its shadow lands on the resting actions, status chips and soft status
 * panels a window shows exactly as the modal scrim does (`overlaySurfaces`).
 * `sm` cards and `lg` dialogs are excluded: a card is placed in the layout, and
 * a dialog's shadow sits on the scrim the face paragraph measures.
 */
export const elevationContentSurfaces = contentFillSurfaces;
```

2. Change `elevationSurfaces`'s JSDoc to say it is the page-surface walk for
   `sm` and `lg` (and the base list `md` extends), and that `md` additionally
   walks `elevationContentSurfaces`. Do not change its value.

3. In `elevationFailures`, replace the single surface loop with a per-level
   list:

```ts
const surfaces =
  level === "md"
    ? ([...layoutSurfaces, ...contentFillSurfaces] as const)
    : elevationSurfaces;
```

and iterate `surfaces` instead of `elevationSurfaces`.

4. Update the `elevationFailures` JSDoc: "…composited over each surface it can
   sit on: the page surfaces for every level, and the resting content fills as
   well for `md`."

### 3.2 `packages/tokens/src/contrast.test.ts`

- Import `elevationContentSurfaces` from `./index.js` (the barrel) or
  `./contrast.js` beside `elevationSurfaces`; follow the file's existing import
  block.
- "names the surfaces a raised element floats over": keep the existing
  `elevationSurfaces` assertion and add
  `expect(elevationContentSurfaces).toEqual([...])` with the twelve roles in the
  definition's order: `primary`, `secondary`, `accent`, `destructive`, `info`,
  `success`, `warning`, `softAction`, `infoSoft`, `successSoft`, `warningSoft`,
  `destructiveSoft`.
- "reports a collapsed alpha on every surface the level paints over": the
  expected list for `md` becomes
  `[...elevationSurfaces, ...elevationContentSurfaces]`.
- Update the plan-509 comment paragraph with a sentence for plan 584: the
  `md` walk also covers the resting content fills, while `sm` and `lg` stay on
  the page surfaces.

### 3.3 `packages/tokens/src/elevation-contrast.test.ts`

- Import `elevationContentSurfaces` and `themeContrastFailures` (already
  imported) and `ThemeColors` only if needed.
- Add a shipped-set case:

```ts
it("keeps a menu's shadow above the floor on the content it opens over", () => {
  const failures = shippedThemes.flatMap(({ theme }) => {
    const shadow = elevationShadow(theme, "md");
    if (shadow === undefined) return [];
    return elevationContentSurfaces.flatMap((surface) => { /* ratio check */ });
  });
  expect(failures).toEqual([]);
});
```

- Add a regression case that must fail on the pre-fix tree:

```ts
it("reports a menu shadow that erases itself on a content fill", () => {
  const edited = extendTheme(getTheme("light"), {
    colors: { shadow: getTheme("light").colors.info },
  });
  expect(themeContrastFailures(edited)).toContainEqual({
    foreground: "shadow",
    background: "info",
    wash: "shadow",
    level: "md",
    opacity: 0.08,
    pairClass: "surface",
    floor: 1.05,
    ratio: expect.any(Number),
  });
});
```

Use the shipped light `md` alpha in the expectation (`theme.elevation.md[0].alpha`);
do not hardcode 0.08 — read it from `getTheme("light").elevation.md[0]`.
Also assert the `sm`/`lg` walks do **not** report the content fill: filter the
failures and expect no `sm`/`lg` entry for `background: "info"`.
- Update the header comment with plan 584's bug statement.

### 3.4 `packages/tokens/src/docs.test.ts`

- In `elevationRatios`, derive the per-level surface list exactly as the
  contract does:

```ts
const surfaces =
  level === "md"
    ? [...elevationSurfaces, ...elevationContentSurfaces]
    : elevationSurfaces;
```

- The overall tightest pair becomes `["High contrast dark", "md", "info",
  "1.058"]` (derived, not hardcoded where possible). Update the assertion in
  "quotes the tightest elevation pair and the AAA dark figure":
  - overall: expect the tuple above and that the prose contains
    `**1.058:1** (AAA dark, \`md\` on \`info\`)`.
  - keep a page-only figure: compute the weakest pair over `elevationSurfaces`
    only and expect `**1.061:1** (identity dark, \`sm\` on \`background\`)`.
  - the AAA-dark tightest is now also the overall 1.058; replace the old
    `1.207` assertion with the page-only pair
    `["High contrast dark", "sm", "background", "1.207"]` computed from the
    page-only list, and assert the prose names `**1.207:1**` in the
    "AAA dark page surfaces" clause.
- Extend "names every surface in the elevation shadow's floor row" to also
  require `` `elevationContentSurfaces` `` and each of its members.

### 3.5 `docs/tokens.md`

- Elevation section (the paragraph beginning "The AAA dark set is the
  exception"): after the six page surfaces, add the floating-`md` sentence:
  "A menu or popover (`md`) also opens across the resting content fills
  `elevationContentSurfaces` names — the four filled actions, the three solid
  status chips, the raised panel action and the four soft status panels — so
  its shadow is measured there too."
- Update the figures: "the tightest shipped pair is **1.058:1** (AAA dark,
  `md` on `info`); over the page surfaces alone it is **1.061:1** (identity
  dark, `sm` on `background`), and the AAA dark page-surface pair is
  **1.207:1**."
- Verification section (the "The elevation is measured as the painted shadow"
  paragraph): name `elevationContentSurfaces` and its members for `md`, keep the
  six page surfaces for the other levels, and quote the same three figures.
- The plan history's plan-509 paragraph: add a closing plan-584 sentence: the
  `md` walk now also covers the twelve resting content fills, the tightest pair
  is 1.058 (AAA dark, `md` on `info`), and no colour moves.
- The `Theme`/API block that names `elevationSurfaces` as the surfaces the
  contrast check uses (around "ordered level index and `elevationSurfaces` the
  surfaces the contrast check") must also name `elevationContentSurfaces`.

### 3.6 `docs/design-system.md`

- §7 elevation paragraph: add the floating-`md` sentence and the
  `elevationContentSurfaces` name; update the quoted figures to 1.058 (overall),
  1.061 (page-only) and 1.207 (AAA dark page-only).
- §9 floor table's elevation row: extend it to
  "…painted on `background`/`card`/`muted`/`input`/`selected`/`popover`, the
  surfaces `elevationSurfaces` names, and — for `md` — the twelve resting
  content fills `elevationContentSurfaces` names".
- §9 explanation ("The elevation shadow is measured composited"): state the
  `md` content walk beside the six page surfaces.

### 3.7 `packages/tokens/README.md`

Update the Shadows paragraph: the page surfaces for every level, and the
content fills `elevationContentSurfaces` names for `md`; quote 1.058 as the
tightest pair (page surfaces alone 1.061).

### 3.8 `COMPONENTS.md`

In the `Theme contrast check` row, replace the elevation clause "…on the six
persistent page surfaces `elevationSurfaces` names (plans 505 and 509)" with the
same plus "and, for `md`, the twelve resting content fills
`elevationContentSurfaces` names (plan 584)"; update the quoted tightest figure
from 1.109 to 1.058 and keep the page-only 1.061.

### 3.9 `TODO.md`

Add one ticked row after the plan-583 row in the `Design tokens and theming`
section, state the bug and the plan number, and bump the progress line from
`237/314` to `238/315`.

### 3.10 `.agents/slop/plans/README.md`

Add the index row after 583:

```
| [584](./584-elevation-on-content.md) | The floating element's shadow on the content it opens over | F | 375, 508, 509, 526 | done |
```

and add a paragraph to the summary prose describing plan 584 beside the plan-509
history.

## 4. Commands

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| Probe the shipped `md` pairs | `nub -e` script over `dist` (see §5) | every pair ≥ 1.05, tightest 1.058 |
| Format + lint + types | `nub run check` | exit 0 |
| Full gate | `nub run lint` | exit 0 |
| Package tests | `nub run --filter @gpuixui/tokens test` | all files pass |
| Two directions | revert `elevationFailures` to the page-only loop, run the new regression case | the new case fails (`[]` instead of the expected failure); restore → passes |

## 5. Probe (run before editing the contract)

```sh
cd packages/tokens
nub -e '
import { shippedThemes } from "./dist/shipped-themes.js";
import { compositeOver, contrastRatio } from "./dist/contrast.js";
import { elevationShadow } from "./dist/elevation.js";
const roles = ["primary","secondary","accent","destructive","info","success","warning","softAction","infoSoft","successSoft","warningSoft","destructiveSoft"];
let worst = { r: 99 };
for (const { theme, platform } of shippedThemes) {
  const shadow = elevationShadow(theme, "md");
  for (const role of roles) {
    const fill = theme.colors[role];
    const r = contrastRatio(compositeOver(shadow.color, fill), fill);
    if (r < worst.r) worst = { r, theme: theme.name, platform: platform ?? "identity", mode: theme.mode, role };
  }
}
console.log(worst);
'
```

Expected: `{ r: 1.0579169…, theme: "High contrast dark", platform: "identity", mode: "dark", role: "info" }`.
The probe is evidence, not a test; the suite case in §3.3 is the guard.

## 6. Test plan

- The shipped-set case must fail if a theme's `md` shadow composites to a
  content fill; it passes on every shipped set after the change.
- The regression case sets `shadow` to the light `info` role and asserts the
  public checker reports `["shadow", "info", "md"]`. It **must fail on the
  pre-fix tree** — `elevationFailures` iterates only `elevationSurfaces`, so the
  checker returns `[]` for this edit. Verify both directions before committing.
- Assert the `sm` and `lg` walks do not gain the content fill, so the plan's
  scope (floating menus, not cards and dialogs) is explicit.
- `docs.test.ts` holds the new figures and the floor row to the lists, so a
  palette or doc edit cannot leave the page quoting the old six-surface
  contract.
- Existing `contrast.test.ts` cases continue to pass with the `md` list
  extended; do not weaken the collapsed-alpha case.

## 7. Acceptance

- `elevationContentSurfaces` is exported, documented in `docs/tokens.md`, and
  named in the design-system floor row.
- `themeContrastFailures` reports an invisible `md` shadow on each of the twelve
  content fills, and does not measure `sm`/`lg` there.
- Every shipped theme still passes; no colour, role, floor or `contrastPairs`
  count changes.
- `nub run check`, `nub run lint` and `nub run --filter @gpuixui/tokens test`
  exit 0.
- TODO/COMPONENTS/plan index state the change with plan number 584.

## 8. Outcome (executed 2026-10-19)

- `elevationContentSurfaces` is the twelve resting content fills, and the `md`
  branch of `elevationFailures` walks `overlaySurfaces` (page + content); `sm`
  and `lg` keep `elevationSurfaces`.
- Every shipped set passes at `md`; the tightest pair is **1.0579:1** (AAA dark,
  `md` on `info`), and no palette value, role, floor or `contrastPairs` count
  changed (`contrastPairs` stays **405**).
- Two existing suites needed their inverted-light fixture moved from
  `#1E1060/#2A1A7A/#372394` to `#3A2A9A/#4A38AE/#5A46C2`:
  `theme-check.test.ts` and `state-direction.test.ts` assert that the direction
  check's example passes `themeContrastFailures`, and the old navy was close
  enough to the `#191D25` shadow tint that the new content pair correctly
  reported it. The new family keeps the inverted direction (1.248:1 and 1.252:1
  steps, white at 10.62/8.51/6.80:1) and passes every contrast pair.
- Both directions were proven: with `elevationFailures` temporarily reverted to
  `elevationSurfaces` for every level, `elevation-contrast.test.ts` fails the
  collapsed-alpha case and the new content-fill regression (2 failed); restored,
  all 10 pass. The full suite is 149 files / 5,793 tests green, and
  `nub run check`, `nub run lint` and `nub run test` pass.

## 9. STOP conditions

- A shipped theme fails a new `md` content pair → stop, record the set, level,
  surface and ratio; do not edit a palette in this plan.
- `elevationContentSurfaces` would need to change a consumer package → record a
  cross-team TODO row; do not edit outside this workstream's paths.
- The docs figures cannot be derived without copying the per-level logic into
  more than one test helper → stop and report; do not hardcode a ratio that a
  palette edit can falsify.

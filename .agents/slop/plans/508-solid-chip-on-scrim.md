# Plan 508 — The solid status chip on the scrim

**Status:** done · **Workstream:** `tokens-theme` · **Phase:** F
**Depends on:** 099 (the scrim became a measured wash), 359/375/395 (the scrim on
the layout, the filled actions and the status panels), 399 (the solid status fill
became a first-class fill), 504 (the same fill became a selection surface), 507
(the dialog's face on the scrim).
**Owns:** `packages/tokens/src/contrast.ts`, `overlay-scrim.test.ts`,
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`.

---

## 1. The defect

`overlaySurfaces` names every resting fill a dialog opens over **except the solid
status chips**. Plan 375 added the four resting filled actions, the raised panel
action and the four soft status panels; plan 399 made the solid status fill a
first-class fill (`statusFillPairs`) and plan 504 made it a selection surface
(`selectionFillRoles`), but the scrim list was never revisited.

A solid Badge (`info`, `success`, `warning`) is resting content on the page a
dialog opens over. A theme whose `overlay` composites to one of those fills leaves
the chip undimmed while `themeFailures` returns `[]` — the exact defect plan 375
fixed for `primary` and the soft panels, one content family over. `destructive`
is already measured as an action fill.

Measured across all 24 shipped sets: every chip pair already clears the 1.05:1
`surface` floor — the tightest is high-contrast dark `info` at **1.0599:1**
(`success` 1.0744, `warning` 1.0626). So no colour moves; this plan closes the
coverage gap.

## 2. What to change

### 2.1 `packages/tokens/src/contrast.ts`

Add the three chips to `contentFillSurfaces`, in `statusTones` order, between the
four action fills and the raised panel action:

```ts
const contentFillSurfaces = [
  "primary",
  "secondary",
  "accent",
  "destructive",
  "info",
  "success",
  "warning",
  "softAction",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;
```

Keep the list literal (not derived) so the exported `overlaySurfaces` keeps its
literal tuple type; the test in §2.2 proves the three entries are the status index
minus `destructive`, so a fifth tone cannot be dropped silently.

Extend the `overlaySurfaces` JSDoc: the list now names "the four resting filled
actions (`primary`, `secondary`, `accent`, `destructive`), the three solid status
chips (`info`, `success`, `warning`) a Badge paints, the raised action …
(`softAction`) and the four soft status panels". Extend the `overlayWashPairs`
JSDoc the same way.

### 2.2 `packages/tokens/src/overlay-scrim.test.ts`

1. Add a header paragraph for plan 508 (the chip family the list omitted, the
   measured tightest 1.0599:1, the 15 → 18 count).
2. Extend the exact `overlayWashPairs` expectation with
   `["overlay", "info", "surface"]`, `["overlay", "success", "surface"]`,
   `["overlay", "warning", "surface"]` after `destructive`.
3. New case: **derived from the status index.** The three chips in
   `overlaySurfaces` equal `statusTones.filter((tone) => tone !== "destructive")`,
   and `destructive` is present once (as the action fill). This fails if a fifth
   tone ships without a scrim surface.
4. New case: **the erased chip (regression).** For each of the three chips,
   `extendTheme(lightTheme, { colors: { overlay: lightTheme.colors[chip] } })`
   reports exactly one failure for that background with `foreground: "overlay"`,
   `wash: "overlay"`, `pairClass: "surface"`, `ratio: 1`. Fails on the pre-change
   tree (0 failures).
5. New case: **the shipped figure.** The tightest chip pair across
   `shippedThemes` is `high-contrast dark`, `info`, **1.060** (3 dp).

### 2.3 `docs/design-system.md`

- §7 scrim paragraph: after "the four resting filled actions (`primary`,
  `secondary`, `accent`, `destructive`)" add "the three solid status chips
  (`info`, `success`, `warning`) a Badge paints". The count word becomes
  **eighteen** ("the eighteen surfaces it covers").
- §9 floor table: the modal scrim row names the chips after the actions.
- §9 explanation: "the eighteen surfaces", the chip clause, and
  "The tightest of the eighteen pairs is **1.075:1**" (unchanged figure).

### 2.4 `docs/tokens.md`

- The scrim paragraph (`overlayWashPairs`): the chip clause and "the tightest
  shipped pair is **1.075:1**" (unchanged).
- Verification history: one step — "plan `508` adds the three solid status chips
  a Badge paints, taking the scrim list from fifteen to eighteen; every shipped
  set clears 1.05:1 (1.060:1 at the tightest), so no colour moves and
  `contrastPairs` stays 394."
- Check any other "fifteen" in the file; only the scrim ones change.

### 2.5 `packages/tokens/README.md`

Both scrim sentences ("over the fifteen surfaces" ×2) become **eighteen** and
name the chips in the enumerated list.

### 2.6 `COMPONENTS.md`

The **Theme contrast check** row: `15 scrim pairs` → `18 scrim pairs` and one
plan `508` clause in the narrative.

### 2.7 `packages/tokens/src/docs.test.ts`

`countWords` stops at `fifteen`; extend it through `eighteen` so
`countWord(overlaySurfaces.length)` is `"eighteen"` and the existing §7/§9 guards
read the documents' new count. No other change.

### 2.8 Indexes

- `.agents/slop/plans/README.md`: add the 508 row (in progress) and a closing
  paragraph after plan 507's.
- `TODO.md`: add and tick the row; bump the section count.

## 3. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test   # 105 → 106 files, green
nub run check                            # green
nub run lint                             # green
nub run test                             # green
nub scripts/check-tests.ts               # green
```

## 4. STOP conditions

- Any shipped set fails the new chip pairs (the measured minimum is 1.0599:1). Do
  not move a colour; report.
- `overlayWashPairs` order changes for any of the existing fifteen entries.
- A documentation guard fails for a reason other than the count word and the chip
  clause.
- `contrastPairs` would change from 394 (it must not; the scrim is a separate
  list).

## 5. Acceptance

- `overlaySurfaces` covers the three solid status chips, derived and guarded.
- A theme whose scrim meets a solid chip is reported by
  `themeContrastFailures`/`themeFailures`, and the case fails without the change.
- Both documents and the ledger state the eighteen-surface count from the list.
- All gates in §3 are green, the plan is indexed, the TODO row is ticked.

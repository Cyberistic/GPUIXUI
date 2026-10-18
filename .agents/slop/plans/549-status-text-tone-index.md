# 549 — The status-text pairs retype the tone index

**Workstream:** `tokens-theme`. **Phase:** F (guard quality).
**Depends on:** 014 (the status tones), 057 (`xText` roles), 083 (status text on
the row washes), 314 (status text on the quiet panel), 548 (the soft-fill lists
and the claim this plan corrects), 546 / 547 (the same guard-quality class).
**Files:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/status-text-index.test.ts` (new),
`packages/tokens/src/docs.test.ts`, `docs/tokens.md`, `COMPONENTS.md`,
`TODO.md`, `.agents/slop/plans/README.md`, this plan.

## 1. The defect

`statusTones` (`packages/tokens/src/styles.ts:60`) is **the** status-family
index. Plan 548 made the soft-fill lists derive from it and the catalogue now
says every soft list follows the index. The plan index and `TODO.md` go further
and say the `xText` roles already derived too. They do not.

`contrast.ts` retypes the status text roles in two places:

| Line | Form | Consequence of a fifth tone |
| ---- | ---- | --------------------------- |
| 600 | `const statusTextTones = ["info", "success", "warning", "destructive"] as const` | its `xText` role on the quiet panel and the four row washes is unmeasured |
| 959–970 | twelve literal pairs, four tones × `background`/`card`/`popover` | its `xText` role on the three plain surfaces is unmeasured |

Every other status list already follows the index: `statusFillPairs`,
`softSurfaceRoles`, `softBorderPairs`, `toastTonePairs`, `selectionFillRoles`,
`selectionStatusPairs`. So a maintainer adding a fifth family to `statusTones`
(the documented one-place edit) gets a family whose solid fill, soft surface,
edge, toast tone and selection pairs follow automatically, while its label on
the canvas, a card, a popover, a sidebar and all four row washes has no pair —
and `themeContrastFailures` returns `[]` for an edited theme that erases that
label.

No shipped value is wrong: the four shipped tones are all named. The unit is
guard-only; no colour, pair, floor or metric moves (32 status text pairs before
and after).

## 2. The rule to state

**The tone index owns the `xText` roles.** The surfaces a status label paints on
are a named public index, `statusTextSurfaces`, and the pairs are derived from
it and `statusTones`. Adding a tone to the index adds its label on all eight
surfaces with no second edit.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. Replace the block at lines 586–607 with:

```ts
/**
 * The surfaces a status label, icon or indicator dot paints on: the plain
 * surfaces, the quiet panel of a sidebar or settings group, and the four washes
 * a row paints. A status label is `xText` on each, because the solid fill is a
 * surface, not a foreground — light `warning` is 1.78:1 on the canvas.
 */
export const statusTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

/**
 * Every tone's plain-surface text role on every surface it paints. Derived from
 * the tone index, so a fifth status family joins its own label pairs with that
 * one edit.
 */
const statusTextSurfacePairs: readonly ContrastPair[] = statusTones.flatMap(
  (tone) =>
    statusTextSurfaces.map(
      (background): ContrastPair => [`${tone}Text`, background, "secondary"],
    ),
);
```

2. Delete the twelve hand-typed pairs in `contrastPairs` (lines 959–970,
   `["infoText", "background", "secondary"]` through
   `["destructiveText", "popover", "secondary"]`). Keep
   `...statusTextSurfacePairs` where it is (line 971).

3. Verify no bare tone array remains:

```sh
grep -n '"info".*"success"\|"success".*"warning"' packages/tokens/src/contrast.ts
```

→ no output.

The concrete pair order is unchanged: `background`, `card`, `popover`, `muted`,
`hover`, `active`, `accent`, `selected` is the order the twelve literals and the
old five-surface derived list produced together, so `textSurfaces("infoText")`
and every document figure that walks pairs keep their order.

### 3.2 `packages/tokens/src/status-text-index.test.ts` (new)

Write a guard that derives its expectation from `statusTones`, with a header
naming the defect it guards:

```
/**
 * Guards the defect plan 549 fixes: the status families' plain-surface text
 * roles (`xText`) were retyped by hand — a separate four-name `statusTextTones`
 * plus twelve literal pairs for `background`/`card`/`popover` — while every
 * other status list already derived from `statusTones`. A fifth tone therefore
 * joined the solid, soft and chip pairs but shipped its label on the canvas, a
 * card, a popover, the quiet panel and the four row washes unmeasured. The
 * cases below derive their expectation from the index, so a tone added without
 * its text pairs fails them.
 */
```

Cases (import `contrastPairs`, `statusTextSurfaces`, `statusTones` and the
`ContrastPair` type from `./index.js`):

- `statusTextSurfaces` has eight unique members and equals the documented order
  (`background`, `card`, `popover`, `muted`, `hover`, `active`, `accent`,
  `selected`);
- `contrastPairs` holds `[xText, surface, "secondary"]` for every
  `statusTones` × `statusTextSurfaces` combination;
- the number of `xText` pairs in `contrastPairs` is exactly
  `statusTones.length * statusTextSurfaces.length`, so no tone can appear twice
  and no family can be added outside the index.

Use `statusTones.forEach((tone) => …)` and `` `${tone}Text` `` so no case
retypes the four names.

### 3.3 `docs/tokens.md`

1. Add `statusTextSurfaces,` to the core import block (line 25–57), before
   `statusTone`.
2. After the paragraph that ends “Every soft-fill list is derived from the tone
   index (`statusTones`): a fifth status family joins its tint's surface, text,
   edge, ring, inactive, track, scrim and selection pairs from that one edit.”
   (around line 342), add:

> The label itself is indexed too: `statusTextSurfaces` is the ordered list a
> status label, icon or dot paints on — `background`, `card`, `popover`, the
> `muted` quiet panel and the four state washes. The `xText` pairs derive from
> `statusTextSurfaces` and the tone index, so a fifth family's label joins the
> contract with the same one edit.

No count, ratio or table changes: the contract still holds 404 plain pairs.

### 3.4 `packages/tokens/src/docs.test.ts`

Import `statusTextSurfaces` beside `statusTones`, then add beside the plan-548
case:

```ts
  it("names the surface index the status text pairs derive from", () => {
    expect(markdown).toContain("The `xText` pairs derive from");
    expect(markdown).toContain("`statusTextSurfaces` and the tone index");
    statusTextSurfaces.forEach((surface) => {
      expect(markdown, surface).toContain(`\`${surface}\``);
    });
  });
```

### 3.5 `COMPONENTS.md`

In the *Status tones* row, replace the plan-548 sentence tail with:

> Every status list derives its members from `statusTones` — the soft fill, its
> edge, the solid chip, the plain-surface `xText` roles and the selection wash
> (plans 548 and 549) — so a fifth family joins its tint, edge, chip, label,
> ring, inactive, track, scrim and selection pairs with the tone index alone.

Do not change a count or ratio in the row.

### 3.6 `TODO.md`

Add under *Design tokens and theming (`tokens-theme`)*:

```
`[x]` Make the status-text contract own the tones it derives from — plan 548
made every soft-fill list follow `statusTones` and said the `xText` roles already
did, but those were still a separate four-name `statusTextTones` plus twelve
literal pairs, so a fifth family's label on `background`/`card`/`popover`/`muted`
and the four row washes would have shipped unmeasured; `statusTextSurfaces` is
the public surface index now, the pairs derive from it and the tone index, and a
new guard takes its expectation from the index (plan 549)
```

Bump the progress bar numerator by one (`212/276` → `213/276`); the
denominator is the fixed task budget.

### 3.7 Plan index

Add to the table in `.agents/slop/plans/README.md`:

```
| [549](./549-status-text-tone-index.md) | The status-text pairs retype the tone index | F | 014, 057, 083, 314, 546–548 | done |
```

Add a prose paragraph after the plan-548 paragraph, and correct that
paragraph's claim: it says “The solid status fills, the `xText` roles, the chip
edge and the selection list all derived from `statusTones`”, but the `xText`
roles did not; plan 549 finishes that half.

## 4. Test plan — prove both directions

1. **Baseline:** `nub run --filter @gpuixui/tokens test` → 132 files / 5649
   tests pass, exit `0`.
2. **The hand copies are found:** `grep -n '"info".*"success"\|"success".*"warning"' packages/tokens/src/contrast.ts`
   → one line before the change (`statusTextTones`); no output after it.
3. **Pre-fix probe:** on the unmodified tree, add `"neutral"` to `statusTones`
   in `styles.ts` and add a scratch case that does not import the new export:

   ```ts
   import { describe, expect, it } from "vitest";
   import { contrastPairs, statusTones } from "./index.js";

   it("measures a fifth tone's label on every surface", () => {
     const count = contrastPairs.filter(([foreground]) =>
       statusTones.some((tone) => foreground === `${tone}Text`),
     ).length;
     expect(count).toBe(statusTones.length * 8);
   });
   ```

   Run `./node_modules/.bin/vitest run src/scratch-text-tone.test.ts` →
   **fails**, because `contrastPairs` holds `4 × 8` status text pairs while the
   five-tone expectation is `5 × 8`. The probe needs no colour values: it
   inspects pair membership, not measured ratios. Record the output.
4. **Post-fix direction:** with §3.1–3.2 in place and `"neutral"` still in the
   index, rerun the same scratch case → **passes** (the pair list is derived and
   now holds `5 × 8`). Record the output. The delivered guard cannot run against
   the pre-fix tree because it imports `statusTextSurfaces`, which the fix
   introduces; the scratch case is the can-fail evidence for its third case.
5. **Revert the probe:** remove `"neutral"` from `statusTones`;
   `nub run --filter @gpuixui/tokens check-types` passes and `git diff` shows
   only the plan's intended files.
6. **The documentation guard can fail:** delete the new sentence from
   `docs/tokens.md` → the new `docs.test.ts` case fails. Restore it.
7. **Counts unchanged:** `figures.test.ts`, `status-text.test.ts`,
   `selection-status.test.ts`, `docs.test.ts` and the full suite are green; the
   plain pair count stays 404 and every quoted ratio stays valid.
8. **Full gates:** `nub run --filter @gpuixui/tokens test` → 133 files / 5653
   tests pass, then `nub run check`, `nub run lint`, `nub run test`.

## 5. STOP conditions

- The new guard fails on the unmodified tree with four tones → stop: the test
  derives something other than the index; fix the test, not the package.
- Any pair count, ratio, `textSurfaces` order or document table changes → stop:
  the change is meant to be set- and order-preserving.
- A `check-types` error in `statusTone` after the probe → stop and report: the
  probe is a temporary edit; it must not reach a commit.
- A guard outside this plan fails → stop and report the file and message rather
  than editing a path this workstream does not own.

## 6. Acceptance

- `statusTextTones` no longer exists; the twelve literal `xText` pairs are gone.
- `statusTextSurfaces` is exported, documented, guarded, and the `xText` pairs
  derive from it and `statusTones`.
- The probe in §4.3 fails before the fix and passes after it; both outputs are
  recorded in the session log.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` pass.
- `TODO.md`, `COMPONENTS.md` and the plan index are updated, and the branch is
  pushed.

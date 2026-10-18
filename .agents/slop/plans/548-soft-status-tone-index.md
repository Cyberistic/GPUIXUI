# 548 — The soft-status lists retype the tone index

**Workstream:** `tokens-theme`. **Phase:** F (guard quality).
**Depends on:** 014 (the status tones), 057 (status text roles), 090 / 091 / 300
(the soft surface, edge and wash pairs), 307 (the inactive soft pair), 347 /
503 (the track on the soft fills), 375 / 508 (the scrim over the soft fills),
394 (the panel action on the tints), 546 / 547 (the same guard-quality class:
an inventory that the domain already owns).
**Files:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/soft-surface-index.test.ts` (new), `docs/tokens.md`,
`packages/tokens/src/docs.test.ts`, `COMPONENTS.md`, `TODO.md`, this plan index.

## 1. The defect

`statusTones` (`packages/tokens/src/styles.ts:58`) is **the** status-family
index. The contract already derives from it everywhere a tone is named as a
tone: `statusFillPairs` (the solid chips), `statusTextSurfacePairs` (the
`xText` roles), `softBorderSurfacePairs` (the soft edge on the chip surfaces),
`toastTonePairs`, `selectionFillRoles` and `selectionStatusPairs`.
`statusTone(theme, tone)` resolves all three tonalities from the same union.

The **soft fill** is the exception. `contrast.ts` retypes the four `xSoft` roles
by hand in six places:

| Line | List | Consequence of a fifth tone |
| ---- | ---- | --------------------------- |
| 68 | `softSurfaceRoles` | its tint on the four panels, its text over the wash, its inactive and ring pairs, the panel action on it, the chip edge — about ten lists — skip the tint |
| 145 | `trackSurfaces` | the value groove on the tint is unmeasured |
| 179 | `softBorderPairs` | the designed edge on its own fill is unmeasured |
| 963 | the soft body-text literals inside `contrastPairs` | `xSoftForeground` on the tint is unmeasured |
| 1574 | `selectionSoftWashPairs` | the selection wash on the tint is unmeasured |
| 1613 | `contentFillSurfaces` | the scrim and the dialog face over the tint are unmeasured |

A maintainer adding a fifth family to `statusTones` (the documented one-place
edit; `statusTone` and the solid/text/chip lists follow automatically) gets a
family whose soft surface is invisible to the contract. The library documents
three tonalities per family — solid, soft, text — and `statusTone` returns the
soft fill for every tone; a tint no list measures breaks that guarantee with
every check returning `[]`.

This is the plan-546/547 class one index over: a hand-typed copy of a list the
domain owns. No shipped value is wrong — all four shipped tones are named — so
the unit is guard-only and no colour, pair or floor moves.

## 2. The rule to state

**The tone index owns the soft fills.** Every soft-fill list derives its
members from `statusTones` (`${tone}Soft`), exactly as the solid, text and chip
lists already do. Adding a tone to the index adds its tint to the surface,
body-text, edge, ring, inactive, track, scrim, dialog and selection lists with
no second edit.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

1. Import the tone type beside the family import:

```ts
import {
  filledControlFamilies,
  statusTones,
  type FilledControlFamily,
  type StatusTone,
} from "./styles.js";
```

2. Replace `softSurfaceRoles` (currently lines 67-72) with:

```ts
/** Every status family's soft fill, in the tone index's order. */
const softSurfaceRoles: ReadonlyArray<`${StatusTone}Soft`> = statusTones.map(
  (tone) => `${tone}Soft`,
);
```

3. `trackSurfaces`: replace the four hand-typed soft names with the spread:

```ts
const trackSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
  ...softSurfaceRoles,
] as const;
```

4. Replace `softBorderPairs` with the tone-derived form:

```ts
const softBorderPairs: readonly ContrastPair[] = statusTones.map(
  (tone): ContrastPair => [`${tone}SoftBorder`, `${tone}Soft`, "divider"],
);
```

5. In `contrastPairs` (around lines 963-966), replace the four soft body-text
   literals with:

```ts
  ...softSurfaceRoles.map(
    (role): ContrastPair => [`${role}Foreground`, role, "body"],
  ),
```

6. Replace `selectionSoftWashPairs` (around lines 1573-1578) with:

```ts
export const selectionSoftWashPairs: readonly ContrastPair[] =
  softSurfaceRoles.map(
    (role): ContrastPair => ["selection", role, "surface"],
  );
```

7. `contentFillSurfaces` (around lines 1600-1618): derive the solid chips and
   the soft panels, keeping the four action fills hand-typed and in their
   current order (that order is the documented one; deriving them from
   `filledControlFamilies` would reorder them and is a separate concern):

```ts
const contentFillSurfaces = [
  "primary",
  "secondary",
  "accent",
  "destructive",
  ...statusTones.filter((tone) => tone !== "destructive"),
  "softAction",
  ...softSurfaceRoles,
] as const;
```

The concrete order is unchanged: `statusTones` is `info`, `success`, `warning`,
`destructive` and the filter leaves the three chips; `softSurfaceRoles` is
`infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`. Every derived pair
list therefore keeps its current length and order.

8. Remove any other hand-typed soft role name the six edits above leave behind
   (the search in §4.1 proves there are none).

### 3.2 `packages/tokens/src/soft-surface-index.test.ts` (new)

Write a guard that derives its expectation from `statusTones`, with a header
naming the defect it guards:

```
/**
 * Guards the defect plan 548 fixes: the soft status fills were retyped by hand
 * in six lists while `statusTones` owns the families, so a fifth tone joined
 * the solid, text and chip lists automatically and skipped every soft list —
 * its Alert's tint, text, edge, ring, track, scrim and selection pairs. The
 * cases below derive each expectation from the tone index, so they fail when a
 * tone is added and a list is not derived from it.
 */
```

Cases (import from `./index.js`):

- every tone's tint is in `contrastPairs` as `[xSoft, "background", "surface"]`
  and as `[xSoftForeground, xSoft, "body"]` and as `[xSoftBorder, xSoft,
  "divider"]`;
- every tone's tint is a `trackSurfacePairs` member;
- every tone's tint is a `selectionSoftWashPairs` member;
- every tone's tint is in `overlaySurfaces`;
- `softActionPairs` holds each of the three `softAction` fills on every tone's
  tint (already derived — the case makes that observable);
- `selectionSoftPairs` holds `xSoftForeground`, `foreground`,
  `softActionForeground` and `mutedForeground` on every tone's tint (derived);
- `inactiveSoftPairs` and `ringSoftPairs` hold their role on every tone's tint
  (derived).

Use `statusTones.forEach((tone) => …)` and `` `${tone}Soft` `` so no case
retypes the four names.

### 3.3 `docs/tokens.md` — state the owner

After the soft-surface paragraph that ends "…moved the four light tints one
small step deeper." (around line 346), add:

> Every soft-fill list is derived from the tone index (`statusTones`): a fifth
> status family joins its tint's surface, text, edge, ring, inactive, track,
> scrim and selection pairs from that one edit.

No count, ratio or table changes: the shipped set still has four tones and the
document's "four" states stay true.

### 3.4 `packages/tokens/src/docs.test.ts` — guard the sentence

Add one case beside the other status-tone cases:

```ts
  it("states that the soft-fill lists derive from the tone index", () => {
    expect(markdown).toContain(
      "Every soft-fill list is derived from the tone index (`statusTones`)",
    );
  });
```

### 3.5 `COMPONENTS.md` — the ledger records the owner

In the *Status tones* row, after the sentence that lists the three tonalities,
add:

> Every soft-fill list derives its members from `statusTones` (plan 548), so a
> fifth family joins its tint's surface, text, edge, ring, inactive, track,
> scrim and selection pairs with the tone index alone.

Do not change any count or ratio in the row.

### 3.6 `TODO.md` — tick the unit

Add under *Design tokens and theming (`tokens-theme`)*:

```
`[x]` Make the soft-status contract own the tones it derives from — the solid
fill, the `xText` roles, the chip edge and the selection list all derived from
`statusTones`, but the soft fill was retyped by hand in six places
(`softSurfaceRoles`, `trackSurfaces`, `softBorderPairs`, the body-text literals,
`selectionSoftWashPairs` and `contentFillSurfaces`), so a fifth tone's Alert
tint skipped about ten lists while every check returned `[]`; all six now derive
from the tone index and a new guard takes its expectation from it (plan 548)
```

and bump the progress bar count by one.

### 3.7 Plan index and audit record

Add the row to `.agents/slop/plans/README.md`:

```
| [548](./548-soft-status-tone-index.md) | The soft-status lists retype the tone index | F | 014, 057, 090, 091, 300, 307, 347, 394, 503, 508, 546, 547 | done |
```

and the prose tail paragraph after 547. Add
`.agents/slop/rd/2026-10-19-tokens-next-548.md` with what landed, the queue
state and the candidates re-checked.

## 4. Test plan — prove both directions

1. **Baseline:** `nub run --filter @gpuixui/tokens test` → 131 files / 5641
   tests pass, exit `0`.
2. **Every hand copy is found:** `grep -n '"infoSoft"\|"successSoft"\|"warningSoft"\|"destructiveSoft"' packages/tokens/src/contrast.ts`
   → before the change, six sites (§1); after it, only the doc comments and the
   derived expressions (no bare four-name arrays).
3. **Pre-fix probe — add a fifth tone.** On the unmodified tree add a `neutral`
   family: `neutralSoft`, `neutralSoftForeground`, `neutralSoftBorder`,
   `neutralText`, `neutral` and `neutralForeground` to `ThemeColors` and to all
   four palettes in `color.ts`, and `"neutral"` to `statusTones` in `styles.ts`.
   Add the scratch case `src/scratch-tone.test.ts`:

   ```ts
   import { describe, expect, it } from "vitest";
   import {
     contrastPairs,
     extendTheme,
     lightTheme,
     selectionSoftWashPairs,
     trackSurfacePairs,
     overlaySurfaces,
   } from "./index.js";

   describe("scratch tone", () => {
     it("measures the fifth tone's soft fill everywhere", () => {
       const edited = extendTheme(lightTheme, {
         colors: { neutralSoft: lightTheme.colors.background },
       });
       expect(edited.colors.neutralSoft).toBe(lightTheme.colors.background);
       expect(
         contrastPairs.some(
           ([foreground, background, pairClass]) =>
             foreground === "neutralSoft" &&
             background === "background" &&
             pairClass === "surface",
         ),
       ).toBe(true);
       expect(
         trackSurfacePairs.some(([, background]) => background === "neutralSoft"),
       ).toBe(true);
       expect(
         selectionSoftWashPairs.some(([, background]) => background === "neutralSoft"),
       ).toBe(true);
       expect(overlaySurfaces).toContain("neutralSoft");
     });
   });
   ```

   With the HEAD `contrast.ts` run
   `./node_modules/.bin/vitest run src/scratch-tone.test.ts` → **fails** (the
   first `some` is `false`). Record the output. Delete the scratch file; keep
   the fifth tone for the next step.
4. **Post-fix direction:** with §3.1-3.2 in place and the same fifth tone still
   applied, rerun the scratch case → **passes**. Also run
   `./node_modules/.bin/vitest run src/soft-surface-index.test.ts` → passes with
   five tones. Record the output.
5. **Revert the probe:** remove the six roles from `color.ts` and `"neutral"`
   from `styles.ts`; `nub run --filter @gpuixui/tokens check-types` passes and
   `git diff` shows only the plan's intended files.
6. **The documentation guard can fail:** delete the new sentence from
   `docs/tokens.md` → the new `docs.test.ts` case fails. Restore it.
7. **The index guard can fail:** temporarily replace `softSurfaceRoles` with
   the old four-name array and add a `neutral` tone only to `statusTones` (no
   palette edit is needed for this step; it only has to type-check far enough
   to run the test, so instead delete one name — `"warningSoft"` — from the
   hand array) → `soft-surface-index.test.ts` fails every case for `warning`.
   Restore.
8. **Derived lists keep their shape:** `state-fill-surfaces.test.ts`,
   `track-contrast.test.ts`, `selection-soft.test.ts`, `overlay-scrim.test.ts`,
   `dialog-scrim.test.ts` and full suite → green, with every pair count
   unchanged (404 plain pairs, 26 selection, 10 wash, 4 soft wash, 18 scrim,
   18 dialog-face).
9. **Full suite + gates:** `nub run --filter @gpuixui/tokens test` → 132 files /
   (5641 + the new cases) tests pass; `nub run check`; `nub run test`.

## 5. Commands and expected results

```sh
cd packages/tokens
nub run test                              # 131 files, 5641 tests (baseline)
nub run check-types                       # the derived lists type-check
./node_modules/.bin/vitest run src/soft-surface-index.test.ts
./node_modules/.bin/vitest run src/docs.test.ts
cd ../..
nub run check
nub run test
```

## 6. STOP conditions

Stop and report instead of improvising if:

- a derived expression does not type-check as `keyof ThemeColors` without an
  assertion. Do **not** cast; report the expression that fails.
- any derived pair list changes length or order — every count in the plan and
  the documents must stay as it is, or the unit is no longer guard-only.
- any shipped theme, platform variant or recipe fails a pair after the change.
- the sixth hand site in §1 is not one of the six listed, or the grep in §4.2
  finds another soft-role array after the change; report it before editing.
- `nub run check` fails for a reason unrelated to this change — record it as a
  cross-team row in `TODO.md` and stop; do not edit another workstream's file.

## 7. Acceptance criteria

- No soft status role is retyped as a four-name array in `contrast.ts`; the
  soft lists derive from `statusTones`.
- `soft-surface-index.test.ts` derives every expectation from the tone index and
  fails when a tone's tint is missing from any soft list.
- A fifth tone added to the index is measured on its tint everywhere (proved by
  §4.4), and the pre-fix tree misses it (proved by §4.3).
- `docs/tokens.md` names the owner and `docs.test.ts` holds the sentence;
  `COMPONENTS.md` and `TODO.md` record the unit; the plan is indexed; the `rd`
  note records the queue.
- Every pair count, colour, floor, metric, theme, platform style and recipe
  value is unchanged; all seven checks pass on every shipped set.
- `nub run check`, `nub run lint`, `nub run test` pass, and the commits are on
  `agent/tokens-theme` and pushed.

## 8. Rollback

Revert the commit. No runtime value moves, so a revert restores the four-name
arrays and the weaker (but currently complete) guards.

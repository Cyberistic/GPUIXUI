# Plan 359 — The scrim over the surfaces a window actually shows

**Phase:** F · **Owner:** `tokens-theme` · **Status:** done
**Depends on:** 099 (the scrim becomes measured), 309 (fills as surfaces),
326 (counts derive from the lists), 337 (the selection wash's surface list),
347 (the `track` surface list), 353–358.
**Owns:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/overlay-scrim.test.ts`,
`packages/tokens/src/contrast.test.ts`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

Plan `099` made `overlay` a measured role: `overlayWashPairs` composites the
scrim over the surfaces a dialog covers and holds the result to the `surface`
floor. It chose four — `background`, `card`, `muted`, `popover` — and excluded
the row washes with this reasoning:

> Row washes are deliberately not scrim surfaces: the pointer leaves the row to
> reach the dialog, so a scrim over a transient hover is not a composition the
> system supports.

The reasoning is sound for `hover`/`active`/`accent`, which are **transient**
pointer states. It does not hold for the two surfaces it swept up with them:

- **`selected`** is a *persistent* row state. A table with a selected row, a
  list with a current item and a tree with a focused node all keep that fill
  while a dialog opens over them — the pointer is not required.
- **`input`** is the fill of *every* text field. A settings, rename or
  confirmation dialog opens over a form whose fields are part of the layout
  behind the scrim, and a dialog's own form is inside the dialog, not under it.

So the contract claims to hold the scrim "over the surfaces it covers" while two
surfaces it covers have no pair. Measured on the shipped **macOS light** variant,
an edited theme whose `overlay` is its own `selected` fill:

| Surface behind the scrim | Composited ratio |
| ------------------------ | ---------------- |
| `background` | 1.098:1 |
| `card` / `input` / `popover` | 1.225:1 |
| `muted` | 1.146:1 |
| **`selected`** | **1.000:1** |

`themeContrastFailures` returns `[]` for that theme, because every measured
surface passes and the one that is invisible is not measured. That is exactly
the class of gap plans `074`, `076`, `078`, `081`, `094`, `300`–`347` closed for
other roles: a composition the library supports, a surface it paints on, and no
pair behind it.

The other direction — that adding the two surfaces would fail a shipped set — is
false. A probe over all 24 shipped colour sets (identity × 2 modes × 2 contrast
levels, three platform variants × 2 modes, two recipes × 2 modes) finds the
tightest pair at **1.164:1** (macOS dark, `overlay` on `input`), comfortably
above the 1.05:1 floor. **No colour moves.**

## 2. Decision (do not re-litigate)

- **Add `input` and `selected` to `overlaySurfaces`, between `muted` and
  `popover`** — the order is the documentation order the other surface lists
  use (plain surfaces, then the quiet panel, then the field, then the
  persistent fill), and `overlayWashPairs` derives from it.
- **Keep `hover`, `active` and `accent` out.** They are transient: reaching the
  dialog removes the pointer from the row. The `selected` fill persists, and
  `input` is part of the layout, not a pointer state.
- **Do not add `secondary` or the filled families.** A dialog over a raised
  `secondary` control is conceivable but no shipped composition places a modal
  over a filled action's face; `selected` and `input` are the two surfaces the
  shipped components actually keep on screen under a modal.
- **No new colour, role or floor.** Two pairs: 4 → 6 scrim pairs.

## 3. Exact files and changes

### 3.1 `packages/tokens/src/contrast.ts`

1. Replace the `overlaySurfaces` comment and value:

   ```ts
   /**
    * The surfaces a modal scrim covers. A dialog's scrim is painted across the
    * window, so the app's base layout is behind it: the canvas, a card, the quiet
    * panel, the field fill a form paints, the persistent `selected` fill a table
    * or list keeps and the floating surface a menu opens on. A scrim that
    * composites to its own surface is an invisible modal backdrop, so each is
    * held to the `surface` floor.
    */
   export const overlaySurfaces = [
     "background",
     "card",
     "muted",
     "input",
     "selected",
     "popover",
   ] as const;
   ```

2. Replace the `overlayWashPairs` comment's exclusion sentence:

   ```ts
   /**
    * The scrim composited over the surfaces it covers. The pointer washes
    * (`hover`, `active`, `accent`) are deliberately absent: the pointer leaves
    * the row to reach the dialog, so a scrim over a transient state is not a
    * composition the system supports. `selected` is persistent and `input` is a
    * layout surface, so both are measured.
    */
   ```

3. In `themeContrastFailures`'s JSDoc, the sentence naming the scrim surfaces
   says "the base surfaces it covers" — leave it (generic) unless it enumerates
   four; it does not.

### 3.2 `packages/tokens/src/overlay-scrim.test.ts`

1. Header comment: "the four base surfaces" → "the six surfaces a dialog covers
   — the four base surfaces, the `input` fill a form paints and the persistent
   `selected` fill", and add the plan-359 finding (macOS light's own `selected`
   as the overlay measured 1.000:1 while the checker returned `[]`).
2. The list case becomes:

   ```ts
   it("covers the six surfaces a dialog sits on", () => {
     expect(overlayWashPairs).toEqual([
       ["overlay", "background", "surface"],
       ["overlay", "card", "surface"],
       ["overlay", "muted", "surface"],
       ["overlay", "input", "surface"],
       ["overlay", "selected", "surface"],
       ["overlay", "popover", "surface"],
     ]);
   });
   ```

3. Add the regression case:

   ```ts
   it("reports a scrim that disappears on a selected row", () => {
     const macos = getPlatformTheme("darwin", "light");
     const regressed = extendTheme(macos, {
       colors: { overlay: macos.colors.selected },
     });
     expect(themeContrastFailures(regressed)).toEqual([
       {
         foreground: "overlay",
         background: "selected",
         wash: "overlay",
         pairClass: "surface",
         floor: contrastFloors.default.surface,
         ratio: 1,
       },
     ]);
   });
   ```

   Before this plan the same theme returned `[]`; that assertion is what proves
   the pair is load-bearing.

### 3.3 `packages/tokens/src/contrast.test.ts`

Only the header comment: "measured over the four base surfaces" → "over the six
surfaces a dialog covers — the base surfaces, the `input` fill and the
persistent `selected` fill". No assertion changes.

### 3.4 `docs/tokens.md`

1. The scrim paragraph (currently "The modal scrim is measured the same way …
   base surfaces — `overlaySurfaces` is `background`, `card`, `muted` and
   `popover` — and holds the painted value to the `surface` floor … Row washes
   are deliberately not scrim surfaces: the pointer leaves the row …"):
   rewrite to name six surfaces and separate the transient exclusion from the
   two persistent ones, and state the measured regression (macOS light
   `overlay: selected` → **1.000:1** on the selected row while the checker
   returned `[]`; tightest shipped pair 1.164:1, macOS dark on `input`).
2. The verification paragraph ("composites `overlay` over `background`, `card`,
   `muted` and `popover`") → six surfaces, same order as `overlaySurfaces`, and
   add the transient note.
3. Do **not** touch any numeric table, the pair-count history, or the
   role counts — `contrastPairs.length` is unchanged.

### 3.5 `docs/design-system.md`

1. §7 (Radii, borders and elevation) paragraph on layering: if it enumerates the
   scrim surfaces, name six; otherwise leave it.
2. §9 table row: `modal scrim (`overlay` composited over
   `background`/`card`/`muted`/`popover`)` →
   `…/popover`/`input`/`selected`, in `overlaySurfaces` order.
3. §9 prose: "`overlay` over the four base surfaces" → "over the six surfaces a
   dialog covers — the four base surfaces, the `input` fill a form paints and
   the persistent `selected` fill".

### 3.6 `packages/tokens/README.md`

"`overlay` composited over the four base surfaces and held to 1.05:1" → six
surfaces, plus one sentence on the persistent/transient split and the
1.164:1 tightest pair.

### 3.7 `COMPONENTS.md`

The **Theme contrast check** row is guarded by `inventory.test.ts`, which derives
`${overlayWashPairs.length} scrim pairs`; update `4 scrim pairs` → `6 scrim
pairs` (the guard fails otherwise). Add a short clause: the scrim is measured on
the field fill and the persistent selected row as well as the four base
surfaces, because a dialog opens over a form or a table.

### 3.8 `.agents/slop/plans/README.md`

Table row for `359` (Phase F, depends on 099/309/347/358, done) and a paragraph
after `358`'s describing the exclusion the plan corrects and the 1.000:1
finding.

### 3.9 `TODO.md`

Tick a new row under the design-tokens section and bump the bar:

```md
`[x]` Hold the modal scrim on the two persistent surfaces a dialog opens over —
`selected` is a row state that stays while the pointer moves to the dialog and
`input` is the fill of every field behind it, yet plan 099 excluded them with
the transient pointer washes; an overlay equal to macOS light's `selected`
measured **1.000:1** on that row while `themeContrastFailures` returned `[]`.
Six scrim pairs now, every shipped set passes (1.164:1 at the tightest), so no
colour moves (plan 359)
```

## 4. Commands and expected results

From `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

```sh
nub run --filter @gpuixui/tokens test
# expected: 73 files pass; overlay-scrim.test.ts gains its regression case.

nub run check
nub run lint
nub run test
# expected: exit 0. `check:tests` must accept the new case (it asserts the
# exact failure, not a stub).
```

## 5. Test plan, including both directions

1. **Green baseline** after the change: the full tokens suite passes.
2. **Direction A — the pair is load-bearing.** Revert
   `overlaySurfaces` to the four base surfaces (a one-line edit); run
   `nub x vitest run src/overlay-scrim.test.ts`; the new regression case must
   fail with `[]` instead of the `selected` failure, and the six-surface case
   must fail on the list. Restore → green.
3. **Direction B — the shipped sets are really held.** Set the identity light
   `overlay` to `#FFFFFF` (the card, input and popover fill) in
   `packages/tokens/src/color.ts`; run the suite; the "veils every surface a
   dialog covers" case must fail with `light: overlay on card: expected 1 to be
   greater than or equal to 1.05`. Restore → green.
4. Record both outputs in the commit message.

## 6. STOP conditions

- Any shipped colour set fails the new pairs. **STOP** and report the set and
  surface with its ratio; do not lower the floor and do not move a role.
- `docs.test.ts`'s derived counts fail for a reason other than the scrim
  sentence you were told to update (it derives `inventory`'s scrim count and the
  floor table; the pair history uses `contrastPairs.length`, which must **not**
  change).
- The regression theme reports more than the one `selected` failure — that means
  macOS light's `selected` is also within the floor of another surface; report
  the extra entries instead of weakening the assertion.

## 7. Acceptance

- `overlaySurfaces` is the six-surface list in documentation order;
  `overlayWashPairs` is six pairs; the regression theme fails with exactly the
  `selected` entry and the pre-change code returns `[]`.
- Every shipped set passes (tightest 1.164:1).
- All four documents name the six surfaces and the transient/persistent split;
  the ledger's scrim count is derived and correct.
- `nub run check`, `nub run lint`, `nub run test` pass.

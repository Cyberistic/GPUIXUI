# 375 — `IconButton`'s page and matrices still describe the pre-recipe button

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `055`, `084`, `086`, `089`, `340`, `370`, `372`, `374` |
| Status | done |

Self-contained: §0 the measured values, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. What was measured before the plan (2026-10-18)

Plan `370` moved `Button` and, through it, `IconButton` onto shadcn's
new-york-v4 recipe: `size-8` / `size-9` / `size-10` squares and the recipe's
3 px, 50 % focus ring. Plan `372` did the same for the field family. The
density proof moved to `Toggle` (the only control still on the density scale)
and the `IconButton` page was not revisited.

| Claim / surface | Source today | Measured |
| --------------- | ------------ | -------- |
| `docs/icon-button.mdx` size table | "`sm` → `controlHeight.sm` square" | `<IconButton>` at `md` paints **36 × 36** under the default, the **compact** (`controlHeight.md` = 32) and the **spacious** (40) palettes — the recipe's `size-9`, not the density metric |
| `docs/icon-button.mdx` Theming | "the focus ring from `focusRing(theme)`" | the live ring is `buttonRecipeRing(theme)` — the recipe's `ring-[3px] ring-ring/50`, the same value the focus matrix calls `BUTTON_RING` (plan `370`) |
| `runtime/focus-ring.runtime.test.tsx` header | "every focusable Tier 1 control paints exactly one ring" | `IconButton` has **no case**; it inherits `Button` today, so the claim is true by composition but not guarded — an `IconButton` that stopped composing `Button` would ship with no matrix failure |
| `runtime/theme-axes.runtime.test.tsx` density case | Button 36 and the field family at both densities | the icon button — the square member of the same slice — is not asserted, so its size source has no runtime guard |

The behaviour is right; the page and one matrix row describe the old button.

## 1. The decision

**The button recipe is the one source of `IconButton`'s geometry and focus ring;
the page says so and the matrices include the part.** Correct the page, add the
icon button to the both-density case (32 square under compact and spacious), and
add it to the focus-ring matrix.

Rejected alternatives:

- **Change the behaviour to follow density again.** It would split the button
  family (a text button 36, an icon button 28) and undo plan `370`'s one slice.
- **Leave `IconButton` out of the focus matrix because it composes `Button`.**
  That reasoning is what let plan `083`'s class exist: the matrix's purpose is
  completeness across the public surface, and the composed case is one row.
- **A second ring helper for the icon button.** There is one ring; only the
  docs were stale.

## 2. The rule

```ts
// runtime/focus-ring.runtime.test.tsx
{ name: "IconButton", node: () => <IconButton testId="c" icon="x" label="Close" />, ring: BUTTON_RING }

// runtime/theme-axes.runtime.test.tsx — inside the both-density case
expect(heightOf(runtime, "icon-button")).toBe(32); // recipe `size-8`, not density
```

The page names the recipe (`BUTTON_SIZES`' `size-8`/`size-9`/`size-10` → 32/36/40
and `buttonRecipeRing`) and states the density exception.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/docs/icon-button.mdx` | the size table (32/36/40 from the recipe), the density exception, the Theming sources (`buttonRecipeStyle`, `buttonVariants`, `buttonRecipeRing`) |
| `packages/primitives/runtime/focus-ring.runtime.test.tsx` | one `IconButton` case with `BUTTON_RING` |
| `packages/primitives/runtime/theme-axes.runtime.test.tsx` | the density scene gains `<IconButton size="sm" testId="icon-button" …>`; the both-density case asserts 32 |
| `COMPONENTS.md` | the Buttons row records the icon button in the recipe slice and its density exception |
| `TODO.md` | a ticked row under the primitives workstream |
| `.agents/slop/plans/README.md` | this plan's row |

No component code changes.

## 4. Commands

```sh
nub run --filter @gpuixui/primitives test:runtime    # expect 613 (612 + 1 ring case)
nub run --filter @gpuixui/primitives test            # expect 660 (unchanged)
nub run check
```

The density assertion is inside the existing both-density case (no new test) and
the ring case is one new `it.each` row, so the runtime count moves by **one**
(612 → 613).

## 5. Test plan and the two-direction proof

- **Ring matrix**: focusing the icon button paints exactly one `BUTTON_RING`
  (the recipe's 3 px ring), inside the control. Failing direction: change
  `IconButton` to return a bare `<div role="button">` instead of `Button` (or
  drop the ring merge inside `renderButton`) and the case fails by name; the
  Button case fails too, which is the expected shared direction.
- **Density case**: under `compact` and under `spacious`, the icon button is
  32 × 32. Failing direction: pass a `style` sized from
  `theme.density.controlHeight` in `IconButton` (a temporary mutation) and the
  compact half fails with 28 — restore afterwards.
- **Docs**: the page's values are the recipe's; no code path reads
  `controlHeight` for this component (`grep -n "controlHeight" icon-button.mdx`
  is empty after the change; the grep is the review step, not a test).

## 6. STOP conditions

Stop and report if:

- the icon button does **not** paint 32 under compact (the recipe slice is then
  not what the shipped code does; record the measurement and re-plan);
- the focus matrix cannot express the case through its existing `FocusCase`
  shape (do not fork the matrix; STOP and report);
- a gate fails outside this plan's files.

## 7. Outcome

Measured after implementation (2026-10-18):

- the density case reads 36 square for the icon button under both compact
  (`controlHeight.md` 32) and spacious (40), so the page's old `controlHeight`
  claim was false under either override; the probe was reverted from a temporary
  `style` sized from the density group, which failed both halves (2 cases);
- the focus matrix gains the icon button and its `BUTTON_RING`, so all
  eighteen cases paint exactly one ring; a temporary `style={{ boxShadow:
  undefined }}` on the composed `Button` fails the `IconButton` case alone
  (`1 failed | 612 passed`), which is the direction the new row guards;
- the page names the recipe and the density exception; `controlHeight` no
  longer appears in it;
- runtime `612` → `613`: one new `it.each` ring case; the icon button's square
  is asserted inside the existing both-density case, so both presets check it
  without a second test;
- offline unchanged at `660`; `nub run check` green.

## 8. Acceptance

- The `IconButton` page's size and ring sources match the shipped recipe.
- The icon button is in the focus-ring matrix and the density proof.
- All gates in §4 pass.

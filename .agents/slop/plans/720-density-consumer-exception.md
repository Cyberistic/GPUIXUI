# 720 — The density promise the shipped field family and Button no longer keep

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth).
**Depends on:** 010 (the density scale), 089 (density merges size by size),
353 (component dimensions), 389 (a platform style owns the metrics), and
`primitives` plans `370`–`372` (the shadcn recipe slice that pinned the field
family and the Button).

## 1. The defect

Both documents state that density moves every control:

- `docs/tokens.md` §Density: “Density changes control height, horizontal padding
  and row height only.”
- `docs/design-system.md` §6: “Components read `controlHeight(theme, size)` and
  `controlPaddingX(theme, size)` instead of hardcoding numbers.”

The token half is still true — the preset publishes the three metrics, and
`extendTheme` / `applyPlatformStyle` own them — but the consumer half is not.
The `primitives` workstream moved two families onto the verbatim new-york-v4
recipes (`primitives` plans `370` and `372`, both done):

| Family | Shipped geometry | Source |
| ------ | ---------------- | ------ |
| `Input`, `TextArea`, `Select` trigger, `NumberField`, OTP cells | one **36 px** field at every `size` and every preset | `INPUT_BASE` = `h-9 … px-3 py-1 … text-sm`; `fieldRecipeStyle` ignores `controlHeight`; `Input`/`TextArea` document one field size |
| `Button`, `IconButton` | **32 / 36 / 40** at `sm` / `md` / `lg` in every preset | `BUTTON_SIZES` = `h-8` / `h-9` / `h-10`; `buttonRecipeStyle` maps `sm/md/lg` to the recipe's `sm/default/lg` |

Those heights happen to equal the `spacious` preset's three steps
(`densityPresets.spacious.controlHeight` = `32 / 36 / 40`), which makes the
current prose read as if a density switch still sizes them. It does not: a
`compact` theme renders a 36 px field beside a 24–32 px `Toggle`.

What still follows the preset in the shipped library:

- `Toggle` and `ToggleGroup` — `controlStyle` reads
  `theme.density.controlHeight` / `controlPaddingX` (`primitives/src/core/style.ts`);
- a `Select` option row — `controlHeight.sm` (`primitives/src/components/Select.tsx`);
- the checkbox / radio / switch boxes and the rating markers size from
  `theme.iconSize`, which is a fixed tier and was never a density metric —
  the design system already says so.

So the density proof is `Toggle` (the `primitives` interlock row states the
same), and the documents owe a one-paragraph exception. `primitives/TODO.md`
records this as a **tokens workstream** row.

**Evidence that nothing reads the prose.** There is no test over either
paragraph; the paragraph can be deleted or inverted while every gate stays
green. The existing density guards only hold the token tables
(`docs-numeric-tables`), not the consumer claim.

## 2. Exact changes

### 2.1 `docs/tokens.md` §Density

After the preset table (before the `controlHeight` example), add:

```md
The preset publishes those three metrics; it cannot force a control to read
them. Two families in the `primitives` package take their geometry from the
shadcn recipes instead: the text-entry field family — `Input`, `TextArea`, a
`Select`'s trigger, `NumberField` and the OTP cells — is one 36 px box at every
size and preset, and a `Button` (its square `IconButton` included) is
32 / 36 / 40 at `sm` / `md` / `lg` in every preset, the `spacious` preset's
three steps. `Toggle` and `ToggleGroup` still read `controlHeight` /
`controlPaddingX`, and a `Select` option row still uses `controlHeight.sm`, so
those are the density proof. A component that wants the preset to own its
geometry reads `controlHeight(theme, size)` the way `Toggle` does.
```

The `controlHeight(theme, "md")` example below it stays: it teaches the metric,
not a consumer's chrome.

### 2.2 `docs/design-system.md` §6

Replace the sentence “Components read `controlHeight(theme, size)` and
`controlPaddingX(theme, size)` instead of hardcoding numbers.” with:

```md
The preset publishes the metrics; a control still has to read them. `Toggle`,
`ToggleGroup`, a `Select` option row and any component reading
`controlHeight(theme, size)` / `controlPaddingX(theme, size)` follow the preset.
Two families in the `primitives` package follow the shadcn recipes instead: the
text-entry field family (`Input`, `TextArea`, a `Select` trigger, `NumberField`
and the OTP cells) is one 36 px box at every preset, and a `Button` is
32 / 36 / 40 at `sm` / `md` / `lg` in every preset — the `spacious` steps — so a
density switch does not reflow either family. The density proof is `Toggle`.
```

Nothing else on the page changes: the three preset rows and the icon/avatar
paragraph stay true.

### 2.3 `packages/tokens/src/density-exception.test.ts` (new)

Read both documents the way `docs-links.test.ts` does, slice each density
section, and hold the exception to the package's own data:

- both sections name `primitives`, the field family, `36`, `32 / 36 / 40`, and
  the `spacious` steps;
- the numbers are **true of the tokens**: mapping `controlSizes` over
  `densityPresets.spacious.controlHeight` equals `[32, 36, 40]`, and the field's
  36 is the `md` step of that preset;
- the claim is meaningful in every other preset: `compact.md` and
  `comfortable.md` are not 36 and their full ladders are not `32/36/40`, so the
  exception is not a description of the default preset;
- the density proof is named: `Toggle`, `ToggleGroup` and `controlHeight.sm`
  for the option row;
- the old unconditional sentence is **absent** from both sections (this is the
  regression direction: restoring it fails the case);
- the sections still carry the preset table/rows, so the edit did not replace
  the scale with the exception.

Hard-code the shipped shadcn heights (`[32, 36, 40]`, `36`) in the test with a
comment naming `primitives` plans `370`/`372`: they are an external consumer
fact, not a token value, and the test's job is to hold the documents to the
fact and to the preset arithmetic that makes the sentence honest.

### 2.4 `COMPONENTS.md` — the Design tokens row

Add one clause to the existing row's density sentence: the preset still owns
`controlHeight` / `controlPaddingX` / `rowHeight`, and the shipped
`primitives` field family and Button are pinned to the shadcn heights, so the
inventory does not read as if every control moves. No status change: the row
stays `wip` for the reasons it already records.

### 2.5 `TODO.md`

Add one completed row under *Design tokens and theming* describing this docs
truth pass and naming plan `720`; move the progress bar from `326/403` to
`327/404`.

## 3. Commands

```sh
# 1. The new guard must fail before the docs edit (STOP if it passes):
#    write the test first, then
nub run --filter @gpuixui/tokens test -- density-exception

# 2. Apply 2.1 and 2.2, then the guard:
nub run --filter @gpuixui/tokens test -- density-exception

# 3. The docs' own guards and the snippet guard:
nub run --filter @gpuixui/tokens test -- docs.test docs-links snippets

# 4. The package gate:
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types

# 5. Repo gates (end of task):
nub run check
nub run lint
```

Expected: step 1 fails on the missing exception; step 2 passes; step 3–4 green;
step 5 green.

## 4. STOP conditions

- `primitives`' current source does not contain the pinned field/Button heights
  (re-check `primitives/src/core/recipes.ts` before writing the prose). If the
  slice has been reverted, stop and report — do not document a behaviour that
  is not shipped.
- A preset other than `spacious` carries `32 / 36 / 40` or the field height, or
  `controlSizes` gains a member: stop; the parenthetical needs a new owner.
- Any existing docs guard fails for a reason other than the new text: stop and
  report the failure rather than editing the guard.

## 5. Test plan

`density-exception.test.ts` (new) — 5 cases:

1. **Both sections state the exception** — the four facts above are present.
2. **The arithmetic is the package's** — `spacious` is exactly `32/36/40`, the
   field's 36 is its `md` step, and the sentence's numbers match.
3. **The other presets differ** — compact and comfortable do not carry the
   pinned ladder, so “in every preset” is a real claim.
4. **The density proof is named** — `Toggle`, `ToggleGroup`, `controlHeight.sm`.
5. **The old claim is gone** — “Components read … instead of hardcoding numbers”
   and “Density changes control height, horizontal padding and row height only.”
   are absent from the two sections.

Two-direction proof: write case 5 first with the current documents → fails on
the old sentence; apply 2.1/2.2 → passes. Then delete the exception paragraph
from `docs/design-system.md` → case 1 fails; restore → passes. Record both runs
in the commit body.

## 6. Acceptance

- [ ] Both documents state the exception with the pinned heights and the
      density-driven proof.
- [ ] The new guard fails without the prose and passes with it.
- [ ] `nub run --filter @gpuixui/tokens test` and `check-types` green.
- [ ] `nub run check`, `nub run lint` green.
- [ ] `TODO.md`, `COMPONENTS.md` and the plan index carry the row.
- [ ] No token value, preset, pair, floor, metric or shipped theme moves; no
      API ships, so no new example is needed (the page's density snippets stay).

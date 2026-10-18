# 338 — The filled control's designed family, in one call

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth + consumer interlock) |
| Owner | `tokens-theme` — `packages/tokens`, `docs/tokens.md`, `docs/design-system.md` |
| Depends on | 055 (designed hovers), 097 (the filled state matrix), 327 (the accent family), 334 (the secondary wash guard) |
| Status | done |

The package documents the filled-control matrix as the state a component
paints, and every designed step is contrast-checked. The two shipped consumers
have **not** migrated: they still composite an alpha fill over whatever sits
behind the control for hover and press, and nothing states — or measures — what
that costs the label. This plan pins the measured cost, ships the one-call
replacement (`filledControl`) so the migration has a discoverable API, and
records the consumer work. It changes **no** colour value, contrast pair or
floor.

## 1. Evidence — the shipped compositions

Both consuming packages are read from their worktrees, not edited.

- `components/packages/components/src/internal/button.tsx`:
  - `primary` — `hover: { backgroundColor: alpha(theme.colors.primary, 0.5) }`
    (line ~66), comment: *"Tokens ship no `primaryHover`"* — false since plan 055;
  - `danger` — `hover: { backgroundColor: alpha(theme.colors.destructive, 0.5) }`;
  - no `active` state; the label stays `primaryForeground` /
    `destructiveForeground` through the hover.
- `primitives/packages/primitives/src/core/variants.ts`:
  - `filled()` paints `hover: alpha(fill, 0.9)` and `active: alpha(fill, 0.8)`
    for `primary`, `secondary` and `destructive`;
  - the toggle paints `alpha(accent, 0.9)` / `alpha(accent, 0.8)`;
  - the foreground is the family's `xForeground` on every state.

The token package already ships opaque `xHover`/`xActive` for all four families,
but a consumer reading only the `Theme` interface has no single call that names
them; `statusTone` had the same problem for the four soft roles before plan 014.

### 1.1 Measured cost, all shipped sets, four surfaces

`alpha(fill, opacity)` composited with `compositeOver` over `background`,
`card`, `popover` and `muted`, then the family's foreground measured with
`contrastRatio`. Worst case across the identity themes, the three platform
variants and both recipes:

| Family | Opacity | Consumer | Worst label ratio | Where |
| ------ | ------- | -------- | ----------------- | ----- |
| `primary` | 0.5 | `components` | **2.06:1** | Linux light, card |
| `destructive` | 0.5 | `components` | **2.24:1** | identity light, card |
| `primary` | 0.9 | `primitives` | **4.02:1** | macOS light, card |
| `primary` | 0.8 | `primitives` | **3.40:1** | Linux light, card |
| `destructive` | 0.9 | `primitives` | **4.43:1** | identity light, card |
| `destructive` | 0.8 | `primitives` | **3.75:1** | identity light, card |

Every row is under the 4.5:1 on-colour floor the package states for a filled
control's label. The 50% case cannot be repaired in the palette: even a black
fill tinted at 50% over a white card carries white text at only **4.00:1**
(`compositeOver(alpha("#000000", 0.5), "#FFFFFF")` = `#7F7F7F`). The only fix is
the designed opaque step.

`secondary` and `accent` survive the alpha because their foregrounds sit far
from their fills (worst 5.86:1 and 10.58:1); the plan leaves them out of the
claim, not the contract.

## 2. Design decisions

1. **A helper, not a new role.** The roles exist and are measured. Ship
   `filledControl(theme, family)` returning `{ background, foreground, hover,
   active }`, with `filledControlFamilies` as the ordered index and
   `FilledControlFamily` derived from it — the shape `statusTone` already uses.
2. **No contrast pair.** A pair for `primaryForeground` over
   `alpha(primary, 0.5)` would bless a composition no palette can make pass and
   fail every shipped theme. Plan 332's precedent applies: the wrong
   composition is a TODO row plus evidence, not a pair. The designed steps are
   already held by `contrastPairs`.
3. **The evidence is guarded.** The quoted ratios are derived in `docs.test.ts`
   from the shipped themes and `compositeOver`, the way plan 336 pinned the
   catalogue's other figures, so a palette edit cannot leave the page quoting a
   number the package no longer produces.
4. **The helper does not decide layout.** It returns roles only; a component
   spreads them into `StyleDesc.hover`/`active` itself, exactly like
   `statusTone`.

## 3. Exact changes

### 3.1 `packages/tokens/src/styles.ts`

Add after `statusTone`:

```ts
export const filledControlFamilies = [
  "primary",
  "secondary",
  "destructive",
  "accent",
] as const;

export type FilledControlFamily = (typeof filledControlFamilies)[number];

export interface FilledControlStyle {
  readonly background: string;
  readonly foreground: string;
  readonly hover: string;
  readonly active: string;
}

export function filledControl(
  theme: Theme,
  family: FilledControlFamily,
): FilledControlStyle;
```

with JSDoc that states why the state is opaque (the 2.06:1 alpha composite, the
surface-dependent colour), and a short `tsx` example. No import changes: the
body only indexes `theme.colors` with template-literal keys, all of which exist.

### 3.2 `packages/tokens/src/filled-control.example.ts` (new)

The executed example: `filledControlStyles(theme, family)` returns
`{ rest, hover, press }`, each `{ backgroundColor, color }`, mirroring
`toggleOnPaints` in `accent-states.example.ts`. Imported by the test, so the
snippet in the docs is compiled.

### 3.3 `packages/tokens/src/filled-control.test.ts` (new)

Header comment states the bug being guarded: the shipped alpha hover/press
drops the label to 2.06:1 at 50% (Linux light card) and 3.40:1 at 80% (Linux
light card), under the 4.5:1 on-colour floor; the package cannot repair a
translucent fill, so it ships the designed trio and pins both directions.

Cases:

1. `returns a distinct resting fill for every family` — the four families
   resolve to four different `background` values on the light theme, so a
   copy-paste in the mapping fails.
2. `holds the label to the on-colour floor on all three designed fills` —
   every shipped set (identity light/dark + high contrast, the three platform
   variants both modes, both recipes both modes) × every family × rest/hover/
   press, at the floor the theme declares.
3. `the alpha composite the consumers still paint misses the floor` — for
   every shipped set, `primaryForeground` over `alpha(primary, 0.5)` on a card
   is `< 4.5`; the same for `destructiveForeground`, and the primitives'
   0.9/0.8 steps for `primary` and `destructive`. Assert the worst shipped
   value equals the documented 2.06 (Linux light) and 3.40 (Linux light) in the
   two probes that matter, so the evidence cannot silently improve while the
   docs still say "unreadable".
4. `the executed example paints the same states as the helper` — run
   `filledControlStyles` for all families on the dark theme and assert each
   returned state's colour is the foreground and its fill is the matching
   helper value.

### 3.4 `packages/tokens/src/docs.test.ts`

Inside `describe("docs/tokens.md quoted tightest figures")` (it already owns
`quotedSets`), add:

- `quotes the worst alpha-hover label ratios` — derive the six worst
  family/opacity/surface ratios from `quotedSets`, `alpha` and `compositeOver`;
  assert each equals the documented value and theme label and that
  `markdownProse` contains `` **<value>:1** (<label>, card) ``.
- `quotes the ceiling a translucent fill cannot pass` — derive
  `contrastRatio("#FFFFFF", compositeOver(alpha("#000000", 0.5), "#FFFFFF"))`
  (`4.00`), assert the page states it and names `filledControl`.

Extend the file header's plan list with one sentence for 338.

### 3.5 `docs/tokens.md`

1. Replace the closing of the `## Colour roles` filled-control paragraph (the
   paragraph that begins "The filled-control states are designed roles…") with
   the migrated/not-migrated split:
   - the designed trio and its contract (already there);
   - the shipped consumers still alpha-composite: `components` at 50%,
     `primitives` at 90%/80%, and the stale "tokens ship no `primaryHover`"
     comment;
   - the measured table above in one sentence, formatted
     `**2.06:1** (Linux light, card)` … `**3.75:1** (identity light, card)`;
   - the ceiling sentence ("even a black fill tinted at 50% over a white card
     carries white text at only **4.00:1**");
   - the one-call fix: a `filledControl(theme, family)` snippet and the sentence
     that `filledControlFamilies` is the index.
2. `## Types`: add `FilledControlFamily` and `FilledControlStyle` in
   alphabetical order (after `ElevationShape`, before `FocusRing`).
3. `## Using tokens in components`: add rule 6 — a filled control reads
   `filledControl`; never composite `alpha(fill, …)` for a state.
4. `## For documentation sites`: add `filledControlFamilies` to the sentence
   that lists the ordered indexes.

### 3.6 `docs/design-system.md`

In §8, after the paragraph that introduces the designed family, add one short
paragraph: the shipped consumers still composite the state, the label was
designed for the opaque fill, the measured worst is 2.06:1 at 50% and 3.40:1 at
80% (Linux light, card), under the 4.5:1 every designed step clears, and
`filledControl(theme, family)` is the one-call replacement.

### 3.7 `packages/tokens/README.md`

Under "Extending a theme" (after the brand-family paragraph), one short
paragraph on `filledControl` with no new numeric claim (the measured evidence
lives in the reference, where it is guarded).

### 3.8 `COMPONENTS.md`

Append to the `Filled control states` row: the shipped consumers still
composite alpha (50% and 90/80%), which measures 2.06–4.43:1 for the label,
under the 4.5:1 floor; `filledControl(theme, family)` is the one-call
replacement, and the consumer migration stays cross-team (plan 338).

### 3.9 `TODO.md`

- Add and tick one workstream row for this plan; update the section bar from
  `105/138` to `106/139`.
- Add one cross-team row (owner `components` and `primitives`, plan 338) naming
  the measured 2.06:1 / 3.40:1 label failures and `filledControl`.

## 4. Exact commands

```sh
nub run --filter @gpuixui/tokens test          # expected: exit 0, 58 files green
nub run --filter @gpuixui/tokens check-types   # expected: exit 0
nub run check:tests                            # expected: exit 0
nub run lint                                   # expected: exit 0
nub run fmt                                    # expected: exit 0
nub run check                                  # expected: exit 0
```

## 5. Test plan — prove both directions

1. Land the code, example and tests without the docs changes; run the tokens
   suite. Expected: the new `docs.test.ts` cases fail (the page does not quote
   the figures), the `filled-control.test.ts` cases pass.
2. Add the docs text; run again. Expected: green.
3. Temporarily set `primaryHover` to `primaryForeground` in `lightColors`; run
   `filled-control.test.ts`. Expected: `holds the label to the on-colour floor`
   fails for `primary` rest/hover/press. Revert with
   `git checkout -- packages/tokens/src/color.ts`.
4. Temporarily change the helper's `hover` to read `${family}Foreground`; run
   the suite. Expected: the floor case fails on the hover fill. Revert.
5. The docs cases fail when the figures or the helper name are removed, so they
   are not tautologies.

## 6. STOP conditions

Stop and report if:

- a shipped theme already clears the 4.5:1 floor for `primary` at 50% — the
  evidence table would be wrong and the plan must be re-scoped to whatever the
  current worst is;
- the fix would require editing `packages/components` or `packages/primitives`
  — those are other workstreams; record them in `TODO.md`;
- a change would move a colour value, a contrast pair or a floor — this plan is
  additive: four public names, one example, tests and prose;
- the TypeScript compiler rejects a template-literal index into `ThemeColors` —
  then the helper needs an explicit record of the five role names per family,
  still with no colour change;
- any command in §4 fails for a reason other than the new assertions.

## 7. Acceptance criteria

- `filledControl`, `filledControlFamilies`, `FilledControlFamily` and
  `FilledControlStyle` are public, documented in `docs/tokens.md` (Types index
  and the filled-control section) and re-exported through `index.ts` by the
  existing `export *`.
- The executed example and the four test cases exist and were run.
- The documented ratios are derived by `docs.test.ts` and fail when the page or
  the palette drifts.
- `docs/design-system.md`, `COMPONENTS.md` and `TODO.md` state the shipped alpha
  failure and the cross-team migration.
- Every command in §4 passes.

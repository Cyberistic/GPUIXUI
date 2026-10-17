# 306 — The inactive control: a readable label and an edge that holds its shape

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
014, 056–062, 071, 073, 076, 084, 086–088, 094, 095, 097 · **Touches:**
`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
`packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`, this index

## 1. The defect

`disabled` and `disabledForeground` are the library's inactive state. Both are on
the contract's exemption list with this reason:

```ts
["disabled", "an inactive surface; WCAG exempts inactive controls, and the design system requires a visible dim rather than a floor"],
["disabledForeground", "the text of that inactive state; same exemption"],
```

The exemption is about **contrast floors**, and WCAG 1.4.3 really does exempt
inactive components. It is not a licence for the state to be unreadable or
shapeless, and the shipped result is both.

**(a) The label is unreadable.** `disabledForeground` is painted by a real
component — a disabled `Select` item paints it directly on the menu's `popover`
surface with no fill behind it (`packages/primitives/src/components/Select.tsx:98`,
`backgroundColor: undefined`). Measured on the ten shipped colour sets:

| Set | on `popover` | on `disabled` | on `active` |
| --- | ------------ | ------------- | ----------- |
| light | 2.37 | **2.09** | 1.87 |
| dark | 2.26 | 2.26 | 1.99 |
| high-contrast light | 6.90 | 5.63 | 4.75 |
| high-contrast dark | 5.34 | 3.93 | **3.15** |
| macOS light | 2.37 | 2.09 | 1.73 |
| macOS dark | 2.10 | 2.26 | 1.56 |
| Linux light | 2.37 | 2.09 | 1.74 |
| Linux dark | **1.99** | 2.26 | 1.42 |
| Windows light | 2.37 | 2.09 | 1.79 |
| Windows dark | 2.13 | 2.26 | 1.44 |

A disabled option in a menu is 1.99:1 on Linux dark and 2.09:1 on the identity —
a label the reader cannot read, in a menu they opened to find out what is
unavailable. The AAA dark set is 3.15:1 on the pressed wash, under the 4.5:1 that
theme adopts for every other non-text floor.

**(b) The state is not what the runtime paints.** Every disabled *control* uses
`opacity: 0.5` instead of the roles: `controlStyle` and `fieldStyle` in
`packages/primitives/src/core/style.ts` (`:119`, `:471`, `:607`),
`selectionBoxStyle` in `core/selection.ts`, and the components' own
`opacity: disabled ? 0.5 : 1` in `menu/item.tsx:71`, `list.tsx:423`,
`tabs.tsx:448`, `accordion.tsx:367`, `combobox.tsx:118`, `search-input.tsx:88`.
An alpha composite takes its colour from whatever is behind the control, so the
label's readability depends on the parent surface — the same defect plan 097
closed for filled-control hover and press. Composited, a disabled primary
button's label measures **2.25:1** on the light canvas and 3.05:1 on the dark one;
`colors.disabled` and `colors.disabledForeground` are dead roles in every control
except the Select item.

**(c) The fill cannot carry the shape, and nothing else does.** Identity light
`disabled` **is** `muted` and `hover` (`1.000:1`), identity dark `disabled` **is**
`popover`, `muted` and `hover` (`1.000:1`); macOS light measures 1.04 and Windows
light 1.03 on the quiet panel. A disabled filled button on a sidebar is a
rectangle the same colour as the sidebar. No single neutral can fix that — the
light surfaces span `#FFFFFF` (`card`) to `#E1E5EC` (`active`), and no grey clears
1.05:1 against both ends of that range — so the *edge* has to carry the shape, and
the divider class never checked `border` on the inactive fill.

**(d) The divider on the quiet panel is unmeasured.** `border` is measured on
`background`, `card`, `popover`, the four control fills and the four soft status
fills, but not on `muted` — the surface a settings sidebar paints, where a
`Separator` between groups actually sits. It passes everywhere today
(1.24–1.33 in the default sets, 4.09–5.04 at high contrast), so this half is a
contract completion, not a colour move.

## 2. Decision (do not re-litigate)

- A new pair class **`inactive`**: **3:1** in the default themes and **4.5:1** in
  the high-contrast themes. WCAG exempts inactive components from 1.4.3/1.4.11;
  the library keeps them *dimmed* (the role stays far below `mutedForeground`,
  which clears 7.57:1 at its worst) but *readable*, because the whole point of a
  disabled control is that a reader can find out what is unavailable. 3:1 is the
  library's existing non-text floor; the AAA variants raise every non-text floor
  to 4.5, so they raise this one too. This is a **design floor**, stated as such
  in both documents; it is not claimed as a WCAG requirement.
- `disabledForeground` is measured on every surface an inactive label paints:
  its own `disabled` fill, the four plain surfaces (`background`, `card`,
  `popover`, `muted` — a disabled menu item is a shipped composition on
  `popover`) and the four row washes (`hover`, `active`, `accent`, `selected` — a
  disabled ghost action inside a hovered or selected row). Nine pairs.
- A disabled control keeps its shape with its **`border` edge on the `disabled`
  fill** (divider floor, 1.05:1 / 3:1). `border` is the decorative edge role, not
  `borderStrong`: an inactive control is not an essential boundary. Pairs:
  `border` on `disabled`, and `border` on `muted` for the sidebar divider.
- `disabled` (the fill) **stays exempt**, with a corrected reason: the fill is
  deliberately allowed to sit inside the panel's perceivability floor (no neutral
  can clear both a white card and the quiet panel), and the control's shape is
  carried by the `border` edge now measured on it.
- The `opacity: 0.5` mechanism is **not** the design. The package cannot change
  another workstream's source; it ships the designed pair, floors it and records
  the consumer migration as a cross-team row in `TODO.md`.
- No other colour moves. `highContrastLightColors.disabledForeground` already
  clears 4.5:1 (4.75 at its worst) and stays byte-identical.

## 3. Exact values

| Theme | Role | Before | After | Worst post-fix ratio on the nine surfaces |
| ----- | ---- | ------ | ----- | --------------------------------------- |
| light | `disabledForeground` | `#A1A9B7` | `#6E7787` | 3.57 (`active`) |
| dark | `disabledForeground` | `#545D6C` | `#A1A9B7` | 5.58 (`accent`) |
| high-contrast light | `disabledForeground` | `#5A5A5A` | unchanged | 4.75 (`active`) |
| high-contrast dark | `disabledForeground` | `#8A8A8A` | `#A9A9A9` | 4.62 (`active`) |

Light `#6E7787` is a half-step between neutral 500 and 600, the same convention
`border` uses (`#D6DAE1` sits between neutral 200 and 300): neutral 500
(`#737C8C`) clears the macOS pressed wash by only 3.08:1, and a floor that tight
is the kind this workstream keeps re-opening. Dark `#A1A9B7` is neutral 400 — one
ramp step dimmer than the neutral-300 `mutedForeground`, which is the order the
role needs. `#A9A9A9` is the AAA ramp step that clears 4.5:1 on the `#3D3D3D`
pressed wash.

New pairs:

- `inactive` (9): `disabledForeground` on `disabled`, `background`, `card`,
  `popover`, `muted`, `hover`, `active`, `accent`, `selected`.
- `divider` (2): `border` on `disabled`, `border` on `muted`.

`contrastPairs` moves **133 → 144**.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

1. Add `"inactive"` to `ContrastPairClass` after `"secondary"`, with a one-line
   doc: *an inactive label: dimmed but readable (a design floor, not a WCAG one)*.
2. Add the floors in the same position in both records:

   ```ts
   default: { body: 7, secondary: 4.5, inactive: 3, boundary: 3, surface: 1.05, divider: 1.05 },
   high: { body: 7, secondary: 7, inactive: 4.5, boundary: 4.5, surface: 1.05, divider: 3 },
   ```

3. Add the pair lists beside `bodyTextPairs`:

   ```ts
   /**
    * The surfaces an inactive label paints on: its own `disabled` fill, the plain
    * surfaces a ghost disabled action sits on, and the row washes a disabled
    * control inside a hovered or selected row paints. A disabled `Select` item is
    * the shipped case — it paints `disabledForeground` on the menu's `popover`
    * with no fill behind it.
    */
   const inactiveSurfaces = [
     "disabled", "background", "card", "popover", "muted",
     "hover", "active", "accent", "selected",
   ] as const;

   const inactivePairs: readonly ContrastPair[] = inactiveSurfaces.map(
     (background): ContrastPair => ["disabledForeground", background, "inactive"],
   );
   ```

4. Spread `...inactivePairs` into `contrastPairs` (after the placeholder pair),
   and add `["border", "disabled", "divider"]` and `["border", "muted", "divider"]`
   to the divider group at the end of the list.
5. Extend `themeContrastFailures`'s JSDoc with the inactive class and the two new
   divider pairs.

### 4.2 `packages/tokens/src/color.ts`

- `lightColors.disabledForeground`: `#A1A9B7` → `#6E7787`.
- `darkColors.disabledForeground`: `#545D6C` → `#A1A9B7`.
- `highContrastDarkColors.disabledForeground`: `#8A8A8A` → `#A9A9A9`.
- Rewrite the `disabled` / `disabledForeground` JSDoc on `ThemeColors`: the fill
  is the inactive surface and is deliberately allowed to sit near the panel; a
  disabled control paints its `border` edge on it so the shape survives, and the
  label keeps the `inactive` floor (3:1, 4.5:1 at AAA). Extend the light/dark/AAA
  set comments with one line each naming the new value and why.

### 4.3 `packages/tokens/src/contrast.test.ts`

- `contrastPairs.length` 133 → 144.
- Remove the `disabledForeground` entry from `exempt`; replace the `disabled`
  reason with the corrected one (the fill is allowed inside the panel's
  perceivability floor; the edge carries the shape).
- Add an assertion that `inactivePairs.length` is 9 and the list is the nine
  surfaces in order, next to the neighbouring list assertions.

### 4.4 `packages/tokens/src/inactive-state.test.ts` (new)

Header: *Guards the defect plan 306 fixed: the inactive state was wholly exempt
from the contract, so a disabled `Select` item's label painted at 1.99:1 on Linux
dark and 2.09:1 on the identity, the designed pair measured 2.09:1, `disabled`
was the very value of `muted`/`hover`, and no edge pair held the control's shape.*

Tests:

1. **Every shipped set clears the inactive floor** — identity themes, both AAA
   themes and `getPlatformTheme(platform, mode)` over `inactiveSurfaces`,
   asserting `contrastRatio(disabledForeground, surface) >= contrastFloors[theme.contrast].inactive`.
2. **The shipped composition is the one guarded** — the `popover` pair exists,
   with `pairClass: "inactive"`, and the light/dark values are the new hexes.
3. **The old values are reported by the public checker** — `extendTheme` the
   identity with `disabledForeground: "#A1A9B7"` (light) and `"#545D6C"` (dark),
   assert `themeContrastFailures` reports the exact pairs (`inactive`, floor 3)
   and that the worst ratio is 2.09 / 1.99.
4. **The fill stays exempt but the edge is measured** — `disabled` is on the
   exemption list, and `contrastPairs` contains `["border","disabled","divider"]`
   and `["border","muted","divider"]`; every shipped set clears the divider floor
   on both (asserted through `themeContrastFailures`).
5. **The inactive label stays dimmer than secondary text** — for every shipped
   set, the `disabledForeground` ratio on `disabled` is at least 2:1 below the
   `mutedForeground` ratio on `muted`, so a future fix cannot satisfy the floor by
   making disabled text indistinguishable from secondary text.

The file fails without §4.2 (tests 1 and 3) and without §4.1 (tests 4 and 5).

### 4.5 `docs/tokens.md`

1. Light/dark colour tables: the `disabledForeground` rows become `#6E7787` /
   `#A1A9B7`; the high-contrast row becomes `#5A5A5A` / `#A9A9A9`.
2. In *Verification*: add the `inactive` floor to the floor sentence and a
   paragraph naming the shipped composition (`Select` item on `popover`), the
   1.99:1 / 2.09:1 figures, the fill exemption and the edge pairs.
3. The completeness paragraph: “the four that are not pairs” → “the three”, drop
   `disabledForeground`, keep `disabled` with the new reason, and name the inert
   class among the measured ones.
4. The floors block (`contrastFloors.default; // {...}`) must be regenerated from
   the new records, including `inactive`.

### 4.6 `docs/design-system.md`

1. §8 state table, `disabled` row: `disabled` fill + `disabledForeground` (3:1,
   4.5:1 at AAA) + a `border` edge, and the non-colour cue; no `opacity: 0.5`.
2. §9 table: add an `inactive label (disabledForeground on …)` row at 3:1 / 4.5:1,
   and name `muted` in the divider row.
3. §9 “Not covered, deliberately”: remove the disabled-text bullet and replace it
   with a note that WCAG exempts inactive components from its floors while the
   library still requires a readable, shaped inactive state.
4. One sentence in §8 explaining why the fill may equal the panel: no neutral can
   clear a white card and the quiet panel at once, so the edge carries the shape.

### 4.7 `packages/tokens/README.md`

In the contrast paragraph: the inactive label is measured on its fill, the plain
surfaces and the four washes at 3:1 / 4.5:1, the disabled edge joins the divider
class, and a disabled control is not an opacity composite (plan 306).

### 4.8 `COMPONENTS.md`

- *Theme contrast check* row: pair count 133 → 144, floor table gains
  `inactive: 3` / `inactive: 4.5`, the exemption sentence drops
  `disabledForeground` and gains the plan 306 clause.
- *Design tokens* row: one clause that the inactive state is measured (label
  3:1 / 4.5:1 on nine surfaces, `border` on `disabled` and `muted`).

### 4.9 `TODO.md`

Tick under **Design tokens and theming (`tokens-theme`)**:

```
`[x]` Make the inactive state readable and shaped — a disabled `Select` item
painted `disabledForeground` on `popover` at 1.99:1 (Linux dark) and 2.09:1
(identity), the designed pair was 2.09:1, `disabled` was exactly `muted`/`hover`,
and nothing held the edge; `inactive` is a 3:1 / 4.5:1 floor on nine surfaces and
`border` on `disabled`/`muted` joins the divider class (plan 306)
```

Add cross-team rows (owner: `primitives`, `components`): replace
`opacity: 0.5` disabled dimming with the designed `disabled`/`disabledForeground`
pair plus the `border` edge, so a disabled control no longer takes its colour from
the surface behind it.

Update the progress bar (73/97 → 74/98, and the new cross-team rows stay
unticked).

### 4.10 Plan index

Add 306 to the `tokens-theme` table with status `done` and a closing paragraph
recording the figures and the floor decision.

## 5. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test -- src/inactive-state.test.ts` | before §4.2: the shipped-set and old-value cases fail at 1.99 / 2.09 |
| 2 | `nub run --filter @gpuixui/tokens test` | all files green |
| 3 | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| 4 | `nub run check` | exit 0 |
| 5 | `nub run lint` | exit 0 |
| 6 | `nub run test` | exit 0 |

## 6. Test plan — proof in both directions

1. Land the contract and the new suite **before** the colours: run it and record
   the failures (light `disabled` pair 2.09:1, Linux dark `popover` 1.99:1,
   high-contrast dark `active` 3.15:1), plus `contrast.test.ts`'s “passes every
   shipped theme” failing for the same pairs.
2. Apply the three values; both suites pass, and test 5 proves the dim is intact.
3. Temporarily restore `#A1A9B7` light / `#545D6C`; the new suite and
   `contrast.test.ts` fail; restore.
4. Temporarily delete the `["border","disabled","divider"]` pair; test 4 fails;
   restore.
5. Temporarily add `disabledForeground` back to `exempt`; `no stale exemption`
   fails; restore.

## 7. STOP conditions

Stop and report, do not improvise, if:

- a chosen value cannot clear the `inactive` floor on every shipped set without
  coming within 0.4:1 of `mutedForeground`'s ratio on the same surface — that
  means the floor and the palette conflict and the decision needs re-argument;
- the light or dark value needs a platform-specific override (it should not: the
  platform styles inherit the identity's inactive pair);
- any existing pair starts failing, which would mean a moved value is shared with
  another contract;
- a change is needed outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md` or `TODO.md` (the consumer migration
  is a TODO row, never an edit in another workstream's tree);
- a step needs `any`, a cast, a retyped surface list, or a lower floor.

## 8. Acceptance

- [x] `inactive` is a pair class with 3:1 / 4.5:1 floors, and
      `disabledForeground` is measured on nine surfaces.
- [x] `border` on `disabled` and on `muted` are measured; `disabled` is measured
      as a surface (so it leaves the exemption list) and `disabledForeground` is
      no longer exempt.
- [x] All ten shipped colour sets clear both new floors on their own values.
- [x] The public checker reports the old values, proven in both directions.
- [x] `docs/tokens.md`, `docs/design-system.md`, the README, `COMPONENTS.md`,
      `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint` and `nub run test` pass — run, not assumed.
- [x] Committed on `agent/tokens-theme` and pushed.

## 9. Outcome (executed on this host, 2026-10-17)

- The defect was real and the new suite caught it before the values moved:
  `holds every shipped set to the inactive floor` failed on the light `disabled`
  pair at **2.09:1** and the dark `popover` pair at **2.26:1**, and
  `contrast.test.ts`'s `passes every shipped theme` failed with the same pairs —
  the public checker and the suite agree, because both read `contrastPairs`.
- Post-fix worst ratios on the nine surfaces: identity light 3.57 (`active`),
  identity dark 5.58 (`accent`), high-contrast light 4.75 (`active`),
  high-contrast dark 4.62 (`active`); macOS 3.31 / 4.37, Linux 3.33 / 3.57 and
  Windows 3.42 / 4.05. The inactive label stays well dimmer than secondary text:
  the identity margins are 4.55 and 3.43, the tightest shipped pair is macOS dark
  at 1.94, and the new suite asserts the ordering so a future fix cannot satisfy
  the floor by erasing the dim.
- The edge carries the shape with no colour move: `border` on `disabled` measures
  1.24–1.64 in the default sets and 3.74–3.93 at AAA, and `border` on `muted`
  1.24–1.53 and 4.09–5.04. The `disabled` fill itself stays where the design put
  it (identity light `#EEF1F5` is still `muted` and `hover`): the contract now
  says, with a reason, why that value is allowed and what has to be visible
  instead.
- `inactivePairs` (nine) and `inactiveSurfaces` are public; `contrastPairs` moved
  **133 → 144** (nine inactive, two divider). `disabled` moved from the exemption
  list to being measured as a surface, so the list is now `scrollbar` and
  `shadow` only.
- Two-direction evidence, run and reverted:
  - **old values**: the new suite, `contrast.test.ts`, `styles.test.ts`,
    `platforms.test.ts`, `docs.test.ts` and the colour tables all fail (17 cases
    named); restored, all pass;
  - **no edge pair**: `keeps the fill exempt by measuring the edge that carries
    the shape`, the pair count, the invisible-divider case and the ledger guard
    fail; restored;
  - **stale exemption**: re-adding `disabledForeground` to the exempt list fails
    `no stale exemption`; restored.
- Green: **40 test files, 1944 tests**. `nub run check`, `nub run lint`,
  `nub run fmt` and `nub run test` were run and passed.
- The consumer half is a `TODO.md` cross-team row, never an edit in another
  workstream's tree: `primitives` and `components` should paint the designed pair
  and the edge instead of `opacity: 0.5`.

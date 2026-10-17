# 318 — The neutral control's edge on its designed hover and press

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
055, 071–095, 097, 306–317 · **Touches:** `packages/tokens`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `TODO.md`, this index

## 1. The gap

Plan 080 gave the decorative `border` role a contract: a bordered control keeps
its edge on the fill behind it, so `border` is measured on `secondary`, `hover`,
`active` and `accent` at the divider floor. That list was written when a
secondary control still hovered and pressed through the generic `hover`/`active`
washes.

Plan 097 then gave every filled control a designed, opaque state family —
`x` → `xHover` → `xActive` — and told the consumer to read it for filled
controls instead of compositing an alpha fill. For the neutral family that means
a bordered secondary control now paints `secondaryHover` while hovered and
`secondaryActive` while pressed. The edge contract was not extended, so the two
new fills have **no pair**, and the shipped light platform styles were never
audited against them:

| Shipped set | `border` | `secondaryActive` | Ratio | Floor |
| ----------- | -------- | ----------------- | ----- | ----- |
| macOS light | `#D1D1D6` | `#D1D1D6` | **1.000:1** | 1.05 |
| Windows light | `#D6D6D6` | `#D6D6D6` | **1.000:1** | 1.05 |
| Linux light | `#D4D2CF` | `#D4D3D1` | **1.009:1** | 1.05 |
| High-contrast light | `#6E7683` | `#B8B8B8` | **2.310:1** | 3 |
| High-contrast dark | `#8A8A8A` | `#4A4A4A` | **2.567:1** | 3 |

The identity light (`#D6DAE1` / `#CBD1DB`, 1.093:1), the identity and platform
darks at the default floor and both recipes clear 1.05:1, so the full suite
stayed green. The two **AAA** sets are the second half of the gap: their divider
floor is 3:1, and the neutral press step sits between the fill ladder and the
divider, so it fails too. This is the exact defect plan 080 described — "an
outlined control's edge disappeared exactly while pressed" — one role generation
later: the pressed fill changed from `active` to `secondaryActive`, and the edge
moved with it into the unmeasured set. `secondaryHover` has no shipped failure
today (1.10–1.18:1 in the three light platforms, 3.98–4.15:1 at AAA) but the
same absence of a pair means a future palette edit can erase it silently.

The omission is also documented as if it did not exist. `docs/tokens.md` and
`docs/design-system.md` both list the fills a bordered control paints as
"`secondary`, `hover`, `active` and `accent`", and the package README repeats
it. The docs are internally consistent with plan 080 and silently behind plan
097.

## 2. Decision (do not re-litigate)

1. Measure `border` on the neutral family's designed states as well as the
   generic washes: `controlFillRoles` gains `secondaryHover` and
   `secondaryActive`. Two `divider` pairs, `contrastPairs` moves **252 → 254**.
   The list becomes `secondary`, `secondaryHover`, `secondaryActive`, `hover`,
   `active`, `accent` — rest, hover, press, then the generic washes and the
   toggle-on fill.
2. Move the failing values one designed step, leaving every other role untouched:
   - macOS light `secondaryActive` `#D1D1D6` → `#C7C7CC` (Apple's `systemGray3`;
     1.107:1 from the border, 1.256:1 from the hover)
   - Linux light `secondaryActive` `#D4D3D1` → `#CAC8C6` (1.106:1 from the
     border, 1.229:1 from the hover)
   - Windows light `secondaryActive` `#D6D6D6` → `#CCCCCC` (1.105:1 from the
     border, 1.217:1 from the hover)
   - High-contrast light `border` `#6E7683` → `#575E6B` (3.289:1 from the
     pressed fill, 4.49 from the hover)
   - High-contrast dark `border` `#8A8A8A` → `#A0A0A0` (3.389:1 from the
     pressed fill, 4.15 from the hover)
   The three light platform pressed fills keep the family's darkening direction
   and clear the 1.05:1 step floor between hover and press;
   `secondaryForeground` stays at 9.99:1 or better on the new press step, and the
   fill still clears the surface floor on the canvas, card, popover and quiet
   panel (1.45–1.68:1). Both AAA dividers move *away* from the neutral ladder
   and still clear 3:1 on every fill and plain surface they divide; the AAA
   `borderStrong` stays stronger (`#4A4F58` light, `#AAAAAA` dark) than `border`.
3. Which value moves depends on the floor, and the reason is directional:
   - At the **default** floor (1.05:1) the three light platform pressed fills are
     within one RGB step of the divider, so the fill moves one step darker. Plan
     080 moved a divider instead because those failing fills were shared washes
     that pulled the focus ring and the accent with them; here the failing value
     is the neutral press step only, so moving the fill keeps every divider in
     those styles unchanged.
   - At **AAA** (3:1) the fill cannot move far enough: a light press darkens
     toward the divider and a dark press lightens toward it, so moving the fill
     in its mode direction *reduces* the ratio. The divider must move away
     instead, which is plan 080's precedent for the AAA `active` wash.
4. Do **not** add `border` on `primaryHover`/`primaryActive`/`destructive*`. Those
   are filled actions with no border; the neutral family is the outlined one.
5. No new role, floor class, helper or export. No platform style other than the
   three light `secondaryActive` values changes; every dark value, the recipes,
   the identity and both AAA sets are untouched.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

Extend `controlFillRoles` and its comment:

```ts
/**
 * The fills a bordered control paints behind its own edge: a secondary
 * control's resting, hovered and pressed fills, the hover and pressed washes an
 * outline control uses, and the accent fill a pressed outline toggle takes.
 * `border` is painted on all six, so the divider floor applies to each.
 */
const controlFillRoles = [
  "secondary",
  "secondaryHover",
  "secondaryActive",
  "hover",
  "active",
  "accent",
] as const;
```

Append to the `contrastPairs` doc comment, after the sentence about the
decorative dividers: the neutral control's designed hover and press steps are
measured as well as the generic washes, so the edge a plan-080 control keeps
cannot vanish when plan 097's state family is read.

Do not change `controlBoundaryPairs`, `ringPairs` or the floors.

### 3.2 Platform styles and the AAA dividers

- `packages/tokens/src/platform-styles/macos.ts`, light `secondaryActive`:
  `"#D1D1D6"` → `"#C7C7CC"`.
- `packages/tokens/src/platform-styles/linux.ts`, light `secondaryActive`:
  `"#D4D3D1"` → `"#CAC8C6"`.
- `packages/tokens/src/platform-styles/windows.ts`, light `secondaryActive`:
  `"#D6D6D6"` → `"#CCCCCC"`.
- `packages/tokens/src/color.ts`, high-contrast light `border`:
  `"#6E7683"` → `"#575E6B"`; high-contrast dark `border`: `"#8A8A8A"` →
  `"#A0A0A0"`.

Extend each platform file's header comment beside the plan-097/080/309
sentences: the pressed neutral step now sits one designed step below the
divider, so an outlined control keeps its edge while pressed (plan 318). Extend
both AAA block comments: the divider sits away from the neutral ladder so the
designed press step keeps its 3:1 edge (plan 318).

### 3.3 `packages/tokens/src/neutral-press-edge.test.ts` (new)

Header comment: state the bug — `border` was measured on the pre-097 fills, the
three light platform styles had `secondaryActive` equal (or within 0.01 of) the
divider, both AAA sets had the press step under their 3:1 divider floor, and a
pressed secondary control lost its edge while every suite stayed green.

Cases:

1. **Pair shape** — the `border` pairs in `contrastPairs` are exactly
   `secondary`, `secondaryHover`, `secondaryActive`, `hover`, `active`,
   `accent`, once each, all `divider`. The published count lives in
   `contrast.test.ts` (254 when this plan landed; plan 319 grows it to 257).
2. **Shipped floors** — every shipped theme (identity light/dark at both
   contrasts, the three real platform styles in both modes and both contrasts,
   and both recipes in both modes) clears the declared divider floor on
   `secondaryHover` and `secondaryActive`. Reuse the theme-list shape from
   `placeholder-surfaces.test.ts`.
3. **The exact default-floor regression** — for `darwin`, `linux` and `win32`
   light, assert `contrastRatio(border, secondaryActive) >= 1.05`. Before §3.2
   this fails at 1.000, 1.009 and 1.000 respectively; the test records the
   current ratios (`1.107`, `1.106`, `1.105`).
4. **The AAA regression** — rebuild `getTheme(mode, "high")` with the old
   `border` (`#6E7683` light, `#8A8A8A` dark) through `extendTheme` and assert
   `themeContrastFailures` reports the `border`/`secondaryActive` pair, class
   `divider`, floor `3`, ratio close to `2.310` / `2.567`. The shipped AAA sets
   clear 3:1 at `3.289` / `3.389`.
5. **The public checker reports an erased edge** — rebuild the identity light
   theme with `secondaryActive` set to its `border` value through `extendTheme`,
   then `themeContrastFailures` reports exactly the `border`/`secondaryActive`
   pair, class `divider`, floor `1.05`, ratio `1`. This case fails if the pair
   is removed from `contrastPairs` (the checker returns `[]`).
6. **The press step is designed, not incidental** — on each of the three fixed
   platform themes, `secondaryActive` is at least 1.05:1 from both its hover and
   the divider, so the fix cannot be reverted by nudging the value back toward
   the edge.

### 3.4 `packages/tokens/src/contrast.test.ts`

The published pair-count case moves `252` → `254`.

### 3.5 `docs/tokens.md`

- The Colour roles intro paragraph that lists the edge fills: “`secondary` at
  rest, the `secondaryHover`/`secondaryActive` steps a filled neutral control
  uses, the `hover`/`active` washes while the pointer moves, and `accent` for an
  outline toggle that is on”.
- The filled-control paragraph (around “Each filled family now steps through
  `x` → `xHover` → `xActive`”): add a sentence that the outlined neutral family
  keeps its `border` edge on all three steps, so the press is a fill change, not
  an edge erasure.
- The Verification paragraph that names the decorative `border` fills: add
  `secondaryHover`/`secondaryActive` to the list.
- The control-edge audit paragraph (“The control edge is held there too … plan
  `080` moved the four dividers”): append the plan-318 sentence — the designed
  neutral steps were unmeasured, macOS light and Windows light measured
  **1.000:1** and Linux light **1.009:1** on the pressed fill, and the AAA sets
  2.310:1 / 2.567:1 under their 3:1 floor, so the three pressed steps and the two
  AAA dividers moved and the contract grew 252 → 254.
- The high-contrast role table's `border` row: `#6E7683` / `#8A8A8A` becomes
  `#575E6B` / `#A0A0A0`. The identity tables do not move.

### 3.6 `docs/design-system.md`

- §7's `border` bullet: name the three neutral steps, not only the resting
  `secondary`.
- §8's closing edge sentence (“A bordered control keeps its `border` edge on the
  fill it paints …”): the list becomes the neutral family's rest, hover and
  press plus the generic `hover`/`active` washes and `accent`.
- §9's divider row: same list (`secondary`/`secondaryHover`/`secondaryActive`/
  `hover`/`active`/`accent`).
- Add one sentence to §8's filled-control paragraph: the neutral family keeps
  its edge through the press; the three light platform pressed steps moved so a
  filled secondary control does not become its own divider.

### 3.7 `packages/tokens/src/docs.test.ts`

- Update the pinned "names every fill the control edge is held against" case:
  the filter list and the expected array gain `secondaryHover` and
  `secondaryActive`, and the pinned sentence from §3.5 changes to “the
  `secondary`, `secondaryHover`, `secondaryActive`, `hover`, `active` and
  `accent` fills a bordered control paints”.
- Update the pinned §9 divider row from §3.6 (verbatim, floors interpolated).
- No other pinned sentence changes: the colour-roles paragraph, the
  filled-control paragraph and the audit paragraph are not held verbatim.

### 3.8 `packages/tokens/README.md`

In the “Checking a theme” paragraph, the decorative `border` list gains
`secondaryHover`/`secondaryActive`, and the plan-080 sentence gains the plan-318
result: the designed neutral steps were not measured, so three light platform
styles had the pressed step equal to the divider (1.000:1 macOS and Windows,
1.009:1 Linux) and both AAA sets sat under their 3:1 floor until the three
values and the two AAA dividers moved.

### 3.9 `COMPONENTS.md`

- `Theme contrast check` row: `the same 252 contrast pairs` → `254`, and append
  a plan-318 clause after the plan-317 sentence — the control edge is measured
  on the neutral family's designed hover and press as well as the generic
  washes, because plan 097's fills replaced the washes a bordered control used;
  macOS light and Windows light measured 1.000:1 and Linux light 1.009:1 on the
  pressed fill, the AAA sets sat at 2.310:1 and 2.567:1 under their 3:1 floor,
  the five values/dividers moved, and the pair count grew 252 → 254.
- `Filled control states` row: add that the neutral family keeps its `border`
  edge on `secondary`, `secondaryHover` and `secondaryActive`, and name the
  three light pressed values that moved.

### 3.10 `TODO.md`

Add under “Design tokens and theming”, ticked:

`[x]` Hold the outlined control's edge on the neutral family's designed hover
and press — plan 097 replaced the generic washes with `secondaryHover`/
`secondaryActive` but the edge was measured only on the pre-097 fills, so macOS
light and Windows light measured 1.000:1 and Linux light 1.009:1 on the pressed
fill, and both AAA sets sat under their 3:1 floor at 2.310:1 and 2.567:1; the
two fills join the divider contract (252 → 254), the three light pressed steps
and the two AAA dividers move one designed step (plan 318).

Move the progress bar from `85/111` to `86/112`.

### 3.11 `.agents/slop/plans/README.md`

Add a row for 318 to the tokens table and a closing paragraph recording the gap,
the two pairs, the five moved values and the resulting count.

## 4. Commands and expected results

Run from the worktree root, in order:

| # | Command | Expected |
| - | ------- | -------- |
| 1 | apply §3.1, §3.2's test, and §3.4, then `nub run --filter @gpuixui/tokens test` | **fails** on the new suite's default-floor case for `darwin`, `linux` and `win32` light (1.000 / 1.009 / 1.000) and on the AAA cases (2.310 / 2.567) — this proves the test catches the shipped defect; the pair-count case is updated at the same time |
| 2 | apply the source changes in §3.2, re-run the same command | the new suite passes |
| 3 | `nub run --filter @gpuixui/tokens test` | all suites green, `contrastPairs.length` is 254 |
| 4 | `nub run check` | exit 0 — test inventory, lint, format and types |
| 5 | `nub run lint` | exit 0 |
| 6 | `nub run test` | exit 0 |
| 7 | `nub run --filter @gpuixui/tokens build` | exit 0 (the package still builds on its own) |

## 5. STOP conditions

Stop and report if:

- a shipped set outside the five audited ones is below the divider floor on
  `secondaryHover` or `secondaryActive` — the audit says macOS/Linux/Windows
  light and the two AAA sets are the only failures; a new failure means the
  premise is stale, so do not move it without a separate decision;
- `secondaryHover` or `secondaryActive` is already in `controlFillRoles` — then
  the gap is elsewhere; report the duplicate instead of adding a second pair;
- a proposed `secondaryActive` value fails the hover→press step floor (1.05:1),
  the `secondaryForeground` floor (4.5:1) or the surface floor on the canvas,
  card, popover or quiet panel — pick the next step and record the ratios rather
  than moving a surface;
- a proposed AAA `border` value drops below 3:1 on any plain surface, control
  fill, `input`, `disabled` or soft status fill it divides, or becomes as strong
  as `borderStrong` — pick the next step and record the ratios;
- satisfying the pair requires touching a consumer package, `contrastFloors`, a
  recipe or the identity palette.

## 6. Test plan

- **Pair presence and class:** case 1 fails if a fill is dropped, duplicated or
  lands in another class; the count pins 254.
- **Shipped floors:** case 2 fails on the three light platform pressed steps
  and the two AAA dividers before §3.2 and on any future palette edit that moves
  `secondaryActive` back toward `border`.
- **Regression:** cases 3 and 4 fail before §3.2 with the exact shipped ratios
  and pass after; they are the guards the workstream requires for this fix.
- **Public checker:** case 5 proves `themeContrastFailures` reports an erased
  edge on an edited theme, not only the library's own suites.
- **Direction:** case 6 fails if a future edit makes the press flatter than its
  hover or moves it back onto the divider value.
- **Docs:** `docs.test.ts` derives the fill list from `contrastPairs` and pins
  the two sentences, so a pair or a paragraph cannot drift apart.
- **Ledger:** `inventory.test.ts` reads the pair count from
  `contrastPairs.length`, so the COMPONENTS row cannot keep 252.

## 7. Acceptance

- [x] `border` is measured on `secondaryHover` and `secondaryActive`; the public
  count was 254 when this plan landed (257 after plan 319).
- [x] macOS, Linux and Windows light `secondaryActive` are `#C7C7CC`,
  `#CAC8C6` and `#CCCCCC`; both AAA `border` roles are `#575E6B` and `#A0A0A0`;
  every shipped set clears its declared floor, and the regression tests prove
  the checker reports the old values.
- [x] `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
  `COMPONENTS.md` name the two fills and the five moved values; the pinned doc
  assertions are updated.
- [x] `TODO.md` is ticked and its progress bar moved; this index records 318.
- [x] `nub run check`, `nub run lint` and `nub run test` pass in this worktree.

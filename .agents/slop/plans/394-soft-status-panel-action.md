# Plan 394 — the action inside a soft status panel

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
014 (status tones), 090 (`xSoftBorder`), 092 (the control boundary on the soft
fills), 093 (the ring on the soft fills), 097 (designed filled families), 300
(the soft fill on the quiet panel), 309 (every interactive fill on its panel),
338 (`filledControl`), 356 (the JSDoc example guard), 371 (the colour-format
check), 383 (the total theme check), 387 (`shippedThemes`), 393 (the last
audit's next candidate).

**Status:** executed on `agent/tokens-theme` (2026-10-18). The recorded decisions
match the implementation; the only deviation is §3.6 (the three lists are named
inside the `contrastPairs` bullet, not as separately applied passes).

---

## 1. The measured gap

A status panel carries actions. `components/alert.tsx` paints its tone-tinted
root (`xSoft`) and `AlertDescription` is documented as a container that may hold
an action; `packages/components/docs/alert.mdx` renders the default
`<Button onClick={retry}>Try again</Button>`, and `internal/button.tsx` gives
that Button `secondary` at rest, the generic `hover` wash under the pointer and
`active` while pressed. `AlertDismiss` is a ghost control, so it paints the same
two washes. The panel's own fill is the surface behind all three.

The contract never measured those compositions. Measured on the built package
with its own `contrastRatio` — three fills (`hover`, `active`, `secondary`) ×
four soft fills × 24 shipped sets:

| theme | failing of 12 | worst pair |
| ----- | ------------- | ---------- |
| Light · Windows | 4 | **`active` on `destructiveSoft` = 1.0042:1** (`#E0E0E0` on `#FFD6D6`) |
| Light · Windows | 4 | `active` on `successSoft` = 1.0085:1 |
| Dark · Windows / XP / Windows 7 | 8 each | `hover` and `secondary` on all four fills, 1.0102–1.0413:1 |
| Light · Windows 7 | 8 | `active` on `successSoft` = 1.0050:1 |
| Light · Windows XP | 6 | `hover` on `destructiveSoft` = 1.0092:1 |
| Light (identity) | 4 | `active` on `destructiveSoft` = 1.0492:1 |
| High contrast light (every set) | 2 | `active` on `infoSoft` = 1.0133:1 |
| High contrast dark (every set) | 2 | `hover`/`secondary` on `destructiveSoft` = 1.0242:1 |
| Dark (identity), macOS light/dark, Linux light | 0–4 | — |

**80 of 288 pairs are under the 1.05:1 floor**, and `themeContrastFailures`
returns `[]`: no pair exists, so the checker has nothing to measure. The
consequence is a real interaction defect: an Alert's ghost dismiss control has
no press state on Windows light, the documented "Try again" action has no fill
inside the AAA dark destructive panel, and a Windows dark Alert's hover is 1–2
RGB from its own tint.

The failure is structural, not a per-platform slip. In each mode the four soft
fills sit in a narrow luminance band — light `0.742–0.765` (AAA light
`0.657–0.753`), dark `0.012–0.039` — and a neutral wash tuned for the canvas has
almost the same luminance as the tints. A neutral fill can only be perceived
there if it is far lighter or far darker than the whole band, which is not what
`hover`, `active` or `secondary` are: they must also stay perceivable on
`background`, `card`, `popover` and the quiet `muted` panel, the floors plan 309
publishes. Moving them would break those pairs and the neutral control's design
in every set, so the washes cannot solve a toned surface.

## 2. Decision

1. **Ship one designed family for the action on a toned panel.** Four roles —
   `softAction` (rest), `softActionHover`, `softActionActive` and
   `softActionForeground` — form a raised neutral action that is perceivable on
   every shipped soft fill in both modes. A filled action uses all three fills
   with `softActionForeground`; a ghost action skips the rest step and paints
   `softActionHover`/`softActionActive` on the panel, with the same foreground.
2. **Publish `softAction(theme)`** returning the same shape as
   `filledControl` (`background`, `foreground`, `hover`, `active`), so a
   consumer gets the whole family in one call and cannot pair the wrong
   foreground with a fill.
3. **Measure it**, in three lists spread into `contrastPairs`:
   - `softActionPairs` — each of the three fills on each of the four soft fills
     (`surface`, 12 pairs);
   - `softActionStepPairs` — `softActionHover` one step from `softAction` and
     `softActionActive` one from `softActionHover` (`step`, 2 pairs);
   - `softActionLabelPairs` — `softActionForeground` on the three fills
     (`secondary`, 3 pairs) and on the four soft fills a ghost action's label
     rests on (`body`, 4 pairs).
   The contract grows 339 → 360 pairs and 66 → 70 roles, and every shipped set
   passes without moving a colour.
4. **State the declined composition, with evidence.** The neutral washes and the
   neutral fill are not a supported action surface inside a status panel: no
   shipped palette can carry them there, and no value move fixes it without
   breaking the canvas pairs. The reference documents the 80 measured pairs and
   the designed alternative, and `components` migrates Alert and Toast actions
   to `softAction(theme)` (cross-team row).
5. **A regression suite** states the erased-state class, the measured pre-fix
   figures, the helper and the public checker, in `soft-action.test.ts`.

Rejected alternatives, with reasons:

- **Move `hover`, `active` and `secondary` so they clear the tints.** In light
  mode the neutral family would have to leave the `0.806–1.0` or enter
  `≤ 0.726` band to clear `infoSoft` — a `secondary` fill of roughly `#C0C0C0`,
  which breaks the control's design, its own foreground, its `border` edge on
  the fill (divider floor) and every platform style's canvas-tuned value. In
  dark mode the whole family would have to leave the `0.035–0.088` band. The 80
  failing pairs sit across six platform styles in two modes; this is not a
  one-step correction.
- **Move the four soft fills.** They are held to 1.05:1 on `background`, `card`,
  `popover` and the quiet `muted` panel (plans 076/300), to their foregrounds at
  the body floor and through the selection wash (plans 091/320/362). Shifting
  them far enough to carry a canvas-tuned neutral breaks those floors first.
- **Per-tone action roles (`infoSoftAction`…).** Twelve roles, three per tone,
  for one composition; the tone is already carried by the panel, and the
  documented action is the neutral Button. The raised neutral family is four
  roles and one call.
- **Reuse `card`/`cardForeground` as the action fill.** A surface role is not a
  control fill — the same defect the ledger records for `muted` used as a Badge
  fill — and it has no hover or press step.
- **An alpha veil over the tint.** Plan 097 rejected an alpha state precisely
  because the state takes its colour from the backdrop; the family has to be
  editable, opaque and measured in a copied theme.
- **Leave it undocumented and unmeasured.** The composition ships today and the
  ledger's mission-named states include hover and press; the checker returning
  `[]` for an invisible press is the defect this plan exists to close.

## 3. Exact edits

### 3.1 `packages/tokens/src/color.ts`

- Add four roles to `ThemeColors`, after `destructiveSoftBorder` and before
  `infoText`:

```ts
  /**
   * Raised neutral action on a tone-tinted status panel. A canvas-tuned wash
   * cannot be perceived on a soft status fill, so an action inside an Alert,
   * Badge or Toast paints this family instead. It is the lightest step in light
   * mode and the raised grey step in dark mode, and `softActionForeground` is
   * readable on all three fills.
   */
  readonly softAction: string;
  /** Text and icons on the `softAction` family. */
  readonly softActionForeground: string;
  /** `softAction` while hovered. */
  readonly softActionHover: string;
  /** `softAction` while pressed. */
  readonly softActionActive: string;
```

- Add them to `colorRoles` in the same position (after `destructiveSoftBorder`,
  before `infoText`).
- Add the four values to each palette, in the same order, after
  `destructiveSoftBorder`:

| palette | `softAction` | `softActionForeground` | `softActionHover` | `softActionActive` |
| ------- | ------------ | ---------------------- | ----------------- | ------------------ |
| `lightColors` | `#FFFFFF` | `#191D25` | `#F5F5F5` | `#EBEBEB` |
| `highContrastLightColors` | `#FFFFFF` | `#000000` | `#F5F5F5` | `#EBEBEB` |
| `darkColors` | `#3A414D` | `#F6F8FB` | `#454D5B` | `#4C5462` |
| `highContrastDarkColors` | `#3A414D` | `#FFFFFF` | `#454D5B` | `#4C5462` |

- Extend the palette JSDoc paragraphs: the light family is the raised surface
  (`#FFFFFF` → `#EBEBEB`, a press that darkens); the dark family is a raised
  grey from neutral 800 toward the separator, `#3A414D` → `#4C5462`; the AAA
  sets keep white/black labels because their label floor is 7:1.
- Update both "The same 66 roles" sentences to 70 (`color.test.ts` reads the
  count from `colorRoles`).

### 3.2 `packages/tokens/src/styles.ts`

After `filledControl`, add:

```ts
/**
 * Resolve the action family for a tone-tinted status panel.
 *
 * A canvas-tuned wash (`hover`, `active`) and the neutral fill (`secondary`)
 * cannot be perceived on a soft status fill: the four tints sit in a narrow
 * luminance band in each mode, and 80 of the 288 shipped fill-on-tint pairs are
 * under the 1.05:1 floor. An action inside an Alert, Badge or Toast paints this
 * raised family instead. A ghost action skips `background` and uses `hover` and
 * `active` on the panel; a filled action uses all three and its foreground.
 *
 * @example
 * ```ts
 * import { getTheme, softAction } from "@gpuixui/tokens";
 *
 * const action = softAction(getTheme("light"));
 * action; // { background: "#FFFFFF", foreground: "#191D25", hover: "#F5F5F5", active: "#EBEBEB" }
 * ```
 */
export function softAction(theme: Theme): FilledControlStyle {
  return {
    background: theme.colors.softAction,
    foreground: theme.colors.softActionForeground,
    hover: theme.colors.softActionHover,
    active: theme.colors.softActionActive,
  };
}
```

### 3.3 `packages/tokens/src/contrast.ts`

- Add after `softPanelTextPairs` (the soft-status block already owns those
  names):

```ts
/**
 * The designed action family for a tone-tinted status panel. `softAction` is the
 * raised fill an action inside an Alert, Badge or Toast paints, and a ghost
 * action paints its hover and press on the panel itself. Neither the canvas
 * washes (`hover`, `active`) nor the neutral fill (`secondary`) is perceivable
 * on a soft status fill — the four tints sit in a narrow luminance band and 80
 * of the 288 shipped fill-on-tint pairs measured under 1.05:1 — so each fill is
 * held to the surface floor on the four fills, the family is a perceivable
 * ladder, and the one foreground is held on all three fills and on the panel a
 * ghost action's label rests on.
 */
export const softActionPairs: readonly ContrastPair[] =
  (["softAction", "softActionHover", "softActionActive"] as const).flatMap(
    (fill) =>
      softSurfaceRoles.map(
        (background): ContrastPair => [fill, background, "surface"],
      ),
  );

/** The panel action's hover and press, one perceivable step apart. */
export const softActionStepPairs: readonly ContrastPair[] = [
  ["softActionHover", "softAction", "step"],
  ["softActionActive", "softActionHover", "step"],
];

/**
 * The panel action's one foreground: on the three fills a filled action paints,
 * and on the four soft fills a ghost action's label rests on with no fill of its
 * own.
 */
export const softActionLabelPairs: readonly ContrastPair[] = [
  ["softActionForeground", "softAction", "secondary"],
  ["softActionForeground", "softActionHover", "secondary"],
  ["softActionForeground", "softActionActive", "secondary"],
  ...softSurfaceRoles.map(
    (background): ContrastPair => [
      "softActionForeground",
      background,
      "body",
    ],
  ),
];
```

- Spread all three into `contrastPairs` immediately after
  `...stateFillSurfacePairs`, so the fill lists stay together:

```ts
  ...stateFillSurfacePairs,
  ...softActionPairs,
  ...softActionStepPairs,
  ...softActionLabelPairs,
```

- Extend the `contrastPairs` JSDoc with one paragraph naming the family and the
  measured reason, in the existing prose style, without a surface count.
- Extend `themeContrastFailures`' JSDoc list paragraph with
  `softActionPairs`, `softActionStepPairs` and `softActionLabelPairs`.

### 3.4 New `packages/tokens/src/soft-action.test.ts`

Header comment states the guarded bug: **an action inside a status panel paints
the canvas-tuned washes or the neutral fill, and 80 of the 288 shipped
fill-on-soft-fill pairs are under 1.05:1 — the worst is Windows light `active`
on `destructiveSoft` at 1.0042:1 — so an Alert's dismiss control had no press
state while `themeContrastFailures` returned `[]`.**

Cases (each derives its expectations from the package, not from literals):

1. **Every shipped set passes the panel action's pairs** — `shippedThemes`
   mapped, labelled with `theme.name`; each pair in the three lists clears its
   own `contrastFloors[theme.contrast]` class.
2. **The neutral composition is measured and rejected** — `contrastRatio` for
   `hover`/`active`/`secondary` on each soft fill, across the shipped sets;
   assert at least one set is under the floor for each of the three roles, and
   that the worst is the Windows light `active`/`destructiveSoft` pair. Assert
   the *count* of under-floor pairs equals 80 (derived by the same map, so the
   number is a statement of the measurement, not a magic constant) — this is the
   case that fails before the plan and documents why the family exists.
3. **The checker reports an erased panel action** — `extendTheme(getTheme(
   "dark"), { colors: { softAction: getTheme("dark").colors.infoSoft } })`
   returns a `surface` failure for `softAction` on `infoSoft` at the default
   floor, with `ratio` 1.
4. **The checker reports a collapsed press** — set `softActionActive` to
   `softActionHover` and expect a `step` failure for the pair
   (`softActionActive`, `softActionHover`).
5. **The helper resolves the family** — `softAction(theme)` equals the four
   roles for light, dark and both AAA sets, and its `foreground` is the role the
   label pairs measure.
6. **The family is a ladder in every set** — `degree` assertions are covered by
   case 1; here assert the *roles are distinct* in every shipped set (no
   family member equals another), which a 1.05:1 step already implies and which
   names the design rule.
7. **It is one complete check** — `themeFailures` on a theme with an erased
   `softAction` returns a `contrast` kind (the total check composes it).

### 3.5 `packages/tokens/src/contrast.test.ts`

`contrastPairs.length` 339 → 360. Add, inside `it("covers every documented
pair")`:

```ts
expect(softActionPairs).toHaveLength(12);
expect(softActionStepPairs).toHaveLength(2);
expect(softActionLabelPairs).toHaveLength(7);
```

and import the three lists.

### 3.6 `packages/tokens/src/contrast-reference.test.ts`

No change. The three new lists are spread into `contrastPairs` rather than
applied as separate passes, so — like `stateStepPairs` and `trackMarkPairs` —
they are named inside the `contrastPairs` bullet of the `themeContrastFailures`
JSDoc and `appliedLists` (the separately-applied lists) stays as it is.
`contrast.ts`'s `contrastPairs` JSDoc gains the paragraph instead.

### 3.7 `packages/tokens/src/docs.test.ts`

- Rename the pair-history assertion: the last transition is now
  `taking it from 339 to **${contrastPairs.length}**`.
- The design-system floor table gains one row (3.9); add its exact string to the
  `rows` list in `it("states the floors the contrast checker enforces")`, and add
  a derived case that names every role and surface of the three lists in that
  row (the same one-way method as the mark/track/Toast cases).
- The interaction-state `hover`/`pressed` rows gain the family (3.9); add one
  case asserting the `softAction` roles are named in both rows.

### 3.8 `docs/tokens.md`

- Colour-role tables (default and high contrast): two rows per table, in
  `colorRoles` order, with the light/dark and AAA values from 3.1; the `Use`
  column says "raised action on a soft status panel", "text and icons on
  `softAction`", "`softAction` while hovered/pressed".
- `There are 66 roles.` → the shipped count (`colorRoles.length`, 70), and add
  one sentence after the filled-action paragraph: a status panel's action is
  `softAction(theme)` because a canvas-tuned wash cannot be perceived on a tone
  tint (the measured 80 pairs in the contract section).
- `## Status tones`: after the soft-surface paragraph, add the action family and
  `softAction(theme)`, with an executed snippet.
- `#### Checking a theme` / the contract narrative: add the three list names to
  the "what the check covers" sentence and append the pair-history sentence:

  > Plan `394` adds the action a soft status panel carries — `softAction`,
  > `softActionHover` and `softActionActive` on the four soft fills, the family's
  > two steps and `softActionForeground` on the three fills and on the four
  > panels — taking it from 339 to **360**. The composition it replaces measured
  > **1.0042:1** at worst (Windows light `active` on `destructiveSoft`) across
  > 80 of 288 shipped pairs, so an Alert's dismiss control had no press state;
  > the raised family clears the floor in every set and no colour moves.
- `## Verification`: name `soft-action.test.ts` in the list of suites.
- `## Limitations and future work`: add the declined neutral composition —
  `hover`/`active`/`secondary` are not a supported action surface inside a soft
  status panel; the family is the supported one.

### 3.9 `docs/design-system.md`

- §8 `hover` and `pressed` rows: append "an action on a soft status panel paints
  `softActionHover`/`softActionActive`, not the canvas washes".
- §8, after the paragraph that introduces the designed filled family: one
  paragraph on the status panel's action — the four tints sit in one luminance
  band, a canvas wash cannot be perceived on them (80 of 288 pairs, worst
  **1.0042:1**), so the action is a raised neutral family with its own
  foreground, and a ghost action uses its last two steps.
- §9 table: one new row after the filled-control row:

  `| status-panel action (softAction/softActionHover/softActionActive on the four soft status fills, the family's hover and press steps, and softActionForeground on the three fills and the four soft fills) | 1.05:1 / 1.05:1 / 4.5:1 / 7:1 | … |`

  (with the floors interpolated from `contrastFloors`, the way the other rows
  are written).

### 3.10 `packages/tokens/README.md`

- `same 66 roles` → `same 70` (the role count is asserted from `colorRoles`).
- After the `filledControl` paragraph: one sentence and a snippet naming
  `softAction(theme)` and why a canvas wash does not work on a soft panel.

### 3.11 `COMPONENTS.md`

- **Design tokens** row: `66 semantic roles` → `70 semantic roles`; add the
  panel-action family to the sentence that lists the status/action roles.
- **Theme contrast check** row: the pair count follows `contrastPairs.length`
  (339 → 360); add `softActionPairs`, `softActionStepPairs` and
  `softActionLabelPairs` to the list names and one sentence on the 80 measured
  pairs and the **1.0042:1** worst.
- **Status tones** row: name `softAction(theme)` beside `statusTone(...)`.
- **Filled control states** row: one clause — the family is the filled/ghost
  action for a soft status panel.

### 3.12 `TODO.md`

Tick the row *"Hold the fills an action paints inside a soft status panel"* and
reword it to the shipped decision (family measured, 80-pair evidence, no colour
moves, 339 → 360, 66 → 70 roles). Bump the section count by one. Add the
cross-team row:

```
`[ ]` Cross-team: `components` paints an action inside a soft status panel with
`softAction(theme)` — `AlertDescription`'s documented `<Button>Try again</Button>`
and `AlertDismiss` (and the Toast's action) paint the canvas-tuned `secondary` →
`hover` → `active` ladder, which measures 1.0102:1 (Windows dark) to **1.0042:1**
(Windows light `active` on `destructiveSoft`) against the tint, so the action's
press and the filled action's rest have no visible shape; the raised family and
`softActionForeground` are measured on every shipped set in both modes (plan 394;
owner: `components`)
```

### 3.13 `.agents/slop/plans/README.md`

Add the row after 393 and a closing paragraph naming the measurements.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens test
# EXPECT: 101 files (100 + soft-action.test.ts), every test passes.
```

```sh
# Direction 1 — the family is required (roles and pairs removed, palette back):
git stash push -- packages/tokens/src/color.ts packages/tokens/src/contrast.ts packages/tokens/src/styles.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/soft-action.test.ts)
# EXPECT: the suite fails: `softAction` is undefined, the list counts are wrong,
# and the rejected-composition case still measures the 80 pairs.
git stash pop

# Direction 2 — the measured wash composition is the regression:
#   before the palette change, case 2 alone reports 80 under-floor pairs and the
#   Windows light worst figure; case 1 fails because `softAction` is undefined.
#   Both directions are demonstrated by the two stashes above; record the
#   failing output in the commit message.
```

Then the gate:

```sh
nub run check
nub run lint
nub run test
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- a shipped set fails a `softAction` pair — quote the set, role and ratio; move
  the family value with the next perceptible step, keeping the label floors, and
  state the move in both documents;
- the AAA dark `softActionForeground` on `softActionActive` lands under 7:1 —
  darken the active step by a half-step (the probe used `#4C5462`; 6.95:1 was
  rejected), rather than lowering a floor;
- `contrast.test.ts`'s content-uniqueness guard rejects a pair — a pair is
  repeated between the new lists and an existing one; remove the duplicate from
  the new list and say which existing pair already measures it;
- `docs.test.ts` fails on the role tables' order — `colorRoles` is the source,
  so fix the table, not the test;
- `contrast-reference.test.ts` rejects the JSDoc for a repeated count — name the
  lists without a number;
- a gate fails for a reason outside the files this plan names.

## 6. Acceptance criteria

- Four new roles (`softAction`, `softActionForeground`, `softActionHover`,
  `softActionActive`) ship in all four palettes; `colorRoles` has 70 entries and
  `softAction(theme)` is public and documented.
- `softActionPairs`, `softActionStepPairs` and `softActionLabelPairs` are public,
  spread into `contrastPairs` (339 → 360) and reported by
  `themeContrastFailures`/`themeFailures`.
- Every shipped set passes all three checks; no colour value moves except the
  four new roles.
- `soft-action.test.ts` fails without the family and without the palette values,
  and passes with them; the rejected composition's 80 pairs and the 1.0042:1
  worst are stated in the test and both documents.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

- `components`: Alert, Toast and the documented "Try again" action read
  `softAction(theme)`; the row is in `TODO.md`. Until it lands, the shipped
  composition is documented as the declined one, with evidence.
- `docs-site`: no change — it consumes `@gpuixui/tokens`; the Alert preview will
  follow when the docs-site copy catches up with this branch (already recorded).

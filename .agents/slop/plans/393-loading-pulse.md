# Plan 393 — the loading pulse must stay visible

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
019 (motion), 060 (the animated-property truth), 094 (the skeleton on the row
washes), 309 (the state fills), 322 (the accent wash), 358 (the numeric
contract), 391 (the contrast reference names its lists), 392 (the text
hierarchy — the same "a state must be perceivable" rule).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

A `Skeleton` never paints the `skeleton` role at full strength for more than half
of its cycle. `primitives/src/components/Skeleton.tsx` renders
`opacity: pulseOpacity(step)`, and `primitives/src/core/loading.ts` defaults
`pulseOpacity(step, dim = 0.6, full = 1)` with `PULSE_STEPS = 2` — so every
second frame is the role **composited at 60% over the surface behind it**.

The contract measures only the opaque role, on the eight surfaces plan 094 and
322 named (`skeletonSurfaces`). Measured on the built package with its own
`alpha`/`compositeOver`/`contrastRatio`:

| theme | surface | `skeleton` opaque | at 0.6 |
| ----- | ------- | ---------------- | ------ |
| identity dark (`#3D4552` on `selected` `#33257A`) | `selected` | **1.058:1** | **1.008:1** |
| next tightest (XP light) | `selected` | 1.120:1 | 1.072:1 |
| every other pair | — | ≥ 1.131:1 | ≥ 1.074:1 |

So the flagship dark theme loses its placeholder on a selected row for half of
every pulse, while `themeContrastFailures` returns `[]`: the dim frame is not a
pair. The opaque value only clears the 1.05:1 floor by 0.008, which is why a
further 40% fade drops it under.

The failure is structural, not a one-off: an edited theme can set `skeleton`
equal to a wash and the checker stays green, because no check knows the pulse
fades it. This is the same class as the selection wash (plan 081), the modal
scrim (099) and the inverse veil (344): a role painted through an alpha needs a
composited pair, not only its opaque one.

## 2. Decision

1. **Publish the pulse factor.** `skeletonPulseOpacity = 0.6` is exported from
   `motion.ts` — the module that already owns the pulse's timing — so the
   contract and the primitive measure the same number. `primitives` keeps its
   `pulseOpacity` implementation but reads the constant; the migration is a
   cross-team row.
2. **Measure the dim frame.** `skeletonPulsePairs` is the same eight surfaces,
   with `skeleton` composited at `skeletonPulseOpacity` over each, held to the
   `surface` floor (1.05:1). It is its own list, like `overlayWashPairs`, so no
   opaque pair changes and no count moves.
3. **Give the pair a name for what was painted.** `ContrastFailure` gains an
   optional `opacity?: number`: the fraction a role was composited at. A dim
   frame is reported as `{ foreground: "skeleton", background: "selected",
   wash: "skeleton", opacity: 0.6, pairClass: "surface", floor: 1.05, … }`, which
   distinguishes it from the opaque pair it shares a role and surface with.
4. **Move the one shipped value that fails.** Identity dark `skeleton` moves from
   `palette.neutral[700]` (`#3D4552`) to `#434C5A` — a half-step toward
   `neutral[600]`, the same kind of half-step `borderStrong` already uses. The
   dim frame clears 1.05:1 on `selected` at **1.074:1** and the opaque pair
   improves to 1.179:1; the other seven surfaces are wider. No other shipped set
   moves; the light skeleton, both AAA skeletons and every platform dark
   skeleton already pass at 0.6 (the next tightest is 1.072:1).

Rejected alternatives, with reasons:

- **Lower the pulse depth (e.g. 0.8).** With the opaque pair at 1.058:1, any fade
  *toward* the surface is below 1.05 — the fix needs headroom, not a shallower
  fade.
- **Move `selected` instead.** `selected` carries the selection step, its
  foreground, the row-text pairs, the control edge and the inert inactive fill;
  `skeleton` has eight surface pairs and no text. Move the role with the least
  reach.
- **Ship a designed `skeletonDim` role.** A dim state that is a colour has to be
  a compromise across eight different surfaces (the true dim is a different
  colour on each), and the primitive animates `opacity` because the runtime
  cannot interpolate colour. The alpha is the mechanism; measure it.
- **Hard-code `0.6` in the contract.** The primitive owns the number today; two
  copies drift. The constant is the one source, and the cross-team row makes the
  consumer read it.
- **Leave the value and only add the pair.** `themeContrastFailures` would then
  be non-empty for a shipped theme, which breaks the library's own guarantee.

## 3. Exact edits

### 3.1 `packages/tokens/src/motion.ts`

After `motion` and before `MotionLevel`:

```ts
/**
 * The opacity the dim frame of a pulse paints at — a skeleton's second step.
 *
 * `Skeleton` alternates between the role and this fraction of it, so the role is
 * painted through an alpha for half of every cycle. The contrast contract
 * composites it at this value (`skeletonPulsePairs`), and the primitive reads
 * the same constant, so the number has one owner. It is a runtime constant, not
 * a theme token: every theme pulses the same way.
 */
export const skeletonPulseOpacity = 0.6;
```

### 3.2 `packages/tokens/src/contrast.ts`

- Import `alpha` from `./color.js` beside `colorRoles`/`isHexColor`.
- Import `skeletonPulseOpacity` from `./motion.js`.
- Add, after `surfacePairs` (which already names `skeletonSurfaces`):

```ts
/**
 * The dim frame of a loading pulse. A `Skeleton` alternates the role with
 * `skeletonPulseOpacity` of it, so half of every cycle is the role composited
 * over the surface behind it. Measured as a composite, like the selection wash
 * and the modal scrim: an opaque pair cannot see a fade.
 */
export const skeletonPulsePairs: readonly ContrastPair[] =
  skeletonSurfaces.map(
    (background): ContrastPair => ["skeleton", background, "surface"],
  );
```

- Extend `ContrastFailure` with:

```ts
  /** The fraction a role was composited at, when the paint was a fade. */
  readonly opacity?: number;
```

- Add a composited helper beside `washVisibilityFailures`:

```ts
const fadedVisibilityFailures = (
  pairs: readonly ContrastPair[],
  role: keyof ThemeColors,
  opacity: number,
  theme: Theme,
  floors: Readonly<Record<ContrastPairClass, number>>,
): ReadonlyArray<ContrastFailure> =>
  pairs.flatMap(([, background, pairClass]) => {
    const painted = compositeOver(
      alpha(theme.colors[role], opacity),
      theme.colors[background],
    );
    const ratio = contrastRatio(painted, theme.colors[background]);
    const floor = floors[pairClass];
    return ratio >= floor
      ? []
      : [
          {
            foreground: role,
            background,
            wash: role,
            opacity,
            pairClass,
            floor,
            ratio,
          },
        ];
  });
```

- In `themeContrastFailures`, add the pass after the inverse-veil lists and
  before `overlayWashPairs`:

```ts
    ...fadedVisibilityFailures(
      skeletonPulsePairs,
      "skeleton",
      skeletonPulseOpacity,
      theme,
      floors,
    ),
```

- Update the function's JSDoc: add `skeletonPulsePairs` to the list bullets
  ("the loading pulse's dim frame, composited at `skeletonPulseOpacity`") and say
  a failure through a fade names the role and its fraction.

### 3.3 `packages/tokens/src/color.ts`

- Identity dark: `skeleton: palette.neutral[700]` → `skeleton: "#434C5A"`, with a
  comment naming the pulse:

```ts
  // A half-step above neutral 700: the pulse's 60% frame must stay perceivable
  // on the selected row's fill (plan 393).
  skeleton: "#434C5A",
```

- Update the surrounding JSDoc paragraph that says the dark skeleton is "one ramp
  step" off the pressed wash to say the pulse's dim frame is why it is a
  half-step further.

### 3.4 New `packages/tokens/src/skeleton-pulse.test.ts`

Header comment states the guarded bug: **the loading skeleton is painted at 60%
opacity for half of every pulse, but the contract measured only the opaque role —
identity dark's `#3D4552` on `selected` measured 1.058:1 opaque and 1.008:1 at
60%, so the placeholder vanished on a selected row while
`themeContrastFailures` returned `[]`.**

Cases:

1. **Every shipped set keeps the dim frame** — `shippedThemes.forEach(…)` →
   `themeContrastFailures(theme)` has no failure whose `foreground` is
   `"skeleton"` and `opacity` is `skeletonPulseOpacity`, labelled with
   `theme.name`.
2. **The pre-fix value is reported** — `extendTheme(getTheme("dark"), { colors:
   { skeleton: "#3D4552" } })` returns a failure at `background: "selected"`,
   `opacity: skeletonPulseOpacity`, with `floor` the default `surface` floor and
   `ratio` under it. This case is the fix's own regression; it must be shown
   failing without the palette change (direction 1 below).
3. **An erased shelf is reported on every surface** — `skeleton` set to the
   `selected` value fails on all eight `skeletonPulsePairs` surfaces, each with
   `opacity: skeletonPulseOpacity`.
4. **The failure reports the painted ratio** — for the pre-fix theme, compute
   `contrastRatio(compositeOver(alpha("#3D4552", 0.6), dark.colors.selected),
   dark.colors.selected)` and assert it equals the reported `ratio`; assert the
   opaque pair is a different entry without `opacity`.
5. **The constant is the primitive's fraction** — assert
   `skeletonPulseOpacity` is `0.6` and that `skeletonPulsePairs` has one entry
   per `skeletonSurfaces` surface (derive the count from `contrastPairs`' own
   skeleton entries, not a literal).
6. **The shipped dark value is the designed half-step** — `darkColors.skeleton`
   is `"#434C5A"`, and its dim frame on `selected` is at least 1.05:1 (the
   regression value that motivated the move).

### 3.5 `packages/tokens/src/skeleton-washes.test.ts`

Line ~73 pins `dark.skeleton === palette.neutral[700]`. Change it to the new
half-step and say why in the case's comment; keep the light assertion
(`palette.neutral[300]`). Add one sentence to the header about plan 393.

### 3.6 `packages/tokens/src/contrast-reference.test.ts`

The suite's list literal is the set of lists the JSDoc must name; add
`"skeletonPulsePairs"`. The count regex must keep passing (the new sentence
states no surface count).

### 3.7 `packages/tokens/src/docs.test.ts`

- The dark colour-role table row for `skeleton` is built from the implementation;
  no test edit is needed for the value, but the page must be edited (3.8).
- The design-system floor-table row for the loading skeleton gains the dim-frame
  clause. The exact-row assertion (~line 1805) must include the clause; derive it
  from `skeletonPulseOpacity` and `contrastFloors[level].surface` rather than
  retyping numbers.
- Add a `describe("docs/tokens.md loading pulse")` block: names
  `skeletonPulseOpacity` and `skeletonPulsePairs`, asserts the page quotes the
  1.008:1 pre-fix figure and the 1.074:1 fixed figure (derive both from the
  package: the pre-fix via `alpha("#3D4552", skeletonPulseOpacity)`, the fixed
  from `darkTheme.colors.skeleton`), and asserts the page states no stale opaque
  figure.
- The design-system assertion "the loading row names its roles" (plan 354) must
  include the dim frame; extend the expected row.

### 3.8 `docs/tokens.md`

- Dark colour-role table: `skeleton` value `#3D4552` → `#434C5A`.
- The loading-skeleton paragraph (near "the loading skeleton was the `active`
  fill…"): add that the primitive paints `skeleton` at
  `skeletonPulseOpacity` (0.6) for half of every pulse, that
  `skeletonPulsePairs` measures that frame composited on the same eight
  surfaces, that identity dark measured **1.008:1** on `selected` before the
  change and **1.074:1** after, and that the opaque pairs are unchanged.
- The "Checking a theme" section's list of what the contrast check covers: name
  `skeletonPulsePairs`.
- The `## Types` index: no new type (the `opacity` field is on the existing
  `ContrastFailure`), but the `ContrastFailure` row gains "and the fraction a
  faded role was painted at, when the pair is composited".
- The reference's `ContrastFailure` prose (the failure shape near the JSON-ish
  example, if present) gains the optional field.

### 3.9 `docs/design-system.md`

- §8 loading row: append "the pulse's dim frame is the role at
  `skeletonPulseOpacity` (0.6), held by `skeletonPulsePairs` on the same eight
  surfaces".
- §9 floor table row for the loading skeleton gains the same clause and the
  default/high figures (the class is `surface`, 1.05:1).
- §9, after the skeleton/loading paragraph: one sentence naming the 1.008:1
  selected-row defect and the fixed 1.074:1.

### 3.10 `packages/tokens/README.md`

- The skeleton paragraph gains one sentence: the primitive pulses it at
  `skeletonPulseOpacity` and `skeletonPulsePairs` holds the dim frame on the same
  eight surfaces, because a fade is invisible to an opaque pair. Keep the
  existing sentence `readme.test.ts` asserts verbatim.

### 3.11 `COMPONENTS.md`

- **Theme contrast check** row: add `` `skeletonPulsePairs` `` to the enumerated
  lists and to the prose that names the loading skeleton (currently "the loading
  skeleton and decorative dividers on `background`/`card`/`popover`").
- **Design tokens** row: add one clause in the skeleton sentence: the dim pulse
  is measured at `skeletonPulseOpacity`.
- **Motion tokens** row: name the exported constant as the pulse's dim frame (not
  a timing).

### 3.12 `TODO.md`

Tick one row under `tokens-theme` and bump the count (`158/213` → `159/214`):

```
`[x]` Hold the loading pulse's dim frame — `Skeleton` paints the role at
`skeletonPulseOpacity` (0.6) for half of every cycle and the contract measured
only the opaque value, so identity dark's `#3D4552` on `selected` measured
1.058:1 opaque and **1.008:1** at 60% while `themeContrastFailures` returned
`[]`; `skeletonPulsePairs` composites the frame on the same eight surfaces,
`ContrastFailure` carries the fraction as `opacity`, and the dark skeleton moves
a half-step to `#434C5A` (1.074:1 dim, 1.179:1 opaque) so no other value moves
(plan 393)
```

Also record the two findings this audit did **not** implement, as unclaimed
rows:

- `[ ]` Hold the fills an action paints inside a soft status panel —
  `hover`/`active`/`secondary` on the four `xSoft` fills: 80 shipped pairs are
  under 1.05:1 (worst `active` on Windows light `destructiveSoft` at
  **1.004:1**), so an Alert's dismiss control has no press state and the
  documented "Try again" action has no fill in the AAA dark destructive panel;
  no pair exists (plan 394 candidate; owner `tokens`).
- Cross-team `[ ]` `primitives` paints a clipped ButtonGroup's focus ring as an
  inset border in `ring` on the button's own fill
  (`core/style.ts` `clippedFocusRingStyle`, `Button.tsx`, `ButtonGroup.tsx`), and
  `ring` equals `primary` in seven shipped sets (1.000:1), so a focused primary
  button in an attached group has no focus indicator; paint it with the family
  foreground, then the tokens contract can hold `ring` on the filled families.
  (owner: `primitives`).

### 3.13 `.agents/slop/plans/README.md`

Add the row after 392 and a closing paragraph:

```
| [393](./393-loading-pulse.md) | The loading pulse must stay visible | F | 019, 094, 309, 322, 358, 391, 392 | done |
```

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens test
# EXPECT: 99 files, every test passes.

# Direction 1 — the palette fix is required (contract present, old value):
git stash push -- packages/tokens/src/color.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/skeleton-pulse.test.ts)
# EXPECT: cases 1, 2 and 6 FAIL on the old dark skeleton (`#3D4552`
# reports 1.008:1 on `selected`); the derivation cases still pass.
git stash pop

# Direction 2 — the composited pair is required (old palette and no pair):
git stash push -- packages/tokens/src/contrast.ts packages/tokens/src/motion.ts packages/tokens/src/color.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/skeleton-pulse.test.ts)
# EXPECT: every case that reads the new exports fails (5 of 6 when measured on
# this tree: the constant is `undefined`, the pair list is empty and the old
# skeleton is back); no case passes by accident.
git stash pop
```

Then:

```sh
nub run check
nub run lint
nub run test
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- a shipped set other than identity dark fails the dim frame — quote the set,
  surface and ratio, and decide a second value move rather than lowering the
  pulse;
- the identity dark half-step does not clear 1.05:1 on all eight surfaces —
  compute the next half-step and state it in both documents;
- `skeletonPulsePairs` collides with the content-uniqueness guard (it must be a
  separate list, not merged into `surfacePairs`);
- `contrast-reference.test.ts` rejects the JSDoc for a count or a missing list
  name — fix the prose, not the guard;
- `docs.test.ts`'s exact floor row or role table disagrees after the edits — the
  implementation is the source; update the page;
- `readme.test.ts` rejects the skeleton sentence — keep the asserted clause
  verbatim and add the new sentence beside it;
- a gate fails for a reason outside the files this plan names.

## 6. Acceptance criteria

- `skeletonPulseOpacity` and `skeletonPulsePairs` are public and documented;
  `ContrastFailure` carries the optional `opacity`.
- `themeContrastFailures` reports a dim frame that misses 1.05:1 on any of the
  eight surfaces, naming `skeleton` and the fraction.
- Every shipped set passes both the opaque and the dim pairs; identity dark's
  skeleton is `#434C5A` and no other colour, pair or metric moves.
- The regression suite fails without the palette fix and without the composited
  pair, and passes with both; every case was run.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

- `primitives`: `pulseOpacity`/`Skeleton` read `skeletonPulseOpacity` so the
  contract and the primitive share one number. Until then the two literals
  agree (0.6) and the contract's value is the published one.
- `primitives`: the clipped ButtonGroup ring is a real focus-visibility defect
  (see the TODO row); the tokens pair follows the consumer fix.

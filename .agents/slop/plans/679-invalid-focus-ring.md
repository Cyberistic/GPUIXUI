# Plan 679 — The invalid focus ring is a state with no resolver

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/styles.ts`,
> `packages/tokens/src/invalid-focus-ring.example.ts` (new),
> `packages/tokens/src/invalid-focus-ring.test.ts` (new),
> `packages/tokens/src/docs.test.ts`, `docs/tokens.md`,
> `docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`,
> `TODO.md`, `.agents/slop/plans/README.md`.

## Execution record (2026-10-19)

- `invalidFocusRing(theme)` ships in `src/styles.ts`, sharing a private
  `ringShadow(theme, color)` with `focusRing`.
- The new suite is 5/5 green; the package is **190 files / 6,716 tests** green.
- `nub run check` (tests-can-fail, lint, format, type-check), `nub run lint` and
  `nub run test` are green.
- Both directions were proved by changing only the new function to
  `return focusRing(theme);`: 4 cases in `invalid-focus-ring.test.ts` failed
  (geometry, the all-sets difference, the copied theme's role, the example),
  and restoring the implementation returned 5/5. The docs guards stayed green
  in both directions because they hold the documents, not the implementation.
- `scripts/verify-two-directions.sh` still targets `jj` (repo TODO), so the
  manual revert above is the recorded evidence rather than a claim the script
  ran.

## Why

The contrast contract measures the invalid control's focus ring as its own
composition (`invalidRingPairs`): `destructive` painted on the surfaces a
control sits on, on the pressed `selectedActive` row, and on the four soft
status fills. The runtime can draw only one shadow, so that ring is the error
field's **only** focus indicator.

Every other state the contract measures has one public resolver:

| State | Resolver |
| ----- | -------- |
| filled control rest/hover/press | `filledControl(theme, family)` |
| raised action in a status panel | `softAction(theme)` |
| unavailable control | `disabledControl(theme)` |
| status tone (soft, solid, text) | `statusTone(theme, tone)` |
| valid focus ring | `focusRing(theme)` |
| focus ring inside a filled control | `insetFocusRing(theme, family)` |
| ring over arbitrary content | `contrastRing(theme)` |
| text selection | `selectionStyle(theme, on)` |
| native field theme | `nativeFieldTheme(theme)` |
| **invalid focus ring** | **none** |

A consumer has to know to spread `focusRing(theme)` and replace
`boxShadow.color` with `colors.destructive`. That is exactly what
`primitives/src/core/style.ts` `controlFocusStyle` does today. A copied theme,
a third-party control, or a docs reader who calls `focusRing` on an invalid
field gets the **valid** ring, and the contract that promises the error ring is
measured cannot be followed through the package's own API. The catalogue's
Focus section states the recolouring rule but offers no call for it.

This is an API-completeness defect, not a colour defect: no token, pair, floor,
metric or shipped theme moves.

## Scope

- Add `invalidFocusRing(theme): FocusRing` beside `focusRing(theme)`.
- Share the ring geometry through one private helper, so the two rings cannot
  disagree about offset, blur or thickness.
- Document the helper in the Focus section, the "Using tokens in components"
  rules, the type/value catalogue and the design system's focus state.
- Add an executed example and a regression test that proves the helper paints
  `destructive`, at `borderWidth.strong`, with the runtime's zero-offset,
  zero-blur geometry — not `ring`.
- Record the `primitives` migration cross-team; do not edit that workstream.

Out of scope: any token value, colour, contrast pair, floor, metric or shipped
theme; a slider's invalid fill (it recolours the fill and thumb border, not the
ring); the runtime's single-shadow limitation (unchanged and documented); and
`packages/primitives` itself.

## Files

| File | Change |
| ---- | ------ |
| `src/styles.ts` | Hoist a private `ringShadow(theme, color)`; `focusRing` and the new `invalidFocusRing` both read it. |
| `src/invalid-focus-ring.example.ts` | New executed example: an invalid field's resting and focused style, using the helper. |
| `src/invalid-focus-ring.test.ts` | New regression suite, including the two-direction evidence. |
| `src/docs.test.ts` | Hold the catalogue, design system and README to the helper and the example link. |
| `docs/tokens.md` | Import list, Focus section, using-tokens rule, example link. |
| `docs/design-system.md` | Focus state row names the resolver, not only the role. |
| `packages/tokens/README.md` | Focus snippet mentions the invalid resolver. |
| `COMPONENTS.md` | *Focus state* row records `invalidFocusRing`. |
| `TODO.md` | The task is added and ticked; the primitives migration is a cross-team row. |
| `.agents/slop/plans/README.md` | Index this plan. |

## Exact edits

### 1. `src/styles.ts`

Replace the body of `focusRing` with a shared private helper and add
`invalidFocusRing` beside it:

```ts
/**
 * The runtime's single-shadow ring at the theme's focus thickness. Both focus
 * rings share it, so they cannot disagree about the geometry the runtime
 * paints.
 */
const ringShadow = (theme: Theme, color: string): FocusRing => ({
  boxShadow: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: theme.borderWidth.strong,
    color,
  },
});
```

`focusRing(theme)` becomes `ringShadow(theme, theme.colors.ring)`; the new
function is:

```ts
/**
 * The focus ring of a control that failed validation.
 *
 * GPUix can draw only one ring (`boxShadow` is one shadow, and there is no
 * `outline*`), so an invalid field cannot show the normal ring and the error
 * ring at once: the error colour becomes the focus indicator. This is the same
 * geometry as {@link focusRing}, recoloured with `destructive`, which
 * `invalidRingPairs` holds to the boundary floor on every surface a control
 * sits on — the pressed `selectedActive` row and the four soft status fills
 * included. Applying it on an invalid slider is wrong: a slider recolours its
 * fill and thumb border, not its ring.
 *
 * @example
 * ```tsx
 * import { getTheme, invalidFocusRing } from "@gpuixui/tokens";
 *
 * const theme = getTheme("light");
 * const invalid = invalidFocusRing(theme);
 *
 * <input style={invalid} />;
 * ```
 */
export function invalidFocusRing(theme: Theme): FocusRing {
  return ringShadow(theme, theme.colors.destructive);
}
```

The existing `focusRing` JSDoc keeps its claims; add one sentence naming the
invalid sibling.

### 2. `src/invalid-focus-ring.example.ts`

```ts
import { invalidFocusRing } from "./styles.js";
import { lightTheme, type Theme } from "./theme.js";

/**
 * An invalid field at rest and focused. The error edge and the focus ring are
 * the two signals a failed field shows; the ring is the only focus indicator
 * the runtime can draw, so the helper recolours it rather than lying about the
 * geometry. Exercised by `invalid-focus-ring.test.ts`.
 */
export const invalidFocusExample = (theme: Theme = lightTheme) => ({
  rest: {
    backgroundColor: theme.colors.input,
    color: theme.colors.inputForeground,
    borderColor: theme.colors.destructive,
    borderWidth: theme.borderWidth.thin,
  },
  focused: invalidFocusRing(theme),
});
```

### 3. `src/invalid-focus-ring.test.ts`

Header comment states the defect: every measured state shipped a resolver
except the invalid ring, so a consumer following the package's own API painted
the valid ring on a failed field.

Cases:

1. **Geometry and colour** — for every `shippedThemes` set, the helper returns
   zero offsets, zero blur, `spreadRadius === borderWidth.strong`, and
   `color === theme.colors.destructive`.
2. **Not the valid ring** — the helper's colour is `ring` only if the theme
   itself sets `destructive === ring`; every shipped set differs, so the case
   asserts they differ in all 24 and that `invalidFocusRing(theme).boxShadow`
   is not `focusRing(theme).boxShadow` in every shipped set.
3. **The example** — `invalidFocusExample(theme)` carries the `destructive`
   edge at `borderWidth.thin` at rest and the helper's shadow when focused.
4. **The contract behind it** — every `invalidRingPairs` entry names
   `destructive`; a guard that fails if a list member is changed to `ring`.
5. **A copied theme** — `createTheme({ mode: "dark", colors: { destructive:
   "#FF00AA" } })` carries the new value in the ring, proving the helper reads
   the theme rather than a constant.

The two-direction proof in the execution record: temporarily make
`invalidFocusRing` return `focusRing(theme)`; cases 1, 2 and 5 fail while the
shipped-theme checks still pass. Restore and the suite is green.

### 4. `src/docs.test.ts`

Add cases that hold:

- the catalogue names `invalidFocusRing` in the Focus section and the
  using-tokens rules;
- the design system's focus row names `invalidFocusRing`;
- the README's focus snippet names it;
- the example link resolves (the existing `examples.test.ts` already enforces
  the link; this suite holds the prose).

### 5. Documents

- `docs/tokens.md`: add `invalidFocusRing` to the import list; after the
  paragraph that says an invalid control recolours the ring, state that
  `invalidFocusRing(theme)` returns that ring and `focusRing(theme)` is the
  valid one; add the example link beside the two existing focus examples; add
  the helper to rule 5 under *Using tokens in components*.
- `docs/design-system.md`: the `focus` row names `focusRing(theme)` for the
  valid state, `invalidFocusRing(theme)` for a failed field, and
  `insetFocusRing(theme, family)` inside a filled control.
- `packages/tokens/README.md`: the Focus paragraph names the invalid resolver
  beside `focusRing`.
- `COMPONENTS.md`: the *Focus state* row records `invalidFocusRing(theme)` and
  keeps its measured-pair claims.
- `TODO.md`: add and tick the task in the `tokens-theme` block; add a
  cross-team row for `primitives` `controlFocusStyle` to call
  `invalidFocusRing(theme)` instead of rebuilding it.

## Commands

Run from the worktree root:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

Expected: the tokens suite grows from **189 files / 6,708 tests** to
**190 files / 6,7xx tests**, all green; `check` and `lint` are clean; the full
workspace test run is green.

## STOP conditions

Stop and report rather than improvise if:

- `invalidFocusRing` would need a new colour role or a token value to work;
- a shipped theme's `destructive` equals its `ring`, making case 2's
  "all 24 differ" assertion false (then the case states the exception instead
  of moving a colour);
- the docs value-coverage guard or the example-link guard rejects the wording
  for a reason not covered above;
- the workspace gates fail for a reason outside this plan's paths.

## Acceptance

- `invalidFocusRing(theme)` is exported from `@gpuixui/tokens`, documented in
  the catalogue and the design system, and exercised by an example that a test
  imports and the catalogue links.
- The helper paints `destructive` at `borderWidth.strong` with zero offset and
  blur in every shipped theme; it does not paint `ring`.
- The example compiles and its focused object is the helper's shadow; the
  resting object keeps the documented error edge.
- No colour, pair, floor, metric or shipped theme moves.
- `nub run check`, `nub run lint` and `nub run test` pass.

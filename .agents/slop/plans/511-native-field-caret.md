# Plan 511 — the native field's caret is the accent

Status: done
Phase: F (contract completeness)
Depends on: 011 (the palette and `Theme`), 082 / 332 (the accent as a text role
and as a mark), 315 / 317 / 319 (the surfaces a field sits on), 337 (the native
field's reach), 350 (runnable examples), 387 (the shipped-set enumeration).

## 1. The defect

Plan `337` established what the pinned native editor actually reads:
`@gpuix/native@0.10.0` (`9fcd628`) `<input>`/`<textarea>` takes typed text from
the element's `style.color`, paints its own fixed placeholder (`#8F8F8F`) and
selection (`#7C86FF59`), and reads **exactly one** field from its `theme` prop —
`caret` (`packages/native/src/custom_elements/input.rs:364`). The element's base
is `Theme::dark()` (`input.rs:332`); the only other control is the prop's
`appearance`, which selects `Theme::light()` before overlays apply.

The package ships no caret value and no helper for that prop, so every native
field keeps the runtime's built-in dark caret, `#7C86FF`
(`oklch(0.673, 0.182, 276.935)`). Measured with the library's own
`contrastRatio`:

| shipped set | surface | runtime caret | floor (`mark`) |
| --- | --- | --- | --- |
| High contrast light | `input` (`#FFFFFF`) | **3.129:1** | 4.5 |
| High contrast light | `muted` (`#F2F2F2`) | **2.795:1** | 4.5 |
| Light (identity) | `input` (`#FFFFFF`) | 3.129:1 | 3 (passes) |
| Dark (identity) | `input` (`#191D25`) | 5.396:1 | 3 (passes) |

The accessibility theme therefore ships a caret below its own mark floor, and
the default-contrast theme's caret is a fixed periwinkle that a copied platform
style or brand theme cannot change at all — the one native field paint the theme
can reach is the one it does not own. `themeFailures` returns `[]` because no
pair paints the runtime default; it is not our palette.

## 2. The rule

**Do not add a role.** The caret is the accent, and the accent is already a
measured mark: `markPairs` holds `primary` on the `input` fill and on
`background`/`card`/`popover`/`muted`, the four surfaces a transparent field
sits on (`packages/tokens/src/contrast.ts`). A second role named `caret` would
duplicate that colour and re-open the family rule every time a platform style
moves its accent — the package's own documented rule is "no second name for a
role that already has one".

Ship the runtime bridge instead:

```ts
export interface NativeFieldTheme {
  /** The text-insertion caret the native editor paints. */
  readonly caret: string;
}

export function nativeFieldTheme(theme: Theme): NativeFieldTheme {
  return { caret: theme.colors.primary };
}
```

`nativeFieldTheme` is the whole `theme` prop a native field reads; a consumer
applies it beside the element's style. Because it derives from `primary` it
follows `extendTheme`, a copied `PlatformStyle` and a brand theme with no extra
edit, and `themeContrastFailures` already reports a collapsed accent on every
surface a field sits on. A consumer that wants a different caret replaces the
field of the returned object.

No colour, pair or floor moves. The only new public value and type are the
helper and its shape.

## 3. Files to change

### 3.1 `packages/tokens/src/styles.ts`

Add after `selectionStyle` at the end of the file:

1. `NativeFieldTheme` exactly as in §2, JSDoc'd.
2. `nativeFieldTheme(theme)` exactly as in §2, with a JSDoc that states:
   - the pinned editor reads only `caret` from the `theme` prop, takes typed
     text from `style.color` and fixes its placeholder and selection (plan 337);
   - the caret is `primary` because `primary` is already held to the `mark`
     floor on `input` and the four surface tones (`markPairs`), so there is no
     second role;
   - without the prop the field keeps the runtime's dark caret, which measures
     **3.129:1** on the AAA light `input` and **2.795:1** on its quiet panel,
     under the 4.5:1 mark floor;
   - an explicit override is spread over the returned object.
   - The `@example` block imports `nativeFieldTheme` and renders a `<input>`
     with `style={{ color: theme.colors.inputForeground }}` and
     `theme={nativeFieldTheme(theme)}`.

### 3.2 New `packages/tokens/src/native-field.example.ts`

```ts
import { getTheme, nativeFieldTheme, type Theme } from "./index.js";

/** A native search field: typed text takes the field colour, the caret the accent. */
export const searchField = (theme: Theme) => ({
  style: { color: theme.colors.inputForeground },
  theme: nativeFieldTheme(theme),
});

/** The same field on the dark identity. */
export const darkSearchField = searchField(getTheme("dark"));
```

It must be imported by the new suite so `examples.test.ts` keeps passing.

### 3.3 New `packages/tokens/src/native-field-caret.test.ts`

Header comment names the defect in §1 (runtime caret, the two AAA figures, the
fact that the package owned no value). Import `shippedThemes`,
`nativeFieldTheme`, `themeContrastFailures`, `extendTheme`, `lightTheme`,
`highContrastLightTheme`, `contrastRatio`, `contrastFloors`, and the example.
Cases:

1. **`carries the accent on every shipped set`** — iterate `shippedThemes`,
   assert `nativeFieldTheme(theme).caret === theme.colors.primary`, labelled
   with `theme.name`. (The case title claims every shipped set, so it must read
   the enumeration — `shipped-themes.test.ts` enforces that.)
2. **`holds the caret to the mark floor on every surface a field sits on`** —
   for each shipped set, the level's `contrastFloors[theme.contrast].mark`,
   five surfaces `input`, `background`, `card`, `popover`, `muted`, using the
   helper's value. Every shipped set already passes (the tightest is the AAA
   light accent on white at 10.81:1); the case is the helper's own guarantee if
   its source ever changes.
3. **`replaces the runtime default the AAA theme cannot read`** — with a
   literal `#7C86FF`:
   - `contrastRatio(runtimeDefault, highContrastLightTheme.colors.input)`
     is **3.129:1**, `< contrastFloors.high.mark` (4.5);
   - on `highContrastLightTheme.colors.muted` it is **2.795:1**, also `< 4.5`;
   - on `lightTheme.colors.input` it is **3.129:1**, `>=`
     `contrastFloors.default.mark` (3) — so the omission is real at AAA and
     invisible at the default level;
   - `contrastRatio(nativeFieldTheme(highContrastLightTheme).caret, input)` is
     `>= 4.5`.
4. **`follows an edited accent instead of a stale copy`** —
   `extendTheme(lightTheme, { colors: { primary: "#7A1FA2" } })`; the helper's
   caret equals `#7A1FA2`, is not the base accent, and clears the default mark
   floor on the edited theme's `input`.
5. **`inherits the accent's public mark contract`** — extend `lightTheme` with
   `primary: lightTheme.colors.input` and assert `themeContrastFailures` reports
   a `mark` failure for `primary` on `input`, so the helper needs no pair of its
   own.
6. **`runs the example`** — `darkSearchField.theme.caret` is
   `getTheme("dark").colors.primary` and `darkSearchField.style.color` is its
   `inputForeground`.

Use `shippedThemes` (not a hand-built matrix). No `node:fs`.

### 3.4 `packages/tokens/src/docs.test.ts`

In the `docs/tokens.md runtime reach` describe, add one case:

```ts
it("states the caret the native field reads and the default it replaces", () => {
  expect(markdown).toContain("`nativeFieldTheme(theme)`");
  expect(markdownProse).toContain(
    `${contrastRatio("#7C86FF", Tokens.highContrastLightTheme.colors.input).toFixed(3)}:1`,
  );
  expect(markdownProse).toContain(
    `${contrastRatio("#7C86FF", Tokens.highContrastLightTheme.colors.muted).toFixed(3)}:1`,
  );
  expect(designSystem).toContain("`nativeFieldTheme(theme)`");
});
```

`designSystem` and `Tokens` are already in scope; no import change unless the
compiler asks for one.

### 3.5 `docs/tokens.md`

1. In **Native text fields**, after the placeholder paragraph, add the caret
   paragraph from §2 (the runtime default, the two AAA figures, the helper, the
   `markPairs` guarantee, the override) and the fenced `tsx` snippet with the
   import.
2. In **Limitations and future work**, replace the bullet
   "No themeable native field placeholder or selection: …" with the same fact
   plus "The caret is themeable: `nativeFieldTheme(theme)` supplies it from the
   accent." Keep the fixed placeholder/selection evidence.
3. In **Types**, add the alphabetical row between `MotionTransition` and
   `PlatformName`:
   `| \`NativeFieldTheme\` | The runtime \`theme\` prop a native text field reads: \`{ caret }\`. |`
   The type-index guard fails without it.

### 3.6 `docs/design-system.md`

After the field pressed-edge paragraph ("A field is not a filled action …"),
add one sentence: a native field's caret is the accent, `nativeFieldTheme(theme)`
is the `theme` prop the pinned editor reads for `caret`, the accent is already a
mark on the `input` fill and the four surface tones, and the built-in dark caret
measures **2.795:1** on the AAA light quiet panel — under the 4.5:1 mark floor.

### 3.7 `packages/tokens/README.md`

1. In **Selection and scrollbars**, change "reads only `theme.caret`" to
   "reads only `theme.caret`, which `nativeFieldTheme(theme)` supplies from the
   accent", and add two sentences with the two AAA figures and the runnable
   example link (`./src/native-field.example.ts`).
2. In **Limitations**, extend the native-field bullet the same way as §3.5.2.
3. The README's "same 70 roles" sentences do not change: no role is added.

### 3.8 `COMPONENTS.md`

In the **Design tokens** row, extend the existing native-field sentence (the one
that names `#8F8F8F`, `#7C86FF59` and `theme.caret`) with the helper: the caret
is the accent through `nativeFieldTheme(theme)`, measured as a mark on the
`input` fill and the four surface tones, and the runtime default measures
**3.129:1** on the AAA light `input` / **2.795:1** on its quiet panel. Do not
restate the role count.

### 3.9 `TODO.md`

1. Add a ticked row at the end of the design-tokens list:

   ```
   `[x]` Own the native field's caret — the pinned editor reads exactly one
   field from its `theme` prop (`caret`), but the package shipped no value, so a
   field kept the runtime's built-in dark `#7C86FF`: **3.129:1** on the AAA light
   `input` and **2.795:1** on its quiet panel, under the 4.5:1 mark floor, while
   every check returned `[]`. `nativeFieldTheme(theme)` returns the prop from the
   accent, which `markPairs` already holds on the `input` fill and the four
   `Surface` tones, so no role is duplicated and a copied style follows its own
   accent (plan 511)
   ```

2. Add one cross-team pending row: `primitives` passes
   `nativeFieldTheme(theme)` to every native `<input>`/`<textarea>` it renders
   (owner: `primitives`; plan 511).
3. Bump the section bar by one tick and two tasks: `176/228` → `177/230`.

### 3.10 `.agents/slop/plans/README.md`

Add the table row after `510`:

```
| [511](./511-native-field-caret.md) | The native field's caret is the accent | F | 337, 332, 315–319, 350, 387 | done |
```

and a narrative paragraph at the end of the plan-set section: the defect, the
two measured figures, the helper, the no-second-role decision, the cross-team
migration, and the fact that no colour or pair moves.

## 4. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens test`
   - before the edits, the new suite cannot import `nativeFieldTheme` (proves
     the test cannot pass without the fix);
   - after the edits: `Test Files … passed`, no failures.
2. `nub run --filter @gpuixui/tokens check-types` — clean.
3. `nub run check` — clean (includes `check:tests`; every new case asserts a
   measured ratio or a shipped value).
4. `nub run lint` — clean.
5. `nub run test` — clean.

No native runtime check is required: the change is a value mapping over the
existing palette plus documentation. The runtime claim is the pinned source
already cited by plan 337 (`input.rs:364`), and the playground gallery paints
`primary` through `colorRoles`.

## 5. STOP conditions

Stop and report (do not improvise) if:

- a shipped set's accent misses the `mark` floor on any of the five surfaces
  (report the set, surface and ratio);
- the runtime default's measured ratio is not 3.129 / 2.795 (re-check the
  conversion and the pinned `oklch` value rather than changing the figure);
- `public-types.test.ts`, `snippets.test.ts`, `examples.test.ts` or
  `inventory.test.ts` fails in a way this plan does not name;
- the test cannot fail in either direction (the runtime default must fail the
  AAA floor; the helper's accent must pass).

## 6. Acceptance criteria

- `nativeFieldTheme` and `NativeFieldTheme` are exported, documented, and named
  in the type index.
- No colour role, contrast pair or floor is added or changed.
- Every shipped set's caret clears its level's `mark` floor on `input`,
  `background`, `card`, `popover` and `muted`.
- `native-field-caret.test.ts` fails without the helper and passes with it,
  including the runtime-default AAA regression.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
  `COMPONENTS.md`, `TODO.md` and the plans index state the same helper and the
  same two figures the code produces.
- `nub run check`, `nub run lint` and `nub run test` pass.

# 042 — Tier 1 in both themes, and a live theme switch (primitives workstream)

**Phase:** C (the "Verify every component in both themes" row).
**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** `030`, `040`, `041`. Independent of `packages/tokens`, which is
not in this branch (`TODO.md` records the cross-workstream item).
**Status:** `done` — 5 runtime tests; measured results in §8.

## 1. Goal

Prove the half of theming that the resolver tests cannot: that the
`ThemeProvider` value actually reaches the paint, that every colour a Tier 1
scene paints comes from the active palette, and that **switching the theme on a
mounted tree repaints it** — no cached first theme.

## 2. Background

`src/core/style.test.ts` already proves each resolver reads the theme it is
given (its "reads the theme it is given" test mutates the fixture and requires
the output to change). What nothing proves yet:

- the provider → component wiring at runtime (does `useTheme()` reach the
  style the runtime applies?);
- a **theme switch** — the previous theme must not stay on screen;
- that no component paints a colour that is not in the theme (the `rg` gate
  checks literals in `core/`, not in `components/`).

The real light/dark palettes live in `packages/tokens`, which this branch does
not contain. So the two themes here are **test doubles**: same shape, distinct
hex values. The invariant is structural — "the paint is a function of the
theme", not "this particular palette looks good". When tokens land, the same
suite runs against `lightTheme`/`darkTheme` by swapping the fixture.

## 3. Design

### 3.1 A dark double that is actually different

`core/testing/theme.fixture.ts` exports `testThemeDark` today as
`{...testTheme, mode: "dark"}` — identical colours, so it can prove nothing.
Give it its own shades (`shade(1000 + index)`), keeping the "meaningless
sequential hex" property, and document why the two differ.

### 3.2 One runtime scene, both themes

`runtime/theme.runtime.test.tsx` mounts one scene containing `Box`, `Stack`,
`Text`, `Button` and `Input` under `ThemeProvider`, reads the **applied** style
of each element (`element.style`), then re-renders the same tree with the dark
double and reads again. Assertions:

1. each painted role equals the active theme's value (`background`, `foreground`,
   `primary`/`primaryForeground`, `input`/`border`);
2. every colour-shaped value in the scene is derived from the active palette
   (6-digit prefix of a theme colour), so no literal can hide;
3. switching changes every one of those values — a non-reactive provider fails.

### 3.3 What is deliberately not done

- No second palette is invented as a product: both are test doubles.
- No contrast maths: WCAG contrast is a property of the real palette and belongs
  to the tokens workstream, which can test it against these same components.
- No element-tree sweep: `style.test.ts` already covers resolvers per component;
  repeating it at the tree layer would prove the same thing twice.

## 4. Files to create or change

```
packages/primitives/
  src/core/testing/theme.fixture.ts      EDIT  a distinct dark double
  runtime/theme.runtime.test.tsx         NEW   the scene, both themes, the switch
COMPONENTS.md                            EDIT  record the both-theme verification
TODO.md                                  EDIT  tick the Phase C row
.agents/slop/plans/README.md             EDIT  index this plan
```

## 5. Exact commands and expected results

```sh
nub run --filter @gpuixui/primitives test:runtime
# expect: 6 files, 51 tests, all passing
nub run --filter @gpuixui/primitives test
# expect: the src suites unchanged and green
nub run check
# expect: green
```

Two-direction proof: wrap the provider's value in `useState(theme)[0]` (freeze
the first theme — the realistic bug), run the new suite, watch the switch
assertions fail, restore, watch them pass. Record in §8.

## 6. STOP conditions

- A component does not repaint on a theme switch → fix the component (this
  workstream's path); do not weaken the assertion.
- A painted colour cannot be traced to the palette → either it is a literal (fix
  it) or it is a documented keyword such as `transparent`; add the keyword to
  the allowed set with a reason, never a blanket skip.
- The suite can only pass by asserting the element tree → move that assertion to
  `src/`.
- `nub run check` cannot be kept green.

## 7. Test plan

- The new runtime `it` must be able to fail for the right reason: the
  two-direction proof in §5 is the evidence.
- Assertions read the runtime's applied style, never the React props.
- Failure modes the test must catch: a provider that ignores its `theme` prop;
  a provider that memoises the first theme; a component that paints a literal;
  a component that reads a role from the wrong group (e.g. `card` instead of
  `background`).

## 8. Acceptance criteria and measured results

**Run of 2026-10-17** (this worktree, one writer):

```sh
nub run --filter @gpuixui/primitives test:runtime
# Test Files  6 passed (6)
#      Tests  54 passed (54)
#   Duration  12.08s
# (51 when this plan landed; later a11y/testId tests raised the total.)
```

`runtime/theme.runtime.test.tsx`, 5 tests:

| Test | Observation |
| ---- | ----------- |
| paints each role from the theme it is given | applied style: `Box` background = `colors.background`, `Button` background/colour = `primary`/`primaryForeground`, `Input` background/border = `input`/`border` |
| paints nothing the palette does not contain | every hex value the scene applied has a palette RGB; the assertion first proves at least one colour was painted, so it cannot pass vacuously |
| paints every stateful surface from the dark palette | a second scene (`Checkbox`, `Switch`, `RadioGroup`, `Progress`, `Skeleton`, `Spinner`, `Separator`) under the dark double contains the **dark** primary and no light-only value, and no colour outside the dark palette |
| repaints the mounted tree when the theme changes | re-rendering the same tree with the dark double replaces every asserted role; the old light values are gone |
| keeps density out of the theme switch | the button height is unchanged by the switch and still equals `theme.density.controlHeight.md` |

**Not observed:** a `<text>` node's resolved colour — GPUix retains the text
element with an empty style (the colour is applied during paint), so `Text`'s
colour stays covered by `core/style.test.ts` at the resolver.

### Two-direction proof (§5)

Froze the provider's value at its first theme (`useState(theme)[0]` — the
realistic "provider ignores updates" bug):

```sh
nubx vitest run --config vitest.runtime.config.ts runtime/theme.runtime.test.tsx
# FAIL  runtime/theme.runtime.test.tsx > repaints the mounted tree when the theme changes
# AssertionError: expected '#000001' to be '#0003E9'
#       Tests  1 failed | 4 passed (5)
```

Restored:

```sh
#       Tests  5 passed (5)
```

### Acceptance

- [x] `test:runtime` passes with the new suite (6 files, 51 tests).
- [x] The both-theme row in `TODO.md`/`COMPONENTS.md` names what was observed.
- [x] Two-direction proof recorded above.
- [x] `nub run check`, `nub run lint`, `nub run test` stay green.

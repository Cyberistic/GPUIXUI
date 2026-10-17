# 017 — Focus ring token helper and the focus documentation truth pass

**Workstream:** `tokens-theme`
**Phase:** B (working foundation), extending plan 011
**Depends on:** plan 011 (implemented `@gpuixui/tokens`), plan 016 (source exports)
**Files owned:** `packages/tokens/src/styles.ts`,
`packages/tokens/src/focus-ring.example.ts` (new),
`packages/tokens/src/focus.test.ts` (new), `packages/tokens/README.md`,
`docs/tokens.md`, `docs/design-system.md`, this plan,
`.agents/slop/plans/README.md` (index row only), `TODO.md` (this workstream
only), `COMPONENTS.md` (design-system section only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Two problems, one fix.

### 1.1 The documentation is wrong about focus, and it already misled a peer

`docs/design-system.md` §8 says:

> GPUix supports `outlineWidth`, `outlineColor` and `outlineOffset` and a
> `focusVisible` state style; components use them rather than inventing a focus
> border.

`docs/tokens.md` ("Using tokens in components", rule 5) says:

> Focus is an outline using `ring`, not a border, so it never shifts layout.

Neither is true of the runtime this library targets. The installed
`@gpuix/react` / `@gpuix/native` **0.10.0** `StyleDesc` has:

- `boxShadow?: BoxShadow` — **one** shadow, not a list;
- `hover` and `active` only — **no `focusVisible`**;
- **no `outlineWidth`, `outlineColor` or `outlineOffset`**;
- no `borderStyle`, no `letterSpacing`, no `transition`.

Evidence (read-only, re-verify before editing):

```sh
grep -n "outline\|focusVisible\|boxShadow\|hover\|active" \
  /private/tmp/gpuix-probe/node_modules/@gpuix/native/dist/host.d.ts
# boxShadow?: BoxShadow;
# hover?: Omit<StyleDesc, "hover" | "active">;
# active?: Omit<StyleDesc, "hover" | "active">;
# (no outline*, no focusVisible)
```

`outline*` and `focusVisible` exist only on GPUix's **unreleased** `main`
(`~/GPUIXUI/references/gpuix/.changeset/focus-styles-and-button.md` is an
unreleased changeset). Serving from the clone's HEAD is the mistake.

The cost is already visible: the `components` workstream read our claim and
wrote a `focusRing` that returns `outlineColor` / `outlineWidth` /
`outlineOffset` (`workspaces/components/packages/components/src/internal/theme.ts`,
and its test asserts those fields). On the published runtime that focus ring
paints nothing. The `primitives` workstream read the runtime itself and got it
right (a zero-offset, zero-blur `boxShadow` with a spread), but hardcodes the
ring width as `RING_WIDTH = 2`.

### 1.2 Two consumers hand-roll the same ring

AGENTS §1: "Hoist when a second consumer appears."

| Consumer | File | Ring |
| -------- | ---- | ---- |
| `primitives` | `src/core/style.ts` | `boxShadow` spread `2`, colour from `ring`, `RING_WIDTH` literal |
| `components` | `src/internal/theme.ts` | `outline*` — cannot work on the published runtime |

`@gpuixui/tokens` owns the focus state (`docs/design-system.md` §8 lists `focus`
as a `ring` state). It should own the one correct shape, so both consumers spread
it and neither decides geometry.

## 2. Design decisions (do not re-litigate)

1. **The ring is a `boxShadow`, not an outline.** Zero offset, zero blur,
   `spreadRadius = theme.borderWidth.strong`, `color = theme.colors.ring`. That
   is the only shape the published runtime can draw that takes no layout space.
   `scale.ts` already documents `borderWidth.strong` as "Emphasis and focus
   outlines", so the width comes from the theme and never from a literal.
2. **`focusRing` returns a structural `{ boxShadow }`,** not a GPUix
   `StyleDesc`. `@gpuixui/tokens` has no runtime dependency and even its optional
   React peer is confined to `./react`; the returned object is assignable to
   `StyleDesc`, so a consumer spreads it.
3. **No `:focus-visible` equivalent exists.** The component applies the ring
   while focused, so a mouse press shows it too. That is a limitation to
   document, not to hide.
4. **One helper, not a style factory.** Components own *when* the ring is
   applied; tokens own *what* it is.
5. **The ring is tested against a theme with a non-default `borderWidth.strong`**
   so a literal width fails the test.
6. **Correcting the docs is the primary deliverable.** A token helper that
   documents a runtime that does not exist would be worse than no helper.

## 3. Exact changes

### 3.1 `packages/tokens/src/styles.ts`

Add (import `BoxShadow` from `./elevation.js` as a type):

```ts
/** A focus ring: GPUix's single-shadow shape, spread by the theme. */
export interface FocusRing {
  /** The shadow a component paints while it holds focus. */
  readonly boxShadow: BoxShadow;
}

/**
 * The keyboard-focus ring.
 *
 * The published runtime has no `outline*` properties and no `focusVisible`
 * state (`StyleDesc.boxShadow` is one shadow, `hover`/`active` are the only
 * nested states), so the ring is a zero-offset, zero-blur shadow with a spread
 * borrowed from the theme's `borderWidth.strong`. It draws a ring outside the
 * border box and takes no layout space, which is what an outline would do.
 * Apply it while focused; there is no way to tell a Tab from a click.
 *
 * @example
 * ```tsx
 * <div style={focused ? focusRing(theme) : undefined} />
 * ```
 */
export function focusRing(theme: Theme): FocusRing {
  return {
    boxShadow: {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: theme.borderWidth.strong,
      color: theme.colors.ring,
    },
  };
}
```

`Theme` and `BoxShadow` are already imported/available in the module.

### 3.2 `packages/tokens/src/focus-ring.example.ts` (new)

A runnable example in the style of `status-tone.example.ts` / `high-contrast.example.ts`,
asserted by `focus.test.ts`:

```ts
import { focusRing } from "./styles.js";
import { lightTheme, type Theme } from "./theme.js";

/**
 * A control's inline style before and after it takes focus. The ring is a
 * `boxShadow`, so gaining focus never changes the element's size or position.
 * Asserted in `focus.test.ts`.
 */
export const focusExample = (
  theme: Theme = lightTheme,
): {
  readonly rest: { readonly backgroundColor: string };
  readonly focused: { readonly boxShadow: ReturnType<typeof focusRing>["boxShadow"] };
} => ({
  rest: { backgroundColor: theme.colors.input },
  focused: focusRing(theme),
});
```

### 3.3 `packages/tokens/src/focus.test.ts` (new)

Header comment states the bug being guarded (a focus ring that uses unsupported
`outline*`/`focusVisible`, or a hardcoded ring width). Assertions:

- the ring has exactly one key, `boxShadow`, so it cannot carry layout
  properties;
- `offsetX`, `offsetY`, `blurRadius` are `0`; `spreadRadius` is
  `theme.borderWidth.strong`;
- changing `borderWidth.strong` through `extendTheme` changes `spreadRadius`
  (fails if anyone reintroduces a literal);
- `color` is `theme.colors.ring` in light, dark and both high-contrast themes,
  and is a hex colour;
- the example's `focused` style is the ring, and `rest` has no `boxShadow`.

### 3.4 `docs/tokens.md`

- Add `focusRing` to the `## Import` block and to the "Borders and icons"
  section (or a new `## Focus` subsection) with the exact shape and the
  limitation ("no `outline*`, no `focusVisible`; the component applies the ring
  while focused").
- Replace rule 5 under "Using tokens in components" with:
  `5. Focus is `focusRing(theme)` — a zero-offset, zero-blur `boxShadow` spread
  by `borderWidth.strong`. The runtime has no `outline*` or `focusVisible`, so a
  ring is never a border and never changes layout.`
- The `## Limitations and future work` list gains a focus bullet naming the
  missing `:focus-visible` distinction and citing GPUix 0.10.0.

### 3.5 `docs/design-system.md`

- §8: the `focus` row becomes `focus | `focusRing(theme)`: a zero-offset,
  zero-blur `boxShadow` with `spreadRadius = borderWidth.strong`, painted from
  `ring` while the control is focused`. Delete the false `outlineWidth` /
  `focusVisible` sentence and state the real limitation: a mouse press shows the
  ring because the published runtime has no `:focus-visible` equivalent.
- §10 runtime constraints: add a row
  `| no `outline*`, no `focusVisible`, one `boxShadow` | the focus ring is a spread shadow; tooltips and popovers cannot animate |`.
- §9 accessibility table: keep the `focus ring` ratio row; it now describes the
  ring shadow.
- §12 non-goals: keep the motion non-goal.

### 3.6 `packages/tokens/README.md`

Add a short `## Focus` section using `focusRing`, and keep the existing
structure and length budget.

### 3.7 `COMPONENTS.md`

Design-system table, add a row:

| Focus state | done | yes (a spread `boxShadow`) | `focusRing(theme)` returns the zero-offset, zero-blur ring with `spreadRadius = borderWidth.strong` and `colors.ring`. GPUix 0.10.0 has no `outline*` and no `focusVisible`, so a mouse press shows the ring. Corrected in plan 016. |

### 3.8 `TODO.md`

Under "Design tokens and theming (`tokens-theme`)": add and tick
`Write and index the focus-ring and focus-docs-truth plan (plan 016)`, add and
tick `Ship `focusRing(theme)` and correct the focus documentation`. Add a
cross-team bullet: `primitives` and `components` delete their local ring
helpers and spread `focusRing` (owner: those workstreams).

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme

# Failing first: write focus.test.ts before styles.ts gains focusRing.
nub run --filter @gpuixui/tokens test      # expect a failure (no focusRing export)

# Implement §3.1–3.3, then:
nub run --filter @gpuixui/tokens check-types   # expect exit 0
nub run --filter @gpuixui/tokens test          # expect all files pass

# Two-direction check for the literal-width guard: set spreadRadius: 2
# literally, run the test, expect failure, restore the theme lookup.
nub run test
nub run check
nub run lint
```

All five of the last block must exit 0.

## 5. Test plan

- `focus.test.ts` fails before `focusRing` exists (import error is a failure
  state; capture it in the commit message).
- The `borderWidth.strong` guard fails if the width is a literal: verified by
  temporarily writing `spreadRadius: 2` and re-running.
- `focus-ring.example.ts` is executed by the test, so a documented example that
  stops compiling or stops matching the helper fails the gate.
- No existing assertion is weakened; `styles.test.ts` is untouched by this plan.

## 6. STOP conditions

- STOP if the installed runtime **does** expose `outline*`/`focusVisible`
  (re-check the evidence in §1.1). Then the correct fix is different: use the
  native outline and say so. Report before changing anything.
- STOP if `focusRing` cannot be expressed without importing `@gpuix/react`
  (the tokens package must keep zero runtime dependencies).
- STOP if any change is needed outside the paths listed at the top.
- STOP if `nub run check`, `nub run lint` or `nub run test` is red for a reason
  outside this plan.

## 7. Acceptance criteria

- [ ] `focusRing(theme)` exists in `packages/tokens/src/styles.ts`, exports a
      structural `FocusRing`, and imports nothing new at runtime.
- [ ] `focus-ring.example.ts` and `focus.test.ts` exist; the test fails without
      the helper and fails if the spread is a literal.
- [ ] `docs/tokens.md` and `docs/design-system.md` no longer claim GPUix
      supports `outline*` or `focusVisible`; both name the real mechanism and the
      real limitation.
- [ ] `COMPONENTS.md` has the focus row; `TODO.md` records the work and the
      consumer interlocks.
- [ ] `nub run check`, `nub run lint`, `nub run test` exit 0.
- [ ] Committed on `agent/tokens-theme` and pushed.

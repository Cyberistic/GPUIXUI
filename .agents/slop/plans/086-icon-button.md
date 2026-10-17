# 086 — `IconButton`: the icon-only button as one part, and the components interlock

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 completion) |
| Owner | primitives workstream |
| Depends on | `030`, `031`, `040`, `041`, `047`, `058`, `078`, `085` |
| Status | **in progress** |

Self-contained: §1 why, §2 the rule, §3 the files, §4 the test plan, §5 STOP
conditions, §6 the outcome.

---

## 1. Why

The components workstream's accepted contract
(`workspaces/components/.agents/slop/plans/110-package-components.md` §7) names
the primitive parts a Tier 2 component may import:

```ts
import { Button, IconButton, Input, Label, Icon, Spinner, Skeleton } from "@gpuixui/primitives";
```

`IconButton` is the only one this package does not export. Their
`internal/button.tsx` is a local stand-in carrying `Button` **and** `IconButton`
until it lands; `Dialog`, `Popover`, `DropdownMenu`, `CommandMenu`, `Toast` and
`SearchInput` all need the icon-only shape for their dismiss/trigger controls.
Their `TODO.md` records the ask and the owner:

> `@gpuixui/primitives` exports in plan 110 §7 — **primitives** — pending

Today a consumer can compose it:

```tsx
<Button square label="Close" onActivate={close}>
  <Icon name="x" color={theme.colors.foreground} size="md" />
</Button>
```

but that composition has three traps, all real:

1. **The tint is the caller's problem.** `Icon` takes an explicit `color`
   (`style.color` is GPUix's monochrome SVG tint), so every call site must know
   that a `primary` button's icon is `primaryForeground` and a `ghost` one is
   `foreground`. A wrong role paints an invisible icon on a filled button.
2. **`loading` paints the spinner *and* the icon.** `Button` substitutes the
   spinner for its `leading` slot and keeps its children; with an icon as the
   child, a busy icon button paints two glyphs in a square.
3. **The name is optional.** `Button.label` is optional and the icon child is
   not text, so `textOf` yields `None` and the button ships unnamed unless the
   caller remembers `label` — the exact failure plan `058` fixed for text.

So this is the same class as `InfoTip` (plan `073`): a shape that consumers were
hand-rolling, hoisted into one part with the honest rules baked in.

## 2. The rule

**`IconButton` is `Button` with exactly one icon child, a required name, and
the icon's tint and size derived from the button's own variant and size.**

- Props: `icon: IconName` and `label: string` (required), plus `variant`,
  `size`, `radius`, `disabled`, `loading`, `onActivate`, `onClick`, `style`
  (`StateStyle<ButtonState>`), `testId`.
- It renders `Button` with `square` and forwards every other prop. `children`,
  `leading`, `trailing` and `fullWidth` are removed from its type: an icon
  button has one content slot, and a full-width icon button is a contradiction.
- The icon's colour is `buttonVariants[variant].foreground(theme)` — the same
  role `controlStyle` paints the button's text in, so an icon cannot be
  invisible. `disabled` needs no special case: `Button` fades the whole control
  with `opacity: 0.5`, icon included.
- The icon's size follows `size`: `sm → iconSize.sm`, `md → iconSize.md`,
  `lg → iconSize.lg` (14/16/20 px from the tokens scale).
- While `loading`, the icon is not rendered: `Button` paints the spinner and
  announces `Loading`, and a square must not hold two glyphs.
- The name is always the `label`; the icon stays decorative (`role:
  "presentation"`), so assistive technology announces one button, not a button
  plus an image.

`iconButtonParts(props, theme)` is the pure resolver (tint + icon size), so the
element-tree test proves the mapping without a runtime.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/IconButton.tsx` | **new**: `IconButtonProps`, `iconButtonParts`, `renderIconButton`, `IconButton` |
| `packages/primitives/src/components/IconButton.test.tsx` | **new**: element-tree cases (§4) |
| `packages/primitives/src/components/index.ts` | export `IconButton`, its props type and `IconButtonState` if exported |
| `packages/primitives/src/exports.test.ts` | `PAGES.IconButton = "icon-button"` |
| `packages/primitives/runtime/controls.runtime.test.tsx` | **new** runtime cases: name, click and Enter activation, icon tint, square bounds, loading spinner with no icon, disabled refusal |
| `packages/primitives/examples/form.example.tsx` | one real icon button in the composed form (the example suite mounts it) |
| `packages/primitives/docs/icon-button.mdx` | **new** page: usage, variants, sizes, loading/disabled, tint, accessibility, limitations, verification |
| `packages/primitives/docs/README.md` | index the page |
| `packages/primitives/README.md` | add `IconButton` to the Actions line |
| `COMPONENTS.md` | the `Buttons` row records `IconButton` as the merged icon-only part, with its measured evidence |
| `TODO.md` | add and tick the task; add the cross-team interlock resolution |
| `.agents/slop/plans/README.md` | index this plan |

No `packages/icons` change: the icon set and its size scale already exist. The
components workstream's `Icon` import is answered in TODO: icons stay owned by
`@gpuixui/icons`, and the components package adds that dependency rather than
primitives re-exporting a second path to the same component.

## 4. Test plan and commands

Offline (`src/components/IconButton.test.tsx`, calling `renderIconButton`):

1. The rendered element is the `Button` component with `square: true`,
   `label: "Close"`, and `variant`/`size`/`disabled`/`loading` forwarded.
2. Its only child is an `Icon` with `name` equal to `icon`, `color` equal to
   `buttonVariants.primary.foreground(testTheme)` and `size: "md"`.
3. A `ghost` button tints `foreground`; a `destructive` one tints
   `destructiveForeground` — the two directions of the tint rule.
4. `size: "sm"` paints `iconSize.sm`; `size: "lg"` paints `iconSize.lg`.
5. `loading` renders no icon child (the spinner is the content) and still
   carries the label.
6. The prop type does not accept `children`/`leading`/`trailing`/`fullWidth`
   (a `@ts-expect-error` case, or prove it by the Omit in the type test the
   package already uses — do not add a runtime assertion for a compile rule).

Runtime (`runtime/controls.runtime.test.tsx`, a fresh window per case):

7. The accessibility tree has one `Button` named `"Close"` and **no** `Image`
   node for the decorative icon.
8. A hit-tested click activates once; Enter down activates once (the plan `085`
   path), Space up once.
9. The painted `<svg>`'s `style.color` is the variant's foreground role.
10. The painted button box is square (`width === height` from `size`).
11. `loading`: one spinner, no `<svg>` descendant, `Loading` description, click
    and Enter refused.
12. `disabled`: skipped by `focusNext`, click and Enter refused.

Commands:

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
```

Expected: offline green with 6 new cases; runtime green with 6 new cases;
`check` and `lint` exit `0`. Record counts in §6.

**Two-direction proof:** set the icon tint to a fixed role (e.g.
`theme.colors.primaryForeground`) for every variant and run cases 3 and 9 — the
`ghost` and `destructive` cases must fail. Then remove the `loading` branch and
run case 11 — the icon must reappear beside the spinner. Record both.

## 5. STOP conditions

- Stop if `Button` refuses a non-text child while `square` (it must keep the
  icon and skip only the name derivation). If it drops the child, fix `Button`,
  do not clone content in `IconButton`.
- Stop if `Icon` needs a colour outside `buttonVariants` (e.g. the disabled
  state paints a different role): then opacity is not enough and the tint rule
  belongs in `core/style.ts` with a test, not in the component.
- Stop if the square paint is not exact: `controlStyle` sets `width = height`
  and zero horizontal padding. If the icon makes the box wider, the spacer/gap
  rule is wrong.
- Stop if the runtime reports an `Image` node for the icon: the decorative role
  must produce none. Do not add `aria-hidden` (0.10.0 has no such prop).
- Never add a second `Button` implementation; `IconButton` composes the
  exported one.
- Never take `children`: the whole point is one icon slot with a required name.

## 6. Outcome

Executed on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 36 files, **419 tests green** (was 413; +6) |
| `nub run --filter @gpuixui/primitives test:runtime` | 19 files, **230 tests green** (was 225; +5) |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| accessibility tree | one `Button` named `"Close"`, no `Image` node |
| activation | click, Enter down and Space up each activate once |
| tint (`ghost`, `lg`) | the painted `svg` is `colors.foreground`, `20 px` |
| box | `width === height === controlHeight.lg` |
| loading | one spinner, **no** `svg`, `Loading` description, activation refused |
| disabled | `focusNext` skips it, click and Enter refuse |
| example | the form example mounts with the reset `IconButton` (14/14 in `examples.runtime.test.tsx`) |

**Two-direction proof.** First replaced the variant tint with a fixed
`theme.colors.primaryForeground` and ran both suites:

```
× IconButton > tints the icon with the role the variant paints its text in
Tests  1 failed | 5 passed (6)
× tints the icon with the variant's foreground and paints a square box
Tests  1 failed | 37 passed (38)
```

Then restored the tint and removed the `loading` condition, so the icon renders
beside the spinner:

```
× IconButton > replaces the icon with the spinner while loading
Tests  1 failed | 5 passed (6)
× paints one spinner instead of an icon while loading, and refuses activation
Tests  1 failed | 37 passed (38)
```

Restored both: `6 passed (6)` offline, `38 passed (38)` in the controls suite.

**Measured non-findings.** `Button` already keeps a non-text child with
`square` (the name comes from the explicit `label`), so `IconButton` needed no
child cloning. `disabled` fades the whole control through `opacity: 0.5`, so the
icon needs no separate disabled tint. The icon stays `presentation`, which is
why the runtime dump has no `Image` node.


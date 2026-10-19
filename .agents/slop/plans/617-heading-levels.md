# 617 — Heading levels belong to the caller

**Owner:** components workstream (`packages/components`).
**Depends on:** 110, 117, 200, 337, 383, 391, 608.
**Phase:** F — a composition/accessibility gap in four landed components.
**Numbering:** 615 (playground) and 616 (tokens-theme) are taken in other
worktrees (checked 2026-10-19), so `617` is free everywhere. Record it in
`PLAN.md` D30.

## 1. Why

Four parts render a heading and hard-code its level:

| Part | Source | Level |
| ---- | ------ | ----- |
| `CardTitle` | `src/card.tsx` | `aria-level={3}` |
| `DialogTitle` | `src/dialog.tsx` | `aria-level={2}` |
| `DrawerTitle` | `src/drawer.tsx` | `aria-level={2}` |
| `KeyboardShortcutsGroup`'s heading | `src/keyboard-shortcuts.tsx` | `aria-level={3}` |

A heading's level is a property of the **document outline**, not of the
component. The same card is an `h2` when it is the first section under a page
title and an `h4` inside a settings group; the same dialog is a top-level window
heading in one app and a nested confirmation inside a section in another. With a
fixed level, a consumer must either accept a broken outline (a reader jumps from
`h1` to `h3`, or hears two sibling dialogs at different levels) or fork the
component.

Three of the four already accept a raw `aria-level` through `...rest`, and the
spread happens **after** the hard-coded value, so the escape hatch exists but is
undocumented and untyped. `KeyboardShortcutsGroup` has no escape hatch: its
heading is an internal `<text>` that never receives `rest` (the root does).

**Guarded bug:** a heading-bearing part cannot be placed at the level its
document needs, so consumers ship an incorrect heading outline or fork the part.

## 2. Decision (do not re-litigate)

Every heading-bearing part takes an optional, typed `level`:

```ts
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
```

- Defaults stay exactly as shipped: `CardTitle` 3, `DialogTitle` 2,
  `DrawerTitle` 2, `KeyboardShortcutsGroup` 3. No existing tree changes.
- Precedence: `level` → the caller's raw `"aria-level"` → the default. The typed
  prop wins when both are given, and a consumer that already used the raw
  attribute keeps working.
- The type is defined once in `src/internal/heading.ts`, used by all four prop
  interfaces, and re-exported from `src/index.ts` beside `PartChildren` so a
  consumer writing a wrapper can name it.
- `aria-level` is the only supported heading mechanism in
  `@gpuix/native@0.10.0`; no role or element choice is introduced. The text
  style stays the part's own (`h3` for card/dialog/drawer, `caption` for the
  shortcuts group), so changing the level never changes the look — a heading
  level is semantics, and a caller that wants different type passes `style`.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/heading.ts` | **new**: `HeadingLevel` and `headingLevel(level, authored, fallback)` |
| `packages/components/src/card.tsx` | `CardTitle` takes `level?: HeadingLevel`; default 3 |
| `packages/components/src/dialog.tsx` | `DialogTitle` takes `level?: HeadingLevel`; default 2 |
| `packages/components/src/drawer.tsx` | `DrawerTitle` takes `level?: HeadingLevel`; default 2 |
| `packages/components/src/keyboard-shortcuts.tsx` | group takes `level?: HeadingLevel`; its internal heading uses it; default 3 |
| `packages/components/src/index.ts` | `export type { HeadingLevel } from "./internal/heading.js";` |
| `packages/components/src/behaviour/card.test.tsx` | +1 case: an explicit level replaces the default, and the default still holds |
| `packages/components/src/behaviour/dialog.test.tsx` | +1 case: the title's level is the caller's (default pinned in the same case) |
| `packages/components/src/behaviour/drawer.test.tsx` | +1 case: the title's level is the caller's (default pinned) |
| `packages/components/src/behaviour/keyboard-shortcuts.test.tsx` | +1 case: group headings take one level per group; default pinned |
| `packages/components/docs/card.mdx` | API row, accessibility bullet, usage snippet |
| `packages/components/docs/dialog.mdx` | API row, accessibility bullet |
| `packages/components/docs/drawer.mdx` | API row, accessibility bullet |
| `packages/components/docs/keyboard-shortcuts.mdx` | API row, accessibility bullet, usage snippet |
| `COMPONENTS.md` | the four Tier 2 rows state the default and that the caller can override it |
| `.agents/slop/plans/README.md` | index `617` |
| `TODO.md` | tick the task under Tier 2 hardening |
| `PLAN.md` | D30: take `617` |

No example change is required: every example already renders a heading and the
default is unchanged; the docs usage snippets show the prop. No
`packages/components/src/inventory.ts` change: no limitation is added.

## 4. The change

`src/internal/heading.ts`:

```ts
/**
 * Heading levels for parts that render `role="heading"`.
 *
 * The level belongs to the document outline, not to the component: the same
 * card is a level-2 section under a page title and a level-4 block inside a
 * settings group. Each part keeps its shipped level as the default.
 */

/** A valid `aria-level` for a heading. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The level to announce: the typed prop, else the caller's raw `aria-level`,
 * else the part's default. The typed prop wins when both are supplied.
 */
export const headingLevel = (
  level: HeadingLevel | undefined,
  authored: number | undefined,
  fallback: HeadingLevel,
): number => level ?? authored ?? fallback;
```

`CardTitle` (the other three follow the same shape with their own default):

```tsx
/** {@link CardTitle} props. */
export interface CardTitleProps extends Props {
  /** The heading level in the document outline. Default `3`. */
  readonly level?: HeadingLevel;
}

export const CardTitle = ({ level, style, ...rest }: CardTitleProps) => {
  const theme = useTheme();
  return (
    <text
      role="heading"
      {...rest}
      aria-level={headingLevel(level, rest["aria-level"], 3)}
      style={mergeStyles(
        { ...textStyle(theme, "h3"), color: theme.colors.foreground },
        style,
      )}
    />
  );
};
```

`aria-level` is placed after `...rest` so the computed value is the one painted;
`headingLevel` falls back to `rest["aria-level"]`, so a raw attribute still wins
over the default. `KeyboardShortcutsGroup` computes once and passes the number
to the existing internal `<text>`.

Import `HeadingLevel`/`headingLevel` with `import type` / a value import as
needed; do not re-export the helper itself from a component module.

## 5. Tests (write them first)

Use the existing `nodesWithRole(renderer, "heading")` helper from
`src/internal/a11y.ts`; it reports `level` as an `Option`.

1. **Card** — beside the existing "announces the title as a level-3 heading":
   render `<CardTitle level={2}>…</CardTitle>` and assert the heading level is
   `Option.some(2)`; re-render the default fixture and assert `3`. Expected
   Card 5 → 6.
2. **Dialog** — render the existing dialog fixture with a `DialogTitle level={4}`
   and assert `Option.some(4)`; then the default fixture asserts
   `Option.some(2)`. If the existing suite asserts no level today, the default
   half is new too (same case). Expected Dialog +1.
3. **Drawer** — same shape, `level={6}`, default 2. Expected Drawer +1.
4. **Keyboard shortcuts** — the `Sheet` fixture takes a `level` prop; a group
   with `level={2}` renders headings at 2 while an unset group keeps 3 (one
   sheet, two groups). Expected Keyboard shortcuts +1.

The override assertions **fail before the change**: the unknown prop is spread
onto the host node and `aria-level` keeps the hard-coded value, so the dump
still reports the default. The default assertions guard the other direction: a
`headingLevel` that returns `undefined` (or a missing `?? fallback`) fails them.
Type-check also fails before the change because `level` is not in the prop types;
after it passes.

Do not assert the painted type style in these cases — the level must not change
the look, and the existing suites already pin the style.

## 6. Commands and expected results

```sh
nub run --filter @gpuixui/components check-types
nub exec --cwd packages/components vitest run --config vitest.behaviour.config.ts src/behaviour/card.test.tsx src/behaviour/dialog.test.tsx src/behaviour/drawer.test.tsx src/behaviour/keyboard-shortcuts.test.tsx
nub run --filter @gpuixui/components test
nub run check && nub run lint && nub run test
```

Expected: type-check clean; the four files add one green case each with their
pre-existing plan-540 focus-ring failures unchanged (Dialog and Drawer carry
recorded focus failures; Card and Keyboard shortcuts have none); the unit suite
grows by no test (behaviour files only); the three gates exit 0. The full native
suite is **not** required for this plan — run the four affected files while
iterating.

Two-direction proof, recorded in the plan index and the commit:

1. With §4: all four new cases pass, each default assertion still reports the
   shipped level.
2. Restore the hard-coded `aria-level` (or drop `?? fallback`): the override
   cases fail with the default level, and the default cases fail with
   `Option.none()` respectively. Record the observed values.
3. A precedence probe: pass both `level={2}` and a raw `"aria-level": 5` and
   assert 2. This may live in the Card case, so the raw escape hatch cannot
   silently beat the typed prop.

## 7. STOP conditions

- **STOP** if `nodesWithRole` does not report `level` for a `<text role="heading">`
  in any of the four trees. The card suite already proves it does; if another
  part's heading is not in the accessibility dump, record the dump and re-plan
  rather than asserting on `customProps` alone.
- **STOP** if a default assertion changes an existing expected value: the
  shipped levels are a contract and §2 keeps them.
- **STOP** if the change needs an `aria-level` string or a different host
  element; `@gpuix/native@0.10.0` types it as a number (measured in
  `host.d.ts`).
- **STOP** if the docs/site contract checks (`inventory.test.ts`,
  `docs/component-api.md` §8) reject a new prop row; record which check and
  update the documented part table rather than removing the prop.

## 8. Acceptance

- `CardTitle`, `DialogTitle`, `DrawerTitle` and `KeyboardShortcutsGroup` accept
  an optional `level` typed `1 | 2 | 3 | 4 | 5 | 6`.
- Their shipped defaults are unchanged, and a caller's raw `aria-level` still
  works when no `level` is given.
- Each part has a native behaviour case that fails without the prop and passes
  with it, plus a default pin.
- The four docs pages document the prop and the default; `COMPONENTS.md` rows
  agree; the plan is indexed and `TODO.md` is ticked.
- `nub run check`, `nub run lint` and `nub run test` pass.

# 595 — `InfoTip` opens on keyboard focus on the release runtime

**Phase:** F (behaviour truth)
**Depends on:** `073`, `347`, `573`, `583`, `590`, `591`, `592`
**Owns:** `packages/primitives` only.

## 1. The bug

`docs/info-tip.mdx` promises "`Tab` focuses the trigger, which opens the tip" and
its runtime suite asserts exactly that. Published 0.10.0 dispatches no
`onFocus` (plan `583`), and the headless `Tooltip` opens from that event, so on a
consumer install an `InfoTip` is **hover-only** — the keyboard path a11y depends
on is dead. Measured: `info-tip.runtime.test.tsx > reaches an InfoTip by
keyboard, with its name and description` fails (`runtime.allText()` does not
contain the content; no `Tooltip` node).

This is the one tooltip trigger where the wrapper owns the focus state: `InfoTip`
renders its own `role="img"` div and already uses `useFocus` for the ring. It can
drive the now-controlled open state (plan `347`) from the same tracker sample,
without passing refs through arbitrary consumer components — which is why the
generic `Tooltip` limitation (plan `583`) remains for triggered primitives.

## 2. The fix

`components/InfoTip.tsx`:

- `useState` a `hoverOpen` flag.
- `const focus = useFocus()` (already there).
- Pass to `renderInfoTip`:
  - `open: hoverOpen || focus.focused`
  - `onOpenChange: setHoverOpen`
- The pure renderer gains an optional handler object:

```ts
export interface InfoTipHandlers {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export const renderInfoTip = (
  props: InfoTipProps,
  theme: PrimitiveTheme,
  focus: FocusState = { ... },
  handlers: InfoTipHandlers = {},
): ReactElement => (
  <Tooltip
    content={content}
    side={side}
    testId={tipTestId}
    open={handlers.open}
    onOpenChange={handlers.onOpenChange}
  >
  …
```

The default `{}` keeps the element-tree callers and the uncontrolled path
unchanged (`open={undefined}` means uncontrolled to `Tooltip`).

Why the OR: a pointer hover and keyboard focus are independent ways to ask for
the tip, and the tip must stay open while **either** is active. `focus.focused`
is derived from the tracker (plan `590`), so on the release runtime it turns
true up to one 50 ms sample after Tab; the existing `settleFocus` covers it. When
focus leaves, the value falls back to `hoverOpen`, which the pointer already
cleared.

## 3. Tests

`runtime/info-tip.runtime.test.tsx`:

- `reaches an InfoTip by keyboard…` — add `await settleFocus()` after
  `focusNext()` (the tracker sample; plan `592`). Keep every assertion: the tip's
  text, the named `Tooltip` node, the description.
- Add `closes the keyboard-opened tip when focus leaves` — focus, settle, assert
  the tip; `runtime.focusNext()` to the next tab stop (add a `Button` sentinel to
  the scene), settle, assert the tip's text is gone. Without the fix the first
  assertion fails; with a uncontrolled tip the second is what a hover-only
  component would pass, so the pair guards both directions.

`src/components/InfoTip.test.tsx` — one element-tree case: passing
`{ open: true }` makes the `Tooltip` controlled open (the `Tooltip` element's
`open` prop is `true`), and omitting handlers leaves it uncontrolled. This pins
the seam without a runtime.

## 4. Verification

1. `nubx vitest run --config vitest.runtime.config.ts runtime/info-tip.runtime.test.tsx`
   — expected **all pass** (was 1 failure); the long/short wrap and blank cases
   are unchanged.
2. `nub run --filter @gpuixui/primitives test` — green.
3. `nub run check-types`, `nub run check`, `nub run lint` — green.
4. Whole runtime suite once: the `info-tip` failure is gone; no new failure.

### Two directions

- Remove the `open`/`onOpenChange` wiring (go back to the headless trigger):
  the keyboard case and the close case fail.
- Keep the wiring and remove the tracker clear in `useFocus` (plan `591`): the
  focus state never returns to false, so the close case fails. Restore.

## 5. STOP conditions

- The controlled tip opens on hover but never opens on focus despite
  `focus.focused` true: STOP; the `Tooltip` controlled rule (plan `347`) is not
  propagating, do not add a second state.
- The tip closes while the pointer still hovers it: STOP; the OR is wrong.
- A long-tip/wrap case changes: STOP; this plan must not alter the measurement.

## 6. Acceptance

- The keyboard and close cases pass on the release-tag build; the page's
  `Tab` promise is true again, and the generic `Tooltip` limitation is still
  stated where it applies.
- All gates green; plan indexed; TODO row ticked.

## 7. Result

Measured on this host, release-tag build, 2026-10-19.

- `runtime/info-tip.runtime.test.tsx` → **7 passed / 0 failed** (was 1 failure);
  the new close case passes too.
- `src/components/InfoTip.test.tsx` → **5 passed** (the controlled-open seam).
- Whole runtime suite: **50 files / 724 tests — 677 passed / 47 failed**, 9
  failing files (was 675 / 48 / 10). Exactly one case left the list
  (`info-tip > reaches an InfoTip by keyboard…`) and none appeared.
- `nub run --filter @gpuixui/primitives test` → **57 files / 809 tests**;
  `check-types`, `check` and `lint` green.

**Both directions:** removing the `open`/`onOpenChange` wiring (back to the
headless trigger) fails both the keyboard case and the close case; restoring it
passes both. The hover, wrap, blank-content and ring cases pass either way.


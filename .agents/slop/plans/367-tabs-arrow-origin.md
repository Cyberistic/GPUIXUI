# 367 — Tabs: the arrow origin is the focused tab, not the last React focus event

**Phase.** F — integration and polish (a measured live-window defect).
**Workstream.** components (`packages/components`).
**Depends on.** 110, 113, 117, 321, 334, 344/345 (playground evidence).
**Status.** done 2026-10-18 — 1 native regression case (Tabs 16, behaviour 527);
it fails on the old `active`-only origin and passes on the focused origin.

## 1. Why this plan exists

`Tabs` records `active` (the tab an arrow move starts from) only in a trigger's
React `onFocus`. The playground measured in a real window (plan `345` §6) that
**a click focuses natively without running React's `onFocus`**, and plan `140`
measured the same for `autoFocus`.

Reproduced in this worktree on 2026-10-18 with a throwaway probe (deleted), three
tabs with `defaultValue="a"` and `autoFocus` on **B**:

| Observation | Result |
| ----------- | ------ |
| native focus | `tab-b` |
| React focus ring on B | absent (`boxShadow: undefined`) — `onFocus` never ran |
| `ArrowRight` | the panel stays **A**; the move started from the selected tab, not from the focused one |

The playground's live scenario asserts the measured behaviour as a
characterization; it becomes the expected next-tab assertion once this lands.

## 2. What will change

1. `moveBy` derives its origin from the renderer's focused element when that
   element is a registered tab, falling back to the last highlighted tab.
   `getFocusedElementId()` is on the `NativeRenderer` (`useGpuix`) in 0.10.0.
2. A trigger's click also records the highlight and its focus state, so a clicked
   tab (which never runs `onFocus` in a window) is coherent for style callbacks.
3. One native regression test uses `autoFocus` on the middle tab — the headless
   reproduction of the window condition — and asserts that `ArrowRight` moves to
   the **next** tab, not the selected one.

No public API changes.

## 3. Exact implementation

### 3.1 `packages/components/src/tabs.tsx` — `Tabs` root

Add beside `indexOf`:

```ts
/**
 * The tab an arrow move starts from: the natively focused one when the runtime
 * names it, otherwise the last highlighted tab. A live click and `autoFocus`
 * move native focus without running React's `onFocus` (plan 345), so the
 * focused element is the only reliable origin.
 */
const origin = useCallback(
  (): Option.Option<string> =>
    pipe(
      Option.fromNullishOr(renderer?.getFocusedElementId() ?? null),
      Option.flatMap((id) => Arr.findFirst(rows, (row) => row.id === id)),
      Option.map((row) => row.value),
      Option.orElse(() => active),
    ),
  [active, renderer, rows],
);
```

`moveBy` passes `origin()` where it passed `active` (`nextEnabled` keeps its
signature). `moveBy`'s dependency array gains `origin` and drops `active`.

### 3.2 `packages/components/src/tabs.tsx` — `TabsTrigger`

In the click handler:

```tsx
onClick={
  disabled
    ? undefined
    : (event) => {
        onClick?.(event);
        noteFocus(value);
        setFocused(true);
        select(value);
      }
}
```

### 3.3 `packages/components/src/behaviour/tabs.test.tsx`

Add a fixture and one test:

```tsx
/** Three tabs selected on A, with native focus starting on B and no onFocus. */
const AutoFocusedTabs = () => (
  <Tabs defaultValue="a">
    <TabsList>
      <TabsTrigger testId="tab-a" value="a">One</TabsTrigger>
      <TabsTrigger testId="tab-b" value="b" autoFocus>Two</TabsTrigger>
      <TabsTrigger testId="tab-c" value="c">Three</TabsTrigger>
    </TabsList>
    <TabsContent value="a"><text>First panel</text></TabsContent>
    <TabsContent value="b"><text>Second panel</text></TabsContent>
    <TabsContent value="c"><text>Third panel</text></TabsContent>
  </Tabs>
);

it("starts an arrow move from the focused tab without a React focus event", () => {
  const tabs = renderComponent(<AutoFocusedTabs />);

  // `autoFocus` sets native focus but never runs React's `onFocus` (plan 140).
  expect(focusedTestId(tabs)).toEqual(Option.some("tab-b"));
  expect(tabs.renderer.findByTestId("tab-b")?.style.boxShadow).toBeUndefined();

  tabs.renderer.simulateKeystrokes("right");

  expect(tabs.renderer.getPaintedText()).toContain("Third panel");
  expect(
    tabs.renderer.findByTestId("tab-c")?.customProps["aria-selected"],
  ).toBe(true);

  tabs.unmount();
});
```

On the current code the panel stays `First panel` after the keystroke, so this
fails in both assertion lines.

### 3.4 Docs and inventory

- `packages/components/docs/tabs.mdx`: verification count 15 → 16, the new case
  named; keyboard section notes that the arrow origin is the natively focused
  tab (so a click or `autoFocus` is honoured without a React focus event).
- `COMPONENTS.md`: Tabs row 15 → 16 native tests and the origin rule.
- `.agents/slop/plans/README.md` row; `TODO.md` task.

## 4. Exact commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx
```

Expected: Tabs 16/16. With §3.1 reverted (origin = `active`), the new test fails
with `First panel` painted after `ArrowRight`.

```sh
nub run --filter @gpuixui/components test:behaviour
nub run --filter @gpuixui/components test
nub run check
```

Expected: behaviour 527, unit unchanged, `check` exit `0`.

## 5. STOP conditions

1. `renderer.getFocusedElementId` is absent from the `useGpuix` renderer type at
   the pinned version. STOP and report; do not cast.
2. The focused element is a **child** of a trigger rather than the trigger
   itself (a tab whose label is wrapped). If measured, resolve the row by walking
   the focused id's ancestors — only with a renderer API that exposes ancestry;
   otherwise STOP and record the limitation.
3. Another suite (Accordion, List, menus) regresses from the shared change. There
   is no shared change; investigate rather than widening the patch.
4. `autoFocus` turns out not to set native focus on this host (contradicting plan
   `140`). STOP and re-measure before writing the test.

## 6. Acceptance

- The new native test fails on the old origin and passes on the focused-origin
  rule.
- A clicked tab records its highlight and focus state for style callbacks.
- Gates pass; docs and inventory count say 16; plan indexed and `TODO.md` ticked.

## 7. Result

Executed on this host, 2026-10-18.

- `src/behaviour/tabs.test.tsx`: **16/16 green**. With `tabs.tsx` restored to the
  pre-fix code the new case fails (`expected [ Array(4) ] to include 'Third
  panel'` — the panel stays `First panel`); with the fix, `Third panel` is
  selected and `aria-selected` is on tab C.
- Probe evidence for §1 (deleted): `autoFocus` on B leaves `boxShadow`
  `undefined` on B (`onFocus` never ran) and `ArrowRight` leaves the **First**
  panel selected.
- The click path now records the highlight and focus state itself, so a live
  click's trigger paints its focus ring and reports `highlighted`.
- Docs and inventory say 16 native tests; `docs/tabs.mdx` states the
  focused-origin rule.

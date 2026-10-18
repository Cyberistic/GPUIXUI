# 511 — Tabs: a tab that turns disabled must not keep focus or the ring

**Phase:** C/F (Tier 2 hardening) · **Owner:** components · **Depends on:** 113,
321, 334, 367, 388, 394, 510 · **Status:** planned

## 1. The defect (measured 2026-10-18, this host, `0.10.0`)

The same class as plan 510, one component over. When the **focused** tab turns
disabled, `Tabs` moves its tab stop correctly (the `tabbable` memo already skips
a disabled tab) but leaves native focus and the focus ring on the disabled tab:

```
focus tab-b, rerender with tab-b disabled:
  tab-a  tabIndex 0, no ring
  tab-b  tabIndex -1, still paints the focus ring, still natively focused
  tab-c  tabIndex -1, no ring
```

So the user's focus sits on a control that cannot be selected, while the tab
stop points somewhere else — pressing Tab then leaves and Shift+Tab returns to
`tab-a`, but the disabled tab reads as the focused one in the meantime. Plan 394
established "disabled means inert, no ring"; this is the undiscovered path for a
tab that becomes disabled while focused.

Tabs are data too: a settings surface disables a tab when its section is not
available, so this is reachable without any exotic composition.

## 2. The rule

> A tab that is gone or disabled never holds focus or paints the ring; the tab
> stop is where focus goes, and a consumer's own focus in the same update wins.

This is `PLAN.md` D30 applied to Tabs. Three parts:

1. `liveActive` — the remembered focused tab only while its row exists and is
   enabled. It drives the trigger's `focused` paint state (and the arrow fallback).
2. The root remembers the native id of the tab it last focused.
3. After a rows change, if that tab is missing or disabled **and** focus is still
   on it or has become `null`, focus moves to the tab stop with `select: false`
   — focus handover never changes the selected tab or its panel. If another
   control holds focus, nothing happens.

## 3. Files

### 3.1 `packages/components/src/tabs.tsx`

**a.** After the `rows` state, derive and remember:

```ts
/**
 * The tab the user is on, when it still exists and accepts input. A tab that is
 * disabled by the app must not keep the ring (plan 511).
 */
const liveActive = useMemo(
  () =>
    Option.filter(active, (value) =>
      Arr.some(rows, (row) => row.value === value && !row.disabled),
    ),
  [active, rows],
);

/** The native id of the tab the tabs last focused (plan 511). */
const focusedTab = useRef<Option.Option<number>>(Option.none());
```

**b.** `focusRow` sets `focusedTab.current = Option.some(row.id)` before
`renderer?.focusElement?.(row.id)`.

`noteFocus` looks the row up (it currently only has the value):

```ts
const noteFocus = useCallback(
  (value: string) => {
    setActive(Option.some(value));
    Option.match(
      Arr.findFirst(rows, (row) => row.value === value),
      {
        onNone: () => undefined,
        onSome: (row) => {
          focusedTab.current = Option.some(row.id);
        },
      },
    );
  },
  [rows],
);
```

**c.** `origin`'s fallback becomes `liveActive` (a disabled tab must not be the
arrow origin when the runtime names no focused element).

**d.** The context supplies `active: liveActive` instead of `active` (this is the
trigger's `focused` paint state and the public `TabsTriggerState`), and lists
`liveActive` in the memo dependencies.

**e.** Add the relocation effect after the `tabbable` memo:

```ts
/**
 * A tab that vanishes or turns disabled takes the user's focus with it. Hand
 * focus to the tab stop without changing the selected tab, and never steal it
 * from another control the consumer focused in the same update (plan 511).
 */
useLayoutEffect(() => {
  const remembered = focusedTab.current;
  if (Option.isNone(remembered)) return;

  const target = Arr.findFirst(rows, (row) => row.id === remembered.value);
  if (Option.exists(target, (row) => !row.disabled)) return;

  focusedTab.current = Option.none();
  const focused = Option.fromNullishOr(renderer?.getFocusedElementId?.());
  if (Option.exists(focused, (id) => id !== remembered.value)) return;

  Option.match(tabbable, {
    onNone: () => undefined,
    onSome: (value) =>
      Option.match(
        Arr.findFirst(rows, (row) => row.value === value),
        {
          onNone: () => undefined,
          onSome: (row) => focusRow(row, false),
        },
      ),
  });
}, [focusRow, renderer, rows, tabbable]);
```

`focusRow(row, false)` is essential: with `activation="automatic"` a focus move
through arrows selects, but a **handover** must not, because the tab it lands on
may not be the user's choice and a controlled `value` must never be rewritten.
Import `useRef` if it is not already imported.

### 3.2 `packages/components/src/behaviour/tabs.test.tsx`

Add four native cases (the suite is at 17, so 21). Header comment: the measured
bug (a disabled focused tab keeps focus and the ring), plus the no-steal and
no-selection-change rules.

1. **"takes focus and the ring off a tab that becomes disabled"** — focus
   `tab-b`, rerender with `tab-b` disabled; expect `tab-a` `tabIndex 0`,
   `tab-b` `-1` and `boxShadow` undefined, `focusedTestId` `Some("tab-a")`, and
   `aria-selected` still on the default tab.
2. **"hands focus to the selected tab when the focused tab is removed"** —
   select `tab-c` by click, focus `tab-b`, rerender without `tab-b`; expect the
   tab stop and focus on `tab-c` (the selected, surviving tab) and
   `aria-selected` unchanged.
3. **"never steals focus a consumer claimed in the same update"** — reuse the
   plan-510 pattern: a `Claim` control rendered **inside a container before the
   tabs** (the runtime keeps one child at the root — measured in plan 510) whose
   layout effect focuses it in the same render that disables or removes the
   focused tab. Expect focus on `claim` and the tab stop still on `tab-a`.
4. **"does not change the selection when it hands focus over"** — render
   `defaultValue="a"` with `activation="manual"`, focus `tab-b`, disable `tab-b`;
   expect focus on `tab-a` and `aria-selected` still true only on `tab-a`.

Read `customProps.tabIndex`, `customProps["aria-selected"]` and
`style.boxShadow`; use `focusedTestId` from `internal/interaction.ts`.

### 3.3 `packages/components/docs/tabs.mdx`

- Under the keyboard/activation section, add a short **"A tab that changes"**
  paragraph: the tab stop, focus and ring leave a tab that is removed or turns
  disabled; handover does not change the selected tab; a consumer's same-update
  focus is never stolen.
- Update the verification line's count (17 → 21) and mention the new cases.
- Limitations: a controlled `value` that names a removed tab still renders its
  panel (the app owns the value); handover follows the tab stop's fallback, not
  the removed tab's neighbour.

### 3.4 Records

- `src/tabs.tsx` → `tabsMeta.limitations`: add the controlled-value note.
- `COMPONENTS.md` Tabs row: append the handover rule and the new count.
- `TODO.md`: tick the task under Tier 2 hardening.
- `.agents/slop/plans/README.md`: index this plan; status `done` after the run.
- `PLAN.md` D30 already states the rule; no new ADR row.

## 4. Commands and expected results

```sh
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx
```

Expected: `Tests 21 passed`.

Mutation proofs (run each, record, revert):

| Mutation | Expected failure |
| -------- | ---------------- |
| Supply raw `active` to the context again | test 1 (ring stays on the disabled tab) |
| Delete the relocation effect | tests 1, 2 |
| Remove the focused-element guard | test 3 |
| Call `focusRow(row, true)` in the handover | test 4 (selection changes) |

Then from the repo root: `nub run check`, `nub run lint`, `nub run test` — all
exit `0`; behaviour suite 646 (642 + 4).

## 5. STOP conditions

- If a disabled focused tab does **not** keep native focus on this host (the
  measurement in §1 says it does), stop: the handover rule is unnecessary and
  the ring fix alone is the change.
- If moving focus from a disabled tab fires `onChange`/`onValueChange` on the
  tabs, stop: the handover is selecting and must not ship.
- If any existing Tabs case (17) changes behaviour, stop and report which.

## 6. Acceptance

- Four native cases pass and each has a recorded mutation that fails it.
- The 17 existing Tabs cases, the full behaviour suite and all gates pass.
- Docs, inventory records, `COMPONENTS.md`, `TODO.md` and the plan index agree.
